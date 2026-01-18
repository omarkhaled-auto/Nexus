# Plans 13-05 & 13-06: Dynamic Context Provider + Ralph-Style Iterator

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plans:** 13-05 (Dynamic Context Provider) + 13-06 (Ralph-Style Iterator)
- **Purpose:** Enable agents to request additional context mid-task and implement persistent git-based iteration loops
- **Input:**
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` (Plans 13-05 and 13-06 sections)
  - `src/orchestration/context/` (FreshContextManager from Plan 13-04)
  - `src/persistence/memory/code/` (CodeMemory from Plan 13-03)
  - `src/infrastructure/analysis/` (RepoMapGenerator from Plan 13-01)
  - `07_NEXUS_MASTER_BOOK.md` (architecture reference)
- **Output:**
  - `src/orchestration/context/dynamic/` - Dynamic Context Provider module
  - `src/execution/iteration/` - Ralph-Style Iterator module
- **Philosophy:** Agents should be able to request more context when needed, and iterate persistently on tasks using git diffs to see their previous work.

## Pre-Requisites
- [x] Verify Plan 13-04 complete: `src/orchestration/context/` exists with FreshContextManager
- [x] Verify Plan 13-03 complete: `src/persistence/memory/code/` exists with CodeMemory
- [x] Verify Plan 13-01 complete: `src/infrastructure/analysis/` exists with RepoMapGenerator
- [ ] Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Plans 13-05 and 13-06 sections
- [x] Review existing `src/execution/` for execution layer patterns
- [x] Check for existing GitService in the codebase (found at src/infrastructure/git/GitService.ts)

## Dependencies on Previous Plans

This combined plan uses:
```typescript
// From Plan 13-01
import { RepoMapGenerator, SymbolEntry } from '../infrastructure/analysis';

// From Plan 13-03
import { CodeMemory, CodeSearchResult } from '../persistence/memory/code';

// From Plan 13-04
import { 
  FreshContextManager, 
  TaskContext, 
  FileContent 
} from '../orchestration/context';
```

---

## Task Structure Overview

This combined plan has **14 tasks** in 4 parts:

```
PART 1: DYNAMIC CONTEXT PROVIDER (Plan 13-05)
=============================================
Task 1: Types & Interfaces --------------> [COMPLETE]
Task 2: DynamicContextProvider Core -----> [COMPLETE]
Task 3: File Request Handler ------------> [COMPLETE]
Task 4: Symbol Request Handler ----------> [COMPLETE]
Task 5: Search Request Handler ----------> [COMPLETE]
Task 6: Agent Tool Integration ----------> [COMPLETE]

PART 2: RALPH-STYLE ITERATOR (Plan 13-06)
=========================================
Task 7: Iterator Types & Interfaces -----> [COMPLETE]
Task 8: RalphStyleIterator Core ---------> [COMPLETE]
Task 9: Git Diff Context Builder --------> [COMPLETE]
Task 10: Error Context Aggregator -------> [COMPLETE]
Task 11: Iteration Commit Handler -------> [PENDING]
Task 12: Escalation Handler -------------> [PENDING]

PART 3: INTEGRATION
===================
Task 13: Cross-Module Integration -------> [PENDING]

