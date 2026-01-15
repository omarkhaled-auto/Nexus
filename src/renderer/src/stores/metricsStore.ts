import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type {
  OverviewMetrics,
  TimelineEvent,
  AgentMetrics,
  CostMetrics
} from '../types/metrics'

/**
 * Maximum number of timeline events to keep in state
 * Prevents memory bloat during long-running sessions
 */
const TIMELINE_MAX_ITEMS = 100

interface MetricsState {
  overview: OverviewMetrics | null
  timeline: TimelineEvent[]
  agents: AgentMetrics[]
  costs: CostMetrics | null
  isLoading: boolean
  lastUpdated: Date | null

  // Actions
  setOverview: (overview: OverviewMetrics) => void
  addTimelineEvent: (event: TimelineEvent) => void
  updateAgentMetrics: (agentId: string, update: Partial<AgentMetrics>) => void
  setAgents: (agents: AgentMetrics[]) => void
  setCosts: (costs: CostMetrics) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  overview: null,
  timeline: [],
  agents: [],
  costs: null,
  isLoading: true,
  lastUpdated: null
}

export const useMetricsStore = create<MetricsState>()((set) => ({
  ...initialState,

  setOverview: (overview) =>
    set({
      overview,
      lastUpdated: new Date()
    }),

  addTimelineEvent: (event) =>
    set((state) => ({
      timeline: [event, ...state.timeline].slice(0, TIMELINE_MAX_ITEMS),
      lastUpdated: new Date()
    })),

  updateAgentMetrics: (agentId, update) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, ...update, lastActivity: new Date() }
          : agent
      ),
      lastUpdated: new Date()
    })),

  setAgents: (agents) => set({ agents }),

  setCosts: (costs) =>
    set({
      costs,
      lastUpdated: new Date()
    }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState)
}))

// Selector hooks for optimized re-renders
export const useOverview = () => useMetricsStore((s) => s.overview)
export const useTimeline = () => useMetricsStore((s) => s.timeline)
export const useAgentMetrics = () => useMetricsStore((s) => s.agents)
export const useCosts = () => useMetricsStore((s) => s.costs)
export const useIsMetricsLoading = () => useMetricsStore((s) => s.isLoading)
export const useLastUpdated = () => useMetricsStore((s) => s.lastUpdated)

// Computed selectors
export const useActiveAgentCount = () =>
  useMetricsStore((s) => s.agents.filter((a) => a.status === 'working').length)

export const useTaskProgress = () =>
  useMetricsStore(
    useShallow((s) => {
      if (!s.overview) return { completed: 0, total: 0, percent: 0 }
      const { completedTasks, totalTasks } = s.overview
      return {
        completed: completedTasks,
        total: totalTasks,
        percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    })
  )
