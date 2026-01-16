import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskTimeline } from './TaskTimeline'
import { useMetricsStore } from '@renderer/stores/metricsStore'
import type { TimelineEvent } from '@renderer/types/metrics'

// Mock react-virtuoso to simplify testing
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent
  }: {
    data: TimelineEvent[]
    itemContent: (index: number, event: TimelineEvent) => React.ReactNode
  }) => (
    <div data-testid="virtuoso-list">
      {data.map((event, index) => (
        <div key={event.id} data-testid={`event-${event.id}`}>
          {itemContent(index, event)}
        </div>
      ))}
    </div>
  )
}))

// Helper to create test timeline event
function createTestEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 9)}`,
    type: 'task_completed',
    title: 'Task completed',
    timestamp: new Date(),
    metadata: {},
    ...overrides
  }
}

describe('TaskTimeline', () => {
  beforeEach(() => {
    useMetricsStore.getState().reset()
  })

  describe('header', () => {
    it('displays "Recent Activity" title', () => {
      render(<TaskTimeline />)
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })

    it('shows auto-scroll indicator', () => {
      render(<TaskTimeline />)
      expect(screen.getByText(/Auto-scroll/)).toBeInTheDocument()
    })

    it('shows auto-scroll as "on" by default', () => {
      render(<TaskTimeline />)
      expect(screen.getByText('Auto-scroll on')).toBeInTheDocument()
    })
  })

  describe('filter chips', () => {
    it('renders all filter buttons', () => {
      render(<TaskTimeline />)
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'QA' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Builds' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Errors' })).toBeInTheDocument()
    })

    it('All filter is selected by default', () => {
      render(<TaskTimeline />)
      const allButton = screen.getByRole('button', { name: 'All' })
      expect(allButton).toHaveClass('bg-primary')
    })

    it('switches active filter when clicked', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)

      const tasksButton = screen.getByRole('button', { name: 'Tasks' })
      await user.click(tasksButton)

      expect(tasksButton).toHaveClass('bg-primary')
      expect(screen.getByRole('button', { name: 'All' })).toHaveClass('bg-muted')
    })
  })

  describe('empty state', () => {
    it('shows empty state when no events', () => {
      render(<TaskTimeline />)
      expect(screen.getByText('No activity yet')).toBeInTheDocument()
    })

    it('shows filter-specific empty message for Tasks filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'Tasks' }))
      expect(screen.getByText('No task events')).toBeInTheDocument()
    })

    it('shows positive message for Errors filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'Errors' }))
      expect(screen.getByText('No errors - looking good!')).toBeInTheDocument()
    })
  })

  describe('event rendering', () => {
    it('renders events when they exist', () => {
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'test-event-1', title: 'Test task completed' })
      )
      render(<TaskTimeline />)
      expect(screen.getByText('Test task completed')).toBeInTheDocument()
    })

    it('renders multiple events', () => {
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'evt-1', title: 'First event' })
      )
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'evt-2', title: 'Second event' })
      )
      render(<TaskTimeline />)
      expect(screen.getByText('First event')).toBeInTheDocument()
      expect(screen.getByText('Second event')).toBeInTheDocument()
    })

    it('does not show empty state when events exist', () => {
      useMetricsStore.getState().addTimelineEvent(createTestEvent())
      render(<TaskTimeline />)
      expect(screen.queryByText('No activity yet')).not.toBeInTheDocument()
    })
  })

  describe('event filtering', () => {
    beforeEach(() => {
      // Add various event types
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'task-1', type: 'task_completed', title: 'Task done' })
      )
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'qa-1', type: 'qa_iteration', title: 'QA iteration' })
      )
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'build-1', type: 'build_completed', title: 'Build done' })
      )
      useMetricsStore.getState().addTimelineEvent(
        createTestEvent({ id: 'error-1', type: 'task_failed', title: 'Task failed' })
      )
    })

    it('shows all events with All filter', () => {
      render(<TaskTimeline />)
      expect(screen.getByText('Task done')).toBeInTheDocument()
      expect(screen.getByText('QA iteration')).toBeInTheDocument()
      expect(screen.getByText('Build done')).toBeInTheDocument()
      expect(screen.getByText('Task failed')).toBeInTheDocument()
    })

    it('filters to only task events with Tasks filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'Tasks' }))

      expect(screen.getByText('Task done')).toBeInTheDocument()
      expect(screen.getByText('Task failed')).toBeInTheDocument()
      expect(screen.queryByText('QA iteration')).not.toBeInTheDocument()
      expect(screen.queryByText('Build done')).not.toBeInTheDocument()
    })

    it('filters to only QA events with QA filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'QA' }))

      expect(screen.getByText('QA iteration')).toBeInTheDocument()
      expect(screen.queryByText('Task done')).not.toBeInTheDocument()
    })

    it('filters to only build events with Builds filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'Builds' }))

      expect(screen.getByText('Build done')).toBeInTheDocument()
      expect(screen.queryByText('Task done')).not.toBeInTheDocument()
    })

    it('filters to only error events with Errors filter', async () => {
      const user = userEvent.setup()
      render(<TaskTimeline />)
      await user.click(screen.getByRole('button', { name: 'Errors' }))

      expect(screen.getByText('Task failed')).toBeInTheDocument()
      expect(screen.queryByText('Task done')).not.toBeInTheDocument()
    })
  })

  describe('auto-scroll behavior', () => {
    it('pauses auto-scroll on mouse enter', () => {
      useMetricsStore.getState().addTimelineEvent(createTestEvent())
      render(<TaskTimeline />)

      const listContainer = screen.getByTestId('virtuoso-list').parentElement!
      fireEvent.mouseEnter(listContainer)

      expect(screen.getByText('Auto-scroll paused')).toBeInTheDocument()
    })

    it('resumes auto-scroll on mouse leave', () => {
      useMetricsStore.getState().addTimelineEvent(createTestEvent())
      render(<TaskTimeline />)

      const listContainer = screen.getByTestId('virtuoso-list').parentElement!
      fireEvent.mouseEnter(listContainer)
      fireEvent.mouseLeave(listContainer)

      expect(screen.getByText('Auto-scroll on')).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<TaskTimeline className="custom-timeline" />)
      expect(container.firstChild).toHaveClass('custom-timeline')
    })
  })

  describe('height prop', () => {
    it('uses default height of 400', () => {
      useMetricsStore.getState().addTimelineEvent(createTestEvent())
      render(<TaskTimeline />)
      // Virtuoso list should be rendered
      expect(screen.getByTestId('virtuoso-list')).toBeInTheDocument()
    })

    it('accepts custom height', () => {
      useMetricsStore.getState().addTimelineEvent(createTestEvent())
      render(<TaskTimeline height={600} />)
      expect(screen.getByTestId('virtuoso-list')).toBeInTheDocument()
    })
  })
})
