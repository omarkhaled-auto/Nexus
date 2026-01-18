/**
 * Assessment-Replanner Bridge
 *
 * Connects the Dynamic Replanner and Self-Assessment Engine, providing a unified
 * interface for task monitoring, assessment, and replanning.
 *
 * Layer 2: Orchestration
 *
 * This bridge:
 * - Uses assessment data to inform replanning decisions
 * - Converts blocker assessments to replanning triggers
 * - Provides a unified API for the orchestration layer
 * - Coordinates between the two modules
 */

import {
  DynamicReplanner,
  createDefaultReplanner,
  type ExecutionContext,
  type ReplanDecision,
  type ReplanResult,
  type ReplanReason,
  type Task,
  type TriggerThresholds,
} from './planning';

import {
  SelfAssessmentEngine,
  createFullSelfAssessmentEngine,
  type AssessmentContext,
  type FullAssessment,
  type BlockerAssessment,
  type ProgressAssessment,
  type ApproachAssessment,
  type Recommendation,
  type TaskOutcome,
  type HistoricalInsight,
} from './assessment';

// ============================================================================
// Types
// ============================================================================

/**
 * Combined result of assessment and replan check
 */
export interface AssessmentReplanResult {
  /** Full assessment of the task */
  assessment: FullAssessment;
  /** Replan decision based on assessment and triggers */
  replanDecision: ReplanDecision;
  /** Whether immediate action is recommended */
  requiresAction: boolean;
  /** Timestamp of this result */
  timestamp: Date;
}

/**
 * Configuration for the bridge
 */
export interface BridgeConfig {
  /** Custom replanner instance (optional) */
  replanner?: DynamicReplanner;
  /** Custom assessment engine instance (optional) */
  assessmentEngine?: SelfAssessmentEngine;
  /** Trigger thresholds */
  thresholds?: Partial<TriggerThresholds>;
  /** Whether to auto-trigger replan on critical blockers */
  autoReplanOnCritical?: boolean;
  /** Event emitter for notifications */
  eventEmitter?: BridgeEventEmitter;
}

/**
 * Events emitted by the bridge
 */
export interface BridgeEventEmitter {
  /** Called when assessment completes */
  onAssessmentComplete?(taskId: string, assessment: FullAssessment): void;
  /** Called when replan is triggered from assessment */
  onReplanTriggered?(taskId: string, reason: string): void;
  /** Called when critical blocker is detected */
  onCriticalBlocker?(taskId: string, blockerAssessment: BlockerAssessment): void;
  /** Called when task is split */
  onTaskSplit?(taskId: string, newTasks: Task[]): void;
}

// ============================================================================
// Bridge Implementation
// ============================================================================

/**
 * AssessmentReplannerBridge
 *
 * Bridges the Dynamic Replanner and Self-Assessment Engine to provide
 * unified task monitoring and intelligent replanning.
 */
export class AssessmentReplannerBridge {
  private readonly replanner: DynamicReplanner;
  private readonly assessmentEngine: SelfAssessmentEngine;
  private readonly autoReplanOnCritical: boolean;
  private readonly eventEmitter?: BridgeEventEmitter;

  // Store last assessment per task for correlation
  private readonly lastAssessments: Map<string, FullAssessment> = new Map();

  constructor(config: BridgeConfig = {}) {
    this.replanner = config.replanner ?? createDefaultReplanner(config.thresholds);
    this.assessmentEngine = config.assessmentEngine ?? createFullSelfAssessmentEngine();
    this.autoReplanOnCritical = config.autoReplanOnCritical ?? true;
    this.eventEmitter = config.eventEmitter;
  }

  // =========================================================================
  // Main API
  // =========================================================================

