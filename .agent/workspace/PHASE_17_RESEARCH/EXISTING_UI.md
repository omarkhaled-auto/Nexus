# Existing Nexus UI

This document catalogs the complete existing UI structure in the Nexus renderer application, including pages, components, stores, and identified gaps for Phase 17 redesign.

## Technology Stack

- **Framework:** React 18 with TypeScript
- **Routing:** React Router v7 (createBrowserRouter)
- **State Management:** Zustand stores
- **Styling:** Tailwind CSS + custom CSS variables
- **UI Components:** Custom components + Radix UI primitives
- **Icons:** Lucide React
- **Animations:** Framer Motion (via AnimatedPage)
- **Toasts:** Sonner

---

## Pages

### 1. ModeSelectorPage (`/`)
**File:** `src/renderer/src/pages/ModeSelectorPage.tsx`

**Purpose:** Landing page for selecting between Genesis and Evolution modes.

**Current State:**
- Clean, Cursor-style aesthetic with dark theme
- Two mode cards (Genesis/Evolution) with gradient hover effects
- Icons from Lucide (Sparkles, GitBranch)
- Responsive grid layout
- Connects to UIBackendBridge for mode initialization

**Components Used:**
- Card, CardHeader, CardTitle, CardDescription, CardContent

**Data Sources:**
- UIBackendBridge for mode initialization
- uiStore for loading state

---

### 2. InterviewPage (`/genesis`)
**File:** `src/renderer/src/pages/InterviewPage.tsx`

**Purpose:** Genesis mode interview interface for gathering project requirements.

**Current State:**
- Split-screen layout (chat left, requirements sidebar right)
- Resume banner for session recovery
- Auto-save with draft persistence
- Bottom status bar with save indicator
- New interview button

**Components Used:**
- InterviewLayout (split pane)
- ChatPanel (conversation interface)
- RequirementsSidebar (extracted requirements)
- AnimatedPage (page transitions)

**Data Sources:**
- interviewStore (messages, requirements, stage)
- useInterviewPersistence hook (draft save/restore)

**Sub-components:**
- `InterviewLayout.tsx` - Split pane container
- `ChatPanel.tsx` - Chat message interface
- `RequirementsSidebar.tsx` - Requirements display
- `CategorySection.tsx` - Grouped requirements
- `RequirementCard.tsx` - Individual requirement display
- `StageProgress.tsx` - Interview progress indicator

---

### 3. KanbanPage (`/evolution`)
**File:** `src/renderer/src/pages/KanbanPage.tsx`

**Purpose:** Evolution mode Kanban board for managing features.

**Current State:**
- Header with project name
- Full Kanban board with 6 columns
- Demo features loaded on mount
- Responsive, scrollable layout

**Components Used:**
- KanbanBoard (main board)
- KanbanHeader (project header)
- AnimatedPage (page transitions)

**Data Sources:**
- featureStore (features, filters, selection)

**Kanban Columns (6 total):**
1. Backlog
2. Planning
3. In Progress (WIP limit: 3)
4. AI Review
5. Human Review
6. Done

**Sub-components:**
- `KanbanBoard.tsx` - Main board with columns
- `KanbanColumn.tsx` - Individual column
- `KanbanHeader.tsx` - Project header with filters
- `FeatureCard.tsx` - Feature card display
- `FeatureDetailModal.tsx` - Feature details popup

---

### 4. DashboardPage (`/dashboard`)
**File:** `src/renderer/src/pages/DashboardPage.tsx`

**Purpose:** Real-time observability dashboard for project monitoring.

**Current State:**
- Header with title and CostTracker
- Overview cards (4 metrics in grid)
- Progress chart + Agent activity (split row)
- Task timeline (full width, scrollable)
- Demo mode with generated sample data
- Loading skeletons for initial state

**Components Used:**
- CostTracker (cost display)
- OverviewCards (metric cards)
- ProgressChart (line chart)
- AgentActivity (agent status)
- TaskTimeline (event feed)
- AnimatedPage, CardSkeleton

**Data Sources:**
- metricsStore (overview, agents, timeline, costs)

