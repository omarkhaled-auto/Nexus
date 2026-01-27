import { forwardRef, useState, type HTMLAttributes, type CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureComplexity } from '@renderer/types/feature'
import { Pencil, ArrowRight, Trash2, User, CheckCircle2 } from 'lucide-react'

/**
 * Priority gradient colors for the top accent bar
 * Premium gradient styling inspired by Linear/Raycast
 */
const priorityGradients: Record<FeaturePriority, { gradient: string; glow: string; border: string }> = {
  critical: {
    gradient: 'bg-gradient-to-r from-red-600 via-red-500 to-red-400',
    glow: 'shadow-[0_4px_20px_rgba(239,68,68,0.25),0_0_40px_rgba(239,68,68,0.1)]',
    border: 'hover:border-red-500/30'
  },
  high: {
    gradient: 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400',
    glow: 'shadow-[0_4px_20px_rgba(249,115,22,0.25),0_0_40px_rgba(249,115,22,0.1)]',
    border: 'hover:border-orange-500/30'
  },
  medium: {
    gradient: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-yellow-400',
    glow: 'shadow-[0_4px_20px_rgba(245,158,11,0.2),0_0_40px_rgba(245,158,11,0.08)]',
    border: 'hover:border-yellow-500/30'
  },
  low: {
    gradient: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400',
    glow: 'shadow-[0_4px_20px_rgba(16,185,129,0.2),0_0_40px_rgba(16,185,129,0.08)]',
    border: 'hover:border-emerald-500/30'
  }
}

/**
 * Complexity badge colors and labels with enhanced styling
 */
const complexityConfig: Record<FeatureComplexity, { color: string; bgColor: string; label: string; icon?: string }> = {
  simple: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', label: 'Simple' },
  moderate: { color: 'text-amber-400', bgColor: 'bg-amber-500/15', label: 'Moderate' },
  complex: { color: 'text-orange-400', bgColor: 'bg-orange-500/15', label: 'Complex' }
}

export interface FeatureCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'onContextMenu' | 'style'> {
  feature: Feature
  onClick?: (feature: Feature) => void
  onEdit?: (feature: Feature) => void
  onMove?: (feature: Feature) => void
  onDelete?: (feature: Feature) => void
  onContextMenu?: (e: React.MouseEvent, feature: Feature) => void
  isDragging?: boolean
  isOverlay?: boolean
  style?: CSSProperties
}

/**
 * FeatureCard - Premium glassmorphism draggable feature card.
 *
 * Design (Linear/Raycast/Arc inspired):
 * - Priority gradient top accent bar with glow
 * - Glassmorphism background with multi-layer shadows
 * - Hover: lift effect (-4px), enhanced shadow, border highlight
 * - Drag: scale(1.05), rotate(3deg), shadow-2xl
 * - Floating action buttons on hover
 * - Circular progress indicator with gradient
 */
