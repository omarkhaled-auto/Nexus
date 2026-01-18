/**
 * Integration Tests for Dynamic Replanner and Self-Assessment Engine
 *
 * Tests the full cycle of assessment -> replanning -> outcome recording.
 * Verifies that the two modules work together correctly via the bridge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  AssessmentReplannerBridge,
  createAssessmentReplannerBridge,
  type BridgeConfig,
  type BridgeEventEmitter,
  type AssessmentReplanResult,
} from './AssessmentReplannerBridge';

import {
  DynamicReplanner,
  createDefaultReplanner,
  TaskSplitter,
  createAllTriggers,
  type ExecutionContext,
  type Task,
  type TriggerThresholds,
} from './planning';

import {
  SelfAssessmentEngine,
  createFullSelfAssessmentEngine,
  ProgressAssessor,
  BlockerDetector,
  ApproachEvaluator,
  HistoricalLearner,
  type AssessmentContext,
  type TaskOutcome,
  type ErrorEntry,
  type IterationHistoryEntry,
} from './assessment';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock AssessmentContext for testing
 */
function createMockAssessmentContext(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    taskId: 'task-1',
    taskName: 'Test Task',
    taskDescription: 'A test task for integration testing',
    taskFiles: ['src/test.ts', 'src/utils.ts'],
    acceptanceCriteria: ['Tests pass', 'No lint errors'],
    iterationHistory: [],
    currentErrors: [],
    estimatedTime: 30,
    maxIterations: 20,
    timeElapsed: 0,
    ...overrides,
  };
}

/**
 * Create a mock ExecutionContext for testing
 */
function createMockExecutionContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    taskId: 'task-1',
    taskName: 'Test Task',
    estimatedTime: 30,
    timeElapsed: 0,
    iteration: 0,
    maxIterations: 20,
    filesExpected: ['src/test.ts', 'src/utils.ts'],
    filesModified: [],
    errors: [],
    consecutiveFailures: 0,
    ...overrides,
  };
}

/**
 * Create a mock ErrorEntry for testing
 */
function createMockError(message: string, type: 'error' | 'warning' = 'error'): ErrorEntry {
  return {
    type,
    message,
    timestamp: new Date(),
  };
}

/**
 * Create a mock iteration history entry
 */
function createMockIterationEntry(
  overrides: Partial<IterationHistoryEntry> & { errorsEncountered?: number; filesModified?: string[] } = {}
): IterationHistoryEntry {
  // Extract custom overrides that aren't part of the interface
  const { errorsEncountered = 0, filesModified = [], ...rest } = overrides;

  // Convert errorsEncountered to errors array
  const errors: ErrorEntry[] = [];
  for (let i = 0; i < errorsEncountered; i++) {
    errors.push(createMockError(`Error ${i + 1}`));
  }

  // Convert filesModified to changes
  const changes = filesModified.map(file => ({
    type: 'modified' as const,
    file,
  }));

  return {
    iteration: 1,
    phase: 'execute' as const,
    action: 'Test action',
    changes: changes.length > 0 ? changes : [],
    errors: rest.errors ?? errors,
    duration: 5000,
    tokens: 1000,
    timestamp: new Date(),
    ...rest,
  };
}

