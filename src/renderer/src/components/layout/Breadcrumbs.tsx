import React from 'react'
import { Link } from 'react-router'
import { cn } from '@renderer/lib/utils'
import { ChevronRight, Home, MoreHorizontal, type LucideIcon } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItem {
  /** Breadcrumb label */
  label: string
  /** Navigation href */
  href?: string
  /** Leading icon */
  icon?: LucideIcon
  /** Is current page */
  current?: boolean
}

export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[]
  /** Custom separator element */
  separator?: React.ReactNode
  /** Max items to show (overflow handled) */
  maxItems?: number
  /** Additional className */
  className?: string
  /** Show home icon as first item */
  showHome?: boolean
  /** Home href */
  homeHref?: string
}

// ============================================================================
// BreadcrumbSeparator
// ============================================================================

function BreadcrumbSeparator({
  separator,
}: {
  separator?: React.ReactNode
}): React.ReactElement {
  return (
    <span className="mx-1.5 text-text-tertiary" aria-hidden="true">
      {separator || <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
    </span>
  )
}

// ============================================================================
// BreadcrumbLink
// ============================================================================

interface BreadcrumbLinkProps {
  item: BreadcrumbItem
  isLast: boolean
}

function BreadcrumbLink({ item, isLast }: BreadcrumbLinkProps): React.ReactElement {
  const Icon = item.icon

  const content = (
    <span className="flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
      <span className="truncate max-w-[200px]">{item.label}</span>
    </span>
  )

  if (isLast || item.current || !item.href) {
    return (
      <span
        className={cn(
          'text-sm font-medium',
          isLast ? 'text-text-primary' : 'text-text-secondary'
        )}
        aria-current={isLast ? 'page' : undefined}
        data-testid={`breadcrumb-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      to={item.href}
      className={cn(
        'text-sm text-text-secondary hover:text-text-primary',
        'transition-colors',
        'focus-visible:outline-none focus-visible:underline'
      )}
      data-testid={`breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {content}
    </Link>
  )
}

// ============================================================================
// BreadcrumbEllipsis
// ============================================================================

interface BreadcrumbEllipsisProps {
  hiddenItems: BreadcrumbItem[]
}

function BreadcrumbEllipsis({
  hiddenItems,
}: BreadcrumbEllipsisProps): React.ReactElement {
  // Simple ellipsis for now - could be extended to show dropdown menu
  return (
    <span
      className="px-1 text-text-tertiary hover:text-text-secondary cursor-default"
      title={hiddenItems.map((i) => i.label).join(' / ')}
      data-testid="breadcrumb-ellipsis"
    >
      <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
    </span>
  )
}

// ============================================================================
// Breadcrumbs
// ============================================================================

export function Breadcrumbs({
  items,
  separator,
  maxItems = 4,
  className,
  showHome = false,
  homeHref = '/',
}: BreadcrumbsProps): React.ReactElement | null {
  if (!items || items.length === 0) {
    return null
  }

  // Add home item if requested
  const allItems = showHome
    ? [{ label: 'Home', href: homeHref, icon: Home }, ...items]
    : items

  // Handle overflow
  const shouldTruncate = maxItems > 0 && allItems.length > maxItems
  let visibleItems: BreadcrumbItem[]
  let hiddenItems: BreadcrumbItem[] = []

  if (shouldTruncate) {
    // Show first, ellipsis, and last (maxItems - 2) items
    const itemsToShow = maxItems - 1 // Account for ellipsis
    visibleItems = [
      allItems[0],
      ...allItems.slice(-(itemsToShow - 1)),
    ]
    hiddenItems = allItems.slice(1, -(itemsToShow - 1))
  } else {
    visibleItems = allItems
  }

  return (
    <nav
      className={cn('flex items-center', className)}
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
    >
      <ol className="flex items-center flex-wrap">
        {visibleItems.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === visibleItems.length - 1
          const showEllipsis = shouldTruncate && index === 0 && !isLast

          return (
            <li key={item.label} className="flex items-center">
              {/* Separator (not before first item) */}
              {!isFirst && <BreadcrumbSeparator separator={separator} />}

              {/* Breadcrumb item */}
              <BreadcrumbLink item={item} isLast={isLast} />

              {/* Ellipsis after first item if truncating */}
              {showEllipsis && (
                <>
                  <BreadcrumbSeparator separator={separator} />
                  <BreadcrumbEllipsis hiddenItems={hiddenItems} />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { BreadcrumbSeparator, BreadcrumbLink, BreadcrumbEllipsis }
