/**
 * LocalEmbeddingsService Types
 *
 * Type definitions for local embeddings service using Transformers.js.
 * Provides CLI-first, offline-capable vector embeddings without API keys.
 *
 * Key Features:
 * - Local model inference (no external API)
 * - Compatible interface with EmbeddingsService
 * - Support for multiple models (MiniLM, MPNet, etc.)
 * - Caching for performance
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/LocalEmbeddingsService.types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for LocalEmbeddingsService
 */
export interface LocalEmbeddingsConfig {
  /**
   * Model to use for embeddings
   * @default 'Xenova/all-MiniLM-L6-v2'
   */
  model?: string;

  /**
   * Path to locally cached model files (for air-gapped environments)
   * If not set, models are downloaded from Hugging Face Hub
   */
  modelPath?: string;

  /**
   * Override embedding dimensions (must match model output)
   * If not set, dimensions are inferred from MODEL_DIMENSIONS mapping
   */
  dimensions?: number;

  /**
   * Enable in-memory caching of embeddings
   * @default true
   */
  cacheEnabled?: boolean;

  /**
   * Maximum number of embeddings to cache
   * Uses LRU eviction when exceeded
   * @default 10000
   */
  maxCacheSize?: number;

  /**
   * Batch size for processing multiple texts
   * @default 32
   */
  batchSize?: number;

  /**
   * Enable mock mode for testing (deterministic embeddings)
   * @default false
   */
  mockMode?: boolean;

  /**
   * Callback for model loading progress
   * Called with progress percentage (0-100)
   */
  progressCallback?: (progress: number) => void;

  /**
   * Optional logger for debugging
   */
  logger?: LocalEmbeddingsLogger;
}

/**
 * Logger interface for LocalEmbeddingsService
 */
export interface LocalEmbeddingsLogger {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of an embedding operation
 * Compatible with EmbeddingsService.EmbeddingResult
 */
export interface LocalEmbeddingResult {
  /** The embedding vector */
  embedding: number[];

  /** Number of tokens in input (estimated) */
  tokenCount: number;

  /** Whether this result was served from cache */
  cached?: boolean;

  /** Model used to generate this embedding */
  model?: string;

  /** Time taken to generate embedding in milliseconds */
  latencyMs?: number;
}

/**
 * Statistics about the local embeddings service
 */
export interface LocalEmbeddingsStats {
  /** Whether the model is initialized */
  initialized: boolean;

  /** Model name */
  model: string;

  /** Embedding dimensions */
  dimensions: number;

  /** Number of cached embeddings */
  cacheSize: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Total embeddings generated */
  totalEmbeddings: number;

  /** Cache hits */
  cacheHits: number;

  /** Average embedding latency in milliseconds */
  averageLatencyMs: number;
}

// ============================================================================
// Model Metadata
// ============================================================================

/**
 * Metadata about a local embedding model
 */
export interface LocalModelInfo {
  /** Model identifier (e.g., 'Xenova/all-MiniLM-L6-v2') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Output embedding dimensions */
  dimensions: number;

  /** Maximum input tokens */
  maxTokens: number;

  /** Approximate model size in MB */
  sizeInMB: number;

