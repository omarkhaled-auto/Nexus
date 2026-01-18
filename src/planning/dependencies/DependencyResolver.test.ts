/**
 * DependencyResolver Tests
 *
 * Tests for dependency resolution, topological sort, cycle detection,
 * and wave calculation functionality.
 *
 * Phase 14B: Execution Bindings Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DependencyResolver,
  createDependencyResolver,
} from './DependencyResolver';
import type { PlanningTask, TaskSize } from '../types';
import type { TaskType } from '../../types/task';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock PlanningTask for testing
 */
function createMockTask(
  id: string,
  name: string,
  dependsOn: string[] = [],
  estimatedMinutes: number = 30
): PlanningTask {
  return {
    id,
    name,
    description: `Test task: ${name}`,
    type: 'auto' as TaskType,
    size: 'small' as TaskSize,
    estimatedMinutes,
    dependsOn,
    testCriteria: ['Should work'],
    files: ['test.ts'],
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const instance = new DependencyResolver();
      expect(instance).toBeInstanceOf(DependencyResolver);
    });

    it('should create instance with custom config', () => {
      const instance = new DependencyResolver({
        verbose: true,
        maxWaveDepth: 50,
      });
      expect(instance).toBeInstanceOf(DependencyResolver);
    });
  });

  // ==========================================================================
  // topologicalSort Tests
  // ==========================================================================

  describe('topologicalSort', () => {
    it('should sort independent tasks in any order', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B'),
        createMockTask('3', 'Task C'),
      ];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(3);
      expect(sorted.map((t) => t.id).sort()).toEqual(['1', '2', '3']);
    });

    it('should sort tasks with linear dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['2']),
      ];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('should handle diamond dependency pattern', () => {
      // Diamond: A -> B, A -> C, B -> D, C -> D
      const tasks = [
        createMockTask('A', 'Task A'),
        createMockTask('B', 'Task B', ['A']),
        createMockTask('C', 'Task C', ['A']),
        createMockTask('D', 'Task D', ['B', 'C']),
      ];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(4);
      // A must be first
      expect(sorted[0].id).toBe('A');
      // D must be last
      expect(sorted[3].id).toBe('D');
      // B and C must be between A and D
      const middleIds = [sorted[1].id, sorted[2].id].sort();
      expect(middleIds).toEqual(['B', 'C']);
    });

    it('should throw on circular dependency', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['2']),
        createMockTask('2', 'Task B', ['1']),
      ];

      expect(() => resolver.topologicalSort(tasks)).toThrow(/[Cc]ircular/);
    });

    it('should handle empty task list', () => {
      const sorted = resolver.topologicalSort([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [createMockTask('1', 'Task A')];
      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('1');
    });

    it('should ignore external dependencies not in task list', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['external-task']),
        createMockTask('2', 'Task B', ['1']),
      ];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(2);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
    });
  });

  // ==========================================================================
  // hasCircularDependency Tests
  // ==========================================================================

  describe('hasCircularDependency', () => {
    it('should return false for acyclic graph', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['2']),
      ];

      expect(resolver.hasCircularDependency(tasks)).toBe(false);
    });

    it('should return true for direct cycle', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['2']),
        createMockTask('2', 'Task B', ['1']),
      ];

      expect(resolver.hasCircularDependency(tasks)).toBe(true);
    });

    it('should return true for indirect cycle', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['3']),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['2']),
      ];

      expect(resolver.hasCircularDependency(tasks)).toBe(true);
    });

    it('should return true for self-dependency', () => {
      const tasks = [createMockTask('1', 'Task A', ['1'])];

      expect(resolver.hasCircularDependency(tasks)).toBe(true);
    });
  });

  // ==========================================================================
  // detectCycles Tests
  // ==========================================================================

  describe('detectCycles', () => {
    it('should return empty array for acyclic graph', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const cycles = resolver.detectCycles(tasks);
      expect(cycles).toHaveLength(0);
    });

    it('should detect direct cycle', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['2']),
        createMockTask('2', 'Task B', ['1']),
      ];

      const cycles = resolver.detectCycles(tasks);
      expect(cycles.length).toBeGreaterThan(0);
      // Cycle should contain both task IDs
      const cycleIds = cycles[0].taskIds;
      expect(cycleIds).toContain('1');
      expect(cycleIds).toContain('2');
    });

    it('should detect self-dependency cycle', () => {
      const tasks = [createMockTask('1', 'Task A', ['1'])];

      const cycles = resolver.detectCycles(tasks);
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // calculateWaves Tests
  // ==========================================================================

  describe('calculateWaves', () => {
    it('should put independent tasks in single wave', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B'),
        createMockTask('3', 'Task C'),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(1);
      expect(waves[0].tasks).toHaveLength(3);
    });

    it('should create multiple waves for linear dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['2']),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(3);
      expect(waves[0].tasks.map((t) => t.id)).toEqual(['1']);
      expect(waves[1].tasks.map((t) => t.id)).toEqual(['2']);
      expect(waves[2].tasks.map((t) => t.id)).toEqual(['3']);
    });

    it('should handle diamond pattern with parallel middle wave', () => {
      const tasks = [
        createMockTask('A', 'Task A'),
        createMockTask('B', 'Task B', ['A']),
        createMockTask('C', 'Task C', ['A']),
        createMockTask('D', 'Task D', ['B', 'C']),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(3);
      expect(waves[0].tasks.map((t) => t.id)).toEqual(['A']);
      expect(waves[1].tasks.map((t) => t.id).sort()).toEqual(['B', 'C']);
      expect(waves[2].tasks.map((t) => t.id)).toEqual(['D']);
    });

    it('should set correct wave properties', () => {
      const tasks = [
        createMockTask('1', 'Task A', [], 10),
        createMockTask('2', 'Task B', [], 20),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves[0].id).toBe(0);
      expect(waves[0].estimatedMinutes).toBe(20); // Max of tasks
    });

    it('should handle empty task list', () => {
      const waves = resolver.calculateWaves([]);
      expect(waves).toHaveLength(0);
    });

    it('should handle circular dependencies by breaking cycle', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['2']),
        createMockTask('2', 'Task B', ['1']),
      ];

      // Should not throw - should break cycle
      const waves = resolver.calculateWaves(tasks);
      expect(waves.length).toBeGreaterThan(0);

      // All tasks should be included
      const allTaskIds = waves.flatMap((w) => w.tasks.map((t) => t.id));
      expect(allTaskIds.sort()).toEqual(['1', '2']);
    });
  });

  // ==========================================================================
  // getAllDependencies Tests
  // ==========================================================================

  describe('getAllDependencies', () => {
    it('should return empty array for task with no dependencies', () => {
      const tasks = [createMockTask('1', 'Task A')];

      const deps = resolver.getAllDependencies('1', tasks);
      expect(deps).toEqual([]);
    });

    it('should return direct dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const deps = resolver.getAllDependencies('2', tasks);
      expect(deps).toEqual(['1']);
    });

    it('should return transitive dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['2']),
      ];

      const deps = resolver.getAllDependencies('3', tasks);
      expect(deps.sort()).toEqual(['1', '2']);
    });

    it('should handle diamond pattern', () => {
      const tasks = [
        createMockTask('A', 'Task A'),
        createMockTask('B', 'Task B', ['A']),
        createMockTask('C', 'Task C', ['A']),
        createMockTask('D', 'Task D', ['B', 'C']),
      ];

      const deps = resolver.getAllDependencies('D', tasks);
      expect(deps.sort()).toEqual(['A', 'B', 'C']);
    });

    it('should return empty for non-existent task', () => {
      const tasks = [createMockTask('1', 'Task A')];

      const deps = resolver.getAllDependencies('non-existent', tasks);
      expect(deps).toEqual([]);
    });
  });

  // ==========================================================================
  // getDependents Tests
  // ==========================================================================

  describe('getDependents', () => {
    it('should return tasks that depend on given task', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['1']),
        createMockTask('4', 'Task D'),
      ];

      const dependents = resolver.getDependents('1', tasks);

      expect(dependents).toHaveLength(2);
      expect(dependents.map((t) => t.id).sort()).toEqual(['2', '3']);
    });

    it('should return empty array for leaf task', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const dependents = resolver.getDependents('2', tasks);
      expect(dependents).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getCriticalPath Tests
  // ==========================================================================

  describe('getCriticalPath', () => {
    it('should return single task for independent tasks by time', () => {
      const tasks = [
        createMockTask('1', 'Task A', [], 10),
        createMockTask('2', 'Task B', [], 20),
        createMockTask('3', 'Task C', [], 30),
      ];

      const criticalPath = resolver.getCriticalPath(tasks);

      // Should return task with longest time
      expect(criticalPath).toHaveLength(1);
      expect(criticalPath[0].id).toBe('3');
    });

    it('should return longest dependency chain', () => {
      const tasks = [
        createMockTask('1', 'Task A', [], 10),
        createMockTask('2', 'Task B', ['1'], 10),
        createMockTask('3', 'Task C', ['2'], 10),
        createMockTask('4', 'Task D', [], 20), // Shorter path by count but might be longer by time
      ];

      const criticalPath = resolver.getCriticalPath(tasks);

      // Critical path is A -> B -> C (30 min) vs D (20 min)
      expect(criticalPath).toHaveLength(3);
      expect(criticalPath.map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('should handle empty task list', () => {
      const criticalPath = resolver.getCriticalPath([]);
      expect(criticalPath).toEqual([]);
    });
  });

  // ==========================================================================
  // getNextAvailable Tests
  // ==========================================================================

  describe('getNextAvailable', () => {
    it('should return all tasks when none completed and no dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B'),
      ];

      const available = resolver.getNextAvailable(tasks, []);

      expect(available).toHaveLength(2);
    });

    it('should return tasks with satisfied dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
        createMockTask('3', 'Task C', ['1']),
      ];

      const available = resolver.getNextAvailable(tasks, ['1']);

      expect(available.map((t) => t.id).sort()).toEqual(['2', '3']);
    });

    it('should not return already completed tasks', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const available = resolver.getNextAvailable(tasks, ['1']);

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('2');
    });

    it('should not return tasks with unsatisfied dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const available = resolver.getNextAvailable(tasks, []);

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('1');
    });
  });

  // ==========================================================================
  // validate Tests
  // ==========================================================================

  describe('validate', () => {
    it('should return valid for correct graph', () => {
      const tasks = [
        createMockTask('1', 'Task A'),
        createMockTask('2', 'Task B', ['1']),
      ];

      const result = resolver.validate(tasks);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect self-dependency', () => {
      const tasks = [createMockTask('1', 'Task A', ['1'])];

      const result = resolver.validate(tasks);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('depends on itself'))).toBe(
        true
      );
    });

    it('should detect circular dependencies', () => {
      const tasks = [
        createMockTask('1', 'Task A', ['2']),
        createMockTask('2', 'Task B', ['1']),
      ];

      const result = resolver.validate(tasks);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('Circular'))).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createDependencyResolver', () => {
    it('should create DependencyResolver instance', () => {
      const instance = createDependencyResolver();
      expect(instance).toBeInstanceOf(DependencyResolver);
    });

    it('should accept configuration', () => {
      const instance = createDependencyResolver({ verbose: true });
      expect(instance).toBeInstanceOf(DependencyResolver);
    });
  });
});
