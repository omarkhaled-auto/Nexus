# NEXUS BUILD PLAN
## Auto-Claude Execution Plan

> **Project:** Nexus AI Builder
> **Mode:** Greenfield (Genesis-style build)
> **Target:** MVP in 5 Sprints
> **Total Estimated Hours:** 302
> **With 4 Agents Parallel:** ~206 hours (~4-5 weeks)

---

## Configuration

```yaml
max_agents: 4
max_task_time: 30  # minutes
qa_max_iterations: 50
checkpoint_on_complete:
  - BUILD-004  # Sprint 1 Complete
  - BUILD-007  # Sprint 2 Complete
  - BUILD-010  # Sprint 3 Complete
  - BUILD-012  # Sprint 4 Complete
  - BUILD-016  # Sprint 5 Complete (MVP)
human_review_required:
  - CP-1  # Foundation verification
  - CP-2  # Persistence verification
  - CP-3  # Single agent verification
  - CP-4  # Multi-agent verification
  - CP-5  # MVP verification
```

---

## SPRINT 1: FOUNDATION (Week 1-2)
**Hours:** 38 | **Milestone:** Infrastructure Works

### BUILD-001: Project Initialization
- **Time:** 4 hours
- **Dependencies:** None
- **Agent:** Coder
- **Parallelizable:** No (must be first)

**Tasks:**
- [ ] Create repository with .gitignore (Node, TypeScript, IDE files)
- [ ] Initialize package.json with pnpm
- [ ] Configure TypeScript (tsconfig.json - strict mode)
- [ ] Configure ESLint (flat config) + Prettier
- [ ] Configure Vitest + Playwright
- [ ] Create complete directory structure
- [ ] Add .env.example with all required variables

**Files to Create:**
```
package.json
tsconfig.json
eslint.config.js
prettier.config.js
vitest.config.ts
playwright.config.ts
drizzle.config.ts
electron.vite.config.ts
.env.example
.gitignore
```

**Verification:**
```bash
pnpm install          # Completes without errors
pnpm lint             # Passes
pnpm typecheck        # Passes
```

---

### BUILD-002: Type Definitions
- **Time:** 6 hours
- **Dependencies:** BUILD-001
- **Agent:** Coder
- **Parallelizable:** No

**Tasks:**
- [ ] Create src/types/core.ts (Project, Feature, SubFeature, Requirement)
- [ ] Create src/types/task.ts (Task, TaskStatus, TaskResult)
- [ ] Create src/types/agent.ts (Agent, AgentType, AgentStatus, AgentConfig)
- [ ] Create src/types/events.ts (NexusEvent, EventType, EventPayload - 40+ types)
- [ ] Create src/types/api.ts (API request/response interfaces)
- [ ] Create src/types/llm.ts (LLM provider interfaces)
- [ ] Create src/types/ui.ts (UI-specific types)
- [ ] Export all types from src/types/index.ts

**Files to Create:**
```
src/types/index.ts      (~30 LOC)
src/types/core.ts       (~200 LOC)
src/types/task.ts       (~150 LOC)
src/types/agent.ts      (~200 LOC)
src/types/events.ts     (~200 LOC)
src/types/api.ts        (~150 LOC)
src/types/llm.ts        (~100 LOC)
src/types/ui.ts         (~100 LOC)
```

**Reference:** See 07_NEXUS_MASTER_BOOK.md Section 3.4 for complete interface definitions

**Verification:**
```bash
pnpm typecheck        # All types compile without errors
```

---

### BUILD-003: Infrastructure Layer
- **Time:** 16 hours
- **Dependencies:** BUILD-002
- **Agent:** Coder + Tester
- **Parallelizable:** No

**Tasks:**
- [ ] Implement FileSystemService (4h) - readFile, writeFile, exists, glob, watch
- [ ] Implement ProcessRunner (3h) - run(), runStreaming(), kill()
- [ ] Implement GitService (4h) - createBranch, commit, merge, getDiff
- [ ] Implement WorktreeManager (3h) - createWorktree, removeWorktree, cleanup
- [ ] Write unit tests for all components (2h)