  /**
   * Assess task and check if replanning is needed
   *
   * This is the main method that combines assessment and replanning logic.
   *
   * @param taskId Task to assess
   * @param assessmentContext Context for assessment
   * @param executionContext Context for replanning
   * @returns Combined result
   */
  async assessAndCheckReplan(
    taskId: string,
    assessmentContext: AssessmentContext,
    executionContext?: ExecutionContext
  ): Promise<AssessmentReplanResult> {
    // Get full assessment
    const assessment = await this.assessmentEngine.getFullAssessment(taskId, assessmentContext);
    this.lastAssessments.set(taskId, assessment);

    // Emit assessment complete event
    this.eventEmitter?.onAssessmentComplete?.(taskId, assessment);

    // Convert to execution context if not provided
    const execContext = executionContext ?? this.buildExecutionContext(taskId, assessmentContext, assessment);

    // Update replanner context if monitoring
    if (this.isMonitoring(taskId)) {
      this.replanner.updateContext(taskId, execContext);
    } else {
      // Start monitoring if not already
      this.replanner.startMonitoring(taskId, execContext);
    }

    // Check for replanning based on triggers
    let replanDecision = this.replanner.checkReplanningNeeded(taskId);

    // If no trigger but critical blocker, create a decision
    if (!replanDecision.shouldReplan && assessment.blockers.severity === 'critical') {
      this.eventEmitter?.onCriticalBlocker?.(taskId, assessment.blockers);

      if (this.autoReplanOnCritical) {
        replanDecision = {
          shouldReplan: true,
          reason: {
            trigger: 'blocking_issue',
            details: `Critical blocker detected: ${assessment.blockers.blockers[0]?.description ?? 'Unknown'}`,
            metrics: this.buildMetrics(execContext),
            confidence: 0.9,
          },
          suggestedAction: assessment.blockers.blockers.some((b) => b.needsHuman) ? 'escalate' : 'split',
          confidence: 0.9,
          timestamp: new Date(),
        };
      }
    }

    // Map assessment recommendation to replan action if needed
    const requiresAction =
      replanDecision.shouldReplan ||
      assessment.recommendation.action !== 'continue' ||
      assessment.blockers.severity === 'critical' ||
      assessment.blockers.severity === 'high';

    return {
      assessment,
      replanDecision,
      requiresAction,
      timestamp: new Date(),
    };
  }

  /**
   * Execute replan based on previous assessment
   *
   * @param taskId Task to replan
   * @param reason Reason for replanning
   * @returns Replan result
   */
  async executeReplan(taskId: string, reason: ReplanReason): Promise<ReplanResult> {
    const result = await this.replanner.replan(taskId, reason);

    // Emit event if task was split
    if (result.newTasks && result.newTasks.length > 0) {
      this.eventEmitter?.onTaskSplit?.(taskId, result.newTasks);
    }

    return result;
  }

  /**
   * Handle assessment-triggered replan
   *
   * Convenience method that combines assessment check and replan execution.
   *
   * @param taskId Task to handle
   * @param assessmentContext Assessment context
   * @returns Replan result if replanning occurred, null otherwise
   */
  async handleAssessmentReplan(
    taskId: string,
    assessmentContext: AssessmentContext
  ): Promise<ReplanResult | null> {
    const result = await this.assessAndCheckReplan(taskId, assessmentContext);

    if (result.replanDecision.shouldReplan && result.replanDecision.reason) {
      this.eventEmitter?.onReplanTriggered?.(taskId, result.replanDecision.reason.details);
      return this.executeReplan(taskId, result.replanDecision.reason);
    }

    return null;
  }

  // =========================================================================
  // Assessment Methods (delegated)
  // =========================================================================

  /**
   * Get full assessment for a task
   */
  async getFullAssessment(taskId: string, context: AssessmentContext): Promise<FullAssessment> {
    const assessment = await this.assessmentEngine.getFullAssessment(taskId, context);
    this.lastAssessments.set(taskId, assessment);
    return assessment;
  }

  /**
   * Get progress assessment
   */
  async assessProgress(taskId: string, context: AssessmentContext): Promise<ProgressAssessment> {
    return this.assessmentEngine.assessProgress(taskId, context);
  }

  /**
   * Get blocker assessment
   */
  async assessBlockers(taskId: string, context: AssessmentContext): Promise<BlockerAssessment> {
    return this.assessmentEngine.assessBlockers(taskId, context);
  }

  /**
   * Get approach assessment
   */
  async assessApproach(taskId: string, context: AssessmentContext): Promise<ApproachAssessment> {
    return this.assessmentEngine.assessApproach(taskId, context);
  }

  /**
   * Get recommendation for next step
   */
  async recommendNextStep(taskId: string): Promise<Recommendation> {
    return this.assessmentEngine.recommendNextStep(taskId);
  }

  // =========================================================================
  // Replanning Methods (delegated)
  // =========================================================================

  /**
   * Start monitoring a task
   */
  startMonitoring(taskId: string, context: ExecutionContext): void {
    this.replanner.startMonitoring(taskId, context);
  }

  /**
   * Stop monitoring a task
   */
  stopMonitoring(taskId: string): void {
    this.replanner.stopMonitoring(taskId);
    this.lastAssessments.delete(taskId);
  }

  /**
   * Check if a task is being monitored
   */
  isMonitoring(taskId: string): boolean {
    const monitored = this.replanner.getMonitoredTasks();
    return monitored.some((t) => t.taskId === taskId && t.isActive);
  }

