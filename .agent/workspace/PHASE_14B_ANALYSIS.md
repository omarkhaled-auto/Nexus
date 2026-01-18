# Phase 14B Analysis Document

This document tracks interface requirements analysis for Phase 14B: Execution Bindings Implementation.

---

## Task 1: RalphStyleIterator Interface Requirements

**Status: COMPLETE**

### 1.1 QARunner Interface

From `src/execution/iteration/types.ts` (lines 628-637):

```typescript
/**
 * QA runner functions for each phase
 */
export interface QARunner {
  /** Run build step */
  build?: (taskId: string) => Promise<BuildResult>;
  /** Run lint step */
  lint?: (taskId: string) => Promise<LintResult>;
  /** Run test step */
  test?: (taskId: string) => Promise<TestResult>;
  /** Run review step */
  review?: (taskId: string) => Promise<ReviewResult>;
}
```

**Key Points:**
- All methods are optional (partial QA runner allowed)
- All methods receive `taskId: string` as parameter
- All methods return Promises

### 1.2 Result Types

#### BuildResult (lines 298-307)
```typescript
export interface BuildResult {
  /** Whether build succeeded */
  success: boolean;
  /** Build errors */
  errors: ErrorEntry[];
  /** Build warnings */
  warnings: ErrorEntry[];
  /** Build duration in milliseconds */
  duration: number;
}
```

#### LintResult (lines 309-322)
```typescript
export interface LintResult {
  /** Whether lint passed (no errors) */
  success: boolean;
  /** Lint errors */
  errors: ErrorEntry[];
  /** Lint warnings */
  warnings: ErrorEntry[];
  /** Number of fixable issues */
  fixable: number;
}
```

**Note:** PROMPT.md shows `fixedCount` but types.ts defines `fixable`. We should use `fixable` to match existing types.

#### TestResult (lines 324-339)
```typescript
export interface TestResult {
  /** Whether all tests passed */
  success: boolean;
  /** Number of tests passed */
  passed: number;
  /** Number of tests failed */
  failed: number;
  /** Number of tests skipped */
  skipped: number;
  /** Test errors */
  errors: ErrorEntry[];
  /** Test duration in milliseconds */
  duration: number;
}
```

**Note:** Existing types use `errors: ErrorEntry[]` rather than the `failures: TestFailure[]` mentioned in PROMPT.md

#### ReviewResult (lines 341-353)
```typescript
export interface ReviewResult {
  /** Whether code is approved */
  approved: boolean;
  /** Review comments */
  comments: string[];
  /** Improvement suggestions */
  suggestions: string[];
  /** Blocking issues */
  blockers: string[];
}
```

**Note:** Different from PROMPT.md which shows `issues: ReviewIssue[]`. Existing types use simpler string arrays.

### 1.3 ErrorEntry Type (lines 270-289)

```typescript
export type ErrorType = 'build' | 'lint' | 'test' | 'review' | 'runtime';
export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorEntry {
  /** Type of error */
  type: ErrorType;
  /** Severity level */
  severity: ErrorSeverity;
  /** Error message */
  message: string;
  /** File where error occurred (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Column number (if applicable) */
  column?: number;
  /** Error code (e.g., ESLint rule name) */
  code?: string;
  /** Suggested fix (if available) */
  suggestion?: string;
  /** Iteration where this error occurred */
  iteration: number;
}
```

### 1.4 How QARunner is Called

From `RalphStyleIterator.ts` (lines 480-528):

```typescript
private async runQA(
  taskId: string,
  entry: TaskRegistryEntry
): Promise<{
  build?: BuildResult;
  lint?: LintResult;
  test?: TestResult;
  review?: ReviewResult;
}> {
  const results = {};

  // Run build
  if (this.qaRunner.build) {
    entry.phase = 'building';
    results.build = await this.qaRunner.build(taskId);
    if (!results.build.success) {
      return results; // Stop on build failure
    }
  }

  // Run lint
  if (this.qaRunner.lint) {
    entry.phase = 'linting';
    results.lint = await this.qaRunner.lint(taskId);
    // Continue even if lint has errors (non-blocking for iteration)
  }

  // Run tests
  if (this.qaRunner.test) {
    entry.phase = 'testing';
    results.test = await this.qaRunner.test(taskId);
    if (!results.test.success) {
      return results; // Stop on test failure
    }
  }

  // Run review (only if tests pass)
  if (this.qaRunner.review && results.test?.success !== false) {
    entry.phase = 'reviewing';
    results.review = await this.qaRunner.review(taskId);
  }

  return results;
}
```

**Key Insights:**
1. Build failures stop the QA pipeline
2. Lint continues even with errors (non-blocking)
3. Test failures stop the QA pipeline
4. Review only runs if tests pass

