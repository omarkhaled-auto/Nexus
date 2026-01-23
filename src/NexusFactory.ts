/**
 * NexusFactory - Factory for creating fully-wired Nexus instances
 *
 * This is the main entry point for creating Nexus orchestration instances.
 * It wires together all components including:
 * - LLM clients (Claude, Gemini) - API or CLI backends
 * - Planning components (TaskDecomposer, DependencyResolver, TimeEstimator)
 * - Execution components (AgentPool, QARunners)
 * - Orchestration components (NexusCoordinator, RalphStyleIterator)
 *
 * Phase 14B Task 18: Wiring & Factory
 * Phase 16: Full CLI Support Integration - CLI-first backend selection
 */

import { ClaudeClient, type ClaudeClientOptions } from './llm/clients/ClaudeClient';
import { GeminiClient, type GeminiClientOptions } from './llm/clients/GeminiClient';
import { ClaudeCodeCLIClient, CLINotFoundError, type ClaudeCodeCLIConfig } from './llm/clients/ClaudeCodeCLIClient';
import { GeminiCLIClient, GeminiCLINotFoundError } from './llm/clients/GeminiCLIClient';
import type { GeminiCLIConfig } from './llm/clients/GeminiCLIClient.types';
import { LocalEmbeddingsService, LocalEmbeddingsInitError } from './persistence/memory/LocalEmbeddingsService';
import type { LocalEmbeddingsConfig } from './persistence/memory/LocalEmbeddingsService.types';
import { EmbeddingsService } from './persistence/memory/EmbeddingsService';
import { APIKeyMissingError } from './errors/LLMBackendErrors';
import { TaskDecomposer } from './planning/decomposition/TaskDecomposer';
import { DependencyResolver } from './planning/dependencies/DependencyResolver';
import { TimeEstimator } from './planning/estimation/TimeEstimator';
import { AgentPool } from './orchestration/agents/AgentPool';
import { QARunnerFactory } from './execution/qa/QARunnerFactory';
import { QALoopEngine } from './execution/qa/QALoopEngine';
import { NexusCoordinator, type NexusCoordinatorOptions } from './orchestration/coordinator/NexusCoordinator';
import { TaskQueue } from './orchestration/queue/TaskQueue';
import { EventBus } from './orchestration/events/EventBus';
// Note: RalphStyleIterator is not directly instantiated here - it's part of the QA engine workflow
// import type { RalphStyleIteratorConfig } from './execution/iteration/types';
import { WorktreeManager } from './infrastructure/git/WorktreeManager';
import { GitService } from './infrastructure/git/GitService';
import type { AgentType } from './types/agent';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Backend type for LLM clients.
 * - 'cli': Use CLI binary (requires installation, but no API key needed)
 * - 'api': Use direct API calls (requires API key)
 */
export type LLMBackend = 'cli' | 'api';

/**
 * Backend type for embeddings service.
 * - 'local': Use local transformer models via Transformers.js (no API key needed)
 * - 'api': Use OpenAI embeddings API (requires API key)
 */
export type EmbeddingsBackend = 'local' | 'api';

/**
 * Configuration for creating a NexusFactory instance
 *
 * Phase 16: CLI-first defaults
 * - claudeBackend defaults to 'cli'
 * - geminiBackend defaults to 'cli'
 * - embeddingsBackend defaults to 'local'
 * - API keys are now OPTIONAL (required only when using 'api' backend)
 */
export interface NexusFactoryConfig {
  // ==========================================================================
  // Claude Configuration
  // ==========================================================================

  /** Anthropic API key for Claude (required when claudeBackend='api') */
  claudeApiKey?: string;

  /** Backend to use for Claude: 'cli' (default) or 'api' */
  claudeBackend?: LLMBackend;

  /** Claude CLI configuration (used when claudeBackend='cli') */
  claudeCliConfig?: ClaudeCodeCLIConfig;

  /** Claude API client configuration (used when claudeBackend='api') */
  claudeConfig?: Partial<ClaudeClientOptions>;

  // ==========================================================================
  // Gemini Configuration
  // ==========================================================================

  /** Google API key for Gemini (required when geminiBackend='api') */
  geminiApiKey?: string;

  /** Backend to use for Gemini: 'cli' (default) or 'api' */
  geminiBackend?: LLMBackend;

  /** Gemini CLI configuration (used when geminiBackend='cli') */
  geminiCliConfig?: GeminiCLIConfig;

