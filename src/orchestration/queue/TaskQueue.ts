// TaskQueue - Priority Queue with Wave Awareness
// Phase 04-02: Full implementation

import type { OrchestrationTask, ITaskQueue } from '../types';

/**
 * TaskQueue manages task scheduling with dependency and wave awareness.
 *
 * Features:
 * - Wave-based scheduling (wave N completes before wave N+1 can start)
 * - Priority ordering within waves (lower priority number = higher priority)
 * - Dependency tracking and resolution (task only ready when all dependencies complete)
 * - CreatedAt tiebreaker for same priority tasks
 */
export class TaskQueue implements ITaskQueue {
  /** Main task storage: taskId -> task */
  private tasks: Map<string, OrchestrationTask> = new Map();

  /** Tasks by wave: waveId -> Set<taskId> */
  private waveIndex: Map<number, Set<string>> = new Map();

  /** Completed task IDs for dependency resolution */
  private completedTaskIds: Set<string> = new Set();

  /** Failed task IDs */
  private failedTaskIds: Set<string> = new Set();

  /** Current active wave being processed */
  private currentWave = 0;

  /**
   * Add task to queue with optional wave assignment
   */
  enqueue(task: OrchestrationTask, waveId?: number): void {
    // Create a copy with updated status
    const queuedTask: OrchestrationTask = {
      ...task,
      status: 'queued',
      waveId: waveId ?? task.waveId ?? 0,
    };

    // Store task
    this.tasks.set(queuedTask.id, queuedTask);

    // Index by wave
    const wave = queuedTask.waveId ?? 0;
    if (!this.waveIndex.has(wave)) {
      this.waveIndex.set(wave, new Set());
    }
    const waveSet = this.waveIndex.get(wave);
    if (waveSet) waveSet.add(queuedTask.id);
  }

  /**
   * Get and remove next ready task
   * Returns undefined if no tasks are ready (dependencies unmet or queue empty)
   */
  dequeue(): OrchestrationTask | undefined {
    const readyTask = this.findNextReadyTask();
    if (!readyTask) {
      return undefined;
    }

    // Update status to assigned
    readyTask.status = 'assigned';

    // Remove from queue
    this.tasks.delete(readyTask.id);
    const waveId = readyTask.waveId ?? 0;
    this.waveIndex.get(waveId)?.delete(readyTask.id);

    return readyTask;
  }

  /**
   * View next ready task without removing
   */
  peek(): OrchestrationTask | null {
    return this.findNextReadyTask();
  }

  /**
   * Mark task as complete, enabling dependent tasks
   */
  markComplete(taskId: string): void {
    this.completedTaskIds.add(taskId);
    this.updateCurrentWave();
  }

  /**
   * Mark task as failed
   */
  markFailed(taskId: string): void {
    this.failedTaskIds.add(taskId);
    this.updateCurrentWave();
  }

  /**
   * Get all tasks whose dependencies are satisfied
   */
  getReadyTasks(): OrchestrationTask[] {
    const ready: OrchestrationTask[] = [];

    for (const task of this.tasks.values()) {
      if (this.isTaskReady(task)) {
        ready.push(task);
      }
    }

    return this.sortTasks(ready);
  }

  /**
   * Get all tasks in a specific wave
   */
  getByWave(waveId: number): OrchestrationTask[] {
    const taskIds = this.waveIndex.get(waveId);
    if (!taskIds || taskIds.size === 0) {
      return [];
    }

    const tasks: OrchestrationTask[] = [];
    for (const id of taskIds) {
      const task = this.tasks.get(id);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Get number of tasks in queue
   */
  size(): number {
    return this.tasks.size;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.tasks.size === 0;
  }

  /**
   * Clear all tasks and reset state
   */
  clear(): void {
    this.tasks.clear();
    this.waveIndex.clear();
    this.completedTaskIds.clear();
    this.failedTaskIds.clear();
    this.currentWave = 0;
  }

  /**
   * Get count of completed tasks
   */
  getCompletedCount(): number {
    return this.completedTaskIds.size;
  }

  /**
   * Get count of failed tasks
   */
  getFailedCount(): number {
    return this.failedTaskIds.size;
  }

  /**
   * Find the next ready task respecting wave ordering and priorities
   */
  private findNextReadyTask(): OrchestrationTask | null {
    // Get tasks in current wave that are ready
    const readyTasks = this.getReadyTasks();
    if (readyTasks.length === 0) {
      return null;
    }

    // Return highest priority (already sorted)
    return readyTasks[0] ?? null;
  }

  /**
   * Check if a task is ready to be dequeued
   */
  private isTaskReady(task: OrchestrationTask): boolean {
    const taskWave = task.waveId ?? 0;

    // Task must be in current or earlier wave
    if (taskWave > this.currentWave) {
      return false;
    }

    // All dependencies must be complete
    for (const depId of task.dependsOn) {
      if (!this.completedTaskIds.has(depId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sort tasks by wave, priority, then createdAt
   */
  private sortTasks(tasks: OrchestrationTask[]): OrchestrationTask[] {
    return tasks.sort((a, b) => {
      // First by wave (lower wave first)
      const waveA = a.waveId ?? 0;
      const waveB = b.waveId ?? 0;
      if (waveA !== waveB) {
        return waveA - waveB;
      }

      // Then by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Then by createdAt (older first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Update current wave if all tasks in current wave are complete
   */
  private updateCurrentWave(): void {
    // Check if current wave has any remaining tasks
    const currentWaveTasks = this.waveIndex.get(this.currentWave);
    if (currentWaveTasks && currentWaveTasks.size > 0) {
      // Still have tasks in current wave
      return;
    }

    // Find next wave with tasks
    const waves = Array.from(this.waveIndex.keys()).sort((a, b) => a - b);
    for (const wave of waves) {
      if (wave > this.currentWave) {
        const waveTasks = this.waveIndex.get(wave);
        if (waveTasks && waveTasks.size > 0) {
          this.currentWave = wave;
          return;
        }
      }
    }
  }
}
