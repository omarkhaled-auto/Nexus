import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useOverview } from '@renderer/stores/metricsStore'
import type { OverviewMetrics } from '@renderer/types/metrics'
import { CheckCircle2, Circle, AlertCircle, Users } from 'lucide-react'

export interface OverviewCardsProps {
  metrics?: OverviewMetrics
  className?: string
}

/**
 * OverviewCards - Dashboard header cards showing key metrics.
 * If metrics prop is not provided, gets data from metricsStore.
 */
export function OverviewCards({ metrics: propMetrics, className }: OverviewCardsProps): ReactElement {
  const storeMetrics = useOverview()
  const metrics = propMetrics ?? storeMetrics

  if (!metrics) {
    return (
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
        <Card><CardContent className="p-6 text-muted-foreground">No data available</CardContent></Card>
        <Card><CardContent className="p-6 text-muted-foreground">No data available</CardContent></Card>
        <Card><CardContent className="p-6 text-muted-foreground">No data available</CardContent></Card>
        <Card><CardContent className="p-6 text-muted-foreground">No data available</CardContent></Card>
      </div>
    )
  }
  const progressPercent = metrics.totalTasks > 0
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
    : 0

  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progressPercent}%</div>
          <p className="text-muted-foreground text-xs">
            {metrics.completedTasks} of {metrics.totalTasks} tasks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Features</CardTitle>
          <Circle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completedFeatures}</div>
          <p className="text-muted-foreground text-xs">
            of {metrics.totalFeatures} completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          <Users className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeAgents}</div>
          <p className="text-muted-foreground text-xs">currently working</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Failed Tasks</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.failedTasks}</div>
          <p className="text-muted-foreground text-xs">require attention</p>
        </CardContent>
      </Card>
    </div>
  )
}
