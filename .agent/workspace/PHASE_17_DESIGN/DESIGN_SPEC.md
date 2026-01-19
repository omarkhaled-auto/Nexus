# Nexus UI Design Specification

## Document Information

| Property | Value |
|----------|-------|
| Version | 1.0.0 |
| Created | Phase 17 |
| Status | APPROVED FOR IMPLEMENTATION |
| Authors | Nexus Design System Team |

---

## Executive Summary

This design specification defines the complete UI overhaul for Nexus - an autonomous AI application builder. The design exposes **110 backend features** through a professional, clean interface that provides the best user experience in the AI development tool space.

### Key Design Goals

1. **Expose Power** - Every backend capability accessible through the UI
2. **Professional Quality** - Enterprise-ready visual design
3. **Real-Time Feedback** - Live updates for all agent activities
4. **Progressive Disclosure** - Complexity revealed when needed
5. **Accessibility** - WCAG 2.1 AA compliant

### Current Coverage Gap

- **Current UI:** Only 31% of backend features exposed
- **Target:** 100% feature exposure through redesigned UI

---

## 1. Design System

### 1.1 Color Palette

```css
/* === BACKGROUND COLORS === */
--bg-dark: #0D1117;           /* Main background */
--bg-card: #161B22;           /* Card/elevated surfaces */
--bg-hover: #21262D;          /* Interactive hover states */
--bg-muted: #1C2128;          /* Muted backgrounds */

/* === ACCENT COLORS === */
--accent-primary: #7C3AED;    /* Nexus Purple - AI/Intelligence */
--accent-secondary: #06B6D4;  /* Cyan - Technology/Speed */
--accent-success: #10B981;    /* Green - Success/Complete */
--accent-warning: #F59E0B;    /* Amber - Attention */
--accent-error: #EF4444;      /* Red - Error/Failed */
--accent-info: #3B82F6;       /* Blue - Information */

/* === TEXT COLORS === */
--text-primary: #F0F6FC;      /* High contrast text */
--text-secondary: #8B949E;    /* Muted/descriptions */
--text-tertiary: #6E7681;     /* Disabled/hints */
--text-inverse: #0D1117;      /* On light backgrounds */

/* === BORDER COLORS === */
--border-default: #30363D;    /* Subtle separation */
--border-focus: #7C3AED;      /* Focus states */
--border-error: #EF4444;      /* Error states */
--border-success: #10B981;    /* Success states */

/* === AGENT TYPE COLORS === */
--agent-planner: #A78BFA;     /* Purple-400 */
--agent-coder: #60A5FA;       /* Blue-400 */
--agent-tester: #34D399;      /* Green-400 */
--agent-reviewer: #FBBF24;    /* Yellow-400 */
--agent-merger: #F472B6;      /* Pink-400 */

/* === STATUS COLORS === */
--status-idle: #6E7681;
--status-working: #3B82F6;
--status-success: #10B981;
--status-error: #EF4444;
--status-warning: #F59E0B;
--status-pending: #8B949E;
```

### 1.2 Typography

```css
/* === FONT FAMILIES === */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

/* === FONT SIZES === */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.75rem;     /* 28px */
--text-4xl: 2rem;        /* 32px */

/* === HEADING STYLES === */
h1: 28px / 700 weight / -0.02em tracking
h2: 22px / 600 weight / -0.01em tracking
h3: 18px / 600 weight / normal tracking
h4: 16px / 500 weight / normal tracking

/* === BODY STYLES === */
Large:  16px / 400 weight / 1.6 line-height
Normal: 14px / 400 weight / 1.5 line-height
Small:  12px / 400 weight / 1.4 line-height
Code:   13px / 400 weight / 1.5 line-height (mono)
```

### 1.3 Spacing Scale

```css
/* Base unit: 4px */
--space-0: 0;
--space-px: 1px;
--space-0.5: 0.125rem;   /* 2px */
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-5: 1.25rem;      /* 20px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-10: 2.5rem;      /* 40px */
--space-12: 3rem;        /* 48px */
--space-16: 4rem;        /* 64px */
```

### 1.4 Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px - Buttons, inputs */
--radius-md: 0.5rem;     /* 8px - Cards, panels */
--radius-lg: 0.75rem;    /* 12px - Modal dialogs */
--radius-xl: 1rem;       /* 16px - Large cards */
--radius-full: 9999px;   /* Pills, avatars */
```

### 1.5 Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.6);
--shadow-glow: 0 0 20px rgba(124, 58, 237, 0.3);
--shadow-glow-success: 0 0 20px rgba(16, 185, 129, 0.3);
--shadow-glow-error: 0 0 20px rgba(239, 68, 68, 0.3);
```

