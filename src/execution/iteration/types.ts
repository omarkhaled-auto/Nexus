/**
 * Ralph-Style Iterator Types and Interfaces
 *
 * This module defines all TypeScript types for the Ralph-Style Iterator system,
 * which enables persistent iteration loops where agents can see their previous
 * work through git diffs and continue iterating until tests pass.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Philosophy:
 * - Agents can iterate persistently on tasks
 * - Git diffs provide visibility into previous work
 * - Errors are aggregated and deduplicated
 * - Escalation happens gracefully when max iterations reached
 */

import type { TaskSpec, TaskContext } from '../../orchestration/context/types';

// Re-export for convenience
export type { TaskSpec, TaskContext };

// ============================================================================
// Iteration State Types
// ============================================================================

/**
 * State of an iteration task
 */
export type IterationState =
  | 'pending'    // Task queued but not started
  | 'running'    // Currently executing
  | 'paused'     // Temporarily paused
  | 'completed'  // Successfully completed
  | 'failed'     // Failed permanently
  | 'escalated'  // Escalated to human
  | 'aborted';   // Manually aborted

/**
 * Current phase within an iteration
 */
export type IterationPhase =
  | 'initializing' // Setting up iteration
  | 'coding'       // Agent writing code
  | 'building'     // Running build step
  | 'linting'      // Running lint checks
  | 'testing'      // Running tests
  | 'reviewing'    // Code review phase
  | 'committing'   // Committing changes
  | 'finalizing';  // Completing iteration

// ============================================================================
// Iteration Options Types
// ============================================================================

/**
 * Options for configuring iteration behavior
 */
export interface IterationOptions {
  /** Maximum number of iterations before escalation (default: 20) */
  maxIterations?: number;
  /** Whether to commit after each iteration (default: true) */
  commitEachIteration?: boolean;
  /** Include git diff in subsequent iteration context (default: true) */
  includeGitDiff?: boolean;
  /** Include previous errors in iteration context (default: true) */
  includePreviousErrors?: boolean;
  /** Number of iterations after which to escalate (default: maxIterations) */
  escalateAfter?: number;
  /** Timeout in minutes before escalation (default: 60) */
  timeoutMinutes?: number;
}

/**
 * Default iteration options
 */
export const DEFAULT_ITERATION_OPTIONS: Required<IterationOptions> = {
  maxIterations: 20,
  commitEachIteration: true,
  includeGitDiff: true,
  includePreviousErrors: true,
  escalateAfter: 20,
  timeoutMinutes: 60,
};

// ============================================================================
// Iteration Result Types
// ============================================================================

/**
 * Final result of an iteration loop
 */
export interface IterationResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Task ID that was executed */
  taskId: string;
  /** Total number of iterations performed */
  iterations: number;
  /** Final state of the iteration */
  finalState: IterationState;
  /** History of all iterations */
  history: IterationHistoryEntry[];
  /** Total time elapsed in milliseconds */
  totalDuration: number;
  /** Total tokens consumed across all iterations */
  totalTokens: number;
  /** Final commit hash if successful */
  finalCommit?: string;
  /** Escalation report if escalated */
  escalationReport?: EscalationReport;
}

/**
 * Entry in iteration history
 */
export interface IterationHistoryEntry {
  /** Iteration number (1-indexed) */
  iteration: number;
  /** Current phase at time of entry */
  phase: IterationPhase;
  /** Description of action taken */
  action: string;
  /** Git changes made in this iteration */
  changes: GitChange[];
  /** Build result if build was run */
  buildResult?: BuildResult;
  /** Lint result if lint was run */
  lintResult?: LintResult;
  /** Test result if tests were run */
  testResult?: TestResult;
  /** Review result if review was run */
  reviewResult?: ReviewResult;
  /** Errors encountered in this iteration */
  errors: ErrorEntry[];
  /** Duration of this iteration in milliseconds */
  duration: number;
  /** Tokens consumed in this iteration */
  tokens: number;
  /** Timestamp of this entry */
  timestamp: Date;
  /** Commit hash if committed */
  commitHash?: string;
}

// ============================================================================
// Iteration Status Types
// ============================================================================

