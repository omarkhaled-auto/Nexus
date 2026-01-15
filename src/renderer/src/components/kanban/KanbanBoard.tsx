import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Feature, FeatureStatus } from '@renderer/types/feature'
import { useFeatureStore } from '@renderer/stores/featureStore'
import { KanbanColumn } from './KanbanColumn'
import { FeatureCard } from './FeatureCard'
import { FeatureDetailModal } from './FeatureDetailModal'

// 6-column Kanban configuration
export const COLUMNS: {
  id: FeatureStatus
  title: string
  limit?: number
}[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'planning', title: 'Planning' },
  { id: 'in_progress', title: 'In Progress', limit: 3 },
  { id: 'ai_review', title: 'AI Review' },
  { id: 'human_review', title: 'Human Review' },
  { id: 'done', title: 'Done' }
]

export function KanbanBoard() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  // Get raw features and filter from store
  const allFeatures = useFeatureStore((s) => s.features)
  const filter = useFeatureStore((s) => s.filter)
  const moveFeature = useFeatureStore((s) => s.moveFeature)
  const reorderFeatures = useFeatureStore((s) => s.reorderFeatures)

  // Memoize filtered features to avoid infinite loop
  // (useFilteredFeatures creates new array each render, causing React sync issues)
  const features = useMemo(() => {
    if (!filter.search && !filter.priority && !filter.status) {
      return allFeatures
    }
    return allFeatures.filter((f) => {
      const matchesSearch =
        !filter.search ||
        f.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        f.description.toLowerCase().includes(filter.search.toLowerCase())
      const matchesPriority = !filter.priority || filter.priority.includes(f.priority)
      const matchesStatus = !filter.status || filter.status.includes(f.status)
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [allFeatures, filter])

  // Configure sensors with distance constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Get the active feature for DragOverlay
  const activeFeature = useMemo(
    () => (activeId ? features.find((f) => f.id === activeId) : null),
    [activeId, features]
  )

  // Group features by column status
  const featuresByColumn = useMemo(() => {
    const grouped: Record<FeatureStatus, typeof features> = {
      backlog: [],
      planning: [],
      in_progress: [],
      ai_review: [],
      human_review: [],
      done: []
    }
    for (const feature of features) {
      grouped[feature.status].push(feature)
    }
    return grouped
  }, [features])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeFeatureId = active.id as string
    const draggedFeature = features.find((f) => f.id === activeFeatureId)

    if (!draggedFeature) return

    // Determine target column from drop location
    const overColumnId =
      (over.data.current?.columnId as FeatureStatus | undefined) ||
      (over.data.current?.sortable?.containerId as FeatureStatus | undefined) ||
      (over.id as FeatureStatus)

    // Check if dropping on a column or a feature
    const isOverColumn = COLUMNS.some((col) => col.id === over.id)
    const isOverFeature = features.some((f) => f.id === over.id)

    if (isOverColumn) {
      // Dropping directly on a column (empty area)
      if (draggedFeature.status !== overColumnId) {
        moveFeature(activeFeatureId, overColumnId)
      }
    } else if (isOverFeature) {
      // Dropping on another feature
      const overFeature = features.find((f) => f.id === over.id)
      if (!overFeature) return

      const targetColumn = overFeature.status

      if (draggedFeature.status === targetColumn) {
        // Same column - reorder
        const columnFeatures = featuresByColumn[targetColumn]
        const oldIndex = columnFeatures.findIndex((f) => f.id === active.id)
        const newIndex = columnFeatures.findIndex((f) => f.id === over.id)

        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          reorderFeatures(targetColumn, oldIndex, newIndex)
        }
      } else {
        // Different column - move to new column
        moveFeature(activeFeatureId, targetColumn)
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Handle feature click - only open modal if not dragging
  function handleFeatureClick(feature: Feature) {
    // Only open modal if we're not in the middle of a drag operation
    if (!activeId) {
      setSelectedFeature(feature)
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex h-full gap-4 overflow-x-auto p-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              features={featuresByColumn[column.id]}
              onFeatureClick={handleFeatureClick}
            />
          ))}
        </div>
        <DragOverlay>
          {activeFeature ? <FeatureCard feature={activeFeature} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <FeatureDetailModal
        feature={selectedFeature}
        open={!!selectedFeature}
        onOpenChange={(open) => !open && setSelectedFeature(null)}
      />
    </>
  )
}
