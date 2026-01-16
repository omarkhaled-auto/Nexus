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

- [ ] **SymbolExtractor Class**

- [ ] **processSymbols(parseResults) Method**
  - [ ] Merge symbols from all parse results
  - [ ] Create Map keyed by unique symbol ID
  - [ ] Return Map<string, SymbolEntry>

- [ ] **createSymbolKey(symbol) Method**
  - [ ] Generate unique key: `${file}#${name}#${line}`

- [ ] **filterByKind(symbols, kind) Method**
  - [ ] Return symbols matching specified SymbolKind

- [ ] **getExportedSymbols(symbols) Method**
  - [ ] Return only symbols with `exported: true`

- [ ] **getTopLevelSymbols(symbols) Method**
  - [ ] Return symbols with no `parentId`

- [ ] **getChildSymbols(symbols, parentId) Method**
  - [ ] Return symbols with matching `parentId`

- [ ] **buildHierarchy(symbols) Method**
  - [ ] Build tree structure: SymbolNode[] with children
  - [ ] SymbolNode = { symbol: SymbolEntry, children: SymbolNode[] }

- [ ] **groupByFile(symbols) Method**
  - [ ] Return Map<string, SymbolEntry[]> grouped by file path

- [ ] **groupByKind(symbols) Method**
  - [ ] Return Map<SymbolKind, SymbolEntry[]> grouped by symbol kind

- [ ] **searchByName(symbols, query) Method**
  - [ ] Case-insensitive partial match on symbol name
  - [ ] Return matching symbols

- [ ] **findByName(symbols, name) Method**
  - [ ] Exact match on symbol name
  - [ ] Return matching symbols (may be multiple across files)

- [ ] **findAtLocation(symbols, file, line) Method**
  - [ ] Find symbol at specific file and line
  - [ ] Line must be between symbol.line and symbol.endLine

- [ ] **getStatistics(symbols) Method**
  - [ ] Return SymbolStatistics:
    - total: number
    - byKind: Record<SymbolKind, number>
    - byFile: Record<string, number>
    - exported: number
    - documented: number
    - documentationCoverage: number (0-1)

- [ ] **sortSymbols(symbols, criteria) Method**
  - [ ] Sort by: 'name' | 'file' | 'references' | 'line'
  - [ ] Return new sorted array

- [ ] **deduplicate(symbols) Method**
  - [ ] Remove duplicates based on symbol key
  - [ ] Return deduplicated array

- [ ] **mergeSymbols(parseResults) Method**
  - [ ] Collect all symbols from parse results
  - [ ] Deduplicate
  - [ ] Return merged array

### Part B: Export Types
- [ ] Export `SymbolNode` interface
- [ ] Export `SymbolStatistics` interface

### Part C: Create Tests
Create `src/infrastructure/analysis/SymbolExtractor.test.ts`:

- [ ] Test filtering by kind
- [ ] Test getting exported symbols
- [ ] Test getting top-level symbols
- [ ] Test getting child symbols
- [ ] Test building hierarchy
- [ ] Test grouping by file
- [ ] Test grouping by kind
- [ ] Test searching by name (partial)
- [ ] Test finding by name (exact)
- [ ] Test finding at location
- [ ] Test statistics calculation
- [ ] Test sorting
- [ ] Test deduplication
- [ ] Test merging from multiple parse results

### Task 13-01-B Completion Checklist
- [ ] `SymbolExtractor.ts` created (~200 lines)
- [ ] `SymbolExtractor.test.ts` created (~150 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 13-01-B COMPLETE]** ← Mark this when done, then proceed to Task 13-01-C

---

# Task 13-01-C: Dependency Graph Builder

## Objective
Build a dependency graph from import/export relationships between files.

## Requirements

### Part A: Create DependencyGraphBuilder Class
Create `src/infrastructure/analysis/DependencyGraphBuilder.ts`:

- [ ] **DependencyGraphBuilder Class**
  - [ ] Private fields: `edges`, `dependentsMap`, `dependenciesMap`, `fileAliases`

- [ ] **build(parseResults, projectPath) Method**
  - [ ] Reset internal state
  - [ ] Collect all file paths for resolution
  - [ ] For each parse result, process imports and re-exports
  - [ ] Create DependencyEdge for each valid import
  - [ ] Skip external modules (npm packages)
  - [ ] Return array of DependencyEdge

- [ ] **resolveImport(importPath, fromFile, projectPath) Method**
  - [ ] Handle relative imports (`./`, `../`)
  - [ ] Handle path aliases (`@/` → `src/`)
  - [ ] Resolve to absolute path
  - [ ] Try extensions: .ts, .tsx, .js, .jsx
  - [ ] Try index files: index.ts, index.tsx, etc.
  - [ ] Return resolved path or null

- [ ] **isExternalModule(source) Private Method**
  - [ ] Return true if module is from npm (not starting with `.` or `/`)
  - [ ] Handle scoped packages (`@scope/package`)

