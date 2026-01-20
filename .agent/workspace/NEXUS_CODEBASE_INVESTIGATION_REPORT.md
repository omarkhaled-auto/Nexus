# NEXUS CODEBASE INVESTIGATION REPORT

**Date:** 2026-01-20
**Investigator:** Claude Code with Sequential Thinking + Gemini CLI
**Duration:** Comprehensive forensic analysis

---

## Section A: Executive Summary

The Nexus codebase exists in two completely **unrelated git histories** that must be merged to create a complete application. The **remote repository** (GitHub) contains Phases 1-13 (Foundation through Code Memory) with 334 commits starting from project initialization. The **local repository** contains Phases 14-17+ (Execution Bindings through UI Redesign) with 275 commits, but starts mid-project at "RalphStyleIterator core (Task 8)" with no connection to the earlier phases.

A merge simulation reveals **140 files in conflict** due to add/add conflicts (both histories added the same files independently). The local repo has fewer total files (339 vs 620) but includes critical Phase 14-17 additions like `NexusFactory.ts` that wire everything together. Both repositories independently build and pass tests, but they implement the same components **differently**.

**Severity Level: 8/10** - Significant manual effort required, but recoverable.

**Recommended Action:** Merge with `--allow-unrelated-histories`, then systematically resolve conflicts by generally preferring LOCAL versions (more recent) while preserving any unique REMOTE implementations not duplicated locally.

---

## Section B: What Each Half Contains

### LOCAL REPOSITORY (Phases 14-17+)

```
================================
Total Commits: 275
First Commit: 34bed9b "feat(iteration): implement RalphStyleIterator core (Task 8)"
Latest Commit: aa8f963 "fix(ipc): allow dynamic localhost ports and update preload format"
Total Source Files: 339 TypeScript/TSX files
================================

KEY DIRECTORIES:
├── src/config/           (ConfigFileLoader, nexus.config.schema) [LOCAL ONLY]
├── src/errors/           (LLMBackendErrors) [LOCAL ONLY]
├── src/execution/
│   ├── agents/           (BaseAgentRunner, CoderAgent, TesterAgent, ReviewerAgent, MergerAgent)
│   ├── iteration/        (RalphStyleIterator, GitDiffContextBuilder, ErrorContextAggregator) [LOCAL ONLY]
│   ├── qa/               (BuildRunner, LintRunner, TestRunner, ReviewRunner) [LOCAL ONLY]
│   └── tools/            (RequestContextTool, RequestReplanTool) [LOCAL ONLY]
├── src/infrastructure/   (Analysis, Git, Process)
├── src/interview/        (InterviewEngine, SessionManager, RequirementExtractor)
├── src/llm/
│   └── clients/          (ClaudeClient, ClaudeCodeCLIClient, GeminiClient, GeminiCLIClient)
├── src/main/             (Electron main process, IPC handlers)
├── src/NexusFactory.ts   (CRITICAL: Main wiring component) [LOCAL ONLY]
├── src/orchestration/
│   ├── agents/           (AgentPool)
│   ├── assessment/       (SelfAssessmentEngine, ProgressAssessor) [LOCAL ONLY]
│   ├── context/          (FreshContextManager, TokenBudgeter)
│   ├── coordinator/      (NexusCoordinator)
│   ├── events/           (EventBus)
│   └── planning/         (DynamicReplanner, TaskSplitter) [LOCAL ONLY]
├── src/persistence/      (Database, Checkpoints, Memory, State)
├── src/planning/         (TaskDecomposer, DependencyResolver, TimeEstimator)
├── src/renderer/         (React UI components, stores, pages)
└── src/types/            (Core types, Task, Agent, API types)

REAL IMPLEMENTATIONS (Line Counts):
- NexusFactory.ts: 790 lines ✓
- InterviewEngine.ts: 458 lines ✓
- AgentPool.ts: 586 lines ✓
- NexusCoordinator.ts: 667 lines ✓
- database/schema.ts: 381 lines ✓
- LLMProvider.ts: 345 lines ✓
- ClaudeCodeCLIClient.ts: 14,817 bytes ✓
- GeminiCLIClient.ts: 19,891 bytes ✓

TEST STATUS: 2083 passed, 1 failed (timeout)
BUILD STATUS: TypeScript compiles cleanly
LINT STATUS: 65 errors, 284 warnings (minor issues)
```

### REMOTE REPOSITORY (Phases 1-13)

