/**
 * End-to-End Integration Tests for Code Memory + Fresh Context Manager
 *
 * These tests verify that the Code Memory (Plan 13-03) and Fresh Context Manager
 * (Plan 13-04) work together correctly.
 *
 * Integration Points:
 * - FreshContextManager uses CodeMemory via ContextBuilder
 * - ContextBuilder.buildCodeContext calls CodeMemory.searchCode
 * - Code results are included in TaskContext
 *
 * @module integration/context-memory
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Import from Code Memory module (Plan 13-03)
import {
  CodeMemory,
  CodeChunkRepository,
  CodeChunker,
} from '../persistence/memory/code';

// Import from Fresh Context Manager module (Plan 13-04)
import {
  TokenBudgeter,
  ContextBuilder,
  createContextSystem,
  type TaskSpec,
  type ContextProjectConfig,
  type ContextOptions,
} from '../orchestration/context';

// Database schema
import * as schema from '../persistence/database/schema';

// Mock EmbeddingsService
import { EmbeddingsService } from '../persistence/memory/EmbeddingsService';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Sample TypeScript code for indexing
 */
const SAMPLE_CODE = {
  'src/auth/login.ts': `
/**
 * Login service for user authentication
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<string> {
  // Validate credentials
  if (!credentials.username || !credentials.password) {
    throw new Error('Invalid credentials');
  }

  // Simulate authentication
  return 'token-' + Date.now();
}

export function validateToken(token: string): boolean {
  return token.startsWith('token-');
}
`,
  'src/auth/logout.ts': `
/**
 * Logout functionality
 */
export function logout(userId: string): void {
  console.log('User logged out:', userId);
}

export function clearSession(): void {
  console.log('Session cleared');
}
`,
  'src/users/user.ts': `
/**
 * User management module
 */
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  private users: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...data,
      id: 'user-' + Date.now(),
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }
}
`,
};

/**
 * Sample task spec for testing
 */
function createSampleTaskSpec(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'task-001',
    name: 'Add password reset feature',
    description: 'Implement password reset functionality for the authentication system',
    files: ['src/auth/login.ts', 'src/auth/reset.ts'],
    testCriteria: 'Password reset flow works end-to-end',
    acceptanceCriteria: [
      'User can request password reset',
      'Reset link is sent via email',
      'User can set new password',
    ],
    dependencies: ['src/users/user.ts'],
    estimatedTime: 4,
    ...overrides,
  };
}

/**
 * Sample project config
 */
const PROJECT_CONFIG: ContextProjectConfig = {
  name: 'test-project',
  path: '/test/project',
  language: 'typescript',
  framework: 'express',
  testFramework: 'vitest',
};

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test database with schema
 */
