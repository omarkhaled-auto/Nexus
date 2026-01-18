# NEXUS SURGICAL EXECUTION PLAN
## Complete Build Calculation & Auto-Claude Handoff

> **Generated:** 2026-01-13
> **Purpose:** Precise calculations for building Nexus with Auto-Claude
> **Status:** READY FOR EXECUTION

---

# SECTION 1: EXECUTIVE SUMMARY

## Final Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| **BUILD Items** | 16 | Sequential/parallel mix |
| **Total Files** | 158 | Source + tests + config |
| **Source Files** | 98 | In `src/` directory |
| **Test Files** | 48 | Unit + integration + E2E |
| **Config Files** | 12 | Root config + prompts |
| **Estimated LOC** | 9,500-11,500 | Source code only |
| **Total Hours** | 302 | Sequential execution |
| **With 4 Agents** | ~100-120 hours | Parallel execution |
| **Calendar Time** | ~2-3 weeks | With human checkpoints |
| **Estimated Cost** | $450-650 | API costs (see breakdown) |

---

# SECTION 2: BUILD ITEM INVENTORY

## 2.1 Complete BUILD Item List

| ID | Name | Hours | Sprint | Dependencies | Parallelizable |
|----|------|-------|--------|--------------|----------------|
| BUILD-001 | Project Initialization | 4 | 1 | None | No (first) |
| BUILD-002 | Type Definitions | 6 | 1 | BUILD-001 | No |
| BUILD-003 | Infrastructure Layer | 16 | 1 | BUILD-002 | No |
| BUILD-004 | Database Foundation | 12 | 1 | BUILD-003 | No |
| BUILD-005 | State Management | 16 | 2 | BUILD-004 | Yes (with 006) |
| BUILD-006 | Memory System | 20 | 2 | BUILD-004 | Yes (with 005) |
| BUILD-007 | Requirements Database | 12 | 2 | BUILD-003 | Yes (with 005, 006) |
| BUILD-008 | LLM Clients | 24 | 3 | BUILD-002 | No |
| BUILD-009 | Agent Runners | 32 | 3 | BUILD-003, BUILD-008 | Yes (with 010) |
| BUILD-010 | Quality Layer | 24 | 3 | BUILD-003, BUILD-008 | Yes (with 009) |
| BUILD-011 | Planning Layer | 20 | 4 | BUILD-008 | No |
| BUILD-012 | Orchestration Layer | 28 | 4 | BUILD-005, 009, 010, 011 | No |
| BUILD-013 | UI Foundation | 20 | 5 | BUILD-012 | No |
| BUILD-014 | Interview UI | 24 | 5 | BUILD-007, BUILD-013 | Yes (with 015, 016) |
| BUILD-015 | Kanban UI | 24 | 5 | BUILD-013 | Yes (with 014, 016) |
| BUILD-016 | Dashboard UI | 20 | 5 | BUILD-013 | Yes (with 014, 015) |

**Total: 302 hours**

## 2.2 Sprint Breakdown

| Sprint | Weeks | BUILD Items | Hours | Milestone |
|--------|-------|-------------|-------|-----------|
| **Sprint 1** | 1-2 | BUILD-001 → BUILD-004 | 38 | Foundation Complete |
| **Sprint 2** | 3-4 | BUILD-005 → BUILD-007 | 48 | Persistence Complete |
| **Sprint 3** | 5-6 | BUILD-008 → BUILD-010 | 80 | Single Agent Works |
| **Sprint 4** | 7-8 | BUILD-011 → BUILD-012 | 48 | Multi-Agent Coordination |
| **Sprint 5** | 9-10 | BUILD-013 → BUILD-016 | 88 | MVP Complete |

---

# SECTION 3: FILE INVENTORY

## 3.1 Files by Directory

