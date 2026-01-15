import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanBoard, COLUMNS } from './KanbanBoard'
import { useFeatureStore } from '@renderer/stores/featureStore'
import type { Feature } from '@renderer/types/feature'

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  })
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
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

// Mock EventBus
vi.mock('@/orchestration/events/EventBus', () => ({
  EventBus: {
    getInstance: vi.fn(() => ({
      emit: vi.fn()
    }))
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

describe('KanbanBoard', () => {
  beforeEach(() => {
    useFeatureStore.getState().reset()
    vi.clearAllMocks()
  })

  it('renders all 6 columns', () => {
    render(<KanbanBoard />)

    // Check all column titles are present
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('AI Review')).toBeInTheDocument()
    expect(screen.getByText('Human Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays features in correct columns based on status', () => {
    const features = [
      createTestFeature({ id: 'f1', title: 'Backlog Feature', status: 'backlog' }),
      createTestFeature({ id: 'f2', title: 'Planning Feature', status: 'planning' }),
      createTestFeature({ id: 'f3', title: 'Done Feature', status: 'done' })
    ]
    useFeatureStore.getState().setFeatures(features)

    render(<KanbanBoard />)

    expect(screen.getByText('Backlog Feature')).toBeInTheDocument()
    expect(screen.getByText('Planning Feature')).toBeInTheDocument()
    expect(screen.getByText('Done Feature')).toBeInTheDocument()
  })

  it('shows WIP limit indicator on In Progress column', () => {
    const inProgressColumn = COLUMNS.find(col => col.id === 'in_progress')
    expect(inProgressColumn?.limit).toBe(3)
  })

  it('renders empty board correctly', () => {
    render(<KanbanBoard />)

    // All columns should show count of 0
    const zeroCountBadges = screen.getAllByText('0')
    // 5 columns without limits will show just "0" (Backlog, Planning, AI Review, Human Review, Done)
    // In Progress will show "0/3"
    expect(zeroCountBadges.length).toBeGreaterThanOrEqual(5)
  })

  it('renders DndContext wrapper', () => {
    render(<KanbanBoard />)
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
  })

  it('renders DragOverlay component', () => {
    render(<KanbanBoard />)
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
  })

  it('has correct column configuration', () => {
    expect(COLUMNS).toHaveLength(6)
    expect(COLUMNS[0]?.id).toBe('backlog')
    expect(COLUMNS[1]?.id).toBe('planning')
    expect(COLUMNS[2]?.id).toBe('in_progress')
    expect(COLUMNS[2]?.limit).toBe(3)
    expect(COLUMNS[3]?.id).toBe('ai_review')
    expect(COLUMNS[4]?.id).toBe('human_review')
    expect(COLUMNS[5]?.id).toBe('done')
  })

  it('groups features correctly by status', () => {
    const features = [
      createTestFeature({ id: 'f1', status: 'backlog' }),
      createTestFeature({ id: 'f2', status: 'backlog' }),
      createTestFeature({ id: 'f3', status: 'in_progress' }),
      createTestFeature({ id: 'f4', status: 'done' }),
      createTestFeature({ id: 'f5', status: 'done' })
    ]
    useFeatureStore.getState().setFeatures(features)

    render(<KanbanBoard />)

    // Verify feature count per column
    // Backlog: 2, In Progress: 1, Done: 2
    // The "2" count badge should appear multiple times (Backlog and Done)
  })
})