PART 4: FINAL VERIFICATION
==========================
Task 14: Lint & Quality Check -----------> [PENDING]
```

---

# ============================================================================
# PART 1: DYNAMIC CONTEXT PROVIDER (Plan 13-05)
# ============================================================================

# Task 1: Types & Interfaces

## Objective
Define all TypeScript interfaces and types for the Dynamic Context Provider system.

## Requirements

### Part A: Create Directory Structure
- [ ] Create directory: `src/orchestration/context/dynamic/`
- [ ] This module extends the existing context module from Plan 13-04

### Part B: Create Types File
Create `src/orchestration/context/dynamic/types.ts`:

- [ ] **ContextRequestType Type**
  ```typescript
  type ContextRequestType = 'file' | 'symbol' | 'search' | 'usages' | 'definition';
  ```

- [ ] **ContextRequest Interface**
  ```typescript
  interface ContextRequest {
    type: ContextRequestType;
    query: string;
    agentId: string;
    taskId: string;
    reason: string;
    options?: ContextRequestOptions;
    timestamp: Date;
  }
  ```

- [ ] **ContextRequestOptions Interface**
  ```typescript
  interface ContextRequestOptions {
    maxTokens?: number;
    includeContext?: boolean;
    depth?: number;
    filePattern?: string;
    limit?: number;
  }
  ```

- [ ] **DEFAULT_REQUEST_OPTIONS Constant**
  ```typescript
  const DEFAULT_REQUEST_OPTIONS: Required<ContextRequestOptions> = {
    maxTokens: 10000,
    includeContext: true,
    depth: 1,
    filePattern: '**/*',
    limit: 10,
  };
  ```

- [ ] **ContextResponse Interface**
  ```typescript
  interface ContextResponse {
    success: boolean;
    requestId: string;
    type: ContextRequestType;
    content: string;
    tokenCount: number;
    source: string;
    metadata?: Record<string, unknown>;
    error?: string;
  }
  ```

- [ ] **SymbolContext Interface**
  ```typescript
  interface SymbolContext {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method';
    file: string;
    line: number;
    column: number;
    signature: string;
    documentation?: string;
    usages: SymbolUsage[];
    relatedSymbols: string[];
  }
  ```

- [ ] **SymbolUsage Interface**
  ```typescript
  interface SymbolUsage {
    file: string;
    line: number;
    column: number;
    context: string;
    usageType: 'call' | 'import' | 'reference' | 'assignment' | 'type_reference';
  }
  ```

- [ ] **SearchResults Interface**
  ```typescript
  interface SearchResults {
    query: string;
    results: SearchResultItem[];
    totalMatches: number;
    truncated: boolean;
    tokenCount: number;
  }
  ```

- [ ] **SearchResultItem Interface**
  ```typescript
  interface SearchResultItem {
    file: string;
    startLine: number;
    endLine: number;
    content: string;
    score: number;
    highlights?: string[];
  }
  ```

- [ ] **AgentRegistration Interface**
  ```typescript
  interface AgentRegistration {
    agentId: string;
    taskId: string;
    tokenBudget: number;
    usedTokens: number;
    requests: ContextRequest[];
    registeredAt: Date;
  }
  ```

- [ ] **IDynamicContextProvider Interface**
  ```typescript
  interface IDynamicContextProvider {
    // Registration
    registerAgent(agentId: string, taskId: string, tokenBudget?: number): void;
    unregisterAgent(agentId: string): void;
    
    // Context requests
    requestFile(agentId: string, filePath: string, reason: string): Promise<ContextResponse>;
    requestSymbol(agentId: string, symbolName: string, reason: string): Promise<ContextResponse>;
    requestSearch(agentId: string, query: string, reason: string): Promise<ContextResponse>;
    requestUsages(agentId: string, symbolName: string, reason: string): Promise<ContextResponse>;
    requestDefinition(agentId: string, symbolName: string, reason: string): Promise<ContextResponse>;
    
    // Batch requests
    requestFiles(agentId: string, filePaths: string[], reason: string): Promise<ContextResponse[]>;
    request(agentId: string, request: Omit<ContextRequest, 'agentId' | 'taskId' | 'timestamp'>): Promise<ContextResponse>;
    
    // Budget tracking
    getRemainingBudget(agentId: string): number;
    getUsedTokens(agentId: string): number;
    getRequestHistory(agentId: string): ContextRequest[];
  }
  ```

- [ ] **IRequestHandler Interface**
  ```typescript
  interface IRequestHandler {
    canHandle(type: ContextRequestType): boolean;
    handle(request: ContextRequest): Promise<ContextResponse>;
  }
  ```

- [ ] Export all types

### Task 1 Completion Checklist
- [x] Directory `src/orchestration/context/dynamic/` created
- [x] `types.ts` created with all interfaces (~300 lines - comprehensive)
- [x] All types properly exported
- [x] TypeScript compiles (no new errors introduced)

**[TASK 1 COMPLETE]** - Types and interfaces created, proceeding to Task 2

---

# Task 2: DynamicContextProvider Core

## Objective
Implement the main DynamicContextProvider class that manages agent context requests.

## Requirements

### Part A: Create DynamicContextProvider Class
Create `src/orchestration/context/dynamic/DynamicContextProvider.ts`:

- [ ] **DynamicContextProvider Class** implementing IDynamicContextProvider

- [ ] **Constructor**
  - [ ] Accept array of IRequestHandler implementations
  - [ ] Accept optional default token budget (default: 50000)
  - [ ] Initialize agent registry Map
  - [ ] Initialize request counter for IDs

- [ ] **registerAgent(agentId, taskId, tokenBudget?) Method**
  - [ ] Create AgentRegistration record
  - [ ] Store in registry
  - [ ] Log registration

- [ ] **unregisterAgent(agentId) Method**
  - [ ] Remove from registry
  - [ ] Log unregistration with stats (requests made, tokens used)

- [ ] **requestFile(agentId, filePath, reason) Method**
  - [ ] Validate agent is registered
  - [ ] Check budget
  - [ ] Create ContextRequest
  - [ ] Route to appropriate handler
  - [ ] Track tokens used
  - [ ] Return ContextResponse

- [ ] **requestSymbol(agentId, symbolName, reason) Method**
  - [ ] Same pattern as requestFile
  - [ ] Route to symbol handler

- [ ] **requestSearch(agentId, query, reason) Method**
  - [ ] Same pattern
  - [ ] Route to search handler

- [ ] **requestUsages(agentId, symbolName, reason) Method**
  - [ ] Same pattern
  - [ ] Route to usages handler

- [ ] **requestDefinition(agentId, symbolName, reason) Method**
  - [ ] Same pattern
  - [ ] Route to definition handler

- [ ] **requestFiles(agentId, filePaths[], reason) Method**
  - [ ] Batch request for multiple files
  - [ ] Check combined budget
  - [ ] Return array of responses

- [ ] **request(agentId, request) Method** - Generic request method
  - [ ] Validate agent
  - [ ] Check budget
  - [ ] Find handler for request type
  - [ ] Execute and track
  - [ ] Return response

- [ ] **getRemainingBudget(agentId) Method**
  - [ ] Return tokenBudget - usedTokens
  - [ ] Return 0 if not registered

- [ ] **getUsedTokens(agentId) Method**
  - [ ] Return usedTokens from registration
  - [ ] Return 0 if not registered

- [ ] **getRequestHistory(agentId) Method**
  - [ ] Return requests array from registration
  - [ ] Return empty array if not registered

**Private Helper Methods:**
- [ ] **validateAgent(agentId) Private Method**
  - [ ] Check agent is registered
  - [ ] Throw error if not

- [ ] **checkBudget(agentId, estimatedTokens) Private Method**
  - [ ] Check if request would exceed budget
  - [ ] Return boolean

- [ ] **findHandler(type) Private Method**
  - [ ] Find handler that can handle request type
  - [ ] Throw if no handler found

- [ ] **trackRequest(agentId, request, response) Private Method**
  - [ ] Add request to history
  - [ ] Update usedTokens

- [ ] **generateRequestId() Private Method**
  - [ ] Generate unique request ID

### Part B: Create Tests
Create `src/orchestration/context/dynamic/DynamicContextProvider.test.ts`:

- [ ] Test agent registration
- [ ] Test agent unregistration
- [ ] Test request routing
- [ ] Test budget tracking
- [ ] Test budget enforcement
- [ ] Test request history
- [ ] Test unregistered agent handling

### Task 2 Completion Checklist
- [x] `DynamicContextProvider.ts` created (~300 lines) - 440 lines total
- [x] `DynamicContextProvider.test.ts` created (~200 lines) - 340 lines total
- [x] All tests pass (32/32 tests)
- [x] TypeScript compiles (no errors in our files)

**[TASK 2 COMPLETE]** - Proceeding to Task 3

---

# Task 3: File Request Handler

## Objective
Implement handler for file content requests.

## Requirements

### Part A: Create Handlers Directory
- [ ] Create directory: `src/orchestration/context/dynamic/handlers/`

### Part B: Create FileRequestHandler Class
Create `src/orchestration/context/dynamic/handlers/FileRequestHandler.ts`:

- [ ] **FileRequestHandler Class** implementing IRequestHandler

- [ ] **Constructor**
  - [ ] Accept FileSystemService or similar for file access
  - [ ] Accept project root path

- [ ] **canHandle(type) Method**
  - [ ] Return true for 'file' type

- [ ] **handle(request) Method**
  - [ ] Extract file path from request.query
  - [ ] Resolve path relative to project root
  - [ ] Check file exists
  - [ ] Read file content
  - [ ] Truncate if exceeds maxTokens
  - [ ] Return ContextResponse with content

- [ ] **resolveFilePath(query) Private Method**
  - [ ] Handle relative and absolute paths
  - [ ] Normalize path separators
  - [ ] Validate path is within project

- [ ] **readFileContent(filePath) Private Method**
  - [ ] Read file as UTF-8
  - [ ] Handle read errors

- [ ] **truncateContent(content, maxTokens) Private Method**
  - [ ] Estimate tokens
  - [ ] Truncate at line boundary if over
  - [ ] Add truncation indicator

- [ ] **estimateTokens(content) Private Method**
  - [ ] Return Math.ceil(content.length / 4)

### Part C: Create Tests
Create `src/orchestration/context/dynamic/handlers/FileRequestHandler.test.ts`:

- [ ] Test file reading
- [ ] Test path resolution
- [ ] Test non-existent file handling
- [ ] Test truncation
- [ ] Test path validation (security)

### Task 3 Completion Checklist
- [x] `handlers/` directory created
- [x] `FileRequestHandler.ts` created (~280 lines)
- [x] `FileRequestHandler.test.ts` created (~250 lines)
- [x] All tests pass (18 tests)
- [x] TypeScript compiles (no new errors)

**[TASK 3 COMPLETE]** - FileRequestHandler implemented with 18 passing tests, proceeding to Task 4

---

# Task 4: Symbol Request Handler

## Objective
Implement handler for symbol definition and context requests.

## Requirements

### Part A: Create SymbolRequestHandler Class
Create `src/orchestration/context/dynamic/handlers/SymbolRequestHandler.ts`:

- [x] **SymbolRequestHandler Class** implementing IRequestHandler

- [x] **Constructor**
  - [x] Accept RepoMapGenerator from Plan 13-01
  - [x] Accept CodeMemory from Plan 13-03 (optional, for enhanced search)

- [x] **canHandle(type) Method**
  - [x] Return true for 'symbol' and 'definition' types

- [x] **handle(request) Method**
  - [x] Extract symbol name from request.query
  - [x] Use RepoMapGenerator.findSymbol()
  - [x] Get symbol definition
  - [x] Optionally get usages if includeContext
  - [x] Format as SymbolContext
  - [x] Return ContextResponse

- [x] **findSymbolDefinition(symbolName) Private Method**
  - [x] Search repo map for symbol
  - [x] Return first match or null
  - [x] Handle ambiguous names

- [x] **getSymbolContext(symbol) Private Method**
  - [x] Read file at symbol location
  - [x] Extract surrounding code
  - [x] Get documentation if available

- [x] **getSymbolUsages(symbolName, limit) Private Method**
  - [x] Use RepoMapGenerator.findUsages()
  - [x] Limit results
  - [x] Format as SymbolUsage[]

- [x] **formatSymbolResponse(symbolContext) Private Method**
  - [x] Format for agent consumption
  - [x] Include signature, documentation, usages

### Part B: Create Tests
Create `src/orchestration/context/dynamic/handlers/SymbolRequestHandler.test.ts`:

- [x] Test symbol finding
- [x] Test definition retrieval
- [x] Test usage finding
- [x] Test ambiguous symbol handling
- [x] Test not found handling

### Task 4 Completion Checklist
- [x] `SymbolRequestHandler.ts` created (~433 lines)
- [x] `SymbolRequestHandler.test.ts` created (~340 lines)
- [x] All tests pass (28 tests)
- [x] TypeScript compiles

**[TASK 4 COMPLETE]** ✅ Completed on 2025-01-18

---

# Task 5: Search Request Handler

## Objective
Implement handler for semantic code search requests.

## Requirements

### Part A: Create SearchRequestHandler Class
Create `src/orchestration/context/dynamic/handlers/SearchRequestHandler.ts`:

- [ ] **SearchRequestHandler Class** implementing IRequestHandler

- [ ] **Constructor**
  - [ ] Accept CodeMemory from Plan 13-03

- [ ] **canHandle(type) Method**
  - [ ] Return true for 'search' and 'usages' types

- [ ] **handle(request) Method**
  - [ ] Extract query from request.query
  - [ ] Use CodeMemory.searchCode() for 'search'
  - [ ] Use CodeMemory.findUsages() for 'usages'
  - [ ] Apply limit and filter options
  - [ ] Format as SearchResults
  - [ ] Return ContextResponse

- [ ] **searchCode(query, options) Private Method**
  - [ ] Call CodeMemory.searchCode
  - [ ] Map results to SearchResultItem
  - [ ] Calculate total token count

- [ ] **findUsages(symbolName, options) Private Method**
  - [ ] Call CodeMemory.findUsages
  - [ ] Format as SearchResults

- [ ] **formatSearchResults(results, query) Private Method**
  - [ ] Create SearchResults object
  - [ ] Track if truncated
  - [ ] Calculate token count

- [ ] **truncateResults(results, maxTokens) Private Method**
  - [ ] Keep results until token limit
  - [ ] Mark as truncated

### Part B: Create Tests
Create `src/orchestration/context/dynamic/handlers/SearchRequestHandler.test.ts`:

- [ ] Test semantic search
- [ ] Test usage finding
- [ ] Test result limiting
- [ ] Test truncation
- [ ] Test empty results

### Task 5 Completion Checklist
- [x] `SearchRequestHandler.ts` created (~410 lines - comprehensive implementation)
- [x] `SearchRequestHandler.test.ts` created (~400 lines - 21 comprehensive tests)
- [x] All tests pass (99 total tests in dynamic context module)
- [x] TypeScript compiles (no new errors introduced)

**[TASK 5 COMPLETE]** - SearchRequestHandler implemented with semantic search and usage finding

---

# Task 6: Agent Tool Integration

## Objective
Create the tool definition that agents can use to request context.

## Requirements

### Part A: Create Tool Directory (if not exists)
- [ ] Create or use: `src/execution/tools/`

### Part B: Create RequestContextTool
Create `src/execution/tools/RequestContextTool.ts`:

- [ ] **REQUEST_CONTEXT_TOOL_DEFINITION Constant**
  ```typescript
  const REQUEST_CONTEXT_TOOL_DEFINITION = {
    name: 'request_context',
    description: 'Request additional code context when you need to understand more of the codebase. Use this when you need to see file contents, find symbol definitions, or search for related code.',
    parameters: {
      type: 'object',
      properties: {
        request_type: {
          type: 'string',
          enum: ['file', 'symbol', 'search', 'usages', 'definition'],
          description: 'Type of context to request: file (get file contents), symbol (find symbol info), search (semantic code search), usages (find where symbol is used), definition (find where symbol is defined)'
        },
        query: {
          type: 'string',
          description: 'The file path, symbol name, or search query depending on request_type'
        },
        reason: {
          type: 'string',
          description: 'Brief explanation of why you need this context'
        },
        options: {
          type: 'object',
          properties: {
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens for the response (default: 10000)'
            },
            include_context: {
              type: 'boolean',
              description: 'Include surrounding code context (default: true)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results for search/usages (default: 10)'
            }
          }
        }
      },
      required: ['request_type', 'query', 'reason']
    }
  };
  ```

- [ ] **RequestContextToolHandler Class**
  - [ ] Constructor accepts DynamicContextProvider
  - [ ] execute(agentId, params) method
  - [ ] Validates parameters
  - [ ] Routes to DynamicContextProvider
  - [ ] Formats response for agent

- [ ] **createRequestContextTool(provider) Factory Function**
  - [ ] Creates handler with provider
  - [ ] Returns tool definition + handler

### Part C: Create Index File
Create `src/orchestration/context/dynamic/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export DynamicContextProvider
- [ ] Export all handlers
- [ ] Export factory: `createDynamicContextProvider()`

