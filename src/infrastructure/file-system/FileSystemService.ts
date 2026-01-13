/**
 * FileSystemService - Cross-platform file system operations for Nexus agents
 *
 * Uses:
 * - pathe: Cross-platform path handling
 * - fs-extra: Enhanced file operations
 * - fast-glob: Glob pattern matching
 * - chokidar: File watching
 *
 * TDD RED Phase: Stub implementation - all methods throw NotImplementedError
 */

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for file system operations
 */
export class FileSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Error thrown when a file or directory is not found
 */
export class FileNotFoundError extends FileSystemError {
  public readonly path: string;

  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = 'FileNotFoundError';
    this.path = path;
  }
}

/**
 * Error thrown when a write operation fails
 */
export class WriteError extends FileSystemError {
  public readonly path: string;
  public readonly reason: string;

  constructor(path: string, reason: string) {
    super(`Write failed for ${path}: ${reason}`);
    this.name = 'WriteError';
    this.path = path;
    this.reason = reason;
  }
}

/**
 * Error thrown when a glob operation fails
 */
export class GlobError extends FileSystemError {
  public readonly pattern: string;

  constructor(pattern: string, reason: string) {
    super(`Glob failed for pattern "${pattern}": ${reason}`);
    this.name = 'GlobError';
    this.pattern = pattern;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Watch event types
 */
export type WatchEventType = 'add' | 'change' | 'unlink';

/**
 * Watch event payload
 */
export interface WatchEvent {
  type: WatchEventType;
  path: string;
}

/**
 * Callback for file watch events
 */
export type WatchCallback = (event: WatchEvent) => void;

/**
 * Function to stop watching
 */
export type WatchDisposer = () => void;

/**
 * Glob options
 */
export interface GlobOptions {
  /** Working directory for glob patterns */
  cwd?: string;
  /** Patterns to ignore */
  ignore?: string[];
  /** Return absolute paths */
  absolute?: boolean;
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
 * FileSystemService constructor options
 */
export interface FileSystemServiceOptions {
  logger?: Logger;
}

// ============================================================================
// Service Implementation (Stub)
// ============================================================================

/**
 * FileSystemService provides file operations for Nexus agents.
 *
 * All paths are normalized using pathe for cross-platform compatibility.
 */
export class FileSystemService {
  private readonly logger?: Logger;

  constructor(options?: FileSystemServiceOptions) {
    this.logger = options?.logger;
  }

  /**
   * Read file contents as string
   * @throws FileNotFoundError if file does not exist
   */
  async readFile(_path: string): Promise<string> {
    throw new Error('Not implemented');
  }

  /**
   * Read file contents as Buffer (for binary files)
   * @throws FileNotFoundError if file does not exist
   */
  async readFileBuffer(_path: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }

  /**
   * Write content to file (creates parent directories if needed)
   * @throws WriteError if write operation fails
   */
  async writeFile(_path: string, _content: string | Buffer): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Check if path exists
   */
  async exists(_path: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  /**
   * Check if path is a directory
   */
  async isDirectory(_path: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  /**
   * Create directory (recursive by default)
   */
  async mkdir(_path: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Remove file or directory (recursive for directories)
   */
  async remove(_path: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Copy file or directory
   */
  async copy(_src: string, _dest: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Move file or directory
   */
  async move(_src: string, _dest: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Find files matching glob pattern
   */
  async glob(_pattern: string, _options?: GlobOptions): Promise<string[]> {
    throw new Error('Not implemented');
  }

  /**
   * Watch for file changes
   * @returns Disposer function to stop watching
   */
  watch(_path: string, _callback: WatchCallback): WatchDisposer {
    throw new Error('Not implemented');
  }
}
