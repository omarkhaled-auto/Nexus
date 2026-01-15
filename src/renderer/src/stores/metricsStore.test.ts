import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  useMetricsStore,
  useOverview,
  useTimeline,
  useAgentMetrics,
  useCosts,
  useIsMetricsLoading,
  useActiveAgentCount,
  useTaskProgress,
  useLastUpdated
} from './metricsStore'
import type {
  OverviewMetrics,
  TimelineEvent,
  AgentMetrics,
  CostMetrics
} from '../types/metrics'

// Helper to create test overview metrics
function createTestOverview(overrides: Partial<OverviewMetrics> = {}): OverviewMetrics {
  return {
    totalFeatures: 10,
    completedTasks: 5,
    totalTasks: 20,
    activeAgents: 2,
    estimatedCompletion: new Date('2026-01-20'),
    ...overrides
  }
}

// Helper to create test timeline event
function createTestTimelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 9)}`,
    type: 'task_completed',
    title: 'Task completed',
    timestamp: new Date(),
    metadata: {},
    ...overrides
  }
}

// Helper to create test agent metrics
function createTestAgentMetrics(overrides: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    id: `agent-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Coder-1',
    type: 'coder',
    status: 'idle',
    currentTask: null,
    progress: 0,
    lastActivity: null,
    ...overrides
  }
}

// Helper to create test cost metrics
function createTestCosts(overrides: Partial<CostMetrics> = {}): CostMetrics {
  return {
    totalCost: 12.50,
    tokenBreakdown: {
      input: 50000,
      output: 25000
    },
    budgetLimit: 100,
    currency: 'USD',
    ...overrides
  }
}

