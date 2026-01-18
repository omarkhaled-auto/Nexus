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
    projectId: 'demo-project',
    projectName: 'Demo Project',
    totalFeatures: 12,
    completedFeatures: 4,
    completedTasks: 34,
    totalTasks: 47,
    failedTasks: 2,
    activeAgents: 3,
    estimatedRemainingMinutes: 75,
    estimatedCompletion: new Date(now.getTime() + 75 * 60 * 1000),
    startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    updatedAt: now
  }

  const agents: AgentMetrics[] = [
    {
      id: 'coder-1',
      name: 'Coder-1',
      type: 'coder',
      status: 'working',
      currentTask: 'auth.service.ts',
      currentTaskName: 'auth.service.ts',
      tasksCompleted: 12,
      tasksFailed: 1,
      tokensUsed: 45000,
      lastActivity: new Date(now.getTime() - 30000),
      spawnedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'coder-2',
      name: 'Coder-2',
      type: 'coder',
      status: 'working',
      currentTask: 'api.routes.ts',
      currentTaskName: 'api.routes.ts',
      tasksCompleted: 8,
      tasksFailed: 0,
      tokensUsed: 32000,
      lastActivity: new Date(now.getTime() - 15000),
      spawnedAt: new Date(now.getTime() - 90 * 60 * 1000)
    },
    {
      id: 'tester-1',
      name: 'Tester',
      type: 'tester',
      status: 'waiting',
      currentTask: undefined,
      tasksCompleted: 5,
      tasksFailed: 0,
      tokensUsed: 15000,
      lastActivity: new Date(now.getTime() - 120000),
      spawnedAt: new Date(now.getTime() - 60 * 60 * 1000)
    },
    {
      id: 'reviewer-1',
      name: 'Reviewer',
      type: 'reviewer',
      status: 'idle',
      currentTask: undefined,
      tasksCompleted: 3,
      tasksFailed: 0,
      tokensUsed: 8000,
      lastActivity: new Date(now.getTime() - 300000),
      spawnedAt: new Date(now.getTime() - 45 * 60 * 1000)
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
    severity: e.type === 'task_failed' ? 'error' as const : 'info' as const,
    timestamp: new Date(now.getTime() - i * 120000),
    metadata: {
      agentId: i % 2 === 0 ? 'coder-1' : 'coder-2',
      iteration: e.type === 'qa_iteration' ? 4 : undefined
    }
  }))

  const costs: CostMetrics = {
    totalCost: 12.47,
    totalTokensUsed: 334000,
    inputTokens: 245000,
    outputTokens: 89000,
    estimatedCostUSD: 12.47,
    breakdownByModel: [
      { model: 'claude-3-5-sonnet', provider: 'anthropic', inputTokens: 200000, outputTokens: 70000, costUSD: 9.50 },
      { model: 'gemini-1.5-flash', provider: 'google', inputTokens: 45000, outputTokens: 19000, costUSD: 2.97 }
    ],
    breakdownByAgent: [
      { agentType: 'coder', tokensUsed: 200000, costUSD: 8.00, taskCount: 20 },
      { agentType: 'tester', tokensUsed: 80000, costUSD: 2.50, taskCount: 5 },
      { agentType: 'reviewer', tokensUsed: 54000, costUSD: 1.97, taskCount: 3 }
    ],
    updatedAt: now
  }

  // Generate progress chart data
  const chartData: ProgressDataPoint[] = []
  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(now.getTime() - (11 - i) * 10 * 60 * 1000)
    chartData.push({
      timestamp,
      completed: Math.floor(3 + i * 2.8),
      total: 47
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
