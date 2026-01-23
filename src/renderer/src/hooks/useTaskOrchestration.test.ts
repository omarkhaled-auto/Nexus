/**
 * Task Orchestration Hook Tests
 *
 * Unit tests for the dependency resolution algorithm, execution order calculation,
 * and orchestration store functions.
 *
 * Phase 24: Testing and Verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateExecutionOrder,
  getBlockingTasks,
  getNextExecutableTask,
  areAllTasksComplete,
  useExecutionStore,
} from './useTaskOrchestration';
import type { KanbanTask } from '@/types/execution';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Factory function to create mock KanbanTask objects for testing.
 */
function createMockTask(overrides: Partial<KanbanTask> & { id: string }): KanbanTask {
  const defaults: KanbanTask = {
    id: overrides.id,
    featureId: 'feature-1',
    projectId: 'project-1',
    title: `Task ${overrides.id}`,
    description: `Description for task ${overrides.id}`,
    acceptanceCriteria: ['Criteria 1'],
    priority: 'medium',
    complexity: 'moderate',
    estimatedMinutes: 30,
    dependsOn: [],
    blockedBy: [],
    status: 'pending',
    assignedAgent: null,
    progress: 0,
    startedAt: null,
    completedAt: null,
    actualMinutes: null,
    filesToCreate: [],
    filesToModify: [],
    filesCreated: [],
    filesModified: [],
    logs: [],
    errors: [],
    retryCount: 0,
    maxRetries: 3,
    qaIterations: 0,
    maxQAIterations: 3,
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...defaults, ...overrides };
}

// ============================================================================
// calculateExecutionOrder Tests
// ============================================================================

describe('calculateExecutionOrder', () => {
  it('should return empty array for empty input', () => {
    const result = calculateExecutionOrder([]);
    expect(result).toEqual([]);
  });

  it('should return single task for single task input', () => {
    const task = createMockTask({ id: 'task-1' });
    const result = calculateExecutionOrder([task]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-1');
  });

  it('should return tasks in dependency order - simple chain', () => {
    // A -> B -> C (A must complete before B, B before C)
    const taskA = createMockTask({ id: 'A', dependsOn: [] });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });
    const taskC = createMockTask({ id: 'C', dependsOn: ['B'] });

    const result = calculateExecutionOrder([taskC, taskA, taskB]); // Input order shuffled
    const ids = result.map((t) => t.id);

    // A should come before B, B should come before C
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'));
  });

  it('should handle multiple roots (parallel starting points)', () => {
    // A and B can both start, C depends on both
    const taskA = createMockTask({ id: 'A', dependsOn: [] });
    const taskB = createMockTask({ id: 'B', dependsOn: [] });
    const taskC = createMockTask({ id: 'C', dependsOn: ['A', 'B'] });

    const result = calculateExecutionOrder([taskC, taskA, taskB]);
    const ids = result.map((t) => t.id);

    // A and B should both come before C
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('C'));
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'));
  });

  it('should sort by priority within same dependency level', () => {
    // All tasks have no dependencies, should sort by priority
    const taskLow = createMockTask({ id: 'low', priority: 'low' });
    const taskHigh = createMockTask({ id: 'high', priority: 'high' });
    const taskCritical = createMockTask({ id: 'critical', priority: 'critical' });
    const taskMedium = createMockTask({ id: 'medium', priority: 'medium' });

    const result = calculateExecutionOrder([taskLow, taskHigh, taskCritical, taskMedium]);
    const ids = result.map((t) => t.id);

    // Critical first, then high, then medium, then low
    expect(ids[0]).toBe('critical');
    expect(ids[1]).toBe('high');
    expect(ids[2]).toBe('medium');
    expect(ids[3]).toBe('low');
  });

  it('should handle diamond dependency pattern', () => {
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    const taskA = createMockTask({ id: 'A', dependsOn: [] });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });
    const taskC = createMockTask({ id: 'C', dependsOn: ['A'] });
    const taskD = createMockTask({ id: 'D', dependsOn: ['B', 'C'] });

    const result = calculateExecutionOrder([taskD, taskC, taskB, taskA]);
    const ids = result.map((t) => t.id);

    // A must come first
    expect(ids[0]).toBe('A');
    // B and C must come before D
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'));
    expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('D'));
    // D must come last
    expect(ids[3]).toBe('D');
  });

  it('should throw error on circular dependency', () => {
    // A -> B -> C -> A (circular)
    const taskA = createMockTask({ id: 'A', dependsOn: ['C'] });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });
    const taskC = createMockTask({ id: 'C', dependsOn: ['B'] });

    expect(() => calculateExecutionOrder([taskA, taskB, taskC])).toThrow('Circular dependency');
  });

  it('should ignore dependencies on non-existent tasks', () => {
    // Task depends on a task not in the list
    const taskA = createMockTask({ id: 'A', dependsOn: ['nonexistent'] });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });

    const result = calculateExecutionOrder([taskA, taskB]);
    const ids = result.map((t) => t.id);

    // A should come first (dependency on nonexistent is ignored)
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
  });

  it('should handle complex multi-level dependencies', () => {
    // Level 0: A, B
    // Level 1: C (depends on A), D (depends on B)
    // Level 2: E (depends on C, D)
    // Level 3: F (depends on E)
    const taskA = createMockTask({ id: 'A', priority: 'high' });
    const taskB = createMockTask({ id: 'B', priority: 'medium' });
    const taskC = createMockTask({ id: 'C', dependsOn: ['A'] });
    const taskD = createMockTask({ id: 'D', dependsOn: ['B'] });
    const taskE = createMockTask({ id: 'E', dependsOn: ['C', 'D'] });
    const taskF = createMockTask({ id: 'F', dependsOn: ['E'] });

    const result = calculateExecutionOrder([taskF, taskE, taskD, taskC, taskB, taskA]);
    const ids = result.map((t) => t.id);

    // Verify level ordering
    // Level 0
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('C'));
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'));
    // Level 1
    expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('E'));
    expect(ids.indexOf('D')).toBeLessThan(ids.indexOf('E'));
    // Level 2
    expect(ids.indexOf('E')).toBeLessThan(ids.indexOf('F'));
    // Level 0 priority: A (high) should come before B (medium)
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
  });
});

