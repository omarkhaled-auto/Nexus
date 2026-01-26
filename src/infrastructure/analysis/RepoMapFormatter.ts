/**
 * RepoMapFormatter - Format repository maps for different output styles
 *
 * Provides multiple output formats (compact, detailed, tree) for repository maps,
 * with token budget management and truncation support.
 *
 * @module infrastructure/analysis/RepoMapFormatter
 */

import { relative, basename } from 'path';
import type {
  IRepoMapFormatter,
  RepoMap,
  FormatOptions,
  SymbolEntry,
  SymbolKind,
  FileEntry,
} from './types';
import { DEFAULT_FORMAT_OPTIONS } from './types';

/**
 * Formatted symbol with display information
 */
interface _FormattedSymbol {
  symbol: SymbolEntry;
  prefix: string;
  displayLine: string;
  estimatedTokens: number;
  depth: number;
}

/**
 * Directory node for tree structure
 */
interface DirectoryNode {
  name: string;
  path: string;
  children: Map<string, DirectoryNode>;
  files: Array<{
    name: string;
    file: FileEntry;
    symbols: SymbolEntry[];
  }>;
}

/**
 * RepoMapFormatter - Format repository maps for context windows
 */
export class RepoMapFormatter implements IRepoMapFormatter {
  /**
   * Approximate characters per token for GPT-like models
   * This is a conservative estimate (actual varies by content)
   */
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Maximum signature length before truncation
   */
  private static readonly MAX_SIGNATURE_LENGTH = 80;

  /**
   * Symbol prefixes for visual differentiation
   */
  private static readonly SYMBOL_PREFIXES: Record<SymbolKind, string> = {
    class: '\u2295', // ⊕
    interface: '\u25C7', // ◇
    function: '\u0192', // ƒ
    method: '\u00B7', // ·
    property: '.', // .
    variable: '\u2192', // →
    constant: '\u2237', // ∷
    type: '\u22A4', // ⊤
    enum: '\u229E', // ⊞
    enum_member: '\u25AA', // ▪
    namespace: 'N',
    module: 'M',
  };

  // ============================================================================
  // Main Format Methods
  // ============================================================================

  /**
   * Format repository map as string
   * @param repoMap - Repository map to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(repoMap: RepoMap, options?: FormatOptions): string {
    const mergedOptions: Required<FormatOptions> = {
      ...DEFAULT_FORMAT_OPTIONS,
      ...options,
    };

    switch (mergedOptions.style) {
      case 'compact':
        return this.formatCompact(repoMap, mergedOptions);
      case 'detailed':
        return this.formatDetailed(repoMap, mergedOptions);
      case 'tree':
        return this.formatTree(repoMap, mergedOptions);
      default:
        return this.formatCompact(repoMap, mergedOptions);
    }
  }

  // ============================================================================
  // Compact Format
  // ============================================================================

  /**
   * Format in compact style - maximum info density, minimal tokens
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Compact formatted string
   */
  private formatCompact(
    repoMap: RepoMap,
    options: Required<FormatOptions>
  ): string {
    const lines: string[] = [];
    let currentTokens = 0;

    // Header
    const header = this.buildCompactHeader(repoMap);
    lines.push(...header);
    currentTokens += this.estimateTokens(header.join('\n'));

    // Get symbols to display
    const symbolsToShow = this.selectSymbolsForBudget(
      repoMap.symbols,
      options.maxTokens - currentTokens,
      options.includeSignatures
    );

    // Group by file if enabled
    if (options.groupByFile) {
      const byFile = this.groupByFile(symbolsToShow);

      // Sort files by total references (most important first)
      const sortedFiles = this.sortFilesByImportance(byFile, repoMap);

      for (const { file, symbols } of sortedFiles) {
        const relativePath = relative(repoMap.projectPath, file);
        const fileHeader = `\n## ${this.normalizePath(relativePath)}`;

        // Check budget
        if (currentTokens + this.estimateTokens(fileHeader) > options.maxTokens) {
          lines.push('\n... (truncated)');
          break;
        }

        lines.push(fileHeader);
        currentTokens += this.estimateTokens(fileHeader);

        // Sort and format symbols
        const sortedSymbols = this.sortSymbols(symbols, options.rankByReferences);

        for (const symbol of sortedSymbols) {
          const formattedLine = this.formatSymbolCompact(
            symbol,
            options.includeSignatures,
            options.rankByReferences
          );

          if (currentTokens + this.estimateTokens(formattedLine) > options.maxTokens) {
            lines.push('  ... (truncated)');
            break;
          }

          lines.push(formattedLine);
          currentTokens += this.estimateTokens(formattedLine);
        }
      }
    } else {
      // Flat list sorted by references
      const sortedSymbols = this.sortSymbols(symbolsToShow, options.rankByReferences);

      for (const symbol of sortedSymbols) {
        const formattedLine = this.formatSymbolCompact(
          symbol,
          options.includeSignatures,
          options.rankByReferences
        );

        if (currentTokens + this.estimateTokens(formattedLine) > options.maxTokens) {
          lines.push('... (truncated)');
          break;
        }

        lines.push(formattedLine);
        currentTokens += this.estimateTokens(formattedLine);
      }
    }

    return lines.join('\n');
  }

