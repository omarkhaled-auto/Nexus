# Removed Files Analysis

## Overview
These files were removed during Phase 18A merge due to TypeScript type conflicts.
This document analyzes each file to determine if functionality was lost.

## Summary Statistics

| Category | Count | Source Files | Test Files |
|----------|-------|--------------|------------|
| Adapters | 3 | 2 | 1 |
| QA Loop Engine | 3 | 2 | 1 |
| Agent Runners | 10 | 5 | 5 |
| Quality System | 4 | 0 | 4 |
| Bridges | 2 | 0 | 2 |
| Infrastructure | 10 | 0 | 10 |
| LLM Clients | 2 | 0 | 2 |
| Orchestration | 3 | 0 | 3 |
| Persistence | 4 | 0 | 4 |
| Renderer/UI Components | 27 | 10 | 17 |
| Types | 3 | 3 | 0 |
| Integration Tests | 2 | 0 | 2 |
| **TOTAL** | **74** | **22** | **49** |

---

## Categories

### 1. Adapters (CRITICAL - Source Code Removed)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/adapters/StateFormatAdapter.ts | Source | State format conversion | **ANALYZE** |
| src/adapters/StateFormatAdapter.test.ts | Test | Tests for adapter | Depends on source |
| src/adapters/TaskSchemaAdapter.test.ts | Test | Tests for TaskSchemaAdapter | Need to check if source exists |

### 2. QA Loop Engine (CRITICAL - Source Code Removed)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/execution/qa-loop/QALoopEngine.ts | Source | QA loop iteration | **ANALYZE vs RalphStyleIterator** |
| src/execution/qa-loop/QALoopEngine.test.ts | Test | Tests for QA loop | Depends on source |
| src/execution/qa-loop/index.ts | Index | Re-exports | Depends on source |

### 3. Agent Runners (CRITICAL - Source Code Removed)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/execution/agents/AgentRunner.ts | Source | Base runner class | **ANALYZE vs Agent pattern** |
| src/execution/agents/AgentRunner.test.ts | Test | Tests for base runner | Depends on source |
| src/execution/agents/CoderRunner.ts | Source | Coder runner | **ANALYZE vs CoderAgent** |
| src/execution/agents/CoderRunner.test.ts | Test | Tests | Depends on source |
| src/execution/agents/MergerRunner.ts | Source | Merger runner | **ANALYZE vs MergerAgent** |
| src/execution/agents/MergerRunner.test.ts | Test | Tests | Depends on source |
| src/execution/agents/ReviewerRunner.ts | Source | Reviewer runner | **ANALYZE vs ReviewerAgent** |
| src/execution/agents/ReviewerRunner.test.ts | Test | Tests | Depends on source |
| src/execution/agents/TesterRunner.ts | Source | Tester runner | **ANALYZE vs TesterAgent** |
| src/execution/agents/TesterRunner.test.ts | Test | Tests | Depends on source |
| src/execution/agents/types.ts | Source | Type definitions | **CHECK if needed** |

### 4. Quality System (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/quality/build/BuildVerifier.test.ts | Test | Tests for BuildVerifier | Check if LOCAL has tests |
| src/quality/lint/LintRunner.test.ts | Test | Tests for LintRunner | Check if LOCAL has tests |
| src/quality/review/CodeReviewer.test.ts | Test | Tests for CodeReviewer | Check if LOCAL has tests |
| src/quality/test/TestRunner.test.ts | Test | Tests for TestRunner | Check if LOCAL has tests |

### 5. Bridges (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/bridges/PlanningExecutionBridge.test.ts | Test | Tests for bridge | Check if LOCAL has tests |
| src/renderer/src/bridges/UIBackendBridge.test.ts | Test | Tests for UI bridge | Check if LOCAL has tests |

### 6. Infrastructure (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/infrastructure/analysis/codebase/APISurfaceAnalyzer.test.ts | Test | API analyzer tests | Check if LOCAL has tests |
| src/infrastructure/analysis/codebase/DataFlowAnalyzer.test.ts | Test | Data flow tests | Check if LOCAL has tests |
| src/infrastructure/analysis/codebase/DependenciesAnalyzer.test.ts | Test | Dependency tests | Check if LOCAL has tests |
| src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.test.ts | Test | Known issues tests | Check if LOCAL has tests |
| src/infrastructure/analysis/codebase/PatternsAnalyzer.test.ts | Test | Pattern tests | Check if LOCAL has tests |
| src/infrastructure/analysis/codebase/TestStrategyAnalyzer.test.ts | Test | Test strategy tests | Check if LOCAL has tests |
| src/infrastructure/file-system/FileSystemService.test.ts | Test | File system tests | Check if LOCAL has tests |
| src/infrastructure/git/GitService.test.ts | Test | Git service tests | Check if LOCAL has tests |
| src/infrastructure/git/WorktreeManager.test.ts | Test | Worktree tests | Check if LOCAL has tests |
| src/infrastructure/process/ProcessRunner.test.ts | Test | Process runner tests | Check if LOCAL has tests |

### 7. LLM Clients (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/llm/clients/ClaudeClient.test.ts | Test | Claude client tests | Check if LOCAL has tests |
| src/llm/clients/GeminiClient.test.ts | Test | Gemini client tests | Check if LOCAL has tests |

### 8. Orchestration (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/orchestration/coordinator/NexusCoordinator.test.ts | Test | Coordinator tests | Check if LOCAL has tests |
| src/orchestration/events/EventBus.test.ts | Test | Event bus tests | Check if LOCAL has tests |
| src/orchestration/queue/TaskQueue.test.ts | Test | Task queue tests | Check if LOCAL has tests |

