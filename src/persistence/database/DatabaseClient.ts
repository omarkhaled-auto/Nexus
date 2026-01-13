import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dirname } from 'pathe';
import { ensureDirSync } from 'fs-extra';
import * as schema from './schema';

// ============================================================================
// Types
// ============================================================================

export interface DatabaseClientOptions {
  /** Database file path or ':memory:' for in-memory database */
  path: string;
  /** Path to migrations folder */
  migrationsDir?: string;
  /** Enable query logging */
  debug?: boolean;
}

export interface DatabaseHealthStatus {
  healthy: boolean;
  walMode: boolean;
  foreignKeys: boolean;
  tables: string[];
}

// ============================================================================
// DatabaseClient
// ============================================================================

/**
 * SQLite database client using better-sqlite3 and Drizzle ORM.
 *
 * Features:
 * - WAL mode for better concurrency
 * - Foreign key enforcement
 * - Automatic migrations
 * - Transaction support
 */
export class DatabaseClient {
  private sqlite: Database.Database;
  private _db: BetterSQLite3Database<typeof schema>;
  private readonly options: DatabaseClientOptions;

  private constructor(options: DatabaseClientOptions) {
    this.options = options;

    // Ensure parent directory exists (unless in-memory)
    if (options.path !== ':memory:') {
      ensureDirSync(dirname(options.path));
    }

    // Create SQLite connection with WAL mode for better concurrency
    this.sqlite = new Database(options.path);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.sqlite.pragma('busy_timeout = 5000');

    // Create Drizzle instance with schema
    this._db = drizzle(this.sqlite, {
      schema,
      logger: options.debug,
    });
  }

  /**
   * Create and initialize a DatabaseClient.
   *
   * @param options - Configuration options
   * @returns Initialized DatabaseClient
   */
  static async create(options: DatabaseClientOptions): Promise<DatabaseClient> {
    const client = new DatabaseClient(options);

    // Run migrations if directory provided
    if (options.migrationsDir) {
      await client.migrate(options.migrationsDir);
    }

    return client;
  }

  /**
   * Create an in-memory database (useful for testing).
   *
   * @param migrationsDir - Optional migrations directory
   * @returns In-memory DatabaseClient
   */
  static async createInMemory(migrationsDir?: string): Promise<DatabaseClient> {
    return DatabaseClient.create({
      path: ':memory:',
      migrationsDir,
      debug: false,
    });
  }

  /**
   * Get the Drizzle database instance for queries.
   */
  get db(): BetterSQLite3Database<typeof schema> {
    return this._db;
  }

  /**
   * Get the raw better-sqlite3 database instance.
   * Use with caution - prefer Drizzle queries.
   */
  get raw(): Database.Database {
    return this.sqlite;
  }

  /**
   * Run database migrations.
   *
   * @param migrationsDir - Path to migrations folder
   */
  async migrate(migrationsDir: string): Promise<void> {
    try {
      migrate(this._db, { migrationsFolder: migrationsDir });
    } catch (error) {
      // Re-throw with more context
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Migration failed: ${message}`);
    }
  }

  /**
   * Get list of all tables in the database.
   *
   * @returns Array of table names
   */
  async tables(): Promise<string[]> {
    const result = this.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__%'"
      )
      .all() as { name: string }[];
    return result.map((r) => r.name);
  }

  /**
   * Check database health status.
   *
   * @returns Health status object
   */
  async health(): Promise<DatabaseHealthStatus> {
    try {
      // Test basic connectivity
      this.sqlite.prepare('SELECT 1').get();

      // Check WAL mode
      const journalMode = this.sqlite.pragma('journal_mode') as {
        journal_mode: string;
      }[];
      const walMode =
        journalMode[0]?.journal_mode?.toLowerCase() === 'wal';

      // Check foreign keys
      const foreignKeys = this.sqlite.pragma('foreign_keys') as {
        foreign_keys: number;
      }[];
      const foreignKeysEnabled = foreignKeys[0]?.foreign_keys === 1;

      // Get tables
      const tables = await this.tables();

      return {
        healthy: true,
        walMode,
        foreignKeys: foreignKeysEnabled,
        tables,
      };
    } catch {
      return {
        healthy: false,
        walMode: false,
        foreignKeys: false,
        tables: [],
      };
    }
  }

  /**
   * Simple health check ping.
   *
   * @returns true if database is responsive
   */
  async ping(): Promise<boolean> {
    try {
      this.sqlite.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute operations within a transaction.
   *
   * @param fn - Function to execute within transaction
   * @returns Result of the function
   */
  transaction<T>(
    fn: (tx: BetterSQLite3Database<typeof schema>) => T
  ): T {
    return this.sqlite.transaction(() => {
      return fn(this._db);
    })();
  }

  /**
   * Execute raw SQL (use with caution).
   *
   * @param sql - SQL statement to execute
   */
  exec(sql: string): void {
    this.sqlite.exec(sql);
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    try {
      // Checkpoint WAL before closing
      if (this.options.path !== ':memory:') {
        this.sqlite.pragma('wal_checkpoint(TRUNCATE)');
      }
      this.sqlite.close();
    } catch {
      // Ignore close errors
    }
  }

  /**
   * Get database file path.
   */
  get path(): string {
    return this.options.path;
  }

  /**
   * Check if this is an in-memory database.
   */
  get isInMemory(): boolean {
    return this.options.path === ':memory:';
  }
}