### 1.5 Context Passed to Runners

Only `taskId` is passed. The working directory and other context must be captured during runner creation (via closure).

**Recommended Pattern:**
```typescript
class BuildRunner {
  createCallback(workingDir: string): (taskId: string) => Promise<BuildResult> {
    return async (_taskId: string) => {
      return this.run(workingDir);
    };
  }
}
```

### Task 1 Checklist
- [x] Exact QARunner interface from code
- [x] All result type definitions
- [x] Call patterns used
- [x] Any context passed to runners

---

## Task 2: NexusCoordinator Interface Requirements

**Status: COMPLETE**

### 2.1 Required Interfaces

From `src/planning/types.ts`:

#### ITaskDecomposer (lines 136-156)
```typescript
export interface ITaskDecomposer {
  /**
   * Decompose a feature into atomic tasks
   */
  decompose(featureDescription: string, options?: DecompositionOptions): Promise<PlanningTask[]>;

  /**
   * Validate that a task meets size requirements
   */
  validateTaskSize(task: PlanningTask): TaskValidationResult;

  /**
   * Split a task that is too large
   */
  splitTask(task: PlanningTask): Promise<PlanningTask[]>;

  /**
   * Estimate time for a task
   */
  estimateTime(task: PlanningTask): number;
}
```

**IMPORTANT:** Note that `decompose()` takes `featureDescription: string` (NOT a Feature object). This differs from PROMPT.md.

#### IDependencyResolver (lines 161-187)
```typescript
export interface IDependencyResolver {
  /**
   * Calculate execution waves from tasks
   */
  calculateWaves(tasks: PlanningTask[]): Wave[];

  /**
   * Get topologically sorted task order
   */
  topologicalSort(tasks: PlanningTask[]): PlanningTask[];

  /**
   * Check for circular dependencies
   */
  hasCircularDependency(tasks: PlanningTask[]): boolean;

  /**
   * Detect circular dependency cycles
   * Returns array of cycles, each containing task IDs in the cycle
   */
  detectCycles(tasks: PlanningTask[]): { taskIds: string[] }[];

  /**
   * Get all dependencies for a task (transitive)
   */
  getAllDependencies(taskId: string, tasks: PlanningTask[]): string[];
}
```

#### ITimeEstimator (lines 192-207)
```typescript
export interface ITimeEstimator {
  /**
   * Estimate time for a task
   */
  estimate(task: PlanningTask): Promise<number>;

  /**
   * Estimate total time for a set of tasks
   */
  estimateTotal(tasks: PlanningTask[]): Promise<number>;

  /**
   * Calibrate estimator with actual data
   */
  calibrate(task: PlanningTask, actualMinutes: number): void;
}
```

#### IAgentPool (from orchestration/types.ts, lines 173-200)
```typescript
export interface IAgentPool {
  /** Spawn a new agent of the given type */
  spawn(type: AgentType): PoolAgent;

  /** Terminate an agent */
  terminate(agentId: string): void;

  /** Assign agent to a task */
  assign(agentId: string, taskId: string, worktreePath?: string): void;

  /** Release agent from current task */
  release(agentId: string): void;

  /** Get all agents */
  getAll(): PoolAgent[];

  /** Get active (non-idle) agents */
  getActive(): PoolAgent[];

  /** Get an available (idle) agent */
  getAvailable(): PoolAgent | undefined;

  /** Get agent by ID */
  getById(agentId: string): PoolAgent | undefined;

  /** Get current pool size */
  size(): number;
}
```

#### ITaskQueue (from orchestration/types.ts, lines 209-233)
```typescript
export interface ITaskQueue {
  /** Add task to queue */
  enqueue(task: OrchestrationTask, waveId?: number): void;

  /** Remove and return highest priority ready task */
  dequeue(): OrchestrationTask | undefined;

  /** Get tasks ready for execution */
  getReadyTasks(): OrchestrationTask[];

  /** Get tasks in a specific wave */
  getByWave(waveId: number): OrchestrationTask[];

  /** Mark task as complete */
  markComplete(taskId: string): void;

  /** Mark task as failed */
  markFailed(taskId: string): void;

  /** Get queue size */
  size(): number;

  /** Check if queue is empty */
  isEmpty(): boolean;
}
```

### 2.2 NexusCoordinator Constructor Options

From `src/orchestration/coordinator/NexusCoordinator.ts` (lines 36-47):

```typescript
export interface NexusCoordinatorOptions {
  taskQueue: ITaskQueue;
  agentPool: IAgentPool;
  decomposer: ITaskDecomposer;
  resolver: IDependencyResolver;
  estimator: ITimeEstimator;
  qaEngine: any; // QALoopEngine type
  worktreeManager: any; // WorktreeManager type
  checkpointManager: any; // CheckpointManager type
  mergerRunner?: any; // MergerRunner for merging task branches
  agentWorktreeBridge?: any; // AgentWorktreeBridge for worktree management
}
```

