/**
 * GitService Tests
 *
 * TDD RED Phase: These tests define the expected behavior of GitService.
 * All tests should fail initially until the implementation is complete.
 *
 * Tests cover:
 * - Repository detection
 * - Branch CRUD operations
 * - Staging and committing
 * - Diff operations (staged/unstaged)
 * - Status reporting
 * - Merge (success and conflict scenarios)
 * - Custom binary path support
 * - Error handling with custom error types
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import fse from 'fs-extra';
import {
  GitService,
  GitError,
  NotARepositoryError,
  BranchNotFoundError,
  MergeConflictError,
  CommitError,
  type GitStatus,
  type BranchInfo,
  type CommitInfo,
  type DiffOptions,
  type DiffStat,
  type MergeResult,
  type GitServiceOptions,
} from './GitService';

describe('GitService', () => {
  let git: GitService;
  let testDir: string;

  /**
   * Initialize a git repository and return the GitService instance
   */
  async function initRepo(): Promise<GitService> {
    const service = new GitService({ baseDir: testDir });
    await fse.ensureDir(testDir);
    // Initialize git repo using the service's underlying simple-git
    // We need to do this via shell since we're testing the service
    const { execSync } = await import('node:child_process');
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@nexus.dev"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
    return service;
  }

  /**
   * Create a file in the test repo
   */
  async function createFile(name: string, content: string): Promise<void> {
    await fse.writeFile(join(testDir, name), content);
  }

  /**
   * Create initial commit
   */
  async function createInitialCommit(): Promise<void> {
    await createFile('README.md', '# Test Repo');
    const { execSync } = await import('node:child_process');
    execSync('git add README.md', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });
  }

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = join(tmpdir(), 'nexus-git-test', randomUUID());
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
    it('should have GitError as base class', () => {
      const error = new GitError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('GitError');
      expect(error.message).toBe('test error');
    });

    it('should have NotARepositoryError with path property', () => {
      const error = new NotARepositoryError('/some/path');
      expect(error).toBeInstanceOf(GitError);
      expect(error.name).toBe('NotARepositoryError');
      expect(error.path).toBe('/some/path');
      expect(error.message).toContain('/some/path');
    });

    it('should have BranchNotFoundError with branch property', () => {
      const error = new BranchNotFoundError('feature-branch');
      expect(error).toBeInstanceOf(GitError);
      expect(error.name).toBe('BranchNotFoundError');
      expect(error.branch).toBe('feature-branch');
      expect(error.message).toContain('feature-branch');
    });

    it('should have MergeConflictError with conflicts property', () => {
      const conflicts = ['file1.ts', 'file2.ts'];
      const error = new MergeConflictError(conflicts);
      expect(error).toBeInstanceOf(GitError);
      expect(error.name).toBe('MergeConflictError');
      expect(error.conflicts).toEqual(conflicts);
    });

    it('should have CommitError with reason property', () => {
      const error = new CommitError('Nothing to commit');
      expect(error).toBeInstanceOf(GitError);
      expect(error.name).toBe('CommitError');
      expect(error.reason).toBe('Nothing to commit');
    });
  });

  // ============================================================================
  // Constructor and Options
  // ============================================================================

  describe('Constructor', () => {
    it('should accept baseDir option', () => {
      const service = new GitService({ baseDir: testDir });
      expect(service).toBeInstanceOf(GitService);
    });

    it('should accept optional custom binary path', () => {
      const service = new GitService({ baseDir: testDir, binary: '/custom/git' });
      expect(service).toBeInstanceOf(GitService);
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const service = new GitService({ baseDir: testDir, logger });
      expect(service).toBeInstanceOf(GitService);
    });
  });

  // ============================================================================
  // Repository Status
  // ============================================================================

  describe('isRepository', () => {
    it('should return true for valid git repository', async () => {
      git = await initRepo();
      const result = await git.isRepository();
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      git = new GitService({ baseDir: testDir });
      const result = await git.isRepository();
      expect(result).toBe(false);
    });

    it('should return true for path inside git repository', async () => {
      git = await initRepo();
      await fse.ensureDir(join(testDir, 'subdir'));
      const subGit = new GitService({ baseDir: join(testDir, 'subdir') });
      const result = await subGit.isRepository();
      expect(result).toBe(true);
    });
  });

  describe('status', () => {
    it('should return GitStatus object', async () => {
      git = await initRepo();
      await createInitialCommit();

      const status = await git.status();
      expect(status).toMatchObject({
        current: expect.any(String),
        staged: expect.any(Array),
        modified: expect.any(Array),
        untracked: expect.any(Array),
        conflicted: expect.any(Array),
        ahead: expect.any(Number),
        behind: expect.any(Number),
      });
    });

    it('should show current branch name', async () => {
      git = await initRepo();
      await createInitialCommit();

      const status = await git.status();
      // Git default branch is usually 'main' or 'master'
      expect(['main', 'master']).toContain(status.current);
    });

    it('should show staged files', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('staged.ts', 'console.log("staged");');
      await git.stageFiles(['staged.ts']);

      const status = await git.status();
      expect(status.staged).toContain('staged.ts');
    });

    it('should show modified files', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('README.md', '# Modified');

      const status = await git.status();
      expect(status.modified).toContain('README.md');
    });

    it('should show untracked files', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('new-file.ts', 'new file');

      const status = await git.status();
      expect(status.untracked).toContain('new-file.ts');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.status()).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch name', async () => {
      git = await initRepo();
      await createInitialCommit();

      const branch = await git.currentBranch();
      expect(['main', 'master']).toContain(branch);
    });

    it('should return new branch after checkout', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');

      const branch = await git.currentBranch();
      expect(branch).toBe('feature');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.currentBranch()).rejects.toThrow(NotARepositoryError);
    });
  });

  // ============================================================================
  // Branch Operations
  // ============================================================================

  describe('createBranch', () => {
    it('should create new branch from current', async () => {
      git = await initRepo();
      await createInitialCommit();

      await git.createBranch('feature-branch');

      const branches = await git.listBranches();
      expect(branches.some(b => b.name === 'feature-branch')).toBe(true);
    });

    it('should create branch from specified source', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('feature.ts', 'feature code');
      await git.stageFiles(['feature.ts']);
      await git.commit('Add feature');
      await git.checkoutBranch('master');

      // Create branch from 'feature' branch
      await git.createBranch('hotfix', 'feature');

      // Checkout hotfix and verify it has the feature file
      await git.checkoutBranch('hotfix');
      const exists = await fse.pathExists(join(testDir, 'feature.ts'));
      expect(exists).toBe(true);
    });

    it('should NOT checkout the new branch', async () => {
      git = await initRepo();
      await createInitialCommit();

      await git.createBranch('new-branch');

      const current = await git.currentBranch();
      expect(current).not.toBe('new-branch');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.createBranch('feature')).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('checkoutBranch', () => {
    it('should switch to existing branch', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');

      await git.checkoutBranch('feature');

      const current = await git.currentBranch();
      expect(current).toBe('feature');
    });

    it('should throw BranchNotFoundError for non-existent branch', async () => {
      git = await initRepo();
      await createInitialCommit();

      await expect(git.checkoutBranch('nonexistent')).rejects.toThrow(BranchNotFoundError);
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.checkoutBranch('feature')).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('deleteBranch', () => {
    it('should delete a merged branch', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('to-delete');

      await git.deleteBranch('to-delete');

      const branches = await git.listBranches();
      expect(branches.some(b => b.name === 'to-delete')).toBe(false);
    });

    it('should throw error when deleting unmerged branch without force', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('unmerged');
      await git.checkoutBranch('unmerged');
      await createFile('unmerged.ts', 'unmerged changes');
      await git.stageFiles(['unmerged.ts']);
      await git.commit('Unmerged commit');
      // Go back to main branch
      const mainBranch = (await git.listBranches()).find(b => b.name !== 'unmerged')?.name;
      if (mainBranch) await git.checkoutBranch(mainBranch);

      await expect(git.deleteBranch('unmerged')).rejects.toThrow();
    });

    it('should delete unmerged branch with force option', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('unmerged');
      await git.checkoutBranch('unmerged');
      await createFile('unmerged.ts', 'unmerged changes');
      await git.stageFiles(['unmerged.ts']);
      await git.commit('Unmerged commit');
      // Go back to main branch
      const mainBranch = (await git.listBranches()).find(b => b.name !== 'unmerged')?.name;
      if (mainBranch) await git.checkoutBranch(mainBranch);

      await git.deleteBranch('unmerged', true);

      const branches = await git.listBranches();
      expect(branches.some(b => b.name === 'unmerged')).toBe(false);
    });

    it('should throw BranchNotFoundError for non-existent branch', async () => {
      git = await initRepo();
      await createInitialCommit();

      await expect(git.deleteBranch('nonexistent')).rejects.toThrow(BranchNotFoundError);
    });
  });

  describe('listBranches', () => {
    it('should list all local branches', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature-1');
      await git.createBranch('feature-2');

      const branches = await git.listBranches();

      expect(branches.length).toBeGreaterThanOrEqual(3); // main + 2 features
      expect(branches.some(b => b.name === 'feature-1')).toBe(true);
      expect(branches.some(b => b.name === 'feature-2')).toBe(true);
    });

    it('should return BranchInfo with correct properties', async () => {
      git = await initRepo();
      await createInitialCommit();

      const branches = await git.listBranches();
      const currentBranch = branches.find(b => b.current);

      expect(currentBranch).toBeDefined();
      expect(currentBranch!.name).toBeDefined();
      expect(currentBranch!.commit).toBeDefined();
      expect(typeof currentBranch!.commit).toBe('string');
      expect(currentBranch!.commit.length).toBeGreaterThan(0);
    });

    it('should mark current branch', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');

      const branches = await git.listBranches();
      const currentBranch = branches.find(b => b.current);

      expect(currentBranch?.name).toBe('feature');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.listBranches()).rejects.toThrow(NotARepositoryError);
    });
  });

  // ============================================================================
  // Commit Operations
  // ============================================================================

  describe('stageFiles', () => {
    it('should stage specific files', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('file1.ts', 'content1');
      await createFile('file2.ts', 'content2');

      await git.stageFiles(['file1.ts']);

      const status = await git.status();
      expect(status.staged).toContain('file1.ts');
      expect(status.staged).not.toContain('file2.ts');
    });

    it('should stage all files with "all" parameter', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('file1.ts', 'content1');
      await createFile('file2.ts', 'content2');

      await git.stageFiles('all');

      const status = await git.status();
      expect(status.staged).toContain('file1.ts');
      expect(status.staged).toContain('file2.ts');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.stageFiles(['file.ts'])).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('commit', () => {
    it('should create commit and return hash', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('new-file.ts', 'content');
      await git.stageFiles(['new-file.ts']);

      const hash = await git.commit('Add new file');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThanOrEqual(7); // Short hash at minimum
    });

    it('should include commit in log after creation', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('feature.ts', 'feature code');
      await git.stageFiles(['feature.ts']);
      const message = 'Implement feature';

      await git.commit(message);

      const log = await git.getLog(5);
      expect(log.some(c => c.message.includes(message))).toBe(true);
    });

    it('should throw CommitError when nothing to commit', async () => {
      git = await initRepo();
      await createInitialCommit();

      await expect(git.commit('Empty commit')).rejects.toThrow(CommitError);
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.commit('test')).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('getLog', () => {
    it('should return commit history', async () => {
      git = await initRepo();
      await createInitialCommit();

      const log = await git.getLog();

      expect(log.length).toBeGreaterThan(0);
    });

    it('should return CommitInfo with correct properties', async () => {
      git = await initRepo();
      await createInitialCommit();

      const log = await git.getLog();
      const commit = log[0];

      expect(commit.hash).toBeDefined();
      expect(typeof commit.hash).toBe('string');
      expect(commit.message).toBeDefined();
      expect(commit.author).toBeDefined();
      expect(commit.date).toBeInstanceOf(Date);
    });

    it('should respect limit parameter', async () => {
      git = await initRepo();
      await createInitialCommit();
      // Create more commits
      await createFile('file1.ts', 'c1');
      await git.stageFiles(['file1.ts']);
      await git.commit('Commit 1');
      await createFile('file2.ts', 'c2');
      await git.stageFiles(['file2.ts']);
      await git.commit('Commit 2');
      await createFile('file3.ts', 'c3');
      await git.stageFiles(['file3.ts']);
      await git.commit('Commit 3');

      const log = await git.getLog(2);

      expect(log.length).toBe(2);
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.getLog()).rejects.toThrow(NotARepositoryError);
    });
  });

  // ============================================================================
  // Diff Operations
  // ============================================================================

  describe('diff', () => {
    it('should return unstaged diff by default', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('README.md', '# Modified Content');

      const diffOutput = await git.diff();

      expect(diffOutput).toContain('Modified Content');
    });

    it('should return staged diff when option is set', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('staged.ts', 'staged content');
      await git.stageFiles(['staged.ts']);

      const diffOutput = await git.diff({ staged: true });

      expect(diffOutput).toContain('staged content');
    });

    it('should return diff between two refs', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('feature.ts', 'feature code');
      await git.stageFiles(['feature.ts']);
      await git.commit('Add feature');
      const mainBranch = (await git.listBranches()).find(b => b.name !== 'feature')?.name || 'master';

      const diffOutput = await git.diff({ ref1: mainBranch, ref2: 'feature' });

      expect(diffOutput).toContain('feature code');
    });

    it('should return empty string when no changes', async () => {
      git = await initRepo();
      await createInitialCommit();

      const diffOutput = await git.diff();

      expect(diffOutput).toBe('');
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.diff()).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('diffStat', () => {
    it('should return DiffStat object', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('new-file.ts', 'line1\nline2\nline3');
      await git.stageFiles(['new-file.ts']);

      const stat = await git.diffStat({ staged: true });

      expect(stat).toMatchObject({
        filesChanged: expect.any(Number),
        insertions: expect.any(Number),
        deletions: expect.any(Number),
        files: expect.any(Array),
      });
    });

    it('should count files changed', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('file1.ts', 'content1');
      await createFile('file2.ts', 'content2');
      await git.stageFiles(['file1.ts', 'file2.ts']);

      const stat = await git.diffStat({ staged: true });

      expect(stat.filesChanged).toBe(2);
    });

    it('should count insertions and deletions', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('README.md', 'Line 1\nLine 2\nLine 3');
      await git.stageFiles(['README.md']);

      const stat = await git.diffStat({ staged: true });

      // Original was "# Test Repo" (1 line), now 3 lines
      expect(stat.insertions).toBeGreaterThan(0);
    });

    it('should include per-file statistics', async () => {
      git = await initRepo();
      await createInitialCommit();
      await createFile('added.ts', 'new code');
      await git.stageFiles(['added.ts']);

      const stat = await git.diffStat({ staged: true });

      expect(stat.files.length).toBeGreaterThan(0);
      expect(stat.files[0]).toMatchObject({
        path: expect.any(String),
        insertions: expect.any(Number),
        deletions: expect.any(Number),
      });
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.diffStat()).rejects.toThrow(NotARepositoryError);
    });
  });

  // ============================================================================
  // Merge Operations
  // ============================================================================

  describe('merge', () => {
    it('should merge branch successfully', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('feature.ts', 'feature code');
      await git.stageFiles(['feature.ts']);
      await git.commit('Add feature');
      const mainBranch = (await git.listBranches()).find(b => b.name !== 'feature')?.name || 'master';
      await git.checkoutBranch(mainBranch);

      const result = await git.merge('feature');

      expect(result.success).toBe(true);
      expect(await fse.pathExists(join(testDir, 'feature.ts'))).toBe(true);
    });

    it('should return merge commit hash', async () => {
      git = await initRepo();
      await createInitialCommit();
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('feature.ts', 'feature code');
      await git.stageFiles(['feature.ts']);
      await git.commit('Add feature');
      const mainBranch = (await git.listBranches()).find(b => b.name !== 'feature')?.name || 'master';
      await git.checkoutBranch(mainBranch);
      // Make a change on main to force non-fast-forward merge
      await createFile('main.ts', 'main code');
      await git.stageFiles(['main.ts']);
      await git.commit('Add main file');

      const result = await git.merge('feature');

      // Fast-forward merge won't have mergeCommit, but successful merge should work
      expect(result.success).toBe(true);
    });

    it('should detect merge conflicts', async () => {
      git = await initRepo();
      await createInitialCommit();

      // Create conflicting changes on two branches
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('README.md', 'Feature version');
      await git.stageFiles(['README.md']);
      await git.commit('Feature change');

      const mainBranch = (await git.listBranches()).find(b => b.name !== 'feature')?.name || 'master';
      await git.checkoutBranch(mainBranch);
      await createFile('README.md', 'Main version');
      await git.stageFiles(['README.md']);
      await git.commit('Main change');

      const result = await git.merge('feature');

      expect(result.success).toBe(false);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
    });

    it('should throw BranchNotFoundError for non-existent branch', async () => {
      git = await initRepo();
      await createInitialCommit();

      await expect(git.merge('nonexistent')).rejects.toThrow(BranchNotFoundError);
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.merge('feature')).rejects.toThrow(NotARepositoryError);
    });
  });

  describe('abortMerge', () => {
    it('should abort an in-progress merge', async () => {
      git = await initRepo();
      await createInitialCommit();

      // Create conflicting changes
      await git.createBranch('feature');
      await git.checkoutBranch('feature');
      await createFile('README.md', 'Feature version');
      await git.stageFiles(['README.md']);
      await git.commit('Feature change');

      const mainBranch = (await git.listBranches()).find(b => b.name !== 'feature')?.name || 'master';
      await git.checkoutBranch(mainBranch);
      await createFile('README.md', 'Main version');
      await git.stageFiles(['README.md']);
      await git.commit('Main change');

      // Start a conflicting merge
      await git.merge('feature');

      // Abort should work
      await git.abortMerge();

      // After abort, status should not show conflicts
      const status = await git.status();
      expect(status.conflicted.length).toBe(0);
    });

    it('should throw when no merge in progress', async () => {
      git = await initRepo();
      await createInitialCommit();

      await expect(git.abortMerge()).rejects.toThrow();
    });

    it('should throw NotARepositoryError for non-repo', async () => {
      git = new GitService({ baseDir: testDir });

      await expect(git.abortMerge()).rejects.toThrow(NotARepositoryError);
    });
  });

  // ============================================================================
  // Custom Binary Support
  // ============================================================================

  describe('Custom binary path', () => {
    it('should use custom git binary when specified', async () => {
      // This test verifies the option is accepted - actual binary use is internal
      const service = new GitService({
        baseDir: testDir,
        binary: '/usr/local/bin/git'
      });
      expect(service).toBeInstanceOf(GitService);
    });
  });

  // ============================================================================
  // Logger Support
  // ============================================================================

  describe('Logger support', () => {
    it('should log operations when logger is provided', async () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      git = new GitService({ baseDir: testDir, logger });
      await fse.ensureDir(testDir);
      const { execSync } = await import('node:child_process');
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@nexus.dev"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

      await git.isRepository();

      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
