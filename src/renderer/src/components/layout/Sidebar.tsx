import React, { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '@renderer/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Bot,
  Terminal,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

export interface SidebarItem {
  /** Unique identifier */
  id: string
  /** Display label */
  label: string
  /** Icon element */
  icon: LucideIcon
  /** Navigation href */
  href?: string
  /** Click handler (alternative to href) */
  onClick?: () => void
  /** Badge content */
  badge?: string | number
  /** Badge variant */
  badgeVariant?: BadgeVariant
  /** Active state */
  active?: boolean
  /** Nested items */
  children?: SidebarItem[]
  /** Disabled state */
  disabled?: boolean
}

export interface SidebarNavProps {
  /** Navigation items */
  items: SidebarItem[]
  /** Active item ID */
  activeId?: string
  /** Item click callback */
  onItemClick?: (id: string) => void
  /** Collapsed state */
  collapsed?: boolean
}

export interface SidebarProps {
  /** Collapsed state */
  collapsed?: boolean
  /** Collapse toggle callback */
  onToggle?: () => void
  /** Content (typically SidebarNav) */
  children?: React.ReactNode
  /** Additional className */
  className?: string
  /** Header content */
  header?: React.ReactNode
  /** Footer content */
  footer?: React.ReactNode
}

// ============================================================================
// Constants
// ============================================================================

export const SIDEBAR_WIDTH_EXPANDED = 240
export const SIDEBAR_WIDTH_COLLAPSED = 64

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-hover text-text-primary',
  success: 'bg-accent-success/20 text-accent-success',
  warning: 'bg-accent-warning/20 text-accent-warning',
  error: 'bg-accent-error/20 text-accent-error',
  info: 'bg-accent-info/20 text-accent-info',
  purple: 'bg-accent-primary/20 text-accent-primary',
}

// ============================================================================
// SidebarItemComponent
// ============================================================================

interface SidebarItemComponentProps {
  item: SidebarItem
  collapsed?: boolean
  level?: number
  onItemClick?: (id: string) => void
}

