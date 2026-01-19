/**
 * LocalEmbeddingsService - Local vector embedding generation
 *
 * Provides embedding generation using local Transformers.js models.
 * No API keys required - runs entirely offline after initial model download.
 *
 * Features:
 * - Local model inference via Transformers.js
 * - LRU caching for repeated embeddings
 * - Mock mode for testing
 * - Compatible interface with EmbeddingsService
 * - Multiple model support (MiniLM, MPNet, etc.)
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/LocalEmbeddingsService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  LocalEmbeddingsConfig,
  LocalEmbeddingResult,
  LocalEmbeddingsStats,
  LocalEmbeddingsErrorCode,
  ILocalEmbeddingsService,
  MODEL_DIMENSIONS,
  DEFAULT_LOCAL_MODEL,
  DEFAULT_LOCAL_EMBEDDINGS_CONFIG,
} from './LocalEmbeddingsService.types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Polling interval for checking model download progress
 */
const PROGRESS_POLL_INTERVAL = 500;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error for LocalEmbeddingsService
 */
export class LocalEmbeddingsError extends Error {
  public readonly code: LocalEmbeddingsErrorCode;
  public readonly suggestion?: string;
  public override readonly cause?: Error;

  constructor(
    code: LocalEmbeddingsErrorCode,
    message: string,
    suggestion?: string,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'LocalEmbeddingsError';
    this.code = code;
    this.suggestion = suggestion;
    this.cause = cause;
  }
}

/**
 * Error thrown when model initialization fails
 */
export class LocalEmbeddingsInitError extends LocalEmbeddingsError {
  constructor(model: string, cause?: Error) {
    super(
      LocalEmbeddingsErrorCode.INIT_FAILED,
      `Failed to initialize local embeddings model '${model}'.\n\n` +
        `Options:\n` +
        `1. Check your internet connection (model downloads on first use)\n` +
        `2. Use a different model in Settings > Embeddings > Model\n` +
        `3. Use OpenAI API for embeddings:\n` +
        `   Set OPENAI_API_KEY in your .env file\n`,
      'Try using OpenAI API as a fallback',
      cause
    );
    this.name = 'LocalEmbeddingsInitError';
  }
}

/**
 * Error thrown when service is used before initialization
 */
export class LocalEmbeddingsNotInitializedError extends LocalEmbeddingsError {
  constructor() {
    super(
      LocalEmbeddingsErrorCode.NOT_INITIALIZED,
      'LocalEmbeddingsService not initialized. Call initialize() first.',
      'Call await service.initialize() before using embed()'
    );
    this.name = 'LocalEmbeddingsNotInitializedError';
  }
}

/**
 * Error thrown when inference fails
 */
export class LocalEmbeddingsInferenceError extends LocalEmbeddingsError {
  constructor(message: string, cause?: Error) {
    super(
      LocalEmbeddingsErrorCode.INFERENCE_FAILED,
      `Embedding inference failed: ${message}`,
      'Try with shorter input text or different model',
      cause
    );
    this.name = 'LocalEmbeddingsInferenceError';
  }
}

// ============================================================================
// LocalEmbeddingsService Implementation
// ============================================================================

/**
 * Service for generating vector embeddings using local models
 *
 * Uses Transformers.js (Hugging Face) for local inference.
 * Models are downloaded on first use and cached locally.
 *
 * @example
 * ```typescript
 * const service = new LocalEmbeddingsService();
 * await service.initialize();
 *
 * const result = await service.embed('Hello world');
 * console.log(result.embedding); // [0.1, 0.2, ...]
 * ```
 */
export class LocalEmbeddingsService implements ILocalEmbeddingsService {
  // Configuration
  private readonly model: string;
  private readonly dimensions: number;
  private readonly cacheEnabled: boolean;
  private readonly maxCacheSize: number;
  private readonly batchSize: number;
  private readonly mockMode: boolean;
  private readonly progressCallback?: (progress: number) => void;
  private readonly logger: {
    debug?: (msg: string, meta?: Record<string, unknown>) => void;
    info?: (msg: string, meta?: Record<string, unknown>) => void;
    warn?: (msg: string, meta?: Record<string, unknown>) => void;
    error?: (msg: string, meta?: Record<string, unknown>) => void;
  };

  // State
  private initialized: boolean = false;
  private pipeline: any = null;
  private cache: Map<string, number[]> = new Map();

