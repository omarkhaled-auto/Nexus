/**
 * NexusBootstrap - Main Process Bootstrap for Wiring Components
 *
 * Phase 19 Task 4: This is the critical wiring layer that connects:
 * - Interview Engine -> Task Decomposition -> Execution
 * - Backend Events -> IPC -> UI (Electron)
 *
 * This builds on top of NexusFactory (which creates components) and adds:
 * 1. Interview Engine initialization
 * 2. Event bus listeners for the Genesis/Evolution flow
 * 3. IPC event forwarding to renderer
 *
 * The key wiring chain:
 *   interview:completed -> TaskDecomposer.decompose() -> DependencyResolver.calculateWaves()
 *   -> NexusCoordinator.initialize() -> NexusCoordinator.start()
 */

import type { BrowserWindow } from 'electron';
import { EventBus, getEventBus } from '../orchestration/events/EventBus';
import { NexusFactory, type NexusInstance, type NexusFactoryConfig } from '../NexusFactory';
import { InterviewEngine, type InterviewEngineOptions } from '../interview/InterviewEngine';
import { InterviewSessionManager, type InterviewSessionManagerOptions } from '../interview/InterviewSessionManager';
import { RequirementsDB } from '../persistence/requirements/RequirementsDB';
import { DatabaseClient } from '../persistence/database/DatabaseClient';
import type { PlanningTask } from '../planning/types';
import type { OrchestrationFeature } from '../orchestration/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for NexusBootstrap
 */
export interface NexusBootstrapConfig {
  /** Working directory for the project */
  workingDir: string;

  /** Data directory for persistence (SQLite, etc.) */
  dataDir: string;

  /** API keys */
  apiKeys?: {
    anthropic?: string;
    google?: string;
    openai?: string;
  };

  /** Use CLI backends instead of API */
  useCli?: {
    claude?: boolean;
    gemini?: boolean;
  };
}

/**
 * The complete bootstrapped Nexus system
 */
export interface BootstrappedNexus {
  /** Core Nexus instance from NexusFactory */
  nexus: NexusInstance;

  /** Interview engine for user conversations */
  interviewEngine: InterviewEngine;

  /** Session manager for interview persistence */
  sessionManager: InterviewSessionManager;

  /** Event bus for global events */
  eventBus: EventBus;

  /** Start Genesis mode (new project from scratch) */
  startGenesis: (projectName?: string) => Promise<{ projectId: string; sessionId: string }>;

  /** Start Evolution mode (enhance existing project) */
  startEvolution: (projectPath: string, projectName?: string) => Promise<{ projectId: string; sessionId: string }>;

  /** Shutdown all components */
  shutdown: () => Promise<void>;
}

// ============================================================================
// Module State
// ============================================================================

/** Singleton instance */
let bootstrappedNexus: BootstrappedNexus | null = null;

/** Main window reference for IPC event forwarding */
let mainWindowRef: BrowserWindow | null = null;

// ============================================================================
// NexusBootstrap Class
// ============================================================================

/**
 * NexusBootstrap - Initializes and wires all Nexus components
 *
 * This is the main entry point for the Electron main process.
 * It creates all components, wires the event flow, and sets up IPC forwarding.
 */
export class NexusBootstrap {
  private config: NexusBootstrapConfig;
  private nexus: NexusInstance | null = null;
  private interviewEngine: InterviewEngine | null = null;
  private sessionManager: InterviewSessionManager | null = null;
  private eventBus: EventBus;
  private requirementsDB: RequirementsDB | null = null;
  private databaseClient: DatabaseClient | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(config: NexusBootstrapConfig) {
    this.config = config;
    this.eventBus = getEventBus();
  }

