import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanColumn } from './KanbanColumn'
import type { Feature, FeatureStatus } from '@renderer/types/feature'

// Mock dnd-kit hooks
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  })
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => ''
    }
  }
}))

function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date().toISOString()
  return {
    id: `f-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test Feature',
    description: 'A test feature description',
    status: 'backlog',
    complexity: 'moderate',
    progress: 0,
    assignedAgent: null,
    tasks: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('KanbanColumn', () => {
  const defaultColumn = {
    id: 'backlog' as FeatureStatus,
    title: 'Backlog'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders column with title', () => {
    render(<KanbanColumn column={defaultColumn} features={[]} />)
    expect(screen.getByText('Backlog')).toBeInTheDocument()
  })

  it('shows feature count badge', () => {
    const features = [
      createTestFeature({ id: 'f1' }),
      createTestFeature({ id: 'f2' }),
      createTestFeature({ id: 'f3' })
    ]
    render(<KanbanColumn column={defaultColumn} features={features} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows WIP limit when defined', () => {
    const columnWithLimit = {
      id: 'in_progress' as FeatureStatus,
      title: 'In Progress',
      limit: 3
    }
    const features = [createTestFeature({ id: 'f1', status: 'in_progress' })]
    render(<KanbanColumn column={columnWithLimit} features={features} />)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('shows WIP limit warning when at capacity', () => {
    const columnWithLimit = {
      id: 'in_progress' as FeatureStatus,
      title: 'In Progress',
      limit: 3
    }
    const features = [
      createTestFeature({ id: 'f1', status: 'in_progress' }),
      createTestFeature({ id: 'f2', status: 'in_progress' }),
      createTestFeature({ id: 'f3', status: 'in_progress' })
    ]
    render(<KanbanColumn column={columnWithLimit} features={features} />)
    expect(screen.getByText('3/3')).toBeInTheDocument()
    // The badge should have warning styling - we can check the class
    const badge = screen.getByText('3/3')
    expect(badge.className).toContain('destructive')
  })

  it('renders all feature cards passed to it', () => {
    const features = [
      createTestFeature({ id: 'f1', title: 'Feature One' }),
      createTestFeature({ id: 'f2', title: 'Feature Two' })
    ]
    render(<KanbanColumn column={defaultColumn} features={features} />)
    expect(screen.getByText('Feature One')).toBeInTheDocument()
    expect(screen.getByText('Feature Two')).toBeInTheDocument()
  })

  it('renders empty column correctly', () => {
    render(<KanbanColumn column={defaultColumn} features={[]} />)
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
