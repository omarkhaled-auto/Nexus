# Phase 8: Dashboard UI - Research

**Researched:** 2026-01-15
**Domain:** React real-time dashboard with charts, virtual lists, and event subscriptions
**Confidence:** HIGH

<research_summary>
## Summary

Researched the React dashboard ecosystem for building a real-time observability dashboard with metrics visualization, agent status grid, and event log. The standard approach uses Recharts for charts, React Virtuoso for virtualized event lists, and the existing Nexus EventBus/IPC pattern for real-time updates.

Key finding: The Nexus codebase already has well-established patterns for Zustand stores, EventBus subscriptions via IPC, and UIBackendBridge integration. Phase 8 should follow these patterns exactly for consistency. Recharts provides built-in animation support, and React Virtuoso handles auto-scrolling lists efficiently.

**Primary recommendation:** Use Recharts + React Virtuoso + existing Nexus store patterns. Follow established UIBackendBridge pattern for real-time EventBus subscriptions. No new architectural patterns needed.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.x | Charts and metrics visualization | Built on D3, React-native, responsive, 165+ code examples |
| react-virtuoso | 4.6.x | Virtualized event log | Best-in-class for auto-scroll, prepending items, chat-style lists |
| date-fns | 3.x | Date formatting | Already in project, lightweight |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 4.x | State management | metricsStore for dashboard data |
| framer-motion | 11.x | Smooth animations | Progress bar transitions, number animations (if needed) |
| tailwindcss | 4.x | Styling | Dark theme, responsive grid |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Chart.js is more flexible but less React-native, more setup |
| Recharts | Nivo | Nivo is beautiful but heavier bundle, more complex API |
| React Virtuoso | react-window | react-window simpler but lacks auto-scroll features |
| React Virtuoso | tanstack-virtual | Similar capabilities but Virtuoso has better DX for chat/log UIs |

**Installation:**
```bash
npm install recharts react-virtuoso
# date-fns, zustand, framer-motion, tailwindcss already installed
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
├── pages/
│   └── DashboardPage.tsx           # Main dashboard container
├── components/
│   └── dashboard/
│       ├── OverviewCards.tsx       # 4 metric cards
│       ├── ProgressChart.tsx       # Recharts line/area chart
│       ├── AgentActivity.tsx       # Agent status grid
│       ├── TaskTimeline.tsx        # Virtuoso event log
│       └── CostTracker.tsx         # Token/cost display
└── stores/
    └── metricsStore.ts             # Dashboard state
```

### Pattern 1: Zustand Store with IPC Event Emission
**What:** Store actions emit events to orchestration layer via IPC
**When to use:** Always - maintains consistency with Phase 5-7 patterns
**Example:**
```typescript
// Source: Nexus featureStore.ts pattern
import { create } from 'zustand'

interface MetricsState {
  overview: OverviewMetrics | null
  timeline: TimelineEvent[]
  agents: AgentMetrics[]

  // Actions
  setOverview: (overview: OverviewMetrics) => void
  addTimelineEvent: (event: TimelineEvent) => void
  updateAgentMetrics: (agentId: string, metrics: Partial<AgentMetrics>) => void
}

export const useMetricsStore = create<MetricsState>()((set, get) => ({
  overview: null,
  timeline: [],
  agents: [],

  setOverview: (overview) => set({ overview }),

  addTimelineEvent: (event) => {
    set((state) => ({
      timeline: [event, ...state.timeline].slice(0, 100) // Keep last 100
    }))
  },

  updateAgentMetrics: (agentId, metrics) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, ...metrics } : a
      )
    }))
  }
}))

// Selector hooks
export const useOverview = () => useMetricsStore((s) => s.overview)
export const useTimeline = () => useMetricsStore((s) => s.timeline)
export const useAgentMetrics = () => useMetricsStore((s) => s.agents)
```

### Pattern 2: Real-Time EventBus Subscription via IPC
**What:** UIBackendBridge subscribes to EventBus events and updates stores
**When to use:** Dashboard real-time updates
**Example:**
```typescript
// Source: Nexus UIBackendBridge.ts pattern
// In UIBackendBridge.initialize():

// Subscribe to task events for timeline
if (window.nexusAPI.onTaskUpdate) {
  const unsubTask = window.nexusAPI.onTaskUpdate((task) => {
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      type: 'task_completed',
      title: `Task ${task.name} completed`,
      timestamp: new Date(),
      metadata: { taskId: task.id, agentId: task.assignedAgent }
    }
    useMetricsStore.getState().addTimelineEvent(event)
  })
  this.unsubscribers.push(unsubTask)
}

// Subscribe to agent status
if (window.nexusAPI.onAgentStatus) {
  const unsubAgent = window.nexusAPI.onAgentStatus((status) => {
    useMetricsStore.getState().updateAgentMetrics(status.id, status)
  })
  this.unsubscribers.push(unsubAgent)
}
```