  /**
   * Build compact header section
   */
  private buildCompactHeader(repoMap: RepoMap): string[] {
    return [
      '# Repository Map',
      '',
      `Files: ${String(repoMap.stats.totalFiles)} | Symbols: ${String(repoMap.stats.totalSymbols)} | Dependencies: ${String(repoMap.stats.totalDependencies)}`,
      '',
    ];
  }

  /**
   * Format a single symbol in compact style
   */
  private formatSymbolCompact(
    symbol: SymbolEntry,
    includeSignatures: boolean,
    rankByReferences: boolean
  ): string {
    const prefix = this.getSymbolPrefix(symbol.kind);
    const exportMark = symbol.exported ? '\u03B5' : ''; // ε
    const indent = symbol.parentId ? '  ' : '';
    const refCount =
      rankByReferences && symbol.references > 0 ? ` (${String(symbol.references)})` : '';

    let content: string;
    if (includeSignatures && symbol.signature !== symbol.name) {
      content = this.truncateSignature(
        symbol.signature,
        RepoMapFormatter.MAX_SIGNATURE_LENGTH
      );
    } else {
      content = symbol.name;
    }

    return `${indent}${prefix}${exportMark}${content}${refCount}`;
  }

  // ============================================================================
  // Detailed Format
  // ============================================================================

