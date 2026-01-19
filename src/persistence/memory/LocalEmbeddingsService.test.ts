/**
 * LocalEmbeddingsService Tests - Phase 16: Full CLI Support Integration
 * Target: 25+ tests covering all functionality
 *
 * Test Structure:
 * - Constructor (5 tests)
 * - Initialization (4 tests)
 * - isAvailable (3 tests)
 * - embed (6 tests)
 * - embedBatch (4 tests)
 * - cosineSimilarity (4 tests)
 * - findMostSimilar (3 tests)
 * - Cache (5 tests)
 * - Statistics (3 tests)
 * - Error handling (5 tests)
 *
 * @module persistence/memory/LocalEmbeddingsService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  LocalEmbeddingsService,
  LocalEmbeddingsError,
  LocalEmbeddingsInitError,
  LocalEmbeddingsNotInitializedError,
  LocalEmbeddingsInferenceError,
} from './LocalEmbeddingsService';
import {
  LocalEmbeddingsConfig,
  LocalEmbeddingsErrorCode,
  MODEL_DIMENSIONS,
  DEFAULT_LOCAL_MODEL,
  DEFAULT_LOCAL_EMBEDDINGS_CONFIG,
} from './LocalEmbeddingsService.types';

// Mock the @huggingface/transformers module
const mockPipelineResult = vi.fn();
const mockPipeline = vi.fn().mockResolvedValue(mockPipelineResult);

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
}));

describe('LocalEmbeddingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behavior
    mockPipelineResult.mockResolvedValue({
      data: new Float32Array(384).fill(0.1),
    });
    mockPipeline.mockResolvedValue(mockPipelineResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Constructor Tests (5 tests)
  // ==========================================================================

  describe('Constructor', () => {
    it('should use default configuration when none provided', () => {
      const service = new LocalEmbeddingsService();
      expect(service).toBeDefined();
      expect(service.getModel()).toBe(DEFAULT_LOCAL_MODEL);
      expect(service.getDimension()).toBe(MODEL_DIMENSIONS[DEFAULT_LOCAL_MODEL]);
    });

    it('should accept custom model configuration', () => {
      const service = new LocalEmbeddingsService({
        model: 'Xenova/all-mpnet-base-v2',
      });
      expect(service.getModel()).toBe('Xenova/all-mpnet-base-v2');
      expect(service.getDimension()).toBe(768); // MPNet dimensions
    });

    it('should accept custom dimensions that override model defaults', () => {
      const service = new LocalEmbeddingsService({
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 512, // Override default 384
      });
      expect(service.getDimension()).toBe(512);
    });

    it('should accept cache configuration', () => {
      const service = new LocalEmbeddingsService({
        cacheEnabled: false,
        maxCacheSize: 5000,
      });
      expect(service).toBeDefined();
    });

    it('should accept logger configuration', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const service = new LocalEmbeddingsService({ logger });
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Initialization Tests (4 tests)
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize pipeline on first use', async () => {
      const service = new LocalEmbeddingsService();
      await service.initialize();

      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        DEFAULT_LOCAL_MODEL,
        expect.any(Object)
      );
    });

    it('should not reinitialize if already initialized', async () => {
      const service = new LocalEmbeddingsService();
      await service.initialize();
      await service.initialize(); // Second call

      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('should call progress callback during initialization', async () => {
      const progressCallback = vi.fn();

      mockPipeline.mockImplementation(
        async (
          task: string,
          model: string,
          options: { progress_callback?: (p: unknown) => void }
        ) => {
          // Simulate progress updates
          if (options.progress_callback) {
            options.progress_callback({ progress: 50 });
          }
          return mockPipelineResult;
        }
      );

      const service = new LocalEmbeddingsService({ progressCallback });
      await service.initialize();

      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should skip real initialization in mock mode', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      await service.initialize();

      expect(mockPipeline).not.toHaveBeenCalled();
      expect(service.isInitialized()).toBe(true);
    });
  });

  // ==========================================================================
  // isAvailable Tests (3 tests)
  // ==========================================================================

  describe('isAvailable', () => {
    it('should return true when model can be loaded', async () => {
      const service = new LocalEmbeddingsService();
      const available = await service.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when model fails to load', async () => {
      mockPipeline.mockRejectedValue(new Error('Network error'));

      const service = new LocalEmbeddingsService();
      const available = await service.isAvailable();

      expect(available).toBe(false);
    });

    it('should return true in mock mode', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const available = await service.isAvailable();

      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // embed Tests (6 tests)
  // ==========================================================================

  describe('embed', () => {
    it('should generate embedding for text', async () => {
      const expectedEmbedding = new Float32Array(384).fill(0.1);
      mockPipelineResult.mockResolvedValue({
        data: expectedEmbedding,
      });

      const service = new LocalEmbeddingsService();
      const result = await service.embed('Hello world');

      expect(result.embedding).toHaveLength(384);
      expect(result.embedding).toEqual(Array.from(expectedEmbedding));
      expect(result.cached).toBe(false);
      expect(result.model).toBe(DEFAULT_LOCAL_MODEL);
    });

    it('should return correct dimensions', async () => {
      const service = new LocalEmbeddingsService();
      const result = await service.embed('Test text');

      expect(result.embedding.length).toBe(service.getDimension());
    });

    it('should estimate token count', async () => {
      const service = new LocalEmbeddingsService();
      const result = await service.embed('Hello world'); // 11 chars

      // ~4 chars per token, so "Hello world" should be ~3 tokens
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.tokenCount).toBe(Math.ceil(11 / 4));
    });

    it('should include latency in result', async () => {
      const service = new LocalEmbeddingsService();
      const result = await service.embed('Test');

      expect(result.latencyMs).toBeDefined();
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should use cache when enabled and text matches', async () => {
      const service = new LocalEmbeddingsService({ cacheEnabled: true });

      // First call
      const result1 = await service.embed('Same text');
      expect(result1.cached).toBe(false);

      // Second call - should be cached
      const result2 = await service.embed('Same text');
      expect(result2.cached).toBe(true);

      // Pipeline inference should only be called once
      expect(mockPipelineResult).toHaveBeenCalledTimes(1);
    });

    it('should generate deterministic embeddings in mock mode', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });

      const result1 = await service.embed('Test text');

      // Clear cache to force regeneration
      service.clearCache();

      const result2 = await service.embed('Test text');

      // Same input should produce same output in mock mode
      expect(result1.embedding).toEqual(result2.embedding);
    });
  });

  // ==========================================================================
  // embedBatch Tests (4 tests)
  // ==========================================================================

  describe('embedBatch', () => {
    it('should process multiple texts', async () => {
      const service = new LocalEmbeddingsService();
      const results = await service.embedBatch(['Text 1', 'Text 2', 'Text 3']);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.embedding).toHaveLength(384);
      });
    });

    it('should use cache for already-embedded texts', async () => {
      const service = new LocalEmbeddingsService({ cacheEnabled: true });

      // First embed some texts
      await service.embed('Text 1');
      await service.embed('Text 2');

      // Reset mock to count new calls
      mockPipelineResult.mockClear();

      // Now batch with one new text
      const results = await service.embedBatch([
        'Text 1', // cached
        'Text 2', // cached
        'Text 3', // new
      ]);

      expect(results[0].cached).toBe(true);
      expect(results[1].cached).toBe(true);
      expect(results[2].cached).toBe(false);

      // Only Text 3 should have triggered inference
      expect(mockPipelineResult).toHaveBeenCalledTimes(1);
    });

    it('should handle empty array', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const results = await service.embedBatch([]);

      expect(results).toEqual([]);
    });

    it('should preserve order of results', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const texts = ['Alpha', 'Beta', 'Gamma', 'Delta'];
      const results = await service.embedBatch(texts);

      // Each text should produce different embeddings in mock mode (hash-based)
      expect(results[0].embedding).not.toEqual(results[1].embedding);
      expect(results[1].embedding).not.toEqual(results[2].embedding);
    });
  });

  // ==========================================================================
  // cosineSimilarity Tests (4 tests)
  // ==========================================================================

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const vector = [0.5, 0.5, 0.5, 0.5];

      const similarity = service.cosineSimilarity(vector, vector);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const vector1 = [1, 0, 0];
      const vector2 = [-1, 0, 0];

      const similarity = service.cosineSimilarity(vector1, vector2);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const vector1 = [1, 0];
      const vector2 = [0, 1];

      const similarity = service.cosineSimilarity(vector1, vector2);

      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should throw error for mismatched dimensions', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const vector1 = [1, 2, 3];
      const vector2 = [1, 2];

      expect(() => service.cosineSimilarity(vector1, vector2)).toThrow(
        'Embedding dimensions must match'
      );
    });
  });

  // ==========================================================================
  // findMostSimilar Tests (3 tests)
  // ==========================================================================

  describe('findMostSimilar', () => {
    it('should return top K most similar embeddings', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const query = [1, 0, 0];
      const candidates = [
        [0.9, 0.1, 0], // Very similar
        [0, 1, 0], // Orthogonal
        [0.8, 0.2, 0], // Similar
        [-1, 0, 0], // Opposite
      ];

      const results = service.findMostSimilar(query, candidates, 2);

      expect(results).toHaveLength(2);
      expect(results[0].index).toBe(0); // Most similar first
      expect(results[1].index).toBe(2); // Second most similar
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('should sort by similarity descending', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const query = [1, 0];
      const candidates = [
        [0.5, 0.5],
        [1, 0],
        [0, 1],
      ];

      const results = service.findMostSimilar(query, candidates, 3);

      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
    });

    it('should use default topK of 10', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const query = [1, 0];
      const candidates = Array(20)
        .fill(null)
        .map((_, i) => [Math.cos(i), Math.sin(i)]);

      const results = service.findMostSimilar(query, candidates);

      expect(results).toHaveLength(10);
    });
  });

  // ==========================================================================
  // Cache Tests (5 tests)
  // ==========================================================================

  describe('Cache', () => {
    it('should cache embeddings when enabled', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        cacheEnabled: true,
      });

      await service.embed('Text 1');
      await service.embed('Text 2');

      expect(service.getCacheSize()).toBe(2);
    });

    it('should not cache when disabled', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        cacheEnabled: false,
      });

      await service.embed('Text 1');
      await service.embed('Text 2');

      expect(service.getCacheSize()).toBe(0);
    });

    it('should implement LRU eviction when max size reached', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        cacheEnabled: true,
        maxCacheSize: 3,
      });

      await service.embed('Text 1');
      await service.embed('Text 2');
      await service.embed('Text 3');
      await service.embed('Text 4'); // Should evict Text 1

      expect(service.getCacheSize()).toBe(3);

      // Text 1 should no longer be cached
      const result = await service.embed('Text 1');
      expect(result.cached).toBe(false);
    });

    it('should clear cache when requested', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        cacheEnabled: true,
      });

      await service.embed('Text 1');
      await service.embed('Text 2');
      expect(service.getCacheSize()).toBe(2);

      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });

    it('should track cache hit rate in stats', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        cacheEnabled: true,
      });

      await service.embed('Text 1'); // Miss
      await service.embed('Text 1'); // Hit
      await service.embed('Text 2'); // Miss
      await service.embed('Text 1'); // Hit

      const stats = service.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.totalEmbeddings).toBe(4);
      expect(stats.cacheHitRate).toBeCloseTo(0.5, 2);
    });
  });

  // ==========================================================================
  // Statistics Tests (3 tests)
  // ==========================================================================

  describe('Statistics', () => {
    it('should track total embeddings', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });

      await service.embed('Text 1');
      await service.embed('Text 2');
      await service.embed('Text 3');

      const stats = service.getStats();
      expect(stats.totalEmbeddings).toBe(3);
    });

    it('should track average latency', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });

      await service.embed('Text');

      const stats = service.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should report initialization status', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });

      let stats = service.getStats();
      expect(stats.initialized).toBe(false);

      await service.initialize();

      stats = service.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.model).toBe(DEFAULT_LOCAL_MODEL);
      expect(stats.dimensions).toBe(MODEL_DIMENSIONS[DEFAULT_LOCAL_MODEL]);
    });
  });

  // ==========================================================================
  // Error Handling Tests (5 tests)
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw LocalEmbeddingsInitError when model fails to load', async () => {
      mockPipeline.mockRejectedValue(new Error('Network timeout'));

      const service = new LocalEmbeddingsService();

      await expect(service.initialize()).rejects.toThrow(
        LocalEmbeddingsInitError
      );
    });

    it('should include helpful message in init error', async () => {
      mockPipeline.mockRejectedValue(new Error('Download failed'));

      const service = new LocalEmbeddingsService();

      try {
        await service.initialize();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LocalEmbeddingsInitError);
        expect((error as LocalEmbeddingsInitError).message).toContain(
          'OPENAI_API_KEY'
        );
        expect((error as LocalEmbeddingsInitError).message).toContain(
          'internet connection'
        );
      }
    });

    it('should preserve original error as cause', async () => {
      const originalError = new Error('Original error');
      mockPipeline.mockRejectedValue(originalError);

      const service = new LocalEmbeddingsService();

      try {
        await service.initialize();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LocalEmbeddingsError).cause).toBe(originalError);
      }
    });

    it('should throw LocalEmbeddingsInferenceError on inference failure', async () => {
      mockPipelineResult.mockRejectedValue(new Error('OOM'));

      const service = new LocalEmbeddingsService();
      await service.initialize();

      await expect(service.embed('Test')).rejects.toThrow(
        LocalEmbeddingsInferenceError
      );
    });

    it('should have correct error codes', async () => {
      mockPipeline.mockRejectedValue(new Error('Failed'));

      const service = new LocalEmbeddingsService();

      try {
        await service.initialize();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LocalEmbeddingsError).code).toBe(
          LocalEmbeddingsErrorCode.INIT_FAILED
        );
      }
    });
  });

  // ==========================================================================
  // Additional Coverage Tests
  // ==========================================================================

  describe('Additional Coverage', () => {
    it('should handle zero vectors in cosine similarity', () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const zeroVector = [0, 0, 0];
      const normalVector = [1, 0, 0];

      const similarity = service.cosineSimilarity(zeroVector, normalVector);

      expect(similarity).toBe(0);
    });

    it('should normalize embeddings in mock mode', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });
      const result = await service.embed('Test');

      // Calculate norm
      const norm = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );

      // Normalized vectors should have norm close to 1
      expect(norm).toBeCloseTo(1, 5);
    });

    it('should use model-specific dimensions from mapping', () => {
      const models = Object.keys(MODEL_DIMENSIONS);

      for (const model of models.slice(0, 3)) { // Test first 3 models
        const service = new LocalEmbeddingsService({ model });
        expect(service.getDimension()).toBe(MODEL_DIMENSIONS[model]);
      }
    });

    it('should support batch size configuration', async () => {
      const service = new LocalEmbeddingsService({
        mockMode: true,
        batchSize: 2,
      });

      const texts = ['T1', 'T2', 'T3', 'T4', 'T5'];
      const results = await service.embedBatch(texts);

      expect(results).toHaveLength(5);
    });

    it('should generate different mock embeddings for different texts', async () => {
      const service = new LocalEmbeddingsService({ mockMode: true });

      const result1 = await service.embed('Hello');
      service.clearCache();
      const result2 = await service.embed('World');

      // Different inputs should produce different outputs
      expect(result1.embedding).not.toEqual(result2.embedding);
    });
  });
});
