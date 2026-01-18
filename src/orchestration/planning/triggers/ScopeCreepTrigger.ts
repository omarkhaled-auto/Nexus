/**
 * ScopeCreepTrigger
 *
 * Evaluates whether a task is modifying more files than expected.
 * Triggers when number of unexpected files > threshold.
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
 * Trigger evaluator for detecting scope creep (unexpected file modifications)
 */
export class ScopeCreepTrigger implements ITriggerEvaluator {
  /**
   * The trigger type this evaluator handles
   */
  readonly trigger: ReplanTrigger = 'scope_creep';

  /**
   * Evaluate whether the scope creep trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult {
    const { filesExpected, filesModified } = context;

    // Normalize paths for comparison (lowercase, forward slashes)
    const normalizedExpected = new Set(
      filesExpected.map(f => this.normalizePath(f))
    );

    // Find unexpected files
    const unexpectedFiles: string[] = [];
    for (const file of filesModified) {
      const normalizedFile = this.normalizePath(file);
      if (!normalizedExpected.has(normalizedFile)) {
        unexpectedFiles.push(file);
      }
    }

    const scopeCreepCount = unexpectedFiles.length;
    const triggered = scopeCreepCount > thresholds.scopeCreepFiles;

    // Calculate confidence based on how many extra files
    let confidence = 0;
    if (triggered) {
      // More unexpected files = higher confidence
      const overageRatio = scopeCreepCount / thresholds.scopeCreepFiles;
      confidence = Math.min(0.5 + (overageRatio - 1) * 0.2, 0.95);
    }

    const details = triggered
      ? `Scope creep detected: ${scopeCreepCount} unexpected files modified ` +
        `(threshold: ${thresholds.scopeCreepFiles}). ` +
        `Unexpected files: ${unexpectedFiles.slice(0, 5).join(', ')}` +
        (unexpectedFiles.length > 5 ? ` and ${unexpectedFiles.length - 5} more` : '')
      : `Scope within bounds: ${scopeCreepCount} unexpected files ` +
        `(threshold: ${thresholds.scopeCreepFiles})`;

    return {
      triggered,
      trigger: this.trigger,
      confidence,
      details,
      metrics: {
        filesModified: filesModified.length,
        filesExpected: filesExpected.length,
        scopeCreepCount,
      },
    };
  }

  /**
   * Normalize a file path for comparison
   */
  private normalizePath(path: string): string {
    return path
      .toLowerCase()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/');
  }
}
