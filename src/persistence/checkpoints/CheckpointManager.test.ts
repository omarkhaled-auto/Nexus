/**
 * CheckpointManager tests - TDD RED phase
 *
 * Tests for state snapshot creation and recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseClient } from '../database/DatabaseClient';
import { StateManager, type NexusState } from '../state/StateManager';
import { EventBus } from '../../orchestration/events/EventBus';
import { projects } from '../database/schema';
import {
  CheckpointManager,
  CheckpointError,
  CheckpointNotFoundError,
  RestoreError,
  type AutoCheckpointTrigger,
} from './CheckpointManager';

/**
 * Helper to insert a project into the database for foreign key constraints
 */
async function insertTestProject(db: DatabaseClient, projectId: string): Promise<void> {
  const now = new Date();
  db.db.insert(projects).values({
    id: projectId,
    name: 'Test Project',
    description: 'A test project',
    mode: 'genesis',
    status: 'planning',
    rootPath: '/test/path',
    repositoryUrl: null,
    settings: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }).run();
}

// Mock GitService
const mockGitService = {
  status: vi.fn().mockResolvedValue({
    current: 'main',
    staged: [],
    modified: [],
    untracked: [],
    conflicted: [],
    ahead: 0,
    behind: 0,
  }),
  getLog: vi.fn().mockResolvedValue([
    {
      hash: 'abc123def456',
      message: 'Initial commit',
      author: 'Test',
      date: new Date(),
    },
  ]),
  checkoutBranch: vi.fn().mockResolvedValue(undefined),
  isRepository: vi.fn().mockResolvedValue(true),
};

