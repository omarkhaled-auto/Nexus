/**
 * Dynamic Replanner Module
 *
 * Exports all components of the Dynamic Replanner system for task complexity
 * detection and replanning.
 *
 * @module orchestration/planning
 *
 * Layer 2/3: Orchestration / Planning
 *
 * Components:
 * - DynamicReplanner: Main replanner class
 * - TaskSplitter: Splits complex tasks into subtasks
 * - ReplannerIntegration: Coordinator integration hooks
 * - Triggers: Individual trigger evaluators
 *
 * Usage:
 * ```typescript
 * import {
 *   createDynamicReplanner,
 *   createAllTriggers,
 *   TaskSplitter,
 *   ReplannerIntegration,
 * } from './orchestration/planning';
 *
 * const triggers = createAllTriggers();
 * const splitter = new TaskSplitter();
 * const replanner = createDynamicReplanner(triggers, splitter);
 * const integration = new ReplannerIntegration({ replanner });
 *
 * // Use integration hooks in coordinator
 * integration.onTaskStarted(taskId, task);
 * integration.onIterationComplete(taskId, result);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Trigger types
  ReplanTrigger,
  ReplanAction,
  TriggerThresholds,
  ExecutionContext,
  ReplanMetrics,
  ReplanReason,
  ReplanDecision,
  ReplanResult,

  // Task types
  Task,
  TaskStatus,
  MonitoredTask,

  // Trigger evaluator types
  TriggerResult,
  ITriggerEvaluator,

  // Task splitter types
  ITaskSplitter,

  // Agent request types
  AgentReplanRequest,

  // Main interface
  IDynamicReplanner,

  // Configuration types
  DynamicReplannerConfig,
  ReplannerEventEmitter,

  // Re-exported from iteration
  ErrorEntry,
} from './types';

// Export constants
export { DEFAULT_TRIGGER_THRESHOLDS, TRIGGER_PRIORITY } from './types';

// ============================================================================
// Core Classes
// ============================================================================

// Main replanner
export { DynamicReplanner, createDynamicReplanner } from './DynamicReplanner';

// Task splitter
export { TaskSplitter } from './TaskSplitter';
export type { TaskSplitterConfig, FileGroupPattern } from './TaskSplitter';

// ============================================================================
// Triggers
// ============================================================================

export {
  TimeExceededTrigger,
  IterationsTrigger,
  ScopeCreepTrigger,
  ConsecutiveFailuresTrigger,
  ComplexityTrigger,
  createAllTriggers,
} from './triggers';

// ============================================================================
// Integration
// ============================================================================

export {
  ReplannerIntegration,
  ReplannerEventEmitterImpl,
  createReplannerIntegration,
  computeMetricsFromContext,
} from './ReplannerIntegration';

export type {
  ReplannerEventType,
  ReplannerEventPayload,
  ReplannerEventHandler,
  IReplannerEventEmitter,
  ReplannerIntegrationConfig,
} from './ReplannerIntegration';

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a fully configured Dynamic Replanner with default settings
 *
 * This is a convenience function that creates a replanner with:
 * - All default triggers
 * - Default task splitter
 * - Default thresholds
 *
 * For more control, use createDynamicReplanner directly.
 *
 * @param thresholds Optional custom thresholds
 * @returns Configured DynamicReplanner instance
 */
import { createAllTriggers } from './triggers';
import { TaskSplitter } from './TaskSplitter';
import { createDynamicReplanner } from './DynamicReplanner';
import type { TriggerThresholds, ReplannerEventEmitter } from './types';

export function createDefaultReplanner(
  thresholds?: Partial<TriggerThresholds>,
  eventEmitter?: ReplannerEventEmitter
) {
  const triggers = createAllTriggers();
  const splitter = new TaskSplitter();
  return createDynamicReplanner(triggers, splitter, thresholds, eventEmitter);
}

/**
 * Create a fully configured ReplannerIntegration with default settings
 *
 * This is a convenience function that creates an integration with:
 * - Default replanner (all triggers + default splitter)
 * - Default event emitter
 * - Auto-check enabled
 *
 * @param config Optional partial configuration
 * @returns Configured ReplannerIntegration instance
 */
import { ReplannerIntegration } from './ReplannerIntegration';
import type { ReplannerIntegrationConfig } from './ReplannerIntegration';

export function createDefaultReplannerIntegration(
  config?: Partial<Omit<ReplannerIntegrationConfig, 'replanner'>> & {
    thresholds?: Partial<TriggerThresholds>;
  }
) {
  const replanner = createDefaultReplanner(config?.thresholds);
  return new ReplannerIntegration({
    replanner,
    eventEmitter: config?.eventEmitter,
    autoCheckOnIteration: config?.autoCheckOnIteration,
    minIterationsBeforeCheck: config?.minIterationsBeforeCheck,
  });
}
