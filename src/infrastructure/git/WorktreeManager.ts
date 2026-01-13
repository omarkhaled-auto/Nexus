/**
 * WorktreeManager - Git worktree isolation for Nexus agents
 *
 * Purpose: Enable multiple agents to work in parallel without conflicts
 * by creating isolated git worktrees for each task.
 *
 * Features:
 * - Create isolated worktrees for each task
 * - Track worktree metadata in registry.json
 * - Cleanup stale worktrees
 * - Branch naming: nexus/task/{taskId}/{timestamp}
 *
 * Uses:
 * - execa: For running git worktree commands (simple-git lacks worktree support)
 * - pathe: Cross-platform path handling
 * - fs-extra: File system operations
 */

import { join, normalize } from 'pathe';
import fse from 'fs-extra';
import { execaCommand } from 'execa';
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
// Constants
// ============================================================================

/** Default max age for cleanup (1 hour) */
const DEFAULT_MAX_AGE = 1 * 60 * 60 * 1000;

/** Idle threshold (15 minutes) */
const IDLE_THRESHOLD = 15 * 60 * 1000;

/** Stale threshold (30 minutes) */
const STALE_THRESHOLD = 30 * 60 * 1000;

/** Lock timeout (5 seconds) */
const LOCK_TIMEOUT = 5000;

/** Lock retry interval (50ms) */
const LOCK_RETRY_INTERVAL = 50;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * WorktreeManager provides git worktree isolation for Nexus agents.
 *
 * This is a core Nexus innovation enabling multiple agents to work
 * in parallel without conflicts. Each task gets its own worktree
 * with a dedicated branch.
 *
 * Branch naming: nexus/task/{taskId}/{timestamp}
 * Worktree path: {worktreeDir}/{taskId}/
 * Registry: {worktreeDir}/registry.json
 */
export class WorktreeManager {
  private readonly baseDir: string;
  private readonly worktreeDir: string;
  private readonly gitService: GitService;
  private readonly registryPath: string;
  private readonly lockPath: string;
  private isLocked = false;

  constructor(options: WorktreeManagerOptions) {
    this.baseDir = normalize(options.baseDir);
    this.worktreeDir = normalize(
      options.worktreeDir || join(this.baseDir, '.nexus', 'worktrees')
    );
    this.gitService = options.gitService;
    this.registryPath = join(this.worktreeDir, 'registry.json');
    this.lockPath = join(this.worktreeDir, '.lock');
  }

  // ==========================================================================
  // Lock Management (for concurrent access)
  // ==========================================================================

