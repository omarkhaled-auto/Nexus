/**
 * RepoMapGenerator - Main orchestrator for repository mapping
 *
 * Ties together TreeSitterParser, SymbolExtractor, DependencyGraphBuilder,
 * and ReferenceCounter to generate complete repository maps.
 *
 * @module infrastructure/analysis/RepoMapGenerator
 */

import { readFile, stat } from 'fs/promises';
import { resolve, relative } from 'path';
import fg from 'fast-glob';
import type {
  IRepoMapGenerator,
  RepoMap,
  RepoMapOptions,
  RepoMapStats,
  FileEntry,
  SymbolEntry,
  DependencyEdge,
  ParseResult,
  SupportedLanguage,
  SymbolKind,
  SymbolUsage,
  FormatOptions,
} from './types';
import { DEFAULT_REPO_MAP_OPTIONS } from './types';
import { TreeSitterParser, getParser as _getParser } from './TreeSitterParser';
import { SymbolExtractor, getSymbolExtractor as _getSymbolExtractor } from './SymbolExtractor';
import {
  DependencyGraphBuilder,
  getDependencyGraphBuilder as _getDependencyGraphBuilder,
} from './DependencyGraphBuilder';
import { ReferenceCounter, getReferenceCounter as _getReferenceCounter } from './ReferenceCounter';
import { RepoMapFormatter } from './RepoMapFormatter';

/**
 * RepoMapGenerator - Main orchestrator for repository analysis
 */
export class RepoMapGenerator implements IRepoMapGenerator {
  /** TreeSitter parser instance */
  private parser: TreeSitterParser;

  /** Symbol extractor instance */
  private symbolExtractor: SymbolExtractor;

  /** Dependency graph builder instance */
  private dependencyBuilder: DependencyGraphBuilder;

  /** Reference counter instance */
  private referenceCounter: ReferenceCounter;

  /** Repository map formatter instance */
  private formatter: RepoMapFormatter;

  /** Current generated map */
  private currentMap: RepoMap | null = null;

  /** Whether the generator has been initialized */
  private initialized = false;

  /** Parse results cache for incremental updates */
  private parseResultsCache: Map<string, ParseResult> = new Map();

  /**
   * Create a new RepoMapGenerator
   * @param wasmBasePath - Optional base path for WASM files
   */
  constructor(wasmBasePath?: string) {
    this.parser = new TreeSitterParser(wasmBasePath);
    this.symbolExtractor = new SymbolExtractor();
    this.dependencyBuilder = new DependencyGraphBuilder();
    this.referenceCounter = new ReferenceCounter();
    this.formatter = new RepoMapFormatter();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the generator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.parser.initialize();
    this.initialized = true;
  }

  // ============================================================================
  // Main Generation Methods
  // ============================================================================

  /**
   * Generate a complete repository map
   * @param projectPath - Root project path
   * @param options - Generation options
   * @returns Complete repository map
   */
  async generate(
    projectPath: string,
    options?: RepoMapOptions
  ): Promise<RepoMap> {
    const startTime = Date.now();

    // Merge options with defaults
    const mergedOptions: Required<RepoMapOptions> = {
      ...DEFAULT_REPO_MAP_OPTIONS,
      ...options,
    };

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Normalize project path
    const normalizedProjectPath = this.normalizePath(resolve(projectPath));

    // Find files
    const files = await this.findFiles(normalizedProjectPath, mergedOptions);

    // Parse all files
    const parseResults = await this.parseAllFiles(
      files,
      mergedOptions.maxFiles
    );

    // Cache parse results
    this.parseResultsCache.clear();
    for (const result of parseResults) {
      this.parseResultsCache.set(this.normalizePath(result.file), result);
    }

    // Build file entries
    const fileEntries = await this.buildFileEntries(
      files.slice(0, mergedOptions.maxFiles),
      normalizedProjectPath,
      parseResults
    );

    // Merge symbols
    const symbols = this.symbolExtractor.mergeSymbols(parseResults);

    // Build dependency graph
    // Register common aliases
    this.dependencyBuilder.registerAlias('@/', 'src/');
    const dependencies = this.dependencyBuilder.build(
      parseResults,
      normalizedProjectPath
    );

    // Count references if enabled
    if (mergedOptions.countReferences) {
      this.referenceCounter.count(symbols, parseResults);
    }

    // Calculate statistics
    const generationTime = Date.now() - startTime;
    const stats = this.calculateStats(
      fileEntries,
      symbols,
      dependencies,
      generationTime
    );

    // Create and store the map
    this.currentMap = {
      projectPath: normalizedProjectPath,
      generatedAt: new Date(),
      files: fileEntries,
      symbols,
      dependencies,
      stats,
    };

    return this.currentMap;
  }

