# Ralph-Style Iterator

> **Module:** `src/execution/iteration/`
> **Layer:** 4 - Execution
> **Plan:** 13-06

## Overview

The Ralph-Style Iterator implements persistent iteration loops where agents can iterate on tasks until tests pass, seeing their previous work through git diffs. Named after the "Ralph Wiggum" pattern, this approach enables true Level 4.0 automation by letting agents:

1. Execute code changes
2. See what they changed (git diff)
3. Get feedback (build/lint/test errors)
4. Iterate with full context
5. Either succeed or escalate gracefully

## Philosophy

- Agents should see their previous work via git diffs
- Errors should be aggregated and deduplicated
- Each iteration should be committed for auditability
- Escalation should happen gracefully with full context
- The loop should be pausable/resumable for long-running tasks

## Iteration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Ralph-Style Iteration Loop                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ITERATION 1                                 │   │
│  │                                                                     │   │
│  │   1. Build Context           4. Run QA                             │   │
│  │      - Task spec               - Build                              │   │
│  │      - Fresh context           - Lint                               │   │
│  │                                - Test                               │   │
│  │   2. Execute Agent           5. Check Success                      │   │
│  │      - Write code              - All pass? → SUCCESS               │   │
│  │      - Make changes            - Any fail? → ITERATION 2           │   │
│  │                                                                     │   │
│  │   3. Commit Changes                                                 │   │
│  │      - git add -A                                                   │   │
│  │      - git commit                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼ (if QA failed)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ITERATION 2+                                │   │
│  │                                                                     │   │
│  │   1. Build Context (enriched)                                      │   │
│  │      - Task spec                                                   │   │
│  │      - Fresh context                                               │   │
│  │      + PREVIOUS GIT DIFF   ←── "Here's what you changed"          │   │
│  │      + PREVIOUS ERRORS     ←── "Here's what failed"               │   │
│  │                                                                     │   │
│  │   2. Execute Agent (with feedback)                                 │   │
│  │   3. Commit Changes                                                │   │
│  │   4. Run QA                                                        │   │
│  │   5. Check Success                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│              Repeat until SUCCESS or MAX_ITERATIONS reached                │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ESCALATION (if max reached)                      │   │
│  │                                                                     │   │
│  │   - Create checkpoint commit                                       │   │
│  │   - Generate escalation report                                     │   │
│  │   - Notify human with:                                             │   │
│  │     • What was attempted                                           │   │
│  │     • Last errors encountered                                      │   │
│  │     • Suggested actions                                            │   │
│  │     • Checkpoint commit hash                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import {
  createFullRalphStyleIterator,
  type QARunner,
} from './execution/iteration';

// Define QA functions
const qaRunner: QARunner = {
  build: async () => runBuild(),
  lint: async () => runLint(),
  test: async () => runTests(),
};

// Create iterator with all dependencies
const iterator = createFullRalphStyleIterator({
  projectPath: '/path/to/project',
  contextManager: freshContextManager,
  qaRunner,
});

// Execute task with iteration
const task = {
  taskId: 'feature-123',
  description: 'Add user authentication',
  requirements: ['JWT tokens', 'Password hashing'],
  targetFiles: ['src/auth/'],
  hints: [],
  priority: 'high',
};

const result = await iterator.execute(task, {
  maxIterations: 10,
  commitEachIteration: true,
  includeGitDiff: true,
  includePreviousErrors: true,
});

if (result.success) {
  console.log('Completed in', result.iterations, 'iterations');
  console.log('Final commit:', result.finalCommit);
} else {
  console.log('Escalated:', result.escalationReport?.reason);
  console.log('Checkpoint:', result.escalationReport?.checkpointCommit);
}
```

### Custom Agent Runner

```typescript
import {
  createRalphStyleIterator,
  type IterationContext,
  type AgentExecutionResult,
} from './execution/iteration';

async function myAgentRunner(context: IterationContext): Promise<AgentExecutionResult> {
  console.log('Iteration:', context.iteration);
  console.log('Previous errors:', context.previousErrors.length);

  // Show agent the diff from previous iteration
  if (context.previousDiff) {
    console.log('You changed:', context.previousDiff.stats.filesChanged, 'files');
    console.log('Diff:', context.previousDiff.diffText);
  }

  // Execute your agent logic here
  const agentResult = await runYourAgent({
    task: context.task,
    errors: context.previousErrors,
    diff: context.previousDiff?.diffText,
  });

  return {
    success: true,
    filesModified: agentResult.modifiedFiles,
    filesCreated: agentResult.createdFiles,
    tokensUsed: agentResult.tokens,
    summary: agentResult.summary,
  };
}

const iterator = createRalphStyleIterator({
  projectPath: '/project',
  contextManager: manager,
  agentRunner: myAgentRunner,
  qaRunner: { build, lint, test },
});
```

### Pause/Resume/Abort

```typescript
const iterator = createFullRalphStyleIterator({ ... });

// Start long-running task
const executionPromise = iterator.execute(task, { maxIterations: 20 });

