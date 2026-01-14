/**
 * EmbeddingsService - Generate embeddings using OpenAI API with local caching
 *
 * Features:
 * - OpenAI text-embedding-3-small model (1536 dimensions)
 * - Content-hash based caching for deduplication
 * - Mock mode for deterministic testing
 * - Exponential backoff retry for rate limits
 */

import { createHash } from 'crypto';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for embeddings operations
 */
export class EmbeddingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when API call fails
 */
export class EmbeddingAPIError extends EmbeddingsError {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'EmbeddingAPIError';
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown for cache-related issues
 */
export class CacheError extends EmbeddingsError {
  public readonly reason: string;

  constructor(reason: string) {
    super(`Cache error: ${reason}`);
    this.name = 'CacheError';
    this.reason = reason;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * EmbeddingsService constructor options
 */
export interface EmbeddingsServiceOptions {
  /** OpenAI API key */
  apiKey: string;
  /** Enable mock mode for testing (returns deterministic fake embeddings) */
  mockMode?: boolean;
  /** Optional logger */
  logger?: Logger;
  /** Max retries for rate limiting (default: 3) */
  maxRetries?: number;
}

/**
 * OpenAI API response structure
 */
interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// ============================================================================
// EmbeddingsService Implementation
// ============================================================================

/**
 * EmbeddingsService generates embeddings using OpenAI API with local caching.
 *
 * Features:
 * - Uses text-embedding-3-small model (1536 dimensions)
 * - Content-hash based cache for deduplication
 * - Mock mode for deterministic testing
 * - Exponential backoff for rate limit handling
 */
export class EmbeddingsService {
  private readonly apiKey: string;
  private readonly mockMode: boolean;
  private readonly logger?: Logger;
  private readonly maxRetries: number;

  // Cache: hash -> embedding
  private readonly cache: Map<string, number[]> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: EmbeddingsServiceOptions) {
    this.apiKey = options.apiKey;
    this.mockMode = options.mockMode ?? false;
    this.logger = options.logger;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Log a message if logger is available
   */
  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Generate SHA-256 hash of text for cache key
   */
  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate deterministic mock embedding based on content hash
   */
  private generateMockEmbedding(text: string): number[] {
    const hash = this.hashText(text);
    const embedding: number[] = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);

    // Use hash bytes to seed embedding values deterministically
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      // Use different portions of hash to generate values
      const hashIndex = i % 32; // SHA-256 has 32 bytes
      const hashByte = parseInt(hash.substring(hashIndex * 2, hashIndex * 2 + 2), 16);
      // Normalize to [-1, 1] range with some variation
      embedding[i] = (hashByte / 255) * 2 - 1 + (i / EMBEDDING_DIMENSIONS) * 0.001;
    }

    // Normalize the vector to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = (embedding[i] ?? 0) / magnitude;
    }

    return embedding;
  }

  /**
   * Call OpenAI API to generate embeddings
   */
  private async callOpenAI(texts: string[]): Promise<number[][]> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new EmbeddingAPIError(response.status, response.statusText);
    }

    const data = (await response.json()) as OpenAIEmbeddingResponse;

    // Sort by index to ensure correct order
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  /**
   * Call OpenAI API with exponential backoff retry
   */
  private async callOpenAIWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.callOpenAI(texts);
      } catch (error) {
        lastError = error as Error;

        // Only retry on rate limit (429)
        if (error instanceof EmbeddingAPIError && error.statusCode === 429) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          this.log('warn', `Rate limited, retrying in ${String(delay)}ms (attempt ${String(attempt + 1)}/${String(this.maxRetries)})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error
        throw error;
      }
    }

    // All retries exhausted - lastError is guaranteed to be set since maxRetries > 0
    if (lastError) {
      throw lastError;
    }
    throw new EmbeddingsError('All retries exhausted');
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const hash = this.hashText(text);

    // Check cache first
    const cached = this.cache.get(hash);
    if (cached) {
      this.cacheHits++;
      this.log('debug', 'Cache hit for embedding');
      return cached;
    }

    this.cacheMisses++;

    let embedding: number[];

    if (this.mockMode) {
      embedding = this.generateMockEmbedding(text);
    } else {
      const embeddings = await this.callOpenAIWithRetry([text]);
      const first = embeddings[0];
      if (!first) {
        throw new EmbeddingsError('No embedding returned from API');
      }
      embedding = first;
    }

    // Store in cache
    this.cache.set(hash, embedding);

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in a single API call
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Check which texts need embedding (not in cache)
    const results: (number[] | null)[] = Array.from({ length: texts.length }, () => null);
    const uncachedTexts: { text: string; originalIndex: number }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (text === undefined) continue;
      const hash = this.hashText(text);
      const cached = this.cache.get(hash);
      if (cached) {
        this.cacheHits++;
        results[i] = cached;
      } else {
        this.cacheMisses++;
        uncachedTexts.push({ text, originalIndex: i });
      }
    }

    // If all cached, return early
    if (uncachedTexts.length === 0) {
      return results as number[][];
    }

    // Generate embeddings for uncached texts
    let newEmbeddings: number[][];

    if (this.mockMode) {
      newEmbeddings = uncachedTexts.map((item) => this.generateMockEmbedding(item.text));
    } else {
      newEmbeddings = await this.callOpenAIWithRetry(uncachedTexts.map((item) => item.text));
    }

    // Store in cache and fill results
    for (let i = 0; i < uncachedTexts.length; i++) {
      const item = uncachedTexts[i];
      const embedding = newEmbeddings[i];
      if (!item || !embedding) continue;
      const hash = this.hashText(item.text);
      this.cache.set(hash, embedding);
      results[item.originalIndex] = embedding;
    }

    return results as number[][];
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.log('debug', 'Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
    };
  }
}