| Directory | Source Files | Test Files | Total | LOC Estimate |
|-----------|--------------|------------|-------|--------------|
| `src/types/` | 7 | 0 | 7 | 700-900 |
| `src/config/` | 5 | 0 | 5 | 200-300 |
| `src/infrastructure/` | 8 | 4 | 12 | 900-1,100 |
| `src/persistence/` | 12 | 6 | 18 | 1,200-1,500 |
| `src/quality/` | 10 | 5 | 15 | 800-1,000 |
| `src/execution/` | 12 | 6 | 18 | 1,100-1,400 |
| `src/planning/` | 10 | 5 | 15 | 700-900 |
| `src/orchestration/` | 12 | 6 | 18 | 1,000-1,200 |
| `src/ui/` | 25 | 5 | 30 | 1,500-2,000 |
| `src/llm/` | 7 | 3 | 10 | 600-800 |
| `src/adapters/` | 5 | 0 | 5 | 300-400 |
| `src/bridges/` | 4 | 0 | 4 | 200-300 |
| `config/prompts/` | 5 | 0 | 5 | N/A (markdown) |
| `scripts/` | 7 | 0 | 7 | 300-400 |
| `tests/` | 0 | 10 | 10 | 400-500 |
| `e2e/` | 0 | 5 | 5 | 300-400 |
| **Root** | 11 | 0 | 11 | 200-300 |
| **TOTAL** | **129** | **55** | **~158** | **9,500-11,500** |

## 3.2 Complete File List by BUILD Item

### BUILD-001: Project Initialization (8 files)
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

### BUILD-002: Type Definitions (8 files)
```
src/types/index.ts
src/types/core.ts
src/types/task.ts
src/types/agent.ts
src/types/events.ts
src/types/api.ts
src/types/llm.ts
src/types/ui.ts
```

### BUILD-003: Infrastructure Layer (12 files)
```
src/infrastructure/index.ts
src/infrastructure/file-system/FileSystemService.ts
src/infrastructure/file-system/FileSystemService.test.ts
src/infrastructure/file-system/types.ts
src/infrastructure/git/GitService.ts
src/infrastructure/git/GitService.test.ts
src/infrastructure/git/WorktreeManager.ts
src/infrastructure/git/WorktreeManager.test.ts
src/infrastructure/git/types.ts
src/infrastructure/lsp/LSPClient.ts
src/infrastructure/lsp/LSPClient.test.ts
src/infrastructure/lsp/types.ts
src/infrastructure/process/ProcessRunner.ts
src/infrastructure/process/ProcessRunner.test.ts
src/infrastructure/process/types.ts
```

### BUILD-004: Database Foundation (8 files)
```
src/persistence/index.ts
src/persistence/database/DatabaseClient.ts
src/persistence/database/DatabaseClient.test.ts
src/persistence/database/schema.ts
src/persistence/database/schema.test.ts
src/persistence/database/migrations/0001_initial.ts
src/persistence/database/migrations/0002_agents.ts
src/persistence/database/migrations/0003_metrics.ts
```

### BUILD-005: State Management (6 files)
```
src/persistence/state/StateManager.ts
src/persistence/state/StateManager.test.ts
src/persistence/state/types.ts
src/persistence/checkpoints/CheckpointManager.ts
src/persistence/checkpoints/CheckpointManager.test.ts
src/persistence/checkpoints/types.ts
```

### BUILD-006: Memory System (5 files)
```
src/persistence/memory/MemorySystem.ts
src/persistence/memory/MemorySystem.test.ts
src/persistence/memory/EmbeddingsService.ts
src/persistence/memory/EmbeddingsService.test.ts
src/persistence/memory/types.ts
```

### BUILD-007: Requirements Database (4 files)
```
src/persistence/requirements/RequirementsDB.ts
src/persistence/requirements/RequirementsDB.test.ts
src/persistence/requirements/types.ts
src/persistence/requirements/queries.ts
```

### BUILD-008: LLM Clients (10 files)
```
src/llm/index.ts
src/llm/LLMProvider.ts
src/llm/LLMProvider.test.ts
src/llm/ClaudeClient.ts
src/llm/ClaudeClient.test.ts
src/llm/GeminiClient.ts
src/llm/GeminiClient.test.ts
src/llm/OpenAIClient.ts
src/llm/OpenAIClient.test.ts
src/llm/types.ts
```

