/**
 * CodeSearchEngine - Semantic search engine for code chunks
 *
 * Implements vector similarity search using cosine similarity
 * to find semantically related code chunks.
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/code/CodeSearchEngine
 */

import { minimatch } from 'minimatch';
import type {
  ICodeSearchEngine,
  CodeChunk,
  CodeSearchResult,
  CodeSearchOptions,
} from './types';
import { DEFAULT_SEARCH_OPTIONS } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the search engine
 */
export interface CodeSearchEngineConfig {
  /** Enable batch processing for large searches */
  enableBatching?: boolean;
  /** Batch size for similarity calculations */
  batchSize?: number;
  /** Cache embeddings for repeated queries */
  cacheEmbeddings?: boolean;
  /** Maximum cache size */
  maxCacheSize?: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CODE_SEARCH_ENGINE_CONFIG: Required<CodeSearchEngineConfig> = {
  enableBatching: true,
  batchSize: 100,
  cacheEmbeddings: true,
  maxCacheSize: 1000,
};

// ============================================================================
// Embedding Generation Interface
// ============================================================================

/**
 * Interface for embedding generation (dependency injection)
 */
export interface IEmbeddingGenerator {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ============================================================================
// CodeSearchEngine Implementation
// ============================================================================

/**
 * CodeSearchEngine - Semantic search for code chunks
 *
 * Features:
 * - Cosine similarity-based search
 * - Configurable thresholds and limits
 * - Filtering by project, file pattern, language, chunk types
 * - Highlight generation for search results
 * - Batch similarity calculation for performance
 * - Typed array optimizations
 */
export class CodeSearchEngine implements ICodeSearchEngine {
  private readonly config: Required<CodeSearchEngineConfig>;
  private readonly embeddingGenerator?: IEmbeddingGenerator;
  private readonly embeddingCache: Map<string, number[]> = new Map();

  constructor(
    embeddingGenerator?: IEmbeddingGenerator,
    config?: CodeSearchEngineConfig
  ) {
    this.embeddingGenerator = embeddingGenerator;
    this.config = { ...DEFAULT_CODE_SEARCH_ENGINE_CONFIG, ...config };
  }

  // ============================================================================
  // ICodeSearchEngine Implementation
  // ============================================================================

  /**
   * Search chunks using a query (string or embedding)
   * @param query Search query string or pre-computed embedding
   * @param chunks Chunks to search through
   * @param options Search options
   * @returns Ranked search results
   */
  async search(
    query: string | number[],
    chunks: CodeChunk[],
    options?: CodeSearchOptions
  ): Promise<CodeSearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    // Handle empty chunks
    if (chunks.length === 0) {
      return [];
    }

    // Get query embedding
    let queryEmbedding: number[];
    if (typeof query === 'string') {
      if (!this.embeddingGenerator) {
        throw new Error('Embedding generator required for string queries');
      }
      queryEmbedding = await this.getOrComputeEmbedding(query);
    } else {
      queryEmbedding = query;
    }

    // Filter chunks based on options
    const filteredChunks = this.filterChunks(chunks, opts);

    // Handle empty after filtering
    if (filteredChunks.length === 0) {
      return [];
    }

    // Calculate similarity scores
    let results: CodeSearchResult[];
    if (this.config.enableBatching && filteredChunks.length > this.config.batchSize) {
      results = this.batchCalculateSimilarity(queryEmbedding, filteredChunks);
    } else {
      results = filteredChunks.map((chunk) => ({
        chunk,
        score: this.calculateSimilarity(queryEmbedding, chunk.embedding),
        highlights: undefined,
      }));
    }

    // Filter by threshold
    results = results.filter((result) => result.score >= opts.threshold);

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    results = results.slice(0, opts.limit);

    // Generate highlights if requested and query is a string
    if (opts.includeContext && typeof query === 'string') {
      results = results.map((result) => ({
        ...result,
        highlights: this.generateHighlights(query, result.chunk.content),
      }));
    }

    return results;
  }