### 2.3 How Dependencies Are Used

#### Decomposition Flow (lines 390-448)
```typescript
// Genesis mode
const allTasks: PlanningTask[] = [];
for (const feature of features) {
  const tasks = await this.decomposer.decompose(feature as any);
  allTasks.push(...tasks);
}
```

**Note:** The coordinator casts `feature` to `any` before passing to decomposer. This suggests the decomposer interface expects a string, but coordinator passes feature objects. Need to handle both.

#### Dependency Resolution (lines 334-340)
```typescript
// Check for cycles
const cycles: { taskIds: string[] }[] = this.resolver.detectCycles(allTasks);
if (cycles.length > 0) {
  throw new Error(`Dependency cycles detected`);
}

// Calculate waves
this.waves = this.resolver.calculateWaves(allTasks);
```

**Key Usage:**
1. `detectCycles()` returns `{ taskIds: string[] }[]`
2. `calculateWaves()` returns `Wave[]`
3. No call to `topologicalSort()` directly (uses waves instead)

### 2.4 Supporting Types

#### PlanningTask (from planning/types.ts, lines 29-48)
```typescript
export interface PlanningTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  size: TaskSize;
  estimatedMinutes: number;
  dependsOn: string[];
  testCriteria: string[];
  files: string[];
}
```

#### Wave (from planning/types.ts, lines 72-79)
```typescript
export interface Wave {
  id: number;
  tasks: PlanningTask[];
  estimatedMinutes: number;
}
```

#### PoolAgent (from orchestration/types.ts, lines 158-168)
```typescript
export interface PoolAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig?: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
}
```

### Task 2 Checklist
- [x] All required interface definitions
- [x] Usage patterns for each interface
- [x] Constructor injection pattern
- [x] Supporting types documented

---

## Task 3: Existing Types and Interfaces

**Status: COMPLETE**

### 3.1 Type Definition Locations

| Type File | Purpose | Key Exports |
|-----------|---------|-------------|
| `src/types/core.ts` | Core domain types | Project, Feature, Requirement, ProjectStatus, FeatureStatus |
| `src/types/task.ts` | Task-related types | Task, TaskResult, TaskType, TaskStatus, QAStepResult, QAResult |
| `src/types/agent.ts` | Agent system types | Agent, AgentType, AgentStatus, AgentMetrics, AgentModelConfig |
| `src/types/index.ts` | Barrel export | Re-exports all + TaskSize, Priority, ProjectMode |
| `src/planning/types.ts` | Planning layer types | PlanningTask, Wave, ITaskDecomposer, IDependencyResolver, ITimeEstimator |
| `src/orchestration/types.ts` | Orchestration layer types | IAgentPool, ITaskQueue, PoolAgent, OrchestrationTask, INexusCoordinator |
| `src/execution/iteration/types.ts` | Iteration system types | QARunner, BuildResult, LintResult, TestResult, ReviewResult, ErrorEntry |

### 3.2 Core Types for Phase 14B

#### From `src/types/agent.ts`
```typescript
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

export type AgentStatus = 'idle' | 'assigned' | 'working' | 'waiting' | 'error' | 'terminated';

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalIterations: number;
  averageIterationsPerTask: number;
  totalTokensUsed: number;
  totalTimeActive: number;  // milliseconds
}

export interface AgentModelConfig {
  provider: 'anthropic' | 'google' | 'openai';
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
  terminatedAt?: Date;
}
```

#### From `src/types/task.ts`
```typescript
export type TaskType = 'auto' | 'checkpoint' | 'tdd';

export type TaskStatus = 'pending' | 'queued' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'skipped';

export interface Task extends BaseTask {
  featureId?: string;
  projectId?: string;
  files?: string[];
  dependencies?: string[];
  testCriteria?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  assignedAgentId?: string;
  worktreePath?: string;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  qaIterations?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  escalated?: boolean;
  reason?: string;
  files?: { path: string; action: 'created' | 'modified' | 'deleted'; }[];
  metrics?: { iterations: number; tokensUsed: number; timeMs: number; };
  error?: string;
}
```

#### From `src/planning/types.ts`
```typescript
export type TaskSize = 'atomic' | 'small' | 'medium' | 'large';

export interface PlanningTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  size: TaskSize;
  estimatedMinutes: number;
  dependsOn: string[];
  testCriteria: string[];
  files: string[];
}

export interface Wave {
  id: number;
  tasks: PlanningTask[];
  estimatedMinutes: number;
}

export interface DecompositionOptions {
  maxTaskMinutes?: number;
  generateTestCriteria?: boolean;
  contextFiles?: string[];
  useTDD?: boolean;
}

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

#### From `src/orchestration/types.ts`
```typescript
export interface PoolAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig?: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
}

