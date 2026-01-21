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
import { app } from 'electron';
import { join } from 'path';
import { EventBus, getEventBus } from '../orchestration/events/EventBus';
import { NexusFactory, type NexusInstance, type NexusFactoryConfig } from '../NexusFactory';
import { InterviewEngine, type InterviewEngineOptions } from '../interview/InterviewEngine';
import { InterviewSessionManager, type InterviewSessionManagerOptions } from '../interview/InterviewSessionManager';
import { RequirementsDB } from '../persistence/requirements/RequirementsDB';
import { DatabaseClient } from '../persistence/database/DatabaseClient';
import { StateManager } from '../persistence/state/StateManager';
import { CheckpointManager } from '../persistence/checkpoints/CheckpointManager';
import { HumanReviewService } from '../orchestration/review/HumanReviewService';
import { GitService } from '../infrastructure/git/GitService';
import type { PlanningTask } from '../planning/types';
import type { OrchestrationFeature } from '../orchestration/types';
import { RepoMapGenerator } from '../infrastructure/analysis/RepoMapGenerator';
import type { EvolutionContext } from '../interview/InterviewEngine';
import { features, tasks } from '../persistence/database/schema';

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
 * Checkpoint information returned to UI
 */
export interface CheckpointInfo {
  id: string;
  projectId: string;
  name: string;
  reason: string | null;
  gitCommit: string | null;
  createdAt: Date;
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

  /** Create a checkpoint for a project */
  createCheckpoint: (projectId: string, reason: string) => Promise<CheckpointInfo>;

  /** Restore a checkpoint */
  restoreCheckpoint: (checkpointId: string, restoreGit?: boolean) => Promise<void>;

  /** List checkpoints for a project */
  listCheckpoints: (projectId: string) => CheckpointInfo[];

  /** CheckpointManager instance for IPC handler registration */
  checkpointManager: CheckpointManager;

  /** HumanReviewService instance for IPC handler registration */
  humanReviewService: HumanReviewService;

  /** DatabaseClient instance for IPC handler registration */
  databaseClient: DatabaseClient;

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
  private stateManager: StateManager | null = null;
  private checkpointManager: CheckpointManager | null = null;
  private humanReviewService: HumanReviewService | null = null;
  private gitService: GitService | null = null;
  private repoMapGenerator: RepoMapGenerator | null = null;
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
    // In development, migrations are in src/persistence/database/migrations
    // In production, they should be bundled with the app
    const isDev = !app.isPackaged;
    const migrationsDir = isDev
      ? join(process.cwd(), 'src', 'persistence', 'database', 'migrations')
      : join(app.getAppPath(), 'migrations');

    this.databaseClient = DatabaseClient.create({
      path: dbPath,
      migrationsDir,
    });

    // 4. Initialize RequirementsDB
    this.requirementsDB = new RequirementsDB(this.databaseClient);

    // 5. Initialize GitService, StateManager, and CheckpointManager
    this.gitService = new GitService({ baseDir: this.config.workingDir });
    this.stateManager = new StateManager({ db: this.databaseClient });
    this.checkpointManager = new CheckpointManager({
      db: this.databaseClient,
      stateManager: this.stateManager,
      gitService: this.gitService,
      eventBus: this.eventBus,
    });
    console.log('[NexusBootstrap] CheckpointManager created');

    // 5a. Initialize HumanReviewService for human-in-the-loop reviews
    this.humanReviewService = new HumanReviewService({
      db: this.databaseClient,
      eventBus: this.eventBus,
      checkpointManager: this.checkpointManager,
    });
    console.log('[NexusBootstrap] HumanReviewService created');

    // 5b. Initialize RepoMapGenerator for Evolution mode
    this.repoMapGenerator = new RepoMapGenerator();
    console.log('[NexusBootstrap] RepoMapGenerator created');

    // 6. Initialize Interview Engine
    const interviewOptions: InterviewEngineOptions = {
      llmClient: this.nexus.llm.claude,
      requirementsDB: this.requirementsDB,
      eventBus: this.eventBus,
    };
    this.interviewEngine = new InterviewEngine(interviewOptions);
    console.log('[NexusBootstrap] InterviewEngine created');

    // 7. Initialize Session Manager
    const sessionManagerOptions: InterviewSessionManagerOptions = {
      db: this.databaseClient,
      eventBus: this.eventBus,
    };
    this.sessionManager = new InterviewSessionManager(sessionManagerOptions);
    console.log('[NexusBootstrap] SessionManager created');

