# Plans 13-03 & 13-04: Code Memory + Fresh Context Manager

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plans:** 13-03 (Code Memory) + 13-04 (Fresh Context Manager)
- **Purpose:** Enable semantic code search and ensure agents get clean, relevant context for each task
- **Input:**
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` (Plans 13-03 and 13-04 sections)
  - `src/infrastructure/analysis/` (RepoMapGenerator from Plan 13-01)
  - `src/infrastructure/analysis/codebase/` (CodebaseAnalyzer from Plan 13-02)
  - `07_NEXUS_MASTER_BOOK.md` (architecture reference)
- **Output:**
  - `src/persistence/memory/code/` - Code Memory module
  - `src/orchestration/context/` - Fresh Context Manager module
- **Philosophy:** Agents work best with fresh, relevant context. Code Memory enables finding the right code. Fresh Context ensures no accumulated garbage.

## Pre-Requisites
- [ ] Verify Plan 13-01 complete: `src/infrastructure/analysis/` exists with RepoMapGenerator
- [ ] Verify Plan 13-02 complete: `src/infrastructure/analysis/codebase/` exists with CodebaseAnalyzer
- [ ] Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Plans 13-03 and 13-04 sections
- [ ] Review existing `src/persistence/memory/` for MemorySystem patterns
- [ ] Review existing `src/orchestration/` for orchestration patterns
- [ ] Check `src/persistence/database/schema.ts` for existing schema patterns

## Dependencies on Previous Plans

This combined plan uses:
```typescript
// From Plan 13-01
import { RepoMapGenerator, RepoMap, SymbolEntry } from '../infrastructure/analysis';

// From Plan 13-02
import { CodebaseAnalyzer, CodebaseDocumentation } from '../infrastructure/analysis/codebase';
```

---

## Task Structure Overview

This combined plan has **13 tasks** in 4 parts:

```
PART 1: CODE MEMORY (Plan 13-03)
================================
Task 1: Types & Interfaces --------------> [TASK 1 COMPLETE]
Task 2: Database Schema -----------------> [COMPLETE]
Task 3: Code Chunker --------------------> [COMPLETE]
Task 4: CodeMemory Core -----------------> [PENDING]
Task 5: Semantic Search Engine ----------> [PENDING]
Task 6: MemorySystem Integration --------> [PENDING]

PART 2: FRESH CONTEXT MANAGER (Plan 13-04)
==========================================
Task 7: Fresh Context Types -------------> [PENDING]
Task 8: Token Budgeter ------------------> [PENDING]
Task 9: FreshContextManager Core --------> [PENDING]
Task 10: Context Builder ----------------> [PENDING]
Task 11: AgentPool Integration ----------> [PENDING]

PART 3: INTEGRATION
===================
Task 12: Cross-Module Integration -------> [PENDING]

