# Phase 13: Context Enhancement & Level 4.0 Automation

> **Version:** 1.0
> **Created:** 2026-01-16
> **Status:** READY FOR IMPLEMENTATION
> **Purpose:** Close all context management gaps with competitors and achieve Level 4.0 automation
> **Estimated Duration:** 4-6 weeks
> **Total Plans:** 8
> **Total Tasks:** ~45-55

---

## Executive Summary

### The Mission

Transform Nexus from **Level 3.0** (AI writes + validates + retries) to **Level 4.0** (AI plans + writes + validates + adjusts plan + iterates persistently) by implementing:

1. **Repository Map** - Compressed codebase representation (like Aider)
2. **Codebase Documentation** - Auto-generated architecture docs (like GSD)
3. **Code Embeddings** - Semantic code search in existing MemorySystem
4. **Fresh Context Guarantee** - Explicit context cleanup per task (like GSD subagents)
5. **Dynamic Context Fetching** - Agent-requested context expansion
6. **Ralph-Style Iteration** - Persistent git-based iteration loops
7. **Dynamic Replanning** - Complexity detection and task re-decomposition
8. **Self-Assessment Engine** - Progress evaluation and blocker identification

### Gap Closure Matrix

| Gap | Competitor | Nexus After Phase 13 |
|-----|------------|---------------------|
| Repo Map | Aider | ✅ RepoMapGenerator with tree-sitter |
| Codebase Docs | GSD | ✅ CodebaseAnalyzer (7 docs) |
| Semantic Code Search | Code-Index-MCP | ✅ Extended MemorySystem |
| Fresh Context | GSD Subagents | ✅ FreshContextManager |
| Live Documentation | Context7 | ⚠️ Future MCP integration |
| LSP Integration | Serena | ⚠️ Future enhancement |
| Persistent Iteration | Ralph Wiggum | ✅ RalphStyleIterator |
| Dynamic Replanning | None (unique!) | ✅ DynamicReplanner |

### Integration Points with Existing Nexus

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXUS ARCHITECTURE + PHASE 13                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: UI                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ + CodebaseDocsViewer | + RepoMapExplorer | + IterationProgressUI   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  Layer 2: Orchestration                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NexusCoordinator                                                     │   │
│  │   + DynamicReplanner (NEW)                                          │   │
│  │   + SelfAssessmentEngine (NEW)                                      │   │
│  │ AgentPool                                                            │   │
│  │   + FreshContextManager (NEW)                                       │   │
│  │   + RalphStyleIterator (NEW)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  Layer 3: Planning                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TaskDecomposer                                                       │   │
│  │   + Complexity trigger integration                                  │   │
│  │   + Re-decomposition capability                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  Layer 4: Execution                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QALoopEngine                                                         │   │
│  │   + Ralph-style iteration mode                                      │   │
│  │   + Git diff context injection                                      │   │
│  │ AgentContextAdapter (existing)                                       │   │
│  │   + DynamicContextProvider (NEW)                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  Layer 6: Persistence                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MemorySystem (EXTEND)                                                │   │
│  │   + storeCodeChunk()                                                │   │
│  │   + queryCode()                                                     │   │
│  │   + findUsages()                                                    │   │
│  │ + RepoMapStore (NEW)                                                │   │
│  │ + CodebaseDocsStore (NEW)                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  Layer 7: Infrastructure                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ + RepoMapGenerator (NEW) - tree-sitter based                        │   │
│  │ + CodebaseAnalyzer (NEW) - multi-agent analysis                     │   │
│  │ GitService (existing)                                                │   │
│  │   + getDiffForIteration()                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plan Overview

| Plan # | Name | Focus | Tasks | Est. Hours | Priority |
|--------|------|-------|-------|------------|----------|
| **13-01** | Repository Map Generator | Tree-sitter AST extraction | 6 | 16-20 | P0 |
| **13-02** | Codebase Documentation | 7-doc generation system | 7 | 20-24 | P0 |
| **13-03** | Code Memory Extension | Extend MemorySystem for code | 5 | 12-16 | P0 |
| **13-04** | Fresh Context Manager | Explicit context cleanup | 4 | 10-12 | P1 |
| **13-05** | Dynamic Context Provider | Agent-requested context | 5 | 14-18 | P1 |
| **13-06** | Ralph-Style Iterator | Git-based persistent loops | 6 | 18-22 | P1 |
| **13-07** | Dynamic Replanner | Complexity detection & replanning | 6 | 16-20 | P1 |
| **13-08** | Self-Assessment Engine | Progress evaluation | 5 | 12-16 | P2 |
| **TOTAL** | | | **44** | **118-148** | |

---

# Plan 13-01: Repository Map Generator

## Overview

Build a tree-sitter based repository map generator that extracts symbols, signatures, and dependencies from source files to provide agents with compressed codebase understanding.

**Location:** `src/infrastructure/analysis/RepoMapGenerator.ts`
**Dependencies:** Layer 7 (FileSystemService, GitService)
**Estimated LOC:** 400-500

## Interface Definition

```typescript
// src/infrastructure/analysis/RepoMapGenerator.ts

export interface IRepoMapGenerator {
  // Generation
  generate(projectPath: string, options?: RepoMapOptions): Promise<RepoMap>;
  generateIncremental(projectPath: string, changedFiles: string[]): Promise<RepoMap>;
  
  // Queries
  findSymbol(name: string): SymbolEntry[];
  findUsages(symbolName: string): Usage[];
  findImplementations(interfaceName: string): SymbolEntry[];
  getDependencies(file: string): string[];
  getDependents(file: string): string[];
  
  // Formatting
  formatForContext(options?: FormatOptions): string;
  getTokenCount(): number;
}

export interface RepoMap {
  projectPath: string;
  generatedAt: Date;
  files: FileEntry[];
  symbols: SymbolEntry[];
  dependencies: DependencyEdge[];
  stats: RepoMapStats;
}

export interface FileEntry {
  path: string;
  relativePath: string;
  language: string;
  size: number;
  lastModified: Date;
  symbolCount: number;
}

export interface SymbolEntry {
  id: string;
  name: string;
  kind: SymbolKind;
  file: string;
  line: number;
  endLine: number;
  signature: string;           // "validateUser(user: User): boolean"
  documentation?: string;      // JSDoc/docstring if present
  references: number;          // How many times referenced (for ranking)
  exported: boolean;
}

export type SymbolKind = 
  | 'class' 
  | 'interface' 
  | 'function' 
  | 'method' 
  | 'variable' 
  | 'constant'
  | 'type'
  | 'enum'
  | 'property';

export interface DependencyEdge {
  from: string;  // File path
  to: string;    // File path
  type: 'import' | 'extends' | 'implements' | 'calls';
  symbols: string[];  // Which symbols are imported/used
}

export interface Usage {
  file: string;
  line: number;
  context: string;  // The line of code
  usageType: 'call' | 'reference' | 'assignment' | 'type';
}

export interface RepoMapOptions {
  includePatterns?: string[];   // Default: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
  excludePatterns?: string[];   // Default: ['node_modules/**', 'dist/**', '**/*.test.*']
  maxFiles?: number;            // Default: 500
  maxTokens?: number;           // Default: 2000 (for formatted output)
  languages?: string[];         // Default: ['typescript', 'javascript']
}

export interface FormatOptions {
  maxTokens?: number;           // Limit output size
  includeSignatures?: boolean;  // Include full signatures
  includeDocstrings?: boolean;  // Include documentation
  rankByReferences?: boolean;   // Sort by most referenced
  groupByFile?: boolean;        // Group symbols by file
}

export interface RepoMapStats {
  totalFiles: number;
  totalSymbols: number;
  totalDependencies: number;
  languageBreakdown: Record<string, number>;
  largestFiles: string[];
  mostReferencedSymbols: string[];
}
```

## Tasks

