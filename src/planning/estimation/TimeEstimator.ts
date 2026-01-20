/**
 * TimeEstimator Implementation
 *
 * Provides heuristic-based time estimation for tasks with historical
 * calibration support. Implements ITimeEstimator interface for
 * NexusCoordinator integration.
 *
 * Phase 14B: Execution Bindings Implementation
 */

import type { ITimeEstimator, PlanningTask } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration factors for time estimation
 */
export interface EstimationFactors {
  /** Minutes per file to modify (default: 5) */
  fileWeight: number;
  /** Multiplier for complex tasks (default: 1.5) */
  complexityMultiplier: number;
  /** Additional minutes if tests are needed (default: 10) */
  testWeight: number;
  /** Base time for any task (default: 10) */
  baseTime: number;
  /** Maximum time per task (default: 30) */
  maxTime: number;
  /** Minimum time per task (default: 5) */
  minTime: number;
}

/**
 * Detailed estimation result with breakdown
 */
export interface EstimationResult {
  /** Final estimated time in minutes */
  estimatedMinutes: number;
  /** Confidence level of the estimate */
  confidence: 'high' | 'medium' | 'low';
  /** Breakdown of time components */
  breakdown: {
    base: number;
    files: number;
    complexity: number;
    tests: number;
  };
  /** Factors that influenced the estimate */
  factors: string[];
}

/**
 * Configuration options for TimeEstimator
 */
export interface TimeEstimatorConfig {
  /** Custom estimation factors */
  factors?: Partial<EstimationFactors>;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Maximum historical data points to keep per category */
  maxHistoryPerCategory?: number;
}

/**
 * Complexity level of a task
 */
export type ComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Task category for historical tracking
 */
export type TaskCategory = 'test' | 'ui' | 'backend' | 'infrastructure' | 'general';

// ============================================================================
// TimeEstimator Implementation
// ============================================================================

/**
 * TimeEstimator - Provides heuristic-based time estimation with calibration
 *
 * This implementation:
 * - Uses heuristics based on file count, complexity, and test requirements
 * - Tracks historical actual times for calibration
 * - Adjusts estimates based on historical accuracy
 * - Categorizes tasks for better estimation accuracy
 */
export class TimeEstimator implements ITimeEstimator {
  private factors: EstimationFactors;
  private historicalData: Map<TaskCategory, number[]>;
  private verbose: boolean;
  private maxHistoryPerCategory: number;

  constructor(config?: TimeEstimatorConfig) {
    this.factors = {
      fileWeight: config?.factors?.fileWeight ?? 5,
      complexityMultiplier: config?.factors?.complexityMultiplier ?? 1.5,
      testWeight: config?.factors?.testWeight ?? 10,
      baseTime: config?.factors?.baseTime ?? 10,
      maxTime: config?.factors?.maxTime ?? 30,
      minTime: config?.factors?.minTime ?? 5,
    };
    this.historicalData = new Map();
    this.verbose = config?.verbose ?? false;
    this.maxHistoryPerCategory = config?.maxHistoryPerCategory ?? 100;
  }

  /**
   * Estimate time for a single task
   */
  async estimate(task: PlanningTask): Promise<number> {
    const result = this.estimateDetailed(task);
    return result.estimatedMinutes;
  }

  /**
   * Estimate total time for a set of tasks
   * Accounts for parallel execution when possible
   */
  async estimateTotal(tasks: PlanningTask[]): Promise<number> {
    if (tasks.length === 0) return 0;

    // Simple sum for now - could be enhanced to account for parallelism
    let total = 0;
    for (const task of tasks) {
      const estimate = await this.estimate(task);
      total += estimate;
    }

    if (this.verbose) {
      console.log(`Estimated total time for ${tasks.length} tasks: ${total} minutes`);
    }

    return total;
  }

