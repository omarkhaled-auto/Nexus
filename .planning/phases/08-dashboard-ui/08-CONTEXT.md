# Phase 8: Dashboard UI - Context

**Gathered:** 2026-01-15
**Status:** Ready for planning

<vision>
## How This Should Work

**Mission Control** — a command center that shows everything happening at a glance. Agents working in parallel, real-time status updates, progress flowing through the system.

The key insight: Nexus runs for HOURS autonomously. The dashboard needs to hit the sweet spot:
- **Too busy** = User anxious, feels need to micromanage
- **Too calm** = User uncertain if anything is happening
- **Sweet spot** = "I can see it's working, I trust it's handled"

This translates to two complementary feelings:

**Busy but organized (Agent Grid):**
- All 4 active agents visible simultaneously
- Clear lanes — each agent has its own card
- Current task + progress bar per agent
- Status dots: green working, yellow waiting, red blocked
- You CAN see every detail if you want

**Calm and confident (Overall Dashboard):**
- Smooth animations, not frantic updates
- Progress bars fill steadily, not jittery
- Summary cards show "34/47" — trust the number
- Alerts only for things that NEED attention
- You DON'T need to watch every detail

The vibe: User can glance and know "4 agents active, 72% done, on track, ~$12 spent. All good." Then close the tab and come back later.

</vision>

<essential>
## What Must Be Nailed

- **Agent Grid** — The heart of the dashboard. 4 agents visible, status indicators, current task, progress bars. This is the "busy but organized" core that users will look at most.

- **Glance-and-go summary** — Tasks completed, time remaining, overall progress. One look tells you if everything is on track.

- **Event Log with control** — Live stream of events with filter chips. Auto-scroll when running, pause on hover. "Mostly green checkmarks = good, red X = investigate."

</essential>

<boundaries>
## What's Out of Scope

- **Historical analytics** — No past session data, trends over time, velocity graphs. Focus on the CURRENT run only.
- **Settings/Configuration** — No changing agent count, adjusting thresholds. That's Phase 12 Polish.
- **Collapsible sections in event log** — Too complex, adds cognitive load. Simple flat list with filters.

</boundaries>

<specifics>
## Specific Ideas

**Dark theme focus:**
- Optimize for dark mode — status colors pop, easy on eyes during long autonomous runs
- Cursor-style aesthetic (consistent with Phase 5-7)

**Event Log behavior:**
```
┌─────────────────────────────────────────────────────────────┐
│  Recent Activity                              [Auto-scroll] │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks] [QA] [Builds] [Errors]                   ││ ← Filter chips
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  14:25  ✓  Task api.routes.ts completed         Coder-2    │
│  14:23  ✓  Task auth.service.ts completed       Coder-1    │
│  14:21  🔄 QA iteration 4/50                    Tester     │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

- Auto-scroll: Newest at top, list scrolls down automatically
- Pause on hover: Stop auto-scroll when mouse enters, resume on leave
- Filter chips: Click to toggle categories (All, Tasks, QA, Builds, Errors)
- Sticky filters: Remember filter state during session
- Max ~50 items: Virtual scroll if needed
- Event format: `[Time] [Icon] [Event description] [Agent/Source]`

**Agent Grid layout:**
```
│  🟢 Coder-1    │  🟢 Coder-2    │  🟡 Tester    │  ⚪ Review │
│  auth.ts       │  api.ts        │  Waiting...   │  Idle     │
│  ████████░ 80% │  ███░░░░░ 35%  │               │           │
```

**Summary bar:**
```
│  TASKS: 34/47 ✓ (72%)          EST: 1h 15m remaining       │
```

**"Wow moment":** Watch metrics update live as agents work. Real-time without page refresh.

</specifics>

<notes>
## Additional Context

**BUILD-016 Specification (from Master Book):**

Core components to build:
- DashboardPage (300-350 LOC) — Main container, project selector, grid layout
- OverviewCards (4 cards) — TotalFeatures, CompletedTasks, ActiveAgents, EstimatedCompletion
- ProgressChart (150-200 LOC) — Recharts line/area chart, task completion over time
- AgentActivity (150-200 LOC) — Grid of agent cards with live status
- TaskTimeline (100-150 LOC) — Scrollable activity stream with filters
- CostTracker (100-150 LOC) — Total cost, token breakdown, budget alerts

Store: metricsStore for dashboard data (state, actions, selectors)

EventBus subscriptions for real-time updates:
- task:started, task:completed, task:failed
- agent:status_changed, agent:task_assigned
- qa:iteration, qa:passed, qa:failed
- checkpoint:created, feature:completed

IPC pattern: Same as Phase 6/7 — preload exposes subscribe/unsubscribe, main emits via IPC

Dependencies: Recharts for charts, date-fns for formatting, existing stores

Tests expected: ~45 total across all components

</notes>

---

*Phase: 08-dashboard-ui*
*Context gathered: 2026-01-15*
