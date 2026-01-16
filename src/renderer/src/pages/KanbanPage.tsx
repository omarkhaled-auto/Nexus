import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { KanbanBoard, KanbanHeader } from '@renderer/components/kanban'
import { AnimatedPage } from '@renderer/components/AnimatedPage'
import { useFeatureStore } from '@renderer/stores/featureStore'
import type { Feature } from '@renderer/types/feature'

// Demo features for visual testing
const DEMO_FEATURES: Feature[] = [
  {
    id: 'feat-1',
    title: 'User Authentication System',
    description: 'Implement OAuth2 login flow with Google and GitHub providers. Include session management and token refresh.',
    status: 'backlog',
    complexity: 'complex',
    progress: 0,
    assignedAgent: null,
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
    assignedAgent: null,
    tasks: [],
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

/**
 * KanbanPage - Evolution mode Kanban board.
 * Displays features flowing through the 6-column pipeline.
 */
export default function KanbanPage(): ReactElement {
  const setFeatures = useFeatureStore((s) => s.setFeatures)
  const features = useFeatureStore((s) => s.features)

  // Initialize with demo features on mount (only if empty)
  useEffect(() => {
    if (features.length === 0) {
      setFeatures(DEMO_FEATURES)
    }
  }, [features.length, setFeatures])

  return (
    <AnimatedPage className="flex h-full flex-col">
      {/* Header - fixed at top */}
      <KanbanHeader projectName="Nexus" />

      {/* Board - fills remaining space, scrollable */}
      <div className="flex-1 overflow-auto">
        <KanbanBoard />
      </div>
    </AnimatedPage>
  )
}