### BUILD-009: Agent Runners (12 files)
```
src/execution/index.ts
src/execution/agents/BaseRunner.ts
src/execution/agents/CoderRunner.ts
src/execution/agents/CoderRunner.test.ts
src/execution/agents/TesterRunner.ts
src/execution/agents/TesterRunner.test.ts
src/execution/agents/ReviewerRunner.ts
src/execution/agents/ReviewerRunner.test.ts
src/execution/agents/MergerRunner.ts
src/execution/agents/MergerRunner.test.ts
src/execution/agents/types.ts
config/prompts/planner.md
config/prompts/coder.md
config/prompts/tester.md
config/prompts/reviewer.md
config/prompts/merger.md
```

### BUILD-010: Quality Layer (15 files)
```
src/quality/index.ts
src/quality/testing/TestRunner.ts
src/quality/testing/TestRunner.test.ts
src/quality/testing/types.ts
src/quality/linting/LintRunner.ts
src/quality/linting/LintRunner.test.ts
src/quality/linting/types.ts
src/quality/review/CodeReviewer.ts
src/quality/review/CodeReviewer.test.ts
src/quality/review/types.ts
src/quality/build/BuildVerifier.ts
src/quality/build/BuildVerifier.test.ts
src/quality/build/types.ts
src/quality/qa-loop/QALoopEngine.ts
src/quality/qa-loop/QALoopEngine.test.ts
src/quality/qa-loop/types.ts
```

### BUILD-011: Planning Layer (15 files)
```
src/planning/index.ts
src/planning/decomposition/TaskDecomposer.ts
src/planning/decomposition/TaskDecomposer.test.ts
src/planning/decomposition/types.ts
src/planning/dependencies/DependencyResolver.ts
src/planning/dependencies/DependencyResolver.test.ts
src/planning/dependencies/types.ts
src/planning/estimation/TimeEstimator.ts
src/planning/estimation/TimeEstimator.test.ts
src/planning/estimation/types.ts
src/planning/waves/WaveCalculator.ts
src/planning/waves/WaveCalculator.test.ts
src/planning/waves/types.ts
src/planning/scope/ScopeAnalyzer.ts
src/planning/scope/ScopeAnalyzer.test.ts
src/planning/scope/types.ts
```

### BUILD-012: Orchestration Layer (18 files)
```
src/orchestration/index.ts
src/orchestration/coordinator/NexusCoordinator.ts
src/orchestration/coordinator/NexusCoordinator.test.ts
src/orchestration/coordinator/types.ts
src/orchestration/agents/AgentPool.ts
src/orchestration/agents/AgentPool.test.ts
src/orchestration/agents/types.ts
src/orchestration/queue/TaskQueue.ts
src/orchestration/queue/TaskQueue.test.ts
src/orchestration/queue/types.ts
src/orchestration/events/EventBus.ts
src/orchestration/events/EventBus.test.ts
src/orchestration/events/types.ts
src/orchestration/routing/SegmentRouter.ts
src/orchestration/routing/SegmentRouter.test.ts
src/orchestration/routing/types.ts
src/orchestration/workflow/WorkflowController.ts
src/orchestration/workflow/WorkflowController.test.ts
src/orchestration/workflow/types.ts
```

### BUILD-013: UI Foundation (15 files)
```
src/main.ts
src/preload.ts
src/renderer.ts
src/ui/index.ts
src/ui/App.tsx
src/ui/Router.tsx
src/ui/stores/projectStore.ts
src/ui/stores/agentStore.ts
src/ui/stores/taskStore.ts
src/ui/stores/uiStore.ts
src/ui/stores/metricsStore.ts
src/ui/hooks/useProject.ts
src/ui/hooks/useAgents.ts
src/ui/hooks/useTasks.ts
src/ui/hooks/useWebSocket.ts
src/ui/hooks/useCheckpoint.ts
src/ui/components/shared/Header.tsx
src/ui/components/shared/Sidebar.tsx
src/ui/components/shared/Modal.tsx
src/ui/components/shared/Toast.tsx
src/ui/components/shared/Loading.tsx
```

