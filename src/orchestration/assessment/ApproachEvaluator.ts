/**
 * Approach Evaluator Implementation
 *
 * Evaluates the effectiveness of the current approach being used for a task,
 * identifies when the approach is struggling or stuck, and generates
 * alternative approaches that could be more effective.
 *
 * Layer 2: Orchestration / Assessment
 *
 * Philosophy:
 * - Early detection of ineffective approaches saves time
 * - Alternative approaches should be data-driven
 * - Recommendations should be actionable and specific
 * - Historical patterns inform better suggestions
 */

import type {
  IApproachEvaluator,
  AssessmentContext,
  ApproachAssessment,
  AlternativeApproach,
  EffectivenessLevel,
  EffectivenessCriteria,
  IterationHistoryEntry,
} from './types';

import { EFFECTIVENESS_MAPPING } from './types';

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Extended iteration entry that may have filesModified for simplified testing
 */
interface ExtendedIterationEntry extends IterationHistoryEntry {
  filesModified?: string[];
  status?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum iterations required for reliable effectiveness assessment
 */
const MIN_ITERATIONS_FOR_ASSESSMENT = 2;

/**
 * Number of recent iterations to analyze for trends
 */
const RECENT_ITERATIONS_WINDOW = 5;

/**
 * Threshold for considering errors as "repeated"
 */
const REPEATED_ERROR_THRESHOLD = 3;

/**
 * Keywords indicating different approach patterns
 */
const APPROACH_KEYWORDS = {
  incremental: ['step by step', 'incrementally', 'one at a time', 'gradually'],
  comprehensive: ['all at once', 'complete rewrite', 'full implementation', 'comprehensive'],
  refactoring: ['refactor', 'restructure', 'reorganize', 'clean up'],
  debugging: ['debug', 'investigate', 'trace', 'diagnose', 'fix'],
  testing: ['test', 'verify', 'validate', 'check'],
  implementation: ['implement', 'add', 'create', 'build'],
};

/**
 * Alternative approach templates based on current issues
 */
const ALTERNATIVE_APPROACH_TEMPLATES: Array<{
  id: string;
  description: string;
  applicableWhen: string[];
  pros: string[];
  cons: string[];
  estimatedEffort: number;
  confidence: number;
  requiredChanges: string[];
}> = [
  {
    id: 'incremental-approach',
    description: 'Switch to incremental, step-by-step implementation',
    applicableWhen: ['stuck', 'wrong_direction', 'comprehensive'],
    pros: [
      'Easier to debug',
      'Progress is visible at each step',
      'Errors are isolated to specific changes',
    ],
    cons: [
      'May take more iterations',
      'Requires careful planning of steps',
    ],
    estimatedEffort: 30,
    confidence: 0.75,
    requiredChanges: [
      'Break current task into smaller sub-tasks',
      'Implement one component at a time',
      'Verify each step before proceeding',
    ],
  },
  {
    id: 'simplify-approach',
    description: 'Simplify the implementation by removing non-essential features',
    applicableWhen: ['scope_creep', 'complexity'],
    pros: [
      'Reduces complexity',
      'Faster to complete',
      'Easier to test',
    ],
    cons: [
      'May need to add features later',
      'Could miss important functionality',
    ],
    estimatedEffort: 20,
    confidence: 0.7,
    requiredChanges: [
      'Identify core vs nice-to-have features',
      'Remove or defer non-essential code',
      'Focus on acceptance criteria',
    ],
  },
  {
    id: 'different-pattern',
    description: 'Try a different design pattern or architecture',
    applicableWhen: ['stuck', 'repeated_errors', 'technical'],
    pros: [
      'May solve fundamental issues',
      'Could be more maintainable',
      'Learning opportunity',
    ],
    cons: [
      'Requires significant rework',
      'May introduce new issues',
    ],
    estimatedEffort: 60,
    confidence: 0.6,
    requiredChanges: [
      'Research alternative patterns',
      'Plan migration strategy',
      'Implement new architecture',
    ],
  },
  {
    id: 'minimal-viable',
    description: 'Implement minimal viable solution first, then enhance',
    applicableWhen: ['time_pressure', 'complexity', 'struggling'],
    pros: [
      'Gets working solution quickly',
      'Can iterate and improve',
      'Validates approach early',
    ],
    cons: [
      'May need refactoring',
      'Initial solution may be less elegant',
    ],
    estimatedEffort: 25,
    confidence: 0.8,
    requiredChanges: [
      'Identify minimal requirements',
      'Implement basic functionality',
      'Plan enhancement iterations',
    ],
  },
  {
    id: 'research-first',
    description: 'Pause implementation and research the problem domain',
    applicableWhen: ['knowledge_gap', 'stuck', 'repeated_errors'],
    pros: [
      'Better understanding of problem',
      'May find existing solutions',
      'Prevents wasted effort',
    ],
    cons: [
      'Delays implementation',
      'May not find relevant info',
    ],
    estimatedEffort: 45,
    confidence: 0.65,
    requiredChanges: [
      'Review documentation and examples',
      'Search for similar problems and solutions',
      'Update approach based on findings',
    ],
  },
  {
    id: 'test-driven',
    description: 'Switch to test-driven development approach',
    applicableWhen: ['debugging', 'quality_issues', 'struggling'],
    pros: [
      'Clearer requirements',
      'Easier to verify correctness',
      'Better code structure',
    ],
    cons: [
      'More upfront effort',
      'Requires test knowledge',
    ],
    estimatedEffort: 40,
    confidence: 0.7,
    requiredChanges: [
      'Write failing tests first',
      'Implement to pass tests',
      'Refactor with test safety net',
    ],
  },
];

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Error trend analysis result
 */
interface ErrorTrendAnalysis {
  trend: 'decreasing' | 'stable' | 'increasing';
  recentErrorCount: number;
  previousErrorCount: number;
  repeatedErrors: string[];
  uniqueErrors: number;
}

/**
 * Approach pattern detected from context
 */
interface ApproachPattern {
  type: string;
  keywords: string[];
  confidence: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract files modified from an iteration entry
 * Handles both the actual type (with changes) and test mocks (with filesModified)
 */
function getFilesFromEntry(entry: IterationHistoryEntry): string[] {
  const extended = entry as ExtendedIterationEntry;

  // Check for test mock's filesModified property first
  if (extended.filesModified && Array.isArray(extended.filesModified)) {
    return extended.filesModified;
  }

  // Fall back to extracting from changes (actual type)
  // changes is always present in the real type, so just map it
  return entry.changes.map((change) => change.file);
}

// ============================================================================
// Approach Evaluator Class
// ============================================================================

/**
 * Approach Evaluator
 *
 * Evaluates the effectiveness of the current approach and generates
 * alternatives when the approach is struggling or stuck.
 */
export class ApproachEvaluator implements IApproachEvaluator {
  private alternativeIdCounter: number = 0;