describe('CheckpointManager', () => {
  let db: DatabaseClient;
  let stateManager: StateManager;
  let checkpointManager: CheckpointManager;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = DatabaseClient.create({
      path: ':memory:',
      migrationsDir: 'src/persistence/database/migrations',
    });
    stateManager = new StateManager({ db });
    checkpointManager = new CheckpointManager({
      db,
      stateManager,
      gitService: mockGitService as never,
    });

    // Insert test projects to satisfy foreign key constraints
    await insertTestProject(db, 'proj-1');
    await insertTestProject(db, 'proj-2');

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================================
  // Custom Error Types
  // ============================================================================

  describe('Error Types', () => {
    it('CheckpointError is instance of Error', () => {
      const error = new CheckpointError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CheckpointError);
      expect(error.name).toBe('CheckpointError');
      expect(error.message).toBe('Test error');
    });

    it('CheckpointNotFoundError has checkpointId property', () => {
      const error = new CheckpointNotFoundError('chk-123');
      expect(error).toBeInstanceOf(CheckpointError);
      expect(error.name).toBe('CheckpointNotFoundError');
      expect(error.checkpointId).toBe('chk-123');
      expect(error.message).toContain('chk-123');
    });

    it('RestoreError has checkpointId and reason properties', () => {
      const error = new RestoreError('chk-123', 'Git state corrupted');
      expect(error).toBeInstanceOf(CheckpointError);
      expect(error.name).toBe('RestoreError');
      expect(error.checkpointId).toBe('chk-123');
      expect(error.reason).toBe('Git state corrupted');
      expect(error.message).toContain('chk-123');
      expect(error.message).toContain('Git state corrupted');
    });
  });

  // ============================================================================
  // Checkpoint Operations
  // ============================================================================

  describe('createCheckpoint', () => {
    it('creates checkpoint for existing project', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Before major refactor'
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeTruthy();
      expect(checkpoint.projectId).toBe('proj-1');
      expect(checkpoint.reason).toBe('Before major refactor');
    });

    it('captures current git commit hash', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      mockGitService.getLog.mockResolvedValueOnce([
        {
          hash: 'specific-commit-hash',
          message: 'Test commit',
          author: 'Test',
          date: new Date(),
        },
      ]);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );

      expect(checkpoint.gitCommit).toBe('specific-commit-hash');
    });

    it('serializes full state to JSON', async () => {
      const state = createTestState('proj-1');
      state.features = [createTestFeature('feat-1', 'Auth')];
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );

      expect(checkpoint.state).toBeTruthy();
      const parsed = JSON.parse(checkpoint.state);
      expect(parsed.projectId).toBe('proj-1');
      expect(parsed.features).toHaveLength(1);
    });

    it('returns Checkpoint with id and timestamp', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const before = new Date();
      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );
      const after = new Date();

      expect(checkpoint.id).toBeTruthy();
      expect(checkpoint.createdAt).toBeDefined();
      expect(checkpoint.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(checkpoint.createdAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });

    it('throws if project does not exist', async () => {
      await expect(
        checkpointManager.createCheckpoint('non-existent', 'Test')
      ).rejects.toThrow(CheckpointError);
    });
  });

  describe('restoreCheckpoint', () => {
    it('restores state from checkpoint', async () => {
      const state = createTestState('proj-1');
      state.status = 'planning';
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Saved state'
      );

      // Modify state
      await stateManager.updateState('proj-1', { status: 'failed' });

      // Restore
      await checkpointManager.restoreCheckpoint(checkpoint.id);

      const restored = await stateManager.loadState('proj-1');
      expect(restored!.status).toBe('planning');
    });

    it('throws CheckpointNotFoundError for invalid id', async () => {
      await expect(
        checkpointManager.restoreCheckpoint('non-existent')
      ).rejects.toThrow(CheckpointNotFoundError);
    });

    it('optionally restores git state', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      mockGitService.getLog.mockResolvedValueOnce([
        {
          hash: 'saved-commit',
          message: 'Saved',
          author: 'Test',
          date: new Date(),
        },
      ]);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );

      await checkpointManager.restoreCheckpoint(checkpoint.id, {
        restoreGit: true,
      });

      // Git checkout should have been called with the commit
      expect(mockGitService.checkoutBranch).toHaveBeenCalled();
    });

    it('does not restore git by default', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );

      await checkpointManager.restoreCheckpoint(checkpoint.id);

      expect(mockGitService.checkoutBranch).not.toHaveBeenCalled();
    });
  });

  describe('listCheckpoints', () => {
    it('returns checkpoints ordered by date desc', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      // Create multiple checkpoints with delay to ensure different timestamps
      // SQLite timestamp mode has second precision, so we need 1s+ delays
      const chk1 = await checkpointManager.createCheckpoint('proj-1', 'First');
      await new Promise((r) => setTimeout(r, 1100)); // 1.1s delay for timestamp difference
      const chk2 = await checkpointManager.createCheckpoint('proj-1', 'Second');
      await new Promise((r) => setTimeout(r, 1100));
      const chk3 = await checkpointManager.createCheckpoint('proj-1', 'Third');

      const checkpoints = await checkpointManager.listCheckpoints('proj-1');

      expect(checkpoints).toHaveLength(3);
      // Should be descending order (newest first)
      expect(checkpoints[0].id).toBe(chk3.id);
      expect(checkpoints[1].id).toBe(chk2.id);
      expect(checkpoints[2].id).toBe(chk1.id);
    });

    it('returns empty array for project with no checkpoints', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoints = await checkpointManager.listCheckpoints('proj-1');

      expect(checkpoints).toEqual([]);
    });

    it('only returns checkpoints for specified project', async () => {
      const state1 = createTestState('proj-1');
      const state2 = createTestState('proj-2');
      await stateManager.saveState(state1);
      await stateManager.saveState(state2);

      await checkpointManager.createCheckpoint('proj-1', 'P1 checkpoint');
      await checkpointManager.createCheckpoint('proj-2', 'P2 checkpoint');
      await checkpointManager.createCheckpoint('proj-1', 'P1 checkpoint 2');

      const proj1Checkpoints =
        await checkpointManager.listCheckpoints('proj-1');
      const proj2Checkpoints =
        await checkpointManager.listCheckpoints('proj-2');

      expect(proj1Checkpoints).toHaveLength(2);
      expect(proj2Checkpoints).toHaveLength(1);
    });
  });

  describe('deleteCheckpoint', () => {
    it('removes checkpoint', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-1',
        'Test'
      );
      await checkpointManager.deleteCheckpoint(checkpoint.id);

      const checkpoints = await checkpointManager.listCheckpoints('proj-1');
      expect(checkpoints).toHaveLength(0);
    });

    it('does not throw for non-existent checkpoint', () => {
      expect(() => checkpointManager.deleteCheckpoint('non-existent')).not.toThrow();
    });
  });

  // ============================================================================
  // Automatic Checkpoints
  // ============================================================================

  describe('Automatic Checkpoints', () => {
    it('createAutoCheckpoint creates checkpoint with trigger reason', async () => {
      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await checkpointManager.createAutoCheckpoint(
        'proj-1',
        'phase_complete'
      );

      expect(checkpoint.reason).toContain('phase_complete');
    });

    it.each([
      'phase_complete',
      'task_failed',
      'qa_exhausted',
      'human_request',
    ] as AutoCheckpointTrigger[])(
      'supports trigger type: %s',
      async (trigger) => {
        const state = createTestState('proj-1');
        await stateManager.saveState(state);

        const checkpoint = await checkpointManager.createAutoCheckpoint(
          'proj-1',
          trigger
        );

        expect(checkpoint.reason).toContain(trigger);
      }
    );
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('Constructor', () => {
    it('accepts database client, StateManager, and GitService', () => {
      const manager = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
      });
      expect(manager).toBeInstanceOf(CheckpointManager);
    });

    it('accepts optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const manager = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        logger,
      });
      expect(manager).toBeInstanceOf(CheckpointManager);
    });

    it('accepts optional eventBus and maxCheckpoints', () => {
      EventBus.resetInstance();
      const eventBus = EventBus.getInstance();
      const manager = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        eventBus,
        maxCheckpoints: 10,
      });
      expect(manager).toBeInstanceOf(CheckpointManager);
    });
  });

  // ============================================================================
  // Pruning
  // ============================================================================

  describe('pruneOldCheckpoints', () => {
    it('removes oldest checkpoints when over limit', async () => {
      // Create manager with maxCheckpoints = 3
      const managerWithLimit = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        maxCheckpoints: 3,
      });

      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      // Create 5 checkpoints (2 more than limit)
      for (let i = 1; i <= 5; i++) {
        await managerWithLimit.createCheckpoint('proj-1', `Checkpoint ${i}`);
        // Small delay to ensure different timestamps
        await new Promise((r) => setTimeout(r, 50));
      }

      // Should have exactly maxCheckpoints remaining
      const remaining = managerWithLimit.listCheckpoints('proj-1');
      expect(remaining).toHaveLength(3);
    });

    it('does nothing when under limit', async () => {
      // Create manager with maxCheckpoints = 10
      const managerWithLimit = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        maxCheckpoints: 10,
      });

      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      // Create 3 checkpoints (well under limit)
      await managerWithLimit.createCheckpoint('proj-1', 'Checkpoint 1');
      await managerWithLimit.createCheckpoint('proj-1', 'Checkpoint 2');
      await managerWithLimit.createCheckpoint('proj-1', 'Checkpoint 3');

      const result = managerWithLimit.pruneOldCheckpoints('proj-1');
      expect(result).toBe(0);

      const remaining = managerWithLimit.listCheckpoints('proj-1');
      expect(remaining).toHaveLength(3);
    });
  });

  // ============================================================================
  // EventBus Integration
  // ============================================================================

  describe('EventBus Integration', () => {
    let eventBus: EventBus;
    let managerWithEventBus: CheckpointManager;

    beforeEach(() => {
      EventBus.resetInstance();
      eventBus = EventBus.getInstance();
      managerWithEventBus = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        eventBus,
      });
    });

    it('createCheckpoint emits event when eventBus provided', async () => {
      const handler = vi.fn();
      eventBus.on('system:checkpoint-created', handler);

      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await managerWithEventBus.createCheckpoint(
        'proj-1',
        'Test checkpoint'
      );

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('system:checkpoint-created');
      expect(event.payload.checkpointId).toBe(checkpoint.id);
      expect(event.payload.projectId).toBe('proj-1');
      expect(event.payload.reason).toBe('Test checkpoint');
    });

    it('restoreCheckpoint emits event when eventBus provided', async () => {
      const handler = vi.fn();
      eventBus.on('system:checkpoint-restored', handler);

      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      const checkpoint = await managerWithEventBus.createCheckpoint(
        'proj-1',
        'Test checkpoint'
      );

      // Clear the handler to ignore the create event
      handler.mockClear();

      await managerWithEventBus.restoreCheckpoint(checkpoint.id);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('system:checkpoint-restored');
      expect(event.payload.checkpointId).toBe(checkpoint.id);
      expect(event.payload.projectId).toBe('proj-1');
    });

    it('createCheckpoint auto-prunes after insert', async () => {
      // Create manager with maxCheckpoints = 2
      const managerWithSmallLimit = new CheckpointManager({
        db,
        stateManager,
        gitService: mockGitService as never,
        eventBus,
        maxCheckpoints: 2,
      });

      const state = createTestState('proj-1');
      await stateManager.saveState(state);

      // Create 3 checkpoints
      await managerWithSmallLimit.createCheckpoint('proj-1', 'Checkpoint 1');
      await new Promise((r) => setTimeout(r, 50));
      await managerWithSmallLimit.createCheckpoint('proj-1', 'Checkpoint 2');
      await new Promise((r) => setTimeout(r, 50));
      await managerWithSmallLimit.createCheckpoint('proj-1', 'Checkpoint 3');

      // Should have pruned to maxCheckpoints
      const remaining = managerWithSmallLimit.listCheckpoints('proj-1');
      expect(remaining).toHaveLength(2);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(projectId: string): NexusState {
  const now = new Date();
  return {
    projectId,
    projectName: 'Test Project',
    status: 'planning',
    mode: 'genesis' as const,
    features: [],
    currentFeatureIndex: 0,
    currentTaskIndex: 0,
    completedTasks: 0,
    totalTasks: 0,
    lastUpdatedAt: now,
    createdAt: now,
  };
}

function createTestFeature(id: string, name: string) {
  return {
    id,
    name,
    description: `Description for ${name}`,
    status: 'pending' as const,
    tasks: [],
    completedTasks: 0,
    totalTasks: 3,
  };
}
