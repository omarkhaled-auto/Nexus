/**
 * AgentCard Component
 *
 * Displays detailed information about an AI agent including its type,
 * current status, assigned task, progress, and metrics.
 *
 * Features:
 * - Type-specific gradient borders and glows
 * - Status animations (pulse for working, shake for error)
 * - Glassmorphism design with backdrop blur
 * - Mini progress bars with gradient fill
 *
 * @example
 * // Basic usage
 * <AgentCard agent={agentData} />
 *
 * @example
 * // Selected card with details
 * <AgentCard agent={agentData} selected showDetails onClick={() => selectAgent(agentData.id)} />
 *
 * @example
 * // Compact mode for lists
 * <AgentCard agent={agentData} compact />
 */

import React from 'react'
import { Clock, FileCode2, Zap, Hash, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type AgentType, type AgentStatus, getAgentLabel } from '@renderer/styles/tokens'
import { AgentBadge } from './AgentBadge'
import { Progress } from '../ui/Progress'

// =============================================================================
// TYPES
// =============================================================================

export interface AgentData {
  /** Agent ID */
  id: string
  /** Agent type */
  type: AgentType
  /** Current status */
  status: AgentStatus
  /** Current task info */
  currentTask?: {
    id: string
    name: string
    progress?: number
  }
  /** Model being used */
  model?: string
  /** Iteration tracking */
  iteration?: {
    current: number
    max: number
  }
  /** Performance metrics */
  metrics?: {
    tokensUsed: number
    duration: number
  }
  /** Current file being worked on */
  currentFile?: string
}

export interface AgentCardProps {
  /** Agent data */
  agent: AgentData
  /** Selected state */
  selected?: boolean
  /** Click handler */
  onClick?: () => void
  /** Show expanded details */
  showDetails?: boolean
  /** Compact mode for lists */
  compact?: boolean
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Agent type colors for gradient borders and glows */
const agentTypeStyles: Record<AgentType, { border: string; glow: string; gradient: string }> = {
  planner: {
    border: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.3)',
    gradient: 'from-[#A78BFA] to-[#8B5CF6]'
  },
  coder: {
    border: '#60A5FA',
    glow: 'rgba(96, 165, 250, 0.3)',
    gradient: 'from-[#60A5FA] to-[#3B82F6]'
  },
  tester: {
    border: '#34D399',
    glow: 'rgba(52, 211, 153, 0.3)',
    gradient: 'from-[#34D399] to-[#10B981]'
  },
  reviewer: {
    border: '#FBBF24',
    glow: 'rgba(251, 191, 36, 0.3)',
    gradient: 'from-[#FBBF24] to-[#F59E0B]'
  },
  architect: {
    border: '#F472B6',
    glow: 'rgba(244, 114, 182, 0.3)',
    gradient: 'from-[#F472B6] to-[#EC4899]'
  },
  debugger: {
    border: '#F87171',
    glow: 'rgba(248, 113, 113, 0.3)',
    gradient: 'from-[#F87171] to-[#EF4444]'
  },
}

// =============================================================================
// HELPERS
// =============================================================================

/** Format duration in ms to human readable string */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/** Format token count with K/M suffixes */
function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
  return `${(tokens / 1000000).toFixed(1)}M`
}

