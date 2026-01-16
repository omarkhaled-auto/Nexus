/**
 * SymbolExtractor - Utility class for processing, filtering, grouping, and analyzing symbols
 *
 * Provides utilities for working with extracted symbols from the TreeSitterParser,
 * including filtering, grouping, searching, hierarchy building, and statistics.
 *
 * @module infrastructure/analysis/SymbolExtractor
 */

import type {
  SymbolEntry,
  SymbolKind,
  SymbolNode,
  SymbolStatistics,
  ParseResult,
} from './types';

/**
 * Sort criteria for symbols
 */
export type SymbolSortCriteria = 'name' | 'file' | 'references' | 'line';

/**
 * SymbolExtractor - Utility class for symbol processing and analysis
 */
export class SymbolExtractor {
  // ============================================================================
  // Processing Methods
  // ============================================================================

  /**
   * Process symbols from multiple parse results into a Map
   * @param parseResults - Array of parse results
   * @returns Map keyed by unique symbol ID
   */
  processSymbols(parseResults: ParseResult[]): Map<string, SymbolEntry> {
    const symbolMap = new Map<string, SymbolEntry>();

    for (const result of parseResults) {
      for (const symbol of result.symbols) {
        const key = this.createSymbolKey(symbol);
        symbolMap.set(key, symbol);
      }
    }

    return symbolMap;
  }

  /**
   * Create a unique key for a symbol
   * @param symbol - Symbol entry
   * @returns Unique key string
   */
  createSymbolKey(symbol: SymbolEntry): string {
    return `${symbol.file}#${symbol.name}#${symbol.line}`;
  }

  // ============================================================================
  // Filtering Methods
  // ============================================================================

  /**
   * Filter symbols by kind
   * @param symbols - Array of symbols
   * @param kind - Symbol kind to filter by
   * @returns Filtered symbols
   */
  filterByKind(symbols: SymbolEntry[], kind: SymbolKind): SymbolEntry[] {
    return symbols.filter((s) => s.kind === kind);
  }

  /**
   * Get only exported symbols
   * @param symbols - Array of symbols
   * @returns Exported symbols only
   */
  getExportedSymbols(symbols: SymbolEntry[]): SymbolEntry[] {
    return symbols.filter((s) => s.exported);
  }

  /**
   * Get top-level symbols (no parent)
   * @param symbols - Array of symbols
   * @returns Top-level symbols
   */
  getTopLevelSymbols(symbols: SymbolEntry[]): SymbolEntry[] {
    return symbols.filter((s) => !s.parentId);
  }

  /**
   * Get child symbols of a parent
   * @param symbols - Array of symbols
   * @param parentId - Parent symbol ID
   * @returns Child symbols
   */
  getChildSymbols(symbols: SymbolEntry[], parentId: string): SymbolEntry[] {
    return symbols.filter((s) => s.parentId === parentId);
  }

  // ============================================================================
  // Hierarchy Methods
  // ============================================================================

  /**
   * Build a hierarchy tree from flat symbol list
   * @param symbols - Array of symbols
   * @returns Tree structure of symbols
   */
  buildHierarchy(symbols: SymbolEntry[]): SymbolNode[] {
    const symbolMap = new Map<string, SymbolEntry>();
    const childrenMap = new Map<string, SymbolEntry[]>();

    // Index all symbols
    for (const symbol of symbols) {
      symbolMap.set(symbol.id, symbol);
      if (symbol.parentId) {
        const children = childrenMap.get(symbol.parentId) || [];
        children.push(symbol);
        childrenMap.set(symbol.parentId, children);
      }
    }

    // Build tree recursively
    const buildNode = (symbol: SymbolEntry): SymbolNode => {
      const children = childrenMap.get(symbol.id) || [];
      return {
        symbol,
        children: children.map(buildNode),
      };
    };

    // Start with top-level symbols
    const topLevel = symbols.filter((s) => !s.parentId);
    return topLevel.map(buildNode);
  }

  // ============================================================================
  // Grouping Methods
  // ============================================================================

  /**
   * Group symbols by file path
   * @param symbols - Array of symbols
   * @returns Map grouped by file
   */
  groupByFile(symbols: SymbolEntry[]): Map<string, SymbolEntry[]> {
    const groups = new Map<string, SymbolEntry[]>();

    for (const symbol of symbols) {
      const existing = groups.get(symbol.file) || [];
      existing.push(symbol);
      groups.set(symbol.file, existing);
    }

    return groups;
  }

