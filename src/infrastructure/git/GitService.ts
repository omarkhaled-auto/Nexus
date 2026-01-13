/**
 * GitService - Version control operations for Nexus agents
 *
 * Uses:
 * - simple-git: Promise-based git operations
 * - pathe: Cross-platform path handling
 *
 * Features:
 * - Support for custom git binary path (for Electron bundling)
 * - Branch naming pattern: nexus/task/{taskId}/{timestamp}
 * - Clean error handling with typed exceptions
 */

import { normalize } from 'pathe';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for git operations
 */
export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when path is not inside a git repository
 */
export class NotARepositoryError extends GitError {
  public readonly path: string;

  constructor(path: string) {
    super(`Not a git repository: ${path}`);
    this.name = 'NotARepositoryError';
    this.path = path;
  }
}

/**
 * Error thrown when a branch is not found
 */
export class BranchNotFoundError extends GitError {
  public readonly branch: string;

  constructor(branch: string) {
    super(`Branch not found: ${branch}`);
    this.name = 'BranchNotFoundError';
    this.branch = branch;
  }
}

/**
 * Error thrown when a merge results in conflicts
 */
export class MergeConflictError extends GitError {
  public readonly conflicts: string[];

  constructor(conflicts: string[]) {
    super(`Merge conflict in files: ${conflicts.join(', ')}`);
    this.name = 'MergeConflictError';
    this.conflicts = conflicts;
  }
}

/**
 * Error thrown when a commit operation fails
 */
export class CommitError extends GitError {
  public readonly reason: string;

  constructor(reason: string) {
    super(`Commit failed: ${reason}`);
    this.name = 'CommitError';
    this.reason = reason;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Git repository status
 */
export interface GitStatus {
  /** Current branch name */
  current: string;
  /** Remote tracking branch */
  tracking?: string;
  /** Staged files */
  staged: string[];
  /** Modified (unstaged) files */
  modified: string[];
  /** Untracked files */
  untracked: string[];
  /** Files with merge conflicts */
  conflicted: string[];
  /** Commits ahead of remote */
  ahead: number;
  /** Commits behind remote */
  behind: number;
}

/**
 * Branch information
 */
export interface BranchInfo {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  current: boolean;
  /** Latest commit hash */
  commit: string;
}

/**
 * Commit information
 */
export interface CommitInfo {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit date */
  date: Date;
}

/**
 * Diff options
 */
export interface DiffOptions {
  /** Show staged changes only */
  staged?: boolean;
  /** Compare from this ref */
  ref1?: string;
  /** Compare to this ref (default: HEAD) */
  ref2?: string;
}

/**
 * Diff statistics
 */
export interface DiffStat {
  /** Number of files changed */
  filesChanged: number;
  /** Total insertions */
  insertions: number;
  /** Total deletions */
  deletions: number;
  /** Per-file statistics */
  files: Array<{
    path: string;
    insertions: number;
    deletions: number;
  }>;
}

/**
 * Merge options
 */
export interface MergeOptions {
  /** Merge message */
  message?: string;
  /** No fast-forward */
  noFf?: boolean;
}

/**
 * Merge result
 */
export interface MergeResult {
  /** Whether merge was successful */
  success: boolean;
  /** Merge commit hash (if created) */
  mergeCommit?: string;
  /** Files with conflicts (if any) */
  conflicts?: string[];
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
 * GitService constructor options
 */
export interface GitServiceOptions {
  /** Repository base directory */
  baseDir: string;
  /** Custom git binary path (for Electron bundling) */
  binary?: string;
  /** Optional logger */
  logger?: Logger;
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * GitService provides git operations for Nexus agents.
 *
 * All paths are normalized using pathe for cross-platform compatibility.
 */
export class GitService {
  private readonly baseDir: string;
  private readonly binary?: string;
  private readonly logger?: Logger;

  constructor(options: GitServiceOptions) {
    this.baseDir = normalize(options.baseDir);
    this.binary = options.binary;
    this.logger = options.logger;
  }

  // ==========================================================================
  // Repository Status
  // ==========================================================================

  /**
   * Check if path is inside a git repository
   */
  async isRepository(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  /**
   * Get current repository status
   * @throws NotARepositoryError if not in a git repository
   */
  async status(): Promise<GitStatus> {
    throw new Error('Not implemented');
  }

  /**
   * Get name of current branch
   * @throws NotARepositoryError if not in a git repository
   */
  async currentBranch(): Promise<string> {
    throw new Error('Not implemented');
  }

  // ==========================================================================
  // Branch Operations
  // ==========================================================================

  /**
   * Create new branch from source (default: current)
   * Does NOT checkout the branch
   * @throws NotARepositoryError if not in a git repository
   */
  async createBranch(name: string, from?: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Switch to existing branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async checkoutBranch(name: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Delete a branch
   * @param force Force delete unmerged branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async deleteBranch(name: string, force?: boolean): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * List all local branches with metadata
   * @throws NotARepositoryError if not in a git repository
   */
  async listBranches(): Promise<BranchInfo[]> {
    throw new Error('Not implemented');
  }

  // ==========================================================================
  // Commit Operations
  // ==========================================================================

  /**
   * Stage specific files or all changes
   * @param files Array of file paths or 'all' for all changes
   * @throws NotARepositoryError if not in a git repository
   */
  async stageFiles(files: string[] | 'all'): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Create commit and return commit hash
   * @throws NotARepositoryError if not in a git repository
   * @throws CommitError if nothing to commit
   */
  async commit(message: string): Promise<string> {
    throw new Error('Not implemented');
  }

  /**
   * Get commit history
   * @param limit Maximum number of commits to return
   * @throws NotARepositoryError if not in a git repository
   */
  async getLog(limit?: number): Promise<CommitInfo[]> {
    throw new Error('Not implemented');
  }

  // ==========================================================================
  // Diff Operations
  // ==========================================================================

  /**
   * Get diff of changes
   * @throws NotARepositoryError if not in a git repository
   */
  async diff(options?: DiffOptions): Promise<string> {
    throw new Error('Not implemented');
  }

  /**
   * Get diff statistics
   * @throws NotARepositoryError if not in a git repository
   */
  async diffStat(options?: DiffOptions): Promise<DiffStat> {
    throw new Error('Not implemented');
  }

  // ==========================================================================
  // Merge Operations
  // ==========================================================================

  /**
   * Merge branch into current
   * Returns conflict info if any
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async merge(branch: string, options?: MergeOptions): Promise<MergeResult> {
    throw new Error('Not implemented');
  }

  /**
   * Abort in-progress merge
   * @throws NotARepositoryError if not in a git repository
   */
  async abortMerge(): Promise<void> {
    throw new Error('Not implemented');
  }
}
