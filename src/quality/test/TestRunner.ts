// TestRunner - Vitest execution
// Phase 03-03: Quality Verification Layer

import type { ProcessRunner } from '@/infrastructure/process/ProcessRunner';
import { TimeoutError } from '@/infrastructure/process/ProcessRunner';
import type { TestResult, TestFailure, CoverageReport, Logger } from '../types';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Error thrown when test execution fails
 */
export class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when tests exceed timeout
 */
export class TestTimeoutError extends Error {
  public readonly timeout: number;

  constructor(timeout: number) {
    super(`Tests timed out after ${String(timeout)}ms`);
    this.name = 'TestTimeoutError';
    this.timeout = timeout;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for TestRunner constructor
 */
export interface TestRunnerOptions {
  /** ProcessRunner for executing commands */
  processRunner: ProcessRunner;
  /** Path to vitest executable (default: 'npx vitest') */
  vitestPath?: string;
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Optional logger */
  logger?: Logger;
}

/**
 * Vitest JSON output assertion result
 */
interface VitestAssertion {
  title: string;
  fullName: string;
  status: 'passed' | 'failed' | 'pending';
  failureMessages?: string[];
}

/**
 * Vitest JSON output test file result
 */
interface VitestFileResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  assertionResults: VitestAssertion[];
}

/**
 * Vitest JSON output format
 */
interface VitestOutput {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: VitestFileResult[];
  success: boolean;
  coverageMap?: Record<string, unknown>;
}

// ============================================================================
// TestRunner Implementation
// ============================================================================

/**
 * TestRunner - Runs Vitest for test execution.
 *
 * Uses JSON output format for structured result parsing.
 * Supports coverage collection and test filtering.
 */
export class TestRunner {
  private readonly processRunner: ProcessRunner;
  private readonly vitestPath: string;
  private readonly timeout: number;
  private readonly logger?: Logger;

  constructor(options: TestRunnerOptions) {
    this.processRunner = options.processRunner;
    this.vitestPath = options.vitestPath ?? 'npx vitest';
    this.timeout = options.timeout ?? 300000; // 5 minutes default
    this.logger = options.logger;
  }

  /**
   * Run tests in the given directory
   */
  async run(workdir: string, testPattern?: string): Promise<TestResult> {
    return this.runInternal(workdir, testPattern, false);
  }

  /**
   * Run tests with coverage collection
   */
  async runWithCoverage(workdir: string): Promise<TestResult> {
    return this.runInternal(workdir, undefined, true);
  }

  /**
   * Parse Vitest JSON output into TestResult
   */
  parseOutput(output: string): TestResult {
    try {
      const parsed = JSON.parse(output) as VitestOutput;
      return this.extractResults(parsed);
    } catch {
      this.logger?.warn('Failed to parse Vitest output as JSON');
      return {
        success: false,
        passed: 0,
        failed: 0,
        skipped: 0,
        failures: [],
        duration: 0,
      };
    }
  }

  /**
   * Internal method to run tests with options
   */
  private async runInternal(
    workdir: string,
    testPattern?: string,
    coverage = false
  ): Promise<TestResult> {
    const startTime = Date.now();
    this.logger?.info(`Running tests in ${workdir}`);

    const patternArg = testPattern ? ` --testNamePattern "${testPattern}"` : '';
    const coverageArg = coverage ? ' --coverage' : '';
    const command = `${this.vitestPath} run --reporter=json${patternArg}${coverageArg}`;

    try {
      const result = await this.processRunner.run(command, {
        cwd: workdir,
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      const testResult = this.parseOutput(result.stdout);
      testResult.duration = duration;

      this.logger?.info(
        `Tests completed in ${String(duration)}ms: ${String(testResult.passed)} passed, ${String(testResult.failed)} failed`
      );

      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle timeout
      if (error instanceof TimeoutError) {
        throw new TestTimeoutError(this.timeout);
      }

      // Try to parse results from failed run
      const processError = error as {
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };

      const stdout = processError.stdout ?? '';
      const testResult = this.parseOutput(stdout);
      testResult.duration = duration;

      this.logger?.info(
        `Tests failed in ${String(duration)}ms: ${String(testResult.passed)} passed, ${String(testResult.failed)} failed`
      );

      return testResult;
    }
  }

  /**
   * Extract TestResult from parsed Vitest output
   */
  private extractResults(output: VitestOutput): TestResult {
    const failures: TestFailure[] = [];

    // Extract failures from test results
    for (const fileResult of output.testResults) {
      for (const assertion of fileResult.assertionResults) {
        if (assertion.status === 'failed' && assertion.failureMessages?.length) {
          const message = assertion.failureMessages.join('\n');
          failures.push({
            testName: assertion.fullName,
            file: fileResult.name,
            message: this.extractErrorMessage(message),
            stack: this.extractStack(message),
          });
        }
      }
    }

    return {
      success: output.success,
      passed: output.numPassedTests,
      failed: output.numFailedTests,
      skipped: output.numPendingTests,
      failures,
      coverage: this.extractCoverage(output.coverageMap),
      duration: 0, // Will be set by caller
    };
  }

  /**
   * Extract error message from failure message (before stack trace)
   */
  private extractErrorMessage(message: string): string {
    // Split on newline and take the first line as the main error
    const lines = message.split('\n');
    return lines[0] ?? message;
  }

  /**
   * Extract stack trace from failure message
   */
  private extractStack(message: string): string | undefined {
    // Look for lines starting with "at " which indicate stack trace
    const lines = message.split('\n');
    const stackLines = lines.filter((line) =>
      line.trim().startsWith('at ')
    );

    if (stackLines.length > 0) {
      return stackLines.join('\n');
    }

    // Return the full message if it looks like a stack trace
    if (message.includes('\n    at ')) {
      return message;
    }

    return undefined;
  }

  /**
   * Extract coverage report from Vitest output
   */
  private extractCoverage(
    coverageMap?: Record<string, unknown>
  ): CoverageReport | undefined {
    if (!coverageMap) {
      return undefined;
    }

    // Coverage parsing would require more detailed analysis
    // For now, return undefined and let coverage be collected separately
    // This can be enhanced to parse c8/istanbul coverage format
    return undefined;
  }
}
