# REMOTE-ONLY Features That MUST Be Preserved

## Overview
These files exist in REMOTE (origin/master) but NOT in LOCAL.
After merge, EVERY file listed here MUST exist in the merged codebase.

## Critical Components

### 1. Quality System (src/quality/)
Complete quality assurance infrastructure:
- `BuildVerifier.ts` - Build verification
- `LintRunner.ts` - Lint execution
- `CodeReviewer.ts` - Code review
- `TestRunner.ts` - Test execution
- `index.ts` - Module exports
- `types.ts` - Quality types

### 2. Cross-Layer Bridges (src/bridges/)
Integration bridges between system layers:
- `AgentWorktreeBridge.ts` - Agent-worktree integration
- `PlanningExecutionBridge.ts` - Planning-execution integration
- `index.ts` - Module exports

### 3. Data Adapters (src/adapters/)
Data format adapters:
- `StateFormatAdapter.ts` - State format conversion
- `TaskSchemaAdapter.ts` - Task schema conversion

### 4. QA Loop Engine (src/execution/qa-loop/)
Quality assurance loop:
- `QALoopEngine.ts` - Main QA loop engine
- `index.ts` - Module exports

### 5. File System Service (src/infrastructure/file-system/)
File system operations:
- `FileSystemService.ts` - File operations service

### 6. Agent Runners (src/execution/agents/)
Alternative agent execution pattern:
- `AgentRunner.ts` - Base runner
- `CoderRunner.ts` - Coder runner
- `MergerRunner.ts` - Merger runner
- `ReviewerRunner.ts` - Reviewer runner
- `TesterRunner.ts` - Tester runner
- `types.ts` - Runner types

### 7. Additional Types (src/types/)
- `api.ts` - API types
- `llm.ts` - LLM types
- `ui.ts` - UI types

### 8. UI Components (src/renderer/)
Additional UI components:
- Dashboard components (AgentCard, MetricCard)
- Interview components (ChatInput, ChatMessage)
- Kanban components (multiple)
- UI bridges

### 9. Tests
Many test files for the above components.

### 10. Database Migrations
- Migration snapshots in `src/persistence/database/migrations/meta/`

## Source Files (Complete List)
src/adapters/StateFormatAdapter.test.ts
src/adapters/StateFormatAdapter.ts
src/adapters/TaskSchemaAdapter.test.ts
src/bridges/AgentWorktreeBridge.test.ts
src/bridges/AgentWorktreeBridge.ts
src/bridges/index.ts
src/bridges/PlanningExecutionBridge.test.ts
src/bridges/PlanningExecutionBridge.ts
src/execution/agents/AgentRunner.test.ts
src/execution/agents/AgentRunner.ts
src/execution/agents/CoderRunner.test.ts
src/execution/agents/CoderRunner.ts
src/execution/agents/MergerRunner.test.ts
src/execution/agents/MergerRunner.ts
src/execution/agents/ReviewerRunner.test.ts
src/execution/agents/ReviewerRunner.ts
src/execution/agents/TesterRunner.test.ts
src/execution/agents/TesterRunner.ts
src/execution/agents/types.ts
src/execution/qa-loop/index.ts
src/execution/qa-loop/QALoopEngine.test.ts
src/execution/qa-loop/QALoopEngine.ts
src/infrastructure/analysis/codebase/APISurfaceAnalyzer.test.ts
src/infrastructure/analysis/codebase/DataFlowAnalyzer.test.ts
src/infrastructure/analysis/codebase/DependenciesAnalyzer.test.ts
src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.test.ts
src/infrastructure/analysis/codebase/PatternsAnalyzer.test.ts
src/infrastructure/analysis/codebase/TestStrategyAnalyzer.test.ts
src/infrastructure/file-system/.gitkeep
src/infrastructure/file-system/FileSystemService.test.ts
src/infrastructure/file-system/FileSystemService.ts
src/infrastructure/git/.gitkeep
src/infrastructure/git/GitService.test.ts
src/infrastructure/git/WorktreeManager.test.ts
src/infrastructure/process/.gitkeep
src/infrastructure/process/ProcessRunner.test.ts
src/llm/clients/ClaudeClient.test.ts
src/llm/clients/GeminiClient.test.ts
src/main/main.ts
src/orchestration/coordinator/NexusCoordinator.test.ts
src/orchestration/events/EventBus.test.ts
src/orchestration/queue/TaskQueue.test.ts
src/persistence/database/.gitkeep
src/persistence/database/migrations/.gitkeep
src/persistence/database/migrations/meta/0000_snapshot.json
src/persistence/database/migrations/meta/0001_snapshot.json
src/persistence/database/migrations/meta/0003_snapshot.json
src/persistence/memory/EmbeddingsService.test.ts
src/persistence/memory/MemorySystem.test.ts
src/persistence/requirements/RequirementsDB.test.ts
src/persistence/state/StateManager.test.ts
src/quality/build/BuildVerifier.test.ts
src/quality/build/BuildVerifier.ts
src/quality/index.ts
src/quality/lint/LintRunner.test.ts
src/quality/lint/LintRunner.ts
src/quality/review/CodeReviewer.test.ts
src/quality/review/CodeReviewer.ts
src/quality/test/TestRunner.test.ts
src/quality/test/TestRunner.ts
src/quality/types.ts
src/renderer/src/bridges/index.ts
src/renderer/src/bridges/UIBackendBridge.test.ts
src/renderer/src/components/checkpoints/CheckpointList.test.tsx
src/renderer/src/components/checkpoints/ReviewModal.test.tsx
src/renderer/src/components/dashboard/AgentActivity.test.tsx
src/renderer/src/components/dashboard/AgentCard.tsx
src/renderer/src/components/dashboard/CostTracker.test.tsx
src/renderer/src/components/dashboard/MetricCard.tsx
src/renderer/src/components/dashboard/ProgressChart.test.tsx
src/renderer/src/components/dashboard/TaskTimeline.test.tsx
src/renderer/src/components/ErrorBoundary.test.tsx
src/renderer/src/components/interview/ChatInput.tsx
src/renderer/src/components/interview/ChatMessage.tsx
src/renderer/src/components/kanban/AgentStatusIndicator.tsx
src/renderer/src/components/kanban/ComplexityBadge.tsx
src/renderer/src/components/kanban/FeatureCard.test.tsx
src/renderer/src/components/kanban/FeatureDetailModal.test.tsx
src/renderer/src/components/kanban/KanbanBoard.test.tsx
src/renderer/src/components/kanban/KanbanColumn.test.tsx
src/renderer/src/components/kanban/ProgressIndicator.tsx
src/renderer/src/components/kanban/TaskList.tsx
src/renderer/src/pages/DashboardPage.test.tsx
src/renderer/src/stores/agentStore.test.ts
src/renderer/src/stores/featureStore.test.ts
src/renderer/src/stores/interviewStore.test.ts
src/renderer/src/stores/metricsStore.test.ts
src/renderer/src/stores/projectStore.test.ts
src/renderer/src/stores/taskStore.test.ts
src/renderer/src/stores/uiStore.test.ts
src/tests/integration/milestone-2.test.ts
src/tests/integration/milestone-3.test.ts
src/types/api.ts
src/types/llm.ts
src/types/ui.ts

## Post-Merge Verification Required
After merge completes, verify each file above exists.
If any are missing, recover with:
```bash
git show origin/master:<filepath> > <filepath>
git add <filepath>
```
