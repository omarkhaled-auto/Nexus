# CONFLICT Files Analysis & Merge Strategy

## Executive Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Conflict Files | 394 | 100% |
| Safe to Keep LOCAL | 340 | 86% |
| Requires Review | 30 | 8% |
| Likely Keep LOCAL | 24 | 6% |

**Bottom Line:** The vast majority of conflict files (86%) can safely use LOCAL versions. LOCAL represents Phases 14-17+ which evolved from the REMOTE Phase 1-13 codebase.

---

## Category A: Keep LOCAL Unconditionally (340 files)

### A1. Workspace Artifacts (16 files)
**Files:** `.agent/workspace/fix_*.cjs`, `lint-output.txt`, `task_f_update.txt`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Transient workspace files, not production code |

### A2. GSD Command Documentation (27 files)
**Files:** `.claude/commands/gsd/*.md` (add-phase, add-todo, check-todos, etc.)

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | System documentation evolved to current iteration |

### A3. GSD Templates & References (55 files)
**Files:** `.claude/get-shit-done/references/*.md`, `templates/*`, `workflows/*`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Process templates evolved in LOCAL phases |

### A4. Planning Documentation (43 files)
**Files:** `.planning/phases/08/`, `09/`, `10/`, `11/`, `12/`, `ROADMAP.md`, `STATE.md`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Phase documentation current in LOCAL |

### A5. Source Code Files (180+ files)

#### Infrastructure & Analysis (25 files)
**Files:** `src/infrastructure/analysis/codebase/*.ts`, `git/`, `process/`
- BaseAnalyzer, CodebaseAnalyzer, DataFlowAnalyzer, DependenciesAnalyzer
- ArchitectureAnalyzer, TreeSitterParser, RepoMapGenerator, etc.

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Evolved analysis framework from Phases 14+ |

#### Interview Engine (12 files)
**Files:** `src/interview/InterviewEngine.ts`, `QuestionGenerator.ts`, `RequirementExtractor.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Interview engine refined in Phase 14+ |

#### LLM Client Abstraction (11 files)
**Files:** `src/llm/clients/ClaudeClient.ts`, `GeminiClient.ts`, `ClaudeCodeCLIClient.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Evolved client implementations with CLI support |

#### Orchestration & Coordination (10 files)
**Files:** `src/orchestration/agents/AgentPool.ts`, `NexusCoordinator.ts`, `ContextBuilder.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Orchestration layer fully evolved in Phases 14-17 |

#### Persistence & Memory (35 files)
**Files:** `src/persistence/checkpoints/`, `database/`, `memory/code/`
- CheckpointManager, DatabaseClient, CodeChunker, CodeMemory

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Database migrations represent current schema |

**CRITICAL:** Do NOT use REMOTE database migrations - would break schema

#### Planning & Decomposition (6 files)
**Files:** `TaskDecomposer.ts`, `DependencyResolver.ts`, `TimeEstimator.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Planning algorithms evolved in LOCAL phases |

#### Main Process & IPC (5 files)
**Files:** `src/main/index.ts`, `ipc/handlers.ts`, `ipc/interview-handlers.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Electron app IPC layer specific to Phase 14+ |

#### Renderer/UI Components (100+ files)
**Files:** Complete React UI - Dashboard, Interview, Kanban, Checkpoints
- Pages: DashboardPage, InterviewPage, KanbanPage, SettingsPage
- Components: All dashboard, interview, kanban, checkpoint components
- Stores: agentStore, featureStore, interviewStore, settingsStore
- Hooks: useCheckpoint, useInterviewPersistence, useKeyboardShortcuts

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Entire UI rewritten/refactored in Phases 14+ |

#### Type Definitions (5 files)
**Files:** `src/shared/types/`, `src/types/core.ts`, `events.ts`, `task.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Types evolved with current architecture |

### A6. Test Files (40+ files)

#### E2E Tests (11 files)
**Files:** `e2e/checkpoint.spec.ts`, `execution.spec.ts`, `interview.spec.ts`, `kanban.spec.ts`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Tests written for Phase 14+ features |

#### Unit Tests (~30 files distributed)
**Locations:** Throughout src/ for infrastructure, interview, llm, orchestration, persistence

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Tests match LOCAL source code |

### A7. Build Output (2 files)
**Files:** `out/main/index.js`, `out/renderer/index.html`

| Decision | Rationale |
|----------|-----------|
| **KEEP LOCAL** | Current build outputs |

---

## Category B: Requires Review (30 files)

### B1. Package Management (3 files)

| File | Decision | Action Required |
|------|----------|-----------------|
| `package.json` | **REVIEW** | Compare dependencies, keep LOCAL but verify no critical deps missing |
| `package-lock.json` | **REVIEW** | Keep consistent with package.json decision |
| `pnpm-lock.yaml` | **REVIEW** | Keep consistent with package.json decision |

**Verification Steps:**
1. `git show origin/master:package.json | jq '.dependencies'` - List REMOTE deps
2. Compare with LOCAL deps
3. Ensure no unique deps from REMOTE are needed