### Task 13-01-A: Tree-Sitter Integration Setup

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-A` |
| **Name** | Tree-Sitter Integration Setup |
| **Description** | Install and configure tree-sitter for TypeScript/JavaScript parsing |
| **Files** | `src/infrastructure/analysis/TreeSitterParser.ts`, `package.json` |
| **Estimated Time** | 25 min |
| **Dependencies** | None |

**Acceptance Criteria:**
- [ ] tree-sitter and tree-sitter-typescript installed
- [ ] TreeSitterParser class can parse TS/JS files
- [ ] Returns valid AST for test files
- [ ] Handles parse errors gracefully

**Test Spec:**
```typescript
describe('TreeSitterParser', () => {
  it('should parse TypeScript file to AST');
  it('should parse JavaScript file to AST');
  it('should handle syntax errors gracefully');
  it('should support JSX/TSX');
});
```

---

### Task 13-01-B: Symbol Extractor Implementation

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-B` |
| **Name** | Symbol Extractor Implementation |
| **Description** | Extract functions, classes, interfaces, types from AST |
| **Files** | `src/infrastructure/analysis/SymbolExtractor.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-01-A` |

**Acceptance Criteria:**
- [ ] Extracts all symbol kinds (class, function, interface, etc.)
- [ ] Captures accurate line numbers and signatures
- [ ] Handles nested symbols (methods inside classes)
- [ ] Detects exported vs internal symbols

**Test Spec:**
```typescript
describe('SymbolExtractor', () => {
  it('should extract class with methods');
  it('should extract standalone functions');
  it('should extract interfaces and types');
  it('should capture function signatures');
  it('should detect exported symbols');
});
```

---

### Task 13-01-C: Dependency Graph Builder

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-C` |
| **Name** | Dependency Graph Builder |
| **Description** | Build import/export dependency graph between files |
| **Files** | `src/infrastructure/analysis/DependencyGraphBuilder.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-01-A` |

**Acceptance Criteria:**
- [ ] Parses import statements (named, default, namespace)
- [ ] Resolves relative and absolute imports
- [ ] Builds bidirectional dependency edges
- [ ] Handles circular dependencies

**Test Spec:**
```typescript
describe('DependencyGraphBuilder', () => {
  it('should parse named imports');
  it('should parse default imports');
  it('should resolve relative paths');
  it('should build dependency edges');
  it('should detect circular dependencies');
});
```

---

### Task 13-01-D: Reference Counter with PageRank

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-D` |
| **Name** | Reference Counter with PageRank |
| **Description** | Count symbol references and rank by importance |
| **Files** | `src/infrastructure/analysis/ReferenceCounter.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-01-B`, `task_13-01-C` |

**Acceptance Criteria:**
- [ ] Counts references for each symbol
- [ ] Implements PageRank-style importance scoring
- [ ] Returns top N most important symbols
- [ ] Handles symbols with same name in different files

**Test Spec:**
```typescript
describe('ReferenceCounter', () => {
  it('should count symbol references');
  it('should rank by importance');
  it('should return top N symbols');
  it('should handle name collisions');
});
```

---

### Task 13-01-E: RepoMapGenerator Core Implementation

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-E` |
| **Name** | RepoMapGenerator Core Implementation |
| **Description** | Combine all components into main RepoMapGenerator class |
| **Files** | `src/infrastructure/analysis/RepoMapGenerator.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-01-B`, `task_13-01-C`, `task_13-01-D` |

**Acceptance Criteria:**
- [ ] Implements full IRepoMapGenerator interface
- [ ] Generates complete RepoMap for project
- [ ] Supports incremental updates
- [ ] Respects include/exclude patterns

**Test Spec:**
```typescript
describe('RepoMapGenerator', () => {
  it('should generate complete repo map');
  it('should support incremental generation');
  it('should respect include patterns');
  it('should respect exclude patterns');
  it('should handle empty projects');
});
```

---

### Task 13-01-F: RepoMap Formatter and Token Budgeting

| Field | Value |
|-------|-------|
| **ID** | `task_13-01-F` |
| **Name** | RepoMap Formatter and Token Budgeting |
| **Description** | Format repo map for context with token limits |
| **Files** | `src/infrastructure/analysis/RepoMapFormatter.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-01-E` |

**Acceptance Criteria:**
- [ ] Formats repo map as concise text
- [ ] Respects maxTokens budget
- [ ] Prioritizes most important symbols
- [ ] Supports different format styles

**Output Format Example:**
```
# Repository Map

## src/services/AuthService.ts
- class AuthService
  - validateUser(user: User): boolean
  - hashPassword(password: string): string
  - generateToken(userId: string): string

## src/controllers/UserController.ts
- class UserController
  - findById(id: string): Promise<User>
  - update(id: string, data: UpdateUserDto): Promise<User>
```

**Test Spec:**
```typescript
describe('RepoMapFormatter', () => {
  it('should format repo map as text');
  it('should respect token budget');
  it('should prioritize by reference count');
  it('should group by file');
});
```

---

## Plan 13-01 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-01-A | Tree-Sitter Integration Setup | 25 min | ⬜ |
| 13-01-B | Symbol Extractor Implementation | 30 min | ⬜ |
| 13-01-C | Dependency Graph Builder | 30 min | ⬜ |
| 13-01-D | Reference Counter with PageRank | 25 min | ⬜ |
| 13-01-E | RepoMapGenerator Core Implementation | 30 min | ⬜ |
| 13-01-F | RepoMap Formatter and Token Budgeting | 25 min | ⬜ |
| **TOTAL** | | **~165 min** | |

---

# Plan 13-02: Codebase Documentation Generator

## Overview

Build a multi-agent codebase analyzer that generates 7 structured documentation files, similar to GSD's `.planning/codebase/` directory.

**Location:** `src/infrastructure/analysis/CodebaseAnalyzer.ts`
**Output:** `.nexus/codebase/` directory with 7 markdown files
**Dependencies:** RepoMapGenerator (13-01), LLM Clients, FileSystemService

## Generated Documents

| Document | Purpose | Primary Analysis Focus |
|----------|---------|----------------------|
| `ARCHITECTURE.md` | High-level system structure | Directory structure, layer patterns, entry points |
| `PATTERNS.md` | Coding conventions & patterns | Naming, error handling, component patterns |
| `DEPENDENCIES.md` | External dependencies | package.json analysis, version constraints |
| `API_SURFACE.md` | Public interfaces | Exported functions, classes, types |
| `DATA_FLOW.md` | How data moves through system | State management, API calls, transformations |
| `TEST_STRATEGY.md` | Testing approach | Test structure, coverage, mocking patterns |
| `KNOWN_ISSUES.md` | Tech debt & gotchas | TODO comments, workarounds, complexity hotspots |

## Interface Definition

```typescript
// src/infrastructure/analysis/CodebaseAnalyzer.ts

export interface ICodebaseAnalyzer {
  // Full analysis
  analyze(projectPath: string, options?: AnalysisOptions): Promise<CodebaseDocs>;
  
  // Individual document generation
  generateArchitecture(projectPath: string): Promise<ArchitectureDoc>;
  generatePatterns(projectPath: string): Promise<PatternsDoc>;
  generateDependencies(projectPath: string): Promise<DependenciesDoc>;
  generateAPISurface(projectPath: string): Promise<APISurfaceDoc>;
  generateDataFlow(projectPath: string): Promise<DataFlowDoc>;
  generateTestStrategy(projectPath: string): Promise<TestStrategyDoc>;
  generateKnownIssues(projectPath: string): Promise<KnownIssuesDoc>;
  
  // Persistence
  saveDocs(docs: CodebaseDocs, outputDir: string): Promise<void>;
  loadDocs(docsDir: string): Promise<CodebaseDocs | null>;
  
  // Incremental updates
  updateDocs(projectPath: string, changedFiles: string[]): Promise<CodebaseDocs>;
}

export interface CodebaseDocs {
  projectPath: string;
  generatedAt: Date;
  version: string;
  architecture: ArchitectureDoc;
  patterns: PatternsDoc;
  dependencies: DependenciesDoc;
  apiSurface: APISurfaceDoc;
  dataFlow: DataFlowDoc;
  testStrategy: TestStrategyDoc;
  knownIssues: KnownIssuesDoc;
}

export interface ArchitectureDoc {
  summary: string;
  directoryStructure: DirectoryNode[];
  layers: LayerDescription[];
  entryPoints: EntryPoint[];
  keyComponents: ComponentDescription[];
}

