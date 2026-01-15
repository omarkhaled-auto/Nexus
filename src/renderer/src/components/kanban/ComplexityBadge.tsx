import type { FeatureComplexity } from '@renderer/types/feature'
import { cn } from '@renderer/lib/utils'

interface ComplexityBadgeProps {
  complexity: FeatureComplexity
}

// Complexity display configuration
const COMPLEXITY_CONFIG: Record<
  FeatureComplexity,
  { label: string; shortLabel: string; className: string }
> = {
  simple: {
    label: 'Simple',
    shortLabel: 'S',
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
  },
  moderate: {
    label: 'Moderate',
    shortLabel: 'M',
    className: 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  },
  complex: {
    label: 'Complex',
    shortLabel: 'XL',
    className: 'bg-red-500/15 text-red-600 border-red-500/30'
  }
}

/**
 * ComplexityBadge - Displays feature complexity as S/M/XL badge.
 * Shows complexity weight at a glance for prioritization.
 */
export function ComplexityBadge({ complexity }: ComplexityBadgeProps) {
  const config = COMPLEXITY_CONFIG[complexity]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
        config.className
      )}
      title={config.label}
    >
      {config.shortLabel}
    </span>
  )
}
