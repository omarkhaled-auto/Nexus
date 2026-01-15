import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Feature, FeaturePriority } from '@renderer/types/feature'
import { cn } from '@renderer/lib/utils'
import { ComplexityBadge } from './ComplexityBadge'
import { ProgressIndicator } from './ProgressIndicator'
import { AgentStatusIndicator } from './AgentStatusIndicator'

interface FeatureCardProps {
  feature: Feature
  isOverlay?: boolean
  onClick?: () => void
}

// Priority border colors
const PRIORITY_COLORS: Record<FeaturePriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-500'
}

/**
 * FeatureCard - Draggable card displaying feature info with visual indicators.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │ [Title]         [S/M/XL]   │
 * │ Description snippet...      │
 * │ ────────────────────────── │
 * │ [Progress bar ████░░░ 40%] │
 * │ [Bot] Coder - Running tests │
 * └─────────────────────────────┘
 */
export function FeatureCard({ feature, isOverlay = false, onClick }: FeatureCardProps) {
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

  // Handle click - only trigger if not dragging
  const handleClick = () => {
    if (!isDragging && onClick) {
      onClick()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        // Base styles
        'cursor-grab rounded-lg border border-l-4 bg-card p-3 shadow-sm',
        // Priority border color
        PRIORITY_COLORS[feature.priority],
        // Dragging state - make original item semi-transparent
        isDragging && !isOverlay && 'opacity-50',
        // Overlay - slight scale and shadow for visual feedback
        isOverlay && 'rotate-2 scale-105 shadow-lg',
        // Clickable styles
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-md transition-shadow'
      )}
    >
      {/* Header: Title + Complexity Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex-1 font-medium text-foreground">{feature.title}</h3>
        <ComplexityBadge complexity={feature.complexity} />
      </div>

      {/* Description snippet */}
      {feature.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {feature.description}
        </p>
      )}

      {/* Divider */}
      <div className="my-2 border-t border-border" />

      {/* Progress indicator */}
      <ProgressIndicator progress={feature.progress} showLabel className="mb-2" />

      {/* Agent status */}
      <AgentStatusIndicator
        agentId={feature.assignedAgent}
        status={getAgentStatus(feature)}
      />
    </div>
  )
}

/**
 * Derive agent status from feature state.
 * In production, this would come from real agent state.
 */
function getAgentStatus(feature: Feature): string | null {
  // For demo purposes, derive status from feature status
  switch (feature.status) {
    case 'planning':
      return 'Decomposing tasks'
    case 'in_progress':
      if (feature.progress < 30) return 'Writing code'
      if (feature.progress < 60) return 'Running tests'
      if (feature.progress < 90) return 'Fixing lint'
      return 'Finalizing'
    case 'ai_review':
      return 'Code review'
    case 'human_review':
      return 'Awaiting review'
    default:
      return null
  }
}
