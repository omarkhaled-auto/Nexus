/**
 * CheckpointManager - State snapshot creation and recovery
 *
 * Creates checkpoints for state recovery and supports automatic
 * checkpoint creation based on system events.
 */

import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database/DatabaseClient';
import type { StateManager, NexusState } from '../state/StateManager';
import type { GitService } from '../../infrastructure/git/GitService';
import {
  checkpoints,
  type Checkpoint,
  type NewCheckpoint,
} from '../database/schema';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for checkpoint operations
 */
export class CheckpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckpointError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a checkpoint is not found
 */
export class CheckpointNotFoundError extends CheckpointError {
  public readonly checkpointId: string;

  constructor(checkpointId: string) {
    super(`Checkpoint not found: ${checkpointId}`);
    this.name = 'CheckpointNotFoundError';
    this.checkpointId = checkpointId;
  }
}

/**
 * Error thrown when restore operation fails
 */
export class RestoreError extends CheckpointError {
  public readonly checkpointId: string;
  public readonly reason: string;

  constructor(checkpointId: string, reason: string) {
    super(`Failed to restore checkpoint ${checkpointId}: ${reason}`);
    this.name = 'RestoreError';
    this.checkpointId = checkpointId;
    this.reason = reason;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Triggers for automatic checkpoint creation
 */
export type AutoCheckpointTrigger =
  | 'phase_complete'
  | 'task_failed'
  | 'qa_exhausted'
  | 'human_request';

/**
 * Options for restoring a checkpoint
 */
export interface RestoreOptions {
  /** Whether to also restore git state (checkout commit) */
  restoreGit?: boolean;
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
 * CheckpointManager constructor options
 */
export interface CheckpointManagerOptions {
  db: DatabaseClient;
  stateManager: StateManager;
  gitService: GitService;
  logger?: Logger;
}

// ============================================================================
// CheckpointManager Implementation
// ============================================================================

/**
 * CheckpointManager handles state snapshots for recovery.
 *
 * Features:
 * - Create checkpoints with full state serialization
 * - Capture git commit hash for code state
 * - Restore state from checkpoint
 * - Automatic checkpoints on system events
 */
export class CheckpointManager {
  private readonly db: DatabaseClient;
  private readonly stateManager: StateManager;
  private readonly gitService: GitService;
  private readonly logger?: Logger;

  constructor(options: CheckpointManagerOptions) {
    this.db = options.db;
    this.stateManager = options.stateManager;
    this.gitService = options.gitService;
    this.logger = options.logger;
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
   * Create a checkpoint for a project.
   * @param projectId Project to checkpoint
   * @param reason Human-readable reason for checkpoint
   * @returns Created checkpoint with id and timestamp
   */
  async createCheckpoint(
    projectId: string,
    reason: string
  ): Promise<Checkpoint & { state: string }> {
    this.log('debug', `Creating checkpoint for project ${projectId}: ${reason}`);

    // Load current state
    const state = this.stateManager.loadState(projectId);
    if (!state) {
      throw new CheckpointError(`Project not found: ${projectId}`);
    }

    // Get current git commit
    let gitCommit: string | null = null;
    try {
      const log = await this.gitService.getLog(1);
      if (log.length > 0 && log[0]) {
        gitCommit = log[0].hash;
      }
    } catch {
      // Git might not be available, continue without commit hash
      this.log('warn', 'Could not get git commit hash');
    }

    // Serialize state to JSON
    const stateJson = JSON.stringify(state);

    // Create checkpoint record
    const checkpointId = uuidv4();
    const now = new Date();

    const newCheckpoint: NewCheckpoint = {
      id: checkpointId,
      projectId,
      name: `Checkpoint: ${reason}`,
      reason,
      state: stateJson,
      gitCommit,
      createdAt: now,
    };

    this.db.db.insert(checkpoints).values(newCheckpoint).run();

    return {
      id: checkpointId,
      projectId,
      name: `Checkpoint: ${reason}`,
      reason,
      state: stateJson,
      gitCommit,
      createdAt: now,
    };
  }

  /**
   * Restore state from a checkpoint.
   * @param checkpointId Checkpoint to restore
   * @param options Restore options (e.g., restore git state)
   * @throws CheckpointNotFoundError if checkpoint doesn't exist
   */
  async restoreCheckpoint(
    checkpointId: string,
    options?: RestoreOptions
  ): Promise<void> {
    this.log('debug', `Restoring checkpoint ${checkpointId}`);

    // Load checkpoint
    const checkpoint = this.db.db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.id, checkpointId))
      .get();

    if (!checkpoint) {
      throw new CheckpointNotFoundError(checkpointId);
    }

    // Parse state from checkpoint
    if (!checkpoint.state) {
      throw new RestoreError(checkpointId, 'Checkpoint has no state data');
    }

    let state: NexusState;
    try {
      state = JSON.parse(checkpoint.state) as NexusState;
    } catch {
      throw new RestoreError(checkpointId, 'Invalid state data');
    }

    // Restore state
    this.stateManager.saveState(state);

    // Optionally restore git state
    if (options?.restoreGit && checkpoint.gitCommit) {
      try {
        // Use git reset or checkout to restore to commit
        // Note: This is a simplified implementation
        await this.gitService.checkoutBranch(checkpoint.gitCommit);
      } catch (err) {
        this.log(
          'warn',
          `Could not restore git state: ${(err as Error).message}`
        );
        // Don't throw - state was restored, git restore is optional
      }
    }
  }

  /**
   * List all checkpoints for a project.
   * @param projectId Project to list checkpoints for
   * @returns Checkpoints ordered by date descending
   */
  listCheckpoints(projectId: string): Checkpoint[] {
    this.log('debug', `Listing checkpoints for project ${projectId}`);

    const result = this.db.db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.projectId, projectId))
      .orderBy(desc(checkpoints.createdAt))
      .all();

    return result;
  }

  /**
   * Delete a checkpoint.
   * @param checkpointId Checkpoint to delete
   */
  deleteCheckpoint(checkpointId: string): void {
    this.log('debug', `Deleting checkpoint ${checkpointId}`);

    this.db.db
      .delete(checkpoints)
      .where(eq(checkpoints.id, checkpointId))
      .run();
  }

  /**
   * Create automatic checkpoint based on system event.
   * @param projectId Project to checkpoint
   * @param trigger System event that triggered checkpoint
   */
  async createAutoCheckpoint(
    projectId: string,
    trigger: AutoCheckpointTrigger
  ): Promise<Checkpoint & { state: string }> {
    const reason = `Auto-checkpoint: ${trigger}`;
    return this.createCheckpoint(projectId, reason);
  }
}