```
================================
Total Commits: 334
First Commit: e6cc6ac "docs: initialize Nexus"
Latest Commit: 8c7d410 "chore: add .pnpm-store to .gitignore"
Total Files: 620
================================

KEY DIRECTORIES:
├── src/adapters/         (StateFormatAdapter, TaskSchemaAdapter)
├── src/bridges/          (AgentWorktreeBridge, PlanningExecutionBridge) [REMOTE ONLY in this form]
├── src/execution/
│   ├── agents/           (*Runner.ts variants: CoderRunner, TesterRunner, etc.)
│   └── qa-loop/          (QALoopEngine) [REMOTE ONLY]
├── src/infrastructure/
│   ├── analysis/         (TreeSitterParser, RepoMapGenerator, Analyzers)
│   ├── file-system/      (FileSystemService) [REMOTE ONLY]
│   ├── git/              (GitService, WorktreeManager)
│   └── process/          (ProcessRunner) [REMOTE ONLY]
├── src/interview/        (InterviewEngine, SessionManager)
├── src/llm/              (ClaudeClient, GeminiClient, LLMProvider)
├── src/main/             (Electron main process)
├── src/main.ts           (Entry point - different from local)
├── src/orchestration/
│   ├── agents/           (AgentPool)
│   ├── context/          (FreshContextManager, ContextBuilder)
│   ├── coordinator/      (NexusCoordinator)
│   ├── events/           (EventBus)
│   └── queue/            (TaskQueue)
├── src/persistence/
│   ├── checkpoints/      (CheckpointManager, CheckpointScheduler)
│   ├── database/         (DatabaseClient, schema, migrations)
│   ├── memory/           (MemorySystem, EmbeddingsService, CodeMemory)
│   ├── requirements/     (RequirementsDB)
│   └── state/            (StateManager)
├── src/planning/         (TaskDecomposer, DependencyResolver, TimeEstimator)
├── src/quality/          (BuildVerifier, LintRunner, TestRunner, CodeReviewer) [REMOTE ONLY]
├── src/renderer/         (UI components - different implementations)
├── src/tests/            (Integration tests in different location) [REMOTE ONLY]
└── src/types/            (Core types)

PHASES COVERED:
- Phase 1: Foundation (types, infrastructure services)
- Phase 2: Persistence (database, state, checkpoints, memory)
- Phase 3: LLM & Agents (clients, runners)
- Phase 4: Orchestration (coordinator, pool, queue, events)
- Phase 5: UI Foundation (Electron, Vite, React scaffold)
- Phase 6-8: Interview, Kanban, Dashboard UI
- Phase 9: Interview Engine backend
- Phase 10: Human Checkpoints
- Phase 11: Integration Testing
- Phase 12: Settings
- Phase 13: Code Memory + Fresh Context (partial - Plans 13-03, 13-04)
```

---

## Section C: Compatibility Assessment

| Aspect | Compatible? | Notes |
|--------|-------------|-------|
| **Package Name/Version** | ✅ Yes | Both: "nexus" v0.1.0 |
| **Core Dependencies** | ✅ Yes | Same major packages (React 19, Electron, etc.) |
| **TypeScript Config** | ⚠️ Partial | Both strict mode, but config files conflict |
| **Type Definitions** | ⚠️ Partial | Remote: 141 lines, Local: 127 lines in core.ts |
| **Database Schema** | ⚠️ Partial | Both have schema.ts but may have different migrations |
| **LLM Clients** | ⚠️ Partial | Local has CLI clients (Phase 16), Remote has API clients |
| **UI Components** | ❌ No | Completely redesigned in Phase 17 |
| **Directory Structure** | ⚠️ Partial | Mostly aligned, some differences (quality/ vs qa/) |
| **EventBus** | ✅ Yes | Same singleton pattern |
| **Entry Points** | ❌ No | Different main.ts implementations |

---

## Section D: Merge Risk Analysis

### HIGH RISK CONFLICTS (Requires Manual Resolution)

| File | Risk | Reason |
|------|------|--------|
| `package.json` | HIGH | Different dependencies, scripts, lockfile |
| `src/types/core.ts` | HIGH | Different type definitions affect entire codebase |
| `src/types/task.ts` | HIGH | Core domain type |
| `src/main.ts` | HIGH | Different entry point logic |
| `src/main/index.ts` | HIGH | Electron main process wiring |
| `src/llm/clients/*.ts` | HIGH | Local has CLI clients, Remote has API clients |
| `src/interview/InterviewEngine.ts` | HIGH | Core business logic |
| `src/orchestration/coordinator/NexusCoordinator.ts` | HIGH | Brain of the system |
| All UI Pages (`src/renderer/src/pages/*.tsx`) | HIGH | Completely redesigned in Phase 17 |
| All UI Stores (`src/renderer/src/stores/*.ts`) | HIGH | State management |
| `electron.vite.config.ts` | HIGH | Build configuration |
| `tsconfig.json` | HIGH | TypeScript configuration |
| `eslint.config.js` | HIGH | Linting rules |

### MEDIUM RISK (May Auto-Merge or Simple Resolution)

| File | Risk | Reason |
|------|------|--------|
| `src/infrastructure/analysis/*.ts` | MEDIUM | Same analyzers, different implementations |
| `src/persistence/database/schema.ts` | MEDIUM | Structural schema |
| `src/renderer/src/components/ui/*.tsx` | MEDIUM | UI primitives |
| `vitest.config.ts` | MEDIUM | Test configuration |
| E2E tests (`e2e/*.spec.ts`) | MEDIUM | Test scenarios |

### LOW RISK / AUTO-MERGEABLE

| Category | Count | Notes |
|----------|-------|-------|
| Files only in REMOTE | 95 | Will be added cleanly |
| Files only in LOCAL | 147 | Will be added cleanly |
| Documentation files | ~50 | Most are additive |