// ============================================================================
// getBlockingTasks Tests
// ============================================================================

describe('getBlockingTasks', () => {
  it('should return empty array for task with no dependencies', () => {
    const task = createMockTask({ id: 'A' });
    const result = getBlockingTasks('A', [task]);
    expect(result).toEqual([]);
  });

  it('should return blocking tasks when dependencies are not completed', () => {
    const taskA = createMockTask({ id: 'A', status: 'pending' });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });

    const result = getBlockingTasks('B', [taskA, taskB]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('A');
  });

  it('should not return completed dependencies as blocking', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });

    const result = getBlockingTasks('B', [taskA, taskB]);
    expect(result).toHaveLength(0);
  });

  it('should return only uncompleted blocking tasks from multiple dependencies', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'in-progress' });
    const taskC = createMockTask({ id: 'C', status: 'pending' });
    const taskD = createMockTask({ id: 'D', dependsOn: ['A', 'B', 'C'] });

    const result = getBlockingTasks('D', [taskA, taskB, taskC, taskD]);
    expect(result).toHaveLength(2);
    const blockingIds = result.map((t) => t.id);
    expect(blockingIds).toContain('B');
    expect(blockingIds).toContain('C');
    expect(blockingIds).not.toContain('A');
  });

  it('should return empty array for non-existent task', () => {
    const task = createMockTask({ id: 'A' });
    const result = getBlockingTasks('nonexistent', [task]);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// getNextExecutableTask Tests
// ============================================================================

describe('getNextExecutableTask', () => {
  it('should return null for empty task list', () => {
    const result = getNextExecutableTask([]);
    expect(result).toBeNull();
  });

  it('should return first task when no dependencies', () => {
    const task = createMockTask({ id: 'A', priority: 'high' });
    const result = getNextExecutableTask([task]);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('A');
  });

  it('should return highest priority task among executable tasks', () => {
    const taskLow = createMockTask({ id: 'low', priority: 'low' });
    const taskHigh = createMockTask({ id: 'high', priority: 'high' });

    const result = getNextExecutableTask([taskLow, taskHigh]);
    expect(result?.id).toBe('high');
  });

  it('should skip tasks with incomplete dependencies', () => {
    const taskA = createMockTask({ id: 'A', status: 'pending' });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'], priority: 'critical' });

    const result = getNextExecutableTask([taskA, taskB]);
    // A should be returned, not B (despite B having higher priority)
    expect(result?.id).toBe('A');
  });

  it('should return task whose dependencies are all completed', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', dependsOn: ['A'] });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result?.id).toBe('B');
  });

  it('should skip completed tasks', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'pending' });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result?.id).toBe('B');
  });

  it('should skip in-progress tasks', () => {
    const taskA = createMockTask({ id: 'A', status: 'in-progress' });
    const taskB = createMockTask({ id: 'B', status: 'pending' });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result?.id).toBe('B');
  });

  it('should skip failed tasks', () => {
    const taskA = createMockTask({ id: 'A', status: 'failed' });
    const taskB = createMockTask({ id: 'B', status: 'pending' });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result?.id).toBe('B');
  });

  it('should skip cancelled tasks', () => {
    const taskA = createMockTask({ id: 'A', status: 'cancelled' });
    const taskB = createMockTask({ id: 'B', status: 'pending' });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result?.id).toBe('B');
  });

  it('should return null when all tasks are completed', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'completed' });

    const result = getNextExecutableTask([taskA, taskB]);
    expect(result).toBeNull();
  });

  it('should return null when all executable tasks are in progress', () => {
    const taskA = createMockTask({ id: 'A', status: 'in-progress' });

    const result = getNextExecutableTask([taskA]);
    expect(result).toBeNull();
  });
});

