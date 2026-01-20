# Mock Data Audit - Phase 17B

## Overview

This document catalogs ALL mock/demo data currently in the UI that needs to be replaced with real backend connections.

## Status Legend
- **MOCK**: Contains hardcoded demo data that MUST be replaced
- **PARTIAL**: Has backend connection but falls back to mock on failure
- **CONNECTED**: Properly connected to backend (no mock fallback in production)

---

## 1. DashboardPage.tsx

**Status: PARTIAL**

### Mock Data Found

```typescript
// Lines 59-87: Demo project data
const demoProjects: DemoProject[] = [
  {
    id: 'proj-1',
    name: 'my-saas-app',
    mode: 'genesis',
    status: 'in_progress',
    progress: 80,
    activeAgents: 2,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000)
  },
  // ... more demo projects
]

// Lines 93-226: generateDemoData() function
// Creates mock: overview, agents, timeline, costs, chartData
```

### Backend Connections Present
- `window.nexusAPI.getDashboardMetrics()` - Used in `loadRealData()`
- `window.nexusAPI.getDashboardCosts()` - Used in `loadRealData()`
- `window.nexusAPI.getAgentStatus()` - Used in `loadRealData()`
- `window.nexusAPI.getProjects()` - Used in `loadRealData()`

### Event Subscriptions Present
- `onMetricsUpdate` - Real-time metrics
- `onAgentStatusUpdate` - Agent status changes
- `onTimelineEvent` - Timeline events
- `onCostUpdate` - Cost updates

### Issue
- Falls back to demo data when backend fails or returns empty
- `isDemoMode()` check means non-Electron environments use mock
- ProgressChart always uses demoData.chartData (line 668)

### Fix Required
1. Remove `demoProjects` and `generateDemoData()`
2. Show empty states instead of mock data
3. Connect ProgressChart to real historical data

---

## 2. AgentsPage.tsx

**Status: MOCK**

### Mock Data Found

```typescript
// Lines 77-130: Mock agent data
const mockAgents: AgentData[] = [
  {
    id: 'agent-1',
    type: 'coder',
    status: 'working',
    model: 'claude-sonnet-4-5-20250929',
    currentTask: { id: 'task-1', name: 'Implementing auth middleware', progress: 65 },
    // ...
  },
  // 5 mock agents total
]

// Lines 132-137: Mock QA steps
const mockQASteps: QAStep[] = [
  { type: 'build', status: 'success', duration: 2300 },
  // ...
]

// Lines 139-155: Mock agent output
const mockAgentOutput = [
  '$ Starting implementation...',
  // ...
]
```

### Backend Connections Present
- `window.nexusAPI.getAgents()` - Fetches agent list
- `window.nexusAPI.getQAStatus()` - Fetches QA pipeline status
- `window.nexusAPI.getAgentOutput(id)` - Fetches agent logs
- `window.nexusAPI.pauseExecution()` - Pause/resume control

### Event Subscriptions Present
- `onAgentStatus` - Agent status changes
- `onAgentOutput` - Streaming agent logs
- `onQAStatusUpdate` - QA status changes

### Issue
- State is INITIALIZED with mock data (lines 172-175)
- Falls back to mock if backend returns empty
- getAgentOutput falls back to mockAgentOutput (line 265)

### Fix Required
1. Initialize with empty arrays
2. Show loading state while fetching
3. Show empty state if no agents
4. Remove mock fallback

---

## 3. ExecutionPage.tsx

**Status: MOCK**

### Mock Data Found

```typescript
// Lines 66-156: Mock tabs with fake log output
const mockTabs: LogTab[] = [
  {
    id: 'build',
    label: 'Build',
    status: 'success',
    duration: 2300,
    logs: [
      '$ tsc --noEmit',
      'Compiling 47 files...',
      // ... detailed fake build output
    ]
  },
  // lint, test, review tabs all with fake logs
]
```

### Backend Connections Present
- `window.nexusAPI.getExecutionStatus()` - Fetches execution status
- `window.nexusAPI.clearExecutionLogs()` - Clears logs
- `window.nexusAPI.exportExecutionLogs()` - Exports logs

### Event Subscriptions Present
- `onExecutionLogUpdate` - Real-time log streaming
- `onExecutionStatusChange` - Status changes

### Issue
- State initialized with mockTabs (line 290)
- Falls back to mockTabs on error (line 324)
- Export shows "(Mock)" for non-Electron (line 399)

