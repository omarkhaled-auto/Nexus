/**
 * FileSystemService - Cross-platform file system operations for Nexus agents
 *
 * Uses:
 * - pathe: Cross-platform path handling
 * - fs-extra: Enhanced file operations
 * - fast-glob: Glob pattern matching
 * - chokidar: File watching
 */

import fse from 'fs-extra';
import { normalize, dirname } from 'pathe';
import fg from 'fast-glob';
import chokidar from 'chokidar';

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
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
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
// Service Implementation
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
   * Normalize a path for cross-platform compatibility
   */
  private normalizePath(path: string): string {
    return normalize(path);
  }

  /**
   * Log a debug message if logger is available
   */
  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Read file contents as string
   * @throws FileNotFoundError if file does not exist
   */
  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Reading file: ${normalizedPath}`);

    try {
      const content = await fse.readFile(normalizedPath, 'utf-8');
      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(normalizedPath);
      }
      throw error;
    }
  }

  /**
   * Read file contents as Buffer (for binary files)
   * @throws FileNotFoundError if file does not exist
   */
  async readFileBuffer(path: string): Promise<Buffer> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Reading file buffer: ${normalizedPath}`);

    try {
      const content = await fse.readFile(normalizedPath);
      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(normalizedPath);
      }
      throw error;
    }
  }

  /**
   * Write content to file (creates parent directories if needed)
   * @throws WriteError if write operation fails
   */
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Writing file: ${normalizedPath}`);

    try {
      // Ensure parent directory exists
      const dir = dirname(normalizedPath);
      await fse.ensureDir(dir);

      // Write the file
      await fse.writeFile(normalizedPath, content);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw new WriteError(normalizedPath, err.message || 'Unknown error');
    }
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Checking exists: ${normalizedPath}`);

    return fse.pathExists(normalizedPath);
  }

  /**
   * Check if path is a directory
   */
  async isDirectory(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Checking isDirectory: ${normalizedPath}`);

    try {
      const stat = await fse.stat(normalizedPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Create directory (recursive by default)
   */
  async mkdir(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Creating directory: ${normalizedPath}`);

    await fse.ensureDir(normalizedPath);
  }

  /**
   * Remove file or directory (recursive for directories)
   */
  async remove(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Removing: ${normalizedPath}`);

    await fse.remove(normalizedPath);
  }

  /**
   * Copy file or directory
   */
  async copy(src: string, dest: string): Promise<void> {
    const normalizedSrc = this.normalizePath(src);
    const normalizedDest = this.normalizePath(dest);
    this.log('debug', `Copying: ${normalizedSrc} -> ${normalizedDest}`);

    // Ensure parent directory of destination exists
    const destDir = dirname(normalizedDest);
    await fse.ensureDir(destDir);

    await fse.copy(normalizedSrc, normalizedDest);
  }

  /**
   * Move file or directory
   */
  async move(src: string, dest: string): Promise<void> {
    const normalizedSrc = this.normalizePath(src);
    const normalizedDest = this.normalizePath(dest);
    this.log('debug', `Moving: ${normalizedSrc} -> ${normalizedDest}`);

    // Ensure parent directory of destination exists
    const destDir = dirname(normalizedDest);
    await fse.ensureDir(destDir);

    await fse.move(normalizedSrc, normalizedDest);
  }

  /**
   * Find files matching glob pattern
   */
  async glob(pattern: string, options?: GlobOptions): Promise<string[]> {
    this.log('debug', `Glob pattern: ${pattern}`, options);

    try {
      const results = await fg(pattern, {
        cwd: options?.cwd,
        ignore: options?.ignore,
        absolute: options?.absolute ?? false,
      });
      return results;
    } catch (error) {
      const err = error as Error;
      throw new GlobError(pattern, err.message || 'Unknown error');
    }
  }

  /**
   * Watch for file changes
   * @returns Disposer function to stop watching
   */
  watch(path: string, callback: WatchCallback): WatchDisposer {
    const normalizedPath = this.normalizePath(path);
    this.log('debug', `Starting watch: ${normalizedPath}`);

    const watcher = chokidar.watch(normalizedPath, {
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on('add', (filePath) => {
      callback({ type: 'add', path: filePath });
    });

    watcher.on('change', (filePath) => {
      callback({ type: 'change', path: filePath });
    });

    watcher.on('unlink', (filePath) => {
      callback({ type: 'unlink', path: filePath });
    });

    // Return disposer function
    return () => {
      this.log('debug', `Stopping watch: ${normalizedPath}`);
      void watcher.close();
    };
  }
}
