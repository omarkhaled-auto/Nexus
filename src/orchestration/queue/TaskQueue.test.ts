// TaskQueue Tests - Phase 04-02
// RED: Write failing tests for TaskQueue

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from './TaskQueue';
import type { OrchestrationTask } from '../types';

/**
 * Helper to create a test task
 */
function createTask(
  id: string,
  overrides: Partial<OrchestrationTask> = {}
): OrchestrationTask {
  return {
    id,
    name: `Task ${id}`,
    description: `Description for task ${id}`,
    type: 'auto',
    size: 'small',
    estimatedMinutes: 15,
    dependsOn: [],
    status: 'pending',
    priority: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  describe('enqueue()', () => {
    it('should add task to queue', () => {
      const task = createTask('task-1');
      queue.enqueue(task);
      expect(queue.size()).toBe(1);
    });

    it('should associate task with wave if provided', () => {
      const task = createTask('task-1');
      queue.enqueue(task, 0);
      const tasks = queue.getByWave(0);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
    });

    it('should update task status to queued', () => {
      const task = createTask('task-1', { status: 'pending' });
      queue.enqueue(task);
      const peeked = queue.peek();
      expect(peeked?.status).toBe('queued');
    });
  });

  describe('dequeue()', () => {
    it('should return task with no dependencies first', () => {
      const task1 = createTask('task-1', { dependsOn: [] });
      const task2 = createTask('task-2', { dependsOn: ['task-1'] });
      queue.enqueue(task1);
      queue.enqueue(task2);

      const dequeued = queue.dequeue();
      expect(dequeued?.id).toBe('task-1');
    });

    it('should return null when dependencies are unmet', () => {
      const task = createTask('task-1', { dependsOn: ['task-0'] });
      queue.enqueue(task);

      const dequeued = queue.dequeue();
      expect(dequeued).toBeNull();
    });

    it('should return null for empty queue', () => {
      const dequeued = queue.dequeue();
      expect(dequeued).toBeNull();
    });

    it('should remove task from queue after dequeue', () => {
      const task = createTask('task-1');
      queue.enqueue(task);
      queue.dequeue();
      expect(queue.size()).toBe(0);
    });

    it('should update task status to assigned', () => {
      const task = createTask('task-1');
      queue.enqueue(task);
      const dequeued = queue.dequeue();
      expect(dequeued?.status).toBe('assigned');
    });
  });

  describe('peek()', () => {
    it('should return next task without removing', () => {
      const task = createTask('task-1');
      queue.enqueue(task);

      const peeked = queue.peek();
      expect(peeked?.id).toBe('task-1');
      expect(queue.size()).toBe(1);
    });

    it('should return null for empty queue', () => {
      const peeked = queue.peek();
      expect(peeked).toBeNull();
    });
  });

  describe('markComplete()', () => {
    it('should enable dependent task dequeue after completion', () => {
      const task1 = createTask('task-1', { dependsOn: [] });
      const task2 = createTask('task-2', { dependsOn: ['task-1'] });
      queue.enqueue(task1);
      queue.enqueue(task2);

      // Dequeue and complete task-1
      queue.dequeue();
      queue.markComplete('task-1');

      // Now task-2 should be ready
      const dequeued = queue.dequeue();
      expect(dequeued?.id).toBe('task-2');
    });

    it('should update completed task count', () => {
      const task = createTask('task-1');
      queue.enqueue(task);
      queue.dequeue();
      queue.markComplete('task-1');

      expect(queue.getCompletedCount()).toBe(1);
    });
  });

  describe('markFailed()', () => {
    it('should track failed task', () => {
      const task = createTask('task-1');
      queue.enqueue(task);
      queue.dequeue();
      queue.markFailed('task-1');

      expect(queue.getFailedCount()).toBe(1);
    });
  });

  describe('wave ordering', () => {
    it('should dequeue wave 0 tasks before wave 1 tasks', () => {
      const task0 = createTask('task-0');
      const task1 = createTask('task-1');

      // Add wave 1 task first, then wave 0
      queue.enqueue(task1, 1);
      queue.enqueue(task0, 0);

      const first = queue.dequeue();
      expect(first?.id).toBe('task-0');
    });

    it('should not dequeue wave 1 until wave 0 complete', () => {
      const task0 = createTask('task-0');
      const task1 = createTask('task-1');

      queue.enqueue(task0, 0);
      queue.enqueue(task1, 1);

      // Dequeue wave 0 task
      const first = queue.dequeue();
      expect(first?.id).toBe('task-0');

      // Wave 1 should not be ready yet
      const second = queue.dequeue();
      expect(second).toBeNull();

      // Complete wave 0
      queue.markComplete('task-0');

      // Now wave 1 should be ready
      const third = queue.dequeue();
      expect(third?.id).toBe('task-1');
    });
  });

  describe('priority ordering', () => {
    it('should dequeue higher priority (lower number) first within same wave', () => {
      const lowPriority = createTask('task-low', { priority: 5 });
      const highPriority = createTask('task-high', { priority: 1 });

      queue.enqueue(lowPriority, 0);
      queue.enqueue(highPriority, 0);

      const first = queue.dequeue();
      expect(first?.id).toBe('task-high');
    });

    it('should use createdAt as tiebreaker for same priority', () => {
      const older = createTask('task-older', {
        priority: 1,
        createdAt: new Date('2024-01-01'),
      });
      const newer = createTask('task-newer', {
        priority: 1,
        createdAt: new Date('2024-01-02'),
      });

      queue.enqueue(newer, 0);
      queue.enqueue(older, 0);

      const first = queue.dequeue();
      expect(first?.id).toBe('task-older');
    });
  });

  describe('getReadyTasks()', () => {
    it('should return all tasks whose dependencies are complete', () => {
      const task1 = createTask('task-1', { dependsOn: [] });
      const task2 = createTask('task-2', { dependsOn: [] });
      const task3 = createTask('task-3', { dependsOn: ['task-1'] });

      queue.enqueue(task1, 0);
      queue.enqueue(task2, 0);
      queue.enqueue(task3, 0);

      const ready = queue.getReadyTasks();
      expect(ready).toHaveLength(2);
      expect(ready.map(t => t.id).sort()).toEqual(['task-1', 'task-2']);
    });

    it('should return empty array when no tasks are ready', () => {
      const task = createTask('task-1', { dependsOn: ['task-0'] });
      queue.enqueue(task);

      const ready = queue.getReadyTasks();
      expect(ready).toHaveLength(0);
    });
  });

  describe('getByWave()', () => {
    it('should return tasks in specific wave', () => {
      const task0 = createTask('task-0');
      const task1 = createTask('task-1');
      const task2 = createTask('task-2');

      queue.enqueue(task0, 0);
      queue.enqueue(task1, 1);
      queue.enqueue(task2, 1);

      const wave1Tasks = queue.getByWave(1);
      expect(wave1Tasks).toHaveLength(2);
      expect(wave1Tasks.map(t => t.id).sort()).toEqual(['task-1', 'task-2']);
    });

    it('should return empty array for empty wave', () => {
      const tasks = queue.getByWave(99);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('size()', () => {
    it('should return correct count', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue(createTask('task-1'));
      expect(queue.size()).toBe(1);

      queue.enqueue(createTask('task-2'));
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should empty the queue', () => {
      queue.enqueue(createTask('task-1'));
      queue.enqueue(createTask('task-2'));
      expect(queue.size()).toBe(2);

      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.peek()).toBeNull();
    });

    it('should reset completed and failed counts', () => {
      queue.enqueue(createTask('task-1'));
      queue.dequeue();
      queue.markComplete('task-1');

      queue.clear();
      expect(queue.getCompletedCount()).toBe(0);
      expect(queue.getFailedCount()).toBe(0);
    });
  });
});
