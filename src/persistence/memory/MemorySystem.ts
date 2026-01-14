/**
 * MemorySystem - Stub implementation for TDD RED phase
 *
 * This file contains type definitions and stub implementations that will
 * allow tests to compile but fail.
 */

import type { DatabaseClient } from '../database/DatabaseClient';
import type { EmbeddingsService } from './EmbeddingsService';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for memory operations
 */
export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when an episode is not found
 */
export class EpisodeNotFoundError extends MemoryError {
  public readonly episodeId: string;

  constructor(episodeId: string) {
    super(`Episode not found: ${episodeId}`);
    this.name = 'EpisodeNotFoundError';
    this.episodeId = episodeId;
  }
}

/**
 * Error thrown for query-related issues
 */
export class QueryError extends MemoryError {
  public readonly reason: string;

  constructor(reason: string) {
    super(`Query error: ${reason}`);
    this.name = 'QueryError';
    this.reason = reason;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Episode types
 */
export type EpisodeType =
  | 'code_generation'
  | 'error_fix'
  | 'review_feedback'
  | 'decision'
  | 'research';

/**
 * Input for storing a new episode
 */
export interface EpisodeInput {
  type: EpisodeType;
  content: string;
  projectId: string;
  summary?: string;
  context?: Record<string, unknown>;
  taskId?: string;
  agentId?: string;
  importance?: number;
}

/**
 * Stored episode with full data
 */
export interface Episode {
  id: string;
  projectId: string;
  type: EpisodeType;
  content: string;
  summary: string | null;
  embedding: string | null;
  context: string | null;
  taskId: string | null;
  agentId: string | null;
  importance: number | null;
  accessCount: number | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
}

/**
 * MemorySystem constructor options
 */
export interface MemorySystemOptions {
  /** Database client */
  db: DatabaseClient;
  /** Embeddings service for generating embeddings */
  embeddingsService: EmbeddingsService;
  /** Optional project scope */
  projectId?: string;
  /** Optional logger */
  logger?: Logger;
}

// ============================================================================
// MemorySystem Implementation (Stub)
// ============================================================================

/**
 * MemorySystem stores and retrieves episodic memories using semantic similarity.
 *
 * Stub implementation - all methods throw NotImplementedError.
 */
export class MemorySystem {
  constructor(_options: MemorySystemOptions) {
    // Stub - not implemented
  }

  /**
   * Store a new episode
   */
  async storeEpisode(_input: EpisodeInput): Promise<Episode> {
    throw new Error('Not implemented');
  }

  /**
   * Query memory for relevant episodes
   */
  async queryMemory(_query: string, _limit?: number): Promise<Episode[]> {
    throw new Error('Not implemented');
  }

  /**
   * Get relevant context for a task
   */
  async getRelevantContext(_taskId: string, _maxTokens: number): Promise<string> {
    throw new Error('Not implemented');
  }

  /**
   * Prune episodes older than maxAge seconds
   */
  async pruneOldEpisodes(_maxAge: number): Promise<number> {
    throw new Error('Not implemented');
  }

  /**
   * Prune to keep only maxCount episodes
   */
  async pruneByCount(_maxCount: number): Promise<number> {
    throw new Error('Not implemented');
  }
}
