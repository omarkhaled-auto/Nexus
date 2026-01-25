/**
 * CardContextMenu - Right-click context menu for Kanban cards
 *
 * Features:
 * - Edit, Move to, Change priority, Delete actions
 * - Submenu support for Move to and Change priority
 * - Auto-positioning to stay within viewport
 * - Click outside to close
 */

import { useEffect, useRef, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureStatus } from '@renderer/types/feature'
import {
  Pencil,
  ArrowRight,
  CircleDot,
  Trash2,
  ChevronRight
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ColumnConfig {
  id: FeatureStatus
  title: string
  limit?: number
}

export interface CardContextMenuProps {
  /** Feature to show menu for (null = hidden) */
  feature: Feature | null
  /** Position of the menu */
  position: { x: number; y: number }
  /** Available columns for move action */
  columns: ColumnConfig[]
  /** Callback to close the menu */
  onClose: () => void
  /** Edit action */
  onEdit: (feature: Feature) => void
  /** Move to column action */
  onMoveTo: (feature: Feature, column: FeatureStatus) => void
  /** Change priority action */
  onChangePriority: (feature: Feature, priority: FeaturePriority) => void
  /** Delete action */
  onDelete: (feature: Feature) => void
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITIES: { value: FeaturePriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' }
]

// ============================================================================
// Sub-components
// ============================================================================

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  destructive?: boolean
  hasSubmenu?: boolean
  children?: React.ReactNode
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  hasSubmenu,
  children
}: MenuItemProps): ReactElement {
  const itemRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative group" ref={itemRef}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
          'hover:bg-muted rounded-md transition-colors',
          destructive && 'text-destructive hover:bg-destructive/10'
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{label}</span>
        {hasSubmenu && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Submenu */}
      {hasSubmenu && children && (
        <div className="absolute left-full top-0 ml-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
          <div className="bg-popover border border-border rounded-lg shadow-lg p-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface SubmenuItemProps {
  label: string
  onClick: () => void
  indicator?: React.ReactNode
  isActive?: boolean
}

function SubmenuItem({ label, onClick, indicator, isActive }: SubmenuItemProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
        'hover:bg-muted rounded-md transition-colors',
        isActive && 'bg-muted'
      )}
    >
      {indicator}
      <span className="flex-1">{label}</span>
      {isActive && (
        <span className="text-xs text-muted-foreground">Current</span>
      )}
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CardContextMenu({
  feature,
  position,
  columns,
  onClose,
  onEdit,
  onMoveTo,
  onChangePriority,
  onDelete
}: CardContextMenuProps): ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!feature) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Slight delay to prevent immediate close from the triggering click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [feature, onClose])

  // Calculate menu position (ensure it stays in viewport)
  const getMenuStyle = () => {
    const menuWidth = 200
    const menuHeight = 250 // Approximate
    const padding = 16

    let x = position.x
    let y = position.y

    // Adjust horizontal position
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding
    }

    // Adjust vertical position
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding
    }

    return {
      left: x,
      top: y
    }
  }

  if (!feature) return null

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-100"
      style={getMenuStyle()}
    >
      {/* Edit */}
      <MenuItem
        icon={Pencil}
        label="Edit"
        onClick={() => {
          onEdit(feature)
          onClose()
        }}
      />

      {/* Move to */}
      <MenuItem icon={ArrowRight} label="Move to" hasSubmenu>
        {columns.map((column) => (
          <SubmenuItem
            key={column.id}
            label={column.title}
            isActive={feature.status === column.id}
            onClick={() => {
              onMoveTo(feature, column.id)
              onClose()
            }}
          />
        ))}
      </MenuItem>

      {/* Change priority */}
      <MenuItem icon={CircleDot} label="Change priority" hasSubmenu>
        {PRIORITIES.map((priority) => (
          <SubmenuItem
            key={priority.value}
            label={priority.label}
            isActive={feature.priority === priority.value}
            indicator={
              <div className={cn('w-2.5 h-2.5 rounded-full', priority.color)} />
            }
            onClick={() => {
              onChangePriority(feature, priority.value)
              onClose()
            }}
          />
        ))}
      </MenuItem>

      {/* Separator */}
      <div className="my-1 h-px bg-border" />

      {/* Delete */}
      <MenuItem
        icon={Trash2}
        label="Delete"
        destructive
        onClick={() => {
          onDelete(feature)
          onClose()
        }}
      />
    </div>
  )

  return createPortal(menuContent, document.body)
}

export default CardContextMenu
