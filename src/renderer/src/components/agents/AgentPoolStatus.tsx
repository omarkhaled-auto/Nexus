/**
 * AgentPoolStatus Component
 *
 * Displays an overview of all agents in the pool with their current status.
 * Shows active/idle/error counts and allows agent selection.
 *
 * @example
 * // Basic usage
 * <AgentPoolStatus agents={agentList} maxAgents={5} />
 *
 * @example
 * // With agent selection
 * <AgentPoolStatus
 *   agents={agentList}
 *   maxAgents={5}
 *   selectedAgent={selectedAgentId}
 *   onSelectAgent={(id) => setSelectedAgent(id)}
 * />
 */

import React, { useMemo } from 'react'
import { Users, Zap, AlertCircle, Pause } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type AgentType, type AgentStatus, getAgentLabel } from '@renderer/styles/tokens'
import { AgentBadge } from './AgentBadge'

// =============================================================================
// TYPES
// =============================================================================

export interface PoolAgent {
  /** Agent ID */
  id: string
  /** Agent type */
  type: AgentType
  /** Current status */
  status: AgentStatus
  /** Current task name */
  taskName?: string
}

export interface AgentPoolStatusProps {
  /** Agents in pool */
  agents: PoolAgent[]
  /** Maximum pool size */
  maxAgents: number
  /** Currently selected agent ID */
  selectedAgent?: string
  /** Agent selection callback */
  onSelectAgent?: (agentId: string) => void
  /** Show as compact horizontal bar */
  compact?: boolean
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentPoolStatus = React.forwardRef<HTMLDivElement, AgentPoolStatusProps>(
  (
    {
      agents,
      maxAgents,
      selectedAgent,
      onSelectAgent,
      compact = false,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    // Calculate status counts
    const counts = useMemo(() => {
      return agents.reduce(
        (acc, agent) => {
          if (agent.status === 'working') acc.working++
          else if (agent.status === 'idle') acc.idle++
          else if (agent.status === 'error') acc.error++
          else if (agent.status === 'pending') acc.pending++
          else acc.complete++
          return acc
        },
        { working: 0, idle: 0, error: 0, pending: 0, complete: 0 }
      )
    }, [agents])

    const totalActive = agents.length
    const capacityPercent = (totalActive / maxAgents) * 100

    if (compact) {
      // Compact horizontal bar view
      return (
        <div
          ref={ref}
          data-testid={testId ?? 'agent-pool-status'}
          className={cn(
            'flex items-center gap-4 px-4 py-2 rounded-lg',
            'bg-bg-card border border-border-default',
            className
          )}
        >
          {/* Agent badges in a row */}
          <div className="flex items-center gap-2">
            {agents.map((agent) => (
              <AgentBadge
                key={agent.id}
                type={agent.type}
                status={agent.status}
                size="sm"
                onClick={onSelectAgent ? () => { onSelectAgent(agent.id); } : undefined}
                className={cn(selectedAgent === agent.id && 'ring-2 ring-accent-primary')}
              />
            ))}

            {/* Empty slots */}
            {Array.from({ length: maxAgents - agents.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-6 h-6 rounded-full border-2 border-dashed border-border-default opacity-30"
              />
            ))}
          </div>

          {/* Status summary */}
          <div className="flex items-center gap-3 text-xs text-text-secondary ml-auto">
            {counts.working > 0 && (
              <span className="flex items-center gap-1 text-accent-info">
                <Zap size={12} />
                {counts.working}
              </span>
            )}
            {counts.idle > 0 && (
              <span className="flex items-center gap-1">
                <Pause size={12} />
                {counts.idle}
              </span>
            )}
            {counts.error > 0 && (
              <span className="flex items-center gap-1 text-accent-error">
                <AlertCircle size={12} />
                {counts.error}
              </span>
            )}
          </div>
        </div>
      )
    }

    // Full card view
    return (
      <div
        ref={ref}
        data-testid={testId ?? 'agent-pool-status'}
        className={cn('rounded-lg border border-border-default bg-bg-card', className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-text-secondary" />
            <h3 className="font-medium text-text-primary">Agent Pool</h3>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">
              {totalActive}/{maxAgents}
            </span>
            {/* Capacity indicator */}
            <div className="w-16 h-1.5 rounded-full bg-bg-hover overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-normal',
                  capacityPercent < 50 && 'bg-accent-success',
                  capacityPercent >= 50 && capacityPercent < 80 && 'bg-accent-warning',
                  capacityPercent >= 80 && 'bg-accent-error'
                )}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status counts bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border-subtle bg-bg-muted/50">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-accent-info animate-pulse" />
            <span className="text-text-secondary">Working: {counts.working}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-text-tertiary" />
            <span className="text-text-secondary">Idle: {counts.idle}</span>
          </div>
          {counts.error > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-accent-error" />
              <span className="text-accent-error">Error: {counts.error}</span>
            </div>
          )}
          {counts.complete > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-accent-success" />
              <span className="text-text-secondary">Complete: {counts.complete}</span>
            </div>
          )}
        </div>

        {/* Agent grid */}
        <div className="p-4">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No agents in pool</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent?.(agent.id)}
                  disabled={!onSelectAgent}
                  data-testid={`pool-agent-${agent.id}`}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg',
                    'border border-border-default bg-bg-dark/50',
                    'transition-all duration-fast',
                    onSelectAgent && [
                      'hover:bg-bg-hover hover:border-border-subtle',
                      'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-card',
                    ],
                    selectedAgent === agent.id && [
                      'border-accent-primary bg-accent-primary/10',
                      'ring-1 ring-accent-primary/50',
                    ]
                  )}
                >
                  <AgentBadge type={agent.type} status={agent.status} size="md" />
                  <div className="text-center">
                    <p className="text-xs font-medium text-text-primary">
                      {getAgentLabel(agent.type)}
                    </p>
                    {agent.taskName && (
                      <p className="text-xs text-text-tertiary truncate max-w-[80px]">
                        {agent.taskName}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {/* Empty slots */}
              {Array.from({ length: maxAgents - agents.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-lg',
                    'border-2 border-dashed border-border-default/50',
                    'opacity-30'
                  )}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-border-default" />
                  <span className="text-xs text-text-tertiary">Empty</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

AgentPoolStatus.displayName = 'AgentPoolStatus'

export default AgentPoolStatus
