import { cn } from '@renderer/lib/utils'
import type { AgentMetrics, AgentStatus } from '@renderer/types/metrics'

/**
 * Status color configuration for agent status indicators
 */
const STATUS_COLORS: Record<AgentStatus, { bg: string; ring: string; pulse: boolean }> = {
  idle: { bg: 'bg-gray-500', ring: 'ring-gray-500/30', pulse: false },
  working: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', pulse: true },
  waiting: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', pulse: false },
  blocked: { bg: 'bg-orange-500', ring: 'ring-orange-500/30', pulse: false },
  error: { bg: 'bg-red-500', ring: 'ring-red-500/30', pulse: true }
}

export interface AgentCardProps {
  agent: AgentMetrics
  className?: string
}

/**
 * AgentCard - Displays a single agent's status, current task, and progress.
 * Shows status dot with pulse animation when working, name, task, and progress bar.
 *
 * Visual design:
 * ```
 * │  🟢 Coder-1    │
 * │  auth.ts       │
 * │  ████████░ 80% │
 * ```
 */
export function AgentCard({ agent, className }: AgentCardProps) {
  const { name, status, currentTask, progress } = agent
  const statusConfig = STATUS_COLORS[status]

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3 transition-colors',
        className
      )}
    >
      {/* Header: Status dot + Agent name */}
      <div className="flex items-center gap-2">
        {/* Status indicator dot with optional pulse */}
        <div className="relative flex h-2.5 w-2.5">
          {statusConfig.pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                statusConfig.bg
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              statusConfig.bg
            )}
          />
        </div>

        {/* Agent name */}
        <span className="font-medium text-sm">{name}</span>
      </div>

      {/* Current task - truncated if too long */}
      <div className="mt-1.5 h-5">
        {currentTask ? (
          <span className="text-sm text-muted-foreground truncate block">
            {currentTask}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50 italic">
            {status === 'idle' ? 'Idle' : status === 'waiting' ? 'Waiting...' : 'No task'}
          </span>
        )}
      </div>

      {/* Progress bar - only show if working with progress */}
      {status === 'working' && progress > 0 && (
        <div className="mt-2 flex items-center gap-2">
          {/* Progress bar container */}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {/* Percentage label */}
          <span className="text-xs text-muted-foreground min-w-[2rem] text-right">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  )
}
