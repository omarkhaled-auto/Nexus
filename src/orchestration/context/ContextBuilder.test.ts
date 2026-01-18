/**
 * ContextBuilder Tests
 *
 * Tests for the ContextBuilder class that assembles context components
 * for agent tasks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ContextBuilder,
  createContextBuilder,
  createMockContextBuilder,
  type IMemorySystem,
} from './ContextBuilder';
import type { TaskSpec } from './types';
import type { ICodeMemory, CodeSearchResult, CodeChunk } from '../../persistence/memory/code/types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a test task spec
 */
function createTestTaskSpec(overrides?: Partial<TaskSpec>): TaskSpec {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task for unit testing',
    files: ['src/app.ts', 'src/utils.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create a mock code chunk
 */
function createMockCodeChunk(overrides?: Partial<CodeChunk>): CodeChunk {
  return {
    id: 'chunk-1',
    projectId: 'test-project',
    file: 'src/app.ts',
    startLine: 1,
    endLine: 10,
    content: 'function hello() { return "world"; }',
    embedding: [0.1, 0.2, 0.3],
    symbols: ['hello'],
    chunkType: 'function',
    metadata: {
      language: 'typescript',
      complexity: 1,
      dependencies: [],
      exports: ['hello'],
      hash: 'abc123',
    },
    indexedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock CodeMemory
 */
function createMockCodeMemory(): ICodeMemory {
  return {
    indexFile: vi.fn().mockResolvedValue([]),
    indexProject: vi.fn().mockResolvedValue({ filesIndexed: 0, chunksCreated: 0, tokensProcessed: 0, duration: 0, errors: [] }),
    updateFile: vi.fn().mockResolvedValue([]),
    removeFile: vi.fn().mockResolvedValue(0),
    searchCode: vi.fn().mockResolvedValue([]),
    findSimilarCode: vi.fn().mockResolvedValue([]),
    findUsages: vi.fn().mockResolvedValue([]),
    findDefinition: vi.fn().mockResolvedValue(null),
    getChunksForFile: vi.fn().mockResolvedValue([]),
    getChunkById: vi.fn().mockResolvedValue(null),
    getChunkCount: vi.fn().mockResolvedValue(0),
    clearProject: vi.fn().mockResolvedValue(0),
    rebuildIndex: vi.fn().mockResolvedValue({ filesIndexed: 0, chunksCreated: 0, tokensProcessed: 0, duration: 0, errors: [] }),
  };
}

/**
 * Create a mock MemorySystem
 */
function createMockMemorySystem(): IMemorySystem {
  return {
    search: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Create a mock RepoMapGenerator
 */
function createMockRepoMapGenerator() {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue({}),
    formatForContext: vi.fn().mockReturnValue('# Repo Map\n\n## Files\n- src/app.ts\n- src/utils.ts'),
    getCurrentMap: vi.fn().mockReturnValue(null),
    clearCache: vi.fn(),
  };
}

/**
 * Create a mock CodebaseAnalyzer
 */
function createMockCodebaseAnalyzer() {
  return {
    analyze: vi.fn().mockResolvedValue({
      projectPath: '/test',
      generatedAt: new Date(),
      architecture: { overview: 'Test architecture', layers: [], keyComponents: [] },
      patterns: { overview: 'Test patterns', architecturalPatterns: [], codingPatterns: [], namingConventions: [] },
      dependencies: { overview: 'Test deps', externalDependencies: [], internalDependencies: [], circularDependencies: [] },
      apiSurface: { overview: 'Test API', publicInterfaces: [], publicFunctions: [], publicClasses: [] },
      dataFlow: { overview: 'Test data flow', stateManagement: [], dataTransformations: [] },
      testStrategy: { overview: 'Test strategy', frameworks: [], testTypes: [] },
      knownIssues: { overview: 'Known issues', technicalDebt: [], limitations: [] },
    }),
    getCurrentDocs: vi.fn().mockReturnValue(null),
    getDocsForContext: vi.fn().mockReturnValue('# Architecture Summary\n\nThis is a test project.'),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('ContextBuilder', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create test directory
    testDir = join(tmpdir(), `context-builder-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create with no dependencies', () => {
      const builder = new ContextBuilder({});
      expect(builder).toBeDefined();
    });

    it('should create with all dependencies', () => {
      const builder = new ContextBuilder({
        repoMapGenerator: createMockRepoMapGenerator() as unknown as ContextBuilder extends { repoMapGenerator: infer T } ? T : never,
        codebaseAnalyzer: createMockCodebaseAnalyzer() as unknown as ContextBuilder extends { codebaseAnalyzer: infer T } ? T : never,
        codeMemory: createMockCodeMemory(),
        memorySystem: createMockMemorySystem(),
      });
      expect(builder).toBeDefined();
    });

    it('should accept custom options', () => {
      const builder = new ContextBuilder({}, {
        projectPath: '/custom/path',
        minCodeRelevance: 0.7,
        minMemoryRelevance: 0.5,
        maxFileSizeChars: 50000,
      });
      expect(builder).toBeDefined();
    });
  });

  // ==========================================================================
  // buildRepoMapContext Tests
  // ==========================================================================

  describe('buildRepoMapContext', () => {
    it('should return fallback when no RepoMapGenerator', async () => {
      const builder = new ContextBuilder({});
      const result = await builder.buildRepoMapContext('/test', 1000);

      expect(result).toContain('Repository Structure');
      expect(result).toContain('fallback');
    });

    it('should generate repo map with RepoMapGenerator', async () => {
      const mockGenerator = createMockRepoMapGenerator();
      const builder = new ContextBuilder({
        repoMapGenerator: mockGenerator as unknown as ContextBuilder extends { repoMapGenerator: infer T } ? T : never,
      });

      const result = await builder.buildRepoMapContext('/test', 1000);

      expect(mockGenerator.initialize).toHaveBeenCalled();
      expect(mockGenerator.generate).toHaveBeenCalledWith('/test');
      expect(result).toContain('Repo Map');
    });

    it('should cache repo map results', async () => {
      const mockGenerator = createMockRepoMapGenerator();
      const builder = new ContextBuilder({
        repoMapGenerator: mockGenerator as unknown as ContextBuilder extends { repoMapGenerator: infer T } ? T : never,
      });

      // First call
      await builder.buildRepoMapContext('/test', 1000);
      expect(mockGenerator.generate).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await builder.buildRepoMapContext('/test', 1000);
      expect(mockGenerator.generate).toHaveBeenCalledTimes(1);
    });

    it('should truncate to token budget', async () => {
      const mockGenerator = createMockRepoMapGenerator();
      mockGenerator.formatForContext.mockReturnValue('x'.repeat(10000));

      const builder = new ContextBuilder({
        repoMapGenerator: mockGenerator as unknown as ContextBuilder extends { repoMapGenerator: infer T } ? T : never,
      });

      const result = await builder.buildRepoMapContext('/test', 100);

      // 100 tokens * 4 chars = 400 chars max
      expect(result.length).toBeLessThan(500);
      expect(result).toContain('truncated');
    });
  });

  // ==========================================================================
  // buildCodebaseDocsContext Tests
  // ==========================================================================

  describe('buildCodebaseDocsContext', () => {
    it('should return fallback when no CodebaseAnalyzer', async () => {
      const builder = new ContextBuilder({});
      const task = createTestTaskSpec();
      const result = await builder.buildCodebaseDocsContext('/test', task, 1000);

      expect(result.architectureSummary).toContain('Test Task');
      expect(result.relevantPatterns).toEqual([]);
      expect(result.relevantAPIs).toEqual([]);
    });

    it('should analyze codebase when docs not cached', async () => {
      const mockAnalyzer = createMockCodebaseAnalyzer();
      const builder = new ContextBuilder({
        codebaseAnalyzer: mockAnalyzer as unknown as ContextBuilder extends { codebaseAnalyzer: infer T } ? T : never,
      });

      const task = createTestTaskSpec();
      const result = await builder.buildCodebaseDocsContext('/test', task, 1000);

      expect(mockAnalyzer.analyze).toHaveBeenCalledWith('/test');
      expect(result.architectureSummary).toContain('Architecture Summary');
    });

    it('should use cached docs when available', async () => {
      const mockAnalyzer = createMockCodebaseAnalyzer();
      mockAnalyzer.getCurrentDocs.mockReturnValue({
        patterns: { architecturalPatterns: [] },
        apiSurface: { publicInterfaces: [] },
      });

      const builder = new ContextBuilder({
        codebaseAnalyzer: mockAnalyzer as unknown as ContextBuilder extends { codebaseAnalyzer: infer T } ? T : never,
      });

      const task = createTestTaskSpec();
      await builder.buildCodebaseDocsContext('/test', task, 1000);

      expect(mockAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it('should extract relevant patterns', async () => {
      const mockAnalyzer = createMockCodebaseAnalyzer();
      mockAnalyzer.getCurrentDocs.mockReturnValue({
        patterns: {
          architecturalPatterns: [
            { name: 'Factory', description: 'Creates objects', examples: [{ file: 'src/app.ts' }] },
            { name: 'Singleton', description: 'Single instance', examples: [{ file: 'src/other.ts' }] },
          ],
        },
        apiSurface: { publicInterfaces: [] },
      });

      const builder = new ContextBuilder({
        codebaseAnalyzer: mockAnalyzer as unknown as ContextBuilder extends { codebaseAnalyzer: infer T } ? T : never,
      });

      const task = createTestTaskSpec({ examples: [{ file: 'src/app.ts' }] });
      const result = await builder.buildCodebaseDocsContext('/test', task, 1000);

      // Factory pattern should be included (matching file)
      expect(result.relevantPatterns).toContainEqual('Factory: Creates objects');
    });
  });

  // ==========================================================================
  // buildFileContext Tests
  // ==========================================================================

  describe('buildFileContext', () => {
    it('should return empty array for empty file list', async () => {
      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([], 1000);
      expect(result).toEqual([]);
    });

    it('should read and return file contents', async () => {
      // Create test file
      const testFile = join(testDir, 'test.ts');
      await writeFile(testFile, 'const x = 1;');

      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([testFile], 1000);

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('const x = 1;');
      expect(result[0]?.path).toBe(testFile);
    });

    it('should skip files that do not exist', async () => {
      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext(['/nonexistent/file.ts'], 1000);
      expect(result).toEqual([]);
    });

    it('should sort by relevance score', async () => {
      // Create test files
      const srcFile = join(testDir, 'app.ts');
      const testFile = join(testDir, 'app.test.ts');
      await writeFile(srcFile, 'const src = 1;');
      await writeFile(testFile, 'const test = 1;');

      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([testFile, srcFile], 1000);

      // Task file (srcFile) should have higher relevance than test file
      expect(result[0]?.path).toBe(srcFile);
      expect(result[1]?.path).toBe(testFile);
    });

    it('should respect token budget', async () => {
      // Create test files
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');
      await writeFile(file1, 'x'.repeat(400)); // ~100 tokens
      await writeFile(file2, 'y'.repeat(400)); // ~100 tokens

      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([file1, file2], 100);

      // Should only include one file (100 tokens max)
      expect(result).toHaveLength(1);
    });

    it('should identify test files', async () => {
      const testFile = join(testDir, 'app.test.ts');
      await writeFile(testFile, 'test code');

      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([testFile], 1000);

      expect(result[0]?.includeReason).toBe('test');
    });

    it('should identify type definition files', async () => {
      const typesFile = join(testDir, 'types.ts');
      await writeFile(typesFile, 'interface Foo {}');

      const builder = new ContextBuilder({});
      const result = await builder.buildFileContext([typesFile], 1000);

      expect(result[0]?.includeReason).toBe('type_definition');
    });
  });

  // ==========================================================================
  // buildCodeContext Tests
  // ==========================================================================

  describe('buildCodeContext', () => {
    it('should return empty array when no CodeMemory', async () => {
      const builder = new ContextBuilder({});
      const result = await builder.buildCodeContext('test query', 1000);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty query', async () => {
      const mockCodeMemory = createMockCodeMemory();
      const builder = new ContextBuilder({ codeMemory: mockCodeMemory });
      const result = await builder.buildCodeContext('', 1000);
      expect(result).toEqual([]);
    });

    it('should search code with query', async () => {
      const mockCodeMemory = createMockCodeMemory();
      const mockResults: CodeSearchResult[] = [
        { chunk: createMockCodeChunk(), score: 0.9 },
      ];
      vi.mocked(mockCodeMemory.searchCode).mockResolvedValue(mockResults);

      const builder = new ContextBuilder({ codeMemory: mockCodeMemory });
      const result = await builder.buildCodeContext('test query', 1000);

      expect(mockCodeMemory.searchCode).toHaveBeenCalledWith('test query', expect.objectContaining({
        limit: 20,
        includeContext: true,
      }));
      expect(result).toHaveLength(1);
      expect(result[0]?.score).toBe(0.9);
    });

    it('should respect token budget', async () => {
      const mockCodeMemory = createMockCodeMemory();
      const mockResults: CodeSearchResult[] = [
        { chunk: createMockCodeChunk({ content: 'x'.repeat(400) }), score: 0.9 },
        { chunk: createMockCodeChunk({ content: 'y'.repeat(400) }), score: 0.8 },
      ];
      vi.mocked(mockCodeMemory.searchCode).mockResolvedValue(mockResults);

      const builder = new ContextBuilder({ codeMemory: mockCodeMemory });
      const result = await builder.buildCodeContext('test query', 100);

      // Should only include one result (100 tokens max)
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // buildMemoryContext Tests
  // ==========================================================================

  describe('buildMemoryContext', () => {
    it('should return empty array when no MemorySystem', async () => {
      const builder = new ContextBuilder({});
      const task = createTestTaskSpec();
      const result = await builder.buildMemoryContext(task, 1000);
      expect(result).toEqual([]);
    });

    it('should search memories with task context', async () => {
      const mockMemorySystem = createMockMemorySystem();
      vi.mocked(mockMemorySystem.search).mockResolvedValue([
        { id: 'mem-1', content: 'Memory content', score: 0.8, source: 'conversation' },
      ]);

      const builder = new ContextBuilder({ memorySystem: mockMemorySystem });
      const task = createTestTaskSpec();
      const result = await builder.buildMemoryContext(task, 1000);

      expect(mockMemorySystem.search).toHaveBeenCalledWith(
        expect.stringContaining('Test Task'),
        expect.objectContaining({ limit: 20 })
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('mem-1');
    });

    it('should respect token budget', async () => {
      const mockMemorySystem = createMockMemorySystem();
      vi.mocked(mockMemorySystem.search).mockResolvedValue([
        { id: 'mem-1', content: 'x'.repeat(400), score: 0.8, source: 'conv' },
        { id: 'mem-2', content: 'y'.repeat(400), score: 0.7, source: 'conv' },
      ]);

      const builder = new ContextBuilder({ memorySystem: mockMemorySystem });
      const task = createTestTaskSpec();
      const result = await builder.buildMemoryContext(task, 100);

      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Cache Management Tests
  // ==========================================================================

  describe('cache management', () => {
    it('should clear repo map cache', async () => {
      const mockGenerator = createMockRepoMapGenerator();
      const builder = new ContextBuilder({
        repoMapGenerator: mockGenerator as unknown as ContextBuilder extends { repoMapGenerator: infer T } ? T : never,
      });

      // Populate cache
      await builder.buildRepoMapContext('/test', 1000);
      expect(mockGenerator.generate).toHaveBeenCalledTimes(1);

      // Clear cache
      builder.clearRepoMapCache();

      // Should regenerate
      await builder.buildRepoMapContext('/test', 1000);
      expect(mockGenerator.generate).toHaveBeenCalledTimes(2);
    });

    it('should clear all caches', () => {
      const builder = new ContextBuilder({});
      expect(() => builder.clearAllCaches()).not.toThrow();
    });
  });

  // ==========================================================================
  // findRelatedFiles Tests
  // ==========================================================================

  describe('findRelatedFiles', () => {
    it('should find test files for task files', () => {
      const builder = new ContextBuilder({});
      const task = createTestTaskSpec({ examples: [{ file: 'src/app.ts' }] });
      const related = builder.findRelatedFiles(task);

      expect(related).toContain('src/app.test.ts');
    });

    it('should find types files for task files', () => {
      const builder = new ContextBuilder({});
      const task = createTestTaskSpec({ examples: [{ file: 'src/app.ts' }] });
      const related = builder.findRelatedFiles(task);

      expect(related).toContain('src/types.ts');
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('factory functions', () => {
    it('createContextBuilder should create builder with dependencies', () => {
      const builder = createContextBuilder({
        codeMemory: createMockCodeMemory(),
      });
      expect(builder).toBeInstanceOf(ContextBuilder);
    });

    it('createMockContextBuilder should create builder without dependencies', () => {
      const builder = createMockContextBuilder();
      expect(builder).toBeInstanceOf(ContextBuilder);
    });
  });
});
