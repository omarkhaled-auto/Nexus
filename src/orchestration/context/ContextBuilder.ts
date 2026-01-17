/**
 * Context Builder - Assembles context components for agent tasks
 *
 * This module implements the ContextBuilder that creates individual
 * context components (repo map, codebase docs, files, code, memories)
 * for use by the FreshContextManager.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * Philosophy:
 * - Each component is built independently
 * - Token budgets are strictly respected
 * - Relevance scoring prioritizes important content
 */

import { readFile } from 'fs/promises';
import { basename, extname, dirname, relative } from 'path';
import type {
  IContextBuilder,
  TaskSpec,
  CodebaseDocsSummary,
  FileContent,
  FileIncludeReason,
  MemoryEntry,
} from './types';
import type { CodeSearchResult } from '../../persistence/memory/code/types';
import type { RepoMapGenerator } from '../../infrastructure/analysis/RepoMapGenerator';
import type { CodebaseAnalyzer } from '../../infrastructure/analysis/codebase/CodebaseAnalyzer';
import type { ICodeMemory } from '../../persistence/memory/code/types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Characters per token estimate (conservative)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Default relevance score for files
 */
const DEFAULT_RELEVANCE: Record<FileIncludeReason, number> = {
  task_file: 1.0,
  dependency: 0.8,
  test: 0.7,
  type_definition: 0.6,
  related: 0.5,
  requested: 0.9,
};

/**
 * File extensions to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.cs': 'csharp',
};

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the ContextBuilder
 */
export interface ContextBuilderOptions {
  /** Default project path */
  projectPath?: string;
  /** Minimum relevance score for code results */
  minCodeRelevance?: number;
  /** Minimum relevance score for memories */
  minMemoryRelevance?: number;
  /** Maximum file size to include (in characters) */
  maxFileSizeChars?: number;
}

/**
 * Default ContextBuilder options
 */
export const DEFAULT_CONTEXT_BUILDER_OPTIONS: Required<ContextBuilderOptions> = {
  projectPath: '.',
  minCodeRelevance: 0.5,
  minMemoryRelevance: 0.4,
  maxFileSizeChars: 100000, // ~25k tokens
};

/**
 * Interface for memory system (optional dependency)
 */
export interface IMemorySystem {
  search(query: string, options?: { limit?: number; threshold?: number }): Promise<Array<{
    id: string;
    content: string;
    score: number;
    source: string;
  }>>;
}

// ============================================================================
// ContextBuilder Implementation
// ============================================================================

/**
 * ContextBuilder - Assembles context components for agent tasks
 *
 * This class is responsible for building individual context components:
 * - Repository map context
 * - Codebase documentation context
 * - File content context
 * - Code search context
 * - Memory context
 *
 * Each method respects token budgets and prioritizes relevant content.
 *
 * @example
 * ```typescript
 * const builder = new ContextBuilder({
 *   repoMapGenerator,
 *   codebaseAnalyzer,
 *   codeMemory,
 * });
 *
 * const repoMap = await builder.buildRepoMapContext('/project', 2000);
 * const files = await builder.buildFileContext(['src/app.ts'], 5000);
 * ```
 */
export class ContextBuilder implements IContextBuilder {
  /**
   * RepoMapGenerator for generating repo maps
   */
  private readonly repoMapGenerator: RepoMapGenerator | null;

  /**
   * CodebaseAnalyzer for codebase documentation
   */
  private readonly codebaseAnalyzer: CodebaseAnalyzer | null;

  /**
   * CodeMemory for semantic code search
   */
  private readonly codeMemory: ICodeMemory | null;

  /**
   * Memory system for relevant memories
   */
  private readonly memorySystem: IMemorySystem | null;

  /**
   * Configuration options
   */
  private readonly options: Required<ContextBuilderOptions>;

  /**
   * Cache for repo maps
   */
  private repoMapCache: Map<string, { content: string; timestamp: Date }>;

  /**
   * Cache for codebase docs
   */
  private codebaseDocsCache: Map<string, { docs: CodebaseDocsSummary; timestamp: Date }>;

