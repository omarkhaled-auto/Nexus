# Plan 13-01: Repository Map Generator

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plan:** 1 of 8 (Repository Map Generator)
- **Purpose:** Build tree-sitter based repository mapping to enable agents to understand codebase structure, find symbols, and identify dependencies
- **Input:** 
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` (comprehensive plan with interfaces)
  - `07_NEXUS_MASTER_BOOK.md` (architecture reference, ~8,200 lines)
  - `05_ARCHITECTURE_BLUEPRINT.md` (layer definitions, ~18,700 lines)
  - Existing Nexus codebase in `src/`
- **Output:** `src/infrastructure/analysis/` module with 9 files
- **Philosophy:** Agents can't fix what they can't find. The repo map gives every agent a complete picture of the codebase before they start working.

## Pre-Requisites
- [ ] Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Plan 13-01 section for interfaces and specs
- [ ] Review `src/infrastructure/` directory structure for existing patterns
- [ ] Review `src/types/` for existing type conventions
- [ ] Check `package.json` for existing dependencies
- [ ] Understand the 7-layer architecture from `07_NEXUS_MASTER_BOOK.md` Section 2.3

## Technology Decision

**Use `web-tree-sitter` (WASM-based) instead of native tree-sitter:**
- No native modules = no Electron rebuild issues (same problem as better-sqlite3)
- Works in both main and renderer processes
- Multi-language support for future expansion

**Required npm packages:**
```bash
npm install web-tree-sitter@0.24.7 fast-glob
npm install -D @anthropic-ai/claude-code tree-sitter-typescript tree-sitter-javascript
```

Note: Use version 0.24.7 of web-tree-sitter for TypeScript compatibility (0.25+ has type export issues).

## Task Structure

This plan is divided into **6 sequential tasks**. Complete each task fully before moving to the next.

```
Task 13-01-A: Types & Parser Setup ───────► [TASK 13-01-A COMPLETE]
                │
                ▼
Task 13-01-B: Symbol Extractor ───────────► [TASK 13-01-B COMPLETE]
                │
                ▼
Task 13-01-C: Dependency Graph Builder ───► [TASK 13-01-C COMPLETE]
                │
                ▼
Task 13-01-D: Reference Counter ──────────► [TASK 13-01-D COMPLETE]
                │
                ▼
Task 13-01-E: RepoMapGenerator Core ──────► [TASK 13-01-E COMPLETE]
                │
                ▼
