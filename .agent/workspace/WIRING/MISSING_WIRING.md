# Missing Wiring - Prioritized List

## Date: 2025-01-20
## Based on: WIRING_AUDIT.md analysis

---

## Priority 0: Bootstrap Infrastructure (MUST DO FIRST)

Without this, nothing else can work. This is the foundation.

### 0.1 Create NexusBootstrap.ts
- **Current:** No factory/bootstrap exists
- **Needed:** Central place to instantiate and wire all components
- **Location:** `src/main/NexusBootstrap.ts` (new file)
- **Estimated Effort:** Medium (2-3 hours)

```typescript
// What NexusBootstrap.ts needs to do:
export class NexusBootstrap {
  // 1. Create LLM clients (Claude, Gemini)
  // 2. Create database connections
  // 3. Instantiate all components with dependencies
  // 4. Wire EventBus listeners
  // 5. Connect to IPC handlers
  // 6. Return configured Nexus instance
}
```

### 0.2 Integrate Bootstrap into Main Process
- **Current:** `src/main/index.ts` only registers mock handlers
- **Needed:** Call NexusBootstrap and use real instances
- **Location:** `src/main/index.ts`
- **Estimated Effort:** Small (30 min)

---

## Priority 1: Genesis Flow Critical Path

These must be wired for Genesis to work AT ALL (minimum viable flow):

### 1.1 Interview Complete -> TaskDecomposer
- **Current:** InterviewEngine emits `interview:completed` but NO LISTENER
- **Needed:** EventBus listener that calls `TaskDecomposer.decompose(requirements)`
- **Location:** NexusBootstrap or NexusCoordinator
- **Estimated Effort:** Small (30 min)

```typescript
// Wire in NexusBootstrap:
eventBus.on('interview:completed', async (event) => {
  const { requirements } = event.payload;
  const tasks = await taskDecomposer.decompose(requirements);
  eventBus.emit('planning:completed', { tasks });
});
```

### 1.2 Planning Complete -> NexusCoordinator.start()
- **Current:** Tasks created but `NexusCoordinator.start()` never called
- **Needed:** EventBus listener that starts execution
- **Location:** NexusBootstrap or NexusCoordinator
- **Estimated Effort:** Small (30 min)

```typescript
// Wire in NexusBootstrap:
eventBus.on('planning:completed', async (event) => {
  const { tasks } = event.payload;
  coordinator.initialize({
    projectId,
    features: tasks.map(t => ({ id: t.id, ...t })),
    mode: 'genesis'
  });
  coordinator.start(projectId);
});
```

### 1.3 NexusCoordinator -> Real AgentPool
- **Current:** Coordinator code references `this.agentPool` but pool never instantiated
- **Needed:** Create AgentPool with LLM clients in bootstrap
- **Location:** NexusBootstrap
- **Estimated Effort:** Medium (1 hour)

```typescript
// In NexusBootstrap:
const claudeClient = createClaudeClient(config);
const geminiClient = createGeminiClient(config);
const agentPool = new AgentPool({ claudeClient, geminiClient });
```

### 1.4 AgentPool -> Real LLM Execution
- **Current:** AgentPool code exists but LLM clients not created
- **Needed:** Create Claude/Gemini clients with API keys from settings
- **Location:** NexusBootstrap
- **Estimated Effort:** Medium (1 hour)

### 1.5 Agent Complete -> QA Loop (RalphStyleIterator)
- **Current:** Coordinator has `this.qaEngine.run()` but qaEngine is `any` type stub
- **Needed:** Create RalphStyleIterator and pass to coordinator
- **Location:** NexusBootstrap
- **Estimated Effort:** Medium (1 hour)

```typescript
// In NexusBootstrap:
const ralphIterator = new RalphStyleIterator({
  projectPath,
  contextManager,
  agentRunner: (context) => agentPool.runTask(agent, task, context),
  qaRunner: { build, lint, test, review }
});
```

---

## Priority 2: Genesis Complete Path

After critical path, wire remaining Genesis features:

### 2.1 QA Failure -> Escalation Handler
- **Current:** Code exists in `handleQAFailure()` but checkpointManager is stub
- **Needed:** Wire real CheckpointManager
- **Location:** NexusBootstrap, pass to NexusCoordinator
- **Estimated Effort:** Small (30 min)

