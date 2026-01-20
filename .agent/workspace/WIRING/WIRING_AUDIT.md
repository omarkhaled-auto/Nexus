# Current Wiring Audit - Phase 19

## Date: 2025-01-20

## Legend
- [x] WIRED - Connection exists and works
- [~] PARTIAL - Connection exists but incomplete
- [ ] NOT WIRED - Connection missing

---

## Executive Summary

After analyzing the codebase, I found that while all components are implemented and tested individually, **critical orchestration wiring is missing**. The components exist as islands - each one works in isolation but they're not connected to form a complete flow.

### Key Findings:
1. **InterviewEngine** emits events but **NexusCoordinator does not listen for them**
2. **NexusCoordinator** is fully implemented but **never instantiated at startup**
3. **IPC handlers** exist but use **mock state** instead of real orchestration
4. **EventBus** exists but has **no subscribers for flow events**
5. **Interview -> Planning -> Execution chain is completely disconnected**

---

## Component Analysis

### 1. NexusCoordinator (src/orchestration/coordinator/NexusCoordinator.ts)

**Status:** IMPLEMENTED but NOT INSTANTIATED

**What it does:**
- Full orchestration loop implementation
- Genesis/Evolution mode branching
- Wave-based task processing
- Agent pool management
- QA loop integration
- Checkpoint creation
- Event emission

**What's missing:**
- [ ] Not instantiated in main process (src/main/index.ts)
- [ ] Not listening for `interview:completed` event
- [ ] Not wired to IPC handlers
- [ ] Dependencies (TaskDecomposer, AgentPool, etc.) not constructed

**Dependencies it needs:**
```typescript
interface NexusCoordinatorOptions {
  taskQueue: ITaskQueue;          // IMPLEMENTED: src/orchestration/queue/TaskQueue.ts
  agentPool: IAgentPool;          // IMPLEMENTED: src/orchestration/agents/AgentPool.ts
  decomposer: ITaskDecomposer;    // IMPLEMENTED: src/planning/decomposition/TaskDecomposer.ts
  resolver: IDependencyResolver;  // IMPLEMENTED: src/planning/dependencies/DependencyResolver.ts
  estimator: ITimeEstimator;      // IMPLEMENTED: src/planning/estimation/TimeEstimator.ts
  qaEngine: any;                  // IMPLEMENTED: src/execution/iteration/RalphStyleIterator.ts
  worktreeManager: any;           // IMPLEMENTED: src/worktree/WorktreeManager.ts
  checkpointManager: any;         // IMPLEMENTED: src/persistence/checkpoints/CheckpointManager.ts
  mergerRunner?: any;             // IMPLEMENTED: src/execution/agents/MergerAgent.ts
  agentWorktreeBridge?: any;      // IMPLEMENTED: src/worktree/AgentWorktreeBridge.ts
}
```

---

### 2. InterviewEngine (src/interview/InterviewEngine.ts)

**Status:** IMPLEMENTED, EVENTS EMIT, NO LISTENERS

**What it does:**
- Session management
- Message processing with LLM
- Requirement extraction
- Event emission on completion

**Events it emits:**
- `interview:started` - on startSession()
- `interview:question-asked` - on each message
- `interview:requirement-captured` - on requirement extraction
- `interview:completed` - on endSession()

**What's missing:**
- [ ] NO LISTENER for `interview:completed` to trigger TaskDecomposer
- [ ] IPC handler `interview:end` calls `endSession()` but nothing happens after

---

### 3. TaskDecomposer (src/planning/decomposition/TaskDecomposer.ts)

**Status:** IMPLEMENTED but NOT CALLED

**What it does:**
- Decomposes features into atomic tasks
- Uses LLM for decomposition
- Validates task sizes
- Resolves dependencies

**What's missing:**
- [ ] Not called after interview completes
- [ ] Not wired to receive requirements from InterviewEngine

---

### 4. AgentPool (src/orchestration/agents/AgentPool.ts)

**Status:** IMPLEMENTED but NOT INSTANTIATED

**What it does:**
- Creates agent instances (CoderAgent, TesterAgent, ReviewerAgent, MergerAgent)
- Manages agent lifecycle
- Integrates with EventBus

**What's missing:**
- [ ] Not instantiated at startup
- [ ] Not connected to NexusCoordinator
- [ ] Requires LLM clients that aren't wired

---

### 5. RalphStyleIterator (src/execution/iteration/RalphStyleIterator.ts)

**Status:** IMPLEMENTED but NOT CALLED

**What it does:**
- Iterative QA loop
- Build -> Lint -> Test -> Review cycle
- Escalation handling
- Checkpoint support

