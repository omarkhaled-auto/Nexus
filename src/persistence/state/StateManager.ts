/**
 * StateManager - Project state persistence using Drizzle ORM
 *
 * Manages saving and loading project state to/from SQLite database.
 * Supports auto-save functionality and atomic transactions.
 */

import type { DatabaseClient } from '../database/DatabaseClient';
import type { Project, Feature, Task, Agent } from '../database/schema';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for state operations
 */
export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a project state is not found
 */
export class StateNotFoundError extends StateError {
  public readonly projectId: string;

  constructor(projectId: string) {
    super(`State not found for project: ${projectId}`);
    this.name = 'StateNotFoundError';
    this.projectId = projectId;
  }
}

/**
 * Error thrown when state validation fails
 */
export class StateValidationError extends StateError {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`State validation failed: ${errors.join(', ')}`);
    this.name = 'StateValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Full project state including all related entities
 */
export interface NexusState {
  projectId: string;
  project: Project;
  features: Feature[];
  tasks: Task[];
  agents: Agent[];
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  currentPhase?: string;
  lastCheckpointId?: string;
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
 * StateManager constructor options
 */
export interface StateManagerOptions {
  db: DatabaseClient;
  logger?: Logger;
}

// ============================================================================
// StateManager Implementation
// ============================================================================

/**
 * StateManager handles project state persistence.
 *
 * Features:
 * - Save/load full project state
 * - Atomic transactions for related entities
 * - Auto-save with configurable interval
 * - Partial state updates
 */
export class StateManager {
  private readonly db: DatabaseClient;
  private readonly logger?: Logger;
  private readonly autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly dirtyStates: Map<string, NexusState> = new Map();

  constructor(options: StateManagerOptions) {
    this.db = options.db;
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
   * Save full project state to database.
   * Creates project if not exists, updates if exists.
   * All operations are wrapped in a transaction.
   */
  async saveState(_state: NexusState): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Load project state from database.
   * Returns null if project not found.
   */
  async loadState(_projectId: string): Promise<NexusState | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Apply partial update to existing project state.
   * @throws StateNotFoundError if project not found
   */
  async updateState(
    _projectId: string,
    _update: Partial<Pick<NexusState, 'status' | 'currentPhase' | 'lastCheckpointId'>>
  ): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Delete project state and all related data.
   * Cascades to features, tasks, etc.
   */
  async deleteState(_projectId: string): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Enable auto-save for a project.
   * @param intervalMs Interval in milliseconds (default: 30000 = 30s)
   */
  enableAutoSave(projectId: string, intervalMs: number = 30000): void {
    this.log('debug', `Enabling auto-save for ${projectId} (${intervalMs}ms)`);

    // Clear existing timer if any
    this.disableAutoSave(projectId);

    const timer = setInterval(async () => {
      const dirtyState = this.dirtyStates.get(projectId);
      if (dirtyState) {
        this.log('debug', `Auto-saving state for ${projectId}`);
        await this.saveState(dirtyState);
        this.dirtyStates.delete(projectId);
      }
    }, intervalMs);

    this.autoSaveTimers.set(projectId, timer);
  }

  /**
   * Disable auto-save for a project.
   */
  disableAutoSave(projectId: string): void {
    this.log('debug', `Disabling auto-save for ${projectId}`);
    const timer = this.autoSaveTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(projectId);
    }
  }

  /**
   * Mark state as dirty for auto-save.
   */
  async markDirty(projectId: string, state: NexusState): Promise<void> {
    this.dirtyStates.set(projectId, state);
  }
}
