# Master Backend Connection Map - Phase 17B

## Overview

This document provides a comprehensive mapping of each UI component to its backend data source, showing current status and required changes.

---

## Page: Dashboard

### Component: Stats Cards (OverviewCards)

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Progress % | `overview.completedTasks / totalTasks` | **Connected** via getDashboardMetrics | OK |
| Features count | `overview.completedFeatures / totalFeatures` | **Connected** | OK |
| Active Agents | `overview.activeAgents` | **Connected** | OK |
| Active Projects | `projects.filter(p => p.status !== 'completed')` | **Uses demo** | Wire to real |

### Component: Recent Projects List

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Project cards | `getProjects()` | **Partial** - Falls back to demoProjects | Remove fallback |
| New Project button | `createProject()` | **NOT WIRED** | Wire handler |
| Project navigation | Router to `/project/:id` | OK | - |

### Component: Cost Tracker

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Total cost | `costs.totalCost` | **Connected** via getDashboardCosts | OK |
| Token usage | `costs.totalTokensUsed` | **Connected** | OK |
| Model breakdown | `costs.breakdownByModel` | **Connected** | OK |

### Component: Agent Activity

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Agent list | `agents` from store | **Partial** - Uses demo on empty | Remove fallback |
| Agent status | Real-time via onAgentStatusUpdate | **Connected** | OK |
| Current task | `agent.currentTask` | **Connected** | OK |

### Component: Progress Chart

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Historical data | `demoData.chartData` | **MOCK ONLY** | Add handler |
| Real-time point | Should update on task:completed | **NOT CONNECTED** | Wire event |

### Component: Task Timeline

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Timeline events | Real-time via onTimelineEvent | **Connected** | OK |
| Historical events | Demo data on mount | **MOCK** | Fetch real history |

---

## Page: Interview

### Component: Chat Panel

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Messages | Interview store + backend | **Partial** | Verify LLM connection |
| Send message | `interview.sendMessage()` | **Connected** | OK |
| AI responses | InterviewEngine | **Partial** - Has demo fallback | Remove fallback |
| Typing indicator | Local state | OK | - |

### Component: Requirements Sidebar

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Requirements list | Interview store | **Connected** locally | OK |
| Category grouping | Computed from requirements | OK | - |
| Edit requirement | Store update | OK | - |

### Component: Stage Progress

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Progress percentage | `requirements.length / target` | **Hardcoded target** | Get from backend |
| Stage indicator | Local state | OK | - |

### Component: Header Actions

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Save Draft | `interview.saveDraft()` | **Connected** | OK |
| Complete | Navigate + future backend call | **Partial** | Wire to complete handler |
| Export | Not visible | Add export button | - |

---

## Page: Kanban/Tasks

### Component: Kanban Board

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Feature cards | `getFeatures()` | **Partial** - Falls back to DEMO_FEATURES | Remove fallback |
| Column grouping | Computed from features | OK | - |
| WIP limits | Hardcoded in KanbanColumn | **MOCK** | Get from settings |

### Component: Kanban Header

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Project name | Hardcoded "Nexus" | **MOCK** | Get from project |
| Search | Local filter | OK | - |
| Add Feature | `createFeature()` | **NOT WIRED** | Wire handler |

### Component: Feature Card

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Title/description | Feature data | **Connected** | OK |
| Progress bar | `feature.progress` | **Connected** | OK |
| Agent badge | `feature.assignedAgent` | **Connected** | OK |
| Task count | `feature.tasks.length` | **Connected** | OK |

### Component: Feature Detail Modal

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Full details | Feature from store | **Connected** | OK |
| Edit fields | `updateFeature()` | **Partial** - Store only | Sync to backend |
| Delete button | `deleteFeature()` | **MISSING** | Add UI + wire |
| Task list | `feature.tasks` | **Connected** | OK |

### Drag & Drop

| Action | Handler | Current Status | Fix |
|--------|---------|----------------|-----|
| Move feature | `updateFeature(id, { status })` | **Connected** | OK |
| Reorder in column | Local state | **NOT PERSISTED** | Add sort order |

---

## Page: Agents

### Component: Agent Pool Status

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Pool visualization | Calculated from agents | **Local calc** | Use getPoolStatus |
| Max agents | Hardcoded 10 | **MOCK** | Get from settings |
| Agent type counts | Calculated | OK | - |

### Component: Agent Cards

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Agent list | `getAgents()` | **Partial** - Falls back to mock | Remove fallback |
| Status badge | `agent.status` | **Connected** | OK |
| Model name | `agent.model` | **Connected** | OK |
| Current task | `agent.currentTask` | **Connected** | OK |
| Iteration counter | `agent.iteration` | **Connected** | OK |
| Token usage | `agent.metrics.tokensUsed` | **Connected** | OK |

### Component: Agent Activity (Output Stream)

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Log lines | `getAgentOutput(id)` | **Partial** - Falls back to mock | Remove fallback |
| Real-time stream | `onAgentOutput` | **Connected** | OK |
| Auto-scroll | Local behavior | OK | - |

