import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { Plus, Search, Layers, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useFeatureCount, useFeatureStore } from '@renderer/stores/featureStore'
import { cn } from '@renderer/lib/utils'

interface TaskSummary {
  total: number
  completed: number
  inProgress: number
  blocked: number
  pending: number
}

interface KanbanHeaderProps {
  /** Project or board name */
  projectName?: string
  /** Callback when Add Feature button is clicked */
  onNewFeature?: () => void
  /** Task summary statistics */
  taskSummary?: TaskSummary
  /** Currently active filter */
  activeFilter?: string | null
  /** Callback when filter changes */
  onFilterChange?: (filter: string | null) => void
  /** Search placeholder text */
  searchPlaceholder?: string
  /** Whether to show the add feature button */
  showAddFeature?: boolean
}

/**
 * KanbanHeader - Header component for the Kanban board.
 * Displays project name, task summary, search, filters, and action buttons.
 */
export function KanbanHeader({
  projectName,
  onNewFeature,
  taskSummary,
  activeFilter,
  onFilterChange,
  searchPlaceholder = 'Search tasks...',
  showAddFeature = true
}: KanbanHeaderProps): ReactElement {
  const featureCount = useFeatureCount()
  const setSearchFilter = useFeatureStore((s) => s.setSearchFilter)
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search filter updates
  const debouncedSetSearch = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      return (value: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
          setSearchFilter(value)
        }, 300)
      }
    })(),
    [setSearchFilter]
  )

  // Update debounced search when input changes
  useEffect(() => {
    debouncedSetSearch(searchInput)
  }, [searchInput, debouncedSetSearch])

  // Calculate summary stats for display
  const summary = taskSummary || {
    total: featureCount,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    pending: featureCount
  }

  const completionPercentage = summary.total > 0
    ? Math.round((summary.completed / summary.total) * 100)
    : 0

  return (
    <header className="border-b border-border-default bg-bg-secondary/50">
      {/* Main header row */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side: Title and summary */}
        <div className="flex items-center gap-6">
          {/* Project title */}
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent-primary" />
            <h1 className="text-xl font-semibold text-text-primary">
              {projectName || 'Evolution Mode'}
            </h1>
          </div>

          {/* Task summary badges */}
          <div className="hidden md:flex items-center gap-3">
            {/* Total tasks */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-text-tertiary">Total:</span>
              <span className="font-medium text-text-primary">{summary.total}</span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border-default" />

            {/* Completed */}
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-text-secondary">{summary.completed}</span>
            </div>

            {/* In Progress */}
            {summary.inProgress > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-text-secondary">{summary.inProgress}</span>
              </div>
            )}

            {/* Blocked */}
            {summary.blocked > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-text-secondary">{summary.blocked}</span>
              </div>
            )}

            {/* Progress percentage */}
            {summary.total > 0 && (
              <>
                <div className="h-4 w-px bg-border-default" />
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-tertiary">{completionPercentage}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side: Search and Actions */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); }}
              className={cn(
                'h-9 w-56 lg:w-64 rounded-md border border-border-default',
                'bg-bg-secondary pl-9 pr-3 text-sm text-text-primary',
                'placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary'
              )}
            />
          </div>

          {/* Filter button */}
          <Button
            variant={showFilters || activeFilter ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(activeFilter && 'text-accent-primary border-accent-primary')}
            title="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </Button>

          {/* Add Feature button */}
          {showAddFeature && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewFeature}
              disabled={!onNewFeature}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add Feature</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter row (expandable) */}
      {showFilters && (
        <div className="flex items-center gap-2 px-6 py-2 border-t border-border-default bg-bg-tertiary/30">
          <span className="text-xs text-text-tertiary mr-2">Filter by:</span>

          {/* Priority filters */}
          {['all', 'critical', 'high', 'medium', 'low'].map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange?.(filter === 'all' ? null : filter)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-colors capitalize',
                (activeFilter === filter || (filter === 'all' && !activeFilter))
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {filter}
            </button>
          ))}

          {/* Status filters */}
          <div className="h-4 w-px bg-border-default mx-1" />
          {['blocked', 'in-progress', 'completed'].map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange?.(activeFilter === filter ? null : filter)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-colors capitalize',
                activeFilter === filter
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {filter.replace('-', ' ')}
            </button>
          ))}

          {/* Clear filters */}
          {activeFilter && (
            <>
              <div className="h-4 w-px bg-border-default mx-1" />
              <button
                onClick={() => onFilterChange?.(null)}
                className="px-2.5 py-1 text-xs rounded-md text-text-tertiary hover:text-text-secondary"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