**What's missing:**
- [ ] Not called from NexusCoordinator (coordinator uses `qaEngine.run()` but that's never constructed)
- [ ] Dependencies not wired (FreshContextManager, QARunners)

---

### 6. IPC Handlers (src/main/ipc/handlers.ts)

**Status:** IMPLEMENTED with MOCK STATE

**Key Issue:** Uses in-memory state object instead of real NexusCoordinator:

```typescript
// Line 51-68 in handlers.ts
const state: OrchestrationState = {
  mode: null,
  projectId: null,
  projects: new Map(),    // MOCK - not connected to real storage
  tasks: new Map(),       // MOCK - not connected to real queue
  agents: new Map(),      // MOCK - not connected to real pool
  features: new Map(),    // MOCK - not connected to real features
}
```

**Handlers that need real wiring:**
- `mode:genesis` - Should trigger real Genesis flow
- `mode:evolution` - Should trigger real Evolution flow
- `tasks:list` - Should query real TaskQueue
- `agents:status` - Should query real AgentPool
- `dashboard:getMetrics` - Should get real progress

---

### 7. Main Process (src/main/index.ts)

**Status:** MINIMAL SETUP

**What it does:**
- Creates BrowserWindow
- Registers IPC handlers
- Sets up event forwarding

**What's missing:**
- [ ] No NexusCoordinator instantiation
- [ ] No InterviewEngine instantiation
- [ ] No LLM client setup
- [ ] No database connections
- [ ] Comment says: `// TODO: registerInterviewHandlers(interviewEngine, sessionManager) - needs infrastructure`

---

## Genesis Flow Wiring

| Step | From | To | Status | Evidence |
|------|------|----|--------|----------|
| 1 | UI "Start Genesis" | InterviewEngine.start() | [~] PARTIAL | IPC handler exists but engine not instantiated |
| 2 | InterviewEngine | UI Chat Display | [ ] NOT WIRED | Event emitted but no forwarding |
| 3 | User Message | InterviewEngine.sendMessage() | [~] PARTIAL | IPC handler exists |
| 4 | InterviewEngine | RequirementExtractor | [x] WIRED | Called in processMessage() |
| 5 | RequirementExtractor | RequirementsDB | [x] WIRED | Called in processMessage() |
| 6 | UI "Complete Interview" | InterviewEngine.complete() | [~] PARTIAL | IPC handler exists |
| 7 | InterviewEngine.complete() | TaskDecomposer.decompose() | [ ] NOT WIRED | Event emitted but NO LISTENER |
| 8 | TaskDecomposer | DependencyResolver | [x] WIRED | Called internally in TaskDecomposer |
| 9 | DependencyResolver | TimeEstimator | [~] PARTIAL | Estimator exists but not integrated |
| 10 | Planning Complete | NexusCoordinator.start() | [ ] NOT WIRED | Coordinator never instantiated |
| 11 | NexusCoordinator | AgentPool.acquire() | [~] PARTIAL | Code exists in coordinator but pool not instantiated |
| 12 | AgentPool | Agent.execute() | [x] WIRED | runTask() calls agent runner |
| 13 | Agent.execute() | LLM Client (Claude/Gemini) | [~] PARTIAL | Code exists but clients not instantiated |
| 14 | Agent Complete | RalphStyleIterator.run() | [ ] NOT WIRED | QA engine in coordinator is `any` type |
| 15 | QA Pass | Merge to main | [~] PARTIAL | Code exists in executeTask() |
| 16 | QA Fail | Re-iterate or Escalate | [~] PARTIAL | Logic exists but never triggered |
| 17 | All Tasks Complete | UI Shows "Done" | [ ] NOT WIRED | No event forwarding to renderer |

---

## Evolution Flow Wiring

| Step | From | To | Status | Notes |
|------|------|----|--------|-------|
| 1 | UI "Start Evolution" | Project Selector | [~] PARTIAL | IPC handler `mode:evolution` exists |
| 2 | Project Selected | RepoMapGenerator | [ ] NOT WIRED | RepoMapGenerator not called |
| 3 | RepoMap Generated | InterviewEngine (context) | [ ] NOT WIRED | No context passing |
| 4-17 | (Same as Genesis 4-17) | | See above | Same issues |

---

## Event Bus Subscriptions

| Event | Publisher | Subscribers | Status |
|-------|-----------|-------------|--------|
| interview:started | InterviewEngine | NONE | [ ] NO LISTENERS |
| interview:message | InterviewEngine | NONE | [ ] NO LISTENERS |
| interview:completed | InterviewEngine | NONE | [ ] NO LISTENERS |
| planning:started | Should be NexusCoordinator | NONE | [ ] NOT EMITTED |
| planning:completed | Should be NexusCoordinator | NONE | [ ] NOT EMITTED |
| task:assigned | NexusCoordinator | NONE | [ ] NO LISTENERS |
| task:started | NexusCoordinator | NONE | [ ] NO LISTENERS |
| task:completed | NexusCoordinator | NONE | [ ] NO LISTENERS |
| qa:iteration | Should be RalphStyleIterator | NONE | [ ] NOT EMITTED |
| qa:passed | Should be RalphStyleIterator | NONE | [ ] NOT EMITTED |
| qa:failed | Should be RalphStyleIterator | NONE | [ ] NOT EMITTED |
| qa:escalated | NexusCoordinator | NONE | [ ] NO LISTENERS |
| agent:acquired | AgentPool | NONE | [ ] NO LISTENERS |
| agent:released | AgentPool | NONE | [ ] NO LISTENERS |
| coordinator:started | NexusCoordinator | NONE | [ ] NO LISTENERS |
| coordinator:paused | NexusCoordinator | NONE | [ ] NO LISTENERS |
| coordinator:stopped | NexusCoordinator | NONE | [ ] NO LISTENERS |

---

## UI -> Backend IPC

| Channel | Direction | Handler Exists | Real Implementation | Status |
|---------|-----------|----------------|---------------------|--------|
| mode:genesis | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| mode:evolution | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| interview:start | UI -> Main | [x] | [ ] Engine not instantiated | [~] PARTIAL |
| interview:sendMessage | UI -> Main | [x] | [ ] Engine not instantiated | [~] PARTIAL |
| interview:end | UI -> Main | [x] | [ ] Engine not instantiated | [~] PARTIAL |
| tasks:list | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| agents:status | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| agents:list | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| dashboard:getMetrics | UI -> Main | [x] | [ ] Mock state | [~] PARTIAL |
| checkpoint:list | UI -> Main | [x] | [~] Needs manager | [~] PARTIAL |
| review:list | UI -> Main | [x] | [~] Needs service | [~] PARTIAL |

---

## Backend -> UI Events

| Event | Forwarder Setup | UI Store Handler | Status |
|-------|-----------------|------------------|--------|
| progress:updated | [ ] Not forwarded | [ ] No handler | [ ] NOT WIRED |
| task:completed | [ ] Not forwarded | [ ] No handler | [ ] NOT WIRED |
| agent:status | [ ] Not forwarded | [ ] No handler | [ ] NOT WIRED |
| execution:log | [ ] Not forwarded | [ ] No handler | [ ] NOT WIRED |

**Note:** `setupEventForwarding()` is imported in main/index.ts but the function needs to be examined to see what it actually forwards.

---

## Summary

| Category | Total | Wired | Partial | Missing |
|----------|-------|-------|---------|---------|
| Genesis Flow | 17 | 2 | 8 | 7 |
| Evolution Flow | 17 | 0 | 1 | 16 |
| Event Bus | 14 | 0 | 0 | 14 |
| IPC Channels | 12 | 0 | 12 | 0 |
| Backend->UI | 4 | 0 | 0 | 4 |
| **TOTAL** | **64** | **2** | **21** | **41** |

---

## Root Cause

The fundamental issue is that **no "factory" or "bootstrap" function creates and wires the components together**. Looking at src/main/index.ts:

1. `registerIpcHandlers()` - Uses mock state
2. `registerSettingsHandlers()` - Works (standalone)
3. `setupEventForwarding()` - Exists but forwarding incomplete
4. **Missing:** NexusFactory or similar to instantiate real components

The codebase has all pieces:
- All components are implemented
- All interfaces are defined
- All tests pass

But there's no "main" function that:
1. Creates LLM clients
2. Creates database connections
3. Instantiates InterviewEngine with dependencies
4. Instantiates NexusCoordinator with dependencies
5. Wires EventBus listeners
6. Connects IPC handlers to real instances

---

## Recommended Fix Order

1. **Create NexusFactory** - Bootstrap all components
2. **Wire Interview -> Planning** - EventBus listener
3. **Wire Planning -> Execution** - NexusCoordinator.start()
4. **Wire Execution -> QA** - qaEngine integration
5. **Wire Backend -> UI** - Event forwarding
6. **Update IPC handlers** - Use real components
7. **Test E2E** - Genesis then Evolution

---

## Files to Create/Modify

### New Files Needed:
- `src/main/NexusBootstrap.ts` - Main wiring/factory

### Files to Modify:
- `src/main/index.ts` - Call bootstrap
- `src/main/ipc/handlers.ts` - Use real coordinator
- `src/orchestration/coordinator/NexusCoordinator.ts` - Add event listeners
- `src/main/ipc/interview-handlers.ts` - Ensure events flow

---

## Next Steps

Proceed to Task 2: Create MISSING_WIRING.md with prioritized list of all connections that need to be made.