  // No constructor needed - rule-based evaluation with no dependencies
  // Can be extended with LLM client or CodeMemory for AI-powered evaluation

  /**
   * Evaluate the current approach
   *
   * @param context Assessment context
   * @returns Approach assessment
   */
  evaluate(context: AssessmentContext): Promise<ApproachAssessment> {
    // Infer current approach from context
    const currentApproach = this.inferCurrentApproach(context);

    // Determine effectiveness level
    const effectivenessData = this.determineEffectiveness(context);
    const effectiveness = effectivenessData.level;
    const confidence = effectivenessData.confidence;

    // Generate alternatives if struggling or stuck
    const alternatives = this.generateAlternatives(context, currentApproach, effectiveness);

    // Make recommendation based on assessment
    const recommendation = this.makeRecommendation(effectiveness, alternatives, context);

    return Promise.resolve({
      taskId: context.taskId,
      currentApproach,
      effectiveness,
      confidence,
      alternatives,
      recommendation,
      assessedAt: new Date(),
    });
  }

  // ===========================================================================
  // Effectiveness Determination
  // ===========================================================================

  /**
   * Determine the effectiveness level of the current approach
   */
  private determineEffectiveness(
    context: AssessmentContext
  ): { level: EffectivenessLevel; confidence: number } {
    const iterationCount = context.iterationHistory.length;

    // Not enough data for reliable assessment
    if (iterationCount < MIN_ITERATIONS_FOR_ASSESSMENT) {
      return {
        level: 'working',
        confidence: 0.3,
      };
    }

    // Analyze various effectiveness criteria
    const criteria = this.analyzeEffectivenessCriteria(context);

    // Map criteria to effectiveness level
    const level = this.mapCriteriaToEffectiveness(criteria);

    // Calculate confidence based on data quality
    const confidence = this.calculateEffectivenessConfidence(context, criteria);

    return { level, confidence };
  }

