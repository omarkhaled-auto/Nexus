import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useOverview } from '@renderer/stores/metricsStore'
import type { OverviewMetrics } from '@renderer/types/metrics'
import { CheckCircle2, Layers, AlertCircle, Users, TrendingUp } from 'lucide-react'

export interface OverviewCardsProps {
  metrics?: OverviewMetrics
  className?: string
}

/**
 * StatCard - Individual metric card with gradient styling
 */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconColor,
  trend,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  iconColor: string
  trend?: { value: string; positive: boolean }
}): ReactElement {
  return (
    <Card className={cn(
      "relative overflow-hidden",
      "bg-[#161B22]/80 backdrop-blur-sm",
      "border border-[#30363D]",
      "hover:border-[#484F58]",
      "transition-all duration-300",
      "hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn(
        "absolute inset-0 opacity-5",
        `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
      )} />

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
              {trend.positive && <TrendingUp className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * OverviewCards - Dashboard header cards showing key metrics.
 * Features glassmorphism design with gradient icons.
 * If metrics prop is not provided, gets data from metricsStore.
 */
export function OverviewCards({ metrics: propMetrics, className }: OverviewCardsProps): ReactElement {
  const storeMetrics = useOverview()
  const metrics = propMetrics ?? storeMetrics

  if (!metrics) {
    return (
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-[#161B22]/60 border-[#30363D]">
            <CardContent className="p-6">
              <div className="h-4 w-24 bg-[#21262D] rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-[#21262D] rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const progressPercent = metrics.totalTasks > 0
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
    : 0

  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      <StatCard
        title="Progress"
        value={`${progressPercent}%`}
        subtitle={`${metrics.completedTasks} of ${metrics.totalTasks} tasks`}
        icon={CheckCircle2}
        gradientFrom="from-[#238636]"
        gradientTo="to-[#3FB950]"
        iconColor="text-[#3FB950]"
        trend={{ value: '+12%', positive: true }}
      />

      <StatCard
        title="Features"
        value={metrics.completedFeatures}
        subtitle={`of ${metrics.totalFeatures} completed`}
        icon={Layers}
        gradientFrom="from-[#7C3AED]"
        gradientTo="to-[#A855F7]"
        iconColor="text-[#A78BFA]"
      />

      <StatCard
        title="Active Agents"
        value={metrics.activeAgents}
        subtitle="currently working"
        icon={Users}
        gradientFrom="from-[#0891B2]"
        gradientTo="to-[#06B6D4]"
        iconColor="text-[#06B6D4]"
      />

      <StatCard
        title="Failed Tasks"
        value={metrics.failedTasks}
        subtitle="require attention"
        icon={AlertCircle}
        gradientFrom="from-[#DA3633]"
        gradientTo="to-[#F85149]"
        iconColor="text-[#F85149]"
      />
    </div>
  )
}