### Part D: Create Tests
Create `src/execution/tools/RequestContextTool.test.ts`:

- [ ] Test tool definition structure
- [ ] Test parameter validation
- [ ] Test execution routing
- [ ] Test response formatting

### Task 6 Completion Checklist
- [x] `RequestContextTool.ts` created (~350 lines - comprehensive with validation)
- [x] `RequestContextTool.test.ts` created (~400 lines - 38 tests)
- [x] `index.ts` created (~130 lines - includes createFullDynamicContextProvider)
- [x] All tests pass (38 + 99 = 137 tests)
- [x] TypeScript compiles

**[TASK 6 COMPLETE]** ✅ Completed on 2025-01-18

---

# ============================================================================
# PART 2: RALPH-STYLE ITERATOR (Plan 13-06)
# ============================================================================

# Task 7: Iterator Types & Interfaces

## Objective
Define all TypeScript interfaces for the Ralph-Style Iterator system.

## Requirements

### Part A: Create Directory Structure
- [ ] Create directory: `src/execution/iteration/`
- [ ] This module lives in Layer 4 (Execution)

### Part B: Create Types File
Create `src/execution/iteration/types.ts`:

- [ ] **IterationState Type**
  ```typescript
  type IterationState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'escalated' | 'aborted';
  ```