  /**
   * Analyze effectiveness criteria from context
   */
  private analyzeEffectivenessCriteria(context: AssessmentContext): EffectivenessCriteria {
    const errorTrend = this.analyzeErrorTrend(context);
    const iterationHistory = context.iterationHistory;

    // Check if errors are decreasing
    const errorsDecreasing = errorTrend.trend === 'decreasing';

    // Check if tests are improving (look for test-related success in history)
    const testsImproving = this.checkTestsImproving(iterationHistory);

    // Check for repeated errors
    const noRepeatedErrors = errorTrend.repeatedErrors.length === 0;

    // Check file progress
    const filesProgressing = this.checkFilesProgressing(context);

    // Check for scope creep
    const noScopeCreep = this.checkNoScopeCreep(context);

    return {
      errorsDecreasing,
      testsImproving,
      noRepeatedErrors,
      filesProgressing,
      noScopeCreep,
    };
  }

  /**
   * Map effectiveness criteria to an effectiveness level
   */
  private mapCriteriaToEffectiveness(criteria: EffectivenessCriteria): EffectivenessLevel {
    // Check against predefined mappings from most specific to least specific
    for (const mapping of EFFECTIVENESS_MAPPING) {
      const matches = Object.entries(mapping.criteria).every(([key, value]) => {
        const criteriaKey = key as keyof EffectivenessCriteria;
        return criteria[criteriaKey] === value;
      });
      if (matches) {
        return mapping.level;
      }
    }

    // Default based on error trend
    if (criteria.errorsDecreasing) {
      return 'working';
    } else if (criteria.noRepeatedErrors && criteria.filesProgressing) {
      return 'struggling';
    } else if (!criteria.noRepeatedErrors) {
      return 'stuck';
    } else if (!criteria.noScopeCreep) {
      return 'wrong_direction';
    }

    return 'working';
  }

  /**
   * Calculate confidence in effectiveness assessment
   */
  private calculateEffectivenessConfidence(
    context: AssessmentContext,
    criteria: EffectivenessCriteria
  ): number {
    const iterationCount = context.iterationHistory.length;

    // Base confidence from iteration count
    let confidence = Math.min(0.9, 0.4 + iterationCount * 0.1);

    // Reduce confidence if criteria are mixed
    const criteriaValues = Object.values(criteria);
    const trueCount = criteriaValues.filter(Boolean).length;
    const mixedSignals = trueCount >= 2 && trueCount <= 3;
    if (mixedSignals) {
      confidence *= 0.85;
    }

    // Increase confidence if all criteria agree
    if (trueCount === 0 || trueCount === criteriaValues.length) {
      confidence = Math.min(0.95, confidence * 1.1);
    }

    return Math.round(confidence * 100) / 100;
  }

  // ===========================================================================
  // Error Trend Analysis
  // ===========================================================================

  /**
   * Analyze error trends from iteration history
   */
  private analyzeErrorTrend(context: AssessmentContext): ErrorTrendAnalysis {
    const history = context.iterationHistory;
    const windowSize = Math.min(RECENT_ITERATIONS_WINDOW, history.length);

    if (windowSize < 2) {
      return {
        trend: 'stable',
        recentErrorCount: context.currentErrors.length,
        previousErrorCount: context.currentErrors.length,
        repeatedErrors: [],
        uniqueErrors: context.currentErrors.length,
      };
    }

    // Split history into recent and previous windows
    const recentHistory = history.slice(-Math.ceil(windowSize / 2));
    const previousHistory = history.slice(
      -windowSize,
      -Math.ceil(windowSize / 2)
    );

    // Calculate error counts
    const recentErrorCount = this.countErrors(recentHistory);
    const previousErrorCount = this.countErrors(previousHistory);

    // Determine trend
    let trend: 'decreasing' | 'stable' | 'increasing' = 'stable';
    if (previousErrorCount > 0) {
      const changeRatio = (recentErrorCount - previousErrorCount) / previousErrorCount;
      if (changeRatio < -0.2) {
        trend = 'decreasing';
      } else if (changeRatio > 0.2) {
        trend = 'increasing';
      }
    } else if (recentErrorCount > 0) {
      trend = 'increasing';
    }

    // Find repeated errors
    const repeatedErrors = this.findRepeatedErrors(history);

    // Count unique errors
    const uniqueErrors = this.countUniqueErrors(history);

    return {
      trend,
      recentErrorCount,
      previousErrorCount,
      repeatedErrors,
      uniqueErrors,
    };
  }

