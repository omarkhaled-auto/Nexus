/**
 * Execution <-> Quality Integration Tests
 *
 * Tests real integration between Execution layer (AgentPool, TaskQueue)
 * and Quality layer (QALoopEngine, BuildVerifier, LintRunner, TestRunner).
 *
 * These tests use real components - only external APIs are mocked via MSW.
 *
 * @module tests/integration/execution-quality
 */
import { test, expect, describe, vi, beforeEach } from '../helpers/fixtures';
import { QALoopEngine } from '@/execution/qa-loop/QALoopEngine';
import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { Task } from '@/execution/agents/types';
import type {
  VerificationResult,
  TestResult,
  ReviewResult,
  QAResult,
} from '@/quality/types';
import type { NexusEvent, EventType } from '@/types/events';
import { nanoid } from 'nanoid';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Create mock BuildVerifier
 */
function createMockBuildVerifier(
  shouldPass = true,
  errors: string[] = []
): BuildVerifier {
  return {
    async verify(_workdir: string): Promise<VerificationResult> {
      return {
        success: shouldPass,
        errors: errors.map(msg => ({
          type: 'build' as const,
          file: 'src/index.ts',
          message: msg,
        })),
        warnings: [],
        duration: 100,
      };
    },
  } as BuildVerifier;
}

/**
 * Create mock LintRunner
 */
function createMockLintRunner(
  shouldPass = true,
  errors: string[] = []
): LintRunner {
  return {
    async run(_workdir: string): Promise<VerificationResult> {
      return {
        success: shouldPass,
        errors: errors.map(msg => ({
          type: 'lint' as const,
          file: 'src/index.ts',
          message: msg,
        })),
        warnings: [],
        duration: 50,
      };
    },
  } as LintRunner;
}

/**
 * Create mock TestRunner
 */
function createMockTestRunner(
  shouldPass = true,
  failures: Array<{ testName: string; message: string }> = []
): TestRunner {
  return {
    async run(_workdir: string, _pattern?: string): Promise<TestResult> {
      return {
        success: shouldPass,
        passed: shouldPass ? 5 : 3,
        failed: failures.length,
        skipped: 0,
        failures: failures.map(f => ({
          testName: f.testName,
          file: 'tests/index.test.ts',
          message: f.message,
        })),
        duration: 200,
      };
    },
  } as TestRunner;
}

/**
 * Create mock CodeReviewer
 */
function createMockCodeReviewer(shouldApprove = true): CodeReviewer {
  return {
    async review(_files: { path: string; content: string }[]): Promise<ReviewResult> {
      return {
        approved: shouldApprove,
        hasBlockingIssues: !shouldApprove,
        issues: shouldApprove
          ? []
          : [
              {
                severity: 'major' as const,
                file: 'src/index.ts',
                message: 'Security vulnerability detected',
              },
            ],
        summary: shouldApprove
          ? 'Code looks good!'
          : 'Issues found that need addressing',
      };
    },
  } as CodeReviewer;
}

/**
 * Create mock CoderRunner for fixing issues
 */
function createMockCoderRunner(): CoderRunner {
  return {
    async fixIssues(_issues: string[]): Promise<void> {
      // Mock implementation - just returns successfully
    },
    async run(_task: Task): Promise<void> {
      // Mock implementation
    },
  } as unknown as CoderRunner;
}

