/**
 * Symbol Request Handler
 *
 * Handles symbol definition and context requests from agents.
 * Uses RepoMapGenerator to find symbols and their usages.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * @module SymbolRequestHandler
 */

import { readFileSync, existsSync } from 'fs';
import { normalize, resolve } from 'pathe';

import type {
  ContextRequest,
  ContextRequestType,
  ContextResponse,
  IRequestHandler,
  SymbolContext,
  SymbolUsage,
  SymbolUsageType,
  SymbolKind} from '../types';
import {
  DEFAULT_REQUEST_OPTIONS,
} from '../types';

import type {
  IRepoMapGenerator,
  SymbolEntry,
  SymbolUsage as RepoMapSymbolUsage,
} from '../../../../infrastructure/analysis/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for SymbolRequestHandler
 */
export interface SymbolRequestHandlerOptions {
  /** Project root path for file resolution */
  projectRoot: string;
  /** Number of context lines above/below symbol definition */
  contextLines?: number;
  /** Maximum usages to include per symbol */
  maxUsages?: number;
}

/**
 * Default handler options
 */
const DEFAULT_OPTIONS: Required<Omit<SymbolRequestHandlerOptions, 'projectRoot'>> = {
  contextLines: 5,
  maxUsages: 10,
};

// ============================================================================
// SymbolRequestHandler Implementation
// ============================================================================

/**
 * SymbolRequestHandler - Handles 'symbol' and 'definition' type context requests
 *
 * Finds symbol definitions using the RepoMapGenerator and returns
 * comprehensive symbol context including usages.
 */
export class SymbolRequestHandler implements IRequestHandler {
  private readonly projectRoot: string;
  private readonly contextLines: number;
  private readonly maxUsages: number;
  private readonly repoMapGenerator: IRepoMapGenerator | null;

  /**
   * Create a new SymbolRequestHandler
   *
   * @param options Handler configuration
   * @param repoMapGenerator Optional RepoMapGenerator for symbol lookup
   */
  constructor(
    options: SymbolRequestHandlerOptions,
    repoMapGenerator?: IRepoMapGenerator
  ) {
    this.projectRoot = normalize(options.projectRoot);
    this.contextLines = options.contextLines ?? DEFAULT_OPTIONS.contextLines;
    this.maxUsages = options.maxUsages ?? DEFAULT_OPTIONS.maxUsages;
    this.repoMapGenerator = repoMapGenerator ?? null;
  }

  /**
   * Check if this handler can process the given request type
   */
  canHandle(type: ContextRequestType): boolean {
    return type === 'symbol' || type === 'definition';
  }

