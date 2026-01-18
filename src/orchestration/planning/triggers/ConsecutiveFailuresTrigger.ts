/**
 * ConsecutiveFailuresTrigger
 *
 * Evaluates whether a task has too many consecutive failures.
 * Triggers when consecutiveFailures > threshold.
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
 * Trigger evaluator for detecting blocking issues from consecutive failures
 */
export class ConsecutiveFailuresTrigger implements ITriggerEvaluator {
  /**
   * The trigger type this evaluator handles
   */
  readonly trigger: ReplanTrigger = 'blocking_issue';

  /**
   * Evaluate whether the consecutive failures trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult {
    const { consecutiveFailures, errors } = context;

    const triggered = consecutiveFailures > thresholds.consecutiveFailures;

    // Calculate confidence based on how many consecutive failures
    let confidence = 0;
    if (triggered) {
      // More failures = higher confidence
      const overageRatio = consecutiveFailures / thresholds.consecutiveFailures;
      confidence = Math.min(0.6 + (overageRatio - 1) * 0.15, 0.95);
    }

    // Analyze error patterns
    const errorPatterns = this.analyzeErrorPatterns(errors);
    const patternSummary = errorPatterns.length > 0
      ? ` Common error patterns: ${errorPatterns.join(', ')}.`
      : '';

    const details = triggered
      ? `Blocking issue detected: ${consecutiveFailures} consecutive failures ` +
        `(threshold: ${thresholds.consecutiveFailures}).${patternSummary}`
      : `Failure count acceptable: ${consecutiveFailures} consecutive failures ` +
        `(threshold: ${thresholds.consecutiveFailures})`;

    return {
      triggered,
      trigger: this.trigger,
      confidence,
      details,
      metrics: {
        consecutiveFailures,
        errorsEncountered: errors.length,
      },
    };
  }

  /**
   * Analyze error patterns from error entries
   */
  private analyzeErrorPatterns(errors: Array<{ message: string; type?: string }>): string[] {
    if (errors.length === 0) return [];

    const patterns: Map<string, number> = new Map();

    // Common error pattern keywords
    const patternKeywords = [
      'import', 'export', 'module', 'not found', 'undefined',
      'type error', 'syntax', 'reference', 'build', 'compile',
      'timeout', 'permission', 'network', 'connection',
    ];

    for (const error of errors) {
      const message = error.message.toLowerCase();
      for (const keyword of patternKeywords) {
        if (message.includes(keyword)) {
          patterns.set(keyword, (patterns.get(keyword) ?? 0) + 1);
        }
      }
    }

    // Return patterns that appear in at least 2 errors (or 50% of errors)
    const threshold = Math.max(2, Math.floor(errors.length * 0.5));
    const significantPatterns: string[] = [];

    patterns.forEach((count, pattern) => {
      if (count >= threshold) {
        significantPatterns.push(pattern);
      }
    });

    return significantPatterns.slice(0, 3); // Return top 3 patterns
  }
}
