/**
 * Trigger Evaluators Tests
 *
 * Tests for all trigger evaluator implementations.
 *
 * @module orchestration/planning/triggers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimeExceededTrigger } from './TimeExceededTrigger';
import { IterationsTrigger } from './IterationsTrigger';
import { ScopeCreepTrigger } from './ScopeCreepTrigger';
import { ConsecutiveFailuresTrigger } from './ConsecutiveFailuresTrigger';
import { ComplexityTrigger } from './ComplexityTrigger';
import { createAllTriggers } from './index';
import type { ExecutionContext, TriggerThresholds, ErrorEntry } from '../types';
import { DEFAULT_TRIGGER_THRESHOLDS } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create error entries with required fields
 */
function createError(
  message: string,
  type: ErrorEntry['type'] = 'build',
  severity: ErrorEntry['severity'] = 'error'
): ErrorEntry {
  return { message, type, severity };
}

function createContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    taskId: 'test-task',
    taskName: 'Test Task',
    estimatedTime: 30,
    timeElapsed: 15,
    iteration: 5,
    maxIterations: 20,
    filesExpected: ['src/file1.ts', 'src/file2.ts'],
    filesModified: ['src/file1.ts'],
    errors: [],
    consecutiveFailures: 0,
    ...overrides,
  };
}

// ============================================================================
// TimeExceededTrigger Tests
// ============================================================================