### 1.6 Animation Tokens

```css
/* Durations */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

/* Easing */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## 2. Component Library

### 2.1 Base Components

| Component | Variants | Sizes | data-testid |
|-----------|----------|-------|-------------|
| **Button** | primary, secondary, ghost, danger, success | xs, sm, md, lg | `button-{variant}` |
| **IconButton** | default, ghost, danger | sm, md, lg | `icon-button` |
| **Badge** | default, success, warning, error, info, purple | sm, md | `badge-{variant}` |
| **Avatar** | - | xs, sm, md, lg, xl | `avatar` |
| **Tooltip** | - | - | `tooltip` |

### 2.2 Form Components

| Component | Variants | Props | data-testid |
|-----------|----------|-------|-------------|
| **Input** | default, error | label, hint, error, icon | `input-{name}` |
| **Textarea** | default, error | label, hint, resize | `textarea-{name}` |
| **Select** | default, error | options, searchable | `select-{name}` |
| **Toggle** | - | label, checked, disabled | `toggle-{name}` |
| **Checkbox** | - | label, checked, indeterminate | `checkbox-{name}` |
| **Radio** | - | options, value | `radio-{name}` |
| **Slider** | - | min, max, step, label | `slider-{name}` |
| **FormField** | - | label, error, required | `form-field-{name}` |

### 2.3 Feedback Components

| Component | Variants | Props | data-testid |
|-----------|----------|-------|-------------|
| **Modal** | default, confirm, alert | title, size, closable | `modal-{id}` |
| **Toast** | success, error, warning, info | duration, action | `toast` |
| **Alert** | success, error, warning, info | dismissible | `alert-{variant}` |
| **Progress** | bar, circular | value, indeterminate | `progress` |
| **Spinner** | - | size | `spinner` |
| **Skeleton** | text, circle, card | - | `skeleton` |
| **EmptyState** | - | title, description, action | `empty-state` |

### 2.4 Layout Components

| Component | Props | data-testid |
|-----------|-------|-------------|
| **Card** | header, footer, padding | `card-{id}` |
| **Tabs** | items, activeTab, onChange | `tabs`, `tab-{id}` |
| **Accordion** | items, multiple, defaultOpen | `accordion` |
| **Divider** | orientation, label | `divider` |
| **ScrollArea** | maxHeight | `scroll-area` |
| **Resizable** | direction, minSize | `resizable` |

### 2.5 Navigation Components

| Component | Props | data-testid |
|-----------|-------|-------------|
| **Sidebar** | items, collapsed | `sidebar` |
| **Header** | logo, nav, actions | `header` |
| **Breadcrumbs** | items | `breadcrumbs` |
| **CommandPalette** | commands, shortcuts | `command-palette` |

### 2.6 Data Display Components

| Component | Props | data-testid |
|-----------|-------|-------------|
| **Table** | columns, data, sortable | `table`, `table-row-{id}` |
| **List** | items, virtualized | `list`, `list-item-{id}` |
| **CodeBlock** | code, language, copyable | `code-block` |
| **Terminal** | lines, streaming | `terminal` |
| **Stat** | label, value, change, icon | `stat-{id}` |
| **Timeline** | items | `timeline`, `timeline-item-{id}` |

### 2.7 Agent-Specific Components

| Component | Props | data-testid |
|-----------|-------|-------------|
| **AgentBadge** | type, status, task | `agent-badge-{type}` |
| **AgentCard** | agent, onClick, selected | `agent-card-{id}` |
| **AgentActivity** | agentId, output | `agent-activity` |
| **AgentPoolStatus** | agents | `agent-pool-status` |
| **QAStatusPanel** | build, lint, test, review | `qa-status-panel` |
| **IterationCounter** | current, max | `iteration-counter` |

---

## 3. Page Specifications

### 3.1 Navigation Structure

```
App Shell
├── Header (fixed, h: 56px)
│   ├── Logo + "Nexus"
│   ├── Navigation: Dashboard | Projects (dropdown) | Settings
│   └── Actions: Command Palette (Cmd+K) | Help | Settings | Profile
│
└── Main Content Area (bg: bgDark, padding: 24px)

