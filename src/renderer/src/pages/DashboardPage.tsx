import { useEffect, useRef, type ReactElement } from 'react'
import {
  CostTracker,
  OverviewCards,
  ProgressChart,
  AgentActivity,
  TaskTimeline,
  type ProgressDataPoint
} from '../components/dashboard'
import { AnimatedPage } from '../components/AnimatedPage'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useMetricsStore, useIsMetricsLoading, useOverview } from '../stores'
import type {
  OverviewMetrics,
  AgentMetrics,
  TimelineEvent,
  CostMetrics,
  TimelineEventType
} from '../types/metrics'

/**
 * Check if we're in development/demo mode (no real backend data)
 * Demo mode activates when:
 * - nexusAPI is not available (not in Electron context)
 * - OR we're explicitly in dev mode for visual testing
 */
const isDemoMode = (): boolean => {
  return typeof window.nexusAPI === 'undefined'
}

/**
 * Generate demo data for visual testing
 * This populates the metricsStore with sample data on mount.
 */
function generateDemoData(): {
  overview: OverviewMetrics
  agents: AgentMetrics[]
  timeline: TimelineEvent[]
  costs: CostMetrics
  chartData: ProgressDataPoint[]
} {
  const now = new Date()

  const overview: OverviewMetrics = {
    totalFeatures: 12,
    completedTasks: 34,
    totalTasks: 47,
    activeAgents: 3,
    estimatedCompletion: new Date(now.getTime() + 75 * 60 * 1000) // 1h 15m from now
  }

  const agents: AgentMetrics[] = [
    {
      id: 'coder-1',
      name: 'Coder-1',
      type: 'coder',
      status: 'working',
      currentTask: 'auth.service.ts',
      progress: 80,
      lastActivity: new Date(now.getTime() - 30000)
    },
    {
      id: 'coder-2',
      name: 'Coder-2',
      type: 'coder',
      status: 'working',
      currentTask: 'api.routes.ts',
      progress: 35,
      lastActivity: new Date(now.getTime() - 15000)
    },
    {
      id: 'tester-1',
      name: 'Tester',
      type: 'tester',
      status: 'waiting',
      currentTask: null,
      progress: 0,
      lastActivity: new Date(now.getTime() - 120000)
    },
    {
      id: 'reviewer-1',
      name: 'Reviewer',
      type: 'reviewer',
      status: 'idle',
      currentTask: null,
      progress: 0,
      lastActivity: null
    }
  ]

  // Generate timeline events (most recent first)
  const eventTypes: { type: TimelineEventType; title: string }[] = [
    { type: 'task_completed', title: 'Task api.routes.ts completed' },
    { type: 'task_completed', title: 'Task auth.service.ts completed' },
    { type: 'qa_iteration', title: 'QA iteration 4/50' },
    { type: 'task_started', title: 'Task database.ts started' },
    { type: 'build_completed', title: 'Build #142 succeeded' },
    { type: 'feature_completed', title: 'Feature: User Authentication' },
    { type: 'checkpoint_created', title: 'Checkpoint created' },
    { type: 'agent_task_assigned', title: 'Coder-2 assigned api.routes.ts' },
    { type: 'qa_passed', title: 'QA passed for login.ts' },
    { type: 'task_failed', title: 'Task config.ts failed - retry scheduled' }
  ]

  const timeline: TimelineEvent[] = eventTypes.map((e, i) => ({
    id: `event-${i + 1}`,
    type: e.type,
    title: e.title,
    timestamp: new Date(now.getTime() - i * 120000), // 2 min apart
    metadata: {
      agentId: i % 2 === 0 ? 'coder-1' : 'coder-2',
      iteration: e.type === 'qa_iteration' ? 4 : undefined
    }
  }))

  const costs: CostMetrics = {
    totalCost: 12.47,
    tokenBreakdown: {
      input: 245000,
      output: 89000
    },
    budgetLimit: 50,
    currency: 'USD'
  }

  // Generate progress chart data
  const chartData: ProgressDataPoint[] = []
  for (let i = 0; i < 12; i++) {
    const time = new Date(now.getTime() - (11 - i) * 10 * 60 * 1000)
    chartData.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      tasksCompleted: Math.floor(3 + i * 2.8),
      featuresCompleted: Math.floor(i * 0.9)
    })
  }

  return { overview, agents, timeline, costs, chartData }
}

/**
 * DashboardPage - Real-time observability dashboard.
 *
 * Layout (responsive grid):
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Dashboard                                    [CostTracker] │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [OverviewCards - 4 metric cards in row]                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [ProgressChart]              │  [AgentActivity]            │
 * │  (60% width)                  │  (40% width)                │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [TaskTimeline - full width, flexible height]               │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */
export default function DashboardPage(): ReactElement {
  const isLoading = useIsMetricsLoading()
  const _overview = useOverview()
  const { setOverview, setAgents, setCosts, setLoading, addTimelineEvent } =
    useMetricsStore.getState()

  // Track if we've initialized to prevent re-running
  const initializedRef = useRef(false)

  // Generate demo data only once (memoized via ref to avoid regeneration)
  const demoDataRef = useRef<ReturnType<typeof generateDemoData> | null>(null)
  if (!demoDataRef.current) {
    demoDataRef.current = generateDemoData()
  }
  const demoData = demoDataRef.current

  // Populate metricsStore with demo data on mount ONLY in demo mode
  // In production, real data flows via EventBus → IPC → UIBackendBridge
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Only load demo data if we're in demo mode (no real backend)
    if (isDemoMode()) {
      // Set overview metrics
      setOverview(demoData.overview)

      // Set agents
      setAgents(demoData.agents)

      // Set costs
      setCosts(demoData.costs)

      // Add timeline events (in reverse to maintain order)
      const reversedTimeline = [...demoData.timeline].reverse()
      reversedTimeline.forEach((event) => {
        addTimelineEvent(event)
      })
    }

    // Mark loading complete (whether demo or real data)
    setLoading(false)
  }, [])

  return (
    <AnimatedPage className="flex flex-col h-full p-6 gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time project monitoring</p>
        </div>
        <CostTracker />
      </div>

      {/* Overview Cards with loading skeletons */}
      <div className="flex-shrink-0">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <OverviewCards />
        )}
      </div>

      {/* Middle row: Chart + Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-shrink-0">
        <div className="lg:col-span-3">
          <ProgressChart data={isDemoMode() ? demoData.chartData : []} height={280} />
        </div>
        <div className="lg:col-span-2">
          <AgentActivity />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-[300px]">
        <TaskTimeline height={350} />
      </div>
    </AnimatedPage>
  )
}
