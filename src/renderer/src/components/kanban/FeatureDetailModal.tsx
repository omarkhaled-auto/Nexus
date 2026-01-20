import { useState, type ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureTask } from '@renderer/types/feature'
import { Circle, CheckCircle2, Loader2, XCircle, Trash2, AlertTriangle } from 'lucide-react'
import { useFeatureStore } from '@renderer/stores/featureStore'

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const removeFeature = useFeatureStore((s) => s.removeFeature)

  if (!feature) return null

  const completedTasks = feature.tasks.filter((t) => t.status === 'completed').length
  const totalTasks = feature.tasks.length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await window.nexusAPI.deleteFeature(feature.id)
      if (result.success) {
        // Remove from local store
        removeFeature(feature.id)
        // Close the modal
        setShowDeleteConfirm(false)
        onOpenChange(false)
      } else {
        setDeleteError('Failed to delete feature')
      }
    } catch (error) {
      console.error('Failed to delete feature:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete feature')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      // Reset delete confirmation state when closing
      setShowDeleteConfirm(false)
      setDeleteError(null)
    }
    onOpenChange(isOpen)
  }

  // If showing delete confirmation, render confirmation dialog
  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Feature</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>&quot;{feature.title}&quot;</strong>?
              <br />
              <br />
              This action cannot be undone. All tasks associated with this feature will also be
              deleted.
            </DialogDescription>
          </DialogHeader>

          {/* Delete Error Message */}
          {deleteError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteError(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Feature
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          {/* Delete Action */}
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => { setShowDeleteConfirm(true) }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Feature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
