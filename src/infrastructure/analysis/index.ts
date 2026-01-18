/**
 * Repository Map Analysis Module
 *
 * Provides tree-sitter based repository mapping to enable agents to understand
 * codebase structure, find symbols, and identify dependencies.
 *
 * @module infrastructure/analysis
 *
 * @example
 * ```typescript
 * import { generateRepoMap, formatRepoMapForContext } from './infrastructure/analysis';
 *
 * // Generate and format a repo map in one call
 * const formatted = await formatRepoMapForContext('.', 4000);
 *
 * // Or generate and format separately
 * const map = await generateRepoMap('.', { maxFiles: 100 });
 * console.log(map.stats.totalSymbols);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  SupportedLanguage,
  SymbolKind,
  SymbolModifier,
  SymbolEntry,
  DependencyType,
  DependencyEdge,
  ImportStatement,
  ExportStatement,
  ParseError,
  ParseResult,
  FileEntry,
  RepoMapStats,
  RepoMap,
  RepoMapOptions,
  FormatOptions,
  SymbolUsage,
  // Helper types
  SymbolNode,
  SymbolStatistics,
  DependencyGraphStats,
  RankedSymbol,
  ReferenceStatistics,
  // Interface definitions
  ITreeSitterParser,
  IDependencyGraphBuilder,
  IReferenceCounter,
  IRepoMapFormatter,
  IRepoMapGenerator,
} from './types';

export { DEFAULT_REPO_MAP_OPTIONS, DEFAULT_FORMAT_OPTIONS } from './types';

// ============================================================================
// Class Exports
// ============================================================================

export {
  TreeSitterParser,
  getParser,
  resetParser,
} from './TreeSitterParser';

export {
  SymbolExtractor,
  getSymbolExtractor,
  resetSymbolExtractor,
} from './SymbolExtractor';

export {
  DependencyGraphBuilder,
  getDependencyGraphBuilder,
  resetDependencyGraphBuilder,
} from './DependencyGraphBuilder';

export {
  ReferenceCounter,
  getReferenceCounter,
  resetReferenceCounter,
} from './ReferenceCounter';

export {
  RepoMapGenerator,
  getRepoMapGenerator,
  resetRepoMapGenerator,
} from './RepoMapGenerator';

export {
  RepoMapFormatter,
  getRepoMapFormatter,
  resetRepoMapFormatter,
} from './RepoMapFormatter';

// ============================================================================
// Codebase Documentation Module
// ============================================================================

export * from './codebase';

// ============================================================================
// Convenience Functions
// ============================================================================

import type { RepoMap, RepoMapOptions, FormatOptions } from './types';
import { RepoMapGenerator } from './RepoMapGenerator';
import { RepoMapFormatter } from './RepoMapFormatter';

/**
 * Create and initialize a new RepoMapGenerator
 *
 * @param wasmBasePath - Optional base path for WASM files
 * @returns Initialized RepoMapGenerator ready to use
 *
 * @example
 * ```typescript
 * const generator = await createRepoMapGenerator();
 * const map = await generator.generate('./my-project');
 * ```
 */
export async function createRepoMapGenerator(
  wasmBasePath?: string
): Promise<RepoMapGenerator> {
  const generator = new RepoMapGenerator(wasmBasePath);
  await generator.initialize();
  return generator;
}

/**
 * Generate a repository map in one call
 *
 * Creates a generator, initializes it, generates the map, and returns it.
 * For repeated generation, prefer using `createRepoMapGenerator()` and
 * reusing the instance.
 *
 * @param projectPath - Root project path to analyze
 * @param options - Optional generation options
 * @returns Complete repository map
 *
 * @example
 * ```typescript
 * const map = await generateRepoMap('.', { maxFiles: 100 });
 * console.log(`Found ${map.stats.totalSymbols} symbols`);
 * ```
 */
export async function generateRepoMap(
  projectPath: string,
  options?: RepoMapOptions
): Promise<RepoMap> {
  const generator = await createRepoMapGenerator();
  return generator.generate(projectPath, options);
}

/**
 * Generate and format a repository map for context window in one call
 *
 * Convenience function that combines generation and formatting for
 * immediate use in prompts or context windows.
 *
 * @param projectPath - Root project path to analyze
 * @param maxTokens - Maximum token budget for output
 * @param options - Optional generation and format options
 * @returns Formatted repository map string within token budget
 *
 * @example
 * ```typescript
 * const context = await formatRepoMapForContext('.', 4000);
 * const prompt = `Here's the codebase structure:\n${context}\n\nTask: ...`;
 * ```
 */
export async function formatRepoMapForContext(
  projectPath: string,
  maxTokens: number,
  options?: Partial<RepoMapOptions & FormatOptions>
): Promise<string> {
  // Build repoMapOptions only with defined values to avoid overriding defaults with undefined
  const repoMapOptions: RepoMapOptions = {};
  if (options?.maxFiles !== undefined) repoMapOptions.maxFiles = options.maxFiles;
  if (options?.maxTokens !== undefined) repoMapOptions.maxTokens = options.maxTokens;
  if (options?.includePatterns !== undefined) repoMapOptions.includePatterns = options.includePatterns;
  if (options?.excludePatterns !== undefined) repoMapOptions.excludePatterns = options.excludePatterns;
  if (options?.languages !== undefined) repoMapOptions.languages = options.languages;
  if (options?.extractDocs !== undefined) repoMapOptions.extractDocs = options.extractDocs;
  if (options?.countReferences !== undefined) repoMapOptions.countReferences = options.countReferences;
  if (options?.basePath !== undefined) repoMapOptions.basePath = options.basePath;

  const formatOptions: FormatOptions = {
    maxTokens,
    includeSignatures: options?.includeSignatures ?? true,
    includeDocstrings: options?.includeDocstrings ?? false,
    rankByReferences: options?.rankByReferences ?? true,
    groupByFile: options?.groupByFile ?? true,
    includeDependencies: options?.includeDependencies ?? false,
    style: options?.style ?? 'compact',
  };

  const generator = await createRepoMapGenerator();
  const map = await generator.generate(projectPath, repoMapOptions);

  const formatter = new RepoMapFormatter();
  return formatter.format(map, formatOptions);
}

/**
 * Get statistics for a repository in formatted string
 *
 * @param projectPath - Root project path to analyze
 * @param options - Optional generation options
 * @returns Formatted statistics string
 *
 * @example
 * ```typescript
 * const stats = await getRepoStats('.');
 * console.log(stats);
 * // # Repository Statistics
 * // ## Overview
 * // - **Total Files:** 42
 * // - **Total Symbols:** 156
 * // ...
 * ```
 */
export async function getRepoStats(
  projectPath: string,
  options?: RepoMapOptions
): Promise<string> {
  const generator = await createRepoMapGenerator();
  const map = await generator.generate(projectPath, options);

  const formatter = new RepoMapFormatter();
  return formatter.formatStats(map);
}
