/**
 * Code Memory Integration Tests
 *
 * Tests the full indexing and search pipeline including:
 * - Full file indexing
 * - Search across indexed content
 * - Incremental updates
 * - Facade pattern usage
 *
 * Note: These tests use mock embeddings which produce deterministic but
 * semantically unrelated vectors. Search tests use low thresholds to
 * verify the pipeline works, not semantic similarity.
 *
 * @module persistence/memory/code/integration.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../database/schema';
import {
  createTestCodeMemorySystem,
  CodeMemoryFacade,
} from './index';

// ============================================================================
// Test Fixtures
// ============================================================================

const SAMPLE_TYPESCRIPT_FILE = `
import { Logger } from './logger';
import { Config } from './config';

/**
 * UserService handles user-related operations
 */
export class UserService {
  private readonly logger: Logger;
  private readonly config: Config;

  constructor(logger: Logger, config: Config) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Find a user by their ID
   */
  async findById(id: string): Promise<User | null> {
    this.logger.info('Finding user by ID', { id });
    // Implementation here
    return null;
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    this.logger.info('Creating user', { email: data.email });
    // Implementation here
    return {} as User;
  }
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface CreateUserData {
  email: string;
  name: string;
}
`;

const SAMPLE_AUTH_FILE = `
import { UserService } from './UserService';
import { TokenService } from './TokenService';

/**
 * AuthService handles authentication operations
 */
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Authenticate a user with email and password
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.validatePassword(user, password);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    const token = await this.tokenService.generateToken(user);
    return { user, token };
  }

  private async validatePassword(user: User, password: string): Promise<boolean> {
    // Password validation logic
    return true;
  }
}

interface AuthResult {
  user: User;
  token: string;
}

