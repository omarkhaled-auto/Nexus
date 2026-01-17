/**
 * CodeMemoryFacade - Simplified facade for CodeMemory access
 *
 * Provides a simple interface for common CodeMemory operations,
 * handling dependency injection and optional singleton access.
 *
 * Use this when you need:
 * - Simple API without managing dependencies
 * - Singleton access across your application
 * - Automatic configuration from environment variables
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/code/CodeMemoryFacade
 */

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../database/schema';
import type {
  CodeChunk,
  CodeSearchResult,
  CodeSearchOptions,
  IndexStats,
  ChunkingOptions,
  CodeUsage,
  CodeDefinition,
} from './types';
import { CodeMemory, type CodeMemoryConfig } from './CodeMemory';
import { CodeChunkRepository } from './CodeChunkRepository';
import { CodeChunker } from './CodeChunker';
import { EmbeddingsService } from '../EmbeddingsService';

// ============================================================================
// Types
// ============================================================================

/**
 * Facade configuration options
 */
export interface CodeMemoryFacadeOptions {
  /** Database connection */
  db: BetterSQLite3Database<typeof schema>;
  /** OpenAI API key (defaults to OPENAI_API_KEY env var) */
  apiKey?: string;
  /** Enable mock mode for testing */
  mockMode?: boolean;
  /** CodeMemory configuration */
  config?: CodeMemoryConfig;
  /** Default project ID */
  projectId?: string;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: CodeMemoryFacade | null = null;

// ============================================================================
// CodeMemoryFacade Implementation
// ============================================================================

/**
 * CodeMemoryFacade - Simplified interface for CodeMemory operations
 *
 * This facade provides:
 * - Easy initialization with sensible defaults
 * - Singleton access pattern
 * - Simplified method signatures
 * - Automatic environment-based configuration
 *
 * @example
 * ```typescript
 * // Initialize once at app startup
 * CodeMemoryFacade.initialize({ db: myDatabase });
 *
 * // Use anywhere in your app
 * const facade = CodeMemoryFacade.getInstance();
 * await facade.indexProject('./src');
 * const results = await facade.search('authentication');
 * ```
 */
export class CodeMemoryFacade {
  private readonly codeMemory: CodeMemory;
  private readonly repository: CodeChunkRepository;
  private readonly projectId: string;

