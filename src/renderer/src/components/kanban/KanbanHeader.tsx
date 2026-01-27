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
 *
 * Features glassmorphism design with gradient borders, glowing search input,
 * animated progress ring, and filter pills with active state glow.
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
  const [isSearchFocused, setIsSearchFocused] = useState(false)

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

  // SVG progress ring calculations
  const ringSize = 32
  const strokeWidth = 3
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference

  return (
    <header className={cn(
      "relative",
      "bg-[#161B22]/70 backdrop-blur-md",
      "border-b border-[#30363D]/50"
    )}>
      {/* Gradient bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

      {/* Main header row */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side: Title and summary */}
        <div className="flex items-center gap-6">
          {/* Project title with icon glow */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Layers className="h-5 w-5 text-[#7C3AED]" />
              <div className="absolute inset-0 blur-md bg-[#7C3AED]/30" />
            </div>
            <h1 className="text-xl font-semibold text-[#F0F6FC]">
              {projectName || 'Evolution Mode'}
            </h1>
          </div>

          {/* Task summary badges */}
          <div className="hidden md:flex items-center gap-4">
            {/* Animated progress ring */}
            {summary.total > 0 && (
              <div className="relative flex items-center gap-2">
                <svg
                  width={ringSize}
                  height={ringSize}
                  className="transform -rotate-90"
                >
                  {/* Background ring */}
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke="#21262D"
                    strokeWidth={strokeWidth}
                  />
                  {/* Progress ring with glow */}
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 ease-out"
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                    }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-sm font-medium text-[#F0F6FC] tabular-nums">
                  {completionPercentage}%
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="h-5 w-px bg-gradient-to-b from-transparent via-[#30363D] to-transparent" />

            {/* Status indicators with subtle glow */}
            <div className="flex items-center gap-3">
              {/* Completed */}
              <div className="flex items-center gap-1.5 text-sm group">
                <div className="relative">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div className="absolute inset-0 blur-sm bg-emerald-400/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[#8B949E] group-hover:text-[#F0F6FC] transition-colors">
                  {summary.completed}
                </span>
              </div>

              {/* In Progress */}
              {summary.inProgress > 0 && (
                <div className="flex items-center gap-1.5 text-sm group">
                  <div className="relative">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div className="absolute inset-0 blur-sm bg-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[#8B949E] group-hover:text-[#F0F6FC] transition-colors">
                    {summary.inProgress}
                  </span>
                </div>
              )}

              {/* Blocked */}
              {summary.blocked > 0 && (
                <div className="flex items-center gap-1.5 text-sm group">
                  <div className="relative">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <div className="absolute inset-0 blur-sm bg-red-400/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[#8B949E] group-hover:text-[#F0F6FC] transition-colors">
                    {summary.blocked}
                  </span>
                </div>
              )}
            </div>

            {/* Total count badge */}
            <div className="px-2.5 py-1 rounded-md bg-[#21262D]/80 border border-[#30363D]/50">
              <span className="text-xs text-[#8B949E]">
                {summary.total} total
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Search and Actions */}
        <div className="flex items-center gap-3">
          {/* Search input with animated glow */}
          <div className={cn(
            "relative group",
            isSearchFocused && "z-10"
          )}>
            {/* Glow effect on focus */}
            <div className={cn(
              "absolute -inset-1 rounded-lg opacity-0 transition-opacity duration-300",
              "bg-gradient-to-r from-[#7C3AED]/20 via-[#A855F7]/20 to-[#7C3AED]/20 blur-md",
              isSearchFocused && "opacity-100"
            )} />

            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
                isSearchFocused ? "text-[#7C3AED]" : "text-[#8B949E]"
              )} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "h-9 w-56 lg:w-64 rounded-lg",
                  "bg-[#0D1117] border border-[#30363D]",
                  "pl-9 pr-3 text-sm text-[#F0F6FC]",
                  "placeholder:text-[#8B949E]",
                  "focus:outline-none focus:border-[#7C3AED]",
                  "focus:ring-2 focus:ring-[#7C3AED]/20",
                  "focus:shadow-[0_0_15px_rgba(124,58,237,0.15)]",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>

          {/* Filter button with active glow */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { setShowFilters(!showFilters); }}
            className={cn(
              "relative h-9 w-9 rounded-lg border transition-all duration-200",
              showFilters || activeFilter
                ? "bg-[#7C3AED]/10 border-[#7C3AED]/50 text-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                : "bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#30363D]/80"
            )}
            title="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </Button>

          {/* Add Feature button with gradient */}
          {showAddFeature && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewFeature}
              disabled={!onNewFeature}
              className={cn(
                "relative gap-1.5 px-4",
                "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]",
                "hover:from-[#8B5CF6] hover:to-[#C084FC]",
                "border-0 shadow-[0_0_20px_rgba(124,58,237,0.3)]",
                "hover:shadow-[0_0_25px_rgba(124,58,237,0.4)]",
                "transition-all duration-200"
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add Feature</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter row (expandable) with glass effect */}
      {showFilters && (
        <div className={cn(
          "flex items-center gap-2 px-6 py-3",
          "border-t border-[#30363D]/30",
          "bg-[#0D1117]/50 backdrop-blur-sm"
        )}>
          <span className="text-xs text-[#8B949E] mr-2">Filter by:</span>

          {/* Priority filters as pills */}
          <div className="flex items-center gap-1.5">
            {['all', 'critical', 'high', 'medium', 'low'].map((filter) => {
              const isActive = activeFilter === filter || (filter === 'all' && !activeFilter)
              return (
                <button
                  key={filter}
                  onClick={() => onFilterChange?.(filter === 'all' ? null : filter)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full capitalize",
                    "transition-all duration-200",
                    isActive
                      ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                      : "bg-[#21262D] text-[#8B949E] hover:bg-[#30363D] hover:text-[#F0F6FC]"
                  )}
                >
                  {filter}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-[#30363D] mx-2" />

          {/* Status filters */}
          <div className="flex items-center gap-1.5">
            {['blocked', 'in-progress', 'completed'].map((filter) => {
              const isActive = activeFilter === filter
              const colorMap: Record<string, string> = {
                blocked: isActive ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : '',
                'in-progress': isActive ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : '',
                completed: isActive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''
              }
              return (
                <button
                  key={filter}
                  onClick={() => onFilterChange?.(activeFilter === filter ? null : filter)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full capitalize",
                    "transition-all duration-200",
                    isActive
                      ? cn("text-white", colorMap[filter])
                      : "bg-[#21262D] text-[#8B949E] hover:bg-[#30363D] hover:text-[#F0F6FC]"
                  )}
                >
                  {filter.replace('-', ' ')}
                </button>
              )
            })}
          </div>

          {/* Clear filters */}
          {activeFilter && (
            <>
              <div className="h-4 w-px bg-[#30363D] mx-2" />
              <button
                onClick={() => onFilterChange?.(null)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full",
                  "text-[#8B949E] hover:text-[#F0F6FC]",
                  "hover:bg-[#21262D]",
                  "transition-all duration-200"
                )}
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
