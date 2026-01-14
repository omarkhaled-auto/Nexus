// Planning Layer Types for Nexus
// Phase 04-01: TaskDecomposer, DependencyResolver, TimeEstimator

import type { Task, TaskSize, TaskType, TaskStatus } from '../types/task';
import type { Feature, SubFeature } from '../types/core';

// Re-export for convenience
export type { Task, TaskSize, TaskType, TaskStatus, Feature, SubFeature };

/**
 * Validation result for task size checks
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  code: 'too_large' | 'no_scope' | 'no_test_criteria' | 'multi_concern';
  message: string;
  suggestion?: string;
}

/**
 * Dependency graph representation
 */
export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Set<string>>; // taskId -> dependsOn taskIds
}

export interface GraphNode {
  taskId: string;
  inDegree: number;
  outDegree: number;
}

/**
 * Cycle detected in dependency graph
 */
export interface Cycle {
  taskIds: string[];
}

/**
 * Wave of tasks that can execute in parallel
 */
export interface Wave {
  id: number;
  tasks: PlanningTask[];
  estimatedTime: number; // max of task times in minutes
  dependencies: number[]; // wave IDs this wave depends on
}

/**
 * Feature estimation result
 */
export interface FeatureEstimate {
  featureId: string;
  totalMinutes: number;
  taskCount: number;
  confidence: number; // 0-1
  breakdown: TaskEstimate[];
}

export interface TaskEstimate {
  taskId: string;
  estimatedMinutes: number;
  confidence: number;
}

/**
 * Completed task for calibration
 */
export interface CompletedTask {
  taskId: string;
  estimatedMinutes: number;
  actualMinutes: number;
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Planning task - simplified task for decomposition
 */
export interface PlanningTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  size: TaskSize;
  estimatedMinutes: number;
  dependsOn: string[];
  parentTaskId?: string;
  testCriteria?: string[];
  files?: string[];
}

/**
 * Decomposition result from LLM
 */
export interface DecompositionResult {
  tasks: PlanningTask[];
  subFeatures?: {
    id: string;
    name: string;
    description: string;
    taskIds: string[];
  }[];
}

/**
 * Time estimation request
 */
export interface EstimationRequest {
  description: string;
  type: TaskType;
  complexity?: 'simple' | 'medium' | 'complex';
  fileCount?: number;
}

/**
 * ITaskDecomposer interface
 */
export interface ITaskDecomposer {
  decompose(feature: Feature): Promise<PlanningTask[]>;
  decomposeSubFeature(subFeature: SubFeature): Promise<PlanningTask[]>;
  validateTaskSize(task: PlanningTask): ValidationResult;
  splitTask(task: PlanningTask): Promise<PlanningTask[]>;
  estimateTime(task: PlanningTask): number;
}

/**
 * IDependencyResolver interface
 */
export interface IDependencyResolver {
  resolve(tasks: PlanningTask[]): DependencyGraph;
  topologicalSort(tasks: PlanningTask[]): PlanningTask[];
  detectCycles(tasks: PlanningTask[]): Cycle[];
  calculateWaves(tasks: PlanningTask[]): Wave[];
}

/**
 * ITimeEstimator interface
 */
export interface ITimeEstimator {
  estimateTime(task: PlanningTask): Promise<number>;
  estimateFeature(feature: Feature): Promise<FeatureEstimate>;
  calibrate(history: CompletedTask[]): void;
  getCalibrationFactor(): number;
}

/**
 * Custom errors for planning layer
 */
export class CycleError extends Error {
  constructor(public cycles: Cycle[]) {
    super(`Dependency cycle detected: ${cycles.map(c => c.taskIds.join(' -> ')).join('; ')}`);
    this.name = 'CycleError';
  }
}

export class DecompositionError extends Error {
  public override cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'DecompositionError';
    this.cause = cause;
  }
}

export class EstimationError extends Error {
  public override cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'EstimationError';
    this.cause = cause;
  }
}

/**
 * Constants for planning
 */
export const MAX_TASK_MINUTES = 30;
export const MIN_TASK_MINUTES = 5;
export const DEFAULT_CALIBRATION_FACTOR = 1.0;
