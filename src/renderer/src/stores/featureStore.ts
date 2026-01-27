import { create } from 'zustand'
import type {
  Feature,
  FeatureStatus,
  ColumnCounts,
  FeaturePriority,
  FeatureTask
} from '../types/feature'

// WIP Limit for in_progress column
const WIP_LIMIT = 3

/**
 * Safely emit event via IPC (only in Electron context)
 * Uses window.nexusAPI to communicate with main process EventBus
 */
function emitEvent(channel: string, payload: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
  if (window.nexusAPI?.emitEvent) {
    try {
      void window.nexusAPI.emitEvent(channel, payload)
    } catch {
      // Silently ignore errors in event emission (e.g., during tests)
    }
  }
}

interface FeatureFilter {
  search: string
  priority: FeaturePriority[] | null
  status: FeatureStatus[] | null
}

/**
 * Map backend status to frontend FeatureStatus
 */
function mapBackendStatus(status: string): FeatureStatus {
  const statusMap: Record<string, FeatureStatus> = {
    'backlog': 'backlog',
    'planning': 'planning',
    'in-progress': 'in_progress',
    'in_progress': 'in_progress',
    'ai-review': 'ai_review',
    'ai_review': 'ai_review',
    'human-review': 'human_review',
    'human_review': 'human_review',
    'done': 'done',
    'completed': 'done',
    'pending': 'backlog'
  };
  return statusMap[status] ?? 'backlog';
}

/**
 * Map backend priority to frontend FeaturePriority
 */
function mapBackendPriority(priority: string): FeaturePriority {
  const priorityMap: Record<string, FeaturePriority> = {
    'must': 'critical',
    'should': 'high',
    'could': 'medium',
    'wont': 'low',
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };
  return priorityMap[priority] ?? 'medium';
}

interface FeatureState {
  features: Feature[]
  selectedFeatureId: string | null
  filter: FeatureFilter
  isLoading: boolean

  // Actions
  setFeatures: (features: Feature[]) => void
  addFeature: (feature: Feature) => void
  updateFeature: (id: string, update: Partial<Feature>) => void
  removeFeature: (id: string) => void
  moveFeature: (id: string, newStatus: FeatureStatus, newIndex?: number) => boolean
  reorderFeatures: (columnId: FeatureStatus, oldIndex: number, newIndex: number) => void
  selectFeature: (id: string | null) => void
  setSearchFilter: (search: string) => void
  setPriorityFilter: (priorities: FeaturePriority[] | null) => void
  setStatusFilter: (statuses: FeatureStatus[] | null) => void
  clearFilters: () => void
  loadFeatures: (projectId?: string) => Promise<void>
  reset: () => void
  // Phase 2 Workflow Fix: Task-triggered feature updates
  updateFeatureFromTaskCompletion: (featureId: string) => void
  updateFeatureStatusFromTasks: (featureId: string) => void
}

