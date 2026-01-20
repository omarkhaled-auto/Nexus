# IPC Handlers Audit - Phase 17B

## Overview

This document maps all IPC handlers (backend) to preload API methods (bridge) to UI usage (frontend).

---

## Handler → Preload → UI Mapping

### 1. Mode Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `mode:genesis` | `nexusAPI.startGenesis()` | ModeSelectorPage - Start new project |
| `mode:evolution` | `nexusAPI.startEvolution(projectId)` | ModeSelectorPage - Work on existing |

### 2. Project Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `project:get` | `nexusAPI.getProject(id)` | NOT USED in UI |
| `projects:list` | `nexusAPI.getProjects()` | DashboardPage - Recent projects list |
| `project:create` | `nexusAPI.createProject(input)` | NOT USED - New Project button has no handler |

### 3. Dashboard Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `dashboard:getMetrics` | `nexusAPI.getDashboardMetrics()` | DashboardPage - Overview cards |
| `dashboard:getCosts` | `nexusAPI.getDashboardCosts()` | DashboardPage - Cost tracker |

### 4. Task Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `tasks:list` | `nexusAPI.getTasks()` | NOT USED directly (features used instead) |
| `task:update` | `nexusAPI.updateTask(id, update)` | NOT USED directly |

### 5. Feature Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `features:list` | `nexusAPI.getFeatures()` | KanbanPage - Load features |
| `feature:get` | `nexusAPI.getFeature(id)` | NOT USED |
| `feature:create` | `nexusAPI.createFeature(input)` | NOT USED - Add Feature has no handler |
| `feature:update` | `nexusAPI.updateFeature(id, update)` | KanbanBoard - Drag & drop |
| `feature:delete` | `nexusAPI.deleteFeature(id)` | NOT USED |

### 6. Agent Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `agents:status` | `nexusAPI.getAgentStatus()` | DashboardPage - Agent activity |
| `agents:list` | `nexusAPI.getAgents()` | AgentsPage - Agent list |
| `agents:get` | `nexusAPI.getAgent(id)` | NOT USED |
| `agents:getPoolStatus` | `nexusAPI.getAgentPoolStatus()` | NOT USED - AgentsPage calculates locally |
| `agents:getOutput` | `nexusAPI.getAgentOutput(id)` | AgentsPage - Agent output stream |
| `agents:getQAStatus` | `nexusAPI.getQAStatus()` | AgentsPage - QA status panel |

### 7. Execution Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `execution:pause` | `nexusAPI.pauseExecution(reason?)` | AgentsPage - Pause/Resume button |
| `execution:getLogs` | `nexusAPI.getExecutionLogs(stepType)` | NOT USED directly |
| `execution:getStatus` | `nexusAPI.getExecutionStatus()` | ExecutionPage - All tabs |
| `execution:clearLogs` | `nexusAPI.clearExecutionLogs()` | ExecutionPage - Clear button |
| `execution:exportLogs` | `nexusAPI.exportExecutionLogs()` | ExecutionPage - Export button |

### 8. Interview Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `interview:emit-started` | `nexusAPI.emitInterviewStarted(payload)` | NOT USED |
| `interview:emit-message` | `nexusAPI.emitInterviewMessage(payload)` | NOT USED |
| `interview:emit-requirement` | `nexusAPI.emitInterviewRequirement(payload)` | NOT USED |
| `interview:emit-completed` | `nexusAPI.emitInterviewCompleted(payload)` | NOT USED |

### 9. Checkpoint Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `checkpoint:list` | `nexusAPI.checkpointList(projectId)` | CheckpointList component |
| `checkpoint:create` | `nexusAPI.checkpointCreate(projectId, reason)` | NOT USED |
| `checkpoint:restore` | `nexusAPI.checkpointRestore(checkpointId, restoreGit?)` | ReviewModal |
| `checkpoint:delete` | `nexusAPI.checkpointDelete(checkpointId)` | NOT USED |

### 10. Review Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `review:list` | `nexusAPI.reviewList()` | NOT USED |
| `review:get` | `nexusAPI.reviewGet(reviewId)` | NOT USED |
| `review:approve` | `nexusAPI.reviewApprove(reviewId, resolution?)` | ReviewModal |
| `review:reject` | `nexusAPI.reviewReject(reviewId, feedback)` | ReviewModal |

