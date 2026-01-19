/**
 * Memory System Exports
 *
 * This module re-exports all memory-related functionality:
 * - MemorySystem: Episodic memory storage and retrieval
 * - EmbeddingsService: Vector embedding generation
 * - Code Memory: Semantic code search and chunking (Plan 13-03)
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory
 */

// ============================================================================
// Episodic Memory (MemorySystem)
// ============================================================================

export {
  MemorySystem,
  MemoryError,
  EpisodeNotFoundError,
  QueryError,
  type MemorySystemOptions,
  type Episode,
  type SimilarityResult,
  type MemoryQuery,
  type ContextResult,
} from './MemorySystem';

// ============================================================================
// Embeddings Service
// ============================================================================

export {
  EmbeddingsService,
  type EmbeddingsServiceOptions,
  type EmbeddingResult,
  type EmbeddingError,
} from './EmbeddingsService';

// ============================================================================
// Local Embeddings Service (Phase 16 - CLI Support)
// ============================================================================

export {
  type LocalEmbeddingsConfig,
  type LocalEmbeddingsLogger,
  type LocalEmbeddingResult,
  type LocalEmbeddingsStats,
  type LocalModelInfo,
  type LocalEmbeddingsErrorInfo,
  type ILocalEmbeddingsService,
  LocalEmbeddingsErrorCode,
  LOCAL_EMBEDDING_MODELS,
  MODEL_DIMENSIONS,
  DEFAULT_LOCAL_MODEL,
  DEFAULT_LOCAL_EMBEDDINGS_CONFIG,
} from './LocalEmbeddingsService.types';

// ============================================================================
// Code Memory (Plan 13-03)
// ============================================================================

export * from './code';
