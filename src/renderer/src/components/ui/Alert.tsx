import * as React from 'react'
import { cn } from '@renderer/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Nexus Alert Component
 *
 * An inline alert banner for displaying important messages, warnings, errors, or success states.
 * Supports multiple variants, optional icons, and dismissible functionality.
 *
 * @example
 * ```tsx
 * // Simple alert
 * <Alert>This is a default alert message.</Alert>
 *
 * // With variant
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 *
 * // Dismissible alert
 * <Alert
 *   variant="warning"
 *   title="Warning"
 *   dismissible
 *   onDismiss={() => setShowAlert(false)}
 * >
 *   This action cannot be undone.
 * </Alert>
 *
 * // With custom icon
 * <Alert icon={<CustomIcon />} variant="info">
 *   Custom icon alert
 * </Alert>
 * ```
 */

const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'flex gap-3',
    '[&>svg]:flex-shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-bg-card border-border-default',
          'text-text-primary',
        ].join(' '),
        success: [
          'bg-accent-success/10 border-accent-success/50',
          'text-text-primary',
          '[&_.alert-icon]:text-accent-success',
        ].join(' '),
        warning: [
          'bg-accent-warning/10 border-accent-warning/50',
          'text-text-primary',
          '[&_.alert-icon]:text-accent-warning',
        ].join(' '),
        error: [
          'bg-accent-error/10 border-accent-error/50',
          'text-text-primary',
          '[&_.alert-icon]:text-accent-error',
        ].join(' '),
        info: [
          'bg-accent-info/10 border-accent-info/50',
          'text-text-primary',
          '[&_.alert-icon]:text-accent-info',
        ].join(' '),
        destructive: [
          'bg-accent-error/10 border-accent-error',
          'text-accent-error',
          '[&_.alert-icon]:text-accent-error',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * Get the default icon for a variant
 */
function getVariantIcon(variant: AlertProps['variant']): React.ReactNode {
  const iconProps = { className: 'h-5 w-5 alert-icon' }

  switch (variant) {
    case 'success':
      return <CheckCircle2 {...iconProps} />
    case 'warning':
      return <AlertTriangle {...iconProps} />
    case 'error':
    case 'destructive':
      return <AlertCircle {...iconProps} />
    case 'info':
      return <Info {...iconProps} />
    default:
      return <Info {...iconProps} />
  }
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alert title */
  title?: string
  /** Custom icon (overrides default variant icon) */
  icon?: React.ReactNode
  /** Whether to show an icon (default: true) */
  showIcon?: boolean
  /** Whether the alert can be dismissed */
  dismissible?: boolean
  /** Called when the alert is dismissed */
  onDismiss?: () => void
  /** data-testid for testing */
  'data-testid'?: string
}

/**
 * Alert Component
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'default',
      title,
      icon,
      showIcon = true,
      dismissible = false,
      onDismiss,
      children,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const displayIcon = icon ?? (showIcon ? getVariantIcon(variant) : null)

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        data-testid={testId ?? 'alert'}
        {...props}
      >
        {displayIcon && <div className="flex-shrink-0 mt-0.5">{displayIcon}</div>}
        <div className="flex-1 min-w-0">
          {title && <AlertTitle>{title}</AlertTitle>}
          {children && <AlertDescription>{children}</AlertDescription>}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 ml-auto',
              'h-6 w-6 rounded-md',
              'flex items-center justify-center',
              'text-text-tertiary hover:text-text-primary',
              'hover:bg-bg-hover',
              'focus:outline-none focus:ring-2 focus:ring-border-focus',
              'transition-colors'
            )}
            aria-label="Dismiss alert"
            data-testid="alert-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

/**
 * Alert Title Component
 */
export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium text-sm leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  )
)
AlertTitle.displayName = 'AlertTitle'

/**
 * Alert Description Component
 */
export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm text-text-secondary [&_p]:leading-relaxed', className)}
      {...props}
    >
      {children}
    </div>
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription, alertVariants }