  /**
   * Initialize all components and wire them together
   */
  async initialize(): Promise<BootstrappedNexus> {
    if (bootstrappedNexus) {
      return bootstrappedNexus;
    }

    console.log('[NexusBootstrap] Initializing components...');

    // 1. Create NexusFactory configuration
    const factoryConfig: NexusFactoryConfig = {
      workingDir: this.config.workingDir,
      claudeApiKey: this.config.apiKeys?.anthropic,
      geminiApiKey: this.config.apiKeys?.google,
      openaiApiKey: this.config.apiKeys?.openai,
      claudeBackend: this.config.useCli?.claude ? 'cli' : 'api',
      geminiBackend: this.config.useCli?.gemini ? 'cli' : 'api',
    };

    // 2. Create core Nexus instance via factory
    try {
      this.nexus = await NexusFactory.create(factoryConfig);
      console.log('[NexusBootstrap] NexusFactory created successfully');
    } catch (error) {
      console.error('[NexusBootstrap] Failed to create NexusFactory:', error);
      throw error;
    }

    // 3. Initialize database client using static factory method
    const dbPath = `${this.config.dataDir}/nexus.db`;
    this.databaseClient = DatabaseClient.create({
      path: dbPath,
    });

    // 4. Initialize RequirementsDB
    this.requirementsDB = new RequirementsDB(this.databaseClient);

    // 5. Initialize Interview Engine
    const interviewOptions: InterviewEngineOptions = {
      llmClient: this.nexus.llm.claude,
      requirementsDB: this.requirementsDB,
      eventBus: this.eventBus,
    };
    this.interviewEngine = new InterviewEngine(interviewOptions);
    console.log('[NexusBootstrap] InterviewEngine created');

    // 6. Initialize Session Manager
    const sessionManagerOptions: InterviewSessionManagerOptions = {
      db: this.databaseClient,
      eventBus: this.eventBus,
    };
    this.sessionManager = new InterviewSessionManager(sessionManagerOptions);
    console.log('[NexusBootstrap] SessionManager created');

    // 7. Wire critical event listeners (THE MAIN WIRING)
    this.wireEventListeners();
    console.log('[NexusBootstrap] Event listeners wired');

    // 8. Wire UI event forwarding
    this.wireUIEventForwarding();
    console.log('[NexusBootstrap] UI event forwarding wired');

    // 9. Create the bootstrapped instance
    bootstrappedNexus = {
      nexus: this.nexus,
      interviewEngine: this.interviewEngine,
      sessionManager: this.sessionManager,
      eventBus: this.eventBus,
      startGenesis: (name) => this.startGenesisMode(name),
      startEvolution: (path, name) => this.startEvolutionMode(path, name),
      shutdown: () => this.shutdown(),
    };

    console.log('[NexusBootstrap] Initialization complete');
    return bootstrappedNexus;
  }

  /**
   * CRITICAL: Wire the event listeners that connect the components
   *
   * This is where the magic happens:
   * interview:completed -> planning -> execution
   */
  private wireEventListeners(): void {
    if (!this.nexus || !this.requirementsDB) {
      throw new Error('Nexus or RequirementsDB not initialized');
    }

    const { coordinator } = this.nexus;
    const { decomposer, resolver } = this.nexus.planning;

    // =========================================================================
    // CRITICAL WIRING: Interview Complete -> Task Decomposition -> Execution
    // =========================================================================
    const interviewCompletedUnsub = this.eventBus.on('interview:completed', async (event) => {
      const { projectId, totalRequirements } = event.payload;

      console.log(`[NexusBootstrap] Interview completed for ${projectId} with ${totalRequirements} requirements`);

      // Emit project status change (use existing event type)
      await this.eventBus.emit('project:status-changed', {
        projectId,
        previousStatus: 'planning' as const,
        newStatus: 'executing' as const,
        reason: 'Interview completed, starting planning',
      });

      try {
        // Get requirements from DB
        const requirements = this.requirementsDB!.getRequirements(projectId);
        console.log(`[NexusBootstrap] Retrieved ${requirements.length} requirements for decomposition`);

        // Build feature description from requirements
        const featureDescription = requirements
          .map(r => `- [${r.priority}] ${r.description}`)
          .join('\n');

        // Decompose requirements into tasks
        const tasks = await decomposer.decompose(featureDescription);
        console.log(`[NexusBootstrap] Decomposed into ${tasks.length} tasks`);

        // Resolve dependencies and calculate waves
        const waves = resolver.calculateWaves(tasks);
        console.log(`[NexusBootstrap] Calculated ${waves.length} execution waves`);

        // Estimate total time using the estimateTotal method
        const totalMinutes = await this.nexus!.planning.estimator.estimateTotal(tasks);
        console.log(`[NexusBootstrap] Estimated ${totalMinutes} minutes total`);

        // Initialize coordinator with project config
        coordinator.initialize({
          projectId,
          projectPath: this.config.workingDir,
          features: this.tasksToFeatures(tasks, projectId),
          mode: 'genesis',
        });

        // Start execution
        coordinator.start(projectId);
        console.log(`[NexusBootstrap] Execution started for ${projectId}`);

      } catch (error) {
        console.error('[NexusBootstrap] Planning failed:', error);
        await this.eventBus.emit('project:failed', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
          recoverable: true,
        });
      }
    });

