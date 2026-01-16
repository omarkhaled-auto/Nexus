/**
 * ReferenceCounter - Counts symbol references and calculates importance scores
 *
 * Counts how many times each symbol is referenced across the codebase and
 * calculates importance scores using a PageRank-style algorithm.
 *
 * @module infrastructure/analysis/ReferenceCounter
 */

import type {
  IReferenceCounter,
  SymbolEntry,
  ParseResult,
  DependencyEdge,
  RankedSymbol,
  ReferenceStatistics,
} from './types';

/**
 * ReferenceCounter - Counts references and calculates importance
 */
export class ReferenceCounter implements IReferenceCounter {
  /** Map of symbol key to reference count */
  private referenceCounts: Map<string, number> = new Map();

  /** Map of symbol key to importance score */
  private importanceScores: Map<string, number> = new Map();

  /** Index of symbol name -> symbol entries for fast lookup */
  private symbolIndex: Map<string, SymbolEntry[]> = new Map();

  /** Stored symbols for later queries */
  private symbols: SymbolEntry[] = [];

  // ============================================================================
  // Main Counting Method
  // ============================================================================

  /**
   * Count references to symbols from imports
   * @param symbols - All symbols in the codebase
   * @param parseResults - Parse results with import information
   * @returns Map of symbol key to reference count
   */
  count(
    symbols: SymbolEntry[],
    parseResults: ParseResult[]
  ): Map<string, number> {
    // Reset state
    this.referenceCounts.clear();
    this.symbolIndex.clear();
    this.symbols = symbols;

    // Build symbol index for fast lookup by name
    for (const symbol of symbols) {
      const existing = this.symbolIndex.get(symbol.name) || [];
      existing.push(symbol);
      this.symbolIndex.set(symbol.name, existing);

      // Initialize reference count
      const key = this.createSymbolKey(symbol);
      this.referenceCounts.set(key, 0);
    }

    // Count references from imports in each file
    for (const result of parseResults) {
      for (const imp of result.imports) {
        // Count each imported symbol
        for (const importedSymbol of imp.symbols) {
          const symbolName = importedSymbol.imported || importedSymbol.local;
          this.incrementReferenceCount(symbolName, result.file);
        }
      }
    }

    // Update symbol.references field
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      symbol.references = this.referenceCounts.get(key) || 0;
    }

