/**
 * IterationCounter Component
 *
 * Displays the current iteration count with optional circular progress indicator.
 * Shows warning/error colors when approaching or reaching the maximum.
 *
 * @example
 * // Basic usage
 * <IterationCounter current={3} max={50} />
 *
 * @example
 * // With circular progress
 * <IterationCounter current={3} max={50} showProgress />
 *
 * @example
 * // Large size
 * <IterationCounter current={45} max={50} size="md" showProgress />
 */

import React from 'react'
import { Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export interface IterationCounterProps {
  /** Current iteration number */
  current: number
  /** Maximum iterations allowed */
  max: number
  /** Size preset */
  size?: 'sm' | 'md'
  /** Show circular progress indicator */
  showProgress?: boolean
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE_CONFIG = {
  sm: {
    container: 'gap-1.5',
    text: 'text-xs',
    progress: { size: 20, strokeWidth: 2 },
    icon: 12,
  },
  md: {
    container: 'gap-2',
    text: 'text-sm',
    progress: { size: 28, strokeWidth: 3 },
    icon: 14,
  },
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CircularProgressProps {
  value: number
  size: number
  strokeWidth: number
  color: string
  trackColor: string
}

function CircularProgress({ value, size, strokeWidth, color, trackColor }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-normal"
      />
    </svg>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export const IterationCounter = React.forwardRef<HTMLDivElement, IterationCounterProps>(
  ({ current, max, size = 'sm', showProgress = false, className, 'data-testid': testId }, ref) => {
    const config = SIZE_CONFIG[size]
    const percent = Math.min((current / max) * 100, 100)

    // Determine color based on percentage
    let color: string
    let colorClass: string
    let trackColor = 'var(--color-border-default)'
    let showWarning = false

    if (percent >= 100) {
      color = 'var(--color-accent-error)'
      colorClass = 'text-accent-error'
      showWarning = true
    } else if (percent >= 80) {
      color = 'var(--color-accent-warning)'
      colorClass = 'text-accent-warning'
      showWarning = true
    } else if (percent >= 50) {
      color = 'var(--color-accent-info)'
      colorClass = 'text-accent-info'
    } else {
      color = 'var(--color-text-secondary)'
      colorClass = 'text-text-secondary'
    }

    return (
      <div
        ref={ref}
        data-testid={testId ?? 'iteration-counter'}
        data-iteration-current={current}
        data-iteration-max={max}
        className={cn(
          'inline-flex items-center',
          config.container,
          showWarning && 'animate-pulse-subtle',
          className
        )}
        role="status"
        aria-label={`Iteration ${current} of ${max}`}
      >
        {/* Progress indicator or icon */}
        {showProgress ? (
          <div className="relative">
            <CircularProgress
              value={percent}
              size={config.progress.size}
              strokeWidth={config.progress.strokeWidth}
              color={color}
              trackColor={trackColor}
            />
            {/* Center icon for warning */}
            {showWarning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertTriangle
                  size={config.icon - 2}
                  className={cn(colorClass, percent >= 100 && 'animate-pulse')}
                />
              </div>
            )}
          </div>
        ) : (
          <Zap size={config.icon} className={colorClass} />
        )}

        {/* Text counter */}
        <div className={cn('flex items-baseline', config.text)}>
          <span className={cn('font-medium tabular-nums', colorClass)}>{current}</span>
          <span className="text-text-tertiary">/</span>
          <span className="text-text-tertiary tabular-nums">{max}</span>
        </div>

        {/* Warning text for high iterations */}
        {percent >= 100 && (
          <span className="text-accent-error text-xs font-medium ml-1">(Max!)</span>
        )}
        {percent >= 80 && percent < 100 && (
          <span className="text-accent-warning text-xs ml-1">(High)</span>
        )}
      </div>
    )
  }
)

IterationCounter.displayName = 'IterationCounter'

export default IterationCounter
