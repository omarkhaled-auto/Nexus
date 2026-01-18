# Dynamic Replanner Module

**Phase 13-07: Dynamic Replanner for Nexus**

## Overview

The Dynamic Replanner detects when tasks prove more complex than initially estimated and triggers replanning actions. It monitors task execution in real-time and can split, rescope, or escalate tasks as needed.

## Architecture

```
Layer 2/3: Orchestration / Planning

src/orchestration/planning/
|-- index.ts                    # Module exports
|-- types.ts                    # Type definitions
|-- DynamicReplanner.ts         # Core replanner class
|-- TaskSplitter.ts             # Task splitting logic
|-- ReplannerIntegration.ts     # Coordinator integration
|-- triggers/
    |-- index.ts                # Trigger exports
    |-- TimeExceededTrigger.ts  # Time-based trigger
    |-- IterationsTrigger.ts    # Iteration-based trigger
    |-- ScopeCreepTrigger.ts    # Scope-based trigger
    |-- ConsecutiveFailuresTrigger.ts # Failure-based trigger
    |-- ComplexityTrigger.ts    # Complexity-based trigger
```

## Key Concepts

### Triggers

The replanner evaluates multiple triggers to detect issues:

| Trigger | Description | Default Threshold |
|---------|-------------|-------------------|
| `time_exceeded` | Task taking longer than estimated | 150% of estimate |
| `iterations_high` | High iteration count | 40% of max iterations |
| `scope_creep` | More files modified than expected | 3 extra files |
| `blocking_issue` | Consecutive failures | 5 failures |
| `complexity_discovered` | Complex patterns detected | Keywords in feedback |
| `agent_request` | Agent explicitly requested | N/A |
| `dependency_discovered` | New dependencies found | N/A |

### Actions

When replanning is triggered, the system suggests an action:

| Action | When Used |
|--------|-----------|
| `continue` | No issues detected |
| `split` | Task too large, can be broken down |
| `rescope` | Task scope grew, needs reduction |
| `escalate` | Blocking issues, needs human help |
| `abort` | Task cannot be completed |

## Usage

### Basic Usage

```typescript
import {
  createDefaultReplanner,
  createAllTriggers,
  TaskSplitter,
} from './orchestration/planning';

// Create replanner with defaults
const replanner = createDefaultReplanner();

// Start monitoring a task
replanner.startMonitoring('task-1', {
  taskId: 'task-1',
  taskName: 'Implement Feature',
  estimatedTime: 30,
  timeElapsed: 0,
  iteration: 0,
  maxIterations: 20,
  filesExpected: ['src/feature.ts'],
  filesModified: [],
  errors: [],
  consecutiveFailures: 0,
});

// Update context as task progresses
replanner.updateContext('task-1', {
  iteration: 5,
  timeElapsed: 15,
  filesModified: ['src/feature.ts', 'src/utils.ts'],
});

// Check if replanning is needed
const decision = replanner.checkReplanningNeeded('task-1');
console.log('Should replan:', decision.shouldReplan);
console.log('Suggested action:', decision.suggestedAction);

// Execute replan if needed
if (decision.shouldReplan && decision.reason) {
  const result = await replanner.replan('task-1', decision.reason);
  console.log('Replan result:', result.action);
  console.log('New tasks:', result.newTasks);
}

// Stop monitoring when done
replanner.stopMonitoring('task-1');
```

### Using with Coordinator

```typescript
import {
  createDefaultReplannerIntegration,
} from './orchestration/planning';

// Create integration with event handling
const integration = createDefaultReplannerIntegration({
  eventEmitter: {
    onReplanDecision: (taskId, decision) => {
      console.log(`Task ${taskId}: ${decision.suggestedAction}`);
    },
    onReplanExecuted: (taskId, result) => {
      console.log(`Task ${taskId} replanned: ${result.message}`);
    },
  },
});

// Use in coordinator lifecycle
await integration.onTaskStarted('task-1', task);
await integration.onIterationComplete('task-1', iterationResult);
await integration.onTaskCompleted('task-1', true);
```

### Custom Thresholds