- [ ] **IterationPhase Type**
  ```typescript
  type IterationPhase = 'initializing' | 'coding' | 'building' | 'linting' | 'testing' | 'reviewing' | 'committing' | 'finalizing';
  ```

- [ ] **IterationOptions Interface**
  ```typescript
  interface IterationOptions {
    maxIterations?: number;
    commitEachIteration?: boolean;
    includeGitDiff?: boolean;
    includePreviousErrors?: boolean;
    escalateAfter?: number;
    timeoutMinutes?: number;
  }
  ```

- [ ] **DEFAULT_ITERATION_OPTIONS Constant**
  ```typescript
  const DEFAULT_ITERATION_OPTIONS: Required<IterationOptions> = {
    maxIterations: 20,
    commitEachIteration: true,
    includeGitDiff: true,
    includePreviousErrors: true,
    escalateAfter: 20,
    timeoutMinutes: 60,
  };
  ```

- [ ] **IterationResult Interface**
  ```typescript
  interface IterationResult {
    success: boolean;
    taskId: string;
    iterations: number;
    finalState: IterationState;
    history: IterationHistoryEntry[];
    totalDuration: number;
    totalTokens: number;
    finalCommit?: string;
    escalationReport?: EscalationReport;
  }
  ```

- [ ] **IterationHistoryEntry Interface**
  ```typescript
  interface IterationHistoryEntry {
    iteration: number;
    phase: IterationPhase;
    action: string;
    changes: GitChange[];
    buildResult?: BuildResult;
    lintResult?: LintResult;
    testResult?: TestResult;
    reviewResult?: ReviewResult;
    errors: ErrorEntry[];
    duration: number;
    tokens: number;
    timestamp: Date;
    commitHash?: string;
  }
  ```

- [ ] **IterationStatus Interface**
  ```typescript
  interface IterationStatus {
    taskId: string;
    currentIteration: number;
    maxIterations: number;
    state: IterationState;
    phase: IterationPhase;
    lastActivity: Date;
    startedAt: Date;
    elapsedTime: number;
  }
  ```

- [ ] **IterationContext Interface**
  ```typescript
  interface IterationContext {
    task: Task;
    iteration: number;
    options: Required<IterationOptions>;
    
    // Git context
    previousDiff?: GitDiff;
    cumulativeDiff?: GitDiff;
    
    // Error context
    previousErrors: ErrorEntry[];
    
    // Results from previous iteration
    lastBuildResult?: BuildResult;
    lastLintResult?: LintResult;
    lastTestResult?: TestResult;
    lastReviewFeedback?: string[];
    
    // Fresh task context
    taskContext: TaskContext;
  }
  ```

- [ ] **GitChange Interface**
  ```typescript
  interface GitChange {
    file: string;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
  }
  ```

- [ ] **GitDiff Interface**
  ```typescript
  interface GitDiff {
    fromCommit: string;
    toCommit: string;
    changes: GitChange[];
    diffText: string;
    stats: {
      filesChanged: number;
      additions: number;
      deletions: number;
    };
  }
  ```

- [ ] **ErrorEntry Interface**
  ```typescript
  interface ErrorEntry {
    type: 'build' | 'lint' | 'test' | 'review' | 'runtime';
    severity: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
    column?: number;
    code?: string;
    suggestion?: string;
    iteration: number;
  }
  ```

- [ ] **BuildResult, LintResult, TestResult, ReviewResult Interfaces**
  ```typescript
  interface BuildResult {
    success: boolean;
    errors: ErrorEntry[];
    warnings: ErrorEntry[];
    duration: number;
  }

  interface LintResult {
    success: boolean;
    errors: ErrorEntry[];
    warnings: ErrorEntry[];
    fixable: number;
  }

  interface TestResult {
    success: boolean;
    passed: number;
    failed: number;
    skipped: number;
    errors: ErrorEntry[];
    duration: number;
  }

  interface ReviewResult {
    approved: boolean;
    comments: string[];
    suggestions: string[];
    blockers: string[];
  }
  ```

- [ ] **EscalationReport Interface**
  ```typescript
  interface EscalationReport {
    taskId: string;
    reason: EscalationReason;
    iterationsCompleted: number;
    summary: string;
    lastErrors: ErrorEntry[];
    suggestedActions: string[];
    checkpointCommit: string;
    createdAt: Date;
  }
  ```

- [ ] **EscalationReason Type**
  ```typescript
  type EscalationReason = 'max_iterations' | 'timeout' | 'repeated_failures' | 'blocking_error' | 'agent_request';
  ```

