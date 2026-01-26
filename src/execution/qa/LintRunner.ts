/**
 * LintRunner - ESLint runner
 *
 * Actually executes ESLint and parses the output into structured LintResult
 * format compatible with RalphStyleIterator's QARunner interface.
 *
 * Layer 4: Execution - QA subsystem
 */

import { spawn } from 'child_process';
import type {
  LintResult,
  ErrorEntry,
  ErrorSeverity,
  QARunner,
} from '../iteration/types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for LintRunner
 */
export interface LintRunnerConfig {
  /** Timeout for lint process in milliseconds (default: 120000 = 2min) */
  timeout?: number;
  /** Whether to auto-fix issues (default: false) */
  autoFix?: boolean;
  /** File extensions to lint (default: ['.ts', '.tsx']) */
  extensions?: string[];
  /** Additional eslint arguments */
  additionalArgs?: string[];
  /** Max warnings before failing (default: -1 = no limit) */
  maxWarnings?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_LINT_CONFIG: Required<LintRunnerConfig> = {
  timeout: 120000,
  autoFix: false,
  extensions: ['.ts', '.tsx'],
  additionalArgs: [],
  maxWarnings: -1,
};

// ============================================================================
// ESLint JSON Output Types
// ============================================================================

/**
 * ESLint JSON output format for a single file
 */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  output?: string; // Present when --fix modified the file
}

/**
 * ESLint message format
 */
interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

// ============================================================================
// LintRunner Class
// ============================================================================

/**
 * LintRunner executes ESLint checks.
 *
 * It spawns the eslint process with JSON output format,
 * captures the output, parses ESLint results into structured format,
 * and returns results compatible with RalphStyleIterator's QARunner interface.
 *
 * @example
 * ```typescript
 * const runner = new LintRunner({ timeout: 60000 });
 * const result = await runner.run('/path/to/project');
 *
 * if (!result.success) {
 *   console.log('Lint errors:', result.errors);
 * }
 * ```
 */
export class LintRunner {
  private config: Required<LintRunnerConfig>;
  private currentIteration: number = 0;

  constructor(config: LintRunnerConfig = {}) {
    this.config = {
      ...DEFAULT_LINT_CONFIG,
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
   * Run ESLint check
   *
   * Spawns eslint with JSON output format to get structured results.
   * Parses the output to extract errors and warnings in structured format.
   *
   * @param workingDir - Directory containing the project to lint
   * @param fix - Whether to apply fixes (overrides config)
   * @returns LintResult with success status and parsed errors/warnings
   */
  async run(workingDir: string, fix?: boolean): Promise<LintResult> {
    const _startTime = Date.now();
    const shouldFix = fix ?? this.config.autoFix;

    return new Promise((resolve) => {
      const args = this.buildEslintArgs(shouldFix);

      const proc = spawn('npx', args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout,
      });

      let stdout = '';
      let _stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        _stderr += data.toString();
      });

      proc.on('close', (_code) => {
        const parsed = this.parseJsonOutput(stdout);

        // Calculate fixable count
        const fixable = parsed.fixableErrors + parsed.fixableWarnings;

        resolve({
          success: parsed.errors.length === 0,
          errors: parsed.errors,
          warnings: parsed.warnings,
          fixable,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          errors: [
            this.createErrorEntry(
              `Failed to spawn ESLint: ${err.message}`,
              'error',
              'SPAWN_ERROR'
            ),
          ],
          warnings: [],
          fixable: 0,
        });
      });
    });
  }

  /**
   * Run ESLint with auto-fix enabled
   *
   * @param workingDir - Directory containing the project to lint
   * @returns LintResult with success status and parsed errors/warnings
   */
  async runWithFix(workingDir: string): Promise<LintResult> {
    return this.run(workingDir, true);
  }

  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the project to lint
   * @returns Function that takes taskId and optional workingDir, returns Promise<LintResult>
   */
  createCallback(defaultWorkingDir: string): QARunner['lint'] {
    return async (_taskId: string, workingDir?: string): Promise<LintResult> => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir);
    };
  }

  /**
   * Build the eslint command arguments
   */
  private buildEslintArgs(fix: boolean): string[] {
    const args = ['eslint', '.'];

    // Add extension arguments
    for (const ext of this.config.extensions) {
      args.push('--ext', ext);
    }

    // Add fix flag if enabled
    if (fix) {
      args.push('--fix');
    }

    // Add max warnings if configured
    if (this.config.maxWarnings >= 0) {
      args.push('--max-warnings', String(this.config.maxWarnings));
    }

    // Always use JSON format for structured output
    args.push('--format', 'json');

    // Add any additional arguments
    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }

    return args;
  }

  /**
   * Parse ESLint JSON output into structured format
   *
   * ESLint JSON format is an array of file results, each containing
   * messages with severity (1 = warning, 2 = error).
   *
   * @param output - Raw JSON output from eslint
   * @returns Parsed errors, warnings, and fixable counts
   */
  parseJsonOutput(output: string): {
    errors: ErrorEntry[];
    warnings: ErrorEntry[];
    fixableErrors: number;
    fixableWarnings: number;
    fixedCount: number;
  } {
    const errors: ErrorEntry[] = [];
    const warnings: ErrorEntry[] = [];
    let fixableErrors = 0;
    let fixableWarnings = 0;
    let fixedCount = 0;

    try {
      const results = JSON.parse(output || '[]') as ESLintFileResult[];

      for (const file of results) {
        // Count files that were fixed
        if (file.output !== undefined) {
          fixedCount++;
        }

        // Accumulate fixable counts
        fixableErrors += file.fixableErrorCount || 0;
        fixableWarnings += file.fixableWarningCount || 0;

        // Process messages
        for (const msg of file.messages) {
          const entry = this.createErrorEntry(
            msg.message,
            msg.severity === 2 ? 'error' : 'warning',
            msg.ruleId || undefined,
            file.filePath,
            msg.line,
            msg.column,
            msg.fix !== undefined
          );

          if (msg.severity === 2) {
            errors.push(entry);
          } else {
            warnings.push(entry);
          }
        }
      }
    } catch {
      // JSON parse failed - might be stderr or non-JSON output
      // This can happen with fatal errors or configuration issues
      if (output.trim()) {
        errors.push(
          this.createErrorEntry(
            `ESLint output parse error: ${output.substring(0, 200)}`,
            'error',
            'PARSE_ERROR'
          )
        );
      }
    }

    return { errors, warnings, fixableErrors, fixableWarnings, fixedCount };
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
    isFixable?: boolean
  ): ErrorEntry {
    return {
      type: 'lint',
      severity,
      message,
      file,
      line,
      column,
      code,
      suggestion: isFixable ? 'This issue can be auto-fixed with --fix' : undefined,
      iteration: this.currentIteration,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a LintRunner instance with default configuration
 */
export function createLintRunner(config?: LintRunnerConfig): LintRunner {
  return new LintRunner(config);
}

/**
 * Create a QARunner-compatible lint callback for RalphStyleIterator
 */
export function createLintCallback(
  workingDir: string,
  config?: LintRunnerConfig
): QARunner['lint'] {
  const runner = new LintRunner(config);
  return runner.createCallback(workingDir);
}
