/**
 * CodeMemory - Core implementation for semantic code search and storage
 *
 * Manages code chunk storage, retrieval, and indexing using embeddings
 * for semantic search capabilities.
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/code/CodeMemory
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { basename, extname, relative, resolve } from 'path';
import { createHash } from 'crypto';
import type {
  ICodeMemory,
  CodeChunk,
  CodeSearchResult,
  CodeSearchOptions,
  CodeUsage,
  CodeDefinition,
  IndexStats,
  ChunkingOptions,
  UsageType,
} from './types';
import { DEFAULT_SEARCH_OPTIONS } from './types';
import { CodeChunkRepository } from './CodeChunkRepository';
import { CodeChunker } from './CodeChunker';
import { EmbeddingsService } from '../EmbeddingsService';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for CodeMemory
 */
export interface CodeMemoryConfig {
  /** Patterns to include (default: common source files) */
  includePatterns?: string[];
  /** Patterns to exclude (default: node_modules, dist, etc.) */
  excludePatterns?: string[];
  /** Maximum files to index at once (default: 100) */
  batchSize?: number;
  /** Whether to skip embedding generation (for testing) */
  skipEmbeddings?: boolean;
}

/**
 * Default CodeMemory configuration
 */
export const DEFAULT_CODE_MEMORY_CONFIG: Required<CodeMemoryConfig> = {
  includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**',
    '**/out/**',
  ],
  batchSize: 100,
  skipEmbeddings: false,
};

// ============================================================================
// Constants
// ============================================================================

/** Approximate characters per token for estimation */
const CHARS_PER_TOKEN = 4;

// ============================================================================
// CodeMemory Implementation
// ============================================================================

/**
 * CodeMemory - Main implementation for semantic code search
 *
 * Features:
 * - Index files and projects
 * - Semantic code search using embeddings
 * - Find similar code snippets
 * - Find symbol usages and definitions
 * - Incremental updates with change detection
 */
export class CodeMemory implements ICodeMemory {
  private readonly repository: CodeChunkRepository;
  private readonly chunker: CodeChunker;
  private readonly embeddings: EmbeddingsService;
  private readonly config: Required<CodeMemoryConfig>;

  constructor(
    repository: CodeChunkRepository,
    chunker: CodeChunker,
    embeddings: EmbeddingsService,
    config?: CodeMemoryConfig
  ) {
    this.repository = repository;
    this.chunker = chunker;
    this.embeddings = embeddings;
    this.config = { ...DEFAULT_CODE_MEMORY_CONFIG, ...config };
  }

  // ============================================================================
  // Indexing Methods
  // ============================================================================

  /**
   * Index a single file and create code chunks
   * @param file File path to index
   * @param content File content
   * @returns Created code chunks
   */
  async indexFile(file: string, content: string): Promise<CodeChunk[]> {
    // Generate chunks using the chunker
    const chunks = this.chunker.chunkFile(file, content);

    if (chunks.length === 0) {
      return [];
    }

    // Generate embeddings for each chunk unless skipped
    if (!this.config.skipEmbeddings) {
      const contents = chunks.map((chunk) => chunk.content);
      const embeddings = await this.embeddings.embedBatch(contents);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = embeddings[i];
        const chunk = chunks[i];
        if (chunk && embedding) {
          chunk.embedding = embedding;
        }
      }
    }

    // Store chunks in repository
    await this.repository.insertMany(chunks);

