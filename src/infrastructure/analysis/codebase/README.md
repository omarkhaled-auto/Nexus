# Codebase Documentation Generator

Auto-generates 7 comprehensive documentation files that give agents deep understanding of codebase architecture, patterns, and conventions.

## Overview

This module provides automated codebase analysis that produces documentation optimized for AI agent consumption. Unlike traditional documentation aimed at humans, these docs capture:

- **Architectural intent** - The "why" behind code structure
- **Patterns & conventions** - How things are typically done
- **Tribal knowledge** - Implicit rules and practices

## Quick Start

```typescript
import { generateCodebaseDocs, analyzeCodebase, getCodebaseContext } from './infrastructure/analysis';

// Generate and save all docs
await generateCodebaseDocs('.', '.nexus/codebase');

// Or analyze programmatically
const docs = await analyzeCodebase('.');
console.log(docs.architecture.layers);

// Get condensed context for prompts
const context = await getCodebaseContext('.', 4000);
```

## Generated Documentation

The module generates 7 markdown files:

| File | Description |
|------|-------------|
| `ARCHITECTURE.md` | System architecture, layers, components, entry points, and design decisions |
| `PATTERNS.md` | Architectural patterns, coding patterns, naming conventions, file organization |
| `DEPENDENCIES.md` | External npm packages, internal modules, dependency graph, circular dependencies |
| `API_SURFACE.md` | Public interfaces, classes, functions, types, and IPC channels |
| `DATA_FLOW.md` | State management, data stores, event flows, data transformations |
| `TEST_STRATEGY.md` | Test frameworks, test types, coverage config, testing patterns |
| `KNOWN_ISSUES.md` | Technical debt, limitations, workarounds, future improvements |

## Usage

### Basic Usage

```typescript
import { CodebaseAnalyzer } from './infrastructure/analysis/codebase';

const analyzer = new CodebaseAnalyzer();
const docs = await analyzer.analyze('./my-project');
await analyzer.saveDocs('.nexus/codebase');
```

### Convenience Functions

```typescript
import {
  analyzeCodebase,
  generateCodebaseDocs,
  getCodebaseContext
} from './infrastructure/analysis';

// Analyze and return docs
const docs = await analyzeCodebase('.');

// Generate and save docs
await generateCodebaseDocs('.', '.nexus/codebase');

// Get condensed docs for context window
const context = await getCodebaseContext('.', 4000);
```

### Options

```typescript
const docs = await analyzeCodebase('.', {
  outputDir: '.nexus/codebase',  // Output directory for saved docs
  includePrivate: false,         // Include private members
  maxExamples: 3,                // Max examples per pattern
  generateDiagrams: true,        // Generate Mermaid diagrams
});
```

### Programmatic Access

```typescript
const analyzer = new CodebaseAnalyzer();
const docs = await analyzer.analyze('.');

// Access individual doc sections
console.log(docs.architecture.overview);
console.log(docs.architecture.layers);
console.log(docs.patterns.namingConventions);
console.log(docs.dependencies.circularDependencies);

// Generate architecture only
const arch = await analyzer.generateArchitecture();

// Get condensed context
const context = analyzer.getDocsForContext(8000);

// Update after file changes
await analyzer.updateDocs(['src/changed-file.ts']);
```

## Analyzers

The module uses 6 specialized analyzers:

| Analyzer | Output | Key Features |
|----------|--------|--------------|
| `ArchitectureAnalyzer` | `ARCHITECTURE.md` | Layer detection, component identification, design decision inference |
| `PatternsAnalyzer` | `PATTERNS.md` | Repository/Service/Factory detection, naming convention analysis |
| `DependenciesAnalyzer` | `DEPENDENCIES.md` | NPM analysis, circular dependency detection, dependency graphs |
| `APISurfaceAnalyzer` | `API_SURFACE.md` | Interface/class/function documentation, IPC channel detection |
| `DataFlowAnalyzer` | `DATA_FLOW.md` | Zustand store detection, event flow tracing |
| `TestStrategyAnalyzer` | `TEST_STRATEGY.md` | Vitest/Jest/Playwright detection, test pattern analysis |
| `KnownIssuesAnalyzer` | `KNOWN_ISSUES.md` | TODO/FIXME detection, limitation identification |

## Architecture

```
CodebaseAnalyzer (orchestrator)
├── RepoMapGenerator (from parent module)
│   └── TreeSitter parsing
│   └── Symbol extraction
│   └── Dependency graphing
│
├── ArchitectureAnalyzer
├── PatternsAnalyzer
├── DependenciesAnalyzer
├── APISurfaceAnalyzer
├── DataFlowAnalyzer
├── TestStrategyAnalyzer
└── KnownIssuesAnalyzer
```

## Integration with RepoMap

This module builds on the RepoMapGenerator from Plan 13-01:

```typescript
import { RepoMapGenerator, RepoMap } from '../types';

// CodebaseAnalyzer internally uses RepoMapGenerator
const analyzer = new CodebaseAnalyzer();
// This generates a RepoMap first, then runs analyzers
const docs = await analyzer.analyze('.');
```

## Example Output

### ARCHITECTURE.md (excerpt)

```markdown
# Architecture Documentation

## Overview

This codebase is a TypeScript/React/Electron application consisting of
150 source files containing 2,340 symbols...

## Architecture Layers

| Layer | Purpose | Key Files |
|-------|---------|-----------|
| 1. UI Layer | User interface components | src/ui/components/... |
| 2. Orchestration Layer | Workflow coordination | src/orchestration/... |
...

## Design Decisions

### Use Zustand for state management

**Rationale:** Zustand provides a simple, lightweight state management...
```

### PATTERNS.md (excerpt)

```markdown
# Patterns Documentation

## Architectural Patterns

### Repository Pattern
Files ending in `Repository`, `DB`, `Store` follow this pattern...

**Examples:**
- `src/persistence/TaskDB.ts`
- `src/persistence/SettingsRepository.ts`

## Naming Conventions

| Element | Convention | Examples |
|---------|------------|----------|
| Class | PascalCase | TaskService, UserRepository |
| Interface | I prefix | ITaskService, IUserRepository |
```

## Development

### Running Tests

```bash
npm test src/infrastructure/analysis/codebase/
```

### Building

```bash
npm run build
```

## Dependencies

- `RepoMapGenerator` - For repository mapping (Plan 13-01)
- `TreeSitter` - For code parsing
- `fs/promises` - For file operations