function SidebarItemComponent({
  item,
  collapsed = false,
  level = 0,
  onItemClick,
}: SidebarItemComponentProps): React.ReactElement {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)

  const isActive = item.href ? location.pathname === item.href || location.pathname.startsWith(item.href + '/') : item.active

  const hasChildren = item.children && item.children.length > 0

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (item.disabled) {
        e.preventDefault()
        return
      }

      if (hasChildren && !collapsed) {
        e.preventDefault()
        setIsExpanded((prev) => !prev)
      }

      if (item.onClick) {
        item.onClick()
      }

      if (onItemClick) {
        onItemClick(item.id)
      }
    },
    [item, hasChildren, collapsed, onItemClick]
  )

  const Icon = item.icon

  const content = (
    <>
      <span
        className={cn(
          'flex items-center justify-center shrink-0',
          collapsed ? 'w-10 h-10' : 'w-8 h-8'
        )}
      >
        <Icon
          className={cn(
            'transition-colors',
            collapsed ? 'w-5 h-5' : 'w-4 h-4',
            isActive ? 'text-accent-primary' : 'text-text-secondary group-hover:text-text-primary'
          )}
          strokeWidth={1.5}
        />
      </span>

      {!collapsed && (
        <>
          <span
            className={cn(
              'flex-1 text-sm font-medium truncate transition-colors',
              isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
            )}
          >
            {item.label}
          </span>

          {item.badge !== undefined && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs font-medium rounded-md',
                badgeVariantClasses[item.badgeVariant || 'default']
              )}
            >
              {item.badge}
            </span>
          )}

          {hasChildren && (
            <ChevronDown
              className={cn(
                'w-4 h-4 text-text-tertiary transition-transform',
                isExpanded && 'rotate-180'
              )}
              strokeWidth={1.5}
            />
          )}
        </>
      )}
    </>
  )

  const baseClassName = cn(
    'group flex items-center gap-2 rounded-md transition-all duration-normal',
    collapsed ? 'justify-center p-2' : 'px-3 py-2',
    level > 0 && !collapsed && 'ml-6',
    isActive && 'bg-accent-primary/10',
    !isActive && 'hover:bg-bg-hover',
    item.disabled && 'opacity-50 cursor-not-allowed',
    !item.disabled && 'cursor-pointer'
  )

  return (
    <>
      {item.href && !hasChildren ? (
        <Link
          to={item.href}
          className={baseClassName}
          onClick={handleClick}
          title={collapsed ? item.label : undefined}
          data-testid={`sidebar-item-${item.id}`}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={cn(baseClassName, 'w-full text-left')}
          onClick={handleClick}
          disabled={item.disabled}
          title={collapsed ? item.label : undefined}
          data-testid={`sidebar-item-${item.id}`}
        >
          {content}
        </button>
      )}

      {/* Nested items */}
      {hasChildren && !collapsed && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <SidebarItemComponent
              key={child.id}
              item={child}
              collapsed={collapsed}
              level={level + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ============================================================================
// SidebarNav
// ============================================================================

export function SidebarNav({
  items,
  activeId,
  onItemClick,
  collapsed = false,
}: SidebarNavProps): React.ReactElement {
  return (
    <nav className="flex flex-col gap-1 px-2" data-testid="sidebar-nav">
      {items.map((item) => (
        <SidebarItemComponent
          key={item.id}
          item={{ ...item, active: item.id === activeId || item.active }}
          collapsed={collapsed}
          onItemClick={onItemClick}
        />
      ))}
    </nav>
  )
}

// ============================================================================
// SidebarLogo
// ============================================================================

interface SidebarLogoProps {
  collapsed?: boolean
}

export function SidebarLogo({ collapsed = false }: SidebarLogoProps): React.ReactElement {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover rounded-lg mx-2"
      data-testid="sidebar-logo"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      {!collapsed && (
        <span className="text-lg font-semibold text-text-primary tracking-tight">Nexus</span>
      )}
    </Link>
  )
}

// ============================================================================
// SidebarToggle
// ============================================================================

interface SidebarToggleProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-md',
        'text-text-secondary hover:text-text-primary',
        'hover:bg-bg-hover transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'
      )}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      data-testid="sidebar-toggle"
    >
      {collapsed ? (
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  )
}

// ============================================================================
// SidebarSection
// ============================================================================

interface SidebarSectionProps {
  title?: string
  children: React.ReactNode
  collapsed?: boolean
  className?: string
}

export function SidebarSection({
  title,
  children,
  collapsed = false,
  className,
}: SidebarSectionProps): React.ReactElement {
  return (
    <div className={cn('space-y-1', className)}>
      {title && !collapsed && (
        <h3 className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

export function Sidebar({
  collapsed = false,
  onToggle,
  children,
  className,
  header,
  footer,
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'flex flex-col bg-bg-card border-r border-border-default',
        'transition-all duration-normal ease-out',
        'h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      data-testid="sidebar"
      data-collapsed={collapsed}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-2 border-b border-border-default">
        {header || <SidebarLogo collapsed={collapsed} />}
        {onToggle && (
          <div className={cn('pr-2', collapsed && 'absolute right-0 top-3')}>
            <SidebarToggle collapsed={collapsed} onToggle={onToggle} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto py-4">{children}</div>

      {/* Footer */}
      {footer && <div className="border-t border-border-default py-2">{footer}</div>}
    </aside>
  )
}

// ============================================================================
// Default Navigation Items
// ============================================================================

export const defaultNavigationItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: MessageSquare,
    href: '/genesis',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ListTodo,
    href: '/evolution',
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: Bot,
    href: '/agents',
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: Terminal,
    href: '/execution',
  },
]

export const settingsNavigationItems: SidebarItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
  },
]

// ============================================================================
// Exports
// ============================================================================

export {
  SidebarItemComponent,
  type SidebarItemComponentProps,
  type SidebarLogoProps,
  type SidebarToggleProps,
  type SidebarSectionProps,
}
