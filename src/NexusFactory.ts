/**
 * NexusFactory - Factory for creating fully-wired Nexus instances
 *
 * This is the main entry point for creating Nexus orchestration instances.
 * It wires together all components including:
 * - LLM clients (Claude, Gemini)
 * - Planning components (TaskDecomposer, DependencyResolver, TimeEstimator)
 * - Execution components (AgentPool, QARunners)
 * - Orchestration components (NexusCoordinator, RalphStyleIterator)
 *
 * Phase 14B Task 18: Wiring & Factory
 */

import { ClaudeClient, type ClaudeClientOptions } from './llm/clients/ClaudeClient';
import { GeminiClient, type GeminiClientOptions } from './llm/clients/GeminiClient';
import { TaskDecomposer } from './planning/decomposition/TaskDecomposer';
import { DependencyResolver } from './planning/dependencies/DependencyResolver';
import { TimeEstimator } from './planning/estimation/TimeEstimator';
import { AgentPool, type AgentPoolConfig } from './orchestration/agents/AgentPool';
import { QARunnerFactory, type QARunnerFactoryConfig } from './execution/qa/QARunnerFactory';
import { NexusCoordinator, type NexusCoordinatorOptions } from './orchestration/coordinator/NexusCoordinator';
import { TaskQueue } from './orchestration/queue/TaskQueue';
import { EventBus } from './orchestration/events/EventBus';
// Note: RalphStyleIterator is not directly instantiated here - it's part of the QA engine workflow
// import type { RalphStyleIteratorConfig } from './execution/iteration/types';
import { WorktreeManager } from './infrastructure/git/WorktreeManager';
import { CheckpointManager } from './persistence/checkpoints/CheckpointManager';
import { GitService } from './infrastructure/git/GitService';
import type { AgentType } from './types/agent';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for creating a NexusFactory instance
 */
export interface NexusFactoryConfig {
  /** Anthropic API key for Claude */
  claudeApiKey: string;
  /** Google API key for Gemini */
  geminiApiKey: string;
  /** Root directory of the project being orchestrated */
  workingDir: string;
  /** Optional Claude client configuration */
  claudeConfig?: Partial<ClaudeClientOptions>;
  /** Optional Gemini client configuration */
  geminiConfig?: Partial<GeminiClientOptions>;
  /** Maximum agents per type (optional overrides) */
  maxAgentsByType?: Partial<Record<AgentType, number>>;
  /** QA configuration */
  qaConfig?: {
    /** Build timeout in ms (default: 60000) */
    buildTimeout?: number;
    /** Lint timeout in ms (default: 120000) */
    lintTimeout?: number;
    /** Test timeout in ms (default: 300000) */
    testTimeout?: number;
    /** Enable auto-fix for linting (default: false) */
    autoFixLint?: boolean;
  };
  /** Iteration configuration */
  iterationConfig?: {
    /** Maximum iterations before escalation (default: 50) */
    maxIterations?: number;
    /** Commit after each iteration (default: true) */
    commitEachIteration?: boolean;
  };
}

/**
 * Configuration for testing mode
 */
export interface NexusTestingConfig extends NexusFactoryConfig {
  /** Use mocked QA runners for faster testing */
  mockQA?: boolean;
  /** Lower iteration limit for testing */
  maxIterations?: number;
}

/**
 * The complete Nexus instance with all wired components
 */
export interface NexusInstance {
  /** Main orchestration coordinator */
  coordinator: NexusCoordinator;
  /** Agent pool for managing AI agents */
  agentPool: AgentPool;
  /** Task queue for scheduling */
  taskQueue: TaskQueue;
  /** Event bus for observability */
  eventBus: EventBus;
  /** LLM clients */
  llm: {
    claude: ClaudeClient;
    gemini: GeminiClient;
  };
  /** Planning components */
  planning: {
    decomposer: TaskDecomposer;
    resolver: DependencyResolver;
    estimator: TimeEstimator;
  };
  /** Shutdown function to clean up resources */
  shutdown: () => Promise<void>;
}

// ============================================================================
// NexusFactory Class
// ============================================================================

