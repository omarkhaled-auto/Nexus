/**
 * Search Request Handler
 *
 * Handles semantic code search and symbol usage requests from agents.
 * Uses CodeMemory from Plan 13-03 for semantic search capabilities.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * @module SearchRequestHandler
 */

import type {
  ContextRequest,
  ContextRequestType,
  ContextResponse,
  IRequestHandler,
  SearchResults,
  SearchResultItem} from '../types';
import {
  DEFAULT_REQUEST_OPTIONS,
} from '../types';

import type {
  ICodeMemory,
  CodeSearchResult,
  CodeSearchOptions,
} from '../../../../persistence/memory/code/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for SearchRequestHandler
 */
export interface SearchRequestHandlerOptions {
  /** Project root path for file resolution */
  projectRoot: string;
  /** Default similarity threshold (0.0 to 1.0) */
  defaultThreshold?: number;
  /** Default maximum results */
  defaultLimit?: number;
  /** Whether to include code context around matches */
  includeContext?: boolean;
}

/**
 * Default handler options
 */
const DEFAULT_OPTIONS: Required<Omit<SearchRequestHandlerOptions, 'projectRoot'>> = {
  defaultThreshold: 0.7,
  defaultLimit: 10,
  includeContext: true,
};

// ============================================================================
// SearchRequestHandler Implementation
// ============================================================================

/**
 * SearchRequestHandler - Handles 'search' and 'usages' type context requests
 *
 * Uses the CodeMemory semantic search engine to find relevant code chunks
 * and symbol usages throughout the codebase.
 */
export class SearchRequestHandler implements IRequestHandler {
  private readonly projectRoot: string;
  private readonly defaultThreshold: number;
  private readonly defaultLimit: number;
  private readonly includeContext: boolean;
  private readonly codeMemory: ICodeMemory | null;

  /**
   * Create a new SearchRequestHandler
   *
   * @param options Handler configuration
   * @param codeMemory Optional CodeMemory instance for semantic search
   */
  constructor(
    options: SearchRequestHandlerOptions,
    codeMemory?: ICodeMemory
  ) {
    this.projectRoot = options.projectRoot;
    this.defaultThreshold = options.defaultThreshold ?? DEFAULT_OPTIONS.defaultThreshold;
    this.defaultLimit = options.defaultLimit ?? DEFAULT_OPTIONS.defaultLimit;
    this.includeContext = options.includeContext ?? DEFAULT_OPTIONS.includeContext;
    this.codeMemory = codeMemory ?? null;
  }

  /**
   * Check if this handler can process the given request type
   */
  canHandle(type: ContextRequestType): boolean {
    return type === 'search' || type === 'usages';
  }

