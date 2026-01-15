import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

export interface MetricCardProps {
  /** Label displayed above the value */
  title: string
  /** Main display value (large text) */
  value: string | number
  /** Secondary info below value */
  subtitle?: string
  /** Lucide icon displayed in top-right */
  icon?: ReactNode
  /** Optional trend indicator */
  trend?: 'up' | 'down' | 'neutral'
}

// Trend display configuration
const TREND_CONFIG: Record<'up' | 'down' | 'neutral', { icon: string; className: string }> = {
  up: {
    icon: '\u2191',
    className: 'text-green-500'
  },
  down: {
    icon: '\u2193',
    className: 'text-red-500'
  },
  neutral: {
    icon: '\u2192',
    className: 'text-muted-foreground'
  }
}

/**
 * MetricCard - Displays a single metric with title, value, and optional trend/icon.
 * Used in dashboard overview cards for glance-and-go summary.
 */
export function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <span className={cn('text-sm', TREND_CONFIG[trend].className)}>
            {TREND_CONFIG[trend].icon}
          </span>
        )}
      </div>
      {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
    </div>
  )
}
