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
  Loader2,
  AlertTriangle
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
 * HeroProgressRing - Large circular progress indicator
 */
function HeroProgressRing({ progress, completedTasks, totalTasks }: {
  progress: number
  completedTasks: number
  totalTasks: number
}): ReactElement {
  const circumference = 2 * Math.PI * 88 // radius = 88
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative w-48 h-48">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[#7C3AED]/10 rounded-full blur-2xl animate-pulse" />

      {/* SVG Ring */}
      <svg className="w-full h-full transform -rotate-90 relative">
        <defs>
          <linearGradient id="heroProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke="#21262D"
          strokeWidth="8"
        />

        {/* Progress circle */}
        <circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke="url(#heroProgressGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-[#F0F6FC] tabular-nums">
          {progress}
          <span className="text-2xl text-[#8B949E]">%</span>
        </span>
        <span className="text-sm text-[#8B949E] mt-1">
          {completedTasks}/{totalTasks} tasks
        </span>
      </div>
    </div>
  )
}

/**
 * ProjectCard - Displays a single project in the recent projects list
 */
function ProjectCard({ project }: { project: ProjectData }): ReactElement {
  const getStatusIcon = () => {
    switch (project.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-[#3FB950]" />
      case 'in_progress':
        return <Zap className="h-4 w-4 text-[#A78BFA]" />
      case 'planning':
        return <Clock className="h-4 w-4 text-[#F0883E]" />
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
      <Sparkles className="h-4 w-4 text-[#A78BFA]" />
    ) : (
      <TrendingUp className="h-4 w-4 text-[#34D399]" />
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
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl",
        "bg-[#161B22]/60 backdrop-blur-sm",
        "border border-[#30363D]",
        "hover:border-[#7C3AED]/40 hover:bg-[#161B22]/80",
        "transition-all duration-300",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
        "group-hover:translate-x-1"
      )}>
        {/* Project Icon */}
        <div className={cn(
          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-[#21262D] to-[#161B22]",
          "border border-[#30363D]",
          "group-hover:border-[#7C3AED]/30",
          "transition-all duration-300"
        )}>
          {getModeIcon()}
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-[#F0F6FC] truncate">{project.name}</h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              "bg-[#21262D] text-[#8B949E]",
              "border border-[#30363D]"
            )}>
              {project.mode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#8B949E]">
            {getStatusIcon()}
            <span>{getStatusLabel()}</span>
            <span className="text-[#484F58]">-</span>
            <span className="text-[#6E7681]">{getTimeAgo(project.updatedAt)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-shrink-0 w-28">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8B949E] tabular-nums">{project.progress}%</span>
          </div>
          <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                project.status === 'completed'
                  ? 'bg-gradient-to-r from-[#238636] to-[#3FB950]'
                  : project.progress >= 50
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7]'
                    : 'bg-gradient-to-r from-[#9E6A03] to-[#F0883E]'
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-[#484F58] group-hover:text-[#7C3AED] transition-colors" />
      </div>
    </Link>
  )
}

/**
 * StatCard - Enhanced stat card component with gradient icon and glow
 */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  trend,
  testId
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  trend?: { value: string; positive: boolean }
  testId: string
}): ReactElement {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "relative overflow-hidden",
        "bg-[#161B22]/80 backdrop-blur-sm",
        "border border-[#30363D]",
        "hover:border-[#30363D]/80",
        "transition-all duration-300",
        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
      )}
    >
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-5`} />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
        <CardTitle className="text-sm font-medium text-[#8B949E]">{title}</CardTitle>
        <div className={cn(
          "p-2.5 rounded-xl",
          `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
          "shadow-lg"
        )}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold text-[#F0F6FC] tabular-nums">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-[#8B949E]">{subtitle}</p>
          {trend && (
            <span className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              trend.positive ? 'text-[#3FB950]' : 'text-[#F85149]'
            )}>
              {trend.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * DashboardPage - Real-time observability dashboard with modern UI.
 *
 * Features:
 * - Hero progress ring with animated gradient
 * - Bento grid layout for stat cards
 * - Glassmorphism card styling
 * - Real-time metric updates
 */
export default function DashboardPage(): ReactElement {
  const navigate = useNavigate()
  const isLoading = useIsMetricsLoading()
  const overview = useOverview()
  const _agents = useAgentMetrics()
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
            const status = proj.status as ProjectData['status'] | undefined
            return {
              id: proj.id,
              name: proj.name,
              mode: proj.mode,
              status: status ?? 'in_progress',
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
      await window.nexusAPI.createProject({
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
      void navigate(projectPath)
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
    <AnimatedPage className="flex flex-col h-full p-6 gap-6 overflow-auto bg-[#0D1117]">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#7C3AED]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#06B6D4]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 px-4 py-3 bg-[#F0883E]/10 border border-[#F0883E]/20 rounded-xl backdrop-blur-sm relative z-10">
          <p className="text-sm text-[#F0883E]">{error}</p>
        </div>
      )}

      {/* Page Header */}
      <div
        className="flex items-center justify-between flex-shrink-0 relative z-10"
        data-testid="dashboard-header"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Dashboard</h1>
          <p className="text-sm text-[#8B949E]">Real-time project monitoring and agent activity</p>
        </div>
        <Button
          variant="primary"
          size="md"
          data-testid="new-project-button"
          className={cn(
            "gap-2",
            "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]",
            "hover:from-[#6D28D9] hover:to-[#9333EA]",
            "shadow-[0_4px_20px_rgba(124,58,237,0.3)]",
            "hover:shadow-[0_4px_25px_rgba(124,58,237,0.4)]",
            "transition-all duration-300"
          )}
          onClick={() => { setIsCreateModalOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Hero Section with Progress Ring */}
      <div className="flex-shrink-0 relative z-10">
        <Card className={cn(
          "bg-[#161B22]/60 backdrop-blur-xl",
          "border border-[#30363D]",
          "overflow-hidden"
        )}>
          {/* Gradient border effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Progress Ring */}
              <div className="flex-shrink-0">
                {isLoading ? (
                  <div className="w-48 h-48 rounded-full bg-[#21262D] animate-pulse" />
                ) : (
                  <HeroProgressRing
                    progress={progressPercent}
                    completedTasks={overview?.completedTasks ?? 0}
                    totalTasks={overview?.totalTasks ?? 0}
                  />
                )}
              </div>

              {/* Stats Cards - Bento Grid */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full" data-testid="stats-cards">
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
                      gradientFrom="from-[#238636]"
                      gradientTo="to-[#3FB950]"
                      trend={{ value: '12%', positive: true }}
                    />
                    <StatCard
                      testId="stat-card-features"
                      title="Features"
                      value={overview?.completedFeatures ?? 0}
                      subtitle={`of ${overview?.totalFeatures ?? 0} completed`}
                      icon={Sparkles}
                      gradientFrom="from-[#7C3AED]"
                      gradientTo="to-[#A855F7]"
                    />
                    <StatCard
                      testId="stat-card-agents"
                      title="Active Agents"
                      value={overview?.activeAgents ?? 0}
                      subtitle="currently working"
                      icon={Activity}
                      gradientFrom="from-[#0891B2]"
                      gradientTo="to-[#06B6D4]"
                    />
                    <StatCard
                      testId="stat-card-projects"
                      title="Active Projects"
                      value={projects.filter(p => p.status !== 'completed').length}
                      subtitle={`${projects.filter(p => p.status === 'completed').length} completed`}
                      icon={FolderOpen}
                      gradientFrom="from-[#9E6A03]"
                      gradientTo="to-[#F0883E]"
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Row 1: Recent Projects + Cost/Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-shrink-0 relative z-10">
        {/* Recent Projects */}
        <Card
          className={cn(
            "lg:col-span-3",
            "bg-[#161B22]/60 backdrop-blur-sm",
            "border border-[#30363D]"
          )}
          data-testid="recent-projects"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#F0F6FC]">
              <div className="p-1.5 rounded-lg bg-[#7C3AED]/10">
                <FolderOpen className="h-4 w-4 text-[#A78BFA]" />
              </div>
              Recent Projects
            </CardTitle>
            <Link
              to="/settings"
              className="text-sm text-[#7C3AED] hover:text-[#A78BFA] flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#21262D] flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-[#484F58]" />
                </div>
                <p className="text-sm text-[#8B949E]">No projects yet</p>
                <p className="text-xs text-[#6E7681] mt-1">Create a new project to get started</p>
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
          <CostTracker className="bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]" />
          <AgentActivity className="flex-1 bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]" />
        </div>
      </div>

      {/* Main Content Row 2: Progress Chart + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-[300px] relative z-10">
        <div className="lg:col-span-2">
          <ProgressChart
            data={progressData}
            height={280}
            className="h-full bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]"
          />
        </div>
        <div className="lg:col-span-3">
          <TaskTimeline
            height={280}
            className="h-full bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]"
          />
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="bg-[#161B22] border-[#30363D] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-[#F0F6FC]">Create New Project</DialogTitle>
            <DialogDescription className="text-[#8B949E]">
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
              <label className="text-sm font-medium text-[#F0F6FC]">Project Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCreateProjectMode('genesis'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                    createProjectMode === 'genesis'
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                      : 'border-[#30363D] hover:border-[#484F58] hover:bg-[#21262D]/50'
                  )}
                  data-testid="create-project-mode-genesis"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    createProjectMode === 'genesis'
                      ? "bg-[#7C3AED]/20"
                      : "bg-[#21262D]"
                  )}>
                    <Sparkles className={cn(
                      'h-6 w-6',
                      createProjectMode === 'genesis' ? 'text-[#A78BFA]' : 'text-[#8B949E]'
                    )} />
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      createProjectMode === 'genesis' ? 'text-[#A78BFA]' : 'text-[#F0F6FC]'
                    )}>Genesis</p>
                    <p className="text-xs text-[#6E7681]">Create from scratch</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setCreateProjectMode('evolution'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                    createProjectMode === 'evolution'
                      ? 'border-[#10B981] bg-[#10B981]/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-[#30363D] hover:border-[#484F58] hover:bg-[#21262D]/50'
                  )}
                  data-testid="create-project-mode-evolution"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    createProjectMode === 'evolution'
                      ? "bg-[#10B981]/20"
                      : "bg-[#21262D]"
                  )}>
                    <TrendingUp className={cn(
                      'h-6 w-6',
                      createProjectMode === 'evolution' ? 'text-[#34D399]' : 'text-[#8B949E]'
                    )} />
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      createProjectMode === 'evolution' ? 'text-[#34D399]' : 'text-[#F0F6FC]'
                    )}>Evolution</p>
                    <p className="text-xs text-[#6E7681]">Extend existing code</p>
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
              className="border-[#30363D] text-[#8B949E] hover:bg-[#21262D]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => { void handleCreateProject(); }}
              disabled={isCreating || !createProjectName.trim()}
              data-testid="create-project-submit"
              className={cn(
                "gap-2",
                "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]",
                "hover:from-[#6D28D9] hover:to-[#9333EA]"
              )}
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
