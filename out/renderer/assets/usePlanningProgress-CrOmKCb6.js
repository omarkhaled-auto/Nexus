import { p as create, r as reactExports } from "./index-B8DMw4WO.js";
const initialPlanningState = {
  status: "idle",
  projectId: null,
  progress: 0,
  currentStep: "",
  tasksCreated: [],
  totalTasksExpected: null,
  featuresIdentified: [],
  startedAt: null,
  completedAt: null,
  error: null
};
const usePlanningStore = create()((set) => ({
  ...initialPlanningState,
  startPlanning: (projectId) => {
    set({
      ...initialPlanningState,
      status: "analyzing",
      projectId,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currentStep: "Analyzing requirements..."
    });
  },
  updateProgress: (payload) => {
    set((state) => ({
      ...state,
      status: payload.status,
      progress: payload.progress,
      currentStep: payload.currentStep,
      totalTasksExpected: payload.totalExpected
    }));
  },
  addTask: (task) => {
    set((state) => ({
      ...state,
      tasksCreated: [...state.tasksCreated, task]
    }));
  },
  addFeature: (feature) => {
    set((state) => ({
      ...state,
      featuresIdentified: [...state.featuresIdentified, feature]
    }));
  },
  setStatus: (status) => {
    set((state) => ({
      ...state,
      status,
      currentStep: getStepMessageForStatus(status)
    }));
  },
  setError: (error) => {
    set((state) => ({
      ...state,
      status: "error",
      error,
      currentStep: "An error occurred"
    }));
  },
  complete: () => {
    set((state) => ({
      ...state,
      status: "complete",
      progress: 100,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currentStep: "Planning complete!"
    }));
  },
  reset: () => {
    set(initialPlanningState);
  }
}));
function getStepMessageForStatus(status) {
  switch (status) {
    case "idle":
      return "";
    case "analyzing":
      return "Analyzing requirements...";
    case "decomposing":
      return "Breaking down into features...";
    case "creating-tasks":
      return "Creating tasks...";
    case "validating":
      return "Validating dependencies...";
    case "complete":
      return "Planning complete!";
    case "error":
      return "An error occurred";
    default:
      return "";
  }
}
function usePlanningProgress() {
  const store = usePlanningStore();
  reactExports.useEffect(() => {
    if (!window.nexusAPI) {
      return;
    }
    const unsubProgress = window.nexusAPI.onPlanningProgress?.((data) => {
      console.log("[usePlanningProgress] Received progress event:", data);
      store.updateProgress({
        projectId: data.projectId,
        status: data.status,
        progress: data.progress,
        currentStep: data.currentStep,
        tasksCreated: data.tasksCreated,
        totalExpected: data.totalExpected
      });
    });
    const unsubCompleted = window.nexusAPI.onPlanningCompleted?.((data) => {
      console.log("[usePlanningProgress] Received completed event:", data);
      store.updateProgress({
        projectId: data.projectId,
        status: "complete",
        progress: 100,
        currentStep: "Planning complete!",
        tasksCreated: data.taskCount,
        totalExpected: data.taskCount
      });
      store.complete();
    });
    const unsubError = window.nexusAPI.onPlanningError?.((data) => {
      console.log("[usePlanningProgress] Received error event:", data);
      store.setError(data.error);
    });
    const unsubNexus = window.nexusAPI.onNexusEvent?.((event) => {
      if (event.type === "planning:started") {
        const payload = event.payload;
        console.log("[usePlanningProgress] Planning started:", payload);
        store.startPlanning(payload.projectId);
      }
    });
    return () => {
      unsubProgress?.();
      unsubCompleted?.();
      unsubError?.();
      unsubNexus?.();
    };
  }, [store]);
  const estimatedTimeRemaining = reactExports.useCallback(() => {
    if (store.status === "complete" || store.status === "error" || store.status === "idle") {
      return null;
    }
    if (store.progress === 0) {
      return "Calculating...";
    }
    const avgTaskTime = 5;
    const remainingTasks = (store.totalTasksExpected ?? 10) - store.tasksCreated.length;
    const remainingSeconds = remainingTasks * avgTaskTime;
    if (remainingSeconds < 60) {
      return `About ${Math.max(remainingSeconds, 1)} seconds remaining`;
    }
    const minutes = Math.ceil(remainingSeconds / 60);
    return `About ${minutes} minute${minutes > 1 ? "s" : ""} remaining`;
  }, [store.status, store.progress, store.totalTasksExpected, store.tasksCreated.length]);
  const startPlanning = reactExports.useCallback(
    async (projectId) => {
      store.startPlanning(projectId);
      if (window.nexusAPI?.planning?.start) {
        try {
          console.log("[usePlanningProgress] Starting planning for project:", projectId);
          const result = await window.nexusAPI.planning.start(projectId);
          console.log("[usePlanningProgress] Planning start result:", result);
          if (!result.success && result.error) {
            store.setError(result.error);
          }
        } catch (error) {
          console.error("[usePlanningProgress] Failed to start planning:", error);
          store.setError(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [store]
  );
  const retry = reactExports.useCallback(() => {
    if (store.projectId) {
      startPlanning(store.projectId);
    }
  }, [store.projectId, startPlanning]);
  return {
    // State
    status: store.status,
    progress: store.progress,
    currentStep: store.currentStep,
    tasksCreated: store.tasksCreated,
    featuresIdentified: store.featuresIdentified,
    totalTasksExpected: store.totalTasksExpected,
    error: store.error,
    isComplete: store.status === "complete",
    isError: store.status === "error",
    isLoading: ["analyzing", "decomposing", "creating-tasks", "validating"].includes(store.status),
    // Derived
    taskCount: store.tasksCreated.length,
    featureCount: store.featuresIdentified.length,
    estimatedTimeRemaining: estimatedTimeRemaining(),
    // Actions
    startPlanning,
    retry,
    reset: store.reset
  };
}
export {
  usePlanningProgress as u
};