**Files to Create:**
```
src/infrastructure/index.ts
src/infrastructure/file-system/FileSystemService.ts     (~200 LOC)
src/infrastructure/file-system/FileSystemService.test.ts (~150 LOC, 12 tests)
src/infrastructure/file-system/types.ts                  (~50 LOC)
src/infrastructure/git/GitService.ts                     (~300 LOC)
src/infrastructure/git/GitService.test.ts                (~200 LOC, 15 tests)
src/infrastructure/git/WorktreeManager.ts                (~250 LOC)
src/infrastructure/git/WorktreeManager.test.ts           (~150 LOC, 10 tests)
src/infrastructure/git/types.ts                          (~50 LOC)
src/infrastructure/lsp/LSPClient.ts                      (~200 LOC)
src/infrastructure/lsp/LSPClient.test.ts                 (~100 LOC, 8 tests)
src/infrastructure/lsp/types.ts                          (~50 LOC)
src/infrastructure/process/ProcessRunner.ts              (~200 LOC)
src/infrastructure/process/ProcessRunner.test.ts         (~100 LOC, 8 tests)
src/infrastructure/process/types.ts                      (~50 LOC)
```

**Key Implementation Notes:**
- Use `pathe` for cross-platform path handling
- GitService should support custom binary path (for Electron)
- WorktreeManager stores metadata in `.nexus/worktrees/registry.json`
- ProcessRunner needs timeout support (default 30s)

**Verification:**
```bash
pnpm test -- src/infrastructure/  # All 45 tests pass
pnpm test:coverage -- src/infrastructure/  # Coverage ≥ 80%
```

---

### BUILD-004: Database Foundation
- **Time:** 12 hours
- **Dependencies:** BUILD-003
- **Agent:** Coder + Tester
- **Parallelizable:** No

**Tasks:**
- [ ] Set up Drizzle ORM with better-sqlite3
- [ ] Create database schema (projects, features, tasks, agents, checkpoints)
- [ ] Implement DatabaseClient with connection pooling
- [ ] Create migrations (initial, agents, metrics)
- [ ] Write comprehensive tests

**Files to Create:**
```
src/persistence/index.ts
src/persistence/database/DatabaseClient.ts              (~250 LOC)
src/persistence/database/DatabaseClient.test.ts         (~150 LOC, 12 tests)
src/persistence/database/schema.ts                      (~300 LOC)
src/persistence/database/schema.test.ts                 (~100 LOC, 8 tests)
src/persistence/database/migrations/0001_initial.ts     (~100 LOC)
src/persistence/database/migrations/0002_agents.ts      (~50 LOC)
src/persistence/database/migrations/0003_metrics.ts     (~50 LOC)
```

**Verification:**
```bash
pnpm db:migrate      # Migrations run successfully
pnpm test -- src/persistence/database/  # All tests pass
```

---

## 🔶 CHECKPOINT CP-1: FOUNDATION COMPLETE

**Human Review Required Before Proceeding**

**Verification Checklist:**
- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes with 0 errors
- [ ] `pnpm lint` passes with 0 errors
- [ ] `pnpm test -- src/infrastructure/` passes (45 tests)
- [ ] `pnpm test -- src/persistence/database/` passes (20 tests)
- [ ] `pnpm db:migrate` runs successfully
- [ ] Git worktree create/delete works

**If All Pass:** Continue to Sprint 2
**If Any Fail:** Fix issues before proceeding

---

## SPRINT 2: PERSISTENCE (Week 3-4)
**Hours:** 48 | **Milestone:** State Management Works

### BUILD-005: State Management
- **Time:** 16 hours
- **Dependencies:** BUILD-004
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-006, BUILD-007)

**Tasks:**
- [ ] Implement StateManager (state persistence, STATE.md export)
- [ ] Implement CheckpointManager (checkpoint creation, restoration)
- [ ] Write comprehensive tests

**Files to Create:**
```
src/persistence/state/StateManager.ts              (~300 LOC)
src/persistence/state/StateManager.test.ts         (~200 LOC, 15 tests)
src/persistence/state/types.ts                     (~100 LOC)
src/persistence/checkpoints/CheckpointManager.ts   (~250 LOC)
src/persistence/checkpoints/CheckpointManager.test.ts (~150 LOC, 12 tests)
src/persistence/checkpoints/types.ts               (~50 LOC)
```

**Verification:**
```bash
pnpm test -- src/persistence/state/       # All tests pass
pnpm test -- src/persistence/checkpoints/ # All tests pass
```

