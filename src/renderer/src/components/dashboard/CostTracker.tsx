import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useCosts } from '@renderer/stores/metricsStore'
import { DollarSign, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface CostTrackerProps {
  className?: string
}

/**
 * CostTracker - Displays token usage and estimated costs.
 * Enhanced with Nexus design system styling.
 */
export function CostTracker({ className }: CostTrackerProps): ReactElement {
  const costs = useCosts()

  if (!costs) {
    return (
      <Card className={cn('h-full', className)} data-testid="cost-tracker">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <div className="p-1.5 rounded-md bg-accent-warning/10">
              <DollarSign className="h-4 w-4 text-accent-warning" />
            </div>
            Cost Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-secondary text-sm">No cost data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)} data-testid="cost-tracker">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <div className="p-1.5 rounded-md bg-accent-warning/10">
            <Coins className="h-4 w-4 text-accent-warning" />
          </div>
          Cost Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Cost - Prominent Display */}
        <div className="flex items-baseline justify-between p-3 rounded-lg bg-bg-hover">
          <span className="text-text-secondary text-sm">Estimated Cost</span>
          <span className="text-2xl font-bold text-text-primary">${costs.estimatedCostUSD.toFixed(2)}</span>
        </div>

        {/* Token Breakdown */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-accent-primary" />
              <span className="text-text-secondary">Input Tokens</span>
            </div>
            <span className="text-text-primary font-medium">{costs.inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-3.5 w-3.5 text-accent-secondary" />
              <span className="text-text-secondary">Output Tokens</span>
            </div>
            <span className="text-text-primary font-medium">{costs.outputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-border-default pt-3">
            <span className="text-text-secondary">Total Tokens</span>
            <span className="font-semibold text-text-primary">{costs.totalTokensUsed.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
