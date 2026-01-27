/**
 * ExecutionControls Component
 *
 * Provides Start/Pause/Resume/Stop buttons for task orchestration.
 * Shows execution progress, current task, and elapsed time.
 *
 * Features glassmorphism design with status-based container glow,
 * animated progress bar with shimmer effect, and pulsing status indicators.
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

  // Status-based styling
  const statusStyles = useMemo(() => {
    switch (status) {
      case 'running':
        return {
          container: 'border-[#3B82F6]/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
          glow: 'bg-[#3B82F6]/10',
          accent: 'text-[#3B82F6]',
          progressBar: 'from-[#7C3AED] to-[#A855F7]'
        }
      case 'paused':
        return {
          container: 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          glow: 'bg-amber-500/10',
          accent: 'text-amber-400',
          progressBar: 'from-amber-500 to-amber-400'
        }
      case 'completed':
        return {
          container: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          glow: 'bg-emerald-500/10',
          accent: 'text-emerald-400',
          progressBar: 'from-emerald-500 to-emerald-400'
        }
      case 'failed':
        return {
          container: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
          glow: 'bg-red-500/10',
          accent: 'text-red-400',
          progressBar: 'from-red-500 to-red-400'
        }
      default:
        return {
          container: 'border-[#30363D]/50',
          glow: '',
          accent: 'text-[#8B949E]',
          progressBar: 'from-[#7C3AED] to-[#A855F7]'
        }
    }
  }, [status])

  // Determine what to render based on status
  const renderIdleState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <Button
        variant="success"
        size="md"
        onClick={onStart}
        disabled={!canStart || totalTasks === 0}
        className={cn(
          "relative gap-2 min-w-[140px] overflow-hidden",
          "bg-gradient-to-r from-emerald-600 to-emerald-500",
          "hover:from-emerald-500 hover:to-emerald-400",
          "border-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
          "hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]",
          "transition-all duration-200"
        )}
      >
        <Play className="h-4 w-4" />
        Start Execution
      </Button>
      <span className="text-sm text-[#8B949E]">
        {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} ready
      </span>
    </div>
  )

  const renderRunningState = (): ReactElement => (
    <div className="flex items-center gap-4">
      {/* Progress Section */}
      <div className="flex items-center gap-3 min-w-[220px]">
        {/* Pulsing status dot */}
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-[#3B82F6] animate-pulse" />
          <div className="absolute inset-0 h-3 w-3 rounded-full bg-[#3B82F6] animate-ping opacity-75" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-[#F0F6FC] font-medium">
              {completedTasks}/{totalTasks} tasks
            </span>
            <span className="text-sm text-[#7C3AED] font-medium tabular-nums">{progress}%</span>
          </div>

          {/* Progress bar with shimmer */}
          <div className="relative h-2 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                "bg-gradient-to-r", statusStyles.progressBar
              )}
              style={{ width: `${progress}%` }}
            />
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear'
              }}
            />
          </div>
        </div>
      </div>

      {/* Current Task */}
      {currentTaskName && (
        <div className="hidden lg:block max-w-[200px] px-3 py-1.5 rounded-lg bg-[#21262D]/50 border border-[#30363D]/50">
          <span className="text-[10px] uppercase tracking-wider text-[#8B949E] block">Current</span>
          <span className="text-xs text-[#F0F6FC] truncate block">{currentTaskName}</span>
        </div>
      )}

      {/* Time Elapsed */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262D]/50 border border-[#30363D]/50">
        <Clock className="h-3.5 w-3.5 text-[#8B949E]" />
        <span className="text-sm font-mono text-[#F0F6FC] tabular-nums">{elapsedTime}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPause}
          className={cn(
            "gap-1.5 bg-[#21262D] border-[#30363D]",
            "hover:bg-[#30363D] hover:border-[#30363D]",
            "text-[#F0F6FC]"
          )}
        >
          <Pause className="h-4 w-4" />
          Pause
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onStop}
          className={cn(
            "gap-1.5",
            "bg-red-500/10 border-red-500/30 text-red-400",
            "hover:bg-red-500/20 hover:border-red-500/50",
            "hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          )}
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  )

  const renderPausedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      {/* Progress Section */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <Pause className="h-5 w-5 text-amber-400" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-[#F0F6FC] font-medium">
              {completedTasks}/{totalTasks} tasks
            </span>
            <span className="text-sm text-amber-400 font-medium">Paused</span>
          </div>
          <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Elapsed */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262D]/50 border border-[#30363D]/50">
        <Clock className="h-3.5 w-3.5 text-[#8B949E]" />
        <span className="text-sm font-mono text-[#F0F6FC] tabular-nums">{elapsedTime}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={onResume}
          className={cn(
            "gap-1.5",
            "bg-gradient-to-r from-emerald-600 to-emerald-500",
            "hover:from-emerald-500 hover:to-emerald-400",
            "border-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          )}
        >
          <Play className="h-4 w-4" />
          Resume
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onStop}
          className={cn(
            "gap-1.5",
            "bg-red-500/10 border-red-500/30 text-red-400",
            "hover:bg-red-500/20 hover:border-red-500/50"
          )}
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  )

  const renderCompletedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div className="absolute inset-0 blur-md bg-emerald-400/40" />
        </div>
        <span className="font-medium text-emerald-400">Completed</span>
      </div>
      <span className="text-sm text-[#8B949E]">
        {completedTasks}/{totalTasks} tasks completed
        {failedTasks > 0 && (
          <span className="text-red-400 ml-1">({failedTasks} failed)</span>
        )}
      </span>
      <span className="text-sm text-[#8B949E] px-2 py-1 rounded bg-[#21262D]/50 border border-[#30363D]/50">
        Total time: <span className="font-mono text-[#F0F6FC]">{elapsedTime}</span>
      </span>
      {onRestart && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRestart}
          className={cn(
            "gap-1.5 bg-[#21262D] border-[#30363D]",
            "hover:bg-[#30363D]"
          )}
        >
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
      )}
    </div>
  )

  const renderFailedState = (): ReactElement => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Square className="h-5 w-5 text-red-400" />
          <div className="absolute inset-0 blur-md bg-red-400/40" />
        </div>
        <span className="font-medium text-red-400">Stopped</span>
      </div>
      <span className="text-sm text-[#8B949E]">
        {completedTasks}/{totalTasks} tasks completed
        {failedTasks > 0 && (
          <span className="text-red-400 ml-1">({failedTasks} failed)</span>
        )}
      </span>
      {onRestart && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRestart}
          className={cn(
            "gap-1.5 bg-[#21262D] border-[#30363D]",
            "hover:bg-[#30363D]"
          )}
        >
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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-5 w-5 text-[#7C3AED] animate-spin" />
              <div className="absolute inset-0 blur-md bg-[#7C3AED]/30" />
            </div>
            <span className="text-[#F0F6FC]">Planning tasks...</span>
          </div>
        )
      default:
        return renderIdleState()
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-center px-4 py-3",
        "bg-[#161B22]/70 backdrop-blur-md",
        "border-b transition-all duration-300",
        statusStyles.container,
        className
      )}
    >
      {/* Subtle glow background for active states */}
      {(status === 'running' || status === 'paused') && (
        <div className={cn(
          "absolute inset-0 opacity-50",
          statusStyles.glow
        )} />
      )}

      <div className="relative z-10">
        {renderContent()}
      </div>

      {/* Add shimmer keyframes via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  )
}

export default ExecutionControls