---

### BUILD-006: Memory System
- **Time:** 20 hours
- **Dependencies:** BUILD-004
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-005, BUILD-007)

**Tasks:**
- [ ] Implement MemorySystem (long-term memory with embeddings)
- [ ] Implement EmbeddingsService (vector generation, optional OpenAI)
- [ ] Write comprehensive tests

**Files to Create:**
```
src/persistence/memory/MemorySystem.ts           (~350 LOC)
src/persistence/memory/MemorySystem.test.ts      (~200 LOC, 15 tests)
src/persistence/memory/EmbeddingsService.ts      (~200 LOC)
src/persistence/memory/EmbeddingsService.test.ts (~100 LOC, 8 tests)
src/persistence/memory/types.ts                  (~100 LOC)
```

**Verification:**
```bash
pnpm test -- src/persistence/memory/  # All tests pass
```

---

### BUILD-007: Requirements Database
- **Time:** 12 hours
- **Dependencies:** BUILD-003 (can parallel with BUILD-005, BUILD-006)
- **Agent:** Coder + Tester
- **Parallelizable:** Yes

**Tasks:**
- [ ] Implement RequirementsDB (CRUD for requirements)
- [ ] Implement requirement categorization
- [ ] Implement requirement search/query
- [ ] Write comprehensive tests

**Files to Create:**
```
src/persistence/requirements/RequirementsDB.ts       (~250 LOC)
src/persistence/requirements/RequirementsDB.test.ts  (~150 LOC, 12 tests)
src/persistence/requirements/types.ts                (~100 LOC)
src/persistence/requirements/queries.ts              (~100 LOC)
```

**Verification:**
```bash
pnpm test -- src/persistence/requirements/  # All tests pass
```

---

## 🔶 CHECKPOINT CP-2: PERSISTENCE COMPLETE

**Human Review Required Before Proceeding**

**Verification Checklist:**
- [ ] StateManager creates/reads STATE.md correctly
- [ ] CheckpointManager creates and restores checkpoints
- [ ] MemorySystem stores and queries with embeddings
- [ ] RequirementsDB CRUD operations work
- [ ] All persistence tests pass (~60 tests)
- [ ] Coverage ≥ 80% for persistence layer

**If All Pass:** Continue to Sprint 3
**If Any Fail:** Fix issues before proceeding

---

## SPRINT 3: LLM & AGENTS (Week 5-6)
**Hours:** 80 | **Milestone:** Single Agent Executes Task

### BUILD-008: LLM Clients
- **Time:** 24 hours
- **Dependencies:** BUILD-002
- **Agent:** Coder + Tester
- **Parallelizable:** No (required for BUILD-009, BUILD-010)

**Tasks:**
- [ ] Implement ClaudeClient (8h) - streaming, tools, rate limiting
- [ ] Implement GeminiClient (8h) - code review, large context
- [ ] Implement LLMProvider (8h) - unified interface, model selection, cost tracking

**Files to Create:**
```
src/llm/index.ts
src/llm/LLMProvider.ts               (~200 LOC)
src/llm/LLMProvider.test.ts          (~150 LOC, 10 tests)
src/llm/ClaudeClient.ts              (~300 LOC)
src/llm/ClaudeClient.test.ts         (~200 LOC, 12 tests)
src/llm/GeminiClient.ts              (~250 LOC)
src/llm/GeminiClient.test.ts         (~150 LOC, 10 tests)
src/llm/OpenAIClient.ts              (~150 LOC) # Embeddings only
src/llm/OpenAIClient.test.ts         (~100 LOC, 6 tests)
src/llm/types.ts                     (~150 LOC)
```

**Key Implementation:**
```typescript
// Model configuration per agent type
const MODEL_CONFIG: Record<AgentType, ModelConfig> = {
  planner: { model: 'claude-opus-4', maxTokens: 8000, temperature: 0.7 },
  coder: { model: 'claude-sonnet-4', maxTokens: 16000, temperature: 0.3 },
  reviewer: { model: 'gemini-2.5-pro', maxTokens: 8000, temperature: 0.2 },
  tester: { model: 'claude-sonnet-4', maxTokens: 8000, temperature: 0.3 },
  merger: { model: 'claude-sonnet-4', maxTokens: 4000, temperature: 0.1 }
};
```

