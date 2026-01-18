# Self-Assessment Engine Module

**Phase 13-08: Self-Assessment Engine for Nexus**

## Overview

The Self-Assessment Engine enables agents to evaluate their own progress, detect blockers, assess their current approach, and learn from historical task outcomes. This allows for more intelligent decision-making during task execution.

## Architecture

```
Layer 2: Orchestration

src/orchestration/assessment/
|-- index.ts                    # Module exports
|-- types.ts                    # Type definitions
|-- SelfAssessmentEngine.ts     # Core engine class
|-- ProgressAssessor.ts         # Progress estimation
|-- BlockerDetector.ts          # Blocker detection
|-- ApproachEvaluator.ts        # Approach evaluation
|-- HistoricalLearner.ts        # Historical learning
```

## Key Concepts

### Assessment Types

The engine performs three types of assessments:

| Type | Description | Output |
|------|-------------|--------|
| **Progress** | How much work is complete | `ProgressAssessment` |
| **Blockers** | What's preventing progress | `BlockerAssessment` |
| **Approach** | Is the current strategy working | `ApproachAssessment` |

### Effectiveness Levels

The engine classifies approach effectiveness:

| Level | Description |
|-------|-------------|
| `working` | Making good progress |
| `struggling` | Progress is slow or difficult |
| `stuck` | No progress being made |
| `wrong_direction` | Making things worse |

### Blocker Types

Blockers are categorized:

| Type | Examples |
|------|----------|
| `technical` | Build failures, type errors |
| `dependency` | Missing packages, version conflicts |
| `unclear_requirement` | Ambiguous specs |
| `external` | API unavailable, network issues |
| `knowledge_gap` | Unfamiliar patterns |

### Recommended Actions

Based on assessment, the engine recommends:

| Action | When Recommended |
|--------|-----------------|
| `continue` | Making good progress |
| `try_alternative` | Current approach not working |
| `request_help` | Critical blockers needing human |
| `split_task` | Task too complex |
| `abort` | Task cannot be completed |

## Usage

### Basic Usage

```typescript
import {
  createFullSelfAssessmentEngine,
} from './orchestration/assessment';

// Create engine with defaults
const engine = createFullSelfAssessmentEngine();

// Get full assessment
const assessment = await engine.getFullAssessment('task-1', {
  taskId: 'task-1',
  taskName: 'Implement Feature',
  taskDescription: 'Add user authentication',
  taskFiles: ['src/auth.ts', 'src/auth.test.ts'],
  iterationHistory: [...],
  currentErrors: [...],
});

console.log('Completion:', assessment.progress.completionEstimate);
console.log('Blockers:', assessment.blockers.severity);
console.log('Effectiveness:', assessment.approach.effectiveness);
console.log('Recommendation:', assessment.recommendation.action);
```

### Individual Assessments

```typescript
// Progress assessment only
const progress = await engine.assessProgress('task-1', context);
console.log('Estimated completion:', progress.completionEstimate);
console.log('Remaining work:', progress.remainingWork);
console.log('Risks:', progress.risks);

// Blocker assessment only
const blockers = await engine.assessBlockers('task-1', context);
console.log('Severity:', blockers.severity);
console.log('Can proceed:', blockers.canProceed);
console.log('Blockers:', blockers.blockers);

// Approach assessment only
const approach = await engine.assessApproach('task-1', context);
console.log('Effectiveness:', approach.effectiveness);
console.log('Alternatives:', approach.alternatives);
console.log('Recommendation:', approach.recommendation);
```

### Getting Recommendations

```typescript
// Get next step recommendation
const recommendation = await engine.recommendNextStep('task-1');
console.log('Action:', recommendation.action);
console.log('Reason:', recommendation.reason);
console.log('Priority:', recommendation.priority);

// Get alternative approaches
const alternatives = await engine.recommendAlternativeApproach('task-1');
for (const alt of alternatives) {
  console.log('Alternative:', alt.description);
  console.log('Effort:', alt.estimatedEffort);
  console.log('Confidence:', alt.confidence);
}
```

### Historical Learning

```typescript
// Record task outcome
await engine.recordOutcome({
  taskId: 'task-1',
  success: true,
  approach: 'TDD with small increments',
  iterations: 8,
  timeSpent: 25,
  blockers: ['type mismatch'],
  lessonsLearned: ['Run type checker frequently'],
  completedAt: new Date(),
});

// Get insights for similar tasks
const insights = await engine.getHistoricalInsights('feature');
for (const insight of insights) {
  console.log('Pattern:', insight.pattern);
  console.log('Success rate:', insight.successRate);
  console.log('Avg iterations:', insight.averageIterations);
  console.log('Recommended approach:', insight.recommendedApproach);
}
```

### Custom Components

```typescript
import {
  SelfAssessmentEngine,
  ProgressAssessor,
  BlockerDetector,
  ApproachEvaluator,
  HistoricalLearner,
} from './orchestration/assessment';

// Create with custom components
const engine = new SelfAssessmentEngine({
  progressAssessor: new ProgressAssessor(/* custom config */),
  blockerDetector: new BlockerDetector(/* custom patterns */),
  approachEvaluator: new ApproachEvaluator(/* custom config */),
  historicalLearner: new HistoricalLearner(/* custom storage */),
  cacheConfig: {
    progressTtl: 60000,   // 1 minute
    blockersTtl: 30000,   // 30 seconds
    approachTtl: 60000,   // 1 minute
    maxSize: 100,
  },
});
```

