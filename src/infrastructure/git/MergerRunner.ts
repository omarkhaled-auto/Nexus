/**
 * MergerRunner - Git merge operations for Nexus task completion
 *
 * Phase 3: Merges worktree branches back to main branch after task completion.
 *
 * Features:
 * - Merge worktree branch to target branch (usually main)
 * - Detect and report merge conflicts
 * - Return detailed merge results with commit hash
 * - Support for different merge strategies
 *
 * Uses:
 * - execa: For running git commands
 * - WorktreeManager: For worktree information lookup
 */

import { execaCommand } from 'execa';
import type { WorktreeManager, WorktreeInfo } from './WorktreeManager';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a merge operation
 */
export interface MergeResult {
  /** Whether the merge succeeded */
  success: boolean;
  /** Commit hash after successful merge */
  commitHash?: string;
  /** Error message if merge failed */
  error?: string;
  /** Files with conflicts (if any) */
  conflictFiles?: string[];
  /** Number of files changed */
  filesChanged?: number;
  /** Number of insertions */
  insertions?: number;
  /** Number of deletions */
  deletions?: number;
}

/**
 * Options for merge operation
 */
export interface MergeOptions {
  /** Target branch to merge into (default: 'main') */
  targetBranch?: string;
  /** Whether to squash commits */
  squash?: boolean;
  /** Custom commit message */
  message?: string;
  /** Whether to fast-forward if possible */
  fastForward?: boolean;
}

/**
 * Configuration for MergerRunner
 */
export interface MergerRunnerConfig {
  /** WorktreeManager for looking up worktree info */
  worktreeManager?: WorktreeManager;
  /** Base directory of the repository */
  baseDir: string;
}

// ============================================================================
// MergerRunner Implementation
// ============================================================================

/**
 * MergerRunner - Handles merging worktree branches back to main
 *
 * This class is responsible for:
 * 1. Looking up the worktree branch from the worktree path
 * 2. Merging the branch to the target branch (usually main)
 * 3. Handling merge conflicts and returning detailed results
 *
 * @example
 * ```typescript
 * const runner = new MergerRunner({ baseDir: '/path/to/repo' });
 * const result = await runner.merge('/path/to/worktree', 'main');
 * if (result.success) {
 *   console.log(`Merged with commit: ${result.commitHash}`);
 * }
 * ```
 */
export class MergerRunner {
  private readonly baseDir: string;
  private readonly worktreeManager?: WorktreeManager;

  constructor(config: MergerRunnerConfig) {
    this.baseDir = config.baseDir;
    this.worktreeManager = config.worktreeManager;
  }

