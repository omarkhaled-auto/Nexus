import { O as create } from "./index-xnK5wLuD.js";
const WIP_LIMIT = 3;
function emitEvent(channel, payload) {
  if (window.nexusAPI?.emitEvent) {
    try {
      void window.nexusAPI.emitEvent(channel, payload);
    } catch {
    }
  }
}
const useFeatureStore = create()((set, get) => ({
  features: [],
  selectedFeatureId: null,
  filter: {
    search: "",
    priority: null,
    status: null
  },
  setFeatures: (features) => {
    set({ features });
  },
  addFeature: (feature) => {
    set((state) => ({
      features: [...state.features, feature]
    }));
    emitEvent("feature:created", {
      feature: {
        id: feature.id,
        projectId: "current",
        name: feature.title,
        description: feature.description,
        priority: feature.priority === "critical" ? "must" : feature.priority === "high" ? "should" : feature.priority === "medium" ? "could" : "wont",
        status: mapToEventFeatureStatus(feature.status),
        complexity: feature.complexity === "moderate" ? "simple" : feature.complexity,
        subFeatures: [],
        estimatedTasks: feature.tasks.length,
        completedTasks: 0,
        createdAt: new Date(feature.createdAt),
        updatedAt: new Date(feature.updatedAt)
      },
      projectId: "current"
    });
  },
  updateFeature: (id, update) => {
    set((state) => ({
      features: state.features.map((f) => f.id === id ? { ...f, ...update } : f)
    }));
  },
  removeFeature: (id) => {
    set((state) => ({
      features: state.features.filter((f) => f.id !== id)
    }));
  },
  moveFeature: (id, newStatus) => {
    const state = get();
    const feature = state.features.find((f) => f.id === id);
    if (!feature) return false;
    const oldStatus = feature.status;
    if (newStatus === "in_progress" && oldStatus !== "in_progress") {
      const inProgressCount = state.features.filter((f) => f.status === "in_progress").length;
      if (inProgressCount >= WIP_LIMIT) {
        return false;
      }
    }
    set((state2) => ({
      features: state2.features.map(
        (f) => f.id === id ? {
          ...f,
          status: newStatus,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        } : f
      )
    }));
    emitEvent("feature:status-changed", {
      featureId: id,
      projectId: "current",
      previousStatus: mapToEventFeatureStatus(oldStatus),
      newStatus: mapToEventFeatureStatus(newStatus)
    });
    if (newStatus === "done") {
      emitEvent("feature:completed", {
        featureId: id,
        projectId: "current",
        tasksCompleted: feature.tasks.length,
        duration: 0
        // Would need actual time tracking
      });
    }
    return true;
  },
  reorderFeatures: (columnId, oldIndex, newIndex) => {
    set((state) => {
      const columnFeatures = state.features.filter((f) => f.status === columnId);
      state.features.filter((f) => f.status !== columnId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex >= columnFeatures.length || newIndex >= columnFeatures.length) {
        return state;
      }
      if (oldIndex === newIndex) {
        return state;
      }
      const reordered = [...columnFeatures];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, removed);
      const result = [];
      let columnIdx = 0;
      for (const feature of state.features) {
        if (feature.status === columnId) {
          result.push(reordered[columnIdx]);
          columnIdx++;
        } else {
          result.push(feature);
        }
      }
      return { features: result };
    });
  },
  selectFeature: (id) => {
    set({ selectedFeatureId: id });
  },
  setSearchFilter: (search) => {
    set((state) => ({
      filter: { ...state.filter, search }
    }));
  },
  setPriorityFilter: (priorities) => {
    set((state) => ({
      filter: { ...state.filter, priority: priorities }
    }));
  },
  setStatusFilter: (statuses) => {
    set((state) => ({
      filter: { ...state.filter, status: statuses }
    }));
  },
  clearFilters: () => {
    set({
      filter: {
        search: "",
        priority: null,
        status: null
      }
    });
  },
  reset: () => {
    set({
      features: [],
      selectedFeatureId: null,
      filter: {
        search: "",
        priority: null,
        status: null
      }
    });
  }
}));
function mapToEventFeatureStatus(status) {
  const map = {
    backlog: "backlog",
    planning: "backlog",
    // planning maps to backlog in core types
    in_progress: "in-progress",
    ai_review: "ai-review",
    human_review: "human-review",
    done: "done"
  };
  return map[status];
}
const useFeatureCount = () => useFeatureStore((s) => s.features.length);
export {
  useFeatureCount as a,
  useFeatureStore as u
};