### Pattern 3: Recharts with ResponsiveContainer
**What:** Always wrap charts in ResponsiveContainer for fluid sizing
**When to use:** Every chart component
**Example:**
```typescript
// Source: Context7 Recharts docs
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

function ProgressChart({ data }: { data: ProgressData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px'
          }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorTasks)"
          animationDuration={500}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 4: React Virtuoso for Event Log with Auto-Scroll
**What:** Virtuoso with followOutput for auto-scrolling, pause on hover
**When to use:** TaskTimeline event log
**Example:**
```typescript
// Source: Context7 React Virtuoso docs
import { Virtuoso } from 'react-virtuoso'
import { useState, useCallback } from 'react'

function TaskTimeline({ events }: { events: TimelineEvent[] }) {
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <div
      onMouseEnter={() => setAutoScroll(false)}
      onMouseLeave={() => setAutoScroll(true)}
    >
      <Virtuoso
        style={{ height: 400 }}
        data={events}
        followOutput={(isAtBottom) => {
          // Only auto-scroll if enabled AND user was at bottom
          if (autoScroll && isAtBottom) return 'smooth'
          return false
        }}
        itemContent={(index, event) => (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
            <span>{getEventIcon(event.type)}</span>
            <span className="flex-1">{event.title}</span>
            <span className="text-sm text-muted-foreground">
              {event.metadata.agentId}
            </span>
          </div>
        )}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Polling for updates:** Use EventBus subscriptions, not setInterval polling
- **Direct store access in components:** Use selector hooks for performance
- **Charts without ResponsiveContainer:** Will break on window resize
- **Re-creating chart data on every render:** Memoize data transformations
- **Not unsubscribing from EventBus:** Memory leaks in long-running sessions
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart animations | Custom SVG animations | Recharts `animationDuration` prop | Built-in, tested, smooth |
| Virtual scrolling | Custom windowing | React Virtuoso | Auto-scroll, dynamic heights, edge cases |
| Auto-scroll lists | `scrollIntoView` hacks | Virtuoso `followOutput` | Handles edge cases, smooth scrolling |
| Dark theme charts | Manual color overrides | Recharts with CSS variables | Maintainable, theme-consistent |
| Event subscription cleanup | Manual unsubscribe arrays | UIBackendBridge pattern | Already implemented, tested |
| Progress bar animation | Custom CSS transitions | Tailwind `transition-all` or Motion | Browser-optimized |
| Number formatting | Custom toLocaleString | date-fns `format`, `formatDistanceToNow` | Already in project, consistent |
| Event filtering UI | Custom filter state | Zustand store with filter selector | Consistent with existing patterns |

**Key insight:** Nexus already has established patterns for stores, IPC, and event subscriptions. Phase 8 should use these patterns, not introduce new ones. The only new libraries needed are Recharts and React Virtuoso for specialized UI.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Chart Data Re-Creation on Every Render
**What goes wrong:** Chart re-animates on every parent re-render
**Why it happens:** Data array created inline `data={[{ x: 1 }, ...]}` creates new reference
**How to avoid:** Memoize chart data with useMemo, or store in Zustand
**Warning signs:** Charts flicker or re-animate unexpectedly

### Pitfall 2: EventBus Memory Leaks
**What goes wrong:** Multiple subscriptions accumulate, old handlers still fire
**Why it happens:** Missing unsubscribe on component unmount
**How to avoid:** Use UIBackendBridge pattern with cleanup in useEffect return
**Warning signs:** Console logs from unmounted components, increasing memory usage

### Pitfall 3: Virtuoso List Not Scrolling Correctly
**What goes wrong:** List doesn't auto-scroll, or scroll position jumps
**Why it happens:** Not using `followOutput` correctly, or data key issues
**How to avoid:** Use `followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}`, provide stable `itemKey`
**Warning signs:** New items appear but list doesn't scroll, or scroll jumps to wrong position

### Pitfall 4: Dark Theme Color Contrast
**What goes wrong:** Chart elements invisible on dark background
**Why it happens:** Default Recharts colors assume light theme
**How to avoid:** Explicitly set `stroke`, `fill` colors using CSS variables or oklch palette
**Warning signs:** Grid lines, axis labels, or chart elements hard to see

### Pitfall 5: IPC Event Flooding
**What goes wrong:** Dashboard becomes slow, too many updates
**Why it happens:** Every EventBus event triggers store update and re-render
**How to avoid:** Batch updates, throttle high-frequency events (QA iterations), use React.memo
**Warning signs:** FPS drops, laggy UI during active agent work

### Pitfall 6: Missing window.nexusAPI Guards
**What goes wrong:** Crashes in tests or non-Electron contexts
**Why it happens:** `window.nexusAPI` not defined outside Electron renderer
**How to avoid:** Guard with `if (typeof window !== 'undefined' && window.nexusAPI)`
**Warning signs:** Test failures, SSR errors, undefined property access
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources and existing Nexus codebase:

### Recharts AreaChart with Dark Theme
```typescript
// Source: Context7 Recharts + Nexus styling patterns
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const CHART_COLORS = {
  tasks: '#8884d8',
  features: '#82ca9d',
  grid: '#374151',
  axis: '#9CA3AF',
  tooltip: '#1F2937'
}

function ProgressChart({ data }: { data: ProgressData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.tasks} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={CHART_COLORS.tasks} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis dataKey="time" stroke={CHART_COLORS.axis} fontSize={12} />
        <YAxis stroke={CHART_COLORS.axis} fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.tooltip,
            border: `1px solid ${CHART_COLORS.grid}`,
            borderRadius: '8px',
            color: '#F9FAFB'
          }}
        />
        <Area
          type="monotone"
          dataKey="tasksCompleted"
          stroke={CHART_COLORS.tasks}
          fill="url(#colorTasks)"
          animationDuration={500}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

### React Virtuoso Event Log with Filter Chips
```typescript
// Source: Context7 React Virtuoso + Nexus UI patterns
import { Virtuoso } from 'react-virtuoso'
import { useState, useMemo } from 'react'

type FilterType = 'all' | 'tasks' | 'qa' | 'builds' | 'errors'

function TaskTimeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [autoScroll, setAutoScroll] = useState(true)

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    return events.filter((e) => {
      switch (filter) {
        case 'tasks': return e.type.startsWith('task_')
        case 'qa': return e.type.startsWith('qa_')
        case 'builds': return e.type.startsWith('build_')
        case 'errors': return e.type.includes('failed') || e.type.includes('error')
        default: return true
      }
    })
  }, [events, filter])

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'qa', label: 'QA' },
    { value: 'builds', label: 'Builds' },
    { value: 'errors', label: 'Errors' }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex gap-2 p-3 border-b border-border">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-sm transition-colors',
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div
        className="flex-1"
        onMouseEnter={() => setAutoScroll(false)}
        onMouseLeave={() => setAutoScroll(true)}
      >
        <Virtuoso
          style={{ height: '100%' }}
          data={filteredEvents}
          followOutput={(isAtBottom) => autoScroll && isAtBottom ? 'smooth' : false}
          itemContent={(_, event) => (
            <EventRow event={event} />
          )}
        />
      </div>
    </div>
  )
}
```

### Metric Card Component
```typescript
// Source: Nexus UI patterns + Tailwind
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <span className={cn(
            'text-sm',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-sm text-muted-foreground">{subtitle}</span>
      )}
    </div>
  )
}
```

### metricsStore with Selectors
```typescript
// Source: Nexus featureStore pattern
import { create } from 'zustand'

