import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, BarChart3 } from 'lucide-react'

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
 * Enhanced with Nexus design system styling and gradient fill.
 */
export function ProgressChart({ data, className, height = 200 }: ProgressChartProps): ReactElement {
  const chartData = data.map((point) => ({
    time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    completed: point.completed,
    total: point.total,
    percentage: point.total > 0 ? Math.round((point.completed / point.total) * 100) : 0
  }))

  // Get current progress percentage
  const currentProgress = chartData.length > 0 ? chartData[chartData.length - 1].percentage : 0

  return (
    <Card className={cn('h-full', className)} data-testid="progress-chart">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-text-primary">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-accent-success/10">
              <BarChart3 className="h-4 w-4 text-accent-success" />
            </div>
            Progress Over Time
          </div>
          {currentProgress > 0 && (
            <span className="text-lg font-bold text-accent-success">
              {currentProgress}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center flex-col gap-2">
            <TrendingUp className="h-8 w-8 text-text-tertiary" />
            <span className="text-text-secondary text-sm">No progress data yet</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#8B949E' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#8B949E' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: '#F0F6FC', fontWeight: 500, marginBottom: '4px' }}
                itemStyle={{ color: '#8B949E' }}
                formatter={(value) => value !== undefined ? [`${value}%`, 'Progress'] : ['', 'Progress']}
              />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke="#7C3AED"
                strokeWidth={2}
                fill="url(#progressGradient)"
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#7C3AED',
                  stroke: '#0D1117',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
