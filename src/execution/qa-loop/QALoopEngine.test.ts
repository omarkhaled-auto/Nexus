// QALoopEngine Tests
// Phase 03-03: Quality Verification Layer - TDD RED Phase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QALoopEngine, QAError, EscalationError } from './QALoopEngine';
import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { Task } from '@/execution/agents/types';
import type { VerificationResult, ReviewResult, TestResult } from '@/quality/types';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockBuildVerifier(): BuildVerifier {
  return {
    verify: vi.fn(),
    parseErrors: vi.fn(),
  } as unknown as BuildVerifier;
}

function createMockLintRunner(): LintRunner {
  return {
    run: vi.fn(),
    runWithFix: vi.fn(),
    parseOutput: vi.fn(),
  } as unknown as LintRunner;
}

function createMockTestRunner(): TestRunner {
  return {
    run: vi.fn(),
    runWithCoverage: vi.fn(),
    parseOutput: vi.fn(),
  } as unknown as TestRunner;
}

function createMockCodeReviewer(): CodeReviewer {
  return {
    review: vi.fn(),
    reviewDiff: vi.fn(),
  } as unknown as CodeReviewer;
}

function createMockCoderRunner(): CoderRunner {
  return {
    execute: vi.fn(),
    getState: vi.fn().mockReturnValue('idle'),
    cancel: vi.fn(),
    agentType: 'coder',
    systemPrompt: 'mock prompt',
  } as unknown as CoderRunner;
}

function createVerificationResult(success: boolean, errorCount = 0): VerificationResult {
  return {
    success,
    errors: Array.from({ length: errorCount }, (_, i) => ({
      type: 'build' as const,
      file: `file${String(i)}.ts`,
      line: i + 1,
      message: `Error ${String(i)}`,
    })),
    warnings: [],
    duration: 100,
  };
}

function createTestResult(success: boolean, failedCount = 0): TestResult {
  return {
    success,
    passed: success ? 5 : 5 - failedCount,
    failed: failedCount,
    skipped: 0,
    failures: Array.from({ length: failedCount }, (_, i) => ({
      testName: `Test ${String(i)}`,
      file: `test${String(i)}.ts`,
      message: `Failed ${String(i)}`,
    })),
    duration: 100,
  };
}

function createReviewResult(approved: boolean, criticalCount = 0, majorCount = 0): ReviewResult {
  const issues = [
    ...Array.from({ length: criticalCount }, () => ({
      severity: 'critical' as const,
      file: 'file.ts',
      message: 'Critical issue',
    })),
    ...Array.from({ length: majorCount }, () => ({
      severity: 'major' as const,
      file: 'file.ts',
      message: 'Major issue',
    })),
  ];

  return {
    approved,
    hasBlockingIssues: criticalCount > 0 || majorCount > 2,
    issues,
    summary: approved ? 'Approved' : 'Not approved',
  };
}

function createTask(): Task {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task',
    files: ['src/file.ts'],
    test: 'vitest',
    worktree: '/path/to/worktree',
  };
}

// ============================================================================
// QALoopEngine Tests
// ============================================================================

