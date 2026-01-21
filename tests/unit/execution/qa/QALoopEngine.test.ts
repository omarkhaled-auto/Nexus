/**
 * QALoopEngine Tests
 *
 * Tests for the QALoopEngine adapter that bridges QARunner to NexusCoordinator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QALoopEngine, createQALoopEngine } from '../../../../src/execution/qa/QALoopEngine';
import type { QARunner, BuildResult, LintResult, TestResult, ReviewResult } from '../../../../src/execution/iteration/types';

describe('QALoopEngine', () => {
  // Helper to create mock QARunner
  const createMockQARunner = (results: {
    build?: BuildResult;
    lint?: LintResult;
    test?: TestResult;
    review?: ReviewResult;
  }): QARunner => ({
    build: results.build ? vi.fn().mockResolvedValue(results.build) : undefined,
    lint: results.lint ? vi.fn().mockResolvedValue(results.lint) : undefined,
    test: results.test ? vi.fn().mockResolvedValue(results.test) : undefined,
    review: results.review ? vi.fn().mockResolvedValue(results.review) : undefined,
  });

  // Default success results
  const successBuild: BuildResult = { success: true, errors: [], warnings: [], duration: 100 };
  const successLint: LintResult = { success: true, errors: [], warnings: [], fixable: 0 };
  const successTest: TestResult = { success: true, passed: 10, failed: 0, skipped: 0, errors: [], duration: 500 };
  const successReview: ReviewResult = { approved: true, comments: [], suggestions: [], blockers: [] };

  // Failure results
  const failBuild: BuildResult = { success: false, errors: [{ type: 'build', severity: 'error', message: 'Build failed', iteration: 1 }], warnings: [], duration: 100 };
  const failLint: LintResult = { success: false, errors: [{ type: 'lint', severity: 'error', message: 'Lint error', iteration: 1 }], warnings: [], fixable: 1 };
  const failTest: TestResult = { success: false, passed: 5, failed: 5, skipped: 0, errors: [{ type: 'test', severity: 'error', message: 'Test failed', iteration: 1 }], duration: 500 };
  const failReview: ReviewResult = { approved: false, comments: ['Needs work'], suggestions: [], blockers: ['Blocker issue'] };

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const qaRunner = createMockQARunner({ build: successBuild });
      const engine = new QALoopEngine({ qaRunner });

      expect(engine).toBeInstanceOf(QALoopEngine);
    });

    it('should create instance with custom max iterations', () => {
      const qaRunner = createMockQARunner({ build: successBuild });
      const engine = new QALoopEngine({ qaRunner, maxIterations: 5 });

      expect(engine).toBeInstanceOf(QALoopEngine);
    });
  });

  describe('run() - Success scenarios', () => {
    it('should return success when all QA steps pass on first iteration', async () => {
      const qaRunner = createMockQARunner({
        build: successBuild,
        lint: successLint,
        test: successTest,
        review: successReview,
      });
      const engine = new QALoopEngine({ qaRunner });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(true);
      expect(result.escalated).toBe(false);
      expect(result.iterations).toBe(1);
      expect(qaRunner.build).toHaveBeenCalledTimes(1);
      expect(qaRunner.lint).toHaveBeenCalledTimes(1);
      expect(qaRunner.test).toHaveBeenCalledTimes(1);
      expect(qaRunner.review).toHaveBeenCalledTimes(1);
    });

    it('should work with only build step', async () => {
      const qaRunner = createMockQARunner({ build: successBuild });
      const engine = new QALoopEngine({ qaRunner });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
    });

    it('should work with no QA steps (empty runner)', async () => {
      const qaRunner: QARunner = {};
      const engine = new QALoopEngine({ qaRunner });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
    });
  });

  describe('run() - Failure and retry scenarios', () => {
    it('should retry on build failure', async () => {
      let callCount = 0;
      const qaRunner: QARunner = {
        build: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount < 3 ? failBuild : successBuild);
        }),
      };
      const engine = new QALoopEngine({ qaRunner, maxIterations: 5 });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(qaRunner.build).toHaveBeenCalledTimes(3);
    });

    it('should escalate after max iterations', async () => {
      const qaRunner = createMockQARunner({ build: failBuild });
      const engine = new QALoopEngine({ qaRunner, maxIterations: 3 });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.reason).toBe('Max QA iterations exceeded');
      expect(result.iterations).toBe(3);
      expect(qaRunner.build).toHaveBeenCalledTimes(3);
    });

    it('should skip later steps if build fails with stopOnFirstFailure', async () => {
      const qaRunner = createMockQARunner({
        build: failBuild,
        lint: successLint,
        test: successTest,
      });
      const engine = new QALoopEngine({ qaRunner, maxIterations: 1, stopOnFirstFailure: true });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(qaRunner.build).toHaveBeenCalledTimes(1);
      // Lint and test should NOT be called because build failed
      expect(qaRunner.lint).not.toHaveBeenCalled();
      expect(qaRunner.test).not.toHaveBeenCalled();
    });
  });

  describe('run() - Error handling', () => {
    it('should handle build step throwing error', async () => {
      const qaRunner: QARunner = {
        build: vi.fn().mockRejectedValue(new Error('Build crashed')),
      };
      const engine = new QALoopEngine({ qaRunner, maxIterations: 2 });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(qaRunner.build).toHaveBeenCalledTimes(2);
    });
  });

  describe('run() - Result tracking', () => {
    it('should track last QA results', async () => {
      const qaRunner = createMockQARunner({
        build: successBuild,
        lint: successLint,
        test: successTest,
        review: successReview,
      });
      const engine = new QALoopEngine({ qaRunner });

      const result = await engine.run(
        { id: 'task-1', name: 'Test Task', description: 'Test', files: [] },
        null
      );

      expect(result.lastBuild).toEqual(successBuild);
      expect(result.lastLint).toEqual(successLint);
      expect(result.lastTest).toEqual(successTest);
      expect(result.lastReview).toEqual(successReview);
    });
  });

  describe('runOnce()', () => {
    it('should run all QA steps once without retry', async () => {
      const qaRunner = createMockQARunner({
        build: successBuild,
        lint: successLint,
        test: failTest, // Even though test fails, runOnce doesn't retry
      });
      const engine = new QALoopEngine({ qaRunner });

      const result = await engine.runOnce({ id: 'task-1', name: 'Test', description: '', files: [] });

      expect(result.allPassed).toBe(false);
      expect(result.build).toEqual(successBuild);
      expect(result.lint).toEqual(successLint);
      expect(result.test).toEqual(failTest);
    });
  });

  describe('createQALoopEngine factory', () => {
    it('should create engine via factory function', async () => {
      const qaRunner = createMockQARunner({ build: successBuild });
      const engine = createQALoopEngine(qaRunner, { maxIterations: 10 });

      expect(engine).toBeInstanceOf(QALoopEngine);

      const result = await engine.run(
        { id: 'task-1', name: 'Test', description: '', files: [] },
        null
      );
      expect(result.success).toBe(true);
    });
  });
});
