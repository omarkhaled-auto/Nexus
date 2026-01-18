/**
 * MemorySystem - Episodic memory storage and retrieval
 *
 * Provides episodic memory capabilities for the Nexus system:
 * - Store episodes of various types (code generation, error fixes, decisions, etc.)
 * - Semantic search using embeddings
 * - Similarity-based retrieval
 * - Episode lifecycle management
 *
 * Layer 6: Persistence - Memory subsystem
 *
 * @module persistence/memory/MemorySystem
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { episodes, type Episode as EpisodeRecord, type NewEpisode } from '../database/schema';
import { EmbeddingsService, type EmbeddingsServiceOptions } from './EmbeddingsService';

// ============================================================================
// Types
// ============================================================================

/**
 * Episode type categories
 */
export type EpisodeType =
  | 'code_generation'
  | 'error_fix'
  | 'review_feedback'
  | 'decision'
  | 'research';

/**
 * Episode data structure
 */
export interface Episode {
  /** Unique episode ID */
  id: string;
  /** Project this episode belongs to */
  projectId: string;
  /** Type of episode */
  type: EpisodeType;
  /** Main content of the episode */
  content: string;
  /** Short summary for display */
  summary?: string;
  /** Related task ID */
  taskId?: string;
  /** Related agent ID */
  agentId?: string;
  /** Importance score (for pruning) */
  importance: number;
  /** Number of times accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessedAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Context metadata */
  context?: Record<string, unknown>;
}

/**
 * Result from similarity search
 */
export interface SimilarityResult {
  /** The episode */
  episode: Episode;
  /** Similarity score (0-1) */
  score: number;
}

/**
 * Query options for memory search
 */
export interface MemoryQuery {
  /** Text query for semantic search */
  query: string;
  /** Limit number of results */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Filter by episode type */
  type?: EpisodeType | EpisodeType[];
  /** Filter by project ID */
  projectId?: string;
  /** Filter by task ID */
  taskId?: string;
  /** Filter by agent ID */
  agentId?: string;
}

/**
 * Result from getRelevantContext
 */
export interface ContextResult {
  /** Retrieved episodes */
  episodes: Episode[];
  /** Combined context string */
  context: string;
  /** Total tokens in context */
  tokenCount: number;
}

/**
 * Configuration options for MemorySystem
 */
export interface MemorySystemOptions {
  /** Database instance */
  db: BetterSQLite3Database;
  /** Embeddings service or options */
  embeddings: EmbeddingsService | EmbeddingsServiceOptions;
  /** Default project ID */
  projectId?: string;
  /** Maximum episodes to keep per project (for pruning) */
  maxEpisodesPerProject?: number;
  /** Enable mock mode for testing */
  mockMode?: boolean;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error for memory system operations
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

/**
 * Error when episode is not found
 */
export class EpisodeNotFoundError extends MemoryError {
  constructor(public readonly episodeId: string) {
    super(`Episode not found: ${episodeId}`);
    this.name = 'EpisodeNotFoundError';
  }
}

/**
 * Error during query operations
 */
export class QueryError extends MemoryError {
  constructor(
    message: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'QueryError';
  }
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 10;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MAX_EPISODES = 10000;
const CHARS_PER_TOKEN = 4;

// ============================================================================
// MemorySystem Implementation
// ============================================================================

/**
 * Episodic memory system for storing and retrieving contextual episodes
 */
export class MemorySystem {
  private readonly db: BetterSQLite3Database;
  private readonly embeddings: EmbeddingsService;
  private readonly projectId: string | undefined;
  private readonly maxEpisodesPerProject: number;

