/**
 * DependencyResolver Implementation
 *
 * Resolves task dependencies using topological sort (Kahn's algorithm).
 * Calculates execution waves for parallel task execution.
 * Implements IDependencyResolver interface for NexusCoordinator integration.
 *
 * Phase 14B: Execution Bindings Implementation
 */

import type {
  IDependencyResolver,
  PlanningTask,
  Wave,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a detected circular dependency cycle
 */
export interface Cycle {
  /** Task IDs involved in the cycle */
  taskIds: string[];
  /** Human-readable path representation */
  path: string;
}

/**
 * Configuration options for DependencyResolver
 */
export interface DependencyResolverConfig {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Maximum wave depth (to prevent infinite loops) */
  maxWaveDepth?: number;
}

// ============================================================================
// DependencyResolver Implementation
// ============================================================================

/**
 * DependencyResolver - Resolves task dependencies and calculates execution order
 *
 * This implementation:
 * - Uses Kahn's algorithm for topological sort
 * - Detects circular dependencies
 * - Calculates execution waves for parallel execution
 * - Finds transitive dependencies
 */
export class DependencyResolver implements IDependencyResolver {
  private config: Required<DependencyResolverConfig>;

  constructor(config?: DependencyResolverConfig) {
    this.config = {
      verbose: config?.verbose ?? false,
      maxWaveDepth: config?.maxWaveDepth ?? 100,
    };
  }

  /**
   * Calculate execution waves from tasks
   * Tasks in the same wave can be executed in parallel
   */
  calculateWaves(tasks: PlanningTask[]): Wave[] {
    const waves: Wave[] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map((t) => t.id));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    let waveNumber = 0;

    while (remaining.size > 0 && waveNumber < this.config.maxWaveDepth) {
      // Find all tasks whose dependencies are satisfied
      const waveTaskIds: string[] = [];

      for (const taskId of Array.from(remaining)) {
        const task = taskMap.get(taskId);
        if (!task) continue;
        const deps = task.dependsOn || [];

        // Check if all dependencies are either completed or not in our task set
        // (external dependencies)
        const allDepsSatisfied = deps.every(
          (d) => completed.has(d) || !taskMap.has(d)
        );

        if (allDepsSatisfied) {
          waveTaskIds.push(taskId);
        }
      }

      // If no tasks can be added but there are remaining tasks,
      // we have a circular dependency - break the cycle
      if (waveTaskIds.length === 0 && remaining.size > 0) {
        if (this.config.verbose) {
          console.warn(
            `Circular dependency detected - breaking cycle with first remaining task`
          );
        }
        const first = remaining.values().next().value;
        if (first !== undefined) {
          waveTaskIds.push(first);
        }
      }

      if (waveTaskIds.length === 0) {
        break;
      }

      // Create wave
      const waveTasks = waveTaskIds.map((id) => taskMap.get(id)).filter((t): t is PlanningTask => t !== undefined);
      const estimatedMinutes = Math.max(
        ...waveTasks.map((t) => t.estimatedMinutes || 30)
      );

      waves.push({
        id: waveNumber,
        tasks: waveTasks,
        estimatedMinutes,
      });

      // Mark as completed
      for (const id of waveTaskIds) {
        completed.add(id);
        remaining.delete(id);
      }

      waveNumber++;
    }

    if (this.config.verbose) {
      console.log(`Calculated ${waves.length} execution waves`);
    }

    return waves;
  }

  /**
   * Get topologically sorted task order using Kahn's algorithm
   * @throws Error if circular dependency is detected
   */
  topologicalSort(tasks: PlanningTask[]): PlanningTask[] {
    // Build adjacency list and in-degree count
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const taskMap = new Map<string, PlanningTask>();

    // Initialize
    for (const task of tasks) {
      taskMap.set(task.id, task);
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    }

    // Build graph
    // For each task, add edges from its dependencies to itself
    for (const task of tasks) {
      for (const dep of task.dependsOn || []) {
        // Only consider dependencies within our task set
        if (taskMap.has(dep)) {
          graph.get(dep)?.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: PlanningTask[] = [];

    // Start with tasks that have no dependencies (in-degree = 0)
    for (const [id, degree] of Array.from(inDegree)) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const currentTask = taskMap.get(current);
      if (currentTask) result.push(currentTask);

      // Reduce in-degree for all neighbors
      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles - if we couldn't process all tasks, there's a cycle
    if (result.length !== tasks.length) {
      const remaining = tasks.filter((t) => !result.find((r) => r.id === t.id));
      throw new Error(
        `Circular dependency detected involving: ${remaining.map((t) => t.name).join(', ')}`
      );
    }

    if (this.config.verbose) {
      console.log(`Topological sort complete: ${result.length} tasks`);
    }

    return result;
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependency(tasks: PlanningTask[]): boolean {
    try {
      this.topologicalSort(tasks);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Detect circular dependency cycles using DFS
   */
  detectCycles(tasks: PlanningTask[]): { taskIds: string[] }[] {
    const cycles: { taskIds: string[] }[] = [];
    const taskMap = new Map<string, PlanningTask>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    const dfs = (taskId: string): void => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const task = taskMap.get(taskId);
      for (const dep of task?.dependsOn || []) {
        // Only consider dependencies within our task set
        if (!taskMap.has(dep)) continue;

        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          const cyclePath = path.slice(cycleStart);
          cycles.push({
            taskIds: [...cyclePath],
          });
        }
      }

      path.pop();
      recursionStack.delete(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }

    if (this.config.verbose && cycles.length > 0) {
      console.warn(`Detected ${cycles.length} circular dependency cycles`);
    }

    return cycles;
  }

  /**
   * Get all dependencies for a task (transitive)
   * Returns all task IDs that must be completed before this task
   */
  getAllDependencies(taskId: string, tasks: PlanningTask[]): string[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const allDeps = new Set<string>();
    const visited = new Set<string>();

    const collectDeps = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const task = taskMap.get(id);
      if (!task) return;

      for (const dep of task.dependsOn || []) {
        if (taskMap.has(dep)) {
          allDeps.add(dep);
          collectDeps(dep);
        }
      }
    };

    collectDeps(taskId);

    return Array.from(allDeps);
  }

  /**
   * Get direct dependents of a task
   * Returns tasks that directly depend on the given task
   */
  getDependents(taskId: string, tasks: PlanningTask[]): PlanningTask[] {
    return tasks.filter((task) => task.dependsOn?.includes(taskId));
  }

  /**
   * Get the critical path (longest chain of dependencies by time)
   * The critical path determines the minimum total execution time
   */
  getCriticalPath(tasks: PlanningTask[]): PlanningTask[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const memo = new Map<string, { path: PlanningTask[]; time: number }>();

    const getLongestPath = (
      taskId: string
    ): { path: PlanningTask[]; time: number } => {
      const cached = memo.get(taskId);
      if (cached) return cached;

      const task = taskMap.get(taskId);
      if (!task) return { path: [], time: 0 };

      const deps = task.dependsOn || [];
      if (deps.length === 0) {
        const result = { path: [task], time: task.estimatedMinutes || 0 };
        memo.set(taskId, result);
        return result;
      }

      let longestDepResult = { path: [] as PlanningTask[], time: 0 };
      for (const dep of deps) {
        if (!taskMap.has(dep)) continue;
        const depResult = getLongestPath(dep);
        if (depResult.time > longestDepResult.time) {
          longestDepResult = depResult;
        }
      }

      const result = {
        path: [...longestDepResult.path, task],
        time: longestDepResult.time + (task.estimatedMinutes || 0),
      };
      memo.set(taskId, result);
      return result;
    };

    let criticalResult = { path: [] as PlanningTask[], time: 0 };
    for (const task of tasks) {
      const result = getLongestPath(task.id);
      if (result.time > criticalResult.time) {
        criticalResult = result;
      }
    }

    if (this.config.verbose) {
      console.log(
        `Critical path: ${criticalResult.path.length} tasks, ${criticalResult.time} minutes`
      );
    }

    return criticalResult.path;
  }

  /**
   * Get the next available tasks given completed task IDs
   */
  getNextAvailable(
    tasks: PlanningTask[],
    completedIds: string[]
  ): PlanningTask[] {
    const completed = new Set(completedIds);
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Get pending tasks (not completed)
    const pending = tasks.filter((t) => !completed.has(t.id));

    // Filter to those with all dependencies satisfied
    return pending.filter((task) => {
      const deps = task.dependsOn || [];
      return deps.every((d) => completed.has(d) || !taskMap.has(d));
    });
  }

  /**
   * Validate the dependency graph
   * Returns validation issues found
   */
  validate(tasks: PlanningTask[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const taskIds = new Set(tasks.map((t) => t.id));

    // Check for self-dependencies
    for (const task of tasks) {
      if (task.dependsOn?.includes(task.id)) {
        issues.push(`Task "${task.name}" depends on itself`);
      }
    }

    // Check for missing dependencies (optional - they might be external)
    for (const task of tasks) {
      for (const dep of task.dependsOn || []) {
        if (!taskIds.has(dep)) {
          // This is a warning, not an error - could be external dependency
          if (this.config.verbose) {
            console.warn(
              `Task "${task.name}" depends on unknown task "${dep}" (may be external)`
            );
          }
        }
      }
    }

    // Check for circular dependencies
    const cycles = this.detectCycles(tasks);
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        const taskNames = cycle.taskIds
          .map((id) => tasks.find((t) => t.id === id)?.name || id)
          .join(' -> ');
        issues.push(`Circular dependency: ${taskNames}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a DependencyResolver instance
 */
export function createDependencyResolver(
  config?: DependencyResolverConfig
): DependencyResolver {
  return new DependencyResolver(config);
}