- [ ] **IRalphStyleIterator Interface**
  ```typescript
  interface IRalphStyleIterator {
    execute(task: Task, options?: IterationOptions): Promise<IterationResult>;
    pause(taskId: string): Promise<void>;
    resume(taskId: string): Promise<void>;
    abort(taskId: string): Promise<void>;
    getStatus(taskId: string): IterationStatus | null;
    getHistory(taskId: string): IterationHistoryEntry[];
  }
  ```

- [ ] **IGitDiffContextBuilder Interface**
  ```typescript
  interface IGitDiffContextBuilder {
    buildDiffContext(fromCommit: string, toCommit?: string): Promise<GitDiff>;
    buildCumulativeDiff(baseCommit: string): Promise<GitDiff>;
    formatDiffForAgent(diff: GitDiff): string;
  }
  ```

- [ ] **IErrorContextAggregator Interface**
  ```typescript
  interface IErrorContextAggregator {
    addErrors(errors: ErrorEntry[]): void;
    getUniqueErrors(): ErrorEntry[];
    getErrorsByType(type: ErrorEntry['type']): ErrorEntry[];
    formatErrorsForAgent(): string;
    clear(): void;
  }
  ```

- [ ] **IIterationCommitHandler Interface**
  ```typescript
  interface IIterationCommitHandler {
    commitIteration(taskId: string, iteration: number, message: string): Promise<string>;
    rollbackToIteration(taskId: string, iteration: number): Promise<void>;
    getIterationCommit(taskId: string, iteration: number): string | null;
  }
  ```

- [ ] **IEscalationHandler Interface**
  ```typescript
  interface IEscalationHandler {
    escalate(taskId: string, reason: EscalationReason, context: IterationContext): Promise<EscalationReport>;
    createCheckpoint(taskId: string): Promise<string>;
    notifyHuman(report: EscalationReport): Promise<void>;
  }
  ```

- [x] Export all types

### Task 7 Completion Checklist
- [x] Directory `src/execution/iteration/` created
- [x] `types.ts` created with all interfaces (~470 lines - comprehensive implementation)
- [x] All types properly exported
- [x] TypeScript compiles (no new errors introduced)

**[TASK 7 COMPLETE]** ✅ Completed on 2025-01-18 - Proceeding to Task 8

---

# Task 8: RalphStyleIterator Core

## Objective
Implement the main RalphStyleIterator class with the iteration state machine.

## Requirements

### Part A: Create RalphStyleIterator Class
Create `src/execution/iteration/RalphStyleIterator.ts`:

- [ ] **RalphStyleIterator Class** implementing IRalphStyleIterator

- [ ] **Constructor**
  - [ ] Accept FreshContextManager (Plan 13-04)
  - [ ] Accept GitDiffContextBuilder
  - [ ] Accept ErrorContextAggregator
  - [ ] Accept IterationCommitHandler
  - [ ] Accept EscalationHandler
  - [ ] Accept AgentRunner or execution function
  - [ ] Accept QA functions (build, lint, test, review)
  - [ ] Initialize task registry Map

- [ ] **execute(task, options?) Method** - MAIN METHOD
  - [ ] Merge options with defaults
  - [ ] Register task in registry
  - [ ] Get base commit for diff tracking
  - [ ] **Main Loop:**
    ```
    while (iteration <= maxIterations && !completed) {
      1. Build iteration context
      2. Execute agent with context
      3. Commit iteration work
      4. Run QA (build -> lint -> test -> review)
      5. If all pass: success, break
      6. If fail: aggregate errors, continue
    }
    ```
  - [ ] If max iterations reached: escalate
  - [ ] Return IterationResult

- [ ] **buildIterationContext(task, iteration, options) Private Method**
  - [ ] Get fresh context from FreshContextManager
  - [ ] If iteration > 1:
    - [ ] Add previous diff
    - [ ] Add cumulative diff
    - [ ] Add previous errors
  - [ ] Return IterationContext

- [ ] **executeAgent(context) Private Method**
  - [ ] Call agent with context
  - [ ] Track changes made
  - [ ] Return agent result

- [ ] **runQA(taskId) Private Method**
  - [ ] Run build
  - [ ] If build fails, return errors
  - [ ] Run lint
  - [ ] If lint fails with errors, return errors
  - [ ] Run tests
  - [ ] If tests fail, return errors
  - [ ] Run review (optional)
  - [ ] Return combined result

- [ ] **checkSuccess(qaResult) Private Method**
  - [ ] Check build passed
  - [ ] Check lint passed (0 errors)
  - [ ] Check tests passed
  - [ ] Return boolean

- [ ] **pause(taskId) Method**
  - [ ] Set state to 'paused'
  - [ ] Store current state

- [ ] **resume(taskId) Method**
  - [ ] Validate state is 'paused'
  - [ ] Set state to 'running'
  - [ ] Continue execution

- [ ] **abort(taskId) Method**
  - [ ] Set state to 'aborted'
  - [ ] Clean up resources
  - [ ] Return current result

- [ ] **getStatus(taskId) Method**
  - [ ] Return IterationStatus from registry
  - [ ] Return null if not found

- [ ] **getHistory(taskId) Method**
  - [ ] Return history from registry
  - [ ] Return empty array if not found

### Part B: State Machine
- [ ] Track state transitions properly
- [ ] Handle pause/resume/abort cleanly
- [ ] Log all state changes

### Part C: Create Tests
Create `src/execution/iteration/RalphStyleIterator.test.ts`:

- [ ] Test successful iteration (passes on first try)
- [ ] Test iteration with failures then success
- [ ] Test max iterations reached (escalation)
- [ ] Test pause and resume
- [ ] Test abort
- [ ] Test context building with diffs
- [ ] Test error aggregation

### Task 8 Completion Checklist
- [x] `RalphStyleIterator.ts` created (~800 lines - more comprehensive than estimated)
- [x] `RalphStyleIterator.test.ts` created (~800 lines - 30 comprehensive tests)
- [x] All tests pass (30/30)
- [x] TypeScript compiles

**[TASK 8 COMPLETE]** - Completed on 2026-01-18

---

# Task 9: Git Diff Context Builder

## Objective
Implement building context from git diffs to show agents their previous work.

## Requirements

### Part A: Create GitDiffContextBuilder Class
Create `src/execution/iteration/GitDiffContextBuilder.ts`:

- [x] **GitDiffContextBuilder Class** implementing IGitDiffContextBuilder

- [x] **Constructor**
  - [x] Accept GitService or git command executor (via IGitExecutor interface)
  - [x] Accept project root path
  - [x] Accept optional format options (maxTokens, includeContent, etc.)

- [x] **buildDiffContext(fromCommit, toCommit?) Method**
  - [x] Default toCommit to HEAD
  - [x] Run `git diff fromCommit..toCommit`
  - [x] Parse diff output
  - [x] Calculate stats
  - [x] Return GitDiff
  - [x] Handle git errors gracefully

