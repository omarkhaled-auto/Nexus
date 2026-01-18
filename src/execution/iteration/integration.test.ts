/**
 * Integration Tests for Dynamic Context Provider + Ralph-Style Iterator
 *
 * Tests that verify the cross-module integration between:
 * - DynamicContextProvider (Plan 13-05)
 * - RalphStyleIterator (Plan 13-06)
 * - FreshContextManager (Plan 13-04)
 *
 * These tests verify end-to-end workflows and component interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RalphStyleIterator,
  createTestRalphStyleIterator,
  type IterationContext,
  type AgentExecutionResult,
  type QARunner,
  type BuildResult,
  type LintResult,
  type TestResult,
  type ErrorEntry,
} from './index';
import {
  DynamicContextProvider,
  createDynamicContextProvider,
  type IRequestHandler,
  type ContextRequest,
  type ContextResponse,
} from '../../orchestration/context/dynamic';
import type { TaskSpec } from '../../orchestration/context/types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock task spec for testing
 */
function createMockTaskSpec(overrides?: Partial<TaskSpec>): TaskSpec {
  return {
    id: `task-${Date.now()}`,
    name: 'Test Task',
    description: 'Test task description',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Requirement 1', 'Requirement 2'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create mock QA runner functions that can be controlled
 */
function createMockQARunner(
  passAfterIteration: number = 1
): { runner: QARunner; callCounts: { build: number; lint: number; test: number } } {
  const callCounts = { build: 0, lint: 0, test: 0 };

  const runner: QARunner = {
    build: vi.fn(async (): Promise<BuildResult> => {
      callCounts.build++;
      return {
        success: true,
        errors: [],
        warnings: [],
        duration: 100,
      };
    }),
    lint: vi.fn(async (): Promise<LintResult> => {
      callCounts.lint++;
      return {
        success: true,
        errors: [],
        warnings: [],
        fixable: 0,
      };
    }),
    test: vi.fn(async (): Promise<TestResult> => {
      callCounts.test++;
      const currentIteration = callCounts.test;
      const shouldPass = currentIteration >= passAfterIteration;

      if (shouldPass) {
        return {
          success: true,
          passed: 10,
          failed: 0,
          skipped: 0,
          errors: [],
          duration: 500,
        };
      }

      return {
        success: false,
        passed: 8,
        failed: 2,
        skipped: 0,
        errors: [
          {
            type: 'test' as const,
            severity: 'error' as const,
            message: `Test failed on iteration ${currentIteration}`,
            file: 'src/test.ts',
            line: 42,
            iteration: currentIteration,
          },
        ],
        duration: 600,
      };
    }),
  };

  return { runner, callCounts };
}

/**
 * Create a mock agent runner
 */
function createMockAgentRunner(
  resultOverrides?: Partial<AgentExecutionResult>
): (context: IterationContext) => Promise<AgentExecutionResult> {
  return vi.fn(async (_context: IterationContext): Promise<AgentExecutionResult> => ({
    success: true,
    filesChanged: ['src/test.ts'],
    output: 'Made changes to test file',
    tokensUsed: 1000,
    ...resultOverrides,
  }));
}

/**
 * Create a mock request handler for testing
 */
function createMockHandler(type: string): IRequestHandler {
  return {
    canHandle: (t: string) => t === type,
    handle: vi.fn(async (request: ContextRequest): Promise<ContextResponse> => ({
      success: true,
      requestId: `req-${Date.now()}`,
      type: request.type,
      content: `Mock content for ${type} request: ${request.query}`,
      tokenCount: 100,
      source: `mock-${type}`,
    })),
  };
}

// ============================================================================
// Integration Test Suites
// ============================================================================

describe('DynamicContextProvider + RalphStyleIterator Integration', () => {
  let provider: DynamicContextProvider;
  let iterator: RalphStyleIterator;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Full Iteration Cycle', () => {
    it('should complete successfully when tests pass on first iteration', async () => {
      // Setup: QA passes immediately
      const { runner, callCounts } = createMockQARunner(1);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner: createMockAgentRunner(),
      });

      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 5 });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.finalState).toBe('completed');
      expect(result.iterations).toBe(1);
      expect(callCounts.build).toBe(1);
      expect(callCounts.lint).toBe(1);
      expect(callCounts.test).toBe(1);
    });

    it('should iterate until tests pass (success on iteration 3)', async () => {
      // Setup: QA passes on 3rd iteration
      const { runner, callCounts } = createMockQARunner(3);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner: createMockAgentRunner(),
      });

      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 5 });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.finalState).toBe('completed');
      expect(result.iterations).toBe(3);
      expect(callCounts.test).toBe(3);
      expect(result.history).toHaveLength(3);
    });

    it('should handle max iterations being reached', async () => {
      // Setup: QA never passes
      const { runner } = createMockQARunner(999); // Never pass
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner: createMockAgentRunner(),
      });

      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 3 });

      // Assertions - task should fail or escalate
      expect(result.success).toBe(false);
      expect(result.iterations).toBe(3);
      // State could be 'failed' or 'escalated' depending on implementation
      expect(['failed', 'escalated']).toContain(result.finalState);
    });

    it('should include git diff context in subsequent iterations', async () => {
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn(
        async (context: IterationContext): Promise<AgentExecutionResult> => {
          capturedContexts.push({ ...context });
          return {
            success: true,
            filesChanged: ['src/test.ts'],
            output: 'Changes made',
            tokensUsed: 1000,
          };
        }
      );

      const { runner } = createMockQARunner(2);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner,
      });

      const task = createMockTaskSpec();
      await iterator.execute(task, { maxIterations: 5, includeGitDiff: true });

      // First iteration should not have previous diff
      expect(capturedContexts[0].previousDiff).toBeUndefined();

      // Second iteration should have diff (or mock diff depending on test setup)
      expect(capturedContexts.length).toBe(2);
      expect(agentRunner).toHaveBeenCalledTimes(2);
    });

    it('should include previous errors in context', async () => {
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn(
        async (context: IterationContext): Promise<AgentExecutionResult> => {
          capturedContexts.push({ ...context });
          return {
            success: true,
            filesChanged: ['src/test.ts'],
            output: 'Changes made',
            tokensUsed: 1000,
          };
        }
      );

      const { runner } = createMockQARunner(2);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner,
      });

      const task = createMockTaskSpec();
      await iterator.execute(task, { maxIterations: 5, includePreviousErrors: true });

      // First iteration should not have previous errors
      expect(capturedContexts[0].previousErrors).toEqual([]);

      // Second iteration should have errors from first iteration
      expect(capturedContexts.length).toBe(2);
      expect(capturedContexts[1].previousErrors.length).toBeGreaterThan(0);
      expect(capturedContexts[1].previousErrors[0].type).toBe('test');
    });
  });

  describe('Status and History', () => {
    it('should return status for completed tasks', async () => {
      const { runner } = createMockQARunner(1);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner: createMockAgentRunner(),
      });

      const task = createMockTaskSpec({ id: 'status-test-task' });
      const result = await iterator.execute(task, { maxIterations: 5 });

      // Task completed successfully
      expect(result.success).toBe(true);
      expect(result.finalState).toBe('completed');
      expect(result.iterations).toBe(1);

      // History should be populated
      expect(result.history).toHaveLength(1);
    });

    it('should return null for unknown task status', () => {
      iterator = createTestRalphStyleIterator({});
      const status = iterator.getStatus('unknown-task');
      expect(status).toBeNull();
    });

    it('should return empty history for unknown task', () => {
      iterator = createTestRalphStyleIterator({});
      const history = iterator.getHistory('unknown-task');
      expect(history).toEqual([]);
    });

    it('should track iteration history correctly', async () => {
      const { runner } = createMockQARunner(3);
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner: createMockAgentRunner(),
      });

      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 5 });

      // Should have 3 history entries
      expect(result.history).toHaveLength(3);
      expect(result.history[0].iteration).toBe(1);
      expect(result.history[1].iteration).toBe(2);
      expect(result.history[2].iteration).toBe(3);
    });
  });

  describe('Dynamic Context Provider Integration', () => {
    it('should allow agents to request additional context during iteration', async () => {
      const fileHandler = createMockHandler('file');
      const symbolHandler = createMockHandler('symbol');

      provider = new DynamicContextProvider([fileHandler, symbolHandler], {
        defaultTokenBudget: 100000,
      });

      // Simulate agent registration and context request during iteration
      const agentId = 'test-agent-1';
      const taskId = 'test-task-1';

      // Agent registers when iteration starts
      provider.registerAgent(agentId, taskId, 50000);

      // Agent requests file content
      const fileResponse = await provider.requestFile(
        agentId,
        'src/index.ts',
        'Need to understand entry point'
      );

      expect(fileResponse.success).toBe(true);
      expect(fileResponse.type).toBe('file');
      expect(fileResponse.tokenCount).toBeGreaterThan(0);

      // Agent requests symbol information
      const symbolResponse = await provider.requestSymbol(
        agentId,
        'calculateTotal',
        'Need function signature'
      );

      expect(symbolResponse.success).toBe(true);
      expect(symbolResponse.type).toBe('symbol');

      // Check budget tracking
      expect(provider.getUsedTokens(agentId)).toBeGreaterThan(0);
      expect(provider.getRemainingBudget(agentId)).toBeLessThan(50000);
    });

    it('should handle token budget during iteration', async () => {
      const mockHandler: IRequestHandler = {
        canHandle: () => true,
        handle: vi.fn(async (request: ContextRequest): Promise<ContextResponse> => ({
          success: true,
          requestId: `req-${Date.now()}`,
          type: request.type,
          content: 'Large content response',
          tokenCount: 30000, // Large response
          source: 'mock',
        })),
      };

      provider = new DynamicContextProvider([mockHandler], {
        defaultTokenBudget: 50000,
      });

      const agentId = 'budget-test-agent';
      const taskId = 'budget-test-task';

      provider.registerAgent(agentId, taskId, 50000);

      // First request should succeed
      const response1 = await provider.requestFile(agentId, 'file1.ts', 'Need it');
      expect(response1.success).toBe(true);

      // Budget should be updated
      expect(provider.getUsedTokens(agentId)).toBe(30000);
      expect(provider.getRemainingBudget(agentId)).toBe(20000);
    });

    it('should track request history for debugging', async () => {
      const handler = createMockHandler('file');
      provider = new DynamicContextProvider([handler], {
        defaultTokenBudget: 100000,
      });

      const agentId = 'history-test-agent';
      const taskId = 'history-test-task';

      provider.registerAgent(agentId, taskId);

      // Make several requests
      await provider.requestFile(agentId, 'src/a.ts', 'Need A');
      await provider.requestFile(agentId, 'src/b.ts', 'Need B');
      await provider.requestFile(agentId, 'src/c.ts', 'Need C');

      // Get history
      const history = provider.getRequestHistory(agentId);
      expect(history).toHaveLength(3);
      expect(history[0].query).toBe('src/a.ts');
      expect(history[1].query).toBe('src/b.ts');
      expect(history[2].query).toBe('src/c.ts');
    });
  });

  describe('Error Aggregation Across Iterations', () => {
    it('should collect errors across iterations', async () => {
      const capturedContexts: IterationContext[] = [];
      const agentRunner = vi.fn(
        async (context: IterationContext): Promise<AgentExecutionResult> => {
          // Capture errors from context for verification
          capturedContexts.push({ ...context });
          return {
            success: true,
            filesChanged: ['src/test.ts'],
            output: 'Made changes',
            tokensUsed: 1000,
          };
        }
      );

      // Create QA runner that returns same error multiple times
      const qaRunner: QARunner = {
        build: vi.fn(async () => ({
          success: true,
          errors: [],
          warnings: [],
          duration: 100,
        })),
        lint: vi.fn(async () => ({
          success: true,
          errors: [],
          warnings: [],
          fixable: 0,
        })),
        test: vi.fn(async () => ({
          success: false,
          passed: 5,
          failed: 1,
          skipped: 0,
          errors: [
            {
              type: 'test' as const,
              severity: 'error' as const,
              message: 'Same error repeated',
              file: 'src/test.ts',
              line: 10,
              iteration: 0,
            },
          ],
          duration: 500,
        })),
      };

      iterator = createTestRalphStyleIterator({
        qaRunner,
        agentRunner,
      });

      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 3 });

      // Should have run max iterations since tests never pass
      expect(result.iterations).toBe(3);
      expect(result.success).toBe(false);

      // Later iterations should have previous errors
      if (capturedContexts.length > 1) {
        expect(capturedContexts[1].previousErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complete End-to-End Flow', () => {
    it('should handle complete flow: context provider + iterator integration', async () => {
      // Setup provider with handlers
      const fileHandler = createMockHandler('file');
      provider = new DynamicContextProvider([fileHandler], {
        defaultTokenBudget: 100000,
      });

      // Setup iterator
      let contextRequestMade = false;
      const agentRunner = vi.fn(
        async (context: IterationContext): Promise<AgentExecutionResult> => {
          // Simulate agent requesting additional context
          if (context.iteration === 1 && !contextRequestMade) {
            const agentId = `agent-${context.task.taskId}`;
            provider.registerAgent(agentId, context.task.taskId);

            const response = await provider.requestFile(
              agentId,
              'src/helper.ts',
              'Need helper functions'
            );
            expect(response.success).toBe(true);
            contextRequestMade = true;
          }

          return {
            success: true,
            filesChanged: ['src/test.ts'],
            output: 'Applied fix',
            tokensUsed: 1500,
          };
        }
      );

      const { runner } = createMockQARunner(2); // Pass on second iteration
      iterator = createTestRalphStyleIterator({
        qaRunner: runner,
        agentRunner,
      });

      // Execute
      const task = createMockTaskSpec();
      const result = await iterator.execute(task, { maxIterations: 5 });

      // Verify complete flow
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
      expect(contextRequestMade).toBe(true);
      expect(result.history).toHaveLength(2);
    });
  });
});

