/**
 * StateManager - State persistence and recovery
 *
 * Manages the persistence and recovery of Nexus state across sessions.
 * Phase 2 Workflow Fix: Now persists to database for checkpoint support.
 *
 * Layer 6: Persistence - State Management
 *
 * @module persistence/state
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../database/DatabaseClient';
import { projectStates } from '../database/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Project status in the state
 */
export type ProjectStatus =
  | 'initializing'
  | 'interview'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed';

/**
 * Task status in the state
 */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked';

/**
 * State for a single task
 */
export interface TaskState {
  id: string;
  name: string;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  iterations?: number;
}

/**
 * State for a single feature
 */
export interface FeatureState {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tasks: TaskState[];
  completedTasks: number;
  totalTasks: number;
}

/**
 * Complete Nexus state for a project
 */
export interface NexusState {
  /** Project identifier */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Current project status */
  status: ProjectStatus;
  /** Mode (genesis or evolution) */
  mode: 'genesis' | 'evolution';
  /** Features being processed */
  features: FeatureState[];
  /** Current feature index */
  currentFeatureIndex: number;
  /** Current task index within feature */
  currentTaskIndex: number;
  /** Total completed tasks */
  completedTasks: number;
  /** Total tasks across all features */
  totalTasks: number;
  /** When state was last updated */
  lastUpdatedAt: Date;
  /** When project was created */
  createdAt: Date;
  /** Metadata for the state */
  metadata?: Record<string, unknown>;
}

/**
 * Options for StateManager
 */
export interface StateManagerOptions {
  /** Database client for persistence */
  db: DatabaseClient;
  /** Whether to auto-persist state changes */
  autoPersist?: boolean;
}

// ============================================================================
// StateManager Implementation
// ============================================================================

/**
 * Manages Nexus state persistence and recovery
 * Phase 2 Workflow Fix: Added database persistence for checkpoints
 */
export class StateManager {
  private readonly db: DatabaseClient;
  private readonly autoPersist: boolean;
  private states: Map<string, NexusState>;

  constructor(options: StateManagerOptions) {
    this.db = options.db;
    this.autoPersist = options.autoPersist ?? true;
    this.states = new Map();
  }

  /**
   * Load state for a project
   * @param projectId Project to load state for
   * @returns State if found, null otherwise
   */
  loadState(projectId: string): NexusState | null {
    // First check in-memory cache
    const cached = this.states.get(projectId);
    if (cached) {
      return cached;
    }

    // Try to load from database
    try {
      const row = this.db.db
        .select()
        .from(projectStates)
        .where(eq(projectStates.projectId, projectId))
        .get();

      if (row && row.stateData) {
        const state = JSON.parse(row.stateData) as NexusState;
        // Restore Date objects
        state.lastUpdatedAt = new Date(state.lastUpdatedAt);
        state.createdAt = new Date(state.createdAt);
        this.states.set(projectId, state);
        return state;
      }
    } catch (error) {
      console.error('[StateManager] Failed to load state from database:', error);
    }

    // State not found
    return null;
  }

  /**
   * Save state for a project (with database persistence)
   * @param state State to save
   */
  saveState(state: NexusState): void {
    // Update last updated timestamp
    state.lastUpdatedAt = new Date();

    // Store in memory
    this.states.set(state.projectId, state);

    // Persist to database if autoPersist enabled
    if (this.autoPersist) {
      this.persistToDatabase(state);
    }
  }

  /**
   * Persist state to database
   */
  private persistToDatabase(state: NexusState): void {
    try {
      const now = new Date();
      const stateData = JSON.stringify(state);

      // Check if record exists
      const existing = this.db.db
        .select()
        .from(projectStates)
        .where(eq(projectStates.projectId, state.projectId))
        .get();

      if (existing) {
        // Update existing record
        this.db.db
          .update(projectStates)
          .set({
            status: state.status,
            mode: state.mode,
            stateData,
            currentFeatureIndex: state.currentFeatureIndex,
            currentTaskIndex: state.currentTaskIndex,
            completedTasks: state.completedTasks,
            totalTasks: state.totalTasks,
            updatedAt: now,
          })
          .where(eq(projectStates.projectId, state.projectId))
          .run();
      } else {
        // Insert new record
        this.db.db.insert(projectStates).values({
          id: uuidv4(),
          projectId: state.projectId,
          status: state.status,
          mode: state.mode,
          stateData,
          currentFeatureIndex: state.currentFeatureIndex,
          currentTaskIndex: state.currentTaskIndex,
          completedTasks: state.completedTasks,
          totalTasks: state.totalTasks,
          createdAt: now,
          updatedAt: now,
        }).run();
      }

      console.log(`[StateManager] Persisted state for project ${state.projectId}`);
    } catch (error) {
      console.error('[StateManager] Failed to persist state:', error);
    }
  }

  /**
   * Update partial state for a project
   * @param projectId Project to update
   * @param updates Partial state updates
   * @returns Updated state
   */
  updateState(
    projectId: string,
    updates: Partial<NexusState>
  ): NexusState | null {
    const current = this.loadState(projectId);
    if (!current) {
      return null;
    }

    const updated: NexusState = {
      ...current,
      ...updates,
      projectId, // Ensure projectId doesn't change
      lastUpdatedAt: new Date(),
    };

    this.saveState(updated);
    return updated;
  }

  /**
   * Delete state for a project
   * @param projectId Project to delete state for
   */
  deleteState(projectId: string): boolean {
    // Remove from database
    try {
      this.db.db
        .delete(projectStates)
        .where(eq(projectStates.projectId, projectId))
        .run();
    } catch (error) {
      console.error('[StateManager] Failed to delete state from database:', error);
    }

    return this.states.delete(projectId);
  }

  /**
   * Check if state exists for a project
   * @param projectId Project to check
   */
  hasState(projectId: string): boolean {
    return this.states.has(projectId);
  }

  /**
   * Get all project IDs with state
   */
  getAllProjectIds(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Create a new state for a project
   * @param projectId Project identifier
   * @param projectName Human-readable project name
   * @param mode Genesis or evolution mode
   * @returns Created state
   */
  createState(
    projectId: string,
    projectName: string,
    mode: 'genesis' | 'evolution'
  ): NexusState {
    const now = new Date();
    const state: NexusState = {
      projectId,
      projectName,
      status: 'initializing',
      mode,
      features: [],
      currentFeatureIndex: 0,
      currentTaskIndex: 0,
      completedTasks: 0,
      totalTasks: 0,
      lastUpdatedAt: now,
      createdAt: now,
    };

    this.saveState(state);
    return state;
  }

  /**
   * Clear all in-memory state (for testing)
   */
  clearAll(): void {
    this.states.clear();
  }
}
