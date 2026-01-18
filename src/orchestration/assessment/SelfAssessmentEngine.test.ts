/**
 * SelfAssessmentEngine Tests
 *
 * Tests the core self-assessment engine functionality including
 * progress assessment, blocker detection, approach evaluation,
 * recommendations, and caching behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SelfAssessmentEngine,
  createSelfAssessmentEngine,
} from './SelfAssessmentEngine';
import type {
  AssessmentContext,
  IProgressAssessor,
  IBlockerDetector,
  IApproachEvaluator,
  IHistoricalLearner,
  ProgressAssessment,
  BlockerAssessment,
  ApproachAssessment,
  TaskOutcome,
  HistoricalInsight,
  AssessmentEventEmitter,
} from './types';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockContext(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    taskId: 'test-task-1',
    taskName: 'Test Task',
    taskDescription: 'A test task for unit testing',
    taskFiles: ['src/test.ts', 'src/utils.ts'],
    iterationHistory: [],
    currentErrors: [],
    ...overrides,
  };
}

function createMockProgressAssessor(
  assessment: Partial<ProgressAssessment> = {}
): IProgressAssessor {
  return {
    assess: vi.fn().mockResolvedValue({
      taskId: 'test-task-1',
      completionEstimate: 0.5,
      confidence: 0.7,
      remainingWork: ['Complete feature'],
      completedWork: ['Setup complete'],
      blockers: [],
      risks: [],
      estimatedRemainingTime: 30,
      assessedAt: new Date(),
      ...assessment,
    }),
  };
}

function createMockBlockerDetector(
  assessment: Partial<BlockerAssessment> = {}
): IBlockerDetector {
  return {
    detect: vi.fn().mockResolvedValue({
      taskId: 'test-task-1',
      blockers: [],
      severity: 'none',
      canProceed: true,
      suggestedActions: [],
      assessedAt: new Date(),
      ...assessment,
    }),
  };
}

function createMockApproachEvaluator(
  assessment: Partial<ApproachAssessment> = {}
): IApproachEvaluator {
  return {
    evaluate: vi.fn().mockResolvedValue({
      taskId: 'test-task-1',
      currentApproach: 'Standard implementation',
      effectiveness: 'working',
      confidence: 0.8,
      alternatives: [],
      recommendation: 'Continue current approach',
      assessedAt: new Date(),
      ...assessment,
    }),
  };
}

function createMockHistoricalLearner(): IHistoricalLearner {
  const outcomes: TaskOutcome[] = [];
  return {
    recordOutcome: vi.fn().mockImplementation((outcome: TaskOutcome) => {
      outcomes.push(outcome);
      return Promise.resolve();
    }),
    getInsights: vi.fn().mockResolvedValue([]),
    findSimilarTasks: vi.fn().mockResolvedValue([]),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SelfAssessmentEngine', () => {
  describe('constructor', () => {
    it('should create engine with default components', () => {
      const engine = new SelfAssessmentEngine();
      expect(engine).toBeDefined();
    });

    it('should create engine with custom components', () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor(),
        blockerDetector: createMockBlockerDetector(),
        approachEvaluator: createMockApproachEvaluator(),
        historicalLearner: createMockHistoricalLearner(),
      });
      expect(engine).toBeDefined();
    });

    it('should accept custom cache config', () => {
      const engine = new SelfAssessmentEngine({
        cacheConfig: {
          progressTtl: 1000,
          blockersTtl: 500,
        },
      });
      expect(engine).toBeDefined();
    });
  });

  describe('assessProgress', () => {
    it('should return progress assessment', async () => {
      const mockAssessor = createMockProgressAssessor({
        completionEstimate: 0.75,
        confidence: 0.85,
      });
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });

      const context = createMockContext();
      const result = await engine.assessProgress('task-1', context);

      expect(result.completionEstimate).toBe(0.75);
      expect(result.confidence).toBe(0.85);
      expect(mockAssessor.assess).toHaveBeenCalledWith(context);
    });

    it('should cache progress assessment', async () => {
      const mockAssessor = createMockProgressAssessor();
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });

      const context = createMockContext();

      // First call
      await engine.assessProgress('task-1', context);
      // Second call should use cache
      await engine.assessProgress('task-1', context);

      // Should only be called once due to caching
      expect(mockAssessor.assess).toHaveBeenCalledTimes(1);
    });

    it('should emit progress event', async () => {
      const onProgressAssessed = vi.fn();
      const engine = new SelfAssessmentEngine({
        eventEmitter: { onProgressAssessed },
      });

      const context = createMockContext();
      const result = await engine.assessProgress('task-1', context);

      expect(onProgressAssessed).toHaveBeenCalledWith('task-1', result);
    });
  });

  describe('assessBlockers', () => {
    it('should return blocker assessment', async () => {
      const mockDetector = createMockBlockerDetector({
        severity: 'medium',
        blockers: [
          {
            id: 'blocker-1',
            type: 'technical',
            description: 'Type error',
            affectedFiles: ['src/test.ts'],
            possibleSolutions: ['Fix the type'],
            needsHuman: false,
            detectedAt: new Date(),
          },
        ],
      });
      const engine = new SelfAssessmentEngine({
        blockerDetector: mockDetector,
      });

      const context = createMockContext();
      const result = await engine.assessBlockers('task-1', context);

      expect(result.severity).toBe('medium');
      expect(result.blockers).toHaveLength(1);
    });

    it('should cache blocker assessment', async () => {
      const mockDetector = createMockBlockerDetector();
      const engine = new SelfAssessmentEngine({
        blockerDetector: mockDetector,
      });

      const context = createMockContext();

      await engine.assessBlockers('task-1', context);
      await engine.assessBlockers('task-1', context);

      expect(mockDetector.detect).toHaveBeenCalledTimes(1);
    });

    it('should emit blocker event', async () => {
      const onBlockersDetected = vi.fn();
      const engine = new SelfAssessmentEngine({
        eventEmitter: { onBlockersDetected },
      });

      const context = createMockContext();
      const result = await engine.assessBlockers('task-1', context);

      expect(onBlockersDetected).toHaveBeenCalledWith('task-1', result);
    });
  });

  describe('assessApproach', () => {
    it('should return approach assessment', async () => {
      const mockEvaluator = createMockApproachEvaluator({
        effectiveness: 'struggling',
        recommendation: 'Try simpler approach',
      });
      const engine = new SelfAssessmentEngine({
        approachEvaluator: mockEvaluator,
      });

      const context = createMockContext();
      const result = await engine.assessApproach('task-1', context);

      expect(result.effectiveness).toBe('struggling');
      expect(result.recommendation).toBe('Try simpler approach');
    });

    it('should cache approach assessment', async () => {
      const mockEvaluator = createMockApproachEvaluator();
      const engine = new SelfAssessmentEngine({
        approachEvaluator: mockEvaluator,
      });

      const context = createMockContext();

      await engine.assessApproach('task-1', context);
      await engine.assessApproach('task-1', context);

      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(1);
    });

    it('should emit approach event', async () => {
      const onApproachEvaluated = vi.fn();
      const engine = new SelfAssessmentEngine({
        eventEmitter: { onApproachEvaluated },
      });

      const context = createMockContext();
      const result = await engine.assessApproach('task-1', context);

      expect(onApproachEvaluated).toHaveBeenCalledWith('task-1', result);
    });
  });

  describe('recommendNextStep', () => {
    it('should return continue when progress is good', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor({
          completionEstimate: 0.6,
          confidence: 0.8,
        }),
        blockerDetector: createMockBlockerDetector({
          severity: 'none',
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'working',
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('continue');
    });

    it('should return request_help for critical blockers', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor(),
        blockerDetector: createMockBlockerDetector({
          severity: 'critical',
        }),
        approachEvaluator: createMockApproachEvaluator(),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('request_help');
      expect(recommendation.priority).toBe(1);
    });

    it('should return try_alternative when stuck', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor(),
        blockerDetector: createMockBlockerDetector({
          severity: 'low',
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'stuck',
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('try_alternative');
    });

    it('should return abort when wrong_direction', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor(),
        blockerDetector: createMockBlockerDetector({
          severity: 'low',
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'wrong_direction',
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('abort');
    });

    it('should return low confidence recommendation when no context', async () => {
      const engine = new SelfAssessmentEngine();

      const recommendation = await engine.recommendNextStep('unknown-task');

      expect(recommendation.action).toBe('continue');
      expect(recommendation.confidence).toBe(0.3);
    });

    it('should emit recommendation event', async () => {
      const onRecommendation = vi.fn();
      const engine = new SelfAssessmentEngine({
        eventEmitter: { onRecommendation },
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      await engine.recommendNextStep('task-1');

      expect(onRecommendation).toHaveBeenCalled();
    });
  });

  describe('recommendAlternativeApproach', () => {
    it('should return alternatives sorted by confidence', async () => {
      const engine = new SelfAssessmentEngine({
        approachEvaluator: createMockApproachEvaluator({
          alternatives: [
            {
              id: 'alt-1',
              description: 'Alternative 1',
              pros: ['Pro 1'],
              cons: ['Con 1'],
              estimatedEffort: 30,
              confidence: 0.6,
              requiredChanges: ['Change 1'],
            },
            {
              id: 'alt-2',
              description: 'Alternative 2',
              pros: ['Pro 2'],
              cons: ['Con 2'],
              estimatedEffort: 20,
              confidence: 0.9,
              requiredChanges: ['Change 2'],
            },
          ],
        }),
      });

      const context = createMockContext();
      await engine.assessApproach('task-1', context);

      const alternatives = await engine.recommendAlternativeApproach('task-1');

      expect(alternatives).toHaveLength(2);
      expect(alternatives[0].confidence).toBe(0.9);
      expect(alternatives[1].confidence).toBe(0.6);
    });

    it('should return empty array when no context', async () => {
      const engine = new SelfAssessmentEngine();

      const alternatives = await engine.recommendAlternativeApproach('unknown-task');

      expect(alternatives).toHaveLength(0);
    });
  });

  describe('recordOutcome', () => {
    it('should record outcome via historical learner', async () => {
      const mockLearner = createMockHistoricalLearner();
      const engine = new SelfAssessmentEngine({
        historicalLearner: mockLearner,
      });

      const outcome: TaskOutcome = {
        taskId: 'task-1',
        success: true,
        approach: 'Standard approach',
        iterations: 5,
        timeSpent: 30,
        blockers: [],
        lessonsLearned: ['Lesson 1'],
        completedAt: new Date(),
      };

      await engine.recordOutcome(outcome);

      expect(mockLearner.recordOutcome).toHaveBeenCalledWith(outcome);
    });

    it('should invalidate cache after recording outcome', async () => {
      const mockAssessor = createMockProgressAssessor();
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });

      const context = createMockContext({ taskId: 'task-1' });

      // First assessment
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(1);

      // Record outcome (should invalidate cache)
      await engine.recordOutcome({
        taskId: 'task-1',
        success: true,
        approach: 'Test',
        iterations: 1,
        timeSpent: 5,
        blockers: [],
        lessonsLearned: [],
        completedAt: new Date(),
      });

      // Second assessment should not use cache (cache was invalidated)
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(2);
    });

    it('should emit outcome event', async () => {
      const onOutcomeRecorded = vi.fn();
      const engine = new SelfAssessmentEngine({
        eventEmitter: { onOutcomeRecorded },
      });

      const outcome: TaskOutcome = {
        taskId: 'task-1',
        success: true,
        approach: 'Test',
        iterations: 1,
        timeSpent: 5,
        blockers: [],
        lessonsLearned: [],
        completedAt: new Date(),
      };

      await engine.recordOutcome(outcome);

      expect(onOutcomeRecorded).toHaveBeenCalledWith('task-1', outcome);
    });
  });

  describe('getHistoricalInsights', () => {
    it('should delegate to historical learner', async () => {
      const mockLearner = createMockHistoricalLearner();
      const insights: HistoricalInsight[] = [
        {
          pattern: 'Test pattern',
          taskType: 'feature',
          successRate: 0.8,
          averageIterations: 5,
          averageTime: 30,
          commonBlockers: ['Type errors'],
          recommendedApproach: 'TDD',
          sampleSize: 10,
        },
      ];
      (mockLearner.getInsights as ReturnType<typeof vi.fn>).mockResolvedValue(insights);

      const engine = new SelfAssessmentEngine({
        historicalLearner: mockLearner,
      });

      const result = await engine.getHistoricalInsights('feature');

      expect(mockLearner.getInsights).toHaveBeenCalledWith('feature');
      expect(result).toEqual(insights);
    });
  });

  describe('getFullAssessment', () => {
    it('should return complete assessment', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor({
          completionEstimate: 0.5,
        }),
        blockerDetector: createMockBlockerDetector({
          severity: 'low',
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'working',
        }),
      });

      const context = createMockContext();
      const result = await engine.getFullAssessment('task-1', context);

      expect(result.taskId).toBe('task-1');
      expect(result.progress.completionEstimate).toBe(0.5);
      expect(result.blockers.severity).toBe('low');
      expect(result.approach.effectiveness).toBe('working');
      expect(result.recommendation).toBeDefined();
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('should run all assessments concurrently', async () => {
      const mockProgress = createMockProgressAssessor();
      const mockBlockers = createMockBlockerDetector();
      const mockApproach = createMockApproachEvaluator();

      const engine = new SelfAssessmentEngine({
        progressAssessor: mockProgress,
        blockerDetector: mockBlockers,
        approachEvaluator: mockApproach,
      });

      const context = createMockContext();
      await engine.getFullAssessment('task-1', context);

      // All should be called
      expect(mockProgress.assess).toHaveBeenCalled();
      expect(mockBlockers.detect).toHaveBeenCalled();
      expect(mockApproach.evaluate).toHaveBeenCalled();
    });
  });

  describe('caching behavior', () => {
    it('should respect cache TTL', async () => {
      vi.useFakeTimers();

      const mockAssessor = createMockProgressAssessor();
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
        cacheConfig: {
          progressTtl: 1000, // 1 second
        },
      });

      const context = createMockContext();

      // First call
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(1);

      // Cached call (within TTL)
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      // Should fetch again after TTL expired
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should maintain separate caches per task', async () => {
      const mockAssessor = createMockProgressAssessor();
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });

      const context1 = createMockContext({ taskId: 'task-1' });
      const context2 = createMockContext({ taskId: 'task-2' });

      await engine.assessProgress('task-1', context1);
      await engine.assessProgress('task-2', context2);

      // Each task should have its own assessment
      expect(mockAssessor.assess).toHaveBeenCalledTimes(2);
    });
  });

  describe('utility methods', () => {
    it('should clear all caches', async () => {
      const mockAssessor = createMockProgressAssessor();
      const engine = new SelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      engine.clearAllCaches();

      // Should refetch after cache clear
      await engine.assessProgress('task-1', context);
      expect(mockAssessor.assess).toHaveBeenCalledTimes(2);
    });

    it('should return cache statistics', async () => {
      const engine = new SelfAssessmentEngine();

      const context = createMockContext();
      await engine.assessProgress('task-1', context);
      await engine.assessBlockers('task-1', context);
      await engine.assessApproach('task-2', context);

      const stats = engine.getCacheStats();

      expect(stats.taskCount).toBe(2);
      expect(stats.totalEntries).toBe(3);
    });
  });

  describe('default implementations', () => {
    let engine: SelfAssessmentEngine;

    beforeEach(() => {
      engine = new SelfAssessmentEngine();
    });

    it('should provide default progress assessment', async () => {
      const context = createMockContext({
        iterationHistory: [
          {
            iteration: 1,
            phase: 'coding',
            action: 'Write code',
            changes: [],
            errors: [],
            duration: 1000,
            tokens: 100,
            timestamp: new Date(),
          },
        ],
        maxIterations: 10,
      });

      const result = await engine.assessProgress('task-1', context);

      expect(result.taskId).toBe('test-task-1');
      expect(result.completionEstimate).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should provide default blocker detection', async () => {
      const context = createMockContext({
        currentErrors: [
          {
            type: 'build',
            severity: 'error',
            message: 'Cannot find module',
            iteration: 1,
          },
        ],
      });

      const result = await engine.assessBlockers('task-1', context);

      expect(result.blockers).toHaveLength(1);
      expect(result.severity).not.toBe('none');
    });

    it('should provide default approach evaluation', async () => {
      const context = createMockContext();

      const result = await engine.assessApproach('task-1', context);

      expect(result.effectiveness).toBeDefined();
      expect(result.currentApproach).toBeDefined();
    });

    it('should provide default historical learning', async () => {
      // Record some outcomes
      await engine.recordOutcome({
        taskId: 'task-1',
        success: true,
        approach: 'TDD approach',
        iterations: 5,
        timeSpent: 30,
        blockers: ['Type error'],
        lessonsLearned: ['Start with tests'],
        completedAt: new Date(),
      });

      await engine.recordOutcome({
        taskId: 'task-2',
        success: true,
        approach: 'TDD approach',
        iterations: 3,
        timeSpent: 20,
        blockers: [],
        lessonsLearned: ['Tests help'],
        completedAt: new Date(),
      });

      const insights = await engine.getHistoricalInsights('TDD');

      expect(insights).toHaveLength(1);
      expect(insights[0].successRate).toBe(1);
      expect(insights[0].averageIterations).toBe(4);
    });
  });

  describe('recommendation details', () => {
    it('should include progress percentage in details', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor({
          completionEstimate: 0.75,
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.details).toContain('75%');
    });

    it('should include blocker count in details when present', async () => {
      const engine = new SelfAssessmentEngine({
        blockerDetector: createMockBlockerDetector({
          severity: 'medium',
          blockers: [
            {
              id: 'b1',
              type: 'technical',
              description: 'Error 1',
              affectedFiles: [],
              possibleSolutions: [],
              needsHuman: false,
              detectedAt: new Date(),
            },
            {
              id: 'b2',
              type: 'technical',
              description: 'Error 2',
              affectedFiles: [],
              possibleSolutions: [],
              needsHuman: false,
              detectedAt: new Date(),
            },
          ],
        }),
      });

      const context = createMockContext();
      await engine.assessBlockers('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.details).toContain('2');
      expect(recommendation.details).toContain('medium');
    });
  });

  describe('factory function', () => {
    it('should create engine via factory', () => {
      const engine = createSelfAssessmentEngine();
      expect(engine).toBeInstanceOf(SelfAssessmentEngine);
    });

    it('should pass config to factory', () => {
      const mockAssessor = createMockProgressAssessor();
      const engine = createSelfAssessmentEngine({
        progressAssessor: mockAssessor,
      });
      expect(engine).toBeInstanceOf(SelfAssessmentEngine);
    });
  });

  describe('edge cases', () => {
    it('should handle empty iteration history', async () => {
      const engine = new SelfAssessmentEngine();
      const context = createMockContext({
        iterationHistory: [],
      });

      const result = await engine.assessProgress('task-1', context);
      expect(result).toBeDefined();
    });

    it('should handle context without optional fields', async () => {
      const engine = new SelfAssessmentEngine();
      const context: AssessmentContext = {
        taskId: 'minimal-task',
        taskName: 'Minimal',
        taskDescription: 'Minimal context',
        taskFiles: [],
        iterationHistory: [],
        currentErrors: [],
      };

      const fullAssessment = await engine.getFullAssessment('task-1', context);
      expect(fullAssessment).toBeDefined();
    });

    it('should handle high severity with struggling approach', async () => {
      const engine = new SelfAssessmentEngine({
        blockerDetector: createMockBlockerDetector({
          severity: 'high',
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'stuck',
        }),
      });

      const context = createMockContext();
      await engine.assessBlockers('task-1', context);
      await engine.assessApproach('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('try_alternative');
      expect(recommendation.priority).toBe(1);
    });

    it('should handle struggling with low completion', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor({
          completionEstimate: 0.2,
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'struggling',
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('try_alternative');
    });

    it('should handle struggling with high completion', async () => {
      const engine = new SelfAssessmentEngine({
        progressAssessor: createMockProgressAssessor({
          completionEstimate: 0.6,
        }),
        approachEvaluator: createMockApproachEvaluator({
          effectiveness: 'struggling',
        }),
      });

      const context = createMockContext();
      await engine.assessProgress('task-1', context);

      const recommendation = await engine.recommendNextStep('task-1');

      expect(recommendation.action).toBe('continue');
    });
  });
});
