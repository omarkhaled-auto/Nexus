/**
 * ProcessRunner - Safe command execution service for Nexus agents
 *
 * Uses:
 * - execa: Modern process execution with shell and streaming support
 * - tree-kill: Process tree termination for complete cleanup
 *
 * Features:
 * - Command validation against blocked patterns (safety first)
 * - Configurable timeout with 30s default (uses tree-kill for reliable termination)
 * - Streaming output with callbacks
 * - Process tree killing for cleanup
 */

import { execa, type ResultPromise, type Options as ExecaOptions } from 'execa';
import treeKill from 'tree-kill';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout for process execution (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Patterns for blocked/dangerous commands
 * These commands are never allowed to execute
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+(-[a-zA-Z]*)?-?r\s*-?f?\s+\/($|\s)/i, // rm -rf /
  /mkfs(\.[a-z0-9]+)?/i,                       // mkfs, mkfs.ext4, etc.
  /dd\s+if=/i,                                 // dd if=
  /format\s+[a-z]:/i,                          // format c: (Windows)
  /shutdown/i,                                 // shutdown
  /reboot/i,                                   // reboot
];

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for process execution errors
 */
export class ProcessError extends Error {
  public readonly command: string;
  public readonly exitCode: number;
  public readonly stdout?: string;
  public readonly stderr?: string;

