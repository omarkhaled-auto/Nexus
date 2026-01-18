/**
 * TimeExceededTrigger
 *
 * Evaluates whether a task has exceeded its estimated time.
 * Triggers when timeElapsed / estimatedTime > threshold.
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
 * Trigger evaluator for detecting when tasks exceed their time estimate
 */
export class TimeExceededTrigger implements ITriggerEvaluator {
  /**
   * The trigger type this evaluator handles
   */
  readonly trigger: ReplanTrigger = 'time_exceeded';

  /**
   * Evaluate whether the time exceeded trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult {
    const { timeElapsed, estimatedTime } = context;

    // Handle edge case: no estimated time
    if (estimatedTime <= 0) {
      return {
        triggered: false,
        trigger: this.trigger,
        confidence: 0,
        details: 'No time estimate provided for task',
        metrics: {
          timeElapsed,
          estimatedTime,
          timeRatio: 0,
        },
      };
    }

    const timeRatio = timeElapsed / estimatedTime;
    const triggered = timeRatio > thresholds.timeExceededRatio;

    // Calculate confidence based on how much over the threshold
    // Higher ratio = higher confidence
    let confidence = 0;
    if (triggered) {
      // At threshold: 0.5, at 2x threshold: 0.9
      const overageRatio = timeRatio / thresholds.timeExceededRatio;
      confidence = Math.min(0.5 + (overageRatio - 1) * 0.4, 0.95);
    }

    const details = triggered
      ? `Task is taking ${Math.round(timeRatio * 100)}% of estimated time ` +
        `(${timeElapsed}min elapsed, ${estimatedTime}min estimated, ` +
        `threshold: ${Math.round(thresholds.timeExceededRatio * 100)}%)`
      : `Time within acceptable range: ${Math.round(timeRatio * 100)}% of estimate ` +
        `(threshold: ${Math.round(thresholds.timeExceededRatio * 100)}%)`;

    return {
      triggered,
      trigger: this.trigger,
      confidence,
      details,
      metrics: {
        timeElapsed,
        estimatedTime,
        timeRatio,
      },
    };
  }
}
