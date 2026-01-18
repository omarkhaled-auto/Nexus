/**
 * File Request Handler
 *
 * Handles file content requests from agents.
 * Reads file contents and returns them as context responses.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * @module FileRequestHandler
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { normalize, resolve, relative, isAbsolute } from 'pathe';

import type {
  ContextRequest,
  ContextRequestType,
  ContextResponse,
  IRequestHandler} from '../types';
import {
  DEFAULT_REQUEST_OPTIONS,
} from '../types';

/**
 * Configuration options for FileRequestHandler
 */
export interface FileRequestHandlerOptions {
  /** Project root path for resolving relative paths */
  projectRoot: string;
  /** Maximum file size in bytes (default: 1MB) */
  maxFileSize?: number;
  /** Whether to allow reading files outside project root */
  allowOutsideProject?: boolean;
}

/**
 * Default handler options
 */
const DEFAULT_OPTIONS: Required<Omit<FileRequestHandlerOptions, 'projectRoot'>> = {
  maxFileSize: 1024 * 1024, // 1MB
  allowOutsideProject: false,
};

/**
 * FileRequestHandler - Handles 'file' type context requests
 *
 * Reads file contents and returns them as context responses.
 * Supports path resolution, truncation, and security validation.
 */
export class FileRequestHandler implements IRequestHandler {
  private readonly projectRoot: string;
  private readonly maxFileSize: number;
  private readonly allowOutsideProject: boolean;

  /**
   * Create a new FileRequestHandler
   *
   * @param options Handler configuration
   */
  constructor(options: FileRequestHandlerOptions) {
    this.projectRoot = normalize(options.projectRoot);
    this.maxFileSize = options.maxFileSize ?? DEFAULT_OPTIONS.maxFileSize;
    this.allowOutsideProject = options.allowOutsideProject ?? DEFAULT_OPTIONS.allowOutsideProject;
  }

  /**
   * Check if this handler can process the given request type
   */
  canHandle(type: ContextRequestType): boolean {
    return type === 'file';
  }

  /**
   * Handle a file content request
   */
  async handle(request: ContextRequest): Promise<ContextResponse> {
    const { query: filePath, options } = request;
    const maxTokens = options?.maxTokens ?? DEFAULT_REQUEST_OPTIONS.maxTokens;

    try {
      // Resolve and validate the file path
      const resolvedPath = this.resolveFilePath(filePath);

      // Validate path is within project (security check)
      if (!this.isPathAllowed(resolvedPath)) {
        return this.createErrorResponse(
          request,
          `Path '${filePath}' is outside the project root and access is not allowed`
        );
      }

      // Check file exists
      if (!existsSync(resolvedPath)) {
        return this.createErrorResponse(
          request,
          `File not found: ${filePath}`
        );
      }

      // Check it's a file, not a directory
      const stats = statSync(resolvedPath);
      if (stats.isDirectory()) {
        return this.createErrorResponse(
          request,
          `Path is a directory, not a file: ${filePath}`
        );
      }

      // Check file size
      if (stats.size > this.maxFileSize) {
        return this.createErrorResponse(
          request,
          `File exceeds maximum size (${this.formatBytes(stats.size)} > ${this.formatBytes(this.maxFileSize)})`
        );
      }

      // Read file content
      const content = this.readFileContent(resolvedPath);

      // Truncate if needed based on token budget
      const { truncatedContent, wasTruncated } = this.truncateContent(content, maxTokens);

      // Calculate token count
      const tokenCount = this.estimateTokens(truncatedContent);

      // Build metadata
      const metadata: Record<string, unknown> = {
        filePath: resolvedPath,
        relativePath: relative(this.projectRoot, resolvedPath),
        fileSize: stats.size,
        wasTruncated,
        language: this.detectLanguage(resolvedPath),
      };

      if (wasTruncated) {
        metadata.originalTokens = this.estimateTokens(content);
        metadata.truncatedAt = maxTokens;
      }

      return {
        success: true,
        requestId: '', // Will be set by DynamicContextProvider
        type: 'file',
        content: truncatedContent,
        tokenCount,
        source: resolvedPath,
        metadata,
      };
    } catch (error) {
      return this.createErrorResponse(
        request,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Resolve a file path relative to project root
   *
   * Handles:
   * - Absolute paths (returned as-is)
   * - Relative paths (resolved from project root)
   * - Path normalization (cross-platform)
   */
  private resolveFilePath(filePath: string): string {
    const normalized = normalize(filePath);

    // If absolute path, return normalized
    if (isAbsolute(normalized)) {
      return normalized;
    }

    // Otherwise resolve relative to project root
    return resolve(this.projectRoot, normalized);
  }

  /**
   * Check if a path is allowed based on security settings
   */
  private isPathAllowed(resolvedPath: string): boolean {
    if (this.allowOutsideProject) {
      return true;
    }

    // Check if path starts with project root
    const relativePath = relative(this.projectRoot, resolvedPath);

    // If relative path starts with '..' it's outside project root
    return !relativePath.startsWith('..');
  }

  /**
   * Read file content as UTF-8 string
   */
  private readFileContent(filePath: string): string {
    return readFileSync(filePath, 'utf-8');
  }

  /**
   * Truncate content to fit within token budget
   *
   * Truncates at line boundaries to avoid cutting code mid-line.
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
    // Using ~4 characters per token as rough estimate
    const charLimit = maxTokens * 4;

    // Find the last line break before the limit
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
    const truncationIndicator = '\n\n... [Content truncated due to token limit] ...';
    truncatedContent = truncatedContent.trimEnd() + truncationIndicator;

    return { truncatedContent, wasTruncated: true };
  }

  /**
   * Estimate token count for content
   *
   * Uses a simple approximation of ~4 characters per token.
   * This is a rough estimate - actual token count varies by model.
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      dockerfile: 'dockerfile',
    };

    return languageMap[ext] ?? 'unknown';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      type: 'file',
      content: '',
      tokenCount: 0,
      source: request.query,
      error: errorMessage,
    };
  }
}

/**
 * Factory function to create a FileRequestHandler
 */
export function createFileRequestHandler(
  projectRoot: string,
  options?: Omit<FileRequestHandlerOptions, 'projectRoot'>
): FileRequestHandler {
  return new FileRequestHandler({ projectRoot, ...options });
}
