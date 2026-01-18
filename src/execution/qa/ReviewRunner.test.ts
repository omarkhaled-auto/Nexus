/**
 * ReviewRunner Tests
 *
 * Tests for the AI-powered code review runner that powers
 * the review step in RalphStyleIterator's QA pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ReviewRunner,
  createReviewRunner,
  createReviewCallback,
  DEFAULT_REVIEW_CONFIG,
} from './ReviewRunner';
import type { ReviewResult } from '../iteration/types';

// ============================================================================
// Mock Types
// ============================================================================

interface MockGeminiClient {
  chat: ReturnType<typeof vi.fn>;
}

interface MockGitService {
  diff: ReturnType<typeof vi.fn>;
}

// ============================================================================
// Mock Factories
// ============================================================================

function createMockGeminiClient(): MockGeminiClient {
  return {
    chat: vi.fn(),
  };
}

function createMockGitService(): MockGitService {
  return {
    diff: vi.fn(),
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('ReviewRunner', () => {
  let mockGeminiClient: MockGeminiClient;
  let mockGitService: MockGitService;
  let runner: ReviewRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = createMockGeminiClient();
    mockGitService = createMockGitService();
    runner = new ReviewRunner(
      mockGeminiClient as any,
      mockGitService as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration when no config provided', () => {
      const runner = new ReviewRunner(
        mockGeminiClient as any,
        mockGitService as any
      );

      // Config is private, but we can verify behavior
      expect(runner).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const runner = new ReviewRunner(
        mockGeminiClient as any,
        mockGitService as any,
        {
          timeout: 60000,
          maxDiffSize: 25000,
          includeSuggestions: false,
          additionalCriteria: ['Check for accessibility'],
        }
      );

      expect(runner).toBeDefined();
    });
  });

  describe('run', () => {
    it('should return approval when review passes with no blockers', async () => {
      const mockDiff = `diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
+// New comment
 export function test() {}`;

      mockGitService.diff.mockResolvedValueOnce(mockDiff).mockResolvedValueOnce('');

      const mockResponse = JSON.stringify({
        approved: true,
        comments: ['Code looks good'],
        suggestions: ['Consider adding tests'],
        blockers: [],
      });

      mockGeminiClient.chat.mockResolvedValueOnce({ content: mockResponse });

      const result = await runner.run('/test/path');

      expect(result.approved).toBe(true);
      expect(result.comments).toEqual(['Code looks good']);
      expect(result.suggestions).toEqual(['Consider adding tests']);
      expect(result.blockers).toEqual([]);
    });

    it('should return rejection when review has blockers', async () => {
      const mockDiff = 'diff --git a/src/test.ts b/src/test.ts';

      mockGitService.diff.mockResolvedValueOnce(mockDiff).mockResolvedValueOnce('');

      const mockResponse = JSON.stringify({
        approved: false,
        comments: [],
        suggestions: [],
        blockers: ['Missing error handling', 'Security vulnerability detected'],
      });

      mockGeminiClient.chat.mockResolvedValueOnce({ content: mockResponse });

      const result = await runner.run('/test/path');

      expect(result.approved).toBe(false);
      expect(result.blockers).toHaveLength(2);
      expect(result.blockers).toContain('Missing error handling');
      expect(result.blockers).toContain('Security vulnerability detected');
    });

    it('should approve when there are no changes to review', async () => {
      mockGitService.diff.mockResolvedValueOnce('').mockResolvedValueOnce('');

      const result = await runner.run('/test/path');

      expect(result.approved).toBe(true);
      expect(result.comments).toEqual(['No changes to review']);
      expect(mockGeminiClient.chat).not.toHaveBeenCalled();
    });

    it('should combine staged and unstaged diffs', async () => {
      const stagedDiff = 'diff --git a/staged.ts';
      const unstagedDiff = 'diff --git b/unstaged.ts';

      mockGitService.diff
        .mockResolvedValueOnce(stagedDiff)
        .mockResolvedValueOnce(unstagedDiff);

      mockGeminiClient.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          approved: true,
          comments: [],
          suggestions: [],
          blockers: [],
        }),
      });

      await runner.run('/test/path');

      // System prompt is now passed as a message with role 'system'
      expect(mockGeminiClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('staged.ts'),
          }),
        ])
      );
    });

    it('should handle GitService errors gracefully', async () => {
      mockGitService.diff.mockRejectedValueOnce(new Error('Git error'));

      const result = await runner.run('/test/path');

      expect(result.approved).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('Review failed');
      expect(result.blockers[0]).toContain('Git error');
    });

    it('should handle GeminiClient errors gracefully', async () => {
      mockGitService.diff.mockResolvedValueOnce('diff').mockResolvedValueOnce('');
      mockGeminiClient.chat.mockRejectedValueOnce(new Error('API error'));

      const result = await runner.run('/test/path');

      expect(result.approved).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('Review failed');
      expect(result.blockers[0]).toContain('API error');
    });

    it('should include task context in review prompt', async () => {
      mockGitService.diff.mockResolvedValueOnce('diff content').mockResolvedValueOnce('');
      mockGeminiClient.chat.mockResolvedValueOnce({
        content: JSON.stringify({ approved: true, comments: [], suggestions: [], blockers: [] }),
      });

      await runner.run('/test/path', {
        taskId: 'task-123',
        taskDescription: 'Implement user authentication',
        acceptanceCriteria: ['Users can log in', 'Sessions persist'],
      });

      // System prompt is now passed as a message with role 'system'
      expect(mockGeminiClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Implement user authentication'),
          }),
        ])
      );
    });

    it('should truncate large diffs', async () => {
      const largeDiff = 'a'.repeat(DEFAULT_REVIEW_CONFIG.maxDiffSize + 10000);

      mockGitService.diff.mockResolvedValueOnce(largeDiff).mockResolvedValueOnce('');
      mockGeminiClient.chat.mockResolvedValueOnce({
        content: JSON.stringify({ approved: true, comments: [], suggestions: [], blockers: [] }),
      });

      await runner.run('/test/path');

      // First message is system prompt, second is user message with the diff
      const callArgs = mockGeminiClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((msg: { role: string }) => msg.role === 'user');
      expect(userMessage.content).toContain('DIFF TRUNCATED');
    });
  });

  describe('parseReviewResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        approved: true,
        comments: ['Good code'],
        suggestions: ['Add types'],
        blockers: [],
      });

      const result = runner.parseReviewResponse(response);

      expect(result.approved).toBe(true);
      expect(result.comments).toEqual(['Good code']);
      expect(result.suggestions).toEqual(['Add types']);
      expect(result.blockers).toEqual([]);
    });

    it('should extract JSON from markdown code blocks', () => {
      const response = `Here's my review:

\`\`\`json
{
  "approved": false,
  "comments": ["Needs work"],
  "suggestions": [],
  "blockers": ["Missing tests"]
}
\`\`\`

Let me know if you have questions.`;

      const result = runner.parseReviewResponse(response);

      expect(result.approved).toBe(false);
      expect(result.blockers).toEqual(['Missing tests']);
    });

    it('should handle JSON without code block markers', () => {
      const response = `Some text before {"approved": true, "comments": [], "suggestions": [], "blockers": []} some text after`;

      const result = runner.parseReviewResponse(response);

      expect(result.approved).toBe(true);
    });

    it('should return failure result for invalid JSON', () => {
      const response = 'This is not valid JSON at all';

      const result = runner.parseReviewResponse(response);

      expect(result.approved).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('Failed to parse');
    });

    it('should handle missing fields with defaults', () => {
      const response = JSON.stringify({
        approved: true,
        // Missing comments, suggestions, blockers
      });

      const result = runner.parseReviewResponse(response);

      expect(result.approved).toBe(true);
      expect(result.comments).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.blockers).toEqual([]);
    });

    it('should filter non-string values from arrays', () => {
      const response = JSON.stringify({
        approved: true,
        comments: ['valid', 123, null, 'also valid'],
        suggestions: [true, 'suggestion'],
        blockers: [undefined, 'blocker'],
      });

      const result = runner.parseReviewResponse(response);

      expect(result.comments).toEqual(['valid', 'also valid']);
      expect(result.suggestions).toEqual(['suggestion']);
      expect(result.blockers).toEqual(['blocker']);
    });
  });

  describe('createCallback', () => {
    it('should return a function compatible with QARunner interface', async () => {
      mockGitService.diff.mockResolvedValueOnce('').mockResolvedValueOnce('');

      const callback = runner.createCallback('/test/path');

      expect(typeof callback).toBe('function');

      const result = await callback('task-123');

      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('comments');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('blockers');
    });

    it('should use provided context in reviews', async () => {
      mockGitService.diff.mockResolvedValueOnce('diff').mockResolvedValueOnce('');
      mockGeminiClient.chat.mockResolvedValueOnce({
        content: JSON.stringify({ approved: true, comments: [], suggestions: [], blockers: [] }),
      });

      const callback = runner.createCallback('/test/path', {
        taskId: 'static-task',
        taskDescription: 'Static description',
      });

      await callback('override-task');

      // Task ID should be overridden, but description should be retained
      // System prompt is now passed as a message with role 'system'
      expect(mockGeminiClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Static description'),
          }),
        ])
      );
    });
  });

  describe('blockersToErrors', () => {
    it('should convert blockers to ErrorEntry format', () => {
      runner.setIteration(3);

      const blockers = ['Error 1', 'Error 2'];
      const errors = runner.blockersToErrors(blockers);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toEqual({
        type: 'review',
        severity: 'error',
        message: 'Error 1',
        iteration: 3,
      });
      expect(errors[1]).toEqual({
        type: 'review',
        severity: 'error',
        message: 'Error 2',
        iteration: 3,
      });
    });
  });

  describe('suggestionsToWarnings', () => {
    it('should convert suggestions to warning ErrorEntry format', () => {
      runner.setIteration(5);

      const suggestions = ['Suggestion 1', 'Suggestion 2'];
      const warnings = runner.suggestionsToWarnings(suggestions);

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toEqual({
        type: 'review',
        severity: 'warning',
        message: 'Suggestion 1',
        iteration: 5,
      });
    });
  });

  describe('setIteration', () => {
    it('should update iteration number for error tracking', () => {
      runner.setIteration(10);

      const errors = runner.blockersToErrors(['Test']);

      expect(errors[0].iteration).toBe(10);
    });
  });
});

describe('createReviewRunner', () => {
  it('should create ReviewRunner instance', () => {
    const mockGeminiClient = createMockGeminiClient();
    const mockGitService = createMockGitService();

    const runner = createReviewRunner(
      mockGeminiClient as any,
      mockGitService as any
    );

    expect(runner).toBeInstanceOf(ReviewRunner);
  });

  it('should pass config to ReviewRunner', () => {
    const mockGeminiClient = createMockGeminiClient();
    const mockGitService = createMockGitService();

    const runner = createReviewRunner(
      mockGeminiClient as any,
      mockGitService as any,
      { timeout: 30000 }
    );

    expect(runner).toBeInstanceOf(ReviewRunner);
  });
});

describe('createReviewCallback', () => {
  it('should create QARunner-compatible callback', async () => {
    const mockGeminiClient = createMockGeminiClient();
    const mockGitService = createMockGitService();

    mockGitService.diff.mockResolvedValue('');

    const callback = createReviewCallback(
      mockGeminiClient as any,
      mockGitService as any,
      '/test/path'
    );

    expect(typeof callback).toBe('function');

    const result = await callback('task-123');

    expect(result).toHaveProperty('approved');
  });
});