Task 13-01-F: Formatter & Index ──────────► [PLAN 13-01 COMPLETE]
```

---

# Task 13-01-A: Types & TreeSitter Parser Setup

## Objective
Install dependencies, create comprehensive type definitions, and implement the WASM-based TreeSitter parser wrapper.

## Requirements

### Part A: Install Dependencies
- [x] Run: `npm install web-tree-sitter@0.24.7 fast-glob`
- [x] Run: `npm install -D tree-sitter-typescript tree-sitter-javascript`
- [x] Verify packages added to `package.json`
- [x] Note: Do NOT install native `tree-sitter` package (causes Electron issues)

### Part B: Create Directory Structure
- [x] Create directory: `src/infrastructure/analysis/`
- [x] This module lives in Layer 7 (Infrastructure) per architecture

### Part C: Create Types File
Create `src/infrastructure/analysis/types.ts` with these type definitions:

- [x] **RepoMap Interface** - Main output containing all extracted data
  ```typescript
  interface RepoMap {
    projectPath: string;
    generatedAt: Date;
    files: FileEntry[];
    symbols: SymbolEntry[];
    dependencies: DependencyEdge[];
    stats: RepoMapStats;
  }
  ```

- [x] **FileEntry Interface** - Metadata about each file
  ```typescript
  interface FileEntry {
    path: string;
    relativePath: string;
    language: SupportedLanguage;
    size: number;
    lastModified: Date;
    symbolCount: number;
    lineCount: number;
  }
  ```

- [x] **SymbolEntry Interface** - Extracted symbol information
  ```typescript
  interface SymbolEntry {
    id: string;
    name: string;
    kind: SymbolKind;
    file: string;
    line: number;
    endLine: number;
    column: number;
    signature: string;
    documentation?: string;
    references: number;
    exported: boolean;
    parentId?: string;
    modifiers: SymbolModifier[];
  }
  ```

- [x] **SymbolKind Type** - All symbol types we extract
  ```typescript
  type SymbolKind = 'class' | 'interface' | 'function' | 'method' | 'property' | 
                    'variable' | 'constant' | 'type' | 'enum' | 'enum_member' | 
                    'namespace' | 'module';
  ```

- [x] **SymbolModifier Type**
  ```typescript
  type SymbolModifier = 'async' | 'static' | 'private' | 'protected' | 'public' | 
                        'readonly' | 'abstract' | 'override' | 'export' | 'default';
  ```

- [x] **DependencyEdge Interface** - Import/export relationships
  ```typescript
  interface DependencyEdge {
    from: string;
    to: string;
    type: DependencyType;
    symbols: string[];
    statement?: string;
    line?: number;
  }
  ```

- [x] **DependencyType Type**
  ```typescript
  type DependencyType = 'import' | 'require' | 'dynamic' | 'export_from' | 
                        'type_import' | 'side_effect';
  ```

- [x] **ImportStatement Interface**
  ```typescript
  interface ImportStatement {
    type: 'named' | 'default' | 'namespace' | 'side_effect' | 'dynamic' | 'require';
    source: string;
    symbols: Array<{ local: string; imported?: string }>;
    line: number;
    typeOnly: boolean;
  }
  ```

- [x] **ExportStatement Interface**
  ```typescript
  interface ExportStatement {
    type: 'named' | 'default' | 'all' | 're_export';
    symbols: Array<{ local: string; exported?: string }>;
    source?: string;
    line: number;
  }
  ```

- [x] **ParseResult Interface**
  ```typescript
  interface ParseResult {
    success: boolean;
    file: string;
    symbols: SymbolEntry[];
    imports: ImportStatement[];
    exports: ExportStatement[];
    errors: ParseError[];
    parseTime: number;
  }
  ```

- [x] **ParseError Interface**
  ```typescript
  interface ParseError {
    message: string;
    line: number;
    column: number;
    nodeType?: string;
  }
  ```

- [x] **RepoMapOptions Interface** - Configuration for generation
  ```typescript
  interface RepoMapOptions {
    includePatterns?: string[];
    excludePatterns?: string[];
    maxFiles?: number;
    maxTokens?: number;
    languages?: SupportedLanguage[];
    extractDocs?: boolean;
    countReferences?: boolean;
    basePath?: string;
  }
  ```

- [x] **DEFAULT_REPO_MAP_OPTIONS Constant**
  ```typescript
  const DEFAULT_REPO_MAP_OPTIONS: Required<RepoMapOptions> = {
    includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**', 
                      'coverage/**', '**/*.test.*', '**/*.spec.*', '**/*.d.ts'],
    maxFiles: 500,
    maxTokens: 4000,
    languages: ['typescript', 'javascript'],
    extractDocs: true,
    countReferences: true,
    basePath: '',
  };
  ```

- [x] **FormatOptions Interface**
  ```typescript
  interface FormatOptions {
    maxTokens?: number;
    includeSignatures?: boolean;
    includeDocstrings?: boolean;
    rankByReferences?: boolean;
    groupByFile?: boolean;
    includeDependencies?: boolean;
    style?: 'compact' | 'detailed' | 'tree';
  }
  ```

- [x] **RepoMapStats Interface**
  ```typescript
  interface RepoMapStats {
    totalFiles: number;
    totalSymbols: number;
    totalDependencies: number;
    languageBreakdown: Record<SupportedLanguage, number>;
    symbolBreakdown: Record<SymbolKind, number>;
    largestFiles: string[];
    mostReferencedSymbols: Array<{ name: string; file: string; references: number }>;
    mostConnectedFiles: Array<{ file: string; connections: number }>;
    generationTime: number;
  }
  ```

- [x] **SupportedLanguage Type**
  ```typescript
  type SupportedLanguage = 'typescript' | 'javascript';
  ```

- [x] **Interface Definitions** for main classes (IRepoMapGenerator, ITreeSitterParser, etc.)

- [x] Export all types

### Part D: Create TreeSitterParser
Create `src/infrastructure/analysis/TreeSitterParser.ts`:

- [x] **TreeSitterParser Class** implementing ITreeSitterParser
  - [x] Constructor accepts optional `wasmBasePath` for WASM file location
  - [x] Private fields: `Parser`, `languages` Map, `initialized` boolean
  
- [x] **initialize() Method**
  - [x] Dynamic import of `web-tree-sitter`
  - [x] Call `Parser.init()` 
  - [x] Load TypeScript WASM from `node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm`
  - [x] Load JavaScript WASM from `node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm`
  - [x] Store languages in Map
  
- [x] **isReady() Method** - Returns initialization state

- [x] **getSupportedLanguages() Method** - Returns `['typescript', 'javascript']`

- [x] **detectLanguage(filePath) Method**
  - [x] `.ts`, `.tsx`, `.mts` → `'typescript'`
  - [x] `.js`, `.jsx`, `.mjs` → `'javascript'`
  - [x] Other → `null`

- [x] **parseFile(filePath, content) Method**
  - [x] Detect language from extension
  - [x] Get parser for language
  - [x] Parse content to AST
  - [x] Extract symbols using `extractSymbols()` helper
  - [x] Extract imports using `extractImports()` helper
  - [x] Extract exports using `extractExports()` helper
  - [x] Find syntax errors using `findErrors()` helper
  - [x] Return ParseResult

- [x] **parseFiles(files) Method** - Parse multiple files in sequence

- [x] **extractSymbols() Private Helper**
  - [x] Walk AST using tree-sitter cursor
  - [x] Identify symbol node types:
    - `function_declaration`, `arrow_function` → function
    - `method_definition` → method
    - `class_declaration` → class
    - `interface_declaration` → interface
    - `type_alias_declaration` → type
    - `enum_declaration` → enum
    - `variable_declarator` → variable
    - `property_signature`, `public_field_definition` → property
  - [x] Extract name, signature, modifiers, documentation
  - [x] Track parent-child relationships (methods inside classes)

- [x] **extractImports() Private Helper**
  - [x] Find `import_statement` nodes
  - [x] Parse named imports: `import { a, b } from './mod'`
  - [x] Parse default imports: `import X from './mod'`
  - [x] Parse namespace imports: `import * as X from './mod'`
  - [x] Parse side-effect imports: `import './styles.css'`
  - [x] Parse type imports: `import type { T } from './types'`
  - [x] Track source module and imported symbols

- [x] **extractExports() Private Helper**
  - [x] Find `export_statement` nodes
  - [x] Parse named exports: `export { a, b }`
  - [x] Parse default exports: `export default X`
  - [x] Parse re-exports: `export { a } from './mod'`
  - [x] Parse export all: `export * from './mod'`

- [x] **buildSignature() Private Helper**
  - [x] For functions: `name(param: type): returnType`
  - [x] For classes: `class Name extends Base implements Interface`
  - [x] For types: `type Name = Definition` (truncated if long)

- [x] **extractDocumentation() Private Helper**
  - [x] Look for preceding JSDoc comment (`/** ... */`)
  - [x] Clean up asterisks and whitespace
  - [x] Return cleaned documentation string

- [x] **findErrors() Private Helper**
  - [x] Find nodes of type `ERROR` or `MISSING`
  - [x] Return as ParseError array

- [x] **getParser() Factory Function** - Singleton access

### Part E: Create Parser Tests
Create `src/infrastructure/analysis/TreeSitterParser.test.ts`:

- [x] **Mock web-tree-sitter** for unit testing (avoid WASM loading)

- [x] **Initialization Tests**
  - [x] Should not be ready before initialization
  - [x] Should be ready after initialization
  - [x] Should support TypeScript and JavaScript

- [x] **Language Detection Tests**
  - [x] Detect TypeScript from .ts, .tsx, .mts
  - [x] Detect JavaScript from .js, .jsx, .mjs
  - [x] Return null for unsupported extensions (.css, .json, .md)
  - [x] Handle paths with directories

- [x] **Parse Result Structure Tests**
  - [x] Return error for unsupported file types
  - [x] Return proper ParseResult structure
  - [x] Handle empty files

- [x] **parseFiles Tests**
  - [x] Parse multiple files
  - [x] Handle empty array

- [x] **Integration Tests (marked .skip for CI)**
  - [x] Extract function declarations
  - [x] Extract classes with methods
  - [x] Extract interfaces
  - [x] Extract type aliases
  - [x] Extract enums
  - [x] Extract arrow functions
  - [x] Extract named imports
  - [x] Extract default imports
  - [x] Extract namespace imports
  - [x] Extract side-effect imports
  - [x] Extract type-only imports
  - [x] Extract JSDoc documentation
  - [x] Detect syntax errors

### Task 13-01-A Completion Checklist
- [x] Dependencies installed (web-tree-sitter, fast-glob, tree-sitter grammars)
- [x] Directory `src/infrastructure/analysis/` created
- [x] `types.ts` created with ALL interfaces and types (~400-500 lines)
- [x] `TreeSitterParser.ts` created with full implementation (~500-600 lines)
- [x] `TreeSitterParser.test.ts` created with comprehensive tests (~300 lines)
- [x] All unit tests pass: `npm test src/infrastructure/analysis/TreeSitterParser.test.ts`
- [x] TypeScript compiles without errors: `npm run build`

**[TASK 13-01-A COMPLETE]** ✅ Completed on 2025-01-16

---

# Task 13-01-B: Symbol Extractor

## Objective
Create a utility class for processing, filtering, grouping, and analyzing extracted symbols.

## Requirements

### Part A: Create SymbolExtractor Class
Create `src/infrastructure/analysis/SymbolExtractor.ts`:

- [x] **SymbolExtractor Class**

- [x] **processSymbols(parseResults) Method**
  - [x] Merge symbols from all parse results
  - [x] Create Map keyed by unique symbol ID
  - [x] Return Map<string, SymbolEntry>

- [x] **createSymbolKey(symbol) Method**
  - [x] Generate unique key: `${file}#${name}#${line}`