- [ ] **registerAlias(alias, target) Method**
  - [ ] Register custom path aliases
  - [ ] Used for tsconfig paths support

- [ ] **getDependents(filePath) Method**
  - [ ] Return files that import the given file

- [ ] **getDependencies(filePath) Method**
  - [ ] Return files that the given file imports

- [ ] **getEdgesForFile(filePath) Method**
  - [ ] Return all edges involving the file (in or out)

- [ ] **findCircularDependencies() Method**
  - [ ] Use DFS to find cycles in dependency graph
  - [ ] Return array of cycles (each cycle is string[])

- [ ] **getSortedByConnections() Method**
  - [ ] Return files sorted by total connection count (most connected first)
  - [ ] Return Array<{ file: string; connections: number }>

- [ ] **calculateDepth(filePath) Method**
  - [ ] Calculate longest dependency chain from file
  - [ ] Used for understanding module depth

- [ ] **getStatistics() Method**
  - [ ] Return DependencyGraphStats:
    - totalFiles: number
    - totalEdges: number
    - edgesByType: Record<DependencyType, number>
    - circularDependencies: number
    - mostConnectedFiles: Array<{ file, connections }>

### Part B: Export Types
- [ ] Export `DependencyGraphStats` interface

### Part C: Create Tests
Create `src/infrastructure/analysis/DependencyGraphBuilder.test.ts`:

- [ ] Test building graph from parse results
- [ ] Test resolving relative imports
- [ ] Test resolving with extensions
- [ ] Test resolving index files
- [ ] Test detecting external modules
- [ ] Test path alias registration and resolution
- [ ] Test getting dependents
- [ ] Test getting dependencies
- [ ] Test finding circular dependencies
- [ ] Test sorting by connections
- [ ] Test statistics calculation

### Task 13-01-C Completion Checklist
- [ ] `DependencyGraphBuilder.ts` created (~350-400 lines)
- [ ] `DependencyGraphBuilder.test.ts` created (~150 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 13-01-C COMPLETE]** ← Mark this when done, then proceed to Task 13-01-D

---

# Task 13-01-D: Reference Counter

## Objective
Count how many times each symbol is referenced across the codebase and calculate importance scores.

## Requirements

### Part A: Create ReferenceCounter Class
Create `src/infrastructure/analysis/ReferenceCounter.ts`:

- [ ] **ReferenceCounter Class**
  - [ ] Private fields: `referenceCounts` Map, `importanceScores` Map, `symbolIndex` Map

- [ ] **count(symbols, parseResults) Method**
  - [ ] Build symbol index for fast lookup
  - [ ] Count references from imports in each file
  - [ ] Update symbol.references field
  - [ ] Return Map<symbolKey, count>

- [ ] **getTopReferenced(n) Method**
  - [ ] Return top N most referenced symbols
  - [ ] Sorted by reference count descending

- [ ] **calculateImportance(symbols, dependencies) Method**
  - [ ] Implement PageRank-style algorithm
  - [ ] Symbols referenced by important files are more important
  - [ ] Iterate ~20 times for convergence
  - [ ] Normalize scores to 0-1 range
  - [ ] Return Map<symbolKey, importance>

- [ ] **getRankedSymbols(symbols, dependencies) Method**
  - [ ] Calculate both reference counts and importance
  - [ ] Return combined ranking:
    - RankedSymbol = { symbol, referenceCount, importanceScore, combinedScore }
  - [ ] Combined score = 0.6 * normalized_refs + 0.4 * importance

- [ ] **getReferencingSources(symbolKey, dependencies) Method**
  - [ ] Return list of files that reference this symbol

- [ ] **getClusteringCoefficient(symbol, dependencies) Method**
  - [ ] Calculate how interconnected referencing files are
  - [ ] Return 0-1 coefficient

- [ ] **getReferenceCount(symbol) Method**
  - [ ] Get reference count for a symbol

- [ ] **getImportanceScore(symbol) Method**
  - [ ] Get importance score for a symbol

- [ ] **getStatistics(symbols) Method**
  - [ ] Return ReferenceStatistics:
    - totalReferences: number
    - averageReferences: number
    - maxReferences: number
    - symbolsWithReferences: number
    - orphanedExports: number (exported but never referenced)
    - coveragePercent: number

### Part B: Export Types
- [ ] Export `RankedSymbol` interface
- [ ] Export `ReferenceStatistics` interface

### Part C: Create Tests
Create `src/infrastructure/analysis/ReferenceCounter.test.ts`:

- [ ] Test counting references from imports
- [ ] Test getting top referenced symbols
- [ ] Test importance calculation
- [ ] Test combined ranking
- [ ] Test finding referencing sources
- [ ] Test statistics calculation
- [ ] Test with empty inputs
- [ ] Test with circular references

### Task 13-01-D Completion Checklist
- [ ] `ReferenceCounter.ts` created (~300 lines)
- [ ] `ReferenceCounter.test.ts` created (~100 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 13-01-D COMPLETE]** ← Mark this when done, then proceed to Task 13-01-E

