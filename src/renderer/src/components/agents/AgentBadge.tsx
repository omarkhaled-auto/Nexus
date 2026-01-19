/**
 * AgentBadge Component
 *
 * Displays an agent type with its corresponding icon and color.
 * Used to identify different AI agent types throughout the Nexus UI.
 *
 * @example
 * // Basic usage
 * <AgentBadge type="coder" />
 *
 * @example
 * // With status indicator
 * <AgentBadge type="coder" status="working" showLabel />
 *
 * @example
 * // Interactive badge
 * <AgentBadge type="planner" status="idle" onClick={() => selectAgent('planner')} />
 */

import React from 'react'
import {
  Brain,
  Code2,
  TestTube2,
  Eye,
  GitMerge,
  Building2,
  Bug,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type AgentType, type AgentStatus, colors, getAgentLabel } from '@renderer/styles/tokens'

// =============================================================================
// TYPES
// =============================================================================

export interface AgentBadgeProps {
  /** Agent type */
  type: AgentType
  /** Agent status - shows status indicator dot */
  status?: AgentStatus
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
  /** Show type label text */
  showLabel?: boolean
  /** Click handler - makes badge interactive */
  onClick?: () => void
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Icon mapping for each agent type */
const AGENT_ICONS: Record<AgentType, LucideIcon> = {
  planner: Brain,
  coder: Code2,
  tester: TestTube2,
  reviewer: Eye,
  merger: GitMerge,
  architect: Building2,
  debugger: Bug,
  documenter: FileText,
}

/** Size configurations */
const SIZE_CONFIG = {
  sm: {
    container: 'h-6 px-2 gap-1.5',
    icon: 14,
    text: 'text-xs',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'h-8 px-3 gap-2',
    icon: 16,
    text: 'text-sm',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'h-10 px-4 gap-2.5',
    icon: 20,
    text: 'text-base',
    dot: 'w-2.5 h-2.5',
  },
}

/** Status color mapping - uses Tailwind classes */
const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-text-tertiary',
  working: 'bg-accent-info animate-pulse',
  success: 'bg-accent-success',
  error: 'bg-accent-error',
  pending: 'bg-text-muted',
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentBadge = React.forwardRef<HTMLDivElement, AgentBadgeProps>(
  (
    { type, status, size = 'md', showLabel = false, onClick, className, 'data-testid': testId },
    ref
  ) => {
    const Icon = AGENT_ICONS[type]
    const config = SIZE_CONFIG[size]
    const agentColor = colors.agent[type]
    const label = getAgentLabel(type)
    const isInteractive = !!onClick

    return (
      <div
        ref={ref}
        role={isInteractive ? 'button' : undefined}
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
        data-testid={testId ?? `agent-badge-${type}`}
        data-agent-type={type}
        data-agent-status={status}
        className={cn(
          // Base styles
          'inline-flex items-center rounded-full font-medium',
          'transition-all duration-fast',
          config.container,
          config.text,

          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'hover:opacity-90',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark',
            'active:scale-95',
          ],

          className
        )}
        style={{
          backgroundColor: `${agentColor}20`, // 20% opacity background
          color: agentColor,
          borderColor: agentColor,
          border: `1px solid ${agentColor}40`, // 40% opacity border
        }}
      >
        {/* Icon */}
        <Icon size={config.icon} className="flex-shrink-0" strokeWidth={2} />

        {/* Label text */}
        {showLabel && <span className="whitespace-nowrap">{label}</span>}

        {/* Status indicator dot */}
        {status && (
          <span
            className={cn(
              'rounded-full flex-shrink-0',
              config.dot,
              STATUS_COLORS[status],
              // Add ring effect for working status
              status === 'working' && 'ring-2 ring-accent-info/30'
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    )
  }
)

AgentBadge.displayName = 'AgentBadge'

export default AgentBadge