### Fix Required
1. Initialize with empty tabs
2. Show loading/empty states
3. Remove mock fallback

---

## 4. KanbanPage.tsx

**Status: PARTIAL**

### Mock Data Found

```typescript
// Lines 9-88: Demo features
const DEMO_FEATURES: Feature[] = [
  {
    id: 'feat-1',
    title: 'User Authentication System',
    description: 'Implement OAuth2 login flow...',
    status: 'backlog',
    // ...
  },
  // 6 demo features across all columns
]
```

### Backend Connections Present
- `window.nexusAPI.getFeatures()` - Fetches features
- `window.nexusAPI.updateFeature()` - Updates via store

### Event Subscriptions Present
- `onFeatureUpdate` - Feature changes
- `onTaskUpdate` - Task changes that affect features

### Issue
- Falls back to DEMO_FEATURES if no features (lines 179-181, 202-204, 210-211)
- Shows demo data on any error

### Fix Required
1. Remove DEMO_FEATURES
2. Show proper empty state for empty Kanban
3. Show error state on failure (not demo data)

---

## 5. InterviewPage.tsx

**Status: PARTIAL** (via ChatPanel.tsx)

### Mock Data Found

The InterviewPage itself doesn't have mock data, but ChatPanel.tsx does:

```typescript
// ChatPanel.tsx - Falls back to demo mode without backend
// Line 258: Fallback to demo mode without backend
```

### Backend Connections Present
- Uses `useInterviewPersistence()` hook for draft persistence
- Connects to InterviewEngine via IPC

### Issue
- ChatPanel falls back to demo mode
- No actual Claude/Gemini integration visible in ChatPanel

### Fix Required
1. Ensure ChatPanel connects to real InterviewEngine
2. Messages should come from actual LLM responses

---

## 6. SettingsPage.tsx

**Status: PARTIAL**

### Mock Data Found

```typescript
// Lines 78-132: Demo settings
const DEMO_SETTINGS: NexusSettingsPublic = {
  llm: {
    claude: { backend: 'cli', hasApiKey: false, ... },
    gemini: { backend: 'cli', hasApiKey: false, ... },
    // ...
  },
  agents: { maxParallelAgents: 4, ... },
  checkpoints: { autoCheckpointEnabled: true, ... },
  ui: { theme: 'dark', ... },
  project: { defaultLanguage: 'typescript', ... }
}
```

### Backend Connections Present
- Uses `useSettingsStore` which connects to:
  - `window.nexusAPI.settings.getAll()`
  - `window.nexusAPI.settings.set()`
  - `window.nexusAPI.settings.setApiKey()`
  - etc.

### Issue
- Uses DEMO_SETTINGS when not in Electron (line 1173)
- demoUpdateSetting updates local state, not backend
- Save button in demo mode just logs to console

### Fix Required
1. Remove DEMO_SETTINGS fallback
2. Always connect to real settings service
3. Show error if settings can't be loaded

---

## Summary Table

| Page | Mock Variables | Lines | Backend APIs Used | Fix Priority |
|------|---------------|-------|-------------------|--------------|
| DashboardPage | demoProjects, generateDemoData | 59-226 | getDashboardMetrics, getCosts, getAgentStatus, getProjects | HIGH |
| AgentsPage | mockAgents, mockQASteps, mockAgentOutput | 77-155 | getAgents, getQAStatus, getAgentOutput, pauseExecution | HIGH |
| ExecutionPage | mockTabs | 66-156 | getExecutionStatus, clearLogs, exportLogs | HIGH |
| KanbanPage | DEMO_FEATURES | 9-88 | getFeatures, updateFeature | HIGH |
| InterviewPage | (via ChatPanel) | N/A | Interview IPC | MEDIUM |
| SettingsPage | DEMO_SETTINGS | 78-132 | settings.* | MEDIUM |

---

## Required Backend Changes

### Missing IPC Handlers
None - all required handlers appear to exist in `handlers.ts`

### Missing Event Forwarding
All event forwarding appears to be set up in `setupEventForwarding()`

### Data Transformation Issues
- Backend returns `unknown` types, UI needs proper typing
- Some status mappings may need verification

---

## Action Items

1. **Remove all mock data constants** - Replace with empty arrays/objects
2. **Add proper empty states** - When no data exists
3. **Add proper error states** - When backend fails
4. **Remove isDemoMode() checks** - All pages should require backend
5. **Verify data transformations** - Backend → UI type mappings
6. **Test real-time updates** - Verify event subscriptions work