- [x] **filterByKind(symbols, kind) Method**
  - [x] Return symbols matching specified SymbolKind

- [x] **getExportedSymbols(symbols) Method**
  - [x] Return only symbols with `exported: true`

- [x] **getTopLevelSymbols(symbols) Method**
  - [x] Return symbols with no `parentId`

- [x] **getChildSymbols(symbols, parentId) Method**
  - [x] Return symbols with matching `parentId`

- [x] **buildHierarchy(symbols) Method**
  - [x] Build tree structure: SymbolNode[] with children
  - [x] SymbolNode = { symbol: SymbolEntry, children: SymbolNode[] }

- [x] **groupByFile(symbols) Method**
  - [x] Return Map<string, SymbolEntry[]> grouped by file path

- [x] **groupByKind(symbols) Method**
  - [x] Return Map<SymbolKind, SymbolEntry[]> grouped by symbol kind

- [x] **searchByName(symbols, query) Method**
  - [x] Case-insensitive partial match on symbol name
  - [x] Return matching symbols

- [x] **findByName(symbols, name) Method**
  - [x] Exact match on symbol name
  - [x] Return matching symbols (may be multiple across files)

- [x] **findAtLocation(symbols, file, line) Method**
  - [x] Find symbol at specific file and line
  - [x] Line must be between symbol.line and symbol.endLine

