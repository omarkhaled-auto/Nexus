import { format } from 'date-fns'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  AlertCircle,
  Bot,
  Flag,
  Package,
  Zap,
  Power,
  MessageSquare
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { TimelineEvent, TimelineEventType } from '@renderer/types/metrics'

export interface EventRowProps {
  event: TimelineEvent
  className?: string
}

/**
 * Get icon and styling for event type
 */
function getEventStyles(type: TimelineEventType): { iconClass: string; bgClass: string } {
  switch (type) {
    case 'task_started':
    case 'build_started':
      return { iconClass: 'text-status-working', bgClass: 'bg-status-working/10' }
    case 'task_completed':
    case 'qa_passed':
    case 'agent_spawned':
    case 'feature_completed':
    case 'build_completed':
      return { iconClass: 'text-accent-success', bgClass: 'bg-accent-success/10' }
    case 'task_failed':
    case 'qa_failed':
    case 'build_failed':
    case 'error_occurred':
    case 'error':
      return { iconClass: 'text-accent-error', bgClass: 'bg-accent-error/10' }
    case 'agent_task_assigned':
      return { iconClass: 'text-accent-secondary', bgClass: 'bg-accent-secondary/10' }
    case 'qa_iteration':
    case 'review_requested':
      return { iconClass: 'text-accent-warning', bgClass: 'bg-accent-warning/10' }
    case 'checkpoint_created':
      return { iconClass: 'text-accent-primary', bgClass: 'bg-accent-primary/10' }
    case 'agent_status_changed':
    case 'agent_terminated':
    default:
      return { iconClass: 'text-text-tertiary', bgClass: 'bg-bg-hover' }
  }
}

/**
 * Icon component with icon class
 */
function EventIconWrapper({ type, iconClass }: { type: TimelineEventType; iconClass: string }) {
  const iconClassName = cn('h-3.5 w-3.5 flex-shrink-0', iconClass)

  if (type === 'task_started') return <Play className={iconClassName} />
  if (type === 'task_completed' || type === 'qa_passed') return <CheckCircle2 className={iconClassName} />
  if (type === 'task_failed' || type === 'qa_failed') return <XCircle className={iconClassName} />
  if (type === 'agent_status_changed' || type === 'agent_task_assigned' || type === 'agent_spawned') return <Bot className={iconClassName} />
  if (type === 'agent_terminated') return <Power className={iconClassName} />
  if (type === 'qa_iteration') return <RefreshCw className={iconClassName} />
  if (type === 'checkpoint_created') return <Flag className={iconClassName} />
  if (type === 'feature_completed') return <Zap className={iconClassName} />
  if (type === 'build_started' || type === 'build_completed' || type === 'build_failed') return <Package className={iconClassName} />
  if (type === 'review_requested') return <MessageSquare className={iconClassName} />
  return <AlertCircle className={iconClassName} />
}

/**
 * Format agent ID into a readable display name.
 */
function formatAgentName(agentId: string): string {
  const agentTypes: Record<string, string> = {
    coder: 'Coder',
    qa: 'QA',
    reviewer: 'Reviewer',
    tester: 'Tester',
    architect: 'Architect'
  }

  const lowerAgentId = agentId.toLowerCase()
  for (const [key, display] of Object.entries(agentTypes)) {
    if (lowerAgentId.includes(key)) {
      return display
    }
  }

  const firstPart = agentId.split(/[-_]/)[0]
  return firstPart ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1) : 'Agent'
}

/**
 * EventRow - Single row in the activity timeline.
 * Shows time, icon, title, and associated agent.
 * Enhanced with Nexus design system styling.
 */
export function EventRow({ event, className }: EventRowProps) {
  const { type, title, timestamp, metadata } = event
  const { iconClass, bgClass } = getEventStyles(type)
  const isError = type.includes('failed') || type.includes('error')

  // Get agent ID from metadata with proper type checking
  const agentId = metadata?.agentId
  const agentIdStr = typeof agentId === 'string' ? agentId : null

  return (
    <div
      data-testid="timeline-item"
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-border-default/50 transition-colors',
        'hover:bg-bg-hover',
        isError && 'bg-accent-error/5',
        className
      )}
    >
      <span className="text-xs text-text-tertiary font-mono w-12 flex-shrink-0">
        {format(new Date(timestamp), 'HH:mm')}
      </span>

      <div className={cn('p-1 rounded', bgClass)}>
        <EventIconWrapper type={type} iconClass={iconClass} />
      </div>

      <span className={cn(
        'flex-1 text-sm truncate',
        isError ? 'text-text-primary' : 'text-text-secondary'
      )}>
        {title}
      </span>

      {agentIdStr !== null && (
        <span className="text-xs text-text-tertiary flex-shrink-0 px-2 py-0.5 rounded bg-bg-hover">
          {formatAgentName(agentIdStr)}
        </span>
      )}
    </div>
  )
}
