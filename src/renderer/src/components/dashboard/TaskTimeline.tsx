import { useState, useMemo, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Activity, Pause, Play, Filter, AlertCircle } from 'lucide-react'
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
 * Filter configuration with icons and colors
 */
const FILTERS: { value: FilterType; label: string; color?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tasks', label: 'Tasks', color: 'text-accent-primary' },
  { value: 'qa', label: 'QA', color: 'text-accent-secondary' },
  { value: 'builds', label: 'Builds', color: 'text-accent-success' },
  { value: 'errors', label: 'Errors', color: 'text-accent-error' }
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
    <Card className={cn('flex flex-col', className)} data-testid="activity-timeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <div className="p-1.5 rounded-md bg-accent-primary/10">
              <Activity className="h-4 w-4 text-accent-primary" />
            </div>
            Recent Activity
            {filteredEvents.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                {filteredEvents.length} events
              </span>
            )}
          </CardTitle>
          {/* Auto-scroll indicator */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
              autoScroll
                ? 'text-accent-success bg-accent-success/10'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            {autoScroll ? (
              <Play className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
            <span>{autoScroll ? 'Live' : 'Paused'}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); }}
              data-testid={`filter-${f.value}`}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                filter === f.value
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-bg-hover hover:bg-bg-muted text-text-secondary hover:text-text-primary'
              )}
            >
              {f.label}
              {f.value === 'errors' && filteredEvents.some(e => e.type.includes('failed')) && filter !== 'errors' && (
                <span className="ml-1.5 w-1.5 h-1.5 bg-accent-error rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* Event list with Virtuoso */}
        <div
          className="flex-1 border border-border-default rounded-lg overflow-hidden bg-bg-dark/50"
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
              itemContent={(_, event: TimelineEvent) => {
                return <EventRow event={event} />
              }}
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
  const messages: Record<FilterType, { title: string; subtitle: string }> = {
    all: {
      title: 'No activity yet',
      subtitle: 'Events will appear here as agents work'
    },
    tasks: {
      title: 'No task events',
      subtitle: 'Task updates will appear here'
    },
    qa: {
      title: 'No QA events',
      subtitle: 'QA iterations will appear here'
    },
    builds: {
      title: 'No build events',
      subtitle: 'Build results will appear here'
    },
    errors: {
      title: 'No errors - looking good!',
      subtitle: 'Everything is running smoothly'
    }
  }

  const content = messages[filter]

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      {filter === 'errors' ? (
        <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center mb-3">
          <Activity className="h-6 w-6 text-accent-success" />
        </div>
      ) : (
        <Activity className="h-8 w-8 text-text-tertiary mb-3" />
      )}
      <p className="text-sm font-medium text-text-secondary">{content.title}</p>
      <p className="text-xs text-text-tertiary mt-1">{content.subtitle}</p>
    </div>
  )
}