### B2. Build & Test Configuration (6 files)

| File | Decision | Action Required |
|------|----------|-----------------|
| `electron.vite.config.ts` | **LIKELY LOCAL** | Verify build works |
| `eslint.config.js` | **LIKELY LOCAL** | Verify lint works |
| `playwright.config.ts` | **LIKELY LOCAL** | Verify E2E works |
| `tsconfig.json` | **LIKELY LOCAL** | Verify TypeScript compiles |
| `vitest.config.ts` | **LIKELY LOCAL** | Verify tests run |
| `vitest.setup.ts` | **LIKELY LOCAL** | Keep with vitest.config |

**Verification Steps:**
1. After merge, run `npm run build`
2. Run `npm test`
3. Run `npm run lint`

### B3. Settings & Git Config (3 files)

| File | Decision | Action Required |
|------|----------|-----------------|
| `.gitignore` | **REVIEW** | May need to merge unique entries |
| `.gemini/settings.json` | **KEEP LOCAL** | User settings |
| `.claude/settings.local.json` | **KEEP LOCAL** | User settings |

---

## Category C: Architecture Documents (9 files)

### C1. Master Architecture Docs (3 files)

| File | Decision | Action Required |
|------|----------|-----------------|
| `05_ARCHITECTURE_BLUEPRINT.md` | **REVIEW** | May have evolved independently |
| `06_INTEGRATION_SPECIFICATION.md` | **REVIEW** | May have evolved independently |
| `07_NEXUS_MASTER_BOOK.md` | **REVIEW** | May have evolved independently |

**Action:** Compare both versions. If REMOTE has unique architectural patterns not in LOCAL, consider preserving as separate documentation or merging sections.

**Likely Outcome:** KEEP LOCAL if LOCAL is more complete/current.

### C2. Phase Documentation (6 files)

| File | Decision | Action Required |
|------|----------|-----------------|
| `NEXUS_SURGICAL_EXECUTION_PLAN.md` | **KEEP LOCAL** | Current plan |
| `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` | **KEEP LOCAL** | LOCAL has this phase |
| `PLAN.md` | **KEEP LOCAL** | Current planning |
| `GEMINI-REVIEW-13-03-04.md` | **KEEP LOCAL** | Review document |
| `PHASE_10_REVIEW.md` | **KEEP LOCAL** | Phase 10 review |
| `PHASE_9_REVIEW.md` | **KEEP LOCAL** | Phase 9 review |

---

## Merge Execution Plan

### Step 1: Fetch and Prepare
```bash
git fetch origin master
git checkout --ours CONFLICT_FILES.txt  # Mark conflicts resolved using LOCAL
```

### Step 2: Resolve Category A (340 files) - AUTO
```bash
# For all src/, tests/, .planning/, .claude/, .agent/ files:
git checkout --ours <file>
```

### Step 3: Resolve Category B (30 files) - MANUAL
```bash
# For each config file:
git diff origin/master -- package.json  # Review differences
# Then decide:
git checkout --ours package.json  # Or manual merge
```

### Step 4: Resolve Category C (9 files) - MANUAL
```bash
# For architecture docs:
git diff origin/master -- 05_ARCHITECTURE_BLUEPRINT.md
# Review and decide
```

### Step 5: Preserve REMOTE-ONLY Files (226 files)
```bash
# These are NOT conflicts - they only exist in REMOTE
# After merge, ensure these are added:
git checkout origin/master -- src/quality/
git checkout origin/master -- src/bridges/
git checkout origin/master -- src/execution/qa-loop/
# etc. (see REMOTE_ONLY_FILES.txt)
```

### Step 6: Verify
```bash
npm run typecheck   # 0 errors
npm run build       # Success
npm test            # All pass
```

---

## Risk Assessment

| Category | Risk Level | Mitigation |
|----------|------------|------------|
| Source code conflicts | LOW | LOCAL is evolved version |
| Config conflicts | MEDIUM | Verify after merge |
| Architecture docs | MEDIUM | Manual review |
| Database migrations | HIGH if wrong | ALWAYS use LOCAL |
| Tests | LOW | Match LOCAL source |

---

## Confidence Summary

| Decision | Confidence | Files |
|----------|-----------|-------|
| Keep LOCAL: Non-source | 99% | 140 |
| Keep LOCAL: Source code | 95% | 180 |
| Keep LOCAL: Tests | 99% | 40 |
| Review: Config | 75% | 10 |
| Review: Docs | 70% | 9 |
| **Total** | **~90%** | **394** |

---

## Post-Merge Checklist

- [ ] All 394 conflict files resolved
- [ ] All 226 REMOTE-ONLY files preserved
- [ ] TypeScript compiles (0 errors)
- [ ] Build succeeds
- [ ] Tests pass (2083/2084)
- [ ] Lint passes (65 warnings acceptable)
- [ ] App starts correctly

---

**Analysis Date:** 2025-01-20
**Prepared for:** Phase 18 Codebase Unification
