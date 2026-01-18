import type { ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@renderer/components/ui/dialog'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureTask } from '@renderer/types/feature'
import { Circle, CheckCircle2, Loader2, XCircle } from 'lucide-react'

const priorityColors: Record<FeaturePriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
}

const priorityLabels: Record<FeaturePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

const taskStatusIcons = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  failed: XCircle
}

const taskStatusColors = {
  pending: 'text-muted-foreground',
  in_progress: 'text-blue-500 animate-spin',
  completed: 'text-green-500',
  failed: 'text-red-500'
}

export interface FeatureDetailModalProps {
  feature: Feature | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * FeatureDetailModal - Modal showing detailed feature information.
 */
export function FeatureDetailModal({
  feature,
  open,
  onOpenChange
}: FeatureDetailModalProps): ReactElement | null {
  if (!feature) return null

  const completedTasks = feature.tasks.filter((t) => t.status === 'completed').length
  const totalTasks = feature.tasks.length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Circle className={cn('h-3 w-3 fill-current', priorityColors[feature.priority])} />
            <span className="text-xs text-muted-foreground">
              {priorityLabels[feature.priority]} Priority
            </span>
          </div>
          <DialogTitle className="text-xl">{feature.title}</DialogTitle>
          <DialogDescription>{feature.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{feature.status.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Complexity</span>
              <p className="font-medium capitalize">{feature.complexity}</p>
            </div>
            {feature.assignedAgent && (
              <div>
                <span className="text-muted-foreground">Assigned Agent</span>
                <p className="font-medium">{feature.assignedAgent}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium">
                {new Date(feature.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Tasks */}
          {feature.tasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tasks ({completedTasks}/{totalTasks})</h4>
              <div className="space-y-1">
                {feature.tasks.map((task: FeatureTask) => {
                  const Icon = taskStatusIcons[task.status]
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                    >
                      <Icon className={cn('h-4 w-4', taskStatusColors[task.status])} />
                      <span className={task.status === 'completed' ? 'line-through opacity-60' : ''}>
                        {task.title}
                      </span>
                      {task.estimatedMinutes && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {task.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {feature.tags && feature.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {feature.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
