import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@renderer/lib/utils'

/**
 * Nexus Toggle (Switch) Component
 *
 * A toggle switch component for boolean settings with optional label and description.
 * Built on Radix UI Switch for accessibility.
 *
 * @example
 * ```tsx
 * // Simple toggle
 * <Toggle
 *   checked={useCliBackend}
 *   onChange={setUseCliBackend}
 * />
 *
 * // With label and description
 * <Toggle
 *   label="Use CLI Backend"
 *   description="Use the Claude CLI instead of API for requests"
 *   checked={settings.claude.backend === 'cli'}
 *   onChange={handleBackendChange}
 * />
 *
 * // Disabled state
 * <Toggle
 *   label="Auto-save"
 *   checked={autoSave}
 *   onChange={setAutoSave}
 *   disabled
 * />
 * ```
 */

export type ToggleSize = 'sm' | 'md' | 'lg'

export interface ToggleProps {
  /** Checked state */
  checked?: boolean
  /** Default checked (uncontrolled) */
  defaultChecked?: boolean
  /** Change callback */
  onChange?: (checked: boolean) => void
  /** Label text */
  label?: string
  /** Description below label */
  description?: string
  /** Disable toggle */
  disabled?: boolean
  /** Size preset */
  size?: ToggleSize
  /** Name for form submission */
  name?: string
  /** ID for label association */
  id?: string
  /** Additional className */
  className?: string
  /** Test ID for Playwright testing */
  'data-testid'?: string
}

// Size dimensions for track and thumb
const sizeDimensions: Record<ToggleSize, { track: string; thumb: string; translate: string }> = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'h-3 w-3',
    translate: 'data-[state=checked]:translate-x-4',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'h-4 w-4',
    translate: 'data-[state=checked]:translate-x-5',
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'h-5 w-5',
    translate: 'data-[state=checked]:translate-x-6',
  },
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked,
      defaultChecked,
      onChange,
      label,
      description,
      disabled = false,
      size = 'md',
      name,
      id,
      className,
      'data-testid': dataTestId,
    },
    ref
  ) => {
    const toggleId = id || React.useId()
    const descriptionId = `${toggleId}-description`
    const { track, thumb, translate } = sizeDimensions[size]

    // Determine if controlled or uncontrolled
    const isControlled = checked !== undefined
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
    const actualChecked = isControlled ? checked : internalChecked

    const handleChange = (newChecked: boolean) => {
      if (!isControlled) {
        setInternalChecked(newChecked)
      }
      onChange?.(newChecked)
    }

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <SwitchPrimitive.Root
          ref={ref}
          id={toggleId}
          checked={actualChecked}
          onCheckedChange={handleChange}
          disabled={disabled}
          name={name}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            // Base styles
            'peer inline-flex shrink-0 cursor-pointer items-center rounded-full',
            'border-2 border-transparent',
            'transition-colors duration-200',
            // Focus styles
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2',
            'focus-visible:ring-offset-[#0D1117]',
            // Disabled styles
            'disabled:cursor-not-allowed disabled:opacity-50',
            // State-based background
            'data-[state=unchecked]:bg-[#30363D]',
            'data-[state=checked]:bg-[#7C3AED]',
            // Size
            track
          )}
          data-testid={dataTestId}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              // Base styles
              'pointer-events-none block rounded-full',
              'bg-white shadow-sm',
              'transition-transform duration-200',
              // Position
              'translate-x-0.5',
              translate,
              // Size
              thumb
            )}
          />
        </SwitchPrimitive.Root>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={toggleId}
                className={cn(
                  'text-sm font-medium text-[#F0F6FC] cursor-pointer',
                  'select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  'text-xs text-[#6E7681]',
                  disabled && 'opacity-50'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Toggle.displayName = 'Toggle'

/**
 * ToggleGroup Component
 *
 * A container for grouping multiple Toggle components with consistent styling.
 *
 * @example
 * ```tsx
 * <ToggleGroup title="Notifications">
 *   <Toggle label="Email" checked={emailEnabled} onChange={setEmailEnabled} />
 *   <Toggle label="Push" checked={pushEnabled} onChange={setPushEnabled} />
 *   <Toggle label="SMS" checked={smsEnabled} onChange={setSmsEnabled} />
 * </ToggleGroup>
 * ```
 */
interface ToggleGroupProps {
  /** Group title */
  title?: string
  /** Group description */
  description?: string
  /** Toggle components */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

const ToggleGroup = ({ title, description, children, className }: ToggleGroupProps) => {
  return (
    <div
      className={cn(
        'rounded-md border border-[#30363D] bg-[#161B22]',
        'p-4 space-y-4',
        className
      )}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-medium text-[#F0F6FC]">{title}</h4>
          )}
          {description && (
            <p className="text-xs text-[#6E7681]">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  )
}
ToggleGroup.displayName = 'ToggleGroup'

export { Toggle, ToggleGroup }
