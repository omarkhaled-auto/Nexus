# Plans 13-07 & 13-08: Dynamic Replanner + Self-Assessment Engine

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plans:** 13-07 (Dynamic Replanner) + 13-08 (Self-Assessment Engine)
- **Purpose:** Detect task complexity and trigger replanning; enable agents to assess their own progress and blockers
- **Input:**
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` (Plans 13-07 and 13-08 sections)
  - `src/orchestration/context/` (FreshContextManager from Plan 13-04)
  - `src/execution/iteration/` (RalphStyleIterator from Plan 13-06)
  - `src/persistence/memory/code/` (CodeMemory from Plan 13-03)
  - `05_ARCHITECTURE_BLUEPRINT.md` (Nexus 7-layer architecture)
  - `07_NEXUS_MASTER_BOOK.md` (architecture reference)
- **Output:**
  - `src/orchestration/planning/` - Dynamic Replanner module
  - `src/orchestration/assessment/` - Self-Assessment Engine module
- **Philosophy:** When tasks prove more complex than estimated, the system should detect this and adapt. Agents should be able to evaluate their own progress and identify blockers.

## Pre-Requisites
- [ ] Verify Plan 13-04 complete: `src/orchestration/context/` exists with FreshContextManager
- [ ] Verify Plan 13-06 complete: `src/execution/iteration/` exists with RalphStyleIterator
- [ ] Verify Plan 13-03 complete: `src/persistence/memory/code/` exists with CodeMemory
- [ ] Verify Plan 13-01 complete: `src/infrastructure/analysis/` exists with RepoMapGenerator
- [ ] Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Plans 13-07 and 13-08 sections
- [ ] Review existing `src/orchestration/` for orchestration patterns
- [ ] Check for existing NexusCoordinator, TaskDecomposer patterns

## Dependencies on Previous Plans

This combined plan uses:
```typescript
// From Plan 13-01
import { RepoMapGenerator } from '../infrastructure/analysis';

// From Plan 13-03
import { CodeMemory } from '../persistence/memory/code';

// From Plan 13-04
import { FreshContextManager, TaskContext } from '../orchestration/context';

// From Plan 13-06
import { 
  RalphStyleIterator, 
  IterationContext, 
  IterationStatus,
  ErrorEntry 
} from '../execution/iteration';
```

---

## Task Structure Overview

This combined plan has **14 tasks** in 4 parts:

```
PART 1: DYNAMIC REPLANNER (Plan 13-07)
======================================
Task 1: Replanner Types & Interfaces ----> [TASK 1 COMPLETE - types.ts created]
Task 2: DynamicReplanner Core -----------> [TASK 2 COMPLETE - DynamicReplanner.ts + tests created]
Task 3: Trigger Evaluators --------------> [TASK 3 COMPLETE - 5 triggers + tests created]
Task 4: Task Splitter -------------------> [PENDING]
Task 5: Agent Replan Request Tool -------> [PENDING]
Task 6: Coordinator Integration ---------> [PENDING]

PART 2: SELF-ASSESSMENT ENGINE (Plan 13-08)
==========================================
Task 7: Assessment Types & Interfaces ---> [PENDING]
Task 8: SelfAssessmentEngine Core -------> [PENDING]
Task 9: Progress Assessor ---------------> [PENDING]
Task 10: Blocker Detector ---------------> [PENDING]
Task 11: Approach Evaluator -------------> [PENDING]
Task 12: Historical Learner -------------> [PENDING]

PART 3: INTEGRATION
===================
Task 13: Cross-Module Integration -------> [PENDING]