**Sub-components:**
- `CostTracker.tsx` - Token/cost metrics display
- `OverviewCards.tsx` - Key metric cards
- `ProgressChart.tsx` - Task completion chart
- `AgentActivity.tsx` - Active agent display
- `TaskTimeline.tsx` - Event log feed
- `EventRow.tsx` - Individual timeline event

---

### 5. SettingsPage (`/settings`)
**File:** `src/renderer/src/pages/SettingsPage.tsx`

**Purpose:** User settings configuration interface.

**Current State:**
- Vertical tab navigation (left sidebar)
- 5 tab sections with cards
- API key management with show/hide
- Form inputs for all settings
- Save/Cancel footer with dirty state tracking
- Reset to defaults functionality

**Tabs:**
1. **LLM** - API keys, default provider/model, fallback settings
2. **Agents** - Max parallel agents, timeouts, retry behavior
3. **Checkpoints** - Auto-checkpoint settings, retention
4. **UI** - Theme selection, sidebar width, notifications
5. **Projects** - Default language, test framework, output directory

**Components Used:**
- Button, Card, CardHeader, CardTitle, CardDescription, CardContent
- Custom Input, Select, Checkbox components (inline)
- ApiKeyInput (password field with save/clear)

**Data Sources:**
- settingsStore (settings, pendingChanges, dirty state)

---

## Components Inventory

### Layout Components
| Component | File | Purpose |
|-----------|------|---------|
| RootLayout | `components/layout/RootLayout.tsx` | Root wrapper, initializes UIBackendBridge |
| AnimatedPage | `components/AnimatedPage.tsx` | Page transition animations |

### UI Components (Base)
| Component | File | Purpose |
|-----------|------|---------|
| Button | `components/ui/button.tsx` | Primary button with variants (Radix Slot) |
| Card | `components/ui/card.tsx` | Card container with header/content |
| Dialog | `components/ui/dialog.tsx` | Modal dialog (Radix based) |
| ScrollArea | `components/ui/scroll-area.tsx` | Custom scrollbar area |
| EmptyState | `components/ui/EmptyState.tsx` | Empty content placeholder |
| Skeleton | `components/ui/Skeleton.tsx` | Loading skeleton variants |
| Spinner | `components/ui/Spinner.tsx` | Loading spinner |

### Dashboard Components
| Component | File | Purpose |
|-----------|------|---------|
| CostTracker | `components/dashboard/CostTracker.tsx` | Token/cost metrics |
| OverviewCards | `components/dashboard/OverviewCards.tsx` | Key metric cards |
| ProgressChart | `components/dashboard/ProgressChart.tsx` | Task progress line chart |
| AgentActivity | `components/dashboard/AgentActivity.tsx` | Active agent display |
| TaskTimeline | `components/dashboard/TaskTimeline.tsx` | Event timeline feed |
| EventRow | `components/dashboard/EventRow.tsx` | Timeline event row |

### Interview Components
| Component | File | Purpose |
|-----------|------|---------|
| InterviewLayout | `components/interview/InterviewLayout.tsx` | Split pane layout |
| ChatPanel | `components/interview/ChatPanel.tsx` | Chat conversation |
| RequirementsSidebar | `components/interview/RequirementsSidebar.tsx` | Requirements list |
| CategorySection | `components/interview/CategorySection.tsx` | Grouped requirements |
| RequirementCard | `components/interview/RequirementCard.tsx` | Single requirement |
| StageProgress | `components/interview/StageProgress.tsx` | Interview progress |

### Kanban Components
| Component | File | Purpose |
|-----------|------|---------|
| KanbanBoard | `components/kanban/KanbanBoard.tsx` | Main board |
| KanbanColumn | `components/kanban/KanbanColumn.tsx` | Column container |
| KanbanHeader | `components/kanban/KanbanHeader.tsx` | Board header |
| FeatureCard | `components/kanban/FeatureCard.tsx` | Feature card |
| FeatureDetailModal | `components/kanban/FeatureDetailModal.tsx` | Feature details |

### Checkpoint Components
| Component | File | Purpose |
|-----------|------|---------|
| CheckpointList | `components/checkpoints/CheckpointList.tsx` | Checkpoint history |
| ReviewModal | `components/checkpoints/ReviewModal.tsx` | Checkpoint review |

