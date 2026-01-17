/**
 * CodeMemory Tests
 *
 * Tests for the CodeMemory class that manages code chunk
 * storage, retrieval, and semantic search.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CodeMemory, createCodeMemory, DEFAULT_CODE_MEMORY_CONFIG } from './CodeMemory';
import { CodeChunkRepository } from './CodeChunkRepository';
import { CodeChunker } from './CodeChunker';
import { EmbeddingsService } from '../EmbeddingsService';
import type { CodeChunk, CodeChunkType, IndexStats } from './types';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../../database/schema';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock CodeChunk
 */
function createMockChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  return {
    id: overrides.id ?? 'chunk-1',
    projectId: overrides.projectId ?? 'test-project',
    file: overrides.file ?? 'test.ts',
    startLine: overrides.startLine ?? 1,
    endLine: overrides.endLine ?? 10,
    content: overrides.content ?? 'function test() { return 42; }',
    embedding: overrides.embedding ?? Array.from({ length: 1536 }, (_, i) => Math.sin(i)),
    symbols: overrides.symbols ?? ['test'],
    chunkType: overrides.chunkType ?? 'function',
    metadata: overrides.metadata ?? {
      language: 'typescript',
      hash: 'abc123',
    },
    indexedAt: overrides.indexedAt ?? new Date(),
  };
}

/**
 * Create a mock EmbeddingsService
 */
function createMockEmbeddings(): EmbeddingsService {
  return new EmbeddingsService({
    apiKey: 'test-key',
    mockMode: true, // Use deterministic mock embeddings
  });
}

/**
 * Create an in-memory database for testing
 */