// ============================================================================
// areAllTasksComplete Tests
// ============================================================================

describe('areAllTasksComplete', () => {
  it('should return true for empty task list', () => {
    const result = areAllTasksComplete([]);
    expect(result).toBe(true);
  });

  it('should return true when all tasks are completed', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'completed' });

    const result = areAllTasksComplete([taskA, taskB]);
    expect(result).toBe(true);
  });

  it('should return true when all tasks are completed, cancelled, or failed', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'cancelled' });
    const taskC = createMockTask({ id: 'C', status: 'failed' });

    const result = areAllTasksComplete([taskA, taskB, taskC]);
    expect(result).toBe(true);
  });

  it('should return false when some tasks are pending', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'pending' });

    const result = areAllTasksComplete([taskA, taskB]);
    expect(result).toBe(false);
  });

  it('should return false when some tasks are in progress', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'in-progress' });

    const result = areAllTasksComplete([taskA, taskB]);
    expect(result).toBe(false);
  });

  it('should return false when some tasks are blocked', () => {
    const taskA = createMockTask({ id: 'A', status: 'completed' });
    const taskB = createMockTask({ id: 'B', status: 'blocked' });

    const result = areAllTasksComplete([taskA, taskB]);
    expect(result).toBe(false);
  });
});

// ============================================================================
// Zustand Store Tests
// ============================================================================

