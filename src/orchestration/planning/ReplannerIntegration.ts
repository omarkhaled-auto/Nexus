/**
 * Replanner Integration Module
 *
 * Provides integration points between the DynamicReplanner and the
 * NexusCoordinator/orchestration system. Enables event-driven replanning
 * based on task lifecycle events.
 *
 * Layer 2/3: Orchestration / Planning
 *
 * Philosophy:
 * - Tasks are monitored throughout their lifecycle
 * - Iteration results trigger replanning evaluation
 * - Seamless integration with orchestration layer
 */

import type {
  ExecutionContext,
  ReplanDecision,
  ReplanResult,
  Task,
  MonitoredTask,
  ReplanReason,
  ReplanMetrics,
  IDynamicReplanner,
} from './types';

import type {
  IterationResult,
  IterationHistoryEntry,
  ErrorEntry,
} from '../../execution/iteration/types';

// ============================================================================
// Event Emitter Types
// ============================================================================

/**
 * Events that can be emitted by the integration module
 */
export type ReplannerEventType =
  | 'task:started'
  | 'task:iteration_complete'
  | 'task:completed'
  | 'task:failed'
  | 'replan:decision'
  | 'replan:executed'
  | 'replan:split'
  | 'replan:escalated';

/**
 * Event payload types
 */
export interface ReplannerEventPayload {
  'task:started': { taskId: string; task: Task };
  'task:iteration_complete': { taskId: string; iteration: number; result: IterationResult };
  'task:completed': { taskId: string; success: boolean };
  'task:failed': { taskId: string; reason: string };
  'replan:decision': { taskId: string; decision: ReplanDecision };
  'replan:executed': { taskId: string; result: ReplanResult };
  'replan:split': { taskId: string; originalTask: Task; newTasks: Task[] };
  'replan:escalated': { taskId: string; reason: ReplanReason };
}

/**
 * Event handler type
 */
export type ReplannerEventHandler<T extends ReplannerEventType> = (
  payload: ReplannerEventPayload[T]
) => void | Promise<void>;

/**
 * Simple event emitter for replanner events
 */
export interface IReplannerEventEmitter {
  on<T extends ReplannerEventType>(event: T, handler: ReplannerEventHandler<T>): void;
  off<T extends ReplannerEventType>(event: T, handler: ReplannerEventHandler<T>): void;
  emit<T extends ReplannerEventType>(event: T, payload: ReplannerEventPayload[T]): void;
}

// ============================================================================
// Simple Event Emitter Implementation
// ============================================================================

/**
 * Simple event emitter for replanner integration
 */
export class ReplannerEventEmitterImpl implements IReplannerEventEmitter {
  private readonly handlers = new Map<string, Set<ReplannerEventHandler<ReplannerEventType>>>();

  on<T extends ReplannerEventType>(event: T, handler: ReplannerEventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler as ReplannerEventHandler<ReplannerEventType>);
  }

  off<T extends ReplannerEventType>(event: T, handler: ReplannerEventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as ReplannerEventHandler<ReplannerEventType>);
  }

  emit<T extends ReplannerEventType>(event: T, payload: ReplannerEventPayload[T]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          void handler(payload);
        } catch {
          // Swallow handler errors to prevent breaking the event chain
        }
      }
    }
  }
}

// ============================================================================
// Replanner Integration Class
// ============================================================================

/**
 * Configuration for ReplannerIntegration
 */
export interface ReplannerIntegrationConfig {
  /** DynamicReplanner instance to wrap */
  replanner: IDynamicReplanner;
  /** Event emitter for notifications */
  eventEmitter?: IReplannerEventEmitter;
  /** Whether to auto-check replanning after each iteration */
  autoCheckOnIteration?: boolean;
  /** Minimum iterations before triggering replan check */
  minIterationsBeforeCheck?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_INTEGRATION_CONFIG = {
  autoCheckOnIteration: true,
  minIterationsBeforeCheck: 3,
};

/**
 * ReplannerIntegration wraps DynamicReplanner and provides hooks
 * for the NexusCoordinator to integrate replanning into task execution.
 */
export class ReplannerIntegration {
  private readonly replanner: IDynamicReplanner;
  private readonly eventEmitter: IReplannerEventEmitter;
  private readonly autoCheckOnIteration: boolean;
  private readonly minIterationsBeforeCheck: number;
  private readonly taskStartTimes = new Map<string, Date>();

