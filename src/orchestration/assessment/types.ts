/**
 * Self-Assessment Engine Types and Interfaces
 *
 * This module defines all TypeScript types for the Self-Assessment Engine,
 * which enables agents to evaluate their own progress, detect blockers,
 * and learn from historical task outcomes.
 *
 * Layer 2: Orchestration
 *
 * Philosophy:
 * - Agents should be able to assess their own effectiveness
 * - Blockers should be detected and categorized automatically
 * - Historical patterns should inform future approaches
 * - The system should recommend actions based on assessment
 */

import type { ErrorEntry, IterationHistoryEntry } from '../../execution/iteration/types';

// Re-export for convenience
export type { ErrorEntry, IterationHistoryEntry };

// ============================================================================
// Assessment Types
// ============================================================================

/**
 * Types of assessments that can be performed
 */
export type AssessmentType = 'progress' | 'blockers' | 'approach';

/**
 * Level of effectiveness for current approach
 */
export type EffectivenessLevel =
  | 'working'          // Making good progress
  | 'struggling'       // Progress is slow or difficult
  | 'stuck'            // No progress being made
  | 'wrong_direction'; // Making things worse

/**
 * Types of blockers that can be detected
 */
export type BlockerType =
  | 'technical'           // Build failures, type errors, etc.
  | 'dependency'          // Missing or conflicting dependencies
  | 'unclear_requirement' // Ambiguous or contradictory requirements
  | 'external'            // External service or resource issues
  | 'knowledge_gap';      // Unfamiliar patterns or domains

/**
 * Severity levels for blockers
 */
export type BlockerSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Recommended actions based on assessment
 */
export type RecommendedAction =
  | 'continue'          // Keep going with current approach
  | 'try_alternative'   // Switch to a different approach
  | 'request_help'      // Escalate to human
  | 'split_task'        // Break into smaller tasks
  | 'abort';            // Stop the task entirely

/**
 * Types of risks that can be identified
 */
export type RiskType =
  | 'technical'  // Technical complexity or difficulty
  | 'scope'      // Task scope larger than expected
  | 'time'       // Running out of time
  | 'quality';   // Quality compromises being made

// ============================================================================
// Progress Assessment Types
// ============================================================================

/**
 * A risk identified during assessment
 */
export interface Risk {
  /** Type of risk */
  type: RiskType;
  /** Description of the risk */
  description: string;
  /** Probability the risk will materialize (0.0 - 1.0) */
  probability: number;
  /** Impact if risk materializes (0.0 - 1.0) */
  impact: number;
  /** Combined risk score (probability * impact) */
  riskScore: number;
  /** Suggested mitigation strategy */
  mitigation?: string;
}

/**
 * Assessment of task progress
 */
export interface ProgressAssessment {
  /** Task being assessed */
  taskId: string;
  /** Estimated completion (0.0 - 1.0) */
  completionEstimate: number;
  /** Confidence in the estimate (0.0 - 1.0) */
  confidence: number;
  /** Work remaining to be done */
  remainingWork: string[];
  /** Work that has been completed */
  completedWork: string[];
  /** Current blockers */
  blockers: string[];
  /** Identified risks */
  risks: Risk[];
  /** Estimated remaining time in minutes */
  estimatedRemainingTime: number;
  /** When this assessment was made */
  assessedAt: Date;
}

// ============================================================================
// Blocker Assessment Types
// ============================================================================

/**
 * A blocker preventing progress
 */
export interface Blocker {
  /** Unique identifier */
  id: string;
  /** Type of blocker */
  type: BlockerType;
  /** Description of the blocker */
  description: string;
  /** Files affected by this blocker */
  affectedFiles: string[];
  /** Possible solutions to try */
  possibleSolutions: string[];
  /** Whether human intervention is needed */
  needsHuman: boolean;
  /** When the blocker was detected */
  detectedAt: Date;
}

/**
 * Assessment of current blockers
 */
export interface BlockerAssessment {
  /** Task being assessed */
  taskId: string;
  /** List of detected blockers */
  blockers: Blocker[];
  /** Overall severity */
  severity: BlockerSeverity;
  /** Whether work can proceed despite blockers */
  canProceed: boolean;
  /** Suggested actions to address blockers */
  suggestedActions: string[];
  /** When this assessment was made */
  assessedAt: Date;
}