  /**
   * Generate incremental update for changed files
   * @param projectPath - Root project path
   * @param changedFiles - Files that changed
   * @returns Updated repository map
   */
  async generateIncremental(
    projectPath: string,
    changedFiles: string[]
  ): Promise<RepoMap> {
    // If no current map, do full generation
    if (!this.currentMap) {
      return this.generate(projectPath);
    }

    const startTime = Date.now();
    const normalizedProjectPath = this.normalizePath(resolve(projectPath));

    // Normalize changed file paths
    const normalizedChangedFiles = changedFiles.map((f) =>
      this.normalizePath(resolve(f))
    );

    // Re-parse only changed files
    const changedParseResults: ParseResult[] = [];
    for (const filePath of normalizedChangedFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = await this.parser.parseFile(filePath, content);
        changedParseResults.push(result);
        this.parseResultsCache.set(filePath, result);
      } catch {
        // File may have been deleted - remove from cache
        this.parseResultsCache.delete(filePath);
      }
    }

    // Get all parse results from cache
    const allParseResults = Array.from(this.parseResultsCache.values());

    // Update file entries for changed files
    const fileEntries = await this.buildFileEntries(
      Array.from(this.parseResultsCache.keys()),
      normalizedProjectPath,
      allParseResults
    );

    // Rebuild symbols (keep unchanged, update changed)
    const symbols = this.symbolExtractor.mergeSymbols(allParseResults);

    // Rebuild dependency graph (needed for accuracy)
    const dependencies = this.dependencyBuilder.build(
      allParseResults,
      normalizedProjectPath
    );

    // Recount references
    this.referenceCounter.count(symbols, allParseResults);

    // Update statistics
    const generationTime = Date.now() - startTime;
    const stats = this.calculateStats(
      fileEntries,
      symbols,
      dependencies,
      generationTime
    );

    // Update current map
    this.currentMap = {
      projectPath: normalizedProjectPath,
      generatedAt: new Date(),
      files: fileEntries,
      symbols,
      dependencies,
      stats,
    };

    return this.currentMap;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Find symbols by name
   * @param name - Symbol name to search
   * @returns Matching symbols
   */
  findSymbol(name: string): SymbolEntry[] {
    if (!this.currentMap) return [];
    return this.symbolExtractor.findByName(this.currentMap.symbols, name);
  }

  /**
   * Find usages of a symbol
   * @param symbolName - Symbol name
   * @returns Usage locations
   */
  findUsages(symbolName: string): SymbolUsage[] {
    if (!this.currentMap) return [];

    const usages: SymbolUsage[] = [];

    // Search through dependencies for imports of the symbol
    for (const edge of this.currentMap.dependencies) {
      if (edge.symbols.includes(symbolName)) {
        usages.push({
          file: edge.from,
          line: edge.line || 1,
          context: edge.statement || `import ${symbolName}`,
          usageType: 'import',
        });
      }
    }

    return usages;
  }

  /**
   * Find implementations of an interface
   * @param interfaceName - Interface name
   * @returns Implementing classes
   */
  findImplementations(interfaceName: string): SymbolEntry[] {
    if (!this.currentMap) return [];

    return this.currentMap.symbols.filter((symbol) => {
      if (symbol.kind !== 'class') return false;
      // Check if signature contains 'implements InterfaceName'
      return symbol.signature.includes(`implements ${interfaceName}`);
    });
  }

  /**
   * Get files imported by a file
   * @param file - File path
   * @returns Array of imported file paths
   */
  getDependencies(file: string): string[] {
    return this.dependencyBuilder.getDependencies(file);
  }

  /**
   * Get files that import a file
   * @param file - File path
   * @returns Array of importing file paths
   */
  getDependents(file: string): string[] {
    return this.dependencyBuilder.getDependents(file);
  }

  // ============================================================================
  // Formatting Methods
  // ============================================================================

  /**
   * Format map for context window
   * @param options - Format options
   * @returns Formatted string
   */
  formatForContext(options?: FormatOptions): string {
    if (!this.currentMap) {
      throw new Error('No repo map generated. Call generate() first.');
    }

    return this.formatter.format(this.currentMap, options);
  }