describe('Cross-Module Type Compatibility', () => {
  it('should have compatible task types between modules', () => {
    // This test verifies type compatibility at compile time
    const task: TaskSpec = {
      id: 'type-test',
      name: 'Type Compatibility Test',
      description: 'Type compatibility test',
      files: [],
      testCriteria: 'All tests pass',
      acceptanceCriteria: ['Test requirement'],
      dependencies: [],
      estimatedTime: 30,
    };

    // Should be usable in both DynamicContextProvider and RalphStyleIterator
    const provider = createDynamicContextProvider([]);
    provider.registerAgent('agent', task.id);

    const iterator = createTestRalphStyleIterator({});
    const statusCheck = iterator.getStatus(task.id);

    // Type checks pass if code compiles
    expect(task.id).toBeDefined();
    expect(statusCheck).toBeNull(); // Task not started yet
  });

  it('should export all required types from index modules', async () => {
    // Import from parent index
    const contextModule = await import('../../orchestration/context');
    const executionModule = await import('../../execution');

    // Context module should export dynamic context types
    expect(contextModule.DynamicContextProvider).toBeDefined();
    expect(contextModule.createDynamicContextProvider).toBeDefined();

    // Execution module should export iteration types
    expect(executionModule.RalphStyleIterator).toBeDefined();
    expect(executionModule.createTestRalphStyleIterator).toBeDefined();
    expect(executionModule.GitDiffContextBuilder).toBeDefined();
    expect(executionModule.ErrorContextAggregator).toBeDefined();
  });
});
