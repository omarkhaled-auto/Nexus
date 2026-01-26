/**
 * QARunnerFactory - Factory for creating QARunner instances
 *
 * Assembles all QA runners (BuildRunner, LintRunner, TestRunner, ReviewRunner)
 * into a QARunner interface compatible with RalphStyleIterator.
 *
 * Layer 4: Execution - QA subsystem
 */

import type { BuildRunnerConfig } from './BuildRunner';
import { BuildRunner } from './BuildRunner';
import type { LintRunnerConfig } from './LintRunner';
import { LintRunner } from './LintRunner';
import type { TestRunnerConfig } from './TestRunner';
import { TestRunner } from './TestRunner';
import type { ReviewRunnerConfig, ReviewContext } from './ReviewRunner';
import { ReviewRunner } from './ReviewRunner';
import type { QARunner, BuildResult, LintResult, TestResult, ReviewResult } from '../iteration/types';
import type { LLMClient } from '../../llm/types';
import { GitService } from '../../infrastructure/git/GitService';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for creating a QARunner through the factory
 */
export interface QARunnerFactoryConfig {
  /** Working directory for all QA operations */
  workingDir: string;
  /** LLM client for code review (API or CLI - required for review step) */
  geminiClient?: LLMClient;
  /** Git service for review diffs (optional, ReviewRunner creates default) */
  gitService?: GitService;
  /** Context for code reviews */
  reviewContext?: ReviewContext;
  /** Build runner configuration */
  buildConfig?: BuildRunnerConfig;
  /** Lint runner configuration */
  lintConfig?: LintRunnerConfig;
  /** Test runner configuration */
  testConfig?: TestRunnerConfig;
  /** Review runner configuration */
  reviewConfig?: ReviewRunnerConfig;
}

/**
 * Options for creating a minimal QARunner (build + lint only)
 */
export interface QuickQARunnerConfig {
  /** Working directory for QA operations */
  workingDir: string;
  /** Build runner configuration */
  buildConfig?: BuildRunnerConfig;
  /** Lint runner configuration */
  lintConfig?: LintRunnerConfig;
}

// ============================================================================
// QARunnerFactory Class
// ============================================================================

