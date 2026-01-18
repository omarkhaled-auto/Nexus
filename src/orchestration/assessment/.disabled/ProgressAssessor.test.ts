/**
 * Progress Assessor Tests
 *
 * Tests for the ProgressAssessor class that estimates task completion
 * by analyzing multiple signals including iterations, errors, and file modifications.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressAssessor, createProgressAssessor } from './ProgressAssessor';
import type { AssessmentContext, IterationHistoryEntry, ErrorEntry } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    taskId: 'test-task-1',
    taskName: 'Test Task',
    taskDescription: 'A test task for assessment',
    taskFiles: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'],
    iterationHistory: [],
    currentErrors: [],
    ...overrides,
  };
}

function createIterationEntry(overrides: Partial<IterationHistoryEntry> = {}): IterationHistoryEntry {
  return {
    iteration: 1,
    status: 'success',
    errors: [],
    filesModified: [],
    timestamp: new Date(),
    ...overrides,
  };
}

function createErrorEntry(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    message: 'Test error',
    type: 'error',
    timestamp: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ProgressAssessor', () => {
  let assessor: ProgressAssessor;

  beforeEach(() => {
    assessor = new ProgressAssessor();
  });

  describe('constructor', () => {
    it('should create with default thresholds', () => {
      const instance = new ProgressAssessor();
      expect(instance).toBeDefined();
    });

    it('should create with custom thresholds', () => {
      const instance = new ProgressAssessor({
        almostDone: 0.9,
        goodProgress: 0.6,
      });
      expect(instance).toBeDefined();
    });
  });

  describe('assess()', () => {
    it('should return a valid ProgressAssessment', async () => {
      const context = createMockContext();
      const result = await assessor.assess(context);

      expect(result).toMatchObject({
        taskId: 'test-task-1',
        completionEstimate: expect.any(Number),
        confidence: expect.any(Number),
        remainingWork: expect.any(Array),
        completedWork: expect.any(Array),
        blockers: expect.any(Array),
        risks: expect.any(Array),
        estimatedRemainingTime: expect.any(Number),
        assessedAt: expect.any(Date),
      });
    });

    it('should have completion estimate between 0 and 1', async () => {
      const context = createMockContext();
      const result = await assessor.assess(context);

      expect(result.completionEstimate).toBeGreaterThanOrEqual(0);
      expect(result.completionEstimate).toBeLessThanOrEqual(1);
    });

    it('should have confidence between minimum and 0.95', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1 }),
          createIterationEntry({ iteration: 2 }),
          createIterationEntry({ iteration: 3 }),
        ],
      });
      const result = await assessor.assess(context);

      expect(result.confidence).toBeGreaterThanOrEqual(0.3); // minimum
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('completion estimation', () => {
    it('should show low completion with no iterations', async () => {
      const context = createMockContext();
      const result = await assessor.assess(context);

      expect(result.completionEstimate).toBeLessThanOrEqual(0.3);
    });

    it('should show higher completion with more iterations', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1 }),
          createIterationEntry({ iteration: 2 }),
          createIterationEntry({ iteration: 3 }),
          createIterationEntry({ iteration: 4 }),
          createIterationEntry({ iteration: 5 }),
        ],
        maxIterations: 10,
      });
      const result = await assessor.assess(context);

      expect(result.completionEstimate).toBeGreaterThan(0.3);
    });

    it('should cap completion at 0.9 when there are errors', async () => {
      const context = createMockContext({
        iterationHistory: Array.from({ length: 15 }, (_, i) =>
          createIterationEntry({ iteration: i + 1 })
        ),
        currentErrors: [createErrorEntry({ message: 'Some error' })],
        maxIterations: 20,
      });
      const result = await assessor.assess(context);

      expect(result.completionEstimate).toBeLessThanOrEqual(0.9);
    });

    it('should reflect decreasing errors with higher completion', async () => {
      const contextDecreasing = createMockContext({
        iterationHistory: [
          createIterationEntry({
            iteration: 1,
            errors: [
              createErrorEntry({ message: 'error1' }),
              createErrorEntry({ message: 'error2' }),
              createErrorEntry({ message: 'error3' }),
            ],
          }),
          createIterationEntry({
            iteration: 2,
            errors: [
              createErrorEntry({ message: 'error1' }),
              createErrorEntry({ message: 'error2' }),
            ],
          }),
          createIterationEntry({
            iteration: 3,
            errors: [createErrorEntry({ message: 'error1' })],
          }),
          createIterationEntry({ iteration: 4, errors: [] }),
          createIterationEntry({ iteration: 5, errors: [] }),
        ],
        currentErrors: [],
        maxIterations: 10,
      });

      const result = await assessor.assess(contextDecreasing);

      // Decreasing errors should lead to higher completion estimate
      expect(result.completionEstimate).toBeGreaterThan(0.5);
    });

    it('should reflect increasing errors with lower completion', async () => {
      const contextIncreasing = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1, errors: [] }),
          createIterationEntry({ iteration: 2, errors: [createErrorEntry({ message: 'error1' })] }),
          createIterationEntry({
            iteration: 3,
            errors: [createErrorEntry({ message: 'error1' }), createErrorEntry({ message: 'error2' })],
          }),
          createIterationEntry({
            iteration: 4,
            errors: [
              createErrorEntry({ message: 'error1' }),
              createErrorEntry({ message: 'error2' }),
              createErrorEntry({ message: 'error3' }),
            ],
          }),
          createIterationEntry({
            iteration: 5,
            errors: [
              createErrorEntry({ message: 'error1' }),
              createErrorEntry({ message: 'error2' }),
              createErrorEntry({ message: 'error3' }),
              createErrorEntry({ message: 'error4' }),
            ],
          }),
        ],
        currentErrors: [
          createErrorEntry({ message: 'error1' }),
          createErrorEntry({ message: 'error2' }),
          createErrorEntry({ message: 'error3' }),
          createErrorEntry({ message: 'error4' }),
        ],
        maxIterations: 10,
      });

      const result = await assessor.assess(contextIncreasing);

      // Increasing errors should lead to lower completion estimate
      expect(result.completionEstimate).toBeLessThan(0.6);
    });
  });

  describe('confidence calculation', () => {
    it('should have low confidence with few iterations', async () => {
      const context = createMockContext({
        iterationHistory: [createIterationEntry()],
      });
      const result = await assessor.assess(context);

      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should have higher confidence with many successful iterations', async () => {
      const context = createMockContext({
        iterationHistory: Array.from({ length: 10 }, (_, i) =>
          createIterationEntry({ iteration: i + 1, status: 'success' })
        ),
        currentErrors: [],
      });
      const result = await assessor.assess(context);

      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should decrease confidence when errors are increasing', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1, errors: [] }),
          createIterationEntry({ iteration: 2, errors: [createErrorEntry()] }),
          createIterationEntry({
            iteration: 3,
            errors: [createErrorEntry(), createErrorEntry()],
          }),
          createIterationEntry({
            iteration: 4,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
          createIterationEntry({
            iteration: 5,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
        ],
        currentErrors: [createErrorEntry(), createErrorEntry(), createErrorEntry(), createErrorEntry()],
      });
      const result = await assessor.assess(context);

      // Confidence should be penalized for increasing errors
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('remaining work identification', () => {
    it('should include error fixes in remaining work', async () => {
      const context = createMockContext({
        currentErrors: [
          createErrorEntry({ message: 'Error in module A' }),
          createErrorEntry({ message: 'Error in module B' }),
        ],
      });
      const result = await assessor.assess(context);

      expect(result.remainingWork.some((w) => w.includes('error'))).toBe(true);
    });

    it('should include acceptance criteria in remaining work', async () => {
      const context = createMockContext({
        acceptanceCriteria: ['Feature X should work', 'Tests should pass', 'Documentation updated'],
      });
      const result = await assessor.assess(context);

      expect(result.remainingWork.some((w) => w.includes('acceptance criteria'))).toBe(true);
    });

    it('should include file modifications in remaining work', async () => {
      const context = createMockContext({
        taskFiles: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'],
        iterationHistory: [],
        codeChanges: '', // No changes yet
      });
      const result = await assessor.assess(context);

      expect(result.remainingWork.some((w) => w.includes('file') || w.includes('Modify'))).toBe(true);
    });
  });

  describe('completed work identification', () => {
    it('should include iteration count in completed work', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1 }),
          createIterationEntry({ iteration: 2 }),
          createIterationEntry({ iteration: 3 }),
        ],
      });
      const result = await assessor.assess(context);

      expect(result.completedWork.some((w) => w.includes('3 iteration'))).toBe(true);
    });

    it('should include successful iterations in completed work', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1, status: 'success' }),
          createIterationEntry({ iteration: 2, status: 'failed', errors: [createErrorEntry()] }),
          createIterationEntry({ iteration: 3, status: 'success' }),
        ],
      });
      const result = await assessor.assess(context);

      expect(result.completedWork.some((w) => w.includes('successful'))).toBe(true);
    });

    it('should include fixed errors in completed work', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({
            iteration: 1,
            errors: [
              createErrorEntry({ message: 'Error A' }),
              createErrorEntry({ message: 'Error B' }),
            ],
          }),
          createIterationEntry({
            iteration: 2,
            errors: [createErrorEntry({ message: 'Error A' })],
          }),
          createIterationEntry({ iteration: 3, errors: [] }),
        ],
        currentErrors: [],
      });
      const result = await assessor.assess(context);

      expect(result.completedWork.some((w) => w.includes('Fixed'))).toBe(true);
    });
  });

  describe('blocker identification', () => {
    it('should identify persistent errors as blockers', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({
            iteration: 1,
            errors: [createErrorEntry({ message: 'Cannot find module X' })],
          }),
          createIterationEntry({
            iteration: 2,
            errors: [createErrorEntry({ message: 'Cannot find module X' })],
          }),
          createIterationEntry({
            iteration: 3,
            errors: [createErrorEntry({ message: 'Cannot find module X' })],
          }),
        ],
        currentErrors: [createErrorEntry({ message: 'Cannot find module X' })],
      });
      const result = await assessor.assess(context);

      expect(result.blockers.some((b) => b.includes('Persistent'))).toBe(true);
    });

    it('should identify critical errors as blockers', async () => {
      const context = createMockContext({
        currentErrors: [createErrorEntry({ message: 'Module not found: critical-dependency' })],
      });
      const result = await assessor.assess(context);

      expect(result.blockers.some((b) => b.includes('Critical') || b.includes('not found'))).toBe(
        true
      );
    });
  });

  describe('risk assessment', () => {
    it('should identify time risk when running late', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1 }),
          createIterationEntry({ iteration: 2 }),
        ],
        estimatedTime: 30,
        timeElapsed: 28,
        maxIterations: 20,
      });
      const result = await assessor.assess(context);

      expect(result.risks.some((r) => r.type === 'time')).toBe(true);
    });

    it('should identify technical risk when errors increasing', async () => {
      const context = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1, errors: [] }),
          createIterationEntry({ iteration: 2, errors: [createErrorEntry()] }),
          createIterationEntry({
            iteration: 3,
            errors: [createErrorEntry(), createErrorEntry()],
          }),
          createIterationEntry({
            iteration: 4,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
          createIterationEntry({
            iteration: 5,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
        ],
        currentErrors: Array.from({ length: 4 }, () => createErrorEntry()),
      });
      const result = await assessor.assess(context);

      expect(result.risks.some((r) => r.type === 'technical')).toBe(true);
    });

    it('should identify scope risk when modifying extra files', async () => {
      const context = createMockContext({
        taskFiles: ['src/target.ts'],
        codeChanges: `
+++ b/src/target.ts
+++ b/src/extra1.ts
+++ b/src/extra2.ts
+++ b/src/extra3.ts
+++ b/src/extra4.ts
`,
      });
      const result = await assessor.assess(context);

      expect(result.risks.some((r) => r.type === 'scope')).toBe(true);
    });

    it('should include risk scores', async () => {
      const context = createMockContext({
        estimatedTime: 30,
        timeElapsed: 35, // Over time
      });
      const result = await assessor.assess(context);

      for (const risk of result.risks) {
        expect(risk.riskScore).toBe(risk.probability * risk.impact);
        expect(risk.probability).toBeGreaterThanOrEqual(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
        expect(risk.impact).toBeGreaterThanOrEqual(0);
        expect(risk.impact).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('remaining time estimation', () => {
    it('should estimate remaining time based on progress', async () => {
      const context = createMockContext({
        iterationHistory: Array.from({ length: 5 }, (_, i) =>
          createIterationEntry({ iteration: i + 1 })
        ),
        maxIterations: 20,
        estimatedTime: 60,
        timeElapsed: 15,
      });
      const result = await assessor.assess(context);

      expect(result.estimatedRemainingTime).toBeGreaterThan(0);
    });

    it('should return 0 remaining time when complete', async () => {
      const context = createMockContext({
        iterationHistory: Array.from({ length: 20 }, (_, i) =>
          createIterationEntry({ iteration: i + 1, status: 'success' })
        ),
        maxIterations: 20,
        currentErrors: [],
      });
      const result = await assessor.assess(context);

      // If completion is very high, remaining time should be low
      if (result.completionEstimate >= 0.99) {
        expect(result.estimatedRemainingTime).toBe(0);
      }
    });

    it('should adjust time for increasing errors', async () => {
      const contextStable = createMockContext({
        iterationHistory: Array.from({ length: 5 }, (_, i) =>
          createIterationEntry({ iteration: i + 1 })
        ),
        maxIterations: 20,
        estimatedTime: 60,
        timeElapsed: 15,
      });

      const contextIncreasing = createMockContext({
        iterationHistory: [
          createIterationEntry({ iteration: 1, errors: [] }),
          createIterationEntry({ iteration: 2, errors: [createErrorEntry()] }),
          createIterationEntry({ iteration: 3, errors: [createErrorEntry(), createErrorEntry()] }),
          createIterationEntry({
            iteration: 4,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
          createIterationEntry({
            iteration: 5,
            errors: [createErrorEntry(), createErrorEntry(), createErrorEntry(), createErrorEntry()],
          }),
        ],
        currentErrors: Array.from({ length: 4 }, () => createErrorEntry()),
        maxIterations: 20,
        estimatedTime: 60,
        timeElapsed: 15,
      });

      const resultStable = await assessor.assess(contextStable);
      const resultIncreasing = await assessor.assess(contextIncreasing);

      // Increasing errors should lead to higher time estimate
      expect(resultIncreasing.estimatedRemainingTime).toBeGreaterThan(
        resultStable.estimatedRemainingTime
      );
    });
  });
});

describe('createProgressAssessor', () => {
  it('should create a ProgressAssessor with default config', () => {
    const assessor = createProgressAssessor();
    expect(assessor).toBeInstanceOf(ProgressAssessor);
  });

  it('should create a ProgressAssessor with custom thresholds', () => {
    const assessor = createProgressAssessor({
      almostDone: 0.85,
      minimumConfidence: 0.4,
    });
    expect(assessor).toBeInstanceOf(ProgressAssessor);
  });
});
