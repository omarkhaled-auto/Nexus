import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useAgentMetrics } from '@renderer/stores/metricsStore'
import type { AgentMetrics, AgentStatus } from '@renderer/types/metrics'
import { Bot, Circle } from 'lucide-react'

export interface AgentActivityProps {
  className?: string
}

const statusColors: Record<AgentStatus, string> = {
  idle: 'text-gray-400',
  working: 'text-green-500',
  error: 'text-red-500',
  waiting: 'text-yellow-500'
}

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  error: 'Error',
  waiting: 'Waiting'
}

/**
 * AgentActivity - Shows status of all active agents.
 */
export function AgentActivity({ className }: AgentActivityProps): ReactElement {
  const agents = useAgentMetrics()

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4" />
          Agent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="text-muted-foreground text-sm">No active agents</div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent: AgentMetrics) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className={cn('h-2 w-2 fill-current', statusColors[agent.status])} />
                  <span className="text-sm font-medium capitalize">{agent.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn('text-xs', statusColors[agent.status])}>
                    {statusLabels[agent.status]}
                  </span>
                  {agent.currentTaskName && (
                    <span className="max-w-[120px] truncate text-muted-foreground text-xs">
                      {agent.currentTaskName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