- [x] **buildCumulativeDiff(baseCommit) Method**
  - [x] Get diff from base to HEAD
  - [x] Return GitDiff

- [x] **formatDiffForAgent(diff) Method**
  - [x] Format diff for agent consumption
  - [x] Include summary of changes
  - [x] Include relevant diff hunks (with syntax highlighting markers)
  - [x] Respect token limits (truncation with indicator)
  - [x] Return formatted string

- [x] **parseDiffOutput(diffText) Private Method**
  - [x] Parse git diff output
  - [x] Extract file changes
  - [x] Extract additions/deletions
  - [x] Return structured GitChange[]
  - [x] Detect change types (added, modified, deleted, renamed)

- [x] **calculateStats(changes) Private Method**
  - [x] Sum additions and deletions
  - [x] Count files changed
  - [x] Return stats object

- [x] **getHeadCommit() Private Method**
  - [x] Run `git rev-parse HEAD`
  - [x] Return commit hash

- [x] **runGitCommand(args) Private Method**
  - [x] Execute git command via injected executor
  - [x] Handle errors
  - [x] Return output

- [x] **Factory Functions**
  - [x] createGitDiffContextBuilder() - Creates with real git executor
  - [x] createMockGitExecutor() - Creates mock for testing
  - [x] createTestGitDiffContextBuilder() - Creates with mock for tests

### Part B: Create Tests (27 tests, all passing)
Create `src/execution/iteration/GitDiffContextBuilder.test.ts`:

- [x] Test diff building (between commits, with default HEAD)
- [x] Test cumulative diff (base to HEAD)
- [x] Test formatting for agent (summary, detailed, file list modes)
- [x] Test diff parsing (file changes, additions, deletions, change types)
- [x] Test with no changes (empty diff handling)
- [x] Test with merge conflicts (handles conflict markers)
- [x] Test edge cases (binary files, special chars, tabs in filenames, long hashes)

### Task 9 Completion Checklist
- [x] `GitDiffContextBuilder.ts` created (~480 lines - comprehensive implementation with factory functions)
- [x] `GitDiffContextBuilder.test.ts` created (~450 lines - 27 comprehensive tests)
- [x] All tests pass (27/27)
- [x] TypeScript compiles (no new errors introduced)
- [x] Created `src/renderer/test-setup.ts` to fix missing test setup file

**[TASK 9 COMPLETE]** - Completed on 2026-01-18, proceeding to Task 10

---

# Task 10: Error Context Aggregator

## Objective
Implement collection and formatting of errors from previous iterations.

## Requirements

### Part A: Create ErrorContextAggregator Class
Create `src/execution/iteration/ErrorContextAggregator.ts`:

- [ ] **ErrorContextAggregator Class** implementing IErrorContextAggregator

- [ ] **Constructor**
  - [ ] Initialize errors array
  - [ ] Accept optional max errors limit

- [ ] **addErrors(errors) Method**
  - [ ] Add errors to collection
  - [ ] Mark with current iteration if not set

- [ ] **getUniqueErrors() Method**
  - [ ] Deduplicate by message + file + line
  - [ ] Keep most recent occurrence
  - [ ] Return unique errors

- [ ] **getErrorsByType(type) Method**
  - [ ] Filter errors by type
  - [ ] Return filtered array

- [ ] **formatErrorsForAgent() Method**
  - [ ] Group errors by type
  - [ ] Format for agent consumption
  - [ ] Prioritize by severity
  - [ ] Include suggestions where available
  - [ ] Return formatted string

- [ ] **clear() Method**
  - [ ] Clear all errors

- [ ] **deduplicateErrors(errors) Private Method**
  - [ ] Create key from message + file + line
  - [ ] Keep unique entries

- [ ] **prioritizeErrors(errors) Private Method**
  - [ ] Sort by severity (error > warning > info)
  - [ ] Then by type (build > lint > test > review)
  - [ ] Return sorted array

- [ ] **formatError(error) Private Method**
  - [ ] Format single error with context
  - [ ] Include file:line if available
  - [ ] Include suggestion if available

### Part B: Create Tests
Create `src/execution/iteration/ErrorContextAggregator.test.ts`:

- [ ] Test error adding
- [ ] Test deduplication
- [ ] Test filtering by type
- [ ] Test formatting
- [ ] Test prioritization
- [ ] Test clearing

### Task 10 Completion Checklist
- [x] `ErrorContextAggregator.ts` created (~310 lines - more comprehensive than estimated)
- [x] `ErrorContextAggregator.test.ts` created (~330 lines - 31 comprehensive tests)
- [x] All tests pass (31/31)
- [x] TypeScript compiles (verified via Vitest)

**[TASK 10 COMPLETE]** ✅ Completed on 2026-01-18 - Proceeding to Task 11

---

# Task 11: Iteration Commit Handler

## Objective
Implement git commits for each iteration with rollback support.

## Requirements

### Part A: Create IterationCommitHandler Class
Create `src/execution/iteration/IterationCommitHandler.ts`:

- [ ] **IterationCommitHandler Class** implementing IIterationCommitHandler

- [ ] **Constructor**
  - [ ] Accept GitService or git command executor
  - [ ] Accept project root path
  - [ ] Initialize commit registry Map

- [ ] **commitIteration(taskId, iteration, message) Method**
  - [ ] Stage all changes: `git add -A`
  - [ ] Create commit: `git commit -m "iteration-{n}: {message}"`
  - [ ] Tag iteration: `git tag iteration-{taskId}-{n}`
  - [ ] Store commit hash in registry
  - [ ] Return commit hash

- [ ] **rollbackToIteration(taskId, iteration) Method**
  - [ ] Find commit hash for iteration
  - [ ] Reset to commit: `git reset --hard {hash}`
  - [ ] Clean untracked: `git clean -fd`
  - [ ] Update registry

- [ ] **getIterationCommit(taskId, iteration) Method**
  - [ ] Look up in registry
  - [ ] Return hash or null

- [ ] **generateCommitMessage(taskId, iteration, summary) Private Method**
  - [ ] Format: `[nexus] Task {taskId} - Iteration {n}: {summary}`
  - [ ] Keep under 72 chars for first line

- [ ] **stageChanges() Private Method**
  - [ ] Run `git add -A`
  - [ ] Return true if changes staged

- [ ] **hasUncommittedChanges() Private Method**
  - [ ] Run `git status --porcelain`
  - [ ] Return true if output not empty

- [ ] **createTag(name, commit) Private Method**
  - [ ] Run `git tag {name} {commit}`
  - [ ] Handle existing tag

