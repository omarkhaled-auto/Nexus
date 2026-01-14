// Quality Types and Interfaces for Nexus
// Phase 03-03: Quality Verification Layer

import type { TokenUsage } from '@/llm';

// ============================================================================
// Verification Types
// ============================================================================

/**
 * Types of verification errors
 */
export type VerificationType = 'build' | 'lint' | 'test' | 'review';

/**
 * Verification error with location and details
 */
export interface VerificationError {
  /** Type of verification that produced this error */
  type: VerificationType;
  /** File path where error occurred */
  file: string;
  /** Line number (1-based) */
  line?: number;
  /** Column number (1-based) */
  column?: number;
  /** Error message */
  message: string;
  /** Error code (e.g., TS2322, no-unused-vars) */
  code?: string;
}

/**
 * Verification warning (less severe than error)
 */
export interface VerificationWarning {
  /** Type of verification that produced this warning */
  type: VerificationType;
  /** File path where warning occurred */
  file: string;
  /** Line number (1-based) */
  line?: number;
  /** Warning message */
  message: string;
}

/**
 * Result from a verification step
 */
export interface VerificationResult {
  /** Whether verification passed */
  success: boolean;
  /** List of errors found */
  errors: VerificationError[];
  /** List of warnings found */
  warnings: VerificationWarning[];
  /** Duration in milliseconds */
  duration: number;
}

// ============================================================================
// Test Types
// ============================================================================

/**
 * Individual test failure details
 */
export interface TestFailure {
  /** Name of the failing test */
  testName: string;
  /** File containing the test */
  file: string;
  /** Error message */
  message: string;
  /** Stack trace (optional) */
  stack?: string;
}

/**
 * Code coverage metrics
 */
export interface CoverageReport {
  /** Line coverage percentage (0-100) */
  lines: number;
  /** Function coverage percentage (0-100) */
  functions: number;
  /** Branch coverage percentage (0-100) */
  branches: number;
  /** Statement coverage percentage (0-100) */
  statements: number;
}

/**
 * Result from running tests
 */
export interface TestResult {
  /** Whether all tests passed */
  success: boolean;
  /** Number of passing tests */
  passed: number;
  /** Number of failing tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
  /** Coverage report (optional) */
  coverage?: CoverageReport;
  /** Details of failing tests */
  failures: TestFailure[];
  /** Duration in milliseconds */
  duration: number;
}

// ============================================================================
// Review Types
// ============================================================================

/**
 * Severity levels for review issues
 */
export type ReviewSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * Individual review issue
 */
export interface ReviewIssue {
  /** Issue severity */
  severity: ReviewSeverity;
  /** File containing the issue */
  file: string;
  /** Line number (optional) */
  line?: number;
  /** Issue description */
  message: string;
  /** Suggested fix (optional) */
  suggestion?: string;
}

/**
 * File change for code review
 */
export interface FileChange {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** Git diff (optional) */
  diff?: string;
}

/**
 * Result from code review
 */
export interface ReviewResult {
  /** Whether code is approved */
  approved: boolean;
  /** Whether there are blocking issues */
  hasBlockingIssues: boolean;
  /** List of issues found */
  issues: ReviewIssue[];
  /** Summary of the review */
  summary: string;
}

// ============================================================================
// QA Loop Types
// ============================================================================

/**
 * QA stages in the loop
 */
export type QAStage = 'build' | 'lint' | 'test' | 'review';

/**
 * Result from a single QA stage
 */
export interface StageResult {
  /** Stage that was executed */
  stage: QAStage;
  /** Whether stage passed */
  passed: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Errors from this stage (if any) */
  errors?: VerificationError[];
}

/**
 * Final result from QA loop execution
 */
export interface QAResult {
  /** Whether all stages passed */
  success: boolean;
  /** Number of iterations performed */
  iterations: number;
  /** Whether loop was escalated to human */
  escalated: boolean;
  /** Results from each stage in final iteration */
  stages: StageResult[];
  /** Final errors if not successful */
  finalErrors?: VerificationError[];
  /** Token usage from AI review/fixes */
  tokenUsage?: TokenUsage;
}

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * QA loop events
 */
export interface QAIterationStartEvent {
  iteration: number;
  stage: QAStage;
}

export interface QAIterationCompleteEvent {
  iteration: number;
  stage: QAStage;
  success: boolean;
  duration: number;
}

export interface QAEscalationEvent {
  taskId: string;
  iterations: number;
  errors: VerificationError[];
}

/**
 * Event emitter interface for QA events
 */
export interface QAEventEmitter {
  emit(event: 'qa:iteration:start', data: QAIterationStartEvent): void;
  emit(event: 'qa:iteration:complete', data: QAIterationCompleteEvent): void;
  emit(event: 'qa:escalation', data: QAEscalationEvent): void;
}