PART 4: FINAL VERIFICATION
==========================
Task 13: Lint & Quality Check -----------> [PENDING]
```

---

# ============================================================================
# PART 1: CODE MEMORY (Plan 13-03)
# ============================================================================

# Task 1: Types & Interfaces

## Objective
Define all TypeScript interfaces and types for the Code Memory system.

## Requirements

### Part A: Create Directory Structure
- [x] Create directory: `src/persistence/memory/code/`
- [x] This module extends the existing memory system in Layer 6

### Part B: Create Types File
Create `src/persistence/memory/code/types.ts`:

- [ ] **CodeChunk Interface** - A chunk of code with embeddings
  ```typescript
  interface CodeChunk {
    id: string;
    projectId: string;
    file: string;
    startLine: number;
    endLine: number;
    content: string;
    embedding: number[];
    symbols: string[];
    chunkType: CodeChunkType;
    metadata: CodeChunkMetadata;
    indexedAt: Date;
  }
  ```

- [ ] **CodeChunkType Type**
  ```typescript
  type CodeChunkType = 'function' | 'class' | 'interface' | 'type' | 'module' | 'block';
  ```

- [ ] **CodeChunkMetadata Interface**
  ```typescript
  interface CodeChunkMetadata {
    language: string;
    complexity?: number;
    dependencies?: string[];
    exports?: string[];
    documentation?: string;
    hash: string;  // For change detection
  }
  ```

- [ ] **CodeSearchResult Interface**
  ```typescript
  interface CodeSearchResult {
    chunk: CodeChunk;
    score: number;
    highlights?: string[];
  }
  ```

- [ ] **CodeSearchOptions Interface**
  ```typescript
  interface CodeSearchOptions {
    projectId?: string;
    filePattern?: string;
    language?: string;
    chunkTypes?: CodeChunkType[];
    limit?: number;
    threshold?: number;
    includeContext?: boolean;
  }
  ```

- [ ] **DEFAULT_SEARCH_OPTIONS Constant**
  ```typescript
  const DEFAULT_SEARCH_OPTIONS: Required<CodeSearchOptions> = {
    projectId: '',
    filePattern: '**/*',
    language: '',
    chunkTypes: ['function', 'class', 'interface', 'type', 'module', 'block'],
    limit: 10,
    threshold: 0.7,
    includeContext: false,
  };
  ```

- [ ] **CodeUsage Interface**
  ```typescript
  interface CodeUsage {
    file: string;
    line: number;
    column: number;
    context: string;
    usageType: 'call' | 'import' | 'reference' | 'assignment' | 'type_reference';
  }
  ```

- [ ] **CodeDefinition Interface**
  ```typescript
  interface CodeDefinition {
    file: string;
    line: number;
    column: number;
    signature: string;
    documentation?: string;
    chunk?: CodeChunk;
  }
  ```

- [ ] **IndexStats Interface**
  ```typescript
  interface IndexStats {
    filesIndexed: number;
    chunksCreated: number;
    tokensProcessed: number;
    duration: number;
    errors: string[];
  }
  ```

- [ ] **ChunkingOptions Interface**
  ```typescript
  interface ChunkingOptions {
    maxChunkSize?: number;      // Default: 1000 tokens
    minChunkSize?: number;      // Default: 50 tokens
    overlapSize?: number;       // Default: 50 tokens for context
    preserveBoundaries?: boolean; // Default: true (respect function/class bounds)
  }
  ```

- [ ] **ICodeMemory Interface**
  ```typescript
  interface ICodeMemory {
    // Indexing
    indexFile(file: string, content: string): Promise<CodeChunk[]>;
    indexProject(projectPath: string, options?: ChunkingOptions): Promise<IndexStats>;
    updateFile(file: string, content: string): Promise<CodeChunk[]>;
    removeFile(file: string): Promise<number>;
    
    // Queries
    searchCode(query: string, options?: CodeSearchOptions): Promise<CodeSearchResult[]>;
    findSimilarCode(codeSnippet: string, limit?: number): Promise<CodeSearchResult[]>;
    findUsages(symbolName: string, projectId?: string): Promise<CodeUsage[]>;
    findDefinition(symbolName: string, projectId?: string): Promise<CodeDefinition | null>;
    
    // Chunk management
    getChunksForFile(file: string): Promise<CodeChunk[]>;
    getChunkById(chunkId: string): Promise<CodeChunk | null>;
    getChunkCount(projectId?: string): Promise<number>;
    
    // Maintenance
    clearProject(projectId: string): Promise<number>;
    rebuildIndex(projectId: string): Promise<IndexStats>;
  }
  ```

- [ ] **ICodeChunker Interface**
  ```typescript
  interface ICodeChunker {
    chunkFile(file: string, content: string, options?: ChunkingOptions): CodeChunk[];
    chunkBySymbols(file: string, content: string, symbols: SymbolEntry[]): CodeChunk[];
  }
  ```

- [ ] **ICodeSearchEngine Interface**
  ```typescript
  interface ICodeSearchEngine {
    search(query: string, chunks: CodeChunk[], options?: CodeSearchOptions): CodeSearchResult[];
    findSimilar(embedding: number[], chunks: CodeChunk[], limit: number): CodeSearchResult[];
    calculateSimilarity(embedding1: number[], embedding2: number[]): number;
  }
  ```

- [ ] Export all types

### Task 1 Completion Checklist
- [x] Directory `src/persistence/memory/code/` created
- [x] `types.ts` created with all interfaces (~435 lines)
- [x] All types properly exported
- [x] TypeScript compiles

**[TASK 1 COMPLETE]** - Completed: types.ts with all interfaces created and compiling

---

# Task 2: Database Schema

## Objective
Add the code_chunks table to the database schema with proper indexes.

## Requirements

### Part A: Extend Database Schema
Update `src/persistence/database/schema.ts`:

- [ ] Add `codeChunks` table definition:
  ```typescript
  export const codeChunks = sqliteTable('code_chunks', {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    file: text('file').notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    content: text('content').notNull(),
    embedding: blob('embedding'),
    symbols: text('symbols', { mode: 'json' }).$type<string[]>(),
    chunkType: text('chunk_type').notNull(),
    language: text('language').notNull(),
    complexity: integer('complexity'),
    hash: text('hash').notNull(),
    indexedAt: integer('indexed_at', { mode: 'timestamp' }).notNull(),
  });
  ```

- [ ] Add indexes for common queries:
  ```typescript
  export const codeChunksFileIdx = index('code_chunks_file_idx').on(codeChunks.file);
  export const codeChunksProjectIdx = index('code_chunks_project_idx').on(codeChunks.projectId);
  export const codeChunksHashIdx = index('code_chunks_hash_idx').on(codeChunks.hash);
  ```

### Part B: Create Migration (if using migrations)
- [ ] Create migration file if project uses migrations
- [ ] Or document that schema auto-syncs on startup

### Part C: Create Repository Class
Create `src/persistence/memory/code/CodeChunkRepository.ts`:

- [ ] **CodeChunkRepository Class**
  ```typescript
  class CodeChunkRepository {
    constructor(private db: DatabaseConnection);
    
    // CRUD operations
    insert(chunk: CodeChunk): Promise<void>;
    insertMany(chunks: CodeChunk[]): Promise<void>;
    update(chunk: CodeChunk): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByFile(file: string): Promise<number>;
    deleteByProject(projectId: string): Promise<number>;
    
    // Queries
    findById(id: string): Promise<CodeChunk | null>;
    findByFile(file: string): Promise<CodeChunk[]>;
    findByProject(projectId: string): Promise<CodeChunk[]>;
    findByHash(hash: string): Promise<CodeChunk | null>;
    count(projectId?: string): Promise<number>;
    
    // Bulk operations
    findAll(options?: { limit?: number; offset?: number }): Promise<CodeChunk[]>;
  }
  ```

- [ ] Implement all methods with proper error handling
- [ ] Use prepared statements for performance

### Part D: Create Repository Tests
Create `src/persistence/memory/code/CodeChunkRepository.test.ts`:

- [ ] Test insert and retrieve
- [ ] Test insertMany
- [ ] Test update
- [ ] Test delete operations
- [ ] Test queries by file, project
- [ ] Test count

### Task 2 Completion Checklist
- [x] Schema updated with code_chunks table
- [x] Indexes added
- [x] `CodeChunkRepository.ts` created (~387 lines)
- [x] `CodeChunkRepository.test.ts` created (~493 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 2 COMPLETE]** - Completed: Schema, Migration, CodeChunkRepository with 33 passing tests

---

# Task 3: Code Chunker

## Objective
Implement intelligent code chunking that respects function/class boundaries.

## Requirements

### Part A: Create CodeChunker Class
Create `src/persistence/memory/code/CodeChunker.ts`:

- [x] **CodeChunker Class** implementing ICodeChunker

- [x] **Constructor**
  - [x] Accept TreeSitterParser for symbol extraction
  - [x] Accept optional default ChunkingOptions

- [x] **chunkFile(file, content, options?) Method**
  - [x] Handle empty/whitespace content
  - [x] Detect language from file extension
  - [x] Fall back to line-based chunking
  - [x] Return array of CodeChunk

- [x] **chunkBySymbols(file, content, symbols) Method**
  - [x] Sort symbols by start line
  - [x] Create chunk for each top-level symbol (function, class, interface, type)
  - [x] For classes, include methods as part of class chunk
  - [x] Handle nested symbols properly
  - [x] Create chunks for code between symbols (imports, constants)
  - [x] Generate unique IDs for each chunk
  - [x] Calculate hash for change detection

- [x] **chunkByLines(file, content, options) Private Method**
  - [x] Fallback for files without clear symbol boundaries
  - [x] Split by configurable chunk size
  - [x] Add overlap for context preservation
  - [x] Respect line boundaries (don't split mid-line)

- [x] **createChunk(file, content, startLine, endLine, type, symbols) Private Method**
  - [x] Create CodeChunk object
  - [x] Generate unique ID with hash
  - [x] Calculate content hash
  - [x] Extract metadata (language, dependencies)
  - [x] Leave embedding as empty (filled later)

- [x] **detectLanguage(file) Private Method**
  - [x] Based on file extension
  - [x] Supports TS, JS, Python, Ruby, Go, Rust, Java, C/C++, etc.

- [x] **calculateHash(content) Private Method**
  - [x] Use crypto.createHash('sha256')
  - [x] Return hex digest

- [x] **extractDependencies(content) Private Method**
  - [x] Find import statements (ES6, CommonJS, dynamic)
  - [x] Return array of imported module names

- [x] **getProjectId(file) Private Method**
  - [x] Extract project ID from file path
  - [x] Or use configured project ID

### Part B: Create Tests
Create `src/persistence/memory/code/CodeChunker.test.ts`:

- [x] Test chunking TypeScript file with functions
- [x] Test chunking file with classes and methods
- [x] Test chunking file with interfaces and types
- [x] Test chunking file with mixed content
- [x] Test fallback line-based chunking
- [x] Test hash calculation
- [x] Test dependency extraction
- [x] Test overlap handling

### Task 3 Completion Checklist
- [x] `CodeChunker.ts` created (~560 lines)
- [x] `CodeChunker.test.ts` created (~530 lines)
- [x] All tests pass (38 tests)
- [x] TypeScript compiles

**[TASK 3 COMPLETE]** - Completed: CodeChunker with 38 passing tests

---

# Task 4: CodeMemory Core

## Objective
Implement the main CodeMemory class that manages code chunk storage and retrieval.

## Requirements

### Part A: Create CodeMemory Class
Create `src/persistence/memory/code/CodeMemory.ts`:

- [ ] **CodeMemory Class** implementing ICodeMemory

- [ ] **Constructor**
  - [ ] Accept CodeChunkRepository
  - [ ] Accept CodeChunker
  - [ ] Accept EmbeddingsService (for generating embeddings)
  - [ ] Accept optional configuration

- [ ] **indexFile(file, content) Method**
  - [ ] Chunk the file using CodeChunker
  - [ ] Generate embeddings for each chunk using EmbeddingsService
  - [ ] Store chunks in repository
  - [ ] Return created chunks

- [ ] **indexProject(projectPath, options?) Method**
  - [ ] Find all source files (*.ts, *.tsx, *.js, *.jsx)
  - [ ] Exclude node_modules, dist, etc.
  - [ ] Index each file
  - [ ] Track statistics
  - [ ] Handle errors gracefully (continue on single file failure)
  - [ ] Return IndexStats

- [ ] **updateFile(file, content) Method**
  - [ ] Calculate new content hash
  - [ ] Compare with existing chunks
  - [ ] If changed, remove old chunks and create new ones
  - [ ] If unchanged, return existing chunks
  - [ ] Return updated chunks

- [ ] **removeFile(file) Method**
  - [ ] Delete all chunks for file
  - [ ] Return count of deleted chunks

- [ ] **searchCode(query, options?) Method**
  - [ ] Generate embedding for query
  - [ ] Find chunks matching options (project, file pattern, etc.)
  - [ ] Use CodeSearchEngine to rank by similarity
  - [ ] Filter by threshold
  - [ ] Return top N results

- [ ] **findSimilarCode(codeSnippet, limit?) Method**
  - [ ] Generate embedding for snippet
  - [ ] Search all chunks for similar code
  - [ ] Return ranked results

- [ ] **findUsages(symbolName, projectId?) Method**
  - [ ] Search chunk contents for symbol references
  - [ ] Parse to find usage type
  - [ ] Return CodeUsage array

- [ ] **findDefinition(symbolName, projectId?) Method**
  - [ ] Search chunks for symbol definition
  - [ ] Look for function/class/interface declarations
  - [ ] Return CodeDefinition or null

- [ ] **getChunksForFile(file) Method**
  - [ ] Query repository for file chunks
  - [ ] Return ordered by line number

- [ ] **getChunkById(chunkId) Method**
  - [ ] Query repository by ID
  - [ ] Return chunk or null

- [ ] **getChunkCount(projectId?) Method**
  - [ ] Return count from repository

- [ ] **clearProject(projectId) Method**
  - [ ] Delete all chunks for project
  - [ ] Return deleted count

- [ ] **rebuildIndex(projectId) Method**
  - [ ] Clear existing chunks
  - [ ] Re-index all files
  - [ ] Return new stats

### Part B: Handle Embeddings
- [ ] Use existing EmbeddingsService if available
- [ ] Or create mock/stub for testing
- [ ] Embeddings should be configurable (model, dimensions)

### Part C: Create Tests
Create `src/persistence/memory/code/CodeMemory.test.ts`:

- [ ] Test indexFile
- [ ] Test indexProject
- [ ] Test updateFile (changed and unchanged)
- [ ] Test removeFile
- [ ] Test searchCode
- [ ] Test findSimilarCode
- [ ] Test findUsages
- [ ] Test findDefinition
- [ ] Test getChunksForFile
- [ ] Test clearProject
- [ ] Test rebuildIndex

### Task 4 Completion Checklist
- [ ] `CodeMemory.ts` created (~400 lines)
- [ ] `CodeMemory.test.ts` created (~250 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 4 COMPLETE]** <- Mark when done, proceed to Task 5

---

# Task 5: Semantic Search Engine

## Objective
Implement vector similarity search for code chunks.

## Requirements

### Part A: Create CodeSearchEngine Class
Create `src/persistence/memory/code/CodeSearchEngine.ts`:

- [ ] **CodeSearchEngine Class** implementing ICodeSearchEngine

- [ ] **search(query, chunks, options?) Method**
  - [ ] If query is embedding, use directly
  - [ ] If query is string, generate embedding first
  - [ ] Calculate similarity for each chunk
  - [ ] Filter by threshold
  - [ ] Sort by score descending
  - [ ] Apply limit
  - [ ] Generate highlights if requested
  - [ ] Return CodeSearchResult array

- [ ] **findSimilar(embedding, chunks, limit) Method**
  - [ ] Calculate similarity for all chunks
  - [ ] Sort by score
  - [ ] Return top N

- [ ] **calculateSimilarity(embedding1, embedding2) Method**
  - [ ] Implement cosine similarity
  - [ ] Handle different vector lengths
  - [ ] Return score 0.0 - 1.0

- [ ] **cosineSimilarity(a, b) Private Method**
  - [ ] Calculate dot product
  - [ ] Calculate magnitudes
  - [ ] Return dot / (mag_a * mag_b)

- [ ] **generateHighlights(query, content) Private Method**
  - [ ] Find matching terms in content
  - [ ] Extract surrounding context
  - [ ] Return highlighted snippets

- [ ] **filterChunks(chunks, options) Private Method**
  - [ ] Filter by projectId
  - [ ] Filter by filePattern (glob match)
  - [ ] Filter by language
  - [ ] Filter by chunkTypes
  - [ ] Return filtered array

- [ ] **normalizeScore(rawScore) Private Method**
  - [ ] Ensure score is in 0.0 - 1.0 range
  - [ ] Apply any score adjustments

### Part B: Optimization
- [ ] Consider batch similarity calculation
- [ ] Cache embeddings when possible
- [ ] Use typed arrays for performance

### Part C: Create Tests
Create `src/persistence/memory/code/CodeSearchEngine.test.ts`:

- [ ] Test cosine similarity calculation
- [ ] Test search with various options
- [ ] Test findSimilar
- [ ] Test filtering
- [ ] Test threshold filtering
- [ ] Test limit application
- [ ] Test highlight generation
- [ ] Test edge cases (empty chunks, no matches)

### Task 5 Completion Checklist
- [ ] `CodeSearchEngine.ts` created (~250 lines)
- [ ] `CodeSearchEngine.test.ts` created (~150 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 5 COMPLETE]** <- Mark when done, proceed to Task 6

---

# Task 6: MemorySystem Integration

## Objective
Integrate CodeMemory into the existing MemorySystem for unified memory access.

## Requirements

### Part A: Create Index File
Create `src/persistence/memory/code/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export CodeChunkRepository
- [ ] Export CodeChunker
- [ ] Export CodeMemory
- [ ] Export CodeSearchEngine
- [ ] Export factory function: `createCodeMemory()`

