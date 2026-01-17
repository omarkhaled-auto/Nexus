/**
 * CodeChunker - Intelligent code chunking that respects semantic boundaries
 *
 * Creates code chunks based on function/class/interface boundaries using
 * TreeSitterParser for symbol extraction. Falls back to line-based chunking
 * for files without clear boundaries.
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/code/CodeChunker
 */

import { createHash } from 'crypto';
import { extname, basename, dirname } from 'path';
import type {
  ICodeChunker,
  CodeChunk,
  CodeChunkType,
  CodeChunkMetadata,
  ChunkingOptions,
  SymbolEntry,
} from './types';
import { DEFAULT_CHUNKING_OPTIONS } from './types';
import type { TreeSitterParser} from '../../../infrastructure/analysis/TreeSitterParser';
import { getParser } from '../../../infrastructure/analysis/TreeSitterParser';

// ============================================================================
// Constants
// ============================================================================

/** Approximate characters per token for estimation */
const CHARS_PER_TOKEN = 4;

/** Default project ID when none can be extracted */
const DEFAULT_PROJECT_ID = 'unknown';

/** Symbol kinds that map to chunk types */
const SYMBOL_TO_CHUNK_TYPE: Record<string, CodeChunkType> = {
  function: 'function',
  class: 'class',
  interface: 'interface',
  type: 'type',
  enum: 'type',
  namespace: 'module',
  module: 'module',
  constant: 'block',
  variable: 'block',
  method: 'function', // Methods are treated as functions
};

// ============================================================================
// CodeChunker Class
// ============================================================================

/**
 * CodeChunker - Creates semantic code chunks from source files
 */
export class CodeChunker implements ICodeChunker {
  private parser: TreeSitterParser;
  private defaultOptions: Required<ChunkingOptions>;
  private projectId: string;

  /**
   * Create a new CodeChunker
   * @param parser - TreeSitterParser instance (optional, uses singleton)
   * @param defaultOptions - Default chunking options
   * @param projectId - Default project ID
   */
  constructor(
    parser?: TreeSitterParser,
    defaultOptions?: Partial<ChunkingOptions>,
    projectId?: string
  ) {
    this.parser = parser ?? getParser();
    this.defaultOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...defaultOptions };
    this.projectId = projectId ?? DEFAULT_PROJECT_ID;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Chunk a file based on its structure
   * @param file - File path
   * @param content - File content
   * @param options - Chunking options
   * @returns Array of code chunks (without embeddings)
   */
  chunkFile(
    file: string,
    content: string,
    options?: ChunkingOptions
  ): CodeChunk[] {
    // Handle empty or whitespace-only content
    if (!content || content.trim().length === 0) {
      return [];
    }

    const opts = { ...this.defaultOptions, ...options };
    const language = this.detectLanguage(file);
    const projectId = this.getProjectId(file);

    // For unsupported languages, fall back to line-based chunking
    if (language === 'unknown') {
      return this.chunkByLines(file, content, opts, language, projectId);
    }

    // Try to parse and extract symbols synchronously using cached parse result
    // Since TreeSitterParser requires async initialization, we need to handle this
    try {
      // Check if parser is ready and we can get symbols
      // For now, fall back to line-based chunking if parser isn't ready
      // The actual parsing will be done through chunkBySymbols when symbols are available
      if (!this.parser.isReady()) {
        return this.chunkByLines(file, content, opts, language, projectId);
      }

      // Since parseFile is async and this method is sync, we'll use line-based as default
      // The caller should use chunkBySymbols when they have symbols available
      return this.chunkByLines(file, content, opts, language, projectId);
    } catch {
      // On any error, fall back to line-based chunking
      return this.chunkByLines(file, content, opts, language, projectId);
    }
  }

