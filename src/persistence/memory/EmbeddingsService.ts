/**
 * EmbeddingsService - Vector embedding generation
 *
 * Provides embedding generation for semantic search and similarity matching.
 * Uses OpenAI's text-embedding-ada-002 or similar models.
 *
 * Features:
 * - Batch embedding generation
 * - Caching for repeated embeddings
 * - Mock mode for testing
 * - Rate limiting and retry logic
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * Note: The openai package has limited TypeScript support in some configurations,
 * so we use eslint-disable comments for necessary type assertions.
 *
 * @module persistence/memory/EmbeddingsService
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import OpenAI from 'openai';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for EmbeddingsService
 */
export interface EmbeddingsServiceOptions {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for embeddings */
  model?: string;
  /** Enable mock mode for testing (deterministic embeddings) */
  mockMode?: boolean;
  /** Maximum retries for API calls */
  maxRetries?: number;
  /** Batch size for bulk embedding requests */
  batchSize?: number;
}

/**
 * Result of an embedding operation
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Number of tokens in input */
  tokenCount: number;
}

/**
 * Error during embedding generation
 */
export interface EmbeddingError {
  message: string;
  code?: string;
  retryable: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;
const EMBEDDING_DIMENSION = 1536;

// ============================================================================
// EmbeddingsService Implementation
// ============================================================================

/**
 * Service for generating vector embeddings from text
 */
export class EmbeddingsService {
  private client: OpenAI | null = null;
  private readonly model: string;
  private readonly mockMode: boolean;
  private readonly maxRetries: number;
  private readonly batchSize: number;
  private cache: Map<string, number[]>;

  constructor(options: EmbeddingsServiceOptions) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.mockMode = options.mockMode ?? false;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.cache = new Map();

    // Only initialize OpenAI client if not in mock mode
    if (!this.mockMode) {
      this.client = new OpenAI({
        apiKey: options.apiKey,
        maxRetries: this.maxRetries,
      });
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        embedding: cached,
        tokenCount: this.estimateTokens(text),
      };
    }

    let embedding: number[];

    if (this.mockMode) {
      embedding = this.generateMockEmbedding(text);
    } else {
      embedding = await this.callAPI(text);
    }

    // Cache the result
    this.cache.set(cacheKey, embedding);

    return {
      embedding,
      tokenCount: this.estimateTokens(text),
    };
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const uncached: { index: number; text: string }[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cacheKey = this.getCacheKey(text);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        results[i] = {
          embedding: cached,
          tokenCount: this.estimateTokens(text),
        };
      } else {
        uncached.push({ index: i, text });
      }
    }

    // Process uncached texts in batches
    if (uncached.length > 0) {
      for (let i = 0; i < uncached.length; i += this.batchSize) {
        const batch = uncached.slice(i, i + this.batchSize);
        const batchTexts = batch.map((b) => b.text);

        let embeddings: number[][];

        if (this.mockMode) {
          embeddings = batchTexts.map((t) => this.generateMockEmbedding(t));
        } else {
          embeddings = await this.callBatchAPI(batchTexts);
        }

        // Store results and cache
        for (let j = 0; j < batch.length; j++) {
          const { index, text } = batch[j];
          const embedding = embeddings[j];

          this.cache.set(this.getCacheKey(text), embedding);
          results[index] = {
            embedding,
            tokenCount: this.estimateTokens(text),
          };
        }
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
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
   * Get embedding dimension
   */
  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Call OpenAI API for single embedding
   */
  private async callAPI(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Call OpenAI API for batch embeddings
   */
  private async callBatchAPI(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  }

  /**
   * Generate a deterministic mock embedding for testing
   * Uses a hash-based approach to ensure same input = same output
   */
  private generateMockEmbedding(text: string): number[] {
    const embedding: number[] = new Array(EMBEDDING_DIMENSION);
    let hash = 0;

    // Simple hash function
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate deterministic embedding based on hash
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      // Use sin/cos for variety while maintaining determinism
      const seed = hash + i * 1234;
      embedding[i] = Math.sin(seed * 0.001) * 0.1;
    }

    // Normalize the embedding
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
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
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${this.model}:${hash}`;
  }

  /**
   * Estimate token count for text
   * Rough approximation: ~4 characters per token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
