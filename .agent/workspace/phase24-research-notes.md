# Phase 24 Research Notes

## Date: 2026-01-23

## Summary

This document captures research findings from studying reference repositories (Auto-Claude) and the current Nexus implementation to inform the Phase 24 Kanban Board Redesign and Task Orchestration System.

---

## 1. Reference Repo Patterns Found (Auto-Claude)

### 1.1 Task Data Structure

Auto-Claude uses a comprehensive Task interface located at `apps/frontend/src/shared/types/task.ts`:

```typescript
// Key status types
type TaskStatus = 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'pr_created' | 'done';
type ReviewReason = 'completed' | 'errors' | 'qa_rejected' | 'plan_review';
type SubtaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Execution progress tracking
interface ExecutionProgress {
  phase: ExecutionPhase;
  phaseProgress: number;  // 0-100 within current phase
  overallProgress: number;  // 0-100 overall
  currentSubtask?: string;
  message?: string;
  startedAt?: Date;
  sequenceNumber?: number;  // For detecting stale updates
}

// Subtask definition
interface Subtask {
  id: string;
  title: string;
  description: string;
  status: SubtaskStatus;
  files: string[];
  verification?: {
    type: 'command' | 'browser';
    run?: string;
    scenario?: string;
  };
}

// Full Task interface
interface Task {
  id: string;
  specId: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  reviewReason?: ReviewReason;
  subtasks: Subtask[];
  qaReport?: QAReport;
  logs: string[];
  metadata?: TaskMetadata;
  executionProgress?: ExecutionProgress;
  releasedInVersion?: string;
  stagedInMainProject?: boolean;
  stagedAt?: string;
  location?: 'main' | 'worktree';
  specsPath?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Task Metadata Pattern

Auto-Claude captures rich metadata:
- Source tracking (ideation, manual, imported, insights, roadmap, linear, github, gitlab)
- Classification (category, complexity, impact, priority)
- Technical context (affectedFiles, dependencies, acceptanceCriteria)
- Agent configuration (model, thinkingLevel, phaseModels)

### 1.3 Logging Pattern

Auto-Claude uses phase-based logging:
```typescript
interface TaskLogs {
  spec_id: string;
  phases: {
    planning: TaskPhaseLog;
    coding: TaskPhaseLog;
    validation: TaskPhaseLog;
  };
}
```

### 1.4 Key Insights
- Tasks have `subtasks` (implementation steps) with their own status
- Progress is tracked at both phase level and overall level
- QA reports are structured with issues having severity levels
- Review reason explains WHY a task needs human review

---

## 2. Current Nexus Architecture

### 2.1 Current Structure

| Component | Location |
|-----------|----------|
| KanbanPage | `src/renderer/src/pages/KanbanPage.tsx` |
| KanbanBoard | `src/renderer/src/components/kanban/KanbanBoard.tsx` |
| KanbanColumn | `src/renderer/src/components/kanban/KanbanColumn.tsx` |
| FeatureCard | `src/renderer/src/components/kanban/FeatureCard.tsx` |
| FeatureDetailModal | `src/renderer/src/components/kanban/FeatureDetailModal.tsx` |
| KanbanHeader | `src/renderer/src/components/kanban/KanbanHeader.tsx` |
| Feature Types | `src/renderer/src/types/feature.ts` |
| Feature Store | `src/renderer/src/stores/featureStore.ts` |
| IPC Handlers | `src/main/ipc/handlers.ts` |

### 2.2 Current Data Model (Feature)

```typescript
// Current Nexus uses "Feature" not "Task"
type FeatureStatus = 'backlog' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'done';
type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';
type FeatureComplexity = 'simple' | 'moderate' | 'complex';

interface FeatureTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedMinutes?: number;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  complexity: FeatureComplexity;
  tasks: FeatureTask[];
  progress?: number;
  assignedAgent?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

### 2.3 Current Interview Completion Flow

```
InterviewPage.tsx (line 124):
  completeInterviewStore();
  navigate('/evolution', { state: { requirements } });
```

**PROBLEM**: Navigates directly to Kanban (/evolution) without a planning phase.

### 2.4 Current Kanban Columns

```typescript
const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'planning', title: 'Planning' },
  { id: 'in_progress', title: 'In Progress', limit: 3 },
  { id: 'ai_review', title: 'AI Review' },
  { id: 'human_review', title: 'Human Review' },
  { id: 'done', title: 'Done' }
];
```

