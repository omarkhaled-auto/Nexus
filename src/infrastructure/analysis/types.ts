/**
 * Repository Map Analysis Types
 *
 * Comprehensive type definitions for the tree-sitter based repository mapping system.
 * This module enables agents to understand codebase structure, find symbols, and
 * identify dependencies.
 *
 * @module infrastructure/analysis/types
 */

// ============================================================================
// Language Support
// ============================================================================

/**
 * Languages currently supported for parsing
 */
export type SupportedLanguage = 'typescript' | 'javascript';

// ============================================================================
// Symbol Types
// ============================================================================

/**
 * All symbol types that can be extracted from source code
 */
export type SymbolKind =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'property'
  | 'variable'
  | 'constant'
  | 'type'
  | 'enum'
  | 'enum_member'
  | 'namespace'
  | 'module';

/**
 * Modifiers that can be applied to symbols
 */
export type SymbolModifier =
  | 'async'
  | 'static'
  | 'private'
  | 'protected'
  | 'public'
  | 'readonly'
  | 'abstract'
  | 'override'
  | 'export'
  | 'default';

/**
 * Extracted symbol information with full metadata
 */
export interface SymbolEntry {
  /** Unique identifier: `${file}#${name}#${line}` */
  id: string;
  /** Symbol name */
  name: string;
  /** Kind of symbol */
  kind: SymbolKind;
  /** Absolute file path */
  file: string;
  /** Starting line number (1-indexed) */
  line: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Column number (0-indexed) */
  column: number;
  /** Type signature or declaration */
  signature: string;
  /** JSDoc documentation if present */
  documentation?: string;
  /** Number of times this symbol is referenced */
  references: number;
  /** Whether the symbol is exported */
  exported: boolean;
  /** Parent symbol ID for nested symbols (e.g., method in class) */
  parentId?: string;
  /** Modifiers applied to this symbol */
  modifiers: SymbolModifier[];
}

// ============================================================================
// Dependency Types
// ============================================================================

/**
 * Types of dependency relationships between files
 */
export type DependencyType =
  | 'import' // import { x } from './mod'
  | 'require' // require('./mod')
  | 'dynamic' // import('./mod')
  | 'export_from' // export { x } from './mod'
  | 'type_import' // import type { T } from './types'
  | 'side_effect'; // import './styles.css'

/**
 * An edge in the dependency graph representing an import relationship
 */
export interface DependencyEdge {
  /** Source file (the importer) */
  from: string;
  /** Target file (the imported) */
  to: string;
  /** Type of import */
  type: DependencyType;
  /** Symbols imported (empty for side-effect imports) */
  symbols: string[];
  /** Original import statement */
  statement?: string;
  /** Line number of the import */
  line?: number;
}

/**
 * Parsed import statement from source code
 */
export interface ImportStatement {
  /** Import type */
  type: 'named' | 'default' | 'namespace' | 'side_effect' | 'dynamic' | 'require';
  /** Module source path */
  source: string;
  /** Imported symbols with local/imported names */
  symbols: Array<{ local: string; imported?: string }>;
  /** Line number */
  line: number;
  /** Whether this is a type-only import */
  typeOnly: boolean;
}

/**
 * Parsed export statement from source code
 */
export interface ExportStatement {
  /** Export type */
  type: 'named' | 'default' | 'all' | 're_export';
  /** Exported symbols with local/exported names */
  symbols: Array<{ local: string; exported?: string }>;
  /** Source module for re-exports */
  source?: string;
  /** Line number */
  line: number;
}

// ============================================================================
// Parse Result Types
// ============================================================================

/**
 * Error encountered during parsing
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** AST node type if available */
  nodeType?: string;
}

/**
 * Complete result from parsing a single file
 */
export interface ParseResult {
  /** Whether parsing succeeded without critical errors */
  success: boolean;
  /** File path that was parsed */
  file: string;
  /** Extracted symbols */
  symbols: SymbolEntry[];
  /** Import statements found */
  imports: ImportStatement[];
  /** Export statements found */
  exports: ExportStatement[];
  /** Parse errors encountered */
  errors: ParseError[];
  /** Time taken to parse in milliseconds */
  parseTime: number;
}

// ============================================================================
// File Types
// ============================================================================

/**
 * Metadata about a source file
 */
export interface FileEntry {
  /** Absolute file path */
  path: string;
  /** Path relative to project root */
  relativePath: string;
  /** Detected language */
  language: SupportedLanguage;
  /** File size in bytes */
  size: number;
  /** Last modification time */
  lastModified: Date;
  /** Number of symbols in this file */
  symbolCount: number;
  /** Total line count */
  lineCount: number;
}

// ============================================================================
// Repository Map Types
// ============================================================================

/**
 * Statistics about the repository map
 */