Project Context (when in project)
├── Sub-navigation: Overview | Interview | Tasks | Agents | Execution | Memory
└── Project-specific content
```

### 3.2 Dashboard Page

**Purpose:** High-level overview of all projects and activity

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                      [+ New Project]   │
├─────────────────────────────────────────────────────────────────┤
│ STATS ROW (4 cards)                                              │
│ [Active Projects] [Tasks Today] [Agents Working] [Success Rate]  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ RECENT PROJECTS             │ │ LIVE AGENT FEED             │ │
│ │ • Project cards with status │ │ • Real-time agent activity  │ │
│ │ • Progress bars             │ │ • Streaming updates         │ │
│ │ • Quick actions             │ │ • Click to view agent       │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ACTIVITY TIMELINE (full width)                                   │
│ • Chronological event list                                       │
│ • Grouped by day                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `projects:getAll` - Project list
- `projects:getRecent` - Recent projects (limit 5)
- `tasks:getStats` - Task statistics
- `agents:getPoolStatus` - Agent pool status
- EventBus: `project:*`, `task:*`, `agent:*` events

**Test IDs:**
- `dashboard-page`
- `stats-cards`, `stat-card-projects`, `stat-card-tasks`, `stat-card-agents`, `stat-card-success`
- `recent-projects`, `project-card-{id}`
- `agent-feed`, `agent-feed-item`
- `activity-timeline`, `timeline-item-{id}`
- `new-project-button`

### 3.3 Interview Page (Genesis Mode)

**Purpose:** Guided conversation for requirements gathering

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Interview: {project}          [Save Draft] [Complete]  │
├─────────────────────────────────────────────────────────────────┤
│ SPLIT PANE (Resizable 60/40)                                     │
│ ┌─────────────────────────┬─────────────────────────────────────┐│
│ │ CHAT PANEL              │ REQUIREMENTS PANEL                  ││
│ │                         │                                     ││
│ │ • AI/User messages      │ • Requirements (count)   [Export]   ││
│ │ • Markdown rendering    │ • Requirement cards by category     ││
│ │ • Loading indicators    │ • Priority badges                   ││
│ │                         │ • Click to view details             ││
│ │ [Message input] [Send]  │                                     ││
│ └─────────────────────────┴─────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ PROGRESS BAR: ████████████████░░░░░░░░ 65%  ~5 questions left    │
└─────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- InterviewEngine for conversation
- RequirementExtractor for requirements
- EventBus: `interview:*` events

**Test IDs:**
- `interview-page`
- `chat-panel`, `chat-message-{id}`, `chat-input`, `chat-send-button`
- `requirements-panel`, `requirement-card-{id}`, `export-button`
- `interview-progress`
- `save-draft-button`, `complete-button`, `back-button`

### 3.4 Tasks Page (Kanban Board)

**Purpose:** Visual task management with agent assignments

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Tasks: {project}                [Filter ▼] [+ Add Task]│
├─────────────────────────────────────────────────────────────────┤
│ KANBAN BOARD (4 columns, horizontal scroll on mobile)           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ PLANNED (5) │ │IN PROGRESS  │ │ IN REVIEW   │ │ COMPLETE    │ │
│ │             │ │    (3)      │ │    (2)      │ │   (12)      │ │
│ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │
│ │ │ Task    │ │ │ │ Task    │ │ │ │ Task    │ │ │ │ Task    │ │ │
│ │ │ ──────  │ │ │ │ ──────  │ │ │ │ ──────  │ │ │ │ ──────  │ │ │
│ │ │ 25 min  │ │ │ │[Coder]  │ │ │ │[Review] │ │ │ │ ✓ Done  │ │ │
│ │ └─────────┘ │ │ │ ████░░  │ │ │ │ Pending │ │ │ └─────────┘ │ │
│ │             │ │ └─────────┘ │ │ └─────────┘ │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- TaskQueue for task list
- DependencyResolver for ordering
- AgentPool for assignments
- EventBus: `task:*`, `agent:assigned` events

**Test IDs:**
- `tasks-page`
- `kanban-board`
- `kanban-column-planned`, `kanban-column-in-progress`, `kanban-column-review`, `kanban-column-complete`
- `task-card-{id}`
- `filter-dropdown`, `add-task-button`
- `task-detail-modal`

### 3.5 Agents Page (Real-Time Activity)

**Purpose:** Watch AI agents work in real-time

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Agent Activity: {project}                 [Pause All]  │
├─────────────────────────────────────────────────────────────────┤
│ AGENT POOL STATUS (5 agent types)                                │
│ [Planner ●] [Coder ●] [Tester ●] [Reviewer ●] [Merger ●]        │
├─────────────────────────────────────────────────────────────────┤
│ SPLIT LAYOUT                                                     │
│ ┌─────────────────────────┬─────────────────────────────────────┐│
│ │ ACTIVE AGENTS           │ SELECTED AGENT DETAILS              ││
│ │                         │                                     ││
│ │ • Agent cards           │ • Agent info (type, model)          ││
│ │ • Status indicators     │ • Current task details              ││
│ │ • Progress bars         │ • Iteration counter                 ││
│ │ • Click to select       │ • Live output (streaming)           ││
│ │                         │ • QA Status panel                   ││
│ └─────────────────────────┴─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- AgentPool for agent status
- RalphStyleIterator for iteration count
- EventBus: `agent:*`, `qa:*` events
- Streaming output via IPC

**Test IDs:**
- `agents-page`
- `agent-pool-status`, `agent-status-{type}`
- `active-agents-list`, `agent-card-{id}`
- `agent-details-panel`
- `agent-output`, `qa-status-panel`, `iteration-counter`
- `pause-all-button`

### 3.6 Execution Page

**Purpose:** Detailed view of build, lint, test, and review outputs

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Execution: {project}                    [Clear Logs]   │
├─────────────────────────────────────────────────────────────────┤
│ TAB NAVIGATION                                                   │
│ [Build] [Lint] [Test] [Review]               Current Task: Auth  │
├─────────────────────────────────────────────────────────────────┤
│ BUILD OUTPUT                                        ✓ Success    │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ $ tsc --noEmit                                                ││
│ │                                                               ││
│ │ Compiling 47 files...                                         ││
│ │ ✓ src/auth/middleware.ts                                      ││
│ │ ✓ src/auth/jwt.ts                                             ││
│ │                                                               ││
│ │ Compilation complete. 0 errors.                               ││
│ │ Duration: 2.3s                                                ││
│ └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- BuildRunner output
- LintRunner output
- TestRunner output
- ReviewRunner output
- EventBus: `qa:*` events

**Test IDs:**
- `execution-page`
- `execution-tabs`, `tab-build`, `tab-lint`, `tab-test`, `tab-review`
- `execution-output`, `output-line-{index}`
- `execution-status`
- `clear-logs-button`

### 3.7 Settings Page

**Purpose:** Complete configuration of all Nexus options

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                                         │
├─────────────────────────────────────────────────────────────────┤
│ [LLM Providers] [Agents] [Checkpoints] [UI] [Projects]          │
├─────────────────────────────────────────────────────────────────┤
│ LLM PROVIDERS TAB                                                │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Claude Configuration                                          ││
│ │                                                               ││
│ │ Backend        [● CLI] [○ API]           ✓ CLI detected       ││
│ │ Model          [claude-sonnet-4-5-20250929        ▼]          ││
│ │ API Key        [••••••••••••••••••••••••]                     ││
│ │ ▼ Advanced (timeout, retries)                                 ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Gemini Configuration                                          ││
│ │ [Same structure as Claude]                                    ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Embeddings Configuration                                      ││
│ │ Backend        [● Local] [○ API]                              ││
│ │ Model          [Xenova/all-MiniLM-L6-v2           ▼]          ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│                                      [Reset Defaults] [Save]     │
└─────────────────────────────────────────────────────────────────┘
```