export const useFeatureStore = create<FeatureState>()((set, get) => ({
  features: [],
  selectedFeatureId: null,
  filter: {
    search: '',
    priority: null,
    status: null
  },
  isLoading: false,

  setFeatures: (features) => { set({ features }); },

  addFeature: (feature) => {
    set((state) => ({
      features: [...state.features, feature]
    }))
    // Emit FEATURE_CREATED event via IPC
    emitEvent('feature:created', {
      feature: {
        id: feature.id,
        projectId: 'current',
        name: feature.title,
        description: feature.description,
        priority: feature.priority === 'critical' ? 'must' : feature.priority === 'high' ? 'should' : feature.priority === 'medium' ? 'could' : 'wont',
        status: mapToEventFeatureStatus(feature.status),
        complexity: feature.complexity === 'moderate' ? 'simple' : feature.complexity,
        subFeatures: [],
        estimatedTasks: feature.tasks.length,
        completedTasks: 0,
        createdAt: new Date(feature.createdAt),
        updatedAt: new Date(feature.updatedAt)
      },
      projectId: 'current'
    })
  },

  updateFeature: (id, update) =>
    { set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, ...update } : f))
    })); },

  removeFeature: (id) =>
    { set((state) => ({
      features: state.features.filter((f) => f.id !== id)
    })); },

  moveFeature: (id, newStatus) => {
    const state = get()
    const feature = state.features.find((f) => f.id === id)
    if (!feature) return false

    const oldStatus = feature.status

    // Skip if status hasn't changed
    if (oldStatus === newStatus) return true

    // WIP Limit enforcement: reject move to in_progress if at capacity
    if (newStatus === 'in_progress' && oldStatus !== 'in_progress') {
      const inProgressCount = state.features.filter((f) => f.status === 'in_progress').length
      if (inProgressCount >= WIP_LIMIT) {
        return false // Reject move - WIP limit exceeded
      }
    }

    // Update the feature
    set((state) => ({
      features: state.features.map((f) =>
        f.id === id
          ? {
              ...f,
              status: newStatus,
              updatedAt: new Date().toISOString()
            }
          : f
      )
    }))

    // Persist to backend via IPC
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
    if (window.nexusAPI?.updateFeature) {
      window.nexusAPI.updateFeature(id, { status: newStatus })
        .catch((error: unknown) => {
          console.error('Failed to persist feature status change:', error)
          // Revert the optimistic update on failure
          set((state) => ({
            features: state.features.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: oldStatus,
                    updatedAt: new Date().toISOString()
                  }
                : f
            )
          }))
        })
    }

    // Emit events via IPC
    emitEvent('feature:status-changed', {
      featureId: id,
      projectId: 'current',
      previousStatus: mapToEventFeatureStatus(oldStatus),
      newStatus: mapToEventFeatureStatus(newStatus)
    })

    // Emit FEATURE_COMPLETED when moved to done
    if (newStatus === 'done') {
      emitEvent('feature:completed', {
        featureId: id,
        projectId: 'current',
        tasksCompleted: feature.tasks.length,
        duration: 0 // Would need actual time tracking
      })
    }

    return true
  },

  reorderFeatures: (columnId, oldIndex, newIndex) => {
    // FIX #2: Persist reorder to backend
    const state = get()

    // Get features in the target column
    const columnFeatures = state.features.filter((f) => f.status === columnId)

    // Validate indices
    if (
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= columnFeatures.length ||
      newIndex >= columnFeatures.length
    ) {
      return
    }

    // Same index, no change needed
    if (oldIndex === newIndex) {
      return
    }

    // Perform array move
    const reordered = [...columnFeatures]
    const [removed] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, removed)

    // Reconstruct the features array preserving order
    const result: Feature[] = []
    let columnIdx = 0

    for (const feature of state.features) {
      if (feature.status === columnId) {
        result.push(reordered[columnIdx])
        columnIdx++
      } else {
        result.push(feature)
      }
    }

    // Update local state optimistically
    set({ features: result })

    // Persist order to backend - update each feature with its new orderIndex
    const persistOrder = async (): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
      if (!window.nexusAPI?.updateFeature) return

      // Update each reordered feature with its new orderIndex
      for (let i = 0; i < reordered.length; i++) {
        const feature = reordered[i]
        try {
          await window.nexusAPI.updateFeature(feature.id, { orderIndex: i })
        } catch (err) {
          console.error('[FeatureStore] Failed to persist order for feature:', feature.id, err)
        }
      }
    }

    void persistOrder()
  },

  selectFeature: (id) => { set({ selectedFeatureId: id }); },

  setSearchFilter: (search) =>
    { set((state) => ({
      filter: { ...state.filter, search }
    })); },

  setPriorityFilter: (priorities) =>
    { set((state) => ({
      filter: { ...state.filter, priority: priorities }
    })); },

  setStatusFilter: (statuses) =>
    { set((state) => ({
      filter: { ...state.filter, status: statuses }
    })); },

  clearFilters: () =>
    { set({
      filter: {
        search: '',
        priority: null,
        status: null
      }
    }); },

  loadFeatures: async (projectId?: string) => {
    // Load features from backend via IPC
    // Fix #7: Accept optional projectId to filter features by project
    set({ isLoading: true });
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
      if (window.nexusAPI?.getFeatures) {
        const rawFeatures = await window.nexusAPI.getFeatures(projectId);
        // Map backend features to frontend Feature type
        const features: Feature[] = rawFeatures.map((f: unknown) => {
          const raw = f as Record<string, unknown>;
          // Map tasks - backend may return string[] of IDs or FeatureTask[]
          const rawTasks = raw.tasks as unknown[] | undefined;
          const tasks: FeatureTask[] = Array.isArray(rawTasks)
            ? rawTasks.map((t: unknown, idx: number) => {
                if (typeof t === 'string') {
                  // Backend returned task ID string, create minimal task
                  return {
                    id: t,
                    title: `Task ${idx + 1}`,
                    status: 'pending' as const
                  };
                }
                // Backend returned full task object
                const taskObj = t as Record<string, unknown>;
                const taskId = typeof taskObj.id === 'string' ? taskObj.id : `task-${idx}`;
                const taskTitle = (typeof taskObj.title === 'string' ? taskObj.title : null) ||
                                  (typeof taskObj.name === 'string' ? taskObj.name : `Task ${idx + 1}`);
                return {
                  id: taskId,
                  title: taskTitle,
                  status: (typeof taskObj.status === 'string' ? taskObj.status : 'pending') as FeatureTask['status'],
                  estimatedMinutes: taskObj.estimatedMinutes as number | undefined
                };
              })
            : [];
          const rawId = typeof raw.id === 'string' ? raw.id : '';
          const rawName = typeof raw.name === 'string' ? raw.name : '';
          const rawTitle = typeof raw.title === 'string' ? raw.title : '';
          const rawDesc = typeof raw.description === 'string' ? raw.description : '';
          const rawStatus = typeof raw.status === 'string' ? raw.status : 'backlog';
          const rawPriority = typeof raw.priority === 'string' ? raw.priority : 'medium';
          const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
          const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString();
            const complexity = raw.complexity as 'simple' | 'moderate' | 'complex' | undefined;
            return {
              id: rawId,
              title: rawName || rawTitle,
              description: rawDesc,
              status: mapBackendStatus(rawStatus),
              priority: mapBackendPriority(rawPriority),
              complexity: complexity ?? 'moderate',
              tasks,
              createdAt: rawCreatedAt,
              updatedAt: rawUpdatedAt
            };
        });
        console.log('[featureStore] Loaded features from backend:', features.length, projectId ? `(filtered by ${projectId})` : '(all)');
        set({ features, isLoading: false });
      } else {
        console.warn('[featureStore] nexusAPI.getFeatures not available');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('[featureStore] Failed to load features:', error);
      set({ isLoading: false });
    }
  },

  reset: () =>
    { set({
      features: [],
      selectedFeatureId: null,
      filter: {
        search: '',
        priority: null,
        status: null
      },
      isLoading: false
    }); },

  /**
   * Phase 2 Workflow Fix: Update feature when a task is completed
   * Triggers re-render with updated timestamp
   */
  updateFeatureFromTaskCompletion: (featureId: string) => {
    set((state) => {
      const features = state.features.map((f) => {
        if (f.id === featureId) {
          return {
            ...f,
            updatedAt: new Date().toISOString()
          }
        }
        return f
      })
      return { features }
    })
    console.log(`[featureStore] Updated feature ${featureId} from task completion`)
  },

  /**
   * Phase 2 Workflow Fix: Update feature status based on task statuses
   * Called after task status changes to sync feature status
   */
  updateFeatureStatusFromTasks: (featureId: string) => {
    set((state) => {
      const features = state.features.map((f) => {
        if (f.id === featureId) {
          const tasks = f.tasks
          const allCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed')
          const anyInProgress = tasks.some(t => t.status === 'in_progress')
          const anyFailed = tasks.some(t => t.status === 'failed')

          let newStatus: FeatureStatus = f.status

          if (allCompleted) {
            newStatus = 'done'
          } else if (anyFailed) {
            newStatus = 'human_review' // Needs attention
          } else if (anyInProgress) {
            newStatus = 'in_progress'
          }

          if (newStatus !== f.status) {
            console.log(`[featureStore] Feature ${featureId} status: ${f.status} -> ${newStatus}`)
            return {
              ...f,
              status: newStatus,
              updatedAt: new Date().toISOString()
            }
          }
        }
        return f
      })
      return { features }
    })
  }
}))