  /**
   * Calibrate estimator with actual data
   * Records actual time taken for a task to improve future estimates
   */
  calibrate(task: PlanningTask, actualMinutes: number): void {
    const category = this.categorizeTask(task);
    const history = this.historicalData.get(category) || [];
    history.push(actualMinutes);

    // Keep only the most recent data points
    if (history.length > this.maxHistoryPerCategory) {
      history.shift();
    }

    this.historicalData.set(category, history);

    if (this.verbose) {
      console.log(
        `Calibrated ${category} task: actual=${actualMinutes}min, ` +
          `history size=${history.length}`
      );
    }
  }

  /**
   * Get detailed estimation with breakdown
   */
  estimateDetailed(task: PlanningTask): EstimationResult {
    let estimate = this.factors.baseTime;
    const factors: string[] = [];
    const breakdown = {
      base: this.factors.baseTime,
      files: 0,
      complexity: 0,
      tests: 0,
    };

    // Add time based on file count
    const fileCount = task.files?.length || 1;
    const fileTime = fileCount * this.factors.fileWeight;
    estimate += fileTime;
    breakdown.files = fileTime;
    if (fileCount > 1) {
      factors.push(`${fileCount} files`);
    }

    // Assess complexity and add multiplier
    const complexity = this.assessComplexity(task);
    if (complexity === 'high') {
      const complexityTime = estimate * (this.factors.complexityMultiplier - 1);
      estimate += complexityTime;
      breakdown.complexity = complexityTime;
      factors.push('high complexity');
    } else if (complexity === 'medium') {
      // Small multiplier for medium complexity
      const complexityTime = estimate * 0.2;
      estimate += complexityTime;
      breakdown.complexity = complexityTime;
      factors.push('medium complexity');
    }

    // Add time for tests if required
    if (this.requiresTests(task)) {
      estimate += this.factors.testWeight;
      breakdown.tests = this.factors.testWeight;
      factors.push('includes tests');
    }

    // Blend with historical data if available
    const historical = this.getHistoricalAverage(task);
    if (historical !== null) {
      const originalEstimate = estimate;
      estimate = (estimate + historical) / 2;
      if (this.verbose) {
        console.log(
          `Blended estimate: heuristic=${originalEstimate.toFixed(1)}, ` +
            `historical=${historical.toFixed(1)}, final=${estimate.toFixed(1)}`
        );
      }
      factors.push('historical adjustment');
    }

    // Cap between min and max
    const finalEstimate = Math.min(
      Math.max(Math.round(estimate), this.factors.minTime),
      this.factors.maxTime
    );

    return {
      estimatedMinutes: finalEstimate,
      confidence: this.getConfidence(task, historical),
      breakdown,
      factors,
    };
  }

  /**
   * Get average estimation accuracy from historical data
   * Returns ratio of actual/estimated - values > 1 mean underestimating
   */
  getAccuracy(category?: TaskCategory): { ratio: number; sampleSize: number } | null {
    const categories = category
      ? [category]
      : (Array.from(this.historicalData.keys()));

    let totalActual = 0;
    let sampleSize = 0;

    for (const cat of categories) {
      const history = this.historicalData.get(cat);
      if (history && history.length > 0) {
        totalActual += history.reduce((a, b) => a + b, 0);
        sampleSize += history.length;
      }
    }

    if (sampleSize === 0) return null;

    // Compare to baseline (assume 20 minutes average per task)
    const avgActual = totalActual / sampleSize;
    const baseline = 20;

    return {
      ratio: avgActual / baseline,
      sampleSize,
    };
  }

  /**
   * Reset calibration data
   */
  resetCalibration(category?: TaskCategory): void {
    if (category) {
      this.historicalData.delete(category);
    } else {
      this.historicalData.clear();
    }

    if (this.verbose) {
      console.log(
        category
          ? `Reset calibration for ${category}`
          : 'Reset all calibration data'
      );
    }
  }

  /**
   * Get current estimation factors
   */
  getFactors(): EstimationFactors {
    return { ...this.factors };
  }