export interface RepoMapStats {
  /** Total number of files analyzed */
  totalFiles: number;
  /** Total number of symbols extracted */
  totalSymbols: number;
  /** Total number of dependency edges */
  totalDependencies: number;
  /** Files per language */
  languageBreakdown: Record<SupportedLanguage, number>;
  /** Symbols per kind */
  symbolBreakdown: Record<SymbolKind, number>;
  /** Paths of the largest files by size */
  largestFiles: string[];
  /** Most referenced symbols */
  mostReferencedSymbols: Array<{
    name: string;
    file: string;
    references: number;
  }>;
  /** Files with most connections (imports + dependents) */
  mostConnectedFiles: Array<{
    file: string;
    connections: number;
  }>;
  /** Time taken to generate in milliseconds */
  generationTime: number;
}

/**
 * Complete repository map containing all extracted data
 */
export interface RepoMap {
  /** Root project path */
  projectPath: string;
  /** When the map was generated */
  generatedAt: Date;
  /** File metadata */
  files: FileEntry[];
  /** All extracted symbols */
  symbols: SymbolEntry[];
  /** Dependency relationships */
  dependencies: DependencyEdge[];
  /** Statistics about the map */
  stats: RepoMapStats;
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for generating a repository map
 */
export interface RepoMapOptions {
  /** Glob patterns to include (default: TypeScript/JavaScript files) */
  includePatterns?: string[];
  /** Glob patterns to exclude (default: node_modules, dist, tests) */
  excludePatterns?: string[];
  /** Maximum number of files to process */
  maxFiles?: number;
  /** Maximum tokens in formatted output */
  maxTokens?: number;
  /** Languages to include */
  languages?: SupportedLanguage[];
  /** Whether to extract JSDoc documentation */
  extractDocs?: boolean;
  /** Whether to count references */
  countReferences?: boolean;
  /** Base path for relative path calculation */
  basePath?: string;
}

/**
 * Default options for repository map generation
 */
export const DEFAULT_REPO_MAP_OPTIONS: Required<RepoMapOptions> = {
  includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    'coverage/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.d.ts',
  ],
  maxFiles: 500,
  maxTokens: 4000,
  languages: ['typescript', 'javascript'],
  extractDocs: true,
  countReferences: true,
  basePath: '',
};

/**
 * Options for formatting repository maps
 */
export interface FormatOptions {
  /** Maximum tokens in output */
  maxTokens?: number;
  /** Include full type signatures */
  includeSignatures?: boolean;
  /** Include JSDoc documentation */
  includeDocstrings?: boolean;
  /** Sort symbols by reference count */
  rankByReferences?: boolean;
  /** Group symbols by file */
  groupByFile?: boolean;
  /** Include dependency information */
  includeDependencies?: boolean;
  /** Output style */
  style?: 'compact' | 'detailed' | 'tree';
}

/**
 * Default options for formatting
 */
export const DEFAULT_FORMAT_OPTIONS: Required<FormatOptions> = {
  maxTokens: 4000,
  includeSignatures: true,
  includeDocstrings: false,
  rankByReferences: true,
  groupByFile: true,
  includeDependencies: false,
  style: 'compact',
};

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Interface for the TreeSitter parser wrapper
 */
export interface ITreeSitterParser {
  /**
   * Initialize the parser (load WASM modules)
   */
  initialize(): Promise<void>;

  /**
   * Check if the parser is ready to use
   */
  isReady(): boolean;

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[];

  /**
   * Detect language from file extension
   * @param filePath - File path to check
   * @returns Detected language or null
   */
  detectLanguage(filePath: string): SupportedLanguage | null;

  /**
   * Parse a single file
   * @param filePath - File path
   * @param content - File content
   * @returns Parse result with symbols, imports, exports
   */
  parseFile(filePath: string, content: string): Promise<ParseResult>;

  /**
   * Parse multiple files
   * @param files - Array of {path, content} objects
   * @returns Array of parse results
   */
  parseFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<ParseResult[]>;
}

/**
 * Interface for the dependency graph builder
 */
export interface IDependencyGraphBuilder {
  /**
   * Build dependency graph from parse results
   * @param parseResults - Results from parsing files
   * @param projectPath - Root project path for resolution
   * @returns Array of dependency edges
   */
  build(parseResults: ParseResult[], projectPath: string): DependencyEdge[];

  /**
   * Register a path alias for resolution
   * @param alias - Alias pattern (e.g., "@/")
   * @param target - Target path (e.g., "src/")
   */
  registerAlias(alias: string, target: string): void;

  /**
   * Get files that import the given file
   * @param filePath - File to check
   * @returns Array of importing file paths
   */
  getDependents(filePath: string): string[];

  /**
   * Get files imported by the given file
   * @param filePath - File to check
   * @returns Array of imported file paths
   */
  getDependencies(filePath: string): string[];

  /**
   * Find circular dependencies in the graph
   * @returns Array of cycles (each cycle is array of file paths)
   */
  findCircularDependencies(): string[][];
}

/**
 * Interface for the reference counter
 */