**Settings Tabs:**
1. **LLM Providers** - Claude, Gemini, Embeddings configuration
2. **Agents** - Per-agent model assignments, pool limits
3. **Checkpoints** - Auto-save interval, max checkpoints
4. **UI** - Theme, notifications, sidebar preferences
5. **Projects** - Default language, test framework, output directory

**Data Sources:**
- settingsStore (Zustand)
- IPC: `settings:get`, `settings:update`
- Model lists from constants

**Test IDs:**
- `settings-page`
- `settings-tabs`, `tab-llm`, `tab-agents`, `tab-checkpoints`, `tab-ui`, `tab-projects`
- `claude-backend-toggle`, `claude-model-select`, `claude-api-key-input`
- `gemini-backend-toggle`, `gemini-model-select`, `gemini-api-key-input`
- `embeddings-backend-toggle`, `embeddings-model-select`
- `agent-model-table`, `agent-model-row-{type}`
- `save-button`, `reset-defaults-button`

---

## 4. Data Flow

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERER PROCESS                         │
│                                                                  │
│  [Pages] ◄─► [Stores (Zustand)] ◄─► [Hooks] ◄─► [Components]    │
│                        │                                         │
│                        ▼                                         │
│              [Preload API - window.nexus.*]                      │
├────────────────────────┬────────────────────────────────────────┤
│                        │ IPC                                     │
├────────────────────────┼────────────────────────────────────────┤
│                        ▼                          MAIN PROCESS   │
│              [IPC Handlers]                                      │
│                        │                                         │
│  [Services] ◄─► [EventBus] ◄─► [Database] ◄─► [LLM Clients]     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Update Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Request/Response** | Initial data load | `window.nexus.invoke()` |
| **Event-Driven** | Real-time updates | `window.nexus.on()` |
| **Optimistic** | Form submissions | Update UI first, reconcile on response |
| **Streaming** | Agent output | Batched event handling (50ms debounce) |

