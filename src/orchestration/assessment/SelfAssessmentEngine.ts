/**
 * Self-Assessment Engine Core Implementation
 *
 * The main engine that orchestrates progress assessment, blocker detection,
 * approach evaluation, and historical learning for agent self-assessment.
 *
 * Layer 2: Orchestration
 *
 * Philosophy:
 * - Agents should be able to assess their own effectiveness
 * - Assessments are cached for performance
 * - Multiple assessment types combine into unified recommendations
 * - Historical learning improves future assessments
 */

import type {
  ISelfAssessmentEngine,
  IProgressAssessor,
  IBlockerDetector,
  IApproachEvaluator,
  IHistoricalLearner,
  AssessmentContext,
  ProgressAssessment,
  BlockerAssessment,
  ApproachAssessment,
  Recommendation,
  AlternativeApproach,
  TaskOutcome,
  HistoricalInsight,
  FullAssessment,
  CachedAssessment,
  AssessmentCacheConfig,
  AssessmentEventEmitter,
  SelfAssessmentEngineConfig,
  RecommendedAction,
} from './types';

import { DEFAULT_CACHE_CONFIG } from './types';

// ============================================================================
// Types for Cache
// ============================================================================

type AssessmentCacheType = 'progress' | 'blockers' | 'approach';

interface TaskCache {
  progress?: CachedAssessment<ProgressAssessment>;
  blockers?: CachedAssessment<BlockerAssessment>;
  approach?: CachedAssessment<ApproachAssessment>;
  recommendation?: CachedAssessment<Recommendation>;
}

// ============================================================================
// Default Implementations (Stubs for now - will be replaced by actual components)
// ============================================================================

/**
 * Default progress assessor that provides basic assessment
 */
class DefaultProgressAssessor implements IProgressAssessor {
  assess(context: AssessmentContext): Promise<ProgressAssessment> {
    const iterationCount = context.iterationHistory.length;
    const maxIterations = context.maxIterations ?? 20;
    const errorCount = context.currentErrors.length;

    // Calculate completion based on iteration progress and error reduction
    const iterationProgress = iterationCount / maxIterations;
    const hasErrors = errorCount > 0;
    const completionEstimate = hasErrors
      ? Math.min(0.7, iterationProgress * 0.8)
      : Math.min(0.95, iterationProgress);

    // Calculate confidence based on data availability
    const confidence = Math.min(0.9, 0.3 + iterationCount * 0.1);

    // Identify remaining work
    const remainingWork: string[] = [];
    if (hasErrors) {
      remainingWork.push(`Fix ${errorCount} error(s)`);
    }
    if (context.acceptanceCriteria) {
      remainingWork.push(...context.acceptanceCriteria.map((c) => `Complete: ${c}`));
    }

    // Identify completed work
    const completedWork: string[] = [];
    if (iterationCount > 0) {
      completedWork.push(`Completed ${iterationCount} iteration(s)`);
    }

    // Calculate estimated remaining time
    const avgTimePerIteration = context.timeElapsed
      ? context.timeElapsed / Math.max(1, iterationCount)
      : 5; // Default 5 minutes per iteration
    const estimatedRemainingIterations = Math.ceil((1 - completionEstimate) * maxIterations);
    const estimatedRemainingTime = avgTimePerIteration * estimatedRemainingIterations;

    return Promise.resolve({
      taskId: context.taskId,
      completionEstimate,
      confidence,
      remainingWork,
      completedWork,
      blockers: context.currentErrors.map((e) => e.message),
      risks: [],
      estimatedRemainingTime,
      assessedAt: new Date(),
    });
  }
}

/**
 * Default blocker detector that provides basic detection
 */
class DefaultBlockerDetector implements IBlockerDetector {
  detect(context: AssessmentContext): Promise<BlockerAssessment> {
    const blockers = context.currentErrors.map((error, index) => ({
      id: `blocker-${index}`,
      type: 'technical' as const,
      description: error.message,
      affectedFiles: error.file ? [error.file] : [],
      possibleSolutions: ['Review the error message', 'Check related code'],
      needsHuman: false,
      detectedAt: new Date(),
    }));

    const severity =
      blockers.length === 0
        ? ('none' as const)
        : blockers.length <= 2
          ? ('low' as const)
          : blockers.length <= 5
            ? ('medium' as const)
            : blockers.length <= 10
              ? ('high' as const)
              : ('critical' as const);

    return Promise.resolve({
      taskId: context.taskId,
      blockers,
      severity,
      canProceed: severity !== 'critical',
      suggestedActions: blockers.length > 0 ? ['Address errors systematically'] : [],
      assessedAt: new Date(),
    });
  }
}