export interface OrchestrationTask {
  id: string;
  name: string;
  description: string;
  type?: TaskType;
  status: TaskStatus;
  priority: number;
  waveId?: number;
  featureId?: string;
  files?: string[];
  dependsOn: string[];
  testCriteria?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}
```

#### From `src/execution/iteration/types.ts`
```typescript
export type ErrorType = 'build' | 'lint' | 'test' | 'review' | 'runtime';
export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorEntry {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
  iteration: number;
}

export interface BuildResult {
  success: boolean;
  errors: ErrorEntry[];
  warnings: ErrorEntry[];
  duration: number;
}

export interface LintResult {
  success: boolean;
  errors: ErrorEntry[];
  warnings: ErrorEntry[];
  fixable: number;
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  errors: ErrorEntry[];
  duration: number;
}

export interface ReviewResult {
  approved: boolean;
  comments: string[];
  suggestions: string[];
  blockers: string[];
}

export interface QARunner {
  build?: (taskId: string) => Promise<BuildResult>;
  lint?: (taskId: string) => Promise<LintResult>;
  test?: (taskId: string) => Promise<TestResult>;
  review?: (taskId: string) => Promise<ReviewResult>;
}
```

### 3.3 Type Conflicts to Resolve

| Conflict | PROMPT.md | Existing Types | Resolution |
|----------|-----------|----------------|------------|
| LintResult.fixedCount vs fixable | `fixedCount: number` | `fixable: number` | **Use `fixable`** - matches existing |
| TestResult.failures vs errors | `failures: TestFailure[]` | `errors: ErrorEntry[]` | **Use `errors: ErrorEntry[]`** - matches existing |
| ReviewResult.issues | `issues: ReviewIssue[]` | `comments/suggestions/blockers: string[]` | **Use existing pattern** - simpler |
| BuildResult.errors | `errors: string[]` | `errors: ErrorEntry[]` | **Use `ErrorEntry[]`** - richer data |

### 3.4 Types to Implement (Not Yet Existing)

These types need to be created as part of Phase 14B:

1. **Agent Runner Types** (for `src/execution/agents/`):
   - `IAgentRunner` - Base interface for all agent runners
   - `AgentRunnerConfig` - Configuration for agent runners
   - `AgentResponse` - Response from agent execution

2. **QA Runner Factory Types** (for `src/execution/qa/`):
   - `QARunnerConfig` - Configuration for QA runner factory
   - Individual runner configs (BuildRunnerConfig, LintRunnerConfig, etc.)

### 3.5 Import Paths for Implementation

When implementing the bindings, use these imports:

```typescript
// From types
import type { AgentType, AgentStatus, AgentMetrics, AgentModelConfig, Agent } from '../types/agent';
import type { TaskType, TaskStatus, Task, TaskResult } from '../types/task';

// From planning
import type { PlanningTask, Wave, ITaskDecomposer, IDependencyResolver, ITimeEstimator, DecompositionOptions, TaskValidationResult } from '../planning/types';

// From orchestration
import type { IAgentPool, ITaskQueue, PoolAgent, OrchestrationTask } from '../orchestration/types';

// From execution/iteration
import type { QARunner, BuildResult, LintResult, TestResult, ReviewResult, ErrorEntry, ErrorType, ErrorSeverity } from '../execution/iteration/types';
```

### Task 3 Checklist
- [x] All type definitions needed
- [x] Where they're defined
- [x] Any type conflicts to resolve
- [x] Import paths documented

---

## Implementation Notes

### Differences from PROMPT.md

The PROMPT.md template code has some differences from the actual existing types:

1. **LintResult**: PROMPT uses `fixedCount`, existing types use `fixable`
2. **TestResult**: PROMPT uses `failures: TestFailure[]`, existing types use `errors: ErrorEntry[]`
3. **ReviewResult**: PROMPT uses complex `issues: ReviewIssue[]`, existing types use simple string arrays

**DECISION**: We will match the EXISTING types in `src/execution/iteration/types.ts` rather than the PROMPT.md templates, to maintain consistency with the established codebase.

### File Locations for Implementations

Based on PROMPT.md:
- QA Runners: `src/execution/qa/`
- Planning: `src/planning/decomposition/`, `src/planning/dependency/`, `src/planning/estimation/`
- Agents: `src/execution/agents/`

### Key Dependencies

- `RalphStyleIterator` expects `QARunner` interface
- Runners need access to project working directory
- ReviewRunner needs `GeminiClient` and `GitService`

---

*Last Updated: Task 3 Complete - All Phase A Tasks Done*