  /**
   * Chunk a file using pre-extracted symbols
   * @param file - File path
   * @param content - File content
   * @param symbols - Pre-extracted symbols from TreeSitter
   * @returns Array of code chunks (without embeddings)
   */
  chunkBySymbols(
    file: string,
    content: string,
    symbols: SymbolEntry[]
  ): CodeChunk[] {
    const language = this.detectLanguage(file);
    const projectId = this.getProjectId(file);
    const lines = content.split('\n');

    // Get top-level symbols (no parentId)
    const topLevelSymbols = symbols
      .filter((s) => !s.parentId)
      .sort((a, b) => a.line - b.line);

    if (topLevelSymbols.length === 0) {
      // No symbols found, fall back to line-based
      return this.chunkByLines(file, content, this.defaultOptions, language, projectId);
    }

    const chunks: CodeChunk[] = [];
    let lastEndLine = 0;

    // Create a chunk for any content before the first symbol (imports, etc.)
    const firstSymbol = topLevelSymbols[0];
    if (firstSymbol.line > 1) {
      const preambleContent = this.getContentRange(lines, 1, firstSymbol.line - 1);
      if (preambleContent.trim().length > 0) {
        chunks.push(
          this.createChunk(
            file,
            preambleContent,
            1,
            firstSymbol.line - 1,
            'module',
            this.extractImportSymbols(preambleContent),
            language,
            projectId
          )
        );
      }
      lastEndLine = firstSymbol.line - 1;
    }

    // Create chunks for each top-level symbol
    for (let i = 0; i < topLevelSymbols.length; i++) {
      const symbol = topLevelSymbols[i];
      const nextSymbol = topLevelSymbols[i + 1];

      // Determine chunk type from symbol kind
      const chunkType = this.symbolKindToChunkType(symbol.kind);

      // Get the end line - use the next symbol's start if available
      const endLine = symbol.endLine;

      // Get content for this symbol
      const symbolContent = this.getContentRange(lines, symbol.line, endLine);

      // Get nested symbols (methods, properties)
      const nestedSymbols = symbols.filter((s) => s.parentId === symbol.id);
      const allSymbolNames = [symbol.name, ...nestedSymbols.map((s) => s.name)];

      chunks.push(
        this.createChunk(
          file,
          symbolContent,
          symbol.line,
          endLine,
          chunkType,
          allSymbolNames,
          language,
          projectId,
          symbol.documentation
        )
      );

      // Check for content between symbols (comments, stray code)
      if (nextSymbol && endLine < nextSymbol.line - 1) {
        const betweenContent = this.getContentRange(lines, endLine + 1, nextSymbol.line - 1);
        if (betweenContent.trim().length > 0) {
          chunks.push(
            this.createChunk(
              file,
              betweenContent,
              endLine + 1,
              nextSymbol.line - 1,
              'block',
              [],
              language,
              projectId
            )
          );
        }
      }

      lastEndLine = endLine;
    }

    // Handle any trailing content after the last symbol
    if (lastEndLine < lines.length) {
      const trailingContent = this.getContentRange(lines, lastEndLine + 1, lines.length);
      if (trailingContent.trim().length > 0) {
        chunks.push(
          this.createChunk(
            file,
            trailingContent,
            lastEndLine + 1,
            lines.length,
            'block',
            [],
            language,
            projectId
          )
        );
      }
    }

    return chunks;
  }

  // ============================================================================
  // Private Methods - Line-based Chunking
  // ============================================================================

  /**
   * Chunk a file by lines when symbol-based chunking isn't possible
   * @param file - File path
   * @param content - File content
   * @param options - Chunking options
   * @param language - Detected language
   * @param projectId - Project ID
   * @returns Array of code chunks
   */
  private chunkByLines(
    file: string,
    content: string,
    options: Required<ChunkingOptions>,
    language: string,
    projectId: string
  ): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    // Estimate tokens per line
    const totalTokens = this.estimateTokens(content);
    const avgTokensPerLine = totalTokens / Math.max(lines.length, 1);

    // Calculate lines per chunk based on max chunk size
    const linesPerChunk = Math.max(
      Math.floor(options.maxChunkSize / Math.max(avgTokensPerLine, 1)),
      10 // Minimum 10 lines per chunk
    );

    // Calculate overlap in lines
    const overlapLines = Math.floor(options.overlapSize / Math.max(avgTokensPerLine, 1));

    let startLine = 1;

    while (startLine <= lines.length) {
      let endLine = Math.min(startLine + linesPerChunk - 1, lines.length);

      // If preserveBoundaries is true, try to find a good breaking point
      if (options.preserveBoundaries && endLine < lines.length) {
        endLine = this.findBoundary(lines, endLine, startLine);
      }

      const chunkContent = this.getContentRange(lines, startLine, endLine);

      // Only create chunk if it meets minimum size or is the last chunk
      const chunkTokens = this.estimateTokens(chunkContent);
      if (chunkTokens >= options.minChunkSize || startLine + linesPerChunk > lines.length) {
        chunks.push(
          this.createChunk(
            file,
            chunkContent,
            startLine,
            endLine,
            'block',
            this.extractSymbolsFromContent(chunkContent),
            language,
            projectId
          )
        );
      }

      // Move to next chunk, accounting for overlap
      startLine = endLine + 1 - overlapLines;
      if (startLine <= endLine) {
        startLine = endLine + 1; // Prevent infinite loop
      }
    }

