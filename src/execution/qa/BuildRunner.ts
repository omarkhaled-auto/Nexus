/**
 * BuildRunner - TypeScript compilation runner
 *
 * Actually executes TypeScript compilation (tsc --noEmit) and parses
 * the output into structured BuildResult format compatible with
 * RalphStyleIterator's QARunner interface.
 *
 * Layer 4: Execution - QA subsystem
 */

import { spawn } from 'child_process';
import type {
  BuildResult,
  ErrorEntry,
  ErrorSeverity,
  QARunner,
} from '../iteration/types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for BuildRunner
 */
export interface BuildRunnerConfig {
  /** Timeout for build process in milliseconds (default: 60000 = 60s) */
  timeout?: number;
  /** Path to tsconfig.json relative to working directory (default: 'tsconfig.json') */
  tsconfigPath?: string;
  /** Whether to use project references (default: false) */
  useProjectReferences?: boolean;
  /** Additional tsc arguments */
  additionalArgs?: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_BUILD_CONFIG: Required<BuildRunnerConfig> = {
  timeout: 60000,
  tsconfigPath: 'tsconfig.json',
  useProjectReferences: false,
  additionalArgs: [],
};

// ============================================================================
// BuildRunner Class
// ============================================================================

/**
 * BuildRunner executes TypeScript compilation checks.
 *
 * It spawns the tsc process with --noEmit flag (type checking only),
 * captures the output, parses TypeScript errors into structured format,
 * and returns results compatible with RalphStyleIterator's QARunner interface.
 *
 * @example
 * ```typescript
 * const runner = new BuildRunner({ timeout: 120000 });
 * const result = await runner.run('/path/to/project');
 *
 * if (!result.success) {
 *   console.log('Build errors:', result.errors);
 * }
 * ```
 */
export class BuildRunner {
  private config: Required<BuildRunnerConfig>;
  private currentIteration: number = 0;

  constructor(config: BuildRunnerConfig = {}) {
    this.config = {
      ...DEFAULT_BUILD_CONFIG,
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
   * Run TypeScript compilation check
   *
   * Spawns tsc with --noEmit to perform type checking without emitting files.
   * Parses the output to extract errors and warnings in structured format.
   *
   * @param workingDir - Directory containing the TypeScript project
   * @returns BuildResult with success status and parsed errors/warnings
   */
  async run(workingDir: string): Promise<BuildResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const args = this.buildTscArgs();

      const proc = spawn('npx', args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const output = stdout + stderr;
        const errors = this.parseErrors(output);
        const warnings = this.parseWarnings(output);

        resolve({
          success: code === 0,
          errors,
          warnings,
          duration: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          errors: [
            this.createErrorEntry(
              `Failed to spawn TypeScript compiler: ${err.message}`,
              'error',
              'SPAWN_ERROR'
            ),
          ],
          warnings: [],
          duration: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the TypeScript project
   * @returns Function that takes taskId and optional workingDir, returns Promise<BuildResult>
   */
  createCallback(defaultWorkingDir: string): QARunner['build'] {
    return async (_taskId: string, workingDir?: string): Promise<BuildResult> => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir);
    };
  }

  /**
   * Build the tsc command arguments
   */
  private buildTscArgs(): string[] {
    const args = [
      'tsc',
      '--noEmit',
      '--pretty',
      'false',
      '-p',
      this.config.tsconfigPath,
    ];

    if (this.config.useProjectReferences) {
      args.push('--build');
    }

    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }

    return args;
  }

  /**
   * Parse TypeScript error output into structured ErrorEntry array
   *
   * TypeScript error format:
   * - Pretty=false: src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
   * - Also handles: file(line,col): error TSxxxx: message
   *
   * @param output - Raw output from tsc process
   * @returns Array of parsed ErrorEntry objects
   */
  parseErrors(output: string): ErrorEntry[] {
    const errors: ErrorEntry[] = [];

    // TypeScript error format: file(line,col): error TSxxxx: message
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
      errors.push(
        this.createErrorEntry(
          match[5], // message
          'error',
          match[4], // TS error code
          match[1], // file
          parseInt(match[2], 10), // line
          parseInt(match[3], 10) // column
        )
      );
    }

    return errors;
  }

  /**
   * Parse TypeScript warning output into structured ErrorEntry array
   *
   * TypeScript typically doesn't emit warnings (uses strict mode errors instead),
   * but we check for them in case of custom configurations.
   *
   * @param output - Raw output from tsc process
   * @returns Array of parsed ErrorEntry objects with 'warning' severity
   */
  parseWarnings(output: string): ErrorEntry[] {
    const warnings: ErrorEntry[] = [];

    // TypeScript warning format (less common): file(line,col): warning TSxxxx: message
    const warningRegex = /^(.+?)\((\d+),(\d+)\):\s*warning\s+(TS\d+):\s*(.+)$/gm;

    let match;
    while ((match = warningRegex.exec(output)) !== null) {
      warnings.push(
        this.createErrorEntry(
          match[5],
          'warning',
          match[4],
          match[1],
          parseInt(match[2], 10),
          parseInt(match[3], 10)
        )
      );
    }

    return warnings;
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
    column?: number
  ): ErrorEntry {
    return {
      type: 'build',
      severity,
      message,
      file,
      line,
      column,
      code,
      iteration: this.currentIteration,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a BuildRunner instance with default configuration
 */
export function createBuildRunner(config?: BuildRunnerConfig): BuildRunner {
  return new BuildRunner(config);
}

/**
 * Create a QARunner-compatible build callback for RalphStyleIterator
 */
export function createBuildCallback(
  workingDir: string,
  config?: BuildRunnerConfig
): QARunner['build'] {
  const runner = new BuildRunner(config);
  return runner.createCallback(workingDir);
}
