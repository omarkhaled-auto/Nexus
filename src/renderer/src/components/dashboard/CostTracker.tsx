import type { ReactElement } from 'react'
import { DollarSign, Coins } from 'lucide-react'
import { useCosts } from '../../stores'

/**
 * Budget thresholds for cost coloring
 */
const BUDGET_WARNING_THRESHOLD = 0.75 // 75% of budget = yellow
const BUDGET_DANGER_THRESHOLD = 1.0 // 100% of budget = red
const DEFAULT_BUDGET = 50 // Default budget in USD if none set

/**
 * Props for CostTracker component
 */
export interface CostTrackerProps {
  /** Custom class name for the container */
  className?: string
}

/**
 * Get cost color class based on budget usage
 */
function getCostColorClass(totalCost: number, budget: number): string {
  const ratio = totalCost / budget
  if (ratio >= BUDGET_DANGER_THRESHOLD) {
    return 'text-red-400'
  }
  if (ratio >= BUDGET_WARNING_THRESHOLD) {
    return 'text-yellow-400'
  }
  return 'text-green-400'
}

/**
 * Format number with K/M suffix for large values
 */
function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  return count.toLocaleString()
}

/**
 * CostTracker - Displays token usage and costs
 *
 * Shows:
 * - Total cost with budget-based coloring (green/yellow/red)
 * - Token breakdown (input/output)
 *
 * Compact card design for dashboard header placement.
 */
export function CostTracker({ className = '' }: CostTrackerProps): ReactElement {
  const costs = useCosts()

  // Handle null/empty state
  if (!costs) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 ${className}`}>
        <div className="p-1.5 rounded-md bg-neutral-700/50">
          <DollarSign className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-400">$0.00</span>
          <span className="text-xs text-neutral-500">No usage yet</span>
        </div>
      </div>
    )
  }

  const { totalCost, tokenBreakdown, budgetLimit, currency } = costs
  const budget = budgetLimit ?? DEFAULT_BUDGET
  const costColorClass = getCostColorClass(totalCost, budget)

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 ${className}`}>
      {/* Cost Icon */}
      <div className="p-1.5 rounded-md bg-neutral-700/50">
        <DollarSign className={`w-4 h-4 ${costColorClass}`} />
      </div>

      {/* Cost Display */}
      <div className="flex flex-col">
        <span className={`text-sm font-semibold ${costColorClass}`}>
          {currency === 'USD' ? '$' : currency}
          {totalCost.toFixed(2)}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Coins className="w-3 h-3" />
          <span>
            In: {formatTokenCount(tokenBreakdown.input)} | Out: {formatTokenCount(tokenBreakdown.output)}
          </span>
        </div>
      </div>

      {/* Budget indicator (only if budget is set) */}
      {budgetLimit !== null && (
        <div className="ml-2 text-xs text-neutral-500">
          / ${budgetLimit.toFixed(0)}
        </div>
      )}
    </div>
  )
}
