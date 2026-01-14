// LintRunner - ESLint execution
// Phase 03-03: Quality Verification Layer

import type { ProcessRunner } from '@/infrastructure/process/ProcessRunner';
import type {
  VerificationResult,
  VerificationError,
  VerificationWarning,
  Logger,
} from '../types';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Error thrown when linting fails
 */
export class LintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LintError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when ESLint config is invalid or missing
 */
export class LintConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LintConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for LintRunner constructor
 */
export interface LintRunnerOptions {
  /** ProcessRunner for executing commands */
  processRunner: ProcessRunner;
  /** Path to eslint executable (default: 'npx eslint') */
  eslintPath?: string;
  /** Optional logger */
  logger?: Logger;
}

/**
 * ESLint JSON output message format
 */
interface ESLintMessage {
  ruleId: string | null;
  severity: number; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
}

/**
 * ESLint JSON output file result format
 */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

// ============================================================================
// LintRunner Implementation
// ============================================================================

/**
 * LintRunner - Runs ESLint for code quality checks.
 *
 * Uses JSON output format for structured error parsing.
 * Supports auto-fix mode for automatic corrections.
 */
export class LintRunner {
  private readonly processRunner: ProcessRunner;
  private readonly eslintPath: string;
  private readonly logger?: Logger;

  constructor(options: LintRunnerOptions) {
    this.processRunner = options.processRunner;
    this.eslintPath = options.eslintPath ?? 'npx eslint';
    this.logger = options.logger;
  }

  /**
   * Run ESLint on the given directory or files
   */
  async run(workdir: string, files?: string[]): Promise<VerificationResult> {
    return this.runInternal(workdir, files, false);
  }

  /**
   * Run ESLint with auto-fix enabled
   */
  async runWithFix(workdir: string, files?: string[]): Promise<VerificationResult> {
    return this.runInternal(workdir, files, true);
  }

  /**
   * Parse ESLint JSON output into verification errors
   */
  parseOutput(output: string): VerificationError[] {
    try {
      const results = JSON.parse(output) as ESLintFileResult[];
      return this.extractErrors(results);
    } catch {
      this.logger?.warn('Failed to parse ESLint output as JSON');
      return [];
    }
  }

  /**
   * Internal method to run ESLint with or without fix
   */
  private async runInternal(
    workdir: string,
    files?: string[],
    fix = false
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    this.logger?.info(
      `Running ESLint ${fix ? 'with fix ' : ''}in ${workdir}`
    );

    const fileArgs = files?.length ? files.join(' ') : '.';
    const fixFlag = fix ? '--fix ' : '';
    const command = `${this.eslintPath} ${fixFlag}--format json ${fileArgs}`;

    try {
      const result = await this.processRunner.run(command, { cwd: workdir });
      const duration = Date.now() - startTime;

      // Parse output even on success (may have warnings)
      const { errors, warnings } = this.parseResults(result.stdout);

      this.logger?.info(
        `ESLint completed in ${String(duration)}ms: ${String(errors.length)} errors, ${String(warnings.length)} warnings`
      );

      return {
        success: errors.length === 0,
        errors,
        warnings,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const processError = error as {
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };

      // Check for config errors
      const stderr = processError.stderr ?? '';
      if (this.isConfigError(stderr)) {
        throw new LintConfigError(this.extractConfigError(stderr));
      }

      // Parse errors from output
      const stdout = processError.stdout ?? '';
      const { errors, warnings } = this.parseResults(stdout);

      this.logger?.info(
        `ESLint failed in ${String(duration)}ms: ${String(errors.length)} errors, ${String(warnings.length)} warnings`
      );

      return {
        success: false,
        errors,
        warnings,
        duration,
      };
    }
  }

  /**
   * Parse ESLint results into errors and warnings
   */
  private parseResults(output: string): {
    errors: VerificationError[];
    warnings: VerificationWarning[];
  } {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    try {
      const results = JSON.parse(output) as ESLintFileResult[];

      for (const fileResult of results) {
        for (const msg of fileResult.messages) {
          if (msg.severity === 2) {
            // Error
            errors.push({
              type: 'lint',
              file: fileResult.filePath,
              line: msg.line,
              column: msg.column,
              message: msg.message,
              code: msg.ruleId ?? undefined,
            });
          } else if (msg.severity === 1) {
            // Warning
            warnings.push({
              type: 'lint',
              file: fileResult.filePath,
              line: msg.line,
              message: msg.message,
            });
          }
        }
      }
    } catch {
      this.logger?.warn('Failed to parse ESLint JSON output');
    }

    return { errors, warnings };
  }

  /**
   * Extract only errors from ESLint results
   */
  private extractErrors(results: ESLintFileResult[]): VerificationError[] {
    const errors: VerificationError[] = [];

    for (const fileResult of results) {
      for (const msg of fileResult.messages) {
        if (msg.severity === 2) {
          errors.push({
            type: 'lint',
            file: fileResult.filePath,
            line: msg.line,
            column: msg.column,
            message: msg.message,
            code: msg.ruleId ?? undefined,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check if stderr indicates a config error
   */
  private isConfigError(stderr: string): boolean {
    const configPatterns = [
      /no eslint configuration/i,
      /configuration.*not found/i,
      /unable to parse/i,
      /invalid configuration/i,
    ];

    return configPatterns.some((pattern) => pattern.test(stderr));
  }

  /**
   * Extract config error message
   */
  private extractConfigError(stderr: string): string {
    // Try to extract the most relevant error message
    const match = stderr.match(/Error:\s*(.+)/i);
    if (match?.[1]) {
      return match[1];
    }
    return 'ESLint configuration error';
  }
}
