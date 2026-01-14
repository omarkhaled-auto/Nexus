/**
 * EmbeddingsService - Stub implementation for TDD RED phase
 *
 * This file contains type definitions and stub implementations that will
 * allow tests to compile but fail.
 */

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
}

// ============================================================================
// EmbeddingsService Implementation (Stub)
// ============================================================================

/**
 * EmbeddingsService generates embeddings using OpenAI API with local caching.
 *
 * Stub implementation - all methods throw NotImplementedError.
 */
export class EmbeddingsService {
  constructor(_options: EmbeddingsServiceOptions) {
    // Stub - not implemented
  }

  /**
   * Generate embedding for a single text
   */
  async embed(_text: string): Promise<number[]> {
    throw new Error('Not implemented');
  }

  /**
   * Generate embeddings for multiple texts in a single API call
   */
  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new Error('Not implemented');
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    throw new Error('Not implemented');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    throw new Error('Not implemented');
  }
}