// Check status
const status = iterator.getStatus(task.taskId);
console.log('Current iteration:', status?.currentIteration);
console.log('State:', status?.state);

// Pause if needed
await iterator.pause(task.taskId);
console.log('Paused');

// Resume later
await iterator.resume(task.taskId);
console.log('Resumed');

// Or abort if taking too long
await iterator.abort(task.taskId);
console.log('Aborted');

// Wait for final result
const result = await executionPromise;
```

## Configuration Options

```typescript
interface IterationOptions {
  /** Maximum iterations before escalation (default: 20) */
  maxIterations?: number;

  /** Commit changes after each iteration (default: true) */
  commitEachIteration?: boolean;

  /** Include git diff in iteration context (default: true) */
  includeGitDiff?: boolean;

  /** Include previous errors in context (default: true) */
  includePreviousErrors?: boolean;

  /** When to escalate (default: same as maxIterations) */
  escalateAfter?: number;

  /** Timeout in minutes (default: 60) */
  timeoutMinutes?: number;
}
```

## Components

### GitDiffContextBuilder

Builds context from git diffs to show agents their previous work:

```typescript
import { createGitDiffContextBuilder } from './execution/iteration';

const diffBuilder = createGitDiffContextBuilder('/project');

// Get diff between commits
const diff = await diffBuilder.buildDiffContext('abc123', 'HEAD');
console.log('Files changed:', diff.stats.filesChanged);
console.log('Additions:', diff.stats.additions);
console.log('Deletions:', diff.stats.deletions);

// Format for agent consumption
const formatted = diffBuilder.formatDiffForAgent(diff);
// Returns readable diff summary for agent context
```

### ErrorContextAggregator

Collects and deduplicates errors across iterations:

```typescript
import { createErrorContextAggregator } from './execution/iteration';

const aggregator = createErrorContextAggregator({ maxErrors: 50 });

// Add errors from each iteration
aggregator.addErrors(buildResult.errors);
aggregator.addErrors(lintResult.errors);
aggregator.addErrors(testResult.errors);

// Get unique errors (deduplicated)
const unique = aggregator.getUniqueErrors();

// Format for agent
const formatted = aggregator.formatErrorsForAgent();
// Returns prioritized, formatted error list
```

### IterationCommitHandler

Manages git commits for each iteration:

```typescript
import { createIterationCommitHandler } from './execution/iteration';

const commitHandler = createIterationCommitHandler('/project');

// Commit an iteration
const hash = await commitHandler.commitIteration(
  'task-123',
  1,
  'Fixed authentication bug'
);

// Rollback if needed
await commitHandler.rollbackToIteration('task-123', 1);

// Get commit for specific iteration
const commit = commitHandler.getIterationCommit('task-123', 1);
```

### EscalationHandler

Handles graceful escalation when max iterations reached:

```typescript
import { createEscalationHandler } from './execution/iteration';

const escalationHandler = createEscalationHandler('/project', {
  checkpointDir: '.nexus/escalations',
});

// Escalate task
const report = await escalationHandler.escalate(
  'task-123',
  'max_iterations',
  iterationContext
);

console.log(report.summary);
console.log(report.suggestedActions);
console.log(report.checkpointCommit);
```

## Exports

```typescript
// Main iterator
export { RalphStyleIterator, createRalphStyleIterator };
export { createFullRalphStyleIterator }; // With all dependencies

// Components
export { GitDiffContextBuilder, createGitDiffContextBuilder };
export { ErrorContextAggregator, createErrorContextAggregator };
export { IterationCommitHandler, createIterationCommitHandler };
export { EscalationHandler, createEscalationHandler };

// Types
export type {
  IterationState,
  IterationPhase,
  IterationOptions,
  IterationResult,
  IterationHistoryEntry,
  IterationStatus,
  IterationContext,
  GitChange,
  GitDiff,
  ErrorEntry,
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,
  EscalationReason,
  EscalationReport,
  IRalphStyleIterator,
  IGitDiffContextBuilder,
  IErrorContextAggregator,
  IIterationCommitHandler,
  IEscalationHandler,
  QARunner,
  AgentExecutionResult,
};

// Constants
export { DEFAULT_ITERATION_OPTIONS };
```

## Testing

```bash
# Run all iteration tests
npm test src/execution/iteration/

# Run specific component tests
npm test src/execution/iteration/GitDiffContextBuilder.test.ts
npm test src/execution/iteration/ErrorContextAggregator.test.ts
npm test src/execution/iteration/IterationCommitHandler.test.ts
npm test src/execution/iteration/EscalationHandler.test.ts
npm test src/execution/iteration/RalphStyleIterator.test.ts

# Run integration tests
npm test src/execution/iteration/integration.test.ts
```

## Related Modules

- **FreshContextManager** (`../../orchestration/context/`) - Provides fresh context each iteration
- **DynamicContextProvider** (`../../orchestration/context/dynamic/`) - Mid-iteration context requests
- **RequestContextTool** (`../tools/`) - Agent tool for context requests
