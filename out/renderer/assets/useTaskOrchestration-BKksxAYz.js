import { c as createLucideIcon, p as create, r as reactExports } from "./index-BAupzAA3.js";
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
const Lock = createLucideIcon("lock", __iconNode$3);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
const Pencil = createLucideIcon("pencil", __iconNode$2);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2", key: "125lnx" }],
  ["path", { d: "M8.5 2h7", key: "csnxdl" }],
  ["path", { d: "M14.5 16h-5", key: "1ox875" }]
];
const TestTube = createLucideIcon("test-tube", __iconNode$1);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
];
const User = createLucideIcon("user", __iconNode);
const initialExecutionState = {
  status: "idle",
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
  executionHistory: []
};
const useExecutionStore = create()((set, get) => ({
  ...initialExecutionState,
  tasks: [],
  setTasks: (tasks) => {
    set({ tasks, totalTasks: tasks.length });
  },
  updateTask: (taskId, update) => {
    set((state) => ({
      tasks: state.tasks.map(
        (t) => t.id === taskId ? { ...t, ...update, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } : t
      )
    }));
  },
  setStatus: (status) => {
    set({ status });
  },
  setProjectId: (projectId) => {
    set({ projectId });
  },
  setCurrentTask: (taskId) => {
    set(() => ({
      currentTaskId: taskId,
      inProgressCount: taskId ? 1 : 0
    }));
  },
  queueTask: (taskId) => {
    set((state) => {
      if (state.queuedTaskIds.includes(taskId)) return state;
      return { queuedTaskIds: [...state.queuedTaskIds, taskId] };
    });
  },
  dequeueTask: (taskId) => {
    set((state) => ({
      queuedTaskIds: state.queuedTaskIds.filter((id) => id !== taskId)
    }));
  },
  completeTask: (taskId) => {
    set((state) => {
      const newCompletedIds = state.completedTaskIds.includes(taskId) ? state.completedTaskIds : [...state.completedTaskIds, taskId];
      const completedCount = newCompletedIds.length;
      const overallProgress = state.totalTasks > 0 ? Math.round(completedCount / state.totalTasks * 100) : 0;
      return {
        completedTaskIds: newCompletedIds,
        completedCount,
        overallProgress,
        currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
        inProgressCount: state.currentTaskId === taskId ? 0 : state.inProgressCount
      };
    });
  },
  failTask: (taskId, errorMessage) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    set((state) => {
      const newFailedIds = state.failedTaskIds.includes(taskId) ? state.failedTaskIds : [...state.failedTaskIds, taskId];
      const newErrors = errorMessage ? [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          timestamp,
          taskId,
          message: errorMessage,
          fatal: false
        }
      ] : state.errors;
      return {
        failedTaskIds: newFailedIds,
        failedCount: newFailedIds.length,
        errors: newErrors,
        currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
        inProgressCount: state.currentTaskId === taskId ? 0 : state.inProgressCount
      };
    });
  },
  blockTask: (taskId) => {
    set((state) => {
      if (state.blockedTaskIds.includes(taskId)) return state;
      return { blockedTaskIds: [...state.blockedTaskIds, taskId] };
    });
  },
  unblockTask: (taskId) => {
    set((state) => ({
      blockedTaskIds: state.blockedTaskIds.filter((id) => id !== taskId)
    }));
  },
  addError: (error) => {
    set((state) => ({
      errors: [...state.errors, error]
    }));
  },
  addHistoryEntry: (entry) => {
    set((state) => ({
      executionHistory: [...state.executionHistory, entry]
    }));
  },
  updateProgress: (payload) => {
    set({
      completedCount: payload.completedCount,
      totalTasks: payload.totalCount,
      overallProgress: payload.overallProgress,
      currentTaskId: payload.currentTaskId,
      status: payload.status
    });
  },
  handleTaskStatusChange: (payload) => {
    const store = get();
    const { taskId, newStatus } = payload;
    store.updateTask(taskId, { status: newStatus });
    if (newStatus === "completed") {
      store.completeTask(taskId);
    } else if (newStatus === "failed") {
      store.failTask(taskId);
    } else if (newStatus === "blocked") {
      store.blockTask(taskId);
    } else if (newStatus === "in-progress") {
      store.setCurrentTask(taskId);
    }
  },
  start: (projectId, tasks) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    set({
      ...initialExecutionState,
      status: "running",
      projectId,
      tasks,
      totalTasks: tasks.length,
      startedAt: timestamp,
      executionHistory: [
        {
          timestamp,
          event: "started",
          details: `Started execution with ${tasks.length} tasks`
        }
      ]
    });
  },
  pause: () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    set((state) => ({
      status: "paused",
      pausedAt: timestamp,
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: "paused", details: "Execution paused by user" }
      ]
    }));
  },
  resume: () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    set((state) => ({
      status: "running",
      pausedAt: null,
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: "resumed", details: "Execution resumed by user" }
      ]
    }));
  },
  stop: () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    set((state) => ({
      status: "idle",
      currentTaskId: null,
      queuedTaskIds: [],
      executionHistory: [
        ...state.executionHistory,
        { timestamp, event: "stopped", details: "Execution stopped by user" }
      ]
    }));
  },
  reset: () => {
    set({ ...initialExecutionState, tasks: [] });
  }
}));
function calculateExecutionOrder(tasks) {
  if (tasks.length === 0) return [];
  const taskMap = /* @__PURE__ */ new Map();
  tasks.forEach((task) => taskMap.set(task.id, task));
  const inDegree = /* @__PURE__ */ new Map();
  const adjacencyList = /* @__PURE__ */ new Map();
  tasks.forEach((task) => {
    const validDeps = task.dependsOn.filter((depId) => taskMap.has(depId));
    inDegree.set(task.id, validDeps.length);
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
  const queue = [];
  tasks.forEach((task) => {
    if (inDegree.get(task.id) === 0) {
      queue.push(task);
    }
  });
  queue.sort((a, b) => comparePriority(a.priority, b.priority));
  const result = [];
  const processed = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    result.push(current);
    processed.add(current.id);
    const dependents = adjacencyList.get(current.id) || [];
    dependents.forEach((depTaskId) => {
      const newDegree = (inDegree.get(depTaskId) || 1) - 1;
      inDegree.set(depTaskId, newDegree);
      if (newDegree === 0) {
        const depTask = taskMap.get(depTaskId);
        if (depTask) {
          queue.push(depTask);
        }
      }
    });
    queue.sort((a, b) => comparePriority(a.priority, b.priority));
  }
  if (result.length !== tasks.length) {
    const unprocessed = tasks.filter((t) => !processed.has(t.id));
    throw new Error(
      `Circular dependency detected involving tasks: ${unprocessed.map((t) => t.title).join(", ")}`
    );
  }
  return result;
}
function comparePriority(a, b) {
  const priorityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  return (priorityOrder[a] ?? 2) - (priorityOrder[b] ?? 2);
}
function getBlockingTasks(taskId, tasks) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return task.dependsOn.map((depId) => tasks.find((t) => t.id === depId)).filter((t) => t !== void 0 && t.status !== "completed");
}
function getNextExecutableTask(tasks) {
  try {
    const ordered = calculateExecutionOrder(tasks);
    return ordered.find((task) => {
      if (task.status === "completed" || task.status === "in-progress") return false;
      if (task.status === "failed" || task.status === "cancelled") return false;
      const blockingTasks = getBlockingTasks(task.id, tasks);
      return blockingTasks.length === 0;
    }) || null;
  } catch {
    return null;
  }
}
function areAllTasksComplete(tasks) {
  return tasks.every(
    (t) => t.status === "completed" || t.status === "cancelled" || t.status === "failed"
  );
}
function useTaskOrchestration() {
  const store = useExecutionStore();
  const executionLoopRef = reactExports.useRef(null);
  const executionState = {
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
    executionHistory: store.executionHistory
  };
  const canStart = store.tasks.length > 0 && store.status === "idle";
  const isRunning = store.status === "running";
  const isPaused = store.status === "paused";
  const isIdle = store.status === "idle";
  const isComplete = store.status === "completed";
  reactExports.useEffect(() => {
    if (!window.nexusAPI) {
      return;
    }
    const unsubscribers = [];
    if (typeof window.nexusAPI.onExecutionProgress === "function") {
      const unsub = window.nexusAPI.onExecutionProgress((progress) => {
        store.updateProgress(progress);
      });
      unsubscribers.push(unsub);
    }
    const nexusAPIExt = window.nexusAPI;
    if (typeof nexusAPIExt.onTaskStatusChanged === "function") {
      const unsub = nexusAPIExt.onTaskStatusChanged((payload) => {
        store.handleTaskStatusChange(payload);
      });
      unsubscribers.push(unsub);
    }
    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
        }
      });
    };
  }, [store]);
  const executeNextTask = reactExports.useCallback(async () => {
    const currentStore = useExecutionStore.getState();
    if (currentStore.status !== "running") return;
    const nextTask = getNextExecutableTask(currentStore.tasks);
    if (!nextTask) {
      if (areAllTasksComplete(currentStore.tasks)) {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        useExecutionStore.setState({
          status: "completed",
          completedAt: timestamp,
          executionHistory: [
            ...currentStore.executionHistory,
            { timestamp, event: "completed", details: "All tasks completed" }
          ]
        });
      }
      return;
    }
    store.updateTask(nextTask.id, {
      status: "in-progress",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      progress: 0
    });
    store.setCurrentTask(nextTask.id);
    try {
      const nexusAPIExt = window.nexusAPI;
      if (nexusAPIExt.executeTask) {
        await nexusAPIExt.executeTask(nextTask.id);
      } else {
        await simulateTaskExecution(nextTask.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      store.failTask(nextTask.id, errorMessage);
      store.updateTask(nextTask.id, {
        status: "failed",
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }, [store]);
  const simulateTaskExecution = reactExports.useCallback(async (taskId) => {
    const executionTime = 1e3 + Math.random() * 2e3;
    const progressInterval = setInterval(() => {
      const currentStore = useExecutionStore.getState();
      const task = currentStore.tasks.find((t) => t.id === taskId);
      if (task && task.status === "in-progress") {
        const newProgress = Math.min((task.progress || 0) + 25, 90);
        useExecutionStore.getState().updateTask(taskId, { progress: newProgress });
      }
    }, executionTime / 4);
    await new Promise((resolve) => setTimeout(resolve, executionTime));
    clearInterval(progressInterval);
    const store2 = useExecutionStore.getState();
    if (store2.status === "running") {
      store2.updateTask(taskId, {
        status: "completed",
        progress: 100,
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      store2.completeTask(taskId);
      setTimeout(() => {
        void executeNextTask();
      }, 100);
    }
  }, [executeNextTask]);
  const startExecution = reactExports.useCallback(
    async (projectId, tasks) => {
      if (tasks.length === 0) return;
      try {
        calculateExecutionOrder(tasks);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Dependency validation failed";
        store.addError({
          id: `error-${Date.now()}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          taskId: null,
          message: errorMessage,
          fatal: true
        });
        return;
      }
      store.start(projectId, tasks);
      if (window.nexusAPI?.startExecution) {
        try {
          const result = await window.nexusAPI.startExecution(projectId);
          if (!result.success) {
            console.error("[useTaskOrchestration] Backend execution failed:", result.error);
            store.addError({
              id: `error-${Date.now()}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              taskId: null,
              message: result.error || "Failed to start execution",
              fatal: true
            });
            return;
          }
          console.log("[useTaskOrchestration] Backend execution started successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to start execution";
          console.error("[useTaskOrchestration] Backend execution error:", error);
          store.addError({
            id: `error-${Date.now()}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            taskId: null,
            message: errorMessage,
            fatal: true
          });
          return;
        }
      } else {
        console.warn("[useTaskOrchestration] No backend available, using simulation mode");
        await executeNextTask();
      }
    },
    [store, executeNextTask]
  );
  const pauseExecution = reactExports.useCallback(() => {
    if (executionLoopRef.current) {
      clearTimeout(executionLoopRef.current);
      executionLoopRef.current = null;
    }
    store.pause();
  }, [store]);
  const resumeExecution = reactExports.useCallback(() => {
    store.resume();
    void executeNextTask();
  }, [store, executeNextTask]);
  const stopExecution = reactExports.useCallback(() => {
    if (executionLoopRef.current) {
      clearTimeout(executionLoopRef.current);
      executionLoopRef.current = null;
    }
    store.stop();
  }, [store]);
  const getBlockingTasksForId = reactExports.useCallback(
    (taskId) => {
      return getBlockingTasks(taskId, store.tasks);
    },
    [store.tasks]
  );
  const getExecutionOrderFn = reactExports.useCallback(() => {
    try {
      return calculateExecutionOrder(store.tasks);
    } catch {
      return [];
    }
  }, [store.tasks]);
  const getNextExecutableTaskFn = reactExports.useCallback(() => {
    return getNextExecutableTask(store.tasks);
  }, [store.tasks]);
  const getTaskById = reactExports.useCallback(
    (taskId) => {
      return store.tasks.find((t) => t.id === taskId);
    },
    [store.tasks]
  );
  reactExports.useEffect(() => {
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
    getTaskById
  };
}
export {
  Lock as L,
  Pencil as P,
  TestTube as T,
  User as U,
  useTaskOrchestration as a,
  useExecutionStore as u
};