  /**
   * Format in detailed style - verbose with documentation
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Detailed formatted string
   */
  private formatDetailed(
    repoMap: RepoMap,
    options: Required<FormatOptions>
  ): string {
    const lines: string[] = [];
    let currentTokens = 0;

    // Header
    lines.push('# Repository Map (Detailed)');
    lines.push('');
    lines.push(`## Summary`);
    lines.push(`- **Project:** ${repoMap.projectPath}`);
    lines.push(`- **Generated:** ${repoMap.generatedAt.toISOString()}`);
    lines.push(`- **Files:** ${String(repoMap.stats.totalFiles)}`);
    lines.push(`- **Symbols:** ${String(repoMap.stats.totalSymbols)}`);
    lines.push(`- **Dependencies:** ${String(repoMap.stats.totalDependencies)}`);
    lines.push('');

    currentTokens = this.estimateTokens(lines.join('\n'));

    // Symbol breakdown
    lines.push('## Symbol Breakdown');
    for (const [kind, count] of Object.entries(repoMap.stats.symbolBreakdown)) {
      if (count > 0) {
        lines.push(`- ${kind}: ${String(count)}`);
      }
    }
    lines.push('');

    // Dependencies section if enabled
    if (options.includeDependencies && repoMap.dependencies.length > 0) {
      lines.push('## Key Dependencies');
      const depLines: string[] = [];

      // Group by source file
      const bySource = new Map<string, string[]>();
      for (const dep of repoMap.dependencies.slice(0, 20)) {
        const from = relative(repoMap.projectPath, dep.from);
        const to = relative(repoMap.projectPath, dep.to);
        if (!bySource.has(from)) {
          bySource.set(from, []);
        }
        bySource.get(from)?.push(to);
      }

      for (const [from, targets] of bySource) {
        depLines.push(`- \`${this.normalizePath(from)}\` imports:`);
        for (const target of targets.slice(0, 5)) {
          depLines.push(`  - \`${this.normalizePath(target)}\``);
        }
        if (targets.length > 5) {
          depLines.push(`  - ... and ${String(targets.length - 5)} more`);
        }
      }

      lines.push(...depLines);
      lines.push('');
    }

    currentTokens = this.estimateTokens(lines.join('\n'));

    // Files and symbols
    lines.push('## Files');
    lines.push('');

    const byFile = this.groupByFile(repoMap.symbols);
    const sortedFiles = this.sortFilesByImportance(byFile, repoMap);

    for (const { file, symbols } of sortedFiles) {
      const relativePath = this.normalizePath(relative(repoMap.projectPath, file));
      const fileEntry = repoMap.files.find((f) => f.path === file);

      const fileHeader = [`### ${relativePath}`];
      if (fileEntry) {
        fileHeader.push(`*${String(fileEntry.lineCount)} lines, ${String(fileEntry.symbolCount)} symbols*`);
      }
      fileHeader.push('');

      if (currentTokens + this.estimateTokens(fileHeader.join('\n')) > options.maxTokens) {
        lines.push('### ... (truncated)');
        break;
      }

      lines.push(...fileHeader);
      currentTokens += this.estimateTokens(fileHeader.join('\n'));

      // Sort symbols
      const sortedSymbols = this.sortSymbols(symbols, options.rankByReferences);

      for (const symbol of sortedSymbols) {
        const symbolLines = this.formatSymbolDetailed(
          symbol,
          options.includeDocstrings,
          options.rankByReferences
        );

        if (currentTokens + this.estimateTokens(symbolLines.join('\n')) > options.maxTokens) {
          lines.push('*... (truncated)*');
          break;
        }

        lines.push(...symbolLines);
        currentTokens += this.estimateTokens(symbolLines.join('\n'));
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format a single symbol in detailed style
   */
  private formatSymbolDetailed(
    symbol: SymbolEntry,
    includeDocstrings: boolean,
    rankByReferences: boolean
  ): string[] {
    const lines: string[] = [];
    const prefix = this.getSymbolPrefix(symbol.kind);
    const exportMark = symbol.exported ? ' (exported)' : '';
    const refCount =
      rankByReferences && symbol.references > 0
        ? ` [refs: ${String(symbol.references)}]`
        : '';

    const indent = symbol.parentId ? '  ' : '';

    lines.push(`${indent}- ${prefix} **${symbol.name}**${exportMark}${refCount}`);

    // Add signature if different from name
    if (symbol.signature !== symbol.name) {
      lines.push(`${indent}  \`${symbol.signature}\``);
    }

    // Add documentation if enabled and present
    if (includeDocstrings && symbol.documentation) {
      const docLines = symbol.documentation.split('\n');
      const doc = docLines[0] ?? ''; // First line only
      if (doc.length > 100) {
        lines.push(`${indent}  *${doc.substring(0, 100)}...*`);
      } else if (doc.length > 0) {
        lines.push(`${indent}  *${doc}*`);
      }
    }

    return lines;
  }

  // ============================================================================
  // Tree Format
  // ============================================================================

  /**
   * Format in tree style - directory tree structure
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Tree formatted string
   */
  private formatTree(
    repoMap: RepoMap,
    options: Required<FormatOptions>
  ): string {
    const lines: string[] = [];
    let currentTokens = 0;

    // Header
    lines.push('# Repository Map (Tree)');
    lines.push('');
    lines.push(`${String(repoMap.stats.totalFiles)} files, ${String(repoMap.stats.totalSymbols)} symbols`);
    lines.push('');

    currentTokens = this.estimateTokens(lines.join('\n'));

    // Build directory tree
    const root = this.buildDirectoryTree(repoMap);

    // Render tree
    const treeLines = this.renderDirectoryTree(
      root,
      '',
      true,
      options,
      currentTokens,
      options.maxTokens
    );

    lines.push(...treeLines);

    return lines.join('\n');
  }

  /**
   * Build directory tree structure from repo map
   */
  private buildDirectoryTree(repoMap: RepoMap): DirectoryNode {
    const root: DirectoryNode = {
      name: basename(repoMap.projectPath) || 'root',
      path: '',
      children: new Map(),
      files: [],
    };

    // Group symbols by file
    const symbolsByFile = this.groupByFile(repoMap.symbols);

    for (const file of repoMap.files) {
      const relativePath = this.normalizePath(relative(repoMap.projectPath, file.path));
      const parts = relativePath.split('/');
      const fileName = parts.pop() ?? '';

      // Navigate/create directory structure
      let current = root;
      let currentPath = '';

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: currentPath,
            children: new Map(),
            files: [],
          });
        }
        current = current.children.get(part) ?? current;
      }

      // Add file
      current.files.push({
        name: fileName,
        file,
        symbols: symbolsByFile.get(file.path) || [],
      });
    }

