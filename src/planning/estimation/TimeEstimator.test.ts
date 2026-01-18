/**
 * TimeEstimator Tests
 *
 * Tests for the TimeEstimator implementation including:
 * - Basic time estimation
 * - Complexity assessment
 * - Historical calibration
 * - Total time calculation
 *
 * Phase 14B: Execution Bindings Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TimeEstimator,
  createTimeEstimator,
  type EstimationResult,
  type TimeEstimatorConfig,
} from './TimeEstimator';
import type { PlanningTask } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a basic planning task for testing
 */
function createTestTask(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: 'task-1',
    name: 'Sample Task',
    description: 'A sample task for estimation',
    type: 'auto',
    size: 'small',
    estimatedMinutes: 15,
    dependsOn: [],
    testCriteria: ['should work correctly'],
    files: ['src/sample.ts'],
    ...overrides,
  };
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('TimeEstimator', () => {
  let estimator: TimeEstimator;

  beforeEach(() => {
    estimator = new TimeEstimator();
  });

  describe('constructor', () => {
    it('should create with default configuration', () => {
      const factors = estimator.getFactors();

      expect(factors.baseTime).toBe(10);
      expect(factors.fileWeight).toBe(5);
      expect(factors.complexityMultiplier).toBe(1.5);
      expect(factors.testWeight).toBe(10);
      expect(factors.maxTime).toBe(30);
      expect(factors.minTime).toBe(5);
    });

    it('should accept custom configuration', () => {
      const customEstimator = new TimeEstimator({
        factors: {
          baseTime: 15,
          fileWeight: 3,
        },
      });

      const factors = customEstimator.getFactors();

      expect(factors.baseTime).toBe(15);
      expect(factors.fileWeight).toBe(3);
      // Defaults for unspecified
      expect(factors.complexityMultiplier).toBe(1.5);
    });
  });

  describe('estimate', () => {
    it('should return estimated time in minutes', async () => {
      const task = createTestTask();
      const estimate = await estimator.estimate(task);

      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should increase estimate with more files', async () => {
      const singleFileTask = createTestTask({
        files: ['src/single.ts'],
      });

      const multiFileTask = createTestTask({
        files: [
          'src/file1.ts',
          'src/file2.ts',
          'src/file3.ts',
          'src/file4.ts',
        ],
      });

      const singleEstimate = await estimator.estimate(singleFileTask);
      const multiEstimate = await estimator.estimate(multiFileTask);

      expect(multiEstimate).toBeGreaterThan(singleEstimate);
    });

    it('should cap estimate at maxTime', async () => {
      const complexTask = createTestTask({
        name: 'Complex algorithm refactor with optimization',
        description:
          'Complex algorithm optimization and refactoring with distributed processing and state machine implementation',
        files: [
          'src/a.ts',
          'src/b.ts',
          'src/c.ts',
          'src/d.ts',
          'src/e.ts',
        ],
        testCriteria: [
          'test 1',
          'test 2',
          'test 3',
          'test 4',
          'test 5',
          'test 6',
        ],
      });

      const estimate = await estimator.estimate(complexTask);

      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should not go below minTime', async () => {
      const simpleTask = createTestTask({
        name: 'fix typo',
        description: 'simple typo fix',
        files: [],
        testCriteria: [],
      });

      const estimate = await estimator.estimate(simpleTask);

      expect(estimate).toBeGreaterThanOrEqual(5);
    });
  });

  describe('estimateDetailed', () => {
    it('should return detailed estimation with breakdown', () => {
      const task = createTestTask();
      const result = estimator.estimateDetailed(task);

      expect(result).toHaveProperty('estimatedMinutes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('factors');

      expect(result.breakdown).toHaveProperty('base');
      expect(result.breakdown).toHaveProperty('files');
      expect(result.breakdown).toHaveProperty('complexity');
      expect(result.breakdown).toHaveProperty('tests');
    });

    it('should identify high complexity tasks', () => {
      const complexTask = createTestTask({
        name: 'Implement distributed algorithm',
        description: 'Complex algorithm with concurrent processing',
      });

      const result = estimator.estimateDetailed(complexTask);

      expect(result.breakdown.complexity).toBeGreaterThan(0);
      expect(result.factors).toContain('high complexity');
    });

    it('should identify tasks that require tests', () => {
      const testTask = createTestTask({
        description: 'Implement feature with test coverage',
        files: ['src/feature.ts', 'src/feature.test.ts'],
      });

      const result = estimator.estimateDetailed(testTask);

      expect(result.breakdown.tests).toBeGreaterThan(0);
      expect(result.factors).toContain('includes tests');
    });

    it('should return appropriate confidence levels', () => {
      const minimalTask = createTestTask({
        description: '',
        files: [],
      });

      const detailedTask = createTestTask({
        description:
          'A detailed description of what this task involves including specific implementation details that help with estimation accuracy.',
        files: ['src/file1.ts', 'src/file2.ts'],
      });

      const minimalResult = estimator.estimateDetailed(minimalTask);
      const detailedResult = estimator.estimateDetailed(detailedTask);

      expect(minimalResult.confidence).toBe('low');
      expect(detailedResult.confidence).toBe('medium');
    });
  });

  describe('estimateTotal', () => {
    it('should estimate total time for multiple tasks', async () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ];

      const total = await estimator.estimateTotal(tasks);

      // Should be sum of individual estimates (at minimum)
      const individual = await Promise.all(
        tasks.map((t) => estimator.estimate(t))
      );
      const sum = individual.reduce((a, b) => a + b, 0);

      expect(total).toBe(sum);
    });

    it('should return 0 for empty task list', async () => {
      const total = await estimator.estimateTotal([]);

      expect(total).toBe(0);
    });
  });

  describe('calibrate', () => {
    it('should record actual time for calibration', () => {
      const task = createTestTask();

      // Record several actual times
      estimator.calibrate(task, 25);
      estimator.calibrate(task, 28);
      estimator.calibrate(task, 22);
      estimator.calibrate(task, 26);
      estimator.calibrate(task, 24);

      // After 5+ data points, historical data should influence estimates
      const result = estimator.estimateDetailed(task);

      expect(result.factors).toContain('historical adjustment');
      expect(result.confidence).toBe('high');
    });

    it('should not influence estimates with insufficient data', () => {
      const task = createTestTask();

      // Only record a few times
      estimator.calibrate(task, 25);
      estimator.calibrate(task, 28);

      const result = estimator.estimateDetailed(task);

      // Should not have historical adjustment with < 5 data points
      expect(result.factors).not.toContain('historical adjustment');
    });
  });

  describe('getAccuracy', () => {
    it('should return null when no historical data', () => {
      const accuracy = estimator.getAccuracy();

      expect(accuracy).toBeNull();
    });

    it('should calculate accuracy ratio with historical data', () => {
      const task = createTestTask({
        files: ['src/test.ts'],
      });

      // Calibrate with actual times
      estimator.calibrate(task, 15);
      estimator.calibrate(task, 20);
      estimator.calibrate(task, 18);
      estimator.calibrate(task, 22);
      estimator.calibrate(task, 25);

      const accuracy = estimator.getAccuracy();

      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
      expect(typeof accuracy!.ratio).toBe('number');
    });
  });

  describe('resetCalibration', () => {
    it('should reset all calibration data', () => {
      const task = createTestTask();

      // Add calibration data
      for (let i = 0; i < 10; i++) {
        estimator.calibrate(task, 20 + i);
      }

      // Verify data exists
      expect(estimator.getAccuracy()).not.toBeNull();

      // Reset
      estimator.resetCalibration();

      // Verify data is cleared
      expect(estimator.getAccuracy()).toBeNull();
    });

    it('should reset calibration for specific category', () => {
      const testTask = createTestTask({
        description: 'Add unit tests for feature',
        files: ['src/feature.test.ts'],
      });

      const uiTask = createTestTask({
        description: 'Build a button component',
        files: ['src/Component.tsx'],
      });

      // Calibrate both categories
      for (let i = 0; i < 5; i++) {
        estimator.calibrate(testTask, 20);
        estimator.calibrate(uiTask, 15);
      }

      // Reset only test category
      estimator.resetCalibration('test');

      // UI data should still exist
      const accuracy = estimator.getAccuracy('ui');
      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
    });
  });

  describe('setFactors', () => {
    it('should update estimation factors', async () => {
      const task = createTestTask({
        files: ['src/file.ts'],
      });

      const originalEstimate = await estimator.estimate(task);

      // Increase file weight
      estimator.setFactors({ fileWeight: 10 });

      const newEstimate = await estimator.estimate(task);

      expect(newEstimate).toBeGreaterThan(originalEstimate);
    });
  });

  describe('task categorization', () => {
    it('should categorize test files correctly', () => {
      const testTask = createTestTask({
        description: 'Write unit tests for the feature',
        files: ['src/feature.test.ts'],
      });

      // Calibrate 5 times to meet minimum data threshold
      for (let i = 0; i < 5; i++) {
        estimator.calibrate(testTask, 20);
      }
      const accuracy = estimator.getAccuracy('test');

      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
    });

    it('should categorize UI files correctly', () => {
      const uiTask = createTestTask({
        description: 'Build a reusable button component',
        files: ['src/components/Button.tsx'],
      });

      // Calibrate 5 times to meet minimum data threshold
      for (let i = 0; i < 5; i++) {
        estimator.calibrate(uiTask, 20);
      }
      const accuracy = estimator.getAccuracy('ui');

      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
    });

    it('should categorize backend files correctly', () => {
      const backendTask = createTestTask({
        description: 'Create REST endpoint for users',
        files: ['src/api/users.ts'],
      });

      // Calibrate 5 times to meet minimum data threshold
      for (let i = 0; i < 5; i++) {
        estimator.calibrate(backendTask, 20);
      }
      const accuracy = estimator.getAccuracy('backend');

      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
    });

    it('should categorize infrastructure files correctly', () => {
      const infraTask = createTestTask({
        description: 'Update webpack configuration',
        files: ['config/webpack.config.js'],
      });

      // Calibrate 5 times to meet minimum data threshold
      for (let i = 0; i < 5; i++) {
        estimator.calibrate(infraTask, 20);
      }
      const accuracy = estimator.getAccuracy('infrastructure');

      expect(accuracy).not.toBeNull();
      expect(accuracy!.sampleSize).toBe(5);
    });
  });
});

describe('createTimeEstimator', () => {
  it('should create a TimeEstimator instance', () => {
    const estimator = createTimeEstimator();

    expect(estimator).toBeInstanceOf(TimeEstimator);
  });

  it('should pass configuration to TimeEstimator', () => {
    const config: TimeEstimatorConfig = {
      factors: {
        baseTime: 20,
      },
    };

    const estimator = createTimeEstimator(config);
    const factors = estimator.getFactors();

    expect(factors.baseTime).toBe(20);
  });
});