### Component: QA Status Panel

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Step statuses | `getQAStatus()` | **Partial** - Falls back to mock | Remove fallback |
| Real-time updates | `onQAStatusUpdate` | **Connected** | OK |
| Iteration counter | `qaStatus.iteration / max` | **Connected** | OK |
| Duration | `step.duration` | **Connected** | OK |

### Component: Header Actions

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Refresh button | `loadRealData()` | **Connected** | OK |
| Pause/Resume | `pauseExecution()` | **Connected** | OK |

---

## Page: Execution

### Component: Tab Navigation

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Tab list | `getExecutionStatus().steps` | **Partial** - Falls back to mock | Remove fallback |
| Tab status icons | `step.status` | **Connected** | OK |
| Tab counts | `step.count` | **Connected** | OK |
| Tab durations | `step.duration` | **Connected** | OK |

### Component: Log Viewer

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Log lines | `step.logs` from getExecutionStatus | **Partial** - Falls back to mock | Remove fallback |
| Real-time stream | `onExecutionLogUpdate` | **Connected** | OK |
| Syntax highlighting | Local styling | OK | - |
| Line numbers | Local computation | OK | - |

### Component: Summary Bar

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Step indicators | From tabs state | **Connected** | OK |
| Total duration | Computed from tabs | **Connected** | OK |

### Component: Header Actions

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Clear button | `clearExecutionLogs()` | **Connected** | OK |
| Export button | `exportExecutionLogs()` | **Connected** | OK |
| Current task name | `status.currentTaskName` | **Connected** | OK |

---

## Page: Settings

### Component: LLM Providers Tab

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Claude backend toggle | `settings.llm.claude.backend` | **Connected** | OK |
| Claude model dropdown | `getClaudeModelList()` | **Local models.ts** | OK |
| Claude API key | `settings.setApiKey('claude')` | **Connected** | OK |
| Gemini backend toggle | `settings.llm.gemini.backend` | **Connected** | OK |
| Gemini model dropdown | `getGeminiModelList()` | **Local models.ts** | OK |
| Gemini API key | `settings.setApiKey('gemini')` | **Connected** | OK |

### Component: Agents Tab

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Max parallel agents | `settings.agents.maxParallelAgents` | **Connected** | OK |
| Task timeout | `settings.agents.taskTimeoutMinutes` | **Connected** | OK |
| Per-agent models | `settings.agentModels` | **MISSING in settings** | Add to schema |

### Component: Checkpoints Tab

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Auto-checkpoint toggle | `settings.checkpoints.autoCheckpointEnabled` | **Connected** | OK |
| Interval | `settings.checkpoints.autoCheckpointIntervalMinutes` | **Connected** | OK |
| Max to keep | `settings.checkpoints.maxCheckpointsToKeep` | **Connected** | OK |

### Component: UI Tab

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Theme selector | `settings.ui.theme` | **Connected** | OK |
| Sidebar width | `settings.ui.sidebarWidth` | **Connected** | OK |
| Notifications | `settings.ui.showNotifications` | **Connected** | OK |

### Component: Projects Tab

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Default language | `settings.project.defaultLanguage` | **Connected** | OK |
| Test framework | `settings.project.defaultTestFramework` | **Connected** | OK |
| Output directory | `settings.project.outputDirectory` | **Connected** | OK |

### Component: Footer Actions

| UI Element | Data Source | Current Status | Fix |
|------------|-------------|----------------|-----|
| Save button | `settings.set()` multiple | **Connected** | OK |
| Reset defaults | `settings.reset()` | **Connected** | OK |
| CLI status | Backend detection | **MOCK in demo mode** | Always check |

---

## Summary: Required Changes by Page

### Dashboard (5 changes)
1. Remove demoProjects fallback
2. Remove generateDemoData() fallback
3. Wire New Project button to createProject()
4. Add dashboard:getHistoricalProgress handler for ProgressChart
5. Fetch real timeline history on mount

### Interview (2 changes)
1. Verify ChatPanel LLM connection (remove demo mode)
2. Wire Complete button to backend

### Kanban (4 changes)
1. Remove DEMO_FEATURES fallback
2. Wire Add Feature button to createFeature()
3. Get WIP limits from settings
4. Get project name dynamically

### Agents (4 changes)
1. Remove mockAgents fallback
2. Remove mockQASteps fallback
3. Remove mockAgentOutput fallback
4. Use getPoolStatus() instead of local calculation

### Execution (1 change)
1. Remove mockTabs fallback

### Settings (2 changes)
1. Remove DEMO_SETTINGS fallback
2. Add per-agent model configuration to settings schema

---

## Implementation Priority

### Phase 1: Remove Mock Fallbacks (All Pages)
- Remove all demo/mock data constants
- Initialize with empty arrays/objects
- Add proper loading and empty states

### Phase 2: Wire Missing Handlers
- New Project button → createProject()
- Add Feature button → createFeature()
- Complete Interview button → backend

### Phase 3: Add Missing Backend Features
- dashboard:getHistoricalProgress for ProgressChart
- Per-agent model settings schema
- Real timeline history fetch

### Phase 4: Verify Real-time Events
- Test all onX event subscriptions
- Verify data flows correctly
- Test error recovery