/**
 * Default approach evaluator that provides basic evaluation
 */
class DefaultApproachEvaluator implements IApproachEvaluator {
  evaluate(context: AssessmentContext): Promise<ApproachAssessment> {
    const errorCount = context.currentErrors.length;
    const iterationCount = context.iterationHistory.length;

    // Determine effectiveness based on error trends
    let effectiveness: ApproachAssessment['effectiveness'] = 'working';
    if (iterationCount > 5 && errorCount > 0) {
      // Check if errors are decreasing
      const recentErrors = context.iterationHistory.slice(-3);
      const errorTrend = recentErrors.map((h) => h.errors.length);
      const isDecreasing = errorTrend.every((e, i) => i === 0 || e <= errorTrend[i - 1]);

      if (!isDecreasing) {
        effectiveness = errorCount > 5 ? 'stuck' : 'struggling';
      }
    }

    // Generate recommendation based on effectiveness
    let recommendation = 'Continue with current approach';
    if (effectiveness === 'struggling') {
      recommendation = 'Consider simplifying the approach or breaking into smaller steps';
    } else if (effectiveness === 'stuck') {
      recommendation = 'Try an alternative approach or request help';
    }

    return Promise.resolve({
      taskId: context.taskId,
      currentApproach: context.agentFeedback ?? 'Standard implementation approach',
      effectiveness,
      confidence: 0.7,
      alternatives: [],
      recommendation,
      assessedAt: new Date(),
    });
  }
}

/**
 * Default historical learner that provides basic learning
 */
class DefaultHistoricalLearner implements IHistoricalLearner {
  private outcomes: TaskOutcome[] = [];

  recordOutcome(outcome: TaskOutcome): Promise<void> {
    this.outcomes.push(outcome);
    return Promise.resolve();
  }

  getInsights(taskType: string): Promise<HistoricalInsight[]> {
    const relevantOutcomes = this.outcomes.filter(
      (o) => o.approach.toLowerCase().includes(taskType.toLowerCase()) || taskType === 'all'
    );

    if (relevantOutcomes.length === 0) {
      return Promise.resolve([]);
    }

    const successCount = relevantOutcomes.filter((o) => o.success).length;
    const avgIterations =
      relevantOutcomes.reduce((sum, o) => sum + o.iterations, 0) / relevantOutcomes.length;
    const avgTime =
      relevantOutcomes.reduce((sum, o) => sum + o.timeSpent, 0) / relevantOutcomes.length;

    // Find common blockers
    const blockerCounts = new Map<string, number>();
    for (const outcome of relevantOutcomes) {
      for (const blocker of outcome.blockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
      }
    }
    const commonBlockers = Array.from(blockerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([blocker]) => blocker);

    // Find best approach
    const successfulOutcomes = relevantOutcomes.filter((o) => o.success);
    const recommendedApproach =
      successfulOutcomes.length > 0
        ? successfulOutcomes[0].approach
        : 'No successful approach found';

    return Promise.resolve([
      {
        pattern: `Tasks of type ${taskType}`,
        taskType,
        successRate: successCount / relevantOutcomes.length,
        averageIterations: avgIterations,
        averageTime: avgTime,
        commonBlockers,
        recommendedApproach,
        sampleSize: relevantOutcomes.length,
      },
    ]);
  }

  findSimilarTasks(taskDescription: string): Promise<TaskOutcome[]> {
    // Simple keyword matching - in real implementation would use embeddings
    const keywords = taskDescription.toLowerCase().split(/\s+/);
    return Promise.resolve(
      this.outcomes.filter((o) => {
        const approachLower = o.approach.toLowerCase();
        return keywords.some((keyword) => approachLower.includes(keyword));
      })
    );
  }
}

// ============================================================================
// Main SelfAssessmentEngine Class
// ============================================================================

/**
 * Self-Assessment Engine
 *
 * Orchestrates all assessment components to provide unified self-assessment
 * capabilities for agents.
 */
