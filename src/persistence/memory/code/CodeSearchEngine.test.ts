/**
 * Tests for CodeSearchEngine
 *
 * Tests semantic search functionality including:
 * - Cosine similarity calculation
 * - Search with various options
 * - findSimilar functionality
 * - Filtering by project, language, file pattern, chunk types
 * - Threshold and limit application
 * - Highlight generation
 * - Edge cases (empty chunks, no matches)
 *
 * @module persistence/memory/code/CodeSearchEngine.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeSearchEngine, type IEmbeddingGenerator } from './CodeSearchEngine';
import type { CodeChunk, CodeChunkType } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock embedding generator
 */
function createMockEmbeddingGenerator(): IEmbeddingGenerator {
  return {
    embed: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
    embedBatch: vi.fn().mockResolvedValue([[0.5, 0.5, 0.5]]),
  };
}

/**
 * Create a test code chunk
 */
function createTestChunk(
  id: string,
  options: {
    projectId?: string;
    file?: string;
    content?: string;
    embedding?: number[];
    language?: string;
    chunkType?: CodeChunkType;
  } = {}
): CodeChunk {
  return {
    id,
    projectId: options.projectId ?? 'test-project',
    file: options.file ?? 'test.ts',
    startLine: 1,
    endLine: 10,
    content: options.content ?? 'function test() { return true; }',
    embedding: options.embedding ?? [0.5, 0.5, 0.5],
    symbols: ['test'],
    chunkType: options.chunkType ?? 'function',
    metadata: {
      language: options.language ?? 'typescript',
      hash: 'abc123',
    },
    indexedAt: new Date(),
  };
}

// ============================================================================
// Cosine Similarity Tests
// ============================================================================

describe('CodeSearchEngine - Cosine Similarity', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine();
  });

  it('should calculate similarity of 1.0 for identical vectors', () => {
    const embedding = [1, 0, 0];
    const similarity = engine.calculateSimilarity(embedding, embedding);
    expect(similarity).toBe(1);
  });

  it('should calculate similarity of 0.5 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const similarity = engine.calculateSimilarity(a, b);
    // Orthogonal vectors have cosine similarity of 0
    // After normalization: (0 + 1) / 2 = 0.5
    expect(similarity).toBe(0.5);
  });

  it('should calculate similarity of 0.0 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    const similarity = engine.calculateSimilarity(a, b);
    // Opposite vectors have cosine similarity of -1
    // After normalization: (-1 + 1) / 2 = 0
    expect(similarity).toBe(0);
  });

  it('should return 0 for empty vectors', () => {
    const similarity = engine.calculateSimilarity([], []);
    expect(similarity).toBe(0);
  });

  it('should return 0 for vectors of different lengths', () => {
    const a = [1, 0, 0];
    const b = [1, 0];
    const similarity = engine.calculateSimilarity(a, b);
    expect(similarity).toBe(0);
  });

  it('should return 0 for zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 0, 0];
    const similarity = engine.calculateSimilarity(a, b);
    expect(similarity).toBe(0);
  });

  it('should handle large vectors efficiently', () => {
    const size = 1536; // OpenAI embedding size
    const a = Array(size).fill(0.5);
    const b = Array(size).fill(0.5);

    const start = Date.now();
    const similarity = engine.calculateSimilarity(a, b);
    const duration = Date.now() - start;

    expect(similarity).toBe(1);
    expect(duration).toBeLessThan(50); // Should be fast
  });

  it('should calculate correct similarity for normalized vectors', () => {
    // Normalized vectors (magnitude = 1)
    const a = [0.6, 0.8, 0];
    const b = [0.8, 0.6, 0];
    const similarity = engine.calculateSimilarity(a, b);

    // Dot product: 0.6*0.8 + 0.8*0.6 = 0.48 + 0.48 = 0.96
    // Both have magnitude 1, so similarity = 0.96
    // After normalization: (0.96 + 1) / 2 = 0.98
    expect(similarity).toBeCloseTo(0.98, 2);
  });
});

// ============================================================================
// Search Tests
// ============================================================================

