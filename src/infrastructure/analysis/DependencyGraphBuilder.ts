/**
 * DependencyGraphBuilder - Builds dependency graph from import/export relationships
 *
 * Processes parse results to create a graph of file dependencies,
 * supporting path resolution, alias handling, and cycle detection.
 *
 * @module infrastructure/analysis/DependencyGraphBuilder
 */

import { extname } from 'path';
import { posix } from 'path';
import type {
  IDependencyGraphBuilder,
  ParseResult,
  DependencyEdge,
  DependencyType,
  ImportStatement,
  ExportStatement,
  DependencyGraphStats,
} from './types';

/**
 * DependencyGraphBuilder - Builds and analyzes dependency graphs
 */
export class DependencyGraphBuilder implements IDependencyGraphBuilder {
  /** All dependency edges */
  private edges: DependencyEdge[] = [];

  /** Map of file -> files that depend on it */
  private dependentsMap: Map<string, Set<string>> = new Map();

  /** Map of file -> files it depends on */
  private dependenciesMap: Map<string, Set<string>> = new Map();

  /** Path aliases for resolution (e.g., "@/" -> "src/") */
  private fileAliases: Map<string, string> = new Map();

  /** All known file paths (for resolution) */
  private knownFiles: Set<string> = new Set();

  // ============================================================================
  // Main Build Method
  // ============================================================================

  /**
   * Build dependency graph from parse results
   * @param parseResults - Results from parsing files
   * @param projectPath - Root project path for resolution
   * @returns Array of dependency edges
   */
  build(parseResults: ParseResult[], projectPath: string): DependencyEdge[] {
    // Reset internal state
    this.edges = [];
    this.dependentsMap.clear();
    this.dependenciesMap.clear();
    this.knownFiles.clear();

    // Collect all file paths for resolution
    for (const result of parseResults) {
      const normalizedPath = this.normalizePath(result.file);
      this.knownFiles.add(normalizedPath);
    }

    // Process each file's imports and exports
    for (const result of parseResults) {
      const fromFile = this.normalizePath(result.file);

      // Process imports
      for (const imp of result.imports) {
        const edge = this.createEdgeFromImport(imp, fromFile, projectPath);
        if (edge) {
          this.addEdge(edge);
        }
      }

      // Process re-exports
      for (const exp of result.exports) {
        if (exp.source) {
          const edge = this.createEdgeFromExport(exp, fromFile, projectPath);
          if (edge) {
            this.addEdge(edge);
          }
        }
      }
    }

    return this.edges;
  }

  // ============================================================================
  // Path Resolution
  // ============================================================================

  /**
   * Resolve an import path to an absolute file path
   * @param importPath - The import source path
   * @param fromFile - File containing the import
   * @param projectPath - Project root path
   * @returns Resolved absolute path or null if external/not found
   */
  resolveImport(
    importPath: string,
    fromFile: string,
    projectPath: string
  ): string | null {
    // Skip external modules
    if (this.isExternalModule(importPath)) {
      return null;
    }

    // Normalize all paths to use forward slashes
    const normalizedFromFile = this.normalizePath(fromFile);
    const normalizedProjectPath = this.normalizePath(projectPath);

    let resolvedPath: string;

    // Handle path aliases
    for (const [alias, target] of this.fileAliases) {
      if (importPath.startsWith(alias)) {
        const remainder = importPath.slice(alias.length);
        const targetPath = posix.join(normalizedProjectPath, target, remainder);
        const resolved = this.tryResolveFile(targetPath);
        if (resolved) {
          return resolved;
        }
      }
    }

    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = posix.dirname(normalizedFromFile);
      resolvedPath = posix.resolve(fromDir, importPath);
    } else {
      // Could be an absolute path or unaliased path from project root
      resolvedPath = posix.resolve(normalizedProjectPath, importPath);
    }