  /**
   * Get replan decision history for a task
   */
  getDecisionHistory(taskId: string): ReplanDecision[] {
    return this.replanner.getDecisionHistory(taskId);
  }

  /**
   * Get thresholds
   */
  getThresholds(): TriggerThresholds {
    return this.replanner.getThresholds();
  }

  /**
   * Set thresholds
   */
  setThresholds(thresholds: Partial<TriggerThresholds>): void {
    this.replanner.setThresholds(thresholds);
  }

  // =========================================================================
  // Historical Learning (delegated)
  // =========================================================================

  /**
   * Record a task outcome for learning
   */
  async recordOutcome(outcome: TaskOutcome): Promise<void> {
    await this.assessmentEngine.recordOutcome(outcome);
  }

  /**
   * Get historical insights for a task type
   */
  async getHistoricalInsights(taskType: string): Promise<HistoricalInsight[]> {
    return this.assessmentEngine.getHistoricalInsights(taskType);
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Get last assessment for a task
   */
  getLastAssessment(taskId: string): FullAssessment | undefined {
    return this.lastAssessments.get(taskId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.lastAssessments.clear();
    // Stop monitoring all tasks
    const monitored = this.replanner.getMonitoredTasks();
    for (const task of monitored) {
      this.replanner.stopMonitoring(task.taskId);
    }
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Build ExecutionContext from AssessmentContext and FullAssessment
   */
  private buildExecutionContext(
    taskId: string,
    context: AssessmentContext,
    assessment: FullAssessment
  ): ExecutionContext {
    // Count consecutive failures from iteration history
    let consecutiveFailures = 0;
    if (context.iterationHistory && context.iterationHistory.length > 0) {
      for (let i = context.iterationHistory.length - 1; i >= 0; i--) {
        const iteration = context.iterationHistory[i];
        if (!iteration || iteration.errorsEncountered > 0) {
          consecutiveFailures++;
        } else {
          break;
        }
      }
    }

    return {
      taskId,
      taskName: context.taskName,
      estimatedTime: context.estimatedTime ?? 30,
      timeElapsed: context.timeElapsed ?? 0,
      iteration: context.iterationHistory?.length ?? 0,
      maxIterations: context.maxIterations ?? 20,
      filesExpected: context.taskFiles,
      filesModified: this.extractModifiedFiles(context),
      errors: context.currentErrors,
      consecutiveFailures,
      agentFeedback: context.agentFeedback,
    };
  }

  /**
   * Extract modified files from context
   */
  private extractModifiedFiles(context: AssessmentContext): string[] {
    if (!context.iterationHistory) return [];

    const files = new Set<string>();
    for (const iteration of context.iterationHistory) {
      if (iteration.filesModified) {
        for (const file of iteration.filesModified) {
          files.add(file);
        }
      }
    }
    return Array.from(files);
  }

  /**
   * Build ReplanMetrics from ExecutionContext
   */
  private buildMetrics(context: ExecutionContext): import('./planning').ReplanMetrics {
    const scopeCreepCount = context.filesModified.filter(
      (f) => !context.filesExpected.includes(f)
    ).length;

    return {
      timeElapsed: context.timeElapsed,
      estimatedTime: context.estimatedTime,
      timeRatio: context.estimatedTime > 0 ? context.timeElapsed / context.estimatedTime : 0,
      iterations: context.iteration,
      maxIterations: context.maxIterations,
      iterationRatio: context.maxIterations > 0 ? context.iteration / context.maxIterations : 0,
      filesModified: context.filesModified.length,
      filesExpected: context.filesExpected.length,
      scopeCreepCount,
      errorsEncountered: context.errors.length,
      consecutiveFailures: context.consecutiveFailures,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AssessmentReplannerBridge with default configuration
 *
 * @param config Optional configuration
 * @returns Configured bridge instance
 *
 * @example
 * ```typescript
 * const bridge = createAssessmentReplannerBridge();
 *
 * // Assess and check replan
 * const result = await bridge.assessAndCheckReplan(taskId, assessmentContext);
 *
 * if (result.requiresAction) {
 *   console.log('Action needed:', result.replanDecision.suggestedAction);
 *   if (result.replanDecision.shouldReplan && result.replanDecision.reason) {
 *     await bridge.executeReplan(taskId, result.replanDecision.reason);
 *   }
 * }
 * ```
 */
export function createAssessmentReplannerBridge(config?: BridgeConfig): AssessmentReplannerBridge {
  return new AssessmentReplannerBridge(config);
}