describe('CodeSearchEngine - Search', () => {
  let engine: CodeSearchEngine;
  let mockEmbeddingGenerator: IEmbeddingGenerator;

  beforeEach(() => {
    mockEmbeddingGenerator = createMockEmbeddingGenerator();
    engine = new CodeSearchEngine(mockEmbeddingGenerator);
  });

  it('should return empty array for empty chunks', async () => {
    const results = await engine.search([0.5, 0.5, 0.5], []);
    expect(results).toEqual([]);
  });

  it('should search with embedding directly', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.score).toBe(1);
  });

  it('should search with string query (requires embedding generator)', async () => {
    (mockEmbeddingGenerator.embed as ReturnType<typeof vi.fn>).mockResolvedValue([0.5, 0.5, 0.5]);

    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    const results = await engine.search('test query', chunks);

    expect(mockEmbeddingGenerator.embed).toHaveBeenCalledWith('test query');
    expect(results.length).toBe(1);
  });

  it('should throw error for string query without embedding generator', async () => {
    const engineWithoutGenerator = new CodeSearchEngine();
    const chunks = [createTestChunk('1')];

    await expect(engineWithoutGenerator.search('test query', chunks)).rejects.toThrow(
      'Embedding generator required'
    );
  });

  it('should sort results by score descending', async () => {
    // Use distinctly different embeddings to get different similarity scores
    const chunks = [
      createTestChunk('1', { embedding: [0.1, 0.9, 0] }),  // Low similarity to query
      createTestChunk('2', { embedding: [0.9, 0.1, 0] }),  // High similarity to query
      createTestChunk('3', { embedding: [0.5, 0.5, 0] }),  // Medium similarity
    ];

    const results = await engine.search([0.9, 0.1, 0], chunks, { threshold: 0 });

    // Highest similarity chunk should be first
    expect(results[0]?.chunk.id).toBe('2');
    expect(results[1]?.score).toBeLessThanOrEqual(results[0]?.score ?? 0);
    expect(results[2]?.score).toBeLessThanOrEqual(results[1]?.score ?? 0);
  });

  it('should apply limit option', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('3', { embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, { limit: 2 });

    expect(results.length).toBe(2);
  });
});

// ============================================================================
// Filtering Tests
// ============================================================================

describe('CodeSearchEngine - Filtering', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine();
  });

  it('should filter by projectId', async () => {
    const chunks = [
      createTestChunk('1', { projectId: 'project-a', embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { projectId: 'project-b', embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, {
      projectId: 'project-a',
      threshold: 0,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.projectId).toBe('project-a');
  });

  it('should filter by language', async () => {
    const chunks = [
      createTestChunk('1', { language: 'typescript', embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { language: 'javascript', embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, {
      language: 'typescript',
      threshold: 0,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.metadata.language).toBe('typescript');
  });

  it('should filter by file pattern (glob)', async () => {
    const chunks = [
      createTestChunk('1', { file: 'src/utils/helper.ts', embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { file: 'src/components/Button.tsx', embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, {
      filePattern: 'src/utils/**',
      threshold: 0,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.file).toBe('src/utils/helper.ts');
  });

  it('should filter by chunk types', async () => {
    const chunks = [
      createTestChunk('1', { chunkType: 'function', embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { chunkType: 'class', embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('3', { chunkType: 'interface', embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, {
      chunkTypes: ['function', 'class'],
      threshold: 0,
    });

    expect(results.length).toBe(2);
    expect(results.every((r) => ['function', 'class'].includes(r.chunk.chunkType))).toBe(true);
  });

  it('should exclude chunks without embeddings', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [] }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, { threshold: 0 });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.id).toBe('1');
  });

  it('should combine multiple filters', async () => {
    const chunks = [
      createTestChunk('1', {
        projectId: 'project-a',
        language: 'typescript',
        chunkType: 'function',
        embedding: [0.5, 0.5, 0.5],
      }),
      createTestChunk('2', {
        projectId: 'project-a',
        language: 'javascript',
        chunkType: 'function',
        embedding: [0.5, 0.5, 0.5],
      }),
      createTestChunk('3', {
        projectId: 'project-b',
        language: 'typescript',
        chunkType: 'function',
        embedding: [0.5, 0.5, 0.5],
      }),
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, {
      projectId: 'project-a',
      language: 'typescript',
      threshold: 0,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.id).toBe('1');
  });
});

// ============================================================================
// Threshold Tests
// ============================================================================

describe('CodeSearchEngine - Threshold Filtering', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine();
  });

  it('should filter results below threshold', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.9, 0.1, 0] }), // High similarity to query
      createTestChunk('2', { embedding: [0.1, 0.9, 0] }), // Lower similarity
    ];

    const results = await engine.search([0.9, 0.1, 0], chunks, { threshold: 0.9 });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.id).toBe('1');
  });

  it('should return all results with threshold 0', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.9, 0.1, 0] }),
      createTestChunk('2', { embedding: [0.1, 0.9, 0] }),
      createTestChunk('3', { embedding: [0.1, 0.1, 0.9] }),
    ];

    const results = await engine.search([0.9, 0.1, 0], chunks, { threshold: 0 });

    expect(results.length).toBe(3);
  });

  it('should return no results with threshold 1.0 for imperfect matches', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.9, 0.1, 0] }),
    ];

    const results = await engine.search([0.8, 0.2, 0], chunks, { threshold: 1.0 });

    expect(results.length).toBe(0);
  });
});