- [x] **getStatistics(symbols) Method**
  - [x] Return SymbolStatistics:
    - total: number
    - byKind: Record<SymbolKind, number>
    - byFile: Record<string, number>
    - exported: number
    - documented: number
    - documentationCoverage: number (0-1)

- [x] **sortSymbols(symbols, criteria) Method**
  - [x] Sort by: 'name' | 'file' | 'references' | 'line'
  - [x] Return new sorted array

- [x] **deduplicate(symbols) Method**
  - [x] Remove duplicates based on symbol key
  - [x] Return deduplicated array

- [x] **mergeSymbols(parseResults) Method**
  - [x] Collect all symbols from parse results
  - [x] Deduplicate
  - [x] Return merged array

### Part B: Export Types
- [x] Export `SymbolNode` interface (already in types.ts)
- [x] Export `SymbolStatistics` interface (already in types.ts)

### Part C: Create Tests
Create `src/infrastructure/analysis/SymbolExtractor.test.ts`:

- [x] Test filtering by kind
- [x] Test getting exported symbols
- [x] Test getting top-level symbols
- [x] Test getting child symbols
- [x] Test building hierarchy
- [x] Test grouping by file
- [x] Test grouping by kind
- [x] Test searching by name (partial)
- [x] Test finding by name (exact)
- [x] Test finding at location
- [x] Test statistics calculation
- [x] Test sorting
- [x] Test deduplication
- [x] Test merging from multiple parse results

### Task 13-01-B Completion Checklist
- [x] `SymbolExtractor.ts` created (~270 lines)
- [x] `SymbolExtractor.test.ts` created (~380 lines)
- [x] All tests pass (42 tests)
- [x] TypeScript compiles

**[TASK 13-01-B COMPLETE]** ✅ Completed on 2025-01-16

---

# Task 13-01-C: Dependency Graph Builder

## Objective
Build a dependency graph from import/export relationships between files.

## Requirements

### Part A: Create DependencyGraphBuilder Class
Create `src/infrastructure/analysis/DependencyGraphBuilder.ts`:

- [x] **DependencyGraphBuilder Class**
  - [x] Private fields: `edges`, `dependentsMap`, `dependenciesMap`, `fileAliases`

- [x] **build(parseResults, projectPath) Method**
  - [x] Reset internal state
  - [x] Collect all file paths for resolution
  - [x] For each parse result, process imports and re-exports
  - [x] Create DependencyEdge for each valid import
  - [x] Skip external modules (npm packages)
  - [x] Return array of DependencyEdge