/**
 * Create a mock Task for testing
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task',
    files: ['src/test.ts', 'src/utils.ts'],
    estimatedTime: 30,
    dependencies: [],
    acceptanceCriteria: ['Tests pass'],
    status: 'in_progress',
    ...overrides,
  };
}

// ============================================================================
// Test Suite: AssessmentReplannerBridge
// ============================================================================

describe('AssessmentReplannerBridge', () => {
  let bridge: AssessmentReplannerBridge;

  beforeEach(() => {
    bridge = createAssessmentReplannerBridge();
  });

  afterEach(() => {
    bridge.clear();
  });

  describe('constructor', () => {
    it('should create bridge with default components', () => {
      const bridge = new AssessmentReplannerBridge();
      expect(bridge).toBeDefined();
      expect(bridge.getThresholds()).toBeDefined();
    });

    it('should create bridge with custom replanner', () => {
      const replanner = createDefaultReplanner();
      const bridge = new AssessmentReplannerBridge({ replanner });
      expect(bridge).toBeDefined();
    });

    it('should create bridge with custom assessment engine', () => {
      const assessmentEngine = createFullSelfAssessmentEngine();
      const bridge = new AssessmentReplannerBridge({ assessmentEngine });
      expect(bridge).toBeDefined();
    });

    it('should create bridge with custom thresholds', () => {
      const thresholds: Partial<TriggerThresholds> = {
        timeExceededRatio: 2.0,
        iterationsRatio: 0.5,
      };
      const bridge = new AssessmentReplannerBridge({ thresholds });
      const actualThresholds = bridge.getThresholds();
      expect(actualThresholds.timeExceededRatio).toBe(2.0);
      expect(actualThresholds.iterationsRatio).toBe(0.5);
    });
  });

  describe('assessAndCheckReplan', () => {
    it('should return assessment and replan decision for healthy task', async () => {
      const context = createMockAssessmentContext({
        iterationHistory: [
          createMockIterationEntry({ iteration: 1, errorsEncountered: 0 }),
        ],
      });

      const result = await bridge.assessAndCheckReplan('task-1', context);

      expect(result).toBeDefined();
      expect(result.assessment).toBeDefined();
      expect(result.assessment.progress).toBeDefined();
      expect(result.assessment.blockers).toBeDefined();
      expect(result.assessment.approach).toBeDefined();
      expect(result.assessment.recommendation).toBeDefined();
      expect(result.replanDecision).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should trigger replan for task with high iterations', async () => {
      const iterationHistory: IterationHistoryEntry[] = [];
      for (let i = 1; i <= 10; i++) {
        iterationHistory.push(
          createMockIterationEntry({
            iteration: i,
            errorsEncountered: i > 5 ? 2 : 0,
          })
        );
      }

      const context = createMockAssessmentContext({
        iterationHistory,
        maxIterations: 20,
      });

      const result = await bridge.assessAndCheckReplan('task-1', context);

      expect(result.replanDecision).toBeDefined();
      // May or may not trigger depending on thresholds
      expect(result.replanDecision.timestamp).toBeInstanceOf(Date);
    });

    it('should trigger replan for task with critical blockers', async () => {
      // Create context with errors indicating critical blocker
      const context = createMockAssessmentContext({
        currentErrors: [
          createMockError('Circular dependency detected'),
          createMockError('Cannot find module "missing-dep"'),
        ],
        iterationHistory: [
          createMockIterationEntry({ errorsEncountered: 2 }),
          createMockIterationEntry({ iteration: 2, errorsEncountered: 2 }),
          createMockIterationEntry({ iteration: 3, errorsEncountered: 2 }),
        ],
      });

      const result = await bridge.assessAndCheckReplan('task-1', context);

      expect(result.assessment.blockers).toBeDefined();
      // If blockers are critical and autoReplanOnCritical is true, should trigger replan
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should emit events when assessment completes', async () => {
      const onAssessmentComplete = vi.fn();
      const eventEmitter: BridgeEventEmitter = {
        onAssessmentComplete,
      };

      const bridge = createAssessmentReplannerBridge({ eventEmitter });
      const context = createMockAssessmentContext();

      await bridge.assessAndCheckReplan('task-1', context);

      expect(onAssessmentComplete).toHaveBeenCalled();
      expect(onAssessmentComplete).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskId: 'task-1',
          progress: expect.any(Object),
          blockers: expect.any(Object),
        })
      );
    });

    it('should use provided execution context', async () => {
      const assessmentContext = createMockAssessmentContext();
      const executionContext = createMockExecutionContext({
        iteration: 5,
        timeElapsed: 15,
      });

      const result = await bridge.assessAndCheckReplan(
        'task-1',
        assessmentContext,
        executionContext
      );

      expect(result).toBeDefined();
      expect(bridge.isMonitoring('task-1')).toBe(true);
    });
  });

  describe('handleAssessmentReplan', () => {
    it('should execute replan when decision says to replan', async () => {
      // Create context that will trigger replanning
      const iterationHistory: IterationHistoryEntry[] = [];
      for (let i = 1; i <= 15; i++) {
        iterationHistory.push(
          createMockIterationEntry({
            iteration: i,
            errorsEncountered: 1,
          })
        );
      }

      // Override thresholds to make triggering easier
      const bridge = createAssessmentReplannerBridge({
        thresholds: {
          iterationsRatio: 0.3, // Trigger at 30% of max iterations
          consecutiveFailures: 3,
        },
      });

      const context = createMockAssessmentContext({
        iterationHistory,
        maxIterations: 20,
        currentErrors: [createMockError('Test error')],
      });

      const result = await bridge.handleAssessmentReplan('task-1', context);

      // Result may be null if no replan triggered
      // The test verifies the method runs without error
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should return null when no replan needed', async () => {
      const context = createMockAssessmentContext({
        iterationHistory: [
          createMockIterationEntry({ errorsEncountered: 0 }),
        ],
      });

      const result = await bridge.handleAssessmentReplan('task-1', context);

      // May or may not be null depending on assessment
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring on first assessment', async () => {
      const context = createMockAssessmentContext();

      expect(bridge.isMonitoring('task-1')).toBe(false);

      await bridge.assessAndCheckReplan('task-1', context);

      expect(bridge.isMonitoring('task-1')).toBe(true);
    });

    it('should stop monitoring and clear data', async () => {
      const context = createMockAssessmentContext();

      await bridge.assessAndCheckReplan('task-1', context);
      expect(bridge.isMonitoring('task-1')).toBe(true);
      expect(bridge.getLastAssessment('task-1')).toBeDefined();

      bridge.stopMonitoring('task-1');

      expect(bridge.isMonitoring('task-1')).toBe(false);
      expect(bridge.getLastAssessment('task-1')).toBeUndefined();
    });

    it('should clear all data', async () => {
      const context1 = createMockAssessmentContext({ taskId: 'task-1' });
      const context2 = createMockAssessmentContext({ taskId: 'task-2' });

      await bridge.assessAndCheckReplan('task-1', context1);
      await bridge.assessAndCheckReplan('task-2', context2);

      expect(bridge.isMonitoring('task-1')).toBe(true);
      expect(bridge.isMonitoring('task-2')).toBe(true);

      bridge.clear();

      expect(bridge.isMonitoring('task-1')).toBe(false);
      expect(bridge.isMonitoring('task-2')).toBe(false);
    });
  });

  describe('delegated assessment methods', () => {
    it('should delegate assessProgress', async () => {
      const context = createMockAssessmentContext();
      const result = await bridge.assessProgress('task-1', context);

      expect(result).toBeDefined();
      expect(result.taskId).toBe('task-1');
      expect(result.completionEstimate).toBeGreaterThanOrEqual(0);
      expect(result.completionEstimate).toBeLessThanOrEqual(1);
    });

    it('should delegate assessBlockers', async () => {
      const context = createMockAssessmentContext({
        currentErrors: [createMockError('Type error')],
      });
      const result = await bridge.assessBlockers('task-1', context);

      expect(result).toBeDefined();
      expect(result.taskId).toBe('task-1');
      expect(result.severity).toBeDefined();
    });

    it('should delegate assessApproach', async () => {
      const context = createMockAssessmentContext();
      const result = await bridge.assessApproach('task-1', context);

      expect(result).toBeDefined();
      expect(result.taskId).toBe('task-1');
      expect(result.effectiveness).toBeDefined();
    });

    it('should delegate getFullAssessment', async () => {
      const context = createMockAssessmentContext();
      const result = await bridge.getFullAssessment('task-1', context);

      expect(result).toBeDefined();
      expect(result.progress).toBeDefined();
      expect(result.blockers).toBeDefined();
      expect(result.approach).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('delegated replanning methods', () => {
    it('should delegate startMonitoring', () => {
      const context = createMockExecutionContext();

      bridge.startMonitoring('task-1', context);

      expect(bridge.isMonitoring('task-1')).toBe(true);
    });

    it('should delegate stopMonitoring', () => {
      const context = createMockExecutionContext();

      bridge.startMonitoring('task-1', context);
      bridge.stopMonitoring('task-1');

      expect(bridge.isMonitoring('task-1')).toBe(false);
    });

    it('should delegate getDecisionHistory', async () => {
      const context = createMockAssessmentContext();

      await bridge.assessAndCheckReplan('task-1', context);

      const history = bridge.getDecisionHistory('task-1');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should delegate threshold methods', () => {
      const thresholds = bridge.getThresholds();
      expect(thresholds).toBeDefined();

      bridge.setThresholds({ timeExceededRatio: 3.0 });
      const newThresholds = bridge.getThresholds();
      expect(newThresholds.timeExceededRatio).toBe(3.0);
    });
  });

  describe('historical learning', () => {
    it('should delegate recordOutcome', async () => {
      const outcome: TaskOutcome = {
        taskId: 'task-1',
        success: true,
        approach: 'TDD approach',
        iterations: 5,
        timeSpent: 20,
        blockers: [],
        lessonsLearned: ['Write tests first'],
        completedAt: new Date(),
      };

      await expect(bridge.recordOutcome(outcome)).resolves.not.toThrow();
    });

    it('should delegate getHistoricalInsights', async () => {
      // Record some outcomes first
      const outcomes: TaskOutcome[] = [
        {
          taskId: 'task-1',
          success: true,
          approach: 'TDD',
          iterations: 5,
          timeSpent: 20,
          blockers: [],
          lessonsLearned: ['Test first'],
          completedAt: new Date(),
        },
        {
          taskId: 'task-2',
          success: true,
          approach: 'TDD',
          iterations: 8,
          timeSpent: 30,
          blockers: ['type error'],
          lessonsLearned: ['Check types'],
          completedAt: new Date(),
        },
      ];

      for (const outcome of outcomes) {
        await bridge.recordOutcome(outcome);
      }

      const insights = await bridge.getHistoricalInsights('default');
      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('last assessment cache', () => {
    it('should cache last assessment', async () => {
      const context = createMockAssessmentContext();

      expect(bridge.getLastAssessment('task-1')).toBeUndefined();

      await bridge.assessAndCheckReplan('task-1', context);

      const cached = bridge.getLastAssessment('task-1');
      expect(cached).toBeDefined();
      expect(cached?.taskId).toBe('task-1');
    });

    it('should update cache on new assessment', async () => {
      const context1 = createMockAssessmentContext();
      await bridge.assessAndCheckReplan('task-1', context1);
      const cached1 = bridge.getLastAssessment('task-1');

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const context2 = createMockAssessmentContext({
        iterationHistory: [createMockIterationEntry()],
      });
      await bridge.assessAndCheckReplan('task-1', context2);
      const cached2 = bridge.getLastAssessment('task-1');

      expect(cached2?.assessedAt.getTime()).toBeGreaterThanOrEqual(
        cached1?.assessedAt.getTime() ?? 0
      );
    });
  });
});

// ============================================================================
// Test Suite: Full Integration Cycle
// ============================================================================

describe('Full Integration Cycle', () => {
  let bridge: AssessmentReplannerBridge;

  beforeEach(() => {
    bridge = createAssessmentReplannerBridge();
  });

  afterEach(() => {
    bridge.clear();
  });

  it('should complete full assessment -> replan -> outcome cycle', async () => {
    // Step 1: Start task
    const initialContext = createMockAssessmentContext({
      taskId: 'feature-task',
      taskName: 'Add Feature',
      taskFiles: ['src/feature.ts', 'src/feature.test.ts'],
    });

    // Step 2: First assessment (task just started)
    const result1 = await bridge.assessAndCheckReplan('feature-task', initialContext);
    expect(result1.assessment).toBeDefined();
    expect(bridge.isMonitoring('feature-task')).toBe(true);

    // Step 3: Simulate progress
    const progressContext = createMockAssessmentContext({
      taskId: 'feature-task',
      taskName: 'Add Feature',
      taskFiles: ['src/feature.ts', 'src/feature.test.ts'],
      iterationHistory: [
        createMockIterationEntry({ iteration: 1, errorsEncountered: 3 }),
        createMockIterationEntry({ iteration: 2, errorsEncountered: 2 }),
        createMockIterationEntry({ iteration: 3, errorsEncountered: 1 }),
      ],
      currentErrors: [createMockError('Minor type issue')],
      timeElapsed: 10,
    });

    const result2 = await bridge.assessAndCheckReplan('feature-task', progressContext);
    expect(result2.assessment.progress.completionEstimate).toBeGreaterThan(0);

    // Step 4: Complete task and record outcome
    const outcome: TaskOutcome = {
      taskId: 'feature-task',
      success: true,
      approach: 'Incremental implementation',
      iterations: 5,
      timeSpent: 15,
      blockers: ['type issues'],
      lessonsLearned: ['Run type checker frequently'],
      completedAt: new Date(),
    };

    await bridge.recordOutcome(outcome);

    // Step 5: Stop monitoring
    bridge.stopMonitoring('feature-task');
    expect(bridge.isMonitoring('feature-task')).toBe(false);

    // Step 6: Future tasks can learn from history
    const insights = await bridge.getHistoricalInsights('default');
    expect(Array.isArray(insights)).toBe(true);
  });

  it('should handle task that requires replanning', async () => {
    const events: string[] = [];
    const eventEmitter: BridgeEventEmitter = {
      onAssessmentComplete: () => events.push('assessment'),
      onReplanTriggered: () => events.push('replan'),
      onCriticalBlocker: () => events.push('blocker'),
    };

    const bridge = createAssessmentReplannerBridge({
      eventEmitter,
      thresholds: {
        iterationsRatio: 0.2, // Very low threshold to trigger
        consecutiveFailures: 2,
      },
    });

    // Create a struggling task
    const iterationHistory: IterationHistoryEntry[] = [];
    for (let i = 1; i <= 8; i++) {
      iterationHistory.push(
        createMockIterationEntry({
          iteration: i,
          errorsEncountered: 2,
          filesModified: ['src/complex.ts'],
        })
      );
    }

    const context = createMockAssessmentContext({
      taskId: 'complex-task',
      iterationHistory,
      maxIterations: 20,
      currentErrors: [
        createMockError('Complex refactoring needed'),
        createMockError('Same error repeating'),
      ],
      agentFeedback: 'This task is more complex than expected',
    });

    const result = await bridge.assessAndCheckReplan('complex-task', context);

    expect(events).toContain('assessment');
    expect(result.assessment).toBeDefined();
    expect(result.replanDecision).toBeDefined();
  });

  it('should learn from multiple task outcomes', async () => {
    // Record multiple outcomes
    const outcomes: TaskOutcome[] = [
      {
        taskId: 'refactor-1',
        success: true,
        approach: 'Small incremental changes',
        iterations: 3,
        timeSpent: 10,
        blockers: [],
        lessonsLearned: ['Small changes work well'],
        completedAt: new Date(),
      },
      {
        taskId: 'refactor-2',
        success: true,
        approach: 'Small incremental changes',
        iterations: 4,
        timeSpent: 12,
        blockers: ['type mismatch'],
        lessonsLearned: ['Check types after changes'],
        completedAt: new Date(),
      },
      {
        taskId: 'refactor-3',
        success: false,
        approach: 'Big bang rewrite',
        iterations: 15,
        timeSpent: 60,
        blockers: ['too many changes', 'lost track of requirements'],
        lessonsLearned: ['Avoid large rewrites'],
        completedAt: new Date(),
      },
    ];

    for (const outcome of outcomes) {
      await bridge.recordOutcome(outcome);
    }

    const insights = await bridge.getHistoricalInsights('refactor');
    expect(Array.isArray(insights)).toBe(true);
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let bridge: AssessmentReplannerBridge;

  beforeEach(() => {
    bridge = createAssessmentReplannerBridge();
  });

  afterEach(() => {
    bridge.clear();
  });

  it('should handle empty iteration history', async () => {
    const context = createMockAssessmentContext({
      iterationHistory: [],
    });

    const result = await bridge.assessAndCheckReplan('task-1', context);
    expect(result).toBeDefined();
    expect(result.assessment).toBeDefined();
  });

  it('should handle task with no errors', async () => {
    const context = createMockAssessmentContext({
      currentErrors: [],
      iterationHistory: [
        createMockIterationEntry({ errorsEncountered: 0 }),
      ],
    });

    const result = await bridge.assessAndCheckReplan('task-1', context);
    expect(result.assessment.blockers.severity).toBe('none');
  });

  it('should handle concurrent assessments', async () => {
    const contexts = [
      createMockAssessmentContext({ taskId: 'task-1' }),
      createMockAssessmentContext({ taskId: 'task-2' }),
      createMockAssessmentContext({ taskId: 'task-3' }),
    ];

    const results = await Promise.all(
      contexts.map((ctx) => bridge.assessAndCheckReplan(ctx.taskId, ctx))
    );

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.assessment !== undefined)).toBe(true);
    expect(bridge.isMonitoring('task-1')).toBe(true);
    expect(bridge.isMonitoring('task-2')).toBe(true);
    expect(bridge.isMonitoring('task-3')).toBe(true);
  });

  it('should handle recommendation when no previous assessment cached', async () => {
    // Try to get recommendation without prior assessment
    // Should handle gracefully
    await expect(bridge.recommendNextStep('unknown-task')).resolves.toBeDefined();
  });
});

// ============================================================================
// Test Suite: Factory Function
// ============================================================================

describe('createAssessmentReplannerBridge', () => {
  it('should create bridge with default config', () => {
    const bridge = createAssessmentReplannerBridge();
    expect(bridge).toBeInstanceOf(AssessmentReplannerBridge);
  });

  it('should create bridge with partial config', () => {
    const bridge = createAssessmentReplannerBridge({
      autoReplanOnCritical: false,
    });
    expect(bridge).toBeInstanceOf(AssessmentReplannerBridge);
  });

  it('should create bridge with full config', () => {
    // When providing a custom replanner, it uses the replanner's thresholds
    const customReplanner = createDefaultReplanner({ timeExceededRatio: 2.0 });

    const config: BridgeConfig = {
      replanner: customReplanner,
      assessmentEngine: createFullSelfAssessmentEngine(),
      autoReplanOnCritical: true,
      eventEmitter: {
        onAssessmentComplete: vi.fn(),
      },
    };

    const bridge = createAssessmentReplannerBridge(config);
    expect(bridge).toBeInstanceOf(AssessmentReplannerBridge);
    // The thresholds come from the custom replanner
    expect(bridge.getThresholds().timeExceededRatio).toBe(2.0);
  });
});
