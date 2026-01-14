// PlanningExecutionBridge Tests - Phase 04-03
// TDD RED: Failing tests for planning-to-execution connection

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlanningExecutionBridge, ExecutionHandle, ExecutionStatus } from './PlanningExecutionBridge';
import { EventBus } from '@/orchestration/events/EventBus';
import type { ITaskQueue, OrchestrationTask } from '@/orchestration/types';
import type { Wave, PlanningTask } from '@/planning/types';

// Helper to create mock tasks
const createMockTask = (id: string, waveId: number): PlanningTask => ({
  id,
  name: `Task ${id}`,
  description: `Description for ${id}`,
  type: 'feature',
  size: 'medium',
  estimatedMinutes: 20,
  dependsOn: [],
});

// Helper to create mock waves
const createMockWaves = (waveCounts: number[]): Wave[] => {
  let taskCounter = 0;
  return waveCounts.map((count, waveIndex) => ({
    id: waveIndex,
    tasks: Array.from({ length: count }, () => createMockTask(`task-${++taskCounter}`, waveIndex)),
    estimatedTime: 30,
    dependencies: waveIndex > 0 ? [waveIndex - 1] : [],
  }));
};

// Mock TaskQueue
const createMockTaskQueue = () => {
  const tasks = new Map<string, OrchestrationTask>();
  const completedTasks = new Set<string>();
  const failedTasks = new Set<string>();

  return {
    enqueue: vi.fn((task: OrchestrationTask, waveId?: number) => {
      const queuedTask = { ...task, waveId: waveId ?? task.waveId ?? 0, status: 'queued' as const };
      tasks.set(task.id, queuedTask);
    }),
    dequeue: vi.fn(() => {
      for (const [id, task] of tasks) {
        if (task.status === 'queued') {
          tasks.delete(id);
          return task;
        }
      }
      return null;
    }),
    markComplete: vi.fn((taskId: string) => {
      completedTasks.add(taskId);
      tasks.delete(taskId);
    }),
    markFailed: vi.fn((taskId: string) => {
      failedTasks.add(taskId);
      tasks.delete(taskId);
    }),
    size: vi.fn(() => tasks.size),
    getCompletedCount: vi.fn(() => completedTasks.size),
    getFailedCount: vi.fn(() => failedTasks.size),
    clear: vi.fn(() => {
      tasks.clear();
      completedTasks.clear();
      failedTasks.clear();
    }),
    // Helpers for testing
    _tasks: tasks,
    _completedTasks: completedTasks,
    _failedTasks: failedTasks,
  };
};