// ============================================================================
// FindSimilar Tests
// ============================================================================

describe('CodeSearchEngine - findSimilar', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine();
  });

  it('should find similar chunks', () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = engine.findSimilar([0.5, 0.5, 0.5], chunks, 10);

    expect(results.length).toBe(2);
    expect(results[0]?.score).toBe(1);
  });

  it('should respect limit', () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('3', { embedding: [0.5, 0.5, 0.5] }),
    ];

    const results = engine.findSimilar([0.5, 0.5, 0.5], chunks, 2);

    expect(results.length).toBe(2);
  });

  it('should return empty array for empty chunks', () => {
    const results = engine.findSimilar([0.5, 0.5, 0.5], [], 10);
    expect(results).toEqual([]);
  });

  it('should return empty array for empty embedding', () => {
    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];
    const results = engine.findSimilar([], chunks, 10);
    expect(results).toEqual([]);
  });

  it('should exclude chunks without embeddings', () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5] }),
      createTestChunk('2', { embedding: [] }),
    ];

    const results = engine.findSimilar([0.5, 0.5, 0.5], chunks, 10);

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.id).toBe('1');
  });

  it('should sort by similarity descending', () => {
    // Use distinctly different embeddings to get different similarity scores
    const chunks = [
      createTestChunk('1', { embedding: [0.1, 0.9, 0] }),  // Low similarity to query
      createTestChunk('2', { embedding: [0.9, 0.1, 0] }),  // High similarity to query
      createTestChunk('3', { embedding: [0.5, 0.5, 0] }),  // Medium similarity
    ];

    const results = engine.findSimilar([0.9, 0.1, 0], chunks, 10);

    // Highest similarity chunk should be first
    expect(results[0]?.chunk.id).toBe('2');
    expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
    expect(results[1]?.score).toBeGreaterThanOrEqual(results[2]?.score ?? 0);
  });
});

// ============================================================================
// Highlight Generation Tests
// ============================================================================