**Verification:**
```bash
pnpm test -- src/llm/  # All tests pass (mocked API calls)
```

---

### BUILD-009: Agent Runners
- **Time:** 32 hours
- **Dependencies:** BUILD-003, BUILD-008
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-010)

**Tasks:**
- [ ] Implement ToolExecutor (6h) - file_read, file_write, terminal, search
- [ ] Implement BaseRunner (4h) - abstract agent runner
- [ ] Implement CoderRunner (10h) - code generation with LLM
- [ ] Implement TesterRunner (6h) - test generation
- [ ] Implement MergerRunner (6h) - merge execution

**Files to Create:**
```
src/execution/index.ts
src/execution/tools/ToolExecutor.ts              (~400 LOC)
src/execution/tools/ToolExecutor.test.ts         (~250 LOC, 15 tests)
src/execution/tools/tools/ReadFileTool.ts        (~100 LOC)
src/execution/tools/tools/WriteFileTool.ts       (~100 LOC)
src/execution/tools/tools/EditFileTool.ts        (~150 LOC)
src/execution/tools/tools/BashTool.ts            (~100 LOC)
src/execution/tools/tools/SearchTool.ts          (~100 LOC)
src/execution/tools/tools/GitTool.ts             (~100 LOC)
src/execution/tools/types.ts                     (~100 LOC)
src/execution/agents/BaseRunner.ts               (~150 LOC)
src/execution/agents/CoderRunner.ts              (~400 LOC)
src/execution/agents/CoderRunner.test.ts         (~200 LOC, 12 tests)
src/execution/agents/TesterRunner.ts             (~300 LOC)
src/execution/agents/TesterRunner.test.ts        (~150 LOC, 10 tests)
src/execution/agents/ReviewerRunner.ts           (~250 LOC)
src/execution/agents/ReviewerRunner.test.ts      (~150 LOC, 8 tests)
src/execution/agents/MergerRunner.ts             (~300 LOC)
src/execution/agents/MergerRunner.test.ts        (~150 LOC, 10 tests)
src/execution/agents/types.ts                    (~100 LOC)
config/prompts/planner.md                        (~500 words)
config/prompts/coder.md                          (~500 words)
config/prompts/tester.md                         (~400 words)
config/prompts/reviewer.md                       (~400 words)
config/prompts/merger.md                         (~300 words)
```

**Verification:**
```bash
pnpm test -- src/execution/  # All tests pass
```

---

### BUILD-010: Quality Layer
- **Time:** 24 hours
- **Dependencies:** BUILD-003, BUILD-008
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-009)

**Tasks:**
- [ ] Implement BuildVerifier (4h) - TypeScript compilation check
- [ ] Implement LintRunner (4h) - ESLint execution
- [ ] Implement TestRunner (6h) - Test execution, coverage
- [ ] Implement CodeReviewer (6h) - AI code review with Gemini
- [ ] Implement QALoopEngine (4h) - Full Build→Lint→Test→Review loop

**Files to Create:**
```
src/quality/index.ts
src/quality/build/BuildVerifier.ts              (~200 LOC)
src/quality/build/BuildVerifier.test.ts         (~100 LOC, 8 tests)
src/quality/build/types.ts                      (~50 LOC)
src/quality/linting/LintRunner.ts               (~200 LOC)
src/quality/linting/LintRunner.test.ts          (~100 LOC, 8 tests)
src/quality/linting/types.ts                    (~50 LOC)
src/quality/testing/TestRunner.ts               (~250 LOC)
src/quality/testing/TestRunner.test.ts          (~150 LOC, 12 tests)
src/quality/testing/types.ts                    (~50 LOC)
src/quality/review/CodeReviewer.ts              (~300 LOC)
src/quality/review/CodeReviewer.test.ts         (~150 LOC, 10 tests)
src/quality/review/types.ts                     (~50 LOC)
src/quality/qa-loop/QALoopEngine.ts             (~400 LOC)
src/quality/qa-loop/QALoopEngine.test.ts        (~200 LOC, 15 tests)
src/quality/qa-loop/types.ts                    (~100 LOC)
```

