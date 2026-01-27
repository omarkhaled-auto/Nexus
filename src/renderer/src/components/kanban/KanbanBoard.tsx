import { useState, useMemo, useCallback } from 'react'
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
import type { KanbanTask, KanbanTaskStatus } from '@/types/execution'
import { useFeatureStore } from '@renderer/stores/featureStore'
import { useExecutionStore } from '@renderer/hooks/useTaskOrchestration'
import { KanbanColumn } from './KanbanColumn'
import { FeatureCard } from './FeatureCard'
import { DetailPanel, type DetailPanelMode } from './DetailPanel'
import { CardContextMenu } from './CardContextMenu'
import { CommandPalette } from './CommandPalette'

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

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<DetailPanelMode>('feature')
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)

  // Context menu state
  const [contextMenuFeature, setContextMenuFeature] = useState<Feature | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  // Get raw features and filter from store
  const allFeatures = useFeatureStore((s) => s.features)
  const filter = useFeatureStore((s) => s.filter)
  const moveFeature = useFeatureStore((s) => s.moveFeature)
  const reorderFeatures = useFeatureStore((s) => s.reorderFeatures)
  const removeFeature = useFeatureStore((s) => s.removeFeature)

  // Get execution store state and actions
  const executionTasks = useExecutionStore((s) => s.tasks)
  const executionStatus = useExecutionStore((s) => s.status)
  const updateTask = useExecutionStore((s) => s.updateTask)

  // Check if we're in execution mode (have tasks loaded)
  const isExecutionMode = executionTasks.length > 0 && executionStatus !== 'idle'

  // Memoize filtered features to avoid infinite loop
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- dnd-kit sortable uses any type for containerId
    const sortableContainerId = over.data.current?.sortable?.containerId as FeatureStatus | undefined
    const overColumnId =
      (over.data.current?.columnId as FeatureStatus | undefined) ||
      sortableContainerId ||
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

  // Handle feature click - open detail panel
  const handleFeatureClick = useCallback((feature: Feature) => {
    // Only open panel if we're not in the middle of a drag operation
    if (!activeId) {
      // If in execution mode, find the corresponding task and open task panel
      if (isExecutionMode) {
        const task = executionTasks.find(t => t.id === feature.id || t.featureId === feature.id)
        if (task) {
          setSelectedTask(task)
          setSelectedFeature(null)
          setPanelMode('task')
          setPanelOpen(true)
          return
        }
      }
      setSelectedFeature(feature)
      setSelectedTask(null)
      setPanelMode('feature')
      setPanelOpen(true)
    }
  }, [activeId, isExecutionMode, executionTasks])

  // Handle feature edit (same as click for now)
  const handleFeatureEdit = useCallback((feature: Feature) => {
    handleFeatureClick(feature)
  }, [handleFeatureClick])

  // Handle feature move (open move menu via context menu)
  const _handleFeatureMove = useCallback((feature: Feature, event?: React.MouseEvent) => {
    // If we have an event, use its position
    if (event) {
      setContextMenuFeature(feature)
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
    }
  }, [])

  // Handle feature delete
  const handleFeatureDelete = useCallback(async (featureId: string) => {
    const result = await window.nexusAPI.deleteFeature(featureId)
    if (result.success) {
      removeFeature(featureId)
    }
  }, [removeFeature])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, feature: Feature) => {
    e.preventDefault()
    setContextMenuFeature(feature)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }, [])

  // Close panel
  const handleClosePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedFeature(null)
    setSelectedTask(null)
  }, [])

  // Task modal action handlers
  const handleStartTask = useCallback((taskId: string): void => {
    updateTask(taskId, {
      status: 'in-progress' as KanbanTaskStatus,
      startedAt: new Date().toISOString(),
      progress: 0
    })
  }, [updateTask])

  const handleCancelTask = useCallback((taskId: string): void => {
    updateTask(taskId, {
      status: 'cancelled' as KanbanTaskStatus,
      completedAt: new Date().toISOString()
    })
    handleClosePanel()
  }, [updateTask, handleClosePanel])

  const handleRetryTask = useCallback((taskId: string): void => {
    const task = executionTasks.find(t => t.id === taskId)
    if (task) {
      updateTask(taskId, {
        status: 'pending' as KanbanTaskStatus,
        progress: 0,
        retryCount: task.retryCount + 1,
        completedAt: null,
        errors: []
      })
    }
  }, [executionTasks, updateTask])

  const handleSkipTask = useCallback((taskId: string): void => {
    updateTask(taskId, {
      status: 'cancelled' as KanbanTaskStatus,
      completedAt: new Date().toISOString()
    })
    handleClosePanel()
  }, [updateTask, handleClosePanel])

  const handleReopenTask = useCallback((taskId: string): void => {
    updateTask(taskId, {
      status: 'pending' as KanbanTaskStatus,
      progress: 0,
      completedAt: null
    })
  }, [updateTask])

  // Handle move from context menu
  const handleMoveToColumn = useCallback((feature: Feature, column: FeatureStatus) => {
    if (feature.status !== column) {
      moveFeature(feature.id, column)
    }
    setContextMenuFeature(null)
  }, [moveFeature])

  // Handle priority change from context menu
  const handleChangePriority = useCallback(async (feature: Feature, priority: Feature['priority']) => {
    // Update feature priority via API and store
    try {
      const result = await window.nexusAPI.updateFeature(feature.id, { priority })
      if (result) {
        // Update local store
        const updateFeatureStore = useFeatureStore.getState().updateFeature
        updateFeatureStore(feature.id, { priority })
      }
    } catch (error) {
      console.error('[KanbanBoard] Failed to update feature priority:', error)
    }
    setContextMenuFeature(null)
  }, [])

  // Handle feature update from DetailPanel inline editing
  const handleUpdateFeature = useCallback(async (featureId: string, updates: Partial<Feature>) => {
    try {
      const result = await window.nexusAPI.updateFeature(featureId, updates)
      if (result) {
        // Update local store
        const updateFeatureStore = useFeatureStore.getState().updateFeature
        updateFeatureStore(featureId, updates)
        // Update selected feature if it's the one being edited
        if (selectedFeature?.id === featureId) {
          setSelectedFeature({ ...selectedFeature, ...updates })
        }
      }
    } catch (error) {
      console.error('[KanbanBoard] Failed to update feature:', error)
    }
  }, [selectedFeature])

  // Handle command palette actions
  const handleCommandSelect = useCallback((featureId: string) => {
    const feature = features.find(f => f.id === featureId)
    if (feature) {
      handleFeatureClick(feature)
    }
  }, [features, handleFeatureClick])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Enhanced Kanban container with layered backgrounds */}
        <div className="relative h-full bg-bg-dark bg-grid-pattern" data-testid="kanban-board">
          {/* Gradient mesh overlay for depth */}
          <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />

          {/* Radial spotlight effect - top center glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 800px 400px at 50% -10%, rgba(124, 58, 237, 0.08) 0%, transparent 60%)'
            }}
          />

          {/* Column container */}
          <div className="relative flex h-full gap-4 overflow-x-auto p-4 pb-6">
            {COLUMNS.map((column, index) => (
              <KanbanColumn
                key={column.id}
                column={column}
                features={featuresByColumn[column.id]}
                onFeatureClick={handleFeatureClick}
                onFeatureEdit={handleFeatureEdit}
                onFeatureDelete={(feature) => void handleFeatureDelete(feature.id)}
                onContextMenu={handleContextMenu}
                className={`animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
        }}>
          {activeFeature ? <FeatureCard feature={activeFeature} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Panel (replaces both modals) */}
      <DetailPanel
        open={panelOpen}
        onClose={handleClosePanel}
        mode={panelMode}
        feature={selectedFeature}
        task={selectedTask}
        allTasks={executionTasks}
        onDeleteFeature={handleFeatureDelete}
        onUpdateFeature={handleUpdateFeature}
        onStartTask={handleStartTask}
        onCancelTask={handleCancelTask}
        onRetryTask={handleRetryTask}
        onSkipTask={handleSkipTask}
        onReopenTask={handleReopenTask}
      />

      {/* Context Menu */}
      <CardContextMenu
        feature={contextMenuFeature}
        position={contextMenuPosition}
        columns={COLUMNS}
        onClose={() => { setContextMenuFeature(null); }}
        onEdit={handleFeatureEdit}
        onMoveTo={handleMoveToColumn}
        onChangePriority={(feature, priority) => { void handleChangePriority(feature, priority); }}
        onDelete={(feature) => void handleFeatureDelete(feature.id)}
      />

      {/* Command Palette */}
      <CommandPalette
        features={features}
        onSelectFeature={handleCommandSelect}
      />
    </>
  )
}