---

# Task 13-01-E: RepoMapGenerator Core

## Objective
Create the main orchestrator that ties all components together to generate complete repository maps.

## Requirements

### Part A: Create RepoMapGenerator Class
Create `src/infrastructure/analysis/RepoMapGenerator.ts`:

- [ ] **RepoMapGenerator Class** implementing IRepoMapGenerator
  - [ ] Private fields: parser, symbolExtractor, dependencyBuilder, referenceCounter, formatter
  - [ ] Private fields: currentMap, initialized

- [ ] **Constructor**
  - [ ] Accept optional `wasmBasePath`
  - [ ] Instantiate all component classes

- [ ] **initialize() Method**
  - [ ] Initialize TreeSitterParser
  - [ ] Set initialized flag

- [ ] **generate(projectPath, options?) Method** - MAIN METHOD
  - [ ] Start timing
  - [ ] Merge options with defaults
  - [ ] Ensure initialized
  - [ ] Find files using fast-glob with include/exclude patterns
  - [ ] Filter by language if specified
  - [ ] Limit to maxFiles
  - [ ] Read file contents
  - [ ] Parse all files with TreeSitterParser
  - [ ] Build file entries with metadata
  - [ ] Merge symbols using SymbolExtractor
  - [ ] Build dependency graph
  - [ ] Count references if enabled
  - [ ] Calculate statistics
  - [ ] Store as currentMap
  - [ ] Return RepoMap

- [ ] **generateIncremental(projectPath, changedFiles) Method**
  - [ ] If no currentMap, call generate()
  - [ ] Re-parse only changed files
  - [ ] Update symbols for changed files (keep unchanged)
  - [ ] Rebuild dependency graph (needed for accuracy)
  - [ ] Recount references
  - [ ] Update statistics
  - [ ] Return updated RepoMap

- [ ] **findSymbol(name) Method**
  - [ ] Use SymbolExtractor.findByName on currentMap
  - [ ] Return matching symbols

- [ ] **findUsages(symbolName) Method**
  - [ ] Search dependencies for imports of symbolName
  - [ ] Return SymbolUsage[] with file, line, context

- [ ] **findImplementations(interfaceName) Method**
  - [ ] Find classes with `implements InterfaceName` in signature
  - [ ] Return matching class symbols

- [ ] **getDependencies(file) Method**
  - [ ] Delegate to DependencyGraphBuilder

- [ ] **getDependents(file) Method**
  - [ ] Delegate to DependencyGraphBuilder

- [ ] **formatForContext(options?) Method**
  - [ ] Delegate to RepoMapFormatter
  - [ ] Return formatted string

- [ ] **getTokenCount() Method**
  - [ ] Format and estimate tokens

- [ ] **getCurrentMap() Method**
  - [ ] Return currentMap or null

- [ ] **clearCache() Method**
  - [ ] Set currentMap to null

### Part B: Helper Methods
- [ ] **findFiles(projectPath, options) Private Method**
  - [ ] Use fast-glob with patterns
  - [ ] Filter by language
  - [ ] Return absolute paths

- [ ] **parseAllFiles(files, maxFiles) Private Method**
  - [ ] Read each file content
  - [ ] Parse with TreeSitterParser
  - [ ] Handle read errors gracefully
  - [ ] Return ParseResult[]

- [ ] **buildFileEntries(files, projectPath) Private Method**
  - [ ] Get file stats (size, mtime)
  - [ ] Count lines
  - [ ] Detect language
  - [ ] Return FileEntry[]

- [ ] **calculateStats(...) Private Method**
  - [ ] Compute all RepoMapStats fields

### Part C: Factory Function
- [ ] **getRepoMapGenerator(wasmBasePath?) Function**
  - [ ] Return singleton instance

### Part D: Create Tests
Create `src/infrastructure/analysis/RepoMapGenerator.test.ts`:

- [ ] Test initialization
- [ ] Test generate with mock file system
- [ ] Test incremental generation
- [ ] Test findSymbol
- [ ] Test findUsages
- [ ] Test findImplementations
- [ ] Test getDependencies/getDependents
- [ ] Test formatForContext
- [ ] Test statistics calculation
- [ ] Test with various options

### Task 13-01-E Completion Checklist
- [ ] `RepoMapGenerator.ts` created (~350-400 lines)
- [ ] `RepoMapGenerator.test.ts` created (~150 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 13-01-E COMPLETE]** ← Mark this when done, then proceed to Task 13-01-F

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
- [ ] `[TASK 13-01-B COMPLETE]` - Symbol Extractor
- [ ] `[TASK 13-01-C COMPLETE]` - Dependency Graph Builder
- [ ] `[TASK 13-01-D COMPLETE]` - Reference Counter
- [ ] `[TASK 13-01-E COMPLETE]` - RepoMapGenerator Core
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