```typescript
import { createDefaultReplanner } from './orchestration/planning';

const replanner = createDefaultReplanner({
  timeExceededRatio: 2.0,     // 200% of estimate
  iterationsRatio: 0.5,       // 50% of max
  scopeCreepFiles: 5,         // 5 extra files
  consecutiveFailures: 3,     // 3 failures
  complexityKeywords: ['refactor', 'rewrite', 'complex'],
});
```

### Agent Replan Request

Agents can request replanning directly:

```typescript
const decision = await replanner.handleAgentRequest('task-1', {
  taskId: 'task-1',
  agentId: 'agent-1',
  reason: 'Task is more complex than expected',
  suggestion: 'Split into frontend and backend tasks',
  blockers: ['Database schema needs redesign'],
  complexityDetails: 'Discovered circular dependencies',
});
```

## Task Splitting

When a task is split, the `TaskSplitter` creates subtasks:

```typescript
import { TaskSplitter } from './orchestration/planning';

const splitter = new TaskSplitter();

// Check if task can be split
const canSplit = splitter.canSplit(task, reason);

// Split the task
if (canSplit) {
  const subtasks = await splitter.split(task, reason);
  // subtasks will have:
  // - New IDs with parentTaskId set
  // - Subset of original files
  // - Proportional time estimates
  // - Dependency chain between subtasks
}

// Estimate how many subtasks
const count = splitter.estimateSubtasks(task);
```

## Events

The replanner emits events for monitoring:

```typescript
interface ReplannerEventEmitter {
  onMonitoringStarted?(taskId: string): void;
  onMonitoringStopped?(taskId: string): void;
  onTriggerActivated?(taskId: string, trigger: ReplanTrigger): void;
  onReplanDecision?(taskId: string, decision: ReplanDecision): void;
  onReplanExecuted?(taskId: string, result: ReplanResult): void;
}
```

## Integration with Self-Assessment

The Dynamic Replanner integrates with the Self-Assessment Engine via the `AssessmentReplannerBridge`:

```typescript
import { createAssessmentReplannerBridge } from './orchestration';

const bridge = createAssessmentReplannerBridge();

// Combined assessment and replan check
const result = await bridge.assessAndCheckReplan(taskId, context);

if (result.requiresAction) {
  if (result.replanDecision.shouldReplan && result.replanDecision.reason) {
    await bridge.executeReplan(taskId, result.replanDecision.reason);
  }
}
```

## API Reference

### DynamicReplanner

| Method | Description |
|--------|-------------|
| `startMonitoring(taskId, context)` | Start monitoring a task |
| `stopMonitoring(taskId)` | Stop monitoring a task |
| `updateContext(taskId, context)` | Update execution context |
| `checkReplanningNeeded(taskId)` | Check if replanning needed |
| `evaluateAllTriggers(context)` | Evaluate all triggers |
| `replan(taskId, reason)` | Execute replanning |
| `handleAgentRequest(taskId, request)` | Handle agent request |
| `setThresholds(thresholds)` | Update thresholds |
| `getThresholds()` | Get current thresholds |
| `getMonitoredTasks()` | Get all monitored tasks |
| `getDecisionHistory(taskId)` | Get decision history |

### ReplannerIntegration

| Method | Description |
|--------|-------------|
| `onTaskStarted(taskId, task)` | Called when task starts |
| `onIterationComplete(taskId, result)` | Called after each iteration |
| `onTaskCompleted(taskId, success)` | Called when task completes |
| `onAgentFeedback(taskId, feedback)` | Called with agent feedback |
| `handleReplanDecision(decision)` | Execute a replan decision |

## Testing

```bash
# Run planning module tests
npm test src/orchestration/planning/

# Run specific test file
npm test src/orchestration/planning/DynamicReplanner.test.ts
```

## Dependencies

- Plan 13-01: RepoMapGenerator (for code analysis)
- Plan 13-03: CodeMemory (for intelligent splitting)
- Plan 13-06: RalphStyleIterator (for iteration context)
- Plan 13-08: SelfAssessmentEngine (for assessment integration)
