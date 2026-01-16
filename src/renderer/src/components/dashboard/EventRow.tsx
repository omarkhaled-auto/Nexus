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
  Zap
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { TimelineEvent, TimelineEventType } from '@renderer/types/metrics'

/**
 * Icon configuration for each event type
 */
const EVENT_ICONS: Record<
  TimelineEventType,
  { icon: typeof CheckCircle2; className: string }
> = {
  task_started: { icon: Play, className: 'text-blue-500' },
  task_completed: { icon: CheckCircle2, className: 'text-emerald-500' },
  task_failed: { icon: XCircle, className: 'text-red-500' },
  agent_status_changed: { icon: Bot, className: 'text-muted-foreground' },
  agent_task_assigned: { icon: Bot, className: 'text-blue-500' },
  qa_iteration: { icon: RefreshCw, className: 'text-amber-500' },
  qa_passed: { icon: CheckCircle2, className: 'text-emerald-500' },
  qa_failed: { icon: XCircle, className: 'text-red-500' },
  checkpoint_created: { icon: Flag, className: 'text-purple-500' },
  feature_completed: { icon: Zap, className: 'text-emerald-500' },
  build_started: { icon: Package, className: 'text-blue-500' },
  build_completed: { icon: Package, className: 'text-emerald-500' },
  build_failed: { icon: Package, className: 'text-red-500' },
  error: { icon: AlertCircle, className: 'text-red-500' }
}

export interface EventRowProps {
  event: TimelineEvent
  className?: string
}

/**
 * EventRow - Single row in the activity timeline.
 * Shows time, icon, title, and associated agent.
 *
 * Visual design:
 * ```
 * │  14:25  ✓  Task api.routes.ts completed         Coder-2    │
 * ```
 */
export function EventRow({ event, className }: EventRowProps) {
  const { type, title, timestamp, metadata } = event
  const iconConfig = EVENT_ICONS[type] || { icon: AlertCircle, className: 'text-muted-foreground' }
  const Icon = iconConfig.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 border-b border-border hover:bg-muted/30 transition-colors',
        className
      )}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
        {format(new Date(timestamp), 'HH:mm')}
      </span>

      {/* Event icon */}
      <Icon className={cn('h-4 w-4 flex-shrink-0', iconConfig.className)} />

      {/* Event title */}
      <span className="flex-1 text-sm truncate">{title}</span>

      {/* Agent name if present */}
      {metadata?.agentId && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatAgentName(metadata.agentId)}
        </span>
      )}
    </div>
  )
}

/**
 * Format agent ID into a readable display name.
 * Examples:
 * - "coder-agent-123" -> "Coder"
 * - "qa_agent" -> "QA"
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
