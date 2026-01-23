/**
 * Task Orchestration Hook
 *
 * Manages the execution orchestration for the Kanban board.
 * Handles start/pause/resume/stop execution with dependency-aware task ordering.
 *
 * Phase 24: Task Orchestration implementation
 */

import { create } from 'zustand';
import { useCallback, useEffect, useRef } from 'react';
import type {
  ExecutionState,
  ExecutionStatus,
  ExecutionError,
  ExecutionHistoryEntry,
  KanbanTask,
  KanbanTaskStatus,
  ExecutionProgressPayload,
  TaskStatusChangedPayload,
} from '@/types/execution';

// ============================================================================
// Execution Store
// ============================================================================

const initialExecutionState: ExecutionState = {
  status: 'idle',
  projectId: null,
  currentTaskId: null,
  queuedTaskIds: [],
  completedTaskIds: [],
  failedTaskIds: [],
  blockedTaskIds: [],
  startedAt: null,
  pausedAt: null,
  completedAt: null,
  totalTasks: 0,
  completedCount: 0,
  failedCount: 0,
  inProgressCount: 0,
  overallProgress: 0,
  estimatedRemainingMinutes: null,
  errors: [],
  executionHistory: [],
};

interface ExecutionStore extends ExecutionState {
  // Task data (local cache for orchestration)
  tasks: KanbanTask[];

  // Actions
  setTasks: (tasks: KanbanTask[]) => void;
  updateTask: (taskId: string, update: Partial<KanbanTask>) => void;
  setStatus: (status: ExecutionStatus) => void;
  setProjectId: (projectId: string) => void;
  setCurrentTask: (taskId: string | null) => void;
  queueTask: (taskId: string) => void;
  dequeueTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, error?: string) => void;
  blockTask: (taskId: string) => void;
  unblockTask: (taskId: string) => void;
  addError: (error: ExecutionError) => void;
  addHistoryEntry: (entry: ExecutionHistoryEntry) => void;
  updateProgress: (payload: ExecutionProgressPayload) => void;
  handleTaskStatusChange: (payload: TaskStatusChangedPayload) => void;
  start: (projectId: string, tasks: KanbanTask[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionStore>()((set, get) => ({
  ...initialExecutionState,
  tasks: [],

  setTasks: (tasks: KanbanTask[]) => {
    set({ tasks, totalTasks: tasks.length });
  },

  updateTask: (taskId: string, update: Partial<KanbanTask>) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...update, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  setStatus: (status: ExecutionStatus) => {
    set({ status });
  },

  setProjectId: (projectId: string) => {
    set({ projectId });
  },

  setCurrentTask: (taskId: string | null) => {
    set(() => ({
      currentTaskId: taskId,
      inProgressCount: taskId ? 1 : 0,
    }));
  },

  queueTask: (taskId: string) => {
    set((state) => {
      if (state.queuedTaskIds.includes(taskId)) return state;
      return { queuedTaskIds: [...state.queuedTaskIds, taskId] };
    });
  },

  dequeueTask: (taskId: string) => {
    set((state) => ({
      queuedTaskIds: state.queuedTaskIds.filter((id) => id !== taskId),
    }));
  },

  completeTask: (taskId: string) => {
    set((state) => {
      const newCompletedIds = state.completedTaskIds.includes(taskId)
        ? state.completedTaskIds
        : [...state.completedTaskIds, taskId];
      const completedCount = newCompletedIds.length;
      const overallProgress =
        state.totalTasks > 0 ? Math.round((completedCount / state.totalTasks) * 100) : 0;
      return {
        completedTaskIds: newCompletedIds,
        completedCount,
        overallProgress,
        currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
        inProgressCount: state.currentTaskId === taskId ? 0 : state.inProgressCount,
      };
    });
  },

  failTask: (taskId: string, errorMessage?: string) => {
    const timestamp = new Date().toISOString();
    set((state) => {
      const newFailedIds = state.failedTaskIds.includes(taskId)
        ? state.failedTaskIds
        : [...state.failedTaskIds, taskId];
      const newErrors = errorMessage
        ? [
            ...state.errors,
            {
              id: `error-${Date.now()}`,
              timestamp,
              taskId,
              message: errorMessage,
              fatal: false,
            },
          ]
        : state.errors;
      return {
        failedTaskIds: newFailedIds,
        failedCount: newFailedIds.length,
        errors: newErrors,
        currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
        inProgressCount: state.currentTaskId === taskId ? 0 : state.inProgressCount,
      };
    });
  },

  blockTask: (taskId: string) => {
    set((state) => {
      if (state.blockedTaskIds.includes(taskId)) return state;
      return { blockedTaskIds: [...state.blockedTaskIds, taskId] };
    });
  },

  unblockTask: (taskId: string) => {
    set((state) => ({
      blockedTaskIds: state.blockedTaskIds.filter((id) => id !== taskId),
    }));
  },

  addError: (error: ExecutionError) => {
    set((state) => ({
      errors: [...state.errors, error],
    }));
  },

  addHistoryEntry: (entry: ExecutionHistoryEntry) => {
    set((state) => ({
      executionHistory: [...state.executionHistory, entry],
    }));
  },

  updateProgress: (payload: ExecutionProgressPayload) => {
    set({
      completedCount: payload.completedCount,
      totalTasks: payload.totalCount,
      overallProgress: payload.overallProgress,
      currentTaskId: payload.currentTaskId,
      status: payload.status,
    });
  },

  handleTaskStatusChange: (payload: TaskStatusChangedPayload) => {
    const store = get();
    const { taskId, newStatus } = payload;

    // Update local task cache
    store.updateTask(taskId, { status: newStatus });

    // Update execution state based on status
    if (newStatus === 'completed') {
      store.completeTask(taskId);
    } else if (newStatus === 'failed') {
      store.failTask(taskId);
    } else if (newStatus === 'blocked') {
      store.blockTask(taskId);
    } else if (newStatus === 'in-progress') {
      store.setCurrentTask(taskId);
    }
  },

  start: (projectId: string, tasks: KanbanTask[]) => {
    const timestamp = new Date().toISOString();
    set({
      ...initialExecutionState,
      status: 'running',
      projectId,
      tasks,
      totalTasks: tasks.length,
      startedAt: timestamp,
      executionHistory: [
        {
          timestamp,
          event: 'started',
          details: `Started execution with ${tasks.length} tasks`,
        },
      ],
    });
  },

  pause: () => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      status: 'paused',
      pausedAt: timestamp,
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: 'paused', details: 'Execution paused by user' },
      ],
    }));
  },

  resume: () => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      status: 'running',
      pausedAt: null,
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: 'resumed', details: 'Execution resumed by user' },
      ],
    }));
  },

  stop: () => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      status: 'idle',
      currentTaskId: null,
      queuedTaskIds: [],
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: 'stopped', details: 'Execution stopped by user' },
      ],
    }));
  },

  reset: () => {
    set({ ...initialExecutionState, tasks: [] });
  },
}));