PART 4: FINAL VERIFICATION
==========================
Task 14: Lint & Quality Check -----------> [PENDING]
```

---

# ============================================================================
# PART 1: DYNAMIC REPLANNER (Plan 13-07)
# ============================================================================

# Task 1: Replanner Types & Interfaces

## Objective
Define all TypeScript interfaces and types for the Dynamic Replanner system.

## Requirements

### Part A: Create Directory Structure
- [ ] Create directory: `src/orchestration/planning/`
- [ ] Create subdirectory: `src/orchestration/planning/triggers/`
- [ ] This module lives in Layer 2 (Orchestration) / Layer 3 (Planning)

### Part B: Create Types File
Create `src/orchestration/planning/types.ts`:

- [ ] **ReplanTrigger Type**
  ```typescript
  type ReplanTrigger = 
    | 'time_exceeded'
    | 'iterations_high'
    | 'scope_creep'
    | 'complexity_discovered'
    | 'dependency_discovered'
    | 'blocking_issue'
    | 'agent_request';
  ```

- [ ] **ReplanAction Type**
  ```typescript
  type ReplanAction = 'continue' | 'split' | 'rescope' | 'escalate' | 'abort';
  ```

- [ ] **TriggerThresholds Interface**
  ```typescript
  interface TriggerThresholds {
    timeExceededRatio: number;      // Default: 1.5 (150% of estimate)
    iterationsRatio: number;        // Default: 0.4 (40% of max)
    scopeCreepFiles: number;        // Default: 3 extra files
    consecutiveFailures: number;    // Default: 5
    complexityKeywords: string[];   // Words indicating complexity
  }
  ```

- [ ] **DEFAULT_TRIGGER_THRESHOLDS Constant**
  ```typescript
  const DEFAULT_TRIGGER_THRESHOLDS: TriggerThresholds = {
    timeExceededRatio: 1.5,
    iterationsRatio: 0.4,
    scopeCreepFiles: 3,
    consecutiveFailures: 5,
    complexityKeywords: ['refactor', 'rewrite', 'complex', 'difficult', 'blocked'],
  };
  ```

- [ ] **ExecutionContext Interface**
  ```typescript
  interface ExecutionContext {
    taskId: string;
    taskName: string;
    estimatedTime: number;
    timeElapsed: number;
    iteration: number;
    maxIterations: number;
    filesExpected: string[];
    filesModified: string[];
    errors: ErrorEntry[];
    consecutiveFailures: number;
    agentFeedback?: string;
  }
  ```

- [ ] **ReplanMetrics Interface**
  ```typescript
  interface ReplanMetrics {
    timeElapsed: number;
    estimatedTime: number;
    timeRatio: number;
    iterations: number;
    maxIterations: number;
    iterationRatio: number;
    filesModified: number;
    filesExpected: number;
    scopeCreepCount: number;
    errorsEncountered: number;
    consecutiveFailures: number;
  }
  ```

- [ ] **ReplanReason Interface**
  ```typescript
  interface ReplanReason {
    trigger: ReplanTrigger;
    details: string;
    metrics: ReplanMetrics;
    confidence: number;
  }
  ```

- [ ] **ReplanDecision Interface**
  ```typescript
  interface ReplanDecision {
    shouldReplan: boolean;
    reason?: ReplanReason;
    suggestedAction: ReplanAction;
    confidence: number;
    timestamp: Date;
  }
  ```

- [ ] **ReplanResult Interface**
  ```typescript
  interface ReplanResult {
    success: boolean;
    action: ReplanAction;
    originalTask: Task;
    newTasks?: Task[];
    message: string;
    metrics: ReplanMetrics;
  }
  ```

- [ ] **Task Interface** (if not already defined elsewhere)
  ```typescript
  interface Task {
    id: string;
    name: string;
    description: string;
    files: string[];
    estimatedTime: number;
    dependencies: string[];
    acceptanceCriteria: string[];
    status: TaskStatus;
    parentTaskId?: string;
  }
  ```

- [ ] **TaskStatus Type**
  ```typescript
  type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'split' | 'escalated';
  ```

- [ ] **MonitoredTask Interface**
  ```typescript
  interface MonitoredTask {
    taskId: string;
    startedAt: Date;
    context: ExecutionContext;
    decisions: ReplanDecision[];
    isActive: boolean;
  }
  ```

- [ ] **IDynamicReplanner Interface**
  ```typescript
  interface IDynamicReplanner {
    // Monitoring
    startMonitoring(taskId: string, context: ExecutionContext): void;
    stopMonitoring(taskId: string): void;
    updateContext(taskId: string, context: Partial<ExecutionContext>): void;
    
    // Evaluation
    checkReplanningNeeded(taskId: string): ReplanDecision;
    evaluateAllTriggers(context: ExecutionContext): ReplanDecision;
    
    // Actions
    replan(taskId: string, reason: ReplanReason): Promise<ReplanResult>;
    handleAgentRequest(taskId: string, request: AgentReplanRequest): Promise<ReplanDecision>;
    
    // Configuration
    setThresholds(thresholds: Partial<TriggerThresholds>): void;
    getThresholds(): TriggerThresholds;
    
    // Status
    getMonitoredTasks(): MonitoredTask[];
    getDecisionHistory(taskId: string): ReplanDecision[];
  }
  ```

- [ ] **ITriggerEvaluator Interface**
  ```typescript
  interface ITriggerEvaluator {
    readonly trigger: ReplanTrigger;
    evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult;
  }
  ```

- [ ] **TriggerResult Interface**
  ```typescript
  interface TriggerResult {
    triggered: boolean;
    trigger: ReplanTrigger;
    confidence: number;
    details: string;
    metrics: Partial<ReplanMetrics>;
  }
  ```

- [ ] **ITaskSplitter Interface**
  ```typescript
  interface ITaskSplitter {
    canSplit(task: Task, reason: ReplanReason): boolean;
    split(task: Task, reason: ReplanReason): Promise<Task[]>;
    estimateSubtasks(task: Task): number;
  }
  ```

- [ ] **AgentReplanRequest Interface**
  ```typescript
  interface AgentReplanRequest {
    taskId: string;
    agentId: string;
    reason: string;
    suggestion?: string;
    blockers?: string[];
    complexityDetails?: string;
  }
  ```

- [ ] Export all types

### Task 1 Completion Checklist
- [ ] Directory `src/orchestration/planning/` created
- [ ] Subdirectory `src/orchestration/planning/triggers/` created
- [ ] `types.ts` created with all interfaces (~300 lines)
- [ ] All types properly exported
- [x] TypeScript compiles

**[TASK 1 COMPLETE]** <- Mark when done, proceed to Task 2

---

# Task 2: DynamicReplanner Core

## Objective
Implement the main DynamicReplanner class that monitors tasks and triggers replanning.

## Requirements

### Part A: Create DynamicReplanner Class
Create `src/orchestration/planning/DynamicReplanner.ts`:

- [ ] **DynamicReplanner Class** implementing IDynamicReplanner

- [ ] **Constructor**
  - [ ] Accept array of ITriggerEvaluator implementations
  - [ ] Accept ITaskSplitter
  - [ ] Accept optional thresholds (default to DEFAULT_TRIGGER_THRESHOLDS)
  - [ ] Initialize monitored tasks Map
  - [ ] Initialize decision history Map

- [ ] **startMonitoring(taskId, context) Method**
  - [ ] Create MonitoredTask record
  - [ ] Store in monitored tasks Map
  - [ ] Log monitoring started

- [ ] **stopMonitoring(taskId) Method**
  - [ ] Mark task as inactive
  - [ ] Keep decision history
  - [ ] Log monitoring stopped

- [ ] **updateContext(taskId, partialContext) Method**
  - [ ] Merge with existing context
  - [ ] Automatically call checkReplanningNeeded
  - [ ] Return updated decision if triggered

- [ ] **checkReplanningNeeded(taskId) Method**
  - [ ] Get task context
  - [ ] Call evaluateAllTriggers
  - [ ] Store decision in history
  - [ ] Return ReplanDecision

- [ ] **evaluateAllTriggers(context) Method**
  - [ ] Run all trigger evaluators
  - [ ] Collect triggered results
  - [ ] Determine highest priority trigger
  - [ ] Calculate combined confidence
  - [ ] Determine suggested action
  - [ ] Return ReplanDecision

- [ ] **replan(taskId, reason) Method**
  - [ ] Based on suggested action:
    - 'split': Call TaskSplitter
    - 'rescope': Modify task scope
    - 'escalate': Pause and notify
    - 'abort': Mark task failed
    - 'continue': No action
  - [ ] Update task status
  - [ ] Return ReplanResult

- [ ] **handleAgentRequest(taskId, request) Method**
  - [ ] Create agent_request trigger result
  - [ ] Evaluate combined with current context
  - [ ] Return ReplanDecision

- [ ] **setThresholds(thresholds) Method**
  - [ ] Merge with current thresholds

- [ ] **getThresholds() Method**
  - [ ] Return current thresholds

- [ ] **getMonitoredTasks() Method**
  - [ ] Return array of MonitoredTask

- [ ] **getDecisionHistory(taskId) Method**
  - [ ] Return decisions for task

**Private Helper Methods:**
- [ ] **determineSuggestedAction(triggers) Private Method**
  - [ ] If blocking_issue or agent_request with blockers -> 'escalate'
  - [ ] If scope_creep or complexity_discovered -> 'split'
  - [ ] If time_exceeded or iterations_high -> 'split' or 'rescope'
  - [ ] Otherwise -> 'continue'

- [ ] **calculateCombinedConfidence(triggers) Private Method**
  - [ ] Average confidence of triggered evaluators
  - [ ] Weight by trigger severity

- [ ] **findHighestPriorityTrigger(triggers) Private Method**
  - [ ] Priority: blocking_issue > agent_request > scope_creep > time_exceeded > iterations_high

### Part B: Create Tests
Create `src/orchestration/planning/DynamicReplanner.test.ts`:

- [ ] Test monitoring start/stop
- [ ] Test context updates
- [ ] Test trigger evaluation
- [ ] Test replan decision making
- [ ] Test agent request handling
- [ ] Test threshold configuration

### Task 2 Completion Checklist
- [x] `DynamicReplanner.ts` created (~350 lines) - DONE (467 lines)
- [x] `DynamicReplanner.test.ts` created (~200 lines) - DONE (366 lines)
- [x] All tests pass - 28 tests passing
- [x] TypeScript compiles - No lint errors

**[TASK 2 COMPLETE]** - Proceed to Task 3

---

# Task 3: Trigger Evaluators

## Objective
Implement individual trigger evaluators for each replan trigger type.

## Requirements

### Part A: Create TimeExceededTrigger
Create `src/orchestration/planning/triggers/TimeExceededTrigger.ts`:

- [ ] **TimeExceededTrigger Class** implementing ITriggerEvaluator
- [ ] `trigger` property returns 'time_exceeded'
- [ ] **evaluate(context, thresholds) Method**
  - [ ] Calculate timeRatio = timeElapsed / estimatedTime
  - [ ] If timeRatio > thresholds.timeExceededRatio -> triggered
  - [ ] Calculate confidence based on how much over
  - [ ] Return TriggerResult

### Part B: Create IterationsTrigger
Create `src/orchestration/planning/triggers/IterationsTrigger.ts`:

- [ ] **IterationsTrigger Class** implementing ITriggerEvaluator
- [ ] `trigger` property returns 'iterations_high'
- [ ] **evaluate(context, thresholds) Method**
  - [ ] Calculate iterationRatio = iteration / maxIterations
  - [ ] If iterationRatio > thresholds.iterationsRatio -> triggered
  - [ ] Higher confidence as ratio approaches 1.0
  - [ ] Return TriggerResult

### Part C: Create ScopeCreepTrigger
Create `src/orchestration/planning/triggers/ScopeCreepTrigger.ts`:

- [ ] **ScopeCreepTrigger Class** implementing ITriggerEvaluator
- [ ] `trigger` property returns 'scope_creep'
- [ ] **evaluate(context, thresholds) Method**
  - [ ] Find files modified that weren't expected
  - [ ] If count > thresholds.scopeCreepFiles -> triggered
  - [ ] List unexpected files in details
  - [ ] Return TriggerResult

### Part D: Create ConsecutiveFailuresTrigger
Create `src/orchestration/planning/triggers/ConsecutiveFailuresTrigger.ts`:

- [ ] **ConsecutiveFailuresTrigger Class** implementing ITriggerEvaluator
- [ ] `trigger` property returns 'blocking_issue'
- [ ] **evaluate(context, thresholds) Method**
  - [ ] If consecutiveFailures > thresholds.consecutiveFailures -> triggered
  - [ ] Analyze error patterns
  - [ ] Return TriggerResult

### Part E: Create ComplexityTrigger
Create `src/orchestration/planning/triggers/ComplexityTrigger.ts`:

- [ ] **ComplexityTrigger Class** implementing ITriggerEvaluator
- [ ] `trigger` property returns 'complexity_discovered'
- [ ] **evaluate(context, thresholds) Method**
  - [ ] Check agentFeedback for complexity keywords
  - [ ] Check error messages for complexity indicators
  - [ ] Return TriggerResult

### Part F: Create Triggers Index
Create `src/orchestration/planning/triggers/index.ts`:

- [ ] Export all trigger classes
- [ ] Export factory: `createAllTriggers()`

### Part G: Create Tests
Create `src/orchestration/planning/triggers/triggers.test.ts`:

- [ ] Test TimeExceededTrigger
- [ ] Test IterationsTrigger
- [ ] Test ScopeCreepTrigger
- [ ] Test ConsecutiveFailuresTrigger
- [ ] Test ComplexityTrigger
- [ ] Test with various threshold configurations

### Task 3 Completion Checklist (DONE)
- [x] `TimeExceededTrigger.ts` created (75 lines)
- [x] `IterationsTrigger.ts` created (69 lines)
- [x] `ScopeCreepTrigger.ts` created (92 lines)
- [x] `ConsecutiveFailuresTrigger.ts` created (107 lines)
- [x] `ComplexityTrigger.ts` created (117 lines)
- [x] `triggers/index.ts` created (36 lines)
- [x] `triggers.test.ts` created (566 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 3 COMPLETE]** - All 5 triggers implemented with 37 passing tests

---

# Task 4: Task Splitter

## Objective
Implement task splitting logic for when tasks need to be decomposed.

## Requirements

### Part A: Create TaskSplitter Class
Create `src/orchestration/planning/TaskSplitter.ts`:

- [ ] **TaskSplitter Class** implementing ITaskSplitter

- [ ] **Constructor**
  - [ ] Accept optional LLM client for intelligent splitting
  - [ ] Accept CodeMemory for code understanding (Plan 13-03)

- [ ] **canSplit(task, reason) Method**
  - [ ] Check task has enough scope to split
  - [ ] Check reason indicates splittable issue
  - [ ] Return boolean

- [ ] **split(task, reason) Method**
  - [ ] Analyze task based on reason.trigger:
    - scope_creep: Split by file groups
    - complexity_discovered: Split by functionality
    - time_exceeded: Split by estimated time
  - [ ] Create subtasks with:
    - New IDs (parentTaskId set to original)
    - Subset of files
    - Proportional time estimates
    - Dependency chain between subtasks
  - [ ] Return Task[]

- [ ] **estimateSubtasks(task) Method**
  - [ ] Based on file count, estimate 2-5 subtasks
  - [ ] Return suggested count

- [ ] **splitByFiles(task, fileGroups) Private Method**
  - [ ] Group related files together
  - [ ] Create task per group

- [ ] **splitByFunctionality(task) Private Method**
  - [ ] Use CodeMemory to understand code structure
  - [ ] Split into logical units

- [ ] **generateSubtaskName(original, index, focus) Private Method**
  - [ ] Create descriptive name like "Task-A Part 1: Setup"

- [ ] **distributeAcceptanceCriteria(original, subtasks) Private Method**
  - [ ] Assign relevant criteria to each subtask

### Part B: Create Tests
Create `src/orchestration/planning/TaskSplitter.test.ts`:

- [ ] Test canSplit detection
- [ ] Test splitting by files
- [ ] Test splitting by functionality
- [ ] Test subtask generation
- [ ] Test dependency chain creation
- [ ] Test acceptance criteria distribution

### Task 4 Completion Checklist
- [ ] `TaskSplitter.ts` created (~250 lines)
- [ ] `TaskSplitter.test.ts` created (~150 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 4 COMPLETE]** <- Mark when done, proceed to Task 5

---

# Task 5: Agent Replan Request Tool

## Objective
Create the tool that agents can use to request replanning.

## Requirements

### Part A: Create RequestReplanTool
Create `src/execution/tools/RequestReplanTool.ts`:

- [ ] **REQUEST_REPLAN_TOOL_DEFINITION Constant**
  ```typescript
  const REQUEST_REPLAN_TOOL_DEFINITION = {
    name: 'request_replan',
    description: 'Request task replanning when you discover the task is more complex than expected, encounter blockers, or believe the task should be split into smaller parts.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Detailed explanation of why replanning is needed'
        },
        suggestion: {
          type: 'string',
          description: 'Your suggestion for how the task could be split or rescoped'
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific blockers preventing progress'
        },
        complexity_details: {
          type: 'string',
          description: 'Details about discovered complexity'
        },
        affected_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files that are affected by the complexity'
        }
      },
      required: ['reason']
    }
  };
  ```

- [ ] **RequestReplanToolHandler Class**
  - [ ] Constructor accepts DynamicReplanner
  - [ ] execute(agentId, taskId, params) method
  - [ ] Validates parameters
  - [ ] Creates AgentReplanRequest
  - [ ] Calls replanner.handleAgentRequest
  - [ ] Formats response for agent

- [ ] **createRequestReplanTool(replanner) Factory Function**
  - [ ] Creates handler with replanner
  - [ ] Returns tool definition + handler

### Part B: Create Tests
Create `src/execution/tools/RequestReplanTool.test.ts`:

- [ ] Test tool definition structure
- [ ] Test parameter validation
- [ ] Test execution routing
- [ ] Test response formatting

### Task 5 Completion Checklist
- [ ] `RequestReplanTool.ts` created (~150 lines)
- [ ] `RequestReplanTool.test.ts` created (~100 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 5 COMPLETE]** <- Mark when done, proceed to Task 6

---

# Task 6: Coordinator Integration

## Objective
Create integration points for the replanner with the orchestration system.

## Requirements

### Part A: Create ReplannerIntegration Module
Create `src/orchestration/planning/ReplannerIntegration.ts`:

- [ ] **ReplannerIntegration Class**
  - [ ] Wraps DynamicReplanner
  - [ ] Provides hooks for NexusCoordinator

- [ ] **Constructor**
  - [ ] Accept DynamicReplanner
  - [ ] Accept event emitter for notifications

- [ ] **onTaskStarted(taskId, task) Method**
  - [ ] Start monitoring the task
  - [ ] Create initial ExecutionContext

- [ ] **onIterationComplete(taskId, iterationResult) Method**
  - [ ] Update context with iteration data
  - [ ] Check for replanning
  - [ ] Return ReplanDecision

- [ ] **onTaskCompleted(taskId, success) Method**
  - [ ] Stop monitoring
  - [ ] Log final metrics

- [ ] **onAgentFeedback(taskId, feedback) Method**
  - [ ] Update context with feedback
  - [ ] Check for complexity triggers

- [ ] **handleReplanDecision(decision) Method**
  - [ ] If shouldReplan, execute replan
  - [ ] Emit appropriate events
  - [ ] Return result

### Part B: Create Index File
Create `src/orchestration/planning/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export DynamicReplanner
- [ ] Export TaskSplitter
- [ ] Export ReplannerIntegration
- [ ] Export all triggers
- [ ] Export factory: `createDynamicReplanner()`

