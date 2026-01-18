/**
 * Historical Learner Implementation
 *
 * Learns from past task outcomes to provide insights and recommendations
 * for future similar tasks.
 *
 * Layer 2: Orchestration
 *
 * Philosophy:
 * - Learning from history improves future performance
 * - Similar tasks should benefit from past experiences
 * - Patterns in blockers and approaches should be identified
 * - Success and failure patterns inform recommendations
 */

import type {
  IHistoricalLearner,
  TaskOutcome,
  HistoricalInsight,
} from './types';

// ============================================================================
// Types for Storage
// ============================================================================

/**
 * Storage interface for persistence
 */
export interface IOutcomeStorage {
  /** Save an outcome */
  save(outcome: TaskOutcome): Promise<void>;
  /** Get all outcomes */
  getAll(): Promise<TaskOutcome[]>;
  /** Get outcomes by task type */
  getByType(taskType: string): Promise<TaskOutcome[]>;
  /** Search outcomes by keywords */
  searchByKeywords(keywords: string[]): Promise<TaskOutcome[]>;
  /** Clear all outcomes */
  clear(): Promise<void>;
}

/**
 * Configuration for the Historical Learner
 */
export interface HistoricalLearnerConfig {
  /** Storage implementation for outcomes */
  storage?: IOutcomeStorage;
  /** Minimum sample size for generating insights (default: 3) */
  minSampleSize: number;
  /** Maximum outcomes to keep in memory (default: 1000) */
  maxOutcomes: number;
  /** Keywords to extract from task descriptions */
  keywordExtractors?: KeywordExtractor[];
}

/**
 * Keyword extractor function
 */
export type KeywordExtractor = (text: string) => string[];

/**
 * Default configuration
 */
export const DEFAULT_HISTORICAL_LEARNER_CONFIG: HistoricalLearnerConfig = {
  minSampleSize: 3,
  maxOutcomes: 1000,
};

// ============================================================================
// In-Memory Storage Implementation
// ============================================================================

/**
 * In-memory storage for outcomes (default implementation)
 */
export class InMemoryOutcomeStorage implements IOutcomeStorage {
  private outcomes: TaskOutcome[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  save(outcome: TaskOutcome): Promise<void> {
    // Add to beginning for faster recent access
    this.outcomes.unshift(outcome);

    // Trim if over max size
    if (this.outcomes.length > this.maxSize) {
      this.outcomes = this.outcomes.slice(0, this.maxSize);
    }
    return Promise.resolve();
  }

  getAll(): Promise<TaskOutcome[]> {
    return Promise.resolve([...this.outcomes]);
  }

  getByType(taskType: string): Promise<TaskOutcome[]> {
    const taskTypeLower = taskType.toLowerCase();
    const filtered = this.outcomes.filter((o) => {
      const approachLower = o.approach.toLowerCase();
      const taskIdLower = o.taskId.toLowerCase();
      return (
        approachLower.includes(taskTypeLower) ||
        taskIdLower.includes(taskTypeLower)
      );
    });
    return Promise.resolve(filtered);
  }

  searchByKeywords(keywords: string[]): Promise<TaskOutcome[]> {
    if (keywords.length === 0) {
      return Promise.resolve([]);
    }

    const keywordsLower = keywords.map((k) => k.toLowerCase());

    const filtered = this.outcomes.filter((outcome) => {
      const searchText = `${outcome.taskId} ${outcome.approach} ${outcome.blockers.join(' ')} ${outcome.lessonsLearned.join(' ')}`.toLowerCase();

      // Count how many keywords match
      const matchCount = keywordsLower.filter((keyword) =>
        searchText.includes(keyword)
      ).length;

      // Require at least half of keywords to match
      return matchCount >= Math.ceil(keywordsLower.length / 2);
    });
    return Promise.resolve(filtered);
  }

  clear(): Promise<void> {
    this.outcomes = [];
    return Promise.resolve();
  }

  /**
   * Get count of stored outcomes
   */
  getCount(): number {
    return this.outcomes.length;
  }
}

// ============================================================================
// Historical Learner Implementation
// ============================================================================

/**
 * Historical Learner
 *
 * Learns from past task outcomes to provide insights and recommendations
 * for future similar tasks.
 */
export class HistoricalLearner implements IHistoricalLearner {
  private readonly storage: IOutcomeStorage;
  private readonly config: HistoricalLearnerConfig;
  private readonly keywordExtractors: KeywordExtractor[];

