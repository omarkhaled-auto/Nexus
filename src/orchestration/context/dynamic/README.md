# Dynamic Context Provider

> **Module:** `src/orchestration/context/dynamic/`
> **Layer:** 2 - Orchestration
> **Plan:** 13-05

## Overview

The Dynamic Context Provider enables agents to request additional code context during task execution while respecting token budgets. When an agent needs to understand more of the codebase, it can use this system to fetch specific files, find symbol definitions, or search for related code.

## Philosophy

- Agents shouldn't be limited to initial context
- Context requests should be tracked and budgeted
- Different request types (file, symbol, search) need specialized handlers
- Budget enforcement prevents runaway token consumption

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DynamicContextProvider                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Agent Registry                          │ │
│  │    agent-1 → { taskId, tokenBudget, usedTokens, ... }    │ │
│  │    agent-2 → { taskId, tokenBudget, usedTokens, ... }    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Request Handlers                         │ │
│  │  ┌──────────────┐ ┌────────────────┐ ┌────────────────┐  │ │
│  │  │ FileHandler  │ │ SymbolHandler  │ │ SearchHandler  │  │ │
│  │  │ type: 'file' │ │ type: 'symbol' │ │ type: 'search' │  │ │
│  │  │              │ │ type: 'defn'   │ │ type: 'usages' │  │ │
│  │  └──────────────┘ └────────────────┘ └────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import {
  createFullDynamicContextProvider
} from './orchestration/context/dynamic';

// Create provider with all built-in handlers
const provider = createFullDynamicContextProvider({
  projectRoot: '/path/to/project',
  defaultTokenBudget: 100000,
});

// Register an agent for a task
provider.registerAgent('agent-1', 'task-1', 50000);

// Request file content
const fileResponse = await provider.requestFile(
  'agent-1',
  'src/services/AuthService.ts',
  'Need to understand authentication flow'
);

console.log(fileResponse.content); // File contents
console.log(fileResponse.tokenCount); // Tokens used
```

### Request Types

| Type | Method | Description |
|------|--------|-------------|
| `file` | `requestFile()` | Get contents of a specific file |
| `symbol` | `requestSymbol()` | Get symbol info with context |
| `definition` | `requestDefinition()` | Find where a symbol is defined |
| `search` | `requestSearch()` | Semantic search across codebase |
| `usages` | `requestUsages()` | Find all usages of a symbol |

### Budget Management

```typescript
// Check remaining budget
const remaining = provider.getRemainingBudget('agent-1');

// Check tokens used
const used = provider.getUsedTokens('agent-1');

// Get request history
const history = provider.getRequestHistory('agent-1');
```

### Custom Handlers

```typescript
import {
  DynamicContextProvider,
  type IRequestHandler,
  type ContextRequest,
  type ContextResponse,
} from './orchestration/context/dynamic';

// Create custom handler
const customHandler: IRequestHandler = {
  canHandle: (type) => type === 'custom',
  handle: async (request) => {
    // Custom logic
    return {
      success: true,
      requestId: 'req-1',
      type: request.type,
      content: 'Custom response',
      tokenCount: 50,
      source: 'custom-handler',
    };
  },
};

// Use with provider
const provider = new DynamicContextProvider([customHandler]);
```

## Agent Tool Integration

This module provides a tool that agents can use in their function calling:

```typescript
import { createRequestContextTool } from './execution/tools/RequestContextTool';

const tool = createRequestContextTool(provider);

// Tool definition for LLM
console.log(tool.definition);
// {
//   name: 'request_context',
//   description: 'Request additional code context...',
//   parameters: { ... }
// }

// Execute tool call from agent
const result = await tool.execute('agent-1', {
  request_type: 'file',
  query: 'src/index.ts',
  reason: 'Need to see entry point',
});
```

## Configuration Options

```typescript
interface DynamicContextProviderOptions {
  /** Project root directory */
  projectRoot?: string;

  /** Default token budget per agent (default: 50000) */
  defaultTokenBudget?: number;

  /** Log all requests for debugging */
  logRequests?: boolean;
}

interface ContextRequestOptions {
  /** Maximum tokens for response (default: 10000) */
  maxTokens?: number;

  /** Include surrounding context (default: true) */
  includeContext?: boolean;

  /** Search depth for related items (default: 1) */
  depth?: number;

  /** File pattern filter (default: '**/*') */
  filePattern?: string;

  /** Maximum number of results (default: 10) */
  limit?: number;
}
```

## Error Handling

The provider throws specific errors for common issues:

```typescript
import {
  AgentNotRegisteredError,
  TokenBudgetExceededError,
  NoHandlerFoundError,
} from './orchestration/context/dynamic';

try {
  const response = await provider.requestFile('unknown-agent', 'file.ts', 'reason');
} catch (error) {
  if (error instanceof AgentNotRegisteredError) {
    // Agent must be registered first
  } else if (error instanceof TokenBudgetExceededError) {
    // Request would exceed budget
  } else if (error instanceof NoHandlerFoundError) {
    // No handler for request type
  }
}
```

## Exports

```typescript
// Main provider
export { DynamicContextProvider, createDynamicContextProvider };
export { createFullDynamicContextProvider }; // With all handlers

// Handlers
export { FileRequestHandler };
export { SymbolRequestHandler };
export { SearchRequestHandler };

// Types
export type {
  ContextRequestType,
  ContextRequest,
  ContextRequestOptions,
  ContextResponse,
  SymbolContext,
  SymbolUsage,
  SearchResults,
  SearchResultItem,
  AgentRegistration,
  IDynamicContextProvider,
  IRequestHandler,
};

// Constants
export { DEFAULT_REQUEST_OPTIONS };

// Errors
export { AgentNotRegisteredError, TokenBudgetExceededError, NoHandlerFoundError };
```

## Testing

```bash
# Run dynamic context tests
npm test src/orchestration/context/dynamic/

# Run specific handler tests
npm test src/orchestration/context/dynamic/handlers/
```

## Related Modules

- **FreshContextManager** (`./`) - Builds initial context for tasks
- **RalphStyleIterator** (`../../execution/iteration/`) - Uses this for mid-iteration context
- **RequestContextTool** (`../../execution/tools/`) - Agent-callable tool wrapper
