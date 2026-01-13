/**
 * WorktreeManager Tests
 *
 * TDD RED Phase: These tests define the expected behavior of WorktreeManager.
 * All tests should fail initially until the implementation is complete.
 *
 * Tests cover:
 * - Worktree creation (valid taskId, duplicate rejection)
 * - Worktree removal
 * - Worktree listing
 * - Worktree retrieval by taskId
 * - Cleanup of stale worktrees
 * - Registry persistence
 * - Branch naming pattern validation
 * - Path construction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import fse from 'fs-extra';
import { execSync } from 'node:child_process';
import {
  WorktreeManager,
  WorktreeError,
  WorktreeExistsError,
  WorktreeNotFoundError,
  type WorktreeInfo,
  type WorktreeRegistry,
  type CleanupOptions,
  type CleanupResult,
  type WorktreeManagerOptions,
} from './WorktreeManager';
import { GitService } from './GitService';

describe('WorktreeManager', () => {
  let manager: WorktreeManager;
  let gitService: GitService;
  let testDir: string;
  let worktreeDir: string;

  /**
   * Initialize a git repository with initial commit
   */
  async function initRepo(): Promise<void> {
    await fse.ensureDir(testDir);
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@nexus.dev"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
    // Create initial commit (required for worktrees)
    await fse.writeFile(join(testDir, 'README.md'), '# Test Repo');
    execSync('git add README.md', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });
  }

  /**
   * Create a WorktreeManager instance with default options
   */
  function createManager(options?: Partial<WorktreeManagerOptions>): WorktreeManager {
    gitService = new GitService({ baseDir: testDir });
    return new WorktreeManager({
      baseDir: testDir,
      gitService,
      worktreeDir: worktreeDir,
      ...options,
    });
  }

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = join(tmpdir(), 'nexus-worktree-test', randomUUID());
    worktreeDir = join(testDir, '.nexus', 'worktrees');
    await fse.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fse.remove(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // Custom Error Types
  // ============================================================================

  describe('Custom Error Types', () => {
    it('should have WorktreeError as base class', () => {
      const error = new WorktreeError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('WorktreeError');
      expect(error.message).toBe('test error');
    });

    it('should have WorktreeExistsError with taskId property', () => {
      const error = new WorktreeExistsError('task-123');
      expect(error).toBeInstanceOf(WorktreeError);
      expect(error.name).toBe('WorktreeExistsError');
      expect(error.taskId).toBe('task-123');
      expect(error.message).toContain('task-123');
    });

    it('should have WorktreeNotFoundError with taskId property', () => {
      const error = new WorktreeNotFoundError('task-456');
      expect(error).toBeInstanceOf(WorktreeError);
      expect(error.name).toBe('WorktreeNotFoundError');
      expect(error.taskId).toBe('task-456');
      expect(error.message).toContain('task-456');
    });
  });

  // ============================================================================
  // Constructor and Options
  // ============================================================================

  describe('Constructor', () => {
    it('should accept required options (baseDir, gitService)', async () => {
      await initRepo();
      const manager = createManager();
      expect(manager).toBeInstanceOf(WorktreeManager);
    });

    it('should accept optional worktreeDir', async () => {
      await initRepo();
      const customDir = join(testDir, 'custom-worktrees');
      const manager = createManager({ worktreeDir: customDir });
      expect(manager).toBeInstanceOf(WorktreeManager);
    });

    it('should use default worktreeDir (.nexus/worktrees) when not specified', async () => {
      await initRepo();
      gitService = new GitService({ baseDir: testDir });
      const manager = new WorktreeManager({
        baseDir: testDir,
        gitService,
      });
      expect(manager).toBeInstanceOf(WorktreeManager);
    });
  });

  // ============================================================================
  // Path Construction
  // ============================================================================

  describe('getWorktreePath', () => {
    it('should return absolute path for taskId', async () => {
      await initRepo();
      manager = createManager();

      const path = manager.getWorktreePath('task-123');

      expect(path).toBe(join(worktreeDir, 'task-123'));
    });

    it('should return consistent path for same taskId', async () => {
      await initRepo();
      manager = createManager();

      const path1 = manager.getWorktreePath('task-abc');
      const path2 = manager.getWorktreePath('task-abc');

      expect(path1).toBe(path2);
    });

    it('should return different paths for different taskIds', async () => {
      await initRepo();
      manager = createManager();

      const path1 = manager.getWorktreePath('task-1');
      const path2 = manager.getWorktreePath('task-2');

      expect(path1).not.toBe(path2);
    });
  });

  // ============================================================================
  // Create Worktree
  // ============================================================================

  describe('createWorktree', () => {
    it('should create worktree and return WorktreeInfo', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('task-123');

      expect(info).toMatchObject({
        taskId: 'task-123',
        path: expect.any(String),
        branch: expect.any(String),
        baseBranch: expect.any(String),
        createdAt: expect.any(Date),
        status: 'active',
      });
    });

    it('should create worktree directory on disk', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('task-456');

      const exists = await fse.pathExists(info.path);
      expect(exists).toBe(true);
    });

    it('should create branch with correct naming pattern (nexus/task/{taskId}/{timestamp})', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('my-task');

      expect(info.branch).toMatch(/^nexus\/task\/my-task\/\d+$/);
    });

    it('should use main/master as default base branch', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('task-default');

      expect(['main', 'master']).toContain(info.baseBranch);
    });

    it('should use specified base branch when provided', async () => {
      await initRepo();
      manager = createManager();
      // Create a feature branch first
      execSync('git branch feature-branch', { cwd: testDir, stdio: 'pipe' });

      const info = await manager.createWorktree('task-from-feature', 'feature-branch');

      expect(info.baseBranch).toBe('feature-branch');
    });

    it('should throw WorktreeExistsError for duplicate taskId', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('duplicate-task');

      await expect(manager.createWorktree('duplicate-task'))
        .rejects.toThrow(WorktreeExistsError);
    });

    it('should update registry after creation', async () => {
      await initRepo();
      manager = createManager();

      await manager.createWorktree('task-registry');

      const registry = await manager.loadRegistry();
      expect(registry.worktrees['task-registry']).toBeDefined();
    });

    it('should set initial status to active', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('active-task');

      expect(info.status).toBe('active');
    });
  });

  // ============================================================================
  // Get Worktree
  // ============================================================================

  describe('getWorktree', () => {
    it('should return WorktreeInfo for existing worktree', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('existing-task');

      const info = await manager.getWorktree('existing-task');

      expect(info).not.toBeNull();
      expect(info!.taskId).toBe('existing-task');
    });

    it('should return null for non-existent worktree', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.getWorktree('nonexistent');

      expect(info).toBeNull();
    });

    it('should return correct WorktreeInfo properties', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('props-task');

      const info = await manager.getWorktree('props-task');

      expect(info).toMatchObject({
        taskId: 'props-task',
        path: expect.stringContaining('props-task'),
        branch: expect.stringContaining('nexus/task/props-task'),
        baseBranch: expect.any(String),
        createdAt: expect.any(Date),
        status: expect.stringMatching(/^(active|idle|stale)$/),
      });
    });
  });

  // ============================================================================
  // List Worktrees
  // ============================================================================

  describe('listWorktrees', () => {
    it('should return empty array when no worktrees exist', async () => {
      await initRepo();
      manager = createManager();

      const worktrees = await manager.listWorktrees();

      expect(worktrees).toEqual([]);
    });

    it('should return array of all active worktrees', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('task-1');
      await manager.createWorktree('task-2');
      await manager.createWorktree('task-3');

      const worktrees = await manager.listWorktrees();

      expect(worktrees.length).toBe(3);
      expect(worktrees.map(w => w.taskId).sort()).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('should return WorktreeInfo objects with all properties', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('full-info-task');

      const worktrees = await manager.listWorktrees();
      const info = worktrees[0];

      expect(info.taskId).toBe('full-info-task');
      expect(info.path).toBeDefined();
      expect(info.branch).toBeDefined();
      expect(info.baseBranch).toBeDefined();
      expect(info.createdAt).toBeInstanceOf(Date);
      expect(info.status).toBeDefined();
    });
  });

  // ============================================================================
  // Remove Worktree
  // ============================================================================

  describe('removeWorktree', () => {
    it('should remove worktree directory', async () => {
      await initRepo();
      manager = createManager();
      const info = await manager.createWorktree('to-remove');
      expect(await fse.pathExists(info.path)).toBe(true);

      await manager.removeWorktree('to-remove');

      expect(await fse.pathExists(info.path)).toBe(false);
    });

    it('should update registry after removal', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('remove-registry');

      await manager.removeWorktree('remove-registry');

      const registry = await manager.loadRegistry();
      expect(registry.worktrees['remove-registry']).toBeUndefined();
    });

    it('should throw WorktreeNotFoundError for non-existent worktree', async () => {
      await initRepo();
      manager = createManager();

      await expect(manager.removeWorktree('nonexistent'))
        .rejects.toThrow(WorktreeNotFoundError);
    });

    it('should optionally delete associated branch', async () => {
      await initRepo();
      manager = createManager();
      const info = await manager.createWorktree('branch-delete');

      await manager.removeWorktree('branch-delete', { deleteBranch: true });

      // Verify branch no longer exists
      const branches = await gitService.listBranches();
      expect(branches.some(b => b.name === info.branch)).toBe(false);
    });

    it('should keep branch by default when removing worktree', async () => {
      await initRepo();
      manager = createManager();
      const info = await manager.createWorktree('keep-branch');

      await manager.removeWorktree('keep-branch');

      // Branch should still exist
      const branches = await gitService.listBranches();
      expect(branches.some(b => b.name === info.branch)).toBe(true);
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('cleanup', () => {
    it('should return CleanupResult with removed, failed, and skipped arrays', async () => {
      await initRepo();
      manager = createManager();

      const result = await manager.cleanup();

      expect(result).toMatchObject({
        removed: expect.any(Array),
        failed: expect.any(Array),
        skipped: expect.any(Array),
      });
    });

    it('should remove stale worktrees (no activity beyond maxAge)', async () => {
      await initRepo();
      manager = createManager();
      // Create worktree
      await manager.createWorktree('stale-task');

      // Manually set lastActivity to past
      const registry = await manager.loadRegistry();
      const worktreeInfo = registry.worktrees['stale-task'];
      worktreeInfo.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      worktreeInfo.status = 'stale';
      await manager.saveRegistry(registry);

      const result = await manager.cleanup({ maxAge: 1 * 60 * 60 * 1000 }); // 1 hour max age

      expect(result.removed).toContain('stale-task');
    });

    it('should skip recent worktrees', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('recent-task');

      const result = await manager.cleanup({ maxAge: 1 * 60 * 60 * 1000 }); // 1 hour

      expect(result.skipped).toContain('recent-task');
    });

    it('should support dryRun option (report without removing)', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('dry-run-task');

      // Mark as stale
      const registry = await manager.loadRegistry();
      registry.worktrees['dry-run-task'].lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
      registry.worktrees['dry-run-task'].status = 'stale';
      await manager.saveRegistry(registry);

      const result = await manager.cleanup({ maxAge: 1 * 60 * 60 * 1000, dryRun: true });

      // Should be reported but not actually removed
      expect(result.removed).toContain('dry-run-task');
      // Worktree should still exist
      const info = await manager.getWorktree('dry-run-task');
      expect(info).not.toBeNull();
    });

    it('should support force option to remove even modified worktrees', async () => {
      await initRepo();
      manager = createManager();
      const info = await manager.createWorktree('force-task');

      // Create a modified file in the worktree
      await fse.writeFile(join(info.path, 'modified.ts'), 'modified content');

      // Mark as stale
      const registry = await manager.loadRegistry();
      registry.worktrees['force-task'].lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
      registry.worktrees['force-task'].status = 'stale';
      await manager.saveRegistry(registry);

      const result = await manager.cleanup({ maxAge: 1 * 60 * 60 * 1000, force: true });

      expect(result.removed).toContain('force-task');
    });

    it('should use default maxAge of 1 hour when not specified', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('default-age-task');

      // Set to 30 minutes ago (should NOT be removed with default 1 hour)
      const registry = await manager.loadRegistry();
      registry.worktrees['default-age-task'].lastActivity = new Date(Date.now() - 30 * 60 * 1000);
      await manager.saveRegistry(registry);

      const result = await manager.cleanup();

      expect(result.skipped).toContain('default-age-task');
    });
  });

  // ============================================================================
  // Registry Operations
  // ============================================================================

  describe('Registry Operations', () => {
    describe('loadRegistry', () => {
      it('should load existing registry from disk', async () => {
        await initRepo();
        manager = createManager();
        // Create a worktree to populate registry
        await manager.createWorktree('load-test');

        // Create new manager instance to test loading
        const newManager = createManager();
        const registry = await newManager.loadRegistry();

        expect(registry.worktrees['load-test']).toBeDefined();
      });

      it('should create registry if not exists', async () => {
        await initRepo();
        manager = createManager();

        const registry = await manager.loadRegistry();

        expect(registry).toMatchObject({
          version: 1,
          baseDir: expect.any(String),
          worktrees: expect.any(Object),
          lastUpdated: expect.any(Date),
        });
      });

      it('should return registry with correct structure', async () => {
        await initRepo();
        manager = createManager();

        const registry = await manager.loadRegistry();

        expect(registry.version).toBe(1);
        expect(typeof registry.baseDir).toBe('string');
        expect(typeof registry.worktrees).toBe('object');
        expect(registry.lastUpdated).toBeInstanceOf(Date);
      });
    });

    describe('saveRegistry', () => {
      it('should persist registry to disk', async () => {
        await initRepo();
        manager = createManager();
        const registry = await manager.loadRegistry();
        registry.worktrees['manual-entry'] = {
          taskId: 'manual-entry',
          path: '/some/path',
          branch: 'nexus/task/manual-entry/123',
          baseBranch: 'main',
          createdAt: new Date(),
          status: 'active',
        };

        await manager.saveRegistry(registry);

        // Load again and verify
        const loaded = await manager.loadRegistry();
        expect(loaded.worktrees['manual-entry']).toBeDefined();
      });

      it('should update lastUpdated timestamp', async () => {
        await initRepo();
        manager = createManager();
        const registry = await manager.loadRegistry();
        const originalTimestamp = registry.lastUpdated;

        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));

        await manager.saveRegistry(registry);

        const loaded = await manager.loadRegistry();
        expect(loaded.lastUpdated.getTime()).toBeGreaterThanOrEqual(originalTimestamp.getTime());
      });

      it('should create registry directory if not exists', async () => {
        await initRepo();
        const customDir = join(testDir, 'new-dir', 'worktrees');
        manager = createManager({ worktreeDir: customDir });

        const registry = await manager.loadRegistry();
        await manager.saveRegistry(registry);

        const registryPath = join(customDir, 'registry.json');
        expect(await fse.pathExists(registryPath)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Branch Naming Pattern
  // ============================================================================

  describe('Branch Naming Pattern', () => {
    it('should generate branch name matching pattern nexus/task/{taskId}/{timestamp}', async () => {
      await initRepo();
      manager = createManager();

      const info = await manager.createWorktree('pattern-test');

      const pattern = /^nexus\/task\/pattern-test\/\d{13}$/; // 13 digits for timestamp
      expect(info.branch).toMatch(pattern);
    });

    it('should use current timestamp in branch name', async () => {
      await initRepo();
      manager = createManager();
      const beforeCreate = Date.now();

      const info = await manager.createWorktree('timestamp-test');

      const afterCreate = Date.now();
      const timestampMatch = info.branch.match(/(\d+)$/);
      expect(timestampMatch).not.toBeNull();
      const branchTimestamp = parseInt(timestampMatch![1], 10);
      expect(branchTimestamp).toBeGreaterThanOrEqual(beforeCreate);
      expect(branchTimestamp).toBeLessThanOrEqual(afterCreate);
    });

    it('should handle taskId with special characters', async () => {
      await initRepo();
      manager = createManager();

      // Task IDs might contain dashes
      const info = await manager.createWorktree('complex-task-id-123');

      expect(info.branch).toContain('complex-task-id-123');
    });
  });

  // ============================================================================
  // Activity Tracking
  // ============================================================================

  describe('Activity Tracking', () => {
    it('should update lastActivity when worktree is accessed', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('activity-track');

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Access the worktree
      await manager.updateActivity('activity-track');

      const info = await manager.getWorktree('activity-track');
      expect(info!.lastActivity).toBeDefined();
      expect(info!.lastActivity!.getTime()).toBeGreaterThan(info!.createdAt.getTime());
    });

    it('should update status based on activity', async () => {
      await initRepo();
      manager = createManager();
      await manager.createWorktree('status-track');

      // Set old lastActivity to trigger idle/stale status
      const registry = await manager.loadRegistry();
      registry.worktrees['status-track'].lastActivity = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      await manager.saveRegistry(registry);

      // Refresh status
      await manager.refreshStatus('status-track');

      const info = await manager.getWorktree('status-track');
      expect(['idle', 'stale']).toContain(info!.status);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle concurrent worktree creation for different tasks', async () => {
      await initRepo();
      manager = createManager();

      const results = await Promise.all([
        manager.createWorktree('concurrent-1'),
        manager.createWorktree('concurrent-2'),
        manager.createWorktree('concurrent-3'),
      ]);

      expect(results.length).toBe(3);
      expect(new Set(results.map(r => r.taskId)).size).toBe(3);
    });

    it('should handle worktree path with spaces in baseDir', async () => {
      const spacedDir = join(tmpdir(), 'nexus worktree test', randomUUID());
      await fse.ensureDir(spacedDir);
      execSync('git init', { cwd: spacedDir, stdio: 'pipe' });
      execSync('git config user.email "test@nexus.dev"', { cwd: spacedDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: spacedDir, stdio: 'pipe' });
      await fse.writeFile(join(spacedDir, 'README.md'), '# Test');
      execSync('git add README.md', { cwd: spacedDir, stdio: 'pipe' });
      execSync('git commit -m "Initial"', { cwd: spacedDir, stdio: 'pipe' });

      const spaceManager = new WorktreeManager({
        baseDir: spacedDir,
        gitService: new GitService({ baseDir: spacedDir }),
      });

      const info = await spaceManager.createWorktree('space-test');

      expect(await fse.pathExists(info.path)).toBe(true);

      // Cleanup
      await fse.remove(spacedDir);
    });
  });
});
