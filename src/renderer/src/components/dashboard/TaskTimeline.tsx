import { useState, useMemo, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Activity, Pause, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { useTimeline } from '@renderer/stores/metricsStore'
import { EventRow } from './EventRow'
import { cn } from '@renderer/lib/utils'
import type { TimelineEvent } from '@renderer/types/metrics'

/**
 * Filter types for the timeline
 */
type FilterType = 'all' | 'tasks' | 'qa' | 'builds' | 'errors'

/**
 * Filter configuration
 */
const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'qa', label: 'QA' },
  { value: 'builds', label: 'Builds' },
  { value: 'errors', label: 'Errors' }
]

export interface TaskTimelineProps {
  className?: string
  /** Fixed height for the timeline list */
  height?: number
}

/**
 * TaskTimeline - Virtualized event log with filter chips and auto-scroll.
 * Shows real-time activity stream with pause-on-hover functionality.
 *
 * Features:
 * - React Virtuoso for efficient rendering of large event lists
 * - 5 filter chips (All, Tasks, QA, Builds, Errors)
 * - Auto-scroll follows new events when at bottom
 * - Auto-scroll pauses on mouse enter, resumes on leave
 *
 * Visual design:
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Recent Activity                              [Auto-scroll] │
 * │  ┌─────────────────────────────────────────────────────────┐│
 * │  │ [All] [Tasks] [QA] [Builds] [Errors]                   ││
 * │  └─────────────────────────────────────────────────────────┘│
 * │                                                             │
 * │  14:25  ✓  Task api.routes.ts completed         Coder-2    │
 * │  14:23  ✓  Task auth.service.ts completed       Coder-1    │
 * │  14:21  🔄 QA iteration 4/50                    Tester     │
 * │  ...                                                        │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */
export function TaskTimeline({ className, height = 400 }: TaskTimelineProps) {
  const timeline = useTimeline()
  const [filter, setFilter] = useState<FilterType>('all')
  const [autoScroll, setAutoScroll] = useState(true)

  /**
   * Filter events based on selected filter type
   */
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return timeline

    return timeline.filter((event) => {
      switch (filter) {
        case 'tasks':
          return event.type.startsWith('task_')
        case 'qa':
          return event.type.startsWith('qa_')
        case 'builds':
          return event.type.startsWith('build_')
        case 'errors':
          return event.type.includes('failed') || event.type === 'error'
        default:
          return true
      }
    })
  }, [timeline, filter])

  /**
   * Handle follow output for auto-scroll behavior
   */
  const handleFollowOutput = useCallback(
    (isAtBottom: boolean) => {
      if (autoScroll && isAtBottom) return 'smooth'
      return false
    },
    [autoScroll]
  )

  /**
   * Pause auto-scroll on mouse enter
   */
  const handleMouseEnter = useCallback(() => {
    setAutoScroll(false)
  }, [])

  /**
   * Resume auto-scroll on mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setAutoScroll(true)
  }, [])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          {/* Auto-scroll indicator */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs',
              autoScroll ? 'text-emerald-500' : 'text-muted-foreground'
            )}
          >
            {autoScroll ? (
              <Play className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
            <span>Auto-scroll {autoScroll ? 'on' : 'paused'}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event list with Virtuoso */}
        <div
          className="flex-1 border border-border rounded-md overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {filteredEvents.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <Virtuoso
              style={{ height }}
              data={filteredEvents}
              followOutput={handleFollowOutput}
              itemContent={(_, event: TimelineEvent) => (
                <EventRow event={event} />
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state when no events match the current filter
 */
function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, string> = {
    all: 'No activity yet',
    tasks: 'No task events',
    qa: 'No QA events',
    builds: 'No build events',
    errors: 'No errors - looking good!'
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{messages[filter]}</p>
      {filter === 'all' && (
        <p className="text-xs text-muted-foreground/70 mt-1">
          Events will appear here as agents work
        </p>
      )}
    </div>
  )
}