**Key Implementation (QA Loop):**
```typescript
async run(task: Task, agent: CoderRunner): Promise<QAResult> {
  for (let i = 1; i <= 50; i++) {
    // 1. Build check
    const buildResult = await this.buildVerifier.verify();
    if (!buildResult.success) {
      await agent.fix(buildResult.errors);
      continue;
    }
    
    // 2. Lint check
    const lintResult = await this.lintRunner.run();
    if (!lintResult.success) {
      await agent.fix(lintResult.issues);
      continue;
    }
    
    // 3. Test check
    const testResult = await this.testRunner.run();
    if (!testResult.success) {
      await agent.fix(testResult.failures);
      continue;
    }
    
    // 4. AI Review
    const reviewResult = await this.codeReviewer.review();
    if (!reviewResult.approved) {
      await agent.fix(reviewResult.issues);
      continue;
    }
    
    return { success: true, iterations: i };
  }
  
  // Escalate to human after 50 iterations
  return { success: false, escalated: true, iterations: 50 };
}
```

**Verification:**
```bash
pnpm test -- src/quality/  # All tests pass
```

---

## 🔶 CHECKPOINT CP-3: SINGLE AGENT WORKS

**Human Review Required Before Proceeding**

**Verification Checklist:**
- [ ] ClaudeClient sends/receives messages correctly
- [ ] GeminiClient sends/receives for code review
- [ ] CoderRunner executes a simple task (create a file)
- [ ] TesterRunner generates tests for code
- [ ] QALoopEngine runs full loop (build→lint→test→review)
- [ ] Single task completes end-to-end
- [ ] Coverage ≥ 75% for execution layer

**Integration Test:**
```typescript
it('should execute code generation task', async () => {
  const coder = new CoderRunner(llmProvider, toolExecutor);
  const task = { name: 'Create utils.ts', description: 'Format dates' };
  const result = await coder.execute(task);
  expect(result.filesChanged).toContain('src/utils.ts');
});

it('should run QA loop to completion', async () => {
  const qaEngine = new QALoopEngine(/* deps */);
  const result = await qaEngine.run(task, coder);
  expect(result.success).toBe(true);
  expect(result.iterations).toBeLessThanOrEqual(50);
});
```

**If All Pass:** Continue to Sprint 4
**If Any Fail:** Fix issues before proceeding

---

## SPRINT 4: ORCHESTRATION (Week 7-8)
**Hours:** 48 | **Milestone:** Multi-Agent Coordination

### BUILD-011: Planning Layer
- **Time:** 20 hours
- **Dependencies:** BUILD-008
- **Agent:** Coder + Tester
- **Parallelizable:** No

**Tasks:**
- [ ] Implement TaskDecomposer (8h) - Feature → atomic task breakdown
- [ ] Implement DependencyResolver (6h) - Task dependency graph
- [ ] Implement WaveCalculator (3h) - Parallel wave calculation
- [ ] Implement TimeEstimator (3h) - Task time estimation

**Files to Create:**
```
src/planning/index.ts
src/planning/decomposition/TaskDecomposer.ts           (~350 LOC)
src/planning/decomposition/TaskDecomposer.test.ts      (~200 LOC, 12 tests)
src/planning/decomposition/types.ts                    (~100 LOC)
src/planning/dependencies/DependencyResolver.ts        (~250 LOC)
src/planning/dependencies/DependencyResolver.test.ts   (~150 LOC, 10 tests)
src/planning/dependencies/types.ts                     (~50 LOC)
src/planning/estimation/TimeEstimator.ts               (~150 LOC)
src/planning/estimation/TimeEstimator.test.ts          (~100 LOC, 8 tests)
src/planning/estimation/types.ts                       (~50 LOC)
src/planning/waves/WaveCalculator.ts                   (~200 LOC)
src/planning/waves/WaveCalculator.test.ts              (~100 LOC, 8 tests)
src/planning/waves/types.ts                            (~50 LOC)
src/planning/scope/ScopeAnalyzer.ts                    (~150 LOC)
src/planning/scope/ScopeAnalyzer.test.ts               (~100 LOC, 6 tests)
src/planning/scope/types.ts                            (~50 LOC)
```

**Key Implementation:**
```typescript
// 30-minute task rule validation
validateTaskDuration(task: Task): boolean {
  if (task.estimatedMinutes > 30) {
    throw new Error(`Task "${task.name}" exceeds 30-minute limit. Must decompose further.`);
  }
  return true;
}
```

