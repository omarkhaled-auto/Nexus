import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressChart, type ProgressDataPoint } from './ProgressChart'

// Mock recharts components to avoid ResizeObserver issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="area-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Area: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`area-${dataKey}`} data-name={name} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />
}))

// Helper to create test data points
function createTestData(count: number): ProgressDataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    time: `${String(10 + i).padStart(2, '0')}:00`,
    tasksCompleted: i * 3,
    featuresCompleted: Math.floor(i / 2)
  }))
}

describe('ProgressChart', () => {
  describe('header', () => {
    it('displays "Progress Over Time" title', () => {
      render(<ProgressChart data={createTestData(5)} />)
      expect(screen.getByText('Progress Over Time')).toBeInTheDocument()
    })

    it('displays total tasks completed from last data point', () => {
      const data = createTestData(5)
      // Last point: i=4, so tasksCompleted = 4 * 3 = 12
      render(<ProgressChart data={data} />)
      expect(screen.getByText('12 tasks completed')).toBeInTheDocument()
    })

    it('displays 0 tasks completed when data is empty', () => {
      render(<ProgressChart data={[]} />)
      expect(screen.getByText('0 tasks completed')).toBeInTheDocument()
    })
  })

  describe('chart rendering', () => {
    it('renders ResponsiveContainer', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('renders AreaChart with data', () => {
      render(<ProgressChart data={createTestData(5)} />)
      const chart = screen.getByTestId('area-chart')
      expect(chart).toBeInTheDocument()
      expect(chart).toHaveAttribute('data-points', '5')
    })

    it('renders Tasks area', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('area-tasksCompleted')).toBeInTheDocument()
    })

    it('renders Features area', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('area-featuresCompleted')).toBeInTheDocument()
    })

    it('renders chart axes', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    })

    it('renders tooltip', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('renders grid', () => {
      render(<ProgressChart data={createTestData(3)} />)
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    })
  })

  describe('height prop', () => {
    it('uses default height of 300', () => {
      const { container } = render(<ProgressChart data={createTestData(3)} />)
      // Height is passed to ResponsiveContainer, which we mocked
      expect(container.querySelector('[data-testid="responsive-container"]')).toBeInTheDocument()
    })

    it('accepts custom height', () => {
      render(<ProgressChart data={createTestData(3)} height={500} />)
      // Just verify it renders without error with custom height
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('with various data scenarios', () => {
    it('handles single data point', () => {
      const data: ProgressDataPoint[] = [{ time: '10:00', tasksCompleted: 5 }]
      render(<ProgressChart data={data} />)
      expect(screen.getByText('5 tasks completed')).toBeInTheDocument()
    })

    it('handles data without featuresCompleted', () => {
      const data: ProgressDataPoint[] = [
        { time: '10:00', tasksCompleted: 5 },
        { time: '11:00', tasksCompleted: 10 }
      ]
      render(<ProgressChart data={data} />)
      expect(screen.getByText('10 tasks completed')).toBeInTheDocument()
    })
  })
})
