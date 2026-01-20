// QALoopEngine - Self-healing QA loop
// Phase 03-03: Quality Verification Layer

import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { Task } from '@/execution/agents/types';
import type {
  QAResult,
  StageResult,
  QAStage,
  VerificationResult,
  VerificationError,
  Logger,
  FileChange,
} from '@/quality/types';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Error thrown when QA loop fails
 */
export class QAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QAError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when max iterations reached and escalation needed
 */
export class EscalationError extends Error {
  public readonly iterations: number;

  constructor(iterations: number) {
    super(`QA loop escalated after ${String(iterations)} iterations`);
    this.name = 'EscalationError';
    this.iterations = iterations;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for QALoopEngine constructor
 */
export interface QALoopEngineOptions {
  /** BuildVerifier for TypeScript compilation */
  buildVerifier: BuildVerifier;
  /** LintRunner for ESLint */
  lintRunner: LintRunner;
  /** TestRunner for Vitest */
  testRunner: TestRunner;
  /** CodeReviewer for AI review */
  codeReviewer: CodeReviewer;
  /** Maximum iterations before escalation (default: 50) */
  maxIterations?: number;
  /** Optional logger */
  logger?: Logger;
}

// ============================================================================
// QALoopEngine Implementation
// ============================================================================

/**
 * QALoopEngine - Self-healing QA loop that runs Build -> Lint -> Test -> Review.
 *
 * If any stage fails, the coder agent is called to fix the issues.
 * The loop continues until all stages pass or max iterations is reached.
 * At max iterations, the loop escalates to human review.
 */
export class QALoopEngine {
  private readonly buildVerifier: BuildVerifier;
  private readonly lintRunner: LintRunner;
  private readonly testRunner: TestRunner;
  private readonly codeReviewer: CodeReviewer;
  private readonly maxIterations: number;
  private readonly logger?: Logger;

  constructor(options: QALoopEngineOptions) {
    this.buildVerifier = options.buildVerifier;
    this.lintRunner = options.lintRunner;
    this.testRunner = options.testRunner;
    this.codeReviewer = options.codeReviewer;
    this.maxIterations = options.maxIterations ?? 50;
    this.logger = options.logger;
  }

  /**
   * Get the maximum iterations setting
   */
  getMaxIterations(): number {
    return this.maxIterations;
  }

  /**
   * Run the complete QA loop
   */
  async run(task: Task, coder: CoderRunner): Promise<QAResult> {
    const workdir = task.worktree ?? process.cwd();
    let iterations = 0;
    let lastErrors: VerificationError[] = [];
    let stages: StageResult[] = [];

    this.logger?.info(`Starting QA loop for task: ${task.name}`);

    while (iterations < this.maxIterations) {
      iterations++;
      this.logger?.info(`QA iteration ${String(iterations)}/${String(this.maxIterations)}`);

      stages = [];
      let allPassed = true;

      // Stage 1: Build
      const buildResult = await this.runBuildStage(workdir);
      stages.push(buildResult);

      if (!buildResult.passed) {
        allPassed = false;
        lastErrors = buildResult.errors ?? [];
        this.logger?.info(`Build failed with ${String(lastErrors.length)} errors`);

        if (iterations < this.maxIterations) {
          await this.fixErrors(coder, task, 'build', lastErrors);
          continue;
        }
      }

      // Stage 2: Lint
      const lintResult = await this.runLintStage(workdir);
      stages.push(lintResult);

      if (!lintResult.passed) {
        allPassed = false;
        lastErrors = lintResult.errors ?? [];
        this.logger?.info(`Lint failed with ${String(lastErrors.length)} errors`);

        if (iterations < this.maxIterations) {
          await this.fixErrors(coder, task, 'lint', lastErrors);
          continue;
        }
      }

      // Stage 3: Test
      const testResult = await this.runTestStage(workdir, task.test);
      stages.push(testResult);

      if (!testResult.passed) {
        allPassed = false;
        lastErrors = testResult.errors ?? [];
        this.logger?.info(`Tests failed with ${String(lastErrors.length)} errors`);

        if (iterations < this.maxIterations) {
          await this.fixErrors(coder, task, 'test', lastErrors);
          continue;
        }
      }

      // Stage 4: Review
      const reviewResult = await this.runReviewStage(task);
      stages.push(reviewResult);

      if (!reviewResult.passed) {
        allPassed = false;
        lastErrors = reviewResult.errors ?? [];
        this.logger?.info(`Review failed with ${String(lastErrors.length)} issues`);

        if (iterations < this.maxIterations) {
          await this.fixErrors(coder, task, 'review', lastErrors);
          continue;
        }
      }

      // All stages passed!
      if (allPassed) {
        this.logger?.info(`QA loop completed successfully in ${String(iterations)} iterations`);
        return {
          success: true,
          iterations,
          escalated: false,
          stages,
        };
      }
    }

    // Max iterations reached - escalate
    this.logger?.warn(`QA loop escalated after ${String(this.maxIterations)} iterations`);
    return {
      success: false,
      iterations,
      escalated: true,
      stages,
      finalErrors: lastErrors,
    };
  }

  /**
   * Run a single stage independently
   */
  async runStage(stage: QAStage, workdir: string, testPattern?: string): Promise<VerificationResult> {
    switch (stage) {
      case 'build':
        return this.buildVerifier.verify(workdir);
      case 'lint':
        return this.lintRunner.run(workdir);
      case 'test': {
        const testResult = await this.testRunner.run(workdir, testPattern);
        return {
          success: testResult.success,
          errors: testResult.failures.map((f) => ({
            type: 'test' as const,
            file: f.file,
            message: f.message,
          })),
          warnings: [],
          duration: testResult.duration,
        };
      }
      default:
        throw new QAError(`Unknown stage: ${stage as string}`);
    }
  }

  /**
   * Run the build stage
   */
  private async runBuildStage(workdir: string): Promise<StageResult> {
    const startTime = Date.now();
    const result = await this.buildVerifier.verify(workdir);
    return {
      stage: 'build',
      passed: result.success,
      duration: Date.now() - startTime,
      errors: result.errors,
    };
  }

  /**
   * Run the lint stage
   */
  private async runLintStage(workdir: string): Promise<StageResult> {
    const startTime = Date.now();
    const result = await this.lintRunner.run(workdir);
    return {
      stage: 'lint',
      passed: result.success,
      duration: Date.now() - startTime,
      errors: result.errors,
    };
  }

  /**
   * Run the test stage
   */
  private async runTestStage(workdir: string, testPattern?: string): Promise<StageResult> {
    const startTime = Date.now();
    const result = await this.testRunner.run(workdir, testPattern);

    // Convert test failures to verification errors
    const errors: VerificationError[] = result.failures.map((f) => ({
      type: 'test' as const,
      file: f.file,
      message: `${f.testName}: ${f.message}`,
    }));

    return {
      stage: 'test',
      passed: result.success,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Run the review stage
   */
  private async runReviewStage(task: Task): Promise<StageResult> {
    const startTime = Date.now();

    // Prepare files for review
    const files: FileChange[] = task.files.map((path) => ({
      path,
      content: '', // Content would be read by the reviewer
    }));

    const result = await this.codeReviewer.review(files);

    // Convert review issues to verification errors
    const errors: VerificationError[] = result.issues
      .filter((i) => i.severity === 'critical' || i.severity === 'major')
      .map((i) => ({
        type: 'review' as const,
        file: i.file,
        line: i.line,
        message: i.message,
      }));

    return {
      stage: 'review',
      passed: result.approved && !result.hasBlockingIssues,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Ask coder to fix errors using the fixIssues() method
   */
  private async fixErrors(
    coder: CoderRunner,
    _task: Task,
    stage: QAStage,
    errors: VerificationError[]
  ): Promise<void> {
    this.logger?.info(`Asking coder to fix ${String(errors.length)} ${stage} errors`);

    // Convert verification errors to string descriptions for fixIssues
    const errorMessages = errors.map((error) => {
      const location = error.line
        ? `${error.file}:${String(error.line)}`
        : error.file;
      return `[${stage}] ${location}: ${error.message}`;
    });

    // Use the dedicated fixIssues method
    await coder.fixIssues(errorMessages);
  }

  /**
   * Create a description of errors for the coder to fix
   */
  private createFixDescription(stage: QAStage, errors: VerificationError[]): string {
    const lines = [`Fix the following ${stage} errors:\n`];

    for (const error of errors) {
      const location = error.line
        ? `${error.file}:${String(error.line)}`
        : error.file;
      lines.push(`- ${location}: ${error.message}`);
    }

    return lines.join('\n');
  }
}
