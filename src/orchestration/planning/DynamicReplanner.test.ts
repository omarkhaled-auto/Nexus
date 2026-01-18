/**
 * DynamicReplanner Tests
 *
 * Tests for the Dynamic Replanner that monitors tasks
 * and triggers replanning when needed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamicReplanner, createDynamicReplanner } from './DynamicReplanner';
import type {
  ITriggerEvaluator,
  ITaskSplitter,
  ExecutionContext,
  TriggerResult,
  TriggerThresholds,
  Task,
  ReplanReason,
  AgentReplanRequest,
  ReplannerEventEmitter,
} from './types';
import { DEFAULT_TRIGGER_THRESHOLDS } from './types';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Create a mock trigger evaluator
 */
function createMockTrigger(
  trigger: 'time_exceeded' | 'iterations_high' | 'blocking_issue',
  shouldTrigger: boolean,
  confidence = 0.8
): ITriggerEvaluator {
  return {
    trigger,
    evaluate: vi.fn().mockReturnValue({
      triggered: shouldTrigger,
      trigger,
      confidence,
      details: `Mock ${trigger} trigger`,
      metrics: {},
    } satisfies TriggerResult),
  };
}

/**
 * Create a mock task splitter
 */
function createMockTaskSplitter(): ITaskSplitter {
  return {
    canSplit: vi.fn().mockReturnValue(true),
    split: vi.fn().mockResolvedValue([
      {
        id: 'subtask-1',
        name: 'Subtask 1',
        description: 'First subtask',
        files: ['file1.ts'],
        estimatedTime: 15,
        dependencies: [],
        acceptanceCriteria: ['Criteria 1'],
        status: 'pending',
        parentTaskId: 'task-1',
      },
      {
        id: 'subtask-2',
        name: 'Subtask 2',
        description: 'Second subtask',
        files: ['file2.ts'],
        estimatedTime: 15,
        dependencies: ['subtask-1'],
        acceptanceCriteria: ['Criteria 2'],
        status: 'pending',
        parentTaskId: 'task-1',
      },
    ] satisfies Task[]),
    estimateSubtasks: vi.fn().mockReturnValue(2),
  };
}

/**
 * Create a sample execution context
 */
function createSampleContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    taskId: 'task-1',
    taskName: 'Test Task',
    estimatedTime: 30,
    timeElapsed: 10,
    iteration: 3,
    maxIterations: 20,
    filesExpected: ['file1.ts', 'file2.ts'],
    filesModified: ['file1.ts'],
    errors: [],
    consecutiveFailures: 0,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DynamicReplanner', () => {
  let replanner: DynamicReplanner;
  let mockTriggers: ITriggerEvaluator[];
  let mockTaskSplitter: ITaskSplitter;

  beforeEach(() => {
    mockTriggers = [
      createMockTrigger('time_exceeded', false),
      createMockTrigger('iterations_high', false),
    ];
    mockTaskSplitter = createMockTaskSplitter();
    replanner = new DynamicReplanner(mockTriggers, mockTaskSplitter);
  });

  // ===========================================================================
  // Monitoring Tests
  // ===========================================================================

  describe('Monitoring', () => {
    it('should start monitoring a task', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);

      const monitoredTasks = replanner.getMonitoredTasks();
      expect(monitoredTasks).toHaveLength(1);
      expect(monitoredTasks[0].taskId).toBe('task-1');
      expect(monitoredTasks[0].isActive).toBe(true);
      expect(monitoredTasks[0].context).toEqual(context);
    });

    it('should stop monitoring a task', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);
      replanner.stopMonitoring('task-1');

      const monitoredTasks = replanner.getMonitoredTasks();
      expect(monitoredTasks).toHaveLength(1);
      expect(monitoredTasks[0].isActive).toBe(false);
    });

    it('should update context for a monitored task', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);
      replanner.updateContext('task-1', { iteration: 5, timeElapsed: 20 });

      const tasks = replanner.getMonitoredTasks();
      expect(tasks[0].context.iteration).toBe(5);
      expect(tasks[0].context.timeElapsed).toBe(20);
      // Original values should remain
      expect(tasks[0].context.taskName).toBe('Test Task');
    });

    it('should not update context for non-existent task', () => {
      replanner.updateContext('non-existent', { iteration: 5 });

      const monitoredTasks = replanner.getMonitoredTasks();
      expect(monitoredTasks).toHaveLength(0);
    });

    it('should not update context for stopped task', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);
      replanner.stopMonitoring('task-1');
      replanner.updateContext('task-1', { iteration: 5 });

      const tasks = replanner.getMonitoredTasks();
      expect(tasks[0].context.iteration).toBe(3); // Unchanged
    });
  });

  // ===========================================================================
  // Trigger Evaluation Tests
  // ===========================================================================

  describe('Trigger Evaluation', () => {
    it('should return no replan when no triggers are activated', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);
      const decision = replanner.checkReplanningNeeded('task-1');

      expect(decision.shouldReplan).toBe(false);
      expect(decision.suggestedAction).toBe('continue');
    });

    it('should return replan decision when triggers are activated', () => {
      const activeTrigger = createMockTrigger('time_exceeded', true, 0.9);
      replanner = new DynamicReplanner([activeTrigger], mockTaskSplitter);

      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);
      const decision = replanner.checkReplanningNeeded('task-1');

      expect(decision.shouldReplan).toBe(true);
      expect(decision.reason).toBeDefined();
      expect(decision.reason?.trigger).toBe('time_exceeded');
    });

    it('should select highest priority trigger', () => {
      const triggers = [
        createMockTrigger('time_exceeded', true, 0.8), // Priority 40
        createMockTrigger('blocking_issue', true, 0.7), // Priority 100
      ];
      replanner = new DynamicReplanner(triggers, mockTaskSplitter);

      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);
      const decision = replanner.checkReplanningNeeded('task-1');

      expect(decision.shouldReplan).toBe(true);
      expect(decision.reason?.trigger).toBe('blocking_issue');
    });

    it('should store decisions in history', () => {
      const context = createSampleContext();

      replanner.startMonitoring('task-1', context);
      replanner.checkReplanningNeeded('task-1');
      replanner.checkReplanningNeeded('task-1');

      const history = replanner.getDecisionHistory('task-1');
      expect(history).toHaveLength(2);
    });

    it('should return no replan for non-existent task', () => {
      const decision = replanner.checkReplanningNeeded('non-existent');

      expect(decision.shouldReplan).toBe(false);
    });

    it('should evaluate all triggers with context', () => {
      const context = createSampleContext();

      replanner.evaluateAllTriggers(context);

      mockTriggers.forEach((trigger) => {
        expect(trigger.evaluate).toHaveBeenCalledWith(
          context,
          expect.objectContaining(DEFAULT_TRIGGER_THRESHOLDS)
        );
      });
    });
  });

  // ===========================================================================
  // Replanning Tests
  // ===========================================================================

  describe('Replanning', () => {
    it('should execute split action when scope_creep trigger', async () => {
      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const reason: ReplanReason = {
        trigger: 'scope_creep',
        details: 'Too many files modified',
        metrics: {
          timeElapsed: 10,
          estimatedTime: 30,
          timeRatio: 0.33,
          iterations: 3,
          maxIterations: 20,
          iterationRatio: 0.15,
          filesModified: 5,
          filesExpected: 2,
          scopeCreepCount: 3,
          errorsEncountered: 0,
          consecutiveFailures: 0,
        },
        confidence: 0.8,
      };

      const result = await replanner.replan('task-1', reason);

      expect(result.success).toBe(true);
      expect(result.action).toBe('split');
      expect(result.newTasks).toBeDefined();
      expect(result.newTasks).toHaveLength(2);
    });

    it('should execute escalate action for blocking_issue', async () => {
      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const reason: ReplanReason = {
        trigger: 'blocking_issue',
        details: 'Consecutive failures exceeded threshold',
        metrics: {
          timeElapsed: 10,
          estimatedTime: 30,
          timeRatio: 0.33,
          iterations: 3,
          maxIterations: 20,
          iterationRatio: 0.15,
          filesModified: 1,
          filesExpected: 2,
          scopeCreepCount: 0,
          errorsEncountered: 5,
          consecutiveFailures: 6,
        },
        confidence: 0.9,
      };

      const result = await replanner.replan('task-1', reason);

      expect(result.success).toBe(true);
      expect(result.action).toBe('escalate');
      expect(result.message).toContain('escalated');
    });

    it('should fail replan for non-monitored task', async () => {
      const reason: ReplanReason = {
        trigger: 'time_exceeded',
        details: 'Time exceeded',
        metrics: {
          timeElapsed: 60,
          estimatedTime: 30,
          timeRatio: 2.0,
          iterations: 3,
          maxIterations: 20,
          iterationRatio: 0.15,
          filesModified: 1,
          filesExpected: 2,
          scopeCreepCount: 0,
          errorsEncountered: 0,
          consecutiveFailures: 0,
        },
        confidence: 0.8,
      };

      const result = await replanner.replan('non-existent', reason);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not being monitored');
    });

    it('should fail split when task cannot be split', async () => {
      const unsplittableTaskSplitter = {
        canSplit: vi.fn().mockReturnValue(false),
        split: vi.fn(),
        estimateSubtasks: vi.fn().mockReturnValue(0),
      };
      replanner = new DynamicReplanner(mockTriggers, unsplittableTaskSplitter);

      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const reason: ReplanReason = {
        trigger: 'scope_creep',
        details: 'Scope creep detected',
        metrics: {
          timeElapsed: 10,
          estimatedTime: 30,
          timeRatio: 0.33,
          iterations: 3,
          maxIterations: 20,
          iterationRatio: 0.15,
          filesModified: 5,
          filesExpected: 2,
          scopeCreepCount: 3,
          errorsEncountered: 0,
          consecutiveFailures: 0,
        },
        confidence: 0.8,
      };

      const result = await replanner.replan('task-1', reason);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be split');
    });
  });

  // ===========================================================================
  // Agent Request Tests
  // ===========================================================================

  describe('Agent Request Handling', () => {
    it('should handle agent replan request', async () => {
      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const request: AgentReplanRequest = {
        taskId: 'task-1',
        agentId: 'agent-1',
        reason: 'Task is more complex than expected',
        suggestion: 'Split into smaller parts',
        blockers: ['Type errors', 'Missing dependencies'],
        complexityDetails: 'Multiple interconnected components need updating',
      };

      const decision = await replanner.handleAgentRequest('task-1', request);

      expect(decision.shouldReplan).toBe(true);
      expect(decision.suggestedAction).not.toBe('continue');
    });

    it('should update context with agent feedback', async () => {
      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const request: AgentReplanRequest = {
        taskId: 'task-1',
        agentId: 'agent-1',
        reason: 'Need to split the task',
      };

      await replanner.handleAgentRequest('task-1', request);

      const tasks = replanner.getMonitoredTasks();
      expect(tasks[0].context.agentFeedback).toBe('Need to split the task');
    });

    it('should return no replan for non-existent task', async () => {
      const request: AgentReplanRequest = {
        taskId: 'non-existent',
        agentId: 'agent-1',
        reason: 'Some reason',
      };

      const decision = await replanner.handleAgentRequest('non-existent', request);

      expect(decision.shouldReplan).toBe(false);
    });

    it('should calculate higher confidence with more details', async () => {
      const context = createSampleContext();
      replanner.startMonitoring('task-1', context);

      const minimalRequest: AgentReplanRequest = {
        taskId: 'task-1',
        agentId: 'agent-1',
        reason: 'Need help',
      };

      const detailedRequest: AgentReplanRequest = {
        taskId: 'task-1',
        agentId: 'agent-1',
        reason: 'Complex task with multiple issues',
        blockers: ['Issue 1', 'Issue 2', 'Issue 3'],
        complexityDetails:
          'This task involves many interconnected systems that require careful coordination and extensive testing to ensure compatibility.',
        suggestion: 'Split into three separate tasks: setup, implementation, and testing',
      };

      replanner.startMonitoring('task-2', { ...context, taskId: 'task-2' });

      const minimalDecision = await replanner.handleAgentRequest('task-1', minimalRequest);
      const detailedDecision = await replanner.handleAgentRequest('task-2', detailedRequest);

      expect(detailedDecision.confidence).toBeGreaterThan(minimalDecision.confidence);
    });
  });

  // ===========================================================================
  // Threshold Configuration Tests
  // ===========================================================================

  describe('Threshold Configuration', () => {
    it('should use default thresholds', () => {
      const thresholds = replanner.getThresholds();

      expect(thresholds).toEqual(DEFAULT_TRIGGER_THRESHOLDS);
    });

    it('should accept custom thresholds in constructor', () => {
      const customReplanner = new DynamicReplanner(mockTriggers, mockTaskSplitter, {
        timeExceededRatio: 2.0,
        consecutiveFailures: 10,
      });

      const thresholds = customReplanner.getThresholds();

      expect(thresholds.timeExceededRatio).toBe(2.0);
      expect(thresholds.consecutiveFailures).toBe(10);
      // Defaults should remain for non-overridden values
      expect(thresholds.iterationsRatio).toBe(DEFAULT_TRIGGER_THRESHOLDS.iterationsRatio);
    });

    it('should update thresholds with setThresholds', () => {
      replanner.setThresholds({ timeExceededRatio: 3.0 });

      const thresholds = replanner.getThresholds();
      expect(thresholds.timeExceededRatio).toBe(3.0);
    });

    it('should pass thresholds to trigger evaluators', () => {
      replanner.setThresholds({ timeExceededRatio: 2.5 });

      const context = createSampleContext();
      replanner.evaluateAllTriggers(context);

      mockTriggers.forEach((trigger) => {
        expect(trigger.evaluate).toHaveBeenCalledWith(
          context,
          expect.objectContaining({ timeExceededRatio: 2.5 })
        );
      });
    });
  });

  // ===========================================================================
  // Event Emitter Tests
  // ===========================================================================

  describe('Event Emission', () => {
    it('should emit monitoring events', () => {
      const eventEmitter: ReplannerEventEmitter = {
        onMonitoringStarted: vi.fn(),
        onMonitoringStopped: vi.fn(),
      };

      const replannerWithEvents = new DynamicReplanner(
        mockTriggers,
        mockTaskSplitter,
        undefined,
        eventEmitter
      );

      replannerWithEvents.startMonitoring('task-1', createSampleContext());
      expect(eventEmitter.onMonitoringStarted).toHaveBeenCalledWith('task-1');

      replannerWithEvents.stopMonitoring('task-1');
      expect(eventEmitter.onMonitoringStopped).toHaveBeenCalledWith('task-1');
    });

    it('should emit trigger and decision events', () => {
      const eventEmitter: ReplannerEventEmitter = {
        onTriggerActivated: vi.fn(),
        onReplanDecision: vi.fn(),
      };

      const activeTrigger = createMockTrigger('blocking_issue', true, 0.9);
      const replannerWithEvents = new DynamicReplanner(
        [activeTrigger],
        mockTaskSplitter,
        undefined,
        eventEmitter
      );

      replannerWithEvents.startMonitoring('task-1', createSampleContext());
      replannerWithEvents.checkReplanningNeeded('task-1');

      expect(eventEmitter.onTriggerActivated).toHaveBeenCalledWith('task-1', 'blocking_issue');
      expect(eventEmitter.onReplanDecision).toHaveBeenCalled();
    });

    it('should emit replan executed events', async () => {
      const eventEmitter: ReplannerEventEmitter = {
        onReplanExecuted: vi.fn(),
      };

      const replannerWithEvents = new DynamicReplanner(
        mockTriggers,
        mockTaskSplitter,
        undefined,
        eventEmitter
      );

      replannerWithEvents.startMonitoring('task-1', createSampleContext());

      const reason: ReplanReason = {
        trigger: 'scope_creep',
        details: 'Test',
        metrics: {
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
        },
        confidence: 0.8,
      };

      await replannerWithEvents.replan('task-1', reason);

      expect(eventEmitter.onReplanExecuted).toHaveBeenCalledWith('task-1', expect.any(Object));
    });
  });

  // ===========================================================================
  // Factory Tests
  // ===========================================================================

  describe('Factory Function', () => {
    it('should create replanner with createDynamicReplanner', () => {
      const replanner = createDynamicReplanner(mockTriggers, mockTaskSplitter);

      expect(replanner).toBeInstanceOf(DynamicReplanner);
    });

    it('should accept optional parameters', () => {
      const eventEmitter: ReplannerEventEmitter = {
        onMonitoringStarted: vi.fn(),
      };

      const replanner = createDynamicReplanner(
        mockTriggers,
        mockTaskSplitter,
        { timeExceededRatio: 3.0 },
        eventEmitter
      );

      expect(replanner.getThresholds().timeExceededRatio).toBe(3.0);

      replanner.startMonitoring('task-1', createSampleContext());
      expect(eventEmitter.onMonitoringStarted).toHaveBeenCalled();
    });
  });
});