  constructor(options: MemorySystemOptions) {
    this.db = options.db;
    this.projectId = options.projectId;
    this.maxEpisodesPerProject = options.maxEpisodesPerProject ?? DEFAULT_MAX_EPISODES;

    // Initialize embeddings service
    if (options.embeddings instanceof EmbeddingsService) {
      this.embeddings = options.embeddings;
    } else {
      this.embeddings = new EmbeddingsService({
        ...options.embeddings,
        mockMode: options.mockMode ?? options.embeddings.mockMode,
      });
    }
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Store a new episode
   */
  async store(episode: Omit<Episode, 'id' | 'accessCount' | 'createdAt'>): Promise<Episode> {
    const id = this.generateId();
    const now = new Date();
    const projectId = episode.projectId || this.projectId;

    if (!projectId) {
      throw new MemoryError('Project ID is required');
    }

    // Generate embedding for the episode content
    let embeddingJson: string | null = null;
    try {
      const { embedding } = await this.embeddings.embed(episode.content);
      embeddingJson = JSON.stringify(embedding);
    } catch (error) {
      // Log but don't fail - episode can exist without embedding
      console.warn('Failed to generate embedding for episode:', error);
    }

    const newEpisode: NewEpisode = {
      id,
      projectId,
      type: episode.type,
      content: episode.content,
      summary: episode.summary ?? this.generateSummary(episode.content),
      embedding: embeddingJson,
      context: episode.context ? JSON.stringify(episode.context) : null,
      taskId: episode.taskId ?? null,
      agentId: episode.agentId ?? null,
      importance: episode.importance,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: now,
    };

    await this.db.insert(episodes).values(newEpisode);

    // Prune old episodes if needed
    await this.pruneIfNeeded(projectId);

    return this.recordToEpisode({ ...newEpisode, createdAt: now, lastAccessedAt: null });
  }

  /**
   * Retrieve an episode by ID
   */
  async get(episodeId: string): Promise<Episode> {
    const result = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (result.length === 0) {
      throw new EpisodeNotFoundError(episodeId);
    }

    // Update access count and timestamp
    await this.db
      .update(episodes)
      .set({
        accessCount: sql`${episodes.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId));

    return this.recordToEpisode(result[0]);
  }

  /**
   * Update an existing episode
   */
  async update(
    episodeId: string,
    updates: Partial<Pick<Episode, 'content' | 'summary' | 'importance' | 'context'>>
  ): Promise<Episode> {
    const existing = await this.get(episodeId);

    const updateData: Partial<NewEpisode> = {};

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.summary = updates.summary ?? this.generateSummary(updates.content);

      // Regenerate embedding for new content
      try {
        const { embedding } = await this.embeddings.embed(updates.content);
        updateData.embedding = JSON.stringify(embedding);
      } catch {
        // Keep existing embedding if generation fails
      }
    }

    if (updates.summary !== undefined && updates.content === undefined) {
      updateData.summary = updates.summary;
    }

    if (updates.importance !== undefined) {
      updateData.importance = updates.importance;
    }

    if (updates.context !== undefined) {
      updateData.context = JSON.stringify(updates.context);
    }

    if (Object.keys(updateData).length > 0) {
      await this.db.update(episodes).set(updateData).where(eq(episodes.id, episodeId));
    }

    return {
      ...existing,
      ...updates,
    };
  }

  /**
   * Delete an episode
   */
  async delete(episodeId: string): Promise<void> {
    const result = await this.db
      .delete(episodes)
      .where(eq(episodes.id, episodeId))
      .returning({ id: episodes.id });

    if (result.length === 0) {
      throw new EpisodeNotFoundError(episodeId);
    }
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Search for similar episodes using semantic similarity
   */
  async search(
    query: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<Array<{ id: string; content: string; score: number; source: string }>> {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

    try {
      // Generate query embedding
      const { embedding: queryEmbedding } = await this.embeddings.embed(query);

      // Get all episodes with embeddings
      const allEpisodes = await this.db
        .select()
        .from(episodes)
        .where(this.projectId ? eq(episodes.projectId, this.projectId) : undefined);

      // Calculate similarities
      const results: Array<{ id: string; content: string; score: number; source: string }> = [];

      for (const episode of allEpisodes) {
        if (!episode.embedding) continue;

        try {
          const episodeEmbedding = JSON.parse(episode.embedding) as number[];
          const similarity = this.embeddings.cosineSimilarity(queryEmbedding, episodeEmbedding);

          if (similarity >= threshold) {
            results.push({
              id: episode.id,
              content: episode.content,
              score: similarity,
              source: `episode:${episode.type}`,
            });
          }
        } catch {
          // Skip episodes with invalid embeddings
        }
      }

      // Sort by score and limit
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } catch (error) {
      throw new QueryError(
        'Failed to search episodes',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Query episodes with multiple filters
   */
  async query(query: MemoryQuery): Promise<SimilarityResult[]> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const threshold = query.threshold ?? DEFAULT_THRESHOLD;
    const projectId = query.projectId ?? this.projectId;

    try {
      // Generate query embedding
      const { embedding: queryEmbedding } = await this.embeddings.embed(query.query);

      // Build filter conditions
      const conditions: ReturnType<typeof eq>[] = [];
      if (projectId) {
        conditions.push(eq(episodes.projectId, projectId));
      }
      if (query.taskId) {
        conditions.push(eq(episodes.taskId, query.taskId));
      }
      if (query.agentId) {
        conditions.push(eq(episodes.agentId, query.agentId));
      }

      // Get filtered episodes
      let filteredEpisodes: EpisodeRecord[];
      if (conditions.length > 0) {
        filteredEpisodes = await this.db
          .select()
          .from(episodes)
          .where(and(...conditions));
      } else {
        filteredEpisodes = await this.db.select().from(episodes);
      }

      // Filter by type if specified
      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        filteredEpisodes = filteredEpisodes.filter((e) => types.includes(e.type as EpisodeType));
      }

      // Calculate similarities
      const results: SimilarityResult[] = [];

      for (const episode of filteredEpisodes) {
        if (!episode.embedding) continue;

        try {
          const episodeEmbedding = JSON.parse(episode.embedding) as number[];
          const score = this.embeddings.cosineSimilarity(queryEmbedding, episodeEmbedding);

          if (score >= threshold) {
            results.push({
              episode: this.recordToEpisode(episode),
              score,
            });
          }
        } catch {
          // Skip episodes with invalid embeddings
        }
      }

      // Sort by score and limit
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } catch (error) {
      throw new QueryError(
        'Failed to query episodes',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get relevant context for a given query
   */
  async getRelevant(
    query: string,
    options?: {
      maxTokens?: number;
      types?: EpisodeType[];
      projectId?: string;
    }
  ): Promise<ContextResult> {
    const maxTokens = options?.maxTokens ?? 4000;
    const projectId = options?.projectId ?? this.projectId;

    const searchResults = await this.query({
      query,
      limit: 20,
      threshold: 0.3,
      type: options?.types,
      projectId,
    });

    // Build context within token budget
    const includedEpisodes: Episode[] = [];
    const contextParts: string[] = [];
    let totalTokens = 0;

    for (const result of searchResults) {
      const episodeContext = this.formatEpisodeContext(result.episode);
      const episodeTokens = Math.ceil(episodeContext.length / CHARS_PER_TOKEN);

      if (totalTokens + episodeTokens > maxTokens) break;

      includedEpisodes.push(result.episode);
      contextParts.push(episodeContext);
      totalTokens += episodeTokens;

      // Update access for included episodes
      await this.db
        .update(episodes)
        .set({
          accessCount: sql`${episodes.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(episodes.id, result.episode.id));
    }

    return {
      episodes: includedEpisodes,
      context: contextParts.join('\n\n'),
      tokenCount: totalTokens,
    };
  }

  // ============================================================================
  // Listing and Statistics
  // ============================================================================

  /**
   * List recent episodes
   */
  async listRecent(options?: {
    projectId?: string;
    limit?: number;
    type?: EpisodeType;
  }): Promise<Episode[]> {
    const projectId = options?.projectId ?? this.projectId;
    const limit = options?.limit ?? 20;

    const conditions: ReturnType<typeof eq>[] = [];
    if (projectId) {
      conditions.push(eq(episodes.projectId, projectId));
    }
    if (options?.type) {
      conditions.push(eq(episodes.type, options.type));
    }

    let query = this.db.select().from(episodes);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query.orderBy(desc(episodes.createdAt)).limit(limit);

    return result.map((r) => this.recordToEpisode(r));
  }

  /**
   * Get episode count by type
   */
  async getStats(projectId?: string): Promise<Record<EpisodeType, number>> {
    const pid = projectId ?? this.projectId;

    const allEpisodes = pid
      ? await this.db.select().from(episodes).where(eq(episodes.projectId, pid))
      : await this.db.select().from(episodes);

    const stats: Record<EpisodeType, number> = {
      code_generation: 0,
      error_fix: 0,
      review_feedback: 0,
      decision: 0,
      research: 0,
    };

    for (const episode of allEpisodes) {
      const type = episode.type as EpisodeType;
      if (type in stats) {
        stats[type]++;
      }
    }

    return stats;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Generate a summary from content
   */
  private generateSummary(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert database record to Episode
   */
  private recordToEpisode(record: EpisodeRecord): Episode {
    return {
      id: record.id,
      projectId: record.projectId,
      type: record.type as EpisodeType,
      content: record.content,
      summary: record.summary ?? undefined,
      taskId: record.taskId ?? undefined,
      agentId: record.agentId ?? undefined,
      importance: record.importance ?? 1.0,
      accessCount: record.accessCount ?? 0,
      lastAccessedAt: record.lastAccessedAt ?? undefined,
      createdAt: record.createdAt,
      context: record.context ? (JSON.parse(record.context) as Record<string, unknown>) : undefined,
    };
  }

  /**
   * Format episode for context inclusion
   */
  private formatEpisodeContext(episode: Episode): string {
    const header = `[${episode.type.toUpperCase()}]`;
    const timestamp = episode.createdAt.toISOString().split('T')[0];
    return `${header} (${timestamp}):\n${episode.content}`;
  }

  /**
   * Prune old episodes if over limit
   */
  private async pruneIfNeeded(projectId: string): Promise<void> {
    const count = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(episodes)
      .where(eq(episodes.projectId, projectId));

    const totalCount = count[0]?.count ?? 0;

    if (totalCount > this.maxEpisodesPerProject) {
      // Delete oldest, least important episodes
      const toDelete = totalCount - this.maxEpisodesPerProject;

      // Get IDs of episodes to delete (sorted by importance and access)
      const episodesToDelete = await this.db
        .select({ id: episodes.id })
        .from(episodes)
        .where(eq(episodes.projectId, projectId))
        .orderBy(episodes.importance, episodes.accessCount, episodes.createdAt)
        .limit(toDelete);

      for (const { id } of episodesToDelete) {
        await this.db.delete(episodes).where(eq(episodes.id, id));
      }
    }
  }

  /**
   * Clear all episodes for a project (useful for testing)
   */
  async clear(projectId?: string): Promise<number> {
    const pid = projectId ?? this.projectId;

    if (pid) {
      const result = await this.db
        .delete(episodes)
        .where(eq(episodes.projectId, pid))
        .returning({ id: episodes.id });
      return result.length;
    } else {
      const result = await this.db.delete(episodes).returning({ id: episodes.id });
      return result.length;
    }
  }
}
