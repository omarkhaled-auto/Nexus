/**
 * GeminiCLIClient Types - Type definitions for Gemini CLI client
 * Phase 16: Full CLI Support Integration
 *
 * Based on Gemini CLI research (version 0.24.0):
 * - JSON output: `-o json` returns `{"session_id":"...","response":"...","stats":{...}}`
 * - Streaming: `-o stream-json` returns NDJSON format
 * - Non-interactive: `--yolo` flag
 * - Model selection: `-m, --model gemini-2.5-pro`
 */

import type { Logger } from '../types';
import type { GEMINI_MODELS } from '../models';
import { DEFAULT_GEMINI_MODEL } from '../models';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for Gemini CLI client
 */
export interface GeminiCLIConfig {
  /** Path to gemini CLI binary (default: 'gemini') */
  cliPath?: string;

  /** Working directory for CLI execution */
  workingDirectory?: string;

  /** Timeout in milliseconds (default: 300000 = 5 min) */
  timeout?: number;

  /** Maximum retry attempts (default: 2) */
  maxRetries?: number;

  /** Model to use - see src/llm/models.ts for available models */
  model?: string;

  /** Additional CLI flags */
  additionalFlags?: string[];

  /** Optional logger */
  logger?: Logger;
}

/**
 * Default configuration values for Gemini CLI client
 */
export const DEFAULT_GEMINI_CLI_CONFIG: Required<
  Omit<GeminiCLIConfig, 'additionalFlags' | 'logger'>
> = {
  cliPath: 'gemini',
  workingDirectory: process.cwd(),
  timeout: 300000, // 5 minutes
  maxRetries: 2,
  model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
};

// ============================================================================
// Response Types
// ============================================================================

/**
 * Token statistics from Gemini CLI JSON response
 * Located at: stats.models.<model-name>.tokens
 */
export interface GeminiTokenStats {
  input: number;
  prompt: number;
  candidates: number;
  total: number;
  cached: number;
  thoughts: number;
  tool: number;
}

/**
 * API statistics from Gemini CLI JSON response
 * Located at: stats.models.<model-name>.api
 */
export interface GeminiAPIStats {
  totalRequests: number;
  totalErrors: number;
  totalLatencyMs: number;
}

/**
 * Model statistics from Gemini CLI JSON response
 */
export interface GeminiModelStats {
  api: GeminiAPIStats;
  tokens: GeminiTokenStats;
}

/**
 * Full stats object from Gemini CLI JSON response
 */
export interface GeminiCLIStats {
  models: Record<string, GeminiModelStats>;
  tools: {
    totalCalls: number;
    [key: string]: unknown;
  };
  files: {
    totalLinesAdded: number;
    totalLinesRemoved: number;
    [key: string]: unknown;
  };
}

/**
 * Raw JSON response from Gemini CLI when using `-o json`
 */
export interface GeminiCLIRawResponse {
  session_id: string;
  response: string;
  stats: GeminiCLIStats;
}

/**
 * Parsed response from GeminiCLIClient
 */
export interface GeminiCLIResponse {
  content: string;
  model: string;
  sessionId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    thoughtTokens?: number;
  };
  latencyMs?: number;
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Stream chunk types from Gemini CLI `-o stream-json` output
 */
export type GeminiStreamChunkType = 'init' | 'message' | 'result' | 'error';

/**
 * Base stream chunk from NDJSON output
 */
export interface GeminiStreamChunkBase {
  type: GeminiStreamChunkType;
  timestamp: string;
}

/**
 * Init chunk - sent at start of stream
 */
export interface GeminiStreamInitChunk extends GeminiStreamChunkBase {
  type: 'init';
  session_id: string;
  model: string;
}

/**
 * Message chunk - contains response content
 */
export interface GeminiStreamMessageChunk extends GeminiStreamChunkBase {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
  delta?: boolean;
}

/**
 * Result chunk - sent at end of stream with stats
 */
export interface GeminiStreamResultChunk extends GeminiStreamChunkBase {
  type: 'result';
  status: 'success' | 'error';
  stats?: GeminiCLIStats;
}

/**
 * Error chunk - sent on error
 */
export interface GeminiStreamErrorChunk extends GeminiStreamChunkBase {
  type: 'error';
  error: string;
  code?: string;
}

/**
 * Union of all stream chunk types
 */
export type GeminiStreamChunk =
  | GeminiStreamInitChunk
  | GeminiStreamMessageChunk
  | GeminiStreamResultChunk
  | GeminiStreamErrorChunk;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes that may be returned by Gemini CLI
 */
export type GeminiCLIErrorCode =
  | 'CLI_NOT_FOUND'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

/**
 * Structured error information
 */
export interface GeminiCLIErrorInfo {
  code: GeminiCLIErrorCode;
  message: string;
  retriable: boolean;
  originalError?: Error;
}

/**
 * Map of error patterns to structured error codes
 */
export const GEMINI_ERROR_PATTERNS: Array<{
  pattern: RegExp;
  code: GeminiCLIErrorCode;
  retriable: boolean;
}> = [
  { pattern: /ENOENT|not found|command not found/i, code: 'CLI_NOT_FOUND', retriable: false },
  { pattern: /auth|credentials|permission denied|401/i, code: 'AUTH_FAILED', retriable: false },
  { pattern: /timeout|timed out/i, code: 'TIMEOUT', retriable: true },
  { pattern: /rate limit|429|too many requests/i, code: 'RATE_LIMIT', retriable: true },
  { pattern: /invalid|400|bad request/i, code: 'INVALID_REQUEST', retriable: false },
  { pattern: /500|502|503|504|server error/i, code: 'SERVER_ERROR', retriable: true },
];

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Available Gemini models (typed from models.ts)
 */
export type GeminiModel = keyof typeof GEMINI_MODELS  ; // Allow custom models

/**
 * Output format options for Gemini CLI
 */
export type GeminiOutputFormat = 'text' | 'json' | 'stream-json';

/**
 * Approval mode options for Gemini CLI
 */
export type GeminiApprovalMode = 'default' | 'auto_edit' | 'yolo';
