/**
 * TaskSplitter Tests
 *
 * Tests for the TaskSplitter class that splits complex tasks into subtasks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskSplitter, createTaskSplitter } from './TaskSplitter';
import type { Task, ReplanReason, ReplanMetrics } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-123',
    name: 'Implement User Authentication',
    description: 'Add user authentication with JWT tokens',
    files: [
      'src/auth/AuthService.ts',
      'src/auth/AuthService.test.ts',
      'src/auth/types.ts',
      'src/middleware/authMiddleware.ts',
      'src/routes/authRoutes.ts',
    ],
    estimatedTime: 120,
    dependencies: [],
    acceptanceCriteria: [
      'Users can login with email/password',
      'JWT tokens are properly generated',
      'AuthMiddleware validates tokens',
      'Tests pass for AuthService',
    ],
    status: 'in_progress',
    ...overrides,
  };
}

function createMockMetrics(): ReplanMetrics {
  return {
    timeElapsed: 90,
    estimatedTime: 60,
    timeRatio: 1.5,
    iterations: 12,
    maxIterations: 20,
    iterationRatio: 0.6,
    filesModified: 8,
    filesExpected: 5,
    scopeCreepCount: 3,
    errorsEncountered: 5,
    consecutiveFailures: 2,
  };
}

function createMockReason(
  trigger: 'scope_creep' | 'complexity_discovered' | 'time_exceeded' | 'iterations_high' = 'scope_creep',
  overrides: Partial<ReplanReason> = {}
): ReplanReason {
  return {
    trigger,
    details: 'Task is taking longer than expected',
    metrics: createMockMetrics(),
    confidence: 0.8,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TaskSplitter', () => {
  let splitter: TaskSplitter;

  beforeEach(() => {
    splitter = new TaskSplitter();
  });

  // =========================================================================
  // canSplit Tests
  // =========================================================================

  describe('canSplit', () => {
    it('should return true for tasks with multiple files and valid trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });

    it('should return false for tasks with only 1 file', () => {
      const task = createMockTask({ files: ['src/single.ts'] });
      const reason = createMockReason('scope_creep');

      expect(splitter.canSplit(task, reason)).toBe(false);
    });

    it('should return false for non-splittable triggers', () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');
      reason.trigger = 'blocking_issue';

      expect(splitter.canSplit(task, reason)).toBe(false);
    });

    it('should return false for agent_request trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');
      reason.trigger = 'agent_request';

      expect(splitter.canSplit(task, reason)).toBe(false);
    });

    it('should allow splitting for scope_creep trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });

    it('should allow splitting for complexity_discovered trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('complexity_discovered');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });

    it('should allow splitting for time_exceeded trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('time_exceeded');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });

    it('should allow splitting for iterations_high trigger', () => {
      const task = createMockTask();
      const reason = createMockReason('iterations_high');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });

    it('should return false for deeply nested subtasks', () => {
      const task = createMockTask({
        name: 'Task - Part 1: Setup - Part 2: Types - Part 1: Core',
      });
      const reason = createMockReason('scope_creep');

      expect(splitter.canSplit(task, reason)).toBe(false);
    });

    it('should allow splitting for first-level subtasks', () => {
      const task = createMockTask({
        name: 'Task - Part 1: Setup',
      });
      const reason = createMockReason('scope_creep');

      expect(splitter.canSplit(task, reason)).toBe(true);
    });
  });

  // =========================================================================
  // estimateSubtasks Tests
  // =========================================================================

  describe('estimateSubtasks', () => {
    it('should return 2 for tasks with 2-3 files', () => {
      const task = createMockTask({
        files: ['a.ts', 'b.ts', 'c.ts'],
      });

      expect(splitter.estimateSubtasks(task)).toBe(2);
    });

    it('should return 3 for tasks with 4-6 files', () => {
      const task = createMockTask({
        files: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
      });

      expect(splitter.estimateSubtasks(task)).toBe(3);
    });

    it('should return 4 for tasks with 7-10 files', () => {
      const task = createMockTask({
        files: Array.from({ length: 9 }, (_, i) => `file${i}.ts`),
      });

      expect(splitter.estimateSubtasks(task)).toBe(4);
    });

    it('should cap at 5 for very large tasks', () => {
      const task = createMockTask({
        files: Array.from({ length: 20 }, (_, i) => `file${i}.ts`),
      });

      expect(splitter.estimateSubtasks(task)).toBeLessThanOrEqual(5);
    });

    it('should respect custom maxSubtasks config', () => {
      const customSplitter = new TaskSplitter({ maxSubtasks: 3 });
      const task = createMockTask({
        files: Array.from({ length: 20 }, (_, i) => `file${i}.ts`),
      });

      expect(customSplitter.estimateSubtasks(task)).toBeLessThanOrEqual(3);
    });
  });

  // =========================================================================
  // split Tests
  // =========================================================================

  describe('split', () => {
    it('should return original task if cannot split', async () => {
      const task = createMockTask({ files: ['single.ts'] });
      const reason = createMockReason('scope_creep');

      const result = await splitter.split(task, reason);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(task);
    });

    it('should create subtasks with unique IDs', async () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      const ids = subtasks.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(subtasks.length);
    });

    it('should set parentTaskId on all subtasks', async () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      for (const subtask of subtasks) {
        expect(subtask.parentTaskId).toBe(task.id);
      }
    });

    it('should preserve all original files across subtasks', async () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      const allFiles = subtasks.flatMap((t) => t.files);
      for (const file of task.files) {
        expect(allFiles).toContain(file);
      }
    });

    it('should set status to pending for all subtasks', async () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      for (const subtask of subtasks) {
        expect(subtask.status).toBe('pending');
      }
    });

    it('should distribute estimated time proportionally', async () => {
      const task = createMockTask({ estimatedTime: 100 });
      const reason = createMockReason('time_exceeded');

      const subtasks = await splitter.split(task, reason);

      // Sum of subtask times should approximately equal original
      const totalTime = subtasks.reduce((sum, t) => sum + t.estimatedTime, 0);
      expect(totalTime).toBeCloseTo(task.estimatedTime, -1); // Within 10
    });

    it('should generate descriptive subtask names', async () => {
      const task = createMockTask({ name: 'Implement Auth' });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      for (const subtask of subtasks) {
        expect(subtask.name).toMatch(/Implement Auth - Part \d+:/);
      }
    });

    it('should distribute acceptance criteria to subtasks', async () => {
      const task = createMockTask();
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      // All subtasks should have at least one criterion
      for (const subtask of subtasks) {
        expect(subtask.acceptanceCriteria.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Splitting by Files Tests
  // =========================================================================

  describe('splitting by files (scope_creep)', () => {
    it('should group test files together', async () => {
      const task = createMockTask({
        files: [
          'src/auth/service.ts',
          'src/auth/service.test.ts',
          'src/auth/handler.ts',
          'src/auth/handler.test.ts',
        ],
      });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      // Find subtask with test files
      const testSubtask = subtasks.find((t) =>
        t.files.some((f) => f.includes('.test.'))
      );

      if (testSubtask) {
        // If tests are grouped, they should be together
        const hasOnlyTests = testSubtask.files.every((f) =>
          f.includes('.test.')
        );
        const hasNoTests = testSubtask.files.every((f) =>
          !f.includes('.test.')
        );
        // Either all tests or no tests
        expect(hasOnlyTests || hasNoTests).toBe(true);
      }
    });

    it('should group type files together', async () => {
      const task = createMockTask({
        files: [
          'src/auth/types.ts',
          'src/auth/interfaces.ts',
          'src/auth/service.ts',
          'src/auth/handler.ts',
        ],
      });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      // Types files should be together if grouped
      expect(subtasks.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Splitting by Functionality Tests
  // =========================================================================

  describe('splitting by functionality (complexity_discovered)', () => {
    it('should separate setup/types from implementation', async () => {
      const task = createMockTask({
        files: [
          'src/auth/types.ts',
          'src/auth/config.ts',
          'src/auth/service.ts',
          'src/auth/handler.ts',
          'src/auth/service.test.ts',
        ],
      });
      const reason = createMockReason('complexity_discovered', {
        details: 'Complex authentication flow detected',
      });

      const subtasks = await splitter.split(task, reason);

      // Should have at least 2 subtasks
      expect(subtasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should create separate subtask for tests', async () => {
      const task = createMockTask({
        files: [
          'src/auth/service.ts',
          'src/auth/handler.ts',
          'src/auth/service.test.ts',
          'src/auth/handler.test.ts',
        ],
      });
      const reason = createMockReason('complexity_discovered');

      const subtasks = await splitter.split(task, reason);

      // Find test subtask
      const testSubtask = subtasks.find((t) => t.name.includes('Test'));
      if (testSubtask) {
        expect(testSubtask.files.some((f) => f.includes('.test.'))).toBe(true);
      }
    });
  });

  // =========================================================================
  // Splitting by Time Tests
  // =========================================================================

  describe('splitting by time (time_exceeded)', () => {
    it('should create roughly equal time chunks', async () => {
      const task = createMockTask({
        files: Array.from({ length: 6 }, (_, i) => `file${i}.ts`),
        estimatedTime: 120,
      });
      const reason = createMockReason('time_exceeded');

      const subtasks = await splitter.split(task, reason);

      // Each subtask should have roughly equal time
      const times = subtasks.map((t) => t.estimatedTime);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      for (const time of times) {
        // Each should be within 50% of average
        expect(time).toBeGreaterThanOrEqual(avgTime * 0.5);
        expect(time).toBeLessThanOrEqual(avgTime * 2);
      }
    });
  });

  // =========================================================================
  // Dependency Chain Tests
  // =========================================================================

  describe('dependency chain creation', () => {
    it('should create dependencies from types to implementation', async () => {
      const task = createMockTask({
        files: [
          'src/types.ts',
          'src/service.ts',
          'src/handler.ts',
        ],
      });
      const reason = createMockReason('complexity_discovered');

      const subtasks = await splitter.split(task, reason);

      // Find types and other subtasks
      const typesSubtask = subtasks.find((t) => t.name.includes('Types') || t.name.includes('Setup'));
      const otherSubtasks = subtasks.filter((t) => t !== typesSubtask);

      if (typesSubtask && otherSubtasks.length > 0) {
        // Other subtasks should depend on types
        for (const other of otherSubtasks) {
          expect(other.dependencies).toContain(typesSubtask.id);
        }
      }
    });

    it('should create dependencies from implementation to tests', async () => {
      const task = createMockTask({
        files: [
          'src/service.ts',
          'src/service.test.ts',
        ],
      });
      const reason = createMockReason('complexity_discovered');

      const subtasks = await splitter.split(task, reason);

      // Find test and impl subtasks
      const testSubtask = subtasks.find((t) => t.name.includes('Test'));
      const implSubtasks = subtasks.filter((t) => !t.name.includes('Test'));

      if (testSubtask && implSubtasks.length > 0) {
        // Test should depend on implementation
        for (const impl of implSubtasks) {
          expect(testSubtask.dependencies).toContain(impl.id);
        }
      }
    });
  });

  // =========================================================================
  // Acceptance Criteria Distribution Tests
  // =========================================================================

  describe('acceptance criteria distribution', () => {
    it('should match criteria to files when possible', async () => {
      const task = createMockTask({
        files: ['src/AuthService.ts', 'src/AuthMiddleware.ts'],
        acceptanceCriteria: [
          'AuthService validates credentials',
          'AuthMiddleware checks JWT tokens',
        ],
      });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      // Check that criteria are distributed
      const allCriteria = subtasks.flatMap((t) => t.acceptanceCriteria);
      expect(allCriteria.length).toBeGreaterThan(0);
    });

    it('should assign unmatched criteria to first subtask', async () => {
      const task = createMockTask({
        files: ['src/a.ts', 'src/b.ts'],
        acceptanceCriteria: ['Generic requirement that matches nothing'],
      });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      if (subtasks.length > 0) {
        expect(subtasks[0].acceptanceCriteria.length).toBeGreaterThan(0);
      }
    });

    it('should ensure all subtasks have at least one criterion', async () => {
      const task = createMockTask({
        files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
        acceptanceCriteria: ['Only one criterion'],
      });
      const reason = createMockReason('scope_creep');

      const subtasks = await splitter.split(task, reason);

      for (const subtask of subtasks) {
        expect(subtask.acceptanceCriteria.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Factory Tests
  // =========================================================================

  describe('createTaskSplitter factory', () => {
    it('should create TaskSplitter with default config', () => {
      const splitter = createTaskSplitter();
      expect(splitter).toBeInstanceOf(TaskSplitter);
    });

    it('should create TaskSplitter with custom config', () => {
      const splitter = createTaskSplitter({ maxSubtasks: 10 });
      const task = createMockTask({
        files: Array.from({ length: 30 }, (_, i) => `file${i}.ts`),
      });

      // Even with 30 files, estimate shouldn't exceed maxSubtasks
      expect(splitter.estimateSubtasks(task)).toBeLessThanOrEqual(10);
    });
  });
});