describe('TimeExceededTrigger', () => {
  let trigger: TimeExceededTrigger;
  let thresholds: TriggerThresholds;

  beforeEach(() => {
    trigger = new TimeExceededTrigger();
    thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS };
  });

  it('should have correct trigger type', () => {
    expect(trigger.trigger).toBe('time_exceeded');
  });

  it('should not trigger when time is within estimate', () => {
    const context = createContext({
      timeElapsed: 30,
      estimatedTime: 30,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.metrics.timeRatio).toBe(1);
  });

  it('should not trigger at exact threshold', () => {
    const context = createContext({
      timeElapsed: 45, // 150% of 30
      estimatedTime: 30,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false); // Equal to threshold, not exceeded
  });

  it('should trigger when time exceeds threshold', () => {
    const context = createContext({
      timeElapsed: 50, // 167% of 30
      estimatedTime: 30,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.details).toContain('167%');
  });

  it('should have higher confidence for larger overages', () => {
    const context1 = createContext({
      timeElapsed: 50, // 167%
      estimatedTime: 30,
    });
    const context2 = createContext({
      timeElapsed: 90, // 300%
      estimatedTime: 30,
    });

    const result1 = trigger.evaluate(context1, thresholds);
    const result2 = trigger.evaluate(context2, thresholds);

    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });

  it('should handle zero estimated time', () => {
    const context = createContext({
      timeElapsed: 30,
      estimatedTime: 0,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.details).toContain('No time estimate');
  });

  it('should respect custom thresholds', () => {
    const customThresholds = { ...thresholds, timeExceededRatio: 2.0 };
    const context = createContext({
      timeElapsed: 55, // 183% - would trigger at 1.5, not at 2.0
      estimatedTime: 30,
    });

    const result = trigger.evaluate(context, customThresholds);
    expect(result.triggered).toBe(false);
  });
});

// ============================================================================
// IterationsTrigger Tests
// ============================================================================

describe('IterationsTrigger', () => {
  let trigger: IterationsTrigger;
  let thresholds: TriggerThresholds;

  beforeEach(() => {
    trigger = new IterationsTrigger();
    thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS };
  });

  it('should have correct trigger type', () => {
    expect(trigger.trigger).toBe('iterations_high');
  });

  it('should not trigger when iterations are low', () => {
    const context = createContext({
      iteration: 2,
      maxIterations: 20,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.metrics.iterationRatio).toBe(0.1);
  });

  it('should trigger when iterations exceed threshold', () => {
    const context = createContext({
      iteration: 10, // 50% > 40%
      maxIterations: 20,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should have higher confidence as ratio approaches 1.0', () => {
    const context1 = createContext({
      iteration: 10, // 50%
      maxIterations: 20,
    });
    const context2 = createContext({
      iteration: 18, // 90%
      maxIterations: 20,
    });

    const result1 = trigger.evaluate(context1, thresholds);
    const result2 = trigger.evaluate(context2, thresholds);

    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });

  it('should handle zero max iterations', () => {
    const context = createContext({
      iteration: 5,
      maxIterations: 0,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.details).toContain('No maximum iterations');
  });

  it('should respect custom thresholds', () => {
    const customThresholds = { ...thresholds, iterationsRatio: 0.7 };
    const context = createContext({
      iteration: 10, // 50% - would trigger at 0.4, not at 0.7
      maxIterations: 20,
    });

    const result = trigger.evaluate(context, customThresholds);
    expect(result.triggered).toBe(false);
  });
});

// ============================================================================
// ScopeCreepTrigger Tests
// ============================================================================

describe('ScopeCreepTrigger', () => {
  let trigger: ScopeCreepTrigger;
  let thresholds: TriggerThresholds;

  beforeEach(() => {
    trigger = new ScopeCreepTrigger();
    thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS };
  });

  it('should have correct trigger type', () => {
    expect(trigger.trigger).toBe('scope_creep');
  });

  it('should not trigger when only expected files are modified', () => {
    const context = createContext({
      filesExpected: ['src/file1.ts', 'src/file2.ts'],
      filesModified: ['src/file1.ts', 'src/file2.ts'],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.metrics.scopeCreepCount).toBe(0);
  });

  it('should not trigger with small number of unexpected files', () => {
    const context = createContext({
      filesExpected: ['src/file1.ts'],
      filesModified: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.metrics.scopeCreepCount).toBe(2);
  });

  it('should trigger when many unexpected files are modified', () => {
    const context = createContext({
      filesExpected: ['src/file1.ts'],
      filesModified: [
        'src/file1.ts',
        'src/file2.ts',
        'src/file3.ts',
        'src/file4.ts',
        'src/file5.ts',
      ],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.metrics.scopeCreepCount).toBe(4);
    expect(result.details).toContain('Unexpected files:');
  });

  it('should normalize path comparison', () => {
    const context = createContext({
      filesExpected: ['src/file1.ts'],
      filesModified: ['src\\file1.ts'], // Windows-style path
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.metrics.scopeCreepCount).toBe(0);
  });

  it('should be case-insensitive', () => {
    const context = createContext({
      filesExpected: ['src/File1.ts'],
      filesModified: ['src/file1.ts'],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
    expect(result.metrics.scopeCreepCount).toBe(0);
  });

  it('should list unexpected files in details', () => {
    const context = createContext({
      filesExpected: [],
      filesModified: [
        'src/file1.ts',
        'src/file2.ts',
        'src/file3.ts',
        'src/file4.ts',
        'src/file5.ts',
        'src/file6.ts',
        'src/file7.ts',
      ],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('and 2 more');
  });
});

// ============================================================================
// ConsecutiveFailuresTrigger Tests
// ============================================================================

describe('ConsecutiveFailuresTrigger', () => {
  let trigger: ConsecutiveFailuresTrigger;
  let thresholds: TriggerThresholds;

  beforeEach(() => {
    trigger = new ConsecutiveFailuresTrigger();
    thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS };
  });

  it('should have correct trigger type', () => {
    expect(trigger.trigger).toBe('blocking_issue');
  });

  it('should not trigger with low failure count', () => {
    const context = createContext({
      consecutiveFailures: 2,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
  });

  it('should trigger when failures exceed threshold', () => {
    const context = createContext({
      consecutiveFailures: 7,
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('should analyze error patterns', () => {
    const context = createContext({
      consecutiveFailures: 7,
      errors: [
        createError('Module not found: ./missing', 'build'),
        createError('Cannot find module ./missing2', 'build'),
        createError('Import error: module not found', 'build'),
      ],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('module');
  });

  it('should have higher confidence with more failures', () => {
    const context1 = createContext({ consecutiveFailures: 6 });
    const context2 = createContext({ consecutiveFailures: 15 });

    const result1 = trigger.evaluate(context1, thresholds);
    const result2 = trigger.evaluate(context2, thresholds);

    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });
});

// ============================================================================
// ComplexityTrigger Tests
// ============================================================================

describe('ComplexityTrigger', () => {
  let trigger: ComplexityTrigger;
  let thresholds: TriggerThresholds;

  beforeEach(() => {
    trigger = new ComplexityTrigger();
    thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS };
  });

  it('should have correct trigger type', () => {
    expect(trigger.trigger).toBe('complexity_discovered');
  });

  it('should not trigger without complexity indicators', () => {
    const context = createContext({
      agentFeedback: 'Making good progress',
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(false);
  });

  it('should trigger on complexity keywords in agent feedback', () => {
    const context = createContext({
      agentFeedback: 'This code is very complex and needs to be refactored',
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('complex');
    expect(result.details).toContain('refactor');
  });

  it('should trigger on complexity keywords in errors', () => {
    const context = createContext({
      errors: [
        createError('This component is too difficult to test', 'test'),
      ],
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('difficult');
  });

  it('should detect implicit complexity indicators', () => {
    const context = createContext({
      agentFeedback: 'Found a circular dependency between modules',
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('circular-dependency');
  });

  it('should have higher confidence with agent feedback', () => {
    const contextWithFeedback = createContext({
      agentFeedback: 'This is complex',
    });
    const contextWithErrors = createContext({
      errors: [createError('This is complex', 'runtime')],
    });

    const resultFeedback = trigger.evaluate(contextWithFeedback, thresholds);
    const resultErrors = trigger.evaluate(contextWithErrors, thresholds);

    expect(resultFeedback.confidence).toBeGreaterThan(resultErrors.confidence);
  });

  it('should respect custom complexity keywords', () => {
    const customThresholds = {
      ...thresholds,
      complexityKeywords: ['impossible', 'terrible'],
    };
    const context = createContext({
      agentFeedback: 'This is hard and tricky',
    });

    const result = trigger.evaluate(context, customThresholds);
    // Should not trigger on 'hard' or 'tricky' with custom keywords (only 'impossible', 'terrible')
    // and no implicit patterns match this feedback
    expect(result.triggered).toBe(false);
    expect(result.details).toBe('No complexity indicators detected');
  });

  it('should detect multiple implicit patterns', () => {
    const context = createContext({
      agentFeedback: 'This legacy code needs to be refactored due to breaking changes',
    });
    const result = trigger.evaluate(context, thresholds);

    expect(result.triggered).toBe(true);
    expect(result.details).toContain('legacy-code');
    expect(result.details).toContain('refactor');
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createAllTriggers', () => {
  it('should create all five triggers', () => {
    const triggers = createAllTriggers();

    expect(triggers).toHaveLength(5);
    expect(triggers.map(t => t.trigger)).toContain('time_exceeded');
    expect(triggers.map(t => t.trigger)).toContain('iterations_high');
    expect(triggers.map(t => t.trigger)).toContain('scope_creep');
    expect(triggers.map(t => t.trigger)).toContain('blocking_issue');
    expect(triggers.map(t => t.trigger)).toContain('complexity_discovered');
  });

  it('should create functional triggers', () => {
    const triggers = createAllTriggers();
    const context = createContext();

    for (const trigger of triggers) {
      const result = trigger.evaluate(context, DEFAULT_TRIGGER_THRESHOLDS);
      expect(result).toHaveProperty('triggered');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('details');
    }
  });
});

// ============================================================================
// Integration Tests with Various Threshold Configurations
// ============================================================================

describe('Trigger Evaluators with Custom Thresholds', () => {
  it('should work with very strict thresholds', () => {
    const strictThresholds: TriggerThresholds = {
      timeExceededRatio: 1.0, // No tolerance
      iterationsRatio: 0.1, // Very early warning
      scopeCreepFiles: 0, // No extra files allowed
      consecutiveFailures: 1, // Single failure triggers
      complexityKeywords: ['any', 'issue'],
    };

    const context = createContext({
      timeElapsed: 35,
      estimatedTime: 30,
      iteration: 3,
      maxIterations: 20,
      filesModified: ['src/file1.ts', 'src/extra.ts'],
      consecutiveFailures: 2,
    });

    const triggers = createAllTriggers();
    const results = triggers.map(t => t.evaluate(context, strictThresholds));

    // All should trigger with strict thresholds
    const triggeredCount = results.filter(r => r.triggered).length;
    expect(triggeredCount).toBeGreaterThanOrEqual(3);
  });

  it('should work with very lenient thresholds', () => {
    const lenientThresholds: TriggerThresholds = {
      timeExceededRatio: 5.0, // 500% tolerance
      iterationsRatio: 0.9, // Very late warning
      scopeCreepFiles: 100, // Many extra files allowed
      consecutiveFailures: 50, // Many failures allowed
      complexityKeywords: [],
    };

    const context = createContext({
      timeElapsed: 100,
      estimatedTime: 30,
      iteration: 15,
      maxIterations: 20,
      filesModified: Array(10).fill(null).map((_, i) => `src/file${i}.ts`),
      consecutiveFailures: 10,
    });

    const triggers = createAllTriggers();
    const results = triggers.map(t => t.evaluate(context, lenientThresholds));

    // None should trigger with lenient thresholds (except maybe complexity if implicit)
    const triggeredCount = results.filter(r => r.triggered).length;
    expect(triggeredCount).toBeLessThanOrEqual(1);
  });
});
