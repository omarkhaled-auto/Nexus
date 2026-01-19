import * as React from 'react'
import { cn } from '@renderer/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Nexus Progress Component
 *
 * A progress bar component for displaying completion percentage or indeterminate loading states.
 * Supports multiple sizes, variants, and animation options.
 *
 * @example
 * ```tsx
 * // Basic progress
 * <Progress value={75} />
 *
 * // With label and size
 * <Progress value={50} size="lg" showValue />
 *
 * // Different variants
 * <Progress value={100} variant="success" />
 * <Progress value={25} variant="warning" />
 * <Progress value={10} variant="error" />
 *
 * // Indeterminate loading
 * <Progress indeterminate />
 *
 * // With animation
 * <Progress value={60} animated />
 *
 * // Custom label format
 * <Progress
 *   value={750}
 *   max={1000}
 *   showValue
 *   formatValue={(value, max) => `${value}/${max} items`}
 * />
 * ```
 */

const progressVariants = cva('relative w-full overflow-hidden rounded-full bg-bg-hover', {
  variants: {
    size: {
      xs: 'h-1',
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
      xl: 'h-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const progressIndicatorVariants = cva(
  'h-full transition-all duration-300 ease-out rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-accent-primary',
        success: 'bg-accent-success',
        warning: 'bg-accent-warning',
        error: 'bg-accent-error',
        info: 'bg-accent-info',
        secondary: 'bg-accent-secondary',
      },
      animated: {
        true: 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer',
        false: '',
      },
      indeterminate: {
        true: 'animate-progress-indeterminate',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      animated: false,
      indeterminate: false,
    },
  }
)

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    Omit<VariantProps<typeof progressIndicatorVariants>, 'animated' | 'indeterminate'> {
  /** Current progress value (0-max) */
  value?: number
  /** Maximum value (default: 100) */
  max?: number
  /** Show value text */
  showValue?: boolean
  /** Format function for displayed value */
  formatValue?: (value: number, max: number) => string
  /** Enable shimmer animation on the progress bar */
  animated?: boolean
  /** Show indeterminate loading state */
  indeterminate?: boolean
  /** Additional class name for the indicator */
  indicatorClassName?: string
  /** data-testid for testing */
  'data-testid'?: string
}

/**
 * Progress Component
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size,
      variant,
      showValue = false,
      formatValue,
      animated = false,
      indeterminate = false,
      indicatorClassName,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // Clamp value between 0 and max
    const clampedValue = Math.min(Math.max(0, value), max)
    const percentage = (clampedValue / max) * 100

    // Default format function
    const displayValue = formatValue
      ? formatValue(clampedValue, max)
      : `${Math.round(percentage)}%`

    return (
      <div className={cn('flex flex-col gap-1', className)} ref={ref} {...props}>
        {showValue && (
          <div className="flex justify-between items-center text-xs text-text-secondary">
            <span>Progress</span>
            <span data-testid={testId ? `${testId}-value` : 'progress-value'}>{displayValue}</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuetext={indeterminate ? 'Loading...' : displayValue}
          className={cn(progressVariants({ size }))}
          data-testid={testId ?? 'progress'}
        >
          <div
            className={cn(
              progressIndicatorVariants({
                variant,
                animated: animated && !indeterminate,
                indeterminate,
              }),
              indicatorClassName
            )}
            style={{
              width: indeterminate ? '50%' : `${percentage}%`,
            }}
            data-testid={testId ? `${testId}-indicator` : 'progress-indicator'}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = 'Progress'

/**
 * Circular Progress Component
 *
 * A circular progress indicator.
 *
 * @example
 * ```tsx
 * <CircularProgress value={75} />
 * <CircularProgress value={100} variant="success" />
 * <CircularProgress indeterminate />
 * ```
 */
export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current progress value (0-100) */
  value?: number
  /** Circle size in pixels */
  size?: number
  /** Stroke width in pixels */
  strokeWidth?: number
  /** Progress variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  /** Show indeterminate loading state */
  indeterminate?: boolean
  /** Show value in center */
  showValue?: boolean
  /** data-testid for testing */
  'data-testid'?: string
}

const variantStrokeColors: Record<NonNullable<CircularProgressProps['variant']>, string> = {
  default: 'stroke-accent-primary',
  success: 'stroke-accent-success',
  warning: 'stroke-accent-warning',
  error: 'stroke-accent-error',
  info: 'stroke-accent-info',
  secondary: 'stroke-accent-secondary',
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      value = 0,
      size = 40,
      strokeWidth = 4,
      variant = 'default',
      indeterminate = false,
      showValue = false,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const clampedValue = Math.min(Math.max(0, value), 100)
    const offset = circumference - (clampedValue / 100) * circumference

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        data-testid={testId ?? 'circular-progress'}
        {...props}
      >
        <svg
          className={cn(indeterminate && 'animate-spin')}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            className="stroke-bg-hover"
            strokeWidth={strokeWidth}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          {/* Progress circle */}
          <circle
            className={cn(
              'transition-all duration-300 ease-out',
              variantStrokeColors[variant]
            )}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            strokeLinecap="round"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        {showValue && !indeterminate && (
          <span
            className="absolute text-xs font-medium text-text-primary"
            data-testid={testId ? `${testId}-value` : 'circular-progress-value'}
          >
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    )
  }
)
CircularProgress.displayName = 'CircularProgress'

export { Progress, CircularProgress, progressVariants, progressIndicatorVariants }