// ============================================================================
// Dependency Resolution Algorithm
// ============================================================================

/**
 * Performs topological sort on tasks based on dependencies.
 * Returns tasks in the order they should be executed.
 *
 * Algorithm:
 * 1. Build a dependency graph
 * 2. Calculate in-degree for each task
 * 3. Process tasks with 0 in-degree first
 * 4. Decrement in-degree of dependent tasks
 * 5. Repeat until all tasks are processed
 *
 * @throws Error if circular dependency detected
 */
export function calculateExecutionOrder(tasks: KanbanTask[]): KanbanTask[] {
  if (tasks.length === 0) return [];

  // Build task lookup
  const taskMap = new Map<string, KanbanTask>();
  tasks.forEach((task) => taskMap.set(task.id, task));

  // Calculate in-degree for each task (number of unresolved dependencies)
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>(); // task -> tasks that depend on it

  tasks.forEach((task) => {
    // Only count dependencies that are actually in our task list
    const validDeps = task.dependsOn.filter((depId) => taskMap.has(depId));
    inDegree.set(task.id, validDeps.length);

    // Build adjacency list (reverse direction for processing)
    validDeps.forEach((depId) => {
      if (!adjacencyList.has(depId)) {
        adjacencyList.set(depId, []);
      }
      const depList = adjacencyList.get(depId);
      if (depList) {
        depList.push(task.id);
      }
    });
  });

  // Start with tasks that have no dependencies
  const queue: KanbanTask[] = [];
  tasks.forEach((task) => {
    if (inDegree.get(task.id) === 0) {
      queue.push(task);
    }
  });

  // Sort initial queue by priority
  queue.sort((a, b) => comparePriority(a.priority, b.priority));

  const result: KanbanTask[] = [];
  const processed = new Set<string>();

  while (queue.length > 0) {
    // Take highest priority task from queue
    const current = queue.shift();
    if (!current) break;
    result.push(current);
    processed.add(current.id);

    // Reduce in-degree for tasks that depend on current
    const dependents = adjacencyList.get(current.id) || [];
    dependents.forEach((depTaskId) => {
      const newDegree = (inDegree.get(depTaskId) || 1) - 1;
      inDegree.set(depTaskId, newDegree);

      // If all dependencies are met, add to queue
      if (newDegree === 0) {
        const depTask = taskMap.get(depTaskId);
        if (depTask) {
          queue.push(depTask);
        }
      }
    });

    // Re-sort queue by priority after adding new tasks
    queue.sort((a, b) => comparePriority(a.priority, b.priority));
  }

  // Check for circular dependencies
  if (result.length !== tasks.length) {
    const unprocessed = tasks.filter((t) => !processed.has(t.id));
    throw new Error(
      `Circular dependency detected involving tasks: ${unprocessed.map((t) => t.title).join(', ')}`
    );
  }

  return result;
}

