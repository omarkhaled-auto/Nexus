import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

/**
 * Data point for progress chart
 */
export interface ProgressDataPoint {
  /** Formatted time label (e.g., "14:25") */
  time: string
  /** Number of tasks completed at this point */
  tasksCompleted: number
  /** Optional: number of features completed */
  featuresCompleted?: number
}

export interface ProgressChartProps {
  /** Chart data points */
  data: ProgressDataPoint[]
  /** Chart height in pixels (default: 300) */
  height?: number
}

// Chart color configuration for dark theme
const CHART_COLORS = {
  tasks: '#8884d8',
  features: '#82ca9d',
  grid: '#374151',
  axis: '#9CA3AF',
  tooltipBg: '#1F2937',
  tooltipBorder: '#374151',
  tooltipText: '#F9FAFB'
}

/**
 * ProgressChart - Area chart showing task/feature completion over time.
 * Uses Recharts with dark theme colors and smooth animations.
 */
export function ProgressChart({ data, height = 300 }: ProgressChartProps) {
  // Calculate total completed for subtitle
  const lastDataPoint = data.at(-1)
  const totalCompleted = lastDataPoint?.tasksCompleted ?? 0

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium">Progress Over Time</h3>
        <p className="text-sm text-muted-foreground">{totalCompleted} tasks completed</p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.tasks} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.tasks} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorFeatures" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.features} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.features} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="time" stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
          <YAxis stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: '8px',
              color: CHART_COLORS.tooltipText
            }}
            labelStyle={{ color: CHART_COLORS.tooltipText }}
            itemStyle={{ color: CHART_COLORS.tooltipText }}
          />
          <Area
            type="monotone"
            dataKey="tasksCompleted"
            name="Tasks"
            stroke={CHART_COLORS.tasks}
            fillOpacity={1}
            fill="url(#colorTasks)"
            animationDuration={500}
            animationEasing="ease-in-out"
          />
          <Area
            type="monotone"
            dataKey="featuresCompleted"
            name="Features"
            stroke={CHART_COLORS.features}
            fillOpacity={1}
            fill="url(#colorFeatures)"
            animationDuration={500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