- [x] **resolveImport(importPath, fromFile, projectPath) Method**
  - [x] Handle relative imports (`./`, `../`)
  - [x] Handle path aliases (`@/` → `src/`)
  - [x] Resolve to absolute path
  - [x] Try extensions: .ts, .tsx, .js, .jsx
  - [x] Try index files: index.ts, index.tsx, etc.
  - [x] Return resolved path or null

- [x] **isExternalModule(source) Private Method**
  - [x] Return true if module is from npm (not starting with `.` or `/`)
  - [x] Handle scoped packages (`@scope/package`)

- [x] **registerAlias(alias, target) Method**
  - [x] Register custom path aliases
  - [x] Used for tsconfig paths support

- [x] **getDependents(filePath) Method**
  - [x] Return files that import the given file

- [x] **getDependencies(filePath) Method**
  - [x] Return files that the given file imports

- [x] **getEdgesForFile(filePath) Method**
  - [x] Return all edges involving the file (in or out)

- [x] **findCircularDependencies() Method**
  - [x] Use DFS to find cycles in dependency graph
  - [x] Return array of cycles (each cycle is string[])

- [x] **getSortedByConnections() Method**
  - [x] Return files sorted by total connection count (most connected first)
  - [x] Return Array<{ file: string; connections: number }>

- [x] **calculateDepth(filePath) Method**
  - [x] Calculate longest dependency chain from file
  - [x] Used for understanding module depth

- [x] **getStatistics() Method**
  - [x] Return DependencyGraphStats:
    - totalFiles: number
    - totalEdges: number
    - edgesByType: Record<DependencyType, number>
    - circularDependencies: number
    - mostConnectedFiles: Array<{ file, connections }>

### Part B: Export Types
- [x] Export `DependencyGraphStats` interface (already in types.ts)

### Part C: Create Tests
Create `src/infrastructure/analysis/DependencyGraphBuilder.test.ts`:

- [x] Test building graph from parse results
- [x] Test resolving relative imports
- [x] Test resolving with extensions
- [x] Test resolving index files
- [x] Test detecting external modules
- [x] Test path alias registration and resolution
- [x] Test getting dependents
- [x] Test getting dependencies
- [x] Test finding circular dependencies
- [x] Test sorting by connections
- [x] Test statistics calculation

### Task 13-01-C Completion Checklist
- [x] `DependencyGraphBuilder.ts` created (~560 lines)
- [x] `DependencyGraphBuilder.test.ts` created (~775 lines)
- [x] All tests pass (33 tests)
- [x] TypeScript compiles

**[TASK 13-01-C COMPLETE]** ✅ Completed on 2025-01-16

---

# Task 13-01-D: Reference Counter

## Objective
Count how many times each symbol is referenced across the codebase and calculate importance scores.

## Requirements

### Part A: Create ReferenceCounter Class
Create `src/infrastructure/analysis/ReferenceCounter.ts`:

- [x] **ReferenceCounter Class**
  - [x] Private fields: `referenceCounts` Map, `importanceScores` Map, `symbolIndex` Map

- [x] **count(symbols, parseResults) Method**
  - [x] Build symbol index for fast lookup
  - [x] Count references from imports in each file
  - [x] Update symbol.references field
  - [x] Return Map<symbolKey, count>

- [x] **getTopReferenced(n) Method**
  - [x] Return top N most referenced symbols
  - [x] Sorted by reference count descending

- [x] **calculateImportance(symbols, dependencies) Method**
  - [x] Implement PageRank-style algorithm
  - [x] Symbols referenced by important files are more important
  - [x] Iterate ~20 times for convergence
  - [x] Normalize scores to 0-1 range
  - [x] Return Map<symbolKey, importance>

- [x] **getRankedSymbols(symbols, dependencies) Method**
  - [x] Calculate both reference counts and importance
  - [x] Return combined ranking:
    - RankedSymbol = { symbol, referenceCount, importanceScore, combinedScore }
  - [x] Combined score = 0.6 * normalized_refs + 0.4 * importance

- [x] **getReferencingSources(symbolKey, dependencies) Method**
  - [x] Return list of files that reference this symbol

- [x] **getClusteringCoefficient(symbol, dependencies) Method**
  - [x] Calculate how interconnected referencing files are
  - [x] Return 0-1 coefficient

- [x] **getReferenceCount(symbol) Method**
  - [x] Get reference count for a symbol

- [x] **getImportanceScore(symbol) Method**
  - [x] Get importance score for a symbol