/**
 * Current status of an iteration task
 */
export interface IterationStatus {
  /** Task ID being iterated */
  taskId: string;
  /** Current iteration number */
  currentIteration: number;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Current state */
  state: IterationState;
  /** Current phase */
  phase: IterationPhase;
  /** Timestamp of last activity */
  lastActivity: Date;
  /** When iteration started */
  startedAt: Date;
  /** Elapsed time in milliseconds */
  elapsedTime: number;
}

// ============================================================================
// Iteration Context Types
// ============================================================================

/**
 * Context provided to agent for an iteration
 * Extends TaskContext with iteration-specific information
 */
export interface IterationContext {
  /** The task being worked on */
  task: TaskSpec;
  /** Current iteration number */
  iteration: number;
  /** Effective options for this iteration */
  options: Required<IterationOptions>;

  // Git context
  /** Diff from previous iteration (if iteration > 1) */
  previousDiff?: GitDiff;
  /** Cumulative diff from base commit */
  cumulativeDiff?: GitDiff;

  // Error context
  /** Errors from previous iterations */
  previousErrors: ErrorEntry[];

  // Results from previous iteration
  /** Last build result */
  lastBuildResult?: BuildResult;
  /** Last lint result */
  lastLintResult?: LintResult;
  /** Last test result */
  lastTestResult?: TestResult;
  /** Last review feedback */
  lastReviewFeedback?: string[];

  // Fresh task context
  /** Fresh task context from FreshContextManager */
  taskContext: TaskContext;
}

// ============================================================================
// Git Types
// ============================================================================

/**
 * A single file change in git
 */
export interface GitChange {
  /** File path relative to project root */
  file: string;
  /** Type of change */
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
}

/**
 * Git diff between two commits
 */