### Part C: Create Tests
Create `src/orchestration/planning/ReplannerIntegration.test.ts`:

- [ ] Test task lifecycle hooks
- [ ] Test iteration handling
- [ ] Test replan decision handling
- [ ] Test event emission

### Task 6 Completion Checklist
- [ ] `ReplannerIntegration.ts` created (~200 lines)
- [ ] `index.ts` created (~50 lines)
- [ ] `ReplannerIntegration.test.ts` created (~150 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 6 COMPLETE]** <- Mark when done, proceed to Task 7

---

# ============================================================================
# PART 2: SELF-ASSESSMENT ENGINE (Plan 13-08)
# ============================================================================

# Task 7: Assessment Types & Interfaces

## Objective
Define all TypeScript interfaces for the Self-Assessment Engine.

## Requirements

### Part A: Create Directory Structure
- [ ] Create directory: `src/orchestration/assessment/`
- [ ] This module lives in Layer 2 (Orchestration)

### Part B: Create Types File
Create `src/orchestration/assessment/types.ts`:

- [ ] **AssessmentType Type**
  ```typescript
  type AssessmentType = 'progress' | 'blockers' | 'approach';
  ```

- [ ] **EffectivenessLevel Type**
  ```typescript
  type EffectivenessLevel = 'working' | 'struggling' | 'stuck' | 'wrong_direction';
  ```