  /**
   * Update estimation factors
   */
  setFactors(factors: Partial<EstimationFactors>): void {
    this.factors = {
      ...this.factors,
      ...factors,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Assess task complexity based on description and requirements
   */
  private assessComplexity(task: PlanningTask): ComplexityLevel {
    const description = (task.description || '').toLowerCase();
    const name = (task.name || '').toLowerCase();
    const text = description + ' ' + name;

    // High complexity indicators
    const highIndicators = [
      'algorithm',
      'optimize',
      'refactor',
      'complex',
      'integration',
      'security',
      'authentication',
      'encryption',
      'database migration',
      'state machine',
      'concurrent',
      'parallel',
      'async',
      'distributed',
      'architecture',
      'redesign',
    ];

    // Low complexity indicators
    const lowIndicators = [
      'rename',
      'move',
      'delete',
      'simple',
      'basic',
      'typo',
      'comment',
      'format',
      'lint',
      'config',
      'update dependency',
      'bump version',
      'add log',
      'fix import',
    ];

    const highCount = highIndicators.filter((i) => text.includes(i)).length;
    const lowCount = lowIndicators.filter((i) => text.includes(i)).length;

    // Also consider file count and test criteria
    const fileCount = task.files?.length || 0;
    const criteriaCount = task.testCriteria?.length || 0;

    if (highCount >= 2 || fileCount >= 5 || criteriaCount >= 5) {
      return 'high';
    }
    if (lowCount >= 2 || (fileCount <= 1 && criteriaCount <= 1)) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Check if task requires test implementation
   */
  private requiresTests(task: PlanningTask): boolean {
    const description = (task.description || '').toLowerCase();
    const criteria = (task.testCriteria || []).join(' ').toLowerCase();
    const text = description + ' ' + criteria;

    return (
      text.includes('test') ||
      text.includes('verify') ||
      text.includes('coverage') ||
      text.includes('spec') ||
      task.files?.some(
        (f) =>
          f.includes('.test.') ||
          f.includes('.spec.') ||
          f.includes('__tests__')
      ) ||
      false
    );
  }

  /**
   * Categorize task for historical tracking
   */
  private categorizeTask(task: PlanningTask): TaskCategory {
    const files = task.files || [];
    const description = (task.description || '').toLowerCase();

    if (
      files.some((f) => f.includes('test') || f.includes('spec')) ||
      description.includes('test')
    ) {
      return 'test';
    }
    if (
      files.some(
        (f) =>
          f.includes('component') ||
          f.includes('ui') ||
          f.includes('.tsx') ||
          f.includes('.vue') ||
          f.includes('.svelte')
      )
    ) {
      return 'ui';
    }
    if (
      files.some(
        (f) =>
          f.includes('api') ||
          f.includes('service') ||
          f.includes('controller') ||
          f.includes('route')
      )
    ) {
      return 'backend';
    }
    if (
      files.some(
        (f) =>
          f.includes('config') ||
          f.includes('setup') ||
          f.includes('infrastructure')
      ) ||
      description.includes('config') ||
      description.includes('setup')
    ) {
      return 'infrastructure';
    }
    return 'general';
  }

  /**
   * Get historical average for task category
   */
  private getHistoricalAverage(task: PlanningTask): number | null {
    const category = this.categorizeTask(task);
    const history = this.historicalData.get(category);

    // Require at least 5 data points for historical adjustment
    if (!history || history.length < 5) {
      return null;
    }

    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  /**
   * Determine confidence level for estimate
   */
  private getConfidence(
    task: PlanningTask,
    historical: number | null
  ): 'high' | 'medium' | 'low' {
    // High confidence if we have historical data
    if (historical !== null) {
      return 'high';
    }

    // Medium confidence if task has good metadata
    if (
      task.files &&
      task.files.length > 0 &&
      task.description &&
      task.description.length > 50
    ) {
      return 'medium';
    }

    // Low confidence otherwise
    return 'low';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TimeEstimator instance
 */
export function createTimeEstimator(config?: TimeEstimatorConfig): TimeEstimator {
  return new TimeEstimator(config);
}