export interface PatternsDoc {
  namingConventions: NamingConvention[];
  errorHandlingPattern: string;
  componentPatterns: ComponentPattern[];
  stateManagementPattern: string;
  asyncPatterns: string[];
}

export interface DependenciesDoc {
  runtime: DependencyInfo[];
  dev: DependencyInfo[];
  peer: DependencyInfo[];
  versionConstraints: string[];
  securityNotes: string[];
}

export interface APISurfaceDoc {
  exportedFunctions: FunctionDoc[];
  exportedClasses: ClassDoc[];
  exportedTypes: TypeDoc[];
  publicAPIs: APIEndpoint[];
}

export interface DataFlowDoc {
  stateManagement: StateDescription;
  dataTransformations: TransformationFlow[];
  apiIntegrations: APIIntegration[];
  eventFlows: EventFlow[];
}

export interface TestStrategyDoc {
  framework: string;
  structure: TestStructure;
  coverageTargets: CoverageTarget[];
  mockingStrategy: string;
  e2eApproach: string;
}

export interface KnownIssuesDoc {
  todoComments: TodoComment[];
  complexityHotspots: ComplexityHotspot[];
  techDebt: TechDebtItem[];
  workarounds: Workaround[];
}

export interface AnalysisOptions {
  includeTests?: boolean;       // Default: true
  maxFilesPerDoc?: number;      // Default: 50
  useParallelAnalysis?: boolean; // Default: true
  forceRegenerate?: boolean;    // Default: false
}
```

## Tasks

### Task 13-02-A: CodebaseAnalyzer Framework

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-A` |
| **Name** | CodebaseAnalyzer Framework |
| **Description** | Core framework for orchestrating multi-document analysis |
| **Files** | `src/infrastructure/analysis/CodebaseAnalyzer.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | Plan 13-01 complete |

**Acceptance Criteria:**
- [ ] Implements ICodebaseAnalyzer interface
- [ ] Coordinates parallel analysis agents
- [ ] Saves/loads documentation from `.nexus/codebase/`
- [ ] Supports incremental updates

---

### Task 13-02-B: Architecture Document Generator

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-B` |
| **Name** | Architecture Document Generator |
| **Description** | Generate ARCHITECTURE.md with system structure analysis |
| **Files** | `src/infrastructure/analysis/docs/ArchitectureGenerator.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-02-A` |

**Acceptance Criteria:**
- [ ] Analyzes directory structure
- [ ] Identifies architectural layers
- [ ] Documents entry points
- [ ] Generates readable markdown

---

### Task 13-02-C: Patterns Document Generator

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-C` |
| **Name** | Patterns Document Generator |
| **Description** | Generate PATTERNS.md with coding conventions |
| **Files** | `src/infrastructure/analysis/docs/PatternsGenerator.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-02-A` |

**Acceptance Criteria:**
- [ ] Detects naming conventions
- [ ] Identifies error handling patterns
- [ ] Documents component patterns
- [ ] Captures state management approach

---

### Task 13-02-D: Dependencies Document Generator

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-D` |
| **Name** | Dependencies Document Generator |
| **Description** | Generate DEPENDENCIES.md from package.json analysis |
| **Files** | `src/infrastructure/analysis/docs/DependenciesGenerator.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-02-A` |

**Acceptance Criteria:**
- [ ] Parses package.json
- [ ] Categorizes runtime/dev/peer deps
- [ ] Notes version constraints
- [ ] Flags security concerns

---

### Task 13-02-E: API Surface Document Generator

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-E` |
| **Name** | API Surface Document Generator |
| **Description** | Generate API_SURFACE.md with public interfaces |
| **Files** | `src/infrastructure/analysis/docs/APISurfaceGenerator.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-02-A`, Plan 13-01 |

**Acceptance Criteria:**
- [ ] Lists all exported symbols
- [ ] Documents function signatures
- [ ] Includes type definitions
- [ ] Groups by module

---

### Task 13-02-F: Data Flow & Test Strategy Generators

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-F` |
| **Name** | Data Flow & Test Strategy Generators |
| **Description** | Generate DATA_FLOW.md and TEST_STRATEGY.md |
| **Files** | `src/infrastructure/analysis/docs/DataFlowGenerator.ts`, `TestStrategyGenerator.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-02-A` |

**Acceptance Criteria:**
- [ ] Traces data transformations
- [ ] Documents state management
- [ ] Analyzes test structure
- [ ] Identifies coverage patterns

---

### Task 13-02-G: Known Issues Document Generator

| Field | Value |
|-------|-------|
| **ID** | `task_13-02-G` |
| **Name** | Known Issues Document Generator |
| **Description** | Generate KNOWN_ISSUES.md with tech debt analysis |
| **Files** | `src/infrastructure/analysis/docs/KnownIssuesGenerator.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-02-A` |

**Acceptance Criteria:**
- [ ] Extracts TODO/FIXME/HACK comments
- [ ] Identifies complexity hotspots (cyclomatic)
- [ ] Documents workarounds
- [ ] Prioritizes tech debt items

---

## Plan 13-02 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-02-A | CodebaseAnalyzer Framework | 30 min | ⬜ |
| 13-02-B | Architecture Document Generator | 30 min | ⬜ |
| 13-02-C | Patterns Document Generator | 25 min | ⬜ |
| 13-02-D | Dependencies Document Generator | 20 min | ⬜ |
| 13-02-E | API Surface Document Generator | 25 min | ⬜ |
| 13-02-F | Data Flow & Test Strategy Generators | 30 min | ⬜ |
| 13-02-G | Known Issues Document Generator | 25 min | ⬜ |
| **TOTAL** | | **~185 min** | |

---

# Plan 13-03: Code Memory Extension

## Overview

Extend the existing `MemorySystem` (Layer 6) to store and query code chunks with embeddings, enabling semantic code search.

**Location:** Extend `src/persistence/memory/MemorySystem.ts`
**New Files:** `src/persistence/memory/CodeMemory.ts`
**Dependencies:** Existing MemorySystem, EmbeddingsService, RepoMapGenerator

## Interface Extensions

```typescript
// src/persistence/memory/CodeMemory.ts

export interface ICodeMemory {
  // Storage
  indexFile(file: string, content: string): Promise<void>;
  indexProject(projectPath: string): Promise<IndexStats>;
  updateFile(file: string, content: string): Promise<void>;
  removeFile(file: string): Promise<void>;
  
  // Queries
  searchCode(query: string, options?: CodeSearchOptions): Promise<CodeSearchResult[]>;
  findSimilarCode(codeSnippet: string, limit?: number): Promise<CodeSearchResult[]>;
  findUsages(symbolName: string): Promise<CodeUsage[]>;
  findDefinition(symbolName: string): Promise<CodeDefinition | null>;
  
  // Chunk management
  getChunksForFile(file: string): Promise<CodeChunk[]>;
  getChunkById(chunkId: string): Promise<CodeChunk | null>;
}

export interface CodeChunk {
  id: string;
  projectId: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
  symbols: string[];           // Functions/classes in this chunk
  chunkType: 'function' | 'class' | 'module' | 'block';
  metadata: CodeChunkMetadata;
  indexedAt: Date;
}

export interface CodeChunkMetadata {
  language: string;
  complexity?: number;         // Cyclomatic complexity
  dependencies?: string[];     // What this chunk imports
  exports?: string[];          // What this chunk exports
}

export interface CodeSearchResult {
  chunk: CodeChunk;
  score: number;               // 0.0 - 1.0 similarity
  highlights?: string[];       // Matching portions
}

export interface CodeSearchOptions {
  projectId?: string;
  filePattern?: string;        // Glob pattern
  language?: string;
  limit?: number;              // Default: 10
  threshold?: number;          // Default: 0.7
  includeContext?: boolean;    // Include surrounding code
}

export interface CodeUsage {
  file: string;
  line: number;
  column: number;
  context: string;             // The line of code
  usageType: 'call' | 'import' | 'reference' | 'assignment';
}

export interface CodeDefinition {
  file: string;
  line: number;
  column: number;
  signature: string;
  documentation?: string;
}

export interface IndexStats {
  filesIndexed: number;
  chunksCreated: number;
  tokensProcessed: number;
  duration: number;
}
```

