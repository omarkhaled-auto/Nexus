/**
 * MemorySystem - Episodic memory storage and retrieval using semantic similarity
 *
 * Features:
 * - Store episodes with auto-generated embeddings
 * - Query memory using cosine similarity search
 * - Context retrieval for tasks
 * - Memory pruning by age and count
 */

import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database/DatabaseClient';
import { episodes, type NewEpisode } from '../database/schema';
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
// Utility Functions
// ============================================================================

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

// ============================================================================
// MemorySystem Implementation
// ============================================================================

/**
 * MemorySystem stores and retrieves episodic memories using semantic similarity.
 *
 * Features:
 * - Store episodes with auto-generated embeddings
 * - Query memory using cosine similarity search
 * - Context retrieval for tasks
 * - Memory pruning by age and count
 */
export class MemorySystem {
  private readonly db: DatabaseClient;
  private readonly embeddingsService: EmbeddingsService;
  private readonly projectId?: string;
  private readonly logger?: Logger;

  constructor(options: MemorySystemOptions) {
    this.db = options.db;
    this.embeddingsService = options.embeddingsService;
    this.projectId = options.projectId;
    this.logger = options.logger;
  }

  /**
   * Log a message if logger is available
   */
  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Store a new episode
   */
  async storeEpisode(input: EpisodeInput): Promise<Episode> {
    this.log('debug', `Storing episode of type ${input.type}`);

    const id = uuidv4();
    const now = new Date();

    // Extract summary if not provided (first 200 chars)
    const summary = input.summary ?? input.content.substring(0, 200);

    // Generate embedding (handle failures gracefully)
    let embeddingJson: string | null = null;
    try {
      const embedding = await this.embeddingsService.embed(input.content);
      embeddingJson = JSON.stringify(embedding);
    } catch (error) {
      this.log('warn', 'Failed to generate embedding, storing episode without embedding', error);
    }

    // Serialize context
    const contextJson = input.context ? JSON.stringify(input.context) : null;

    // Create episode record
    const newEpisode: NewEpisode = {
      id,
      projectId: input.projectId,
      type: input.type,
      content: input.content,
      summary,
      embedding: embeddingJson,
      context: contextJson,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
      importance: input.importance ?? 1.0,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: now,
    };

    // Insert into database
    this.db.db.insert(episodes).values(newEpisode).run();

    return {
      id,
      projectId: input.projectId,
      type: input.type,
      content: input.content,
      summary,
      embedding: embeddingJson,
      context: contextJson,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
      importance: input.importance ?? 1.0,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: now,
    };
  }

  /**
   * Query memory for relevant episodes
   */
  async queryMemory(query: string, limit: number = 10): Promise<Episode[]> {
    this.log('debug', `Querying memory: "${query.substring(0, 50)}..."`);

    // Get query embedding
    const queryEmbedding = await this.embeddingsService.embed(query);

    // Get all episodes for this project
    const whereClause = this.projectId
      ? eq(episodes.projectId, this.projectId)
      : undefined;

    const allEpisodes = whereClause
      ? this.db.db.select().from(episodes).where(whereClause).all()
      : this.db.db.select().from(episodes).all();

    if (allEpisodes.length === 0) {
      return [];
    }

    // Calculate similarity scores and sort
    const scoredEpisodes: { episode: typeof allEpisodes[0]; score: number }[] = [];

    for (const episode of allEpisodes) {
      if (episode.embedding) {
        try {
          const embedding = JSON.parse(episode.embedding) as number[];
          const score = cosineSimilarity(queryEmbedding, embedding);
          scoredEpisodes.push({ episode, score });
        } catch {
          // Skip episodes with invalid embeddings
          this.log('warn', `Invalid embedding for episode ${episode.id}`);
        }
      }
    }

    // Sort by similarity score (descending)
    scoredEpisodes.sort((a, b) => b.score - a.score);

    // Take top results
    const results = scoredEpisodes.slice(0, limit);

    // Update access counts and timestamps
    const now = new Date();
    for (const { episode } of results) {
      this.db.db
        .update(episodes)
        .set({
          accessCount: (episode.accessCount ?? 0) + 1,
          lastAccessedAt: now,
        })
        .where(eq(episodes.id, episode.id))
        .run();
    }

    // Return episodes with updated access info
    return results.map(({ episode }) => ({
      id: episode.id,
      projectId: episode.projectId,
      type: episode.type as EpisodeType,
      content: episode.content,
      summary: episode.summary,
      embedding: episode.embedding,
      context: episode.context,
      taskId: episode.taskId,
      agentId: episode.agentId,
      importance: episode.importance,
      accessCount: (episode.accessCount ?? 0) + 1,
      lastAccessedAt: now,
      createdAt: episode.createdAt,
    }));
  }