- [x] **getStatistics(symbols) Method**
  - [x] Return ReferenceStatistics:
    - totalReferences: number
    - averageReferences: number
    - maxReferences: number
    - symbolsWithReferences: number
    - orphanedExports: number (exported but never referenced)
    - coveragePercent: number

### Part B: Export Types
- [x] Export `RankedSymbol` interface
- [x] Export `ReferenceStatistics` interface

### Part C: Create Tests
Create `src/infrastructure/analysis/ReferenceCounter.test.ts`:

- [x] Test counting references from imports
- [x] Test getting top referenced symbols
- [x] Test importance calculation
- [x] Test combined ranking
- [x] Test finding referencing sources
- [x] Test statistics calculation
- [x] Test with empty inputs
- [x] Test with circular references

### Task 13-01-D Completion Checklist
- [x] `ReferenceCounter.ts` created (~330 lines)
- [x] `ReferenceCounter.test.ts` created (~490 lines)
- [x] All tests pass (31 tests)
- [x] TypeScript compiles

**[TASK 13-01-D COMPLETE]** ✅ Completed on 2025-01-16

---

# Task 13-01-E: RepoMapGenerator Core

## Objective
Create the main orchestrator that ties all components together to generate complete repository maps.

## Requirements

### Part A: Create RepoMapGenerator Class
Create `src/infrastructure/analysis/RepoMapGenerator.ts`:

- [x] **RepoMapGenerator Class** implementing IRepoMapGenerator
  - [x] Private fields: parser, symbolExtractor, dependencyBuilder, referenceCounter, formatter
  - [x] Private fields: currentMap, initialized

- [x] **Constructor**
  - [x] Accept optional `wasmBasePath`
  - [x] Instantiate all component classes

- [x] **initialize() Method**
  - [x] Initialize TreeSitterParser
  - [x] Set initialized flag

- [x] **generate(projectPath, options?) Method** - MAIN METHOD
  - [x] Start timing
  - [x] Merge options with defaults
  - [x] Ensure initialized
  - [x] Find files using fast-glob with include/exclude patterns
  - [x] Filter by language if specified
  - [x] Limit to maxFiles
  - [x] Read file contents
  - [x] Parse all files with TreeSitterParser
  - [x] Build file entries with metadata
  - [x] Merge symbols using SymbolExtractor
  - [x] Build dependency graph
  - [x] Count references if enabled
  - [x] Calculate statistics
  - [x] Store as currentMap
  - [x] Return RepoMap

- [x] **generateIncremental(projectPath, changedFiles) Method**
  - [x] If no currentMap, call generate()
  - [x] Re-parse only changed files
  - [x] Update symbols for changed files (keep unchanged)
  - [x] Rebuild dependency graph (needed for accuracy)
  - [x] Recount references
  - [x] Update statistics
  - [x] Return updated RepoMap

- [x] **findSymbol(name) Method**
  - [x] Use SymbolExtractor.findByName on currentMap
  - [x] Return matching symbols

- [x] **findUsages(symbolName) Method**
  - [x] Search dependencies for imports of symbolName
  - [x] Return SymbolUsage[] with file, line, context

- [x] **findImplementations(interfaceName) Method**
  - [x] Find classes with `implements InterfaceName` in signature
  - [x] Return matching class symbols

- [x] **getDependencies(file) Method**
  - [x] Delegate to DependencyGraphBuilder

- [x] **getDependents(file) Method**
  - [x] Delegate to DependencyGraphBuilder

- [x] **formatForContext(options?) Method**
  - [x] Delegate to RepoMapFormatter (basic implementation, full in Task F)
  - [x] Return formatted string

- [x] **getTokenCount() Method**
  - [x] Format and estimate tokens

- [x] **getCurrentMap() Method**
  - [x] Return currentMap or null

- [x] **clearCache() Method**
  - [x] Set currentMap to null

### Part B: Helper Methods
- [x] **findFiles(projectPath, options) Private Method**
  - [x] Use fast-glob with patterns
  - [x] Filter by language
  - [x] Return absolute paths

- [x] **parseAllFiles(files, maxFiles) Private Method**
  - [x] Read each file content
  - [x] Parse with TreeSitterParser
  - [x] Handle read errors gracefully
  - [x] Return ParseResult[]

- [x] **buildFileEntries(files, projectPath) Private Method**
  - [x] Get file stats (size, mtime)
  - [x] Count lines
  - [x] Detect language
  - [x] Return FileEntry[]

- [x] **calculateStats(...) Private Method**
  - [x] Compute all RepoMapStats fields

### Part C: Factory Function
- [x] **getRepoMapGenerator(wasmBasePath?) Function**
  - [x] Return singleton instance