### Utility Components
| Component | File | Purpose |
|-----------|------|---------|
| ThemeProvider | `components/theme-provider.tsx` | Theme context |
| ErrorBoundary | `components/ErrorBoundary.tsx` | Error handling |
| KeyboardShortcutsModal | `components/KeyboardShortcutsModal.tsx` | Shortcuts help |

---

## Stores (Zustand)

### 1. settingsStore
**File:** `stores/settingsStore.ts`

**State:**
- `settings: NexusSettingsPublic | null` - Current settings
- `isLoading: boolean` - Loading state
- `isDirty: boolean` - Unsaved changes flag
- `pendingChanges: PendingChanges` - Changes pending save

**Actions:**
- `loadSettings()` - Load from main process
- `updateSetting(category, key, value)` - Update single setting
- `saveSettings()` - Persist changes
- `discardChanges()` - Reset pending changes
- `setApiKey(provider, key)` - Set API key securely
- `clearApiKey(provider)` - Remove API key
- `resetToDefaults()` - Factory reset

**Selectors:**
- `useSettings()` - Merged settings with pending changes
- `useRawSettings()` - Raw settings without pending
- `useThemeSetting()` - Current theme
- `useHasApiKey(provider)` - API key status
- `useSettingsLoading()` - Loading state
- `useSettingsDirty()` - Dirty state

---

### 2. projectStore
**File:** `stores/projectStore.ts`

**State:**
- `currentProject: Project | null` - Active project
- `projects: Project[]` - All projects
- `mode: 'genesis' | 'evolution' | null` - Current mode

**Actions:**
- `setProject(project)` - Set current project
- `setMode(mode)` - Set mode
- `addProject(project)` - Add new project
- `clearProject()` - Clear current
- `reset()` - Full reset

**Selectors:**
- `useCurrentProject()` - Current project
- `useMode()` - Current mode
- `useProjects()` - All projects

---

### 3. agentStore
**File:** `stores/agentStore.ts`

**State:**
- `agents: Map<string, AgentStatus>` - Agent map by ID

**AgentStatus Interface:**
```typescript
interface AgentStatus {
  id: string
  type: 'coder' | 'tester' | 'reviewer' | 'merger'
  status: 'idle' | 'working' | 'error'
  currentTaskId?: string
}
```

**Actions:**
- `setAgentStatus(status)` - Set agent status
- `updateAgent(id, update)` - Update agent
- `removeAgent(id)` - Remove agent
- `getActiveCount()` - Count working agents
- `clearAgents()` - Clear all
- `reset()` - Full reset

**Selectors:**
- `useAgents()` - Agent map
- `useAgentsArray()` - Agents as array
- `useActiveAgents()` - Working agents only
- `useAgentsByType(type)` - Filter by type

---

### 4. interviewStore
**File:** `stores/interviewStore.ts`

**State:**
- `stage: InterviewStage` - Current interview stage
- `messages: InterviewMessage[]` - Chat messages
- `requirements: Requirement[]` - Extracted requirements
- `isInterviewing: boolean` - Interview active
- `projectName: string | null` - Project name
- `interviewStartTime: number | null` - Start timestamp

**Actions:**
- `setStage(stage)` - Set interview stage
- `addMessage(message)` - Add chat message
- `updateMessage(id, updates)` - Update message
- `addRequirement(requirement)` - Add requirement
- `updateRequirement(id, updates)` - Update requirement
- `removeRequirement(id)` - Remove requirement
- `setProjectName(name)` - Set project name
- `startInterview()` - Begin interview
- `completeInterview()` - Finish interview
- `reset()` - Full reset

**Selectors:**
- `useInterviewStage()` - Current stage
- `useMessages()` - All messages
- `useRequirements()` - All requirements
- `useIsInterviewing()` - Interview active
- `useProjectName()` - Project name
- `useLatestMessage()` - Most recent message
- `useRequirementsByCategory(category)` - Filter requirements

---

### 5. featureStore
**File:** `stores/featureStore.ts`

**State:**
- `features: Feature[]` - All features
- `selectedFeatureId: string | null` - Selected feature
- `filter: FeatureFilter` - Active filters