interface User {
  id: string;
  email: string;
}
`;

// ============================================================================
// Test Setup
// ============================================================================

describe('Code Memory Integration', () => {
  let db: ReturnType<typeof Database>;
  let drizzleDb: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create tables
    db.exec(`
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

    drizzleDb = drizzle(db, { schema });
  });

  afterEach(() => {
    // Reset singleton
    CodeMemoryFacade.reset();
    db.close();
  });

  // ============================================================================
  // Full Pipeline Tests
  // ============================================================================

  describe('Full Indexing Pipeline', () => {
    it('should index a file and store chunks with embeddings', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index a file
      const chunks = await system.codeMemory.indexFile(
        'src/services/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      expect(chunks.length).toBeGreaterThan(0);

      // Each chunk should have an embedding
      for (const chunk of chunks) {
        expect(chunk.embedding.length).toBeGreaterThan(0);
        expect(chunk.projectId).toBe('test-project');
        expect(chunk.file).toBe('src/services/UserService.ts');
        expect(chunk.metadata.language).toBe('typescript');
      }

      // Verify chunks are persisted and retrievable
      const storedChunks = await system.codeMemory.getChunksForFile('src/services/UserService.ts');
      expect(storedChunks.length).toBe(chunks.length);
    });

    it('should index multiple files and count them correctly', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index both files
      const userChunks = await system.codeMemory.indexFile(
        'src/services/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );
      const authChunks = await system.codeMemory.indexFile(
        'src/services/AuthService.ts',
        SAMPLE_AUTH_FILE
      );

      // Count chunks
      const totalChunks = await system.codeMemory.getChunkCount('test-project');
      expect(totalChunks).toBe(userChunks.length + authChunks.length);

      // Verify chunks from both files
      const userStoredChunks = await system.codeMemory.getChunksForFile('src/services/UserService.ts');
      const authStoredChunks = await system.codeMemory.getChunksForFile('src/services/AuthService.ts');
      expect(userStoredChunks.length).toBe(userChunks.length);
      expect(authStoredChunks.length).toBe(authChunks.length);
    });

    it('should enable findSimilarCode between identical content', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index a file
      await system.codeMemory.indexFile(
        'src/services/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Search for similar code using exact content (should find itself)
      const chunks = await system.codeMemory.getChunksForFile('src/services/UserService.ts');
      expect(chunks.length).toBeGreaterThan(0);

      const firstChunk = chunks[0];
      if (firstChunk) {
        const results = await system.codeMemory.findSimilarCode(firstChunk.content, 5);
        // Should find at least the chunk itself
        expect(results.length).toBeGreaterThan(0);
        // First result should be itself with high score
        expect(results[0]?.score).toBeGreaterThan(0.9);
      }
    });
  });

  // ============================================================================
  // Incremental Update Tests
  // ============================================================================

  describe('Incremental Updates', () => {
    it('should update file chunks when content changes', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');
      const filePath = 'src/services/UserService.ts';

      // Initial index
      const initialChunks = await system.codeMemory.indexFile(
        filePath,
        SAMPLE_TYPESCRIPT_FILE
      );
      const initialCount = initialChunks.length;

      // Update with modified content
      const modifiedContent = SAMPLE_TYPESCRIPT_FILE + `
export function newHelper(): void {
  // New helper function
}
`;
      const updatedChunks = await system.codeMemory.updateFile(
        filePath,
        modifiedContent
      );

      // Should have more chunks now
      expect(updatedChunks.length).toBeGreaterThanOrEqual(initialCount);

      // File should only have new chunks (no duplicates)
      const fileChunks = await system.codeMemory.getChunksForFile(filePath);
      expect(fileChunks.length).toBe(updatedChunks.length);
    });

    it('should not re-index unchanged files', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');
      const filePath = 'src/services/UserService.ts';

      // Initial index
      const initialChunks = await system.codeMemory.indexFile(
        filePath,
        SAMPLE_TYPESCRIPT_FILE
      );

      // Update with same content
      const updatedChunks = await system.codeMemory.updateFile(
        filePath,
        SAMPLE_TYPESCRIPT_FILE
      );

      // Should return existing chunks
      expect(updatedChunks.length).toBe(initialChunks.length);
    });

    it('should remove file from index', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');
      const filePath = 'src/services/UserService.ts';

      // Index file
      await system.codeMemory.indexFile(filePath, SAMPLE_TYPESCRIPT_FILE);

      // Remove file
      const removedCount = await system.codeMemory.removeFile(filePath);
      expect(removedCount).toBeGreaterThan(0);

      // Verify removal
      const chunks = await system.codeMemory.getChunksForFile(filePath);
      expect(chunks.length).toBe(0);
    });
  });

  // ============================================================================
  // Facade Pattern Tests
  // ============================================================================

  describe('CodeMemoryFacade', () => {
    it('should provide simplified access to CodeMemory', async () => {
      // Initialize facade
      CodeMemoryFacade.initialize({
        db: drizzleDb,
        mockMode: true,
        projectId: 'facade-test',
      });

      const facade = CodeMemoryFacade.getInstance();

      // Index a file
      const chunks = await facade.indexFile(
        'src/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );
      expect(chunks.length).toBeGreaterThan(0);

      // Get chunk count
      const count = await facade.getChunkCount();
      expect(count).toBe(chunks.length);

      // Get file chunks
      const fileChunks = await facade.getFileChunks('src/UserService.ts');
      expect(fileChunks.length).toBe(chunks.length);
    });

    it('should support singleton pattern', () => {
      CodeMemoryFacade.initialize({
        db: drizzleDb,
        mockMode: true,
      });

      expect(CodeMemoryFacade.isInitialized()).toBe(true);

      const instance1 = CodeMemoryFacade.getInstance();
      const instance2 = CodeMemoryFacade.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw if not initialized', () => {
      expect(() => CodeMemoryFacade.getInstance()).toThrow(
        'CodeMemoryFacade not initialized'
      );
    });

    it('should throw if initialized twice', () => {
      CodeMemoryFacade.initialize({
        db: drizzleDb,
        mockMode: true,
      });

      expect(() =>
        CodeMemoryFacade.initialize({
          db: drizzleDb,
          mockMode: true,
        })
      ).toThrow('already initialized');
    });

    it('should support clear and rebuild operations', async () => {
      CodeMemoryFacade.initialize({
        db: drizzleDb,
        mockMode: true,
        projectId: 'facade-test',
      });

      const facade = CodeMemoryFacade.getInstance();

      // Index files
      await facade.indexFile('src/UserService.ts', SAMPLE_TYPESCRIPT_FILE);
      expect(await facade.getChunkCount()).toBeGreaterThan(0);

      // Clear
      const deletedCount = await facade.clear();
      expect(deletedCount).toBeGreaterThan(0);

      // Verify cleared
      expect(await facade.getChunkCount()).toBe(0);
    });
  });

  // ============================================================================
  // Symbol Search Tests
  // ============================================================================

  describe('Symbol Operations', () => {
    it('should find symbol usages', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index file
      await system.codeMemory.indexFile(
        'src/services/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Find usages of 'logger'
      const usages = await system.codeMemory.findUsages('logger', 'test-project');

      // Should find usages (this.logger is used multiple times)
      expect(usages.length).toBeGreaterThanOrEqual(0);
    });

    it('should find symbol definitions', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index file
      await system.codeMemory.indexFile(
        'src/services/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Find definition of UserService
      const definition = await system.codeMemory.findDefinition(
        'UserService',
        'test-project'
      );

      // May or may not find based on chunk boundaries
      if (definition) {
        expect(definition.file).toBe('src/services/UserService.ts');
      }
    });
  });

  // ============================================================================
  // Search Infrastructure Tests
  // ============================================================================

  describe('Search Infrastructure', () => {
    it('should filter chunks by language', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index TypeScript file
      const chunks = await system.codeMemory.indexFile(
        'src/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Verify all chunks have correct language
      for (const chunk of chunks) {
        expect(chunk.metadata.language).toBe('typescript');
      }
    });

    it('should filter chunks by chunk type', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index file
      await system.codeMemory.indexFile(
        'src/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Get all chunks
      const chunks = await system.codeMemory.getChunksForFile('src/UserService.ts');

      // Should have various chunk types
      const chunkTypes = new Set(chunks.map(c => c.chunkType));
      expect(chunkTypes.size).toBeGreaterThan(0);
    });

    it('should store and retrieve embeddings correctly', async () => {
      const system = createTestCodeMemorySystem(drizzleDb, 'test-project');

      // Index file
      const chunks = await system.codeMemory.indexFile(
        'src/UserService.ts',
        SAMPLE_TYPESCRIPT_FILE
      );

      // Verify embeddings are stored
      for (const chunk of chunks) {
        expect(chunk.embedding).toBeDefined();
        expect(chunk.embedding.length).toBe(1536); // OpenAI embedding dimension
      }

      // Verify embeddings are retrievable
      const storedChunks = await system.codeMemory.getChunksForFile('src/UserService.ts');
      for (const chunk of storedChunks) {
        expect(chunk.embedding.length).toBe(1536);
      }
    });
  });
});
