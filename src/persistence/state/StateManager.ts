/**
 * StateManager - Project state persistence using Drizzle ORM
 *
 * Manages saving and loading project state to/from SQLite database.
 * Supports auto-save functionality and atomic transactions.
 */

import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../database/DatabaseClient';
import {
  projects,
  features,
  tasks,
  agents,
  type Project,
  type Feature,
  type Task,
  type Agent,
  type NewProject,
  type NewFeature,
  type NewTask,
  type NewAgent,
} from '../database/schema';

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
  saveState(state: NexusState): void {
    this.log('debug', `Saving state for project ${state.projectId}`);

    const db = this.db.db;

    // Wrap in transaction for atomicity
    this.db.transaction(() => {
      const now = new Date();

      // Check if project exists
      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, state.projectId))
        .get();

      // Build settings JSON with currentPhase and lastCheckpointId
      const existingSettings = state.project.settings
        ? (JSON.parse(state.project.settings) as Record<string, unknown>)
        : {};
      const settings = {
        ...existingSettings,
        currentPhase: state.currentPhase,
        lastCheckpointId: state.lastCheckpointId,
      };
      const settingsJson = JSON.stringify(settings);

      if (existing) {
        // Update existing project
        db.update(projects)
          .set({
            name: state.project.name,
            description: state.project.description,
            mode: state.project.mode,
            status: state.status,
            rootPath: state.project.rootPath,
            repositoryUrl: state.project.repositoryUrl,
            settings: settingsJson,
            updatedAt: now,
            completedAt: state.project.completedAt,
          })
          .where(eq(projects.id, state.projectId))
          .run();
      } else {
        // Insert new project
        const newProject: NewProject = {
          id: state.projectId,
          name: state.project.name,
          description: state.project.description,
          mode: state.project.mode,
          status: state.status,
          rootPath: state.project.rootPath,
          repositoryUrl: state.project.repositoryUrl,
          settings: settingsJson,
          createdAt: state.project.createdAt,
          updatedAt: now,
          completedAt: state.project.completedAt,
        };
        db.insert(projects).values(newProject).run();
      }

      // Delete existing features for this project and re-insert
      db.delete(features).where(eq(features.projectId, state.projectId)).run();
      if (state.features.length > 0) {
        const featureRecords: NewFeature[] = state.features.map((f) => ({
          id: f.id,
          projectId: state.projectId,
          name: f.name,
          description: f.description,
          priority: f.priority,
          status: f.status,
          complexity: f.complexity,
          estimatedTasks: f.estimatedTasks,
          completedTasks: f.completedTasks,
          createdAt: f.createdAt,
          updatedAt: now,
        }));
        db.insert(features).values(featureRecords).run();
      }

      // Delete existing tasks for this project and re-insert
      db.delete(tasks).where(eq(tasks.projectId, state.projectId)).run();
      if (state.tasks.length > 0) {
        const taskRecords: NewTask[] = state.tasks.map((t) => ({
          id: t.id,
          projectId: state.projectId,
          featureId: t.featureId,
          subFeatureId: t.subFeatureId,
          name: t.name,
          description: t.description,
          type: t.type,
          status: t.status,
          size: t.size,
          priority: t.priority,
          tags: t.tags,
          notes: t.notes,
          assignedAgent: t.assignedAgent,
          worktreePath: t.worktreePath,
          branchName: t.branchName,
          dependsOn: t.dependsOn,
          blockedBy: t.blockedBy,
          qaIterations: t.qaIterations,
          maxIterations: t.maxIterations,
          estimatedMinutes: t.estimatedMinutes,
          actualMinutes: t.actualMinutes,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
          createdAt: t.createdAt,
          updatedAt: now,
        }));
        db.insert(tasks).values(taskRecords).run();
      }

      // Delete existing agents and re-insert
      // Note: agents are not project-scoped in schema, but we handle by ID
      for (const agent of state.agents) {
        db.delete(agents).where(eq(agents.id, agent.id)).run();
      }
      if (state.agents.length > 0) {
        const agentRecords: NewAgent[] = state.agents.map((a) => ({
          id: a.id,
          type: a.type,
          status: a.status,
          modelProvider: a.modelProvider,
          modelName: a.modelName,
          temperature: a.temperature,
          maxTokens: a.maxTokens,
          systemPrompt: a.systemPrompt,
          tools: a.tools,
          currentTaskId: a.currentTaskId,
          worktreePath: a.worktreePath,
          branchName: a.branchName,
          tokensUsed: a.tokensUsed,
          tasksCompleted: a.tasksCompleted,
          tasksFailed: a.tasksFailed,
          spawnedAt: a.spawnedAt,
          lastActivityAt: a.lastActivityAt,
          terminatedAt: a.terminatedAt,
          terminationReason: a.terminationReason,
        }));
        db.insert(agents).values(agentRecords).run();
      }
    });
  }

  /**
   * Load project state from database.
   * Returns null if project not found.
   */
  loadState(projectId: string): NexusState | null {
    this.log('debug', `Loading state for project ${projectId}`);

    const db = this.db.db;

    // Load project
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      return null;
    }

    // Load related entities
    const projectFeatures = db
      .select()
      .from(features)
      .where(eq(features.projectId, projectId))
      .all();

    const projectTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .all();

    // Load agents - get all for now (agents aren't directly project-scoped)
    // In a real implementation, we might track which agents are assigned to a project
    const projectAgents = db.select().from(agents).all();

    // Parse settings to get currentPhase and lastCheckpointId
    let currentPhase: string | undefined;
    let lastCheckpointId: string | undefined;
    if (project.settings) {
      try {
        const settings = JSON.parse(project.settings) as Record<string, unknown>;
        currentPhase = typeof settings.currentPhase === 'string' ? settings.currentPhase : undefined;
        lastCheckpointId = typeof settings.lastCheckpointId === 'string' ? settings.lastCheckpointId : undefined;
      } catch {
        // Ignore parse errors
      }
    }

    return {
      projectId,
      project,
      features: projectFeatures,
      tasks: projectTasks,
      agents: projectAgents,
      status: project.status as NexusState['status'],
      currentPhase,
      lastCheckpointId,
    };
  }

  /**
   * Apply partial update to existing project state.
   * @throws StateNotFoundError if project not found
   */
  updateState(
    projectId: string,
    update: Partial<Pick<NexusState, 'status' | 'currentPhase' | 'lastCheckpointId'>>
  ): void {
    this.log('debug', `Updating state for project ${projectId}`, update);

    const db = this.db.db;

    // Check if project exists
    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!existing) {
      throw new StateNotFoundError(projectId);
    }

    // Build update object
    const updates: Partial<Project> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (update.status !== undefined) {
      updates.status = update.status;
    }

    // currentPhase and lastCheckpointId could be stored in settings JSON
    // For now, we store them as part of the project record if schema supports
    // Since schema doesn't have these fields directly, we'd need to use settings
    // For simplicity in this implementation, we'll extend the status field behavior

    // For currentPhase and lastCheckpointId, update settings JSON
    if (update.currentPhase !== undefined || update.lastCheckpointId !== undefined) {
      // Parse existing settings
      let settings: Record<string, unknown> = {};
      if (existing.settings) {
        try {
          settings = JSON.parse(existing.settings) as Record<string, unknown>;
        } catch {
          // Ignore parse errors
        }
      }

      // Update settings
      if (update.currentPhase !== undefined) {
        settings.currentPhase = update.currentPhase;
      }
      if (update.lastCheckpointId !== undefined) {
        settings.lastCheckpointId = update.lastCheckpointId;
      }

      updates.settings = JSON.stringify(settings);
    }

    db.update(projects).set(updates).where(eq(projects.id, projectId)).run();
  }

  /**
   * Delete project state and all related data.
   * Cascades to features, tasks, etc.
   */
  deleteState(projectId: string): void {
    this.log('debug', `Deleting state for project ${projectId}`);

    const db = this.db.db;

    // Foreign keys with cascade should handle related data
    // But we explicitly delete in order to be safe
    this.db.transaction(() => {
      db.delete(tasks).where(eq(tasks.projectId, projectId)).run();
      db.delete(features).where(eq(features.projectId, projectId)).run();
      db.delete(projects).where(eq(projects.id, projectId)).run();
    });

    // Clean up auto-save
    this.disableAutoSave(projectId);
    this.dirtyStates.delete(projectId);
  }

  /**
   * Enable auto-save for a project.
   * @param intervalMs Interval in milliseconds (default: 30000 = 30s)
   */
  enableAutoSave(projectId: string, intervalMs: number = 30000): void {
    this.log('debug', `Enabling auto-save for ${projectId} (${String(intervalMs)}ms)`);

    // Clear existing timer if any
    this.disableAutoSave(projectId);

    const timer = setInterval(() => {
      const dirtyState = this.dirtyStates.get(projectId);
      if (dirtyState) {
        this.log('debug', `Auto-saving state for ${projectId}`);
        this.saveState(dirtyState);
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
  markDirty(projectId: string, state: NexusState): void {
    this.dirtyStates.set(projectId, state);
  }
}
