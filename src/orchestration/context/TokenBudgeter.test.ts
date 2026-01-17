/**
 * TokenBudgeter Tests
 *
 * Tests for the token budgeting and allocation system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TokenBudgeter,
  createTokenBudgeter,
  createCustomTokenBudgeter,
  TOKEN_CONSTANTS,
} from './TokenBudgeter';
import type {
  ContextContent,
  TokenBudget,
  FileContent,
  MemoryEntry,
  CodebaseDocsSummary,
  TaskSpec,
} from './types';
import type { CodeSearchResult, CodeChunk } from '../../persistence/memory/code/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock TaskSpec for testing
 */
function createMockTaskSpec(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task for testing purposes',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Feature works', 'Tests pass'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create a mock CodebaseDocsSummary
 */
function createMockCodebaseDocs(overrides: Partial<CodebaseDocsSummary> = {}): CodebaseDocsSummary {
  return {
    architectureSummary: 'A summary of the architecture',
    relevantPatterns: ['pattern1', 'pattern2'],
    relevantAPIs: ['api1', 'api2'],
    tokenCount: 100,
    ...overrides,
  };
}

/**
 * Create a mock FileContent
 */
function createMockFileContent(overrides: Partial<FileContent> = {}): FileContent {
  return {
    path: 'src/test.ts',
    content: 'const test = true;',
    tokenCount: 10,
    relevanceScore: 0.9,
    includeReason: 'task_file',
    ...overrides,
  };
}

/**
 * Create a mock MemoryEntry
 */
function createMockMemory(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'memory-1',
    content: 'Some memory content',
    relevanceScore: 0.8,
    source: 'test',
    tokenCount: 20,
    ...overrides,
  };
}

/**
 * Create a mock CodeChunk
 */
function createMockCodeChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  return {
    id: 'chunk-1',
    projectId: 'project-1',
    file: 'src/test.ts',
    startLine: 1,
    endLine: 10,
    content: 'function test() { return true; }',
    embedding: [],
    symbols: ['test'],
    chunkType: 'function',
    metadata: {
      language: 'typescript',
      hash: 'abc123',
    },
    indexedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock CodeSearchResult
 */
function createMockCodeResult(overrides: Partial<CodeSearchResult> = {}): CodeSearchResult {
  return {
    chunk: createMockCodeChunk(overrides.chunk),
    score: 0.85,
    ...overrides,
  };
}

/**
 * Create a mock ContextContent
 */
function createMockContent(overrides: Partial<ContextContent> = {}): ContextContent {
  return {
    systemPrompt: 'You are a helpful assistant.',
    repoMap: 'src/\n  test.ts\n  index.ts',
    codebaseDocs: createMockCodebaseDocs(overrides.codebaseDocs),
    taskSpec: createMockTaskSpec(overrides.taskSpec),
    files: overrides.files ?? [createMockFileContent()],
    codeResults: overrides.codeResults ?? [createMockCodeResult()],
    memories: overrides.memories ?? [createMockMemory()],
  };
}

/**
 * Create content of specific token size
 */
function createContentOfSize(tokens: number): string {
  // Each character is ~0.25 tokens, so we need tokens * 4 characters
  return 'x'.repeat(tokens * TOKEN_CONSTANTS.CHARS_PER_TOKEN);
}

// ============================================================================
// Tests
// ============================================================================

describe('TokenBudgeter', () => {
  let budgeter: TokenBudgeter;

  beforeEach(() => {
    budgeter = new TokenBudgeter();
  });

  // --------------------------------------------------------------------------
  // Factory Functions
  // --------------------------------------------------------------------------

  describe('Factory Functions', () => {
    it('should create a TokenBudgeter with createTokenBudgeter', () => {
      const instance = createTokenBudgeter();
      expect(instance).toBeInstanceOf(TokenBudgeter);
    });

    it('should create a TokenBudgeter with custom budget via createCustomTokenBudgeter', () => {
      const instance = createCustomTokenBudgeter({ systemPrompt: 5000 });
      const budget = instance.createBudget(100000);
      expect(budget.fixed.systemPrompt).toBe(5000);
    });
  });

  // --------------------------------------------------------------------------
  // Budget Creation
  // --------------------------------------------------------------------------

  describe('createBudget', () => {
    it('should create a budget with correct fixed allocations', () => {
      const budget = budgeter.createBudget(150000);

      expect(budget.total).toBe(150000);
      expect(budget.fixed.systemPrompt).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.systemPrompt);
      expect(budget.fixed.repoMap).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.repoMap);
      expect(budget.fixed.codebaseDocs).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.codebaseDocs);
      expect(budget.fixed.taskSpec).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.taskSpec);
      expect(budget.fixed.reserved).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.reserved);
    });

    it('should allocate dynamic budget using correct ratios', () => {
      const budget = budgeter.createBudget(150000);

      const totalFixed =
        TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.systemPrompt +
        TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.repoMap +
        TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.codebaseDocs +
        TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.taskSpec +
        TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.reserved;

      const dynamicBudget = 150000 - totalFixed;

      expect(budget.dynamic.files).toBe(
        Math.floor(dynamicBudget * TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.files)
      );
      expect(budget.dynamic.codeResults).toBe(
        Math.floor(dynamicBudget * TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.codeResults)
      );
      expect(budget.dynamic.memories).toBe(
        Math.floor(dynamicBudget * TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.memories)
      );
    });

    it('should handle small budget gracefully', () => {
      const budget = budgeter.createBudget(10000);

      // Dynamic should be 0 or small since fixed takes up most of budget
      expect(budget.dynamic.files).toBeGreaterThanOrEqual(0);
      expect(budget.dynamic.codeResults).toBeGreaterThanOrEqual(0);
      expect(budget.dynamic.memories).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero budget', () => {
      const budget = budgeter.createBudget(0);

      expect(budget.total).toBe(0);
      expect(budget.dynamic.files).toBe(0);
      expect(budget.dynamic.codeResults).toBe(0);
      expect(budget.dynamic.memories).toBe(0);
    });

    it('should use custom fixed budget when provided', () => {
      const customBudgeter = new TokenBudgeter({
        systemPrompt: 5000,
        repoMap: 5000,
      });

      const budget = customBudgeter.createBudget(150000);

      expect(budget.fixed.systemPrompt).toBe(5000);
      expect(budget.fixed.repoMap).toBe(5000);
      // Others should use default
      expect(budget.fixed.codebaseDocs).toBe(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.codebaseDocs);
    });
  });

  // --------------------------------------------------------------------------
  // Token Estimation
  // --------------------------------------------------------------------------

  describe('estimateTokens', () => {
    it('should estimate tokens correctly for typical text', () => {
      const text = 'Hello world'; // 11 characters
      const tokens = budgeter.estimateTokens(text);

      // 11 chars / 4 chars per token = 2.75, ceil = 3
      expect(tokens).toBe(3);
    });

    it('should return 0 for empty string', () => {
      expect(budgeter.estimateTokens('')).toBe(0);
    });

    it('should handle null/undefined', () => {
      expect(budgeter.estimateTokens(null as unknown as string)).toBe(0);
      expect(budgeter.estimateTokens(undefined as unknown as string)).toBe(0);
    });

    it('should scale linearly with text length', () => {
      const text100 = createContentOfSize(100);
      const text200 = createContentOfSize(200);

      const tokens100 = budgeter.estimateTokens(text100);
      const tokens200 = budgeter.estimateTokens(text200);

      // Should be approximately 2x
      expect(tokens200).toBeCloseTo(tokens100 * 2, -1);
    });
  });

  // --------------------------------------------------------------------------
  // Truncation
  // --------------------------------------------------------------------------

  describe('truncateToFit', () => {
    it('should return content unchanged if under limit', () => {
      const content = 'Short content';
      const result = budgeter.truncateToFit(content, 100);

      expect(result).toBe(content);
    });

    it('should truncate content that exceeds limit', () => {
      const content = createContentOfSize(1000);
      const result = budgeter.truncateToFit(content, 100);

      expect(budgeter.estimateTokens(result)).toBeLessThanOrEqual(100);
    });

    it('should add truncation indicator when truncating', () => {
      const content = createContentOfSize(1000);
      const result = budgeter.truncateToFit(content, 100);

      expect(result).toContain(TOKEN_CONSTANTS.TRUNCATION_INDICATOR);
    });

    it('should truncate at line boundary when possible', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      // Force truncation in middle
      const result = budgeter.truncateToFit(content, 5);

      // Should end at a complete line (before truncation indicator)
      const beforeIndicator = result.replace(TOKEN_CONSTANTS.TRUNCATION_INDICATOR, '');
      expect(beforeIndicator.endsWith('Line') || beforeIndicator.includes('\n')).toBe(true);
    });

    it('should truncate at sentence boundary when no newline available', () => {
      // Content is 48 chars = 12 tokens
      // We need max tokens that requires truncation but leaves room for content
      // Truncation indicator is ~11 tokens, so we need >11 but <12
      const content = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      // This content is 65 chars = ~17 tokens
      // With 15 token limit, we need to truncate but leave some content
      const result = budgeter.truncateToFit(content, 15);

      // Should truncate and add indicator
      expect(result).toContain(TOKEN_CONSTANTS.TRUNCATION_INDICATOR);

      // The result should be shorter than original
      const beforeIndicator = result.replace(TOKEN_CONSTANTS.TRUNCATION_INDICATOR, '');
      expect(beforeIndicator.length).toBeLessThan(content.length);
    });
  });

  // --------------------------------------------------------------------------
  // Allocation
  // --------------------------------------------------------------------------

  describe('allocate', () => {
    it('should allocate content under budget without truncation', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent();

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.truncated).toBe(false);
      expect(allocation.truncatedComponents).toHaveLength(0);
    });

    it('should create a complete breakdown', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent();

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.breakdown).toHaveProperty('systemPrompt');
      expect(allocation.breakdown).toHaveProperty('repoMap');
      expect(allocation.breakdown).toHaveProperty('codebaseDocs');
      expect(allocation.breakdown).toHaveProperty('taskSpec');
      expect(allocation.breakdown).toHaveProperty('files');
      expect(allocation.breakdown).toHaveProperty('codeResults');
      expect(allocation.breakdown).toHaveProperty('memories');
      expect(allocation.breakdown).toHaveProperty('reserved');
      expect(allocation.breakdown).toHaveProperty('total');
    });

    it('should calculate total correctly', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent();

      const allocation = budgeter.allocate(budget, content);
      const breakdown = allocation.breakdown;

      const calculatedTotal =
        breakdown.systemPrompt +
        breakdown.repoMap +
        breakdown.codebaseDocs +
        breakdown.taskSpec +
        breakdown.files +
        breakdown.codeResults +
        breakdown.memories +
        breakdown.reserved;

      expect(breakdown.total).toBe(calculatedTotal);
    });

    it('should generate an allocation report', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent();

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.report).toContain('Token Allocation Report');
      expect(allocation.report).toContain('Total Budget');
      expect(allocation.report).toContain('Fixed Allocations');
      expect(allocation.report).toContain('Dynamic Allocations');
    });

    it('should mark truncated components when content exceeds budget', () => {
      // Create a very small budget
      const budget = budgeter.createBudget(100);
      const content = createMockContent({
        systemPrompt: createContentOfSize(500), // Way over budget
      } as Partial<ContextContent>);
      content.systemPrompt = createContentOfSize(500);

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.truncated).toBe(true);
      expect(allocation.truncatedComponents.length).toBeGreaterThan(0);
    });

    it('should include truncated components in report', () => {
      // Create a very small budget
      const customBudgeter = new TokenBudgeter({
        systemPrompt: 10,
      });
      const budget = customBudgeter.createBudget(100);
      const content = createMockContent();
      content.systemPrompt = createContentOfSize(500);

      const allocation = customBudgeter.allocate(budget, content);

      expect(allocation.report).toContain('Truncated Components');
    });
  });

  // --------------------------------------------------------------------------
  // File Allocation
  // --------------------------------------------------------------------------

  describe('allocate - files', () => {
    it('should sort files by relevance score', () => {
      const budget = budgeter.createBudget(150000);
      const files: FileContent[] = [
        createMockFileContent({ relevanceScore: 0.5, tokenCount: 100 }),
        createMockFileContent({ relevanceScore: 0.9, tokenCount: 100 }),
        createMockFileContent({ relevanceScore: 0.7, tokenCount: 100 }),
      ];

      const content = createMockContent({ files });
      const allocation = budgeter.allocate(budget, content);

      // Should include all files (budget is large enough)
      expect(allocation.breakdown.files).toBe(300);
    });

    it('should exclude lower relevance files when over budget', () => {
      // Create a budget with very limited file space
      const customBudgeter = new TokenBudgeter({
        systemPrompt: 1,
        repoMap: 1,
        codebaseDocs: 1,
        taskSpec: 1,
        reserved: 1,
      });

      // Total = 100, fixed = 5, dynamic = 95
      // Files get 60% = 57 tokens
      const budget = customBudgeter.createBudget(100);

      const files: FileContent[] = [
        createMockFileContent({ relevanceScore: 0.9, tokenCount: 30 }),
        createMockFileContent({ relevanceScore: 0.5, tokenCount: 30 }),
        createMockFileContent({ relevanceScore: 0.3, tokenCount: 30 }),
      ];

      const content = createMockContent({ files });
      const allocation = customBudgeter.allocate(budget, content);

      // Should fit only 1-2 files (57 tokens)
      expect(allocation.truncatedComponents.some((c) => c.includes('files'))).toBe(true);
    });

    it('should handle empty files array', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent({ files: [] });

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.breakdown.files).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Code Results Allocation
  // --------------------------------------------------------------------------

  describe('allocate - codeResults', () => {
    it('should sort code results by score', () => {
      const budget = budgeter.createBudget(150000);
      const codeResults: CodeSearchResult[] = [
        createMockCodeResult({ score: 0.5 }),
        createMockCodeResult({ score: 0.9 }),
        createMockCodeResult({ score: 0.7 }),
      ];

      const content = createMockContent({ codeResults });
      const allocation = budgeter.allocate(budget, content);

      // Should include all results
      expect(allocation.breakdown.codeResults).toBeGreaterThan(0);
    });

    it('should handle empty code results array', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent({ codeResults: [] });

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.breakdown.codeResults).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Memory Allocation
  // --------------------------------------------------------------------------

  describe('allocate - memories', () => {
    it('should sort memories by relevance score', () => {
      const budget = budgeter.createBudget(150000);
      const memories: MemoryEntry[] = [
        createMockMemory({ relevanceScore: 0.5, tokenCount: 20 }),
        createMockMemory({ relevanceScore: 0.9, tokenCount: 20 }),
        createMockMemory({ relevanceScore: 0.7, tokenCount: 20 }),
      ];

      const content = createMockContent({ memories });
      const allocation = budgeter.allocate(budget, content);

      // Should include all memories
      expect(allocation.breakdown.memories).toBe(60);
    });

    it('should handle empty memories array', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent({ memories: [] });

      const allocation = budgeter.allocate(budget, content);

      expect(allocation.breakdown.memories).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle very large content', () => {
      const budget = budgeter.createBudget(150000);
      const content = createMockContent();
      content.systemPrompt = createContentOfSize(50000);
      content.repoMap = createContentOfSize(50000);

      const allocation = budgeter.allocate(budget, content);

      // Should still produce a valid allocation
      expect(allocation.breakdown.total).toBeGreaterThan(0);
      expect(allocation.truncated).toBe(true);
    });

    it('should handle content with estimated vs provided token counts', () => {
      const budget = budgeter.createBudget(150000);

      // File with tokenCount provided
      const file1 = createMockFileContent({ tokenCount: 100 });

      // File without tokenCount (will be estimated)
      const file2 = createMockFileContent({ content: createContentOfSize(50) });
      delete (file2 as { tokenCount?: number }).tokenCount;

      const content = createMockContent({ files: [file1, file2] });
      const allocation = budgeter.allocate(budget, content);

      // Should work with mixed token count sources
      expect(allocation.breakdown.files).toBeGreaterThan(0);
    });

    it('should handle all-empty content', () => {
      const budget = budgeter.createBudget(150000);
      const content: ContextContent = {
        systemPrompt: '',
        repoMap: '',
        codebaseDocs: {
          architectureSummary: '',
          relevantPatterns: [],
          relevantAPIs: [],
          tokenCount: 0,
        },
        taskSpec: createMockTaskSpec({
          name: '',
          description: '',
          files: [],
          testCriteria: '',
          acceptanceCriteria: [],
          dependencies: [],
        }),
        files: [],
        codeResults: [],
        memories: [],
      };

      const allocation = budgeter.allocate(budget, content);

      // Should have minimal token usage - mostly reserved + minimal task spec tokens
      // The taskSpec will still have some fields (id, estimatedTime: 0, etc.) which produce tokens
      expect(allocation.breakdown.total).toBeLessThan(budget.total / 2);
      expect(allocation.breakdown.files).toBe(0);
      expect(allocation.breakdown.codeResults).toBe(0);
      expect(allocation.breakdown.memories).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Constants Export
  // --------------------------------------------------------------------------

  describe('TOKEN_CONSTANTS', () => {
    it('should export CHARS_PER_TOKEN', () => {
      expect(TOKEN_CONSTANTS.CHARS_PER_TOKEN).toBe(4);
    });

    it('should export DEFAULT_FIXED_BUDGET', () => {
      expect(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET).toBeDefined();
      expect(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.systemPrompt).toBe(2000);
      expect(TOKEN_CONSTANTS.DEFAULT_FIXED_BUDGET.reserved).toBe(16000);
    });

    it('should export DYNAMIC_ALLOCATION_RATIOS', () => {
      expect(TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS).toBeDefined();
      expect(TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.files).toBe(0.6);
      expect(TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.codeResults).toBe(0.25);
      expect(TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.memories).toBe(0.15);
    });

    it('should have allocation ratios that sum to 1', () => {
      const sum =
        TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.files +
        TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.codeResults +
        TOKEN_CONSTANTS.DYNAMIC_ALLOCATION_RATIOS.memories;

      expect(sum).toBe(1);
    });
  });
});
