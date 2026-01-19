import type { ReactElement } from 'react'
import { useEffect, useCallback, useState } from 'react'
import { KanbanBoard, KanbanHeader } from '@renderer/components/kanban'
import { AnimatedPage } from '@renderer/components/AnimatedPage'
import { useFeatureStore } from '@renderer/stores/featureStore'
import type { Feature, FeatureStatus, FeaturePriority, FeatureComplexity } from '@renderer/types/feature'

// Demo features for visual testing (used when not in Electron environment)
const DEMO_FEATURES: Feature[] = [
  {
    id: 'feat-1',
    title: 'User Authentication System',
    description: 'Implement OAuth2 login flow with Google and GitHub providers. Include session management and token refresh.',
    status: 'backlog',
    complexity: 'complex',
    progress: 0,
    assignedAgent: undefined,
    tasks: [],
    priority: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'feat-2',
    title: 'Dashboard Analytics Widget',
    description: 'Create real-time analytics dashboard showing key metrics and trends.',
    status: 'planning',
    complexity: 'moderate',
    progress: 15,
    assignedAgent: 'decomposer-agent',
    tasks: [],
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'feat-3',
    title: 'API Rate Limiting',
    description: 'Add rate limiting middleware to protect API endpoints from abuse.',
    status: 'in_progress',
    complexity: 'simple',
    progress: 45,
    assignedAgent: 'coder-agent',
    tasks: [],
    priority: 'critical',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'feat-4',
    title: 'Email Notification Service',
    description: 'Build email notification system with template support and queue processing.',
    status: 'ai_review',
    complexity: 'moderate',
    progress: 80,
    assignedAgent: 'qa-agent',
    tasks: [],
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'feat-5',
    title: 'Dark Mode Support',
    description: 'Add system-wide dark mode toggle with CSS variable theming.',
    status: 'human_review',
    complexity: 'simple',
    progress: 95,
    assignedAgent: 'reviewer-agent',
    tasks: [],
    priority: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'feat-6',
    title: 'File Upload Component',
    description: 'Drag and drop file upload with progress indicator and validation.',
    status: 'done',
    complexity: 'moderate',
    progress: 100,
    assignedAgent: undefined,
    tasks: [],
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

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
 * Connects to real backend data when running in Electron, falls back to demo data otherwise.
 */
export default function KanbanPage(): ReactElement {
  const setFeatures = useFeatureStore((s) => s.setFeatures)
  const updateFeature = useFeatureStore((s) => s.updateFeature)
  const features = useFeatureStore((s) => s.features)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load features from backend API
   */
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) {
      // Not in Electron - use demo data
      if (features.length === 0) {
        setFeatures(DEMO_FEATURES)
      }
      setIsLoading(false)
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
      } else {
        // No features from backend - use demo data for now
        // In production, this would show an empty board or onboarding
        if (features.length === 0) {
          setFeatures(DEMO_FEATURES)
        }
      }
    } catch (err) {
      console.error('Failed to load features:', err)
      setError('Failed to load features. Using demo data.')
      // Fall back to demo data on error
      if (features.length === 0) {
        setFeatures(DEMO_FEATURES)
      }
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

  return (
    <AnimatedPage className="flex h-full flex-col">
      {/* Header - fixed at top */}
      <KanbanHeader projectName="Nexus" />

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
        ) : (
          <KanbanBoard />
        )}
      </div>
    </AnimatedPage>
  )
}