  /**
   * Create a new CodeMemoryFacade
   * @private Use CodeMemoryFacade.create() or CodeMemoryFacade.initialize() instead
   */
  private constructor(
    codeMemory: CodeMemory,
    repository: CodeChunkRepository,
    projectId: string
  ) {
    this.codeMemory = codeMemory;
    this.repository = repository;
    this.projectId = projectId;
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create a new CodeMemoryFacade instance
   *
   * @param options - Configuration options
   * @returns New CodeMemoryFacade instance
   * @throws Error if API key is not provided and OPENAI_API_KEY env var is not set
   */
  static create(options: CodeMemoryFacadeOptions): CodeMemoryFacade {
    // Get API key from options or environment
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    const mockMode = options.mockMode ?? false;

    if (!apiKey && !mockMode) {
      throw new Error(
        'OpenAI API key required. Set OPENAI_API_KEY env var or pass apiKey option.'
      );
    }

    // Create dependencies
    const repository = new CodeChunkRepository(options.db);
    const chunker = new CodeChunker(undefined, undefined, options.projectId);
    const embeddings = new EmbeddingsService({
      apiKey: apiKey ?? 'mock-key',
      mockMode,
    });

    // Create CodeMemory
    const codeMemory = new CodeMemory(
      repository,
      chunker,
      embeddings,
      options.config
    );

    return new CodeMemoryFacade(
      codeMemory,
      repository,
      options.projectId ?? 'default'
    );
  }

  /**
   * Initialize the singleton instance
   *
   * @param options - Configuration options
   * @throws Error if already initialized
   */
  static initialize(options: CodeMemoryFacadeOptions): void {
    if (instance !== null) {
      throw new Error('CodeMemoryFacade already initialized. Use reset() first.');
    }
    instance = CodeMemoryFacade.create(options);
  }

  /**
   * Get the singleton instance
   *
   * @returns The singleton CodeMemoryFacade instance
   * @throws Error if not initialized
   */
  static getInstance(): CodeMemoryFacade {
    if (instance === null) {
      throw new Error('CodeMemoryFacade not initialized. Call initialize() first.');
    }
    return instance;
  }

  /**
   * Check if singleton is initialized
   */
  static isInitialized(): boolean {
    return instance !== null;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static reset(): void {
    instance = null;
  }

  // ============================================================================
  // Indexing Methods
  // ============================================================================

  /**
   * Index a single file
   *
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Created chunks
   */
  async indexFile(filePath: string, content: string): Promise<CodeChunk[]> {
    return this.codeMemory.indexFile(filePath, content);
  }

  /**
   * Index an entire project
   *
   * @param projectPath - Root path of the project
   * @param options - Chunking options
   * @returns Indexing statistics
   */
  async indexProject(
    projectPath: string,
    options?: ChunkingOptions
  ): Promise<IndexStats> {
    return this.codeMemory.indexProject(projectPath, options);
  }

  /**
   * Update a file that has changed
   *
   * @param filePath - Path to the file
   * @param content - New file content
   * @returns Updated chunks
   */
  async updateFile(filePath: string, content: string): Promise<CodeChunk[]> {
    return this.codeMemory.updateFile(filePath, content);
  }

  /**
   * Remove a file from the index
   *
   * @param filePath - Path to the file
   * @returns Number of chunks removed
   */
  async removeFile(filePath: string): Promise<number> {
    return this.codeMemory.removeFile(filePath);
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  /**
   * Search for code using natural language
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Ranked search results
   */
  async search(
    query: string,
    options?: CodeSearchOptions
  ): Promise<CodeSearchResult[]> {
    return this.codeMemory.searchCode(query, {
      ...options,
      projectId: options?.projectId ?? this.projectId,
    });
  }

  /**
   * Find code similar to a snippet
   *
   * @param codeSnippet - Code to find similar matches for
   * @param limit - Maximum results
   * @returns Ranked results
   */
  async findSimilar(
    codeSnippet: string,
    limit?: number
  ): Promise<CodeSearchResult[]> {
    return this.codeMemory.findSimilarCode(codeSnippet, limit);
  }

  /**
   * Find all usages of a symbol
   *
   * @param symbolName - Name of the symbol
   * @returns All usages found
   */
  async findUsages(symbolName: string): Promise<CodeUsage[]> {
    return this.codeMemory.findUsages(symbolName, this.projectId);
  }

  /**
   * Find the definition of a symbol
   *
   * @param symbolName - Name of the symbol
   * @returns Definition location or null
   */
  async findDefinition(symbolName: string): Promise<CodeDefinition | null> {
    return this.codeMemory.findDefinition(symbolName, this.projectId);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get all chunks for a file
   *
   * @param filePath - Path to the file
   * @returns Chunks ordered by line number
   */
  async getFileChunks(filePath: string): Promise<CodeChunk[]> {
    return this.codeMemory.getChunksForFile(filePath);
  }

  /**
   * Get total number of indexed chunks
   *
   * @returns Number of chunks
   */
  async getChunkCount(): Promise<number> {
    return this.codeMemory.getChunkCount(this.projectId);
  }

  /**
   * Clear all indexed data for the project
   *
   * @returns Number of chunks deleted
   */
  async clear(): Promise<number> {
    return this.codeMemory.clearProject(this.projectId);
  }

  /**
   * Rebuild the entire index
   *
   * @returns New indexing statistics
   */
  async rebuild(): Promise<IndexStats> {
    return this.codeMemory.rebuildIndex(this.projectId);
  }

  /**
   * Get the underlying CodeMemory instance
   * (for advanced operations)
   */
  getCodeMemory(): CodeMemory {
    return this.codeMemory;
  }

  /**
   * Get the underlying repository
   * (for advanced operations)
   */
  getRepository(): CodeChunkRepository {
    return this.repository;
  }
}