## Events

The engine emits events for monitoring:

```typescript
interface AssessmentEventEmitter {
  onProgressAssessed?(taskId: string, assessment: ProgressAssessment): void;
  onBlockersDetected?(taskId: string, assessment: BlockerAssessment): void;
  onApproachEvaluated?(taskId: string, assessment: ApproachAssessment): void;
  onRecommendation?(taskId: string, recommendation: Recommendation): void;
  onOutcomeRecorded?(taskId: string, outcome: TaskOutcome): void;
}
```

## Blocker Detection Patterns

The `BlockerDetector` uses pattern matching to identify blockers:

```typescript
const DEFAULT_BLOCKER_PATTERNS = [
  // Technical blockers
  { pattern: /Cannot find module/i, type: 'technical', severity: 'medium' },
  { pattern: /Type '.*' is not assignable/i, type: 'technical', severity: 'medium' },
  { pattern: /SyntaxError/i, type: 'technical', severity: 'high' },

  // Dependency blockers
  { pattern: /peer dep missing/i, type: 'dependency', severity: 'high' },
  { pattern: /Circular dependency/i, type: 'dependency', severity: 'high' },

  // Requirement blockers
  { pattern: /unclear|ambiguous/i, type: 'unclear_requirement', needsHuman: true },

  // External blockers
  { pattern: /ECONNREFUSED|ETIMEDOUT/i, type: 'external', severity: 'medium' },

  // Knowledge gap blockers
  { pattern: /I don't know|not familiar/i, type: 'knowledge_gap', severity: 'low' },
];
```

## Integration with Dynamic Replanner

The Self-Assessment Engine integrates with the Dynamic Replanner via the `AssessmentReplannerBridge`:

```typescript
import { createAssessmentReplannerBridge } from './orchestration';

const bridge = createAssessmentReplannerBridge();

// Combined assessment and replan check
const result = await bridge.assessAndCheckReplan('task-1', context);

// Assessment informs replanning
if (result.assessment.blockers.severity === 'critical') {
  // Replanner will suggest escalation
}

if (result.assessment.approach.effectiveness === 'stuck') {
  // Replanner may suggest splitting
}
```

## API Reference

### SelfAssessmentEngine

| Method | Description |
|--------|-------------|
| `assessProgress(taskId, context)` | Assess task progress |
| `assessBlockers(taskId, context)` | Detect blockers |
| `assessApproach(taskId, context)` | Evaluate approach |
| `recommendNextStep(taskId)` | Get next action |
| `recommendAlternativeApproach(taskId)` | Get alternatives |
| `recordOutcome(outcome)` | Record completion |
| `getHistoricalInsights(taskType)` | Get past insights |
| `getFullAssessment(taskId, context)` | Get combined assessment |

### ProgressAssessor

| Method | Description |
|--------|-------------|
| `assess(context)` | Calculate progress estimate |

Internal methods:
- `calculateCompletionEstimate()` - Estimate 0.0 - 1.0
- `identifyRemainingWork()` - What's left to do
- `identifyCompletedWork()` - What's done
- `assessRisks()` - Identify risks
- `calculateConfidence()` - Confidence in estimate

### BlockerDetector

| Method | Description |
|--------|-------------|
| `detect(context)` | Detect and categorize blockers |

Internal methods:
- `detectTechnicalBlockers()` - Build/type errors
- `detectDependencyBlockers()` - Package issues
- `detectRequirementBlockers()` - Unclear specs
- `detectKnowledgeGapBlockers()` - Unfamiliar areas
- `assessSeverity()` - Overall severity
- `suggestSolutions()` - Possible fixes

### ApproachEvaluator

| Method | Description |
|--------|-------------|
| `evaluate(context)` | Evaluate current approach |

Internal methods:
- `determineEffectiveness()` - Working/struggling/stuck
- `inferCurrentApproach()` - What strategy is being used
- `generateAlternatives()` - Other approaches
- `makeRecommendation()` - Suggested action

### HistoricalLearner

| Method | Description |
|--------|-------------|
| `recordOutcome(outcome)` | Store task result |
| `getInsights(taskType)` | Get aggregated insights |
| `findSimilarTasks(description)` | Find past similar tasks |

## Caching

Assessments are cached to avoid redundant computation:

```typescript
interface AssessmentCacheConfig {
  progressTtl: number;  // Default: 5 minutes
  blockersTtl: number;  // Default: 2 minutes
  approachTtl: number;  // Default: 5 minutes
  maxSize: number;      // Default: 100
}
```

Blocker assessments have shorter TTL because blockers can change quickly during iteration.

## Testing

```bash
# Run assessment module tests
npm test src/orchestration/assessment/

# Run specific test file
npm test src/orchestration/assessment/SelfAssessmentEngine.test.ts
```

## Dependencies

- Plan 13-03: CodeMemory (for code understanding)
- Plan 13-06: RalphStyleIterator (for iteration context)
- Plan 13-07: DynamicReplanner (for integration)
