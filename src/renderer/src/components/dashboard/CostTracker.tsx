import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { useCosts } from '@renderer/stores/metricsStore'
import { DollarSign } from 'lucide-react'

export interface CostTrackerProps {
  className?: string
}

/**
 * CostTracker - Displays token usage and estimated costs.
 */
export function CostTracker({ className }: CostTrackerProps): ReactElement {
  const costs = useCosts()

  if (!costs) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            Cost Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No cost data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4" />
          Cost Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Estimated Cost</span>
          <span className="text-2xl font-bold">${costs.estimatedCostUSD.toFixed(4)}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Input Tokens</span>
            <span>{costs.inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Output Tokens</span>
            <span>{costs.outputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Total Tokens</span>
            <span className="font-medium">{costs.totalTokensUsed.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
