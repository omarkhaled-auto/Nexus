import { useEffect, useRef, useState, useCallback, type ReactElement } from 'react'
import { Link } from 'react-router'
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
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useMetricsStore, useIsMetricsLoading, useOverview, useAgentMetrics } from '../stores'
import {
  Plus,
  FolderOpen,
  Activity,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { cn } from '../lib/utils'
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
 * Demo project data for visual testing
 */
interface DemoProject {
  id: string
  name: string
  mode: 'genesis' | 'evolution'
  status: 'in_progress' | 'completed' | 'planning'
  progress: number
  activeAgents: number
  updatedAt: Date
}

const demoProjects: DemoProject[] = [
  {
    id: 'proj-1',
    name: 'my-saas-app',
    mode: 'genesis',
    status: 'in_progress',
    progress: 80,
    activeAgents: 2,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 'proj-2',
    name: 'legacy-refactor',
    mode: 'evolution',
    status: 'completed',
    progress: 100,
    activeAgents: 0,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 'proj-3',
    name: 'mobile-app',
    mode: 'genesis',
    status: 'planning',
    progress: 15,
    activeAgents: 1,
    updatedAt: new Date(Date.now() - 45 * 60 * 1000)
  }
]

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
 * ProjectCard - Displays a single project in the recent projects list
 */
function ProjectCard({ project }: { project: DemoProject }): ReactElement {
  const getStatusIcon = () => {
    switch (project.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-accent-success" />
      case 'in_progress':
        return <Zap className="h-4 w-4 text-accent-primary" />
      case 'planning':
        return <Clock className="h-4 w-4 text-accent-warning" />
    }
  }

  const getStatusLabel = () => {
    switch (project.status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return `${project.activeAgents} agent${project.activeAgents !== 1 ? 's' : ''} active`
      case 'planning':
        return 'Planning'
    }
  }

  const getModeIcon = () => {
    return project.mode === 'genesis' ? (
      <Sparkles className="h-4 w-4 text-accent-primary" />
    ) : (
      <TrendingUp className="h-4 w-4 text-accent-secondary" />
    )
  }

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <Link
      to={`/project/${project.id}`}
      data-testid="project-card"
      className="block group"
    >
      <div className="flex items-center gap-4 p-4 rounded-lg bg-bg-card border border-border-default hover:border-accent-primary/50 hover:bg-bg-hover transition-all duration-200 group-hover:shadow-md">
        {/* Project Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center group-hover:bg-accent-primary/10 transition-colors">
          {getModeIcon()}
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-text-primary truncate">{project.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary capitalize">
              {project.mode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            {getStatusIcon()}
            <span>{getStatusLabel()}</span>
            <span className="text-text-tertiary">•</span>
            <span className="text-text-tertiary">{getTimeAgo(project.updatedAt)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-shrink-0 w-24">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-secondary">{project.progress}%</span>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                project.status === 'completed'
                  ? 'bg-accent-success'
                  : project.progress >= 50
                    ? 'bg-accent-primary'
                    : 'bg-accent-warning'
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:text-accent-primary transition-colors" />
      </div>
    </Link>
  )
}

/**
 * StatCard - Enhanced stat card component with icon and trend
 */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  testId
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  iconColor: string
  trend?: { value: string; positive: boolean }
  testId: string
}): ReactElement {
  return (
    <Card data-testid={testId} className="bg-bg-card border-border-default hover:border-border-subtle transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', iconColor.replace('text-', 'bg-').replace('500', '500/10'))}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-text-secondary">{subtitle}</p>
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-accent-success' : 'text-accent-error'
            )}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * DashboardPage - Real-time observability dashboard.
 *
 * Layout (responsive grid):
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Dashboard                                   [+ New Project] │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [Stats Cards - 4 metric cards in row]                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [Recent Projects]         │  [Cost Tracker + Agent Activity]│
 * │  (60% width)               │  (40% width)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │  [ProgressChart]           │  [TaskTimeline]                 │
 * │  (40% width)               │  (60% width)                    │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */
export default function DashboardPage(): ReactElement {
  const isLoading = useIsMetricsLoading()
  const overview = useOverview()
  const agents = useAgentMetrics()
  const { setOverview, setAgents, setCosts, setLoading, addTimelineEvent, updateAgentMetrics } =
    useMetricsStore.getState()

  // Track if we've initialized to prevent re-running
  const initializedRef = useRef(false)

  // State for real projects from backend
  const [projects, setProjects] = useState<DemoProject[]>(demoProjects)
  const [realDataMode, setRealDataMode] = useState(false)

  // Generate demo data only once (memoized via ref to avoid regeneration)
  const demoDataRef = useRef<ReturnType<typeof generateDemoData> | null>(null)
  if (!demoDataRef.current) {
    demoDataRef.current = generateDemoData()
  }
  const demoData = demoDataRef.current

  /**
   * Load initial data from backend
   * Called when NOT in demo mode
   */
  const loadRealData = useCallback(async () => {
    try {
      // Load dashboard metrics
      const metricsData = await window.nexusAPI.getDashboardMetrics()
      if (metricsData) {
        setOverview(metricsData as OverviewMetrics)
      }

      // Load cost data
      const costsData = await window.nexusAPI.getDashboardCosts()
      if (costsData) {
        setCosts(costsData as CostMetrics)
      }

      // Load agent status
      const agentData = await window.nexusAPI.getAgentStatus()
      if (Array.isArray(agentData) && agentData.length > 0) {
        setAgents(agentData as AgentMetrics[])
      }

      // Load projects
      const projectsData = await window.nexusAPI.getProjects()
      if (Array.isArray(projectsData) && projectsData.length > 0) {
        // Transform backend project data to DemoProject format
        const transformedProjects: DemoProject[] = projectsData.map((p: unknown) => {
          const proj = p as { id: string; name: string; mode: 'genesis' | 'evolution' }
          return {
            id: proj.id,
            name: proj.name,
            mode: proj.mode,
            status: 'in_progress' as const,
            progress: 0,
            activeAgents: 0,
            updatedAt: new Date()
          }
        })
        setProjects(transformedProjects)
      }

      setRealDataMode(true)
    } catch (error) {
      console.warn('Failed to load real data, using demo mode:', error)
    }
  }, [setOverview, setCosts, setAgents])

  /**
   * Subscribe to real-time events from backend
   */
  const subscribeToEvents = useCallback(() => {
    const unsubscribers: Array<() => void> = []

    // Subscribe to metrics updates
    unsubscribers.push(
      window.nexusAPI.onMetricsUpdate((metrics) => {
        setOverview(metrics as OverviewMetrics)
      })
    )

    // Subscribe to agent status updates
    unsubscribers.push(
      window.nexusAPI.onAgentStatusUpdate((agentData) => {
        const agent = agentData as { id: string; status?: string; currentTask?: string }
        if (agent.id) {
          updateAgentMetrics(agent.id, agent as Partial<AgentMetrics>)
        }
      })
    )

    // Subscribe to timeline events
    unsubscribers.push(
      window.nexusAPI.onTimelineEvent((event) => {
        addTimelineEvent(event as TimelineEvent)
      })
    )

    // Subscribe to cost updates
    unsubscribers.push(
      window.nexusAPI.onCostUpdate((costs) => {
        setCosts(costs as CostMetrics)
      })
    )

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [setOverview, updateAgentMetrics, addTimelineEvent, setCosts])

  // Initialize data and subscriptions on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Check if we're in Electron mode (real backend available)
    if (!isDemoMode()) {
      // Load initial data from backend
      loadRealData()
        .then(() => {
          setLoading(false)
        })
        .catch((err) => {
          console.error('Error loading dashboard data:', err)
          // Fall back to demo data
          setOverview(demoData.overview)
          setAgents(demoData.agents)
          setCosts(demoData.costs)
          const reversedTimeline = [...demoData.timeline].reverse()
          reversedTimeline.forEach((event) => {
            addTimelineEvent(event)
          })
          setLoading(false)
        })

      // Subscribe to real-time events
      const unsubscribe = subscribeToEvents()

      // Cleanup on unmount
      return () => {
        unsubscribe()
      }
    }

    // Demo mode - use generated data
    setOverview(demoData.overview)
    setAgents(demoData.agents)
    setCosts(demoData.costs)

    // Add timeline events (in reverse to maintain order)
    const reversedTimeline = [...demoData.timeline].reverse()
    reversedTimeline.forEach((event) => {
      addTimelineEvent(event)
    })

    setLoading(false)

    // No cleanup needed for demo mode
    return undefined
  }, [loadRealData, subscribeToEvents, setOverview, setAgents, setCosts, addTimelineEvent, setLoading, demoData])

  // Calculate stats
  const progressPercent = overview && overview.totalTasks > 0
    ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
    : 0

  return (
    <AnimatedPage className="flex flex-col h-full p-6 gap-6 overflow-auto bg-bg-dark">
      {/* Page Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        data-testid="dashboard-header"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">Real-time project monitoring and agent activity</p>
        </div>
        <Button
          variant="primary"
          size="md"
          data-testid="new-project-button"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0"
        data-testid="stats-cards"
      >
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              testId="stat-card-progress"
              title="Progress"
              value={`${progressPercent}%`}
              subtitle={`${overview?.completedTasks ?? 0} of ${overview?.totalTasks ?? 0} tasks`}
              icon={TrendingUp}
              iconColor="text-accent-success"
              trend={{ value: '12%', positive: true }}
            />
            <StatCard
              testId="stat-card-features"
              title="Features"
              value={overview?.completedFeatures ?? 0}
              subtitle={`of ${overview?.totalFeatures ?? 0} completed`}
              icon={Sparkles}
              iconColor="text-accent-primary"
            />
            <StatCard
              testId="stat-card-agents"
              title="Active Agents"
              value={overview?.activeAgents ?? 0}
              subtitle="currently working"
              icon={Activity}
              iconColor="text-accent-secondary"
            />
            <StatCard
              testId="stat-card-projects"
              title="Active Projects"
              value={projects.filter(p => p.status !== 'completed').length}
              subtitle={`${projects.filter(p => p.status === 'completed').length} completed`}
              icon={FolderOpen}
              iconColor="text-accent-warning"
            />
          </>
        )}
      </div>

      {/* Main Content Row 1: Recent Projects + Cost/Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-shrink-0">
        {/* Recent Projects */}
        <Card
          className="lg:col-span-3 bg-bg-card border-border-default"
          data-testid="recent-projects"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <FolderOpen className="h-4 w-4 text-accent-primary" />
              Recent Projects
            </CardTitle>
            <Link
              to="/projects"
              className="text-sm text-accent-primary hover:text-accent-primary/80 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </CardContent>
        </Card>

        {/* Right Column: Cost + Agent Activity */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <CostTracker className="bg-bg-card border-border-default" />
          <AgentActivity className="flex-1 bg-bg-card border-border-default" />
        </div>
      </div>

      {/* Main Content Row 2: Progress Chart + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-[300px]">
        <div className="lg:col-span-2">
          <ProgressChart
            data={isDemoMode() ? demoData.chartData : []}
            height={280}
            className="h-full bg-bg-card border-border-default"
          />
        </div>
        <div className="lg:col-span-3">
          <TaskTimeline
            height={280}
            className="h-full bg-bg-card border-border-default"
          />
        </div>
      </div>
    </AnimatedPage>
  )
}
