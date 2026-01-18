/**
 * Progress Assessor Implementation
 *
 * Evaluates task progress by analyzing multiple signals including
 * iteration progress, error trends, file modifications, and acceptance criteria.
 *
 * Layer 2: Orchestration / Assessment
 *
 * Philosophy:
 * - Progress estimation should be based on multiple signals
 * - Confidence should reflect the certainty of the estimate
 * - Risks should be identified and quantified
 * - Remaining work should be actionable
 */

import type {
  IProgressAssessor,
  AssessmentContext,
  ProgressAssessment,
  Risk,
  RiskType,
  ProgressIndicators,
  ProgressThresholds,
} from './types';

import { DEFAULT_PROGRESS_THRESHOLDS } from './types';

// ============================================================================
// Progress Assessor Class
// ============================================================================

/**
 * Progress Assessor
 *
 * Estimates task completion progress by analyzing:
 * - Iteration count vs maximum
 * - Error count and trends
 * - Files modified vs expected
 * - Acceptance criteria completion
 * - Time elapsed vs estimated
 */
export class ProgressAssessor implements IProgressAssessor {
  private readonly thresholds: ProgressThresholds;

  /**
   * Create a new ProgressAssessor
   *
   * @param thresholds Optional custom thresholds
   */
  constructor(thresholds: Partial<ProgressThresholds> = {}) {
    this.thresholds = { ...DEFAULT_PROGRESS_THRESHOLDS, ...thresholds };
  }

  /**
   * Assess task progress
   *
   * @param context Assessment context
   * @returns Progress assessment
   */
  assess(context: AssessmentContext): Promise<ProgressAssessment> {
    // Calculate progress indicators
    const indicators = this.calculateProgressIndicators(context);

    // Calculate completion estimate
    const completionEstimate = this.calculateCompletionEstimate(context, indicators);

    // Calculate confidence in the estimate
    const confidence = this.calculateConfidence(context, indicators);

    // Identify remaining work
    const remainingWork = this.identifyRemainingWork(context, completionEstimate);

    // Identify completed work
    const completedWork = this.identifyCompletedWork(context);

    // Identify blockers from errors
    const blockers = this.identifyBlockers(context);

    // Assess risks
    const risks = this.assessRisks(context, indicators, completionEstimate);

    // Estimate remaining time
    const estimatedRemainingTime = this.estimateRemainingTime(
      context,
      completionEstimate,
      indicators
    );

    return Promise.resolve({
      taskId: context.taskId,
      completionEstimate,
      confidence,
      remainingWork,
      completedWork,
      blockers,
      risks,
      estimatedRemainingTime,
      assessedAt: new Date(),
    });
  }

  // ===========================================================================
  // Progress Indicators
  // ===========================================================================

  /**
   * Calculate progress indicators from context
   */
  private calculateProgressIndicators(context: AssessmentContext): ProgressIndicators {
    const iterationCount = context.iterationHistory.length;
    const maxIterations = context.maxIterations ?? 20;
    const estimatedTime = context.estimatedTime ?? 60; // Default 60 minutes
    const timeElapsed = context.timeElapsed ?? 0;

    // Calculate ratios
    const iterationRatio = iterationCount / maxIterations;
    const timeRatio = estimatedTime > 0 ? timeElapsed / estimatedTime : 0;

    // Calculate file modification ratio
    const expectedFiles = context.taskFiles.length;
    const modifiedFiles = this.countModifiedFiles(context);
    const fileModificationRatio = expectedFiles > 0 ? modifiedFiles / expectedFiles : 1;

    // Calculate error trend
    const errorTrend = this.calculateErrorTrend(context);

    // Count unique errors
    const uniqueErrors = this.countUniqueErrors(context);

    // Calculate successful streak
    const successfulStreak = this.calculateSuccessfulStreak(context);

    return {
      iterationRatio,
      timeRatio,
      fileModificationRatio,
      errorTrend,
      uniqueErrors,
      successfulStreak,
    };
  }

