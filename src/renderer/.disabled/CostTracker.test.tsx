import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostTracker } from './CostTracker'
import { useMetricsStore } from '@renderer/stores/metricsStore'
import type { CostMetrics } from '@renderer/types/metrics'

// Helper to create test cost metrics
function createTestCosts(overrides: Partial<CostMetrics> = {}): CostMetrics {
  return {
    totalCost: 12.5,
    tokenBreakdown: {
      input: 50000,
      output: 25000
    },
    budgetLimit: 100,
    currency: 'USD',
    ...overrides
  }
}

describe('CostTracker', () => {
  beforeEach(() => {
    useMetricsStore.getState().reset()
  })

  describe('null/empty state', () => {
    it('displays $0.00 when costs are null', () => {
      render(<CostTracker />)
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })

    it('displays "No usage yet" message when costs are null', () => {
      render(<CostTracker />)
      expect(screen.getByText('No usage yet')).toBeInTheDocument()
    })
  })

  describe('cost display', () => {
    it('displays total cost with dollar sign', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ totalCost: 25.75 }))
      render(<CostTracker />)
      expect(screen.getByText('$25.75')).toBeInTheDocument()
    })

    it('displays cost in green when under 75% of budget', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ totalCost: 50, budgetLimit: 100 }))
      render(<CostTracker />)
      const costElement = screen.getByText('$50.00')
      expect(costElement).toHaveClass('text-green-400')
    })

    it('displays cost in yellow when between 75-100% of budget', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ totalCost: 80, budgetLimit: 100 }))
      render(<CostTracker />)
      const costElement = screen.getByText('$80.00')
      expect(costElement).toHaveClass('text-yellow-400')
    })

    it('displays cost in red when at or over budget', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ totalCost: 100, budgetLimit: 100 }))
      render(<CostTracker />)
      const costElement = screen.getByText('$100.00')
      expect(costElement).toHaveClass('text-red-400')
    })
  })

  describe('token breakdown', () => {
    it('displays input tokens with K suffix for thousands', () => {
      useMetricsStore.getState().setCosts(
        createTestCosts({
          tokenBreakdown: { input: 50000, output: 25000 }
        })
      )
      render(<CostTracker />)
      expect(screen.getByText(/In: 50\.0K/)).toBeInTheDocument()
    })

    it('displays output tokens with K suffix', () => {
      useMetricsStore.getState().setCosts(
        createTestCosts({
          tokenBreakdown: { input: 50000, output: 25000 }
        })
      )
      render(<CostTracker />)
      expect(screen.getByText(/Out: 25\.0K/)).toBeInTheDocument()
    })

    it('displays tokens with M suffix for millions', () => {
      useMetricsStore.getState().setCosts(
        createTestCosts({
          tokenBreakdown: { input: 1500000, output: 2000000 }
        })
      )
      render(<CostTracker />)
      expect(screen.getByText(/In: 1\.5M/)).toBeInTheDocument()
      expect(screen.getByText(/Out: 2\.0M/)).toBeInTheDocument()
    })
  })

  describe('budget limit', () => {
    it('displays budget limit when set', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ budgetLimit: 100 }))
      render(<CostTracker />)
      expect(screen.getByText('/ $100')).toBeInTheDocument()
    })

    it('does not display budget limit when null', () => {
      useMetricsStore.getState().setCosts(createTestCosts({ budgetLimit: null as unknown as number }))
      render(<CostTracker />)
      expect(screen.queryByText(/\/ \$/)).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      useMetricsStore.getState().setCosts(createTestCosts())
      const { container } = render(<CostTracker className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