    return chunks;
  }

  /**
   * Find a good boundary for chunking (function end, class end, etc.)
   * @param lines - File lines
   * @param targetLine - Target end line
   * @param startLine - Start line of current chunk
   * @returns Adjusted end line
   */
  private findBoundary(
    lines: string[],
    targetLine: number,
    startLine: number
  ): number {
    const searchRange = 10; // Look up to 10 lines before or after

    // Look for closing braces, which often indicate end of blocks
    for (let i = targetLine - 1; i >= Math.max(startLine, targetLine - searchRange); i--) {
      const line = lines[i - 1]; // Convert to 0-indexed
      const trimmed = line?.trim() ?? '';

      // End of function/class/block
      if (trimmed === '}' || trimmed === '};' || trimmed.endsWith('}')) {
        return i;
      }

      // Blank line can be a good break point
      if (trimmed === '') {
        return i;
      }
    }

    return targetLine;
  }

  // ============================================================================
  // Private Methods - Chunk Creation
  // ============================================================================

  /**
   * Create a CodeChunk object
   * @param file - File path
   * @param content - Chunk content
   * @param startLine - Starting line number (1-indexed)
   * @param endLine - Ending line number (1-indexed)
   * @param chunkType - Type of chunk
   * @param symbols - Symbol names in this chunk
   * @param language - Programming language
   * @param projectId - Project ID
   * @param documentation - Optional documentation string
   * @returns CodeChunk object
   */
  private createChunk(
    file: string,
    content: string,
    startLine: number,
    endLine: number,
    chunkType: CodeChunkType,
    symbols: string[],
    language: string,
    projectId: string,
    documentation?: string
  ): CodeChunk {
    const hash = this.calculateHash(content);
    const id = this.generateChunkId(projectId, file, startLine, endLine);

    const metadata: CodeChunkMetadata = {
      language,
      hash,
      dependencies: this.extractDependencies(content),
      exports: this.extractExportsFromContent(content),
      complexity: this.estimateComplexity(content),
      documentation,
    };

    return {
      id,
      projectId,
      file,
      startLine,
      endLine,
      content,
      embedding: [], // Embeddings are generated separately
      symbols,
      chunkType,
      metadata,
      indexedAt: new Date(),
    };
  }

  /**
   * Generate a unique chunk ID
   * @param projectId - Project ID
   * @param file - File path
   * @param startLine - Start line
   * @param endLine - End line
   * @returns Unique ID string
   */
  private generateChunkId(
    projectId: string,
    file: string,
    startLine: number,
    endLine: number
  ): string {
    // Create a deterministic but unique ID based on content location
    const fileName = basename(file);
    const hash = createHash('md5')
      .update(`${projectId}-${file}-${startLine}-${endLine}`)
      .digest('hex')
      .slice(0, 8);
    return `${fileName}-${startLine}-${endLine}-${hash}`;
  }

  // ============================================================================
  // Private Methods - Language Detection
  // ============================================================================

  /**
   * Detect programming language from file extension
   * @param file - File path
   * @returns Detected language or 'unknown'
   */
  private detectLanguage(file: string): string {
    const ext = extname(file).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
      case '.mts':
        return 'typescript';
      case '.js':
      case '.jsx':
      case '.mjs':
        return 'javascript';
      case '.json':
        return 'json';
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.css':
      case '.scss':
      case '.less':
        return 'css';
      case '.html':
      case '.htm':
        return 'html';
      case '.py':
        return 'python';
      case '.rb':
        return 'ruby';
      case '.go':
        return 'go';
      case '.rs':
        return 'rust';
      case '.java':
        return 'java';
      case '.c':
      case '.h':
        return 'c';
      case '.cpp':
      case '.hpp':
      case '.cc':
        return 'cpp';
      default:
        return 'unknown';
    }
  }

  // ============================================================================
  // Private Methods - Content Extraction
  // ============================================================================

  /**
   * Calculate SHA-256 hash of content
   * @param content - Content to hash
   * @returns Hex digest string
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract dependencies (imports/requires) from content
   * @param content - Code content
   * @returns Array of dependency module names
   */
  private extractDependencies(content: string): string[] {
    const dependencies: Set<string> = new Set();

    // ES6 imports: import X from 'module' or import { X } from 'module'
    const importRegex = /import\s+(?:[\w{}\s*,]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        dependencies.add(match[1]);
      }
    }

    // CommonJS requires: require('module')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      if (match[1]) {
        dependencies.add(match[1]);
      }
    }

    // Dynamic imports: import('module')
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      if (match[1]) {
        dependencies.add(match[1]);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Extract exports from content
   * @param content - Code content
   * @returns Array of exported symbol names
   */
  private extractExportsFromContent(content: string): string[] {
    const exports: Set<string> = new Set();

    // Named exports: export { x, y }
    const namedExportRegex = /export\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map((n) => {
        const parts = n.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      names.forEach((name) => {
        if (name) exports.add(name);
      });
    }

    // Export declarations: export function X, export class Y, export const Z
    const exportDeclRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
    while ((match = exportDeclRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.add(match[1]);
      }
    }

    // Default export
    if (/export\s+default\s+/.test(content)) {
      exports.add('default');
    }

    return Array.from(exports);
  }

  /**
   * Extract import symbols from preamble content
   * @param content - Preamble content (imports area)
   * @returns Array of imported symbol names
   */
  private extractImportSymbols(content: string): string[] {
    const symbols: Set<string> = new Set();

    // Named imports: import { x, y as z } from 'module'
    const namedImportRegex = /import\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = namedImportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map((n) => {
        const parts = n.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      names.forEach((name) => {
        if (name) symbols.add(name);
      });
    }

    // Default imports: import X from 'module'
    const defaultImportRegex = /import\s+(\w+)\s+from/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
      if (match[1] && match[1] !== 'type') {
        symbols.add(match[1]);
      }
    }

    // Namespace imports: import * as X from 'module'
    const namespaceImportRegex = /import\s*\*\s*as\s+(\w+)/g;
    while ((match = namespaceImportRegex.exec(content)) !== null) {
      if (match[1]) {
        symbols.add(match[1]);
      }
    }

    return Array.from(symbols);
  }

  /**
   * Extract symbol names from content using simple regex
   * @param content - Code content
   * @returns Array of symbol names
   */
  private extractSymbolsFromContent(content: string): string[] {
    const symbols: Set<string> = new Set();

    // Functions
    const funcRegex = /(?:function|const|let|var)\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = funcRegex.exec(content)) !== null) {
      if (match[1]) symbols.add(match[1]);
    }

    // Classes
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      if (match[1]) symbols.add(match[1]);
    }

    // Interfaces and types
    const typeRegex = /(?:interface|type)\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      if (match[1]) symbols.add(match[1]);
    }

    return Array.from(symbols);
  }

  /**
   * Get content for a range of lines
   * @param lines - All lines of the file
   * @param startLine - Start line (1-indexed)
   * @param endLine - End line (1-indexed, inclusive)
   * @returns Content string
   */
  private getContentRange(lines: string[], startLine: number, endLine: number): string {
    // Convert to 0-indexed
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, endLine);
    return lines.slice(start, end).join('\n');
  }

  // ============================================================================
  // Private Methods - Project ID
  // ============================================================================

  /**
   * Extract project ID from file path
   * @param file - File path
   * @returns Project ID
   */
  private getProjectId(file: string): string {
    // If a project ID was configured, use it
    if (this.projectId !== DEFAULT_PROJECT_ID) {
      return this.projectId;
    }

    // Try to extract from path (look for common project root indicators)
    const dir = dirname(file);
    const parts = dir.split(/[/\\]/);

    // Look for src, lib, or package name
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part === 'src' || part === 'lib') {
        // Use parent directory as project ID
        return parts[i - 1] ?? DEFAULT_PROJECT_ID;
      }
    }

    // Use the last non-empty directory name
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && parts[i] !== '.') {
        return parts[i];
      }
    }

    return DEFAULT_PROJECT_ID;
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Convert symbol kind to chunk type
   * @param kind - Symbol kind
   * @returns Corresponding chunk type
   */
  private symbolKindToChunkType(kind: string): CodeChunkType {
    return SYMBOL_TO_CHUNK_TYPE[kind] ?? 'block';
  }

  /**
   * Estimate token count for content
   * @param content - Content to estimate
   * @returns Estimated token count
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }

  /**
   * Estimate cyclomatic complexity of content
   * Simple heuristic based on control flow keywords
   * @param content - Code content
   * @returns Complexity score
   */
  private estimateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count control flow statements
    const controlKeywords = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]/g, // Ternary operator
      /&&/g, // Logical AND
      /\|\|/g, // Logical OR
    ];

    for (const regex of controlKeywords) {
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let singletonChunker: CodeChunker | null = null;

/**
 * Get singleton CodeChunker instance
 * @param options - Optional chunking options
 * @returns CodeChunker instance
 */
export function getCodeChunker(options?: Partial<ChunkingOptions>): CodeChunker {
  if (!singletonChunker) {
    singletonChunker = new CodeChunker(undefined, options);
  }
  return singletonChunker;
}

/**
 * Create a new CodeChunker instance
 * @param parser - Optional TreeSitterParser
 * @param options - Optional chunking options
 * @param projectId - Optional project ID
 * @returns New CodeChunker instance
 */
export function createCodeChunker(
  parser?: TreeSitterParser,
  options?: Partial<ChunkingOptions>,
  projectId?: string
): CodeChunker {
  return new CodeChunker(parser, options, projectId);
}

/**
 * Reset singleton (for testing)
 */
export function resetCodeChunker(): void {
  singletonChunker = null;
}
