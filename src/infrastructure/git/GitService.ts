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

import type { SimpleGit, SimpleGitOptions } from 'simple-git';
import { simpleGit } from 'simple-git';
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
  private readonly git: SimpleGit;

  constructor(options: GitServiceOptions) {
    this.baseDir = normalize(options.baseDir);
    this.binary = options.binary;
    this.logger = options.logger;

    // Configure simple-git instance
    const gitOptions: Partial<SimpleGitOptions> = {
      baseDir: this.baseDir,
      trimmed: true,
    };

    if (this.binary) {
      gitOptions.binary = this.binary;
    }

    this.git = simpleGit(gitOptions);
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
   * Ensure path is a git repository before operations
   */
  private async ensureRepository(): Promise<void> {
    const isRepo = await this.isRepository();
    if (!isRepo) {
      throw new NotARepositoryError(this.baseDir);
    }
  }

  // ==========================================================================
  // Repository Status
  // ==========================================================================

  /**
   * Check if path is inside a git repository
   */
  async isRepository(): Promise<boolean> {
    this.log('debug', `Checking if ${this.baseDir} is a git repository`);
    try {
      const result = await this.git.checkIsRepo();
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Get current repository status
   * @throws NotARepositoryError if not in a git repository
   */
  async status(): Promise<GitStatus> {
    this.log('debug', `Getting status for ${this.baseDir}`);
    await this.ensureRepository();

    const result = await this.git.status();

    return {
      current: result.current || '',
      tracking: result.tracking || undefined,
      staged: [...result.staged, ...result.created],
      modified: result.modified,
      untracked: result.not_added,
      conflicted: result.conflicted,
      ahead: result.ahead,
      behind: result.behind,
    };
  }

  /**
   * Get name of current branch
   * @throws NotARepositoryError if not in a git repository
   */
  async currentBranch(): Promise<string> {
    this.log('debug', `Getting current branch for ${this.baseDir}`);
    await this.ensureRepository();

    const result = await this.git.branch();
    return result.current;
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
    this.log('debug', `Creating branch ${name}${from ? ` from ${from}` : ''}`);
    await this.ensureRepository();

    if (from) {
      // Create branch from specified ref
      await this.git.branch([name, from]);
    } else {
      // Create branch from current HEAD
      await this.git.branch([name]);
    }
  }

  /**
   * Switch to existing branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async checkoutBranch(name: string): Promise<void> {
    this.log('debug', `Checking out branch ${name}`);
    await this.ensureRepository();

    // Check if branch exists
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(name)) {
      throw new BranchNotFoundError(name);
    }

    await this.git.checkout(name);
  }

  /**
   * Delete a branch
   * @param force Force delete unmerged branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async deleteBranch(name: string, force?: boolean): Promise<void> {
    this.log('debug', `Deleting branch ${name}${force ? ' (force)' : ''}`);
    await this.ensureRepository();

    // Check if branch exists
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(name)) {
      throw new BranchNotFoundError(name);
    }

    try {
      await this.git.deleteLocalBranch(name, force ?? false);
    } catch (error) {
      // Re-throw with more context if it's not a force delete issue
      if (!force) {
        throw error;
      }
      throw new GitError(`Failed to delete branch ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * List all local branches with metadata
   * @throws NotARepositoryError if not in a git repository
   */
  async listBranches(): Promise<BranchInfo[]> {
    this.log('debug', `Listing branches for ${this.baseDir}`);
    await this.ensureRepository();

    const result = await this.git.branchLocal();

    return result.all.map((name) => ({
      name,
      current: name === result.current,
      commit: result.branches[name]?.commit || '',
    }));
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
    this.log('debug', `Staging files: ${files === 'all' ? 'all' : files.join(', ')}`);
    await this.ensureRepository();

    if (files === 'all') {
      await this.git.add('.');
    } else {
      await this.git.add(files);
    }
  }

  /**
   * Create commit and return commit hash
   * @throws NotARepositoryError if not in a git repository
   * @throws CommitError if nothing to commit
   */
  async commit(message: string): Promise<string> {
    this.log('debug', `Creating commit: ${message}`);
    await this.ensureRepository();

    // Check if there's anything to commit
    const status = await this.git.status();
    if (status.staged.length === 0 && status.created.length === 0) {
      throw new CommitError('Nothing to commit');
    }

    try {
      const result = await this.git.commit(message);
      return result.commit;
    } catch (error) {
      const errMsg = (error as Error).message;
      throw new CommitError(errMsg);
    }
  }

  /**
   * Get commit history
   * @param limit Maximum number of commits to return
   * @throws NotARepositoryError if not in a git repository
   */
  async getLog(limit?: number): Promise<CommitInfo[]> {
    this.log('debug', `Getting log${limit ? ` (limit: ${limit})` : ''}`);
    await this.ensureRepository();

    const options = limit ? { maxCount: limit } : {};
    const result = await this.git.log(options);

    return result.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date),
    }));
  }

  // ==========================================================================
  // Diff Operations
  // ==========================================================================

  /**
   * Get diff of changes
   * @throws NotARepositoryError if not in a git repository
   */
  async diff(options?: DiffOptions): Promise<string> {
    this.log('debug', `Getting diff`, options);
    await this.ensureRepository();

    const args: string[] = [];

    if (options?.ref1 && options?.ref2) {
      // Diff between two refs
      args.push(options.ref1, options.ref2);
    } else if (options?.staged) {
      // Staged changes
      args.push('--cached');
    }
    // Default: unstaged changes (no args needed)

    const result = await this.git.diff(args);
    return result;
  }

  /**
   * Get diff statistics
   * @throws NotARepositoryError if not in a git repository
   */
  async diffStat(options?: DiffOptions): Promise<DiffStat> {
    this.log('debug', `Getting diff stat`, options);
    await this.ensureRepository();

    const args: string[] = [];

    if (options?.ref1 && options?.ref2) {
      // Diff between two refs
      args.push(options.ref1, options.ref2);
    } else if (options?.staged) {
      // Staged changes
      args.push('--cached');
    }
    // Default: unstaged changes (no args needed)

    const result = await this.git.diffSummary(args);

    return {
      filesChanged: result.files.length,
      insertions: result.insertions,
      deletions: result.deletions,
      files: result.files.map((file) => ({
        path: file.file,
        insertions: 'insertions' in file ? file.insertions : 0,
        deletions: 'deletions' in file ? file.deletions : 0,
      })),
    };
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
    this.log('debug', `Merging branch ${branch}`, options);
    await this.ensureRepository();

    // Check if branch exists
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(branch)) {
      throw new BranchNotFoundError(branch);
    }

    const args: string[] = [branch];

    if (options?.noFf) {
      args.unshift('--no-ff');
    }

    if (options?.message) {
      args.unshift('-m', options.message);
    }

    try {
      const result = await this.git.merge(args);

      // Check if merge was successful
      if (result.failed) {
        return {
          success: false,
          conflicts: result.conflicts.map((c) => (typeof c === 'string' ? c : c.file ?? String(c))),
        };
      }

      return {
        success: true,
        mergeCommit: result.merges?.[0],
      };
    } catch (error) {
      // Check for merge conflicts
      const status = await this.git.status();
      if (status.conflicted.length > 0) {
        return {
          success: false,
          conflicts: status.conflicted,
        };
      }

      throw new GitError(`Merge failed: ${(error as Error).message}`);
    }
  }

  /**
   * Abort in-progress merge
   * @throws NotARepositoryError if not in a git repository
   */
  async abortMerge(): Promise<void> {
    this.log('debug', `Aborting merge`);
    await this.ensureRepository();

    try {
      await this.git.merge(['--abort']);
    } catch (error) {
      throw new GitError(`Failed to abort merge: ${(error as Error).message}`);
    }
  }
}
