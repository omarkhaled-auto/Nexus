/**
 * Test Database Helper
 *
 * Provides utilities for creating and managing test databases.
 * Uses in-memory SQLite with the same schema as production.
 *
 * @module tests/helpers/testDb
 */
import { DatabaseClient } from '@/persistence/database';
import { join } from 'pathe';

/**
 * Path to migrations directory
 */
const MIGRATIONS_DIR = join(__dirname, '../../src/persistence/database/migrations');

/**
 * Test database wrapper with cleanup support.
 * Provides isolation between tests by using in-memory SQLite.
 */
export class TestDatabase {
  private _client: DatabaseClient;

  private constructor(client: DatabaseClient) {
    this._client = client;
  }

  /**
   * Create a new test database instance.
   * Each call creates a fresh in-memory database with all migrations applied.
   */
  static async create(): Promise<TestDatabase> {
    const client = await DatabaseClient.createInMemory(MIGRATIONS_DIR);
    return new TestDatabase(client);
  }

  /**
   * Get the Drizzle database instance for queries.
   */
  get db() {
    return this._client.db;
  }

  /**
   * Get the database client instance.
   */
  get client() {
    return this._client;
  }

  /**
   * Execute operations within a transaction.
   */
  transaction<T>(fn: (tx: typeof this.db) => T): T {
    return this._client.transaction(fn);
  }

  /**
   * Clean up the database.
   * Closes the connection and releases resources.
   */
  async cleanup(): Promise<void> {
    await this._client.close();
  }

  /**
   * Clear all data from all tables.
   * Useful for resetting state between tests without recreating the database.
   */
  async clearAllTables(): Promise<void> {
    const tables = await this._client.tables();

    // Disable foreign keys temporarily for clean truncation
    this._client.raw.pragma('foreign_keys = OFF');

    for (const table of tables) {
      if (table !== '__drizzle_migrations') {
        this._client.exec(`DELETE FROM ${table}`);
      }
    }

    // Re-enable foreign keys
    this._client.raw.pragma('foreign_keys = ON');
  }
}

/**
 * Factory function to create a test database.
 * Alias for TestDatabase.create() for more concise usage.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  return TestDatabase.create();
}
