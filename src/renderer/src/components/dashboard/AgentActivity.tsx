import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useAgentMetrics } from '@renderer/stores/metricsStore'
import type { AgentMetrics, AgentStatus } from '@renderer/types/metrics'
import {
  Bot,
  Circle,
  Code2,
  TestTube2,
  Eye,
  GitMerge,
  Lightbulb,
  Bug,
  FileText
} from 'lucide-react'

export interface AgentActivityProps {
  className?: string
}

const statusColors: Record<AgentStatus, string> = {
  idle: 'text-status-idle',
  working: 'text-status-working',
  error: 'text-status-error',
  waiting: 'text-status-warning'
}

const statusBgColors: Record<AgentStatus, string> = {
  idle: 'bg-status-idle/10',
  working: 'bg-status-working/10',
  error: 'bg-status-error/10',
  waiting: 'bg-status-warning/10'
}

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  error: 'Error',
  waiting: 'Waiting'
}

// Agent type icons
const agentIcons: Record<string, typeof Bot> = {
  coder: Code2,
  tester: TestTube2,
  reviewer: Eye,
  merger: GitMerge,
  planner: Lightbulb,
  architect: Lightbulb,
  debugger: Bug,
  documenter: FileText
}

// Agent type colors
const agentColors: Record<string, string> = {
  coder: 'text-agent-coder',
  tester: 'text-agent-tester',
  reviewer: 'text-agent-reviewer',
  merger: 'text-agent-merger',
  planner: 'text-agent-planner',
  architect: 'text-agent-planner',
  debugger: 'text-agent-planner',
  documenter: 'text-agent-planner'
}

/**
 * AgentActivity - Shows status of all active agents.
 * Enhanced with Nexus design system styling.
 */
export function AgentActivity({ className }: AgentActivityProps): ReactElement {
  const agents = useAgentMetrics()

  return (
    <Card className={cn('h-full', className)} data-testid="agent-feed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <div className="p-1.5 rounded-md bg-accent-secondary/10">
            <Bot className="h-4 w-4 text-accent-secondary" />
          </div>
          Agent Activity
          {agents.length > 0 && (
            <span className="ml-auto text-xs font-normal text-text-secondary">
              {agents.filter(a => a.status === 'working').length} active
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="text-text-secondary text-sm py-4 text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No active agents
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent: AgentMetrics) => {
              const Icon = agentIcons[agent.type]
              const agentColor = agentColors[agent.type]

              return (
                <div
                  key={agent.id}
                  data-testid="agent-feed-item"
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg transition-colors',
                    'hover:bg-bg-hover',
                    agent.status === 'working' && 'bg-bg-hover'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator with pulse animation for working */}
                    <div className="relative">
                      <Circle
                        className={cn(
                          'h-2.5 w-2.5 fill-current',
                          statusColors[agent.status]
                        )}
                      />
                      {agent.status === 'working' && (
                        <Circle
                          className={cn(
                            'h-2.5 w-2.5 fill-current absolute inset-0 animate-ping opacity-75',
                            statusColors[agent.status]
                          )}
                        />
                      )}
                    </div>

                    {/* Agent icon and type */}
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', agentColor)} />
                      <span className="text-sm font-medium text-text-primary capitalize">
                        {agent.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    {/* Status badge */}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      statusBgColors[agent.status],
                      statusColors[agent.status]
                    )}>
                      {statusLabels[agent.status]}
                    </span>

                    {/* Current task */}
                    {agent.currentTaskName && (
                      <span className="max-w-[100px] truncate text-text-tertiary text-xs">
                        {agent.currentTaskName}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