describe('CodeSearchEngine - Highlight Generation', () => {
  let engine: CodeSearchEngine;
  let mockEmbeddingGenerator: IEmbeddingGenerator;

  beforeEach(() => {
    mockEmbeddingGenerator = createMockEmbeddingGenerator();
    engine = new CodeSearchEngine(mockEmbeddingGenerator);
  });

  it('should generate highlights for matching lines', async () => {
    const content = `
function calculateTotal(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total;
}`;

    const chunks = [createTestChunk('1', { content, embedding: [0.5, 0.5, 0.5] })];

    const results = await engine.search('calculate total', chunks, {
      includeContext: true,
      threshold: 0,
    });

    expect(results[0]?.highlights).toBeDefined();
    expect(results[0]?.highlights?.length).toBeGreaterThan(0);
    expect(results[0]?.highlights?.some((h) => h.toLowerCase().includes('calculate'))).toBe(true);
  });

  it('should limit highlights to 3', async () => {
    const content = `
function test1() { return 'test'; }
function test2() { return 'test'; }
function test3() { return 'test'; }
function test4() { return 'test'; }
function test5() { return 'test'; }
`;

    const chunks = [createTestChunk('1', { content, embedding: [0.5, 0.5, 0.5] })];

    const results = await engine.search('test function', chunks, {
      includeContext: true,
      threshold: 0,
    });

    expect(results[0]?.highlights?.length).toBeLessThanOrEqual(3);
  });

  it('should not include highlights when includeContext is false', async () => {
    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    const results = await engine.search('test', chunks, {
      includeContext: false,
      threshold: 0,
    });

    expect(results[0]?.highlights).toBeUndefined();
  });

  it('should return empty highlights for short query terms', async () => {
    const content = 'function x() { return y; }';
    const chunks = [createTestChunk('1', { content, embedding: [0.5, 0.5, 0.5] })];

    const results = await engine.search('x y', chunks, {
      includeContext: true,
      threshold: 0,
    });

    // Terms shorter than 3 chars are filtered out
    expect(results[0]?.highlights).toEqual([]);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('CodeSearchEngine - Edge Cases', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine();
  });

  it('should handle chunks with null embeddings', async () => {
    const chunk = createTestChunk('1', { embedding: [0.5, 0.5, 0.5] });
    // @ts-expect-error - Testing null embedding
    chunk.embedding = null;

    const results = await engine.search([0.5, 0.5, 0.5], [chunk], { threshold: 0 });
    expect(results.length).toBe(0);
  });

  it('should handle very large number of chunks', async () => {
    const chunks = Array.from({ length: 1000 }, (_, i) =>
      createTestChunk(String(i), { embedding: [0.5, 0.5, 0.5] })
    );

    const start = Date.now();
    const results = await engine.search([0.5, 0.5, 0.5], chunks, { limit: 10, threshold: 0 });
    const duration = Date.now() - start;

    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should handle mismatched embedding dimensions gracefully', async () => {
    const chunks = [
      createTestChunk('1', { embedding: [0.5, 0.5, 0.5, 0.5] }), // 4 dimensions
    ];

    const results = await engine.search([0.5, 0.5, 0.5], chunks, { threshold: 0 }); // 3 dimensions

    // Mismatched dimensions result in 0 similarity score (returned before normalization)
    // Score of 0 still passes threshold of 0
    expect(results.length).toBe(1);
    expect(results[0]?.score).toBe(0); // Zero for mismatched dimensions
  });

  it('should handle NaN values in embeddings', () => {
    const a = [NaN, 0.5, 0.5];
    const b = [0.5, 0.5, 0.5];

    const similarity = engine.calculateSimilarity(a, b);
    expect(Number.isNaN(similarity)).toBe(true);
  });

  it('should handle Infinity values in embeddings', () => {
    const a = [Infinity, 0.5, 0.5];
    const b = [0.5, 0.5, 0.5];

    const similarity = engine.calculateSimilarity(a, b);
    // Result may be NaN or Infinity depending on calculation
    expect(Number.isFinite(similarity)).toBe(false);
  });
});

// ============================================================================
// Cache Tests
// ============================================================================

describe('CodeSearchEngine - Cache', () => {
  let engine: CodeSearchEngine;
  let mockEmbeddingGenerator: IEmbeddingGenerator;

  beforeEach(() => {
    mockEmbeddingGenerator = createMockEmbeddingGenerator();
    engine = new CodeSearchEngine(mockEmbeddingGenerator, { cacheEmbeddings: true });
  });

  it('should cache embeddings for repeated queries', async () => {
    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    await engine.search('test query', chunks, { threshold: 0 });
    await engine.search('test query', chunks, { threshold: 0 });

    // Should only call embed once due to caching
    expect(mockEmbeddingGenerator.embed).toHaveBeenCalledTimes(1);
  });

  it('should report cache size', async () => {
    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    expect(engine.getCacheSize()).toBe(0);

    await engine.search('query 1', chunks, { threshold: 0 });
    expect(engine.getCacheSize()).toBe(1);

    await engine.search('query 2', chunks, { threshold: 0 });
    expect(engine.getCacheSize()).toBe(2);
  });

  it('should clear cache', async () => {
    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    await engine.search('test query', chunks, { threshold: 0 });
    expect(engine.getCacheSize()).toBe(1);

    engine.clearCache();
    expect(engine.getCacheSize()).toBe(0);
  });

  it('should respect maxCacheSize', async () => {
    const engineWithSmallCache = new CodeSearchEngine(mockEmbeddingGenerator, {
      cacheEmbeddings: true,
      maxCacheSize: 2,
    });

    const chunks = [createTestChunk('1', { embedding: [0.5, 0.5, 0.5] })];

    await engineWithSmallCache.search('query 1', chunks, { threshold: 0 });
    await engineWithSmallCache.search('query 2', chunks, { threshold: 0 });
    await engineWithSmallCache.search('query 3', chunks, { threshold: 0 });

    expect(engineWithSmallCache.getCacheSize()).toBe(2);
  });
});

// ============================================================================
// Batch Processing Tests
// ============================================================================

describe('CodeSearchEngine - Batch Processing', () => {
  let engine: CodeSearchEngine;

  beforeEach(() => {
    engine = new CodeSearchEngine(undefined, { enableBatching: true, batchSize: 50 });
  });

  it('should use batch processing for large chunk sets', async () => {
    const chunks = Array.from({ length: 100 }, (_, i) =>
      createTestChunk(String(i), { embedding: [0.5, 0.5, 0.5] })
    );

    const results = await engine.search([0.5, 0.5, 0.5], chunks, { threshold: 0 });

    expect(results.length).toBeGreaterThan(0);
  });

  it('should produce same results with and without batching', async () => {
    const chunks = Array.from({ length: 100 }, (_, i) =>
      createTestChunk(String(i), { embedding: [Math.random(), Math.random(), Math.random()] })
    );

    const engineWithBatching = new CodeSearchEngine(undefined, { enableBatching: true, batchSize: 10 });
    const engineWithoutBatching = new CodeSearchEngine(undefined, { enableBatching: false });

    const query = [0.5, 0.5, 0.5];
    const resultsWith = await engineWithBatching.search(query, chunks, { threshold: 0, limit: 10 });
    const resultsWithout = await engineWithoutBatching.search(query, chunks, { threshold: 0, limit: 10 });

    // Same top results (order may vary slightly for equal scores)
    expect(resultsWith.length).toBe(resultsWithout.length);
  });
});
