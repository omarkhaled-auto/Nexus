/**
 * ReplannerIntegration Tests
 *
 * Tests for the ReplannerIntegration module that provides
 * hooks for integrating DynamicReplanner with the orchestration system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReplannerIntegration,
  ReplannerEventEmitterImpl,
  createReplannerIntegration,
  computeMetricsFromContext,
  type IReplannerEventEmitter,
  type ReplannerIntegrationConfig,
} from './ReplannerIntegration';
import type {
  IDynamicReplanner,
  ExecutionContext,
  ReplanDecision,
  ReplanResult,
  Task,
  MonitoredTask,
  ReplanReason,
  TriggerThresholds,
} from './types';
import type { IterationResult, IterationHistoryEntry, ErrorEntry } from '../../execution/iteration/types';

// ============================================================================
// Mock Factory
// ============================================================================

function createMockReplanner(): IDynamicReplanner & {
  mockStartMonitoring: ReturnType<typeof vi.fn>;
  mockStopMonitoring: ReturnType<typeof vi.fn>;
  mockUpdateContext: ReturnType<typeof vi.fn>;
  mockCheckReplanningNeeded: ReturnType<typeof vi.fn>;
  mockEvaluateAllTriggers: ReturnType<typeof vi.fn>;
  mockReplan: ReturnType<typeof vi.fn>;
  mockHandleAgentRequest: ReturnType<typeof vi.fn>;
  mockSetThresholds: ReturnType<typeof vi.fn>;
  mockGetThresholds: ReturnType<typeof vi.fn>;
  mockGetMonitoredTasks: ReturnType<typeof vi.fn>;
  mockGetDecisionHistory: ReturnType<typeof vi.fn>;
} {
  const mockStartMonitoring = vi.fn();
  const mockStopMonitoring = vi.fn();
  const mockUpdateContext = vi.fn();
  const mockCheckReplanningNeeded = vi.fn().mockReturnValue({
    shouldReplan: false,
    suggestedAction: 'continue',
    confidence: 1.0,
    timestamp: new Date(),
  } satisfies ReplanDecision);
  const mockEvaluateAllTriggers = vi.fn();
  const mockReplan = vi.fn().mockResolvedValue({
    success: true,
    action: 'continue',
    originalTask: createMockTask(),
    message: 'No action needed',
    metrics: createMockMetrics(),
  } satisfies ReplanResult);
  const mockHandleAgentRequest = vi.fn();
  const mockSetThresholds = vi.fn();
  const mockGetThresholds = vi.fn().mockReturnValue({
    timeExceededRatio: 1.5,
    iterationsRatio: 0.4,
    scopeCreepFiles: 3,
    consecutiveFailures: 5,
    complexityKeywords: ['complex'],
  } satisfies TriggerThresholds);
  const mockGetMonitoredTasks = vi.fn().mockReturnValue([]);
  const mockGetDecisionHistory = vi.fn().mockReturnValue([]);

  return {
    startMonitoring: mockStartMonitoring,
    stopMonitoring: mockStopMonitoring,
    updateContext: mockUpdateContext,
    checkReplanningNeeded: mockCheckReplanningNeeded,
    evaluateAllTriggers: mockEvaluateAllTriggers,
    replan: mockReplan,
    handleAgentRequest: mockHandleAgentRequest,
    setThresholds: mockSetThresholds,
    getThresholds: mockGetThresholds,
    getMonitoredTasks: mockGetMonitoredTasks,
    getDecisionHistory: mockGetDecisionHistory,
    mockStartMonitoring,
    mockStopMonitoring,
    mockUpdateContext,
    mockCheckReplanningNeeded,
    mockEvaluateAllTriggers,
    mockReplan,
    mockHandleAgentRequest,
    mockSetThresholds,
    mockGetThresholds,
    mockGetMonitoredTasks,
    mockGetDecisionHistory,
  };
}

function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task',
    files: ['src/index.ts'],
    estimatedTime: 30,
    dependencies: [],
    acceptanceCriteria: ['Tests pass'],
    status: 'pending',
    ...overrides,
  };
}

function createMockMetrics() {
  return {
    timeElapsed: 10,
    estimatedTime: 30,
    timeRatio: 0.33,
    iterations: 3,
    maxIterations: 20,
    iterationRatio: 0.15,
    filesModified: 1,
    filesExpected: 2,
    scopeCreepCount: 0,
    errorsEncountered: 0,
    consecutiveFailures: 0,
  };
}

function createMockIterationResult(overrides?: Partial<IterationResult>): IterationResult {
  return {
    success: true,
    taskId: 'task-1',
    iterations: 3,
    finalState: 'completed',
    history: [],
    totalDuration: 10000,
    totalTokens: 1000,
    ...overrides,
  };
}

function createMockHistoryEntry(overrides?: Partial<IterationHistoryEntry>): IterationHistoryEntry {
  return {
    iteration: 1,
    phase: 'coding',
    action: 'Implemented feature',
    changes: [{ file: 'src/index.ts', changeType: 'modified', additions: 10, deletions: 2 }],
    errors: [],
    duration: 5000,
    tokens: 500,
    timestamp: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests: ReplannerEventEmitterImpl
// ============================================================================

describe('ReplannerEventEmitterImpl', () => {
  let emitter: ReplannerEventEmitterImpl;

  beforeEach(() => {
    emitter = new ReplannerEventEmitterImpl();
  });

  it('should register and call event handlers', () => {
    const handler = vi.fn();
    const task = createMockTask();

    emitter.on('task:started', handler);
    emitter.emit('task:started', { taskId: 'task-1', task });

    expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', task });
  });

  it('should support multiple handlers for same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const task = createMockTask();

    emitter.on('task:started', handler1);
    emitter.on('task:started', handler2);
    emitter.emit('task:started', { taskId: 'task-1', task });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove handlers with off()', () => {
    const handler = vi.fn();
    const task = createMockTask();

    emitter.on('task:started', handler);
    emitter.off('task:started', handler);
    emitter.emit('task:started', { taskId: 'task-1', task });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle handlers that throw errors', () => {
    const handler1 = vi.fn().mockImplementation(() => {
      throw new Error('Handler error');
    });
    const handler2 = vi.fn();
    const task = createMockTask();

    emitter.on('task:started', handler1);
    emitter.on('task:started', handler2);

    // Should not throw
    expect(() => emitter.emit('task:started', { taskId: 'task-1', task })).not.toThrow();

    // Second handler should still be called
    expect(handler2).toHaveBeenCalled();
  });

  it('should handle emit with no registered handlers', () => {
    expect(() =>
      emitter.emit('task:started', { taskId: 'task-1', task: createMockTask() })
    ).not.toThrow();
  });
});

// ============================================================================
// Tests: ReplannerIntegration
// ============================================================================

describe('ReplannerIntegration', () => {
  let mockReplanner: ReturnType<typeof createMockReplanner>;
  let mockEmitter: IReplannerEventEmitter;
  let integration: ReplannerIntegration;

  beforeEach(() => {
    mockReplanner = createMockReplanner();
    mockEmitter = new ReplannerEventEmitterImpl();
    integration = new ReplannerIntegration({
      replanner: mockReplanner,
      eventEmitter: mockEmitter,
      autoCheckOnIteration: true,
      minIterationsBeforeCheck: 3,
    });
  });

  describe('onTaskStarted', () => {
    it('should start monitoring the task', () => {
      const task = createMockTask();
      integration.onTaskStarted('task-1', task);

      expect(mockReplanner.mockStartMonitoring).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskId: 'task-1',
          taskName: 'Test Task',
          estimatedTime: 30,
          timeElapsed: 0,
          iteration: 0,
        })
      );
    });

    it('should emit task:started event', () => {
      const handler = vi.fn();
      mockEmitter.on('task:started', handler);

      const task = createMockTask();
      integration.onTaskStarted('task-1', task);

      expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', task });
    });

    it('should use task files as filesExpected', () => {
      const task = createMockTask({ files: ['a.ts', 'b.ts', 'c.ts'] });
      integration.onTaskStarted('task-1', task);

      expect(mockReplanner.mockStartMonitoring).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          filesExpected: ['a.ts', 'b.ts', 'c.ts'],
          filesModified: [],
        })
      );
    });
  });

  describe('onIterationComplete', () => {
    beforeEach(() => {
      const task = createMockTask();
      integration.onTaskStarted('task-1', task);
    });

    it('should update replanner context', () => {
      const result = createMockIterationResult({ iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockUpdateContext).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          iteration: 5,
        })
      );
    });

    it('should emit task:iteration_complete event', () => {
      const handler = vi.fn();
      mockEmitter.on('task:iteration_complete', handler);

      const result = createMockIterationResult({ iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(handler).toHaveBeenCalledWith({
        taskId: 'task-1',
        iteration: 5,
        result,
      });
    });

    it('should check replanning when minIterationsBeforeCheck reached', () => {
      const result = createMockIterationResult({ iterations: 3 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockCheckReplanningNeeded).toHaveBeenCalledWith('task-1');
    });

    it('should not check replanning before minIterationsBeforeCheck', () => {
      const result = createMockIterationResult({ iterations: 2 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockCheckReplanningNeeded).not.toHaveBeenCalled();
    });

    it('should emit replan:decision event when replanning needed', () => {
      const handler = vi.fn();
      mockEmitter.on('replan:decision', handler);

      const decision: ReplanDecision = {
        shouldReplan: true,
        reason: {
          trigger: 'iterations_high',
          details: 'Too many iterations',
          metrics: createMockMetrics(),
          confidence: 0.8,
        },
        suggestedAction: 'split',
        confidence: 0.8,
        timestamp: new Date(),
      };
      mockReplanner.mockCheckReplanningNeeded.mockReturnValue(decision);

      const result = createMockIterationResult({ iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', decision });
    });

    it('should extract files modified from history', () => {
      const history: IterationHistoryEntry[] = [
        createMockHistoryEntry({
          changes: [
            { file: 'a.ts', changeType: 'modified', additions: 5, deletions: 0 },
            { file: 'b.ts', changeType: 'added', additions: 10, deletions: 0 },
          ],
        }),
        createMockHistoryEntry({
          changes: [
            { file: 'a.ts', changeType: 'modified', additions: 3, deletions: 1 },
            { file: 'c.ts', changeType: 'modified', additions: 2, deletions: 2 },
          ],
        }),
      ];

      const result = createMockIterationResult({ history, iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockUpdateContext).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          filesModified: expect.arrayContaining(['a.ts', 'b.ts', 'c.ts']),
        })
      );
    });

    it('should extract errors from history', () => {
      const errors: ErrorEntry[] = [
        { type: 'build', severity: 'error', message: 'Error 1', iteration: 1 },
        { type: 'test', severity: 'error', message: 'Error 2', iteration: 2 },
      ];

      const history: IterationHistoryEntry[] = [
        createMockHistoryEntry({ errors: [errors[0]] }),
        createMockHistoryEntry({ errors: [errors[1]] }),
      ];

      const result = createMockIterationResult({ history, iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockUpdateContext).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          errors: expect.arrayContaining(errors),
        })
      );
    });

    it('should calculate consecutive failures correctly', () => {
      const history: IterationHistoryEntry[] = [
        createMockHistoryEntry({ errors: [] }), // Success
        createMockHistoryEntry({
          errors: [{ type: 'build', severity: 'error', message: 'Error', iteration: 2 }],
        }), // Fail
        createMockHistoryEntry({
          errors: [{ type: 'test', severity: 'error', message: 'Error', iteration: 3 }],
        }), // Fail
      ];

      const result = createMockIterationResult({ history, iterations: 5 });
      integration.onIterationComplete('task-1', result);

      expect(mockReplanner.mockUpdateContext).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          consecutiveFailures: 2,
        })
      );
    });
  });

  describe('onTaskCompleted', () => {
    beforeEach(() => {
      const task = createMockTask();
      integration.onTaskStarted('task-1', task);
    });

    it('should stop monitoring the task', () => {
      integration.onTaskCompleted('task-1', true);

      expect(mockReplanner.mockStopMonitoring).toHaveBeenCalledWith('task-1');
    });

    it('should emit task:completed event', () => {
      const handler = vi.fn();
      mockEmitter.on('task:completed', handler);

      integration.onTaskCompleted('task-1', true);

      expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', success: true });
    });
  });

  describe('onAgentFeedback', () => {
    beforeEach(() => {
      const task = createMockTask();
      integration.onTaskStarted('task-1', task);
    });

    it('should update context with feedback', () => {
      integration.onAgentFeedback('task-1', 'This task is more complex than expected');

      expect(mockReplanner.mockUpdateContext).toHaveBeenCalledWith('task-1', {
        agentFeedback: 'This task is more complex than expected',
      });
    });

    it('should check for replanning', () => {
      integration.onAgentFeedback('task-1', 'This task is more complex than expected');

      expect(mockReplanner.mockCheckReplanningNeeded).toHaveBeenCalledWith('task-1');
    });

    it('should emit replan:decision when triggered', () => {
      const handler = vi.fn();
      mockEmitter.on('replan:decision', handler);

      const decision: ReplanDecision = {
        shouldReplan: true,
        reason: {
          trigger: 'complexity_discovered',
          details: 'Agent feedback indicates complexity',
          metrics: createMockMetrics(),
          confidence: 0.7,
        },
        suggestedAction: 'split',
        confidence: 0.7,
        timestamp: new Date(),
      };
      mockReplanner.mockCheckReplanningNeeded.mockReturnValue(decision);

      integration.onAgentFeedback('task-1', 'This task is more complex than expected');

      expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', decision });
    });
  });

  describe('handleReplanDecision', () => {
    it('should return null for non-replan decisions', async () => {
      const decision: ReplanDecision = {
        shouldReplan: false,
        suggestedAction: 'continue',
        confidence: 1.0,
        timestamp: new Date(),
      };

      const result = await integration.handleReplanDecision('task-1', decision);

      expect(result).toBeNull();
      expect(mockReplanner.mockReplan).not.toHaveBeenCalled();
    });

    it('should execute replan for replan decisions', async () => {
      const decision: ReplanDecision = {
        shouldReplan: true,
        reason: {
          trigger: 'scope_creep',
          details: 'Too many files',
          metrics: createMockMetrics(),
          confidence: 0.8,
        },
        suggestedAction: 'split',
        confidence: 0.8,
        timestamp: new Date(),
      };

      await integration.handleReplanDecision('task-1', decision);

      expect(mockReplanner.mockReplan).toHaveBeenCalledWith('task-1', decision.reason);
    });

    it('should emit replan:executed event', async () => {
      const handler = vi.fn();
      mockEmitter.on('replan:executed', handler);

      const decision: ReplanDecision = {
        shouldReplan: true,
        reason: {
          trigger: 'scope_creep',
          details: 'Too many files',
          metrics: createMockMetrics(),
          confidence: 0.8,
        },
        suggestedAction: 'split',
        confidence: 0.8,
        timestamp: new Date(),
      };

      await integration.handleReplanDecision('task-1', decision);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit replan:split event when split successful', async () => {
      const handler = vi.fn();
      mockEmitter.on('replan:split', handler);

      const originalTask = createMockTask();
      const newTasks = [createMockTask({ id: 'task-1a' }), createMockTask({ id: 'task-1b' })];

      const replanResult: ReplanResult = {
        success: true,
        action: 'split',
        originalTask,
        newTasks,
        message: 'Task split successfully',
        metrics: createMockMetrics(),
      };
      mockReplanner.mockReplan.mockResolvedValue(replanResult);

      const decision: ReplanDecision = {
        shouldReplan: true,
        reason: {
          trigger: 'scope_creep',
          details: 'Too many files',
          metrics: createMockMetrics(),
          confidence: 0.8,
        },
        suggestedAction: 'split',
        confidence: 0.8,
        timestamp: new Date(),
      };

      await integration.handleReplanDecision('task-1', decision);

      expect(handler).toHaveBeenCalledWith({
        taskId: 'task-1',
        originalTask,
        newTasks,
      });
    });

    it('should emit replan:escalated event when escalated', async () => {
      const handler = vi.fn();
      mockEmitter.on('replan:escalated', handler);

      const replanResult: ReplanResult = {
        success: true,
        action: 'escalate',
        originalTask: createMockTask(),
        message: 'Task escalated',
        metrics: createMockMetrics(),
      };
      mockReplanner.mockReplan.mockResolvedValue(replanResult);

      const reason: ReplanReason = {
        trigger: 'blocking_issue',
        details: 'Critical error',
        metrics: createMockMetrics(),
        confidence: 0.9,
      };

      const decision: ReplanDecision = {
        shouldReplan: true,
        reason,
        suggestedAction: 'escalate',
        confidence: 0.9,
        timestamp: new Date(),
      };

      await integration.handleReplanDecision('task-1', decision);

      expect(handler).toHaveBeenCalledWith({
        taskId: 'task-1',
        reason,
      });
    });
  });

  describe('utility methods', () => {
    it('should delegate getMonitoredTasks to replanner', () => {
      const tasks: MonitoredTask[] = [
        {
          taskId: 'task-1',
          startedAt: new Date(),
          context: {} as ExecutionContext,
          decisions: [],
          isActive: true,
        },
      ];
      mockReplanner.mockGetMonitoredTasks.mockReturnValue(tasks);

      expect(integration.getMonitoredTasks()).toEqual(tasks);
    });

    it('should delegate getDecisionHistory to replanner', () => {
      const history: ReplanDecision[] = [
        {
          shouldReplan: false,
          suggestedAction: 'continue',
          confidence: 1.0,
          timestamp: new Date(),
        },
      ];
      mockReplanner.mockGetDecisionHistory.mockReturnValue(history);

      expect(integration.getDecisionHistory('task-1')).toEqual(history);
    });

    it('should return the replanner instance', () => {
      expect(integration.getReplanner()).toBe(mockReplanner);
    });

    it('should return the event emitter', () => {
      expect(integration.getEventEmitter()).toBe(mockEmitter);
    });
  });
});

// ============================================================================
// Tests: Factory Function
// ============================================================================

describe('createReplannerIntegration', () => {
  it('should create a ReplannerIntegration instance', () => {
    const mockReplanner = createMockReplanner();
    const config: ReplannerIntegrationConfig = {
      replanner: mockReplanner,
    };

    const integration = createReplannerIntegration(config);

    expect(integration).toBeInstanceOf(ReplannerIntegration);
  });
});

// ============================================================================
// Tests: computeMetricsFromContext
// ============================================================================

describe('computeMetricsFromContext', () => {
  it('should compute metrics from context', () => {
    const context: ExecutionContext = {
      taskId: 'task-1',
      taskName: 'Test Task',
      estimatedTime: 30,
      timeElapsed: 15,
      iteration: 5,
      maxIterations: 20,
      filesExpected: ['a.ts', 'b.ts'],
      filesModified: ['a.ts', 'c.ts'],
      errors: [{ type: 'build', severity: 'error', message: 'Error', iteration: 1 }],
      consecutiveFailures: 2,
    };

    const metrics = computeMetricsFromContext(context);

    expect(metrics).toEqual({
      timeElapsed: 15,
      estimatedTime: 30,
      timeRatio: 0.5,
      iterations: 5,
      maxIterations: 20,
      iterationRatio: 0.25,
      filesModified: 2,
      filesExpected: 2,
      scopeCreepCount: 1, // c.ts is unexpected
      errorsEncountered: 1,
      consecutiveFailures: 2,
    });
  });

  it('should handle zero estimated time', () => {
    const context: ExecutionContext = {
      taskId: 'task-1',
      taskName: 'Test Task',
      estimatedTime: 0,
      timeElapsed: 15,
      iteration: 5,
      maxIterations: 20,
      filesExpected: [],
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    };

    const metrics = computeMetricsFromContext(context);

    expect(metrics.timeRatio).toBe(0);
  });

  it('should handle zero max iterations', () => {
    const context: ExecutionContext = {
      taskId: 'task-1',
      taskName: 'Test Task',
      estimatedTime: 30,
      timeElapsed: 15,
      iteration: 5,
      maxIterations: 0,
      filesExpected: [],
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    };

    const metrics = computeMetricsFromContext(context);

    expect(metrics.iterationRatio).toBe(0);
  });
});

// ============================================================================
// Tests: Auto-check disabled
// ============================================================================

describe('ReplannerIntegration with auto-check disabled', () => {
  it('should not check replanning on iteration complete when disabled', () => {
    const mockReplanner = createMockReplanner();
    const integration = new ReplannerIntegration({
      replanner: mockReplanner,
      autoCheckOnIteration: false,
    });

    const task = createMockTask();
    integration.onTaskStarted('task-1', task);

    const result = createMockIterationResult({ iterations: 10 });
    integration.onIterationComplete('task-1', result);

    expect(mockReplanner.mockCheckReplanningNeeded).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: Default event emitter
// ============================================================================

describe('ReplannerIntegration with default event emitter', () => {
  it('should create default event emitter if not provided', () => {
    const mockReplanner = createMockReplanner();
    const integration = new ReplannerIntegration({
      replanner: mockReplanner,
    });

    expect(integration.getEventEmitter()).toBeDefined();
  });
});