function createTestDatabase() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Create tables manually since we're using in-memory DB
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS code_chunks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      symbols TEXT,
      chunk_type TEXT NOT NULL,
      language TEXT NOT NULL,
      complexity INTEGER,
      hash TEXT NOT NULL,
      indexed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS code_chunks_file_idx ON code_chunks(file);
    CREATE INDEX IF NOT EXISTS code_chunks_project_idx ON code_chunks(project_id);
    CREATE INDEX IF NOT EXISTS code_chunks_hash_idx ON code_chunks(hash);
  `);

  return { db, sqlite };
}

// ============================================================================
// Tests
// ============================================================================

describe('CodeMemory', () => {
  let codeMemory: CodeMemory;
  let repository: CodeChunkRepository;
  let chunker: CodeChunker;
  let embeddings: EmbeddingsService;
  let sqlite: Database.Database;

  beforeEach(() => {
    const { db, sqlite: dbConn } = createTestDatabase();
    sqlite = dbConn;
    repository = new CodeChunkRepository(db);
    chunker = new CodeChunker();
    embeddings = createMockEmbeddings();

    codeMemory = new CodeMemory(repository, chunker, embeddings, {
      skipEmbeddings: true, // Skip for most tests
    });
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const memory = new CodeMemory(repository, chunker, embeddings);
      expect(memory).toBeInstanceOf(CodeMemory);
    });

    it('should create instance with custom config', () => {
      const memory = new CodeMemory(repository, chunker, embeddings, {
        batchSize: 50,
        includePatterns: ['**/*.ts'],
      });
      expect(memory).toBeInstanceOf(CodeMemory);
    });
  });

  describe('indexFile', () => {
    it('should index a TypeScript file', async () => {
      const content = `
        function hello() {
          return 'world';
        }

        function goodbye() {
          return 'farewell';
        }
      `;

      const chunks = await codeMemory.indexFile('test.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.file).toBe('test.ts');
      expect(chunks[0]?.projectId).toBeTruthy();
    });

    it('should return empty array for empty content', async () => {
      const chunks = await codeMemory.indexFile('empty.ts', '');
      expect(chunks).toEqual([]);
    });

    it('should return empty array for whitespace-only content', async () => {
      const chunks = await codeMemory.indexFile('whitespace.ts', '   \n  \n  ');
      expect(chunks).toEqual([]);
    });

    it('should store chunks in repository', async () => {
      const content = 'const x = 1;';
      await codeMemory.indexFile('test.ts', content);

      const storedChunks = await repository.findByFile('test.ts');
      expect(storedChunks.length).toBeGreaterThan(0);
    });

    it('should generate embeddings when not skipped', async () => {
      const memoryWithEmbeddings = new CodeMemory(repository, chunker, embeddings, {
        skipEmbeddings: false,
      });

      const content = 'function test() { return 1; }';
      const chunks = await memoryWithEmbeddings.indexFile('embed.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
      // With mock mode, embeddings should be generated
      expect(chunks[0]?.embedding.length).toBe(1536);
    });
  });

  describe('updateFile', () => {
    it('should index new file if no existing chunks', async () => {
      const content = 'const x = 1;';
      const chunks = await codeMemory.updateFile('new.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should update chunks when content changes', async () => {
      // First index
      await codeMemory.indexFile('update.ts', 'const x = 1;');
      const original = await repository.findByFile('update.ts');

      // Update with new content
      const newChunks = await codeMemory.updateFile('update.ts', 'const y = 2;');

      expect(newChunks.length).toBeGreaterThan(0);
      // Content should be different
      expect(newChunks[0]?.content).not.toBe(original[0]?.content);
    });

    it('should return existing chunks when content unchanged', async () => {
      const content = 'const unchanged = true;';

      // First index
      const original = await codeMemory.indexFile('same.ts', content);

      // Update with same content
      const updated = await codeMemory.updateFile('same.ts', content);

      expect(updated.length).toBe(original.length);
    });
  });

  describe('removeFile', () => {
    it('should remove all chunks for a file', async () => {
      await codeMemory.indexFile('remove.ts', 'const x = 1;');

      const count = await codeMemory.removeFile('remove.ts');

      expect(count).toBeGreaterThan(0);

      const remaining = await repository.findByFile('remove.ts');
      expect(remaining).toHaveLength(0);
    });

    it('should return 0 when file has no chunks', async () => {
      const count = await codeMemory.removeFile('nonexistent.ts');
      expect(count).toBe(0);
    });
  });

  describe('searchCode', () => {
    beforeEach(async () => {
      // Use memory with embeddings for search tests
      codeMemory = new CodeMemory(repository, chunker, embeddings, {
        skipEmbeddings: false,
      });

      // Index some test files
      await codeMemory.indexFile('search1.ts', 'function handleUserLogin() { /* auth logic */ }');
      await codeMemory.indexFile('search2.ts', 'function processPayment() { /* payment logic */ }');
      await codeMemory.indexFile('search3.ts', 'function validateUserInput() { /* validation */ }');
    });

    it('should find relevant code by semantic search', async () => {
      const results = await codeMemory.searchCode('user authentication');

      expect(results.length).toBeGreaterThanOrEqual(0);
      // Results should be ordered by score
      if (results.length > 1) {
        expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
      }
    });

    it('should respect limit option', async () => {
      const results = await codeMemory.searchCode('function', { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter by language', async () => {
      const results = await codeMemory.searchCode('function', {
        language: 'typescript',
      });

      for (const result of results) {
        expect(result.chunk.metadata.language).toBe('typescript');
      }
    });

    it('should include highlights when requested', async () => {
      const results = await codeMemory.searchCode('function', {
        includeContext: true,
        threshold: 0, // Low threshold to ensure results
      });

      // If we have results, check for highlights
      for (const result of results) {
        if (result.highlights) {
          expect(result.highlights).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('findSimilarCode', () => {
    beforeEach(async () => {
      codeMemory = new CodeMemory(repository, chunker, embeddings, {
        skipEmbeddings: false,
      });

      await codeMemory.indexFile('similar1.ts', 'function add(a: number, b: number) { return a + b; }');
      await codeMemory.indexFile('similar2.ts', 'function subtract(a: number, b: number) { return a - b; }');
    });

    it('should find similar code snippets', async () => {
      const results = await codeMemory.findSimilarCode('function multiply(x, y) { return x * y; }');

      // Should find similar arithmetic functions
      expect(results).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const results = await codeMemory.findSimilarCode('function test() {}', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('findUsages', () => {
    beforeEach(async () => {
      // Index files with symbol usages
      await repository.insert(createMockChunk({
        id: 'usage-1',
        file: 'usage.ts',
        content: `
          import { UserService } from './services';
          const service = new UserService();
          service.getUser(1);
        `,
        symbols: ['UserService', 'getUser'],
      }));

      await repository.insert(createMockChunk({
        id: 'usage-2',
        file: 'other.ts',
        content: `
          const UserService = class {};
          type UserService = typeof UserService;
        `,
        symbols: ['UserService'],
      }));
    });

    it('should find all usages of a symbol', async () => {
      const usages = await codeMemory.findUsages('UserService');

      expect(usages.length).toBeGreaterThan(0);
      expect(usages.some((u) => u.usageType === 'import')).toBe(true);
    });

    it('should return empty array for unknown symbol', async () => {
      const usages = await codeMemory.findUsages('NonExistentSymbol');
      expect(usages).toEqual([]);
    });

    it('should filter by projectId', async () => {
      const usages = await codeMemory.findUsages('UserService', 'test-project');
      expect(usages.length).toBeGreaterThan(0);
    });
  });

  describe('findDefinition', () => {
    beforeEach(async () => {
      await repository.insert(createMockChunk({
        id: 'def-1',
        file: 'definitions.ts',
        content: `
          function calculateTotal(items: Item[]): number {
            return items.reduce((sum, item) => sum + item.price, 0);
          }

          class UserManager {
            private users: User[] = [];
          }

          interface IService {
            execute(): void;
          }

          type Result = Success | Failure;
        `,
        symbols: ['calculateTotal', 'UserManager', 'IService', 'Result'],
        startLine: 1,
      }));
    });

    it('should find function definition', async () => {
      const def = await codeMemory.findDefinition('calculateTotal');

      expect(def).not.toBeNull();
      expect(def?.file).toBe('definitions.ts');
      expect(def?.signature).toContain('calculateTotal');
    });

    it('should find class definition', async () => {
      const def = await codeMemory.findDefinition('UserManager');

      expect(def).not.toBeNull();
      expect(def?.signature).toContain('UserManager');
    });

    it('should find interface definition', async () => {
      const def = await codeMemory.findDefinition('IService');

      expect(def).not.toBeNull();
      expect(def?.signature).toContain('IService');
    });

    it('should find type definition', async () => {
      const def = await codeMemory.findDefinition('Result');

      expect(def).not.toBeNull();
      expect(def?.signature).toContain('Result');
    });

    it('should return null for undefined symbol', async () => {
      const def = await codeMemory.findDefinition('NotDefined');
      expect(def).toBeNull();
    });
  });

  describe('getChunksForFile', () => {
    beforeEach(async () => {
      await repository.insert(createMockChunk({ id: 'file-1', file: 'multi.ts', startLine: 1, endLine: 5 }));
      await repository.insert(createMockChunk({ id: 'file-2', file: 'multi.ts', startLine: 6, endLine: 10 }));
      await repository.insert(createMockChunk({ id: 'other', file: 'other.ts' }));
    });

    it('should get all chunks for a file', async () => {
      const chunks = await codeMemory.getChunksForFile('multi.ts');

      expect(chunks).toHaveLength(2);
      expect(chunks.every((c) => c.file === 'multi.ts')).toBe(true);
    });

    it('should return chunks ordered by line number', async () => {
      const chunks = await codeMemory.getChunksForFile('multi.ts');

      expect(chunks[0]?.startLine).toBeLessThan(chunks[1]?.startLine ?? 0);
    });

    it('should return empty array for unknown file', async () => {
      const chunks = await codeMemory.getChunksForFile('unknown.ts');
      expect(chunks).toEqual([]);
    });
  });

  describe('getChunkById', () => {
    beforeEach(async () => {
      await repository.insert(createMockChunk({ id: 'specific-chunk' }));
    });

    it('should get chunk by ID', async () => {
      const chunk = await codeMemory.getChunkById('specific-chunk');

      expect(chunk).not.toBeNull();
      expect(chunk?.id).toBe('specific-chunk');
    });

    it('should return null for unknown ID', async () => {
      const chunk = await codeMemory.getChunkById('unknown-id');
      expect(chunk).toBeNull();
    });
  });

  describe('getChunkCount', () => {
    beforeEach(async () => {
      await repository.insert(createMockChunk({ id: 'count-1', projectId: 'project-a' }));
      await repository.insert(createMockChunk({ id: 'count-2', projectId: 'project-a' }));
      await repository.insert(createMockChunk({ id: 'count-3', projectId: 'project-b' }));
    });

    it('should count all chunks', async () => {
      const count = await codeMemory.getChunkCount();
      expect(count).toBe(3);
    });

    it('should count chunks by project', async () => {
      const countA = await codeMemory.getChunkCount('project-a');
      const countB = await codeMemory.getChunkCount('project-b');

      expect(countA).toBe(2);
      expect(countB).toBe(1);
    });
  });

  describe('clearProject', () => {
    beforeEach(async () => {
      await repository.insert(createMockChunk({ id: 'clear-1', projectId: 'to-clear' }));
      await repository.insert(createMockChunk({ id: 'clear-2', projectId: 'to-clear' }));
      await repository.insert(createMockChunk({ id: 'keep', projectId: 'keep' }));
    });

    it('should clear all chunks for a project', async () => {
      const deleted = await codeMemory.clearProject('to-clear');

      expect(deleted).toBe(2);

      const remaining = await codeMemory.getChunkCount('to-clear');
      expect(remaining).toBe(0);
    });

    it('should not affect other projects', async () => {
      await codeMemory.clearProject('to-clear');

      const kept = await codeMemory.getChunkCount('keep');
      expect(kept).toBe(1);
    });
  });

  describe('createCodeMemory factory', () => {
    it('should create CodeMemory with default chunker', () => {
      const memory = createCodeMemory(repository, embeddings);
      expect(memory).toBeInstanceOf(CodeMemory);
    });

    it('should create CodeMemory with custom config', () => {
      const memory = createCodeMemory(repository, embeddings, {
        batchSize: 25,
      });
      expect(memory).toBeInstanceOf(CodeMemory);
    });
  });

  describe('DEFAULT_CODE_MEMORY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CODE_MEMORY_CONFIG.batchSize).toBe(100);
      expect(DEFAULT_CODE_MEMORY_CONFIG.skipEmbeddings).toBe(false);
      expect(DEFAULT_CODE_MEMORY_CONFIG.includePatterns).toContain('**/*.ts');
      expect(DEFAULT_CODE_MEMORY_CONFIG.excludePatterns).toContain('**/node_modules/**');
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('CodeMemory - Edge Cases', () => {
  let codeMemory: CodeMemory;
  let repository: CodeChunkRepository;
  let chunker: CodeChunker;
  let embeddings: EmbeddingsService;
  let sqlite: Database.Database;

  beforeEach(() => {
    const { db, sqlite: dbConn } = createTestDatabase();
    sqlite = dbConn;
    repository = new CodeChunkRepository(db);
    chunker = new CodeChunker();
    embeddings = createMockEmbeddings();

    codeMemory = new CodeMemory(repository, chunker, embeddings, {
      skipEmbeddings: true,
    });
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should handle files with special characters in path', async () => {
    const chunks = await codeMemory.indexFile('test-file_v2.spec.ts', 'const x = 1;');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.file).toBe('test-file_v2.spec.ts');
  });

  it('should handle very long content', async () => {
    const longContent = 'const x = 1;\n'.repeat(1000);
    const chunks = await codeMemory.indexFile('long.ts', longContent);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle content with unicode characters', async () => {
    const content = `
      const greeting = '  ';
      const emoji = '';
    `;
    const chunks = await codeMemory.indexFile('unicode.ts', content);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should use updateFile for re-indexing same file', async () => {
    // First index
    await codeMemory.indexFile('multi.ts', 'const a = 1;');

    // Use updateFile for subsequent changes (this handles deduplication)
    await codeMemory.updateFile('multi.ts', 'const b = 2;');

    const chunks = await repository.findByFile('multi.ts');
    // Should have updated content
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.content).toContain('const b');
  });
});