### Part B: Extend MemorySystem (if exists)
If `src/persistence/memory/MemorySystem.ts` exists, extend it:

- [ ] Add CodeMemory as a component
- [ ] Add methods that delegate to CodeMemory:
  - `searchCode(query, options)`
  - `indexProjectCode(projectPath)`
  - `getCodeContext(query, maxTokens)`

- [ ] If MemorySystem doesn't exist, create standalone access pattern

### Part C: Create Facade (Alternative)
If MemorySystem extension is complex, create `src/persistence/memory/code/CodeMemoryFacade.ts`:

- [ ] Simple factory that creates configured CodeMemory
- [ ] Handles dependency injection
- [ ] Provides singleton access if needed

### Part D: Create Integration Tests
Create `src/persistence/memory/code/integration.test.ts`:

- [ ] Test full indexing pipeline
- [ ] Test search across indexed project
- [ ] Test incremental updates
- [ ] Test with real Nexus code (or subset)

### Task 6 Completion Checklist
- [ ] `index.ts` created with all exports (~50 lines)
- [ ] MemorySystem integration or facade created (~100 lines)
- [ ] `integration.test.ts` created (~100 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 6 COMPLETE]** <- Mark when done, proceed to Task 7

---

# ============================================================================
# PART 2: FRESH CONTEXT MANAGER (Plan 13-04)
# ============================================================================

