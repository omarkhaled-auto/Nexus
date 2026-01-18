# Code Memory Module

> Semantic code search and intelligent chunking for the Nexus system

**Layer:** 6 (Persistence) - Memory subsystem
**Plan:** 13-03
**Status:** Complete

## Overview

The Code Memory module provides semantic code search capabilities by:
- Chunking code into semantic units (functions, classes, interfaces, types)
- Generating embeddings for each chunk using the EmbeddingsService
- Enabling similarity search across indexed code
- Supporting incremental updates with change detection

## Architecture

```
CodeMemory (ICodeMemory)
    |
    +-- CodeChunker (ICodeChunker)
    |       |
    |       +-- Detects language
    |       +-- Chunks by symbols or lines
    |       +-- Calculates content hash
    |
    +-- CodeChunkRepository
    |       |
    |       +-- SQLite storage via Drizzle ORM
    |       +-- CRUD operations
    |       +-- Query by file, project, hash
    |
    +-- CodeSearchEngine (ICodeSearchEngine)
    |       |
    |       +-- Cosine similarity search
    |       +-- Filter by project, file, language
    |       +-- Highlight generation
    |
    +-- EmbeddingsService
            |
            +-- Generate embeddings for chunks
            +-- Mock mode for testing
```

## Quick Start

### Basic Usage

```typescript
import { createCodeMemorySystem } from './persistence/memory/code';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Create the system
const system = createCodeMemorySystem({
  db: drizzle(sqliteDb, { schema }),
  embeddings: { apiKey: process.env.OPENAI_API_KEY! },
  projectId: 'my-project',
});

// Index a project
const stats = await system.codeMemory.indexProject('./src');
console.log('Indexed:', stats.chunksCreated, 'chunks');

// Search for code
const results = await system.codeMemory.searchCode('authentication logic', {
  limit: 10,
  threshold: 0.7,
});

for (const result of results) {
  console.log(`${result.chunk.file}:${result.chunk.startLine} (${result.score})`);
}
```

### Testing

```typescript
import { createTestCodeMemorySystem } from './persistence/memory/code';

const system = createTestCodeMemorySystem(testDb, 'test-project');

// Uses mock embeddings - no API calls
await system.codeMemory.indexFile('test.ts', 'function foo() {}');
```

## API Reference

### CodeMemory

Main class implementing `ICodeMemory` interface.

#### Indexing Methods

```typescript
// Index a single file
indexFile(file: string, content: string): Promise<CodeChunk[]>

// Index entire project
indexProject(projectPath: string, options?: ChunkingOptions): Promise<IndexStats>

// Update a file (only if changed)
updateFile(file: string, content: string): Promise<CodeChunk[]>

// Remove file chunks
removeFile(file: string): Promise<number>
```

#### Search Methods

```typescript
// Semantic search
searchCode(query: string, options?: CodeSearchOptions): Promise<CodeSearchResult[]>

// Find similar code
findSimilarCode(codeSnippet: string, limit?: number): Promise<CodeSearchResult[]>

// Find symbol usages
findUsages(symbolName: string, projectId?: string): Promise<CodeUsage[]>

// Find symbol definition
findDefinition(symbolName: string, projectId?: string): Promise<CodeDefinition | null>
```

#### Management Methods

```typescript
// Get chunks for a file
getChunksForFile(file: string): Promise<CodeChunk[]>

// Clear project index
clearProject(projectId: string): Promise<number>

// Rebuild index
rebuildIndex(projectId: string): Promise<IndexStats>
```

### CodeSearchOptions

```typescript
interface CodeSearchOptions {
  projectId?: string;      // Filter by project
  filePattern?: string;    // Glob pattern (e.g., '**/*.ts')
  language?: string;       // Filter by language
  chunkTypes?: CodeChunkType[];  // Filter by chunk type
  limit?: number;          // Max results (default: 10)
  threshold?: number;      // Min similarity (default: 0.7)
  includeContext?: boolean; // Include surrounding code
}
```