    this.unsubscribers.push(interviewCompletedUnsub);

    // =========================================================================
    // Forward coordinator events through main event bus
    // =========================================================================
    coordinator.onEvent((event) => {
      // Re-emit coordinator events through the main event bus
      // This ensures UI can subscribe to them
      const eventType = event.type;
      const eventData = event.data ?? {};

      // Map coordinator events to typed event bus events
      // Note: Some coordinator events don't have direct mappings in the typed EventBus
      // We log them for debugging and can add typed events as needed
      console.log(`[NexusBootstrap] Coordinator event: ${eventType}`, eventData);

      // Forward task events that have typed mappings
      if (eventType === 'task:assigned' && 'taskId' in eventData && 'agentId' in eventData) {
        void this.eventBus.emit('task:assigned', {
          taskId: String(eventData.taskId),
          agentId: String(eventData.agentId),
          agentType: 'coder' as const,
          worktreePath: String(eventData.worktreePath ?? ''),
        });
      } else if (eventType === 'task:started' && 'taskId' in eventData) {
        void this.eventBus.emit('task:started', {
          taskId: String(eventData.taskId),
          agentId: String(eventData.agentId ?? ''),
          startedAt: new Date(),
        });
      } else if (eventType === 'task:completed' && 'taskId' in eventData) {
        void this.eventBus.emit('task:completed', {
          taskId: String(eventData.taskId),
          result: {
            taskId: String(eventData.taskId),
            success: true,
            files: [],
            metrics: {
              iterations: 1,
              tokensUsed: 0,
              timeMs: 0,
            },
          },
        });
      } else if (eventType === 'task:failed' && 'taskId' in eventData) {
        void this.eventBus.emit('task:failed', {
          taskId: String(eventData.taskId),
          error: String(eventData.error ?? 'Unknown error'),
          iterations: Number(eventData.iterations ?? 1),
          escalated: Boolean(eventData.escalated ?? false),
        });
      } else if (eventType === 'task:escalated' && 'taskId' in eventData) {
        void this.eventBus.emit('task:escalated', {
          taskId: String(eventData.taskId),
          reason: String(eventData.reason ?? 'Max iterations exceeded'),
          iterations: Number(eventData.iterations ?? 1),
          lastError: String(eventData.lastError ?? ''),
        });
      }
    });
  }

  /**
   * Wire event forwarding to the renderer process via IPC
   */
  private wireUIEventForwarding(): void {
    // Events to forward to UI (using existing EventType values)
    const eventsToForward = [
      // Interview events
      'interview:started',
      'interview:question-asked',
      'interview:requirement-captured',
      'interview:completed',
      // Project events
      'project:status-changed',
      'project:failed',
      'project:completed',
      // Task events
      'task:assigned',
      'task:started',
      'task:completed',
      'task:failed',
      'task:escalated',
      // QA events
      'qa:build-completed',
      'qa:lint-completed',
      'qa:test-completed',
      'qa:review-completed',
      // System events
      'system:checkpoint-created',
      'system:error',
    ];

    // Subscribe to all events and forward to renderer
    const unsub = this.eventBus.onAny((event) => {
      if (eventsToForward.includes(event.type) && mainWindowRef) {
        mainWindowRef.webContents.send('nexus-event', {
          type: event.type,
          payload: event.payload,
          timestamp: event.timestamp,
        });
      }
    });

    this.unsubscribers.push(unsub);
  }

  /**
   * Convert planning tasks to feature format for coordinator
   */
  private tasksToFeatures(tasks: PlanningTask[], projectId: string): OrchestrationFeature[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      priority: 'must' as const,
      status: 'backlog' as const,
      complexity: task.size === 'large' ? 'complex' as const : 'simple' as const,
      subFeatures: [],
      estimatedTasks: 1,
      completedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId,
    }));
  }

  /**
   * Start Genesis mode (new project from scratch)
   */
  private async startGenesisMode(projectName?: string): Promise<{ projectId: string; sessionId: string }> {
    if (!this.interviewEngine || !this.sessionManager) {
      throw new Error('NexusBootstrap not initialized');
    }

    const projectId = `genesis-${Date.now()}`;
    const name = projectName ?? `Genesis Project ${Date.now()}`;

    console.log(`[NexusBootstrap] Starting Genesis mode: ${name} (${projectId})`);

    // Start interview session
    const session = this.interviewEngine.startSession(projectId);
    this.sessionManager.startAutoSave(session);

    // Interview completion will trigger the rest via EventBus wiring
    return {
      projectId,
      sessionId: session.id,
    };
  }

  /**
   * Start Evolution mode (enhance existing project)
   */
  private async startEvolutionMode(
    projectPath: string,
    projectName?: string
  ): Promise<{ projectId: string; sessionId: string }> {
    if (!this.interviewEngine || !this.sessionManager) {
      throw new Error('NexusBootstrap not initialized');
    }

    const projectId = `evolution-${Date.now()}`;
    const _name = projectName ?? `Evolution: ${projectPath}`;

    console.log(`[NexusBootstrap] Starting Evolution mode: ${_name} (${projectId})`);

    // TODO: Generate repo map from projectPath
    // TODO: Pass context to interview engine

    // Start interview session
    const session = this.interviewEngine.startSession(projectId);
    this.sessionManager.startAutoSave(session);

    // Interview completion will trigger the rest via EventBus wiring
    return {
      projectId,
      sessionId: session.id,
    };
  }

  /**
   * Shutdown all components
   */
  private async shutdown(): Promise<void> {
    console.log('[NexusBootstrap] Shutting down...');

    // Unsubscribe all event listeners
    for (const unsub of this.unsubscribers) {
      try {
        unsub();
      } catch {
        // Ignore unsubscribe errors
      }
    }
    this.unsubscribers = [];

    // Shutdown Nexus instance
    if (this.nexus) {
      await this.nexus.shutdown();
      this.nexus = null;
    }

    // Clear references
    this.interviewEngine = null;
    this.sessionManager = null;
    this.requirementsDB = null;
    this.databaseClient = null;
    bootstrappedNexus = null;

    console.log('[NexusBootstrap] Shutdown complete');
  }
}

// ============================================================================
// Module Functions
// ============================================================================

/**
 * Initialize the global Nexus instance
 */
export async function initializeNexus(config: NexusBootstrapConfig): Promise<BootstrappedNexus> {
  const bootstrap = new NexusBootstrap(config);
  return bootstrap.initialize();
}

/**
 * Get the global bootstrapped Nexus instance
 */
export function getBootstrappedNexus(): BootstrappedNexus | null {
  return bootstrappedNexus;
}

/**
 * Set the main window for IPC event forwarding
 */
export function setMainWindow(window: BrowserWindow): void {
  mainWindowRef = window;
}

/**
 * Clear the main window reference
 */
export function clearMainWindow(): void {
  mainWindowRef = null;
}