/**
 * Compare task priorities for sorting.
 * Higher priority = should come first (lower return value)
 */
function comparePriority(a: KanbanTask['priority'], b: KanbanTask['priority']): number {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return (priorityOrder[a] ?? 2) - (priorityOrder[b] ?? 2);
}

/**
 * Get tasks that are blocking a given task.
 */
export function getBlockingTasks(taskId: string, tasks: KanbanTask[]): KanbanTask[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return [];

  return task.dependsOn
    .map((depId) => tasks.find((t) => t.id === depId))
    .filter((t): t is KanbanTask => t !== undefined && t.status !== 'completed');
}

/**
 * Get the next task that can be executed.
 * A task is executable if:
 * - Status is 'pending' or 'ready'
 * - All dependencies are completed
 */
export function getNextExecutableTask(tasks: KanbanTask[]): KanbanTask | null {
  // Get execution order
  try {
    const ordered = calculateExecutionOrder(tasks);

    // Find first task that is not completed or in-progress
    return (
      ordered.find((task) => {
        if (task.status === 'completed' || task.status === 'in-progress') return false;
        if (task.status === 'failed' || task.status === 'cancelled') return false;

        // Check if all dependencies are completed
        const blockingTasks = getBlockingTasks(task.id, tasks);
        return blockingTasks.length === 0;
      }) || null
    );
  } catch {
    return null;
  }
}

/**
 * Check if all tasks are completed.
 */