### BUILD-014: Interview UI (10 files)
```
src/ui/pages/InterviewPage.tsx
src/ui/pages/InterviewPage.test.tsx
src/ui/components/interview/ChatInterface.tsx
src/ui/components/interview/RequirementsSidebar.tsx
src/ui/components/interview/ResearchPanel.tsx
src/ui/components/interview/ProgressIndicator.tsx
e2e/interview.spec.ts
```

### BUILD-015: Kanban UI (8 files)
```
src/ui/pages/KanbanPage.tsx
src/ui/pages/KanbanPage.test.tsx
src/ui/components/kanban/KanbanBoard.tsx
src/ui/components/kanban/KanbanColumn.tsx
src/ui/components/kanban/FeatureCard.tsx
src/ui/components/kanban/TaskCard.tsx
src/ui/components/kanban/DragDropContext.tsx
e2e/kanban.spec.ts
```

### BUILD-016: Dashboard UI (8 files)
```
src/ui/pages/DashboardPage.tsx
src/ui/pages/DashboardPage.test.tsx
src/ui/pages/SettingsPage.tsx
src/ui/pages/SettingsPage.test.tsx
src/ui/components/dashboard/ProgressChart.tsx
src/ui/components/dashboard/AgentStatusGrid.tsx
src/ui/components/dashboard/MetricsPanel.tsx
src/ui/components/dashboard/EventLog.tsx
src/ui/components/dashboard/CheckpointList.tsx
e2e/execution.spec.ts
e2e/checkpoint.spec.ts
```

---

# SECTION 4: DEPENDENCY GRAPH

## 4.1 Visual Dependency Graph

```
                        NEXUS BUILD DEPENDENCY GRAPH
═══════════════════════════════════════════════════════════════════════════════

SPRINT 1 (Foundation) - Sequential
──────────────────────────────────────────────────────────────────────────────
    BUILD-001 ──▶ BUILD-002 ──▶ BUILD-003 ──▶ BUILD-004
    (4h)          (6h)          (16h)         (12h)
    Project       Types         Infra         Database
    Init                        Layer         Foundation
                                   │
                                   ├─────────────────────┐
                                   │                     │
                                   ▼                     ▼

SPRINT 2 (Persistence) - Parallelizable
──────────────────────────────────────────────────────────────────────────────
                              BUILD-004
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      │
      BUILD-005              BUILD-006                   │
      (16h)                  (20h)                       │
      State Mgmt             Memory System               │
           │                      │                      │
           │                      │             BUILD-003
           │                      │                  │
           │                      │                  ▼
           │                      │             BUILD-007
           │                      │             (12h)
           │                      │             Requirements
           │                      │                  │
           └──────────┬───────────┘                  │
                      │                              │
                      ▼                              │

SPRINT 3 (LLM & Agents) - Parallelizable
──────────────────────────────────────────────────────────────────────────────
      BUILD-002
          │
          ▼
      BUILD-008 ◀────────────────────────────────────┐
      (24h)                                          │
      LLM Clients                                    │
          │                                          │
          ├──────────────────────┐                   │
          │                      │                   │
          ▼                      ▼                   │
      BUILD-009              BUILD-010               │
      (32h)                  (24h)                   │
      Agent Runners          Quality Layer          │
          │                      │                   │
          │                      │                   │
          └──────────┬───────────┘                   │
                     │                               │
                     ▼                               │

SPRINT 4 (Orchestration) - Sequential
──────────────────────────────────────────────────────────────────────────────
      BUILD-008
          │
          ▼
      BUILD-011
      (20h)
      Planning Layer
          │
          ▼
      BUILD-012 ◀── BUILD-005 + BUILD-009 + BUILD-010 + BUILD-011
      (28h)
      Orchestration
          │
          ▼

SPRINT 5 (UI) - Parallelizable
──────────────────────────────────────────────────────────────────────────────
      BUILD-012                    BUILD-007
          │                            │
          ▼                            │
      BUILD-013                        │
      (20h)                            │
      UI Foundation                    │
          │                            │
          ├────────────┬───────────┐   │
          │            │           │   │
          ▼            ▼           ▼   │
      BUILD-014    BUILD-015   BUILD-016
      (24h)        (24h)       (20h)
      Interview    Kanban      Dashboard
          ▲            │           │
          │            │           │
          └────────────┴───────────┘
                      │
                      ▼
                 MVP COMPLETE
```

