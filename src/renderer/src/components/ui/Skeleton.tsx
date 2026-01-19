import * as React from 'react'
import { cn } from '@renderer/lib/utils'

/**
 * Nexus Skeleton Component
 *
 * A loading placeholder component that mimics the shape of content while it loads.
 * Supports multiple variants for different content types.
 *
 * @example
 * ```tsx
 * // Basic skeleton
 * <Skeleton className="h-4 w-full" />
 *
 * // Different shapes
 * <Skeleton variant="circular" className="h-10 w-10" />
 * <Skeleton variant="rounded" className="h-24 w-full" />
 *
 * // Different animations
 * <Skeleton animation="wave" className="h-4 w-full" />
 * <Skeleton animation="none" className="h-4 w-full" />
 *
 * // With inline styles
 * <Skeleton width={200} height={20} />
 * ```
 */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none'
  /** Width in pixels or CSS value */
  width?: number | string
  /** Height in pixels or CSS value */
  height?: number | string
  /** data-testid for testing */
  'data-testid'?: string
}

/**
 * Skeleton Component
 */
function Skeleton({
  className,
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  style,
  'data-testid': testId,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-bg-hover via-bg-muted to-bg-hover bg-[length:200%_100%]',
    none: '',
  }

  return (
    <div
      className={cn(
        'bg-bg-hover',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      data-testid={testId ?? 'skeleton'}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * Card Skeleton - Pre-built pattern for loading cards
 *
 * @example
 * ```tsx
 * <CardSkeleton />
 * <CardSkeleton showFooter={false} />
 * ```
 */
export interface CardSkeletonProps {
  /** Show footer section */
  showFooter?: boolean
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function CardSkeleton({
  showFooter = true,
  className,
  'data-testid': testId,
}: CardSkeletonProps) {
  return (
    <div
      className={cn('p-4 border border-border-default rounded-lg space-y-3', className)}
      data-testid={testId ?? 'card-skeleton'}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {showFooter && (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      )}
    </div>
  )
}

/**
 * List Skeleton - Pre-built pattern for loading lists
 *
 * @example
 * ```tsx
 * <ListSkeleton count={5} />
 * <ListSkeleton count={3} withAvatar />
 * ```
 */
export interface ListSkeletonProps {
  /** Number of list items */
  count?: number
  /** Show avatar placeholder */
  withAvatar?: boolean
  /** Show secondary text line */
  withSecondaryText?: boolean
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function ListSkeleton({
  count = 3,
  withAvatar = false,
  withSecondaryText = true,
  className,
  'data-testid': testId,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} data-testid={testId ?? 'list-skeleton'}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 p-3',
            'border border-border-default rounded-md'
          )}
        >
          {withAvatar && <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            {withSecondaryText && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Table Skeleton - Pre-built pattern for loading tables
 *
 * @example
 * ```tsx
 * <TableSkeleton rows={5} columns={4} />
 * ```
 */
export interface TableSkeletonProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  columns?: number
  /** Show header row */
  showHeader?: boolean
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  'data-testid': testId,
}: TableSkeletonProps) {
  return (
    <div
      className={cn('border border-border-default rounded-md overflow-hidden', className)}
      data-testid={testId ?? 'table-skeleton'}
    >
      {showHeader && (
        <div className="flex gap-4 p-3 bg-bg-muted border-b border-border-default">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'flex gap-4 p-3',
            rowIndex < rows - 1 && 'border-b border-border-default'
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Avatar Skeleton - Pre-built pattern for loading avatars
 *
 * @example
 * ```tsx
 * <AvatarSkeleton size="md" />
 * <AvatarSkeleton size="lg" withName />
 * ```
 */
export interface AvatarSkeletonProps {
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Show name placeholder */
  withName?: boolean
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

const avatarSizes = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

function AvatarSkeleton({
  size = 'md',
  withName = false,
  className,
  'data-testid': testId,
}: AvatarSkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} data-testid={testId ?? 'avatar-skeleton'}>
      <Skeleton variant="circular" className={avatarSizes[size]} />
      {withName && (
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      )}
    </div>
  )
}

/**
 * Text Skeleton - Pre-built pattern for loading text blocks
 *
 * @example
 * ```tsx
 * <TextSkeleton lines={3} />
 * ```
 */
export interface TextSkeletonProps {
  /** Number of lines */
  lines?: number
  /** Last line width percentage */
  lastLineWidth?: string
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function TextSkeleton({
  lines = 3,
  lastLineWidth = 'w-3/4',
  className,
  'data-testid': testId,
}: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} data-testid={testId ?? 'text-skeleton'}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? lastLineWidth : 'w-full')}
        />
      ))}
    </div>
  )
}

/**
 * Form Skeleton - Pre-built pattern for loading forms
 *
 * @example
 * ```tsx
 * <FormSkeleton fields={4} />
 * ```
 */
export interface FormSkeletonProps {
  /** Number of form fields */
  fields?: number
  /** Show submit button */
  showSubmit?: boolean
  /** Additional class name */
  className?: string
  /** data-testid for testing */
  'data-testid'?: string
}

function FormSkeleton({
  fields = 3,
  showSubmit = true,
  className,
  'data-testid': testId,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} data-testid={testId ?? 'form-skeleton'}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      )}
    </div>
  )
}

export {
  Skeleton,
  CardSkeleton,
  ListSkeleton,
  TableSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  FormSkeleton,
}
