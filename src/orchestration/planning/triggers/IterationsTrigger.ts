/**
 * IterationsTrigger
 *
 * Evaluates whether a task has used a high proportion of allowed iterations.
 * Triggers when iteration / maxIterations > threshold.
 *
 * @module orchestration/planning/triggers
 */

import type {
  ITriggerEvaluator,
  ExecutionContext,
  TriggerThresholds,
  TriggerResult,
  ReplanTrigger,
} from '../types';

/**
 * Trigger evaluator for detecting when iteration count is getting high
 */
export class IterationsTrigger implements ITriggerEvaluator {
  /**
   * The trigger type this evaluator handles
   */
  readonly trigger: ReplanTrigger = 'iterations_high';

  /**
   * Evaluate whether the iterations trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult {
    const { iteration, maxIterations } = context;

    // Handle edge case: no max iterations
    if (maxIterations <= 0) {
      return {
        triggered: false,
        trigger: this.trigger,
        confidence: 0,
        details: 'No maximum iterations configured',
        metrics: {
          iterations: iteration,
          maxIterations,
          iterationRatio: 0,
        },
      };
    }

    const iterationRatio = iteration / maxIterations;
    const triggered = iterationRatio > thresholds.iterationsRatio;

    // Calculate confidence - higher as ratio approaches 1.0
    let confidence = 0;
    if (triggered) {
      // At threshold: 0.5, approaching 1.0: 0.9
      const progressToMax = (iterationRatio - thresholds.iterationsRatio) /
                           (1 - thresholds.iterationsRatio);
      confidence = Math.min(0.5 + progressToMax * 0.4, 0.95);
    }

    const details = triggered
      ? `High iteration usage: ${iteration}/${maxIterations} (${Math.round(iterationRatio * 100)}%) ` +
        `exceeds threshold of ${Math.round(thresholds.iterationsRatio * 100)}%`
      : `Iteration usage acceptable: ${iteration}/${maxIterations} (${Math.round(iterationRatio * 100)}%) ` +
        `below threshold of ${Math.round(thresholds.iterationsRatio * 100)}%`;

    return {
      triggered,
      trigger: this.trigger,
      confidence,
      details,
      metrics: {
        iterations: iteration,
        maxIterations,
        iterationRatio,
      },
    };
  }
}
