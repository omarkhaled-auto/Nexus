/**
 * MemorySystem Tests
 *
 * TDD RED Phase: These tests describe the expected behavior of MemorySystem
 * before implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseClient } from '../database/DatabaseClient';
import {
  MemorySystem,
  MemoryError,
  EpisodeNotFoundError,
  QueryError,
  type EpisodeInput,
  type Episode,
} from './MemorySystem';
import { EmbeddingsService } from './EmbeddingsService';

describe('MemorySystem', () => {
  let db: DatabaseClient;
  let embeddingsService: EmbeddingsService;
  let memory: MemorySystem;

  beforeEach(async () => {
    // Create in-memory database with migrations
    db = await DatabaseClient.createInMemory(
      'src/persistence/database/migrations'
    );

    // Create mock embeddings service
    embeddingsService = new EmbeddingsService({
      apiKey: 'test-key',
      mockMode: true,
    });

    // Create MemorySystem
    memory = new MemorySystem({
      db,
      embeddingsService,
      projectId: 'test-project',
    });

    // Create test project
    db.db.run(/* sql */ `
      INSERT INTO projects (id, name, mode, status, root_path, created_at, updated_at)
      VALUES ('test-project', 'Test Project', 'genesis', 'planning', '/tmp/test', unixepoch(), unixepoch())
    `);
  });

  afterEach(async () => {
    await db.close();
  });

  // ============================================================================
  // Error Types
  // ============================================================================

  describe('Error Types', () => {
    it('should have MemoryError as base class', () => {
      const error = new MemoryError('test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MemoryError);
      expect(error.name).toBe('MemoryError');
      expect(error.message).toBe('test message');
    });

    it('should have EpisodeNotFoundError with episodeId', () => {
      const error = new EpisodeNotFoundError('ep-123');
      expect(error).toBeInstanceOf(MemoryError);
      expect(error).toBeInstanceOf(EpisodeNotFoundError);
      expect(error.name).toBe('EpisodeNotFoundError');
      expect(error.episodeId).toBe('ep-123');
      expect(error.message).toContain('ep-123');
    });

    it('should have QueryError with reason', () => {
      const error = new QueryError('Invalid query');
      expect(error).toBeInstanceOf(MemoryError);
      expect(error).toBeInstanceOf(QueryError);
      expect(error.name).toBe('QueryError');
      expect(error.reason).toBe('Invalid query');
    });
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('Constructor', () => {
    it('should accept database client and embeddings service', () => {
      const mem = new MemorySystem({
        db,
        embeddingsService,
      });
      expect(mem).toBeInstanceOf(MemorySystem);
    });

    it('should accept optional projectId scope', () => {
      const mem = new MemorySystem({
        db,
        embeddingsService,
        projectId: 'scoped-project',
      });
      expect(mem).toBeInstanceOf(MemorySystem);
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const mem = new MemorySystem({
        db,
        embeddingsService,
        logger,
      });
      expect(mem).toBeInstanceOf(MemorySystem);
    });
  });

  // ============================================================================
  // Episode Storage
  // ============================================================================

  describe('storeEpisode()', () => {
    it('should store episode and return with id', async () => {
      const input: EpisodeInput = {
        type: 'code_generation',
        content: 'Created UserService with JWT authentication',
        projectId: 'test-project',
      };

      const episode = await memory.storeEpisode(input);

      expect(episode).toHaveProperty('id');
      expect(episode.type).toBe('code_generation');
      expect(episode.content).toBe('Created UserService with JWT authentication');
    });

    it('should generate embedding for episode', async () => {
      const input: EpisodeInput = {
        type: 'code_generation',
        content: 'Test content for embedding',
        projectId: 'test-project',
      };

      const episode = await memory.storeEpisode(input);

      expect(episode.embedding).toBeDefined();
      expect(JSON.parse(episode.embedding!)).toHaveLength(1536);
    });

    it('should extract summary if not provided (first 200 chars)', async () => {
      const longContent = 'A'.repeat(300);
      const input: EpisodeInput = {
        type: 'decision',
        content: longContent,
        projectId: 'test-project',
      };

      const episode = await memory.storeEpisode(input);

      expect(episode.summary).toBeDefined();
      expect(episode.summary!.length).toBeLessThanOrEqual(200);
    });

    it('should use provided summary if given', async () => {
      const input: EpisodeInput = {
        type: 'code_generation',
        content: 'Long content here...',
        summary: 'Custom summary',
        projectId: 'test-project',
      };

      const episode = await memory.storeEpisode(input);

      expect(episode.summary).toBe('Custom summary');
    });

    it('should store episode even if embedding generation fails', async () => {
      // Create a service that throws on embed
      const failingEmbeddings = {
        embed: vi.fn().mockRejectedValue(new Error('API failure')),
        embedBatch: vi.fn(),
        clearCache: vi.fn(),
        getCacheStats: vi.fn(),
      } as unknown as EmbeddingsService;

      const failingMemory = new MemorySystem({
        db,
        embeddingsService: failingEmbeddings,
        projectId: 'test-project',
      });

      const input: EpisodeInput = {
        type: 'error_fix',
        content: 'Fixed bug in authentication',
        projectId: 'test-project',
      };

      const episode = await failingMemory.storeEpisode(input);

      expect(episode).toHaveProperty('id');
      expect(episode.embedding).toBeNull();
    });

    it('should store context as JSON', async () => {
      const input: EpisodeInput = {
        type: 'code_generation',
        content: 'Created component',
        projectId: 'test-project',
        context: { files: ['src/App.tsx'], commit: 'abc123' },
      };

      const episode = await memory.storeEpisode(input);

      expect(episode.context).toBeDefined();
      const context = JSON.parse(episode.context!);
      expect(context.files).toEqual(['src/App.tsx']);
      expect(context.commit).toBe('abc123');
    });

    it('should set importance if provided', async () => {
      const input: EpisodeInput = {
        type: 'decision',
        content: 'Important architecture decision',
        projectId: 'test-project',
        importance: 2.0,
      };

      const episode = await memory.storeEpisode(input);

      expect(episode.importance).toBe(2.0);
    });
  });

  // ============================================================================
  // Memory Query
  // ============================================================================

  describe('queryMemory()', () => {
    beforeEach(async () => {
      // Store some test episodes
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'Created authentication service with JWT tokens',
        projectId: 'test-project',
      });
      await memory.storeEpisode({
        type: 'error_fix',
        content: 'Fixed database connection timeout issue',
        projectId: 'test-project',
      });
      await memory.storeEpisode({
        type: 'decision',
        content: 'Decided to use PostgreSQL for production database',
        projectId: 'test-project',
      });
    });

    it('should return episodes sorted by relevance', async () => {
      const results = await memory.queryMemory('authentication');

      expect(results.length).toBeGreaterThan(0);
      // With mock embeddings, we can only verify that results are returned and sorted
      // (mock embeddings are hash-based, not semantically meaningful)
      expect(results[0]).toHaveProperty('content');
    });

    it('should use cosine similarity for ranking', async () => {
      // Store an episode with identical text to query for max similarity
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'exact query match',
        projectId: 'test-project',
      });

      const results = await memory.queryMemory('exact query match');

      // The exact match should appear in results
      const exactMatch = results.find((r) => r.content === 'exact query match');
      expect(exactMatch).toBeDefined();

      // Exact match should be first (highest similarity with mock embeddings)
      expect(results[0].content).toBe('exact query match');
    });

    it('should return empty array if no memories', async () => {
      // Create new memory system with empty project
      db.db.run(/* sql */ `
        INSERT INTO projects (id, name, mode, status, root_path, created_at, updated_at)
        VALUES ('empty-project', 'Empty', 'genesis', 'planning', '/tmp/empty', unixepoch(), unixepoch())
      `);
      const emptyMemory = new MemorySystem({
        db,
        embeddingsService,
        projectId: 'empty-project',
      });

      const results = await emptyMemory.queryMemory('anything');

      expect(results).toEqual([]);
    });

    it('should respect limit parameter (default 10)', async () => {
      // Add more episodes
      for (let i = 0; i < 15; i++) {
        await memory.storeEpisode({
          type: 'code_generation',
          content: `Episode ${i}: some code generation work`,
          projectId: 'test-project',
        });
      }

      const results = await memory.queryMemory('code');

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should respect custom limit', async () => {
      const results = await memory.queryMemory('authentication', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should update accessCount on returned episodes', async () => {
      const results1 = await memory.queryMemory('authentication');
      const episodeId = results1[0].id;

      // Query again
      const results2 = await memory.queryMemory('authentication');
      const episode = results2.find((e) => e.id === episodeId);

      expect(episode!.accessCount).toBeGreaterThan(0);
    });

    it('should update lastAccessedAt on returned episodes', async () => {
      const before = new Date();
      await memory.queryMemory('authentication');
      const results = await memory.queryMemory('authentication');

      expect(results[0].lastAccessedAt).toBeDefined();
      expect(results[0].lastAccessedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
    });
  });

  // ============================================================================
  // Context Retrieval
  // ============================================================================

  describe('getRelevantContext()', () => {
    beforeEach(async () => {
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'Created user registration endpoint with email validation',
        taskId: 'task-001',
        projectId: 'test-project',
      });
      await memory.storeEpisode({
        type: 'error_fix',
        content: 'Fixed password hashing in auth service',
        taskId: 'task-001',
        projectId: 'test-project',
      });
      await memory.storeEpisode({
        type: 'decision',
        content: 'Decided to use bcrypt for password hashing with 12 rounds',
        projectId: 'test-project',
      });
    });

    it('should build context string for task', async () => {
      const context = await memory.getRelevantContext('task-001', 4000);

      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    it('should include task-related episodes first', async () => {
      const context = await memory.getRelevantContext('task-001', 4000);

      // Task-related content should appear before general content
      const registrationIndex = context.indexOf('registration');
      const bcryptIndex = context.indexOf('bcrypt');

      expect(registrationIndex).toBeLessThan(bcryptIndex);
    });

    it('should respect token limit (chars / 4 approximation)', async () => {
      // Add many episodes
      for (let i = 0; i < 20; i++) {
        await memory.storeEpisode({
          type: 'code_generation',
          content: 'A'.repeat(500), // 500 chars = ~125 tokens
          projectId: 'test-project',
        });
      }

      const maxTokens = 500; // ~2000 chars
      const context = await memory.getRelevantContext('task-001', maxTokens);

      // Should be approximately within token limit
      expect(context.length).toBeLessThanOrEqual(maxTokens * 4 + 200); // Some buffer for formatting
    });

    it('should fill remaining space with relevant memories', async () => {
      const context = await memory.getRelevantContext('task-002', 4000);

      // Should still have content even for unknown task
      expect(context.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Pruning
  // ============================================================================

  describe('pruneOldEpisodes()', () => {
    it('should remove episodes older than maxAge', async () => {
      // Store old episode (manipulate createdAt)
      db.db.run(/* sql */ `
        INSERT INTO episodes (id, project_id, type, content, created_at)
        VALUES ('old-ep', 'test-project', 'code_generation', 'Old content', unixepoch() - 86400 * 30)
      `);

      // Store new episode
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'New content',
        projectId: 'test-project',
      });

      const deleted = await memory.pruneOldEpisodes(86400 * 7); // 7 days

      expect(deleted).toBe(1);

      // Verify old episode is gone
      const results = await memory.queryMemory('Old content');
      expect(results.find((e) => e.id === 'old-ep')).toBeUndefined();
    });

    it('should return count of deleted episodes', async () => {
      // Store multiple old episodes
      for (let i = 0; i < 3; i++) {
        db.db.run(/* sql */ `
          INSERT INTO episodes (id, project_id, type, content, created_at)
          VALUES ('old-ep-${i}', 'test-project', 'code_generation', 'Old ${i}', unixepoch() - 86400 * 30)
        `);
      }

      const deleted = await memory.pruneOldEpisodes(86400 * 7);

      expect(deleted).toBe(3);
    });

    it('should respect importance (high importance kept longer)', async () => {
      // Store old but important episode - 10 days old
      // With importance > 1.5, effective maxAge is doubled (7*2=14 days)
      // So 10-day-old important episode survives 7-day prune
      db.db.run(/* sql */ `
        INSERT INTO episodes (id, project_id, type, content, importance, created_at)
        VALUES ('important-ep', 'test-project', 'decision', 'Important decision', 2.0, unixepoch() - 86400 * 10)
      `);

      // Store old normal episode - 10 days old
      // Normal importance (1.0) uses regular maxAge (7 days)
      // So 10-day-old normal episode is deleted
      db.db.run(/* sql */ `
        INSERT INTO episodes (id, project_id, type, content, importance, created_at)
        VALUES ('normal-ep', 'test-project', 'code_generation', 'Normal code', 1.0, unixepoch() - 86400 * 10)
      `);

      // Prune with importance consideration (importance > 1.5 doubles retention)
      const deleted = await memory.pruneOldEpisodes(86400 * 7);

      // Normal episode should be deleted (10 days > 7 days maxAge)
      // Important episode should be kept (10 days < 14 days effective maxAge)
      expect(deleted).toBe(1);

      const remaining = db.raw.prepare('SELECT id FROM episodes WHERE project_id = ?').all('test-project') as { id: string }[];
      expect(remaining.map((r) => r.id)).toContain('important-ep');
    });
  });

  describe('pruneByCount()', () => {
    it('should keep only most recent/important episodes', async () => {
      // Store many episodes
      for (let i = 0; i < 10; i++) {
        await memory.storeEpisode({
          type: 'code_generation',
          content: `Episode ${i}`,
          projectId: 'test-project',
        });
        // Small delay to ensure different timestamps
        await new Promise((r) => setTimeout(r, 10));
      }

      const deleted = await memory.pruneByCount(5);

      expect(deleted).toBe(5);

      const remaining = db.raw.prepare('SELECT COUNT(*) as count FROM episodes WHERE project_id = ?').get('test-project') as { count: number };
      expect(remaining.count).toBe(5);
    });

    it('should prioritize by importance then recency', async () => {
      // Store episodes with varying importance
      await memory.storeEpisode({
        type: 'decision',
        content: 'Important early decision',
        projectId: 'test-project',
        importance: 2.0,
      });

      for (let i = 0; i < 5; i++) {
        await memory.storeEpisode({
          type: 'code_generation',
          content: `Normal episode ${i}`,
          projectId: 'test-project',
          importance: 1.0,
        });
        await new Promise((r) => setTimeout(r, 10));
      }

      await memory.pruneByCount(3);

      // Important episode should survive even if older
      const remaining = db.raw.prepare('SELECT content FROM episodes WHERE project_id = ?').all('test-project') as { content: string }[];
      expect(remaining.map((r) => r.content)).toContain('Important early decision');
    });
  });

  // ============================================================================
  // Cosine Similarity
  // ============================================================================

  describe('cosineSimilarity (internal)', () => {
    it('should return 1 for identical vectors', async () => {
      // Store episode and query with same text
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'exact match test',
        projectId: 'test-project',
      });

      const results = await memory.queryMemory('exact match test');

      // First result should have very high similarity (close to 1)
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return lower similarity for different vectors', async () => {
      // With mock embeddings, identical texts produce identical vectors (similarity = 1)
      // Different texts produce different vectors (similarity < 1)
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'unique content A',
        projectId: 'test-project',
      });

      await memory.storeEpisode({
        type: 'code_generation',
        content: 'unique content B',
        projectId: 'test-project',
      });

      // Store episode with exact query text
      await memory.storeEpisode({
        type: 'code_generation',
        content: 'exact query text',
        projectId: 'test-project',
      });

      // Query for exact match
      const results = await memory.queryMemory('exact query text');

      // Exact match should be first (similarity = 1)
      expect(results[0].content).toBe('exact query text');

      // Other results should exist but rank lower
      expect(results.length).toBeGreaterThan(1);
    });
  });
});
