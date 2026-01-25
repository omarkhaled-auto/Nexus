import { forwardRef, useState, type HTMLAttributes } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureComplexity } from '@renderer/types/feature'
import { Pencil, ArrowRight, Trash2, User, CheckCircle2, ListTodo } from 'lucide-react'

/**
 * Priority colors for the left border indicator
 * Linear-inspired: Clean, single-color bars
 */
const priorityBorderColors: Record<FeaturePriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500'
}

/**
 * Complexity badge colors and labels
 */
const complexityConfig: Record<FeatureComplexity, { color: string; bgColor: string; label: string }> = {
  simple: { color: 'text-green-600', bgColor: 'bg-green-500/10', label: 'Simple' },
  moderate: { color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', label: 'Moderate' },
  complex: { color: 'text-orange-600', bgColor: 'bg-orange-500/10', label: 'Complex' }
}

export interface FeatureCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'onContextMenu'> {
  feature: Feature
  onClick?: (feature: Feature) => void
  onEdit?: (feature: Feature) => void
  onMove?: (feature: Feature) => void
  onDelete?: (feature: Feature) => void
  onContextMenu?: (e: React.MouseEvent, feature: Feature) => void
  isDragging?: boolean
  isOverlay?: boolean
}

/**
 * FeatureCard - Linear-inspired minimal draggable feature card.
 *
 * Design:
 * - 4px colored left border indicating priority
 * - Minimal content: title + assignee avatar
 * - Ultra-thin progress bar at bottom when > 0
 * - Hover: lift effect + shadow + reveal action buttons
 */
export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ feature, onClick, onEdit, onMove, onDelete, onContextMenu, isDragging, isOverlay, className, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false)

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isSortableDragging
    } = useSortable({
      id: feature.id,
      data: { type: 'feature', feature }
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 150ms ease-out, box-shadow 150ms ease-out',
      opacity: isSortableDragging && !isOverlay ? 0.5 : 1
    }

    // Calculate progress
    const completedTasks = feature.tasks.filter((t) => t.status === 'completed').length
    const totalTasks = feature.tasks.length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Get initials for avatar
    const getInitials = (name: string) => {
      return name
        .split(/[\s-_]+/)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger click when clicking action buttons
      if ((e.target as HTMLElement).closest('[data-action-button]')) {
        return
      }
      onClick?.(feature)
    }

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
      e.stopPropagation()
      action()
    }

    return (
      <div
        ref={(node) => {
          setNodeRef(node)
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        style={style}
        className={cn(
          // Base styles
          'relative cursor-pointer rounded-lg bg-card border border-border/50',
          // Priority left border
          'border-l-4',
          priorityBorderColors[feature.priority],
          // Hover state with lift effect
          'transition-all duration-150 ease-out',
          isHovered && !isDragging && 'translate-y-[-2px] shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
          // Dragging states
          isDragging && 'ring-2 ring-primary/50 shadow-lg',
          isOverlay && 'shadow-xl scale-[1.02] opacity-90',
          className
        )}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, feature)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...attributes}
        {...listeners}
        {...props}
      >
        {/* Main content */}
        <div className="p-3">
          {/* Title */}
          <h3 className="text-sm font-medium text-foreground line-clamp-2 pr-16">
            {feature.title}
          </h3>

          {/* Metadata row: Complexity + Task count */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* Complexity badge */}
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                complexityConfig[feature.complexity].bgColor,
                complexityConfig[feature.complexity].color
              )}
            >
              {complexityConfig[feature.complexity].label}
            </span>

            {/* Task count badge */}
            {totalTasks > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <ListTodo className="h-3 w-3" />
                <span>{completedTasks}/{totalTasks}</span>
                {completedTasks === totalTasks && totalTasks > 0 && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </span>
            )}
          </div>

          {/* Tags row */}
          {feature.tags && feature.tags.length > 0 && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              {feature.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {feature.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{feature.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: Assignee */}
          <div className="mt-2 flex items-center justify-between">
            {feature.assignedAgent ? (
              <div
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground cursor-default"
                title={feature.assignedAgent}
              >
                {getInitials(feature.assignedAgent)}
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar - only show when > 0 */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            {/* Progress percentage label */}
            <div className="absolute -top-4 right-2 text-[9px] text-muted-foreground tabular-nums">
              {progress}%
            </div>
            <div className="h-1 bg-muted/50 rounded-b-lg overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  progress === 100 ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover action buttons */}
        <div
          className={cn(
            'absolute top-2 right-2 flex items-center gap-1',
            'transition-opacity duration-150',
            isHovered && !isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {onEdit && (
            <button
              data-action-button
              onClick={(e) => handleActionClick(e, () => onEdit(feature))}
              className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onMove && (
            <button
              data-action-button
              onClick={(e) => handleActionClick(e, () => onMove(feature))}
              className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              title="Move"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              data-action-button
              onClick={(e) => handleActionClick(e, () => onDelete(feature))}
              className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:bg-background transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'