## Database Schema Extension

```typescript
// Add to src/persistence/database/schema.ts

export const codeChunks = sqliteTable('code_chunks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  file: text('file').notNull(),
  startLine: integer('start_line').notNull(),
  endLine: integer('end_line').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  symbols: text('symbols', { mode: 'json' }).$type<string[]>(),
  chunkType: text('chunk_type', { enum: ['function', 'class', 'module', 'block'] }).notNull(),
  language: text('language').notNull(),
  complexity: integer('complexity'),
  indexedAt: integer('indexed_at', { mode: 'timestamp' }).notNull(),
});

// Index for fast file lookups
export const codeChunksFileIndex = index('code_chunks_file_idx').on(codeChunks.file);
```

## Tasks

### Task 13-03-A: Code Chunking Strategy

| Field | Value |
|-------|-------|
| **ID** | `task_13-03-A` |
| **Name** | Code Chunking Strategy |
| **Description** | Implement intelligent code chunking by function/class boundaries |
| **Files** | `src/persistence/memory/CodeChunker.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | Plan 13-01 (TreeSitterParser) |

**Acceptance Criteria:**
- [ ] Chunks code by function/class boundaries
- [ ] Falls back to line-based chunking for non-function code
- [ ] Maintains context (imports at file level)
- [ ] Handles multiple languages

---

### Task 13-03-B: Code Chunk Database Schema

| Field | Value |
|-------|-------|
| **ID** | `task_13-03-B` |
| **Name** | Code Chunk Database Schema |
| **Description** | Add code_chunks table and migrations |
| **Files** | `src/persistence/database/schema.ts`, migration file |
| **Estimated Time** | 20 min |
| **Dependencies** | None |

**Acceptance Criteria:**
- [ ] code_chunks table created
- [ ] Indexes for file and project lookups
- [ ] Migration runs without errors
- [ ] Rollback works

---

### Task 13-03-C: CodeMemory Core Implementation

| Field | Value |
|-------|-------|
| **ID** | `task_13-03-C` |
| **Name** | CodeMemory Core Implementation |
| **Description** | Implement ICodeMemory interface |
| **Files** | `src/persistence/memory/CodeMemory.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | `task_13-03-A`, `task_13-03-B` |

**Acceptance Criteria:**
- [ ] Implements full ICodeMemory interface
- [ ] Stores chunks with embeddings
- [ ] Supports incremental updates
- [ ] Integrates with existing EmbeddingsService

---

### Task 13-03-D: Semantic Code Search

| Field | Value |
|-------|-------|
| **ID** | `task_13-03-D` |
| **Name** | Semantic Code Search |
| **Description** | Implement vector similarity search for code |
| **Files** | `src/persistence/memory/CodeSearchEngine.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-03-C` |

**Acceptance Criteria:**
- [ ] Semantic search with threshold filtering
- [ ] Respects limit option
- [ ] Returns scored results
- [ ] Handles empty queries gracefully

---

### Task 13-03-E: MemorySystem Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-03-E` |
| **Name** | MemorySystem Integration |
| **Description** | Integrate CodeMemory into existing MemorySystem |
| **Files** | `src/persistence/memory/MemorySystem.ts` (extend) |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-03-C`, `task_13-03-D` |

**Acceptance Criteria:**
- [ ] MemorySystem exposes code query methods
- [ ] Unified interface for memory + code queries
- [ ] Backward compatible with existing MemorySystem usage
- [ ] getRelevantContext includes code results

---

## Plan 13-03 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-03-A | Code Chunking Strategy | 30 min | ⬜ |
| 13-03-B | Code Chunk Database Schema | 20 min | ⬜ |
| 13-03-C | CodeMemory Core Implementation | 30 min | ⬜ |
| 13-03-D | Semantic Code Search | 25 min | ⬜ |
| 13-03-E | MemorySystem Integration | 20 min | ⬜ |
| **TOTAL** | | **~125 min** | |

---

# Plan 13-04: Fresh Context Manager

## Overview

Implement explicit context cleanup between tasks to ensure each task gets a fresh 200K token context window without accumulated garbage.

**Location:** `src/orchestration/context/FreshContextManager.ts`
**Integration:** AgentPool, QALoopEngine
**Dependencies:** RepoMapGenerator, CodebaseDocs, MemorySystem

## Interface Definition

```typescript
// src/orchestration/context/FreshContextManager.ts

export interface IFreshContextManager {
  // Context building
  buildFreshContext(task: Task, options?: ContextOptions): Promise<TaskContext>;
  
  // Context cleanup
  clearAgentContext(agentId: string): Promise<void>;
  clearTaskContext(taskId: string): Promise<void>;
  
  // Validation
  validateContextSize(context: TaskContext): ContextValidation;
  estimateTokenCount(context: TaskContext): number;
}

export interface TaskContext {
  // Structural (same every task)
  repoMap: string;              // Compressed repo structure
  codebaseDocs: CodebaseDocsSummary;  // Key architectural info
  projectConfig: ProjectConfig;
  
  // Task-specific (fresh each time)
  taskSpec: TaskSpec;
  relevantFiles: FileContent[];
  relevantMemories: MemoryEntry[];
  
  // NO accumulated history
  conversationHistory: [];      // Always empty for fresh context
  
  // Metadata
  tokenCount: number;
  generatedAt: Date;
}

export interface TaskSpec {
  id: string;
  name: string;
  description: string;
  files: string[];              // Files this task should touch
  testCriteria: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  estimatedTime: number;
}

export interface FileContent {
  path: string;
  content: string;
  relevanceScore: number;
  includeReason: 'task_file' | 'dependency' | 'test' | 'type_definition';
}

export interface CodebaseDocsSummary {
  architectureSummary: string;  // First 500 tokens of ARCHITECTURE.md
  relevantPatterns: string[];   // Patterns relevant to this task
  relevantAPIs: string[];       // APIs this task might use
}

export interface ContextOptions {
  maxTokens?: number;           // Default: 150000 (leave room for response)
  includeRepoMap?: boolean;     // Default: true
  includeCodebaseDocs?: boolean;// Default: true
  maxRelevantFiles?: number;    // Default: 10
  maxMemories?: number;         // Default: 5
}

export interface ContextValidation {
  valid: boolean;
  tokenCount: number;
  maxTokens: number;
  warnings: string[];
  suggestions: string[];
}
```

## Tasks

### Task 13-04-A: FreshContextManager Core

| Field | Value |
|-------|-------|
| **ID** | `task_13-04-A` |
| **Name** | FreshContextManager Core |
| **Description** | Implement core context building and cleanup |
| **Files** | `src/orchestration/context/FreshContextManager.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | Plans 13-01, 13-02, 13-03 |

**Acceptance Criteria:**
- [ ] Builds complete TaskContext for any task
- [ ] Explicitly clears previous context
- [ ] Validates token budget
- [ ] Logs context composition

---

### Task 13-04-B: Context Token Budgeting

| Field | Value |
|-------|-------|
| **ID** | `task_13-04-B` |
| **Name** | Context Token Budgeting |
| **Description** | Smart allocation of tokens across context components |
| **Files** | `src/orchestration/context/TokenBudgeter.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-04-A` |

**Token Budget Allocation:**
```
Total Budget: 150,000 tokens

Fixed Allocations:
├── System Prompt:     ~2,000 tokens
├── Repo Map:          ~2,000 tokens (configurable)
├── Codebase Docs:     ~3,000 tokens
├── Task Spec:         ~1,000 tokens
└── Reserved Response: ~16,000 tokens

Dynamic Allocations (remaining ~126,000):
├── Task Files:        60% (~75,000 tokens)
├── Related Files:     25% (~31,500 tokens)
└── Memories:          15% (~19,000 tokens)
```

**Acceptance Criteria:**
- [ ] Allocates tokens by priority
- [ ] Truncates lower-priority content when over budget
- [ ] Reports allocation breakdown
- [ ] Warns when critical content truncated

---