export class SelfAssessmentEngine implements ISelfAssessmentEngine {
  private readonly progressAssessor: IProgressAssessor;
  private readonly blockerDetector: IBlockerDetector;
  private readonly approachEvaluator: IApproachEvaluator;
  private readonly historicalLearner: IHistoricalLearner;
  private readonly cacheConfig: AssessmentCacheConfig;
  private readonly eventEmitter?: AssessmentEventEmitter;

  // Task-specific caches
  private readonly cache: Map<string, TaskCache> = new Map();

  // Last contexts for recommendation (when no context provided)
  private readonly lastContexts: Map<string, AssessmentContext> = new Map();

  constructor(config: SelfAssessmentEngineConfig = {}) {
    this.progressAssessor = config.progressAssessor ?? new DefaultProgressAssessor();
    this.blockerDetector = config.blockerDetector ?? new DefaultBlockerDetector();
    this.approachEvaluator = config.approachEvaluator ?? new DefaultApproachEvaluator();
    this.historicalLearner = config.historicalLearner ?? new DefaultHistoricalLearner();
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config.cacheConfig };
    this.eventEmitter = config.eventEmitter;
  }

  // =========================================================================
  // Assessment Methods
  // =========================================================================

  /**
   * Assess task progress
   */
  async assessProgress(taskId: string, context: AssessmentContext): Promise<ProgressAssessment> {
    // Store context for later use
    this.lastContexts.set(taskId, context);

    // Check cache
    const cached = this.getCachedProgressAssessment(taskId);
    if (cached) {
      return cached;
    }

    // Perform assessment
    const assessment = await this.progressAssessor.assess(context);

    // Cache result
    this.setCachedAssessment(taskId, 'progress', assessment, this.cacheConfig.progressTtl);

    // Emit event
    this.eventEmitter?.onProgressAssessed?.(taskId, assessment);

    return assessment;
  }

  /**
   * Assess current blockers
   */
  async assessBlockers(taskId: string, context: AssessmentContext): Promise<BlockerAssessment> {
    // Store context for later use
    this.lastContexts.set(taskId, context);

    // Check cache
    const cached = this.getCachedBlockersAssessment(taskId);
    if (cached) {
      return cached;
    }

    // Perform assessment
    const assessment = await this.blockerDetector.detect(context);

    // Cache result
    this.setCachedAssessment(taskId, 'blockers', assessment, this.cacheConfig.blockersTtl);

    // Emit event
    this.eventEmitter?.onBlockersDetected?.(taskId, assessment);

    return assessment;
  }

  /**
   * Assess current approach
   */
  async assessApproach(taskId: string, context: AssessmentContext): Promise<ApproachAssessment> {
    // Store context for later use
    this.lastContexts.set(taskId, context);

    // Check cache
    const cached = this.getCachedApproachAssessment(taskId);
    if (cached) {
      return cached;
    }

    // Perform assessment
    const assessment = await this.approachEvaluator.evaluate(context);

    // Cache result
    this.setCachedAssessment(taskId, 'approach', assessment, this.cacheConfig.approachTtl);

    // Emit event
    this.eventEmitter?.onApproachEvaluated?.(taskId, assessment);

    return assessment;
  }

  // =========================================================================
  // Recommendation Methods
  // =========================================================================

  /**
   * Get recommendation for next step
   */
  async recommendNextStep(taskId: string): Promise<Recommendation> {
    // Get last context or create minimal one
    const context = this.lastContexts.get(taskId);
    if (!context) {
      return {
        action: 'continue',
        reason: 'No assessment context available',
        details: 'Unable to make informed recommendation without context',
        confidence: 0.3,
        priority: 3,
      };
    }

    // Get cached assessments or perform new ones
    const progress = await this.assessProgress(taskId, context);
    const blockers = await this.assessBlockers(taskId, context);
    const approach = await this.assessApproach(taskId, context);

    // Combine into recommendation
    const recommendation = this.combineIntoRecommendation(progress, blockers, approach);

    // Emit event
    this.eventEmitter?.onRecommendation?.(taskId, recommendation);

    return recommendation;
  }

  /**
   * Get alternative approaches
   */
  async recommendAlternativeApproach(taskId: string): Promise<AlternativeApproach[]> {
    // Get cached approach assessment
    const taskCache = this.cache.get(taskId);
    if (taskCache?.approach) {
      const cachedApproach = taskCache.approach.assessment;
      return cachedApproach.alternatives.sort((a, b) => b.confidence - a.confidence);
    }

    // Get last context or return empty
    const context = this.lastContexts.get(taskId);
    if (!context) {
      return [];
    }

    // Perform approach assessment
    const approach = await this.assessApproach(taskId, context);
    return approach.alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  // =========================================================================
  // Learning Methods
  // =========================================================================

  /**
   * Record a task outcome for learning
   */
  async recordOutcome(outcome: TaskOutcome): Promise<void> {
    // Delegate to historical learner
    await this.historicalLearner.recordOutcome(outcome);

    // Invalidate cache for this task
    this.invalidateCache(outcome.taskId);

    // Clear last context
    this.lastContexts.delete(outcome.taskId);

    // Emit event
    this.eventEmitter?.onOutcomeRecorded?.(outcome.taskId, outcome);
  }

  /**
   * Get historical insights for a task type
   */
  async getHistoricalInsights(taskType: string): Promise<HistoricalInsight[]> {
    return this.historicalLearner.getInsights(taskType);
  }

  // =========================================================================
  // Combined Assessment
  // =========================================================================

  /**
   * Get a full assessment of all aspects
   */
  async getFullAssessment(taskId: string, context: AssessmentContext): Promise<FullAssessment> {
    // Store context
    this.lastContexts.set(taskId, context);

    // Perform all assessments concurrently
    const [progress, blockers, approach] = await Promise.all([
      this.assessProgress(taskId, context),
      this.assessBlockers(taskId, context),
      this.assessApproach(taskId, context),
    ]);

    // Combine into recommendation
    const recommendation = this.combineIntoRecommendation(progress, blockers, approach);

    return {
      taskId,
      progress,
      blockers,
      approach,
      recommendation,
      assessedAt: new Date(),
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Combine assessments into a recommendation
   */
  private combineIntoRecommendation(
    progress: ProgressAssessment,
    blockers: BlockerAssessment,
    approach: ApproachAssessment
  ): Recommendation {
    let action: RecommendedAction = 'continue';
    let reason = 'Making good progress';
    let priority = 3;
    let confidence = 0.7;

    // Check for critical blockers first
    if (blockers.severity === 'critical') {
      action = 'request_help';
      reason = 'Critical blockers detected that require human intervention';
      priority = 1;
      confidence = 0.9;
    }
    // Check for high severity blockers
    else if (blockers.severity === 'high') {
      if (approach.effectiveness === 'stuck' || approach.effectiveness === 'wrong_direction') {
        action = 'try_alternative';
        reason = 'Current approach is not effective and blockers are severe';
        priority = 1;
        confidence = 0.85;
      } else {
        action = 'split_task';
        reason = 'High severity blockers suggest task may need to be broken down';
        priority = 2;
        confidence = 0.75;
      }
    }
    // Check approach effectiveness
    else if (approach.effectiveness === 'stuck') {
      action = 'try_alternative';
      reason = 'Current approach is stuck - try a different method';
      priority = 2;
      confidence = 0.8;
    } else if (approach.effectiveness === 'wrong_direction') {
      action = 'abort';
      reason = 'Current approach is making things worse';
      priority = 1;
      confidence = 0.85;
    } else if (approach.effectiveness === 'struggling') {
      if (progress.completionEstimate < 0.3) {
        action = 'try_alternative';
        reason = 'Struggling early in task - consider different approach';
        priority = 2;
        confidence = 0.7;
      } else {
        action = 'continue';
        reason = 'Some difficulty but progress is being made';
        priority = 3;
        confidence = 0.65;
      }
    }
    // Check for good progress
    else if (progress.completionEstimate > 0.8) {
      action = 'continue';
      reason = 'Almost done - continue to completion';
      priority = 4;
      confidence = 0.9;
    }
    // Check for moderate blockers with good approach (effectiveness is 'working' at this point)
    else if (blockers.severity === 'medium') {
      action = 'continue';
      reason = 'Working through blockers effectively';
      priority = 3;
      confidence = 0.75;
    }
    // Default: continue (approach effectiveness is 'working')
    else {
      action = 'continue';
      reason = 'Progress is acceptable';
      priority = 3;
      confidence = 0.7;
    }

    // Calculate combined confidence
    const combinedConfidence =
      (progress.confidence + approach.confidence + confidence) / 3;

    return {
      action,
      reason,
      details: this.generateRecommendationDetails(progress, blockers, approach, action),
      confidence: combinedConfidence,
      priority,
    };
  }

  /**
   * Generate detailed recommendation text
   */
  private generateRecommendationDetails(
    progress: ProgressAssessment,
    blockers: BlockerAssessment,
    approach: ApproachAssessment,
    action: RecommendedAction
  ): string {
    const details: string[] = [];

    // Add progress info
    details.push(`Progress: ${(progress.completionEstimate * 100).toFixed(0)}% complete`);

    // Add blocker info
    if (blockers.blockers.length > 0) {
      details.push(`Blockers: ${blockers.blockers.length} (${blockers.severity} severity)`);
    }

    // Add approach info
    details.push(`Approach effectiveness: ${approach.effectiveness}`);

    // Add action-specific details
    switch (action) {
      case 'try_alternative':
        if (approach.alternatives.length > 0) {
          details.push(`Consider: ${approach.alternatives[0].description}`);
        }
        break;
      case 'request_help':
        details.push('Human intervention recommended');
        break;
      case 'split_task':
        details.push('Consider breaking task into smaller sub-tasks');
        break;
      case 'abort':
        details.push('Task may need to be re-evaluated');
        break;
      default:
        if (progress.remainingWork.length > 0) {
          details.push(`Next: ${progress.remainingWork[0]}`);
        }
    }

    return details.join('. ');
  }

  /**
   * Get cached progress assessment if still valid
   */
  private getCachedProgressAssessment(taskId: string): ProgressAssessment | undefined {
    const cached = this.getCachedAssessmentByType(taskId, 'progress');
    return cached as ProgressAssessment | undefined;
  }

  /**
   * Get cached blockers assessment if still valid
   */
  private getCachedBlockersAssessment(taskId: string): BlockerAssessment | undefined {
    const cached = this.getCachedAssessmentByType(taskId, 'blockers');
    return cached as BlockerAssessment | undefined;
  }

  /**
   * Get cached approach assessment if still valid
   */
  private getCachedApproachAssessment(taskId: string): ApproachAssessment | undefined {
    const cached = this.getCachedAssessmentByType(taskId, 'approach');
    return cached as ApproachAssessment | undefined;
  }

  /**
   * Get cached assessment by type if still valid
   */
  private getCachedAssessmentByType(
    taskId: string,
    type: AssessmentCacheType
  ): ProgressAssessment | BlockerAssessment | ApproachAssessment | undefined {
    const taskCache = this.cache.get(taskId);
    if (!taskCache) {
      return undefined;
    }

    const cached = taskCache[type];
    if (!cached) {
      return undefined;
    }

    // Check if still valid
    const age = Date.now() - cached.cachedAt.getTime();
    if (age > cached.ttl) {
      return undefined;
    }

    return cached.assessment;
  }

  /**
   * Set cached assessment
   */
  private setCachedAssessment(
    taskId: string,
    type: AssessmentCacheType,
    assessment: ProgressAssessment | BlockerAssessment | ApproachAssessment,
    ttl: number
  ): void {
    let taskCache = this.cache.get(taskId);
    if (!taskCache) {
      taskCache = {};
      this.cache.set(taskId, taskCache);
    }

    // Ensure cache size limit
    if (this.cache.size > this.cacheConfig.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const cachedAt = new Date();

    switch (type) {
      case 'progress':
        taskCache.progress = {
          assessment: assessment as ProgressAssessment,
          cachedAt,
          ttl,
        };
        break;
      case 'blockers':
        taskCache.blockers = {
          assessment: assessment as BlockerAssessment,
          cachedAt,
          ttl,
        };
        break;
      case 'approach':
        taskCache.approach = {
          assessment: assessment as ApproachAssessment,
          cachedAt,
          ttl,
        };
        break;
    }
  }

  /**
   * Invalidate all cached assessments for a task
   */
  private invalidateCache(taskId: string): void {
    this.cache.delete(taskId);
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
    this.lastContexts.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { taskCount: number; totalEntries: number } {
    let totalEntries = 0;
    for (const taskCache of this.cache.values()) {
      if (taskCache.progress) totalEntries++;
      if (taskCache.blockers) totalEntries++;
      if (taskCache.approach) totalEntries++;
      if (taskCache.recommendation) totalEntries++;
    }
    return {
      taskCount: this.cache.size,
      totalEntries,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new SelfAssessmentEngine with default configuration
 */
export function createSelfAssessmentEngine(
  config?: SelfAssessmentEngineConfig
): SelfAssessmentEngine {
  return new SelfAssessmentEngine(config);
}