## 4.2 Critical Path Analysis

**Critical Path (Longest Sequential Chain):**

```
BUILD-001 → BUILD-002 → BUILD-003 → BUILD-004 → BUILD-005 → 
                                                     │
BUILD-008 → BUILD-009 → BUILD-011 → BUILD-012 → BUILD-013 → BUILD-014
```

**Critical Path Hours:** 4 + 6 + 16 + 12 + 16 + 24 + 32 + 20 + 28 + 20 + 24 = **202 hours**

**Minimum Build Time:** 202 hours (with infinite agents)

---

# SECTION 5: PARALLEL EXECUTION TIMELINE

## 5.1 Execution Waves (4 Agents)

```
WAVE EXECUTION TIMELINE (4 AGENTS)
══════════════════════════════════════════════════════════════════════════════

WAVE 1: Foundation (38 hours sequential - NO parallelization possible)
─────────────────────────────────────────────────────────────────────────────
Hours 0-38:
├── Agent 1: BUILD-001 (4h) → BUILD-002 (6h) → BUILD-003 (16h) → BUILD-004 (12h)
├── Agent 2: Idle
├── Agent 3: Idle
└── Agent 4: Idle

Elapsed: 38 hours
Efficiency: 25% (only 1 agent working)

WAVE 2: Persistence (20 hours parallel)
─────────────────────────────────────────────────────────────────────────────
Hours 38-58:
├── Agent 1: BUILD-005 (16h) + idle (4h)
├── Agent 2: BUILD-006 (20h)
├── Agent 3: BUILD-007 (12h) + idle (8h)
└── Agent 4: Idle

Elapsed: 58 hours (+20)
Efficiency: 75% (3 agents working)

WAVE 3: LLM & Agents (32 hours parallel)
─────────────────────────────────────────────────────────────────────────────
Hours 58-90:
├── Agent 1: BUILD-008 (24h) + wait (8h)
├── Agent 2: BUILD-009 (32h) - starts after BUILD-008 completes
├── Agent 3: BUILD-010 (24h) - starts after BUILD-008 completes
└── Agent 4: Idle

Wait for BUILD-008 to complete (24h), then BUILD-009 & BUILD-010 in parallel (32h)
Elapsed: 58 + 24 + 32 = 114 hours (+56 from wave 2)
Efficiency: 50%

WAVE 4: Orchestration (48 hours sequential)
─────────────────────────────────────────────────────────────────────────────
Hours 114-162:
├── Agent 1: BUILD-011 (20h) → BUILD-012 (28h)
├── Agent 2: Idle
├── Agent 3: Idle
└── Agent 4: Idle

Elapsed: 162 hours (+48)
Efficiency: 25%

WAVE 5: UI (24 hours parallel)
─────────────────────────────────────────────────────────────────────────────
Hours 162-186:
├── Agent 1: BUILD-013 (20h) → wait
├── Then parallel:
│   ├── Agent 1: BUILD-014 (24h)
│   ├── Agent 2: BUILD-015 (24h)
│   └── Agent 3: BUILD-016 (20h)
└── Agent 4: Idle

BUILD-013 (20h) → then BUILD-014, 015, 016 in parallel (24h max)
Elapsed: 162 + 20 + 24 = 206 hours (+44)
Efficiency: 50%

══════════════════════════════════════════════════════════════════════════════
TOTAL ELAPSED TIME: ~206 hours with 4 agents
SEQUENTIAL TIME: 302 hours
TIME SAVED: 96 hours (32% reduction)
══════════════════════════════════════════════════════════════════════════════
```

## 5.2 Optimized Timeline (Hours to Days)