# Task 7: Fresh Context Types

## Objective
Define all TypeScript interfaces for the Fresh Context Manager system.

## Requirements

### Part A: Create Directory Structure
- [ ] Create directory: `src/orchestration/context/`
- [ ] This module lives in Layer 2 (Orchestration)

### Part B: Create Types File
Create `src/orchestration/context/types.ts`:

- [ ] **TaskContext Interface** - Complete context for a task
  ```typescript
  interface TaskContext {
    // Structural (same every task)
    repoMap: string;
    codebaseDocs: CodebaseDocsSummary;
    projectConfig: ProjectConfig;
    
    // Task-specific (fresh each time)
    taskSpec: TaskSpec;
    relevantFiles: FileContent[];
    relevantCode: CodeSearchResult[];
    relevantMemories: MemoryEntry[];
    
    // Always empty for fresh context
    conversationHistory: never[];
    
    // Metadata
    tokenCount: number;
    tokenBudget: number;
    generatedAt: Date;
    contextId: string;
  }
  ```

- [ ] **TaskSpec Interface**
  ```typescript
  interface TaskSpec {
    id: string;
    name: string;
    description: string;
    files: string[];
    testCriteria: string;
    acceptanceCriteria: string[];
    dependencies: string[];
    estimatedTime: number;
  }
  ```

