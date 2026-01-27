/**
 * KanbanCard Component
 *
 * Premium glassmorphism task card for the Kanban board.
 * Based on KanbanTask type with full execution details.
 * Inspired by Linear, Raycast, and Arc browser aesthetics.
 */

import { forwardRef, useState, type HTMLAttributes } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

// Priority styling with gradients and glows
const PRIORITY_CONFIG: Record<string, { badge: string; border: string; glow: string }> = {
  critical: {
    badge: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)]',
    border: 'border-l-red-500',
    glow: 'shadow-[0_4px_15px_rgba(239,68,68,0.2)]'
  },
  high: {
    badge: 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_2px_8px_rgba(249,115,22,0.4)]',
    border: 'border-l-orange-500',
    glow: 'shadow-[0_4px_15px_rgba(249,115,22,0.2)]'
  },
  medium: {
    badge: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_2px_8px_rgba(245,158,11,0.4)]',
    border: 'border-l-amber-500',
    glow: 'shadow-[0_4px_15px_rgba(245,158,11,0.15)]'
  },
  low: {
    badge: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)]',
    border: 'border-l-emerald-500',
    glow: 'shadow-[0_4px_15px_rgba(16,185,129,0.15)]'
  }
}

// Complexity badges with enhanced styling
const COMPLEXITY_CONFIG: Record<TaskComplexity, { label: string; class: string }> = {
  trivial: { label: 'XS', class: 'bg-slate-500/20 text-slate-300 border border-slate-500/30' },
  simple: { label: 'S', class: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  moderate: { label: 'M', class: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  complex: { label: 'L', class: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  'very-complex': { label: 'XL', class: 'bg-red-500/20 text-red-300 border border-red-500/30' }
}

// Agent icons with colors
const AGENT_CONFIG: Record<AgentType, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  planner: { icon: Bot, color: 'text-agent-planner' },
  coder: { icon: Code, color: 'text-agent-coder' },
  reviewer: { icon: Eye, color: 'text-agent-reviewer' },
  tester: { icon: TestTube, color: 'text-agent-tester' },
  merger: { icon: GitMerge, color: 'text-agent-merger' }
}

// Status indicators with enhanced styling
const STATUS_CONFIG: Record<KanbanTaskStatus, {
  icon: React.ComponentType<{ className?: string }>
  class: string
  bgClass: string
  animate?: boolean
  glow?: string
}> = {
  pending: { icon: Clock, class: 'text-slate-400', bgClass: 'bg-slate-500/10' },
  ready: { icon: CheckCircle2, class: 'text-emerald-400', bgClass: 'bg-emerald-500/10', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]' },
  queued: { icon: Clock, class: 'text-blue-400', bgClass: 'bg-blue-500/10' },
  'in-progress': { icon: Loader2, class: 'text-amber-400', bgClass: 'bg-amber-500/10', animate: true, glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
  'ai-review': { icon: Eye, class: 'text-violet-400', bgClass: 'bg-violet-500/10', glow: 'shadow-[0_0_8px_rgba(139,92,246,0.3)]' },
  'human-review': { icon: Eye, class: 'text-purple-400', bgClass: 'bg-purple-500/10', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]' },
  blocked: { icon: Lock, class: 'text-red-400', bgClass: 'bg-red-500/10', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]' },
  completed: { icon: CheckCircle2, class: 'text-emerald-400', bgClass: 'bg-emerald-500/10' },
  failed: { icon: AlertCircle, class: 'text-red-400', bgClass: 'bg-red-500/10', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]' },
  cancelled: { icon: AlertCircle, class: 'text-slate-400', bgClass: 'bg-slate-500/10' }
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
 * KanbanCard - Premium glassmorphism task card with rich visual feedback
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ task, onClick, isDragging, isOverlay, compact = false, className, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false)

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
      transition: transition || 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease-out',
      opacity: isSortableDragging && !isOverlay ? 0.4 : 1
    }

    // Get configs
    const statusConfig = STATUS_CONFIG[task.status]
    const StatusIcon = statusConfig.icon
    const complexityConf = COMPLEXITY_CONFIG[task.complexity]
    const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    const agentConf = task.assignedAgent ? AGENT_CONFIG[task.assignedAgent] : null

    // Determine visual state
    const isBlocked = task.status === 'blocked' || task.blockedBy.length > 0
    const isActive = task.status === 'in-progress'
    const isReady = task.status === 'ready'
    const isCompleted = task.status === 'completed'
    const blockingCount = task.blockedBy.length

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
          // Base glass styling with left border
          'relative cursor-pointer rounded-xl overflow-hidden',
          'bg-[#161B22]/70 backdrop-blur-sm',
          'border border-[#30363D]/60',
          'border-l-[3px]',
          priorityConf.border,
          // Transition
          'transition-all duration-200 ease-out',
          // Hover state
          isHovered && !isDragging && !isOverlay && [
            '-translate-y-0.5',
            priorityConf.glow,
            'border-[#30363D]/80'
          ],
          // Status-based styling
          isActive && [
            'ring-1 ring-amber-500/40',
            'border-l-amber-500',
            statusConfig.glow
          ],
          isBlocked && [
            'border-l-red-500',
            'bg-red-500/5'
          ],
          isReady && [
            'border-l-emerald-500',
            statusConfig.glow
          ],
          isCompleted && 'opacity-60',
          // Dragging states
          isDragging && !isOverlay && 'scale-105 rotate-1 shadow-2xl z-50 ring-2 ring-accent-primary/50',
          isOverlay && 'scale-105 rotate-2 shadow-2xl ring-2 ring-accent-primary/40',
          className
        )}
        onClick={() => { onClick?.(task) }}
        onMouseEnter={() => { setIsHovered(true) }}
        onMouseLeave={() => { setIsHovered(false) }}
        {...props}
      >
        {/* Header section */}
        <div className={cn('p-3 pb-2', compact && 'p-2 pb-1')}>
          <div className="flex items-start justify-between gap-2">
            {/* Left side: Priority + Status + Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {/* Priority Badge with gradient */}
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md',
                    priorityConf.badge
                  )}
                >
                  P{task.priority === 'critical' ? '0' : task.priority === 'high' ? '1' : task.priority === 'medium' ? '2' : '3'}
                </span>

                {/* Status Icon with background */}
                <div
                  className={cn(
                    'p-1 rounded-md',
                    statusConfig.bgClass,
                    statusConfig.glow
                  )}
                >
                  <StatusIcon
                    className={cn(
                      'h-3 w-3',
                      statusConfig.class,
                      statusConfig.animate && 'animate-spin'
                    )}
                  />
                </div>
              </div>

              {/* Title */}
              <h3
                className={cn(
                  'font-medium text-text-primary leading-snug',
                  compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2',
                  isCompleted && 'line-through text-text-tertiary'
                )}
                title={task.title}
              >
                {task.title}
              </h3>
            </div>

            {/* Drag Handle with hover effect */}
            <button
              className={cn(
                'cursor-grab touch-none flex-shrink-0 p-1 rounded-md',
                'transition-all duration-150',
                'opacity-40 hover:opacity-100 hover:bg-[#21262D]'
              )}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Content section */}
        <div className={cn('px-3 pb-3', compact && 'px-2 pb-2')}>
          {/* Description (non-compact only) */}
          {!compact && task.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mb-2.5">
              {task.description}
            </p>
          )}

          {/* Progress bar with gradient (when in progress) */}
          {isActive && task.progress > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-amber-400 font-medium">In Progress</span>
                <span className="text-[10px] text-text-tertiary tabular-nums">{task.progress}%</span>
              </div>
              <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Blocked indicator with enhanced styling */}
          {isBlocked && blockingCount > 0 && (
            <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Lock className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">
                Blocked by {blockingCount} {blockingCount === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          )}

          {/* Bottom row: Meta info */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Complexity + Time */}
            <div className="flex items-center gap-1.5">
              {/* Complexity Badge */}
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-medium rounded-md',
                  complexityConf.class
                )}
              >
                {complexityConf.label}
              </span>

              {/* Estimated Time */}
              {task.estimatedMinutes > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D]/60 text-[10px] text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  {formatTime(task.estimatedMinutes)}
                </span>
              )}
            </div>

            {/* Right: Agent with colored icon */}
            {agentConf && (
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-md',
                  'bg-[#21262D]/60 border border-[#30363D]/50'
                )}
                title={`Assigned to ${task.assignedAgent ?? 'unassigned'}`}
              >
                <agentConf.icon className={cn('h-3 w-3', agentConf.color)} />
                <span className="text-[10px] text-text-tertiary capitalize">{task.assignedAgent}</span>
              </div>
            )}
          </div>

          {/* Dependencies indicator (non-compact only) */}
          {!compact && task.dependsOn.length > 0 && !isBlocked && (
            <div className="mt-2.5 pt-2 border-t border-[#30363D]/50">
              <span className="text-[10px] text-text-tertiary">
                Depends on {task.dependsOn.length} {task.dependsOn.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          )}

          {/* Files indicator with icons (non-compact, if has files) */}
          {!compact && (task.filesToCreate.length > 0 || task.filesToModify.length > 0) && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-text-tertiary">
              {task.filesToCreate.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-emerald-400">+</span>
                  {task.filesToCreate.length} new
                </span>
              )}
              {task.filesToModify.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-amber-400">~</span>
                  {task.filesToModify.length} modify
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

KanbanCard.displayName = 'KanbanCard'

export default KanbanCard