  /**
   * Get relevant context for a task
   */
  async getRelevantContext(taskId: string, maxTokens: number): Promise<string> {
    this.log('debug', `Getting context for task ${taskId}, max tokens: ${String(maxTokens)}`);

    const maxChars = maxTokens * 4; // Approximate: 1 token ≈ 4 chars
    const contextParts: string[] = [];
    let currentChars = 0;

    // First, get task-specific episodes
    const whereClause = this.projectId
      ? and(eq(episodes.projectId, this.projectId), eq(episodes.taskId, taskId))
      : eq(episodes.taskId, taskId);

    const taskEpisodes = this.db.db
      .select()
      .from(episodes)
      .where(whereClause)
      .orderBy(desc(episodes.createdAt))
      .all();

    // Add task-specific episodes first
    for (const episode of taskEpisodes) {
      const entry = `- ${episode.summary ?? episode.content.substring(0, 200)}`;
      if (currentChars + entry.length <= maxChars) {
        contextParts.push(entry);
        currentChars += entry.length;
      }
    }

    // Fill remaining space with relevant memories
    const remainingChars = maxChars - currentChars;
    if (remainingChars > 200) {
      // Get more episodes via semantic search
      const relevantEpisodes = await this.queryMemory(
        `task ${taskId} context`,
        10
      );

      for (const episode of relevantEpisodes) {
        // Skip if already included as task-specific
        if (episode.taskId === taskId) continue;

        const entry = `- ${episode.summary ?? episode.content.substring(0, 200)}`;
        if (currentChars + entry.length <= maxChars) {
          contextParts.push(entry);
          currentChars += entry.length;
        } else {
          break;
        }
      }
    }

    if (contextParts.length === 0) {
      return '';
    }

    return `Previous relevant work:\n${contextParts.join('\n')}`;
  }

  /**
   * Prune episodes older than maxAge seconds
   * High importance episodes (importance > 1.5) have effective age halved
   */
  pruneOldEpisodes(maxAge: number): number {
    this.log('debug', `Pruning episodes older than ${String(maxAge)} seconds`);

    const now = Math.floor(Date.now() / 1000);
    const cutoffTime = now - maxAge;

    // For high importance episodes, use doubled maxAge
    const highImportanceCutoff = now - maxAge * 2;

    // Get episodes to delete
    const whereClause = this.projectId
      ? eq(episodes.projectId, this.projectId)
      : undefined;

    const allEpisodes = whereClause
      ? this.db.db.select().from(episodes).where(whereClause).all()
      : this.db.db.select().from(episodes).all();

    const toDelete: string[] = [];

    for (const episode of allEpisodes) {
      const createdAtSeconds = Math.floor(episode.createdAt.getTime() / 1000);
      const effectiveCutoff =
        (episode.importance ?? 1.0) > 1.5 ? highImportanceCutoff : cutoffTime;

      if (createdAtSeconds < effectiveCutoff) {
        toDelete.push(episode.id);
      }
    }

    // Delete episodes
    for (const id of toDelete) {
      this.db.db.delete(episodes).where(eq(episodes.id, id)).run();
    }

    this.log('info', `Pruned ${String(toDelete.length)} old episodes`);
    return toDelete.length;
  }

  /**
   * Prune to keep only maxCount episodes
   * Keeps most important and most recent episodes
   */
  pruneByCount(maxCount: number): number {
    this.log('debug', `Pruning to keep ${String(maxCount)} episodes`);

    // Get all episodes for this project
    const whereClause = this.projectId
      ? eq(episodes.projectId, this.projectId)
      : undefined;

    const allEpisodes = whereClause
      ? this.db.db.select().from(episodes).where(whereClause).all()
      : this.db.db.select().from(episodes).all();

    if (allEpisodes.length <= maxCount) {
      return 0;
    }

    // Sort by importance (desc) then by createdAt (desc)
    const sortedEpisodes = [...allEpisodes].sort((a, b) => {
      const importanceDiff = (b.importance ?? 1.0) - (a.importance ?? 1.0);
      if (importanceDiff !== 0) return importanceDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Keep top maxCount, delete the rest
    const toKeep = new Set(sortedEpisodes.slice(0, maxCount).map((e) => e.id));
    const toDelete = sortedEpisodes
      .filter((e) => !toKeep.has(e.id))
      .map((e) => e.id);

    // Delete episodes
    for (const id of toDelete) {
      this.db.db.delete(episodes).where(eq(episodes.id, id)).run();
    }

    this.log('info', `Pruned ${String(toDelete.length)} episodes by count`);
    return toDelete.length;
  }
}