**FeatureStatus Values:**
- `backlog`, `planning`, `in_progress`, `ai_review`, `human_review`, `done`

**WIP Limit:** 3 (enforced for `in_progress`)

**Actions:**
- `setFeatures(features)` - Set all features
- `addFeature(feature)` - Add feature (emits IPC event)
- `updateFeature(id, update)` - Update feature
- `removeFeature(id)` - Remove feature
- `moveFeature(id, newStatus)` - Move to column (with WIP check)
- `reorderFeatures(columnId, oldIndex, newIndex)` - Reorder within column
- `selectFeature(id)` - Select feature
- `setSearchFilter(search)` - Set search filter
- `setPriorityFilter(priorities)` - Set priority filter
- `setStatusFilter(statuses)` - Set status filter
- `clearFilters()` - Clear all filters
- `reset()` - Full reset

**Selectors:**
- `useFeatures()` - All features
- `useFeaturesByStatus(status)` - Filter by status
- `useFeature(id)` - Single feature
- `useFeatureCount()` - Total count
- `useColumnCounts()` - Count per column
- `useSelectedFeatureId()` - Selected ID
- `useFeatureFilter()` - Current filters
- `useFilteredFeatures()` - Filtered features

---

### 6. metricsStore
**File:** `stores/metricsStore.ts`

**State:**
- `overview: OverviewMetrics | null` - Project metrics
- `timeline: TimelineEvent[]` - Event history (max 100)
- `agents: AgentMetrics[]` - Agent metrics
- `costs: CostMetrics | null` - Cost tracking
- `isLoading: boolean` - Loading state
- `lastUpdated: Date | null` - Last update time

**Actions:**
- `setOverview(overview)` - Set overview metrics
- `addTimelineEvent(event)` - Add timeline event
- `updateAgentMetrics(agentId, update)` - Update agent metrics
- `setAgents(agents)` - Set all agents
- `setCosts(costs)` - Set cost metrics
- `setLoading(isLoading)` - Set loading state
- `reset()` - Full reset

**Selectors:**
- `useOverview()` - Overview metrics
- `useTimeline()` - Timeline events
- `useAgentMetrics()` - Agent metrics
- `useCosts()` - Cost metrics
- `useIsMetricsLoading()` - Loading state
- `useLastUpdated()` - Last update time
- `useActiveAgentCount()` - Working agent count
- `useTaskProgress()` - Task completion progress

---

### 7. taskStore
**File:** `stores/taskStore.ts`

**Purpose:** Task management for individual task items.

---

### 8. uiStore
**File:** `stores/uiStore.ts`

**Purpose:** UI state management (loading states, modals, etc.).

---

## Gaps Identified

### Missing Pages

1. **Agents Page** - No dedicated page for real-time agent activity monitoring
   - Need: Live agent status, output streaming, QA status, iteration tracking

2. **Execution Logs Page** - No page for build/lint/test/review logs
   - Need: Tab-based logs view, syntax highlighting, success/error indicators

3. **Memory/Context Page** - No page for viewing Nexus's knowledge
   - Need: Repository map, learned patterns, semantic search visualization

### Missing in Settings

1. **Model Dropdowns** - Currently text inputs instead of dropdowns
   - Need: Populated dropdowns with all Claude/Gemini models

2. **Backend Toggle (CLI/API)** - Not exposed in UI
   - Need: Toggle switches for each provider's backend selection

3. **Per-Agent Model Configuration** - Not implemented
   - Need: Agent table with provider/model selection per agent type

4. **Advanced LLM Settings** - Missing timeout, retries per provider
   - Need: Expandable advanced sections

### Missing in Dashboard

1. **Project Selection** - No way to view different projects
2. **Real-time Data** - Only demo data, no real EventBus connection in UI
3. **QA Status Panel** - No build/lint/test/review status cards

### Missing in Kanban

1. **Agent Assignment Display** - No visual indicator of which agent is working on what
2. **Task-level View** - Only feature-level, no task breakdown
3. **Real-time Updates** - Features don't update based on backend events

### Missing in Interview