  /**
   * Get estimated token count for formatted output
   * @returns Token count
   */
  getTokenCount(): number {
    if (!this.currentMap) {
      return 0;
    }
    const formatted = this.formatter.format(this.currentMap);
    return this.formatter.estimateTokens(formatted);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Get current repository map
   * @returns Current map or null
   */
  getCurrentMap(): RepoMap | null {
    return this.currentMap;
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.currentMap = null;
    this.parseResultsCache.clear();
  }

  // ============================================================================
  // Private Helpers - File Discovery
  // ============================================================================

  /**
   * Find files matching patterns
   * @param projectPath - Project root
   * @param options - Generation options
   * @returns Array of absolute file paths
   */
  private async findFiles(
    projectPath: string,
    options: Required<RepoMapOptions>
  ): Promise<string[]> {
    const patterns = options.includePatterns.map((p) =>
      this.normalizePath(`${projectPath}/${p}`)
    );

    const ignorePatterns = options.excludePatterns.map((p) =>
      this.normalizePath(p)
    );

    const files = await fg(patterns, {
      ignore: ignorePatterns,
      onlyFiles: true,
      absolute: true,
      cwd: projectPath,
    });

    // Filter by language if specified
    if (options.languages.length > 0) {
      return files.filter((file) => {
        const lang = this.parser.detectLanguage(file);
        return lang !== null && options.languages.includes(lang);
      });
    }

    // Normalize all paths
    return files.map((f) => this.normalizePath(f));
  }

  /**
   * Parse all files and return results
   * @param files - File paths to parse
   * @param maxFiles - Maximum files to parse
   * @returns Array of parse results
   */
  private async parseAllFiles(
    files: string[],
    maxFiles: number
  ): Promise<ParseResult[]> {
    const filesToParse = files.slice(0, maxFiles);
    const results: ParseResult[] = [];

    for (const filePath of filesToParse) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const result = await this.parser.parseFile(filePath, content);
        results.push(result);
      } catch (error) {
        // Log error but continue with other files
        results.push({
          success: false,
          file: filePath,
          symbols: [],
          imports: [],
          exports: [],
          errors: [
            {
              message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
              line: 1,
              column: 0,
            },
          ],
          parseTime: 0,
        });
      }
    }

    return results;
  }

  /**
   * Build file entries with metadata
   * @param files - File paths
   * @param projectPath - Project root
   * @param parseResults - Parse results for symbol counts
   * @returns Array of file entries
   */
  private async buildFileEntries(
    files: string[],
    projectPath: string,
    parseResults: ParseResult[]
  ): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];

    // Build symbol count map
    const symbolCountMap = new Map<string, number>();
    for (const result of parseResults) {
      symbolCountMap.set(
        this.normalizePath(result.file),
        result.symbols.length
      );
    }

    for (const filePath of files) {
      try {
        const normalizedPath = this.normalizePath(filePath);
        const fileStat = await stat(filePath);
        const content = await readFile(filePath, 'utf-8');
        const lineCount = content.split('\n').length;
        const language = this.parser.detectLanguage(filePath);

        if (!language) continue;

        entries.push({
          path: normalizedPath,
          relativePath: this.normalizePath(relative(projectPath, filePath)),
          language,
          size: fileStat.size,
          lastModified: fileStat.mtime,
          symbolCount: symbolCountMap.get(normalizedPath) || 0,
          lineCount,
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return entries;
  }

  // ============================================================================
  // Private Helpers - Statistics
  // ============================================================================

  /**
   * Calculate repository map statistics
   */
  private calculateStats(
    files: FileEntry[],
    symbols: SymbolEntry[],
    dependencies: DependencyEdge[],
    generationTime: number
  ): RepoMapStats {
    // Language breakdown
    const languageBreakdown: Record<SupportedLanguage, number> = {
      typescript: 0,
      javascript: 0,
    };
    for (const file of files) {
      languageBreakdown[file.language]++;
    }

    // Symbol breakdown
    const symbolBreakdown: Record<SymbolKind, number> = {
      class: 0,
      interface: 0,
      function: 0,
      method: 0,
      property: 0,
      variable: 0,
      constant: 0,
      type: 0,
      enum: 0,
      enum_member: 0,
      namespace: 0,
      module: 0,
    };
    for (const symbol of symbols) {
      symbolBreakdown[symbol.kind]++;
    }

    // Largest files
    const sortedBySize = [...files].sort((a, b) => b.size - a.size);
    const largestFiles = sortedBySize.slice(0, 10).map((f) => f.relativePath);

    // Most referenced symbols
    const sortedByRefs = [...symbols]
      .filter((s) => s.references > 0)
      .sort((a, b) => b.references - a.references);
    const mostReferencedSymbols = sortedByRefs.slice(0, 10).map((s) => ({
      name: s.name,
      file: s.file,
      references: s.references,
    }));

    // Most connected files
    const mostConnectedFiles = this.dependencyBuilder
      .getSortedByConnections()
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown,
      symbolBreakdown,
      largestFiles,
      mostReferencedSymbols,
      mostConnectedFiles,
      generationTime,
    };
  }

  /**
   * Normalize file path for consistent comparisons
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonGenerator: RepoMapGenerator | null = null;

/**
 * Get singleton RepoMapGenerator instance
 * @param wasmBasePath - Optional WASM base path
 */
export function getRepoMapGenerator(wasmBasePath?: string): RepoMapGenerator {
  if (!singletonGenerator) {
    singletonGenerator = new RepoMapGenerator(wasmBasePath);
  }
  return singletonGenerator;
}

/**
 * Reset singleton (for testing)
 */
export function resetRepoMapGenerator(): void {
  singletonGenerator = null;
}