describe('QALoopEngine', () => {
  let buildVerifier: BuildVerifier;
  let lintRunner: LintRunner;
  let testRunner: TestRunner;
  let codeReviewer: CodeReviewer;
  let coderRunner: CoderRunner;
  let engine: QALoopEngine;

  beforeEach(() => {
    buildVerifier = createMockBuildVerifier();
    lintRunner = createMockLintRunner();
    testRunner = createMockTestRunner();
    codeReviewer = createMockCodeReviewer();
    coderRunner = createMockCoderRunner();

    engine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
    });
  });

  describe('constructor', () => {
    it('should accept all verifiers and reviewers', () => {
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
      });
      expect(engine).toBeDefined();
    });

    it('should accept optional maxIterations', () => {
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
        maxIterations: 10,
      });
      expect(engine).toBeDefined();
    });

    it('should default maxIterations to 50', () => {
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
      });
      expect(engine.getMaxIterations()).toBe(50);
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
        logger,
      });
      expect(engine).toBeDefined();
    });
  });

  describe('run', () => {
    it('should return success when all stages pass on first try', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));

      const result = await engine.run(createTask(), coderRunner);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.escalated).toBe(false);
    });

    it('should run stages in order: build -> lint -> test -> review', async () => {
      const callOrder: string[] = [];

      vi.mocked(buildVerifier.verify).mockImplementation(async () => {
        callOrder.push('build');
        return createVerificationResult(true);
      });
      vi.mocked(lintRunner.run).mockImplementation(async () => {
        callOrder.push('lint');
        return createVerificationResult(true);
      });
      vi.mocked(testRunner.run).mockImplementation(async () => {
        callOrder.push('test');
        return createTestResult(true);
      });
      vi.mocked(codeReviewer.review).mockImplementation(async () => {
        callOrder.push('review');
        return createReviewResult(true);
      });

      await engine.run(createTask(), coderRunner);

      expect(callOrder).toEqual(['build', 'lint', 'test', 'review']);
    });

    it('should call coder to fix issues when build fails', async () => {
      // First build fails, then succeeds
      vi.mocked(buildVerifier.verify)
        .mockResolvedValueOnce(createVerificationResult(false, 1))
        .mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Fixed',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(coderRunner.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
    });

    it('should call coder to fix issues when lint fails', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run)
        .mockResolvedValueOnce(createVerificationResult(false, 1))
        .mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Fixed',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(coderRunner.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should call coder to fix issues when tests fail', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run)
        .mockResolvedValueOnce(createTestResult(false, 1))
        .mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Fixed',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(coderRunner.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should call coder to fix issues when review has blocking issues', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review)
        .mockResolvedValueOnce(createReviewResult(false, 1, 0))
        .mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Fixed',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(coderRunner.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should track all iterations when multiple fixes needed', async () => {
      // Build fails twice, then passes
      vi.mocked(buildVerifier.verify)
        .mockResolvedValueOnce(createVerificationResult(false, 1))
        .mockResolvedValueOnce(createVerificationResult(false, 1))
        .mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Fixed',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
    });

    it('should escalate after max iterations', async () => {
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
        maxIterations: 3,
      });

      // Build always fails
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(false, 1));
      // Mock other stages in case build passes later
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));
      vi.mocked(coderRunner.execute).mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Tried to fix',
        iterations: 1,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });

      const result = await engine.run(createTask(), coderRunner);

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.iterations).toBe(3);
    });

    it('should track stage results', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));

      const result = await engine.run(createTask(), coderRunner);

      expect(result.stages).toHaveLength(4);
      expect(result.stages.map((s) => s.stage)).toEqual(['build', 'lint', 'test', 'review']);
      expect(result.stages.every((s) => s.passed)).toBe(true);
    });

    it('should return final errors when escalated', async () => {
      const engine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
        maxIterations: 1,
      });

      // Build fails with 2 errors on the only iteration
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(false, 2));
      // Mock other stages
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));

      const result = await engine.run(createTask(), coderRunner);

      expect(result.success).toBe(false);
      expect(result.finalErrors).toHaveLength(2);
    });

    it('should use task worktree for verification', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));

      const task = createTask();
      task.worktree = '/custom/worktree';

      await engine.run(task, coderRunner);

      expect(buildVerifier.verify).toHaveBeenCalledWith('/custom/worktree');
      expect(lintRunner.run).toHaveBeenCalledWith('/custom/worktree');
    });

    it('should use task test pattern', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));
      vi.mocked(codeReviewer.review).mockResolvedValue(createReviewResult(true));

      const task = createTask();
      task.test = 'MyClass';

      await engine.run(task, coderRunner);

      expect(testRunner.run).toHaveBeenCalledWith('/path/to/worktree', 'MyClass');
    });
  });

  describe('runStage', () => {
    it('should run build stage', async () => {
      vi.mocked(buildVerifier.verify).mockResolvedValue(createVerificationResult(true));

      const result = await engine.runStage('build', '/path/to/project');

      expect(result.success).toBe(true);
      expect(buildVerifier.verify).toHaveBeenCalledWith('/path/to/project');
    });

    it('should run lint stage', async () => {
      vi.mocked(lintRunner.run).mockResolvedValue(createVerificationResult(true));

      const result = await engine.runStage('lint', '/path/to/project');

      expect(result.success).toBe(true);
      expect(lintRunner.run).toHaveBeenCalledWith('/path/to/project');
    });

    it('should run test stage', async () => {
      vi.mocked(testRunner.run).mockResolvedValue(createTestResult(true));

      const result = await engine.runStage('test', '/path/to/project');

      expect(result.success).toBe(true);
      expect(testRunner.run).toHaveBeenCalledWith('/path/to/project', undefined);
    });
  });

  describe('error types', () => {
    it('should have QAError class', () => {
      const error = new QAError('QA failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('QAError');
      expect(error.message).toBe('QA failed');
    });

    it('should have EscalationError class', () => {
      const error = new EscalationError(50);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EscalationError');
      expect(error.iterations).toBe(50);
    });
  });
});
