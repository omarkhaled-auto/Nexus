// PlanningExecutionBridge - Plan to Execution Connection
// Phase 04-03: Connects planning layer output to execution layer input

import type { TaskQueue, OrchestrationTask } from '@/orchestration/types';
import type { Wave, PlanningTask } from '@/planning/types';
import type { EventBus } from '@/orchestration/events/EventBus';

/**
 * Handle returned when submitting a plan
 */
export interface ExecutionHandle {
  id: string;
}

/**
 * Status of an execution
 */
export interface ExecutionStatus {
  currentWave: number;
  totalWaves: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  status: 'running' | 'completed' | 'aborted';
}

/**
 * Options for PlanningExecutionBridge constructor
 */
export interface PlanningExecutionBridgeOptions {
  taskQueue: TaskQueue;
  eventBus: EventBus;
}

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Wave completion callback type
 */
type WaveCompleteCallback = (waveId: number) => void;

/**
 * Plan completion callback type
 */
type PlanCompleteCallback = () => void;

/**
 * Internal execution context for tracking a plan
 */
interface ExecutionContext {
  id: string;
  waves: Wave[];
  taskIds: Set<string>;
  taskToWave: Map<string, number>;
  waveTaskCounts: Map<number, { total: number; completed: number }>;
  completedTaskIds: Set<string>;
  failedTaskIds: Set<string>;
  currentWave: number;
  status: 'running' | 'completed' | 'aborted';
  waveCompleteCallbacks: Set<WaveCompleteCallback>;
  planCompleteCallbacks: Set<PlanCompleteCallback>;
}

/**
 * PlanningExecutionBridge connects planning layer output to execution layer input.
 *
 * Takes waves produced by the planning layer and queues them for execution,
 * then tracks progress and fires callbacks on wave/plan completion.
 *
 * Features:
 * - Submit waves for execution
 * - Track completion per plan
 * - Wave and plan completion callbacks
 * - Support for multiple concurrent plans
 * - Abort capability
 */
export class PlanningExecutionBridge {
  private readonly taskQueue: TaskQueue;
  private readonly eventBus: EventBus;

  /** Map of handleId -> ExecutionContext */
  private executions: Map<string, ExecutionContext> = new Map();

  /** Reverse map of taskId -> handleId for event routing */
  private taskToExecution: Map<string, string> = new Map();

  /** Event unsubscribers */
  private unsubscribers: Unsubscribe[] = [];

  constructor(options: PlanningExecutionBridgeOptions) {
    this.taskQueue = options.taskQueue;
    this.eventBus = options.eventBus;

    // Subscribe to task events
    this.unsubscribers.push(
      this.eventBus.on('task:completed', (event) => {
        this.handleTaskCompleted(event.payload.taskId);
      })
    );

    this.unsubscribers.push(
      this.eventBus.on('task:failed', (event) => {
        this.handleTaskFailed(event.payload.taskId);
      })
    );
  }

  /**
   * Submit a plan for execution
   *
   * Queues all tasks from waves to the TaskQueue and sets up
   * tracking for completion callbacks.
   *
   * @param waves Array of waves from planning layer
   * @returns ExecutionHandle for tracking this execution
   */
  submitPlan(waves: Wave[]): ExecutionHandle {
    const handleId = crypto.randomUUID();

    // Create execution context
    const context: ExecutionContext = {
      id: handleId,
      waves,
      taskIds: new Set(),
      taskToWave: new Map(),
      waveTaskCounts: new Map(),
      completedTaskIds: new Set(),
      failedTaskIds: new Set(),
      currentWave: 0,
      status: waves.length === 0 ? 'completed' : 'running',
      waveCompleteCallbacks: new Set(),
      planCompleteCallbacks: new Set(),
    };

    // Process each wave
    for (const wave of waves) {
      context.waveTaskCounts.set(wave.id, { total: wave.tasks.length, completed: 0 });

      for (const task of wave.tasks) {
        // Track task
        context.taskIds.add(task.id);
        context.taskToWave.set(task.id, wave.id);
        this.taskToExecution.set(task.id, handleId);

        // Convert PlanningTask to OrchestrationTask and enqueue
        const orchTask: OrchestrationTask = {
          ...task,
          status: 'pending',
          priority: 0,
          createdAt: new Date(),
        };

        this.taskQueue.enqueue(orchTask, wave.id);
      }
    }

    this.executions.set(handleId, context);

    return { id: handleId };
  }

  /**
   * Get execution status by handle ID
   *
   * @param handleId Execution handle ID
   * @returns ExecutionStatus or null if not found
   */
  getExecutionStatus(handleId: string): ExecutionStatus | null {
    const context = this.executions.get(handleId);
    if (!context) {
      return null;
    }

    const totalTasks = context.taskIds.size;
    const completedTasks = context.completedTaskIds.size;
    const failedTasks = context.failedTaskIds.size;

    return {
      currentWave: context.currentWave,
      totalWaves: context.waves.length,
      completedTasks,
      failedTasks,
      pendingTasks: totalTasks - completedTasks - failedTasks,
      totalTasks,
      status: context.status,
    };
  }

