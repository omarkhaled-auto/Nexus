/**
 * Code Chunk Repository Tests
 *
 * Tests for CRUD and query operations on code chunks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../database/DatabaseClient';
import { CodeChunkRepository } from './CodeChunkRepository';
import type { CodeChunk, CodeChunkMetadata } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  const id = overrides.id ?? `chunk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const metadata: CodeChunkMetadata = {
    language: 'typescript',
    complexity: 5,
    hash: `hash-${id}`,
    dependencies: ['./utils'],
    exports: ['testFunction'],
    documentation: '/** Test function */',
    ...overrides.metadata,
  };

  return {
    id,
    projectId: 'test-project',
    file: 'src/test.ts',
    startLine: 1,
    endLine: 10,
    content: 'function test() { return true; }',
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    symbols: ['test', 'testFunction'],
    chunkType: 'function',
    metadata,
    indexedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CodeChunkRepository', () => {
  let client: DatabaseClient;
  let repository: CodeChunkRepository;

  beforeEach(() => {
    // Create in-memory database with migrations
    client = DatabaseClient.createInMemory('src/persistence/database/migrations');
    repository = new CodeChunkRepository(client.db);
  });

  afterEach(() => {
    client.close();
  });

  // --------------------------------------------------------------------------
  // Insert Operations
  // --------------------------------------------------------------------------

  describe('insert', () => {
    it('should insert a single chunk', async () => {
      const chunk = createTestChunk();

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(chunk.id);
      expect(retrieved?.projectId).toBe(chunk.projectId);
      expect(retrieved?.file).toBe(chunk.file);
      expect(retrieved?.content).toBe(chunk.content);
    });

    it('should preserve embedding data', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      const chunk = createTestChunk({ embedding });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.embedding).toHaveLength(8);
      // Check values are close (floating point comparison)
      retrieved?.embedding.forEach((val, i) => {
        expect(val).toBeCloseTo(embedding[i], 5);
      });
    });

    it('should handle empty embedding', async () => {
      const chunk = createTestChunk({ embedding: [] });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.embedding).toEqual([]);
    });

    it('should preserve symbols array', async () => {
      const symbols = ['MyClass', 'myMethod', 'myProperty'];
      const chunk = createTestChunk({ symbols });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.symbols).toEqual(symbols);
    });
  });

  describe('insertMany', () => {
    it('should insert multiple chunks', async () => {
      const chunks = [
        createTestChunk({ id: 'chunk-1' }),
        createTestChunk({ id: 'chunk-2' }),
        createTestChunk({ id: 'chunk-3' }),
      ];

      await repository.insertMany(chunks);

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should handle empty array', async () => {
      await repository.insertMany([]);
      const count = await repository.count();
      expect(count).toBe(0);
    });

    it('should handle large batches', async () => {
      const chunks = Array.from({ length: 250 }, (_, i) =>
        createTestChunk({ id: `chunk-${i}` })
      );

      await repository.insertMany(chunks);

      const count = await repository.count();
      expect(count).toBe(250);
    });
  });

  // --------------------------------------------------------------------------
  // Update Operations
  // --------------------------------------------------------------------------

  describe('update', () => {
    it('should update an existing chunk', async () => {
      const chunk = createTestChunk();
      await repository.insert(chunk);

      chunk.content = 'updated content';
      chunk.metadata.hash = 'new-hash';
      await repository.update(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.content).toBe('updated content');
      expect(retrieved?.metadata.hash).toBe('new-hash');
    });

    it('should update embedding', async () => {
      const chunk = createTestChunk({ embedding: [0.1, 0.2] });
      await repository.insert(chunk);

      chunk.embedding = [0.9, 0.8, 0.7];
      await repository.update(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.embedding).toHaveLength(3);
      expect(retrieved?.embedding[0]).toBeCloseTo(0.9, 5);
    });
  });

  // --------------------------------------------------------------------------
  // Delete Operations
  // --------------------------------------------------------------------------

  describe('delete', () => {
    it('should delete a chunk by ID', async () => {
      const chunk = createTestChunk();
      await repository.insert(chunk);

      await repository.delete(chunk.id);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteByFile', () => {
    it('should delete all chunks for a file', async () => {
      const file = 'src/myfile.ts';
      const chunks = [
        createTestChunk({ id: 'c1', file }),
        createTestChunk({ id: 'c2', file }),
        createTestChunk({ id: 'c3', file: 'src/other.ts' }),
      ];
      await repository.insertMany(chunks);

      const deleted = await repository.deleteByFile(file);

      expect(deleted).toBe(2);
      const remaining = await repository.count();
      expect(remaining).toBe(1);
    });
  });

  describe('deleteByProject', () => {
    it('should delete all chunks for a project', async () => {
      const chunks = [
        createTestChunk({ id: 'c1', projectId: 'project-a' }),
        createTestChunk({ id: 'c2', projectId: 'project-a' }),
        createTestChunk({ id: 'c3', projectId: 'project-b' }),
      ];
      await repository.insertMany(chunks);

      const deleted = await repository.deleteByProject('project-a');

      expect(deleted).toBe(2);
      const remaining = await repository.count();
      expect(remaining).toBe(1);
    });
  });

  describe('deleteByIds', () => {
    it('should delete multiple chunks by IDs', async () => {
      const chunks = [
        createTestChunk({ id: 'c1' }),
        createTestChunk({ id: 'c2' }),
        createTestChunk({ id: 'c3' }),
      ];
      await repository.insertMany(chunks);

      const deleted = await repository.deleteByIds(['c1', 'c3']);

      expect(deleted).toBe(2);
      const remaining = await repository.findById('c2');
      expect(remaining).not.toBeNull();
    });

    it('should handle empty IDs array', async () => {
      const deleted = await repository.deleteByIds([]);
      expect(deleted).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  describe('findById', () => {
    it('should find chunk by ID', async () => {
      const chunk = createTestChunk({ id: 'unique-id' });
      await repository.insert(chunk);

      const retrieved = await repository.findById('unique-id');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('unique-id');
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await repository.findById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('findByFile', () => {
    it('should find all chunks for a file ordered by start line', async () => {
      const file = 'src/ordered.ts';
      const chunks = [
        createTestChunk({ id: 'c1', file, startLine: 20 }),
        createTestChunk({ id: 'c2', file, startLine: 5 }),
        createTestChunk({ id: 'c3', file, startLine: 10 }),
      ];
      await repository.insertMany(chunks);

      const results = await repository.findByFile(file);

      expect(results).toHaveLength(3);
      expect(results[0].startLine).toBe(5);
      expect(results[1].startLine).toBe(10);
      expect(results[2].startLine).toBe(20);
    });

    it('should return empty array for non-existent file', async () => {
      const results = await repository.findByFile('non-existent.ts');
      expect(results).toEqual([]);
    });
  });

  describe('findByProject', () => {
    it('should find all chunks for a project', async () => {
      const chunks = [
        createTestChunk({ id: 'c1', projectId: 'project-x' }),
        createTestChunk({ id: 'c2', projectId: 'project-x' }),
        createTestChunk({ id: 'c3', projectId: 'project-y' }),
      ];
      await repository.insertMany(chunks);

      const results = await repository.findByProject('project-x');

      expect(results).toHaveLength(2);
    });
  });

  describe('findByHash', () => {
    it('should find chunk by hash', async () => {
      const chunk = createTestChunk();
      chunk.metadata.hash = 'unique-hash-123';
      await repository.insert(chunk);

      const retrieved = await repository.findByHash('unique-hash-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(chunk.id);
    });

    it('should return null for non-existent hash', async () => {
      const retrieved = await repository.findByHash('non-existent-hash');
      expect(retrieved).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all chunks', async () => {
      const chunks = [
        createTestChunk({ id: 'c1' }),
        createTestChunk({ id: 'c2' }),
        createTestChunk({ id: 'c3' }),
      ];
      await repository.insertMany(chunks);

      const total = await repository.count();
      expect(total).toBe(3);
    });

    it('should count chunks by project', async () => {
      const chunks = [
        createTestChunk({ id: 'c1', projectId: 'p1' }),
        createTestChunk({ id: 'c2', projectId: 'p1' }),
        createTestChunk({ id: 'c3', projectId: 'p2' }),
      ];
      await repository.insertMany(chunks);

      const p1Count = await repository.count('p1');
      const p2Count = await repository.count('p2');

      expect(p1Count).toBe(2);
      expect(p2Count).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  describe('findAll', () => {
    it('should find all chunks with pagination', async () => {
      const chunks = Array.from({ length: 50 }, (_, i) =>
        createTestChunk({ id: `chunk-${i}` })
      );
      await repository.insertMany(chunks);

      const page1 = await repository.findAll({ limit: 20, offset: 0 });
      const page2 = await repository.findAll({ limit: 20, offset: 20 });

      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(20);
    });

    it('should use default pagination', async () => {
      const chunks = Array.from({ length: 10 }, (_, i) =>
        createTestChunk({ id: `chunk-${i}` })
      );
      await repository.insertMany(chunks);

      const results = await repository.findAll();
      expect(results).toHaveLength(10);
    });
  });

  describe('findAllWithEmbeddings', () => {
    it('should only return chunks with embeddings', async () => {
      const chunks = [
        createTestChunk({ id: 'c1', embedding: [0.1, 0.2], projectId: 'p1' }),
        createTestChunk({ id: 'c2', embedding: [], projectId: 'p1' }),
        createTestChunk({ id: 'c3', embedding: [0.3, 0.4], projectId: 'p1' }),
      ];
      await repository.insertMany(chunks);

      const results = await repository.findAllWithEmbeddings('p1');

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.embedding.length > 0)).toBe(true);
    });
  });

  describe('hasFile', () => {
    it('should return true if file has been indexed', async () => {
      const chunk = createTestChunk({ file: 'src/indexed.ts' });
      await repository.insert(chunk);

      const hasIt = await repository.hasFile('src/indexed.ts');
      expect(hasIt).toBe(true);
    });

    it('should return false if file has not been indexed', async () => {
      const hasIt = await repository.hasFile('src/not-indexed.ts');
      expect(hasIt).toBe(false);
    });
  });

  describe('getFiles', () => {
    it('should get all unique files for a project', async () => {
      const chunks = [
        createTestChunk({ id: 'c1', file: 'src/a.ts', projectId: 'p1' }),
        createTestChunk({ id: 'c2', file: 'src/b.ts', projectId: 'p1' }),
        createTestChunk({ id: 'c3', file: 'src/a.ts', projectId: 'p1' }), // duplicate
        createTestChunk({ id: 'c4', file: 'src/c.ts', projectId: 'p2' }),
      ];
      await repository.insertMany(chunks);

      const files = await repository.getFiles('p1');

      expect(files).toHaveLength(2);
      expect(files).toContain('src/a.ts');
      expect(files).toContain('src/b.ts');
    });
  });

  describe('getFileHashes', () => {
    it('should get hash map for file chunks', async () => {
      const file = 'src/hashed.ts';
      const chunks = [
        createTestChunk({ id: 'c1', file }),
        createTestChunk({ id: 'c2', file }),
      ];
      chunks[0].metadata.hash = 'hash-1';
      chunks[1].metadata.hash = 'hash-2';
      await repository.insertMany(chunks);

      const hashes = await repository.getFileHashes(file);

      expect(hashes.size).toBe(2);
      expect(hashes.get('c1')).toBe('hash-1');
      expect(hashes.get('c2')).toBe('hash-2');
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle special characters in content', async () => {
      const content = `function test() {
        const str = "Hello, \\"World\\"!";
        return \`Template: \${str}\`;
      }`;
      const chunk = createTestChunk({ content });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.content).toBe(content);
    });

    it('should handle very long content', async () => {
      const content = 'x'.repeat(100000);
      const chunk = createTestChunk({ content });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.content).toHaveLength(100000);
    });

    it('should handle Unicode content', async () => {
      const content = '// Unicode: \u4e2d\u6587 \u0410\u0411\u0412';
      const chunk = createTestChunk({ content });

      await repository.insert(chunk);

      const retrieved = await repository.findById(chunk.id);
      expect(retrieved?.content).toBe(content);
    });
  });
});
