import * as React from 'react'
import { cn } from '@renderer/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * Nexus Spinner Component
 *
 * A loading spinner component with multiple sizes and colors.
 *
 * @example
 * ```tsx
 * // Basic spinner
 * <Spinner />
 *
 * // Different sizes
 * <Spinner size="xs" />
 * <Spinner size="sm" />
 * <Spinner size="md" />
 * <Spinner size="lg" />
 * <Spinner size="xl" />
 *
 * // Different colors
 * <Spinner color="primary" />
 * <Spinner color="white" />
 * <Spinner color="success" />
 *
 * // With label
 * <Spinner label="Loading..." />
 * ```
 */

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spinner size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Spinner color */
  color?: 'primary' | 'secondary' | 'white' | 'muted' | 'success' | 'error' | 'warning' | 'inherit'
  /** Screen reader label */
  label?: string
  /** data-testid for testing */
  'data-testid'?: string
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

const colorClasses = {
  primary: 'text-accent-primary',
  secondary: 'text-accent-secondary',
  white: 'text-white',
  muted: 'text-text-tertiary',
  success: 'text-accent-success',
  error: 'text-accent-error',
  warning: 'text-accent-warning',
  inherit: 'text-current',
}

/**
 * Spinner Component
 */
function Spinner({
  size = 'md',
  color = 'muted',
  label,
  className,
  'data-testid': testId,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex', className)}
      data-testid={testId ?? 'spinner'}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizeClasses[size], colorClasses[color])} />
      {label && <span className="sr-only">{label}</span>}
    </div>
  )
}

/**
 * Loading Overlay Component
 *
 * A centered loading spinner with optional message.
 *
 * @example
 * ```tsx
 * <LoadingOverlay />
 * <LoadingOverlay message="Loading data..." />
 * <LoadingOverlay size="lg" fullScreen />
 * ```
 */
export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Loading message */
  message?: string
  /** Spinner size */
  size?: SpinnerProps['size']
  /** Spinner color */
  color?: SpinnerProps['color']
  /** Cover full screen */
  fullScreen?: boolean
  /** Show backdrop */
  backdrop?: boolean
  /** data-testid for testing */
  'data-testid'?: string
}

function LoadingOverlay({
  message = 'Loading...',
  size = 'lg',
  color = 'primary',
  fullScreen = false,
  backdrop = false,
  className,
  'data-testid': testId,
  ...props
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen
          ? 'fixed inset-0 z-modal'
          : 'py-12',
        backdrop && 'bg-bg-dark/80',
        className
      )}
      data-testid={testId ?? 'loading-overlay'}
      {...props}
    >
      <Spinner size={size} color={color} />
      {message && (
        <p className="text-sm text-text-secondary animate-pulse">{message}</p>
      )}
    </div>
  )
}

/**
 * Button Loading Spinner
 *
 * A small spinner designed for use inside buttons.
 *
 * @example
 * ```tsx
 * <button>
 *   {loading ? <ButtonSpinner /> : null}
 *   Save
 * </button>
 * ```
 */
export interface ButtonSpinnerProps {
  /** Spinner color */
  color?: 'white' | 'inherit'
  /** Additional class name */
  className?: string
}

function ButtonSpinner({ color = 'inherit', className }: ButtonSpinnerProps) {
  return (
    <Loader2
      className={cn(
        'h-4 w-4 animate-spin',
        color === 'white' ? 'text-white' : 'text-current',
        className
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Inline Spinner
 *
 * A small spinner for inline loading states.
 *
 * @example
 * ```tsx
 * <p>Checking status <InlineSpinner /></p>
 * ```
 */
export interface InlineSpinnerProps {
  /** Spinner size */
  size?: 'xs' | 'sm'
  /** Spinner color */
  color?: SpinnerProps['color']
  /** Additional class name */
  className?: string
}

function InlineSpinner({ size = 'xs', color = 'inherit', className }: InlineSpinnerProps) {
  return (
    <Loader2
      className={cn(
        'inline-block animate-spin align-middle',
        size === 'xs' ? 'h-3 w-3' : 'h-4 w-4',
        colorClasses[color],
        className
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Page Loading
 *
 * A full-page loading state for route transitions.
 *
 * @example
 * ```tsx
 * if (loading) return <PageLoading />
 * ```
 */
export interface PageLoadingProps {
  /** Loading message */
  message?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function PageLoading({ message = 'Loading...', 'data-testid': testId }: PageLoadingProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center min-h-[400px]"
      data-testid={testId ?? 'page-loading'}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-accent-primary/20 blur-xl" />
        {/* Spinner */}
        <div className="relative z-10">
          <Spinner size="xl" color="primary" />
        </div>
      </div>
      {message && (
        <p className="mt-4 text-sm text-text-secondary">{message}</p>
      )}
    </div>
  )
}

export {
  Spinner,
  LoadingOverlay,
  ButtonSpinner,
  InlineSpinner,
  PageLoading,
}