  /**
   * Handle a search or usages context request
   */
  async handle(request: ContextRequest): Promise<ContextResponse> {
    const { query, options, type } = request;
    const maxTokens = options?.maxTokens ?? DEFAULT_REQUEST_OPTIONS.maxTokens;
    const limit = options?.limit ?? this.defaultLimit;
    const filePattern = options?.filePattern ?? DEFAULT_REQUEST_OPTIONS.filePattern;

    try {
      // Validate we have a CodeMemory instance
      if (!this.codeMemory) {
        return this.createErrorResponse(
          request,
          'CodeMemory is not available. Semantic search requires CodeMemory to be configured.'
        );
      }

      // Route to appropriate method based on request type
      let searchResults: SearchResults;
      if (type === 'usages') {
        searchResults = await this.findUsages(query, limit, filePattern);
      } else {
        searchResults = await this.searchCode(query, limit, filePattern);
      }

      // Format the response
      const formattedContent = this.formatSearchResults(searchResults);

      // Truncate if needed
      const { truncatedContent, wasTruncated, tokenCount } = this.truncateResults(
        formattedContent,
        searchResults,
        maxTokens
      );

      // Update truncated flag in results if truncated
      if (wasTruncated) {
        searchResults.truncated = true;
      }

      return {
        success: true,
        requestId: '', // Will be set by DynamicContextProvider
        type: request.type,
        content: truncatedContent,
        tokenCount,
        source: 'CodeMemory semantic search',
        metadata: {
          query,
          totalMatches: searchResults.totalMatches,
          returnedResults: searchResults.results.length,
          truncated: searchResults.truncated,
          requestType: type,
          filePattern,
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
  // Private Methods - Search Operations
  // ============================================================================

  /**
   * Perform semantic code search
   */
  private async searchCode(
    query: string,
    limit: number,
    filePattern: string
  ): Promise<SearchResults> {
    if (!this.codeMemory) {
      return this.createEmptyResults(query);
    }

    const searchOptions: CodeSearchOptions = {
      limit,
      threshold: this.defaultThreshold,
      filePattern,
      includeContext: this.includeContext,
    };

    const results = await this.codeMemory.searchCode(query, searchOptions);

    return this.mapSearchResults(query, results);
  }

  /**
   * Find all usages of a symbol
   */
  private async findUsages(
    symbolName: string,
    limit: number,
    _filePattern: string
  ): Promise<SearchResults> {
    if (!this.codeMemory) {
      return this.createEmptyResults(symbolName);
    }

    // Get usages from CodeMemory
    const usages = await this.codeMemory.findUsages(symbolName);

    // Convert usages to search results format
    const results: SearchResultItem[] = usages.slice(0, limit).map((usage) => ({
      file: usage.file,
      startLine: usage.line,
      endLine: usage.line,
      content: usage.context,
      score: 1.0, // Direct matches have perfect score
      highlights: [this.highlightSymbol(usage.context, symbolName)],
    }));

    // Calculate token count
    const tokenCount = this.calculateResultsTokenCount(results);

    return {
      query: symbolName,
      results,
      totalMatches: usages.length,
      truncated: usages.length > limit,
      tokenCount,
    };
  }

  /**
   * Map CodeSearchResult[] to our SearchResults format
   */
  private mapSearchResults(
    query: string,
    codeSearchResults: CodeSearchResult[]
  ): SearchResults {
    const results: SearchResultItem[] = codeSearchResults.map((result) => ({
      file: result.chunk.file,
      startLine: result.chunk.startLine,
      endLine: result.chunk.endLine,
      content: result.chunk.content,
      score: result.score,
      highlights: result.highlights,
    }));

    const tokenCount = this.calculateResultsTokenCount(results);

    return {
      query,
      results,
      totalMatches: results.length,
      truncated: false,
      tokenCount,
    };
  }

  /**
   * Create empty results when no matches found
   */
  private createEmptyResults(query: string): SearchResults {
    return {
      query,
      results: [],
      totalMatches: 0,
      truncated: false,
      tokenCount: 0,
    };
  }

  // ============================================================================
  // Private Methods - Formatting
  // ============================================================================

  /**
   * Format search results for agent consumption
   */
  private formatSearchResults(searchResults: SearchResults): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Search Results for: "${searchResults.query}"`);
    sections.push('');

    // Summary
    sections.push(`**Total Matches:** ${searchResults.totalMatches}`);
    sections.push(`**Showing:** ${searchResults.results.length} results`);
    if (searchResults.truncated) {
      sections.push('**Note:** Results truncated to fit token budget');
    }
    sections.push('');

    // Results
    if (searchResults.results.length === 0) {
      sections.push('No matching code found for the given query.');
      sections.push('');
      sections.push('**Suggestions:**');
      sections.push('- Try a different search term');
      sections.push('- Use more specific keywords');
      sections.push('- Check if the file pattern is correct');
    } else {
      sections.push('---');
      sections.push('');

      for (const [i, result] of searchResults.results.entries()) {
        sections.push(`## Result ${i + 1}: ${result.file}`);
        sections.push('');
        sections.push(`**Lines:** ${result.startLine}-${result.endLine}`);
        sections.push(`**Relevance Score:** ${(result.score * 100).toFixed(1)}%`);
        sections.push('');

        // Show highlights if available
        if (result.highlights && result.highlights.length > 0) {
          sections.push('**Highlighted Matches:**');
          for (const highlight of result.highlights) {
            sections.push(`> ${highlight}`);
          }
          sections.push('');
        }

        // Show code content
        sections.push('**Code:**');
        sections.push('```');
        sections.push(this.addLineNumbers(result.content, result.startLine));
        sections.push('```');
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Add line numbers to code content
   */
  private addLineNumbers(content: string, startLine: number): string {
    const lines = content.split('\n');
    const maxLineNumWidth = String(startLine + lines.length - 1).length;

    return lines
      .map((line, index) => {
        const lineNum = (startLine + index).toString().padStart(maxLineNumWidth, ' ');
        return `${lineNum}: ${line}`;
      })
      .join('\n');
  }

  /**
   * Highlight a symbol in context
   */
  private highlightSymbol(context: string, symbolName: string): string {
    // Simple highlighting by surrounding with markers
    const escaped = this.escapeRegex(symbolName);
    const pattern = new RegExp(`\\b(${escaped})\\b`, 'g');
    return context.replace(pattern, '**$1**');
  }

  // ============================================================================
  // Private Methods - Truncation
  // ============================================================================

  /**
   * Truncate results to fit within token budget
   */
  private truncateResults(
    formattedContent: string,
    searchResults: SearchResults,
    maxTokens: number
  ): { truncatedContent: string; wasTruncated: boolean; tokenCount: number } {
    const estimatedTokens = this.estimateTokens(formattedContent);

    if (estimatedTokens <= maxTokens) {
      return {
        truncatedContent: formattedContent,
        wasTruncated: false,
        tokenCount: estimatedTokens,
      };
    }

    // Need to truncate - rebuild with fewer results
    const targetChars = maxTokens * 4; // Approximate chars per token

    // Binary search for the right number of results
    let left = 1;
    let right = searchResults.results.length;
    let bestFit = 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncatedResults: SearchResults = {
        ...searchResults,
        results: searchResults.results.slice(0, mid),
        truncated: true,
      };
      const testContent = this.formatSearchResults(truncatedResults);

      if (testContent.length <= targetChars) {
        bestFit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Build final truncated content
    const truncatedResults: SearchResults = {
      ...searchResults,
      results: searchResults.results.slice(0, bestFit),
      truncated: true,
    };
    const truncatedContent = this.formatSearchResults(truncatedResults);

    // Add truncation notice if not already present
    let finalContent = truncatedContent;
    if (!finalContent.includes('truncated')) {
      finalContent += '\n\n... [Additional results truncated due to token limit] ...';
    }

    return {
      truncatedContent: finalContent,
      wasTruncated: true,
      tokenCount: this.estimateTokens(finalContent),
    };
  }

  /**
   * Calculate token count for results
   */
  private calculateResultsTokenCount(results: SearchResultItem[]): number {
    let totalContent = '';
    for (const result of results) {
      totalContent += result.content;
      if (result.highlights) {
        totalContent += result.highlights.join('\n');
      }
    }
    return this.estimateTokens(totalContent);
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * Factory function to create a SearchRequestHandler
 */
export function createSearchRequestHandler(
  projectRoot: string,
  codeMemory?: ICodeMemory,
  options?: Omit<SearchRequestHandlerOptions, 'projectRoot'>
): SearchRequestHandler {
  return new SearchRequestHandler(
    { projectRoot, ...options },
    codeMemory
  );
}
