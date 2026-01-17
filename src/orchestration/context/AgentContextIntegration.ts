/**
 * Agent Context Integration - Connects FreshContextManager with AgentPool
 *
 * This module provides integration hooks for the AgentPool to prepare and manage
 * context for agents as they are assigned to tasks.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * Philosophy:
 * - Each agent gets fresh context for each task
 * - Context is cleaned up after task completion/failure
 * - Integration is non-blocking and error-resilient
 */

import type {
  TaskSpec,
  TaskContext,
  ContextOptions,
  AgentContextResult,
} from './types';
import type { FreshContextManager } from './FreshContextManager';

// ============================================================================
// Types
// ============================================================================

/**
 * Status of an agent's context
 */
export type AgentContextStatus = 'pending' | 'ready' | 'cleared' | 'error';

/**
 * Information about an agent's current context
 */
export interface AgentContextInfo {
  /** Agent ID */
  agentId: string;
  /** Task ID for the context */
  taskId: string;
  /** Context status */
  status: AgentContextStatus;
  /** Context if ready */
  context?: TaskContext;
  /** Error message if status is 'error' */
  error?: string;
  /** When context was prepared */
  preparedAt?: Date;
  /** How long context build took in ms */
  buildTimeMs?: number;
}

/**
 * Options for context integration
 */
export interface AgentContextIntegrationOptions {
  /** Default context options to use */
  defaultContextOptions?: ContextOptions;
  /** Whether to throw on context build errors (default: false) */
  throwOnError?: boolean;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Default integration options
 */
const DEFAULT_INTEGRATION_OPTIONS: Required<AgentContextIntegrationOptions> = {
  defaultContextOptions: {},
  throwOnError: false,
  verbose: false,
};

// ============================================================================
// AgentContextIntegration Implementation
// ============================================================================

/**
 * AgentContextIntegration - Integrates FreshContextManager with AgentPool
 *
 * This class provides hooks that can be called by AgentPool to:
 * - Prepare context before assigning an agent to a task
 * - Clean up context after task completion
 * - Track context status for agents
 *
 * @example
 * ```typescript
 * const integration = new AgentContextIntegration(contextManager);
 *
 * // Before assigning agent to task
 * const result = await integration.prepareAgentContext(agentId, taskSpec);
 *
 * // Agent works with result.context...
 *
 * // After task completes
 * await integration.onTaskComplete(agentId, taskSpec.id);
 * ```
 */
export class AgentContextIntegration {
  /**
   * FreshContextManager instance
   */
  private readonly contextManager: FreshContextManager;

  /**
   * Configuration options
   */
  private readonly options: Required<AgentContextIntegrationOptions>;

  /**
   * Tracking map for agent contexts
   */
  private readonly agentContexts: Map<string, AgentContextInfo>;

  /**
   * Create a new AgentContextIntegration
   *
   * @param contextManager FreshContextManager to use
   * @param options Configuration options
   */
  constructor(
    contextManager: FreshContextManager,
    options?: AgentContextIntegrationOptions
  ) {
    this.contextManager = contextManager;
    this.options = { ...DEFAULT_INTEGRATION_OPTIONS, ...options };
    this.agentContexts = new Map();
  }

  // ==========================================================================
  // Public Methods - Context Lifecycle
  // ==========================================================================

