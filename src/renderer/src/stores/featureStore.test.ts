import { describe, it, expect, beforeEach } from 'vitest'
import {
  useFeatureStore,
  useFeatures,
  useFeaturesByStatus,
  useFeature,
  useFeatureCount,
  useColumnCounts
} from './featureStore'
import type { Feature, FeatureStatus } from '../types/feature'

// Helper to create a test feature
function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date().toISOString()
  return {
    id: `f-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test Feature',
    description: 'A test feature description',
    status: 'backlog',
    complexity: 'moderate',
    progress: 0,
    assignedAgent: null,
    tasks: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('featureStore', () => {
  beforeEach(() => {
    useFeatureStore.getState().reset()
  })

  describe('initial state', () => {
    it('should initialize with empty features array', () => {
      expect(useFeatureStore.getState().features).toEqual([])
    })
  })

  describe('setFeatures', () => {
    it('should bulk set features array', () => {
      const features = [
        createTestFeature({ id: 'f1', title: 'Feature 1' }),
        createTestFeature({ id: 'f2', title: 'Feature 2' })
      ]
      useFeatureStore.getState().setFeatures(features)
      expect(useFeatureStore.getState().features).toHaveLength(2)
      expect(useFeatureStore.getState().features[0].id).toBe('f1')
      expect(useFeatureStore.getState().features[1].id).toBe('f2')
    })

    it('should replace existing features', () => {
      const initial = [createTestFeature({ id: 'f1' })]
      const replacement = [createTestFeature({ id: 'f2' })]
      useFeatureStore.getState().setFeatures(initial)
      useFeatureStore.getState().setFeatures(replacement)
      expect(useFeatureStore.getState().features).toHaveLength(1)
      expect(useFeatureStore.getState().features[0].id).toBe('f2')
    })
  })

  describe('addFeature', () => {
    it('should add a feature to the array', () => {
      const feature = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features).toContainEqual(feature)
    })

    it('should add multiple features sequentially', () => {
      const f1 = createTestFeature({ id: 'f1' })
      const f2 = createTestFeature({ id: 'f2' })
      useFeatureStore.getState().addFeature(f1)
      useFeatureStore.getState().addFeature(f2)
      expect(useFeatureStore.getState().features).toHaveLength(2)
    })

    it('should preserve existing features when adding new ones', () => {
      const f1 = createTestFeature({ id: 'f1' })
      const f2 = createTestFeature({ id: 'f2' })
      useFeatureStore.getState().addFeature(f1)
      useFeatureStore.getState().addFeature(f2)
      expect(useFeatureStore.getState().features[0].id).toBe('f1')
    })
  })

  describe('updateFeature', () => {
    it('should update a feature by id with partial data', () => {
      const feature = createTestFeature({ id: 'f1', title: 'Original' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().updateFeature('f1', { title: 'Updated' })
      expect(useFeatureStore.getState().features[0].title).toBe('Updated')
    })

    it('should only update the targeted feature', () => {
      const f1 = createTestFeature({ id: 'f1', title: 'Feature 1' })
      const f2 = createTestFeature({ id: 'f2', title: 'Feature 2' })
      useFeatureStore.getState().setFeatures([f1, f2])
      useFeatureStore.getState().updateFeature('f1', { title: 'Updated' })
      expect(useFeatureStore.getState().features[0].title).toBe('Updated')
      expect(useFeatureStore.getState().features[1].title).toBe('Feature 2')
    })

    it('should update multiple fields at once', () => {
      const feature = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().updateFeature('f1', {
        progress: 50,
        assignedAgent: 'agent-1',
        status: 'in_progress'
      })
      const updated = useFeatureStore.getState().features[0]
      expect(updated.progress).toBe(50)
      expect(updated.assignedAgent).toBe('agent-1')
      expect(updated.status).toBe('in_progress')
    })

    it('should handle non-existent feature id gracefully', () => {
      const feature = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(feature)
      // Should not throw
      useFeatureStore.getState().updateFeature('non-existent', { title: 'Nope' })
      expect(useFeatureStore.getState().features[0].title).toBe('Test Feature')
    })
  })

  describe('removeFeature', () => {
    it('should remove a feature by id', () => {
      const feature = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().removeFeature('f1')
      expect(useFeatureStore.getState().features).toEqual([])
    })

    it('should only remove the targeted feature', () => {
      const f1 = createTestFeature({ id: 'f1' })
      const f2 = createTestFeature({ id: 'f2' })
      useFeatureStore.getState().setFeatures([f1, f2])
      useFeatureStore.getState().removeFeature('f1')
      expect(useFeatureStore.getState().features).toHaveLength(1)
      expect(useFeatureStore.getState().features[0].id).toBe('f2')
    })

    it('should handle non-existent feature id gracefully', () => {
      const feature = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().removeFeature('non-existent')
      expect(useFeatureStore.getState().features).toHaveLength(1)
    })
  })

  describe('moveFeature', () => {
    it('should change feature status when moved', () => {
      const feature = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().moveFeature('f1', 'planning')
      expect(useFeatureStore.getState().features[0].status).toBe('planning')
    })

    it('should update updatedAt timestamp on move', () => {
      const oldDate = '2024-01-01T00:00:00Z'
      const feature = createTestFeature({ id: 'f1', status: 'backlog', updatedAt: oldDate })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().moveFeature('f1', 'planning')
      expect(useFeatureStore.getState().features[0].updatedAt).not.toBe(oldDate)
    })

    it('should handle move to same status', () => {
      const feature = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().moveFeature('f1', 'backlog')
      expect(useFeatureStore.getState().features[0].status).toBe('backlog')
    })

    it('should handle non-existent feature id gracefully', () => {
      const feature = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(feature)
      useFeatureStore.getState().moveFeature('non-existent', 'planning')
      expect(useFeatureStore.getState().features[0].status).toBe('backlog')
    })

    it('should move feature through the full pipeline', () => {
      const feature = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(feature)

      const statuses: FeatureStatus[] = [
        'planning',
        'in_progress',
        'ai_review',
        'human_review',
        'done'
      ]
      for (const status of statuses) {
        useFeatureStore.getState().moveFeature('f1', status)
        expect(useFeatureStore.getState().features[0].status).toBe(status)
      }
    })
  })

  describe('reorderFeatures', () => {
    it('should reorder features within a column', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog', title: 'First' })
      const f2 = createTestFeature({ id: 'f2', status: 'backlog', title: 'Second' })
      const f3 = createTestFeature({ id: 'f3', status: 'backlog', title: 'Third' })
      useFeatureStore.getState().setFeatures([f1, f2, f3])

      // Move first to last position
      useFeatureStore.getState().reorderFeatures('backlog', 0, 2)

      const backlogFeatures = useFeatureStore
        .getState()
        .features.filter((f) => f.status === 'backlog')
      expect(backlogFeatures[0].id).toBe('f2')
      expect(backlogFeatures[1].id).toBe('f3')
      expect(backlogFeatures[2].id).toBe('f1')
    })

    it('should not affect features in other columns', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog' })
      const f2 = createTestFeature({ id: 'f2', status: 'backlog' })
      const f3 = createTestFeature({ id: 'f3', status: 'planning' })
      useFeatureStore.getState().setFeatures([f1, f2, f3])

      useFeatureStore.getState().reorderFeatures('backlog', 0, 1)

      const planningFeatures = useFeatureStore
        .getState()
        .features.filter((f) => f.status === 'planning')
      expect(planningFeatures).toHaveLength(1)
      expect(planningFeatures[0].id).toBe('f3')
    })

    it('should handle invalid indices gracefully', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(f1)

      // Should not throw with invalid indices
      useFeatureStore.getState().reorderFeatures('backlog', -1, 5)
      expect(useFeatureStore.getState().features).toHaveLength(1)
    })

    it('should handle same oldIndex and newIndex', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog' })
      const f2 = createTestFeature({ id: 'f2', status: 'backlog' })
      useFeatureStore.getState().setFeatures([f1, f2])

      useFeatureStore.getState().reorderFeatures('backlog', 0, 0)

      const backlogFeatures = useFeatureStore
        .getState()
        .features.filter((f) => f.status === 'backlog')
      expect(backlogFeatures[0].id).toBe('f1')
    })
  })

  describe('reset', () => {
    it('should clear all features', () => {
      const f1 = createTestFeature({ id: 'f1' })
      const f2 = createTestFeature({ id: 'f2' })
      useFeatureStore.getState().setFeatures([f1, f2])
      useFeatureStore.getState().reset()
      expect(useFeatureStore.getState().features).toEqual([])
    })
  })

  describe('selector: useFeatures', () => {
    it('should return all features', () => {
      const f1 = createTestFeature({ id: 'f1' })
      const f2 = createTestFeature({ id: 'f2' })
      useFeatureStore.getState().setFeatures([f1, f2])
      expect(useFeatureStore.getState().features).toHaveLength(2)
    })
  })

  describe('selector: useFeaturesByStatus', () => {
    it('should return features filtered by status', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog' })
      const f2 = createTestFeature({ id: 'f2', status: 'planning' })
      const f3 = createTestFeature({ id: 'f3', status: 'backlog' })
      useFeatureStore.getState().setFeatures([f1, f2, f3])

      const backlogFeatures = useFeatureStore
        .getState()
        .features.filter((f) => f.status === 'backlog')
      expect(backlogFeatures).toHaveLength(2)
      expect(backlogFeatures[0].id).toBe('f1')
      expect(backlogFeatures[1].id).toBe('f3')
    })

    it('should return empty array for status with no features', () => {
      const f1 = createTestFeature({ id: 'f1', status: 'backlog' })
      useFeatureStore.getState().addFeature(f1)

      const doneFeatures = useFeatureStore.getState().features.filter((f) => f.status === 'done')
      expect(doneFeatures).toEqual([])
    })
  })

  describe('selector: useFeature', () => {
    it('should return a single feature by id', () => {
      const f1 = createTestFeature({ id: 'f1', title: 'Feature One' })
      const f2 = createTestFeature({ id: 'f2', title: 'Feature Two' })
      useFeatureStore.getState().setFeatures([f1, f2])

      const feature = useFeatureStore.getState().features.find((f) => f.id === 'f1')
      expect(feature?.title).toBe('Feature One')
    })

    it('should return undefined for non-existent id', () => {
      const f1 = createTestFeature({ id: 'f1' })
      useFeatureStore.getState().addFeature(f1)

      const feature = useFeatureStore.getState().features.find((f) => f.id === 'non-existent')
      expect(feature).toBeUndefined()
    })
  })

  describe('selector: useFeatureCount', () => {
    it('should return total feature count', () => {
      const features = [
        createTestFeature({ id: 'f1' }),
        createTestFeature({ id: 'f2' }),
        createTestFeature({ id: 'f3' })
      ]
      useFeatureStore.getState().setFeatures(features)
      expect(useFeatureStore.getState().features.length).toBe(3)
    })

    it('should return 0 for empty store', () => {
      expect(useFeatureStore.getState().features.length).toBe(0)
    })
  })

  describe('selector: useColumnCounts', () => {
    it('should return count per column', () => {
      const features = [
        createTestFeature({ id: 'f1', status: 'backlog' }),
        createTestFeature({ id: 'f2', status: 'backlog' }),
        createTestFeature({ id: 'f3', status: 'planning' }),
        createTestFeature({ id: 'f4', status: 'in_progress' }),
        createTestFeature({ id: 'f5', status: 'done' }),
        createTestFeature({ id: 'f6', status: 'done' })
      ]
      useFeatureStore.getState().setFeatures(features)

      const state = useFeatureStore.getState()
      const counts = {
        backlog: state.features.filter((f) => f.status === 'backlog').length,
        planning: state.features.filter((f) => f.status === 'planning').length,
        in_progress: state.features.filter((f) => f.status === 'in_progress').length,
        ai_review: state.features.filter((f) => f.status === 'ai_review').length,
        human_review: state.features.filter((f) => f.status === 'human_review').length,
        done: state.features.filter((f) => f.status === 'done').length
      }

      expect(counts.backlog).toBe(2)
      expect(counts.planning).toBe(1)
      expect(counts.in_progress).toBe(1)
      expect(counts.ai_review).toBe(0)
      expect(counts.human_review).toBe(0)
      expect(counts.done).toBe(2)
    })

    it('should return all zeros for empty store', () => {
      const state = useFeatureStore.getState()
      const counts = {
        backlog: state.features.filter((f) => f.status === 'backlog').length,
        planning: state.features.filter((f) => f.status === 'planning').length,
        in_progress: state.features.filter((f) => f.status === 'in_progress').length,
        ai_review: state.features.filter((f) => f.status === 'ai_review').length,
        human_review: state.features.filter((f) => f.status === 'human_review').length,
        done: state.features.filter((f) => f.status === 'done').length
      }

      expect(counts.backlog).toBe(0)
      expect(counts.planning).toBe(0)
      expect(counts.in_progress).toBe(0)
      expect(counts.ai_review).toBe(0)
      expect(counts.human_review).toBe(0)
      expect(counts.done).toBe(0)
    })
  })

  describe('complexity values', () => {
    it('should support simple complexity', () => {
      const feature = createTestFeature({ id: 'f1', complexity: 'simple' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].complexity).toBe('simple')
    })

    it('should support moderate complexity', () => {
      const feature = createTestFeature({ id: 'f1', complexity: 'moderate' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].complexity).toBe('moderate')
    })

    it('should support complex complexity', () => {
      const feature = createTestFeature({ id: 'f1', complexity: 'complex' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].complexity).toBe('complex')
    })
  })

  describe('priority values', () => {
    it('should support low priority', () => {
      const feature = createTestFeature({ id: 'f1', priority: 'low' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].priority).toBe('low')
    })

    it('should support medium priority', () => {
      const feature = createTestFeature({ id: 'f1', priority: 'medium' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].priority).toBe('medium')
    })

    it('should support high priority', () => {
      const feature = createTestFeature({ id: 'f1', priority: 'high' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].priority).toBe('high')
    })

    it('should support critical priority', () => {
      const feature = createTestFeature({ id: 'f1', priority: 'critical' })
      useFeatureStore.getState().addFeature(feature)
      expect(useFeatureStore.getState().features[0].priority).toBe('critical')
    })
  })
})
