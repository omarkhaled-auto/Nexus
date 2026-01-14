/**
 * StateManager tests - TDD RED phase
 *
 * Tests for project state persistence using Drizzle ORM.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseClient } from '../database/DatabaseClient';
import {
  StateManager,
  StateError,
  StateNotFoundError,
  StateValidationError,
  type NexusState,
} from './StateManager';

describe('StateManager', () => {
  let db: DatabaseClient;
  let stateManager: StateManager;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseClient.create({
      path: ':memory:',
      migrationsDir: 'src/persistence/database/migrations',
    });
    stateManager = new StateManager({ db });
  });

  afterEach(async () => {
    await db.close();
  });

  // ============================================================================
  // Custom Error Types
  // ============================================================================

  describe('Error Types', () => {
    it('StateError is instance of Error', () => {
      const error = new StateError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StateError);
      expect(error.name).toBe('StateError');
      expect(error.message).toBe('Test error');
    });

    it('StateNotFoundError has projectId property', () => {
      const error = new StateNotFoundError('proj-123');
      expect(error).toBeInstanceOf(StateError);
      expect(error.name).toBe('StateNotFoundError');
      expect(error.projectId).toBe('proj-123');
      expect(error.message).toContain('proj-123');
    });

    it('StateValidationError has errors array property', () => {
      const validationErrors = ['Missing name', 'Invalid status'];
      const error = new StateValidationError(validationErrors);
      expect(error).toBeInstanceOf(StateError);
      expect(error.name).toBe('StateValidationError');
      expect(error.errors).toEqual(validationErrors);
      expect(error.message).toContain('Missing name');
    });
  });

  // ============================================================================
  // State Operations
  // ============================================================================

  describe('saveState', () => {
    it('persists full project state to database', async () => {
      const state = createTestState('proj-1');

      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.projectId).toBe('proj-1');
      expect(loaded!.project.name).toBe('Test Project');
    });

    it('creates project record if not exists', async () => {
      const state = createTestState('new-proj');

      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('new-proj');
      expect(loaded).not.toBeNull();
    });

    it('updates existing project when saving again', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      state.status = 'paused';
      state.project.name = 'Updated Name';
      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).toBe('paused');
      expect(loaded!.project.name).toBe('Updated Name');
    });

    it('saves features atomically in transaction', async () => {
      const state = createTestState('proj-1');
      state.features = [
        createTestFeature('feat-1', 'Feature 1'),
        createTestFeature('feat-2', 'Feature 2'),
      ];

      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.features).toHaveLength(2);
      expect(loaded!.features.map((f) => f.name)).toContain('Feature 1');
    });

    it('saves tasks atomically in transaction', async () => {
      const state = createTestState('proj-1');
      state.tasks = [
        createTestTask('task-1', 'Task 1'),
        createTestTask('task-2', 'Task 2'),
      ];

      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.tasks).toHaveLength(2);
    });

    it('saves agents atomically in transaction', async () => {
      const state = createTestState('proj-1');
      state.agents = [createTestAgent('agent-1', 'coder')];

      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.agents).toHaveLength(1);
      expect(loaded!.agents[0].type).toBe('coder');
    });
  });

  describe('loadState', () => {
    it('returns NexusState when project exists', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');

      expect(loaded).not.toBeNull();
      expect(loaded!.projectId).toBe('proj-1');
    });

    it('returns null when project not found', async () => {
      const loaded = await stateManager.loadState('non-existent');
      expect(loaded).toBeNull();
    });

    it('hydrates full state with features', async () => {
      const state = createTestState('proj-1');
      state.features = [createTestFeature('feat-1', 'Auth Feature')];
      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');

      expect(loaded!.features).toHaveLength(1);
      expect(loaded!.features[0].name).toBe('Auth Feature');
    });

    it('hydrates full state with tasks', async () => {
      const state = createTestState('proj-1');
      state.tasks = [createTestTask('task-1', 'Build login')];
      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');

      expect(loaded!.tasks).toHaveLength(1);
      expect(loaded!.tasks[0].name).toBe('Build login');
    });

    it('hydrates full state with agents', async () => {
      const state = createTestState('proj-1');
      state.agents = [createTestAgent('agent-1', 'planner')];
      await stateManager.saveState(state);

      const loaded = await stateManager.loadState('proj-1');

      expect(loaded!.agents).toHaveLength(1);
    });
  });

  describe('updateState', () => {
    it('applies partial update to existing state', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      await stateManager.updateState('proj-1', { status: 'completed' });

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).toBe('completed');
    });

    it('throws StateNotFoundError if project not found', async () => {
      await expect(
        stateManager.updateState('non-existent', { status: 'paused' })
      ).rejects.toThrow(StateNotFoundError);
    });

    it('updates currentPhase', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      await stateManager.updateState('proj-1', { currentPhase: 'Phase 3' });

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.currentPhase).toBe('Phase 3');
    });

    it('updates lastCheckpointId', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      await stateManager.updateState('proj-1', {
        lastCheckpointId: 'chk-123',
      });

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.lastCheckpointId).toBe('chk-123');
    });
  });

  describe('deleteState', () => {
    it('removes project and all related data', async () => {
      const state = createTestState('proj-1');
      state.features = [createTestFeature('feat-1', 'Feature')];
      state.tasks = [createTestTask('task-1', 'Task')];
      await stateManager.saveState(state);

      await stateManager.deleteState('proj-1');

      const loaded = await stateManager.loadState('proj-1');
      expect(loaded).toBeNull();
    });

    it('cascades delete to features', async () => {
      const state = createTestState('proj-1');
      state.features = [createTestFeature('feat-1', 'Feature')];
      await stateManager.saveState(state);

      await stateManager.deleteState('proj-1');

      // Verify features are also deleted
      const loaded = await stateManager.loadState('proj-1');
      expect(loaded).toBeNull();
    });

    it('does not throw for non-existent project', async () => {
      // Should not throw
      await expect(
        stateManager.deleteState('non-existent')
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Auto-save
  // ============================================================================

  describe('Auto-save', () => {
    it('enableAutoSave starts auto-save timer', async () => {
      vi.useFakeTimers();
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      stateManager.enableAutoSave('proj-1', 1000);

      // Modify state
      state.status = 'executing';
      await stateManager.markDirty('proj-1', state);

      // Advance timer
      await vi.advanceTimersByTimeAsync(1000);

      // Verify state was saved
      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).toBe('executing');

      stateManager.disableAutoSave('proj-1');
      vi.useRealTimers();
    });

    it('disableAutoSave stops auto-save timer', async () => {
      vi.useFakeTimers();
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      stateManager.enableAutoSave('proj-1', 1000);
      stateManager.disableAutoSave('proj-1');

      // Modify state
      state.status = 'failed';
      await stateManager.markDirty('proj-1', state);

      // Advance timer
      await vi.advanceTimersByTimeAsync(1000);

      // State should NOT be saved (timer was disabled)
      const loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).not.toBe('failed');

      vi.useRealTimers();
    });

    it('uses default 30s interval', async () => {
      vi.useFakeTimers();
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      stateManager.enableAutoSave('proj-1');

      // Modify state
      state.status = 'executing';
      await stateManager.markDirty('proj-1', state);

      // Advance less than 30s - should not save
      await vi.advanceTimersByTimeAsync(15000);
      let loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).not.toBe('executing');

      // Advance to 30s - should save
      await vi.advanceTimersByTimeAsync(15000);
      loaded = await stateManager.loadState('proj-1');
      expect(loaded!.status).toBe('executing');

      stateManager.disableAutoSave('proj-1');
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('Constructor', () => {
    it('accepts database client', () => {
      const manager = new StateManager({ db });
      expect(manager).toBeInstanceOf(StateManager);
    });

    it('accepts optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const manager = new StateManager({ db, logger });
      expect(manager).toBeInstanceOf(StateManager);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(projectId: string): NexusState {
  return {
    projectId,
    project: {
      id: projectId,
      name: 'Test Project',
      description: 'A test project',
      mode: 'genesis' as const,
      status: 'planning',
      rootPath: '/test/path',
      repositoryUrl: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    },
    features: [],
    tasks: [],
    agents: [],
    status: 'planning',
    currentPhase: 'Phase 1',
    lastCheckpointId: undefined,
  };
}

function createTestFeature(id: string, name: string) {
  return {
    id,
    projectId: 'proj-1',
    name,
    description: `Description for ${name}`,
    priority: 'should' as const,
    status: 'backlog',
    complexity: 'simple' as const,
    estimatedTasks: 3,
    completedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestTask(id: string, name: string) {
  return {
    id,
    projectId: 'proj-1',
    featureId: null,
    subFeatureId: null,
    name,
    description: `Description for ${name}`,
    type: 'auto' as const,
    status: 'pending',
    size: 'small' as const,
    priority: 5,
    tags: null,
    notes: null,
    assignedAgent: null,
    worktreePath: null,
    branchName: null,
    dependsOn: null,
    blockedBy: null,
    qaIterations: 0,
    maxIterations: 50,
    estimatedMinutes: 15,
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestAgent(id: string, type: 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger') {
  return {
    id,
    type,
    status: 'idle',
    modelProvider: 'anthropic' as const,
    modelName: 'claude-sonnet-4',
    temperature: 0.3,
    maxTokens: 8000,
    systemPrompt: null,
    tools: null,
    currentTaskId: null,
    worktreePath: null,
    branchName: null,
    tokensUsed: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    spawnedAt: new Date(),
    lastActivityAt: new Date(),
    terminatedAt: null,
    terminationReason: null,
  };
}