interface MetricsState {
  overview: OverviewMetrics | null
  timeline: TimelineEvent[]
  agents: AgentMetrics[]
  costs: CostMetrics | null
  isLoading: boolean
  lastUpdated: Date | null

  // Actions
  setOverview: (overview: OverviewMetrics) => void
  addTimelineEvent: (event: TimelineEvent) => void
  updateAgentMetrics: (agentId: string, update: Partial<AgentMetrics>) => void
  setCosts: (costs: CostMetrics) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  overview: null,
  timeline: [],
  agents: [],
  costs: null,
  isLoading: true,
  lastUpdated: null
}

export const useMetricsStore = create<MetricsState>()((set, get) => ({
  ...initialState,

  setOverview: (overview) => set({
    overview,
    lastUpdated: new Date()
  }),

  addTimelineEvent: (event) => set((state) => ({
    timeline: [event, ...state.timeline].slice(0, 100),
    lastUpdated: new Date()
  })),

  updateAgentMetrics: (agentId, update) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, ...update, lastActivity: new Date() } : a
    ),
    lastUpdated: new Date()
  })),

  setCosts: (costs) => set({ costs, lastUpdated: new Date() }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState)
}))

// Selector hooks
export const useOverview = () => useMetricsStore((s) => s.overview)
export const useTimeline = () => useMetricsStore((s) => s.timeline)
export const useAgentMetrics = () => useMetricsStore((s) => s.agents)
export const useCosts = () => useMetricsStore((s) => s.costs)
export const useIsLoading = () => useMetricsStore((s) => s.isLoading)

