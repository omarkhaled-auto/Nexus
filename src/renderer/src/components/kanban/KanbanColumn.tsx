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
  onFeatureEdit?: (feature: Feature) => void
  onFeatureMove?: (feature: Feature) => void
  onFeatureDelete?: (feature: Feature) => void
  onContextMenu?: (e: React.MouseEvent, feature: Feature) => void
}

/**
 * KanbanColumn - Linear-inspired minimal column design.
 *
 * Design:
 * - Minimal header with just title + count
 * - No background color (transparent)
 * - Subtle separator line below header
 * - Dashed border + light tint on drag-over
 */
export function KanbanColumn({
  column,
  features,
  onFeatureClick,
  onFeatureEdit,
  onFeatureMove,
  onFeatureDelete,
  onContextMenu
}: KanbanColumnProps) {
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
        'flex min-w-[280px] flex-1 flex-col rounded-lg p-2',
        // Drop zone styling
        isOver && 'bg-primary/5 border-2 border-dashed border-primary/30',
        !isOver && 'border-2 border-transparent'
      )}
    >
      {/* Column header - minimal design */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-border/50 mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {column.title}
        </h2>
        <span
          className={cn(
            'text-sm tabular-nums',
            isAtLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
          )}
        >
          {features.length}
          {column.limit !== undefined && (
            <span className="text-muted-foreground/50">/{column.limit}</span>
          )}
        </span>
      </div>

      {/* Sortable feature cards */}
      <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto min-h-[100px]">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onClick={onFeatureClick}
              onEdit={onFeatureEdit}
              onMove={onFeatureMove}
              onDelete={onFeatureDelete}
              onContextMenu={onContextMenu}
            />
          ))}

          {/* Empty state placeholder */}
          {features.length === 0 && (
            <div className={cn(
              'flex-1 flex items-center justify-center rounded-lg border-2 border-dashed min-h-[100px]',
              isOver ? 'border-primary/50 bg-primary/5' : 'border-border/30'
            )}>
              <span className="text-xs text-muted-foreground/50">
                {isOver ? 'Drop here' : 'No items'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
