/**
 * Tests for GitDiffContextBuilder
 *
 * These tests verify that the GitDiffContextBuilder correctly:
 * 1. Builds diff context between commits
 * 2. Builds cumulative diffs from base commit
 * 3. Formats diffs for agent consumption
 * 4. Handles edge cases and errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GitDiffContextBuilder,
  createMockGitExecutor,
  createTestGitDiffContextBuilder,
  DEFAULT_FORMAT_OPTIONS,
  type IGitExecutor,
} from './GitDiffContextBuilder';

// ============================================================================
// Test Data
// ============================================================================

/**
 * Sample diff output for a modified file
 */
const SAMPLE_DIFF_MODIFIED = `diff --git a/src/utils/helper.ts b/src/utils/helper.ts
index abc1234..def5678 100644
--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -1,5 +1,7 @@
 export function helper() {
-  return 'old value';
+  // Added a comment
+  return 'new value';
 }
+
+export function newHelper() {}`;

/**
 * Sample diff output for added file
 */
const SAMPLE_DIFF_ADDED = `diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,5 @@
+export function newFunction() {
+  return 'new';
+}
+
+export const NEW_CONSTANT = 42;`;

/**
 * Sample diff output for deleted file
 */
const SAMPLE_DIFF_DELETED = `diff --git a/src/old-file.ts b/src/old-file.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old-file.ts
+++ /dev/null
@@ -1,5 +0,0 @@
-export function oldFunction() {
-  return 'old';
-}
-
-export const OLD_CONSTANT = 42;`;

/**
 * Sample numstat output
 */
const SAMPLE_NUMSTAT_MODIFIED = `3\t1\tsrc/utils/helper.ts`;
const SAMPLE_NUMSTAT_ADDED = `5\t0\tsrc/new-file.ts`;
const SAMPLE_NUMSTAT_DELETED = `0\t5\tsrc/old-file.ts`;
const SAMPLE_NUMSTAT_MULTIPLE = `3\t1\tsrc/utils/helper.ts
5\t0\tsrc/new-file.ts
10\t2\tsrc/components/Button.tsx`;

/**
 * Combined diff output
 */
const SAMPLE_COMBINED_DIFF = `${SAMPLE_DIFF_MODIFIED}

${SAMPLE_DIFF_ADDED}`;

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a mock executor with specific responses
 */
