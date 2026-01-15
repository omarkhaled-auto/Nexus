import { Layers, CheckCircle2, Bot, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MetricCard } from './MetricCard'
import { useOverview, useTaskProgress, useActiveAgentCount } from '@renderer/stores'

/**
 * OverviewCards - Grid of 4 metric cards showing dashboard summary.
 * Provides glance-and-go view of project progress.
 */
export function OverviewCards() {
  const overview = useOverview()
  const taskProgress = useTaskProgress()
  const activeAgentCount = useActiveAgentCount()

  // Calculate trend based on progress percentage
  const getProgressTrend = (): 'up' | 'down' | 'neutral' | undefined => {
    if (taskProgress.percent === 0) return undefined
    if (taskProgress.percent >= 75) return 'up'
    if (taskProgress.percent >= 25) return 'neutral'
    return undefined
  }

  // Format estimated completion as human-readable distance
  const formatEstimatedCompletion = (): string => {
    if (!overview?.estimatedCompletion) return '--'
    try {
      return formatDistanceToNow(overview.estimatedCompletion, { addSuffix: true })
    } catch {
      return '--'
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Features */}
      <MetricCard
        title="Total Features"
        value={overview?.totalFeatures ?? 0}
        icon={<Layers className="h-4 w-4" />}
      />

      {/* Completed Tasks */}
      <MetricCard
        title="Completed Tasks"
        value={`${taskProgress.completed}/${taskProgress.total}`}
        subtitle={taskProgress.total > 0 ? `${taskProgress.percent}% complete` : undefined}
        icon={<CheckCircle2 className="h-4 w-4" />}
        trend={getProgressTrend()}
      />

      {/* Active Agents */}
      <MetricCard
        title="Active Agents"
        value={activeAgentCount}
        subtitle={activeAgentCount > 0 ? 'working' : 'idle'}
        icon={<Bot className="h-4 w-4" />}
      />

      {/* Estimated Completion */}
      <MetricCard
        title="Est. Completion"
        value={formatEstimatedCompletion()}
        icon={<Clock className="h-4 w-4" />}
      />
    </div>
  )
}