| Phase | Hours | Days (8h/day) | Calendar Days |
|-------|-------|---------------|---------------|
| Wave 1: Foundation | 38h | 4.75 | 5 days |
| Wave 2: Persistence | 20h | 2.5 | 3 days |
| Wave 3: LLM & Agents | 56h | 7 | 7 days |
| Wave 4: Orchestration | 48h | 6 | 6 days |
| Wave 5: UI | 44h | 5.5 | 6 days |
| **TOTAL** | **206h** | **25.75** | **~27 days** |

**With Buffer (1.3x):** ~35 calendar days / ~5 weeks

---

# SECTION 6: COST PROJECTION

## 6.1 Token Usage Estimates

### Per-Task Token Estimates

| Operation | Input Tokens | Output Tokens | Total Tokens |
|-----------|--------------|---------------|--------------|
| Task Context | 4,000 | - | 4,000 |
| Code Generation | 2,000 | 3,000 | 5,000 |
| Test Generation | 1,500 | 2,000 | 3,500 |
| QA Loop (per iteration) | 3,000 | 1,000 | 4,000 |
| Code Review | 4,000 | 1,500 | 5,500 |
| Merge Operation | 2,000 | 500 | 2,500 |

### Average Task Profile

| Metric | Value |
|--------|-------|
| Average QA iterations | 3-5 |
| Tokens per task | ~30,000-40,000 |
| Total tasks estimated | ~80-100 atomic tasks |
| Total tokens | ~3,000,000-4,000,000 |

## 6.2 Cost by Model

### Claude Models

| Model | Input ($/1M) | Output ($/1M) | Est. Usage | Est. Cost |
|-------|--------------|---------------|------------|-----------|
| Claude Sonnet 4 | $3.00 | $15.00 | 2.5M tokens | $45-75 |
| Claude Opus 4 | $15.00 | $75.00 | 200K tokens | $15-25 |
| Claude Haiku 4 | $0.25 | $1.25 | 500K tokens | $2-5 |

**Claude Subtotal: $62-105**

### Gemini Models

| Model | Input ($/1M) | Output ($/1M) | Est. Usage | Est. Cost |
|-------|--------------|---------------|------------|-----------|
| Gemini 2.5 Pro | $1.25 | $5.00 | 800K tokens | $5-10 |
| Gemini 2.0 Flash | $0.075 | $0.30 | 200K tokens | $0.50-1 |

**Gemini Subtotal: $5.50-11**

### OpenAI Models

| Model | Cost ($/1M) | Est. Usage | Est. Cost |
|-------|-------------|------------|-----------|
| text-embedding-3-small | $0.02 | 500K tokens | $0.01 |
| text-embedding-3-large | $0.13 | 200K tokens | $0.03 |

**OpenAI Subtotal: $0.04**

## 6.3 Total Cost Projection

| Category | Low Estimate | High Estimate |
|----------|--------------|---------------|
| Claude API | $62 | $105 |
| Gemini API | $5.50 | $11 |
| OpenAI API | $0.04 | $0.04 |
| **Subtotal** | **$67.54** | **$116.04** |
| QA Loop Buffer (3x) | $202.62 | $348.12 |
| Retry Buffer (1.5x) | $303.93 | $522.18 |
| **TOTAL with Buffers** | **~$305** | **~$525** |

### Realistic Budget: **$450-650**

---

# SECTION 7: HUMAN CHECKPOINT STRATEGY

## 7.1 Mandatory Checkpoints

| Checkpoint | After | Purpose | Duration |
|------------|-------|---------|----------|
| **CP-1** | Sprint 1 (BUILD-004) | Verify foundation works | 2-4 hours |
| **CP-2** | Sprint 2 (BUILD-007) | Verify persistence layer | 2-4 hours |
| **CP-3** | Sprint 3 (BUILD-010) | Verify single agent execution | 4-6 hours |
| **CP-4** | Sprint 4 (BUILD-012) | Verify multi-agent coordination | 4-6 hours |
| **CP-5** | Sprint 5 (BUILD-016) | Final MVP review | 4-8 hours |

## 7.2 Checkpoint Verification Criteria

### CP-1: Foundation Complete
```
□ pnpm install completes
□ pnpm typecheck passes
□ pnpm lint passes
□ pnpm test -- src/infrastructure/ passes (45 tests)
□ Database migrations run
□ Git worktree create/delete works
```

