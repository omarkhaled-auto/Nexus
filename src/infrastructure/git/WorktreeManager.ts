/**
 * WorktreeManager - Git worktree isolation for Nexus agents
 *
 * TDD RED Phase: Stub implementation.
 * All methods throw 'Not implemented' until GREEN phase.
 *
 * Purpose: Enable multiple agents to work in parallel without conflicts
 * by creating isolated git worktrees for each task.
 */

import { GitService } from './GitService';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for worktree operations
 */
export class WorktreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorktreeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when trying to create a worktree that already exists
 */
export class WorktreeExistsError extends WorktreeError {
  public readonly taskId: string;

  constructor(taskId: string) {
    super(`Worktree already exists for task: ${taskId}`);
    this.name = 'WorktreeExistsError';
    this.taskId = taskId;
  }
}

/**
 * Error thrown when a worktree is not found
 */
export class WorktreeNotFoundError extends WorktreeError {
  public readonly taskId: string;

  constructor(taskId: string) {
    super(`Worktree not found for task: ${taskId}`);
    this.name = 'WorktreeNotFoundError';
    this.taskId = taskId;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a worktree
 */
export interface WorktreeInfo {
  /** Task ID this worktree belongs to */
  taskId: string;
  /** Absolute path to worktree directory */
  path: string;
  /** Branch name for this worktree */
  branch: string;
  /** Branch it was created from */
  baseBranch: string;
  /** When the worktree was created */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity?: Date;
  /** Current status */
  status: 'active' | 'idle' | 'stale';
}

/**
 * Registry storing all worktree metadata
 */
export interface WorktreeRegistry {
  /** Registry version for migrations */
  version: 1;
  /** Base directory of the repository */
  baseDir: string;
  /** Map of taskId to WorktreeInfo */
  worktrees: Record<string, WorktreeInfo>;
  /** Last time registry was updated */
  lastUpdated: Date;
}

/**
 * Options for cleanup operation
 */
export interface CleanupOptions {
  /** Maximum idle time in ms (default: 1 hour) */
  maxAge?: number;
  /** Force removal even if modified */
  force?: boolean;
  /** Just report, don't remove */
  dryRun?: boolean;
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  /** Task IDs of removed worktrees */
  removed: string[];
  /** Tasks that failed to remove */
  failed: { taskId: string; error: string }[];
  /** Tasks that were skipped (too recent, etc.) */
  skipped: string[];
}

/**
 * Options for removing a worktree
 */
export interface RemoveOptions {
  /** Delete the associated branch */
  deleteBranch?: boolean;
}

/**
 * WorktreeManager constructor options
 */
export interface WorktreeManagerOptions {
  /** Repository root directory */
  baseDir: string;
  /** GitService instance for git operations */
  gitService: GitService;
  /** Custom worktree directory (default: .nexus/worktrees) */
  worktreeDir?: string;
}

// ============================================================================
// Service Implementation (Stubs)
// ============================================================================

/**
 * WorktreeManager provides git worktree isolation for Nexus agents.
 *
 * Features:
 * - Create isolated worktrees for each task
 * - Track worktree metadata in registry
 * - Cleanup stale worktrees
 * - Branch naming: nexus/task/{taskId}/{timestamp}
 */
export class WorktreeManager {
  constructor(_options: WorktreeManagerOptions) {
    // Stub - will be implemented in GREEN phase
  }

  /**
   * Get absolute path to worktree directory for a task
   * @param taskId Task identifier
   * @returns Absolute path to worktree directory
   */
  getWorktreePath(_taskId: string): string {
    throw new Error('Not implemented');
  }

  /**
   * Create a new worktree for a task
   * @param taskId Task identifier
   * @param baseBranch Branch to create worktree from (default: main/master)
   * @returns WorktreeInfo for the created worktree
   * @throws WorktreeExistsError if worktree already exists for taskId
   */
  async createWorktree(_taskId: string, _baseBranch?: string): Promise<WorktreeInfo> {
    throw new Error('Not implemented');
  }

  /**
   * Get worktree info by task ID
   * @param taskId Task identifier
   * @returns WorktreeInfo if exists, null otherwise
   */
  async getWorktree(_taskId: string): Promise<WorktreeInfo | null> {
    throw new Error('Not implemented');
  }

  /**
   * List all active worktrees
   * @returns Array of WorktreeInfo
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    throw new Error('Not implemented');
  }

  /**
   * Remove a worktree
   * @param taskId Task identifier
   * @param options Removal options
   * @throws WorktreeNotFoundError if worktree doesn't exist
   */
  async removeWorktree(_taskId: string, _options?: RemoveOptions): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Cleanup stale worktrees
   * @param options Cleanup options
   * @returns CleanupResult with removed, failed, and skipped tasks
   */
  async cleanup(_options?: CleanupOptions): Promise<CleanupResult> {
    throw new Error('Not implemented');
  }

  /**
   * Load registry from disk (creates if not exists)
   * @returns WorktreeRegistry
   */
  async loadRegistry(): Promise<WorktreeRegistry> {
    throw new Error('Not implemented');
  }

  /**
   * Save registry to disk
   * @param registry Registry to save
   */
  async saveRegistry(_registry: WorktreeRegistry): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Update activity timestamp for a worktree
   * @param taskId Task identifier
   */
  async updateActivity(_taskId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Refresh status based on activity
   * @param taskId Task identifier
   */
  async refreshStatus(_taskId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
