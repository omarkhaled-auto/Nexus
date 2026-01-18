/**
 * SearchRequestHandler Tests
 *
 * Tests for the semantic code search and symbol usage request handler.
 *
 * @module SearchRequestHandler.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchRequestHandler, createSearchRequestHandler } from './SearchRequestHandler';
import { ContextRequest } from '../types';
import type {
  ICodeMemory,
  CodeSearchResult,
  CodeChunk,
  CodeUsage,
  CodeSearchOptions,
} from '../../../../persistence/memory/code/types';

// ============================================================================
// Mock CodeMemory
// ============================================================================

function createMockCodeChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  return {
    id: 'chunk-1',
    projectId: 'test-project',
    file: '/mock/project/src/example.ts',
    startLine: 10,
    endLine: 25,
    content: 'export function handleRequest(req: Request): Response {\n  const data = processData(req.body);\n  return new Response(data);\n}',
    embedding: [0.1, 0.2, 0.3],
    symbols: ['handleRequest', 'processData'],
    chunkType: 'function',
    metadata: {
      language: 'typescript',
      complexity: 2,
      hash: 'abc123',
    },
    indexedAt: new Date(),
    ...overrides,
  };
}

function createMockSearchResult(
  chunk: CodeChunk,
  score: number = 0.85
): CodeSearchResult {
  return {
    chunk,
    score,
    highlights: ['handleRequest', 'processData'],
  };
}

function createMockCodeUsage(overrides: Partial<CodeUsage> = {}): CodeUsage {
  return {
    file: '/mock/project/src/consumer.ts',
    line: 20,
    column: 5,
    context: 'const result = handleRequest(req);',
    usageType: 'call',
    ...overrides,
  };
}

function createMockCodeMemory(
  searchResults: CodeSearchResult[] = [],
  usages: CodeUsage[] = []
): ICodeMemory {
  return {
    indexFile: vi.fn().mockResolvedValue([]),
    indexProject: vi.fn().mockResolvedValue({
      filesIndexed: 0,
      chunksCreated: 0,
      tokensProcessed: 0,
      duration: 0,
      errors: [],
    }),
    updateFile: vi.fn().mockResolvedValue([]),
    removeFile: vi.fn().mockResolvedValue(0),
    searchCode: vi.fn().mockImplementation(
      async (_query: string, _options?: CodeSearchOptions) => searchResults
    ),
    findSimilarCode: vi.fn().mockResolvedValue(searchResults),
    findUsages: vi.fn().mockImplementation(
      async (_symbolName: string, _projectId?: string) => usages
    ),
    findDefinition: vi.fn().mockResolvedValue(null),
    getChunksForFile: vi.fn().mockResolvedValue([]),
    getChunkById: vi.fn().mockResolvedValue(null),
    getChunkCount: vi.fn().mockResolvedValue(0),
    clearProject: vi.fn().mockResolvedValue(0),
    rebuildIndex: vi.fn().mockResolvedValue({
      filesIndexed: 0,
      chunksCreated: 0,
      tokensProcessed: 0,
      duration: 0,
      errors: [],
    }),
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

const createRequest = (
  query: string,
  type: 'search' | 'usages' = 'search',
  options?: Partial<ContextRequest>
): ContextRequest => ({
  type,
  query,
  agentId: 'test-agent',
  taskId: 'test-task',
  reason: 'Testing search',
  timestamp: new Date(),
  ...options,
});

// ============================================================================
// Tests
// ============================================================================

describe('SearchRequestHandler', () => {
  let handler: SearchRequestHandler;
  let mockCodeMemory: ICodeMemory;

  beforeEach(() => {
    mockCodeMemory = createMockCodeMemory();
    handler = new SearchRequestHandler(
      { projectRoot: '/mock/project' },
      mockCodeMemory
    );
  });

  describe('canHandle', () => {
    it('should return true for "search" type', () => {
      expect(handler.canHandle('search')).toBe(true);
    });

    it('should return true for "usages" type', () => {
      expect(handler.canHandle('usages')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(handler.canHandle('file')).toBe(false);
      expect(handler.canHandle('symbol')).toBe(false);
      expect(handler.canHandle('definition')).toBe(false);
    });
  });

  describe('handle - search requests', () => {
    it('should return search results for valid query', async () => {
      const chunk = createMockCodeChunk();
      const searchResult = createMockSearchResult(chunk, 0.9);
      mockCodeMemory = createMockCodeMemory([searchResult]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('handleRequest function');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.type).toBe('search');
      expect(response.content).toContain('Search Results');
      expect(response.content).toContain('handleRequest');
      expect(response.metadata?.totalMatches).toBe(1);
    });

    it('should handle empty search results', async () => {
      mockCodeMemory = createMockCodeMemory([]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('nonexistent function');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('No matching code found');
      expect(response.metadata?.totalMatches).toBe(0);
    });

    it('should call CodeMemory.searchCode with correct options', async () => {
      const request = createRequest('test query', 'search', {
        options: {
          limit: 5,
          filePattern: '*.ts',
        },
      });

      await handler.handle(request);

      expect(mockCodeMemory.searchCode).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          limit: 5,
          filePattern: '*.ts',
        })
      );
    });

    it('should include relevance scores in results', async () => {
      const chunk = createMockCodeChunk();
      const searchResult = createMockSearchResult(chunk, 0.85);
      mockCodeMemory = createMockCodeMemory([searchResult]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test query');
      const response = await handler.handle(request);

      expect(response.content).toContain('85.0%');
    });

    it('should format code with line numbers', async () => {
      const chunk = createMockCodeChunk({
        startLine: 10,
        content: 'line 1\nline 2\nline 3',
      });
      const searchResult = createMockSearchResult(chunk);
      mockCodeMemory = createMockCodeMemory([searchResult]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test query');
      const response = await handler.handle(request);

      expect(response.content).toContain('10:');
      expect(response.content).toContain('11:');
      expect(response.content).toContain('12:');
    });
  });

  describe('handle - usages requests', () => {
    it('should return usage locations for symbol', async () => {
      const usages = [
        createMockCodeUsage({ line: 20, context: 'handleRequest(req)' }),
        createMockCodeUsage({ line: 35, context: 'await handleRequest(data)' }),
      ];
      mockCodeMemory = createMockCodeMemory([], usages);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('handleRequest', 'usages');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.type).toBe('usages');
      expect(response.content).toContain('handleRequest');
      expect(response.metadata?.totalMatches).toBe(2);
    });

    it('should handle symbol with no usages', async () => {
      mockCodeMemory = createMockCodeMemory([], []);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('unusedFunction', 'usages');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('No matching code found');
      expect(response.metadata?.totalMatches).toBe(0);
    });

    it('should call CodeMemory.findUsages with symbol name', async () => {
      const request = createRequest('testFunction', 'usages');

      await handler.handle(request);

      expect(mockCodeMemory.findUsages).toHaveBeenCalledWith('testFunction');
    });

    it('should limit usages based on options', async () => {
      const usages = Array.from({ length: 20 }, (_, i) =>
        createMockCodeUsage({ line: i + 1 })
      );
      mockCodeMemory = createMockCodeMemory([], usages);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('symbol', 'usages', {
        options: { limit: 5 },
      });
      const response = await handler.handle(request);

      expect(response.metadata?.returnedResults).toBeLessThanOrEqual(5);
    });
  });

  describe('truncation', () => {
    it('should truncate results exceeding token budget', async () => {
      // Create many large results
      const chunks = Array.from({ length: 20 }, (_, i) =>
        createMockCodeChunk({
          id: `chunk-${i}`,
          content: 'x'.repeat(1000), // Large content
        })
      );
      const searchResults = chunks.map((c) => createMockSearchResult(c));
      mockCodeMemory = createMockCodeMemory(searchResults);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test', 'search', {
        options: { maxTokens: 500 }, // Very small budget
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.truncated).toBe(true);
      expect(response.tokenCount).toBeLessThanOrEqual(600); // Some buffer for formatting
    });

    it('should not truncate when within budget', async () => {
      const chunk = createMockCodeChunk({ content: 'short content' });
      const searchResult = createMockSearchResult(chunk);
      mockCodeMemory = createMockCodeMemory([searchResult]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test', 'search', {
        options: { maxTokens: 10000 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.truncated).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error when CodeMemory is not available', async () => {
      handler = new SearchRequestHandler({ projectRoot: '/mock/project' });

      const request = createRequest('test query');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('CodeMemory is not available');
    });

    it('should handle CodeMemory errors gracefully', async () => {
      mockCodeMemory.searchCode = vi.fn().mockRejectedValue(new Error('Search failed'));
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test query');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Search failed');
    });
  });

  describe('multiple results', () => {
    it('should return multiple search results correctly', async () => {
      const chunks = [
        createMockCodeChunk({
          id: 'chunk-1',
          file: '/mock/project/src/file1.ts',
          content: 'function processData() {}',
        }),
        createMockCodeChunk({
          id: 'chunk-2',
          file: '/mock/project/src/file2.ts',
          content: 'function processData(input) {}',
        }),
        createMockCodeChunk({
          id: 'chunk-3',
          file: '/mock/project/src/file3.ts',
          content: 'async function processData() {}',
        }),
      ];
      const results = chunks.map((c, i) => createMockSearchResult(c, 0.9 - i * 0.1));
      mockCodeMemory = createMockCodeMemory(results);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('processData');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.totalMatches).toBe(3);
      expect(response.content).toContain('file1.ts');
      expect(response.content).toContain('file2.ts');
      expect(response.content).toContain('file3.ts');
    });

    it('should preserve result order by relevance', async () => {
      const chunks = [
        createMockCodeChunk({
          id: 'chunk-1',
          file: '/mock/project/src/high.ts',
        }),
        createMockCodeChunk({
          id: 'chunk-2',
          file: '/mock/project/src/medium.ts',
        }),
        createMockCodeChunk({
          id: 'chunk-3',
          file: '/mock/project/src/low.ts',
        }),
      ];
      const results = [
        createMockSearchResult(chunks[0]!, 0.95),
        createMockSearchResult(chunks[1]!, 0.80),
        createMockSearchResult(chunks[2]!, 0.70),
      ];
      mockCodeMemory = createMockCodeMemory(results);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test');
      const response = await handler.handle(request);

      // Check that high.ts appears before medium.ts and low.ts
      const highIndex = response.content.indexOf('high.ts');
      const mediumIndex = response.content.indexOf('medium.ts');
      const lowIndex = response.content.indexOf('low.ts');

      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });
  });

  describe('factory function', () => {
    it('should create handler with factory function', () => {
      const handler = createSearchRequestHandler('/mock/project', mockCodeMemory);
      expect(handler).toBeInstanceOf(SearchRequestHandler);
      expect(handler.canHandle('search')).toBe(true);
    });

    it('should accept custom options', () => {
      const handler = createSearchRequestHandler('/mock/project', mockCodeMemory, {
        defaultThreshold: 0.5,
        defaultLimit: 20,
      });
      expect(handler).toBeInstanceOf(SearchRequestHandler);
    });
  });

  describe('metadata', () => {
    it('should include correct metadata in response', async () => {
      const chunk = createMockCodeChunk();
      const searchResult = createMockSearchResult(chunk);
      mockCodeMemory = createMockCodeMemory([searchResult]);
      handler = new SearchRequestHandler(
        { projectRoot: '/mock/project' },
        mockCodeMemory
      );

      const request = createRequest('test query', 'search', {
        options: { filePattern: '*.ts' },
      });
      const response = await handler.handle(request);

      expect(response.metadata).toBeDefined();
      expect(response.metadata?.query).toBe('test query');
      expect(response.metadata?.requestType).toBe('search');
      expect(response.metadata?.filePattern).toBe('*.ts');
      expect(response.source).toContain('CodeMemory');
    });
  });
});
