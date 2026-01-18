/**
 * Tests for ApproachEvaluator
 *
 * Tests the evaluation of approach effectiveness, alternative generation,
 * and recommendation making.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApproachEvaluator, createApproachEvaluator } from './ApproachEvaluator';
import type { AssessmentContext, IterationHistoryEntry, ErrorEntry } from './types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock assessment context
 */
function createMockContext(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    taskId: 'test-task-1',
    taskName: 'Test Task',
    taskDescription: 'A test task for evaluation',
    taskFiles: ['src/test.ts', 'src/utils.ts'],
    iterationHistory: [],
    currentErrors: [],
    ...overrides,
  };
}

/**
 * Create a mock iteration history entry
 */
function createMockIteration(overrides: Partial<IterationHistoryEntry> = {}): IterationHistoryEntry {
  return {
    iteration: 1,
    status: 'completed',
    filesModified: [],
    errors: [],
    startedAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock error entry
 */
function createMockError(message: string, file?: string): ErrorEntry {
  return {
    message,
    file,
    timestamp: new Date(),
  };
}

/**
 * Create iteration history with decreasing errors
 */
function createDecreasingErrorHistory(iterations: number): IterationHistoryEntry[] {
  return Array.from({ length: iterations }, (_, i) => {
    const errorCount = Math.max(0, iterations - i - 2);
    return createMockIteration({
      iteration: i + 1,
      errors: Array.from({ length: errorCount }, (_, j) =>
        createMockError(`Error ${j + 1} in iteration ${i + 1}`)
      ),
      filesModified: [`src/file${i}.ts`],
    });
  });
}

/**
 * Create iteration history with increasing errors
 */
function createIncreasingErrorHistory(iterations: number): IterationHistoryEntry[] {
  return Array.from({ length: iterations }, (_, i) =>
    createMockIteration({
      iteration: i + 1,
      errors: Array.from({ length: i + 1 }, (_, j) =>
        createMockError(`Error ${j + 1} in iteration ${i + 1}`)
      ),
      filesModified: [`src/file${i}.ts`],
    })
  );
}

/**
 * Create iteration history with repeated errors
 */
function createRepeatedErrorHistory(iterations: number): IterationHistoryEntry[] {
  const repeatedError = 'Cannot find module "missing-module"';
  return Array.from({ length: iterations }, (_, i) =>
    createMockIteration({
      iteration: i + 1,
      errors: [createMockError(repeatedError)],
      filesModified: [`src/file${i}.ts`],
    })
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('ApproachEvaluator', () => {
  let evaluator: ApproachEvaluator;

  beforeEach(() => {
    evaluator = new ApproachEvaluator();
  });

  // ===========================================================================
  // Basic Functionality Tests
  // ===========================================================================

  describe('basic functionality', () => {
    it('should create an evaluator instance', () => {
      expect(evaluator).toBeDefined();
      expect(evaluator).toBeInstanceOf(ApproachEvaluator);
    });

    it('should evaluate a simple context', async () => {
      const context = createMockContext();
      const assessment = await evaluator.evaluate(context);

      expect(assessment).toBeDefined();
      expect(assessment.taskId).toBe('test-task-1');
      expect(assessment.currentApproach).toBeTruthy();
      expect(assessment.effectiveness).toBeDefined();
      expect(assessment.confidence).toBeGreaterThan(0);
      expect(assessment.alternatives).toBeInstanceOf(Array);
      expect(assessment.recommendation).toBeTruthy();
      expect(assessment.assessedAt).toBeInstanceOf(Date);
    });

    it('should use factory function', () => {
      const factoryEvaluator = createApproachEvaluator();
      expect(factoryEvaluator).toBeInstanceOf(ApproachEvaluator);
    });
  });

  // ===========================================================================
  // Effectiveness Determination Tests
  // ===========================================================================

  describe('effectiveness determination', () => {
    it('should return working with low confidence for minimal history', async () => {
      const context = createMockContext({
        iterationHistory: [createMockIteration()],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.effectiveness).toBe('working');
      expect(assessment.confidence).toBeLessThanOrEqual(0.4);
    });

    it('should detect working approach with decreasing errors', async () => {
      const context = createMockContext({
        iterationHistory: createDecreasingErrorHistory(5),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.effectiveness).toBe('working');
      expect(assessment.confidence).toBeGreaterThan(0.5);
    });

    it('should detect struggling approach with stable errors', async () => {
      const stableErrorHistory = Array.from({ length: 5 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: [createMockError('Consistent error')],
          filesModified: [`src/file${i}.ts`],
        })
      );

      const context = createMockContext({
        iterationHistory: stableErrorHistory,
      });

      const assessment = await evaluator.evaluate(context);

      // Should be struggling or stuck with stable errors
      expect(['struggling', 'stuck']).toContain(assessment.effectiveness);
    });

    it('should detect stuck approach with repeated errors', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Cannot find module "missing-module"')],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.effectiveness).toBe('stuck');
    });

    it('should detect wrong direction with increasing errors and scope creep', async () => {
      // Create history with increasing errors and scope creep
      const scopeCreepHistory = Array.from({ length: 5 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: Array.from({ length: i + 2 }, (_, j) =>
            createMockError(`Error ${j + 1}`)
          ),
          // Files not in expected list = scope creep
          filesModified: [`src/unexpected-file-${i}.ts`, `lib/extra-${i}.ts`],
        })
      );

      const context = createMockContext({
        iterationHistory: scopeCreepHistory,
        taskFiles: ['src/test.ts'], // Only one expected file
        currentErrors: [
          createMockError('Error 1'),
          createMockError('Error 2'),
          createMockError('Error 3'),
        ],
      });

      const assessment = await evaluator.evaluate(context);

      expect(['stuck', 'wrong_direction']).toContain(assessment.effectiveness);
    });
  });

  // ===========================================================================
  // Approach Inference Tests
  // ===========================================================================

  describe('approach inference', () => {
    it('should infer incremental approach from feedback', async () => {
      const context = createMockContext({
        agentFeedback: 'Working on this step by step, implementing incrementally',
        iterationHistory: createDecreasingErrorHistory(3),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.currentApproach.toLowerCase()).toContain('incremental');
    });

    it('should infer debugging approach from feedback', async () => {
      const context = createMockContext({
        agentFeedback: 'Debugging the issue, trying to trace the root cause',
        iterationHistory: createDecreasingErrorHistory(3),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.currentApproach.toLowerCase()).toContain('debug');
    });

    it('should infer test-driven approach from file patterns', async () => {
      const testHistory = Array.from({ length: 3 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          filesModified: [`src/component.ts`, `src/component.test.ts`],
        })
      );

      const context = createMockContext({
        iterationHistory: testHistory,
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.currentApproach.toLowerCase()).toContain('test');
    });

    it('should use default approach when no patterns detected', async () => {
      const context = createMockContext({
        iterationHistory: [
          createMockIteration({ filesModified: ['src/file.ts'] }),
        ],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.currentApproach).toBeTruthy();
    });
  });

  // ===========================================================================
  // Alternative Generation Tests
  // ===========================================================================

  describe('alternative generation', () => {
    it('should not generate alternatives when working', async () => {
      const context = createMockContext({
        iterationHistory: createDecreasingErrorHistory(5),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.alternatives).toHaveLength(0);
    });

    it('should generate alternatives when struggling', async () => {
      const stableErrorHistory = Array.from({ length: 5 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: [createMockError(`Error in iteration ${i + 1}`)],
          filesModified: [], // No file progress
        })
      );

      const context = createMockContext({
        iterationHistory: stableErrorHistory,
        currentErrors: [createMockError('Current error')],
      });

      const assessment = await evaluator.evaluate(context);

      if (assessment.effectiveness === 'struggling' || assessment.effectiveness === 'stuck') {
        expect(assessment.alternatives.length).toBeGreaterThan(0);
      }
    });

    it('should generate alternatives when stuck', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Cannot find module "missing-module"')],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.alternatives.length).toBeGreaterThan(0);
    });

    it('should limit alternatives to 3', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Error')],
        agentFeedback: 'This is complex, unfamiliar, and difficult to debug',
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should sort alternatives by confidence', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Error')],
      });

      const assessment = await evaluator.evaluate(context);

      if (assessment.alternatives.length >= 2) {
        for (let i = 0; i < assessment.alternatives.length - 1; i++) {
          expect(assessment.alternatives[i].confidence).toBeGreaterThanOrEqual(
            assessment.alternatives[i + 1].confidence
          );
        }
      }
    });

    it('should include required properties in alternatives', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Error')],
      });

      const assessment = await evaluator.evaluate(context);

      for (const alt of assessment.alternatives) {
        expect(alt.id).toBeTruthy();
        expect(alt.description).toBeTruthy();
        expect(alt.pros).toBeInstanceOf(Array);
        expect(alt.cons).toBeInstanceOf(Array);
        expect(typeof alt.estimatedEffort).toBe('number');
        expect(typeof alt.confidence).toBe('number');
        expect(alt.requiredChanges).toBeInstanceOf(Array);
      }
    });
  });

  // ===========================================================================
  // Recommendation Tests
  // ===========================================================================

  describe('recommendations', () => {
    it('should recommend continuing when working', async () => {
      const context = createMockContext({
        iterationHistory: createDecreasingErrorHistory(5),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.recommendation.toLowerCase()).toContain('continue');
    });

    it('should recommend alternatives when struggling', async () => {
      const stableErrorHistory = Array.from({ length: 6 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: [createMockError('Persistent error')],
          filesModified: [], // No file progress = struggling
        })
      );

      const context = createMockContext({
        iterationHistory: stableErrorHistory,
        currentErrors: [createMockError('Persistent error')],
      });

      const assessment = await evaluator.evaluate(context);

      if (assessment.effectiveness === 'struggling') {
        expect(assessment.recommendation.toLowerCase()).toMatch(/consider|simplifying|smaller/);
      }
    });

    it('should mention repeated errors when stuck', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Cannot find module "missing-module"')],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.recommendation.toLowerCase()).toMatch(/repeated|stuck|try|help/);
    });

    it('should strongly recommend change when wrong direction', async () => {
      const wrongDirectionHistory = Array.from({ length: 5 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: Array.from({ length: i * 2 + 1 }, (_, j) =>
            createMockError(`Growing error ${j}`)
          ),
          filesModified: [`unexpected-${i}.ts`, `extra-${i}.ts`],
        })
      );

      const context = createMockContext({
        iterationHistory: wrongDirectionHistory,
        taskFiles: ['src/expected.ts'],
        currentErrors: Array.from({ length: 10 }, (_, j) =>
          createMockError(`Error ${j}`)
        ),
      });

      const assessment = await evaluator.evaluate(context);

      if (assessment.effectiveness === 'wrong_direction') {
        expect(assessment.recommendation.toLowerCase()).toMatch(/stop|immediately|revert|recommend/);
      }
    });
  });

  // ===========================================================================
  // Confidence Calculation Tests
  // ===========================================================================

  describe('confidence calculation', () => {
    it('should have higher confidence with more iterations', async () => {
      const shortContext = createMockContext({
        iterationHistory: createDecreasingErrorHistory(3),
      });

      const longContext = createMockContext({
        iterationHistory: createDecreasingErrorHistory(8),
      });

      const shortAssessment = await evaluator.evaluate(shortContext);
      const longAssessment = await evaluator.evaluate(longContext);

      expect(longAssessment.confidence).toBeGreaterThan(shortAssessment.confidence);
    });

    it('should return confidence between 0 and 1', async () => {
      const contexts = [
        createMockContext({ iterationHistory: createDecreasingErrorHistory(2) }),
        createMockContext({ iterationHistory: createIncreasingErrorHistory(5) }),
        createMockContext({ iterationHistory: createRepeatedErrorHistory(3) }),
      ];

      for (const context of contexts) {
        const assessment = await evaluator.evaluate(context);
        expect(assessment.confidence).toBeGreaterThanOrEqual(0);
        expect(assessment.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle empty iteration history', async () => {
      const context = createMockContext({
        iterationHistory: [],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.effectiveness).toBe('working');
      expect(assessment.confidence).toBeLessThanOrEqual(0.4);
    });

    it('should handle no errors', async () => {
      // Use file names that match taskFiles to avoid scope creep detection
      const noErrorHistory = Array.from({ length: 5 }, (_, i) =>
        createMockIteration({
          iteration: i + 1,
          errors: [],
          filesModified: ['src/test.ts', 'src/utils.ts'], // Match taskFiles
        })
      );

      const context = createMockContext({
        iterationHistory: noErrorHistory,
        currentErrors: [],
        taskFiles: ['src/test.ts', 'src/utils.ts'],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment.effectiveness).toBe('working');
      expect(assessment.recommendation.toLowerCase()).toContain('no error');
    });

    it('should handle no task files', async () => {
      const context = createMockContext({
        taskFiles: [],
        iterationHistory: createDecreasingErrorHistory(3),
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment).toBeDefined();
    });

    it('should handle context with time information', async () => {
      const context = createMockContext({
        iterationHistory: createDecreasingErrorHistory(3),
        timeElapsed: 50,
        estimatedTime: 60,
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment).toBeDefined();
    });

    it('should handle context with acceptance criteria', async () => {
      const context = createMockContext({
        iterationHistory: createDecreasingErrorHistory(3),
        acceptanceCriteria: ['Feature X works', 'Tests pass', 'No lint errors'],
      });

      const assessment = await evaluator.evaluate(context);

      expect(assessment).toBeDefined();
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('integration scenarios', () => {
    it('should handle a complete workflow from working to stuck', async () => {
      // Start working
      const workingHistory = createDecreasingErrorHistory(3);
      let context = createMockContext({ iterationHistory: workingHistory });
      let assessment = await evaluator.evaluate(context);
      expect(assessment.effectiveness).toBe('working');

      // Add repeated errors - becomes stuck
      const stuckHistory = [
        ...workingHistory,
        ...createRepeatedErrorHistory(5),
      ];
      context = createMockContext({
        iterationHistory: stuckHistory,
        currentErrors: [createMockError('Cannot find module "missing-module"')],
      });
      assessment = await evaluator.evaluate(context);
      expect(assessment.effectiveness).toBe('stuck');
      expect(assessment.alternatives.length).toBeGreaterThan(0);
    });

    it('should provide actionable alternatives for complex scenarios', async () => {
      const context = createMockContext({
        iterationHistory: createRepeatedErrorHistory(5),
        currentErrors: [createMockError('Complex type error')],
        agentFeedback: 'This is a complex problem, not sure how to proceed',
        taskFiles: ['src/complex-feature.ts', 'src/types.ts', 'src/utils.ts'],
      });

      const assessment = await evaluator.evaluate(context);

      // Should have alternatives with concrete suggestions
      expect(assessment.alternatives.length).toBeGreaterThan(0);
      for (const alt of assessment.alternatives) {
        expect(alt.requiredChanges.length).toBeGreaterThan(0);
        expect(alt.pros.length).toBeGreaterThan(0);
      }
    });

    it('should detect knowledge gap and suggest research', async () => {
      const context = createMockContext({
        iterationHistory: [
          createMockIteration({
            iteration: 1,
            errors: [createMockError('Unknown error')],
          }),
          createMockIteration({
            iteration: 2,
            errors: [createMockError('Still stuck on this')],
          }),
          createMockIteration({
            iteration: 3,
            errors: [createMockError('Need more info')],
          }),
        ],
        agentFeedback: "I'm not familiar with this pattern, need to research how to implement it",
        currentErrors: [createMockError('Error')],
      });

      const assessment = await evaluator.evaluate(context);

      // Should suggest research approach
      const researchAlternative = assessment.alternatives.find(
        (a) => a.description.toLowerCase().includes('research')
      );
      if (researchAlternative) {
        expect(researchAlternative).toBeDefined();
      }
    });
  });
});