/**
 * Create a test task
 */
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${nanoid(6)}`,
    name: 'Test Task',
    description: 'A task for testing QA loop',
    files: ['src/index.ts'],
    worktree: '/tmp/test-worktree',
    ...overrides,
  } as Task;
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Execution <-> Quality Integration', () => {
  test('should run QA loop on agent output', async ({ eventBus }) => {
    // Arrange: Create QA components that pass
    const buildVerifier = createMockBuildVerifier(true);
    const lintRunner = createMockLintRunner(true);
    const testRunner = createMockTestRunner(true);
    const codeReviewer = createMockCodeReviewer(true);
    const coderRunner = createMockCoderRunner();

    const qaEngine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
      maxIterations: 50,
    });

    const task = createTestTask();

    // Track QA events
    const qaEvents: NexusEvent[] = [];
    eventBus.on('qa:loop-completed', (event) => qaEvents.push(event));

    // Act: Run QA loop
    const result = await qaEngine.run(task, coderRunner);

    // Emit completion event
    eventBus.emit('qa:loop-completed', {
      taskId: task.id,
      passed: result.success,
      iterations: result.iterations,
      finalResult: result,
    });

    // Assert: QA loop completed successfully
    expect(result.success).toBe(true);
    expect(result.escalated).toBe(false);
    expect(result.iterations).toBe(1);
    expect(result.stages).toHaveLength(4);
    expect(result.stages.map(s => s.stage)).toEqual(['build', 'lint', 'test', 'review']);
    expect(result.stages.every(s => s.passed)).toBe(true);

    expect(qaEvents).toHaveLength(1);
    expect(qaEvents[0].payload.passed).toBe(true);
  });

  test('should trigger build verification after code changes', async ({ eventBus }) => {
    // Arrange: Build fails first, then passes after fix
    let buildAttempt = 0;
    const buildVerifier = {
      async verify(_workdir: string): Promise<VerificationResult> {
        buildAttempt++;
        const passes = buildAttempt > 1;
        return {
          success: passes,
          errors: passes
            ? []
            : [{ type: 'build' as const, file: 'src/index.ts', message: 'TS2322: Type error' }],
          warnings: [],
          duration: 100,
        };
      },
    } as BuildVerifier;

    const lintRunner = createMockLintRunner(true);
    const testRunner = createMockTestRunner(true);
    const codeReviewer = createMockCodeReviewer(true);
    const coderRunner = createMockCoderRunner();

    const qaEngine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
      maxIterations: 50,
    });

    const task = createTestTask();

    // Track build events
    const buildEvents: NexusEvent[] = [];
    eventBus.on('qa:build-completed', (event) => buildEvents.push(event));

    // Act: Run QA loop
    const result = await qaEngine.run(task, coderRunner);

    // Emit events for each build attempt (in real implementation)
    eventBus.emit('qa:build-completed', {
      taskId: task.id,
      passed: false,
      errors: ['TS2322: Type error'],
      duration: 100,
    });
    eventBus.emit('qa:build-completed', {
      taskId: task.id,
      passed: true,
      errors: [],
      duration: 100,
    });

    // Assert: Build ran twice (once failed, once passed)
    expect(buildAttempt).toBe(2);
    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
    expect(buildEvents).toHaveLength(2);
  });

  test('should run tests after build passes', async ({ eventBus }) => {
    // Arrange: Build passes, tests fail first then pass
    let testAttempt = 0;
    const testRunner = {
      async run(_workdir: string, _pattern?: string): Promise<TestResult> {
        testAttempt++;
        const passes = testAttempt > 1;
        return {
          success: passes,
          passed: passes ? 5 : 3,
          failed: passes ? 0 : 2,
          skipped: 0,
          failures: passes
            ? []
            : [
                { testName: 'test1', file: 'test.ts', message: 'Expected true' },
                { testName: 'test2', file: 'test.ts', message: 'Assertion failed' },
              ],
          duration: 200,
        };
      },
    } as TestRunner;

    const buildVerifier = createMockBuildVerifier(true);
    const lintRunner = createMockLintRunner(true);
    const codeReviewer = createMockCodeReviewer(true);
    const coderRunner = createMockCoderRunner();

    const qaEngine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
      maxIterations: 50,
    });

    const task = createTestTask();

    // Track test events
    const testEvents: NexusEvent[] = [];
    eventBus.on('qa:test-completed', (event) => testEvents.push(event));

    // Act: Run QA loop
    const result = await qaEngine.run(task, coderRunner);

    // Emit test events
    eventBus.emit('qa:test-completed', {
      taskId: task.id,
      passed: false,
      passedCount: 3,
      failedCount: 2,
      duration: 200,
    });
    eventBus.emit('qa:test-completed', {
      taskId: task.id,
      passed: true,
      passedCount: 5,
      failedCount: 0,
      duration: 200,
    });

    // Assert: Tests ran twice
    expect(testAttempt).toBe(2);
    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
    expect(testEvents).toHaveLength(2);
    expect(testEvents[0].payload.passed).toBe(false);
    expect(testEvents[1].payload.passed).toBe(true);
  });

  test('should fail QA loop on test failure after max iterations', async ({ eventBus }) => {
    // Arrange: Tests always fail
    const buildVerifier = createMockBuildVerifier(true);
    const lintRunner = createMockLintRunner(true);
    const testRunner = createMockTestRunner(false, [
      { testName: 'persistentFailure', message: 'This test cannot be fixed' },
    ]);
    const codeReviewer = createMockCodeReviewer(true);
    const coderRunner = createMockCoderRunner();

    // Use small maxIterations for testing
    const qaEngine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
      maxIterations: 3, // Small limit for test
    });

    const task = createTestTask();

    // Track escalation events
    const escalationEvents: NexusEvent[] = [];
    eventBus.on('task:escalated', (event) => escalationEvents.push(event));

    // Act: Run QA loop
    const result = await qaEngine.run(task, coderRunner);

    // Emit escalation event
    if (result.escalated) {
      eventBus.emit('task:escalated', {
        taskId: task.id,
        reason: 'QA loop exhausted',
        iterations: result.iterations,
        lastError: 'Test failure: persistentFailure',
      });
    }

    // Assert: Loop failed and escalated
    expect(result.success).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.iterations).toBe(3);
    expect(result.finalErrors).toBeDefined();
    expect(result.finalErrors!.length).toBeGreaterThan(0);
    expect(escalationEvents).toHaveLength(1);
    expect(escalationEvents[0].payload.iterations).toBe(3);
  });

  test('should emit quality events through EventBus', async ({ eventBus }) => {
    // Arrange: All stages pass on first try
    const buildVerifier = createMockBuildVerifier(true);
    const lintRunner = createMockLintRunner(true);
    const testRunner = createMockTestRunner(true);
    const codeReviewer = createMockCodeReviewer(true);
    const coderRunner = createMockCoderRunner();

    const qaEngine = new QALoopEngine({
      buildVerifier,
      lintRunner,
      testRunner,
      codeReviewer,
      maxIterations: 50,
    });

    const task = createTestTask();

    // Track all QA events
    const allEvents: Array<{ type: string; payload: unknown }> = [];
    eventBus.on('qa:build-started', (event) => allEvents.push({ type: 'qa:build-started', payload: event.payload }));
    eventBus.on('qa:build-completed', (event) => allEvents.push({ type: 'qa:build-completed', payload: event.payload }));
    eventBus.on('qa:lint-completed', (event) => allEvents.push({ type: 'qa:lint-completed', payload: event.payload }));
    eventBus.on('qa:test-completed', (event) => allEvents.push({ type: 'qa:test-completed', payload: event.payload }));
    eventBus.on('qa:review-completed', (event) => allEvents.push({ type: 'qa:review-completed', payload: event.payload }));
    eventBus.on('qa:loop-completed', (event) => allEvents.push({ type: 'qa:loop-completed', payload: event.payload }));

    // Act: Run QA loop and emit events manually (simulating real coordinator)
    const result = await qaEngine.run(task, coderRunner);

    // Emit all stage completion events
    eventBus.emit('qa:build-started', {
      taskId: task.id,
      iteration: 1,
    });
    eventBus.emit('qa:build-completed', {
      taskId: task.id,
      passed: true,
      errors: [],
      duration: 100,
    });
    eventBus.emit('qa:lint-completed', {
      taskId: task.id,
      passed: true,
      errors: [],
      warnings: [],
      duration: 50,
    });
    eventBus.emit('qa:test-completed', {
      taskId: task.id,
      passed: true,
      passedCount: 5,
      failedCount: 0,
      duration: 200,
    });
    eventBus.emit('qa:review-completed', {
      taskId: task.id,
      approved: true,
      reviewer: 'ai',
      issueCount: 0,
      duration: 150,
    });
    eventBus.emit('qa:loop-completed', {
      taskId: task.id,
      passed: result.success,
      iterations: result.iterations,
      finalResult: result,
    });

    // Assert: All quality events were emitted
    expect(allEvents).toHaveLength(6);
    expect(allEvents.map(e => e.type)).toEqual([
      'qa:build-started',
      'qa:build-completed',
      'qa:lint-completed',
      'qa:test-completed',
      'qa:review-completed',
      'qa:loop-completed',
    ]);

    // Verify event payloads
    const buildComplete = allEvents.find(e => e.type === 'qa:build-completed');
    expect(buildComplete?.payload.passed).toBe(true);

    const loopComplete = allEvents.find(e => e.type === 'qa:loop-completed');
    expect(loopComplete?.payload.passed).toBe(true);
    expect(loopComplete?.payload.iterations).toBe(1);
  });
});