### CP-2: Persistence Complete
```
□ StateManager creates/reads STATE.md
□ CheckpointManager creates/restores
□ MemorySystem stores/queries with embeddings
□ RequirementsDB CRUD works
□ All persistence tests pass (~50 tests)
```

### CP-3: Single Agent Works
```
□ ClaudeClient sends/receives
□ GeminiClient sends/receives
□ CoderRunner executes simple task
□ QALoopEngine runs full loop
□ Single task completes end-to-end
```

### CP-4: Multi-Agent Coordination
```
□ TaskDecomposer breaks down features
□ DependencyResolver builds graph
□ AgentPool manages 4 agents
□ TaskQueue prioritizes correctly
□ Two agents work in parallel
```

### CP-5: MVP Complete
```
□ Interview flow captures requirements
□ Kanban board drag-drop works
□ Dashboard shows live metrics
□ E2E tests pass
□ Full project executes end-to-end
```

---

# SECTION 8: AUTO-CLAUDE HANDOFF PACKAGE

## 8.1 Required Files for Auto-Claude

```
nexus-build/
├── PLAN.md                    # Main task list (generated below)
├── ARCHITECTURE.md            # Link to 05_ARCHITECTURE_BLUEPRINT.md
├── MASTER_BOOK.md             # Link to 07_NEXUS_MASTER_BOOK.md
├── checkpoints/
│   ├── CP-1-foundation.md     # Checkpoint 1 criteria
│   ├── CP-2-persistence.md    # Checkpoint 2 criteria
│   ├── CP-3-single-agent.md   # Checkpoint 3 criteria
│   ├── CP-4-multi-agent.md    # Checkpoint 4 criteria
│   └── CP-5-mvp.md            # Checkpoint 5 criteria
└── config/
    └── auto-claude.config.json # Agent configuration
```

## 8.2 PLAN.md Template for Auto-Claude

```markdown
# NEXUS BUILD PLAN

## Configuration
- Max Agents: 4
- Max Task Time: 30 minutes
- QA Max Iterations: 50
- Checkpoint After: BUILD-004, BUILD-007, BUILD-010, BUILD-012, BUILD-016

## Phase 1: Foundation (Sprint 1)

### BUILD-001: Project Initialization
- Time: 4 hours
- Dependencies: None
- Files: package.json, tsconfig.json, eslint.config.js, ...
- Verification: pnpm install && pnpm lint

### BUILD-002: Type Definitions
- Time: 6 hours
- Dependencies: BUILD-001
- Files: src/types/*.ts
- Verification: pnpm typecheck

### BUILD-003: Infrastructure Layer
- Time: 16 hours
- Dependencies: BUILD-002
- Files: src/infrastructure/**/*.ts
- Verification: pnpm test -- src/infrastructure/

### BUILD-004: Database Foundation
- Time: 12 hours
- Dependencies: BUILD-003
- Files: src/persistence/database/**/*.ts
- Verification: pnpm db:migrate && pnpm test -- persistence/database

**[CHECKPOINT CP-1: Human Review Required]**

## Phase 2: Persistence (Sprint 2)
... (continue for all BUILD items)
```

## 8.3 Auto-Claude Configuration

```json
{
  "project": "nexus",
  "mode": "greenfield",
  "agents": {
    "max_concurrent": 4,
    "types": ["coder", "tester", "reviewer", "merger"]
  },
  "qa_loop": {
    "max_iterations": 50,
    "stages": ["build", "lint", "test", "review"]
  },
  "checkpoints": {
    "auto_create": true,
    "human_review": ["CP-1", "CP-2", "CP-3", "CP-4", "CP-5"]
  },
  "task_limits": {
    "max_minutes": 30,
    "max_files": 5
  },
  "documentation": {
    "architecture": "docs/05_ARCHITECTURE_BLUEPRINT.md",
    "master_book": "docs/07_NEXUS_MASTER_BOOK.md"
  }
}
```

---

# SECTION 9: EXECUTION COMMANDS

## 9.1 Starting the Build