  /**
   * Create a new ContextBuilder
   *
   * @param dependencies External dependencies for building context
   * @param options Configuration options
   */
  constructor(
    dependencies: {
      repoMapGenerator?: RepoMapGenerator | null;
      codebaseAnalyzer?: CodebaseAnalyzer | null;
      codeMemory?: ICodeMemory | null;
      memorySystem?: IMemorySystem | null;
    },
    options?: ContextBuilderOptions
  ) {
    this.repoMapGenerator = dependencies.repoMapGenerator ?? null;
    this.codebaseAnalyzer = dependencies.codebaseAnalyzer ?? null;
    this.codeMemory = dependencies.codeMemory ?? null;
    this.memorySystem = dependencies.memorySystem ?? null;
    this.options = { ...DEFAULT_CONTEXT_BUILDER_OPTIONS, ...options };
    this.repoMapCache = new Map();
    this.codebaseDocsCache = new Map();
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Build repository map context
   *
   * Generates or retrieves cached repo map and formats it for context.
   * The repo map provides an overview of the project structure.
   *
   * @param projectPath Path to the project
   * @param maxTokens Maximum tokens for repo map
   * @returns Formatted repo map string
   */
  async buildRepoMapContext(projectPath: string, maxTokens: number): Promise<string> {
    if (!this.repoMapGenerator) {
      return this.buildFallbackRepoMap(projectPath, maxTokens);
    }

    // Check cache (valid for 5 minutes)
    const cached = this.repoMapCache.get(projectPath);
    if (cached && Date.now() - cached.timestamp.getTime() < 5 * 60 * 1000) {
      return this.truncateToTokens(cached.content, maxTokens);
    }

    try {
      // Generate new repo map
      await this.repoMapGenerator.initialize();
      await this.repoMapGenerator.generate(projectPath);
      const repoMap = this.repoMapGenerator.formatForContext({ maxTokens });

      // Cache the result
      this.repoMapCache.set(projectPath, {
        content: repoMap,
        timestamp: new Date(),
      });

      return this.truncateToTokens(repoMap, maxTokens);
    } catch (error) {
      // Fall back to basic repo map
      console.warn('Failed to generate repo map, using fallback:', error);
      return this.buildFallbackRepoMap(projectPath, maxTokens);
    }
  }

  /**
   * Build codebase documentation context
   *
   * Extracts relevant architecture information, patterns, and APIs
   * based on the task being performed.
   *
   * @param projectPath Path to the project
   * @param taskSpec Task to build context for
   * @param maxTokens Maximum tokens for docs
   * @returns Codebase docs summary
   */
  async buildCodebaseDocsContext(
    projectPath: string,
    taskSpec: TaskSpec,
    maxTokens: number
  ): Promise<CodebaseDocsSummary> {
    if (!this.codebaseAnalyzer) {
      return this.buildFallbackCodebaseDocs(taskSpec, maxTokens);
    }

    try {
      // Get or generate codebase documentation
      let docs = this.codebaseAnalyzer.getCurrentDocs();

      if (!docs) {
        // Analyze the codebase if not already analyzed
        docs = await this.codebaseAnalyzer.analyze(projectPath);
      }

      // Extract relevant information based on task files
      const relevantPatterns = this.extractRelevantPatterns(
        docs.patterns,
        taskSpec.files
      );

      const relevantAPIs = this.extractRelevantAPIs(
        docs.apiSurface,
        taskSpec.files
      );

      // Get condensed architecture summary
      const architectureSummary = this.codebaseAnalyzer.getDocsForContext(
        Math.floor(maxTokens * 0.6)
      );

      const tokenCount = this.estimateTokens(
        architectureSummary +
        relevantPatterns.join('\n') +
        relevantAPIs.join('\n')
      );

      return {
        architectureSummary,
        relevantPatterns,
        relevantAPIs,
        tokenCount,
      };
    } catch (error) {
      console.warn('Failed to build codebase docs context:', error);
      return this.buildFallbackCodebaseDocs(taskSpec, maxTokens);
    }
  }

  /**
   * Build file context for relevant files
   *
   * Reads files, calculates relevance scores, and returns them
   * sorted by relevance within the token budget.
   *
   * @param files File paths to include
   * @param maxTokens Maximum tokens for files
   * @returns File contents with metadata
   */
  async buildFileContext(
    files: string[],
    maxTokens: number
  ): Promise<FileContent[]> {
    const fileContents: FileContent[] = [];
    let totalTokens = 0;

    // Read all files and calculate relevance
    const fileReadPromises = files.map(async (filePath) => {
      try {
        const content = await readFile(filePath, 'utf-8');

        // Skip files that are too large
        if (content.length > this.options.maxFileSizeChars) {
          return null;
        }

        const tokenCount = this.estimateTokens(content);
        const includeReason = this.determineIncludeReason(filePath);
        const relevanceScore = DEFAULT_RELEVANCE[includeReason];

        return {
          path: filePath,
          content,
          tokenCount,
          relevanceScore,
          includeReason,
        };
      } catch {
        // File doesn't exist or can't be read
        return null;
      }
    });

    const results = await Promise.all(fileReadPromises);

    // Sort by relevance score (highest first)
    const validResults = results
      .filter((r): r is FileContent => r !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Add files until we hit the token budget
    for (const fileContent of validResults) {
      if (totalTokens + fileContent.tokenCount <= maxTokens) {
        fileContents.push(fileContent);
        totalTokens += fileContent.tokenCount;
      }
    }

    return fileContents;
  }

  /**
   * Build code context from semantic search
   *
   * Uses CodeMemory to find relevant code snippets based on
   * the search query (typically the task description).
   *
   * @param query Search query
   * @param maxTokens Maximum tokens for results
   * @returns Code search results
   */
  async buildCodeContext(
    query: string,
    maxTokens: number
  ): Promise<CodeSearchResult[]> {
    if (!this.codeMemory || !query) {
      return [];
    }

    try {
      // Search for relevant code
      const results = await this.codeMemory.searchCode(query, {
        limit: 20, // Get more than needed, then filter by tokens
        threshold: this.options.minCodeRelevance,
        includeContext: true,
      });

      // Filter results to fit within token budget
      const filteredResults: CodeSearchResult[] = [];
      let totalTokens = 0;

      for (const result of results) {
        const tokenCount = this.estimateTokens(result.chunk.content);

        if (totalTokens + tokenCount <= maxTokens) {
          filteredResults.push(result);
          totalTokens += tokenCount;
        }
      }

      return filteredResults;
    } catch (error) {
      console.warn('Failed to build code context:', error);
      return [];
    }
  }

  /**
   * Build memory context for relevant memories
   *
   * Searches the memory system for entries relevant to the task.
   *
   * @param taskSpec Task to find memories for
   * @param maxTokens Maximum tokens for memories
   * @returns Memory entries
   */
  async buildMemoryContext(
    taskSpec: TaskSpec,
    maxTokens: number
  ): Promise<MemoryEntry[]> {
    if (!this.memorySystem) {
      return [];
    }

    try {
      // Build search query from task
      const query = `${taskSpec.name} ${taskSpec.description}`;

      // Search for relevant memories
      const results = await this.memorySystem.search(query, {
        limit: 20,
        threshold: this.options.minMemoryRelevance,
      });

      // Convert to MemoryEntry format and filter by tokens
      const memories: MemoryEntry[] = [];
      let totalTokens = 0;

      for (const result of results) {
        const tokenCount = this.estimateTokens(result.content);

        if (totalTokens + tokenCount <= maxTokens) {
          memories.push({
            id: result.id,
            content: result.content,
            relevanceScore: result.score,
            source: result.source,
            tokenCount,
          });
          totalTokens += tokenCount;
        }
      }

      return memories;
    } catch (error) {
      console.warn('Failed to build memory context:', error);
      return [];
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear the repo map cache
   */
  clearRepoMapCache(): void {
    this.repoMapCache.clear();
  }

  /**
   * Clear the codebase docs cache
   */
  clearCodebaseDocsCache(): void {
    this.codebaseDocsCache.clear();
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.clearRepoMapCache();
    this.clearCodebaseDocsCache();
  }

  // ==========================================================================
  // Private Methods - Fallbacks
  // ==========================================================================

  /**
   * Build a basic repo map when RepoMapGenerator is unavailable
   */
  private buildFallbackRepoMap(
    _projectPath: string,
    maxTokens: number
  ): string {
    const fallback = `# Repository Structure

> Note: Full repo map unavailable. Basic fallback provided.

## Overview
Project structure analysis not available in current context.

## Suggestions
- Use file explorer to understand structure
- Check package.json for dependencies
- Look for README.md for project documentation
`;

    return this.truncateToTokens(fallback, maxTokens);
  }

  /**
   * Build fallback codebase docs when CodebaseAnalyzer is unavailable
   */
  private buildFallbackCodebaseDocs(
    taskSpec: TaskSpec,
    _maxTokens: number
  ): CodebaseDocsSummary {
    return {
      architectureSummary: `Task context for: ${taskSpec.name}\n\nNo codebase analysis available.`,
      relevantPatterns: [],
      relevantAPIs: [],
      tokenCount: 50,
    };
  }

  // ==========================================================================
  // Private Methods - Extraction
  // ==========================================================================

  /**
   * Extract patterns relevant to the task files
   * Uses pattern examples to determine relevance since PatternDescription.examples contains file references
   */
  private extractRelevantPatterns(
    patternsDoc: { architecturalPatterns: Array<{ name: string; description: string; examples?: Array<{ file: string }> }> } | undefined,
    taskFiles: string[]
  ): string[] {
    if (!patternsDoc) {
      return [];
    }

    const relevantPatterns: string[] = [];
    const taskDirs = new Set(taskFiles.map((f) => dirname(f)));

    for (const pattern of patternsDoc.architecturalPatterns) {
      // Get files from examples if available
      const patternFiles = pattern.examples?.map((e) => e.file) ?? [];

      if (patternFiles.length === 0) {
        // If no examples, include all patterns as potentially relevant
        relevantPatterns.push(`${pattern.name}: ${pattern.description}`);
        continue;
      }

      // Check if pattern files overlap with task files/directories
      const patternDirs = new Set(patternFiles.map((f) => dirname(f)));
      const hasOverlap = Array.from(taskDirs).some((d) => patternDirs.has(d)) ||
        patternFiles.some((f) => taskFiles.includes(f));

      if (hasOverlap) {
        relevantPatterns.push(`${pattern.name}: ${pattern.description}`);
      }
    }

    return relevantPatterns.slice(0, 5); // Limit to 5 patterns
  }

  /**
   * Extract APIs relevant to the task files
   * Uses InterfaceDoc structure where name and file are available, but not signature directly
   */
  private extractRelevantAPIs(
    apiSurfaceDoc: { publicInterfaces: Array<{ name: string; file: string; description?: string }> } | undefined,
    taskFiles: string[]
  ): string[] {
    if (!apiSurfaceDoc) {
      return [];
    }

    const relevantAPIs: string[] = [];
    const taskDirs = new Set(taskFiles.map((f) => dirname(f)));

    for (const api of apiSurfaceDoc.publicInterfaces) {
      const apiDir = dirname(api.file);

      // Check if API is in the same directory as task files
      if (taskDirs.has(apiDir) || taskFiles.includes(api.file)) {
        // Use description if available, otherwise just show name
        const desc = api.description ? `: ${api.description}` : '';
        relevantAPIs.push(`${api.name}${desc}`);
      }
    }

    return relevantAPIs.slice(0, 10); // Limit to 10 APIs
  }

  /**
   * Find files related to task specification
   */
  findRelatedFiles(taskSpec: TaskSpec): string[] {
    const relatedFiles: string[] = [];

    for (const file of taskSpec.files) {
      // Add test files
      const testFile = this.getTestFilePath(file);
      if (testFile) {
        relatedFiles.push(testFile);
      }

      // Add type definition files
      const typeFile = this.getTypeFilePath(file);
      if (typeFile) {
        relatedFiles.push(typeFile);
      }
    }

    return relatedFiles;
  }

  // ==========================================================================
  // Private Methods - Helpers
  // ==========================================================================

  /**
   * Determine why a file is being included
   */
  private determineIncludeReason(filePath: string): FileIncludeReason {
    const fileName = basename(filePath);
    const ext = extname(filePath);

    // Test files
    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      filePath.includes('__tests__')
    ) {
      return 'test';
    }

    // Type definition files
    if (ext === '.d.ts' || fileName === 'types.ts') {
      return 'type_definition';
    }

    // Default to task file
    return 'task_file';
  }

  /**
   * Get the test file path for a source file
   */
  private getTestFilePath(sourceFile: string): string | null {
    const ext = extname(sourceFile);
    const base = basename(sourceFile, ext);
    const dir = dirname(sourceFile);

    // Common test file patterns
    const patterns = [
      `${dir}/${base}.test${ext}`,
      `${dir}/${base}.spec${ext}`,
      `${dir}/__tests__/${base}${ext}`,
    ];

    // Return first pattern (caller should verify existence)
    return patterns[0] ?? null;
  }

  /**
   * Get the type file path for a source file
   */
  private getTypeFilePath(sourceFile: string): string | null {
    const dir = dirname(sourceFile);
    return `${dir}/types.ts`;
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Truncate text to fit within token budget
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;

    if (text.length <= maxChars) {
      return text;
    }

    // Find a good truncation point (end of line)
    const truncated = text.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');

    if (lastNewline > maxChars * 0.8) {
      return truncated.substring(0, lastNewline) + '\n\n[... truncated ...]';
    }

    return truncated + '\n\n[... truncated ...]';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a ContextBuilder with dependencies
 *
 * @param dependencies External dependencies
 * @param options Configuration options
 * @returns Configured ContextBuilder
 */
export function createContextBuilder(
  dependencies: {
    repoMapGenerator?: RepoMapGenerator | null;
    codebaseAnalyzer?: CodebaseAnalyzer | null;
    codeMemory?: ICodeMemory | null;
    memorySystem?: IMemorySystem | null;
  },
  options?: ContextBuilderOptions
): ContextBuilder {
  return new ContextBuilder(dependencies, options);
}

/**
 * Create a mock ContextBuilder for testing
 *
 * @returns ContextBuilder with no external dependencies
 */
export function createMockContextBuilder(): ContextBuilder {
  return new ContextBuilder({});
}
