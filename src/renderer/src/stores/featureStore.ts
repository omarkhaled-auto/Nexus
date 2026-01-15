import { create } from 'zustand'
import type { Feature, FeatureStatus, ColumnCounts } from '../types/feature'

interface FeatureState {
  features: Feature[]

  // Actions
  setFeatures: (features: Feature[]) => void
  addFeature: (feature: Feature) => void
  updateFeature: (id: string, update: Partial<Feature>) => void
  removeFeature: (id: string) => void
  moveFeature: (id: string, newStatus: FeatureStatus, newIndex?: number) => void
  reorderFeatures: (columnId: FeatureStatus, oldIndex: number, newIndex: number) => void
  reset: () => void
}

export const useFeatureStore = create<FeatureState>()((set) => ({
  features: [],

  setFeatures: (features) => set({ features }),

  addFeature: (feature) =>
    set((state) => ({
      features: [...state.features, feature]
    })),

  updateFeature: (id, update) =>
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, ...update } : f))
    })),

  removeFeature: (id) =>
    set((state) => ({
      features: state.features.filter((f) => f.id !== id)
    })),

  moveFeature: (id, newStatus) =>
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
    })),

  reorderFeatures: (columnId, oldIndex, newIndex) =>
    set((state) => {
      // Get features in the target column
      const columnFeatures = state.features.filter((f) => f.status === columnId)
      const otherFeatures = state.features.filter((f) => f.status !== columnId)

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
      const removed = reordered.splice(oldIndex, 1)[0]
      if (!removed) {
        return state
      }
      reordered.splice(newIndex, 0, removed)

      // Reconstruct the features array preserving order
      // We need to maintain the relative order of features from different columns
      const result: Feature[] = []
      let columnIdx = 0

      for (const feature of state.features) {
        if (feature.status === columnId) {
          const reorderedFeature = reordered[columnIdx]
          if (reorderedFeature) {
            result.push(reorderedFeature)
          }
          columnIdx++
        } else {
          result.push(feature)
        }
      }

      return { features: result }
    }),

  reset: () => set({ features: [] })
}))

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
