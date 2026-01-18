/**
 * Ralph-Style Iterator Module
 *
 * This module provides persistent iteration capabilities where agents can
 * iterate on tasks, seeing their previous work through git diffs, until
 * tests pass or escalation is needed.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * @module execution/iteration
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // State types
  IterationState,
  IterationPhase,

  // Option types
  IterationOptions,

  // Result types
  IterationResult,
  IterationHistoryEntry,
  IterationStatus,
  IterationContext,

  // Git types
  GitChange,
  GitDiff,

  // Error types
  ErrorType,
  ErrorSeverity,
  ErrorEntry,

  // QA result types
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,

  // Escalation types
  EscalationReason,
  EscalationReport,

  // Interface types
  IRalphStyleIterator,
  IGitDiffContextBuilder,
  IErrorContextAggregator,
  IIterationCommitHandler,
  IEscalationHandler,

  // Configuration types
  RalphStyleIteratorConfig,
  QARunner,
  AgentExecutionResult,
  TaskRegistryEntry,
  PauseOptions,
  ResumeOptions,

  // Re-exported types
  TaskSpec,
  TaskContext,
} from './types';

export { DEFAULT_ITERATION_OPTIONS } from './types';

// ============================================================================
// Class Exports
// ============================================================================

export {
  RalphStyleIterator,
  createRalphStyleIterator,
  createTestRalphStyleIterator,
} from './RalphStyleIterator';

export {
  GitDiffContextBuilder,
  createGitDiffContextBuilder,
  createTestGitDiffContextBuilder,
  createMockGitExecutor,
  type IGitExecutor,
  type DiffFormatOptions,
  DEFAULT_FORMAT_OPTIONS,
} from './GitDiffContextBuilder';

export {
  ErrorContextAggregator,
  createErrorContextAggregator,
  type ErrorAggregatorOptions,
  DEFAULT_ERROR_AGGREGATOR_OPTIONS,
} from './ErrorContextAggregator';

export {
  IterationCommitHandler,
  createIterationCommitHandler,
  createTestIterationCommitHandler,
  createMockCommitExecutor,
  type CommitHandlerOptions,
  DEFAULT_COMMIT_HANDLER_OPTIONS,
} from './IterationCommitHandler';

export {
  EscalationHandler,
  createEscalationHandler,
  createTestEscalationHandler,
  createMockEscalationGitExecutor,
  createMockFileSystem,
  type EscalationHandlerOptions,
  type IFileSystem,
  DEFAULT_ESCALATION_HANDLER_OPTIONS,
} from './EscalationHandler';

// ============================================================================
// Additional imports for factory function
// ============================================================================

import type { IterationContext, AgentExecutionResult, QARunner } from './types';
import type { EscalationHandlerOptions } from './EscalationHandler';
import type { CommitHandlerOptions } from './IterationCommitHandler';
import type { DiffFormatOptions } from './GitDiffContextBuilder';
import type { RalphStyleIterator } from './RalphStyleIterator';
import type { IFreshContextManager } from '../../orchestration/context/types';

// ============================================================================
// Factory Function Configuration Type
// ============================================================================

/**
 * Configuration for creating a full RalphStyleIterator
 */
export interface FullRalphStyleIteratorConfig {
  projectPath: string;
  contextManager: IFreshContextManager;
  agentRunner?: (context: IterationContext) => Promise<AgentExecutionResult>;
  qaRunner?: QARunner;
  escalationOptions?: EscalationHandlerOptions;
  commitOptions?: CommitHandlerOptions;
  diffOptions?: DiffFormatOptions;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a fully configured RalphStyleIterator with all dependencies
 *
 * This is the main factory function for creating a Ralph-style iterator.
 * It sets up all the necessary components:
 * - GitDiffContextBuilder for showing previous work
 * - ErrorContextAggregator for collecting errors
 * - IterationCommitHandler for committing each iteration
 * - EscalationHandler for graceful escalation
 *
 * @param config Configuration for the iterator
 * @returns Fully configured RalphStyleIterator
 *
 * @example
 * ```typescript
 * import { createFullRalphStyleIterator } from './execution/iteration';
 *
 * const iterator = createFullRalphStyleIterator({
 *   projectPath: '/path/to/project',
 *   contextManager: freshContextManager,
 *   agentRunner: async (ctx) => runAgent(ctx),
 *   qaRunner: {
 *     build: async () => runBuild(),
 *     lint: async () => runLint(),
 *     test: async () => runTests(),
 *   },
 * });
 *
 * const result = await iterator.execute(task, { maxIterations: 10 });
 * ```
 */
export function createFullRalphStyleIterator(
  config: FullRalphStyleIteratorConfig
): RalphStyleIterator {
  const {
    projectPath,
    contextManager,
    agentRunner,
    qaRunner,
    escalationOptions,
    commitOptions,
    diffOptions,
  } = config;

  // Create all dependencies
  const diffBuilder = createGitDiffContextBuilder(projectPath, diffOptions);
  const commitHandler = createIterationCommitHandler(projectPath, commitOptions);
  const escalationHandler = createEscalationHandler(projectPath, escalationOptions);
  const errorAggregator = createErrorContextAggregator();

  // Create the iterator with all dependencies
  return createRalphStyleIterator({
    projectPath,
    contextManager,
    diffBuilder,
    errorAggregator,
    commitHandler,
    escalationHandler,
    agentRunner,
    qaRunner,
  });
}
