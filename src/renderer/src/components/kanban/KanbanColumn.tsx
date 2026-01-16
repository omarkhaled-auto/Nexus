import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Feature, FeatureStatus } from '@renderer/types/feature'
import { cn } from '@renderer/lib/utils'
import { FeatureCard } from './FeatureCard'

interface ColumnConfig {
  id: FeatureStatus
  title: string
  limit?: number
}

interface KanbanColumnProps {
  column: ColumnConfig
  features: Feature[]
  onFeatureClick?: (feature: Feature) => void
}

export function KanbanColumn({ column, features, onFeatureClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id }
  })

  // Get feature IDs for SortableContext
  const featureIds = features.map((f) => f.id)

  // Check if at WIP limit
  const isAtLimit = column.limit !== undefined && features.length >= column.limit

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-w-[280px] flex-1 flex-col rounded-lg bg-muted/30 p-3',
        isOver && 'ring-2 ring-primary/50'
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">{column.title}</h2>
        <span
          className={cn(
            'rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground',
            isAtLimit && 'bg-destructive/20 text-destructive'
          )}
        >
          {features.length}
          {column.limit !== undefined && `/${column.limit}`}
        </span>
      </div>

      {/* Sortable feature cards */}
      <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col space-y-2 overflow-y-auto">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onClick={onFeatureClick ? () => { onFeatureClick(feature); } : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