**Verification:**
```bash
pnpm test -- src/planning/  # All tests pass
```

---

### BUILD-012: Orchestration Layer
- **Time:** 28 hours
- **Dependencies:** BUILD-005, BUILD-009, BUILD-010, BUILD-011
- **Agent:** Coder + Tester
- **Parallelizable:** No (depends on multiple components)

**Tasks:**
- [ ] Implement NexusCoordinator (12h) - Main orchestration engine
- [ ] Implement AgentPool (6h) - Agent lifecycle management
- [ ] Implement TaskQueue (4h) - Priority task queue
- [ ] Implement EventBus (3h) - Event emission and subscription
- [ ] Implement WorkflowController (3h) - Genesis/Evolution workflow

**Files to Create:**
```
src/orchestration/index.ts
src/orchestration/coordinator/NexusCoordinator.ts        (~450 LOC)
src/orchestration/coordinator/NexusCoordinator.test.ts   (~300 LOC, 20 tests)
src/orchestration/coordinator/types.ts                   (~100 LOC)
src/orchestration/agents/AgentPool.ts                    (~250 LOC)
src/orchestration/agents/AgentPool.test.ts               (~150 LOC, 12 tests)
src/orchestration/agents/types.ts                        (~50 LOC)
src/orchestration/queue/TaskQueue.ts                     (~200 LOC)
src/orchestration/queue/TaskQueue.test.ts                (~100 LOC, 10 tests)
src/orchestration/queue/types.ts                         (~50 LOC)
src/orchestration/events/EventBus.ts                     (~150 LOC)
src/orchestration/events/EventBus.test.ts                (~100 LOC, 8 tests)
src/orchestration/events/types.ts                        (~100 LOC)
src/orchestration/routing/SegmentRouter.ts               (~200 LOC)
src/orchestration/routing/SegmentRouter.test.ts          (~100 LOC, 8 tests)
src/orchestration/routing/types.ts                       (~50 LOC)
src/orchestration/workflow/WorkflowController.ts         (~200 LOC)
src/orchestration/workflow/WorkflowController.test.ts    (~100 LOC, 8 tests)
src/orchestration/workflow/types.ts                      (~50 LOC)
src/bridges/AgentWorktreeBridge.ts                       (~200 LOC)
src/bridges/PlanningExecutionBridge.ts                   (~200 LOC)
```

**Key Implementation (Coordinator):**
```typescript
async executeTask(task: Task): Promise<TaskResult> {
  // 1. Get available agent
  const agent = await this.agentPool.acquire(task.type);
  
  // 2. Create worktree
  const worktree = await this.worktreeManager.createWorktree(task.id);
  
  // 3. Run QA loop
  const result = await this.qaLoopEngine.run(task, agent);
  
  // 4. Merge if successful
  if (result.success) {
    await this.mergerRunner.merge(worktree, 'main');
  }
  
  // 5. Cleanup
  await this.worktreeManager.removeWorktree(task.id);
  await this.agentPool.release(agent);
  
  return result;
}
```

**Verification:**
```bash
pnpm test -- src/orchestration/  # All tests pass
```

---

## 🔶 CHECKPOINT CP-4: MULTI-AGENT COORDINATION

**Human Review Required Before Proceeding**

**Verification Checklist:**
- [ ] TaskDecomposer produces valid 30-minute tasks
- [ ] DependencyResolver detects cycles
- [ ] WaveCalculator groups parallel-safe tasks
- [ ] AgentPool manages 4 concurrent agents
- [ ] TaskQueue respects dependencies
- [ ] EventBus delivers events correctly
- [ ] Two agents work in parallel without conflicts
- [ ] Coverage ≥ 80% for orchestration layer

**Integration Test:**
```typescript
it('should orchestrate multi-agent execution', async () => {
  const coordinator = new NexusCoordinator(/* deps */);
  const project = createTestProject();
  
  await coordinator.orchestrate(project);
  
  const tasks = await taskRepo.getByProject(project.id);
  tasks.forEach(task => {
    expect(task.status).toBe('complete');
  });
});
```

**If All Pass:** Continue to Sprint 5
**If Any Fail:** Fix issues before proceeding

---

## SPRINT 5: UI (Week 9-10)
**Hours:** 88 | **Milestone:** MVP Complete