  /** Brief description */
  description: string;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

/**
 * Supported local embedding models with their metadata
 */
export const LOCAL_EMBEDDING_MODELS: Record<string, LocalModelInfo> = {
  'Xenova/all-MiniLM-L6-v2': {
    id: 'Xenova/all-MiniLM-L6-v2',
    name: 'MiniLM-L6-v2',
    dimensions: 384,
    maxTokens: 256,
    sizeInMB: 25,
    description: 'Fast, lightweight model for general semantic search',
  },
  'Xenova/all-mpnet-base-v2': {
    id: 'Xenova/all-mpnet-base-v2',
    name: 'MPNet-Base-v2',
    dimensions: 768,
    maxTokens: 384,
    sizeInMB: 110,
    description: 'Higher quality embeddings, larger model',
  },
  'Xenova/bge-small-en-v1.5': {
    id: 'Xenova/bge-small-en-v1.5',
    name: 'BGE-Small-EN',
    dimensions: 384,
    maxTokens: 512,
    sizeInMB: 45,
    description: 'BAAI general embedding model, excellent quality',
  },
  'Xenova/gte-small': {
    id: 'Xenova/gte-small',
    name: 'GTE-Small',
    dimensions: 384,
    maxTokens: 512,
    sizeInMB: 40,
    description: 'Alibaba general text embedding, balanced quality/speed',
  },
};

/**
 * Dimension mapping for various models
 * Maps model ID -> embedding dimensions
 */
export const MODEL_DIMENSIONS: Record<string, number> = {
  // Transformers.js models
  'Xenova/all-MiniLM-L6-v2': 384,
  'Xenova/all-MiniLM-L12-v2': 384,
  'Xenova/all-mpnet-base-v2': 768,
  'Xenova/paraphrase-MiniLM-L6-v2': 384,
  'Xenova/bge-small-en-v1.5': 384,
  'Xenova/bge-base-en-v1.5': 768,
  'Xenova/gte-small': 384,
  'Xenova/gte-base': 768,
  'Xenova/e5-small-v2': 384,
  'Xenova/e5-base-v2': 768,

  // Short aliases (for convenience)
  'all-MiniLM-L6-v2': 384,
  'all-MiniLM-L12-v2': 384,
  'all-mpnet-base-v2': 768,
  'bge-small-en-v1.5': 384,
  'bge-base-en-v1.5': 768,
  'gte-small': 384,
  'gte-base': 768,

  // OpenAI (for reference in fallback scenarios)
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/**
 * Default model for local embeddings
 */
export const DEFAULT_LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Default configuration for LocalEmbeddingsService
 */
export const DEFAULT_LOCAL_EMBEDDINGS_CONFIG: Required<
  Omit<LocalEmbeddingsConfig, 'modelPath' | 'progressCallback' | 'logger'>
> = {
  model: DEFAULT_LOCAL_MODEL,
  dimensions: MODEL_DIMENSIONS[DEFAULT_LOCAL_MODEL] ?? 384,
  cacheEnabled: true,
  maxCacheSize: 10000,
  batchSize: 32,
  mockMode: false,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for LocalEmbeddingsService
 */
export enum LocalEmbeddingsErrorCode {
  /** Model failed to initialize */
  INIT_FAILED = 'INIT_FAILED',

  /** Model not found or unavailable */
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',

  /** Model download failed (network error) */
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

  /** Inference failed */
  INFERENCE_FAILED = 'INFERENCE_FAILED',

  /** Input text too long */
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',

  /** Service not initialized */
  NOT_INITIALIZED = 'NOT_INITIALIZED',

  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error information for LocalEmbeddingsService
 */
export interface LocalEmbeddingsErrorInfo {
  /** Error code for programmatic handling */
  code: LocalEmbeddingsErrorCode;

  /** Human-readable error message */
  message: string;

  /** Suggested fix or next action */
  suggestion?: string;

  /** Original error cause */
  cause?: Error;
}

// ============================================================================
// Interface Definition
// ============================================================================

/**
 * Interface that LocalEmbeddingsService must implement
 * Designed to be compatible with EmbeddingsService for drop-in replacement
 */
export interface ILocalEmbeddingsService {
  /**
   * Initialize the embeddings pipeline
   * Downloads model on first use if not cached locally
   */
  initialize(): Promise<void>;

  /**
   * Check if local embeddings are available
   * Returns true if model can be loaded, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate embedding for a single text
   * @param text - Input text to embed
   * @returns Embedding result with vector and metadata
   */
  embed(text: string): Promise<LocalEmbeddingResult>;

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of input texts
   * @returns Array of embedding results
   */
  embedBatch(texts: string[]): Promise<LocalEmbeddingResult[]>;

  /**
   * Calculate cosine similarity between two embeddings
   * @param a - First embedding vector
   * @param b - Second embedding vector
   * @returns Similarity score (-1 to 1, higher = more similar)
   */
  cosineSimilarity(a: number[], b: number[]): number;

  /**
   * Find most similar embeddings from a collection
   * @param query - Query embedding vector
   * @param candidates - Array of candidate embedding vectors
   * @param topK - Number of results to return
   * @returns Sorted array of indices and similarity scores
   */
  findMostSimilar(
    query: number[],
    candidates: number[][],
    topK?: number
  ): Array<{ index: number; similarity: number }>;

  /**
   * Get embedding dimension for current model
   * @returns Number of dimensions in output embeddings
   */
  getDimension(): number;

  /**
   * Clear the embedding cache
   */
  clearCache(): void;

  /**
   * Get current cache size
   * @returns Number of cached embeddings
   */
  getCacheSize(): number;

  /**
   * Get service statistics
   * @returns Statistics about the service
   */
  getStats(): LocalEmbeddingsStats;
}