    // 8. Wire critical event listeners (THE MAIN WIRING)
    this.wireEventListeners();
    console.log('[NexusBootstrap] Event listeners wired');

    // 9. Wire checkpoint listeners (Task 5: QA Failure -> Escalation)
    this.wireCheckpointListeners();
    console.log('[NexusBootstrap] Checkpoint listeners wired');

    // 10. Wire UI event forwarding
    this.wireUIEventForwarding();
    console.log('[NexusBootstrap] UI event forwarding wired');

    // 11. Create the bootstrapped instance
    bootstrappedNexus = {
      nexus: this.nexus,
      interviewEngine: this.interviewEngine,
      sessionManager: this.sessionManager,
      eventBus: this.eventBus,
      startGenesis: (name) => this.startGenesisMode(name),
      startEvolution: (path, name) => this.startEvolutionMode(path, name),
      createCheckpoint: (projectId, reason) => this.createCheckpointForProject(projectId, reason),
      restoreCheckpoint: (checkpointId, restoreGit) => this.restoreCheckpointById(checkpointId, restoreGit),
      listCheckpoints: (projectId) => this.listCheckpointsForProject(projectId),
      checkpointManager: this.checkpointManager,
      humanReviewService: this.humanReviewService,
      databaseClient: this.databaseClient!,
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
    // CRITICAL WIRING: Save Requirements as They Are Captured
    // =========================================================================
    const requirementCapturedUnsub = this.eventBus.on('interview:requirement-captured', (event) => {
      const { projectId, requirement } = event.payload;

      console.log(`[NexusBootstrap] Requirement captured for ${projectId}: ${requirement.content.substring(0, 50)}...`);

      try {
        // Map category - handle both core event types and UI event types
        type RequirementCategory = 'functional' | 'non-functional' | 'technical';
        const categoryMap: Record<string, RequirementCategory> = {
          functional: 'functional',
          technical: 'technical',
          ui: 'functional',
          performance: 'non-functional',
          security: 'non-functional',
          'non-functional': 'non-functional',
        };
        const mappedCategory = categoryMap[requirement.category] ?? 'functional';

        // Map priority - handle both MoSCoW and severity-based priorities
        type RequirementPriority = 'must' | 'should' | 'could' | 'wont';
        const priorityMap: Record<string, RequirementPriority> = {
          critical: 'must',
          high: 'should',
          medium: 'could',
          low: 'wont',
          must: 'must',
          should: 'should',
          could: 'could',
          wont: 'wont',
        };
        const mappedPriority = priorityMap[requirement.priority] ?? 'should';

        // Add to RequirementsDB
        if (this.requirementsDB) {
          this.requirementsDB.addRequirement(projectId, {
            category: mappedCategory,
            description: requirement.content, // Map content to description
            priority: mappedPriority,
            source: requirement.source,
            confidence: 0.8,
            tags: [],
          });
          console.log(`[NexusBootstrap] Requirement saved to DB for project ${projectId}`);
        }
      } catch (error) {
        // Log but don't fail - duplicate detection may throw
        console.warn(`[NexusBootstrap] Failed to save requirement: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    this.unsubscribers.push(requirementCapturedUnsub);

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
        const decomposedTasks = await decomposer.decompose(featureDescription);
        console.log(`[NexusBootstrap] Decomposed into ${decomposedTasks.length} tasks`);

        // Store decomposition to database (Phase 20 Task 3)
        const { featureCount, taskCount } = await this.storeDecomposition(projectId, decomposedTasks);
        console.log(`[NexusBootstrap] Stored ${featureCount} features and ${taskCount} tasks to database`);

        // Resolve dependencies and calculate waves
        const waves = resolver.calculateWaves(decomposedTasks);
        console.log(`[NexusBootstrap] Calculated ${waves.length} execution waves`);

        // Estimate total time using the estimateTotal method
        const totalMinutes = await this.nexus!.planning.estimator.estimateTotal(decomposedTasks);
        console.log(`[NexusBootstrap] Estimated ${totalMinutes} minutes total`);

        // Emit planning:completed event (Phase 20 Task 4)
        await this.eventBus.emit('project:status-changed', {
          projectId,
          previousStatus: 'planning' as const,
          newStatus: 'executing' as const,
          reason: `Planning complete: ${taskCount} tasks created`,
        });

        // Forward planning completed to UI
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('nexus-event', {
            type: 'planning:completed',
            payload: {
              projectId,
              featureCount,
              taskCount,
              totalMinutes,
              waveCount: waves.length,
            },
            timestamp: new Date().toISOString(),
          });
          console.log(`[NexusBootstrap] Forwarded planning:completed to UI`);
        }

        // Initialize coordinator with project config
        coordinator.initialize({
          projectId,
          projectPath: this.config.workingDir,
          features: this.tasksToFeatures(decomposedTasks, projectId),
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
      'system:checkpoint-restored',
      'system:error',
      // Human review events
      'review:requested',
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
   * Store decomposed features and tasks in the database
   * Phase 20 Task 3: Wire TaskDecomposer Output to Database
   */
  private async storeDecomposition(
    projectId: string,
    planningTasks: PlanningTask[]
  ): Promise<{ featureCount: number; taskCount: number }> {
    if (!this.databaseClient) {
      throw new Error('DatabaseClient not initialized');
    }

    console.log('[NexusBootstrap] Storing decomposition for project:', projectId);
    const now = new Date();
    let featureCount = 0;
    let taskCount = 0;

    // Create a single feature to represent the project requirements
    const featureId = `feature-${projectId}-${Date.now()}`;

    try {
      // Insert the feature
      this.databaseClient.db.insert(features).values({
        id: featureId,
        projectId: projectId,
        name: 'Project Requirements',
        description: 'Auto-generated feature from interview requirements',
        priority: 'must',
        status: 'backlog',
        complexity: 'complex',
        estimatedTasks: planningTasks.length,
        completedTasks: 0,
        createdAt: now,
        updatedAt: now,
      }).run();
      featureCount = 1;
      console.log('[NexusBootstrap] Stored feature:', featureId);

      // Insert all tasks
      for (const task of planningTasks) {
        const taskId = task.id || `task-${projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        this.databaseClient.db.insert(tasks).values({
          id: taskId,
          projectId: projectId,
          featureId: featureId,
          name: task.name,
          description: task.description,
          type: task.type || 'auto',
          status: 'pending',
          size: task.size === 'large' || task.size === 'medium' ? 'small' : task.size,
          priority: 5,
          tags: JSON.stringify(task.files || []),
          notes: JSON.stringify(task.testCriteria || []),
          dependsOn: JSON.stringify(task.dependsOn || []),
          estimatedMinutes: task.estimatedMinutes || 15,
          createdAt: now,
          updatedAt: now,
        }).run();
        taskCount++;
      }

      console.log('[NexusBootstrap] Stored', taskCount, 'tasks for feature', featureId);

      return { featureCount, taskCount };
    } catch (error) {
      console.error('[NexusBootstrap] Failed to store decomposition:', error);
      throw error;
    }
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
   *
   * Task 9: Wire Evolution Critical Path
   * 1. Generate repo map from projectPath
   * 2. Pass context to interview engine
   * 3. Interview completion triggers same execution path as Genesis
   */
  private async startEvolutionMode(
    projectPath: string,
    projectName?: string
  ): Promise<{ projectId: string; sessionId: string }> {
    if (!this.interviewEngine || !this.sessionManager || !this.repoMapGenerator) {
      throw new Error('NexusBootstrap not initialized');
    }

    const projectId = `evolution-${Date.now()}`;
    const name = projectName ?? `Evolution: ${projectPath}`;

    console.log(`[NexusBootstrap] Starting Evolution mode: ${name} (${projectId})`);

    // Emit evolution started event
    await this.eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'planning' as const,
      newStatus: 'planning' as const,
      reason: 'Starting Evolution mode - analyzing existing codebase',
    });

    // 1. Generate repo map from projectPath
    console.log(`[NexusBootstrap] Generating repo map for: ${projectPath}`);
    let evolutionContext: EvolutionContext | undefined;

    try {
      // Initialize and generate repo map
      await this.repoMapGenerator.initialize();
      const repoMap = await this.repoMapGenerator.generate(projectPath, {
        maxFiles: 500, // Reasonable limit for context
        countReferences: true,
      });

      // Format repo map for LLM context
      const repoMapContext = this.repoMapGenerator.formatForContext({
        maxTokens: 8000, // Limit for context window
        includeSignatures: true,
        rankByReferences: true,
        groupByFile: true,
        includeDependencies: true,
        style: 'compact',
      });

      console.log(`[NexusBootstrap] Repo map generated: ${repoMap.stats.totalFiles} files, ${repoMap.stats.totalSymbols} symbols`);

      // Build project summary
      const projectSummary = this.buildProjectSummary(repoMap);

      // Create evolution context
      evolutionContext = {
        projectPath,
        repoMapContext,
        projectSummary,
      };

      // Emit repo map generated event (if we have this event type)
      console.log(`[NexusBootstrap] Evolution context prepared with ${repoMapContext.length} chars of context`);

    } catch (error) {
      console.error('[NexusBootstrap] Failed to generate repo map:', error);
      // Continue without repo map - interview will work but without context
      console.log('[NexusBootstrap] Continuing Evolution mode without repo map context');
    }

    // 2. Start interview session with Evolution context
    const session = this.interviewEngine.startSession(projectId, {
      mode: 'evolution',
      evolutionContext,
    });
    this.sessionManager.startAutoSave(session);

    console.log(`[NexusBootstrap] Evolution session started: ${session.id}`);

    // Interview completion will trigger the rest via EventBus wiring (same as Genesis)
    return {
      projectId,
      sessionId: session.id,
    };
  }

  /**
   * Build a human-readable summary of the project from the repo map
   */
  private buildProjectSummary(repoMap: import('../infrastructure/analysis/types').RepoMap): string {
    const stats = repoMap.stats;
    const lines: string[] = [
      `Project: ${repoMap.projectPath}`,
      `Files: ${stats.totalFiles} (${stats.languageBreakdown.typescript} TypeScript, ${stats.languageBreakdown.javascript} JavaScript)`,
      `Symbols: ${stats.totalSymbols} (${stats.symbolBreakdown.class} classes, ${stats.symbolBreakdown.function} functions, ${stats.symbolBreakdown.interface} interfaces)`,
      `Dependencies: ${stats.totalDependencies} connections`,
    ];

    if (stats.largestFiles.length > 0) {
      lines.push(`Largest files: ${stats.largestFiles.slice(0, 5).join(', ')}`);
    }

    if (stats.mostConnectedFiles.length > 0) {
      lines.push(`Key files (most connected): ${stats.mostConnectedFiles.slice(0, 5).join(', ')}`);
    }

    return lines.join('\n');
  }

  // =========================================================================
  // TASK 5: Wire Checkpoint Listeners
  // =========================================================================

  /**
   * Wire checkpoint creation on task escalation (QA Failure -> Checkpoint)
   *
   * This is the critical wiring for Task 5:
   * - When a task is escalated (QA failed after max iterations)
   * - Automatically create a checkpoint for recovery
   * - Request human review
   */
  private wireCheckpointListeners(): void {
    if (!this.checkpointManager || !this.stateManager) {
      console.warn('[NexusBootstrap] CheckpointManager not initialized, skipping checkpoint wiring');
      return;
    }

    // =========================================================================
    // Wire: task:escalated -> checkpoint creation + review request
    // =========================================================================
    const escalatedUnsub = this.eventBus.on('task:escalated', async (event) => {
      const { taskId, reason, iterations, lastError } = event.payload;
      const projectId = this.extractProjectIdFromTask(taskId);

      console.log(`[NexusBootstrap] Task ${taskId} escalated after ${iterations} iterations: ${reason}`);

      try {
        // Ensure project state exists for checkpoint
        this.ensureProjectState(projectId);

        // Create checkpoint for escalation (human review can restore if needed)
        const checkpoint = await this.checkpointManager!.createAutoCheckpoint(
          projectId,
          'qa_exhausted'
        );
        console.log(`[NexusBootstrap] Created escalation checkpoint: ${checkpoint.id}`);

        // Request human review
        await this.eventBus.emit('review:requested', {
          reviewId: `review-${Date.now()}`,
          taskId,
          reason: 'qa_exhausted' as const,
          context: {
            qaIterations: iterations,
            escalationReason: reason,
            suggestedAction: lastError
              ? `Last error: ${lastError}. Consider reviewing the task requirements.`
              : 'QA loop exhausted. Manual intervention required.',
          },
        });
        console.log(`[NexusBootstrap] Human review requested for task ${taskId}`);

      } catch (error) {
        console.error('[NexusBootstrap] Failed to create escalation checkpoint:', error);
        await this.eventBus.emit('system:error', {
          component: 'NexusBootstrap',
          error: `Checkpoint creation failed: ${error instanceof Error ? error.message : String(error)}`,
          recoverable: true,
        });
      }
    });

    this.unsubscribers.push(escalatedUnsub);

    // =========================================================================
    // Wire: task:failed -> checkpoint if recoverable
    // =========================================================================
    const failedUnsub = this.eventBus.on('task:failed', async (event) => {
      const { taskId, error, escalated } = event.payload;

      // Only create checkpoint if not already escalated (escalated has its own handler)
      if (escalated) {
        return;
      }

      const projectId = this.extractProjectIdFromTask(taskId);
      console.log(`[NexusBootstrap] Task ${taskId} failed: ${error}`);

      try {
        // Ensure project state exists
        this.ensureProjectState(projectId);

        // Create checkpoint for potential recovery
        await this.checkpointManager!.createAutoCheckpoint(
          projectId,
          'task_failed'
        );
        console.log(`[NexusBootstrap] Created failure checkpoint for task ${taskId}`);

      } catch (checkpointError) {
        console.error('[NexusBootstrap] Failed to create failure checkpoint:', checkpointError);
      }
    });

    this.unsubscribers.push(failedUnsub);
  }

  /**
   * Extract project ID from task ID
   * Task IDs typically follow patterns like: "genesis-123456-task-1" or "task-uuid"
   */
  private extractProjectIdFromTask(taskId: string): string {
    // Try to extract genesis/evolution prefix
    const genesisMatch = taskId.match(/^(genesis-\d+)/);
    if (genesisMatch) {
      return genesisMatch[1];
    }

    const evolutionMatch = taskId.match(/^(evolution-\d+)/);
    if (evolutionMatch) {
      return evolutionMatch[1];
    }

    // Fallback: use current active project or generate a placeholder
    return `project-${Date.now()}`;
  }

  /**
   * Ensure project state exists for checkpoint creation
   */
  private ensureProjectState(projectId: string): void {
    if (!this.stateManager) {
      return;
    }

    if (!this.stateManager.hasState(projectId)) {
      // Create minimal state for checkpoint
      this.stateManager.createState(
        projectId,
        projectId,
        projectId.startsWith('evolution') ? 'evolution' : 'genesis'
      );
    }
  }

  // =========================================================================
  // Checkpoint Management Methods
  // =========================================================================

  /**
   * Create a checkpoint for a project
   */
  private async createCheckpointForProject(projectId: string, reason: string): Promise<CheckpointInfo> {
    if (!this.checkpointManager) {
      throw new Error('CheckpointManager not initialized');
    }

    // Ensure state exists
    this.ensureProjectState(projectId);

    const checkpoint = await this.checkpointManager.createCheckpoint(projectId, reason);

    return {
      id: checkpoint.id,
      projectId: checkpoint.projectId,
      name: checkpoint.name ?? `Checkpoint: ${reason}`,
      reason: checkpoint.reason,
      gitCommit: checkpoint.gitCommit,
      createdAt: checkpoint.createdAt,
    };
  }

  /**
   * Restore a checkpoint by ID
   */
  private async restoreCheckpointById(checkpointId: string, restoreGit = false): Promise<void> {
    if (!this.checkpointManager) {
      throw new Error('CheckpointManager not initialized');
    }

    console.log(`[NexusBootstrap] Restoring checkpoint ${checkpointId} (restoreGit: ${restoreGit})`);

    await this.checkpointManager.restoreCheckpoint(checkpointId, { restoreGit });

    console.log(`[NexusBootstrap] Checkpoint ${checkpointId} restored successfully`);
  }

  /**
   * List all checkpoints for a project
   */
  private listCheckpointsForProject(projectId: string): CheckpointInfo[] {
    if (!this.checkpointManager) {
      return [];
    }

    const checkpoints = this.checkpointManager.listCheckpoints(projectId);

    return checkpoints.map(cp => ({
      id: cp.id,
      projectId: cp.projectId,
      name: cp.name ?? `Checkpoint`,
      reason: cp.reason,
      gitCommit: cp.gitCommit,
      createdAt: cp.createdAt,
    }));
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
    this.stateManager = null;
    this.checkpointManager = null;
    this.humanReviewService = null;
    this.gitService = null;
    this.repoMapGenerator = null;
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
