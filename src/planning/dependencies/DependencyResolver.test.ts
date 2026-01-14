import { describe, it, expect } from 'vitest';
import { DependencyResolver } from './DependencyResolver';
import type { PlanningTask, Wave, Cycle, DependencyGraph } from '../types';
import { CycleError } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTask(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task',
    type: 'auto',
    size: 'atomic',
    estimatedMinutes: 15,
    dependsOn: [],
    testCriteria: ['Test passes'],
    files: ['src/test.ts'],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DependencyResolver', () => {
  describe('resolve()', () => {
    it('should build dependency graph from tasks', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['A', 'B'] }),
      ];

      const graph = resolver.resolve(tasks);

      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.get('B')?.has('A')).toBe(true);
      expect(graph.edges.get('C')?.has('A')).toBe(true);
      expect(graph.edges.get('C')?.has('B')).toBe(true);
    });

    it('should calculate correct in-degree for nodes', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['A', 'B'] }),
      ];

      const graph = resolver.resolve(tasks);

      expect(graph.nodes.get('A')?.inDegree).toBe(0);
      expect(graph.nodes.get('B')?.inDegree).toBe(1);
      expect(graph.nodes.get('C')?.inDegree).toBe(2);
    });

    it('should handle empty task list', () => {
      const resolver = new DependencyResolver();
      const graph = resolver.resolve([]);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });
  });

  describe('topologicalSort()', () => {
    it('should order A -> B -> C correctly', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'C', dependsOn: ['B'] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'A', dependsOn: [] }),
      ];

      const sorted = resolver.topologicalSort(tasks);

      const ids = sorted.map(t => t.id);
      expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
      expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'));
    });

    it('should throw CycleError on cycle A -> B -> A', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: ['B'] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
      ];

      expect(() => resolver.topologicalSort(tasks)).toThrow(CycleError);
    });

    it('should handle independent tasks in any valid order', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: [] }),
        createTask({ id: 'C', dependsOn: [] }),
      ];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(3);
      expect(sorted.map(t => t.id).sort()).toEqual(['A', 'B', 'C']);
    });

    it('should handle complex diamond dependency pattern', () => {
      const resolver = new DependencyResolver();
      // Diamond: A -> B, A -> C, B -> D, C -> D
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['A'] }),
        createTask({ id: 'D', dependsOn: ['B', 'C'] }),
      ];

      const sorted = resolver.topologicalSort(tasks);

      const ids = sorted.map(t => t.id);
      expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));
      expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('C'));
      expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'));
      expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('D'));
    });

    it('should handle single task', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [createTask({ id: 'A' })];

      const sorted = resolver.topologicalSort(tasks);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('A');
    });

    it('should return empty array for empty input', () => {
      const resolver = new DependencyResolver();
      const sorted = resolver.topologicalSort([]);

      expect(sorted).toHaveLength(0);
    });
  });

  describe('detectCycles()', () => {
    it('should find single cycle', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: ['B'] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
      ];

      const cycles = resolver.detectCycles(tasks);

      expect(cycles.length).toBeGreaterThan(0);
      // Cycle should contain both A and B
      const cycleIds = cycles[0].taskIds;
      expect(cycleIds).toContain('A');
      expect(cycleIds).toContain('B');
    });

    it('should find multiple cycles', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        // Cycle 1: A -> B -> A
        createTask({ id: 'A', dependsOn: ['B'] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        // Cycle 2: C -> D -> E -> C
        createTask({ id: 'C', dependsOn: ['E'] }),
        createTask({ id: 'D', dependsOn: ['C'] }),
        createTask({ id: 'E', dependsOn: ['D'] }),
      ];

      const cycles = resolver.detectCycles(tasks);

      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no cycles exist', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['B'] }),
      ];

      const cycles = resolver.detectCycles(tasks);

      expect(cycles).toHaveLength(0);
    });

    it('should detect self-referential cycle', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: ['A'] }), // Self-loop
      ];

      const cycles = resolver.detectCycles(tasks);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].taskIds).toContain('A');
    });
  });

  describe('calculateWaves()', () => {
    it('should put independent tasks in Wave 0', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [], estimatedMinutes: 10 }),
        createTask({ id: 'B', dependsOn: [], estimatedMinutes: 15 }),
        createTask({ id: 'C', dependsOn: [], estimatedMinutes: 20 }),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(1);
      expect(waves[0].id).toBe(0);
      expect(waves[0].tasks).toHaveLength(3);
    });

    it('should put dependent tasks in later waves', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['B'] }),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(3);
      expect(waves[0].tasks[0].id).toBe('A');
      expect(waves[1].tasks[0].id).toBe('B');
      expect(waves[2].tasks[0].id).toBe('C');
    });

    it('should calculate Wave estimatedTime as max of task times', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [], estimatedMinutes: 10 }),
        createTask({ id: 'B', dependsOn: [], estimatedMinutes: 25 }),
        createTask({ id: 'C', dependsOn: [], estimatedMinutes: 15 }),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves[0].estimatedTime).toBe(25); // max of 10, 25, 15
    });

    it('should return empty waves for empty task list', () => {
      const resolver = new DependencyResolver();
      const waves = resolver.calculateWaves([]);

      expect(waves).toHaveLength(0);
    });

    it('should return single wave for single task', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', estimatedMinutes: 20 }),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves).toHaveLength(1);
      expect(waves[0].tasks).toHaveLength(1);
      expect(waves[0].estimatedTime).toBe(20);
    });

    it('should handle complex graph with multiple paths', () => {
      const resolver = new DependencyResolver();
      // Complex graph:
      //     A
      //    / \
      //   B   C
      //    \ / \
      //     D   E
      //      \ /
      //       F
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['A'] }),
        createTask({ id: 'D', dependsOn: ['B', 'C'] }),
        createTask({ id: 'E', dependsOn: ['C'] }),
        createTask({ id: 'F', dependsOn: ['D', 'E'] }),
      ];

      const waves = resolver.calculateWaves(tasks);

      // Wave 0: A
      // Wave 1: B, C
      // Wave 2: D, E
      // Wave 3: F
      expect(waves).toHaveLength(4);
      expect(waves[0].tasks.map(t => t.id)).toEqual(['A']);
      expect(waves[1].tasks.map(t => t.id).sort()).toEqual(['B', 'C']);
      expect(waves[2].tasks.map(t => t.id).sort()).toEqual(['D', 'E']);
      expect(waves[3].tasks.map(t => t.id)).toEqual(['F']);
    });

    it('should set wave dependencies correctly', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: [] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
        createTask({ id: 'C', dependsOn: ['B'] }),
      ];

      const waves = resolver.calculateWaves(tasks);

      expect(waves[0].dependencies).toEqual([]);
      expect(waves[1].dependencies).toEqual([0]);
      expect(waves[2].dependencies).toEqual([1]);
    });

    it('should throw CycleError when cycles exist', () => {
      const resolver = new DependencyResolver();
      const tasks: PlanningTask[] = [
        createTask({ id: 'A', dependsOn: ['B'] }),
        createTask({ id: 'B', dependsOn: ['A'] }),
      ];

      expect(() => resolver.calculateWaves(tasks)).toThrow(CycleError);
    });
  });
});
