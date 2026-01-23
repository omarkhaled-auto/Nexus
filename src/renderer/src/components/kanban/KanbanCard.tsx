/**
 * KanbanCard Component
 *
 * A modern, polished task card for the Kanban board.
 * Based on KanbanTask type with full execution details.
 */

import { forwardRef, type HTMLAttributes } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import type { KanbanTask, KanbanTaskStatus, TaskComplexity } from '@/types/execution'
import type { AgentType } from '@/types/agent'
import {
  GripVertical,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Bot,
  Code,
  TestTube,
  Eye,
  GitMerge
} from 'lucide-react'

// Priority colors for badges
const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-emerald-500 text-white'
}

// Complexity badges
const COMPLEXITY_CONFIG: Record<TaskComplexity, { label: string; class: string }> = {
  trivial: { label: 'XS', class: 'bg-slate-500/20 text-slate-300' },
  simple: { label: 'S', class: 'bg-emerald-500/20 text-emerald-300' },
  moderate: { label: 'M', class: 'bg-blue-500/20 text-blue-300' },
  complex: { label: 'L', class: 'bg-purple-500/20 text-purple-300' },
  'very-complex': { label: 'XL', class: 'bg-red-500/20 text-red-300' }
}

// Agent icons
const AGENT_ICONS: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  planner: Bot,
  coder: Code,
  reviewer: Eye,
  tester: TestTube,
  merger: GitMerge
}

// Status indicators
const STATUS_CONFIG: Record<KanbanTaskStatus, {
  icon: React.ComponentType<{ className?: string }>
  class: string
  animate?: boolean
}> = {
  pending: { icon: Clock, class: 'text-slate-400' },
  ready: { icon: CheckCircle2, class: 'text-emerald-400' },
  queued: { icon: Clock, class: 'text-blue-400' },
  'in-progress': { icon: Loader2, class: 'text-amber-400', animate: true },
  'ai-review': { icon: Eye, class: 'text-violet-400' },
  'human-review': { icon: Eye, class: 'text-purple-400' },
  blocked: { icon: Lock, class: 'text-red-400' },
  completed: { icon: CheckCircle2, class: 'text-emerald-400' },
  failed: { icon: AlertCircle, class: 'text-red-400' },
  cancelled: { icon: AlertCircle, class: 'text-slate-400' }
}

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Task data to display */
  task: KanbanTask
  /** Callback when card is clicked */
  onClick?: (task: KanbanTask) => void
  /** Whether this card is being dragged */
  isDragging?: boolean
  /** Whether this is the drag overlay (ghost) */
  isOverlay?: boolean
  /** Compact mode for smaller display */
  compact?: boolean
}

/**
 * Format estimated time display
 */
function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * KanbanCard - Draggable task card for the Kanban board
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ task, onClick, isDragging, isOverlay, compact = false, className, ...props }, ref) => {
    // Sortable setup
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isSortableDragging
    } = useSortable({
      id: task.id,
      data: { type: 'task', task }
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isSortableDragging && !isOverlay ? 0.5 : 1
    }

    // Get status config
    const statusConfig = STATUS_CONFIG[task.status]
    const StatusIcon = statusConfig.icon

    // Get complexity config
    const complexityConfig = COMPLEXITY_CONFIG[task.complexity]

    // Get agent icon if assigned
    const AgentIcon = task.assignedAgent ? AGENT_ICONS[task.assignedAgent] : null

    // Determine visual state
    const isBlocked = task.status === 'blocked' || task.blockedBy.length > 0
    const isActive = task.status === 'in-progress'
    const isReady = task.status === 'ready'
    const isCompleted = task.status === 'completed'

    // Calculate blocking info
    const blockingCount = task.blockedBy.length

    return (
      <Card
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
          'cursor-pointer transition-all duration-200',
          'hover:shadow-lg hover:shadow-black/20',
          'border border-border-default',
          // State-based styling
          isActive && 'ring-2 ring-amber-500/50 border-amber-500/30',
          isBlocked && 'border-red-500/30 bg-red-500/5',
          isReady && 'border-emerald-500/30',
          isCompleted && 'opacity-70',
          isDragging && 'ring-2 ring-accent-primary shadow-xl',
          isOverlay && 'shadow-2xl rotate-2',
          className
        )}
        onClick={() => onClick?.(task)}
        {...props}
      >
        <CardHeader className={cn('p-3 pb-2', compact && 'p-2 pb-1')}>
          <div className="flex items-start justify-between gap-2">
            {/* Left side: Priority + Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Priority Badge */}
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold uppercase rounded',
                    PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                  )}
                >
                  P{task.priority === 'critical' ? '0' : task.priority === 'high' ? '1' : task.priority === 'medium' ? '2' : '3'}
                </span>

                {/* Status Icon */}
                <StatusIcon
                  className={cn(
                    'h-3.5 w-3.5',
                    statusConfig.class,
                    statusConfig.animate && 'animate-spin'
                  )}
                />
              </div>

              {/* Title */}
              <h3
                className={cn(
                  'font-medium text-text-primary leading-tight',
                  compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2',
                  isCompleted && 'line-through text-text-tertiary'
                )}
                title={task.title}
              >
                {task.title}
              </h3>
            </div>

            {/* Drag Handle */}
            <button
              className="cursor-grab touch-none flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-text-tertiary" />
            </button>
          </div>
        </CardHeader>

        <CardContent className={cn('p-3 pt-0', compact && 'p-2 pt-0')}>
          {/* Description (non-compact only) */}
          {!compact && task.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          {/* Progress bar (when in progress) */}
          {isActive && task.progress > 0 && (
            <div className="mb-2">
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Blocked indicator */}
          {isBlocked && blockingCount > 0 && (
            <div className="flex items-center gap-1.5 mb-2 text-red-400 text-xs">
              <Lock className="h-3 w-3" />
              <span>Blocked by {blockingCount} {blockingCount === 1 ? 'task' : 'tasks'}</span>
            </div>
          )}

          {/* Bottom row: Meta info */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Complexity + Time */}
            <div className="flex items-center gap-1.5">
              {/* Complexity Badge */}
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-medium rounded',
                  complexityConfig.class
                )}
              >
                {complexityConfig.label}
              </span>

              {/* Estimated Time */}
              {task.estimatedMinutes > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  {formatTime(task.estimatedMinutes)}
                </span>
              )}
            </div>

            {/* Right: Agent */}
            {AgentIcon && (
              <div className="flex items-center gap-1 text-text-tertiary" title={`Assigned to ${task.assignedAgent ?? 'unassigned'}`}>
                <AgentIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Dependencies indicator (non-compact only) */}
          {!compact && task.dependsOn.length > 0 && !isBlocked && (
            <div className="mt-2 pt-2 border-t border-border-default">
              <span className="text-[10px] text-text-tertiary">
                Depends on {task.dependsOn.length} {task.dependsOn.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          )}

          {/* Files indicator (non-compact, if has files) */}
          {!compact && (task.filesToCreate.length > 0 || task.filesToModify.length > 0) && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-text-tertiary">
              {task.filesToCreate.length > 0 && (
                <span>+{task.filesToCreate.length} new</span>
              )}
              {task.filesToModify.length > 0 && (
                <span>~{task.filesToModify.length} modify</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

KanbanCard.displayName = 'KanbanCard'

export default KanbanCard
