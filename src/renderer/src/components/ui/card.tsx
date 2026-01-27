import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@renderer/lib/utils'

/**
 * Nexus Card Component
 *
 * A versatile card component with multiple visual variants for different
 * use cases. Supports glassmorphism, gradients, and interactive effects.
 *
 * Variants:
 * - default: Standard card with subtle border
 * - elevated: Card with gradient background and layered shadow depth
 * - glass: Glassmorphism effect with blur and transparency
 * - gradient: Gradient background for premium feel
 * - interactive: Hover effects for clickable cards
 * - glowBorder: Accent glow border effect
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <CardHeader>
 *     <CardTitle>Feature Card</CardTitle>
 *     <CardDescription>Premium elevated card style</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </Card>
 *
 * <Card variant="glass" className="backdrop-blur-xl">
 *   Glassmorphism card
 * </Card>
 * ```
 */

const cardVariants = cva(
  // Base styles for all cards
  'rounded-lg border text-[#F0F6FC] transition-all duration-200',
  {
    variants: {
      variant: {
        // Default - Standard Nexus card
        default: 'bg-[#161B22] border-[#30363D]',

        // Elevated - Premium card with gradient and layered shadows
        elevated: [
          'bg-gradient-to-br from-[#1E232C]/95 to-[#161B22]',
          'border-[#30363D]/80',
          'shadow-[0_4px_8px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]',
        ].join(' '),

        // Glass - Glassmorphism effect for overlays
        glass: [
          'bg-[#161B22]/60 backdrop-blur-xl',
          'border-white/[0.08]',
        ].join(' '),

        // Gradient - Gradient background for visual interest
        gradient: [
          'bg-gradient-to-br from-[#1E232C]/90 to-[#161B22]/95',
          'border-[#30363D]/60',
        ].join(' '),

        // Interactive - Hover effects for clickable cards
        interactive: [
          'bg-[#161B22] border-[#30363D]',
          'hover:bg-[#21262D] hover:border-[#7C3AED]/30',
          'hover:shadow-[0_8px_16px_rgba(0,0,0,0.4),0_0_20px_rgba(124,58,237,0.15)]',
          'hover:-translate-y-0.5',
          'cursor-pointer',
        ].join(' '),

        // Glow Border - Accent glow effect
        glowBorder: [
          'bg-[#161B22] border-[#7C3AED]/30',
          'shadow-[0_0_15px_rgba(124,58,237,0.15)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-xl font-semibold leading-none tracking-tight text-[#F0F6FC]',
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[#8B949E]', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
