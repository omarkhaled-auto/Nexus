/**
 * QA Module Barrel Export
 *
 * Exports all QA runner components for use in the iteration system.
 * These runners plug into RalphStyleIterator's QARunner interface.
 *
 * Layer 4: Execution - QA subsystem
 */

// Build runner
export { BuildRunner } from './BuildRunner';
export type { BuildRunnerConfig } from './BuildRunner';
export { DEFAULT_BUILD_CONFIG } from './BuildRunner';

// Lint runner
export { LintRunner } from './LintRunner';
export type { LintRunnerConfig } from './LintRunner';
export { DEFAULT_LINT_CONFIG } from './LintRunner';

// Test runner
export { TestRunner } from './TestRunner';
export type { TestRunnerConfig } from './TestRunner';
export { DEFAULT_TEST_CONFIG } from './TestRunner';

// Review runner
export { ReviewRunner } from './ReviewRunner';
export type { ReviewRunnerConfig, ReviewContext } from './ReviewRunner';
export { DEFAULT_REVIEW_CONFIG } from './ReviewRunner';

// Factory
export {
  QARunnerFactory,
  createQARunner,
  createQuickQARunner,
  createMockQARunner,
} from './QARunnerFactory';
export type {
  QARunnerFactoryConfig,
  QuickQARunnerConfig,
} from './QARunnerFactory';

// QA Loop Engine (adapter for NexusCoordinator)
export { QALoopEngine, createQALoopEngine } from './QALoopEngine';
export type {
  QALoopTask,
  QALoopResult,
  QALoopEngineConfig,
} from './QALoopEngine';

// Re-export types from iteration/types for convenience
export type {
  QARunner,
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,
} from '../iteration/types';
