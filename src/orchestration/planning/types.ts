/**
 * Dynamic Replanner Types and Interfaces
 *
 * This module defines all TypeScript types for the Dynamic Replanner system,
 * which detects task complexity and triggers replanning when needed.
 *
 * Layer 2/3: Orchestration / Planning
 *
 * Philosophy:
 * - Detect when tasks are more complex than initially estimated
 * - Trigger replanning based on multiple signals
 * - Split or rescope tasks when needed
 * - Allow agents to request replanning
 */

import type { ErrorEntry } from '../../execution/iteration/types';

// Re-export for convenience
export type { ErrorEntry };

// ============================================================================
// Trigger Types
// ============================================================================

/**
 * Types of triggers that can initiate replanning
 */
export type ReplanTrigger =
  | 'time_exceeded'        // Task taking longer than estimated
  | 'iterations_high'      // High iteration count relative to max
  | 'scope_creep'          // More files modified than expected
  | 'complexity_discovered' // Complex patterns detected
  | 'dependency_discovered' // New dependencies found
  | 'blocking_issue'        // Consecutive failures
  | 'agent_request';        // Agent explicitly requested replan

/**
 * Actions that can be taken when replanning is triggered
 */
export type ReplanAction =
  | 'continue'   // No change needed, keep going
  | 'split'      // Split task into smaller subtasks
  | 'rescope'    // Reduce scope of current task
  | 'escalate'   // Pause and notify human
  | 'abort';     // Stop task entirely

// ============================================================================
// Threshold Configuration
// ============================================================================

/**
 * Configurable thresholds for trigger evaluation
 */
export interface TriggerThresholds {
  /** Time exceeded ratio (default: 1.5 = 150% of estimate) */
  timeExceededRatio: number;
  /** Iteration ratio (default: 0.4 = 40% of max iterations) */
  iterationsRatio: number;
  /** Number of extra files indicating scope creep (default: 3) */
  scopeCreepFiles: number;
  /** Consecutive failures before triggering (default: 5) */
  consecutiveFailures: number;
  /** Keywords indicating complexity */
  complexityKeywords: string[];
}

/**
 * Default thresholds for trigger evaluation
 */
export const DEFAULT_TRIGGER_THRESHOLDS: TriggerThresholds = {
  timeExceededRatio: 1.5,
  iterationsRatio: 0.4,
  scopeCreepFiles: 3,
  consecutiveFailures: 5,
  complexityKeywords: ['refactor', 'rewrite', 'complex', 'difficult', 'blocked'],
};

// ============================================================================
// Execution Context
// ============================================================================

/**
 * Context about current task execution for replanning evaluation
 */
export interface ExecutionContext {
  /** Unique task identifier */
  taskId: string;
  /** Human-readable task name */
  taskName: string;
  /** Estimated time in minutes */
  estimatedTime: number;
  /** Time elapsed in minutes */
  timeElapsed: number;
  /** Current iteration number */
  iteration: number;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Files expected to be modified */
  filesExpected: string[];
  /** Files actually modified so far */
  filesModified: string[];
  /** Errors encountered */
  errors: ErrorEntry[];
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Feedback from agent (if any) */
  agentFeedback?: string;
}

// ============================================================================
// Metrics
// ============================================================================

/**
 * Metrics calculated during replanning evaluation
 */
export interface ReplanMetrics {
  /** Time elapsed in minutes */
  timeElapsed: number;
  /** Estimated time in minutes */
  estimatedTime: number;
  /** Ratio of elapsed to estimated time */
  timeRatio: number;
  /** Current iteration number */
  iterations: number;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Ratio of iterations to max */
  iterationRatio: number;
  /** Number of files modified */
  filesModified: number;
  /** Number of files expected */
  filesExpected: number;
  /** Count of unexpected files (scope creep) */
  scopeCreepCount: number;
  /** Total errors encountered */
  errorsEncountered: number;
  /** Consecutive failures */
  consecutiveFailures: number;
}

// ============================================================================
// Replanning Decision Types
// ============================================================================

/**
 * Reason for recommending replanning
 */
