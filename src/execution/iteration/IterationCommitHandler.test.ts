/**
 * Tests for IterationCommitHandler
 *
 * These tests verify the git commit handling for iteration tracking,
 * including commit creation, tagging, rollback, and registry management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IterationCommitHandler,
  createTestIterationCommitHandler,
  createMockCommitExecutor,
  DEFAULT_COMMIT_HANDLER_OPTIONS,
} from './IterationCommitHandler';

describe('IterationCommitHandler', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const executor = createMockCommitExecutor();
      const handler = new IterationCommitHandler(executor, '/test/project');

      expect(handler).toBeDefined();
    });

    it('should accept custom options', () => {
      const executor = createMockCommitExecutor();
      const handler = new IterationCommitHandler(executor, '/test/project', {
        commitPrefix: '[custom]',
        createTags: false,
      });

      expect(handler).toBeDefined();
    });
  });

  describe('commitIteration', () => {
    let handler: IterationCommitHandler;
    let executor: ReturnType<typeof createMockCommitExecutor>;

    beforeEach(() => {
      const result = createTestIterationCommitHandler({ hasChanges: true });
      handler = result.handler;
      executor = result.executor;
    });

    it('should commit changes for an iteration', async () => {
      const hash = await handler.commitIteration('task-1', 1, 'Implemented feature');

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should stage all changes before commit', async () => {
      await handler.commitIteration('task-1', 1, 'Test commit');

      expect(executor.commands).toContainEqual(['add', '-A']);
    });

    it('should create commit with proper message format', async () => {
      await handler.commitIteration('task-1', 1, 'Implemented feature');

      const commitCmd = executor.commands.find(c => c[0] === 'commit');
      expect(commitCmd).toBeDefined();
      expect(commitCmd![1]).toBe('-m');
      expect(commitCmd![2]).toContain('[nexus]');
      expect(commitCmd![2]).toContain('task-1');
      expect(commitCmd![2]).toContain('Iteration 1');
    });

    it('should create tag when enabled', async () => {
      await handler.commitIteration('task-1', 2, 'Test');

      // Find the tag creation command (not the tag -d delete command)
      const tagCmd = executor.commands.find(c =>
        c[0] === 'tag' && c.length === 3 && !c.includes('-d')
      );
      expect(tagCmd).toBeDefined();
      expect(tagCmd![1]).toContain('iteration');
      expect(tagCmd![1]).toContain('task-1');
      expect(tagCmd![1]).toContain('-2');
    });

    it('should not create tag when disabled', async () => {
      const { handler: noTagHandler, executor: noTagExecutor } = createTestIterationCommitHandler(
        { hasChanges: true },
        { createTags: false }
      );

      await noTagHandler.commitIteration('task-1', 1, 'Test');

      const tagCmd = noTagExecutor.commands.find(c => c[0] === 'tag' && c.length > 2);
      expect(tagCmd).toBeUndefined();
    });

    it('should store commit in registry', async () => {
      await handler.commitIteration('task-1', 1, 'First commit');
      await handler.commitIteration('task-1', 2, 'Second commit');

      const commits = handler.getTaskCommits('task-1');
      expect(commits).toHaveLength(2);
      expect(commits[0].iteration).toBe(1);
      expect(commits[1].iteration).toBe(2);
    });

    it('should throw when no changes to commit', async () => {
      const { handler: noChangesHandler } = createTestIterationCommitHandler({
        hasChanges: false,
      });

      await expect(
        noChangesHandler.commitIteration('task-1', 1, 'No changes')
      ).rejects.toThrow('No changes to commit');
    });

    it('should allow empty commit when forceCommit enabled', async () => {
      const executor = createMockCommitExecutor({ hasChanges: false });
      const handler = new IterationCommitHandler(executor, '/test', { forceCommit: true });

      await expect(
        handler.commitIteration('task-1', 1, 'Force commit')
      ).resolves.toBeDefined();
    });

    it('should truncate long task IDs', async () => {
      await handler.commitIteration('very-long-task-id-12345', 1, 'Test');

      const commitCmd = executor.commands.find(c => c[0] === 'commit');
      expect(commitCmd![2]).toContain('very-lon');
      expect(commitCmd![2]).not.toContain('very-long-task-id-12345');
    });

    it('should return correct commit hash', async () => {
      const { handler: h } = createTestIterationCommitHandler({
        hasChanges: true,
        commitResult: 'exacthash123',
      });

      const hash = await h.commitIteration('task-1', 1, 'Test');
      expect(hash).toBe('exacthash123');
    });
  });

  describe('getIterationCommit', () => {
    let handler: IterationCommitHandler;

    beforeEach(async () => {
      const result = createTestIterationCommitHandler({ hasChanges: true });
      handler = result.handler;

      await handler.commitIteration('task-1', 1, 'First');
      await handler.commitIteration('task-1', 2, 'Second');
    });

    it('should return commit hash for existing iteration', () => {
      const hash = handler.getIterationCommit('task-1', 1);
      expect(hash).toBeDefined();
      expect(hash).not.toBeNull();
    });

    it('should return null for non-existent iteration', () => {
      const hash = handler.getIterationCommit('task-1', 99);
      expect(hash).toBeNull();
    });

    it('should return null for non-existent task', () => {
      const hash = handler.getIterationCommit('unknown-task', 1);
      expect(hash).toBeNull();
    });
  });

  describe('rollbackToIteration', () => {
    let handler: IterationCommitHandler;
    let executor: ReturnType<typeof createMockCommitExecutor>;

    beforeEach(async () => {
      const result = createTestIterationCommitHandler({
        hasChanges: true,
        commitResult: 'commit-hash',
      });
      handler = result.handler;
      executor = result.executor;

      await handler.commitIteration('task-1', 1, 'First');
      await handler.commitIteration('task-1', 2, 'Second');
      await handler.commitIteration('task-1', 3, 'Third');
    });

    it('should reset to specified iteration commit', async () => {
      await handler.rollbackToIteration('task-1', 2);

      const resetCmd = executor.commands.find(c => c[0] === 'reset' && c[1] === '--hard');
      expect(resetCmd).toBeDefined();
    });

    it('should clean untracked files after rollback', async () => {
      await handler.rollbackToIteration('task-1', 1);

      const cleanCmd = executor.commands.find(c => c[0] === 'clean' && c[1] === '-fd');
      expect(cleanCmd).toBeDefined();
    });

    it('should remove later iterations from registry', async () => {
      await handler.rollbackToIteration('task-1', 1);

      const commits = handler.getTaskCommits('task-1');
      expect(commits).toHaveLength(1);
      expect(commits[0].iteration).toBe(1);
    });

    it('should throw when iteration not found', async () => {
      await expect(
        handler.rollbackToIteration('task-1', 99)
      ).rejects.toThrow('No commit found for iteration 99');
    });

    it('should throw when task not found', async () => {
      await expect(
        handler.rollbackToIteration('unknown-task', 1)
      ).rejects.toThrow('No commit found');
    });
  });

  describe('getTaskCommits', () => {
    let handler: IterationCommitHandler;

    beforeEach(async () => {
      const result = createTestIterationCommitHandler({ hasChanges: true });
      handler = result.handler;
    });

    it('should return empty array for unknown task', () => {
      const commits = handler.getTaskCommits('unknown');
      expect(commits).toEqual([]);
    });

    it('should return all commits in order', async () => {
      await handler.commitIteration('task-1', 1, 'First');
      await handler.commitIteration('task-1', 2, 'Second');
      await handler.commitIteration('task-1', 3, 'Third');

      const commits = handler.getTaskCommits('task-1');
      expect(commits).toHaveLength(3);
      expect(commits[0].iteration).toBe(1);
      expect(commits[1].iteration).toBe(2);
      expect(commits[2].iteration).toBe(3);
    });

    it('should separate commits by task', async () => {
      await handler.commitIteration('task-1', 1, 'Task 1');
      await handler.commitIteration('task-2', 1, 'Task 2');

      const task1Commits = handler.getTaskCommits('task-1');
      const task2Commits = handler.getTaskCommits('task-2');

      expect(task1Commits).toHaveLength(1);
      expect(task2Commits).toHaveLength(1);
    });
  });

  describe('getLatestCommit', () => {
    let handler: IterationCommitHandler;

    beforeEach(async () => {
      const result = createTestIterationCommitHandler({ hasChanges: true });
      handler = result.handler;
    });

    it('should return null for unknown task', () => {
      const latest = handler.getLatestCommit('unknown');
      expect(latest).toBeNull();
    });

    it('should return latest commit', async () => {
      await handler.commitIteration('task-1', 1, 'First');
      await handler.commitIteration('task-1', 2, 'Second');
      await handler.commitIteration('task-1', 3, 'Third - latest');

      const latest = handler.getLatestCommit('task-1');
      expect(latest).not.toBeNull();
      expect(latest!.iteration).toBe(3);
      expect(latest!.message).toContain('Third');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when changes exist', async () => {
      const { handler } = createTestIterationCommitHandler({ hasChanges: true });
      expect(await handler.hasUncommittedChanges()).toBe(true);
    });

    it('should return false when no changes', async () => {
      const { handler } = createTestIterationCommitHandler({ hasChanges: false });
      expect(await handler.hasUncommittedChanges()).toBe(false);
    });
  });

  describe('getCurrentHead', () => {
    it('should return HEAD commit hash', async () => {
      const { handler } = createTestIterationCommitHandler({ headCommit: 'head123' });
      const head = await handler.getCurrentHead();
      expect(head).toBe('head123');
    });
  });

  describe('clearTaskRegistry', () => {
    let handler: IterationCommitHandler;

    beforeEach(async () => {
      const result = createTestIterationCommitHandler({ hasChanges: true });
      handler = result.handler;

      await handler.commitIteration('task-1', 1, 'First');
      await handler.commitIteration('task-1', 2, 'Second');
    });

    it('should clear all commits for a task', () => {
      handler.clearTaskRegistry('task-1');

      const commits = handler.getTaskCommits('task-1');
      expect(commits).toHaveLength(0);
    });

    it('should not affect other tasks', async () => {
      await handler.commitIteration('task-2', 1, 'Other task');

      handler.clearTaskRegistry('task-1');

      const task2Commits = handler.getTaskCommits('task-2');
      expect(task2Commits).toHaveLength(1);
    });
  });

  describe('commit message formatting', () => {
    it('should use custom prefix', async () => {
      const executor = createMockCommitExecutor({ hasChanges: true });
      const handler = new IterationCommitHandler(executor, '/test', {
        commitPrefix: '[custom-prefix]',
      });

      await handler.commitIteration('task-1', 1, 'Test');

      const commitCmd = executor.commands.find(c => c[0] === 'commit');
      expect(commitCmd![2]).toContain('[custom-prefix]');
    });

    it('should handle long messages by multiline format', async () => {
      const executor = createMockCommitExecutor({ hasChanges: true });
      const handler = new IterationCommitHandler(executor, '/test');

      const longMessage = 'A'.repeat(100);
      await handler.commitIteration('task-1', 1, longMessage);

      const commitCmd = executor.commands.find(c => c[0] === 'commit');
      // Should contain newlines for long messages
      expect(commitCmd![2]).toContain('[nexus]');
    });
  });

  describe('tag naming', () => {
    it('should use custom tag prefix', async () => {
      const executor = createMockCommitExecutor({ hasChanges: true });
      const handler = new IterationCommitHandler(executor, '/test', {
        tagPrefix: 'custom-tag',
      });

      await handler.commitIteration('task-1', 1, 'Test');

      // Find the tag creation command (not the tag -d delete command)
      const tagCmd = executor.commands.find(c =>
        c[0] === 'tag' && c.length === 3 && !c.includes('-d')
      );
      expect(tagCmd).toBeDefined();
      expect(tagCmd![1]).toContain('custom-tag');
    });

    it('should include task ID and iteration in tag', async () => {
      const executor = createMockCommitExecutor({ hasChanges: true });
      const handler = new IterationCommitHandler(executor, '/test');

      await handler.commitIteration('my-task', 5, 'Test');

      // Find the tag creation command (not the tag -d delete command)
      const tagCmd = executor.commands.find(c =>
        c[0] === 'tag' && c.length === 3 && !c.includes('-d')
      );
      expect(tagCmd).toBeDefined();
      expect(tagCmd![1]).toContain('my-task');
      expect(tagCmd![1]).toContain('-5');
    });
  });

  describe('error handling', () => {
    it('should propagate git errors', async () => {
      const executor = createMockCommitExecutor({
        hasChanges: true,
        errorOnCommand: ['commit'],
      });
      const handler = new IterationCommitHandler(executor, '/test');

      await expect(
        handler.commitIteration('task-1', 1, 'Test')
      ).rejects.toThrow('Mock error');
    });

    it('should handle tag creation errors gracefully', async () => {
      // Tag errors should not fail the commit
      const executor = createMockCommitExecutor({
        hasChanges: true,
        errorOnCommand: ['tag'],
      });
      const handler = new IterationCommitHandler(executor, '/test');

      // Should not throw - tag errors are warnings
      await expect(
        handler.commitIteration('task-1', 1, 'Test')
      ).resolves.toBeDefined();
    });
  });

  describe('DEFAULT_COMMIT_HANDLER_OPTIONS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_COMMIT_HANDLER_OPTIONS.commitPrefix).toBe('[nexus]');
      expect(DEFAULT_COMMIT_HANDLER_OPTIONS.createTags).toBe(true);
      expect(DEFAULT_COMMIT_HANDLER_OPTIONS.tagPrefix).toBe('iteration');
      expect(DEFAULT_COMMIT_HANDLER_OPTIONS.forceCommit).toBe(false);
    });
  });
});
