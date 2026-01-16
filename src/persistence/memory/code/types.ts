/**
 * Code Memory Types and Interfaces
 *
 * This module defines all TypeScript types for the Code Memory system,
 * which enables semantic code search and intelligent code chunking.
 *
 * Layer 6: Persistence - Memory subsystem
 */

// Import SymbolEntry from analysis module for ICodeChunker interface
import type { SymbolEntry } from '../../../infrastructure/analysis';

// Re-export for consumers of this module
export type { SymbolEntry };

// ============================================================================
// Core Types
// ============================================================================

/**
 * Types of code chunks based on their semantic role
 */
export type CodeChunkType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'module'
  | 'block';

/**
 * Metadata associated with a code chunk
 */
export interface CodeChunkMetadata {
  /** Programming language of the chunk */
  language: string;
  /** Cyclomatic complexity score (optional) */
  complexity?: number;
  /** Imported/required modules */
  dependencies?: string[];
  /** Exported symbols from this chunk */
  exports?: string[];
  /** JSDoc or inline documentation */
  documentation?: string;
  /** SHA-256 hash of content for change detection */
  hash: string;
}

/**
 * A chunk of code with embeddings for semantic search
 */
export interface CodeChunk {
  /** Unique identifier for the chunk */
  id: string;
  /** Project this chunk belongs to */
  projectId: string;
  /** File path (relative or absolute) */
  file: string;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed, inclusive) */
  endLine: number;
  /** The actual code content */
  content: string;
  /** Vector embedding for semantic search (1536 dimensions for OpenAI) */
  embedding: number[];
  /** Symbols defined or referenced in this chunk */
  symbols: string[];
  /** Type of code structure this chunk represents */
  chunkType: CodeChunkType;
  /** Additional metadata about the chunk */
  metadata: CodeChunkMetadata;
  /** When this chunk was indexed */
  indexedAt: Date;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Result from a code search operation
 */
export interface CodeSearchResult {
  /** The matched code chunk */
  chunk: CodeChunk;
  /** Similarity score (0.0 to 1.0) */
  score: number;
  /** Highlighted snippets showing query matches (optional) */
  highlights?: string[];
}

/**
 * Options for configuring code search
 */
export interface CodeSearchOptions {
  /** Limit search to a specific project */
  projectId?: string;
  /** Glob pattern to filter files */
  filePattern?: string;
  /** Filter by programming language */
  language?: string;
  /** Filter by chunk types */
  chunkTypes?: CodeChunkType[];
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity threshold (0.0 to 1.0) */
  threshold?: number;
  /** Include surrounding context lines */
  includeContext?: boolean;
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: Required<CodeSearchOptions> = {
  projectId: '',
  filePattern: '**/*',
  language: '',
  chunkTypes: ['function', 'class', 'interface', 'type', 'module', 'block'],
  limit: 10,
  threshold: 0.7,
  includeContext: false,
};

// ============================================================================
// Usage and Definition Types
// ============================================================================

/**
 * How a symbol is being used
 */
export type UsageType =
  | 'call'
  | 'import'
  | 'reference'
  | 'assignment'
  | 'type_reference';

/**
 * A usage of a symbol in code
 */
export interface CodeUsage {
  /** File where the usage occurs */
  file: string;
  /** Line number of the usage */
  line: number;
  /** Column number of the usage */
  column: number;
  /** Surrounding code context */
  context: string;
  /** How the symbol is being used */
  usageType: UsageType;
}

/**
 * Definition location of a symbol
 */
export interface CodeDefinition {
  /** File where the symbol is defined */
  file: string;
  /** Line number of the definition */
  line: number;
  /** Column number of the definition */
  column: number;
  /** Function/class signature */
  signature: string;
  /** Documentation for the symbol */
  documentation?: string;
  /** The chunk containing this definition */
  chunk?: CodeChunk;
}

// ============================================================================
// Indexing Types
// ============================================================================

/**
 * Statistics from an indexing operation
 */
export interface IndexStats {
  /** Number of files successfully indexed */
  filesIndexed: number;
  /** Total number of chunks created */
  chunksCreated: number;
  /** Approximate tokens processed */
  tokensProcessed: number;
  /** Duration of the indexing operation in milliseconds */
  duration: number;
  /** Any errors that occurred during indexing */
  errors: string[];
}

/**
 * Options for configuring code chunking
 */
export interface ChunkingOptions {
  /** Maximum tokens per chunk (default: 1000) */
  maxChunkSize?: number;
  /** Minimum tokens per chunk (default: 50) */
  minChunkSize?: number;
  /** Overlap tokens between adjacent chunks (default: 50) */
  overlapSize?: number;
  /** Respect function/class boundaries when chunking (default: true) */
  preserveBoundaries?: boolean;
}

/**
 * Default chunking options
 */
export const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  maxChunkSize: 1000,
  minChunkSize: 50,
  overlapSize: 50,
  preserveBoundaries: true,
};

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Interface for the main Code Memory system
 */