  /**
   * Register callback for wave completion
   *
   * @param handleId Execution handle ID
   * @param callback Function called with wave ID when wave completes
   * @returns Unsubscribe function
   */
  onWaveComplete(handleId: string, callback: WaveCompleteCallback): Unsubscribe {
    const context = this.executions.get(handleId);
    if (!context) {
      return () => {}; // No-op for unknown handle
    }

    context.waveCompleteCallbacks.add(callback);

    return () => {
      context.waveCompleteCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for plan completion
   *
   * @param handleId Execution handle ID
   * @param callback Function called when all waves complete
   * @returns Unsubscribe function
   */
  onPlanComplete(handleId: string, callback: PlanCompleteCallback): Unsubscribe {
    const context = this.executions.get(handleId);
    if (!context) {
      return () => {}; // No-op for unknown handle
    }

    context.planCompleteCallbacks.add(callback);

    return () => {
      context.planCompleteCallbacks.delete(callback);
    };
  }

  /**
   * Abort execution of a plan
   *
   * Marks the execution as aborted and prevents further callbacks.
   *
   * @param handleId Execution handle ID
   */
  abort(handleId: string): void {
    const context = this.executions.get(handleId);
    if (!context) {
      return; // Silently ignore unknown handles
    }

    context.status = 'aborted';
    context.waveCompleteCallbacks.clear();
    context.planCompleteCallbacks.clear();
  }

  /**
   * Check if execution is complete
   *
   * @param handleId Execution handle ID
   * @returns true if all tasks are complete
   */
  isComplete(handleId: string): boolean {
    const context = this.executions.get(handleId);
    if (!context) {
      return false;
    }

    return context.status === 'completed';
  }

  /**
   * Handle task completion event
   */
  private handleTaskCompleted(taskId: string): void {
    const handleId = this.taskToExecution.get(taskId);
    if (!handleId) return;

    const context = this.executions.get(handleId);
    if (!context || context.status === 'aborted') return;

    // Mark task as completed
    context.completedTaskIds.add(taskId);

    // Update wave completion count
    const waveId = context.taskToWave.get(taskId);
    if (waveId !== undefined) {
      const waveCount = context.waveTaskCounts.get(waveId);
      if (waveCount) {
        waveCount.completed++;

        // Check if wave is complete
        if (waveCount.completed === waveCount.total) {
          // Fire wave complete callbacks
          for (const callback of context.waveCompleteCallbacks) {
            try {
              callback(waveId);
            } catch {
              // Ignore callback errors
            }
          }

          // Advance to next wave
          this.advanceWave(context);
        }
      }
    }

    // Check if all tasks are complete
    this.checkPlanCompletion(context);
  }

  /**
   * Handle task failure event
   */
  private handleTaskFailed(taskId: string): void {
    const handleId = this.taskToExecution.get(taskId);
    if (!handleId) return;

    const context = this.executions.get(handleId);
    if (!context || context.status === 'aborted') return;

    // Mark task as failed
    context.failedTaskIds.add(taskId);

    // Update wave completion count (failed counts as "done" for wave progress)
    const waveId = context.taskToWave.get(taskId);
    if (waveId !== undefined) {
      const waveCount = context.waveTaskCounts.get(waveId);
      if (waveCount) {
        waveCount.completed++;

        // Check if wave is complete (even with failures)
        if (waveCount.completed === waveCount.total) {
          // Fire wave complete callbacks
          for (const callback of context.waveCompleteCallbacks) {
            try {
              callback(waveId);
            } catch {
              // Ignore callback errors
            }
          }

          // Advance to next wave
          this.advanceWave(context);
        }
      }
    }

    // Check if all tasks are complete
    this.checkPlanCompletion(context);
  }

  /**
   * Advance to next wave
   */
  private advanceWave(context: ExecutionContext): void {
    // Find next wave
    for (let i = context.currentWave + 1; i < context.waves.length; i++) {
      const waveCount = context.waveTaskCounts.get(i);
      if (waveCount && waveCount.total > 0) {
        context.currentWave = i;
        return;
      }
    }
  }

  /**
   * Check if plan is complete and fire callbacks
   */
  private checkPlanCompletion(context: ExecutionContext): void {
    const totalDone = context.completedTaskIds.size + context.failedTaskIds.size;

    if (totalDone === context.taskIds.size) {
      context.status = 'completed';

      // Fire plan complete callbacks
      for (const callback of context.planCompleteCallbacks) {
        try {
          callback();
        } catch {
          // Ignore callback errors
        }
      }
    }
  }

  /**
   * Cleanup subscriptions (for testing/disposal)
   */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.executions.clear();
    this.taskToExecution.clear();
  }
}