  /**
   * Count total errors across iterations
   */
  private countErrors(history: IterationHistoryEntry[]): number {
    return history.reduce((sum, entry) => sum + entry.errors.length, 0);
  }

  /**
   * Find errors that appear repeatedly
   */
  private findRepeatedErrors(history: IterationHistoryEntry[]): string[] {
    const errorCounts = new Map<string, number>();

    for (const entry of history) {
      for (const error of entry.errors) {
        const normalized = this.normalizeErrorMessage(error.message);
        errorCounts.set(normalized, (errorCounts.get(normalized) ?? 0) + 1);
      }
    }

    return Array.from(errorCounts.entries())
      .filter(([, count]) => count >= REPEATED_ERROR_THRESHOLD)
      .map(([error]) => error);
  }

  /**
   * Count unique errors across history
   */
  private countUniqueErrors(history: IterationHistoryEntry[]): number {
    const uniqueErrors = new Set<string>();

    for (const entry of history) {
      for (const error of entry.errors) {
        uniqueErrors.add(this.normalizeErrorMessage(error.message));
      }
    }

    return uniqueErrors.size;
  }

  /**
   * Normalize error message for comparison
   */
  private normalizeErrorMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/['"`]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 100); // Limit length
  }

  // ===========================================================================
  // Progress Analysis
  // ===========================================================================

  /**
   * Check if tests are improving based on iteration history
   */
  private checkTestsImproving(history: IterationHistoryEntry[]): boolean {
    if (history.length < 2) {
      return true; // Assume improving if not enough data
    }

    // Look for test-related patterns in iteration status
    const testFailures = history.map((entry) => {
      const hasTestFailure = entry.errors.some(
        (e) =>
          e.message.toLowerCase().includes('test') ||
          e.message.toLowerCase().includes('assert') ||
          e.message.toLowerCase().includes('expect')
      );
      return hasTestFailure ? 1 : 0;
    });

    // Check if test failures are decreasing
    const recentFailures = testFailures.slice(-3).reduce((a, b) => a + b, 0);
    const previousFailures = testFailures.slice(-6, -3).reduce((a, b) => a + b, 0);

    return recentFailures <= previousFailures;
  }

  /**
   * Check if file modifications are progressing
   */
  private checkFilesProgressing(context: AssessmentContext): boolean {
    const history = context.iterationHistory;

    if (history.length < 2) {
      return true;
    }

    // Check if new files are being modified over time
    const filesModifiedOverTime = new Set<string>();
    let isProgressing = true;

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const previousSize = filesModifiedOverTime.size;
      const entryFiles = getFilesFromEntry(entry);

      for (const file of entryFiles) {
        filesModifiedOverTime.add(file);
      }

      // If no new files modified in last few iterations, not progressing
      if (i >= 3 && filesModifiedOverTime.size === previousSize) {
        isProgressing = false;
      }
    }

    // Also check if expected files are being covered
    if (context.taskFiles.length > 0) {
      const modifiedFiles = new Set(
        history.flatMap((h) => getFilesFromEntry(h))
      );
      const coverage = Array.from(modifiedFiles).filter((f: string) =>
        context.taskFiles.some((tf: string) => f.includes(tf) || tf.includes(f))
      ).length;
      isProgressing = isProgressing && coverage >= Math.min(1, context.taskFiles.length * 0.3);
    }

    return isProgressing;
  }

  /**
   * Check if there's no scope creep
   */
  private checkNoScopeCreep(context: AssessmentContext): boolean {
    if (context.taskFiles.length === 0) {
      return true; // No expected files specified
    }

    const history = context.iterationHistory;
    const modifiedFiles = new Set(
      history.flatMap((h) => getFilesFromEntry(h))
    );

    // Count files modified that weren't in the expected list
    let unexpectedCount = 0;
    for (const file of modifiedFiles) {
      const isExpected = context.taskFiles.some(
        (tf: string) => file.includes(tf) || tf.includes(file)
      );
      if (!isExpected) {
        unexpectedCount++;
      }
    }

    // Scope creep if more than 50% unexpected files
    const scopeCreepThreshold = Math.max(3, context.taskFiles.length * 0.5);
    return unexpectedCount <= scopeCreepThreshold;
  }

  // ===========================================================================
  // Approach Inference
  // ===========================================================================