- [ ] **BlockerType Type**
  ```typescript
  type BlockerType = 'technical' | 'dependency' | 'unclear_requirement' | 'external' | 'knowledge_gap';
  ```

- [ ] **BlockerSeverity Type**
  ```typescript
  type BlockerSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';
  ```

- [ ] **RecommendedAction Type**
  ```typescript
  type RecommendedAction = 'continue' | 'try_alternative' | 'request_help' | 'split_task' | 'abort';
  ```

- [ ] **RiskType Type**
  ```typescript
  type RiskType = 'technical' | 'scope' | 'time' | 'quality';
  ```

- [ ] **ProgressAssessment Interface**
  ```typescript
  interface ProgressAssessment {
    taskId: string;
    completionEstimate: number;     // 0.0 - 1.0
    confidence: number;             // 0.0 - 1.0
    remainingWork: string[];
    completedWork: string[];
    blockers: string[];
    risks: Risk[];
    estimatedRemainingTime: number;
    assessedAt: Date;
  }
  ```

- [ ] **Risk Interface**
  ```typescript
  interface Risk {
    type: RiskType;
    description: string;
    probability: number;    // 0.0 - 1.0
    impact: number;         // 0.0 - 1.0
    riskScore: number;      // probability * impact
    mitigation?: string;
  }
  ```

- [ ] **Blocker Interface**
  ```typescript
  interface Blocker {
    id: string;
    type: BlockerType;
    description: string;
    affectedFiles: string[];
    possibleSolutions: string[];
    needsHuman: boolean;
    detectedAt: Date;
  }
  ```

- [ ] **BlockerAssessment Interface**
  ```typescript
  interface BlockerAssessment {
    taskId: string;
    blockers: Blocker[];
    severity: BlockerSeverity;
    canProceed: boolean;
    suggestedActions: string[];
    assessedAt: Date;
  }
  ```

- [ ] **AlternativeApproach Interface**
  ```typescript
  interface AlternativeApproach {
    id: string;
    description: string;
    pros: string[];
    cons: string[];
    estimatedEffort: number;    // in minutes
    confidence: number;         // 0.0 - 1.0
    requiredChanges: string[];
  }
  ```

- [ ] **ApproachAssessment Interface**
  ```typescript
  interface ApproachAssessment {
    taskId: string;
    currentApproach: string;
    effectiveness: EffectivenessLevel;
    confidence: number;
    alternatives: AlternativeApproach[];
    recommendation: string;
    assessedAt: Date;
  }
  ```

- [ ] **Recommendation Interface**
  ```typescript
  interface Recommendation {
    action: RecommendedAction;
    reason: string;
    details: string;
    confidence: number;
    priority: number;       // 1-5, 1 is highest
  }
  ```

- [ ] **TaskOutcome Interface**
  ```typescript
  interface TaskOutcome {
    taskId: string;
    success: boolean;
    approach: string;
    iterations: number;
    timeSpent: number;
    blockers: string[];
    lessonsLearned: string[];
    completedAt: Date;
  }
  ```