### 11. Settings Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `settings:getAll` | `nexusAPI.settings.getAll()` | SettingsPage - Load settings |
| `settings:get` | `nexusAPI.settings.get(key)` | NOT USED directly |
| `settings:set` | `nexusAPI.settings.set(key, value)` | SettingsPage - Save individual |
| `settings:setApiKey` | `nexusAPI.settings.setApiKey(provider, key)` | SettingsPage - API key inputs |
| `settings:hasApiKey` | `nexusAPI.settings.hasApiKey(provider)` | NOT USED directly |
| `settings:clearApiKey` | `nexusAPI.settings.clearApiKey(provider)` | SettingsPage - Clear key button |
| `settings:reset` | `nexusAPI.settings.reset()` | SettingsPage - Reset defaults |

### 12. Generic Event Operations

| Handler | Preload Method | UI Usage |
|---------|---------------|----------|
| `eventbus:emit` | `nexusAPI.emitEvent(channel, payload)` | NOT USED |

---

## Event Subscriptions (Preload → UI)

### Real-time Updates

| IPC Channel | Preload Method | UI Usage |
|-------------|---------------|----------|
| `task:updated` | `onTaskUpdate(callback)` | KanbanPage - Task changes |
| `agent:status` | `onAgentStatus(callback)` | AgentsPage - Status changes |
| `execution:progress` | `onExecutionProgress(callback)` | NOT USED |
| `metrics:updated` | `onMetricsUpdate(callback)` | DashboardPage - Stats update |
| `agent:metrics` | `onAgentStatusUpdate(callback)` | DashboardPage - Agent updates |
| `timeline:event` | `onTimelineEvent(callback)` | DashboardPage - Timeline |
| `costs:updated` | `onCostUpdate(callback)` | DashboardPage - Costs |
| `feature:updated` | `onFeatureUpdate(callback)` | KanbanPage - Feature changes |
| `agent:output` | `onAgentOutput(callback)` | AgentsPage - Log streaming |
| `qa:status` | `onQAStatusUpdate(callback)` | AgentsPage - QA panel |
| `execution:log` | `onExecutionLogUpdate(callback)` | ExecutionPage - Log streaming |
| `execution:status` | `onExecutionStatusChange(callback)` | ExecutionPage - Tab status |

---

## Gap Analysis

### Handlers with NO UI Usage

| Handler | Issue | Action |
|---------|-------|--------|
| `project:get` | No project detail page | Consider if needed |
| `project:create` | New Project button exists but no handler | **WIRE UP** |
| `feature:get` | Feature detail uses store | Consider for modal |
| `feature:create` | Add Feature button exists but no handler | **WIRE UP** |
| `feature:delete` | No delete button in UI | Add to FeatureDetailModal |
| `agents:get` | Not needed (using agents:list) | OK |
| `agents:getPoolStatus` | AgentsPage calculates locally | **USE THIS** |
| `execution:getLogs` | ExecutionPage uses getStatus | OK |
| `interview:emit-*` | Interview events not wired | **WIRE UP** |
| `checkpoint:create` | No create button in UI | Add to header |
| `checkpoint:delete` | No delete in CheckpointList | Add button |
| `review:list` | No review list UI | Add notification |
| `review:get` | ReviewModal could use | Consider |
| `eventbus:emit` | Generic emit not used | OK |

### Missing IPC Handlers (UI needs but backend lacks)

| Feature | UI Expectation | Handler Status |
|---------|---------------|----------------|
| Create Project | DashboardPage New Project button | EXISTS but not wired |
| Add Feature | KanbanHeader Add Feature button | EXISTS but not wired |
| Pause/Resume All | AgentsPage buttons | EXISTS and wired |
| Historical Chart Data | DashboardPage ProgressChart | **MISSING** - needs `dashboard:getHistoricalProgress` |
| Interview Send Message | ChatPanel | Uses interview-api.ts separately |

---

## Interview API (Separate File)

The interview functionality uses a separate preload: `src/preload/interview-api.ts`

| Method | Usage |
|--------|-------|
| `interview.sendMessage(message)` | ChatPanel - Send user message |
| `interview.getHistory()` | ChatPanel - Load conversation |
| `interview.startInterview()` | InterviewPage - Start session |
| `interview.endInterview()` | InterviewPage - Complete |
| `interview.exportRequirements()` | InterviewPage - Export |
| `interview.saveDraft()` | InterviewPage - Save draft |
| `interview.loadDraft()` | InterviewPage - Resume |
| `interview.clearDraft()` | InterviewPage - Start fresh |

---

## Recommended Fixes

### High Priority

1. **Wire New Project button** to `project:create`
2. **Wire Add Feature button** to `feature:create`
3. **Add historical data handler** for ProgressChart
4. **Use getPoolStatus** instead of local calculation

### Medium Priority

5. Wire interview events for analytics
6. Add checkpoint create button
7. Add feature delete option
8. Add review notification

### Low Priority

9. Consider project detail page
10. Add checkpoint delete option
