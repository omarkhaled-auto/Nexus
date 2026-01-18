/**
 * Planning Layer (Layer 3)
 *
 * Exports for the planning layer which handles:
 * - Task decomposition (breaking features into 30-minute atomic tasks)
 * - Dependency resolution (calculating execution order)
 * - Time estimation (predicting task duration)
 */

// Types
export type {
  TaskSize,
  PlanningTask,
  CompletedTask,
  Wave,
  DecompositionResult,
  DecompositionOptions,
  TaskValidationResult,
  ITaskDecomposer,
  IDependencyResolver,
  ITimeEstimator,
} from './types';

// Implementations
export { TaskDecomposer, createTaskDecomposer } from './decomposition';
export type { TaskDecomposerConfig } from './decomposition';

export {
  DependencyResolver,
  createDependencyResolver,
} from './dependencies';
export type { Cycle, DependencyResolverConfig } from './dependencies';

export {
  TimeEstimator,
  createTimeEstimator,
} from './estimation';
export type {
  EstimationFactors,
  EstimationResult,
  TimeEstimatorConfig,
  ComplexityLevel,
  TaskCategory,
} from './estimation';