/**
 * Factory for creating QARunner instances.
 *
 * This factory creates fully-configured QARunner objects that are compatible
 * with RalphStyleIterator's QARunner interface. It handles the wiring of
 * all individual runners (build, lint, test, review) into a single cohesive
 * QA pipeline.
 *
 * @example
 * ```typescript
 * // Create a full QARunner with all steps
 * const qaRunner = QARunnerFactory.create({
 *   workingDir: '/path/to/project',
 *   geminiClient: myGeminiClient,
 * });
 *
 * // Use with RalphStyleIterator
 * const iterator = new RalphStyleIterator({ qaRunner });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static factory groups QA runner creation.
export class QARunnerFactory {
  /**
   * Create a complete QARunner with all real implementations
   *
   * This is the primary factory method. It creates a QARunner that:
   * - Runs TypeScript compilation (BuildRunner)
   * - Runs ESLint (LintRunner)
   * - Runs Vitest (TestRunner)
   * - Runs AI code review (ReviewRunner) - requires geminiClient
   *
   * @param config - Factory configuration
   * @returns Complete QARunner instance
   */
  static create(config: QARunnerFactoryConfig): QARunner {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);
    const testRunner = new TestRunner(config.testConfig);

    const qaRunner: QARunner = {
      build: buildRunner.createCallback(config.workingDir),
      lint: lintRunner.createCallback(config.workingDir),
      test: testRunner.createCallback(config.workingDir),
    };

    // Only add review if geminiClient is provided
    if (config.geminiClient) {
      // Create GitService for the working directory if not provided
      const gitService = config.gitService ?? new GitService({ baseDir: config.workingDir });
      const reviewRunner = new ReviewRunner(
        config.geminiClient,
        gitService,
        config.reviewConfig
      );
      qaRunner.review = reviewRunner.createCallback(
        config.workingDir,
        config.reviewContext
      );
    }

    return qaRunner;
  }

  /**
   * Create a QARunner with only build and lint (for quick checks)
   *
   * This is useful for fast feedback loops where you don't need
   * full test or review coverage. Commonly used during development
   * or when you want quick type checking and linting.
   *
   * @param config - Quick QA runner configuration
   * @returns QARunner with only build and lint
   */
  static createQuick(config: QuickQARunnerConfig): QARunner {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);

    return {
      build: buildRunner.createCallback(config.workingDir),
      lint: lintRunner.createCallback(config.workingDir),
    };
  }

  /**
   * Create a QARunner with mocked implementations (for testing)
   *
   * This creates a QARunner where all steps immediately return
   * successful results without actually running any tools.
   * Useful for unit testing code that depends on QARunner.
   *
   * @returns QARunner with mocked implementations
   */
  static createMock(): QARunner {
    return {
      build: (_taskId: string): Promise<BuildResult> => Promise.resolve({
        success: true,
        errors: [],
        warnings: [],
        duration: 0,
      }),
      lint: (_taskId: string): Promise<LintResult> => Promise.resolve({
        success: true,
        errors: [],
        warnings: [],
        fixable: 0,
      }),
      test: (_taskId: string): Promise<TestResult> => Promise.resolve({
        success: true,
        passed: 10,
        failed: 0,
        skipped: 0,
        errors: [],
        duration: 0,
      }),
      review: (_taskId: string): Promise<ReviewResult> => Promise.resolve({
        approved: true,
        comments: [],
        suggestions: [],
        blockers: [],
      }),
    };
  }

  /**
   * Create a QARunner with configurable mock results (for testing)
   *
   * This allows you to specify exactly what results each step
   * should return, enabling testing of various failure scenarios.
   *
   * @param mockResults - The results to return from each step
   * @returns QARunner with configurable mock implementations
   */
  static createConfigurableMock(mockResults: {
    build?: BuildResult;
    lint?: LintResult;
    test?: TestResult;
    review?: ReviewResult;
  }): QARunner {
    const defaultBuild: BuildResult = {
      success: true,
      errors: [],
      warnings: [],
      duration: 0,
    };

    const defaultLint: LintResult = {
      success: true,
      errors: [],
      warnings: [],
      fixable: 0,
    };

    const defaultTest: TestResult = {
      success: true,
      passed: 10,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
    };

    const defaultReview: ReviewResult = {
      approved: true,
      comments: [],
      suggestions: [],
      blockers: [],
    };

    return {
      build: () => Promise.resolve(mockResults.build ?? defaultBuild),
      lint: () => Promise.resolve(mockResults.lint ?? defaultLint),
      test: () => Promise.resolve(mockResults.test ?? defaultTest),
      review: () => Promise.resolve(mockResults.review ?? defaultReview),
    };
  }

  /**
   * Create individual runner instances for custom composition
   *
   * Use this when you need fine-grained control over individual
   * runners or want to use them outside the QARunner interface.
   *
   * @param config - Factory configuration
   * @returns Object containing individual runner instances
   */
  static createRunners(config: QARunnerFactoryConfig): {
    buildRunner: BuildRunner;
    lintRunner: LintRunner;
    testRunner: TestRunner;
    reviewRunner?: ReviewRunner;
  } {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);
    const testRunner = new TestRunner(config.testConfig);

    const result: {
      buildRunner: BuildRunner;
      lintRunner: LintRunner;
      testRunner: TestRunner;
      reviewRunner?: ReviewRunner;
    } = {
      buildRunner,
      lintRunner,
      testRunner,
    };

    if (config.geminiClient) {
      // Create GitService for the working directory if not provided
      const gitService = config.gitService ?? new GitService({ baseDir: config.workingDir });
      result.reviewRunner = new ReviewRunner(
        config.geminiClient,
        gitService,
        config.reviewConfig
      );
    }

    return result;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a complete QARunner (convenience function)
 *
 * @param config - Factory configuration
 * @returns Complete QARunner instance
 */
export function createQARunner(config: QARunnerFactoryConfig): QARunner {
  return QARunnerFactory.create(config);
}

/**
 * Create a quick QARunner (convenience function)
 *
 * @param config - Quick QA runner configuration
 * @returns QARunner with only build and lint
 */
export function createQuickQARunner(config: QuickQARunnerConfig): QARunner {
  return QARunnerFactory.createQuick(config);
}

/**
 * Create a mock QARunner (convenience function)
 *
 * @returns QARunner with mocked implementations
 */
export function createMockQARunner(): QARunner {
  return QARunnerFactory.createMock();
}