### 4.3 Zustand Stores

```typescript
// Store Structure
stores/
├── settingsStore.ts    // LLM/Agent/UI settings
├── projectStore.ts     // Active project, mode
├── agentStore.ts       // Agent pool status
├── interviewStore.ts   // Messages, requirements
├── taskStore.ts        // Task list, Kanban state
├── metricsStore.ts     // Dashboard stats, timeline
└── uiStore.ts          // Theme, sidebar, modals
```

### 4.4 Custom Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useEventBus` | Subscribe to EventBus events | `{ subscribe, unsubscribe }` |
| `useAgent` | Agent data and actions | `{ agent, pause, resume }` |
| `useSettings` | Settings with auto-save | `{ settings, updateSetting }` |
| `useRealTimeUpdates` | Generic real-time data | `{ data, loading, error }` |
| `useLocalStorage` | Persistent local state | `[value, setValue]` |
| `useMediaQuery` | Responsive breakpoints | `boolean` |
| `useDebounce` | Debounced values | `debouncedValue` |

---

## 5. Animations

### 5.1 Micro-Interactions

| Element | Trigger | Animation |
|---------|---------|-----------|
| **Button** | Hover | Scale 1.02, 150ms ease |
| **Button** | Press | Scale 0.98, 100ms ease |
| **Card** | Hover | Shadow increase, border highlight |
| **Toggle** | Change | Thumb slide 200ms ease-out |
| **Progress** | Update | Width transition 300ms ease |
| **Status dot** | Active | Pulse animation (infinite) |

### 5.2 Page Transitions

| Transition | Duration | Easing | Effect |
|------------|----------|--------|--------|
| **Route change** | 200ms | ease-out | Fade + slide up 10px |
| **Modal open** | 200ms | ease-out | Fade + scale 0.95→1 |
| **Modal close** | 150ms | ease-in | Fade + scale 1→0.95 |
| **Toast enter** | 300ms | bounce | Slide in from right |
| **Toast exit** | 200ms | ease-in | Fade out |

### 5.3 Loading States

| State | Component | Animation |
|-------|-----------|-----------|
| **Skeleton** | Shimmer | Gradient sweep 1.5s linear infinite |
| **Spinner** | Rotate | 360deg 0.8s linear infinite |
| **Progress (indeterminate)** | Slide | Left to right sweep 2s ease |
| **Streaming text** | Cursor blink | Opacity 0→1 500ms step-end infinite |

---

## 6. Accessibility

### 6.1 WCAG 2.1 AA Requirements

- **Color Contrast:** All text 4.5:1 minimum, large text 3:1
- **Focus Indicators:** Visible focus ring (2px, accent-primary)
- **Keyboard Navigation:** All interactive elements keyboard accessible
- **Screen Readers:** Proper ARIA labels, roles, live regions
- **Reduced Motion:** Respect `prefers-reduced-motion`

### 6.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `Cmd/Ctrl + S` | Save (in forms) |
| `Escape` | Close modal/dropdown |
| `Tab` | Navigate forward |
| `Shift + Tab` | Navigate backward |

---

## 7. Responsive Design

### 7.1 Breakpoints

| Name | Width | Layout Changes |
|------|-------|----------------|
| **Mobile** | <640px | Single column, hidden sidebar, bottom nav |
| **Tablet** | 640-1024px | Collapsible sidebar, stacked cards |
| **Desktop** | 1024-1280px | Full sidebar, 2-column layouts |
| **Large** | >1280px | Max content width 1440px, centered |

### 7.2 Page-Specific Responsive Behavior

| Page | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| **Dashboard** | Stats stack, single column | 2x2 stats grid | 4-column stats |
| **Interview** | Full-width chat, tabs | Split 50/50 | Split 60/40 |
| **Tasks** | Horizontal scroll columns | 2 visible columns | 4 columns |
| **Agents** | Single panel, tabs | Split 40/60 | Split 30/70 |
| **Settings** | Full-width tabs | Side tabs | Side tabs |