    // Try to resolve the file
    return this.tryResolveFile(resolvedPath);
  }

  /**
   * Try to resolve a file path, checking extensions and index files
   * @param basePath - Base path without extension
   * @returns Resolved path or null
   */
  private tryResolveFile(basePath: string): string | null {
    // Normalize the base path to use forward slashes
    const normalizedBase = this.normalizePath(basePath);

    // Check if exact path exists
    if (this.knownFiles.has(normalizedBase)) {
      return normalizedBase;
    }

    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];
    for (const ext of extensions) {
      const withExt = normalizedBase + ext;
      if (this.knownFiles.has(withExt)) {
        return withExt;
      }
    }

    // Try index files
    const indexExtensions = [
      '/index.ts',
      '/index.tsx',
      '/index.js',
      '/index.jsx',
    ];
    for (const indexExt of indexExtensions) {
      const withIndex = normalizedBase + indexExt;
      if (this.knownFiles.has(withIndex)) {
        return withIndex;
      }
    }

    return null;
  }

  /**
   * Check if module is external (npm package)
   * @param source - Import source
   * @returns True if external module
   */
  private isExternalModule(source: string): boolean {
    // Relative paths are not external
    if (source.startsWith('.') || source.startsWith('/')) {
      return false;
    }

    // Check if it matches any registered alias
    for (const alias of this.fileAliases.keys()) {
      if (source.startsWith(alias)) {
        return false;
      }
    }

    // Scoped packages (@scope/package) are external
    // But @/ is typically an alias (handled above)
    if (source.startsWith('@')) {
      // @/ by itself (if not registered as alias) could be alias pattern
      if (source.startsWith('@/')) {
        return false; // Likely an alias, let resolution handle it
      }
      // @scope/package is external
      return true;
    }

    // All other non-relative paths are external
    return true;
  }

  // ============================================================================
  // Alias Management
  // ============================================================================

  /**
   * Register a path alias for resolution
   * @param alias - Alias pattern (e.g., "@/")
   * @param target - Target path (e.g., "src/")
   */
  registerAlias(alias: string, target: string): void {
    this.fileAliases.set(alias, target);
  }

  /**
   * Clear all registered aliases
   */
  clearAliases(): void {
    this.fileAliases.clear();
  }

  // ============================================================================
  // Graph Queries
  // ============================================================================

  /**
   * Get files that import the given file
   * @param filePath - File to check
   * @returns Array of importing file paths
   */
  getDependents(filePath: string): string[] {
    const normalized = this.normalizePath(filePath);
    const dependents = this.dependentsMap.get(normalized);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get files imported by the given file
   * @param filePath - File to check
   * @returns Array of imported file paths
   */
  getDependencies(filePath: string): string[] {
    const normalized = this.normalizePath(filePath);
    const dependencies = this.dependenciesMap.get(normalized);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Get all edges involving a file (both in and out)
   * @param filePath - File to check
   * @returns All edges involving the file
   */
  getEdgesForFile(filePath: string): DependencyEdge[] {
    const normalized = this.normalizePath(filePath);
    return this.edges.filter(
      (e) => e.from === normalized || e.to === normalized
    );
  }

  /**
   * Get all edges in the graph
   * @returns All dependency edges
   */
  getAllEdges(): DependencyEdge[] {
    return [...this.edges];
  }

  // ============================================================================
  // Cycle Detection
  // ============================================================================

  /**
   * Find circular dependencies in the graph
   * @returns Array of cycles (each cycle is array of file paths)
   */
  findCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      if (recursionStack.has(node)) {
        // Found a cycle - extract it from the path
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(node); // Complete the cycle
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.dependenciesMap.get(node);
      if (dependencies) {
        for (const dep of dependencies) {
          dfs(dep);
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    // Run DFS from each unvisited node
    for (const file of this.knownFiles) {
      if (!visited.has(file)) {
        dfs(file);
      }
    }

    return cycles;
  }

  // ============================================================================
  // Analysis Methods
  // ============================================================================

  /**
   * Get files sorted by total connection count
   * @returns Files sorted by most connected first
   */
  getSortedByConnections(): Array<{ file: string; connections: number }> {
    const connectionCounts = new Map<string, number>();

    for (const file of this.knownFiles) {
      const dependents = this.dependentsMap.get(file)?.size || 0;
      const dependencies = this.dependenciesMap.get(file)?.size || 0;
      connectionCounts.set(file, dependents + dependencies);
    }

    return Array.from(connectionCounts.entries())
      .map(([file, connections]) => ({ file, connections }))
      .sort((a, b) => b.connections - a.connections);
  }

  /**
   * Calculate the depth of dependencies from a file
   * @param filePath - Starting file
   * @returns Maximum depth of dependency chain
   */
  calculateDepth(filePath: string): number {
    const normalized = this.normalizePath(filePath);
    const visited = new Set<string>();

    const dfs = (node: string, depth: number): number => {
      if (visited.has(node)) {
        return depth;
      }
      visited.add(node);

      const dependencies = this.dependenciesMap.get(node);
      if (!dependencies || dependencies.size === 0) {
        return depth;
      }

      let maxDepth = depth;
      for (const dep of dependencies) {
        const depDepth = dfs(dep, depth + 1);
        maxDepth = Math.max(maxDepth, depDepth);
      }

      return maxDepth;
    };

    return dfs(normalized, 0);
  }

  /**
   * Get statistics about the dependency graph
   * @returns Dependency graph statistics
   */
  getStatistics(): DependencyGraphStats {
    const edgesByType: Record<DependencyType, number> = {
      import: 0,
      require: 0,
      dynamic: 0,
      export_from: 0,
      type_import: 0,
      side_effect: 0,
    };

    for (const edge of this.edges) {
      edgesByType[edge.type]++;
    }

    const circularDependencies = this.findCircularDependencies().length;
    const mostConnectedFiles = this.getSortedByConnections().slice(0, 10);

    return {
      totalFiles: this.knownFiles.size,
      totalEdges: this.edges.length,
      edgesByType,
      circularDependencies,
      mostConnectedFiles,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Create a dependency edge from an import statement
   */
  private createEdgeFromImport(
    imp: ImportStatement,
    fromFile: string,
    projectPath: string
  ): DependencyEdge | null {
    const resolved = this.resolveImport(imp.source, fromFile, projectPath);
    if (!resolved) {
      return null;
    }

    let type: DependencyType;
    switch (imp.type) {
      case 'require':
        type = 'require';
        break;
      case 'dynamic':
        type = 'dynamic';
        break;
      case 'side_effect':
        type = 'side_effect';
        break;
      default:
        type = imp.typeOnly ? 'type_import' : 'import';
    }

    return {
      from: fromFile,
      to: resolved,
      type,
      symbols: imp.symbols.map((s) => s.local),
      statement: this.buildStatementString(imp),
      line: imp.line,
    };
  }

  /**
   * Create a dependency edge from a re-export statement
   */
  private createEdgeFromExport(
    exp: ExportStatement,
    fromFile: string,
    projectPath: string
  ): DependencyEdge | null {
    if (!exp.source) {
      return null;
    }

    const resolved = this.resolveImport(exp.source, fromFile, projectPath);
    if (!resolved) {
      return null;
    }

    return {
      from: fromFile,
      to: resolved,
      type: 'export_from',
      symbols: exp.symbols.map((s) => s.local),
      statement: `export from '${exp.source}'`,
      line: exp.line,
    };
  }

  /**
   * Add an edge to the graph and update maps
   */
  private addEdge(edge: DependencyEdge): void {
    this.edges.push(edge);

    // Update dependents map (who imports this file)
    if (!this.dependentsMap.has(edge.to)) {
      this.dependentsMap.set(edge.to, new Set());
    }
    this.dependentsMap.get(edge.to)!.add(edge.from);

    // Update dependencies map (what does this file import)
    if (!this.dependenciesMap.has(edge.from)) {
      this.dependenciesMap.set(edge.from, new Set());
    }
    this.dependenciesMap.get(edge.from)!.add(edge.to);
  }

  /**
   * Build a statement string from an import
   */
  private buildStatementString(imp: ImportStatement): string {
    switch (imp.type) {
      case 'default':
        return `import ${imp.symbols[0]?.local || ''} from '${imp.source}'`;
      case 'namespace':
        return `import * as ${imp.symbols[0]?.local || ''} from '${imp.source}'`;
      case 'named': {
        const syms = imp.symbols
          .map((s) =>
            s.imported && s.imported !== s.local
              ? `${s.imported} as ${s.local}`
              : s.local
          )
          .join(', ');
        return `import { ${syms} } from '${imp.source}'`;
      }
      case 'side_effect':
        return `import '${imp.source}'`;
      case 'require':
        return `require('${imp.source}')`;
      case 'dynamic':
        return `import('${imp.source}')`;
      default:
        return `import from '${imp.source}'`;
    }
  }

  /**
   * Normalize a file path for consistent comparisons
   * Always uses forward slashes for cross-platform consistency
   */
  private normalizePath(filePath: string): string {
    // Convert backslashes to forward slashes
    return filePath.replace(/\\/g, '/');
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonBuilder: DependencyGraphBuilder | null = null;

/**
 * Get singleton DependencyGraphBuilder instance
 */
export function getDependencyGraphBuilder(): DependencyGraphBuilder {
  if (!singletonBuilder) {
    singletonBuilder = new DependencyGraphBuilder();
  }
  return singletonBuilder;
}

/**
 * Reset singleton (for testing)
 */
export function resetDependencyGraphBuilder(): void {
  singletonBuilder = null;
}
