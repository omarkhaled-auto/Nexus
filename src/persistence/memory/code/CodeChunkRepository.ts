/**
 * Code Chunk Repository
 *
 * Database operations for code chunks using Drizzle ORM.
 * Provides CRUD operations and query methods for the code_chunks table.
 *
 * Layer 6: Persistence - Memory subsystem
 */

import { eq, and, count, desc, asc, sql, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../database/schema';
import type { CodeChunk, CodeChunkMetadata, CodeChunkType } from './types';

// Re-export schema types for convenience
export type { CodeChunkRecord, NewCodeChunkRecord } from '../../database/schema';

// ============================================================================
// Types
// ============================================================================

export interface CodeChunkRepositoryOptions {
  /** Maximum batch size for bulk operations */
  batchSize?: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ============================================================================
// CodeChunkRepository
// ============================================================================

/**
 * Repository for code chunk database operations.
 *
 * Uses Drizzle ORM for type-safe database queries.
 * Handles serialization/deserialization of JSON fields.
 */
export class CodeChunkRepository {
  private readonly db: BetterSQLite3Database<typeof schema>;
  private readonly batchSize: number;

  constructor(
    db: BetterSQLite3Database<typeof schema>,
    options?: CodeChunkRepositoryOptions
  ) {
    this.db = db;
    this.batchSize = options?.batchSize ?? 100;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Insert a single code chunk.
   */
  async insert(chunk: CodeChunk): Promise<void> {
    const row = this.toRow(chunk);
    await this.db.insert(schema.codeChunks).values(row);
  }

  /**
   * Insert multiple code chunks in batches.
   */
  async insertMany(chunks: CodeChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const rows = chunks.map((chunk) => this.toRow(chunk));

    // Insert in batches to avoid hitting SQLite limits
    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      await this.db.insert(schema.codeChunks).values(batch);
    }
  }

  /**
   * Update an existing code chunk.
   */
  async update(chunk: CodeChunk): Promise<void> {
    const row = this.toRow(chunk);
    await this.db
      .update(schema.codeChunks)
      .set(row)
      .where(eq(schema.codeChunks.id, chunk.id));
  }

  /**
   * Delete a code chunk by ID.
   */
  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.codeChunks)
      .where(eq(schema.codeChunks.id, id));
  }

  /**
   * Delete all chunks for a specific file.
   * @returns Number of deleted rows
   */
  async deleteByFile(file: string): Promise<number> {
    const result = await this.db
      .delete(schema.codeChunks)
      .where(eq(schema.codeChunks.file, file));
    return result.changes;
  }

  /**
   * Delete all chunks for a specific project.
   * @returns Number of deleted rows
   */
  async deleteByProject(projectId: string): Promise<number> {
    const result = await this.db
      .delete(schema.codeChunks)
      .where(eq(schema.codeChunks.projectId, projectId));
    return result.changes;
  }

  /**
   * Delete multiple chunks by their IDs.
   * @returns Number of deleted rows
   */
  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    let totalDeleted = 0;
    // Delete in batches to avoid SQLite variable limit
    for (let i = 0; i < ids.length; i += this.batchSize) {
      const batch = ids.slice(i, i + this.batchSize);
      const result = await this.db
        .delete(schema.codeChunks)
        .where(inArray(schema.codeChunks.id, batch));
      totalDeleted += result.changes;
    }
    return totalDeleted;
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Find a chunk by its ID.
   */
  async findById(id: string): Promise<CodeChunk | null> {
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.id, id))
      .limit(1);

    const row = rows[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- DB query with .limit(1) can return empty array
    if (!row) return null;
    return this.toChunk(row);
  }

  /**
   * Find all chunks for a specific file, ordered by start line.
   */
  async findByFile(file: string): Promise<CodeChunk[]> {
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.file, file))
      .orderBy(asc(schema.codeChunks.startLine));

    return rows.map((row) => this.toChunk(row));
  }

  /**
   * Find all chunks for a specific project.
   */
  async findByProject(projectId: string): Promise<CodeChunk[]> {
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.projectId, projectId))
      .orderBy(asc(schema.codeChunks.file), asc(schema.codeChunks.startLine));

    return rows.map((row) => this.toChunk(row));
  }

  /**
   * Find a chunk by its content hash.
   */
  async findByHash(hash: string): Promise<CodeChunk | null> {
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.hash, hash))
      .limit(1);

    const row = rows[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- DB query with .limit(1) can return empty array
    if (!row) return null;
    return this.toChunk(row);
  }

  /**
   * Find all chunks containing a specific symbol.
   */
  async findBySymbol(symbol: string, projectId?: string): Promise<CodeChunk[]> {
    // SQLite JSON function for searching in array
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(
        projectId
          ? and(
              eq(schema.codeChunks.projectId, projectId),
              sql`EXISTS (SELECT 1 FROM json_each(${schema.codeChunks.symbols}) WHERE json_each.value = ${symbol})`
            )
          : sql`EXISTS (SELECT 1 FROM json_each(${schema.codeChunks.symbols}) WHERE json_each.value = ${symbol})`
      )
      .orderBy(asc(schema.codeChunks.file), asc(schema.codeChunks.startLine));

    return rows.map((row) => this.toChunk(row));
  }

  /**
   * Count chunks, optionally filtered by project.
   */
  async count(projectId?: string): Promise<number> {
    const result = await this.db
      .select({ value: count() })
      .from(schema.codeChunks)
      .where(
        projectId
          ? eq(schema.codeChunks.projectId, projectId)
          : undefined
      );

    return result[0]?.value ?? 0;
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Find all chunks with pagination.
   */
  async findAll(options?: PaginationOptions): Promise<CodeChunk[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .orderBy(desc(schema.codeChunks.indexedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.toChunk(row));
  }

  /**
   * Get all chunks with embeddings for a project.
   * Useful for in-memory search operations.
   */
  async findAllWithEmbeddings(projectId: string): Promise<CodeChunk[]> {
    const rows = await this.db
      .select()
      .from(schema.codeChunks)
      .where(
        and(
          eq(schema.codeChunks.projectId, projectId),
          sql`${schema.codeChunks.embedding} IS NOT NULL`
        )
      )
      .orderBy(asc(schema.codeChunks.file), asc(schema.codeChunks.startLine));

    return rows.map((row) => this.toChunk(row));
  }

  /**
   * Check if a file has been indexed (has any chunks).
   */
  async hasFile(file: string): Promise<boolean> {
    const result = await this.db
      .select({ value: count() })
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.file, file))
      .limit(1);

    return (result[0]?.value ?? 0) > 0;
  }

  /**
   * Get all unique files for a project.
   */
  async getFiles(projectId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ file: schema.codeChunks.file })
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.projectId, projectId))
      .orderBy(asc(schema.codeChunks.file));

    return rows.map((row) => row.file);
  }

  /**
   * Get hashes for all chunks in a file.
   * Useful for detecting changes.
   */
  async getFileHashes(file: string): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        id: schema.codeChunks.id,
        hash: schema.codeChunks.hash,
      })
      .from(schema.codeChunks)
      .where(eq(schema.codeChunks.file, file));

    return new Map(rows.map((row) => [row.id, row.hash]));
  }

  // ============================================================================
  // Conversion Helpers
  // ============================================================================

  /**
   * Convert CodeChunk to database row format.
   */
  private toRow(chunk: CodeChunk): schema.NewCodeChunkRecord {
    return {
      id: chunk.id,
      projectId: chunk.projectId,
      file: chunk.file,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content,
      embedding: chunk.embedding.length > 0
        ? Buffer.from(new Float32Array(chunk.embedding).buffer)
        : null,
      symbols: chunk.symbols,
      chunkType: chunk.chunkType,
      language: chunk.metadata.language,
      complexity: chunk.metadata.complexity ?? null,
      hash: chunk.metadata.hash,
      indexedAt: chunk.indexedAt,
    };
  }

  /**
   * Convert database row to CodeChunk format.
   */
  private toChunk(row: schema.CodeChunkRecord): CodeChunk {
    // Parse embedding from binary blob
    let embedding: number[] = [];
    if (row.embedding) {
      const buffer = row.embedding;
      const float32Array = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4
      );
      embedding = Array.from(float32Array);
    }

    // Build metadata
    const metadata: CodeChunkMetadata = {
      language: row.language,
      complexity: row.complexity ?? undefined,
      hash: row.hash,
      // Note: dependencies, exports, documentation not stored in DB
      // They would need to be re-extracted or stored in a JSON column
    };

    return {
      id: row.id,
      projectId: row.projectId,
      file: row.file,
      startLine: row.startLine,
      endLine: row.endLine,
      content: row.content,
      embedding,
      symbols: (row.symbols ?? []),
      chunkType: row.chunkType as CodeChunkType,
      metadata,
      indexedAt: row.indexedAt,
    };
  }
}