describe('useExecutionStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useExecutionStore.setState({
      status: 'idle',
      projectId: null,
      currentTaskId: null,
      queuedTaskIds: [],
      completedTaskIds: [],
      failedTaskIds: [],
      blockedTaskIds: [],
      startedAt: null,
      pausedAt: null,
      completedAt: null,
      totalTasks: 0,
      completedCount: 0,
      failedCount: 0,
      inProgressCount: 0,
      overallProgress: 0,
      estimatedRemainingMinutes: null,
      errors: [],
      executionHistory: [],
      tasks: [],
    });
  });

  describe('setTasks', () => {
    it('should set tasks and update totalTasks', () => {
      const tasks = [
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
      ];

      useExecutionStore.getState().setTasks(tasks);

      const state = useExecutionStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.totalTasks).toBe(2);
    });
  });

  describe('updateTask', () => {
    it('should update a specific task', () => {
      // Use an old timestamp to ensure it differs from the update
      const oldTimestamp = new Date(Date.now() - 1000).toISOString();
      const task = createMockTask({ id: 'A', status: 'pending', updatedAt: oldTimestamp });
      useExecutionStore.getState().setTasks([task]);

      useExecutionStore.getState().updateTask('A', { status: 'in-progress' });

      const state = useExecutionStore.getState();
      expect(state.tasks[0].status).toBe('in-progress');
      expect(state.tasks[0].updatedAt).not.toBe(oldTimestamp);
    });
  });

  describe('start', () => {
    it('should initialize execution with tasks', () => {
      const tasks = [createMockTask({ id: 'A' })];

      useExecutionStore.getState().start('project-1', tasks);

      const state = useExecutionStore.getState();
      expect(state.status).toBe('running');
      expect(state.projectId).toBe('project-1');
      expect(state.tasks).toHaveLength(1);
      expect(state.totalTasks).toBe(1);
      expect(state.startedAt).not.toBeNull();
      expect(state.executionHistory).toHaveLength(1);
      expect(state.executionHistory[0].event).toBe('started');
    });
  });

  describe('pause', () => {
    it('should pause execution and record in history', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);

      useExecutionStore.getState().pause();

      const state = useExecutionStore.getState();
      expect(state.status).toBe('paused');
      expect(state.pausedAt).not.toBeNull();
      expect(state.executionHistory).toHaveLength(2);
      expect(state.executionHistory[1].event).toBe('paused');
    });
  });

  describe('resume', () => {
    it('should resume execution and clear pausedAt', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);
      useExecutionStore.getState().pause();

      useExecutionStore.getState().resume();

      const state = useExecutionStore.getState();
      expect(state.status).toBe('running');
      expect(state.pausedAt).toBeNull();
      expect(state.executionHistory).toHaveLength(3);
      expect(state.executionHistory[2].event).toBe('resumed');
    });
  });

  describe('stop', () => {
    it('should stop execution and clear queued tasks', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);
      useExecutionStore.getState().queueTask('A');

      useExecutionStore.getState().stop();

      const state = useExecutionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentTaskId).toBeNull();
      expect(state.queuedTaskIds).toHaveLength(0);
      expect(state.executionHistory).toHaveLength(2);
      expect(state.executionHistory[1].event).toBe('stopped');
    });
  });

  describe('completeTask', () => {
    it('should add task to completed list and update progress', () => {
      const tasks = [
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
      ];
      useExecutionStore.getState().start('project-1', tasks);
      useExecutionStore.getState().setCurrentTask('A');

      useExecutionStore.getState().completeTask('A');

      const state = useExecutionStore.getState();
      expect(state.completedTaskIds).toContain('A');
      expect(state.completedCount).toBe(1);
      expect(state.overallProgress).toBe(50); // 1/2 = 50%
      expect(state.currentTaskId).toBeNull(); // Cleared because it was the current task
    });

    it('should not duplicate completed task IDs', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);

      useExecutionStore.getState().completeTask('A');
      useExecutionStore.getState().completeTask('A');

      const state = useExecutionStore.getState();
      expect(state.completedTaskIds).toHaveLength(1);
    });
  });

  describe('failTask', () => {
    it('should add task to failed list and record error', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);
      useExecutionStore.getState().setCurrentTask('A');

      useExecutionStore.getState().failTask('A', 'Test error message');

      const state = useExecutionStore.getState();
      expect(state.failedTaskIds).toContain('A');
      expect(state.failedCount).toBe(1);
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].message).toBe('Test error message');
      expect(state.errors[0].taskId).toBe('A');
      expect(state.currentTaskId).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const tasks = [createMockTask({ id: 'A' })];
      useExecutionStore.getState().start('project-1', tasks);
      useExecutionStore.getState().completeTask('A');

      useExecutionStore.getState().reset();

      const state = useExecutionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.tasks).toHaveLength(0);
      expect(state.completedTaskIds).toHaveLength(0);
      expect(state.executionHistory).toHaveLength(0);
    });
  });
});