export interface ICodeMemory {
  // -------------------- Indexing --------------------

  /**
   * Index a single file and create code chunks
   * @param file File path to index
   * @param content File content
   * @returns Created code chunks
   */
  indexFile(file: string, content: string): Promise<CodeChunk[]>;

  /**
   * Index an entire project directory
   * @param projectPath Root path of the project
   * @param options Chunking options
   * @returns Indexing statistics
   */
  indexProject(projectPath: string, options?: ChunkingOptions): Promise<IndexStats>;

  /**
   * Update chunks for a file that has changed
   * @param file File path to update
   * @param content New file content
   * @returns Updated code chunks
   */
  updateFile(file: string, content: string): Promise<CodeChunk[]>;

  /**
   * Remove all chunks for a file
   * @param file File path to remove
   * @returns Number of chunks removed
   */
  removeFile(file: string): Promise<number>;

  // -------------------- Queries --------------------

  /**
   * Search code using natural language or code snippets
   * @param query Search query
   * @param options Search options
   * @returns Ranked search results
   */
  searchCode(query: string, options?: CodeSearchOptions): Promise<CodeSearchResult[]>;

  /**
   * Find code similar to a given snippet
   * @param codeSnippet Code to find similar matches for
   * @param limit Maximum results to return
   * @returns Ranked search results
   */
  findSimilarCode(codeSnippet: string, limit?: number): Promise<CodeSearchResult[]>;

  /**
   * Find all usages of a symbol
   * @param symbolName Name of the symbol to search for
   * @param projectId Optional project to limit search
   * @returns All usages found
   */
  findUsages(symbolName: string, projectId?: string): Promise<CodeUsage[]>;

  /**
   * Find the definition of a symbol
   * @param symbolName Name of the symbol to find
   * @param projectId Optional project to limit search
   * @returns Definition location or null if not found
   */
  findDefinition(symbolName: string, projectId?: string): Promise<CodeDefinition | null>;

  // -------------------- Chunk Management --------------------

  /**
   * Get all chunks for a specific file
   * @param file File path
   * @returns Chunks ordered by line number
   */
  getChunksForFile(file: string): Promise<CodeChunk[]>;

  /**
   * Get a chunk by its ID
   * @param chunkId Chunk identifier
   * @returns The chunk or null if not found
   */
  getChunkById(chunkId: string): Promise<CodeChunk | null>;

  /**
   * Get the total number of indexed chunks
   * @param projectId Optional project to count
   * @returns Number of chunks
   */
  getChunkCount(projectId?: string): Promise<number>;

  // -------------------- Maintenance --------------------

  /**
   * Clear all chunks for a project
   * @param projectId Project to clear
   * @returns Number of chunks deleted
   */
  clearProject(projectId: string): Promise<number>;

  /**
   * Rebuild the entire index for a project
   * @param projectId Project to rebuild
   * @returns New indexing statistics
   */
  rebuildIndex(projectId: string): Promise<IndexStats>;
}

/**
 * Interface for the code chunking service
 */
export interface ICodeChunker {
  /**
   * Chunk a file based on its structure
   * @param file File path
   * @param content File content
   * @param options Chunking options
   * @returns Array of code chunks (without embeddings)
   */
  chunkFile(file: string, content: string, options?: ChunkingOptions): CodeChunk[];

  /**
   * Chunk a file using pre-extracted symbols
   * @param file File path
   * @param content File content
   * @param symbols Pre-extracted symbols from TreeSitter
   * @returns Array of code chunks (without embeddings)
   */
  chunkBySymbols(file: string, content: string, symbols: SymbolEntry[]): CodeChunk[];
}

/**
 * Interface for the semantic search engine
 */
export interface ICodeSearchEngine {
  /**
   * Search chunks using a query embedding
   * @param query Search query or embedding
   * @param chunks Chunks to search through
   * @param options Search options
   * @returns Ranked search results
   */
  search(
    query: string | number[],
    chunks: CodeChunk[],
    options?: CodeSearchOptions
  ): Promise<CodeSearchResult[]>;

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
  ): CodeSearchResult[];

  /**
   * Calculate similarity between two embeddings
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Similarity score (0.0 to 1.0)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number;
}

// ============================================================================
// Database Row Types (for repository)
// ============================================================================

/**
 * Row type for code_chunks table (stored in DB)
 */
export interface CodeChunkRow {
  id: string;
  projectId: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: string | null; // JSON string of number[]
  symbols: string; // JSON string of string[]
  chunkType: string;
  language: string;
  complexity: number | null;
  hash: string;
  indexedAt: Date;
}

/**
 * Input for creating a new code chunk row
 */
export interface NewCodeChunkRow {
  id: string;
  projectId: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: string | null;
  symbols: string;
  chunkType: string;
  language: string;
  complexity: number | null;
  hash: string;
  indexedAt: Date;
}
