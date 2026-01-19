import React, { useState, useCallback, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  Sidebar,
  SidebarNav,
  SidebarSection,
  defaultNavigationItems,
  settingsNavigationItems,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarItem,
} from './Sidebar'
import { Header, type HeaderProps } from './Header'
import type { BreadcrumbItem } from './Breadcrumbs'

// ============================================================================
// Types
// ============================================================================

export interface PageLayoutProps {
  /** Page content */
  children: React.ReactNode
  /** Page title for header */
  title?: string
  /** Page subtitle */
  subtitle?: string
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[]
  /** Header actions (buttons, etc.) */
  actions?: React.ReactNode
  /** Show back button in header */
  showBack?: boolean
  /** Back button handler */
  onBack?: () => void
  /** Custom sidebar navigation items */
  navigationItems?: SidebarItem[]
  /** Hide sidebar completely */
  hideSidebar?: boolean
  /** Hide header completely */
  hideHeader?: boolean
  /** Full width content (no padding) */
  fullWidth?: boolean
  /** Additional className for main content */
  className?: string
  /** Loading state */
  loading?: boolean
  /** Header icon */
  headerIcon?: HeaderProps['icon']
  /** Custom sidebar footer */
  sidebarFooter?: React.ReactNode
  /** Persist sidebar state to localStorage */
  persistSidebarState?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_STATE_KEY = 'nexus-sidebar-collapsed'

// ============================================================================
// PageLayout
// ============================================================================

export function PageLayout({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  showBack = false,
  onBack,
  navigationItems,
  hideSidebar = false,
  hideHeader = false,
  fullWidth = false,
  className,
  loading = false,
  headerIcon,
  sidebarFooter,
  persistSidebarState = true,
}: PageLayoutProps): React.ReactElement {
  // Initialize collapsed state from localStorage or default to false
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (!persistSidebarState) return false
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY)
      return saved === 'true'
    } catch {
      return false
    }
  })

  // Persist sidebar state changes
  useEffect(() => {
    if (persistSidebarState) {
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed))
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [sidebarCollapsed, persistSidebarState])

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  // Use custom navigation items or defaults
  const navItems = navigationItems || defaultNavigationItems

  return (
    <div className="flex min-h-screen bg-bg-dark" data-testid="page-layout">
      {/* Sidebar */}
      {!hideSidebar && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          footer={sidebarFooter}
        >
          {/* Main navigation */}
          <SidebarSection>
            <SidebarNav items={navItems} collapsed={sidebarCollapsed} />
          </SidebarSection>

          {/* Settings navigation (at bottom) */}
          <SidebarSection className="mt-auto pt-4 border-t border-border-default">
            <SidebarNav items={settingsNavigationItems} collapsed={sidebarCollapsed} />
          </SidebarSection>
        </Sidebar>
      )}

      {/* Main content area */}
      <div
        className={cn('flex flex-col flex-1 min-w-0')}
        style={{
          width: hideSidebar
            ? '100%'
            : `calc(100% - ${sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px)`,
        }}
      >
        {/* Header */}
        {!hideHeader && (
          <Header
            title={title}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            actions={actions}
            showBack={showBack}
            onBack={onBack}
            icon={headerIcon}
            loading={loading}
          />
        )}

        {/* Page content */}
        <main
          className={cn(
            'flex-1',
            !fullWidth && 'p-6',
            className
          )}
          data-testid="page-content"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// PageSection - Helper for organizing content within a page
// ============================================================================

export interface PageSectionProps {
  /** Section content */
  children: React.ReactNode
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Right-side actions */
  actions?: React.ReactNode
  /** Additional className */
  className?: string
  /** Card-style background */
  card?: boolean
}

export function PageSection({
  children,
  title,
  description,
  actions,
  className,
  card = false,
}: PageSectionProps): React.ReactElement {
  return (
    <section
      className={cn(
        card && 'bg-bg-card rounded-lg border border-border-default p-6',
        className
      )}
      data-testid="page-section"
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-text-secondary mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

// ============================================================================
// PageGrid - Helper for grid layouts
// ============================================================================

export interface PageGridProps {
  /** Grid content */
  children: React.ReactNode
  /** Number of columns (responsive) */
  columns?: 1 | 2 | 3 | 4
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
}

export function PageGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: PageGridProps): React.ReactElement {
  return (
    <div
      className={cn('grid', columnClasses[columns], gapClasses[gap], className)}
      data-testid="page-grid"
    >
      {children}
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { SidebarItem, BreadcrumbItem }
