import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Feature, FeaturePriority } from '@renderer/types/feature'
import { cn } from '@renderer/lib/utils'

interface FeatureCardProps {
  feature: Feature
  isOverlay?: boolean
}

// Priority border colors
const PRIORITY_COLORS: Record<FeaturePriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-500'
}

export function FeatureCard({ feature, isOverlay = false }: FeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: feature.id,
    data: {
      type: 'feature',
      feature
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        // Base styles
        'cursor-grab rounded-lg border border-l-4 bg-card p-3 shadow-sm',
        // Priority border color
        PRIORITY_COLORS[feature.priority],
        // Dragging state - make original item semi-transparent
        isDragging && !isOverlay && 'opacity-50',
        // Overlay - slight scale and shadow for visual feedback
        isOverlay && 'rotate-2 scale-105 shadow-lg'
      )}
    >
      {/* Title */}
      <h3 className="font-medium text-foreground">{feature.title}</h3>

      {/* Description snippet */}
      {feature.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {feature.description}
        </p>
      )}

      {/* Footer with complexity */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{feature.complexity}</span>
        {feature.progress > 0 && (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span>{feature.progress}%</span>
          </>
        )}
      </div>
    </div>
  )
}