  /**
   * Find chunks similar to a given embedding
   * @param embedding Query embedding vector
   * @param chunks Chunks to search through
   * @param limit Maximum results
   * @returns Ranked results by similarity
   */
  findSimilar(
    embedding: number[],
    chunks: CodeChunk[],
    limit: number
  ): CodeSearchResult[] {
    // Handle empty chunks
    if (chunks.length === 0) {
      return [];
    }

    // Handle empty embedding
    if (embedding.length === 0) {
      return [];
    }

    // Filter to only chunks with embeddings
    const chunksWithEmbeddings = chunks.filter(
      (c) => c.embedding && c.embedding.length > 0
    );

    // Calculate similarities
    let results: CodeSearchResult[];
    if (this.config.enableBatching && chunksWithEmbeddings.length > this.config.batchSize) {
      results = this.batchCalculateSimilarity(embedding, chunksWithEmbeddings);
    } else {
      results = chunksWithEmbeddings.map((chunk) => ({
        chunk,
        score: this.calculateSimilarity(embedding, chunk.embedding),
      }));
    }

    // Filter out zero scores
    results = results.filter((r) => r.score > 0);

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    return results.slice(0, limit);
  }

  /**
   * Calculate similarity between two embeddings
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Similarity score (0.0 to 1.0)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilarity(embedding1, embedding2);
  }

  // ============================================================================
  // Private Methods - Core Similarity
  // ============================================================================

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity (0.0 to 1.0)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    // Handle edge cases
    if (a.length === 0 || b.length === 0) {
      return 0;
    }

    if (a.length !== b.length) {
      // Vectors must be same length for cosine similarity
      return 0;
    }

    // Use typed arrays for performance with large vectors
    const aTyped = a instanceof Float64Array ? a : new Float64Array(a);
    const bTyped = b instanceof Float64Array ? b : new Float64Array(b);

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < aTyped.length; i++) {
      const aVal = aTyped[i] ?? 0;
      const bVal = bTyped[i] ?? 0;
      dotProduct += aVal * bVal;
      magnitudeA += aVal * aVal;
      magnitudeB += bVal * bVal;
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

    // Handle zero magnitude (zero vectors)
    if (magnitude === 0) {
      return 0;
    }

    // Normalize to 0-1 range (cosine similarity is already -1 to 1, but embeddings are typically positive)
    const similarity = dotProduct / magnitude;

    // Clamp to 0-1 range
    return this.normalizeScore(similarity);
  }

  /**
   * Batch calculate similarity for performance
   * @param queryEmbedding Query embedding
   * @param chunks Chunks to compare
   * @returns Search results with scores
   */
  private batchCalculateSimilarity(
    queryEmbedding: number[],
    chunks: CodeChunk[]
  ): CodeSearchResult[] {
    const results: CodeSearchResult[] = [];

    // Convert query to typed array once
    const queryTyped = new Float64Array(queryEmbedding);

    // Pre-compute query magnitude
    let queryMagnitude = 0;
    for (let i = 0; i < queryTyped.length; i++) {
      const val = queryTyped[i] ?? 0;
      queryMagnitude += val * val;
    }
    queryMagnitude = Math.sqrt(queryMagnitude);

    // Handle zero query magnitude
    if (queryMagnitude === 0) {
      return chunks.map((chunk) => ({ chunk, score: 0 }));
    }

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);

      for (const chunk of batch) {
        if (!chunk.embedding || chunk.embedding.length === 0) {
          results.push({ chunk, score: 0 });
          continue;
        }

        if (chunk.embedding.length !== queryTyped.length) {
          results.push({ chunk, score: 0 });
          continue;
        }

        // Calculate dot product and chunk magnitude
        let dotProduct = 0;
        let chunkMagnitude = 0;

        for (let j = 0; j < queryTyped.length; j++) {
          const qVal = queryTyped[j] ?? 0;
          const cVal = chunk.embedding[j] ?? 0;
          dotProduct += qVal * cVal;
          chunkMagnitude += cVal * cVal;
        }

        chunkMagnitude = Math.sqrt(chunkMagnitude);

        const magnitude = queryMagnitude * chunkMagnitude;
        const score = magnitude === 0 ? 0 : this.normalizeScore(dotProduct / magnitude);

        results.push({ chunk, score });
      }
    }

