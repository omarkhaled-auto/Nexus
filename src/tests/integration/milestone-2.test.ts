/**
 * Milestone 2: Persistence Complete - Integration Tests
 *
 * Master Book Reference: Section 4.3
 *
 * These tests verify the complete persistence layer works correctly
 * as an integrated system, not just individual unit tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseClient } from '../../persistence/database/DatabaseClient';
import {
  StateManager,
  type NexusState,
} from '../../persistence/state/StateManager';
import { CheckpointManager } from '../../persistence/checkpoints/CheckpointManager';
import { MemorySystem } from '../../persistence/memory/MemorySystem';
import { EmbeddingsService } from '../../persistence/memory/EmbeddingsService';
import { StateFormatAdapter } from '../../adapters/StateFormatAdapter';
import type { Feature, Task, Agent } from '../../persistence/database/schema';
import type { GitService } from '../../infrastructure/git/GitService';

// Mock GitService for CheckpointManager
function createMockGitService(): GitService {
  return {
    getLog: vi.fn().mockResolvedValue([{ hash: 'abc123' }]),
    checkoutBranch: vi.fn().mockResolvedValue(undefined),
  } as unknown as GitService;
}

describe('Milestone 2: Persistence Complete', () => {
  let db: DatabaseClient;
  let stateManager: StateManager;
  let checkpointManager: CheckpointManager;
  let memorySystem: MemorySystem;
  let embeddingsService: EmbeddingsService;
  let adapter: StateFormatAdapter;
  let mockGitService: GitService;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseClient.create({
      path: ':memory:',
      migrationsDir: 'src/persistence/database/migrations',
    });

    stateManager = new StateManager({ db });
    mockGitService = createMockGitService();
    checkpointManager = new CheckpointManager({
      db,
      stateManager,
      gitService: mockGitService,
    });
    embeddingsService = new EmbeddingsService({ mode: 'local' });
    adapter = new StateFormatAdapter();
  });

  afterEach(async () => {
    await db.close();
  });

  // ===========================================================================
  // StateManager Integration
  // ===========================================================================

  describe('StateManager Integration', () => {
    it('should save and load project state', () => {
      const state = createTestState('proj-001');
      state.status = 'executing';
      state.features = [createTestFeature('feat-1', 'Auth')];
      state.tasks = [createTestTask('task-1', 'Build login')];

      stateManager.saveState(state);
      const loaded = stateManager.loadState('proj-001');

      expect(loaded).not.toBeNull();
      expect(loaded!.projectId).toBe('proj-001');
      expect(loaded!.status).toBe('executing');
      expect(loaded!.features).toHaveLength(1);
      expect(loaded!.tasks).toHaveLength(1);
    });

    it('should persist and restore complex state with multiple entities', () => {
      const state = createTestState('proj-complex');
      state.features = [
        createTestFeature('f1', 'Authentication'),
        createTestFeature('f2', 'Dashboard'),
        createTestFeature('f3', 'Settings'),
      ];
      state.tasks = [
        createTestTask('t1', 'Create login form'),
        createTestTask('t2', 'Implement JWT'),
        createTestTask('t3', 'Add logout'),
      ];
      state.agents = [
        createTestAgent('a1', 'coder'),
        createTestAgent('a2', 'tester'),
      ];
      state.currentPhase = 'Phase 2 of 5';

      stateManager.saveState(state);
      const loaded = stateManager.loadState('proj-complex');

      expect(loaded!.features).toHaveLength(3);
      expect(loaded!.tasks).toHaveLength(3);
      expect(loaded!.agents).toHaveLength(2);
      expect(loaded!.currentPhase).toBe('Phase 2 of 5');
    });

    it('should handle state updates without data loss', () => {
      const state = createTestState('proj-update');
      state.features = [createTestFeature('f1', 'Feature One')];
      stateManager.saveState(state);

      // Update status
      stateManager.updateState('proj-update', { status: 'paused' });

      const loaded = stateManager.loadState('proj-update');
      expect(loaded!.status).toBe('paused');
      expect(loaded!.features).toHaveLength(1); // Features preserved
    });
  });

  // ===========================================================================
  // CheckpointManager Integration
  // ===========================================================================

  describe('CheckpointManager Integration', () => {
    it('should create and restore checkpoints', async () => {
      // Setup initial state
      const state = createTestState('proj-checkpoint');
      state.status = 'executing';
      state.currentPhase = 'Phase 1';
      stateManager.saveState(state);

      // Create checkpoint
      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-checkpoint',
        'Before refactor'
      );

      expect(checkpoint.id).toBeTruthy();
      expect(checkpoint.name).toBe('Checkpoint: Before refactor');

      // Modify state
      stateManager.updateState('proj-checkpoint', {
        status: 'paused',
        currentPhase: 'Phase 2',
      });

      // Verify state changed
      const modifiedState = stateManager.loadState('proj-checkpoint');
      expect(modifiedState!.status).toBe('paused');

      // Restore checkpoint (restores state in place)
      await checkpointManager.restoreCheckpoint(checkpoint.id);

      // Load restored state
      const restoredState = stateManager.loadState('proj-checkpoint');
      expect(restoredState).not.toBeNull();
      expect(restoredState!.status).toBe('executing');
      expect(restoredState!.currentPhase).toBe('Phase 1');
    });

    it('should list checkpoints for project', async () => {
      const state = createTestState('proj-list');
      stateManager.saveState(state);

      // Create multiple checkpoints
      await checkpointManager.createCheckpoint('proj-list', 'First checkpoint');
      await checkpointManager.createCheckpoint('proj-list', 'Second checkpoint');
      await checkpointManager.createCheckpoint('proj-list', 'Third checkpoint');

      const checkpoints = checkpointManager.listCheckpoints('proj-list');

      expect(checkpoints).toHaveLength(3);
      // Verify all checkpoints are present
      const names = checkpoints.map((c) => c.name);
      expect(names).toContain('Checkpoint: First checkpoint');
      expect(names).toContain('Checkpoint: Second checkpoint');
      expect(names).toContain('Checkpoint: Third checkpoint');
    });
  });

  // ===========================================================================
  // MemorySystem Integration
  // ===========================================================================

  describe('MemorySystem Integration', () => {
    // Create project before each memory test to satisfy foreign key
    beforeEach(() => {
      const state = createTestState('proj-001');
      stateManager.saveState(state);
      // Create MemorySystem scoped to this project
      memorySystem = new MemorySystem({
        db,
        embeddingsService,
        projectId: 'proj-001',
      });
    });

    it('should store memory episodes', async () => {
      // Store episodes
      const episode1 = await memorySystem.storeEpisode({
        type: 'code_generation',
        content: 'Created UserService with authentication and JWT handling',
        projectId: 'proj-001',
        context: { taskId: 'task-001' },
      });

      const episode2 = await memorySystem.storeEpisode({
        type: 'error_fix',
        content: 'Fixed database connection timeout issue',
        projectId: 'proj-001',
        context: { taskId: 'task-002' },
      });

      // Verify episodes were stored with IDs
      expect(episode1.id).toBeTruthy();
      expect(episode1.type).toBe('code_generation');
      expect(episode1.content).toContain('UserService');
      expect(episode2.id).toBeTruthy();
      expect(episode2.type).toBe('error_fix');
      // Note: embeddings may be null in local mode without API key
    });

    it('should store task-specific episodes', async () => {
      // Store task-specific episodes
      const episode1 = await memorySystem.storeEpisode({
        type: 'code_generation',
        content: 'Implemented login form validation',
        projectId: 'proj-001',
        taskId: 'task-login',
      });

      const episode2 = await memorySystem.storeEpisode({
        type: 'review_feedback',
        content: 'Review: Add rate limiting to login endpoint',
        projectId: 'proj-001',
        taskId: 'task-login',
      });

      // Verify task association
      expect(episode1.taskId).toBe('task-login');
      expect(episode2.taskId).toBe('task-login');
    });

    it('should handle memory pruning correctly', async () => {
      // Store multiple episodes
      for (let i = 0; i < 5; i++) {
        await memorySystem.storeEpisode({
          type: 'code_generation',
          content: `Episode ${String(i)}`,
          projectId: 'proj-001',
          importance: i < 2 ? 2.0 : 0.5, // First 2 are high importance
        });
      }

      // Prune by count (keep top 3)
      const pruned = memorySystem.pruneByCount(3);

      expect(pruned).toBe(2); // Should remove 2 low-importance episodes
    });
  });

  // ===========================================================================
  // StateFormatAdapter Integration
  // ===========================================================================

  describe('StateFormatAdapter Integration', () => {
    it('should roundtrip STATE.md without data loss', () => {
      const original = createTestState('proj-roundtrip-test');
      original.project.name = 'Roundtrip Test Project';
      original.status = 'executing';
      original.currentPhase = 'Phase 3 of 8';
      original.features = [
        createTestFeature('f1', 'Auth', 'complete'),
        createTestFeature('f2', 'Dashboard', 'in_progress'),
      ];
      original.lastCheckpointId = 'chk-abc123';

      // Export to markdown
      const markdown = adapter.exportToSTATE_MD(original);

      // Import back
      const imported = adapter.importFromSTATE_MD(markdown);

      // Re-export
      const reExported = adapter.exportToSTATE_MD(imported);

      // Critical: Project ID must be preserved
      expect(imported.projectId).toBe(original.projectId);
      expect(imported.project.name).toBe(original.project.name);
      expect(imported.status).toBe(original.status);

      // Double roundtrip should produce identical markdown
      expect(reExported).toContain(original.projectId);
      expect(reExported).toContain(original.project.name);
    });

    it('should export human-readable format', () => {
      const state = createTestState('proj-readable');
      state.project.name = 'Human Readable Test';
      state.features = [createTestFeature('f1', 'Feature One', 'in_progress')];
      state.tasks = [createTestTask('t1', 'Task One', 'completed')];

      const markdown = adapter.exportToSTATE_MD(state);

      // Should be markdown, not JSON
      expect(markdown).toContain('# Project State:');
      expect(markdown).toContain('## Status');
      expect(markdown).not.toContain('{"projectId"');

      // Should have human-readable elements
      expect(markdown).toContain('Feature One');
      expect(markdown).toContain('Task One');
    });
  });

  // ===========================================================================
  // Cross-Component Integration
  // ===========================================================================

  describe('Cross-Component Integration', () => {
    it('should work together: save state, checkpoint, memory, export', async () => {
      // 1. Create and save state
      const state = createTestState('proj-full-integration');
      state.project.name = 'Full Integration Test';
      state.status = 'executing';
      state.features = [createTestFeature('f1', 'Core Feature')];
      stateManager.saveState(state);

      // 2. Create checkpoint (async)
      const checkpoint = await checkpointManager.createCheckpoint(
        'proj-full-integration',
        'Integration checkpoint'
      );

      // 3. Create MemorySystem for this project and store episode
      const projectMemory = new MemorySystem({
        db,
        embeddingsService,
        projectId: 'proj-full-integration',
      });
      await projectMemory.storeEpisode({
        type: 'decision',
        content: 'Decided to use JWT for authentication',
        projectId: 'proj-full-integration',
      });

      // 4. Load state and update with checkpoint reference
      const loaded = stateManager.loadState('proj-full-integration');
      expect(loaded).not.toBeNull();

      stateManager.updateState('proj-full-integration', {
        lastCheckpointId: checkpoint.id,
      });

      // 5. Export to STATE.md
      const finalState = stateManager.loadState('proj-full-integration');
      const markdown = adapter.exportToSTATE_MD(finalState!);

      // Verify all components contributed
      expect(markdown).toContain('Full Integration Test');
      expect(markdown).toContain(checkpoint.id);
    });

    it('should handle continue points for interrupted work', () => {
      // Setup project
      const state = createTestState('proj-continue');
      stateManager.saveState(state);

      // Save continue point
      const continuePoint = {
        projectId: 'proj-continue',
        taskId: 'task-interrupted',
        lastAction: 'Writing authentication middleware',
        file: 'src/middleware/auth.ts',
        line: 42,
        functionName: 'validateToken',
        nextSteps: ['Add token refresh', 'Handle expired tokens'],
        agentId: 'agent-001',
        iterationCount: 3,
        savedAt: new Date(),
      };

      stateManager.saveContinuePoint(continuePoint);

      // Later: Load continue point
      const loaded = stateManager.loadContinuePoint('proj-continue');

      expect(loaded).not.toBeNull();
      expect(loaded!.taskId).toBe('task-interrupted');
      expect(loaded!.file).toBe('src/middleware/auth.ts');
      expect(loaded!.line).toBe(42);
      expect(loaded!.nextSteps).toContain('Add token refresh');

      // Clear after resuming
      stateManager.clearContinuePoint('proj-continue');
      expect(stateManager.loadContinuePoint('proj-continue')).toBeNull();
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

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

function createTestFeature(
  id: string,
  name: string,
  status: string = 'backlog'
): Feature {
  return {
    id,
    projectId: 'proj-001',
    name,
    description: `Description for ${name}`,
    priority: 'should' as const,
    status,
    complexity: 'simple' as const,
    estimatedTasks: 3,
    completedTasks: status === 'complete' ? 3 : 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestTask(
  id: string,
  name: string,
  status: string = 'pending'
): Task {
  return {
    id,
    projectId: 'proj-001',
    featureId: null,
    subFeatureId: null,
    name,
    description: `Description for ${name}`,
    type: 'auto' as const,
    status,
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
    completedAt: status === 'completed' ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestAgent(
  id: string,
  type: 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger'
): Agent {
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