- [ ] **HistoricalInsight Interface**
  ```typescript
  interface HistoricalInsight {
    pattern: string;
    taskType: string;
    successRate: number;
    averageIterations: number;
    averageTime: number;
    commonBlockers: string[];
    recommendedApproach: string;
    sampleSize: number;
  }
  ```

- [ ] **AssessmentContext Interface**
  ```typescript
  interface AssessmentContext {
    taskId: string;
    taskName: string;
    taskDescription: string;
    taskFiles: string[];
    iterationHistory: IterationHistoryEntry[];
    currentErrors: ErrorEntry[];
    agentFeedback?: string;
    codeChanges?: string;
  }
  ```

- [ ] **ISelfAssessmentEngine Interface**
  ```typescript
  interface ISelfAssessmentEngine {
    // Assessment
    assessProgress(taskId: string, context: AssessmentContext): Promise<ProgressAssessment>;
    assessBlockers(taskId: string, context: AssessmentContext): Promise<BlockerAssessment>;
    assessApproach(taskId: string, context: AssessmentContext): Promise<ApproachAssessment>;
    
    // Recommendations
    recommendNextStep(taskId: string): Promise<Recommendation>;
    recommendAlternativeApproach(taskId: string): Promise<AlternativeApproach[]>;
    
    // Learning
    recordOutcome(outcome: TaskOutcome): Promise<void>;
    getHistoricalInsights(taskType: string): Promise<HistoricalInsight[]>;
    
    // Combined
    getFullAssessment(taskId: string, context: AssessmentContext): Promise<FullAssessment>;
  }
  ```

- [ ] **FullAssessment Interface**
  ```typescript
  interface FullAssessment {
    taskId: string;
    progress: ProgressAssessment;
    blockers: BlockerAssessment;
    approach: ApproachAssessment;
    recommendation: Recommendation;
    assessedAt: Date;
  }
  ```

- [ ] **IProgressAssessor Interface**
  ```typescript
  interface IProgressAssessor {
    assess(context: AssessmentContext): Promise<ProgressAssessment>;
  }
  ```

- [ ] **IBlockerDetector Interface**
  ```typescript
  interface IBlockerDetector {
    detect(context: AssessmentContext): Promise<BlockerAssessment>;
  }
  ```

- [ ] **IApproachEvaluator Interface**
  ```typescript
  interface IApproachEvaluator {
    evaluate(context: AssessmentContext): Promise<ApproachAssessment>;
  }
  ```

- [ ] **IHistoricalLearner Interface**
  ```typescript
  interface IHistoricalLearner {
    recordOutcome(outcome: TaskOutcome): Promise<void>;
    getInsights(taskType: string): Promise<HistoricalInsight[]>;
    findSimilarTasks(taskDescription: string): Promise<TaskOutcome[]>;
  }
  ```

- [ ] Export all types

### Task 7 Completion Checklist
- [ ] Directory `src/orchestration/assessment/` created
- [ ] `types.ts` created with all interfaces (~350 lines)
- [ ] All types properly exported
- [x] TypeScript compiles

**[TASK 7 COMPLETE]** <- Mark when done, proceed to Task 8

---

# Task 8: SelfAssessmentEngine Core

## Objective
Implement the main SelfAssessmentEngine class.

## Requirements

### Part A: Create SelfAssessmentEngine Class
Create `src/orchestration/assessment/SelfAssessmentEngine.ts`:

- [ ] **SelfAssessmentEngine Class** implementing ISelfAssessmentEngine

- [ ] **Constructor**
  - [ ] Accept IProgressAssessor
  - [ ] Accept IBlockerDetector
  - [ ] Accept IApproachEvaluator
  - [ ] Accept IHistoricalLearner
  - [ ] Accept optional LLM client for AI-powered assessments
  - [ ] Initialize assessment cache

- [ ] **assessProgress(taskId, context) Method**
  - [ ] Delegate to ProgressAssessor
  - [ ] Cache result
  - [ ] Return ProgressAssessment

- [ ] **assessBlockers(taskId, context) Method**
  - [ ] Delegate to BlockerDetector
  - [ ] Cache result
  - [ ] Return BlockerAssessment

- [ ] **assessApproach(taskId, context) Method**
  - [ ] Delegate to ApproachEvaluator
  - [ ] Cache result
  - [ ] Return ApproachAssessment

- [ ] **recommendNextStep(taskId) Method**
  - [ ] Get cached assessments or recalculate
  - [ ] Combine progress, blockers, approach into recommendation
  - [ ] Return Recommendation

- [ ] **recommendAlternativeApproach(taskId) Method**
  - [ ] Get approach assessment
  - [ ] Return alternatives sorted by confidence

- [ ] **recordOutcome(outcome) Method**
  - [ ] Delegate to HistoricalLearner
  - [ ] Clear caches for task

- [ ] **getHistoricalInsights(taskType) Method**
  - [ ] Delegate to HistoricalLearner
  - [ ] Return HistoricalInsight[]

- [ ] **getFullAssessment(taskId, context) Method**
  - [ ] Run all assessments
  - [ ] Generate recommendation
  - [ ] Return FullAssessment

**Private Helper Methods:**
- [ ] **combineIntoRecommendation(progress, blockers, approach) Private Method**
  - [ ] If blockers.severity is critical -> 'request_help'
  - [ ] If approach.effectiveness is stuck -> 'try_alternative'
  - [ ] If progress.completionEstimate > 0.8 -> 'continue'
  - [ ] etc.

- [ ] **getCachedAssessment(taskId, type) Private Method**
  - [ ] Return cached if fresh (< 5 min old)

- [ ] **invalidateCache(taskId) Private Method**
  - [ ] Clear all cached assessments for task

### Part B: Create Tests
Create `src/orchestration/assessment/SelfAssessmentEngine.test.ts`:

- [ ] Test progress assessment
- [ ] Test blocker assessment
- [ ] Test approach assessment
- [ ] Test recommendation generation
- [ ] Test historical insights
- [ ] Test caching behavior

### Task 8 Completion Checklist
- [ ] `SelfAssessmentEngine.ts` created (~300 lines)
- [ ] `SelfAssessmentEngine.test.ts` created (~200 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 8 COMPLETE]** <- Mark when done, proceed to Task 9

---

# Task 9: Progress Assessor

## Objective
Implement progress estimation logic.

## Requirements

### Part A: Create ProgressAssessor Class
Create `src/orchestration/assessment/ProgressAssessor.ts`:

- [ ] **ProgressAssessor Class** implementing IProgressAssessor

- [ ] **Constructor**
  - [ ] Accept optional LLM client for AI-powered estimation

- [ ] **assess(context) Method**
  - [ ] Calculate completion from multiple signals
  - [ ] Identify remaining work
  - [ ] Identify completed work
  - [ ] Detect blockers from errors
  - [ ] Assess risks
  - [ ] Return ProgressAssessment