  /**
   * Merge a worktree branch to the target branch
   *
   * @param worktreePath - Path to the worktree or branch name
   * @param targetBranch - Target branch to merge into (default: 'main')
   * @param options - Additional merge options
   * @returns MergeResult with success/failure and details
   */
  async merge(
    worktreePath: string,
    targetBranch: string = 'main',
    options: MergeOptions = {}
  ): Promise<MergeResult> {
    console.log(`[MergerRunner] Starting merge: ${worktreePath} -> ${targetBranch}`);

    try {
      // Get the branch name from the worktree
      const branchName = await this.getBranchFromWorktree(worktreePath);
      if (!branchName) {
        return {
          success: false,
          error: `Could not determine branch for worktree: ${worktreePath}`,
        };
      }
      console.log(`[MergerRunner] Source branch: ${branchName}`);

      // Ensure we're in the base directory and on target branch
      await this.checkoutTargetBranch(targetBranch);

      // Pull latest changes from remote (if available)
      await this.pullLatestChanges(targetBranch);

      // Perform the merge
      const mergeResult = await this.performMerge(branchName, targetBranch, options);

      if (mergeResult.success) {
        console.log(`[MergerRunner] Merge successful: ${mergeResult.commitHash}`);
      } else {
        console.log(`[MergerRunner] Merge failed: ${mergeResult.error}`);
      }

      return mergeResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MergerRunner] Merge exception: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get the branch name from a worktree path
   */
  private async getBranchFromWorktree(worktreePath: string): Promise<string | null> {
    // If worktreeManager is available, try to get branch from registry
    if (this.worktreeManager) {
      try {
        // Try to find by path in worktree info
        // Note: This is a simplified lookup - may need enhancement
        const info = await this.getWorktreeInfoByPath(worktreePath);
        if (info?.branch) {
          return info.branch;
        }
      } catch {
        // Fall through to git command
      }
    }

    // Fallback: Get current branch from the worktree directory
    try {
      const { stdout } = await execaCommand('git rev-parse --abbrev-ref HEAD', {
        cwd: worktreePath,
      });
      return stdout.trim();
    } catch {
      // If path is not a directory, it might be a branch name directly
      if (!worktreePath.includes('/') && !worktreePath.includes('\\')) {
        return worktreePath;
      }
      return null;
    }
  }

  /**
   * Get worktree info by path (if worktreeManager available)
   */
  private async getWorktreeInfoByPath(path: string): Promise<WorktreeInfo | null> {
    // This would need WorktreeManager to expose a method to find by path
    // For now, return null and fall back to git command
    return null;
  }

  /**
   * Checkout the target branch in the base directory
   */
  private async checkoutTargetBranch(targetBranch: string): Promise<void> {
    console.log(`[MergerRunner] Checking out target branch: ${targetBranch}`);

    try {
      // First, check if there are uncommitted changes
      const { stdout: statusOutput } = await execaCommand('git status --porcelain', {
        cwd: this.baseDir,
      });

      if (statusOutput.trim()) {
        console.warn(`[MergerRunner] Warning: Working directory has uncommitted changes`);
        // Stash changes before checkout
        await execaCommand('git stash push -m "nexus-merge-autostash"', {
          cwd: this.baseDir,
        });
      }

      // Checkout target branch
      await execaCommand(`git checkout ${targetBranch}`, {
        cwd: this.baseDir,
      });
    } catch (error) {
      throw new Error(`Failed to checkout ${targetBranch}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pull latest changes from remote
   */
  private async pullLatestChanges(branch: string): Promise<void> {
    console.log(`[MergerRunner] Pulling latest changes for: ${branch}`);

    try {
      // Check if remote exists
      const { stdout: remoteOutput } = await execaCommand('git remote', {
        cwd: this.baseDir,
      });

      if (remoteOutput.trim()) {
        // Pull from origin (or first remote)
        const remote = remoteOutput.trim().split('\n')[0];
        await execaCommand(`git pull ${remote} ${branch} --ff-only`, {
          cwd: this.baseDir,
        });
      }
    } catch {
      // Ignore pull errors - merge can still proceed with local state
      console.log(`[MergerRunner] Could not pull latest changes (continuing with local state)`);
    }
  }

  /**
   * Perform the actual merge operation
   */
  private async performMerge(
    sourceBranch: string,
    targetBranch: string,
    options: MergeOptions
  ): Promise<MergeResult> {
    const message = options.message || `Merge ${sourceBranch} into ${targetBranch} (Nexus task completion)`;

    try {
      // Build merge command
      let mergeCmd = `git merge ${sourceBranch}`;

      if (options.squash) {
        mergeCmd += ' --squash';
      }

      if (options.fastForward === false) {
        mergeCmd += ' --no-ff';
      }

      mergeCmd += ` -m "${message}"`;

      console.log(`[MergerRunner] Executing: ${mergeCmd}`);

      // Execute merge
      const { stdout } = await execaCommand(mergeCmd, {
        cwd: this.baseDir,
      });

      // Get the commit hash
      const { stdout: commitHash } = await execaCommand('git rev-parse HEAD', {
        cwd: this.baseDir,
      });

      // Parse merge output for stats
      const stats = this.parseMergeStats(stdout);

      return {
        success: true,
        commitHash: commitHash.trim(),
        filesChanged: stats.filesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions,
      };
    } catch (error) {
      // Check for merge conflicts
      const conflictFiles = await this.checkForConflicts();

      if (conflictFiles.length > 0) {
        // Abort the merge to leave repo in clean state
        try {
          await execaCommand('git merge --abort', { cwd: this.baseDir });
        } catch {
          // Ignore abort errors
        }

        return {
          success: false,
          error: `Merge conflict in ${conflictFiles.length} file(s)`,
          conflictFiles,
        };
      }

      // Other merge error
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check for merge conflicts
   */
  private async checkForConflicts(): Promise<string[]> {
    try {
      const { stdout } = await execaCommand('git diff --name-only --diff-filter=U', {
        cwd: this.baseDir,
      });

      if (stdout.trim()) {
        return stdout.trim().split('\n').filter(Boolean);
      }
    } catch {
      // Ignore errors
    }

    return [];
  }

  /**
   * Parse merge output for statistics
   */
  private parseMergeStats(output: string): { filesChanged: number; insertions: number; deletions: number } {
    const stats = { filesChanged: 0, insertions: 0, deletions: 0 };

    // Try to parse "X files changed, Y insertions(+), Z deletions(-)"
    const statsMatch = output.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    if (statsMatch) {
      stats.filesChanged = parseInt(statsMatch[1], 10) || 0;
      stats.insertions = parseInt(statsMatch[2], 10) || 0;
      stats.deletions = parseInt(statsMatch[3], 10) || 0;
    }

    return stats;
  }

  /**
   * Push merged changes to remote
   */
  async pushToRemote(branch: string = 'main'): Promise<{ success: boolean; error?: string }> {
    console.log(`[MergerRunner] Pushing to remote: ${branch}`);

    try {
      const { stdout: remoteOutput } = await execaCommand('git remote', {
        cwd: this.baseDir,
      });

      if (!remoteOutput.trim()) {
        return { success: false, error: 'No remote configured' };
      }

      const remote = remoteOutput.trim().split('\n')[0];
      await execaCommand(`git push ${remote} ${branch}`, {
        cwd: this.baseDir,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Abort an in-progress merge
   */
  async abortMerge(): Promise<void> {
    try {
      await execaCommand('git merge --abort', { cwd: this.baseDir });
      console.log(`[MergerRunner] Merge aborted`);
    } catch {
      // Ignore if no merge in progress
    }
  }

  /**
   * Check if a merge is currently in progress
   */
  async isMergeInProgress(): Promise<boolean> {
    try {
      const { stdout } = await execaCommand('git merge HEAD', {
        cwd: this.baseDir,
      });
      return false;
    } catch {
      // If merge fails, check if it's because there's already a merge in progress
      try {
        const { stdout } = await execaCommand('git rev-parse -q --verify MERGE_HEAD', {
          cwd: this.baseDir,
        });
        return !!stdout.trim();
      } catch {
        return false;
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a MergerRunner instance
 */
export function createMergerRunner(config: MergerRunnerConfig): MergerRunner {
  return new MergerRunner(config);
}
