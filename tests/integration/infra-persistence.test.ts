/**
 * Infrastructure <-> Persistence Integration Tests
 *
 * Tests real integration between FileSystemService, GitService, WorktreeManager
 * and the persistence layer (StateManager, Database).
 *
 * These tests use real components - only external APIs are mocked via MSW.
 *
 * @module tests/integration/infra-persistence
 */
import { join } from 'pathe';
import fse from 'fs-extra';
import { tmpdir } from 'os';
import { test, expect, describe, beforeEach, afterEach } from '../helpers/fixtures';
import { FileSystemService } from '@/infrastructure/file-system/FileSystemService';
import { GitService } from '@/infrastructure/git/GitService';
import { WorktreeManager } from '@/infrastructure/git/WorktreeManager';
import { StateManager } from '@/persistence/state/StateManager';
import type { NexusState } from '@/persistence/state/StateManager';
import { nanoid } from 'nanoid';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a temporary test directory that gets cleaned up after use
 */
async function createTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `nexus-test-${nanoid(8)}`);
  await fse.ensureDir(tempDir);
  return tempDir;
}

/**
 * Initialize a git repository in the given directory
 */
async function initGitRepo(dir: string): Promise<void> {
  const { execaCommand } = await import('execa');
  await execaCommand('git init', { cwd: dir, shell: true });
  await execaCommand('git config user.email "test@nexus.dev"', { cwd: dir, shell: true });
  await execaCommand('git config user.name "Nexus Test"', { cwd: dir, shell: true });
  // Create initial commit so we have a valid HEAD
  await fse.writeFile(join(dir, 'README.md'), '# Test Project\n');
  await execaCommand('git add .', { cwd: dir, shell: true });
  await execaCommand('git commit -m "Initial commit"', { cwd: dir, shell: true });
}

/**
 * Create a minimal NexusState for testing
 */
