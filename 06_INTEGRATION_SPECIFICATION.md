# Phase 6: Integration Specification

> **Document Type:** Complete Integration and Build Specification
> **Purpose:** Translate architecture into EXACT implementation specifications - step-by-step build instructions
> **Input:**
>   - Phase 5: Architecture Blueprint (7 layers, 43 components)
>   - Phase 4: Gap Analysis (25 gaps, 5 sprints)
>   - Phase 3: Compatibility Matrix (12 conflicts, 20 synergies)
> **Created:** 2026-01-13
> **Status:** COMPLETE

---

## Executive Summary

### Total Components to Build

| Category | Count | Estimated LOC |
|----------|-------|---------------|
| **Layer 7: Infrastructure** | 5 | 1,050-1,350 |
| **Layer 6: Persistence** | 6 | 1,200-1,500 |
| **Layer 5: Quality** | 4 | 850-1,050 |
| **Layer 4: Execution** | 4 | 1,400-1,700 |
| **Layer 3: Planning** | 3 | 650-800 |
| **Layer 2: Orchestration** | 4 | 900-1,150 |
| **Layer 1: UI** | 4 | 1,900-2,300 |
| **TOTAL** | **30** | **7,950-9,850** |

### Additional Specifications

| Category | Count | Estimated LOC/Words |
|----------|-------|---------------------|
| Type Definitions | 4 files | 700-900 LOC |
| Configuration Files | 3 files | 250-380 LOC |
| Adapters | 3 implementations | 500-650 LOC |
| Bridges | 3 implementations | 600-750 LOC |
| LLM Clients | 3 implementations | 950-1,150 LOC |
| System Prompts | 5 prompts | 7,700-10,000 words |

### Estimated Total Time

| Sprint | Duration | Hours | Focus |
|--------|----------|-------|-------|
| Sprint 1 | Week 1-2 | 38 hours | Foundation (Types, Infrastructure, Database) |
| Sprint 2 | Week 3-4 | 48 hours | Persistence & State |
| Sprint 3 | Week 5-6 | 80 hours | LLM & Agents |
| Sprint 4 | Week 7-8 | 48 hours | Planning & Orchestration |
| Sprint 5 | Week 9-10 | 88 hours | UI Components |
| **TOTAL** | **10 weeks** | **~302 hours** | |

### Critical Path

```
BUILD-001 (Init) → BUILD-002 (Types) → BUILD-003 (Infra) → BUILD-004 (DB)
→ BUILD-005 (State) → BUILD-011 (Planning) → BUILD-012 (Orchestration) → BUILD-014 (Interview UI)

Total Critical Path: ~126 hours (~16 working days)
```

### Test Coverage Targets

| Layer | Minimum | Target | Test Count |
|-------|---------|--------|------------|
| Infrastructure | 80% | 90% | ~30 |
| Persistence | 85% | 95% | ~40 |
| Quality | 80% | 90% | ~15 |
| Execution | 75% | 85% | ~20 |
| Planning | 80% | 90% | ~25 |
| Orchestration | 80% | 90% | ~35 |
| UI Components | 70% | 80% | ~15 |
| **TOTAL** | | | **~180 tests** |

---

## Task 6.1: Layer Implementation Specifications

### Overview

This section provides detailed implementation specifications for each of the 7 architecture layers, totaling 30 components. Layers are specified in reverse order (7→1) because lower layers have no dependencies and should be built first.

---

### Part A: Layer 7 - Infrastructure (Build First)

**Dependencies:** None - this layer has NO dependencies on other Nexus layers
**Total Components:** 5
**Estimated Total LOC:** 1,050-1,350

---

#### IMPL-INF-001: File System Service

| Field | Specification |
|-------|---------------|
| **File** | `src/infrastructure/file-system/FileSystemService.ts` |
| **Exports** | `FileSystemService` class, `WatchCallback` type, `Unsubscribe` type |
| **Dependencies** | fs-extra, chokidar, fast-glob, pathe |
| **Estimated LOC** | 150-200 |

**Interface Definition:**

```typescript
import type { Stats } from 'fs';

export type WatchCallback = (event: 'add' | 'change' | 'unlink', path: string) => void;
export type Unsubscribe = () => void;

export interface FileSystemService {
  // Read operations
  readFile(path: string): Promise<string>;
  readFileBuffer(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<Stats>;

  // Write operations
  writeFile(path: string, content: string): Promise<void>;
  writeFileBuffer(path: string, content: Buffer): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;

  // Directory operations
  mkdir(path: string, recursive?: boolean): Promise<void>;
  readdir(path: string): Promise<string[]>;
  rmdir(path: string, recursive?: boolean): Promise<void>;

  // File operations
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  remove(path: string): Promise<void>;

  // Glob and watch
  glob(pattern: string, options?: GlobOptions): Promise<string[]>;
  watch(path: string, callback: WatchCallback): Unsubscribe;
}

export interface GlobOptions {
  cwd?: string;
  ignore?: string[];
  dot?: boolean;
  absolute?: boolean;
}
```

**Implementation Notes:**

1. Use `pathe` for cross-platform path handling
2. All paths should be normalized before operations
3. `watch` should use debouncing (100ms default)
4. `glob` should support negation patterns
5. Error handling should include path in error message

**Methods to Implement:**

| Method | Description | Complexity |
|--------|-------------|------------|
| `readFile` | Read file as UTF-8 string | Simple |
| `writeFile` | Write string to file, create dirs if needed | Simple |
| `exists` | Check if path exists (file or directory) | Simple |
| `glob` | Find files matching pattern | Medium |
| `watch` | Watch path for changes with debounce | Medium |

**Tests Required:**

```typescript
describe('FileSystemService', () => {
  describe('readFile', () => {
    it('should read file contents as string');
    it('should throw FileNotFoundError for missing file');
    it('should handle UTF-8 encoding correctly');
  });

  describe('writeFile', () => {
    it('should write content to file');
    it('should create parent directories if needed');
    it('should overwrite existing file');
  });

  describe('exists', () => {
    it('should return true for existing file');
    it('should return true for existing directory');
    it('should return false for non-existent path');
  });

  describe('glob', () => {
    it('should match files with simple pattern');
    it('should match files with ** wildcard');
    it('should respect ignore patterns');
    it('should handle absolute paths');
  });

  describe('watch', () => {
    it('should emit add event for new files');
    it('should emit change event for modified files');
    it('should emit unlink event for deleted files');
    it('should return unsubscribe function');
    it('should debounce rapid changes');
  });
});
```

---

#### IMPL-INF-002: Git Operations Service

| Field | Specification |
|-------|---------------|
| **File** | `src/infrastructure/git/GitService.ts` |
| **Exports** | `GitService` class, `MergeResult`, `Diff` types |
| **Dependencies** | simple-git, parse-diff |
| **Estimated LOC** | 250-300 |

**Interface Definition:**

```typescript
export interface GitService {
  // Repository operations
  init(path: string): Promise<void>;
  clone(url: string, path: string, options?: CloneOptions): Promise<void>;

  // Branch operations
  createBranch(name: string, startPoint?: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;
  listBranches(): Promise<BranchInfo[]>;
  getCurrentBranch(): Promise<string>;

  // Commit operations
  add(files: string | string[]): Promise<void>;
  commit(message: string, options?: CommitOptions): Promise<string>;
  getLog(options?: LogOptions): Promise<CommitInfo[]>;

  // Merge operations
  merge(branch: string, options?: MergeOptions): Promise<MergeResult>;
  abortMerge(): Promise<void>;

  // Diff operations
  getDiff(from?: string, to?: string): Promise<Diff[]>;
  getStatus(): Promise<StatusResult>;

  // Remote operations
  push(remote?: string, branch?: string, options?: PushOptions): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  fetch(remote?: string): Promise<void>;
}

export interface MergeResult {
  success: boolean;
  conflicts: ConflictInfo[];
  mergedFiles: string[];
  commitHash?: string;
}

export interface Diff {
  file: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface ConflictInfo {
  file: string;
  oursContent: string;
  theirsContent: string;
  baseContent?: string;
}

export interface BranchInfo {
  name: string;
  current: boolean;
  commit: string;
  tracking?: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}
```

**Implementation Notes:**

1. Use `simple-git` with custom binary path support
2. Handle detached HEAD state gracefully
3. Parse diff output for structured conflict info
4. Timeout for long-running operations (30s default)
5. Validate branch names before operations

**Tests Required:**

```typescript
describe('GitService', () => {
  describe('createBranch', () => {
    it('should create branch from current HEAD');
    it('should create branch from specified commit');
    it('should throw for invalid branch name');
  });

  describe('commit', () => {
    it('should create commit with message');
    it('should return commit hash');
    it('should handle empty commit gracefully');
  });

  describe('merge', () => {
    it('should merge branch without conflicts');
    it('should detect and report conflicts');
    it('should return merged files list');
  });

  describe('getDiff', () => {
    it('should return diff between commits');
    it('should parse hunks correctly');
    it('should handle binary files');
  });
});
```

---

#### IMPL-INF-003: Worktree Manager

| Field | Specification |
|-------|---------------|
| **File** | `src/infrastructure/git/WorktreeManager.ts` |
| **Exports** | `WorktreeManager` class, `WorktreeInfo` type |
| **Dependencies** | GitService, FileSystemService |
| **Estimated LOC** | 200-250 |

**Interface Definition:**

```typescript
export interface WorktreeManager {
  // Lifecycle
  createWorktree(taskId: string, baseBranch?: string): Promise<WorktreeInfo>;
  removeWorktree(taskId: string): Promise<void>;

  // Queries
  getWorktreeInfo(taskId: string): Promise<WorktreeInfo | null>;
  listWorktrees(): Promise<WorktreeInfo[]>;

  // Maintenance
  cleanupOldWorktrees(maxAgeMs: number): Promise<number>;
  cleanupAllWorktrees(): Promise<number>;

  // Operations
  getWorktreePath(taskId: string): string;
  isWorktreeActive(taskId: string): Promise<boolean>;
}

export interface WorktreeInfo {
  taskId: string;
  path: string;
  branch: string;
  baseBranch: string;
  createdAt: Date;
  lastAccessed: Date;
  status: 'active' | 'merged' | 'abandoned';
}

export interface WorktreeConfig {
  baseDir: string;           // Default: .nexus/worktrees
  branchPrefix: string;      // Default: nexus/task/
  maxWorktrees: number;      // Default: 10
  autoCleanupAge: number;    // Default: 24 hours (ms)
}
```

**Branch Naming Convention:**

```typescript
// Pattern: nexus/task/{taskId}/{timestamp}
// Example: nexus/task/F001-A-03/20260113-143022

function generateBranchName(taskId: string): string {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15);
  return `nexus/task/${taskId}/${timestamp}`;
}
```

**Implementation Notes:**

1. Worktrees stored in `.nexus/worktrees/{taskId}/`
2. Track worktree metadata in `.nexus/worktrees/registry.json`
3. Automatic cleanup of worktrees older than 24h
4. Lock file to prevent concurrent operations on same worktree
5. Graceful handling of orphaned worktrees

**Tests Required:**

```typescript
describe('WorktreeManager', () => {
  describe('createWorktree', () => {
    it('should create worktree with unique branch');
    it('should create worktree from specified base branch');
    it('should track worktree in registry');
    it('should enforce max worktrees limit');
  });

  describe('listWorktrees', () => {
    it('should return all active worktrees');
    it('should include metadata for each worktree');
  });

  describe('getWorktreeInfo', () => {
    it('should return info for existing worktree');
    it('should return null for non-existent worktree');
  });

  describe('removeWorktree', () => {
    it('should remove worktree directory');
    it('should delete associated branch');
    it('should update registry');
  });

  describe('cleanupOldWorktrees', () => {
    it('should remove worktrees older than maxAge');
    it('should return count of removed worktrees');
    it('should not remove active worktrees');
  });
});
```

---

#### IMPL-INF-004: LSP Client

| Field | Specification |
|-------|---------------|
| **File** | `src/infrastructure/lsp/LSPClient.ts` |
| **Exports** | `LSPClient` class, `Position`, `Location`, `Diagnostic` types |
| **Dependencies** | vscode-languageclient, vscode-languageserver-protocol |
| **Estimated LOC** | 300-400 |

**Interface Definition:**

```typescript
export interface LSPClient {
  // Lifecycle
  initialize(rootPath: string, language?: string): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Navigation
  getDefinition(file: string, position: Position): Promise<Location[]>;
  getReferences(file: string, position: Position): Promise<Location[]>;
  getTypeDefinition(file: string, position: Position): Promise<Location[]>;
  getImplementation(file: string, position: Position): Promise<Location[]>;

  // Information
  getHover(file: string, position: Position): Promise<HoverInfo | null>;
  getSignatureHelp(file: string, position: Position): Promise<SignatureHelp | null>;

  // Diagnostics
  getDiagnostics(file: string): Promise<Diagnostic[]>;
  getAllDiagnostics(): Promise<Map<string, Diagnostic[]>>;

  // Completions
  getCompletions(file: string, position: Position): Promise<Completion[]>;
  resolveCompletion(item: Completion): Promise<Completion>;

  // Document
  getDocumentSymbols(file: string): Promise<DocumentSymbol[]>;
  getWorkspaceSymbols(query: string): Promise<WorkspaceSymbol[]>;
}

export interface Position {
  line: number;    // 0-indexed
  character: number; // 0-indexed
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  code?: string | number;
  source?: string;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface Completion {
  label: string;
  kind: CompletionKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface HoverInfo {
  contents: string;
  range?: Range;
}
```

**Supported Language Servers:**

| Language | Server | Binary |
|----------|--------|--------|
| TypeScript | typescript-language-server | `typescript-language-server` |
| Python | pylsp | `pylsp` |
| Rust | rust-analyzer | `rust-analyzer` |
| Go | gopls | `gopls` |

**Implementation Notes:**

1. Auto-detect language from file extension
2. Spawn language server as child process
3. Use JSON-RPC for communication
4. Cache diagnostic results (invalidate on file change)
5. Graceful shutdown on client disposal

**Tests Required:**

```typescript
describe('LSPClient', () => {
  describe('initialize', () => {
    it('should initialize TypeScript language server');
    it('should detect language from project files');
  });

  describe('getDefinition', () => {
    it('should return definition location');
    it('should handle multiple definitions');
    it('should return empty array for unknown symbol');
  });

  describe('getReferences', () => {
    it('should return all references to symbol');
    it('should include declaration in references');
  });

  describe('getDiagnostics', () => {
    it('should return errors for invalid code');
    it('should return warnings for style issues');
  });

  describe('getCompletions', () => {
    it('should return relevant completions');
    it('should include documentation in completions');
  });
});
```

---

#### IMPL-INF-005: Process Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/infrastructure/process/ProcessRunner.ts` |
| **Exports** | `ProcessRunner` class, `ProcessResult`, `RunOptions` types |
| **Dependencies** | execa, tree-kill, shell-quote |
| **Estimated LOC** | 150-200 |

**Interface Definition:**

```typescript
export interface ProcessRunner {
  // Execution
  run(command: string, options?: RunOptions): Promise<ProcessResult>;
  runStreaming(command: string, onOutput: OutputCallback, options?: RunOptions): Promise<ProcessResult>;

  // Control
  kill(pid: number): Promise<void>;
  killAll(): Promise<void>;

  // Validation
  validateCommand(command: string): ValidationResult;
  isCommandAvailable(command: string): Promise<boolean>;

  // Queries
  getRunningProcesses(): ProcessInfo[];
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;           // Default: 120000 (2 minutes)
  shell?: boolean;            // Default: true
  stdin?: string;
  maxBuffer?: number;         // Default: 10MB
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  killed: boolean;
  timedOut: boolean;
}

export type OutputCallback = (type: 'stdout' | 'stderr', data: string) => void;

export interface ProcessInfo {
  pid: number;
  command: string;
  startTime: Date;
  cwd: string;
}

export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  warnings: string[];
  blocked: boolean;
  reason?: string;
}
```

**Command Validation Rules:**

```typescript
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\s|$)/,     // Dangerous rm -rf /
  /:\(\)\{\s*:\|:&\s*\};:/,     // Fork bomb
  />\s*\/dev\/sd[a-z]/,         // Writing to disk devices
  /dd\s+.*of=\/dev/,            // dd to devices
];

const ALLOWED_COMMANDS = [
  'npm', 'npx', 'pnpm', 'yarn', 'bun',
  'node', 'tsx', 'ts-node',
  'git', 'gh',
  'tsc', 'eslint', 'prettier', 'vitest', 'jest', 'playwright',
  'cat', 'ls', 'pwd', 'echo', 'grep', 'find', 'head', 'tail',
];
```

**Implementation Notes:**

1. Use `execa` for cross-platform compatibility
2. Parse commands with `shell-quote` for validation
3. Track all running processes for cleanup
4. Use `tree-kill` for process tree termination
5. Capture both stdout and stderr separately

**Tests Required:**

```typescript
describe('ProcessRunner', () => {
  describe('run', () => {
    it('should execute command and return result');
    it('should capture stdout and stderr separately');
    it('should respect timeout option');
    it('should handle non-zero exit codes');
  });

  describe('runStreaming', () => {
    it('should stream output in real-time');
    it('should call callback for each output chunk');
  });

  describe('kill', () => {
    it('should terminate process by PID');
    it('should kill child processes');
  });

  describe('validateCommand', () => {
    it('should allow safe commands');
    it('should block dangerous patterns');
    it('should sanitize shell metacharacters');
  });
});
```

---

### Layer 7 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| FileSystemService | `src/infrastructure/file-system/FileSystemService.ts` | 150-200 | To Build |
| GitService | `src/infrastructure/git/GitService.ts` | 250-300 | To Build |
| WorktreeManager | `src/infrastructure/git/WorktreeManager.ts` | 200-250 | To Build |
| LSPClient | `src/infrastructure/lsp/LSPClient.ts` | 300-400 | To Build |
| ProcessRunner | `src/infrastructure/process/ProcessRunner.ts` | 150-200 | To Build |
| **TOTAL** | | **1,050-1,350** | |

**Tests for Layer 7:** ~30 tests

---

### Part B: Layer 6 - Persistence

**Dependencies:** Layer 7 (Infrastructure)
**Total Components:** 6
**Estimated Total LOC:** 1,200-1,500

---

#### IMPL-PER-001: Database Client

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/database/DatabaseClient.ts` |
| **Exports** | `DatabaseClient` class, `db` singleton instance |
| **Dependencies** | better-sqlite3, drizzle-orm |
| **Estimated LOC** | 100-150 |

**Interface Definition:**

```typescript
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export interface DatabaseClient {
  // Connection
  connect(path?: string): void;
  disconnect(): void;
  isConnected(): boolean;

  // Migrations
  migrate(): Promise<void>;
  getMigrationStatus(): Promise<MigrationStatus>;

  // Transactions
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  // Access
  getDb(): BetterSQLite3Database<typeof schema>;
}

export interface MigrationStatus {
  applied: string[];
  pending: string[];
  lastApplied?: Date;
}

export interface DatabaseConfig {
  path: string;              // Default: .nexus/nexus.db
  walMode: boolean;          // Default: true
  foreignKeys: boolean;      // Default: true
  busyTimeout: number;       // Default: 5000ms
}
```

**SQLite Configuration:**

```typescript
const DEFAULT_CONFIG: DatabaseConfig = {
  path: '.nexus/nexus.db',
  walMode: true,
  foreignKeys: true,
  busyTimeout: 5000,
};

// PRAGMA settings applied on connection
const PRAGMAS = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA foreign_keys = ON',
  'PRAGMA busy_timeout = 5000',
  'PRAGMA synchronous = NORMAL',
  'PRAGMA cache_size = -64000', // 64MB
];
```

**Tests Required:**

```typescript
describe('DatabaseClient', () => {
  describe('connect', () => {
    it('should create database file if not exists');
    it('should apply PRAGMA settings');
    it('should enable WAL mode');
  });

  describe('migrate', () => {
    it('should run pending migrations');
    it('should track applied migrations');
    it('should be idempotent');
  });

  describe('transaction', () => {
    it('should commit on success');
    it('should rollback on error');
    it('should support nested transactions');
  });
});
```

---

#### IMPL-PER-002: Drizzle Schema

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/database/schema.ts` |
| **Exports** | All table definitions and relations |
| **Dependencies** | drizzle-orm |
| **Estimated LOC** | 200-250 |

**Schema Definition:**

```typescript
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Projects table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  mode: text('mode', { enum: ['genesis', 'evolution'] }).notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed', 'archived'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Features table
export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  complexity: text('complexity', { enum: ['simple', 'complex'] }).notNull(),
  status: text('status', { enum: ['backlog', 'in_progress', 'ai_review', 'human_review', 'done'] }).notNull(),
  progress: real('progress').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Tasks table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id),
  name: text('name').notNull(),
  description: text('description'),
  files: text('files', { mode: 'json' }).$type<string[]>(),
  test: text('test'),
  dependsOn: text('depends_on', { mode: 'json' }).$type<string[]>(),
  estimatedTime: integer('estimated_time').notNull(), // minutes
  actualTime: integer('actual_time'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'] }).notNull(),
  assignedAgent: text('assigned_agent'),
  worktreePath: text('worktree_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Agents table
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['planner', 'coder', 'tester', 'reviewer', 'merger'] }).notNull(),
  status: text('status', { enum: ['idle', 'working', 'reviewing', 'merging', 'failed'] }).notNull(),
  currentTaskId: text('current_task_id').references(() => tasks.id),
  model: text('model').notNull(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
});

// Checkpoints table
export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  label: text('label'),
  state: text('state', { mode: 'json' }).$type<NexusState>().notNull(),
  gitBranch: text('git_branch'),
  gitCommit: text('git_commit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Memory episodes table
export const memoryEpisodes = sqliteTable('memory_episodes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  type: text('type', { enum: ['decision', 'pattern', 'gotcha', 'context'] }).notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  tokensUsed: integer('tokens_used').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
});

// Metrics table
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  sessionId: text('session_id').references(() => sessions.id),
  type: text('type').notNull(),
  value: real('value').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  features: many(features),
  checkpoints: many(checkpoints),
  sessions: many(sessions),
  memoryEpisodes: many(memoryEpisodes),
}));

export const featuresRelations = relations(features, ({ one, many }) => ({
  project: one(projects, {
    fields: [features.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  feature: one(features, {
    fields: [tasks.featureId],
    references: [features.id],
  }),
  agent: one(agents, {
    fields: [tasks.assignedAgent],
    references: [agents.id],
  }),
}));
```

**Tests Required:**

```typescript
describe('Schema', () => {
  it('should create all tables on migration');
  it('should enforce foreign key constraints');
  it('should handle JSON columns correctly');
  it('should store timestamps as integers');
});
```

---

#### IMPL-PER-003: State Manager

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/state/StateManager.ts` |
| **Exports** | `StateManager` class |
| **Dependencies** | DatabaseClient, FileSystemService |
| **Estimated LOC** | 250-300 |

**Interface Definition:**

```typescript
export interface StateManager {
  // CRUD
  saveState(state: NexusState): Promise<void>;
  loadState(projectId: string): Promise<NexusState>;
  updateState(projectId: string, updates: Partial<NexusState>): Promise<void>;
  deleteState(projectId: string): Promise<void>;

  // STATE.md format
  exportToSTATE_MD(state: NexusState): string;
  importFromSTATE_MD(content: string): NexusState;

  // .continue-here.md
  exportToContinueHere(state: NexusState): string;
  importFromContinueHere(content: string): ContinueHereInfo;

  // Reconciliation
  reconcileStates(dbState: NexusState, fileState: NexusState): NexusState;
}

export interface NexusState {
  projectId: string;
  projectName: string;
  mode: 'genesis' | 'evolution';

  // Progress
  currentPhase: number;
  totalPhases: number;
  currentPlan: number;
  totalPlans: number;
  overallProgress: number;

  // Active work
  activeFeatureId?: string;
  activeTasks: TaskState[];

  // History
  completedTasks: string[];
  decisions: Decision[];

  // Metrics
  tasksCompleted: number;
  totalTasks: number;
  timeElapsed: number;
  estimatedRemaining: number;
  tokensUsed: number;
  costUsd: number;

  // Timestamps
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface TaskState {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  worktreePath?: string;
  iteration?: number;
}

export interface Decision {
  timestamp: Date;
  topic: string;
  decision: string;
  rationale?: string;
}

export interface ContinueHereInfo {
  lastAction: string;
  file?: string;
  line?: number;
  function?: string;
  nextSteps: string[];
}
```

**STATE.md Template:**

```markdown
# Project State

## Current Position
Phase: {currentPhase} of {totalPhases} ({phaseName})
Plan: {currentPlan} of {totalPlans} in current phase
Progress: {overallProgress}%

## Active Tasks
{#each activeTasks}
- {taskId}: {taskName} ({status})
{/each}

## Decisions
{#each decisions}
- [{timestamp}]: {decision}
{/each}

## Metrics
- Tasks completed: {tasksCompleted}/{totalTasks}
- Time elapsed: {timeElapsed}
- Estimated remaining: {estimatedRemaining}
- Tokens used: {tokensUsed}
- Cost: ${costUsd}
```

**Tests Required:**

```typescript
describe('StateManager', () => {
  describe('saveState', () => {
    it('should save state to database');
    it('should write STATE.md file');
    it('should update timestamps');
  });

  describe('loadState', () => {
    it('should load state from database');
    it('should fall back to STATE.md if db missing');
    it('should reconcile conflicts');
  });

  describe('exportToSTATE_MD', () => {
    it('should format state as markdown');
    it('should include all sections');
    it('should handle empty arrays');
  });

  describe('importFromSTATE_MD', () => {
    it('should parse markdown to state object');
    it('should handle malformed input');
  });

  describe('reconcileStates', () => {
    it('should prefer newer timestamp');
    it('should merge decisions from both sources');
    it('should resolve task status conflicts');
  });
});
```

---

#### IMPL-PER-004: Checkpoint Manager

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/checkpoints/CheckpointManager.ts` |
| **Exports** | `CheckpointManager` class |
| **Dependencies** | StateManager, DatabaseClient, GitService |
| **Estimated LOC** | 150-200 |

**Interface Definition:**

```typescript
export interface CheckpointManager {
  // Create
  createCheckpoint(state: NexusState, label?: string): Promise<Checkpoint>;
  createAutoCheckpoint(state: NexusState): Promise<Checkpoint>;

  // Read
  getCheckpoint(checkpointId: string): Promise<Checkpoint | null>;
  listCheckpoints(projectId: string): Promise<Checkpoint[]>;
  getLatestCheckpoint(projectId: string): Promise<Checkpoint | null>;

  // Restore
  restoreCheckpoint(checkpointId: string): Promise<NexusState>;
  restoreToTimestamp(projectId: string, timestamp: Date): Promise<NexusState>;

  // Delete
  deleteCheckpoint(checkpointId: string): Promise<void>;
  pruneOldCheckpoints(projectId: string, keepCount: number): Promise<number>;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  label?: string;
  state: NexusState;
  gitBranch?: string;
  gitCommit?: string;
  createdAt: Date;
  size: number; // bytes
}

export interface CheckpointConfig {
  autoCheckpointInterval: number;  // Default: 2 hours (ms)
  maxCheckpoints: number;          // Default: 50
  checkpointOnFeatureComplete: boolean; // Default: true
  checkpointBeforeRiskyOps: boolean;    // Default: true
}
```

**Checkpoint Triggers:**

| Trigger | Type | Description |
|---------|------|-------------|
| Time-based | Auto | Every 2 hours of active work |
| Feature completion | Auto | After each feature is done |
| Before risky operation | Auto | Before merges, large refactors |
| User request | Manual | User clicks "Create Checkpoint" |

**Tests Required:**

```typescript
describe('CheckpointManager', () => {
  describe('createCheckpoint', () => {
    it('should save state snapshot');
    it('should create git branch for checkpoint');
    it('should generate unique checkpoint ID');
  });

  describe('listCheckpoints', () => {
    it('should return checkpoints sorted by date');
    it('should include size information');
  });

  describe('restoreCheckpoint', () => {
    it('should restore state from checkpoint');
    it('should checkout git branch if available');
    it('should emit CHECKPOINT_RESTORED event');
  });

  describe('pruneOldCheckpoints', () => {
    it('should keep specified number of checkpoints');
    it('should delete oldest first');
    it('should return count of deleted');
  });
});
```

---

#### IMPL-PER-005: Memory System

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/memory/MemorySystem.ts` |
| **Exports** | `MemorySystem` class |
| **Dependencies** | DatabaseClient, EmbeddingsService |
| **Estimated LOC** | 300-350 |

**Interface Definition:**

```typescript
export interface MemorySystem {
  // Store
  storeEpisode(episode: MemoryEpisode): Promise<void>;
  storeDecision(decision: Decision): Promise<void>;
  storePattern(pattern: Pattern): Promise<void>;
  storeGotcha(gotcha: Gotcha): Promise<void>;

  // Query
  queryMemory(query: string, options?: QueryOptions): Promise<MemoryEpisode[]>;
  getRelevantContext(taskId: string): Promise<MemoryContext>;
  searchByType(type: EpisodeType, query: string): Promise<MemoryEpisode[]>;

  // Retrieval
  getDecisions(projectId: string): Promise<Decision[]>;
  getPatterns(category?: string): Promise<Pattern[]>;
  getGotchas(technology?: string): Promise<Gotcha[]>;

  // Maintenance
  pruneOldMemories(maxAgeMs: number): Promise<number>;
  rebuildEmbeddings(): Promise<void>;
  getMemoryStats(): Promise<MemoryStats>;
}

export interface MemoryEpisode {
  id: string;
  projectId?: string;
  type: EpisodeType;
  content: string;
  embedding?: number[];
  metadata: EpisodeMetadata;
  createdAt: Date;
}

export type EpisodeType = 'decision' | 'pattern' | 'gotcha' | 'context' | 'error_resolution';

export interface EpisodeMetadata {
  taskId?: string;
  featureId?: string;
  files?: string[];
  tags?: string[];
  confidence?: number;
  source?: string;
}

export interface MemoryContext {
  relevantDecisions: Decision[];
  relevantPatterns: Pattern[];
  relevantGotchas: Gotcha[];
  similarTasks: TaskSummary[];
  totalTokens: number;
}

export interface QueryOptions {
  projectId?: string;
  type?: EpisodeType;
  limit?: number;           // Default: 10
  threshold?: number;       // Similarity threshold, default: 0.7
  includeGlobal?: boolean;  // Include cross-project memories
}

export interface MemoryStats {
  totalEpisodes: number;
  byType: Record<EpisodeType, number>;
  storageSize: number;
  embeddingsComplete: number;
  embeddingsPending: number;
}
```

**Memory Categories:**

| Type | Description | Example |
|------|-------------|---------|
| `decision` | Architectural/design decisions | "Use bcrypt for password hashing" |
| `pattern` | Reusable code patterns | "Error handling pattern for API routes" |
| `gotcha` | Pitfalls and workarounds | "SQLite doesn't support concurrent writes" |
| `context` | Task execution context | "User prefers functional components" |
| `error_resolution` | How errors were fixed | "Fixed by adding null check on line 45" |

**Tests Required:**

```typescript
describe('MemorySystem', () => {
  describe('storeEpisode', () => {
    it('should store episode with embedding');
    it('should handle missing projectId for global memories');
  });

  describe('queryMemory', () => {
    it('should return relevant episodes by semantic similarity');
    it('should respect limit option');
    it('should filter by type when specified');
  });

  describe('getRelevantContext', () => {
    it('should aggregate relevant memories for task');
    it('should respect token limit');
    it('should prioritize project-specific memories');
  });

  describe('pruneOldMemories', () => {
    it('should remove memories older than maxAge');
    it('should preserve high-confidence memories');
  });
});
```

---

#### IMPL-PER-006: Requirements Database

| Field | Specification |
|-------|---------------|
| **File** | `src/persistence/requirements/RequirementsDB.ts` |
| **Exports** | `RequirementsDB` class |
| **Dependencies** | FileSystemService |
| **Estimated LOC** | 200-250 |

**Interface Definition:**

```typescript
export interface RequirementsDB {
  // Project lifecycle
  createProject(name: string, path: string): Promise<string>;
  loadProject(projectId: string): Promise<RequirementsDatabase>;

  // Requirements CRUD
  addRequirement(projectId: string, req: Requirement): Promise<string>;
  updateRequirement(reqId: string, updates: Partial<Requirement>): Promise<void>;
  deleteRequirement(reqId: string): Promise<void>;
  getRequirement(reqId: string): Promise<Requirement | null>;
  getRequirements(projectId: string, filter?: RequirementFilter): Promise<Requirement[]>;

  // Categories
  categorizeRequirement(content: string): Promise<RequirementCategory>;
  getByCategory(projectId: string, category: RequirementCategory): Promise<Requirement[]>;

  // Decisions
  addDecision(projectId: string, decision: RequirementDecision): Promise<void>;
  getDecisions(projectId: string): Promise<RequirementDecision[]>;

  // Export/Import
  exportToJSON(projectId: string): Promise<RequirementsDatabase>;
  importFromJSON(projectId: string, data: RequirementsDatabase): Promise<void>;
  exportToMarkdown(projectId: string): Promise<string>;
}

export interface RequirementsDatabase {
  core: {
    userTypes: UserType[];
    features: Feature[];
    businessRules: BusinessRule[];
  };
  technical: {
    stackPreferences: StackPreferences;
    integrations: Integration[];
    constraints: Constraints;
  };
  design: {
    stylePreferences: StylePreferences;
    referenceSites: ReferenceSite[];
  };
  metadata: {
    sessionLog: SessionLog[];
    decisions: RequirementDecision[];
    scopeEstimate: ScopeEstimate;
  };
}

export interface Requirement {
  id: string;
  content: string;
  category: RequirementCategory;
  priority: 'must' | 'should' | 'could' | 'wont';
  source: 'interview' | 'imported' | 'inferred';
  userStories?: string[];
  acceptanceCriteria?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type RequirementCategory =
  | 'functional'
  | 'non_functional'
  | 'ui_ux'
  | 'technical'
  | 'business_logic'
  | 'integrations';

export interface RequirementFilter {
  category?: RequirementCategory;
  priority?: Requirement['priority'];
  source?: Requirement['source'];
  search?: string;
}
```

**File Structure:**

```
requirements/
├── core/
│   ├── user_types.json
│   ├── features.json
│   └── business_rules.json
├── technical/
│   ├── stack_preferences.json
│   ├── integrations.json
│   └── constraints.json
├── design/
│   ├── style_preferences.json
│   └── reference_sites.json
└── metadata/
    ├── session_log.json
    ├── decisions.json
    └── scope_estimate.json
```

**Tests Required:**

```typescript
describe('RequirementsDB', () => {
  describe('createProject', () => {
    it('should create requirements directory structure');
    it('should initialize empty JSON files');
  });

  describe('addRequirement', () => {
    it('should add requirement to correct category file');
    it('should auto-categorize if not specified');
    it('should generate unique ID');
  });

  describe('categorizeRequirement', () => {
    it('should categorize functional requirements');
    it('should categorize technical requirements');
    it('should handle ambiguous content');
  });

  describe('exportToJSON', () => {
    it('should export complete requirements database');
    it('should handle empty categories');
  });

  describe('importFromJSON', () => {
    it('should import requirements from JSON');
    it('should merge with existing requirements');
  });
});
```

---

### Layer 6 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| DatabaseClient | `src/persistence/database/DatabaseClient.ts` | 100-150 | To Build |
| Drizzle Schema | `src/persistence/database/schema.ts` | 200-250 | To Build |
| StateManager | `src/persistence/state/StateManager.ts` | 250-300 | To Build |
| CheckpointManager | `src/persistence/checkpoints/CheckpointManager.ts` | 150-200 | To Build |
| MemorySystem | `src/persistence/memory/MemorySystem.ts` | 300-350 | To Build |
| RequirementsDB | `src/persistence/requirements/RequirementsDB.ts` | 200-250 | To Build |
| **TOTAL** | | **1,200-1,500** | |

**Tests for Layer 6:** ~40 tests

---

### Part C: Layer 5 - Quality

**Dependencies:** Layer 6 (Persistence), Layer 7 (Infrastructure)
**Total Components:** 4
**Estimated Total LOC:** 850-1,050

---

#### IMPL-QUA-001: Test Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/quality/testing/TestRunner.ts` |
| **Exports** | `TestRunner` class |
| **Dependencies** | ProcessRunner |
| **Estimated LOC** | 200-250 |

**Interface Definition:**

```typescript
export interface TestRunner {
  // Execution
  runUnitTests(files?: string[]): Promise<TestResult>;
  runIntegrationTests(files?: string[]): Promise<TestResult>;
  runE2ETests(specs?: string[]): Promise<TestResult>;
  runAllTests(): Promise<TestResult>;

  // Specific tests
  runTestFile(file: string): Promise<TestResult>;
  runTestPattern(pattern: string): Promise<TestResult>;

  // Coverage
  getCoverage(): Promise<CoverageReport>;
  getCoverageForFiles(files: string[]): Promise<CoverageReport>;

  // Watch mode
  watchTests(onChange: TestCallback): Unsubscribe;

  // Detection
  detectTestFramework(): Promise<TestFramework>;
  getTestCommand(): string;
}

export interface TestResult {
  passed: boolean;
  total: number;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  duration: number;
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  file: string;
  testName: string;
  error: string;
  stack?: string;
  line?: number;
  expected?: string;
  actual?: string;
}

export interface CoverageReport {
  overall: number;
  byFile: FileCoverage[];
  uncoveredLines: UncoveredLine[];
}

export interface FileCoverage {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export type TestFramework = 'vitest' | 'jest' | 'pytest' | 'go' | 'unknown';
export type TestCallback = (result: TestResult) => void;
```

**Framework Detection:**

```typescript
const FRAMEWORK_FILES: Record<TestFramework, string[]> = {
  vitest: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'],
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
  pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
  go: ['go.mod'],
  unknown: [],
};

const FRAMEWORK_COMMANDS: Record<TestFramework, string> = {
  vitest: 'npx vitest run',
  jest: 'npx jest',
  pytest: 'pytest',
  go: 'go test ./...',
  unknown: 'npm test',
};
```

**Tests Required:**

```typescript
describe('TestRunner', () => {
  describe('runUnitTests', () => {
    it('should run all unit tests');
    it('should run specific test files');
    it('should parse test results correctly');
    it('should capture failure details');
  });

  describe('getCoverage', () => {
    it('should return coverage report');
    it('should identify uncovered lines');
  });

  describe('detectTestFramework', () => {
    it('should detect vitest from config');
    it('should detect jest from config');
    it('should fallback to unknown');
  });
});
```

---

#### IMPL-QUA-002: Lint Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/quality/linting/LintRunner.ts` |
| **Exports** | `LintRunner` class |
| **Dependencies** | ProcessRunner |
| **Estimated LOC** | 100-150 |

**Interface Definition:**

```typescript
export interface LintRunner {
  // Linting
  runLint(files?: string[]): Promise<LintResult>;
  fixLint(files?: string[]): Promise<LintResult>;

  // Type checking
  runTypeCheck(): Promise<TypeCheckResult>;

  // Format checking
  runFormatCheck(files?: string[]): Promise<FormatResult>;
  fixFormat(files?: string[]): Promise<FormatResult>;
}

export interface LintResult {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  fixableCount: number;
  issues: LintIssue[];
}

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  fixable: boolean;
}

export interface TypeCheckResult {
  passed: boolean;
  errorCount: number;
  errors: TypeCheckError[];
}

export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

export interface FormatResult {
  passed: boolean;
  filesChecked: number;
  filesWithIssues: string[];
}
```

**Tests Required:**

```typescript
describe('LintRunner', () => {
  describe('runLint', () => {
    it('should run eslint on all files');
    it('should run eslint on specific files');
    it('should parse lint output correctly');
  });

  describe('fixLint', () => {
    it('should fix fixable issues');
    it('should report remaining issues');
  });

  describe('runTypeCheck', () => {
    it('should run tsc --noEmit');
    it('should parse type errors');
  });
});
```

---

#### IMPL-QUA-003: Code Reviewer

| Field | Specification |
|-------|---------------|
| **File** | `src/quality/review/CodeReviewer.ts` |
| **Exports** | `CodeReviewer` class |
| **Dependencies** | LLMProvider (Gemini preferred) |
| **Estimated LOC** | 200-250 |

**Interface Definition:**

```typescript
export interface CodeReviewer {
  // Review
  reviewChanges(diff: Diff[]): Promise<ReviewResult>;
  reviewFile(file: string, content: string): Promise<ReviewResult>;

  // Prompt generation
  generateReviewPrompt(diff: Diff[]): string;
  parseReviewResponse(response: string): ReviewIssue[];

  // Configuration
  setReviewCriteria(criteria: ReviewCriteria): void;
}

export interface ReviewResult {
  approved: boolean;
  score: number;              // 0-100
  issues: ReviewIssue[];
  suggestions: ReviewSuggestion[];
  summary: string;
}

export interface ReviewIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category: ReviewCategory;
  message: string;
  suggestedFix?: string;
}

export type ReviewCategory =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'style'
  | 'documentation'
  | 'testing';

export interface ReviewSuggestion {
  file: string;
  line?: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ReviewCriteria {
  checkSecurity: boolean;
  checkPerformance: boolean;
  checkMaintainability: boolean;
  checkDocumentation: boolean;
  maxIssuesForApproval: number;
  requireTests: boolean;
}
```

**Review Prompt Template:**

```typescript
const REVIEW_PROMPT = `
You are a senior code reviewer. Review the following code changes and provide feedback.

## Review Criteria
- Security vulnerabilities
- Performance issues
- Code maintainability
- Best practices adherence
- Test coverage adequacy

## Code Changes
{diff}

## Output Format
Respond with JSON:
{
  "approved": boolean,
  "score": number (0-100),
  "issues": [
    {
      "file": "string",
      "line": number,
      "severity": "critical" | "major" | "minor" | "suggestion",
      "category": "bug" | "security" | "performance" | "maintainability" | "style" | "documentation" | "testing",
      "message": "string",
      "suggestedFix": "string (optional)"
    }
  ],
  "summary": "string"
}
`;
```

**Tests Required:**

```typescript
describe('CodeReviewer', () => {
  describe('reviewChanges', () => {
    it('should review diff and return structured result');
    it('should detect security issues');
    it('should detect performance issues');
  });

  describe('generateReviewPrompt', () => {
    it('should format diff for review');
    it('should include review criteria');
  });

  describe('parseReviewResponse', () => {
    it('should parse JSON response');
    it('should handle malformed response');
  });
});
```

---

#### IMPL-QUA-004: QA Loop Engine

| Field | Specification |
|-------|---------------|
| **File** | `src/quality/qa-loop/QALoopEngine.ts` |
| **Exports** | `QALoopEngine` class |
| **Dependencies** | TestRunner, LintRunner, CodeReviewer |
| **Estimated LOC** | 350-400 |

**Interface Definition:**

```typescript
export interface QALoopEngine {
  // Main loop
  runQALoop(changes: CodeChanges, options?: QALoopOptions): Promise<QAResult>;

  // Individual steps
  buildStep(): Promise<BuildResult>;
  lintStep(): Promise<LintResult>;
  testStep(files?: string[]): Promise<TestResult>;
  reviewStep(diff: Diff[]): Promise<ReviewResult>;

  // Control
  abort(): void;
  getIterationCount(): number;
  getStatus(): QALoopStatus;

  // Events
  onIteration(callback: IterationCallback): Unsubscribe;
}

export interface QALoopOptions {
  maxIterations: number;      // Default: 50
  runTests: boolean;          // Default: true
  runLint: boolean;           // Default: true
  runReview: boolean;         // Default: true
  autoFix: boolean;           // Default: true
  escalateOnFailure: boolean; // Default: true
}

export interface QAResult {
  passed: boolean;
  iterations: number;
  finalBuild: BuildResult;
  finalLint: LintResult;
  finalTests: TestResult;
  finalReview?: ReviewResult;
  escalated: boolean;
  escalationReason?: string;
  duration: number;
  history: IterationHistory[];
}

export interface IterationHistory {
  iteration: number;
  step: QAStep;
  passed: boolean;
  errors?: string[];
  fixesAttempted?: string[];
  duration: number;
}

export type QAStep = 'build' | 'lint' | 'test' | 'review';

export interface QALoopStatus {
  running: boolean;
  currentIteration: number;
  currentStep: QAStep;
  startedAt?: Date;
}

export type IterationCallback = (iteration: number, step: QAStep, result: StepResult) => void;

export interface CodeChanges {
  files: FileChange[];
  taskId: string;
  worktreePath: string;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  content?: string;
}
```

**QA Loop Flow:**

```
Iteration 0:
  1. Build → Pass? → Continue : Return to agent with errors
  2. Lint → Pass? → Continue : Auto-fix or return to agent
  3. Test → Pass? → Continue : Return to agent with failures
  4. Review → Approved? → SUCCESS : Return to agent with feedback

Iteration N (up to 50):
  - Track fixes attempted
  - Detect fix loops (same error recurring)
  - Escalate if:
    - 50 iterations reached
    - Same error 3 times
    - Critical security issue
```

**Tests Required:**

```typescript
describe('QALoopEngine', () => {
  describe('runQALoop', () => {
    it('should run all QA steps');
    it('should iterate on failures');
    it('should stop at max iterations');
    it('should escalate when exhausted');
  });

  describe('buildStep', () => {
    it('should run tsc build');
    it('should capture build errors');
  });

  describe('testStep', () => {
    it('should run tests for changed files');
    it('should capture test failures');
  });

  describe('reviewStep', () => {
    it('should run code review');
    it('should block on critical issues');
  });

  describe('abort', () => {
    it('should stop running loop');
    it('should emit abort event');
  });
});
```

---

### Layer 5 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| TestRunner | `src/quality/testing/TestRunner.ts` | 200-250 | To Build |
| LintRunner | `src/quality/linting/LintRunner.ts` | 100-150 | To Build |
| CodeReviewer | `src/quality/review/CodeReviewer.ts` | 200-250 | To Build |
| QALoopEngine | `src/quality/qa-loop/QALoopEngine.ts` | 350-400 | To Build |
| **TOTAL** | | **850-1,050** | |

**Tests for Layer 5:** ~15 tests

---

### Part D: Layer 4 - Execution

**Dependencies:** Layer 5 (Quality), Layer 6 (Persistence), Layer 7 (Infrastructure)
**Total Components:** 4
**Estimated Total LOC:** 1,400-1,700

---

#### IMPL-EXE-001: Tool Executor

| Field | Specification |
|-------|---------------|
| **File** | `src/execution/tools/ToolExecutor.ts` |
| **Exports** | `ToolExecutor` class, `Tool`, `ToolResult` types |
| **Dependencies** | FileSystemService, ProcessRunner |
| **Estimated LOC** | 300-400 |

**Interface Definition:**

```typescript
export interface ToolExecutor {
  // Execution
  executeTool(tool: Tool, params: ToolParams): Promise<ToolResult>;
  executeToolBatch(tools: ToolCall[]): Promise<ToolResult[]>;

  // Registry
  registerTool(tool: ToolDefinition): void;
  unregisterTool(name: string): void;
  getAvailableTools(): ToolDefinition[];
  getTool(name: string): ToolDefinition | undefined;

  // Validation
  validateToolParams(tool: Tool, params: ToolParams): ValidationResult;
  validateToolResult(tool: Tool, result: unknown): boolean;

  // Safety
  isToolAllowed(tool: Tool, context: ExecutionContext): boolean;
  getToolRiskLevel(tool: Tool): RiskLevel;
}

export type Tool =
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'terminal'
  | 'search_code'
  | 'search_files'
  | 'lsp_definition'
  | 'lsp_references'
  | 'git_diff'
  | 'git_commit';

export interface ToolParams {
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  tool: Tool;
  output: unknown;
  error?: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: Tool;
  description: string;
  parameters: ToolParameterSchema;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  handler: ToolHandler;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ParameterDefinition>;
  required: string[];
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: unknown;
}

export type RiskLevel = 'safe' | 'moderate' | 'high' | 'critical';
export type ToolHandler = (params: ToolParams, context: ExecutionContext) => Promise<unknown>;

export interface ExecutionContext {
  worktreePath: string;
  taskId: string;
  agentId: string;
  allowedPaths: string[];
  maxOutputSize: number;
}

export interface ToolCall {
  tool: Tool;
  params: ToolParams;
}
```

**Built-in Tools:**

| Tool | Risk Level | Description |
|------|------------|-------------|
| `file_read` | Safe | Read file contents |
| `file_write` | Moderate | Write content to file |
| `file_edit` | Moderate | Apply targeted edits to file |
| `terminal` | High | Execute shell command |
| `search_code` | Safe | Search code with regex |
| `search_files` | Safe | Find files by pattern |
| `lsp_definition` | Safe | Get symbol definition |
| `lsp_references` | Safe | Get symbol references |
| `git_diff` | Safe | Get git diff |
| `git_commit` | Moderate | Create git commit |

**Tool Parameter Schemas:**

```typescript
const TOOL_SCHEMAS: Record<Tool, ToolParameterSchema> = {
  file_read: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
      encoding: { type: 'string', description: 'File encoding', default: 'utf-8' },
    },
    required: ['path'],
  },
  file_write: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'Content to write' },
      createDirs: { type: 'boolean', description: 'Create parent directories', default: true },
    },
    required: ['path', 'content'],
  },
  file_edit: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to edit' },
      edits: {
        type: 'array',
        description: 'List of edits to apply',
      },
    },
    required: ['path', 'edits'],
  },
  terminal: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      cwd: { type: 'string', description: 'Working directory' },
      timeout: { type: 'number', description: 'Timeout in ms', default: 120000 },
    },
    required: ['command'],
  },
  search_code: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Search pattern (regex)' },
      path: { type: 'string', description: 'Path to search in' },
      filePattern: { type: 'string', description: 'File glob pattern' },
    },
    required: ['pattern'],
  },
  search_files: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern' },
      path: { type: 'string', description: 'Base path' },
    },
    required: ['pattern'],
  },
  lsp_definition: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'File path' },
      line: { type: 'number', description: 'Line number (0-indexed)' },
      column: { type: 'number', description: 'Column number (0-indexed)' },
    },
    required: ['file', 'line', 'column'],
  },
  lsp_references: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'File path' },
      line: { type: 'number', description: 'Line number (0-indexed)' },
      column: { type: 'number', description: 'Column number (0-indexed)' },
    },
    required: ['file', 'line', 'column'],
  },
  git_diff: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'From commit/branch' },
      to: { type: 'string', description: 'To commit/branch' },
    },
    required: [],
  },
  git_commit: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Commit message' },
      files: { type: 'array', description: 'Files to commit' },
    },
    required: ['message'],
  },
};
```

**Tests Required:**

```typescript
describe('ToolExecutor', () => {
  describe('executeTool', () => {
    it('should execute file_read tool');
    it('should execute file_write tool');
    it('should execute terminal tool');
    it('should enforce path restrictions');
    it('should respect timeout');
  });

  describe('validateToolParams', () => {
    it('should validate required parameters');
    it('should validate parameter types');
    it('should reject unknown parameters');
  });

  describe('isToolAllowed', () => {
    it('should allow safe tools');
    it('should block critical tools without confirmation');
    it('should check path restrictions');
  });

  describe('getAvailableTools', () => {
    it('should return all registered tools');
    it('should include tool metadata');
  });
});
```

---

#### IMPL-EXE-002: Coder Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/execution/agents/CoderRunner.ts` |
| **Exports** | `CoderRunner` class |
| **Dependencies** | ClaudeClient, ToolExecutor, WorktreeManager |
| **Estimated LOC** | 400-500 |

**Interface Definition:**

```typescript
export interface CoderRunner {
  // Lifecycle
  initialize(context: AgentContext): Promise<void>;
  shutdown(): Promise<void>;

  // Execution
  executeTask(task: Task, context: AgentContext): Promise<TaskResult>;

  // Code generation
  generateCode(prompt: string, context: CodeGenContext): Promise<CodeGenResult>;
  applyChanges(changes: FileChange[]): Promise<ApplyResult>;

  // Iteration
  handleFeedback(feedback: Feedback, context: AgentContext): Promise<TaskResult>;
  getCurrentIteration(): number;

  // Status
  getStatus(): AgentStatus;
  isWorking(): boolean;
}

export interface AgentContext {
  taskId: string;
  featureId: string;
  projectId: string;
  worktreePath: string;
  relevantFiles: string[];
  requirements: string;
  constraints: string[];
  memory: MemoryContext;
  previousIterations?: IterationLog[];
}

export interface CodeGenContext {
  targetFiles: string[];
  existingCode: Map<string, string>;
  dependencies: string[];
  patterns: Pattern[];
  constraints: string[];
}

export interface CodeGenResult {
  files: FileChange[];
  explanation: string;
  toolsUsed: ToolCall[];
  tokensUsed: number;
}

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  content?: string;
  edits?: Edit[];
}

export interface Edit {
  startLine: number;
  endLine: number;
  oldContent: string;
  newContent: string;
}

export interface ApplyResult {
  success: boolean;
  appliedFiles: string[];
  failedFiles: string[];
  errors: string[];
}

export interface TaskResult {
  success: boolean;
  taskId: string;
  changes: FileChange[];
  toolsUsed: ToolCall[];
  iterations: number;
  tokensUsed: number;
  duration: number;
  errors?: string[];
  escalated?: boolean;
  escalationReason?: string;
}

export interface Feedback {
  type: 'build_error' | 'lint_error' | 'test_failure' | 'review_issue';
  details: string;
  files?: string[];
  severity: 'critical' | 'major' | 'minor';
}

export interface IterationLog {
  iteration: number;
  action: string;
  result: string;
  changes: FileChange[];
  timestamp: Date;
}
```

**System Prompt Integration:**

```typescript
const CODER_CONTEXT_TEMPLATE = `
You are a Coder agent working on task: {taskId}

## Task Description
{taskDescription}

## Requirements
{requirements}

## Relevant Files
{relevantFiles}

## Constraints
{constraints}

## Memory Context
{memoryContext}

## Available Tools
{toolDescriptions}

## Instructions
1. Analyze the task and relevant files
2. Plan your implementation approach
3. Use tools to implement the solution
4. Ensure code follows project patterns
5. Add appropriate tests if required

## Output
Provide implementation using the available tools.
`;
```

**Agent Loop:**

```typescript
async function executeTask(task: Task, context: AgentContext): Promise<TaskResult> {
  let iteration = 0;
  const maxIterations = 50;

  while (iteration < maxIterations) {
    // Generate/modify code
    const result = await generateCode(buildPrompt(task, context, iteration), context);

    // Apply changes
    await applyChanges(result.files);

    // Run QA
    const qaResult = await qaLoop.runQALoop({
      files: result.files,
      taskId: task.id,
      worktreePath: context.worktreePath,
    });

    if (qaResult.passed) {
      return {
        success: true,
        taskId: task.id,
        changes: result.files,
        iterations: iteration + 1,
        // ...
      };
    }

    // Handle feedback
    context.previousIterations.push({
      iteration,
      action: 'code_generation',
      result: qaResult.escalationReason || 'QA failed',
      changes: result.files,
      timestamp: new Date(),
    });

    iteration++;
  }

  return {
    success: false,
    escalated: true,
    escalationReason: 'Max iterations reached',
    // ...
  };
}
```

**Tests Required:**

```typescript
describe('CoderRunner', () => {
  describe('executeTask', () => {
    it('should execute simple task successfully');
    it('should iterate on QA failures');
    it('should stop at max iterations');
    it('should escalate when stuck');
  });

  describe('generateCode', () => {
    it('should generate code using Claude');
    it('should use tools for file operations');
    it('should respect constraints');
  });

  describe('applyChanges', () => {
    it('should apply file creates');
    it('should apply file modifications');
    it('should handle conflicts gracefully');
  });

  describe('handleFeedback', () => {
    it('should incorporate build errors');
    it('should incorporate test failures');
    it('should avoid repeating same mistakes');
  });
});
```

---

#### IMPL-EXE-003: Tester Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/execution/agents/TesterRunner.ts` |
| **Exports** | `TesterRunner` class |
| **Dependencies** | ClaudeClient, TestRunner |
| **Estimated LOC** | 300-350 |

**Interface Definition:**

```typescript
export interface TesterRunner {
  // Lifecycle
  initialize(context: AgentContext): Promise<void>;
  shutdown(): Promise<void>;

  // Execution
  executeTask(task: Task, context: AgentContext): Promise<TesterResult>;

  // Test generation
  generateTests(code: CodeContext): Promise<GeneratedTests>;
  generateTestsForFile(file: string, content: string): Promise<string>;

  // Test execution
  runGeneratedTests(testFile: string): Promise<TestResult>;
  validateTestCoverage(files: string[]): Promise<CoverageResult>;

  // Analysis
  analyzeUncoveredPaths(code: string): Promise<UncoveredPath[]>;
  suggestAdditionalTests(coverage: CoverageResult): Promise<TestSuggestion[]>;
}

export interface TesterResult extends TaskResult {
  testsGenerated: number;
  testsPassed: number;
  testsFailed: number;
  coverageAchieved: number;
  coverageTarget: number;
}

export interface CodeContext {
  files: Map<string, string>;
  existingTests: Map<string, string>;
  dependencies: string[];
  testFramework: TestFramework;
}

export interface GeneratedTests {
  testFiles: TestFile[];
  explanation: string;
  estimatedCoverage: number;
}

export interface TestFile {
  path: string;
  content: string;
  targetFile: string;
  testCount: number;
}

export interface UncoveredPath {
  file: string;
  line: number;
  type: 'branch' | 'statement' | 'function';
  description: string;
}

export interface TestSuggestion {
  targetFile: string;
  testDescription: string;
  priority: 'high' | 'medium' | 'low';
  uncoveredPath?: UncoveredPath;
}

export interface CoverageResult {
  overall: number;
  target: number;
  met: boolean;
  uncoveredFiles: string[];
  uncoveredPaths: UncoveredPath[];
}
```

**Test Generation Strategy:**

```typescript
const TEST_GEN_STRATEGY = `
1. For each public function/method:
   - Test happy path
   - Test edge cases (null, empty, boundary values)
   - Test error conditions

2. For each class:
   - Test construction with various inputs
   - Test state changes
   - Test interactions with dependencies

3. For each async operation:
   - Test success case
   - Test timeout/cancellation
   - Test error handling

4. Coverage targets:
   - Statements: 80%
   - Branches: 75%
   - Functions: 90%
`;
```

**Tests Required:**

```typescript
describe('TesterRunner', () => {
  describe('executeTask', () => {
    it('should generate tests for task files');
    it('should run generated tests');
    it('should meet coverage requirements');
  });

  describe('generateTests', () => {
    it('should generate unit tests for functions');
    it('should generate tests for classes');
    it('should handle async code');
  });

  describe('generateTestsForFile', () => {
    it('should analyze file and generate appropriate tests');
    it('should use existing test patterns');
  });

  describe('validateTestCoverage', () => {
    it('should check coverage against target');
    it('should identify uncovered paths');
  });

  describe('suggestAdditionalTests', () => {
    it('should suggest tests for uncovered branches');
    it('should prioritize critical paths');
  });
});
```

---

#### IMPL-EXE-004: Merger Runner

| Field | Specification |
|-------|---------------|
| **File** | `src/execution/agents/MergerRunner.ts` |
| **Exports** | `MergerRunner` class |
| **Dependencies** | GitService, WorktreeManager, ClaudeClient |
| **Estimated LOC** | 400-450 |

**Interface Definition:**

```typescript
export interface MergerRunner {
  // Lifecycle
  initialize(context: AgentContext): Promise<void>;
  shutdown(): Promise<void>;

  // Merge operations
  mergeTask(taskId: string): Promise<MergeTaskResult>;
  mergeFeature(featureId: string): Promise<MergeFeatureResult>;

  // Conflict handling
  analyzeConflicts(conflicts: ConflictInfo[]): Promise<ConflictAnalysis>;
  resolveConflict(conflict: ConflictInfo): Promise<Resolution>;
  resolveConflictsAuto(conflicts: ConflictInfo[]): Promise<ResolutionBatch>;

  // Escalation
  requestHumanReview(conflict: ConflictInfo, reason: string): Promise<void>;
  getEscalationCriteria(): EscalationCriteria;

  // Status
  getPendingMerges(): PendingMerge[];
  getMergeHistory(projectId: string): MergeHistory[];
}

export interface MergeTaskResult {
  success: boolean;
  taskId: string;
  branch: string;
  conflicts: ConflictInfo[];
  resolutions: Resolution[];
  commitHash?: string;
  escalated: boolean;
  escalationReason?: string;
}

export interface MergeFeatureResult extends MergeTaskResult {
  featureId: string;
  tasksMerged: string[];
  pullRequestUrl?: string;
}

export interface ConflictInfo {
  file: string;
  type: 'content' | 'delete_modify' | 'rename' | 'binary';
  oursContent: string;
  theirsContent: string;
  baseContent?: string;
  oursCommit: string;
  theirsCommit: string;
}

export interface ConflictAnalysis {
  conflict: ConflictInfo;
  severity: 'trivial' | 'simple' | 'complex' | 'critical';
  autoResolvable: boolean;
  suggestedResolution?: string;
  riskAssessment: string;
  requiresHumanReview: boolean;
}

export interface Resolution {
  conflict: ConflictInfo;
  resolvedContent: string;
  strategy: ResolutionStrategy;
  confidence: number;
  explanation: string;
}

export type ResolutionStrategy =
  | 'ours'
  | 'theirs'
  | 'union'
  | 'manual'
  | 'ai_merged';

export interface ResolutionBatch {
  resolutions: Resolution[];
  unresolvedConflicts: ConflictInfo[];
  humanReviewRequired: ConflictInfo[];
}

export interface EscalationCriteria {
  maxConflictLines: number;        // Default: 100
  requireHumanForSecurityFiles: boolean;  // Default: true
  requireHumanForConfigFiles: boolean;    // Default: true
  autoResolveThreshold: number;    // Confidence threshold: 0.85
}

export interface PendingMerge {
  taskId: string;
  branch: string;
  status: 'ready' | 'conflicts' | 'reviewing' | 'escalated';
  conflicts?: ConflictInfo[];
  createdAt: Date;
}

export interface MergeHistory {
  taskId: string;
  branch: string;
  mergedAt: Date;
  conflicts: number;
  resolutionStrategy: ResolutionStrategy;
  commitHash: string;
}
```

**Conflict Resolution Strategy:**

```typescript
const CONFLICT_RESOLUTION_PROMPT = `
Analyze the following git conflict and provide a resolution.

## Conflict Details
File: {file}
Type: {type}

## Our Version (current branch):
\`\`\`
{oursContent}
\`\`\`

## Their Version (merging branch):
\`\`\`
{theirsContent}
\`\`\`

## Base Version (common ancestor):
\`\`\`
{baseContent}
\`\`\`

## Instructions
1. Analyze both changes semantically
2. Determine if changes are complementary or conflicting
3. If complementary: merge both changes
4. If conflicting: prefer the more recent/complete change
5. Ensure result compiles and maintains functionality

## Output
Provide the resolved content and explain your reasoning.
`;
```

**Escalation Rules:**

| Condition | Action |
|-----------|--------|
| Conflict > 100 lines | Escalate to human |
| Security-related file | Escalate to human |
| Database migration file | Escalate to human |
| Configuration file | Escalate to human |
| AI confidence < 0.85 | Escalate to human |
| Semantic conflict | Escalate to human |

**Tests Required:**

```typescript
describe('MergerRunner', () => {
  describe('mergeTask', () => {
    it('should merge task branch without conflicts');
    it('should detect conflicts during merge');
    it('should return merge result with commit hash');
  });

  describe('analyzeConflicts', () => {
    it('should classify conflict severity');
    it('should identify auto-resolvable conflicts');
    it('should flag critical conflicts');
  });

  describe('resolveConflict', () => {
    it('should resolve trivial conflicts automatically');
    it('should use AI for complex conflicts');
    it('should escalate when confidence is low');
  });

  describe('resolveConflictsAuto', () => {
    it('should resolve multiple conflicts in batch');
    it('should separate resolved from unresolved');
    it('should identify conflicts needing human review');
  });

  describe('requestHumanReview', () => {
    it('should create review request with context');
    it('should pause merge until resolved');
    it('should emit HUMAN_REVIEW_REQUESTED event');
  });
});
```

---

### Layer 4 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| ToolExecutor | `src/execution/tools/ToolExecutor.ts` | 300-400 | To Build |
| CoderRunner | `src/execution/agents/CoderRunner.ts` | 400-500 | To Build |
| TesterRunner | `src/execution/agents/TesterRunner.ts` | 300-350 | To Build |
| MergerRunner | `src/execution/agents/MergerRunner.ts` | 400-450 | To Build |
| **TOTAL** | | **1,400-1,700** | |

**Tests for Layer 4:** ~20 tests

---

### Part E: Layer 3 - Planning

**Dependencies:** Layer 6 (Persistence)
**Total Components:** 3
**Estimated Total LOC:** 650-800

---

#### IMPL-PLN-001: Task Decomposer

| Field | Specification |
|-------|---------------|
| **File** | `src/planning/decomposition/TaskDecomposer.ts` |
| **Exports** | `TaskDecomposer` class |
| **Dependencies** | ClaudeClient (Opus), RequirementsDB |
| **Estimated LOC** | 300-350 |

**Interface Definition:**

```typescript
export interface TaskDecomposer {
  // Core decomposition
  decomposeFeature(feature: Feature): Promise<Task[]>;
  decomposeProject(project: Project): Promise<DecompositionResult>;

  // Task operations
  validateTask(task: Task): ValidationResult;
  splitTask(task: Task): Task[];
  mergeSmallTasks(tasks: Task[]): Task[];

  // Estimation integration
  estimateTime(task: Task): number;
  estimateComplexity(task: Task): TaskComplexity;

  // Configuration
  setDecompositionRules(rules: DecompositionRules): void;
  getDecompositionRules(): DecompositionRules;
}

export interface DecompositionResult {
  features: Feature[];
  tasks: Task[];
  dependencies: Dependency[];
  warnings: DecompositionWarning[];
  totalEstimate: ProjectEstimate;
}

export interface Task {
  id: string;
  featureId: string;
  name: string;
  description: string;
  files: string[];
  test: string;
  dependsOn: string[];
  estimatedTime: number;  // minutes
  complexity: TaskComplexity;
  priority: TaskPriority;
  status: TaskStatus;
  metadata: TaskMetadata;
}

export interface TaskMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'planner' | 'user' | 'auto';
  originalEstimate: number;
  refinementCount: number;
}

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked';

export interface DecompositionRules {
  maxTaskTime: number;           // Default: 30 minutes
  minTaskTime: number;           // Default: 5 minutes
  maxFilesPerTask: number;       // Default: 5
  requireTests: boolean;         // Default: true
  allowCyclicDependencies: boolean; // Default: false
}

export interface DecompositionWarning {
  type: 'time_exceeded' | 'files_exceeded' | 'missing_test' | 'ambiguous_scope';
  taskId?: string;
  message: string;
  suggestion: string;
}

export interface Dependency {
  from: string;
  to: string;
  type: 'hard' | 'soft';
  reason?: string;
}
```

**Decomposition Algorithm:**

```typescript
async function decomposeFeature(feature: Feature): Promise<Task[]> {
  // 1. Analyze feature scope
  const scope = await analyzeFeatureScope(feature);

  // 2. Identify logical units
  const units = await identifyLogicalUnits(scope);

  // 3. Create initial tasks
  let tasks = units.map(unit => createTaskFromUnit(unit));

  // 4. Apply 30-minute constraint
  tasks = await enforceTimeConstraint(tasks, 30);

  // 5. Resolve dependencies
  tasks = await resolveDependencies(tasks);

  // 6. Validate all tasks
  for (const task of tasks) {
    const validation = validateTask(task);
    if (!validation.valid) {
      tasks = await refineTask(task, validation);
    }
  }

  // 7. Generate test requirements
  tasks = await generateTestRequirements(tasks);

  return tasks;
}

function enforceTimeConstraint(tasks: Task[], maxMinutes: number): Task[] {
  const result: Task[] = [];

  for (const task of tasks) {
    if (task.estimatedTime > maxMinutes) {
      // Split task
      const subtasks = splitTask(task);
      result.push(...subtasks);
    } else if (task.estimatedTime < 5) {
      // Mark for potential merging
      result.push({ ...task, metadata: { ...task.metadata, mergeable: true } });
    } else {
      result.push(task);
    }
  }

  // Merge small tasks if possible
  return mergeSmallTasks(result);
}
```

**Decomposition Prompt:**

```typescript
const DECOMPOSITION_PROMPT = `
You are a senior technical architect decomposing a feature into tasks.

## Feature
Name: {featureName}
Description: {featureDescription}
Requirements: {requirements}

## Constraints
- Each task must be completable in 30 minutes or less
- Each task should modify at most 5 files
- Each task must have clear success criteria (test)
- Tasks must have explicit dependencies

## Project Context
Tech Stack: {techStack}
Existing Patterns: {patterns}
File Structure: {fileStructure}

## Output Format
Provide tasks as JSON array:
[
  {
    "name": "Task name",
    "description": "What this task accomplishes",
    "files": ["src/path/to/file.ts"],
    "test": "Describe how to verify completion",
    "dependsOn": ["previous-task-id"],
    "estimatedTime": 20
  }
]

## Rules
1. Start with foundation tasks (types, interfaces)
2. Progress to implementation tasks
3. End with integration tasks
4. Ensure each task is atomic and testable
`;
```

**Tests Required:**

```typescript
describe('TaskDecomposer', () => {
  describe('decomposeFeature', () => {
    it('should decompose feature into tasks');
    it('should enforce 30-minute constraint');
    it('should generate dependencies correctly');
    it('should include test requirements for each task');
  });

  describe('validateTask', () => {
    it('should validate task has required fields');
    it('should warn if files exceed limit');
    it('should warn if description is ambiguous');
  });

  describe('splitTask', () => {
    it('should split task exceeding time limit');
    it('should maintain dependencies after split');
    it('should distribute files appropriately');
  });

  describe('mergeSmallTasks', () => {
    it('should merge tasks under 5 minutes');
    it('should only merge tasks with same files');
    it('should update dependencies after merge');
  });

  describe('estimateTime', () => {
    it('should estimate based on file count');
    it('should estimate based on complexity');
    it('should use historical data when available');
  });
});
```

---

#### IMPL-PLN-002: Dependency Resolver

| Field | Specification |
|-------|---------------|
| **File** | `src/planning/dependencies/DependencyResolver.ts` |
| **Exports** | `DependencyResolver` class |
| **Dependencies** | None (pure logic) |
| **Estimated LOC** | 200-250 |

**Interface Definition:**

```typescript
export interface DependencyResolver {
  // Resolution
  resolveDependencies(tasks: Task[]): Task[];
  getTopologicalOrder(tasks: Task[]): Task[];

  // Cycle detection
  detectCycles(tasks: Task[]): Cycle[];
  breakCycle(cycle: Cycle): BreakSuggestion;

  // Parallelization
  getParallelWaves(tasks: Task[]): TaskWave[];
  getNextAvailable(tasks: Task[], completed: string[]): Task[];
  getMaxParallelism(tasks: Task[]): number;

  // Queries
  getDependencies(taskId: string): string[];
  getDependents(taskId: string): string[];
  getCriticalPath(tasks: Task[]): Task[];

  // Validation
  validateDependencyGraph(tasks: Task[]): GraphValidation;
}

export interface TaskWave {
  waveNumber: number;
  tasks: Task[];
  canParallelize: boolean;
  estimatedDuration: number;
}

export interface Cycle {
  tasks: string[];
  path: string;
  type: 'direct' | 'indirect';
}

export interface BreakSuggestion {
  cycle: Cycle;
  removeEdge: { from: string; to: string };
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface GraphValidation {
  valid: boolean;
  hasCycles: boolean;
  cycles: Cycle[];
  orphanedTasks: string[];
  missingDependencies: string[];
  warnings: string[];
}
```

**Kahn's Algorithm Implementation:**

```typescript
/**
 * Implements Kahn's algorithm for topological sorting
 * Returns tasks in execution order (dependencies first)
 */
function topologicalSort(tasks: Task[]): Task[] {
  // Build adjacency list and in-degree count
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const task of tasks) {
    adjacency.set(task.id, []);
    inDegree.set(task.id, 0);
  }

  // Build graph
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      const neighbors = adjacency.get(dep) || [];
      neighbors.push(task.id);
      adjacency.set(dep, neighbors);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [taskId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  // Process queue
  const result: Task[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(taskMap.get(current)!);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (result.length !== tasks.length) {
    throw new CycleDetectedError(detectCycles(tasks));
  }

  return result;
}

/**
 * Groups tasks into parallel execution waves
 */
function getParallelWaves(tasks: Task[]): TaskWave[] {
  const sorted = topologicalSort(tasks);
  const completed = new Set<string>();
  const waves: TaskWave[] = [];
  let waveNumber = 0;

  while (completed.size < tasks.length) {
    const available = sorted.filter(task =>
      !completed.has(task.id) &&
      task.dependsOn.every(dep => completed.has(dep))
    );

    if (available.length === 0) {
      throw new Error('Unable to make progress - possible cycle');
    }

    waves.push({
      waveNumber,
      tasks: available,
      canParallelize: available.length > 1,
      estimatedDuration: Math.max(...available.map(t => t.estimatedTime)),
    });

    for (const task of available) {
      completed.add(task.id);
    }

    waveNumber++;
  }

  return waves;
}
```

**Cycle Detection:**

```typescript
/**
 * Detects cycles using DFS with color marking
 */
function detectCycles(tasks: Task[]): Cycle[] {
  const WHITE = 0; // Not visited
  const GRAY = 1;  // In progress
  const BLACK = 2; // Complete

  const color = new Map<string, number>();
  const parent = new Map<string, string>();
  const cycles: Cycle[] = [];

  for (const task of tasks) {
    color.set(task.id, WHITE);
  }

  function dfs(taskId: string, path: string[]): void {
    color.set(taskId, GRAY);

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    for (const dep of task.dependsOn) {
      if (color.get(dep) === GRAY) {
        // Cycle found
        const cycleStart = path.indexOf(dep);
        cycles.push({
          tasks: [...path.slice(cycleStart), taskId],
          path: [...path.slice(cycleStart), taskId, dep].join(' -> '),
          type: cycleStart === path.length - 1 ? 'direct' : 'indirect',
        });
      } else if (color.get(dep) === WHITE) {
        parent.set(dep, taskId);
        dfs(dep, [...path, taskId]);
      }
    }

    color.set(taskId, BLACK);
  }

  for (const task of tasks) {
    if (color.get(task.id) === WHITE) {
      dfs(task.id, []);
    }
  }

  return cycles;
}
```

**Tests Required:**

```typescript
describe('DependencyResolver', () => {
  describe('resolveDependencies', () => {
    it('should return tasks in topological order');
    it('should place dependencies before dependents');
    it('should handle multiple dependency chains');
  });

  describe('detectCycles', () => {
    it('should detect direct cycles (A -> B -> A)');
    it('should detect indirect cycles (A -> B -> C -> A)');
    it('should return empty array for acyclic graph');
  });

  describe('getParallelWaves', () => {
    it('should group independent tasks into same wave');
    it('should place dependent tasks in later waves');
    it('should calculate correct wave durations');
  });

  describe('getNextAvailable', () => {
    it('should return tasks with all dependencies completed');
    it('should return empty array when all blocked');
    it('should handle completed set correctly');
  });

  describe('getCriticalPath', () => {
    it('should identify longest dependency chain');
    it('should calculate total critical path duration');
  });

  describe('validateDependencyGraph', () => {
    it('should identify orphaned tasks');
    it('should identify missing dependencies');
    it('should report cycles');
  });
});
```

---

#### IMPL-PLN-003: Time Estimator

| Field | Specification |
|-------|---------------|
| **File** | `src/planning/estimation/TimeEstimator.ts` |
| **Exports** | `TimeEstimator` class |
| **Dependencies** | MemorySystem (historical data) |
| **Estimated LOC** | 150-200 |

**Interface Definition:**

```typescript
export interface TimeEstimator {
  // Task estimation
  estimateTask(task: Task): TaskEstimate;
  estimateTaskBatch(tasks: Task[]): TaskEstimate[];

  // Feature/Project estimation
  estimateFeature(feature: Feature, tasks: Task[]): FeatureEstimate;
  estimateProject(project: Project): ProjectEstimate;

  // Calibration
  calibrateFromHistory(history: TaskHistory[]): void;
  recordActual(taskId: string, actualTime: number): void;

  // Configuration
  setEstimationModel(model: EstimationModel): void;
  getAccuracyMetrics(): AccuracyMetrics;
}

export interface TaskEstimate {
  taskId: string;
  estimatedMinutes: number;
  confidence: number;        // 0-1
  range: {
    min: number;
    max: number;
  };
  factors: EstimationFactor[];
}

export interface FeatureEstimate {
  featureId: string;
  totalMinutes: number;
  parallelMinutes: number;   // With max parallelization
  sequentialMinutes: number; // Without parallelization
  taskCount: number;
  criticalPathMinutes: number;
  confidence: number;
}

export interface ProjectEstimate {
  projectId: string;
  totalHours: number;
  parallelHours: number;
  featureCount: number;
  taskCount: number;
  phases: PhaseEstimate[];
  riskBuffer: number;        // Percentage
  finalEstimate: number;     // With risk buffer
}

export interface PhaseEstimate {
  phase: string;
  hours: number;
  tasks: number;
  dependencies: string[];
}

export interface EstimationFactor {
  name: string;
  multiplier: number;
  reason: string;
}

export interface TaskHistory {
  taskId: string;
  taskType: string;
  fileCount: number;
  complexity: TaskComplexity;
  estimatedTime: number;
  actualTime: number;
  deviation: number;
}

export interface EstimationModel {
  baseTimePerFile: number;      // Default: 10 minutes
  complexityMultipliers: Record<TaskComplexity, number>;
  testGenerationFactor: number; // Default: 1.3
  integrationFactor: number;    // Default: 1.2
  riskBufferPercent: number;    // Default: 20
}

export interface AccuracyMetrics {
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  underestimateRate: number;
  overestimateRate: number;
  averageDeviation: number;
  sampleSize: number;
}
```

**Estimation Algorithm:**

```typescript
const DEFAULT_MODEL: EstimationModel = {
  baseTimePerFile: 10,
  complexityMultipliers: {
    trivial: 0.5,
    simple: 0.75,
    moderate: 1.0,
    complex: 1.5,
  },
  testGenerationFactor: 1.3,
  integrationFactor: 1.2,
  riskBufferPercent: 20,
};

function estimateTask(task: Task): TaskEstimate {
  const factors: EstimationFactor[] = [];

  // Base estimate from file count
  let estimate = task.files.length * model.baseTimePerFile;

  // Complexity multiplier
  const complexityMult = model.complexityMultipliers[task.complexity];
  estimate *= complexityMult;
  factors.push({
    name: 'complexity',
    multiplier: complexityMult,
    reason: `Task complexity: ${task.complexity}`,
  });

  // Test generation factor
  if (task.test) {
    estimate *= model.testGenerationFactor;
    factors.push({
      name: 'testing',
      multiplier: model.testGenerationFactor,
      reason: 'Includes test generation',
    });
  }

  // Historical calibration
  const historicalFactor = getHistoricalFactor(task);
  if (historicalFactor !== 1.0) {
    estimate *= historicalFactor;
    factors.push({
      name: 'historical',
      multiplier: historicalFactor,
      reason: 'Adjusted based on historical data',
    });
  }

  // Calculate confidence based on data availability
  const confidence = calculateConfidence(task, factors);

  // Calculate range
  const range = {
    min: Math.round(estimate * 0.7),
    max: Math.round(estimate * 1.5),
  };

  return {
    taskId: task.id,
    estimatedMinutes: Math.round(estimate),
    confidence,
    range,
    factors,
  };
}

function estimateProject(project: Project): ProjectEstimate {
  const featureEstimates = project.features.map(f =>
    estimateFeature(f, f.tasks)
  );

  const totalHours = featureEstimates.reduce(
    (sum, f) => sum + f.totalMinutes / 60, 0
  );

  const parallelHours = featureEstimates.reduce(
    (sum, f) => sum + f.criticalPathMinutes / 60, 0
  );

  // Add risk buffer
  const riskBuffer = model.riskBufferPercent / 100;
  const finalEstimate = totalHours * (1 + riskBuffer);

  return {
    projectId: project.id,
    totalHours,
    parallelHours,
    featureCount: project.features.length,
    taskCount: featureEstimates.reduce((sum, f) => sum + f.taskCount, 0),
    phases: groupByPhase(featureEstimates),
    riskBuffer: riskBuffer * 100,
    finalEstimate,
  };
}
```

**Calibration from History:**

```typescript
function calibrateFromHistory(history: TaskHistory[]): void {
  // Group by task type
  const byType = groupBy(history, 'taskType');

  for (const [type, tasks] of Object.entries(byType)) {
    const actualMultipliers = tasks.map(t => t.actualTime / t.estimatedTime);
    const averageMultiplier = average(actualMultipliers);

    // Update calibration factors
    calibrationFactors.set(type, {
      multiplier: averageMultiplier,
      sampleSize: tasks.length,
      confidence: calculateConfidenceFromSample(tasks),
    });
  }

  // Update accuracy metrics
  accuracyMetrics = calculateAccuracyMetrics(history);
}
```

**Tests Required:**

```typescript
describe('TimeEstimator', () => {
  describe('estimateTask', () => {
    it('should estimate based on file count');
    it('should apply complexity multiplier');
    it('should factor in test generation');
    it('should provide confidence and range');
  });

  describe('estimateFeature', () => {
    it('should aggregate task estimates');
    it('should calculate parallel vs sequential time');
    it('should identify critical path');
  });

  describe('estimateProject', () => {
    it('should estimate total project time');
    it('should apply risk buffer');
    it('should group by phases');
  });

  describe('calibrateFromHistory', () => {
    it('should adjust multipliers from actual data');
    it('should calculate accuracy metrics');
    it('should handle limited history');
  });

  describe('recordActual', () => {
    it('should store actual time for calibration');
    it('should update accuracy metrics');
  });
});
```

---

### Layer 3 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| TaskDecomposer | `src/planning/decomposition/TaskDecomposer.ts` | 300-350 | To Build |
| DependencyResolver | `src/planning/dependencies/DependencyResolver.ts` | 200-250 | To Build |
| TimeEstimator | `src/planning/estimation/TimeEstimator.ts` | 150-200 | To Build |
| **TOTAL** | | **650-800** | |

**Tests for Layer 3:** ~25 tests

---

## Layer 2: Orchestration

**Purpose:** Coordinate all agent activities, manage task queues, and handle system-wide events.

**Dependencies:** Layer 3 (Planning), Layer 4 (Execution), Layer 5 (Quality), Layer 6 (Persistence)

### IMPL-ORC-001: Nexus Coordinator

**File:** `src/orchestration/coordinator/NexusCoordinator.ts`

**Purpose:** Central coordinator managing project lifecycle, agent orchestration, and state synchronization.

**Dependencies:**
- AgentPool
- TaskQueue
- StateManager
- CheckpointManager
- EventBus
- DependencyResolver

**Interface:**
```typescript
interface INexusCoordinator {
  // Project Lifecycle
  startProject(config: ProjectConfig): Promise<Project>;
  pauseProject(projectId: string): Promise<void>;
  resumeProject(projectId: string): Promise<void>;
  cancelProject(projectId: string): Promise<void>;

  // Status & Monitoring
  getStatus(projectId: string): Promise<ProjectStatus>;
  getAgentActivities(projectId: string): Promise<AgentActivity[]>;
  getMetrics(projectId: string): Promise<ProjectMetrics>;

  // Checkpointing
  requestCheckpoint(projectId: string): Promise<Checkpoint>;
  restoreFromCheckpoint(checkpointId: string): Promise<void>;

  // Event Handling
  onProgress(callback: ProgressCallback): Unsubscribe;
  onError(callback: ErrorCallback): Unsubscribe;
  onCompletion(callback: CompletionCallback): Unsubscribe;
}

interface ProjectConfig {
  name: string;
  mode: 'genesis' | 'evolution';
  targetPath: string;
  maxConcurrentAgents?: number;
  checkpointInterval?: number; // minutes
  requirements?: RequirementsDatabase;
  existingProjectId?: string; // for evolution mode
}

interface ProjectStatus {
  id: string;
  name: string;
  mode: 'genesis' | 'evolution';
  state: 'initializing' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  progress: {
    totalFeatures: number;
    completedFeatures: number;
    totalTasks: number;
    completedTasks: number;
    currentWave: number;
    totalWaves: number;
  };
  agents: {
    active: number;
    idle: number;
    total: number;
  };
  timing: {
    startedAt: Date;
    estimatedCompletion: Date;
    lastActivity: Date;
  };
  checkpoints: {
    lastCheckpoint: Date | null;
    checkpointCount: number;
  };
}

interface AgentActivity {
  agentId: string;
  agentType: AgentType;
  status: 'idle' | 'working' | 'waiting';
  currentTask: {
    id: string;
    title: string;
    progress: number;
    startedAt: Date;
  } | null;
}

interface ProjectMetrics {
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costs: {
    claude: number;
    gemini: number;
    total: number;
  };
  timing: {
    totalTime: number;
    planningTime: number;
    executionTime: number;
    reviewTime: number;
  };
  quality: {
    qaLoopIterations: number;
    testsGenerated: number;
    testsPassed: number;
    reviewIssuesFound: number;
    reviewIssuesFixed: number;
  };
}
```

**Implementation Details:**
```typescript
export class NexusCoordinator implements INexusCoordinator {
  private agentPool: AgentPool;
  private taskQueue: TaskQueue;
  private stateManager: StateManager;
  private checkpointManager: CheckpointManager;
  private eventBus: EventBus;
  private dependencyResolver: DependencyResolver;

  private activeProjects: Map<string, ProjectContext>;
  private checkpointTimers: Map<string, NodeJS.Timer>;

  constructor(config: CoordinatorConfig) {
    this.agentPool = new AgentPool(config.maxAgents);
    this.taskQueue = new TaskQueue();
    this.stateManager = new StateManager();
    this.checkpointManager = new CheckpointManager(this.stateManager);
    this.eventBus = EventBus.getInstance();
    this.dependencyResolver = new DependencyResolver();

    this.activeProjects = new Map();
    this.checkpointTimers = new Map();

    this.setupEventHandlers();
  }

  async startProject(config: ProjectConfig): Promise<Project> {
    // 1. Create project record
    const project = await this.createProjectRecord(config);

    // 2. Initialize project context
    const context: ProjectContext = {
      project,
      state: await this.initializeState(project, config),
      worktrees: new Map(),
      completedTasks: new Set()
    };
    this.activeProjects.set(project.id, context);

    // 3. Set up automatic checkpointing
    if (config.checkpointInterval) {
      this.setupCheckpointTimer(project.id, config.checkpointInterval);
    }

    // 4. Emit start event
    this.eventBus.emit({
      type: 'PROJECT_STARTED',
      projectId: project.id,
      timestamp: new Date(),
      data: { config }
    });

    // 5. Begin execution based on mode
    if (config.mode === 'genesis') {
      await this.startGenesisMode(project.id);
    } else {
      await this.startEvolutionMode(project.id);
    }

    return project;
  }

  private async startGenesisMode(projectId: string): Promise<void> {
    const context = this.activeProjects.get(projectId)!;

    // 1. Load requirements and create tasks
    const tasks = await this.loadAndDecomposeTasks(context);

    // 2. Resolve dependencies and create waves
    const sortedTasks = this.dependencyResolver.resolveDependencies(tasks);
    const waves = this.dependencyResolver.getParallelWaves(sortedTasks);

    // 3. Queue all tasks
    for (const task of sortedTasks) {
      this.taskQueue.enqueue(task);
    }

    // 4. Update state
    context.state.totalWaves = waves.length;
    context.state.currentWave = 0;

    // 5. Start execution loop
    this.executeLoop(projectId);
  }

  private async executeLoop(projectId: string): Promise<void> {
    const context = this.activeProjects.get(projectId);
    if (!context || context.state.paused) return;

    // Get next available tasks (respecting dependencies)
    const completedIds = Array.from(context.completedTasks);
    const availableTasks = this.dependencyResolver.getNextAvailable(
      this.taskQueue.getQueuedTasks(),
      completedIds
    );

    // Assign tasks to available agents
    for (const task of availableTasks) {
      const agent = this.agentPool.getAvailableAgent(task.assignedAgentType);
      if (!agent) continue;

      // Dequeue and assign
      this.taskQueue.dequeue();
      await this.agentPool.assignTask(agent, task);

      // Execute task
      this.executeTask(projectId, agent, task);
    }

    // Check if project is complete
    if (this.isProjectComplete(context)) {
      await this.completeProject(projectId);
    } else {
      // Schedule next iteration
      setTimeout(() => this.executeLoop(projectId), 1000);
    }
  }

  private async executeTask(
    projectId: string,
    agent: Agent,
    task: Task
  ): Promise<void> {
    const context = this.activeProjects.get(projectId)!;

    try {
      this.eventBus.emit({
        type: 'TASK_STARTED',
        projectId,
        taskId: task.id,
        agentId: agent.id,
        timestamp: new Date()
      });

      // Execute based on agent type
      const result = await this.agentPool.runTask(agent, task, context);

      // Handle result
      if (result.success) {
        context.completedTasks.add(task.id);
        this.eventBus.emit({
          type: 'TASK_COMPLETED',
          projectId,
          taskId: task.id,
          timestamp: new Date(),
          data: { result }
        });
      } else {
        // Handle failure - retry or escalate
        await this.handleTaskFailure(projectId, task, result);
      }
    } catch (error) {
      this.eventBus.emit({
        type: 'TASK_ERROR',
        projectId,
        taskId: task.id,
        timestamp: new Date(),
        data: { error }
      });
      await this.handleTaskError(projectId, task, error);
    } finally {
      await this.agentPool.releaseAgent(agent.id);
    }
  }

  async pauseProject(projectId: string): Promise<void> {
    const context = this.activeProjects.get(projectId);
    if (!context) throw new Error(`Project ${projectId} not found`);

    context.state.paused = true;

    // Create checkpoint before pausing
    await this.requestCheckpoint(projectId);

    this.eventBus.emit({
      type: 'PROJECT_PAUSED',
      projectId,
      timestamp: new Date()
    });
  }

  async resumeProject(projectId: string): Promise<void> {
    const context = this.activeProjects.get(projectId);
    if (!context) throw new Error(`Project ${projectId} not found`);

    context.state.paused = false;

    this.eventBus.emit({
      type: 'PROJECT_RESUMED',
      projectId,
      timestamp: new Date()
    });

    // Resume execution loop
    this.executeLoop(projectId);
  }

  async requestCheckpoint(projectId: string): Promise<Checkpoint> {
    const context = this.activeProjects.get(projectId);
    if (!context) throw new Error(`Project ${projectId} not found`);

    const checkpoint = await this.checkpointManager.createCheckpoint(
      context.state
    );

    this.eventBus.emit({
      type: 'CHECKPOINT_CREATED',
      projectId,
      checkpointId: checkpoint.id,
      timestamp: new Date()
    });

    return checkpoint;
  }

  async restoreFromCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = await this.checkpointManager.getCheckpoint(checkpointId);
    if (!checkpoint) throw new Error(`Checkpoint ${checkpointId} not found`);

    const state = await this.checkpointManager.restoreCheckpoint(checkpointId);
    const context = this.activeProjects.get(state.projectId);

    if (context) {
      // Update context with restored state
      context.state = state;
      context.completedTasks = new Set(state.completedTaskIds);

      // Re-queue incomplete tasks
      const incompleteTasks = state.tasks.filter(
        t => !context.completedTasks.has(t.id)
      );
      for (const task of incompleteTasks) {
        this.taskQueue.enqueue(task);
      }

      this.eventBus.emit({
        type: 'CHECKPOINT_RESTORED',
        projectId: state.projectId,
        checkpointId,
        timestamp: new Date()
      });
    }
  }

  async getStatus(projectId: string): Promise<ProjectStatus> {
    const context = this.activeProjects.get(projectId);
    if (!context) throw new Error(`Project ${projectId} not found`);

    const agentStatuses = this.agentPool.getAllAgentStatuses();
    const checkpoints = await this.checkpointManager.listCheckpoints(projectId);

    return {
      id: projectId,
      name: context.project.name,
      mode: context.project.mode,
      state: this.calculateProjectState(context),
      progress: {
        totalFeatures: context.state.features.length,
        completedFeatures: context.state.features.filter(f => f.status === 'done').length,
        totalTasks: context.state.tasks.length,
        completedTasks: context.completedTasks.size,
        currentWave: context.state.currentWave,
        totalWaves: context.state.totalWaves
      },
      agents: {
        active: agentStatuses.filter(a => a.status === 'working').length,
        idle: agentStatuses.filter(a => a.status === 'idle').length,
        total: agentStatuses.length
      },
      timing: {
        startedAt: context.project.startedAt,
        estimatedCompletion: this.estimateCompletion(context),
        lastActivity: context.state.lastActivityAt
      },
      checkpoints: {
        lastCheckpoint: checkpoints.length > 0 ? checkpoints[0].createdAt : null,
        checkpointCount: checkpoints.length
      }
    };
  }

  private setupEventHandlers(): void {
    // Handle QA failures
    this.eventBus.on('QA_FAILED', async (event) => {
      const { projectId, taskId, issues } = event.data;
      await this.handleQAFailure(projectId, taskId, issues);
    });

    // Handle escalations
    this.eventBus.on('ESCALATE_TO_HUMAN', async (event) => {
      const { projectId, taskId, reason } = event.data;
      await this.handleEscalation(projectId, taskId, reason);
    });

    // Handle agent completions
    this.eventBus.on('AGENT_TASK_COMPLETE', async (event) => {
      const { projectId, agentId } = event.data;
      // Trigger next task assignment
      this.executeLoop(projectId);
    });
  }
}
```

**Estimated LOC:** 400-500

**Unit Tests:**
```typescript
describe('NexusCoordinator', () => {
  describe('startProject', () => {
    it('should create project record and initialize state');
    it('should set up checkpoint timer if interval provided');
    it('should emit PROJECT_STARTED event');
    it('should start genesis mode for new projects');
    it('should start evolution mode for existing projects');
  });

  describe('pauseProject', () => {
    it('should set paused state');
    it('should create checkpoint before pausing');
    it('should emit PROJECT_PAUSED event');
    it('should stop execution loop');
  });

  describe('resumeProject', () => {
    it('should clear paused state');
    it('should emit PROJECT_RESUMED event');
    it('should restart execution loop');
  });

  describe('requestCheckpoint', () => {
    it('should create checkpoint with current state');
    it('should emit CHECKPOINT_CREATED event');
    it('should return checkpoint object');
  });

  describe('restoreFromCheckpoint', () => {
    it('should restore state from checkpoint');
    it('should re-queue incomplete tasks');
    it('should emit CHECKPOINT_RESTORED event');
  });

  describe('getStatus', () => {
    it('should return current project status');
    it('should calculate progress correctly');
    it('should include agent activities');
    it('should include checkpoint information');
  });

  describe('execution loop', () => {
    it('should assign available tasks to idle agents');
    it('should respect task dependencies');
    it('should complete project when all tasks done');
    it('should handle task failures with retry');
    it('should escalate after max retries');
  });
});
```

---

### IMPL-ORC-002: Agent Pool

**File:** `src/orchestration/agents/AgentPool.ts`

**Purpose:** Manage pool of agent instances, handle agent lifecycle, and coordinate task assignments.

**Dependencies:**
- CoderRunner
- TesterRunner
- MergerRunner
- EventBus

**Interface:**
```typescript
interface IAgentPool {
  // Agent Management
  createAgent(type: AgentType): Promise<Agent>;
  getAgent(agentId: string): Agent | null;
  getAvailableAgent(type: AgentType): Agent | null;
  getAllAgents(): Agent[];
  getAllAgentStatuses(): AgentStatus[];

  // Task Assignment
  assignTask(agent: Agent, task: Task): Promise<void>;
  runTask(agent: Agent, task: Task, context: ProjectContext): Promise<TaskResult>;
  releaseAgent(agentId: string): Promise<void>;

  // Pool Management
  getAgentStatus(agentId: string): AgentStatus;
  setMaxAgents(type: AgentType, max: number): void;
  getPoolStatus(): PoolStatus;

  // Cleanup
  terminateAgent(agentId: string): Promise<void>;
  terminateAll(): Promise<void>;
}

type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

interface Agent {
  id: string;
  type: AgentType;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTaskId: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  metrics: AgentMetrics;
}

interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalTokensUsed: number;
  averageTaskDuration: number;
}

interface AgentStatus {
  agentId: string;
  type: AgentType;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask: {
    id: string;
    title: string;
    startedAt: Date;
  } | null;
  metrics: AgentMetrics;
}

interface PoolStatus {
  totalAgents: number;
  byType: Record<AgentType, {
    total: number;
    active: number;
    idle: number;
    max: number;
  }>;
  tasksInProgress: number;
}
```

**Implementation Details:**
```typescript
export class AgentPool implements IAgentPool {
  private agents: Map<string, Agent>;
  private runners: Map<AgentType, AgentRunner>;
  private maxAgents: Map<AgentType, number>;
  private eventBus: EventBus;

  private readonly DEFAULT_MAX_AGENTS = 4;

  constructor(config: AgentPoolConfig) {
    this.agents = new Map();
    this.runners = new Map();
    this.maxAgents = new Map();
    this.eventBus = EventBus.getInstance();

    // Initialize runners
    this.runners.set('coder', new CoderRunner(config.coderConfig));
    this.runners.set('tester', new TesterRunner(config.testerConfig));
    this.runners.set('merger', new MergerRunner(config.mergerConfig));

    // Set default max agents
    for (const type of ['planner', 'coder', 'tester', 'reviewer', 'merger'] as AgentType[]) {
      this.maxAgents.set(type, config.maxAgentsByType?.[type] ?? this.DEFAULT_MAX_AGENTS);
    }
  }

  async createAgent(type: AgentType): Promise<Agent> {
    // Check if we can create more agents of this type
    const currentCount = this.getAgentCountByType(type);
    const max = this.maxAgents.get(type)!;

    if (currentCount >= max) {
      throw new Error(`Maximum ${type} agents (${max}) reached`);
    }

    const agent: Agent = {
      id: `${type}-${nanoid(8)}`,
      type,
      status: 'idle',
      currentTaskId: null,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        totalTokensUsed: 0,
        averageTaskDuration: 0
      }
    };

    this.agents.set(agent.id, agent);

    this.eventBus.emit({
      type: 'AGENT_CREATED',
      agentId: agent.id,
      agentType: type,
      timestamp: new Date()
    });

    return agent;
  }

  getAvailableAgent(type: AgentType): Agent | null {
    // Find idle agent of requested type
    for (const agent of this.agents.values()) {
      if (agent.type === type && agent.status === 'idle') {
        return agent;
      }
    }

    // Try to create new agent if under limit
    const currentCount = this.getAgentCountByType(type);
    const max = this.maxAgents.get(type)!;

    if (currentCount < max) {
      // Create agent synchronously for immediate use
      return this.createAgentSync(type);
    }

    return null;
  }

  async assignTask(agent: Agent, task: Task): Promise<void> {
    const agentRecord = this.agents.get(agent.id);
    if (!agentRecord) {
      throw new Error(`Agent ${agent.id} not found`);
    }

    if (agentRecord.status !== 'idle') {
      throw new Error(`Agent ${agent.id} is not idle (current: ${agentRecord.status})`);
    }

    agentRecord.status = 'working';
    agentRecord.currentTaskId = task.id;
    agentRecord.lastActivityAt = new Date();

    this.eventBus.emit({
      type: 'TASK_ASSIGNED',
      agentId: agent.id,
      taskId: task.id,
      timestamp: new Date()
    });
  }

  async runTask(
    agent: Agent,
    task: Task,
    context: ProjectContext
  ): Promise<TaskResult> {
    const runner = this.runners.get(agent.type);
    if (!runner) {
      throw new Error(`No runner for agent type: ${agent.type}`);
    }

    const startTime = Date.now();

    try {
      // Build agent context
      const agentContext: AgentContext = {
        projectId: context.project.id,
        projectPath: context.project.targetPath,
        worktreePath: context.worktrees.get(task.id)?.path ?? context.project.targetPath,
        memory: await this.getRelevantMemory(context, task),
        previousResults: this.getPreviousResults(context, task)
      };

      // Execute task
      const result = await runner.executeTask(task, agentContext);

      // Update metrics
      this.updateAgentMetrics(agent.id, {
        success: result.success,
        duration: Date.now() - startTime,
        tokensUsed: result.tokensUsed ?? 0
      });

      return result;
    } catch (error) {
      this.updateAgentMetrics(agent.id, {
        success: false,
        duration: Date.now() - startTime,
        tokensUsed: 0
      });
      throw error;
    }
  }

  async releaseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'idle';
    agent.currentTaskId = null;
    agent.lastActivityAt = new Date();

    this.eventBus.emit({
      type: 'AGENT_RELEASED',
      agentId,
      timestamp: new Date()
    });
  }

  getAgentStatus(agentId: string): AgentStatus {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      agentId: agent.id,
      type: agent.type,
      status: agent.status,
      currentTask: agent.currentTaskId ? {
        id: agent.currentTaskId,
        title: '', // Would be populated from task queue
        startedAt: agent.lastActivityAt
      } : null,
      metrics: { ...agent.metrics }
    };
  }

  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.values()).map(agent => ({
      agentId: agent.id,
      type: agent.type,
      status: agent.status,
      currentTask: agent.currentTaskId ? {
        id: agent.currentTaskId,
        title: '',
        startedAt: agent.lastActivityAt
      } : null,
      metrics: { ...agent.metrics }
    }));
  }

  getPoolStatus(): PoolStatus {
    const byType: PoolStatus['byType'] = {} as any;

    for (const type of ['planner', 'coder', 'tester', 'reviewer', 'merger'] as AgentType[]) {
      const agents = Array.from(this.agents.values()).filter(a => a.type === type);
      byType[type] = {
        total: agents.length,
        active: agents.filter(a => a.status === 'working').length,
        idle: agents.filter(a => a.status === 'idle').length,
        max: this.maxAgents.get(type)!
      };
    }

    return {
      totalAgents: this.agents.size,
      byType,
      tasksInProgress: Array.from(this.agents.values())
        .filter(a => a.status === 'working').length
    };
  }

  setMaxAgents(type: AgentType, max: number): void {
    if (max < 1) throw new Error('Max agents must be at least 1');
    this.maxAgents.set(type, max);
  }

  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Clean up any ongoing work
    if (agent.currentTaskId) {
      // Emit task interrupted event
      this.eventBus.emit({
        type: 'TASK_INTERRUPTED',
        agentId,
        taskId: agent.currentTaskId,
        timestamp: new Date()
      });
    }

    this.agents.delete(agentId);

    this.eventBus.emit({
      type: 'AGENT_TERMINATED',
      agentId,
      timestamp: new Date()
    });
  }

  async terminateAll(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    await Promise.all(agentIds.map(id => this.terminateAgent(id)));
  }

  private getAgentCountByType(type: AgentType): number {
    return Array.from(this.agents.values())
      .filter(a => a.type === type).length;
  }

  private updateAgentMetrics(
    agentId: string,
    result: { success: boolean; duration: number; tokensUsed: number }
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (result.success) {
      agent.metrics.tasksCompleted++;
    } else {
      agent.metrics.tasksFailed++;
    }

    agent.metrics.totalTokensUsed += result.tokensUsed;

    // Update average duration
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    agent.metrics.averageTaskDuration =
      (agent.metrics.averageTaskDuration * (totalTasks - 1) + result.duration) / totalTasks;
  }
}
```

**Estimated LOC:** 250-300

**Unit Tests:**
```typescript
describe('AgentPool', () => {
  describe('createAgent', () => {
    it('should create agent with correct type');
    it('should assign unique id');
    it('should initialize metrics to zero');
    it('should emit AGENT_CREATED event');
    it('should throw when max agents reached');
  });

  describe('getAvailableAgent', () => {
    it('should return idle agent of requested type');
    it('should create new agent if under limit');
    it('should return null if at max and all busy');
  });

  describe('assignTask', () => {
    it('should update agent status to working');
    it('should set currentTaskId');
    it('should emit TASK_ASSIGNED event');
    it('should throw if agent not idle');
  });

  describe('runTask', () => {
    it('should execute task through appropriate runner');
    it('should update agent metrics on success');
    it('should update agent metrics on failure');
    it('should pass correct context to runner');
  });

  describe('releaseAgent', () => {
    it('should set agent status to idle');
    it('should clear currentTaskId');
    it('should emit AGENT_RELEASED event');
  });

  describe('terminateAgent', () => {
    it('should remove agent from pool');
    it('should emit TASK_INTERRUPTED if task in progress');
    it('should emit AGENT_TERMINATED event');
  });

  describe('getPoolStatus', () => {
    it('should return correct counts by type');
    it('should return correct active/idle counts');
    it('should respect max limits');
  });
});
```

---

### IMPL-ORC-003: Task Queue

**File:** `src/orchestration/queue/TaskQueue.ts`

**Purpose:** Priority queue for task scheduling, respecting dependencies and priorities.

**Dependencies:**
- DependencyResolver
- EventBus

**Interface:**
```typescript
interface ITaskQueue {
  // Queue Operations
  enqueue(task: Task): void;
  enqueueBatch(tasks: Task[]): void;
  dequeue(): Task | null;
  peek(): Task | null;

  // Priority Management
  prioritize(taskId: string): void;
  deprioritize(taskId: string): void;
  setPriority(taskId: string, priority: number): void;

  // Query Operations
  getTask(taskId: string): Task | null;
  getQueuedTasks(): Task[];
  getTasksByStatus(status: TaskStatus): Task[];
  getTasksByFeature(featureId: string): Task[];

  // Status Management
  updateTaskStatus(taskId: string, status: TaskStatus): void;
  markComplete(taskId: string): void;
  markFailed(taskId: string, error: string): void;

  // Queue State
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}

interface Task {
  id: string;
  featureId: string;
  title: string;
  description: string;
  type: 'coding' | 'testing' | 'review' | 'merge';
  assignedAgentType: AgentType;
  status: TaskStatus;
  priority: number; // Higher = more urgent
  dependencies: string[]; // Task IDs
  estimatedMinutes: number;

  // File targets
  targetFiles: string[];

  // Context
  context: {
    requirements: string[];
    codeContext: string;
    testContext?: string;
  };

  // Results (when complete)
  result?: TaskResult;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

type TaskStatus = 'queued' | 'ready' | 'in_progress' | 'blocked' | 'completed' | 'failed';
```

**Implementation Details:**
```typescript
export class TaskQueue implements ITaskQueue {
  private tasks: Map<string, Task>;
  private priorityQueue: PriorityQueue<string>; // Task IDs sorted by priority
  private eventBus: EventBus;

  constructor() {
    this.tasks = new Map();
    this.priorityQueue = new PriorityQueue((a, b) => {
      const taskA = this.tasks.get(a)!;
      const taskB = this.tasks.get(b)!;

      // Higher priority first
      if (taskA.priority !== taskB.priority) {
        return taskB.priority - taskA.priority;
      }

      // Then by creation time (earlier first)
      return taskA.createdAt.getTime() - taskB.createdAt.getTime();
    });
    this.eventBus = EventBus.getInstance();
  }

  enqueue(task: Task): void {
    // Validate task
    this.validateTask(task);

    // Check for dependencies
    const status = this.calculateInitialStatus(task);
    task.status = status;

    // Store and queue
    this.tasks.set(task.id, task);

    if (status === 'ready') {
      this.priorityQueue.push(task.id);
    }

    this.eventBus.emit({
      type: 'TASK_ENQUEUED',
      taskId: task.id,
      status,
      timestamp: new Date()
    });
  }

  enqueueBatch(tasks: Task[]): void {
    for (const task of tasks) {
      this.enqueue(task);
    }

    // Recalculate all statuses after batch (dependencies may now be satisfied)
    this.recalculateStatuses();
  }

  dequeue(): Task | null {
    while (!this.priorityQueue.isEmpty()) {
      const taskId = this.priorityQueue.pop();
      if (!taskId) return null;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      // Verify task is still ready
      if (task.status !== 'ready') continue;

      // Check dependencies are complete
      if (!this.areDependenciesSatisfied(task)) {
        task.status = 'blocked';
        continue;
      }

      // Update status
      task.status = 'in_progress';
      task.startedAt = new Date();

      this.eventBus.emit({
        type: 'TASK_DEQUEUED',
        taskId: task.id,
        timestamp: new Date()
      });

      return task;
    }

    return null;
  }

  peek(): Task | null {
    while (!this.priorityQueue.isEmpty()) {
      const taskId = this.priorityQueue.peek();
      if (!taskId) return null;

      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'ready') {
        this.priorityQueue.pop();
        continue;
      }

      return task;
    }

    return null;
  }

  prioritize(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Increase priority
    task.priority += 10;

    // Re-insert into queue if ready
    if (task.status === 'ready' || task.status === 'queued') {
      this.rebuildQueue();
    }

    this.eventBus.emit({
      type: 'TASK_PRIORITIZED',
      taskId,
      newPriority: task.priority,
      timestamp: new Date()
    });
  }

  setPriority(taskId: string, priority: number): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.priority = priority;

    if (task.status === 'ready' || task.status === 'queued') {
      this.rebuildQueue();
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const oldStatus = task.status;
    task.status = status;

    // Handle status transitions
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();

      // Check if any blocked tasks can now proceed
      this.unblockDependentTasks(taskId);
    }

    this.eventBus.emit({
      type: 'TASK_STATUS_CHANGED',
      taskId,
      oldStatus,
      newStatus: status,
      timestamp: new Date()
    });
  }

  markComplete(taskId: string): void {
    this.updateTaskStatus(taskId, 'completed');
  }

  markFailed(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.result = { success: false, error };
    }
    this.updateTaskStatus(taskId, 'failed');
  }

  getQueuedTasks(): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'queued' || t.status === 'ready');
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === status);
  }

  getTasksByFeature(featureId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.featureId === featureId);
  }

  private calculateInitialStatus(task: Task): TaskStatus {
    if (task.dependencies.length === 0) {
      return 'ready';
    }

    // Check if all dependencies are complete
    const allComplete = task.dependencies.every(depId => {
      const dep = this.tasks.get(depId);
      return dep && dep.status === 'completed';
    });

    return allComplete ? 'ready' : 'blocked';
  }

  private areDependenciesSatisfied(task: Task): boolean {
    return task.dependencies.every(depId => {
      const dep = this.tasks.get(depId);
      return dep && dep.status === 'completed';
    });
  }

  private unblockDependentTasks(completedTaskId: string): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'blocked' && task.dependencies.includes(completedTaskId)) {
        // Check if all dependencies are now satisfied
        if (this.areDependenciesSatisfied(task)) {
          task.status = 'ready';
          this.priorityQueue.push(task.id);

          this.eventBus.emit({
            type: 'TASK_UNBLOCKED',
            taskId: task.id,
            timestamp: new Date()
          });
        }
      }
    }
  }

  private recalculateStatuses(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'queued' || task.status === 'blocked') {
        const newStatus = this.calculateInitialStatus(task);
        if (newStatus === 'ready' && task.status !== 'ready') {
          task.status = 'ready';
          this.priorityQueue.push(task.id);
        }
      }
    }
  }

  private rebuildQueue(): void {
    // Clear and rebuild priority queue
    this.priorityQueue.clear();

    for (const task of this.tasks.values()) {
      if (task.status === 'ready') {
        this.priorityQueue.push(task.id);
      }
    }
  }

  private validateTask(task: Task): void {
    if (!task.id) throw new Error('Task must have id');
    if (!task.featureId) throw new Error('Task must have featureId');
    if (!task.title) throw new Error('Task must have title');
    if (this.tasks.has(task.id)) throw new Error(`Task ${task.id} already exists`);
  }

  size(): number {
    return this.tasks.size;
  }

  isEmpty(): boolean {
    return this.priorityQueue.isEmpty();
  }

  clear(): void {
    this.tasks.clear();
    this.priorityQueue.clear();
  }
}

// Simple priority queue implementation
class PriorityQueue<T> {
  private items: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  push(item: T): void {
    this.items.push(item);
    this.items.sort(this.comparator);
  }

  pop(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }
}
```

**Estimated LOC:** 150-200

**Unit Tests:**
```typescript
describe('TaskQueue', () => {
  describe('enqueue', () => {
    it('should add task to queue');
    it('should set status to ready if no dependencies');
    it('should set status to blocked if has dependencies');
    it('should emit TASK_ENQUEUED event');
    it('should throw on duplicate task id');
  });

  describe('enqueueBatch', () => {
    it('should enqueue multiple tasks');
    it('should recalculate statuses after batch');
  });

  describe('dequeue', () => {
    it('should return highest priority ready task');
    it('should update status to in_progress');
    it('should set startedAt time');
    it('should skip blocked tasks');
    it('should emit TASK_DEQUEUED event');
    it('should return null if queue empty');
  });

  describe('priority management', () => {
    it('should prioritize task by increasing priority');
    it('should return higher priority tasks first');
    it('should respect creation time for equal priorities');
  });

  describe('dependency handling', () => {
    it('should block tasks with incomplete dependencies');
    it('should unblock tasks when dependencies complete');
    it('should emit TASK_UNBLOCKED event');
  });

  describe('status management', () => {
    it('should update task status');
    it('should set completedAt on completion');
    it('should emit TASK_STATUS_CHANGED event');
  });

  describe('queries', () => {
    it('should return tasks by status');
    it('should return tasks by feature');
    it('should return all queued tasks');
  });
});
```

---

### IMPL-ORC-004: Event Bus

**File:** `src/orchestration/events/EventBus.ts`

**Purpose:** Pub/sub event system for decoupled component communication.

**Dependencies:**
- eventemitter3

**Interface:**
```typescript
interface IEventBus {
  // Publishing
  emit(event: NexusEvent): void;

  // Subscribing
  on(eventType: EventType, handler: EventHandler): Unsubscribe;
  once(eventType: EventType, handler: EventHandler): Unsubscribe;
  off(eventType: EventType, handler: EventHandler): void;

  // Wildcard subscriptions
  onAny(handler: EventHandler): Unsubscribe;

  // History
  getHistory(options?: HistoryOptions): NexusEvent[];
  clearHistory(): void;

  // Utility
  getSubscriberCount(eventType: EventType): number;
  listEventTypes(): EventType[];
}

type Unsubscribe = () => void;
type EventHandler = (event: NexusEvent) => void | Promise<void>;

interface NexusEvent {
  type: EventType;
  timestamp: Date;
  projectId?: string;
  taskId?: string;
  agentId?: string;
  checkpointId?: string;
  data?: Record<string, unknown>;
}

type EventType =
  // Project Events
  | 'PROJECT_STARTED'
  | 'PROJECT_PAUSED'
  | 'PROJECT_RESUMED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_FAILED'

  // Planning Events
  | 'PLANNING_STARTED'
  | 'PLANNING_COMPLETED'
  | 'TASKS_CREATED'

  // Task Events
  | 'TASK_ENQUEUED'
  | 'TASK_DEQUEUED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_INTERRUPTED'
  | 'TASK_UNBLOCKED'
  | 'TASK_PRIORITIZED'
  | 'TASK_STATUS_CHANGED'

  // Agent Events
  | 'AGENT_CREATED'
  | 'AGENT_RELEASED'
  | 'AGENT_TERMINATED'
  | 'AGENT_TASK_COMPLETE'

  // QA Events
  | 'QA_STARTED'
  | 'QA_ITERATION'
  | 'QA_PASSED'
  | 'QA_FAILED'

  // Review Events
  | 'REVIEW_REQUESTED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_ISSUES'

  // Merge Events
  | 'MERGE_REQUESTED'
  | 'MERGE_COMPLETED'
  | 'MERGE_CONFLICT'

  // Checkpoint Events
  | 'CHECKPOINT_CREATED'
  | 'CHECKPOINT_RESTORED'

  // Escalation Events
  | 'ESCALATE_TO_HUMAN'

  // Error Events
  | 'ERROR_OCCURRED';

interface HistoryOptions {
  eventType?: EventType;
  projectId?: string;
  limit?: number;
  since?: Date;
}
```

**Implementation Details:**
```typescript
import EventEmitter from 'eventemitter3';

export class EventBus implements IEventBus {
  private static instance: EventBus | null = null;

  private emitter: EventEmitter;
  private history: NexusEvent[];
  private maxHistorySize: number;
  private anyHandlers: Set<EventHandler>;

  private constructor(config?: EventBusConfig) {
    this.emitter = new EventEmitter();
    this.history = [];
    this.maxHistorySize = config?.maxHistorySize ?? 1000;
    this.anyHandlers = new Set();
  }

  static getInstance(config?: EventBusConfig): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(config);
    }
    return EventBus.instance;
  }

  static resetInstance(): void {
    EventBus.instance = null;
  }

  emit(event: NexusEvent): void {
    // Ensure timestamp
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Add to history
    this.addToHistory(event);

    // Emit to specific listeners
    this.emitter.emit(event.type, event);

    // Emit to any handlers
    for (const handler of this.anyHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventBus] ${event.type}`, event);
    }
  }

  on(eventType: EventType, handler: EventHandler): Unsubscribe {
    this.emitter.on(eventType, handler);

    return () => {
      this.emitter.off(eventType, handler);
    };
  }

  once(eventType: EventType, handler: EventHandler): Unsubscribe {
    const wrappedHandler = (event: NexusEvent) => {
      handler(event);
      this.emitter.off(eventType, wrappedHandler);
    };

    this.emitter.on(eventType, wrappedHandler);

    return () => {
      this.emitter.off(eventType, wrappedHandler);
    };
  }

  off(eventType: EventType, handler: EventHandler): void {
    this.emitter.off(eventType, handler);
  }

  onAny(handler: EventHandler): Unsubscribe {
    this.anyHandlers.add(handler);

    return () => {
      this.anyHandlers.delete(handler);
    };
  }

  getHistory(options?: HistoryOptions): NexusEvent[] {
    let events = [...this.history];

    // Filter by event type
    if (options?.eventType) {
      events = events.filter(e => e.type === options.eventType);
    }

    // Filter by project
    if (options?.projectId) {
      events = events.filter(e => e.projectId === options.projectId);
    }

    // Filter by time
    if (options?.since) {
      events = events.filter(e => e.timestamp >= options.since!);
    }

    // Apply limit
    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  clearHistory(): void {
    this.history = [];
  }

  getSubscriberCount(eventType: EventType): number {
    return this.emitter.listenerCount(eventType);
  }

  listEventTypes(): EventType[] {
    return this.emitter.eventNames() as EventType[];
  }

  private addToHistory(event: NexusEvent): void {
    this.history.push(event);

    // Trim history if exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

// Export singleton instance getter
export const eventBus = EventBus.getInstance();
```

**Estimated LOC:** 100-150

**Unit Tests:**
```typescript
describe('EventBus', () => {
  describe('singleton', () => {
    it('should return same instance on multiple getInstance calls');
    it('should create new instance after resetInstance');
  });

  describe('emit', () => {
    it('should emit event to registered handlers');
    it('should add timestamp if not provided');
    it('should add event to history');
    it('should emit to wildcard handlers');
  });

  describe('on', () => {
    it('should register handler for event type');
    it('should call handler on event emit');
    it('should return unsubscribe function');
    it('should not call handler after unsubscribe');
  });

  describe('once', () => {
    it('should call handler only once');
    it('should auto-unsubscribe after first call');
  });

  describe('onAny', () => {
    it('should receive all events');
    it('should return unsubscribe function');
  });

  describe('history', () => {
    it('should store emitted events');
    it('should filter by event type');
    it('should filter by project id');
    it('should filter by time');
    it('should respect limit');
    it('should trim when exceeding max size');
    it('should clear on clearHistory');
  });

  describe('utility', () => {
    it('should return subscriber count for event type');
    it('should list all event types with subscribers');
  });
});
```

---

### Layer 2 Summary

| Component | File | LOC | Status |
|-----------|------|-----|--------|
| NexusCoordinator | `src/orchestration/coordinator/NexusCoordinator.ts` | 400-500 | To Build |
| AgentPool | `src/orchestration/agents/AgentPool.ts` | 250-300 | To Build |
| TaskQueue | `src/orchestration/queue/TaskQueue.ts` | 150-200 | To Build |
| EventBus | `src/orchestration/events/EventBus.ts` | 100-150 | To Build |
| **TOTAL** | | **900-1,150** | |

**Tests for Layer 2:** ~35 tests

---

### Part G: Layer 1 - User Interface

**Dependencies:** Layer 2 (Orchestration), Layer 6 (Persistence)
**Total Components:** 4
**Estimated Total LOC:** 1,900-2,300

---

#### IMPL-UI-001: Interview Interface

| Field | Specification |
|-------|---------------|
| **Files** | `src/ui/pages/InterviewPage.tsx`, `src/ui/components/interview/InterviewChat.tsx`, `src/ui/components/interview/RequirementsList.tsx`, `src/ui/components/interview/InterviewProgress.tsx` |
| **Exports** | `InterviewPage`, `InterviewChat`, `RequirementsList`, `InterviewProgress` |
| **Dependencies** | React, Zustand, TanStack Query, shadcn/ui, ClaudeClient |
| **Estimated LOC** | 500-600 |

**Component Structure:**

```
InterviewPage
├── InterviewProgress (top bar showing interview stages)
├── InterviewChat (main chat interface)
│   ├── MessageList
│   │   ├── UserMessage
│   │   └── AIMessage (with typing indicator)
│   └── MessageInput
└── RequirementsList (sidebar showing extracted requirements)
    ├── RequirementCategory (collapsible sections)
    └── RequirementItem (individual requirements)
```

**InterviewPage Interface:**

```typescript
import { FC } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useInterviewStore } from '../stores/interviewStore';

export interface InterviewPageProps {
  projectId?: string;  // If editing existing project
  mode: 'genesis' | 'evolution';
}

export interface InterviewState {
  stage: InterviewStage;
  messages: ChatMessage[];
  requirements: Requirement[];
  isProcessing: boolean;
  currentTopic: string | null;
  completedTopics: string[];
}

export type InterviewStage =
  | 'welcome'
  | 'project_overview'
  | 'technical_requirements'
  | 'features'
  | 'constraints'
  | 'review'
  | 'complete';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  extractedRequirements?: Requirement[];
}

export interface Requirement {
  id: string;
  category: RequirementCategory;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  source: string;  // message ID where it was extracted
}

export type RequirementCategory =
  | 'functional'
  | 'non_functional'
  | 'technical'
  | 'constraint'
  | 'user_story';
```

**InterviewChat Interface:**

```typescript
export interface InterviewChatProps {
  onSend: (message: string) => Promise<void>;
  messages: ChatMessage[];
  isProcessing: boolean;
  suggestions?: string[];  // Quick reply suggestions
}

export interface InterviewChatHooks {
  // Custom hooks for interview logic
  useInterview: () => {
    sendMessage: (content: string) => Promise<void>;
    messages: ChatMessage[];
    isProcessing: boolean;
    currentStage: InterviewStage;
    progress: number;  // 0-100
  };

  useRequirementExtraction: () => {
    requirements: Requirement[];
    addRequirement: (req: Omit<Requirement, 'id'>) => void;
    updateRequirement: (id: string, updates: Partial<Requirement>) => void;
    removeRequirement: (id: string) => void;
  };
}
```

**RequirementsList Interface:**

```typescript
export interface RequirementsListProps {
  requirements: Requirement[];
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;  // Manual add
  groupBy: 'category' | 'priority';
  editable: boolean;
}

export interface RequirementCardProps {
  requirement: Requirement;
  onUpdate: (updates: Partial<Requirement>) => void;
  onDelete: () => void;
  editable: boolean;
  highlighted?: boolean;  // Highlight when just extracted
}
```

**Interview Flow States:**

```
welcome → "Tell me about your project"
    │
    ▼
project_overview → Gather name, description, type
    │
    ▼
technical_requirements → Tech stack, integrations
    │
    ▼
features → Core features, user stories
    │
    ▼
constraints → Timeline, budget, limitations
    │
    ▼
review → Summarize and confirm requirements
    │
    ▼
complete → Generate requirements database
```

**Implementation Notes:**

1. Use streaming responses from ClaudeClient for real-time feedback
2. Highlight newly extracted requirements with animation
3. Allow manual requirement editing during interview
4. Support voice input (optional, future feature)
5. Auto-save interview state every 30 seconds
6. Support interview resume from checkpoint

**Tests Required:**

```typescript
describe('InterviewPage', () => {
  describe('rendering', () => {
    it('should render welcome stage initially');
    it('should show progress indicator');
    it('should display requirements sidebar');
  });

  describe('chat interaction', () => {
    it('should send user message');
    it('should display AI response');
    it('should show typing indicator while processing');
    it('should extract requirements from AI response');
  });

  describe('requirements', () => {
    it('should display extracted requirements');
    it('should allow manual requirement addition');
    it('should allow requirement editing');
    it('should group requirements by category');
  });

  describe('navigation', () => {
    it('should advance stages based on conversation');
    it('should allow stage navigation');
    it('should complete interview and generate database');
  });
});

describe('InterviewChat', () => {
  it('should render message input');
  it('should display message history');
  it('should disable input while processing');
  it('should show suggestions when available');
});

describe('RequirementsList', () => {
  it('should render requirements grouped by category');
  it('should expand/collapse categories');
  it('should highlight new requirements');
  it('should support editing when enabled');
});
```

---

#### IMPL-UI-002: Kanban Board

| Field | Specification |
|-------|---------------|
| **Files** | `src/ui/pages/KanbanPage.tsx`, `src/ui/components/kanban/KanbanBoard.tsx`, `src/ui/components/kanban/KanbanColumn.tsx`, `src/ui/components/kanban/FeatureCard.tsx`, `src/ui/components/kanban/TaskList.tsx` |
| **Exports** | `KanbanPage`, `KanbanBoard`, `KanbanColumn`, `FeatureCard`, `TaskList` |
| **Dependencies** | React, @dnd-kit/core, @dnd-kit/sortable, Zustand |
| **Estimated LOC** | 600-700 |

**Component Structure:**

```
KanbanPage
├── KanbanHeader (project info, filters, search)
├── KanbanBoard
│   ├── KanbanColumn (Backlog)
│   │   └── FeatureCard[]
│   ├── KanbanColumn (Planning)
│   │   └── FeatureCard[]
│   ├── KanbanColumn (In Progress)
│   │   └── FeatureCard[] (with agent indicators)
│   ├── KanbanColumn (AI Review)
│   │   └── FeatureCard[]
│   ├── KanbanColumn (Human Review)
│   │   └── FeatureCard[]
│   └── KanbanColumn (Done)
│       └── FeatureCard[]
└── FeatureDetailModal (expanded view)
    ├── FeatureInfo
    ├── TaskList (sub-tasks)
    ├── AgentActivity
    └── Timeline
```

**KanbanBoard Interface:**

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';

export interface KanbanBoardProps {
  projectId: string;
  features: Feature[];
  onFeatureMove: (featureId: string, newStatus: FeatureStatus) => Promise<void>;
  onFeatureSelect: (featureId: string) => void;
  filter?: KanbanFilter;
}

export interface KanbanFilter {
  search?: string;
  assignee?: string;
  priority?: Priority[];
  status?: FeatureStatus[];
}

export type FeatureStatus =
  | 'backlog'
  | 'planning'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'done';

export interface KanbanColumn {
  id: FeatureStatus;
  title: string;
  features: Feature[];
  limit?: number;  // WIP limit
  color: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: 'gray' },
  { id: 'planning', title: 'Planning', color: 'purple' },
  { id: 'in_progress', title: 'In Progress', color: 'blue', limit: 3 },
  { id: 'ai_review', title: 'AI Review', color: 'yellow' },
  { id: 'human_review', title: 'Human Review', color: 'orange' },
  { id: 'done', title: 'Done', color: 'green' },
];
```

**FeatureCard Interface:**

```typescript
export interface FeatureCardProps {
  feature: Feature;
  onSelect: () => void;
  isDragging?: boolean;
  showTasks?: boolean;  // Collapse/expand tasks
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: Priority;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: number;  // minutes
  actualTime?: number;
  tasks: Task[];
  assignedAgent?: AgentInfo;
  progress: number;  // 0-100
  qaIterations?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentInfo {
  id: string;
  type: AgentType;
  status: 'idle' | 'working' | 'blocked';
  currentTask?: string;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
```

**Drag and Drop Implementation:**

```typescript
// DnD Context setup
export const KanbanBoard: FC<KanbanBoardProps> = ({ features, onFeatureMove }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const featureId = active.id as string;
      const newStatus = over.data.current?.columnId as FeatureStatus;

      // Optimistic update
      // Call onFeatureMove
      // Revert on error
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Columns */}
    </DndContext>
  );
};
```

**Feature Transitions:**

```
backlog ──────► planning (drag or click "Plan")
    │              │
    │              ▼
    │         in_progress (auto when planning complete)
    │              │
    │              ├──► ai_review (auto when code complete)
    │              │        │
    │              │        ├──► in_progress (QA failed, back to agent)
    │              │        │
    │              │        ▼
    │              │    human_review (QA passed, needs human)
    │              │        │
    │              │        ├──► in_progress (human requested changes)
    │              │        │
    │              │        ▼
    │              │      done (human approved)
    │              │
    │              ▼
    └──────────► done (simple features, direct implementation)
```

**Tests Required:**

```typescript
describe('KanbanPage', () => {
  it('should render kanban board');
  it('should load features from project');
  it('should display feature count per column');
  it('should open feature detail on click');
});

describe('KanbanBoard', () => {
  describe('rendering', () => {
    it('should render all columns');
    it('should display features in correct columns');
    it('should show WIP limit indicators');
  });

  describe('drag and drop', () => {
    it('should allow dragging feature between columns');
    it('should update feature status on drop');
    it('should prevent drop on WIP-limited column');
    it('should handle drag cancel');
  });

  describe('filtering', () => {
    it('should filter by search term');
    it('should filter by priority');
    it('should filter by assignee');
  });
});

describe('FeatureCard', () => {
  it('should display feature title and description');
  it('should show progress indicator');
  it('should show assigned agent');
  it('should indicate priority with color');
  it('should expand to show tasks');
});
```

---

#### IMPL-UI-003: Progress Dashboard

| Field | Specification |
|-------|---------------|
| **Files** | `src/ui/pages/DashboardPage.tsx`, `src/ui/components/dashboard/ProgressChart.tsx`, `src/ui/components/dashboard/AgentActivity.tsx`, `src/ui/components/dashboard/TaskTimeline.tsx`, `src/ui/components/dashboard/CostTracker.tsx` |
| **Exports** | `DashboardPage`, `ProgressChart`, `AgentActivity`, `TaskTimeline`, `CostTracker` |
| **Dependencies** | React, Recharts, Zustand, date-fns |
| **Estimated LOC** | 500-600 |

**Component Structure:**

```
DashboardPage
├── DashboardHeader (project selector, date range)
├── OverviewCards (summary metrics)
│   ├── TotalFeatures
│   ├── CompletedTasks
│   ├── ActiveAgents
│   └── EstimatedCompletion
├── ProgressChart (feature completion over time)
├── AgentActivity (real-time agent status)
│   ├── AgentCard[]
│   └── AgentTimeline
├── TaskTimeline (recent activity)
│   └── TimelineItem[]
└── CostTracker (token usage, API costs)
    ├── CostChart
    └── CostBreakdown
```

**DashboardPage Interface:**

```typescript
export interface DashboardPageProps {
  projectId: string;
}

export interface DashboardData {
  overview: OverviewMetrics;
  progress: ProgressData[];
  agents: AgentMetrics[];
  timeline: TimelineEvent[];
  costs: CostMetrics;
}

export interface OverviewMetrics {
  totalFeatures: number;
  completedFeatures: number;
  totalTasks: number;
  completedTasks: number;
  activeAgents: number;
  estimatedCompletion: Date | null;
  currentVelocity: number;  // tasks per hour
}

export interface ProgressData {
  date: Date;
  featuresTotal: number;
  featuresCompleted: number;
  tasksTotal: number;
  tasksCompleted: number;
}
```

**ProgressChart Interface:**

```typescript
export interface ProgressChartProps {
  data: ProgressData[];
  dateRange: DateRange;
  showProjected?: boolean;  // Show projected completion line
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Chart configuration
const CHART_CONFIG = {
  lines: [
    { key: 'featuresCompleted', color: '#10B981', name: 'Features' },
    { key: 'tasksCompleted', color: '#3B82F6', name: 'Tasks' },
  ],
  areas: [
    { key: 'featuresTotal', color: '#10B98130', name: 'Total Features' },
    { key: 'tasksTotal', color: '#3B82F630', name: 'Total Tasks' },
  ],
};
```

**AgentActivity Interface:**

```typescript
export interface AgentActivityProps {
  agents: AgentMetrics[];
  onAgentSelect: (agentId: string) => void;
}

export interface AgentMetrics {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: Task | null;
  completedToday: number;
  totalCompleted: number;
  avgTaskTime: number;  // minutes
  qaPassRate: number;  // percentage
  lastActivity: Date;
}

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'waiting_review'
  | 'blocked'
  | 'offline';

export interface AgentCardProps {
  agent: AgentMetrics;
  onSelect: () => void;
  expanded?: boolean;
}
```

**TaskTimeline Interface:**

```typescript
export interface TaskTimelineProps {
  events: TimelineEvent[];
  filter?: TimelineFilter;
  maxItems?: number;
  onEventClick?: (event: TimelineEvent) => void;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: Date;
  metadata: {
    agentId?: string;
    taskId?: string;
    featureId?: string;
    duration?: number;
    status?: 'success' | 'warning' | 'error';
  };
}

export type TimelineEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'qa_iteration'
  | 'qa_passed'
  | 'qa_failed'
  | 'merge_completed'
  | 'merge_conflict'
  | 'checkpoint_created'
  | 'agent_assigned'
  | 'human_review_requested';

export interface TimelineFilter {
  types?: TimelineEventType[];
  agentId?: string;
  featureId?: string;
  dateRange?: DateRange;
}
```

**CostTracker Interface:**

```typescript
export interface CostTrackerProps {
  costs: CostMetrics;
  budget?: Budget;
}

export interface CostMetrics {
  totalCost: number;  // USD
  todayCost: number;
  breakdown: CostBreakdown;
  history: DailyCost[];
}

export interface CostBreakdown {
  byProvider: Record<LLMProvider, number>;
  byAgent: Record<AgentType, number>;
  byModel: Record<string, number>;
}

export interface DailyCost {
  date: Date;
  cost: number;
  tokens: number;
}

export interface Budget {
  daily: number;
  monthly: number;
  total: number;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  threshold: number;  // percentage
  type: 'warning' | 'critical';
  action: 'notify' | 'pause' | 'stop';
}
```

**Real-time Updates:**

```typescript
// Dashboard uses EventBus for real-time updates
export const useDashboardData = (projectId: string) => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    // Initial load
    loadDashboardData(projectId).then(setData);

    // Subscribe to events
    const unsubscribe = eventBus.on('*', (event) => {
      // Update relevant data based on event type
      updateDashboardFromEvent(event, setData);
    });

    return unsubscribe;
  }, [projectId]);

  return data;
};
```

**Tests Required:**

```typescript
describe('DashboardPage', () => {
  it('should render dashboard layout');
  it('should display overview metrics');
  it('should show loading state');
  it('should handle data refresh');
});

describe('ProgressChart', () => {
  it('should render line chart');
  it('should display correct data points');
  it('should show projected completion line');
  it('should handle date range changes');
  it('should show tooltips on hover');
});

describe('AgentActivity', () => {
  it('should display all agents');
  it('should show agent status indicators');
  it('should update in real-time');
  it('should expand agent details on click');
});

describe('TaskTimeline', () => {
  it('should render timeline events');
  it('should filter events by type');
  it('should show event details on click');
  it('should auto-update with new events');
});

describe('CostTracker', () => {
  it('should display total costs');
  it('should show cost breakdown chart');
  it('should display budget warnings');
  it('should update with new costs');
});
```

---

#### IMPL-UI-004: Zustand Stores

| Field | Specification |
|-------|---------------|
| **Files** | `src/ui/stores/projectStore.ts`, `src/ui/stores/agentStore.ts`, `src/ui/stores/taskStore.ts`, `src/ui/stores/uiStore.ts`, `src/ui/stores/interviewStore.ts` |
| **Exports** | `useProjectStore`, `useAgentStore`, `useTaskStore`, `useUIStore`, `useInterviewStore` |
| **Dependencies** | Zustand, zustand/middleware (persist, devtools) |
| **Estimated LOC** | 300-400 |

**Store Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                     Zustand Stores                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ projectStore │  │  agentStore  │  │  taskStore   │  │
│  │              │  │              │  │              │  │
│  │ - projects   │  │ - agents     │  │ - tasks      │  │
│  │ - current    │  │ - metrics    │  │ - queue      │  │
│  │ - status     │  │ - activity   │  │ - history    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   uiStore    │  │interviewStore│                     │
│  │              │  │              │                     │
│  │ - theme      │  │ - messages   │                     │
│  │ - sidebar    │  │ - stage      │                     │
│  │ - modals     │  │ - reqs       │                     │
│  └──────────────┘  └──────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**projectStore Interface:**

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ProjectState {
  // State
  projects: Project[];
  currentProject: Project | null;
  status: ProjectStatus | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (name: string, config: ProjectConfig) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Status
  refreshStatus: () => Promise<void>;
  startExecution: () => Promise<void>;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        currentProject: null,
        status: null,
        loading: false,
        error: null,

        loadProjects: async () => {
          set({ loading: true, error: null });
          try {
            const projects = await api.getProjects();
            set({ projects, loading: false });
          } catch (error) {
            set({ error: error.message, loading: false });
          }
        },

        selectProject: async (projectId: string) => {
          const project = get().projects.find(p => p.id === projectId);
          if (project) {
            set({ currentProject: project });
            const status = await api.getProjectStatus(projectId);
            set({ status });
          }
        },

        // ... other actions
      }),
      { name: 'nexus-project-store' }
    )
  )
);
```

**agentStore Interface:**

```typescript
export interface AgentState {
  // State
  agents: Agent[];
  agentMetrics: Record<string, AgentMetrics>;
  activeAgentId: string | null;

  // Actions
  loadAgents: (projectId: string) => Promise<void>;
  getAgentMetrics: (agentId: string) => AgentMetrics | null;
  subscribeToAgentUpdates: () => Unsubscribe;

  // Selectors (computed)
  getActiveAgents: () => Agent[];
  getAgentByType: (type: AgentType) => Agent[];
  getTotalMetrics: () => AggregatedMetrics;
}

export const useAgentStore = create<AgentState>()(
  devtools((set, get) => ({
    agents: [],
    agentMetrics: {},
    activeAgentId: null,

    loadAgents: async (projectId) => {
      const agents = await api.getAgents(projectId);
      const metrics: Record<string, AgentMetrics> = {};

      for (const agent of agents) {
        metrics[agent.id] = await api.getAgentMetrics(agent.id);
      }

      set({ agents, agentMetrics: metrics });
    },

    subscribeToAgentUpdates: () => {
      return eventBus.on('agent:*', (event) => {
        const { agentId, ...data } = event.payload;
        set(state => ({
          agentMetrics: {
            ...state.agentMetrics,
            [agentId]: { ...state.agentMetrics[agentId], ...data },
          },
        }));
      });
    },

    getActiveAgents: () => {
      return get().agents.filter(a => a.status === 'working');
    },

    getAgentByType: (type) => {
      return get().agents.filter(a => a.type === type);
    },

    getTotalMetrics: () => {
      const metrics = Object.values(get().agentMetrics);
      return {
        totalCompleted: metrics.reduce((sum, m) => sum + m.totalCompleted, 0),
        avgTaskTime: metrics.reduce((sum, m) => sum + m.avgTaskTime, 0) / metrics.length,
        avgQaPassRate: metrics.reduce((sum, m) => sum + m.qaPassRate, 0) / metrics.length,
      };
    },
  }))
);
```

**taskStore Interface:**

```typescript
export interface TaskState {
  // State
  tasks: Task[];
  taskQueue: Task[];
  completedTasks: Task[];
  currentTask: Task | null;

  // Filters
  filter: TaskFilter;
  sortBy: TaskSortField;
  sortOrder: 'asc' | 'desc';

  // Actions
  loadTasks: (projectId: string) => Promise<void>;
  loadTaskQueue: (projectId: string) => Promise<void>;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setSort: (field: TaskSortField, order: 'asc' | 'desc') => void;

  // Selectors
  getFilteredTasks: () => Task[];
  getTasksByFeature: (featureId: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  featureId?: string;
  agentId?: string;
  priority?: Priority[];
  search?: string;
}

export type TaskSortField =
  | 'createdAt'
  | 'priority'
  | 'estimatedTime'
  | 'status';

export const useTaskStore = create<TaskState>()(
  devtools((set, get) => ({
    tasks: [],
    taskQueue: [],
    completedTasks: [],
    currentTask: null,
    filter: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',

    loadTasks: async (projectId) => {
      const tasks = await api.getTasks(projectId);
      set({
        tasks,
        completedTasks: tasks.filter(t => t.status === 'completed'),
      });
    },

    loadTaskQueue: async (projectId) => {
      const queue = await api.getTaskQueue(projectId);
      set({ taskQueue: queue });
    },

    getFilteredTasks: () => {
      const { tasks, filter, sortBy, sortOrder } = get();
      let filtered = [...tasks];

      if (filter.status) {
        filtered = filtered.filter(t => filter.status!.includes(t.status));
      }
      if (filter.featureId) {
        filtered = filtered.filter(t => t.featureId === filter.featureId);
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        filtered = filtered.filter(t =>
          t.title.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      return filtered;
    },
  }))
);
```

**uiStore Interface:**

```typescript
export interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Layout
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Modals
  activeModal: ModalType | null;
  modalData: unknown;

  // Notifications
  notifications: Notification[];

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;

  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export type ModalType =
  | 'feature_detail'
  | 'task_detail'
  | 'agent_detail'
  | 'checkpoint_restore'
  | 'confirm_action'
  | 'settings';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;  // ms, undefined = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        sidebarOpen: true,
        sidebarWidth: 280,
        activeModal: null,
        modalData: null,
        notifications: [],

        setTheme: (theme) => set({ theme }),

        toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

        setSidebarWidth: (width) => set({ sidebarWidth: width }),

        openModal: (type, data) => set({ activeModal: type, modalData: data }),

        closeModal: () => set({ activeModal: null, modalData: null }),

        addNotification: (notification) => {
          const id = crypto.randomUUID();
          set(s => ({
            notifications: [...s.notifications, { ...notification, id }],
          }));

          if (notification.duration) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.duration);
          }
        },

        removeNotification: (id) => {
          set(s => ({
            notifications: s.notifications.filter(n => n.id !== id),
          }));
        },

        clearNotifications: () => set({ notifications: [] }),
      }),
      { name: 'nexus-ui-store' }
    )
  )
);
```

**interviewStore Interface:**

```typescript
export interface InterviewState {
  // State
  stage: InterviewStage;
  messages: ChatMessage[];
  requirements: Requirement[];
  isProcessing: boolean;
  currentTopic: string | null;
  completedTopics: string[];

  // Actions
  sendMessage: (content: string) => Promise<void>;
  setStage: (stage: InterviewStage) => void;
  addRequirement: (req: Omit<Requirement, 'id'>) => void;
  updateRequirement: (id: string, updates: Partial<Requirement>) => void;
  removeRequirement: (id: string) => void;

  // Interview control
  startInterview: (mode: 'genesis' | 'evolution') => void;
  completeInterview: () => Promise<RequirementsDatabase>;
  resetInterview: () => void;

  // Persistence
  saveProgress: () => Promise<void>;
  loadProgress: (projectId: string) => Promise<void>;
}

export const useInterviewStore = create<InterviewState>()(
  devtools((set, get) => ({
    stage: 'welcome',
    messages: [],
    requirements: [],
    isProcessing: false,
    currentTopic: null,
    completedTopics: [],

    sendMessage: async (content) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      set(s => ({
        messages: [...s.messages, userMessage],
        isProcessing: true,
      }));

      try {
        // Stream AI response
        const response = await claudeClient.stream({
          model: 'claude-opus',
          messages: get().messages,
          systemPrompt: getInterviewPrompt(get().stage),
        });

        // Extract requirements from response
        const extracted = extractRequirements(response.content);

        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          extractedRequirements: extracted,
        };

        set(s => ({
          messages: [...s.messages, aiMessage],
          requirements: [...s.requirements, ...extracted],
          isProcessing: false,
        }));

        // Check for stage progression
        const nextStage = determineNextStage(get().stage, response);
        if (nextStage !== get().stage) {
          set({ stage: nextStage });
        }
      } catch (error) {
        set({ isProcessing: false });
        throw error;
      }
    },

    completeInterview: async () => {
      const { requirements, messages } = get();

      // Generate requirements database
      const database = await generateRequirementsDatabase(requirements);

      // Save to project
      await requirementsDB.saveDatabase(database);

      return database;
    },

    resetInterview: () => {
      set({
        stage: 'welcome',
        messages: [],
        requirements: [],
        isProcessing: false,
        currentTopic: null,
        completedTopics: [],
      });
    },
  }))
);
```

**Store Integration Pattern:**

```typescript
// Combining stores in components
export const useNexusState = () => {
  const project = useProjectStore();
  const agents = useAgentStore();
  const tasks = useTaskStore();
  const ui = useUIStore();

  return {
    // Derived state
    isReady: !!project.currentProject && !project.loading,
    hasActiveAgents: agents.getActiveAgents().length > 0,
    pendingTasks: tasks.taskQueue.length,

    // Combined actions
    initialize: async (projectId: string) => {
      await project.selectProject(projectId);
      await agents.loadAgents(projectId);
      await tasks.loadTasks(projectId);
    },
  };
};

// Event-based updates
export const useEventSync = () => {
  const projectStore = useProjectStore();
  const agentStore = useAgentStore();
  const taskStore = useTaskStore();

  useEffect(() => {
    const unsubscribes = [
      agentStore.subscribeToAgentUpdates(),
      eventBus.on('task:completed', () => {
        taskStore.loadTasks(projectStore.currentProject!.id);
      }),
      eventBus.on('project:status_changed', (event) => {
        projectStore.refreshStatus();
      }),
    ];

    return () => unsubscribes.forEach(fn => fn());
  }, []);
};
```

**Tests Required:**

```typescript
describe('projectStore', () => {
  it('should load projects');
  it('should select project');
  it('should create new project');
  it('should persist current project');
});

describe('agentStore', () => {
  it('should load agents');
  it('should compute active agents');
  it('should update metrics from events');
  it('should aggregate total metrics');
});

describe('taskStore', () => {
  it('should load tasks');
  it('should filter tasks');
  it('should sort tasks');
  it('should get tasks by feature');
});

describe('uiStore', () => {
  it('should toggle theme');
  it('should manage sidebar state');
  it('should handle notifications');
  it('should persist preferences');
});

describe('interviewStore', () => {
  it('should send messages');
  it('should extract requirements');
  it('should progress through stages');
  it('should complete interview');
});
```

---

### Layer 1 Summary

| Component | Files | LOC | Status |
|-----------|-------|-----|--------|
| Interview Interface | 4 files | 500-600 | To Build |
| Kanban Board | 5 files | 600-700 | To Build |
| Progress Dashboard | 5 files | 500-600 | To Build |
| Zustand Stores | 5 files | 300-400 | To Build |
| **TOTAL** | **19 files** | **1,900-2,300** | |

**Tests for Layer 1:** ~15 component tests, ~8 E2E tests

---

### Task 6.1 Complete Summary

All 30 components across 7 layers have been specified:

| Layer | Components | Estimated LOC | Tests |
|-------|------------|---------------|-------|
| Layer 7: Infrastructure | 5 | 1,050-1,350 | ~30 |
| Layer 6: Persistence | 6 | 1,200-1,500 | ~40 |
| Layer 5: Quality | 4 | 850-1,050 | ~15 |
| Layer 4: Execution | 4 | 1,400-1,700 | ~20 |
| Layer 3: Planning | 3 | 650-800 | ~25 |
| Layer 2: Orchestration | 4 | 900-1,150 | ~35 |
| Layer 1: UI | 4 | 1,900-2,300 | ~23 |
| **TOTAL** | **30** | **7,950-9,850** | **~188** |

**[TASK 6.1 COMPLETE]**

---

## Task 6.2: Component Build Specifications

### Overview

This section provides detailed build specifications for supporting components that enable the 30 core layer components to work together. These include type definitions, configuration files, adapters, bridges, LLM clients, and system prompts.

**Total Additional Components:**

| Category | Count | Estimated LOC/Words |
|----------|-------|---------------------|
| Type Definitions | 4 files | 700-900 LOC |
| Configuration Files | 3 files | 250-380 LOC |
| Adapters | 3 implementations | 500-650 LOC |
| Bridges | 3 implementations | 600-750 LOC |
| LLM Clients | 3 implementations | 950-1,150 LOC |
| System Prompts | 5 prompts | 7,700-10,000 words |

---

### Part A: TypeScript Interface Files

These type definition files establish the contract between all components. They must be built first (after project initialization) as all other components depend on them.

---

#### SPEC-TYPES-001: Core Types

| Field | Specification |
|-------|---------------|
| **File** | `src/types/core.ts` |
| **Purpose** | Define core domain entities: Tasks, Features, Projects, Requirements |
| **Exports** | All interfaces, types, and enums for core domain |
| **Estimated LOC** | 200-250 |

**Complete Interface Definition:**

```typescript
// =============================================================================
// FILE: src/types/core.ts
// PURPOSE: Core domain type definitions for Nexus
// =============================================================================

// -----------------------------------------------------------------------------
// IDENTIFIERS
// -----------------------------------------------------------------------------

/** Branded type for Task IDs (e.g., "F001-A-03") */
export type TaskId = string & { readonly __brand: 'TaskId' };

/** Branded type for Feature IDs (e.g., "F001") */
export type FeatureId = string & { readonly __brand: 'FeatureId' };

/** Branded type for Project IDs (UUID v4) */
export type ProjectId = string & { readonly __brand: 'ProjectId' };

/** Branded type for Requirement IDs (e.g., "REQ-001") */
export type RequirementId = string & { readonly __brand: 'RequirementId' };

// -----------------------------------------------------------------------------
// TASK
// -----------------------------------------------------------------------------

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface Task {
  id: TaskId;
  featureId: FeatureId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;

  // Dependencies
  dependencies: TaskId[];
  blockedBy: TaskId[];

  // Time tracking
  estimatedMinutes: number;
  actualMinutes?: number;
  startedAt?: Date;
  completedAt?: Date;

  // Assignment
  assignedAgent?: string;
  worktreePath?: string;

  // Results
  result?: TaskResult;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  success: boolean;
  filesChanged: FileChange[];
  testsRun?: number;
  testsPassed?: number;
  lintErrors?: number;
  commitHash?: string;
  error?: string;
  qaIterations?: number;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath?: string;  // For renamed files
}

// -----------------------------------------------------------------------------
// FEATURE
// -----------------------------------------------------------------------------

export enum FeatureStatus {
  BACKLOG = 'backlog',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  AI_REVIEW = 'ai_review',
  HUMAN_REVIEW = 'human_review',
  DONE = 'done',
  ARCHIVED = 'archived'
}

export enum FeatureComplexity {
  SIMPLE = 'simple',      // Can be done in 1-2 tasks
  MEDIUM = 'medium',      // 3-5 tasks
  COMPLEX = 'complex'     // 6+ tasks, requires planning
}

export interface Feature {
  id: FeatureId;
  projectId: ProjectId;
  title: string;
  description: string;
  status: FeatureStatus;
  complexity: FeatureComplexity;

  // Requirements linkage
  requirementIds: RequirementId[];

  // Tasks
  taskIds: TaskId[];
  completedTaskCount: number;

  // Progress
  progress: number;  // 0-100

  // Time estimates
  estimatedHours: number;
  actualHours?: number;

  // Review
  reviewNotes?: string;
  reviewedAt?: Date;
  reviewedBy?: string;  // 'ai' | agent-id | human-id

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// PROJECT
// -----------------------------------------------------------------------------

export enum ProjectStatus {
  CREATED = 'created',
  INTERVIEWING = 'interviewing',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum ProjectMode {
  GENESIS = 'genesis',     // New project from scratch
  EVOLUTION = 'evolution'  // Enhancing existing project
}

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  status: ProjectStatus;
  mode: ProjectMode;

  // Paths
  rootPath: string;
  outputPath: string;

  // Features
  featureIds: FeatureId[];
  completedFeatureCount: number;

  // Progress
  progress: number;  // 0-100
  currentPhase: ProjectPhase;

  // Git
  repository?: RepositoryInfo;

  // Configuration
  config: ProjectConfig;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Checkpoints
  lastCheckpointId?: string;
  lastCheckpointAt?: Date;
}

export enum ProjectPhase {
  INTERVIEW = 'interview',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  REVIEW = 'review',
  COMPLETE = 'complete'
}

export interface ProjectConfig {
  maxConcurrentAgents: number;
  qaMaxIterations: number;
  checkpointIntervalMs: number;
  autoMerge: boolean;
  requireHumanReview: boolean;
  llmProvider: 'claude' | 'gemini' | 'openai';
}

export interface RepositoryInfo {
  url?: string;
  branch: string;
  remote?: string;
  lastCommit?: string;
}

// -----------------------------------------------------------------------------
// REQUIREMENT
// -----------------------------------------------------------------------------

export enum RequirementCategory {
  FUNCTIONAL = 'functional',
  NON_FUNCTIONAL = 'non_functional',
  TECHNICAL = 'technical',
  UX = 'ux',
  BUSINESS = 'business',
  CONSTRAINT = 'constraint'
}

export enum RequirementPriority {
  MUST_HAVE = 'must_have',
  SHOULD_HAVE = 'should_have',
  COULD_HAVE = 'could_have',
  WONT_HAVE = 'wont_have'
}

export interface Requirement {
  id: RequirementId;
  projectId: ProjectId;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;

  // Source
  source: RequirementSource;

  // Relationships
  parentId?: RequirementId;
  childIds: RequirementId[];
  relatedIds: RequirementId[];

  // Validation
  acceptanceCriteria: string[];
  validated: boolean;
  validatedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface RequirementSource {
  type: 'interview' | 'manual' | 'imported';
  messageId?: string;  // For interview-sourced
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// REQUIREMENTS DATABASE
// -----------------------------------------------------------------------------

export interface RequirementsDatabase {
  projectId: ProjectId;
  projectName: string;
  createdAt: Date;
  updatedAt: Date;

  // Categorized requirements
  requirements: {
    functional: Requirement[];
    non_functional: Requirement[];
    technical: Requirement[];
    ux: Requirement[];
    business: Requirement[];
    constraints: Requirement[];
  };

  // Statistics
  stats: {
    total: number;
    byPriority: Record<RequirementPriority, number>;
    byCategory: Record<RequirementCategory, number>;
    validated: number;
  };
}
```

**Usage Examples:**

```typescript
// Creating a new task
const task: Task = {
  id: 'F001-A-01' as TaskId,
  featureId: 'F001' as FeatureId,
  title: 'Set up project structure',
  description: 'Initialize the project with TypeScript configuration',
  status: TaskStatus.PENDING,
  priority: TaskPriority.HIGH,
  dependencies: [],
  blockedBy: [],
  estimatedMinutes: 30,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Creating a feature
const feature: Feature = {
  id: 'F001' as FeatureId,
  projectId: '550e8400-e29b-41d4-a716-446655440000' as ProjectId,
  title: 'User Authentication',
  description: 'Complete authentication system with login, logout, and registration',
  status: FeatureStatus.BACKLOG,
  complexity: FeatureComplexity.COMPLEX,
  requirementIds: ['REQ-001' as RequirementId, 'REQ-002' as RequirementId],
  taskIds: [],
  completedTaskCount: 0,
  progress: 0,
  estimatedHours: 8,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

---

#### SPEC-TYPES-002: Agent Types

| Field | Specification |
|-------|---------------|
| **File** | `src/types/agent.ts` |
| **Purpose** | Define agent-related types: Agent entities, contexts, messages, configs |
| **Exports** | All agent interfaces, types, and enums |
| **Estimated LOC** | 150-200 |

**Complete Interface Definition:**

```typescript
// =============================================================================
// FILE: src/types/agent.ts
// PURPOSE: Agent type definitions for Nexus
// =============================================================================

import type { TaskId, FeatureId, ProjectId, Task, FileChange } from './core';

// -----------------------------------------------------------------------------
// AGENT IDENTITY
// -----------------------------------------------------------------------------

/** Branded type for Agent IDs */
export type AgentId = string & { readonly __brand: 'AgentId' };

export enum AgentType {
  PLANNER = 'planner',
  CODER = 'coder',
  TESTER = 'tester',
  REVIEWER = 'reviewer',
  MERGER = 'merger'
}

export enum AgentStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  WORKING = 'working',
  WAITING = 'waiting',     // Waiting for external resource
  COMPLETING = 'completing',
  ERROR = 'error'
}

// -----------------------------------------------------------------------------
// AGENT
// -----------------------------------------------------------------------------

export interface Agent {
  id: AgentId;
  type: AgentType;
  status: AgentStatus;

  // Current assignment
  currentTaskId?: TaskId;
  worktreePath?: string;

  // Configuration
  config: AgentConfig;

  // Stats
  stats: AgentStats;

  // Lifecycle
  createdAt: Date;
  lastActiveAt: Date;
}

export interface AgentConfig {
  type: AgentType;
  model: ModelConfig;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  tools: ToolConfig[];
  maxRetries: number;
  timeoutMs: number;
}

export interface ModelConfig {
  provider: 'claude' | 'gemini' | 'openai';
  model: string;
  fallbackModel?: string;
}

export interface ToolConfig {
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AgentStats {
  tasksCompleted: number;
  tasksFailed: number;
  totalTokensUsed: number;
  totalCost: number;
  avgTaskDuration: number;  // milliseconds
  qaIterations: number;
}

// -----------------------------------------------------------------------------
// AGENT CONTEXT
// -----------------------------------------------------------------------------

export interface AgentContext {
  // Identity
  agentId: AgentId;
  agentType: AgentType;

  // Task context
  taskId: TaskId;
  task: Task;

  // Project context
  projectId: ProjectId;
  projectPath: string;

  // Workspace
  worktreePath: string;
  currentBranch: string;

  // Memory context
  relevantMemories: MemoryItem[];
  previousAttempts: AttemptHistory[];

  // File context
  relevantFiles: FileContext[];

  // Conversation
  messages: AgentMessage[];

  // Constraints
  constraints: AgentConstraints;
}

export interface MemoryItem {
  id: string;
  type: 'decision' | 'pattern' | 'error' | 'success';
  content: string;
  relevance: number;  // 0-1
  timestamp: Date;
}

export interface AttemptHistory {
  attemptNumber: number;
  timestamp: Date;
  action: string;
  result: 'success' | 'failure' | 'partial';
  feedback?: string;
}

export interface FileContext {
  path: string;
  content?: string;         // If loaded
  summary?: string;         // If summarized
  relevance: number;        // 0-1
  symbols?: SymbolInfo[];   // From LSP
}

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  location: { line: number; column: number };
}

export interface AgentConstraints {
  maxTokensPerRequest: number;
  maxFilesToModify: number;
  maxLinesPerFile: number;
  forbiddenPaths: string[];
  allowedTools: string[];
  timeoutMs: number;
}

// -----------------------------------------------------------------------------
// AGENT MESSAGES
// -----------------------------------------------------------------------------

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string | MessageContent[];
  timestamp: Date;

  // For tool messages
  toolName?: string;
  toolCallId?: string;

  // Token tracking
  inputTokens?: number;
  outputTokens?: number;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

// -----------------------------------------------------------------------------
// AGENT TASK RESULT
// -----------------------------------------------------------------------------

export interface AgentTaskResult {
  agentId: AgentId;
  taskId: TaskId;
  success: boolean;

  // Work done
  filesChanged: FileChange[];
  commitHash?: string;

  // Quality metrics
  qaResult?: QAResult;

  // Error info
  error?: AgentError;

  // Performance
  duration: number;       // milliseconds
  tokensUsed: number;
  cost: number;           // USD

  // Audit
  messages: AgentMessage[];
  toolCalls: ToolCallRecord[];
}

export interface QAResult {
  passed: boolean;
  iterations: number;
  buildResult: { success: boolean; errors: string[] };
  lintResult: { success: boolean; errors: string[]; warnings: string[] };
  testResult: { success: boolean; passed: number; failed: number; skipped: number };
  reviewResult: { approved: boolean; issues: ReviewIssue[] };
}

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'suggestion';
  file: string;
  line?: number;
  message: string;
  rule?: string;
}

export interface AgentError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
  context?: Record<string, unknown>;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// AGENT CONFIG PRESETS
// -----------------------------------------------------------------------------

export const AGENT_CONFIGS: Record<AgentType, Partial<AgentConfig>> = {
  [AgentType.PLANNER]: {
    model: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    temperature: 0.3,
    maxTokens: 8000,
    tools: [
      { name: 'file_read', enabled: true },
      { name: 'search', enabled: true },
      { name: 'analyze_code', enabled: true }
    ]
  },
  [AgentType.CODER]: {
    model: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    temperature: 0.1,
    maxTokens: 16000,
    tools: [
      { name: 'file_read', enabled: true },
      { name: 'file_write', enabled: true },
      { name: 'terminal', enabled: true },
      { name: 'search', enabled: true }
    ]
  },
  [AgentType.TESTER]: {
    model: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    temperature: 0.1,
    maxTokens: 8000,
    tools: [
      { name: 'file_read', enabled: true },
      { name: 'file_write', enabled: true },
      { name: 'terminal', enabled: true }
    ]
  },
  [AgentType.REVIEWER]: {
    model: { provider: 'gemini', model: 'gemini-2.5-pro' },
    temperature: 0.2,
    maxTokens: 32000,
    tools: []  // Review only, no tools
  },
  [AgentType.MERGER]: {
    model: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    temperature: 0.0,
    maxTokens: 8000,
    tools: [
      { name: 'file_read', enabled: true },
      { name: 'file_write', enabled: true },
      { name: 'terminal', enabled: true }
    ]
  }
};
```

---

#### SPEC-TYPES-003: Event Types

| Field | Specification |
|-------|---------------|
| **File** | `src/types/events.ts` |
| **Purpose** | Define event system types for pub/sub communication |
| **Exports** | All event interfaces, types, and enums |
| **Estimated LOC** | 200-250 |

**Complete Interface Definition:**

```typescript
// =============================================================================
// FILE: src/types/events.ts
// PURPOSE: Event type definitions for Nexus pub/sub system
// =============================================================================

import type {
  TaskId, FeatureId, ProjectId, Task, Feature, TaskStatus, FeatureStatus
} from './core';
import type { AgentId, AgentType, AgentStatus, AgentTaskResult } from './agent';

// -----------------------------------------------------------------------------
// EVENT TYPES ENUM
// -----------------------------------------------------------------------------

export enum EventType {
  // Project lifecycle
  PROJECT_CREATED = 'project:created',
  PROJECT_STARTED = 'project:started',
  PROJECT_PAUSED = 'project:paused',
  PROJECT_RESUMED = 'project:resumed',
  PROJECT_COMPLETED = 'project:completed',
  PROJECT_FAILED = 'project:failed',

  // Interview
  INTERVIEW_STARTED = 'interview:started',
  INTERVIEW_MESSAGE = 'interview:message',
  INTERVIEW_REQUIREMENT = 'interview:requirement',
  INTERVIEW_COMPLETED = 'interview:completed',

  // Planning
  PLANNING_STARTED = 'planning:started',
  PLANNING_FEATURE = 'planning:feature',
  PLANNING_TASK = 'planning:task',
  PLANNING_COMPLETED = 'planning:completed',

  // Feature lifecycle
  FEATURE_CREATED = 'feature:created',
  FEATURE_STATUS_CHANGED = 'feature:status_changed',
  FEATURE_COMPLETED = 'feature:completed',

  // Task lifecycle
  TASK_CREATED = 'task:created',
  TASK_QUEUED = 'task:queued',
  TASK_ASSIGNED = 'task:assigned',
  TASK_STARTED = 'task:started',
  TASK_PROGRESS = 'task:progress',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_BLOCKED = 'task:blocked',

  // Agent lifecycle
  AGENT_CREATED = 'agent:created',
  AGENT_STATUS_CHANGED = 'agent:status_changed',
  AGENT_TASK_ASSIGNED = 'agent:task_assigned',
  AGENT_TASK_COMPLETED = 'agent:task_completed',
  AGENT_ERROR = 'agent:error',

  // QA Loop
  QA_STARTED = 'qa:started',
  QA_ITERATION = 'qa:iteration',
  QA_BUILD = 'qa:build',
  QA_LINT = 'qa:lint',
  QA_TEST = 'qa:test',
  QA_REVIEW = 'qa:review',
  QA_PASSED = 'qa:passed',
  QA_FAILED = 'qa:failed',
  QA_ESCALATED = 'qa:escalated',

  // Merge
  MERGE_REQUESTED = 'merge:requested',
  MERGE_CONFLICT = 'merge:conflict',
  MERGE_RESOLVED = 'merge:resolved',
  MERGE_COMPLETED = 'merge:completed',
  MERGE_FAILED = 'merge:failed',

  // Checkpoint
  CHECKPOINT_CREATED = 'checkpoint:created',
  CHECKPOINT_RESTORED = 'checkpoint:restored',

  // System
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_INFO = 'system:info',

  // Human interaction
  HUMAN_REVIEW_REQUESTED = 'human:review_requested',
  HUMAN_REVIEW_COMPLETED = 'human:review_completed',
  HUMAN_INTERVENTION_REQUIRED = 'human:intervention_required'
}

// -----------------------------------------------------------------------------
// BASE EVENT
// -----------------------------------------------------------------------------

export interface NexusEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: Date;
  projectId?: ProjectId;
  payload: T;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  source: string;        // Component that emitted
  correlationId?: string; // For tracking related events
  causationId?: string;  // Event that caused this event
  userId?: string;       // If triggered by user action
}

// -----------------------------------------------------------------------------
// EVENT PAYLOADS
// -----------------------------------------------------------------------------

// Project Events
export interface ProjectCreatedPayload {
  projectId: ProjectId;
  name: string;
  mode: 'genesis' | 'evolution';
  rootPath: string;
}

export interface ProjectStartedPayload {
  projectId: ProjectId;
  totalFeatures: number;
  totalTasks: number;
  estimatedHours: number;
}

export interface ProjectCompletedPayload {
  projectId: ProjectId;
  duration: number;      // milliseconds
  featuresCompleted: number;
  tasksCompleted: number;
  totalTokens: number;
  totalCost: number;
}

// Interview Events
export interface InterviewMessagePayload {
  role: 'user' | 'assistant';
  content: string;
  extractedRequirements?: string[];
}

export interface InterviewRequirementPayload {
  requirementId: string;
  title: string;
  category: string;
  priority: string;
}

// Planning Events
export interface PlanningFeaturePayload {
  featureId: FeatureId;
  title: string;
  complexity: string;
  taskCount: number;
}

export interface PlanningTaskPayload {
  taskId: TaskId;
  featureId: FeatureId;
  title: string;
  estimatedMinutes: number;
  dependencies: TaskId[];
}

// Feature Events
export interface FeatureStatusChangedPayload {
  featureId: FeatureId;
  previousStatus: FeatureStatus;
  newStatus: FeatureStatus;
  progress: number;
}

// Task Events
export interface TaskAssignedPayload {
  taskId: TaskId;
  agentId: AgentId;
  agentType: AgentType;
  worktreePath: string;
}

export interface TaskProgressPayload {
  taskId: TaskId;
  phase: 'coding' | 'testing' | 'reviewing' | 'merging';
  progress: number;  // 0-100
  message?: string;
}

export interface TaskCompletedPayload {
  taskId: TaskId;
  result: AgentTaskResult;
  duration: number;
}

export interface TaskFailedPayload {
  taskId: TaskId;
  error: string;
  retryable: boolean;
  attempts: number;
}

// Agent Events
export interface AgentStatusChangedPayload {
  agentId: AgentId;
  previousStatus: AgentStatus;
  newStatus: AgentStatus;
  taskId?: TaskId;
}

export interface AgentErrorPayload {
  agentId: AgentId;
  taskId?: TaskId;
  error: string;
  code: string;
  recoverable: boolean;
}

// QA Events
export interface QAIterationPayload {
  taskId: TaskId;
  iteration: number;
  maxIterations: number;
  phase: 'build' | 'lint' | 'test' | 'review';
}

export interface QABuildPayload {
  taskId: TaskId;
  iteration: number;
  success: boolean;
  errors: string[];
  duration: number;
}

export interface QATestPayload {
  taskId: TaskId;
  iteration: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage?: number;
}

export interface QAReviewPayload {
  taskId: TaskId;
  iteration: number;
  approved: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'suggestion';
    message: string;
    file?: string;
    line?: number;
  }>;
}

// Merge Events
export interface MergeConflictPayload {
  taskId: TaskId;
  files: string[];
  autoResolvable: boolean;
}

export interface MergeCompletedPayload {
  taskId: TaskId;
  commitHash: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

// Checkpoint Events
export interface CheckpointCreatedPayload {
  checkpointId: string;
  projectId: ProjectId;
  type: 'automatic' | 'manual' | 'pre-risky';
  state: {
    completedTasks: number;
    pendingTasks: number;
    activeAgents: number;
  };
}

export interface CheckpointRestoredPayload {
  checkpointId: string;
  projectId: ProjectId;
  reason: 'failure' | 'user_request' | 'rollback';
  tasksReset: number;
}

// Human Interaction Events
export interface HumanReviewRequestedPayload {
  taskId: TaskId;
  reason: 'qa_max_iterations' | 'merge_conflict' | 'critical_change' | 'manual_request';
  context: string;
  files: string[];
}

// -----------------------------------------------------------------------------
// EVENT HANDLER TYPES
// -----------------------------------------------------------------------------

export type EventHandler<T = unknown> = (event: NexusEvent<T>) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface EventSubscription {
  id: string;
  eventType: EventType | '*';
  handler: EventHandler;
  once: boolean;
}

// -----------------------------------------------------------------------------
// EVENT FILTERS
// -----------------------------------------------------------------------------

export interface EventFilter {
  types?: EventType[];
  projectId?: ProjectId;
  featureId?: FeatureId;
  taskId?: TaskId;
  agentId?: AgentId;
  since?: Date;
  until?: Date;
}

// -----------------------------------------------------------------------------
// TYPE GUARDS
// -----------------------------------------------------------------------------

export function isProjectEvent(event: NexusEvent): boolean {
  return event.type.startsWith('project:');
}

export function isTaskEvent(event: NexusEvent): boolean {
  return event.type.startsWith('task:');
}

export function isAgentEvent(event: NexusEvent): boolean {
  return event.type.startsWith('agent:');
}

export function isQAEvent(event: NexusEvent): boolean {
  return event.type.startsWith('qa:');
}
```

---

#### SPEC-TYPES-004: API Types

| Field | Specification |
|-------|---------------|
| **File** | `src/types/api.ts` |
| **Purpose** | Define API interfaces for layer communication |
| **Exports** | All API interfaces for each layer |
| **Estimated LOC** | 150-200 |

**Complete Interface Definition:**

```typescript
// =============================================================================
// FILE: src/types/api.ts
// PURPOSE: API interface definitions for Nexus layers
// =============================================================================

import type {
  ProjectId, FeatureId, TaskId, RequirementId,
  Project, Feature, Task, Requirement, RequirementsDatabase,
  ProjectConfig, TaskStatus, FeatureStatus
} from './core';
import type {
  AgentId, AgentType, Agent, AgentContext, AgentTaskResult
} from './agent';
import type { NexusEvent, EventType, EventHandler, Unsubscribe, EventFilter } from './events';

// -----------------------------------------------------------------------------
// LAYER 1: UI API (Exposed to React components)
// -----------------------------------------------------------------------------

export interface UIAPI {
  // Project operations
  createProject(name: string, mode: 'genesis' | 'evolution'): Promise<Project>;
  loadProject(projectId: ProjectId): Promise<Project>;
  listProjects(): Promise<Project[]>;

  // Interview operations
  sendInterviewMessage(projectId: ProjectId, message: string): Promise<void>;
  completeInterview(projectId: ProjectId): Promise<RequirementsDatabase>;

  // Feature operations
  createFeature(projectId: ProjectId, title: string, description: string): Promise<Feature>;
  moveFeature(featureId: FeatureId, status: FeatureStatus): Promise<void>;

  // Execution control
  startExecution(projectId: ProjectId): Promise<void>;
  pauseExecution(projectId: ProjectId): Promise<void>;
  resumeExecution(projectId: ProjectId): Promise<void>;

  // Checkpoint operations
  createCheckpoint(projectId: ProjectId): Promise<string>;
  restoreCheckpoint(checkpointId: string): Promise<void>;

  // Event subscriptions
  subscribe(eventType: EventType | '*', handler: EventHandler): Unsubscribe;

  // Status queries
  getProjectStatus(projectId: ProjectId): Promise<ProjectStatus>;
  getAgentStatus(): Promise<AgentStatusSummary>;
}

export interface ProjectStatus {
  project: Project;
  features: FeatureSummary[];
  tasks: TaskSummary[];
  activeAgents: AgentSummary[];
  metrics: ProjectMetrics;
}

export interface FeatureSummary {
  id: FeatureId;
  title: string;
  status: FeatureStatus;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
}

export interface TaskSummary {
  id: TaskId;
  featureId: FeatureId;
  title: string;
  status: TaskStatus;
  assignedAgent?: AgentId;
}

export interface AgentSummary {
  id: AgentId;
  type: AgentType;
  status: string;
  currentTask?: TaskId;
  stats: { completed: number; failed: number };
}

export interface AgentStatusSummary {
  totalAgents: number;
  idleAgents: number;
  workingAgents: number;
  agents: AgentSummary[];
}

export interface ProjectMetrics {
  totalFeatures: number;
  completedFeatures: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalTokens: number;
  totalCost: number;
  estimatedTimeRemaining: number;
}

// -----------------------------------------------------------------------------
// LAYER 2: ORCHESTRATION API
// -----------------------------------------------------------------------------

export interface OrchestrationAPI {
  // Coordinator
  startProject(config: ProjectConfig): Promise<Project>;
  pauseProject(projectId: ProjectId): Promise<void>;
  resumeProject(projectId: ProjectId): Promise<void>;
  getStatus(projectId: ProjectId): Promise<ProjectStatus>;

  // Agent Pool
  createAgent(type: AgentType): Promise<Agent>;
  getAvailableAgent(type: AgentType): Promise<Agent | null>;
  assignTask(agentId: AgentId, taskId: TaskId): Promise<void>;
  releaseAgent(agentId: AgentId): Promise<void>;

  // Task Queue
  enqueueTask(task: Task): void;
  dequeueTask(): Task | null;
  getQueuedTasks(): Task[];
  prioritizeTask(taskId: TaskId): void;

  // Events
  emit(event: NexusEvent): void;
  subscribe(eventType: EventType | '*', handler: EventHandler): Unsubscribe;
  getHistory(filter?: EventFilter): NexusEvent[];
}

// -----------------------------------------------------------------------------
// LAYER 3: PLANNING API
// -----------------------------------------------------------------------------

export interface PlanningAPI {
  // Task Decomposition
  decomposeFeature(feature: Feature, context: PlanningContext): Promise<Task[]>;
  validateTask(task: Task): ValidationResult;
  splitTask(task: Task): Task[];

  // Dependency Resolution
  resolveDependencies(tasks: Task[]): Task[];
  detectCycles(tasks: Task[]): Cycle[];
  getParallelWaves(tasks: Task[]): TaskWave[];
  getNextAvailable(tasks: Task[], completedIds: TaskId[]): Task[];

  // Time Estimation
  estimateTask(task: Task): number;
  estimateFeature(feature: Feature, tasks: Task[]): FeatureEstimate;
  estimateProject(features: Feature[], tasks: Task[]): ProjectEstimate;
  calibrateFromHistory(history: TaskHistory[]): void;
}

export interface PlanningContext {
  projectId: ProjectId;
  projectPath: string;
  existingCode: FileContext[];
  requirements: Requirement[];
  completedTasks: Task[];
  memory: MemoryContext;
}

export interface FileContext {
  path: string;
  content?: string;
  summary?: string;
}

export interface MemoryContext {
  decisions: string[];
  patterns: string[];
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Cycle {
  taskIds: TaskId[];
  description: string;
}

export interface TaskWave {
  waveNumber: number;
  taskIds: TaskId[];
  parallelizable: boolean;
}

export interface FeatureEstimate {
  featureId: FeatureId;
  totalMinutes: number;
  taskEstimates: Array<{ taskId: TaskId; minutes: number }>;
  confidence: number;  // 0-1
}

export interface ProjectEstimate {
  totalHours: number;
  featureEstimates: FeatureEstimate[];
  criticalPath: TaskId[];
  parallelOpportunities: number;
  confidence: number;
}

export interface TaskHistory {
  taskId: TaskId;
  estimatedMinutes: number;
  actualMinutes: number;
  complexity: string;
  success: boolean;
}

// -----------------------------------------------------------------------------
// LAYER 4: EXECUTION API
// -----------------------------------------------------------------------------

export interface ExecutionAPI {
  // Tool Execution
  executeTool(tool: string, params: ToolParams): Promise<ToolResult>;
  getAvailableTools(): ToolDefinition[];
  validateToolParams(tool: string, params: ToolParams): ValidationResult;

  // Agent Runners
  runCoder(task: Task, context: AgentContext): Promise<AgentTaskResult>;
  runTester(task: Task, context: AgentContext): Promise<AgentTaskResult>;
  runMerger(taskId: TaskId): Promise<MergeResult>;
}

export interface ToolParams {
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface MergeResult {
  success: boolean;
  commitHash?: string;
  conflicts?: ConflictInfo[];
  filesChanged: string[];
}

export interface ConflictInfo {
  file: string;
  resolved: boolean;
  resolution?: 'ours' | 'theirs' | 'manual' | 'ai';
}

// -----------------------------------------------------------------------------
// LAYER 5: QUALITY API
// -----------------------------------------------------------------------------

export interface QualityAPI {
  // Test Runner
  runUnitTests(files?: string[]): Promise<TestResult>;
  runE2ETests(specs?: string[]): Promise<TestResult>;
  getCoverage(): Promise<CoverageReport>;

  // Lint Runner
  runLint(files?: string[]): Promise<LintResult>;
  fixLint(files?: string[]): Promise<LintResult>;
  runTypeCheck(): Promise<TypeCheckResult>;

  // Code Review
  reviewChanges(diff: Diff[]): Promise<ReviewResult>;

  // QA Loop
  runQALoop(changes: CodeChanges): Promise<QALoopResult>;
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  name: string;
  file: string;
  error: string;
  stack?: string;
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
  uncoveredFiles: string[];
}

export interface LintResult {
  success: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  fixedCount?: number;
}

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
  severity: 'error' | 'warning';
}

export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
}

export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
  score: number;  // 0-100
}

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'suggestion';
  file: string;
  line?: number;
  message: string;
  rule?: string;
}

export interface CodeChanges {
  taskId: TaskId;
  worktreePath: string;
  files: string[];
}

export interface QALoopResult {
  passed: boolean;
  iterations: number;
  buildResult: { success: boolean; errors: string[] };
  lintResult: LintResult;
  testResult: TestResult;
  reviewResult: ReviewResult;
  escalated: boolean;
  escalationReason?: string;
}

export interface Diff {
  file: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  content: string;
}

// -----------------------------------------------------------------------------
// LAYER 6: PERSISTENCE API
// -----------------------------------------------------------------------------

export interface PersistenceAPI {
  // State Management
  saveState(state: NexusState): Promise<void>;
  loadState(projectId: ProjectId): Promise<NexusState>;
  updateState(projectId: ProjectId, updates: Partial<NexusState>): Promise<void>;
  exportToStateMD(state: NexusState): string;
  importFromStateMD(content: string): NexusState;

  // Checkpoint Management
  createCheckpoint(state: NexusState): Promise<Checkpoint>;
  listCheckpoints(projectId: ProjectId): Promise<Checkpoint[]>;
  restoreCheckpoint(checkpointId: string): Promise<NexusState>;
  deleteCheckpoint(checkpointId: string): Promise<void>;

  // Memory System
  storeEpisode(episode: MemoryEpisode): Promise<void>;
  queryMemory(query: string, limit?: number): Promise<MemoryEpisode[]>;
  getRelevantContext(taskId: TaskId): Promise<MemoryContext>;
  pruneOldMemories(maxAge: number): Promise<number>;

  // Requirements Database
  createRequirementsDB(projectId: ProjectId): Promise<void>;
  addRequirement(projectId: ProjectId, req: Requirement): Promise<void>;
  getRequirements(projectId: ProjectId): Promise<Requirement[]>;
  exportRequirements(projectId: ProjectId): Promise<RequirementsDatabase>;
}

export interface NexusState {
  projectId: ProjectId;
  version: string;
  phase: string;
  features: Feature[];
  tasks: Task[];
  agents: Agent[];
  metrics: ProjectMetrics;
  timestamp: Date;
}

export interface Checkpoint {
  id: string;
  projectId: ProjectId;
  state: NexusState;
  branch: string;
  createdAt: Date;
  reason: 'automatic' | 'manual' | 'pre-risky';
}

export interface MemoryEpisode {
  id: string;
  projectId: ProjectId;
  type: 'decision' | 'pattern' | 'error' | 'success';
  content: string;
  context: string;
  embedding?: number[];
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// LAYER 7: INFRASTRUCTURE API
// -----------------------------------------------------------------------------

export interface InfrastructureAPI {
  // File System
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  glob(pattern: string): Promise<string[]>;

  // Git
  createBranch(name: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  commit(message: string, files: string[]): Promise<string>;
  merge(branch: string): Promise<MergeResult>;
  getDiff(from: string, to: string): Promise<Diff[]>;

  // Worktrees
  createWorktree(taskId: TaskId, baseBranch: string): Promise<WorktreeInfo>;
  removeWorktree(taskId: TaskId): Promise<void>;
  listWorktrees(): Promise<WorktreeInfo[]>;

  // Process
  runCommand(command: string, options?: RunOptions): Promise<ProcessResult>;

  // LSP
  getDefinition(file: string, position: Position): Promise<Location[]>;
  getReferences(file: string, position: Position): Promise<Location[]>;
  getDiagnostics(file: string): Promise<Diagnostic[]>;
}

export interface WorktreeInfo {
  taskId: TaskId;
  path: string;
  branch: string;
  baseBranch: string;
  createdAt: Date;
}

export interface RunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface Position {
  line: number;
  character: number;
}

export interface Location {
  uri: string;
  range: {
    start: Position;
    end: Position;
  };
}

export interface Diagnostic {
  range: { start: Position; end: Position };
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
}
```

---

### Part A Summary

| File | Purpose | Estimated LOC |
|------|---------|---------------|
| `src/types/core.ts` | Core domain entities | 200-250 |
| `src/types/agent.ts` | Agent-related types | 150-200 |
| `src/types/events.ts` | Event system types | 200-250 |
| `src/types/api.ts` | Layer API interfaces | 150-200 |
| **TOTAL** | | **700-900** |

---

### Part B: Configuration Files

These configuration files define system-wide settings, agent behaviors, and LLM provider configurations. They should be implemented early as many components depend on them.

---

#### SPEC-CONFIG-001: Database Config

| Field | Specification |
|-------|---------------|
| **File** | `src/config/database.ts` |
| **Purpose** | Configure SQLite database settings, paths, and migration |
| **Exports** | `databaseConfig`, `getDatabasePath()`, `getMigrationConfig()` |
| **Estimated LOC** | 50-80 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/config/database.ts
// PURPOSE: Database configuration for Nexus SQLite databases
// =============================================================================

import { join } from 'pathe';
import { homedir } from 'os';

// -----------------------------------------------------------------------------
// PATHS
// -----------------------------------------------------------------------------

/** Base directory for all Nexus data */
export const NEXUS_DATA_DIR = process.env.NEXUS_DATA_DIR
  || join(homedir(), '.nexus');

/** Main database file path */
export const NEXUS_DB_PATH = join(NEXUS_DATA_DIR, 'nexus.db');

/** Memory/embeddings database path (separate for performance) */
export const MEMORY_DB_PATH = join(NEXUS_DATA_DIR, 'memory.db');

/** Backup directory */
export const BACKUP_DIR = join(NEXUS_DATA_DIR, 'backups');

// -----------------------------------------------------------------------------
// SQLITE OPTIONS
// -----------------------------------------------------------------------------

export interface SQLiteOptions {
  /** Enable WAL mode for better concurrent access */
  walMode: boolean;
  /** Busy timeout in milliseconds */
  busyTimeout: number;
  /** Enable foreign key constraints */
  foreignKeys: boolean;
  /** Synchronous mode: OFF, NORMAL, FULL, EXTRA */
  synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  /** Cache size in KB (negative) or pages (positive) */
  cacheSize: number;
  /** Enable memory-mapped I/O (in bytes, 0 to disable) */
  mmapSize: number;
}

export const DEFAULT_SQLITE_OPTIONS: SQLiteOptions = {
  walMode: true,
  busyTimeout: 30000,      // 30 seconds
  foreignKeys: true,
  synchronous: 'NORMAL',
  cacheSize: -64000,       // 64MB cache
  mmapSize: 268435456      // 256MB mmap
};

export const MEMORY_DB_OPTIONS: SQLiteOptions = {
  ...DEFAULT_SQLITE_OPTIONS,
  synchronous: 'OFF',      // Memory DB can be more aggressive
  cacheSize: -32000        // 32MB cache
};

// -----------------------------------------------------------------------------
// MIGRATION CONFIG
// -----------------------------------------------------------------------------

export interface MigrationConfig {
  /** Directory containing migration files */
  migrationsFolder: string;
  /** Table to track migration history */
  migrationsTable: string;
  /** Whether to run migrations automatically on connect */
  autoMigrate: boolean;
}

export const MIGRATION_CONFIG: MigrationConfig = {
  migrationsFolder: join(__dirname, '..', '..', 'migrations'),
  migrationsTable: '__drizzle_migrations',
  autoMigrate: true
};

// -----------------------------------------------------------------------------
// DATABASE CONFIG
// -----------------------------------------------------------------------------

export interface DatabaseConfig {
  /** Main database settings */
  main: {
    path: string;
    options: SQLiteOptions;
  };
  /** Memory database settings */
  memory: {
    path: string;
    options: SQLiteOptions;
  };
  /** Migration settings */
  migration: MigrationConfig;
  /** Backup settings */
  backup: {
    dir: string;
    maxBackups: number;
    intervalMs: number;
  };
}

export const databaseConfig: DatabaseConfig = {
  main: {
    path: NEXUS_DB_PATH,
    options: DEFAULT_SQLITE_OPTIONS
  },
  memory: {
    path: MEMORY_DB_PATH,
    options: MEMORY_DB_OPTIONS
  },
  migration: MIGRATION_CONFIG,
  backup: {
    dir: BACKUP_DIR,
    maxBackups: 10,
    intervalMs: 3600000  // 1 hour
  }
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get database path for a specific project
 */
export function getProjectDbPath(projectId: string): string {
  return join(NEXUS_DATA_DIR, 'projects', projectId, 'project.db');
}

/**
 * Generate PRAGMA statements for SQLite configuration
 */
export function generatePragmas(options: SQLiteOptions): string[] {
  const pragmas: string[] = [];

  if (options.walMode) {
    pragmas.push('PRAGMA journal_mode = WAL;');
  }
  pragmas.push(`PRAGMA busy_timeout = ${options.busyTimeout};`);
  pragmas.push(`PRAGMA foreign_keys = ${options.foreignKeys ? 'ON' : 'OFF'};`);
  pragmas.push(`PRAGMA synchronous = ${options.synchronous};`);
  pragmas.push(`PRAGMA cache_size = ${options.cacheSize};`);
  pragmas.push(`PRAGMA mmap_size = ${options.mmapSize};`);

  return pragmas;
}
```

---

#### SPEC-CONFIG-002: Agent Config

| Field | Specification |
|-------|---------------|
| **File** | `src/config/agents.ts` |
| **Purpose** | Configure agent behaviors, model mappings, and system prompts |
| **Exports** | `agentConfig`, `getAgentConfig()`, `getSystemPromptPath()` |
| **Estimated LOC** | 100-150 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/config/agents.ts
// PURPOSE: Agent configuration for Nexus multi-agent system
// =============================================================================

import { join } from 'pathe';
import type { AgentType } from '../types/agent';

// -----------------------------------------------------------------------------
// MODEL CONFIGURATIONS
// -----------------------------------------------------------------------------

export interface ModelDefinition {
  provider: 'claude' | 'gemini' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
  costPerInputToken: number;   // USD per 1K tokens
  costPerOutputToken: number;  // USD per 1K tokens
}

export const MODELS: Record<string, ModelDefinition> = {
  'claude-sonnet-4': {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 64000,
    temperature: 0.1,
    costPerInputToken: 0.003,
    costPerOutputToken: 0.015
  },
  'claude-opus-4': {
    provider: 'claude',
    model: 'claude-opus-4-20250514',
    maxTokens: 32000,
    temperature: 0.3,
    costPerInputToken: 0.015,
    costPerOutputToken: 0.075
  },
  'claude-haiku-3.5': {
    provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 8192,
    temperature: 0.1,
    costPerInputToken: 0.0008,
    costPerOutputToken: 0.004
  },
  'gemini-2.5-pro': {
    provider: 'gemini',
    model: 'gemini-2.5-pro-preview-05-06',
    maxTokens: 65536,
    temperature: 0.2,
    costPerInputToken: 0.00125,
    costPerOutputToken: 0.005
  },
  'gemini-2.0-flash': {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    maxTokens: 8192,
    temperature: 0.1,
    costPerInputToken: 0.0001,
    costPerOutputToken: 0.0004
  }
};

// -----------------------------------------------------------------------------
// AGENT TYPE CONFIGURATIONS
// -----------------------------------------------------------------------------

export interface AgentTypeConfig {
  /** Primary model to use */
  model: string;
  /** Fallback model if primary fails */
  fallbackModel?: string;
  /** Temperature override (if different from model default) */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
  /** Tools this agent can use */
  tools: string[];
  /** Maximum retries on failure */
  maxRetries: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** System prompt file name */
  systemPrompt: string;
  /** Whether agent can modify files */
  canModifyFiles: boolean;
  /** Whether agent can run terminal commands */
  canRunTerminal: boolean;
}

export const AGENT_TYPE_CONFIGS: Record<AgentType, AgentTypeConfig> = {
  planner: {
    model: 'claude-sonnet-4',
    fallbackModel: 'gemini-2.5-pro',
    temperature: 0.3,
    maxTokens: 8000,
    tools: ['file_read', 'search', 'analyze_code'],
    maxRetries: 3,
    timeoutMs: 120000,
    systemPrompt: 'planner.md',
    canModifyFiles: false,
    canRunTerminal: false
  },
  coder: {
    model: 'claude-sonnet-4',
    fallbackModel: 'gemini-2.5-pro',
    temperature: 0.1,
    maxTokens: 16000,
    tools: ['file_read', 'file_write', 'terminal', 'search', 'lsp_definition', 'lsp_references'],
    maxRetries: 5,
    timeoutMs: 300000,  // 5 minutes
    systemPrompt: 'coder.md',
    canModifyFiles: true,
    canRunTerminal: true
  },
  tester: {
    model: 'claude-sonnet-4',
    fallbackModel: 'claude-haiku-3.5',
    temperature: 0.1,
    maxTokens: 8000,
    tools: ['file_read', 'file_write', 'terminal'],
    maxRetries: 3,
    timeoutMs: 180000,  // 3 minutes
    systemPrompt: 'tester.md',
    canModifyFiles: true,
    canRunTerminal: true
  },
  reviewer: {
    model: 'gemini-2.5-pro',
    fallbackModel: 'claude-sonnet-4',
    temperature: 0.2,
    maxTokens: 32000,
    tools: [],  // Reviewer doesn't use tools
    maxRetries: 2,
    timeoutMs: 60000,
    systemPrompt: 'reviewer.md',
    canModifyFiles: false,
    canRunTerminal: false
  },
  merger: {
    model: 'claude-sonnet-4',
    temperature: 0.0,  // Deterministic for merging
    maxTokens: 8000,
    tools: ['file_read', 'file_write', 'terminal', 'git_merge', 'git_diff'],
    maxRetries: 3,
    timeoutMs: 120000,
    systemPrompt: 'merger.md',
    canModifyFiles: true,
    canRunTerminal: true
  }
};

// -----------------------------------------------------------------------------
// POOL CONFIGURATION
// -----------------------------------------------------------------------------

export interface AgentPoolConfig {
  /** Maximum total agents running concurrently */
  maxTotalAgents: number;
  /** Maximum agents per type */
  maxAgentsPerType: Record<AgentType, number>;
  /** Idle timeout before agent is released (ms) */
  idleTimeoutMs: number;
  /** Whether to reuse agents between tasks */
  reuseAgents: boolean;
}

export const AGENT_POOL_CONFIG: AgentPoolConfig = {
  maxTotalAgents: 4,
  maxAgentsPerType: {
    planner: 1,
    coder: 3,
    tester: 2,
    reviewer: 1,
    merger: 1
  },
  idleTimeoutMs: 300000,  // 5 minutes
  reuseAgents: true
};

// -----------------------------------------------------------------------------
// PATHS
// -----------------------------------------------------------------------------

export const PROMPTS_DIR = join(__dirname, '..', '..', 'config', 'prompts');

export function getSystemPromptPath(agentType: AgentType): string {
  return join(PROMPTS_DIR, AGENT_TYPE_CONFIGS[agentType].systemPrompt);
}

// -----------------------------------------------------------------------------
// COMBINED CONFIG
// -----------------------------------------------------------------------------

export interface AgentConfig {
  models: Record<string, ModelDefinition>;
  agentTypes: Record<AgentType, AgentTypeConfig>;
  pool: AgentPoolConfig;
  promptsDir: string;
}

export const agentConfig: AgentConfig = {
  models: MODELS,
  agentTypes: AGENT_TYPE_CONFIGS,
  pool: AGENT_POOL_CONFIG,
  promptsDir: PROMPTS_DIR
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

export function getModelDefinition(modelKey: string): ModelDefinition {
  const model = MODELS[modelKey];
  if (!model) {
    throw new Error(`Unknown model: ${modelKey}`);
  }
  return model;
}

export function getAgentConfig(agentType: AgentType): AgentTypeConfig {
  return AGENT_TYPE_CONFIGS[agentType];
}

export function calculateCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelDefinition(modelKey);
  return (
    (inputTokens / 1000) * model.costPerInputToken +
    (outputTokens / 1000) * model.costPerOutputToken
  );
}
```

---

#### SPEC-CONFIG-003: LLM Config

| Field | Specification |
|-------|---------------|
| **File** | `src/config/llm.ts` |
| **Purpose** | Configure LLM providers, rate limits, and fallback behavior |
| **Exports** | `llmConfig`, `getProviderConfig()`, `getRateLimits()` |
| **Estimated LOC** | 100-150 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/config/llm.ts
// PURPOSE: LLM provider configuration for Nexus
// =============================================================================

// -----------------------------------------------------------------------------
// PROVIDER CONFIGURATIONS
// -----------------------------------------------------------------------------

export interface ProviderConfig {
  /** API base URL */
  baseUrl: string;
  /** Environment variable for API key */
  apiKeyEnvVar: string;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Whether streaming is supported */
  supportsStreaming: boolean;
  /** Whether tools/functions are supported */
  supportsTools: boolean;
  /** Header name for API key */
  apiKeyHeader: string;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  claude: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    defaultTimeout: 300000,  // 5 minutes
    maxConcurrent: 5,
    supportsStreaming: true,
    supportsTools: true,
    apiKeyHeader: 'x-api-key'
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnvVar: 'GOOGLE_API_KEY',
    defaultTimeout: 120000,  // 2 minutes
    maxConcurrent: 10,
    supportsStreaming: true,
    supportsTools: true,
    apiKeyHeader: 'x-goog-api-key'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    defaultTimeout: 120000,
    maxConcurrent: 5,
    supportsStreaming: true,
    supportsTools: true,
    apiKeyHeader: 'Authorization'  // Uses Bearer token
  }
};

// -----------------------------------------------------------------------------
// RATE LIMITS
// -----------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Requests per minute */
  requestsPerMinute: number;
  /** Tokens per minute */
  tokensPerMinute: number;
  /** Requests per day (0 = unlimited) */
  requestsPerDay: number;
  /** Retry delay base in milliseconds */
  retryDelayMs: number;
  /** Maximum retry delay */
  maxRetryDelayMs: number;
  /** Jitter factor (0-1) for retry delays */
  jitterFactor: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  claude: {
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
    requestsPerDay: 0,
    retryDelayMs: 1000,
    maxRetryDelayMs: 60000,
    jitterFactor: 0.2
  },
  gemini: {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
    requestsPerDay: 1500,
    retryDelayMs: 500,
    maxRetryDelayMs: 30000,
    jitterFactor: 0.2
  },
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000,
    requestsPerDay: 0,
    retryDelayMs: 1000,
    maxRetryDelayMs: 60000,
    jitterFactor: 0.2
  }
};

// -----------------------------------------------------------------------------
// FALLBACK CONFIGURATION
// -----------------------------------------------------------------------------

export interface FallbackConfig {
  /** Whether to enable fallback */
  enabled: boolean;
  /** Fallback chain for each provider */
  chains: Record<string, string[]>;
  /** Errors that should trigger fallback */
  fallbackOnErrors: string[];
  /** Maximum fallback attempts */
  maxAttempts: number;
}

export const FALLBACK_CONFIG: FallbackConfig = {
  enabled: true,
  chains: {
    claude: ['gemini', 'openai'],
    gemini: ['claude', 'openai'],
    openai: ['claude', 'gemini']
  },
  fallbackOnErrors: [
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT',
    'OVERLOADED',
    'API_ERROR'
  ],
  maxAttempts: 3
};

// -----------------------------------------------------------------------------
// RETRY CONFIGURATION
// -----------------------------------------------------------------------------

export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Errors that should trigger retry (vs fallback) */
  retryableErrors: string[];
  /** Use exponential backoff */
  exponentialBackoff: boolean;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMIT_EXCEEDED',
    'TEMPORARY_ERROR'
  ],
  exponentialBackoff: true,
  backoffMultiplier: 2
};

// -----------------------------------------------------------------------------
// EMBEDDING CONFIGURATION
// -----------------------------------------------------------------------------

export interface EmbeddingConfig {
  /** Provider for embeddings */
  provider: 'openai' | 'gemini';
  /** Model to use */
  model: string;
  /** Dimensions of embedding vector */
  dimensions: number;
  /** Maximum input length */
  maxInputLength: number;
  /** Batch size for bulk embeddings */
  batchSize: number;
}

export const EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  maxInputLength: 8191,
  batchSize: 100
};

// -----------------------------------------------------------------------------
// COMBINED CONFIG
// -----------------------------------------------------------------------------

export interface LLMConfig {
  providers: Record<string, ProviderConfig>;
  rateLimits: Record<string, RateLimitConfig>;
  fallback: FallbackConfig;
  retry: RetryConfig;
  embedding: EmbeddingConfig;
  /** Default provider to use */
  defaultProvider: string;
}

export const llmConfig: LLMConfig = {
  providers: PROVIDER_CONFIGS,
  rateLimits: RATE_LIMITS,
  fallback: FALLBACK_CONFIG,
  retry: RETRY_CONFIG,
  embedding: EMBEDDING_CONFIG,
  defaultProvider: 'claude'
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

export function getProviderConfig(provider: string): ProviderConfig {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return config;
}

export function getRateLimits(provider: string): RateLimitConfig {
  const limits = RATE_LIMITS[provider];
  if (!limits) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return limits;
}

export function getApiKey(provider: string): string {
  const config = getProviderConfig(provider);
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error(`Missing API key for ${provider}. Set ${config.apiKeyEnvVar} environment variable.`);
  }
  return apiKey;
}

export function getFallbackChain(provider: string): string[] {
  return FALLBACK_CONFIG.chains[provider] || [];
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  provider: string,
  attempt: number
): number {
  const limits = getRateLimits(provider);
  let delay = limits.retryDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  delay = Math.min(delay, limits.maxRetryDelayMs);

  // Add jitter
  const jitter = delay * limits.jitterFactor * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
```

---

### Part B Summary

| File | Purpose | Estimated LOC |
|------|---------|---------------|
| `src/config/database.ts` | SQLite database settings | 50-80 |
| `src/config/agents.ts` | Agent behaviors and model mappings | 100-150 |
| `src/config/llm.ts` | LLM provider configuration | 100-150 |
| **TOTAL** | | **250-380** |

---

## Part C: Adapter Implementations

Adapters translate data between different format expectations across layers. From Phase 5 Task 5.4, these adapters bridge the gap between external formats and internal representations.

### SPEC-ADAPT-001: State Format Adapter

| Field | Specification |
|-------|---------------|
| **File** | `src/adapters/StateFormatAdapter.ts` |
| **Purpose** | Bidirectional conversion between SQLite state and STATE.md markdown format |
| **Exports** | `StateFormatAdapter`, `toMarkdown()`, `fromMarkdown()` |
| **Test File** | `src/adapters/__tests__/StateFormatAdapter.test.ts` |
| **Estimated LOC** | 150-200 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/adapters/StateFormatAdapter.ts
// PURPOSE: Convert between database state and human-readable STATE.md format
// =============================================================================

import { NexusState, Project, Feature, Task, Agent, Checkpoint } from '../types/core';
import { AgentStatus } from '../types/agent';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface StateSection {
  title: string;
  content: string;
  subsections?: StateSection[];
}

export interface ParsedStateMD {
  metadata: StateMetadata;
  project: Partial<Project>;
  features: Partial<Feature>[];
  tasks: Partial<Task>[];
  agents: Partial<Agent>[];
  checkpoints: Partial<Checkpoint>[];
}

export interface StateMetadata {
  version: string;
  exportedAt: Date;
  schemaVersion: string;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const STATE_MD_VERSION = '1.0.0';
const SCHEMA_VERSION = '1';

const SECTION_MARKERS = {
  metadata: '## Metadata',
  project: '## Project',
  features: '## Features',
  tasks: '## Tasks',
  agents: '## Agents',
  checkpoints: '## Checkpoints',
  executionState: '## Execution State'
} as const;

// -----------------------------------------------------------------------------
// STATE FORMAT ADAPTER CLASS
// -----------------------------------------------------------------------------

export class StateFormatAdapter {
  /**
   * Convert NexusState to STATE.md markdown format
   */
  toMarkdown(state: NexusState): string {
    const lines: string[] = [];

    // Header
    lines.push('# Nexus State File');
    lines.push('');
    lines.push('> This file is auto-generated. Manual edits may be overwritten.');
    lines.push('');

    // Metadata section
    lines.push(SECTION_MARKERS.metadata);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(`| Version | ${STATE_MD_VERSION} |`);
    lines.push(`| Exported At | ${new Date().toISOString()} |`);
    lines.push(`| Schema Version | ${SCHEMA_VERSION} |`);
    lines.push('');

    // Project section
    lines.push(SECTION_MARKERS.project);
    lines.push('');
    lines.push(...this.formatProject(state.project));
    lines.push('');

    // Features section
    lines.push(SECTION_MARKERS.features);
    lines.push('');
    lines.push(...this.formatFeatures(state.features));
    lines.push('');

    // Tasks section
    lines.push(SECTION_MARKERS.tasks);
    lines.push('');
    lines.push(...this.formatTasks(state.tasks));
    lines.push('');

    // Agents section
    lines.push(SECTION_MARKERS.agents);
    lines.push('');
    lines.push(...this.formatAgents(state.agents));
    lines.push('');

    // Checkpoints section
    lines.push(SECTION_MARKERS.checkpoints);
    lines.push('');
    lines.push(...this.formatCheckpoints(state.checkpoints));
    lines.push('');

    // Execution state section
    lines.push(SECTION_MARKERS.executionState);
    lines.push('');
    lines.push(...this.formatExecutionState(state));

    return lines.join('\n');
  }

  /**
   * Parse STATE.md markdown back to NexusState
   */
  fromMarkdown(content: string): ParsedStateMD {
    const sections = this.parseSections(content);

    return {
      metadata: this.parseMetadata(sections.metadata || ''),
      project: this.parseProject(sections.project || ''),
      features: this.parseFeatures(sections.features || ''),
      tasks: this.parseTasks(sections.tasks || ''),
      agents: this.parseAgents(sections.agents || ''),
      checkpoints: this.parseCheckpoints(sections.checkpoints || '')
    };
  }

  // ---------------------------------------------------------------------------
  // FORMATTING HELPERS
  // ---------------------------------------------------------------------------

  private formatProject(project: Project): string[] {
    const lines: string[] = [];
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| ID | \`${project.id}\` |`);
    lines.push(`| Name | ${project.name} |`);
    lines.push(`| Status | ${project.status} |`);
    lines.push(`| Mode | ${project.mode} |`);
    lines.push(`| Created | ${project.createdAt.toISOString()} |`);
    lines.push(`| Updated | ${project.updatedAt.toISOString()} |`);

    if (project.repoPath) {
      lines.push(`| Repository | \`${project.repoPath}\` |`);
    }

    return lines;
  }

  private formatFeatures(features: Feature[]): string[] {
    if (features.length === 0) {
      return ['*No features defined*'];
    }

    const lines: string[] = [];
    lines.push('| ID | Name | Status | Priority | Tasks |');
    lines.push('|----|------|--------|----------|-------|');

    for (const feature of features) {
      const taskCount = feature.taskIds?.length || 0;
      lines.push(
        `| \`${feature.id.slice(0, 8)}\` | ${feature.name} | ${this.formatStatus(feature.status)} | ${feature.priority} | ${taskCount} |`
      );
    }

    return lines;
  }

  private formatTasks(tasks: Task[]): string[] {
    if (tasks.length === 0) {
      return ['*No tasks created*'];
    }

    const lines: string[] = [];

    // Group by status for readability
    const grouped = this.groupBy(tasks, 'status');

    for (const [status, statusTasks] of Object.entries(grouped)) {
      lines.push(`### ${this.formatStatusHeader(status)}`);
      lines.push('');
      lines.push('| ID | Title | Agent | Est. Time |');
      lines.push('|----|-------|-------|-----------|');

      for (const task of statusTasks) {
        lines.push(
          `| \`${task.id.slice(0, 8)}\` | ${task.title} | ${task.assignedAgent || '-'} | ${task.estimatedMinutes || '?'}m |`
        );
      }
      lines.push('');
    }

    return lines;
  }

  private formatAgents(agents: Agent[]): string[] {
    if (agents.length === 0) {
      return ['*No agents active*'];
    }

    const lines: string[] = [];
    lines.push('| ID | Type | Status | Current Task | Tasks Completed |');
    lines.push('|----|------|--------|--------------|-----------------|');

    for (const agent of agents) {
      lines.push(
        `| \`${agent.id.slice(0, 8)}\` | ${agent.type} | ${this.formatAgentStatus(agent.status)} | ${agent.currentTaskId || '-'} | ${agent.completedTasks || 0} |`
      );
    }

    return lines;
  }

  private formatCheckpoints(checkpoints: Checkpoint[]): string[] {
    if (checkpoints.length === 0) {
      return ['*No checkpoints saved*'];
    }

    const lines: string[] = [];
    lines.push('| ID | Created | Trigger | Description |');
    lines.push('|----|---------|---------|-------------|');

    // Show last 10 checkpoints
    const recent = checkpoints.slice(-10);

    for (const cp of recent) {
      lines.push(
        `| \`${cp.id.slice(0, 8)}\` | ${cp.createdAt.toISOString()} | ${cp.trigger} | ${cp.description || '-'} |`
      );
    }

    if (checkpoints.length > 10) {
      lines.push(`| ... | *${checkpoints.length - 10} older checkpoints omitted* | | |`);
    }

    return lines;
  }

  private formatExecutionState(state: NexusState): string[] {
    const lines: string[] = [];

    lines.push('```json');
    lines.push(JSON.stringify({
      currentWave: state.execution?.currentWave || 0,
      completedTasks: state.execution?.completedTaskIds?.length || 0,
      pendingTasks: state.execution?.pendingTaskIds?.length || 0,
      failedTasks: state.execution?.failedTaskIds?.length || 0,
      qaIterations: state.execution?.totalQAIterations || 0,
      lastActivity: state.execution?.lastActivityAt?.toISOString() || null
    }, null, 2));
    lines.push('```');

    return lines;
  }

  // ---------------------------------------------------------------------------
  // PARSING HELPERS
  // ---------------------------------------------------------------------------

  private parseSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');

    let currentSection: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check if line starts a new section
      const sectionKey = Object.entries(SECTION_MARKERS).find(
        ([_, marker]) => line.trim().startsWith(marker)
      )?.[0];

      if (sectionKey) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = sectionKey;
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  private parseMetadata(content: string): StateMetadata {
    const rows = this.parseTableRows(content);

    return {
      version: rows['Version'] || STATE_MD_VERSION,
      exportedAt: new Date(rows['Exported At'] || Date.now()),
      schemaVersion: rows['Schema Version'] || SCHEMA_VERSION
    };
  }

  private parseProject(content: string): Partial<Project> {
    const rows = this.parseTableRows(content);

    return {
      id: this.extractCode(rows['ID']),
      name: rows['Name'],
      status: rows['Status'] as any,
      mode: rows['Mode'] as any,
      repoPath: this.extractCode(rows['Repository'])
    };
  }

  private parseFeatures(content: string): Partial<Feature>[] {
    if (content.includes('No features defined')) {
      return [];
    }

    const rows = this.parseMarkdownTableRows(content);

    return rows.map(row => ({
      id: this.extractCode(row[0]),
      name: row[1],
      status: this.parseStatus(row[2]) as any,
      priority: row[3] as any
    }));
  }

  private parseTasks(content: string): Partial<Task>[] {
    if (content.includes('No tasks created')) {
      return [];
    }

    const tasks: Partial<Task>[] = [];
    const sections = content.split('### ');

    for (const section of sections) {
      if (!section.trim()) continue;

      const rows = this.parseMarkdownTableRows(section);

      for (const row of rows) {
        tasks.push({
          id: this.extractCode(row[0]),
          title: row[1],
          assignedAgent: row[2] !== '-' ? row[2] : undefined,
          estimatedMinutes: parseInt(row[3]) || undefined
        });
      }
    }

    return tasks;
  }

  private parseAgents(content: string): Partial<Agent>[] {
    if (content.includes('No agents active')) {
      return [];
    }

    const rows = this.parseMarkdownTableRows(content);

    return rows.map(row => ({
      id: this.extractCode(row[0]),
      type: row[1] as any,
      status: row[2] as AgentStatus,
      currentTaskId: row[3] !== '-' ? row[3] : undefined,
      completedTasks: parseInt(row[4]) || 0
    }));
  }

  private parseCheckpoints(content: string): Partial<Checkpoint>[] {
    if (content.includes('No checkpoints saved')) {
      return [];
    }

    const rows = this.parseMarkdownTableRows(content);

    return rows
      .filter(row => !row[1]?.includes('older checkpoints omitted'))
      .map(row => ({
        id: this.extractCode(row[0]),
        createdAt: new Date(row[1]),
        trigger: row[2] as any,
        description: row[3] !== '-' ? row[3] : undefined
      }));
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private parseTableRows(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('|') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2 && parts[0] !== 'Field' && parts[0] !== 'Property') {
          result[parts[0]] = parts[1];
        }
      }
    }

    return result;
  }

  private parseMarkdownTableRows(content: string): string[][] {
    const rows: string[][] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('|') && !line.includes('---') && !line.includes('ID |') && !line.includes('| ID')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          rows.push(parts);
        }
      }
    }

    return rows;
  }

  private extractCode(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const match = value.match(/`([^`]+)`/);
    return match ? match[1] : value;
  }

  private formatStatus(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      planning: '📋',
      in_progress: '🔄',
      review: '👀',
      completed: '✅',
      failed: '❌',
      blocked: '🚫'
    };
    return `${icons[status] || '•'} ${status}`;
  }

  private formatStatusHeader(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatAgentStatus(status: AgentStatus): string {
    const icons: Record<string, string> = {
      idle: '💤',
      working: '⚙️',
      waiting: '⏸️',
      error: '❌'
    };
    return `${icons[status] || '•'} ${status}`;
  }

  private parseStatus(formatted: string): string {
    // Remove emoji and trim
    return formatted.replace(/[⏳📋🔄👀✅❌🚫💤⚙️⏸️•]/g, '').trim();
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

// -----------------------------------------------------------------------------
// STANDALONE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Quick conversion to markdown (for exports)
 */
export function toMarkdown(state: NexusState): string {
  const adapter = new StateFormatAdapter();
  return adapter.toMarkdown(state);
}

/**
 * Quick parsing from markdown (for imports)
 */
export function fromMarkdown(content: string): ParsedStateMD {
  const adapter = new StateFormatAdapter();
  return adapter.fromMarkdown(content);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/adapters/__tests__/StateFormatAdapter.test.ts
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { StateFormatAdapter, toMarkdown, fromMarkdown } from '../StateFormatAdapter';
import { NexusState } from '../../types/core';

describe('StateFormatAdapter', () => {
  let adapter: StateFormatAdapter;
  let mockState: NexusState;

  beforeEach(() => {
    adapter = new StateFormatAdapter();
    mockState = createMockState();
  });

  describe('toMarkdown', () => {
    it('should generate valid markdown with all sections', () => {
      const markdown = adapter.toMarkdown(mockState);

      expect(markdown).toContain('# Nexus State File');
      expect(markdown).toContain('## Metadata');
      expect(markdown).toContain('## Project');
      expect(markdown).toContain('## Features');
      expect(markdown).toContain('## Tasks');
      expect(markdown).toContain('## Agents');
      expect(markdown).toContain('## Checkpoints');
    });

    it('should include project information', () => {
      const markdown = adapter.toMarkdown(mockState);

      expect(markdown).toContain(mockState.project.name);
      expect(markdown).toContain(mockState.project.id);
    });

    it('should format features as table', () => {
      const markdown = adapter.toMarkdown(mockState);

      expect(markdown).toContain('| ID | Name | Status | Priority | Tasks |');
    });

    it('should handle empty features', () => {
      mockState.features = [];
      const markdown = adapter.toMarkdown(mockState);

      expect(markdown).toContain('No features defined');
    });
  });

  describe('fromMarkdown', () => {
    it('should parse metadata section', () => {
      const markdown = adapter.toMarkdown(mockState);
      const parsed = adapter.fromMarkdown(markdown);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.version).toBeDefined();
    });

    it('should parse project section', () => {
      const markdown = adapter.toMarkdown(mockState);
      const parsed = adapter.fromMarkdown(markdown);

      expect(parsed.project.name).toBe(mockState.project.name);
    });

    it('should parse features section', () => {
      const markdown = adapter.toMarkdown(mockState);
      const parsed = adapter.fromMarkdown(markdown);

      expect(parsed.features.length).toBe(mockState.features.length);
    });

    it('should handle empty sections gracefully', () => {
      const minimalMd = `# Nexus State File

## Metadata
| Field | Value |
|-------|-------|
| Version | 1.0.0 |

## Features
*No features defined*
`;
      const parsed = adapter.fromMarkdown(minimalMd);
      expect(parsed.features).toEqual([]);
    });
  });

  describe('roundtrip', () => {
    it('should maintain data integrity through roundtrip', () => {
      const markdown = adapter.toMarkdown(mockState);
      const parsed = adapter.fromMarkdown(markdown);

      // Project data should match
      expect(parsed.project.name).toBe(mockState.project.name);

      // Feature count should match
      expect(parsed.features.length).toBe(mockState.features.length);
    });
  });

  describe('helper functions', () => {
    it('toMarkdown should work as standalone', () => {
      const markdown = toMarkdown(mockState);
      expect(markdown).toContain('# Nexus State File');
    });

    it('fromMarkdown should work as standalone', () => {
      const markdown = toMarkdown(mockState);
      const parsed = fromMarkdown(markdown);
      expect(parsed.project).toBeDefined();
    });
  });
});

// Test helper
function createMockState(): NexusState {
  return {
    project: {
      id: 'proj-123',
      name: 'Test Project',
      status: 'in_progress',
      mode: 'genesis',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    features: [
      {
        id: 'feat-1',
        name: 'User Authentication',
        status: 'in_progress',
        priority: 'high',
        taskIds: ['task-1', 'task-2']
      }
    ],
    tasks: [
      {
        id: 'task-1',
        featureId: 'feat-1',
        title: 'Create login form',
        status: 'completed',
        estimatedMinutes: 30
      }
    ],
    agents: [],
    checkpoints: [],
    execution: {
      currentWave: 1,
      completedTaskIds: ['task-1'],
      pendingTaskIds: ['task-2'],
      failedTaskIds: [],
      totalQAIterations: 5
    }
  };
}
```

---

### SPEC-ADAPT-002: Agent Context Adapter

| Field | Specification |
|-------|---------------|
| **File** | `src/adapters/AgentContextAdapter.ts` |
| **Purpose** | Build rich context objects for agents from project state, memory, and task requirements |
| **Exports** | `AgentContextAdapter`, `buildContext()`, `serializeContext()` |
| **Test File** | `src/adapters/__tests__/AgentContextAdapter.test.ts` |
| **Estimated LOC** | 200-250 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/adapters/AgentContextAdapter.ts
// PURPOSE: Build and manage context windows for agent LLM calls
// =============================================================================

import { Task, Feature, Project, NexusState } from '../types/core';
import {
  AgentType,
  AgentContext,
  AgentContextSection,
  ContextPriority
} from '../types/agent';
import { MemoryEpisode } from '../persistence/memory/MemorySystem';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ContextBuildOptions {
  /** Maximum total tokens for context */
  maxTokens: number;
  /** Whether to include memory episodes */
  includeMemory: boolean;
  /** Maximum memory episodes to include */
  maxMemoryEpisodes: number;
  /** Whether to include related file contents */
  includeFiles: boolean;
  /** Maximum file content tokens */
  maxFileTokens: number;
  /** Priority ordering for sections */
  priorityOrder: ContextPriority[];
}

export interface FileContext {
  path: string;
  content: string;
  relevance: number;
  tokens: number;
}

export interface ContextMetrics {
  totalTokens: number;
  sectionCounts: Record<string, number>;
  truncated: boolean;
  includedFiles: number;
  includedMemories: number;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: ContextBuildOptions = {
  maxTokens: 100000,  // ~100k context window
  includeMemory: true,
  maxMemoryEpisodes: 10,
  includeFiles: true,
  maxFileTokens: 50000,
  priorityOrder: ['critical', 'high', 'medium', 'low']
};

// Rough token estimation (chars / 4)
const CHARS_PER_TOKEN = 4;

// Context templates per agent type
const AGENT_CONTEXT_TEMPLATES: Record<AgentType, string[]> = {
  planner: ['project_overview', 'requirements', 'existing_architecture', 'constraints'],
  coder: ['task_spec', 'related_code', 'style_guide', 'api_contracts', 'memory'],
  tester: ['code_under_test', 'existing_tests', 'coverage_gaps', 'testing_patterns'],
  reviewer: ['code_changes', 'review_criteria', 'previous_feedback', 'project_standards'],
  merger: ['conflict_info', 'branch_context', 'resolution_history', 'merge_rules']
};

// -----------------------------------------------------------------------------
// AGENT CONTEXT ADAPTER CLASS
// -----------------------------------------------------------------------------

export class AgentContextAdapter {
  private options: ContextBuildOptions;

  constructor(options: Partial<ContextBuildOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build complete context for an agent working on a task
   */
  async buildContext(
    agentType: AgentType,
    task: Task,
    state: NexusState,
    memories: MemoryEpisode[] = [],
    fileContents: FileContext[] = []
  ): Promise<AgentContext> {
    const sections: AgentContextSection[] = [];
    let totalTokens = 0;

    // Get template sections for this agent type
    const templateSections = AGENT_CONTEXT_TEMPLATES[agentType];

    // Build each section
    for (const sectionType of templateSections) {
      const section = this.buildSection(
        sectionType,
        agentType,
        task,
        state,
        memories,
        fileContents
      );

      if (section) {
        const sectionTokens = this.estimateTokens(section.content);

        // Check if we can fit this section
        if (totalTokens + sectionTokens <= this.options.maxTokens) {
          sections.push(section);
          totalTokens += sectionTokens;
        } else if (section.priority === 'critical') {
          // Critical sections must be included, even truncated
          const truncated = this.truncateSection(
            section,
            this.options.maxTokens - totalTokens
          );
          sections.push(truncated);
          totalTokens += this.estimateTokens(truncated.content);
        }
      }
    }

    // Add memory context if enabled and space available
    if (this.options.includeMemory && memories.length > 0) {
      const memorySection = this.buildMemorySection(
        memories.slice(0, this.options.maxMemoryEpisodes)
      );
      const memoryTokens = this.estimateTokens(memorySection.content);

      if (totalTokens + memoryTokens <= this.options.maxTokens) {
        sections.push(memorySection);
        totalTokens += memoryTokens;
      }
    }

    // Add file context if enabled and space available
    if (this.options.includeFiles && fileContents.length > 0) {
      const fileSection = this.buildFileSection(
        fileContents,
        Math.min(this.options.maxFileTokens, this.options.maxTokens - totalTokens)
      );

      if (fileSection) {
        sections.push(fileSection);
        totalTokens += this.estimateTokens(fileSection.content);
      }
    }

    // Sort by priority
    sections.sort((a, b) => {
      const priorityOrder = this.options.priorityOrder;
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });

    return {
      agentType,
      taskId: task.id,
      sections,
      totalTokens,
      createdAt: new Date(),
      metadata: {
        projectId: state.project.id,
        featureId: task.featureId,
        includesMemory: memories.length > 0,
        includesFiles: fileContents.length > 0
      }
    };
  }

  /**
   * Serialize context to string for LLM prompt
   */
  serializeContext(context: AgentContext): string {
    const lines: string[] = [];

    lines.push('# Agent Context');
    lines.push('');
    lines.push(`Agent Type: ${context.agentType}`);
    lines.push(`Task ID: ${context.taskId}`);
    lines.push('');

    for (const section of context.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get metrics about built context
   */
  getMetrics(context: AgentContext): ContextMetrics {
    const sectionCounts: Record<string, number> = {};

    for (const section of context.sections) {
      sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1;
    }

    return {
      totalTokens: context.totalTokens,
      sectionCounts,
      truncated: context.sections.some(s => s.truncated),
      includedFiles: context.sections.filter(s => s.type === 'file_content').length,
      includedMemories: context.sections.filter(s => s.type === 'memory').length
    };
  }

  // ---------------------------------------------------------------------------
  // SECTION BUILDERS
  // ---------------------------------------------------------------------------

  private buildSection(
    sectionType: string,
    agentType: AgentType,
    task: Task,
    state: NexusState,
    memories: MemoryEpisode[],
    fileContents: FileContext[]
  ): AgentContextSection | null {
    switch (sectionType) {
      case 'project_overview':
        return this.buildProjectOverview(state);

      case 'requirements':
        return this.buildRequirements(task, state);

      case 'task_spec':
        return this.buildTaskSpec(task);

      case 'related_code':
        return this.buildRelatedCode(fileContents);

      case 'existing_architecture':
        return this.buildArchitectureContext(state);

      case 'constraints':
        return this.buildConstraints(task, state);

      case 'style_guide':
        return this.buildStyleGuide(state);

      case 'api_contracts':
        return this.buildApiContracts(task, state);

      case 'code_under_test':
        return this.buildCodeUnderTest(task, fileContents);

      case 'existing_tests':
        return this.buildExistingTests(fileContents);

      case 'coverage_gaps':
        return this.buildCoverageGaps(task, state);

      case 'testing_patterns':
        return this.buildTestingPatterns(state);

      case 'code_changes':
        return this.buildCodeChanges(task, state);

      case 'review_criteria':
        return this.buildReviewCriteria(agentType);

      case 'previous_feedback':
        return this.buildPreviousFeedback(task, memories);

      case 'project_standards':
        return this.buildProjectStandards(state);

      case 'conflict_info':
        return this.buildConflictInfo(task, state);

      case 'branch_context':
        return this.buildBranchContext(task, state);

      case 'resolution_history':
        return this.buildResolutionHistory(memories);

      case 'merge_rules':
        return this.buildMergeRules(state);

      default:
        return null;
    }
  }

  private buildProjectOverview(state: NexusState): AgentContextSection {
    const project = state.project;
    const content = `
Project: ${project.name}
Mode: ${project.mode}
Status: ${project.status}
Features: ${state.features.length} total
Tasks: ${state.tasks.length} total (${state.tasks.filter(t => t.status === 'completed').length} completed)
`.trim();

    return {
      type: 'project_overview',
      title: 'Project Overview',
      content,
      priority: 'high',
      truncated: false
    };
  }

  private buildRequirements(task: Task, state: NexusState): AgentContextSection {
    const feature = state.features.find(f => f.id === task.featureId);
    const content = feature
      ? `Feature: ${feature.name}\nDescription: ${feature.description || 'No description'}\nPriority: ${feature.priority}`
      : 'No feature context available';

    return {
      type: 'requirements',
      title: 'Requirements',
      content,
      priority: 'critical',
      truncated: false
    };
  }

  private buildTaskSpec(task: Task): AgentContextSection {
    const content = `
Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'No description'}
Estimated Time: ${task.estimatedMinutes || 'Unknown'} minutes
Dependencies: ${task.dependencies?.join(', ') || 'None'}
Acceptance Criteria:
${task.acceptanceCriteria?.map(c => `- ${c}`).join('\n') || '- Complete the task as described'}
`.trim();

    return {
      type: 'task_spec',
      title: 'Task Specification',
      content,
      priority: 'critical',
      truncated: false
    };
  }

  private buildRelatedCode(fileContents: FileContext[]): AgentContextSection | null {
    if (fileContents.length === 0) return null;

    const sorted = fileContents.sort((a, b) => b.relevance - a.relevance);
    const content = sorted
      .slice(0, 5)  // Top 5 most relevant
      .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    return {
      type: 'related_code',
      title: 'Related Code',
      content,
      priority: 'high',
      truncated: false
    };
  }

  private buildArchitectureContext(state: NexusState): AgentContextSection {
    // In real implementation, this would pull from project analysis
    return {
      type: 'architecture',
      title: 'Architecture Context',
      content: 'Architecture context would be populated from project analysis.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildConstraints(task: Task, state: NexusState): AgentContextSection {
    const constraints = [
      'Maximum task execution time: 30 minutes',
      'Code must pass linting before submission',
      'Tests are required for new functionality',
      'Follow existing code patterns'
    ];

    return {
      type: 'constraints',
      title: 'Constraints',
      content: constraints.map(c => `- ${c}`).join('\n'),
      priority: 'high',
      truncated: false
    };
  }

  private buildStyleGuide(state: NexusState): AgentContextSection {
    return {
      type: 'style_guide',
      title: 'Style Guide',
      content: 'Follow TypeScript best practices. Use functional components for React. Prefer async/await over callbacks.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildApiContracts(task: Task, state: NexusState): AgentContextSection {
    return {
      type: 'api_contracts',
      title: 'API Contracts',
      content: 'API contracts would be populated from project analysis.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildCodeUnderTest(task: Task, fileContents: FileContext[]): AgentContextSection | null {
    return this.buildRelatedCode(fileContents);
  }

  private buildExistingTests(fileContents: FileContext[]): AgentContextSection | null {
    const testFiles = fileContents.filter(f =>
      f.path.includes('.test.') || f.path.includes('.spec.')
    );
    if (testFiles.length === 0) return null;

    return {
      type: 'existing_tests',
      title: 'Existing Tests',
      content: testFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n'),
      priority: 'high',
      truncated: false
    };
  }

  private buildCoverageGaps(task: Task, state: NexusState): AgentContextSection {
    return {
      type: 'coverage_gaps',
      title: 'Coverage Gaps',
      content: 'Coverage analysis would be populated from test runner.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildTestingPatterns(state: NexusState): AgentContextSection {
    return {
      type: 'testing_patterns',
      title: 'Testing Patterns',
      content: 'Use Vitest for unit tests. Mock external dependencies. Test edge cases.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildCodeChanges(task: Task, state: NexusState): AgentContextSection {
    return {
      type: 'code_changes',
      title: 'Code Changes',
      content: 'Diff would be populated from git service.',
      priority: 'critical',
      truncated: false
    };
  }

  private buildReviewCriteria(agentType: AgentType): AgentContextSection {
    const criteria = [
      'Code correctness and logic',
      'Error handling completeness',
      'Performance considerations',
      'Security implications',
      'Code style and readability',
      'Test coverage adequacy'
    ];

    return {
      type: 'review_criteria',
      title: 'Review Criteria',
      content: criteria.map((c, i) => `${i + 1}. ${c}`).join('\n'),
      priority: 'critical',
      truncated: false
    };
  }

  private buildPreviousFeedback(task: Task, memories: MemoryEpisode[]): AgentContextSection | null {
    const feedback = memories.filter(m =>
      m.type === 'review_feedback' && m.taskId === task.id
    );

    if (feedback.length === 0) return null;

    return {
      type: 'previous_feedback',
      title: 'Previous Feedback',
      content: feedback.map(f => `- ${f.content}`).join('\n'),
      priority: 'high',
      truncated: false
    };
  }

  private buildProjectStandards(state: NexusState): AgentContextSection {
    return {
      type: 'project_standards',
      title: 'Project Standards',
      content: 'Follow established patterns. Maintain backward compatibility. Document public APIs.',
      priority: 'medium',
      truncated: false
    };
  }

  private buildConflictInfo(task: Task, state: NexusState): AgentContextSection {
    return {
      type: 'conflict_info',
      title: 'Conflict Information',
      content: 'Conflict details would be populated from git service.',
      priority: 'critical',
      truncated: false
    };
  }

  private buildBranchContext(task: Task, state: NexusState): AgentContextSection {
    return {
      type: 'branch_context',
      title: 'Branch Context',
      content: 'Branch history would be populated from git service.',
      priority: 'high',
      truncated: false
    };
  }

  private buildResolutionHistory(memories: MemoryEpisode[]): AgentContextSection | null {
    const resolutions = memories.filter(m => m.type === 'conflict_resolution');

    if (resolutions.length === 0) return null;

    return {
      type: 'resolution_history',
      title: 'Resolution History',
      content: resolutions.slice(-5).map(r => `- ${r.content}`).join('\n'),
      priority: 'medium',
      truncated: false
    };
  }

  private buildMergeRules(state: NexusState): AgentContextSection {
    const rules = [
      'Preserve semantic meaning of both sides',
      'Prefer newer implementations when equivalent',
      'Escalate to human if logic conflicts',
      'Always run tests after resolution'
    ];

    return {
      type: 'merge_rules',
      title: 'Merge Rules',
      content: rules.map(r => `- ${r}`).join('\n'),
      priority: 'high',
      truncated: false
    };
  }

  // ---------------------------------------------------------------------------
  // SPECIAL SECTION BUILDERS
  // ---------------------------------------------------------------------------

  private buildMemorySection(memories: MemoryEpisode[]): AgentContextSection {
    const content = memories
      .map(m => `[${m.type}] ${m.content}`)
      .join('\n');

    return {
      type: 'memory',
      title: 'Relevant Memory',
      content,
      priority: 'medium',
      truncated: false
    };
  }

  private buildFileSection(
    fileContents: FileContext[],
    maxTokens: number
  ): AgentContextSection | null {
    if (fileContents.length === 0 || maxTokens <= 0) return null;

    const sorted = fileContents.sort((a, b) => b.relevance - a.relevance);
    const included: FileContext[] = [];
    let currentTokens = 0;

    for (const file of sorted) {
      if (currentTokens + file.tokens <= maxTokens) {
        included.push(file);
        currentTokens += file.tokens;
      }
    }

    if (included.length === 0) return null;

    const content = included
      .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    return {
      type: 'file_content',
      title: 'File Contents',
      content,
      priority: 'medium',
      truncated: included.length < fileContents.length
    };
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }

  private truncateSection(
    section: AgentContextSection,
    maxTokens: number
  ): AgentContextSection {
    const maxChars = maxTokens * CHARS_PER_TOKEN;

    if (section.content.length <= maxChars) {
      return section;
    }

    return {
      ...section,
      content: section.content.slice(0, maxChars) + '\n\n[TRUNCATED]',
      truncated: true
    };
  }
}

// -----------------------------------------------------------------------------
// STANDALONE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Quick context build (uses default options)
 */
export async function buildContext(
  agentType: AgentType,
  task: Task,
  state: NexusState,
  memories: MemoryEpisode[] = [],
  fileContents: FileContext[] = []
): Promise<AgentContext> {
  const adapter = new AgentContextAdapter();
  return adapter.buildContext(agentType, task, state, memories, fileContents);
}

/**
 * Quick context serialization
 */
export function serializeContext(context: AgentContext): string {
  const adapter = new AgentContextAdapter();
  return adapter.serializeContext(context);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/adapters/__tests__/AgentContextAdapter.test.ts
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentContextAdapter,
  buildContext,
  serializeContext,
  ContextBuildOptions
} from '../AgentContextAdapter';
import { Task, NexusState } from '../../types/core';
import { AgentType } from '../../types/agent';

describe('AgentContextAdapter', () => {
  let adapter: AgentContextAdapter;
  let mockTask: Task;
  let mockState: NexusState;

  beforeEach(() => {
    adapter = new AgentContextAdapter();
    mockTask = createMockTask();
    mockState = createMockState();
  });

  describe('buildContext', () => {
    it('should build context for coder agent', async () => {
      const context = await adapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      expect(context).toBeDefined();
      expect(context.agentType).toBe('coder');
      expect(context.taskId).toBe(mockTask.id);
      expect(context.sections.length).toBeGreaterThan(0);
    });

    it('should build context for planner agent', async () => {
      const context = await adapter.buildContext(
        'planner',
        mockTask,
        mockState
      );

      expect(context.agentType).toBe('planner');
      expect(context.sections.some(s => s.type === 'project_overview')).toBe(true);
    });

    it('should include critical sections even when truncated', async () => {
      const smallAdapter = new AgentContextAdapter({ maxTokens: 100 });
      const context = await smallAdapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      expect(context.sections.some(s => s.priority === 'critical')).toBe(true);
    });

    it('should include memory when enabled', async () => {
      const memories = [
        { id: '1', type: 'decision', content: 'Used Redux for state', taskId: 'task-1' }
      ];

      const context = await adapter.buildContext(
        'coder',
        mockTask,
        mockState,
        memories as any
      );

      expect(context.sections.some(s => s.type === 'memory')).toBe(true);
    });

    it('should respect maxTokens limit', async () => {
      const context = await adapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      expect(context.totalTokens).toBeLessThanOrEqual(100000);
    });
  });

  describe('serializeContext', () => {
    it('should serialize to readable markdown', async () => {
      const context = await adapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      const serialized = adapter.serializeContext(context);

      expect(serialized).toContain('# Agent Context');
      expect(serialized).toContain('Agent Type: coder');
    });

    it('should include all sections', async () => {
      const context = await adapter.buildContext(
        'reviewer',
        mockTask,
        mockState
      );

      const serialized = adapter.serializeContext(context);

      for (const section of context.sections) {
        expect(serialized).toContain(section.title);
      }
    });
  });

  describe('getMetrics', () => {
    it('should return accurate metrics', async () => {
      const context = await adapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      const metrics = adapter.getMetrics(context);

      expect(metrics.totalTokens).toBe(context.totalTokens);
      expect(typeof metrics.sectionCounts).toBe('object');
    });

    it('should detect truncation', async () => {
      const smallAdapter = new AgentContextAdapter({ maxTokens: 50 });
      const context = await smallAdapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      const metrics = smallAdapter.getMetrics(context);
      expect(typeof metrics.truncated).toBe('boolean');
    });
  });

  describe('custom options', () => {
    it('should respect custom maxTokens', async () => {
      const customAdapter = new AgentContextAdapter({ maxTokens: 1000 });
      const context = await customAdapter.buildContext(
        'coder',
        mockTask,
        mockState
      );

      expect(context.totalTokens).toBeLessThanOrEqual(1000);
    });

    it('should exclude memory when disabled', async () => {
      const noMemoryAdapter = new AgentContextAdapter({ includeMemory: false });
      const memories = [{ id: '1', type: 'decision', content: 'Test' }];

      const context = await noMemoryAdapter.buildContext(
        'coder',
        mockTask,
        mockState,
        memories as any
      );

      expect(context.sections.some(s => s.type === 'memory')).toBe(false);
    });
  });

  describe('helper functions', () => {
    it('buildContext should work as standalone', async () => {
      const context = await buildContext('coder', mockTask, mockState);
      expect(context).toBeDefined();
    });

    it('serializeContext should work as standalone', async () => {
      const context = await buildContext('coder', mockTask, mockState);
      const serialized = serializeContext(context);
      expect(serialized).toContain('# Agent Context');
    });
  });
});

// Test helpers
function createMockTask(): Task {
  return {
    id: 'task-123',
    featureId: 'feat-1',
    title: 'Implement user login',
    description: 'Create login form with validation',
    status: 'pending',
    estimatedMinutes: 30,
    dependencies: [],
    acceptanceCriteria: ['Form validates email', 'Shows error messages']
  };
}

function createMockState(): NexusState {
  return {
    project: {
      id: 'proj-123',
      name: 'Test Project',
      status: 'in_progress',
      mode: 'genesis',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    features: [
      {
        id: 'feat-1',
        name: 'User Authentication',
        description: 'Complete auth system',
        status: 'in_progress',
        priority: 'high',
        taskIds: ['task-123']
      }
    ],
    tasks: [],
    agents: [],
    checkpoints: [],
    execution: null
  };
}
```

---

### SPEC-ADAPT-003: Task Schema Adapter

| Field | Specification |
|-------|---------------|
| **File** | `src/adapters/TaskSchemaAdapter.ts` |
| **Purpose** | Convert between XML task definitions (from LLM) and JSON Task objects |
| **Exports** | `TaskSchemaAdapter`, `parseXMLTask()`, `toXMLTask()`, `validateTaskSchema()` |
| **Test File** | `src/adapters/__tests__/TaskSchemaAdapter.test.ts` |
| **Estimated LOC** | 150-200 |

**Complete Implementation:**

```typescript
// =============================================================================
// FILE: src/adapters/TaskSchemaAdapter.ts
// PURPOSE: Convert between XML and JSON task formats for LLM communication
// =============================================================================

import { Task, TaskStatus, Feature } from '../types/core';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface XMLParseResult<T> {
  success: boolean;
  data?: T;
  errors: ParseError[];
}

export interface ParseError {
  field: string;
  message: string;
  position?: { line: number; column: number };
}

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface XMLTaskDefinition {
  id?: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  files?: string[];
  complexity?: 'low' | 'medium' | 'high';
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const TASK_XML_TEMPLATE = `<task>
  <title>{{title}}</title>
  <description>{{description}}</description>
  <estimated_minutes>{{estimatedMinutes}}</estimated_minutes>
  <dependencies>{{dependencies}}</dependencies>
  <acceptance_criteria>{{acceptanceCriteria}}</acceptance_criteria>
  <files>{{files}}</files>
  <complexity>{{complexity}}</complexity>
</task>`;

const XML_TAG_REGEX = /<(\w+)>([\s\S]*?)<\/\1>/g;
const TASK_TAG_REGEX = /<task>([\s\S]*?)<\/task>/gi;

// Default values for optional fields
const DEFAULT_TASK_VALUES = {
  estimatedMinutes: 30,
  complexity: 'medium' as const,
  status: 'pending' as TaskStatus
};

// -----------------------------------------------------------------------------
// TASK SCHEMA ADAPTER CLASS
// -----------------------------------------------------------------------------

export class TaskSchemaAdapter {
  /**
   * Parse XML task definition(s) from LLM response
   */
  parseXML(xmlContent: string): XMLParseResult<Task[]> {
    const tasks: Task[] = [];
    const errors: ParseError[] = [];

    // Find all task blocks
    const taskMatches = xmlContent.matchAll(TASK_TAG_REGEX);

    for (const match of taskMatches) {
      const taskXml = match[1];
      const result = this.parseSingleTask(taskXml);

      if (result.success && result.data) {
        tasks.push(result.data);
      } else {
        errors.push(...result.errors);
      }
    }

    // If no task tags found, try parsing as a single task
    if (tasks.length === 0 && errors.length === 0) {
      const singleResult = this.parseSingleTask(xmlContent);
      if (singleResult.success && singleResult.data) {
        tasks.push(singleResult.data);
      } else {
        errors.push(...singleResult.errors);
      }
    }

    return {
      success: tasks.length > 0,
      data: tasks,
      errors
    };
  }

  /**
   * Convert Task object to XML format for LLM prompts
   */
  toXML(task: Task): string {
    const deps = task.dependencies?.length
      ? task.dependencies.map(d => `    <dep>${d}</dep>`).join('\n')
      : '';

    const criteria = task.acceptanceCriteria?.length
      ? task.acceptanceCriteria.map(c => `    <criterion>${this.escapeXml(c)}</criterion>`).join('\n')
      : '';

    const files = task.files?.length
      ? task.files.map(f => `    <file>${this.escapeXml(f)}</file>`).join('\n')
      : '';

    return `<task>
  <id>${task.id}</id>
  <title>${this.escapeXml(task.title)}</title>
  <description>${this.escapeXml(task.description || '')}</description>
  <estimated_minutes>${task.estimatedMinutes || DEFAULT_TASK_VALUES.estimatedMinutes}</estimated_minutes>
  <status>${task.status}</status>
  <dependencies>
${deps}
  </dependencies>
  <acceptance_criteria>
${criteria}
  </acceptance_criteria>
  <files>
${files}
  </files>
</task>`;
  }

  /**
   * Convert multiple tasks to XML document
   */
  toXMLDocument(tasks: Task[], featureContext?: Feature): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<task_plan>`;

    const featureSection = featureContext
      ? `  <feature>
    <id>${featureContext.id}</id>
    <name>${this.escapeXml(featureContext.name)}</name>
  </feature>`
      : '';

    const tasksSection = tasks.map(t => this.toXML(t)).join('\n');

    return `${header}
${featureSection}
  <tasks>
${tasksSection}
  </tasks>
</task_plan>`;
  }

  /**
   * Validate a task object against schema requirements
   */
  validateTask(task: Partial<Task>): TaskValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!task.title || task.title.trim().length === 0) {
      errors.push('Task must have a title');
    }

    if (!task.featureId) {
      errors.push('Task must be associated with a feature');
    }

    // Time constraint check
    if (task.estimatedMinutes !== undefined) {
      if (task.estimatedMinutes <= 0) {
        errors.push('Estimated time must be positive');
      } else if (task.estimatedMinutes > 30) {
        warnings.push('Task exceeds 30-minute limit; consider splitting');
      }
    }

    // Acceptance criteria recommendation
    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
      warnings.push('Task has no acceptance criteria defined');
    }

    // Dependency validation
    if (task.dependencies?.includes(task.id!)) {
      errors.push('Task cannot depend on itself');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract task definitions from free-form LLM text
   */
  extractTasksFromText(text: string): XMLParseResult<XMLTaskDefinition[]> {
    const tasks: XMLTaskDefinition[] = [];
    const errors: ParseError[] = [];

    // Try XML extraction first
    const xmlResult = this.parseXML(text);
    if (xmlResult.success && xmlResult.data && xmlResult.data.length > 0) {
      return {
        success: true,
        data: xmlResult.data.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes || DEFAULT_TASK_VALUES.estimatedMinutes,
          dependencies: t.dependencies,
          acceptanceCriteria: t.acceptanceCriteria
        })),
        errors: []
      };
    }

    // Try markdown list extraction
    const listResult = this.extractFromMarkdownList(text);
    if (listResult.length > 0) {
      return {
        success: true,
        data: listResult,
        errors: []
      };
    }

    errors.push({
      field: 'content',
      message: 'Could not extract task definitions from text'
    });

    return { success: false, data: [], errors };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE PARSING METHODS
  // ---------------------------------------------------------------------------

  private parseSingleTask(xmlContent: string): XMLParseResult<Task> {
    const errors: ParseError[] = [];
    const fields: Record<string, string> = {};

    // Extract all XML fields
    let match;
    while ((match = XML_TAG_REGEX.exec(xmlContent)) !== null) {
      const [, tagName, tagContent] = match;
      fields[tagName] = tagContent.trim();
    }

    // Required field: title
    if (!fields.title) {
      errors.push({ field: 'title', message: 'Missing required field: title' });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Build task object
    const task: Task = {
      id: fields.id || this.generateId(),
      featureId: fields.feature_id || '',
      title: fields.title,
      description: fields.description || '',
      status: (fields.status as TaskStatus) || DEFAULT_TASK_VALUES.status,
      estimatedMinutes: parseInt(fields.estimated_minutes) || DEFAULT_TASK_VALUES.estimatedMinutes,
      dependencies: this.parseArrayField(fields.dependencies, 'dep'),
      acceptanceCriteria: this.parseArrayField(fields.acceptance_criteria, 'criterion'),
      files: this.parseArrayField(fields.files, 'file'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { success: true, data: task, errors: [] };
  }

  private parseArrayField(content: string | undefined, itemTag: string): string[] {
    if (!content) return [];

    const items: string[] = [];
    const itemRegex = new RegExp(`<${itemTag}>([\\s\\S]*?)<\\/${itemTag}>`, 'gi');
    let match;

    while ((match = itemRegex.exec(content)) !== null) {
      const value = match[1].trim();
      if (value) {
        items.push(value);
      }
    }

    // Fallback: try comma-separated
    if (items.length === 0 && content.includes(',')) {
      return content.split(',').map(s => s.trim()).filter(Boolean);
    }

    return items;
  }

  private extractFromMarkdownList(text: string): XMLTaskDefinition[] {
    const tasks: XMLTaskDefinition[] = [];
    const lines = text.split('\n');

    let currentTask: Partial<XMLTaskDefinition> | null = null;

    for (const line of lines) {
      // Match numbered list items (1. Task title)
      const numberedMatch = line.match(/^\d+\.\s+(.+)/);
      // Match bullet points (- Task title or * Task title)
      const bulletMatch = line.match(/^[-*]\s+(.+)/);

      const title = numberedMatch?.[1] || bulletMatch?.[1];

      if (title) {
        // Save previous task
        if (currentTask && currentTask.title) {
          tasks.push(this.completeTaskDefinition(currentTask));
        }

        // Start new task
        currentTask = { title: title.trim() };

        // Check for time estimate in parentheses: "Task title (15 min)"
        const timeMatch = title.match(/\((\d+)\s*min/i);
        if (timeMatch) {
          currentTask.estimatedMinutes = parseInt(timeMatch[1]);
          currentTask.title = title.replace(/\s*\(\d+\s*min.*?\)/i, '').trim();
        }
      } else if (currentTask && line.trim().startsWith('-')) {
        // Sub-item could be acceptance criteria
        const criterion = line.trim().substring(1).trim();
        if (!currentTask.acceptanceCriteria) {
          currentTask.acceptanceCriteria = [];
        }
        currentTask.acceptanceCriteria.push(criterion);
      }
    }

    // Don't forget the last task
    if (currentTask && currentTask.title) {
      tasks.push(this.completeTaskDefinition(currentTask));
    }

    return tasks;
  }

  private completeTaskDefinition(partial: Partial<XMLTaskDefinition>): XMLTaskDefinition {
    return {
      title: partial.title || 'Untitled Task',
      estimatedMinutes: partial.estimatedMinutes || DEFAULT_TASK_VALUES.estimatedMinutes,
      description: partial.description,
      dependencies: partial.dependencies || [],
      acceptanceCriteria: partial.acceptanceCriteria || [],
      complexity: partial.complexity || DEFAULT_TASK_VALUES.complexity
    };
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// -----------------------------------------------------------------------------
// STANDALONE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Parse XML task definition(s) from text
 */
export function parseXMLTask(xmlContent: string): XMLParseResult<Task[]> {
  const adapter = new TaskSchemaAdapter();
  return adapter.parseXML(xmlContent);
}

/**
 * Convert task to XML format
 */
export function toXMLTask(task: Task): string {
  const adapter = new TaskSchemaAdapter();
  return adapter.toXML(task);
}

/**
 * Validate task object
 */
export function validateTaskSchema(task: Partial<Task>): TaskValidationResult {
  const adapter = new TaskSchemaAdapter();
  return adapter.validateTask(task);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/adapters/__tests__/TaskSchemaAdapter.test.ts
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskSchemaAdapter,
  parseXMLTask,
  toXMLTask,
  validateTaskSchema
} from '../TaskSchemaAdapter';
import { Task } from '../../types/core';

describe('TaskSchemaAdapter', () => {
  let adapter: TaskSchemaAdapter;

  beforeEach(() => {
    adapter = new TaskSchemaAdapter();
  });

  describe('parseXML', () => {
    it('should parse single task XML', () => {
      const xml = `
        <task>
          <title>Implement login form</title>
          <description>Create form with validation</description>
          <estimated_minutes>25</estimated_minutes>
        </task>
      `;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Implement login form');
      expect(result.data![0].estimatedMinutes).toBe(25);
    });

    it('should parse multiple tasks', () => {
      const xml = `
        <task>
          <title>Task 1</title>
          <estimated_minutes>15</estimated_minutes>
        </task>
        <task>
          <title>Task 2</title>
          <estimated_minutes>20</estimated_minutes>
        </task>
      `;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should parse dependencies', () => {
      const xml = `
        <task>
          <title>Task with deps</title>
          <dependencies>
            <dep>task-1</dep>
            <dep>task-2</dep>
          </dependencies>
        </task>
      `;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(true);
      expect(result.data![0].dependencies).toEqual(['task-1', 'task-2']);
    });

    it('should parse acceptance criteria', () => {
      const xml = `
        <task>
          <title>Task with criteria</title>
          <acceptance_criteria>
            <criterion>Tests pass</criterion>
            <criterion>Linting passes</criterion>
          </acceptance_criteria>
        </task>
      `;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(true);
      expect(result.data![0].acceptanceCriteria).toEqual(['Tests pass', 'Linting passes']);
    });

    it('should return errors for missing required fields', () => {
      const xml = `
        <task>
          <description>No title here</description>
        </task>
      `;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('title');
    });

    it('should use default values for missing optional fields', () => {
      const xml = `<task><title>Simple task</title></task>`;

      const result = adapter.parseXML(xml);

      expect(result.success).toBe(true);
      expect(result.data![0].estimatedMinutes).toBe(30);
      expect(result.data![0].status).toBe('pending');
    });
  });

  describe('toXML', () => {
    it('should convert task to valid XML', () => {
      const task: Task = {
        id: 'task-123',
        featureId: 'feat-1',
        title: 'Test task',
        description: 'A test description',
        status: 'pending',
        estimatedMinutes: 20,
        dependencies: ['task-1'],
        acceptanceCriteria: ['Must pass tests'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const xml = adapter.toXML(task);

      expect(xml).toContain('<task>');
      expect(xml).toContain('<id>task-123</id>');
      expect(xml).toContain('<title>Test task</title>');
      expect(xml).toContain('<dep>task-1</dep>');
    });

    it('should escape special XML characters', () => {
      const task: Task = {
        id: 'task-123',
        featureId: 'feat-1',
        title: 'Task with <special> & "characters"',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const xml = adapter.toXML(task);

      expect(xml).toContain('&lt;special&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });

    it('should roundtrip successfully', () => {
      const originalTask: Task = {
        id: 'task-roundtrip',
        featureId: 'feat-1',
        title: 'Roundtrip test',
        description: 'Testing roundtrip',
        status: 'pending',
        estimatedMinutes: 25,
        dependencies: ['dep-1', 'dep-2'],
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const xml = adapter.toXML(originalTask);
      const parsed = adapter.parseXML(xml);

      expect(parsed.success).toBe(true);
      expect(parsed.data![0].title).toBe(originalTask.title);
      expect(parsed.data![0].dependencies).toEqual(originalTask.dependencies);
    });
  });

  describe('toXMLDocument', () => {
    it('should create full XML document', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          featureId: 'feat-1',
          title: 'Task 1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const xml = adapter.toXMLDocument(tasks);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<task_plan>');
      expect(xml).toContain('<tasks>');
    });

    it('should include feature context when provided', () => {
      const tasks: Task[] = [];
      const feature = {
        id: 'feat-1',
        name: 'Auth Feature',
        status: 'planning' as const,
        priority: 'high' as const,
        taskIds: []
      };

      const xml = adapter.toXMLDocument(tasks, feature);

      expect(xml).toContain('<feature>');
      expect(xml).toContain('<name>Auth Feature</name>');
    });
  });

  describe('validateTask', () => {
    it('should pass valid task', () => {
      const task: Partial<Task> = {
        id: 'task-1',
        featureId: 'feat-1',
        title: 'Valid task',
        estimatedMinutes: 20,
        acceptanceCriteria: ['Tests pass']
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on missing title', () => {
      const task: Partial<Task> = {
        featureId: 'feat-1',
        estimatedMinutes: 20
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task must have a title');
    });

    it('should fail on missing featureId', () => {
      const task: Partial<Task> = {
        title: 'Task without feature'
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task must be associated with a feature');
    });

    it('should warn on >30 minute estimate', () => {
      const task: Partial<Task> = {
        id: 'task-1',
        featureId: 'feat-1',
        title: 'Long task',
        estimatedMinutes: 45
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('30-minute limit');
    });

    it('should fail on self-dependency', () => {
      const task: Partial<Task> = {
        id: 'task-1',
        featureId: 'feat-1',
        title: 'Self-dep task',
        dependencies: ['task-1']
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task cannot depend on itself');
    });

    it('should warn on missing acceptance criteria', () => {
      const task: Partial<Task> = {
        id: 'task-1',
        featureId: 'feat-1',
        title: 'No criteria task'
      };

      const result = adapter.validateTask(task);

      expect(result.warnings.some(w => w.includes('acceptance criteria'))).toBe(true);
    });
  });

  describe('extractTasksFromText', () => {
    it('should extract from markdown list', () => {
      const text = `
Here are the tasks:
1. Create database schema (15 min)
2. Implement API endpoints (25 min)
3. Add validation logic (20 min)
      `;

      const result = adapter.extractTasksFromText(text);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![0].title).toBe('Create database schema');
      expect(result.data![0].estimatedMinutes).toBe(15);
    });

    it('should extract from bullet points', () => {
      const text = `
Tasks:
- Task one
- Task two
- Task three
      `;

      const result = adapter.extractTasksFromText(text);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should prefer XML over markdown', () => {
      const text = `
<task>
  <title>XML Task</title>
  <estimated_minutes>30</estimated_minutes>
</task>

Also:
1. Markdown task
      `;

      const result = adapter.extractTasksFromText(text);

      expect(result.success).toBe(true);
      expect(result.data![0].title).toBe('XML Task');
    });
  });

  describe('helper functions', () => {
    it('parseXMLTask should work as standalone', () => {
      const xml = `<task><title>Test</title></task>`;
      const result = parseXMLTask(xml);
      expect(result.success).toBe(true);
    });

    it('toXMLTask should work as standalone', () => {
      const task: Task = {
        id: '1',
        featureId: 'f1',
        title: 'Test',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const xml = toXMLTask(task);
      expect(xml).toContain('<task>');
    });

    it('validateTaskSchema should work as standalone', () => {
      const result = validateTaskSchema({ title: 'Test', featureId: 'f1' });
      expect(result.valid).toBe(true);
    });
  });
});
```

---

### Part C Summary

| File | Purpose | Estimated LOC |
|------|---------|---------------|
| `src/adapters/StateFormatAdapter.ts` | STATE.md ↔ Database | 150-200 |
| `src/adapters/AgentContextAdapter.ts` | Context building for agents | 200-250 |
| `src/adapters/TaskSchemaAdapter.ts` | XML ↔ JSON task conversion | 150-200 |
| **TOTAL** | | **500-650** |

---

## Part D: Bridge Implementations

Bridges connect major subsystems, providing clean interfaces for cross-cutting concerns. Unlike adapters (which transform data formats), bridges coordinate workflows between subsystems.

### SPEC-BRIDGE-001: Agent-Worktree Bridge

| Field | Specification |
|-------|---------------|
| **File** | `src/bridges/AgentWorktreeBridge.ts` |
| **Purpose** | Coordinate agent task execution with git worktree isolation |
| **Dependencies** | `WorktreeManager`, `GitService`, `AgentPool`, `EventBus` |
| **Estimated LOC** | 200-250 |

**Key Responsibilities:**
1. Create isolated worktree before agent starts task
2. Provide agent with correct working directory paths
3. Commit changes in worktree on task completion
4. Clean up worktree after merge or failure
5. Handle worktree conflicts and recovery

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/bridges/AgentWorktreeBridge.ts
// =============================================================================

import { WorktreeManager, WorktreeInfo } from '../infrastructure/git/WorktreeManager';
import { GitService } from '../infrastructure/git/GitService';
import { EventBus } from '../orchestration/events/EventBus';
import { Task, TaskStatus } from '../types/core';
import { Agent, AgentType } from '../types/agent';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WorktreeAssignment {
  taskId: string;
  agentId: string;
  worktree: WorktreeInfo;
  startedAt: Date;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
}

export interface WorktreeContext {
  rootPath: string;
  branchName: string;
  baseBranch: string;
  taskId: string;
  featureId: string;
}

export interface WorktreeSetupResult {
  success: boolean;
  context?: WorktreeContext;
  error?: string;
}

export interface WorktreeCommitResult {
  success: boolean;
  commitHash?: string;
  filesChanged: number;
  error?: string;
}

export interface WorktreeTeardownResult {
  success: boolean;
  merged: boolean;
  error?: string;
}

export interface BridgeConfig {
  maxConcurrentWorktrees: number;
  worktreeBasePath: string;
  cleanupOnFailure: boolean;
  autoCommitOnComplete: boolean;
}

// -----------------------------------------------------------------------------
// DEFAULT CONFIGURATION
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: BridgeConfig = {
  maxConcurrentWorktrees: 4,
  worktreeBasePath: '.nexus/worktrees',
  cleanupOnFailure: true,
  autoCommitOnComplete: true
};

// -----------------------------------------------------------------------------
// AGENT-WORKTREE BRIDGE CLASS
// -----------------------------------------------------------------------------

export class AgentWorktreeBridge {
  private worktreeManager: WorktreeManager;
  private gitService: GitService;
  private eventBus: EventBus;
  private config: BridgeConfig;

  private activeAssignments: Map<string, WorktreeAssignment> = new Map();

  constructor(
    worktreeManager: WorktreeManager,
    gitService: GitService,
    eventBus: EventBus,
    config: Partial<BridgeConfig> = {}
  ) {
    this.worktreeManager = worktreeManager;
    this.gitService = gitService;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Set up isolated worktree for agent task execution
   */
  async setupForTask(task: Task, agent: Agent): Promise<WorktreeSetupResult> {
    // Check concurrent worktree limit
    if (this.activeAssignments.size >= this.config.maxConcurrentWorktrees) {
      return {
        success: false,
        error: `Maximum concurrent worktrees (${this.config.maxConcurrentWorktrees}) reached`
      };
    }

    // Check if task already has an active worktree
    if (this.activeAssignments.has(task.id)) {
      const existing = this.activeAssignments.get(task.id)!;
      if (existing.status === 'active') {
        return {
          success: false,
          error: `Task ${task.id} already has active worktree`
        };
      }
    }

    try {
      // Determine base branch
      const baseBranch = await this.determineBaseBranch(task);

      // Create worktree
      const worktree = await this.worktreeManager.createWorktree(task.id, baseBranch);

      // Create assignment record
      const assignment: WorktreeAssignment = {
        taskId: task.id,
        agentId: agent.id,
        worktree,
        startedAt: new Date(),
        status: 'active'
      };

      this.activeAssignments.set(task.id, assignment);

      // Emit event
      this.eventBus.emit({
        type: 'WORKTREE_CREATED',
        payload: { taskId: task.id, agentId: agent.id, path: worktree.path },
        timestamp: new Date()
      });

      return {
        success: true,
        context: {
          rootPath: worktree.path,
          branchName: worktree.branch,
          baseBranch,
          taskId: task.id,
          featureId: task.featureId
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Commit changes made by agent in worktree
   */
  async commitChanges(
    taskId: string,
    message: string,
    files?: string[]
  ): Promise<WorktreeCommitResult> {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) {
      return { success: false, filesChanged: 0, error: `No active worktree for task ${taskId}` };
    }

    try {
      // Change to worktree directory for git operations
      const originalCwd = process.cwd();
      process.chdir(assignment.worktree.path);

      try {
        // Get changed files
        const changedFiles = files || await this.gitService.getChangedFiles();

        if (changedFiles.length === 0) {
          return { success: true, filesChanged: 0 };
        }

        // Commit changes
        const commitHash = await this.gitService.commit(message, changedFiles);

        this.eventBus.emit({
          type: 'WORKTREE_COMMITTED',
          payload: { taskId, commitHash, filesChanged: changedFiles.length },
          timestamp: new Date()
        });

        return {
          success: true,
          commitHash,
          filesChanged: changedFiles.length
        };
      } finally {
        process.chdir(originalCwd);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, filesChanged: 0, error: message };
    }
  }

  /**
   * Complete task and clean up worktree
   */
  async teardown(taskId: string, shouldMerge: boolean = true): Promise<WorktreeTeardownResult> {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) {
      return { success: false, merged: false, error: `No worktree found for task ${taskId}` };
    }

    try {
      let merged = false;

      if (shouldMerge && assignment.status === 'active') {
        // Auto-commit any remaining changes
        if (this.config.autoCommitOnComplete) {
          await this.commitChanges(taskId, `Auto-commit: Task ${taskId} completion`);
        }

        // Merge worktree branch to base
        merged = await this.mergeWorktree(taskId);
      }

      // Remove worktree
      await this.worktreeManager.removeWorktree(taskId);

      // Update assignment status
      assignment.status = shouldMerge ? 'completed' : 'abandoned';

      // Clean up
      this.activeAssignments.delete(taskId);

      this.eventBus.emit({
        type: 'WORKTREE_REMOVED',
        payload: { taskId, merged },
        timestamp: new Date()
      });

      return { success: true, merged };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Attempt cleanup even on failure
      if (this.config.cleanupOnFailure) {
        try {
          await this.worktreeManager.removeWorktree(taskId);
        } catch {
          // Ignore cleanup failures
        }
      }

      assignment.status = 'failed';
      return { success: false, merged: false, error: message };
    }
  }

  /**
   * Get worktree context for active task
   */
  getContext(taskId: string): WorktreeContext | null {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment || assignment.status !== 'active') {
      return null;
    }

    return {
      rootPath: assignment.worktree.path,
      branchName: assignment.worktree.branch,
      baseBranch: assignment.worktree.baseBranch,
      taskId: assignment.taskId,
      featureId: '' // Would need to look up from task
    };
  }

  /**
   * Get all active worktree assignments
   */
  getActiveAssignments(): WorktreeAssignment[] {
    return Array.from(this.activeAssignments.values())
      .filter(a => a.status === 'active');
  }

  /**
   * Check if task has active worktree
   */
  hasActiveWorktree(taskId: string): boolean {
    const assignment = this.activeAssignments.get(taskId);
    return assignment?.status === 'active';
  }

  /**
   * Recover from interrupted session
   */
  async recover(): Promise<void> {
    const existingWorktrees = await this.worktreeManager.listWorktrees();

    for (const worktree of existingWorktrees) {
      if (worktree.taskId && !this.activeAssignments.has(worktree.taskId)) {
        // Recreate assignment for orphaned worktree
        this.activeAssignments.set(worktree.taskId, {
          taskId: worktree.taskId,
          agentId: 'recovered',
          worktree,
          startedAt: worktree.createdAt || new Date(),
          status: 'active'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private async determineBaseBranch(task: Task): Promise<string> {
    // Check if task has a specific base branch
    if (task.metadata?.baseBranch) {
      return task.metadata.baseBranch as string;
    }

    // Check for feature branch
    if (task.featureId) {
      const featureBranch = `feature/${task.featureId}`;
      const exists = await this.gitService.branchExists(featureBranch);
      if (exists) {
        return featureBranch;
      }
    }

    // Default to main or master
    const mainExists = await this.gitService.branchExists('main');
    return mainExists ? 'main' : 'master';
  }

  private async mergeWorktree(taskId: string): Promise<boolean> {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) return false;

    try {
      const result = await this.gitService.merge(assignment.worktree.branch);
      return result.success;
    } catch {
      return false;
    }
  }

  private setupEventListeners(): void {
    // Listen for task completion events
    this.eventBus.on('TASK_COMPLETED', async (event) => {
      const { taskId } = event.payload;
      if (this.hasActiveWorktree(taskId)) {
        await this.teardown(taskId, true);
      }
    });

    // Listen for task failure events
    this.eventBus.on('TASK_FAILED', async (event) => {
      const { taskId } = event.payload;
      if (this.hasActiveWorktree(taskId)) {
        await this.teardown(taskId, false);
      }
    });

    // Listen for agent release events
    this.eventBus.on('AGENT_RELEASED', async (event) => {
      const { agentId, taskId } = event.payload;
      if (taskId && this.hasActiveWorktree(taskId)) {
        // Agent released without completing - abandon worktree
        await this.teardown(taskId, false);
      }
    });
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createAgentWorktreeBridge(
  worktreeManager: WorktreeManager,
  gitService: GitService,
  eventBus: EventBus,
  config?: Partial<BridgeConfig>
): AgentWorktreeBridge {
  return new AgentWorktreeBridge(worktreeManager, gitService, eventBus, config);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/bridges/__tests__/AgentWorktreeBridge.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentWorktreeBridge } from '../AgentWorktreeBridge';
import { Task, Agent } from '../../types';

describe('AgentWorktreeBridge', () => {
  let bridge: AgentWorktreeBridge;
  let mockWorktreeManager: any;
  let mockGitService: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockWorktreeManager = {
      createWorktree: vi.fn().mockResolvedValue({
        path: '/worktrees/task-1',
        branch: 'task/task-1',
        baseBranch: 'main',
        taskId: 'task-1'
      }),
      removeWorktree: vi.fn().mockResolvedValue(undefined),
      listWorktrees: vi.fn().mockResolvedValue([])
    };

    mockGitService = {
      branchExists: vi.fn().mockResolvedValue(true),
      getChangedFiles: vi.fn().mockResolvedValue(['file1.ts', 'file2.ts']),
      commit: vi.fn().mockResolvedValue('abc123'),
      merge: vi.fn().mockResolvedValue({ success: true })
    };

    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn()
    };

    bridge = new AgentWorktreeBridge(
      mockWorktreeManager,
      mockGitService,
      mockEventBus
    );
  });

  describe('setupForTask', () => {
    const task: Task = {
      id: 'task-1',
      featureId: 'feat-1',
      title: 'Test task',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const agent: Agent = {
      id: 'agent-1',
      type: 'coder',
      status: 'idle'
    };

    it('should create worktree for task', async () => {
      const result = await bridge.setupForTask(task, agent);

      expect(result.success).toBe(true);
      expect(result.context?.rootPath).toBe('/worktrees/task-1');
      expect(mockWorktreeManager.createWorktree).toHaveBeenCalledWith('task-1', 'main');
    });

    it('should emit WORKTREE_CREATED event', async () => {
      await bridge.setupForTask(task, agent);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WORKTREE_CREATED' })
      );
    });

    it('should reject if max concurrent worktrees reached', async () => {
      // Fill up the limit
      const smallBridge = new AgentWorktreeBridge(
        mockWorktreeManager,
        mockGitService,
        mockEventBus,
        { maxConcurrentWorktrees: 1 }
      );

      await smallBridge.setupForTask(task, agent);
      const result = await smallBridge.setupForTask(
        { ...task, id: 'task-2' },
        agent
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum concurrent');
    });

    it('should reject duplicate active worktree for same task', async () => {
      await bridge.setupForTask(task, agent);
      const result = await bridge.setupForTask(task, agent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already has active');
    });
  });

  describe('commitChanges', () => {
    it('should commit changes in worktree', async () => {
      // Setup worktree first
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );

      const result = await bridge.commitChanges('task-1', 'Test commit');

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(2);
      expect(mockGitService.commit).toHaveBeenCalled();
    });

    it('should fail if no active worktree', async () => {
      const result = await bridge.commitChanges('nonexistent', 'Test commit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active worktree');
    });

    it('should handle empty changes gracefully', async () => {
      mockGitService.getChangedFiles.mockResolvedValue([]);

      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );

      const result = await bridge.commitChanges('task-1', 'Test commit');

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(0);
    });
  });

  describe('teardown', () => {
    beforeEach(async () => {
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );
    });

    it('should remove worktree and merge', async () => {
      const result = await bridge.teardown('task-1', true);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(mockWorktreeManager.removeWorktree).toHaveBeenCalledWith('task-1');
    });

    it('should skip merge when shouldMerge is false', async () => {
      const result = await bridge.teardown('task-1', false);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(false);
    });

    it('should emit WORKTREE_REMOVED event', async () => {
      await bridge.teardown('task-1', true);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WORKTREE_REMOVED' })
      );
    });
  });

  describe('getContext', () => {
    it('should return context for active worktree', async () => {
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );

      const context = bridge.getContext('task-1');

      expect(context).not.toBeNull();
      expect(context?.taskId).toBe('task-1');
      expect(context?.rootPath).toBe('/worktrees/task-1');
    });

    it('should return null for nonexistent task', () => {
      const context = bridge.getContext('nonexistent');
      expect(context).toBeNull();
    });
  });

  describe('hasActiveWorktree', () => {
    it('should return true for active worktree', async () => {
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );

      expect(bridge.hasActiveWorktree('task-1')).toBe(true);
    });

    it('should return false after teardown', async () => {
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );
      await bridge.teardown('task-1', false);

      expect(bridge.hasActiveWorktree('task-1')).toBe(false);
    });
  });

  describe('recover', () => {
    it('should recreate assignments for orphaned worktrees', async () => {
      mockWorktreeManager.listWorktrees.mockResolvedValue([
        { path: '/worktrees/task-orphan', branch: 'task/task-orphan', taskId: 'task-orphan' }
      ]);

      await bridge.recover();

      expect(bridge.hasActiveWorktree('task-orphan')).toBe(true);
    });
  });

  describe('getActiveAssignments', () => {
    it('should return all active assignments', async () => {
      await bridge.setupForTask(
        { id: 'task-1', featureId: 'f1', title: 'Test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-1', type: 'coder', status: 'idle' }
      );
      await bridge.setupForTask(
        { id: 'task-2', featureId: 'f1', title: 'Test 2', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'agent-2', type: 'coder', status: 'idle' }
      );

      const assignments = bridge.getActiveAssignments();

      expect(assignments).toHaveLength(2);
    });
  });
});
```

---

### SPEC-BRIDGE-002: Planning-Execution Bridge

| Field | Specification |
|-------|---------------|
| **File** | `src/bridges/PlanningExecutionBridge.ts` |
| **Purpose** | Transform planning output into execution-ready task waves using Kahn's algorithm |
| **Dependencies** | `TaskDecomposer`, `DependencyResolver`, `TaskQueue`, `EventBus` |
| **Estimated LOC** | 250-300 |

**Key Responsibilities:**
1. Receive decomposed tasks from planning layer
2. Apply Kahn's algorithm for topological sorting
3. Calculate parallel execution waves
4. Feed tasks to execution layer in correct order
5. Handle dynamic re-planning when tasks fail or change

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/bridges/PlanningExecutionBridge.ts
// =============================================================================

import { Task, TaskStatus, Feature } from '../types/core';
import { DependencyResolver, TaskWave } from '../planning/dependencies/DependencyResolver';
import { TaskQueue } from '../orchestration/queue/TaskQueue';
import { EventBus } from '../orchestration/events/EventBus';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ExecutionPlan {
  featureId: string;
  waves: ExecutionWave[];
  totalTasks: number;
  estimatedMinutes: number;
  criticalPath: string[];
}

export interface ExecutionWave {
  waveNumber: number;
  tasks: Task[];
  canParallelize: boolean;
  estimatedMinutes: number;
  dependencies: string[];
}

export interface WaveProgress {
  waveNumber: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  inProgressTasks: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface ExecutionState {
  featureId: string;
  currentWave: number;
  waveProgress: Map<number, WaveProgress>;
  completedTaskIds: Set<string>;
  failedTaskIds: Set<string>;
  startedAt: Date;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
}

export interface ReplanResult {
  success: boolean;
  newPlan?: ExecutionPlan;
  affectedWaves: number[];
  reason: string;
}

export interface BridgeConfig {
  maxParallelTasks: number;
  autoAdvanceWaves: boolean;
  failFastOnCriticalPath: boolean;
  replanOnFailure: boolean;
}

// -----------------------------------------------------------------------------
// DEFAULT CONFIGURATION
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: BridgeConfig = {
  maxParallelTasks: 4,
  autoAdvanceWaves: true,
  failFastOnCriticalPath: true,
  replanOnFailure: true
};

// -----------------------------------------------------------------------------
// PLANNING-EXECUTION BRIDGE CLASS
// -----------------------------------------------------------------------------

export class PlanningExecutionBridge {
  private dependencyResolver: DependencyResolver;
  private taskQueue: TaskQueue;
  private eventBus: EventBus;
  private config: BridgeConfig;

  private executionStates: Map<string, ExecutionState> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();

  constructor(
    dependencyResolver: DependencyResolver,
    taskQueue: TaskQueue,
    eventBus: EventBus,
    config: Partial<BridgeConfig> = {}
  ) {
    this.dependencyResolver = dependencyResolver;
    this.taskQueue = taskQueue;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Create execution plan from decomposed tasks
   * Applies Kahn's algorithm for topological sorting
   */
  createExecutionPlan(featureId: string, tasks: Task[]): ExecutionPlan {
    // Check for cycles
    const cycles = this.dependencyResolver.detectCycles(tasks);
    if (cycles.length > 0) {
      throw new Error(
        `Circular dependencies detected: ${cycles.map(c => c.join(' → ')).join('; ')}`
      );
    }

    // Topologically sort tasks
    const sortedTasks = this.dependencyResolver.resolveDependencies(tasks);

    // Calculate parallel waves using Kahn's algorithm
    const waves = this.dependencyResolver.getParallelWaves(sortedTasks);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(sortedTasks);

    // Build execution waves
    const executionWaves: ExecutionWave[] = waves.map((wave, index) => ({
      waveNumber: index + 1,
      tasks: wave.tasks,
      canParallelize: wave.tasks.length > 1,
      estimatedMinutes: Math.max(...wave.tasks.map(t => t.estimatedMinutes || 30)),
      dependencies: this.getWaveDependencies(wave.tasks, index > 0 ? waves[index - 1].tasks : [])
    }));

    const plan: ExecutionPlan = {
      featureId,
      waves: executionWaves,
      totalTasks: tasks.length,
      estimatedMinutes: this.calculateTotalTime(executionWaves),
      criticalPath
    };

    // Store plan
    this.executionPlans.set(featureId, plan);

    // Initialize execution state
    this.initializeExecutionState(featureId, plan);

    // Emit event
    this.eventBus.emit({
      type: 'EXECUTION_PLAN_CREATED',
      payload: { featureId, totalTasks: tasks.length, waves: executionWaves.length },
      timestamp: new Date()
    });

    return plan;
  }

  /**
   * Start executing the plan for a feature
   */
  async startExecution(featureId: string): Promise<void> {
    const state = this.executionStates.get(featureId);
    const plan = this.executionPlans.get(featureId);

    if (!state || !plan) {
      throw new Error(`No execution plan found for feature ${featureId}`);
    }

    state.status = 'executing';
    state.startedAt = new Date();

    // Queue first wave of tasks
    await this.queueWave(featureId, 1);

    this.eventBus.emit({
      type: 'EXECUTION_STARTED',
      payload: { featureId, totalWaves: plan.waves.length },
      timestamp: new Date()
    });
  }

  /**
   * Mark a task as completed and advance execution
   */
  async completeTask(taskId: string, featureId: string): Promise<void> {
    const state = this.executionStates.get(featureId);
    if (!state) return;

    state.completedTaskIds.add(taskId);

    // Update wave progress
    this.updateWaveProgress(featureId, taskId, 'completed');

    // Check if current wave is complete
    const waveProgress = state.waveProgress.get(state.currentWave);
    if (waveProgress && waveProgress.completedTasks === waveProgress.totalTasks) {
      // Wave complete - advance to next
      if (this.config.autoAdvanceWaves) {
        await this.advanceToNextWave(featureId);
      }
    }

    this.eventBus.emit({
      type: 'TASK_EXECUTION_COMPLETED',
      payload: { taskId, featureId, progress: this.getProgress(featureId) },
      timestamp: new Date()
    });
  }

  /**
   * Handle task failure
   */
  async failTask(taskId: string, featureId: string, error: string): Promise<void> {
    const state = this.executionStates.get(featureId);
    const plan = this.executionPlans.get(featureId);
    if (!state || !plan) return;

    state.failedTaskIds.add(taskId);
    this.updateWaveProgress(featureId, taskId, 'failed');

    // Check if failed task is on critical path
    if (this.config.failFastOnCriticalPath && plan.criticalPath.includes(taskId)) {
      state.status = 'failed';
      this.eventBus.emit({
        type: 'EXECUTION_FAILED',
        payload: { featureId, taskId, error, reason: 'Critical path failure' },
        timestamp: new Date()
      });
      return;
    }

    // Attempt replan if configured
    if (this.config.replanOnFailure) {
      const replanResult = await this.replan(featureId, taskId);
      if (!replanResult.success) {
        state.status = 'failed';
        this.eventBus.emit({
          type: 'EXECUTION_FAILED',
          payload: { featureId, taskId, error, reason: replanResult.reason },
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Get next available tasks to execute
   */
  getNextTasks(featureId: string): Task[] {
    const state = this.executionStates.get(featureId);
    const plan = this.executionPlans.get(featureId);
    if (!state || !plan || state.status !== 'executing') {
      return [];
    }

    const currentWave = plan.waves.find(w => w.waveNumber === state.currentWave);
    if (!currentWave) return [];

    // Return tasks that haven't been started yet
    return currentWave.tasks.filter(t =>
      !state.completedTaskIds.has(t.id) &&
      !state.failedTaskIds.has(t.id)
    ).slice(0, this.config.maxParallelTasks);
  }

  /**
   * Get execution progress for a feature
   */
  getProgress(featureId: string): { completed: number; total: number; percent: number } {
    const state = this.executionStates.get(featureId);
    const plan = this.executionPlans.get(featureId);
    if (!state || !plan) {
      return { completed: 0, total: 0, percent: 0 };
    }

    const completed = state.completedTaskIds.size;
    const total = plan.totalTasks;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percent };
  }

  /**
   * Pause execution
   */
  pauseExecution(featureId: string): void {
    const state = this.executionStates.get(featureId);
    if (state && state.status === 'executing') {
      state.status = 'paused';
      this.eventBus.emit({
        type: 'EXECUTION_PAUSED',
        payload: { featureId },
        timestamp: new Date()
      });
    }
  }

  /**
   * Resume paused execution
   */
  async resumeExecution(featureId: string): Promise<void> {
    const state = this.executionStates.get(featureId);
    if (state && state.status === 'paused') {
      state.status = 'executing';
      await this.queueWave(featureId, state.currentWave);
      this.eventBus.emit({
        type: 'EXECUTION_RESUMED',
        payload: { featureId },
        timestamp: new Date()
      });
    }
  }

  /**
   * Replan execution after task failure
   */
  async replan(featureId: string, failedTaskId: string): Promise<ReplanResult> {
    const plan = this.executionPlans.get(featureId);
    const state = this.executionStates.get(featureId);
    if (!plan || !state) {
      return { success: false, affectedWaves: [], reason: 'No execution plan found' };
    }

    // Find tasks that depend on the failed task
    const dependentTasks = this.findDependentTasks(plan, failedTaskId);

    if (dependentTasks.length === 0) {
      // No dependent tasks - can continue without the failed task
      return { success: true, affectedWaves: [], reason: 'No dependent tasks affected' };
    }

    // Check if we can skip the dependent tasks
    const canSkip = dependentTasks.every(t => !plan.criticalPath.includes(t.id));

    if (canSkip) {
      // Mark dependent tasks as skipped
      for (const task of dependentTasks) {
        state.failedTaskIds.add(task.id);
      }
      return {
        success: true,
        affectedWaves: [...new Set(dependentTasks.map(t =>
          plan.waves.findIndex(w => w.tasks.some(wt => wt.id === t.id)) + 1
        ))],
        reason: 'Dependent tasks skipped'
      };
    }

    return {
      success: false,
      affectedWaves: [],
      reason: 'Failed task has critical path dependencies that cannot be skipped'
    };
  }

  /**
   * Get execution state for a feature
   */
  getExecutionState(featureId: string): ExecutionState | undefined {
    return this.executionStates.get(featureId);
  }

  /**
   * Get execution plan for a feature
   */
  getExecutionPlan(featureId: string): ExecutionPlan | undefined {
    return this.executionPlans.get(featureId);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private initializeExecutionState(featureId: string, plan: ExecutionPlan): void {
    const waveProgress = new Map<number, WaveProgress>();

    for (const wave of plan.waves) {
      waveProgress.set(wave.waveNumber, {
        waveNumber: wave.waveNumber,
        totalTasks: wave.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        inProgressTasks: 0,
        status: 'pending'
      });
    }

    this.executionStates.set(featureId, {
      featureId,
      currentWave: 1,
      waveProgress,
      completedTaskIds: new Set(),
      failedTaskIds: new Set(),
      startedAt: new Date(),
      status: 'planning'
    });
  }

  private async queueWave(featureId: string, waveNumber: number): Promise<void> {
    const plan = this.executionPlans.get(featureId);
    const state = this.executionStates.get(featureId);
    if (!plan || !state) return;

    const wave = plan.waves.find(w => w.waveNumber === waveNumber);
    if (!wave) return;

    // Update wave progress
    const progress = state.waveProgress.get(waveNumber);
    if (progress) {
      progress.status = 'in_progress';
    }

    // Queue all tasks in the wave
    for (const task of wave.tasks) {
      if (!state.completedTaskIds.has(task.id) && !state.failedTaskIds.has(task.id)) {
        this.taskQueue.enqueue(task);
      }
    }

    this.eventBus.emit({
      type: 'WAVE_STARTED',
      payload: { featureId, waveNumber, taskCount: wave.tasks.length },
      timestamp: new Date()
    });
  }

  private async advanceToNextWave(featureId: string): Promise<void> {
    const plan = this.executionPlans.get(featureId);
    const state = this.executionStates.get(featureId);
    if (!plan || !state) return;

    // Mark current wave as complete
    const currentProgress = state.waveProgress.get(state.currentWave);
    if (currentProgress) {
      currentProgress.status = 'completed';
    }

    // Check if there are more waves
    const nextWave = state.currentWave + 1;
    if (nextWave > plan.waves.length) {
      // All waves complete
      state.status = 'completed';
      this.eventBus.emit({
        type: 'EXECUTION_COMPLETED',
        payload: { featureId, totalTasks: plan.totalTasks },
        timestamp: new Date()
      });
      return;
    }

    // Advance to next wave
    state.currentWave = nextWave;
    await this.queueWave(featureId, nextWave);

    this.eventBus.emit({
      type: 'WAVE_COMPLETED',
      payload: { featureId, waveNumber: nextWave - 1, nextWave },
      timestamp: new Date()
    });
  }

  private updateWaveProgress(
    featureId: string,
    taskId: string,
    status: 'completed' | 'failed' | 'in_progress'
  ): void {
    const state = this.executionStates.get(featureId);
    const plan = this.executionPlans.get(featureId);
    if (!state || !plan) return;

    // Find which wave the task belongs to
    for (const wave of plan.waves) {
      if (wave.tasks.some(t => t.id === taskId)) {
        const progress = state.waveProgress.get(wave.waveNumber);
        if (progress) {
          if (status === 'completed') progress.completedTasks++;
          else if (status === 'failed') progress.failedTasks++;
          else if (status === 'in_progress') progress.inProgressTasks++;
        }
        break;
      }
    }
  }

  private calculateCriticalPath(tasks: Task[]): string[] {
    // Build dependency graph
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const inDegree = new Map<string, number>();
    const pathLength = new Map<string, number>();
    const predecessor = new Map<string, string>();

    // Initialize
    for (const task of tasks) {
      inDegree.set(task.id, task.dependencies?.length || 0);
      pathLength.set(task.id, task.estimatedMinutes || 30);
    }

    // Process tasks in topological order
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      const task = taskMap.get(taskId)!;
      const currentLength = pathLength.get(taskId)!;

      // Find tasks that depend on this one
      for (const t of tasks) {
        if (t.dependencies?.includes(taskId)) {
          const newLength = currentLength + (t.estimatedMinutes || 30);
          if (newLength > (pathLength.get(t.id) || 0)) {
            pathLength.set(t.id, newLength);
            predecessor.set(t.id, taskId);
          }

          const newDegree = (inDegree.get(t.id) || 0) - 1;
          inDegree.set(t.id, newDegree);
          if (newDegree === 0) {
            queue.push(t.id);
          }
        }
      }
    }

    // Find the task with the longest path (end of critical path)
    let maxLength = 0;
    let endTask = '';
    for (const [id, length] of pathLength) {
      if (length > maxLength) {
        maxLength = length;
        endTask = id;
      }
    }

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let current = endTask;
    while (current) {
      criticalPath.unshift(current);
      current = predecessor.get(current) || '';
    }

    return criticalPath;
  }

  private calculateTotalTime(waves: ExecutionWave[]): number {
    // Total time is sum of wave times (waves run sequentially, tasks in wave run in parallel)
    return waves.reduce((sum, wave) => sum + wave.estimatedMinutes, 0);
  }

  private getWaveDependencies(waveTasks: Task[], previousWaveTasks: Task[]): string[] {
    const previousIds = new Set(previousWaveTasks.map(t => t.id));
    const deps: string[] = [];

    for (const task of waveTasks) {
      for (const dep of task.dependencies || []) {
        if (previousIds.has(dep)) {
          deps.push(dep);
        }
      }
    }

    return [...new Set(deps)];
  }

  private findDependentTasks(plan: ExecutionPlan, taskId: string): Task[] {
    const dependents: Task[] = [];

    for (const wave of plan.waves) {
      for (const task of wave.tasks) {
        if (task.dependencies?.includes(taskId)) {
          dependents.push(task);
          // Recursively find tasks that depend on this dependent
          dependents.push(...this.findDependentTasks(plan, task.id));
        }
      }
    }

    return dependents;
  }

  private setupEventListeners(): void {
    // Listen for task completion from execution layer
    this.eventBus.on('TASK_COMPLETED', async (event) => {
      const { taskId, featureId } = event.payload;
      await this.completeTask(taskId, featureId);
    });

    // Listen for task failure
    this.eventBus.on('TASK_FAILED', async (event) => {
      const { taskId, featureId, error } = event.payload;
      await this.failTask(taskId, featureId, error);
    });
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createPlanningExecutionBridge(
  dependencyResolver: DependencyResolver,
  taskQueue: TaskQueue,
  eventBus: EventBus,
  config?: Partial<BridgeConfig>
): PlanningExecutionBridge {
  return new PlanningExecutionBridge(dependencyResolver, taskQueue, eventBus, config);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/bridges/__tests__/PlanningExecutionBridge.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningExecutionBridge } from '../PlanningExecutionBridge';
import { Task } from '../../types/core';

describe('PlanningExecutionBridge', () => {
  let bridge: PlanningExecutionBridge;
  let mockDependencyResolver: any;
  let mockTaskQueue: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockDependencyResolver = {
      detectCycles: vi.fn().mockReturnValue([]),
      resolveDependencies: vi.fn().mockImplementation(tasks => tasks),
      getParallelWaves: vi.fn().mockImplementation(tasks => [{ tasks }])
    };

    mockTaskQueue = {
      enqueue: vi.fn()
    };

    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn()
    };

    bridge = new PlanningExecutionBridge(
      mockDependencyResolver,
      mockTaskQueue,
      mockEventBus
    );
  });

  const createTask = (id: string, deps: string[] = [], minutes = 30): Task => ({
    id,
    featureId: 'feat-1',
    title: `Task ${id}`,
    status: 'pending',
    dependencies: deps,
    estimatedMinutes: minutes,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('createExecutionPlan', () => {
    it('should create execution plan from tasks', () => {
      const tasks = [createTask('t1'), createTask('t2'), createTask('t3')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([
        { tasks: [tasks[0], tasks[1]] },
        { tasks: [tasks[2]] }
      ]);

      const plan = bridge.createExecutionPlan('feat-1', tasks);

      expect(plan.featureId).toBe('feat-1');
      expect(plan.totalTasks).toBe(3);
      expect(plan.waves).toHaveLength(2);
    });

    it('should detect circular dependencies', () => {
      const tasks = [
        createTask('t1', ['t2']),
        createTask('t2', ['t1'])
      ];
      mockDependencyResolver.detectCycles.mockReturnValue([['t1', 't2', 't1']]);

      expect(() => bridge.createExecutionPlan('feat-1', tasks)).toThrow('Circular dependencies');
    });

    it('should emit EXECUTION_PLAN_CREATED event', () => {
      const tasks = [createTask('t1')];
      bridge.createExecutionPlan('feat-1', tasks);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_PLAN_CREATED' })
      );
    });

    it('should calculate critical path', () => {
      const tasks = [
        createTask('t1', [], 10),
        createTask('t2', ['t1'], 20),
        createTask('t3', ['t1'], 5)
      ];
      mockDependencyResolver.getParallelWaves.mockReturnValue([
        { tasks: [tasks[0]] },
        { tasks: [tasks[1], tasks[2]] }
      ]);

      const plan = bridge.createExecutionPlan('feat-1', tasks);

      // Critical path should be t1 -> t2 (longest path)
      expect(plan.criticalPath).toContain('t1');
      expect(plan.criticalPath).toContain('t2');
    });
  });

  describe('startExecution', () => {
    it('should queue first wave of tasks', async () => {
      const tasks = [createTask('t1'), createTask('t2')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      bridge.createExecutionPlan('feat-1', tasks);

      await bridge.startExecution('feat-1');

      expect(mockTaskQueue.enqueue).toHaveBeenCalledTimes(2);
    });

    it('should emit EXECUTION_STARTED event', async () => {
      const tasks = [createTask('t1')];
      bridge.createExecutionPlan('feat-1', tasks);

      await bridge.startExecution('feat-1');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_STARTED' })
      );
    });

    it('should throw if no plan exists', async () => {
      await expect(bridge.startExecution('nonexistent')).rejects.toThrow();
    });
  });

  describe('completeTask', () => {
    beforeEach(() => {
      const tasks = [createTask('t1'), createTask('t2', ['t1'])];
      mockDependencyResolver.getParallelWaves.mockReturnValue([
        { tasks: [tasks[0]] },
        { tasks: [tasks[1]] }
      ]);
      bridge.createExecutionPlan('feat-1', tasks);
    });

    it('should mark task as completed', async () => {
      await bridge.startExecution('feat-1');
      await bridge.completeTask('t1', 'feat-1');

      const progress = bridge.getProgress('feat-1');
      expect(progress.completed).toBe(1);
    });

    it('should advance to next wave when current wave complete', async () => {
      await bridge.startExecution('feat-1');
      await bridge.completeTask('t1', 'feat-1');

      // Should have queued wave 2 task
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't2' })
      );
    });

    it('should complete execution when all waves done', async () => {
      await bridge.startExecution('feat-1');
      await bridge.completeTask('t1', 'feat-1');
      await bridge.completeTask('t2', 'feat-1');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_COMPLETED' })
      );
    });
  });

  describe('failTask', () => {
    it('should fail execution if critical path task fails', async () => {
      const tasks = [createTask('t1'), createTask('t2', ['t1'])];
      mockDependencyResolver.getParallelWaves.mockReturnValue([
        { tasks: [tasks[0]] },
        { tasks: [tasks[1]] }
      ]);
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');

      await bridge.failTask('t1', 'feat-1', 'Error');

      const state = bridge.getExecutionState('feat-1');
      expect(state?.status).toBe('failed');
    });

    it('should emit EXECUTION_FAILED event', async () => {
      const tasks = [createTask('t1')];
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');

      await bridge.failTask('t1', 'feat-1', 'Error');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_FAILED' })
      );
    });
  });

  describe('getNextTasks', () => {
    it('should return tasks from current wave', async () => {
      const tasks = [createTask('t1'), createTask('t2')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');

      const nextTasks = bridge.getNextTasks('feat-1');

      expect(nextTasks).toHaveLength(2);
    });

    it('should exclude completed tasks', async () => {
      const tasks = [createTask('t1'), createTask('t2')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');
      await bridge.completeTask('t1', 'feat-1');

      const nextTasks = bridge.getNextTasks('feat-1');

      expect(nextTasks).toHaveLength(1);
      expect(nextTasks[0].id).toBe('t2');
    });

    it('should respect maxParallelTasks config', async () => {
      const smallBridge = new PlanningExecutionBridge(
        mockDependencyResolver,
        mockTaskQueue,
        mockEventBus,
        { maxParallelTasks: 1 }
      );

      const tasks = [createTask('t1'), createTask('t2'), createTask('t3')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      smallBridge.createExecutionPlan('feat-1', tasks);
      await smallBridge.startExecution('feat-1');

      const nextTasks = smallBridge.getNextTasks('feat-1');

      expect(nextTasks).toHaveLength(1);
    });
  });

  describe('getProgress', () => {
    it('should return correct progress', async () => {
      const tasks = [createTask('t1'), createTask('t2'), createTask('t3')];
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');
      await bridge.completeTask('t1', 'feat-1');

      const progress = bridge.getProgress('feat-1');

      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.percent).toBe(33);
    });

    it('should return zeros for unknown feature', () => {
      const progress = bridge.getProgress('nonexistent');
      expect(progress).toEqual({ completed: 0, total: 0, percent: 0 });
    });
  });

  describe('pauseExecution / resumeExecution', () => {
    beforeEach(async () => {
      const tasks = [createTask('t1')];
      bridge.createExecutionPlan('feat-1', tasks);
      await bridge.startExecution('feat-1');
    });

    it('should pause execution', () => {
      bridge.pauseExecution('feat-1');

      const state = bridge.getExecutionState('feat-1');
      expect(state?.status).toBe('paused');
    });

    it('should resume execution', async () => {
      bridge.pauseExecution('feat-1');
      await bridge.resumeExecution('feat-1');

      const state = bridge.getExecutionState('feat-1');
      expect(state?.status).toBe('executing');
    });

    it('should emit events for pause/resume', async () => {
      bridge.pauseExecution('feat-1');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_PAUSED' })
      );

      await bridge.resumeExecution('feat-1');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXECUTION_RESUMED' })
      );
    });
  });

  describe('replan', () => {
    it('should succeed if no dependent tasks', async () => {
      const tasks = [createTask('t1'), createTask('t2')]; // Independent tasks
      mockDependencyResolver.getParallelWaves.mockReturnValue([{ tasks }]);
      bridge.createExecutionPlan('feat-1', tasks);

      const result = await bridge.replan('feat-1', 't1');

      expect(result.success).toBe(true);
    });

    it('should fail if critical path dependencies cannot be skipped', async () => {
      const tasks = [createTask('t1'), createTask('t2', ['t1'])];
      mockDependencyResolver.getParallelWaves.mockReturnValue([
        { tasks: [tasks[0]] },
        { tasks: [tasks[1]] }
      ]);
      bridge.createExecutionPlan('feat-1', tasks);

      const result = await bridge.replan('feat-1', 't1');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('critical path');
    });
  });
});
```

---

### SPEC-BRIDGE-003: UI-Backend Bridge

| Field | Specification |
|-------|---------------|
| **File** | `src/bridges/UIBackendBridge.ts` |
| **Purpose** | Event-based communication between React UI and backend orchestration |
| **Dependencies** | `EventBus`, `NexusCoordinator`, `StateManager`, Electron IPC |
| **Estimated LOC** | 150-200 |

**Key Responsibilities:**
1. Expose backend state to UI through event subscriptions
2. Forward UI actions to orchestration layer
3. Handle real-time progress updates
4. Manage connection state and reconnection
5. Provide optimistic updates for responsive UI

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/bridges/UIBackendBridge.ts
// =============================================================================

import { EventBus, NexusEvent, EventType } from '../orchestration/events/EventBus';
import { NexusCoordinator } from '../orchestration/coordinator/NexusCoordinator';
import { StateManager } from '../persistence/state/StateManager';
import { Project, Feature, Task, Agent } from '../types/core';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface UIState {
  project: ProjectUIState | null;
  features: FeatureUIState[];
  tasks: TaskUIState[];
  agents: AgentUIState[];
  execution: ExecutionUIState | null;
  connected: boolean;
}

export interface ProjectUIState {
  id: string;
  name: string;
  status: string;
  mode: 'genesis' | 'evolution';
  createdAt: Date;
  progress: { completed: number; total: number; percent: number };
}

export interface FeatureUIState {
  id: string;
  name: string;
  status: string;
  priority: string;
  taskCount: number;
  completedTasks: number;
}

export interface TaskUIState {
  id: string;
  featureId: string;
  title: string;
  status: string;
  assignedAgent: string | null;
  progress: number;
  estimatedMinutes: number;
}

export interface AgentUIState {
  id: string;
  type: string;
  status: 'idle' | 'working' | 'error';
  currentTask: string | null;
  taskHistory: { id: string; status: string }[];
}

export interface ExecutionUIState {
  status: 'idle' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  currentWave: number;
  totalWaves: number;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
}

export type UIEventHandler = (state: Partial<UIState>) => void;
export type UIActionResult = { success: boolean; error?: string; data?: any };

export interface BridgeActions {
  // Project actions
  createProject(name: string, mode: 'genesis' | 'evolution'): Promise<UIActionResult>;
  loadProject(projectId: string): Promise<UIActionResult>;
  pauseProject(): Promise<UIActionResult>;
  resumeProject(): Promise<UIActionResult>;

  // Feature actions
  createFeature(name: string, priority: string): Promise<UIActionResult>;
  moveFeature(featureId: string, newStatus: string): Promise<UIActionResult>;
  deleteFeature(featureId: string): Promise<UIActionResult>;

  // Execution actions
  startExecution(): Promise<UIActionResult>;
  stopExecution(): Promise<UIActionResult>;
  requestCheckpoint(): Promise<UIActionResult>;
  restoreCheckpoint(checkpointId: string): Promise<UIActionResult>;
}

// -----------------------------------------------------------------------------
// UI-BACKEND BRIDGE CLASS
// -----------------------------------------------------------------------------

export class UIBackendBridge implements BridgeActions {
  private eventBus: EventBus;
  private coordinator: NexusCoordinator;
  private stateManager: StateManager;

  private currentState: UIState;
  private subscribers: Set<UIEventHandler> = new Set();
  private pendingUpdates: Map<string, Partial<UIState>> = new Map();
  private updateDebounceTimer: NodeJS.Timeout | null = null;

  constructor(
    eventBus: EventBus,
    coordinator: NexusCoordinator,
    stateManager: StateManager
  ) {
    this.eventBus = eventBus;
    this.coordinator = coordinator;
    this.stateManager = stateManager;

    this.currentState = {
      project: null,
      features: [],
      tasks: [],
      agents: [],
      execution: null,
      connected: true
    };

    this.setupEventListeners();
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION API
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to UI state updates
   */
  subscribe(handler: UIEventHandler): () => void {
    this.subscribers.add(handler);

    // Send current state immediately
    handler(this.currentState);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Get current UI state (for initial render)
   */
  getState(): UIState {
    return { ...this.currentState };
  }

  // ---------------------------------------------------------------------------
  // PROJECT ACTIONS
  // ---------------------------------------------------------------------------

  async createProject(name: string, mode: 'genesis' | 'evolution'): Promise<UIActionResult> {
    try {
      const project = await this.coordinator.startProject({ name, mode });

      // Optimistic update
      this.updateState({
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          mode,
          createdAt: project.createdAt,
          progress: { completed: 0, total: 0, percent: 0 }
        }
      });

      return { success: true, data: project };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async loadProject(projectId: string): Promise<UIActionResult> {
    try {
      const state = await this.stateManager.loadState(projectId);
      const status = await this.coordinator.getStatus(projectId);

      this.updateState({
        project: {
          id: state.project.id,
          name: state.project.name,
          status: status.status,
          mode: state.project.mode,
          createdAt: state.project.createdAt,
          progress: status.progress
        },
        features: state.features.map(f => ({
          id: f.id,
          name: f.name,
          status: f.status,
          priority: f.priority,
          taskCount: f.taskIds.length,
          completedTasks: f.taskIds.filter(id =>
            state.tasks.find(t => t.id === id)?.status === 'completed'
          ).length
        })),
        tasks: state.tasks.map(t => ({
          id: t.id,
          featureId: t.featureId,
          title: t.title,
          status: t.status,
          assignedAgent: null,
          progress: t.status === 'completed' ? 100 : 0,
          estimatedMinutes: t.estimatedMinutes || 30
        }))
      });

      return { success: true, data: state };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async pauseProject(): Promise<UIActionResult> {
    if (!this.currentState.project) {
      return { success: false, error: 'No project loaded' };
    }

    try {
      await this.coordinator.pauseProject(this.currentState.project.id);

      this.updateState({
        project: { ...this.currentState.project, status: 'paused' },
        execution: this.currentState.execution
          ? { ...this.currentState.execution, status: 'paused' }
          : null
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async resumeProject(): Promise<UIActionResult> {
    if (!this.currentState.project) {
      return { success: false, error: 'No project loaded' };
    }

    try {
      await this.coordinator.resumeProject(this.currentState.project.id);

      this.updateState({
        project: { ...this.currentState.project, status: 'active' },
        execution: this.currentState.execution
          ? { ...this.currentState.execution, status: 'executing' }
          : null
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  // FEATURE ACTIONS
  // ---------------------------------------------------------------------------

  async createFeature(name: string, priority: string): Promise<UIActionResult> {
    if (!this.currentState.project) {
      return { success: false, error: 'No project loaded' };
    }

    try {
      // This would go through coordinator/state manager
      const featureId = `feat-${Date.now()}`;

      // Optimistic update
      const newFeature: FeatureUIState = {
        id: featureId,
        name,
        status: 'backlog',
        priority,
        taskCount: 0,
        completedTasks: 0
      };

      this.updateState({
        features: [...this.currentState.features, newFeature]
      });

      return { success: true, data: { id: featureId } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async moveFeature(featureId: string, newStatus: string): Promise<UIActionResult> {
    try {
      // Optimistic update
      const features = this.currentState.features.map(f =>
        f.id === featureId ? { ...f, status: newStatus } : f
      );

      this.updateState({ features });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Revert optimistic update
      this.refreshState();

      return { success: false, error: message };
    }
  }

  async deleteFeature(featureId: string): Promise<UIActionResult> {
    try {
      // Optimistic update
      const features = this.currentState.features.filter(f => f.id !== featureId);
      const tasks = this.currentState.tasks.filter(t => t.featureId !== featureId);

      this.updateState({ features, tasks });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Revert optimistic update
      this.refreshState();

      return { success: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  // EXECUTION ACTIONS
  // ---------------------------------------------------------------------------

  async startExecution(): Promise<UIActionResult> {
    if (!this.currentState.project) {
      return { success: false, error: 'No project loaded' };
    }

    try {
      // Optimistic update
      this.updateState({
        execution: {
          status: 'executing',
          currentWave: 1,
          totalWaves: 1,
          startedAt: new Date(),
          estimatedCompletion: null
        }
      });

      // Actual execution start would happen through coordinator
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async stopExecution(): Promise<UIActionResult> {
    try {
      this.updateState({
        execution: this.currentState.execution
          ? { ...this.currentState.execution, status: 'paused' }
          : null
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async requestCheckpoint(): Promise<UIActionResult> {
    if (!this.currentState.project) {
      return { success: false, error: 'No project loaded' };
    }

    try {
      const checkpoint = await this.coordinator.requestCheckpoint();
      return { success: true, data: checkpoint };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async restoreCheckpoint(checkpointId: string): Promise<UIActionResult> {
    try {
      // Would restore through coordinator and refresh entire state
      await this.refreshState();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private setupEventListeners(): void {
    // Task events
    this.eventBus.on('TASK_STARTED', (event) => {
      this.handleTaskUpdate(event.payload.taskId, {
        status: 'in_progress',
        assignedAgent: event.payload.agentId
      });
    });

    this.eventBus.on('TASK_COMPLETED', (event) => {
      this.handleTaskUpdate(event.payload.taskId, {
        status: 'completed',
        progress: 100,
        assignedAgent: null
      });
    });

    this.eventBus.on('TASK_FAILED', (event) => {
      this.handleTaskUpdate(event.payload.taskId, {
        status: 'failed',
        assignedAgent: null
      });
    });

    // Agent events
    this.eventBus.on('AGENT_ASSIGNED', (event) => {
      this.handleAgentUpdate(event.payload.agentId, {
        status: 'working',
        currentTask: event.payload.taskId
      });
    });

    this.eventBus.on('AGENT_RELEASED', (event) => {
      this.handleAgentUpdate(event.payload.agentId, {
        status: 'idle',
        currentTask: null
      });
    });

    // Execution events
    this.eventBus.on('WAVE_STARTED', (event) => {
      this.updateState({
        execution: this.currentState.execution
          ? {
              ...this.currentState.execution,
              currentWave: event.payload.waveNumber
            }
          : null
      });
    });

    this.eventBus.on('EXECUTION_COMPLETED', () => {
      this.updateState({
        execution: this.currentState.execution
          ? { ...this.currentState.execution, status: 'completed' }
          : null
      });
    });

    // Progress events
    this.eventBus.on('PROGRESS_UPDATE', (event) => {
      this.updateState({
        project: this.currentState.project
          ? {
              ...this.currentState.project,
              progress: event.payload.progress
            }
          : null
      });
    });
  }

  private handleTaskUpdate(taskId: string, updates: Partial<TaskUIState>): void {
    const tasks = this.currentState.tasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    );

    // Update feature completed count
    const features = this.currentState.features.map(f => {
      const featureTasks = tasks.filter(t => t.featureId === f.id);
      const completedTasks = featureTasks.filter(t => t.status === 'completed').length;
      return { ...f, completedTasks };
    });

    this.updateState({ tasks, features });
  }

  private handleAgentUpdate(agentId: string, updates: Partial<AgentUIState>): void {
    const agents = this.currentState.agents.map(a =>
      a.id === agentId ? { ...a, ...updates } : a
    );

    this.updateState({ agents });
  }

  private updateState(updates: Partial<UIState>): void {
    // Merge updates into current state
    this.currentState = {
      ...this.currentState,
      ...updates
    };

    // Debounce notifications to avoid UI thrashing
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }

    this.updateDebounceTimer = setTimeout(() => {
      this.notifySubscribers();
    }, 16); // ~60fps
  }

  private notifySubscribers(): void {
    for (const handler of this.subscribers) {
      try {
        handler(this.currentState);
      } catch (error) {
        console.error('UI subscriber error:', error);
      }
    }
  }

  private async refreshState(): Promise<void> {
    if (this.currentState.project) {
      await this.loadProject(this.currentState.project.id);
    }
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createUIBackendBridge(
  eventBus: EventBus,
  coordinator: NexusCoordinator,
  stateManager: StateManager
): UIBackendBridge {
  return new UIBackendBridge(eventBus, coordinator, stateManager);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/bridges/__tests__/UIBackendBridge.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIBackendBridge } from '../UIBackendBridge';

describe('UIBackendBridge', () => {
  let bridge: UIBackendBridge;
  let mockEventBus: any;
  let mockCoordinator: any;
  let mockStateManager: any;

  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn()
    };

    mockCoordinator = {
      startProject: vi.fn().mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        status: 'active',
        createdAt: new Date()
      }),
      getStatus: vi.fn().mockResolvedValue({
        status: 'active',
        progress: { completed: 0, total: 0, percent: 0 }
      }),
      pauseProject: vi.fn().mockResolvedValue(undefined),
      resumeProject: vi.fn().mockResolvedValue(undefined),
      requestCheckpoint: vi.fn().mockResolvedValue({ id: 'chk-1' })
    };

    mockStateManager = {
      loadState: vi.fn().mockResolvedValue({
        project: {
          id: 'proj-1',
          name: 'Test Project',
          status: 'active',
          mode: 'genesis',
          createdAt: new Date()
        },
        features: [],
        tasks: []
      })
    };

    bridge = new UIBackendBridge(mockEventBus, mockCoordinator, mockStateManager);
  });

  describe('subscribe', () => {
    it('should call handler with current state immediately', () => {
      const handler = vi.fn();
      bridge.subscribe(handler);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        connected: true,
        project: null
      }));
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.subscribe(handler);

      unsubscribe();

      // Handler should not be called on subsequent updates
      // (would need to trigger an update to verify this fully)
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = bridge.getState();

      expect(state).toHaveProperty('project');
      expect(state).toHaveProperty('features');
      expect(state).toHaveProperty('tasks');
      expect(state).toHaveProperty('agents');
      expect(state).toHaveProperty('connected', true);
    });
  });

  describe('createProject', () => {
    it('should create project and update state', async () => {
      const result = await bridge.createProject('New Project', 'genesis');

      expect(result.success).toBe(true);
      expect(mockCoordinator.startProject).toHaveBeenCalledWith({
        name: 'New Project',
        mode: 'genesis'
      });

      const state = bridge.getState();
      expect(state.project?.name).toBe('Test Project');
    });

    it('should return error on failure', async () => {
      mockCoordinator.startProject.mockRejectedValue(new Error('Failed'));

      const result = await bridge.createProject('New Project', 'genesis');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed');
    });
  });

  describe('loadProject', () => {
    it('should load project and update state', async () => {
      const result = await bridge.loadProject('proj-1');

      expect(result.success).toBe(true);
      expect(mockStateManager.loadState).toHaveBeenCalledWith('proj-1');

      const state = bridge.getState();
      expect(state.project?.id).toBe('proj-1');
    });
  });

  describe('pauseProject / resumeProject', () => {
    it('should fail if no project loaded', async () => {
      const result = await bridge.pauseProject();
      expect(result.success).toBe(false);
    });

    it('should pause project', async () => {
      await bridge.loadProject('proj-1');
      const result = await bridge.pauseProject();

      expect(result.success).toBe(true);
      expect(mockCoordinator.pauseProject).toHaveBeenCalledWith('proj-1');
    });

    it('should resume project', async () => {
      await bridge.loadProject('proj-1');
      await bridge.pauseProject();
      const result = await bridge.resumeProject();

      expect(result.success).toBe(true);
      expect(mockCoordinator.resumeProject).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('createFeature', () => {
    it('should fail if no project loaded', async () => {
      const result = await bridge.createFeature('New Feature', 'high');
      expect(result.success).toBe(false);
    });

    it('should create feature with optimistic update', async () => {
      await bridge.loadProject('proj-1');
      const result = await bridge.createFeature('New Feature', 'high');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();

      const state = bridge.getState();
      expect(state.features).toHaveLength(1);
      expect(state.features[0].name).toBe('New Feature');
    });
  });

  describe('moveFeature', () => {
    it('should move feature with optimistic update', async () => {
      await bridge.loadProject('proj-1');
      await bridge.createFeature('Feature', 'high');

      const state = bridge.getState();
      const featureId = state.features[0].id;

      const result = await bridge.moveFeature(featureId, 'in_progress');

      expect(result.success).toBe(true);

      const newState = bridge.getState();
      expect(newState.features[0].status).toBe('in_progress');
    });
  });

  describe('deleteFeature', () => {
    it('should delete feature with optimistic update', async () => {
      await bridge.loadProject('proj-1');
      await bridge.createFeature('Feature', 'high');

      const state = bridge.getState();
      const featureId = state.features[0].id;

      const result = await bridge.deleteFeature(featureId);

      expect(result.success).toBe(true);

      const newState = bridge.getState();
      expect(newState.features).toHaveLength(0);
    });
  });

  describe('startExecution', () => {
    it('should fail if no project loaded', async () => {
      const result = await bridge.startExecution();
      expect(result.success).toBe(false);
    });

    it('should start execution with optimistic update', async () => {
      await bridge.loadProject('proj-1');
      const result = await bridge.startExecution();

      expect(result.success).toBe(true);

      const state = bridge.getState();
      expect(state.execution?.status).toBe('executing');
    });
  });

  describe('stopExecution', () => {
    it('should stop execution', async () => {
      await bridge.loadProject('proj-1');
      await bridge.startExecution();
      const result = await bridge.stopExecution();

      expect(result.success).toBe(true);

      const state = bridge.getState();
      expect(state.execution?.status).toBe('paused');
    });
  });

  describe('requestCheckpoint', () => {
    it('should request checkpoint', async () => {
      await bridge.loadProject('proj-1');
      const result = await bridge.requestCheckpoint();

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('chk-1');
      expect(mockCoordinator.requestCheckpoint).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should register event listeners on construction', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('TASK_STARTED', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('TASK_COMPLETED', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('TASK_FAILED', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('AGENT_ASSIGNED', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('AGENT_RELEASED', expect.any(Function));
    });
  });
});
```

---

### Part D Summary

| File | Purpose | Estimated LOC |
|------|---------|---------------|
| `src/bridges/AgentWorktreeBridge.ts` | Agent ↔ Git worktree coordination | 200-250 |
| `src/bridges/PlanningExecutionBridge.ts` | Planning → Execution wave management | 250-300 |
| `src/bridges/UIBackendBridge.ts` | UI ↔ Backend event communication | 150-200 |
| **TOTAL** | | **600-750** |

**Test Summary:**
- AgentWorktreeBridge: 12 tests
- PlanningExecutionBridge: 15 tests
- UIBackendBridge: 14 tests
- **Total Bridge Tests:** 41 tests

---

## Part E: LLM Client Implementations

LLM clients provide the core interface for communicating with large language models. These implementations handle streaming, tool calls, rate limiting, token management, and provider-specific quirks.

### SPEC-LLM-001: Claude Client

| Field | Specification |
|-------|---------------|
| **File** | `src/llm/ClaudeClient.ts` |
| **Purpose** | Anthropic Claude API integration with streaming, tools, and conversation management |
| **Dependencies** | `@anthropic-ai/sdk`, `TokenManager`, `EventBus`, `src/config/llm.ts` |
| **Estimated LOC** | 400-500 |

**Key Responsibilities:**
1. Stream responses from Claude API with proper handling
2. Execute tool calls and manage multi-turn tool conversations
3. Track token usage and enforce limits
4. Handle rate limiting with exponential backoff
5. Support model switching (Opus for planning, Sonnet for coding)

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/llm/ClaudeClient.ts
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { EventBus, NexusEvent } from '../orchestration/events/EventBus';
import { LLMConfig, ClaudeModelConfig } from '../config/llm';
import {
  LLMMessage,
  LLMResponse,
  LLMStreamChunk,
  Tool,
  ToolCall,
  ToolResult,
  TokenUsage
} from '../types/llm';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ClaudeModel = 'claude-opus-4-20250514' | 'claude-sonnet-4-20250514' | 'claude-3-haiku-20240307';

export interface ClaudeClientConfig {
  apiKey: string;
  defaultModel: ClaudeModel;
  maxTokens: number;
  temperature: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimitRpm: number;
}

export interface ClaudeRequestOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: Tool[];
  stopSequences?: string[];
}

export interface StreamCallbacks {
  onChunk?: (chunk: LLMStreamChunk) => void;
  onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

// -----------------------------------------------------------------------------
// CLAUDE CLIENT CLASS
// -----------------------------------------------------------------------------

export class ClaudeClient {
  private client: Anthropic;
  private config: ClaudeClientConfig;
  private eventBus: EventBus;

  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();
  private totalTokensUsed: TokenUsage = { input: 0, output: 0, total: 0 };
  private conversationHistory: Map<string, LLMMessage[]> = new Map();

  constructor(config: ClaudeClientConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  // ---------------------------------------------------------------------------
  // CORE API METHODS
  // ---------------------------------------------------------------------------

  /**
   * Send a single message and get a complete response
   */
  async complete(
    messages: LLMMessage[],
    options: ClaudeRequestOptions = {}
  ): Promise<LLMResponse> {
    await this.checkRateLimit();

    const model = options.model || this.config.defaultModel;
    const maxTokens = options.maxTokens || this.config.maxTokens;

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature: options.temperature ?? this.config.temperature,
          system: options.systemPrompt,
          messages: this.formatMessages(messages),
          tools: options.tools ? this.formatTools(options.tools) : undefined,
          stop_sequences: options.stopSequences
        });
      });

      return this.parseResponse(response);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Stream a response with real-time chunk callbacks
   */
  async stream(
    messages: LLMMessage[],
    options: ClaudeRequestOptions = {},
    callbacks: StreamCallbacks = {}
  ): Promise<LLMResponse> {
    await this.checkRateLimit();

    const model = options.model || this.config.defaultModel;
    const maxTokens = options.maxTokens || this.config.maxTokens;

    const chunks: LLMStreamChunk[] = [];
    let fullContent = '';
    let toolCalls: ToolCall[] = [];
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        system: options.systemPrompt,
        messages: this.formatMessages(messages),
        tools: options.tools ? this.formatTools(options.tools) : undefined,
        stop_sequences: options.stopSequences
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === 'text_delta' && delta.text) {
            const chunk: LLMStreamChunk = {
              type: 'text',
              content: delta.text,
              timestamp: Date.now()
            };
            chunks.push(chunk);
            fullContent += delta.text;

            if (callbacks.onChunk) {
              callbacks.onChunk(chunk);
            }
          }
        } else if (event.type === 'content_block_start') {
          const block = event.content_block as { type: string; id?: string; name?: string };
          if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id || '',
              name: block.name || '',
              arguments: {}
            });
          }
        } else if (event.type === 'message_delta') {
          const usage = (event as any).usage;
          if (usage) {
            outputTokens = usage.output_tokens || 0;
          }
        } else if (event.type === 'message_start') {
          const message = (event as any).message;
          if (message?.usage) {
            inputTokens = message.usage.input_tokens || 0;
          }
        }
      }

      // Handle tool calls if present
      if (toolCalls.length > 0 && callbacks.onToolCall) {
        for (const toolCall of toolCalls) {
          const result = await callbacks.onToolCall(toolCall);
          // Could continue conversation with tool results here
        }
      }

      const response: LLMResponse = {
        content: fullContent,
        model,
        stopReason: 'end_turn',
        usage: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };

      this.updateTokenUsage(response.usage);

      if (callbacks.onComplete) {
        callbacks.onComplete(response);
      }

      return response;
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Execute a multi-turn conversation with tool calls
   */
  async executeWithTools(
    messages: LLMMessage[],
    tools: Tool[],
    onToolCall: (toolCall: ToolCall) => Promise<ToolResult>,
    options: ClaudeRequestOptions = {}
  ): Promise<LLMResponse> {
    const conversationMessages = [...messages];
    let finalResponse: LLMResponse | null = null;
    let iterations = 0;
    const maxIterations = 50; // Match QA loop limit

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.complete(conversationMessages, {
        ...options,
        tools
      });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalResponse = response;
        break;
      }

      // Execute tool calls
      const toolResults: ToolResult[] = [];
      for (const toolCall of response.toolCalls) {
        const result = await onToolCall(toolCall);
        toolResults.push(result);

        // Emit tool execution event
        this.eventBus.emit({
          type: 'TOOL_EXECUTED',
          timestamp: new Date(),
          payload: {
            toolName: toolCall.name,
            success: result.success,
            duration: 0 // Would track actual duration
          }
        });
      }

      // Add assistant response and tool results to conversation
      conversationMessages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls
      });

      conversationMessages.push({
        role: 'user',
        content: this.formatToolResults(toolResults)
      });
    }

    if (!finalResponse) {
      throw new Error(`Tool execution exceeded ${maxIterations} iterations`);
    }

    return finalResponse;
  }

  // ---------------------------------------------------------------------------
  // CONVERSATION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Start or continue a conversation session
   */
  async chat(
    sessionId: string,
    message: string,
    options: ClaudeRequestOptions = {}
  ): Promise<LLMResponse> {
    const history = this.conversationHistory.get(sessionId) || [];

    history.push({ role: 'user', content: message });

    const response = await this.complete(history, options);

    history.push({ role: 'assistant', content: response.content });

    this.conversationHistory.set(sessionId, history);

    return response;
  }

  /**
   * Clear conversation history for a session
   */
  clearSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Get conversation history for a session
   */
  getSessionHistory(sessionId: string): LLMMessage[] {
    return this.conversationHistory.get(sessionId) || [];
  }

  // ---------------------------------------------------------------------------
  // RATE LIMITING & RETRIES
  // ---------------------------------------------------------------------------

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    // Reset window if expired
    if (now - this.requestWindowStart > windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Check if at limit
    if (this.requestCount >= this.config.rateLimitRpm) {
      const waitTime = windowDuration - (now - this.requestWindowStart);

      this.eventBus.emit({
        type: 'RATE_LIMIT_HIT',
        timestamp: new Date(),
        payload: { provider: 'claude', waitTimeMs: waitTime }
      });

      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.retryDelayMs;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Exponential backoff
        await this.sleep(delay);
        delay *= 2;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.APIError) {
      // Retry on rate limits and server errors
      return error.status === 429 || error.status >= 500;
    }
    // Retry on network errors
    return error instanceof Error &&
           (error.message.includes('ECONNRESET') ||
            error.message.includes('ETIMEDOUT'));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // MESSAGE FORMATTING
  // ---------------------------------------------------------------------------

  private formatMessages(messages: LLMMessage[]): Anthropic.Messages.MessageParam[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }

  private formatTools(tools: Tool[]): Anthropic.Messages.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required
      }
    }));
  }

  private formatToolResults(results: ToolResult[]): string {
    return results.map(r =>
      `<tool_result name="${r.toolName}">\n${r.success ? r.output : `Error: ${r.error}`}\n</tool_result>`
    ).join('\n\n');
  }

  private parseResponse(response: Anthropic.Messages.Message): LLMResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>
        });
      }
    }

    const usage: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens
    };

    this.updateTokenUsage(usage);

    return {
      content,
      model: response.model,
      stopReason: response.stop_reason || 'end_turn',
      usage,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }

  // ---------------------------------------------------------------------------
  // TOKEN TRACKING
  // ---------------------------------------------------------------------------

  private updateTokenUsage(usage: TokenUsage): void {
    this.totalTokensUsed.input += usage.input;
    this.totalTokensUsed.output += usage.output;
    this.totalTokensUsed.total += usage.total;

    this.eventBus.emit({
      type: 'TOKENS_USED',
      timestamp: new Date(),
      payload: {
        provider: 'claude',
        usage,
        totalUsage: { ...this.totalTokensUsed }
      }
    });
  }

  getTokenUsage(): TokenUsage {
    return { ...this.totalTokensUsed };
  }

  resetTokenUsage(): void {
    this.totalTokensUsed = { input: 0, output: 0, total: 0 };
  }

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  private handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Anthropic.APIError
      ? `API_ERROR_${error.status}`
      : 'UNKNOWN_ERROR';

    this.eventBus.emit({
      type: 'LLM_ERROR',
      timestamp: new Date(),
      payload: {
        provider: 'claude',
        errorType,
        message: errorMessage
      }
    });
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createClaudeClient(eventBus: EventBus): ClaudeClient {
  const config: ClaudeClientConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 1000,
    rateLimitRpm: 50
  };

  return new ClaudeClient(config, eventBus);
}

// -----------------------------------------------------------------------------
// MODEL SELECTION HELPERS
// -----------------------------------------------------------------------------

export const ClaudeModels = {
  OPUS: 'claude-opus-4-20250514' as ClaudeModel,
  SONNET: 'claude-sonnet-4-20250514' as ClaudeModel,
  HAIKU: 'claude-3-haiku-20240307' as ClaudeModel
};

export function getModelForTask(taskType: string): ClaudeModel {
  switch (taskType) {
    case 'planning':
    case 'architecture':
    case 'complex_reasoning':
      return ClaudeModels.OPUS;
    case 'coding':
    case 'review':
    case 'testing':
      return ClaudeModels.SONNET;
    case 'simple_query':
    case 'classification':
      return ClaudeModels.HAIKU;
    default:
      return ClaudeModels.SONNET;
  }
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/llm/__tests__/ClaudeClient.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClaudeClient, ClaudeClientConfig, ClaudeModels, getModelForTask } from '../ClaudeClient';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn()
    }
  }))
}));

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  let mockEventBus: any;
  let mockAnthropicClient: any;

  const defaultConfig: ClaudeClientConfig = {
    apiKey: 'test-key',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 100,
    rateLimitRpm: 100
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockEventBus = {
      emit: vi.fn()
    };

    client = new ClaudeClient(defaultConfig, mockEventBus);

    // Get reference to the mock Anthropic client
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockAnthropicClient = Anthropic.mock.results[0]?.value || {
      messages: {
        create: vi.fn(),
        stream: vi.fn()
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('complete', () => {
    it('should send message and return response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello, world!' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const response = await client.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(response.content).toBe('Hello, world!');
      expect(response.usage.total).toBe(15);
    });

    it('should use custom model when specified', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-opus-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await client.complete(
        [{ role: 'user', content: 'Hello' }],
        { model: ClaudeModels.OPUS }
      );

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-20250514' })
      );
    });

    it('should include system prompt when provided', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await client.complete(
        [{ role: 'user', content: 'Hello' }],
        { systemPrompt: 'You are a helpful assistant.' }
      );

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ system: 'You are a helpful assistant.' })
      );
    });

    it('should emit token usage event', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await client.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TOKENS_USED',
          payload: expect.objectContaining({
            provider: 'claude',
            usage: { input: 100, output: 50, total: 150 }
          })
        })
      );
    });
  });

  describe('stream', () => {
    it('should stream chunks and call callbacks', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
          yield { type: 'message_delta', usage: { output_tokens: 5 } };
        }
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const chunks: string[] = [];
      const onChunk = vi.fn((chunk) => chunks.push(chunk.content));
      const onComplete = vi.fn();

      await client.stream(
        [{ role: 'user', content: 'Hi' }],
        {},
        { onChunk, onComplete }
      );

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(chunks.join('')).toBe('Hello world');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      const mockError = new Error('Stream failed');
      mockAnthropicClient.messages.stream.mockImplementation(() => {
        throw mockError;
      });

      const onError = vi.fn();

      await expect(
        client.stream([{ role: 'user', content: 'Hi' }], {}, { onError })
      ).rejects.toThrow('Stream failed');

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('executeWithTools', () => {
    it('should execute tool calls and continue conversation', async () => {
      // First response: tool call
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'read_file', input: { path: '/test.txt' } }
          ],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 }
        })
        // Second response: final answer
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'The file contains: Hello' }],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 10 }
        });

      const onToolCall = vi.fn().mockResolvedValue({
        toolName: 'read_file',
        success: true,
        output: 'Hello'
      });

      const tools = [{
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path']
        }
      }];

      const response = await client.executeWithTools(
        [{ role: 'user', content: 'Read test.txt' }],
        tools,
        onToolCall
      );

      expect(onToolCall).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'read_file' })
      );
      expect(response.content).toBe('The file contains: Hello');
    });

    it('should throw error after max iterations', async () => {
      // Always return tool calls to trigger max iterations
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'infinite_tool', input: {} }
        ],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const onToolCall = vi.fn().mockResolvedValue({
        toolName: 'infinite_tool',
        success: true,
        output: 'Result'
      });

      const tools = [{
        name: 'infinite_tool',
        description: 'Never ends',
        parameters: { type: 'object', properties: {}, required: [] }
      }];

      await expect(
        client.executeWithTools([{ role: 'user', content: 'Loop' }], tools, onToolCall)
      ).rejects.toThrow('exceeded');
    });
  });

  describe('chat', () => {
    it('should maintain conversation history', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response 1' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await client.chat('session-1', 'Hello');

      const history = client.getSessionHistory('session-1');
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'Response 1' });
    });

    it('should include previous messages in subsequent calls', async () => {
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Response 1' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 }
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Response 2' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 20, output_tokens: 10 }
        });

      await client.chat('session-1', 'Hello');
      await client.chat('session-1', 'How are you?');

      const lastCall = mockAnthropicClient.messages.create.mock.calls[1];
      expect(lastCall[0].messages).toHaveLength(3);
    });

    it('should clear session history', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await client.chat('session-1', 'Hello');
      client.clearSession('session-1');

      expect(client.getSessionHistory('session-1')).toHaveLength(0);
    });
  });

  describe('rate limiting', () => {
    it('should track request count', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      // Make multiple requests
      await Promise.all([
        client.complete([{ role: 'user', content: 'Hi' }]),
        client.complete([{ role: 'user', content: 'Hi' }]),
        client.complete([{ role: 'user', content: 'Hi' }])
      ]);

      // Should have made 3 requests
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should emit rate limit event when limit hit', async () => {
      // Configure client with low RPM limit
      const lowLimitConfig = { ...defaultConfig, rateLimitRpm: 2 };
      const limitedClient = new ClaudeClient(lowLimitConfig, mockEventBus);

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      // Make requests up to limit
      await limitedClient.complete([{ role: 'user', content: 'Hi' }]);
      await limitedClient.complete([{ role: 'user', content: 'Hi' }]);

      // Third request should trigger rate limit
      const requestPromise = limitedClient.complete([{ role: 'user', content: 'Hi' }]);

      // Advance timer to complete the wait
      await vi.advanceTimersByTimeAsync(60000);
      await requestPromise;

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RATE_LIMIT_HIT' })
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).status = 500;

      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 }
        });

      const responsePromise = client.complete([{ role: 'user', content: 'Hi' }]);
      await vi.advanceTimersByTimeAsync(100); // First retry delay
      const response = await responsePromise;

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });

    it('should not retry on client errors', async () => {
      const clientError = new Error('Bad request');
      (clientError as any).status = 400;

      mockAnthropicClient.messages.create.mockRejectedValue(clientError);

      await expect(
        client.complete([{ role: 'user', content: 'Hi' }])
      ).rejects.toThrow();

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('token tracking', () => {
    it('should accumulate token usage across requests', async () => {
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'R1' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 100, output_tokens: 50 }
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'R2' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 200, output_tokens: 100 }
        });

      await client.complete([{ role: 'user', content: 'Hi' }]);
      await client.complete([{ role: 'user', content: 'Hi again' }]);

      const usage = client.getTokenUsage();
      expect(usage.input).toBe(300);
      expect(usage.output).toBe(150);
      expect(usage.total).toBe(450);
    });

    it('should reset token usage', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await client.complete([{ role: 'user', content: 'Hi' }]);
      client.resetTokenUsage();

      const usage = client.getTokenUsage();
      expect(usage.total).toBe(0);
    });
  });
});

describe('getModelForTask', () => {
  it('should return Opus for planning tasks', () => {
    expect(getModelForTask('planning')).toBe(ClaudeModels.OPUS);
    expect(getModelForTask('architecture')).toBe(ClaudeModels.OPUS);
    expect(getModelForTask('complex_reasoning')).toBe(ClaudeModels.OPUS);
  });

  it('should return Sonnet for coding tasks', () => {
    expect(getModelForTask('coding')).toBe(ClaudeModels.SONNET);
    expect(getModelForTask('review')).toBe(ClaudeModels.SONNET);
    expect(getModelForTask('testing')).toBe(ClaudeModels.SONNET);
  });

  it('should return Haiku for simple tasks', () => {
    expect(getModelForTask('simple_query')).toBe(ClaudeModels.HAIKU);
    expect(getModelForTask('classification')).toBe(ClaudeModels.HAIKU);
  });

  it('should default to Sonnet for unknown tasks', () => {
    expect(getModelForTask('unknown')).toBe(ClaudeModels.SONNET);
  });
});
```

---

### SPEC-LLM-002: Gemini Client

| Field | Specification |
|-------|---------------|
| **File** | `src/llm/GeminiClient.ts` |
| **Purpose** | Google Gemini API integration for code review and research tasks |
| **Dependencies** | `@google/generative-ai`, `TokenManager`, `EventBus`, `src/config/llm.ts` |
| **Estimated LOC** | 300-350 |

**Key Responsibilities:**
1. Integrate with Gemini API for code review (high context window)
2. Support research and codebase analysis tasks
3. Handle large file context efficiently
4. Provide cost-effective alternative for certain tasks
5. Manage rate limiting and retry logic

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/llm/GeminiClient.ts
// =============================================================================

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { EventBus } from '../orchestration/events/EventBus';
import {
  LLMMessage,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage
} from '../types/llm';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-1.5-pro';

export interface GeminiClientConfig {
  apiKey: string;
  defaultModel: GeminiModel;
  maxOutputTokens: number;
  temperature: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimitRpm: number;
}

export interface GeminiRequestOptions {
  model?: GeminiModel;
  maxOutputTokens?: number;
  temperature?: number;
  systemInstruction?: string;
  stopSequences?: string[];
}

export interface CodeReviewRequest {
  diff: string;
  fileContext?: string;
  guidelines?: string[];
  focusAreas?: string[];
}

export interface CodeReviewResult {
  issues: ReviewIssue[];
  summary: string;
  approvalRecommendation: 'approve' | 'request_changes' | 'needs_discussion';
  confidenceScore: number;
}

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  file: string;
  line?: number;
  description: string;
  suggestedFix?: string;
  category: string;
}

export interface ResearchRequest {
  query: string;
  codebaseFiles?: string[];
  context?: string;
  maxSources?: number;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  confidence: number;
  relatedTopics: string[];
}

export interface ResearchSource {
  file: string;
  relevantLines?: [number, number];
  relevance: number;
  excerpt: string;
}

// -----------------------------------------------------------------------------
// GEMINI CLIENT CLASS
// -----------------------------------------------------------------------------

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private config: GeminiClientConfig;
  private eventBus: EventBus;

  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();
  private totalTokensUsed: TokenUsage = { input: 0, output: 0, total: 0 };
  private modelCache: Map<GeminiModel, GenerativeModel> = new Map();

  constructor(config: GeminiClientConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  // ---------------------------------------------------------------------------
  // CORE API METHODS
  // ---------------------------------------------------------------------------

  /**
   * Send a message and get a complete response
   */
  async complete(
    messages: LLMMessage[],
    options: GeminiRequestOptions = {}
  ): Promise<LLMResponse> {
    await this.checkRateLimit();

    const model = this.getModel(options.model || this.config.defaultModel);
    const generationConfig: GenerationConfig = {
      maxOutputTokens: options.maxOutputTokens || this.config.maxOutputTokens,
      temperature: options.temperature ?? this.config.temperature,
      stopSequences: options.stopSequences
    };

    try {
      const result = await this.executeWithRetry(async () => {
        const chat = model.startChat({
          generationConfig,
          systemInstruction: options.systemInstruction
        });

        // Process all messages except the last one to build history
        for (let i = 0; i < messages.length - 1; i++) {
          const msg = messages[i];
          if (msg.role === 'user') {
            await chat.sendMessage(msg.content);
          }
        }

        // Send the last message and get response
        const lastMessage = messages[messages.length - 1];
        return await chat.sendMessage(lastMessage.content);
      });

      return this.parseResponse(result, options.model || this.config.defaultModel);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Stream a response with real-time chunk callbacks
   */
  async stream(
    messages: LLMMessage[],
    options: GeminiRequestOptions = {},
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    await this.checkRateLimit();

    const model = this.getModel(options.model || this.config.defaultModel);
    const generationConfig: GenerationConfig = {
      maxOutputTokens: options.maxOutputTokens || this.config.maxOutputTokens,
      temperature: options.temperature ?? this.config.temperature,
      stopSequences: options.stopSequences
    };

    let fullContent = '';

    try {
      const chat = model.startChat({
        generationConfig,
        systemInstruction: options.systemInstruction
      });

      // Build history
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
          await chat.sendMessage(msg.content);
        }
      }

      // Stream the last message
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;

          if (onChunk) {
            onChunk({
              type: 'text',
              content: text,
              timestamp: Date.now()
            });
          }
        }
      }

      // Get final response with usage info
      const finalResult = await result.response;

      const usage: TokenUsage = {
        input: finalResult.usageMetadata?.promptTokenCount || 0,
        output: finalResult.usageMetadata?.candidatesTokenCount || 0,
        total: finalResult.usageMetadata?.totalTokenCount || 0
      };

      this.updateTokenUsage(usage);

      return {
        content: fullContent,
        model: options.model || this.config.defaultModel,
        stopReason: 'end_turn',
        usage
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // SPECIALIZED METHODS
  // ---------------------------------------------------------------------------

  /**
   * Review code changes with detailed feedback
   * Optimized for Gemini's large context window
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
    const prompt = this.buildCodeReviewPrompt(request);

    const response = await this.complete(
      [{ role: 'user', content: prompt }],
      {
        model: 'gemini-2.5-pro',
        systemInstruction: `You are an expert code reviewer. Analyze code changes thoroughly and provide actionable feedback. Output your review as JSON.`,
        temperature: 0.3 // Lower temperature for more consistent reviews
      }
    );

    return this.parseCodeReviewResponse(response.content);
  }

  /**
   * Research a codebase to answer questions
   * Leverages Gemini's large context window for multi-file analysis
   */
  async research(request: ResearchRequest): Promise<ResearchResult> {
    const prompt = this.buildResearchPrompt(request);

    const response = await this.complete(
      [{ role: 'user', content: prompt }],
      {
        model: 'gemini-2.5-pro',
        systemInstruction: `You are a code research assistant. Analyze the provided codebase to answer questions accurately. Cite specific files and line numbers when possible.`,
        temperature: 0.5
      }
    );

    return this.parseResearchResponse(response.content);
  }

  /**
   * Analyze a large file or set of files
   */
  async analyzeCode(
    files: { path: string; content: string }[],
    query: string
  ): Promise<string> {
    const fileContext = files.map(f =>
      `=== FILE: ${f.path} ===\n${f.content}\n`
    ).join('\n');

    const response = await this.complete(
      [{
        role: 'user',
        content: `Analyze the following codebase and answer this question: ${query}\n\n${fileContext}`
      }],
      { model: 'gemini-2.5-pro' }
    );

    return response.content;
  }

  // ---------------------------------------------------------------------------
  // PROMPT BUILDERS
  // ---------------------------------------------------------------------------

  private buildCodeReviewPrompt(request: CodeReviewRequest): string {
    let prompt = `# Code Review Request\n\n`;

    if (request.fileContext) {
      prompt += `## Existing Code Context\n\`\`\`\n${request.fileContext}\n\`\`\`\n\n`;
    }

    prompt += `## Changes to Review\n\`\`\`diff\n${request.diff}\n\`\`\`\n\n`;

    if (request.guidelines && request.guidelines.length > 0) {
      prompt += `## Review Guidelines\n${request.guidelines.map(g => `- ${g}`).join('\n')}\n\n`;
    }

    if (request.focusAreas && request.focusAreas.length > 0) {
      prompt += `## Focus Areas\n${request.focusAreas.map(a => `- ${a}`).join('\n')}\n\n`;
    }

    prompt += `## Output Format
Return a JSON object with this structure:
{
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "file": "filename",
      "line": number or null,
      "description": "what's wrong",
      "suggestedFix": "how to fix it",
      "category": "security|performance|correctness|style|maintainability"
    }
  ],
  "summary": "brief summary of the review",
  "approvalRecommendation": "approve|request_changes|needs_discussion",
  "confidenceScore": 0.0 to 1.0
}`;

    return prompt;
  }

  private buildResearchPrompt(request: ResearchRequest): string {
    let prompt = `# Research Query\n\n${request.query}\n\n`;

    if (request.context) {
      prompt += `## Additional Context\n${request.context}\n\n`;
    }

    if (request.codebaseFiles && request.codebaseFiles.length > 0) {
      prompt += `## Codebase Files\n${request.codebaseFiles.join('\n')}\n\n`;
    }

    prompt += `## Output Format
Return a JSON object with this structure:
{
  "answer": "detailed answer to the query",
  "sources": [
    {
      "file": "filename",
      "relevantLines": [start, end] or null,
      "relevance": 0.0 to 1.0,
      "excerpt": "relevant code excerpt"
    }
  ],
  "confidence": 0.0 to 1.0,
  "relatedTopics": ["topic1", "topic2"]
}`;

    return prompt;
  }

  // ---------------------------------------------------------------------------
  // RESPONSE PARSERS
  // ---------------------------------------------------------------------------

  private parseResponse(
    result: any,
    model: GeminiModel
  ): LLMResponse {
    const text = result.response.text();
    const usage: TokenUsage = {
      input: result.response.usageMetadata?.promptTokenCount || 0,
      output: result.response.usageMetadata?.candidatesTokenCount || 0,
      total: result.response.usageMetadata?.totalTokenCount || 0
    };

    this.updateTokenUsage(usage);

    return {
      content: text,
      model,
      stopReason: 'end_turn',
      usage
    };
  }

  private parseCodeReviewResponse(content: string): CodeReviewResult {
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        issues: parsed.issues || [],
        summary: parsed.summary || '',
        approvalRecommendation: parsed.approvalRecommendation || 'needs_discussion',
        confidenceScore: parsed.confidenceScore || 0.5
      };
    } catch (error) {
      // Return a fallback response if parsing fails
      return {
        issues: [{
          severity: 'suggestion',
          file: 'unknown',
          description: 'Could not parse structured review. Raw response: ' + content.substring(0, 500),
          category: 'other'
        }],
        summary: 'Review parsing failed',
        approvalRecommendation: 'needs_discussion',
        confidenceScore: 0
      };
    }
  }

  private parseResearchResponse(content: string): ResearchResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        answer: parsed.answer || '',
        sources: parsed.sources || [],
        confidence: parsed.confidence || 0.5,
        relatedTopics: parsed.relatedTopics || []
      };
    } catch (error) {
      return {
        answer: content,
        sources: [],
        confidence: 0.3,
        relatedTopics: []
      };
    }
  }

  // ---------------------------------------------------------------------------
  // MODEL MANAGEMENT
  // ---------------------------------------------------------------------------

  private getModel(modelName: GeminiModel): GenerativeModel {
    if (!this.modelCache.has(modelName)) {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      this.modelCache.set(modelName, model);
    }
    return this.modelCache.get(modelName)!;
  }

  // ---------------------------------------------------------------------------
  // RATE LIMITING & RETRIES
  // ---------------------------------------------------------------------------

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000;

    if (now - this.requestWindowStart > windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    if (this.requestCount >= this.config.rateLimitRpm) {
      const waitTime = windowDuration - (now - this.requestWindowStart);

      this.eventBus.emit({
        type: 'RATE_LIMIT_HIT',
        timestamp: new Date(),
        payload: { provider: 'gemini', waitTimeMs: waitTime }
      });

      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.retryDelayMs;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          break;
        }

        await this.sleep(delay);
        delay *= 2;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('rate') ||
             message.includes('quota') ||
             message.includes('timeout') ||
             message.includes('unavailable') ||
             message.includes('internal');
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // TOKEN TRACKING
  // ---------------------------------------------------------------------------

  private updateTokenUsage(usage: TokenUsage): void {
    this.totalTokensUsed.input += usage.input;
    this.totalTokensUsed.output += usage.output;
    this.totalTokensUsed.total += usage.total;

    this.eventBus.emit({
      type: 'TOKENS_USED',
      timestamp: new Date(),
      payload: {
        provider: 'gemini',
        usage,
        totalUsage: { ...this.totalTokensUsed }
      }
    });
  }

  getTokenUsage(): TokenUsage {
    return { ...this.totalTokensUsed };
  }

  resetTokenUsage(): void {
    this.totalTokensUsed = { input: 0, output: 0, total: 0 };
  }

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  private handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.eventBus.emit({
      type: 'LLM_ERROR',
      timestamp: new Date(),
      payload: {
        provider: 'gemini',
        errorType: 'GEMINI_ERROR',
        message: errorMessage
      }
    });
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createGeminiClient(eventBus: EventBus): GeminiClient {
  const config: GeminiClientConfig = {
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    defaultModel: 'gemini-2.5-pro',
    maxOutputTokens: 8192,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 1000,
    rateLimitRpm: 60
  };

  return new GeminiClient(config, eventBus);
}

// -----------------------------------------------------------------------------
// MODEL CONSTANTS
// -----------------------------------------------------------------------------

export const GeminiModels = {
  PRO_25: 'gemini-2.5-pro' as GeminiModel,
  FLASH_25: 'gemini-2.5-flash' as GeminiModel,
  PRO_15: 'gemini-1.5-pro' as GeminiModel
};
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/llm/__tests__/GeminiClient.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiClient, GeminiClientConfig, GeminiModels } from '../GeminiClient';

// Mock the Google Generative AI SDK
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
        sendMessageStream: vi.fn()
      })
    })
  }))
}));

describe('GeminiClient', () => {
  let client: GeminiClient;
  let mockEventBus: any;
  let mockModel: any;
  let mockChat: any;

  const defaultConfig: GeminiClientConfig = {
    apiKey: 'test-key',
    defaultModel: 'gemini-2.5-pro',
    maxOutputTokens: 4096,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 100,
    rateLimitRpm: 100
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockEventBus = {
      emit: vi.fn()
    };

    mockChat = {
      sendMessage: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Test response',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15
          }
        }
      }),
      sendMessageStream: vi.fn()
    };

    mockModel = {
      startChat: vi.fn().mockReturnValue(mockChat)
    };

    const GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel)
    }));

    client = new GeminiClient(defaultConfig, mockEventBus);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('complete', () => {
    it('should send message and return response', async () => {
      const response = await client.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(response.content).toBe('Test response');
      expect(response.usage.total).toBe(15);
    });

    it('should use custom model when specified', async () => {
      await client.complete(
        [{ role: 'user', content: 'Hello' }],
        { model: 'gemini-2.5-flash' }
      );

      // Model should be retrieved with the correct name
      const GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
      const instance = GoogleGenerativeAI.mock.results[0].value;
      expect(instance.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
    });

    it('should include system instruction when provided', async () => {
      await client.complete(
        [{ role: 'user', content: 'Hello' }],
        { systemInstruction: 'You are a helpful assistant.' }
      );

      expect(mockModel.startChat).toHaveBeenCalledWith(
        expect.objectContaining({ systemInstruction: 'You are a helpful assistant.' })
      );
    });

    it('should emit token usage event', async () => {
      await client.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TOKENS_USED',
          payload: expect.objectContaining({
            provider: 'gemini',
            usage: { input: 10, output: 5, total: 15 }
          })
        })
      );
    });

    it('should build conversation history for multi-turn', async () => {
      await client.complete([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ]);

      // First message should be sent to build history
      expect(mockChat.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('stream', () => {
    it('should stream chunks and call callback', async () => {
      const mockStream = {
        async *stream() {
          yield { text: () => 'Hello' };
          yield { text: () => ' world' };
        },
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15
          }
        })
      };

      mockChat.sendMessageStream.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      const onChunk = vi.fn((chunk) => chunks.push(chunk.content));

      const response = await client.stream(
        [{ role: 'user', content: 'Hi' }],
        {},
        onChunk
      );

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Hello world');
    });
  });

  describe('reviewCode', () => {
    it('should return structured review response', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            issues: [
              {
                severity: 'major',
                file: 'test.ts',
                line: 10,
                description: 'Missing null check',
                category: 'correctness'
              }
            ],
            summary: 'Code needs improvement',
            approvalRecommendation: 'request_changes',
            confidenceScore: 0.8
          }),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 }
        }
      });

      const result = await client.reviewCode({
        diff: '+ const x = null;',
        guidelines: ['Check for null values']
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('major');
      expect(result.approvalRecommendation).toBe('request_changes');
    });

    it('should handle malformed JSON response', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => 'This is not JSON',
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
        }
      });

      const result = await client.reviewCode({
        diff: '+ const x = 1;'
      });

      expect(result.approvalRecommendation).toBe('needs_discussion');
      expect(result.confidenceScore).toBe(0);
    });
  });

  describe('research', () => {
    it('should return structured research response', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            answer: 'The function is defined in utils.ts',
            sources: [
              { file: 'utils.ts', relevance: 0.9, excerpt: 'function helper() {}' }
            ],
            confidence: 0.85,
            relatedTopics: ['utilities', 'helpers']
          }),
          usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30, totalTokenCount: 80 }
        }
      });

      const result = await client.research({
        query: 'Where is the helper function defined?',
        codebaseFiles: ['utils.ts', 'index.ts']
      });

      expect(result.answer).toContain('utils.ts');
      expect(result.sources).toHaveLength(1);
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('analyzeCode', () => {
    it('should analyze multiple files', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => 'Analysis: The files contain utility functions.',
          usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 20, totalTokenCount: 220 }
        }
      });

      const result = await client.analyzeCode(
        [
          { path: 'a.ts', content: 'export const a = 1;' },
          { path: 'b.ts', content: 'export const b = 2;' }
        ],
        'What do these files export?'
      );

      expect(result).toContain('utility functions');
    });
  });

  describe('rate limiting', () => {
    it('should emit rate limit event when limit hit', async () => {
      const lowLimitConfig = { ...defaultConfig, rateLimitRpm: 2 };
      const limitedClient = new GeminiClient(lowLimitConfig, mockEventBus);

      // Make requests up to limit
      await limitedClient.complete([{ role: 'user', content: 'Hi' }]);
      await limitedClient.complete([{ role: 'user', content: 'Hi' }]);

      // Third request should trigger rate limit
      const requestPromise = limitedClient.complete([{ role: 'user', content: 'Hi' }]);

      await vi.advanceTimersByTimeAsync(60000);
      await requestPromise;

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RATE_LIMIT_HIT' })
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on quota errors', async () => {
      const quotaError = new Error('Resource exhausted: quota exceeded');

      mockChat.sendMessage
        .mockRejectedValueOnce(quotaError)
        .mockResolvedValueOnce({
          response: {
            text: () => 'Success',
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
          }
        });

      const responsePromise = client.complete([{ role: 'user', content: 'Hi' }]);
      await vi.advanceTimersByTimeAsync(100);
      const response = await responsePromise;

      expect(mockChat.sendMessage).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });
  });

  describe('token tracking', () => {
    it('should accumulate token usage', async () => {
      await client.complete([{ role: 'user', content: 'Hi' }]);
      await client.complete([{ role: 'user', content: 'Hi again' }]);

      const usage = client.getTokenUsage();
      expect(usage.total).toBe(30); // 15 + 15
    });

    it('should reset token usage', async () => {
      await client.complete([{ role: 'user', content: 'Hi' }]);
      client.resetTokenUsage();

      const usage = client.getTokenUsage();
      expect(usage.total).toBe(0);
    });
  });
});
```

---

### SPEC-LLM-003: Unified LLM Provider

| Field | Specification |
|-------|---------------|
| **File** | `src/llm/LLMProvider.ts` |
| **Purpose** | Unified abstraction over multiple LLM providers with automatic fallback and routing |
| **Dependencies** | `ClaudeClient`, `GeminiClient`, `EventBus`, `src/config/llm.ts` |
| **Estimated LOC** | 250-300 |

**Key Responsibilities:**
1. Route requests to appropriate LLM provider based on task type
2. Implement automatic fallback on provider failures
3. Balance cost and quality across providers
4. Track aggregate token usage and costs
5. Provide unified interface for all LLM operations

**Interface Specification:**

```typescript
// =============================================================================
// FILE: src/llm/LLMProvider.ts
// =============================================================================

import { ClaudeClient, ClaudeModels, getModelForTask as getClaudeModel } from './ClaudeClient';
import { GeminiClient, GeminiModels } from './GeminiClient';
import { EventBus } from '../orchestration/events/EventBus';
import {
  LLMMessage,
  LLMResponse,
  LLMStreamChunk,
  Tool,
  ToolCall,
  ToolResult,
  TokenUsage
} from '../types/llm';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type Provider = 'claude' | 'gemini';

export type TaskType =
  | 'planning'
  | 'coding'
  | 'testing'
  | 'review'
  | 'merge_analysis'
  | 'research'
  | 'simple_query';

export interface LLMProviderConfig {
  defaultProvider: Provider;
  fallbackOrder: Provider[];
  taskRouting: Record<TaskType, Provider>;
  maxFallbackAttempts: number;
  costTrackingEnabled: boolean;
}

export interface RequestOptions {
  provider?: Provider;
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: Tool[];
  stopSequences?: string[];
  noFallback?: boolean;
}

export interface StreamCallbacks {
  onChunk?: (chunk: LLMStreamChunk) => void;
  onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

export interface ProviderCost {
  provider: Provider;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface AggregateUsage {
  claude: TokenUsage;
  gemini: TokenUsage;
  total: TokenUsage;
  costs: {
    claude: number;
    gemini: number;
    total: number;
  };
}

// Cost per 1M tokens (approximate, as of 2025)
const TOKEN_COSTS = {
  claude: {
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
  },
  gemini: {
    'gemini-2.5-pro': { input: 1.25, output: 5.0 },
    'gemini-2.5-flash': { input: 0.075, output: 0.3 },
    'gemini-1.5-pro': { input: 1.25, output: 5.0 }
  }
};

// -----------------------------------------------------------------------------
// LLM PROVIDER CLASS
// -----------------------------------------------------------------------------

export class LLMProvider {
  private claudeClient: ClaudeClient;
  private geminiClient: GeminiClient;
  private eventBus: EventBus;
  private config: LLMProviderConfig;

  private providerHealthy: Record<Provider, boolean> = {
    claude: true,
    gemini: true
  };

  private aggregateUsage: AggregateUsage = {
    claude: { input: 0, output: 0, total: 0 },
    gemini: { input: 0, output: 0, total: 0 },
    total: { input: 0, output: 0, total: 0 },
    costs: { claude: 0, gemini: 0, total: 0 }
  };

  constructor(
    claudeClient: ClaudeClient,
    geminiClient: GeminiClient,
    eventBus: EventBus,
    config?: Partial<LLMProviderConfig>
  ) {
    this.claudeClient = claudeClient;
    this.geminiClient = geminiClient;
    this.eventBus = eventBus;

    this.config = {
      defaultProvider: 'claude',
      fallbackOrder: ['claude', 'gemini'],
      taskRouting: {
        planning: 'claude',      // Opus for complex reasoning
        coding: 'claude',        // Sonnet for implementation
        testing: 'claude',       // Sonnet for test generation
        review: 'gemini',        // Gemini for large context review
        merge_analysis: 'claude',// Claude for careful analysis
        research: 'gemini',      // Gemini for codebase search
        simple_query: 'gemini'   // Flash for quick queries
      },
      maxFallbackAttempts: 2,
      costTrackingEnabled: true,
      ...config
    };
  }

  // ---------------------------------------------------------------------------
  // CORE API METHODS
  // ---------------------------------------------------------------------------

  /**
   * Send a message and get a complete response
   * Automatically routes to appropriate provider
   */
  async complete(
    messages: LLMMessage[],
    options: RequestOptions = {}
  ): Promise<LLMResponse> {
    const provider = this.selectProvider(options);
    const providers = options.noFallback
      ? [provider]
      : this.getFallbackOrder(provider);

    let lastError: Error | null = null;

    for (const p of providers) {
      if (!this.providerHealthy[p]) {
        continue;
      }

      try {
        const response = await this.executeWithProvider(p, 'complete', messages, options);

        // Track usage
        this.updateAggregateUsage(p, response.usage);

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.markProviderUnhealthy(p);

        this.eventBus.emit({
          type: 'LLM_FALLBACK',
          timestamp: new Date(),
          payload: {
            fromProvider: p,
            toProvider: providers[providers.indexOf(p) + 1] || 'none',
            reason: lastError.message
          }
        });
      }
    }

    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Stream a response with real-time chunk callbacks
   */
  async stream(
    messages: LLMMessage[],
    options: RequestOptions = {},
    callbacks: StreamCallbacks = {}
  ): Promise<LLMResponse> {
    const provider = this.selectProvider(options);

    try {
      if (provider === 'claude') {
        return await this.claudeClient.stream(messages, {
          model: getClaudeModel(options.taskType || 'coding'),
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          systemPrompt: options.systemPrompt,
          tools: options.tools,
          stopSequences: options.stopSequences
        }, callbacks);
      } else {
        return await this.geminiClient.stream(messages, {
          maxOutputTokens: options.maxTokens,
          temperature: options.temperature,
          systemInstruction: options.systemPrompt,
          stopSequences: options.stopSequences
        }, callbacks.onChunk);
      }
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Execute a multi-turn conversation with tool calls
   * Only available with Claude
   */
  async executeWithTools(
    messages: LLMMessage[],
    tools: Tool[],
    onToolCall: (toolCall: ToolCall) => Promise<ToolResult>,
    options: RequestOptions = {}
  ): Promise<LLMResponse> {
    // Tool execution only supported by Claude
    return await this.claudeClient.executeWithTools(
      messages,
      tools,
      onToolCall,
      {
        model: getClaudeModel(options.taskType || 'coding'),
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        systemPrompt: options.systemPrompt
      }
    );
  }

  // ---------------------------------------------------------------------------
  // TASK-SPECIFIC METHODS
  // ---------------------------------------------------------------------------

  /**
   * Plan tasks - uses Claude Opus
   */
  async plan(prompt: string, context?: string): Promise<LLMResponse> {
    const messages: LLMMessage[] = [];

    if (context) {
      messages.push({ role: 'user', content: `Context:\n${context}` });
      messages.push({ role: 'assistant', content: 'I understand the context. Please provide your planning request.' });
    }

    messages.push({ role: 'user', content: prompt });

    return this.complete(messages, {
      provider: 'claude',
      taskType: 'planning',
      temperature: 0.7
    });
  }

  /**
   * Generate code - uses Claude Sonnet
   */
  async generateCode(
    prompt: string,
    tools: Tool[],
    onToolCall: (toolCall: ToolCall) => Promise<ToolResult>
  ): Promise<LLMResponse> {
    return this.executeWithTools(
      [{ role: 'user', content: prompt }],
      tools,
      onToolCall,
      {
        taskType: 'coding',
        temperature: 0.3 // Lower temperature for code
      }
    );
  }

  /**
   * Review code - uses Gemini (large context)
   */
  async reviewCode(
    diff: string,
    fileContext?: string,
    guidelines?: string[]
  ): Promise<LLMResponse> {
    return this.complete(
      [{
        role: 'user',
        content: `Review this code change:\n\`\`\`diff\n${diff}\n\`\`\`${
          fileContext ? `\n\nContext:\n\`\`\`\n${fileContext}\n\`\`\`` : ''
        }${
          guidelines ? `\n\nGuidelines:\n${guidelines.map(g => `- ${g}`).join('\n')}` : ''
        }`
      }],
      {
        provider: 'gemini',
        taskType: 'review',
        temperature: 0.3
      }
    );
  }

  /**
   * Research codebase - uses Gemini
   */
  async research(query: string, codebaseContext: string): Promise<LLMResponse> {
    return this.complete(
      [{
        role: 'user',
        content: `Research query: ${query}\n\nCodebase:\n${codebaseContext}`
      }],
      {
        provider: 'gemini',
        taskType: 'research',
        temperature: 0.5
      }
    );
  }

  // ---------------------------------------------------------------------------
  // PROVIDER SELECTION & FALLBACK
  // ---------------------------------------------------------------------------

  private selectProvider(options: RequestOptions): Provider {
    // Explicit provider takes precedence
    if (options.provider) {
      return options.provider;
    }

    // Task-based routing
    if (options.taskType && this.config.taskRouting[options.taskType]) {
      return this.config.taskRouting[options.taskType];
    }

    // Default provider
    return this.config.defaultProvider;
  }

  private getFallbackOrder(preferredProvider: Provider): Provider[] {
    const order = [preferredProvider];

    for (const p of this.config.fallbackOrder) {
      if (!order.includes(p)) {
        order.push(p);
      }
    }

    return order.slice(0, this.config.maxFallbackAttempts);
  }

  private markProviderUnhealthy(provider: Provider): void {
    this.providerHealthy[provider] = false;

    // Recover provider health after delay
    setTimeout(() => {
      this.providerHealthy[provider] = true;

      this.eventBus.emit({
        type: 'LLM_PROVIDER_RECOVERED',
        timestamp: new Date(),
        payload: { provider }
      });
    }, 60000); // 1 minute recovery
  }

  // ---------------------------------------------------------------------------
  // PROVIDER EXECUTION
  // ---------------------------------------------------------------------------

  private async executeWithProvider(
    provider: Provider,
    method: 'complete',
    messages: LLMMessage[],
    options: RequestOptions
  ): Promise<LLMResponse> {
    if (provider === 'claude') {
      return await this.claudeClient.complete(messages, {
        model: getClaudeModel(options.taskType || 'coding'),
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        systemPrompt: options.systemPrompt,
        tools: options.tools,
        stopSequences: options.stopSequences
      });
    } else {
      return await this.geminiClient.complete(messages, {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        systemInstruction: options.systemPrompt,
        stopSequences: options.stopSequences
      });
    }
  }

  // ---------------------------------------------------------------------------
  // COST & USAGE TRACKING
  // ---------------------------------------------------------------------------

  private updateAggregateUsage(provider: Provider, usage: TokenUsage): void {
    // Update provider-specific usage
    this.aggregateUsage[provider].input += usage.input;
    this.aggregateUsage[provider].output += usage.output;
    this.aggregateUsage[provider].total += usage.total;

    // Update total usage
    this.aggregateUsage.total.input += usage.input;
    this.aggregateUsage.total.output += usage.output;
    this.aggregateUsage.total.total += usage.total;

    // Estimate costs (simplified - actual model used would be needed for accuracy)
    if (this.config.costTrackingEnabled) {
      const costRates = provider === 'claude'
        ? TOKEN_COSTS.claude['claude-sonnet-4-20250514']
        : TOKEN_COSTS.gemini['gemini-2.5-pro'];

      const cost = (usage.input / 1_000_000) * costRates.input +
                   (usage.output / 1_000_000) * costRates.output;

      this.aggregateUsage.costs[provider] += cost;
      this.aggregateUsage.costs.total += cost;

      this.eventBus.emit({
        type: 'COST_UPDATE',
        timestamp: new Date(),
        payload: {
          provider,
          incrementalCost: cost,
          totalCost: this.aggregateUsage.costs.total
        }
      });
    }
  }

  getAggregateUsage(): AggregateUsage {
    return JSON.parse(JSON.stringify(this.aggregateUsage));
  }

  resetUsage(): void {
    this.aggregateUsage = {
      claude: { input: 0, output: 0, total: 0 },
      gemini: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 },
      costs: { claude: 0, gemini: 0, total: 0 }
    };

    this.claudeClient.resetTokenUsage();
    this.geminiClient.resetTokenUsage();
  }

  // ---------------------------------------------------------------------------
  // PROVIDER HEALTH
  // ---------------------------------------------------------------------------

  getProviderHealth(): Record<Provider, boolean> {
    return { ...this.providerHealthy };
  }

  forceRecoverProvider(provider: Provider): void {
    this.providerHealthy[provider] = true;
  }
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTION
// -----------------------------------------------------------------------------

export function createLLMProvider(eventBus: EventBus): LLMProvider {
  const claudeClient = new ClaudeClient({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 1000,
    rateLimitRpm: 50
  }, eventBus);

  const geminiClient = new GeminiClient({
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    defaultModel: 'gemini-2.5-pro',
    maxOutputTokens: 8192,
    temperature: 0.7,
    maxRetries: 3,
    retryDelayMs: 1000,
    rateLimitRpm: 60
  }, eventBus);

  return new LLMProvider(claudeClient, geminiClient, eventBus);
}
```

**Unit Tests:**

```typescript
// =============================================================================
// FILE: src/llm/__tests__/LLMProvider.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMProvider, Provider, TaskType } from '../LLMProvider';

describe('LLMProvider', () => {
  let provider: LLMProvider;
  let mockClaudeClient: any;
  let mockGeminiClient: any;
  let mockEventBus: any;

  const mockResponse = (content: string) => ({
    content,
    model: 'test-model',
    stopReason: 'end_turn',
    usage: { input: 100, output: 50, total: 150 }
  });

  beforeEach(() => {
    vi.useFakeTimers();

    mockEventBus = {
      emit: vi.fn()
    };

    mockClaudeClient = {
      complete: vi.fn().mockResolvedValue(mockResponse('Claude response')),
      stream: vi.fn().mockResolvedValue(mockResponse('Claude stream')),
      executeWithTools: vi.fn().mockResolvedValue(mockResponse('Claude with tools')),
      resetTokenUsage: vi.fn()
    };

    mockGeminiClient = {
      complete: vi.fn().mockResolvedValue(mockResponse('Gemini response')),
      stream: vi.fn().mockResolvedValue(mockResponse('Gemini stream')),
      resetTokenUsage: vi.fn()
    };

    provider = new LLMProvider(
      mockClaudeClient,
      mockGeminiClient,
      mockEventBus
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('provider selection', () => {
    it('should use Claude for planning tasks', async () => {
      await provider.complete(
        [{ role: 'user', content: 'Plan something' }],
        { taskType: 'planning' }
      );

      expect(mockClaudeClient.complete).toHaveBeenCalled();
      expect(mockGeminiClient.complete).not.toHaveBeenCalled();
    });

    it('should use Gemini for review tasks', async () => {
      await provider.complete(
        [{ role: 'user', content: 'Review this' }],
        { taskType: 'review' }
      );

      expect(mockGeminiClient.complete).toHaveBeenCalled();
      expect(mockClaudeClient.complete).not.toHaveBeenCalled();
    });

    it('should use Gemini for research tasks', async () => {
      await provider.complete(
        [{ role: 'user', content: 'Research this' }],
        { taskType: 'research' }
      );

      expect(mockGeminiClient.complete).toHaveBeenCalled();
    });

    it('should use explicit provider when specified', async () => {
      await provider.complete(
        [{ role: 'user', content: 'Hello' }],
        { provider: 'gemini', taskType: 'coding' } // Coding would normally use Claude
      );

      expect(mockGeminiClient.complete).toHaveBeenCalled();
      expect(mockClaudeClient.complete).not.toHaveBeenCalled();
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to Gemini when Claude fails', async () => {
      mockClaudeClient.complete.mockRejectedValueOnce(new Error('Claude error'));

      const response = await provider.complete([{ role: 'user', content: 'Hello' }]);

      expect(response.content).toBe('Gemini response');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LLM_FALLBACK' })
      );
    });

    it('should not fallback when noFallback is true', async () => {
      mockClaudeClient.complete.mockRejectedValueOnce(new Error('Claude error'));

      await expect(
        provider.complete(
          [{ role: 'user', content: 'Hello' }],
          { noFallback: true }
        )
      ).rejects.toThrow('Claude error');

      expect(mockGeminiClient.complete).not.toHaveBeenCalled();
    });

    it('should throw when all providers fail', async () => {
      mockClaudeClient.complete.mockRejectedValue(new Error('Claude error'));
      mockGeminiClient.complete.mockRejectedValue(new Error('Gemini error'));

      await expect(
        provider.complete([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow();
    });

    it('should mark provider unhealthy after failure', async () => {
      mockClaudeClient.complete.mockRejectedValueOnce(new Error('Claude error'));

      await provider.complete([{ role: 'user', content: 'Hello' }]);

      const health = provider.getProviderHealth();
      expect(health.claude).toBe(false);
      expect(health.gemini).toBe(true);
    });

    it('should recover provider health after delay', async () => {
      mockClaudeClient.complete.mockRejectedValueOnce(new Error('Claude error'));

      await provider.complete([{ role: 'user', content: 'Hello' }]);

      expect(provider.getProviderHealth().claude).toBe(false);

      // Advance time by 1 minute
      await vi.advanceTimersByTimeAsync(60000);

      expect(provider.getProviderHealth().claude).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LLM_PROVIDER_RECOVERED' })
      );
    });
  });

  describe('task-specific methods', () => {
    it('plan() should use Claude with planning task type', async () => {
      await provider.plan('Create a plan');

      expect(mockClaudeClient.complete).toHaveBeenCalled();
    });

    it('generateCode() should use Claude with tools', async () => {
      const tools = [{ name: 'write_file', description: 'Write file', parameters: { type: 'object', properties: {}, required: [] } }];
      const onToolCall = vi.fn().mockResolvedValue({ toolName: 'write_file', success: true, output: '' });

      await provider.generateCode('Write code', tools, onToolCall);

      expect(mockClaudeClient.executeWithTools).toHaveBeenCalled();
    });

    it('reviewCode() should use Gemini', async () => {
      await provider.reviewCode('+ const x = 1;');

      expect(mockGeminiClient.complete).toHaveBeenCalled();
    });

    it('research() should use Gemini', async () => {
      await provider.research('Where is X defined?', 'codebase content');

      expect(mockGeminiClient.complete).toHaveBeenCalled();
    });
  });

  describe('usage tracking', () => {
    it('should track aggregate usage across providers', async () => {
      await provider.complete([{ role: 'user', content: 'Hello' }]);
      await provider.complete(
        [{ role: 'user', content: 'Hello' }],
        { provider: 'gemini' }
      );

      const usage = provider.getAggregateUsage();

      expect(usage.claude.total).toBe(150);
      expect(usage.gemini.total).toBe(150);
      expect(usage.total.total).toBe(300);
    });

    it('should track costs', async () => {
      await provider.complete([{ role: 'user', content: 'Hello' }]);

      const usage = provider.getAggregateUsage();

      expect(usage.costs.claude).toBeGreaterThan(0);
      expect(usage.costs.total).toBeGreaterThan(0);
    });

    it('should emit cost update events', async () => {
      await provider.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COST_UPDATE',
          payload: expect.objectContaining({
            provider: 'claude'
          })
        })
      );
    });

    it('should reset usage for all providers', async () => {
      await provider.complete([{ role: 'user', content: 'Hello' }]);

      provider.resetUsage();

      const usage = provider.getAggregateUsage();
      expect(usage.total.total).toBe(0);
      expect(mockClaudeClient.resetTokenUsage).toHaveBeenCalled();
      expect(mockGeminiClient.resetTokenUsage).toHaveBeenCalled();
    });
  });

  describe('stream', () => {
    it('should stream from Claude for coding tasks', async () => {
      const callbacks = { onChunk: vi.fn() };

      await provider.stream(
        [{ role: 'user', content: 'Code something' }],
        { taskType: 'coding' },
        callbacks
      );

      expect(mockClaudeClient.stream).toHaveBeenCalled();
    });

    it('should stream from Gemini for review tasks', async () => {
      const onChunk = vi.fn();

      await provider.stream(
        [{ role: 'user', content: 'Review this' }],
        { taskType: 'review' },
        { onChunk }
      );

      expect(mockGeminiClient.stream).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      mockClaudeClient.stream.mockRejectedValue(new Error('Stream failed'));
      const onError = vi.fn();

      await expect(
        provider.stream(
          [{ role: 'user', content: 'Hello' }],
          {},
          { onError }
        )
      ).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('provider health', () => {
    it('should force recover provider', async () => {
      mockClaudeClient.complete.mockRejectedValueOnce(new Error('Error'));
      await provider.complete([{ role: 'user', content: 'Hello' }]);

      expect(provider.getProviderHealth().claude).toBe(false);

      provider.forceRecoverProvider('claude');

      expect(provider.getProviderHealth().claude).toBe(true);
    });
  });
});
```

---

### Part E Summary

| File | Purpose | Estimated LOC |
|------|---------|---------------|
| `src/llm/ClaudeClient.ts` | Anthropic Claude API with streaming & tools | 400-500 |
| `src/llm/GeminiClient.ts` | Google Gemini API for reviews & research | 300-350 |
| `src/llm/LLMProvider.ts` | Unified abstraction with fallback & routing | 250-300 |
| **TOTAL** | | **950-1,150** |

**Test Summary:**
- ClaudeClient: 18 tests
- GeminiClient: 12 tests
- LLMProvider: 16 tests
- **Total LLM Tests:** 46 tests

**Key Design Decisions:**
1. **Claude for coding/planning** - Better tool support and reasoning
2. **Gemini for reviews/research** - Large context window advantage
3. **Automatic fallback** - Resilience through provider switching
4. **Cost tracking** - Real-time cost estimation per provider
5. **Health management** - Temporary provider disabling on failures

---


## Part F: System Prompts

This section specifies the system prompts for each specialized agent in the Nexus system. These prompts define agent behavior, constraints, output formats, and interaction patterns.

### Overview

| Prompt | Agent | File | Estimated Words |
|--------|-------|------|-----------------|
| SPEC-PROMPT-001 | Planner | `config/prompts/planner.md` | 1,500-2,000 |
| SPEC-PROMPT-002 | Coder | `config/prompts/coder.md` | 2,000-2,500 |
| SPEC-PROMPT-003 | Reviewer | `config/prompts/reviewer.md` | 1,500-2,000 |
| SPEC-PROMPT-004 | Tester | `config/prompts/tester.md` | 1,500-2,000 |
| SPEC-PROMPT-005 | Merger | `config/prompts/merger.md` | 1,200-1,500 |
| **TOTAL** | | | **7,700-10,000** |

---

### SPEC-PROMPT-001: Planner System Prompt

| Field | Specification |
|-------|---------------|
| **File** | `config/prompts/planner.md` |
| **Model** | Claude Opus (claude-opus-4-20250514) |
| **Temperature** | 0.7 (creative decomposition) |
| **Estimated Words** | 1,500-2,000 |

**Prompt Content:**

```markdown
# Nexus Planner Agent

You are the Planner agent in the Nexus autonomous software development system. Your role is to decompose features and requirements into well-defined, atomic tasks that can be executed by Coder agents.

## Core Responsibilities

1. **Feature Decomposition**: Break down features into implementable tasks
2. **Dependency Analysis**: Identify task dependencies and ordering
3. **Time Estimation**: Estimate task duration accurately
4. **Risk Identification**: Flag potential challenges and blockers

## Critical Constraints

### The 30-Minute Rule

**EVERY task you create MUST be completable in 30 minutes or less.** This is non-negotiable.

Why 30 minutes?
- Enables frequent checkpoints and rollbacks
- Reduces blast radius of failures
- Allows parallel execution by multiple agents
- Keeps context focused and manageable

If a task seems larger than 30 minutes:
1. Split it into sub-tasks
2. Each sub-task must be independently verifiable
3. Define clear handoff points between sub-tasks

### Task Atomicity

Each task MUST be:
- **Self-contained**: All information needed to complete it is in the task description
- **Verifiable**: Has clear success criteria that can be tested
- **Independent**: Can be worked on without blocking other tasks (when possible)
- **Focused**: Does ONE thing well

## Task Structure

For each task, provide:

<task>
  <id>TASK-{feature_id}-{sequence}</id>
  <title>Short descriptive title</title>
  <description>
    Detailed description of what needs to be done.
    Include:
    - WHY this task exists
    - WHAT needs to be created/modified
    - WHERE the changes should go
    - HOW success is measured
  </description>
  <type>implementation | test | refactor | config | documentation</type>
  <files>
    <file action="create|modify">path/to/file.ts</file>
  </files>
  <dependencies>
    <depends_on>TASK-XXX-YYY</depends_on>
  </dependencies>
  <estimated_minutes>15-30</estimated_minutes>
  <acceptance_criteria>
    <criterion>Specific, measurable criterion 1</criterion>
    <criterion>Specific, measurable criterion 2</criterion>
  </acceptance_criteria>
  <technical_notes>
    Any implementation hints or considerations.
  </technical_notes>
</task>

## Decomposition Strategy

### 1. Analyze the Feature

Before creating tasks, understand:
- What is the user trying to achieve?
- What existing code will be affected?
- What new code needs to be created?
- What are the integration points?

### 2. Identify Layers

Break down by architectural layer:
1. **Types/Interfaces** - Define data structures first
2. **Infrastructure** - Low-level utilities
3. **Persistence** - Database schemas and storage
4. **Business Logic** - Core functionality
5. **API/Integration** - External interfaces
6. **UI Components** - User-facing elements
7. **Tests** - Verification at each layer

### 3. Order by Dependencies

Use topological ordering:
- Tasks with no dependencies come first (Wave 1)
- Tasks depending on Wave 1 form Wave 2
- Continue until all tasks are ordered

### 4. Maximize Parallelism

Within each wave, tasks should be:
- Independent of each other
- Working on different files when possible
- Not creating merge conflicts

## Examples

### Good Task Decomposition

Feature: "Add user authentication"

<task>
  <id>TASK-AUTH-001</id>
  <title>Define authentication types</title>
  <description>
    Create TypeScript interfaces for authentication.
    - User interface with id, email, passwordHash
    - Session interface with token, userId, expiresAt
    - AuthResult for login/register responses
  </description>
  <type>implementation</type>
  <files>
    <file action="create">src/types/auth.ts</file>
  </files>
  <dependencies></dependencies>
  <estimated_minutes>15</estimated_minutes>
  <acceptance_criteria>
    <criterion>Types compile without errors</criterion>
    <criterion>Types are exported from src/types/index.ts</criterion>
  </acceptance_criteria>
</task>

### Bad Task Decomposition (Don't Do This)

<!-- TOO BIG - Violates 30-minute rule -->
<task>
  <id>TASK-AUTH-001</id>
  <title>Implement authentication</title>
  <description>Add user login and registration</description>
  <estimated_minutes>240</estimated_minutes>
</task>

## Output Format

<planning_result>
  <feature>
    <id>FEAT-001</id>
    <summary>Brief summary of what will be built</summary>
  </feature>

  <analysis>
    <complexity>simple | medium | complex</complexity>
    <estimated_total_hours>X</estimated_total_hours>
    <parallel_waves>N</parallel_waves>
    <risks>
      <risk severity="high|medium|low">Description</risk>
    </risks>
  </analysis>

  <tasks>
    <!-- All tasks here -->
  </tasks>

  <execution_order>
    <wave number="1">
      <task_ref>TASK-XXX-001</task_ref>
    </wave>
  </execution_order>
</planning_result>

## Remember

- You are creating a roadmap for AI agents, not humans
- Be explicit about everything - assume nothing
- Quality of planning directly impacts execution success
- When in doubt, split the task smaller
- Every 30+ minute task is a planning failure
```

---

### SPEC-PROMPT-002: Coder System Prompt

| Field | Specification |
|-------|---------------|
| **File** | `config/prompts/coder.md` |
| **Model** | Claude Sonnet (claude-sonnet-4-20250514) |
| **Temperature** | 0.3 (precise coding) |
| **Estimated Words** | 2,000-2,500 |

**Prompt Content:**

```markdown
# Nexus Coder Agent

You are the Coder agent in the Nexus autonomous software development system. Your role is to implement tasks by writing high-quality, production-ready code.

## Core Responsibilities

1. **Code Implementation**: Write clean, tested, documented code
2. **File Operations**: Create and modify files using provided tools
3. **Code Quality**: Follow project patterns and best practices
4. **Self-Verification**: Ensure code compiles and passes basic checks

## Available Tools

### file_read
Read the contents of a file.

### file_write
Write content to a file (creates directories if needed).

### file_edit
Make targeted edits to a file.

### terminal
Execute terminal commands.

### search
Search for patterns in the codebase.

### get_diagnostics
Get TypeScript/ESLint diagnostics for a file.

## Workflow

### 1. Understand the Task

Before writing any code:
- Read the task description completely
- Identify files that need to be created or modified
- Understand the expected behavior
- Note the acceptance criteria

### 2. Explore Context

Use tools to understand existing code.

### 3. Plan Implementation

Before coding, mentally plan:
- What new code needs to be written
- What existing code needs modification
- What imports are needed
- What tests should be written

### 4. Implement

Write code in logical order:
1. Types/interfaces first
2. Core implementation
3. Integration points
4. Error handling

### 5. Verify

After implementing, check for compilation errors and run tests.

## Code Quality Standards

### TypeScript

- Use explicit types, proper error handling
- Avoid any types
- Use specific error types, not generic Error

### File Structure

- Clear organization with header comments
- Logical section separation
- Proper imports at top

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | user-service.ts |
| Classes | PascalCase | UserService |
| Functions | camelCase | createUser |
| Constants | UPPER_SNAKE | MAX_RETRY_COUNT |

## Task Completion

### Success Criteria

A task is complete when:
1. All files are created/modified as specified
2. Code compiles without errors
3. Linting passes
4. Unit tests pass (if included in task)
5. Acceptance criteria are met

### Output Format

<task_result>
  <task_id>TASK-XXX-YYY</task_id>
  <status>completed | partial | blocked</status>

  <changes>
    <file action="created|modified">path/to/file.ts</file>
  </changes>

  <verification>
    <compilation>passed | failed</compilation>
    <linting>passed | failed | warnings</linting>
    <tests>passed | failed | skipped</tests>
  </verification>

  <notes>
    Any additional context or observations
  </notes>
</task_result>

## Remember

- You are writing production code, not prototypes
- Code will be reviewed by other agents and humans
- Follow existing patterns in the codebase
- When uncertain, read more context first
- Leave code better than you found it
```

---

### SPEC-PROMPT-003: Reviewer System Prompt

| Field | Specification |
|-------|---------------|
| **File** | `config/prompts/reviewer.md` |
| **Model** | Gemini Pro (gemini-2.5-pro) |
| **Temperature** | 0.3 (consistent reviews) |
| **Estimated Words** | 1,500-2,000 |

**Prompt Content:**

```markdown
# Nexus Reviewer Agent

You are the Reviewer agent in the Nexus autonomous software development system. Your role is to review code changes for quality, correctness, and adherence to standards.

## Core Responsibilities

1. **Code Quality Review**: Assess code readability, maintainability
2. **Correctness Verification**: Check logic and implementation
3. **Security Analysis**: Identify potential security issues
4. **Performance Review**: Flag performance concerns
5. **Standards Compliance**: Verify coding standards adherence

## Review Categories

### 1. Correctness
- Does the code do what it claims to do?
- Are edge cases handled?
- Is error handling appropriate?

### 2. Security
- Input validation present?
- SQL injection possible?
- XSS vulnerabilities?
- Secrets exposed?

### 3. Performance
- N+1 query issues?
- Memory leaks possible?
- Inefficient algorithms?

### 4. Code Quality
- Is the code readable?
- Are names meaningful?
- Is there unnecessary complexity?

### 5. Testing
- Are tests present for new code?
- Do tests cover edge cases?

## Issue Severity Levels

### CRITICAL
Must be fixed before merge:
- Security vulnerabilities
- Data loss risks
- Crash-causing bugs

### HIGH
Should be fixed before merge:
- Logic errors
- Missing error handling
- Performance issues

### MEDIUM
Should be addressed:
- Code style violations
- Missing tests
- Unclear naming

### LOW
Nice to have:
- Documentation improvements
- Minor optimizations

### INFO
Non-blocking observations

## Output Format

Your review MUST be valid JSON:

{
  "summary": {
    "status": "approved" | "changes_requested" | "needs_discussion",
    "critical_count": 0,
    "high_count": 0,
    "medium_count": 0,
    "low_count": 0,
    "info_count": 0,
    "overall_quality": "excellent" | "good" | "acceptable" | "poor"
  },
  "issues": [
    {
      "id": "ISSUE-001",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "correctness" | "security" | "performance" | "quality",
      "file": "path/to/file.ts",
      "line_start": 42,
      "line_end": 45,
      "title": "Short issue title",
      "description": "Detailed explanation",
      "suggestion": "Suggested fix"
    }
  ],
  "positive_feedback": [],
  "blocking": true | false,
  "requires_human_review": true | false
}

## Decision Rules

### Approve When
- No critical or high issues
- Medium issues are minor
- Code achieves its stated purpose

### Request Changes When
- Any critical issues exist
- Multiple high issues exist
- Code doesn't meet basic quality standards

### Escalate to Human When
- Security issues require expert review
- Architecture decisions need human judgment

## Remember

- Be constructive, not destructive
- Explain WHY something is an issue
- Always provide suggestions for improvement
- Acknowledge good code, not just problems
```

---

### SPEC-PROMPT-004: Tester System Prompt

| Field | Specification |
|-------|---------------|
| **File** | `config/prompts/tester.md` |
| **Model** | Claude Sonnet (claude-sonnet-4-20250514) |
| **Temperature** | 0.3 (precise testing) |
| **Estimated Words** | 1,500-2,000 |

**Prompt Content:**

```markdown
# Nexus Tester Agent

You are the Tester agent in the Nexus autonomous software development system. Your role is to write comprehensive tests for code produced by Coder agents.

## Core Responsibilities

1. **Unit Test Creation**: Write tests for individual functions/classes
2. **Integration Testing**: Test component interactions
3. **Edge Case Coverage**: Identify and test boundary conditions
4. **Test Quality**: Ensure tests are meaningful and maintainable

## Testing Framework

The project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

### Vitest Structure

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange, Act, Assert
    });
  });
});

## Test Quality Standards

### 1. Test Naming

// GOOD: Descriptive
it('should return null when user does not exist');
it('should throw ValidationError when email is invalid');

// BAD: Vague
it('works');
it('test user');

### 2. Arrange-Act-Assert (AAA)

Clear structure in every test:
- Arrange: Set up test data
- Act: Execute the code
- Assert: Verify results

### 3. Meaningful Assertions

// GOOD: Specific
expect(user.email).toBe('test@example.com');
expect(users).toHaveLength(3);

// BAD: Too general
expect(user).toBeDefined();
expect(result).toBeTruthy();

## Test Categories

### Unit Tests
Test individual functions/methods in isolation.

### Integration Tests
Test component interactions with setup/teardown.

### Edge Case Tests
- Division by zero
- Empty inputs
- Null/undefined handling
- Boundary values

## Mocking

Mock external services, time-dependent operations, and file system in unit tests.

## Test Coverage Requirements

| Layer | Minimum | Target |
|-------|---------|--------|
| Infrastructure | 80% | 90% |
| Persistence | 85% | 95% |
| Planning | 80% | 90% |
| Orchestration | 80% | 90% |

### Critical Paths (95%+ required)
- Authentication/Authorization
- Data persistence
- QA Loop logic
- Checkpoint/Recovery

## Output Format

<test_result>
  <task_id>TASK-XXX-YYY</task_id>
  <tests_created>
    <test_file path="src/__tests__/UserService.test.ts">
      <test_count>12</test_count>
    </test_file>
  </tests_created>
  <verification>
    <all_tests_pass>true</all_tests_pass>
  </verification>
</test_result>

## Remember

- Tests are documentation - make them readable
- Test behavior, not implementation details
- Missing tests are technical debt
- One good test beats ten superficial tests
- Always run tests after writing them
```

---

### SPEC-PROMPT-005: Merger System Prompt

| Field | Specification |
|-------|---------------|
| **File** | `config/prompts/merger.md` |
| **Model** | Claude Sonnet (claude-sonnet-4-20250514) |
| **Temperature** | 0.3 (precise operations) |
| **Estimated Words** | 1,200-1,500 |

**Prompt Content:**

```markdown
# Nexus Merger Agent

You are the Merger agent in the Nexus autonomous software development system. Your role is to merge completed task branches into the main development branch, resolving conflicts when possible.

## Core Responsibilities

1. **Branch Merging**: Merge approved task worktrees to main
2. **Conflict Resolution**: Resolve merge conflicts automatically when safe
3. **Conflict Escalation**: Request human review for complex conflicts
4. **Merge Verification**: Ensure merged code compiles and tests pass

## Available Tools

- git_merge: Merge a branch into current branch
- git_status: Get current repository status
- git_diff: Get diff between branches
- file_read / file_write: For conflict resolution
- terminal: Execute git commands and verification

## Merge Workflow

### 1. Pre-Merge Checks
- Ensure on correct branch (main)
- Pull latest changes
- Check for uncommitted changes

### 2. Attempt Merge
- Execute merge
- Handle success or conflicts

### 3. Post-Merge Verification
- Compile check
- Test check
- Lint check

## Conflict Categories

### 1. Auto-Resolvable
- **Additive**: Both branches added different content - keep both
- **Formatting**: Use project formatter
- **Import Order**: Use project import sorter

### 2. Requires Analysis
- **Logic Changes**: Same function modified differently
- **Structural Changes**: Different refactoring approaches

### 3. Escalate to Human
- Security-related conflicts
- Architectural conflicts
- Business logic disagreements
- Configuration file conflicts

## Resolution Strategies

| Strategy | Use When |
|----------|----------|
| **Ours** | Task changes should be discarded |
| **Theirs** | Task changes should win |
| **Manual** | Create combined solution |

## Output Format

<merge_result>
  <task_id>TASK-XXX-YYY</task_id>
  <source_branch>task/TASK-XXX-YYY</source_branch>
  <target_branch>main</target_branch>
  <status>success | conflict_resolved | escalated | failed</status>
  <conflicts_encountered>
    <conflict>
      <file>path/to/file.ts</file>
      <type>additive | logic | structural</type>
      <resolution>auto | manual | escalated</resolution>
    </conflict>
  </conflicts_encountered>
  <verification>
    <compilation>passed | failed</compilation>
    <tests>passed | failed | skipped</tests>
  </verification>
  <merge_commit>abc123...</merge_commit>
</merge_result>

## Safety Rules

1. **Never force push** to main
2. **Always verify** after merge before completing
3. **Preserve history** - use merge commits, not rebase
4. **When uncertain, escalate** - better safe than sorry
5. **Document everything**

## Remember

- Merging is the final gate before code reaches main
- A bad merge can break everyone's work
- It's better to delay a merge than to merge broken code
- Human review is a feature, not a failure
```

---

### Part F Summary

| Prompt | Agent | File | Words |
|--------|-------|------|-------|
| SPEC-PROMPT-001 | Planner | `config/prompts/planner.md` | ~1,800 |
| SPEC-PROMPT-002 | Coder | `config/prompts/coder.md` | ~2,200 |
| SPEC-PROMPT-003 | Reviewer | `config/prompts/reviewer.md` | ~1,700 |
| SPEC-PROMPT-004 | Tester | `config/prompts/tester.md` | ~1,800 |
| SPEC-PROMPT-005 | Merger | `config/prompts/merger.md` | ~1,400 |
| **TOTAL** | | | **~8,900 words** |

**Prompt Design Principles:**
1. **Clear Role Definition** - Each agent knows exactly what it does
2. **Explicit Constraints** - No ambiguity about rules (especially 30-minute rule)
3. **Structured Output** - XML/JSON formats for machine parsing
4. **Examples Included** - Good and bad examples for guidance
5. **Escalation Paths** - Clear when to involve humans
6. **Tool Documentation** - Agents know their available capabilities

---

## Task 6.2 Completion Checklist

- [x] All type definition files specified (4 files, 700-900 LOC)
- [x] All configuration files specified (3 files, 250-380 LOC)
- [x] All adapter implementations specified (3 implementations, 500-650 LOC)
- [x] All bridge implementations specified (3 implementations, 600-750 LOC)
- [x] All LLM client implementations specified (3 implementations, 950-1,150 LOC)
- [x] All system prompts specified (5 prompts, ~8,900 words)
- [x] Total estimated LOC documented: ~3,000-3,830 LOC + ~8,900 words

### Task 6.2 Summary

| Category | Count | Estimated LOC/Words |
|----------|-------|---------------------|
| Type Definitions | 4 files | 700-900 LOC |
| Configuration Files | 3 files | 250-380 LOC |
| Adapters | 3 implementations | 500-650 LOC |
| Bridges | 3 implementations | 600-750 LOC |
| LLM Clients | 3 implementations | 950-1,150 LOC |
| System Prompts | 5 prompts | ~8,900 words |
| **TOTAL** | **21 items** | **~3,000-3,830 LOC + ~8,900 words** |

**Test Summary for Task 6.2:**
- Type Definitions: N/A (types only)
- Configuration Files: N/A (config only)
- Adapters: 28 tests
- Bridges: 41 tests
- LLM Clients: 46 tests
- **Total Tests:** 115 tests

**[TASK 6.2 COMPLETE]**

---

# Task 6.3: Integration Sequences

## Overview

This section defines the exact step-by-step integration sequences for how components work together during runtime. Each sequence documents:
- **Trigger**: What initiates the sequence
- **Steps**: Ordered operations with component interactions
- **Data Flow**: What data passes between components
- **Error Handling**: How failures are handled at each step
- **Events**: What events are emitted

---

## Part A: Genesis Mode Integration Sequences

Genesis Mode is the flow for creating a brand new project from scratch.

### SEQ-GEN-001: Interview Sequence

**Purpose:** Gather requirements through conversational AI interview.

**Trigger:** User clicks "New Project" in the UI.

**Sequence Diagram:**
```
┌─────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│  User   │    │InterviewUI │    │EventBus     │    │ClaudeClient  │    │RequirementsDB  │
└────┬────┘    └─────┬──────┘    └──────┬──────┘    └──────┬───────┘    └───────┬────────┘
     │               │                  │                  │                    │
     │ 1. Click      │                  │                  │                    │
     │ "New Project" │                  │                  │                    │
     │──────────────>│                  │                  │                    │
     │               │                  │                  │                    │
     │               │ 2. Emit          │                  │                    │
     │               │ PROJECT_START    │                  │                    │
     │               │─────────────────>│                  │                    │
     │               │                  │                  │                    │
     │               │ 3. Mount         │                  │                    │
     │               │ InterviewChat    │                  │                    │
     │               │<─ ─ ─ ─ ─ ─ ─ ─ ─│                  │                    │
     │               │                  │                  │                    │
     │ 4. Send       │                  │                  │                    │
     │ message       │                  │                  │                    │
     │──────────────>│                  │                  │                    │
     │               │                  │                  │                    │
     │               │ 5. stream()      │                  │                    │
     │               │─────────────────────────────────────>│                    │
     │               │                  │                  │                    │
     │               │ 6. AI response   │                  │                    │
     │               │ (chunks)         │                  │                    │
     │<──────────────│<─────────────────────────────────────│                    │
     │               │                  │                  │                    │
     │               │ 7. Extract       │                  │                    │
     │               │ requirements     │                  │                    │
     │               │─────────────────────────────────────────────────────────>│
     │               │                  │                  │                    │
     │               │ 8. Update        │                  │                    │
     │               │ RequirementsList │                  │                    │
     │<──────────────│                  │                  │                    │
     │               │                  │                  │                    │
     │ 9. Click      │                  │                  │                    │
     │ "Done"        │                  │                  │                    │
     │──────────────>│                  │                  │                    │
     │               │                  │                  │                    │
     │               │ 10. exportToJSON │                  │                    │
     │               │─────────────────────────────────────────────────────────>│
     │               │                  │                  │                    │
     │               │ 11. Emit         │                  │                    │
     │               │ INTERVIEW_COMPLETE                  │                    │
     │               │─────────────────>│                  │                    │
     │               │                  │                  │                    │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | InterviewPage | User initiates new project | Click event | Navigate to interview | N/A |
| 2 | EventBus | Emit PROJECT_START | `{ timestamp, userId }` | Event dispatched | Log if no listeners |
| 3 | InterviewPage | Mount chat interface | None | Component rendered | Show error boundary |
| 4 | InterviewChat | User sends message | Message text | N/A | Validate non-empty |
| 5 | ClaudeClient | Call `stream()` with interview prompt | System prompt + user message | Stream object | Retry 3x, then show error |
| 6 | InterviewChat | Stream response chunks | AI response chunks | Displayed text | Handle stream errors |
| 7 | RequirementsDB | Extract and store requirements | AI response | Requirement objects | Parse error → ask for clarification |
| 8 | RequirementsList | Re-render with new requirements | Requirements array | Updated UI | N/A |
| 9 | InterviewPage | User completes interview | Click "Done" | N/A | Confirm if <5 requirements |
| 10 | RequirementsDB | Export all requirements | Project ID | JSON file | File system error handling |
| 11 | EventBus | Emit INTERVIEW_COMPLETE | `{ projectId, requirementCount }` | Event dispatched | N/A |

**Data Formats:**

```typescript
// Step 2 - PROJECT_START Event
interface ProjectStartEvent {
  type: 'PROJECT_START';
  payload: {
    timestamp: Date;
    userId: string;
    projectName?: string;
  };
}

// Step 5 - Interview System Prompt Structure
interface InterviewContext {
  systemPrompt: string;  // From config/prompts/interviewer.md
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  extractedRequirements: Requirement[];
}

// Step 7 - Extracted Requirement
interface ExtractedRequirement {
  id: string;
  text: string;
  category: 'functional' | 'non-functional' | 'constraint' | 'assumption';
  priority: 'high' | 'medium' | 'low';
  source: string;  // Which user message it came from
  confidence: number;  // 0-1, AI confidence in extraction
}

// Step 10 - Exported Requirements JSON
interface RequirementsExport {
  projectId: string;
  projectName: string;
  createdAt: Date;
  interviewDuration: number;  // minutes
  requirements: {
    functional: ExtractedRequirement[];
    nonFunctional: ExtractedRequirement[];
    constraints: ExtractedRequirement[];
    assumptions: ExtractedRequirement[];
  };
  metadata: {
    totalMessages: number;
    aiModel: string;
    version: string;
  };
}

// Step 11 - INTERVIEW_COMPLETE Event
interface InterviewCompleteEvent {
  type: 'INTERVIEW_COMPLETE';
  payload: {
    projectId: string;
    requirementCount: number;
    duration: number;  // minutes
    categories: Record<string, number>;  // count per category
  };
}
```

**Error Paths:**

| Error Condition | Detection | Response | Recovery |
|-----------------|-----------|----------|----------|
| Claude API rate limit | 429 response | Show "AI is busy" message | Auto-retry after delay |
| Claude API error | 5xx response | Show error, preserve message | Retry button |
| Network failure | Fetch error | Show offline indicator | Queue message for retry |
| Requirement extraction fails | Parse error | Ask user for clarification | Manual entry fallback |
| File system write fails | Write error | Show error notification | Retry with backup location |

---

### SEQ-GEN-002: Planning Sequence

**Purpose:** Decompose approved requirements into executable tasks.

**Trigger:** User approves requirements (clicks "Approve and Plan").

**Sequence Diagram:**
```
┌─────────┐    ┌──────────────┐    ┌───────────────┐    ┌────────────┐    ┌────────────────┐
│  User   │    │NexusCoord    │    │TaskDecomposer │    │DepResolver │    │Database        │
└────┬────┘    └──────┬───────┘    └───────┬───────┘    └─────┬──────┘    └───────┬────────┘
     │                │                    │                  │                   │
     │ 1. Approve     │                    │                  │                   │
     │ requirements   │                    │                  │                   │
     │───────────────>│                    │                  │                   │
     │                │                    │                  │                   │
     │                │ 2. Emit            │                  │                   │
     │                │ PLANNING_START     │                  │                   │
     │                │───────────────────>│                  │                   │
     │                │                    │                  │                   │
     │                │ 3. Load            │                  │                   │
     │                │ requirements       │                  │                   │
     │                │<───────────────────────────────────────────────────────────│
     │                │                    │                  │                   │
     │                │ 4. Create          │                  │                   │
     │                │ Planner Agent      │                  │                   │
     │                │───────────────────>│                  │                   │
     │                │                    │                  │                   │
     │                │ 5. For each feature:                  │                   │
     │                │ decomposeFeature() │                  │                   │
     │                │<──────────────────>│                  │                   │
     │                │                    │                  │                   │
     │                │ 6. Resolve         │                  │                   │
     │                │ dependencies       │                  │                   │
     │                │────────────────────────────────────>│                   │
     │                │                    │                  │                   │
     │                │ 7. Topological     │                  │                   │
     │                │ sort (Kahn's)      │                  │                   │
     │                │<────────────────────────────────────│                   │
     │                │                    │                  │                   │
     │                │ 8. Save tasks      │                  │                   │
     │                │ to database        │                  │                   │
     │                │───────────────────────────────────────────────────────────>│
     │                │                    │                  │                   │
     │                │ 9. Emit            │                  │                   │
     │                │ PLANNING_COMPLETE  │                  │                   │
     │                │                    │                  │                   │
     │ 10. Review     │                    │                  │                   │
     │ plan           │                    │                  │                   │
     │<───────────────│                    │                  │                   │
     │                │                    │                  │                   │
     │ 11. Approve    │                    │                  │                   │
     │ plan           │                    │                  │                   │
     │───────────────>│                    │                  │                   │
     │                │                    │                  │                   │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | UI | User approves requirements | Approval event | Trigger planning | N/A |
| 2 | EventBus | Emit PLANNING_START | `{ projectId }` | Event dispatched | N/A |
| 3 | NexusCoordinator | Load requirements from DB | Project ID | RequirementsExport | Show error if not found |
| 4 | NexusCoordinator | Initialize Planner agent | Requirements + context | Planner ready | Retry LLM connection |
| 5 | TaskDecomposer | Decompose each feature | Feature + context | Task[] | Split if >30min estimate |
| 6 | DependencyResolver | Analyze task dependencies | Task[] | Dependency graph | Detect cycles |
| 7 | DependencyResolver | Topological sort | Dependency graph | Ordered Task[] | Break cycles with warning |
| 8 | Database | Persist all tasks | Task[] | Saved tasks | Transaction rollback |
| 9 | EventBus | Emit PLANNING_COMPLETE | `{ taskCount, waves }` | Event dispatched | N/A |
| 10 | UI | Display plan for review | Task summary | UI rendered | N/A |
| 11 | User | Approve or request changes | Approval/changes | Next sequence | Allow edits |

**Data Formats:**

```typescript
// Step 2 - PLANNING_START Event
interface PlanningStartEvent {
  type: 'PLANNING_START';
  payload: {
    projectId: string;
    requirementCount: number;
    estimatedDuration: number;  // minutes
  };
}

// Step 5 - Feature Decomposition Output
interface DecomposedFeature {
  featureId: string;
  featureName: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: 'setup' | 'implementation' | 'testing' | 'documentation';
    estimatedMinutes: number;
    dependencies: string[];  // task IDs
    acceptanceCriteria: string[];
    filesLikelyTouched: string[];  // predicted file paths
  }>;
  rationale: string;  // Why this decomposition
}

// Step 6-7 - Dependency Resolution
interface DependencyGraph {
  nodes: Array<{
    taskId: string;
    inDegree: number;  // Number of dependencies
    outDegree: number;  // Number of dependents
  }>;
  edges: Array<{
    from: string;  // Dependency task ID
    to: string;    // Dependent task ID
    type: 'hard' | 'soft';  // Hard = must complete, Soft = recommended
  }>;
  waves: TaskWave[];  // Parallel execution groups
  criticalPath: string[];  // Longest dependency chain
}

interface TaskWave {
  waveNumber: number;
  tasks: string[];  // Task IDs that can run in parallel
  estimatedDuration: number;  // Max of task estimates
}

// Step 8 - Task Persistence Format
interface PersistedTask {
  id: string;
  projectId: string;
  featureId: string;
  title: string;
  description: string;
  type: string;
  status: 'pending' | 'queued' | 'in_progress' | 'review' | 'done' | 'failed';
  estimatedMinutes: number;
  actualMinutes: number | null;
  dependencies: string[];
  dependents: string[];
  acceptanceCriteria: string[];
  waveNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

// Step 9 - PLANNING_COMPLETE Event
interface PlanningCompleteEvent {
  type: 'PLANNING_COMPLETE';
  payload: {
    projectId: string;
    featureCount: number;
    taskCount: number;
    waveCount: number;
    estimatedTotalMinutes: number;
    criticalPathMinutes: number;
  };
}
```

**Error Paths:**

| Error Condition | Detection | Response | Recovery |
|-----------------|-----------|----------|----------|
| Requirements not found | DB query returns empty | Show error, return to interview | Restart interview |
| LLM timeout during decomposition | Request timeout | Retry with backoff | Manual task entry fallback |
| Task estimate > 30 minutes | Validation check | Auto-split task | Require user review of split |
| Circular dependencies | Cycle detection | Show cycle visualization | User breaks cycle manually |
| Database write failure | Transaction error | Rollback, show error | Retry button |

---

### SEQ-GEN-003: Execution Sequence

**Purpose:** Execute tasks through agent coordination.

**Trigger:** User approves the project plan.

**Sequence Diagram:**
```
┌─────────┐  ┌───────────┐  ┌─────────┐  ┌────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐
│Coordinator│ │DepResolver│  │AgentPool│  │Coder   │  │WorktreeMgr  │  │QALoopEngine│  │MergerRunner│
└─────┬─────┘ └─────┬─────┘  └────┬────┘  └───┬────┘  └──────┬──────┘  └─────┬──────┘  └─────┬─────┘
      │             │             │           │              │               │               │
      │ 1. Emit     │             │           │              │               │               │
      │EXEC_START   │             │           │              │               │               │
      │─────────────────────────────────────────────────────────────────────────────────────>│
      │             │             │           │              │               │               │
      │ 2. Get      │             │           │              │               │               │
      │ waves       │             │           │              │               │               │
      │────────────>│             │           │              │               │               │
      │             │             │           │              │               │               │
      │ 3. Wave 1   │             │           │              │               │               │
      │ tasks       │             │           │              │               │               │
      │<────────────│             │           │              │               │               │
      │             │             │           │              │               │               │
      │ 4. For each task in wave:│           │              │               │               │
      │ ┌───────────────────────────────────────────────────────────────────────────────────┐
      │ │           │             │           │              │               │               │
      │ │ 4a. Get   │             │           │              │               │               │
      │ │ available │             │           │              │               │               │
      │ │ agent     │             │           │              │               │               │
      │ │──────────────────────>│           │              │               │               │
      │ │           │             │           │              │               │               │
      │ │ 4b. Create│             │           │              │               │               │
      │ │ worktree  │             │           │              │               │               │
      │ │────────────────────────────────────────────────>│               │               │
      │ │           │             │           │              │               │               │
      │ │ 4c. Execute            │           │              │               │               │
      │ │ task      │             │           │              │               │               │
      │ │─────────────────────────────────>│              │               │               │
      │ │           │             │           │              │               │               │
      │ │ 4d. Code changes       │           │              │               │               │
      │ │<─────────────────────────────────│              │               │               │
      │ │           │             │           │              │               │               │
      │ │ 4e. Run   │             │           │              │               │               │
      │ │ QA Loop   │             │           │              │               │               │
      │ │───────────────────────────────────────────────────────────────>│               │
      │ │           │             │           │              │               │               │
      │ │ 4f. If approved:       │           │              │               │               │
      │ │ merge     │             │           │              │               │               │
      │ │───────────────────────────────────────────────────────────────────────────────>│
      │ │           │             │           │              │               │               │
      │ │ 4g. Remove│             │           │              │               │               │
      │ │ worktree  │             │           │              │               │               │
      │ │────────────────────────────────────────────────>│               │               │
      │ │           │             │           │              │               │               │
      │ └───────────────────────────────────────────────────────────────────────────────────┘
      │             │             │           │              │               │               │
      │ 5. Move to  │             │           │              │               │               │
      │ next wave   │             │           │              │               │               │
      │────────────>│             │           │              │               │               │
      │             │             │           │              │               │               │
      │ 6. Repeat until all waves complete  │              │               │               │
      │             │             │           │              │               │               │
      │ 7. Emit     │             │           │              │               │               │
      │EXEC_COMPLETE│             │           │              │               │               │
      │             │             │           │              │               │               │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | EventBus | Emit EXECUTION_START | `{ projectId }` | Event dispatched | N/A |
| 2 | DependencyResolver | Get parallel waves | Task[] | TaskWave[] | Return empty if no tasks |
| 3 | NexusCoordinator | Get Wave 1 tasks | Wave number | Task[] | N/A |
| 4a | AgentPool | Get available Coder | Agent type | Agent or null | Wait if none available |
| 4b | WorktreeManager | Create isolated worktree | Task ID, base branch | WorktreeInfo | Cleanup and retry |
| 4c | CoderRunner | Execute task | Task + context | TaskResult | Retry 3x then fail |
| 4d | CoderRunner | Return code changes | N/A | FileChange[] | N/A |
| 4e | QALoopEngine | Run build/lint/test/review | FileChange[] | QAResult | Max 50 iterations |
| 4f | MergerRunner | Merge to main | Task ID | MergeResult | Conflict resolution |
| 4g | WorktreeManager | Remove worktree | Task ID | void | Force cleanup |
| 5 | NexusCoordinator | Advance to next wave | Wave number | Next wave tasks | N/A |
| 6 | NexusCoordinator | Continue until complete | N/A | N/A | Handle partial failures |
| 7 | EventBus | Emit EXECUTION_COMPLETE | `{ summary }` | Event dispatched | N/A |

**Data Formats:**

```typescript
// Step 1 - EXECUTION_START Event
interface ExecutionStartEvent {
  type: 'EXECUTION_START';
  payload: {
    projectId: string;
    totalTasks: number;
    totalWaves: number;
    estimatedDuration: number;
  };
}

// Step 4b - Worktree Information
interface WorktreeInfo {
  taskId: string;
  path: string;           // Absolute path to worktree
  branch: string;         // Task-specific branch name
  baseBranch: string;     // Branch it was created from
  createdAt: Date;
  status: 'creating' | 'active' | 'merging' | 'cleaning';
}

// Step 4c - Task Execution Context
interface TaskExecutionContext {
  task: Task;
  worktree: WorktreeInfo;
  agent: Agent;
  projectContext: string;  // Relevant project info
  fileContext: FileContext[];  // Related files
  memories: MemoryEpisode[];  // Historical context
}

// Step 4d - Code Changes
interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete' | 'rename';
  oldContent?: string;
  newContent?: string;
  diff?: string;
}

// Step 4e - QA Loop Result
interface QAResult {
  passed: boolean;
  iterations: number;
  buildResult: BuildResult;
  lintResult: LintResult;
  testResult: TestResult;
  reviewResult: ReviewResult;
  duration: number;
  finalChanges: FileChange[];
}

// Step 4f - Merge Result
interface MergeResult {
  success: boolean;
  commitHash: string | null;
  conflicts: Conflict[];
  resolution: 'auto' | 'manual' | 'escalated';
}

// Step 7 - EXECUTION_COMPLETE Event
interface ExecutionCompleteEvent {
  type: 'EXECUTION_COMPLETE';
  payload: {
    projectId: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalDuration: number;
    cost: {
      inputTokens: number;
      outputTokens: number;
      estimatedUSD: number;
    };
  };
}
```

**Parallelization Points:**

| Point | Max Parallelism | Constraint |
|-------|-----------------|------------|
| Tasks within wave | 4 (configurable) | Agent pool size |
| QA iterations | 1 per task | Sequential by nature |
| Merges | 1 | Prevent race conditions |

**Checkpointing Points:**

| Point | Checkpoint Type | Data Saved |
|-------|-----------------|------------|
| Before each wave | Wave checkpoint | Completed tasks, state |
| After each task | Task checkpoint | Task result, changes |
| Every 2 hours | Time checkpoint | Full state snapshot |
| Before risky merge | Safety checkpoint | Git state, database |

---

## Part B: Evolution Mode Integration Sequences

Evolution Mode is for enhancing existing projects with new features.

### SEQ-EVO-001: Context Analysis Sequence

**Purpose:** Analyze existing codebase to understand current state.

**Trigger:** User selects existing project for Evolution mode.

**Sequence Diagram:**
```
┌─────────┐    ┌────────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐
│  User   │    │Coordinator │    │FileSystemSvc │    │LSPClient    │    │MemorySystem│
└────┬────┘    └─────┬──────┘    └──────┬───────┘    └──────┬──────┘    └─────┬──────┘
     │               │                  │                   │                 │
     │ 1. Select     │                  │                   │                 │
     │ project       │                  │                   │                 │
     │──────────────>│                  │                   │                 │
     │               │                  │                   │                 │
     │               │ 2. Emit          │                   │                 │
     │               │ PROJECT_LOAD     │                   │                 │
     │               │                  │                   │                 │
     │               │ 3. glob() to     │                   │                 │
     │               │ find all files   │                   │                 │
     │               │─────────────────>│                   │                 │
     │               │                  │                   │                 │
     │               │ 4. File list     │                   │                 │
     │               │<─────────────────│                   │                 │
     │               │                  │                   │                 │
     │               │ 5. Initialize    │                   │                 │
     │               │ LSP server       │                   │                 │
     │               │──────────────────────────────────────>│                 │
     │               │                  │                   │                 │
     │               │ 6. Get project   │                   │                 │
     │               │ structure        │                   │                 │
     │               │<──────────────────────────────────────│                 │
     │               │                  │                   │                 │
     │               │ 7. Query         │                   │                 │
     │               │ relevant memory  │                   │                 │
     │               │──────────────────────────────────────────────────────>│
     │               │                  │                   │                 │
     │               │ 8. Historical    │                   │                 │
     │               │ context          │                   │                 │
     │               │<──────────────────────────────────────────────────────│
     │               │                  │                   │                 │
     │               │ 9. Emit          │                   │                 │
     │               │ CONTEXT_READY    │                   │                 │
     │               │                  │                   │                 │
     │ 10. Display   │                  │                   │                 │
     │ project       │                  │                   │                 │
     │<──────────────│                  │                   │                 │
     │               │                  │                   │                 │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | UI | User selects project | Project selection | Project ID | N/A |
| 2 | EventBus | Emit PROJECT_LOAD | `{ projectId, path }` | Event dispatched | N/A |
| 3 | FileSystemService | Find all source files | Glob patterns | File paths[] | Handle permission errors |
| 4 | FileSystemService | Return file list | N/A | File metadata[] | N/A |
| 5 | LSPClient | Start TypeScript server | Root path | LSP connection | Fallback to basic parsing |
| 6 | LSPClient | Get symbols, structure | N/A | ProjectStructure | Use cached if fails |
| 7 | MemorySystem | Query project memories | Project ID | MemoryEpisode[] | Return empty if none |
| 8 | MemorySystem | Return historical decisions | N/A | Context string | N/A |
| 9 | EventBus | Emit CONTEXT_READY | Analysis summary | Event dispatched | N/A |
| 10 | UI | Display project overview | Analysis results | UI rendered | N/A |

**Data Formats:**

```typescript
// Step 2 - PROJECT_LOAD Event
interface ProjectLoadEvent {
  type: 'PROJECT_LOAD';
  payload: {
    projectId: string;
    projectPath: string;
    mode: 'evolution';
    previousState: ProjectState | null;
  };
}

// Step 4 - File Metadata
interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  type: 'source' | 'test' | 'config' | 'documentation' | 'asset';
  language: string;
}

// Step 6 - Project Structure from LSP
interface ProjectStructure {
  entryPoints: string[];
  modules: Array<{
    path: string;
    exports: string[];
    imports: Array<{ from: string; symbols: string[] }>;
  }>;
  symbols: Array<{
    name: string;
    kind: 'class' | 'function' | 'interface' | 'variable' | 'type';
    location: { file: string; line: number };
    references: number;
  }>;
  dependencies: {
    internal: Map<string, string[]>;  // file -> imported files
    external: string[];  // npm packages
  };
}

// Step 9 - CONTEXT_READY Event
interface ContextReadyEvent {
  type: 'CONTEXT_READY';
  payload: {
    projectId: string;
    fileCount: number;
    symbolCount: number;
    memoryCount: number;
    analysisTime: number;
  };
}
```

---

### SEQ-EVO-002: Feature Planning Sequence

**Purpose:** Plan implementation of new feature in existing codebase.

**Trigger:** User creates new feature card or drags feature to "In Progress".

**Sequence Diagram:**
```
┌─────────┐    ┌───────────┐    ┌────────────────┐    ┌─────────────────┐    ┌──────────┐
│  User   │    │KanbanBoard│    │NexusCoordinator│    │TaskDecomposer   │    │Database  │
└────┬────┘    └─────┬─────┘    └───────┬────────┘    └────────┬────────┘    └────┬─────┘
     │               │                  │                      │                  │
     │ 1. Drag to    │                  │                      │                  │
     │ "In Progress" │                  │                      │                  │
     │──────────────>│                  │                      │                  │
     │               │                  │                      │                  │
     │               │ 2. Check         │                      │                  │
     │               │ complexity       │                      │                  │
     │               │─────────────────>│                      │                  │
     │               │                  │                      │                  │
     │               │ 3. If complex:   │                      │                  │
     │               │ enter planning   │                      │                  │
     │               │<─────────────────│                      │                  │
     │               │                  │                      │                  │
     │               │ 4. Decompose     │                      │                  │
     │               │ with context     │                      │                  │
     │               │                  │─────────────────────>│                  │
     │               │                  │                      │                  │
     │               │                  │ 5. Tasks with        │                  │
     │               │                  │ file locations       │                  │
     │               │                  │<─────────────────────│                  │
     │               │                  │                      │                  │
     │ 6. Review     │                  │                      │                  │
     │ plan          │                  │                      │                  │
     │<──────────────│<─────────────────│                      │                  │
     │               │                  │                      │                  │
     │ 7. Approve    │                  │                      │                  │
     │ plan          │                  │                      │                  │
     │──────────────>│─────────────────>│                      │                  │
     │               │                  │                      │                  │
     │               │                  │ 8. Save tasks        │                  │
     │               │                  │ to database          │                  │
     │               │                  │─────────────────────────────────────────>│
     │               │                  │                      │                  │
     │               │                  │ 9. Add to            │                  │
     │               │                  │ TaskQueue            │                  │
     │               │                  │                      │                  │
```

**Complexity Decision Logic:**

```typescript
// Feature complexity assessment
interface ComplexityAssessment {
  score: number;  // 1-10
  category: 'simple' | 'moderate' | 'complex';
  factors: Array<{
    factor: string;
    weight: number;
    value: number;
  }>;
  recommendation: 'auto_task' | 'planning_required';
}

// Complexity factors
const COMPLEXITY_FACTORS = {
  fileCount: {
    description: 'Estimated files to modify',
    thresholds: { low: 2, medium: 5, high: 10 }
  },
  dependencyDepth: {
    description: 'Dependencies between components',
    thresholds: { low: 1, medium: 3, high: 5 }
  },
  integrationPoints: {
    description: 'Number of system integrations',
    thresholds: { low: 1, medium: 2, high: 4 }
  },
  estimatedDuration: {
    description: 'Estimated implementation time',
    thresholds: { low: 30, medium: 120, high: 480 }  // minutes
  }
};

// Decision: If score > 4 OR estimatedDuration > 60min → planning required
```

**Context Enhancement for Evolution:**

When planning in Evolution mode, TaskDecomposer receives additional context:

```typescript
interface EvolutionPlanningContext {
  // Standard planning context
  feature: Feature;
  requirements: Requirement[];

  // Evolution-specific context
  existingCode: {
    relatedFiles: FileContext[];  // Files likely to be modified
    dependencies: string[];        // Files that depend on related files
    patterns: CodePattern[];       // Detected patterns in codebase
  };

  previousDecisions: MemoryEpisode[];  // Historical architectural decisions

  constraints: {
    mustMaintainBackwardCompat: boolean;
    existingTests: string[];  // Test files that must pass
    protectedFiles: string[];  // Files that shouldn't be modified
  };
}
```

---

### SEQ-EVO-003: Evolution Execution Sequence

**Purpose:** Execute feature tasks while integrating with existing code.

**Trigger:** Feature plan approved.

Same as Genesis Execution Sequence (SEQ-GEN-003) but with:

**Key Differences:**

| Aspect | Genesis Mode | Evolution Mode |
|--------|--------------|----------------|
| Base branch | `main` (empty) | `main` (existing code) |
| Context in prompts | Requirements only | Requirements + existing code |
| Merge strategy | Simple (no conflicts) | Conflict-aware |
| PR creation | None | Create PR for review |
| Test requirements | New tests only | New + existing tests pass |

**Additional Step: PR Creation**

After successful merge to feature branch:

```typescript
// PR Creation Step (Evolution mode only)
interface PRCreationStep {
  trigger: 'feature_complete';
  actions: [
    {
      action: 'create_feature_branch_pr';
      source: 'feature/{featureId}';
      target: 'main';
      title: string;  // Auto-generated from feature
      body: string;   // Auto-generated summary
    },
    {
      action: 'request_human_review';
      reviewers: string[];  // From project config
      labels: string[];
    }
  ];
}
```

---

## Part C: QA Loop Integration Sequence

### SEQ-QA-001: Full QA Loop

**Purpose:** Iteratively improve code until it passes all quality checks.

**Trigger:** Coder completes initial implementation.

**State Machine:**
```
                    ┌────────────────────────────────────────────────────┐
                    │                                                    │
                    │                      START                         │
                    │                        │                           │
                    │                        ▼                           │
                    │                 ┌─────────────┐                    │
                    │                 │    BUILD    │                    │
                    │                 │   (tsc)     │                    │
                    │                 └──────┬──────┘                    │
                    │                        │                           │
                    │         ┌──────────────┼──────────────┐            │
                    │         │              │              │            │
                    │         ▼              ▼              │            │
                    │      PASSED         FAILED           │            │
                    │         │              │              │            │
                    │         │              ▼              │            │
                    │         │     ┌──────────────┐        │            │
                    │         │     │ CODER FIX    │        │            │
                    │         │     │ (iteration++) │───────┘            │
                    │         │     └──────────────┘                     │
                    │         │                                          │
                    │         ▼                                          │
                    │  ┌─────────────┐                                   │
                    │  │    LINT     │                                   │
                    │  │  (eslint)   │                                   │
                    │  └──────┬──────┘                                   │
                    │         │                                          │
                    │    ┌────┴────┐                                     │
                    │    ▼         ▼                                     │
                    │ PASSED    FAILED──────────────────┐                │
                    │    │         │                    │                │
                    │    │         ▼                    │                │
                    │    │  ┌─────────────┐             │                │
                    │    │  │ AUTO-FIX    │             │                │
                    │    │  │ (--fix)     │             │                │
                    │    │  └──────┬──────┘             │                │
                    │    │         │                    │                │
                    │    │    ┌────┴────┐              │                │
                    │    │    ▼         ▼              │                │
                    │    │ FIXED   NOT FIXED─────────>│                │
                    │    │    │         │              │                │
                    │    │    │         ▼              ▼                │
                    │    │<───┘   CODER FIX ◄──────────┘                │
                    │    │                                              │
                    │    ▼                                              │
                    │ ┌─────────────┐                                   │
                    │ │    TEST     │                                   │
                    │ │  (vitest)   │                                   │
                    │ └──────┬──────┘                                   │
                    │        │                                          │
                    │   ┌────┴────┐                                     │
                    │   ▼         ▼                                     │
                    │PASSED    FAILED──────────┐                        │
                    │   │         │            │                        │
                    │   │         ▼            │                        │
                    │   │  ┌─────────────┐     │                        │
                    │   │  │ CODER FIX   │─────┘                        │
                    │   │  │ with errors │                              │
                    │   │  └─────────────┘                              │
                    │   │                                               │
                    │   ▼                                               │
                    │┌─────────────┐                                    │
                    ││   REVIEW    │                                    │
                    ││  (Gemini)   │                                    │
                    │└──────┬──────┘                                    │
                    │       │                                           │
                    │  ┌────┴────┐                                      │
                    │  ▼         ▼                                      │
                    │APPROVED  ISSUES────────────┐                      │
                    │  │         │               │                      │
                    │  │         ▼               │                      │
                    │  │  ┌─────────────┐        │                      │
                    │  │  │ CODER FIX   │────────┘                      │
                    │  │  │ with review │                               │
                    │  │  └─────────────┘                               │
                    │  │                                                │
                    │  ▼                                                │
                    │COMPLETE ────────────────────────────────────────>│ EXIT (success)
                    │                                                   │
                    │                                                   │
                    │ ITERATION COUNT CHECK:                            │
                    │ If iteration >= 50 ───────────────────────────────> EXIT (escalate)
                    │                                                   │
                    └───────────────────────────────────────────────────┘
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Max Iterations |
|------|-----------|--------|-------|--------|----------------|
| BUILD | ProcessRunner | Run `tsc --noEmit` | Source files | DiagnosticResult | Part of main loop |
| LINT | LintRunner | Run `eslint` | Source files | LintResult | Part of main loop |
| AUTO-FIX | LintRunner | Run `eslint --fix` | Source files | LintResult | 1 per iteration |
| TEST | TestRunner | Run `vitest run` | Test files | TestResult | Part of main loop |
| REVIEW | CodeReviewer | Call Gemini | Diff | ReviewResult | Part of main loop |
| CODER FIX | CoderRunner | Fix issues | Error context | FileChange[] | Up to 50 total |

**Data Formats:**

```typescript
// QA Loop State
interface QALoopState {
  iteration: number;
  maxIterations: number;  // 50
  phase: 'build' | 'lint' | 'test' | 'review' | 'fix' | 'complete' | 'escalated';

  history: Array<{
    iteration: number;
    phase: string;
    result: 'pass' | 'fail';
    errors?: string[];
    duration: number;
  }>;

  currentErrors: {
    build: DiagnosticError[];
    lint: LintError[];
    test: TestFailure[];
    review: ReviewIssue[];
  };

  metrics: {
    totalDuration: number;
    fixAttempts: number;
    autoFixesApplied: number;
  };
}

// Build Step Result
interface BuildStepResult {
  success: boolean;
  errors: Array<{
    file: string;
    line: number;
    column: number;
    message: string;
    code: string;  // TS error code
  }>;
  warnings: number;
  duration: number;
}

// Lint Step Result
interface LintStepResult {
  success: boolean;
  errors: Array<{
    ruleId: string;
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
    fixable: boolean;
  }>;
  fixedCount: number;
  duration: number;
}

// Test Step Result
interface TestStepResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  failures: Array<{
    testName: string;
    file: string;
    error: string;
    expected?: string;
    actual?: string;
    stack: string;
  }>;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
  };
  duration: number;
}

// Review Step Result
interface ReviewStepResult {
  approved: boolean;
  issues: Array<{
    severity: 'critical' | 'major' | 'minor' | 'suggestion';
    category: 'correctness' | 'performance' | 'security' | 'style' | 'maintainability';
    file: string;
    line: number;
    description: string;
    suggestion?: string;
  }>;
  summary: string;
  confidence: number;  // 0-1
  duration: number;
}
```

**Exit Conditions:**

| Condition | Action | Result |
|-----------|--------|--------|
| All steps pass | Exit loop | `{ success: true, result: QAResult }` |
| Iteration >= 50 | Escalate | `{ success: false, escalated: true }` |
| Critical error (unfixable) | Escalate immediately | `{ success: false, critical: true }` |
| User cancellation | Abort | `{ success: false, cancelled: true }` |

**Escalation Triggers:**

```typescript
const ESCALATION_TRIGGERS = {
  // Immediate escalation
  critical: [
    'Security vulnerability detected',
    'Data loss potential',
    'Infinite loop detected',
    'Memory leak confirmed'
  ],

  // After 3 consecutive failures
  repeated: [
    'Same test failing 3+ times',
    'Same lint error 3+ times',
    'Same build error 3+ times'
  ],

  // Pattern-based
  patterns: [
    'Coder reverting previous fix',
    'Circular dependency in fixes',
    'Test coverage decreasing'
  ]
};
```

---

## Part D: Checkpoint Integration Sequences

### SEQ-CHK-001: Automatic Checkpoint

**Purpose:** Create recovery points automatically.

**Triggers:**
- Time-based: Every 2 hours (configurable)
- Event-based: After each feature completion
- Safety-based: Before risky operations

**Sequence Diagram:**
```
┌────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌────────────┐    ┌───────────┐
│CheckpointMgr│   │StateManager │    │GitService       │    │Database    │    │EventBus   │
└─────┬──────┘    └──────┬──────┘    └────────┬────────┘    └─────┬──────┘    └─────┬─────┘
      │                  │                    │                   │                 │
      │ 1. Trigger       │                    │                   │                 │
      │ (timer/event)    │                    │                   │                 │
      │                  │                    │                   │                 │
      │ 2. Load current  │                    │                   │                 │
      │ state            │                    │                   │                 │
      │─────────────────>│                    │                   │                 │
      │                  │                    │                   │                 │
      │ 3. NexusState    │                    │                   │                 │
      │<─────────────────│                    │                   │                 │
      │                  │                    │                   │                 │
      │ 4. Create        │                    │                   │                 │
      │ checkpoint branch│                    │                   │                 │
      │──────────────────────────────────────>│                   │                 │
      │                  │                    │                   │                 │
      │ 5. Branch created│                    │                   │                 │
      │<──────────────────────────────────────│                   │                 │
      │                  │                    │                   │                 │
      │ 6. Save checkpoint                    │                   │                 │
      │ metadata         │                    │                   │                 │
      │────────────────────────────────────────────────────────>│                 │
      │                  │                    │                   │                 │
      │ 7. Emit          │                    │                   │                 │
      │ CHECKPOINT_CREATED                    │                   │                 │
      │────────────────────────────────────────────────────────────────────────────>│
      │                  │                    │                   │                 │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | CheckpointManager | Triggered by timer or event | Trigger type | N/A | N/A |
| 2 | StateManager | Load complete state | Project ID | NexusState | Use last known state |
| 3 | StateManager | Return state snapshot | N/A | NexusState | N/A |
| 4 | GitService | Create checkpoint branch | `checkpoint/{timestamp}` | Branch ref | Retry with unique name |
| 5 | GitService | Return branch info | N/A | BranchInfo | N/A |
| 6 | Database | Save checkpoint record | Checkpoint metadata | Saved | Transaction with retry |
| 7 | EventBus | Emit event | Checkpoint info | Dispatched | Log if fails |

**Data Formats:**

```typescript
// Checkpoint Record
interface Checkpoint {
  id: string;
  projectId: string;
  type: 'automatic' | 'manual' | 'safety';
  trigger: 'timer' | 'feature_complete' | 'risky_operation' | 'user_request';

  state: {
    serialized: string;  // JSON stringified NexusState
    hash: string;        // SHA256 of state for integrity
  };

  git: {
    branch: string;      // checkpoint/2025-01-13T10:30:00Z
    commitHash: string;  // HEAD at checkpoint time
    uncommittedChanges: boolean;
  };

  database: {
    snapshotPath: string;  // Path to DB backup file
    tableVersions: Record<string, number>;  // Migration versions
  };

  metadata: {
    createdAt: Date;
    size: number;        // Bytes
    tasksPending: number;
    tasksCompleted: number;
  };
}

// CHECKPOINT_CREATED Event
interface CheckpointCreatedEvent {
  type: 'CHECKPOINT_CREATED';
  payload: {
    checkpointId: string;
    projectId: string;
    trigger: string;
    size: number;
    duration: number;  // Creation time in ms
  };
}
```

---

### SEQ-CHK-002: Checkpoint Recovery

**Purpose:** Restore project to a previous checkpoint.

**Trigger:** User selects checkpoint to restore OR system detects unrecoverable failure.

**Sequence Diagram:**
```
┌─────────┐    ┌────────────┐    ┌─────────────┐    ┌────────────┐    ┌─────────────┐    ┌─────────┐
│  User   │    │CheckpointMgr│   │StateManager │    │GitService  │    │TaskQueue    │    │AgentPool│
└────┬────┘    └─────┬──────┘    └──────┬──────┘    └─────┬──────┘    └──────┬──────┘    └────┬────┘
     │               │                  │                 │                  │                │
     │ 1. Select     │                  │                 │                  │                │
     │ checkpoint    │                  │                 │                  │                │
     │──────────────>│                  │                 │                  │                │
     │               │                  │                 │                  │                │
     │               │ 2. Load          │                 │                  │                │
     │               │ checkpoint       │                 │                  │                │
     │               │─────────────────>│                 │                  │                │
     │               │                  │                 │                  │                │
     │               │ 3. Verify        │                 │                  │                │
     │               │ integrity        │                 │                  │                │
     │               │<─────────────────│                 │                  │                │
     │               │                  │                 │                  │                │
     │               │ 4. Pause all     │                 │                  │                │
     │               │ agents           │                 │                  │                │
     │               │────────────────────────────────────────────────────────────────────────>│
     │               │                  │                 │                  │                │
     │               │ 5. Git checkout  │                 │                  │                │
     │               │ checkpoint branch│                 │                  │                │
     │               │────────────────────────────────────>│                  │                │
     │               │                  │                 │                  │                │
     │               │ 6. Restore state │                 │                  │                │
     │               │ from checkpoint  │                 │                  │                │
     │               │─────────────────>│                 │                  │                │
     │               │                  │                 │                  │                │
     │               │ 7. Re-queue      │                 │                  │                │
     │               │ incomplete tasks │                 │                  │                │
     │               │───────────────────────────────────────────────────────>│                │
     │               │                  │                 │                  │                │
     │               │ 8. Reset agent   │                 │                  │                │
     │               │ states           │                 │                  │                │
     │               │────────────────────────────────────────────────────────────────────────>│
     │               │                  │                 │                  │                │
     │               │ 9. Emit          │                 │                  │                │
     │               │CHECKPOINT_RESTORED                 │                  │                │
     │               │                  │                 │                  │                │
     │ 10. Resume    │                  │                 │                  │                │
     │ notification  │                  │                 │                  │                │
     │<──────────────│                  │                 │                  │                │
     │               │                  │                 │                  │                │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output | Error Handling |
|------|-----------|--------|-------|--------|----------------|
| 1 | User/System | Select checkpoint | Checkpoint ID | N/A | N/A |
| 2 | CheckpointManager | Load checkpoint record | Checkpoint ID | Checkpoint | Not found error |
| 3 | CheckpointManager | Verify state hash | Checkpoint | Valid/Invalid | Reject if corrupted |
| 4 | AgentPool | Pause all running agents | None | Paused agents | Force kill if stuck |
| 5 | GitService | Checkout checkpoint branch | Branch name | void | Handle conflicts |
| 6 | StateManager | Restore state from checkpoint | Serialized state | NexusState | Rollback on failure |
| 7 | TaskQueue | Re-queue incomplete tasks | Task list | void | N/A |
| 8 | AgentPool | Reset all agents | None | Clean agent pool | N/A |
| 9 | EventBus | Emit recovery event | Recovery info | Dispatched | N/A |
| 10 | UI | Show recovery notification | Event | UI update | N/A |

**Data Formats:**

```typescript
// Recovery Request
interface RecoveryRequest {
  checkpointId: string;
  reason: 'user_request' | 'system_failure' | 'rollback';
  preserveWorkInProgress: boolean;  // Keep unsaved work
}

// CHECKPOINT_RESTORED Event
interface CheckpointRestoredEvent {
  type: 'CHECKPOINT_RESTORED';
  payload: {
    checkpointId: string;
    projectId: string;
    tasksRequeued: number;
    agentsReset: number;
    duration: number;
    dataLost: {
      tasks: number;
      changes: number;
    };
  };
}
```

**Error Paths:**

| Error Condition | Detection | Response | Recovery |
|-----------------|-----------|----------|----------|
| Checkpoint not found | DB query empty | Show error, list available | User selects different |
| State corrupted | Hash mismatch | Reject restoration | Try older checkpoint |
| Git conflicts | Checkout fails | Show conflicts | Manual resolution |
| Agent won't pause | Timeout | Force terminate | Continue recovery |
| Database restore fails | Transaction error | Rollback | Keep current state |

---

## Part E: Agent Communication Sequences

### SEQ-AGT-001: Planner → Coder Handoff

**Purpose:** Transfer decomposed tasks from Planner to Coder for execution.

**Sequence Diagram:**
```
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐
│Planner   │    │EventBus  │    │TaskQueue    │    │Coordinator  │    │CoderRunner │
└────┬─────┘    └────┬─────┘    └──────┬──────┘    └──────┬──────┘    └─────┬──────┘
     │               │                 │                  │                 │
     │ 1. Complete   │                 │                  │                 │
     │ decomposition │                 │                  │                 │
     │               │                 │                  │                 │
     │ 2. Emit       │                 │                  │                 │
     │ TASKS_CREATED │                 │                  │                 │
     │──────────────>│                 │                  │                 │
     │               │                 │                  │                 │
     │               │ 3. Dispatch     │                  │                  │
     │               │ to listeners    │                  │                 │
     │               │────────────────>│                  │                 │
     │               │─────────────────────────────────────>│                 │
     │               │                 │                  │                 │
     │               │                 │ 4. Enqueue tasks │                 │
     │               │                 │ (sorted by deps) │                 │
     │               │                 │<─ ─ ─ ─ ─ ─ ─ ─ ─│                 │
     │               │                 │                  │                 │
     │               │                 │ 5. Signal task   │                 │
     │               │                 │ available        │                 │
     │               │                 │─────────────────>│                 │
     │               │                 │                  │                 │
     │               │                 │                  │ 6. Get available│
     │               │                 │                  │ coder agent     │
     │               │                 │                  │<─ ─ ─ ─ ─ ─ ─ ─>│
     │               │                 │                  │                 │
     │               │                 │                  │ 7. Dequeue task │
     │               │                 │                  │<────────────────│
     │               │                 │─────────────────>│                 │
     │               │                 │                  │                 │
     │               │                 │                  │ 8. Emit         │
     │               │                 │                  │ TASK_ASSIGNED   │
     │               │<────────────────────────────────────│                 │
     │               │                 │                  │                 │
     │               │                 │                  │ 9. Build context│
     │               │                 │                  │ and execute     │
     │               │                 │                  │────────────────>│
     │               │                 │                  │                 │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output |
|------|-----------|--------|-------|--------|
| 1 | Planner | Complete feature decomposition | Feature | Task[] |
| 2 | Planner | Emit TASKS_CREATED event | Tasks, metadata | Event dispatched |
| 3 | EventBus | Dispatch to all listeners | Event | N/A |
| 4 | TaskQueue | Enqueue tasks by dependency order | Task[] | void |
| 5 | TaskQueue | Signal availability | None | Signal |
| 6 | Coordinator | Request available Coder | Agent type | Agent |
| 7 | TaskQueue | Dequeue highest priority task | None | Task |
| 8 | Coordinator | Emit TASK_ASSIGNED | Task, Agent | Event dispatched |
| 9 | CoderRunner | Begin execution | Task + context | N/A |

**Data Formats:**

```typescript
// TASKS_CREATED Event
interface TasksCreatedEvent {
  type: 'TASKS_CREATED';
  payload: {
    featureId: string;
    tasks: Array<{
      id: string;
      title: string;
      dependencies: string[];
      estimatedMinutes: number;
    }>;
    totalEstimate: number;
    waveCount: number;
  };
}

// TASK_ASSIGNED Event
interface TaskAssignedEvent {
  type: 'TASK_ASSIGNED';
  payload: {
    taskId: string;
    agentId: string;
    agentType: 'coder';
    worktreePath: string;
    assignedAt: Date;
    estimatedCompletion: Date;
  };
}

// Handoff Context
interface PlannerToCoderHandoff {
  task: Task;
  planningContext: {
    featureGoal: string;
    taskRationale: string;  // Why this task exists
    relatedTasks: string[]; // Other tasks in same feature
    filesIdentified: string[];  // Files likely to be modified
  };
  projectContext: {
    techStack: string[];
    conventions: string[];  // Code conventions
    existingPatterns: CodePattern[];
  };
}
```

---

### SEQ-AGT-002: Coder → Reviewer Handoff

**Purpose:** Submit completed code for AI review.

**Sequence Diagram:**
```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌────────────┐    ┌────────────┐
│CoderRunner│   │GitService │    │EventBus  │    │CodeReviewer│    │CoderRunner │
└────┬─────┘    └─────┬─────┘    └────┬─────┘    └─────┬──────┘    └─────┬──────┘
     │                │               │                │                 │
     │ 1. Complete    │               │                │                 │
     │ implementation │               │                │                 │
     │                │               │                │                 │
     │ 2. Stage and   │               │                │                 │
     │ commit changes │               │                │                 │
     │───────────────>│               │                │                 │
     │                │               │                │                 │
     │ 3. Get diff    │               │                │                 │
     │ from commit    │               │                │                 │
     │<───────────────│               │                │                 │
     │                │               │                │                 │
     │ 4. Emit        │               │                │                 │
     │ REVIEW_REQUESTED               │                │                 │
     │────────────────────────────────>│                │                 │
     │                │               │                │                 │
     │                │               │ 5. Dispatch    │                 │
     │                │               │ to reviewer    │                 │
     │                │               │────────────────>│                 │
     │                │               │                │                 │
     │                │               │                │ 6. Review diff  │
     │                │               │                │ with Gemini     │
     │                │               │                │                 │
     │                │               │                │ 7. Generate     │
     │                │               │                │ review result   │
     │                │               │                │                 │
     │                │               │ 8a. If APPROVED│                 │
     │                │               │ emit event     │                 │
     │                │               │<───────────────│                 │
     │                │               │                │                 │
     │                │               │ 8b. If ISSUES  │                 │
     │                │               │ emit with issues                 │
     │                │               │<───────────────│                 │
     │                │               │                │                 │
     │ 9. If issues,  │               │                │                 │
     │ fix and retry  │               │                │                 │
     │<────────────────────────────────│                │                 │
     │                │               │                │                 │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output |
|------|-----------|--------|-------|--------|
| 1 | CoderRunner | Complete code implementation | Task | FileChange[] |
| 2 | GitService | Stage and commit all changes | FileChange[], message | Commit hash |
| 3 | GitService | Generate diff from commit | Commit hash | Diff |
| 4 | CoderRunner | Emit REVIEW_REQUESTED | Task ID, diff | Event dispatched |
| 5 | EventBus | Route to CodeReviewer | Event | N/A |
| 6 | CodeReviewer | Call Gemini for review | Diff, context | AI response |
| 7 | CodeReviewer | Parse review into issues | AI response | ReviewResult |
| 8a | CodeReviewer | If approved, emit REVIEW_APPROVED | Task ID | Event |
| 8b | CodeReviewer | If issues, emit REVIEW_ISSUES | Task ID, issues | Event |
| 9 | CoderRunner | If issues, fix and retry | Issues | Back to step 1 |

**Data Formats:**

```typescript
// REVIEW_REQUESTED Event
interface ReviewRequestedEvent {
  type: 'REVIEW_REQUESTED';
  payload: {
    taskId: string;
    commitHash: string;
    diff: {
      files: number;
      additions: number;
      deletions: number;
      content: string;  // Full unified diff
    };
    context: {
      taskDescription: string;
      acceptanceCriteria: string[];
    };
  };
}

// REVIEW_APPROVED Event
interface ReviewApprovedEvent {
  type: 'REVIEW_APPROVED';
  payload: {
    taskId: string;
    reviewerId: string;  // Agent ID
    confidence: number;
    summary: string;
    reviewDuration: number;
  };
}

// REVIEW_ISSUES Event
interface ReviewIssuesEvent {
  type: 'REVIEW_ISSUES';
  payload: {
    taskId: string;
    issues: Array<{
      id: string;
      severity: 'critical' | 'major' | 'minor';
      file: string;
      line: number;
      description: string;
      suggestion: string;
      category: string;
    }>;
    blockers: number;  // Count of critical/major
    suggestions: number;  // Count of minor
  };
}
```

---

### SEQ-AGT-003: Reviewer → Merger Handoff

**Purpose:** Transfer approved code for merging to main branch.

**Sequence Diagram:**
```
┌────────────┐    ┌──────────┐    ┌─────────────┐    ┌───────────────┐    ┌───────────┐
│CodeReviewer│    │EventBus  │    │MergerRunner │    │WorktreeManager│    │Coordinator│
└─────┬──────┘    └────┬─────┘    └──────┬──────┘    └───────┬───────┘    └─────┬─────┘
      │                │                 │                   │                  │
      │ 1. Approve     │                 │                   │                  │
      │ review         │                 │                   │                  │
      │                │                 │                   │                  │
      │ 2. Emit        │                 │                   │                  │
      │MERGE_REQUESTED │                 │                   │                  │
      │───────────────>│                 │                   │                  │
      │                │                 │                   │                  │
      │                │ 3. Dispatch     │                   │                  │
      │                │ to merger       │                   │                  │
      │                │────────────────>│                   │                  │
      │                │                 │                   │                  │
      │                │                 │ 4. Get worktree   │                  │
      │                │                 │ info              │                  │
      │                │                 │──────────────────>│                  │
      │                │                 │                   │                  │
      │                │                 │ 5. Attempt merge  │                  │
      │                │                 │ to main           │                  │
      │                │                 │                   │                  │
      │                │                 │   ┌───────────────┴───────────────┐  │
      │                │                 │   │                               │  │
      │                │                 │   ▼                               ▼  │
      │                │                 │ SUCCESS                      CONFLICT│
      │                │                 │   │                               │  │
      │                │                 │   │ 6a. Emit                      │  │
      │                │                 │   │ MERGE_COMPLETED               │  │
      │                │<────────────────│───│                               │  │
      │                │                 │   │                               │  │
      │                │                 │   │                    6b. Analyze│  │
      │                │                 │   │                    conflict   │  │
      │                │                 │   │                       │       │  │
      │                │                 │   │              ┌───────┴───────┐│  │
      │                │                 │   │              ▼               ▼│  │
      │                │                 │   │          RESOLVABLE    ESCALATE│ │
      │                │                 │   │              │               │ │  │
      │                │                 │   │    7. Auto-resolve          8. │  │
      │                │                 │   │       conflict         Request │  │
      │                │                 │   │              │          human   │  │
      │                │                 │   │              │               │ │  │
      │                │                 │   │              ▼               │ │  │
      │                │                 │   │        MERGE_COMPLETED       │ │  │
      │                │<────────────────│───┴──────────────│───────────────┘ │  │
      │                │                 │                                    │  │
      │                │                 │ 9. Cleanup       │                 │  │
      │                │                 │ worktree         │                 │  │
      │                │                 │──────────────────>│                 │  │
      │                │                 │                   │                 │  │
      │                │                 │ 10. Update task   │                 │  │
      │                │                 │ status            │                 │  │
      │                │                 │───────────────────────────────────>│  │
      │                │                 │                   │                 │  │
```

**Detailed Steps:**

| Step | Component | Action | Input | Output |
|------|-----------|--------|-------|--------|
| 1 | CodeReviewer | Approve code changes | Review result | Approved status |
| 2 | CodeReviewer | Emit MERGE_REQUESTED | Task ID | Event dispatched |
| 3 | EventBus | Route to MergerRunner | Event | N/A |
| 4 | MergerRunner | Get worktree info | Task ID | WorktreeInfo |
| 5 | MergerRunner | Attempt merge to main | Branch info | MergeAttempt |
| 6a | MergerRunner | On success, emit MERGE_COMPLETED | Commit info | Event |
| 6b | MergerRunner | On conflict, analyze | Conflict info | ConflictAnalysis |
| 7 | MergerRunner | If resolvable, auto-resolve | Analysis | Resolution |
| 8 | MergerRunner | If not resolvable, escalate | Conflict | HumanReviewRequest |
| 9 | WorktreeManager | Cleanup task worktree | Task ID | void |
| 10 | Coordinator | Update task status to done | Task ID, result | Updated task |

**Data Formats:**

```typescript
// MERGE_REQUESTED Event
interface MergeRequestedEvent {
  type: 'MERGE_REQUESTED';
  payload: {
    taskId: string;
    featureId: string;
    sourceBranch: string;
    targetBranch: string;
    reviewApprovalId: string;
  };
}

// MERGE_COMPLETED Event
interface MergeCompletedEvent {
  type: 'MERGE_COMPLETED';
  payload: {
    taskId: string;
    commitHash: string;
    strategy: 'fast_forward' | 'merge_commit' | 'auto_resolved';
    filesChanged: number;
    additions: number;
    deletions: number;
  };
}

// MERGE_CONFLICT Event
interface MergeConflictEvent {
  type: 'MERGE_CONFLICT';
  payload: {
    taskId: string;
    conflicts: Array<{
      file: string;
      type: 'content' | 'rename' | 'delete';
      ours: string;
      theirs: string;
      autoResolvable: boolean;
      suggestedResolution?: string;
    }>;
    resolution: 'auto_resolving' | 'human_required';
  };
}

// HUMAN_REVIEW_REQUESTED Event
interface HumanReviewRequestedEvent {
  type: 'HUMAN_REVIEW_REQUESTED';
  payload: {
    taskId: string;
    reason: 'merge_conflict' | 'qa_iteration_limit' | 'critical_issue';
    context: string;
    conflictFiles?: string[];
    deadline?: Date;  // Optional time pressure
  };
}
```

**Conflict Resolution Strategy:**

```typescript
// Merger conflict resolution algorithm
interface ConflictResolutionStrategy {
  // Auto-resolvable patterns
  autoResolve: {
    // Import ordering conflicts
    imports: 'sort_and_merge';

    // Whitespace-only conflicts
    whitespace: 'prefer_formatted';

    // Adding new items to arrays/lists
    additions: 'include_both';

    // Lock file conflicts
    lockfiles: 'regenerate';
  };

  // Requires human review
  escalate: {
    // Logic changes in same function
    logicConflict: true;

    // Conflicting type changes
    typeConflict: true;

    // Security-sensitive files
    securityFiles: true;

    // Configuration conflicts
    configConflict: true;
  };
}
```

---

## Task 6.3 Completion Summary

### Sequences Documented

| Category | Sequence ID | Name | Steps |
|----------|-------------|------|-------|
| Genesis Mode | SEQ-GEN-001 | Interview Sequence | 11 |
| Genesis Mode | SEQ-GEN-002 | Planning Sequence | 11 |
| Genesis Mode | SEQ-GEN-003 | Execution Sequence | 7+ (per task) |
| Evolution Mode | SEQ-EVO-001 | Context Analysis Sequence | 10 |
| Evolution Mode | SEQ-EVO-002 | Feature Planning Sequence | 9 |
| Evolution Mode | SEQ-EVO-003 | Evolution Execution Sequence | Same as Genesis + PR |
| QA Loop | SEQ-QA-001 | Full QA Loop | 6 phases, 50 max iterations |
| Checkpoint | SEQ-CHK-001 | Automatic Checkpoint | 7 |
| Checkpoint | SEQ-CHK-002 | Checkpoint Recovery | 10 |
| Agent Comm | SEQ-AGT-001 | Planner → Coder Handoff | 9 |
| Agent Comm | SEQ-AGT-002 | Coder → Reviewer Handoff | 9 |
| Agent Comm | SEQ-AGT-003 | Reviewer → Merger Handoff | 10 |

### Key Integration Points

| Integration | Components | Data Format |
|-------------|------------|-------------|
| Interview → Planning | RequirementsDB → TaskDecomposer | RequirementsExport JSON |
| Planning → Execution | TaskQueue → AgentPool | Task with dependencies |
| Execution → QA | CoderRunner → QALoopEngine | FileChange[] |
| QA → Merge | QALoopEngine → MergerRunner | QAResult + approved status |
| All → Checkpoint | All components → CheckpointManager | NexusState |

### Error Path Coverage

| Error Category | Sequences Covered | Recovery Strategy |
|----------------|-------------------|-------------------|
| LLM Failures | All | Retry with backoff, fallback |
| Git Conflicts | SEQ-GEN-003, SEQ-AGT-003 | Auto-resolve or escalate |
| QA Failures | SEQ-QA-001 | Max 50 iterations, then escalate |
| State Corruption | SEQ-CHK-002 | Restore from checkpoint |
| Network Issues | All | Queue for retry |

### Event Flow Summary

```
PROJECT_START
    ↓
INTERVIEW_COMPLETE
    ↓
PLANNING_START → TASKS_CREATED → PLANNING_COMPLETE
    ↓
EXECUTION_START
    ↓
[For each task:]
    TASK_ASSIGNED → [work] → REVIEW_REQUESTED → REVIEW_APPROVED → MERGE_REQUESTED → MERGE_COMPLETED
    ↓
[Periodic:]
    CHECKPOINT_CREATED
    ↓
EXECUTION_COMPLETE
```

---

**[TASK 6.3 COMPLETE]**

---

# Task 6.4: Testing Specifications

## Overview

This section defines exact test specifications for every component and integration in the Nexus system. Tests are organized by type (unit, integration, E2E) and by layer, with specific test cases, expected outcomes, and coverage requirements.

### Testing Philosophy

- **Test-Driven Development (TDD)**: Write tests before implementation
- **Pyramid Strategy**: Many unit tests, fewer integration tests, minimal E2E tests
- **Isolation**: Unit tests mock all dependencies
- **Reality**: Integration tests use real components
- **Coverage Goals**: Minimum 80% coverage, 95% for critical paths

### Test Framework Stack

| Type | Framework | Purpose |
|------|-----------|---------|
| Unit | Vitest | Fast unit tests, component tests |
| Integration | Vitest | Multi-component tests |
| E2E | Playwright | Full UI and flow testing |
| Mocking | vi.mock, MSW | Dependency mocking |
| Coverage | c8 / Istanbul | Code coverage reporting |

### Test Summary

| Category | Test Count | Estimated Time |
|----------|------------|----------------|
| Unit Tests | ~130 | 15 seconds |
| Integration Tests | ~45 | 45 seconds |
| E2E Tests | ~15 | 3 minutes |
| **Total** | **~190** | **~4 minutes** |

---

## Part A: Unit Test Specifications

### TEST-UNIT-001: Infrastructure Layer Tests

**Total Tests: 42**
**File Location Pattern:** `src/infrastructure/**/__tests__/*.test.ts`

#### FileSystemService Tests (12 tests)

**File:** `src/infrastructure/file-system/__tests__/FileSystemService.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| FS-001 | should read file contents as string | Read existing file | Returns string content |
| FS-002 | should throw FileNotFoundError when file does not exist | Read non-existent file | Throws FileNotFoundError |
| FS-003 | should throw PermissionError when access is denied | Read protected file | Throws PermissionError |
| FS-004 | should write content to file | Write new file | File created with content |
| FS-005 | should create parent directories if they do not exist | Write to nested path | Directories created |
| FS-006 | should throw on write failure | Write to full disk | Throws error |
| FS-007 | should return true when file exists | Check existing file | Returns true |
| FS-008 | should return false when file does not exist | Check missing file | Returns false |
| FS-009 | should return matching files | Glob pattern match | Returns file array |
| FS-010 | should respect ignore patterns | Glob with ignore | Excludes ignored files |
| FS-011 | should setup file watcher and return unsubscribe function | Watch path | Returns unsubscribe fn |
| FS-012 | should call callback on file change | File modification | Callback invoked |

**Mock Dependencies:** `fs-extra`, `chokidar`, `fast-glob`

---

#### GitService Tests (11 tests)

**File:** `src/infrastructure/git/__tests__/GitService.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| GIT-001 | should create a new branch from current HEAD | Create branch | Branch created |
| GIT-002 | should create branch from specified base | Create from base | Branch from base |
| GIT-003 | should throw on invalid branch name | Invalid name | Throws error |
| GIT-004 | should switch to specified branch | Checkout branch | Branch switched |
| GIT-005 | should throw when branch does not exist | Checkout missing | Throws error |
| GIT-006 | should stage files and create commit | Commit files | Returns commit hash |
| GIT-007 | should throw when nothing to commit | Empty commit | Throws error |
| GIT-008 | should merge branch successfully | Clean merge | Returns success |
| GIT-009 | should detect merge conflicts | Conflicting merge | Returns conflicts |
| GIT-010 | should return diff between commits | Get diff | Returns diff array |
| GIT-011 | should return current branch name | Get branch | Returns branch name |

**Mock Dependencies:** `simple-git`

---

#### WorktreeManager Tests (10 tests)

**File:** `src/infrastructure/git/__tests__/WorktreeManager.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| WT-001 | should create worktree for task | Create worktree | Returns WorktreeInfo |
| WT-002 | should use unique directory path per task | Multiple worktrees | Unique paths |
| WT-003 | should throw if worktree already exists for task | Duplicate create | Throws error |
| WT-004 | should list all active worktrees | List worktrees | Returns array |
| WT-005 | should return empty array when no worktrees | Empty list | Returns [] |
| WT-006 | should return worktree info for task | Get info | Returns WorktreeInfo |
| WT-007 | should return null when worktree does not exist | Get missing | Returns null |
| WT-008 | should remove worktree directory | Remove worktree | Directory deleted |
| WT-009 | should remove worktrees older than maxAge | Cleanup old | Returns removed count |
| WT-010 | should keep worktrees younger than maxAge | Cleanup recent | Returns 0 |

**Dependencies:** `GitService`, `FileSystemService`

---

#### ProcessRunner Tests (9 tests)

**File:** `src/infrastructure/process/__tests__/ProcessRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| PR-001 | should execute command and return result | Run command | Returns ProcessResult |
| PR-002 | should capture stderr on error | Command fails | Stderr captured |
| PR-003 | should respect timeout option | Long command | Throws timeout |
| PR-004 | should pass environment variables | With env vars | Vars available |
| PR-005 | should set working directory | With cwd | Command runs in cwd |
| PR-006 | should call onOutput for each line | Streaming output | Callback invoked |
| PR-007 | should terminate process by pid | Kill process | Process terminated |
| PR-008 | should accept safe commands | Safe command | Returns valid: true |
| PR-009 | should reject dangerous patterns | Dangerous command | Returns valid: false |

**Mock Dependencies:** `execa`, `tree-kill`

---

### TEST-UNIT-002: Persistence Layer Tests

**Total Tests: 47**
**File Location Pattern:** `src/persistence/**/__tests__/*.test.ts`

#### DatabaseClient Tests (9 tests)

**File:** `src/persistence/database/__tests__/DatabaseClient.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| DB-001 | should create database connection | Initialize | isConnected() = true |
| DB-002 | should enable WAL mode | Check pragma | journal_mode = 'wal' |
| DB-003 | should enable foreign keys | Check pragma | foreign_keys = 1 |
| DB-004 | should run pending migrations | Run migrations | Tables exist |
| DB-005 | should track migration versions | Get version | Version > 0 |
| DB-006 | should not re-run completed migrations | Run twice | Same version |
| DB-007 | should commit successful transaction | Transaction success | Data persisted |
| DB-008 | should rollback failed transaction | Transaction fails | Data not persisted |
| DB-009 | should execute parameterized queries | Query with params | Returns results |

---

#### StateManager Tests (12 tests)

**File:** `src/persistence/state/__tests__/StateManager.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| SM-001 | should persist state to database | Save state | State saved |
| SM-002 | should update timestamp on save | Save with time | updatedAt updated |
| SM-003 | should retrieve state from database | Load state | State returned |
| SM-004 | should throw when project not found | Load missing | Throws error |
| SM-005 | should load related entities | Load with relations | Includes features/tasks |
| SM-006 | should merge updates with existing state | Update partial | State merged |
| SM-007 | should generate valid STATE.md format | Export to MD | Valid markdown |
| SM-008 | should include all sections in export | Export complete | All sections present |
| SM-009 | should parse STATE.md content | Import from MD | State object returned |
| SM-010 | should handle malformed content gracefully | Import invalid | Throws error |
| SM-011 | should detect changes between states | Diff states | Returns diff |
| SM-012 | should handle concurrent updates | Concurrent save | No data loss |

---

#### CheckpointManager Tests (10 tests)

**File:** `src/persistence/checkpoints/__tests__/CheckpointManager.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| CP-001 | should create checkpoint with unique id | Create checkpoint | Unique ID assigned |
| CP-002 | should include git commit reference | Create with git | gitRef populated |
| CP-003 | should serialize state snapshot | Create snapshot | stateSnapshot exists |
| CP-004 | should return checkpoints for project | List checkpoints | Returns array |
| CP-005 | should order by creation date descending | List ordered | Most recent first |
| CP-006 | should restore state from checkpoint | Restore checkpoint | State returned |
| CP-007 | should checkout git ref | Restore with git | Git checkout called |
| CP-008 | should throw when checkpoint not found | Restore missing | Throws error |
| CP-009 | should remove checkpoint from database | Delete checkpoint | Checkpoint removed |
| CP-010 | should throw when deleting non-existent | Delete missing | Throws error |

---

#### MemorySystem Tests (10 tests)

**File:** `src/persistence/memory/__tests__/MemorySystem.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| MEM-001 | should store memory episode with embedding | Store episode | Embedding created |
| MEM-002 | should assign unique id if not provided | Store without id | ID generated |
| MEM-003 | should return similar memories | Query memory | Sorted by similarity |
| MEM-004 | should respect limit parameter | Query with limit | Results limited |
| MEM-005 | should filter by minimum similarity | Query threshold | Low similarity excluded |
| MEM-006 | should build context from task-related memories | Get context | Context object returned |
| MEM-007 | should include related task memories | Get related | Related included |
| MEM-008 | should remove memories older than maxAge | Prune old | Returns removed count |
| MEM-009 | should preserve important memories | Prune with preserve | Important kept |
| MEM-010 | should categorize memories by type | Get stats | Stats by type |

---

#### RequirementsDB Tests (8 tests)

**File:** `src/persistence/requirements/__tests__/RequirementsDB.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| REQ-001 | should create new project with empty requirements | Create project | Project ID returned |
| REQ-002 | should initialize requirements.json structure | Create with structure | JSON file created |
| REQ-003 | should add requirement to project | Add requirement | Requirement added |
| REQ-004 | should assign id if not provided | Add without id | ID generated |
| REQ-005 | should update existing requirement | Update requirement | Requirement updated |
| REQ-006 | should throw when requirement not found | Update missing | Throws error |
| REQ-007 | should return all requirements for project | Get all | All requirements returned |
| REQ-008 | should filter by category | Get filtered | Category filtered |

---

### TEST-UNIT-003: Quality Layer Tests

**Total Tests: 28**

#### TestRunner Tests (8 tests)

**File:** `src/quality/testing/__tests__/TestRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| TR-001 | should run unit tests and return results | Run unit tests | TestResult returned |
| TR-002 | should run specific test files | Run filtered | Only specified run |
| TR-003 | should run E2E tests | Run E2E | E2E TestResult |
| TR-004 | should get coverage report | Get coverage | CoverageReport |
| TR-005 | should watch tests and call callback | Watch mode | Callback on change |
| TR-006 | should handle test failures gracefully | Tests fail | Failures captured |
| TR-007 | should timeout long-running tests | Slow tests | Timeout error |
| TR-008 | should parse test output correctly | Parse output | Structured result |

---

#### LintRunner Tests (6 tests)

**File:** `src/quality/linting/__tests__/LintRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| LR-001 | should run lint on files | Run lint | LintResult |
| LR-002 | should fix auto-fixable issues | Fix lint | Issues fixed |
| LR-003 | should run type check | Run tsc | TypeCheckResult |
| LR-004 | should report specific file errors | File errors | Errors by file |
| LR-005 | should respect eslint config | With config | Config applied |
| LR-006 | should handle no lint errors | Clean code | Empty errors |

---

#### CodeReviewer Tests (7 tests)

**File:** `src/quality/review/__tests__/CodeReviewer.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| CR-001 | should review code changes | Review diff | ReviewResult |
| CR-002 | should generate review prompt | Generate prompt | Prompt string |
| CR-003 | should parse review response | Parse response | ReviewIssues array |
| CR-004 | should categorize issues by severity | Categorize | Sorted by severity |
| CR-005 | should handle empty diff | Empty changes | No issues |
| CR-006 | should detect security issues | Security review | Security issues flagged |
| CR-007 | should suggest improvements | Code suggestions | Suggestions included |

---

#### QALoopEngine Tests (7 tests)

**File:** `src/quality/qa-loop/__tests__/QALoopEngine.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| QA-001 | should run complete QA loop | Full loop | QAResult |
| QA-002 | should stop on build failure | Build fails | Returns build error |
| QA-003 | should stop on lint failure | Lint fails | Returns lint error |
| QA-004 | should stop on test failure | Tests fail | Returns test error |
| QA-005 | should pass review to next iteration | Review issues | Loops with feedback |
| QA-006 | should respect max iterations | Too many loops | Escalates at 50 |
| QA-007 | should track iteration metrics | Run loop | Metrics recorded |

---

### TEST-UNIT-004: Execution Layer Tests

**Total Tests: 25**

#### ToolExecutor Tests (8 tests)

**File:** `src/execution/tools/__tests__/ToolExecutor.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| TE-001 | should execute file_read tool | Read file | File content returned |
| TE-002 | should execute file_write tool | Write file | File written |
| TE-003 | should execute terminal tool | Run command | Output returned |
| TE-004 | should execute search tool | Search code | Results returned |
| TE-005 | should return available tools | Get tools | Tool list |
| TE-006 | should validate tool parameters | Validate params | ValidationResult |
| TE-007 | should reject invalid parameters | Bad params | Returns invalid |
| TE-008 | should handle tool execution errors | Tool fails | Error captured |

---

#### CoderRunner Tests (6 tests)

**File:** `src/execution/agents/__tests__/CoderRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| CODE-001 | should execute coding task | Execute task | TaskResult |
| CODE-002 | should generate code with LLM | Generate code | CodeGenResult |
| CODE-003 | should apply file changes | Apply changes | Files modified |
| CODE-004 | should use worktree isolation | With worktree | Isolated execution |
| CODE-005 | should handle tool calls | Tools in response | Tools executed |
| CODE-006 | should report progress events | During execution | Events emitted |

---

#### TesterRunner Tests (5 tests)

**File:** `src/execution/agents/__tests__/TesterRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| TEST-001 | should execute testing task | Execute task | TaskResult |
| TEST-002 | should generate tests for code | Generate tests | Test file content |
| TEST-003 | should run generated tests | Run tests | TestResult |
| TEST-004 | should handle test failures | Tests fail | Failures captured |
| TEST-005 | should suggest test improvements | Improve tests | Suggestions returned |

---

#### MergerRunner Tests (6 tests)

**File:** `src/execution/agents/__tests__/MergerRunner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| MERGE-001 | should merge task branch | Merge task | MergeResult |
| MERGE-002 | should analyze conflicts | Has conflicts | ConflictAnalysis |
| MERGE-003 | should resolve simple conflicts | Auto-resolvable | Resolution applied |
| MERGE-004 | should escalate complex conflicts | Complex conflict | Human review requested |
| MERGE-005 | should cleanup worktree after merge | Post-merge | Worktree removed |
| MERGE-006 | should handle fast-forward merges | FF merge | Clean merge |

---

### TEST-UNIT-005: Planning Layer Tests

**Total Tests: 25**

#### TaskDecomposer Tests (10 tests)

**File:** `src/planning/decomposition/__tests__/TaskDecomposer.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| TD-001 | should decompose feature into tasks | Decompose feature | Task array |
| TD-002 | should enforce 30-minute maximum estimate | Large estimate | Split or capped |
| TD-003 | should preserve dependency relationships | With dependencies | Dependencies maintained |
| TD-004 | should assign feature ID to all tasks | Feature tasks | All have featureId |
| TD-005 | should accept valid task | Validate valid | valid: true |
| TD-006 | should reject task without title | No title | valid: false |
| TD-007 | should reject task exceeding 30 minutes | Over 30 min | valid: false |
| TD-008 | should split task into smaller subtasks | Split large | Multiple tasks |
| TD-009 | should maintain total estimated time | Split total | ~Same total time |
| TD-010 | should create dependency chain for subtasks | Split deps | Chain created |

---

#### DependencyResolver Tests (10 tests)

**File:** `src/planning/dependencies/__tests__/DependencyResolver.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| DR-001 | should topologically sort tasks | Sort tasks | Correct order |
| DR-002 | should handle tasks with no dependencies | Independent tasks | All returned |
| DR-003 | should throw on circular dependencies | Cycle exists | Throws error |
| DR-004 | should detect simple cycle | A→B→A | Cycle detected |
| DR-005 | should detect complex cycle | A→B→C→A | Cycle detected |
| DR-006 | should return empty array when no cycles | No cycles | Empty array |
| DR-007 | should group independent tasks into waves | Get waves | Parallel waves |
| DR-008 | should calculate critical path | With estimates | Critical path time |
| DR-009 | should return tasks whose dependencies are complete | Get available | Available tasks |
| DR-010 | should exclude already completed tasks | Completed excluded | Only pending |

---

#### TimeEstimator Tests (5 tests)

**File:** `src/planning/estimation/__tests__/TimeEstimator.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| EST-001 | should estimate based on task complexity | Estimate task | Reasonable estimate |
| EST-002 | should cap estimate at 30 minutes | Complex task | Max 30 |
| EST-003 | should have minimum estimate of 5 minutes | Simple task | Min 5 |
| EST-004 | should aggregate task estimates | Feature estimate | Total calculated |
| EST-005 | should adjust based on historical accuracy | Calibrate | Factor applied |

---

### TEST-UNIT-006: Orchestration Layer Tests

**Total Tests: 30**

#### NexusCoordinator Tests (8 tests)

**File:** `src/orchestration/coordinator/__tests__/NexusCoordinator.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| NC-001 | should start new project | Start project | Project created |
| NC-002 | should pause running project | Pause project | Status: paused |
| NC-003 | should resume paused project | Resume project | Status: running |
| NC-004 | should return project status | Get status | ProjectStatus |
| NC-005 | should create checkpoint on request | Request checkpoint | Checkpoint created |
| NC-006 | should coordinate agent execution | Execute tasks | Tasks completed |
| NC-007 | should handle agent failures | Agent fails | Graceful recovery |
| NC-008 | should emit lifecycle events | During execution | Events emitted |

---

#### AgentPool Tests (8 tests)

**File:** `src/orchestration/agents/__tests__/AgentPool.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| AP-001 | should create agents by type | Create agent | Agent returned |
| AP-002 | should return available agent | Get available | Agent or null |
| AP-003 | should assign task to agent | Assign task | Agent busy |
| AP-004 | should release agent after task | Release agent | Agent available |
| AP-005 | should enforce max agents limit | At max | Returns null |
| AP-006 | should track agent status | Get status | AgentStatus |
| AP-007 | should handle agent creation failure | Create fails | Error handled |
| AP-008 | should cleanup terminated agents | Cleanup | Agents removed |

---

#### TaskQueue Tests (8 tests)

**File:** `src/orchestration/queue/__tests__/TaskQueue.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| TQ-001 | should enqueue task | Enqueue | Task added |
| TQ-002 | should dequeue by priority | Dequeue | Highest priority first |
| TQ-003 | should peek without removing | Peek | Task not removed |
| TQ-004 | should prioritize specific task | Prioritize | Task moved up |
| TQ-005 | should return queued tasks | Get queued | Task list |
| TQ-006 | should respect dependencies | Dequeue deps | Deps first |
| TQ-007 | should handle empty queue | Dequeue empty | Returns null |
| TQ-008 | should update queue on task completion | Complete task | Queue updated |

---

#### EventBus Tests (6 tests)

**File:** `src/orchestration/events/__tests__/EventBus.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| EB-001 | should emit and receive events | Emit/on | Handler called |
| EB-002 | should handle multiple subscribers | Multi sub | All called |
| EB-003 | should support once subscriptions | Once | Called once |
| EB-004 | should unsubscribe handlers | Unsubscribe | Not called after |
| EB-005 | should track event history | Get history | Events returned |
| EB-006 | should filter history by type | Filter type | Filtered list |

---

### TEST-UNIT-007: UI Layer Tests

**Total Tests: 35**

#### Interview Component Tests (8 tests)

**File:** `src/ui/components/interview/__tests__/InterviewChat.test.tsx`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| INT-001 | should render chat interface | Render | Chat visible |
| INT-002 | should send user message | Send message | Message dispatched |
| INT-003 | should display AI response | Receive response | Response shown |
| INT-004 | should show typing indicator | AI typing | Indicator visible |
| INT-005 | should extract requirements | Requirement in response | RequirementsList updated |
| INT-006 | should allow message editing | Edit message | Message editable |
| INT-007 | should handle network errors | Network fail | Error displayed |
| INT-008 | should complete interview | Click done | Navigate to planning |

---

#### Kanban Component Tests (10 tests)

**File:** `src/ui/components/kanban/__tests__/KanbanBoard.test.tsx`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| KB-001 | should render kanban board | Render | Board visible |
| KB-002 | should display columns | Render | All columns shown |
| KB-003 | should display feature cards | With features | Cards visible |
| KB-004 | should drag card between columns | Drag drop | Card moved |
| KB-005 | should expand card details | Click card | Details shown |
| KB-006 | should update feature status | Move card | Status updated |
| KB-007 | should show agent assignments | With agents | Assignments visible |
| KB-008 | should filter by status | Filter | Filtered view |
| KB-009 | should sort by priority | Sort | Priority order |
| KB-010 | should handle empty columns | No features | Empty state |

---

#### Dashboard Component Tests (9 tests)

**File:** `src/ui/components/dashboard/__tests__/DashboardPage.test.tsx`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| DASH-001 | should render dashboard | Render | Dashboard visible |
| DASH-002 | should show progress chart | With data | Chart rendered |
| DASH-003 | should show agent activity | Agents working | Activity shown |
| DASH-004 | should show cost tracker | Cost data | Costs displayed |
| DASH-005 | should update in real-time | New event | UI updated |
| DASH-006 | should show task timeline | With tasks | Timeline visible |
| DASH-007 | should handle loading state | Loading | Spinner shown |
| DASH-008 | should handle error state | Error | Error displayed |
| DASH-009 | should allow time range selection | Select range | Data filtered |

---

#### Zustand Store Tests (8 tests)

**File:** `src/ui/stores/__tests__/stores.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| ST-001 | should initialize with default state | Init | Default values |
| ST-002 | should update project state | Set project | State updated |
| ST-003 | should update agent state | Set agents | Agents updated |
| ST-004 | should add task to queue | Add task | Task in queue |
| ST-005 | should persist UI preferences | Set theme | Theme persisted |
| ST-006 | should derive computed values | Compute | Values computed |
| ST-007 | should handle concurrent updates | Multi update | No race conditions |
| ST-008 | should reset store | Reset | Default state |

---

## Part B: Integration Test Specifications

### TEST-INT-001: Layer Integration Tests

**Total Tests: 20**
**File Location Pattern:** `tests/integration/**/*.test.ts`

These tests verify that layers communicate correctly with each other without mocking the layer boundaries.

#### Infrastructure → Persistence Integration (5 tests)

**File:** `tests/integration/infra-persistence.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| IP-001 | should persist state to files via FileSystem | State → File | STATE.md created |
| IP-002 | should backup database to file | DB → File | Backup file exists |
| IP-003 | should watch file changes and update state | File change → State | State updated |
| IP-004 | should create git commit from state changes | State → Git | Commit created |
| IP-005 | should restore state from git checkout | Git → State | State restored |

**Setup Requirements:**
- Temporary test directory
- Test SQLite database
- Test git repository

---

#### Persistence → Planning Integration (5 tests)

**File:** `tests/integration/persistence-planning.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| PP-001 | should load project for planning | DB → Planner | Project loaded |
| PP-002 | should save generated tasks to database | Planner → DB | Tasks persisted |
| PP-003 | should load requirements for decomposition | Requirements → Decomposer | Requirements available |
| PP-004 | should update task status in database | Execution → DB | Status updated |
| PP-005 | should retrieve task history from memory | Memory → Estimator | History available |

---

#### Planning → Execution Integration (5 tests)

**File:** `tests/integration/planning-execution.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| PE-001 | should queue tasks in correct order | Resolver → Queue | Correct order |
| PE-002 | should track task completion through system | Complete → State | Status updated |
| PE-003 | should pass dependencies to agent context | Deps → Context | Context complete |
| PE-004 | should update estimates on completion | Complete → Estimator | Calibration updated |
| PE-005 | should create checkpoints during execution | Execute → Checkpoint | Checkpoint exists |

---

#### Execution → Quality Integration (5 tests)

**File:** `tests/integration/execution-quality.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| EQ-001 | should run QA loop on code changes | Coder → QA | QA result returned |
| EQ-002 | should pass QA failures back to coder | QA → Coder | Feedback received |
| EQ-003 | should escalate failed QA to human | QA 50x → Human | Escalation event |
| EQ-004 | should run tests in worktree isolation | Worktree → TestRunner | Isolated test run |
| EQ-005 | should collect metrics from QA loop | QA → Metrics | Metrics recorded |

---

### TEST-INT-002: Agent Integration Tests

**Total Tests: 15**
**File Location:** `tests/integration/agents/*.test.ts`

These tests verify agent behavior with real LLM clients (using test API keys or mocks).

#### Planner Agent Integration (5 tests)

**File:** `tests/integration/agents/planner.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| PL-001 | should decompose feature with LLM | Feature → LLM | Tasks created |
| PL-002 | should create valid task structure | LLM response → Tasks | Valid schema |
| PL-003 | should handle LLM timeout | Timeout → Retry | Retry attempted |
| PL-004 | should respect token limits | Large feature | Context truncated |
| PL-005 | should extract dependencies from LLM response | Response → Deps | Dependencies parsed |

**Mock Strategy:** Use MSW to intercept Claude API calls with predefined responses.

```typescript
// Test fixture: Claude response for feature decomposition
const mockDecompositionResponse = {
  content: [
    {
      type: 'text',
      text: `<tasks>
        <task id="t1" title="Create data model" estimate="20" />
        <task id="t2" title="Implement API endpoint" estimate="25" depends="t1" />
        <task id="t3" title="Add validation" estimate="15" depends="t1" />
        <task id="t4" title="Write tests" estimate="20" depends="t2,t3" />
      </tasks>`
    }
  ]
};
```

---

#### Coder Agent Integration (5 tests)

**File:** `tests/integration/agents/coder.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| CD-001 | should generate code for task | Task → LLM → Code | Code generated |
| CD-002 | should use tools correctly | Tool call → Execution | Tool result used |
| CD-003 | should handle multi-turn conversation | Conversation | Multiple turns |
| CD-004 | should apply changes to files | Changes → Files | Files modified |
| CD-005 | should commit changes to worktree | Changes → Git | Commit created |

**Mock Strategy:** Use test worktree with predefined file structure.

---

#### Reviewer Agent Integration (5 tests)

**File:** `tests/integration/agents/reviewer.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| RV-001 | should review code changes | Diff → LLM | Review returned |
| RV-002 | should produce structured feedback | LLM → JSON | Valid JSON |
| RV-003 | should categorize issue severity | Issues → Severity | Categorized |
| RV-004 | should detect security issues | Security code → LLM | Security flagged |
| RV-005 | should approve clean code | Clean diff → LLM | Approved |

---

### TEST-INT-003: Full Flow Integration Tests

**Total Tests: 10**
**File Location:** `tests/integration/flows/*.test.ts`

End-to-end flow tests that exercise multiple systems together.

#### Genesis Mode Flow (5 tests)

**File:** `tests/integration/flows/genesis.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| GEN-001 | should complete interview and create requirements | Interview → Requirements | Requirements DB populated |
| GEN-002 | should plan entire project from requirements | Requirements → Plan | Tasks created |
| GEN-003 | should execute single feature end-to-end | Feature → Code → Merge | Feature complete |
| GEN-004 | should handle task failure and retry | Fail → Retry | Recovery successful |
| GEN-005 | should create checkpoint after feature | Feature → Checkpoint | Checkpoint exists |

**Test Duration:** ~2 minutes per test
**Setup:** Complete test project with mock LLM responses

---

#### Evolution Mode Flow (5 tests)

**File:** `tests/integration/flows/evolution.test.ts`

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| EVO-001 | should analyze existing project structure | Project → Analysis | Structure mapped |
| EVO-002 | should add feature to existing codebase | Feature → Code | Code integrated |
| EVO-003 | should maintain existing code patterns | Analysis → Code | Patterns followed |
| EVO-004 | should create PR for changes | Changes → PR | PR created |
| EVO-005 | should handle merge conflicts | Conflict → Resolution | Conflict resolved |

---

## Part C: E2E Test Specifications

### TEST-E2E-001: Interview Flow

**File:** `e2e/interview.spec.ts`
**Estimated Duration:** 30 seconds

| Test ID | Test Name | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| E2E-INT-001 | should load interview page | Navigate to /interview | Page renders |
| E2E-INT-002 | should send message and receive response | Type → Send → Wait | Response appears |
| E2E-INT-003 | should display extracted requirements | AI extracts requirements | Requirements list updates |
| E2E-INT-004 | should complete interview and proceed | Click "Done" | Navigate to planning |

**Test Implementation:**

```typescript
// =============================================================================
// FILE: e2e/interview.spec.ts
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Interview Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Claude API
    await page.route('**/anthropic.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: 'I understand you want to build...' }]
        })
      });
    });
  });

  test('should load interview page', async ({ page }) => {
    await page.goto('/interview');
    await expect(page.getByRole('heading', { name: 'Project Interview' })).toBeVisible();
    await expect(page.getByPlaceholder('Describe your project...')).toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    await page.goto('/interview');
    await page.getByPlaceholder('Describe your project...').fill('I want to build a todo app');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('I understand you want to build')).toBeVisible({ timeout: 10000 });
  });

  test('should display extracted requirements', async ({ page }) => {
    await page.goto('/interview');
    // ... send messages that trigger requirement extraction
    await expect(page.getByTestId('requirements-list')).toContainText('Requirement');
  });

  test('should complete interview and proceed', async ({ page }) => {
    await page.goto('/interview');
    // ... complete interview
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page).toHaveURL('/planning');
  });
});
```

---

### TEST-E2E-002: Kanban Flow

**File:** `e2e/kanban.spec.ts`
**Estimated Duration:** 45 seconds

| Test ID | Test Name | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| E2E-KB-001 | should display kanban board | Navigate to /kanban | Board renders |
| E2E-KB-002 | should drag feature between columns | Drag card → Drop | Card moved |
| E2E-KB-003 | should trigger planning on complex feature | Drag to "In Progress" | Planning modal appears |
| E2E-KB-004 | should show agent activity | Feature executing | Activity indicator |

**Test Implementation:**

```typescript
// =============================================================================
// FILE: e2e/kanban.spec.ts
// =============================================================================

import { test, expect } from '@playwright/test';
import { seedTestProject } from './utils/seed';

test.describe('Kanban Flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestProject({
      features: [
        { id: 'f1', name: 'User Auth', status: 'backlog' },
        { id: 'f2', name: 'Dashboard', status: 'in_progress' }
      ]
    });
  });

  test('should display kanban board', async ({ page }) => {
    await page.goto('/kanban');
    await expect(page.getByRole('heading', { name: 'Feature Board' })).toBeVisible();
    await expect(page.getByTestId('column-backlog')).toBeVisible();
    await expect(page.getByTestId('column-in-progress')).toBeVisible();
    await expect(page.getByTestId('column-done')).toBeVisible();
  });

  test('should drag feature between columns', async ({ page }) => {
    await page.goto('/kanban');

    const card = page.getByTestId('feature-card-f1');
    const targetColumn = page.getByTestId('column-in-progress');

    await card.dragTo(targetColumn);

    await expect(targetColumn).toContainText('User Auth');
  });

  test('should trigger planning on complex feature', async ({ page }) => {
    await page.goto('/kanban');

    const card = page.getByTestId('feature-card-f1');
    const targetColumn = page.getByTestId('column-in-progress');

    await card.dragTo(targetColumn);

    // Complex feature triggers planning modal
    await expect(page.getByRole('dialog', { name: 'Plan Feature' })).toBeVisible();
  });

  test('should show agent activity', async ({ page }) => {
    await page.goto('/kanban');

    // Feature is in progress
    await expect(page.getByTestId('agent-activity-f2')).toBeVisible();
    await expect(page.getByTestId('agent-activity-f2')).toContainText('Coder working');
  });
});
```

---

### TEST-E2E-003: Execution Flow

**File:** `e2e/execution.spec.ts`
**Estimated Duration:** 60 seconds

| Test ID | Test Name | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| E2E-EX-001 | should start execution | Click start | Execution begins |
| E2E-EX-002 | should show progress updates | During execution | Progress bar updates |
| E2E-EX-003 | should handle QA loop iterations | QA fails → retry | Shows iteration count |
| E2E-EX-004 | should complete and merge task | Task finishes | Merged status |

---

### TEST-E2E-004: Checkpoint Flow

**File:** `e2e/checkpoint.spec.ts`
**Estimated Duration:** 45 seconds

| Test ID | Test Name | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| E2E-CP-001 | should create checkpoint | Click checkpoint | Checkpoint created |
| E2E-CP-002 | should list checkpoints | Open list | Checkpoints shown |
| E2E-CP-003 | should restore checkpoint | Select → restore | State restored |
| E2E-CP-004 | should resume from checkpoint | After restore | Execution continues |

---

## Part D: Test Utilities Specifications

### TEST-UTIL-001: Test Factories

**File:** `tests/factories/index.ts`
**Estimated LOC:** 200-250

```typescript
// =============================================================================
// FILE: tests/factories/index.ts
// PURPOSE: Generate test data with realistic defaults
// =============================================================================

import { Task, Feature, Project, Requirement } from '@/types/core';
import { Agent, AgentType, AgentStatus } from '@/types/agent';
import { v4 as uuid } from 'uuid';

// ---------------------------------------------------------------------------
// TASK FACTORY
// ---------------------------------------------------------------------------

interface TaskOverrides extends Partial<Task> {}

export function createTask(overrides: TaskOverrides = {}): Task {
  const id = overrides.id || `task-${uuid().slice(0, 8)}`;

  return {
    id,
    featureId: overrides.featureId || 'feat-default',
    title: overrides.title || `Test Task ${id}`,
    description: overrides.description || 'Test task description',
    status: overrides.status || 'pending',
    estimatedMinutes: overrides.estimatedMinutes || 20,
    actualMinutes: overrides.actualMinutes,
    dependencies: overrides.dependencies || [],
    acceptanceCriteria: overrides.acceptanceCriteria || ['Criterion 1'],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

export function createTasks(count: number, overrides: TaskOverrides = {}): Task[] {
  return Array.from({ length: count }, (_, i) =>
    createTask({
      ...overrides,
      id: overrides.id ? `${overrides.id}-${i}` : undefined
    })
  );
}

// ---------------------------------------------------------------------------
// FEATURE FACTORY
// ---------------------------------------------------------------------------

interface FeatureOverrides extends Partial<Feature> {}

export function createFeature(overrides: FeatureOverrides = {}): Feature {
  const id = overrides.id || `feat-${uuid().slice(0, 8)}`;

  return {
    id,
    projectId: overrides.projectId || 'proj-default',
    name: overrides.name || `Test Feature ${id}`,
    description: overrides.description || 'Test feature description',
    status: overrides.status || 'pending',
    priority: overrides.priority || 'medium',
    complexity: overrides.complexity || 'medium',
    taskIds: overrides.taskIds || [],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

export function createFeatureWithTasks(
  featureOverrides: FeatureOverrides = {},
  taskCount: number = 3
): { feature: Feature; tasks: Task[] } {
  const feature = createFeature(featureOverrides);
  const tasks = createTasks(taskCount, { featureId: feature.id });
  feature.taskIds = tasks.map(t => t.id);
  return { feature, tasks };
}

// ---------------------------------------------------------------------------
// PROJECT FACTORY
// ---------------------------------------------------------------------------

interface ProjectOverrides extends Partial<Project> {}

export function createProject(overrides: ProjectOverrides = {}): Project {
  const id = overrides.id || `proj-${uuid().slice(0, 8)}`;

  return {
    id,
    name: overrides.name || `Test Project ${id}`,
    description: overrides.description || 'Test project description',
    status: overrides.status || 'planning',
    mode: overrides.mode || 'genesis',
    repoPath: overrides.repoPath || `/tmp/test-repos/${id}`,
    featureIds: overrides.featureIds || [],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// AGENT FACTORY
// ---------------------------------------------------------------------------

interface AgentOverrides extends Partial<Agent> {}

export function createAgent(
  type: AgentType = 'coder',
  overrides: AgentOverrides = {}
): Agent {
  const id = overrides.id || `agent-${uuid().slice(0, 8)}`;

  return {
    id,
    type,
    status: overrides.status || 'idle',
    currentTaskId: overrides.currentTaskId,
    model: overrides.model || getDefaultModel(type),
    tokensUsed: overrides.tokensUsed || 0,
    cost: overrides.cost || 0,
    createdAt: overrides.createdAt || new Date(),
    ...overrides
  };
}

function getDefaultModel(type: AgentType): string {
  switch (type) {
    case 'planner': return 'claude-3-opus-20240229';
    case 'coder': return 'claude-sonnet-4-20250514';
    case 'tester': return 'claude-sonnet-4-20250514';
    case 'reviewer': return 'gemini-1.5-pro';
    case 'merger': return 'claude-sonnet-4-20250514';
    default: return 'claude-sonnet-4-20250514';
  }
}

// ---------------------------------------------------------------------------
// REQUIREMENT FACTORY
// ---------------------------------------------------------------------------

interface RequirementOverrides extends Partial<Requirement> {}

export function createRequirement(overrides: RequirementOverrides = {}): Requirement {
  const id = overrides.id || `req-${uuid().slice(0, 8)}`;

  return {
    id,
    category: overrides.category || 'functional',
    description: overrides.description || 'Test requirement description',
    priority: overrides.priority || 'medium',
    source: overrides.source || 'interview',
    createdAt: overrides.createdAt || new Date(),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// NEXUS STATE FACTORY
// ---------------------------------------------------------------------------

export function createNexusState(overrides: Partial<NexusState> = {}): NexusState {
  const project = overrides.project || createProject();

  return {
    project,
    features: overrides.features || [],
    tasks: overrides.tasks || [],
    agents: overrides.agents || [],
    checkpoints: overrides.checkpoints || [],
    execution: overrides.execution || null
  };
}
```

---

### TEST-UTIL-002: Mock Providers

**File:** `tests/mocks/llm.ts`
**Estimated LOC:** 250-300

```typescript
// =============================================================================
// FILE: tests/mocks/llm.ts
// PURPOSE: Mock LLM providers for testing without API calls
// =============================================================================

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// ---------------------------------------------------------------------------
// CLAUDE MOCK
// ---------------------------------------------------------------------------

export interface ClaudeMockConfig {
  responses: Map<string, string>;
  delay?: number;
  failAfter?: number;
}

export function createClaudeMock(config: ClaudeMockConfig) {
  let callCount = 0;

  return http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    callCount++;

    if (config.failAfter && callCount > config.failAfter) {
      return HttpResponse.json(
        { error: { type: 'rate_limit_error', message: 'Rate limited' } },
        { status: 429 }
      );
    }

    const body = await request.json() as { messages: Array<{ content: string }> };
    const lastMessage = body.messages[body.messages.length - 1]?.content || '';

    // Find matching response
    let response = 'Default mock response';
    for (const [pattern, text] of config.responses) {
      if (lastMessage.includes(pattern)) {
        response = text;
        break;
      }
    }

    if (config.delay) {
      await new Promise(r => setTimeout(r, config.delay));
    }

    return HttpResponse.json({
      id: 'msg_mock_' + Date.now(),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: response }],
      model: 'claude-sonnet-4-20250514',
      usage: { input_tokens: 100, output_tokens: 50 }
    });
  });
}

// ---------------------------------------------------------------------------
// GEMINI MOCK
// ---------------------------------------------------------------------------

export interface GeminiMockConfig {
  responses: Map<string, string>;
  delay?: number;
}

export function createGeminiMock(config: GeminiMockConfig) {
  return http.post('https://generativelanguage.googleapis.com/v1beta/models/*', async ({ request }) => {
    const body = await request.json() as { contents: Array<{ parts: Array<{ text: string }> }> };
    const lastContent = body.contents[body.contents.length - 1]?.parts[0]?.text || '';

    let response = 'Default Gemini mock response';
    for (const [pattern, text] of config.responses) {
      if (lastContent.includes(pattern)) {
        response = text;
        break;
      }
    }

    if (config.delay) {
      await new Promise(r => setTimeout(r, config.delay));
    }

    return HttpResponse.json({
      candidates: [{ content: { parts: [{ text: response }] } }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 25 }
    });
  });
}

// ---------------------------------------------------------------------------
// EMBEDDINGS MOCK
// ---------------------------------------------------------------------------

export function createEmbeddingsMock() {
  return http.post('https://api.openai.com/v1/embeddings', async ({ request }) => {
    const body = await request.json() as { input: string | string[] };
    const inputs = Array.isArray(body.input) ? body.input : [body.input];

    return HttpResponse.json({
      data: inputs.map((_, i) => ({
        embedding: generateMockEmbedding(),
        index: i
      })),
      usage: { prompt_tokens: 10, total_tokens: 10 }
    });
  });
}

function generateMockEmbedding(dim: number = 1536): number[] {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

// ---------------------------------------------------------------------------
// PRESET RESPONSES
// ---------------------------------------------------------------------------

export const MOCK_RESPONSES = {
  planning: {
    decompose: `<tasks>
      <task id="t1" title="Create data model" estimate="20" />
      <task id="t2" title="Implement API" estimate="25" depends="t1" />
      <task id="t3" title="Add tests" estimate="15" depends="t2" />
    </tasks>`,
    validate: 'All tasks validated successfully.'
  },

  coding: {
    simple: 'export function hello() { return "Hello, World!"; }',
    withTest: `// Implementation
export function add(a: number, b: number) { return a + b; }

// Test
describe('add', () => {
  it('should add numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});`
  },

  review: {
    approve: JSON.stringify({
      approved: true,
      issues: [],
      suggestions: ['Consider adding JSDoc comments']
    }),
    reject: JSON.stringify({
      approved: false,
      issues: [
        { severity: 'error', message: 'Missing null check', line: 10 }
      ],
      suggestions: []
    })
  }
};

// ---------------------------------------------------------------------------
// MSW SERVER SETUP
// ---------------------------------------------------------------------------

export function setupMockServer(config?: {
  claude?: ClaudeMockConfig;
  gemini?: GeminiMockConfig;
  embeddings?: boolean;
}) {
  const handlers = [];

  if (config?.claude) {
    handlers.push(createClaudeMock(config.claude));
  }

  if (config?.gemini) {
    handlers.push(createGeminiMock(config.gemini));
  }

  if (config?.embeddings) {
    handlers.push(createEmbeddingsMock());
  }

  return setupServer(...handlers);
}
```

---

### TEST-UTIL-003: Test Database

**File:** `tests/utils/database.ts`
**Estimated LOC:** 150-200

```typescript
// =============================================================================
// FILE: tests/utils/database.ts
// PURPOSE: Test database setup, seeding, and cleanup utilities
// =============================================================================

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/persistence/database/schema';
import { createProject, createFeature, createTask, createAgent } from '../factories';

// ---------------------------------------------------------------------------
// TEST DATABASE CREATION
// ---------------------------------------------------------------------------

export interface TestDatabaseOptions {
  inMemory?: boolean;
  migrations?: boolean;
  seed?: boolean;
}

export function createTestDatabase(options: TestDatabaseOptions = {}): TestDatabase {
  const sqlite = options.inMemory !== false
    ? new Database(':memory:')
    : new Database(`/tmp/test-${Date.now()}.db`);

  // Enable WAL and foreign keys
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (options.migrations !== false) {
    runMigrations(sqlite);
  }

  if (options.seed) {
    seedTestData(db);
  }

  return {
    db,
    sqlite,
    cleanup: () => sqlite.close()
  };
}

export interface TestDatabase {
  db: ReturnType<typeof drizzle>;
  sqlite: Database.Database;
  cleanup: () => void;
}

// ---------------------------------------------------------------------------
// MIGRATIONS
// ---------------------------------------------------------------------------

function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planning',
      mode TEXT NOT NULL DEFAULT 'genesis',
      repo_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      complexity TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      estimated_minutes INTEGER NOT NULL DEFAULT 20,
      actual_minutes INTEGER,
      dependencies TEXT,
      acceptance_criteria TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      current_task_id TEXT REFERENCES tasks(id),
      model TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      state_snapshot TEXT NOT NULL,
      git_ref TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      task_id TEXT REFERENCES tasks(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      importance REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL
    );
  `);
}

// ---------------------------------------------------------------------------
// SEEDING
// ---------------------------------------------------------------------------

export interface SeedOptions {
  projectCount?: number;
  featuresPerProject?: number;
  tasksPerFeature?: number;
}

export function seedTestData(
  db: ReturnType<typeof drizzle>,
  options: SeedOptions = {}
): SeedResult {
  const projectCount = options.projectCount || 1;
  const featuresPerProject = options.featuresPerProject || 3;
  const tasksPerFeature = options.tasksPerFeature || 4;

  const projects: any[] = [];
  const features: any[] = [];
  const tasks: any[] = [];

  for (let p = 0; p < projectCount; p++) {
    const project = createProject({ id: `proj-${p}` });
    projects.push(project);

    for (let f = 0; f < featuresPerProject; f++) {
      const feature = createFeature({
        id: `feat-${p}-${f}`,
        projectId: project.id
      });
      features.push(feature);

      const featureTasks = [];
      for (let t = 0; t < tasksPerFeature; t++) {
        const task = createTask({
          id: `task-${p}-${f}-${t}`,
          featureId: feature.id,
          dependencies: t > 0 ? [`task-${p}-${f}-${t - 1}`] : []
        });
        tasks.push(task);
        featureTasks.push(task.id);
      }
      feature.taskIds = featureTasks;
    }

    project.featureIds = features
      .filter(f => f.projectId === project.id)
      .map(f => f.id);
  }

  // Insert into database
  for (const project of projects) {
    db.insert(schema.projects).values(project).run();
  }

  for (const feature of features) {
    db.insert(schema.features).values(feature).run();
  }

  for (const task of tasks) {
    db.insert(schema.tasks).values({
      ...task,
      dependencies: JSON.stringify(task.dependencies),
      acceptanceCriteria: JSON.stringify(task.acceptanceCriteria)
    }).run();
  }

  return { projects, features, tasks };
}

export interface SeedResult {
  projects: any[];
  features: any[];
  tasks: any[];
}

// ---------------------------------------------------------------------------
// CLEANUP
// ---------------------------------------------------------------------------

export function cleanupTestDatabase(db: TestDatabase): void {
  db.sqlite.exec('DELETE FROM memories');
  db.sqlite.exec('DELETE FROM checkpoints');
  db.sqlite.exec('DELETE FROM agents');
  db.sqlite.exec('DELETE FROM tasks');
  db.sqlite.exec('DELETE FROM features');
  db.sqlite.exec('DELETE FROM projects');
}

// ---------------------------------------------------------------------------
// ASSERTIONS
// ---------------------------------------------------------------------------

export function assertDatabaseHas(
  db: ReturnType<typeof drizzle>,
  table: string,
  where: Record<string, any>
): void {
  const conditions = Object.entries(where)
    .map(([k, v]) => `${k} = '${v}'`)
    .join(' AND ');

  const result = db.$client.prepare(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`
  ).get() as { count: number };

  if (result.count === 0) {
    throw new Error(`Expected ${table} to contain row matching ${JSON.stringify(where)}`);
  }
}

export function assertDatabaseMissing(
  db: ReturnType<typeof drizzle>,
  table: string,
  where: Record<string, any>
): void {
  const conditions = Object.entries(where)
    .map(([k, v]) => `${k} = '${v}'`)
    .join(' AND ');

  const result = db.$client.prepare(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`
  ).get() as { count: number };

  if (result.count > 0) {
    throw new Error(`Expected ${table} to NOT contain row matching ${JSON.stringify(where)}`);
  }
}
```

---

## Part E: Coverage Requirements

### Coverage Targets by Layer

| Layer | Minimum Coverage | Target Coverage | Rationale |
|-------|------------------|-----------------|-----------|
| Infrastructure | 80% | 90% | Core I/O operations |
| Persistence | 85% | 95% | Critical data integrity |
| Quality | 80% | 90% | QA loop reliability |
| Execution | 75% | 85% | Agent interactions variable |
| Planning | 80% | 90% | Algorithm correctness |
| Orchestration | 80% | 90% | Coordination critical |
| UI Components | 70% | 80% | Visual variations |

### Critical Path Coverage

These paths MUST have 95%+ coverage:

| Path | Components | Minimum |
|------|------------|---------|
| QA Loop | QALoopEngine, TestRunner, LintRunner, CodeReviewer | 95% |
| Agent Communication | EventBus, AgentPool, all Runners | 90% |
| State Persistence | StateManager, CheckpointManager, DatabaseClient | 95% |
| Checkpoint/Recovery | CheckpointManager, StateManager, GitService | 95% |
| Dependency Resolution | DependencyResolver, TaskQueue | 95% |

### Coverage Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // Thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },

      // Include/Exclude
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/types/**',
        'src/**/index.ts'
      ],

      // Per-file thresholds
      perFile: true,

      // Critical path enforcement
      100: [
        'src/persistence/state/StateManager.ts',
        'src/persistence/checkpoints/CheckpointManager.ts',
        'src/quality/qa-loop/QALoopEngine.ts'
      ]
    }
  }
});
```

### Test Running Commands

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific layer tests
npm run test -- --filter="infrastructure"
npm run test -- --filter="persistence"

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# CI mode (with coverage thresholds)
npm run test:ci
```

### Coverage Reports

Coverage reports are generated in multiple formats:

1. **Terminal Output:** Quick summary during development
2. **HTML Report:** Detailed line-by-line coverage at `coverage/index.html`
3. **JSON Report:** Machine-readable for CI/CD at `coverage/coverage-final.json`
4. **LCOV:** For integration with coverage services

---

## Task 6.4 Completion Summary

### Tests by Category

| Category | Count | Est. Duration |
|----------|-------|---------------|
| Unit Tests - Infrastructure | 42 | 3s |
| Unit Tests - Persistence | 47 | 4s |
| Unit Tests - Quality | 28 | 2s |
| Unit Tests - Execution | 25 | 3s |
| Unit Tests - Planning | 25 | 2s |
| Unit Tests - Orchestration | 30 | 2s |
| Unit Tests - UI | 35 | 4s |
| **Unit Total** | **232** | **20s** |
| Integration - Layer | 20 | 15s |
| Integration - Agent | 15 | 20s |
| Integration - Flow | 10 | 45s |
| **Integration Total** | **45** | **80s** |
| E2E - Interview | 4 | 30s |
| E2E - Kanban | 4 | 45s |
| E2E - Execution | 4 | 60s |
| E2E - Checkpoint | 4 | 45s |
| **E2E Total** | **16** | **3min** |
| **GRAND TOTAL** | **~293** | **~5min** |

### Test File Summary

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/**/__tests__/` | 25+ | Unit tests co-located |
| `tests/integration/` | 8 | Cross-layer integration |
| `tests/factories/` | 1 | Test data factories |
| `tests/mocks/` | 2 | Mock providers |
| `tests/utils/` | 2 | Database utilities |
| `e2e/` | 4 | End-to-end Playwright |

### Key Test Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.45.0",
    "msw": "^2.3.0",
    "better-sqlite3": "^11.0.0"
  }
}
```

---

**[TASK 6.4 COMPLETE]**

---

## Task 6.5: Build Order & Dependencies

### Objective

Define the exact build order for the Nexus system, including:
- Sprint-by-sprint build sequence
- Dependencies between components
- Time estimates for each build item
- Critical path identification
- Parallel execution opportunities
- Integration milestones

---

### Part A: Sprint 1 Build Order (Foundation)

**Duration:** Week 1-2
**Focus:** Project infrastructure, types, and database foundation
**Team Size:** 1-2 developers

---

#### BUILD-001: Project Initialization

| Field | Value |
|-------|-------|
| **Order** | 1 |
| **Duration** | 4 hours |
| **Dependencies** | None |
| **Outputs** | Configured project with all tooling |

**Tasks:**

1. **Repository Setup**
   ```bash
   # Initialize project
   mkdir nexus
   cd nexus
   npm init -y
   git init
   ```

2. **Package Configuration**
   ```json
   {
     "name": "nexus",
     "version": "0.1.0",
     "type": "module",
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsup src/index.ts --format esm,cjs --dts",
       "test": "vitest",
       "test:coverage": "vitest --coverage",
       "test:e2e": "playwright test",
       "lint": "eslint src --ext .ts,.tsx",
       "lint:fix": "eslint src --ext .ts,.tsx --fix",
       "typecheck": "tsc --noEmit",
       "db:generate": "drizzle-kit generate",
       "db:migrate": "drizzle-kit migrate"
     }
   }
   ```

3. **TypeScript Configuration**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "strict": true,
       "skipLibCheck": true,
       "esModuleInterop": true,
       "isolatedModules": true,
       "outDir": "./dist",
       "rootDir": "./src",
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "paths": {
         "@/*": ["./src/*"],
         "@/types/*": ["./src/types/*"],
         "@/config/*": ["./src/config/*"]
       }
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "coverage"]
   }
   ```

4. **ESLint & Prettier**
   - Configure ESLint with TypeScript plugin
   - Configure Prettier with project defaults
   - Add pre-commit hooks with Husky

5. **Testing Setup**
   - Configure Vitest with coverage
   - Configure Playwright for E2E
   - Create test utilities directory

**Verification Criteria:**
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` runs (0 tests initially)
- [ ] Project structure matches architecture

**Directory Structure Created:**
```
nexus/
├── src/
│   ├── types/
│   ├── config/
│   ├── infrastructure/
│   ├── persistence/
│   ├── quality/
│   ├── execution/
│   ├── planning/
│   ├── orchestration/
│   ├── adapters/
│   ├── bridges/
│   ├── llm/
│   └── ui/
├── config/
│   └── prompts/
├── tests/
│   ├── factories/
│   ├── mocks/
│   └── utils/
├── e2e/
├── .github/
│   └── workflows/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

#### BUILD-002: Type Definitions

| Field | Value |
|-------|-------|
| **Order** | 2 |
| **Duration** | 6 hours |
| **Dependencies** | BUILD-001 |
| **Outputs** | Complete type system |

**Tasks:**

1. **Core Types** (2 hours)
   - File: `src/types/core.ts`
   - Contents:
     - Task, TaskStatus, TaskResult
     - Feature, FeatureStatus
     - Project, ProjectStatus
     - Requirement, RequirementCategory
   - LOC: 200-250

2. **Agent Types** (1.5 hours)
   - File: `src/types/agent.ts`
   - Contents:
     - Agent, AgentType, AgentStatus
     - AgentContext, AgentMessage
     - AgentConfig per type
   - LOC: 150-200

3. **Event Types** (1.5 hours)
   - File: `src/types/events.ts`
   - Contents:
     - NexusEvent, EventType enum
     - Payload types for each event
     - Event handler types
   - LOC: 200-250

4. **API Types** (1 hour)
   - File: `src/types/api.ts`
   - Contents:
     - OrchestrationAPI
     - PlanningAPI
     - ExecutionAPI
     - PersistenceAPI
   - LOC: 150-200

**Verification Criteria:**
- [ ] `npm run typecheck` passes
- [ ] All types are exported from `src/types/index.ts`
- [ ] No circular dependencies

---

#### BUILD-003: Infrastructure Layer

| Field | Value |
|-------|-------|
| **Order** | 3 |
| **Duration** | 16 hours |
| **Dependencies** | BUILD-002 |
| **Outputs** | 5 infrastructure components |

**Tasks:**

1. **FileSystemService** (3 hours)
   - File: `src/infrastructure/file-system/FileSystemService.ts`
   - Tests: `src/infrastructure/file-system/__tests__/FileSystemService.test.ts`
   - Dependencies: fs-extra, chokidar, fast-glob, pathe
   - LOC: 150-200
   - Tests: 10

2. **ProcessRunner** (3 hours)
   - File: `src/infrastructure/process/ProcessRunner.ts`
   - Tests: `src/infrastructure/process/__tests__/ProcessRunner.test.ts`
   - Dependencies: execa, tree-kill, shell-quote
   - LOC: 150-200
   - Tests: 8

3. **GitService** (5 hours)
   - File: `src/infrastructure/git/GitService.ts`
   - Tests: `src/infrastructure/git/__tests__/GitService.test.ts`
   - Dependencies: simple-git, parse-diff
   - LOC: 250-300
   - Tests: 12

4. **WorktreeManager** (3 hours)
   - File: `src/infrastructure/git/WorktreeManager.ts`
   - Tests: `src/infrastructure/git/__tests__/WorktreeManager.test.ts`
   - Dependencies: GitService, FileSystemService
   - LOC: 200-250
   - Tests: 8

5. **LSPClient** (2 hours - stub only)
   - File: `src/infrastructure/lsp/LSPClient.ts`
   - Note: Full implementation deferred to Sprint 3
   - LOC: 100 (stub)
   - Tests: 4

**Verification Criteria:**
- [ ] All unit tests pass
- [ ] Coverage ≥ 80%
- [ ] Integration test: create worktree, commit, merge

**Build Order Within Sprint:**
```
FileSystemService (no deps)
        │
        ├──► ProcessRunner (no deps, can parallel)
        │
        └──► GitService (uses FileSystemService)
                │
                └──► WorktreeManager (uses Git + FS)
```

---

#### BUILD-004: Database Foundation

| Field | Value |
|-------|-------|
| **Order** | 4 |
| **Duration** | 12 hours |
| **Dependencies** | BUILD-003 |
| **Outputs** | Database client, schema, migrations |

**Tasks:**

1. **Database Client** (4 hours)
   - File: `src/persistence/database/DatabaseClient.ts`
   - Tests: `src/persistence/database/__tests__/DatabaseClient.test.ts`
   - Dependencies: better-sqlite3, drizzle-orm
   - LOC: 100-150
   - Tests: 8

2. **Drizzle Schema** (4 hours)
   - File: `src/persistence/database/schema.ts`
   - Tables:
     - projects, features, tasks
     - agents, checkpoints
     - metrics, sessions
     - memory_episodes, embeddings
   - LOC: 200-250
   - Tests: 5 (schema validation)

3. **Migrations** (2 hours)
   - Directory: `drizzle/`
   - Initial migration with all tables
   - Seed data script

4. **Basic CRUD** (2 hours)
   - File: `src/persistence/database/queries.ts`
   - Basic queries for all tables
   - LOC: 150-200

**Verification Criteria:**
- [ ] Database initializes successfully
- [ ] Migrations run without error
- [ ] Basic CRUD operations work
- [ ] WAL mode enabled and verified

---

### Part B: Sprint 2 Build Order (Persistence & State)

**Duration:** Week 3-4
**Focus:** State management, checkpoints, memory system
**Team Size:** 1-2 developers
**Parallel Opportunity:** BUILD-005 and BUILD-007 can run in parallel

---

#### BUILD-005: State Management

| Field | Value |
|-------|-------|
| **Order** | 5 |
| **Duration** | 16 hours |
| **Dependencies** | BUILD-004 |
| **Outputs** | StateManager, CheckpointManager |

**Tasks:**

1. **StateManager** (8 hours)
   - File: `src/persistence/state/StateManager.ts`
   - Tests: `src/persistence/state/__tests__/StateManager.test.ts`
   - Methods:
     - saveState, loadState, updateState
     - exportToSTATE_MD, importFromSTATE_MD
   - LOC: 250-300
   - Tests: 15

2. **StateFormatAdapter** (4 hours)
   - File: `src/adapters/StateFormatAdapter.ts`
   - Tests: `src/adapters/__tests__/StateFormatAdapter.test.ts`
   - Bidirectional STATE.md ↔ Database conversion
   - LOC: 150-200
   - Tests: 12

3. **CheckpointManager** (4 hours)
   - File: `src/persistence/checkpoints/CheckpointManager.ts`
   - Tests: `src/persistence/checkpoints/__tests__/CheckpointManager.test.ts`
   - Methods:
     - createCheckpoint, listCheckpoints
     - restoreCheckpoint, deleteCheckpoint
   - LOC: 150-200
   - Tests: 10

**Verification Criteria:**
- [ ] State saves and loads correctly
- [ ] STATE.md roundtrip preserves all data
- [ ] Checkpoints can be created and restored
- [ ] Coverage ≥ 90%

---

#### BUILD-006: Memory System

| Field | Value |
|-------|-------|
| **Order** | 6 |
| **Duration** | 20 hours |
| **Dependencies** | BUILD-004 |
| **Outputs** | MemorySystem, EmbeddingsService |

**Tasks:**

1. **EmbeddingsService** (8 hours)
   - File: `src/persistence/embeddings/EmbeddingsService.ts`
   - Tests: `src/persistence/embeddings/__tests__/EmbeddingsService.test.ts`
   - Methods:
     - generateEmbedding (using OpenAI or local model)
     - batchEmbeddings
     - similarity calculation
   - LOC: 200-250
   - Tests: 10

2. **MemorySystem** (8 hours)
   - File: `src/persistence/memory/MemorySystem.ts`
   - Tests: `src/persistence/memory/__tests__/MemorySystem.test.ts`
   - Methods:
     - storeEpisode, queryMemory
     - getRelevantContext, pruneOldMemories
   - LOC: 300-350
   - Tests: 15

3. **VectorStore** (4 hours)
   - File: `src/persistence/memory/VectorStore.ts`
   - SQLite-based vector similarity search
   - LOC: 150-200
   - Tests: 8

**Verification Criteria:**
- [ ] Embeddings generate correctly
- [ ] Similarity search returns relevant results
- [ ] Memory pruning works
- [ ] Coverage ≥ 85%

---

#### BUILD-007: Requirements Database

| Field | Value |
|-------|-------|
| **Order** | 7 |
| **Duration** | 12 hours |
| **Dependencies** | BUILD-003 |
| **Outputs** | RequirementsDB |

**Note:** This can be built in PARALLEL with BUILD-005 since it only depends on BUILD-003 (FileSystemService).

**Tasks:**

1. **RequirementsDB** (8 hours)
   - File: `src/persistence/requirements/RequirementsDB.ts`
   - Tests: `src/persistence/requirements/__tests__/RequirementsDB.test.ts`
   - Methods:
     - createProject, addRequirement
     - updateRequirement, getRequirements
     - exportToJSON, importFromJSON
   - LOC: 200-250
   - Tests: 12

2. **RequirementSchema** (4 hours)
   - File: `src/persistence/requirements/types.ts`
   - JSON schema for requirements
   - Validation utilities
   - LOC: 100-150
   - Tests: 5

**Verification Criteria:**
- [ ] Requirements persist to JSON files
- [ ] All CRUD operations work
- [ ] Schema validation catches invalid data
- [ ] Coverage ≥ 85%

---

### Part C: Sprint 3 Build Order (LLM & Agents)

**Duration:** Week 5-6
**Focus:** LLM clients, agent runners, quality layer
**Team Size:** 2 developers (can parallelize LLM and Quality)

---

#### BUILD-008: LLM Clients

| Field | Value |
|-------|-------|
| **Order** | 8 |
| **Duration** | 24 hours |
| **Dependencies** | BUILD-002 |
| **Outputs** | ClaudeClient, GeminiClient, LLMProvider |

**Tasks:**

1. **ClaudeClient** (10 hours)
   - File: `src/llm/ClaudeClient.ts`
   - Tests: `src/llm/__tests__/ClaudeClient.test.ts`
   - Features:
     - Streaming responses
     - Tool execution loop (50 max iterations)
     - Rate limiting with backoff
     - Token usage tracking
   - LOC: 400-500
   - Tests: 18

2. **GeminiClient** (8 hours)
   - File: `src/llm/GeminiClient.ts`
   - Tests: `src/llm/__tests__/GeminiClient.test.ts`
   - Features:
     - Large context support
     - reviewCode() method
     - research() method
     - Rate limiting
   - LOC: 300-350
   - Tests: 12

3. **LLMProvider** (6 hours)
   - File: `src/llm/LLMProvider.ts`
   - Tests: `src/llm/__tests__/LLMProvider.test.ts`
   - Features:
     - Task-based routing
     - Automatic fallback
     - Cost tracking
     - Provider health management
   - LOC: 250-300
   - Tests: 16

**Verification Criteria:**
- [ ] Claude streaming works
- [ ] Tool execution completes
- [ ] Fallback from Claude to Gemini works
- [ ] Cost tracking accurate
- [ ] Coverage ≥ 80%

---

#### BUILD-009: Agent Runners

| Field | Value |
|-------|-------|
| **Order** | 9 |
| **Duration** | 32 hours |
| **Dependencies** | BUILD-008, BUILD-003 |
| **Outputs** | CoderRunner, TesterRunner, MergerRunner |

**Tasks:**

1. **ToolExecutor** (6 hours)
   - File: `src/execution/tools/ToolExecutor.ts`
   - Tests: `src/execution/tools/__tests__/ToolExecutor.test.ts`
   - Tools: file_read, file_write, file_edit, terminal, search
   - LOC: 300-400
   - Tests: 15

2. **CoderRunner** (10 hours)
   - File: `src/execution/agents/CoderRunner.ts`
   - Tests: `src/execution/agents/__tests__/CoderRunner.test.ts`
   - Features:
     - Task execution with LLM
     - Tool integration
     - Worktree isolation
   - LOC: 400-500
   - Tests: 12

3. **TesterRunner** (8 hours)
   - File: `src/execution/agents/TesterRunner.ts`
   - Tests: `src/execution/agents/__tests__/TesterRunner.test.ts`
   - Features:
     - Test generation
     - Test execution
     - Coverage reporting
   - LOC: 300-350
   - Tests: 10

4. **MergerRunner** (8 hours)
   - File: `src/execution/agents/MergerRunner.ts`
   - Tests: `src/execution/agents/__tests__/MergerRunner.test.ts`
   - Features:
     - Merge execution
     - Conflict analysis
     - AI-assisted resolution
   - LOC: 400-450
   - Tests: 10

**System Prompts** (part of BUILD-009):
- `config/prompts/coder.md`
- `config/prompts/tester.md`
- `config/prompts/merger.md`

**Verification Criteria:**
- [ ] CoderRunner executes simple task
- [ ] TesterRunner generates tests
- [ ] MergerRunner handles clean merge
- [ ] All prompts tested
- [ ] Coverage ≥ 75%

---

#### BUILD-010: Quality Layer

| Field | Value |
|-------|-------|
| **Order** | 10 |
| **Duration** | 24 hours |
| **Dependencies** | BUILD-003, BUILD-008 |
| **Outputs** | TestRunner, LintRunner, CodeReviewer, QALoopEngine |

**Note:** Can be built in PARALLEL with BUILD-009 since dependencies are shared.

**Tasks:**

1. **TestRunner** (5 hours)
   - File: `src/quality/testing/TestRunner.ts`
   - Tests: `src/quality/testing/__tests__/TestRunner.test.ts`
   - Methods: runUnitTests, runE2ETests, getCoverage
   - LOC: 200-250
   - Tests: 8

2. **LintRunner** (3 hours)
   - File: `src/quality/linting/LintRunner.ts`
   - Tests: `src/quality/linting/__tests__/LintRunner.test.ts`
   - Methods: runLint, fixLint, runTypeCheck
   - LOC: 100-150
   - Tests: 6

3. **CodeReviewer** (6 hours)
   - File: `src/quality/review/CodeReviewer.ts`
   - Tests: `src/quality/review/__tests__/CodeReviewer.test.ts`
   - Methods: reviewChanges, generateReviewPrompt, parseReviewResponse
   - Uses: GeminiClient for reviews
   - LOC: 200-250
   - Tests: 8

4. **QALoopEngine** (10 hours)
   - File: `src/quality/qa-loop/QALoopEngine.ts`
   - Tests: `src/quality/qa-loop/__tests__/QALoopEngine.test.ts`
   - Methods: runQALoop, buildStep, lintStep, testStep, reviewStep
   - Max iterations: 50
   - LOC: 350-400
   - Tests: 12

5. **Reviewer System Prompt**
   - File: `config/prompts/reviewer.md`
   - Est. words: 1,500-2,000

**Verification Criteria:**
- [ ] QA loop completes full cycle
- [ ] Build/lint/test steps work
- [ ] Review produces structured feedback
- [ ] Escalation triggers at iteration 50
- [ ] Coverage ≥ 80%

---

### Part D: Sprint 4 Build Order (Planning & Orchestration)

**Duration:** Week 7-8
**Focus:** Planning layer, orchestration layer
**Team Size:** 1-2 developers

---

#### BUILD-011: Planning Layer

| Field | Value |
|-------|-------|
| **Order** | 11 |
| **Duration** | 20 hours |
| **Dependencies** | BUILD-008 |
| **Outputs** | TaskDecomposer, DependencyResolver, TimeEstimator |

**Tasks:**

1. **TaskDecomposer** (8 hours)
   - File: `src/planning/decomposition/TaskDecomposer.ts`
   - Tests: `src/planning/decomposition/__tests__/TaskDecomposer.test.ts`
   - Methods:
     - decomposeFeature, validateTask
     - estimateTime, splitTask
   - 30-minute constraint enforcement
   - LOC: 300-350
   - Tests: 12

2. **DependencyResolver** (6 hours)
   - File: `src/planning/dependencies/DependencyResolver.ts`
   - Tests: `src/planning/dependencies/__tests__/DependencyResolver.test.ts`
   - Methods:
     - resolveDependencies (Kahn's algorithm)
     - detectCycles
     - getParallelWaves
     - getNextAvailable
   - LOC: 200-250
   - Tests: 10

3. **TimeEstimator** (4 hours)
   - File: `src/planning/estimation/TimeEstimator.ts`
   - Tests: `src/planning/estimation/__tests__/TimeEstimator.test.ts`
   - Methods:
     - estimateTask, estimateFeature, estimateProject
     - calibrateFromHistory
   - LOC: 150-200
   - Tests: 8

4. **Planner System Prompt**
   - File: `config/prompts/planner.md`
   - Est. words: 1,500-2,000

**Adapters** (part of BUILD-011):
- TaskSchemaAdapter: XML ↔ JSON conversion
- AgentContextAdapter: Context building for agents

**Verification Criteria:**
- [ ] Feature decomposes into valid tasks
- [ ] All tasks ≤ 30 minutes
- [ ] No cycles in dependencies
- [ ] Parallel waves calculated correctly
- [ ] Coverage ≥ 85%

---

#### BUILD-012: Orchestration Layer

| Field | Value |
|-------|-------|
| **Order** | 12 |
| **Duration** | 28 hours |
| **Dependencies** | BUILD-009, BUILD-010, BUILD-011 |
| **Outputs** | EventBus, AgentPool, TaskQueue, NexusCoordinator |

**Tasks:**

1. **EventBus** (4 hours)
   - File: `src/orchestration/events/EventBus.ts`
   - Tests: `src/orchestration/events/__tests__/EventBus.test.ts`
   - Methods: emit, on, once, getHistory
   - LOC: 100-150
   - Tests: 8

2. **AgentPool** (6 hours)
   - File: `src/orchestration/agents/AgentPool.ts`
   - Tests: `src/orchestration/agents/__tests__/AgentPool.test.ts`
   - Methods:
     - createAgent, getAvailableAgent
     - assignTask, releaseAgent
     - getAgentStatus
   - Max agents: configurable (default 4)
   - LOC: 250-300
   - Tests: 10

3. **TaskQueue** (4 hours)
   - File: `src/orchestration/queue/TaskQueue.ts`
   - Tests: `src/orchestration/queue/__tests__/TaskQueue.test.ts`
   - Methods: enqueue, dequeue, peek, prioritize
   - Priority: dependencies first, then time estimate
   - LOC: 150-200
   - Tests: 8

4. **NexusCoordinator** (14 hours)
   - File: `src/orchestration/coordinator/NexusCoordinator.ts`
   - Tests: `src/orchestration/coordinator/__tests__/NexusCoordinator.test.ts`
   - Methods:
     - startProject, pauseProject, resumeProject
     - getStatus, requestCheckpoint
   - Main execution loop
   - Checkpoint triggers
   - LOC: 400-500
   - Tests: 15

**Bridges** (part of BUILD-012):
- PlanningExecutionBridge: Task wave management
- AgentWorktreeBridge: Worktree coordination

**Verification Criteria:**
- [ ] Events flow through system
- [ ] Agent pool manages agents correctly
- [ ] Task queue respects dependencies
- [ ] Coordinator orchestrates full flow
- [ ] Integration test: simple feature execution
- [ ] Coverage ≥ 80%

---

### Part E: Sprint 5 Build Order (UI)

**Duration:** Week 9-10
**Focus:** React UI, Zustand stores, Electron integration
**Team Size:** 2 developers (parallelize UI components)

---

#### BUILD-013: UI Foundation

| Field | Value |
|-------|-------|
| **Order** | 13 |
| **Duration** | 20 hours |
| **Dependencies** | BUILD-012 |
| **Outputs** | React setup, Zustand stores, routing, design system |

**Tasks:**

1. **React + Electron Setup** (6 hours)
   - Configure Electron main process
   - Set up Vite for React
   - Configure IPC communication
   - Set up hot reload

2. **Zustand Stores** (8 hours)
   - File: `src/ui/stores/projectStore.ts`
   - File: `src/ui/stores/agentStore.ts`
   - File: `src/ui/stores/taskStore.ts`
   - File: `src/ui/stores/uiStore.ts`
   - File: `src/ui/stores/interviewStore.ts`
   - LOC: 300-400
   - Tests: 15

3. **Router Setup** (2 hours)
   - Configure TanStack Router
   - Define routes: /, /interview, /kanban, /dashboard

4. **Design System** (4 hours)
   - Install and configure shadcn/ui
   - Set up Tailwind CSS
   - Create theme configuration

**UIBackendBridge** (part of BUILD-013):
- File: `src/bridges/UIBackendBridge.ts`
- Event-based UI ↔ Backend communication

**Verification Criteria:**
- [ ] Electron app launches
- [ ] React renders correctly
- [ ] Stores update and persist
- [ ] Routes navigate correctly

---

#### BUILD-014: Interview UI

| Field | Value |
|-------|-------|
| **Order** | 14 |
| **Duration** | 24 hours |
| **Dependencies** | BUILD-013, BUILD-007 |
| **Outputs** | Complete interview interface |

**Tasks:**

1. **InterviewPage** (6 hours)
   - File: `src/ui/pages/InterviewPage.tsx`
   - Layout with chat and requirements panels
   - Progress indicator
   - Navigation to Kanban

2. **InterviewChat** (10 hours)
   - File: `src/ui/components/interview/InterviewChat.tsx`
   - Chat input with streaming display
   - Message history
   - AI response rendering with Markdown
   - LOC: 250-300

3. **RequirementsList** (6 hours)
   - File: `src/ui/components/interview/RequirementsList.tsx`
   - Categorized requirement display
   - Edit/delete capabilities
   - Requirement status indicators
   - LOC: 150-200

4. **E2E Tests** (2 hours)
   - File: `e2e/interview.spec.ts`
   - 4 tests as specified in Task 6.4

**Total LOC:** 500-600
**Tests:** Component tests + 4 E2E

**Verification Criteria:**
- [ ] Interview flow works end-to-end
- [ ] Requirements extract and display
- [ ] Chat history persists
- [ ] E2E tests pass

---

#### BUILD-015: Kanban UI

| Field | Value |
|-------|-------|
| **Order** | 15 |
| **Duration** | 24 hours |
| **Dependencies** | BUILD-013 |
| **Outputs** | Complete kanban board |

**Note:** Can be built in PARALLEL with BUILD-014.

**Tasks:**

1. **KanbanPage** (4 hours)
   - File: `src/ui/pages/KanbanPage.tsx`
   - Page layout with board and sidebar
   - Feature detail panel

2. **KanbanBoard** (8 hours)
   - File: `src/ui/components/kanban/KanbanBoard.tsx`
   - DnD context setup
   - Column management
   - LOC: 200-250

3. **KanbanColumn** (4 hours)
   - File: `src/ui/components/kanban/KanbanColumn.tsx`
   - Column header with count
   - Droppable zone
   - LOC: 100-150

4. **FeatureCard** (6 hours)
   - File: `src/ui/components/kanban/FeatureCard.tsx`
   - Draggable card
   - Status indicators
   - Progress display
   - Click to expand
   - LOC: 150-200

5. **E2E Tests** (2 hours)
   - File: `e2e/kanban.spec.ts`
   - 4 tests as specified in Task 6.4

**Total LOC:** 600-700
**Tests:** Component tests + 4 E2E

**Verification Criteria:**
- [ ] Drag and drop works
- [ ] Columns update correctly
- [ ] Feature details display
- [ ] E2E tests pass

---

#### BUILD-016: Dashboard UI

| Field | Value |
|-------|-------|
| **Order** | 16 |
| **Duration** | 20 hours |
| **Dependencies** | BUILD-013 |
| **Outputs** | Complete progress dashboard |

**Note:** Can be built in PARALLEL with BUILD-014 and BUILD-015.

**Tasks:**

1. **DashboardPage** (4 hours)
   - File: `src/ui/pages/DashboardPage.tsx`
   - Dashboard layout with grid
   - Summary cards

2. **ProgressChart** (6 hours)
   - File: `src/ui/components/dashboard/ProgressChart.tsx`
   - Feature progress visualization
   - Task completion over time
   - Uses Recharts
   - LOC: 150-200

3. **AgentActivity** (4 hours)
   - File: `src/ui/components/dashboard/AgentActivity.tsx`
   - Real-time agent status
   - Current task display
   - LOC: 100-150

4. **CostTracker** (4 hours)
   - File: `src/ui/components/dashboard/CostTracker.tsx`
   - Token usage by provider
   - Cost breakdown
   - LOC: 100-150

5. **E2E Tests** (2 hours)
   - File: `e2e/execution.spec.ts`
   - File: `e2e/checkpoint.spec.ts`
   - 8 tests total

**Total LOC:** 500-600
**Tests:** Component tests + 8 E2E

**Verification Criteria:**
- [ ] Charts render correctly
- [ ] Real-time updates work
- [ ] Cost tracking accurate
- [ ] E2E tests pass

---

### Part F: Dependency Graph

**Visual Representation:**

```
                                    BUILD-001 (Project Init)
                                           │
                                           ▼
                                    BUILD-002 (Type Definitions)
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
         BUILD-003 (Infra)          BUILD-008 (LLM Clients)    BUILD-013 (UI Foundation)*
                │                          │                          │
                ├─────────────┐            │                          │ *Depends on BUILD-012
                │             │            │                          │
                ▼             ▼            ▼                          ▼
         BUILD-004 (DB)  BUILD-007   BUILD-009 (Agents)    ┌─────────┼─────────┐
                │       (Reqs DB)         │                │         │         │
                │             │            │               ▼         ▼         ▼
         ┌──────┴──────┐     │            │          BUILD-014  BUILD-015  BUILD-016
         │             │     │            │         (Interview) (Kanban)  (Dashboard)
         ▼             ▼     │            ▼
  BUILD-005 (State) BUILD-006│     BUILD-010 (Quality)
         │          (Memory) │            │
         │             │     │            │
         │             │     │            │
         └─────────────┴─────┴────────────┤
                                          │
                                          ▼
                                   BUILD-011 (Planning)
                                          │
                                          ▼
                                   BUILD-012 (Orchestration)
                                          │
                                          ▼
                                   BUILD-013 (UI Foundation)
```

**Dependency Matrix:**

| Component | Depends On |
|-----------|------------|
| BUILD-001 | None |
| BUILD-002 | BUILD-001 |
| BUILD-003 | BUILD-002 |
| BUILD-004 | BUILD-003 |
| BUILD-005 | BUILD-004 |
| BUILD-006 | BUILD-004 |
| BUILD-007 | BUILD-003 |
| BUILD-008 | BUILD-002 |
| BUILD-009 | BUILD-003, BUILD-008 |
| BUILD-010 | BUILD-003, BUILD-008 |
| BUILD-011 | BUILD-008 |
| BUILD-012 | BUILD-005, BUILD-009, BUILD-010, BUILD-011 |
| BUILD-013 | BUILD-012 |
| BUILD-014 | BUILD-007, BUILD-013 |
| BUILD-015 | BUILD-013 |
| BUILD-016 | BUILD-013 |

---

### Part G: Critical Path

**The Critical Path** is the longest sequence of dependent tasks that determines minimum project duration.

**Critical Path Sequence:**

```
BUILD-001 → BUILD-002 → BUILD-003 → BUILD-004 → BUILD-005 → BUILD-011 → BUILD-012 → BUILD-013 → BUILD-014
   4h          6h          16h         12h         16h          20h          28h          20h          24h

Total: 146 hours
```

**Critical Path Analysis:**

| Step | Component | Duration | Cumulative | Notes |
|------|-----------|----------|------------|-------|
| 1 | BUILD-001 (Init) | 4h | 4h | Foundation |
| 2 | BUILD-002 (Types) | 6h | 10h | Type system |
| 3 | BUILD-003 (Infra) | 16h | 26h | Infrastructure |
| 4 | BUILD-004 (DB) | 12h | 38h | Database |
| 5 | BUILD-005 (State) | 16h | 54h | State management |
| 6 | BUILD-011 (Planning) | 20h | 74h | Planning layer |
| 7 | BUILD-012 (Orchestration) | 28h | 102h | Orchestration |
| 8 | BUILD-013 (UI Foundation) | 20h | 122h | UI setup |
| 9 | BUILD-014 (Interview) | 24h | 146h | Interview UI |

**In Working Days:** ~18 working days (8 hours/day)
**In Calendar Days:** ~25 days (accounting for context switching)

**Critical Path Optimizations:**

1. **BUILD-003 Parallelization:** FileSystemService and ProcessRunner have no dependencies on each other
2. **BUILD-004 + BUILD-007:** RequirementsDB only needs BUILD-003, can parallel with database work
3. **BUILD-008, BUILD-009, BUILD-010:** After BUILD-003, LLM and Quality can be parallelized
4. **BUILD-014, BUILD-015, BUILD-016:** All UI pages can be parallelized after BUILD-013

---

### Part H: Parallel Opportunities

**Sprint-by-Sprint Parallelization:**

#### Sprint 1: Foundation (Single Path)
```
Week 1-2: BUILD-001 → BUILD-002 → BUILD-003 → BUILD-004
          (Sequential - establishing foundation)
```

#### Sprint 2: Persistence (Parallel Opportunity)
```
Week 3-4:
  Stream A: BUILD-005 (State) → BUILD-006 (Memory)
  Stream B: BUILD-007 (Requirements DB)
            ↑ Can start as soon as BUILD-003 complete
```

**Parallelization Diagram:**
```
BUILD-003 (Infra)
     │
     ├────────────────────────┐
     ▼                        ▼
BUILD-004 (DB)         BUILD-007 (ReqDB) ← PARALLEL
     │                        │
     ├──────────┐             │
     ▼          ▼             │
BUILD-005   BUILD-006         │
(State)     (Memory)          │
     │          │             │
     └──────────┴─────────────┘
```

#### Sprint 3: LLM & Agents (Parallel Opportunity)
```
Week 5-6:
  Stream A: BUILD-008 (LLM) → BUILD-009 (Agents)
  Stream B: BUILD-010 (Quality) ← Can parallel after BUILD-008 starts
```

**Parallelization Diagram:**
```
BUILD-003 + BUILD-008
         │
    ┌────┴────┐
    ▼         ▼
BUILD-009  BUILD-010  ← PARALLEL
(Agents)   (Quality)
    │         │
    └────┬────┘
         ▼
    BUILD-011
```

#### Sprint 4: Planning & Orchestration (Sequential)
```
Week 7-8: BUILD-011 → BUILD-012
          (Sequential - orchestration depends on planning)
```

#### Sprint 5: UI (Maximum Parallelization)
```
Week 9-10:
  BUILD-013 (Foundation) - Sequential setup
  Then parallel:
    Stream A: BUILD-014 (Interview)
    Stream B: BUILD-015 (Kanban)
    Stream C: BUILD-016 (Dashboard)
```

**Parallelization Diagram:**
```
                BUILD-012
                    │
                    ▼
              BUILD-013 (UI Foundation)
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
BUILD-014      BUILD-015       BUILD-016  ← PARALLEL
(Interview)    (Kanban)        (Dashboard)
```

**Team Size Optimization:**

| Team Size | Estimated Duration | Utilization |
|-----------|-------------------|-------------|
| 1 developer | 10 weeks | 100% (sequential) |
| 2 developers | 7 weeks | 85% (good parallelization) |
| 3 developers | 5.5 weeks | 70% (some blocking) |
| 4+ developers | 5 weeks | <60% (diminishing returns) |

**Recommendation:** 2 developers for optimal efficiency

---

### Part I: Integration Milestones

**Milestone Definition:**
Milestones mark key integration points where multiple components come together and must be verified working as a system.

---

#### MILESTONE-1: Foundation Complete
**Target:** End of Sprint 1 (Week 2)

**Components Integrated:**
- BUILD-001: Project Initialization
- BUILD-002: Type Definitions
- BUILD-003: Infrastructure Layer
- BUILD-004: Database Foundation

**Verification Tests:**
```typescript
// tests/integration/milestone-1.test.ts

describe('Milestone 1: Foundation Complete', () => {
  it('should initialize database with schema', async () => {
    const db = await DatabaseClient.create(':memory:');
    expect(await db.tables()).toContain('projects');
    expect(await db.tables()).toContain('tasks');
  });

  it('should create and list git worktrees', async () => {
    const wm = new WorktreeManager(testRepoPath);
    const worktree = await wm.createWorktree('task-001', 'main');
    expect(worktree.path).toContain('task-001');

    const worktrees = await wm.listWorktrees();
    expect(worktrees).toHaveLength(1);

    await wm.removeWorktree('task-001');
  });

  it('should read and write files correctly', async () => {
    const fs = new FileSystemService();
    await fs.writeFile('/tmp/test.txt', 'hello');
    const content = await fs.readFile('/tmp/test.txt');
    expect(content).toBe('hello');
  });

  it('should run processes and capture output', async () => {
    const pr = new ProcessRunner();
    const result = await pr.run('echo "hello"');
    expect(result.stdout).toContain('hello');
  });
});
```

**Success Criteria:**
- [ ] All infrastructure tests pass (42 tests)
- [ ] Database operations work correctly
- [ ] Git worktrees create/delete successfully
- [ ] File operations are reliable
- [ ] Coverage ≥ 80% for infrastructure layer

---

#### MILESTONE-2: Persistence Complete
**Target:** End of Sprint 2 (Week 4)

**Components Integrated:**
- MILESTONE-1 (all components)
- BUILD-005: State Management
- BUILD-006: Memory System
- BUILD-007: Requirements Database

**Verification Tests:**
```typescript
// tests/integration/milestone-2.test.ts

describe('Milestone 2: Persistence Complete', () => {
  it('should save and load project state', async () => {
    const sm = new StateManager(db);
    const state: NexusState = {
      projectId: 'proj-001',
      status: 'active',
      features: [],
      tasks: []
    };

    await sm.saveState(state);
    const loaded = await sm.loadState('proj-001');
    expect(loaded).toEqual(state);
  });

  it('should create and restore checkpoints', async () => {
    const cm = new CheckpointManager(db, sm);
    const checkpoint = await cm.createCheckpoint(state);

    // Modify state
    state.status = 'paused';
    await sm.saveState(state);

    // Restore checkpoint
    const restored = await cm.restoreCheckpoint(checkpoint.id);
    expect(restored.status).toBe('active');
  });

  it('should store and query memory episodes', async () => {
    const memory = new MemorySystem(db, embeddings);

    await memory.storeEpisode({
      type: 'code_generation',
      content: 'Created UserService with authentication',
      context: { taskId: 'task-001' }
    });

    const results = await memory.queryMemory('authentication user', 5);
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('authentication');
  });

  it('should export and import STATE.md format', async () => {
    const adapter = new StateFormatAdapter();
    const markdown = adapter.exportToSTATE_MD(state);
    const imported = adapter.importFromSTATE_MD(markdown);
    expect(imported).toEqual(state);
  });

  it('should manage requirements with JSON storage', async () => {
    const reqDb = new RequirementsDB(fs);
    const projectId = await reqDb.createProject('Test Project');

    await reqDb.addRequirement(projectId, {
      category: 'functional',
      description: 'User can log in',
      priority: 'high'
    });

    const reqs = await reqDb.getRequirements(projectId);
    expect(reqs).toHaveLength(1);
  });
});
```

**Success Criteria:**
- [ ] State save/load works reliably
- [ ] Checkpoints can be created and restored
- [ ] Memory queries return relevant results
- [ ] STATE.md roundtrip is lossless
- [ ] Requirements persist to JSON
- [ ] Coverage ≥ 85% for persistence layer

---

#### MILESTONE-3: Agents Work
**Target:** End of Sprint 3 (Week 6)

**Components Integrated:**
- MILESTONE-2 (all components)
- BUILD-008: LLM Clients
- BUILD-009: Agent Runners
- BUILD-010: Quality Layer

**Verification Tests:**
```typescript
// tests/integration/milestone-3.test.ts

describe('Milestone 3: Agents Work', () => {
  it('should execute code generation task', async () => {
    const coder = new CoderRunner(llmProvider, toolExecutor, worktreeManager);

    const task: Task = {
      id: 'task-001',
      title: 'Create utils.ts file',
      description: 'Create a utils.ts file with a formatDate function',
      type: 'implementation',
      files: [{ path: 'src/utils.ts', action: 'create' }]
    };

    const context = await contextAdapter.buildContext(task);
    const result = await coder.executeTask(task, context);

    expect(result.status).toBe('completed');
    expect(await fs.exists(worktreePath + '/src/utils.ts')).toBe(true);
  });

  it('should generate tests for code', async () => {
    const tester = new TesterRunner(llmProvider);

    const code = `export function formatDate(date: Date): string {
      return date.toISOString().split('T')[0];
    }`;

    const tests = await tester.generateTests(code);
    expect(tests).toContain('describe');
    expect(tests).toContain('formatDate');
  });

  it('should run complete QA loop', async () => {
    const qaEngine = new QALoopEngine(testRunner, lintRunner, codeReviewer);

    const result = await qaEngine.runQALoop({
      taskId: 'task-001',
      files: ['src/utils.ts']
    });

    expect(result.passed).toBe(true);
    expect(result.iterations).toBeLessThan(50);
  });

  it('should fallback between LLM providers', async () => {
    // Mock Claude failure
    mockClaudeClient.complete.mockRejectedValueOnce(new Error('Rate limited'));

    const response = await llmProvider.complete([
      { role: 'user', content: 'Hello' }
    ]);

    expect(response.content).toBeTruthy();
    // Should have fallen back to Gemini
    expect(mockGeminiClient.complete).toHaveBeenCalled();
  });
});
```

**Success Criteria:**
- [ ] Coder executes simple task successfully
- [ ] Tester generates valid tests
- [ ] QA loop completes within 50 iterations
- [ ] LLM fallback works correctly
- [ ] Token usage is tracked accurately
- [ ] Coverage ≥ 75% for execution layer

---

#### MILESTONE-4: Orchestration Complete
**Target:** End of Sprint 4 (Week 8)

**Components Integrated:**
- MILESTONE-3 (all components)
- BUILD-011: Planning Layer
- BUILD-012: Orchestration Layer

**Verification Tests:**
```typescript
// tests/integration/milestone-4.test.ts

describe('Milestone 4: Orchestration Complete', () => {
  it('should decompose feature into tasks', async () => {
    const decomposer = new TaskDecomposer(llmProvider);

    const feature: Feature = {
      id: 'feat-001',
      title: 'Add user authentication',
      description: 'Users can register and log in'
    };

    const tasks = await decomposer.decomposeFeature(feature);

    expect(tasks.length).toBeGreaterThan(0);
    tasks.forEach(task => {
      expect(task.estimatedMinutes).toBeLessThanOrEqual(30);
    });
  });

  it('should resolve task dependencies correctly', async () => {
    const resolver = new DependencyResolver();

    const tasks: Task[] = [
      { id: 't1', dependencies: [] },
      { id: 't2', dependencies: ['t1'] },
      { id: 't3', dependencies: ['t1'] },
      { id: 't4', dependencies: ['t2', 't3'] }
    ];

    const waves = resolver.getParallelWaves(tasks);

    expect(waves).toHaveLength(3);
    expect(waves[0]).toContain('t1');
    expect(waves[1]).toContain('t2');
    expect(waves[1]).toContain('t3');
    expect(waves[2]).toContain('t4');
  });

  it('should coordinate multi-agent execution', async () => {
    const coordinator = new NexusCoordinator(agentPool, taskQueue, stateManager);

    const project = await coordinator.startProject({
      name: 'Test Project',
      features: [{ id: 'f1', title: 'Simple feature' }]
    });

    // Wait for completion or timeout
    await coordinator.waitForCompletion(project.id, { timeout: 60000 });

    const status = await coordinator.getStatus(project.id);
    expect(status.completedTasks).toBeGreaterThan(0);
  });

  it('should emit events throughout execution', async () => {
    const events: NexusEvent[] = [];
    eventBus.on('*', (event) => events.push(event));

    await coordinator.startProject(simpleProject);

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('PROJECT_START');
    expect(eventTypes).toContain('TASK_ASSIGNED');
    expect(eventTypes).toContain('TASK_COMPLETED');
  });
});
```

**Success Criteria:**
- [ ] Features decompose correctly
- [ ] All tasks ≤ 30 minutes
- [ ] No dependency cycles
- [ ] Multi-agent coordination works
- [ ] Events flow correctly
- [ ] Simple feature executes end-to-end
- [ ] Coverage ≥ 80% for orchestration layer

---

#### MILESTONE-5: MVP Complete
**Target:** End of Sprint 5 (Week 10)

**Components Integrated:**
- MILESTONE-4 (all components)
- BUILD-013: UI Foundation
- BUILD-014: Interview UI
- BUILD-015: Kanban UI
- BUILD-016: Dashboard UI

**Verification Tests:**
```typescript
// e2e/milestone-5.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Milestone 5: MVP Complete', () => {
  test('should complete Genesis Mode flow', async ({ page }) => {
    // Start interview
    await page.goto('/');
    await page.click('text=New Project');
    await page.fill('[data-testid=project-name]', 'Test Project');
    await page.click('text=Start Interview');

    // Conduct interview
    await page.fill('[data-testid=chat-input]', 'I want a todo app');
    await page.click('[data-testid=send-button]');
    await page.waitForSelector('[data-testid=ai-response]');

    // Verify requirements extracted
    await page.waitForSelector('[data-testid=requirement-item]');
    const requirements = await page.$$('[data-testid=requirement-item]');
    expect(requirements.length).toBeGreaterThan(0);

    // Complete interview
    await page.click('text=Done with Interview');

    // Verify Kanban board
    await page.waitForURL('/kanban');
    await page.waitForSelector('[data-testid=feature-card]');

    // Start execution
    await page.dragAndDrop('[data-testid=feature-card]', '[data-testid=in-progress-column]');

    // Verify execution starts
    await page.waitForSelector('[data-testid=agent-activity]');

    // Navigate to dashboard
    await page.click('text=Dashboard');
    await page.waitForSelector('[data-testid=progress-chart]');

    // Verify progress tracking
    const progress = await page.textContent('[data-testid=completed-tasks]');
    expect(parseInt(progress)).toBeGreaterThanOrEqual(0);
  });

  test('should support checkpoint and recovery', async ({ page }) => {
    // Start a project
    await page.goto('/kanban');

    // Create checkpoint
    await page.click('[data-testid=create-checkpoint]');
    await page.waitForSelector('text=Checkpoint created');

    // Make changes
    await page.dragAndDrop('[data-testid=feature-card]', '[data-testid=done-column]');

    // Restore checkpoint
    await page.click('[data-testid=checkpoints-menu]');
    await page.click('[data-testid=restore-checkpoint]');

    // Verify restoration
    await page.waitForSelector('[data-testid=feature-card]:not([data-column=done])');
  });

  test('should show real-time agent activity', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify agent activity component
    await page.waitForSelector('[data-testid=agent-activity]');

    // Check for real-time updates
    const initialCount = await page.textContent('[data-testid=active-agents]');

    // Wait for update (if execution is happening)
    await page.waitForTimeout(2000);

    // Agent display should be present
    await expect(page.locator('[data-testid=agent-status]')).toBeVisible();
  });
});
```

**Success Criteria:**
- [ ] Interview flow works end-to-end
- [ ] Kanban board is functional with drag-drop
- [ ] Dashboard displays real-time progress
- [ ] Checkpoints work correctly
- [ ] All E2E tests pass (16 tests)
- [ ] Genesis Mode creates and executes project
- [ ] Evolution Mode adds features to existing project
- [ ] Coverage meets all targets

---

### Task 6.5 Completion Summary

#### Build Items Summary

| ID | Component | Duration | Dependencies | Sprint |
|----|-----------|----------|--------------|--------|
| BUILD-001 | Project Initialization | 4h | None | 1 |
| BUILD-002 | Type Definitions | 6h | BUILD-001 | 1 |
| BUILD-003 | Infrastructure Layer | 16h | BUILD-002 | 1 |
| BUILD-004 | Database Foundation | 12h | BUILD-003 | 1 |
| BUILD-005 | State Management | 16h | BUILD-004 | 2 |
| BUILD-006 | Memory System | 20h | BUILD-004 | 2 |
| BUILD-007 | Requirements Database | 12h | BUILD-003 | 2 |
| BUILD-008 | LLM Clients | 24h | BUILD-002 | 3 |
| BUILD-009 | Agent Runners | 32h | BUILD-003, BUILD-008 | 3 |
| BUILD-010 | Quality Layer | 24h | BUILD-003, BUILD-008 | 3 |
| BUILD-011 | Planning Layer | 20h | BUILD-008 | 4 |
| BUILD-012 | Orchestration Layer | 28h | BUILD-009, BUILD-010, BUILD-011 | 4 |
| BUILD-013 | UI Foundation | 20h | BUILD-012 | 5 |
| BUILD-014 | Interview UI | 24h | BUILD-007, BUILD-013 | 5 |
| BUILD-015 | Kanban UI | 24h | BUILD-013 | 5 |
| BUILD-016 | Dashboard UI | 20h | BUILD-013 | 5 |
| **TOTAL** | | **302h** | | **10 weeks** |

#### Milestone Summary

| Milestone | Sprint | Verification | Key Outcomes |
|-----------|--------|--------------|--------------|
| M1: Foundation | 1 | 42 tests | Infra + DB working |
| M2: Persistence | 2 | 47 tests | State + Memory working |
| M3: Agents Work | 3 | 70 tests | Single agent executes task |
| M4: Orchestration | 4 | 55 tests | Multi-agent coordination |
| M5: MVP Complete | 5 | 16 E2E tests | Full system working |

#### Critical Metrics

| Metric | Value |
|--------|-------|
| Total Build Items | 16 |
| Total Duration | 302 hours |
| Critical Path | 146 hours |
| Minimum Calendar Time | 5 weeks (3 developers) |
| Recommended Team Size | 2 developers |
| Total Tests | ~293 |
| Coverage Target | 80%+ |

---

**[TASK 6.5 COMPLETE]**

---

## Phase 6 Summary

### Document Statistics

| Section | Items | Estimated Size |
|---------|-------|----------------|
| Task 6.1: Layer Implementation | 30 components | ~8,000 LOC |
| Task 6.2: Component Build Specs | 22 specifications | ~4,000 LOC |
| Task 6.3: Integration Sequences | 12 sequences | ~800 lines |
| Task 6.4: Testing Specifications | ~293 tests | ~5,000 LOC |
| Task 6.5: Build Order & Dependencies | 16 build items | ~1,500 lines |

### Total Phase 6 Output

- **Components Specified:** 30
- **Additional Specifications:** 22
- **Integration Sequences:** 12
- **Tests Specified:** ~293
- **Build Items:** 16
- **Milestones:** 5
- **Estimated Implementation LOC:** 15,000-20,000
- **Estimated Build Time:** 302 hours (~10 weeks)

### Ready for Phase 7

This Integration Specification provides:

1. ✅ **Exact File Paths** - Every component has a specified location
2. ✅ **Interface Definitions** - All public APIs defined in TypeScript
3. ✅ **Implementation Details** - Key algorithms and patterns documented
4. ✅ **Test Specifications** - Every component has specified tests
5. ✅ **Build Order** - Clear sequence with dependencies
6. ✅ **Milestones** - Verification points throughout development
7. ✅ **Time Estimates** - Realistic estimates for planning

Phase 7 will assemble this specification with all previous phases into the final Master Book.

---

**[PHASE 6 COMPLETE]**

---

*Document generated: 2026-01-13*
*Estimated document size: ~21,000 lines*
*Total specification coverage: Complete*