  /**
   * Infer the current approach from context
   */
  private inferCurrentApproach(context: AssessmentContext): string {
    const patterns = this.detectApproachPatterns(context);

    if (patterns.length === 0) {
      return this.inferFromFilesAndHistory(context);
    }

    // Build description from detected patterns
    const primaryPattern = patterns[0];
    let description = `${this.capitalizeFirst(primaryPattern.type)} approach`;

    if (patterns.length > 1) {
      const secondaryTypes = patterns.slice(1, 3).map((p) => p.type);
      description += ` with ${secondaryTypes.join(' and ')} elements`;
    }

    return description;
  }

  /**
   * Detect approach patterns from agent feedback and code changes
   */
  private detectApproachPatterns(context: AssessmentContext): ApproachPattern[] {
    const patterns: ApproachPattern[] = [];
    const searchText = [
      context.agentFeedback ?? '',
      context.codeChanges ?? '',
      context.taskDescription,
    ].join(' ').toLowerCase();

    for (const [type, keywords] of Object.entries(APPROACH_KEYWORDS)) {
      const matchedKeywords = keywords.filter((k) => searchText.includes(k));
      if (matchedKeywords.length > 0) {
        patterns.push({
          type,
          keywords: matchedKeywords,
          confidence: Math.min(0.9, 0.5 + matchedKeywords.length * 0.1),
        });
      }
    }

    // Sort by confidence
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Infer approach from files and history when no patterns detected
   */
  private inferFromFilesAndHistory(context: AssessmentContext): string {
    const history = context.iterationHistory;
    const modifiedFiles = new Set(
      history.flatMap((h) => getFilesFromEntry(h))
    );

    // Infer from file types
    const fileArray = Array.from(modifiedFiles);
    const hasTests = fileArray.some(
      (f: string) => f.includes('.test.') || f.includes('.spec.')
    );
    const hasTypes = fileArray.some(
      (f: string) => f.includes('types') || f.includes('.d.ts')
    );

    if (hasTests) {
      return 'Test-driven implementation approach';
    } else if (hasTypes) {
      return 'Type-first implementation approach';
    } else if (modifiedFiles.size === 1) {
      return 'Focused single-file modification';
    } else if (modifiedFiles.size > 5) {
      return 'Comprehensive multi-file implementation';
    }

    return 'Standard implementation approach';
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ===========================================================================
  // Alternative Generation
  // ===========================================================================

  /**
   * Generate alternative approaches based on current effectiveness
   */
  private generateAlternatives(
    context: AssessmentContext,
    currentApproach: string,
    effectiveness: EffectivenessLevel
  ): AlternativeApproach[] {
    // Don't generate alternatives if approach is working
    if (effectiveness === 'working') {
      return [];
    }

    const alternatives: AlternativeApproach[] = [];
    const applicableConditions = this.getApplicableConditions(
      context,
      currentApproach,
      effectiveness
    );

    // Find templates that match current conditions
    for (const template of ALTERNATIVE_APPROACH_TEMPLATES) {
      const isApplicable = template.applicableWhen.some(
        (condition) => applicableConditions.includes(condition)
      );

      if (isApplicable) {
        const alternative = this.evaluateAlternative(template, context, effectiveness);
        alternatives.push(alternative);
      }
    }

    // Sort by confidence and limit to top 3
    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Get conditions that apply to the current situation
   */
  private getApplicableConditions(
    context: AssessmentContext,
    currentApproach: string,
    effectiveness: EffectivenessLevel
  ): string[] {
    const conditions: string[] = [effectiveness];

    // Check for specific issues
    const errorTrend = this.analyzeErrorTrend(context);

    if (errorTrend.repeatedErrors.length > 0) {
      conditions.push('repeated_errors');
    }

    if (!this.checkNoScopeCreep(context)) {
      conditions.push('scope_creep');
      conditions.push('complexity');
    }

    // Check agent feedback for hints
    const feedback = (context.agentFeedback ?? '').toLowerCase();
    if (feedback.includes('complex') || feedback.includes('difficult')) {
      conditions.push('complexity');
    }
    if (
      feedback.includes('unfamiliar') ||
      feedback.includes("don't know") ||
      feedback.includes('not sure')
    ) {
      conditions.push('knowledge_gap');
    }
    if (feedback.includes('debug') || feedback.includes('error')) {
      conditions.push('debugging');
    }
    if (feedback.includes('quality') || feedback.includes('test')) {
      conditions.push('quality_issues');
    }

    // Check current approach type
    if (currentApproach.toLowerCase().includes('comprehensive')) {
      conditions.push('comprehensive');
    }

    // Check time pressure
    if (context.timeElapsed && context.estimatedTime) {
      if (context.timeElapsed > context.estimatedTime * 0.8) {
        conditions.push('time_pressure');
      }
    }

    // Add generic technical condition if errors are present
    if (context.currentErrors.length > 0) {
      conditions.push('technical');
    }

    return conditions;
  }

  /**
   * Evaluate an alternative approach for the current context
   */
  private evaluateAlternative(
    template: (typeof ALTERNATIVE_APPROACH_TEMPLATES)[0],
    context: AssessmentContext,
    effectiveness: EffectivenessLevel
  ): AlternativeApproach {
    // Adjust confidence based on context
    let confidence = template.confidence;

    // Increase confidence if approach is stuck or wrong direction
    if (effectiveness === 'stuck' || effectiveness === 'wrong_direction') {
      confidence = Math.min(0.95, confidence * 1.15);
    }

    // Adjust effort based on task complexity
    let estimatedEffort = template.estimatedEffort;
    if (context.taskFiles.length > 5) {
      estimatedEffort *= 1.5;
    }

    // Generate unique ID
    const id = `${template.id}-${++this.alternativeIdCounter}`;

    return {
      id,
      description: template.description,
      pros: [...template.pros],
      cons: [...template.cons],
      estimatedEffort: Math.round(estimatedEffort),
      confidence: Math.round(confidence * 100) / 100,
      requiredChanges: [...template.requiredChanges],
    };
  }

  // ===========================================================================
  // Recommendation Generation
  // ===========================================================================

  /**
   * Make a recommendation based on effectiveness and alternatives
   */
  private makeRecommendation(
    effectiveness: EffectivenessLevel,
    alternatives: AlternativeApproach[],
    context: AssessmentContext
  ): string {
    switch (effectiveness) {
      case 'working':
        return this.makeWorkingRecommendation(context);

      case 'struggling':
        return this.makeStrugglingRecommendation(alternatives, context);

      case 'stuck':
        return this.makeStuckRecommendation(alternatives, context);

      case 'wrong_direction':
        return this.makeWrongDirectionRecommendation(alternatives);

      default:
        return 'Continue with current approach';
    }
  }

  /**
   * Make recommendation when approach is working
   */
  private makeWorkingRecommendation(context: AssessmentContext): string {
    const iterationCount = context.iterationHistory.length;
    const errorCount = context.currentErrors.length;

    if (errorCount === 0) {
      return 'Continue with current approach - making good progress with no errors';
    } else if (iterationCount < 3) {
      return 'Continue with current approach - early stages but progressing well';
    } else {
      return `Continue with current approach - ${errorCount} error(s) remaining but trend is positive`;
    }
  }

  /**
   * Make recommendation when struggling
   */
  private makeStrugglingRecommendation(
    alternatives: AlternativeApproach[],
    context: AssessmentContext
  ): string {
    const errorCount = context.currentErrors.length;

    if (alternatives.length > 0) {
      const best = alternatives[0];
      return `Consider "${best.description}" - current approach is struggling with ${errorCount} error(s)`;
    }

    return `Current approach is struggling with ${errorCount} error(s). Consider simplifying or breaking into smaller steps.`;
  }

  /**
   * Make recommendation when stuck
   */
  private makeStuckRecommendation(
    alternatives: AlternativeApproach[],
    context: AssessmentContext
  ): string {
    const errorTrend = this.analyzeErrorTrend(context);

    if (errorTrend.repeatedErrors.length > 0) {
      const repeatedCount = errorTrend.repeatedErrors.length;
      if (alternatives.length > 0) {
        return `${repeatedCount} repeated error(s) detected. Strongly recommend trying "${alternatives[0].description}"`;
      }
      return `${repeatedCount} repeated error(s) detected. Current approach is not resolving the issue - try a different strategy or request help`;
    }

    if (alternatives.length > 0) {
      return `Current approach is stuck. Try "${alternatives[0].description}" or request help`;
    }

    return 'Current approach is stuck with no progress. Consider requesting help or completely rethinking the approach';
  }

  /**
   * Make recommendation when going in wrong direction
   */
  private makeWrongDirectionRecommendation(alternatives: AlternativeApproach[]): string {
    if (alternatives.length > 0) {
      return `Stop current approach immediately - making things worse. Recommend "${alternatives[0].description}"`;
    }

    return 'Stop current approach immediately - errors are increasing and scope is expanding. Revert recent changes and reconsider the approach';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ApproachEvaluator
 */
export function createApproachEvaluator(): ApproachEvaluator {
  return new ApproachEvaluator();
}
