// DependencyResolver - Topological Sort and Waves
// Phase 04-01: Planning Layer Implementation

import type {
  PlanningTask,
  DependencyGraph,
  GraphNode,
  Cycle,
  Wave,
  IDependencyResolver,
} from '../types';
import { CycleError } from '../types';

/**
 * DependencyResolver analyzes task dependencies and creates parallel execution waves.
 *
 * Key responsibilities:
 * - Build dependency graphs from task relationships
 * - Topological sort using Kahn's algorithm
 * - Detect cycles in dependency graphs
 * - Calculate parallel execution waves
 */
export class DependencyResolver implements IDependencyResolver {
  /**
   * Build a dependency graph from task list
   */
  resolve(tasks: PlanningTask[]): DependencyGraph {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, Set<string>>();

    // Initialize nodes
    for (const task of tasks) {
      nodes.set(task.id, {
        taskId: task.id,
        inDegree: 0,
        outDegree: 0,
      });
      edges.set(task.id, new Set());
    }

    // Build edges and calculate degrees
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        // Add edge: task depends on depId
        edges.get(task.id)?.add(depId);

        // Update in-degree (task has one more incoming dependency)
        const node = nodes.get(task.id);
        if (node) {
          node.inDegree++;
        }

        // Update out-degree (depId has one more outgoing edge)
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.outDegree++;
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Topologically sort tasks using Kahn's algorithm
   * Throws CycleError if cycle is detected
   */
  topologicalSort(tasks: PlanningTask[]): PlanningTask[] {
    if (tasks.length === 0) {
      return [];
    }

    // Build task map for quick lookup
    const taskMap = new Map<string, PlanningTask>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    // Build adjacency list (reverse: dependsOn becomes outgoing edges)
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, Set<string>>();

    for (const task of tasks) {
      inDegree.set(task.id, 0);
      outgoing.set(task.id, new Set());
    }

    // For each task, its dependencies point to it
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        if (taskMap.has(depId)) {
          outgoing.get(depId)?.add(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm: start with nodes that have no incoming edges
    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: PlanningTask[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const task = taskMap.get(current);
      if (task) {
        result.push(task);
      }

      // Remove outgoing edges
      const neighbors = outgoing.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If not all tasks are in result, there's a cycle
    if (result.length !== tasks.length) {
      const cycles = this.detectCycles(tasks);
      throw new CycleError(cycles);
    }

    return result;
  }

  /**
   * Detect all cycles in the dependency graph using DFS
   */
  detectCycles(tasks: PlanningTask[]): Cycle[] {
    if (tasks.length === 0) {
      return [];
    }

    const cycles: Cycle[] = [];
    const taskMap = new Map<string, PlanningTask>();
    const color = new Map<string, 'white' | 'gray' | 'black'>();
    const parent = new Map<string, string | null>();

    for (const task of tasks) {
      taskMap.set(task.id, task);
      color.set(task.id, 'white');
    }

    // DFS to find cycles
    const dfs = (taskId: string, path: string[]): void => {
      color.set(taskId, 'gray');
      path.push(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      for (const depId of task.dependsOn) {
        // Only consider dependencies that exist in our task list
        if (!taskMap.has(depId)) continue;

        if (color.get(depId) === 'gray') {
          // Found a cycle - extract the cycle path
          const cycleStart = path.indexOf(depId);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart);
            cycles.push({ taskIds: cyclePath });
          } else {
            // Self-loop or back edge to ancestor
            cycles.push({ taskIds: [depId, taskId] });
          }
        } else if (color.get(depId) === 'white') {
          parent.set(depId, taskId);
          dfs(depId, [...path]);
        }
      }

      color.set(taskId, 'black');
    };

    // Run DFS from all unvisited nodes
    for (const task of tasks) {
      if (color.get(task.id) === 'white') {
        dfs(task.id, []);
      }
    }

    return cycles;
  }

  /**
   * Calculate parallel execution waves
   * Tasks in the same wave can execute concurrently
   */
  calculateWaves(tasks: PlanningTask[]): Wave[] {
    if (tasks.length === 0) {
      return [];
    }

    // First check for cycles
    const cycles = this.detectCycles(tasks);
    if (cycles.length > 0) {
      throw new CycleError(cycles);
    }

    // Build task map and in-degree
    const taskMap = new Map<string, PlanningTask>();
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, Set<string>>();
    const taskWave = new Map<string, number>();

    for (const task of tasks) {
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
      outgoing.set(task.id, new Set());
    }

    // Build dependency graph
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        if (taskMap.has(depId)) {
          outgoing.get(depId)?.add(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }

    // BFS with level tracking
    const waves: Wave[] = [];
    let currentWave: string[] = [];

    // Start with nodes that have no dependencies
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        currentWave.push(id);
        taskWave.set(id, 0);
      }
    }

    let waveId = 0;

    while (currentWave.length > 0) {
      // Create wave from current level
      const waveTasks = currentWave
        .map(id => taskMap.get(id))
        .filter((t): t is PlanningTask => t !== undefined);
      const maxTime = Math.max(...waveTasks.map(t => t.estimatedMinutes));

      // Calculate wave dependencies (which previous waves does this wave depend on)
      const waveDeps: number[] = [];
      if (waveId > 0) {
        // This wave depends on the previous wave
        waveDeps.push(waveId - 1);
      }

      waves.push({
        id: waveId,
        tasks: waveTasks,
        estimatedTime: maxTime,
        dependencies: waveDeps,
      });

      // Find next level
      const nextWave: string[] = [];

      for (const current of currentWave) {
        const neighbors = outgoing.get(current) || new Set();
        for (const neighbor of neighbors) {
          const newDegree = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0 && !taskWave.has(neighbor)) {
            nextWave.push(neighbor);
            taskWave.set(neighbor, waveId + 1);
          }
        }
      }

      currentWave = nextWave;
      waveId++;
    }

    return waves;
  }
}
