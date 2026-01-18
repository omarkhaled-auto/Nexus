/**
 * RalphStyleIterator Tests
 *
 * Tests for the Ralph-Style Iterator that enables persistent iteration loops
 * where agents can see their previous work through git diffs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RalphStyleIterator,
  createRalphStyleIterator,
  createTestRalphStyleIterator,
} from './RalphStyleIterator';
import type {
  TaskSpec,
  IterationOptions,
  IterationContext,
  AgentExecutionResult,
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,
  QARunner,
  IGitDiffContextBuilder,
  IErrorContextAggregator,
  IIterationCommitHandler,
  IEscalationHandler,
  ErrorEntry,
  GitDiff,
} from './types';
import type { IFreshContextManager, TaskContext } from '../../orchestration/context/types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock task for testing
 */
function createMockTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'test-task-1',
    name: 'Test Task',
    description: 'A test task for iteration',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create a mock context manager
 */
function createMockContextManager(): IFreshContextManager {
  return {
    buildFreshContext: vi.fn().mockImplementation(async (task: TaskSpec): Promise<TaskContext> => ({
      repoMap: 'mock repo map',
      codebaseDocs: {
        architectureSummary: 'mock summary',
        relevantPatterns: [],
        relevantAPIs: [],
        tokenCount: 100,
      },
      projectConfig: {
        name: 'test-project',
        path: '/test/path',
        language: 'typescript',
      },
      taskSpec: task,
      relevantFiles: [],
      relevantCode: [],
      relevantMemories: [],
      conversationHistory: [] as never[],
      tokenCount: 1000,
      tokenBudget: 150000,
      generatedAt: new Date(),
      contextId: 'mock-context-id',
    })),
    clearAgentContext: vi.fn(),
    clearTaskContext: vi.fn(),
    validateContext: vi.fn().mockReturnValue({
      valid: true,
      tokenCount: 1000,
      maxTokens: 150000,
      breakdown: {
        systemPrompt: 0,
        repoMap: 100,
        codebaseDocs: 100,
        taskSpec: 100,
        files: 0,
        codeResults: 0,
        memories: 0,
        reserved: 0,
        total: 300,
      },
      warnings: [],
      suggestions: [],
    }),
    estimateTokenCount: vi.fn((text: string) => Math.ceil(text.length / 4)),
    getActiveContexts: vi.fn(() => new Map()),
    getContextStats: vi.fn(() => ({
      activeContexts: 0,
      totalCreated: 0,
      totalCleared: 0,
      averageTokens: 0,
      peakTokens: 0,
    })),
  };
}

/**
 * Create a mock QA runner
 */
function createMockQARunner(
  overrides: Partial<{
    buildSuccess: boolean;
    lintSuccess: boolean;
    testSuccess: boolean;
    reviewApproved: boolean;
  }> = {}
): QARunner {
  const {
    buildSuccess = true,
    lintSuccess = true,
    testSuccess = true,
    reviewApproved = true,
  } = overrides;

  return {
    build: vi.fn().mockResolvedValue({
      success: buildSuccess,
      errors: buildSuccess ? [] : [{ type: 'build', severity: 'error', message: 'Build failed', iteration: 1 }],
      warnings: [],
      duration: 1000,
    } as BuildResult),
    lint: vi.fn().mockResolvedValue({
      success: lintSuccess,
      errors: lintSuccess ? [] : [{ type: 'lint', severity: 'error', message: 'Lint error', iteration: 1 }],
      warnings: [],
      fixable: 0,
    } as LintResult),
    test: vi.fn().mockResolvedValue({
      success: testSuccess,
      passed: testSuccess ? 10 : 8,
      failed: testSuccess ? 0 : 2,
      skipped: 0,
      errors: testSuccess ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: 1 }],
      duration: 5000,
    } as TestResult),
    review: vi.fn().mockResolvedValue({
      approved: reviewApproved,
      comments: [],
      suggestions: [],
      blockers: reviewApproved ? [] : ['Code needs improvement'],
    } as ReviewResult),
  };
}

/**
 * Create a mock agent runner
 */
