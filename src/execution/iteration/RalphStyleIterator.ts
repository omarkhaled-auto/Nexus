/**
 * Ralph-Style Iterator - Persistent iteration loops for agent tasks
 *
 * This module implements the core RalphStyleIterator that enables agents to
 * iterate on tasks, seeing their previous work through git diffs, until
 * tests pass or max iterations is reached.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Philosophy:
 * - Agents can see their previous work through git diffs
 * - Errors are aggregated and deduplicated across iterations
 * - Each iteration gets fresh context plus iteration-specific info
 * - Graceful escalation when max iterations reached
 */

import type {
  IRalphStyleIterator,
  IGitDiffContextBuilder,
  IErrorContextAggregator,
  IIterationCommitHandler,
  IEscalationHandler,
  TaskSpec,
  IterationOptions,
  IterationResult,
  IterationHistoryEntry,
  IterationStatus,
  IterationContext,
  IterationPhase,
  TaskRegistryEntry,
  RalphStyleIteratorConfig,
  AgentExecutionResult,
  QARunner,
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,
  ErrorEntry,
  GitDiff,
} from './types';
import { DEFAULT_ITERATION_OPTIONS } from './types';
import type { IFreshContextManager, TaskContext } from '../../orchestration/context/types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Timeout between iteration status checks (ms)
 */
const STATUS_CHECK_INTERVAL = 1000;

/**
 * Maximum time to wait for pause/resume (ms)
 */
const PAUSE_TIMEOUT = 5000;

// ============================================================================
// RalphStyleIterator Implementation
// ============================================================================

/**
 * RalphStyleIterator - Implements persistent iteration loops for agent tasks
 *
 * This is the main class for Ralph-style iteration. It:
 * 1. Builds iteration context (fresh + git diff + errors)
 * 2. Executes agent with context
 * 3. Commits iteration work
 * 4. Runs QA (build -> lint -> test -> review)
 * 5. If all pass: success
 * 6. If fail: aggregate errors, continue
 * 7. If max iterations: escalate
 *
 * @example
 * ```typescript
 * const iterator = new RalphStyleIterator(config);
 *
 * // Execute iteration loop
 * const result = await iterator.execute(taskSpec, {
 *   maxIterations: 10,
 *   commitEachIteration: true,
 * });
 *
 * if (result.success) {
 *   console.log(`Task completed in ${result.iterations} iterations`);
 * } else if (result.finalState === 'escalated') {
 *   console.log('Task escalated to human');
 * }
 * ```
 */
export class RalphStyleIterator implements IRalphStyleIterator {
  /**
   * Context manager for building fresh context
   */
  private readonly contextManager: IFreshContextManager;

  /**
   * Git diff context builder
   */
  private readonly diffBuilder: IGitDiffContextBuilder;

  /**
   * Error context aggregator
   */
  private readonly errorAggregator: IErrorContextAggregator;

  /**
   * Iteration commit handler
   */
  private readonly commitHandler: IIterationCommitHandler;

  /**
   * Escalation handler
   */
  private readonly escalationHandler: IEscalationHandler;

  /**
   * Agent runner function
   */
  private readonly agentRunner: (context: IterationContext) => Promise<AgentExecutionResult>;

  /**
   * QA runner functions
   */
  private readonly qaRunner: QARunner;

  /**
   * Project root path
   */
  private readonly projectPath: string;

  /**
   * Registry of active task iterations
   */
  private readonly taskRegistry: Map<string, TaskRegistryEntry>;

  /**
   * Create a new RalphStyleIterator
   */
  constructor(config: RalphStyleIteratorConfig) {
    this.projectPath = config.projectPath;
    this.contextManager = config.contextManager as IFreshContextManager;
    this.diffBuilder = config.diffBuilder ?? createDefaultDiffBuilder();
    this.errorAggregator = config.errorAggregator ?? createDefaultErrorAggregator();
    this.commitHandler = config.commitHandler ?? createDefaultCommitHandler();
    this.escalationHandler = config.escalationHandler ?? createDefaultEscalationHandler();
    this.agentRunner = config.agentRunner ?? createDefaultAgentRunner();
    this.qaRunner = config.qaRunner ?? {};
    this.taskRegistry = new Map();
  }