// ============================================================================
// Approach Assessment Types
// ============================================================================

/**
 * An alternative approach that could be tried
 */
export interface AlternativeApproach {
  /** Unique identifier */
  id: string;
  /** Description of the approach */
  description: string;
  /** Advantages of this approach */
  pros: string[];
  /** Disadvantages of this approach */
  cons: string[];
  /** Estimated effort in minutes */
  estimatedEffort: number;
  /** Confidence in this approach (0.0 - 1.0) */
  confidence: number;
  /** Changes required to implement this approach */
  requiredChanges: string[];
}

/**
 * Assessment of the current approach
 */
export interface ApproachAssessment {
  /** Task being assessed */
  taskId: string;
  /** Description of current approach */
  currentApproach: string;
  /** Effectiveness level of current approach */
  effectiveness: EffectivenessLevel;
  /** Confidence in this assessment (0.0 - 1.0) */
  confidence: number;
  /** Alternative approaches that could be tried */
  alternatives: AlternativeApproach[];
  /** Recommendation based on assessment */
  recommendation: string;
  /** When this assessment was made */
  assessedAt: Date;
}

// ============================================================================
// Recommendation Types
// ============================================================================

/**
 * A recommendation for next action
 */
export interface Recommendation {
  /** Recommended action */
  action: RecommendedAction;
  /** Reason for this recommendation */
  reason: string;
  /** Additional details */
  details: string;
  /** Confidence in this recommendation (0.0 - 1.0) */
  confidence: number;
  /** Priority (1-5, 1 is highest) */
  priority: number;
}

// ============================================================================
// Historical Learning Types
// ============================================================================

/**
 * Outcome of a completed task
 */
export interface TaskOutcome {
  /** Task identifier */
  taskId: string;
  /** Whether task completed successfully */
  success: boolean;
  /** Approach used */
  approach: string;
  /** Number of iterations required */
  iterations: number;
  /** Time spent in minutes */
  timeSpent: number;
  /** Blockers encountered */
  blockers: string[];
  /** Lessons learned */
  lessonsLearned: string[];
  /** When task was completed */
  completedAt: Date;
}

/**
 * Insight derived from historical task outcomes
 */
export interface HistoricalInsight {
  /** Pattern identified */
  pattern: string;
  /** Type of tasks this applies to */
  taskType: string;
  /** Success rate for similar tasks */
  successRate: number;
  /** Average iterations for similar tasks */
  averageIterations: number;
  /** Average time for similar tasks in minutes */
  averageTime: number;
  /** Common blockers encountered */
  commonBlockers: string[];
  /** Recommended approach based on history */
  recommendedApproach: string;
  /** Number of tasks this insight is based on */
  sampleSize: number;
}

// ============================================================================
// Assessment Context
// ============================================================================

/**
 * Context provided for assessment
 */
export interface AssessmentContext {
  /** Task identifier */
  taskId: string;
  /** Task name */
  taskName: string;
  /** Task description */
  taskDescription: string;
  /** Files involved in the task */
  taskFiles: string[];
  /** Acceptance criteria for the task */
  acceptanceCriteria?: string[];
  /** History of iterations */
  iterationHistory: IterationHistoryEntry[];
  /** Current errors */
  currentErrors: ErrorEntry[];
  /** Feedback from agent */
  agentFeedback?: string;
  /** Recent code changes (diff) */
  codeChanges?: string;
  /** Estimated time for the task in minutes */
  estimatedTime?: number;
  /** Maximum iterations allowed */
  maxIterations?: number;
  /** Time elapsed so far in minutes */
  timeElapsed?: number;
}

// ============================================================================
// Full Assessment
// ============================================================================

/**
 * Combined assessment of all aspects
 */
