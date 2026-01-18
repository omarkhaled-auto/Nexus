/**
 * TestRunner - Vitest test runner
 *
 * Actually executes Vitest tests and parses the output into
 * structured TestResult format compatible with RalphStyleIterator's
 * QARunner interface.
 *
 * Layer 4: Execution - QA subsystem
 */

import { spawn } from 'child_process';
import type {
  TestResult,
  ErrorEntry,
  ErrorSeverity,
  QARunner,
} from '../iteration/types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for TestRunner
 */
export interface TestRunnerConfig {
  /** Timeout for test process in milliseconds (default: 300000 = 5min) */
  timeout?: number;
  /** Whether to run with coverage (default: false) */
  coverage?: boolean;
  /** Test pattern to filter tests (default: undefined - run all) */
  testPattern?: string;
  /** Whether to run tests in watch mode (default: false) */
  watch?: boolean;
  /** Reporter format (default: 'json') */
  reporter?: 'json' | 'default' | 'verbose';
  /** Additional vitest arguments */
  additionalArgs?: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_TEST_CONFIG: Required<TestRunnerConfig> = {
  timeout: 300000, // 5 minutes
  coverage: false,
  testPattern: '',
  watch: false,
  reporter: 'json',
  additionalArgs: [],
};

/**
 * Individual test failure information
 */
export interface TestFailure {
  /** Name of the failing test */
  testName: string;
  /** File where test is located */
  testFile: string;
  /** Error message */
  error: string;
  /** Expected value (if assertion error) */
  expected?: string;
  /** Actual value (if assertion error) */
  actual?: string;
  /** Stack trace */
  stack?: string;
}

/**
 * Coverage result summary
 */
export interface CoverageResult {
  /** Line coverage percentage */
  lines: number;
  /** Branch coverage percentage */
  branches: number;
  /** Function coverage percentage */
  functions: number;
  /** Statement coverage percentage */
  statements: number;
}

// ============================================================================
// TestRunner Class
// ============================================================================

/**
 * TestRunner executes Vitest tests.
 *
 * It spawns the vitest process, captures the output, parses JSON output
 * (with fallback to regex parsing), and returns results compatible with
 * RalphStyleIterator's QARunner interface.
 *
 * @example
 * ```typescript
 * const runner = new TestRunner({ timeout: 120000, coverage: true });
 * const result = await runner.run('/path/to/project');
 *
 * if (!result.success) {
 *   console.log('Failed tests:', result.failed);
 *   result.errors.forEach(e => console.log(e.message));
 * }
 * ```
 */
export class TestRunner {
  private config: Required<TestRunnerConfig>;
  private currentIteration: number = 0;

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      ...DEFAULT_TEST_CONFIG,
      ...config,
    };
  }

  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  /**
   * Run all tests
   *
   * Spawns vitest run, captures output, and parses results.
   *
   * @param workingDir - Directory containing the test project
   * @returns TestResult with success status and parsed errors
   */
  async run(workingDir: string): Promise<TestResult> {
    return this.executeVitest(workingDir, []);
  }

  /**
   * Run specific test files
   *
   * @param workingDir - Directory containing the test project
   * @param files - Array of file paths to test
   * @returns TestResult with success status and parsed errors
   */
  async runFiles(workingDir: string, files: string[]): Promise<TestResult> {
    return this.executeVitest(workingDir, files);
  }

  /**
   * Run tests with coverage enabled
   *
   * @param workingDir - Directory containing the test project
   * @returns TestResult with coverage information
   */
  async runWithCoverage(workingDir: string): Promise<TestResult> {
    const originalCoverage = this.config.coverage;
    this.config.coverage = true;
    const result = await this.executeVitest(workingDir, []);
    this.config.coverage = originalCoverage;
    return result;
  }

  /**
   * Run tests matching a pattern
   *
   * @param workingDir - Directory containing the test project
   * @param pattern - Test name pattern to match
   * @returns TestResult for matching tests
   */
  async runByPattern(workingDir: string, pattern: string): Promise<TestResult> {
    const originalPattern = this.config.testPattern;
    this.config.testPattern = pattern;
    const result = await this.executeVitest(workingDir, []);
    this.config.testPattern = originalPattern;
    return result;
  }

  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   *
   * @param workingDir - Directory containing the test project
   * @returns Function that takes taskId and returns Promise<TestResult>
   */
  createCallback(workingDir: string): QARunner['test'] {
    return async (_taskId: string): Promise<TestResult> => {
      return this.run(workingDir);
    };
  }

  /**
   * Execute vitest with specified options
   */
  private async executeVitest(
    workingDir: string,
    files: string[]
  ): Promise<TestResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const args = this.buildVitestArgs(files);

      const proc = spawn('npx', args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const parsed = this.parseOutput(stdout, stderr);
        const duration = Date.now() - startTime;

        resolve({
          success: code === 0 && parsed.failed === 0,
          passed: parsed.passed,
          failed: parsed.failed,
          skipped: parsed.skipped,
          errors: parsed.errors,
          duration,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          passed: 0,
          failed: 1,
          skipped: 0,
          errors: [
            this.createErrorEntry(
              `Failed to spawn Vitest: ${err.message}`,
              'error',
              'SPAWN_ERROR'
            ),
          ],
          duration: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * Build the vitest command arguments
   */
  private buildVitestArgs(files: string[]): string[] {
    const args = ['vitest', 'run'];

    // Add reporter
    if (this.config.reporter === 'json') {
      args.push('--reporter=json');
    } else if (this.config.reporter === 'verbose') {
      args.push('--reporter=verbose');
    }

    // Add coverage if requested
    if (this.config.coverage) {
      args.push('--coverage');
      args.push('--coverage.reporter=json');
    }

    // Add test pattern if specified
    if (this.config.testPattern) {
      args.push('-t', this.config.testPattern);
    }

    // Add specific files if provided
    if (files.length > 0) {
      args.push(...files);
    }

    // Add additional args
    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }

    return args;
  }

  /**
   * Parse vitest output into structured result
   *
   * Attempts JSON parsing first, falls back to regex parsing
   */
  private parseOutput(
    stdout: string,
    stderr: string
  ): {
    passed: number;
    failed: number;
    skipped: number;
    errors: ErrorEntry[];
    coverage?: CoverageResult;
  } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: ErrorEntry[] = [];
    let coverage: CoverageResult | undefined;

    // Try to parse JSON output first
    try {
      const jsonResult = this.parseJsonOutput(stdout);
      if (jsonResult) {
        return jsonResult;
      }
    } catch {
      // Fall through to regex parsing
    }

    // Fallback to regex parsing
    const output = stdout + stderr;

    // Parse test counts from summary line
    // e.g., "Tests: 5 passed, 2 failed, 1 skipped, 8 total"
    const summaryMatch = output.match(
      /Tests?:\s*(?:(\d+)\s*passed)?[,\s]*(?:(\d+)\s*failed)?[,\s]*(?:(\d+)\s*skipped)?/i
    );

    if (summaryMatch) {
      passed = parseInt(summaryMatch[1] || '0', 10);
      failed = parseInt(summaryMatch[2] || '0', 10);
      skipped = parseInt(summaryMatch[3] || '0', 10);
    } else {
      // Alternative patterns
      const passMatch = output.match(/(\d+)\s*pass(?:ed|ing)?/i);
      const failMatch = output.match(/(\d+)\s*fail(?:ed|ing|ure)?/i);
      const skipMatch = output.match(/(\d+)\s*skip(?:ped)?/i);

      if (passMatch) passed = parseInt(passMatch[1], 10);
      if (failMatch) failed = parseInt(failMatch[1], 10);
      if (skipMatch) skipped = parseInt(skipMatch[1], 10);
    }

    // Parse failure details
    const failureErrors = this.parseFailureDetails(output);
    errors.push(...failureErrors);

    // Parse coverage if available
    coverage = this.parseCoverage(output);

    return { passed, failed, skipped, errors, coverage };
  }

  /**
   * Parse JSON reporter output
   */
  private parseJsonOutput(
    stdout: string
  ): {
    passed: number;
    failed: number;
    skipped: number;
    errors: ErrorEntry[];
    coverage?: CoverageResult;
  } | null {
    // Try to extract JSON from output (may be mixed with other text)
    const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const json = JSON.parse(jsonMatch[0]);
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      const errors: ErrorEntry[] = [];
      let coverage: CoverageResult | undefined;

      // Parse test results
      for (const file of json.testResults || []) {
        for (const test of file.assertionResults || []) {
          switch (test.status) {
            case 'passed':
              passed++;
              break;
            case 'failed':
              failed++;
              errors.push(
                this.createErrorEntry(
                  test.failureMessages?.join('\n') ||
                    `Test failed: ${test.fullName || test.title}`,
                  'error',
                  undefined,
                  file.name,
                  undefined,
                  undefined,
                  test.failureMessages?.join('\n')
                )
              );
              break;
            case 'skipped':
            case 'pending':
            case 'todo':
              skipped++;
              break;
          }
        }
      }

      // Parse coverage if available
      if (json.coverageMap || json.coverage) {
        const coverageData = json.coverageMap || json.coverage;
        coverage = {
          lines: coverageData.lines?.pct || coverageData.total?.lines?.pct || 0,
          branches:
            coverageData.branches?.pct || coverageData.total?.branches?.pct || 0,
          functions:
            coverageData.functions?.pct ||
            coverageData.total?.functions?.pct ||
            0,
          statements:
            coverageData.statements?.pct ||
            coverageData.total?.statements?.pct ||
            0,
        };
      }

      return { passed, failed, skipped, errors, coverage };
    } catch {
      return null;
    }
  }

  /**
   * Parse failure details from output
   */
  private parseFailureDetails(output: string): ErrorEntry[] {
    const errors: ErrorEntry[] = [];

    // Pattern for FAIL lines with file path
    // e.g., "FAIL  src/tests/mytest.test.ts"
    const failFileRegex = /FAIL\s+(.+\.(?:test|spec)\.[jt]sx?)/g;
    let fileMatch;

    while ((fileMatch = failFileRegex.exec(output)) !== null) {
      const filePath = fileMatch[1];

      // Look for error details after the FAIL line
      // Pattern: "× test name" or "✕ test name"
      const errorDetailRegex = /[×✕]\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm;
      let errorMatch;

      while ((errorMatch = errorDetailRegex.exec(output)) !== null) {
        const testName = errorMatch[1].trim();

        // Skip if we already have this error
        if (!errors.some((e) => e.message.includes(testName))) {
          errors.push(
            this.createErrorEntry(
              `Test failed: ${testName}`,
              'error',
              undefined,
              filePath
            )
          );
        }
      }
    }

    // Pattern for AssertionError messages
    const assertionRegex =
      /AssertionError:\s*(.+?)(?:\n|$)|expected\s+(.+?)\s+to\s+(?:equal|be|have)\s+(.+?)(?:\n|$)/gi;
    let assertMatch;

    while ((assertMatch = assertionRegex.exec(output)) !== null) {
      const message =
        assertMatch[1] ||
        `Expected ${assertMatch[2]} to equal ${assertMatch[3]}`;
      if (!errors.some((e) => e.message.includes(message))) {
        errors.push(this.createErrorEntry(message, 'error', 'ASSERTION_ERROR'));
      }
    }

    return errors;
  }

  /**
   * Parse coverage information from output
   */
  private parseCoverage(output: string): CoverageResult | undefined {
    // Pattern for coverage summary
    // e.g., "All files  |   80.5 |    75.2 |   90.1 |   80.5"
    const coverageRegex =
      /All\s+files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/i;
    const match = output.match(coverageRegex);

    if (match) {
      return {
        statements: parseFloat(match[1]),
        branches: parseFloat(match[2]),
        functions: parseFloat(match[3]),
        lines: parseFloat(match[4]),
      };
    }

    return undefined;
  }

  /**
   * Create a structured ErrorEntry object
   */
  private createErrorEntry(
    message: string,
    severity: ErrorSeverity,
    code?: string,
    file?: string,
    line?: number,
    column?: number,
    stack?: string
  ): ErrorEntry {
    return {
      type: 'test',
      severity,
      message,
      file,
      line,
      column,
      code,
      suggestion: stack,
      iteration: this.currentIteration,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TestRunner instance with default configuration
 */
export function createTestRunner(config?: TestRunnerConfig): TestRunner {
  return new TestRunner(config);
}

/**
 * Create a QARunner-compatible test callback for RalphStyleIterator
 */
export function createTestCallback(
  workingDir: string,
  config?: TestRunnerConfig
): QARunner['test'] {
  const runner = new TestRunner(config);
  return runner.createCallback(workingDir);
}
