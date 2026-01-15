import { cn } from '@renderer/lib/utils'

interface ProgressIndicatorProps {
  /** Progress value from 0-100 */
  progress: number
  /** Whether to show the percentage label */
  showLabel?: boolean
  /** Optional custom class for the container */
  className?: string
}

/**
 * ProgressIndicator - Horizontal progress bar for feature completion.
 * Displays progress with smooth transitions and optional percentage label.
 */
export function ProgressIndicator({
  progress,
  showLabel = false,
  className
}: ProgressIndicatorProps) {
  // Clamp progress between 0-100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  // Color based on progress level
  const getProgressColor = () => {
    if (clampedProgress >= 80) return 'bg-emerald-500'
    if (clampedProgress >= 50) return 'bg-amber-500'
    if (clampedProgress >= 20) return 'bg-blue-500'
    return 'bg-muted-foreground'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress bar container */}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        {/* Progress fill */}
        <div
          className={cn('h-full rounded-full transition-all duration-300', getProgressColor())}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Optional percentage label */}
      {showLabel && (
        <span className="min-w-[2.5rem] text-right text-xs text-muted-foreground">
          {clampedProgress}%
        </span>
      )}
    </div>
  )
}
