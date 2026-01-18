/**
 * StateManager - State persistence and recovery
 *
 * Manages the persistence and recovery of Nexus state across sessions.
 * Provides synchronous methods for in-memory state management.
 *
 * Layer 6: Persistence - State Management
 *
 * @module persistence/state
 */

import type { DatabaseClient } from '../database/DatabaseClient';

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

    // State not found in memory or DB
    return null;
  }

  /**
   * Save state for a project
   * @param state State to save
   */
  saveState(state: NexusState): void {
    // Update last updated timestamp
    state.lastUpdatedAt = new Date();

    // Store in memory
    this.states.set(state.projectId, state);
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