  constructor(
    message: string,
    command: string,
    exitCode: number,
    stdout?: string,
    stderr?: string
  ) {
    super(message);
    this.name = 'ProcessError';
    this.command = command;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a process times out
 */
export class TimeoutError extends ProcessError {
  public readonly timeout: number;

  constructor(message: string, command: string, timeout: number) {
    super(message, command, -1);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Error thrown when a blocked command is attempted
 */
export class BlockedCommandError extends ProcessError {
  public readonly blockedCommand: string;

  constructor(command: string) {
    super(`Blocked command: ${command}`, command, -1);
    this.name = 'BlockedCommandError';
    this.blockedCommand = command;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for running a command
 */
export interface RunOptions {
  /** Working directory */
  cwd?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
  /** Use shell (default: true) */
  shell?: boolean;
}

/**
 * Options for streaming command execution
 */
export interface StreamingOptions extends RunOptions {
  /** Callback for stdout chunks */
  onStdout?: (chunk: string) => void;
  /** Callback for stderr chunks */
  onStderr?: (chunk: string) => void;
}

/**
 * Result of a process execution
 */
export interface ProcessResult {
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether the process was killed (timeout or manual) */
  killed: boolean;
}

/**
 * Handle for a streaming process
 */
export interface ProcessHandle {
  /** Process ID */
  pid: number;
  /** Promise that resolves with the result */
  promise: Promise<ProcessResult>;
  /** Kill the process */
  kill: () => void;
}

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * ProcessRunner constructor options
 */
export interface ProcessRunnerOptions {
  logger?: Logger;
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * ProcessRunner provides safe command execution for Nexus agents.
 *
 * All commands are validated against blocked patterns before execution.
 * Supports both synchronous (run) and streaming (runStreaming) execution.
 */
export class ProcessRunner {
  private readonly logger?: Logger;

  constructor(options?: ProcessRunnerOptions) {
    this.logger = options?.logger;
  }

  /**
   * Log a message if logger is available
   */
  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Get the default timeout value
   */
  getDefaultTimeout(): number {
    return DEFAULT_TIMEOUT;
  }

  /**
   * Check if a command is allowed (not blocked)
   * @param command - The command string to validate
   * @returns true if the command is safe to execute, false if blocked
   */
  isCommandAllowed(command: string): boolean {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate command and throw if blocked
   */
  private validateCommand(command: string): void {
    if (!this.isCommandAllowed(command)) {
      throw new BlockedCommandError(command);
    }
  }

  /**
   * Build execa options from RunOptions (without timeout - we handle it ourselves)
   */
  private buildExecaOptions(options?: RunOptions): ExecaOptions {
    return {
      shell: options?.shell ?? true,
      reject: false, // We handle errors ourselves
      // Don't set timeout here - we use our own implementation with tree-kill
      cwd: options?.cwd,
      env: options?.env
        ? { ...process.env, ...options.env }
        : undefined,
    };
  }

  /**
   * Kill a process using tree-kill and return a promise
   */
  private killProcess(pid: number): Promise<void> {
    return new Promise((resolve) => {
      treeKill(pid, 'SIGTERM', () => {
        resolve();
      });
    });
  }

  /**
   * Convert execa output to string (handles various output types)
   */
  private toStringOutput(output: string | string[] | Uint8Array | unknown[] | undefined | null): string {
    if (output === undefined || output === null) {
      return '';
    }
    if (typeof output === 'string') {
      return output;
    }
    if (Array.isArray(output)) {
      return output.join('\n');
    }
    if (output instanceof Uint8Array) {
      return new TextDecoder().decode(output);
    }
    return String(output);
  }

  /**
   * Run a command and wait for completion
   * @param command - The command to execute
   * @param options - Execution options (cwd, timeout, env, shell)
   * @returns ProcessResult with stdout, stderr, exitCode, duration, killed
   * @throws BlockedCommandError if command matches blocked patterns
   * @throws TimeoutError if command exceeds timeout
   * @throws ProcessError if command exits with non-zero code
   */
  async run(command: string, options?: RunOptions): Promise<ProcessResult> {
    this.log('debug', `Running command: ${command}`, options);

    // Validate command first
    this.validateCommand(command);

    const startTime = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const execaOptions = this.buildExecaOptions(options);

    // Start the subprocess
    const subprocess = execa(command, execaOptions);
    const pid = subprocess.pid ?? 0;

    // Set up timeout with tree-kill
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (pid > 0) {
        void this.killProcess(pid);
      }
    }, timeout);

    try {
      const result = await subprocess;
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Check if process timed out
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- timedOut can be set asynchronously
      if (timedOut || result.timedOut) {
        throw new TimeoutError(
          `Command timed out after ${timeout}ms: ${command}`,
          command,
          timeout
        );
      }

      // Check exit code (only if not terminated - killed processes have undefined exit code)
      const exitCode = result.exitCode ?? 0;
      const stdout = this.toStringOutput(result.stdout);
      const stderr = this.toStringOutput(result.stderr);

      if (exitCode !== 0 && !result.isTerminated) {
        throw new ProcessError(
          `Command failed with exit code ${exitCode}: ${command}`,
          command,
          exitCode,
          stdout,
          stderr
        );
      }

      return {
        stdout,
        stderr,
        exitCode,
        duration,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- isTerminated can be undefined
        killed: result.isTerminated ?? false,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw our custom errors
      if (
        error instanceof TimeoutError ||
        error instanceof ProcessError ||
        error instanceof BlockedCommandError
      ) {
        throw error;
      }

      // Check if it was our timeout
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- timedOut can be set asynchronously
      if (timedOut) {
        throw new TimeoutError(
          `Command timed out after ${timeout}ms: ${command}`,
          command,
          timeout
        );
      }

      // Handle execa errors
      const execaError = error as {
        timedOut?: boolean;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        isTerminated?: boolean;
      };

      if (execaError.timedOut) {
        throw new TimeoutError(
          `Command timed out: ${command}`,
          command,
          timeout
        );
      }

      throw new ProcessError(
        `Command failed: ${command}`,
        command,
        execaError.exitCode ?? -1,
        execaError.stdout,
        execaError.stderr
      );
    }
  }

  /**
   * Run a command with streaming output
   * @param command - The command to execute
   * @param options - Execution options including streaming callbacks
   * @returns ProcessHandle with pid, promise, and kill function
   * @throws BlockedCommandError if command matches blocked patterns (synchronously)
   */
  runStreaming(command: string, options?: StreamingOptions): ProcessHandle {
    this.log('debug', `Running streaming command: ${command}`, options);

    // Validate command first (throws synchronously if blocked)
    this.validateCommand(command);

    const startTime = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const execaOptions = this.buildExecaOptions(options);

    // Start the subprocess
    const subprocess: ResultPromise = execa(command, execaOptions);

    // Get the PID (execa provides it immediately)
    const pid = subprocess.pid ?? 0;

    // Track kill state
    let timedOut = false;
    let manuallyKilled = false;

    // Set up timeout with tree-kill
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (pid > 0) {
        void this.killProcess(pid);
      }
    }, timeout);

    // Set up streaming callbacks
    if (options?.onStdout && subprocess.stdout) {
      subprocess.stdout.on('data', (chunk: Buffer) => {
        options.onStdout?.(chunk.toString());
      });
    }

    if (options?.onStderr && subprocess.stderr) {
      subprocess.stderr.on('data', (chunk: Buffer) => {
        options.onStderr?.(chunk.toString());
      });
    }

    // Create the result promise
    const promise = (async (): Promise<ProcessResult> => {
      try {
        const result = await subprocess;
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Check if process timed out
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- timedOut can be set asynchronously
        if (timedOut || result.timedOut) {
          throw new TimeoutError(
            `Command timed out after ${timeout}ms: ${command}`,
            command,
            timeout
          );
        }

        // Check exit code (only if not terminated/killed - killed processes may have non-zero exit)
        const exitCode = result.exitCode ?? 0;
        const stdout = this.toStringOutput(result.stdout);
        const stderr = this.toStringOutput(result.stderr);
        const wasKilled = result.isTerminated || manuallyKilled;

        if (exitCode !== 0 && !wasKilled) {
          throw new ProcessError(
            `Command failed with exit code ${exitCode}: ${command}`,
            command,
            exitCode,
            stdout,
            stderr
          );
        }

        return {
          stdout,
          stderr,
          exitCode,
          duration,
          killed: wasKilled,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Re-throw our custom errors
        if (
          error instanceof TimeoutError ||
          error instanceof ProcessError ||
          error instanceof BlockedCommandError
        ) {
          throw error;
        }

        // Check if it was our timeout
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- timedOut can be set asynchronously
        if (timedOut) {
          throw new TimeoutError(
            `Command timed out after ${timeout}ms: ${command}`,
            command,
            timeout
          );
        }

        // Handle execa errors
        const execaError = error as {
          timedOut?: boolean;
          exitCode?: number;
          stdout?: string;
          stderr?: string;
          isTerminated?: boolean;
        };

        if (execaError.timedOut) {
          throw new TimeoutError(
            `Command timed out: ${command}`,
            command,
            timeout
          );
        }

        // If terminated (killed) or manually killed, return a result instead of throwing
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- manuallyKilled can be set externally
        if (execaError.isTerminated || manuallyKilled) {
          return {
            stdout: execaError.stdout ?? '',
            stderr: execaError.stderr ?? '',
            exitCode: execaError.exitCode ?? -1,
            duration: Date.now() - startTime,
            killed: true,
          };
        }

        throw new ProcessError(
          `Command failed: ${command}`,
          command,
          execaError.exitCode ?? -1,
          execaError.stdout,
          execaError.stderr
        );
      }
    })();

    // Create kill function using tree-kill
    const kill = (): void => {
      this.log('debug', `Killing process ${pid}`);
      manuallyKilled = true;
      clearTimeout(timeoutId);
      if (pid > 0) {
        treeKill(pid, 'SIGTERM');
      }
    };

    return {
      pid,
      promise,
      kill,
    };
  }

  /**
   * Kill a process by PID (including all children)
   * Uses tree-kill to terminate the entire process tree
   * @param pid - Process ID to kill
   */
  async kill(pid: number): Promise<void> {
    this.log('debug', `Killing process tree for PID ${pid}`);

    return new Promise((resolve) => {
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          // Log the error but don't throw - process may already be dead
          this.log('warn', `Error killing process ${pid}:`, err);
        }
        resolve();
      });
    });
  }
}