// Computed selectors
export const useActiveAgentCount = () => useMetricsStore((s) =>
  s.agents.filter((a) => a.status === 'working').length
)
export const useTaskProgress = () => useMetricsStore((s) => {
  if (!s.overview) return { completed: 0, total: 0, percent: 0 }
  const { completedTasks, totalTasks } = s.overview
  return {
    completed: completedTasks,
    total: totalTasks,
    percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }
})
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-virtualized | React Virtuoso | 2023+ | Better DX, auto-scroll, chat UI features |
| Chart.js | Recharts | React-native, no canvas setup needed |
| Custom polling | EventBus subscriptions | 2025 | Already in Nexus, real-time without polling |
| Context for global state | Zustand | 2022+ | Already in Nexus, selector hooks for perf |
| CSS animations | Framer Motion | If complex animations needed | Already available |

**New tools/patterns to consider:**
- **Recharts v3:** Latest version with improved animations and accessibility
- **React Virtuoso v4:** Best for chat/log UIs with auto-scroll
- **CSS oklch colors:** Already using in Nexus for consistent dark theme

**Deprecated/outdated:**
- **react-virtualized:** Maintenance mode, use Virtuoso instead
- **victory:** Heavy bundle, Recharts is lighter
- **Polling for real-time:** Use WebSockets/EventBus instead
</sota_updates>

<open_questions>
## Open Questions

None - all patterns are well-established in Nexus codebase and verified in documentation.

The only decision is whether to use the free Virtuoso or consider alternatives:
- **Virtuoso (recommended):** Best DX for auto-scroll, chat-style lists
- **tanstack-virtual:** Lower-level but fully free, requires more setup
- **react-window:** Simpler but lacks auto-scroll features

Recommendation: Use Virtuoso - the features (followOutput, prepend) are worth it for the event log UX.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/recharts/recharts` via Context7 - animation, responsive, styling, tooltips
- `/petyosi/react-virtuoso` via Context7 - auto-scroll, prepend, chat UI patterns
- `/websites/motion-dev-docs` via Context7 - animation patterns for progress bars
- Nexus codebase analysis - stores, EventBus, IPC, UIBackendBridge patterns

### Secondary (MEDIUM confidence)
- [EventBus Pattern in React](https://medium.com/@ilham.abdillah.alhamdi/eventbus-pattern-in-react-a-lightweight-alternative-to-context-and-redux-cc6e8a1dc9ca) - verified against Nexus implementation
- [Modern Layout Design Techniques 2025](https://dev.to/er-raj-aryan/modern-layout-design-techniques-in-reactjs-2025-guide-3868) - CSS Grid patterns

### Tertiary (Verified with codebase)
- All patterns verified against existing Nexus implementations in:
  - `src/renderer/src/stores/featureStore.ts`
  - `src/renderer/src/bridges/UIBackendBridge.ts`
  - `src/orchestration/events/EventBus.ts`
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: React dashboard with real-time updates
- Ecosystem: Recharts, React Virtuoso, existing Nexus patterns
- Patterns: Store selectors, IPC subscriptions, chart responsiveness
- Pitfalls: Memory leaks, chart re-renders, virtual scroll issues

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, established libraries
- Architecture: HIGH - follows existing Nexus patterns exactly
- Pitfalls: HIGH - documented in official docs, validated against codebase
- Code examples: HIGH - from Context7 + Nexus codebase patterns

**Research date:** 2026-01-15
**Valid until:** 2026-02-15 (30 days - stable ecosystem)
</metadata>

---

*Phase: 08-dashboard-ui*
*Research completed: 2026-01-15*
*Ready for planning: yes*