### Task 13-04-C: AgentPool Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-04-C` |
| **Name** | AgentPool Integration |
| **Description** | Integrate FreshContextManager into agent spawning |
| **Files** | `src/orchestration/agents/AgentPool.ts` (modify) |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-04-A` |

**Acceptance Criteria:**
- [ ] Agents receive fresh context on task assignment
- [ ] Context cleared when task completes/fails
- [ ] No context bleed between tasks
- [ ] Metrics track context sizes

---

### Task 13-04-D: Fresh Context Tests

| Field | Value |
|-------|-------|
| **ID** | `task_13-04-D` |
| **Name** | Fresh Context Tests |
| **Description** | Comprehensive tests for context isolation |
| **Files** | `tests/orchestration/FreshContextManager.test.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-04-A`, `task_13-04-B`, `task_13-04-C` |

**Test Spec:**
```typescript
describe('FreshContextManager', () => {
  it('should build context with all components');
  it('should respect token budget');
  it('should clear context between tasks');
  it('should not include previous task history');
  it('should include relevant memories');
  it('should prioritize task-specific files');
});
```

---

## Plan 13-04 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-04-A | FreshContextManager Core | 30 min | ⬜ |
| 13-04-B | Context Token Budgeting | 25 min | ⬜ |
| 13-04-C | AgentPool Integration | 25 min | ⬜ |
| 13-04-D | Fresh Context Tests | 20 min | ⬜ |
| **TOTAL** | | **~100 min** | |

---

# Plan 13-05: Dynamic Context Provider

## Overview

Allow agents to request additional context mid-task when they discover they need more information.

**Location:** `src/orchestration/context/DynamicContextProvider.ts`
**Integration:** Execution Layer agents, QALoopEngine
**Dependencies:** RepoMapGenerator, CodeMemory, MemorySystem

## Interface Definition

```typescript
// src/orchestration/context/DynamicContextProvider.ts

export interface IDynamicContextProvider {
  // Registration
  registerAgent(agentId: string, taskId: string): void;
  unregisterAgent(agentId: string): void;
  
  // Context requests (called by agents)
  requestFile(agentId: string, filePath: string): Promise<FileContent | null>;
  requestSymbol(agentId: string, symbolName: string): Promise<SymbolContext | null>;
  requestSearch(agentId: string, query: string): Promise<SearchResults>;
  requestUsages(agentId: string, symbolName: string): Promise<UsageContext[]>;
  
  // Batch requests
  requestFiles(agentId: string, filePaths: string[]): Promise<FileContent[]>;
  requestContext(agentId: string, request: ContextRequest): Promise<ContextResponse>;
  
  // Budget tracking
  getRemainingBudget(agentId: string): number;
  getUsedTokens(agentId: string): number;
}

export interface ContextRequest {
  type: 'file' | 'symbol' | 'search' | 'usages' | 'definition';
  query: string;
  options?: {
    maxTokens?: number;
    includeContext?: boolean;  // Include surrounding code
    depth?: number;            // How many levels deep
  };
}

export interface ContextResponse {
  success: boolean;
  content: string;
  tokenCount: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SymbolContext {
  definition: CodeDefinition;
  signature: string;
  documentation?: string;
  usages: CodeUsage[];
  relatedSymbols: string[];
}

export interface UsageContext {
  file: string;
  line: number;
  content: string;
  surroundingCode: string;
}

export interface SearchResults {
  results: CodeSearchResult[];
  totalMatches: number;
  truncated: boolean;
}
```

## Agent Tool Definition

```typescript
// Tool exposed to agents for context requests

export const requestContextTool = {
  name: 'request_context',
  description: 'Request additional code context when you need to understand more of the codebase',
  parameters: {
    type: 'object',
    properties: {
      request_type: {
        type: 'string',
        enum: ['file', 'symbol', 'search', 'usages'],
        description: 'Type of context to request'
      },
      query: {
        type: 'string',
        description: 'File path, symbol name, or search query'
      },
      reason: {
        type: 'string',
        description: 'Why you need this context'
      }
    },
    required: ['request_type', 'query', 'reason']
  }
};
```

## Tasks

### Task 13-05-A: DynamicContextProvider Core

| Field | Value |
|-------|-------|
| **ID** | `task_13-05-A` |
| **Name** | DynamicContextProvider Core |
| **Description** | Implement core context request handling |
| **Files** | `src/orchestration/context/DynamicContextProvider.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | Plans 13-01, 13-03 |

**Acceptance Criteria:**
- [ ] Handles all request types
- [ ] Tracks token budget per agent
- [ ] Logs all requests for debugging
- [ ] Validates requests before fulfilling

---

### Task 13-05-B: File Request Handler

| Field | Value |
|-------|-------|
| **ID** | `task_13-05-B` |
| **Name** | File Request Handler |
| **Description** | Handle requests for specific file contents |
| **Files** | `src/orchestration/context/handlers/FileRequestHandler.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-05-A` |

**Acceptance Criteria:**
- [ ] Loads file from project path
- [ ] Respects token budget
- [ ] Returns null for non-existent files
- [ ] Tracks file in used context

---

### Task 13-05-C: Symbol Request Handler

| Field | Value |
|-------|-------|
| **ID** | `task_13-05-C` |
| **Name** | Symbol Request Handler |
| **Description** | Handle requests for symbol definitions and context |
| **Files** | `src/orchestration/context/handlers/SymbolRequestHandler.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-05-A`, Plan 13-01 |

**Acceptance Criteria:**
- [ ] Uses RepoMap to find symbol
- [ ] Returns definition with context
- [ ] Includes usages if requested
- [ ] Handles ambiguous names

---

### Task 13-05-D: Search Request Handler

| Field | Value |
|-------|-------|
| **ID** | `task_13-05-D` |
| **Name** | Search Request Handler |
| **Description** | Handle semantic code search requests |
| **Files** | `src/orchestration/context/handlers/SearchRequestHandler.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-05-A`, Plan 13-03 |

**Acceptance Criteria:**
- [ ] Uses CodeMemory for semantic search
- [ ] Returns ranked results
- [ ] Respects result limit
- [ ] Includes relevance scores

---

### Task 13-05-E: Agent Tool Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-05-E` |
| **Name** | Agent Tool Integration |
| **Description** | Expose context requests as agent tool |
| **Files** | `src/execution/tools/RequestContextTool.ts`, agent configs |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-05-A` through `task_13-05-D` |

**Acceptance Criteria:**
- [ ] Tool available to coder/tester agents
- [ ] Tool calls routed to DynamicContextProvider
- [ ] Results formatted for agent consumption
- [ ] Usage tracked in metrics

---

## Plan 13-05 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-05-A | DynamicContextProvider Core | 30 min | ⬜ |
| 13-05-B | File Request Handler | 20 min | ⬜ |
| 13-05-C | Symbol Request Handler | 25 min | ⬜ |
| 13-05-D | Search Request Handler | 25 min | ⬜ |
| 13-05-E | Agent Tool Integration | 25 min | ⬜ |
| **TOTAL** | | **~125 min** | |

---

# Plan 13-06: Ralph-Style Iterator

## Overview

Implement persistent iteration loops where agents can see their previous work through git diffs and continue iterating until tests pass.

**Location:** `src/execution/iteration/RalphStyleIterator.ts`
**Integration:** QALoopEngine, AgentRunner
**Dependencies:** GitService, WorktreeManager

## Interface Definition

```typescript
// src/execution/iteration/RalphStyleIterator.ts

export interface IRalphStyleIterator {
  // Execution
  execute(task: Task, options?: IterationOptions): Promise<IterationResult>;
  
  // Control
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;
  abort(taskId: string): Promise<void>;
  
