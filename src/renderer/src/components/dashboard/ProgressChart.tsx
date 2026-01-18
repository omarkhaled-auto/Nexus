import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

/**
 * Data point for the progress chart
 */
export interface ProgressDataPoint {
  timestamp: Date
  completed: number
  total: number
}

export interface ProgressChartProps {
  data: ProgressDataPoint[]
  className?: string
  height?: number
}

/**
 * ProgressChart - Line chart showing task completion over time.
 */
export function ProgressChart({ data, className, height = 200 }: ProgressChartProps): ReactElement {
  const chartData = data.map((point) => ({
    time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    completed: point.completed,
    total: point.total,
    percentage: point.total > 0 ? Math.round((point.completed / point.total) * 100) : 0
  }))

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          Progress Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
            No progress data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