  /**
   * Prepare context for an agent before task assignment
   *
   * This should be called by AgentPool before assigning an agent to a task.
   * It builds fresh context and associates it with the agent.
   *
   * @param agentId Agent identifier
   * @param task Task specification
   * @param contextOptions Optional context building options
   * @returns Result with context and metadata
   */
  async prepareAgentContext(
    agentId: string,
    task: TaskSpec,
    contextOptions?: ContextOptions
  ): Promise<AgentContextResult> {
    const startTime = Date.now();

    // Mark as pending
    this.agentContexts.set(agentId, {
      agentId,
      taskId: task.id,
      status: 'pending',
    });

    try {
      // Build fresh context
      const options = {
        ...this.options.defaultContextOptions,
        ...contextOptions,
      };

      const context = await this.contextManager.buildFreshContext(task, options);

      const buildTimeMs = Date.now() - startTime;

      // Associate agent with context
      this.contextManager.associateAgentWithContext(agentId, context.contextId);

      // Update tracking
      this.agentContexts.set(agentId, {
        agentId,
        taskId: task.id,
        status: 'ready',
        context,
        preparedAt: new Date(),
        buildTimeMs,
      });

      if (this.options.verbose) {
        console.log(
          `[AgentContextIntegration] Prepared context for agent ${agentId}, ` +
          `task ${task.id} (${buildTimeMs}ms, ${context.tokenCount} tokens)`
        );
      }

      return {
        context,
        agentId,
        taskId: task.id,
        buildTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update tracking with error
      this.agentContexts.set(agentId, {
        agentId,
        taskId: task.id,
        status: 'error',
        error: errorMessage,
      });

      if (this.options.verbose) {
        console.error(
          `[AgentContextIntegration] Failed to prepare context for agent ${agentId}:`,
          error
        );
      }

      if (this.options.throwOnError) {
        throw error;
      }

      // Return empty context on error
      const emptyContext: TaskContext = {
        repoMap: '',
        codebaseDocs: {
          architectureSummary: '',
          relevantPatterns: [],
          relevantAPIs: [],
          tokenCount: 0,
        },
        projectConfig: {
          name: 'unknown',
          path: '.',
          language: 'unknown',
        },
        taskSpec: task,
        relevantFiles: [],
        relevantCode: [],
        relevantMemories: [],
        conversationHistory: [] as never[],
        tokenCount: 0,
        tokenBudget: 0,
        generatedAt: new Date(),
        contextId: 'error-fallback',
      };

      return {
        context: emptyContext,
        agentId,
        taskId: task.id,
        buildTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Handle task completion - cleans up agent context
   *
   * This should be called by AgentPool when a task completes successfully.
   *
   * @param agentId Agent identifier
   * @param taskId Task identifier
   */
  async onTaskComplete(agentId: string, taskId: string): Promise<void> {
    await this.clearContext(agentId, taskId, 'complete');
  }

  /**
   * Handle task failure - cleans up agent context
   *
   * This should be called by AgentPool when a task fails.
   *
   * @param agentId Agent identifier
   * @param taskId Task identifier
   * @param _error Optional error information (preserved for logging)
   */
  async onTaskFailed(agentId: string, taskId: string, _error?: Error): Promise<void> {
    await this.clearContext(agentId, taskId, 'failed');
  }

  /**
   * Get context for an agent
   *
   * @param agentId Agent identifier
   * @returns Context if available, undefined otherwise
   */
  getAgentContext(agentId: string): TaskContext | undefined {
    return this.contextManager.getContextForAgent(agentId);
  }

  /**
   * Get context info for an agent
   *
   * @param agentId Agent identifier
   * @returns Context info if available, undefined otherwise
   */
  getAgentContextInfo(agentId: string): AgentContextInfo | undefined {
    return this.agentContexts.get(agentId);
  }

  // ==========================================================================
  // Public Methods - Status and Statistics
  // ==========================================================================

  /**
   * Get all agent context infos
   *
   * @returns Map of agent IDs to context info
   */
  getAllAgentContexts(): Map<string, AgentContextInfo> {
    return new Map(this.agentContexts);
  }

  /**
   * Get count of agents with ready context
   *
   * @returns Number of agents with ready context
   */
  getReadyCount(): number {
    let count = 0;
    const values = Array.from(this.agentContexts.values());
    for (const info of values) {
      if (info.status === 'ready') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get count of agents with pending context
   *
   * @returns Number of agents with pending context
   */
  getPendingCount(): number {
    let count = 0;
    const values = Array.from(this.agentContexts.values());
    for (const info of values) {
      if (info.status === 'pending') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get count of agents with error status
   *
   * @returns Number of agents with error status
   */
  getErrorCount(): number {
    let count = 0;
    const values = Array.from(this.agentContexts.values());
    for (const info of values) {
      if (info.status === 'error') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get integration statistics
   *
   * @returns Statistics object
   */
  getStats(): {
    total: number;
    ready: number;
    pending: number;
    cleared: number;
    error: number;
  } {
    const stats = {
      total: this.agentContexts.size,
      ready: 0,
      pending: 0,
      cleared: 0,
      error: 0,
    };

    const values = Array.from(this.agentContexts.values());
    for (const info of values) {
      switch (info.status) {
        case 'ready':
          stats.ready++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'cleared':
          stats.cleared++;
          break;
        case 'error':
          stats.error++;
          break;
      }
    }

    return stats;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Clear context for an agent
   */
  private async clearContext(
    agentId: string,
    taskId: string,
    reason: 'complete' | 'failed'
  ): Promise<void> {
    try {
      // Clear from context manager
      await this.contextManager.clearAgentContext(agentId);
      await this.contextManager.clearTaskContext(taskId);

      // Update tracking
      const existing = this.agentContexts.get(agentId);
      if (existing) {
        this.agentContexts.set(agentId, {
          ...existing,
          status: 'cleared',
          context: undefined,
        });
      }

      if (this.options.verbose) {
        console.log(
          `[AgentContextIntegration] Cleared context for agent ${agentId}, ` +
          `task ${taskId} (${reason})`
        );
      }
    } catch (error) {
      if (this.options.verbose) {
        console.error(
          `[AgentContextIntegration] Error clearing context for agent ${agentId}:`,
          error
        );
      }

      if (this.options.throwOnError) {
        throw error;
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AgentContextIntegration with a FreshContextManager
 *
 * @param contextManager FreshContextManager instance
 * @param options Configuration options
 * @returns Configured AgentContextIntegration
 */
export function createAgentContextIntegration(
  contextManager: FreshContextManager,
  options?: AgentContextIntegrationOptions
): AgentContextIntegration {
  return new AgentContextIntegration(contextManager, options);
}
