/**
 * Code Memory Module - Semantic code search and intelligent chunking
 *
 * This module provides semantic code search capabilities by:
 * - Chunking code into semantic units (functions, classes, etc.)
 * - Generating embeddings for each chunk
 * - Enabling similarity search across code
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/code
 */

// ============================================================================
// Types Export
// ============================================================================

export type {
  // Core types
  CodeChunk,
  CodeChunkType,
  CodeChunkMetadata,
  SymbolEntry,

  // Search types
  CodeSearchResult,
  CodeSearchOptions,
  UsageType,
  CodeUsage,
  CodeDefinition,

  // Indexing types
  IndexStats,
  ChunkingOptions,

  // Database types
  CodeChunkRow,
  NewCodeChunkRow,

  // Interfaces
  ICodeMemory,
  ICodeChunker,
  ICodeSearchEngine,
} from './types';

export { DEFAULT_SEARCH_OPTIONS, DEFAULT_CHUNKING_OPTIONS } from './types';

// ============================================================================
// Classes Export
// ============================================================================

export {
  CodeChunkRepository,
  type CodeChunkRepositoryOptions,
  type PaginationOptions,
} from './CodeChunkRepository';

export {
  CodeChunker,
  getCodeChunker,
  createCodeChunker,
  resetCodeChunker,
} from './CodeChunker';

export {
  CodeMemory,
  createCodeMemory,
  type CodeMemoryConfig,
  DEFAULT_CODE_MEMORY_CONFIG,
} from './CodeMemory';

export {
  CodeSearchEngine,
  createCodeSearchEngine,
  type CodeSearchEngineConfig,
  type IEmbeddingGenerator,
  DEFAULT_CODE_SEARCH_ENGINE_CONFIG,
} from './CodeSearchEngine';

export {
  CodeMemoryFacade,
  type CodeMemoryFacadeOptions,
} from './CodeMemoryFacade';

// ============================================================================
// Factory Function
// ============================================================================

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../database/schema';
import { CodeChunkRepository } from './CodeChunkRepository';
import { CodeChunker } from './CodeChunker';
import { CodeMemory, type CodeMemoryConfig } from './CodeMemory';
import { EmbeddingsService, type EmbeddingsServiceOptions } from '../EmbeddingsService';

/**
 * Options for creating a complete CodeMemory system
 */
export interface CreateCodeMemorySystemOptions {
  /** Database connection */
  db: BetterSQLite3Database<typeof schema>;
  /** Embeddings service options */
  embeddings: EmbeddingsServiceOptions;
  /** CodeMemory configuration */
  codeMemory?: CodeMemoryConfig;
  /** Default project ID */
  projectId?: string;
}

/**
 * Result from creating a CodeMemory system
 */
export interface CodeMemorySystem {
  codeMemory: CodeMemory;
  repository: CodeChunkRepository;
  chunker: CodeChunker;
  embeddings: EmbeddingsService;
}

/**
 * Create a complete CodeMemory system with all dependencies
 *
 * This is the primary factory function for using the Code Memory module.
 * It creates and wires together all necessary components.
 *
 * @example
 * ```typescript
 * const system = createCodeMemorySystem({
 *   db: drizzleDb,
 *   embeddings: { apiKey: process.env.OPENAI_API_KEY! },
 *   codeMemory: { skipEmbeddings: false },
 *   projectId: 'my-project',
 * });
 *
 * // Index a project
 * const stats = await system.codeMemory.indexProject('./src');
 *
 * // Search for code
 * const results = await system.codeMemory.searchCode('authentication logic');
 * ```
 *
 * @param options - Configuration options
 * @returns CodeMemory system with all dependencies
 */
export function createCodeMemorySystem(
  options: CreateCodeMemorySystemOptions
): CodeMemorySystem {
  // Create repository
  const repository = new CodeChunkRepository(options.db);

  // Create chunker with optional project ID
  const chunker = new CodeChunker(undefined, undefined, options.projectId);

  // Create embeddings service
  const embeddings = new EmbeddingsService(options.embeddings);

  // Create CodeMemory
  const codeMemory = new CodeMemory(
    repository,
    chunker,
    embeddings,
    options.codeMemory
  );

  return {
    codeMemory,
    repository,
    chunker,
    embeddings,
  };
}

/**
 * Create a CodeMemory system configured for testing (mock embeddings)
 *
 * @example
 * ```typescript
 * const system = createTestCodeMemorySystem(testDb);
 * await system.codeMemory.indexFile('test.ts', 'function foo() {}');
 * ```
 *
 * @param db - Database connection
 * @param projectId - Optional project ID
 * @returns CodeMemory system with mock embeddings
 */
export function createTestCodeMemorySystem(
  db: BetterSQLite3Database<typeof schema>,
  projectId?: string
): CodeMemorySystem {
  return createCodeMemorySystem({
    db,
    embeddings: {
      apiKey: 'test-key',
      mockMode: true,
    },
    codeMemory: {
      skipEmbeddings: false, // Use mock embeddings
    },
    projectId,
  });
}