### Part B: Create Tests
Create `src/execution/iteration/IterationCommitHandler.test.ts`:

- [ ] Test commit creation
- [ ] Test commit message formatting
- [ ] Test tagging
- [ ] Test rollback
- [ ] Test commit lookup
- [ ] Test with no changes

### Task 11 Completion Checklist
- [ ] `IterationCommitHandler.ts` created (~200 lines)
- [ ] `IterationCommitHandler.test.ts` created (~150 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 11 COMPLETE]** <- Mark when done, proceed to Task 12

---

# Task 12: Escalation Handler

## Objective
Implement escalation when max iterations reached or blocking issues found.

## Requirements

### Part A: Create EscalationHandler Class
Create `src/execution/iteration/EscalationHandler.ts`:

- [ ] **EscalationHandler Class** implementing IEscalationHandler

- [ ] **Constructor**
  - [ ] Accept GitService or git command executor
  - [ ] Accept notification service (optional)
  - [ ] Accept checkpoint directory path

- [ ] **escalate(taskId, reason, context) Method**
  - [ ] Create checkpoint
  - [ ] Generate escalation report
  - [ ] Save report to checkpoint directory
  - [ ] Notify human
  - [ ] Return EscalationReport

- [ ] **createCheckpoint(taskId) Method**
  - [ ] Commit any pending changes
  - [ ] Create checkpoint tag
  - [ ] Save current state info
  - [ ] Return checkpoint commit hash

- [ ] **notifyHuman(report) Method**
  - [ ] Format notification message
  - [ ] Log to console
  - [ ] Write to file
  - [ ] Call notification service if configured

- [ ] **generateReport(taskId, reason, context) Private Method**
  - [ ] Summarize iterations completed
  - [ ] List last errors
  - [ ] Suggest actions based on reason
  - [ ] Return EscalationReport

- [ ] **suggestActions(reason, errors) Private Method**
  - [ ] Analyze errors
  - [ ] Suggest fixes based on error types
  - [ ] Return suggestions array

- [ ] **formatReportForDisplay(report) Private Method**
  - [ ] Format report for human reading
  - [ ] Include all relevant info
  - [ ] Return formatted string

- [ ] **saveReportToFile(report, path) Private Method**
  - [ ] Write report as JSON
  - [ ] Also write human-readable version

### Part B: Create Index File
Create `src/execution/iteration/index.ts`:

- [ ] Export all types from `./types`
- [ ] Export RalphStyleIterator
- [ ] Export GitDiffContextBuilder
- [ ] Export ErrorContextAggregator
- [ ] Export IterationCommitHandler
- [ ] Export EscalationHandler
- [ ] Export factory: `createRalphStyleIterator()`

### Part C: Create Tests
Create `src/execution/iteration/EscalationHandler.test.ts`:

- [ ] Test escalation report generation
- [ ] Test checkpoint creation
- [ ] Test notification
- [ ] Test action suggestions
- [ ] Test file saving

### Task 12 Completion Checklist
- [ ] `EscalationHandler.ts` created (~200 lines)
- [ ] `EscalationHandler.test.ts` created (~120 lines)
- [ ] `index.ts` created (~50 lines)
- [ ] All tests pass
- [ ] TypeScript compiles

**[TASK 12 COMPLETE]** <- Mark when done, proceed to Task 13

---

# ============================================================================
# PART 3: INTEGRATION
# ============================================================================

# Task 13: Cross-Module Integration

## Objective
Ensure Dynamic Context Provider and Ralph-Style Iterator work together.

## Requirements

### Part A: Integration Points
Verify these integration points work:

- [ ] **RalphStyleIterator uses FreshContextManager:**
  - Builds fresh context each iteration
  - Context includes relevant code from previous iterations

- [ ] **RalphStyleIterator uses DynamicContextProvider:**
  - Agents can request additional context mid-iteration
  - Requests tracked and budgeted

- [ ] **DynamicContextProvider uses CodeMemory:**
  - Search requests use Plan 13-03 CodeMemory
  - Results are relevant and ranked

- [ ] **GitDiffContextBuilder integrates with IterationContext:**
  - Diffs are included in context
  - Agent sees previous work

### Part B: Create E2E Integration Test
Create `src/execution/iteration/integration.test.ts`:

- [ ] Test full iteration cycle:
  1. Start task
  2. Agent executes (mock)
  3. Commit iteration
  4. Run QA (mock fail)
  5. Second iteration with diff context
  6. QA passes
  7. Success

- [ ] Test agent requesting context mid-iteration
- [ ] Test escalation flow
- [ ] Test pause/resume

### Part C: Update Parent Exports
Update `src/orchestration/context/index.ts`:
- [ ] Add export for dynamic module: `export * from './dynamic'`

Update `src/execution/index.ts` (create if needed):
- [ ] Add export for iteration module: `export * from './iteration'`

### Part D: Create README Files
Create `src/orchestration/context/dynamic/README.md`:
- [ ] Document Dynamic Context Provider
- [ ] Usage examples
- [ ] Tool definition for agents

Create `src/execution/iteration/README.md`:
- [ ] Document Ralph-Style Iterator
- [ ] Iteration flow diagram (ASCII)
- [ ] Configuration options
- [ ] Escalation handling

### Task 13 Completion Checklist
- [ ] Integration points verified
- [ ] `integration.test.ts` created (~200 lines)
- [ ] Parent exports updated
- [ ] README files created
- [ ] All integration tests pass

**[TASK 13 COMPLETE]** <- Mark when done, proceed to Task 14

---

# ============================================================================
# PART 4: FINAL VERIFICATION
# ============================================================================

# Task 14: Lint & Quality Check

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
- [ ] Add targeted suppressions only when unavoidable (with comment)

### Part C: Fix Files Systematically

Dynamic Context Provider files:
- [ ] `src/orchestration/context/dynamic/types.ts`
- [ ] `src/orchestration/context/dynamic/DynamicContextProvider.ts`
- [ ] `src/orchestration/context/dynamic/handlers/FileRequestHandler.ts`
- [ ] `src/orchestration/context/dynamic/handlers/SymbolRequestHandler.ts`
- [ ] `src/orchestration/context/dynamic/handlers/SearchRequestHandler.ts`
- [ ] `src/orchestration/context/dynamic/index.ts`

Ralph-Style Iterator files:
- [ ] `src/execution/iteration/types.ts`
- [ ] `src/execution/iteration/RalphStyleIterator.ts`
- [ ] `src/execution/iteration/GitDiffContextBuilder.ts`
- [ ] `src/execution/iteration/ErrorContextAggregator.ts`
- [ ] `src/execution/iteration/IterationCommitHandler.ts`
- [ ] `src/execution/iteration/EscalationHandler.ts`
- [ ] `src/execution/iteration/index.ts`

