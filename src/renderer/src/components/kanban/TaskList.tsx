import type { Task } from '@renderer/stores/taskStore'
import { cn } from '@renderer/lib/utils'
import { Check, X, Circle, Bot } from 'lucide-react'

interface TaskListProps {
  tasks: Task[]
  featureId: string
}

// Status indicator component
function StatusIndicator({ status }: { status: Task['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-3 w-3 text-emerald-500" />
        </div>
      )
    case 'failed':
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
          <X className="h-3 w-3 text-red-500" />
        </div>
      )
    case 'in_progress':
      return (
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/30" />
        </div>
      )
    case 'pending':
    default:
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Circle className="h-3 w-3 text-muted-foreground" />
        </div>
      )
  }
}

// Format agent name from ID
function formatAgentName(agentId: string): string {
  // agent-coder -> Coder, coder-agent -> Coder
  return agentId
    .replace(/-agent$/, '')
    .replace(/^agent-/, '')
    .replace(/^\w/, (c) => c.toUpperCase())
}

// Format time in minutes
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * TaskList - Renders list of tasks with status indicators.
 *
 * Layout for each task:
 * [●] Task name                    [Agent] [15m]
 */
export function TaskList({ tasks, featureId: _featureId }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">No tasks yet</div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            'flex items-center gap-3 rounded-md px-2 py-1.5',
            task.status === 'in_progress' && 'bg-amber-500/5',
            task.status === 'completed' && 'opacity-70'
          )}
        >
          {/* Status indicator */}
          <StatusIndicator status={task.status} />

          {/* Task name */}
          <span
            className={cn(
              'flex-1 text-sm',
              task.status === 'completed' && 'line-through text-muted-foreground',
              task.status === 'failed' && 'text-red-400'
            )}
          >
            {task.name}
          </span>

          {/* Agent badge */}
          {task.assignedAgent && (
            <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" />
              {formatAgentName(task.assignedAgent)}
            </span>
          )}

          {/* Estimated time */}
          {task.estimatedMinutes !== undefined && (
            <span className="text-xs text-muted-foreground">{formatTime(task.estimatedMinutes)}</span>
          )}
        </div>
      ))}
    </div>
  )
}