    return chunks;
  }

  /**
   * Index an entire project directory
   * @param projectPath Root path of the project
   * @param options Chunking options
   * @returns Indexing statistics
   */
  async indexProject(
    projectPath: string,
    options?: ChunkingOptions
  ): Promise<IndexStats> {
    const startTime = Date.now();
    const stats: IndexStats = {
      filesIndexed: 0,
      chunksCreated: 0,
      tokensProcessed: 0,
      duration: 0,
      errors: [],
    };

    // Find all matching source files
    const files = await this.findProjectFiles(projectPath);

    // Process files in batches
    for (let i = 0; i < files.length; i += this.config.batchSize) {
      const batch = files.slice(i, i + this.config.batchSize);

      for (const file of batch) {
        try {
          const content = await readFile(file, 'utf-8');
          const relativePath = relative(projectPath, file);

          // Create a custom chunker with project-specific options if provided
          let chunks: CodeChunk[];
          if (options) {
            const customChunker = new CodeChunker(undefined, options, basename(projectPath));
            chunks = customChunker.chunkFile(relativePath, content);
          } else {
            chunks = this.chunker.chunkFile(relativePath, content);
          }

          if (chunks.length > 0) {
            // Generate embeddings
            if (!this.config.skipEmbeddings) {
              const contents = chunks.map((c) => c.content);
              const embeddings = await this.embeddings.embedBatch(contents);

              for (let j = 0; j < chunks.length; j++) {
                const embedding = embeddings[j];
                const chunk = chunks[j];
                if (chunk && embedding) {
                  chunk.embedding = embedding;
                }
              }
            }

            // Store in repository
            await this.repository.insertMany(chunks);

            stats.filesIndexed++;
            stats.chunksCreated += chunks.length;
            stats.tokensProcessed += this.estimateTokens(content);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          stats.errors.push(`Failed to index ${file}: ${errorMessage}`);
        }
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  /**
   * Update chunks for a file that has changed
   * @param file File path to update
   * @param content New file content
   * @returns Updated code chunks
   */
  async updateFile(file: string, content: string): Promise<CodeChunk[]> {
    // Get existing chunks for this file
    const existingChunks = await this.repository.findByFile(file);

    if (existingChunks.length === 0) {
      // No existing chunks, just index the file
      return this.indexFile(file, content);
    }

    // Calculate hash of new content
    const newHash = this.calculateHash(content);

    // Check if content has changed by comparing with first chunk's hash
    // (simplified check - could be more sophisticated)
    const existingHash = existingChunks[0]?.metadata.hash;

    // Get new chunks
    const newChunks = this.chunker.chunkFile(file, content);

    // Check if any chunk content differs
    const hasChanged = newChunks.some((newChunk) => {
      const matching = existingChunks.find((ec) =>
        ec.startLine === newChunk.startLine &&
        ec.endLine === newChunk.endLine
      );
      return !matching || matching.metadata.hash !== newChunk.metadata.hash;
    });

    if (!hasChanged && existingChunks.length === newChunks.length) {
      // No changes, return existing chunks
      return existingChunks;
    }

    // Content changed, remove old chunks and add new ones
    await this.repository.deleteByFile(file);

    // Generate embeddings for new chunks
    if (!this.config.skipEmbeddings && newChunks.length > 0) {
      const contents = newChunks.map((c) => c.content);
      const embeddings = await this.embeddings.embedBatch(contents);

      for (let i = 0; i < newChunks.length; i++) {
        const embedding = embeddings[i];
        const chunk = newChunks[i];
        if (chunk && embedding) {
          chunk.embedding = embedding;
        }
      }
    }

    if (newChunks.length > 0) {
      await this.repository.insertMany(newChunks);
    }

    return newChunks;
  }

  /**
   * Remove all chunks for a file
   * @param file File path to remove
   * @returns Number of chunks removed
   */
  async removeFile(file: string): Promise<number> {
    return this.repository.deleteByFile(file);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Search code using natural language or code snippets
   * @param query Search query
   * @param options Search options
   * @returns Ranked search results
   */
  async searchCode(
    query: string,
    options?: CodeSearchOptions
  ): Promise<CodeSearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    // Generate embedding for the query
    const queryEmbedding = await this.embeddings.embed(query);

    // Get all chunks that match the filter criteria
    let chunks: CodeChunk[];
    if (opts.projectId) {
      chunks = await this.repository.findAllWithEmbeddings(opts.projectId);
    } else {
      chunks = await this.repository.findAll({ limit: 1000 });
    }

    // Filter chunks based on options
    chunks = this.filterChunks(chunks, opts);

    // Calculate similarity scores
    const results: CodeSearchResult[] = chunks
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
        highlights: opts.includeContext ? this.generateHighlights(query, chunk.content) : undefined,
      }))
      .filter((result) => result.score >= opts.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit);

    return results;
  }

  /**
   * Find code similar to a given snippet
   * @param codeSnippet Code to find similar matches for
   * @param limit Maximum results to return
   * @returns Ranked search results
   */
  async findSimilarCode(
    codeSnippet: string,
    limit: number = 10
  ): Promise<CodeSearchResult[]> {
    // Generate embedding for the code snippet
    const snippetEmbedding = await this.embeddings.embed(codeSnippet);

    // Get all chunks with embeddings
    const chunks = await this.repository.findAll({ limit: 1000 });

    // Filter to only chunks with embeddings
    const chunksWithEmbeddings = chunks.filter((c) => c.embedding.length > 0);

    // Calculate similarity and rank
    const results: CodeSearchResult[] = chunksWithEmbeddings
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(snippetEmbedding, chunk.embedding),
      }))
      .filter((result) => result.score > 0.3) // Minimum threshold for code similarity
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * Find all usages of a symbol
   * @param symbolName Name of the symbol to search for
   * @param projectId Optional project to limit search
   * @returns All usages found
   */
  async findUsages(
    symbolName: string,
    projectId?: string
  ): Promise<CodeUsage[]> {
    // Search for chunks containing the symbol
    const chunks = await this.repository.findBySymbol(symbolName, projectId);
    const usages: CodeUsage[] = [];

    for (const chunk of chunks) {
      const lines = chunk.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Find all occurrences of the symbol in this line
        const pattern = new RegExp(`\\b${this.escapeRegex(symbolName)}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const usageType = this.detectUsageType(line, match.index, symbolName);

          usages.push({
            file: chunk.file,
            line: chunk.startLine + i,
            column: match.index + 1,
            context: line.trim(),
            usageType,
          });
        }
      }
    }

    return usages;
  }

  /**
   * Find the definition of a symbol
   * @param symbolName Name of the symbol to find
   * @param projectId Optional project to limit search
   * @returns Definition location or null if not found
   */
  async findDefinition(
    symbolName: string,
    projectId?: string
  ): Promise<CodeDefinition | null> {
    // Search for chunks where this symbol is defined
    const chunks = await this.repository.findBySymbol(symbolName, projectId);

    for (const chunk of chunks) {
      // Look for definition patterns
      const definitionPatterns = [
        // Function definitions
        new RegExp(`(?:function|const|let|var)\\s+${this.escapeRegex(symbolName)}\\s*[=(]`, 'm'),
        // Class definitions
        new RegExp(`class\\s+${this.escapeRegex(symbolName)}\\b`, 'm'),
        // Interface definitions
        new RegExp(`interface\\s+${this.escapeRegex(symbolName)}\\b`, 'm'),
        // Type definitions
        new RegExp(`type\\s+${this.escapeRegex(symbolName)}\\s*=`, 'm'),
        // Arrow function in object
        new RegExp(`${this.escapeRegex(symbolName)}\\s*:\\s*\\([^)]*\\)\\s*=>`, 'm'),
        // Method definition
        new RegExp(`(?:async\\s+)?${this.escapeRegex(symbolName)}\\s*\\([^)]*\\)\\s*(?::\\s*\\w+)?\\s*\\{`, 'm'),
      ];

      for (const pattern of definitionPatterns) {
        const match = pattern.exec(chunk.content);
        if (match) {
          // Find the line number of the match
          const lines = chunk.content.substring(0, match.index).split('\n');
          const lineOffset = lines.length - 1;
          const column = (lines[lines.length - 1]?.length ?? 0) + 1;

          // Extract the signature (the matched line)
          const allLines = chunk.content.split('\n');
          const matchLine = allLines[lineOffset] ?? '';

          return {
            file: chunk.file,
            line: chunk.startLine + lineOffset,
            column,
            signature: matchLine.trim(),
            documentation: chunk.metadata.documentation,
            chunk,
          };
        }
      }
    }

    return null;
  }

  // ============================================================================
  // Chunk Management Methods
  // ============================================================================

  /**
   * Get all chunks for a specific file
   * @param file File path
   * @returns Chunks ordered by line number
   */
  async getChunksForFile(file: string): Promise<CodeChunk[]> {
    return this.repository.findByFile(file);
  }

  /**
   * Get a chunk by its ID
   * @param chunkId Chunk identifier
   * @returns The chunk or null if not found
   */
  async getChunkById(chunkId: string): Promise<CodeChunk | null> {
    return this.repository.findById(chunkId);
  }

  /**
   * Get the total number of indexed chunks
   * @param projectId Optional project to count
   * @returns Number of chunks
   */
  async getChunkCount(projectId?: string): Promise<number> {
    return this.repository.count(projectId);
  }

  // ============================================================================
  // Maintenance Methods
  // ============================================================================

  /**
   * Clear all chunks for a project
   * @param projectId Project to clear
   * @returns Number of chunks deleted
   */
  async clearProject(projectId: string): Promise<number> {
    return this.repository.deleteByProject(projectId);
  }

  /**
   * Rebuild the entire index for a project
   * @param projectId Project to rebuild
   * @returns New indexing statistics
   */
  async rebuildIndex(projectId: string): Promise<IndexStats> {
    // Get the list of unique files in this project
    const files = await this.repository.getFiles(projectId);

    // Clear existing chunks
    await this.repository.deleteByProject(projectId);

    const startTime = Date.now();
    const stats: IndexStats = {
      filesIndexed: 0,
      chunksCreated: 0,
      tokensProcessed: 0,
      duration: 0,
      errors: [],
    };

    // Re-index each file
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const chunks = await this.indexFile(file, content);

        stats.filesIndexed++;
        stats.chunksCreated += chunks.length;
        stats.tokensProcessed += this.estimateTokens(content);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Failed to re-index ${file}: ${errorMessage}`);
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Find all source files in a project
   */
  private async findProjectFiles(projectPath: string): Promise<string[]> {
    const absolutePath = resolve(projectPath);
    const allFiles: string[] = [];

    for (const pattern of this.config.includePatterns) {
      const files = await glob(pattern, {
        cwd: absolutePath,
        absolute: true,
        ignore: this.config.excludePatterns,
      });
      allFiles.push(...files);
    }

    // Remove duplicates
    return [...new Set(allFiles)];
  }

  /**
   * Filter chunks based on search options
   */
  private filterChunks(
    chunks: CodeChunk[],
    options: Required<CodeSearchOptions>
  ): CodeChunk[] {
    return chunks.filter((chunk) => {
      // Filter by language
      if (options.language && chunk.metadata.language !== options.language) {
        return false;
      }

      // Filter by chunk types
      if (!options.chunkTypes.includes(chunk.chunkType)) {
        return false;
      }

      // Filter by file pattern (simplified glob matching)
      if (options.filePattern !== '**/*') {
        const pattern = options.filePattern.replace(/\*/g, '.*');
        const regex = new RegExp(pattern);
        if (!regex.test(chunk.file)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) {
      return 0;
    }

    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      magnitudeA += aVal * aVal;
      magnitudeB += bVal * bVal;
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Generate highlighted snippets for search results
   */
  private generateHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const lines = content.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (queryTerms.some((term) => lowerLine.includes(term))) {
        highlights.push(line.trim());
        if (highlights.length >= 3) {
          break;
        }
      }
    }

    return highlights;
  }

  /**
   * Detect how a symbol is being used in a line of code
   */
  private detectUsageType(line: string, column: number, symbolName: string): UsageType {
    // Check what comes before and after the symbol
    const before = line.substring(0, column).trim();
    const after = line.substring(column + symbolName.length).trim();

    // Import usage
    if (before.includes('import') || before.includes('from')) {
      return 'import';
    }

    // Function call
    if (after.startsWith('(')) {
      return 'call';
    }

    // Assignment
    if (after.startsWith('=') && !after.startsWith('==') && !after.startsWith('=>')) {
      return 'assignment';
    }

    // Type reference (in type annotations)
    if (before.endsWith(':') || before.endsWith('<') || after.startsWith('>')) {
      return 'type_reference';
    }

    // Default to reference
    return 'reference';
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate SHA-256 hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new CodeMemory instance with default dependencies
 * @param repository CodeChunkRepository instance
 * @param embeddings EmbeddingsService instance
 * @param config Optional configuration
 * @returns Configured CodeMemory instance
 */
export function createCodeMemory(
  repository: CodeChunkRepository,
  embeddings: EmbeddingsService,
  config?: CodeMemoryConfig
): CodeMemory {
  const chunker = new CodeChunker();
  return new CodeMemory(repository, chunker, embeddings, config);
}