export function areAllTasksComplete(tasks: KanbanTask[]): boolean {
  return tasks.every(
    (t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed'
  );
}

// ============================================================================
// Main Hook
// ============================================================================

export interface UseTaskOrchestrationReturn {
  // State
  executionState: ExecutionState;
  tasks: KanbanTask[];
  canStart: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  isComplete: boolean;

  // Actions
  startExecution: (projectId: string, tasks: KanbanTask[]) => Promise<void>;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  executeNextTask: () => Promise<void>;

  // Utilities
  getNextExecutableTask: () => KanbanTask | null;
  getBlockingTasks: (taskId: string) => KanbanTask[];
  getExecutionOrder: () => KanbanTask[];
  getTaskById: (taskId: string) => KanbanTask | undefined;
}

/**
 * Hook for task orchestration.
 *
 * Manages execution state and provides actions for starting,
 * pausing, resuming, and stopping execution.
 *
 * Usage:
 * ```tsx
 * const {
 *   executionState,
 *   isRunning,
 *   startExecution,
 *   pauseExecution,
 * } = useTaskOrchestration();
 * ```
 */
export function useTaskOrchestration(): UseTaskOrchestrationReturn {
  const store = useExecutionStore();
  const executionLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Extract execution state (without tasks)
  const executionState: ExecutionState = {
    status: store.status,
    projectId: store.projectId,
    currentTaskId: store.currentTaskId,
    queuedTaskIds: store.queuedTaskIds,
    completedTaskIds: store.completedTaskIds,
    failedTaskIds: store.failedTaskIds,
    blockedTaskIds: store.blockedTaskIds,
    startedAt: store.startedAt,
    pausedAt: store.pausedAt,
    completedAt: store.completedAt,
    totalTasks: store.totalTasks,
    completedCount: store.completedCount,
    failedCount: store.failedCount,
    inProgressCount: store.inProgressCount,
    overallProgress: store.overallProgress,
    estimatedRemainingMinutes: store.estimatedRemainingMinutes,
    errors: store.errors,
    executionHistory: store.executionHistory,
  };

  // Derived state
  const canStart = store.tasks.length > 0 && store.status === 'idle';
  const isRunning = store.status === 'running';
  const isPaused = store.status === 'paused';
  const isIdle = store.status === 'idle';
  const isComplete = store.status === 'completed';

  // Subscribe to IPC events for execution updates
  useEffect(() => {
    // Check if nexusAPI is available (Electron context)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.nexusAPI) {
      return;
    }

    const unsubscribers: Array<() => void> = [];

    // Subscribe to execution progress events
    if (typeof window.nexusAPI.onExecutionProgress === 'function') {
      const unsub = window.nexusAPI.onExecutionProgress((progress) => {
        store.updateProgress(progress as ExecutionProgressPayload);
      });
      unsubscribers.push(unsub);
    }

    // Subscribe to task status change events
    // Note: This API method will be added when backend execution is implemented
    const nexusAPIExt = window.nexusAPI as typeof window.nexusAPI & {
      onTaskStatusChanged?: (callback: (payload: unknown) => void) => () => void;
    };
    if (typeof nexusAPIExt.onTaskStatusChanged === 'function') {
      const unsub = nexusAPIExt.onTaskStatusChanged((payload: unknown) => {
        store.handleTaskStatusChange(payload as TaskStatusChangedPayload);
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
    };
  }, [store]);

  // Execute next task in queue
  const executeNextTask = useCallback(async (): Promise<void> => {
    const currentStore = useExecutionStore.getState();
    if (currentStore.status !== 'running') return;

    const nextTask = getNextExecutableTask(currentStore.tasks);
    if (!nextTask) {
      // Check if all tasks are complete
      if (areAllTasksComplete(currentStore.tasks)) {
        const timestamp = new Date().toISOString();
        useExecutionStore.setState({
          status: 'completed',
          completedAt: timestamp,
          executionHistory: [
            ...currentStore.executionHistory,
            { timestamp, event: 'completed', details: 'All tasks completed' },
          ],
        });
      }
      return;
    }

    // Update task status to in-progress
    store.updateTask(nextTask.id, {
      status: 'in-progress' as KanbanTaskStatus,
      startedAt: new Date().toISOString(),
      progress: 0,
    });
    store.setCurrentTask(nextTask.id);

    // Send IPC message to execute task (when backend is ready)
    // Note: executeTask API method will be added when backend execution is implemented
    try {
      const nexusAPIExt = window.nexusAPI as typeof window.nexusAPI & {
        executeTask?: (taskId: string) => Promise<void>;
      };
      if (nexusAPIExt.executeTask) {
        await nexusAPIExt.executeTask(nextTask.id);
      } else {
        // Simulation mode: auto-complete after delay
        // This allows the UI to work without backend
        await simulateTaskExecution(nextTask.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.failTask(nextTask.id, errorMessage);
      store.updateTask(nextTask.id, {
        status: 'failed' as KanbanTaskStatus,
        completedAt: new Date().toISOString(),
      });
    }
  }, [store]);

  // Simulate task execution for demo/testing
  const simulateTaskExecution = useCallback(async (taskId: string): Promise<void> => {
    // Simulate execution time (1-3 seconds)
    const executionTime = 1000 + Math.random() * 2000;

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentStore = useExecutionStore.getState();
      const task = currentStore.tasks.find((t) => t.id === taskId);
      if (task && task.status === 'in-progress') {
        const newProgress = Math.min((task.progress || 0) + 25, 90);
        useExecutionStore.getState().updateTask(taskId, { progress: newProgress });
      }
    }, executionTime / 4);

    await new Promise((resolve) => setTimeout(resolve, executionTime));
    clearInterval(progressInterval);

    // Mark as completed
    const store = useExecutionStore.getState();
    if (store.status === 'running') {
      store.updateTask(taskId, {
        status: 'completed' as KanbanTaskStatus,
        progress: 100,
        completedAt: new Date().toISOString(),
      });
      store.completeTask(taskId);

      // Trigger next task
      setTimeout(() => {
        void executeNextTask();
      }, 100);
    }
  }, [executeNextTask]);

  // Start execution
  const startExecution = useCallback(
    async (projectId: string, tasks: KanbanTask[]): Promise<void> => {
      if (tasks.length === 0) return;

      // Validate no circular dependencies
      try {
        calculateExecutionOrder(tasks);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Dependency validation failed';
        store.addError({
          id: `error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          taskId: null,
          message: errorMessage,
          fatal: true,
        });
        return;
      }

      // Initialize execution
      store.start(projectId, tasks);

      // Start execution loop
      await executeNextTask();
    },
    [store, executeNextTask]
  );

  // Pause execution
  const pauseExecution = useCallback(() => {
    if (executionLoopRef.current) {
      clearTimeout(executionLoopRef.current);
      executionLoopRef.current = null;
    }
    store.pause();
  }, [store]);

  // Resume execution
  const resumeExecution = useCallback(() => {
    store.resume();
    void executeNextTask();
  }, [store, executeNextTask]);

  // Stop execution
  const stopExecution = useCallback(() => {
    if (executionLoopRef.current) {
      clearTimeout(executionLoopRef.current);
      executionLoopRef.current = null;
    }
    store.stop();
  }, [store]);

  // Get blocking tasks for a specific task
  const getBlockingTasksForId = useCallback(
    (taskId: string): KanbanTask[] => {
      return getBlockingTasks(taskId, store.tasks);
    },
    [store.tasks]
  );

  // Get execution order
  const getExecutionOrderFn = useCallback((): KanbanTask[] => {
    try {
      return calculateExecutionOrder(store.tasks);
    } catch {
      return [];
    }
  }, [store.tasks]);

  // Get next executable task
  const getNextExecutableTaskFn = useCallback((): KanbanTask | null => {
    return getNextExecutableTask(store.tasks);
  }, [store.tasks]);

  // Get task by ID
  const getTaskById = useCallback(
    (taskId: string): KanbanTask | undefined => {
      return store.tasks.find((t) => t.id === taskId);
    },
    [store.tasks]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (executionLoopRef.current) {
        clearTimeout(executionLoopRef.current);
      }
    };
  }, []);

  return {
    // State
    executionState,
    tasks: store.tasks,
    canStart,
    isRunning,
    isPaused,
    isIdle,
    isComplete,

    // Actions
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    executeNextTask,

    // Utilities
    getNextExecutableTask: getNextExecutableTaskFn,
    getBlockingTasks: getBlockingTasksForId,
    getExecutionOrder: getExecutionOrderFn,
    getTaskById,
  };
}

// ============================================================================
// Selector Hooks
// ============================================================================

/** Get just the execution status */
export const useExecutionStatus = () => useExecutionStore((s) => s.status);

/** Get overall progress percentage */
export const useExecutionProgress = () => useExecutionStore((s) => s.overallProgress);

/** Get current task being executed */
export const useCurrentTaskId = () => useExecutionStore((s) => s.currentTaskId);

/** Check if execution is running */
export const useIsExecutionRunning = () => useExecutionStore((s) => s.status === 'running');

/** Check if execution is paused */
export const useIsExecutionPaused = () => useExecutionStore((s) => s.status === 'paused');

/** Get completed task count */
export const useCompletedTaskCount = () => useExecutionStore((s) => s.completedCount);

/** Get total task count */
export const useTotalTaskCount = () => useExecutionStore((s) => s.totalTasks);

/** Get execution errors */
export const useExecutionErrors = () => useExecutionStore((s) => s.errors);

/** Get execution history */
export const useExecutionHistory = () => useExecutionStore((s) => s.executionHistory);
