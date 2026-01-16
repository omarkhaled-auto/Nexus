# Phase 11: Integration & Testing - Context

**Gathered:** 2026-01-16
**Status:** Ready for planning

<vision>
## How This Should Work

Phase 11 is about validation and hardening — making sure everything built in phases 1-10 works together reliably. The focus is on crash recovery: the app should recover from unexpected errors mid-task without losing work.

The most important outcome is finding hidden bugs through integration tests that stress real flows and surface issues before users hit them. This means testing layer-to-layer communication without mocking boundaries, and running full UI flows through Playwright.

The testing approach should be mock-heavy for LLM integration — using MSW to intercept Claude/Gemini APIs keeps tests fast and cheap while still validating the real integration points.

</vision>

<essential>
## What Must Be Nailed

- **Finding hidden bugs** — Integration tests that stress real flows across layer boundaries
- **Crash recovery verification** — Checkpoints and persistence work so users can resume exactly where they left off
- **Mock-heavy integration** — MSW interceptors for LLM APIs, in-memory SQLite for database, test worktrees for files

</essential>

<boundaries>
## What's Out of Scope

- Performance optimization — finding bugs matters, speed improvements are Phase 12
- New features — testing what exists, no adding capabilities
- UI/UX improvements — focus on correctness, not polish
- Performance testing / load testing
- Security testing
- Production deployment

</boundaries>

<specifics>
## Specific Ideas

### Test Architecture

**Test Pyramid Target:**
| Type | Count | Percentage |
|------|-------|------------|
| Unit | ~100 | 50% |
| Integration | ~80 | 40% |
| E2E | ~20 | 10% |

(Plus existing ~1,300 unit tests from phases)

**Coverage Target:** >80% overall

### Integration Tests (45 tests)

**Layer Integration (20 tests):**
- `infra-persistence.test.ts` (5) — FileSystem ↔ Database
- `persistence-planning.test.ts` (5) — Database ↔ TaskDecomposer
- `planning-execution.test.ts` (5) — Planning ↔ AgentPool
- `execution-quality.test.ts` (5) — QALoopEngine ↔ Quality layer

**Agent Integration (15 tests):**
- `planner.test.ts` (5)
- `coder.test.ts` (5)
- `reviewer.test.ts` (5)

**Full Flow Integration (10 tests):**
- `genesis.test.ts` (5) — Genesis mode end-to-end
- `evolution.test.ts` (5) — Evolution mode end-to-end

### E2E Tests with Playwright (16 tests)

**Interview Flow (4):** Load, send message, display requirements, complete
**Kanban Flow (4):** Display board, drag feature, trigger planning, show activity
**Execution Flow (4):** Start, progress updates, QA loop, complete/merge
**Checkpoint Flow (4):** Create, list, restore, resume

### Mock Strategy
- MSW for Claude/Gemini API interception
- Test worktrees for file operations
- In-memory SQLite for database tests
- Mock EventBus for isolated component tests

### Key Integration Points
```
Interview UI → InterviewEngine → RequirementExtractor → RequirementsDB
              ↓
Kanban UI → featureStore → IPC → TaskQueue → AgentPool → Coder Agent
              ↓
Dashboard UI ← EventBus ← QALoopEngine ← Agent execution
              ↓
Checkpoint UI ← CheckpointManager ← HumanReviewService
```

### File Structure
```
tests/
├── integration/
│   ├── infra-persistence.test.ts
│   ├── persistence-planning.test.ts
│   ├── planning-execution.test.ts
│   ├── execution-quality.test.ts
│   ├── agents/
│   │   ├── planner.test.ts
│   │   ├── coder.test.ts
│   │   └── reviewer.test.ts
│   └── flows/
│       ├── genesis.test.ts
│       └── evolution.test.ts
├── factories/
│   └── index.ts
└── helpers/
    ├── mockLLM.ts
    └── testDb.ts
e2e/
├── interview.spec.ts
├── kanban.spec.ts
├── execution.spec.ts
├── checkpoint.spec.ts
└── fixtures/
    └── seed.ts
```

### Test Utilities (200-250 LOC)
**Factories:** createTask(), createFeature(), createProject(), createRequirement(), createAgent()
**Helpers:** Mock LLM responses, test DB setup/teardown, E2E page objects
**Fixtures:** seedTestProject(), mockClaudeAPI()

</specifics>

<notes>
## Additional Context

### What Already Exists (Phases 1-10)
- Phase 1: Infrastructure (FileSystem, GitService)
- Phase 2: Persistence (Database, RequirementsDB, StateManager)
- Phase 3: LLM Layer (ClaudeClient, GeminiClient)
- Phase 4: Orchestration (EventBus, TaskQueue, AgentPool)
- Phase 5: Execution Layer (QALoopEngine, AgentRunner)
- Phase 6: Interview UI (InterviewPage, interviewStore)
- Phase 7: Kanban UI (KanbanPage, FeatureCard)
- Phase 8: Dashboard UI (DashboardPage, AgentActivity)
- Phase 9: Interview Engine (RequirementExtractor, QuestionGenerator)
- Phase 10: Human Checkpoints (CheckpointManager, HumanReviewService)

Current test count: ~1,300+ unit tests from phases

### Success Criteria
- All 45 integration tests pass
- All 16 E2E tests pass
- Genesis mode works end-to-end
- Test coverage >80%
- No flaky tests

</notes>

---

*Phase: 11-integration-testing*
*Context gathered: 2026-01-16*