export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ feature, onClick, onEdit, onMove, onDelete, onContextMenu, isDragging, isOverlay, className, style: styleProp, ...props }, ref) => {
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

    // Get priority config for styling
    const priorityConfig = priorityGradients[feature.priority]

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease-out, border-color 200ms ease-out',
      opacity: isSortableDragging && !isOverlay ? 0.4 : 1,
      ...styleProp
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
        data-testid={`feature-card-${feature.id}`}
        className={cn(
          // Base glass styling
          'relative cursor-pointer rounded-xl overflow-hidden',
          'bg-[#161B22]/80 backdrop-blur-sm',
          'border border-[#30363D]/60',
          // Transition for all effects
          'transition-all duration-200 ease-out',
          // Hover state: lift + shadow + border highlight
          isHovered && !isDragging && !isOverlay && [
            '-translate-y-1',
            priorityConfig.glow,
            priorityConfig.border,
            'border-[#30363D]'
          ],
          // Dragging states - dramatic scale and rotation
          isDragging && !isOverlay && 'scale-105 rotate-2 shadow-2xl z-50 border-accent-primary/50',
          // Overlay (drag preview) state
          isOverlay && [
            'scale-105 rotate-3 shadow-2xl',
            'ring-2 ring-accent-primary/40',
            priorityConfig.glow
          ],
          className
        )}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, feature)}
        onMouseEnter={() => { setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); }}
        {...attributes}
        {...listeners}
        {...props}
      >
        {/* Priority gradient top accent bar */}
        <div className={cn(
          'absolute top-0 left-0 right-0 h-1',
          priorityConfig.gradient
        )} />

        {/* Subtle inner glow on hover */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.08) 0%, transparent 70%)'
          }}
        />

        {/* Main content */}
        <div className="relative p-3 pt-4">
          {/* Title */}
          <h3 className="text-sm font-medium text-text-primary line-clamp-2 pr-12 leading-snug">
            {feature.title}
          </h3>

          {/* Metadata row: Complexity + Task count */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {/* Complexity badge with glass effect */}
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium',
                'border border-white/5',
                complexityConfig[feature.complexity].bgColor,
                complexityConfig[feature.complexity].color
              )}
            >
              {complexityConfig[feature.complexity].label}
            </span>

            {/* Task count with progress ring */}
            {totalTasks > 0 && (
              <div className="flex items-center gap-1.5">
                {/* Mini circular progress indicator */}
                <div className="relative w-4 h-4">
                  <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                    {/* Background circle */}
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-[#21262D]"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 0.377} 37.7`}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#A855F7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {progress === 100 && (
                    <CheckCircle2 className="absolute inset-0 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <span className="text-[10px] text-text-tertiary tabular-nums">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            )}
          </div>

          {/* Tags row with enhanced styling */}
          {feature.tags && feature.tags.length > 0 && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              {feature.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#21262D]/80 border border-[#30363D]/50 text-[10px] text-text-tertiary"
                >
                  {tag}
                </span>
              ))}
              {feature.tags.length > 3 && (
                <span className="text-[10px] text-text-muted">
                  +{feature.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: Assignee avatar */}
          <div className="mt-3 flex items-center justify-between">
            {feature.assignedAgent ? (
              <div
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold cursor-default',
                  'bg-gradient-to-br from-accent-primary/30 to-accent-secondary/20',
                  'border border-accent-primary/30 text-text-primary'
                )}
                title={feature.assignedAgent}
              >
                {getInitials(feature.assignedAgent)}
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-[#21262D] border border-[#30363D]/50 flex items-center justify-center">
                <User className="h-3 w-3 text-text-muted" />
              </div>
            )}

            {/* Progress percentage (when > 0 and < 100) */}
            {progress > 0 && progress < 100 && (
              <span className="text-[10px] text-text-tertiary tabular-nums font-medium">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Bottom progress bar with gradient */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-0.5 bg-[#21262D]">
              <div
                className={cn(
                  'h-full transition-all duration-500 ease-out',
                  progress === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7]'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Floating action buttons - appear on hover */}
        <div
          className={cn(
            'absolute top-3 right-2 flex items-center gap-1',
            'transition-all duration-200',
            isHovered && !isDragging
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-2 pointer-events-none'
          )}
        >
          {onEdit && (
            <button
              data-action-button
              onClick={(e) => { handleActionClick(e, () => { onEdit(feature); }); }}
              className={cn(
                'p-1.5 rounded-lg',
                'bg-[#161B22]/90 backdrop-blur-md',
                'border border-[#30363D]/80',
                'text-text-tertiary hover:text-text-primary hover:bg-[#21262D]',
                'transition-all duration-150',
                'hover:scale-110 hover:shadow-md'
              )}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onMove && (
            <button
              data-action-button
              onClick={(e) => { handleActionClick(e, () => { onMove(feature); }); }}
              className={cn(
                'p-1.5 rounded-lg',
                'bg-[#161B22]/90 backdrop-blur-md',
                'border border-[#30363D]/80',
                'text-text-tertiary hover:text-text-primary hover:bg-[#21262D]',
                'transition-all duration-150',
                'hover:scale-110 hover:shadow-md'
              )}
              title="Move"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              data-action-button
              onClick={(e) => { handleActionClick(e, () => { onDelete(feature); }); }}
              className={cn(
                'p-1.5 rounded-lg',
                'bg-[#161B22]/90 backdrop-blur-md',
                'border border-[#30363D]/80',
                'text-text-tertiary hover:text-accent-error hover:bg-accent-error/10',
                'transition-all duration-150',
                'hover:scale-110 hover:shadow-md'
              )}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'