- [ ] **calculateCompletionEstimate(context) Private Method**
  - [ ] Consider: iteration progress, test pass rate, error reduction, files touched vs expected
  - [ ] Return 0.0 - 1.0

- [ ] **identifyRemainingWork(context) Private Method**
  - [ ] Analyze acceptance criteria not yet met
  - [ ] Analyze files not yet modified
  - [ ] Return string[]

- [ ] **identifyCompletedWork(context) Private Method**
  - [ ] Analyze passing tests
  - [ ] Analyze completed criteria
  - [ ] Return string[]

- [ ] **assessRisks(context, completionEstimate) Private Method**
  - [ ] Time risk: if estimate low but time high
  - [ ] Technical risk: if many errors
  - [ ] Scope risk: if unexpected files
  - [ ] Return Risk[]

- [ ] **calculateConfidence(context) Private Method**
  - [ ] Higher confidence with more iterations
  - [ ] Lower confidence with high error variance
  - [ ] Return 0.0 - 1.0

### Part B: Create Tests
Create `src/orchestration/assessment/ProgressAssessor.test.ts`:

- [ ] Test completion estimation
- [ ] Test remaining work identification
- [ ] Test risk assessment
- [ ] Test confidence calculation
- [ ] Test with various scenarios

### Task 9 Completion Checklist
- [ ] `ProgressAssessor.ts` created (~200 lines)
- [ ] `ProgressAssessor.test.ts` created (~150 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 9 COMPLETE]** <- Mark when done, proceed to Task 10

---

# Task 10: Blocker Detector

## Objective
Implement blocker detection and categorization.

## Requirements

### Part A: Create BlockerDetector Class
Create `src/orchestration/assessment/BlockerDetector.ts`:

- [ ] **BlockerDetector Class** implementing IBlockerDetector

- [ ] **Constructor**
  - [ ] Initialize blocker patterns

- [ ] **detect(context) Method**
  - [ ] Analyze errors for blocker patterns
  - [ ] Analyze agent feedback
  - [ ] Categorize blockers by type
  - [ ] Assess severity
  - [ ] Determine if can proceed
  - [ ] Suggest actions
  - [ ] Return BlockerAssessment

- [ ] **detectTechnicalBlockers(context) Private Method**
  - [ ] Build failures
  - [ ] Type errors
  - [ ] Import issues
  - [ ] Return Blocker[]

- [ ] **detectDependencyBlockers(context) Private Method**
  - [ ] Missing dependencies
  - [ ] Version conflicts
  - [ ] Circular dependencies
  - [ ] Return Blocker[]

- [ ] **detectRequirementBlockers(context) Private Method**
  - [ ] Unclear or contradictory requirements
  - [ ] Missing information
  - [ ] Return Blocker[]

- [ ] **detectKnowledgeGapBlockers(context) Private Method**
  - [ ] Unfamiliar patterns
  - [ ] Complex domains
  - [ ] Return Blocker[]

- [ ] **assessSeverity(blockers) Private Method**
  - [ ] No blockers -> 'none'
  - [ ] All solvable -> 'low' or 'medium'
  - [ ] Any needsHuman -> 'high' or 'critical'
  - [ ] Return BlockerSeverity

- [ ] **suggestSolutions(blocker) Private Method**
  - [ ] Based on blocker type, suggest actions
  - [ ] Return string[]

- [ ] **determineIfNeedsHuman(blocker) Private Method**
  - [ ] Unclear requirements -> true
  - [ ] External dependencies -> true
  - [ ] Complex technical -> maybe
  - [ ] Return boolean

### Part B: Create Tests
Create `src/orchestration/assessment/BlockerDetector.test.ts`:

- [ ] Test technical blocker detection
- [ ] Test dependency blocker detection
- [ ] Test requirement blocker detection
- [ ] Test severity assessment
- [ ] Test solution suggestions

### Task 10 Completion Checklist
- [ ] `BlockerDetector.ts` created (~250 lines)
- [ ] `BlockerDetector.test.ts` created (~150 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 10 COMPLETE]** <- Mark when done, proceed to Task 11

---

# Task 11: Approach Evaluator

## Objective
Implement current approach evaluation and alternative generation.

## Requirements

### Part A: Create ApproachEvaluator Class
Create `src/orchestration/assessment/ApproachEvaluator.ts`:

- [ ] **ApproachEvaluator Class** implementing IApproachEvaluator

- [ ] **Constructor**
  - [ ] Accept optional LLM client for AI-powered evaluation
  - [ ] Accept CodeMemory for code understanding (Plan 13-03)

- [ ] **evaluate(context) Method**
  - [ ] Analyze current approach from code changes
  - [ ] Determine effectiveness level
  - [ ] Generate alternatives if struggling/stuck
  - [ ] Make recommendation
  - [ ] Return ApproachAssessment

- [ ] **determineEffectiveness(context) Private Method**
  - [ ] 'working': Errors decreasing, tests passing
  - [ ] 'struggling': Errors fluctuating, slow progress
  - [ ] 'stuck': Same errors repeating, no progress
  - [ ] 'wrong_direction': Errors increasing, scope creep
  - [ ] Return EffectivenessLevel

- [ ] **inferCurrentApproach(context) Private Method**
  - [ ] Analyze what files are being changed
  - [ ] Analyze patterns in changes
  - [ ] Return description string

- [ ] **generateAlternatives(context, currentApproach) Private Method**
  - [ ] Based on error patterns, suggest different approaches
  - [ ] Use CodeMemory to find similar successful patterns
  - [ ] Return AlternativeApproach[]

- [ ] **evaluateAlternative(alternative, context) Private Method**
  - [ ] Estimate effort
  - [ ] List pros and cons
  - [ ] Calculate confidence

- [ ] **makeRecommendation(effectiveness, alternatives) Private Method**
  - [ ] If working: "Continue current approach"
  - [ ] If struggling: "Consider [best alternative]"
  - [ ] If stuck: "Try [best alternative] or request help"
  - [ ] Return string

### Part B: Create Tests
Create `src/orchestration/assessment/ApproachEvaluator.test.ts`:

- [ ] Test effectiveness determination
- [ ] Test approach inference
- [ ] Test alternative generation
- [ ] Test recommendation making
- [ ] Test with various scenarios

### Task 11 Completion Checklist
- [ ] `ApproachEvaluator.ts` created (~250 lines)
- [ ] `ApproachEvaluator.test.ts` created (~150 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 11 COMPLETE]** <- Mark when done, proceed to Task 12

---

# Task 12: Historical Learner

## Objective
Implement learning from past task outcomes.

## Requirements

### Part A: Create HistoricalLearner Class
Create `src/orchestration/assessment/HistoricalLearner.ts`:

- [ ] **HistoricalLearner Class** implementing IHistoricalLearner

- [ ] **Constructor**
  - [ ] Accept database/storage for outcomes
  - [ ] Accept CodeMemory for similarity search (Plan 13-03)

- [ ] **recordOutcome(outcome) Method**
  - [ ] Validate outcome data
  - [ ] Store in database
  - [ ] Update aggregated insights

