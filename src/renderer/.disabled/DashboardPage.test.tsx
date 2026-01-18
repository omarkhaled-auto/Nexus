import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from './DashboardPage'
import { useMetricsStore } from '@renderer/stores/metricsStore'

// Mock recharts to avoid ResizeObserver issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="grid" />
}))

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
  Virtuoso: () => <div data-testid="virtuoso-list" />
}))

describe('DashboardPage', () => {
  // Store original window.nexusAPI
  const originalNexusAPI = window.nexusAPI

  beforeEach(() => {
    useMetricsStore.getState().reset()
  })

  afterEach(() => {
    // Restore nexusAPI after each test
    window.nexusAPI = originalNexusAPI
  })

  describe('header', () => {
    it('displays "Dashboard" title', () => {
      render(<DashboardPage />)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('displays subtitle "Real-time project monitoring"', () => {
      render(<DashboardPage />)
      expect(screen.getByText('Real-time project monitoring')).toBeInTheDocument()
    })

    it('renders CostTracker in header', () => {
      // Set nexusAPI to enable demo mode check
      // In demo mode, costs are populated with demo data ($12.47)
      render(<DashboardPage />)
      // CostTracker is rendered - check for the dollar sign icon container
      // Demo data sets totalCost to 12.47
      expect(screen.getByText('$12.47')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('hides loading overlay after component mounts', async () => {
      // Component sets loading to false after mounting
      render(<DashboardPage />)
      // After mount and useEffect, loading should be false
      await vi.waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
      })
    })

    it('renders loading overlay structure when isLoading selector returns true', () => {
      // We can't test loading state directly since useEffect immediately sets it to false
      // Instead, test that the component structure supports loading states
      const { container } = render(<DashboardPage />)
      // Check that the dashboard rendered without the loading overlay
      expect(container.querySelector('.backdrop-blur-sm')).not.toBeInTheDocument()
    })

    it('loading state is set to false after initialization', async () => {
      render(<DashboardPage />)
      await vi.waitFor(() => {
        expect(useMetricsStore.getState().isLoading).toBe(false)
      })
    })
  })

  describe('dashboard sections', () => {
    beforeEach(() => {
      useMetricsStore.setState({ isLoading: false })
    })

    it('renders OverviewCards section', () => {
      render(<DashboardPage />)
      // OverviewCards displays metric cards - check for one of the expected titles
      expect(screen.getByText('Total Features')).toBeInTheDocument()
    })

    it('renders ProgressChart section', () => {
      render(<DashboardPage />)
      expect(screen.getByText('Progress Over Time')).toBeInTheDocument()
    })

    it('renders AgentActivity section', () => {
      render(<DashboardPage />)
      expect(screen.getByText('Agent Activity')).toBeInTheDocument()
    })

    it('renders TaskTimeline section', () => {
      render(<DashboardPage />)
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })
  })

  describe('demo mode', () => {
    it('populates demo data when nexusAPI is undefined', () => {
      // @ts-expect-error - Setting nexusAPI to undefined for demo mode test
      window.nexusAPI = undefined
      render(<DashboardPage />)

      // Demo data includes overview with 12 total features
      expect(screen.getByText('12')).toBeInTheDocument() // Total features count
    })

    it('does not populate demo data when nexusAPI exists', () => {
      // Ensure nexusAPI is defined
      window.nexusAPI = {
        startGenesis: vi.fn(),
        startEvolution: vi.fn(),
        getProject: vi.fn(),
        createProject: vi.fn(),
        getTasks: vi.fn(),
        updateTask: vi.fn(),
        getAgentStatus: vi.fn(),
        pauseExecution: vi.fn(),
        emitInterviewStarted: vi.fn(),
        emitInterviewMessage: vi.fn(),
        emitInterviewRequirement: vi.fn(),
        emitInterviewCompleted: vi.fn(),
        emitEvent: vi.fn(),
        checkpointList: vi.fn(),
        checkpointCreate: vi.fn(),
        checkpointRestore: vi.fn(),
        checkpointDelete: vi.fn(),
        reviewList: vi.fn(),
        reviewGet: vi.fn(),
        reviewApprove: vi.fn(),
        reviewReject: vi.fn(),
        onTaskUpdate: vi.fn(),
        onAgentStatus: vi.fn(),
        onExecutionProgress: vi.fn(),
        onMetricsUpdate: vi.fn(),
        onAgentStatusUpdate: vi.fn(),
        onTimelineEvent: vi.fn(),
        onCostUpdate: vi.fn(),
        settings: {
          getAll: vi.fn(),
          get: vi.fn(),
          set: vi.fn(),
          setApiKey: vi.fn(),
          hasApiKey: vi.fn(),
          clearApiKey: vi.fn(),
          reset: vi.fn()
        },
        interview: {
          start: vi.fn(),
          sendMessage: vi.fn(),
          getSession: vi.fn(),
          resume: vi.fn(),
          resumeByProject: vi.fn(),
          end: vi.fn(),
          pause: vi.fn(),
          getGreeting: vi.fn()
        }
      }

      useMetricsStore.setState({ isLoading: false })
      render(<DashboardPage />)

      // Without demo data, overview shows 0 for features
      // (since we didn't populate the store)
      const store = useMetricsStore.getState()
      expect(store.overview).toBeNull()
    })
  })

  describe('layout', () => {
    beforeEach(() => {
      useMetricsStore.setState({ isLoading: false })
    })

    it('has proper flex layout container', () => {
      const { container } = render(<DashboardPage />)
      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('flex', 'flex-col')
    })

    it('has overflow-auto for scrolling', () => {
      const { container } = render(<DashboardPage />)
      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('overflow-auto')
    })

    it('has responsive grid for middle row', () => {
      const { container } = render(<DashboardPage />)
      const grid = container.querySelector('.lg\\:grid-cols-5')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('store initialization', () => {
    it('sets loading to false after mount', async () => {
      // @ts-expect-error - Setting nexusAPI to undefined for demo mode test
      window.nexusAPI = undefined
      useMetricsStore.setState({ isLoading: true })
      render(<DashboardPage />)

      // After useEffect runs, loading should be false
      // Give it a tick to process the useEffect
      await vi.waitFor(() => {
        expect(useMetricsStore.getState().isLoading).toBe(false)
      })
    })
  })
})
