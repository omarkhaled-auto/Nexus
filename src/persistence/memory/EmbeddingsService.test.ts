/**
 * EmbeddingsService Tests
 *
 * TDD RED Phase: These tests describe the expected behavior of EmbeddingsService
 * before implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EmbeddingsService,
  EmbeddingsError,
  EmbeddingAPIError,
  CacheError,
  type EmbeddingsServiceOptions,
} from './EmbeddingsService';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Error Types
  // ============================================================================

  describe('Error Types', () => {
    it('should have EmbeddingsError as base class', () => {
      const error = new EmbeddingsError('test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EmbeddingsError);
      expect(error.name).toBe('EmbeddingsError');
      expect(error.message).toBe('test message');
    });

    it('should have EmbeddingAPIError with statusCode', () => {
      const error = new EmbeddingAPIError(429, 'Rate limited');
      expect(error).toBeInstanceOf(EmbeddingsError);
      expect(error).toBeInstanceOf(EmbeddingAPIError);
      expect(error.name).toBe('EmbeddingAPIError');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limited');
    });

    it('should have CacheError with reason', () => {
      const error = new CacheError('Cache miss');
      expect(error).toBeInstanceOf(EmbeddingsError);
      expect(error).toBeInstanceOf(CacheError);
      expect(error.name).toBe('CacheError');
      expect(error.reason).toBe('Cache miss');
    });
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('Constructor', () => {
    it('should accept API key from options', () => {
      const options: EmbeddingsServiceOptions = {
        apiKey: 'test-api-key',
      };
      service = new EmbeddingsService(options);
      expect(service).toBeInstanceOf(EmbeddingsService);
    });

    it('should accept mock mode option', () => {
      const options: EmbeddingsServiceOptions = {
        apiKey: 'test-api-key',
        mockMode: true,
      };
      service = new EmbeddingsService(options);
      expect(service).toBeInstanceOf(EmbeddingsService);
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const options: EmbeddingsServiceOptions = {
        apiKey: 'test-api-key',
        logger,
      };
      service = new EmbeddingsService(options);
      expect(service).toBeInstanceOf(EmbeddingsService);
    });
  });

  // ============================================================================
  // Embedding Generation (Mock Mode)
  // ============================================================================

  describe('embed() - Mock Mode', () => {
    beforeEach(() => {
      service = new EmbeddingsService({
        apiKey: 'test-key',
        mockMode: true,
      });
    });

    it('should return 1536-dimensional vector', async () => {
      const embedding = await service.embed('test text');
      expect(embedding).toHaveLength(1536);
      expect(typeof embedding[0]).toBe('number');
    });

    it('should return deterministic embeddings for same input', async () => {
      const embedding1 = await service.embed('test text');
      const embedding2 = await service.embed('test text');
      expect(embedding1).toEqual(embedding2);
    });

    it('should return different embeddings for different inputs', async () => {
      const embedding1 = await service.embed('text one');
      const embedding2 = await service.embed('text two');
      expect(embedding1).not.toEqual(embedding2);
    });

    it('should cache embeddings by content hash', async () => {
      await service.embed('test text');
      await service.embed('test text');
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should return cached result on cache hit', async () => {
      const embedding1 = await service.embed('cached text');
      const embedding2 = await service.embed('cached text');
      expect(embedding1).toEqual(embedding2);
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
    });
  });

  // ============================================================================
  // Batch Embedding (Mock Mode)
  // ============================================================================

  describe('embedBatch() - Mock Mode', () => {
    beforeEach(() => {
      service = new EmbeddingsService({
        apiKey: 'test-key',
        mockMode: true,
      });
    });

    it('should return array of embeddings for multiple texts', async () => {
      const texts = ['text one', 'text two', 'text three'];
      const embeddings = await service.embedBatch(texts);
      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toHaveLength(1536);
      expect(embeddings[1]).toHaveLength(1536);
      expect(embeddings[2]).toHaveLength(1536);
    });

    it('should return empty array for empty input', async () => {
      const embeddings = await service.embedBatch([]);
      expect(embeddings).toEqual([]);
    });

    it('should cache each text individually', async () => {
      const texts = ['batch text one', 'batch text two'];
      await service.embedBatch(texts);

      // Individual embeds should hit cache
      await service.embed('batch text one');
      await service.embed('batch text two');

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(2);
    });
  });

  // ============================================================================
  // Cache Management
  // ============================================================================

  describe('Cache Management', () => {
    beforeEach(() => {
      service = new EmbeddingsService({
        apiKey: 'test-key',
        mockMode: true,
      });
    });

    it('should clear cache with clearCache()', async () => {
      await service.embed('text to cache');
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache stats with getCacheStats()', async () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
    });

    it('should track cache hits and misses', async () => {
      await service.embed('unique text 1');
      await service.embed('unique text 2');
      await service.embed('unique text 1'); // Cache hit

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });
  });

  // ============================================================================
  // API Integration (Real Mode - Mocked Fetch)
  // ============================================================================

  describe('embed() - API Mode', () => {
    beforeEach(() => {
      service = new EmbeddingsService({
        apiKey: 'sk-test-key',
        mockMode: false,
      });
    });

    it('should call OpenAI API with correct parameters', async () => {
      const mockResponse = {
        data: [{ embedding: new Array(1536).fill(0.1) }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.embed('test text');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('text-embedding-3-small'),
        })
      );
    });

    it('should throw EmbeddingAPIError on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.embed('test')).rejects.toThrow(EmbeddingAPIError);
    });

    it('should throw EmbeddingAPIError with correct status code', async () => {
      // Use a service with no retries to test immediate error
      const noRetryService = new EmbeddingsService({
        apiKey: 'sk-test-key',
        mockMode: false,
        maxRetries: 1, // Only one attempt, no retries
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      try {
        await noRetryService.embed('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingAPIError);
        expect((error as EmbeddingAPIError).statusCode).toBe(401);
      }
    });

    it('should retry on rate limit with exponential backoff', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Rate Limited',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [{ embedding: new Array(1536).fill(0.1) }],
          }),
        });
      });

      const embedding = await service.embed('retry test');
      expect(embedding).toHaveLength(1536);
      expect(callCount).toBe(3);
    }, 15000); // Longer timeout for retry test
  });

  // ============================================================================
  // embedBatch() - API Mode
  // ============================================================================

  describe('embedBatch() - API Mode', () => {
    beforeEach(() => {
      service = new EmbeddingsService({
        apiKey: 'sk-test-key',
        mockMode: false,
      });
    });

    it('should use single API call for batch embedding', async () => {
      const mockResponse = {
        data: [
          { embedding: new Array(1536).fill(0.1) },
          { embedding: new Array(1536).fill(0.2) },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const texts = ['text one', 'text two'];
      const embeddings = await service.embedBatch(texts);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(embeddings).toHaveLength(2);
    });
  });
});