  // ==========================================================================
  // Public Methods - Main Interface
  // ==========================================================================

  /**
   * Execute iteration loop on a task
   *
   * This is the MAIN METHOD. It runs the full iteration loop until:
   * - All QA passes (success)
   * - Max iterations reached (escalation)
   * - Task is aborted
   *
   * @param task Task to execute
   * @param options Iteration options
   * @returns Final iteration result
   */
  async execute(task: TaskSpec, options?: IterationOptions): Promise<IterationResult> {
    // Merge options with defaults
    const opts = this.mergeOptions(options);

    // Get base commit for diff tracking
    const baseCommit = await this.getBaseCommit();

    // Create error aggregator for this task
    const taskErrorAggregator = createDefaultErrorAggregator();

    // Register task in registry
    const entry: TaskRegistryEntry = {
      taskId: task.id,
      state: 'running',
      phase: 'initializing',
      iteration: 0,
      options: opts,
      history: [],
      startedAt: new Date(),
      lastActivity: new Date(),
      baseCommit,
      errorAggregator: taskErrorAggregator,
    };
    this.taskRegistry.set(task.id, entry);

    // Track start time and tokens
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // Main iteration loop
      while (entry.iteration < opts.maxIterations && this.isRunnable(entry)) {
        entry.iteration++;
        entry.lastActivity = new Date();

        // Check for pause (state may have been modified by pause())
        if (this.isPaused(entry)) {
          await this.waitForResume(entry);
          if (entry.state === 'aborted') break;
        }

        // Build iteration context
        const iterationContext = await this.buildIterationContext(
          task,
          entry,
          opts,
          baseCommit
        );

        // Execute agent
        entry.phase = 'coding';
        const agentResult = await this.executeAgent(iterationContext);
        totalTokens += agentResult.tokensUsed;

        // Commit iteration work if enabled
        let commitHash: string | undefined;
        if (opts.commitEachIteration && agentResult.filesChanged.length > 0) {
          entry.phase = 'committing';
          commitHash = await this.commitHandler.commitIteration(
            task.id,
            entry.iteration,
            `Iteration ${entry.iteration}: ${this.summarizeChanges(agentResult.filesChanged)}`
          );
        }

        // Run QA
        const qaResult = await this.runQA(task.id, entry);

        // Create history entry
        const historyEntry = this.createHistoryEntry(
          entry.iteration,
          entry.phase,
          agentResult,
          qaResult,
          taskErrorAggregator.getUniqueErrors().filter(e => e.iteration === entry.iteration),
          commitHash
        );
        entry.history.push(historyEntry);

        // Check if aborted during this iteration
        if (entry.state === 'aborted') {
          return this.createResult(entry, startTime, totalTokens, commitHash);
        }

        // Check if all QA passed
        if (this.checkSuccess(qaResult)) {
          entry.state = 'completed';
          entry.phase = 'finalizing';

          return this.createResult(entry, startTime, totalTokens, commitHash);
        }

        // Aggregate errors for next iteration
        const iterationErrors = this.extractErrors(qaResult, entry.iteration);
        taskErrorAggregator.addErrors(iterationErrors);

        // Check for escalation conditions
        if (this.shouldEscalate(entry, opts, taskErrorAggregator)) {
          return await this.handleEscalation(task, entry, iterationContext, opts, startTime, totalTokens);
        }
      }

      // Max iterations reached
      if (entry.state === 'running') {
        const iterationContext = await this.buildIterationContext(task, entry, opts, baseCommit);
        return await this.handleEscalation(task, entry, iterationContext, opts, startTime, totalTokens);
      }

      // Task was aborted
      entry.state = 'aborted';
      return this.createResult(entry, startTime, totalTokens);

    } catch (error) {
      // Handle unexpected errors
      entry.state = 'failed';
      entry.phase = 'finalizing';

      const errorMessage = error instanceof Error ? error.message : String(error);
      taskErrorAggregator.addErrors([{
        type: 'runtime',
        severity: 'error',
        message: `Unexpected error: ${errorMessage}`,
        iteration: entry.iteration,
      }]);

      return this.createResult(entry, startTime, totalTokens);

    } finally {
      // Cleanup but keep in registry for status checks
      entry.lastActivity = new Date();
    }
  }

  /**
   * Pause an executing iteration
   *
   * @param taskId Task ID to pause
   */
  async pause(taskId: string): Promise<void> {
    const entry = this.taskRegistry.get(taskId);
    if (!entry) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (entry.state !== 'running') {
      throw new Error(`Cannot pause task in state: ${entry.state}`);
    }

    entry.state = 'paused';
    entry.lastActivity = new Date();
  }

  /**
   * Resume a paused iteration
   *
   * @param taskId Task ID to resume
   */
  async resume(taskId: string): Promise<void> {
    const entry = this.taskRegistry.get(taskId);
    if (!entry) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (entry.state !== 'paused') {
      throw new Error(`Cannot resume task in state: ${entry.state}`);
    }

    entry.state = 'running';
    entry.lastActivity = new Date();
  }

  /**
   * Abort an iteration
   *
   * @param taskId Task ID to abort
   */
  async abort(taskId: string): Promise<void> {
    const entry = this.taskRegistry.get(taskId);
    if (!entry) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (entry.state === 'completed' || entry.state === 'failed' || entry.state === 'escalated') {
      throw new Error(`Cannot abort task in state: ${entry.state}`);
    }

    entry.state = 'aborted';
    entry.lastActivity = new Date();
  }

  /**
   * Get current status of an iteration
   *
   * @param taskId Task ID to check
   * @returns Current status or null if not found
   */
  getStatus(taskId: string): IterationStatus | null {
    const entry = this.taskRegistry.get(taskId);
    if (!entry) return null;

    return {
      taskId: entry.taskId,
      currentIteration: entry.iteration,
      maxIterations: entry.options.maxIterations,
      state: entry.state,
      phase: entry.phase,
      lastActivity: entry.lastActivity,
      startedAt: entry.startedAt,
      elapsedTime: Date.now() - entry.startedAt.getTime(),
    };
  }

  /**
   * Get history of an iteration
   *
   * @param taskId Task ID to get history for
   * @returns History entries
   */
  getHistory(taskId: string): IterationHistoryEntry[] {
    const entry = this.taskRegistry.get(taskId);
    if (!entry) return [];
    return [...entry.history];
  }

  // ==========================================================================
  // Private Methods - Context Building
  // ==========================================================================

  /**
   * Build iteration context for the agent
   */
  private async buildIterationContext(
    task: TaskSpec,
    entry: TaskRegistryEntry,
    options: Required<IterationOptions>,
    baseCommit: string
  ): Promise<IterationContext> {
    // Get fresh task context
    const taskContext = await this.contextManager.buildFreshContext(task);

    // Build git diff context if not first iteration and enabled
    let previousDiff: GitDiff | undefined;
    let cumulativeDiff: GitDiff | undefined;

    if (entry.iteration > 1 && options.includeGitDiff) {
      const previousCommit = this.commitHandler.getIterationCommit(
        task.id,
        entry.iteration - 1
      );
      if (previousCommit) {
        previousDiff = await this.diffBuilder.buildDiffContext(previousCommit);
      }
      cumulativeDiff = await this.diffBuilder.buildCumulativeDiff(baseCommit);
    }

    // Get previous errors if enabled
    const previousErrors = options.includePreviousErrors
      ? entry.errorAggregator.getUniqueErrors()
      : [];

    // Get last results
    const lastEntry = entry.history[entry.history.length - 1];

    return {
      task,
      iteration: entry.iteration,
      options,
      previousDiff,
      cumulativeDiff,
      previousErrors,
      lastBuildResult: lastEntry?.buildResult,
      lastLintResult: lastEntry?.lintResult,
      lastTestResult: lastEntry?.testResult,
      lastReviewFeedback: lastEntry?.reviewResult?.comments,
      taskContext,
    };
  }

  // ==========================================================================
  // Private Methods - Agent Execution
  // ==========================================================================

  /**
   * Execute the agent with the iteration context
   */
  private async executeAgent(context: IterationContext): Promise<AgentExecutionResult> {
    try {
      return await this.agentRunner(context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filesChanged: [],
        output: '',
        tokensUsed: 0,
        error: errorMessage,
      };
    }
  }

  // ==========================================================================
  // Private Methods - QA Execution
  // ==========================================================================

  /**
   * Run all QA steps
   */
  private async runQA(
    taskId: string,
    entry: TaskRegistryEntry
  ): Promise<{
    build?: BuildResult;
    lint?: LintResult;
    test?: TestResult;
    review?: ReviewResult;
  }> {
    const results: {
      build?: BuildResult;
      lint?: LintResult;
      test?: TestResult;
      review?: ReviewResult;
    } = {};

    // Run build
    if (this.qaRunner.build) {
      entry.phase = 'building';
      results.build = await this.qaRunner.build(taskId);
      if (!results.build.success) {
        return results; // Stop on build failure
      }
    }

    // Run lint
    if (this.qaRunner.lint) {
      entry.phase = 'linting';
      results.lint = await this.qaRunner.lint(taskId);
      // Continue even if lint has errors (non-blocking for iteration)
    }

    // Run tests
    if (this.qaRunner.test) {
      entry.phase = 'testing';
      results.test = await this.qaRunner.test(taskId);
      if (!results.test.success) {
        return results; // Stop on test failure
      }
    }

    // Run review (only if tests pass)
    if (this.qaRunner.review && results.test?.success !== false) {
      entry.phase = 'reviewing';
      results.review = await this.qaRunner.review(taskId);
    }

    return results;
  }

  /**
   * Check if all QA passed
   */
  private checkSuccess(qaResult: {
    build?: BuildResult;
    lint?: LintResult;
    test?: TestResult;
    review?: ReviewResult;
  }): boolean {
    // Build must pass if present
    if (qaResult.build && !qaResult.build.success) return false;

    // Lint errors are blocking (warnings are not)
    if (qaResult.lint && qaResult.lint.errors.length > 0) return false;

    // Tests must pass if present
    if (qaResult.test && !qaResult.test.success) return false;

    // Review must approve if present
    if (qaResult.review && !qaResult.review.approved) return false;

    return true;
  }

  /**
   * Extract errors from QA results
   */
  private extractErrors(
    qaResult: {
      build?: BuildResult;
      lint?: LintResult;
      test?: TestResult;
      review?: ReviewResult;
    },
    iteration: number
  ): ErrorEntry[] {
    const errors: ErrorEntry[] = [];

    if (qaResult.build) {
      errors.push(...qaResult.build.errors.map(e => ({ ...e, iteration })));
      errors.push(...qaResult.build.warnings.map(e => ({ ...e, iteration })));
    }

    if (qaResult.lint) {
      errors.push(...qaResult.lint.errors.map(e => ({ ...e, iteration })));
      errors.push(...qaResult.lint.warnings.map(e => ({ ...e, iteration })));
    }

    if (qaResult.test) {
      errors.push(...qaResult.test.errors.map(e => ({ ...e, iteration })));
    }

    if (qaResult.review) {
      // Convert review blockers to errors
      for (const blocker of qaResult.review.blockers) {
        errors.push({
          type: 'review',
          severity: 'error',
          message: blocker,
          iteration,
        });
      }
    }

    return errors;
  }

  // ==========================================================================
  // Private Methods - Escalation
  // ==========================================================================

  /**
   * Check if task should be escalated
   */
  private shouldEscalate(
    entry: TaskRegistryEntry,
    options: Required<IterationOptions>,
    errorAggregator: IErrorContextAggregator
  ): boolean {
    // Check iteration count
    if (entry.iteration >= options.escalateAfter) {
      return true;
    }

    // Check timeout
    const elapsedMinutes = (Date.now() - entry.startedAt.getTime()) / 1000 / 60;
    if (elapsedMinutes >= options.timeoutMinutes) {
      return true;
    }

    // Check for repeated failures (same error 3+ times)
    const errors = errorAggregator.getUniqueErrors();
    const errorCounts = new Map<string, number>();
    for (const error of errors) {
      const key = `${error.type}:${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    }
    const counts = Array.from(errorCounts.values());
    for (const count of counts) {
      if (count >= 3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle escalation to human
   */
  private async handleEscalation(
    task: TaskSpec,
    entry: TaskRegistryEntry,
    context: IterationContext,
    options: Required<IterationOptions>,
    startTime: number,
    totalTokens: number
  ): Promise<IterationResult> {
    entry.state = 'escalated';
    entry.phase = 'finalizing';

    // Determine escalation reason
    let reason: 'max_iterations' | 'timeout' | 'repeated_failures' = 'max_iterations';
    const elapsedMinutes = (Date.now() - entry.startedAt.getTime()) / 1000 / 60;
    if (elapsedMinutes >= options.timeoutMinutes) {
      reason = 'timeout';
    }

    // Check for repeated failures
    const errors = entry.errorAggregator.getUniqueErrors();
    const errorCounts = new Map<string, number>();
    for (const error of errors) {
      const key = `${error.type}:${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    }
    const errorCountValues = Array.from(errorCounts.values());
    for (const count of errorCountValues) {
      if (count >= 3) {
        reason = 'repeated_failures';
        break;
      }
    }

    // Create escalation report
    const escalationReport = await this.escalationHandler.escalate(
      task.id,
      reason,
      context
    );

    // Notify human
    await this.escalationHandler.notifyHuman(escalationReport);

    return {
      success: false,
      taskId: task.id,
      iterations: entry.iteration,
      finalState: 'escalated',
      history: [...entry.history],
      totalDuration: Date.now() - startTime,
      totalTokens,
      escalationReport,
    };
  }

  // ==========================================================================
  // Private Methods - Helpers
  // ==========================================================================

  /**
   * Merge options with defaults
   */
  private mergeOptions(options?: IterationOptions): Required<IterationOptions> {
    return {
      ...DEFAULT_ITERATION_OPTIONS,
      ...options,
    };
  }

  /**
   * Check if task entry is in a runnable state
   * This helper exists to allow state to be checked without TypeScript
   * narrowing issues (since state can change asynchronously)
   */
  private isRunnable(entry: TaskRegistryEntry): boolean {
    return entry.state === 'running' || entry.state === 'paused';
  }

  /**
   * Check if task entry is paused
   * This helper exists to allow state to be checked without TypeScript
   * narrowing issues (since state can change asynchronously)
   */
  private isPaused(entry: TaskRegistryEntry): boolean {
    return entry.state === 'paused';
  }

  /**
   * Get base commit for diff tracking
   */
  private async getBaseCommit(): Promise<string> {
    // For now, return HEAD as base
    // In full implementation, this would get actual current commit
    return 'HEAD';
  }

  /**
   * Wait for resume when paused
   */
  private async waitForResume(entry: TaskRegistryEntry): Promise<void> {
    const startWait = Date.now();
    while (entry.state === 'paused') {
      await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_INTERVAL));
      if (Date.now() - startWait > PAUSE_TIMEOUT) {
        break;
      }
    }
  }

  /**
   * Summarize file changes for commit message
   */
  private summarizeChanges(filesChanged: string[]): string {
    if (filesChanged.length === 0) return 'No changes';
    if (filesChanged.length === 1) return `Modified ${filesChanged[0]}`;
    return `Modified ${filesChanged.length} files`;
  }

  /**
   * Create history entry from iteration results
   */
  private createHistoryEntry(
    iteration: number,
    phase: IterationPhase,
    agentResult: AgentExecutionResult,
    qaResult: {
      build?: BuildResult;
      lint?: LintResult;
      test?: TestResult;
      review?: ReviewResult;
    },
    errors: ErrorEntry[],
    commitHash?: string
  ): IterationHistoryEntry {
    return {
      iteration,
      phase,
      action: agentResult.output || 'Agent execution',
      changes: agentResult.filesChanged.map(file => ({
        file,
        changeType: 'modified' as const,
        additions: 0,
        deletions: 0,
      })),
      buildResult: qaResult.build,
      lintResult: qaResult.lint,
      testResult: qaResult.test,
      reviewResult: qaResult.review,
      errors,
      duration: 0, // Would be tracked in real implementation
      tokens: agentResult.tokensUsed,
      timestamp: new Date(),
      commitHash,
    };
  }

  /**
   * Create final iteration result
   */
  private createResult(
    entry: TaskRegistryEntry,
    startTime: number,
    totalTokens: number,
    finalCommit?: string
  ): IterationResult {
    return {
      success: entry.state === 'completed',
      taskId: entry.taskId,
      iterations: entry.iteration,
      finalState: entry.state,
      history: [...entry.history],
      totalDuration: Date.now() - startTime,
      totalTokens,
      finalCommit,
    };
  }
}

