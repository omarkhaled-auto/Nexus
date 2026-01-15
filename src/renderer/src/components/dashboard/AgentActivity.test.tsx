import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentActivity } from './AgentActivity'
import { useMetricsStore } from '@renderer/stores/metricsStore'
import type { AgentMetrics } from '@renderer/types/metrics'

// Helper to create test agent metrics
function createTestAgent(overrides: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    id: `agent-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Coder-1',
    type: 'coder',
    status: 'working',
    currentTask: 'auth.service.ts',
    progress: 75,
    lastActivity: new Date(),
    ...overrides
  }
}

describe('AgentActivity', () => {
  beforeEach(() => {
    useMetricsStore.getState().reset()
  })

  describe('header', () => {
    it('displays "Agent Activity" title', () => {
      render(<AgentActivity />)
      expect(screen.getByText('Agent Activity')).toBeInTheDocument()
    })

    it('displays bot icon in header', () => {
      const { container } = render(<AgentActivity />)
      // Lucide icons render as SVGs with lucide-bot class
      const botIcon = container.querySelector('svg.lucide-bot')
      expect(botIcon).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no agents', () => {
      render(<AgentActivity />)
      expect(screen.getByText('No agents active')).toBeInTheDocument()
    })

    it('shows helper text in empty state', () => {
      render(<AgentActivity />)
      expect(screen.getByText('Agents will appear here when execution begins')).toBeInTheDocument()
    })
  })

  describe('with agents', () => {
    it('renders agent cards when agents exist', () => {
      const agents = [
        createTestAgent({ id: 'agent-1', name: 'Coder-1' }),
        createTestAgent({ id: 'agent-2', name: 'Coder-2' })
      ]
      useMetricsStore.getState().setAgents(agents)
      render(<AgentActivity />)

      expect(screen.getByText('Coder-1')).toBeInTheDocument()
      expect(screen.getByText('Coder-2')).toBeInTheDocument()
    })

    it('renders correct number of agent cards', () => {
      const agents = [
        createTestAgent({ id: 'agent-1' }),
        createTestAgent({ id: 'agent-2' }),
        createTestAgent({ id: 'agent-3' })
      ]
      useMetricsStore.getState().setAgents(agents)
      const { container } = render(<AgentActivity />)

      // Grid should contain 3 agent cards
      const grid = container.querySelector('.grid')
      expect(grid?.children.length).toBe(3)
    })

    it('does not show empty state when agents exist', () => {
      useMetricsStore.getState().setAgents([createTestAgent()])
      render(<AgentActivity />)
      expect(screen.queryByText('No agents active')).not.toBeInTheDocument()
    })

    it('displays working agent current task', () => {
      useMetricsStore.getState().setAgents([
        createTestAgent({
          status: 'working',
          currentTask: 'database.controller.ts'
        })
      ])
      render(<AgentActivity />)
      expect(screen.getByText('database.controller.ts')).toBeInTheDocument()
    })

    it('displays agent progress', () => {
      useMetricsStore.getState().setAgents([
        createTestAgent({ progress: 85 })
      ])
      render(<AgentActivity />)
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })

  describe('agent status types', () => {
    it('renders idle agent', () => {
      useMetricsStore.getState().setAgents([
        createTestAgent({
          id: 'reviewer-1',
          name: 'Reviewer',
          type: 'reviewer',
          status: 'idle',
          currentTask: null,
          progress: 0
        })
      ])
      render(<AgentActivity />)
      expect(screen.getByText('Reviewer')).toBeInTheDocument()
      expect(screen.getByText('Idle')).toBeInTheDocument()
    })

    it('renders waiting agent', () => {
      useMetricsStore.getState().setAgents([
        createTestAgent({
          name: 'Tester',
          type: 'tester',
          status: 'waiting',
          currentTask: null
        })
      ])
      render(<AgentActivity />)
      expect(screen.getByText('Tester')).toBeInTheDocument()
      expect(screen.getByText('Waiting...')).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('applies custom className to card', () => {
      const { container } = render(<AgentActivity className="custom-test-class" />)
      expect(container.firstChild).toHaveClass('custom-test-class')
    })
  })

  describe('grid layout', () => {
    it('uses responsive grid classes', () => {
      useMetricsStore.getState().setAgents([createTestAgent()])
      const { container } = render(<AgentActivity />)
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-4')
    })
  })
})