export interface GitDiff {
  /** Starting commit hash */
  fromCommit: string;
  /** Ending commit hash */
  toCommit: string;
  /** List of file changes */
  changes: GitChange[];
  /** Raw diff text (for agent consumption) */
  diffText: string;
  /** Aggregate statistics */
  stats: {
    /** Number of files changed */
    filesChanged: number;
    /** Total lines added */
    additions: number;
    /** Total lines deleted */
    deletions: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Type of error encountered
 */
export type ErrorType = 'build' | 'lint' | 'test' | 'review' | 'runtime';

/**
 * Severity of error
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * An error entry from any phase
 */
export interface ErrorEntry {
  /** Type of error */
  type: ErrorType;
  /** Severity level */
  severity: ErrorSeverity;
  /** Error message */
  message: string;
  /** File where error occurred (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Column number (if applicable) */
  column?: number;
  /** Error code (e.g., ESLint rule name) */
  code?: string;
  /** Suggested fix (if available) */
  suggestion?: string;
  /** Iteration where this error occurred */
  iteration: number;
}

// ============================================================================
// QA Result Types
// ============================================================================

/**
 * Result of a build step
 */
export interface BuildResult {
  /** Whether build succeeded */
  success: boolean;
  /** Build errors */
  errors: ErrorEntry[];
  /** Build warnings */
  warnings: ErrorEntry[];
  /** Build duration in milliseconds */
  duration: number;
}

/**
 * Result of a lint step
 */
export interface LintResult {
  /** Whether lint passed (no errors) */
  success: boolean;
  /** Lint errors */
  errors: ErrorEntry[];
  /** Lint warnings */
  warnings: ErrorEntry[];
  /** Number of fixable issues */
  fixable: number;
}

/**
 * Result of a test step
 */
export interface TestResult {
  /** Whether all tests passed */
  success: boolean;
  /** Number of tests passed */
  passed: number;
  /** Number of tests failed */
  failed: number;
  /** Number of tests skipped */
  skipped: number;
  /** Test errors */
  errors: ErrorEntry[];
  /** Test duration in milliseconds */
  duration: number;
}

/**
 * Result of a code review step
 */
export interface ReviewResult {
  /** Whether code is approved */
  approved: boolean;
  /** Review comments */
  comments: string[];
  /** Improvement suggestions */
  suggestions: string[];
  /** Blocking issues */
  blockers: string[];
}

// ============================================================================
// Escalation Types
// ============================================================================

/**
 * Reason for escalation
 */
export type EscalationReason =
  | 'max_iterations'    // Reached maximum iteration count
  | 'timeout'           // Exceeded time limit
  | 'repeated_failures' // Same error repeated multiple times
  | 'blocking_error'    // Fundamental error that can't be fixed automatically
  | 'agent_request';    // Agent explicitly requested human help

/**
 * Report generated when escalating to human
 */
export interface EscalationReport {
  /** Task ID that was escalated */
  taskId: string;
  /** Reason for escalation */
  reason: EscalationReason;
  /** Number of iterations completed before escalation */
  iterationsCompleted: number;
  /** Summary of what was attempted */
  summary: string;
  /** Last errors encountered */
  lastErrors: ErrorEntry[];
  /** Suggested actions for human */
  suggestedActions: string[];
  /** Checkpoint commit hash */
  checkpointCommit: string;
  /** When escalation was created */
  createdAt: Date;
}

// ============================================================================
// Main Interfaces
// ============================================================================

/**
 * Interface for the Ralph-Style Iterator
 *
 * The main class that implements persistent iteration loops.
 * Agents can iterate on tasks, seeing their previous work through git diffs,
 * until tests pass or max iterations is reached.
 */
export interface IRalphStyleIterator {
  /**
   * Execute iteration loop on a task
   *
   * This is the MAIN METHOD. It:
   * 1. Builds iteration context (fresh + git diff + errors)
   * 2. Executes agent with context
   * 3. Commits iteration work
   * 4. Runs QA (build -> lint -> test -> review)
   * 5. If all pass: success
   * 6. If fail: aggregate errors, continue
   * 7. If max iterations: escalate
   *
   * @param task Task to execute
   * @param options Iteration options
   * @returns Final iteration result
   */
  execute(task: TaskSpec, options?: IterationOptions): Promise<IterationResult>;

  /**
   * Pause an executing iteration
   *
   * @param taskId Task ID to pause
   */
  pause(taskId: string): Promise<void>;

  /**
   * Resume a paused iteration
   *
   * @param taskId Task ID to resume
   */
  resume(taskId: string): Promise<void>;

  /**
   * Abort an iteration
   *
   * @param taskId Task ID to abort
   */
  abort(taskId: string): Promise<void>;

  /**
   * Get current status of an iteration
   *
   * @param taskId Task ID to check
   * @returns Current status or null if not found
   */
  getStatus(taskId: string): IterationStatus | null;

  /**
   * Get history of an iteration
   *
   * @param taskId Task ID to get history for
   * @returns History entries
   */
  getHistory(taskId: string): IterationHistoryEntry[];
}

/**
 * Interface for building git diff context
 */
export interface IGitDiffContextBuilder {
  /**
   * Build diff context between two commits
   *
   * @param fromCommit Starting commit hash
   * @param toCommit Ending commit hash (default: HEAD)
   * @returns Git diff object
   */
  buildDiffContext(fromCommit: string, toCommit?: string): Promise<GitDiff>;

  /**
   * Build cumulative diff from base commit to HEAD
   *
   * @param baseCommit Base commit hash
   * @returns Git diff object
   */
  buildCumulativeDiff(baseCommit: string): Promise<GitDiff>;

  /**
   * Format diff for agent consumption
   * Creates a human-readable summary with diff hunks
   *
   * @param diff Git diff to format
   * @returns Formatted string for agent context
   */
  formatDiffForAgent(diff: GitDiff): string;
}

/**
 * Interface for aggregating errors from previous iterations
 */
export interface IErrorContextAggregator {
  /**
   * Add errors from an iteration
   *
   * @param errors Errors to add
   */
  addErrors(errors: ErrorEntry[]): void;

  /**
   * Get unique errors (deduplicated)
   *
   * @returns Unique error entries
   */
  getUniqueErrors(): ErrorEntry[];

  /**
   * Get errors filtered by type
   *
   * @param type Error type to filter by
   * @returns Filtered errors
   */
  getErrorsByType(type: ErrorType): ErrorEntry[];

  /**
   * Format errors for agent consumption
   *
   * @returns Formatted string for agent context
   */
  formatErrorsForAgent(): string;

  /**
   * Clear all errors
   */
  clear(): void;
}

/**
 * Interface for handling git commits for iterations
 */
export interface IIterationCommitHandler {
  /**
   * Commit changes for an iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number
   * @param message Commit message summary
   * @returns Commit hash
   */
  commitIteration(
    taskId: string,
    iteration: number,
    message: string
  ): Promise<string>;

  /**
   * Rollback to a specific iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number to rollback to
   */
  rollbackToIteration(taskId: string, iteration: number): Promise<void>;

  /**
   * Get commit hash for a specific iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number
   * @returns Commit hash or null if not found
   */
  getIterationCommit(taskId: string, iteration: number): string | null;
}

/**
 * Interface for handling escalation when iteration limits reached
 */
export interface IEscalationHandler {
  /**
   * Escalate a task to human
   *
   * @param taskId Task ID to escalate
   * @param reason Reason for escalation
   * @param context Current iteration context
   * @returns Escalation report
   */
  escalate(
    taskId: string,
    reason: EscalationReason,
    context: IterationContext
  ): Promise<EscalationReport>;

  /**
   * Create a checkpoint for the current state
   *
   * @param taskId Task ID
   * @returns Checkpoint commit hash
   */
  createCheckpoint(taskId: string): Promise<string>;

  /**
   * Notify human about escalation
   *
   * @param report Escalation report
   */
  notifyHuman(report: EscalationReport): Promise<void>;
}

// ============================================================================
// Factory Function Types
// ============================================================================

/**
 * Configuration for creating RalphStyleIterator
 */
export interface RalphStyleIteratorConfig {
  /** Project root path */
  projectPath: string;
  /** FreshContextManager for building task context */
  contextManager: unknown; // Will be IFreshContextManager
  /** Git diff context builder */
  diffBuilder?: IGitDiffContextBuilder;
  /** Error context aggregator */
  errorAggregator?: IErrorContextAggregator;
  /** Iteration commit handler */
  commitHandler?: IIterationCommitHandler;
  /** Escalation handler */
  escalationHandler?: IEscalationHandler;
  /** Agent runner function */
  agentRunner?: (context: IterationContext) => Promise<AgentExecutionResult>;
  /** QA functions */
  qaRunner?: QARunner;
}

/**
 * QA runner functions for each phase
 * Each method accepts an optional workingDir to override the default path
 */
export interface QARunner {
  /** Run build step */
  build?: (taskId: string, workingDir?: string) => Promise<BuildResult>;
  /** Run lint step */
  lint?: (taskId: string, workingDir?: string) => Promise<LintResult>;
  /** Run test step */
  test?: (taskId: string, workingDir?: string) => Promise<TestResult>;
  /** Run review step */
  review?: (taskId: string, workingDir?: string) => Promise<ReviewResult>;
}

/**
 * Result from agent execution
 */
export interface AgentExecutionResult {
  /** Whether agent completed successfully */
  success: boolean;
  /** Files changed by agent */
  filesChanged: string[];
  /** Output from agent */
  output: string;
  /** Tokens used */
  tokensUsed: number;
  /** Error if failed */
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Task registry entry for tracking active iterations
 */
export interface TaskRegistryEntry {
  /** Task ID */
  taskId: string;
  /** Current state */
  state: IterationState;
  /** Current phase */
  phase: IterationPhase;
  /** Current iteration number */
  iteration: number;
  /** Effective options */
  options: Required<IterationOptions>;
  /** History entries */
  history: IterationHistoryEntry[];
  /** When started */
  startedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Base commit hash */
  baseCommit: string;
  /** Error aggregator for this task */
  errorAggregator: IErrorContextAggregator;
}

/**
 * Options for pausing iteration
 */
export interface PauseOptions {
  /** Reason for pausing */
  reason?: string;
  /** Whether to commit current changes before pausing */
  commitFirst?: boolean;
}

/**
 * Options for resuming iteration
 */
export interface ResumeOptions {
  /** Reset iteration count */
  resetIterationCount?: boolean;
  /** Clear previous errors */
  clearErrors?: boolean;
}