  /** Gemini API client configuration (used when geminiBackend='api') */
  geminiConfig?: Partial<GeminiClientOptions>;

  // ==========================================================================
  // Embeddings Configuration
  // ==========================================================================

  /** OpenAI API key for embeddings (required when embeddingsBackend='api') */
  openaiApiKey?: string;

  /** Backend to use for embeddings: 'local' (default) or 'api' */
  embeddingsBackend?: EmbeddingsBackend;

  /** Local embeddings configuration (used when embeddingsBackend='local') */
  localEmbeddingsConfig?: LocalEmbeddingsConfig;

  // ==========================================================================
  // Project Configuration
  // ==========================================================================

  /** Root directory of the project being orchestrated */
  workingDir: string;

  /** Maximum agents per type (optional overrides) */
  maxAgentsByType?: Partial<Record<AgentType, number>>;

  // ==========================================================================
  // QA Configuration
  // ==========================================================================

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
    /** Maximum QA iterations before escalation (default: 3) */
    maxIterations?: number;
  };

  // ==========================================================================
  // Iteration Configuration
  // ==========================================================================

  /** Iteration configuration */
  iterationConfig?: {
    /** Maximum iterations before escalation (default: 50) */
    maxIterations?: number;
    /** Commit after each iteration (default: true) */
    commitEachIteration?: boolean;
  };
}

/**
 * Default configuration values for NexusFactory.
 * CLI-first: Prefer CLI/local over API where possible.
 */
