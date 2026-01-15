import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeatureCard } from './FeatureCard'
import type { Feature } from '@renderer/types/feature'

// Mock dnd-kit hooks
vi.mock('@dnd-kit/sortable', () => ({
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
    id: 'f-test',
    title: 'Test Feature',
    description: 'A test feature description for testing',
    status: 'backlog',
    complexity: 'moderate',
    progress: 50,
    assignedAgent: null,
    tasks: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('FeatureCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays feature title', () => {
    const feature = createTestFeature({ title: 'Authentication Module' })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('Authentication Module')).toBeInTheDocument()
  })

  it('displays feature description (truncated)', () => {
    const feature = createTestFeature({ description: 'This is a long description that should be displayed' })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText(/This is a long description/)).toBeInTheDocument()
  })

  it('shows complexity badge S for simple', () => {
    const feature = createTestFeature({ complexity: 'simple' })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('shows complexity badge M for moderate', () => {
    const feature = createTestFeature({ complexity: 'moderate' })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('shows complexity badge XL for complex', () => {
    const feature = createTestFeature({ complexity: 'complex' })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('XL')).toBeInTheDocument()
  })

  it('shows progress bar with correct percentage', () => {
    const feature = createTestFeature({ progress: 75 })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows agent status when agent assigned', () => {
    const feature = createTestFeature({
      assignedAgent: 'coder-agent',
      status: 'in_progress',
      progress: 25
    })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('Coder')).toBeInTheDocument()
  })

  it('shows QA iteration count when > 0', () => {
    const feature = createTestFeature({ qaIterations: 5 })
    render(<FeatureCard feature={feature} />)
    expect(screen.getByText('QA: 5/50')).toBeInTheDocument()
  })

  it('does not show QA iterations when 0', () => {
    const feature = createTestFeature({ qaIterations: 0 })
    render(<FeatureCard feature={feature} />)
    expect(screen.queryByText(/QA:/)).not.toBeInTheDocument()
  })

  it('does not show QA iterations when undefined', () => {
    const feature = createTestFeature()
    // Ensure qaIterations is undefined
    delete (feature as any).qaIterations
    render(<FeatureCard feature={feature} />)
    expect(screen.queryByText(/QA:/)).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const feature = createTestFeature()
    render(<FeatureCard feature={feature} onClick={handleClick} />)

    const user = userEvent.setup()
    await user.click(screen.getByText('Test Feature'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
