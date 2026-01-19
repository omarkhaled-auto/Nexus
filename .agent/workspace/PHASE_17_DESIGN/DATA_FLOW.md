# Nexus UI Data Flow Documentation

This document defines the complete data flow architecture for each page in the Nexus UI, including data sources, event subscriptions, API calls, state management patterns, and loading/error handling.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow Patterns](#data-flow-patterns)
3. [Dashboard Page](#dashboard-page)
4. [Interview Page](#interview-page)
5. [Tasks/Kanban Page](#taskskanban-page)
6. [Agents Page](#agents-page)
7. [Execution Page](#execution-page)
8. [Settings Page](#settings-page)
9. [Memory Page (Optional)](#memory-page-optional)
10. [Global Data Flow](#global-data-flow)

---

## Architecture Overview

### Data Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER PROCESS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Pages     │◄──►│   Stores    │◄──►│   Hooks     │◄──►│  Components │ │
│  │  (Views)    │    │  (Zustand)  │    │  (Custom)   │    │   (UI)      │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └─────────────┘ │
│         │                  │                  │                            │
│         │                  │                  │                            │
│         └──────────────────┴──────────────────┘                            │
│                            │                                               │
│                            ▼                                               │
│              ┌─────────────────────────────┐                               │
│              │       Preload API           │                               │
│              │  (window.nexus.*)           │                               │
│              └──────────────┬──────────────┘                               │
│                             │                                              │
├─────────────────────────────┼──────────────────────────────────────────────┤
│                             │ IPC                                          │
├─────────────────────────────┼──────────────────────────────────────────────┤
│                             ▼                               MAIN PROCESS   │
│              ┌─────────────────────────────┐                               │
│              │       IPC Handlers          │                               │
│              │  (ipcMain.handle)           │                               │
│              └──────────────┬──────────────┘                               │
│                             │                                              │
│                             ▼                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Services   │    │  EventBus   │    │  Database   │    │ LLM Clients │ │
│  │             │◄──►│             │◄──►│  (SQLite)   │    │ (API/CLI)   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Communication Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `invoke` | Renderer → Main | Request/response for API calls |
| `send` | Renderer → Main | Fire-and-forget events |
| `on` | Main → Renderer | Event subscriptions (real-time updates) |

### Data Update Patterns

1. **Request/Response** - Direct API calls for initial data load
2. **Event-Driven** - Real-time updates via EventBus subscriptions
3. **Optimistic Updates** - UI updates immediately, reconciles on response
4. **Polling (fallback)** - Periodic refresh when EventBus unavailable

---

## Data Flow Patterns

### Pattern 1: Initial Load + Real-time Subscription

```typescript
// Used for: Dashboard, Agents, Tasks pages
useEffect(() => {
  // 1. Initial data load
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.nexus.invoke('channel:getData');
      setData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  loadData();

  // 2. Subscribe to real-time updates
  const unsubscribe = window.nexus.on('event:type', (event) => {
    setData(prev => updateData(prev, event));
  });

  return () => unsubscribe();
}, []);
```

### Pattern 2: Form Submission with Optimistic Update

```typescript
// Used for: Settings, Interview
const handleSubmit = async (values) => {
  // 1. Optimistic update
  setData(prev => ({ ...prev, ...values }));
  setSaving(true);

  try {
    // 2. API call
    await window.nexus.invoke('channel:update', values);
    // 3. Success feedback
    toast.success('Saved successfully');
  } catch (error) {
    // 4. Rollback on error
    setData(previousData);
    toast.error('Save failed: ' + error.message);
  } finally {
    setSaving(false);
  }
};
```

### Pattern 3: Streaming Data

```typescript
// Used for: Agent output, Execution logs
useEffect(() => {
  const buffer: string[] = [];
  let timeoutId: number;

  const unsubscribe = window.nexus.on('agent:output', ({ agentId, line }) => {
    if (agentId === selectedAgent) {
      buffer.push(line);
      // Batch updates for performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setOutput(prev => [...prev, ...buffer.splice(0)]);
      }, 50);
    }
  });

  return () => {
    clearTimeout(timeoutId);
    unsubscribe();
  };
}, [selectedAgent]);
```

---

## Dashboard Page

### Purpose
Display high-level overview of all projects and real-time agent activity.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Active project count | `projects:getAll` | Query | On load + events |
| Tasks completed today | `tasks:getStats` | Query | On load + events |
| Agent status summary | `agents:getPoolStatus` | Query | On load + events |
| Recent projects | `projects:getRecent` | Query | On load + events |
| Live agent feed | `agent:*` events | Stream | Real-time |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('projects:getAll')              → Project[]
window.nexus.invoke('projects:getRecent', limit)    → Project[]
window.nexus.invoke('tasks:getStats', { today: true }) → TaskStats
window.nexus.invoke('agents:getPoolStatus')         → PoolStatus

// Events (subscriptions)
window.nexus.on('project:created')                  → { project: Project }
window.nexus.on('project:status-changed')           → { projectId, status }
window.nexus.on('task:completed')                   → { taskId, projectId }
window.nexus.on('agent:assigned')                   → { agentId, taskId }
window.nexus.on('agent:idle')                       → { agentId }
```

### State Management

```typescript
// src/renderer/src/stores/dashboardStore.ts
interface DashboardState {
  // Data
  stats: {
    activeProjects: number;
    tasksToday: number;
    agentsWorking: number;
    totalAgents: number;
  };
  recentProjects: Project[];
  agentFeed: AgentEvent[];

  // Loading states
  statsLoading: boolean;
  projectsLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  loadDashboard: () => Promise<void>;
  addAgentEvent: (event: AgentEvent) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD PAGE DATA FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────────┐                      ┌────────────────┐                │
│   │  Page Mount    │────────────────────► │  loadDashboard │                │
│   └────────────────┘                      └───────┬────────┘                │
│                                                   │                         │
│          ┌────────────────────────────────────────┼────────────────────┐    │
│          ▼                                        ▼                    ▼    │
│   ┌──────────────┐               ┌──────────────────────┐   ┌────────────┐ │
│   │ getStats()   │               │ getRecent(5)         │   │ getPool()  │ │
│   └──────┬───────┘               └──────────┬───────────┘   └─────┬──────┘ │
│          │                                  │                     │        │
│          ▼                                  ▼                     ▼        │
│   ┌──────────────┐               ┌──────────────────────┐   ┌────────────┐ │
│   │  Stats Cards │               │  Project Cards       │   │ Agent Feed │ │
│   └──────────────┘               └──────────────────────┘   └────────────┘ │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│                         REAL-TIME EVENT SUBSCRIPTIONS                       │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│   │ project:created │    │ task:completed  │    │ agent:assigned/idle     │ │
│   └────────┬────────┘    └────────┬────────┘    └───────────┬─────────────┘ │
│            │                      │                         │               │
│            ▼                      ▼                         ▼               │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                    Zustand Store Updates                             │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Loading & Error States

| State | UI Behavior |
|-------|-------------|
| `statsLoading` | Skeleton in stat cards |
| `projectsLoading` | Skeleton in project list |
| `error` | Error banner with retry button |
| Empty projects | EmptyState component with "Create Project" CTA |

---

## Interview Page

### Purpose
Guided conversation interface for requirements gathering with real-time extraction.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Session state | `interview:getSession` | Query | On load |
| Messages | `interview:getMessages` | Query | On load + events |
| Requirements | `interview:getRequirements` | Query | On load + events |
| Progress | Computed from requirements | Derived | On update |
| Suggested questions | `interview:getSuggestions` | Query | On message |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('interview:startSession', projectId) → InterviewSession
window.nexus.invoke('interview:getSession', sessionId)   → InterviewSession
window.nexus.invoke('interview:sendMessage', { sessionId, content }) → MessageResponse
window.nexus.invoke('interview:complete', sessionId)     → CompletionResult
window.nexus.invoke('interview:saveDraft', sessionId)    → void

// Events
window.nexus.on('interview:question-asked')              → { question, category }
window.nexus.on('interview:requirement-captured')        → { requirement }
window.nexus.on('interview:category-completed')          → { category, count }
window.nexus.on('interview:completed')                   → { totalRequirements }
```

### State Management

```typescript
// src/renderer/src/stores/interviewStore.ts
interface InterviewState {
  // Session
  sessionId: string | null;
  projectId: string | null;
  isActive: boolean;

  // Messages
  messages: Message[];
  isTyping: boolean;
  inputValue: string;

  // Requirements
  requirements: Requirement[];
  requirementsByCategory: Record<string, Requirement[]>;

  // Progress
  progress: number;          // 0-100
  exploredCategories: string[];
  suggestedGaps: string[];

  // Loading states
  sendingMessage: boolean;
  loadingSession: boolean;
  completing: boolean;

  // Actions
  startSession: (projectId: string) => Promise<void>;
  sendMessage: () => Promise<void>;
  setInputValue: (value: string) => void;
  confirmRequirement: (id: string) => void;
  rejectRequirement: (id: string) => void;
  editRequirement: (id: string, updates: Partial<Requirement>) => void;
  completeInterview: () => Promise<void>;
  saveDraft: () => Promise<void>;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTERVIEW PAGE DATA FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                        USER INPUT FLOW                                │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌────────────────┐         ┌─────────────────┐         ┌───────────────┐ │
│   │  User types    │────────►│ setInputValue   │────────►│ ChatInput     │ │
│   └────────────────┘         └─────────────────┘         └───────────────┘ │
│                                                                             │
│   ┌────────────────┐         ┌─────────────────┐         ┌───────────────┐ │
│   │  User sends    │────────►│ sendMessage()   │────────►│ API Call      │ │
│   └────────────────┘         └────────┬────────┘         └───────┬───────┘ │
│                                       │                          │         │
│                              ┌────────▼────────┐        ┌────────▼───────┐ │
│                              │ Optimistic add  │        │ Backend        │ │
│                              │ user message    │        │ InterviewEngine│ │
│                              └────────┬────────┘        └────────┬───────┘ │
│                                       │                          │         │
│   ┌───────────────────────────────────┼──────────────────────────┘         │
│   │                                   │                                    │
│   │   ┌───────────────────────────────▼─────────────────────────────────┐  │
│   │   │                    RESPONSE PROCESSING                          │  │
│   │   └───────────────────────────────┬─────────────────────────────────┘  │
│   │                                   │                                    │
│   │        ┌──────────────────────────┼──────────────────────────┐         │
│   │        ▼                          ▼                          ▼         │
│   │   ┌────────────┐           ┌──────────────┐          ┌───────────────┐ │
│   │   │ AI Message │           │ Extracted    │          │ Gap           │ │
│   │   │ added      │           │ Requirements │          │ Suggestions   │ │
│   │   └────────────┘           └──────────────┘          └───────────────┘ │
│   │                                   │                                    │
│   │                                   ▼                                    │
│   │                         ┌──────────────────────────────────────────┐   │
│   │                         │         REQUIREMENTS SIDEBAR              │   │
│   │                         │  ┌──────────────────────────────────────┐ │   │
│   │                         │  │ CategorySection (Authentication)    │ │   │
│   │                         │  │   ├─ RequirementCard                │ │   │
│   │                         │  │   ├─ RequirementCard                │ │   │
│   │                         │  │   └─ RequirementCard                │ │   │
│   │                         │  │ CategorySection (Data Model)        │ │   │
│   │                         │  │   └─ RequirementCard                │ │   │
│   │                         │  └──────────────────────────────────────┘ │   │
│   │                         └──────────────────────────────────────────┘   │
│   │                                                                        │
│   └────────────────────────────────────────────────────────────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Message Flow Sequence

```
1. User types in ChatInput → inputValue state updates
2. User clicks Send → sendMessage() action
3. sendingMessage = true → ChatInput disabled, show spinner
4. Optimistic add: user message to messages array
5. API: interview:sendMessage → backend processes
6. Backend: InterviewEngine.processMessage()
7. Backend: RequirementExtractor extracts requirements
8. IPC: interview:requirement-captured events (one per requirement)
9. IPC: Response returns with AI message + suggestions
10. Store: Add AI message, update requirements
11. sendingMessage = false → ChatInput enabled
```

### Loading & Error States

| State | UI Behavior |
|-------|-------------|
| `loadingSession` | Full page skeleton |
| `sendingMessage` | Input disabled, spinner in send button |
| `isTyping` | Typing indicator in chat |
| `completing` | Modal with progress |
| `error` | Toast notification + retry option |

---

## Tasks/Kanban Page

### Purpose
Visual task management with drag-and-drop, agent assignments, and real-time status updates.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Task list | `tasks:getByProject` | Query | On load + events |
| Task details | `tasks:getById` | Query | On select |
| Dependencies | `tasks:getDependencies` | Query | On load |
| Agent assignments | `agents:getAssignments` | Query | On load + events |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('tasks:getByProject', projectId)    → Task[]
window.nexus.invoke('tasks:getById', taskId)            → Task
window.nexus.invoke('tasks:create', taskData)           → Task
window.nexus.invoke('tasks:update', taskId, updates)    → Task
window.nexus.invoke('tasks:moveToColumn', taskId, col)  → void

// Events
window.nexus.on('task:created')                         → { task }
window.nexus.on('task:started')                         → { taskId, agentId }
window.nexus.on('task:progress')                        → { taskId, progress, message }
window.nexus.on('task:completed')                       → { taskId, result }
window.nexus.on('task:failed')                          → { taskId, error }
window.nexus.on('task:qa-iteration')                    → { taskId, iteration, result }
```

### State Management

```typescript
// src/renderer/src/stores/taskStore.ts
interface TaskState {
  // Data organized by column
  columns: {
    planned: Task[];
    in_progress: Task[];
    in_review: Task[];
    complete: Task[];
  };

  // All tasks flat
  tasksById: Record<string, Task>;

  // Selection
  selectedTaskId: string | null;
  taskDetailOpen: boolean;

  // Filters
  agentFilter: AgentType | null;
  priorityFilter: TaskPriority | null;
  searchQuery: string;

  // Drag state
  draggedTaskId: string | null;
  dropTargetColumn: ColumnId | null;

  // Loading
  loading: boolean;
  error: string | null;

  // Actions
  loadTasks: (projectId: string) => Promise<void>;
  selectTask: (taskId: string | null) => void;
  moveTask: (taskId: string, toColumn: ColumnId) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setDragState: (taskId: string | null, column: ColumnId | null) => void;
  applyFilters: () => Task[];
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KANBAN PAGE DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                        INITIAL LOAD                                   │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌────────────────┐                      ┌────────────────────────────┐   │
│   │  Page Mount    │─────────────────────►│ loadTasks(projectId)       │   │
│   │  (projectId)   │                      └───────────┬────────────────┘   │
│   └────────────────┘                                  │                    │
│                                                       ▼                    │
│                                          ┌────────────────────────────┐    │
│                                          │ tasks:getByProject         │    │
│                                          └───────────┬────────────────┘    │
│                                                      │                     │
│                              ┌───────────────────────┼────────────────┐    │
│                              ▼                       ▼                ▼    │
│                       ┌────────────┐         ┌────────────┐   ┌──────────┐ │
│                       │ Planned    │         │In Progress │   │ Complete │ │
│                       │ Column     │         │ Column     │   │ Column   │ │
│                       └────────────┘         └────────────┘   └──────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                        DRAG & DROP FLOW                               │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────┐ │
│   │ dragStart      │─►│ setDragState   │─►│ Visual         │─►│ dragEnd  │ │
│   │ (taskId)       │  │ (id, null)     │  │ feedback       │  │          │ │
│   └────────────────┘  └────────────────┘  └────────────────┘  └────┬─────┘ │
│                                                                     │      │
│                       ┌─────────────────────────────────────────────┘      │
│                       ▼                                                    │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │ moveTask(taskId, toColumn)                                        │    │
│   │  1. Optimistic: Update columns state                              │    │
│   │  2. API: tasks:moveToColumn                                       │    │
│   │  3. On error: Rollback to previous state                          │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                     REAL-TIME TASK UPDATES                            │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│   │ task:started    │  │ task:progress   │  │ task:completed/failed       │ │
│   │                 │  │                 │  │                             │ │
│   │ → Move to       │  │ → Update card   │  │ → Move to complete/show err │ │
│   │   in_progress   │  │   progress bar  │  │ → Update QA iteration count │ │
│   │ → Show agent    │  │ → Show message  │  │                             │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Task Card Updates

| Event | Card Update |
|-------|-------------|
| `task:started` | Move to "In Progress", show agent badge, animate |
| `task:progress` | Update progress bar, show message tooltip |
| `task:qa-iteration` | Update iteration counter badge |
| `task:completed` | Move to "Complete", success animation |
| `task:failed` | Show error indicator, escalation badge if applicable |
| `task:blocked` | Show blocked icon, dependency info |

---

## Agents Page

### Purpose
Real-time monitoring of AI agent activity with live output streaming.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Agent pool | `agents:getPoolStatus` | Query | On load + events |
| Agent details | `agents:getById` | Query | On select |
| Agent output | `agent:progress` events | Stream | Real-time |
| QA status | `qa:*` events | Stream | Real-time |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('agents:getPoolStatus')             → PoolStatus
window.nexus.invoke('agents:getById', agentId)          → AgentData
window.nexus.invoke('agents:getOutput', agentId)        → string[]
window.nexus.invoke('agents:pause', agentId)            → void
window.nexus.invoke('agents:resume', agentId)           → void
window.nexus.invoke('agents:pauseAll')                  → void

// Events
window.nexus.on('agent:spawned')                        → { agent }
window.nexus.on('agent:assigned')                       → { agentId, taskId, worktreePath }
window.nexus.on('agent:progress')                       → { agentId, action, details }
window.nexus.on('agent:idle')                           → { agentId }
window.nexus.on('agent:error')                          → { agentId, error }
window.nexus.on('agent:terminated')                     → { agentId, reason }
window.nexus.on('agent:metrics-updated')                → { agentId, metrics }
window.nexus.on('qa:build-started')                     → { taskId, iteration }
window.nexus.on('qa:build-completed')                   → { taskId, passed, errors }
window.nexus.on('qa:lint-completed')                    → { taskId, passed, errors }
window.nexus.on('qa:test-completed')                    → { taskId, passed, counts }
window.nexus.on('qa:review-completed')                  → { taskId, approved }
```

### State Management

```typescript
// src/renderer/src/stores/agentStore.ts
interface AgentState {
  // Pool status
  agents: AgentData[];
  agentsByType: Record<AgentType, AgentData[]>;
  maxAgents: number;

  // Selection
  selectedAgentId: string | null;

  // Live output (per agent)
  output: Record<string, string[]>;
  outputBuffers: Record<string, string[]>; // For batching

  // QA status (per task)
  qaStatus: Record<string, QAStep[]>;

  // Loading
  loading: boolean;
  error: string | null;

  // Actions
  loadPool: () => Promise<void>;
  selectAgent: (agentId: string | null) => void;
  appendOutput: (agentId: string, line: string) => void;
  clearOutput: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<AgentData>) => void;
  updateQAStep: (taskId: string, step: QAStep) => void;
  pauseAgent: (agentId: string) => Promise<void>;
  pauseAll: () => Promise<void>;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGENTS PAGE DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    AGENT POOL STATUS BAR                              │ │
│   │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │ │
│   │   │Planner │ │ Coder  │ │ Tester │ │Reviewer│ │ Merger │            │ │
│   │   │  ●     │ │   ●    │ │   ○    │ │   ●    │ │   ○    │            │ │
│   │   │ Idle   │ │Working │ │ Idle   │ │Working │ │ Idle   │            │ │
│   │   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘            │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                      agent:spawned/terminated events                        │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────┐  ┌────────────────────────────────────┐  │
│   │      ACTIVE AGENTS          │  │       AGENT DETAILS PANEL          │  │
│   │  (Working agents list)      │  │                                    │  │
│   │                             │  │  Agent: Coder                      │  │
│   │  ┌───────────────────────┐  │  │  Model: claude-sonnet-4-5          │  │
│   │  │ 🔵 Coder             │◄─┼──┤  Task: Auth middleware              │  │
│   │  │ Auth middleware      │  │  │  Iteration: 3 / 50                  │  │
│   │  │ ████████░░ 75%       │  │  │                                    │  │
│   │  │ Iteration: 3/50      │  │  │  QA Status:                        │  │
│   │  └───────────────────────┘  │  │  [Build ✓] [Lint ✓] [Test ◌] [Rev]│  │
│   │                             │  │                                    │  │
│   │  ┌───────────────────────┐  │  │  Live Output:                     │  │
│   │  │ 🟢 Reviewer          │  │  │  ┌────────────────────────────────┐│  │
│   │  │ Database schema      │  │  │  │ Creating authMiddleware.ts... ││  │
│   │  │ Analyzing...         │  │  │  │ Adding JWT validation...      ││  │
│   │  └───────────────────────┘  │  │  │ Implementing refresh tokens...││  │
│   │                             │  │  │ Running type check...         ││  │
│   │  (Click to select)          │  │  │ ✓ No TypeScript errors        ││  │
│   │                             │  │  └────────────────────────────────┘│  │
│   └──────────────┬──────────────┘  └───────────────────────────────────┘  │
│                  │                                   ▲                     │
│                  │                                   │                     │
│   ┌──────────────┴─────────────────────────────────────────────────────┐  │
│   │                    REAL-TIME EVENT STREAMING                        │  │
│   │                                                                     │  │
│   │   agent:assigned ────► updateAgent(status: 'working')              │  │
│   │   agent:progress ────► appendOutput(line) ────► Terminal component │  │
│   │   agent:idle     ────► updateAgent(status: 'idle')                 │  │
│   │   agent:error    ────► updateAgent(status: 'error', error)         │  │
│   │                                                                     │  │
│   │   qa:build-completed ────► updateQAStep('build', result)           │  │
│   │   qa:lint-completed  ────► updateQAStep('lint', result)            │  │
│   │   qa:test-completed  ────► updateQAStep('test', result)            │  │
│   │   qa:review-completed ───► updateQAStep('review', result)          │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Output Streaming Strategy

```typescript
// Batch output updates for performance
const OUTPUT_BATCH_INTERVAL = 50; // ms

// In agentStore
appendOutput: (agentId: string, line: string) => {
  set((state) => ({
    outputBuffers: {
      ...state.outputBuffers,
      [agentId]: [...(state.outputBuffers[agentId] || []), line],
    },
  }));

  // Debounced flush
  scheduleFlush(agentId);
};

flushOutput: (agentId: string) => {
  set((state) => {
    const buffer = state.outputBuffers[agentId] || [];
    return {
      output: {
        ...state.output,
        [agentId]: [...(state.output[agentId] || []), ...buffer].slice(-1000), // Keep last 1000 lines
      },
      outputBuffers: {
        ...state.outputBuffers,
        [agentId]: [],
      },
    };
  });
};
```

---

## Execution Page

### Purpose
Detailed view of build, lint, test, and review execution with logs and results.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Current task | `tasks:getCurrent` | Query | On load |
| Build output | `execution:getBuildLog` | Query + Stream | Real-time |
| Lint output | `execution:getLintLog` | Query + Stream | Real-time |
| Test results | `execution:getTestResults` | Query + Stream | Real-time |
| Review output | `execution:getReviewLog` | Query + Stream | Real-time |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('execution:getCurrentTask')         → { task, logs }
window.nexus.invoke('execution:getBuildLog', taskId)    → BuildLog
window.nexus.invoke('execution:getLintLog', taskId)     → LintLog
window.nexus.invoke('execution:getTestResults', taskId) → TestResults
window.nexus.invoke('execution:getReviewLog', taskId)   → ReviewLog
window.nexus.invoke('execution:clearLogs')              → void

// Events (same as agents page QA events)
window.nexus.on('qa:build-started')                     → { taskId }
window.nexus.on('qa:build-completed')                   → { taskId, passed, output }
window.nexus.on('qa:lint-completed')                    → { taskId, passed, output }
window.nexus.on('qa:test-completed')                    → { taskId, passed, results }
window.nexus.on('qa:review-completed')                  → { taskId, approved, output }
```

### State Management

```typescript
// src/renderer/src/stores/executionStore.ts
interface ExecutionState {
  // Current context
  currentTaskId: string | null;
  currentTask: Task | null;

  // Active tab
  activeTab: 'build' | 'lint' | 'test' | 'review';

  // Logs per tab
  buildLog: {
    status: 'idle' | 'running' | 'success' | 'error';
    output: string;
    duration?: number;
    timestamp?: Date;
  };
  lintLog: {
    status: 'idle' | 'running' | 'success' | 'error';
    output: string;
    errorCount: number;
    warningCount: number;
    duration?: number;
  };
  testResults: {
    status: 'idle' | 'running' | 'success' | 'error';
    output: string;
    passed: number;
    failed: number;
    skipped: number;
    suites: TestSuite[];
    duration?: number;
  };
  reviewLog: {
    status: 'idle' | 'running' | 'success' | 'error';
    output: string;
    approved: boolean;
    issueCount: number;
    duration?: number;
  };

  // Actions
  setActiveTab: (tab: 'build' | 'lint' | 'test' | 'review') => void;
  loadExecutionState: (taskId: string) => Promise<void>;
  appendLog: (type: 'build' | 'lint' | 'test' | 'review', line: string) => void;
  updateStatus: (type: 'build' | 'lint' | 'test' | 'review', status: string, result?: any) => void;
  clearLogs: () => void;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXECUTION PAGE DATA FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  TAB BAR:   [Build ✓]  [Lint ✓]  [Test ●]  [Review ○]                │ │
│   │                                      ▲                                │ │
│   │                         activeTab state                               │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  TAB CONTENT (based on activeTab)                                     │ │
│   │                                                                       │ │
│   │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│   │  │ TEST TAB                                     Status: Running ●   │ │ │
│   │  │                                                                  │ │ │
│   │  │  Summary:                                                        │ │ │
│   │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │ │ │
│   │  │  │ Passed: 47  │ │ Failed: 2   │ │ Skipped: 3  │                │ │ │
│   │  │  └─────────────┘ └─────────────┘ └─────────────┘                │ │ │
│   │  │                                                                  │ │ │
│   │  │  Test Suites:                                                    │ │ │
│   │  │  ┌──────────────────────────────────────────────────────────┐   │ │ │
│   │  │  │ ✓ auth/middleware.test.ts (8 tests) - 1.2s               │   │ │ │
│   │  │  │   ✓ should validate JWT                                   │   │ │ │
│   │  │  │   ✓ should handle expired tokens                          │   │ │ │
│   │  │  │   ✗ should refresh token on expiry                        │   │ │ │
│   │  │  │      Error: Expected 200, got 401                         │   │ │ │
│   │  │  │ ✓ auth/jwt.test.ts (10 tests) - 0.8s                      │   │ │ │
│   │  │  └──────────────────────────────────────────────────────────┘   │ │ │
│   │  │                                                                  │ │ │
│   │  │  Raw Output:                                                     │ │ │
│   │  │  ┌──────────────────────────────────────────────────────────┐   │ │ │
│   │  │  │ $ vitest run                                             │   │ │ │
│   │  │  │ ✓ auth/middleware.test.ts (8)                            │   │ │ │
│   │  │  │ ✓ auth/jwt.test.ts (10)                                  │   │ │ │
│   │  │  │ ...                                                       │   │ │ │
│   │  │  └──────────────────────────────────────────────────────────┘   │ │ │
│   │  └─────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    REAL-TIME QA EVENTS                                │ │
│   │                                                                       │ │
│   │   qa:build-started  ─►  buildLog.status = 'running'                  │ │
│   │                         Tab shows spinner                             │ │
│   │                                                                       │ │
│   │   qa:build-completed ─► buildLog = { status, output, duration }      │ │
│   │                         Tab shows ✓ or ✗                              │ │
│   │                                                                       │ │
│   │   qa:test-completed  ─► testResults = { status, suites, counts }     │ │
│   │                         Parse test output into structured results     │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Settings Page

### Purpose
Configure all Nexus settings including LLM providers, agents, checkpoints, and UI preferences.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| All settings | `settings:getAll` | Query | On load |
| CLI status | `settings:checkCLI` | Query | On load |
| Model lists | Local constants | Static | Never |
| Has API keys | `settings:hasKeys` | Query | On load |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('settings:getAll')                  → NexusSettings
window.nexus.invoke('settings:checkCLI')                → { claude: boolean, gemini: boolean }
window.nexus.invoke('settings:hasKeys')                 → { claude: boolean, gemini: boolean }
window.nexus.invoke('settings:update', updates)         → void
window.nexus.invoke('settings:setClaaudeKey', key)      → void
window.nexus.invoke('settings:setGeminiKey', key)       → void
window.nexus.invoke('settings:resetDefaults')           → void

// No real-time events for settings (user-initiated changes only)
```

### State Management

```typescript
// Uses existing settingsStore with additions
interface SettingsState {
  // Settings data (already defined in COMPONENT_PROPS_STATES.md)
  claude: LLMProviderConfig;
  gemini: LLMProviderConfig;
  embeddings: EmbeddingsConfig;
  agentPool: AgentPoolConfig;
  agentModels: AgentModelConfig;
  ui: UIConfig;

  // CLI detection
  cliStatus: {
    claude: boolean;
    gemini: boolean;
  };

  // Key status (never store actual keys in frontend)
  hasKeys: {
    claude: boolean;
    gemini: boolean;
  };

  // Form state
  isDirty: boolean;
  saving: boolean;
  loading: boolean;
  error: string | null;

  // Active tab
  activeTab: 'llm' | 'agents' | 'checkpoints' | 'ui' | 'projects';

  // Actions
  loadSettings: () => Promise<void>;
  updateSetting: (path: string, value: any) => void;
  saveSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  setClaudeKey: (key: string) => Promise<void>;
  setGeminiKey: (key: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTINGS PAGE DATA FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  TAB BAR:   [LLM Providers]  [Agents]  [Checkpoints]  [UI]  [Projects]│ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  LLM PROVIDERS TAB                                                    │ │
│   │                                                                       │ │
│   │  ┌───────────────────────────────────────────────────────────────┐   │ │
│   │  │  CLAUDE CONFIGURATION                                          │   │ │
│   │  │                                                                │   │ │
│   │  │  Backend: [● CLI] [○ API]         CLI Status: ✓ Detected      │   │ │
│   │  │           │                                                    │   │ │
│   │  │           └──► updateSetting('claude.backend', value)         │   │ │
│   │  │                                                                │   │ │
│   │  │  Model: ┌──────────────────────────────────────────────────┐  │   │ │
│   │  │         │ claude-sonnet-4-5-20250929                    ▼ │  │   │ │
│   │  │         └──────────────────────────────────────────────────┘  │   │ │
│   │  │         │                                                      │   │ │
│   │  │         └──► updateSetting('claude.model', value)             │   │ │
│   │  │               Model list from: getClaudeModelList()           │   │ │
│   │  │                                                                │   │ │
│   │  │  API Key: [••••••••••••••••] [Set] [Clear]                    │   │ │
│   │  │           │                                                    │   │ │
│   │  │           └──► setClaudeKey(key) → IPC → safeStorage          │   │ │
│   │  │                                                                │   │ │
│   │  └───────────────────────────────────────────────────────────────┘   │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  AGENTS TAB                                                           │ │
│   │                                                                       │ │
│   │  ┌───────────────────────────────────────────────────────────────┐   │ │
│   │  │  AGENT MODEL ASSIGNMENTS                                       │   │ │
│   │  │                                                                │   │ │
│   │  │  ┌──────────┬───────────┬─────────────────────────────────┐   │   │ │
│   │  │  │ Agent    │ Provider  │ Model                           │   │   │ │
│   │  │  ├──────────┼───────────┼─────────────────────────────────┤   │   │ │
│   │  │  │ Planner  │ [Claude▼] │ [claude-opus-4-5-20251101   ▼]  │   │   │ │
│   │  │  │ Coder    │ [Claude▼] │ [claude-sonnet-4-5-20250929 ▼]  │   │   │ │
│   │  │  │ Tester   │ [Gemini▼] │ [gemini-2.5-flash           ▼]  │   │   │ │
│   │  │  │ Reviewer │ [Gemini▼] │ [gemini-2.5-pro             ▼]  │   │   │ │
│   │  │  └──────────┴───────────┴─────────────────────────────────┘   │   │ │
│   │  │                                                                │   │ │
│   │  │  Change: updateAgentModel(agentType, provider, model)         │   │ │
│   │  │                                                                │   │ │
│   │  └───────────────────────────────────────────────────────────────┘   │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  SAVE FLOW                                                            │ │
│   │                                                                       │ │
│   │  Change detected ─► isDirty = true ─► Enable Save button             │ │
│   │                                                                       │ │
│   │  Save clicked ─► saveSettings() ─► settings:update IPC               │ │
│   │              ─► saving = true ─► Show spinner                        │ │
│   │              ─► On success: isDirty = false, toast.success()         │ │
│   │              ─► On error: toast.error(), keep isDirty = true         │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation Rules

| Field | Validation |
|-------|------------|
| API Key | Min 20 chars, starts with correct prefix |
| Timeout | 1000 - 600000 ms |
| Max Retries | 0 - 10 |
| Max Agents | 1 - 20 |
| QA Iteration Limit | 1 - 100 |
| Task Time Limit | 1 - 120 minutes |

---

## Memory Page (Optional)

### Purpose
Display what Nexus has learned about the project - repository structure, patterns, and semantic context.

### Data Sources

| Data | Source | Type | Refresh |
|------|--------|------|---------|
| Repo map | `memory:getRepoMap` | Query | On load |
| Episodes | `memory:getEpisodes` | Query | On load |
| Patterns | `memory:getPatterns` | Query | On load |
| Semantic search | `memory:search` | Query | On search |

### IPC Channels

```typescript
// Queries
window.nexus.invoke('memory:getRepoMap', projectId)     → RepoMap
window.nexus.invoke('memory:getEpisodes', projectId)    → Episode[]
window.nexus.invoke('memory:getPatterns', projectId)    → Pattern[]
window.nexus.invoke('memory:search', query)             → SearchResult[]
window.nexus.invoke('memory:refresh', projectId)        → void
```

---

## Global Data Flow

### Application-Wide Event Subscriptions

These events should be subscribed to at the app root level:

```typescript
// src/renderer/src/App.tsx or equivalent root component

useEffect(() => {
  // Global error handling
  const unsubError = window.nexus.on('system:error', ({ component, error, recoverable }) => {
    if (recoverable) {
      toast.error(`Error in ${component}: ${error}`);
    } else {
      // Show error boundary
      setFatalError({ component, error });
    }
  });

  // Global warnings
  const unsubWarn = window.nexus.on('system:warning', ({ message }) => {
    toast.warning(message);
  });

  // Human review notifications (global)
  const unsubReview = window.nexus.on('review:requested', ({ reviewId, reason }) => {
    toast.info(`Human review requested: ${reason}`, {
      action: { label: 'View', onClick: () => navigate('/reviews/' + reviewId) },
      duration: 0, // Don't auto-dismiss
    });
  });

  // Checkpoint notifications
  const unsubCheckpoint = window.nexus.on('system:checkpoint-created', ({ checkpointId }) => {
    toast.success('Checkpoint created', { duration: 2000 });
  });

  return () => {
    unsubError();
    unsubWarn();
    unsubReview();
    unsubCheckpoint();
  };
}, []);
```

### Navigation-Based Data Loading

```typescript
// Route configuration with data preloading
const routes = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    loader: () => useDashboardStore.getState().loadDashboard(),
  },
  {
    path: '/projects/:projectId/interview',
    element: <InterviewPage />,
    loader: ({ params }) => useInterviewStore.getState().loadSession(params.projectId),
  },
  {
    path: '/projects/:projectId/tasks',
    element: <TasksPage />,
    loader: ({ params }) => useTaskStore.getState().loadTasks(params.projectId),
  },
  {
    path: '/projects/:projectId/agents',
    element: <AgentsPage />,
    loader: () => useAgentStore.getState().loadPool(),
  },
  {
    path: '/projects/:projectId/execution',
    element: <ExecutionPage />,
    loader: ({ params }) => useExecutionStore.getState().loadExecutionState(params.projectId),
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    loader: () => useSettingsStore.getState().loadSettings(),
  },
];
```

### Cross-Page State Synchronization

When an action on one page affects data on another:

```typescript
// Example: Task completion affects Dashboard stats
// In taskStore
completeTask: async (taskId: string) => {
  const result = await window.nexus.invoke('tasks:complete', taskId);

  // Update local task state
  set((state) => ({
    tasksById: {
      ...state.tasksById,
      [taskId]: { ...state.tasksById[taskId], status: 'complete' },
    },
  }));

  // Notify dashboard store to update stats
  useDashboardStore.getState().incrementTasksCompleted();
};
```

### Connection Status Handling

```typescript
// src/renderer/src/hooks/useConnectionStatus.ts
export function useConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  useEffect(() => {
    const handleDisconnect = () => {
      setStatus('disconnected');
      toast.error('Connection lost. Attempting to reconnect...');
    };

    const handleReconnect = () => {
      setStatus('connected');
      toast.success('Connection restored');
      // Refresh data on all active pages
      refreshActiveStores();
    };

    window.nexus.on('connection:lost', handleDisconnect);
    window.nexus.on('connection:restored', handleReconnect);

    return () => {
      window.nexus.off('connection:lost', handleDisconnect);
      window.nexus.off('connection:restored', handleReconnect);
    };
  }, []);

  return status;
}
```

---

## Summary

### Data Flow by Page

| Page | Initial Load | Real-time Updates | Key Events |
|------|--------------|-------------------|------------|
| Dashboard | Projects, Stats, Pool | Yes (all activity) | project:*, task:*, agent:* |
| Interview | Session, Messages, Requirements | Yes (requirements) | interview:* |
| Tasks | Task list, Dependencies | Yes (task status) | task:* |
| Agents | Pool status | Yes (high frequency) | agent:*, qa:* |
| Execution | Logs, Results | Yes (streaming) | qa:* |
| Settings | All settings | No | None |
| Memory | Repo map, Episodes | No | None |

### State Management Strategy

- **Zustand stores** for cross-component state
- **Local state** for component-specific UI state
- **Event subscriptions** for real-time updates
- **Optimistic updates** for responsive UI
- **Error boundaries** for graceful failures

### Performance Considerations

1. **Batch updates** for high-frequency events (agent output)
2. **Virtualized lists** for large data sets (tasks, logs)
3. **Lazy loading** for secondary data
4. **Memoization** for expensive computations
5. **Debouncing** for search/filter inputs

---

*Document created for Phase 17: Nexus UI Complete Redesign*
*Version 1.0*