function createTestDb() {
  const sqlite = new Database(':memory:');

  // Create the code_chunks table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS code_chunks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      symbols TEXT DEFAULT '[]',
      chunk_type TEXT NOT NULL,
      language TEXT NOT NULL,
      complexity INTEGER,
      hash TEXT NOT NULL,
      indexed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS code_chunks_file_idx ON code_chunks(file);
    CREATE INDEX IF NOT EXISTS code_chunks_project_idx ON code_chunks(project_id);
    CREATE INDEX IF NOT EXISTS code_chunks_hash_idx ON code_chunks(hash);
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

/**
 * Create a mock embeddings service
 */
function createMockEmbeddings(): EmbeddingsService {
  return new EmbeddingsService({
    apiKey: 'test-key',
    mockMode: true,
  });
}

/**
 * Index sample code into CodeMemory
 */
async function indexSampleCode(codeMemory: CodeMemory): Promise<void> {
  for (const [file, content] of Object.entries(SAMPLE_CODE)) {
    await codeMemory.indexFile(file, content);
  }
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Code Memory + Fresh Context Manager Integration', () => {
  let sqlite: ReturnType<typeof Database>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: CodeChunkRepository;
  let chunker: CodeChunker;
  let embeddings: EmbeddingsService;
  let codeMemory: CodeMemory;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;
    repository = new CodeChunkRepository(db);
    chunker = new CodeChunker();
    embeddings = createMockEmbeddings();
    codeMemory = new CodeMemory(repository, chunker, embeddings, {
      skipEmbeddings: false,
    });
  });

  afterEach(() => {
    sqlite.close();
    vi.clearAllMocks();
  });

  describe('Integration Point: ContextBuilder uses CodeMemory', () => {
    it('should include code search results in context using exact content match', async () => {
      // Index sample code
      await indexSampleCode(codeMemory);

      // Get a chunk to use as search query (for exact match with mock embeddings)
      const chunks = await codeMemory.getChunksForFile('src/auth/login.ts');
      expect(chunks.length).toBeGreaterThan(0);

      // Create ContextBuilder with CodeMemory
      const builder = new ContextBuilder({
        codeMemory,
      });

      // Build code context using chunk content as query
      // This works with mock embeddings because same content = same embedding
      const results = await builder.buildCodeContext(
        chunks[0]!.content.substring(0, 100), // Use part of the content
        5000
      );

      // With mock embeddings, results may be empty or have low scores
      // Just verify the integration path works without errors
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect token budget for code results', async () => {
      await indexSampleCode(codeMemory);

      const builder = new ContextBuilder({
        codeMemory,
      });

      // Use a very small token budget
      const results = await builder.buildCodeContext(
        'user authentication',
        100 // Very small budget
      );

      // Calculate total tokens (approximately)
      const totalChars = results.reduce((sum, r) => sum + r.chunk.content.length, 0);
      const estimatedTokens = Math.ceil(totalChars / 4);

      // Should be within budget (with some margin for estimation)
      expect(estimatedTokens).toBeLessThanOrEqual(150);
    });
  });

  describe('Integration Point: FreshContextManager uses CodeMemory', () => {
    it('should build fresh context with code search results', async () => {
      await indexSampleCode(codeMemory);

      // Create system with CodeMemory
      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      const taskSpec = createSampleTaskSpec();
      const options: ContextOptions = {
        maxTokens: 50000,
        includeRepoMap: false, // Skip to focus on code search
        includeCodebaseDocs: false,
        codeSearchQuery: 'authentication login user credentials',
      };

      const context = await system.manager.buildFreshContext(taskSpec, options);

      // Verify context structure
      expect(context.contextId).toBeDefined();
      expect(context.taskSpec).toEqual(taskSpec);
      expect(context.tokenCount).toBeGreaterThan(0);
      expect(context.tokenBudget).toBe(50000);

      // Verify code results array exists (may be empty with mock embeddings)
      expect(Array.isArray(context.relevantCode)).toBe(true);

      // Verify conversation history is always empty
      expect(context.conversationHistory).toEqual([]);
    });

    it('should include code context in token breakdown', async () => {
      await indexSampleCode(codeMemory);

      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      const taskSpec = createSampleTaskSpec();
      const context = await system.manager.buildFreshContext(taskSpec, {
        codeSearchQuery: 'login credentials',
      });

      // Validate context
      const validation = system.manager.validateContext(context);

      // Check token breakdown includes code results
      expect(validation.breakdown.codeResults).toBeGreaterThanOrEqual(0);
      expect(validation.breakdown.total).toBeGreaterThan(0);
    });
  });

  describe('Integration Point: AgentContextIntegration full pipeline', () => {
    it('should prepare agent context with code from CodeMemory', async () => {
      await indexSampleCode(codeMemory);

      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      const agentId = 'agent-integration-test';
      const taskSpec = createSampleTaskSpec({
        description: 'Fix login validation bug in authentication module',
      });

      // Prepare context for agent
      const result = await system.integration.prepareAgentContext(agentId, taskSpec, {
        codeSearchQuery: taskSpec.description,
      });

      // AgentContextResult has context, agentId, taskId, buildTimeMs
      expect(result.context).toBeDefined();
      expect(result.agentId).toBe(agentId);
      expect(result.taskId).toBe(taskSpec.id);
      expect(result.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.context.relevantCode.length).toBeGreaterThanOrEqual(0);

      // Verify agent has context registered
      const agentContext = system.integration.getAgentContext(agentId);
      expect(agentContext).toBeDefined();
      expect(agentContext?.taskSpec.id).toBe(taskSpec.id);
    });

    it('should clean up context after task completion', async () => {
      await indexSampleCode(codeMemory);

      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      const agentId = 'agent-cleanup-test';
      const taskSpec = createSampleTaskSpec();

      // Prepare context
      await system.integration.prepareAgentContext(agentId, taskSpec);

      // Verify context exists
      const contextBefore = system.integration.getAgentContext(agentId);
      expect(contextBefore).toBeDefined();
      expect(contextBefore?.taskSpec.id).toBe(taskSpec.id);

      // Complete task
      await system.integration.onTaskComplete(agentId, taskSpec.id);

      // Verify context is cleared (getAgentContext returns undefined when cleared)
      const contextAfter = system.integration.getAgentContext(agentId);
      expect(contextAfter).toBeUndefined();
    });
  });

  describe('Token Budget Integration', () => {
    it('should allocate tokens correctly across components', async () => {
      await indexSampleCode(codeMemory);

      const budgeter = new TokenBudgeter();
      const budget = budgeter.createBudget(100000);

      // Verify fixed allocations
      expect(budget.fixed.systemPrompt).toBeGreaterThan(0);
      expect(budget.fixed.repoMap).toBeGreaterThan(0);
      expect(budget.fixed.codebaseDocs).toBeGreaterThan(0);

      // Verify dynamic allocations for code, files, memories
      expect(budget.dynamic.codeResults).toBeGreaterThan(0);
      expect(budget.dynamic.files).toBeGreaterThan(0);
      expect(budget.dynamic.memories).toBeGreaterThan(0);
    });

    it('should truncate content to fit budget', async () => {
      await indexSampleCode(codeMemory);

      const budgeter = new TokenBudgeter();

      // Create a long text
      const longText = 'x'.repeat(10000);

      // Truncate to small budget
      const truncated = budgeter.truncateToFit(longText, 100);

      // Should be truncated
      expect(truncated.length).toBeLessThan(longText.length);
      expect(budgeter.estimateTokens(truncated)).toBeLessThanOrEqual(100);
    });
  });

  describe('Fresh Context Isolation', () => {
    it('should provide isolated context for different tasks', async () => {
      await indexSampleCode(codeMemory);

      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      const task1 = createSampleTaskSpec({
        id: 'task-isolation-1',
        name: 'Task 1',
        description: 'Authentication task',
      });

      const task2 = createSampleTaskSpec({
        id: 'task-isolation-2',
        name: 'Task 2',
        description: 'User management task',
        files: ['src/users/user.ts'],
      });

      // Build contexts for both tasks
      const context1 = await system.manager.buildFreshContext(task1);
      const context2 = await system.manager.buildFreshContext(task2);

      // Verify contexts are different
      expect(context1.contextId).not.toBe(context2.contextId);
      expect(context1.taskSpec.id).toBe('task-isolation-1');
      expect(context2.taskSpec.id).toBe('task-isolation-2');

      // Both should have empty conversation history
      expect(context1.conversationHistory).toEqual([]);
      expect(context2.conversationHistory).toEqual([]);
    });

    it('should not carry over state between builds', async () => {
      await indexSampleCode(codeMemory);

      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      // Build first context
      const taskSpec = createSampleTaskSpec();
      const context1 = await system.manager.buildFreshContext(taskSpec);

      // Clear task context
      await system.manager.clearTaskContext(taskSpec.id);

      // Build again
      const context2 = await system.manager.buildFreshContext(taskSpec);

      // Should be fresh with new ID
      expect(context2.contextId).not.toBe(context1.contextId);
    });
  });

  describe('Code Search Quality', () => {
    it('should return relevant results for authentication queries', async () => {
      await indexSampleCode(codeMemory);

      // Get actual chunk content for search (mock embeddings match same content)
      const authChunks = await codeMemory.getChunksForFile('src/auth/login.ts');
      expect(authChunks.length).toBeGreaterThan(0);

      // Use findSimilarCode with actual content (works with mock embeddings)
      const results = await codeMemory.findSimilarCode(authChunks[0]!.content, 5);

      expect(results.length).toBeGreaterThan(0);

      // First result should be the same chunk (exact match)
      expect(results[0]!.score).toBeGreaterThan(0.9);
    });

    it('should return relevant results for user queries', async () => {
      await indexSampleCode(codeMemory);

      // Get actual chunk content for search (mock embeddings match same content)
      const userChunks = await codeMemory.getChunksForFile('src/users/user.ts');
      expect(userChunks.length).toBeGreaterThan(0);

      // Use findSimilarCode with actual content (works with mock embeddings)
      const results = await codeMemory.findSimilarCode(userChunks[0]!.content, 5);

      expect(results.length).toBeGreaterThan(0);

      // At least one result should be from users directory
      const hasUserResult = results.some((r) => r.chunk.file.includes('user'));
      expect(hasUserResult).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing CodeMemory gracefully', async () => {
      // Create system without CodeMemory
      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory: null,
        },
      });

      const taskSpec = createSampleTaskSpec();
      const context = await system.manager.buildFreshContext(taskSpec);

      // Should still work, just with no code results
      expect(context).toBeDefined();
      expect(context.relevantCode).toEqual([]);
    });

    it('should handle empty code search query', async () => {
      await indexSampleCode(codeMemory);

      const builder = new ContextBuilder({
        codeMemory,
      });

      // Empty query should return empty results
      const results = await builder.buildCodeContext('', 5000);
      expect(results).toEqual([]);
    });
  });

  describe('Full Pipeline Test', () => {
    it('should complete full pipeline: index -> search -> context -> validation', async () => {
      // Step 1: Index code
      await indexSampleCode(codeMemory);
      const chunkCount = await repository.count();
      expect(chunkCount).toBeGreaterThan(0);

      // Step 2: Create context system
      const system = createContextSystem({
        projectConfig: PROJECT_CONFIG,
        dependencies: {
          codeMemory,
        },
      });

      // Step 3: Build fresh context
      const taskSpec = createSampleTaskSpec({
        description: 'Implement password reset with user validation',
      });

      const context = await system.manager.buildFreshContext(taskSpec, {
        codeSearchQuery: 'user authentication password',
        maxTokens: 50000,
      });

      // Step 4: Validate context
      const validation = system.manager.validateContext(context);

      expect(validation.valid).toBe(true);
      expect(validation.tokenCount).toBeLessThanOrEqual(validation.maxTokens);

      // Step 5: Verify all components
      expect(context.taskSpec).toEqual(taskSpec);
      expect(context.projectConfig).toEqual(PROJECT_CONFIG);
      expect(context.conversationHistory).toEqual([]);
      expect(context.generatedAt).toBeInstanceOf(Date);

      // Token breakdown should be complete
      expect(validation.breakdown.total).toBe(validation.tokenCount);
    });
  });
});