describe('PlanningExecutionBridge', () => {
  let bridge: PlanningExecutionBridge;
  let mockTaskQueue: ReturnType<typeof createMockTaskQueue>;
  let eventBus: EventBus;

  beforeEach(() => {
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
    mockTaskQueue = createMockTaskQueue();
    bridge = new PlanningExecutionBridge({
      taskQueue: mockTaskQueue as unknown as ITaskQueue,
      eventBus,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  // ============================================================================
  // submitPlan() Tests
  // ============================================================================

  describe('submitPlan()', () => {
    it('should queue all tasks from waves', () => {
      const waves = createMockWaves([3, 2, 1]); // 6 total tasks

      bridge.submitPlan(waves);

      // Verify all 6 tasks were enqueued
      expect(mockTaskQueue.enqueue).toHaveBeenCalledTimes(6);
    });

    it('should return valid execution handle', () => {
      const waves = createMockWaves([2, 2]);

      const handle = bridge.submitPlan(waves);

      expect(handle).toHaveProperty('id');
      expect(handle.id).toBeDefined();
      expect(typeof handle.id).toBe('string');
    });

    it('should queue tasks with correct wave IDs', () => {
      const waves = createMockWaves([2, 3]);

      bridge.submitPlan(waves);

      // First 2 tasks should be wave 0
      const firstCall = mockTaskQueue.enqueue.mock.calls[0];
      expect(firstCall[1]).toBe(0);

      // Tasks 3-5 should be wave 1
      const fourthCall = mockTaskQueue.enqueue.mock.calls[3];
      expect(fourthCall[1]).toBe(1);
    });

    it('should preserve task properties when queuing', () => {
      const waves = createMockWaves([1]);

      bridge.submitPlan(waves);

      const enqueuedTask = mockTaskQueue.enqueue.mock.calls[0][0];
      expect(enqueuedTask).toHaveProperty('id');
      expect(enqueuedTask).toHaveProperty('name');
      expect(enqueuedTask).toHaveProperty('description');
    });
  });

  // ============================================================================
  // getExecutionStatus() Tests
  // ============================================================================

  describe('getExecutionStatus()', () => {
    it('should return correct initial status', () => {
      const waves = createMockWaves([2, 2]);
      const handle = bridge.submitPlan(waves);

      const status = bridge.getExecutionStatus(handle.id);

      expect(status.currentWave).toBe(0);
      expect(status.totalWaves).toBe(2);
      expect(status.completedTasks).toBe(0);
      expect(status.totalTasks).toBe(4);
      expect(status.pendingTasks).toBe(4);
      expect(status.status).toBe('running');
    });

    it('should update completed tasks count', () => {
      const waves = createMockWaves([2]);
      const handle = bridge.submitPlan(waves);

      // Simulate task completion via event
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: {
          success: true,
          filesChanged: [],
          output: '',
          qaIterations: 1,
          duration: 100,
        },
      });

      const status = bridge.getExecutionStatus(handle.id);
      expect(status.completedTasks).toBe(1);
    });

    it('should return null for unknown handle ID', () => {
      const status = bridge.getExecutionStatus('unknown-handle');
      expect(status).toBeNull();
    });

    it('should track failed tasks', () => {
      const waves = createMockWaves([2]);
      const handle = bridge.submitPlan(waves);

      // Simulate task failure via event
      eventBus.emit('task:failed', {
        taskId: 'task-1',
        error: 'Test failure',
        iterations: 3,
        escalated: false,
      });

      const status = bridge.getExecutionStatus(handle.id);
      expect(status.failedTasks).toBe(1);
    });
  });

  // ============================================================================
  // onWaveComplete() Tests
  // ============================================================================

  describe('onWaveComplete()', () => {
    it('should fire callback after wave completes', () => {
      const waves = createMockWaves([2, 2]);
      const handle = bridge.submitPlan(waves);

      const callback = vi.fn();
      bridge.onWaveComplete(handle.id, callback);

      // Complete first wave tasks
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });
      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0); // Wave 0 completed
    });

    it('should return unsubscribe function', () => {
      const waves = createMockWaves([2]);
      const handle = bridge.submitPlan(waves);

      const callback = vi.fn();
      const unsubscribe = bridge.onWaveComplete(handle.id, callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop notifications after unsubscribe', () => {
      const waves = createMockWaves([2, 2]);
      const handle = bridge.submitPlan(waves);

      const callback = vi.fn();
      const unsubscribe = bridge.onWaveComplete(handle.id, callback);

      // Complete first wave
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });
      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      // Complete second wave
      eventBus.emit('task:completed', {
        taskId: 'task-3',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });
      eventBus.emit('task:completed', {
        taskId: 'task-4',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      // Should still be 1 (no additional calls after unsubscribe)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // onPlanComplete() Tests
  // ============================================================================

  describe('onPlanComplete()', () => {
    it('should fire callback after all waves complete', () => {
      const waves = createMockWaves([1, 1]);
      const handle = bridge.submitPlan(waves);

      const callback = vi.fn();
      bridge.onPlanComplete(handle.id, callback);

      // Complete both tasks
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });
      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const waves = createMockWaves([1]);
      const handle = bridge.submitPlan(waves);

      const callback = vi.fn();
      const unsubscribe = bridge.onPlanComplete(handle.id, callback);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  // ============================================================================
  // abort() Tests
  // ============================================================================

  describe('abort()', () => {
    it('should mark execution as aborted', () => {
      const waves = createMockWaves([2, 2]);
      const handle = bridge.submitPlan(waves);

      bridge.abort(handle.id);

      const status = bridge.getExecutionStatus(handle.id);
      expect(status?.status).toBe('aborted');
    });

    it('should stop wave/plan complete callbacks after abort', () => {
      const waves = createMockWaves([2]);
      const handle = bridge.submitPlan(waves);

      const waveCallback = vi.fn();
      const planCallback = vi.fn();
      bridge.onWaveComplete(handle.id, waveCallback);
      bridge.onPlanComplete(handle.id, planCallback);

      bridge.abort(handle.id);

      // Complete tasks after abort
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });
      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      // Callbacks should not fire after abort
      expect(waveCallback).not.toHaveBeenCalled();
      expect(planCallback).not.toHaveBeenCalled();
    });

    it('should silently handle aborting unknown handle', () => {
      expect(() => bridge.abort('unknown-handle')).not.toThrow();
    });
  });

  // ============================================================================
  // Multiple Plans Tests
  // ============================================================================

  describe('multiple plans', () => {
    it('should track multiple plans independently', () => {
      const waves1 = createMockWaves([2]);
      const waves2 = createMockWaves([3]);

      const handle1 = bridge.submitPlan(waves1);
      const handle2 = bridge.submitPlan(waves2);

      expect(handle1.id).not.toBe(handle2.id);

      const status1 = bridge.getExecutionStatus(handle1.id);
      const status2 = bridge.getExecutionStatus(handle2.id);

      expect(status1?.totalTasks).toBe(2);
      expect(status2?.totalTasks).toBe(3);
    });

    it('should maintain correct task completion per plan', () => {
      // Create waves with distinct task IDs
      const waves1: Wave[] = [{
        id: 0,
        tasks: [createMockTask('plan1-task-1', 0)],
        estimatedTime: 20,
        dependencies: [],
      }];
      const waves2: Wave[] = [{
        id: 0,
        tasks: [createMockTask('plan2-task-1', 0)],
        estimatedTime: 20,
        dependencies: [],
      }];

      const handle1 = bridge.submitPlan(waves1);
      const handle2 = bridge.submitPlan(waves2);

      // Complete task from plan 1
      eventBus.emit('task:completed', {
        taskId: 'plan1-task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      const status1 = bridge.getExecutionStatus(handle1.id);
      const status2 = bridge.getExecutionStatus(handle2.id);

      expect(status1?.completedTasks).toBe(1);
      expect(status2?.completedTasks).toBe(0);
    });
  });

  // ============================================================================
  // Wave Ordering Tests
  // ============================================================================

  describe('wave ordering', () => {
    it('should advance current wave after completion', () => {
      const waves = createMockWaves([1, 1, 1]);
      const handle = bridge.submitPlan(waves);

      // Initial wave
      expect(bridge.getExecutionStatus(handle.id)?.currentWave).toBe(0);

      // Complete wave 0
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(bridge.getExecutionStatus(handle.id)?.currentWave).toBe(1);

      // Complete wave 1
      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(bridge.getExecutionStatus(handle.id)?.currentWave).toBe(2);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should handle empty waves gracefully', () => {
      const waves: Wave[] = [];

      const handle = bridge.submitPlan(waves);
      const status = bridge.getExecutionStatus(handle.id);

      expect(status?.totalTasks).toBe(0);
      expect(status?.status).toBe('completed'); // Nothing to do = completed
    });

    it('should continue tracking after task failures', () => {
      const waves = createMockWaves([2]);
      const handle = bridge.submitPlan(waves);

      eventBus.emit('task:failed', {
        taskId: 'task-1',
        error: 'Failed',
        iterations: 3,
        escalated: false,
      });

      eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      const status = bridge.getExecutionStatus(handle.id);
      expect(status?.completedTasks).toBe(1);
      expect(status?.failedTasks).toBe(1);
    });
  });

  // ============================================================================
  // isComplete() Tests
  // ============================================================================

  describe('isComplete()', () => {
    it('should return true when all tasks completed', () => {
      const waves = createMockWaves([1]);
      const handle = bridge.submitPlan(waves);

      expect(bridge.isComplete(handle.id)).toBe(false);

      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: { success: true, filesChanged: [], output: '', qaIterations: 1, duration: 100 },
      });

      expect(bridge.isComplete(handle.id)).toBe(true);
    });

    it('should return false for unknown handle', () => {
      expect(bridge.isComplete('unknown')).toBe(false);
    });
  });
});
