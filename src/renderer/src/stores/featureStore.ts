import { create } from 'zustand'
import type {
  Feature,
  FeatureStatus,
  ColumnCounts,
  FeaturePriority
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

interface FeatureState {
  features: Feature[]
  selectedFeatureId: string | null
  filter: FeatureFilter

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
  reset: () => void
}

export const useFeatureStore = create<FeatureState>()((set, get) => ({
  features: [],
  selectedFeatureId: null,
  filter: {
    search: '',
    priority: null,
    status: null
  },

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

  reorderFeatures: (columnId, oldIndex, newIndex) =>
    { set((state) => {
      // Get features in the target column
      const columnFeatures = state.features.filter((f) => f.status === columnId)
      const _otherFeatures = state.features.filter((f) => f.status !== columnId)

      // Validate indices
      if (
        oldIndex < 0 ||
        newIndex < 0 ||
        oldIndex >= columnFeatures.length ||
        newIndex >= columnFeatures.length
      ) {
        return state
      }

      // Same index, no change needed
      if (oldIndex === newIndex) {
        return state
      }

      // Perform array move
      const reordered = [...columnFeatures]
      const [removed] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, removed)

      // Reconstruct the features array preserving order
      // We need to maintain the relative order of features from different columns
      const result: Feature[] = []
      let columnIdx = 0

      for (const feature of state.features) {
        if (feature.status === columnId) {
          // We know columnIdx is valid because we're iterating over the same number of items
          result.push(reordered[columnIdx])
          columnIdx++
        } else {
          result.push(feature)
        }
      }

      return { features: result }
    }); },

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

  reset: () =>
    { set({
      features: [],
      selectedFeatureId: null,
      filter: {
        search: '',
        priority: null,
        status: null
      }
    }); }
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
