import type { ReactElement } from 'react'
import { useEffect, useCallback, useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { KanbanBoard, KanbanHeader, ExecutionControls } from '@renderer/components/kanban'
import { AnimatedPage } from '@renderer/components/AnimatedPage'
import { useFeatureStore } from '@renderer/stores/featureStore'
import type { Feature, FeatureStatus, FeaturePriority, FeatureComplexity } from '@renderer/types/feature'
import type { ExecutionStatus } from '@/types/execution'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/Input'
import { cn } from '@renderer/lib/utils'

/**
 * Check if running in Electron environment with nexusAPI available
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.nexusAPI !== 'undefined' &&
    typeof window.nexusAPI.getFeatures === 'function'
}

/**
 * Map backend feature data to renderer Feature type
 * Handles type conversion and default values
 */
function mapBackendFeature(backendFeature: Record<string, unknown>): Feature {
  // Map status (convert any backend format to renderer format)
  const statusMap: Record<string, FeatureStatus> = {
    backlog: 'backlog',
    planning: 'planning',
    in_progress: 'in_progress',
    'in-progress': 'in_progress',
    ai_review: 'ai_review',
    'ai-review': 'ai_review',
    human_review: 'human_review',
    'human-review': 'human_review',
    done: 'done'
  }

  // Map priority
  const priorityMap: Record<string, FeaturePriority> = {
    critical: 'critical',
    must: 'critical',
    high: 'high',
    should: 'high',
    medium: 'medium',
    could: 'medium',
    low: 'low',
    wont: 'low'
  }

  // Map complexity
  const complexityMap: Record<string, FeatureComplexity> = {
    simple: 'simple',
    moderate: 'moderate',
    complex: 'complex'
  }

  const rawStatus = String(backendFeature.status || 'backlog')
  const rawPriority = String(backendFeature.priority || 'medium')
  const rawComplexity = String(backendFeature.complexity || 'moderate')

  return {
    id: String(backendFeature.id || `feature-${Date.now()}`),
    title: String(backendFeature.title || backendFeature.name || 'Untitled Feature'),
    description: String(backendFeature.description || ''),
    status: statusMap[rawStatus] || 'backlog',
    priority: priorityMap[rawPriority] || 'medium',
    complexity: complexityMap[rawComplexity] || 'moderate',
    progress: typeof backendFeature.progress === 'number' ? backendFeature.progress : 0,
    assignedAgent: backendFeature.assignedAgent ? String(backendFeature.assignedAgent) : undefined,
    tasks: Array.isArray(backendFeature.tasks)
      ? (backendFeature.tasks as Array<Record<string, unknown>>).map(t => ({
          id: String(t.id || ''),
          title: String(t.title || t.name || ''),
          status: String(t.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'failed'
        }))
      : [],
    createdAt: String(backendFeature.createdAt || new Date().toISOString()),
    updatedAt: String(backendFeature.updatedAt || new Date().toISOString())
  }
}

/**
 * KanbanPage - Evolution mode Kanban board.
 * Displays features flowing through the 6-column pipeline.
 * Connects to real backend data via IPC when running in Electron.
 */
export default function KanbanPage(): ReactElement {
  const setFeatures = useFeatureStore((s) => s.setFeatures)
  const updateFeature = useFeatureStore((s) => s.updateFeature)
  const addFeature = useFeatureStore((s) => s.addFeature)
  const features = useFeatureStore((s) => s.features)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)

  // Add Feature modal state
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false)
  const [newFeatureTitle, setNewFeatureTitle] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')
  const [newFeaturePriority, setNewFeaturePriority] = useState<FeaturePriority>('medium')
  const [newFeatureComplexity, setNewFeatureComplexity] = useState<FeatureComplexity>('moderate')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Execution state - will be connected to orchestration hook in TASK 6
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle')
  const [executionStartedAt, setExecutionStartedAt] = useState<string | null>(null)
  const [currentTaskName, setCurrentTaskName] = useState<string | undefined>(undefined)

  // Calculate execution stats from features
  const executionStats = useMemo(() => {
    const total = features.length
    const completed = features.filter(f => f.status === 'done').length
    const failed = 0 // Will be tracked properly in TASK 6
    const inProgress = features.filter(f => f.status === 'in_progress').length

    return { total, completed, failed, inProgress }
  }, [features])

  /**
   * Load features from backend API
   */
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) {
      // Not in Electron environment - show error state
      setError('Backend not available. Please run in Electron.')
      setIsLoading(false)
      setIsEmpty(true)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch features from backend
      const backendFeatures = await window.nexusAPI.getFeatures()

      if (Array.isArray(backendFeatures) && backendFeatures.length > 0) {
        // Map backend features to renderer format
        const mappedFeatures = backendFeatures.map(f =>
          mapBackendFeature(f as Record<string, unknown>)
        )
        setFeatures(mappedFeatures)
        setIsEmpty(false)
      } else {
        // No features from backend - show empty state
        setFeatures([])
        setIsEmpty(true)
      }
    } catch (err) {
      console.error('Failed to load features:', err)
      setError('Failed to load features from backend.')
      setIsEmpty(features.length === 0)
    } finally {
      setIsLoading(false)
    }
  }, [features.length, setFeatures])

  /**
   * Subscribe to real-time feature updates
   */
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) {
      return () => {} // No-op unsubscribe for non-Electron
    }

    // Subscribe to feature updates
    const unsubscribeFeatureUpdate = window.nexusAPI.onFeatureUpdate((featureData) => {
      const feature = mapBackendFeature(featureData as Record<string, unknown>)
      updateFeature(feature.id, feature)
    })

    // Subscribe to task updates (which may affect feature progress)
    const unsubscribeTaskUpdate = window.nexusAPI.onTaskUpdate((taskData) => {
      const task = taskData as Record<string, unknown>
      const featureId = task.featureId as string | undefined
      if (featureId) {
        // Refresh features when a task is updated
        void loadRealData()
      }
    })

    // Return cleanup function
    return () => {
      unsubscribeFeatureUpdate()
      unsubscribeTaskUpdate()
    }
  }, [updateFeature, loadRealData])

  // Initialize data and subscriptions on mount
  useEffect(() => {
    void loadRealData()
    const unsubscribe = subscribeToEvents()
    return unsubscribe
  }, [loadRealData, subscribeToEvents])

  /**
   * Handle creating a new feature via backend API
   */
  const handleCreateFeature = useCallback(async () => {
    if (!newFeatureTitle.trim()) {
      setCreateError('Feature title is required')
      return
    }

    if (!isElectronEnvironment()) {
      setCreateError('Backend not available')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      // Call backend to create feature
      const createdFeature = await window.nexusAPI.createFeature({
        title: newFeatureTitle.trim(),
        description: newFeatureDescription.trim() || undefined,
        priority: newFeaturePriority,
        complexity: newFeatureComplexity
      })

      // Map the created feature and add to local store
      const mappedFeature = mapBackendFeature(createdFeature as Record<string, unknown>)
      addFeature(mappedFeature)

      // Reset form and close modal
      setIsAddFeatureModalOpen(false)
      setNewFeatureTitle('')
      setNewFeatureDescription('')
      setNewFeaturePriority('medium')
      setNewFeatureComplexity('moderate')
      setIsEmpty(false)
    } catch (err) {
      console.error('Failed to create feature:', err)
      setCreateError(err instanceof Error ? err.message : 'Failed to create feature')
    } finally {
      setIsCreating(false)
    }
  }, [newFeatureTitle, newFeatureDescription, newFeaturePriority, newFeatureComplexity, addFeature])

  /**
   * Handle closing the Add Feature modal
   */
  const handleCloseAddFeatureModal = useCallback(() => {
    setIsAddFeatureModalOpen(false)
    setNewFeatureTitle('')
    setNewFeatureDescription('')
    setNewFeaturePriority('medium')
    setNewFeatureComplexity('moderate')
    setCreateError(null)
  }, [])

  /**
   * Open the Add Feature modal
   */
  const handleOpenAddFeatureModal = useCallback(() => {
    setIsAddFeatureModalOpen(true)
  }, [])

  /**
   * Execution control handlers - placeholders until TASK 6
   * These will be replaced with the useTaskOrchestration hook
   */
  const handleStartExecution = useCallback(() => {
    setExecutionStatus('running')
    setExecutionStartedAt(new Date().toISOString())
    setCurrentTaskName(features[0]?.title || 'Starting...')
    // TODO: Connect to backend orchestration in TASK 6
  }, [features])

  const handlePauseExecution = useCallback(() => {
    setExecutionStatus('paused')
    // TODO: Connect to backend orchestration in TASK 6
  }, [])

  const handleResumeExecution = useCallback(() => {
    setExecutionStatus('running')
    // TODO: Connect to backend orchestration in TASK 6
  }, [])

  const handleStopExecution = useCallback(() => {
    setExecutionStatus('idle')
    setExecutionStartedAt(null)
    setCurrentTaskName(undefined)
    // TODO: Connect to backend orchestration in TASK 6
  }, [])

  const handleRestartExecution = useCallback(() => {
    setExecutionStatus('idle')
    setExecutionStartedAt(null)
    setCurrentTaskName(undefined)
    // TODO: Connect to backend orchestration in TASK 6
  }, [])

  return (
    <AnimatedPage className="flex h-full flex-col">
      {/* Header - fixed at top */}
      <KanbanHeader projectName="Nexus" onNewFeature={handleOpenAddFeatureModal} />

      {/* Execution Controls - below header, above board */}
      {!isLoading && !isEmpty && features.length > 0 && (
        <ExecutionControls
          status={executionStatus}
          totalTasks={executionStats.total}
          completedTasks={executionStats.completed}
          failedTasks={executionStats.failed}
          currentTaskName={currentTaskName}
          startedAt={executionStartedAt}
          canStart={executionStats.total > 0}
          onStart={handleStartExecution}
          onPause={handlePauseExecution}
          onResume={handleResumeExecution}
          onStop={handleStopExecution}
          onRestart={handleRestartExecution}
        />
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-status-warning/10 border border-status-warning/20 px-4 py-2 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Board - fills remaining space, scrollable */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
              <span className="text-sm text-text-secondary">Loading features...</span>
            </div>
          </div>
        ) : isEmpty && features.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
              <div className="h-16 w-16 rounded-full bg-bg-tertiary flex items-center justify-center">
                <svg className="h-8 w-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-1">No features yet</h3>
                <p className="text-sm text-text-secondary">
                  Complete the interview process to generate features, or add them manually using the button above.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <KanbanBoard />
        )}
      </div>

      {/* Add Feature Modal */}
      <Dialog open={isAddFeatureModalOpen} onOpenChange={handleCloseAddFeatureModal}>
        <DialogContent className="bg-bg-card border-border-default">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Add New Feature</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Create a new feature to add to the backlog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Feature Title Input */}
            <Input
              label="Feature Title"
              placeholder="User authentication system"
              value={newFeatureTitle}
              onChange={(e) => { setNewFeatureTitle(e.target.value); }}
              error={createError || undefined}
              data-testid="add-feature-title-input"
            />

            {/* Feature Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Description (optional)</label>
              <textarea
                placeholder="Describe the feature requirements..."
                value={newFeatureDescription}
                onChange={(e) => { setNewFeatureDescription(e.target.value); }}
                className="w-full h-24 px-3 py-2 text-sm rounded-md border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 resize-none"
                data-testid="add-feature-description-input"
              />
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {(['critical', 'high', 'medium', 'low'] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => { setNewFeaturePriority(priority); }}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md border transition-all capitalize',
                      newFeaturePriority === priority
                        ? priority === 'critical'
                          ? 'border-status-error bg-status-error/10 text-status-error'
                          : priority === 'high'
                            ? 'border-status-warning bg-status-warning/10 text-status-warning'
                            : priority === 'medium'
                              ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                              : 'border-text-tertiary bg-bg-tertiary text-text-secondary'
                        : 'border-border-default hover:border-border-subtle text-text-secondary'
                    )}
                    data-testid={`add-feature-priority-${priority}`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Complexity Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Complexity</label>
              <div className="grid grid-cols-3 gap-2">
                {(['simple', 'moderate', 'complex'] as const).map((complexity) => (
                  <button
                    key={complexity}
                    type="button"
                    onClick={() => { setNewFeatureComplexity(complexity); }}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md border transition-all capitalize',
                      newFeatureComplexity === complexity
                        ? 'border-accent-secondary bg-accent-secondary/10 text-accent-secondary'
                        : 'border-border-default hover:border-border-subtle text-text-secondary'
                    )}
                    data-testid={`add-feature-complexity-${complexity}`}
                  >
                    {complexity}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCloseAddFeatureModal}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => { void handleCreateFeature(); }}
              disabled={isCreating || !newFeatureTitle.trim()}
              data-testid="add-feature-submit"
              className="gap-2"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Add Feature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  )
}