  // Statistics
  private totalEmbeddings: number = 0;
  private cacheHits: number = 0;
  private totalLatencyMs: number = 0;

  constructor(config: LocalEmbeddingsConfig = {}) {
    // Apply defaults
    const merged = { ...DEFAULT_LOCAL_EMBEDDINGS_CONFIG, ...config };

    this.model = merged.model;
    this.cacheEnabled = merged.cacheEnabled;
    this.maxCacheSize = merged.maxCacheSize;
    this.batchSize = merged.batchSize;
    this.mockMode = merged.mockMode;
    this.progressCallback = config.progressCallback;
    this.logger = config.logger ?? {};

    // Resolve dimensions from model if not explicitly set
    this.dimensions =
      config.dimensions ?? MODEL_DIMENSIONS[this.model] ?? merged.dimensions;

    this.logger.debug?.('LocalEmbeddingsService created', {
      model: this.model,
      dimensions: this.dimensions,
      mockMode: this.mockMode,
    });
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Initialize the embeddings pipeline
   *
   * Downloads the model on first use if not cached locally.
   * Safe to call multiple times - subsequent calls are no-ops.
   *
   * @throws LocalEmbeddingsInitError if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.mockMode) {
      this.initialized = true;
      this.logger.info?.('LocalEmbeddingsService initialized in mock mode');
      return;
    }