export interface ReplanReason {
  /** Which trigger was activated */
  trigger: ReplanTrigger;
  /** Human-readable details */
  details: string;
  /** Metrics that led to this decision */
  metrics: ReplanMetrics;
  /** Confidence in this decision (0.0 - 1.0) */
  confidence: number;
}

/**
 * Decision on whether to replan
 */
export interface ReplanDecision {
  /** Whether replanning is recommended */
  shouldReplan: boolean;
  /** Reason for recommendation (if shouldReplan is true) */
  reason?: ReplanReason;
  /** Suggested action to take */
  suggestedAction: ReplanAction;
  /** Confidence in this decision (0.0 - 1.0) */
  confidence: number;
  /** When this decision was made */
  timestamp: Date;
}

/**
 * Result of executing a replan action
 */
export interface ReplanResult {
  /** Whether replan was successful */
  success: boolean;
  /** Action that was taken */
  action: ReplanAction;
  /** Original task that was replanned */
  originalTask: Task;
  /** New tasks created (if split) */
  newTasks?: Task[];
  /** Human-readable message */
  message: string;
  /** Metrics at time of replan */
  metrics: ReplanMetrics;
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Status of a task in the system
 */
export type TaskStatus =
  | 'pending'    // Not yet started
  | 'in_progress' // Currently executing
  | 'completed'  // Successfully completed
  | 'failed'     // Failed permanently
  | 'split'      // Split into subtasks
  | 'escalated'; // Escalated to human

/**
 * Represents a task in the system
 */
export interface Task {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** Files involved in this task */
  files: string[];
  /** Estimated time in minutes */
  estimatedTime: number;
  /** Task IDs this task depends on */
  dependencies: string[];
  /** Acceptance criteria for completion */
  acceptanceCriteria: string[];
  /** Current status */
  status: TaskStatus;
  /** Parent task ID if this is a subtask */
  parentTaskId?: string;
}

/**
 * A task being actively monitored for replanning
 */
export interface MonitoredTask {
  /** Task identifier */
  taskId: string;
  /** When monitoring started */
  startedAt: Date;
  /** Current execution context */
  context: ExecutionContext;
  /** History of replan decisions */
  decisions: ReplanDecision[];
  /** Whether task is still active */
  isActive: boolean;
}

// ============================================================================
// Trigger Evaluator Interface
// ============================================================================

/**
 * Result of evaluating a single trigger
 */
export interface TriggerResult {
  /** Whether this trigger was activated */
  triggered: boolean;
  /** Which trigger was evaluated */
  trigger: ReplanTrigger;
  /** Confidence in this evaluation (0.0 - 1.0) */
  confidence: number;
  /** Details about why trigger was activated or not */
  details: string;
  /** Relevant metrics from evaluation */
  metrics: Partial<ReplanMetrics>;
}

/**
 * Interface for individual trigger evaluators
 */
export interface ITriggerEvaluator {
  /** The trigger type this evaluator handles */
  readonly trigger: ReplanTrigger;

  /**
   * Evaluate whether this trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult;
}

// ============================================================================
// Task Splitter Interface
// ============================================================================

/**
 * Interface for splitting tasks into smaller subtasks
 */
export interface ITaskSplitter {
  /**
   * Check if a task can be split
   *
   * @param task Task to evaluate
   * @param reason Reason for potential split
   * @returns Whether task can be split
   */
  canSplit(task: Task, reason: ReplanReason): boolean;

  /**
   * Split a task into smaller subtasks
   *
   * @param task Task to split
   * @param reason Reason for splitting
   * @returns Array of subtasks
   */
  split(task: Task, reason: ReplanReason): Promise<Task[]>;

  /**
   * Estimate how many subtasks a task should be split into
   *
   * @param task Task to evaluate
   * @returns Suggested number of subtasks
   */
  estimateSubtasks(task: Task): number;
}

// ============================================================================
// Agent Replan Request
// ============================================================================

/**
 * Request from an agent to trigger replanning
 */
export interface AgentReplanRequest {
  /** Task being worked on */
  taskId: string;
  /** Agent making the request */
  agentId: string;
  /** Reason for requesting replan */
  reason: string;
  /** Agent's suggestion for how to proceed */
  suggestion?: string;
  /** Specific blockers identified */
  blockers?: string[];
  /** Details about discovered complexity */
  complexityDetails?: string;
}

// ============================================================================
// Main Interface: Dynamic Replanner
// ============================================================================

/**
 * Interface for the Dynamic Replanner
 *
 * Monitors task execution and triggers replanning when tasks
 * prove more complex than initially estimated.
 */
export interface IDynamicReplanner {
  // =========================================================================
  // Monitoring
  // =========================================================================

