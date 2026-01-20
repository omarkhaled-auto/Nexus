import { useEffect, useRef, useState, useCallback, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  CostTracker,
  ProgressChart,
  AgentActivity,
  TaskTimeline
} from '../components/dashboard'
import { AnimatedPage } from '../components/AnimatedPage'
import { CardSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog'
import { Input } from '../components/ui/Input'
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
  Clock,
  Loader2
} from 'lucide-react'
import { cn } from '../lib/utils'
import type {
  OverviewMetrics,
  AgentMetrics,
  TimelineEvent,
  CostMetrics
} from '../types/metrics'
import type { ProgressDataPoint } from '../components/dashboard/ProgressChart'

/**
 * Check if running in Electron environment with nexusAPI available
 */
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined'
}

/**
 * Project data interface for display
 */
interface ProjectData {
  id: string
  name: string
  mode: 'genesis' | 'evolution'
  status: 'in_progress' | 'completed' | 'planning'
  progress: number
  activeAgents: number
  updatedAt: Date
}

/**
 * ProjectCard - Displays a single project in the recent projects list
 */
function ProjectCard({ project }: { project: ProjectData }): ReactElement {
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

  // Navigate to genesis for genesis mode, evolution for evolution mode
  const projectPath = project.mode === 'genesis' ? '/genesis' : '/evolution'

  return (
    <Link
      to={projectPath}
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
  const navigate = useNavigate()
  const isLoading = useIsMetricsLoading()
  const overview = useOverview()
  const agents = useAgentMetrics()
  const { setOverview, setAgents, setCosts, setLoading, addTimelineEvent, updateAgentMetrics } =
    useMetricsStore.getState()

  // Track if we've initialized to prevent re-running
  const initializedRef = useRef(false)

  // State for projects from backend (initialized empty)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [error, setError] = useState<string | null>(null)

  // State for progress chart data (real data from backend)
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([])

  // State for create project modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
  const [createProjectMode, setCreateProjectMode] = useState<'genesis' | 'evolution'>('genesis')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  /**
   * Load initial data from backend
   */
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError('Backend not available. Please run in Electron.')
      setLoading(false)
      return
    }

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
      if (Array.isArray(agentData)) {
        setAgents(agentData as AgentMetrics[])
      }

      // Load projects
      const projectsData = await window.nexusAPI.getProjects()
      if (Array.isArray(projectsData)) {
        // Transform backend project data to ProjectData format
        const transformedProjects: ProjectData[] = projectsData.map((p: unknown) => {
          const proj = p as { id: string; name: string; mode: 'genesis' | 'evolution'; status?: string; progress?: number }
          return {
            id: proj.id,
            name: proj.name,
            mode: proj.mode,
            status: (proj.status as ProjectData['status']) || 'in_progress',
            progress: proj.progress || 0,
            activeAgents: 0,
            updatedAt: new Date()
          }
        })
        setProjects(transformedProjects)
      }

      // Load historical progress data for ProgressChart
      const historicalProgressData = await window.nexusAPI.getHistoricalProgress()
      if (Array.isArray(historicalProgressData)) {
        // Transform backend progress data to ProgressDataPoint format
        // Backend returns timestamps as strings when serialized via IPC
        const transformedProgressData: ProgressDataPoint[] = historicalProgressData.map((point: unknown) => {
          const p = point as { timestamp: string | Date; completed: number; total: number }
          return {
            timestamp: p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp),
            completed: p.completed,
            total: p.total
          }
        })
        setProgressData(transformedProgressData)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data from backend.')
    } finally {
      setLoading(false)
    }
  }, [setOverview, setCosts, setAgents, setLoading])

  /**
   * Subscribe to real-time events from backend
   */
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) return () => {}

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
      unsubscribers.forEach(unsub => { unsub(); })
    }
  }, [setOverview, updateAgentMetrics, addTimelineEvent, setCosts])

  /**
   * Handle creating a new project via the modal
   */
  const handleCreateProject = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setCreateError('Cannot create project: backend not available')
      return
    }

    if (!createProjectName.trim()) {
      setCreateError('Project name is required')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const result = await window.nexusAPI.createProject({
        name: createProjectName.trim(),
        mode: createProjectMode
      })

      // Close modal and reset state
      setIsCreateModalOpen(false)
      setCreateProjectName('')
      setCreateProjectMode('genesis')

      // Reload projects to show the new one
      await loadRealData()

      // Navigate based on mode: genesis for interview, evolution for kanban
      const projectPath = createProjectMode === 'genesis' ? '/genesis' : '/evolution'
      navigate(projectPath)
    } catch (err) {
      console.error('Failed to create project:', err)
      setCreateError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }, [createProjectName, createProjectMode, loadRealData, navigate])

  /**
   * Handle modal close - reset form state
   */
  const handleModalClose = useCallback(() => {
    setIsCreateModalOpen(false)
    setCreateProjectName('')
    setCreateProjectMode('genesis')
    setCreateError(null)
  }, [])

  // Initialize data and subscriptions on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Load data from backend
    void loadRealData()

    // Subscribe to real-time events
    const unsubscribe = subscribeToEvents()

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [loadRealData, subscribeToEvents])

  // Calculate stats
  const progressPercent = overview && overview.totalTasks > 0
    ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
    : 0

  return (
    <AnimatedPage className="flex flex-col h-full p-6 gap-6 overflow-auto bg-bg-dark">
      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 px-4 py-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
          <p className="text-sm text-status-warning">{error}</p>
        </div>
      )}

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
          onClick={() => { setIsCreateModalOpen(true); }}
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
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-10 w-10 text-text-tertiary mb-3" />
                <p className="text-sm text-text-secondary">No projects yet</p>
                <p className="text-xs text-text-tertiary mt-1">Create a new project to get started</p>
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            )}
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
            data={progressData}
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

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="bg-bg-card border-border-default">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Create New Project</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Start a new project with Nexus AI agent orchestration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project Name Input */}
            <Input
              label="Project Name"
              placeholder="my-awesome-project"
              value={createProjectName}
              onChange={(e) => { setCreateProjectName(e.target.value); }}
              error={createError || undefined}
              data-testid="create-project-name-input"
            />

            {/* Project Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Project Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCreateProjectMode('genesis'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                    createProjectMode === 'genesis'
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border-default hover:border-border-subtle'
                  )}
                  data-testid="create-project-mode-genesis"
                >
                  <Sparkles className={cn(
                    'h-6 w-6',
                    createProjectMode === 'genesis' ? 'text-accent-primary' : 'text-text-secondary'
                  )} />
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      createProjectMode === 'genesis' ? 'text-accent-primary' : 'text-text-primary'
                    )}>Genesis</p>
                    <p className="text-xs text-text-tertiary">Create from scratch</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setCreateProjectMode('evolution'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                    createProjectMode === 'evolution'
                      ? 'border-accent-secondary bg-accent-secondary/10'
                      : 'border-border-default hover:border-border-subtle'
                  )}
                  data-testid="create-project-mode-evolution"
                >
                  <TrendingUp className={cn(
                    'h-6 w-6',
                    createProjectMode === 'evolution' ? 'text-accent-secondary' : 'text-text-secondary'
                  )} />
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      createProjectMode === 'evolution' ? 'text-accent-secondary' : 'text-text-primary'
                    )}>Evolution</p>
                    <p className="text-xs text-text-tertiary">Extend existing code</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={isCreating || !createProjectName.trim()}
              data-testid="create-project-submit"
              className="gap-2"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  )
}