    return new Map(this.referenceCounts);
  }

  // ============================================================================
  // Top Referenced Query
  // ============================================================================

  /**
   * Get top N most referenced symbols
   * @param n - Number of symbols to return
   * @returns Array of symbols sorted by reference count descending
   */
  getTopReferenced(n: number): SymbolEntry[] {
    // Sort symbols by reference count
    const sorted = [...this.symbols].sort((a, b) => {
      const aCount = this.getReferenceCount(a);
      const bCount = this.getReferenceCount(b);
      return bCount - aCount;
    });

    return sorted.slice(0, n);
  }

  // ============================================================================
  // Importance Calculation
  // ============================================================================

  /**
   * Calculate importance scores using PageRank-style algorithm
   * Symbols referenced by important files are more important
   * @param symbols - All symbols
   * @param dependencies - Dependency edges
   * @returns Map of symbol key to importance score (0-1)
   */
  calculateImportance(
    symbols: SymbolEntry[],
    dependencies: DependencyEdge[]
  ): Map<string, number> {
    this.importanceScores.clear();

    if (symbols.length === 0) {
      return new Map();
    }

    // Build file importance map based on how many other files depend on them
    const fileImportance = this.calculateFileImportance(dependencies);

    // Initialize all symbols with equal importance
    const initialScore = 1 / symbols.length;
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      this.importanceScores.set(key, initialScore);
    }

    // Damping factor for PageRank
    const dampingFactor = 0.85;
    const iterations = 20;

    // Build reverse index: which symbols are referenced by which files
    const symbolReferencers = this.buildSymbolReferencers(symbols, dependencies);

    // Iterate to converge
    for (let i = 0; i < iterations; i++) {
      const newScores = new Map<string, number>();

      for (const symbol of symbols) {
        const key = this.createSymbolKey(symbol);
        const referencers = symbolReferencers.get(key) || [];

        // Calculate incoming importance from referencing files
        let incomingScore = 0;
        for (const refFile of referencers) {
          const fileScore = fileImportance.get(refFile) || 0;
          // Distribute file's importance among symbols it references
          const outgoingRefs = this.countOutgoingReferences(refFile, dependencies);
          if (outgoingRefs > 0) {
            incomingScore += fileScore / outgoingRefs;
          }
        }

        // Apply PageRank formula
        const baseScore = (1 - dampingFactor) / symbols.length;
        const newScore = baseScore + dampingFactor * incomingScore;
        newScores.set(key, newScore);
      }

      // Update scores
      for (const [key, score] of newScores) {
        this.importanceScores.set(key, score);
      }
    }

    // Normalize scores to 0-1 range
    this.normalizeScores();

    return new Map(this.importanceScores);
  }

  // ============================================================================
  // Ranked Symbols
  // ============================================================================

  /**
   * Get symbols with combined ranking from references and importance
   * @param symbols - All symbols
   * @param dependencies - Dependency edges
   * @returns Array of ranked symbols sorted by combined score
   */
  getRankedSymbols(
    symbols: SymbolEntry[],
    dependencies: DependencyEdge[]
  ): RankedSymbol[] {
    // Ensure counts are calculated
    if (this.symbols.length === 0 || this.symbols !== symbols) {
      // If count() wasn't called with these symbols, we need to count
      this.count(symbols, []);
    }

    // Calculate importance
    this.calculateImportance(symbols, dependencies);

    // Get max reference count for normalization
    const maxRefs = Math.max(
      1,
      ...symbols.map((s) => this.getReferenceCount(s))
    );

    // Build ranked symbols
    const ranked: RankedSymbol[] = symbols.map((symbol) => {
      const key = this.createSymbolKey(symbol);
      const referenceCount = this.referenceCounts.get(key) || 0;
      const importanceScore = this.importanceScores.get(key) || 0;

      // Normalize reference count to 0-1
      const normalizedRefs = referenceCount / maxRefs;

      // Combined score: 60% references, 40% importance
      const combinedScore = 0.6 * normalizedRefs + 0.4 * importanceScore;

      return {
        symbol,
        referenceCount,
        importanceScore,
        combinedScore,
      };
    });

    // Sort by combined score descending
    ranked.sort((a, b) => b.combinedScore - a.combinedScore);

    return ranked;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get files that reference a symbol
   * @param symbolKey - Symbol key
   * @param dependencies - Dependency edges
   * @returns List of file paths that reference this symbol
   */
  getReferencingSources(
    symbolKey: string,
    dependencies: DependencyEdge[]
  ): string[] {
    const sources: Set<string> = new Set();

    // Parse symbol key to get symbol name
    const parts = symbolKey.split('#');
    const symbolName = parts.length >= 2 ? (parts[1] as string) : symbolKey;

    // Find edges that import this symbol
    for (const edge of dependencies) {
      if (edge.symbols.includes(symbolName)) {
        sources.add(edge.from);
      }
    }

    return Array.from(sources);
  }

  /**
   * Calculate clustering coefficient for a symbol
   * How interconnected are the files that reference this symbol?
   * @param symbol - Symbol to analyze
   * @param dependencies - Dependency edges
   * @returns Clustering coefficient (0-1)
   */
  getClusteringCoefficient(
    symbol: SymbolEntry,
    dependencies: DependencyEdge[]
  ): number {
    const key = this.createSymbolKey(symbol);
    const referencers = this.getReferencingSources(key, dependencies);

    if (referencers.length < 2) {
      return 0;
    }

    // Count connections between referencing files
    let connections = 0;
    const maxConnections = (referencers.length * (referencers.length - 1)) / 2;

    for (let i = 0; i < referencers.length; i++) {
      for (let j = i + 1; j < referencers.length; j++) {
        // Check if file i and file j have any dependency relationship
        const hasConnection = dependencies.some(
          (e) =>
            (e.from === referencers[i] && e.to === referencers[j]) ||
            (e.from === referencers[j] && e.to === referencers[i])
        );
        if (hasConnection) {
          connections++;
        }
      }
    }

    return maxConnections > 0 ? connections / maxConnections : 0;
  }

  /**
   * Get reference count for a symbol
   * @param symbol - Symbol to check
   * @returns Reference count
   */
  getReferenceCount(symbol: SymbolEntry): number {
    const key = this.createSymbolKey(symbol);
    return this.referenceCounts.get(key) || 0;
  }

  /**
   * Get importance score for a symbol
   * @param symbol - Symbol to check
   * @returns Importance score (0-1)
   */
  getImportanceScore(symbol: SymbolEntry): number {
    const key = this.createSymbolKey(symbol);
    return this.importanceScores.get(key) || 0;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get statistics about references
   * @param symbols - Symbols to analyze
   * @returns Reference statistics
   */
  getStatistics(symbols: SymbolEntry[]): ReferenceStatistics {
    if (symbols.length === 0) {
      return {
        totalReferences: 0,
        averageReferences: 0,
        maxReferences: 0,
        symbolsWithReferences: 0,
        orphanedExports: 0,
        coveragePercent: 0,
      };
    }

    let totalReferences = 0;
    let maxReferences = 0;
    let symbolsWithReferences = 0;
    let orphanedExports = 0;

    for (const symbol of symbols) {
      const refs = this.getReferenceCount(symbol);
      totalReferences += refs;
      maxReferences = Math.max(maxReferences, refs);

      if (refs > 0) {
        symbolsWithReferences++;
      }

      // Orphaned export: exported but never referenced
      if (symbol.exported && refs === 0) {
        orphanedExports++;
      }
    }

    const averageReferences = totalReferences / symbols.length;
    const coveragePercent = (symbolsWithReferences / symbols.length) * 100;

    return {
      totalReferences,
      averageReferences,
      maxReferences,
      symbolsWithReferences,
      orphanedExports,
      coveragePercent,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Create unique key for a symbol
   */
  private createSymbolKey(symbol: SymbolEntry): string {
    return `${symbol.file}#${symbol.name}#${symbol.line}`;
  }

  /**
   * Increment reference count for a symbol by name
   */
  private incrementReferenceCount(symbolName: string, _fromFile: string): void {
    const matchingSymbols = this.symbolIndex.get(symbolName);
    if (!matchingSymbols) return;

    // Increment count for all matching exported symbols
    for (const symbol of matchingSymbols) {
      if (symbol.exported) {
        const key = this.createSymbolKey(symbol);
        const current = this.referenceCounts.get(key) || 0;
        this.referenceCounts.set(key, current + 1);
      }
    }
  }

  /**
   * Calculate importance of each file based on how many files depend on it
   */
  private calculateFileImportance(
    dependencies: DependencyEdge[]
  ): Map<string, number> {
    const fileCounts = new Map<string, number>();

    // Count how many files import each file
    for (const edge of dependencies) {
      const current = fileCounts.get(edge.to) || 0;
      fileCounts.set(edge.to, current + 1);
    }

    // Normalize to 0-1
    const maxCount = Math.max(1, ...Array.from(fileCounts.values()));
    const normalized = new Map<string, number>();

    for (const [file, count] of fileCounts) {
      normalized.set(file, count / maxCount);
    }

    return normalized;
  }

  /**
   * Build a map of symbol key -> files that reference that symbol
   */
  private buildSymbolReferencers(
    symbols: SymbolEntry[],
    dependencies: DependencyEdge[]
  ): Map<string, string[]> {
    const referencers = new Map<string, string[]>();

    // Initialize empty arrays
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      referencers.set(key, []);
    }

    // Find which files reference which symbols
    for (const edge of dependencies) {
      for (const importedName of edge.symbols) {
        // Find symbols with this name
        const matchingSymbols = this.symbolIndex.get(importedName);
        if (!matchingSymbols) continue;

        for (const symbol of matchingSymbols) {
          if (symbol.exported) {
            const key = this.createSymbolKey(symbol);
            const refs = referencers.get(key) || [];
            if (!refs.includes(edge.from)) {
              refs.push(edge.from);
              referencers.set(key, refs);
            }
          }
        }
      }
    }

    return referencers;
  }

  /**
   * Count how many symbols a file references (outgoing edges)
   */
  private countOutgoingReferences(
    filePath: string,
    dependencies: DependencyEdge[]
  ): number {
    let count = 0;
    for (const edge of dependencies) {
      if (edge.from === filePath) {
        count += edge.symbols.length;
      }
    }
    return count;
  }

  /**
   * Normalize importance scores to 0-1 range
   */
  private normalizeScores(): void {
    const scores = Array.from(this.importanceScores.values());
    if (scores.length === 0) return;

    const maxScore = Math.max(...scores);
    if (maxScore === 0) return;

    for (const [key, score] of this.importanceScores) {
      this.importanceScores.set(key, score / maxScore);
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonCounter: ReferenceCounter | null = null;

/**
 * Get singleton ReferenceCounter instance
 */
export function getReferenceCounter(): ReferenceCounter {
  if (!singletonCounter) {
    singletonCounter = new ReferenceCounter();
  }
  return singletonCounter;
}

/**
 * Reset singleton (for testing)
 */
export function resetReferenceCounter(): void {
  singletonCounter = null;
}
