import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@renderer/lib/utils'

/**
 * Nexus Tooltip Component
 *
 * A tooltip component for displaying additional information on hover or focus.
 * Built on Radix UI Tooltip primitive with Nexus styling.
 *
 * @example
 * ```tsx
 * // Basic tooltip
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 *
 * // With title and description
 * <Tooltip
 *   title="Settings"
 *   content="Configure your application preferences"
 * >
 *   <IconButton icon={<Settings />} label="Settings" />
 * </Tooltip>
 *
 * // Custom positioning
 * <Tooltip content="Top tooltip" side="top" align="start">
 *   <button>Hover me</button>
 * </Tooltip>
 *
 * // Controlled tooltip
 * const [open, setOpen] = useState(false)
 * <Tooltip
 *   content="Controlled"
 *   open={open}
 *   onOpenChange={setOpen}
 * >
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */

export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode
  /** Optional tooltip title */
  title?: string
  /** The trigger element */
  children: React.ReactNode
  /** Side of the trigger to show tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end'
  /** Offset from trigger in pixels */
  sideOffset?: number
  /** Delay before showing (ms) */
  delayDuration?: number
  /** Whether tooltip is disabled */
  disabled?: boolean
  /** Controlled open state */
  open?: boolean
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void
  /** Additional class name for content */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

/**
 * Tooltip Component
 */
function Tooltip({
  content,
  title,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delayDuration = 300,
  disabled = false,
  open,
  onOpenChange,
  className,
  'data-testid': testId,
}: TooltipProps) {
  if (disabled || (!content && !title)) {
    return <>{children}</>
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild data-testid={testId ? `${testId}-trigger` : undefined}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn(
              'z-tooltip',
              'max-w-xs px-3 py-2 rounded-md',
              'bg-bg-card border border-border-default shadow-lg',
              'text-sm text-text-primary',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2',
              className
            )}
            data-testid={testId ?? 'tooltip'}
          >
            {title && (
              <div className="font-medium text-text-primary mb-1">{title}</div>
            )}
            {typeof content === 'string' ? (
              <span className="text-text-secondary">{content}</span>
            ) : (
              content
            )}
            <TooltipPrimitive.Arrow
              className="fill-bg-card stroke-border-default stroke-1"
              width={11}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

/**
 * Tooltip Provider Component
 *
 * Wrap your app with this to share delay duration across all tooltips.
 *
 * @example
 * ```tsx
 * <TooltipProvider delayDuration={200}>
 *   <App />
 * </TooltipProvider>
 * ```
 */
export interface TooltipProviderProps {
  children: React.ReactNode
  /** Default delay duration for all tooltips (ms) */
  delayDuration?: number
  /** Skip delay when quickly moving between triggers */
  skipDelayDuration?: number
  /** Disable closing when hovering over content */
  disableHoverableContent?: boolean
}

function TooltipProvider({
  children,
  delayDuration = 300,
  skipDelayDuration = 300,
  disableHoverableContent = false,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      {children}
    </TooltipPrimitive.Provider>
  )
}

// Export Radix primitives for advanced usage
const TooltipRoot = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipPortal = TooltipPrimitive.Portal

/**
 * Tooltip Content - for advanced/custom usage
 */
const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-tooltip',
      'max-w-xs px-3 py-2 rounded-md',
      'bg-bg-card border border-border-default shadow-lg',
      'text-sm text-text-primary',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2',
      'data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2',
      'data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const TooltipArrow = TooltipPrimitive.Arrow

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipArrow,
}