  /**
   * Handle a symbol context request
   */
  async handle(request: ContextRequest): Promise<ContextResponse> {
    const { query: symbolName, options, type } = request;
    const maxTokens = options?.maxTokens ?? DEFAULT_REQUEST_OPTIONS.maxTokens;
    const includeContext = options?.includeContext ?? DEFAULT_REQUEST_OPTIONS.includeContext;
    const limit = options?.limit ?? DEFAULT_REQUEST_OPTIONS.limit;

    try {
      // Find the symbol definition
      const symbolEntry = await this.findSymbolDefinition(symbolName);

      if (!symbolEntry) {
        return this.createErrorResponse(
          request,
          `Symbol '${symbolName}' not found in the codebase`
        );
      }

      // Get symbol context (surrounding code, documentation)
      const symbolContext = await this.getSymbolContext(
        symbolEntry,
        includeContext,
        type === 'definition' ? 0 : Math.min(limit, this.maxUsages)
      );

      // Format the response
      const formattedContent = this.formatSymbolResponse(symbolContext);

      // Truncate if needed
      const { truncatedContent, wasTruncated } = this.truncateContent(
        formattedContent,
        maxTokens
      );

      const tokenCount = this.estimateTokens(truncatedContent);

      return {
        success: true,
        requestId: '', // Will be set by DynamicContextProvider
        type: request.type,
        content: truncatedContent,
        tokenCount,
        source: symbolEntry.file,
        metadata: {
          symbolName: symbolContext.name,
          symbolKind: symbolContext.kind,
          file: symbolContext.file,
          line: symbolContext.line,
          column: symbolContext.column,
          usagesCount: symbolContext.usages.length,
          hasDocumentation: !!symbolContext.documentation,
          wasTruncated,
          relatedSymbols: symbolContext.relatedSymbols,
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        request,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ============================================================================
  // Private Methods - Symbol Finding
  // ============================================================================

  /**
   * Find a symbol definition by name
   *
   * Searches using the RepoMapGenerator if available,
   * otherwise falls back to a simpler search approach.
   */
  private findSymbolDefinition(
    symbolName: string
  ): SymbolEntry | null {
    // Use RepoMapGenerator if available
    if (this.repoMapGenerator) {
      const symbols = this.repoMapGenerator.findSymbol(symbolName);
      if (symbols.length > 0) {
        // Return the first match (could be enhanced to handle ambiguity)
        return symbols[0] ?? null;
      }
    }

    // No generator or no results - return null
    // In production, could fall back to grep-based search
    return null;
  }

  /**
   * Get comprehensive context for a symbol
   */
  private getSymbolContext(
    symbol: SymbolEntry,
    includeContext: boolean,
    maxUsages: number
  ): SymbolContext {
    // Get usages if requested
    const usages: SymbolUsage[] = [];
    if (maxUsages > 0 && this.repoMapGenerator) {
      const repoMapUsages = this.repoMapGenerator.findUsages(symbol.name);
      usages.push(
        ...repoMapUsages.slice(0, maxUsages).map((u) => this.convertUsage(u))
      );
    }

    // Get related symbols (imports in the same file, parent/child relationships)
    const relatedSymbols = this.findRelatedSymbols(symbol);

    // Get surrounding code context
    let surroundingCode = '';
    if (includeContext) {
      surroundingCode = this.getCodeContext(symbol.file, symbol.line, symbol.endLine);
    }

    // Build the symbol context
    const context: SymbolContext = {
      name: symbol.name,
      kind: this.convertSymbolKind(symbol.kind),
      file: symbol.file,
      line: symbol.line,
      column: symbol.column,
      signature: surroundingCode || symbol.signature,
      documentation: symbol.documentation,
      usages,
      relatedSymbols,
    };

    return context;
  }

  /**
   * Get usages of a symbol with context
   */
  private getSymbolUsages(
    symbolName: string,
    limit: number
  ): SymbolUsage[] {
    if (!this.repoMapGenerator) {
      return [];
    }

    const repoMapUsages = this.repoMapGenerator.findUsages(symbolName);
    return repoMapUsages.slice(0, limit).map((u) => this.convertUsage(u));
  }

  /**
   * Convert RepoMap usage to SymbolUsage format
   */
  private convertUsage(usage: RepoMapSymbolUsage): SymbolUsage {
    return {
      file: usage.file,
      line: usage.line,
      column: 0, // RepoMap doesn't track column for usages
      context: usage.context,
      usageType: this.convertUsageType(usage.usageType),
    };
  }

  /**
   * Convert RepoMap usage type to our format
   */
  private convertUsageType(
    type: 'import' | 'reference' | 'call' | 'type'
  ): SymbolUsageType {
    switch (type) {
      case 'import':
        return 'import';
      case 'call':
        return 'call';
      case 'type':
        return 'type_reference';
      case 'reference':
      default:
        return 'reference';
    }
  }

  /**
   * Convert RepoMap SymbolKind to our SymbolKind
   */
  private convertSymbolKind(
    kind: string
  ): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
      class: 'class',
      interface: 'interface',
      function: 'function',
      method: 'method',
      property: 'property',
      variable: 'variable',
      constant: 'constant',
      type: 'type',
      enum: 'enum',
      enum_member: 'constant',
      namespace: 'type',
      module: 'type',
    };

    return kindMap[kind] ?? 'variable';
  }

  /**
   * Find symbols related to the given symbol
   */
  private findRelatedSymbols(symbol: SymbolEntry): string[] {
    const related: string[] = [];

    if (!this.repoMapGenerator) {
      return related;
    }

    const currentMap = this.repoMapGenerator.getCurrentMap();
    if (!currentMap) {
      return related;
    }

    // Find symbols in the same file
    const sameFileSymbols = currentMap.symbols
      .filter(
        (s) =>
          s.file === symbol.file &&
          s.id !== symbol.id &&
          s.exported
      )
      .slice(0, 5)
      .map((s) => s.name);

    related.push(...sameFileSymbols);

    // If it's a method, find the parent class
    if (symbol.parentId) {
      const parent = currentMap.symbols.find((s) => s.id === symbol.parentId);
      if (parent) {
        related.unshift(parent.name);
      }
    }

    // If it's a class, find implementations of interfaces
    if (symbol.kind === 'class') {
      const implementsMatch = symbol.signature.match(/implements\s+(\w+)/);
      if (implementsMatch && implementsMatch[1]) {
        related.push(implementsMatch[1]);
      }
    }

    return Array.from(new Set(related)); // Deduplicate
  }

  // ============================================================================
  // Private Methods - Code Context
  // ============================================================================

  /**
   * Get code context (surrounding lines) for a symbol
   */
  private getCodeContext(
    filePath: string,
    startLine: number,
    endLine: number
  ): string {
    try {
      const resolvedPath = this.resolveFilePath(filePath);
      if (!existsSync(resolvedPath)) {
        return '';
      }

      const content = readFileSync(resolvedPath, 'utf-8');
      const lines = content.split('\n');

      // Calculate context range
      const contextStart = Math.max(0, startLine - 1 - this.contextLines);
      const contextEnd = Math.min(lines.length, endLine + this.contextLines);

      // Extract lines with line numbers
      const contextLines: string[] = [];
      for (let i = contextStart; i < contextEnd; i++) {
        const lineNum = i + 1;
        const marker = lineNum >= startLine && lineNum <= endLine ? '>' : ' ';
        contextLines.push(`${marker}${lineNum.toString().padStart(4)}: ${lines[i]}`);
      }

      return contextLines.join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Resolve a file path relative to project root
   */
  private resolveFilePath(filePath: string): string {
    const normalized = normalize(filePath);

    // If it looks like an absolute path, return as-is
    if (normalized.startsWith('/') || normalized.match(/^[a-zA-Z]:/)) {
      return normalized;
    }

    // Otherwise resolve relative to project root
    return resolve(this.projectRoot, normalized);
  }

  // ============================================================================
  // Private Methods - Formatting
  // ============================================================================

  /**
   * Format symbol context for agent consumption
   */
  private formatSymbolResponse(context: SymbolContext): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Symbol: ${context.name}`);
    sections.push('');

    // Basic info
    sections.push(`**Kind:** ${context.kind}`);
    sections.push(`**File:** ${context.file}`);
    sections.push(`**Location:** Line ${context.line}, Column ${context.column}`);
    sections.push('');

    // Documentation
    if (context.documentation) {
      sections.push('## Documentation');
      sections.push('');
      sections.push(context.documentation);
      sections.push('');
    }

    // Signature/Code
    sections.push('## Definition');
    sections.push('');
    sections.push('```typescript');
    sections.push(context.signature);
    sections.push('```');
    sections.push('');

    // Usages
    if (context.usages.length > 0) {
      sections.push(`## Usages (${context.usages.length} found)`);
      sections.push('');

      for (const usage of context.usages) {
        sections.push(`### ${usage.file}:${usage.line} (${usage.usageType})`);
        sections.push('```');
        sections.push(usage.context);
        sections.push('```');
        sections.push('');
      }
    }

    // Related symbols
    if (context.relatedSymbols.length > 0) {
      sections.push('## Related Symbols');
      sections.push('');
      for (const related of context.relatedSymbols) {
        sections.push(`- ${related}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Truncate content to fit within token budget
   */
  private truncateContent(
    content: string,
    maxTokens: number
  ): { truncatedContent: string; wasTruncated: boolean } {
    const estimatedTokens = this.estimateTokens(content);

    if (estimatedTokens <= maxTokens) {
      return { truncatedContent: content, wasTruncated: false };
    }

    // Calculate approximate character limit
    const charLimit = maxTokens * 4;

    // Find the last section break before the limit
    const lines = content.split('\n');
    let truncatedContent = '';
    let currentLength = 0;

    for (const line of lines) {
      const lineWithNewline = line + '\n';
      if (currentLength + lineWithNewline.length > charLimit) {
        break;
      }
      truncatedContent += lineWithNewline;
      currentLength += lineWithNewline.length;
    }

    // Add truncation indicator
    const truncationIndicator = '\n\n... [Symbol context truncated due to token limit] ...';
    truncatedContent = truncatedContent.trimEnd() + truncationIndicator;

    return { truncatedContent, wasTruncated: true };
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Create an error response
   */
  private createErrorResponse(
    request: ContextRequest,
    errorMessage: string
  ): ContextResponse {
    return {
      success: false,
      requestId: '', // Will be set by DynamicContextProvider
      type: request.type,
      content: '',
      tokenCount: 0,
      source: request.query,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to create a SymbolRequestHandler
 */
export function createSymbolRequestHandler(
  projectRoot: string,
  repoMapGenerator?: IRepoMapGenerator,
  options?: Omit<SymbolRequestHandlerOptions, 'projectRoot'>
): SymbolRequestHandler {
  return new SymbolRequestHandler(
    { projectRoot, ...options },
    repoMapGenerator
  );
}
