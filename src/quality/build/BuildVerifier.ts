// BuildVerifier - TypeScript compilation verification
// Phase 03-03: Quality Verification Layer

import type { ProcessRunner } from '@/infrastructure/process/ProcessRunner';
import type { VerificationResult, VerificationError, Logger } from '../types';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Error thrown when build compilation fails
 */
export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when tsconfig.json is invalid or missing
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for BuildVerifier constructor
 */
export interface BuildVerifierOptions {
  /** ProcessRunner for executing commands */
  processRunner: ProcessRunner;
  /** Path to tsc executable (default: 'npx tsc') */
  tscPath?: string;
  /** Optional logger */
  logger?: Logger;
}

// ============================================================================
// BuildVerifier Implementation
// ============================================================================

/**
 * BuildVerifier - Verifies TypeScript compilation.
 *
 * Runs `tsc --noEmit` to check for type errors without producing output.
 * Parses TypeScript compiler output to extract error locations and messages.
 */
export class BuildVerifier {
  private readonly processRunner: ProcessRunner;
  private readonly tscPath: string;
  private readonly logger?: Logger;

  constructor(options: BuildVerifierOptions) {
    this.processRunner = options.processRunner;
    this.tscPath = options.tscPath ?? 'npx tsc';
    this.logger = options.logger;
  }

  /**
   * Verify TypeScript compilation in the given directory
   */
  async verify(workdir: string): Promise<VerificationResult> {
    const startTime = Date.now();
    this.logger?.info(`Running TypeScript verification in ${workdir}`);

    const command = `${this.tscPath} --noEmit`;

    try {
      await this.processRunner.run(command, { cwd: workdir });

      // Success - no compilation errors
      const duration = Date.now() - startTime;
      this.logger?.info(`Build verification passed in ${String(duration)}ms`);

      return {
        success: true,
        errors: [],
        warnings: [],
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const processError = error as {
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };

      const stdout = processError.stdout ?? '';
      const stderr = processError.stderr ?? '';
      const output = stdout + '\n' + stderr;

      // Check for config errors
      if (this.isConfigError(output)) {
        const configMessage = this.extractConfigError(output);
        throw new ConfigError(configMessage);
      }

      // Parse compilation errors
      const errors = this.parseErrors(output);

      this.logger?.info(
        `Build verification failed with ${String(errors.length)} errors in ${String(duration)}ms`
      );

      return {
        success: false,
        errors,
        warnings: [],
        duration,
      };
    }
  }

  /**
   * Parse TypeScript compiler output for errors
   */
  parseErrors(output: string): VerificationError[] {
    const errors: VerificationError[] = [];

    // Standard tsc error format: file(line,column): error TSxxxx: message
    const tscPattern = /^(.+?)\((\d+)(?:,(\d+))?\):\s*error\s+(TS\d+):\s*(.+)$/gm;
    let match;

    while ((match = tscPattern.exec(output)) !== null) {
      const [, file, lineStr, colStr, code, message] = match;
      errors.push({
        type: 'build',
        file: this.normalizePath(file),
        line: parseInt(lineStr, 10),
        column: colStr ? parseInt(colStr, 10) : undefined,
        message: message.trim(),
        code,
      });
    }

    // esbuild error format: X [ERROR] message\n\n    file:line:col:
    const esbuildPattern = /X \[ERROR\]\s*(.+?)(?:\n\n\s*(.+?):(\d+):(\d+))?/g;
    while ((match = esbuildPattern.exec(output)) !== null) {
      const [, message, file, lineStr, colStr] = match;
      if (file) {
        errors.push({
          type: 'build',
          file: this.normalizePath(file),
          line: lineStr ? parseInt(lineStr, 10) : undefined,
          column: colStr ? parseInt(colStr, 10) : undefined,
          message: message.trim(),
        });
      } else {
        // General esbuild error without file location
        errors.push({
          type: 'build',
          file: 'unknown',
          message: message.trim(),
        });
      }
    }

    return errors;
  }

  /**
   * Check if output indicates a config error
   */
  private isConfigError(output: string): boolean {
    const configErrorPatterns = [
      /error TS5058/i, // Path does not exist
      /error TS5023/i, // Unknown compiler option
      /error TS5024/i, // Unknown compiler option (alternative)
      /error TS6053/i, // File not found
      /tsconfig\.json.*not found/i,
      /cannot read.*tsconfig/i,
    ];

    return configErrorPatterns.some((pattern) => pattern.test(output));
  }

  /**
   * Extract config error message from output
   */
  private extractConfigError(output: string): string {
    // Try to find the specific error message
    const patterns = [
      /error (TS\d+):\s*(.+)/i,
      /tsconfig\.json[:\s]*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Invalid TypeScript configuration';
  }

  /**
   * Normalize file paths (convert Windows backslashes to forward slashes)
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }
}