function createMockAgentRunner(
  filesChanged: string[] = ['src/test.ts'],
  tokensUsed: number = 500
): (context: IterationContext) => Promise<AgentExecutionResult> {
  return vi.fn().mockResolvedValue({
    success: true,
    filesChanged,
    output: 'Agent made changes',
    tokensUsed,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('RalphStyleIterator', () => {
  describe('constructor', () => {
    it('should create instance with minimal config', () => {
      const iterator = createTestRalphStyleIterator();
      expect(iterator).toBeInstanceOf(RalphStyleIterator);
    });

    it('should create instance with full config', () => {
      const contextManager = createMockContextManager();
      const iterator = createRalphStyleIterator({
        projectPath: '/test/path',
        contextManager,
        qaRunner: createMockQARunner(),
      });
      expect(iterator).toBeInstanceOf(RalphStyleIterator);
    });
  });

  describe('execute', () => {
    it('should complete successfully on first iteration when all QA passes', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner();
      const qaRunner = createMockQARunner({
        buildSuccess: true,
        lintSuccess: true,
        testSuccess: true,
        reviewApproved: true,
      });

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      const result = await iterator.execute(task);

      expect(result.success).toBe(true);
      expect(result.finalState).toBe('completed');
      expect(result.iterations).toBe(1);
      expect(result.history).toHaveLength(1);
    });

    it('should iterate when tests fail then pass', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner();

      // First iteration: tests fail, second iteration: tests pass
      let callCount = 0;
      const qaRunner: QARunner = {
        build: vi.fn().mockResolvedValue({
          success: true,
          errors: [],
          warnings: [],
          duration: 1000,
        }),
        lint: vi.fn().mockResolvedValue({
          success: true,
          errors: [],
          warnings: [],
          fixable: 0,
        }),
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              success: false,
              passed: 8,
              failed: 2,
              skipped: 0,
              errors: [{ type: 'test', severity: 'error', message: 'Test failed', iteration: 1 }],
              duration: 5000,
            };
          }
          return {
            success: true,
            passed: 10,
            failed: 0,
            skipped: 0,
            errors: [],
            duration: 5000,
          };
        }),
        review: vi.fn().mockResolvedValue({
          approved: true,
          comments: [],
          suggestions: [],
          blockers: [],
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      const result = await iterator.execute(task);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
      expect(result.history).toHaveLength(2);
    });

    it('should escalate when max iterations reached', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner();
      const qaRunner = createMockQARunner({
        testSuccess: false, // Always fail tests
      });

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      const result = await iterator.execute(task, {
        maxIterations: 3,
        escalateAfter: 3,
      });

      expect(result.success).toBe(false);
      expect(result.finalState).toBe('escalated');
      expect(result.iterations).toBe(3);
      expect(result.escalationReport).toBeDefined();
      expect(result.escalationReport?.reason).toBe('max_iterations');
    });

    it('should track tokens across iterations', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner([], 1000);

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            success: callCount >= 2,
            passed: callCount >= 2 ? 10 : 8,
            failed: callCount >= 2 ? 0 : 2,
            skipped: 0,
            errors: callCount >= 2 ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: callCount }],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      const result = await iterator.execute(task);

      expect(result.totalTokens).toBe(2000); // 1000 tokens per iteration * 2 iterations
    });

    it('should include previous errors in context', async () => {
      const contextManager = createMockContextManager();
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn().mockImplementation(async (context: IterationContext) => {
        capturedContexts.push(context);
        return {
          success: true,
          filesChanged: ['src/test.ts'],
          output: 'Agent made changes',
          tokensUsed: 500,
        };
      });

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              success: false,
              passed: 8,
              failed: 2,
              skipped: 0,
              errors: [{ type: 'test', severity: 'error', message: 'First iteration error', iteration: 1 }],
              duration: 5000,
            };
          }
          return {
            success: true,
            passed: 10,
            failed: 0,
            skipped: 0,
            errors: [],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      await iterator.execute(task, { includePreviousErrors: true });

      // Second iteration should have previous errors
      expect(capturedContexts).toHaveLength(2);
      expect(capturedContexts[1].previousErrors.length).toBeGreaterThan(0);
    });

    it('should commit each iteration when enabled', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner(['src/test.ts']);

      const commits: string[] = [];
      const commitHandler: IIterationCommitHandler = {
        commitIteration: vi.fn().mockImplementation(async (taskId, iteration, message) => {
          const hash = `commit-${iteration}`;
          commits.push(hash);
          return hash;
        }),
        rollbackToIteration: vi.fn(),
        getIterationCommit: vi.fn((taskId, iteration) => commits[iteration - 1] || null),
      };

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            success: callCount >= 2,
            passed: callCount >= 2 ? 10 : 8,
            failed: callCount >= 2 ? 0 : 2,
            skipped: 0,
            errors: callCount >= 2 ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: callCount }],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
        commitHandler,
      });

      const task = createMockTask();
      await iterator.execute(task, { commitEachIteration: true });

      expect(commitHandler.commitIteration).toHaveBeenCalledTimes(2);
      expect(commits).toHaveLength(2);
    });

    it('should not commit when agent makes no changes', async () => {
      const contextManager = createMockContextManager();
      const agentRunner = createMockAgentRunner([]); // No files changed

      const commitHandler: IIterationCommitHandler = {
        commitIteration: vi.fn(),
        rollbackToIteration: vi.fn(),
        getIterationCommit: vi.fn().mockReturnValue(null),
      };

      const qaRunner = createMockQARunner({
        testSuccess: true,
      });

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
        commitHandler,
      });

      const task = createMockTask();
      await iterator.execute(task, { commitEachIteration: true });

      expect(commitHandler.commitIteration).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause a running iteration', async () => {
      // Use a slow agent to ensure we can pause mid-execution
      let pauseReady = false;
      let resolvePauseReady: () => void;
      const pauseReadyPromise = new Promise<void>(resolve => {
        resolvePauseReady = resolve;
      });
      let continueExecution: () => void;
      const continuePromise = new Promise<void>(resolve => {
        continueExecution = resolve;
      });

      const agentRunner = vi.fn().mockImplementation(async () => {
        pauseReady = true;
        resolvePauseReady();
        // Wait for signal to continue
        await continuePromise;
        return {
          success: true,
          filesChanged: [],
          output: 'Done',
          tokensUsed: 100,
        };
      });

      const qaRunner = createMockQARunner({ testSuccess: true });
      const iterator = createTestRalphStyleIterator({ agentRunner, qaRunner });
      const task = createMockTask();

      // Start execution in background
      const executePromise = iterator.execute(task, { maxIterations: 10 });

      // Wait for agent to be running
      await pauseReadyPromise;

      // Pause
      await iterator.pause(task.id);
      const status = iterator.getStatus(task.id);
      expect(status?.state).toBe('paused');

      // Resume and let it complete
      await iterator.resume(task.id);
      continueExecution!();
      await executePromise;
    });

    it('should throw when pausing non-existent task', async () => {
      const iterator = createTestRalphStyleIterator();

      await expect(iterator.pause('non-existent')).rejects.toThrow('Task not found');
    });
  });

  describe('resume', () => {
    it('should resume a paused iteration', async () => {
      // Use a slow agent to ensure we can pause/resume mid-execution
      let resolveReady: () => void;
      const readyPromise = new Promise<void>(resolve => {
        resolveReady = resolve;
      });
      let continueExecution: () => void;
      const continuePromise = new Promise<void>(resolve => {
        continueExecution = resolve;
      });

      const agentRunner = vi.fn().mockImplementation(async () => {
        resolveReady();
        await continuePromise;
        return {
          success: true,
          filesChanged: [],
          output: 'Done',
          tokensUsed: 100,
        };
      });

      const qaRunner = createMockQARunner({ testSuccess: true });
      const iterator = createTestRalphStyleIterator({ agentRunner, qaRunner });
      const task = createMockTask();

      // Start execution
      const executePromise = iterator.execute(task, { maxIterations: 10 });

      // Wait for agent to start
      await readyPromise;

      // Pause then resume
      await iterator.pause(task.id);
      expect(iterator.getStatus(task.id)?.state).toBe('paused');

      await iterator.resume(task.id);
      expect(iterator.getStatus(task.id)?.state).toBe('running');

      // Complete execution
      continueExecution!();
      await executePromise;
    });

    it('should throw when resuming non-paused task', async () => {
      const iterator = createTestRalphStyleIterator();

      await expect(iterator.resume('non-existent')).rejects.toThrow('Task not found');
    });
  });

  describe('abort', () => {
    it('should abort and prevent future iterations', async () => {
      let iterationCount = 0;
      let resolveFirstComplete: () => void;
      const firstIterationComplete = new Promise<void>(resolve => {
        resolveFirstComplete = resolve;
      });
      let resolveSecondStart: () => void;
      const secondIterationStart = new Promise<void>(resolve => {
        resolveSecondStart = resolve;
      });
      let continueSecond: () => void;
      const continueSecondPromise = new Promise<void>(resolve => {
        continueSecond = resolve;
      });

      // Agent that signals when each iteration starts
      const agentRunner = vi.fn().mockImplementation(async () => {
        iterationCount++;
        if (iterationCount === 2) {
          resolveSecondStart();
          // Wait for signal to continue (gives time to abort)
          await continueSecondPromise;
        }
        return {
          success: true,
          filesChanged: [],
          output: 'Done',
          tokensUsed: 100,
        };
      });

      // Test fails on first iteration, would pass on second
      let testCallCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          testCallCount++;
          if (testCallCount === 1) {
            // Signal that first iteration is complete (about to start second)
            setTimeout(() => resolveFirstComplete(), 0);
            return {
              success: false,
              passed: 8,
              failed: 2,
              skipped: 0,
              errors: [{ type: 'test', severity: 'error', message: 'First try failed', iteration: 1 }],
              duration: 5000,
            };
          }
          return {
            success: true,
            passed: 10,
            failed: 0,
            skipped: 0,
            errors: [],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();

      // Start execution with multiple iterations allowed
      const executePromise = iterator.execute(task, { maxIterations: 10 });

      // Wait for first iteration QA to fail
      await firstIterationComplete;

      // Wait for second iteration to start
      await secondIterationStart;

      // Now abort (while second iteration is waiting)
      await iterator.abort(task.id);

      // Let the agent continue
      continueSecond!();

      // Wait for execution to complete
      const result = await executePromise;

      // Should have aborted
      expect(result.finalState).toBe('aborted');
    });

    it('should throw when aborting completed task', async () => {
      const iterator = createTestRalphStyleIterator();
      const task = createMockTask();

      // Complete the task first
      await iterator.execute(task);

      // Try to abort completed task
      await expect(iterator.abort(task.id)).rejects.toThrow('Cannot abort task in state: completed');
    });
  });

  describe('getStatus', () => {
    it('should return null for unknown task', () => {
      const iterator = createTestRalphStyleIterator();
      expect(iterator.getStatus('unknown')).toBeNull();
    });

    it('should return status for active task', async () => {
      let resolveReady: () => void;
      const readyPromise = new Promise<void>(resolve => {
        resolveReady = resolve;
      });
      let continueExecution: () => void;
      const continuePromise = new Promise<void>(resolve => {
        continueExecution = resolve;
      });

      const agentRunner = vi.fn().mockImplementation(async () => {
        resolveReady();
        await continuePromise;
        return {
          success: true,
          filesChanged: [],
          output: 'Done',
          tokensUsed: 100,
        };
      });

      const qaRunner = createMockQARunner({ testSuccess: true });
      const iterator = createTestRalphStyleIterator({ agentRunner, qaRunner });
      const task = createMockTask();

      // Start execution
      const executePromise = iterator.execute(task);

      // Wait for agent to start
      await readyPromise;

      // Check status
      const status = iterator.getStatus(task.id);
      expect(status).toBeDefined();
      expect(status?.taskId).toBe(task.id);

      // Complete execution
      continueExecution!();
      await executePromise;
    });

    it('should include elapsed time', async () => {
      let resolveReady: () => void;
      const readyPromise = new Promise<void>(resolve => {
        resolveReady = resolve;
      });
      let continueExecution: () => void;
      const continuePromise = new Promise<void>(resolve => {
        continueExecution = resolve;
      });

      const agentRunner = vi.fn().mockImplementation(async () => {
        resolveReady();
        await continuePromise;
        return {
          success: true,
          filesChanged: [],
          output: 'Done',
          tokensUsed: 100,
        };
      });

      const qaRunner = createMockQARunner({ testSuccess: true });
      const iterator = createTestRalphStyleIterator({ agentRunner, qaRunner });
      const task = createMockTask();

      const executePromise = iterator.execute(task);

      // Wait for agent to start
      await readyPromise;

      // Wait a bit for elapsed time to accumulate
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = iterator.getStatus(task.id);
      expect(status?.elapsedTime).toBeGreaterThan(0);

      // Complete execution
      continueExecution!();
      await executePromise;
    });
  });

  describe('getHistory', () => {
    it('should return empty array for unknown task', () => {
      const iterator = createTestRalphStyleIterator();
      expect(iterator.getHistory('unknown')).toEqual([]);
    });

    it('should return history entries after execution', async () => {
      const iterator = createTestRalphStyleIterator();
      const task = createMockTask();

      await iterator.execute(task);

      const history = iterator.getHistory(task.id);
      expect(history).toHaveLength(1);
      expect(history[0].iteration).toBe(1);
    });

    it('should return all iteration history', async () => {
      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            success: callCount >= 3,
            passed: callCount >= 3 ? 10 : 8,
            failed: callCount >= 3 ? 0 : 2,
            skipped: 0,
            errors: callCount >= 3 ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: callCount }],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({ qaRunner });
      const task = createMockTask();

      await iterator.execute(task);

      const history = iterator.getHistory(task.id);
      expect(history).toHaveLength(3);
      expect(history[0].iteration).toBe(1);
      expect(history[1].iteration).toBe(2);
      expect(history[2].iteration).toBe(3);
    });
  });

  describe('context building', () => {
    it('should call context manager for each iteration', async () => {
      const contextManager = createMockContextManager();

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            success: callCount >= 2,
            passed: callCount >= 2 ? 10 : 8,
            failed: callCount >= 2 ? 0 : 2,
            skipped: 0,
            errors: callCount >= 2 ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: callCount }],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        qaRunner,
      });

      const task = createMockTask();
      await iterator.execute(task);

      expect(contextManager.buildFreshContext).toHaveBeenCalledTimes(2);
    });

    it('should include git diff in subsequent iterations when enabled', async () => {
      const contextManager = createMockContextManager();
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn().mockImplementation(async (context: IterationContext) => {
        capturedContexts.push(context);
        return {
          success: true,
          filesChanged: ['src/test.ts'],
          output: 'Agent made changes',
          tokensUsed: 500,
        };
      });

      const diffBuilder: IGitDiffContextBuilder = {
        buildDiffContext: vi.fn().mockResolvedValue({
          fromCommit: 'abc123',
          toCommit: 'HEAD',
          changes: [{ file: 'src/test.ts', changeType: 'modified', additions: 10, deletions: 5 }],
          diffText: 'diff content',
          stats: { filesChanged: 1, additions: 10, deletions: 5 },
        }),
        buildCumulativeDiff: vi.fn().mockResolvedValue({
          fromCommit: 'base',
          toCommit: 'HEAD',
          changes: [],
          diffText: 'cumulative diff',
          stats: { filesChanged: 1, additions: 10, deletions: 5 },
        }),
        formatDiffForAgent: vi.fn().mockReturnValue('formatted diff'),
      };

      const commitHandler: IIterationCommitHandler = {
        commitIteration: vi.fn().mockResolvedValue('commit-hash'),
        rollbackToIteration: vi.fn(),
        getIterationCommit: vi.fn().mockReturnValue('prev-commit'),
      };

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            success: callCount >= 2,
            passed: callCount >= 2 ? 10 : 8,
            failed: callCount >= 2 ? 0 : 2,
            skipped: 0,
            errors: callCount >= 2 ? [] : [{ type: 'test', severity: 'error', message: 'Test failed', iteration: callCount }],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
        diffBuilder,
        commitHandler,
      });

      const task = createMockTask();
      await iterator.execute(task, { includeGitDiff: true });

      // Second iteration should have diff context
      expect(capturedContexts).toHaveLength(2);
      expect(capturedContexts[1].cumulativeDiff).toBeDefined();
    });
  });

  describe('error aggregation', () => {
    it('should aggregate errors across iterations', async () => {
      const contextManager = createMockContextManager();
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn().mockImplementation(async (context: IterationContext) => {
        capturedContexts.push(context);
        return {
          success: true,
          filesChanged: ['src/test.ts'],
          output: 'Agent made changes',
          tokensUsed: 500,
        };
      });

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            return {
              success: false,
              passed: 8,
              failed: 2,
              skipped: 0,
              errors: [{ type: 'test', severity: 'error', message: `Error ${callCount}`, iteration: callCount }],
              duration: 5000,
            };
          }
          return {
            success: true,
            passed: 10,
            failed: 0,
            skipped: 0,
            errors: [],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      await iterator.execute(task, { includePreviousErrors: true });

      // Third iteration should have errors from first two iterations
      expect(capturedContexts).toHaveLength(3);
      expect(capturedContexts[2].previousErrors.length).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate errors', async () => {
      const contextManager = createMockContextManager();
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn().mockImplementation(async (context: IterationContext) => {
        capturedContexts.push(context);
        return {
          success: true,
          filesChanged: ['src/test.ts'],
          output: 'Agent made changes',
          tokensUsed: 500,
        };
      });

      let callCount = 0;
      const qaRunner: QARunner = {
        test: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            return {
              success: false,
              passed: 8,
              failed: 2,
              skipped: 0,
              errors: [
                { type: 'test', severity: 'error', message: 'Same error', file: 'test.ts', line: 10, iteration: callCount },
              ],
              duration: 5000,
            };
          }
          return {
            success: true,
            passed: 10,
            failed: 0,
            skipped: 0,
            errors: [],
            duration: 5000,
          };
        }),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        agentRunner,
        qaRunner,
      });

      const task = createMockTask();
      await iterator.execute(task, { includePreviousErrors: true });

      // Should deduplicate the same error
      const lastContext = capturedContexts[capturedContexts.length - 1];
      const sameErrorCount = lastContext.previousErrors.filter(
        e => e.message === 'Same error'
      ).length;
      expect(sameErrorCount).toBe(1); // Deduplicated
    });
  });

  describe('escalation', () => {
    it('should escalate on repeated failures', async () => {
      const contextManager = createMockContextManager();
      const qaRunner: QARunner = {
        test: vi.fn().mockResolvedValue({
          success: false,
          passed: 8,
          failed: 2,
          skipped: 0,
          errors: [{ type: 'test', severity: 'error', message: 'Same error every time', iteration: 1 }],
          duration: 5000,
        }),
      };

      const escalationHandler: IEscalationHandler = {
        escalate: vi.fn().mockResolvedValue({
          taskId: 'test-task-1',
          reason: 'repeated_failures',
          iterationsCompleted: 3,
          summary: 'Task escalated',
          lastErrors: [],
          suggestedActions: [],
          checkpointCommit: 'checkpoint',
          createdAt: new Date(),
        }),
        createCheckpoint: vi.fn().mockResolvedValue('checkpoint'),
        notifyHuman: vi.fn(),
      };

      const iterator = createTestRalphStyleIterator({
        contextManager,
        qaRunner,
        escalationHandler,
      });

      const task = createMockTask();
      const result = await iterator.execute(task, { maxIterations: 5 });

      expect(result.finalState).toBe('escalated');
      expect(escalationHandler.escalate).toHaveBeenCalled();
      expect(escalationHandler.notifyHuman).toHaveBeenCalled();
    });

    it('should include escalation report in result', async () => {
      const qaRunner = createMockQARunner({ testSuccess: false });

      const iterator = createTestRalphStyleIterator({ qaRunner });
      const task = createMockTask();

      const result = await iterator.execute(task, { maxIterations: 3 });

      expect(result.escalationReport).toBeDefined();
      expect(result.escalationReport?.taskId).toBe(task.id);
      expect(result.escalationReport?.iterationsCompleted).toBe(3);
    });
  });

  describe('factory functions', () => {
    it('createRalphStyleIterator should create configured instance', () => {
      const contextManager = createMockContextManager();
      const iterator = createRalphStyleIterator({
        projectPath: '/test/path',
        contextManager,
      });

      expect(iterator).toBeInstanceOf(RalphStyleIterator);
    });

    it('createTestRalphStyleIterator should create test instance', () => {
      const iterator = createTestRalphStyleIterator();
      expect(iterator).toBeInstanceOf(RalphStyleIterator);
    });

    it('createTestRalphStyleIterator should accept custom options', () => {
      const customAgentRunner = vi.fn().mockResolvedValue({
        success: true,
        filesChanged: [],
        output: 'Custom agent',
        tokensUsed: 0,
      });

      const iterator = createTestRalphStyleIterator({
        agentRunner: customAgentRunner,
      });

      expect(iterator).toBeInstanceOf(RalphStyleIterator);
    });
  });
});
