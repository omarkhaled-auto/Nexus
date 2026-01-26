import * as React from 'react'
import { cva } from 'class-variance-authority'
import { X, Eye, EyeOff, AlertCircle, Search } from 'lucide-react'

import { cn } from '@renderer/lib/utils'

/**
 * Nexus Input Component
 *
 * A comprehensive input component with support for labels, hints, errors,
 * icons, character counts, and password visibility toggle.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Project Name"
 *   placeholder="my-awesome-app"
 *   hint="Letters, numbers, and hyphens only"
 *   icon={<FolderIcon />}
 * />
 *
 * <Input
 *   label="API Key"
 *   type="password"
 *   error="API key is required"
 * />
 *
 * <Input
 *   placeholder="Search..."
 *   type="search"
 *   clearable
 * />
 * ```
 */

const inputVariants = cva(
  // Base styles
  [
    'flex w-full',
    'bg-[#161B22] border border-[#30363D]',
    'text-[#F0F6FC] placeholder:text-[#6E7681]',
    'transition-all duration-150',
    'focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#21262D]',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-xs rounded',
        md: 'h-10 px-3 text-sm rounded-md',
        lg: 'h-12 px-4 text-base rounded-md',
      },
      hasError: {
        true: 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20',
        false: '',
      },
      hasIcon: {
        left: 'pl-10',
        right: 'pr-10',
        both: 'pl-10 pr-10',
        none: '',
      },
    },
    defaultVariants: {
      size: 'md',
      hasError: false,
      hasIcon: 'none',
    },
  }
)

export type InputSize = 'sm' | 'md' | 'lg'
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label */
  label?: string
  /** Help text below input */
  hint?: string
  /** Error message (shows red border when set) */
  error?: string
  /** Leading icon */
  icon?: React.ReactNode
  /** Icon position */
  iconPosition?: 'left' | 'right'
  /** Stretch to container width */
  fullWidth?: boolean
  /** Size preset */
  size?: InputSize
  /** Show character count */
  showCount?: boolean
  /** Clear button */
  clearable?: boolean
  /** Clear callback */
  onClear?: () => void
  /** Label for screen readers */
  'aria-label'?: string
  /** Test ID for Playwright testing */
  'data-testid'?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      hint,
      error,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      size = 'md',
      showCount = false,
      clearable = false,
      onClear,
      disabled,
      maxLength,
      value,
      onChange,
      id,
      'aria-label': ariaLabel,
      'data-testid': dataTestId,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [charCount, setCharCount] = React.useState(0)
    const inputId = id || React.useId()
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`

    // Track character count
    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    const handleClear = () => {
      onClear?.()
      // Create synthetic event for controlled components
      const event = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(event)
      setCharCount(0)
    }

    // Determine icon placement
    const hasLeftIcon = icon && iconPosition === 'left'
    const hasRightIcon =
      icon && iconPosition === 'right' ||
      type === 'password' ||
      (clearable && charCount > 0) ||
      error

    const hasIconVariant = hasLeftIcon && hasRightIcon
      ? 'both'
      : hasLeftIcon
      ? 'left'
      : hasRightIcon
      ? 'right'
      : 'none'

    // Determine actual input type (for password toggle)
    const actualType = type === 'password' && showPassword ? 'text' : type

    // Size-based icon sizing
    const iconSizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#F0F6FC]"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {hasLeftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'text-[#6E7681] pointer-events-none',
                iconSizeClass
              )}
            >
              {type === 'search' && !icon ? <Search className={iconSizeClass} /> : icon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            onChange={handleChange}
            className={cn(
              inputVariants({ size, hasError: !!error, hasIcon: hasIconVariant }),
              className
            )}
            aria-label={ariaLabel}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            data-testid={dataTestId}
            {...props}
          />

          {/* Right side icons container */}
          {hasRightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'flex items-center gap-2'
              )}
            >
              {/* Error icon */}
              {error && (
                <AlertCircle
                  className={cn(iconSizeClass, 'text-[#EF4444]')}
                  aria-hidden="true"
                />
              )}

              {/* Clear button */}
              {clearable && charCount > 0 && !error && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'text-[#6E7681] hover:text-[#F0F6FC]',
                    'transition-colors p-0.5 rounded',
                    'focus:outline-none focus:ring-1 focus:ring-[#7C3AED]'
                  )}
                  aria-label="Clear input"
                  data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
                >
                  <X className={iconSizeClass} />
                </button>
              )}

              {/* Password toggle */}
              {type === 'password' && (
                <button
                  type="button"
                  onClick={() => { setShowPassword(!showPassword); }}
                  className={cn(
                    'text-[#6E7681] hover:text-[#F0F6FC]',
                    'transition-colors p-0.5 rounded',
                    'focus:outline-none focus:ring-1 focus:ring-[#7C3AED]'
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid={dataTestId ? `${dataTestId}-toggle-password` : undefined}
                >
                  {showPassword ? (
                    <EyeOff className={iconSizeClass} />
                  ) : (
                    <Eye className={iconSizeClass} />
                  )}
                </button>
              )}

              {/* Right positioned custom icon */}
              {icon && iconPosition === 'right' && !error && type !== 'password' && (
                <span className={cn(iconSizeClass, 'text-[#6E7681]')}>
                  {icon}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hint, error, and character count */}
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          {/* Error or hint message */}
          <div>
            {error ? (
              <p
                id={errorId}
                className="text-xs text-[#EF4444]"
                role="alert"
              >
                {error}
              </p>
            ) : hint ? (
              <p
                id={hintId}
                className="text-xs text-[#6E7681]"
              >
                {hint}
              </p>
            ) : null}
          </div>

          {/* Character count */}
          {showCount && maxLength && (
            <p
              className={cn(
                'text-xs',
                charCount >= maxLength ? 'text-[#EF4444]' : 'text-[#6E7681]'
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