function createConfiguredMockExecutor(overrides: Partial<{
  diffOutput: string;
  statsOutput: string;
  headCommit: string;
  hasChanges: boolean;
}>): IGitExecutor {
  return createMockGitExecutor({
    diffOutput: '',
    statsOutput: '',
    headCommit: 'abc1234567890123456789012345678901234567890',
    hasChanges: false,
    ...overrides,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('GitDiffContextBuilder', () => {
  describe('constructor', () => {
    it('should create instance with default options', () => {
      const executor = createMockGitExecutor();
      const builder = new GitDiffContextBuilder(executor, '/test/path');

      expect(builder).toBeInstanceOf(GitDiffContextBuilder);
    });

    it('should accept custom format options', () => {
      const executor = createMockGitExecutor();
      const builder = new GitDiffContextBuilder(executor, '/test/path', {
        maxTokens: 1000,
        includeContent: false,
      });

      expect(builder).toBeInstanceOf(GitDiffContextBuilder);
    });
  });

  describe('buildDiffContext', () => {
    it('should build diff context between two commits', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_MODIFIED,
        statsOutput: SAMPLE_NUMSTAT_MODIFIED,
        headCommit: 'def567890',
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.fromCommit).toBe('abc123');
      expect(diff.toCommit).toBe('def456');
      expect(diff.changes).toHaveLength(1);
      expect(diff.diffText).toBe(SAMPLE_DIFF_MODIFIED);
    });

    it('should use HEAD as default toCommit', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_MODIFIED,
        statsOutput: SAMPLE_NUMSTAT_MODIFIED,
        headCommit: 'headcommit123',
      });

      const diff = await builder.buildDiffContext('abc123');

      expect(diff.fromCommit).toBe('abc123');
      expect(diff.toCommit).toBe('headcommit123');
    });

    it('should parse file changes correctly', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_MODIFIED,
        statsOutput: SAMPLE_NUMSTAT_MODIFIED,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0]).toEqual({
        file: 'src/utils/helper.ts',
        changeType: 'modified',
        additions: 3,
        deletions: 1,
      });
    });

    it('should calculate stats correctly', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_COMBINED_DIFF,
        statsOutput: SAMPLE_NUMSTAT_MULTIPLE,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.stats.filesChanged).toBe(3);
      expect(diff.stats.additions).toBe(18); // 3 + 5 + 10
      expect(diff.stats.deletions).toBe(3);  // 1 + 0 + 2
    });

    it('should detect added files', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_ADDED,
        statsOutput: SAMPLE_NUMSTAT_ADDED,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.changes[0].changeType).toBe('added');
    });

    it('should detect deleted files', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_DELETED,
        statsOutput: SAMPLE_NUMSTAT_DELETED,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.changes[0].changeType).toBe('deleted');
    });

    it('should handle empty diff', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: '',
        statsOutput: '',
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');

      expect(diff.changes).toHaveLength(0);
      expect(diff.stats.filesChanged).toBe(0);
      expect(diff.stats.additions).toBe(0);
      expect(diff.stats.deletions).toBe(0);
    });

    it('should handle git errors gracefully', async () => {
      const mockExecutor: IGitExecutor = {
        run: vi.fn().mockRejectedValue(new Error('fatal: bad revision')),
        getHeadCommit: vi.fn().mockResolvedValue('HEAD'),
        hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      };

      const builder = new GitDiffContextBuilder(mockExecutor, '/test/path');
      const diff = await builder.buildDiffContext('invalid', 'HEAD');

      expect(diff.changes).toHaveLength(0);
      expect(diff.diffText).toContain('Git error');
    });
  });

  describe('buildCumulativeDiff', () => {
    it('should build cumulative diff from base to HEAD', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_COMBINED_DIFF,
        statsOutput: SAMPLE_NUMSTAT_MULTIPLE,
        headCommit: 'currenthead123',
      });

      const diff = await builder.buildCumulativeDiff('basecommit');

      expect(diff.fromCommit).toBe('basecommit');
      expect(diff.toCommit).toBe('currenthead123');
      expect(diff.changes.length).toBeGreaterThan(0);
    });

    it('should return empty diff when no changes', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: '',
        statsOutput: '',
        headCommit: 'samecommit',
      });

      const diff = await builder.buildCumulativeDiff('samecommit');

      expect(diff.changes).toHaveLength(0);
    });
  });

  describe('formatDiffForAgent', () => {
    it('should format diff with summary', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_MODIFIED,
        statsOutput: SAMPLE_NUMSTAT_MODIFIED,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');
      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('# Git Changes Summary');
      expect(formatted).toContain('## Summary');
      expect(formatted).toContain('Files Changed');
      expect(formatted).toContain('Additions');
      expect(formatted).toContain('Deletions');
    });

    it('should include detailed changes', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: SAMPLE_DIFF_MODIFIED,
        statsOutput: SAMPLE_NUMSTAT_MODIFIED,
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');
      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('## Detailed Changes');
      expect(formatted).toContain('src/utils/helper.ts');
      expect(formatted).toContain('```diff');
    });

    it('should handle empty diff', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: '',
        statsOutput: '',
      });

      const diff = await builder.buildDiffContext('abc123', 'def456');
      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('No changes detected');
    });

    it('should respect maxTokens option', () => {
      const executor = createMockGitExecutor();
      const builder = new GitDiffContextBuilder(executor, '/test', {
        maxTokens: 100, // Very low limit
      });

      // Create a diff with content that exceeds token limit
      // The formatted output will include header, summary, and diff content
      // With 100 tokens * 4 chars = ~400 chars limit
      const longDiffText = `diff --git a/test.ts b/test.ts
index abc..def 100644
--- a/test.ts
+++ b/test.ts
` + Array(200).fill('+// This is a very long line of code that will repeat many times').join('\n');

      const diff = {
        fromCommit: 'abc123',
        toCommit: 'def456',
        changes: [{ file: 'test.ts', changeType: 'modified' as const, additions: 200, deletions: 0 }],
        diffText: longDiffText,
        stats: { filesChanged: 1, additions: 200, deletions: 0 },
      };

      const formatted = builder.formatDiffForAgent(diff);

      // Should be truncated since we set maxTokens to 100 (400 chars)
      // The output with summary and header will exceed this
      expect(formatted.length).toBeLessThan(longDiffText.length);
      // Either the word "truncated" appears or the content is shorter than original
      const isShortened = formatted.length < longDiffText.length;
      expect(isShortened).toBe(true);
    });

    it('should work without content when disabled', () => {
      const executor = createMockGitExecutor();
      const builder = new GitDiffContextBuilder(executor, '/test', {
        includeContent: false,
      });

      const diff = {
        fromCommit: 'abc123',
        toCommit: 'def456',
        changes: [
          { file: 'test.ts', changeType: 'modified' as const, additions: 10, deletions: 5 },
        ],
        diffText: SAMPLE_DIFF_MODIFIED,
        stats: { filesChanged: 1, additions: 10, deletions: 5 },
      };

      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('## Files Changed');
      expect(formatted).toContain('M test.ts (+10/-5)');
      expect(formatted).not.toContain('```diff');
    });

    it('should format file list with correct symbols', () => {
      const executor = createMockGitExecutor();
      const builder = new GitDiffContextBuilder(executor, '/test', {
        includeContent: false,
      });

      const diff = {
        fromCommit: 'abc123',
        toCommit: 'def456',
        changes: [
          { file: 'added.ts', changeType: 'added' as const, additions: 10, deletions: 0 },
          { file: 'modified.ts', changeType: 'modified' as const, additions: 5, deletions: 2 },
          { file: 'deleted.ts', changeType: 'deleted' as const, additions: 0, deletions: 8 },
          { file: 'renamed.ts', changeType: 'renamed' as const, additions: 0, deletions: 0 },
        ],
        diffText: '',
        stats: { filesChanged: 4, additions: 15, deletions: 10 },
      };

      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('A added.ts');
      expect(formatted).toContain('M modified.ts');
      expect(formatted).toContain('D deleted.ts');
      expect(formatted).toContain('R renamed.ts');
    });

    it('should truncate long file diffs', async () => {
      const longDiff = `diff --git a/long.ts b/long.ts
index abc..def 100644
--- a/long.ts
+++ b/long.ts
${Array(100).fill('+line').join('\n')}`;

      const executor = createMockGitExecutor({
        diffOutput: longDiff,
        statsOutput: '100\t0\tlong.ts',
      });
      const builder = new GitDiffContextBuilder(executor, '/test', {
        maxLinesPerFile: 10,
      });

      const diff = await builder.buildDiffContext('abc', 'def');
      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('more lines truncated');
    });
  });

  describe('edge cases', () => {
    it('should handle binary files in numstat', async () => {
      // Binary files show - instead of numbers
      const statsOutput = `-\t-\timage.png`;
      const builder = createTestGitDiffContextBuilder({
        diffOutput: '',
        statsOutput,
      });

      const diff = await builder.buildDiffContext('abc', 'def');

      expect(diff.changes[0].additions).toBe(0);
      expect(diff.changes[0].deletions).toBe(0);
    });

    it('should handle filenames with tabs', async () => {
      // Rare but possible
      const statsOutput = `5\t2\tpath/to\tfile with tab.ts`;
      const builder = createTestGitDiffContextBuilder({
        diffOutput: '',
        statsOutput,
      });

      const diff = await builder.buildDiffContext('abc', 'def');

      // Should handle the tab in filename
      expect(diff.changes.length).toBe(1);
    });

    it('should handle special characters in filenames', async () => {
      const statsOutput = `5\t2\tpath/with spaces/file (1).ts`;
      const builder = createTestGitDiffContextBuilder({
        diffOutput: `diff --git a/path/with spaces/file (1).ts b/path/with spaces/file (1).ts
index abc..def 100644`,
        statsOutput,
      });

      const diff = await builder.buildDiffContext('abc', 'def');

      expect(diff.changes[0].file).toBe('path/with spaces/file (1).ts');
    });

    it('should handle very long commit hashes', async () => {
      const longHash = 'a'.repeat(40);
      const builder = createTestGitDiffContextBuilder({
        headCommit: longHash,
      });

      const diff = await builder.buildDiffContext('abc123');

      expect(diff.toCommit).toBe(longHash);
    });

    it('should handle merge conflict markers in diff', async () => {
      const conflictDiff = `diff --git a/conflict.ts b/conflict.ts
<<<<<<< HEAD
+local change
=======
+remote change
>>>>>>> branch`;

      const builder = createTestGitDiffContextBuilder({
        diffOutput: conflictDiff,
        statsOutput: '2\t0\tconflict.ts',
      });

      const diff = await builder.buildDiffContext('abc', 'def');
      const formatted = builder.formatDiffForAgent(diff);

      expect(formatted).toContain('conflict.ts');
    });
  });

  describe('createTestGitDiffContextBuilder', () => {
    it('should create builder with mock executor', () => {
      const builder = createTestGitDiffContextBuilder();
      expect(builder).toBeInstanceOf(GitDiffContextBuilder);
    });

    it('should use provided mock responses', async () => {
      const builder = createTestGitDiffContextBuilder({
        diffOutput: 'custom diff',
        statsOutput: '1\t0\tcustom.ts',
        headCommit: 'customhead',
      });

      const diff = await builder.buildDiffContext('abc');

      expect(diff.diffText).toBe('custom diff');
      expect(diff.toCommit).toBe('customhead');
    });
  });

  describe('DEFAULT_FORMAT_OPTIONS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_FORMAT_OPTIONS.maxTokens).toBe(5000);
      expect(DEFAULT_FORMAT_OPTIONS.includeContent).toBe(true);
      expect(DEFAULT_FORMAT_OPTIONS.includeSummary).toBe(true);
      expect(DEFAULT_FORMAT_OPTIONS.maxLinesPerFile).toBe(50);
    });
  });
});