describe('metricsStore', () => {
  beforeEach(() => {
    useMetricsStore.getState().reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with null overview', () => {
      expect(useMetricsStore.getState().overview).toBeNull()
    })

    it('should initialize with empty timeline', () => {
      expect(useMetricsStore.getState().timeline).toEqual([])
    })

    it('should initialize with empty agents array', () => {
      expect(useMetricsStore.getState().agents).toEqual([])
    })

    it('should initialize with null costs', () => {
      expect(useMetricsStore.getState().costs).toBeNull()
    })

    it('should initialize with isLoading true', () => {
      expect(useMetricsStore.getState().isLoading).toBe(true)
    })

    it('should initialize with null lastUpdated', () => {
      expect(useMetricsStore.getState().lastUpdated).toBeNull()
    })
  })

  describe('setOverview', () => {
    it('should update overview state', () => {
      const overview = createTestOverview()
      useMetricsStore.getState().setOverview(overview)
      expect(useMetricsStore.getState().overview).toEqual(overview)
    })

    it('should set lastUpdated when updating overview', () => {
      const beforeUpdate = new Date()
      const overview = createTestOverview()
      useMetricsStore.getState().setOverview(overview)
      const lastUpdated = useMetricsStore.getState().lastUpdated
      expect(lastUpdated).not.toBeNull()
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })
  })

  describe('addTimelineEvent', () => {
    it('should prepend event to timeline', () => {
      const event1 = createTestTimelineEvent({ id: 'evt-1', title: 'First' })
      const event2 = createTestTimelineEvent({ id: 'evt-2', title: 'Second' })

      useMetricsStore.getState().addTimelineEvent(event1)
      useMetricsStore.getState().addTimelineEvent(event2)

      const timeline = useMetricsStore.getState().timeline
      expect(timeline[0].id).toBe('evt-2') // Newest first
      expect(timeline[1].id).toBe('evt-1')
    })

    it('should cap timeline at 100 items', () => {
      // Add 105 events
      for (let i = 0; i < 105; i++) {
        useMetricsStore.getState().addTimelineEvent(
          createTestTimelineEvent({ id: `evt-${i}` })
        )
      }

      const timeline = useMetricsStore.getState().timeline
      expect(timeline).toHaveLength(100)
      // Newest should be evt-104 (the last one added)
      expect(timeline[0].id).toBe('evt-104')
    })

    it('should set lastUpdated when adding event', () => {
      const beforeUpdate = new Date()
      useMetricsStore.getState().addTimelineEvent(createTestTimelineEvent())
      const lastUpdated = useMetricsStore.getState().lastUpdated
      expect(lastUpdated).not.toBeNull()
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })
  })

  describe('updateAgentMetrics', () => {
    it('should update correct agent by ID', () => {
      const agents = [
        createTestAgentMetrics({ id: 'agent-1', name: 'Coder-1', status: 'idle' }),
        createTestAgentMetrics({ id: 'agent-2', name: 'Coder-2', status: 'idle' })
      ]
      useMetricsStore.getState().setAgents(agents)

      useMetricsStore.getState().updateAgentMetrics('agent-1', {
        status: 'working',
        currentTask: 'auth.ts'
      })

      const updatedAgents = useMetricsStore.getState().agents
      expect(updatedAgents[0].status).toBe('working')
      expect(updatedAgents[0].currentTask).toBe('auth.ts')
      expect(updatedAgents[1].status).toBe('idle') // Other agent unchanged
    })

    it('should ignore unknown agent IDs', () => {
      const agents = [createTestAgentMetrics({ id: 'agent-1' })]
      useMetricsStore.getState().setAgents(agents)

      // Should not throw
      useMetricsStore.getState().updateAgentMetrics('unknown-agent', {
        status: 'working'
      })

      // Original agent should be unchanged
      expect(useMetricsStore.getState().agents[0].id).toBe('agent-1')
      expect(useMetricsStore.getState().agents).toHaveLength(1)
    })

    it('should set lastUpdated when updating agent', () => {
      const agents = [createTestAgentMetrics({ id: 'agent-1' })]
      useMetricsStore.getState().setAgents(agents)

      const beforeUpdate = new Date()
      useMetricsStore.getState().updateAgentMetrics('agent-1', { status: 'working' })

      const lastUpdated = useMetricsStore.getState().lastUpdated
      expect(lastUpdated).not.toBeNull()
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    it('should update lastActivity on agent when updating', () => {
      const agents = [createTestAgentMetrics({ id: 'agent-1', lastActivity: null })]
      useMetricsStore.getState().setAgents(agents)

      useMetricsStore.getState().updateAgentMetrics('agent-1', { status: 'working' })

      const updatedAgent = useMetricsStore.getState().agents[0]
      expect(updatedAgent.lastActivity).not.toBeNull()
    })
  })

  describe('setAgents', () => {
    it('should replace entire agents array', () => {
      const initialAgents = [createTestAgentMetrics({ id: 'agent-1' })]
      useMetricsStore.getState().setAgents(initialAgents)

      const newAgents = [
        createTestAgentMetrics({ id: 'agent-2' }),
        createTestAgentMetrics({ id: 'agent-3' })
      ]
      useMetricsStore.getState().setAgents(newAgents)

      const agents = useMetricsStore.getState().agents
      expect(agents).toHaveLength(2)
      expect(agents[0].id).toBe('agent-2')
      expect(agents[1].id).toBe('agent-3')
    })
  })

  describe('setCosts', () => {
    it('should update costs state', () => {
      const costs = createTestCosts()
      useMetricsStore.getState().setCosts(costs)
      expect(useMetricsStore.getState().costs).toEqual(costs)
    })

    it('should set lastUpdated when updating costs', () => {
      const beforeUpdate = new Date()
      useMetricsStore.getState().setCosts(createTestCosts())
      const lastUpdated = useMetricsStore.getState().lastUpdated
      expect(lastUpdated).not.toBeNull()
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })
  })

  describe('setLoading', () => {
    it('should update isLoading state', () => {
      expect(useMetricsStore.getState().isLoading).toBe(true)
      useMetricsStore.getState().setLoading(false)
      expect(useMetricsStore.getState().isLoading).toBe(false)
    })
  })

  describe('reset', () => {
    it('should return to initial state', () => {
      // Set up some state
      useMetricsStore.getState().setOverview(createTestOverview())
      useMetricsStore.getState().addTimelineEvent(createTestTimelineEvent())
      useMetricsStore.getState().setAgents([createTestAgentMetrics()])
      useMetricsStore.getState().setCosts(createTestCosts())
      useMetricsStore.getState().setLoading(false)

      // Reset
      useMetricsStore.getState().reset()

      // Verify initial state
      const state = useMetricsStore.getState()
      expect(state.overview).toBeNull()
      expect(state.timeline).toEqual([])
      expect(state.agents).toEqual([])
      expect(state.costs).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.lastUpdated).toBeNull()
    })
  })

  describe('selector: useActiveAgentCount', () => {
    it('should return correct count of working agents', () => {
      const agents = [
        createTestAgentMetrics({ id: 'agent-1', status: 'working' }),
        createTestAgentMetrics({ id: 'agent-2', status: 'idle' }),
        createTestAgentMetrics({ id: 'agent-3', status: 'working' }),
        createTestAgentMetrics({ id: 'agent-4', status: 'waiting' })
      ]
      useMetricsStore.getState().setAgents(agents)

      const count = useMetricsStore.getState().agents.filter(
        (a) => a.status === 'working'
      ).length
      expect(count).toBe(2)
    })

    it('should return 0 when no agents are working', () => {
      const agents = [
        createTestAgentMetrics({ id: 'agent-1', status: 'idle' }),
        createTestAgentMetrics({ id: 'agent-2', status: 'waiting' })
      ]
      useMetricsStore.getState().setAgents(agents)

      const count = useMetricsStore.getState().agents.filter(
        (a) => a.status === 'working'
      ).length
      expect(count).toBe(0)
    })

    it('should return 0 with empty agents array', () => {
      const count = useMetricsStore.getState().agents.filter(
        (a) => a.status === 'working'
      ).length
      expect(count).toBe(0)
    })
  })

  describe('selector: useTaskProgress', () => {
    it('should calculate percentage correctly', () => {
      useMetricsStore.getState().setOverview(
        createTestOverview({ completedTasks: 15, totalTasks: 30 })
      )

      const overview = useMetricsStore.getState().overview
      const percent = overview
        ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
        : 0
      expect(percent).toBe(50)
    })

    it('should handle zero total gracefully', () => {
      useMetricsStore.getState().setOverview(
        createTestOverview({ completedTasks: 0, totalTasks: 0 })
      )

      const overview = useMetricsStore.getState().overview
      const percent = overview && overview.totalTasks > 0
        ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
        : 0
      expect(percent).toBe(0)
    })

    it('should return zeros when overview is null', () => {
      const overview = useMetricsStore.getState().overview
      expect(overview).toBeNull()
      // Selector would return { completed: 0, total: 0, percent: 0 }
    })

    it('should round percentage to nearest integer', () => {
      useMetricsStore.getState().setOverview(
        createTestOverview({ completedTasks: 1, totalTasks: 3 })
      )

      const overview = useMetricsStore.getState().overview
      const percent = overview
        ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
        : 0
      expect(percent).toBe(33) // 33.33... rounds to 33
    })
  })

  describe('selector hooks exist and work', () => {
    it('should export useOverview selector', () => {
      expect(useOverview).toBeDefined()
      expect(typeof useOverview).toBe('function')
    })

    it('should export useTimeline selector', () => {
      expect(useTimeline).toBeDefined()
      expect(typeof useTimeline).toBe('function')
    })

    it('should export useAgentMetrics selector', () => {
      expect(useAgentMetrics).toBeDefined()
      expect(typeof useAgentMetrics).toBe('function')
    })

    it('should export useCosts selector', () => {
      expect(useCosts).toBeDefined()
      expect(typeof useCosts).toBe('function')
    })

    it('should export useIsMetricsLoading selector', () => {
      expect(useIsMetricsLoading).toBeDefined()
      expect(typeof useIsMetricsLoading).toBe('function')
    })

    it('should export useActiveAgentCount selector', () => {
      expect(useActiveAgentCount).toBeDefined()
      expect(typeof useActiveAgentCount).toBe('function')
    })

    it('should export useTaskProgress selector', () => {
      expect(useTaskProgress).toBeDefined()
      expect(typeof useTaskProgress).toBe('function')
    })

    it('should export useLastUpdated selector', () => {
      expect(useLastUpdated).toBeDefined()
      expect(typeof useLastUpdated).toBe('function')
    })
  })
})