    return root;
  }

  /**
   * Render directory tree as string array
   */
  private renderDirectoryTree(
    node: DirectoryNode,
    prefix: string,
    isLast: boolean,
    options: Required<FormatOptions>,
    currentTokens: number,
    maxTokens: number
  ): string[] {
    const lines: string[] = [];
    let tokens = currentTokens;

    // Render children directories
    const dirs = Array.from(node.children.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

    const items = [
      ...dirs.map((d) => ({ type: 'dir' as const, item: d })),
      ...files.map((f) => ({ type: 'file' as const, item: f })),
    ];

    for (const [i, currentItem] of items.entries()) {
      const { type, item } = currentItem;
      const isLastItem = i === items.length - 1;
      const connector = isLastItem ? '\u2514\u2500\u2500' : '\u251C\u2500\u2500'; // └── or ├──
      const childPrefix = prefix + (isLastItem ? '    ' : '\u2502   '); // │

      if (type === 'dir') {
        const dir = item;
        const line = `${prefix}${connector} ${dir.name}/`;

        if (tokens + this.estimateTokens(line) > maxTokens) {
          lines.push(`${prefix}... (truncated)`);
          break;
        }

        lines.push(line);
        tokens += this.estimateTokens(line);

        // Recursively render children
        const childLines = this.renderDirectoryTree(
          dir,
          childPrefix,
          isLastItem,
          options,
          tokens,
          maxTokens
        );
        lines.push(...childLines);
        tokens += this.estimateTokens(childLines.join('\n'));
      } else {
        const fileItem = item as { name: string; file: FileEntry; symbols: SymbolEntry[] };
        const line = `${prefix}${connector} ${fileItem.name}`;

        if (tokens + this.estimateTokens(line) > maxTokens) {
          lines.push(`${prefix}... (truncated)`);
          break;
        }

        lines.push(line);
        tokens += this.estimateTokens(line);

        // Add symbols if includeSignatures is enabled
        if (options.includeSignatures && fileItem.symbols.length > 0) {
          const sortedSymbols = this.sortSymbols(fileItem.symbols, options.rankByReferences);
          const topLevelSymbols = sortedSymbols.filter((s) => !s.parentId);

          for (const symbol of topLevelSymbols.slice(0, 10)) {
            const symbolPrefix = this.getSymbolPrefix(symbol.kind);
            const exportMark = symbol.exported ? '\u03B5' : '';
            const refCount =
              options.rankByReferences && symbol.references > 0
                ? ` (${String(symbol.references)})`
                : '';
            const symbolLine = `${childPrefix}    ${symbolPrefix}${exportMark}${symbol.name}${refCount}`;

            if (tokens + this.estimateTokens(symbolLine) > maxTokens) {
              lines.push(`${childPrefix}    ... (truncated)`);
              break;
            }

            lines.push(symbolLine);
            tokens += this.estimateTokens(symbolLine);
          }

          if (topLevelSymbols.length > 10) {
            lines.push(`${childPrefix}    ... +${String(topLevelSymbols.length - 10)} more`);
          }
        }
      }
    }

    return lines;
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Estimate token count for text
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / RepoMapFormatter.CHARS_PER_TOKEN);
  }

  /**
   * Truncate output to fit token budget
   * @param repoMap - Repository map
   * @param maxTokens - Maximum tokens
   * @returns Truncated formatted string
   */
  truncateToFit(repoMap: RepoMap, maxTokens: number): string {
    let budget = maxTokens;
    let output = this.format(repoMap, {
      ...DEFAULT_FORMAT_OPTIONS,
      maxTokens: budget,
      style: 'compact',
    });

    const tokens = this.estimateTokens(output);
    if (tokens > maxTokens) {
      const overshoot = tokens - maxTokens;
      budget = Math.max(0, maxTokens - overshoot - 1);
      output = this.format(repoMap, {
        ...DEFAULT_FORMAT_OPTIONS,
        maxTokens: budget,
        style: 'compact',
      });
    }

    return output;
  }

  /**
   * Select symbols that fit within token budget
   * @param symbols - All symbols
   * @param maxTokens - Token budget
   * @param includeSignatures - Whether to include signatures
   * @returns Selected symbols
   */
  private selectSymbolsForBudget(
    symbols: SymbolEntry[],
    maxTokens: number,
    includeSignatures: boolean
  ): SymbolEntry[] {
    // Sort by importance (references, then exported, then alphabetical)
    const sorted = [...symbols].sort((a, b) => {
      // Most referenced first
      if (b.references !== a.references) return b.references - a.references;
      // Exported first
      if (a.exported && !b.exported) return -1;
      if (!a.exported && b.exported) return 1;
      // Top-level first
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });

    const selected: SymbolEntry[] = [];
    let currentTokens = 0;

    for (const symbol of sorted) {
      const content = includeSignatures ? symbol.signature : symbol.name;
      const estimatedTokens = this.estimateTokens(content) + 2; // +2 for prefix and whitespace

      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }

      selected.push(symbol);
      currentTokens += estimatedTokens;
    }

    return selected;
  }

  // ============================================================================
  // Statistics Formatting
  // ============================================================================

  /**
   * Format statistics as string
   * @param repoMap - Repository map
   * @returns Formatted statistics
   */
  formatStats(repoMap: RepoMap): string {
    const stats = repoMap.stats;
    const lines: string[] = [];

    lines.push('# Repository Statistics');
    lines.push('');
    lines.push('## Overview');
    lines.push(`- **Total Files:** ${String(stats.totalFiles)}`);
    lines.push(`- **Total Symbols:** ${String(stats.totalSymbols)}`);
    lines.push(`- **Total Dependencies:** ${String(stats.totalDependencies)}`);
    lines.push(`- **Generation Time:** ${String(stats.generationTime)}ms`);
    lines.push('');

    lines.push('## Language Breakdown');
    for (const [lang, count] of Object.entries(stats.languageBreakdown)) {
      if (count > 0) {
        lines.push(`- **${lang}:** ${String(count)} files`);
      }
    }
    lines.push('');

    lines.push('## Symbol Breakdown');
    for (const [kind, count] of Object.entries(stats.symbolBreakdown)) {
      if (count > 0) {
        lines.push(`- **${kind}:** ${String(count)}`);
      }
    }
    lines.push('');

    if (stats.mostReferencedSymbols.length > 0) {
      lines.push('## Most Referenced Symbols');
      for (const { name, references } of stats.mostReferencedSymbols.slice(0, 10)) {
        lines.push(`- **${name}:** ${String(references)} references`);
      }
      lines.push('');
    }

    if (stats.mostConnectedFiles.length > 0) {
      lines.push('## Most Connected Files');
      for (const { file, connections } of stats.mostConnectedFiles.slice(0, 10)) {
        const relativePath = relative(repoMap.projectPath, file);
        lines.push(`- **${this.normalizePath(relativePath)}:** ${String(connections)} connections`);
      }
      lines.push('');
    }

    if (stats.largestFiles.length > 0) {
      lines.push('## Largest Files');
      for (const file of stats.largestFiles.slice(0, 10)) {
        lines.push(`- ${this.normalizePath(file)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get symbol prefix for kind
   */
  private getSymbolPrefix(kind: SymbolKind): string {
    return RepoMapFormatter.SYMBOL_PREFIXES[kind] || '?';
  }

  /**
   * Truncate signature if too long
   */
  private truncateSignature(signature: string, maxLength: number): string {
    if (signature.length <= maxLength) {
      return signature;
    }
    return signature.substring(0, maxLength - 3) + '...';
  }

  /**
   * Group symbols by file
   */
  private groupByFile(symbols: SymbolEntry[]): Map<string, SymbolEntry[]> {
    const byFile = new Map<string, SymbolEntry[]>();
    for (const symbol of symbols) {
      const normalizedFile = this.normalizePath(symbol.file);
      if (!byFile.has(normalizedFile)) {
        byFile.set(normalizedFile, []);
      }
      byFile.get(normalizedFile)?.push(symbol);
    }
    return byFile;
  }

  /**
   * Sort files by importance (total references in file)
   */
  private sortFilesByImportance(
    byFile: Map<string, SymbolEntry[]>,
    _repoMap: RepoMap
  ): Array<{ file: string; symbols: SymbolEntry[] }> {
    const filesWithRefs = Array.from(byFile.entries()).map(([file, symbols]) => ({
      file,
      symbols,
      totalRefs: symbols.reduce((sum, s) => sum + s.references, 0),
    }));

    // Sort by total references descending
    filesWithRefs.sort((a, b) => b.totalRefs - a.totalRefs);

    return filesWithRefs;
  }

  /**
   * Sort symbols by importance
   */
  private sortSymbols(
    symbols: SymbolEntry[],
    rankByReferences: boolean
  ): SymbolEntry[] {
    return [...symbols].sort((a, b) => {
      // Top-level first
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      // By references if enabled
      if (rankByReferences) {
        if (b.references !== a.references) return b.references - a.references;
      }
      // Exported first
      if (a.exported && !b.exported) return -1;
      if (!a.exported && b.exported) return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Normalize file path for consistent display
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonFormatter: RepoMapFormatter | null = null;

/**
 * Get singleton RepoMapFormatter instance
 */
export function getRepoMapFormatter(): RepoMapFormatter {
  if (!singletonFormatter) {
    singletonFormatter = new RepoMapFormatter();
  }
  return singletonFormatter;
}

/**
 * Reset singleton (for testing)
 */
export function resetRepoMapFormatter(): void {
  singletonFormatter = null;
}