    try {
      this.logger.info?.(`Loading model: ${this.model}`, { model: this.model });

      // Dynamic import to avoid loading Transformers.js until needed
      const { pipeline } = await import('@huggingface/transformers');

      // Track progress if callback provided
      let lastProgress = 0;
      const progressHandler = (progress: any) => {
        if (progress?.progress !== undefined) {
          const pct = Math.round(progress.progress);
          if (pct !== lastProgress) {
            lastProgress = pct;
            this.progressCallback?.(pct);
            this.logger.debug?.(`Model loading: ${pct}%`);
          }
        }
      };

      // Create the feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.model, {
        progress_callback: progressHandler,
      });

      this.initialized = true;
      this.progressCallback?.(100);
      this.logger.info?.('LocalEmbeddingsService initialized successfully', {
        model: this.model,
        dimensions: this.dimensions,
      });
    } catch (error) {
      this.logger.error?.('Failed to initialize LocalEmbeddingsService', {
        model: this.model,
        error: String(error),
      });
      throw new LocalEmbeddingsInitError(
        this.model,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if local embeddings are available
   *
   * Attempts to initialize the service and returns true if successful.
   * Returns false if initialization fails (e.g., model unavailable).
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate embedding for a single text
   *
   * @param text - Input text to embed
   * @returns Embedding result with vector and metadata
   * @throws LocalEmbeddingsNotInitializedError if not initialized
   * @throws LocalEmbeddingsInferenceError if inference fails
   */
  async embed(text: string): Promise<LocalEmbeddingResult> {
    const startTime = Date.now();

    // Check cache first (with LRU refresh)
    if (this.cacheEnabled) {
      const cached = this.getFromCache(text);
      if (cached) {
        this.cacheHits++;
        this.totalEmbeddings++;
        return {
          embedding: cached,
          tokenCount: this.estimateTokens(text),
          cached: true,
          model: this.model,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // Generate embedding
    let embedding: number[];

    if (this.mockMode) {
      embedding = this.generateMockEmbedding(text);
    } else {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.pipeline) {
        throw new LocalEmbeddingsNotInitializedError();
      }

      try {
        // Run inference
        const output = await this.pipeline(text, {
          pooling: 'mean',
          normalize: true,
        });

        // Extract embedding from tensor
        embedding = Array.from(output.data as Float32Array);
      } catch (error) {
        throw new LocalEmbeddingsInferenceError(
          String(error),
          error instanceof Error ? error : undefined
        );
      }
    }

    const latencyMs = Date.now() - startTime;

    // Cache result
    if (this.cacheEnabled) {
      this.addToCache(text, embedding);
    }

    // Update stats
    this.totalEmbeddings++;
    this.totalLatencyMs += latencyMs;

    return {
      embedding,
      tokenCount: this.estimateTokens(text),
      cached: false,
      model: this.model,
      latencyMs,
    };
  }

  /**
   * Generate embeddings for multiple texts
   *
   * Processes texts in batches for efficiency.
   * Uses cache when available to skip already-embedded texts.
   *
   * @param texts - Array of input texts
   * @returns Array of embedding results
   */
  async embedBatch(texts: string[]): Promise<LocalEmbeddingResult[]> {
    const results: LocalEmbeddingResult[] = new Array(texts.length);
    const uncached: { index: number; text: string }[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      if (this.cacheEnabled) {
        // Use getFromCache for LRU refresh
        const cached = this.getFromCache(text);

        if (cached) {
          this.cacheHits++;
          this.totalEmbeddings++;
          results[i] = {
            embedding: cached,
            tokenCount: this.estimateTokens(text),
            cached: true,
            model: this.model,
            latencyMs: 0,
          };
          continue;
        }
      }

      uncached.push({ index: i, text });
    }

    // Process uncached texts in batches
    if (uncached.length > 0) {
      for (let i = 0; i < uncached.length; i += this.batchSize) {
        const batch = uncached.slice(i, i + this.batchSize);

        // Embed each text in the batch
        // Note: Transformers.js doesn't have native batch support,
        // so we process sequentially but could parallelize if needed
        const batchResults = await Promise.all(
          batch.map(({ text }) => this.embed(text))
        );

        // Store results
        for (let j = 0; j < batch.length; j++) {
          results[batch[j].index] = batchResults[j];
        }
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * @param a - First embedding vector
   * @param b - Second embedding vector
   * @returns Similarity score (-1 to 1, higher = more similar)
   * @throws Error if dimensions don't match
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(
        `Embedding dimensions must match: got ${a.length} and ${b.length}`
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Find most similar embeddings from a collection
   *
   * @param query - Query embedding vector
   * @param candidates - Array of candidate embedding vectors
   * @param topK - Number of results to return (default: 10)
   * @returns Sorted array of indices and similarity scores
   */
  findMostSimilar(
    query: number[],
    candidates: number[][],
    topK: number = 10
  ): Array<{ index: number; similarity: number }> {
    const similarities = candidates.map((candidate, index) => ({
      index,
      similarity: this.cosineSimilarity(query, candidate),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }

  /**
   * Get embedding dimension for current model
   */
  getDimension(): number {
    return this.dimensions;
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug?.('Cache cleared');
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get service statistics
   */
  getStats(): LocalEmbeddingsStats {
    return {
      initialized: this.initialized,
      model: this.model,
      dimensions: this.dimensions,
      cacheSize: this.cache.size,
      cacheHitRate:
        this.totalEmbeddings > 0 ? this.cacheHits / this.totalEmbeddings : 0,
      totalEmbeddings: this.totalEmbeddings,
      cacheHits: this.cacheHits,
      averageLatencyMs:
        this.totalEmbeddings > 0
          ? this.totalLatencyMs / this.totalEmbeddings
          : 0,
    };
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Generate a deterministic mock embedding for testing
   * Uses a hash-based approach to ensure same input = same output
   */
  private generateMockEmbedding(text: string): number[] {
    const embedding: number[] = new Array(this.dimensions);
    let hash = 0;

    // Simple hash function
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate deterministic embedding based on hash
    for (let i = 0; i < this.dimensions; i++) {
      // Use sin/cos for variety while maintaining determinism
      const seed = hash + i * 1234;
      embedding[i] = Math.sin(seed * 0.001) * 0.1;
    }

    // Normalize the embedding
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] = embedding[i] / norm;
      }
    }

    return embedding;
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${this.model}:${hash}`;
  }

  /**
   * Add embedding to cache with LRU eviction
   * FIX: Implement true LRU - delete and re-add on existing entry to maintain order
   */
  private addToCache(text: string, embedding: number[]): void {
    const cacheKey = this.getCacheKey(text);

    // FIX: Delete first if exists to update position (move to end = most recently used)
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    }

    // LRU eviction: remove oldest entry if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, embedding);
  }

  /**
   * Get embedding from cache with LRU refresh
   * FIX: Move to end (most recently used) on access
   */
  private getFromCache(text: string): number[] | undefined {
    const cacheKey = this.getCacheKey(text);
    const embedding = this.cache.get(cacheKey);

    if (embedding) {
      // FIX: Move to end (most recently used) - delete and re-add
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, embedding);
    }

    return embedding;
  }

  /**
   * Estimate token count for text
   * Rough approximation: ~4 characters per token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