  /**
   * Create a new ReplannerIntegration
   */
  constructor(config: ReplannerIntegrationConfig) {
    this.replanner = config.replanner;
    this.eventEmitter = config.eventEmitter ?? new ReplannerEventEmitterImpl();
    this.autoCheckOnIteration =
      config.autoCheckOnIteration ?? DEFAULT_INTEGRATION_CONFIG.autoCheckOnIteration;
    this.minIterationsBeforeCheck =
      config.minIterationsBeforeCheck ?? DEFAULT_INTEGRATION_CONFIG.minIterationsBeforeCheck;
  }

  // ===========================================================================
  // Task Lifecycle Hooks
  // ===========================================================================

  /**
   * Called when a task starts execution.
   * Initializes monitoring for the task.
   */
  onTaskStarted(taskId: string, task: Task): void {
    // Create initial execution context
    const context = this.createInitialContext(taskId, task);

    // Start monitoring
    this.replanner.startMonitoring(taskId, context);

    // Track start time
    this.taskStartTimes.set(taskId, new Date());

    // Emit event
    this.eventEmitter.emit('task:started', { taskId, task });
  }

  /**
   * Called after each iteration completes.
   * Updates context and optionally checks for replanning.
   */
  onIterationComplete(
    taskId: string,
    iterationResult: IterationResult
  ): ReplanDecision | null {
    // Get elapsed time
    const startTime = this.taskStartTimes.get(taskId);
    const timeElapsed = startTime
      ? Math.floor((Date.now() - startTime.getTime()) / 60000)
      : 0;

    // Build context update from iteration result
    const contextUpdate = this.buildContextUpdate(iterationResult, timeElapsed);

    // Update replanner context
    this.replanner.updateContext(taskId, contextUpdate);

    // Emit iteration complete event
    this.eventEmitter.emit('task:iteration_complete', {
      taskId,
      iteration: iterationResult.iterations,
      result: iterationResult,
    });

    // Check for replanning if auto-check is enabled and minimum iterations reached
    if (
      this.autoCheckOnIteration &&
      iterationResult.iterations >= this.minIterationsBeforeCheck
    ) {
      const decision = this.replanner.checkReplanningNeeded(taskId);

      if (decision.shouldReplan) {
        this.eventEmitter.emit('replan:decision', { taskId, decision });
      }

      return decision;
    }

    return null;
  }

  /**
   * Called when a task completes (success or failure).
   * Stops monitoring and records final state.
   */
  onTaskCompleted(taskId: string, success: boolean): void {
    // Stop monitoring
    this.replanner.stopMonitoring(taskId);

    // Clean up start time
    this.taskStartTimes.delete(taskId);

    // Emit event
    this.eventEmitter.emit('task:completed', { taskId, success });
  }

  /**
   * Called when agent provides feedback about task complexity.
   * Updates context and triggers complexity check.
   */
  onAgentFeedback(taskId: string, feedback: string): ReplanDecision | null {
    // Update context with feedback
    this.replanner.updateContext(taskId, { agentFeedback: feedback });

    // Check if feedback triggers replanning
    const decision = this.replanner.checkReplanningNeeded(taskId);

    if (decision.shouldReplan) {
      this.eventEmitter.emit('replan:decision', { taskId, decision });
    }

    return decision;
  }

  // ===========================================================================
  // Replan Decision Handling
  // ===========================================================================