  /**
   * Start monitoring a task for potential replanning
   *
   * @param taskId Task to monitor
   * @param context Initial execution context
   */
  startMonitoring(taskId: string, context: ExecutionContext): void;

  /**
   * Stop monitoring a task
   *
   * @param taskId Task to stop monitoring
   */
  stopMonitoring(taskId: string): void;

  /**
   * Update execution context for a monitored task
   *
   * @param taskId Task to update
   * @param context Partial context update
   */
  updateContext(taskId: string, context: Partial<ExecutionContext>): void;

  // =========================================================================
  // Evaluation
  // =========================================================================

  /**
   * Check if replanning is needed for a task
   *
   * @param taskId Task to check
   * @returns Replan decision
   */
  checkReplanningNeeded(taskId: string): ReplanDecision;

  /**
   * Evaluate all triggers against a context
   *
   * @param context Execution context to evaluate
   * @returns Replan decision
   */
  evaluateAllTriggers(context: ExecutionContext): ReplanDecision;

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Execute replanning for a task
   *
   * @param taskId Task to replan
   * @param reason Reason for replanning
   * @returns Replan result
   */
  replan(taskId: string, reason: ReplanReason): Promise<ReplanResult>;

  /**
   * Handle a replan request from an agent
   *
   * @param taskId Task the agent is working on
   * @param request Agent's replan request
   * @returns Replan decision
   */
  handleAgentRequest(taskId: string, request: AgentReplanRequest): Promise<ReplanDecision>;

  // =========================================================================
  // Configuration
  // =========================================================================

  /**
   * Update trigger thresholds
   *
   * @param thresholds Partial threshold update
   */
  setThresholds(thresholds: Partial<TriggerThresholds>): void;

  /**
   * Get current trigger thresholds
   *
   * @returns Current thresholds
   */
  getThresholds(): TriggerThresholds;

  // =========================================================================
  // Status
  // =========================================================================

  /**
   * Get all currently monitored tasks
   *
   * @returns Array of monitored tasks
   */
  getMonitoredTasks(): MonitoredTask[];

  /**
   * Get decision history for a task
   *
   * @param taskId Task to get history for
   * @returns Array of past decisions
   */
  getDecisionHistory(taskId: string): ReplanDecision[];
}

// ============================================================================
// Trigger Priority
// ============================================================================

/**
 * Priority order for triggers (higher = more urgent)
 */
export const TRIGGER_PRIORITY: Record<ReplanTrigger, number> = {
  blocking_issue: 100,
  agent_request: 90,
  scope_creep: 70,
  complexity_discovered: 60,
  dependency_discovered: 50,
  time_exceeded: 40,
  iterations_high: 30,
};

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Configuration for creating a Dynamic Replanner
 */
export interface DynamicReplannerConfig {
  /** Trigger evaluators to use */
  triggers?: ITriggerEvaluator[];
  /** Task splitter implementation */
  taskSplitter?: ITaskSplitter;
  /** Custom trigger thresholds */
  thresholds?: Partial<TriggerThresholds>;
  /** Event emitter for notifications */
  eventEmitter?: ReplannerEventEmitter;
}

/**
 * Events emitted by the replanner
 */
export interface ReplannerEventEmitter {
  /** Emit when monitoring starts */
  onMonitoringStarted?(taskId: string): void;
  /** Emit when monitoring stops */
  onMonitoringStopped?(taskId: string): void;
  /** Emit when a trigger is activated */
  onTriggerActivated?(taskId: string, trigger: ReplanTrigger): void;
  /** Emit when replanning decision is made */
  onReplanDecision?(taskId: string, decision: ReplanDecision): void;
  /** Emit when replan is executed */
  onReplanExecuted?(taskId: string, result: ReplanResult): void;
}