export interface FullAssessment {
  /** Task identifier */
  taskId: string;
  /** Progress assessment */
  progress: ProgressAssessment;
  /** Blocker assessment */
  blockers: BlockerAssessment;
  /** Approach assessment */
  approach: ApproachAssessment;
  /** Recommended next action */
  recommendation: Recommendation;
  /** When this assessment was made */
  assessedAt: Date;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Interface for progress assessment component
 */
export interface IProgressAssessor {
  /**
   * Assess task progress
   *
   * @param context Assessment context
   * @returns Progress assessment
   */
  assess(context: AssessmentContext): Promise<ProgressAssessment>;
}

/**
 * Interface for blocker detection component
 */
export interface IBlockerDetector {
  /**
   * Detect blockers in current task
   *
   * @param context Assessment context
   * @returns Blocker assessment
   */
  detect(context: AssessmentContext): Promise<BlockerAssessment>;
}

/**
 * Interface for approach evaluation component
 */
export interface IApproachEvaluator {
  /**
   * Evaluate the current approach
   *
   * @param context Assessment context
   * @returns Approach assessment
   */
  evaluate(context: AssessmentContext): Promise<ApproachAssessment>;
}

/**
 * Interface for historical learning component
 */
export interface IHistoricalLearner {
  /**
   * Record a task outcome for learning
   *
   * @param outcome Task outcome to record
   */
  recordOutcome(outcome: TaskOutcome): Promise<void>;

  /**
   * Get insights for a task type
   *
   * @param taskType Type of task
   * @returns Historical insights
   */
  getInsights(taskType: string): Promise<HistoricalInsight[]>;

  /**
   * Find similar past tasks
   *
   * @param taskDescription Description to match
   * @returns Similar task outcomes
   */
  findSimilarTasks(taskDescription: string): Promise<TaskOutcome[]>;
}

// ============================================================================
// Main Interface: Self-Assessment Engine
// ============================================================================

/**
 * Interface for the Self-Assessment Engine
 *
 * Enables agents to assess their own progress, detect blockers,
 * evaluate their approach, and learn from historical outcomes.
 */
export interface ISelfAssessmentEngine {
  // =========================================================================
  // Assessment
  // =========================================================================

  /**
   * Assess task progress
   *
   * @param taskId Task to assess
   * @param context Assessment context
   * @returns Progress assessment
   */
  assessProgress(taskId: string, context: AssessmentContext): Promise<ProgressAssessment>;

  /**
   * Assess current blockers
   *
   * @param taskId Task to assess
   * @param context Assessment context
   * @returns Blocker assessment
   */
  assessBlockers(taskId: string, context: AssessmentContext): Promise<BlockerAssessment>;

  /**
   * Assess current approach
   *
   * @param taskId Task to assess
   * @param context Assessment context
   * @returns Approach assessment
   */
  assessApproach(taskId: string, context: AssessmentContext): Promise<ApproachAssessment>;

  // =========================================================================
  // Recommendations
  // =========================================================================

  /**
   * Get recommendation for next step
   *
   * @param taskId Task to get recommendation for
   * @returns Recommended action
   */
  recommendNextStep(taskId: string): Promise<Recommendation>;

  /**
   * Get alternative approaches
   *
   * @param taskId Task to get alternatives for
   * @returns Alternative approaches
   */
  recommendAlternativeApproach(taskId: string): Promise<AlternativeApproach[]>;

  // =========================================================================
  // Learning
  // =========================================================================

  /**
   * Record a task outcome for learning
   *
   * @param outcome Task outcome
   */
  recordOutcome(outcome: TaskOutcome): Promise<void>;

  /**
   * Get historical insights for a task type
   *
   * @param taskType Type of task
   * @returns Historical insights
   */
  getHistoricalInsights(taskType: string): Promise<HistoricalInsight[]>;

  // =========================================================================
  // Combined Assessment
  // =========================================================================

