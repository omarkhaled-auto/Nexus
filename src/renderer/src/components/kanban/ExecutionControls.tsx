/**
 * ExecutionControls Component
 *
 * Provides Start/Pause/Resume/Stop buttons for task orchestration.
 * Shows execution progress, current task, and elapsed time.
 */

import { useMemo, type ReactElement } from 'react'
import { Play, Pause, Square, RotateCcw, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { ExecutionStatus } from '@/types/execution'

export interface ExecutionControlsProps {
  /** Current execution status */
  status: ExecutionStatus
  /** Total number of tasks */
  totalTasks: number
  /** Number of completed tasks */
  completedTasks: number
  /** Number of failed tasks */
  failedTasks: number
  /** Name of currently executing task */
  currentTaskName?: string
  /** Execution start time (ISO string) */
  startedAt?: string | null
  /** Whether the start button should be disabled */
  canStart?: boolean
  /** Called when user clicks Start */
  onStart?: () => void
  /** Called when user clicks Pause */
  onPause?: () => void
  /** Called when user clicks Resume */
  onResume?: () => void
  /** Called when user clicks Stop */
  onStop?: () => void
  /** Called when user clicks Restart (after completion) */
  onRestart?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Format elapsed time from start timestamp
 */
function formatElapsedTime(startedAt: string | null | undefined): string {
  if (!startedAt) return '0:00'

  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const elapsed = Math.floor((now - start) / 1000)

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * ExecutionControls - Control panel for task orchestration
 */
export function ExecutionControls({
  status,
  totalTasks,
  completedTasks,
  failedTasks,
  currentTaskName,
  startedAt,
  canStart = true,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
  className
}: ExecutionControlsProps): ReactElement {
  // Calculate progress percentage
  const progress = useMemo(() => {
    if (totalTasks === 0) return 0
    return Math.round((completedTasks / totalTasks) * 100)
  }, [completedTasks, totalTasks])

  // Format elapsed time (update every render when running)
  const elapsedTime = formatElapsedTime(status === 'running' || status === 'paused' ? startedAt : null)

  // Determine what to render based on status
  const renderIdleState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <Button
        variant="success"
        size="md"
        onClick={onStart}
        disabled={!canStart || totalTasks === 0}
        className="gap-2 min-w-[140px]"
      >
        <Play className="h-4 w-4" />
        Start Execution
      </Button>
      <span className="text-sm text-text-secondary">
        {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} ready
      </span>
    </div>
  )

  const renderRunningState = (): ReactElement => (
    <div className="flex items-center gap-4">
      {/* Progress Section */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <Loader2 className="h-5 w-5 text-accent-primary animate-spin" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-primary font-medium">
              {completedTasks}/{totalTasks} tasks
            </span>
            <span className="text-sm text-text-secondary">{progress}%</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current Task */}
      {currentTaskName && (
        <div className="hidden lg:block max-w-[200px]">
          <span className="text-xs text-text-tertiary block">Current task:</span>
          <span className="text-sm text-text-secondary truncate block">{currentTaskName}</span>
        </div>
      )}

      {/* Time Elapsed */}
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-mono">{elapsedTime}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onPause} className="gap-1.5">
          <Pause className="h-4 w-4" />
          Pause
        </Button>
        <Button variant="danger" size="sm" onClick={onStop} className="gap-1.5">
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  )

  const renderPausedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      {/* Progress Section */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <Pause className="h-5 w-5 text-status-warning" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-primary font-medium">
              {completedTasks}/{totalTasks} tasks
            </span>
            <span className="text-sm text-status-warning">Paused</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-status-warning transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Elapsed */}
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-mono">{elapsedTime}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="success" size="sm" onClick={onResume} className="gap-1.5">
          <Play className="h-4 w-4" />
          Resume
        </Button>
        <Button variant="danger" size="sm" onClick={onStop} className="gap-1.5">
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  )

  const renderCompletedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-status-success">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Completed</span>
      </div>
      <span className="text-sm text-text-secondary">
        {completedTasks}/{totalTasks} tasks completed
        {failedTasks > 0 && (
          <span className="text-status-error ml-1">({failedTasks} failed)</span>
        )}
      </span>
      <span className="text-sm text-text-tertiary">
        Total time: {elapsedTime}
      </span>
      {onRestart && (
        <Button variant="secondary" size="sm" onClick={onRestart} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
      )}
    </div>
  )

  const renderFailedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-status-error">
        <Square className="h-5 w-5" />
        <span className="font-medium">Stopped</span>
      </div>
      <span className="text-sm text-text-secondary">
        {completedTasks}/{totalTasks} tasks completed
        {failedTasks > 0 && (
          <span className="text-status-error ml-1">({failedTasks} failed)</span>
        )}
      </span>
      {onRestart && (
        <Button variant="secondary" size="sm" onClick={onRestart} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
      )}
    </div>
  )

  const renderContent = (): ReactElement => {
    switch (status) {
      case 'idle':
      case 'ready':
        return renderIdleState()
      case 'running':
        return renderRunningState()
      case 'paused':
        return renderPausedState()
      case 'completed':
        return renderCompletedState()
      case 'failed':
        return renderFailedState()
      case 'planning':
        return (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Planning tasks...</span>
          </div>
        )
      default:
        return renderIdleState()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center px-4 py-3 bg-bg-secondary/50 border-b border-border-default',
        className
      )}
    >
      {renderContent()}
    </div>
  )
}

export default ExecutionControls
