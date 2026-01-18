import { forwardRef, type HTMLAttributes } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureComplexity } from '@renderer/types/feature'
import { GripVertical, Circle, Clock } from 'lucide-react'

const priorityColors: Record<FeaturePriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
}

const complexityLabels: Record<FeatureComplexity, string> = {
  simple: 'S',
  moderate: 'M',
  complex: 'L'
}

export interface FeatureCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  feature: Feature
  onClick?: (feature: Feature) => void
  isDragging?: boolean
  isOverlay?: boolean
}

/**
 * FeatureCard - Draggable feature card for the Kanban board.
 */
export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ feature, onClick, isDragging, isOverlay, className, ...props }, ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isSortableDragging
    } = useSortable({
      id: feature.id,
      data: { type: 'feature', feature }
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isSortableDragging && !isOverlay ? 0.5 : 1
    }

    const completedTasks = feature.tasks.filter((t) => t.status === 'completed').length
    const totalTasks = feature.tasks.length

    return (
      <Card
        ref={(node) => {
          setNodeRef(node)
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        style={style}
        className={cn(
          'cursor-pointer transition-shadow hover:shadow-md',
          isDragging && 'ring-2 ring-primary',
          isOverlay && 'shadow-lg',
          className
        )}
        onClick={() => onClick?.(feature)}
        {...props}
      >
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-sm font-medium">
              {feature.title}
            </CardTitle>
            <button
              className="cursor-grab touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {feature.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle className={cn('h-2 w-2 fill-current', priorityColors[feature.priority])} />
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {complexityLabels[feature.complexity]}
              </span>
            </div>
            {totalTasks > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks} tasks
              </span>
            )}
          </div>
          {feature.assignedAgent && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="truncate">{feature.assignedAgent}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'
