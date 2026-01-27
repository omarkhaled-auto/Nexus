import type { ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
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
 * Enhanced with glassmorphism design and gradient fills.
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
    <Card
      className={cn(
        'h-full relative overflow-hidden',
        'bg-[#161B22]/60 backdrop-blur-sm',
        'border border-[#30363D]',
        className
      )}
      data-testid="progress-chart"
    >
      {/* Gradient top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-[#F0F6FC]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#3FB950]/20 to-[#3FB950]/5">
              <BarChart3 className="h-4 w-4 text-[#3FB950]" />
            </div>
            <span>Progress Over Time</span>
          </div>
          {currentProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#3FB950]" />
              <span className="text-lg font-bold text-[#3FB950] tabular-nums">
                {currentProgress}%
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className={cn(
            "flex h-[200px] items-center justify-center flex-col gap-3",
            "rounded-lg bg-[#21262D]/30 border border-[#30363D]"
          )}>
            <div className="p-3 rounded-xl bg-[#21262D]">
              <TrendingUp className="h-6 w-6 text-[#484F58]" />
            </div>
            <span className="text-[#8B949E] text-sm">No progress data yet</span>
            <span className="text-[#6E7681] text-xs">Data will appear as tasks complete</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#6E7681' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6E7681' }}
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
                  borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                  padding: '12px 16px'
                }}
                labelStyle={{ color: '#F0F6FC', fontWeight: 600, marginBottom: '8px' }}
                itemStyle={{ color: '#8B949E' }}
                formatter={(value: number | string | undefined) => value !== undefined ? [`${String(value)}%`, 'Progress'] : ['', 'Progress']}
                cursor={{ stroke: '#30363D', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                fill="url(#progressGradient)"
                filter="url(#glow)"
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: '#A855F7',
                  stroke: '#0D1117',
                  strokeWidth: 3,
                  style: { filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))' }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