  /**
   * Group symbols by kind
   * @param symbols - Array of symbols
   * @returns Map grouped by kind
   */
  groupByKind(symbols: SymbolEntry[]): Map<SymbolKind, SymbolEntry[]> {
    const groups = new Map<SymbolKind, SymbolEntry[]>();

    for (const symbol of symbols) {
      const existing = groups.get(symbol.kind) || [];
      existing.push(symbol);
      groups.set(symbol.kind, existing);
    }

    return groups;
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  /**
   * Search symbols by name (case-insensitive partial match)
   * @param symbols - Array of symbols
   * @param query - Search query
   * @returns Matching symbols
   */
  searchByName(symbols: SymbolEntry[], query: string): SymbolEntry[] {
    const lowerQuery = query.toLowerCase();
    return symbols.filter((s) => s.name.toLowerCase().includes(lowerQuery));
  }

  /**
   * Find symbols by exact name match
   * @param symbols - Array of symbols
   * @param name - Exact name to match
   * @returns Matching symbols (may be multiple across files)
   */
  findByName(symbols: SymbolEntry[], name: string): SymbolEntry[] {
    return symbols.filter((s) => s.name === name);
  }

  /**
   * Find symbol at specific file and line location
   * @param symbols - Array of symbols
   * @param file - File path
   * @param line - Line number
   * @returns Symbol at location or undefined
   */
  findAtLocation(
    symbols: SymbolEntry[],
    file: string,
    line: number
  ): SymbolEntry | undefined {
    return symbols.find(
      (s) => s.file === file && line >= s.line && line <= s.endLine
    );
  }

  // ============================================================================
  // Statistics Methods
  // ============================================================================

  /**
   * Get statistics about symbols
   * @param symbols - Array of symbols
   * @returns Symbol statistics
   */
  getStatistics(symbols: SymbolEntry[]): SymbolStatistics {
    const byKind: Record<SymbolKind, number> = {
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

    const byFile: Record<string, number> = {};
    let exported = 0;
    let documented = 0;

    for (const symbol of symbols) {
      // Count by kind
      byKind[symbol.kind]++;

      // Count by file
      byFile[symbol.file] = (byFile[symbol.file] || 0) + 1;

      // Count exported
      if (symbol.exported) {
        exported++;
      }

      // Count documented
      if (symbol.documentation) {
        documented++;
      }
    }

    const total = symbols.length;
    const documentationCoverage = total > 0 ? documented / total : 0;

    return {
      total,
      byKind,
      byFile,
      exported,
      documented,
      documentationCoverage,
    };
  }

  // ============================================================================
  // Sorting Methods
  // ============================================================================

  /**
   * Sort symbols by specified criteria
   * @param symbols - Array of symbols
   * @param criteria - Sort criteria
   * @returns New sorted array
   */
  sortSymbols(
    symbols: SymbolEntry[],
    criteria: SymbolSortCriteria
  ): SymbolEntry[] {
    const sorted = [...symbols];

    switch (criteria) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'file':
        sorted.sort((a, b) => {
          const fileCompare = a.file.localeCompare(b.file);
          if (fileCompare !== 0) return fileCompare;
          return a.line - b.line;
        });
        break;
      case 'references':
        sorted.sort((a, b) => b.references - a.references);
        break;
      case 'line':
        sorted.sort((a, b) => {
          const fileCompare = a.file.localeCompare(b.file);
          if (fileCompare !== 0) return fileCompare;
          return a.line - b.line;
        });
        break;
    }

    return sorted;
  }

  // ============================================================================
  // Deduplication Methods
  // ============================================================================

  /**
   * Remove duplicate symbols based on symbol key
   * @param symbols - Array of symbols
   * @returns Deduplicated array
   */
  deduplicate(symbols: SymbolEntry[]): SymbolEntry[] {
    const seen = new Set<string>();
    const result: SymbolEntry[] = [];

    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(symbol);
      }
    }

    return result;
  }

  /**
   * Merge symbols from multiple parse results
   * @param parseResults - Array of parse results
   * @returns Merged and deduplicated symbols
   */
  mergeSymbols(parseResults: ParseResult[]): SymbolEntry[] {
    const allSymbols: SymbolEntry[] = [];

    for (const result of parseResults) {
      allSymbols.push(...result.symbols);
    }

    return this.deduplicate(allSymbols);
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonExtractor: SymbolExtractor | null = null;

/**
 * Get singleton SymbolExtractor instance
 */
export function getSymbolExtractor(): SymbolExtractor {
  if (!singletonExtractor) {
    singletonExtractor = new SymbolExtractor();
  }
  return singletonExtractor;
}

/**
 * Reset singleton (for testing)
 */
export function resetSymbolExtractor(): void {
  singletonExtractor = null;
}