  // Cache for computed insights
  private insightCache: Map<string, { insights: HistoricalInsight[]; computedAt: Date }> =
    new Map();
  private readonly insightCacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<HistoricalLearnerConfig> = {}) {
    this.config = { ...DEFAULT_HISTORICAL_LEARNER_CONFIG, ...config };
    this.storage = config.storage ?? new InMemoryOutcomeStorage(this.config.maxOutcomes);
    this.keywordExtractors = config.keywordExtractors ?? [
      (text: string) => this.defaultKeywordExtractor(text),
    ];
  }

  // =========================================================================
  // IHistoricalLearner Implementation
  // =========================================================================

  /**
   * Record a task outcome for learning
   */
  async recordOutcome(outcome: TaskOutcome): Promise<void> {
    // Validate outcome
    this.validateOutcome(outcome);

    // Save to storage
    await this.storage.save(outcome);

    // Invalidate relevant insight caches
    this.invalidateRelatedCaches(outcome);
  }

  /**
   * Get insights for a task type
   */
  async getInsights(taskType: string): Promise<HistoricalInsight[]> {
    // Check cache
    const cached = this.getCachedInsights(taskType);
    if (cached) {
      return cached;
    }

    // Get relevant outcomes
    const outcomes = await this.storage.getByType(taskType);

    // Need minimum sample size for reliable insights
    if (outcomes.length < this.config.minSampleSize) {
      return [];
    }

    // Generate insights
    const insights = this.generateInsights(outcomes, taskType);

    // Cache results
    this.cacheInsights(taskType, insights);

    return insights;
  }

