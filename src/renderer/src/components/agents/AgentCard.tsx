/**
 * AgentCard Component
 *
 * Displays detailed information about an AI agent including its type,
 * current status, assigned task, progress, and metrics.
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
import { Clock, FileCode2, Zap, Hash } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type AgentType, type AgentStatus, getAgentLabel, colors } from '@renderer/styles/tokens'
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
    const agentColor = colors.agent[agent.type]
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
                  onClick?.()
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
          'relative rounded-lg border transition-all duration-normal',
          'bg-bg-card border-border-default',

          // Padding based on mode
          compact ? 'p-3' : 'p-4',

          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'hover:bg-bg-hover hover:border-border-subtle',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark',
            'active:scale-[0.99]',
          ],

          // Selected state
          selected && [
            'border-accent-primary bg-bg-hover',
            'ring-1 ring-accent-primary/50',
            // Glow effect
            'shadow-glow-primary',
          ],

          // Working state animation
          agent.status === 'working' && 'animate-pulse-subtle',

          className
        )}
        style={
          selected
            ? {
                borderColor: agentColor,
                boxShadow: `0 0 20px ${agentColor}30`,
              }
            : undefined
        }
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AgentBadge type={agent.type} status={agent.status} size={compact ? 'sm' : 'md'} />

            <div className="min-w-0">
              <h4 className="font-medium text-text-primary truncate">
                {getAgentLabel(agent.type)} Agent
              </h4>
              {!compact && agent.model && (
                <p className="text-xs text-text-secondary truncate">{agent.model}</p>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              agent.status === 'idle' && 'bg-text-tertiary/20 text-text-tertiary',
              agent.status === 'working' && 'bg-accent-info/20 text-accent-info',
              agent.status === 'success' && 'bg-accent-success/20 text-accent-success',
              agent.status === 'error' && 'bg-accent-error/20 text-accent-error',
              agent.status === 'pending' && 'bg-text-muted/20 text-text-muted'
            )}
          >
            {getStatusText(agent.status)}
          </div>
        </div>

        {/* Task info (non-compact only) */}
        {!compact && hasTask && (
          <div className="mt-3 space-y-2">
            {/* Task name */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FileCode2 size={14} className="flex-shrink-0 text-text-tertiary" />
              <span className="truncate">{agent.currentTask?.name}</span>
            </div>

            {/* Progress bar */}
            {hasProgress && (
              <Progress
                value={agent.currentTask?.progress ?? 0}
                variant="default"
                size="sm"
                showValue
                className="mt-2"
              />
            )}

            {/* Current file */}
            {agent.currentFile && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono">
                <Hash size={12} className="flex-shrink-0" />
                <span className="truncate">{agent.currentFile}</span>
              </div>
            )}
          </div>
        )}

        {/* Detailed metrics (when showDetails is true) */}
        {showDetails && !compact && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="grid grid-cols-2 gap-4">
              {/* Iteration counter */}
              {agent.iteration && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'p-1.5 rounded-md',
                      agent.iteration.current >= agent.iteration.max * 0.8
                        ? 'bg-accent-warning/20 text-accent-warning'
                        : 'bg-bg-hover text-text-secondary'
                    )}
                  >
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Iteration</p>
                    <p className="text-sm font-medium text-text-primary">
                      {agent.iteration.current}
                      <span className="text-text-tertiary">/{agent.iteration.max}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Duration */}
              {agent.metrics?.duration !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-bg-hover text-text-secondary">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Duration</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatDuration(agent.metrics.duration)}
                    </p>
                  </div>
                </div>
              )}

              {/* Tokens used */}
              {agent.metrics?.tokensUsed !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-bg-hover text-text-secondary">
                    <Hash size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Tokens</p>
                    <p className="text-sm font-medium text-text-primary">
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
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden"
            style={{ backgroundColor: `${agentColor}30` }}
          >
            <div
              className="h-full animate-progress-indeterminate"
              style={{ backgroundColor: agentColor }}
            />
          </div>
        )}
      </div>
    )
  }
)

AgentCard.displayName = 'AgentCard'

export default AgentCard