### 2.2 QA Success -> Merge to Main
- **Current:** `mergerRunner.merge()` called but mergerRunner may be undefined
- **Needed:** Wire MergerAgent or Git service
- **Location:** NexusBootstrap
- **Estimated Effort:** Small (30 min)

### 2.3 Backend Events -> IPC -> UI
- **Current:** `setupEventForwarding()` exists but may be incomplete
- **Needed:** Forward all orchestration events to renderer
- **Location:** `src/main/ipc/eventForwarding.ts`
- **Estimated Effort:** Medium (1 hour)

```typescript
// Events to forward:
const eventsToForward = [
  'interview:started', 'interview:message', 'interview:completed',
  'planning:started', 'planning:completed',
  'task:assigned', 'task:started', 'task:completed', 'task:failed',
  'qa:iteration', 'qa:passed', 'qa:failed', 'qa:escalated',
  'agent:started', 'agent:idle', 'agent:error', 'agent:terminated',
  'coordinator:started', 'coordinator:paused', 'coordinator:stopped',
  'progress:updated', 'wave:started', 'wave:completed'
];
```

### 2.4 UI Stores -> Event Handlers
- **Current:** Stores exist but don't subscribe to backend events
- **Needed:** Add event handlers in preload/renderer
- **Location:** `src/renderer/src/stores/*.ts`
- **Estimated Effort:** Medium (1-2 hours)

---

## Priority 3: Evolution Flow Additions

Evolution needs everything from Genesis PLUS:

### 3.1 Project Selection -> ProjectLoader
- **Current:** IPC handler `mode:evolution` exists but just sets mock state
- **Needed:** Load actual project from filesystem
- **Location:** Update IPC handler to use real ProjectLoader
- **Estimated Effort:** Small (30 min)

### 3.2 Project Loaded -> RepoMapGenerator
- **Current:** RepoMapGenerator exists but not called
- **Needed:** Generate repo map after project selection
- **Location:** Evolution flow in NexusBootstrap
- **Estimated Effort:** Medium (1 hour)

```typescript
// After project load:
const repoMap = await repoMapGenerator.generate(projectPath);
```

### 3.3 RepoMap -> Interview Context
- **Current:** InterviewEngine can accept context but it's not passed
- **Needed:** Pass repoMap to interview for evolution mode
- **Location:** Evolution flow handler
- **Estimated Effort:** Small (30 min)

---

## Priority 4: IPC Handler Updates

Replace mock state with real components:

### 4.1 Update mode:genesis Handler
- **Current:** Creates mock project in memory
- **Needed:** Start real Genesis flow through bootstrap
- **Location:** `src/main/ipc/handlers.ts` line 227
- **Estimated Effort:** Small (30 min)

### 4.2 Update mode:evolution Handler
- **Current:** Just sets state.mode
- **Needed:** Trigger real Evolution flow
- **Location:** `src/main/ipc/handlers.ts` line 244
- **Estimated Effort:** Small (30 min)

### 4.3 Update tasks:list Handler
- **Current:** Returns `Array.from(state.tasks.values())` (mock)
- **Needed:** Query real TaskQueue
- **Location:** `src/main/ipc/handlers.ts` line 415
- **Estimated Effort:** Small (15 min)

### 4.4 Update agents:status Handler
- **Current:** Returns mock agent data
- **Needed:** Query real AgentPool
- **Location:** `src/main/ipc/handlers.ts` line 481
- **Estimated Effort:** Small (15 min)

### 4.5 Update dashboard:getMetrics Handler
- **Current:** Calculates from mock state
- **Needed:** Get real metrics from NexusCoordinator
- **Location:** `src/main/ipc/handlers.ts` line 296
- **Estimated Effort:** Small (15 min)

---

## Priority 5: Remaining Components

### 5.1 Wire Checkpoint Save/Restore
- **Current:** IPC handlers exist, CheckpointManager implemented
- **Needed:** Ensure manager is instantiated and passed to handlers
- **Location:** NexusBootstrap + handlers.ts
- **Estimated Effort:** Small (30 min)

