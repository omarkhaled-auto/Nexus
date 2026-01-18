/**
 * Planning Layer Types (Layer 3)
 *
 * This module defines all TypeScript types for the Planning layer,
 * which handles task decomposition, dependency resolution, and time estimation.
 *
 * Layer 3: Planning
 *
 * Philosophy:
 * - Decompose features into 30-minute or less atomic tasks
 * - Resolve dependencies between tasks for correct execution order
 * - Estimate time accurately based on task complexity
 */

import type { TaskType } from '../types/task';

// ============================================================================
// Task Types
// ============================================================================

/**
 * Size category for tasks based on estimated complexity
 */
export type TaskSize = 'atomic' | 'small' | 'medium' | 'large';

/**
 * A task produced by the planning layer for execution
 */
export interface PlanningTask {
  /** Unique task identifier */
  id: string;
  /** Human-readable task name */
  name: string;
  /** Detailed description of what needs to be done */
  description: string;
  /** Task type (auto, checkpoint, tdd) */
  type: TaskType;
  /** Size category */
  size: TaskSize;
  /** Estimated time in minutes (should be <= 30) */
  estimatedMinutes: number;
  /** IDs of tasks this task depends on */
  dependsOn: string[];
  /** Test criteria for validation */
  testCriteria: string[];
  /** Files that will be created or modified */
  files: string[];
}

/**
 * A task that has been completed
 */
export interface CompletedTask extends PlanningTask {
  /** When the task was completed */
  completedAt: Date;
  /** Actual time spent in minutes */
  actualMinutes: number;
  /** Whether the task passed all validation */
  passed: boolean;
  /** Any notes from execution */
  notes?: string;
}

// ============================================================================
// Wave Types
// ============================================================================

/**
 * A wave of tasks that can be executed in parallel
 * (all tasks in a wave have their dependencies satisfied)
 */
export interface Wave {
  /** Wave identifier (sequential number) */
  id: number;
  /** Tasks in this wave */
  tasks: PlanningTask[];
  /** Estimated total time for this wave (max of all tasks) */
  estimatedMinutes: number;
}

// ============================================================================
// Decomposition Types
// ============================================================================

/**
 * Result of decomposing a feature into tasks
 */
export interface DecompositionResult {
  /** Generated tasks */
  tasks: PlanningTask[];
  /** Dependency graph */
  dependencies: Map<string, string[]>;
  /** Waves for parallel execution */
  waves: Wave[];
  /** Total estimated time in minutes */
  totalEstimatedMinutes: number;
}

/**
 * Options for task decomposition
 */
export interface DecompositionOptions {
  /** Maximum time per task in minutes (default: 30) */
  maxTaskMinutes?: number;
  /** Whether to generate test criteria (default: true) */
  generateTestCriteria?: boolean;
  /** Context files to consider */
  contextFiles?: string[];
  /** Whether to use TDD approach */
  useTDD?: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating a task
 */
export interface TaskValidationResult {
  /** Whether the task is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Interface for task decomposition
 */
export interface ITaskDecomposer {
  /**
   * Decompose a feature into atomic tasks
   */
  decompose(featureDescription: string, options?: DecompositionOptions): Promise<PlanningTask[]>;

  /**
   * Validate that a task meets size requirements
   */
  validateTaskSize(task: PlanningTask): TaskValidationResult;

  /**
   * Split a task that is too large
   */
  splitTask(task: PlanningTask): Promise<PlanningTask[]>;

  /**
   * Estimate time for a task
   */
  estimateTime(task: PlanningTask): number;
}

/**
 * Interface for dependency resolution
 */
export interface IDependencyResolver {
  /**
   * Calculate execution waves from tasks
   */
  calculateWaves(tasks: PlanningTask[]): Wave[];

  /**
   * Get topologically sorted task order
   */
  topologicalSort(tasks: PlanningTask[]): PlanningTask[];

  /**
   * Check for circular dependencies
   */
  hasCircularDependency(tasks: PlanningTask[]): boolean;

  /**
   * Detect circular dependency cycles
   * Returns array of cycles, each containing task IDs in the cycle
   */
  detectCycles(tasks: PlanningTask[]): { taskIds: string[] }[];

  /**
   * Get all dependencies for a task (transitive)
   */
  getAllDependencies(taskId: string, tasks: PlanningTask[]): string[];
}

/**
 * Interface for time estimation
 */
export interface ITimeEstimator {
  /**
   * Estimate time for a task
   */
  estimate(task: PlanningTask): Promise<number>;

  /**
   * Estimate total time for a set of tasks
   */
  estimateTotal(tasks: PlanningTask[]): Promise<number>;

  /**
   * Calibrate estimator with actual data
   */
  calibrate(task: PlanningTask, actualMinutes: number): void;
}
