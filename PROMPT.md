# Plan 13-02: Codebase Documentation Generator

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plan:** 2 of 8 (Codebase Documentation Generator)
- **Purpose:** Auto-generate 7 comprehensive documentation files that give agents deep understanding of codebase architecture, patterns, and conventions before they start coding
- **Input:** 
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` (Plan 13-02 section)
  - `src/infrastructure/analysis/` (RepoMapGenerator from Plan 13-01)
  - `07_NEXUS_MASTER_BOOK.md` (architecture reference)
  - `05_ARCHITECTURE_BLUEPRINT.md` (layer definitions)
  - Existing Nexus codebase
- **Output:** `src/infrastructure/analysis/codebase/` module + `.nexus/codebase/*.md` generated docs
- **Philosophy:** Agents work better when they understand the "why" behind code, not just the "what". These docs capture architectural intent, patterns, and tribal knowledge.

## Pre-Requisites
- [ ] Verify Plan 13-01 is complete: `src/infrastructure/analysis/` exists with RepoMapGenerator
- [ ] Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Plan 13-02 section
- [ ] Review `src/infrastructure/analysis/index.ts` for available exports
- [ ] Review existing Nexus documentation patterns
- [ ] Understand the 7-layer architecture from Master Book

## Dependency on Plan 13-01

This plan uses the RepoMapGenerator from Plan 13-01:
```typescript
import { 
  RepoMapGenerator, 
  RepoMap, 
  SymbolEntry, 
  DependencyEdge 
} from '../analysis';
```

The RepoMap provides:
- All symbols (classes, functions, interfaces, types)
- All dependencies (imports/exports between files)
- File metadata (size, line count)
- Reference counts for importance ranking

## Task Structure

This plan is divided into **7 sequential tasks**. Complete each task fully before moving to the next.

```
Task 13-02-A: Types & Base Analyzer ──────► [TASK 13-02-A COMPLETE]
                │
                ▼
Task 13-02-B: Architecture Analyzer ──────► [COMPLETE - 2025-01-16]
                │
                ▼
Task 13-02-C: Patterns Analyzer ──────────► [COMPLETE - 2025-01-16]
                │
                ▼
Task 13-02-D: Dependencies Analyzer ──────► [COMPLETE - 2025-01-16]
                │
                ▼
Task 13-02-E: API & Data Flow Analyzer ───► [COMPLETE - 2025-01-16]
                │
                ▼
Task 13-02-F: Test & Issues Analyzer ─────► [COMPLETE - 2025-01-16]
                │
                ▼
Task 13-02-G: CodebaseAnalyzer & Index ───► [PLAN 13-02 COMPLETE]
```

---

# Task 13-02-A: Types & Base Analyzer

## Objective
Create type definitions and the base analyzer infrastructure for generating codebase documentation.

## Requirements

### Part A: Create Directory Structure
- [x] Create directory: `src/infrastructure/analysis/codebase/`
- [x] This extends the analysis module from Plan 13-01

### Part B: Create Types File
Create `src/infrastructure/analysis/codebase/types.ts`:

- [x] **CodebaseDocumentation Interface** - All 7 docs together
- [x] **ArchitectureDoc Interface**
- [x] **LayerDescription Interface**
- [x] **ComponentDescription Interface**
- [x] **EntryPointDescription Interface**
- [x] **DesignDecision Interface**
- [x] **PatternsDoc Interface**
- [x] **PatternDescription Interface**
- [x] **PatternExample Interface**
- [x] **NamingConvention Interface**
- [x] **FileOrganizationRule Interface**
- [x] **DependenciesDoc Interface**
- [x] **ExternalDependency Interface**
- [x] **InternalModule Interface**
- [x] **CircularDependency Interface**
- [x] **APISurfaceDoc Interface**
- [x] **InterfaceDoc, ClassDoc, FunctionDoc, TypeDoc Interfaces**
- [x] **PropertyDoc, MethodDoc, ParameterDoc Interfaces**
- [x] **IPCChannelDoc Interface** (for Electron)
- [x] **DataFlowDoc Interface**
- [x] **StateManagementDoc Interface**
- [x] **DataStoreDoc Interface**
- [x] **EventFlowDoc Interface**
- [x] **DataTransformationDoc Interface**
- [x] **TestStrategyDoc Interface**
- [x] **TestFramework, TestTypeDoc, CoverageDoc, TestPatternDoc Interfaces**
- [x] **KnownIssuesDoc Interface**
- [x] **TechnicalDebtItem, LimitationDoc, WorkaroundDoc, FutureImprovementDoc Interfaces**
- [x] **AnalyzerOptions Interface**
- [x] **DEFAULT_ANALYZER_OPTIONS Constant**
- [x] Export all types

### Part C: Create Base Analyzer Class
Create `src/infrastructure/analysis/codebase/BaseAnalyzer.ts`:

- [x] **BaseAnalyzer Abstract Class**
- [x] **getSymbolsByKind(kind) Method**
- [x] **getExportedSymbols() Method**
- [x] **getFilesInDirectory(dir) Method**
- [x] **getDependenciesOf(file) Method**
- [x] **getDependentsOf(file) Method**
- [x] **extractJSDoc(symbol) Method**
- [x] **inferPurpose(symbol) Method**
- [x] **generateMermaidDiagram(type, data) Method**

### Part D: Create Tests
Create `src/infrastructure/analysis/codebase/BaseAnalyzer.test.ts`:

- [x] Test getSymbolsByKind
- [x] Test getExportedSymbols
- [x] Test getFilesInDirectory
- [x] Test getDependenciesOf
- [x] Test getDependentsOf
- [x] Test inferPurpose
- [x] Test Mermaid diagram generation

### Task 13-02-A Completion Checklist
- [x] Directory `src/infrastructure/analysis/codebase/` created
- [x] `types.ts` created with ALL interfaces (~480 lines)
- [x] `BaseAnalyzer.ts` created (~350 lines)
- [x] `BaseAnalyzer.test.ts` created (~300 lines)
- [x] All tests pass (27 tests)
- [x] TypeScript compiles

**[TASK 13-02-A COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-B: Architecture Analyzer

## Objective
Create analyzer that generates ARCHITECTURE.md documenting system layers, components, and design decisions.

## Requirements

### Part A: Create ArchitectureAnalyzer Class
Create `src/infrastructure/analysis/codebase/ArchitectureAnalyzer.ts`:

- [x] **ArchitectureAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns ArchitectureDoc
  - [x] Generate overview
  - [x] Detect and document layers
  - [x] Identify key components
  - [x] Find entry points
  - [x] Infer design decisions

- [x] **generateOverview() Private Method**
  - [x] Count files, symbols, dependencies
  - [x] Identify main technologies (React, Electron, etc.)
  - [x] Generate 2-3 paragraph overview

- [x] **detectLayers() Private Method**
  - [x] Analyze directory structure
  - [x] Look for layer patterns:
    - `src/ui/` → UI Layer
    - `src/orchestration/` → Orchestration Layer
    - `src/planning/` → Planning Layer
    - `src/execution/` → Execution Layer
    - `src/quality/` → Quality Layer
    - `src/persistence/` → Persistence Layer
    - `src/infrastructure/` → Infrastructure Layer
  - [x] For each layer, identify:
    - Purpose (inferred from contents)
    - Key files
    - Dependencies on other layers
  - [x] Return LayerDescription[]

- [x] **identifyKeyComponents() Private Method**
  - [x] Find classes/functions with high reference counts
  - [x] Find exported symbols from index files
  - [x] For each, document:
    - Purpose (from JSDoc or inferred)
    - Public API
    - Dependencies and dependents
  - [x] Return top 20 ComponentDescription[]

- [x] **findEntryPoints() Private Method**
  - [x] Look for:
    - `main.ts` - Electron main process
    - `renderer.ts` - Renderer entry
    - `preload.ts` - Preload script
    - `index.ts` in src/ - Main exports
  - [x] Document each entry point type
  - [x] Return EntryPointDescription[]

- [x] **inferDesignDecisions() Private Method**
  - [x] Analyze patterns to infer decisions:
    - State management approach (Zustand stores)
    - Database choice (SQLite)
    - Testing framework (Vitest)
    - UI framework (React)
    - Build tool (Vite/Electron-Vite)
  - [x] Generate rationale based on context
  - [x] Return DesignDecision[]

- [x] **toMarkdown(doc: ArchitectureDoc) Method**
  - [x] Generate ARCHITECTURE.md content
  - [x] Include:
    - Title and generation timestamp
    - Overview section
    - Layer diagram (Mermaid)
    - Layer descriptions
    - Key components table
    - Entry points section
    - Design decisions section

### Part B: Create Tests
Create `src/infrastructure/analysis/codebase/ArchitectureAnalyzer.test.ts`:

- [x] Test layer detection
- [x] Test component identification
- [x] Test entry point detection
- [x] Test design decision inference
- [x] Test Markdown generation

### Task 13-02-B Completion Checklist
- [x] `ArchitectureAnalyzer.ts` created (~712 lines)
- [x] `ArchitectureAnalyzer.test.ts` created (~280 lines)
- [x] All tests pass (29 tests)
- [x] TypeScript compiles

**[TASK 13-02-B COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-C: Patterns Analyzer

## Objective
Create analyzer that generates PATTERNS.md documenting coding patterns, conventions, and file organization.

## Requirements

### Part A: Create PatternsAnalyzer Class
Create `src/infrastructure/analysis/codebase/PatternsAnalyzer.ts`:

- [x] **PatternsAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns PatternsDoc

- [x] **detectArchitecturalPatterns() Private Method**
  - [x] Look for common patterns:
    - **Repository Pattern**: Classes ending in `Repository`, `DB`, `Store`
    - **Service Pattern**: Classes ending in `Service`
    - **Factory Pattern**: Functions/classes with `create`, `build`, `make`
    - **Singleton Pattern**: `getInstance()` methods, module-level instances
    - **Observer Pattern**: `EventBus`, `EventEmitter`, `subscribe`
    - **Strategy Pattern**: Interface + multiple implementations
    - **Adapter Pattern**: Classes ending in `Adapter`
    - **Bridge Pattern**: Classes ending in `Bridge`
  - [x] For each found, provide example files
  - [x] Return PatternDescription[]

- [x] **detectCodingPatterns() Private Method**
  - [x] Analyze code for patterns:
    - **Async/Await usage**: Look for async functions
    - **Error handling**: Try/catch patterns
    - **Type guards**: `is` prefix functions
    - **Builder pattern**: Fluent interfaces with `return this`
    - **Dependency injection**: Constructor parameters
  - [x] Provide examples
  - [x] Return PatternDescription[]

- [x] **detectNamingConventions() Private Method**
  - [x] Analyze symbol names to detect:
    - Class naming (PascalCase)
    - Interface naming (I prefix or not)
    - Function naming (camelCase)
    - Constant naming (UPPER_SNAKE_CASE)
    - File naming (kebab-case, PascalCase, etc.)
    - Test file naming (*.test.ts)
  - [x] Provide examples
  - [x] Return NamingConvention[]

- [x] **detectFileOrganization() Private Method**
  - [x] Analyze file structure:
    - Test file location (co-located vs __tests__)
    - Type file patterns (types.ts per module)
    - Index file usage
    - Config file locations
  - [x] Return FileOrganizationRule[]

- [x] **toMarkdown(doc: PatternsDoc) Method**
  - [x] Generate PATTERNS.md content
  - [x] Include:
    - Overview
    - Architectural patterns with examples
    - Coding patterns with examples
    - Naming conventions table
    - File organization rules

### Part B: Create Tests
Create `src/infrastructure/analysis/codebase/PatternsAnalyzer.test.ts`:

- [x] Test architectural pattern detection
- [x] Test coding pattern detection
- [x] Test naming convention detection
- [x] Test file organization detection
- [x] Test Markdown generation

### Task 13-02-C Completion Checklist
- [x] `PatternsAnalyzer.ts` created (~450 lines)
- [x] `PatternsAnalyzer.test.ts` created (~800 lines)
- [x] All tests pass (31 tests)
- [x] TypeScript compiles

**[TASK 13-02-C COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-D: Dependencies Analyzer

## Objective
Create analyzer that generates DEPENDENCIES.md documenting external and internal dependencies.

## Requirements

### Part A: Create DependenciesAnalyzer Class
Create `src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts`:

- [x] **DependenciesAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns DependenciesDoc

- [x] **analyzeExternalDependencies() Private Method**
  - [x] Read package.json
  - [x] For each dependency:
    - Get name and version
    - Infer purpose from name
    - Find files that import it
    - Determine if critical (core functionality)
  - [x] Categorize:
    - Runtime dependencies
    - Dev dependencies
    - Peer dependencies
  - [x] Return ExternalDependency[]

- [x] **analyzeInternalModules() Private Method**
  - [x] Find all index.ts files (module entry points)
  - [x] For each module:
    - List exports
    - Find importers
    - Find imports
  - [x] Return InternalModule[]

- [x] **generateDependencyGraph() Private Method**
  - [x] Create Mermaid flowchart showing:
    - Layer dependencies
    - Key module dependencies
  - [x] Keep graph readable (max 20 nodes)
  - [x] Return Mermaid string

- [x] **findCircularDependencies() Private Method**
  - [x] Use DependencyGraphBuilder.findCircularDependencies()
  - [x] Assess severity:
    - Same layer: low
    - Adjacent layers: medium
    - Distant layers: high
  - [x] Suggest fixes
  - [x] Return CircularDependency[]

- [x] **toMarkdown(doc: DependenciesDoc) Method**
  - [x] Generate DEPENDENCIES.md content
  - [x] Include:
    - Overview
    - External dependencies table (name, version, purpose, critical?)
    - Internal modules table
    - Dependency graph (Mermaid)
    - Circular dependencies section with suggestions

### Part B: Create Tests
Create `src/infrastructure/analysis/codebase/DependenciesAnalyzer.test.ts`:

- [x] Test external dependency analysis
- [x] Test internal module detection
- [x] Test dependency graph generation
- [x] Test circular dependency detection
- [x] Test Markdown generation

### Task 13-02-D Completion Checklist
- [x] `DependenciesAnalyzer.ts` created (~700 lines)
- [x] `DependenciesAnalyzer.test.ts` created (~300 lines)
- [x] All tests pass (21 tests)
- [x] TypeScript compiles

**[TASK 13-02-D COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-E: API Surface & Data Flow Analyzers

## Objective
Create analyzers for API_SURFACE.md and DATA_FLOW.md documentation.

## Requirements

### Part A: Create APISurfaceAnalyzer Class
Create `src/infrastructure/analysis/codebase/APISurfaceAnalyzer.ts`:

- [x] **APISurfaceAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns APISurfaceDoc

- [x] **documentInterfaces() Private Method**
  - [x] Find all exported interfaces
  - [x] For each interface:
    - Extract properties with types
    - Extract methods if any
    - Get JSDoc description
    - Find extends relationships
  - [x] Return InterfaceDoc[]

- [x] **documentClasses() Private Method**
  - [x] Find all exported classes
  - [x] For each class:
    - Extract constructor signature
    - Extract public properties
    - Extract public methods
    - Get extends/implements
  - [x] Return ClassDoc[]

- [x] **documentFunctions() Private Method**
  - [x] Find all exported functions
  - [x] For each function:
    - Get full signature
    - Extract parameters with types
    - Get return type
    - Get JSDoc description
  - [x] Return FunctionDoc[]

- [x] **documentTypes() Private Method**
  - [x] Find all exported type aliases
  - [x] For each type:
    - Get definition
    - Get JSDoc description
  - [x] Return TypeDoc[]

- [x] **documentIPCChannels() Private Method** (Electron-specific)
  - [x] Search for `ipcMain.handle`, `ipcRenderer.invoke`
  - [x] Extract channel names
  - [x] Infer payload types
  - [x] Return IPCChannelDoc[]

- [x] **toMarkdown(doc: APISurfaceDoc) Method**
  - [x] Generate API_SURFACE.md content

### Part B: Create DataFlowAnalyzer Class
Create `src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts`:

- [x] **DataFlowAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns DataFlowDoc

- [x] **analyzeStateManagement() Private Method**
  - [x] Find Zustand stores (look for `create` from zustand)
  - [x] For each store:
    - Extract state properties
    - Extract actions
    - Find components that subscribe
  - [x] Return StateManagementDoc

- [x] **analyzeDataStores() Private Method**
  - [x] Find database connections (SQLite)
  - [x] Find in-memory stores
  - [x] Find file-based storage
  - [x] Return DataStoreDoc[]

- [x] **analyzeEventFlows() Private Method**
  - [x] Find EventBus usage
  - [x] Find event emitters
  - [x] Trace event flow from trigger to handlers
  - [x] Generate sequence diagrams
  - [x] Return EventFlowDoc[]

- [x] **analyzeDataTransformations() Private Method**
  - [x] Find adapter files
  - [x] Find transformer functions
  - [x] Document input → output transformations
  - [x] Return DataTransformationDoc[]

- [x] **toMarkdown(doc: DataFlowDoc) Method**
  - [x] Generate DATA_FLOW.md content
  - [x] Include state diagrams, event flows

### Part C: Create Tests
Create tests for both analyzers:

- [x] `APISurfaceAnalyzer.test.ts` (~280 lines)
- [x] `DataFlowAnalyzer.test.ts` (~350 lines)

### Task 13-02-E Completion Checklist
- [x] `APISurfaceAnalyzer.ts` created (~550 lines)
- [x] `DataFlowAnalyzer.ts` created (~570 lines)
- [x] Tests created for both
- [x] All tests pass (60 tests)
- [x] TypeScript compiles

**[TASK 13-02-E COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-F: Test Strategy & Known Issues Analyzers

## Objective
Create analyzers for TEST_STRATEGY.md and KNOWN_ISSUES.md documentation.

## Requirements

### Part A: Create TestStrategyAnalyzer Class
Create `src/infrastructure/analysis/codebase/TestStrategyAnalyzer.ts`:

- [x] **TestStrategyAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns TestStrategyDoc

- [x] **detectTestFrameworks() Private Method**
  - [x] Check for:
    - Vitest (vitest.config.ts)
    - Jest (jest.config.js)
    - Playwright (playwright.config.ts)
    - Testing Library
  - [x] Return TestFramework[]

- [x] **analyzeTestTypes() Private Method**
  - [x] Count tests by pattern:
    - `*.test.ts` - Unit tests
    - `*.spec.ts` - Integration tests
    - `*.e2e.ts` or `e2e/` - E2E tests
    - `*.test.tsx` - Component tests
  - [x] Return TestTypeDoc[]

- [x] **analyzeCoverage() Private Method**
  - [x] Read coverage config if exists
  - [x] Get target coverage
  - [x] List exclusions
  - [x] Return CoverageDoc

- [x] **detectTestPatterns() Private Method**
  - [x] Analyze test files for patterns:
    - Arrange-Act-Assert
    - Given-When-Then
    - Mock patterns
    - Factory patterns for test data
  - [x] Return TestPatternDoc[]

- [x] **toMarkdown(doc: TestStrategyDoc) Method**
  - [x] Generate TEST_STRATEGY.md content

### Part B: Create KnownIssuesAnalyzer Class
Create `src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts`:

- [x] **KnownIssuesAnalyzer Class** extends BaseAnalyzer

- [x] **analyze() Method** - Returns KnownIssuesDoc

- [x] **findTechnicalDebt() Private Method**
  - [x] Search for comments:
    - `// TODO:`
    - `// FIXME:`
    - `// HACK:`
    - `// XXX:`
    - `@deprecated`
  - [x] Extract location and description
  - [x] Assess severity based on keywords
  - [x] Return TechnicalDebtItem[]

- [x] **detectLimitations() Private Method**
  - [x] Look for:
    - Skipped tests (`.skip`)
    - Disabled features
    - Platform-specific code
    - Known compatibility issues (like better-sqlite3)
  - [x] Return LimitationDoc[]

- [x] **findWorkarounds() Private Method**
  - [x] Search for workaround comments
  - [x] Look for temporary solutions
  - [x] Return WorkaroundDoc[]

- [x] **suggestImprovements() Private Method**
  - [x] Based on analysis, suggest:
    - Missing tests
    - Code duplication opportunities
    - Performance improvements
    - Refactoring candidates
  - [x] Return FutureImprovementDoc[]

- [x] **toMarkdown(doc: KnownIssuesDoc) Method**
  - [x] Generate KNOWN_ISSUES.md content

### Part C: Create Tests
Create tests for both analyzers:

- [x] `TestStrategyAnalyzer.test.ts` (~260 lines)
- [x] `KnownIssuesAnalyzer.test.ts` (~300 lines)

### Task 13-02-F Completion Checklist
- [x] `TestStrategyAnalyzer.ts` created (~360 lines)
- [x] `KnownIssuesAnalyzer.ts` created (~330 lines)
- [x] Tests created for both
- [x] All tests pass (40 new tests, 208 total in codebase module)
- [x] TypeScript compiles

**[TASK 13-02-F COMPLETE]** - Completed on 2025-01-16

---

# Task 13-02-G: CodebaseAnalyzer & Index

## Objective
Create the main CodebaseAnalyzer orchestrator and module index.

## Requirements

### Part A: Create CodebaseAnalyzer Class
Create `src/infrastructure/analysis/codebase/CodebaseAnalyzer.ts`:

- [x] **CodebaseAnalyzer Class** implementing ICodebaseAnalyzer
  - [x] Private fields: repoMapGenerator, all 6 analyzers
  - [x] Private fields: currentDocs, options

- [x] **Constructor**
  - [x] Accept optional wasmBasePath
  - [x] Instantiate RepoMapGenerator

- [x] **analyze(projectPath, options?) Method** - MAIN METHOD
  - [x] Generate RepoMap first
  - [x] Instantiate all 6 analyzers with repoMap
  - [x] Run each analyzer:
    1. ArchitectureAnalyzer → architecture
    2. PatternsAnalyzer → patterns
    3. DependenciesAnalyzer → dependencies
    4. APISurfaceAnalyzer → apiSurface
    5. DataFlowAnalyzer → dataFlow
    6. TestStrategyAnalyzer → testStrategy
    7. KnownIssuesAnalyzer → knownIssues
  - [x] Combine into CodebaseDocumentation
  - [x] Store as currentDocs
  - [x] Return documentation

- [x] **generateArchitecture() Method**
  - [x] Run only ArchitectureAnalyzer
  - [x] Return ArchitectureDoc

- [x] **saveDocs(outputDir?) Method**
  - [x] Default outputDir: `.nexus/codebase/`
  - [x] Create directory if not exists
  - [x] Generate and save all 7 markdown files:
    1. ARCHITECTURE.md
    2. PATTERNS.md
    3. DEPENDENCIES.md
    4. API_SURFACE.md
    5. DATA_FLOW.md
    6. TEST_STRATEGY.md
    7. KNOWN_ISSUES.md
  - [x] Also save combined `index.md` with links to all

- [x] **updateDocs(changedFiles) Method**
  - [x] Re-analyze only affected parts
  - [x] Update relevant documentation
  - [x] Re-save affected files

- [x] **getDocsForContext(maxTokens?) Method**
  - [x] Return condensed version of all docs
  - [x] Fit within token budget
  - [x] Prioritize architecture and patterns

- [x] **getCurrentDocs() Method**
  - [x] Return currentDocs or null

### Part B: Create Index File
Create `src/infrastructure/analysis/codebase/index.ts`:

- [x] Export all types from `./types`
- [x] Export BaseAnalyzer
- [x] Export all 6 analyzers
- [x] Export CodebaseAnalyzer
- [x] Export convenience functions:
  - [x] `analyzeCodebase(projectPath, options?)`
  - [x] `generateCodebaseDocs(projectPath, outputDir?)`
  - [x] `getCodebaseContext(projectPath, maxTokens?)` (bonus)

### Part C: Update Parent Index
Update `src/infrastructure/analysis/index.ts`:

- [x] Add export: `export * from './codebase'`

### Part D: Create Integration Test
Create `src/infrastructure/analysis/codebase/integration.test.ts`:

- [x] Test full pipeline:
  - [x] Analyze Nexus codebase
  - [x] Verify all 7 docs generated
  - [x] Verify Markdown is valid
  - [x] Verify docs are useful (contain real content)
- [x] Test saveDocs creates files
- [x] Test updateDocs with changed files

### Part E: Create README
Create `src/infrastructure/analysis/codebase/README.md`:

- [x] Document module purpose
- [x] Document usage examples
- [x] Document each analyzer's output
- [x] Document customization options

### Task 13-02-G Completion Checklist
- [x] `CodebaseAnalyzer.ts` created (~630 lines)
- [x] `index.ts` created (~170 lines)
- [x] Parent `analysis/index.ts` updated
- [x] `integration.test.ts` created (~230 lines)
- [x] `README.md` created (~150 lines)
- [x] All tests pass (232 tests)
- [x] TypeScript compiles
- [x] Can generate docs for Nexus itself

**[TASK 13-02-G COMPLETE]** - Completed on 2025-01-16

---

## Output File Structure

After completion, `src/infrastructure/analysis/codebase/` should contain:

```
src/infrastructure/analysis/codebase/
├── index.ts                          # Module exports (~50 lines)
├── types.ts                          # All type definitions (~400 lines)
├── README.md                         # Documentation (~100 lines)
├── BaseAnalyzer.ts                   # Base class (~150 lines)
├── BaseAnalyzer.test.ts              # Tests (~100 lines)
├── ArchitectureAnalyzer.ts           # Architecture docs (~300 lines)
├── ArchitectureAnalyzer.test.ts      # Tests (~100 lines)
├── PatternsAnalyzer.ts               # Patterns docs (~350 lines)
├── PatternsAnalyzer.test.ts          # Tests (~100 lines)
├── DependenciesAnalyzer.ts           # Dependencies docs (~300 lines)
├── DependenciesAnalyzer.test.ts      # Tests (~100 lines)
├── APISurfaceAnalyzer.ts             # API docs (~300 lines)
├── APISurfaceAnalyzer.test.ts        # Tests (~80 lines)
├── DataFlowAnalyzer.ts               # Data flow docs (~300 lines)
├── DataFlowAnalyzer.test.ts          # Tests (~80 lines)
├── TestStrategyAnalyzer.ts           # Test docs (~250 lines)
├── TestStrategyAnalyzer.test.ts      # Tests (~80 lines)
├── KnownIssuesAnalyzer.ts            # Issues docs (~250 lines)
├── KnownIssuesAnalyzer.test.ts       # Tests (~80 lines)
├── CodebaseAnalyzer.ts               # Main orchestrator (~300 lines)
└── integration.test.ts               # E2E tests (~100 lines)
                                      ─────────────────────────────
                                      Total: ~3,900 lines
```

Generated docs in `.nexus/codebase/`:
```
.nexus/codebase/
├── index.md                          # Links to all docs
├── ARCHITECTURE.md                   # System architecture
├── PATTERNS.md                       # Coding patterns
├── DEPENDENCIES.md                   # Dependency analysis
├── API_SURFACE.md                    # Public API docs
├── DATA_FLOW.md                      # Data flow documentation
├── TEST_STRATEGY.md                  # Testing approach
└── KNOWN_ISSUES.md                   # Tech debt & issues
```

---

## Success Criteria

- [x] All 7 tasks completed with markers checked
- [x] All files created in `src/infrastructure/analysis/codebase/`
- [x] All unit tests pass: `npm test src/infrastructure/analysis/codebase/` (232 tests)
- [x] TypeScript compiles: `npm run build`
- [x] ESLint passes for new files (CodebaseAnalyzer.ts, index.ts)
- [x] Can generate docs for Nexus:
  ```typescript
  import { generateCodebaseDocs } from './infrastructure/analysis';
  await generateCodebaseDocs('.', '.nexus/codebase');
  ```
- [x] All 7 markdown files generated in `.nexus/codebase/`
- [x] Generated docs contain meaningful content (verified in integration tests)
- [x] **Total lines: ~4,200+ (exceeds target)**

---

## Recommended Settings

```
--max-iterations 65
--completion-promise "PLAN_13_02_COMPLETE"
```

## Task Completion Markers

Complete tasks sequentially:

- [x] `[TASK 13-02-A COMPLETE]` - Types & Base Analyzer (completed 2025-01-16)
- [x] `[TASK 13-02-B COMPLETE]` - Architecture Analyzer (completed 2025-01-16)
- [x] `[TASK 13-02-C COMPLETE]` - Patterns Analyzer (completed 2025-01-16)
- [x] `[TASK 13-02-D COMPLETE]` - Dependencies Analyzer (completed 2025-01-16)
- [x] `[TASK 13-02-E COMPLETE]` - API Surface & Data Flow Analyzers (completed 2025-01-16)
- [x] `[TASK 13-02-F COMPLETE]` - Test Strategy & Known Issues Analyzers (completed 2025-01-16)
- [x] `[TASK 13-02-G COMPLETE]` - CodebaseAnalyzer & Index (completed 2025-01-16)
- [x] `[PLAN 13-02 COMPLETE]` - All tasks done (completed 2025-01-16)

---

## Notes

- Complete each task FULLY before marking complete
- This plan DEPENDS on Plan 13-01 (RepoMapGenerator)
- Reference `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` for detailed specs
- Follow existing Nexus patterns for consistency
- The analyzers infer information - they don't require perfect accuracy
- Generated docs are for agent context, not human documentation
- After completion, agents will have deep codebase understanding

## Reference Files

For existing patterns, examine:
- `src/infrastructure/analysis/` - Plan 13-01 code
- `src/infrastructure/analysis/types.ts` - Type patterns
- `src/infrastructure/analysis/RepoMapGenerator.ts` - Orchestrator pattern
- `07_NEXUS_MASTER_BOOK.md` - Layer definitions
- `05_ARCHITECTURE_BLUEPRINT.md` - Component specifications