import * as React from 'react'
import { Toaster as SonnerToaster, toast as sonnerToast, type ExternalToast } from 'sonner'
import { cn } from '@renderer/lib/utils'
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

/**
 * Nexus Toast Component
 *
 * A toast notification system built on Sonner with Nexus design styling.
 * Supports success, error, warning, info, and default variants.
 *
 * @example
 * ```tsx
 * // Add Toaster to app root
 * <Toaster />
 *
 * // Show toasts
 * toast.success('Changes saved!')
 * toast.error('Something went wrong')
 * toast.warning('This action cannot be undone')
 * toast.info('New features available')
 * toast('Default notification')
 *
 * // With options
 * toast.success('Changes saved!', {
 *   description: 'Your profile has been updated.',
 *   action: {
 *     label: 'Undo',
 *     onClick: () => handleUndo(),
 *   },
 *   duration: 5000,
 * })
 * ```
 */

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  /** Toast description/body text */
  description?: string
  /** Auto-dismiss duration in ms (default: 5000) */
  duration?: number
  /** Action button configuration */
  action?: ToastAction
  /** Cancel button configuration */
  cancel?: ToastAction
  /** Whether the toast can be dismissed */
  dismissible?: boolean
  /** Custom icon */
  icon?: React.ReactNode
  /** Called when toast is dismissed */
  onDismiss?: () => void
  /** Called when action is clicked */
  onAutoClose?: () => void
}

/**
 * Get the icon for a toast variant
 */
function getVariantIcon(variant: ToastVariant): React.ReactNode {
  const iconProps = { className: 'h-5 w-5' }

  switch (variant) {
    case 'success':
      return <CheckCircle2 {...iconProps} className="h-5 w-5 text-accent-success" />
    case 'error':
      return <AlertCircle {...iconProps} className="h-5 w-5 text-accent-error" />
    case 'warning':
      return <AlertTriangle {...iconProps} className="h-5 w-5 text-accent-warning" />
    case 'info':
      return <Info {...iconProps} className="h-5 w-5 text-accent-info" />
    default:
      return null
  }
}

/**
 * Convert our action to Sonner's action format
 */
function toSonnerAction(action?: ToastAction): ExternalToast['action'] {
  if (!action) return undefined
  return {
    label: action.label,
    onClick: action.onClick,
  }
}

/**
 * Toast API for showing notifications
 */
export const toast = {
  /**
   * Show a default toast
   */
  default: (title: string, options?: ToastOptions) => {
    return sonnerToast(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: toSonnerAction(options?.action),
      cancel: toSonnerAction(options?.cancel),
      dismissible: options?.dismissible ?? true,
      icon: options?.icon,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    })
  },

  /**
   * Show a success toast
   */
  success: (title: string, options?: ToastOptions) => {
    return sonnerToast.success(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: toSonnerAction(options?.action),
      cancel: toSonnerAction(options?.cancel),
      dismissible: options?.dismissible ?? true,
      icon: options?.icon ?? getVariantIcon('success'),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    })
  },

  /**
   * Show an error toast
   */
  error: (title: string, options?: ToastOptions) => {
    return sonnerToast.error(title, {
      description: options?.description,
      duration: options?.duration ?? 7000, // Errors stay longer
      action: toSonnerAction(options?.action),
      cancel: toSonnerAction(options?.cancel),
      dismissible: options?.dismissible ?? true,
      icon: options?.icon ?? getVariantIcon('error'),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    })
  },

  /**
   * Show a warning toast
   */
  warning: (title: string, options?: ToastOptions) => {
    return sonnerToast.warning(title, {
      description: options?.description,
      duration: options?.duration ?? 6000,
      action: toSonnerAction(options?.action),
      cancel: toSonnerAction(options?.cancel),
      dismissible: options?.dismissible ?? true,
      icon: options?.icon ?? getVariantIcon('warning'),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    })
  },

  /**
   * Show an info toast
   */
  info: (title: string, options?: ToastOptions) => {
    return sonnerToast.info(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: toSonnerAction(options?.action),
      cancel: toSonnerAction(options?.cancel),
      dismissible: options?.dismissible ?? true,
      icon: options?.icon ?? getVariantIcon('info'),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    })
  },

  /**
   * Show a loading toast (auto-dismisses when promise resolves)
   */
  loading: (title: string, options?: Omit<ToastOptions, 'duration'>) => {
    return sonnerToast.loading(title, {
      description: options?.description,
      dismissible: options?.dismissible ?? false,
      icon: options?.icon,
      onDismiss: options?.onDismiss,
    })
  },

  /**
   * Show a promise-based toast
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
      description?: string
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      description: options.description,
    })
  },

  /**
   * Dismiss a toast by ID or all toasts
   */
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  },

  /**
   * Show a custom toast with render function
   */
  custom: (
    render: (id: string | number) => React.ReactElement,
    options?: { duration?: number }
  ) => {
    return sonnerToast.custom(render, options)
  },
}

export interface ToasterProps {
  /** Position of the toaster */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  /** Expand toasts by default */
  expand?: boolean
  /** Rich colors mode */
  richColors?: boolean
  /** Close button on toasts */
  closeButton?: boolean
  /** Maximum visible toasts */
  visibleToasts?: number
  /** Gap between toasts */
  gap?: number
  /** Custom class name */
  className?: string
}

/**
 * Toaster Provider Component
 *
 * Add this to your app root to enable toast notifications.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <MainContent />
 *       <Toaster />
 *     </>
 *   )
 * }
 * ```
 */
export function Toaster({
  position = 'bottom-right',
  expand = false,
  richColors = true,
  closeButton = true,
  visibleToasts = 3,
  gap = 8,
  className,
}: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      expand={expand}
      richColors={richColors}
      closeButton={closeButton}
      visibleToasts={visibleToasts}
      gap={gap}
      className={cn('toaster group', className)}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            'group toast',
            'flex items-start gap-3 p-4 rounded-lg shadow-lg',
            'bg-bg-card border border-border-default',
            'text-text-primary',
            'data-[type=success]:border-l-4 data-[type=success]:border-l-accent-success',
            'data-[type=error]:border-l-4 data-[type=error]:border-l-accent-error',
            'data-[type=warning]:border-l-4 data-[type=warning]:border-l-accent-warning',
            'data-[type=info]:border-l-4 data-[type=info]:border-l-accent-info'
          ),
          title: 'text-sm font-medium text-text-primary',
          description: 'text-sm text-text-secondary mt-1',
          actionButton: cn(
            'inline-flex items-center justify-center',
            'h-8 px-3 rounded-md text-sm font-medium',
            'bg-accent-primary text-white',
            'hover:bg-accent-primary/90',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-card',
            'transition-colors'
          ),
          cancelButton: cn(
            'inline-flex items-center justify-center',
            'h-8 px-3 rounded-md text-sm font-medium',
            'bg-bg-hover text-text-secondary',
            'hover:bg-bg-muted hover:text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 focus:ring-offset-bg-card',
            'transition-colors'
          ),
          closeButton: cn(
            'absolute right-2 top-2',
            'h-6 w-6 rounded-md',
            'flex items-center justify-center',
            'text-text-tertiary hover:text-text-primary',
            'hover:bg-bg-hover',
            'focus:outline-none focus:ring-2 focus:ring-border-focus',
            'transition-colors'
          ),
          icon: 'flex-shrink-0',
          content: 'flex-1 min-w-0',
          success: '',
          error: '',
          warning: '',
          info: '',
          loading: '',
          default: '',
        },
      }}
    />
  )
}

// Export default toast for quick access
export default toast
