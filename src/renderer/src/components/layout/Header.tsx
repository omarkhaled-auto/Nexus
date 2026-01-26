import React from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@renderer/lib/utils'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'

// ============================================================================
// Types
// ============================================================================

export interface HeaderProps {
  /** Page title */
  title?: string
  /** Page subtitle */
  subtitle?: string
  /** Breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[]
  /** Right-side actions */
  actions?: React.ReactNode
  /** Left-side content (before title) */
  leftContent?: React.ReactNode
  /** Show back button */
  showBack?: boolean
  /** Back button handler (defaults to navigate(-1)) */
  onBack?: () => void
  /** Additional className */
  className?: string
  /** Sticky header */
  sticky?: boolean
  /** Leading icon for title */
  icon?: LucideIcon
  /** Loading state */
  loading?: boolean
}

// ============================================================================
// Header
// ============================================================================

export function Header({
  title,
  subtitle,
  breadcrumbs,
  actions,
  leftContent,
  showBack = false,
  onBack,
  className,
  sticky = true,
  icon: Icon,
  loading = false,
}: HeaderProps): React.ReactElement {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      void navigate(-1)
    }
  }

  return (
    <header
      className={cn(
        'flex items-center justify-between px-6 py-4',
        'bg-bg-card border-b border-border-default',
        'min-h-[56px]',
        sticky && 'sticky top-0 z-30',
        className
      )}
      data-testid="page-header"
    >
      {/* Left side */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Back button */}
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md shrink-0',
              'text-text-secondary hover:text-text-primary',
              'hover:bg-bg-hover transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'
            )}
            aria-label="Go back"
            data-testid="header-back-button"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}

        {/* Custom left content */}
        {leftContent}

        {/* Title and breadcrumbs */}
        <div className="flex flex-col min-w-0">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} className="mb-1" />
          )}

          {/* Title row */}
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon
                className="w-5 h-5 text-text-secondary shrink-0"
                strokeWidth={1.5}
              />
            )}

            {title && (
              <h1
                className={cn(
                  'text-lg font-semibold text-text-primary truncate',
                  loading && 'animate-pulse bg-bg-hover rounded w-32 h-6'
                )}
                data-testid="header-title"
              >
                {!loading && title}
              </h1>
            )}

            {subtitle && (
              <span
                className={cn(
                  'text-sm text-text-secondary truncate',
                  'hidden sm:inline'
                )}
                data-testid="header-subtitle"
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4" data-testid="header-actions">
          {actions}
        </div>
      )}
    </header>
  )
}

// ============================================================================
// HeaderSkeleton
// ============================================================================

export function HeaderSkeleton(): React.ReactElement {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-6 py-4',
        'bg-bg-card border-b border-border-default',
        'min-h-[56px]'
      )}
      data-testid="header-skeleton"
    >
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-md bg-bg-hover animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="w-24 h-4 rounded bg-bg-hover animate-pulse" />
          <div className="w-40 h-6 rounded bg-bg-hover animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-9 rounded-md bg-bg-hover animate-pulse" />
        <div className="w-20 h-9 rounded-md bg-bg-hover animate-pulse" />
      </div>
    </header>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { type BreadcrumbItem }