### 5.2 Wire Human Review UI
- **Current:** IPC handlers exist, HumanReviewService implemented
- **Needed:** Ensure service is instantiated and connected
- **Location:** NexusBootstrap + handlers.ts
- **Estimated Effort:** Small (30 min)

### 5.3 Wire Settings -> LLM Configuration
- **Current:** Settings handlers work, but settings don't affect LLM clients
- **Needed:** On settings change, reconfigure LLM clients
- **Location:** Settings handlers + NexusBootstrap
- **Estimated Effort:** Medium (1 hour)

### 5.4 Wire Real-time Execution Logs
- **Current:** execution:getLogs returns mock data
- **Needed:** Capture and store real execution output
- **Location:** Log capture in agent execution
- **Estimated Effort:** Medium (1 hour)

---

## Summary Table

| Priority | Item | Current State | Effort | Files to Modify |
|----------|------|---------------|--------|-----------------|
| 0.1 | Create NexusBootstrap | NOT EXISTS | Medium | New: src/main/NexusBootstrap.ts |
| 0.2 | Integrate Bootstrap | Mock handlers | Small | src/main/index.ts |
| 1.1 | Interview -> TaskDecomposer | No listener | Small | NexusBootstrap.ts |
| 1.2 | Planning -> Coordinator | No trigger | Small | NexusBootstrap.ts |
| 1.3 | Coordinator -> AgentPool | Not instantiated | Medium | NexusBootstrap.ts |
| 1.4 | AgentPool -> LLM | No clients | Medium | NexusBootstrap.ts |
| 1.5 | Agent -> QA Loop | Stub qaEngine | Medium | NexusBootstrap.ts |
| 2.1 | QA Failure -> Escalation | Stub manager | Small | NexusBootstrap.ts |
| 2.2 | QA Success -> Merge | Optional merger | Small | NexusBootstrap.ts |
| 2.3 | Backend -> UI Events | Incomplete | Medium | eventForwarding.ts |
| 2.4 | UI Stores -> Events | No handlers | Medium | stores/*.ts |
| 3.1 | Evolution -> ProjectLoader | Mock state | Small | handlers.ts |
| 3.2 | Project -> RepoMap | Not called | Medium | NexusBootstrap.ts |
| 3.3 | RepoMap -> Interview | Not passed | Small | NexusBootstrap.ts |
| 4.1-4.5 | IPC Handler Updates | Mock data | Small each | handlers.ts |
| 5.1 | Checkpoint Wiring | Implemented | Small | NexusBootstrap.ts |
| 5.2 | Human Review Wiring | Implemented | Small | NexusBootstrap.ts |
| 5.3 | Settings -> LLM | Not connected | Medium | settings handling |
| 5.4 | Execution Logs | Mock data | Medium | agent execution |

---

## Estimated Total Effort

| Priority | Count | Effort |
|----------|-------|--------|
| Priority 0 | 2 items | 2.5-3.5 hours |
| Priority 1 | 5 items | 3.5-4 hours |
| Priority 2 | 4 items | 2.5-3.5 hours |
| Priority 3 | 3 items | 1.5-2 hours |
| Priority 4 | 5 items | 1.5-2 hours |
| Priority 5 | 4 items | 2.5-3 hours |
| **TOTAL** | **23 items** | **14-18 hours** |

---

## Recommended Implementation Order

1. **Day 1 (Priority 0 + 1):** Create bootstrap, wire critical Genesis path
2. **Day 2 (Priority 2):** Complete Genesis flow, wire UI events
3. **Day 3 (Priority 3 + 4):** Add Evolution, update IPC handlers
4. **Day 4 (Priority 5):** Remaining components, testing, polish

---

## Dependencies Between Items

```
Priority 0 (Bootstrap)
    |
    +---> Priority 1 (Genesis Critical Path)
              |
              +---> Priority 2 (Genesis Complete)
              |         |
              |         +---> Priority 4 (IPC Updates)
              |
              +---> Priority 3 (Evolution)
                        |
                        +---> Priority 5 (Remaining)
```

**Note:** Priority 0 MUST be done first. It unblocks everything else.