- [ ] **FileContent Interface**
  ```typescript
  interface FileContent {
    path: string;
    content: string;
    tokenCount: number;
    relevanceScore: number;
    includeReason: FileIncludeReason;
  }
  ```

- [ ] **FileIncludeReason Type**
  ```typescript
  type FileIncludeReason = 'task_file' | 'dependency' | 'test' | 'type_definition' | 'related' | 'requested';
  ```

- [ ] **CodebaseDocsSummary Interface**
  ```typescript
  interface CodebaseDocsSummary {
    architectureSummary: string;
    relevantPatterns: string[];
    relevantAPIs: string[];
    tokenCount: number;
  }
  ```

- [ ] **ProjectConfig Interface**
  ```typescript
  interface ProjectConfig {
    name: string;
    path: string;
    language: string;
    framework?: string;
    testFramework?: string;
  }
  ```

- [ ] **MemoryEntry Interface** (if not already defined)
  ```typescript
  interface MemoryEntry {
    id: string;
    content: string;
    relevanceScore: number;
    source: string;
    tokenCount: number;
  }
  ```

- [ ] **ContextOptions Interface**
  ```typescript
  interface ContextOptions {
    maxTokens?: number;
    includeRepoMap?: boolean;
    includeCodebaseDocs?: boolean;
    maxRelevantFiles?: number;
    maxCodeResults?: number;
    maxMemories?: number;
    codeSearchQuery?: string;
  }
  ```

- [ ] **DEFAULT_CONTEXT_OPTIONS Constant**
  ```typescript
  const DEFAULT_CONTEXT_OPTIONS: Required<ContextOptions> = {
    maxTokens: 150000,
    includeRepoMap: true,
    includeCodebaseDocs: true,
    maxRelevantFiles: 10,
    maxCodeResults: 5,
    maxMemories: 5,
    codeSearchQuery: '',
  };
  ```

- [ ] **ContextValidation Interface**
  ```typescript
  interface ContextValidation {
    valid: boolean;
    tokenCount: number;
    maxTokens: number;
    breakdown: TokenBreakdown;
    warnings: string[];
    suggestions: string[];
  }
  ```

- [ ] **TokenBreakdown Interface**
  ```typescript
  interface TokenBreakdown {
    systemPrompt: number;
    repoMap: number;
    codebaseDocs: number;
    taskSpec: number;
    files: number;
    codeResults: number;
    memories: number;
    reserved: number;
    total: number;
  }
  ```

- [ ] **TokenBudget Interface**
  ```typescript
  interface TokenBudget {
    total: number;
    fixed: {
      systemPrompt: number;
      repoMap: number;
      codebaseDocs: number;
      taskSpec: number;
      reserved: number;
    };
    dynamic: {
      files: number;
      codeResults: number;
      memories: number;
    };
  }
  ```

- [ ] **IFreshContextManager Interface**
  ```typescript
  interface IFreshContextManager {
    buildFreshContext(task: TaskSpec, options?: ContextOptions): Promise<TaskContext>;
    clearAgentContext(agentId: string): Promise<void>;
    clearTaskContext(taskId: string): Promise<void>;
    validateContext(context: TaskContext): ContextValidation;
    estimateTokenCount(text: string): number;
  }
  ```

- [ ] **ITokenBudgeter Interface**
  ```typescript
  interface ITokenBudgeter {
    createBudget(totalTokens: number): TokenBudget;
    allocate(budget: TokenBudget, content: ContextContent): TokenAllocation;
    truncateToFit(content: string, maxTokens: number): string;
  }
  ```

- [ ] **IContextBuilder Interface**
  ```typescript
  interface IContextBuilder {
    buildRepoMapContext(projectPath: string, maxTokens: number): Promise<string>;
    buildCodebaseDocsContext(projectPath: string, taskSpec: TaskSpec, maxTokens: number): Promise<CodebaseDocsSummary>;
    buildFileContext(files: string[], maxTokens: number): Promise<FileContent[]>;
    buildCodeContext(query: string, maxTokens: number): Promise<CodeSearchResult[]>;
    buildMemoryContext(taskSpec: TaskSpec, maxTokens: number): Promise<MemoryEntry[]>;
  }
  ```

- [ ] Export all types

### Task 7 Completion Checklist
- [ ] Directory `src/orchestration/context/` created
- [ ] `types.ts` created with all interfaces (~300 lines)
- [ ] All types properly exported
- [x] TypeScript compiles

**[TASK 7 COMPLETE]** <- Mark when done, proceed to Task 8

---

# Task 8: Token Budgeter

## Objective
Implement smart token allocation across context components.

## Requirements

### Part A: Create TokenBudgeter Class
Create `src/orchestration/context/TokenBudgeter.ts`:

- [ ] **TokenBudgeter Class** implementing ITokenBudgeter

- [ ] **CHARS_PER_TOKEN Constant**
  ```typescript
  private static readonly CHARS_PER_TOKEN = 4;
  ```

- [ ] **DEFAULT_BUDGET Constant**
  ```typescript
  private static readonly DEFAULT_BUDGET = {
    systemPrompt: 2000,
    repoMap: 2000,
    codebaseDocs: 3000,
    taskSpec: 1000,
    reserved: 16000,  // For response
  };
  ```

- [ ] **createBudget(totalTokens) Method**
  - [ ] Calculate fixed allocations
  - [ ] Calculate remaining for dynamic content
  - [ ] Allocate dynamic: 60% files, 25% code, 15% memories
  - [ ] Return TokenBudget

- [ ] **allocate(budget, content) Method**
  - [ ] Fit content into budget
  - [ ] Prioritize: task files > dependencies > code results > memories
  - [ ] Truncate lower priority when over budget
  - [ ] Return TokenAllocation with actual sizes