  // Status
  getStatus(taskId: string): IterationStatus;
  getHistory(taskId: string): IterationHistory[];
}

export interface IterationOptions {
  maxIterations?: number;       // Default: 20
  commitEachIteration?: boolean;// Default: true
  includeGitDiff?: boolean;     // Default: true
  includePreviousErrors?: boolean; // Default: true
  escalateAfter?: number;       // Default: maxIterations
}

export interface IterationResult {
  success: boolean;
  iterations: number;
  finalState: 'passed' | 'failed' | 'escalated' | 'aborted';
  history: IterationHistory[];
  totalDuration: number;
  totalTokens: number;
}

export interface IterationHistory {
  iteration: number;
  action: string;
  changes: GitDiff[];
  testResult?: TestResult;
  reviewResult?: ReviewResult;
  errors?: string[];
  duration: number;
  tokens: number;
  timestamp: Date;
}

export interface IterationStatus {
  taskId: string;
  currentIteration: number;
  maxIterations: number;
  state: 'running' | 'paused' | 'completed' | 'failed';
  lastActivity: Date;
  currentPhase: 'coding' | 'testing' | 'reviewing' | 'fixing';
}

export interface IterationContext {
  task: Task;
  iteration: number;
  
  // Git context (what the agent did before)
  previousDiff: GitDiff[];
  cumulativeDiff: GitDiff[];
  
  // Error context (what went wrong)
  previousErrors: ErrorContext[];
  testResults: TestResult[];
  reviewFeedback: string[];
  
  // Fresh task context (from FreshContextManager)
  taskContext: TaskContext;
}

export interface ErrorContext {
  type: 'build' | 'lint' | 'test' | 'review';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}
```

## Iteration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RALPH-STYLE ITERATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Start Task                                                             │
│      │                                                                  │
│      ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Iteration N                                                       │  │
│  │                                                                   │  │
│  │  1. Build Fresh Context                                          │  │
│  │     ├── Task spec                                                │  │
│  │     ├── Relevant files                                           │  │
│  │     ├── Repo map                                                 │  │
│  │     └── IF N > 1: Previous diff + errors                         │  │
│  │                                                                   │  │
│  │  2. Agent Executes                                               │  │
│  │     └── Writes/modifies code                                     │  │
│  │                                                                   │  │
│  │  3. Commit Iteration Work                                        │  │
│  │     └── git commit -m "iteration-N: {summary}"                   │  │
│  │                                                                   │  │
│  │  4. Run QA                                                       │  │
│  │     ├── Build                                                    │  │
│  │     ├── Lint                                                     │  │
│  │     ├── Test                                                     │  │
│  │     └── Review (if tests pass)                                   │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                  │
│      ▼                                                                  │
│  ┌───────────────┐                                                      │
│  │ All QA Pass?  │───YES──► SUCCESS (merge to main)                    │
│  └───────┬───────┘                                                      │
│          │ NO                                                           │
│          ▼                                                              │
│  ┌───────────────┐                                                      │
│  │ N < maxIter?  │───NO───► ESCALATE (create checkpoint, notify human) │
│  └───────┬───────┘                                                      │
│          │ YES                                                          │
│          ▼                                                              │
│      N = N + 1                                                          │
│          │                                                              │
│          └──────────────► Back to Iteration N                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tasks

### Task 13-06-A: RalphStyleIterator Core

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-A` |
| **Name** | RalphStyleIterator Core |
| **Description** | Implement core iteration loop with state machine |
| **Files** | `src/execution/iteration/RalphStyleIterator.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | Plan 13-04 |

**Acceptance Criteria:**
- [ ] Implements full IRalphStyleIterator interface
- [ ] State machine for iteration states
- [ ] Respects maxIterations
- [ ] Logs all iteration history

---

### Task 13-06-B: Git Diff Context Builder

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-B` |
| **Name** | Git Diff Context Builder |
| **Description** | Build context from previous iteration's git diff |
| **Files** | `src/execution/iteration/GitDiffContextBuilder.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-06-A` |

**Acceptance Criteria:**
- [ ] Extracts diff from previous commit
- [ ] Formats diff for agent consumption
- [ ] Tracks cumulative changes
- [ ] Handles merge conflicts

---

### Task 13-06-C: Error Context Aggregator

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-C` |
| **Name** | Error Context Aggregator |
| **Description** | Collect and format errors from previous iterations |
| **Files** | `src/execution/iteration/ErrorContextAggregator.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-06-A` |

**Acceptance Criteria:**
- [ ] Aggregates build/lint/test errors
- [ ] Includes line numbers and suggestions
- [ ] Deduplicates repeated errors
- [ ] Prioritizes by severity

---

### Task 13-06-D: Iteration Commit Handler

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-D` |
| **Name** | Iteration Commit Handler |
| **Description** | Handle git commits for each iteration |
| **Files** | `src/execution/iteration/IterationCommitHandler.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-06-A`, `task_13-06-B` |

**Acceptance Criteria:**
- [ ] Creates commit after each iteration
- [ ] Generates meaningful commit messages
- [ ] Tags iteration number
- [ ] Supports rollback to any iteration

---

### Task 13-06-E: QALoopEngine Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-E` |
| **Name** | QALoopEngine Integration |
| **Description** | Integrate Ralph-style iteration into existing QA loop |
| **Files** | `src/quality/qa-loop/QALoopEngine.ts` (modify) |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-06-A` through `task_13-06-D` |

**Acceptance Criteria:**
- [ ] QALoopEngine can use Ralph mode
- [ ] Backward compatible with standard mode
- [ ] Configurable via task options
- [ ] Metrics track iteration mode

---

### Task 13-06-F: Escalation Handler

| Field | Value |
|-------|-------|
| **ID** | `task_13-06-F` |
| **Name** | Escalation Handler |
| **Description** | Handle escalation when max iterations reached |
| **Files** | `src/execution/iteration/EscalationHandler.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-06-A` |

**Acceptance Criteria:**
- [ ] Creates checkpoint before escalating
- [ ] Generates detailed escalation report
- [ ] Notifies via configured channel
- [ ] Pauses execution until human response

---

## Plan 13-06 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-06-A | RalphStyleIterator Core | 30 min | ⬜ |
| 13-06-B | Git Diff Context Builder | 25 min | ⬜ |
| 13-06-C | Error Context Aggregator | 25 min | ⬜ |
| 13-06-D | Iteration Commit Handler | 20 min | ⬜ |
| 13-06-E | QALoopEngine Integration | 25 min | ⬜ |
| 13-06-F | Escalation Handler | 20 min | ⬜ |
| **TOTAL** | | **~145 min** | |

---

# Plan 13-07: Dynamic Replanner

## Overview

Implement complexity detection and dynamic replanning that triggers when a task is discovered to be more complex than initially estimated.

**Location:** `src/orchestration/planning/DynamicReplanner.ts`
**Integration:** NexusCoordinator, TaskDecomposer, QALoopEngine
**Dependencies:** TaskDecomposer, SelfAssessmentEngine

## Interface Definition

```typescript
// src/orchestration/planning/DynamicReplanner.ts

export interface IDynamicReplanner {
  // Monitoring
  startMonitoring(taskId: string): void;
  stopMonitoring(taskId: string): void;
  
  // Triggers
  checkReplanningNeeded(taskId: string, context: ExecutionContext): ReplanDecision;
  
  // Replanning
  replan(taskId: string, reason: ReplanReason): Promise<ReplanResult>;
  