```bash
# Clone/create project
mkdir nexus && cd nexus
git init

# Copy documentation
cp /path/to/05_ARCHITECTURE_BLUEPRINT.md docs/
cp /path/to/07_NEXUS_MASTER_BOOK.md docs/

# Create PLAN.md (from template above)
# Configure auto-claude

# Start Auto-Claude
auto-claude start --config auto-claude.config.json --plan PLAN.md
```

## 9.2 Monitoring Progress

```bash
# Watch execution
auto-claude watch

# Check specific sprint
auto-claude status --sprint 1

# View agent activity
auto-claude agents --status

# Create manual checkpoint
auto-claude checkpoint --name "manual-checkpoint-1"
```

## 9.3 Human Checkpoint Commands

```bash
# Pause for review
auto-claude pause --checkpoint CP-1

# Review and resume
auto-claude review CP-1
auto-claude resume

# Rollback if needed
auto-claude rollback --to CP-1
```

---

# SECTION 10: RISK MITIGATION

## 10.1 Known Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API Rate Limiting | Medium | High | Implement backoff, reduce agents |
| Task > 30 min | Medium | Medium | Auto-split, human review |
| QA Loop > 50 | Low | Medium | Human escalation, task redesign |
| Merge Conflicts | Low | Low | Sequential critical path |
| Context Overflow | Low | High | Better task decomposition |

## 10.2 Contingency Plans

### If Sprint 1 Fails
- Most likely: Configuration issues
- Action: Manual fix, restart BUILD-001
- Recovery time: 2-4 hours

### If Agent Gets Stuck
- Most likely: QA loop cycling
- Action: Human review, fix error, retry
- Recovery time: 1-2 hours

### If Cost Exceeds Budget
- Checkpoint state
- Reduce agent count to 2
- Use Haiku for simple tasks
- Resume with tighter limits

---

# SECTION 11: SUCCESS CRITERIA

## 11.1 Final Verification

```bash
# Full test suite
pnpm test                  # All ~293 tests pass

# E2E tests
pnpm test:e2e              # All 5 E2E specs pass

# Coverage
pnpm test:coverage         # >80% coverage

# Lint
pnpm lint                  # 0 errors

# Type check
pnpm typecheck             # 0 errors

# Build
pnpm build                 # Compiles successfully

# Run
pnpm dev                   # App launches
```

## 11.2 Acceptance Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| All tests pass | 100% | `pnpm test` |
| Coverage | >80% | `pnpm test:coverage` |
| Lint errors | 0 | `pnpm lint` |
| Type errors | 0 | `pnpm typecheck` |
| E2E pass | 100% | `pnpm test:e2e` |
| App launches | Yes | `pnpm dev` |
| Genesis mode works | Yes | Manual test |
| Evolution mode works | Yes | Manual test |

---

# SECTION 12: SUMMARY

## 12.1 Final Numbers

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          NEXUS BUILD SUMMARY                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BUILD Items:           16                                                   ║
║  Total Files:           158                                                  ║
║  Estimated LOC:         9,500-11,500                                         ║
║  Unit Tests:            ~240                                                 ║
║  Integration Tests:     ~40                                                  ║
║  E2E Tests:             ~13                                                  ║
║                                                                              ║
║  Sequential Hours:      302                                                  ║
║  Parallel Hours:        ~206 (with 4 agents)                                 ║
║  Calendar Days:         ~27-35 days                                          ║
║                                                                              ║
║  Estimated Cost:        $450-650                                             ║
║  Human Checkpoints:     5                                                    ║
║                                                                              ║
║  Build Tool:            Auto-Claude (recommended)                            ║
║  Backup Tool:           Claude Code                                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## 12.2 Next Steps

1. **Prepare Auto-Claude environment**
2. **Copy documentation files to build directory**
3. **Create PLAN.md from template**
4. **Configure auto-claude.config.json**
5. **Start Sprint 1 execution**
6. **Human checkpoint after BUILD-004**
7. **Continue through all sprints**
8. **Final verification at CP-5**

---

**SURGICAL EXECUTION PLAN COMPLETE**

*Ready for execution with Auto-Claude*