  /**
   * Acquire file lock for registry access
   * Uses a simple file-based lock with timeout
   */
  private async acquireLock(): Promise<void> {
    const startTime = Date.now();
    await fse.ensureDir(this.worktreeDir);

    while (true) {
      try {
        // Try to create lock file exclusively
        await fse.writeFile(this.lockPath, String(process.pid), { flag: 'wx' });
        this.isLocked = true;
        return;
      } catch (error) {
        // Lock file exists, check timeout
        if (Date.now() - startTime > LOCK_TIMEOUT) {
          // Force acquire lock if timeout exceeded (stale lock)
          try {
            await fse.remove(this.lockPath);
            await fse.writeFile(this.lockPath, String(process.pid), { flag: 'wx' });
            this.isLocked = true;
            return;
          } catch {
            throw new WorktreeError('Failed to acquire registry lock');
          }
        }
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL));
      }
    }
  }

  /**
   * Release file lock
   */
  private async releaseLock(): Promise<void> {
    if (this.isLocked) {
      try {
        await fse.remove(this.lockPath);
      } catch {
        // Ignore errors on unlock
      }
      this.isLocked = false;
    }
  }

  /**
   * Execute a function with registry lock
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireLock();
    try {
      return await fn();
    } finally {
      await this.releaseLock();
    }
  }

  // ==========================================================================
  // Path Operations
  // ==========================================================================

  /**
   * Get absolute path to worktree directory for a task
   * @param taskId Task identifier
   * @returns Absolute path to worktree directory
   */
  getWorktreePath(taskId: string): string {
    return join(this.worktreeDir, taskId);
  }

  /**
   * Generate branch name for a task
   * @param taskId Task identifier
   * @returns Branch name following pattern nexus/task/{taskId}/{timestamp}
   */
  private generateBranchName(taskId: string): string {
    const timestamp = Date.now();
    return `nexus/task/${taskId}/${timestamp}`;
  }

  // ==========================================================================
  // Registry Operations
  // ==========================================================================

  /**
   * Internal: Load registry from disk (creates if not exists)
   * Should only be called when lock is held
   */
  private async loadRegistryInternal(): Promise<WorktreeRegistry> {
    // Ensure directory exists
    await fse.ensureDir(this.worktreeDir);

    try {
      if (await fse.pathExists(this.registryPath)) {
        const content = await fse.readFile(this.registryPath, 'utf-8');
        const raw = JSON.parse(content);

        // Convert date strings back to Date objects
        const registry: WorktreeRegistry = {
          ...raw,
          lastUpdated: new Date(raw.lastUpdated),
          worktrees: {},
        };

        for (const [taskId, info] of Object.entries(raw.worktrees as Record<string, unknown>)) {
          const worktreeRaw = info as Record<string, unknown>;
          registry.worktrees[taskId] = {
            ...worktreeRaw,
            createdAt: new Date(worktreeRaw.createdAt as string),
            lastActivity: worktreeRaw.lastActivity
              ? new Date(worktreeRaw.lastActivity as string)
              : undefined,
          } as WorktreeInfo;
        }

        return registry;
      }
    } catch {
      // If file is corrupted, create new registry
    }

    // Create new registry
    const registry: WorktreeRegistry = {
      version: 1,
      baseDir: this.baseDir,
      worktrees: {},
      lastUpdated: new Date(),
    };

    await this.saveRegistryInternal(registry);
    return registry;
  }

  /**
   * Internal: Save registry to disk
   * Should only be called when lock is held
   */
  private async saveRegistryInternal(registry: WorktreeRegistry): Promise<void> {
    // Ensure directory exists
    await fse.ensureDir(this.worktreeDir);

    // Update timestamp
    registry.lastUpdated = new Date();

    // Write to temp file first for atomic operation
    const tempPath = `${this.registryPath}.tmp`;
    await fse.writeFile(tempPath, JSON.stringify(registry, null, 2), 'utf-8');
    await fse.rename(tempPath, this.registryPath);
  }

  /**
   * Load registry from disk (creates if not exists)
   * @returns WorktreeRegistry
   */
  async loadRegistry(): Promise<WorktreeRegistry> {
    return this.withLock(() => this.loadRegistryInternal());
  }

  /**
   * Save registry to disk
   * Uses atomic write (temp file + rename) for safety
   * @param registry Registry to save
   */
  async saveRegistry(registry: WorktreeRegistry): Promise<void> {
    return this.withLock(() => this.saveRegistryInternal(registry));
  }

  // ==========================================================================
  // Worktree Operations
  // ==========================================================================

  /**
   * Create a new worktree for a task
   * @param taskId Task identifier
   * @param baseBranch Branch to create worktree from (default: main/master)
   * @returns WorktreeInfo for the created worktree
   * @throws WorktreeExistsError if worktree already exists for taskId
   */
  async createWorktree(taskId: string, baseBranch?: string): Promise<WorktreeInfo> {
    // Use lock to prevent concurrent creation conflicts
    return this.withLock(async () => {
      const registry = await this.loadRegistryInternal();

      // Check if worktree already exists
      if (registry.worktrees[taskId]) {
        throw new WorktreeExistsError(taskId);
      }

      // Determine base branch
      const actualBaseBranch = baseBranch || await this.gitService.currentBranch();

      // Generate branch name and worktree path
      const branchName = this.generateBranchName(taskId);
      const worktreePath = this.getWorktreePath(taskId);

      // Create worktree using git command
      // git worktree add <path> -b <branch> [<base-branch>]
      const cmd = `git worktree add "${worktreePath}" -b "${branchName}" "${actualBaseBranch}"`;
      await execaCommand(cmd, { cwd: this.baseDir, shell: true });

      // Create WorktreeInfo
      const now = new Date();
      const info: WorktreeInfo = {
        taskId,
        path: worktreePath,
        branch: branchName,
        baseBranch: actualBaseBranch,
        createdAt: now,
        lastActivity: now,
        status: 'active',
      };

      // Update registry
      registry.worktrees[taskId] = info;
      await this.saveRegistryInternal(registry);

      return info;
    });
  }

  /**
   * Get worktree info by task ID
   * @param taskId Task identifier
   * @returns WorktreeInfo if exists, null otherwise
   */
  async getWorktree(taskId: string): Promise<WorktreeInfo | null> {
    const registry = await this.loadRegistry();
    return registry.worktrees[taskId] || null;
  }

  /**
   * List all active worktrees
   * @returns Array of WorktreeInfo
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    const registry = await this.loadRegistry();
    return Object.values(registry.worktrees);
  }

  /**
   * Remove a worktree
   * @param taskId Task identifier
   * @param options Removal options
   * @throws WorktreeNotFoundError if worktree doesn't exist
   */
  async removeWorktree(taskId: string, options?: RemoveOptions): Promise<void> {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];

    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }

    // Remove worktree using git command
    // Use --force to remove even if dirty
    try {
      const cmd = `git worktree remove "${info.path}" --force`;
      await execaCommand(cmd, { cwd: this.baseDir, shell: true });
    } catch {
      // If worktree remove fails, try to manually clean up
      if (await fse.pathExists(info.path)) {
        await fse.remove(info.path);
        // Also need to prune worktree references
        await execaCommand('git worktree prune', { cwd: this.baseDir, shell: true });
      }
    }

    // Optionally delete branch
    if (options?.deleteBranch) {
      try {
        await this.gitService.deleteBranch(info.branch, true);
      } catch {
        // Branch might already be deleted or merged
      }
    }

    // Update registry
    delete registry.worktrees[taskId];
    await this.saveRegistry(registry);
  }

  /**
   * Cleanup stale worktrees
   * @param options Cleanup options
   * @returns CleanupResult with removed, failed, and skipped tasks
   */
  async cleanup(options?: CleanupOptions): Promise<CleanupResult> {
    const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE;
    const force = options?.force ?? false;
    const dryRun = options?.dryRun ?? false;

    const result: CleanupResult = {
      removed: [],
      failed: [],
      skipped: [],
    };

    const registry = await this.loadRegistry();
    const now = Date.now();

    for (const [taskId, info] of Object.entries(registry.worktrees)) {
      const lastActivityTime = info.lastActivity?.getTime() ?? info.createdAt.getTime();
      const age = now - lastActivityTime;

      // Check if worktree is stale
      if (age < maxAge && !force) {
        result.skipped.push(taskId);
        continue;
      }

      // Check if worktree has status 'stale' or is old enough
      if (info.status !== 'stale' && age < maxAge && !force) {
        result.skipped.push(taskId);
        continue;
      }

      // If dryRun, just report but don't actually remove
      if (dryRun) {
        result.removed.push(taskId);
        continue;
      }

      // Actually remove the worktree
      try {
        await this.removeWorktree(taskId, { deleteBranch: true });
        result.removed.push(taskId);
      } catch (error) {
        result.failed.push({
          taskId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  // ==========================================================================
  // Activity Tracking
  // ==========================================================================

  /**
   * Update activity timestamp for a worktree
   * @param taskId Task identifier
   */
  async updateActivity(taskId: string): Promise<void> {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];

    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }

    info.lastActivity = new Date();
    info.status = 'active';
    await this.saveRegistry(registry);
  }

  /**
   * Refresh status based on activity
   * Status transitions:
   * - active: lastActivity < 15 minutes ago
   * - idle: lastActivity 15-30 minutes ago
   * - stale: lastActivity > 30 minutes ago
   * @param taskId Task identifier
   */
  async refreshStatus(taskId: string): Promise<void> {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];

    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }

    const now = Date.now();
    const lastActivityTime = info.lastActivity?.getTime() ?? info.createdAt.getTime();
    const age = now - lastActivityTime;

    if (age < IDLE_THRESHOLD) {
      info.status = 'active';
    } else if (age < STALE_THRESHOLD) {
      info.status = 'idle';
    } else {
      info.status = 'stale';
    }

    await this.saveRegistry(registry);
  }
}