- [ ] **truncateToFit(content, maxTokens) Method**
  - [ ] Estimate current tokens
  - [ ] If under, return as-is
  - [ ] If over, truncate intelligently (at line/statement boundaries)
  - [ ] Add truncation indicator

- [ ] **estimateTokens(text) Method**
  - [ ] Return Math.ceil(text.length / CHARS_PER_TOKEN)

- [ ] **truncateAtBoundary(text, maxChars) Private Method**
  - [ ] Find last newline before limit
  - [ ] Or last period/semicolon
  - [ ] Return truncated text

- [ ] **createAllocationReport(budget, allocation) Method**
  - [ ] Return human-readable breakdown
  - [ ] Show percentages used
  - [ ] Flag any truncations

### Part B: Create Tests
Create `src/orchestration/context/TokenBudgeter.test.ts`:

- [ ] Test budget creation
- [ ] Test allocation with content under budget
- [ ] Test allocation with content over budget
- [ ] Test truncation
- [ ] Test token estimation
- [ ] Test boundary truncation

### Task 8 Completion Checklist
- [ ] `TokenBudgeter.ts` created (~200 lines)
- [ ] `TokenBudgeter.test.ts` created (~150 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 8 COMPLETE]** <- Mark when done, proceed to Task 9

---

# Task 9: FreshContextManager Core

## Objective
Implement the main FreshContextManager class.

## Requirements

### Part A: Create FreshContextManager Class
Create `src/orchestration/context/FreshContextManager.ts`:

- [ ] **FreshContextManager Class** implementing IFreshContextManager

- [ ] **Constructor**
  - [ ] Accept TokenBudgeter
  - [ ] Accept ContextBuilder
  - [ ] Accept optional configuration
  - [ ] Initialize context tracking Map

- [ ] **buildFreshContext(task, options?) Method** - MAIN METHOD
  - [ ] Merge options with defaults
  - [ ] Create token budget
  - [ ] Clear any existing context for task
  - [ ] Build each context component:
    1. Build repo map context
    2. Build codebase docs summary
    3. Build file context for task files
    4. Build code search results
    5. Build relevant memories
  - [ ] Allocate tokens across components
  - [ ] Assemble TaskContext
  - [ ] Validate total size
  - [ ] Store context reference
  - [ ] Return TaskContext

- [ ] **clearAgentContext(agentId) Method**
  - [ ] Remove context associated with agent
  - [ ] Log cleanup

- [ ] **clearTaskContext(taskId) Method**
  - [ ] Remove context for task
  - [ ] Log cleanup

- [ ] **validateContext(context) Method**
  - [ ] Check total tokens against budget
  - [ ] Check each component
  - [ ] Generate warnings for large components
  - [ ] Generate suggestions for optimization
  - [ ] Return ContextValidation

- [ ] **estimateTokenCount(text) Method**
  - [ ] Delegate to TokenBudgeter

- [ ] **getActiveContexts() Method**
  - [ ] Return Map of active contexts (for debugging)

- [ ] **getContextStats() Method**
  - [ ] Return statistics about context usage

### Part B: Create Tests
Create `src/orchestration/context/FreshContextManager.test.ts`:

- [ ] Test building fresh context
- [ ] Test context clearing
- [ ] Test validation
- [ ] Test token estimation
- [ ] Test with various options
- [ ] Test that conversation history is always empty

### Task 9 Completion Checklist
- [ ] `FreshContextManager.ts` created (~250 lines)
- [ ] `FreshContextManager.test.ts` created (~150 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 9 COMPLETE]** <- Mark when done, proceed to Task 10

---

# Task 10: Context Builder

## Objective
Implement the ContextBuilder that assembles context components.

## Requirements

### Part A: Create ContextBuilder Class
Create `src/orchestration/context/ContextBuilder.ts`:

- [ ] **ContextBuilder Class** implementing IContextBuilder

- [ ] **Constructor**
  - [ ] Accept RepoMapGenerator (from Plan 13-01)
  - [ ] Accept CodebaseAnalyzer (from Plan 13-02)
  - [ ] Accept CodeMemory (from Plan 13-03)
  - [ ] Accept FileSystemService
  - [ ] Accept MemorySystem (if exists)

- [ ] **buildRepoMapContext(projectPath, maxTokens) Method**
  - [ ] Generate or get cached repo map
  - [ ] Format for context
  - [ ] Truncate to fit tokens
  - [ ] Return formatted string

- [ ] **buildCodebaseDocsContext(projectPath, taskSpec, maxTokens) Method**
  - [ ] Get architecture summary (first N tokens)
  - [ ] Find patterns relevant to task files
  - [ ] Find APIs relevant to task
  - [ ] Combine and truncate
  - [ ] Return CodebaseDocsSummary

- [ ] **buildFileContext(files, maxTokens) Method**
  - [ ] Read each file
  - [ ] Calculate relevance (task file > dependency)
  - [ ] Sort by relevance
  - [ ] Include as many as fit in budget
  - [ ] Return FileContent array

- [ ] **buildCodeContext(query, maxTokens) Method**
  - [ ] Search CodeMemory for query
  - [ ] Get top results
  - [ ] Truncate to fit
  - [ ] Return CodeSearchResult array

- [ ] **buildMemoryContext(taskSpec, maxTokens) Method**
  - [ ] Query MemorySystem for relevant memories
  - [ ] Filter by relevance
  - [ ] Truncate to fit
  - [ ] Return MemoryEntry array

- [ ] **findRelatedFiles(taskSpec) Private Method**
  - [ ] Use dependency graph to find related files
  - [ ] Include test files
  - [ ] Include type definition files
  - [ ] Return ranked file list

- [ ] **extractRelevantPatterns(patterns, files) Private Method**
  - [ ] Match patterns to files being edited
  - [ ] Return relevant pattern names

- [ ] **extractRelevantAPIs(apiSurface, files) Private Method**
  - [ ] Find APIs used by task files
  - [ ] Return API summaries

### Part B: Create Tests
Create `src/orchestration/context/ContextBuilder.test.ts`:

- [ ] Test repo map context building
- [ ] Test codebase docs context
- [ ] Test file context building
- [ ] Test code context building
- [ ] Test memory context building
- [ ] Test related file finding

### Task 10 Completion Checklist
- [ ] `ContextBuilder.ts` created (~350 lines)
- [ ] `ContextBuilder.test.ts` created (~200 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 10 COMPLETE]** <- Mark when done, proceed to Task 11

---

# Task 11: AgentPool Integration

## Objective
Integrate FreshContextManager into the agent spawning workflow.

## Requirements

### Part A: Create Context Integration Module
Create `src/orchestration/context/AgentContextIntegration.ts`:

- [ ] **AgentContextIntegration Class**
  - [ ] Wraps FreshContextManager
  - [ ] Provides hooks for AgentPool

- [ ] **prepareAgentContext(agentId, task) Method**
  - [ ] Build fresh context for task
  - [ ] Store context for agent
  - [ ] Return context

- [ ] **onTaskComplete(agentId, taskId) Method**
  - [ ] Clear agent context
  - [ ] Clear task context
  - [ ] Log cleanup

- [ ] **onTaskFailed(agentId, taskId) Method**
  - [ ] Clear contexts
  - [ ] Preserve error info if needed

- [ ] **getAgentContext(agentId) Method**
  - [ ] Return current context for agent
  - [ ] Or null if none

### Part B: Create AgentPool Hooks (if AgentPool exists)
If `src/orchestration/agents/AgentPool.ts` exists, add:

- [ ] Import AgentContextIntegration
- [ ] Call prepareAgentContext before assigning task
- [ ] Call onTaskComplete/onTaskFailed on task completion

If AgentPool doesn't exist, document integration points.

### Part C: Create Index File
Create `src/orchestration/context/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export TokenBudgeter
- [ ] Export FreshContextManager
- [ ] Export ContextBuilder
- [ ] Export AgentContextIntegration
- [ ] Export factory function: `createFreshContextManager()`

### Part D: Create Integration Tests
Create `src/orchestration/context/integration.test.ts`:

- [ ] Test full context building pipeline
- [ ] Test context isolation between tasks
- [ ] Test cleanup after task completion
- [ ] Test with mock AgentPool

### Task 11 Completion Checklist
- [ ] `AgentContextIntegration.ts` created (~150 lines)
- [ ] AgentPool integration documented or implemented
- [ ] `index.ts` created (~50 lines)
- [ ] `integration.test.ts` created (~100 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 11 COMPLETE]** <- Mark when done, proceed to Task 12

---

# ============================================================================
# PART 3: INTEGRATION
# ============================================================================

# Task 12: Cross-Module Integration

## Objective
Ensure Code Memory and Fresh Context Manager work together seamlessly.

## Requirements

### Part A: Integration Points
Verify these integration points work:

- [ ] **FreshContextManager uses CodeMemory:**
  - ContextBuilder.buildCodeContext calls CodeMemory.searchCode
  - Code results included in TaskContext

- [ ] **CodeMemory uses RepoMapGenerator:**
  - CodeChunker uses TreeSitterParser from Plan 13-01
  - Symbols extracted correctly

- [ ] **FreshContextManager uses CodebaseAnalyzer:**
  - ContextBuilder.buildCodebaseDocsContext gets docs from Plan 13-02
  - Relevant patterns extracted

### Part B: Create E2E Integration Test
Create `src/integration/context-memory.integration.test.ts`:

- [ ] Test full pipeline:
  1. Index Nexus codebase with CodeMemory
  2. Build fresh context for a sample task
  3. Verify context includes:
     - Repo map
     - Codebase docs summary
     - Task files
     - Relevant code from search
  4. Verify token budget respected
  5. Verify no conversation history

### Part C: Update Parent Exports
Update `src/persistence/memory/index.ts`:
- [ ] Add export for code module: `export * from './code'`

Update `src/orchestration/index.ts` (if exists):
- [ ] Add export for context module: `export * from './context'`

### Part D: Create README Files
Create `src/persistence/memory/code/README.md`:
- [ ] Document Code Memory module
- [ ] Usage examples
- [ ] Configuration options

Create `src/orchestration/context/README.md`:
- [ ] Document Fresh Context Manager
- [ ] Usage examples
- [ ] Token budget explanation

### Task 12 Completion Checklist
- [ ] Integration points verified
- [ ] E2E integration test created (~150 lines)
- [ ] Parent exports updated
- [ ] README files created
- [ ] All integration tests pass

**[TASK 12 COMPLETE]** <- Mark when done, proceed to Task 13

---

# ============================================================================
# PART 4: FINAL VERIFICATION
# ============================================================================

# Task 13: Lint & Quality Check

## Objective
Ensure all code passes linting and quality checks before completion.

## Requirements

### Part A: Run Auto-fix
- [ ] Run: `npm run lint -- --fix`
- [ ] Note how many errors were auto-fixed

### Part B: Fix Remaining Lint Errors

Common issues to fix:

**`no-unused-vars`:**
- [ ] Remove unused imports
- [ ] Prefix unused parameters with underscore: `_param`
- [ ] Remove unused variables

**`restrict-template-expressions`:**
- [ ] Use String() for non-strings in templates
- [ ] Use ?? for possibly undefined values
- [ ] Use .join() for arrays

**`no-unsafe-*`:**
- [ ] Add proper types instead of `any`
- [ ] Use type guards where needed
- [ ] Add targeted suppressions only when unavoidable (with comment explaining why)

### Part C: Fix Files Systematically

Code Memory files:
- [ ] `src/persistence/memory/code/types.ts`
- [ ] `src/persistence/memory/code/CodeChunkRepository.ts`
- [ ] `src/persistence/memory/code/CodeChunker.ts`
- [ ] `src/persistence/memory/code/CodeMemory.ts`
- [ ] `src/persistence/memory/code/CodeSearchEngine.ts`
- [ ] `src/persistence/memory/code/index.ts`

Fresh Context files:
- [ ] `src/orchestration/context/types.ts`
- [ ] `src/orchestration/context/TokenBudgeter.ts`
- [ ] `src/orchestration/context/FreshContextManager.ts`
- [ ] `src/orchestration/context/ContextBuilder.ts`
- [ ] `src/orchestration/context/AgentContextIntegration.ts`
- [ ] `src/orchestration/context/index.ts`

Test files:
- [ ] All `*.test.ts` files

### Part D: Final Verification
- [ ] Run: `npm run lint`
  - Expected: 0 errors

- [ ] Run: `npm run build`
  - Expected: Success, no errors

- [ ] Run: `npm test src/persistence/memory/code/`
  - Expected: All tests pass

- [ ] Run: `npm test src/orchestration/context/`
  - Expected: All tests pass

- [ ] Run full test suite: `npm test`
  - Expected: All existing tests still pass (no regressions)

### Task 13 Completion Checklist
- [ ] Auto-fix applied
- [ ] All lint errors manually fixed
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All Code Memory tests pass
- [ ] All Fresh Context tests pass
- [ ] Full test suite passes (no regressions)

**[TASK 13 COMPLETE]**

---

## Output File Structure

After completion:

```
src/persistence/memory/code/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~250 lines)
|-- README.md                         # Documentation (~100 lines)
|-- CodeChunkRepository.ts            # Database operations (~200 lines)
|-- CodeChunkRepository.test.ts       # Tests (~150 lines)
|-- CodeChunker.ts                    # Code chunking (~300 lines)
|-- CodeChunker.test.ts               # Tests (~200 lines)
|-- CodeMemory.ts                     # Core implementation (~400 lines)
|-- CodeMemory.test.ts                # Tests (~250 lines)
|-- CodeSearchEngine.ts               # Search engine (~250 lines)
|-- CodeSearchEngine.test.ts          # Tests (~150 lines)
|-- integration.test.ts               # Integration tests (~100 lines)
                                      --------------------------
                                      Subtotal: ~2,400 lines