### BUILD-013: UI Foundation
- **Time:** 20 hours
- **Dependencies:** BUILD-012
- **Agent:** Coder
- **Parallelizable:** No (must be first in sprint)

**Tasks:**
- [ ] Set up Electron main process
- [ ] Set up React renderer
- [ ] Implement Zustand stores
- [ ] Implement shared components (Header, Sidebar, Modal, Toast)
- [ ] Set up routing

**Files to Create:**
```
src/main.ts                                    (~150 LOC)
src/preload.ts                                 (~100 LOC)
src/renderer.ts                                (~50 LOC)
src/ui/index.ts
src/ui/App.tsx                                 (~100 LOC)
src/ui/Router.tsx                              (~100 LOC)
src/ui/stores/projectStore.ts                  (~150 LOC)
src/ui/stores/agentStore.ts                    (~100 LOC)
src/ui/stores/taskStore.ts                     (~100 LOC)
src/ui/stores/uiStore.ts                       (~80 LOC)
src/ui/stores/metricsStore.ts                  (~100 LOC)
src/ui/hooks/useProject.ts                     (~80 LOC)
src/ui/hooks/useAgents.ts                      (~80 LOC)
src/ui/hooks/useTasks.ts                       (~80 LOC)
src/ui/hooks/useWebSocket.ts                   (~100 LOC)
src/ui/hooks/useCheckpoint.ts                  (~80 LOC)
src/ui/components/shared/Header.tsx            (~80 LOC)
src/ui/components/shared/Sidebar.tsx           (~100 LOC)
src/ui/components/shared/Modal.tsx             (~80 LOC)
src/ui/components/shared/Toast.tsx             (~60 LOC)
src/ui/components/shared/Loading.tsx           (~40 LOC)
```

**Verification:**
```bash
pnpm dev  # Electron app launches
```

---

### BUILD-014: Interview UI
- **Time:** 24 hours
- **Dependencies:** BUILD-007, BUILD-013
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-015, BUILD-016)

**Tasks:**
- [ ] Implement InterviewPage
- [ ] Implement ChatInterface component
- [ ] Implement RequirementsSidebar component
- [ ] Implement ResearchPanel component
- [ ] Write E2E tests

**Files to Create:**
```
src/ui/pages/InterviewPage.tsx                        (~300 LOC)
src/ui/pages/InterviewPage.test.tsx                   (~150 LOC, 8 tests)
src/ui/components/interview/ChatInterface.tsx         (~250 LOC)
src/ui/components/interview/RequirementsSidebar.tsx   (~200 LOC)
src/ui/components/interview/ResearchPanel.tsx         (~150 LOC)
src/ui/components/interview/ProgressIndicator.tsx     (~100 LOC)
e2e/interview.spec.ts                                 (~200 LOC, 5 tests)
```

**Verification:**
```bash
pnpm test -- InterviewPage  # Component tests pass
pnpm test:e2e -- interview  # E2E tests pass
```

---

### BUILD-015: Kanban UI
- **Time:** 24 hours
- **Dependencies:** BUILD-013
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-014, BUILD-016)

**Tasks:**
- [ ] Implement KanbanPage
- [ ] Implement KanbanBoard with drag-drop
- [ ] Implement FeatureCard, TaskCard components
- [ ] Write E2E tests

**Files to Create:**
```
src/ui/pages/KanbanPage.tsx                     (~250 LOC)
src/ui/pages/KanbanPage.test.tsx                (~150 LOC, 8 tests)
src/ui/components/kanban/KanbanBoard.tsx        (~300 LOC)
src/ui/components/kanban/KanbanColumn.tsx       (~150 LOC)
src/ui/components/kanban/FeatureCard.tsx        (~150 LOC)
src/ui/components/kanban/TaskCard.tsx           (~150 LOC)
src/ui/components/kanban/DragDropContext.tsx    (~100 LOC)
e2e/kanban.spec.ts                              (~200 LOC, 5 tests)
```

**Verification:**
```bash
pnpm test -- KanbanPage  # Component tests pass
pnpm test:e2e -- kanban  # E2E tests pass
```

---

### BUILD-016: Dashboard UI
- **Time:** 20 hours
- **Dependencies:** BUILD-013
- **Agent:** Coder + Tester
- **Parallelizable:** Yes (with BUILD-014, BUILD-015)