  // Configuration
  setTriggerThresholds(thresholds: TriggerThresholds): void;
}

export interface ReplanDecision {
  shouldReplan: boolean;
  reason?: ReplanReason;
  confidence: number;
  suggestedAction: 'continue' | 'split' | 'escalate' | 'abort';
}

export interface ReplanReason {
  type: ReplanTrigger;
  details: string;
  metrics: ReplanMetrics;
}

export type ReplanTrigger = 
  | 'time_exceeded'           // Task taking > estimated time
  | 'iterations_high'         // Many QA loop iterations
  | 'scope_creep'            // Agent touching unexpected files
  | 'complexity_discovered'   // Agent reports complexity
  | 'dependency_discovered'   // New dependencies found
  | 'blocking_issue'          // Fundamental blocker detected
  | 'agent_request';          // Agent explicitly requests replan

export interface ReplanMetrics {
  timeElapsed: number;
  estimatedTime: number;
  iterations: number;
  maxIterations: number;
  filesModified: number;
  filesExpected: number;
  errorsEncountered: number;
}

export interface ReplanResult {
  success: boolean;
  action: 'split' | 'rescoped' | 'escalated' | 'continued';
  originalTask: Task;
  newTasks?: Task[];
  message: string;
}

export interface TriggerThresholds {
  timeExceededRatio: number;    // Default: 1.5 (150% of estimate)
  iterationsRatio: number;       // Default: 0.4 (40% of max)
  scopeCreepFiles: number;       // Default: 3 extra files
  consecutiveFailures: number;   // Default: 5
}

export interface ExecutionContext {
  taskId: string;
  timeElapsed: number;
  iteration: number;
  filesModified: string[];
  errors: string[];
  agentFeedback?: string;
}
```

## Replanning Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DYNAMIC REPLANNING FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Task Execution                                                         │
│      │                                                                  │
│      ├──► DynamicReplanner.checkReplanningNeeded()                     │
│      │         │                                                        │
│      │         ▼                                                        │
│      │    ┌─────────────────────────────────────────┐                  │
│      │    │ Evaluate Triggers:                      │                  │
│      │    │ • Time > 1.5x estimate?                 │                  │
│      │    │ • Iterations > 40% of max?              │                  │
│      │    │ • Files modified > expected + 3?        │                  │
│      │    │ • Consecutive failures > 5?             │                  │
│      │    │ • Agent requested replan?               │                  │
│      │    └────────────────┬────────────────────────┘                  │
│      │                     │                                            │
│      │         ┌───────────┴───────────┐                               │
│      │         │                       │                               │
│      │    NO TRIGGERS             TRIGGER FIRED                        │
│      │         │                       │                               │
│      │         ▼                       ▼                               │
│      │    Continue                Analyze Situation                    │
│      │    Execution                    │                               │
│      │                                 ▼                               │
│      │                    ┌─────────────────────────┐                  │
│      │                    │ Determine Action:        │                  │
│      │                    │ • SPLIT: Task too large  │                  │
│      │                    │ • RESCOPE: Wrong approach│                  │
│      │                    │ • ESCALATE: Human needed │                  │
│      │                    │ • CONTINUE: False alarm  │                  │
│      │                    └────────────┬────────────┘                  │
│      │                                 │                               │
│      │                    ┌────────────┴────────────┐                  │
│      │                    │                         │                  │
│      │               SPLIT/RESCOPE              ESCALATE               │
│      │                    │                         │                  │
│      │                    ▼                         ▼                  │
│      │         Call TaskDecomposer          Pause & Notify             │
│      │         Create new sub-tasks         Human Reviews              │
│      │         Queue for execution                                     │
│      │                                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tasks

### Task 13-07-A: DynamicReplanner Core

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-A` |
| **Name** | DynamicReplanner Core |
| **Description** | Implement core replanning logic and state machine |
| **Files** | `src/orchestration/planning/DynamicReplanner.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | None |

**Acceptance Criteria:**
- [ ] Implements IDynamicReplanner interface
- [ ] Monitors active tasks
- [ ] Evaluates all trigger types
- [ ] Returns appropriate decisions

---

### Task 13-07-B: Trigger Evaluators

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-B` |
| **Name** | Trigger Evaluators |
| **Description** | Implement individual trigger evaluation logic |
| **Files** | `src/orchestration/planning/triggers/*.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-07-A` |

**Acceptance Criteria:**
- [ ] TimeExceededTrigger evaluates time ratio
- [ ] IterationsTrigger evaluates QA loop count
- [ ] ScopeCreepTrigger detects unexpected file modifications
- [ ] All triggers are configurable

---

### Task 13-07-C: Task Splitter Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-C` |
| **Name** | Task Splitter Integration |
| **Description** | Integrate with TaskDecomposer for splitting tasks |
| **Files** | `src/orchestration/planning/TaskSplitter.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-07-A` |

**Acceptance Criteria:**
- [ ] Can split task into smaller sub-tasks
- [ ] Preserves dependencies
- [ ] Updates task queue
- [ ] Handles partial completion

---

### Task 13-07-D: Agent Replan Request Tool

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-D` |
| **Name** | Agent Replan Request Tool |
| **Description** | Tool for agents to request replanning |
| **Files** | `src/execution/tools/RequestReplanTool.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-07-A` |

**Tool Definition:**
```typescript
export const requestReplanTool = {
  name: 'request_replan',
  description: 'Request task replanning when you discover the task is more complex than expected',
  parameters: {
    reason: { type: 'string', description: 'Why replanning is needed' },
    suggestion: { type: 'string', description: 'How the task could be split' },
    blockers: { type: 'array', items: { type: 'string' } }
  }
};
```

---

### Task 13-07-E: NexusCoordinator Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-E` |
| **Name** | NexusCoordinator Integration |
| **Description** | Integrate replanner into main orchestration loop |
| **Files** | `src/orchestration/coordinator/NexusCoordinator.ts` (modify) |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-07-A` through `task_13-07-D` |

**Acceptance Criteria:**
- [ ] Coordinator calls replanner during execution
- [ ] Handles replan decisions appropriately
- [ ] Updates task queue with new tasks
- [ ] Emits replanning events

---

### Task 13-07-F: Replanning Tests

| Field | Value |
|-------|-------|
| **ID** | `task_13-07-F` |
| **Name** | Replanning Tests |
| **Description** | Comprehensive tests for replanning logic |
| **Files** | `tests/orchestration/DynamicReplanner.test.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-07-A` through `task_13-07-E` |

**Test Spec:**
```typescript
describe('DynamicReplanner', () => {
  it('should detect time exceeded trigger');
  it('should detect iteration threshold trigger');
  it('should detect scope creep');
  it('should handle agent replan request');
  it('should split task correctly');
  it('should escalate when appropriate');
});
```

---

## Plan 13-07 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-07-A | DynamicReplanner Core | 30 min | ⬜ |
| 13-07-B | Trigger Evaluators | 25 min | ⬜ |
| 13-07-C | Task Splitter Integration | 25 min | ⬜ |
| 13-07-D | Agent Replan Request Tool | 20 min | ⬜ |
| 13-07-E | NexusCoordinator Integration | 25 min | ⬜ |
| 13-07-F | Replanning Tests | 20 min | ⬜ |
| **TOTAL** | | **~145 min** | |

---

# Plan 13-08: Self-Assessment Engine

## Overview

Implement agent self-assessment capabilities for evaluating progress, identifying blockers, and recommending approaches.

**Location:** `src/orchestration/assessment/SelfAssessmentEngine.ts`
**Integration:** QALoopEngine, DynamicReplanner, NexusCoordinator
**Dependencies:** MemorySystem, RepoMapGenerator

## Interface Definition

```typescript
// src/orchestration/assessment/SelfAssessmentEngine.ts

export interface ISelfAssessmentEngine {
  // Assessment
  assessProgress(taskId: string): Promise<ProgressAssessment>;
  assessBlockers(taskId: string): Promise<BlockerAssessment>;
  assessApproach(taskId: string): Promise<ApproachAssessment>;
  
  // Recommendations
  recommendNextStep(taskId: string): Promise<Recommendation>;
  recommendAlternativeApproach(taskId: string): Promise<AlternativeApproach[]>;
  
