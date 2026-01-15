import { Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { useAgentMetrics } from '@renderer/stores/metricsStore'
import { AgentCard } from './AgentCard'
import { cn } from '@renderer/lib/utils'

export interface AgentActivityProps {
  className?: string
}

/**
 * AgentActivity - Grid display of all active agents with their status.
 * Shows 4-column grid on desktop, 2x2 on mobile.
 *
 * Visual design:
 * ```
 * │  🟢 Coder-1    │  🟢 Coder-2    │  🟡 Tester    │  ⚪ Review │
 * │  auth.ts       │  api.ts        │  Waiting...   │  Idle     │
 * │  ████████░ 80% │  ███░░░░░ 35%  │               │           │
 * ```
 *
 * Uses useAgentMetrics selector from metricsStore for real-time updates.
 */
export function AgentActivity({ className }: AgentActivityProps) {
  const agents = useAgentMetrics()

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bot className="h-4 w-4" />
          Agent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Empty state shown when no agents are active yet
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">No agents active</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Agents will appear here when execution begins
      </p>
    </div>
  )
}