/**
 * Factory for creating fully-wired Nexus instances.
 *
 * This is the main entry point for using Nexus. It handles all the complex
 * wiring of dependencies so consumers only need to provide configuration.
 *
 * @example
 * ```typescript
 * // Create a production Nexus instance
 * const nexus = NexusFactory.create({
 *   claudeApiKey: process.env.ANTHROPIC_API_KEY!,
 *   geminiApiKey: process.env.GOOGLE_API_KEY!,
 *   workingDir: '/path/to/project',
 * });
 *
 * // Initialize and start orchestration
 * nexus.coordinator.initialize({
 *   projectId: 'my-project',
 *   projectPath: '/path/to/project',
 * });
 * nexus.coordinator.start('my-project');
 *
 * // Clean up when done
 * await nexus.shutdown();
 * ```
 */
export class NexusFactory {
  /**
   * Create a complete Nexus instance with all dependencies wired.
   *
   * This is the primary factory method for production use.
   *
   * @param config - Factory configuration
   * @returns Fully-wired Nexus instance
   */
  static create(config: NexusFactoryConfig): NexusInstance {
    // ========================================================================
    // 1. Initialize LLM Clients
    // ========================================================================
    const claudeClient = new ClaudeClient({
      apiKey: config.claudeApiKey,
      ...config.claudeConfig,
    });

    const geminiClient = new GeminiClient({
      apiKey: config.geminiApiKey,
      ...config.geminiConfig,
    });

    // ========================================================================
    // 2. Initialize Planning Components
    // ========================================================================
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    // ========================================================================
    // 3. Initialize Agent Pool with Real Agents
    // ========================================================================
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType,
    });

    // ========================================================================
    // 4. Initialize QA Runners
    // ========================================================================
    const gitService = new GitService({ baseDir: config.workingDir });

    const qaRunner = QARunnerFactory.create({
      workingDir: config.workingDir,
      geminiClient,
      gitService,
      buildConfig: {
        timeout: config.qaConfig?.buildTimeout,
      },
      lintConfig: {
        timeout: config.qaConfig?.lintTimeout,
        autoFix: config.qaConfig?.autoFixLint,
      },
      testConfig: {
        timeout: config.qaConfig?.testTimeout,
      },
    });

    // ========================================================================
    // 5. Initialize Task Queue and Event Bus
    // ========================================================================
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();

    // ========================================================================
    // 6. Initialize Infrastructure Components (Worktree, Checkpoint)
    // ========================================================================
    // Note: WorktreeManager requires GitService, CheckpointManager requires DB
    // These are created lazily or passed externally in full production setup
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/worktrees`,
    });

    // CheckpointManager requires database - create a placeholder that can be replaced
    // In production, this would be injected with a real database connection
    const checkpointManager = null; // Placeholder - inject via coordinator config if needed

    // ========================================================================
    // 7. Initialize Coordinator with All Dependencies
    // ========================================================================
    const coordinatorOptions: NexusCoordinatorOptions = {
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine: qaRunner, // QARunner serves as the QA engine
      worktreeManager,
      checkpointManager,
    };

    const coordinator = new NexusCoordinator(coordinatorOptions);

    // ========================================================================
    // 8. Create Shutdown Function
    // ========================================================================
    const shutdown = async (): Promise<void> => {
      // Stop coordinator if running
      try {
        await coordinator.stop();
      } catch {
        // Coordinator may already be stopped
      }

      // Terminate all agents
      try {
        await agentPool.terminateAll();
      } catch {
        // Pool may be empty or already cleaned up
      }

      // Clean up worktrees
      try {
        if (worktreeManager && typeof worktreeManager.cleanup === 'function') {
          await worktreeManager.cleanup();
        }
      } catch {
        // Worktree cleanup is best-effort
      }

      // Clear event bus listeners
      try {
        if (eventBus && typeof eventBus.removeAllListeners === 'function') {
          eventBus.removeAllListeners();
        }
      } catch {
        // EventBus cleanup is best-effort
      }
    };

    // ========================================================================
    // Return Nexus Instance
    // ========================================================================
    return {
      coordinator,
      agentPool,
      taskQueue,
      eventBus,
      llm: {
        claude: claudeClient,
        gemini: geminiClient,
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator,
      },
      shutdown,
    };
  }

  /**
   * Create a Nexus instance optimized for testing.
   *
   * This version:
   * - Uses mocked QA runners for faster execution
   * - Reduces iteration limits
   * - Maintains full functionality for integration testing
   *
   * @param config - Testing configuration
   * @returns Nexus instance optimized for testing
   */
  static createForTesting(config: NexusTestingConfig): NexusInstance {
    // ========================================================================
    // 1. Initialize LLM Clients
    // ========================================================================
    const claudeClient = new ClaudeClient({
      apiKey: config.claudeApiKey,
      ...config.claudeConfig,
    });

    const geminiClient = new GeminiClient({
      apiKey: config.geminiApiKey,
      ...config.geminiConfig,
    });

    // ========================================================================
    // 2. Initialize Planning Components
    // ========================================================================
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    // ========================================================================
    // 3. Initialize Agent Pool
    // ========================================================================
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType,
    });

    // ========================================================================
    // 4. Initialize QA Runners (Mocked or Real based on config)
    // ========================================================================
    const qaRunner = config.mockQA
      ? QARunnerFactory.createMock()
      : QARunnerFactory.create({
          workingDir: config.workingDir,
          geminiClient,
        });

    // ========================================================================
    // 5. Initialize Task Queue and Event Bus
    // ========================================================================
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();

    // ========================================================================
    // 6. Initialize Infrastructure (minimal for testing)
    // ========================================================================
    const gitService = new GitService({ baseDir: config.workingDir });
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/test-worktrees`,
    });
    const checkpointManager = null;

    // ========================================================================
    // 7. Initialize Coordinator
    // ========================================================================
    const coordinator = new NexusCoordinator({
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine: qaRunner,
      worktreeManager,
      checkpointManager,
    });

    // ========================================================================
    // 8. Shutdown Function
    // ========================================================================
    const shutdown = async (): Promise<void> => {
      try {
        await coordinator.stop();
      } catch {
        // Coordinator may already be stopped
      }
      try {
        await agentPool.terminateAll();
      } catch {
        // Pool may be empty or already cleaned up
      }
      try {
        if (worktreeManager && typeof worktreeManager.cleanup === 'function') {
          await worktreeManager.cleanup();
        }
      } catch {
        // Worktree cleanup is best-effort
      }
      try {
        if (eventBus && typeof eventBus.removeAllListeners === 'function') {
          eventBus.removeAllListeners();
        }
      } catch {
        // EventBus cleanup is best-effort
      }
    };

    return {
      coordinator,
      agentPool,
      taskQueue,
      eventBus,
      llm: {
        claude: claudeClient,
        gemini: geminiClient,
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator,
      },
      shutdown,
    };
  }

  /**
   * Create a minimal Nexus instance with only planning components.
   *
   * Useful for scenarios where you only need task decomposition
   * and dependency resolution without full orchestration.
   *
   * @param claudeApiKey - Anthropic API key
   * @returns Minimal Nexus instance with planning only
   */
  static createPlanningOnly(claudeApiKey: string): Pick<NexusInstance, 'planning' | 'llm'> & { shutdown: () => Promise<void> } {
    const claudeClient = new ClaudeClient({ apiKey: claudeApiKey });

    // Gemini not needed for planning-only mode, but we create a stub
    const geminiClient = null as unknown as GeminiClient;

    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    return {
      llm: {
        claude: claudeClient,
        gemini: geminiClient,
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator,
      },
      shutdown: async () => {
        // No resources to clean up in planning-only mode
      },
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Convenience function to create a Nexus instance.
 * Equivalent to NexusFactory.create(config).
 *
 * @param config - Factory configuration
 * @returns Fully-wired Nexus instance
 */
export function createNexus(config: NexusFactoryConfig): NexusInstance {
  return NexusFactory.create(config);
}

/**
 * Convenience function to create a testing Nexus instance.
 * Equivalent to NexusFactory.createForTesting(config).
 *
 * @param config - Testing configuration
 * @returns Nexus instance optimized for testing
 */
export function createTestingNexus(config: NexusTestingConfig): NexusInstance {
  return NexusFactory.createForTesting(config);
}