Tool files:
- [ ] `src/execution/tools/RequestContextTool.ts`

Test files:
- [ ] All `*.test.ts` files

### Part D: Final Verification
- [ ] Run: `npm run lint`
  - Expected: 0 errors

- [ ] Run: `npm run build`
  - Expected: Success, no errors

- [ ] Run: `npm test src/orchestration/context/dynamic/`
  - Expected: All tests pass

- [ ] Run: `npm test src/execution/iteration/`
  - Expected: All tests pass

- [ ] Run: `npm test src/execution/tools/`
  - Expected: All tests pass

- [ ] Run full test suite: `npm test`
  - Expected: All existing tests still pass (no regressions)

### Task 14 Completion Checklist
- [ ] Auto-fix applied
- [ ] All lint errors manually fixed
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All Dynamic Context tests pass
- [ ] All Ralph Iterator tests pass
- [ ] Full test suite passes (no regressions)

**[TASK 14 COMPLETE]**

---

## Output File Structure

After completion:

```
src/orchestration/context/dynamic/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~200 lines)
|-- README.md                         # Documentation (~100 lines)
|-- DynamicContextProvider.ts         # Core implementation (~300 lines)
|-- DynamicContextProvider.test.ts    # Tests (~200 lines)
|-- handlers/
    |-- FileRequestHandler.ts         # File requests (~150 lines)
    |-- FileRequestHandler.test.ts    # Tests (~100 lines)
    |-- SymbolRequestHandler.ts       # Symbol requests (~200 lines)
    |-- SymbolRequestHandler.test.ts  # Tests (~150 lines)
    |-- SearchRequestHandler.ts       # Search requests (~180 lines)
    |-- SearchRequestHandler.test.ts  # Tests (~120 lines)
                                      --------------------------
                                      Subtotal: ~1,750 lines

src/execution/iteration/
|-- index.ts                          # Module exports (~50 lines)
|-- types.ts                          # Type definitions (~350 lines)
|-- README.md                         # Documentation (~150 lines)
|-- RalphStyleIterator.ts             # Core iterator (~400 lines)
|-- RalphStyleIterator.test.ts        # Tests (~250 lines)
|-- GitDiffContextBuilder.ts          # Git diff building (~200 lines)
|-- GitDiffContextBuilder.test.ts     # Tests (~150 lines)
|-- ErrorContextAggregator.ts         # Error aggregation (~180 lines)
|-- ErrorContextAggregator.test.ts    # Tests (~120 lines)
|-- IterationCommitHandler.ts         # Commit handling (~200 lines)
|-- IterationCommitHandler.test.ts    # Tests (~150 lines)
|-- EscalationHandler.ts              # Escalation (~200 lines)
|-- EscalationHandler.test.ts         # Tests (~120 lines)
|-- integration.test.ts               # Integration tests (~200 lines)
                                      --------------------------
                                      Subtotal: ~2,720 lines

src/execution/tools/
|-- RequestContextTool.ts             # Agent tool (~150 lines)
|-- RequestContextTool.test.ts        # Tests (~100 lines)
                                      --------------------------
                                      Subtotal: ~250 lines

                                      ==========================
                                      TOTAL: ~4,720 lines
```

---

## Success Criteria

- [ ] All 14 tasks completed with markers checked
- [ ] Dynamic Context Provider in `src/orchestration/context/dynamic/`
- [ ] Ralph-Style Iterator in `src/execution/iteration/`
- [ ] Agent tool in `src/execution/tools/`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compiles: `npm run build`
- [ ] ESLint passes: `npm run lint` (0 errors)
- [ ] Agent can request context:
  ```typescript
  const provider = createDynamicContextProvider();
  provider.registerAgent('agent-1', 'task-1');
  const response = await provider.requestFile('agent-1', 'src/index.ts', 'Need to understand entry point');
  console.log('File content:', response.content);
  ```
- [ ] Ralph iteration works:
  ```typescript
  const iterator = createRalphStyleIterator();
  const result = await iterator.execute(task, { maxIterations: 10 });
  console.log('Iterations:', result.iterations);
  console.log('Success:', result.success);
  ```
- [ ] **Total lines: ~4,500-5,500**

---

## Recommended Settings

```
--max-iterations 50
--completion-promise "PLANS_13_05_06_COMPLETE"
```

## Task Completion Markers

Complete tasks sequentially:

**Part 1: Dynamic Context Provider**
- [ ] `[TASK 1 COMPLETE]` - Types & Interfaces
- [ ] `[TASK 2 COMPLETE]` - DynamicContextProvider Core
- [ ] `[TASK 3 COMPLETE]` - File Request Handler
- [ ] `[TASK 4 COMPLETE]` - Symbol Request Handler
- [ ] `[TASK 5 COMPLETE]` - Search Request Handler
- [x] `[TASK 6 COMPLETE]` - Agent Tool Integration ✅

**Part 2: Ralph-Style Iterator**
- [x] `[TASK 7 COMPLETE]` - Iterator Types & Interfaces ✅
- [ ] `[TASK 8 COMPLETE]` - RalphStyleIterator Core
- [x] `[TASK 9 COMPLETE]` - Git Diff Context Builder ✅
- [ ] `[TASK 10 COMPLETE]` - Error Context Aggregator
- [ ] `[TASK 11 COMPLETE]` - Iteration Commit Handler
- [ ] `[TASK 12 COMPLETE]` - Escalation Handler

**Part 3: Integration**
- [ ] `[TASK 13 COMPLETE]` - Cross-Module Integration

**Part 4: Final Verification**
- [ ] `[TASK 14 COMPLETE]` - Lint & Quality Check

**Completion:**
- [ ] `[PLANS 13-05 & 13-06 COMPLETE]` - All done

---

## Notes

- Complete tasks in order - later tasks depend on earlier ones
- Part 1 (Dynamic Context) can run in parallel with agents
- Part 2 (Ralph Iterator) builds on Part 1 for context requests
- Task 14 (lint) is critical - do not skip it
- Reference `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` for interface details
- Follow existing Nexus patterns in the relevant layers
- Dynamic Context extends Layer 2 (Orchestration), Ralph Iterator is Layer 4 (Execution)
- This combined plan enables Plans 13-07 and 13-08

## Reference Files

For existing patterns, examine:
- `src/orchestration/context/` - Plan 13-04 code (FreshContextManager)
- `src/persistence/memory/code/` - Plan 13-03 code (CodeMemory)
- `src/infrastructure/analysis/` - Plan 13-01 code (RepoMapGenerator)
- Existing git integration in the codebase
- Existing execution layer patterns