export const DEFAULT_NEXUS_CONFIG: Partial<NexusFactoryConfig> = {
  claudeBackend: 'cli',
  geminiBackend: 'cli',
  embeddingsBackend: 'local',
};

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
  /**
   * LLM clients
   * Note: These implement LLMClient interface and can be either API or CLI clients
   */
  llm: {
    claude: ClaudeClient | ClaudeCodeCLIClient;
    gemini: GeminiClient | GeminiCLIClient;
  };
  /** Planning components */
  planning: {
    decomposer: TaskDecomposer;
    resolver: DependencyResolver;
    estimator: TimeEstimator;
  };
  /** Embeddings service (local or API) */
  embeddings?: LocalEmbeddingsService;
  /** Backend information for debugging/status */
  backends: {
    claude: LLMBackend;
    gemini: LLMBackend;
    embeddings: EmbeddingsBackend;
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
   * Backend selection (Phase 16 - Task 12):
   * - CLI-first: Prefers CLI clients over API when available
   * - Smart fallback: Falls back to API if CLI unavailable and API key exists
   * - Helpful errors: Throws descriptive errors with install instructions
   *
   * @param config - Factory configuration
   * @returns Promise resolving to fully-wired Nexus instance
   */
  static async create(config: NexusFactoryConfig): Promise<NexusInstance> {
    // ========================================================================
    // 1. Initialize LLM Clients (Task 12 - Backend Selection)
    // ========================================================================
    const [claudeResult, geminiResult] = await Promise.all([
      this.createClaudeClient(config),
      this.createGeminiClient(config),
    ]);

    const claudeClient = claudeResult.client;
    const geminiClient = geminiResult.client;
    const claudeBackend = claudeResult.backend;
    const geminiBackend = geminiResult.backend;

    // ========================================================================
    // 2. Initialize Embeddings Service (Task 12 - Backend Selection)
    // Note: Embeddings initialization can be slow, do it in parallel
    // ========================================================================
    let embeddingsResult: { service: LocalEmbeddingsService | EmbeddingsService; backend: EmbeddingsBackend } | undefined;
    let embeddingsBackend: EmbeddingsBackend = config.embeddingsBackend ?? 'local';

    try {
      embeddingsResult = await this.createEmbeddingsService(config);
      embeddingsBackend = embeddingsResult.backend;
    } catch (error) {
      // Embeddings are optional - log warning but don't fail
      console.warn('[NexusFactory] Embeddings service unavailable:', error instanceof Error ? error.message : error);
    }

    // ========================================================================
    // 3. Initialize Planning Components
    // ========================================================================
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    // ========================================================================
    // 4. Initialize Agent Pool with Real Agents
    // ========================================================================
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType,
    });

    // ========================================================================
    // 5. Initialize QA Runners
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
    // 5b. Wrap QARunner in QALoopEngine to provide run() interface
    // ========================================================================
    const qaEngine = new QALoopEngine({
      qaRunner,
      maxIterations: config.qaConfig?.maxIterations ?? 50,
      stopOnFirstFailure: true,
      workingDir: config.workingDir,
    });

    // ========================================================================
    // 6. Initialize Task Queue and Event Bus
    // ========================================================================
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();

    // ========================================================================
    // 7. Initialize Infrastructure Components (Worktree, Checkpoint)
    // ========================================================================
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/worktrees`,
    });

    const checkpointManager = null; // Placeholder - inject via coordinator config if needed

    // ========================================================================
    // 8. Initialize Coordinator with All Dependencies
    // ========================================================================
    const coordinatorOptions: NexusCoordinatorOptions = {
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine,
      worktreeManager,
      checkpointManager,
    };

    const coordinator = new NexusCoordinator(coordinatorOptions);

    // ========================================================================
    // 9. Create Shutdown Function
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
      embeddings: embeddingsResult?.service as LocalEmbeddingsService | undefined,
      backends: {
        claude: claudeBackend,
        gemini: geminiBackend,
        embeddings: embeddingsBackend,
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
   * - Supports backend selection with fallback (Phase 16 - Task 12)
   *
   * @param config - Testing configuration
   * @returns Promise resolving to Nexus instance optimized for testing
   */
  static async createForTesting(config: NexusTestingConfig): Promise<NexusInstance> {
    // ========================================================================
    // 1. Initialize LLM Clients (Task 12 - Backend Selection)
    // ========================================================================
    const [claudeResult, geminiResult] = await Promise.all([
      this.createClaudeClient(config),
      this.createGeminiClient(config),
    ]);

    const claudeClient = claudeResult.client;
    const geminiClient = geminiResult.client;
    const claudeBackend = claudeResult.backend;
    const geminiBackend = geminiResult.backend;

    // ========================================================================
    // 2. Initialize Embeddings Service (optional for testing)
    // ========================================================================
    let embeddingsResult: { service: LocalEmbeddingsService | EmbeddingsService; backend: EmbeddingsBackend } | undefined;
    let embeddingsBackend: EmbeddingsBackend = config.embeddingsBackend ?? 'local';

    try {
      embeddingsResult = await this.createEmbeddingsService(config);
      embeddingsBackend = embeddingsResult.backend;
    } catch {
      // Embeddings are optional for testing
    }

    // ========================================================================
    // 3. Initialize Planning Components
    // ========================================================================
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    // ========================================================================
    // 4. Initialize Agent Pool
    // ========================================================================
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType,
    });

    // ========================================================================
    // 5. Initialize QA Runners (Mocked or Real based on config)
    // ========================================================================
    const qaRunner = config.mockQA
      ? QARunnerFactory.createMock()
      : QARunnerFactory.create({
          workingDir: config.workingDir,
          geminiClient,
        });

    // Wrap QARunner in QALoopEngine to provide run() interface
    const qaEngine = new QALoopEngine({
      qaRunner,
      maxIterations: 50,
      stopOnFirstFailure: true,
      workingDir: config.workingDir,
    });

    // ========================================================================
    // 6. Initialize Task Queue and Event Bus
    // ========================================================================
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();

    // ========================================================================
    // 7. Initialize Infrastructure (minimal for testing)
    // ========================================================================
    const gitService = new GitService({ baseDir: config.workingDir });
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/test-worktrees`,
    });
    const checkpointManager = null;

    // ========================================================================
    // 8. Initialize Coordinator
    // ========================================================================
    const coordinator = new NexusCoordinator({
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine,
      worktreeManager,
      checkpointManager,
    });

    // ========================================================================
    // 9. Shutdown Function
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
      embeddings: embeddingsResult?.service as LocalEmbeddingsService | undefined,
      backends: {
        claude: claudeBackend,
        gemini: geminiBackend,
        embeddings: embeddingsBackend,
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

  // ==========================================================================
  // Private Backend Selection Methods (Task 12)
  // ==========================================================================

  /**
   * Create a Claude client based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='cli' → try CLI, fallback to API if available
   * 2. If backend='api' → require API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Claude client (CLI or API)
   * @throws CLINotFoundError when CLI unavailable and no API fallback
   */
  private static async createClaudeClient(
    config: NexusFactoryConfig
  ): Promise<{ client: ClaudeClient | ClaudeCodeCLIClient; backend: LLMBackend }> {
    const backend = config.claudeBackend ?? DEFAULT_NEXUS_CONFIG.claudeBackend ?? 'cli';

    if (backend === 'cli') {
      const cliClient = new ClaudeCodeCLIClient(config.claudeCliConfig);

      // Check if CLI is available
      if (await cliClient.isAvailable()) {
        return { client: cliClient, backend: 'cli' };
      }

      // CLI not available - check if API key exists as fallback
      if (config.claudeApiKey) {
        console.warn(
          '[NexusFactory] Claude CLI not available, falling back to API backend'
        );
        return {
          client: new ClaudeClient({
            apiKey: config.claudeApiKey,
            ...config.claudeConfig,
          }),
          backend: 'api',
        };
      }

      // Neither available - throw helpful error
      throw new CLINotFoundError();
    }

    // API backend explicitly requested
    if (!config.claudeApiKey) {
      throw new APIKeyMissingError('claude');
    }

    return {
      client: new ClaudeClient({
        apiKey: config.claudeApiKey,
        ...config.claudeConfig,
      }),
      backend: 'api',
    };
  }

  /**
   * Create a Gemini client based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='cli' → try CLI, fallback to API if available
   * 2. If backend='api' → require API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Gemini client (CLI or API)
   * @throws GeminiCLINotFoundError when CLI unavailable and no API fallback
   */
  private static async createGeminiClient(
    config: NexusFactoryConfig
  ): Promise<{ client: GeminiClient | GeminiCLIClient; backend: LLMBackend }> {
    const backend = config.geminiBackend ?? DEFAULT_NEXUS_CONFIG.geminiBackend ?? 'cli';

    if (backend === 'cli') {
      const cliClient = new GeminiCLIClient(config.geminiCliConfig);

      // Check if CLI is available
      if (await cliClient.isAvailable()) {
        return { client: cliClient, backend: 'cli' };
      }

      // CLI not available - check if API key exists as fallback
      if (config.geminiApiKey) {
        console.warn(
          '[NexusFactory] Gemini CLI not available, falling back to API backend'
        );
        return {
          client: new GeminiClient({
            apiKey: config.geminiApiKey,
            ...config.geminiConfig,
          }),
          backend: 'api',
        };
      }

      // Neither available - throw helpful error
      throw new GeminiCLINotFoundError();
    }

    // API backend explicitly requested
    if (!config.geminiApiKey) {
      throw new APIKeyMissingError('gemini');
    }

    return {
      client: new GeminiClient({
        apiKey: config.geminiApiKey,
        ...config.geminiConfig,
      }),
      backend: 'api',
    };
  }

  /**
   * Create an embeddings service based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='local' → try local, fallback to API if available
   * 2. If backend='api' → require OpenAI API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Embeddings service (local or API)
   * @throws LocalEmbeddingsInitError when local unavailable and no API fallback
   */
  private static async createEmbeddingsService(
    config: NexusFactoryConfig
  ): Promise<{ service: LocalEmbeddingsService | EmbeddingsService; backend: EmbeddingsBackend }> {
    const backend = config.embeddingsBackend ?? DEFAULT_NEXUS_CONFIG.embeddingsBackend ?? 'local';

    if (backend === 'local') {
      const localService = new LocalEmbeddingsService(config.localEmbeddingsConfig);

      // Check if local embeddings are available
      if (await localService.isAvailable()) {
        return { service: localService, backend: 'local' };
      }

      // Local not available - check if API key exists as fallback
      if (config.openaiApiKey) {
        console.warn(
          '[NexusFactory] Local embeddings not available, falling back to OpenAI API'
        );
        return {
          service: new EmbeddingsService({ apiKey: config.openaiApiKey }),
          backend: 'api',
        };
      }

      // Neither available - throw helpful error
      throw new LocalEmbeddingsInitError(
        config.localEmbeddingsConfig?.model ?? 'default',
        new Error('Local embeddings initialization failed and no API key fallback available')
      );
    }

    // API backend explicitly requested
    if (!config.openaiApiKey) {
      throw new APIKeyMissingError('embeddings');
    }

    return {
      service: new EmbeddingsService({ apiKey: config.openaiApiKey }),
      backend: 'api',
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
 * @returns Promise resolving to fully-wired Nexus instance
 */
export async function createNexus(config: NexusFactoryConfig): Promise<NexusInstance> {
  return NexusFactory.create(config);
}

/**
 * Convenience function to create a testing Nexus instance.
 * Equivalent to NexusFactory.createForTesting(config).
 *
 * @param config - Testing configuration
 * @returns Promise resolving to Nexus instance optimized for testing
 */
export async function createTestingNexus(config: NexusTestingConfig): Promise<NexusInstance> {
  return NexusFactory.createForTesting(config);
}
