// CodeReviewer Tests
// Phase 03-03: Quality Verification Layer - TDD RED Phase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeReviewer, ReviewError } from './CodeReviewer';
import type { LLMProvider } from '@/llm/LLMProvider';
import type { LLMResponse } from '@/llm';
import type { FileChange, ReviewResult } from '../types';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockLLMProvider(): LLMProvider {
  return {
    chat: vi.fn(),
    chatStream: vi.fn(),
    getUsageStats: vi.fn().mockReturnValue({
      byAgent: {},
      total: { tokens: 0, calls: 0, cost: 0 },
    }),
    resetUsageStats: vi.fn(),
    countTokens: vi.fn().mockReturnValue(100),
  } as unknown as LLMProvider;
}

function createLLMResponse(content: string, overrides: Partial<LLMResponse> = {}): LLMResponse {
  return {
    content,
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    },
    finishReason: 'stop',
    ...overrides,
  };
}

function createReviewResponse(review: ReviewResult): string {
  return JSON.stringify(review);
}

// ============================================================================
// CodeReviewer Tests
// ============================================================================

describe('CodeReviewer', () => {
  let llmProvider: LLMProvider;
  let reviewer: CodeReviewer;

  beforeEach(() => {
    llmProvider = createMockLLMProvider();
    reviewer = new CodeReviewer({ llmProvider });
  });

  describe('constructor', () => {
    it('should accept llmProvider', () => {
      const reviewer = new CodeReviewer({ llmProvider });
      expect(reviewer).toBeDefined();
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const reviewer = new CodeReviewer({ llmProvider, logger });
      expect(reviewer).toBeDefined();
    });
  });

  describe('review', () => {
    it('should return approved for clean code', async () => {
      const reviewResult: ReviewResult = {
        approved: true,
        hasBlockingIssues: false,
        issues: [],
        summary: 'Code looks good!',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const files: FileChange[] = [
        { path: 'src/index.ts', content: 'const x = 1;' },
      ];

      const result = await reviewer.review(files);

      expect(result.approved).toBe(true);
      expect(result.hasBlockingIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it('should call LLM with reviewer agent type', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(
          createReviewResponse({
            approved: true,
            hasBlockingIssues: false,
            issues: [],
            summary: 'OK',
          })
        )
      );

      const files: FileChange[] = [{ path: 'file.ts', content: 'code' }];
      await reviewer.review(files);

      expect(llmProvider.chat).toHaveBeenCalledWith(
        'reviewer',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should return issues for problematic code', async () => {
      const reviewResult: ReviewResult = {
        approved: false,
        hasBlockingIssues: true,
        issues: [
          {
            severity: 'critical',
            file: 'src/auth.ts',
            line: 10,
            message: 'SQL injection vulnerability detected',
            suggestion: 'Use parameterized queries',
          },
        ],
        summary: 'Found critical security issue',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const files: FileChange[] = [
        { path: 'src/auth.ts', content: 'db.query("SELECT * FROM users WHERE id = " + id)' },
      ];

      const result = await reviewer.review(files);

      expect(result.approved).toBe(false);
      expect(result.hasBlockingIssues).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual(
        expect.objectContaining({
          severity: 'critical',
          file: 'src/auth.ts',
          message: expect.stringContaining('SQL injection'),
        })
      );
    });

    it('should identify critical issues as blocking', async () => {
      const reviewResult: ReviewResult = {
        approved: false,
        hasBlockingIssues: true,
        issues: [
          {
            severity: 'critical',
            file: 'file.ts',
            message: 'Critical issue',
          },
        ],
        summary: 'Found critical issue',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const result = await reviewer.review([{ path: 'file.ts', content: 'code' }]);

      expect(result.hasBlockingIssues).toBe(true);
    });

    it('should identify major issues as blocking when more than 2', async () => {
      const reviewResult: ReviewResult = {
        approved: false,
        hasBlockingIssues: true,
        issues: [
          { severity: 'major', file: 'file.ts', message: 'Issue 1' },
          { severity: 'major', file: 'file.ts', message: 'Issue 2' },
          { severity: 'major', file: 'file.ts', message: 'Issue 3' },
        ],
        summary: 'Multiple major issues',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const result = await reviewer.review([{ path: 'file.ts', content: 'code' }]);

      expect(result.hasBlockingIssues).toBe(true);
    });

    it('should not block for minor issues only', async () => {
      const reviewResult: ReviewResult = {
        approved: true,
        hasBlockingIssues: false,
        issues: [
          { severity: 'minor', file: 'file.ts', message: 'Style issue' },
          { severity: 'suggestion', file: 'file.ts', message: 'Consider refactoring' },
        ],
        summary: 'Minor suggestions only',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const result = await reviewer.review([{ path: 'file.ts', content: 'code' }]);

      expect(result.approved).toBe(true);
      expect(result.hasBlockingIssues).toBe(false);
    });

    it('should include file content in LLM message', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(
          createReviewResponse({
            approved: true,
            hasBlockingIssues: false,
            issues: [],
            summary: 'OK',
          })
        )
      );

      const files: FileChange[] = [
        { path: 'src/file.ts', content: 'function test() {}' },
      ];

      await reviewer.review(files);

      expect(llmProvider.chat).toHaveBeenCalledWith(
        'reviewer',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('src/file.ts'),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should handle multiple files', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(
          createReviewResponse({
            approved: true,
            hasBlockingIssues: false,
            issues: [],
            summary: 'OK',
          })
        )
      );

      const files: FileChange[] = [
        { path: 'src/a.ts', content: 'const a = 1;' },
        { path: 'src/b.ts', content: 'const b = 2;' },
      ];

      await reviewer.review(files);

      expect(llmProvider.chat).toHaveBeenCalledWith(
        'reviewer',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('src/a.ts'),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should include diff when provided', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(
          createReviewResponse({
            approved: true,
            hasBlockingIssues: false,
            issues: [],
            summary: 'OK',
          })
        )
      );

      const files: FileChange[] = [
        {
          path: 'src/file.ts',
          content: 'const x = 2;',
          diff: '@@ -1 +1 @@\n-const x = 1;\n+const x = 2;',
        },
      ];

      await reviewer.review(files);

      expect(llmProvider.chat).toHaveBeenCalledWith(
        'reviewer',
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('@@'),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should throw ReviewError when LLM fails', async () => {
      vi.mocked(llmProvider.chat).mockRejectedValue(new Error('API error'));

      const files: FileChange[] = [{ path: 'file.ts', content: 'code' }];

      await expect(reviewer.review(files)).rejects.toThrow(ReviewError);
    });

    it('should handle malformed LLM response', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse('not valid json')
      );

      const files: FileChange[] = [{ path: 'file.ts', content: 'code' }];

      // Should not throw, but return a default failed review
      const result = await reviewer.review(files);
      expect(result.approved).toBe(false);
    });
  });

  describe('reviewDiff', () => {
    it('should review a git diff string', async () => {
      const reviewResult: ReviewResult = {
        approved: true,
        hasBlockingIssues: false,
        issues: [],
        summary: 'Diff looks good',
      };

      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(createReviewResponse(reviewResult))
      );

      const diff = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1 +1 @@
-const x = 1;
+const x = 2;`;

      const result = await reviewer.reviewDiff(diff);

      expect(result.approved).toBe(true);
    });

    it('should include diff in LLM message', async () => {
      vi.mocked(llmProvider.chat).mockResolvedValue(
        createLLMResponse(
          createReviewResponse({
            approved: true,
            hasBlockingIssues: false,
            issues: [],
            summary: 'OK',
          })
        )
      );

      const diff = 'diff content here';
      await reviewer.reviewDiff(diff);

      expect(llmProvider.chat).toHaveBeenCalledWith(
        'reviewer',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('diff content here'),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('error types', () => {
    it('should have ReviewError class', () => {
      const error = new ReviewError('Review failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ReviewError');
      expect(error.message).toBe('Review failed');
    });
  });
});