function createTestState(projectId: string, rootPath: string): NexusState {
  const now = new Date();
  return {
    projectId,
    project: {
      id: projectId,
      name: 'Test Project',
      description: 'A test project',
      mode: 'genesis',
      status: 'planning',
      rootPath,
      repositoryUrl: null,
      settings: JSON.stringify({ maxParallelAgents: 4 }),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
    features: [],
    tasks: [],
    agents: [],
    status: 'planning',
    currentPhase: 'setup',
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Infrastructure <-> Persistence Integration', () => {
  let tempDir: string;
  let fileSystem: FileSystemService;
  let gitService: GitService;

  beforeEach(async () => {
    tempDir = await createTempDir();
    fileSystem = new FileSystemService();
    await initGitRepo(tempDir);
    gitService = new GitService({ baseDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fse.remove(tempDir);
    } catch {
      // Ignore cleanup errors on Windows
    }
  });

  test('should persist file operations to database', async ({ db }) => {
    // Arrange: Create StateManager with test database
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;
    const testFilePath = join(tempDir, 'src', 'test.ts');

    // Create initial state
    const initialState = createTestState(projectId, tempDir);
    stateManager.saveState(initialState);

    // Act: Use FileSystemService to write a file
    await fileSystem.writeFile(testFilePath, 'export const hello = "world";');

    // Verify file was written
    const fileExists = await fileSystem.exists(testFilePath);
    expect(fileExists).toBe(true);

    // Update state to record the file operation
    const updatedState: NexusState = {
      ...initialState,
      tasks: [
        {
          id: `task-${nanoid(6)}`,
          projectId,
          featureId: null,
          subFeatureId: null,
          name: 'Create test file',
          description: 'Test file creation',
          type: 'auto',
          status: 'completed',
          size: 'atomic',
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
          estimatedMinutes: 5,
          actualMinutes: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    stateManager.saveState(updatedState);

    // Assert: Verify state was persisted correctly
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.tasks).toHaveLength(1);
    expect(loadedState!.tasks[0].status).toBe('completed');
  });

  test('should track git operations in state', async ({ db }) => {
    // Arrange
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;
    const testFilePath = join(tempDir, 'feature.ts');

    // Create initial state
    const initialState = createTestState(projectId, tempDir);
    stateManager.saveState(initialState);

    // Act: Perform git operations
    await fileSystem.writeFile(testFilePath, 'export function feature() { return true; }');
    await gitService.stageFiles([testFilePath]);
    const commitHash = await gitService.commit('Add feature');

    // Update state with git operation info
    const updatedState: NexusState = {
      ...initialState,
      currentPhase: 'implementing',
      lastCheckpointId: commitHash,
    };
    stateManager.saveState(updatedState);

    // Assert: Verify git operation is tracked in state
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.lastCheckpointId).toBe(commitHash);

    // Verify git log shows the commit
    const log = await gitService.getLog(1);
    expect(log).toHaveLength(1);
    expect(log[0].hash).toBe(commitHash);
    expect(log[0].message).toBe('Add feature');
  });

  test('should sync worktree state with database', async ({ db }) => {
    // Arrange
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;
    const taskId = `task-${nanoid(6)}`;

    // Create WorktreeManager
    const worktreeManager = new WorktreeManager({
      baseDir: tempDir,
      gitService,
    });

    // Create initial state
    const initialState = createTestState(projectId, tempDir);
    stateManager.saveState(initialState);

    // Act: Create a worktree
    const worktreeInfo = await worktreeManager.createWorktree(taskId);

    // Update state with worktree information
    const updatedState: NexusState = {
      ...initialState,
      tasks: [
        {
          id: taskId,
          projectId,
          featureId: null,
          subFeatureId: null,
          name: 'Task with worktree',
          description: 'A task using isolated worktree',
          type: 'auto',
          status: 'executing',
          size: 'small',
          priority: 5,
          tags: null,
          notes: null,
          assignedAgent: 'agent-1',
          worktreePath: worktreeInfo.path,
          branchName: worktreeInfo.branch,
          dependsOn: null,
          blockedBy: null,
          qaIterations: 0,
          maxIterations: 50,
          estimatedMinutes: 15,
          actualMinutes: null,
          startedAt: new Date(),
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    stateManager.saveState(updatedState);

    // Assert: Verify worktree info is persisted
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.tasks).toHaveLength(1);
    expect(loadedState!.tasks[0].worktreePath).toBe(worktreeInfo.path);
    expect(loadedState!.tasks[0].branchName).toBe(worktreeInfo.branch);

    // Verify worktree exists on disk
    const worktreeExists = await fse.pathExists(worktreeInfo.path);
    expect(worktreeExists).toBe(true);

    // Cleanup worktree
    await worktreeManager.removeWorktree(taskId, { deleteBranch: true });
  });

  test('should handle file deletion with state cleanup', async ({ db }) => {
    // Arrange
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;
    const testFilePath = join(tempDir, 'to-delete.ts');

    // Create initial state with a task referencing the file
    const initialState = createTestState(projectId, tempDir);

    // Create the file
    await fileSystem.writeFile(testFilePath, 'export const toDelete = true;');
    await gitService.stageFiles([testFilePath]);
    await gitService.commit('Add file to delete');

    // Create state with task that references this file
    const stateWithFile: NexusState = {
      ...initialState,
      tasks: [
        {
          id: `task-${nanoid(6)}`,
          projectId,
          featureId: null,
          subFeatureId: null,
          name: 'Create file',
          description: 'Created to-delete.ts',
          type: 'auto',
          status: 'completed',
          size: 'atomic',
          priority: 5,
          tags: null,
          notes: JSON.stringify([testFilePath]),
          assignedAgent: null,
          worktreePath: null,
          branchName: null,
          dependsOn: null,
          blockedBy: null,
          qaIterations: 0,
          maxIterations: 50,
          estimatedMinutes: 5,
          actualMinutes: 3,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    stateManager.saveState(stateWithFile);

    // Act: Delete the file using FileSystemService
    await fileSystem.remove(testFilePath);

    // Verify file is deleted
    const fileExists = await fileSystem.exists(testFilePath);
    expect(fileExists).toBe(false);

    // Update state to reflect deletion
    const stateAfterDelete: NexusState = {
      ...stateWithFile,
      tasks: [
        {
          ...stateWithFile.tasks[0],
          notes: JSON.stringify([]), // File no longer exists
          updatedAt: new Date(),
        },
      ],
    };
    stateManager.saveState(stateAfterDelete);

    // Assert: State reflects the deletion
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.tasks[0].notes).toBe(JSON.stringify([]));
  });

  test('should recover state from disk after restart', async ({ db }) => {
    // Arrange
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;

    // Create state with meaningful data
    const originalState = createTestState(projectId, tempDir);
    const stateWithData: NexusState = {
      ...originalState,
      status: 'executing',
      currentPhase: 'implementation',
      features: [
        {
          id: `feature-${nanoid(6)}`,
          projectId,
          name: 'Test Feature',
          description: 'A feature for testing',
          priority: 'must',
          status: 'in-progress',
          complexity: 'simple',
          estimatedTasks: 5,
          completedTasks: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [
        {
          id: `task-${nanoid(6)}`,
          projectId,
          featureId: null,
          subFeatureId: null,
          name: 'Persistent task',
          description: 'A task that should persist',
          type: 'auto',
          status: 'queued',
          size: 'small',
          priority: 3,
          tags: JSON.stringify(['integration', 'test']),
          notes: null,
          assignedAgent: null,
          worktreePath: null,
          branchName: null,
          dependsOn: null,
          blockedBy: null,
          qaIterations: 0,
          maxIterations: 50,
          estimatedMinutes: 20,
          actualMinutes: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    // Save state
    stateManager.saveState(stateWithData);

    // Act: Simulate restart by creating a new StateManager instance
    const newStateManager = new StateManager({ db: db.client });

    // Assert: Load state with new instance
    const recoveredState = newStateManager.loadState(projectId);
    expect(recoveredState).not.toBeNull();
    expect(recoveredState!.projectId).toBe(projectId);
    expect(recoveredState!.status).toBe('executing');
    expect(recoveredState!.currentPhase).toBe('implementation');
    expect(recoveredState!.features).toHaveLength(1);
    expect(recoveredState!.features[0].name).toBe('Test Feature');
    expect(recoveredState!.features[0].completedTasks).toBe(2);
    expect(recoveredState!.tasks).toHaveLength(1);
    expect(recoveredState!.tasks[0].name).toBe('Persistent task');
    expect(recoveredState!.tasks[0].priority).toBe(3);

    // Verify file system state is consistent
    const repoExists = await fse.pathExists(tempDir);
    expect(repoExists).toBe(true);
  });
});