export interface IReferenceCounter {
  /**
   * Count references to symbols from imports
   * @param symbols - All symbols
   * @param parseResults - Parse results with import information
   * @returns Map of symbol key to reference count
   */
  count(
    symbols: SymbolEntry[],
    parseResults: ParseResult[]
  ): Map<string, number>;

  /**
   * Get top N most referenced symbols
   * @param n - Number of symbols to return
   * @returns Array of symbols sorted by reference count
   */
  getTopReferenced(n: number): SymbolEntry[];

  /**
   * Get reference count for a symbol
   * @param symbol - Symbol to check
   * @returns Reference count
   */
  getReferenceCount(symbol: SymbolEntry): number;
}

/**
 * Interface for the repository map formatter
 */
export interface IRepoMapFormatter {
  /**
   * Format repository map as string
   * @param repoMap - Repository map to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(repoMap: RepoMap, options?: FormatOptions): string;

  /**
   * Estimate token count for text
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Truncate output to fit token budget
   * @param repoMap - Repository map
   * @param maxTokens - Maximum tokens
   * @returns Truncated formatted string
   */
  truncateToFit(repoMap: RepoMap, maxTokens: number): string;

  /**
   * Format statistics as string
   * @param repoMap - Repository map
   * @returns Formatted statistics
   */
  formatStats(repoMap: RepoMap): string;
}

/**
 * Interface for the main repository map generator
 */
export interface IRepoMapGenerator {
  /**
   * Initialize the generator
   */
  initialize(): Promise<void>;

  /**
   * Generate a complete repository map
   * @param projectPath - Root project path
   * @param options - Generation options
   * @returns Complete repository map
   */
  generate(projectPath: string, options?: RepoMapOptions): Promise<RepoMap>;

  /**
   * Generate incremental update for changed files
   * @param projectPath - Root project path
   * @param changedFiles - Files that changed
   * @returns Updated repository map
   */
  generateIncremental(
    projectPath: string,
    changedFiles: string[]
  ): Promise<RepoMap>;

  /**
   * Find symbols by name
   * @param name - Symbol name to search
   * @returns Matching symbols
   */
  findSymbol(name: string): SymbolEntry[];

  /**
   * Find usages of a symbol
   * @param symbolName - Symbol name
   * @returns Usage locations
   */
  findUsages(symbolName: string): SymbolUsage[];

  /**
   * Find implementations of an interface
   * @param interfaceName - Interface name
   * @returns Implementing classes
   */
  findImplementations(interfaceName: string): SymbolEntry[];

  /**
   * Get current repository map
   * @returns Current map or null
   */
  getCurrentMap(): RepoMap | null;

  /**
   * Format map for context window
   * @param options - Format options
   * @returns Formatted string
   */
  formatForContext(options?: FormatOptions): string;

  /**
   * Clear cached data
   */
  clearCache(): void;
}

/**
 * Symbol usage location
 */
export interface SymbolUsage {
  /** File where symbol is used */
  file: string;
  /** Line number */
  line: number;
  /** Context around the usage */
  context: string;
  /** Type of usage */
  usageType: 'import' | 'reference' | 'call' | 'type';
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Symbol with hierarchy information
 */
export interface SymbolNode {
  /** The symbol */
  symbol: SymbolEntry;
  /** Child symbols (e.g., methods in a class) */
  children: SymbolNode[];
}

/**
 * Statistics about symbols in the codebase
 */
export interface SymbolStatistics {
  /** Total number of symbols */
  total: number;
  /** Symbols per kind */
  byKind: Record<SymbolKind, number>;
  /** Symbols per file */
  byFile: Record<string, number>;
  /** Number of exported symbols */
  exported: number;
  /** Number of documented symbols */
  documented: number;
  /** Percentage of symbols with documentation (0-1) */
  documentationCoverage: number;
}

/**
 * Statistics about the dependency graph
 */
export interface DependencyGraphStats {
  /** Total files in graph */
  totalFiles: number;
  /** Total dependency edges */
  totalEdges: number;
  /** Edges per dependency type */
  edgesByType: Record<DependencyType, number>;
  /** Number of circular dependency cycles */
  circularDependencies: number;
  /** Files with most connections */
  mostConnectedFiles: Array<{
    file: string;
    connections: number;
  }>;
}

/**
 * Symbol with ranking information
 */
export interface RankedSymbol {
  /** The symbol */
  symbol: SymbolEntry;
  /** Number of references */
  referenceCount: number;
  /** Calculated importance score (0-1) */
  importanceScore: number;
  /** Combined ranking score */
  combinedScore: number;
}

/**
 * Statistics about references
 */
export interface ReferenceStatistics {
  /** Total reference count across all symbols */
  totalReferences: number;
  /** Average references per symbol */
  averageReferences: number;
  /** Maximum references on any symbol */
  maxReferences: number;
  /** Number of symbols with at least one reference */
  symbolsWithReferences: number;
  /** Exported symbols with no references */
  orphanedExports: number;
  /** Percentage of symbols with references */
  coveragePercent: number;
}