### ChunkingOptions

```typescript
interface ChunkingOptions {
  maxChunkSize?: number;      // Max tokens per chunk (default: 1000)
  minChunkSize?: number;      // Min tokens per chunk (default: 50)
  overlapSize?: number;       // Overlap for context (default: 50)
  preserveBoundaries?: boolean; // Respect function/class bounds (default: true)
}
```

## Configuration

### CodeMemoryConfig

```typescript
interface CodeMemoryConfig {
  // Files to include (glob patterns)
  includePatterns?: string[];  // Default: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']

  // Files to exclude (glob patterns)
  excludePatterns?: string[];  // Default: ['**/node_modules/**', '**/dist/**', ...]

  // Batch size for indexing
  batchSize?: number;          // Default: 100

  // Skip embedding generation (for testing)
  skipEmbeddings?: boolean;    // Default: false
}
```

## Database Schema

The module uses the `code_chunks` table:

```sql
CREATE TABLE code_chunks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,
  symbols TEXT,  -- JSON array of symbol names
  chunk_type TEXT NOT NULL,  -- 'function' | 'class' | 'interface' | 'type' | 'module' | 'block'
  language TEXT NOT NULL,
  complexity INTEGER,
  hash TEXT NOT NULL,
  indexed_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX code_chunks_file_idx ON code_chunks(file);
CREATE INDEX code_chunks_project_idx ON code_chunks(project_id);
CREATE INDEX code_chunks_hash_idx ON code_chunks(hash);
```

## Integration with Fresh Context Manager

The Code Memory module integrates with the Fresh Context Manager (Plan 13-04):

```typescript
import { createContextSystem } from './orchestration/context';
import { createCodeMemorySystem } from './persistence/memory/code';

// Create code memory
const codeMemorySystem = createCodeMemorySystem({ db, embeddings });

// Create context system with code memory
const contextSystem = createContextSystem({
  projectConfig: { name: 'my-project', path: '.', language: 'typescript' },
  dependencies: {
    codeMemory: codeMemorySystem.codeMemory,
  },
});

// Build context with code search
const context = await contextSystem.manager.buildFreshContext(taskSpec, {
  codeSearchQuery: 'authentication middleware',
});

// context.relevantCode contains matching code chunks
```

## Testing

Run tests with:

```bash
npm test src/persistence/memory/code/
```

Test files:
- `CodeChunkRepository.test.ts` - Repository tests (33 tests)
- `CodeChunker.test.ts` - Chunking tests (38 tests)
- `CodeMemory.test.ts` - Core tests (42 tests)
- `CodeSearchEngine.test.ts` - Search tests (44 tests)
- `integration.test.ts` - Integration tests (16 tests)

## Performance Considerations

1. **Batch Indexing**: Use `indexProject` for large codebases
2. **Change Detection**: `updateFile` only re-indexes if hash changed
3. **Token Budgets**: Search results respect token limits
4. **Caching**: Consider caching embeddings for frequently accessed code
5. **Similarity Threshold**: Higher thresholds reduce noise but may miss relevant code

## Error Handling

All methods throw typed errors:

```typescript
try {
  await codeMemory.indexFile('test.ts', content);
} catch (error) {
  if (error instanceof Error) {
    console.error('Indexing failed:', error.message);
  }
}
```

## Module Exports

```typescript
// Types
export type {
  CodeChunk,
  CodeChunkType,
  CodeChunkMetadata,
  CodeSearchResult,
  CodeSearchOptions,
  CodeUsage,
  CodeDefinition,
  IndexStats,
  ChunkingOptions,
  ICodeMemory,
  ICodeChunker,
  ICodeSearchEngine,
};

// Classes
export { CodeChunkRepository, CodeChunker, CodeMemory, CodeSearchEngine };

// Factory Functions
export { createCodeMemorySystem, createTestCodeMemorySystem };
```
