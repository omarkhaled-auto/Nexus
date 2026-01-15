import { Bot } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface AgentStatusIndicatorProps {
  /** Agent ID or name */
  agentId?: string | null
  /** Current status/activity of the agent */
  status?: string | null
}

// Status display configuration with pulse animation for active states
const ACTIVE_STATUSES = ['Running tests', 'Fixing lint', 'Writing code', 'Analyzing']

/**
 * AgentStatusIndicator - Shows AI agent assignment and current activity.
 * Displays agent with pulse animation when actively working.
 */
export function AgentStatusIndicator({ agentId, status }: AgentStatusIndicatorProps) {
  // If no agent assigned, show nothing or unassigned state
  if (!agentId) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
        <Bot className="h-3 w-3" />
        <span>Unassigned</span>
      </div>
    )
  }

  // Check if agent is actively working
  const isActive = status && ACTIVE_STATUSES.some((s) => status.toLowerCase().includes(s.toLowerCase()))

  // Shorten agent ID for display (e.g., "coder-agent-123" -> "Coder")
  const displayName = formatAgentName(agentId)

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {/* Bot icon with pulse animation when active */}
      <div className="relative">
        <Bot className={cn('h-3.5 w-3.5', isActive && 'text-emerald-500')} />
        {isActive && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
      </div>

      {/* Agent name */}
      <span className={cn('font-medium', isActive && 'text-foreground')}>{displayName}</span>

      {/* Status text */}
      {status && (
        <>
          <span className="text-muted-foreground/50">-</span>
          <span className={cn(isActive && 'text-emerald-600')}>{status}</span>
        </>
      )}
    </div>
  )
}

/**
 * Format agent ID into a readable display name.
 * Examples:
 * - "coder-agent-123" -> "Coder"
 * - "qa_agent" -> "QA"
 * - "task-decomposer" -> "Decomposer"
 */
function formatAgentName(agentId: string): string {
  // Common agent type mappings
  const agentTypes: Record<string, string> = {
    coder: 'Coder',
    qa: 'QA',
    reviewer: 'Reviewer',
    decomposer: 'Decomposer',
    architect: 'Architect',
    tester: 'Tester'
  }

  // Check if any known type is in the agent ID
  const lowerAgentId = agentId.toLowerCase()
  for (const [key, display] of Object.entries(agentTypes)) {
    if (lowerAgentId.includes(key)) {
      return display
    }
  }

  // Fallback: capitalize first part before - or _
  const firstPart = agentId.split(/[-_]/)[0]
  return firstPart ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1) : 'Agent'
}
