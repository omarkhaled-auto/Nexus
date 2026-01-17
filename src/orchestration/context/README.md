# Fresh Context Manager

> Clean, relevant context for every agent task

**Layer:** 2 (Orchestration) - Context management subsystem
**Plan:** 13-04
**Status:** Complete

## Overview

The Fresh Context Manager ensures agents receive clean, relevant context for each task by:
- Building fresh context from scratch for each task (no accumulated garbage)
- Intelligently allocating token budgets across context components
- Integrating with Code Memory for semantic code search
- Providing context isolation between tasks and agents

## Philosophy

> "Agents work best with fresh, relevant context."

Traditional approaches accumulate conversation history that becomes stale and irrelevant.
The Fresh Context Manager takes a different approach:

1. **Always Fresh**: Context is built from scratch for each task
2. **Always Relevant**: Only include information pertinent to the current task
3. **Always Budgeted**: Respect token limits through smart allocation
4. **Always Empty History**: `conversationHistory` is always empty - no accumulated state

## Architecture

```
FreshContextManager (IFreshContextManager)
    |
    +-- TokenBudgeter (ITokenBudgeter)
    |       |
    |       +-- Create token budgets
    |       +-- Allocate across components
    |       +-- Truncate to fit
    |
    +-- ContextBuilder (IContextBuilder)
    |       |
    |       +-- Build repo map context
    |       +-- Build codebase docs context
    |       +-- Build file context
    |       +-- Build code search context (via CodeMemory)
    |       +-- Build memory context
    |
    +-- AgentContextIntegration
            |
            +-- Prepare context for agents
            +-- Clean up after task completion
            +-- Track active agent contexts
```

## Quick Start

### Basic Usage

```typescript
import { createContextSystem } from './orchestration/context';

// Create the context system
const system = createContextSystem({
  projectConfig: {
    name: 'my-project',
    path: '/path/to/project',
    language: 'typescript',
    framework: 'express',
    testFramework: 'vitest',
  },
  dependencies: {
    codeMemory,      // Optional: from Plan 13-03
    repoMapGenerator, // Optional: from Plan 13-01
    codebaseAnalyzer, // Optional: from Plan 13-02
  },
});

// Build fresh context for a task
const taskSpec = {
  id: 'task-001',
  name: 'Add user authentication',
  description: 'Implement JWT-based authentication',
  files: ['src/auth/login.ts'],
  testCriteria: 'All auth tests pass',
  acceptanceCriteria: ['Login works', 'Token validation works'],
  dependencies: ['src/users/user.ts'],
  estimatedTime: 4,
};

const context = await system.manager.buildFreshContext(taskSpec, {
  maxTokens: 100000,
  codeSearchQuery: 'authentication JWT token',
});

console.log('Context built:', context.contextId);
console.log('Token count:', context.tokenCount);
console.log('Relevant code:', context.relevantCode.length, 'chunks');
```

### Agent Integration

```typescript
const agentId = 'agent-001';

// Prepare context when agent starts task
const result = await system.integration.prepareAgentContext(agentId, taskSpec);

if (result.success) {
  // Agent has fresh context
  console.log('Context ready for agent');
}

// Clean up when task completes
await system.integration.onTaskComplete(agentId, taskSpec.id);
```

## API Reference

### FreshContextManager

Main class implementing `IFreshContextManager` interface.

```typescript
// Build fresh context for a task
buildFreshContext(task: TaskSpec, options?: ContextOptions): Promise<TaskContext>

// Clear context for a specific agent
clearAgentContext(agentId: string): Promise<void>

// Clear context for a specific task
clearTaskContext(taskId: string): Promise<void>

// Validate a context object
validateContext(context: TaskContext): ContextValidation

// Estimate token count for text
estimateTokenCount(text: string): number

// Get active contexts (for debugging)
getActiveContexts(): Map<string, TaskContext>

// Get context statistics
getContextStats(): ContextStats
```

### TaskContext

The complete context returned for a task:

```typescript
interface TaskContext {
  // Structural (same every task)
  repoMap: string;
  codebaseDocs: CodebaseDocsSummary;
  projectConfig: ContextProjectConfig;

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

### ContextOptions

Options for building context:

```typescript
interface ContextOptions {
  maxTokens?: number;          // Total token budget (default: 150000)
  includeRepoMap?: boolean;    // Include repo structure (default: true)
  includeCodebaseDocs?: boolean; // Include codebase docs (default: true)
  maxRelevantFiles?: number;   // Max files to include (default: 10)
  maxCodeResults?: number;     // Max code search results (default: 5)
  maxMemories?: number;        // Max memory entries (default: 5)
  codeSearchQuery?: string;    // Query for code search
}
```

## Token Budget System

The TokenBudgeter intelligently allocates tokens across components:

### Default Budget Allocation

```
Total Budget (e.g., 150,000 tokens)
    |
    +-- Fixed Allocations (24,000 tokens)
    |       |
    |       +-- System Prompt: 2,000 tokens
    |       +-- Repo Map: 2,000 tokens
    |       +-- Codebase Docs: 3,000 tokens
    |       +-- Task Spec: 1,000 tokens
    |       +-- Reserved (for response): 16,000 tokens
    |
    +-- Dynamic Allocations (126,000 tokens)
            |
            +-- Files: 60% (75,600 tokens)
            +-- Code Results: 25% (31,500 tokens)
            +-- Memories: 15% (18,900 tokens)