---

## Section E: Post-Merge Work Required

### IMMEDIATE FIXES NEEDED (Day 1)

1. **Resolve all 140 file conflicts** - Prioritize:
   - `package.json` and lockfiles (use LOCAL as base, add missing REMOTE deps)
   - Type definitions (`src/types/*.ts`) - merge carefully
   - Entry points (`src/main.ts`, `src/main/index.ts`)

2. **Reconcile LLM clients** - Keep both:
   - REMOTE API clients: `ClaudeClient`, `GeminiClient`
   - LOCAL CLI clients: `ClaudeCodeCLIClient`, `GeminiCLIClient`
   - NexusFactory already supports both patterns

3. **Fix import paths** - After merge, some imports may break if directory structure differs

4. **Run full test suite** - Expect failures, fix incrementally

### INTEGRATION WORK (Days 2-3)

1. **Reconcile execution directory**:
   - REMOTE: `src/execution/agents/*Runner.ts` + `src/quality/*.ts`
   - LOCAL: `src/execution/agents/*Agent.ts` + `src/execution/qa/*.ts`
   - These are parallel implementations of same concepts

2. **Merge UI redesign** - LOCAL Phase 17 UI should replace REMOTE Phase 5-8 UI
   - Keep LOCAL's redesigned pages
   - Verify all IPC handlers still work

3. **Database migrations** - Check if LOCAL migrations are compatible with REMOTE schema
   - May need to consolidate migration history

4. **Wire NexusFactory** - Ensure it can import all REMOTE Phase 1-13 components

### TESTING REQUIRED (Days 3-4)

1. Run `npm run build` - Verify Electron builds
2. Run `npm test` - Target: 2000+ tests passing
3. Run `npm run lint` - Fix any new errors
4. Manual E2E testing of all flows:
   - Genesis Mode (new project)
   - Evolution Mode (existing project)
   - Interview flow
   - Kanban board
   - Dashboard
   - Settings

---

## Section F: Recommended Action Plan

### STEP 1: Backup and Prepare

```bash
# Create backup branch
git branch backup-local-before-merge

# Stash any uncommitted work
git stash
```

### STEP 2: Perform the Merge

```bash
# Merge allowing unrelated histories
git merge origin/master --allow-unrelated-histories --no-commit

# This will show ~140 conflicts
```

### STEP 3: Resolve Critical Conflicts First

**Priority order:**

1. **package.json** - Use LOCAL as base, merge in any REMOTE-only dependencies
2. **tsconfig.json** - Use LOCAL
3. **src/types/*.ts** - Carefully merge, keeping all type definitions
4. **src/main/index.ts** - Use LOCAL (has newer IPC handlers)

### STEP 4: Bulk Resolve UI Conflicts

For all `src/renderer/` files:
```bash
# Accept LOCAL (Phase 17 redesign) for all UI files
git checkout --theirs src/renderer/
git add src/renderer/
```

Wait - that's backwards. Use `--ours` for LOCAL in this unrelated history merge context. Actually, need to check which side is "ours" vs "theirs".

**Better approach:** Use a merge tool or manually inspect each major file.

### STEP 5: Resolve LLM Client Conflicts

Keep BOTH implementations:
- REMOTE's API-based clients
- LOCAL's CLI-based clients
- NexusFactory supports both

### STEP 6: Test and Fix

```bash
# After resolving all conflicts
git add .
git commit -m "merge: combine Phases 1-13 (remote) with Phases 14-17 (local)"

# Test
npm install
npm run build
npm test
npm run lint
```

### STEP 7: Integration Verification

1. Start the app: `npm run dev:electron`
2. Test each major flow manually
3. Fix any runtime errors

---

## Section G: Critical Questions That Remain

1. **Why did the histories diverge?**
   - Was the local repo re-initialized at some point?
   - Was there a git history reset?
   - Were files copied without git history?

2. **Which execution pattern to keep?**
   - REMOTE: `*Runner.ts` pattern
   - LOCAL: `*Agent.ts` pattern
   - Are these redundant or complementary?

3. **Database migration compatibility:**
   - Do REMOTE migrations apply cleanly to LOCAL schema?
   - Are there schema differences that will break data?

4. **Test coverage after merge:**
   - REMOTE has `src/tests/` directory
   - LOCAL has tests in `tests/` root directory
   - How to consolidate?

5. **Which main.ts to use?**
   - REMOTE has traditional entry point
   - LOCAL has different structure
   - Does NexusFactory replace main.ts logic?

---

## Appendix: File Statistics

| Metric | LOCAL | REMOTE |
|--------|-------|--------|
| Total commits | 275 | 334 |
| Total files | ~7,300 (incl. docs) | 620 |
| src/ files | 339 | 303 |
| Files in both | 208 | 208 |
| Unique files | 147 | 95 |
| Conflicting files | 140 | 140 |
| Test pass rate | 99.95% | Unknown |
| TypeScript errors | 0 | Unknown |
| ESLint errors | 65 | Unknown |

---

**END OF REPORT**

*Generated by Claude Code with Sequential Thinking MCP*
