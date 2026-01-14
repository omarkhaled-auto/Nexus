import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeEstimator } from './TimeEstimator';
import type { PlanningTask, CompletedTask, FeatureEstimate } from '../types';
import type { Feature } from '../../types/core';
import type { LLMClient, LLMResponse } from '../../llm/types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTask(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task for implementation',
    type: 'auto',
    size: 'atomic',
    estimatedMinutes: 15,
    dependsOn: [],
    testCriteria: ['Test passes'],
    files: ['src/test.ts'],
    ...overrides,
  };
}

function createFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-1',
    projectId: 'project-1',
    name: 'Test Feature',
    description: 'A test feature',
    priority: 'must',
    status: 'backlog',
    complexity: 'simple',
    subFeatures: [],
    estimatedTasks: 0,
    completedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockLLMClient(responses: LLMResponse[]): LLMClient {
  let callIndex = 0;
  return {
    chat: vi.fn().mockImplementation(() => {
      const response = responses[callIndex];
      callIndex++;
      return Promise.resolve(response);
    }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(100),
  };
}

function createEstimationResponse(minutes: number): LLMResponse {
  return {
    content: JSON.stringify({ estimatedMinutes: minutes, confidence: 0.8 }),
    usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
    finishReason: 'stop',
  };
}

function createFeatureDecomposeResponse(tasks: Partial<PlanningTask>[]): LLMResponse {
  return {
    content: JSON.stringify({
      tasks: tasks.map((t, i) => ({
        id: t.id || `task-${i + 1}`,
        name: t.name || `Task ${i + 1}`,
        description: t.description || `Description ${i + 1}`,
        type: t.type || 'auto',
        size: t.size || 'atomic',
        estimatedMinutes: t.estimatedMinutes || 15,
        dependsOn: t.dependsOn || [],
        testCriteria: t.testCriteria || ['Test'],
        files: t.files || [`src/file${i + 1}.ts`],
      })),
    }),
    usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
    finishReason: 'stop',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TimeEstimator', () => {
  describe('estimateTime()', () => {
    it('should return estimate in 5-30 minute range', async () => {
      const llmClient = createMockLLMClient([
        createEstimationResponse(20),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const task = createTask();

      const estimate = await estimator.estimateTime(task);

      expect(estimate).toBeGreaterThanOrEqual(5);
      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should estimate simple CRUD task around 15 minutes', async () => {
      const llmClient = createMockLLMClient([
        createEstimationResponse(15),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const task = createTask({
        name: 'Create user CRUD endpoint',
        description: 'Simple CRUD endpoint for user entity',
      });

      const estimate = await estimator.estimateTime(task);

      // Should be close to 15, allow some variance
      expect(estimate).toBeGreaterThanOrEqual(10);
      expect(estimate).toBeLessThanOrEqual(20);
    });

    it('should estimate complex algorithm task around 30 minutes', async () => {
      const llmClient = createMockLLMClient([
        createEstimationResponse(30),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const task = createTask({
        name: 'Implement dependency graph algorithm',
        description: 'Complex graph traversal with cycle detection',
        type: 'tdd',
        size: 'small',
      });

      const estimate = await estimator.estimateTime(task);

      // Should be at or near 30
      expect(estimate).toBeGreaterThanOrEqual(25);
      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should cap estimates at 30 minutes', async () => {
      const llmClient = createMockLLMClient([
        createEstimationResponse(45), // LLM returns over limit
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const task = createTask();

      const estimate = await estimator.estimateTime(task);

      expect(estimate).toBe(30);
    });

    it('should enforce minimum of 5 minutes', async () => {
      const llmClient = createMockLLMClient([
        createEstimationResponse(2), // LLM returns under limit
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const task = createTask();

      const estimate = await estimator.estimateTime(task);

      expect(estimate).toBe(5);
    });
  });

  describe('estimateFeature()', () => {
    it('should sum task estimates for feature', async () => {
      const llmClient = createMockLLMClient([
        // First call: decompose feature
        createFeatureDecomposeResponse([
          { estimatedMinutes: 10 },
          { estimatedMinutes: 15 },
          { estimatedMinutes: 20 },
        ]),
        // Following calls: estimate each task
        createEstimationResponse(10),
        createEstimationResponse(15),
        createEstimationResponse(20),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const feature = createFeature();

      const result = await estimator.estimateFeature(feature);

      expect(result.totalMinutes).toBe(45); // 10 + 15 + 20
      expect(result.taskCount).toBe(3);
    });

    it('should return estimate with confidence score', async () => {
      const llmClient = createMockLLMClient([
        createFeatureDecomposeResponse([
          { estimatedMinutes: 15 },
        ]),
        createEstimationResponse(15),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const feature = createFeature();

      const result = await estimator.estimateFeature(feature);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include breakdown per task', async () => {
      const llmClient = createMockLLMClient([
        createFeatureDecomposeResponse([
          { id: 'task-1', estimatedMinutes: 10 },
          { id: 'task-2', estimatedMinutes: 20 },
        ]),
        createEstimationResponse(10),
        createEstimationResponse(20),
      ]);

      const estimator = new TimeEstimator({ llmClient });
      const feature = createFeature();

      const result = await estimator.estimateFeature(feature);

      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].taskId).toBe('task-1');
      expect(result.breakdown[0].estimatedMinutes).toBe(10);
    });
  });

  describe('calibrate()', () => {
    it('should adjust for underestimation', () => {
      const llmClient = createMockLLMClient([]);
      const estimator = new TimeEstimator({ llmClient });

      // Tasks took longer than estimated (underestimation)
      const history: CompletedTask[] = [
        { taskId: 't1', estimatedMinutes: 10, actualMinutes: 15, complexity: 'simple' },
        { taskId: 't2', estimatedMinutes: 20, actualMinutes: 30, complexity: 'medium' },
      ];

      estimator.calibrate(history);

      // Calibration factor should increase (>1.0)
      const factor = estimator.getCalibrationFactor();
      expect(factor).toBeGreaterThan(1.0);
    });

    it('should adjust for overestimation', () => {
      const llmClient = createMockLLMClient([]);
      const estimator = new TimeEstimator({ llmClient });

      // Tasks completed faster than estimated (overestimation)
      const history: CompletedTask[] = [
        { taskId: 't1', estimatedMinutes: 20, actualMinutes: 10, complexity: 'simple' },
        { taskId: 't2', estimatedMinutes: 30, actualMinutes: 15, complexity: 'medium' },
      ];

      estimator.calibrate(history);

      // Calibration factor should decrease (<1.0)
      const factor = estimator.getCalibrationFactor();
      expect(factor).toBeLessThan(1.0);
    });

    it('should maintain default calibration factor of 1.0 without history', () => {
      const llmClient = createMockLLMClient([]);
      const estimator = new TimeEstimator({ llmClient });

      const factor = estimator.getCalibrationFactor();

      expect(factor).toBe(1.0);
    });

    it('should handle empty history gracefully', () => {
      const llmClient = createMockLLMClient([]);
      const estimator = new TimeEstimator({ llmClient });

      estimator.calibrate([]);

      const factor = estimator.getCalibrationFactor();
      expect(factor).toBe(1.0);
    });
  });

  describe('getCalibrationFactor()', () => {
    it('should return current calibration factor', () => {
      const llmClient = createMockLLMClient([]);
      const estimator = new TimeEstimator({ llmClient });

      const factor = estimator.getCalibrationFactor();

      expect(typeof factor).toBe('number');
      expect(factor).toBeGreaterThan(0);
    });
  });
});