### Part D: Create Tests
Create `src/infrastructure/analysis/RepoMapGenerator.test.ts`:

- [x] Test initialization
- [x] Test generate with mock file system
- [x] Test incremental generation
- [x] Test findSymbol
- [x] Test findUsages
- [x] Test findImplementations
- [x] Test getDependencies/getDependents
- [x] Test formatForContext
- [x] Test statistics calculation
- [x] Test with various options

### Task 13-01-E Completion Checklist
- [x] `RepoMapGenerator.ts` created (~480 lines)
- [x] `RepoMapGenerator.test.ts` created (~350 lines)
- [x] All tests pass (21 tests)
- [x] TypeScript compiles

**[TASK 13-01-E COMPLETE]** ✅ Completed on 2025-01-16

---

# Task 13-01-F: Formatter & Index

## Objective
Create the formatter for outputting repo maps in different formats and create the module index.

## Requirements

### Part A: Create RepoMapFormatter Class
Create `src/infrastructure/analysis/RepoMapFormatter.ts`:

- [ ] **RepoMapFormatter Class** implementing IRepoMapFormatter
  - [ ] Static constant: CHARS_PER_TOKEN = 4 (approximate)

- [ ] **format(repoMap, options?) Method**
  - [ ] Dispatch to style-specific formatter
  - [ ] Styles: 'compact', 'detailed', 'tree'

- [ ] **formatCompact(repoMap, options) Private Method**
  - [ ] Minimal tokens, maximum info density
  - [ ] Sort symbols by references if rankByReferences
  - [ ] Select symbols to fit maxTokens budget
  - [ ] Group by file if groupByFile
  - [ ] Output format:
    ```
    # Repository Map
    
    ## src/services/AuthService.ts
    ⊕εAuthService (15)
      · validateUser(user: User): boolean (8)
      · hashPassword(password: string): string (3)
    
    ## src/types/user.ts
    ◇εUser
    ⊤εUserRole = 'admin' | 'user'
    ```
  - [ ] Symbol prefixes:
    - `⊕` class
    - `◇` interface
    - `ƒ` function
    - `·` method (indented)
    - `.` property (indented)
    - `→` variable
    - `∷` constant
    - `⊤` type
    - `⊞` enum
  - [ ] `ε` marker for exported
  - [ ] `(N)` suffix for reference count

- [ ] **formatDetailed(repoMap, options) Private Method**
  - [ ] More verbose output
  - [ ] Include full signatures
  - [ ] Include documentation
  - [ ] Include dependency section

- [ ] **formatTree(repoMap, options) Private Method**
  - [ ] Directory tree structure
  - [ ] Show files with symbols nested
  - [ ] Use tree characters: `├──`, `└──`, `│`

- [ ] **estimateTokens(text) Method**
  - [ ] Return Math.ceil(text.length / CHARS_PER_TOKEN)

- [ ] **truncateToFit(repoMap, maxTokens) Method**
  - [ ] Format with compact style
  - [ ] Truncate if over budget
  - [ ] Add "... (truncated)" indicator

- [ ] **selectSymbolsForBudget(symbols, maxTokens, includeSignatures) Private Method**
  - [ ] Estimate tokens per symbol
  - [ ] Add symbols until budget exhausted
  - [ ] Return selected symbols

- [ ] **getSymbolPrefix(kind) Private Method**
  - [ ] Return appropriate Unicode prefix

- [ ] **truncateSignature(signature, maxLength) Private Method**
  - [ ] Truncate long signatures with "..."

- [ ] **formatStats(repoMap) Method**
  - [ ] Return formatted statistics summary