### 2.5 Current IPC Handlers Available

- `features:list` - List all features
- `feature:get` - Get single feature
- `feature:create` - Create new feature
- `feature:update` - Update feature
- `feature:delete` - Delete feature
- `execution:start` - Start execution (uses NexusCoordinator)
- `execution:pause` - Pause execution
- `execution:resume` - Resume execution
- `execution:stop` - Stop execution

### 2.6 Current Execution Architecture

Nexus has a coordinator pattern:
```typescript
// In handlers.ts
const coordinator = bootstrappedNexus.nexus.coordinator;
coordinator.start(projectId);
coordinator.pause();
coordinator.resume();
coordinator.stop();
```

But NO dependency resolution or task orchestration at the UI level.

---

## 3. Problems Identified

### Problem 1: Task Loading Broken
- Interview completes -> navigates directly to Kanban
- Tasks appear one-by-one as created (confusing UX)
- User should wait for ALL tasks to be ready

### Problem 2: No Execution Orchestration
- No START button for execution
- No dependency ordering for tasks
- Tasks don't wait for dependencies

### Problem 3: Kanban UI is Basic
- Simple cards with minimal info
- No visual state indicators (ready, blocked, etc.)
- No progress bars on cards
- No dependency visualization

### Problem 4: Task Modal is Basic
- Single view, no tabs
- No logs view
- No dependency view
- No history/timeline
- Limited actions

---

## 4. Design Decisions

Based on research, we will:

### 4.1 Keep "Feature" Terminology
Nexus uses Features (high-level) containing Tasks (sub-items). This is fine.
We'll enhance the Task interface to match Auto-Claude patterns.

### 4.2 Add Planning Phase Screen
New route: `/planning`
- Shows progress during task creation
- Lists tasks as they're created
- Auto-navigates to Kanban when complete

### 4.3 Enhance Task Data Structure
Add to existing interface:
- `dependsOn: string[]` - Array of task IDs
- `blockedBy: string[]` - Currently blocking tasks
- `logs: TaskLog[]` - Execution logs
- `errors: TaskError[]` - Error history
- Better progress tracking

### 4.4 Create Execution State Structure
New interface for orchestration state tracking.

### 4.5 Redesign Components
- ExecutionControls component (Start/Pause/Stop)
- Enhanced FeatureCard with visual states
- Tabbed FeatureDetailModal (Overview, Dependencies, Files, Logs, History)

### 4.6 Implement Dependency Resolution
- Topological sort for execution order
- Visual indicators for blocked/ready state
- Execution respects dependency order

---

## 5. Implementation Order

1. **Data Structures** - Define Task, ExecutionState, Column config
2. **Planning Page** - Create screen for task creation phase
3. **Kanban Components** - Redesign Board, Column, Card, Header
4. **Task Modal** - Create tabbed modal with full details
5. **Orchestration** - Implement dependency resolution and execution control
6. **Integration** - Wire everything together
7. **Testing** - Comprehensive manual and automated tests
8. **Cleanup** - Code quality, linting, documentation

---

## 6. Files to Create

```
src/shared/types/task.ts
src/shared/types/execution.ts
src/renderer/src/config/kanbanColumns.ts
src/renderer/src/pages/PlanningPage.tsx
src/renderer/src/components/kanban/ExecutionControls.tsx
src/renderer/src/components/kanban/TaskDetailModal.tsx (renamed from FeatureDetailModal)
src/renderer/src/hooks/useTaskOrchestration.ts
src/renderer/src/hooks/usePlanningProgress.ts
```

## 7. Files to Modify

```
src/renderer/src/App.tsx - Add /planning route
src/renderer/src/pages/InterviewPage.tsx - Navigate to /planning
src/renderer/src/pages/KanbanPage.tsx - Use new components
src/renderer/src/components/kanban/KanbanBoard.tsx - Enhanced
src/renderer/src/components/kanban/KanbanColumn.tsx - Enhanced
src/renderer/src/components/kanban/KanbanCard.tsx (rename from FeatureCard) - Enhanced
src/renderer/src/components/kanban/KanbanHeader.tsx - Add ExecutionControls
src/renderer/src/stores/featureStore.ts - Add orchestration state
src/main/ipc/handlers.ts - Add planning progress events
```

---

## Research Complete

Ready to proceed with TASK 2: Design New Data Structures.