/** Get status text for display */
function getStatusText(status: AgentStatus): string {
  const statusTexts: Record<AgentStatus, string> = {
    idle: 'Idle',
    working: 'Working',
    success: 'Complete',
    error: 'Error',
    pending: 'Pending',
  }
  return statusTexts[status]
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentCard = React.forwardRef<HTMLDivElement, AgentCardProps>(
  (
    {
      agent,
      selected = false,
      onClick,
      showDetails = false,
      compact = false,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    const typeStyle = agentTypeStyles[agent.type] || agentTypeStyles.coder
    const isInteractive = !!onClick
    const hasTask = !!agent.currentTask
    const hasProgress = hasTask && typeof agent.currentTask?.progress === 'number'

    return (
      <div
        ref={ref}
        role={isInteractive ? 'button' : 'article'}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
        data-testid={testId ?? `agent-card-${agent.id}`}
        data-agent-id={agent.id}
        data-agent-type={agent.type}
        data-agent-status={agent.status}
        className={cn(
          // Base styles
          'relative rounded-xl border transition-all duration-300',
          'bg-[#161B22]/80 backdrop-blur-sm',
          'border-[#30363D]',

          // Padding based on mode
          compact ? 'p-3' : 'p-4',

          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'hover:bg-[#161B22] hover:border-[#484F58]',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#0D1117]',
            'active:scale-[0.99]',
          ],

          // Selected state
          selected && [
            'bg-[#161B22]',
            'ring-1',
          ],

          // Working state animation
          agent.status === 'working' && 'animate-pulse-subtle',

          // Error state animation
          agent.status === 'error' && 'animate-shake',

          className
        )}
        style={{
          borderColor: selected ? typeStyle.border : undefined,
          boxShadow: selected
            ? `0 0 20px ${typeStyle.glow}, 0 4px 20px rgba(0, 0, 0, 0.3)`
            : agent.status === 'working'
              ? `0 0 15px ${typeStyle.glow}`
              : undefined,
          '--ring-color': typeStyle.border,
        } as React.CSSProperties}
      >
        {/* Gradient top border for selected/working */}
        {(selected || agent.status === 'working') && (
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-px',
              `bg-gradient-to-r ${typeStyle.gradient}`
            )}
            style={{ opacity: selected ? 1 : 0.5 }}
          />
        )}

        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AgentBadge type={agent.type} status={agent.status} size={compact ? 'sm' : 'md'} />

            <div className="min-w-0">
              <h4 className="font-medium text-[#F0F6FC] truncate">
                {getAgentLabel(agent.type)} Agent
              </h4>
              {!compact && agent.model && (
                <p className="text-xs text-[#8B949E] truncate">{agent.model}</p>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full',
              'flex items-center gap-1.5',
              agent.status === 'idle' && 'bg-[#21262D] text-[#8B949E]',
              agent.status === 'working' && 'bg-[#60A5FA]/10 text-[#60A5FA]',
              agent.status === 'success' && 'bg-[#3FB950]/10 text-[#3FB950]',
              agent.status === 'error' && 'bg-[#F85149]/10 text-[#F85149]',
              agent.status === 'pending' && 'bg-[#6E7681]/10 text-[#6E7681]'
            )}
          >
            {agent.status === 'working' && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {getStatusText(agent.status)}
          </div>
        </div>

        {/* Task info (non-compact only) */}
        {!compact && hasTask && (
          <div className="mt-3 space-y-2">
            {/* Task name */}
            <div className="flex items-center gap-2 text-sm text-[#8B949E]">
              <FileCode2 size={14} className="flex-shrink-0 text-[#6E7681]" />
              <span className="truncate">{agent.currentTask?.name}</span>
            </div>

            {/* Progress bar with gradient */}
            {hasProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#6E7681]">Progress</span>
                  <span className="text-xs text-[#8B949E] tabular-nums">
                    {agent.currentTask?.progress ?? 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      `bg-gradient-to-r ${typeStyle.gradient}`
                    )}
                    style={{ width: `${agent.currentTask?.progress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current file */}
            {agent.currentFile && (
              <div className="flex items-center gap-2 text-xs text-[#6E7681] font-mono">
                <Hash size={12} className="flex-shrink-0" />
                <span className="truncate">{agent.currentFile}</span>
              </div>
            )}
          </div>
        )}

        {/* Detailed metrics (when showDetails is true) */}
        {showDetails && !compact && (
          <div className="mt-4 pt-4 border-t border-[#30363D]">
            <div className="grid grid-cols-2 gap-4">
              {/* Iteration counter */}
              {agent.iteration && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'p-1.5 rounded-lg',
                      agent.iteration.current >= agent.iteration.max * 0.8
                        ? 'bg-[#F0883E]/10 text-[#F0883E]'
                        : 'bg-[#21262D] text-[#8B949E]'
                    )}
                  >
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6E7681]">Iteration</p>
                    <p className="text-sm font-medium text-[#F0F6FC] tabular-nums">
                      {agent.iteration.current}
                      <span className="text-[#6E7681]">/{agent.iteration.max}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Duration */}
              {agent.metrics?.duration !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#21262D] text-[#8B949E]">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6E7681]">Duration</p>
                    <p className="text-sm font-medium text-[#F0F6FC]">
                      {formatDuration(agent.metrics.duration)}
                    </p>
                  </div>
                </div>
              )}

              {/* Tokens used */}
              {agent.metrics?.tokensUsed !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#21262D] text-[#8B949E]">
                    <Hash size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6E7681]">Tokens</p>
                    <p className="text-sm font-medium text-[#F0F6FC]">
                      {formatTokens(agent.metrics.tokensUsed)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Working indicator line at bottom */}
        {agent.status === 'working' && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden"
            style={{ backgroundColor: `${typeStyle.border}30` }}
          >
            <div
              className="h-full animate-progress-indeterminate"
              style={{
                background: `linear-gradient(to right, ${typeStyle.border}, ${typeStyle.border}cc)`
              }}
            />
          </div>
        )}
      </div>
    )
  }
)

AgentCard.displayName = 'AgentCard'

export default AgentCard