// ============================================================================
// Default Implementation Helpers
// ============================================================================

/**
 * Create a default git diff context builder (stub for testing)
 */
function createDefaultDiffBuilder(): IGitDiffContextBuilder {
  return {
    async buildDiffContext(fromCommit: string, toCommit?: string): Promise<GitDiff> {
      return {
        fromCommit,
        toCommit: toCommit || 'HEAD',
        changes: [],
        diffText: '',
        stats: { filesChanged: 0, additions: 0, deletions: 0 },
      };
    },
    async buildCumulativeDiff(baseCommit: string): Promise<GitDiff> {
      return {
        fromCommit: baseCommit,
        toCommit: 'HEAD',
        changes: [],
        diffText: '',
        stats: { filesChanged: 0, additions: 0, deletions: 0 },
      };
    },
    formatDiffForAgent(diff: GitDiff): string {
      return diff.diffText || 'No changes';
    },
  };
}

/**
 * Create a default error context aggregator
 */
function createDefaultErrorAggregator(): IErrorContextAggregator {
  const errors: ErrorEntry[] = [];

  return {
    addErrors(newErrors: ErrorEntry[]): void {
      errors.push(...newErrors);
    },
    getUniqueErrors(): ErrorEntry[] {
      const seen = new Set<string>();
      return errors.filter(e => {
        const key = `${e.type}:${e.file}:${e.line}:${e.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    getErrorsByType(type: ErrorEntry['type']): ErrorEntry[] {
      return errors.filter(e => e.type === type);
    },
    formatErrorsForAgent(): string {
      if (errors.length === 0) return 'No errors';
      return errors.map(e =>
        `[${e.type.toUpperCase()}] ${e.file ? `${e.file}:${e.line}` : ''} ${e.message}`
      ).join('\n');
    },
    clear(): void {
      errors.length = 0;
    },
  };
}

/**
 * Create a default iteration commit handler (stub for testing)
 */
function createDefaultCommitHandler(): IIterationCommitHandler {
  const commits = new Map<string, Map<number, string>>();

  return {
    async commitIteration(taskId: string, iteration: number, message: string): Promise<string> {
      const hash = `commit-${taskId}-${iteration}`;
      if (!commits.has(taskId)) {
        commits.set(taskId, new Map());
      }
      commits.get(taskId)!.set(iteration, hash);
      return hash;
    },
    async rollbackToIteration(taskId: string, iteration: number): Promise<void> {
      // No-op for default implementation
    },
    getIterationCommit(taskId: string, iteration: number): string | null {
      return commits.get(taskId)?.get(iteration) || null;
    },
  };
}

/**
 * Create a default escalation handler (stub for testing)
 */
function createDefaultEscalationHandler(): IEscalationHandler {
  return {
    async escalate(taskId, reason, context) {
      const checkpoint = await this.createCheckpoint(taskId);
      return {
        taskId,
        reason,
        iterationsCompleted: context.iteration,
        summary: `Task escalated after ${context.iteration} iterations due to ${reason}`,
        lastErrors: context.previousErrors.slice(-5),
        suggestedActions: ['Review the last errors', 'Check for architectural issues'],
        checkpointCommit: checkpoint,
        createdAt: new Date(),
      };
    },
    async createCheckpoint(taskId: string): Promise<string> {
      return `checkpoint-${taskId}-${Date.now()}`;
    },
    async notifyHuman(report): Promise<void> {
      // No-op for default implementation
      console.log(`[Escalation] Task ${report.taskId} escalated: ${report.reason}`);
    },
  };
}

/**
 * Create a default agent runner (stub for testing)
 */
function createDefaultAgentRunner(): (context: IterationContext) => Promise<AgentExecutionResult> {
  return async () => ({
    success: true,
    filesChanged: [],
    output: 'Default agent execution',
    tokensUsed: 100,
  });
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a RalphStyleIterator with configuration
 *
 * @param config Configuration for the iterator
 * @returns Configured RalphStyleIterator
 */
export function createRalphStyleIterator(
  config: RalphStyleIteratorConfig
): RalphStyleIterator {
  return new RalphStyleIterator(config);
}

/**
 * Options for creating a test RalphStyleIterator
 */
export interface TestRalphStyleIteratorOptions {
  projectPath?: string;
  contextManager?: IFreshContextManager;
  diffBuilder?: IGitDiffContextBuilder;
  errorAggregator?: IErrorContextAggregator;
  commitHandler?: IIterationCommitHandler;
  escalationHandler?: IEscalationHandler;
  agentRunner?: (context: IterationContext) => Promise<AgentExecutionResult>;
  qaRunner?: QARunner;
}

/**
 * Create a RalphStyleIterator for testing with mock dependencies
 *
 * @param options Optional test configuration
 * @returns Configured RalphStyleIterator with mock dependencies
 */
export function createTestRalphStyleIterator(
  options: TestRalphStyleIteratorOptions = {}
): RalphStyleIterator {
  // Create mock context manager
  const mockContextManager: IFreshContextManager = options.contextManager ?? {
    buildFreshContext: async (task) => ({
      repoMap: 'mock repo map',
      codebaseDocs: {
        architectureSummary: 'mock summary',
        relevantPatterns: [],
        relevantAPIs: [],
        tokenCount: 100,
      },
      projectConfig: {
        name: 'test-project',
        path: '/test/path',
        language: 'typescript',
      },
      taskSpec: task,
      relevantFiles: [],
      relevantCode: [],
      relevantMemories: [],
      conversationHistory: [] as never[],
      tokenCount: 1000,
      tokenBudget: 150000,
      generatedAt: new Date(),
      contextId: 'mock-context-id',
    }),
    clearAgentContext: () => {},
    clearTaskContext: () => {},
    validateContext: () => ({
      valid: true,
      tokenCount: 1000,
      maxTokens: 150000,
      breakdown: {
        systemPrompt: 0,
        repoMap: 100,
        codebaseDocs: 100,
        taskSpec: 100,
        files: 0,
        codeResults: 0,
        memories: 0,
        reserved: 0,
        total: 300,
      },
      warnings: [],
      suggestions: [],
    }),
    estimateTokenCount: (text) => Math.ceil(text.length / 4),
    getActiveContexts: () => new Map(),
    getContextStats: () => ({
      activeContexts: 0,
      totalCreated: 0,
      totalCleared: 0,
      averageTokens: 0,
      peakTokens: 0,
    }),
  };

  return new RalphStyleIterator({
    projectPath: options.projectPath ?? '/test/path',
    contextManager: mockContextManager,
    diffBuilder: options.diffBuilder,
    errorAggregator: options.errorAggregator,
    commitHandler: options.commitHandler,
    escalationHandler: options.escalationHandler,
    agentRunner: options.agentRunner,
    qaRunner: options.qaRunner,
  });
}
