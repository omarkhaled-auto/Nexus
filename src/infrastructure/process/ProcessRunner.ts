/**
 * ProcessRunner - Safe command execution service for Nexus agents
 *
 * TDD RED Phase: Minimal exports for tests to compile but fail.
 * Full implementation pending GREEN phase.
 */

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
// Service (Stub Implementation for RED Phase)
// ============================================================================

/**
 * ProcessRunner provides safe command execution for Nexus agents.
 *
 * RED Phase: Methods are stubs that will fail tests.
 */
export class ProcessRunner {
  constructor(_options?: ProcessRunnerOptions) {
    // Stub
  }

  /**
   * Get the default timeout value
   */
  getDefaultTimeout(): number {
    throw new Error('Not implemented');
  }

  /**
   * Check if a command is allowed (not blocked)
   */
  isCommandAllowed(_command: string): boolean {
    throw new Error('Not implemented');
  }

  /**
   * Run a command and wait for completion
   */
  async run(_command: string, _options?: RunOptions): Promise<ProcessResult> {
    throw new Error('Not implemented');
  }

  /**
   * Run a command with streaming output
   */
  runStreaming(_command: string, _options?: StreamingOptions): ProcessHandle {
    throw new Error('Not implemented');
  }

  /**
   * Kill a process by PID (including all children)
   */
  async kill(_pid: number): Promise<void> {
    throw new Error('Not implemented');
  }
}