---

## 8. Implementation Priority

### Phase 17B: Foundation (Tasks 8-12)
1. Design tokens (Tailwind config)
2. Base components (Button, Input, Select, Toggle)
3. Layout components (Card, Tabs, Sidebar, Header)
4. Feedback components (Toast, Modal, Spinner)
5. Agent components (AgentBadge, AgentCard)

### Phase 17C: Core Pages (Tasks 13-23)
1. Navigation and App Shell
2. Dashboard Page + Playwright tests
3. Interview Page + Playwright tests
4. Tasks/Kanban Page + Playwright tests
5. Agents Page + Playwright tests
6. Execution Page + Playwright tests

### Phase 17D: Settings & Polish (Tasks 24-31)
1. Settings - LLM Providers tab
2. Settings - Agents tab
3. Settings - Checkpoints/UI/Projects tabs
4. All settings Playwright tests
5. Animations and micro-interactions
6. Responsive design polish
7. Responsive Playwright tests

### Phase 17E: Integration (Tasks 32-36)
1. Connect all pages to real data
2. Real-time updates testing
3. Full Playwright test suite
4. Visual regression testing
5. Final test report

---

## 9. File Structure

```
src/renderer/src/
├── components/
│   ├── ui/                    # Base design system
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Toggle.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Card.tsx
│   │   ├── Tabs.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Progress.tsx
│   │   ├── Spinner.tsx
│   │   ├── Skeleton.tsx
│   │   ├── CodeBlock.tsx
│   │   └── index.ts
│   ├── layout/               # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── PageLayout.tsx
│   │   └── index.ts
│   ├── agents/               # Agent-specific
│   │   ├── AgentBadge.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentActivity.tsx
│   │   ├── AgentPoolStatus.tsx
│   │   ├── QAStatusPanel.tsx
│   │   └── index.ts
│   ├── dashboard/            # Dashboard components
│   ├── interview/            # Interview components
│   ├── tasks/                # Kanban components
│   ├── execution/            # Execution components
│   └── settings/             # Settings components
├── pages/
│   ├── DashboardPage.tsx
│   ├── InterviewPage.tsx
│   ├── TasksPage.tsx
│   ├── AgentsPage.tsx
│   ├── ExecutionPage.tsx
│   └── SettingsPage.tsx
├── stores/
│   ├── settingsStore.ts
│   ├── projectStore.ts
│   ├── agentStore.ts
│   ├── interviewStore.ts
│   ├── taskStore.ts
│   ├── metricsStore.ts
│   └── uiStore.ts
├── hooks/
│   ├── useEventBus.ts
│   ├── useAgent.ts
│   ├── useSettings.ts
│   └── useRealTimeUpdates.ts
└── styles/
    ├── globals.css
    └── tokens.ts
```

---

## 10. Testing Requirements

### 10.1 Playwright Test Coverage

| Page | Minimum Tests | Test Categories |
|------|---------------|-----------------|
| **Dashboard** | 15 | Rendering, Data, Interaction, Real-time |
| **Interview** | 12 | Chat, Requirements, Progress, Actions |
| **Tasks** | 14 | Columns, Cards, Drag/Drop, Filters |
| **Agents** | 11 | Pool Status, Selection, Output, QA |
| **Execution** | 9 | Tabs, Logs, Status, Actions |
| **Settings** | 18 | All tabs, Forms, Validation, Persistence |
| **TOTAL** | **79** | |

### 10.2 Visual Regression

- Screenshot capture for each page
- Component-level screenshots for critical UI elements
- Responsive screenshots (mobile, tablet, desktop)

### 10.3 Success Criteria

```
PHASE 17 COMPLETION REQUIREMENTS
================================
[ ] All 79+ Playwright tests pass
[ ] All existing 2,084+ backend tests pass
[ ] 100% of backend features exposed in UI
[ ] WCAG 2.1 AA accessibility compliance
[ ] No console errors in production build
[ ] All responsive breakpoints functional
[ ] Real-time updates working on all pages
[ ] Settings persist correctly
```

---

## Document Approval

This design specification is the authoritative reference for Phase 17 implementation. All components, pages, and interactions must conform to this specification.

**Status:** APPROVED FOR IMPLEMENTATION

**Next Action:** Proceed to Phase 17B - Task 8: Set up design system (Tailwind config)