src/orchestration/context/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~300 lines)
|-- README.md                         # Documentation (~100 lines)
|-- TokenBudgeter.ts                  # Token allocation (~200 lines)
|-- TokenBudgeter.test.ts             # Tests (~150 lines)
|-- FreshContextManager.ts            # Core manager (~250 lines)
|-- FreshContextManager.test.ts       # Tests (~150 lines)
|-- ContextBuilder.ts                 # Context assembly (~350 lines)
|-- ContextBuilder.test.ts            # Tests (~200 lines)
|-- AgentContextIntegration.ts        # AgentPool hooks (~150 lines)
|-- integration.test.ts               # Integration tests (~100 lines)
                                      --------------------------
                                      Subtotal: ~2,000 lines

src/integration/
|-- context-memory.integration.test.ts  # E2E tests (~150 lines)

                                      ==========================
                                      TOTAL: ~4,550 lines
```

---

## Success Criteria

- [ ] All 13 tasks completed with markers checked
- [ ] Code Memory module in `src/persistence/memory/code/`
- [ ] Fresh Context module in `src/orchestration/context/`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compiles: `npm run build`
- [ ] ESLint passes: `npm run lint` (0 errors)
- [ ] Can index Nexus code:
  ```typescript
  const codeMemory = createCodeMemory();
  const stats = await codeMemory.indexProject('.');
  console.log('Chunks created:', stats.chunksCreated);
  ```
- [ ] Can build fresh context:
  ```typescript
  const contextManager = createFreshContextManager();
  const context = await contextManager.buildFreshContext(taskSpec);
  console.log('Token count:', context.tokenCount);
  ```
- [ ] **Total lines: ~4,500-5,500**

---

## Recommended Settings

```
--max-iterations 50
--completion-promise "PLANS_13_03_04_COMPLETE"
```

## Task Completion Markers

Complete tasks sequentially:

**Part 1: Code Memory**
- [ ] `[TASK 1 COMPLETE]` - Types & Interfaces
- [ ] `[TASK 2 COMPLETE]` - Database Schema
- [ ] `[TASK 3 COMPLETE]` - Code Chunker
- [ ] `[TASK 4 COMPLETE]` - CodeMemory Core
- [ ] `[TASK 5 COMPLETE]` - Semantic Search Engine
- [ ] `[TASK 6 COMPLETE]` - MemorySystem Integration

**Part 2: Fresh Context Manager**
- [ ] `[TASK 7 COMPLETE]` - Fresh Context Types
- [ ] `[TASK 8 COMPLETE]` - Token Budgeter
- [ ] `[TASK 9 COMPLETE]` - FreshContextManager Core
- [ ] `[TASK 10 COMPLETE]` - Context Builder
- [ ] `[TASK 11 COMPLETE]` - AgentPool Integration

**Part 3: Integration**
- [ ] `[TASK 12 COMPLETE]` - Cross-Module Integration

**Part 4: Final Verification**
- [ ] `[TASK 13 COMPLETE]` - Lint & Quality Check

**Completion:**
- [ ] `[PLANS 13-03 & 13-04 COMPLETE]` - All done

---

## Notes

- Complete tasks in order - later tasks depend on earlier ones
- Part 1 (Code Memory) must be done before Part 2 (Fresh Context) since Context uses Memory
- Task 13 (lint) is critical - do not skip it
- Reference `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` for interface details
- Follow existing Nexus patterns in the relevant layers
- Code Memory is Layer 6 (Persistence), Fresh Context is Layer 2 (Orchestration)
- This combined plan enables Plans 13-05 through 13-08

## Reference Files

For existing patterns, examine:
- `src/infrastructure/analysis/` - Plan 13-01 code
- `src/infrastructure/analysis/codebase/` - Plan 13-02 code
- `src/persistence/` - Existing persistence patterns
- `src/orchestration/` - Existing orchestration patterns
- `src/persistence/database/schema.ts` - Database schema patterns