  /**
   * Count files that appear to have been modified
   */
  private countModifiedFiles(context: AssessmentContext): number {
    // Analyze code changes if available
    if (context.codeChanges) {
      // Count unique files mentioned in changes
      const filePattern = /^\+\+\+\s+(?:b\/)?(.+)$/gm;
      const files = new Set<string>();
      let match;
      while ((match = filePattern.exec(context.codeChanges)) !== null) {
        files.add(match[1]);
      }
      return files.size;
    }

    // Estimate from iteration history
    const filesFromErrors = new Set<string>();
    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        if (error.file) {
          filesFromErrors.add(error.file);
        }
      }
    }

    // If we have files from errors, assume at least that many are being modified
    // Otherwise, estimate based on iteration count
    return filesFromErrors.size > 0
      ? filesFromErrors.size
      : Math.min(context.taskFiles.length, Math.ceil(context.iterationHistory.length / 3));
  }

  /**
   * Calculate error trend (decreasing, stable, increasing)
   */
  private calculateErrorTrend(
    context: AssessmentContext
  ): 'decreasing' | 'stable' | 'increasing' {
    const history = context.iterationHistory;
    if (history.length < 3) {
      return 'stable';
    }

    // Look at last 5 iterations or all if fewer
    const recentHistory = history.slice(-5);
    const errorCounts = recentHistory.map((h) => h.errors.length);

    // Calculate linear trend
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    const n = errorCounts.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += errorCounts[i];
      sumXY += i * errorCounts[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend based on slope
    if (slope < -0.2) {
      return 'decreasing';
    } else if (slope > 0.2) {
      return 'increasing';
    }
    return 'stable';
  }

  /**
   * Count unique error messages
   */
  private countUniqueErrors(context: AssessmentContext): number {
    const uniqueMessages = new Set<string>();

    // From current errors
    for (const error of context.currentErrors) {
      uniqueMessages.add(this.normalizeErrorMessage(error.message));
    }

    // From iteration history
    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        uniqueMessages.add(this.normalizeErrorMessage(error.message));
      }
    }

    return uniqueMessages.size;
  }

  /**
   * Normalize error message for comparison
   */
  private normalizeErrorMessage(message: string): string {
    // Remove line numbers, file paths, and variable parts
    return message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/['"`][^'"`]+['"`]/g, 'STR') // Replace strings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Calculate consecutive successful iterations
   */
  private calculateSuccessfulStreak(context: AssessmentContext): number {
    const history = context.iterationHistory;
    let streak = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      // Check for success by verifying no errors occurred
      if (history[i].errors.length === 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // ===========================================================================
  // Completion Estimation
  // ===========================================================================

  /**
   * Calculate completion estimate from multiple signals
   */
  private calculateCompletionEstimate(
    context: AssessmentContext,
    indicators: ProgressIndicators
  ): number {
    // Weight different signals
    const weights = {
      iterationProgress: 0.25,
      errorReduction: 0.30,
      fileModification: 0.20,
      successStreak: 0.15,
      timeProgress: 0.10,
    };

    // Calculate iteration-based progress
    const iterationProgress = Math.min(1, indicators.iterationRatio * 1.2); // Allow slight overshoot

    // Calculate error-based progress
    const currentErrors = context.currentErrors.length;
    const totalErrors = indicators.uniqueErrors;
    const errorReduction =
      totalErrors > 0
        ? indicators.errorTrend === 'decreasing'
          ? 0.8 + (1 - currentErrors / totalErrors) * 0.2
          : indicators.errorTrend === 'stable'
            ? 0.5
            : 0.3
        : 1.0;

    // File modification progress
    const fileProgress = indicators.fileModificationRatio;

    // Success streak bonus (max 10% boost)
    const successStreakBonus = Math.min(0.1, indicators.successfulStreak * 0.02);

    // Time-based progress (soft signal)
    const timeProgress = Math.min(1, indicators.timeRatio);

    // Combine weighted signals
    let estimate =
      iterationProgress * weights.iterationProgress +
      errorReduction * weights.errorReduction +
      fileProgress * weights.fileModification +
      (iterationProgress + successStreakBonus) * weights.successStreak +
      timeProgress * weights.timeProgress;

    // Apply error penalty if current errors exist
    if (currentErrors > 0) {
      estimate = Math.min(estimate, 0.9); // Can't be "done" with errors
      estimate -= Math.min(0.2, currentErrors * 0.02); // Penalty per error
    }

    // Ensure bounds
    return Math.max(0, Math.min(1, estimate));
  }

  // ===========================================================================
  // Confidence Calculation
  // ===========================================================================

  /**
   * Calculate confidence in the estimate
   */
  private calculateConfidence(
    context: AssessmentContext,
    indicators: ProgressIndicators
  ): number {
    let confidence = this.thresholds.minimumConfidence;

    // More iterations = more confidence
    const iterationBonus = Math.min(0.3, context.iterationHistory.length * 0.03);
    confidence += iterationBonus;

    // Decreasing errors = more confidence
    if (indicators.errorTrend === 'decreasing') {
      confidence += 0.15;
    } else if (indicators.errorTrend === 'stable') {
      confidence += 0.05;
    } else {
      confidence -= 0.1;
    }

    // Success streak = more confidence
    confidence += Math.min(0.2, indicators.successfulStreak * 0.05);

    // File coverage = more confidence
    if (indicators.fileModificationRatio >= 0.8) {
      confidence += 0.1;
    }

    // Fewer unique errors = more confidence
    if (indicators.uniqueErrors <= 3) {
      confidence += 0.1;
    } else if (indicators.uniqueErrors > 10) {
      confidence -= 0.1;
    }

    // Ensure bounds
    return Math.max(this.thresholds.minimumConfidence, Math.min(0.95, confidence));
  }

  // ===========================================================================
  // Work Identification
  // ===========================================================================

  /**
   * Identify remaining work items
   */
  private identifyRemainingWork(
    context: AssessmentContext,
    completionEstimate: number
  ): string[] {
    const remainingWork: string[] = [];

    // Add error fixes
    const errorCount = context.currentErrors.length;
    if (errorCount > 0) {
      if (errorCount === 1) {
        remainingWork.push(`Fix remaining error: ${context.currentErrors[0].message.slice(0, 80)}`);
      } else {
        remainingWork.push(`Fix ${errorCount} remaining error(s)`);

        // Add specific error categories
        const errorCategories = this.categorizeErrors(context.currentErrors);
        for (const [category, count] of Object.entries(errorCategories)) {
          if (count > 1) {
            remainingWork.push(`  - ${count} ${category} error(s)`);
          }
        }
      }
    }

    // Add acceptance criteria not yet met
    if (context.acceptanceCriteria) {
      // Estimate which criteria are likely remaining based on completion
      const estimatedRemaining = Math.ceil(
        context.acceptanceCriteria.length * (1 - completionEstimate)
      );

      if (estimatedRemaining > 0) {
        remainingWork.push(`Complete ~${estimatedRemaining} acceptance criteria`);

        // Add specific criteria if we're past halfway
        if (completionEstimate > 0.5 && context.acceptanceCriteria.length <= 5) {
          for (const criterion of context.acceptanceCriteria.slice(-estimatedRemaining)) {
            remainingWork.push(`  - ${criterion.slice(0, 60)}`);
          }
        }
      }
    }

    // Add untouched files
    const modifiedFiles = this.getModifiedFiles(context);
    const untouchedFiles = context.taskFiles.filter((f) => !modifiedFiles.has(f));
    if (untouchedFiles.length > 0) {
      if (untouchedFiles.length <= 3) {
        for (const file of untouchedFiles) {
          remainingWork.push(`Modify: ${file}`);
        }
      } else {
        remainingWork.push(`Modify ${untouchedFiles.length} remaining file(s)`);
      }
    }

    // Add general remaining work based on progress
    if (completionEstimate < this.thresholds.goodProgress) {
      remainingWork.push('Continue implementing core functionality');
    } else if (completionEstimate < this.thresholds.almostDone) {
      remainingWork.push('Complete remaining implementation details');
    } else {
      remainingWork.push('Finalize and verify implementation');
    }

    return remainingWork;
  }

  /**
   * Get set of modified files from context
   */
  private getModifiedFiles(context: AssessmentContext): Set<string> {
    const files = new Set<string>();

    // From code changes
    if (context.codeChanges) {
      const filePattern = /^\+\+\+\s+(?:b\/)?(.+)$/gm;
      let match;
      while ((match = filePattern.exec(context.codeChanges)) !== null) {
        files.add(match[1]);
      }
    }

    // From error locations
    for (const error of context.currentErrors) {
      if (error.file) {
        files.add(error.file);
      }
    }

    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        if (error.file) {
          files.add(error.file);
        }
      }
    }

    return files;
  }

  /**
   * Categorize errors by type
   */
  private categorizeErrors(
    errors: Array<{ message: string }>
  ): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const error of errors) {
      const category = this.categorizeError(error.message);
      categories[category] = (categories[category] ?? 0) + 1;
    }

    return categories;
  }

  /**
   * Categorize a single error
   */
  private categorizeError(message: string): string {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('type') || messageLower.includes('assignable')) {
      return 'type';
    }
    if (messageLower.includes('import') || messageLower.includes('module')) {
      return 'import';
    }
    if (messageLower.includes('syntax') || messageLower.includes('unexpected')) {
      return 'syntax';
    }
    if (messageLower.includes('test') || messageLower.includes('expect')) {
      return 'test';
    }
    if (messageLower.includes('cannot find') || messageLower.includes('not found')) {
      return 'not found';
    }
    return 'other';
  }

  /**
   * Identify completed work items
   */
  private identifyCompletedWork(context: AssessmentContext): string[] {
    const completedWork: string[] = [];

    // Add iterations completed
    if (context.iterationHistory.length > 0) {
      completedWork.push(`Completed ${context.iterationHistory.length} iteration(s)`);
    }

    // Add successful iterations (iterations with no errors)
    const successfulIterations = context.iterationHistory.filter(
      (h) => h.errors.length === 0
    ).length;
    if (successfulIterations > 0) {
      completedWork.push(`${successfulIterations} successful iteration(s)`);
    }

    // Add files touched
    const modifiedFiles = this.getModifiedFiles(context);
    if (modifiedFiles.size > 0) {
      completedWork.push(`Modified ${modifiedFiles.size} file(s)`);
    }

    // Add errors fixed (errors that appeared but are now gone)
    const resolvedErrors = this.countResolvedErrors(context);
    if (resolvedErrors > 0) {
      completedWork.push(`Fixed ${resolvedErrors} error(s)`);
    }

    return completedWork;
  }

  /**
   * Count errors that were resolved
   */
  private countResolvedErrors(context: AssessmentContext): number {
    const allHistoricalErrors = new Set<string>();
    const currentErrorMessages = new Set<string>();

    // Collect current error messages
    for (const error of context.currentErrors) {
      currentErrorMessages.add(this.normalizeErrorMessage(error.message));
    }

    // Collect all historical error messages
    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        allHistoricalErrors.add(this.normalizeErrorMessage(error.message));
      }
    }

    // Count how many historical errors are no longer present
    let resolved = 0;
    for (const error of allHistoricalErrors) {
      if (!currentErrorMessages.has(error)) {
        resolved++;
      }
    }

    return resolved;
  }

  // ===========================================================================
  // Blocker Identification
  // ===========================================================================

  /**
   * Identify blockers from errors
   */
  private identifyBlockers(context: AssessmentContext): string[] {
    const blockers: string[] = [];

    // Add persistent errors (same error appearing multiple times)
    const errorFrequency = new Map<string, number>();
    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        const normalized = this.normalizeErrorMessage(error.message);
        errorFrequency.set(normalized, (errorFrequency.get(normalized) ?? 0) + 1);
      }
    }

    for (const [error, count] of errorFrequency) {
      if (count >= 3) {
        blockers.push(`Persistent error (${count}x): ${error.slice(0, 60)}`);
      }
    }

    // Add current critical errors
    for (const error of context.currentErrors) {
      const messageLower = error.message.toLowerCase();
      if (
        messageLower.includes('cannot find') ||
        messageLower.includes('not found') ||
        messageLower.includes('circular') ||
        messageLower.includes('memory') ||
        messageLower.includes('timeout')
      ) {
        blockers.push(`Critical: ${error.message.slice(0, 80)}`);
      }
    }

    return blockers;
  }

  // ===========================================================================
  // Risk Assessment
  // ===========================================================================

  /**
   * Assess risks based on context and indicators
   */
  private assessRisks(
    context: AssessmentContext,
    indicators: ProgressIndicators,
    completionEstimate: number
  ): Risk[] {
    const risks: Risk[] = [];

    // Time risk
    if (indicators.timeRatio > 0.8 && completionEstimate < 0.6) {
      risks.push(this.createRisk(
        'time',
        'Running out of time',
        'Elapsed time exceeds 80% of estimate but completion is below 60%',
        0.8,
        0.7,
        'Consider simplifying scope or requesting time extension'
      ));
    } else if (indicators.timeRatio > 1.0) {
      risks.push(this.createRisk(
        'time',
        'Time limit exceeded',
        'Already past the estimated time',
        1.0,
        0.8,
        'Re-evaluate task scope and time estimates'
      ));
    }

    // Technical risk
    if (indicators.errorTrend === 'increasing') {
      risks.push(this.createRisk(
        'technical',
        'Error count increasing',
        'Errors are growing rather than decreasing over iterations',
        0.7,
        0.6,
        'Review approach and consider alternative implementation'
      ));
    }

    if (indicators.uniqueErrors > 10) {
      risks.push(this.createRisk(
        'technical',
        'High error count',
        `${indicators.uniqueErrors} unique errors encountered`,
        0.6,
        0.5,
        'Consider breaking task into smaller parts'
      ));
    }

    // Scope risk
    const modifiedFiles = this.getModifiedFiles(context);
    const extraFiles = Array.from(modifiedFiles).filter(
      (f) => !context.taskFiles.includes(f)
    );
    if (extraFiles.length > 3) {
      risks.push(this.createRisk(
        'scope',
        'Scope creep detected',
        `Modifying ${extraFiles.length} files outside original scope`,
        0.6,
        0.5,
        'Re-evaluate if additional files are necessary'
      ));
    }

    // Quality risk
    if (indicators.iterationRatio > 0.7 && indicators.successfulStreak === 0) {
      risks.push(this.createRisk(
        'quality',
        'No recent successful iterations',
        'Many iterations used without successful completion',
        0.5,
        0.4,
        'Focus on achieving at least one clean iteration'
      ));
    }

    return risks;
  }

  /**
   * Create a risk object with calculated score
   */
  private createRisk(
    type: RiskType,
    description: string,
    details: string,
    probability: number,
    impact: number,
    mitigation: string
  ): Risk {
    return {
      type,
      description: `${description}: ${details}`,
      probability,
      impact,
      riskScore: probability * impact,
      mitigation,
    };
  }

  // ===========================================================================
  // Time Estimation
  // ===========================================================================

  /**
   * Estimate remaining time
   */
  private estimateRemainingTime(
    context: AssessmentContext,
    completionEstimate: number,
    indicators: ProgressIndicators
  ): number {
    // Calculate average time per iteration
    const iterationCount = context.iterationHistory.length;
    const timeElapsed = context.timeElapsed ?? 0;

    let avgTimePerIteration: number;
    if (iterationCount > 0 && timeElapsed > 0) {
      avgTimePerIteration = timeElapsed / iterationCount;
    } else if (context.estimatedTime && context.maxIterations) {
      avgTimePerIteration = context.estimatedTime / context.maxIterations;
    } else {
      avgTimePerIteration = 5; // Default 5 minutes
    }

    // Estimate remaining iterations
    const remainingProgress = 1 - completionEstimate;
    const maxIterations = context.maxIterations ?? 20;
    const estimatedRemainingIterations = Math.ceil(remainingProgress * maxIterations);

    // Calculate base remaining time
    let remainingTime = avgTimePerIteration * estimatedRemainingIterations;

    // Adjust for error trend
    if (indicators.errorTrend === 'increasing') {
      remainingTime *= 1.3; // 30% more time if errors increasing
    } else if (indicators.errorTrend === 'decreasing') {
      remainingTime *= 0.9; // 10% less time if errors decreasing
    }

    // Adjust for current errors
    if (context.currentErrors.length > 5) {
      remainingTime *= 1.2; // 20% more time for many errors
    }

    // Minimum 2 minutes if not complete
    return completionEstimate < 1 ? Math.max(2, Math.round(remainingTime)) : 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ProgressAssessor with optional custom thresholds
 */
export function createProgressAssessor(
  thresholds?: Partial<ProgressThresholds>
): ProgressAssessor {
  return new ProgressAssessor(thresholds);
}