    return results;
  }

  // ============================================================================
  // Private Methods - Filtering
  // ============================================================================

  /**
   * Filter chunks based on search options
   * @param chunks Chunks to filter
   * @param options Search options
   * @returns Filtered chunks
   */
  private filterChunks(
    chunks: CodeChunk[],
    options: Required<CodeSearchOptions>
  ): CodeChunk[] {
    return chunks.filter((chunk) => {
      // Filter by projectId
      if (options.projectId && chunk.projectId !== options.projectId) {
        return false;
      }

      // Filter by language
      if (options.language && chunk.metadata.language !== options.language) {
        return false;
      }

      // Filter by chunk types
      if (!options.chunkTypes.includes(chunk.chunkType)) {
        return false;
      }

      // Filter by file pattern (glob matching)
      if (options.filePattern && options.filePattern !== '**/*') {
        if (!minimatch(chunk.file, options.filePattern)) {
          return false;
        }
      }

      // Must have embedding for similarity search
      if (!chunk.embedding || chunk.embedding.length === 0) {
        return false;
      }

      return true;
    });
  }

  // ============================================================================
  // Private Methods - Highlights
  // ============================================================================

  /**
   * Generate highlighted snippets showing query matches
   * @param query Search query
   * @param content Chunk content
   * @returns Array of highlighted lines
   */
  private generateHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];

    // Extract query terms (words longer than 2 chars)
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2);

    if (queryTerms.length === 0) {
      return [];
    }

    const lines = content.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if any query term appears in this line
      if (queryTerms.some((term) => lowerLine.includes(term))) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          highlights.push(trimmedLine);

          // Limit to 3 highlights
          if (highlights.length >= 3) {
            break;
          }
        }
      }
    }

    return highlights;
  }

  // ============================================================================
  // Private Methods - Normalization and Caching
  // ============================================================================

  /**
   * Normalize raw similarity score to 0-1 range
   * @param rawScore Raw cosine similarity (-1 to 1)
   * @returns Normalized score (0 to 1)
   */
  private normalizeScore(rawScore: number): number {
    // Cosine similarity can be -1 to 1
    // For text embeddings, typically positive, but clamp to be safe
    const clamped = Math.max(-1, Math.min(1, rawScore));

    // Map -1..1 to 0..1 for consistency
    // For typical positive embeddings, this has no effect
    return (clamped + 1) / 2;
  }

  /**
   * Get embedding from cache or compute it
   * @param text Text to embed
   * @returns Embedding vector
   */
  private async getOrComputeEmbedding(text: string): Promise<number[]> {
    if (!this.config.cacheEmbeddings || !this.embeddingGenerator) {
      if (!this.embeddingGenerator) {
        throw new Error('Embedding generator required');
      }
      return this.embeddingGenerator.embed(text);
    }

    // Check cache
    const cacheKey = this.getCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute embedding
    const embedding = await this.embeddingGenerator.embed(text);

    // Store in cache (with size limit)
    if (this.embeddingCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey !== undefined) {
        this.embeddingCache.delete(firstKey);
      }
    }
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate cache key for text
   * @param text Text to hash
   * @returns Cache key
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key - use first 100 chars + length
    const prefix = text.substring(0, 100);
    return `${prefix.length}:${text.length}:${prefix}`;
  }

  // ============================================================================
  // Public Utility Methods
  // ============================================================================

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get current cache size
   * @returns Number of cached embeddings
   */
  getCacheSize(): number {
    return this.embeddingCache.size;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a CodeSearchEngine instance
 * @param embeddingGenerator Optional embedding generator
 * @param config Optional configuration
 * @returns Configured CodeSearchEngine
 */
export function createCodeSearchEngine(
  embeddingGenerator?: IEmbeddingGenerator,
  config?: CodeSearchEngineConfig
): CodeSearchEngine {
  return new CodeSearchEngine(embeddingGenerator, config);
}