**Tasks:**
- [ ] Implement DashboardPage
- [ ] Implement ProgressChart, MetricsPanel
- [ ] Implement AgentStatusGrid, EventLog
- [ ] Implement SettingsPage
- [ ] Write E2E tests

**Files to Create:**
```
src/ui/pages/DashboardPage.tsx                      (~250 LOC)
src/ui/pages/DashboardPage.test.tsx                 (~150 LOC, 8 tests)
src/ui/pages/SettingsPage.tsx                       (~200 LOC)
src/ui/pages/SettingsPage.test.tsx                  (~100 LOC, 6 tests)
src/ui/components/dashboard/ProgressChart.tsx       (~200 LOC)
src/ui/components/dashboard/AgentStatusGrid.tsx     (~150 LOC)
src/ui/components/dashboard/MetricsPanel.tsx        (~150 LOC)
src/ui/components/dashboard/EventLog.tsx            (~150 LOC)
src/ui/components/dashboard/CheckpointList.tsx      (~150 LOC)
e2e/execution.spec.ts                               (~200 LOC, 5 tests)
e2e/checkpoint.spec.ts                              (~150 LOC, 3 tests)
```

**Verification:**
```bash
pnpm test -- DashboardPage SettingsPage  # Component tests pass
pnpm test:e2e -- execution checkpoint    # E2E tests pass
```

---

## 🔶 CHECKPOINT CP-5: MVP COMPLETE

**Human Review Required - Final Verification**

**Verification Checklist:**
- [ ] Electron app launches correctly
- [ ] Interview flow captures requirements
- [ ] Planning decomposes into 30-minute tasks
- [ ] Kanban board drag-drop works
- [ ] Dashboard shows live agent metrics
- [ ] Single task executes end-to-end
- [ ] Multi-agent parallel execution works
- [ ] Checkpoints create and restore
- [ ] All E2E tests pass (~13 tests)
- [ ] All unit tests pass (~293 tests)
- [ ] Coverage ≥ 80% overall

**Full Test Suite:**
```bash
pnpm lint           # 0 errors
pnpm typecheck      # 0 errors
pnpm test           # All ~293 tests pass
pnpm test:coverage  # Coverage ≥ 80%
pnpm test:e2e       # All 13 E2E tests pass
pnpm build          # Build succeeds
pnpm dev            # App launches and works
```

**Manual Verification:**
1. Start Nexus in Genesis mode
2. Describe a simple project (e.g., "CLI todo app")
3. Complete interview, approve requirements
4. Watch task decomposition
5. Start execution
6. Verify agents work in parallel
7. Check final output

---

## POST-MVP: Verification Scripts

Create these scripts in `scripts/` directory:

```bash
# scripts/verify-sprint1.sh
# scripts/verify-sprint2.sh
# scripts/verify-sprint3.sh
# scripts/verify-sprint4.sh
# scripts/verify-sprint5.sh
# scripts/doctor.ts
# scripts/seed-db.ts
```

See 07_NEXUS_MASTER_BOOK.md Section 4.6 for complete verification script implementations.

---

## DOCUMENTATION REFERENCES

| Document | Location | Purpose |
|----------|----------|---------|
| Master Book | `docs/07_NEXUS_MASTER_BOOK.md` | Complete reference (8,235 lines) |
| Architecture Blueprint | `docs/05_ARCHITECTURE_BLUEPRINT.md` | Full specs (18,756 lines) |
| Feature Catalog | `docs/01_FEATURE_CATALOG_BY_FUNCTION.md` | Feature inventory |
| Gap Analysis | `docs/04_GAP_ANALYSIS.md` | Gap resolution |
| Compatibility Matrix | `docs/03_COMPATIBILITY_MATRIX.md` | Source compatibility |

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Total Files Created | ~158 |
| Total LOC | 9,500-11,500 |
| Unit Tests | ~240 |
| Integration Tests | ~40 |
| E2E Tests | ~13 |
| Test Coverage | ≥80% |
| TypeScript Errors | 0 |
| Lint Errors | 0 |
| Build Time | <30 seconds |
| App Launch Time | <5 seconds |

---

**END OF PLAN**

*Execute sprints sequentially. Parallelize within sprints where noted.*
*Human checkpoint required at CP-1 through CP-5.*