1. **Requirement Editing** - Can't edit extracted requirements inline
2. **Export Functionality** - No way to export requirements
3. **AI Suggestions** - No proactive requirement suggestions

### Missing Components

1. **AgentBadge** - No standardized agent status indicator
2. **StatusCard** - No expandable status card with logs
3. **CodeBlock** - No syntax-highlighted code display
4. **Toggle** - No switch component for boolean settings
5. **CommandPalette** - No Cmd+K quick actions
6. **Breadcrumbs** - No navigation breadcrumbs

### Missing Functionality

1. **Real-time Event Subscription** - UI doesn't react to EventBus events
2. **Notification System** - No toast notifications for events
3. **Keyboard Shortcuts** - Limited implementation
4. **Search/Filter** - Missing global search
5. **Responsive Design** - Limited mobile/tablet support

---

## UI Integration Points

### IPC Channels Used

From preload API:
- `nexusAPI.settings.getAll()` - Get all settings
- `nexusAPI.settings.set(path, value)` - Set single setting
- `nexusAPI.settings.setApiKey(provider, key)` - Set API key
- `nexusAPI.settings.clearApiKey(provider)` - Clear API key
- `nexusAPI.settings.reset()` - Reset settings

### Event Channels for Real-time Updates

From preload API (to be connected):
- `nexusAPI.onTimelineEvent(callback)` - Timeline events
- `nexusAPI.onAgentMetrics(callback)` - Agent metrics
- `nexusAPI.onTaskUpdated(callback)` - Task updates
- `nexusAPI.emitEvent(channel, payload)` - Emit events

### UIBackendBridge Methods

- `uiBackendBridge.initialize()` - Initialize bridge
- `uiBackendBridge.cleanup()` - Cleanup listeners
- `uiBackendBridge.startGenesis()` - Start Genesis mode
- `uiBackendBridge.startEvolution(projectPath)` - Start Evolution mode

---

## Current Route Structure

```
/ (RootLayout)
├── / (index) → ModeSelectorPage
├── /genesis → InterviewPage
├── /evolution → KanbanPage
├── /dashboard → DashboardPage
└── /settings → SettingsPage
```

**Required New Routes (Phase 17):**
```
/ (RootLayout with Sidebar Navigation)
├── / (index) → ModeSelectorPage OR Dashboard
├── /projects → Projects list
├── /projects/:id → Project overview
├── /projects/:id/interview → InterviewPage
├── /projects/:id/tasks → KanbanPage (renamed)
├── /projects/:id/agents → AgentsPage (NEW)
├── /projects/:id/execution → ExecutionPage (NEW)
├── /projects/:id/memory → MemoryPage (NEW)
├── /dashboard → DashboardPage
└── /settings → SettingsPage
```

---

## Design System Analysis

### Current Colors (CSS Variables)
```css
--background: Dark background
--foreground: Light text
--primary: Brand purple
--muted-foreground: Secondary text
--border: Subtle borders
--destructive: Error red
```

### Current Typography
- Headings: text-2xl, text-xl, text-lg (font-semibold/bold)
- Body: text-sm, text-base
- Muted: text-muted-foreground

### Current Spacing
- Page padding: p-6, p-8
- Component gaps: gap-2, gap-4, gap-6
- Card padding: CardContent with built-in padding

### Button Variants
- `default` - Primary brand color
- `destructive` - Error red
- `outline` - Bordered
- `secondary` - Subtle background
- `ghost` - No background
- `link` - Text with underline

### Card Variants
- Standard Card with Header/Content
- Interactive cards with hover states (ModeSelectorPage)
- Feature cards with complexity/priority badges

---

## Summary

The existing Nexus UI has a solid foundation with:
- Clean page structure
- Proper state management with Zustand
- Good separation of concerns
- Basic design system in place

Key areas needing Phase 17 work:
1. **New Pages:** Agents, Execution, Memory
2. **Settings Overhaul:** Model dropdowns, backend toggles, per-agent config
3. **Real-time Updates:** Connect UI to EventBus
4. **Component Library:** AgentBadge, StatusCard, CodeBlock, Toggle
5. **Navigation:** Sidebar with project context
6. **Polish:** Consistent design system, animations, responsiveness
