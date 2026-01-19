import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@renderer/lib/utils'

/**
 * Nexus Button Component
 *
 * A versatile button component that supports multiple variants, sizes,
 * loading states, and icon placement. Built with the Nexus design system.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" loading={isLoading}>
 *   Save Changes
 * </Button>
 *
 * <Button variant="secondary" icon={<PlusIcon />} iconPosition="left">
 *   Add Item
 * </Button>
 *
 * <Button variant="danger" size="icon" aria-label="Delete">
 *   <TrashIcon />
 * </Button>
 * ```
 */

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[#0D1117] focus-visible:ring-[#7C3AED]',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary - Main CTA actions (Nexus Purple)
        primary: [
          'bg-[#7C3AED] text-white',
          'hover:bg-[#6D28D9]',
          'shadow-sm hover:shadow-md hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]',
        ].join(' '),

        // Secondary - Secondary actions with border
        secondary: [
          'border border-[#30363D] bg-transparent',
          'text-[#F0F6FC]',
          'hover:bg-[#21262D] hover:border-[#6E7681]',
        ].join(' '),

        // Ghost - Minimal styling for tertiary actions
        ghost: [
          'bg-transparent text-[#8B949E]',
          'hover:bg-[#21262D] hover:text-[#F0F6FC]',
        ].join(' '),

        // Danger - Destructive actions
        danger: [
          'bg-[#EF4444] text-white',
          'hover:bg-[#DC2626]',
          'shadow-sm hover:shadow-md hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        ].join(' '),

        // Success - Positive/confirmation actions
        success: [
          'bg-[#10B981] text-white',
          'hover:bg-[#059669]',
          'shadow-sm hover:shadow-md hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        ].join(' '),

        // Link - Text link style
        link: [
          'text-[#7C3AED] underline-offset-4',
          'hover:underline hover:text-[#6D28D9]',
          'p-0 h-auto',
        ].join(' '),

        // Outline - Similar to secondary but with accent border
        outline: [
          'border-2 border-[#7C3AED] bg-transparent',
          'text-[#7C3AED]',
          'hover:bg-[#7C3AED]/10',
        ].join(' '),

        // Default - for backward compatibility (maps to primary)
        default: [
          'bg-[#7C3AED] text-white',
          'hover:bg-[#6D28D9]',
          'shadow-sm hover:shadow-md',
        ].join(' '),

        // Destructive - alias for danger (backward compatibility)
        destructive: [
          'bg-[#EF4444] text-white',
          'hover:bg-[#DC2626]',
          'shadow-sm hover:shadow-md',
        ].join(' '),
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded [&_svg]:h-3.5 [&_svg]:w-3.5',
        sm: 'h-8 px-3 text-sm rounded [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-10 px-4 text-sm rounded-md [&_svg]:h-4 [&_svg]:w-4',
        lg: 'h-11 px-6 text-base rounded-md [&_svg]:h-5 [&_svg]:w-5',
        xl: 'h-12 px-8 text-base rounded-lg [&_svg]:h-5 [&_svg]:w-5',
        icon: 'h-10 w-10 rounded-md [&_svg]:h-5 [&_svg]:w-5',
        'icon-sm': 'h-8 w-8 rounded [&_svg]:h-4 [&_svg]:w-4',
        'icon-lg': 'h-12 w-12 rounded-md [&_svg]:h-6 [&_svg]:w-6',
        // Backward compatibility
        default: 'h-10 px-4 py-2 rounded-md [&_svg]:h-4 [&_svg]:w-4',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link'
  | 'outline'
  | 'default'
  | 'destructive'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg' | 'default'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a different element using Radix Slot */
  asChild?: boolean
  /** Shows loading spinner and disables interaction */
  loading?: boolean
  /** Icon element to display */
  icon?: React.ReactNode
  /** Position of icon relative to text */
  iconPosition?: 'left' | 'right'
  /** Test ID for Playwright testing */
  'data-testid'?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading
    const isIconOnly = size?.toString().startsWith('icon')

    // Determine what icon to show
    const iconElement = loading ? (
      <Loader2 className="animate-spin" aria-hidden="true" />
    ) : (
      icon
    )

    // For icon-only buttons, just show the icon
    if (isIconOnly) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          {...props}
        >
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : children || icon}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {iconElement && iconPosition === 'left' && iconElement}
        {loading && !icon ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
        {iconElement && iconPosition === 'right' && !loading && iconElement}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