  /**
   * Handle a replan decision by executing the appropriate action.
   */
  async handleReplanDecision(
    taskId: string,
    decision: ReplanDecision
  ): Promise<ReplanResult | null> {
    if (!decision.shouldReplan || !decision.reason) {
      return null;
    }

    // Execute replan
    const result = await this.replanner.replan(taskId, decision.reason);

    // Emit appropriate events
    this.eventEmitter.emit('replan:executed', { taskId, result });

    if (result.success) {
      switch (result.action) {
        case 'split':
          if (result.newTasks) {
            this.eventEmitter.emit('replan:split', {
              taskId,
              originalTask: result.originalTask,
              newTasks: result.newTasks,
            });
          }
          break;

        case 'escalate':
          this.eventEmitter.emit('replan:escalated', {
            taskId,
            reason: decision.reason,
          });
          break;
      }
    }

    return result;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get all currently monitored tasks
   */
  getMonitoredTasks(): MonitoredTask[] {
    return this.replanner.getMonitoredTasks();
  }

  /**
   * Get decision history for a task
   */
  getDecisionHistory(taskId: string): ReplanDecision[] {
    return this.replanner.getDecisionHistory(taskId);
  }

  /**
   * Get the underlying replanner instance
   */
  getReplanner(): IDynamicReplanner {
    return this.replanner;
  }

  /**
   * Get the event emitter
   */
  getEventEmitter(): IReplannerEventEmitter {
    return this.eventEmitter;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Create initial execution context for a task
   */
  private createInitialContext(taskId: string, task: Task): ExecutionContext {
    return {
      taskId,
      taskName: task.name,
      estimatedTime: task.estimatedTime,
      timeElapsed: 0,
      iteration: 0,
      maxIterations: 20, // Default, can be overridden
      filesExpected: task.files,
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    };
  }

  /**
   * Build context update from iteration result
   */
  private buildContextUpdate(
    result: IterationResult,
    timeElapsed: number
  ): Partial<ExecutionContext> {
    // Extract files modified from history
    const filesModified = this.extractFilesModified(result.history);

    // Extract errors from last iteration
    const errors = this.extractErrors(result.history);

    // Calculate consecutive failures
    const consecutiveFailures = this.calculateConsecutiveFailures(result.history);

    return {
      iteration: result.iterations,
      timeElapsed,
      filesModified,
      errors,
      consecutiveFailures,
    };
  }

  /**
   * Extract unique files modified from iteration history
   */
  private extractFilesModified(history: IterationHistoryEntry[]): string[] {
    const files = new Set<string>();

    for (const entry of history) {
      for (const change of entry.changes) {
        files.add(change.file);
      }
    }

    return Array.from(files);
  }

  /**
   * Extract errors from iteration history
   */
  private extractErrors(history: IterationHistoryEntry[]): ErrorEntry[] {
    const errors: ErrorEntry[] = [];

    for (const entry of history) {
      errors.push(...entry.errors);
    }

    return errors;
  }

  /**
   * Calculate consecutive failures from history
   */
  private calculateConsecutiveFailures(history: IterationHistoryEntry[]): number {
    if (history.length === 0) return 0;

    let count = 0;

    // Count backwards from the most recent iteration
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];

      // Check if this iteration had errors
      const hadErrors =
        entry.errors.length > 0 ||
        entry.buildResult?.success === false ||
        entry.lintResult?.success === false ||
        entry.testResult?.success === false;

      if (hadErrors) {
        count++;
      } else {
        break; // Stop counting on first success
      }
    }

    return count;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a ReplannerIntegration with the given configuration
 */
export function createReplannerIntegration(
  config: ReplannerIntegrationConfig
): ReplannerIntegration {
  return new ReplannerIntegration(config);
}

/**
 * Helper to compute metrics from execution context
 */
export function computeMetricsFromContext(context: ExecutionContext): ReplanMetrics {
  const unexpectedFiles = context.filesModified.filter(
    (f) => !context.filesExpected.includes(f)
  );

  return {
    timeElapsed: context.timeElapsed,
    estimatedTime: context.estimatedTime,
    timeRatio:
      context.estimatedTime > 0 ? context.timeElapsed / context.estimatedTime : 0,
    iterations: context.iteration,
    maxIterations: context.maxIterations,
    iterationRatio:
      context.maxIterations > 0 ? context.iteration / context.maxIterations : 0,
    filesModified: context.filesModified.length,
    filesExpected: context.filesExpected.length,
    scopeCreepCount: unexpectedFiles.length,
    errorsEncountered: context.errors.length,
    consecutiveFailures: context.consecutiveFailures,
  };
}