- [ ] **getInsights(taskType) Method**
  - [ ] Query outcomes by task type
  - [ ] Calculate success rate
  - [ ] Calculate average iterations
  - [ ] Find common blockers
  - [ ] Determine recommended approach
  - [ ] Return HistoricalInsight[]

- [ ] **findSimilarTasks(taskDescription) Method**
  - [ ] Use CodeMemory to find semantically similar tasks
  - [ ] Return past TaskOutcome[]

- [ ] **calculateSuccessRate(outcomes) Private Method**
  - [ ] Count successful / total
  - [ ] Return rate 0.0 - 1.0

- [ ] **findCommonBlockers(outcomes) Private Method**
  - [ ] Aggregate all blockers
  - [ ] Find most frequent
  - [ ] Return top blockers

- [ ] **determineRecommendedApproach(outcomes) Private Method**
  - [ ] Find approach with highest success rate
  - [ ] Return approach description

- [ ] **classifyTaskType(task) Private Method**
  - [ ] Based on files, description, etc.
  - [ ] Return task type string

### Part B: Create Index File
Create `src/orchestration/assessment/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export SelfAssessmentEngine
- [ ] Export ProgressAssessor
- [ ] Export BlockerDetector
- [ ] Export ApproachEvaluator
- [ ] Export HistoricalLearner
- [ ] Export factory: `createSelfAssessmentEngine()`

### Part C: Create Tests
Create `src/orchestration/assessment/HistoricalLearner.test.ts`:

- [ ] Test outcome recording
- [ ] Test insight generation
- [ ] Test similar task finding
- [ ] Test success rate calculation
- [ ] Test common blocker detection

### Task 12 Completion Checklist
- [ ] `HistoricalLearner.ts` created (~200 lines)
- [ ] `HistoricalLearner.test.ts` created (~150 lines)
- [ ] `index.ts` created (~50 lines)
- [x] All tests pass (37 tests)
- [x] TypeScript compiles

**[TASK 12 COMPLETE]** <- Mark when done, proceed to Task 13

---

# ============================================================================
# PART 3: INTEGRATION
# ============================================================================

# Task 13: Cross-Module Integration

## Objective
Ensure Dynamic Replanner and Self-Assessment Engine work together.

## Requirements

### Part A: Integration Points
Verify these integration points work:

- [ ] **DynamicReplanner uses SelfAssessmentEngine:**
  - Uses blocker assessment for blocking_issue trigger
  - Uses progress assessment for time estimation
  - Uses approach assessment for complexity detection

- [ ] **SelfAssessmentEngine uses RalphStyleIterator (Plan 13-06):**
  - Gets iteration history for assessment
  - Gets error context for blocker detection

- [ ] **Both use CodeMemory (Plan 13-03):**
  - For code understanding
  - For similar task finding

### Part B: Create AssessmentReplannerBridge
Create `src/orchestration/AssessmentReplannerBridge.ts`:

- [ ] **AssessmentReplannerBridge Class**
  - [ ] Connects DynamicReplanner and SelfAssessmentEngine
  - [ ] Provides unified interface

- [ ] **assessAndCheckReplan(taskId, context) Method**
  - [ ] Get full assessment
  - [ ] Check replanning triggers
  - [ ] If blocker critical, trigger replan
  - [ ] Return combined result

- [ ] **onAssessmentComplete(assessment) Method**
  - [ ] Update replanner context with assessment data

### Part C: Create E2E Integration Test
Create `src/orchestration/integration.test.ts`:

- [ ] Test full assessment -> replan cycle:
  1. Create task
  2. Run iterations (mock)
  3. Assessment detects blockers
  4. Replanner triggers
  5. Task is split
  6. Record outcomes

- [ ] Test historical learning improving future assessments

### Part D: Update Parent Exports
Update `src/orchestration/index.ts` (create if needed):
- [ ] Add export for planning module: `export * from './planning'`
- [ ] Add export for assessment module: `export * from './assessment'`
- [ ] Add export for bridge: `export * from './AssessmentReplannerBridge'`

### Part E: Create README Files
Create `src/orchestration/planning/README.md`:
- [ ] Document Dynamic Replanner
- [ ] Trigger types and thresholds
- [ ] Task splitting behavior
- [ ] Agent replan tool usage

Create `src/orchestration/assessment/README.md`:
- [ ] Document Self-Assessment Engine
- [ ] Assessment types
- [ ] Historical learning
- [ ] Integration with replanner

### Task 13 Completion Checklist
- [ ] Integration points verified
- [ ] `AssessmentReplannerBridge.ts` created (~150 lines)
- [ ] `integration.test.ts` created (~200 lines)
- [ ] Parent exports updated
- [ ] README files created
- [ ] All integration tests pass

**[TASK 13 COMPLETE]** <- Mark when done, proceed to Task 14

---

# ============================================================================
# PART 4: FINAL VERIFICATION
# ============================================================================

# Task 14: Lint & Quality Check

## Objective
Ensure all code passes linting and quality checks before completion.

## Requirements

### Part A: Run Auto-fix
- [ ] Run: `npm run lint -- --fix`
- [ ] Note how many errors were auto-fixed

### Part B: Fix Remaining Lint Errors

Common issues to fix:

**`no-unused-vars`:**
- [ ] Remove unused imports
- [ ] Prefix unused parameters with underscore: `_param`
- [ ] Remove unused variables

**`restrict-template-expressions`:**
- [ ] Use String() for non-strings in templates
- [ ] Use ?? for possibly undefined values
- [ ] Use .join() for arrays

**`no-unsafe-*`:**
- [ ] Add proper types instead of `any`
- [ ] Use type guards where needed
- [ ] Add targeted suppressions only when unavoidable (with comment)

### Part C: Fix Files Systematically

Dynamic Replanner files:
- [ ] `src/orchestration/planning/types.ts`
- [ ] `src/orchestration/planning/DynamicReplanner.ts`
- [ ] `src/orchestration/planning/TaskSplitter.ts`
- [ ] `src/orchestration/planning/ReplannerIntegration.ts`
- [ ] `src/orchestration/planning/triggers/*.ts`
- [ ] `src/orchestration/planning/index.ts`

Self-Assessment Engine files:
- [ ] `src/orchestration/assessment/types.ts`
- [ ] `src/orchestration/assessment/SelfAssessmentEngine.ts`
- [ ] `src/orchestration/assessment/ProgressAssessor.ts`
- [ ] `src/orchestration/assessment/BlockerDetector.ts`
- [ ] `src/orchestration/assessment/ApproachEvaluator.ts`
- [ ] `src/orchestration/assessment/HistoricalLearner.ts`
- [ ] `src/orchestration/assessment/index.ts`

Tool files:
- [ ] `src/execution/tools/RequestReplanTool.ts`

Bridge file:
- [ ] `src/orchestration/AssessmentReplannerBridge.ts`

Test files:
- [ ] All `*.test.ts` files

### Part D: Final Verification
- [ ] Run: `npm run lint`
  - Expected: 0 errors

- [ ] Run: `npm run build`
  - Expected: Success, no errors

- [ ] Run: `npm test src/orchestration/planning/`
  - Expected: All tests pass

- [ ] Run: `npm test src/orchestration/assessment/`
  - Expected: All tests pass

- [ ] Run: `npm test src/execution/tools/RequestReplanTool`
  - Expected: All tests pass

- [ ] Run full test suite: `npm test`
  - Expected: All existing tests still pass (no regressions)

### Task 14 Completion Checklist
- [ ] Auto-fix applied
- [ ] All lint errors manually fixed
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All Dynamic Replanner tests pass
- [ ] All Self-Assessment tests pass
- [ ] Full test suite passes (no regressions)

**[TASK 14 COMPLETE]**

---

## Output File Structure

After completion:

```
src/orchestration/planning/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~300 lines)
|-- README.md                         # Documentation (~150 lines)
|-- DynamicReplanner.ts               # Core replanner (~350 lines)
|-- DynamicReplanner.test.ts          # Tests (~200 lines)
|-- TaskSplitter.ts                   # Task splitting (~250 lines)
|-- TaskSplitter.test.ts              # Tests (~150 lines)
|-- ReplannerIntegration.ts           # Coordinator hooks (~200 lines)
|-- ReplannerIntegration.test.ts      # Tests (~150 lines)
|-- triggers/
    |-- index.ts                      # Trigger exports (~30 lines)
    |-- TimeExceededTrigger.ts        # (~60 lines)
    |-- IterationsTrigger.ts          # (~60 lines)
    |-- ScopeCreepTrigger.ts          # (~80 lines)
    |-- ConsecutiveFailuresTrigger.ts # (~70 lines)
    |-- ComplexityTrigger.ts          # (~80 lines)
    |-- triggers.test.ts              # Tests (~200 lines)
                                      --------------------------
                                      Subtotal: ~2,380 lines

src/orchestration/assessment/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~350 lines)
|-- README.md                         # Documentation (~150 lines)
|-- SelfAssessmentEngine.ts           # Core engine (~300 lines)
|-- SelfAssessmentEngine.test.ts      # Tests (~200 lines)
|-- ProgressAssessor.ts               # Progress estimation (~200 lines)
|-- ProgressAssessor.test.ts          # Tests (~150 lines)
|-- BlockerDetector.ts                # Blocker detection (~250 lines)
|-- BlockerDetector.test.ts           # Tests (~150 lines)
|-- ApproachEvaluator.ts              # Approach evaluation (~250 lines)
|-- ApproachEvaluator.test.ts         # Tests (~150 lines)
|-- HistoricalLearner.ts              # Historical learning (~200 lines)
|-- HistoricalLearner.test.ts         # Tests (~150 lines)
                                      --------------------------
                                      Subtotal: ~2,550 lines

src/orchestration/
|-- AssessmentReplannerBridge.ts      # Bridge module (~150 lines)
|-- integration.test.ts               # E2E tests (~200 lines)
|-- index.ts                          # Updated exports (~50 lines)
                                      --------------------------
                                      Subtotal: ~400 lines

src/execution/tools/
|-- RequestReplanTool.ts              # Agent tool (~150 lines)
|-- RequestReplanTool.test.ts         # Tests (~100 lines)
                                      --------------------------
                                      Subtotal: ~250 lines

                                      ==========================
                                      TOTAL: ~5,580 lines
```

---

## Success Criteria

- [ ] All 14 tasks completed with markers checked
- [ ] Dynamic Replanner in `src/orchestration/planning/`
- [ ] Self-Assessment Engine in `src/orchestration/assessment/`
- [ ] Agent tool in `src/execution/tools/`
- [ ] Bridge module in `src/orchestration/`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [x] TypeScript compiles: `npm run build`
- [ ] ESLint passes: `npm run lint` (0 errors)
- [ ] Replanner detects complexity:
  ```typescript
  const replanner = createDynamicReplanner();
  replanner.startMonitoring('task-1', executionContext);
  replanner.updateContext('task-1', { iteration: 8, maxIterations: 20 });
  const decision = replanner.checkReplanningNeeded('task-1');
  console.log('Should replan:', decision.shouldReplan);
  ```
- [ ] Assessment engine works:
  ```typescript
  const assessor = createSelfAssessmentEngine();
  const assessment = await assessor.getFullAssessment('task-1', context);
  console.log('Completion:', assessment.progress.completionEstimate);
  console.log('Blockers:', assessment.blockers.severity);
  console.log('Recommendation:', assessment.recommendation.action);
  ```
- [ ] **Total lines: ~5,500-6,000**

---

## Recommended Settings

```
--max-iterations 50
--completion-promise "PLANS_13_07_08_COMPLETE"
```

## Task Completion Markers

Complete tasks sequentially:

**Part 1: Dynamic Replanner**
- [ ] `[TASK 1 COMPLETE]` - Replanner Types & Interfaces
- [ ] `[TASK 2 COMPLETE]` - DynamicReplanner Core
- [ ] `[TASK 3 COMPLETE]` - Trigger Evaluators
- [ ] `[TASK 4 COMPLETE]` - Task Splitter
- [ ] `[TASK 5 COMPLETE]` - Agent Replan Request Tool
- [ ] `[TASK 6 COMPLETE]` - Coordinator Integration

**Part 2: Self-Assessment Engine**
- [ ] `[TASK 7 COMPLETE]` - Assessment Types & Interfaces
- [ ] `[TASK 8 COMPLETE]` - SelfAssessmentEngine Core
- [ ] `[TASK 9 COMPLETE]` - Progress Assessor
- [ ] `[TASK 10 COMPLETE]` - Blocker Detector
- [ ] `[TASK 11 COMPLETE]` - Approach Evaluator
- [ ] `[TASK 12 COMPLETE]` - Historical Learner

**Part 3: Integration**
- [ ] `[TASK 13 COMPLETE]` - Cross-Module Integration

**Part 4: Final Verification**
- [ ] `[TASK 14 COMPLETE]` - Lint & Quality Check

**Completion:**
- [ ] `[PLANS 13-07 & 13-08 COMPLETE]` - All done

---

## Notes

- Complete tasks in order - later tasks depend on earlier ones
- Part 1 (Dynamic Replanner) and Part 2 (Self-Assessment) work together
- Task 14 (lint) is critical - do not skip it
- Reference `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` for interface details
- Follow existing Nexus patterns in the orchestration layer
- Both modules are in Layer 2/3 (Orchestration/Planning)
- This completes Phase 13 - all 8 plans done!

## Reference Files

For existing patterns, examine:
- `src/orchestration/context/` - Plan 13-04 code (FreshContextManager)
- `src/execution/iteration/` - Plan 13-06 code (RalphStyleIterator)
- `src/persistence/memory/code/` - Plan 13-03 code (CodeMemory)
- `src/infrastructure/analysis/` - Plan 13-01 code (RepoMapGenerator)
- Existing orchestration patterns in the codebase
