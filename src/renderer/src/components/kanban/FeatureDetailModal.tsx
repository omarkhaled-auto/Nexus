import type { Feature, FeaturePriority } from '@renderer/types/feature'
import { useTaskStore, type Task } from '@renderer/stores/taskStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@renderer/components/ui/dialog'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ComplexityBadge } from './ComplexityBadge'
import { ProgressIndicator } from './ProgressIndicator'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import { TaskList } from './TaskList'
import { cn } from '@renderer/lib/utils'

interface FeatureDetailModalProps {
  feature: Feature | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-muted text-muted-foreground',
  planning: 'bg-purple-500/15 text-purple-500',
  in_progress: 'bg-blue-500/15 text-blue-500',
  ai_review: 'bg-amber-500/15 text-amber-500',
  human_review: 'bg-orange-500/15 text-orange-500',
  done: 'bg-emerald-500/15 text-emerald-500'
}

// Priority indicator colors
const PRIORITY_COLORS: Record<FeaturePriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-500'
}

// Format status for display
function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Derive agent status from feature state
function getAgentStatus(feature: Feature): string | null {
  switch (feature.status) {
    case 'planning':
      return 'Decomposing tasks'
    case 'in_progress':
      if (feature.progress < 30) return 'Writing code'
      if (feature.progress < 60) return 'Running tests'
      if (feature.progress < 90) return 'Fixing lint'
      return 'Finalizing'
    case 'ai_review':
      return 'Code review'
    case 'human_review':
      return 'Awaiting review'
    default:
      return null
  }
}

/**
 * Get real tasks from the task store for the feature.
 * Falls back to demo tasks if no real tasks exist.
 */
function getFeatureTasks(feature: Feature, allTasks: Task[]): Task[] {
  // Try to get real tasks from the store based on feature.tasks IDs
  if (feature.tasks.length > 0) {
    const realTasks = feature.tasks
      .map((taskId) => allTasks.find((t) => t.id === taskId))
      .filter((t): t is Task => t !== undefined)

    if (realTasks.length > 0) {
      return realTasks
    }
  }

  // Fallback to demo tasks if no real tasks exist
  return generateDemoTasks(feature)
}

// Generate demo tasks for a feature (fallback)
function generateDemoTasks(feature: Feature): Task[] {
  const taskTemplates: Array<{
    name: string
    status: Task['status']
    agent?: string
    minutes?: number
  }> = [
    { name: 'Define requirements', status: 'completed', agent: 'planner-agent', minutes: 10 },
    { name: 'Create database schema', status: 'completed', agent: 'coder-agent', minutes: 15 },
    { name: 'Implement API endpoint', status: 'in_progress', agent: 'coder-agent', minutes: 20 },
    { name: 'Write unit tests', status: 'pending', agent: 'tester-agent', minutes: 25 },
    { name: 'Integration testing', status: 'pending', minutes: 30 }
  ]

  // Adjust task statuses based on feature progress
  return taskTemplates.map((t, idx) => {
    let status = t.status
    const progressThreshold = (idx + 1) * 20

    if (feature.status === 'done') {
      status = 'completed'
    } else if (feature.progress >= progressThreshold) {
      status = 'completed'
    } else if (feature.progress >= progressThreshold - 20 && feature.status !== 'backlog') {
      status = 'in_progress'
    }

    return {
      id: `${feature.id}-task-${idx}`,
      name: t.name,
      status,
      assignedAgent: t.agent,
      estimatedMinutes: t.minutes
    }
  })
}

