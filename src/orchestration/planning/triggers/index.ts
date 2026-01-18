/**
 * Trigger Evaluators Index
 *
 * Exports all trigger evaluator implementations for the Dynamic Replanner.
 *
 * @module orchestration/planning/triggers
 */

import type { ITriggerEvaluator } from '../types';

// Export individual trigger classes
export { TimeExceededTrigger } from './TimeExceededTrigger';
export { IterationsTrigger } from './IterationsTrigger';
export { ScopeCreepTrigger } from './ScopeCreepTrigger';
export { ConsecutiveFailuresTrigger } from './ConsecutiveFailuresTrigger';
export { ComplexityTrigger } from './ComplexityTrigger';

// Import for factory
import { TimeExceededTrigger } from './TimeExceededTrigger';
import { IterationsTrigger } from './IterationsTrigger';
import { ScopeCreepTrigger } from './ScopeCreepTrigger';
import { ConsecutiveFailuresTrigger } from './ConsecutiveFailuresTrigger';
import { ComplexityTrigger } from './ComplexityTrigger';

/**
 * Create all default trigger evaluators
 *
 * @returns Array of all trigger evaluators
 */
export function createAllTriggers(): ITriggerEvaluator[] {
  return [
    new TimeExceededTrigger(),
    new IterationsTrigger(),
    new ScopeCreepTrigger(),
    new ConsecutiveFailuresTrigger(),
    new ComplexityTrigger(),
  ];
}