  /**
   * Find similar past tasks
   */
  async findSimilarTasks(taskDescription: string): Promise<TaskOutcome[]> {
    // Extract keywords from description
    const keywords = this.extractKeywords(taskDescription);

    if (keywords.length === 0) {
      return [];
    }

    // Search by keywords
    const results = await this.storage.searchByKeywords(keywords);

    // Sort by relevance (more keyword matches = higher relevance)
    const scored = results.map((outcome) => ({
      outcome,
      score: this.calculateSimilarityScore(taskDescription, outcome),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.outcome);
  }

  // =========================================================================
  // Insight Generation
  // =========================================================================

  /**
   * Generate insights from outcomes
   */
  private generateInsights(outcomes: TaskOutcome[], taskType: string): HistoricalInsight[] {
    const insights: HistoricalInsight[] = [];

    // Overall insight for this task type
    const overallInsight = this.generateOverallInsight(outcomes, taskType);
    insights.push(overallInsight);

    // Pattern-based insights
    const patternInsights = this.generatePatternInsights(outcomes, taskType);
    insights.push(...patternInsights);

    return insights;
  }

  /**
   * Generate overall insight for a task type
   */
  private generateOverallInsight(outcomes: TaskOutcome[], taskType: string): HistoricalInsight {
    const successfulOutcomes = outcomes.filter((o) => o.success);
    // Note: failedOutcomes count is derived from (outcomes.length - successfulOutcomes.length)

    // Calculate metrics
    const successRate = successfulOutcomes.length / outcomes.length;
    const avgIterations =
      outcomes.reduce((sum, o) => sum + o.iterations, 0) / outcomes.length;
    const avgTime =
      outcomes.reduce((sum, o) => sum + o.timeSpent, 0) / outcomes.length;

    // Find common blockers
    const commonBlockers = this.findCommonBlockers(outcomes);

    // Find recommended approach
    const recommendedApproach = this.findRecommendedApproach(successfulOutcomes);

    return {
      pattern: `Overall pattern for ${taskType} tasks`,
      taskType,
      successRate,
      averageIterations: avgIterations,
      averageTime: avgTime,
      commonBlockers,
      recommendedApproach,
      sampleSize: outcomes.length,
    };
  }

  /**
   * Generate pattern-based insights
   */
  private generatePatternInsights(
    outcomes: TaskOutcome[],
    taskType: string
  ): HistoricalInsight[] {
    const insights: HistoricalInsight[] = [];

    // Success vs failure pattern insight
    const successfulOutcomes = outcomes.filter((o) => o.success);
    const failedOutcomes = outcomes.filter((o) => !o.success);

    if (successfulOutcomes.length >= this.config.minSampleSize) {
      const successInsight = this.generateSuccessPatternInsight(
        successfulOutcomes,
        taskType
      );
      if (successInsight) {
        insights.push(successInsight);
      }
    }

    if (failedOutcomes.length >= this.config.minSampleSize) {
      const failureInsight = this.generateFailurePatternInsight(
        failedOutcomes,
        taskType
      );
      if (failureInsight) {
        insights.push(failureInsight);
      }
    }

    // Quick vs slow completion insight
    const avgTime = outcomes.reduce((sum, o) => sum + o.timeSpent, 0) / outcomes.length;
    const quickOutcomes = outcomes.filter((o) => o.timeSpent < avgTime);
    // Note: slowOutcomes would be outcomes.filter(o => o.timeSpent >= avgTime)
    // Currently we only generate insight for quick completions

    if (quickOutcomes.length >= this.config.minSampleSize) {
      const quickInsight = this.generateSpeedPatternInsight(
        quickOutcomes,
        taskType,
        'quick'
      );
      if (quickInsight) {
        insights.push(quickInsight);
      }
    }

    return insights;
  }

  /**
   * Generate insight for successful task patterns
   */
  private generateSuccessPatternInsight(
    outcomes: TaskOutcome[],
    taskType: string
  ): HistoricalInsight | null {
    if (outcomes.length === 0) {
      return null;
    }

    const avgIterations =
      outcomes.reduce((sum, o) => sum + o.iterations, 0) / outcomes.length;
    const avgTime =
      outcomes.reduce((sum, o) => sum + o.timeSpent, 0) / outcomes.length;

    // Find common approaches in successful outcomes
    const approachCounts = new Map<string, number>();
    for (const outcome of outcomes) {
      const approach = this.normalizeApproach(outcome.approach);
      approachCounts.set(approach, (approachCounts.get(approach) ?? 0) + 1);
    }

    const bestApproach = Array.from(approachCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Standard approach';

    // Collect lessons learned
    const allLessons = outcomes.flatMap((o) => o.lessonsLearned);
    const lessonCounts = new Map<string, number>();
    for (const lesson of allLessons) {
      const normalized = lesson.toLowerCase().trim();
      lessonCounts.set(normalized, (lessonCounts.get(normalized) ?? 0) + 1);
    }

    const topLessons = Array.from(lessonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lesson]) => lesson);

    return {
      pattern: `Success pattern for ${taskType} tasks`,
      taskType: `${taskType}-success`,
      successRate: 1.0,
      averageIterations: avgIterations,
      averageTime: avgTime,
      commonBlockers: topLessons, // Use lessons learned as "what to avoid"
      recommendedApproach: bestApproach,
      sampleSize: outcomes.length,
    };
  }

  /**
   * Generate insight for failed task patterns
   */
  private generateFailurePatternInsight(
    outcomes: TaskOutcome[],
    taskType: string
  ): HistoricalInsight | null {
    if (outcomes.length === 0) {
      return null;
    }

    const avgIterations =
      outcomes.reduce((sum, o) => sum + o.iterations, 0) / outcomes.length;
    const avgTime =
      outcomes.reduce((sum, o) => sum + o.timeSpent, 0) / outcomes.length;

    // Find common blockers in failed outcomes
    const blockerCounts = new Map<string, number>();
    for (const outcome of outcomes) {
      for (const blocker of outcome.blockers) {
        const normalized = blocker.toLowerCase().trim();
        blockerCounts.set(normalized, (blockerCounts.get(normalized) ?? 0) + 1);
      }
    }

    const commonBlockers = Array.from(blockerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([blocker]) => blocker);

    // Find approaches that failed
    const failedApproaches = outcomes.map((o) => this.normalizeApproach(o.approach));
    const avoidApproach = failedApproaches.length > 0
      ? `Avoid: ${failedApproaches[0]}`
      : 'No specific approach to avoid';

    return {
      pattern: `Failure pattern for ${taskType} tasks`,
      taskType: `${taskType}-failure`,
      successRate: 0.0,
      averageIterations: avgIterations,
      averageTime: avgTime,
      commonBlockers,
      recommendedApproach: avoidApproach,
      sampleSize: outcomes.length,
    };
  }

  /**
   * Generate insight for speed patterns
   */
  private generateSpeedPatternInsight(
    outcomes: TaskOutcome[],
    taskType: string,
    speed: 'quick' | 'slow'
  ): HistoricalInsight | null {
    if (outcomes.length === 0) {
      return null;
    }

    const successfulOutcomes = outcomes.filter((o) => o.success);
    const successRate = successfulOutcomes.length / outcomes.length;

    const avgIterations =
      outcomes.reduce((sum, o) => sum + o.iterations, 0) / outcomes.length;
    const avgTime =
      outcomes.reduce((sum, o) => sum + o.timeSpent, 0) / outcomes.length;

    // Find common approach in quick/successful outcomes
    const approaches = successfulOutcomes.map((o) => this.normalizeApproach(o.approach));
    const approachCounts = new Map<string, number>();
    for (const approach of approaches) {
      approachCounts.set(approach, (approachCounts.get(approach) ?? 0) + 1);
    }

    const bestApproach = Array.from(approachCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Efficient approach';

    return {
      pattern: `${speed === 'quick' ? 'Quick' : 'Slow'} completion pattern for ${taskType}`,
      taskType: `${taskType}-${speed}`,
      successRate,
      averageIterations: avgIterations,
      averageTime: avgTime,
      commonBlockers: [],
      recommendedApproach: bestApproach,
      sampleSize: outcomes.length,
    };
  }

  // =========================================================================
  // Analysis Helpers
  // =========================================================================

  /**
   * Find common blockers across outcomes
   */
  private findCommonBlockers(outcomes: TaskOutcome[]): string[] {
    const blockerCounts = new Map<string, number>();

    for (const outcome of outcomes) {
      for (const blocker of outcome.blockers) {
        const normalized = blocker.toLowerCase().trim();
        if (normalized.length > 0) {
          blockerCounts.set(normalized, (blockerCounts.get(normalized) ?? 0) + 1);
        }
      }
    }

    // Return blockers that appear in at least 2 outcomes or 20% of outcomes
    const threshold = Math.max(2, Math.floor(outcomes.length * 0.2));

    return Array.from(blockerCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([blocker]) => blocker);
  }

  /**
   * Find recommended approach from successful outcomes
   */
  private findRecommendedApproach(successfulOutcomes: TaskOutcome[]): string {
    if (successfulOutcomes.length === 0) {
      return 'No successful approach found yet';
    }

    // Group by approach and find best performing
    const approachMetrics = new Map<
      string,
      { count: number; totalTime: number; totalIterations: number }
    >();

    for (const outcome of successfulOutcomes) {
      const approach = this.normalizeApproach(outcome.approach);
      const existing = approachMetrics.get(approach) ?? {
        count: 0,
        totalTime: 0,
        totalIterations: 0,
      };

      approachMetrics.set(approach, {
        count: existing.count + 1,
        totalTime: existing.totalTime + outcome.timeSpent,
        totalIterations: existing.totalIterations + outcome.iterations,
      });
    }

    // Score by efficiency (lower time and iterations = better)
    const scored = Array.from(approachMetrics.entries()).map(([approach, metrics]) => {
      const avgTime = metrics.totalTime / metrics.count;
      const avgIterations = metrics.totalIterations / metrics.count;
      // Normalize and weight (fewer iterations and time = higher score)
      const score = metrics.count * 2 - avgTime / 10 - avgIterations / 5;
      return { approach, score, count: metrics.count };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.approach ?? 'Standard approach';
  }

  /**
   * Normalize approach description for comparison
   */
  private normalizeApproach(approach: string): string {
    return approach
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 100); // Limit length for grouping
  }

  /**
   * Calculate similarity score between description and outcome
   */
  private calculateSimilarityScore(description: string, outcome: TaskOutcome): number {
    const descWords = new Set(this.extractKeywords(description));
    const outcomeText = `${outcome.taskId} ${outcome.approach} ${outcome.blockers.join(' ')}`;
    const outcomeWords = new Set(this.extractKeywords(outcomeText));

    // Jaccard similarity
    const intersection = new Set([...descWords].filter((w) => outcomeWords.has(w)));
    const union = new Set([...descWords, ...outcomeWords]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const allKeywords: string[] = [];

    for (const extractor of this.keywordExtractors) {
      allKeywords.push(...extractor(text));
    }

    // Deduplicate and filter
    return [...new Set(allKeywords)].filter((k) => k.length >= 2);
  }

  /**
   * Default keyword extractor
   */
  private defaultKeywordExtractor(text: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      'can', 'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
      'did', 'doing', 'would', 'could', 'might', 'must', 'shall', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2 && !stopWords.has(word));
  }

  // =========================================================================
  // Validation
  // =========================================================================

  /**
   * Validate outcome data
   */
  private validateOutcome(outcome: TaskOutcome): void {
    if (!outcome.taskId || typeof outcome.taskId !== 'string') {
      throw new Error('Invalid outcome: taskId is required');
    }

    if (typeof outcome.success !== 'boolean') {
      throw new Error('Invalid outcome: success must be a boolean');
    }

    if (!outcome.approach || typeof outcome.approach !== 'string') {
      throw new Error('Invalid outcome: approach is required');
    }

    if (typeof outcome.iterations !== 'number' || outcome.iterations < 0) {
      throw new Error('Invalid outcome: iterations must be a non-negative number');
    }

    if (typeof outcome.timeSpent !== 'number' || outcome.timeSpent < 0) {
      throw new Error('Invalid outcome: timeSpent must be a non-negative number');
    }

    if (!Array.isArray(outcome.blockers)) {
      throw new Error('Invalid outcome: blockers must be an array');
    }

    if (!Array.isArray(outcome.lessonsLearned)) {
      throw new Error('Invalid outcome: lessonsLearned must be an array');
    }

    if (!(outcome.completedAt instanceof Date)) {
      throw new Error('Invalid outcome: completedAt must be a Date');
    }
  }

  // =========================================================================
  // Caching
  // =========================================================================

  /**
   * Get cached insights if still valid
   */
  private getCachedInsights(taskType: string): HistoricalInsight[] | null {
    const cached = this.insightCache.get(taskType);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.computedAt.getTime();
    if (age > this.insightCacheTtl) {
      this.insightCache.delete(taskType);
      return null;
    }

    return cached.insights;
  }

  /**
   * Cache insights
   */
  private cacheInsights(taskType: string, insights: HistoricalInsight[]): void {
    this.insightCache.set(taskType, {
      insights,
      computedAt: new Date(),
    });
  }

  /**
   * Invalidate caches related to an outcome
   */
  private invalidateRelatedCaches(outcome: TaskOutcome): void {
    // Invalidate any cache that might be affected by this outcome
    const keywords = this.extractKeywords(outcome.approach);

    for (const key of this.insightCache.keys()) {
      if (keywords.some((k) => key.toLowerCase().includes(k))) {
        this.insightCache.delete(key);
      }
    }

    // Also invalidate "all" type cache
    this.insightCache.delete('all');
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Clear all cached insights
   */
  clearInsightCache(): void {
    this.insightCache.clear();
  }

  /**
   * Clear all stored outcomes (for testing)
   */
  async clearOutcomes(): Promise<void> {
    await this.storage.clear();
    this.insightCache.clear();
  }

  /**
   * Get the storage implementation (for testing)
   */
  getStorage(): IOutcomeStorage {
    return this.storage;
  }

  /**
   * Classify a task into a type based on its description
   *
   * Note: Order matters! More specific patterns should be checked first.
   */
  classifyTaskType(taskDescription: string): string {
    const descLower = taskDescription.toLowerCase();

    // Check specific domain patterns first (before generic ones like 'fix', 'add')
    if (descLower.includes('doc') || descLower.includes('readme')) {
      return 'documentation';
    }
    if (descLower.includes('security') || descLower.includes('vulnerability')) {
      return 'security';
    }
    if (descLower.includes('performance') || descLower.includes('optimize')) {
      return 'optimization';
    }
    if (descLower.includes('refactor') || descLower.includes('clean')) {
      return 'refactoring';
    }
    if (descLower.includes('test') && !descLower.includes('implement')) {
      return 'testing';
    }

    // Check for bugfix patterns (before feature since 'fix' is common)
    if (descLower.includes('bug') || descLower.includes('error')) {
      return 'bugfix';
    }
    // Check for 'fix' separately - it's bugfix unless it's combined with security
    if (descLower.includes('fix') && !descLower.includes('security')) {
      return 'bugfix';
    }

    // Domain-specific patterns
    if (descLower.includes('api') || descLower.includes('endpoint')) {
      return 'api';
    }
    if (descLower.includes('ui') || descLower.includes('frontend') || descLower.includes('component')) {
      return 'frontend';
    }
    if (descLower.includes('backend') || descLower.includes('server') || descLower.includes('database')) {
      return 'backend';
    }

    // Generic feature patterns last
    if (descLower.includes('feature') || descLower.includes('implement') || descLower.includes('add')) {
      return 'feature';
    }

    return 'general';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new HistoricalLearner with default configuration
 */
export function createHistoricalLearner(
  config?: Partial<HistoricalLearnerConfig>
): HistoricalLearner {
  return new HistoricalLearner(config);
}