// Generate demo activity timeline
function generateActivityTimeline(feature: Feature): Array<{ time: string; event: string }> {
  const activities: Array<{ time: string; event: string }> = []
  const baseTime = new Date(feature.updatedAt)

  if (feature.status !== 'backlog') {
    activities.push({
      time: formatTime(new Date(baseTime.getTime() - 30 * 60000)),
      event: 'Feature moved to planning'
    })
  }

  if (['in_progress', 'ai_review', 'human_review', 'done'].includes(feature.status)) {
    activities.push({
      time: formatTime(new Date(baseTime.getTime() - 20 * 60000)),
      event: 'Agent started working'
    })
    activities.push({
      time: formatTime(new Date(baseTime.getTime() - 15 * 60000)),
      event: 'Build passed'
    })
  }

  if (['ai_review', 'human_review', 'done'].includes(feature.status)) {
    activities.push({
      time: formatTime(new Date(baseTime.getTime() - 10 * 60000)),
      event: 'Code submitted for review'
    })
  }

  if (feature.status === 'done') {
    activities.push({
      time: formatTime(new Date(baseTime.getTime() - 5 * 60000)),
      event: 'Review approved'
    })
    activities.push({
      time: formatTime(baseTime),
      event: 'Feature completed'
    })
  } else if (feature.status === 'in_progress') {
    activities.push({
      time: formatTime(baseTime),
      event: 'Tests running'
    })
  }

  return activities.slice(-5) // Last 5 activities
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * FeatureDetailModal - Expanded view of a feature with tasks and activity timeline.
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │ [X]                                      │
 * │ Feature Title                 [S/M/XL]  │
 * │ Full description text here...           │
 * │ ─────────────────────────────────────── │
 * │ Status: In Progress    Priority: High   │
 * │ Progress: ████████░░░░░░ 60%           │
 * │ Agent: Coder - Running tests            │
 * │ ─────────────────────────────────────── │
 * │ Tasks (5)                               │
 * │ [●] Implement API endpoint    [15m]     │
 * │ [✓] Create database schema    [10m]     │
 * │ [○] Write unit tests          [20m]     │
 * │ ─────────────────────────────────────── │
 * │ Activity Timeline                       │
 * │ 12:45 - Agent started working           │
 * │ 12:50 - Build passed                    │
 * │ 12:52 - Tests running                   │
 * └─────────────────────────────────────────┘
 */
export function FeatureDetailModal({ feature, open, onOpenChange }: FeatureDetailModalProps) {
  // Get tasks from real store
  const allTasks = useTaskStore((s) => s.tasks)

  if (!feature) return null

  // Get tasks: real from store if available, else demo fallback
  const tasks = getFeatureTasks(feature, allTasks)
  // TODO: Connect activity timeline to real event history in integration phase
  const activities = generateActivityTimeline(feature)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <DialogTitle className="text-xl">{feature.title}</DialogTitle>
            <ComplexityBadge complexity={feature.complexity} />
          </div>
          <DialogDescription className="text-left">{feature.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[calc(85vh-200px)]">
            {/* Info Tab */}
            <TabsContent value="info" className="pr-4">
              <div className="space-y-4">
                {/* Status and Priority Row */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_COLORS[feature.status]
                      )}
                    >
                      {formatStatus(feature.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Priority:</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[feature.priority])}
                      />
                      <span className="text-sm capitalize">{feature.priority}</span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <ProgressIndicator progress={feature.progress} showLabel className="h-3" />
                </div>

                {/* Agent Status */}
                <div className="pb-2">
                  <AgentStatusIndicator
                    agentId={feature.assignedAgent}
                    status={getAgentStatus(feature)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="pr-4">
              <div className="pt-2">
                <h4 className="mb-3 text-sm font-medium text-foreground">
                  Tasks ({tasks.length})
                </h4>
                <TaskList tasks={tasks} featureId={feature.id} />
              </div>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="pr-4">
              <div className="pt-2">
                <h4 className="mb-3 text-sm font-medium text-foreground">Review Feedback</h4>
                <p className="text-sm text-muted-foreground">No feedback yet</p>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="pr-4">
              <div className="pt-2">
                <h4 className="mb-3 text-sm font-medium text-foreground">Activity Timeline</h4>
                {activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span className="w-12 shrink-0 text-muted-foreground">{activity.time}</span>
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                        <span className="text-muted-foreground">{activity.event}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