  // Learning
  recordOutcome(taskId: string, outcome: TaskOutcome): Promise<void>;
  getHistoricalInsights(taskType: string): Promise<HistoricalInsight[]>;
}

export interface ProgressAssessment {
  taskId: string;
  completionEstimate: number;     // 0.0 - 1.0
  confidence: number;             // 0.0 - 1.0
  remainingWork: string[];
  blockers: string[];
  risks: Risk[];
}

export interface BlockerAssessment {
  blockers: Blocker[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;
  suggestedActions: string[];
}

export interface Blocker {
  type: 'technical' | 'dependency' | 'unclear_requirement' | 'external' | 'knowledge_gap';
  description: string;
  affectedFiles: string[];
  possibleSolutions: string[];
  needsHuman: boolean;
}

export interface ApproachAssessment {
  currentApproach: string;
  effectiveness: 'working' | 'struggling' | 'stuck' | 'wrong_direction';
  confidence: number;
  alternatives: AlternativeApproach[];
  recommendation: string;
}

export interface AlternativeApproach {
  description: string;
  pros: string[];
  cons: string[];
  estimatedEffort: number;
  confidence: number;
}

export interface Recommendation {
  action: 'continue' | 'try_alternative' | 'request_help' | 'split_task' | 'abort';
  reason: string;
  details: string;
  confidence: number;
}

export interface Risk {
  type: 'technical' | 'scope' | 'time' | 'quality';
  description: string;
  probability: number;
  impact: number;
  mitigation?: string;
}

export interface TaskOutcome {
  success: boolean;
  approach: string;
  iterations: number;
  blockers: string[];
  lessonsLearned: string[];
}

export interface HistoricalInsight {
  pattern: string;
  successRate: number;
  averageIterations: number;
  commonBlockers: string[];
  recommendedApproach: string;
}
```

## Tasks

### Task 13-08-A: SelfAssessmentEngine Core

| Field | Value |
|-------|-------|
| **ID** | `task_13-08-A` |
| **Name** | SelfAssessmentEngine Core |
| **Description** | Implement core assessment logic |
| **Files** | `src/orchestration/assessment/SelfAssessmentEngine.ts` |
| **Estimated Time** | 30 min |
| **Dependencies** | None |

**Acceptance Criteria:**
- [ ] Implements ISelfAssessmentEngine interface
- [ ] Uses LLM for assessment generation
- [ ] Caches assessments appropriately
- [ ] Integrates with MemorySystem

---

### Task 13-08-B: Progress Assessor

| Field | Value |
|-------|-------|
| **ID** | `task_13-08-B` |
| **Name** | Progress Assessor |
| **Description** | Implement progress estimation logic |
| **Files** | `src/orchestration/assessment/ProgressAssessor.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-08-A` |

**Acceptance Criteria:**
- [ ] Estimates completion percentage
- [ ] Identifies remaining work items
- [ ] Calculates confidence based on history
- [ ] Considers iteration count and errors

---

### Task 13-08-C: Blocker Detector

| Field | Value |
|-------|-------|
| **ID** | `task_13-08-C` |
| **Name** | Blocker Detector |
| **Description** | Detect and categorize blockers |
| **Files** | `src/orchestration/assessment/BlockerDetector.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-08-A` |

**Acceptance Criteria:**
- [ ] Detects all blocker types
- [ ] Suggests possible solutions
- [ ] Identifies human-needed blockers
- [ ] Ranks by severity

---

### Task 13-08-D: Approach Evaluator

| Field | Value |
|-------|-------|
| **ID** | `task_13-08-D` |
| **Name** | Approach Evaluator |
| **Description** | Evaluate current approach and suggest alternatives |
| **Files** | `src/orchestration/assessment/ApproachEvaluator.ts` |
| **Estimated Time** | 25 min |
| **Dependencies** | `task_13-08-A` |

**Acceptance Criteria:**
- [ ] Analyzes current approach effectiveness
- [ ] Generates alternative approaches
- [ ] Compares pros/cons
- [ ] Provides confident recommendations

---

### Task 13-08-E: Historical Learning Integration

| Field | Value |
|-------|-------|
| **ID** | `task_13-08-E` |
| **Name** | Historical Learning Integration |
| **Description** | Learn from past task outcomes |
| **Files** | `src/orchestration/assessment/HistoricalLearner.ts` |
| **Estimated Time** | 20 min |
| **Dependencies** | `task_13-08-A` |

**Acceptance Criteria:**
- [ ] Records task outcomes
- [ ] Retrieves similar historical tasks
- [ ] Calculates success rates by pattern
- [ ] Provides data-driven insights

---

## Plan 13-08 Summary

| Task | Name | Time | Status |
|------|------|------|--------|
| 13-08-A | SelfAssessmentEngine Core | 30 min | ⬜ |
| 13-08-B | Progress Assessor | 25 min | ⬜ |
| 13-08-C | Blocker Detector | 25 min | ⬜ |
| 13-08-D | Approach Evaluator | 25 min | ⬜ |
| 13-08-E | Historical Learning Integration | 20 min | ⬜ |
| **TOTAL** | | **~125 min** | |

---

# Phase 13 Summary

## Total Metrics

| Metric | Value |
|--------|-------|
| **Total Plans** | 8 |
| **Total Tasks** | 44 |
| **Total Estimated Time** | 1,115 min (~18.5 hours) |
| **With Buffer (1.5x)** | ~28 hours |
| **Calendar Duration** | 4-6 weeks |

## Dependency Graph

```
Plan 13-01: RepoMapGenerator
     │
     ├──────────────────────┬────────────────────────────┐
     ▼                      ▼                            │
Plan 13-02: CodebaseDocs   Plan 13-03: CodeMemory       │
     │                      │                            │
     └──────────┬───────────┘                            │
                │                                         │
                ▼                                         │
         Plan 13-04: FreshContextManager                  │
                │                                         │
                ├─────────────────────────────────────────┤
                │                                         │
                ▼                                         ▼
         Plan 13-05: DynamicContextProvider     Plan 13-06: RalphStyleIterator
                │                                         │
                └─────────────────┬───────────────────────┘
                                  │
                                  ▼
                        Plan 13-07: DynamicReplanner
                                  │
                                  ▼
                        Plan 13-08: SelfAssessmentEngine
```

## Post-Phase 13 Capabilities

### Level 4.0 Automation Achieved ✅

| Capability | Before | After |
|------------|--------|-------|
| Codebase Understanding | ❌ Blind | ✅ Repo Map + Docs |
| Context Management | ⚠️ Basic | ✅ Fresh + Dynamic |
| Iteration Strategy | ⚠️ Fixed 50 | ✅ Ralph-style persistent |
| Replanning | ❌ None | ✅ Dynamic triggers |
| Self-Assessment | ❌ None | ✅ Progress + Blockers |
| Code Search | ⚠️ Text only | ✅ Semantic embeddings |

### Competitive Parity Achieved ✅

| Competitor | Their Advantage | Nexus After Phase 13 |
|------------|-----------------|---------------------|
| **Aider** | Repo map | ✅ RepoMapGenerator |
| **GSD** | Fresh context, codebase docs | ✅ FreshContextManager, CodebaseAnalyzer |
| **Context7** | Live documentation | ⚠️ Future MCP integration |
| **Ralph Wiggum** | Persistent iteration | ✅ RalphStyleIterator |
| **Code-Index-MCP** | Semantic code search | ✅ CodeMemory extension |

### Unique Nexus Advantages

1. **Interview-first approach** - No competitor has conversational requirement gathering
2. **Human checkpoints** - Configurable human oversight at critical points
3. **Dynamic replanning** - Unique ability to re-decompose tasks mid-execution
4. **Self-assessment** - Agents evaluate their own progress and blockers
5. **Integrated QA loop** - Build → Lint → Test → Review with 50 iteration limit
6. **Desktop privacy** - Code never leaves machine (except LLM calls)

---

## Implementation Notes

### Testing Strategy

Each plan includes comprehensive tests:
- **Unit tests** for individual components
- **Integration tests** for layer interactions
- **E2E tests** for full workflows

Estimated test count: ~80-100 tests for Phase 13

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| tree-sitter complexity | Use established web-tree-sitter bindings |
| Token budget overruns | Strict budgeting with truncation |
| Performance on large repos | Incremental indexing, caching |
| Breaking existing tests | Backward-compatible interfaces |

### Success Metrics

| Metric | Target |
|--------|--------|
| Context accuracy | >90% relevant files identified |
| Repo map generation | <10s for medium projects |
| Code search latency | <500ms P95 |
| Fresh context overhead | <2% performance impact |
| Replan trigger accuracy | >80% appropriate triggers |

---

## Next Steps

1. **Review this plan** with any adjustments needed
2. **Begin Plan 13-01** (Repository Map Generator)
3. **Follow Nexus GSD Workflow**: plan → discuss → research → execute → Gemini review → fix → confirm → next plan
4. **Track progress** in project dashboard
5. **Create checkpoint** after each plan completion

---

**This plan makes Nexus the best AI coding tool by combining:**
- The repo map brilliance of **Aider**
- The fresh context approach of **GSD**
- The persistent iteration of **Ralph Wiggum**
- The semantic search of **Code-Index-MCP**
- With Nexus's unique **interview-first, human-checkpoint, QA-loop** architecture

**Let's build it!** 🚀