/**
 * Map renderer FeatureStatus to core FeatureStatus for EventBus payloads.
 * The renderer uses snake_case (in_progress), core uses kebab-case (in-progress).
 */
function mapToEventFeatureStatus(
  status: FeatureStatus
): 'backlog' | 'in-progress' | 'ai-review' | 'human-review' | 'done' {
  const map: Record<FeatureStatus, 'backlog' | 'in-progress' | 'ai-review' | 'human-review' | 'done'> = {
    backlog: 'backlog',
    planning: 'backlog', // planning maps to backlog in core types
    in_progress: 'in-progress',
    ai_review: 'ai-review',
    human_review: 'human-review',
    done: 'done'
  }
  return map[status]
}

// Selector hooks for optimized re-renders
export const useFeatures = () => useFeatureStore((s) => s.features)

/** Returns features filtered by status */
export const useFeaturesByStatus = (status: FeatureStatus) =>
  useFeatureStore((s) => s.features.filter((f) => f.status === status))

/** Returns a single feature by ID or undefined */
export const useFeature = (id: string) =>
  useFeatureStore((s) => s.features.find((f) => f.id === id))

/** Returns total feature count */
export const useFeatureCount = () => useFeatureStore((s) => s.features.length)

/** Returns count per column */
export const useColumnCounts = (): ColumnCounts =>
  useFeatureStore((s) => ({
    backlog: s.features.filter((f) => f.status === 'backlog').length,
    planning: s.features.filter((f) => f.status === 'planning').length,
    in_progress: s.features.filter((f) => f.status === 'in_progress').length,
    ai_review: s.features.filter((f) => f.status === 'ai_review').length,
    human_review: s.features.filter((f) => f.status === 'human_review').length,
    done: s.features.filter((f) => f.status === 'done').length
  }))

/** Returns the currently selected feature ID */
export const useSelectedFeatureId = () => useFeatureStore((s) => s.selectedFeatureId)

/** Returns the current filter state */
export const useFeatureFilter = () => useFeatureStore((s) => s.filter)

/** Returns features filtered by current filter state */
export const useFilteredFeatures = () =>
  useFeatureStore((s) => {
    let filtered = s.features

    // Filter by search (title + description)
    if (s.filter.search) {
      const searchLower = s.filter.search.toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      )
    }

    // Filter by priority
    const priorityFilter = s.filter.priority
    if (priorityFilter && priorityFilter.length > 0) {
      filtered = filtered.filter((f) => priorityFilter.includes(f.priority))
    }

    // Filter by status
    const statusFilter = s.filter.status
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter((f) => statusFilter.includes(f.status))
    }

    return filtered
  })

/** Export WIP_LIMIT for use in other components */
export { WIP_LIMIT }