### Part B: Create Index File
Create `src/infrastructure/analysis/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export TreeSitterParser and getParser
- [ ] Export SymbolExtractor and its types
- [ ] Export DependencyGraphBuilder and its types
- [ ] Export ReferenceCounter and its types
- [ ] Export RepoMapGenerator and getRepoMapGenerator
- [ ] Export RepoMapFormatter

- [ ] **createRepoMapGenerator(wasmBasePath?) Convenience Function**
  - [ ] Create and initialize generator
  - [ ] Return ready-to-use instance

- [ ] **generateRepoMap(projectPath, options?) Convenience Function**
  - [ ] Create generator, generate, return map

- [ ] **formatRepoMapForContext(projectPath, maxTokens) Convenience Function**
  - [ ] Generate and format in one call

### Part C: Create Formatter Tests
Create `src/infrastructure/analysis/RepoMapFormatter.test.ts`:

- [ ] Test compact format output
- [ ] Test detailed format output
- [ ] Test tree format output
- [ ] Test token estimation
- [ ] Test truncation to fit budget
- [ ] Test symbol selection for budget
- [ ] Test symbol prefixes
- [ ] Test signature truncation
- [ ] Test stats formatting

### Part D: Integration Test
Create `src/infrastructure/analysis/integration.test.ts`:

- [ ] Test full pipeline: generate → format → verify output
- [ ] Test with actual Nexus source files (skip in CI if needed)
- [ ] Verify token budget is respected
- [ ] Verify all symbol types are extracted

### Task 13-01-F Completion Checklist
- [ ] `RepoMapFormatter.ts` created (~400 lines)
- [ ] `RepoMapFormatter.test.ts` created (~100 lines)
- [ ] `index.ts` created with all exports (~70 lines)
- [ ] `integration.test.ts` created (~50 lines)
- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] ESLint passes

**[TASK 13-01-F COMPLETE]**

---

## Output File Structure

After completion, `src/infrastructure/analysis/` should contain:

```
src/infrastructure/analysis/
├── index.ts                          # Module exports (~70 lines)
├── types.ts                          # All type definitions (~450 lines)
├── TreeSitterParser.ts               # WASM parser wrapper (~550 lines)
├── TreeSitterParser.test.ts          # Parser tests (~300 lines)
├── SymbolExtractor.ts                # Symbol processing (~200 lines)
├── SymbolExtractor.test.ts           # Extractor tests (~150 lines)
├── DependencyGraphBuilder.ts         # Import graph (~380 lines)
├── DependencyGraphBuilder.test.ts    # Graph tests (~150 lines)
├── ReferenceCounter.ts               # Reference counting (~300 lines)
├── ReferenceCounter.test.ts          # Counter tests (~100 lines)
├── RepoMapGenerator.ts               # Main orchestrator (~380 lines)
├── RepoMapGenerator.test.ts          # Generator tests (~150 lines)
├── RepoMapFormatter.ts               # Context formatting (~400 lines)
├── RepoMapFormatter.test.ts          # Formatter tests (~100 lines)
└── integration.test.ts               # End-to-end tests (~50 lines)
                                      ─────────────────────────────
                                      Total: ~3,700 lines
```

---

## Success Criteria

- [ ] All 6 tasks completed with markers checked
- [ ] All files created in `src/infrastructure/analysis/`
- [ ] Dependencies installed: `web-tree-sitter`, `fast-glob`, tree-sitter grammars
- [ ] All unit tests pass: `npm test src/infrastructure/analysis/`
- [ ] TypeScript compiles: `npm run build`
- [ ] ESLint passes: `npm run lint`
- [ ] Can generate repo map for Nexus itself:
  ```typescript
  const map = await generateRepoMap('.', { maxTokens: 4000 });
  console.log(map.stats.totalSymbols); // Should be > 100
  ```
- [ ] Formatted output fits token budget
- [ ] **Total lines: ~3,500-4,000**

---

## Recommended Settings

```
--max-iterations 60
--completion-promise "PLAN_13_01_COMPLETE"
```

## Task Completion Markers

Complete tasks sequentially:

- [x] `[TASK 13-01-A COMPLETE]` - Types & TreeSitter Parser Setup ✅
- [x] `[TASK 13-01-B COMPLETE]` - Symbol Extractor ✅
- [x] `[TASK 13-01-C COMPLETE]` - Dependency Graph Builder ✅
- [x] `[TASK 13-01-D COMPLETE]` - Reference Counter ✅
- [x] `[TASK 13-01-E COMPLETE]` - RepoMapGenerator Core ✅
- [ ] `[TASK 13-01-F COMPLETE]` - Formatter & Index
- [ ] `[PLAN 13-01 COMPLETE]` - All tasks done

---

## Notes

- Complete each task FULLY before marking complete
- Reference `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` for detailed interface specs
- Follow existing Nexus patterns in `src/infrastructure/` for consistency
- Use the existing test patterns from other Nexus test files
- The WASM files are in `node_modules/` after npm install
- web-tree-sitter 0.24.7 is critical for TypeScript type compatibility
- This module lives in Layer 7 (Infrastructure) per the 7-layer architecture
- After completion, this enables Plan 13-02 (Codebase Analyzer) and Plan 13-03 (Code Memory)

## Reference Files

For existing patterns, examine:
- `src/infrastructure/git/GitService.ts` - Service pattern
- `src/infrastructure/file-system/FileSystemService.ts` - File operations
- `src/types/` - Type definition patterns
- `vitest.config.ts` - Test configuration