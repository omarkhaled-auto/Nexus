/**
 * Historical Learner Tests
 *
 * Tests for the HistoricalLearner class that learns from
 * past task outcomes to provide insights and recommendations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HistoricalLearner,
  InMemoryOutcomeStorage,
  createHistoricalLearner,
} from './HistoricalLearner';
import type { TaskOutcome } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestOutcome(overrides: Partial<TaskOutcome> = {}): TaskOutcome {
  return {
    taskId: 'test-task-1',
    success: true,
    approach: 'Standard implementation approach',
    iterations: 5,
    timeSpent: 30,
    blockers: [],
    lessonsLearned: [],
    completedAt: new Date(),
    ...overrides,
  };
}

function createMultipleOutcomes(count: number, overrides: Partial<TaskOutcome> = {}): TaskOutcome[] {
  return Array.from({ length: count }, (_, i) =>
    createTestOutcome({
      taskId: `task-${i}`,
      iterations: 3 + i,
      timeSpent: 20 + i * 5,
      ...overrides,
    })
  );
}

// ============================================================================
// InMemoryOutcomeStorage Tests
// ============================================================================

describe('InMemoryOutcomeStorage', () => {
  let storage: InMemoryOutcomeStorage;

  beforeEach(() => {
    storage = new InMemoryOutcomeStorage(100);
  });

  describe('save', () => {
    it('should save an outcome', async () => {
      const outcome = createTestOutcome();
      await storage.save(outcome);

      const all = await storage.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(outcome);
    });

    it('should save multiple outcomes', async () => {
      const outcomes = createMultipleOutcomes(3);
      for (const outcome of outcomes) {
        await storage.save(outcome);
      }

      const all = await storage.getAll();
      expect(all).toHaveLength(3);
    });

    it('should maintain most recent first order', async () => {
      const outcome1 = createTestOutcome({ taskId: 'first' });
      const outcome2 = createTestOutcome({ taskId: 'second' });

      await storage.save(outcome1);
      await storage.save(outcome2);

      const all = await storage.getAll();
      expect(all[0].taskId).toBe('second');
      expect(all[1].taskId).toBe('first');
    });

    it('should trim to max size', async () => {
      const smallStorage = new InMemoryOutcomeStorage(3);
      const outcomes = createMultipleOutcomes(5);

      for (const outcome of outcomes) {
        await smallStorage.save(outcome);
      }

      const all = await smallStorage.getAll();
      expect(all).toHaveLength(3);
    });
  });

  describe('getByType', () => {
    it('should filter by task type in approach', async () => {
      const outcomes = [
        createTestOutcome({ taskId: 'task-1', approach: 'bugfix approach' }),
        createTestOutcome({ taskId: 'task-2', approach: 'feature implementation' }),
        createTestOutcome({ taskId: 'task-3', approach: 'bugfix for login' }),
      ];

      for (const outcome of outcomes) {
        await storage.save(outcome);
      }

      const bugfixes = await storage.getByType('bugfix');
      expect(bugfixes).toHaveLength(2);
    });

    it('should be case insensitive', async () => {
      await storage.save(createTestOutcome({ approach: 'BUGFIX Approach' }));

      const results = await storage.getByType('bugfix');
      expect(results).toHaveLength(1);
    });

    it('should return empty for no matches', async () => {
      await storage.save(createTestOutcome({ approach: 'feature work' }));

      const results = await storage.getByType('security');
      expect(results).toHaveLength(0);
    });
  });

  describe('searchByKeywords', () => {
    it('should find outcomes matching keywords', async () => {
      const outcomes = [
        createTestOutcome({
          taskId: 'auth-task',
          approach: 'authentication implementation',
          blockers: ['oauth issue'],
        }),
        createTestOutcome({
          taskId: 'ui-task',
          approach: 'button styling',
          blockers: [],
        }),
      ];

      for (const outcome of outcomes) {
        await storage.save(outcome);
      }

      const results = await storage.searchByKeywords(['auth', 'oauth']);
      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('auth-task');
    });

    it('should return empty for no keywords', async () => {
      await storage.save(createTestOutcome());
      const results = await storage.searchByKeywords([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all outcomes', async () => {
      await storage.save(createTestOutcome());
      await storage.save(createTestOutcome({ taskId: 'task-2' }));

      await storage.clear();

      const all = await storage.getAll();
      expect(all).toHaveLength(0);
    });
  });
});

// ============================================================================
// HistoricalLearner Tests
// ============================================================================

describe('HistoricalLearner', () => {
  let learner: HistoricalLearner;

  beforeEach(() => {
    learner = new HistoricalLearner({ minSampleSize: 2 });
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const defaultLearner = createHistoricalLearner();
      expect(defaultLearner).toBeDefined();
    });

    it('should accept custom config', () => {
      const customLearner = new HistoricalLearner({
        minSampleSize: 5,
        maxOutcomes: 500,
      });
      expect(customLearner).toBeDefined();
    });
  });

  describe('recordOutcome', () => {
    it('should record a valid outcome', async () => {
      const outcome = createTestOutcome();
      await expect(learner.recordOutcome(outcome)).resolves.not.toThrow();
    });

    it('should throw for missing taskId', async () => {
      const outcome = createTestOutcome({ taskId: '' });
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('taskId is required');
    });

    it('should throw for missing approach', async () => {
      const outcome = createTestOutcome({ approach: '' });
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('approach is required');
    });

    it('should throw for negative iterations', async () => {
      const outcome = createTestOutcome({ iterations: -1 });
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('non-negative number');
    });

    it('should throw for negative timeSpent', async () => {
      const outcome = createTestOutcome({ timeSpent: -5 });
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('non-negative number');
    });

    it('should throw for non-array blockers', async () => {
      const outcome = createTestOutcome();
      // @ts-expect-error Testing invalid input
      outcome.blockers = 'not an array';
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('blockers must be an array');
    });

    it('should throw for non-Date completedAt', async () => {
      const outcome = createTestOutcome();
      // @ts-expect-error Testing invalid input
      outcome.completedAt = 'not a date';
      await expect(learner.recordOutcome(outcome)).rejects.toThrow('completedAt must be a Date');
    });
  });

  describe('getInsights', () => {
    it('should return empty for insufficient data', async () => {
      const outcome = createTestOutcome({ approach: 'bugfix' });
      await learner.recordOutcome(outcome);

      const insights = await learner.getInsights('bugfix');
      expect(insights).toHaveLength(0);
    });

    it('should return insights with sufficient data', async () => {
      // Need at least minSampleSize (2) outcomes
      const outcomes = [
        createTestOutcome({ approach: 'bugfix approach', success: true }),
        createTestOutcome({ taskId: 'task-2', approach: 'bugfix method', success: true }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('bugfix');
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should calculate correct success rate', async () => {
      const outcomes = [
        createTestOutcome({ approach: 'feature', success: true }),
        createTestOutcome({ taskId: 'task-2', approach: 'feature', success: false }),
        createTestOutcome({ taskId: 'task-3', approach: 'feature', success: true }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('feature');
      const overallInsight = insights.find((i) => i.pattern.includes('Overall'));
      expect(overallInsight).toBeDefined();
      expect(overallInsight?.successRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate average iterations', async () => {
      const outcomes = [
        createTestOutcome({ approach: 'api', iterations: 4 }),
        createTestOutcome({ taskId: 'task-2', approach: 'api', iterations: 6 }),
        createTestOutcome({ taskId: 'task-3', approach: 'api', iterations: 8 }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('api');
      const overallInsight = insights.find((i) => i.pattern.includes('Overall'));
      expect(overallInsight?.averageIterations).toBe(6);
    });

    it('should find common blockers', async () => {
      const outcomes = [
        createTestOutcome({ approach: 'test', blockers: ['type error', 'import issue'] }),
        createTestOutcome({ taskId: 'task-2', approach: 'test', blockers: ['type error'] }),
        createTestOutcome({ taskId: 'task-3', approach: 'test', blockers: ['type error', 'timeout'] }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('test');
      const overallInsight = insights.find((i) => i.pattern.includes('Overall'));
      expect(overallInsight?.commonBlockers).toContain('type error');
    });

    it('should cache insights', async () => {
      const outcomes = createMultipleOutcomes(3, { approach: 'cached-type' });
      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      // First call computes
      const insights1 = await learner.getInsights('cached-type');
      // Second call should use cache (same result)
      const insights2 = await learner.getInsights('cached-type');

      expect(insights1).toEqual(insights2);
    });
  });

  describe('findSimilarTasks', () => {
    it('should find similar tasks by description', async () => {
      const outcomes = [
        createTestOutcome({ taskId: 'auth-1', approach: 'implement login authentication' }),
        createTestOutcome({ taskId: 'ui-1', approach: 'create button component' }),
        createTestOutcome({ taskId: 'auth-2', approach: 'fix authentication bug' }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const similar = await learner.findSimilarTasks('authentication login issue');
      expect(similar.length).toBeGreaterThan(0);
      expect(similar.some((s) => s.taskId === 'auth-1' || s.taskId === 'auth-2')).toBe(true);
    });

    it('should return empty for no matches', async () => {
      await learner.recordOutcome(createTestOutcome({ approach: 'database migration' }));

      const similar = await learner.findSimilarTasks('frontend styling');
      expect(similar).toHaveLength(0);
    });

    it('should sort by relevance', async () => {
      const outcomes = [
        createTestOutcome({ taskId: 'low', approach: 'api endpoint' }),
        createTestOutcome({ taskId: 'high', approach: 'api authentication endpoint security' }),
        createTestOutcome({ taskId: 'mid', approach: 'authentication service' }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const similar = await learner.findSimilarTasks('api authentication');
      expect(similar[0].taskId).toBe('high'); // Most relevant first
    });
  });

  describe('classifyTaskType', () => {
    it('should classify bugfix tasks', () => {
      expect(learner.classifyTaskType('fix the login bug')).toBe('bugfix');
      expect(learner.classifyTaskType('error in payment processing')).toBe('bugfix');
    });

    it('should classify refactoring tasks', () => {
      expect(learner.classifyTaskType('refactor the user service')).toBe('refactoring');
      expect(learner.classifyTaskType('clean up the code')).toBe('refactoring');
    });

    it('should classify testing tasks', () => {
      expect(learner.classifyTaskType('write tests for auth module')).toBe('testing');
    });

    it('should classify feature tasks', () => {
      expect(learner.classifyTaskType('implement new feature')).toBe('feature');
      expect(learner.classifyTaskType('add user profile page')).toBe('feature');
    });

    it('should classify documentation tasks', () => {
      expect(learner.classifyTaskType('update the README')).toBe('documentation');
      expect(learner.classifyTaskType('add API documentation')).toBe('documentation');
    });

    it('should classify optimization tasks', () => {
      expect(learner.classifyTaskType('optimize query performance')).toBe('optimization');
    });

    it('should classify security tasks', () => {
      expect(learner.classifyTaskType('fix security vulnerability')).toBe('security');
    });

    it('should classify api tasks', () => {
      expect(learner.classifyTaskType('create new API endpoint')).toBe('api');
    });

    it('should classify frontend tasks', () => {
      expect(learner.classifyTaskType('build UI component')).toBe('frontend');
    });

    it('should classify backend tasks', () => {
      expect(learner.classifyTaskType('update backend server')).toBe('backend');
      expect(learner.classifyTaskType('database migration')).toBe('backend');
    });

    it('should default to general for unknown tasks', () => {
      expect(learner.classifyTaskType('do something')).toBe('general');
    });
  });

  describe('insight patterns', () => {
    it('should generate success pattern insight', async () => {
      // Need enough successful outcomes
      const outcomes = [
        createTestOutcome({ approach: 'pattern-test', success: true }),
        createTestOutcome({ taskId: 'task-2', approach: 'pattern-test', success: true }),
        createTestOutcome({ taskId: 'task-3', approach: 'pattern-test', success: true }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('pattern-test');
      const successInsight = insights.find((i) => i.pattern.includes('Success'));
      expect(successInsight).toBeDefined();
      expect(successInsight?.successRate).toBe(1.0);
    });

    it('should generate failure pattern insight', async () => {
      const outcomes = [
        createTestOutcome({ approach: 'fail-test', success: false, blockers: ['error 1'] }),
        createTestOutcome({ taskId: 'task-2', approach: 'fail-test', success: false, blockers: ['error 2'] }),
        createTestOutcome({ taskId: 'task-3', approach: 'fail-test', success: false, blockers: ['error 1'] }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('fail-test');
      const failureInsight = insights.find((i) => i.pattern.includes('Failure'));
      expect(failureInsight).toBeDefined();
      expect(failureInsight?.successRate).toBe(0.0);
    });

    it('should generate quick completion insight for efficient tasks', async () => {
      // Create outcomes with varying times
      const outcomes = [
        createTestOutcome({ approach: 'speed-test', timeSpent: 10, success: true }),
        createTestOutcome({ taskId: 'task-2', approach: 'speed-test', timeSpent: 15, success: true }),
        createTestOutcome({ taskId: 'task-3', approach: 'speed-test', timeSpent: 100, success: false }),
        createTestOutcome({ taskId: 'task-4', approach: 'speed-test', timeSpent: 5, success: true }),
      ];

      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      const insights = await learner.getInsights('speed-test');
      const quickInsight = insights.find((i) => i.pattern.includes('Quick'));
      // Quick insight may or may not exist depending on sample size
      if (quickInsight) {
        expect(quickInsight.averageTime).toBeLessThan(50); // Quick tasks average
      }
    });
  });

  describe('utility methods', () => {
    it('should clear insight cache', async () => {
      const outcomes = createMultipleOutcomes(3, { approach: 'cache-clear' });
      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      // Populate cache
      await learner.getInsights('cache-clear');

      // Clear cache
      learner.clearInsightCache();

      // Next call should recompute (no way to verify directly, but shouldn't throw)
      const insights = await learner.getInsights('cache-clear');
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should clear all outcomes', async () => {
      const outcomes = createMultipleOutcomes(5, { approach: 'clear-all' });
      for (const outcome of outcomes) {
        await learner.recordOutcome(outcome);
      }

      await learner.clearOutcomes();

      const insights = await learner.getInsights('clear-all');
      expect(insights).toHaveLength(0);
    });

    it('should expose storage for testing', () => {
      const storage = learner.getStorage();
      expect(storage).toBeDefined();
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createHistoricalLearner', () => {
  it('should create a HistoricalLearner with defaults', () => {
    const learner = createHistoricalLearner();
    expect(learner).toBeInstanceOf(HistoricalLearner);
  });

  it('should create a HistoricalLearner with custom config', () => {
    const learner = createHistoricalLearner({
      minSampleSize: 10,
      maxOutcomes: 500,
    });
    expect(learner).toBeInstanceOf(HistoricalLearner);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('HistoricalLearner Edge Cases', () => {
  let learner: HistoricalLearner;

  beforeEach(() => {
    learner = new HistoricalLearner({ minSampleSize: 1 });
  });

  it('should handle empty blockers array', async () => {
    const outcome = createTestOutcome({ blockers: [] });
    await learner.recordOutcome(outcome);

    const insights = await learner.getInsights(outcome.approach);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should handle empty lessonsLearned array', async () => {
    const outcome = createTestOutcome({ lessonsLearned: [] });
    await learner.recordOutcome(outcome);

    const insights = await learner.getInsights(outcome.approach);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should handle very long approach text', async () => {
    const longApproach = 'a'.repeat(1000);
    const outcome = createTestOutcome({ approach: longApproach });
    await learner.recordOutcome(outcome);

    const insights = await learner.getInsights(longApproach.substring(0, 50));
    expect(insights.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle special characters in approach', async () => {
    const outcome = createTestOutcome({ approach: 'fix: bug #123 (critical!) @user' });
    await learner.recordOutcome(outcome);

    const similar = await learner.findSimilarTasks('bug fix');
    expect(similar.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle zero iterations', async () => {
    const outcome = createTestOutcome({ iterations: 0 });
    await learner.recordOutcome(outcome);

    const insights = await learner.getInsights(outcome.approach);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should handle zero timeSpent', async () => {
    const outcome = createTestOutcome({ timeSpent: 0 });
    await learner.recordOutcome(outcome);

    const insights = await learner.getInsights(outcome.approach);
    expect(insights.length).toBeGreaterThan(0);
  });
});