```

### Custom Budget

```typescript
const system = createContextSystem({
  projectConfig,
  customBudget: {
    systemPrompt: 3000,
    repoMap: 5000,
    codebaseDocs: 4000,
    taskSpec: 2000,
    reserved: 20000,
  },
});
```

### Token Estimation

Tokens are estimated using a conservative 4 characters per token ratio:

```typescript
const budgeter = new TokenBudgeter();
const tokens = budgeter.estimateTokens('Hello, world!'); // ~4 tokens
```

## Context Validation

Validate context before use:

```typescript
const validation = system.manager.validateContext(context);

console.log('Valid:', validation.valid);
console.log('Token count:', validation.tokenCount);
console.log('Max tokens:', validation.maxTokens);

// Token breakdown
console.log('Breakdown:', validation.breakdown);
// {
//   systemPrompt: 2000,
//   repoMap: 1500,
//   codebaseDocs: 2500,
//   taskSpec: 800,
//   files: 50000,
//   codeResults: 10000,
//   memories: 5000,
//   reserved: 16000,
//   total: 87800,
// }

// Warnings and suggestions
validation.warnings.forEach(w => console.warn(w));
validation.suggestions.forEach(s => console.log(s));
```

## Integration Points

### With Code Memory (Plan 13-03)

```typescript
import { createCodeMemorySystem } from './persistence/memory/code';
import { createContextSystem } from './orchestration/context';

const codeMemory = createCodeMemorySystem({ db, embeddings });
await codeMemory.codeMemory.indexProject('./src');

const contextSystem = createContextSystem({
  projectConfig,
  dependencies: {
    codeMemory: codeMemory.codeMemory,
  },
});

// Code search results included in context
const context = await contextSystem.manager.buildFreshContext(task, {
  codeSearchQuery: task.description,
});
```

### With RepoMapGenerator (Plan 13-01)

```typescript
import { RepoMapGenerator } from './infrastructure/analysis';

const repoMapGenerator = new RepoMapGenerator();

const contextSystem = createContextSystem({
  projectConfig,
  dependencies: {
    repoMapGenerator,
  },
});

// Repo map included in context
const context = await contextSystem.manager.buildFreshContext(task);
console.log('Repo map:', context.repoMap);
```

### With CodebaseAnalyzer (Plan 13-02)

```typescript
import { CodebaseAnalyzer } from './infrastructure/analysis/codebase';

const codebaseAnalyzer = new CodebaseAnalyzer();

const contextSystem = createContextSystem({
  projectConfig,
  dependencies: {
    codebaseAnalyzer,
  },
});

// Codebase docs included in context
const context = await contextSystem.manager.buildFreshContext(task);
console.log('Docs:', context.codebaseDocs);
```

### With AgentPool (Orchestration)

```typescript
// In AgentPool or task coordinator:
const integration = system.integration;

// Before assigning task to agent
const result = await integration.prepareAgentContext(agentId, taskSpec);

// After task completes
await integration.onTaskComplete(agentId, taskSpec.id);

// After task fails
await integration.onTaskFailed(agentId, taskSpec.id);
```

## Testing

Run tests with:

```bash
npm test src/orchestration/context/
```

Test files:
- `TokenBudgeter.test.ts` - Token allocation tests (36 tests)
- `FreshContextManager.test.ts` - Context building tests (43 tests)
- `ContextBuilder.test.ts` - Component building tests (31 tests)
- `integration.test.ts` - Integration tests (26 tests)

## Configuration

### ContextBuilderOptions

```typescript
interface ContextBuilderOptions {
  projectPath?: string;         // Default project path
  minCodeRelevance?: number;    // Min score for code (default: 0.5)
  minMemoryRelevance?: number;  // Min score for memories (default: 0.4)
  maxFileSizeChars?: number;    // Max file size to include (default: 100000)
}
```

### ContextSystemConfig

```typescript
interface ContextSystemConfig {
  projectConfig: ContextProjectConfig;
  dependencies?: {
    repoMapGenerator?: RepoMapGenerator | null;
    codebaseAnalyzer?: CodebaseAnalyzer | null;
    codeMemory?: ICodeMemory | null;
    memorySystem?: IMemorySystem | null;
  };
  builderOptions?: ContextBuilderOptions;
  customBudget?: {
    systemPrompt?: number;
    repoMap?: number;
    codebaseDocs?: number;
    taskSpec?: number;
    reserved?: number;
  };
}
```

## Error Handling

The module gracefully handles missing dependencies:

```typescript
// No CodeMemory - code search returns empty
const context = await manager.buildFreshContext(task);
console.log(context.relevantCode); // []

// No RepoMapGenerator - fallback repo map provided
console.log(context.repoMap); // Basic structure info

// No CodebaseAnalyzer - minimal docs
console.log(context.codebaseDocs); // { architectureSummary: '...', ... }
```

## Module Exports

```typescript
// Types
export type {
  TaskSpec,
  TaskContext,
  FileContent,
  CodebaseDocsSummary,
  ContextProjectConfig,
  MemoryEntry,
  ContextOptions,
  TokenBudget,
  TokenBreakdown,
  ContextValidation,
  IFreshContextManager,
  ITokenBudgeter,
  IContextBuilder,
};

// Classes
export {
  TokenBudgeter,
  FreshContextManager,
  ContextBuilder,
  AgentContextIntegration,
};

// Factory Functions
export {
  createContextSystem,
  createTestContextSystem,
  createFreshContextManager,
  createContextBuilder,
};
```

## Best Practices

1. **Always Use Fresh Context**: Don't reuse context objects across tasks
2. **Set Appropriate Token Budget**: Balance detail vs. cost
3. **Use Code Search Query**: Provide meaningful queries for relevant results
4. **Clean Up After Tasks**: Call `onTaskComplete` or `onTaskFailed`
5. **Validate Before Use**: Check `validateContext` for warnings
6. **Monitor Token Usage**: Use `getContextStats` to track usage patterns
