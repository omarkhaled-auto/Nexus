/**
 * Self-Assessment Engine Module
 *
 * Exports all types, classes, and factory functions for the
 * Self-Assessment Engine module.
 *
 * Layer 2: Orchestration
 *
 * This module enables agents to:
 * - Assess their own progress
 * - Detect blockers
 * - Evaluate their approach
 * - Learn from historical outcomes
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Assessment types
  AssessmentType,
  EffectivenessLevel,
  BlockerType,
  BlockerSeverity,
  RecommendedAction,
  RiskType,
  // Progress types
  Risk,
  ProgressAssessment,
  // Blocker types
  Blocker,
  BlockerAssessment,
  // Approach types
  AlternativeApproach,
  ApproachAssessment,
  // Recommendation types
  Recommendation,
  // Historical types
  TaskOutcome,
  HistoricalInsight,
  // Context types
  AssessmentContext,
  // Full assessment
  FullAssessment,
  // Interface types
  ISelfAssessmentEngine,
  IProgressAssessor,
  IBlockerDetector,
  IApproachEvaluator,
  IHistoricalLearner,
  // Cache types
  CachedAssessment,
  AssessmentCacheConfig,
  // Event types
  AssessmentEventEmitter,
  // Config types
  SelfAssessmentEngineConfig,
  // Pattern types
  BlockerPattern,
  ProgressIndicators,
  ProgressThresholds,
  EffectivenessCriteria,
  // Iteration types (re-exported from execution)
  ErrorEntry,
  IterationHistoryEntry,
} from './types';

// ============================================================================
// Constants
// ============================================================================

export {
  DEFAULT_CACHE_CONFIG,
  DEFAULT_BLOCKER_PATTERNS,
  DEFAULT_PROGRESS_THRESHOLDS,
  EFFECTIVENESS_MAPPING,
} from './types';

// ============================================================================
// Class Exports
// ============================================================================

// Self-Assessment Engine
export { SelfAssessmentEngine, createSelfAssessmentEngine } from './SelfAssessmentEngine';

// Progress Assessor
export { ProgressAssessor, createProgressAssessor } from './ProgressAssessor';

// Blocker Detector
export { BlockerDetector, createBlockerDetector } from './BlockerDetector';

// Approach Evaluator
export { ApproachEvaluator, createApproachEvaluator } from './ApproachEvaluator';

// Historical Learner
export {
  HistoricalLearner,
  createHistoricalLearner,
  InMemoryOutcomeStorage,
  type IOutcomeStorage,
  type HistoricalLearnerConfig,
  type KeywordExtractor,
  DEFAULT_HISTORICAL_LEARNER_CONFIG,
} from './HistoricalLearner';

// ============================================================================
// Factory Functions
// ============================================================================

import { SelfAssessmentEngine } from './SelfAssessmentEngine';
import { ProgressAssessor } from './ProgressAssessor';
import { BlockerDetector } from './BlockerDetector';
import { ApproachEvaluator } from './ApproachEvaluator';
import { HistoricalLearner } from './HistoricalLearner';
import type { SelfAssessmentEngineConfig } from './types';

/**
 * Create a fully configured Self-Assessment Engine with all default components
 *
 * @param config Optional configuration overrides
 * @returns Configured SelfAssessmentEngine instance
 *
 * @example
 * ```typescript
 * // Create with all defaults
 * const engine = createFullSelfAssessmentEngine();
 *
 * // Create with custom config
 * const engine = createFullSelfAssessmentEngine({
 *   cacheConfig: { progressTtl: 60000 },
 * });
 *
 * // Use the engine
 * const assessment = await engine.getFullAssessment('task-1', context);
 * console.log('Progress:', assessment.progress.completionEstimate);
 * console.log('Blockers:', assessment.blockers.severity);
 * console.log('Recommendation:', assessment.recommendation.action);
 * ```
 */
export function createFullSelfAssessmentEngine(
  config: Partial<SelfAssessmentEngineConfig> = {}
): SelfAssessmentEngine {
  // Create components if not provided
  const progressAssessor = config.progressAssessor ?? new ProgressAssessor();
  const blockerDetector = config.blockerDetector ?? new BlockerDetector();
  const approachEvaluator = config.approachEvaluator ?? new ApproachEvaluator();
  const historicalLearner = config.historicalLearner ?? new HistoricalLearner();

  return new SelfAssessmentEngine({
    progressAssessor,
    blockerDetector,
    approachEvaluator,
    historicalLearner,
    cacheConfig: config.cacheConfig,
    eventEmitter: config.eventEmitter,
  });
}