### 9. Persistence (Test Files Only)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/persistence/memory/EmbeddingsService.test.ts | Test | Embeddings tests | Check if LOCAL has tests |
| src/persistence/memory/MemorySystem.test.ts | Test | Memory tests | Check if LOCAL has tests |
| src/persistence/requirements/RequirementsDB.test.ts | Test | Requirements tests | Check if LOCAL has tests |
| src/persistence/state/StateManager.test.ts | Test | State manager tests | Check if LOCAL has tests |

### 10. Renderer/UI Components (Mixed Source and Tests)

#### Source Files (IMPORTANT)
| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/renderer/src/components/dashboard/AgentCard.tsx | Source | Agent card UI | **CHECK if LOCAL has** |
| src/renderer/src/components/dashboard/MetricCard.tsx | Source | Metric display | **CHECK if LOCAL has** |
| src/renderer/src/components/interview/ChatInput.tsx | Source | Chat input | **CHECK if LOCAL has** |
| src/renderer/src/components/interview/ChatMessage.tsx | Source | Chat message | **CHECK if LOCAL has** |
| src/renderer/src/components/kanban/AgentStatusIndicator.tsx | Source | Status indicator | **CHECK if LOCAL has** |
| src/renderer/src/components/kanban/ComplexityBadge.tsx | Source | Complexity badge | **CHECK if LOCAL has** |
| src/renderer/src/components/kanban/ProgressIndicator.tsx | Source | Progress indicator | **CHECK if LOCAL has** |
| src/renderer/src/components/kanban/TaskList.tsx | Source | Task list | **CHECK if LOCAL has** |

#### Test Files
| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/renderer/src/components/checkpoints/CheckpointList.test.tsx | Test | Checkpoint tests | Check if LOCAL has tests |
| src/renderer/src/components/checkpoints/ReviewModal.test.tsx | Test | Review modal tests | Check if LOCAL has tests |
| src/renderer/src/components/dashboard/AgentActivity.test.tsx | Test | Agent activity tests | Check if LOCAL has tests |
| src/renderer/src/components/dashboard/CostTracker.test.tsx | Test | Cost tracker tests | Check if LOCAL has tests |
| src/renderer/src/components/dashboard/ProgressChart.test.tsx | Test | Progress chart tests | Check if LOCAL has tests |
| src/renderer/src/components/dashboard/TaskTimeline.test.tsx | Test | Task timeline tests | Check if LOCAL has tests |
| src/renderer/src/components/ErrorBoundary.test.tsx | Test | Error boundary tests | Check if LOCAL has tests |
| src/renderer/src/components/kanban/FeatureCard.test.tsx | Test | Feature card tests | Check if LOCAL has tests |
| src/renderer/src/components/kanban/FeatureDetailModal.test.tsx | Test | Feature detail tests | Check if LOCAL has tests |
| src/renderer/src/components/kanban/KanbanBoard.test.tsx | Test | Kanban board tests | Check if LOCAL has tests |
| src/renderer/src/components/kanban/KanbanColumn.test.tsx | Test | Kanban column tests | Check if LOCAL has tests |
| src/renderer/src/pages/DashboardPage.test.tsx | Test | Dashboard page tests | Check if LOCAL has tests |
| src/renderer/src/stores/agentStore.test.ts | Test | Agent store tests | Check if LOCAL has tests |
| src/renderer/src/stores/featureStore.test.ts | Test | Feature store tests | Check if LOCAL has tests |
| src/renderer/src/stores/interviewStore.test.ts | Test | Interview store tests | Check if LOCAL has tests |
| src/renderer/src/stores/metricsStore.test.ts | Test | Metrics store tests | Check if LOCAL has tests |
| src/renderer/src/stores/projectStore.test.ts | Test | Project store tests | Check if LOCAL has tests |
| src/renderer/src/stores/taskStore.test.ts | Test | Task store tests | Check if LOCAL has tests |
| src/renderer/src/stores/uiStore.test.ts | Test | UI store tests | Check if LOCAL has tests |

### 11. Types (Source Code Removed)

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/types/api.ts | Source | API type definitions | **CHECK if LOCAL has** |
| src/types/llm.ts | Source | LLM type definitions | **CHECK if LOCAL has** |
| src/types/ui.ts | Source | UI type definitions | **CHECK if LOCAL has** |

### 12. Integration Tests

| File | Type | Purpose | Action Required |
|------|------|---------|-----------------|
| src/tests/integration/milestone-2.test.ts | Test | Milestone 2 tests | Check if relevant |
| src/tests/integration/milestone-3.test.ts | Test | Milestone 3 tests | Check if relevant |

---

## Analysis Required

### Priority 1: CRITICAL (Source Code Removed)
1. **Adapters** - StateFormatAdapter.ts, TaskSchemaAdapter (source may exist)
2. **QA Loop** - QALoopEngine.ts vs RalphStyleIterator
3. **Agent Runners** - *Runner.ts vs *Agent.ts pattern

### Priority 2: IMPORTANT (UI Components)
1. Dashboard components (AgentCard, MetricCard)
2. Interview components (ChatInput, ChatMessage)
3. Kanban components (multiple)

### Priority 3: CHECK (Type Definitions)
1. api.ts - May conflict with LOCAL types
2. llm.ts - May conflict with LOCAL types
3. ui.ts - May conflict with LOCAL types

### Priority 4: TEST COVERAGE
1. Verify LOCAL has equivalent tests for all removed test files
2. If not, determine if tests are still needed

---

## Next Steps

1. **Task 2**: Analyze StateFormatAdapter and TaskSchemaAdapter
2. **Task 3**: Analyze QALoopEngine vs RalphStyleIterator
3. **Task 4**: Analyze *Runner.ts vs *Agent.ts patterns
4. **Task 5**: Verify quality system integration
