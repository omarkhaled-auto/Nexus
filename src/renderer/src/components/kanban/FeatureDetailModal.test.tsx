import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeatureDetailModal } from './FeatureDetailModal'
import { useTaskStore } from '@renderer/stores/taskStore'
import type { Feature } from '@renderer/types/feature'

// Mock Radix Dialog - render content directly when open
vi.mock('@renderer/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  )
}))

vi.mock('@renderer/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  )
}))

function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date().toISOString()
  return {
    id: 'f-test',
    title: 'Test Feature',
    description: 'A test feature description for testing',
    status: 'in_progress',
    complexity: 'moderate',
    progress: 50,
    assignedAgent: 'coder-agent',
    tasks: [],
    priority: 'high',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('FeatureDetailModal', () => {
  beforeEach(() => {
    useTaskStore.getState().reset()
    vi.clearAllMocks()
  })

  it('renders when open=true', () => {
    const feature = createTestFeature()
    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    const feature = createTestFeature()
    render(
      <FeatureDetailModal feature={feature} open={false} onOpenChange={vi.fn()} />
    )
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('shows feature title and description', () => {
    const feature = createTestFeature({
      title: 'Authentication Feature',
      description: 'Implement user authentication with JWT'
    })
    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByText('Authentication Feature')).toBeInTheDocument()
    expect(screen.getByText('Implement user authentication with JWT')).toBeInTheDocument()
  })

  it('shows task list section', () => {
    const feature = createTestFeature()
    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )
    // Should show Tasks section header with count
    expect(screen.getByText(/Tasks \(\d+\)/)).toBeInTheDocument()
  })

  it('returns null when feature is null', () => {
    const { container } = render(
      <FeatureDetailModal feature={null} open={true} onOpenChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('uses real tasks from store when available', () => {
    // Add tasks to the task store
    const tasks = [
      { id: 'task-1', name: 'Real Task 1', status: 'completed' as const },
      { id: 'task-2', name: 'Real Task 2', status: 'in_progress' as const }
    ]
    useTaskStore.getState().setTasks(tasks)

    const feature = createTestFeature({
      tasks: ['task-1', 'task-2']
    })

    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )

    expect(screen.getByText('Real Task 1')).toBeInTheDocument()
    expect(screen.getByText('Real Task 2')).toBeInTheDocument()
  })

  it('falls back to demo tasks when no real tasks exist', () => {
    // Clear task store
    useTaskStore.getState().reset()

    const feature = createTestFeature({
      tasks: [] // No task IDs
    })

    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )

    // Should show demo task names
    expect(screen.getByText('Define requirements')).toBeInTheDocument()
  })

  it('shows activity timeline section', () => {
    const feature = createTestFeature({ status: 'in_progress' })
    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
  })

  it('displays complexity badge', () => {
    const feature = createTestFeature({ complexity: 'complex' })
    render(
      <FeatureDetailModal feature={feature} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByText('XL')).toBeInTheDocument()
  })
})