  /**
   * Get a full assessment of all aspects
   *
   * @param taskId Task to assess
   * @param context Assessment context
   * @returns Full assessment
   */
  getFullAssessment(taskId: string, context: AssessmentContext): Promise<FullAssessment>;
}

// ============================================================================
// Assessment Cache Types
// ============================================================================

/**
 * Cached assessment entry
 */
export interface CachedAssessment<T> {
  /** The cached assessment */
  assessment: T;
  /** When the assessment was cached */
  cachedAt: Date;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Assessment cache configuration
 */
export interface AssessmentCacheConfig {
  /** TTL for progress assessments in milliseconds (default: 5 minutes) */
  progressTtl: number;
  /** TTL for blocker assessments in milliseconds (default: 2 minutes) */
  blockersTtl: number;
  /** TTL for approach assessments in milliseconds (default: 5 minutes) */
  approachTtl: number;
  /** Maximum cache size per task */
  maxSize: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: AssessmentCacheConfig = {
  progressTtl: 5 * 60 * 1000,   // 5 minutes
  blockersTtl: 2 * 60 * 1000,   // 2 minutes
  approachTtl: 5 * 60 * 1000,   // 5 minutes
  maxSize: 100,
};

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Configuration for creating a Self-Assessment Engine
 */
export interface SelfAssessmentEngineConfig {
  /** Progress assessor implementation */
  progressAssessor?: IProgressAssessor;
  /** Blocker detector implementation */
  blockerDetector?: IBlockerDetector;
  /** Approach evaluator implementation */
  approachEvaluator?: IApproachEvaluator;
  /** Historical learner implementation */
  historicalLearner?: IHistoricalLearner;
  /** Cache configuration */
  cacheConfig?: Partial<AssessmentCacheConfig>;
  /** Event emitter for notifications */
  eventEmitter?: AssessmentEventEmitter;
}

/**
 * Events emitted by the assessment engine
 */
export interface AssessmentEventEmitter {
  /** Emit when progress is assessed */
  onProgressAssessed?(taskId: string, assessment: ProgressAssessment): void;
  /** Emit when blockers are detected */
  onBlockersDetected?(taskId: string, assessment: BlockerAssessment): void;
  /** Emit when approach is evaluated */
  onApproachEvaluated?(taskId: string, assessment: ApproachAssessment): void;
  /** Emit when recommendation is made */
  onRecommendation?(taskId: string, recommendation: Recommendation): void;
  /** Emit when outcome is recorded */
  onOutcomeRecorded?(taskId: string, outcome: TaskOutcome): void;
}

// ============================================================================
// Error Patterns for Blocker Detection
// ============================================================================

/**
 * Pattern for detecting a specific type of blocker
 */
export interface BlockerPattern {
  /** Type of blocker this pattern detects */
  type: BlockerType;
  /** Regex pattern to match in error messages */
  pattern: RegExp;
  /** Description of what this pattern matches */
  description: string;
  /** Whether this blocker typically needs human intervention */
  needsHuman: boolean;
  /** Severity level of blockers matching this pattern */
  severity: BlockerSeverity;
  /** Suggested solutions for this type of blocker */
  suggestedSolutions: string[];
}

/**
 * Default blocker patterns for detection
 */
export const DEFAULT_BLOCKER_PATTERNS: BlockerPattern[] = [
  // Technical blockers
  {
    type: 'technical',
    pattern: /Cannot find module|Module not found/i,
    description: 'Missing module or import',
    needsHuman: false,
    severity: 'medium',
    suggestedSolutions: [
      'Check import path is correct',
      'Install missing package',
      'Check tsconfig paths configuration',
    ],
  },
  {
    type: 'technical',
    pattern: /Type '.*' is not assignable to type/i,
    description: 'Type mismatch error',
    needsHuman: false,
    severity: 'medium',
    suggestedSolutions: [
      'Add proper type annotations',
      'Use type assertion if intentional',
      'Update interface definition',
    ],
  },
  {
    type: 'technical',
    pattern: /SyntaxError|Unexpected token/i,
    description: 'Syntax error in code',
    needsHuman: false,
    severity: 'high',
    suggestedSolutions: [
      'Check for missing brackets or parentheses',
      'Verify string literals are properly closed',
      'Check for invalid JavaScript syntax',
    ],
  },
  // Dependency blockers
  {
    type: 'dependency',
    pattern: /peer dep missing|ERESOLVE|npm ERR! peer/i,
    description: 'Peer dependency conflict',
    needsHuman: false,
    severity: 'high',
    suggestedSolutions: [
      'Update conflicting packages',
      'Use --legacy-peer-deps',
      'Check package.json for version constraints',
    ],
  },
  {
    type: 'dependency',
    pattern: /Circular dependency|cycle detected/i,
    description: 'Circular dependency detected',
    needsHuman: true,
    severity: 'high',
    suggestedSolutions: [
      'Refactor to break the cycle',
      'Use lazy imports',
      'Restructure module dependencies',
    ],
  },
  // Requirement blockers
  {
    type: 'unclear_requirement',
    pattern: /unclear|ambiguous|not specified|missing requirement/i,
    description: 'Unclear or missing requirement',
    needsHuman: true,
    severity: 'high',
    suggestedSolutions: [
      'Request clarification from user',
      'Make reasonable assumptions and document them',
      'Ask for example or specification',
    ],
  },
  // External blockers
  {
    type: 'external',
    pattern: /ECONNREFUSED|ETIMEDOUT|Network error|API unavailable/i,
    description: 'External service unavailable',
    needsHuman: false,
    severity: 'medium',
    suggestedSolutions: [
      'Retry the operation',
      'Check service status',
      'Use offline fallback if available',
    ],
  },
  // Knowledge gap blockers
  {
    type: 'knowledge_gap',
    pattern: /I don't know|not familiar|unsure how|need to research/i,
    description: 'Knowledge gap identified',
    needsHuman: false,
    severity: 'low',
    suggestedSolutions: [
      'Research the topic',
      'Check documentation',
      'Look for similar examples',
    ],
  },
];

// ============================================================================
// Progress Indicators
// ============================================================================

/**
 * Indicators for assessing progress
 */
export interface ProgressIndicators {
  /** Ratio of iterations used (current / max) */
  iterationRatio: number;
  /** Ratio of time used (elapsed / estimated) */
  timeRatio: number;
  /** Number of tests passing vs total */
  testPassRatio?: number;
  /** Number of files modified vs expected */
  fileModificationRatio: number;
  /** Error trend (decreasing, stable, increasing) */
  errorTrend: 'decreasing' | 'stable' | 'increasing';
  /** Number of unique errors encountered */
  uniqueErrors: number;
  /** Consecutive successful iterations */
  successfulStreak: number;
}

/**
 * Thresholds for progress assessment
 */
export interface ProgressThresholds {
  /** Completion estimate threshold for "almost done" (default: 0.8) */
  almostDone: number;
  /** Completion estimate threshold for "good progress" (default: 0.5) */
  goodProgress: number;
  /** Error decrease threshold to consider progress (default: 0.2) */
  errorDecreaseThreshold: number;
  /** Minimum confidence for progress estimate (default: 0.3) */
  minimumConfidence: number;
}

/**
 * Default progress thresholds
 */
export const DEFAULT_PROGRESS_THRESHOLDS: ProgressThresholds = {
  almostDone: 0.8,
  goodProgress: 0.5,
  errorDecreaseThreshold: 0.2,
  minimumConfidence: 0.3,
};

// ============================================================================
// Approach Effectiveness Criteria
// ============================================================================

/**
 * Criteria for determining approach effectiveness
 */
export interface EffectivenessCriteria {
  /** Error count is decreasing over iterations */
  errorsDecreasing: boolean;
  /** Tests are passing or improving */
  testsImproving: boolean;
  /** No repeated identical errors */
  noRepeatedErrors: boolean;
  /** Making progress on files */
  filesProgressing: boolean;
  /** No scope creep detected */
  noScopeCreep: boolean;
}

/**
 * Map from criteria patterns to effectiveness levels
 */
export const EFFECTIVENESS_MAPPING: Array<{
  criteria: Partial<EffectivenessCriteria>;
  level: EffectivenessLevel;
}> = [
  // Working: Everything is good
  {
    criteria: {
      errorsDecreasing: true,
      testsImproving: true,
      noRepeatedErrors: true,
    },
    level: 'working',
  },
  // Struggling: Some issues but making progress
  {
    criteria: {
      errorsDecreasing: false,
      noRepeatedErrors: true,
      filesProgressing: true,
    },
    level: 'struggling',
  },
  // Stuck: No progress, repeated errors
  {
    criteria: {
      errorsDecreasing: false,
      noRepeatedErrors: false,
    },
    level: 'stuck',
  },
  // Wrong direction: Things getting worse
  {
    criteria: {
      errorsDecreasing: false,
      noScopeCreep: false,
    },
    level: 'wrong_direction',
  },
];
