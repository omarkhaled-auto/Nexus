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
  className?: string
}

/**
 * Status dot colors for column indicators
 */
const statusDotColors: Record<FeatureStatus, { base: string; glow?: string; pulse?: boolean }> = {
  backlog: { base: 'bg-slate-500' },
  planning: { base: 'bg-violet-500', glow: 'shadow-[0_0_8px_rgba(139,92,246,0.5)]' },
  in_progress: { base: 'bg-blue-500', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]', pulse: true },
  ai_review: { base: 'bg-amber-500', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
  human_review: { base: 'bg-purple-500', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
  done: { base: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' }
}

/**
 * KanbanColumn - Premium glassmorphism column with Linear/Raycast aesthetics.
 *
 * Design:
 * - Glassmorphism background with subtle backdrop blur
 * - Status dot with color-coded indicator and animation
 * - Gradient bottom border on header
 * - Enhanced drop zone with animated dashed border
 * - Count badge with glow effect when at limit
 */
export function KanbanColumn({
  column,
  features,
  onFeatureClick,
  onFeatureEdit,
  onFeatureMove,
  onFeatureDelete,
  onContextMenu,
  className
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id }
  })

  // Get feature IDs for SortableContext
  const featureIds = features.map((f) => f.id)

  // Check if at WIP limit
  const isAtLimit = column.limit !== undefined && features.length >= column.limit

  // Get status dot config
  const dotConfig = statusDotColors[column.id]

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${column.id}`}
      className={cn(
        // Base glass styling
        'flex min-w-[280px] max-w-[320px] flex-1 flex-col rounded-xl p-3',
        'bg-[#161B22]/40 backdrop-blur-sm',
        'border border-[#30363D]/50',
        // Hover state
        'transition-all duration-200',
        'hover:border-[#30363D]/80 hover:bg-[#161B22]/50',
        // Drop zone styling with animated border
        isOver && [
          'border-2 border-dashed border-accent-primary/50',
          'bg-accent-primary/5',
          'shadow-[inset_0_0_30px_rgba(124,58,237,0.1)]'
        ],
        className
      )}
    >
      {/* Column header with gradient separator */}
      <div className="relative pb-3 mb-3">
        <div className="flex items-center justify-between px-1">
          {/* Left: Status dot + Title */}
          <div className="flex items-center gap-2">
            {/* Animated status dot */}
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                dotConfig.base,
                dotConfig.glow,
                dotConfig.pulse && 'animate-pulse'
              )}
            />
            <h2 className="text-sm font-medium text-text-secondary">
              {column.title}
            </h2>
          </div>

          {/* Right: Count badge */}
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium tabular-nums',
              'transition-all duration-200',
              isAtLimit
                ? 'bg-accent-error/20 text-accent-error shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-[#21262D] text-text-tertiary'
            )}
          >
            {features.length}
            {column.limit !== undefined && (
              <span className="text-text-muted">/{column.limit}</span>
            )}
          </span>
        </div>

        {/* Gradient bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
      </div>

      {/* Sortable feature cards */}
      <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto min-h-[100px] pr-1 scrollbar-thin">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onClick={onFeatureClick}
              onEdit={onFeatureEdit}
              onMove={onFeatureMove}
              onDelete={onFeatureDelete}
              onContextMenu={onContextMenu}
              className={cn(
                'animate-fade-in-up opacity-0',
                `stagger-${Math.min(index + 1, 6)}`
              )}
              style={{ animationFillMode: 'forwards' }}
            />
          ))}

          {/* Enhanced empty state placeholder */}
          {features.length === 0 && (
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed min-h-[120px]',
                'transition-all duration-300',
                isOver
                  ? 'border-accent-primary/60 bg-accent-primary/10 scale-[1.02]'
                  : 'border-[#30363D]/40 hover:border-[#30363D]/60'
              )}
            >
              {/* Drop indicator icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                  'transition-all duration-300',
                  isOver
                    ? 'bg-accent-primary/20 scale-110'
                    : 'bg-[#21262D]/50'
                )}
              >
                <svg
                  className={cn(
                    'w-5 h-5 transition-colors duration-300',
                    isOver ? 'text-accent-primary' : 'text-text-tertiary'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <span
                className={cn(
                  'text-xs transition-colors duration-300',
                  isOver ? 'text-accent-primary font-medium' : 'text-text-tertiary'
                )}
              >
                {isOver ? 'Release to drop' : 'No items'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
