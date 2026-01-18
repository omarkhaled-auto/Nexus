# Phase 5: Architecture Blueprint

> **Document Type:** Complete System Architecture Specification
> **Purpose:** Define HOW Nexus is built - all layers, components, data models, and technology decisions
> **Input:**
>   - Phase 1: Feature Catalog (2,871 lines - 180+ features)
>   - Phase 2: Requirements Mapping (133 requirements, 17 gaps)
>   - Phase 3: Compatibility Matrix (12 conflicts, 20 synergies)
>   - Phase 4: Gap Analysis (25 gaps, 10 specs)
> **Created:** 2026-01-13
> **Status:** COMPLETE

---

## Executive Summary

### Architecture Overview

Nexus is designed as a **7-layer architecture** that separates concerns while enabling seamless communication between components. The architecture follows these core principles:

1. **Layer Isolation** - Each layer has clear responsibilities and interfaces
2. **Event-Driven Communication** - Loose coupling through events and message passing
3. **Parallel Execution** - Multi-agent coordination through git worktrees
4. **Atomic Tasks** - No task exceeds 30 minutes of execution time
5. **Persistence at Every Level** - State recovery from any failure point

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Management** | Zustand + GSD STATE.md | Simple, predictable, file-based recovery |
| **Agent Model** | 5 specialized agents | Clear responsibilities, optimal model selection |
| **Persistence** | SQLite + JSON files | No external dependencies, portable |
| **Git Strategy** | Worktrees per agent | True isolation, parallel execution |
| **Communication** | Event bus + Direct calls | Real-time UI updates, efficient execution |

### Technology Stack Summary

| Layer | Primary Technologies |
|-------|---------------------|
| **UI** | React 19, Zustand, shadcn/ui, Tailwind CSS |
| **Orchestration** | TypeScript, Event Emitter, Ralph ACP |
| **Planning** | GSD Task Decomposition, Kahn's Algorithm |
| **Execution** | Claude API, Auto-Claude QA Loop |
| **Quality** | Vitest, Playwright, ESLint |
| **Persistence** | SQLite (better-sqlite3), JSON files |
| **Infrastructure** | Git, Node.js 22, TypeScript 5.3+ |

---

## Task 5.1: System Architecture

### Layer Architecture (7 Layers)

The Nexus architecture consists of 7 distinct layers, each with specific responsibilities and interfaces:

```
+===============================================================================+
|                            NEXUS 7-LAYER ARCHITECTURE                          |
+===============================================================================+

     Layer 1: USER INTERFACE
     +-----------------------------------------------------------------------+
     |  Interview UI | Kanban Board | Progress Dashboard | Settings Panel    |
     +-----------------------------------------------------------------------+
                                    |
                                    v (Events + API Calls)
     Layer 2: ORCHESTRATION
     +-----------------------------------------------------------------------+
     |  Nexus Coordinator | Agent Pool | Task Queue | Event Bus              |
     +-----------------------------------------------------------------------+
                                    |
                                    v (Task Requests)
     Layer 3: PLANNING
     +-----------------------------------------------------------------------+
     |  Task Decomposer | Dependency Resolver | Time Estimator | Prioritizer |
     +-----------------------------------------------------------------------+
                                    |
                                    v (Executable Tasks)
     Layer 4: EXECUTION
     +-----------------------------------------------------------------------+
     |  QA Loop Engine | Agent Runners | Tool Executor | Code Generator      |
     +-----------------------------------------------------------------------+
                                    |
                                    v (Code Changes + Results)
     Layer 5: QUALITY
     +-----------------------------------------------------------------------+
     |  Test Runner | Code Reviewer | Linter | Build Verifier               |
     +-----------------------------------------------------------------------+
                                    |
                                    v (State Updates)
     Layer 6: PERSISTENCE
     +-----------------------------------------------------------------------+
     |  State Manager | Requirements DB | Memory System | Checkpoint Manager |
     +-----------------------------------------------------------------------+
                                    |
                                    v (File/Git Operations)
     Layer 7: INFRASTRUCTURE
     +-----------------------------------------------------------------------+
     |  Git Worktrees | File System | LSP/AST Tools | External APIs          |
     +-----------------------------------------------------------------------+
```

---

### Layer 1: User Interface Layer

#### Overview

The User Interface Layer provides all visual components for user interaction with Nexus. It supports both Genesis Mode (new projects) and Evolution Mode (existing projects).

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-UI-001 | InterviewUI | Conversational interface for Genesis Mode | GAP - To Build |
| COMP-UI-002 | KanbanBoard | Visual feature management for Evolution Mode | GAP - To Build |
| COMP-UI-003 | FeatureCard | Individual feature cards with progress | GAP - To Build |
| COMP-UI-004 | ProgressDashboard | Real-time build progress visualization | GAP - To Build |
| COMP-UI-005 | SettingsPanel | Configuration and preferences | GAP - To Build |
| COMP-UI-006 | AgentStatusGrid | Live agent activity display | GAP - To Build |
| COMP-UI-007 | RequirementsSidebar | Live requirement capture display | GAP - To Build |

#### Responsibilities

1. **User Input Capture** - Accept user requirements, feature descriptions, and commands
2. **State Visualization** - Display current project state, progress, and agent activity
3. **Workflow Navigation** - Guide users through Genesis/Evolution modes
4. **Real-time Updates** - Reflect system changes immediately via WebSocket/Events
5. **Human Checkpoints** - Present review requests and capture user decisions

#### Interfaces Exposed

**Upward (to User):**
- React component tree with responsive layout
- Real-time progress indicators
- Interactive Kanban drag-and-drop

**Downward (to Orchestration):**
```typescript
interface UIToOrchestration {
  // Project lifecycle
  startProject(config: ProjectConfig): Promise<Project>;
  pauseProject(projectId: string): Promise<void>;
  resumeProject(projectId: string): Promise<void>;

  // Feature management
  moveFeature(featureId: string, toColumn: ColumnState): Promise<void>;
  triggerExecution(featureId: string): Promise<void>;
  requestPlanning(featureId: string): Promise<void>;

  // Human checkpoints
  approveReview(reviewId: string): Promise<void>;
  requestChanges(reviewId: string, feedback: string): Promise<void>;

  // Subscriptions
  subscribeToEvents(callback: (event: NexusEvent) => void): Unsubscribe;
}
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework with Server Components |
| Zustand | 4.x | Lightweight state management |
| shadcn/ui | latest | Accessible component primitives |
| Tailwind CSS | 3.4+ | Utility-first styling |
| Framer Motion | 11.x | Animations and transitions |
| react-beautiful-dnd | 13.x | Kanban drag-and-drop |

#### Gap Components to Build

From Phase 4:
- **GAP-EVO-001:** KanbanBoard - 24-32 hours
- **GAP-EVO-002:** FeatureCard - 12-16 hours
- **GAP-EVO-003:** Drag-and-Drop - 8-12 hours
- **SPEC-UI-003:** InterviewInterface - 32-40 hours
- **SPEC-UI-004:** ProgressDashboard - 24-32 hours

---

### Layer 2: Orchestration Layer

#### Overview

The Orchestration Layer coordinates all agent activities, manages the task queue, and serves as the central nervous system of Nexus. It implements the Ralph ACP protocol for multi-provider support.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-ORC-001 | NexusCoordinator | Main orchestration loop | Adapt from Ralph |
| COMP-ORC-002 | AgentPool | Multi-agent management | Adapt from Auto-Claude |
| COMP-ORC-003 | TaskQueue | Priority-based task queue | New |
| COMP-ORC-004 | EventBus | Cross-layer event distribution | New |
| COMP-ORC-005 | SegmentRouter | GSD auto/checkpoint routing | Adapt from GSD |
| COMP-ORC-006 | WorkflowController | Mode-specific flow control | New |

#### Responsibilities

1. **Agent Lifecycle Management** - Spawn, monitor, and terminate agents
2. **Task Distribution** - Assign tasks to appropriate agents based on type and availability
3. **Parallel Coordination** - Manage multiple concurrent agent executions
4. **Event Distribution** - Broadcast events to all interested layers
5. **Workflow Enforcement** - Ensure proper mode-specific execution flows
6. **Context Routing** - GSD segment routing for context optimization

#### Interfaces Exposed

**Upward (to UI):**
```typescript
interface OrchestrationToUI {
  // Status queries
  getProjectStatus(projectId: string): Promise<ProjectStatus>;
  getAgentStatuses(): Promise<AgentStatus[]>;
  getTaskQueue(): Promise<QueuedTask[]>;

  // Event stream
  getEventStream(): AsyncIterable<NexusEvent>;
}
```

**Downward (to Planning/Execution):**
```typescript
interface OrchestrationToPlanning {
  requestDecomposition(feature: NexusFeature): Promise<NexusPlan>;
  validateDependencies(tasks: NexusTask[]): Promise<ValidationResult>;
}

interface OrchestrationToExecution {
  executeTask(task: NexusTask, agent: AgentHandle): Promise<TaskResult>;
  runQALoop(agent: AgentHandle, maxIterations: number): Promise<QAResult>;
  requestMerge(worktreeId: string): Promise<MergeResult>;
}
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.3+ | Type-safe orchestration logic |
| EventEmitter3 | 5.x | High-performance event bus |
| p-queue | 8.x | Concurrent task queue |
| Ralph ACP | Custom | Multi-provider agent protocol |

#### Gap Components to Build

From Phase 4:
- **GAP-INT-008:** Worktree-Agent Integration - 8-12 hours
- **GAP-INT-006:** QA Loop Metrics Wrapper - 4-6 hours
- **GAP-INT-007:** Rate Limit Wrapper - 6-8 hours

---

### Layer 3: Planning Layer

#### Overview

The Planning Layer transforms features and requirements into executable task plans. It implements the core Nexus principle: **no task exceeds 30 minutes**.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-PLN-001 | TaskDecomposer | GSD-style task breakdown | Adapt from GSD |
| COMP-PLN-002 | DependencyResolver | Topological task ordering | Adapt from Autocoder |
| COMP-PLN-003 | TimeEstimator | Task duration estimation | Merge GSD + Ralph |
| COMP-PLN-004 | TaskPrioritizer | Priority-based ordering | New |
| COMP-PLN-005 | ParallelWaveCalculator | Parallel execution waves | New |
| COMP-PLN-006 | ScopeAnalyzer | Project complexity assessment | New |

#### Responsibilities

1. **Feature Decomposition** - Break features into sub-features and atomic tasks
2. **Dependency Resolution** - Calculate task execution order using Kahn's algorithm
3. **Time Estimation** - Predict task duration based on complexity and history
4. **Parallel Planning** - Identify tasks that can run concurrently
5. **30-Minute Enforcement** - Validate no task exceeds time limit
6. **Scope Assessment** - Estimate total project/feature effort

#### Interfaces Exposed

**Upward (to Orchestration):**
```typescript
interface PlanningAPI {
  // Decomposition
  decomposeFeature(feature: NexusFeature): Promise<NexusPlan>;
  decomposeRequirements(requirements: RequirementsDatabase): Promise<NexusPlan>;

  // Dependency resolution
  resolveDependencies(tasks: NexusTask[]): Promise<NexusTask[]>;
  calculateParallelWaves(tasks: NexusTask[]): Promise<TaskWave[]>;

  // Estimation
  estimateTime(task: NexusTask): Promise<number>;
  estimateScope(requirements: RequirementsDatabase): Promise<ScopeEstimate>;

  // Validation
  validateTaskSize(task: NexusTask): TaskSizeValidation;
}
```

**Downward (to Persistence):**
```typescript
interface PlanningToPersistence {
  // Historical data for estimation
  getHistoricalVelocity(): Promise<VelocityMetrics>;
  getTaskCompletionTimes(taskType: string): Promise<number[]>;

  // Plan storage
  savePlan(plan: NexusPlan): Promise<void>;
  loadPlan(planId: string): Promise<NexusPlan>;
}
```

#### Task Decomposition Rules

From NEXUS description:
```
Task Sizing:
  Atomic:   5-15 min  (single file, single function)
  Small:    15-30 min (1-2 files, clear input/output)
  MAX:      30 min    (hard limit - split if bigger)

Expected Task Counts:
  Simple:   10-20 tasks  (dark mode toggle)
  Medium:   30-50 tasks  (user profile system)
  Complex:  50-100 tasks (authentication system)
  Epic:     100-200+ tasks (payment & subscription)
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.3+ | Type-safe planning logic |
| graphlib | 2.x | Graph algorithms (topological sort) |
| zod | 3.x | Schema validation |

#### Gap Components to Build

From Phase 4:
- **GAP-GEN-006:** Task Count Estimation - 8-12 hours
- **GAP-INT-003:** Task Schema Adapter - 6-8 hours
- **GAP-INT-005:** Planning-Execution Bridge - 8-12 hours

---

### Layer 4: Execution Layer

#### Overview

The Execution Layer runs tasks through agents, implements the QA loop for self-healing, and manages code generation. This is where the actual work happens.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-EXE-001 | QALoopEngine | Self-healing execution loop | Adapt from Auto-Claude |
| COMP-EXE-002 | CoderRunner | Code generation agent runner | Adapt from Auto-Claude |
| COMP-EXE-003 | TesterRunner | Test execution agent runner | Adapt from Auto-Claude |
| COMP-EXE-004 | ReviewerRunner | Code review agent runner | Adapt from Auto-Claude |
| COMP-EXE-005 | MergerRunner | Merge and conflict resolution | New (GAP-SHR-001) |
| COMP-EXE-006 | ToolExecutor | CLI and tool execution | Adapt from OMO |

#### Responsibilities

1. **Agent Execution** - Run tasks through appropriate agent types
2. **QA Loop Management** - Implement build→test→fix cycle with 50-iteration limit
3. **Tool Invocation** - Execute CLI commands, run tests, invoke build
4. **Code Generation** - Generate and modify code through agents
5. **Iteration Tracking** - Count and limit fix attempts
6. **Human Escalation** - Trigger human review when loop exhausted

#### Interfaces Exposed

**Upward (to Orchestration):**
```typescript
interface ExecutionAPI {
  // Task execution
  executeTask(task: NexusTask, agent: AgentHandle): Promise<TaskResult>;

  // QA Loop
  runQALoop(agent: AgentHandle, changes: CodeChanges): Promise<QAResult>;
  getIterationCount(taskId: string): number;

  // Tools
  runCommand(command: string, options: CommandOptions): Promise<CommandResult>;
  runTests(testPattern?: string): Promise<TestResult>;
  runBuild(): Promise<BuildResult>;
  runLint(fix?: boolean): Promise<LintResult>;
}
```

**Downward (to Quality/Infrastructure):**
```typescript
interface ExecutionToQuality {
  requestReview(changes: CodeChanges): Promise<ReviewResult>;
  requestTests(testFiles: string[]): Promise<TestResult>;
}

interface ExecutionToInfrastructure {
  createWorktree(taskId: string): Promise<string>;
  mergeWorktree(worktreePath: string): Promise<MergeResult>;
  cleanupWorktree(worktreePath: string): Promise<void>;
}
```

#### QA Loop Flow

```
                    +-----------------+
                    |  Start Task     |
                    +-----------------+
                            |
                            v
                    +-----------------+
                    | Generate Code   |
                    +-----------------+
                            |
                            v
                    +-----------------+
               +--->|    Build        |
               |    +-----------------+
               |            |
               |            v
               |    +-----------------+
               |    |  Build Pass?    |----NO---> Fix Build Errors
               |    +-----------------+           |
               |            |                     |
               |           YES                    |
               |            |                     |
               |            v                     |
               |    +-----------------+           |
               |    |    Lint         |           |
               |    +-----------------+           |
               |            |                     |
               |            v                     |
               |    +-----------------+           |
               |    |  Lint Pass?     |----NO---> Fix Lint Errors
               |    +-----------------+           |
               |            |                     |
               |           YES                    |
               |            |                     |
               |            v                     |
               |    +-----------------+           |
               |    |    Test         |           |
               |    +-----------------+           |
               |            |                     |
               |            v                     |
               |    +-----------------+           |
               |    |  Tests Pass?    |----NO---> Fix Test Failures
               |    +-----------------+           |
               |            |                     |
               |           YES         Iteration++|
               |            |          (max 50)   |
               |            v                     |
               |    +-----------------+           |
               |    |    Review       |           |
               |    +-----------------+           |
               |            |                     |
               |            v                     |
               |    +-----------------+           |
               |    |  Review Pass?   |----NO-----+
               |    +-----------------+
               |            |
               |           YES
               |            |
               |            v
               |    +-----------------+
               |    |    MERGE        |
               |    +-----------------+
               |            |
               |            v
               +----+   COMPLETE      |
                    +-----------------+
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| @anthropic-ai/sdk | 0.20+ | Claude API client |
| @google/generative-ai | 0.2+ | Gemini API client |
| execa | 8.x | Process execution |
| tree-kill | 1.x | Process cleanup |

#### Gap Components to Build

From Phase 4:
- **GAP-SHR-001:** Merger Agent - 16-20 hours
- **GAP-INT-006:** QA Loop Metrics Wrapper - 4-6 hours

---

### Layer 5: Quality Layer

#### Overview

The Quality Layer ensures code quality through testing, review, and validation. It provides the verification mechanisms that enable the QA loop's self-healing capabilities.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-QUA-001 | TestRunner | Multi-framework test execution | Adapt from Gap Extractions |
| COMP-QUA-002 | CodeReviewer | Pattern + AI code review | Adapt from Auto-Claude |
| COMP-QUA-003 | LintRunner | ESLint integration | Existing |
| COMP-QUA-004 | BuildVerifier | Build success validation | Adapt from Auto-Claude |
| COMP-QUA-005 | CoverageTracker | Test coverage monitoring | New |
| COMP-QUA-006 | ErrorClassifier | Error pattern detection | Adapt from Auto-Claude |

#### Responsibilities

1. **Test Execution** - Run unit, integration, and E2E tests
2. **Code Review** - Pattern-based + AI-powered review
3. **Linting** - Style and quality enforcement
4. **Build Verification** - Ensure compilation succeeds
5. **Coverage Tracking** - Monitor test coverage (target: 80%)
6. **Error Classification** - Categorize and route errors for fixing

#### Interfaces Exposed

**Upward (to Execution):**
```typescript
interface QualityAPI {
  // Testing
  runTests(pattern?: string): Promise<TestResult>;
  runE2ETests(): Promise<TestResult>;
  getCoverage(): Promise<CoverageReport>;

  // Review
  runPatternChecks(files: string[]): Promise<PatternCheckResult>;
  runAIReview(changes: CodeChanges): Promise<AIReviewResult>;

  // Build & Lint
  runBuild(): Promise<BuildResult>;
  runLint(fix?: boolean): Promise<LintResult>;

  // Error analysis
  classifyError(error: Error): ErrorClassification;
  suggestFix(error: ErrorClassification): FixSuggestion;
}
```

#### Test Framework Detection

```typescript
const FRAMEWORK_DETECTION = {
  vitest: ['vitest.config.ts', 'vitest.config.js'],
  jest: ['jest.config.js', 'jest.config.ts'],
  pytest: ['pytest.ini', 'pyproject.toml'],
  go: ['go.mod'],
  playwright: ['playwright.config.ts'],
};
```

#### Error Patterns

```typescript
const ERROR_PATTERNS = {
  typescript: /error TS\d+:/,
  eslint: /\d+:\d+\s+(error|warning)/,
  vitest: /FAIL\s+.+\.test\./,
  build: /Build failed|Compilation error/,
  runtime: /ReferenceError|TypeError|SyntaxError/,
};
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 1.3+ | Unit and integration testing |
| Playwright | 1.42+ | E2E testing |
| ESLint | 8.x | Linting |
| c8 | 8.x | Coverage |

---

### Layer 6: Persistence Layer

#### Overview

The Persistence Layer manages all data storage, state persistence, and memory systems. It enables session recovery and provides long-term memory across projects.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-PER-001 | StateManager | GSD STATE.md management | Adapt from GSD |
| COMP-PER-002 | RequirementsDB | Requirements database CRUD | New (GAP-GEN-002) |
| COMP-PER-003 | MemorySystem | Long-term memory with embeddings | Adapt from Auto-Claude |
| COMP-PER-004 | CheckpointManager | Session checkpoints | Adapt from Auto-Claude |
| COMP-PER-005 | ProjectStore | Project metadata storage | New |
| COMP-PER-006 | SessionStore | Active session state | New |

#### Responsibilities

1. **State Persistence** - Maintain STATE.md for project position
2. **Requirements Storage** - CRUD for requirements database
3. **Long-term Memory** - Store patterns, decisions, gotchas
4. **Checkpoint Creation** - Snapshot state at key points
5. **Session Recovery** - Resume from any failure point
6. **State Reconciliation** - Sync multiple state sources

#### Interfaces Exposed

**Upward (to All Layers):**
```typescript
interface PersistenceAPI {
  // State management
  saveState(state: NexusState): Promise<void>;
  loadState(projectId: string): Promise<NexusState>;
  reconcileStates(): Promise<void>;

  // Checkpoints
  createCheckpoint(label: string): Promise<Checkpoint>;
  loadCheckpoint(checkpointId: string): Promise<NexusState>;
  listCheckpoints(projectId: string): Promise<Checkpoint[]>;

  // Requirements
  saveRequirements(requirements: RequirementsDatabase): Promise<void>;
  loadRequirements(projectId: string): Promise<RequirementsDatabase>;

  // Memory
  storeEpisode(episode: Episode): Promise<void>;
  queryMemory(query: string, limit?: number): Promise<Episode[]>;

  // Projects
  saveProject(project: Project): Promise<void>;
  loadProject(projectId: string): Promise<Project>;
  listProjects(): Promise<ProjectSummary[]>;
}
```

#### State File Formats

**STATE.md (GSD Format):**
```markdown
# Project State

## Current Position
Phase: 2 of 4 (Authentication)
Plan: 1 of 3 in current phase
Progress: 80%

## Active Tasks
- F001-D-03: Create registration API endpoint (IN_PROGRESS)

## Decisions
- [2026-01-13]: Use bcrypt for password hashing
- [2026-01-13]: Session duration: 30 days

## Metrics
- Tasks completed: 34/47
- Time elapsed: 3h 45m
- Estimated remaining: 1h 30m
```

**.continue-here.md (Mid-task Resume):**
```markdown
# Continue Here

## Last Action
Writing tests for password validation

## Context
File: src/lib/auth/password.test.ts
Line: 45
Function: describe('verifyPassword')

## Next Steps
1. Complete remaining test cases
2. Run tests to verify
3. Commit changes
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| better-sqlite3 | 9.4+ | Embedded database |
| drizzle-orm | 0.29+ | Type-safe ORM |
| JSON files | - | Human-readable state |
| Markdown | - | STATE.md format |

#### Gap Components to Build

From Phase 4:
- **GAP-GEN-001:** Category Organization - 12-16 hours
- **GAP-GEN-002:** Requirements Database - 16-20 hours
- **GAP-INT-001:** State Format Adapter - 8-12 hours
- **GAP-INT-004:** Memory Query Bridge - 12-16 hours

---

### Layer 7: Infrastructure Layer

#### Overview

The Infrastructure Layer provides low-level services for file system operations, git management, external API access, and code intelligence tools.

#### Components

| Component ID | Component Name | Description | Status |
|--------------|---------------|-------------|--------|
| COMP-INF-001 | WorktreeManager | Git worktree lifecycle | Adapt from Auto-Claude |
| COMP-INF-002 | FileSystem | File operations wrapper | Existing |
| COMP-INF-003 | GitOperations | Git commands wrapper | Adapt from Auto-Claude |
| COMP-INF-004 | LSPClient | Language server protocol | Adapt from OMO |
| COMP-INF-005 | ASTTools | AST-grep integration | Adapt from OMO |
| COMP-INF-006 | APIClients | External API wrappers | New |

#### Responsibilities

1. **Worktree Management** - Create, merge, cleanup git worktrees
2. **File Operations** - Read, write, watch file changes
3. **Git Operations** - Commit, branch, merge, push
4. **Code Intelligence** - LSP hover, goto definition, references
5. **AST Analysis** - Structural code search and modification
6. **API Communication** - Claude, Gemini, OpenAI API access

#### Interfaces Exposed

**Upward (to Execution/Quality):**
```typescript
interface InfrastructureAPI {
  // Worktrees
  createWorktree(branchName: string): Promise<string>;
  mergeWorktree(worktreePath: string): Promise<MergeResult>;
  cleanupWorktree(worktreePath: string): Promise<void>;
  listWorktrees(): Promise<Worktree[]>;

  // Git operations
  commit(message: string, files?: string[]): Promise<string>;
  createBranch(name: string): Promise<void>;
  checkConflicts(): Promise<ConflictInfo[]>;

  // File system
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  watchFiles(pattern: string, callback: (event: FileEvent) => void): Unsubscribe;

  // LSP
  getHover(file: string, line: number, column: number): Promise<HoverInfo>;
  gotoDefinition(file: string, line: number, column: number): Promise<Location>;
  findReferences(file: string, line: number, column: number): Promise<Location[]>;

  // AST
  searchAST(pattern: string, path: string): Promise<ASTMatch[]>;
  replaceAST(pattern: string, replacement: string, path: string): Promise<void>;
}
```

#### Worktree Branch Naming

```typescript
const BRANCH_PATTERNS = {
  feature: 'nexus/feature/{featureId}/{timestamp}',
  task: 'nexus/task/{taskId}/{timestamp}',
  hotfix: 'nexus/hotfix/{description}/{timestamp}',
};

// Example: nexus/task/F001-A-03/20260113-143022
```

#### Technology Choices

| Technology | Version | Purpose |
|------------|---------|---------|
| simple-git | 3.x | Git operations |
| chokidar | 3.x | File watching |
| vscode-languageserver-protocol | 3.17 | LSP types |
| ast-grep-napi | latest | AST operations |

---

### Layer Interaction Diagram

```
+===============================================================================+
|                           NEXUS LAYER INTERACTIONS                             |
+===============================================================================+

                          +-------------------+
                          |      USER         |
                          +-------------------+
                                   |
                                   | (Mouse, Keyboard, Touch)
                                   v
+-------------------------------------------------------------------------------+
|  LAYER 1: USER INTERFACE                                                       |
|  +-------------+ +-------------+ +---------------+ +-------------+             |
|  | InterviewUI | | KanbanBoard | | ProgressDash  | | SettingsUI  |             |
|  +------+------+ +------+------+ +-------+-------+ +------+------+             |
|         |               |                |                |                    |
+---------+---------------+----------------+----------------+--------------------+
          |               |                |                |
          +-------+-------+--------+-------+--------+-------+
                  |                |                |
                  v                v                v
              [Events]    [API Calls]    [Subscriptions]
                  |                |                |
+-----------------+----------------+----------------+----------------------------+
|  LAYER 2: ORCHESTRATION                                                        |
|  +------------------+  +-------------+  +----------+  +------------+           |
|  | NexusCoordinator |  | AgentPool   |  | TaskQueue|  | EventBus   |           |
|  +--------+---------+  +------+------+  +-----+----+  +-----+------+           |
|           |                   |               |             |                  |
+-----------+-------------------+---------------+-------------+------------------+
            |                   |               |             |
            v                   v               v             v
       [Task Requests]   [Agent Spawn]   [Priority]     [Broadcast]
            |                   |               |             |
+-------------------------------------------------------------------------------+
|  LAYER 3: PLANNING                                                             |
|  +---------------+  +------------------+  +--------------+  +------------+     |
|  | TaskDecomposer|  | DependencyResolver|  | TimeEstimator|  | Prioritizer|     |
|  +-------+-------+  +---------+--------+  +-------+------+  +-----+------+     |
|          |                    |                   |               |            |
+----------+--------------------+-------------------+---------------+------------+
           |                    |                   |               |
           v                    v                   v               v
    [Atomic Tasks]      [Task Order]        [Estimates]       [Waves]
           |                    |                   |               |
+-------------------------------------------------------------------------------+
|  LAYER 4: EXECUTION                                                            |
|  +-------------+  +-------------+  +-------------+  +-------------+            |
|  | QALoopEngine|  | CoderRunner |  | TesterRunner|  | MergerRunner|            |
|  +------+------+  +------+------+  +------+------+  +------+------+            |
|         |                |                |                |                   |
+---------+----------------+----------------+----------------+-------------------+
          |                |                |                |
          v                v                v                v
    [Iterations]     [Code Gen]       [Test Run]       [Merge Ops]
          |                |                |                |
+-------------------------------------------------------------------------------+
|  LAYER 5: QUALITY                                                              |
|  +------------+  +-------------+  +----------+  +----------------+             |
|  | TestRunner |  | CodeReviewer|  | LintRunner|  | ErrorClassifier|             |
|  +-----+------+  +------+------+  +-----+----+  +-------+--------+             |
|        |                |               |               |                      |
+--------+----------------+---------------+---------------+----------------------+
         |                |               |               |
         v                v               v               v
    [Results]        [Feedback]      [Fixes]       [Classification]
         |                |               |               |
+-------------------------------------------------------------------------------+
|  LAYER 6: PERSISTENCE                                                          |
|  +-------------+  +---------------+  +-------------+  +------------------+     |
|  | StateManager|  | RequirementsDB|  | MemorySystem|  | CheckpointManager|     |
|  +------+------+  +-------+-------+  +------+------+  +---------+--------+     |
|         |                 |                 |                   |              |
+---------+-----------------+-----------------+-------------------+--------------+
          |                 |                 |                   |
          v                 v                 v                   v
    [STATE.md]        [JSON Files]     [SQLite]          [Snapshots]
          |                 |                 |                   |
+-------------------------------------------------------------------------------+
|  LAYER 7: INFRASTRUCTURE                                                       |
|  +----------------+  +----------+  +-------------+  +-----------+              |
|  | WorktreeManager|  | FileSystem|  | GitOperations|  | LSPClient |              |
|  +--------+-------+  +-----+----+  +------+------+  +-----+-----+              |
|           |                |              |               |                    |
+-----------+----------------+--------------+---------------+--------------------+
            |                |              |               |
            v                v              v               v
       [Worktrees]       [Files]        [Git Repo]     [Language Servers]
```

---

### Component Inventory

Complete inventory of all system components:

| Component ID | Component Name | Layer | Source | Status | Effort |
|--------------|---------------|-------|--------|--------|--------|
| **Layer 1: User Interface** |
| COMP-UI-001 | InterviewUI | 1 | GAP | To Build | 32-40h |
| COMP-UI-002 | KanbanBoard | 1 | GAP | To Build | 24-32h |
| COMP-UI-003 | FeatureCard | 1 | GAP | To Build | 12-16h |
| COMP-UI-004 | ProgressDashboard | 1 | GAP | To Build | 24-32h |
| COMP-UI-005 | SettingsPanel | 1 | GAP | To Build | 8-12h |
| COMP-UI-006 | AgentStatusGrid | 1 | GAP | To Build | 8-12h |
| COMP-UI-007 | RequirementsSidebar | 1 | GAP | To Build | 12-16h |
| **Layer 2: Orchestration** |
| COMP-ORC-001 | NexusCoordinator | 2 | Ralph | Adapt | 16-20h |
| COMP-ORC-002 | AgentPool | 2 | Auto-Claude | Adapt | 12-16h |
| COMP-ORC-003 | TaskQueue | 2 | New | To Build | 8-12h |
| COMP-ORC-004 | EventBus | 2 | New | To Build | 4-6h |
| COMP-ORC-005 | SegmentRouter | 2 | GSD | Adapt | 8-12h |
| COMP-ORC-006 | WorkflowController | 2 | New | To Build | 12-16h |
| **Layer 3: Planning** |
| COMP-PLN-001 | TaskDecomposer | 3 | GSD | Adapt | 16-20h |
| COMP-PLN-002 | DependencyResolver | 3 | Autocoder | Adapt | 8-12h |
| COMP-PLN-003 | TimeEstimator | 3 | GSD+Ralph | Merge | 8-12h |
| COMP-PLN-004 | TaskPrioritizer | 3 | New | To Build | 6-8h |
| COMP-PLN-005 | ParallelWaveCalculator | 3 | New | To Build | 6-8h |
| COMP-PLN-006 | ScopeAnalyzer | 3 | New | To Build | 8-12h |
| **Layer 4: Execution** |
| COMP-EXE-001 | QALoopEngine | 4 | Auto-Claude | Adapt | 12-16h |
| COMP-EXE-002 | CoderRunner | 4 | Auto-Claude | Adapt | 8-12h |
| COMP-EXE-003 | TesterRunner | 4 | Auto-Claude | Adapt | 8-12h |
| COMP-EXE-004 | ReviewerRunner | 4 | Auto-Claude | Adapt | 8-12h |
| COMP-EXE-005 | MergerRunner | 4 | New (GAP) | To Build | 16-20h |
| COMP-EXE-006 | ToolExecutor | 4 | OMO | Adapt | 8-12h |
| **Layer 5: Quality** |
| COMP-QUA-001 | TestRunner | 5 | Gap Extractions | Adapt | 8-12h |
| COMP-QUA-002 | CodeReviewer | 5 | Auto-Claude | Adapt | 12-16h |
| COMP-QUA-003 | LintRunner | 5 | Existing | Minimal | 2-4h |
| COMP-QUA-004 | BuildVerifier | 5 | Auto-Claude | Adapt | 4-6h |
| COMP-QUA-005 | CoverageTracker | 5 | New | To Build | 6-8h |
| COMP-QUA-006 | ErrorClassifier | 5 | Auto-Claude | Adapt | 6-8h |
| **Layer 6: Persistence** |
| COMP-PER-001 | StateManager | 6 | GSD | Adapt | 8-12h |
| COMP-PER-002 | RequirementsDB | 6 | New (GAP) | To Build | 16-20h |
| COMP-PER-003 | MemorySystem | 6 | Auto-Claude | Adapt | 12-16h |
| COMP-PER-004 | CheckpointManager | 6 | Auto-Claude | Adapt | 8-12h |
| COMP-PER-005 | ProjectStore | 6 | New | To Build | 8-12h |
| COMP-PER-006 | SessionStore | 6 | New | To Build | 6-8h |
| **Layer 7: Infrastructure** |
| COMP-INF-001 | WorktreeManager | 7 | Auto-Claude | Adapt | 8-12h |
| COMP-INF-002 | FileSystem | 7 | Existing | Minimal | 2-4h |
| COMP-INF-003 | GitOperations | 7 | Auto-Claude | Adapt | 6-8h |
| COMP-INF-004 | LSPClient | 7 | OMO | Adapt | 16-24h |
| COMP-INF-005 | ASTTools | 7 | OMO | Adapt | 12-16h |
| COMP-INF-006 | APIClients | 7 | New | To Build | 8-12h |

**Summary:**
- Total Components: 43
- To Build (New): 18
- Adapt (From source): 22
- Minimal Changes: 3
- Estimated Total Effort: 450-580 hours

---

### Cross-Layer Communication

#### Layer 1 <-> Layer 2 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| UI -> Orchestration | Direct API calls | TypeScript interfaces | Try/catch with user notification |
| Orchestration -> UI | Event emission | NexusEvent objects | Event includes error field |

```typescript
// UI to Orchestration
interface UICommand {
  type: 'START_PROJECT' | 'PAUSE' | 'RESUME' | 'EXECUTE_FEATURE' | 'APPROVE_REVIEW';
  payload: Record<string, unknown>;
  timestamp: Date;
}

// Orchestration to UI
interface NexusEvent {
  type: NexusEventType;
  source: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  error?: NexusError;
}

type NexusEventType =
  | 'PROJECT_STARTED' | 'PROJECT_PAUSED' | 'PROJECT_RESUMED'
  | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED'
  | 'AGENT_SPAWNED' | 'AGENT_COMPLETED' | 'AGENT_FAILED'
  | 'REVIEW_REQUESTED' | 'REVIEW_COMPLETED'
  | 'CHECKPOINT_CREATED' | 'STATE_UPDATED';
```

#### Layer 2 <-> Layer 3 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| Orchestration -> Planning | Async function calls | TypeScript interfaces | Throw errors up to orchestrator |
| Planning -> Orchestration | Return values | NexusPlan, Task[] | Validation errors in result |

```typescript
// Orchestration requests decomposition
const plan = await planner.decomposeFeature(feature);

// Planning returns structured plan
interface NexusPlan {
  featureId: string;
  tasks: NexusTask[];
  waves: TaskWave[];
  estimatedTime: number;
  dependencies: DependencyGraph;
}
```

#### Layer 2 <-> Layer 4 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| Orchestration -> Execution | Async function calls | Task + AgentHandle | Catch and retry/escalate |
| Execution -> Orchestration | Return values + Events | TaskResult, QAResult | Error in result object |

```typescript
// Orchestration dispatches task
const result = await executor.executeTask(task, agent);

// Execution returns result
interface TaskResult {
  taskId: string;
  status: 'success' | 'failed' | 'needs_review';
  iterations: number;
  files: FileChange[];
  error?: ExecutionError;
}
```

#### Layer 4 <-> Layer 5 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| Execution -> Quality | Async function calls | CodeChanges, TestPattern | Return error classification |
| Quality -> Execution | Return values | TestResult, ReviewResult | Structured error info |

```typescript
// Execution requests quality check
const testResult = await quality.runTests('src/**/*.test.ts');
const reviewResult = await quality.runAIReview(changes);

// Quality returns structured results
interface TestResult {
  passed: boolean;
  total: number;
  failures: TestFailure[];
  coverage?: CoverageInfo;
}

interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
}
```

#### Layer 4 <-> Layer 7 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| Execution -> Infrastructure | Async function calls | Paths, Commands | Wrap errors with context |
| Infrastructure -> Execution | Return values | Paths, Results | Throw with operation context |

```typescript
// Execution creates worktree
const worktreePath = await infra.createWorktree(`task/${task.id}`);

// Execution triggers merge
const mergeResult = await infra.mergeWorktree(worktreePath);

interface MergeResult {
  success: boolean;
  commitHash?: string;
  conflicts?: ConflictInfo[];
}
```

#### All Layers <-> Layer 6 Communication

| Direction | Protocol | Data Format | Error Handling |
|-----------|----------|-------------|----------------|
| Any Layer -> Persistence | Async function calls | Domain objects | Log and retry |
| Persistence -> Layers | Return values | Loaded objects | Null/default on missing |

```typescript
// Any layer can persist
await persistence.saveState(currentState);
await persistence.storeEpisode(memoryEntry);
await persistence.createCheckpoint('pre-merge');

// Any layer can load
const state = await persistence.loadState(projectId);
const memories = await persistence.queryMemory('authentication patterns');
```

---

### System Boundaries

#### External Services

| Service | Purpose | Layer Used In | Authentication |
|---------|---------|--------------|----------------|
| **Claude API (Anthropic)** | Agent LLM calls | Layer 4 | API Key |
| **Gemini API (Google)** | Research, Review | Layer 4 | API Key |
| **OpenAI API** | Embeddings (optional) | Layer 6 | API Key |
| **File System** | Code, state storage | Layer 7 | OS permissions |
| **Git** | Version control | Layer 7 | SSH/HTTPS |

#### Internal Process Boundaries

```
+===============================================================================+
|                         NEXUS PROCESS ARCHITECTURE                             |
+===============================================================================+

   +-----------------+     +-----------------+     +-----------------+
   |   MAIN PROCESS  |     |  AGENT WORKERS  |     |   LSP SERVERS   |
   |                 |     |  (per worktree) |     | (per language)  |
   |  - UI Renderer  |     |                 |     |                 |
   |  - Orchestrator |<--->|  - Coder Agent  |     |  - TypeScript   |
   |  - Event Bus    |     |  - Tester Agent |<--->|  - Python       |
   |  - State Manager|     |  - Reviewer     |     |  - Go           |
   |  - API Clients  |     |  - Merger       |     |  - Rust         |
   |                 |     |                 |     |                 |
   +-----------------+     +-----------------+     +-----------------+
          |                       |                       |
          v                       v                       v
   +---------------------------------------------------------------+
   |                    SHARED FILE SYSTEM                          |
   |  - Project Directory                                           |
   |  - Worktree Directories                                        |
   |  - SQLite Database                                             |
   |  - STATE.md / .continue-here.md                                |
   +---------------------------------------------------------------+
```

#### What Runs Where

| Component | Process | Reason |
|-----------|---------|--------|
| UI Components | Main Process | User interaction |
| Event Bus | Main Process | Central coordination |
| API Clients | Main Process | Shared rate limiting |
| Agent Runners | Worker Processes | Isolation, parallelism |
| QA Loop | Worker Processes | Per-task isolation |
| LSP Servers | Background Processes | Language-specific |
| File Watchers | Main Process | Centralized monitoring |
| SQLite Access | Main Process | Thread safety |

---

### Task 5.1 Completion Checklist

- [x] All 7 layers defined with components
- [x] Layer interaction diagram complete
- [x] Component inventory complete (43 components)
- [x] Cross-layer communication defined
- [x] System boundaries defined

**[TASK 5.1 COMPLETE]**

---

## Task 5.2: Data Architecture

### Overview

The Data Architecture defines all data structures, storage systems, and data flow patterns that enable Nexus to maintain state, persist requirements, and coordinate agent activities. The architecture follows these principles:

1. **TypeScript-First** - All models defined as TypeScript interfaces
2. **Layered Storage** - Different storage mechanisms for different data types
3. **Recovery-Oriented** - Every critical state is persistable and recoverable
4. **Human-Readable** - State files are readable by humans (Markdown/JSON)

---

### Core Data Models

#### Task Model

The Task is the atomic unit of work in Nexus. No task exceeds 30 minutes.

```typescript
/**
 * TaskStatus represents the lifecycle of a task
 */
enum TaskStatus {
  PENDING = 'pending',           // Not yet started
  IN_PROGRESS = 'in_progress',   // Currently being executed
  REVIEW = 'review',             // Awaiting code review
  TESTING = 'testing',           // Tests being run
  COMPLETE = 'complete',         // Successfully completed
  FAILED = 'failed',             // Failed after max retries
  BLOCKED = 'blocked',           // Blocked by dependency
  SKIPPED = 'skipped',           // Intentionally skipped
}

/**
 * TaskType distinguishes automatic vs human-checkpoint tasks
 */
enum TaskType {
  AUTO = 'auto',                 // Fully automated execution
  CHECKPOINT = 'checkpoint',     // Requires human approval
  TDD = 'tdd',                   // Test-driven development
}

/**
 * TaskComplexity for agent routing
 */
enum TaskComplexity {
  ATOMIC = 'atomic',             // 5-15 min, single file/function
  SMALL = 'small',               // 15-30 min, 1-2 files
}

/**
 * Task is the atomic unit of work in Nexus
 * Maximum duration: 30 minutes
 */
interface Task {
  // Identity
  id: string;                    // Hierarchical ID: F001-A-01
  name: string;                  // Short descriptive name
  description: string;           // Detailed description of what to do

  // Relationships
  featureId: string;             // Parent feature ID: F001
  subFeatureId: string;          // Parent sub-feature ID: F001-A
  dependsOn: string[];           // Task IDs this depends on
  blockedBy: string[];           // Tasks currently blocking this

  // Execution
  type: TaskType;                // auto | checkpoint | tdd
  complexity: TaskComplexity;    // atomic | small
  status: TaskStatus;            // Current execution status
  assignedAgent?: string;        // Agent ID if assigned
  worktreePath?: string;         // Git worktree if active

  // Files
  files: string[];               // Files to create/modify
  testFiles: string[];           // Associated test files

  // Quality
  test: string;                  // Success criteria/test command
  testFirst?: string;            // TDD: test to write before code
  verification?: string;         // Additional verification steps

  // Metrics
  timeEstimate: number;          // Minutes (max 30)
  timeActual?: number;           // Actual execution time
  iterations: number;            // QA loop iterations taken
  maxIterations: number;         // Default: 50

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Metadata
  tdd: boolean;                  // Test-driven development flag
  priority: number;              // 1 (highest) to 5 (lowest)
  tags: string[];                // Categorization tags
  notes: string[];               // Execution notes/comments
}

/**
 * TaskResult captures the outcome of task execution
 */
interface TaskResult {
  taskId: string;
  status: 'success' | 'failed' | 'needs_review' | 'escalated';
  iterations: number;
  filesChanged: FileChange[];
  testsPassed: boolean;
  reviewApproved: boolean;
  commitHash?: string;
  error?: TaskError;
  duration: number;              // Milliseconds
}

/**
 * TaskError captures execution failures
 */
interface TaskError {
  type: 'build' | 'lint' | 'test' | 'review' | 'merge' | 'timeout';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

/**
 * FileChange tracks modifications
 */
interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  additions: number;
  deletions: number;
}
```

#### Feature Model

Features are the user-visible units of functionality.

```typescript
/**
 * FeatureStatus represents feature lifecycle
 */
enum FeatureStatus {
  BACKLOG = 'backlog',           // Not yet started
  PLANNING = 'planning',         // Being decomposed into tasks
  IN_PROGRESS = 'in_progress',   // Tasks being executed
  AI_REVIEW = 'ai_review',       // AI reviewing changes
  HUMAN_REVIEW = 'human_review', // Awaiting human approval
  DONE = 'done',                 // Completed and merged
  ARCHIVED = 'archived',         // Archived (not deleted)
}

/**
 * FeatureComplexity determines UI treatment and planning approach
 */
enum FeatureComplexity {
  SIMPLE = 'simple',             // 10-20 tasks, direct execution
  COMPLEX = 'complex',           // 30-100+ tasks, needs planning
}

/**
 * SubFeature groups related tasks within a feature
 */
interface SubFeature {
  id: string;                    // Hierarchical ID: F001-A
  name: string;                  // E.g., "Database Schema"
  description: string;
  tasks: Task[];                 // Ordered task list
  status: FeatureStatus;
  progress: number;              // 0-100 percentage
  estimatedTime: number;         // Minutes
  actualTime?: number;
  order: number;                 // Execution order within feature
}

/**
 * Feature represents a user-visible unit of functionality
 */
interface Feature {
  // Identity
  id: string;                    // Feature ID: F001
  name: string;                  // E.g., "Authentication System"
  description: string;           // Detailed description

  // Structure
  subFeatures: SubFeature[];     // Ordered sub-features
  totalTasks: number;            // Computed total
  completedTasks: number;        // Computed completed

  // Classification
  complexity: FeatureComplexity; // simple | complex
  category: FeatureCategory;     // See below
  priority: number;              // 1 (highest) to 5 (lowest)

  // Status
  status: FeatureStatus;         // Current column in Kanban
  progress: number;              // 0-100 percentage

  // Timing
  estimatedTime: string;         // E.g., "6-8 hours"
  estimatedTimeMinutes: number;  // Numeric for calculations
  actualTimeMinutes?: number;

  // Agent Assignment
  assignedAgents: string[];      // Active agent IDs
  parallelWaves: TaskWave[];     // Parallel execution waves

  // Dependencies
  dependsOn: string[];           // Other feature IDs
  blocks: string[];              // Features blocked by this

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Metadata
  source: 'genesis' | 'evolution' | 'manual';
  requirementIds: string[];      // Linked requirements
  tags: string[];
}

/**
 * FeatureCategory for organization
 */
enum FeatureCategory {
  AUTHENTICATION = 'authentication',
  USER_MANAGEMENT = 'user_management',
  DATA_MANAGEMENT = 'data_management',
  BUSINESS_LOGIC = 'business_logic',
  UI_COMPONENTS = 'ui_components',
  INTEGRATIONS = 'integrations',
  INFRASTRUCTURE = 'infrastructure',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}

/**
 * TaskWave represents tasks that can run in parallel
 */
interface TaskWave {
  waveNumber: number;
  taskIds: string[];
  estimatedDuration: number;     // Minutes
  canParallelize: boolean;
}
```

#### Requirement Model

Requirements capture user needs from the interview process.

```typescript
/**
 * RequirementCategory from NEXUS description
 */
enum RequirementCategory {
  FUNCTIONAL = 'functional',           // Core features and capabilities
  NON_FUNCTIONAL = 'non_functional',   // Quality attributes
  UI_UX = 'ui_ux',                     // User interface and experience
  TECHNICAL = 'technical',             // Technology and architecture
  BUSINESS_LOGIC = 'business_logic',   // Business rules and workflows
  INTEGRATIONS = 'integrations',       // Third-party services
}

/**
 * RequirementPriority using MoSCoW method
 */
enum RequirementPriority {
  MUST = 'must',                 // Must have (MVP)
  SHOULD = 'should',             // Should have (important)
  COULD = 'could',               // Could have (nice to have)
  WONT = 'wont',                 // Won't have this time
}

/**
 * RequirementSource tracks where requirement came from
 */
enum RequirementSource {
  INTERVIEW = 'interview',       // From interview engine
  RESEARCH = 'research',         // From research engine
  INFERRED = 'inferred',         // AI-suggested
  MANUAL = 'manual',             // User-added directly
}

/**
 * Requirement captures a single user need
 */
interface Requirement {
  // Identity
  id: string;                    // REQ-FUN-001, REQ-TEC-001, etc.
  title: string;                 // Short descriptive title
  description: string;           // Detailed description

  // Classification
  category: RequirementCategory;
  priority: RequirementPriority;
  source: RequirementSource;

  // Traceability
  sourceQuote?: string;          // Exact user quote if from interview
  sessionId?: string;            // Interview session where captured
  featureIds: string[];          // Linked features

  // User Stories
  userStories: UserStory[];
  acceptanceCriteria: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  confidence: number;            // 0-1, how confident AI is
  verified: boolean;             // User-verified
  tags: string[];
}

/**
 * UserStory follows the "As a... I want... So that..." format
 */
interface UserStory {
  role: string;                  // "As a [role]"
  want: string;                  // "I want to [action]"
  benefit: string;               // "So that [benefit]"
}

/**
 * RequirementsDatabase is the complete requirements structure
 * Matches the folder structure in NEXUS description
 */
interface RequirementsDatabase {
  // Core requirements
  core: {
    userTypes: UserType[];
    features: FeatureRequirement[];
    businessRules: BusinessRule[];
  };

  // Technical requirements
  technical: {
    stackPreferences: StackPreferences;
    integrations: Integration[];
    constraints: Constraints;
  };

  // Design requirements
  design: {
    stylePreferences: StylePreferences;
    referenceSites: ReferenceSite[];
    designSystem?: DesignSystem;
  };

  // Metadata
  metadata: {
    sessionLog: SessionLog[];
    decisions: Decision[];
    scopeEstimate: ScopeEstimate;
  };
}

/**
 * Supporting types for RequirementsDatabase
 */
interface UserType {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault?: boolean;
}

interface FeatureRequirement {
  id: string;
  name: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  userStories: string[];
  acceptanceCriteria: string[];
}

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  conditions: string[];
  actions: string[];
  exceptions: string[];
}

interface StackPreferences {
  frontend: {
    framework: string;           // React, Vue, etc.
    styling: string;             // Tailwind, CSS-in-JS, etc.
    state: string;               // Zustand, Redux, etc.
  };
  backend: {
    runtime: string;             // Node.js, Python, etc.
    framework: string;           // Express, FastAPI, etc.
    database: string;            // PostgreSQL, SQLite, etc.
  };
  infrastructure: {
    hosting: string;             // Vercel, AWS, etc.
    ci: string;                  // GitHub Actions, etc.
  };
}

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'sdk' | 'service';
  purpose: string;
  required: boolean;
  config: Record<string, unknown>;
}

interface Constraints {
  performance: {
    loadTimeMs: number;          // Max page load time
    concurrent: number;          // Concurrent users
  };
  security: {
    authMethod: string;          // OAuth, JWT, etc.
    dataProtection: string[];    // GDPR, HIPAA, etc.
  };
  compatibility: {
    browsers: string[];          // Chrome, Firefox, etc.
    devices: string[];           // Desktop, mobile, etc.
  };
}

interface StylePreferences {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headings: string;
    body: string;
    monospace: string;
  };
  spacing: 'compact' | 'comfortable' | 'spacious';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  darkMode: boolean;
}

interface ReferenceSite {
  url: string;
  whatILike: string[];
  whatIDislike: string[];
  screenshot?: string;
}

interface DesignSystem {
  library: string;               // shadcn/ui, Radix, etc.
  theme: string;                 // Theme name/config
  components: string[];          // Which components to use
}

interface SessionLog {
  id: string;
  startTime: Date;
  endTime?: Date;
  questionsAsked: number;
  requirementsCaptured: number;
  mode: 'interview' | 'research' | 'planning';
}

interface Decision {
  id: string;
  timestamp: Date;
  topic: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  madeBy: 'user' | 'ai' | 'both';
}

interface ScopeEstimate {
  complexity: 'simple' | 'medium' | 'complex' | 'epic';
  estimatedTasks: {
    min: number;
    max: number;
  };
  estimatedHours: {
    min: number;
    max: number;
  };
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  breakdown: {
    category: FeatureCategory;
    tasks: number;
    hours: number;
  }[];
}
```

#### Agent Model

Agents are the AI workers that execute tasks.

```typescript
/**
 * AgentType defines the specialization of each agent
 */
enum AgentType {
  PLANNER = 'planner',           // Strategic planning, decomposition
  CODER = 'coder',               // Code generation, implementation
  REVIEWER = 'reviewer',         // Code review, quality assessment
  TESTER = 'tester',             // Test writing, test execution
  MERGER = 'merger',             // Git operations, conflict resolution
}

/**
 * AgentStatus represents agent lifecycle
 */
enum AgentStatus {
  IDLE = 'idle',                 // Available for work
  INITIALIZING = 'initializing', // Starting up
  WORKING = 'working',           // Actively executing
  REVIEWING = 'reviewing',       // In review phase
  BLOCKED = 'blocked',           // Waiting on dependency
  ERROR = 'error',               // In error state
  TERMINATED = 'terminated',     // Shut down
}

/**
 * AgentModel specifies which LLM to use
 */
interface AgentModel {
  provider: 'anthropic' | 'google' | 'openai';
  model: string;                 // claude-sonnet-4-5, gemini-2.5-pro, etc.
  maxTokens: number;
  temperature: number;
}

/**
 * Agent represents a single AI worker instance
 */
interface Agent {
  // Identity
  id: string;                    // Unique agent ID: agent-coder-001
  type: AgentType;
  name: string;                  // Human-friendly name

  // Model Configuration
  model: AgentModel;
  systemPrompt: string;          // System prompt template
  tools: string[];               // Available tools

  // State
  status: AgentStatus;
  currentTask?: string;          // Task ID being worked on
  worktree?: string;             // Git worktree path

  // Execution Metrics
  tasksCompleted: number;
  tasksAttempted: number;
  successRate: number;           // 0-1
  averageIterations: number;
  totalTokensUsed: number;
  totalCost: number;             // USD

  // Timing
  createdAt: Date;
  lastActiveAt: Date;
  totalActiveTime: number;       // Milliseconds

  // Error Tracking
  lastError?: AgentError;
  errorCount: number;
  consecutiveErrors: number;
}

/**
 * AgentError captures agent failures
 */
interface AgentError {
  type: 'api' | 'tool' | 'timeout' | 'rate_limit' | 'context' | 'unknown';
  message: string;
  timestamp: Date;
  recoverable: boolean;
  retryCount: number;
}

/**
 * AgentContext is the context passed to an agent for execution
 */
interface AgentContext {
  // Task Information
  task: Task;
  feature: Feature;

  // Code Context
  relevantFiles: FileContext[];
  projectStructure: string;      // Tree output
  dependencies: string[];        // package.json deps

  // Historical Context
  recentDecisions: Decision[];
  relevantPatterns: MemoryEpisode[];
  previousAttempts: TaskResult[];

  // Environment
  worktreePath: string;
  testCommand: string;
  buildCommand: string;
  lintCommand: string;
}

/**
 * FileContext provides file information to agents
 */
interface FileContext {
  path: string;
  content: string;
  relevance: number;             // 0-1 how relevant to task
  reason: string;                // Why included
}
```

#### Project Model

Projects are the top-level container for all work.

```typescript
/**
 * ProjectMode distinguishes creation types
 */
enum ProjectMode {
  GENESIS = 'genesis',           // New application from scratch
  EVOLUTION = 'evolution',       // Enhancing existing project
}

/**
 * ProjectStatus represents overall project state
 */
enum ProjectStatus {
  INTERVIEWING = 'interviewing', // Genesis: in interview phase
  RESEARCHING = 'researching',   // Genesis: research phase
  PLANNING = 'planning',         // Either: planning phase
  EXECUTING = 'executing',       // Either: tasks being executed
  PAUSED = 'paused',             // User paused
  COMPLETED = 'completed',       // All features done
  FAILED = 'failed',             // Unrecoverable failure
}

/**
 * Project is the top-level container
 */
interface Project {
  // Identity
  id: string;                    // UUID
  name: string;                  // User-friendly name
  slug: string;                  // URL-safe identifier
  description: string;

  // Mode
  mode: ProjectMode;

  // Content
  requirements?: RequirementsDatabase;  // Genesis mode
  features: Feature[];

  // Status
  status: ProjectStatus;
  currentPhase: string;          // "Phase 2 of 4 (Authentication)"
  progress: number;              // 0-100 overall

  // Metrics
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalTimeMinutes: number;
  estimatedCost: number;
  actualCost: number;

  // Agent Activity
  activeAgents: string[];        // Agent IDs
  agentHistory: AgentActivity[];

  // Git
  repositoryPath: string;
  mainBranch: string;
  activeWorktrees: string[];
  lastCommit?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Recovery
  lastCheckpoint?: Checkpoint;
  checkpoints: Checkpoint[];

  // Metadata
  tags: string[];
  settings: ProjectSettings;
}

/**
 * ProjectSettings for user preferences
 */
interface ProjectSettings {
  // Execution
  maxParallelAgents: number;     // Default: 3
  maxQAIterations: number;       // Default: 50
  autoMerge: boolean;            // Auto-merge on review pass

  // Quality
  testCoverageTarget: number;    // Default: 80
  requireReview: boolean;        // Require AI review
  requireHumanReview: boolean;   // Require human review

  // Cost
  costLimit?: number;            // USD limit
  pauseOnCostExceeded: boolean;

  // Notifications
  notifyOnCheckpoint: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
}

/**
 * AgentActivity tracks agent execution history
 */
interface AgentActivity {
  agentId: string;
  agentType: AgentType;
  taskId: string;
  action: string;
  timestamp: Date;
  duration: number;              // Milliseconds
  tokensUsed: number;
  cost: number;
  result: 'success' | 'failure' | 'retry';
}

/**
 * Checkpoint for session recovery
 */
interface Checkpoint {
  id: string;
  projectId: string;
  label: string;                 // User-friendly label
  timestamp: Date;

  // State Snapshot
  projectState: Partial<Project>;
  taskStates: Record<string, TaskStatus>;
  agentStates: Record<string, AgentStatus>;

  // Git State
  commitHash: string;
  branches: string[];
  worktrees: string[];

  // Recovery Info
  canResume: boolean;
  resumeFrom: string;            // Task ID to resume from
  notes: string;
}
```

---

### Storage Architecture

#### Requirements Database Storage

```typescript
/**
 * RequirementsStorage handles the requirements/ folder structure
 * from NEXUS_AI_BUILDER_DESCRIPTION.md
 */
interface RequirementsStorage {
  // Base path: .nexus/requirements/
  basePath: string;

  // CRUD Operations
  save(requirements: RequirementsDatabase): Promise<void>;
  load(projectId: string): Promise<RequirementsDatabase>;
  update(projectId: string, updates: Partial<RequirementsDatabase>): Promise<void>;
  delete(projectId: string): Promise<void>;

  // Category Operations
  addRequirement(category: RequirementCategory, req: Requirement): Promise<void>;
  getByCategory(category: RequirementCategory): Promise<Requirement[]>;
  searchRequirements(query: string): Promise<Requirement[]>;

  // Session Operations
  startSession(): Promise<SessionLog>;
  endSession(sessionId: string): Promise<void>;
  addDecision(decision: Decision): Promise<void>;
}

/**
 * File structure for requirements storage
 *
 * .nexus/requirements/{projectId}/
 * ├── core/
 * │   ├── user_types.json       # UserType[]
 * │   ├── features.json         # FeatureRequirement[]
 * │   └── business_rules.json   # BusinessRule[]
 * ├── technical/
 * │   ├── stack_preferences.json
 * │   ├── integrations.json     # Integration[]
 * │   └── constraints.json      # Constraints
 * ├── design/
 * │   ├── style_preferences.json
 * │   ├── reference_sites.json  # ReferenceSite[]
 * │   └── design_system.json    # DesignSystem
 * └── metadata/
 *     ├── session_log.json      # SessionLog[]
 *     ├── decisions.json        # Decision[]
 *     └── scope_estimate.json   # ScopeEstimate
 */
```

#### State Persistence (GSD STATE.md)

```typescript
/**
 * StateManager handles GSD-style STATE.md files
 */
interface StateManager {
  // File paths
  stateFilePath: string;         // STATE.md
  continueFilePath: string;      // .continue-here.md

  // Core Operations
  saveState(state: NexusState): Promise<void>;
  loadState(projectId: string): Promise<NexusState>;

  // Mid-task Resume
  saveContinuePoint(point: ContinuePoint): Promise<void>;
  loadContinuePoint(): Promise<ContinuePoint | null>;
  clearContinuePoint(): Promise<void>;

  // State Reconciliation
  reconcileWithDB(dbState: NexusState): Promise<NexusState>;
}

/**
 * NexusState represents the current project state
 * Stored in STATE.md (human-readable markdown)
 */
interface NexusState {
  // Position
  currentPhase: string;          // "Phase 2 of 4 (Authentication)"
  currentFeature: string;        // Feature ID
  currentTask: string;           // Task ID
  progress: number;              // 0-100

  // Active Work
  activeTasks: string[];         // In-progress task IDs
  activeAgents: string[];        // Active agent IDs

  // Metrics
  tasksCompleted: number;
  totalTasks: number;
  timeElapsed: number;           // Minutes
  estimatedRemaining: number;    // Minutes

  // Decisions
  recentDecisions: Decision[];

  // Errors
  lastError?: string;
  errorCount: number;

  // Timestamps
  lastUpdated: Date;
  sessionStart: Date;
}

/**
 * ContinuePoint for mid-task resume
 * Stored in .continue-here.md
 */
interface ContinuePoint {
  // Context
  taskId: string;
  lastAction: string;

  // Position
  file?: string;
  line?: number;
  functionName?: string;

  // Next Steps
  nextSteps: string[];

  // Agent State
  agentId?: string;
  iterationCount: number;

  // Timestamp
  savedAt: Date;
}

/**
 * STATE.md format example:
 *
 * # Project State
 *
 * ## Current Position
 * - **Phase:** 2 of 4 (Authentication)
 * - **Feature:** F001 - Authentication System
 * - **Task:** F001-D-03 - Create registration API endpoint
 * - **Progress:** ████████░░ 80%
 *
 * ## Active Work
 * - F001-D-03: Create registration API endpoint (IN_PROGRESS)
 * - F001-D-04: Create registration tests (BLOCKED by F001-D-03)
 *
 * ## Metrics
 * - Tasks Completed: 34/47
 * - Time Elapsed: 3h 45m
 * - Estimated Remaining: 1h 30m
 *
 * ## Recent Decisions
 * - [2026-01-13 14:30]: Use bcrypt for password hashing (cost factor 12)
 * - [2026-01-13 14:45]: Session duration set to 30 days
 *
 * ## Last Updated
 * 2026-01-13 15:22:34 UTC
 */
```

#### Memory System (Long-term)

```typescript
/**
 * MemoryStorage handles long-term memory with embeddings
 * Uses SQLite + vector embeddings
 */
interface MemoryStorage {
  // Database path
  dbPath: string;                // .nexus/memory.db

  // Episode Operations
  storeEpisode(episode: MemoryEpisode): Promise<void>;
  queryEpisodes(query: string, limit?: number): Promise<MemoryEpisode[]>;
  getEpisodesByType(type: EpisodeType): Promise<MemoryEpisode[]>;
  deleteOldEpisodes(olderThan: Date): Promise<void>;

  // Search
  semanticSearch(query: string, limit: number): Promise<MemoryEpisode[]>;
  keywordSearch(keywords: string[]): Promise<MemoryEpisode[]>;

  // Statistics
  getStats(): Promise<MemoryStats>;
}

/**
 * EpisodeType from Auto-Claude
 */
enum EpisodeType {
  PATTERN = 'pattern',           // Reusable approach that worked
  GOTCHA = 'gotcha',             // Pitfall to avoid
  DECISION = 'decision',         // Architectural choice
  ERROR = 'error',               // Error and how it was fixed
  OPTIMIZATION = 'optimization', // Performance improvement
}

/**
 * MemoryEpisode captures a learning moment
 */
interface MemoryEpisode {
  id: string;
  type: EpisodeType;

  // Content
  title: string;
  description: string;
  context: string;               // What was happening
  resolution?: string;           // How it was resolved

  // Relevance
  tags: string[];
  projectId?: string;
  featureId?: string;

  // Embedding
  embedding?: number[];          // Vector embedding

  // Timestamps
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

/**
 * MemoryStats for monitoring
 */
interface MemoryStats {
  totalEpisodes: number;
  byType: Record<EpisodeType, number>;
  avgAccessCount: number;
  oldestEpisode: Date;
  newestEpisode: Date;
  databaseSizeMB: number;
}

/**
 * SQLite Schema for Memory System
 *
 * CREATE TABLE episodes (
 *   id TEXT PRIMARY KEY,
 *   type TEXT NOT NULL,
 *   title TEXT NOT NULL,
 *   description TEXT NOT NULL,
 *   context TEXT,
 *   resolution TEXT,
 *   tags TEXT,                   -- JSON array
 *   project_id TEXT,
 *   feature_id TEXT,
 *   embedding BLOB,              -- Serialized vector
 *   created_at INTEGER NOT NULL,
 *   accessed_at INTEGER NOT NULL,
 *   access_count INTEGER DEFAULT 0
 * );
 *
 * CREATE INDEX idx_episodes_type ON episodes(type);
 * CREATE INDEX idx_episodes_project ON episodes(project_id);
 * CREATE INDEX idx_episodes_created ON episodes(created_at);
 */
```

#### Session Storage

```typescript
/**
 * SessionStorage handles active session state
 * In-memory with periodic persistence
 */
interface SessionStorage {
  // Current Session
  currentSession: Session;

  // Operations
  startSession(projectId: string): Promise<Session>;
  endSession(): Promise<void>;
  pauseSession(): Promise<void>;
  resumeSession(sessionId: string): Promise<Session>;

  // State Access
  getTaskQueue(): Task[];
  getActiveAgents(): Agent[];
  getEventQueue(): NexusEvent[];

  // Updates
  updateTaskStatus(taskId: string, status: TaskStatus): void;
  updateAgentStatus(agentId: string, status: AgentStatus): void;
  pushEvent(event: NexusEvent): void;
}

/**
 * Session represents an active work session
 */
interface Session {
  id: string;
  projectId: string;

  // Status
  active: boolean;
  paused: boolean;

  // Queues
  taskQueue: Task[];             // Pending tasks
  activeAgents: Agent[];         // Running agents
  eventQueue: NexusEvent[];      // Pending events

  // Timing
  startedAt: Date;
  pausedAt?: Date;
  totalActiveTime: number;       // Milliseconds (excluding pauses)

  // Metrics
  tasksStarted: number;
  tasksCompleted: number;
  tasksFailed: number;
  eventsProcessed: number;
}

/**
 * NexusEvent for real-time updates
 */
interface NexusEvent {
  id: string;
  type: NexusEventType;
  source: string;                // Component that emitted
  payload: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
  error?: NexusError;
}

type NexusEventType =
  // Project Events
  | 'project.started'
  | 'project.paused'
  | 'project.resumed'
  | 'project.completed'
  | 'project.failed'
  // Task Events
  | 'task.created'
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.blocked'
  // Agent Events
  | 'agent.spawned'
  | 'agent.working'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.terminated'
  // Review Events
  | 'review.requested'
  | 'review.approved'
  | 'review.rejected'
  // Merge Events
  | 'merge.requested'
  | 'merge.completed'
  | 'merge.conflict'
  // Checkpoint Events
  | 'checkpoint.created'
  | 'checkpoint.restored'
  // State Events
  | 'state.updated'
  | 'state.error';
```

---

### Data Flow Diagrams

#### Genesis Mode Data Flow

```
+==============================================================================+
|                         GENESIS MODE DATA FLOW                                |
+==============================================================================+

  USER INPUT                              INTERVIEW ENGINE
  ═══════════                             ════════════════
  "I want to build                        ┌─────────────────────┐
   a marketplace                          │    INTERVIEW AI     │
   for freelance      ─────────────────>  │                     │
   designers"                             │  - Parse intent     │
                                          │  - Ask questions    │
                                          │  - Capture reqs     │
                                          │  - Validate         │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  REQUIREMENTS DB    │
                                          ├─────────────────────┤
                                          │  core/              │
                                          │  ├── user_types     │
                                          │  ├── features       │
                                          │  └── business_rules │
                                          │  technical/         │
                                          │  design/            │
                                          │  metadata/          │
                                          └──────────┬──────────┘
                                                     │
                    ┌────────────────────────────────┴────────────────┐
                    │                                                  │
                    ▼                                                  ▼
          ┌─────────────────────┐                          ┌─────────────────────┐
          │   RESEARCH ENGINE   │        (Optional)        │   PLANNING ENGINE   │
          │   (Gemini Deep)     │ ──────────────────────>  │                     │
          │                     │                          │  - Decompose feats  │
          │  - Competitors      │                          │  - Create tasks     │
          │  - UX patterns      │                          │  - Estimate time    │
          │  - Tech analysis    │                          │  - Resolve deps     │
          └─────────────────────┘                          └──────────┬──────────┘
                                                                      │
                                                                      ▼
                                                           ┌─────────────────────┐
                                                           │    TASK DATABASE    │
                                                           ├─────────────────────┤
                                                           │  Features[]         │
                                                           │  ├── SubFeatures[]  │
                                                           │  │   └── Tasks[]    │
                                                           │  TaskWaves[]        │
                                                           │  Dependencies[]     │
                                                           └──────────┬──────────┘
                                                                      │
                                                                      ▼
                                                           ┌─────────────────────┐
                                                           │  EXECUTION ENGINE   │
                                                           ├─────────────────────┤
                                                           │  NexusCoordinator   │
                                                           │  ├── AgentPool      │
                                                           │  ├── TaskQueue      │
                                                           │  └── EventBus       │
                                                           └──────────┬──────────┘
                                                                      │
                                          ┌───────────────────────────┼───────────────────────────┐
                                          │                           │                           │
                                          ▼                           ▼                           ▼
                               ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
                               │   CODER AGENT    │       │   CODER AGENT    │       │   CODER AGENT    │
                               │   (Worktree 1)   │       │   (Worktree 2)   │       │   (Worktree 3)   │
                               └────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
                                        │                          │                          │
                                        ▼                          ▼                          ▼
                               ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
                               │    QA LOOP       │       │    QA LOOP       │       │    QA LOOP       │
                               │  Build→Test→Fix  │       │  Build→Test→Fix  │       │  Build→Test→Fix  │
                               └────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
                                        │                          │                          │
                                        └──────────────────────────┼──────────────────────────┘
                                                                   │
                                                                   ▼
                                                        ┌──────────────────┐
                                                        │  MERGER AGENT    │
                                                        │  Conflict Resolve│
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │   MAIN BRANCH    │
                                                        │  (Production)    │
                                                        └──────────────────┘
```

**Data Transformations in Genesis Mode:**

| Stage | Input | Output | Data Format |
|-------|-------|--------|-------------|
| Interview | User messages | Requirements | `RequirementsDatabase` JSON |
| Research | Requirements | Enhanced requirements | `ResearchReport` JSON |
| Planning | Requirements | Features + Tasks | `Feature[]` + `Task[]` |
| Execution | Tasks | Code changes | `TaskResult` + Files |
| Merge | Multiple branches | Unified codebase | Git commits |

---

#### Evolution Mode Data Flow

```
+==============================================================================+
|                        EVOLUTION MODE DATA FLOW                               |
+==============================================================================+

  EXISTING PROJECT                        CONTEXT ANALYZER
  ════════════════                        ════════════════
  ┌────────────────┐                      ┌─────────────────────┐
  │  src/          │                      │  CONTEXT ANALYZER   │
  │  package.json  │ ────────────────>    │                     │
  │  tsconfig.json │                      │  - Parse structure  │
  │  README.md     │                      │  - Detect framework │
  │  tests/        │                      │  - Identify patterns│
  └────────────────┘                      │  - Map dependencies │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   PROJECT CONTEXT   │
                                          ├─────────────────────┤
                                          │  - Tech stack       │
                                          │  - File structure   │
                                          │  - Existing features│
                                          │  - Code patterns    │
                                          └──────────┬──────────┘
                                                     │
  USER INPUT                                         │
  ═══════════                                        │
  "Add user         ──────────────────────────────>  │
   authentication                                    │
   with OAuth"                                       ▼
                                          ┌─────────────────────┐
                                          │    KANBAN BOARD     │
                                          ├─────────────────────┤
                                          │  ┌─────────────────┐│
                                          │  │ BACKLOG         ││
                                          │  │ ┌─────────────┐ ││
                                          │  │ │ Feature     │ ││
                                          │  │ │ Card        │ ││
                                          │  │ └─────────────┘ ││
                                          │  └─────────────────┘│
                                          └──────────┬──────────┘
                                                     │
                                      ┌──────────────┴──────────────┐
                                      │                              │
                                      ▼                              ▼
                           ┌──────────────────────┐      ┌──────────────────────┐
                           │ SIMPLE FEATURE       │      │ COMPLEX FEATURE      │
                           │ (Drag to In Progress)│      │ (Click "Plan" button)│
                           └──────────┬───────────┘      └──────────┬───────────┘
                                      │                              │
                                      │                              ▼
                                      │                   ┌──────────────────────┐
                                      │                   │   PLANNING ENGINE    │
                                      │                   │                      │
                                      │                   │  - Decompose feature │
                                      │                   │  - Create tasks      │
                                      │                   │  - Review with user  │
                                      │                   └──────────┬───────────┘
                                      │                              │
                                      └──────────────┬───────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  EXECUTION ENGINE   │
                                          │  (Same as Genesis)  │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   UPDATED PROJECT   │
                                          │   + New Features    │
                                          └─────────────────────┘
```

**Data Transformations in Evolution Mode:**

| Stage | Input | Output | Data Format |
|-------|-------|--------|-------------|
| Context Analysis | Project files | ProjectContext | `ProjectContext` interface |
| Feature Creation | User request | Feature | `Feature` interface |
| Planning | Feature | Tasks | `Task[]` |
| Execution | Tasks | Code changes | `TaskResult` + Files |
| Integration | Changes | Updated project | Git merge |

---

#### QA Loop Data Flow

```
+==============================================================================+
|                            QA LOOP DATA FLOW                                  |
+==============================================================================+

  TASK ASSIGNMENT                          CODER AGENT
  ═══════════════                          ════════════
  ┌─────────────────┐                      ┌─────────────────────┐
  │  Task: F001-B-02│                      │   CODER AGENT       │
  │                 │ ────────────────>    │   Claude Sonnet     │
  │  - Create       │                      │                     │
  │    hashPassword │                      │  Input:             │
  │    function     │                      │  - Task spec        │
  │                 │                      │  - File context     │
  │  - Worktree:    │                      │  - Dependencies     │
  │    /wt/F001-B-02│                      │  - Patterns         │
  └─────────────────┘                      └──────────┬──────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │    GENERATE CODE     │
                                           ├──────────────────────┤
                                           │  src/lib/auth/       │
                                           │  └── password.ts     │
                                           └──────────┬───────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
          ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
          │      BUILD       │            │      LINT        │            │      TEST        │
          │   npm run build  │ ───PASS──> │   eslint .       │ ───PASS──> │   vitest run     │
          └────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
                   │                               │                               │
                   │ FAIL                          │ FAIL                          │ FAIL
                   ▼                               ▼                               ▼
          ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
          │  BUILD ERRORS    │            │  LINT ERRORS     │            │  TEST FAILURES   │
          │                  │            │                  │            │                  │
          │  - TS2304: name  │            │  - no-unused-vars│            │  - Expected X    │
          │    not found     │            │  - prefer-const  │            │    Received Y    │
          └────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
                   │                               │                               │
                   └───────────────────────────────┼───────────────────────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │     FIX ERRORS       │
                                        ├──────────────────────┤
                                        │  Iteration++         │
                                        │  (max 50)            │
                                        │                      │
                                        │  Feed errors back    │
                                        │  to Coder Agent      │
                                        └──────────┬───────────┘
                                                   │
                                                   │ iteration < 50
                                    ┌──────────────┴──────────────┐
                                    │                              │
                                    ▼                              ▼ iteration >= 50
                         ┌──────────────────────┐      ┌──────────────────────┐
                         │   RETRY BUILD/TEST   │      │  HUMAN ESCALATION    │
                         │   (Loop continues)   │      │  (Checkpoint)        │
                         └──────────────────────┘      └──────────────────────┘
                                    │
                                    │ ALL PASS
                                    ▼
                         ┌──────────────────────┐
                         │    CODE REVIEW       │
                         ├──────────────────────┤
                         │  REVIEWER AGENT      │
                         │  (Gemini 2.5 Pro)    │
                         │                      │
                         │  - Security check    │
                         │  - Best practices    │
                         │  - Code quality      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                      │
                         ▼                      ▼
              ┌──────────────────┐   ┌──────────────────┐
              │    APPROVED      │   │ REQUEST_CHANGES  │
              │                  │   │                  │
              │  Proceed to      │   │  Feed back to    │
              │  merge           │   │  Coder Agent     │
              └────────┬─────────┘   └────────┬─────────┘
                       │                      │
                       │                      │ (iteration++)
                       │                      └─────────────────────> [RETRY]
                       │
                       ▼
              ┌──────────────────┐
              │   MERGER AGENT   │
              ├──────────────────┤
              │  - git checkout  │
              │  - git merge     │
              │  - Resolve       │
              │    conflicts     │
              │  - git commit    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   TASK COMPLETE  │
              ├──────────────────┤
              │  TaskResult {    │
              │    status: ok    │
              │    iterations: 3 │
              │    commitHash:   │
              │      abc123      │
              │  }               │
              └──────────────────┘
```

**QA Loop Data Structures:**

```typescript
/**
 * QALoopContext passed through each iteration
 */
interface QALoopContext {
  taskId: string;
  iteration: number;
  maxIterations: number;

  // Current state
  codeChanges: FileChange[];
  buildResult?: BuildResult;
  lintResult?: LintResult;
  testResult?: TestResult;
  reviewResult?: ReviewResult;

  // History
  errorHistory: ErrorRecord[];
  fixAttempts: FixAttempt[];

  // Timing
  startTime: Date;
  lastIterationTime: Date;
}

/**
 * QAResult returned after loop completes
 */
interface QAResult {
  success: boolean;
  iterations: number;
  exitReason: 'passed' | 'max_iterations' | 'escalated' | 'error';

  // Final results
  buildPassed: boolean;
  lintPassed: boolean;
  testsPassed: boolean;
  reviewApproved: boolean;

  // Details
  filesChanged: FileChange[];
  commitHash?: string;

  // Metrics
  totalDuration: number;
  tokensUsed: number;
  cost: number;
}
```

---

### File System Layout

The complete Nexus file system structure:

```
nexus/
├── .nexus/                              # Nexus data directory
│   ├── config.json                      # Global configuration
│   ├── memory.db                        # SQLite memory database
│   │
│   ├── projects/                        # Per-project data
│   │   └── {project-id}/
│   │       ├── project.json             # Project metadata
│   │       ├── features.json            # Feature definitions
│   │       ├── tasks.json               # Task definitions
│   │       ├── state.json               # Current state (DB format)
│   │       └── checkpoints/
│   │           └── {checkpoint-id}.json
│   │
│   ├── requirements/                    # Requirements databases
│   │   └── {project-id}/
│   │       ├── core/
│   │       │   ├── user_types.json
│   │       │   ├── features.json
│   │       │   └── business_rules.json
│   │       ├── technical/
│   │       │   ├── stack_preferences.json
│   │       │   ├── integrations.json
│   │       │   └── constraints.json
│   │       ├── design/
│   │       │   ├── style_preferences.json
│   │       │   ├── reference_sites.json
│   │       │   └── design_system.json
│   │       └── metadata/
│   │           ├── session_log.json
│   │           ├── decisions.json
│   │           └── scope_estimate.json
│   │
│   ├── agents/                          # Agent configurations
│   │   ├── planner.json                 # Planner agent config
│   │   ├── coder.json                   # Coder agent config
│   │   ├── reviewer.json                # Reviewer agent config
│   │   ├── tester.json                  # Tester agent config
│   │   └── merger.json                  # Merger agent config
│   │
│   └── logs/                            # Execution logs
│       ├── sessions/
│       │   └── {session-id}.log
│       └── agents/
│           └── {agent-id}.log
│
├── src/                                 # Nexus source code
│   ├── ui/                              # Layer 1: User Interface
│   │   ├── components/
│   │   │   ├── interview/               # Genesis mode interview
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── RequirementsSidebar.tsx
│   │   │   │   └── ProgressIndicator.tsx
│   │   │   ├── kanban/                  # Evolution mode Kanban
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   └── FeatureCard.tsx
│   │   │   ├── dashboard/               # Progress dashboard
│   │   │   │   ├── ProgressDashboard.tsx
│   │   │   │   ├── AgentStatusGrid.tsx
│   │   │   │   └── CostTracker.tsx
│   │   │   └── common/                  # Shared components
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       └── Modal.tsx
│   │   ├── pages/
│   │   │   ├── index.tsx                # Home/landing
│   │   │   ├── genesis.tsx              # Genesis mode
│   │   │   ├── evolution.tsx            # Evolution mode
│   │   │   └── settings.tsx             # Settings
│   │   ├── hooks/
│   │   │   ├── useProject.ts
│   │   │   ├── useAgents.ts
│   │   │   └── useEvents.ts
│   │   └── stores/                      # Zustand stores
│   │       ├── projectStore.ts
│   │       ├── agentStore.ts
│   │       └── eventStore.ts
│   │
│   ├── orchestration/                   # Layer 2: Orchestration
│   │   ├── coordinator/
│   │   │   ├── NexusCoordinator.ts      # Main coordinator
│   │   │   ├── WorkflowController.ts    # Mode-specific flows
│   │   │   └── SegmentRouter.ts         # GSD routing
│   │   ├── agents/
│   │   │   ├── AgentPool.ts             # Agent management
│   │   │   ├── AgentSpawner.ts          # Agent creation
│   │   │   └── AgentContext.ts          # Context building
│   │   ├── queue/
│   │   │   ├── TaskQueue.ts             # Priority queue
│   │   │   └── TaskAssigner.ts          # Assignment logic
│   │   └── events/
│   │       ├── EventBus.ts              # Event distribution
│   │       └── EventHandlers.ts         # Handler registry
│   │
│   ├── planning/                        # Layer 3: Planning
│   │   ├── decomposition/
│   │   │   ├── TaskDecomposer.ts        # GSD-style decomposition
│   │   │   ├── FeatureAnalyzer.ts       # Feature classification
│   │   │   └── TaskGenerator.ts         # Task creation
│   │   ├── dependencies/
│   │   │   ├── DependencyResolver.ts    # Topological sort
│   │   │   ├── DependencyGraph.ts       # Graph structure
│   │   │   └── CycleDetector.ts         # Cycle detection
│   │   ├── estimation/
│   │   │   ├── TimeEstimator.ts         # Time estimation
│   │   │   ├── CostEstimator.ts         # Cost calculation
│   │   │   └── ScopeAnalyzer.ts         # Scope assessment
│   │   └── prioritization/
│   │       ├── TaskPrioritizer.ts       # Priority ordering
│   │       └── ParallelWaveCalculator.ts # Parallel waves
│   │
│   ├── execution/                       # Layer 4: Execution
│   │   ├── qa-loop/
│   │   │   ├── QALoopEngine.ts          # Main QA loop
│   │   │   ├── IterationTracker.ts      # Iteration counting
│   │   │   └── EscalationManager.ts     # Human escalation
│   │   ├── runners/
│   │   │   ├── CoderRunner.ts           # Coder agent runner
│   │   │   ├── TesterRunner.ts          # Tester agent runner
│   │   │   ├── ReviewerRunner.ts        # Reviewer agent runner
│   │   │   └── MergerRunner.ts          # Merger agent runner
│   │   └── tools/
│   │       ├── ToolExecutor.ts          # Tool execution
│   │       ├── CommandRunner.ts         # CLI commands
│   │       └── FileOperations.ts        # File operations
│   │
│   ├── quality/                         # Layer 5: Quality
│   │   ├── testing/
│   │   │   ├── TestRunner.ts            # Test execution
│   │   │   ├── FrameworkDetector.ts     # Framework detection
│   │   │   └── CoverageTracker.ts       # Coverage monitoring
│   │   ├── review/
│   │   │   ├── CodeReviewer.ts          # AI review
│   │   │   ├── PatternChecker.ts        # Pattern validation
│   │   │   └── SecurityScanner.ts       # Security checks
│   │   ├── validation/
│   │   │   ├── BuildVerifier.ts         # Build validation
│   │   │   ├── LintRunner.ts            # Linting
│   │   │   └── TypeChecker.ts           # Type checking
│   │   └── errors/
│   │       ├── ErrorClassifier.ts       # Error classification
│   │       └── ErrorPatterns.ts         # Pattern definitions
│   │
│   ├── persistence/                     # Layer 6: Persistence
│   │   ├── state/
│   │   │   ├── StateManager.ts          # STATE.md management
│   │   │   ├── StateParser.ts           # Markdown parsing
│   │   │   └── StateWriter.ts           # Markdown writing
│   │   ├── memory/
│   │   │   ├── MemorySystem.ts          # Memory operations
│   │   │   ├── EmbeddingService.ts      # Embedding generation
│   │   │   └── MemoryQuery.ts           # Semantic search
│   │   ├── checkpoints/
│   │   │   ├── CheckpointManager.ts     # Checkpoint CRUD
│   │   │   └── CheckpointRestorer.ts    # Restore logic
│   │   ├── requirements/
│   │   │   ├── RequirementsDB.ts        # Requirements CRUD
│   │   │   └── CategoryOrganizer.ts     # Categorization
│   │   └── projects/
│   │       ├── ProjectStore.ts          # Project CRUD
│   │       └── SessionStore.ts          # Session management
│   │
│   ├── infrastructure/                  # Layer 7: Infrastructure
│   │   ├── git/
│   │   │   ├── WorktreeManager.ts       # Worktree lifecycle
│   │   │   ├── GitOperations.ts         # Git commands
│   │   │   └── ConflictResolver.ts      # Conflict handling
│   │   ├── fs/
│   │   │   ├── FileSystem.ts            # File operations
│   │   │   ├── FileWatcher.ts           # File watching
│   │   │   └── PathResolver.ts          # Path handling
│   │   ├── lsp/
│   │   │   ├── LSPClient.ts             # LSP protocol
│   │   │   └── LanguageServers.ts       # Server management
│   │   ├── ast/
│   │   │   ├── ASTTools.ts              # AST operations
│   │   │   └── ASTPatterns.ts           # Pattern matching
│   │   └── api/
│   │       ├── ClaudeClient.ts          # Anthropic API
│   │       ├── GeminiClient.ts          # Google API
│   │       └── RateLimiter.ts           # Rate limiting
│   │
│   ├── types/                           # TypeScript types
│   │   ├── task.ts                      # Task types
│   │   ├── feature.ts                   # Feature types
│   │   ├── agent.ts                     # Agent types
│   │   ├── project.ts                   # Project types
│   │   ├── requirement.ts               # Requirement types
│   │   ├── events.ts                    # Event types
│   │   └── index.ts                     # Re-exports
│   │
│   └── utils/                           # Shared utilities
│       ├── logger.ts                    # Logging
│       ├── validation.ts                # Validation helpers
│       ├── formatting.ts                # Format helpers
│       └── crypto.ts                    # ID generation
│
├── tests/                               # Test suite
│   ├── unit/                            # Unit tests
│   │   ├── planning/
│   │   ├── execution/
│   │   └── persistence/
│   ├── integration/                     # Integration tests
│   │   ├── qa-loop.test.ts
│   │   ├── agent-workflow.test.ts
│   │   └── state-recovery.test.ts
│   └── e2e/                             # End-to-end tests
│       ├── genesis-flow.test.ts
│       └── evolution-flow.test.ts
│
├── config/                              # Configuration files
│   ├── agents/                          # Agent prompts
│   │   ├── planner.prompt.md
│   │   ├── coder.prompt.md
│   │   ├── reviewer.prompt.md
│   │   ├── tester.prompt.md
│   │   └── merger.prompt.md
│   ├── eslint.config.js
│   ├── vitest.config.ts
│   └── playwright.config.ts
│
├── docs/                                # Documentation
│   ├── architecture.md
│   ├── agents.md
│   └── api.md
│
├── package.json
├── tsconfig.json
├── STATE.md                             # GSD state file
└── .continue-here.md                    # Mid-task resume
```

**Directory Purposes:**

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `.nexus/` | Nexus data storage | `memory.db`, project JSON files |
| `src/ui/` | React components | Interview, Kanban, Dashboard |
| `src/orchestration/` | Agent coordination | Coordinator, AgentPool, EventBus |
| `src/planning/` | Task decomposition | Decomposer, DependencyResolver |
| `src/execution/` | Task execution | QALoop, Agent runners |
| `src/quality/` | Quality checks | TestRunner, CodeReviewer |
| `src/persistence/` | Data storage | StateManager, MemorySystem |
| `src/infrastructure/` | System services | Git, LSP, API clients |
| `src/types/` | TypeScript types | All interface definitions |
| `tests/` | Test suite | Unit, integration, E2E |
| `config/` | Configuration | Agent prompts, tool configs |

---

### Data Validation Rules

#### Task Validation

```typescript
/**
 * TaskValidator ensures task integrity
 */
interface TaskValidator {
  validate(task: Task): ValidationResult;
}

const TASK_VALIDATION_RULES: ValidationRule<Task>[] = [
  // Time limit
  {
    name: 'max-time-30-minutes',
    validate: (task) => task.timeEstimate <= 30,
    message: 'Task time estimate must not exceed 30 minutes',
    severity: 'error',
  },

  // Minimum time
  {
    name: 'min-time-5-minutes',
    validate: (task) => task.timeEstimate >= 5,
    message: 'Task time estimate should be at least 5 minutes',
    severity: 'warning',
  },

  // ID format
  {
    name: 'valid-id-format',
    validate: (task) => /^F\d{3}-[A-Z]-\d{2}$/.test(task.id),
    message: 'Task ID must match format F###-X-## (e.g., F001-A-01)',
    severity: 'error',
  },

  // Required fields
  {
    name: 'required-fields',
    validate: (task) => !!(task.name && task.description && task.test),
    message: 'Task must have name, description, and test criteria',
    severity: 'error',
  },

  // Files array
  {
    name: 'valid-files',
    validate: (task) => task.files.length > 0 || task.type === 'checkpoint',
    message: 'Non-checkpoint tasks must specify at least one file',
    severity: 'warning',
  },

  // Valid dependencies
  {
    name: 'valid-dependencies',
    validate: (task, context) => {
      return task.dependsOn.every(depId =>
        context.allTaskIds.includes(depId)
      );
    },
    message: 'All task dependencies must reference existing tasks',
    severity: 'error',
  },

  // No self-dependency
  {
    name: 'no-self-dependency',
    validate: (task) => !task.dependsOn.includes(task.id),
    message: 'Task cannot depend on itself',
    severity: 'error',
  },

  // Max iterations
  {
    name: 'valid-max-iterations',
    validate: (task) => task.maxIterations > 0 && task.maxIterations <= 50,
    message: 'Max iterations must be between 1 and 50',
    severity: 'error',
  },
];

/**
 * ValidationResult structure
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  rule: string;
  message: string;
  field?: string;
}

interface ValidationWarning {
  rule: string;
  message: string;
  suggestion?: string;
}
```

#### Feature Validation

```typescript
const FEATURE_VALIDATION_RULES: ValidationRule<Feature>[] = [
  // At least one task
  {
    name: 'min-one-task',
    validate: (feature) => feature.totalTasks > 0,
    message: 'Feature must have at least one task',
    severity: 'error',
  },

  // ID format
  {
    name: 'valid-id-format',
    validate: (feature) => /^F\d{3}$/.test(feature.id),
    message: 'Feature ID must match format F### (e.g., F001)',
    severity: 'error',
  },

  // Consistent ID hierarchy
  {
    name: 'consistent-hierarchy',
    validate: (feature) => {
      return feature.subFeatures.every(sf =>
        sf.id.startsWith(feature.id + '-') &&
        sf.tasks.every(t => t.id.startsWith(sf.id + '-'))
      );
    },
    message: 'Sub-features and tasks must follow ID hierarchy',
    severity: 'error',
  },

  // Ordered sub-features
  {
    name: 'ordered-subfeatures',
    validate: (feature) => {
      const orders = feature.subFeatures.map(sf => sf.order);
      return orders.every((o, i) => i === 0 || o > orders[i - 1]);
    },
    message: 'Sub-features must have ordered execution sequence',
    severity: 'warning',
  },

  // Complexity matches task count
  {
    name: 'complexity-task-match',
    validate: (feature) => {
      if (feature.complexity === 'simple') {
        return feature.totalTasks <= 30;
      }
      return true; // Complex can have any count
    },
    message: 'Simple features should have 30 or fewer tasks',
    severity: 'warning',
  },

  // Valid dependencies
  {
    name: 'valid-feature-dependencies',
    validate: (feature, context) => {
      return feature.dependsOn.every(depId =>
        context.allFeatureIds.includes(depId)
      );
    },
    message: 'Feature dependencies must reference existing features',
    severity: 'error',
  },

  // Reasonable time estimate
  {
    name: 'reasonable-estimate',
    validate: (feature) => {
      const minTime = feature.totalTasks * 5;  // 5 min minimum per task
      const maxTime = feature.totalTasks * 30; // 30 min max per task
      return feature.estimatedTimeMinutes >= minTime &&
             feature.estimatedTimeMinutes <= maxTime;
    },
    message: 'Time estimate should be between 5-30 minutes per task',
    severity: 'warning',
  },
];
```

#### Requirement Validation

```typescript
const REQUIREMENT_VALIDATION_RULES: ValidationRule<Requirement>[] = [
  // ID format
  {
    name: 'valid-id-format',
    validate: (req) => /^REQ-(FUN|NFN|UIX|TEC|BUS|INT)-\d{3}$/.test(req.id),
    message: 'Requirement ID must match format REQ-{CAT}-### (e.g., REQ-FUN-001)',
    severity: 'error',
  },

  // Category prefix matches
  {
    name: 'category-id-match',
    validate: (req) => {
      const categoryPrefixes: Record<RequirementCategory, string> = {
        functional: 'FUN',
        non_functional: 'NFN',
        ui_ux: 'UIX',
        technical: 'TEC',
        business_logic: 'BUS',
        integrations: 'INT',
      };
      return req.id.includes(`-${categoryPrefixes[req.category]}-`);
    },
    message: 'Requirement ID category prefix must match category',
    severity: 'error',
  },

  // Valid priority
  {
    name: 'valid-priority',
    validate: (req) => ['must', 'should', 'could', 'wont'].includes(req.priority),
    message: 'Priority must be: must, should, could, or wont',
    severity: 'error',
  },

  // Has user stories
  {
    name: 'has-user-stories',
    validate: (req) => req.userStories.length > 0,
    message: 'Requirement should have at least one user story',
    severity: 'warning',
  },

  // Valid user story format
  {
    name: 'valid-user-story-format',
    validate: (req) => {
      return req.userStories.every(story =>
        story.role && story.want && story.benefit
      );
    },
    message: 'User stories must have role, want, and benefit',
    severity: 'error',
  },

  // Has acceptance criteria
  {
    name: 'has-acceptance-criteria',
    validate: (req) => req.acceptanceCriteria.length > 0,
    message: 'Requirement should have acceptance criteria',
    severity: 'warning',
  },

  // Confidence score valid
  {
    name: 'valid-confidence',
    validate: (req) => req.confidence >= 0 && req.confidence <= 1,
    message: 'Confidence score must be between 0 and 1',
    severity: 'error',
  },

  // Interview requirements have source quote
  {
    name: 'interview-has-quote',
    validate: (req) => {
      if (req.source === 'interview') {
        return !!req.sourceQuote;
      }
      return true;
    },
    message: 'Interview-sourced requirements should have source quote',
    severity: 'warning',
  },
];
```

#### Agent Validation

```typescript
const AGENT_VALIDATION_RULES: ValidationRule<Agent>[] = [
  // Valid type
  {
    name: 'valid-type',
    validate: (agent) => Object.values(AgentType).includes(agent.type),
    message: 'Agent type must be valid AgentType enum value',
    severity: 'error',
  },

  // Valid model
  {
    name: 'valid-model',
    validate: (agent) => {
      const validModels = [
        'claude-opus-4-5',
        'claude-sonnet-4-5',
        'gemini-2.5-pro',
        'gpt-4o',
      ];
      return validModels.includes(agent.model.model);
    },
    message: 'Agent model must be a supported model',
    severity: 'error',
  },

  // Has system prompt
  {
    name: 'has-system-prompt',
    validate: (agent) => agent.systemPrompt.length > 0,
    message: 'Agent must have a system prompt',
    severity: 'error',
  },

  // Has required tools
  {
    name: 'has-required-tools',
    validate: (agent) => {
      const requiredTools: Record<AgentType, string[]> = {
        planner: ['read', 'search'],
        coder: ['read', 'write', 'terminal'],
        reviewer: ['read', 'search'],
        tester: ['read', 'write', 'terminal'],
        merger: ['read', 'write', 'git'],
      };
      return requiredTools[agent.type].every(tool =>
        agent.tools.includes(tool)
      );
    },
    message: 'Agent must have all required tools for its type',
    severity: 'error',
  },

  // Valid temperature
  {
    name: 'valid-temperature',
    validate: (agent) => {
      return agent.model.temperature >= 0 && agent.model.temperature <= 1;
    },
    message: 'Model temperature must be between 0 and 1',
    severity: 'error',
  },

  // Valid max tokens
  {
    name: 'valid-max-tokens',
    validate: (agent) => {
      return agent.model.maxTokens > 0 && agent.model.maxTokens <= 200000;
    },
    message: 'Max tokens must be between 1 and 200,000',
    severity: 'error',
  },
];
```

#### Project Validation

```typescript
const PROJECT_VALIDATION_RULES: ValidationRule<Project>[] = [
  // Valid mode
  {
    name: 'valid-mode',
    validate: (project) => ['genesis', 'evolution'].includes(project.mode),
    message: 'Project mode must be genesis or evolution',
    severity: 'error',
  },

  // Genesis has requirements
  {
    name: 'genesis-has-requirements',
    validate: (project) => {
      if (project.mode === 'genesis') {
        return !!project.requirements;
      }
      return true;
    },
    message: 'Genesis mode projects must have requirements',
    severity: 'error',
  },

  // Has features
  {
    name: 'has-features',
    validate: (project) => project.features.length > 0,
    message: 'Project must have at least one feature',
    severity: 'warning',
  },

  // Valid repository path
  {
    name: 'valid-repository',
    validate: (project) => {
      return project.repositoryPath.length > 0;
    },
    message: 'Project must have a repository path',
    severity: 'error',
  },

  // Valid settings
  {
    name: 'valid-settings',
    validate: (project) => {
      const s = project.settings;
      return s.maxParallelAgents > 0 &&
             s.maxParallelAgents <= 10 &&
             s.maxQAIterations > 0 &&
             s.maxQAIterations <= 100 &&
             s.testCoverageTarget >= 0 &&
             s.testCoverageTarget <= 100;
    },
    message: 'Project settings must have valid values',
    severity: 'error',
  },

  // Consistent task count
  {
    name: 'consistent-task-count',
    validate: (project) => {
      const computedTotal = project.features.reduce(
        (sum, f) => sum + f.totalTasks, 0
      );
      return project.totalTasks === computedTotal;
    },
    message: 'Total tasks must equal sum of feature tasks',
    severity: 'warning',
  },
];
```

---

### Task 5.2 Completion Checklist

- [x] All core data models defined (TypeScript interfaces)
  - [x] Task model with TaskStatus, TaskType, TaskComplexity enums
  - [x] Feature model with FeatureStatus, FeatureComplexity enums
  - [x] Requirement model with RequirementsDatabase structure
  - [x] Agent model with AgentType, AgentStatus, AgentContext
  - [x] Project model with ProjectMode, ProjectStatus, ProjectSettings
- [x] Storage architecture complete
  - [x] Requirements Database (JSON files)
  - [x] State Persistence (GSD STATE.md format)
  - [x] Memory System (SQLite + embeddings)
  - [x] Session Storage (in-memory with persistence)
- [x] Data flow diagrams for all modes
  - [x] Genesis Mode data flow
  - [x] Evolution Mode data flow
  - [x] QA Loop data flow
- [x] File system layout defined
  - [x] Complete directory structure
  - [x] Purpose of each directory
  - [x] Key files in each
- [x] Data validation rules documented
  - [x] Task validation (8 rules)
  - [x] Feature validation (7 rules)
  - [x] Requirement validation (8 rules)
  - [x] Agent validation (6 rules)
  - [x] Project validation (6 rules)

**[TASK 5.2 COMPLETE]**

---

## Task 5.3: Agent Architecture

### Overview

The Agent Architecture defines the complete multi-agent system that powers Nexus execution. This architecture follows these core principles:

1. **Specialization** - Each agent type has a distinct role and optimal model
2. **Loose Coupling** - Agents communicate through well-defined messages
3. **Parallel Execution** - Multiple agents work concurrently via git worktrees
4. **Fault Tolerance** - Graceful degradation and recovery from failures
5. **Observable** - Comprehensive metrics and logging for monitoring

---

### Part A: Agent Definitions

#### Agent Type Overview

| Agent Type | Role | Primary Model | Secondary Model | Max Concurrent |
|------------|------|---------------|-----------------|----------------|
| **Planner** | Strategic planning, decomposition | Claude Opus 4 | Claude Sonnet 4 | 1 |
| **Coder** | Code generation, implementation | Claude Sonnet 4 | Claude Sonnet 4 | 3 |
| **Reviewer** | Code review, quality assessment | Gemini 2.5 Pro | Claude Sonnet 4 | 1 |
| **Tester** | Test writing, test execution | Claude Sonnet 4 | Claude Sonnet 4 | 2 |
| **Merger** | Git operations, conflict resolution | Claude Sonnet 4 | Claude Sonnet 4 | 1 |

---

#### Planner Agent

**Role:** Strategic planning, task decomposition, dependency resolution

```typescript
/**
 * PlannerAgent Configuration
 */
interface PlannerAgentConfig {
  id: 'agent-planner-001';
  type: AgentType.PLANNER;
  name: 'Planner';

  // Model Configuration
  model: {
    provider: 'anthropic';
    model: 'claude-opus-4-5';
    maxTokens: 8192;
    temperature: 0.3;  // Lower for more consistent planning
  };

  // Context Requirements
  contextRequirements: {
    // What the planner needs to do its job
    requirementsDatabase: boolean;  // Full requirements
    projectStructure: boolean;      // Directory tree
    existingFeatures: boolean;      // What's already built
    historicalVelocity: boolean;    // Past task times
    patternLibrary: boolean;        // Common patterns
  };

  // Tools Available
  tools: [
    'read',           // Read files
    'search',         // Search codebase
    'glob',           // Find files by pattern
    'grep',           // Search content
    'memory_query',   // Query past experiences
  ];

  // Decision Authority
  authority: {
    canDecomposeTasks: true;
    canEstimateTime: true;
    canSetPriority: true;
    canDefineDepencies: true;
    canSkipTasks: false;           // Needs human approval
    canChangeScope: false;         // Needs human approval
  };
}

/**
 * Planner Agent System Prompt Outline
 */
const PLANNER_SYSTEM_PROMPT = `
You are the Planner Agent for Nexus, responsible for strategic planning and task decomposition.

## Your Role
- Analyze requirements and features
- Decompose features into atomic tasks (max 30 minutes each)
- Identify dependencies between tasks
- Estimate time for each task
- Create parallel execution waves

## Core Rules
1. NEVER create a task that takes more than 30 minutes
2. Each task must have clear success criteria
3. Tasks should be independently testable
4. Identify ALL dependencies before execution begins
5. Consider existing codebase patterns

## Task Structure
Each task must specify:
- ID: Hierarchical (F001-A-01)
- Name: Short, descriptive
- Description: What to implement
- Files: What files to create/modify
- Test: How to verify success
- Dependencies: What must complete first
- Time Estimate: 5-30 minutes

## Output Format
Provide tasks in the NexusPlan format with clear ordering and parallelization opportunities.
`;

/**
 * Planner Output Format
 */
interface PlannerOutput {
  plan: NexusPlan;
  rationale: string;
  assumptions: string[];
  risks: PlanRisk[];
  alternatives?: AlternativePlan[];
}

interface NexusPlan {
  featureId: string;
  totalTasks: number;
  estimatedTime: number;              // Total minutes
  waves: TaskWave[];
  tasks: NexusTask[];
  dependencies: DependencyEdge[];
}

interface PlanRisk {
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}
```

**Handoff Protocol:**

```
Planner → Orchestrator:
  1. Planner completes decomposition
  2. Planner validates all dependencies
  3. Planner submits NexusPlan to Orchestrator
  4. Orchestrator validates plan structure
  5. Orchestrator queues tasks for execution
```

---

#### Coder Agent

**Role:** Code generation, implementation, bug fixes

```typescript
/**
 * CoderAgent Configuration
 */
interface CoderAgentConfig {
  id: string;                       // e.g., 'agent-coder-001'
  type: AgentType.CODER;
  name: 'Coder';

  // Model Configuration
  model: {
    provider: 'anthropic';
    model: 'claude-sonnet-4-5';
    maxTokens: 16384;              // Larger for code generation
    temperature: 0.2;              // Low for consistent code
  };

  // Context Requirements
  contextRequirements: {
    taskSpecification: boolean;     // The task to implement
    fileContext: boolean;           // Relevant existing files
    projectStructure: boolean;      // Directory tree
    dependencies: boolean;          // package.json, etc.
    relatedPatterns: boolean;       // Similar code patterns
    testExamples: boolean;          // Existing test patterns
  };

  // Tools Available
  tools: [
    'read',           // Read files
    'write',          // Write files
    'edit',           // Edit files
    'terminal',       // Run commands
    'search',         // Search codebase
    'glob',           // Find files
    'grep',           // Search content
    'memory_query',   // Query past experiences
  ];

  // Quality Criteria
  qualityCriteria: {
    mustPassBuild: true;
    mustPassLint: true;
    mustPassTests: true;
    mustFollowPatterns: true;
    mustHaveTypeAnnotations: true;
  };

  // Escalation Rules
  escalation: {
    maxIterations: 50;
    escalateOnConsecutiveFailures: 5;
    escalateOnTimeout: 600000;      // 10 minutes
    escalateOnPatternMismatch: true;
  };
}

/**
 * Coder Agent System Prompt Outline
 */
const CODER_SYSTEM_PROMPT = `
You are the Coder Agent for Nexus, responsible for implementing code changes.

## Your Role
- Implement the specified task
- Write clean, maintainable code
- Follow existing project patterns
- Ensure code passes build, lint, and tests
- Fix any issues that arise during QA loop

## Core Rules
1. ALWAYS follow existing code patterns in the project
2. Write TypeScript with strict type annotations
3. Create tests if specified (TDD mode)
4. Keep functions small and focused
5. Add comments for complex logic only
6. Handle errors appropriately

## Execution Flow
1. Analyze the task specification
2. Review relevant existing code
3. Implement the required changes
4. Run build to verify compilation
5. Run lint to verify style
6. Run tests to verify functionality
7. Fix any failures and repeat

## File Operations
- Use 'write' for new files
- Use 'edit' for modifications
- Minimize file changes
- Preserve existing formatting

## Error Handling
When encountering errors:
1. Analyze the error message carefully
2. Check the specific file and line
3. Review surrounding context
4. Make targeted fix
5. Verify fix resolves issue
`;

/**
 * Coder Input Format
 */
interface CoderInput {
  task: NexusTask;
  context: AgentContext;
  previousAttempts?: TaskResult[];
  errorToFix?: ErrorRecord;
}

/**
 * Coder Output Format
 */
interface CoderOutput {
  filesChanged: FileChange[];
  buildResult: BuildResult;
  lintResult: LintResult;
  testResult?: TestResult;
  commitReady: boolean;
  notes: string[];
}
```

**Handoff Protocol:**

```
Orchestrator → Coder:
  1. Orchestrator assigns task to available Coder
  2. Coder receives: task spec, file context, worktree path
  3. Coder acknowledges and begins execution

Coder → Reviewer (after QA loop passes):
  1. Coder commits changes to worktree branch
  2. Coder requests review with diff summary
  3. Reviewer receives: changes, task context
```

---

#### Reviewer Agent

**Role:** Code review, quality assessment, security checks

```typescript
/**
 * ReviewerAgent Configuration
 */
interface ReviewerAgentConfig {
  id: 'agent-reviewer-001';
  type: AgentType.REVIEWER;
  name: 'Reviewer';

  // Model Configuration (Uses Gemini for diverse perspective)
  model: {
    provider: 'google';
    model: 'gemini-2.5-pro';
    maxTokens: 8192;
    temperature: 0.4;              // Slightly higher for nuanced review
  };

  // Fallback Model (if Gemini unavailable)
  fallbackModel: {
    provider: 'anthropic';
    model: 'claude-sonnet-4-5';
    maxTokens: 8192;
    temperature: 0.4;
  };

  // Context Requirements
  contextRequirements: {
    diffContent: boolean;           // The changes to review
    taskSpecification: boolean;     // What was supposed to be done
    originalFiles: boolean;         // Files before changes
    testResults: boolean;           // Test execution results
    projectPatterns: boolean;       // Coding standards
    securityGuidelines: boolean;    // Security checklist
  };

  // Tools Available
  tools: [
    'read',           // Read files
    'search',         // Search codebase
    'glob',           // Find files
    'grep',           // Search content
  ];

  // Review Criteria
  reviewCriteria: {
    codeQuality: true;
    security: true;
    performance: true;
    maintainability: true;
    testCoverage: true;
    documentation: true;
  };

  // Approval Authority
  authority: {
    canApprove: true;
    canRequestChanges: true;
    canReject: true;                // Only for severe issues
    canEscalateToHuman: true;
  };
}

/**
 * Reviewer Agent System Prompt Outline
 */
const REVIEWER_SYSTEM_PROMPT = `
You are the Reviewer Agent for Nexus, responsible for code review and quality assessment.

## Your Role
- Review code changes for quality and correctness
- Check security best practices
- Verify adherence to project patterns
- Ensure test coverage is adequate
- Provide constructive feedback

## Review Checklist
1. **Correctness**: Does the code do what the task specifies?
2. **Security**: Are there any security vulnerabilities?
3. **Performance**: Any obvious performance issues?
4. **Maintainability**: Is the code clear and maintainable?
5. **Testing**: Are tests adequate and meaningful?
6. **Patterns**: Does it follow project conventions?

## Security Focus Areas
- Input validation
- SQL injection prevention
- XSS prevention
- Authentication/authorization
- Sensitive data handling
- Error message exposure

## Response Format
Provide a structured review with:
- VERDICT: APPROVE | REQUEST_CHANGES | REJECT
- Issues: List of specific issues (if any)
- Suggestions: Improvement recommendations
- Security Notes: Any security concerns

## Severity Levels
- CRITICAL: Must fix before merge (security, data loss)
- MAJOR: Should fix before merge (bugs, patterns)
- MINOR: Can be addressed later (style, optimization)
- SUGGESTION: Nice to have (not required)
`;

/**
 * Reviewer Input Format
 */
interface ReviewerInput {
  diff: string;                     // Git diff content
  task: NexusTask;
  filesModified: string[];
  testResults: TestResult;
  buildResult: BuildResult;
  existingPatterns: CodePattern[];
}

/**
 * Reviewer Output Format
 */
interface ReviewerOutput {
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  issues: ReviewIssue[];
  suggestions: string[];
  securityNotes: SecurityNote[];
  confidence: number;               // 0-1 confidence in review
  needsHumanReview: boolean;
}

interface ReviewIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'SUGGESTION';
  file: string;
  line?: number;
  description: string;
  suggestedFix?: string;
}

interface SecurityNote {
  category: 'input_validation' | 'injection' | 'xss' | 'auth' | 'data' | 'other';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}
```

**Handoff Protocol:**

```
Coder → Reviewer:
  1. Coder submits review request with diff
  2. Reviewer analyzes changes
  3. Reviewer returns verdict

Reviewer → Coder (if REQUEST_CHANGES):
  1. Reviewer provides specific issues
  2. Coder receives feedback
  3. Coder fixes issues and resubmits

Reviewer → Merger (if APPROVE):
  1. Reviewer marks as approved
  2. Merger receives merge request
```

---

#### Tester Agent

**Role:** Test writing, test execution, coverage monitoring

```typescript
/**
 * TesterAgent Configuration
 */
interface TesterAgentConfig {
  id: string;                       // e.g., 'agent-tester-001'
  type: AgentType.TESTER;
  name: 'Tester';

  // Model Configuration
  model: {
    provider: 'anthropic';
    model: 'claude-sonnet-4-5';
    maxTokens: 8192;
    temperature: 0.2;              // Low for consistent tests
  };

  // Context Requirements
  contextRequirements: {
    codeToTest: boolean;            // The code being tested
    existingTests: boolean;         // Existing test patterns
    taskSpecification: boolean;     // What should be tested
    testFramework: boolean;         // vitest/jest/etc. config
    coverageReport: boolean;        // Current coverage
  };

  // Tools Available
  tools: [
    'read',           // Read files
    'write',          // Write test files
    'edit',           // Edit test files
    'terminal',       // Run tests
    'search',         // Search codebase
    'glob',           // Find files
    'grep',           // Search content
  ];

  // Coverage Requirements
  coverageRequirements: {
    target: 80;                     // 80% coverage target
    minimumForPass: 70;             // Minimum acceptable
    excludePatterns: ['*.d.ts', 'types/*'];
  };
}

/**
 * Tester Agent System Prompt Outline
 */
const TESTER_SYSTEM_PROMPT = `
You are the Tester Agent for Nexus, responsible for writing and executing tests.

## Your Role
- Write comprehensive unit tests
- Write integration tests where needed
- Achieve minimum 80% code coverage
- Ensure tests are meaningful (not just for coverage)
- Execute tests and report results

## Testing Principles
1. Test behavior, not implementation
2. One assertion per test when possible
3. Use descriptive test names
4. Test edge cases and error paths
5. Mock external dependencies appropriately

## Test Structure (Vitest)
\`\`\`typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => { });
    it('should handle edge case', () => { });
    it('should throw on invalid input', () => { });
  });
});
\`\`\`

## Coverage Focus
- All public functions
- All conditional branches
- Error handling paths
- Edge cases (empty, null, boundary values)

## Test File Naming
- Unit tests: \`*.test.ts\`
- Integration: \`*.integration.test.ts\`
- E2E: \`*.e2e.test.ts\`
`;

/**
 * Tester Input Format
 */
interface TesterInput {
  mode: 'write' | 'execute' | 'both';
  targetFiles: string[];
  existingTests: string[];
  coverageReport?: CoverageReport;
  task: NexusTask;
}

/**
 * Tester Output Format
 */
interface TesterOutput {
  testsWritten: string[];           // Test files created/modified
  testResults: TestResult;
  coverageReport: CoverageReport;
  coverageMet: boolean;
  failingTests: TestFailure[];
  notes: string[];
}

interface TestResult {
  passed: boolean;
  total: number;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  duration: number;                 // Milliseconds
  failures: TestFailure[];
}

interface TestFailure {
  testName: string;
  file: string;
  error: string;
  expected?: string;
  actual?: string;
}

interface CoverageReport {
  overall: number;                  // Percentage
  lines: number;
  branches: number;
  functions: number;
  statements: number;
  uncoveredLines: Record<string, number[]>;
}
```

**Handoff Protocol:**

```
TDD Mode (Test First):
  1. Tester receives task specification
  2. Tester writes failing tests first
  3. Tester hands off to Coder
  4. Coder implements to pass tests

Standard Mode:
  1. Coder implements feature
  2. Tester writes tests for implementation
  3. Tester runs tests
  4. If failures, Coder fixes
```

---

#### Merger Agent

**Role:** Git operations, conflict resolution, branch management

```typescript
/**
 * MergerAgent Configuration
 * Note: This agent fills GAP-SHR-001
 */
interface MergerAgentConfig {
  id: 'agent-merger-001';
  type: AgentType.MERGER;
  name: 'Merger';

  // Model Configuration
  model: {
    provider: 'anthropic';
    model: 'claude-sonnet-4-5';
    maxTokens: 8192;
    temperature: 0.1;              // Very low for precise git operations
  };

  // Context Requirements
  contextRequirements: {
    branchToMerge: boolean;         // Source branch
    targetBranch: boolean;          // Destination (usually main)
    conflictInfo: boolean;          // Any conflicts detected
    relatedTasks: boolean;          // What tasks produced changes
    testResults: boolean;           // All tests passed?
    reviewStatus: boolean;          // Review approved?
  };

  // Tools Available
  tools: [
    'read',           // Read files
    'write',          // Write merged files
    'edit',           // Edit for conflict resolution
    'terminal',       // Run git commands
    'git',            // Git-specific operations
  ];

  // Merge Authority
  authority: {
    canMergeApproved: true;
    canResolveSimpleConflicts: true;
    canResolveComplexConflicts: false;  // Escalate to human
    canForcePush: false;                // Never
    canDeleteBranches: true;            // Cleanup after merge
  };

  // Conflict Resolution Strategy
  conflictStrategy: {
    simpleThreshold: 5;             // Lines of conflict
    autoResolvePatterns: [
      'import_order',
      'whitespace',
      'trailing_comma',
    ];
    alwaysEscalate: [
      'logic_conflict',
      'type_conflict',
      'security_related',
    ];
  };
}

/**
 * Merger Agent System Prompt Outline
 */
const MERGER_SYSTEM_PROMPT = `
You are the Merger Agent for Nexus, responsible for git operations and conflict resolution.

## Your Role
- Merge approved changes to main branch
- Resolve simple merge conflicts
- Escalate complex conflicts to humans
- Clean up worktree branches after merge
- Maintain clean git history

## Merge Process
1. Verify review is approved
2. Verify all tests pass
3. Attempt merge
4. If conflicts, analyze and resolve or escalate
5. Run tests on merged code
6. Complete merge if tests pass
7. Clean up worktree

## Conflict Resolution
For SIMPLE conflicts (auto-resolve):
- Import statement ordering
- Whitespace differences
- Trailing commas
- Comment differences

For COMPLEX conflicts (escalate):
- Logic changes in same function
- Type definition conflicts
- Security-related code
- Multiple overlapping changes

## Git Commands
- git checkout main
- git merge --no-ff branch-name
- git commit -m "message"
- git branch -d branch-name (cleanup)

## NEVER Do
- Force push (--force)
- Rebase shared branches
- Delete unmerged work
- Merge without passing tests
`;

/**
 * Merger Input Format
 */
interface MergerInput {
  worktreePath: string;
  sourceBranch: string;
  targetBranch: string;
  taskIds: string[];
  reviewApproved: boolean;
  testsPassed: boolean;
}

/**
 * Merger Output Format
 */
interface MergerOutput {
  success: boolean;
  commitHash?: string;
  conflictsResolved: ConflictResolution[];
  conflictsEscalated: ConflictInfo[];
  branchCleanedUp: boolean;
  notes: string[];
}

interface ConflictInfo {
  file: string;
  conflictType: 'simple' | 'complex';
  ourChanges: string;
  theirChanges: string;
  lineNumbers: { start: number; end: number };
}

interface ConflictResolution {
  file: string;
  strategy: 'ours' | 'theirs' | 'manual' | 'combined';
  resolution: string;
  confidence: number;
}
```

**Handoff Protocol:**

```
Reviewer → Merger:
  1. Reviewer approves changes
  2. Merger receives merge request
  3. Merger executes merge workflow

Merger → Orchestrator:
  1. Merger completes merge
  2. Merger reports success with commit hash
  3. Orchestrator marks task complete
  4. Orchestrator triggers next task

Merger → Human (on complex conflict):
  1. Merger detects complex conflict
  2. Merger creates checkpoint
  3. Merger notifies human for intervention
  4. Human resolves and signals continue
```

---

### Part B: Agent Communication Protocol

#### Message Format

```typescript
/**
 * AgentMessage is the standard message format for inter-agent communication
 */
interface AgentMessage {
  // Identity
  id: string;                       // Unique message ID
  correlationId?: string;           // Links related messages

  // Routing
  from: AgentIdentifier;
  to: AgentIdentifier;

  // Content
  type: MessageType;
  payload: MessagePayload;

  // Metadata
  timestamp: Date;
  priority: MessagePriority;
  expiresAt?: Date;

  // Tracking
  acknowledged: boolean;
  acknowledgedAt?: Date;
  retryCount: number;
}

interface AgentIdentifier {
  id: string;
  type: AgentType;
}

/**
 * MessageType enumeration
 */
enum MessageType {
  // Task Messages
  TASK_ASSIGN = 'task.assign',
  TASK_ACCEPT = 'task.accept',
  TASK_REJECT = 'task.reject',
  TASK_PROGRESS = 'task.progress',
  TASK_COMPLETE = 'task.complete',
  TASK_FAILED = 'task.failed',

  // Review Messages
  REVIEW_REQUEST = 'review.request',
  REVIEW_RESPONSE = 'review.response',

  // Merge Messages
  MERGE_REQUEST = 'merge.request',
  MERGE_RESPONSE = 'merge.response',

  // Control Messages
  PAUSE = 'control.pause',
  RESUME = 'control.resume',
  CANCEL = 'control.cancel',
  HEARTBEAT = 'control.heartbeat',

  // Error Messages
  ERROR = 'error',
  ESCALATION = 'escalation',
}

type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Payload types for different message types
 */
type MessagePayload =
  | TaskAssignPayload
  | TaskCompletePayload
  | ReviewRequestPayload
  | ReviewResponsePayload
  | MergeRequestPayload
  | ErrorPayload;

interface TaskAssignPayload {
  task: NexusTask;
  context: AgentContext;
  worktreePath: string;
  deadline?: Date;
}

interface TaskCompletePayload {
  taskId: string;
  result: TaskResult;
  filesChanged: FileChange[];
  metrics: TaskMetrics;
}

interface ReviewRequestPayload {
  taskId: string;
  diff: string;
  filesModified: string[];
  testResults: TestResult;
}

interface ReviewResponsePayload {
  taskId: string;
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  issues: ReviewIssue[];
  feedback: string;
}

interface MergeRequestPayload {
  taskIds: string[];
  worktreePath: string;
  sourceBranch: string;
  reviewApproved: boolean;
}

interface ErrorPayload {
  errorType: string;
  message: string;
  taskId?: string;
  recoverable: boolean;
  context: Record<string, unknown>;
}
```

#### Communication Patterns

```typescript
/**
 * Communication patterns used in the agent system
 */

// Pattern 1: Request-Response (Synchronous)
// Used for: Task assignment, review requests
interface RequestResponsePattern {
  pattern: 'request-response';
  timeout: number;                  // Max wait time for response
  retries: number;                  // Retry count on timeout
  fallback?: () => void;            // Action if all retries fail
}

// Example usage:
const taskAssignment: RequestResponsePattern = {
  pattern: 'request-response',
  timeout: 30000,                   // 30 seconds to accept
  retries: 3,
  fallback: () => reassignToAnotherAgent(),
};

// Pattern 2: Fire-and-Forget (Asynchronous)
// Used for: Progress updates, heartbeats
interface FireAndForgetPattern {
  pattern: 'fire-and-forget';
  acknowledgement: boolean;         // Whether to require ACK
  queueIfOffline: boolean;          // Queue if recipient unavailable
}

// Example usage:
const progressUpdate: FireAndForgetPattern = {
  pattern: 'fire-and-forget',
  acknowledgement: false,
  queueIfOffline: true,
};

// Pattern 3: Publish-Subscribe (Broadcast)
// Used for: State updates, events
interface PubSubPattern {
  pattern: 'pub-sub';
  topic: string;
  subscribers: AgentType[];
  persistent: boolean;              // Persist for late subscribers
}

// Example usage:
const stateUpdate: PubSubPattern = {
  pattern: 'pub-sub',
  topic: 'task.status',
  subscribers: [AgentType.PLANNER, AgentType.CODER],
  persistent: true,
};

// Pattern 4: Pipeline (Sequential)
// Used for: QA loop, review chain
interface PipelinePattern {
  pattern: 'pipeline';
  stages: AgentType[];
  continueOnError: boolean;
  compensate?: () => void;
}

// Example usage:
const qaLoop: PipelinePattern = {
  pattern: 'pipeline',
  stages: [AgentType.CODER, AgentType.TESTER, AgentType.REVIEWER, AgentType.MERGER],
  continueOnError: false,
  compensate: () => rollbackChanges(),
};
```

#### Communication Channels

```typescript
/**
 * CommunicationChannel defines how messages flow
 */
interface CommunicationChannel {
  name: string;
  type: 'queue' | 'topic' | 'direct';
  producers: AgentType[];
  consumers: AgentType[];
  persistence: 'memory' | 'disk';
  ordering: 'fifo' | 'priority';
}

/**
 * Channel Definitions
 */
const CHANNELS: CommunicationChannel[] = [
  // Task Queue - Orchestrator to Agents
  {
    name: 'task-queue',
    type: 'queue',
    producers: [AgentType.PLANNER],
    consumers: [AgentType.CODER, AgentType.TESTER],
    persistence: 'disk',
    ordering: 'priority',
  },

  // Status Updates - Agents to Orchestrator
  {
    name: 'status-updates',
    type: 'topic',
    producers: [AgentType.CODER, AgentType.TESTER, AgentType.REVIEWER, AgentType.MERGER],
    consumers: [], // Orchestrator listens to all
    persistence: 'memory',
    ordering: 'fifo',
  },

  // Review Channel - Coder to Reviewer
  {
    name: 'review-requests',
    type: 'queue',
    producers: [AgentType.CODER],
    consumers: [AgentType.REVIEWER],
    persistence: 'disk',
    ordering: 'fifo',
  },

  // Merge Channel - Reviewer to Merger
  {
    name: 'merge-requests',
    type: 'queue',
    producers: [AgentType.REVIEWER],
    consumers: [AgentType.MERGER],
    persistence: 'disk',
    ordering: 'fifo',
  },

  // Error Channel - All to Orchestrator
  {
    name: 'errors',
    type: 'topic',
    producers: [], // All agents can emit
    consumers: [], // Orchestrator and UI listen
    persistence: 'disk',
    ordering: 'fifo',
  },
];

/**
 * Message Router handles message delivery
 */
interface MessageRouter {
  // Send a message
  send(message: AgentMessage): Promise<void>;

  // Send and wait for response
  sendAndWait(message: AgentMessage, timeout: number): Promise<AgentMessage>;

  // Subscribe to a channel
  subscribe(channel: string, handler: MessageHandler): Unsubscribe;

  // Broadcast to all agents
  broadcast(message: AgentMessage): Promise<void>;
}

type MessageHandler = (message: AgentMessage) => Promise<void>;
type Unsubscribe = () => void;
```

---

### Part C: Agent Coordination

#### Task Assignment Algorithm

```typescript
/**
 * TaskAssigner manages task assignment to agents
 */
interface TaskAssigner {
  // Assign a task to the best available agent
  assignTask(task: NexusTask): Promise<AgentHandle | null>;

  // Get assignment recommendation
  recommendAssignment(task: NexusTask): AgentRecommendation;

  // Check if agent can accept task
  canAcceptTask(agent: Agent, task: NexusTask): boolean;
}

/**
 * Task Assignment Algorithm
 */
function assignTask(task: NexusTask, agents: Agent[]): Agent | null {
  // Step 1: Filter by agent type
  const eligibleByType = agents.filter(a => {
    switch (task.type) {
      case TaskType.TDD:
        return a.type === AgentType.TESTER || a.type === AgentType.CODER;
      case TaskType.CHECKPOINT:
        return a.type === AgentType.PLANNER; // Needs human + planner
      default:
        return a.type === AgentType.CODER;
    }
  });

  // Step 2: Filter by availability
  const available = eligibleByType.filter(a =>
    a.status === AgentStatus.IDLE &&
    a.consecutiveErrors < 3
  );

  if (available.length === 0) {
    return null; // No available agents
  }

  // Step 3: Score and rank
  const scored = available.map(agent => ({
    agent,
    score: calculateAssignmentScore(agent, task),
  }));

  // Step 4: Select highest score
  scored.sort((a, b) => b.score - a.score);
  return scored[0].agent;
}

/**
 * Assignment scoring function
 */
function calculateAssignmentScore(agent: Agent, task: NexusTask): number {
  let score = 0;

  // Success rate (0-40 points)
  score += agent.successRate * 40;

  // Experience with similar tasks (0-30 points)
  const taskTags = task.tags;
  const agentExperience = getAgentExperience(agent.id, taskTags);
  score += Math.min(agentExperience * 5, 30);

  // Current load (0-20 points)
  // Idle agents get full points
  if (agent.status === AgentStatus.IDLE) {
    score += 20;
  }

  // Recent performance (0-10 points)
  // Lower iterations on recent tasks = higher score
  const recentAvgIterations = agent.averageIterations;
  score += Math.max(10 - recentAvgIterations, 0);

  return score;
}

/**
 * Load Balancing Strategy
 */
interface LoadBalancer {
  strategy: 'round-robin' | 'least-loaded' | 'scored';
  maxPerAgent: number;
  cooldownMs: number;               // Time between task assignments
}

const DEFAULT_LOAD_BALANCER: LoadBalancer = {
  strategy: 'scored',
  maxPerAgent: 1,                   // One task at a time
  cooldownMs: 1000,                 // 1 second between assignments
};
```

#### Parallel Execution

```typescript
/**
 * ParallelExecutionManager handles concurrent agent execution
 */
interface ParallelExecutionManager {
  // Configuration
  maxConcurrentAgents: number;
  maxWorkTreesPerProject: number;

  // Execution
  executeWave(wave: TaskWave): Promise<WaveResult>;
  getActiveExecutions(): AgentExecution[];

  // Resource management
  allocateWorktree(taskId: string): Promise<string>;
  releaseWorktree(worktreePath: string): Promise<void>;
}

/**
 * Parallel execution configuration
 */
const PARALLEL_CONFIG = {
  maxConcurrentCoders: 3,
  maxConcurrentTesters: 2,
  maxConcurrentReviewers: 1,
  maxConcurrentMergers: 1,
  maxWorktrees: 5,
};

/**
 * TaskWave represents tasks that can run in parallel
 */
interface TaskWave {
  waveNumber: number;
  tasks: NexusTask[];
  estimatedDuration: number;
  requiresSync: boolean;            // Must sync before next wave
}

/**
 * Worktree allocation
 */
interface WorktreeAllocation {
  worktreePath: string;
  branchName: string;
  taskId: string;
  agentId: string;
  allocatedAt: Date;
  status: 'active' | 'pending-merge' | 'cleanup';
}

/**
 * Parallel wave execution
 */
async function executeWave(wave: TaskWave): Promise<WaveResult> {
  const results: TaskResult[] = [];
  const executions: Promise<TaskResult>[] = [];

  // Allocate worktrees for all tasks in wave
  for (const task of wave.tasks) {
    const worktree = await allocateWorktree(task.id);
    const agent = await assignTask(task);

    if (agent && worktree) {
      const execution = executeTaskInWorktree(task, agent, worktree);
      executions.push(execution);
    }
  }

  // Wait for all to complete
  const settled = await Promise.allSettled(executions);

  // Collect results
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // Handle failure
      results.push({
        taskId: 'unknown',
        status: 'failed',
        error: result.reason,
      } as TaskResult);
    }
  }

  return {
    waveNumber: wave.waveNumber,
    results,
    allPassed: results.every(r => r.status === 'success'),
    duration: calculateWaveDuration(results),
  };
}

/**
 * Synchronization points between waves
 */
interface SyncPoint {
  afterWave: number;
  actions: SyncAction[];
}

type SyncAction =
  | 'merge-all'                     // Merge all completed work
  | 'run-integration-tests'         // Run integration tests
  | 'update-state'                  // Persist state
  | 'checkpoint'                    // Create recovery checkpoint
  | 'human-review';                 // Request human review
```

#### Handoff Protocol

```typescript
/**
 * AgentHandoff defines the handoff between agents
 */
interface AgentHandoff {
  from: AgentType;
  to: AgentType;
  trigger: string;
  data: HandoffData;
  validation: HandoffValidation;
}

interface HandoffData {
  taskId: string;
  context: AgentContext;
  results: TaskResult;
  additionalData: Record<string, unknown>;
}

interface HandoffValidation {
  required: string[];               // Required fields
  conditions: HandoffCondition[];   // Conditions that must be true
}

interface HandoffCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | 'exists';
  value: unknown;
}

/**
 * Standard Handoff Protocols
 */
const HANDOFF_PROTOCOLS: Record<string, AgentHandoff> = {
  // Planner → Coder
  'planning-to-coding': {
    from: AgentType.PLANNER,
    to: AgentType.CODER,
    trigger: 'plan.ready',
    data: {
      taskId: '',
      context: {} as AgentContext,
      results: {} as TaskResult,
      additionalData: {
        plan: {} as NexusPlan,
      },
    },
    validation: {
      required: ['taskId', 'plan'],
      conditions: [
        { field: 'plan.tasks.length', operator: '>', value: 0 },
        { field: 'plan.validated', operator: '==', value: true },
      ],
    },
  },

  // Coder → Reviewer
  'coding-to-review': {
    from: AgentType.CODER,
    to: AgentType.REVIEWER,
    trigger: 'code.ready',
    data: {
      taskId: '',
      context: {} as AgentContext,
      results: {} as TaskResult,
      additionalData: {
        diff: '',
        filesModified: [],
        testResults: {} as TestResult,
      },
    },
    validation: {
      required: ['taskId', 'diff', 'testResults'],
      conditions: [
        { field: 'testResults.passed', operator: '==', value: true },
        { field: 'results.buildPassed', operator: '==', value: true },
      ],
    },
  },

  // Reviewer → Coder (request changes)
  'review-to-fix': {
    from: AgentType.REVIEWER,
    to: AgentType.CODER,
    trigger: 'review.changes_requested',
    data: {
      taskId: '',
      context: {} as AgentContext,
      results: {} as TaskResult,
      additionalData: {
        issues: [] as ReviewIssue[],
        feedback: '',
      },
    },
    validation: {
      required: ['taskId', 'issues'],
      conditions: [
        { field: 'issues.length', operator: '>', value: 0 },
      ],
    },
  },

  // Reviewer → Merger
  'review-to-merge': {
    from: AgentType.REVIEWER,
    to: AgentType.MERGER,
    trigger: 'review.approved',
    data: {
      taskId: '',
      context: {} as AgentContext,
      results: {} as TaskResult,
      additionalData: {
        worktreePath: '',
        sourceBranch: '',
        targetBranch: 'main',
      },
    },
    validation: {
      required: ['taskId', 'worktreePath', 'sourceBranch'],
      conditions: [
        { field: 'results.reviewApproved', operator: '==', value: true },
      ],
    },
  },

  // Merger → Orchestrator
  'merge-complete': {
    from: AgentType.MERGER,
    to: AgentType.PLANNER, // Back to orchestrator
    trigger: 'merge.complete',
    data: {
      taskId: '',
      context: {} as AgentContext,
      results: {} as TaskResult,
      additionalData: {
        commitHash: '',
        branchDeleted: false,
      },
    },
    validation: {
      required: ['taskId', 'commitHash'],
      conditions: [
        { field: 'results.success', operator: '==', value: true },
      ],
    },
  },
};

/**
 * Execute handoff between agents
 */
async function executeHandoff(
  handoff: AgentHandoff,
  data: HandoffData
): Promise<boolean> {
  // Validate handoff data
  const validation = validateHandoff(handoff.validation, data);
  if (!validation.valid) {
    throw new HandoffError(
      `Handoff validation failed: ${validation.errors.join(', ')}`
    );
  }

  // Get target agent
  const targetAgent = await getAvailableAgent(handoff.to);
  if (!targetAgent) {
    // Queue for later if no agent available
    await queueHandoff(handoff, data);
    return false;
  }

  // Create and send message
  const message: AgentMessage = {
    id: generateId(),
    from: { id: data.context.agentId, type: handoff.from },
    to: { id: targetAgent.id, type: handoff.to },
    type: handoff.trigger as MessageType,
    payload: data.additionalData,
    timestamp: new Date(),
    priority: 'normal',
    acknowledged: false,
    retryCount: 0,
  };

  await sendMessage(message);
  return true;
}
```

#### QA Loop Coordination

```typescript
/**
 * QALoopCoordinator manages the build-test-review cycle
 */
interface QALoopCoordinator {
  // Configuration
  maxIterations: number;
  humanEscalationThreshold: number;
  timeoutMs: number;

  // Execution
  runLoop(task: NexusTask, coder: Agent): Promise<QAResult>;
  getLoopStatus(taskId: string): QALoopStatus;

  // Control
  pauseLoop(taskId: string): Promise<void>;
  resumeLoop(taskId: string): Promise<void>;
  escalateLoop(taskId: string, reason: string): Promise<void>;
}

/**
 * QA Loop Configuration
 */
const QA_LOOP_CONFIG = {
  maxIterations: 50,
  humanEscalationThreshold: 50,
  consecutiveFailureEscalation: 5,
  timeoutMs: 600000,                // 10 minutes per task
  checkpointInterval: 10,           // Checkpoint every 10 iterations
};

/**
 * QA Loop Status
 */
interface QALoopStatus {
  taskId: string;
  iteration: number;
  phase: 'code' | 'build' | 'lint' | 'test' | 'review' | 'merge';
  lastResult: 'pending' | 'pass' | 'fail';
  consecutiveFailures: number;
  startTime: Date;
  lastUpdateTime: Date;
}

/**
 * QA Loop execution
 */
async function runQALoop(task: NexusTask, coder: Agent): Promise<QAResult> {
  let iteration = 0;
  let consecutiveFailures = 0;
  const context = await buildAgentContext(task, coder);

  while (iteration < QA_LOOP_CONFIG.maxIterations) {
    iteration++;

    // Checkpoint if needed
    if (iteration % QA_LOOP_CONFIG.checkpointInterval === 0) {
      await createCheckpoint(task.id, iteration);
    }

    // Step 1: Generate/Fix Code
    const codeResult = await coder.execute(context);
    if (!codeResult.success) {
      consecutiveFailures++;
      if (consecutiveFailures >= QA_LOOP_CONFIG.consecutiveFailureEscalation) {
        return escalateToHuman(task, 'consecutive_failures');
      }
      continue;
    }

    // Step 2: Build
    const buildResult = await runBuild(task.worktreePath);
    if (!buildResult.passed) {
      context.errorToFix = buildResult.errors[0];
      consecutiveFailures++;
      continue;
    }

    // Step 3: Lint
    const lintResult = await runLint(task.worktreePath, { fix: true });
    if (!lintResult.passed && !lintResult.allFixed) {
      context.errorToFix = lintResult.errors[0];
      consecutiveFailures++;
      continue;
    }

    // Step 4: Test
    const testResult = await runTests(task.worktreePath);
    if (!testResult.passed) {
      context.errorToFix = testResult.failures[0];
      consecutiveFailures++;
      continue;
    }

    // All passed - proceed to review
    consecutiveFailures = 0;

    // Step 5: Review
    const reviewer = await getReviewer();
    const reviewResult = await reviewer.review(codeResult, task);

    if (reviewResult.verdict === 'APPROVE') {
      // Step 6: Merge
      const merger = await getMerger();
      const mergeResult = await merger.merge(task.worktreePath);

      if (mergeResult.success) {
        return {
          success: true,
          iterations: iteration,
          exitReason: 'passed',
          commitHash: mergeResult.commitHash,
          filesChanged: codeResult.filesChanged,
          totalDuration: Date.now() - context.startTime,
          tokensUsed: context.tokensUsed,
          cost: context.cost,
        };
      }
    }

    // Review requested changes
    if (reviewResult.verdict === 'REQUEST_CHANGES') {
      context.reviewFeedback = reviewResult.issues;
      // Continue loop to fix issues
    }

    // Review rejected
    if (reviewResult.verdict === 'REJECT') {
      return escalateToHuman(task, 'review_rejected');
    }
  }

  // Max iterations reached
  return escalateToHuman(task, 'max_iterations');
}

/**
 * Loop entry and exit conditions
 */
interface LoopConditions {
  entry: {
    taskAssigned: boolean;
    worktreeReady: boolean;
    contextLoaded: boolean;
    dependenciesMet: boolean;
  };
  exitSuccess: {
    buildPassed: boolean;
    lintPassed: boolean;
    testsPassed: boolean;
    reviewApproved: boolean;
    merged: boolean;
  };
  exitFailure: {
    maxIterations: boolean;
    consecutiveFailures: boolean;
    timeout: boolean;
    humanEscalation: boolean;
  };
}
```

---

### Part D: Agent Lifecycle

#### Agent Creation

```typescript
/**
 * AgentFactory creates and configures agents
 */
interface AgentFactory {
  // Create a new agent of specified type
  createAgent(type: AgentType, config?: Partial<AgentConfig>): Promise<Agent>;

  // Create agent pool
  createPool(types: AgentType[], counts: number[]): Promise<AgentPool>;

  // Warm up agent (pre-load context)
  warmupAgent(agent: Agent): Promise<void>;
}

/**
 * Agent creation process
 */
async function createAgent(
  type: AgentType,
  config?: Partial<AgentConfig>
): Promise<Agent> {
  // Step 1: Generate unique ID
  const id = `agent-${type}-${generateShortId()}`;

  // Step 2: Load base configuration
  const baseConfig = getAgentConfig(type);
  const finalConfig = { ...baseConfig, ...config };

  // Step 3: Initialize model client
  const modelClient = await initializeModelClient(
    finalConfig.model.provider,
    finalConfig.model.model
  );

  // Step 4: Load system prompt
  const systemPrompt = await loadSystemPrompt(type);

  // Step 5: Initialize tools
  const tools = await initializeTools(finalConfig.tools);

  // Step 6: Create agent instance
  const agent: Agent = {
    id,
    type,
    name: finalConfig.name,
    model: finalConfig.model,
    systemPrompt,
    tools: finalConfig.tools,
    status: AgentStatus.INITIALIZING,
    tasksCompleted: 0,
    tasksAttempted: 0,
    successRate: 0,
    averageIterations: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    totalActiveTime: 0,
    errorCount: 0,
    consecutiveErrors: 0,
  };

  // Step 7: Validate agent is operational
  await validateAgent(agent, modelClient);

  // Step 8: Mark as idle and ready
  agent.status = AgentStatus.IDLE;

  // Step 9: Register with AgentPool
  await registerAgent(agent);

  return agent;
}

/**
 * Initialization requirements per agent type
 */
const INITIALIZATION_REQUIREMENTS: Record<AgentType, InitRequirements> = {
  [AgentType.PLANNER]: {
    contextSize: 'large',           // Needs project overview
    warmupData: ['requirements', 'project_structure', 'patterns'],
    timeout: 30000,
  },
  [AgentType.CODER]: {
    contextSize: 'large',
    warmupData: ['file_context', 'dependencies', 'test_examples'],
    timeout: 20000,
  },
  [AgentType.REVIEWER]: {
    contextSize: 'medium',
    warmupData: ['patterns', 'security_guidelines'],
    timeout: 15000,
  },
  [AgentType.TESTER]: {
    contextSize: 'medium',
    warmupData: ['test_framework', 'existing_tests'],
    timeout: 15000,
  },
  [AgentType.MERGER]: {
    contextSize: 'small',
    warmupData: ['git_config', 'branch_strategy'],
    timeout: 10000,
  },
};

interface InitRequirements {
  contextSize: 'small' | 'medium' | 'large';
  warmupData: string[];
  timeout: number;
}
```

#### Agent State Machine

```typescript
/**
 * Agent State Machine
 */
const AGENT_STATE_MACHINE = {
  [AgentStatus.INITIALIZING]: {
    allowedTransitions: [AgentStatus.IDLE, AgentStatus.ERROR],
    onEnter: 'loadConfiguration',
    onExit: 'validateReady',
  },

  [AgentStatus.IDLE]: {
    allowedTransitions: [
      AgentStatus.WORKING,
      AgentStatus.TERMINATED,
      AgentStatus.ERROR,
    ],
    onEnter: 'markAvailable',
    onExit: 'clearIdleTimer',
  },

  [AgentStatus.WORKING]: {
    allowedTransitions: [
      AgentStatus.REVIEWING,
      AgentStatus.IDLE,
      AgentStatus.BLOCKED,
      AgentStatus.ERROR,
    ],
    onEnter: 'startTask',
    onExit: 'saveProgress',
  },

  [AgentStatus.REVIEWING]: {
    allowedTransitions: [
      AgentStatus.WORKING,
      AgentStatus.IDLE,
      AgentStatus.ERROR,
    ],
    onEnter: 'requestReview',
    onExit: 'processReviewResult',
  },

  [AgentStatus.BLOCKED]: {
    allowedTransitions: [
      AgentStatus.WORKING,
      AgentStatus.IDLE,
      AgentStatus.ERROR,
    ],
    onEnter: 'recordBlockage',
    onExit: 'clearBlockage',
    timeout: 300000,                // 5 minute timeout
    timeoutTransition: AgentStatus.ERROR,
  },

  [AgentStatus.ERROR]: {
    allowedTransitions: [
      AgentStatus.IDLE,
      AgentStatus.TERMINATED,
    ],
    onEnter: 'logError',
    onExit: 'clearError',
    recoveryAttempts: 3,
  },

  [AgentStatus.TERMINATED]: {
    allowedTransitions: [],         // Terminal state
    onEnter: 'cleanup',
    onExit: null,
  },
};

/**
 * State transition function
 */
async function transitionAgent(
  agent: Agent,
  newStatus: AgentStatus,
  context?: TransitionContext
): Promise<boolean> {
  const currentState = AGENT_STATE_MACHINE[agent.status];

  // Validate transition is allowed
  if (!currentState.allowedTransitions.includes(newStatus)) {
    throw new InvalidTransitionError(
      `Cannot transition from ${agent.status} to ${newStatus}`
    );
  }

  // Execute onExit hook
  if (currentState.onExit) {
    await executeHook(currentState.onExit, agent, context);
  }

  // Update state
  const previousStatus = agent.status;
  agent.status = newStatus;
  agent.lastActiveAt = new Date();

  // Execute onEnter hook
  const newState = AGENT_STATE_MACHINE[newStatus];
  if (newState.onEnter) {
    await executeHook(newState.onEnter, agent, context);
  }

  // Emit state change event
  await emitEvent({
    type: 'agent.status_changed',
    agentId: agent.id,
    from: previousStatus,
    to: newStatus,
    timestamp: new Date(),
  });

  return true;
}

/**
 * State persistence
 */
interface AgentStatePersistence {
  // Save agent state
  saveState(agent: Agent): Promise<void>;

  // Load agent state
  loadState(agentId: string): Promise<AgentState | null>;

  // Clear agent state
  clearState(agentId: string): Promise<void>;
}

interface AgentState {
  agentId: string;
  status: AgentStatus;
  currentTask?: string;
  worktree?: string;
  iteration?: number;
  lastError?: AgentError;
  metrics: AgentMetrics;
  savedAt: Date;
}
```

#### Agent Termination

```typescript
/**
 * AgentTerminator handles graceful shutdown
 */
interface AgentTerminator {
  // Graceful shutdown
  terminateGracefully(agent: Agent, timeout: number): Promise<TerminationResult>;

  // Force termination
  terminateImmediately(agent: Agent): Promise<TerminationResult>;

  // Terminate all agents
  terminateAll(timeout: number): Promise<TerminationResult[]>;
}

/**
 * Graceful termination process
 */
async function terminateGracefully(
  agent: Agent,
  timeout: number = 30000
): Promise<TerminationResult> {
  const startTime = Date.now();

  // Step 1: Stop accepting new tasks
  agent.status = AgentStatus.BLOCKED;
  await emitEvent({ type: 'agent.stopping', agentId: agent.id });

  // Step 2: Wait for current task to complete (with timeout)
  if (agent.currentTask) {
    const taskCompleted = await waitForTaskCompletion(
      agent.currentTask,
      timeout
    );

    if (!taskCompleted) {
      // Save progress for recovery
      await saveTaskProgress(agent.currentTask, agent.id);
    }
  }

  // Step 3: Save agent state
  await saveAgentState(agent);

  // Step 4: Clean up resources
  if (agent.worktree) {
    await cleanupWorktree(agent.worktree);
  }

  // Step 5: Close model connection
  await closeModelConnection(agent.id);

  // Step 6: Deregister from pool
  await deregisterAgent(agent.id);

  // Step 7: Mark as terminated
  agent.status = AgentStatus.TERMINATED;
  await emitEvent({ type: 'agent.terminated', agentId: agent.id });

  return {
    agentId: agent.id,
    success: true,
    graceful: true,
    duration: Date.now() - startTime,
    stateSaved: true,
  };
}

/**
 * Termination result
 */
interface TerminationResult {
  agentId: string;
  success: boolean;
  graceful: boolean;
  duration: number;
  stateSaved: boolean;
  error?: string;
}

/**
 * Resource cleanup checklist
 */
interface ResourceCleanup {
  worktreeCleaned: boolean;
  modelDisconnected: boolean;
  statesSaved: boolean;
  logsArchived: boolean;
  metricsRecorded: boolean;
  poolUpdated: boolean;
}
```

---

### Part E: Agent Failure Handling

#### Failure Detection

```typescript
/**
 * FailureDetector monitors agent health
 */
interface FailureDetector {
  // Heartbeat monitoring
  checkHeartbeat(agent: Agent): Promise<HealthStatus>;

  // Error pattern detection
  detectErrorPattern(agent: Agent): ErrorPattern | null;

  // Resource monitoring
  checkResources(agent: Agent): ResourceStatus;
}

/**
 * Failure types and detection
 */
enum FailureType {
  API_ERROR = 'api_error',           // LLM API failure
  TOOL_ERROR = 'tool_error',         // Tool execution failed
  TIMEOUT = 'timeout',               // Operation timed out
  RATE_LIMIT = 'rate_limit',         // API rate limited
  CONTEXT_OVERFLOW = 'context_overflow',  // Context too large
  RESOURCE_EXHAUSTED = 'resource_exhausted',  // Memory/CPU
  NETWORK_ERROR = 'network_error',   // Network connectivity
  INVALID_OUTPUT = 'invalid_output', // LLM produced invalid output
  LOOP_DETECTED = 'loop_detected',   // Agent stuck in loop
}

/**
 * Failure detection rules
 */
const FAILURE_DETECTION_RULES: FailureRule[] = [
  {
    type: FailureType.API_ERROR,
    detect: (error) => error.message.includes('API') || error.status >= 500,
    severity: 'high',
    recoverable: true,
  },
  {
    type: FailureType.RATE_LIMIT,
    detect: (error) => error.status === 429,
    severity: 'medium',
    recoverable: true,
    waitTime: 60000,                 // Wait 1 minute
  },
  {
    type: FailureType.TIMEOUT,
    detect: (error) => error.message.includes('timeout'),
    severity: 'medium',
    recoverable: true,
  },
  {
    type: FailureType.CONTEXT_OVERFLOW,
    detect: (error) => error.message.includes('context') || error.message.includes('token'),
    severity: 'high',
    recoverable: true,
    action: 'reduce_context',
  },
  {
    type: FailureType.LOOP_DETECTED,
    detect: (agent) => agent.consecutiveErrors >= 5,
    severity: 'critical',
    recoverable: false,
    action: 'escalate',
  },
];

interface FailureRule {
  type: FailureType;
  detect: (error: AgentError | Agent) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  waitTime?: number;
  action?: string;
}
```

#### Coder Failure Recovery

```typescript
/**
 * CoderFailureHandler manages coder agent failures
 */
interface CoderFailureHandler {
  handle(agent: Agent, failure: AgentError): Promise<RecoveryResult>;
}

/**
 * Coder failure recovery strategies
 */
const CODER_RECOVERY_STRATEGIES: Record<FailureType, RecoveryStrategy> = {
  [FailureType.API_ERROR]: {
    action: 'retry',
    maxRetries: 3,
    backoffMs: [1000, 5000, 15000],  // Exponential backoff
    onMaxRetries: 'switch_model',
  },

  [FailureType.TIMEOUT]: {
    action: 'retry',
    maxRetries: 2,
    timeout: 120000,                  // Increase timeout
    onMaxRetries: 'split_task',       // Task might be too large
  },

  [FailureType.CONTEXT_OVERFLOW]: {
    action: 'reduce_context',
    strategies: [
      'remove_irrelevant_files',
      'summarize_large_files',
      'focus_on_task_files',
    ],
    onFailure: 'escalate',
  },

  [FailureType.TOOL_ERROR]: {
    action: 'retry_with_fix',
    analyze: true,                    // Analyze error before retry
    maxRetries: 3,
    onMaxRetries: 'escalate',
  },

  [FailureType.INVALID_OUTPUT]: {
    action: 'retry_with_clarification',
    clarificationPrompt: 'Previous output was invalid. Please ensure output follows the required format.',
    maxRetries: 2,
    onMaxRetries: 'escalate',
  },

  [FailureType.LOOP_DETECTED]: {
    action: 'escalate',
    immediate: true,
    checkpoint: true,
  },
};

/**
 * Recovery execution
 */
async function recoverCoder(
  agent: Agent,
  failure: AgentError
): Promise<RecoveryResult> {
  const strategy = CODER_RECOVERY_STRATEGIES[failure.type];

  switch (strategy.action) {
    case 'retry':
      return await retryWithBackoff(agent, strategy);

    case 'reduce_context':
      return await reduceContextAndRetry(agent, strategy);

    case 'retry_with_fix':
      const analysis = await analyzeError(failure);
      return await retryWithFix(agent, analysis);

    case 'retry_with_clarification':
      return await retryWithClarification(agent, strategy.clarificationPrompt);

    case 'escalate':
      return await escalateToHuman(agent, failure);

    default:
      return { success: false, action: 'unknown', error: failure };
  }
}

interface RecoveryResult {
  success: boolean;
  action: string;
  retries?: number;
  newAgent?: Agent;
  error?: AgentError;
}

interface RecoveryStrategy {
  action: string;
  maxRetries?: number;
  backoffMs?: number[];
  timeout?: number;
  strategies?: string[];
  clarificationPrompt?: string;
  immediate?: boolean;
  checkpoint?: boolean;
  onMaxRetries?: string;
  onFailure?: string;
  analyze?: boolean;
}
```

#### Reviewer Failure Recovery

```typescript
/**
 * ReviewerFailureHandler manages reviewer agent failures
 */
const REVIEWER_RECOVERY_STRATEGIES: Record<FailureType, RecoveryStrategy> = {
  [FailureType.API_ERROR]: {
    action: 'switch_to_fallback',
    fallbackModel: 'claude-sonnet-4-5',  // Switch from Gemini
    maxRetries: 2,
  },

  [FailureType.TIMEOUT]: {
    action: 'split_review',
    strategy: 'review_by_file',       // Review each file separately
    maxRetries: 3,
  },

  [FailureType.RATE_LIMIT]: {
    action: 'wait_and_retry',
    waitTimeMs: 60000,
    maxRetries: 5,
  },

  [FailureType.INVALID_OUTPUT]: {
    action: 'default_conservative',
    defaultVerdict: 'REQUEST_CHANGES',
    note: 'Review agent produced invalid output, requesting human review',
    escalate: true,
  },
};

/**
 * Fallback reviewer (when primary fails)
 */
async function createFallbackReviewer(): Promise<Agent> {
  return await createAgent(AgentType.REVIEWER, {
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      maxTokens: 8192,
      temperature: 0.4,
    },
    name: 'Fallback Reviewer',
  });
}
```

#### System-wide Failure Recovery

```typescript
/**
 * SystemRecovery handles catastrophic failures
 */
interface SystemRecovery {
  // Checkpoint-based recovery
  restoreFromCheckpoint(checkpointId: string): Promise<RecoveryResult>;

  // State reconstruction
  reconstructState(projectId: string): Promise<NexusState>;

  // Partial progress preservation
  preservePartialProgress(projectId: string): Promise<ProgressSnapshot>;
}

/**
 * System-wide recovery process
 */
async function systemRecovery(
  projectId: string,
  failureInfo: SystemFailure
): Promise<SystemRecoveryResult> {
  console.log(`System recovery initiated for project ${projectId}`);

  // Step 1: Stop all agents
  await terminateAllAgents();

  // Step 2: Find last good checkpoint
  const checkpoints = await listCheckpoints(projectId);
  const lastGood = checkpoints.find(cp => cp.verified);

  if (!lastGood) {
    // No verified checkpoint, reconstruct from git
    return await reconstructFromGit(projectId);
  }

  // Step 3: Restore checkpoint
  const restoredState = await restoreCheckpoint(lastGood.id);

  // Step 4: Identify lost work
  const lostWork = await identifyLostWork(restoredState, failureInfo);

  // Step 5: Re-queue lost tasks
  for (const task of lostWork.tasks) {
    task.status = TaskStatus.PENDING;
    await queueTask(task);
  }

  // Step 6: Restart agent pool
  await initializeAgentPool();

  // Step 7: Resume execution
  await resumeExecution(projectId);

  return {
    success: true,
    checkpointRestored: lastGood.id,
    tasksRequeued: lostWork.tasks.length,
    estimatedLostTime: lostWork.estimatedTime,
  };
}

/**
 * Git-based state reconstruction
 */
async function reconstructFromGit(projectId: string): Promise<NexusState> {
  // Read current git state
  const gitLog = await git.log({ maxCount: 100 });
  const branches = await git.branch();

  // Identify completed tasks from commit messages
  const completedTasks = gitLog
    .filter(commit => commit.message.includes('[NEXUS-TASK]'))
    .map(commit => extractTaskId(commit.message));

  // Reconstruct state from completed tasks
  const project = await loadProject(projectId);
  const state: NexusState = {
    currentPhase: 'reconstructed',
    currentFeature: 'unknown',
    currentTask: 'pending',
    progress: calculateProgress(completedTasks, project.totalTasks),
    activeTasks: [],
    activeAgents: [],
    tasksCompleted: completedTasks.length,
    totalTasks: project.totalTasks,
    timeElapsed: 0,
    estimatedRemaining: 0,
    recentDecisions: [],
    lastUpdated: new Date(),
    sessionStart: new Date(),
  };

  return state;
}

interface SystemFailure {
  type: 'crash' | 'corruption' | 'network' | 'resource';
  timestamp: Date;
  affectedAgents: string[];
  lastKnownState: NexusState;
}

interface SystemRecoveryResult {
  success: boolean;
  checkpointRestored?: string;
  tasksRequeued: number;
  estimatedLostTime: number;
  error?: string;
}
```

---

### Part F: Agent Metrics

#### Per-Agent Metrics

```typescript
/**
 * AgentMetrics tracks individual agent performance
 */
interface AgentMetrics {
  // Identity
  agentId: string;
  agentType: AgentType;

  // Task Metrics
  tasksCompleted: number;
  tasksAttempted: number;
  tasksFailed: number;
  successRate: number;              // tasksCompleted / tasksAttempted

  // Iteration Metrics
  totalIterations: number;
  averageIterations: number;
  maxIterations: number;
  iterationDistribution: Record<number, number>;  // iteration count -> occurrences

  // Time Metrics
  totalActiveTime: number;          // Milliseconds
  averageTaskTime: number;          // Milliseconds
  minTaskTime: number;
  maxTaskTime: number;

  // Quality Metrics
  firstAttemptSuccessRate: number;  // Passed on first iteration
  reviewPassRate: number;           // Passed review first time
  testPassRate: number;             // Tests passed first time

  // Cost Metrics
  totalTokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;                // USD
  costPerTask: number;              // Average

  // Error Metrics
  totalErrors: number;
  errorsByType: Record<FailureType, number>;
  recoveryRate: number;             // Successful recoveries / total errors

  // Timestamp
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Metrics collection
 */
class AgentMetricsCollector {
  private metrics: Map<string, AgentMetrics> = new Map();

  async recordTaskStart(agentId: string, taskId: string): Promise<void> {
    const metrics = this.getOrCreate(agentId);
    metrics.tasksAttempted++;
    await this.save(metrics);
  }

  async recordTaskComplete(
    agentId: string,
    taskId: string,
    result: TaskResult
  ): Promise<void> {
    const metrics = this.getOrCreate(agentId);

    if (result.status === 'success') {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    // Update iteration stats
    metrics.totalIterations += result.iterations;
    metrics.averageIterations = metrics.totalIterations / metrics.tasksAttempted;
    metrics.maxIterations = Math.max(metrics.maxIterations, result.iterations);

    // Update time stats
    metrics.totalActiveTime += result.duration;
    metrics.averageTaskTime = metrics.totalActiveTime / metrics.tasksAttempted;

    // Update success rate
    metrics.successRate = metrics.tasksCompleted / metrics.tasksAttempted;

    // First attempt success
    if (result.iterations === 1 && result.status === 'success') {
      // Track first-attempt successes
    }

    await this.save(metrics);
  }

  async recordTokenUsage(
    agentId: string,
    input: number,
    output: number,
    cost: number
  ): Promise<void> {
    const metrics = this.getOrCreate(agentId);
    metrics.inputTokens += input;
    metrics.outputTokens += output;
    metrics.totalTokensUsed += input + output;
    metrics.totalCost += cost;
    metrics.costPerTask = metrics.totalCost / Math.max(metrics.tasksAttempted, 1);
    await this.save(metrics);
  }

  async recordError(agentId: string, error: AgentError): Promise<void> {
    const metrics = this.getOrCreate(agentId);
    metrics.totalErrors++;
    metrics.errorsByType[error.type] = (metrics.errorsByType[error.type] || 0) + 1;
    await this.save(metrics);
  }

  private getOrCreate(agentId: string): AgentMetrics {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, this.createEmpty(agentId));
    }
    return this.metrics.get(agentId)!;
  }

  private createEmpty(agentId: string): AgentMetrics {
    return {
      agentId,
      agentType: AgentType.CODER,   // Will be updated
      tasksCompleted: 0,
      tasksAttempted: 0,
      tasksFailed: 0,
      successRate: 0,
      totalIterations: 0,
      averageIterations: 0,
      maxIterations: 0,
      iterationDistribution: {},
      totalActiveTime: 0,
      averageTaskTime: 0,
      minTaskTime: Infinity,
      maxTaskTime: 0,
      firstAttemptSuccessRate: 0,
      reviewPassRate: 0,
      testPassRate: 0,
      totalTokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      costPerTask: 0,
      totalErrors: 0,
      errorsByType: {},
      recoveryRate: 0,
      lastUpdated: new Date(),
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  private async save(metrics: AgentMetrics): Promise<void> {
    metrics.lastUpdated = new Date();
    // Persist to storage
    await persistMetrics(metrics);
  }
}
```

#### System Metrics

```typescript
/**
 * SystemMetrics tracks overall system performance
 */
interface SystemMetrics {
  // Throughput
  tasksPerHour: number;
  featuresPerDay: number;
  completionRate: number;           // Tasks completed / total

  // Parallelization
  averageActiveAgents: number;
  peakActiveAgents: number;
  worktreeUtilization: number;      // Active / max worktrees
  parallelizationEfficiency: number; // Actual parallel / theoretical max

  // Quality
  overallSuccessRate: number;
  averageIterations: number;
  firstPassRate: number;
  humanInterventionRate: number;

  // Cost
  totalCost: number;
  costPerFeature: number;
  costPerTask: number;
  tokenEfficiency: number;          // Tasks completed / tokens used

  // Time
  totalExecutionTime: number;
  averageFeatureTime: number;
  averageTaskTime: number;
  estimationAccuracy: number;       // Actual vs estimated

  // Errors
  errorRate: number;
  recoveryRate: number;
  escalationRate: number;

  // Agent Distribution
  metricsByAgentType: Record<AgentType, AgentTypeMetrics>;
}

interface AgentTypeMetrics {
  count: number;
  totalTasks: number;
  successRate: number;
  averageTime: number;
  totalCost: number;
}

/**
 * System metrics aggregation
 */
class SystemMetricsAggregator {
  async aggregate(
    agentMetrics: AgentMetrics[],
    period: { start: Date; end: Date }
  ): Promise<SystemMetrics> {
    const periodDuration = period.end.getTime() - period.start.getTime();
    const hours = periodDuration / (1000 * 60 * 60);

    // Aggregate from individual agents
    const totalTasks = agentMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
    const totalAttempted = agentMetrics.reduce((sum, m) => sum + m.tasksAttempted, 0);
    const totalCost = agentMetrics.reduce((sum, m) => sum + m.totalCost, 0);
    const totalTime = agentMetrics.reduce((sum, m) => sum + m.totalActiveTime, 0);
    const totalTokens = agentMetrics.reduce((sum, m) => sum + m.totalTokensUsed, 0);
    const totalErrors = agentMetrics.reduce((sum, m) => sum + m.totalErrors, 0);

    // Calculate derived metrics
    const tasksPerHour = totalTasks / hours;
    const overallSuccessRate = totalAttempted > 0
      ? totalTasks / totalAttempted
      : 0;
    const costPerTask = totalTasks > 0
      ? totalCost / totalTasks
      : 0;
    const tokenEfficiency = totalTokens > 0
      ? totalTasks / (totalTokens / 1000000)  // Tasks per million tokens
      : 0;

    // Group by agent type
    const metricsByAgentType = this.groupByAgentType(agentMetrics);

    return {
      tasksPerHour,
      featuresPerDay: 0,              // Needs feature tracking
      completionRate: overallSuccessRate,
      averageActiveAgents: agentMetrics.length,
      peakActiveAgents: agentMetrics.length,  // Needs tracking
      worktreeUtilization: 0,         // Needs tracking
      parallelizationEfficiency: 0,   // Needs calculation
      overallSuccessRate,
      averageIterations: this.weightedAverage(
        agentMetrics.map(m => m.averageIterations),
        agentMetrics.map(m => m.tasksAttempted)
      ),
      firstPassRate: this.weightedAverage(
        agentMetrics.map(m => m.firstAttemptSuccessRate),
        agentMetrics.map(m => m.tasksAttempted)
      ),
      humanInterventionRate: 0,       // Needs tracking
      totalCost,
      costPerFeature: 0,              // Needs feature tracking
      costPerTask,
      tokenEfficiency,
      totalExecutionTime: totalTime,
      averageFeatureTime: 0,          // Needs feature tracking
      averageTaskTime: totalAttempted > 0 ? totalTime / totalAttempted : 0,
      estimationAccuracy: 0,          // Needs estimation tracking
      errorRate: totalAttempted > 0 ? totalErrors / totalAttempted : 0,
      recoveryRate: this.weightedAverage(
        agentMetrics.map(m => m.recoveryRate),
        agentMetrics.map(m => m.totalErrors)
      ),
      escalationRate: 0,              // Needs tracking
      metricsByAgentType,
    };
  }

  private groupByAgentType(
    metrics: AgentMetrics[]
  ): Record<AgentType, AgentTypeMetrics> {
    const result: Partial<Record<AgentType, AgentTypeMetrics>> = {};

    for (const agentType of Object.values(AgentType)) {
      const typeMetrics = metrics.filter(m => m.agentType === agentType);

      if (typeMetrics.length > 0) {
        result[agentType] = {
          count: typeMetrics.length,
          totalTasks: typeMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0),
          successRate: this.weightedAverage(
            typeMetrics.map(m => m.successRate),
            typeMetrics.map(m => m.tasksAttempted)
          ),
          averageTime: this.weightedAverage(
            typeMetrics.map(m => m.averageTaskTime),
            typeMetrics.map(m => m.tasksAttempted)
          ),
          totalCost: typeMetrics.reduce((sum, m) => sum + m.totalCost, 0),
        };
      }
    }

    return result as Record<AgentType, AgentTypeMetrics>;
  }

  private weightedAverage(values: number[], weights: number[]): number {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = values.reduce(
      (sum, v, i) => sum + v * weights[i],
      0
    );
    return weightedSum / totalWeight;
  }
}

/**
 * Metrics dashboard data
 */
interface MetricsDashboard {
  // Real-time
  currentActiveAgents: number;
  currentTasksInProgress: number;
  currentQueueLength: number;

  // Session
  sessionDuration: number;
  sessionTasksCompleted: number;
  sessionCost: number;

  // Progress
  overallProgress: number;
  currentPhase: string;
  estimatedCompletion: Date;

  // Health
  systemHealth: 'healthy' | 'degraded' | 'critical';
  alertCount: number;
  recentErrors: AgentError[];
}
```

---

### Task 5.3 Completion Checklist

- [x] All 5 agent types fully defined
  - [x] Planner Agent - strategic planning, decomposition, Claude Opus
  - [x] Coder Agent - code generation, implementation, Claude Sonnet
  - [x] Reviewer Agent - code review, quality assessment, Gemini 2.5 Pro
  - [x] Tester Agent - test writing, test execution, Claude Sonnet
  - [x] Merger Agent - git operations, conflict resolution, Claude Sonnet
- [x] Communication protocol complete
  - [x] AgentMessage format with types and payloads
  - [x] Request-response, fire-and-forget, pub-sub, pipeline patterns
  - [x] Communication channels (task-queue, status-updates, review, merge, errors)
- [x] Coordination mechanisms defined
  - [x] Task assignment algorithm with scoring
  - [x] Parallel execution with worktrees
  - [x] Handoff protocols for all agent transitions
  - [x] QA loop coordination with entry/exit conditions
- [x] Lifecycle management documented
  - [x] Agent creation and initialization
  - [x] State machine with transitions
  - [x] Graceful termination and cleanup
- [x] Failure handling strategies defined
  - [x] Failure types and detection rules
  - [x] Coder recovery strategies
  - [x] Reviewer fallback to Claude
  - [x] System-wide recovery from checkpoints
- [x] Metrics defined
  - [x] Per-agent metrics (tasks, iterations, time, cost, errors)
  - [x] System metrics (throughput, parallelization, quality, cost)
  - [x] Metrics dashboard structure

**[TASK 5.3 COMPLETE]**

---

## Task 5.4: Integration Architecture

### Overview

The Integration Architecture defines how all components from different source repositories integrate together to form a cohesive Nexus system. This includes adapters for format conversion, bridges for cross-layer communication, and the event system for loose coupling.

---

### Part A: Feature Integration Map

This section maps how extracted features from each source repository integrate into Nexus.

---

#### GSD Features Integration

| Feature | Integration Point | Layer | Adapter Needed | Status |
|---------|-------------------|-------|----------------|--------|
| **STATE.md Format** | Persistence Layer | 6 | StateFormatAdapter | Required |
| **2-3 Task Limit** | Planning Layer | 3 | None (native) | Direct |
| **Context Engineering** | Orchestration Layer | 2 | ContextAssembler | Required |
| **XML Task Schema** | Planning Layer | 3 | TaskSchemaAdapter | Required |
| **Frontmatter Dependencies** | Planning Layer | 3 | DependencyParser | Required |
| **Segment Routing** | Orchestration Layer | 2 | None (native) | Direct |
| **@Reference System** | Planning Layer | 3 | ReferenceResolver | Required |
| **Velocity Tracking** | Persistence Layer | 6 | MetricsAdapter | Required |

**GSD Integration Architecture:**

```
+-----------------------------------------------------------------------+
|                         GSD FEATURES INTEGRATION                        |
+-----------------------------------------------------------------------+
|                                                                         |
|   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ |
|   │  STATE.md       │     │  XML Tasks      │     │  Frontmatter    │ |
|   │  Format         │     │  Schema         │     │  Dependencies   │ |
|   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    ADAPTER LAYER                                 │ |
|   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│ |
|   │  │ StateFormat   │  │ TaskSchema    │  │ DependencyParser      ││ |
|   │  │ Adapter       │  │ Adapter       │  │                       ││ |
|   │  └───────────────┘  └───────────────┘  └───────────────────────┘│ |
|   └─────────────────────────────────────────────────────────────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    NEXUS CORE                                    │ |
|   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│ |
|   │  │ NexusState    │  │ NexusTask     │  │ DependencyGraph       ││ |
|   │  └───────────────┘  └───────────────┘  └───────────────────────┘│ |
|   └─────────────────────────────────────────────────────────────────┘ |
|                                                                         |
+-----------------------------------------------------------------------+
```

**GSD Integration Points:**

1. **STATE.md → StateManager**
   - Read STATE.md on session start
   - Convert to NexusState object
   - Sync changes back on significant events
   - Commit with code changes

2. **Task Limit Enforcement**
   - TaskDecomposer validates 2-3 tasks per plan
   - TaskValidator rejects oversized plans
   - Auto-split tasks exceeding 30 minutes

3. **Context Engineering**
   - ContextAssembler reads @References
   - Frontmatter scanner identifies dependencies
   - Token budget enforced per agent call

---

#### Auto-Claude Features Integration

| Feature | Integration Point | Layer | Adapter Needed | Status |
|---------|-------------------|-------|----------------|--------|
| **QA Loop** | Execution Layer | 4 | QALoopWrapper | Enhance |
| **Git Worktrees** | Infrastructure Layer | 7 | None (direct) | Direct |
| **Agent Patterns** | Orchestration Layer | 2 | AgentContextAdapter | Required |
| **Checkpoints** | Persistence Layer | 6 | CheckpointManager | Required |
| **Error Detection** | Execution Layer | 4 | ErrorPatternMatcher | Required |
| **Fix Generation** | Execution Layer | 4 | None (native) | Direct |
| **Memory System** | Persistence Layer | 6 | MemoryQueryAdapter | Required |
| **Subagent Spawning** | Orchestration Layer | 2 | AgentSpawner | Required |

**Auto-Claude Integration Architecture:**

```
+-----------------------------------------------------------------------+
|                    AUTO-CLAUDE FEATURES INTEGRATION                     |
+-----------------------------------------------------------------------+
|                                                                         |
|   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ |
|   │  QA Loop        │     │  Git Worktrees  │     │  Agent          │ |
|   │  Engine         │     │  Manager        │     │  Patterns       │ |
|   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    WRAPPER/BRIDGE LAYER                          │ |
|   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│ |
|   │  │ QALoopWrapper │  │ WorktreeBridge│  │ AgentContextAdapter   ││ |
|   │  │ (50 iter max) │  │               │  │                       ││ |
|   │  └───────────────┘  └───────────────┘  └───────────────────────┘│ |
|   └─────────────────────────────────────────────────────────────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    NEXUS EXECUTION                               │ |
|   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│ |
|   │  │ TaskExecutor  │  │ AgentRunner   │  │ MultiAgentCoordinator ││ |
|   │  └───────────────┘  └───────────────┘  └───────────────────────┘│ |
|   └─────────────────────────────────────────────────────────────────┘ |
|                                                                         |
+-----------------------------------------------------------------------+
```

**Auto-Claude Integration Points:**

1. **QA Loop → Execution Engine**
   - Wrap with iteration counter
   - Add 50-iteration limit
   - Emit events on each iteration
   - Trigger human escalation on limit

2. **Worktrees → Agent Isolation**
   - Create worktree on agent spawn
   - Pass worktree path to agent context
   - Merge on success, cleanup on failure
   - Track worktree → agent mapping

3. **Memory → Agent Context**
   - Query relevant episodes before agent execution
   - Inject patterns/gotchas into system prompt
   - Store decisions after successful tasks

---

#### OMO Features Integration

| Feature | Integration Point | Layer | Adapter Needed | Status |
|---------|-------------------|-------|----------------|--------|
| **LSP Tools (11)** | Infrastructure Layer | 7 | LSPToolAdapter | Required |
| **AST-grep** | Infrastructure Layer | 7 | ASTToolAdapter | Required |
| **Background Agents** | Orchestration Layer | 2 | BackgroundTaskManager | Required |
| **Tool Execution** | Execution Layer | 4 | ToolExecutor | Enhance |
| **File Operations** | Infrastructure Layer | 7 | None (direct) | Direct |

**OMO Integration Architecture:**

```
+-----------------------------------------------------------------------+
|                      OMO FEATURES INTEGRATION                           |
+-----------------------------------------------------------------------+
|                                                                         |
|   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ |
|   │  LSP Server     │     │  AST-grep       │     │  Background     │ |
|   │  Manager        │     │  Engine         │     │  Task Queue     │ |
|   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    TOOL ADAPTER LAYER                            │ |
|   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│ |
|   │  │ LSPToolAdapter│  │ ASTToolAdapter│  │ BackgroundTaskMgr     ││ |
|   │  │ - hover       │  │ - search      │  │                       ││ |
|   │  │ - definition  │  │ - replace     │  │                       ││ |
|   │  │ - references  │  │ - rewrite     │  │                       ││ |
|   │  │ - rename      │  │               │  │                       ││ |
|   │  └───────────────┘  └───────────────┘  └───────────────────────┘│ |
|   └─────────────────────────────────────────────────────────────────┘ |
|            │                       │                       │          |
|            ▼                       ▼                       ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    NEXUS TOOL SYSTEM                             │ |
|   │  ┌───────────────────────────────────────────────────────────┐  │ |
|   │  │ UnifiedToolExecutor                                        │  │ |
|   │  │ - Tool registration                                        │  │ |
|   │  │ - Permission checking                                      │  │ |
|   │  │ - Result formatting                                        │  │ |
|   │  └───────────────────────────────────────────────────────────┘  │ |
|   └─────────────────────────────────────────────────────────────────┘ |
|                                                                         |
+-----------------------------------------------------------------------+
```

**OMO Integration Points:**

1. **LSP Tools → Agent Capabilities**
   - Expose as tool calls for agents
   - Cache LSP server connections per language
   - Format LSP responses for LLM consumption

2. **AST-grep → Code Transformation**
   - Structural search and replace
   - Pattern-based code refactoring
   - Agent-accessible tool interface

3. **Background Agents → Parallel Processing**
   - Long-running task management
   - Progress reporting to UI
   - Resource cleanup on completion

---

#### AutoMaker Features Integration

| Feature | Integration Point | Layer | Adapter Needed | Status |
|---------|-------------------|-------|----------------|--------|
| **DependencyResolver** | Planning Layer | 3 | None (direct) | Direct |
| **Ideation Prompts** | Planning Layer | 3 | IdeationAdapter | Required |
| **Feature Enhancement** | Planning Layer | 3 | EnhancementAdapter | Required |

**AutoMaker Integration Architecture:**

```
+-----------------------------------------------------------------------+
|                    AUTOMAKER FEATURES INTEGRATION                       |
+-----------------------------------------------------------------------+
|                                                                         |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │  AutoMaker DependencyResolver                                    │ |
|   │  - Topological sort (Kahn's algorithm)                          │ |
|   │  - Cycle detection                                              │ |
|   │  - DAG visualization                                            │ |
|   └────────────────────────────────┬────────────────────────────────┘ |
|                                    │                                  |
|                                    ▼ (Direct integration)             |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │  NEXUS Planning Layer                                            │ |
|   │  ┌───────────────────────────────────────────────────────────┐  │ |
|   │  │ NexusDependencyResolver extends AutoMakerResolver          │  │ |
|   │  │ - Add Nexus task types                                     │  │ |
|   │  │ - Add parallel wave calculation                            │  │ |
|   │  │ - Add 30-min limit validation                              │  │ |
|   │  └───────────────────────────────────────────────────────────┘  │ |
|   └─────────────────────────────────────────────────────────────────┘ |
|                                                                         |
+-----------------------------------------------------------------------+
```

**AutoMaker Integration Points:**

1. **DependencyResolver → Task Ordering**
   - Direct import of resolver class
   - Extend with Nexus-specific task types
   - Add parallel wave calculation
   - Integrate with task validator

2. **Ideation → Planning Mode**
   - Prompt templates for feature ideation
   - User interaction during complex planning
   - Store ideation results in requirements

---

#### Ralph Features Integration

| Feature | Integration Point | Layer | Adapter Needed | Status |
|---------|-------------------|-------|----------------|--------|
| **ACP Protocol** | Orchestration Layer | 2 | ACPAdapter | Enhance |
| **Multi-Backend Support** | Orchestration Layer | 2 | ProviderAdapter | Required |
| **Safety Guards** | Orchestration Layer | 2 | SafetyWrapper | Enhance |
| **Permission System** | Orchestration Layer | 2 | PermissionChecker | Required |
| **Cost Estimation** | Orchestration Layer | 2 | CostTracker | Required |
| **Config System** | All Layers | All | ConfigAdapter | Required |

**Ralph Integration Architecture:**

```
+-----------------------------------------------------------------------+
|                      RALPH FEATURES INTEGRATION                         |
+-----------------------------------------------------------------------+
|                                                                         |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │  Ralph ACP Protocol                                              │ |
|   │  - JSON-RPC 2.0 messages                                        │ |
|   │  - Request/Response pattern                                     │ |
|   │  - Streaming support                                            │ |
|   └────────────────────────────────┬────────────────────────────────┘ |
|                                    │                                  |
|                                    ▼                                  |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    PROVIDER ADAPTERS                             │ |
|   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│ |
|   │  │ Claude     │  │ Gemini     │  │ OpenAI     │  │ Local      ││ |
|   │  │ Adapter    │  │ Adapter    │  │ Adapter    │  │ Adapter    ││ |
|   │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘│ |
|   │        │               │               │               │        │ |
|   └────────┼───────────────┼───────────────┼───────────────┼────────┘ |
|            │               │               │               │          |
|            ▼               ▼               ▼               ▼          |
|   ┌─────────────────────────────────────────────────────────────────┐ |
|   │                    NEXUS ORCHESTRATOR                            │ |
|   │  ┌───────────────────────────────────────────────────────────┐  │ |
|   │  │ AgentPool                                                  │  │ |
|   │  │ - Route to appropriate provider                           │  │ |
|   │  │ - Apply safety guards                                     │  │ |
|   │  │ - Track costs per provider                                │  │ |
|   │  │ - Respect rate limits                                     │  │ |
|   │  └───────────────────────────────────────────────────────────┘  │ |
|   └─────────────────────────────────────────────────────────────────┘ |
|                                                                         |
+-----------------------------------------------------------------------+
```

**Ralph Integration Points:**

1. **ACP Protocol → Agent Communication**
   - JSON-RPC 2.0 for all agent calls
   - Streaming responses for real-time UI
   - Standardized error handling

2. **Multi-Backend → Agent Assignment**
   - Claude for Planner (Opus), Coder (Sonnet), Tester, Merger
   - Gemini for Reviewer
   - OpenAI for embeddings (optional)
   - Dynamic fallback chain

3. **Safety Guards → All Executions**
   - Dangerous command detection
   - File write validation
   - Git operation safety checks

---

### Feature Integration Summary

| Source | Features Integrated | Adapters Required | Bridges Required | New Code |
|--------|---------------------|-------------------|------------------|----------|
| **GSD** | 8 | 5 | 1 | ~400 lines |
| **Auto-Claude** | 8 | 4 | 2 | ~600 lines |
| **OMO** | 5 | 3 | 1 | ~500 lines |
| **AutoMaker** | 3 | 2 | 0 | ~200 lines |
| **Ralph** | 6 | 4 | 1 | ~400 lines |
| **TOTAL** | **30** | **18** | **5** | **~2,100 lines** |

---

### Part B: Adapter Specifications

This section defines all adapters needed to bridge format differences between source repositories and Nexus core.

---

#### STATE Format Adapter (GAP-INT-001)

**Purpose:** Convert between GSD STATE.md format and Nexus internal state representation.

```typescript
/**
 * STATE Format Adapter
 * Bridges GSD markdown state format with Nexus object model
 */
interface StateFormatAdapter {
  /**
   * Parse STATE.md content into NexusState object
   */
  fromGSDState(content: string): NexusState;

  /**
   * Serialize NexusState to STATE.md format
   */
  toGSDState(state: NexusState): string;

  /**
   * Merge states from multiple sources (e.g., after parallel execution)
   */
  mergeStates(states: NexusState[]): NexusState;

  /**
   * Detect and reconcile state drift
   */
  reconcile(fileState: NexusState, memoryState: NexusState): NexusState;
}

/**
 * GSD STATE.md Section Mappings
 */
interface GSDStateSections {
  'Current Position': {
    phase: string;        // "Phase: 2 of 4 (Authentication)"
    plan: string;         // "Plan: 1 of 3 in current phase"
    progress: string;     // "Progress: ████████░░ 80%"
  };
  'Decisions': Array<{
    phase: string;
    decision: string;
    timestamp?: Date;
  }>;
  'Performance Metrics': {
    totalPlans: number;
    averageDuration: number;
    successRate: number;
  };
}

/**
 * Implementation Approach
 */
class StateFormatAdapterImpl implements StateFormatAdapter {
  private readonly SECTION_PATTERNS = {
    currentPosition: /## Current Position\n([\s\S]*?)(?=##|$)/,
    decisions: /## Decisions\n([\s\S]*?)(?=##|$)/,
    metrics: /## Performance Metrics\n([\s\S]*?)(?=##|$)/,
  };

  fromGSDState(content: string): NexusState {
    const sections = this.parseSections(content);
    return {
      currentPhase: this.parsePhase(sections.currentPosition),
      currentPlan: this.parsePlan(sections.currentPosition),
      progress: this.parseProgress(sections.currentPosition),
      decisions: this.parseDecisions(sections.decisions),
      metrics: this.parseMetrics(sections.metrics),
      lastUpdated: new Date(),
    };
  }

  toGSDState(state: NexusState): string {
    return `# Project State

## Current Position
Phase: ${state.currentPhase.index} of ${state.currentPhase.total} (${state.currentPhase.name})
Plan: ${state.currentPlan.index} of ${state.currentPlan.total} in current phase
Progress: ${this.renderProgressBar(state.progress)} ${state.progress}%

## Decisions
${state.decisions.map(d => `- [${d.phase}]: ${d.decision}`).join('\n')}

## Performance Metrics
**Velocity:**
- Total plans completed: ${state.metrics.totalPlans}
- Average duration: ${state.metrics.averageDuration.toFixed(1)} min
- Success rate: ${(state.metrics.successRate * 100).toFixed(1)}%

---
*Last updated: ${state.lastUpdated.toISOString()}*
`;
  }

  private renderProgressBar(progress: number): string {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
```

**Error Handling:**
- Graceful degradation for malformed STATE.md
- Create new state if file doesn't exist
- Log warnings for unrecognized sections
- Preserve unknown sections on write-back

**Estimated Lines of Code:** 150-200

---

#### Agent Context Adapter (GAP-INT-002)

**Purpose:** Provide provider-agnostic agent context that works with Claude, Gemini, and other providers.

```typescript
/**
 * Agent Context Adapter
 * Wraps Auto-Claude patterns for multi-provider support via Ralph
 */
interface AgentContextAdapter {
  /**
   * Create context for Claude agents (Planner, Coder, Tester, Merger)
   */
  createClaudeContext(agent: AgentConfig, task: NexusTask): ClaudeContext;

  /**
   * Create context for Gemini agents (Reviewer)
   */
  createGeminiContext(agent: AgentConfig, task: NexusTask): GeminiContext;

  /**
   * Create unified context that can be adapted to any provider
   */
  createUnifiedContext(agent: AgentConfig, task: NexusTask): UnifiedContext;

  /**
   * Adapt unified context to specific provider format
   */
  adaptToProvider(context: UnifiedContext, provider: ProviderType): ProviderContext;
}

/**
 * Unified Context Format
 */
interface UnifiedContext {
  // Identity
  agentId: string;
  agentRole: AgentRole;
  agentModel: string;

  // Task context
  task: NexusTask;
  taskHistory: TaskResult[];
  relatedFiles: FileContext[];

  // System context
  systemPrompt: string;
  tools: ToolDefinition[];
  constraints: Constraint[];

  // Memory context
  relevantPatterns: Pattern[];
  relevantGotchas: Gotcha[];
  previousDecisions: Decision[];

  // Worktree context
  worktreePath: string;
  gitBranch: string;
}

/**
 * Provider-Specific Context Adapters
 */
class ClaudeContextAdapter {
  adapt(unified: UnifiedContext): ClaudeContext {
    return {
      model: unified.agentModel,
      max_tokens: this.getTokenLimit(unified.agentRole),
      system: unified.systemPrompt,
      messages: this.buildMessages(unified),
      tools: this.adaptTools(unified.tools),
    };
  }

  private adaptTools(tools: ToolDefinition[]): ClaudeTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }
}

class GeminiContextAdapter {
  adapt(unified: UnifiedContext): GeminiContext {
    return {
      model: unified.agentModel,
      systemInstruction: { parts: [{ text: unified.systemPrompt }] },
      contents: this.buildContents(unified),
      tools: this.adaptTools(unified.tools),
      generationConfig: this.getGenerationConfig(unified.agentRole),
    };
  }

  private adaptTools(tools: ToolDefinition[]): GeminiTool[] {
    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    }];
  }
}
```

**Error Handling:**
- Validate context completeness before adaptation
- Graceful fallback for missing optional fields
- Provider-specific validation (token limits, tool format)
- Clear error messages for adaptation failures

**Estimated Lines of Code:** 250-300

---

#### Task Schema Adapter (GAP-INT-003)

**Purpose:** Convert GSD XML task format to Nexus JSON format.

```typescript
/**
 * Task Schema Adapter
 * Converts GSD XML tasks to Nexus JSON format
 */
interface TaskSchemaAdapter {
  /**
   * Convert single GSD task to Nexus task
   */
  convert(gsdTask: GSDTask, context: TaskContext): NexusTask;

  /**
   * Convert batch of GSD tasks with dependency inference
   */
  convertBatch(gsdTasks: GSDTask[], context: TaskContext): NexusTask[];

  /**
   * Reverse: Convert Nexus task to GSD XML format
   */
  toGSD(nexusTask: NexusTask): GSDTask;
}

/**
 * GSD Task Format (from source)
 */
interface GSDTask {
  type: 'auto' | 'checkpoint';
  tdd?: boolean;
  action: string;        // Description of what to do
  done: string;          // Success criteria
  verification?: string; // How to verify
  testFirst?: string;    // TDD test to write first
}

/**
 * Nexus Task Format (target)
 */
interface NexusTask {
  id: string;            // Hierarchical: F001-A-01
  name: string;          // Short name
  description: string;   // Full description
  files: string[];       // Files to create/modify
  test: string;          // Success criteria
  dependsOn: string[];   // Task IDs this depends on
  timeEstimate: number;  // Minutes (max 30)
  type: 'auto' | 'checkpoint';
  tdd: boolean;
  status: TaskStatus;
  metadata: TaskMetadata;
}

/**
 * Implementation
 */
class TaskSchemaAdapterImpl implements TaskSchemaAdapter {
  private idGenerator: TaskIdGenerator;

  constructor() {
    this.idGenerator = new TaskIdGenerator();
  }

  convert(gsdTask: GSDTask, context: TaskContext): NexusTask {
    return {
      id: this.idGenerator.next(context.featureId, context.subFeatureId),
      name: this.extractName(gsdTask.action),
      description: gsdTask.action,
      files: this.extractFiles(gsdTask.action),
      test: gsdTask.testFirst || gsdTask.done,
      dependsOn: this.inferDependencies(gsdTask, context),
      timeEstimate: this.estimateTime(gsdTask),
      type: gsdTask.type,
      tdd: gsdTask.tdd || false,
      status: 'pending',
      metadata: {
        source: 'gsd',
        convertedAt: new Date(),
        originalAction: gsdTask.action,
      },
    };
  }

  private extractName(action: string): string {
    // Extract first verb phrase as name
    const match = action.match(/^(Create|Add|Update|Fix|Implement|Write|Configure|Set up)\s+[^.!]+/i);
    return match ? match[0].slice(0, 50) : action.slice(0, 50);
  }

  private extractFiles(action: string): string[] {
    // Extract file paths from action description
    const filePatterns = [
      /in\s+([^\s,]+\.[a-z]{2,4})/gi,
      /to\s+([^\s,]+\.[a-z]{2,4})/gi,
      /from\s+([^\s,]+\.[a-z]{2,4})/gi,
      /file\s+([^\s,]+\.[a-z]{2,4})/gi,
      /`([^\s`]+\.[a-z]{2,4})`/gi,
    ];

    const files = new Set<string>();
    for (const pattern of filePatterns) {
      const matches = action.matchAll(pattern);
      for (const match of matches) {
        files.add(match[1]);
      }
    }
    return Array.from(files);
  }

  private estimateTime(task: GSDTask): number {
    let time = 10; // Base: 10 minutes

    // Add time for TDD
    if (task.tdd) time += 5;

    // Add time for checkpoint (human interaction)
    if (task.type === 'checkpoint') time += 5;

    // Add time based on action complexity (word count heuristic)
    const words = task.action.split(/\s+/).length;
    if (words > 20) time += 5;
    if (words > 40) time += 5;

    // Cap at 30 minutes
    return Math.min(time, 30);
  }

  private inferDependencies(task: GSDTask, context: TaskContext): string[] {
    const deps: string[] = [];

    // Inherit dependencies from context
    if (context.previousTaskId) {
      deps.push(context.previousTaskId);
    }

    // Parse explicit dependency markers
    const depMarkers = task.action.match(/after\s+([A-Z]\d{3}-[A-Z]-\d{2})/gi);
    if (depMarkers) {
      deps.push(...depMarkers.map(m => m.replace(/^after\s+/i, '')));
    }

    return deps;
  }
}

/**
 * Task ID Generator
 */
class TaskIdGenerator {
  private counters: Map<string, number> = new Map();

  next(featureId: string, subFeatureId: string): string {
    const key = `${featureId}-${subFeatureId}`;
    const count = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, count);
    return `${featureId}-${subFeatureId}-${String(count).padStart(2, '0')}`;
  }

  reset(): void {
    this.counters.clear();
  }
}
```

**Error Handling:**
- Validate GSD task structure before conversion
- Generate valid ID even with invalid context
- Default time estimate if calculation fails
- Log conversion issues for debugging

**Estimated Lines of Code:** 200-250

---

#### Memory Query Adapter (GAP-INT-004)

**Purpose:** Bridge between memory storage and agent context injection.

```typescript
/**
 * Memory Query Adapter
 * Retrieves relevant memories for agent context
 */
interface MemoryQueryAdapter {
  /**
   * Query memories relevant to a task
   */
  queryForTask(task: NexusTask, agentRole: AgentRole): Promise<MemoryContext>;

  /**
   * Query memories by semantic similarity
   */
  querySemantic(query: string, limit: number): Promise<Episode[]>;

  /**
   * Query memories by type
   */
  queryByType(type: EpisodeType, limit: number): Promise<Episode[]>;

  /**
   * Store new episode
   */
  store(episode: Episode): Promise<void>;
}

/**
 * Episode Types (from Auto-Claude)
 */
type EpisodeType = 'pattern' | 'gotcha' | 'decision' | 'success' | 'failure';

/**
 * Episode Structure
 */
interface Episode {
  id: string;
  type: EpisodeType;
  content: string;
  context: {
    taskType?: string;
    files?: string[];
    technologies?: string[];
    agentRole?: AgentRole;
  };
  embedding?: number[];
  createdAt: Date;
  relevanceScore?: number;
}

/**
 * Memory Context for Agent Injection
 */
interface MemoryContext {
  patterns: Episode[];      // Successful approaches to reuse
  gotchas: Episode[];       // Pitfalls to avoid
  decisions: Episode[];     // Previous architectural decisions
  relevantHistory: Episode[]; // Task-specific history
}

/**
 * Implementation
 */
class MemoryQueryAdapterImpl implements MemoryQueryAdapter {
  private db: Database;
  private embeddingService: EmbeddingService;

  constructor(db: Database, embeddingService: EmbeddingService) {
    this.db = db;
    this.embeddingService = embeddingService;
  }

  async queryForTask(task: NexusTask, agentRole: AgentRole): Promise<MemoryContext> {
    // Build query from task context
    const query = this.buildTaskQuery(task, agentRole);

    // Parallel queries for each memory type
    const [patterns, gotchas, decisions, history] = await Promise.all([
      this.queryByType('pattern', 5),
      this.queryByType('gotcha', 5),
      this.queryByType('decision', 5),
      this.querySemantic(query, 10),
    ]);

    // Filter by relevance threshold
    const threshold = 0.7;
    return {
      patterns: patterns.filter(e => (e.relevanceScore || 0) > threshold),
      gotchas: gotchas.filter(e => (e.relevanceScore || 0) > threshold),
      decisions: decisions.filter(e => (e.relevanceScore || 0) > threshold),
      relevantHistory: history.filter(e => (e.relevanceScore || 0) > threshold),
    };
  }

  async querySemantic(query: string, limit: number): Promise<Episode[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.embed(query);

    // SQLite vector similarity search
    const results = this.db.prepare(`
      SELECT *,
        (1 - vector_distance(embedding, ?)) as relevance_score
      FROM episodes
      ORDER BY relevance_score DESC
      LIMIT ?
    `).all(JSON.stringify(queryEmbedding), limit);

    return results.map(row => ({
      ...this.parseRow(row),
      relevanceScore: row.relevance_score,
    }));
  }

  private buildTaskQuery(task: NexusTask, agentRole: AgentRole): string {
    const parts = [
      task.name,
      task.description,
      ...task.files,
      agentRole,
    ];
    return parts.join(' ');
  }
}
```

**Error Handling:**
- Return empty context if database unavailable
- Graceful degradation without embeddings
- Cache frequent queries
- Log query performance for optimization

**Estimated Lines of Code:** 200-250

---

#### Rate Limit Wrapper (GAP-INT-007)

**Purpose:** Add rate limiting to API calls across all providers.

```typescript
/**
 * Rate Limit Wrapper
 * Manages API rate limits across providers
 */
interface RateLimitWrapper {
  /**
   * Execute API call with rate limiting
   */
  execute<T>(provider: ProviderType, fn: () => Promise<T>): Promise<T>;

  /**
   * Check current rate limit status
   */
  getStatus(provider: ProviderType): RateLimitStatus;

  /**
   * Reset rate limits (for testing)
   */
  reset(provider?: ProviderType): void;
}

/**
 * Rate Limit Configuration per Provider
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
  retryAfterMs: number;
  maxRetries: number;
}

const PROVIDER_LIMITS: Record<ProviderType, RateLimitConfig> = {
  claude: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
    concurrentRequests: 5,
    retryAfterMs: 1000,
    maxRetries: 3,
  },
  gemini: {
    requestsPerMinute: 60,
    tokensPerMinute: 2000000,
    concurrentRequests: 10,
    retryAfterMs: 500,
    maxRetries: 3,
  },
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    concurrentRequests: 5,
    retryAfterMs: 1000,
    maxRetries: 3,
  },
};

/**
 * Implementation with Token Bucket Algorithm
 */
class RateLimitWrapperImpl implements RateLimitWrapper {
  private buckets: Map<ProviderType, TokenBucket> = new Map();
  private queues: Map<ProviderType, PQueue> = new Map();

  constructor() {
    // Initialize buckets and queues for each provider
    for (const [provider, config] of Object.entries(PROVIDER_LIMITS)) {
      this.buckets.set(provider as ProviderType, new TokenBucket(config));
      this.queues.set(provider as ProviderType, new PQueue({
        concurrency: config.concurrentRequests,
      }));
    }
  }

  async execute<T>(provider: ProviderType, fn: () => Promise<T>): Promise<T> {
    const queue = this.queues.get(provider)!;
    const bucket = this.buckets.get(provider)!;
    const config = PROVIDER_LIMITS[provider];

    return queue.add(async () => {
      // Wait for token availability
      await bucket.acquire();

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (this.isRateLimitError(error)) {
            lastError = error as Error;
            await this.exponentialBackoff(attempt, config.retryAfterMs);
          } else {
            throw error;
          }
        }
      }
      throw lastError || new Error('Max retries exceeded');
    });
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('rate limit') ||
             error.message.includes('429') ||
             error.message.includes('too many requests');
    }
    return false;
  }

  private async exponentialBackoff(attempt: number, baseMs: number): Promise<void> {
    const delay = baseMs * Math.pow(2, attempt) + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getStatus(provider: ProviderType): RateLimitStatus {
    const bucket = this.buckets.get(provider)!;
    const queue = this.queues.get(provider)!;
    return {
      availableTokens: bucket.available(),
      pendingRequests: queue.pending,
      activeRequests: queue.size - queue.pending,
    };
  }
}

/**
 * Token Bucket for Rate Limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.requestsPerMinute;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    while (this.tokens < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.refill();
    }
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 60000) * this.config.requestsPerMinute;
    this.tokens = Math.min(this.config.requestsPerMinute, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
```

**Error Handling:**
- Retry with exponential backoff on rate limit errors
- Log all rate limit events
- Emit events for monitoring
- Graceful queue draining on shutdown

**Estimated Lines of Code:** 200-250

---

#### QA Loop Metrics Wrapper (GAP-INT-006)

**Purpose:** Add iteration tracking, metrics, and 50-iteration limit to QA loop.

```typescript
/**
 * QA Loop Metrics Wrapper
 * Wraps Auto-Claude QA loop with iteration limits and metrics
 */
interface QALoopWrapper {
  /**
   * Execute QA loop with metrics
   */
  execute(agent: AgentHandle, task: NexusTask): Promise<QALoopResult>;

  /**
   * Get metrics for a task
   */
  getMetrics(taskId: string): QALoopMetrics;

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): AggregateQAMetrics;
}

/**
 * QA Loop Result
 */
interface QALoopResult {
  success: boolean;
  iterations: number;
  finalStatus: 'passed' | 'failed' | 'escalated';
  errors: QAError[];
  duration: number;
  metrics: QALoopMetrics;
}

/**
 * QA Loop Metrics
 */
interface QALoopMetrics {
  taskId: string;
  totalIterations: number;
  buildAttempts: number;
  lintAttempts: number;
  testAttempts: number;
  reviewAttempts: number;
  fixesApplied: number;
  startTime: Date;
  endTime?: Date;
  humanEscalated: boolean;
}

/**
 * Implementation
 */
class QALoopWrapperImpl implements QALoopWrapper {
  private readonly MAX_ITERATIONS = 50;
  private metricsStore: Map<string, QALoopMetrics> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async execute(agent: AgentHandle, task: NexusTask): Promise<QALoopResult> {
    const metrics: QALoopMetrics = {
      taskId: task.id,
      totalIterations: 0,
      buildAttempts: 0,
      lintAttempts: 0,
      testAttempts: 0,
      reviewAttempts: 0,
      fixesApplied: 0,
      startTime: new Date(),
      humanEscalated: false,
    };

    this.metricsStore.set(task.id, metrics);
    const errors: QAError[] = [];
    const startTime = Date.now();

    try {
      while (metrics.totalIterations < this.MAX_ITERATIONS) {
        metrics.totalIterations++;

        // Emit iteration event
        this.eventBus.emit('qa:iteration', {
          taskId: task.id,
          iteration: metrics.totalIterations,
          maxIterations: this.MAX_ITERATIONS,
        });

        // Run build
        metrics.buildAttempts++;
        const buildResult = await this.runBuild(agent);
        if (!buildResult.success) {
          errors.push({ phase: 'build', ...buildResult.error });
          metrics.fixesApplied++;
          await this.applyFix(agent, buildResult.error);
          continue;
        }

        // Run lint
        metrics.lintAttempts++;
        const lintResult = await this.runLint(agent);
        if (!lintResult.success) {
          errors.push({ phase: 'lint', ...lintResult.error });
          metrics.fixesApplied++;
          await this.applyFix(agent, lintResult.error);
          continue;
        }

        // Run tests
        metrics.testAttempts++;
        const testResult = await this.runTests(agent);
        if (!testResult.success) {
          errors.push({ phase: 'test', ...testResult.error });
          metrics.fixesApplied++;
          await this.applyFix(agent, testResult.error);
          continue;
        }

        // Run review
        metrics.reviewAttempts++;
        const reviewResult = await this.runReview(agent);
        if (!reviewResult.approved) {
          errors.push({ phase: 'review', ...reviewResult.issues });
          metrics.fixesApplied++;
          await this.applyFix(agent, reviewResult.issues);
          continue;
        }

        // All passed!
        metrics.endTime = new Date();
        return {
          success: true,
          iterations: metrics.totalIterations,
          finalStatus: 'passed',
          errors,
          duration: Date.now() - startTime,
          metrics,
        };
      }

      // Max iterations reached - escalate to human
      metrics.humanEscalated = true;
      metrics.endTime = new Date();

      this.eventBus.emit('qa:escalated', {
        taskId: task.id,
        iterations: metrics.totalIterations,
        errors,
      });

      return {
        success: false,
        iterations: metrics.totalIterations,
        finalStatus: 'escalated',
        errors,
        duration: Date.now() - startTime,
        metrics,
      };
    } catch (error) {
      metrics.endTime = new Date();
      throw error;
    }
  }

  getMetrics(taskId: string): QALoopMetrics {
    return this.metricsStore.get(taskId) || this.createEmptyMetrics(taskId);
  }

  getAggregateMetrics(): AggregateQAMetrics {
    const all = Array.from(this.metricsStore.values());
    return {
      totalTasks: all.length,
      successRate: all.filter(m => !m.humanEscalated).length / all.length,
      averageIterations: all.reduce((sum, m) => sum + m.totalIterations, 0) / all.length,
      escalationRate: all.filter(m => m.humanEscalated).length / all.length,
      averageFixesPerTask: all.reduce((sum, m) => sum + m.fixesApplied, 0) / all.length,
    };
  }
}
```

**Error Handling:**
- Continue loop on recoverable errors
- Capture all errors for human review
- Emit events for UI updates
- Clean metrics on task completion

**Estimated Lines of Code:** 200-250

---

### Adapter Summary Table

| Adapter | Purpose | Input | Output | Complexity | LOC |
|---------|---------|-------|--------|------------|-----|
| **StateFormatAdapter** | STATE.md ↔ NexusState | string/object | object/string | LOW | 150-200 |
| **AgentContextAdapter** | Provider-agnostic context | AgentConfig | ProviderContext | MEDIUM | 250-300 |
| **TaskSchemaAdapter** | GSD XML → Nexus JSON | GSDTask | NexusTask | MEDIUM | 200-250 |
| **MemoryQueryAdapter** | Memory → Agent context | Query | Episodes | MEDIUM | 200-250 |
| **RateLimitWrapper** | API rate limiting | Provider + fn | Result | MEDIUM | 200-250 |
| **QALoopWrapper** | Iteration limits + metrics | Agent + Task | QAResult | MEDIUM | 200-250 |

**Total Adapter Lines:** ~1,200-1,500

---

### Part C: Bridge Specifications

This section defines bridges that connect different layers and subsystems.

---

#### Agent-Worktree Bridge (GAP-INT-008)

**Purpose:** Manage the relationship between agents and their isolated worktrees.

```typescript
/**
 * Agent-Worktree Bridge
 * Connects agent spawning with worktree creation
 */
interface AgentWorktreeBridge {
  /**
   * Spawn agent with dedicated worktree
   */
  spawnWithWorktree(task: NexusTask, agentType: AgentType): Promise<AgentWorktreeHandle>;

  /**
   * Merge worktree changes back to main
   */
  mergeAndCleanup(handle: AgentWorktreeHandle): Promise<MergeResult>;

  /**
   * Cleanup worktree on failure
   */
  cleanupOnFailure(handle: AgentWorktreeHandle): Promise<void>;

  /**
   * Get all active agent-worktree pairs
   */
  getActiveHandles(): AgentWorktreeHandle[];
}

/**
 * Agent-Worktree Handle
 */
interface AgentWorktreeHandle {
  agentId: string;
  worktreePath: string;
  branchName: string;
  task: NexusTask;
  createdAt: Date;
  status: 'active' | 'merging' | 'cleaning' | 'complete';
}

/**
 * Implementation
 */
class AgentWorktreeBridgeImpl implements AgentWorktreeBridge {
  private worktreeManager: WorktreeManager;
  private agentPool: AgentPool;
  private activeHandles: Map<string, AgentWorktreeHandle> = new Map();

  constructor(worktreeManager: WorktreeManager, agentPool: AgentPool) {
    this.worktreeManager = worktreeManager;
    this.agentPool = agentPool;
  }

  async spawnWithWorktree(task: NexusTask, agentType: AgentType): Promise<AgentWorktreeHandle> {
    // Generate unique branch name
    const branchName = `nexus/${agentType}/${task.id}/${Date.now()}`;

    // Create worktree
    const worktreePath = await this.worktreeManager.create({
      branchName,
      baseBranch: 'main',
    });

    // Spawn agent with worktree context
    const agent = await this.agentPool.spawn(agentType, {
      cwd: worktreePath,
      task,
    });

    const handle: AgentWorktreeHandle = {
      agentId: agent.id,
      worktreePath,
      branchName,
      task,
      createdAt: new Date(),
      status: 'active',
    };

    this.activeHandles.set(agent.id, handle);
    return handle;
  }

  async mergeAndCleanup(handle: AgentWorktreeHandle): Promise<MergeResult> {
    try {
      handle.status = 'merging';

      // Attempt merge
      const result = await this.worktreeManager.merge({
        worktreePath: handle.worktreePath,
        targetBranch: 'main',
        strategy: 'squash', // Squash into single commit
      });

      if (result.success) {
        // Cleanup worktree
        handle.status = 'cleaning';
        await this.worktreeManager.remove(handle.worktreePath);
        handle.status = 'complete';
        this.activeHandles.delete(handle.agentId);
      } else if (result.conflicts) {
        // Escalate to Merger Agent
        return await this.escalateToMerger(handle, result.conflicts);
      }

      return result;
    } catch (error) {
      await this.cleanupOnFailure(handle);
      throw error;
    }
  }

  async cleanupOnFailure(handle: AgentWorktreeHandle): Promise<void> {
    handle.status = 'cleaning';

    try {
      // Force cleanup worktree
      await this.worktreeManager.remove(handle.worktreePath, { force: true });

      // Delete branch
      await this.worktreeManager.deleteBranch(handle.branchName, { force: true });
    } finally {
      this.activeHandles.delete(handle.agentId);
    }
  }

  private async escalateToMerger(
    handle: AgentWorktreeHandle,
    conflicts: ConflictInfo[]
  ): Promise<MergeResult> {
    // Spawn Merger Agent to resolve conflicts
    const mergerHandle = await this.spawnWithWorktree(
      { ...handle.task, type: 'merge' as any, description: 'Resolve merge conflicts' },
      'merger'
    );

    // Provide conflict context to merger
    const mergerAgent = this.agentPool.get(mergerHandle.agentId);
    await mergerAgent.execute({
      type: 'resolve_conflicts',
      conflicts,
      sourceWorktree: handle.worktreePath,
    });

    return this.mergeAndCleanup(mergerHandle);
  }

  getActiveHandles(): AgentWorktreeHandle[] {
    return Array.from(this.activeHandles.values());
  }
}
```

**Error Handling:**
- Force cleanup on unrecoverable errors
- Preserve branch for manual investigation if cleanup fails
- Log all worktree operations
- Emit events for monitoring

**Estimated Lines of Code:** 200-250

---

#### Planning-Execution Bridge (GAP-INT-005)

**Purpose:** Connect task planning output with execution engine input.

```typescript
/**
 * Planning-Execution Bridge
 * Connects planning layer output to execution layer input
 */
interface PlanningExecutionBridge {
  /**
   * Submit plan for execution
   */
  submitPlan(plan: NexusPlan): Promise<ExecutionHandle>;

  /**
   * Get next executable task wave
   */
  getNextWave(executionId: string): Promise<TaskWave | null>;

  /**
   * Report task completion
   */
  reportCompletion(taskId: string, result: TaskResult): Promise<void>;

  /**
   * Get execution status
   */
  getStatus(executionId: string): ExecutionStatus;
}

/**
 * Execution Handle
 */
interface ExecutionHandle {
  id: string;
  plan: NexusPlan;
  status: 'pending' | 'executing' | 'paused' | 'complete' | 'failed';
  completedTasks: string[];
  failedTasks: string[];
  currentWave: number;
}

/**
 * Task Wave (parallel execution group)
 */
interface TaskWave {
  waveNumber: number;
  tasks: NexusTask[];
  canExecuteInParallel: boolean;
  estimatedDuration: number;
}

/**
 * Implementation
 */
class PlanningExecutionBridgeImpl implements PlanningExecutionBridge {
  private executions: Map<string, ExecutionHandle> = new Map();
  private taskQueue: TaskQueue;
  private eventBus: EventBus;

  constructor(taskQueue: TaskQueue, eventBus: EventBus) {
    this.taskQueue = taskQueue;
    this.eventBus = eventBus;
  }

  async submitPlan(plan: NexusPlan): Promise<ExecutionHandle> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Validate plan
    this.validatePlan(plan);

    // Calculate parallel waves
    const waves = this.calculateWaves(plan.tasks);

    const handle: ExecutionHandle = {
      id: executionId,
      plan,
      status: 'pending',
      completedTasks: [],
      failedTasks: [],
      currentWave: 0,
    };

    this.executions.set(executionId, handle);

    // Emit event
    this.eventBus.emit('execution:started', { executionId, plan });

    // Queue first wave
    await this.queueWave(executionId, waves[0]);
    handle.status = 'executing';

    return handle;
  }

  async getNextWave(executionId: string): Promise<TaskWave | null> {
    const handle = this.executions.get(executionId);
    if (!handle) return null;

    const waves = this.calculateWaves(handle.plan.tasks);

    // Check if all tasks in current wave are complete
    const currentWave = waves[handle.currentWave];
    const allComplete = currentWave.tasks.every(
      task => handle.completedTasks.includes(task.id)
    );

    if (!allComplete) return null;

    // Move to next wave
    handle.currentWave++;
    if (handle.currentWave >= waves.length) {
      handle.status = 'complete';
      return null;
    }

    return waves[handle.currentWave];
  }

  async reportCompletion(taskId: string, result: TaskResult): Promise<void> {
    // Find execution containing this task
    for (const handle of this.executions.values()) {
      if (handle.plan.tasks.some(t => t.id === taskId)) {
        if (result.success) {
          handle.completedTasks.push(taskId);
        } else {
          handle.failedTasks.push(taskId);
        }

        // Emit event
        this.eventBus.emit('task:completed', { taskId, result });

        // Check if wave is complete
        const nextWave = await this.getNextWave(handle.id);
        if (nextWave) {
          await this.queueWave(handle.id, nextWave);
        }
        return;
      }
    }
  }

  private validatePlan(plan: NexusPlan): void {
    // Validate all tasks have valid dependencies
    const taskIds = new Set(plan.tasks.map(t => t.id));
    for (const task of plan.tasks) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          throw new Error(`Invalid dependency: ${task.id} depends on unknown task ${dep}`);
        }
      }
    }

    // Validate no cycles
    this.detectCycles(plan.tasks);

    // Validate time limits
    for (const task of plan.tasks) {
      if (task.timeEstimate > 30) {
        throw new Error(`Task ${task.id} exceeds 30-minute limit`);
      }
    }
  }

  private calculateWaves(tasks: NexusTask[]): TaskWave[] {
    // Kahn's algorithm for topological levels
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const task of tasks) {
      inDegree.set(task.id, task.dependsOn.length);
      adjacency.set(task.id, []);
    }

    // Build adjacency
    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        adjacency.get(dep)?.push(task.id);
      }
    }

    const waves: TaskWave[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    while (inDegree.size > 0) {
      // Find all tasks with no remaining dependencies
      const waveTasks: NexusTask[] = [];
      for (const [id, degree] of inDegree) {
        if (degree === 0) {
          waveTasks.push(taskMap.get(id)!);
        }
      }

      if (waveTasks.length === 0 && inDegree.size > 0) {
        throw new Error('Cycle detected in task dependencies');
      }

      // Remove processed tasks
      for (const task of waveTasks) {
        inDegree.delete(task.id);
        for (const dependent of adjacency.get(task.id) || []) {
          inDegree.set(dependent, (inDegree.get(dependent) || 0) - 1);
        }
      }

      waves.push({
        waveNumber: waves.length + 1,
        tasks: waveTasks,
        canExecuteInParallel: true,
        estimatedDuration: Math.max(...waveTasks.map(t => t.timeEstimate)),
      });
    }

    return waves;
  }
}
```

**Error Handling:**
- Validate plan before execution
- Handle task failures without stopping entire plan
- Support plan pausing and resumption
- Emit events for UI updates

**Estimated Lines of Code:** 250-300

---

#### UI-Backend Bridge

**Purpose:** Connect React UI with backend services via events and API calls.

```typescript
/**
 * UI-Backend Bridge
 * Connects React frontend with Nexus backend
 */
interface UIBackendBridge {
  /**
   * Connect to event stream
   */
  connect(): Promise<void>;

  /**
   * Disconnect from event stream
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to events
   */
  subscribe<T extends keyof NexusEvents>(
    event: T,
    handler: (data: NexusEvents[T]) => void
  ): Unsubscribe;

  /**
   * Call backend API
   */
  call<T extends keyof NexusAPI>(
    method: T,
    params: Parameters<NexusAPI[T]>[0]
  ): Promise<ReturnType<NexusAPI[T]>>;
}

/**
 * Nexus Events (for real-time updates)
 */
interface NexusEvents {
  // Project events
  'project:created': { project: Project };
  'project:updated': { projectId: string; changes: Partial<Project> };
  'project:completed': { projectId: string };

  // Task events
  'task:created': { task: NexusTask };
  'task:started': { taskId: string; agentId: string };
  'task:completed': { taskId: string; result: TaskResult };
  'task:failed': { taskId: string; error: Error };

  // Agent events
  'agent:spawned': { agentId: string; type: AgentType };
  'agent:working': { agentId: string; taskId: string };
  'agent:idle': { agentId: string };
  'agent:terminated': { agentId: string };

  // QA events
  'qa:iteration': { taskId: string; iteration: number; maxIterations: number };
  'qa:escalated': { taskId: string; iterations: number; errors: QAError[] };

  // Feature events (Kanban)
  'feature:moved': { featureId: string; fromColumn: ColumnState; toColumn: ColumnState };
  'feature:progress': { featureId: string; progress: number };
}

/**
 * Nexus API (for direct calls)
 */
interface NexusAPI {
  // Project operations
  createProject(config: ProjectConfig): Promise<Project>;
  getProject(projectId: string): Promise<Project>;
  pauseProject(projectId: string): Promise<void>;
  resumeProject(projectId: string): Promise<void>;

  // Feature operations
  moveFeature(featureId: string, toColumn: ColumnState): Promise<void>;
  triggerExecution(featureId: string): Promise<void>;
  getFeatures(projectId: string): Promise<NexusFeature[]>;

  // Agent operations
  getAgentStatuses(): Promise<AgentStatus[]>;

  // Checkpoint operations
  approveReview(reviewId: string): Promise<void>;
  requestChanges(reviewId: string, feedback: string): Promise<void>;
}

/**
 * Implementation using EventEmitter and JSON-RPC
 */
class UIBackendBridgeImpl implements UIBackendBridge {
  private eventSource: EventEmitter;
  private connected: boolean = false;
  private handlers: Map<string, Set<Function>> = new Map();

  async connect(): Promise<void> {
    if (this.connected) return;

    // In Electron: use IPC
    // In web: use WebSocket
    this.eventSource = new EventEmitter();
    this.connected = true;

    // Set up event forwarding
    this.setupEventForwarding();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
    this.eventSource.removeAllListeners();
  }

  subscribe<T extends keyof NexusEvents>(
    event: T,
    handler: (data: NexusEvents[T]) => void
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  async call<T extends keyof NexusAPI>(
    method: T,
    params: Parameters<NexusAPI[T]>[0]
  ): Promise<ReturnType<NexusAPI[T]>> {
    // JSON-RPC style call
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };

    // In Electron: use IPC
    // In web: use fetch/WebSocket
    const response = await this.sendRequest(request);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  private setupEventForwarding(): void {
    // Forward all events to subscribed handlers
    this.eventSource.on('*', (event: string, data: any) => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    });
  }
}
```

**Error Handling:**
- Reconnect on connection loss
- Queue messages during disconnection
- Clear error state on reconnection
- Type-safe event handling

**Estimated Lines of Code:** 200-250

---

#### Memory-Persistence Bridge

**Purpose:** Connect memory system with persistence layer for durable storage.

```typescript
/**
 * Memory-Persistence Bridge
 * Syncs memory system with persistent storage
 */
interface MemoryPersistenceBridge {
  /**
   * Initialize memory from persistent storage
   */
  initialize(): Promise<void>;

  /**
   * Persist memory changes
   */
  persist(episodes: Episode[]): Promise<void>;

  /**
   * Load episodes matching criteria
   */
  load(criteria: EpisodeCriteria): Promise<Episode[]>;

  /**
   * Sync in-memory state with storage
   */
  sync(): Promise<SyncResult>;
}

/**
 * Implementation
 */
class MemoryPersistenceBridgeImpl implements MemoryPersistenceBridge {
  private db: Database;
  private inMemoryCache: Map<string, Episode> = new Map();
  private dirty: Set<string> = new Set();

  constructor(db: Database) {
    this.db = db;
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(type);
      CREATE INDEX IF NOT EXISTS idx_episodes_created ON episodes(created_at);
    `);
  }

  async initialize(): Promise<void> {
    // Load recent episodes into cache
    const recentEpisodes = this.db.prepare(`
      SELECT * FROM episodes
      ORDER BY created_at DESC
      LIMIT 1000
    `).all();

    for (const row of recentEpisodes) {
      const episode = this.rowToEpisode(row);
      this.inMemoryCache.set(episode.id, episode);
    }
  }

  async persist(episodes: Episode[]): Promise<void> {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO episodes (id, type, content, context, embedding, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((eps: Episode[]) => {
      for (const episode of eps) {
        insert.run(
          episode.id,
          episode.type,
          episode.content,
          JSON.stringify(episode.context),
          episode.embedding ? Buffer.from(new Float32Array(episode.embedding).buffer) : null,
          episode.createdAt.getTime(),
          Date.now()
        );
        this.inMemoryCache.set(episode.id, episode);
        this.dirty.delete(episode.id);
      }
    });

    transaction(episodes);
  }

  async load(criteria: EpisodeCriteria): Promise<Episode[]> {
    let query = 'SELECT * FROM episodes WHERE 1=1';
    const params: any[] = [];

    if (criteria.type) {
      query += ' AND type = ?';
      params.push(criteria.type);
    }

    if (criteria.since) {
      query += ' AND created_at > ?';
      params.push(criteria.since.getTime());
    }

    if (criteria.limit) {
      query += ' LIMIT ?';
      params.push(criteria.limit);
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map(row => this.rowToEpisode(row));
  }

  async sync(): Promise<SyncResult> {
    const dirtyEpisodes = Array.from(this.dirty)
      .map(id => this.inMemoryCache.get(id))
      .filter((e): e is Episode => e !== undefined);

    await this.persist(dirtyEpisodes);

    return {
      persisted: dirtyEpisodes.length,
      cached: this.inMemoryCache.size,
    };
  }

  private rowToEpisode(row: any): Episode {
    return {
      id: row.id,
      type: row.type as EpisodeType,
      content: row.content,
      context: row.context ? JSON.parse(row.context) : {},
      embedding: row.embedding
        ? Array.from(new Float32Array(row.embedding.buffer))
        : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
```

**Error Handling:**
- Retry on transient database errors
- Fallback to file-based storage if SQLite fails
- Log all persistence errors
- Periodic sync to prevent data loss

**Estimated Lines of Code:** 200-250

---

### Bridge Summary Table

| Bridge | Purpose | From | To | Complexity | LOC |
|--------|---------|------|------|------------|-----|
| **AgentWorktreeBridge** | Agent isolation | Orchestration | Infrastructure | MEDIUM | 200-250 |
| **PlanningExecutionBridge** | Task flow | Planning | Execution | MEDIUM | 250-300 |
| **UIBackendBridge** | Frontend-Backend | UI | Orchestration | MEDIUM | 200-250 |
| **MemoryPersistenceBridge** | Durable memory | Memory | Persistence | MEDIUM | 200-250 |

**Total Bridge Lines:** ~850-1,050

---

### Part D: Event System

This section defines the event-driven communication system for loose coupling between components.

---

#### Event Types

```typescript
/**
 * Nexus Event System
 * Central event bus for cross-layer communication
 */

// ============================================================================
// PROJECT EVENTS
// ============================================================================

enum ProjectEvent {
  CREATED = 'project.created',
  UPDATED = 'project.updated',
  PAUSED = 'project.paused',
  RESUMED = 'project.resumed',
  COMPLETED = 'project.completed',
  FAILED = 'project.failed',
}

interface ProjectEventPayloads {
  [ProjectEvent.CREATED]: { project: Project; mode: 'genesis' | 'evolution' };
  [ProjectEvent.UPDATED]: { projectId: string; changes: Partial<Project> };
  [ProjectEvent.PAUSED]: { projectId: string; reason?: string };
  [ProjectEvent.RESUMED]: { projectId: string };
  [ProjectEvent.COMPLETED]: { projectId: string; summary: ProjectSummary };
  [ProjectEvent.FAILED]: { projectId: string; error: Error };
}

// ============================================================================
// TASK EVENTS
// ============================================================================

enum TaskEvent {
  CREATED = 'task.created',
  QUEUED = 'task.queued',
  ASSIGNED = 'task.assigned',
  STARTED = 'task.started',
  PROGRESS = 'task.progress',
  COMPLETED = 'task.completed',
  FAILED = 'task.failed',
  RETRYING = 'task.retrying',
}

interface TaskEventPayloads {
  [TaskEvent.CREATED]: { task: NexusTask };
  [TaskEvent.QUEUED]: { taskId: string; position: number };
  [TaskEvent.ASSIGNED]: { taskId: string; agentId: string };
  [TaskEvent.STARTED]: { taskId: string; agentId: string; worktree: string };
  [TaskEvent.PROGRESS]: { taskId: string; progress: number; message?: string };
  [TaskEvent.COMPLETED]: { taskId: string; result: TaskResult };
  [TaskEvent.FAILED]: { taskId: string; error: Error; retryable: boolean };
  [TaskEvent.RETRYING]: { taskId: string; attempt: number; maxAttempts: number };
}

// ============================================================================
// AGENT EVENTS
// ============================================================================

enum AgentEvent {
  SPAWNED = 'agent.spawned',
  READY = 'agent.ready',
  WORKING = 'agent.working',
  IDLE = 'agent.idle',
  ERROR = 'agent.error',
  TERMINATED = 'agent.terminated',
}

interface AgentEventPayloads {
  [AgentEvent.SPAWNED]: { agentId: string; type: AgentType; model: string };
  [AgentEvent.READY]: { agentId: string };
  [AgentEvent.WORKING]: { agentId: string; taskId: string };
  [AgentEvent.IDLE]: { agentId: string; lastTaskId?: string };
  [AgentEvent.ERROR]: { agentId: string; error: Error };
  [AgentEvent.TERMINATED]: { agentId: string; reason: 'complete' | 'error' | 'manual' };
}

// ============================================================================
// QA LOOP EVENTS
// ============================================================================

enum QAEvent {
  STARTED = 'qa.started',
  ITERATION = 'qa.iteration',
  BUILD_PASSED = 'qa.build.passed',
  BUILD_FAILED = 'qa.build.failed',
  LINT_PASSED = 'qa.lint.passed',
  LINT_FAILED = 'qa.lint.failed',
  TESTS_PASSED = 'qa.tests.passed',
  TESTS_FAILED = 'qa.tests.failed',
  REVIEW_PASSED = 'qa.review.passed',
  REVIEW_FAILED = 'qa.review.failed',
  COMPLETED = 'qa.completed',
  ESCALATED = 'qa.escalated',
}

interface QAEventPayloads {
  [QAEvent.STARTED]: { taskId: string; maxIterations: number };
  [QAEvent.ITERATION]: { taskId: string; iteration: number; phase: string };
  [QAEvent.BUILD_PASSED]: { taskId: string };
  [QAEvent.BUILD_FAILED]: { taskId: string; errors: BuildError[] };
  [QAEvent.LINT_PASSED]: { taskId: string };
  [QAEvent.LINT_FAILED]: { taskId: string; issues: LintIssue[] };
  [QAEvent.TESTS_PASSED]: { taskId: string; coverage: number };
  [QAEvent.TESTS_FAILED]: { taskId: string; failures: TestFailure[] };
  [QAEvent.REVIEW_PASSED]: { taskId: string };
  [QAEvent.REVIEW_FAILED]: { taskId: string; issues: ReviewIssue[] };
  [QAEvent.COMPLETED]: { taskId: string; iterations: number; success: boolean };
  [QAEvent.ESCALATED]: { taskId: string; iterations: number; errors: QAError[] };
}

// ============================================================================
// GIT EVENTS
// ============================================================================

enum GitEvent {
  WORKTREE_CREATED = 'git.worktree.created',
  WORKTREE_REMOVED = 'git.worktree.removed',
  COMMIT = 'git.commit',
  MERGE_STARTED = 'git.merge.started',
  MERGE_COMPLETED = 'git.merge.completed',
  MERGE_CONFLICT = 'git.merge.conflict',
  CONFLICT_RESOLVED = 'git.conflict.resolved',
}

interface GitEventPayloads {
  [GitEvent.WORKTREE_CREATED]: { path: string; branch: string; agentId: string };
  [GitEvent.WORKTREE_REMOVED]: { path: string };
  [GitEvent.COMMIT]: { hash: string; message: string; files: string[] };
  [GitEvent.MERGE_STARTED]: { source: string; target: string };
  [GitEvent.MERGE_COMPLETED]: { source: string; target: string; commitHash: string };
  [GitEvent.MERGE_CONFLICT]: { source: string; target: string; conflicts: ConflictInfo[] };
  [GitEvent.CONFLICT_RESOLVED]: { source: string; target: string; resolution: string };
}

// ============================================================================
// CHECKPOINT EVENTS
// ============================================================================

enum CheckpointEvent {
  CREATED = 'checkpoint.created',
  REVIEW_REQUESTED = 'checkpoint.review.requested',
  APPROVED = 'checkpoint.approved',
  CHANGES_REQUESTED = 'checkpoint.changes.requested',
  TIMEOUT = 'checkpoint.timeout',
}

interface CheckpointEventPayloads {
  [CheckpointEvent.CREATED]: { checkpointId: string; taskId: string; state: NexusState };
  [CheckpointEvent.REVIEW_REQUESTED]: { checkpointId: string; changes: CodeChanges };
  [CheckpointEvent.APPROVED]: { checkpointId: string; reviewerId: string };
  [CheckpointEvent.CHANGES_REQUESTED]: { checkpointId: string; feedback: string };
  [CheckpointEvent.TIMEOUT]: { checkpointId: string; waitedMs: number };
}

// ============================================================================
// MEMORY EVENTS
// ============================================================================

enum MemoryEvent {
  EPISODE_STORED = 'memory.episode.stored',
  PATTERN_LEARNED = 'memory.pattern.learned',
  GOTCHA_RECORDED = 'memory.gotcha.recorded',
  DECISION_RECORDED = 'memory.decision.recorded',
  MEMORY_SYNCED = 'memory.synced',
}

interface MemoryEventPayloads {
  [MemoryEvent.EPISODE_STORED]: { episodeId: string; type: EpisodeType };
  [MemoryEvent.PATTERN_LEARNED]: { pattern: string; context: string };
  [MemoryEvent.GOTCHA_RECORDED]: { gotcha: string; context: string };
  [MemoryEvent.DECISION_RECORDED]: { decision: string; rationale: string };
  [MemoryEvent.MEMORY_SYNCED]: { episodesCount: number };
}
```

---

#### Event Handlers

```typescript
/**
 * Event Handler Registration
 * Defines which components handle which events
 */

interface EventHandlerRegistry {
  // UI Layer handlers
  ui: {
    [ProjectEvent.UPDATED]: UpdateProjectDisplay;
    [TaskEvent.PROGRESS]: UpdateTaskProgress;
    [AgentEvent.WORKING]: UpdateAgentStatus;
    [QAEvent.ITERATION]: UpdateQAProgress;
    [CheckpointEvent.REVIEW_REQUESTED]: ShowReviewDialog;
  };

  // Persistence Layer handlers
  persistence: {
    [ProjectEvent.CREATED]: PersistProjectState;
    [ProjectEvent.UPDATED]: UpdateProjectState;
    [TaskEvent.COMPLETED]: PersistTaskResult;
    [CheckpointEvent.CREATED]: PersistCheckpoint;
    [MemoryEvent.EPISODE_STORED]: PersistEpisode;
  };

  // Orchestration Layer handlers
  orchestration: {
    [TaskEvent.COMPLETED]: AssignNextTask;
    [TaskEvent.FAILED]: HandleTaskFailure;
    [AgentEvent.IDLE]: ReturnAgentToPool;
    [QAEvent.ESCALATED]: TriggerHumanReview;
    [GitEvent.MERGE_CONFLICT]: SpawnMergerAgent;
  };

  // Metrics handlers
  metrics: {
    [TaskEvent.COMPLETED]: RecordTaskMetrics;
    [QAEvent.COMPLETED]: RecordQAMetrics;
    [AgentEvent.TERMINATED]: RecordAgentMetrics;
  };
}

/**
 * Event Bus Implementation
 */
class NexusEventBus {
  private emitter: EventEmitter;
  private handlers: Map<string, Set<EventHandler>>;
  private history: EventRecord[];
  private maxHistory: number = 1000;

  constructor() {
    this.emitter = new EventEmitter();
    this.handlers = new Map();
    this.history = [];
  }

  /**
   * Emit an event
   */
  emit<E extends NexusEventType>(event: E, payload: NexusEventPayload<E>): void {
    const record: EventRecord = {
      event,
      payload,
      timestamp: new Date(),
    };

    // Add to history
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit to all handlers
    this.emitter.emit(event, payload);
    this.emitter.emit('*', event, payload); // Wildcard for logging
  }

  /**
   * Subscribe to an event
   */
  on<E extends NexusEventType>(
    event: E,
    handler: (payload: NexusEventPayload<E>) => void
  ): Unsubscribe {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: (event: string, payload: any) => void): Unsubscribe {
    this.emitter.on('*', handler);
    return () => this.emitter.off('*', handler);
  }

  /**
   * Get event history
   */
  getHistory(filter?: { event?: string; since?: Date }): EventRecord[] {
    let result = this.history;

    if (filter?.event) {
      result = result.filter(r => r.event === filter.event);
    }

    if (filter?.since) {
      result = result.filter(r => r.timestamp >= filter.since!);
    }

    return result;
  }
}
```

---

#### Event Flow Diagram

```
+==============================================================================+
|                           NEXUS EVENT FLOW                                    |
+==============================================================================+

                         ┌─────────────────────────────────────┐
                         │            EVENT BUS                │
                         │  (Central Event Distribution)       │
                         └──────────────────┬──────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │   UI LAYER      │          │ ORCHESTRATION   │          │  PERSISTENCE    │
    │   HANDLERS      │          │   HANDLERS      │          │   HANDLERS      │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             ▼                            ▼                            ▼
   ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
   │ Update UI State  │        │ Coordinate Agents│        │ Persist State    │
   │ Show Notifications│        │ Manage Tasks     │        │ Store Metrics    │
   │ Refresh Dashboard │        │ Handle Failures  │        │ Save Checkpoints │
   └──────────────────┘        └──────────────────┘        └──────────────────┘


EXAMPLE: Task Completion Flow
==============================

  TASK_COMPLETED event
        │
        ├───────────────────► UI Layer
        │                     └── UpdateTaskProgress()
        │                     └── UpdateProgressBar()
        │                     └── ShowSuccessToast()
        │
        ├───────────────────► Orchestration Layer
        │                     └── AssignNextTask()
        │                     └── CheckWaveCompletion()
        │                     └── UpdateAgentStatus()
        │
        ├───────────────────► Persistence Layer
        │                     └── PersistTaskResult()
        │                     └── UpdateSTATE.md()
        │
        └───────────────────► Metrics Layer
                              └── RecordTaskDuration()
                              └── UpdateVelocity()
                              └── IncrementCompletedCount()


EXAMPLE: QA Escalation Flow
============================

  QA_ESCALATED event
        │
        ├───────────────────► UI Layer
        │                     └── ShowEscalationDialog()
        │                     └── DisplayErrors()
        │                     └── EnableHumanIntervention()
        │
        ├───────────────────► Orchestration Layer
        │                     └── PauseTaskExecution()
        │                     └── PreserveWorktreeState()
        │                     └── NotifyOnCall() [if configured]
        │
        ├───────────────────► Persistence Layer
        │                     └── SaveEscalationState()
        │                     └── LogEscalationDetails()
        │
        └───────────────────► Metrics Layer
                              └── RecordEscalation()
                              └── UpdateEscalationRate()


EXAMPLE: Merge Conflict Flow
=============================

  MERGE_CONFLICT event
        │
        ├───────────────────► UI Layer
        │                     └── ShowConflictIndicator()
        │                     └── UpdateAgentStatus("resolving")
        │
        ├───────────────────► Orchestration Layer
        │                     └── SpawnMergerAgent()
        │                     └── ProvideConflictContext()
        │                     └── MonitorResolution()
        │
        └───────────────────► Persistence Layer
                              └── SaveConflictState()
                              └── LogConflictDetails()
```

---

### Part E: API Design

This section defines the internal APIs for each layer.

---

#### Orchestration API

```typescript
/**
 * Orchestration API
 * Main entry point for controlling Nexus execution
 */
interface OrchestrationAPI {
  // =========================================================================
  // PROJECT LIFECYCLE
  // =========================================================================

  /**
   * Start a new project in Genesis or Evolution mode
   */
  startProject(config: ProjectConfig): Promise<Project>;

  /**
   * Pause project execution (preserves state)
   */
  pauseProject(projectId: string): Promise<void>;

  /**
   * Resume paused project from last checkpoint
   */
  resumeProject(projectId: string): Promise<void>;

  /**
   * Cancel project (cleanup resources)
   */
  cancelProject(projectId: string): Promise<void>;

  /**
   * Get project status
   */
  getProjectStatus(projectId: string): Promise<ProjectStatus>;

  // =========================================================================
  // EXECUTION CONTROL
  // =========================================================================

  /**
   * Trigger execution of a specific feature
   */
  executeFeature(featureId: string): Promise<ExecutionHandle>;

  /**
   * Execute next available task wave
   */
  executeNextWave(projectId: string): Promise<TaskWave>;

  /**
   * Request checkpoint (pause for human review)
   */
  requestCheckpoint(projectId: string): Promise<Checkpoint>;

  /**
   * Create recovery checkpoint
   */
  createRecoveryPoint(projectId: string): Promise<RecoveryPoint>;

  // =========================================================================
  // AGENT MANAGEMENT
  // =========================================================================

  /**
   * Get all active agent statuses
   */
  getAgentStatuses(): Promise<AgentStatus[]>;

  /**
   * Force terminate an agent
   */
  terminateAgent(agentId: string, reason: string): Promise<void>;

  /**
   * Adjust agent pool size
   */
  setAgentPoolSize(config: AgentPoolConfig): Promise<void>;

  // =========================================================================
  // EVENT SUBSCRIPTIONS
  // =========================================================================

  /**
   * Subscribe to all events
   */
  subscribeToEvents(callback: (event: NexusEvent) => void): Unsubscribe;

  /**
   * Subscribe to specific event type
   */
  subscribeToEvent<E extends NexusEventType>(
    event: E,
    callback: (payload: NexusEventPayload<E>) => void
  ): Unsubscribe;
}

/**
 * Project Configuration
 */
interface ProjectConfig {
  name: string;
  mode: 'genesis' | 'evolution';
  basePath: string;

  // Genesis mode
  requirements?: RequirementsDatabase;

  // Evolution mode
  existingProject?: boolean;
  featuresFile?: string;

  // Execution settings
  maxParallelAgents?: number;      // Default: 3
  maxQAIterations?: number;        // Default: 50
  autoMerge?: boolean;             // Default: true
  costLimit?: number;              // Maximum spend in USD
}

/**
 * Project Status
 */
interface ProjectStatus {
  id: string;
  name: string;
  mode: 'genesis' | 'evolution';
  phase: 'planning' | 'executing' | 'reviewing' | 'complete' | 'paused' | 'failed';
  progress: {
    featuresTotal: number;
    featuresComplete: number;
    tasksTotal: number;
    tasksComplete: number;
    percentage: number;
  };
  currentWave: number;
  activeAgents: number;
  lastActivity: Date;
  estimatedCompletion?: Date;
  costs: {
    estimated: { min: number; max: number };
    actual: number;
  };
}
```

---

#### Planning API

```typescript
/**
 * Planning API
 * Task decomposition and dependency management
 */
interface PlanningAPI {
  // =========================================================================
  // DECOMPOSITION
  // =========================================================================

  /**
   * Decompose a feature into sub-features and tasks
   */
  decomposeFeature(feature: NexusFeature): Promise<NexusPlan>;

  /**
   * Decompose requirements database into full project plan
   */
  decomposeRequirements(requirements: RequirementsDatabase): Promise<NexusPlan>;

  /**
   * Re-decompose a task that was too large
   */
  splitTask(taskId: string): Promise<NexusTask[]>;

  // =========================================================================
  // DEPENDENCY RESOLUTION
  // =========================================================================

  /**
   * Resolve and validate task dependencies
   */
  resolveDependencies(tasks: NexusTask[]): Promise<ResolvedPlan>;

  /**
   * Calculate parallel execution waves
   */
  calculateWaves(tasks: NexusTask[]): Promise<TaskWave[]>;

  /**
   * Detect dependency cycles
   */
  detectCycles(tasks: NexusTask[]): CycleReport;

  // =========================================================================
  // ESTIMATION
  // =========================================================================

  /**
   * Estimate task duration
   */
  estimateTaskTime(task: NexusTask): Promise<TimeEstimate>;

  /**
   * Estimate feature scope
   */
  estimateFeatureScope(feature: NexusFeature): Promise<ScopeEstimate>;

  /**
   * Estimate project scope from requirements
   */
  estimateProjectScope(requirements: RequirementsDatabase): Promise<ProjectScopeEstimate>;

  // =========================================================================
  // VALIDATION
  // =========================================================================

  /**
   * Validate task meets size requirements
   */
  validateTaskSize(task: NexusTask): TaskSizeValidation;

  /**
   * Validate plan structure
   */
  validatePlan(plan: NexusPlan): PlanValidation;
}

/**
 * Nexus Plan
 */
interface NexusPlan {
  id: string;
  featureId: string;
  tasks: NexusTask[];
  waves: TaskWave[];
  metadata: {
    createdAt: Date;
    totalTasks: number;
    estimatedDuration: number;
    estimatedCost: { min: number; max: number };
    complexity: 'simple' | 'medium' | 'complex' | 'epic';
  };
}

/**
 * Resolved Plan (with dependencies verified)
 */
interface ResolvedPlan extends NexusPlan {
  dependencyGraph: DependencyGraph;
  criticalPath: NexusTask[];
  parallelizationFactor: number;
}

/**
 * Task Wave
 */
interface TaskWave {
  waveNumber: number;
  tasks: NexusTask[];
  canExecuteInParallel: boolean;
  estimatedDuration: number;
  dependencies: string[]; // Wave dependencies
}
```

---

#### Execution API

```typescript
/**
 * Execution API
 * Task execution and QA loop management
 */
interface ExecutionAPI {
  // =========================================================================
  // TASK EXECUTION
  // =========================================================================

  /**
   * Execute a single task
   */
  executeTask(task: NexusTask): Promise<TaskResult>;

  /**
   * Execute a wave of tasks in parallel
   */
  executeWave(wave: TaskWave): Promise<WaveResult>;

  /**
   * Cancel task execution
   */
  cancelTask(taskId: string): Promise<void>;

  // =========================================================================
  // QA LOOP
  // =========================================================================

  /**
   * Run full QA loop on code changes
   */
  runQALoop(taskId: string, changes: CodeChanges): Promise<QALoopResult>;

  /**
   * Get current QA loop status
   */
  getQAStatus(taskId: string): QALoopStatus;

  /**
   * Skip to next QA phase
   */
  skipQAPhase(taskId: string, phase: QAPhase): Promise<void>;

  // =========================================================================
  // TOOL EXECUTION
  // =========================================================================

  /**
   * Run CLI command
   */
  runCommand(command: string, options?: CommandOptions): Promise<CommandResult>;

  /**
   * Run build
   */
  runBuild(options?: BuildOptions): Promise<BuildResult>;

  /**
   * Run tests
   */
  runTests(pattern?: string): Promise<TestResult>;

  /**
   * Run linter
   */
  runLint(fix?: boolean): Promise<LintResult>;

  // =========================================================================
  // REVIEW
  // =========================================================================

  /**
   * Request code review from Reviewer agent
   */
  requestReview(changes: CodeChanges): Promise<ReviewRequest>;

  /**
   * Get review result
   */
  getReviewResult(reviewId: string): Promise<ReviewResult>;

  /**
   * Submit human review decision
   */
  submitHumanReview(reviewId: string, decision: ReviewDecision): Promise<void>;
}

/**
 * Task Result
 */
interface TaskResult {
  taskId: string;
  success: boolean;
  files: {
    created: string[];
    modified: string[];
    deleted: string[];
  };
  tests: {
    passed: number;
    failed: number;
    skipped: number;
  };
  duration: number;
  iterations: number;
  cost: number;
  errors?: TaskError[];
}

/**
 * QA Loop Result
 */
interface QALoopResult {
  taskId: string;
  success: boolean;
  finalStatus: 'passed' | 'failed' | 'escalated';
  iterations: number;
  phases: {
    build: PhaseResult;
    lint: PhaseResult;
    test: PhaseResult;
    review: PhaseResult;
  };
  duration: number;
  humanEscalated: boolean;
}
```

---

#### Persistence API

```typescript
/**
 * Persistence API
 * State management and storage
 */
interface PersistenceAPI {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  /**
   * Save current project state
   */
  saveState(state: NexusState): Promise<void>;

  /**
   * Load project state
   */
  loadState(projectId: string): Promise<NexusState>;

  /**
   * Get state history
   */
  getStateHistory(projectId: string, limit?: number): Promise<StateSnapshot[]>;

  // =========================================================================
  // CHECKPOINTS
  // =========================================================================

  /**
   * Create checkpoint
   */
  createCheckpoint(state: NexusState): Promise<Checkpoint>;

  /**
   * List checkpoints
   */
  listCheckpoints(projectId: string): Promise<Checkpoint[]>;

  /**
   * Restore from checkpoint
   */
  restoreCheckpoint(checkpointId: string): Promise<NexusState>;

  /**
   * Delete checkpoint
   */
  deleteCheckpoint(checkpointId: string): Promise<void>;

  // =========================================================================
  // REQUIREMENTS
  // =========================================================================

  /**
   * Save requirements database
   */
  saveRequirements(requirements: RequirementsDatabase): Promise<void>;

  /**
   * Load requirements database
   */
  loadRequirements(projectId: string): Promise<RequirementsDatabase>;

  /**
   * Update requirements
   */
  updateRequirements(
    projectId: string,
    updates: Partial<RequirementsDatabase>
  ): Promise<RequirementsDatabase>;

  // =========================================================================
  // MEMORY
  // =========================================================================

  /**
   * Store episode
   */
  storeEpisode(episode: Episode): Promise<void>;

  /**
   * Query episodes
   */
  queryEpisodes(query: EpisodeQuery): Promise<Episode[]>;

  /**
   * Get episode by ID
   */
  getEpisode(episodeId: string): Promise<Episode>;

  // =========================================================================
  // METRICS
  // =========================================================================

  /**
   * Record metric
   */
  recordMetric(metric: MetricRecord): Promise<void>;

  /**
   * Get metrics
   */
  getMetrics(query: MetricQuery): Promise<MetricRecord[]>;

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(projectId: string): Promise<AggregateMetrics>;
}
```

---

### Part F: Integration Testing Strategy

This section defines how integrations are tested.

---

#### Unit Integration Tests

```typescript
/**
 * Unit Integration Test Categories
 */

// ============================================================================
// ADAPTER TESTS
// ============================================================================

describe('StateFormatAdapter', () => {
  it('should parse valid STATE.md content', () => {
    const content = `# Project State
## Current Position
Phase: 2 of 4 (Authentication)
Plan: 1 of 3 in current phase
Progress: ████████░░ 80%`;

    const result = adapter.fromGSDState(content);

    expect(result.currentPhase.index).toBe(2);
    expect(result.currentPhase.total).toBe(4);
    expect(result.progress).toBe(80);
  });

  it('should generate valid STATE.md from NexusState', () => {
    const state: NexusState = {
      currentPhase: { index: 2, total: 4, name: 'Authentication' },
      currentPlan: { index: 1, total: 3 },
      progress: 80,
      decisions: [],
      metrics: { totalPlans: 5, averageDuration: 8.5, successRate: 0.95 },
      lastUpdated: new Date(),
    };

    const result = adapter.toGSDState(state);

    expect(result).toContain('Phase: 2 of 4 (Authentication)');
    expect(result).toContain('████████░░ 80%');
  });

  it('should handle malformed STATE.md gracefully', () => {
    const malformed = 'Invalid content';

    const result = adapter.fromGSDState(malformed);

    expect(result).toBeDefined();
    expect(result.currentPhase.index).toBe(0);
  });
});

describe('TaskSchemaAdapter', () => {
  it('should convert GSD task to Nexus task', () => {
    const gsdTask: GSDTask = {
      type: 'auto',
      tdd: true,
      action: 'Create user registration form in src/components/Register.tsx',
      done: 'Form renders with email and password fields',
    };

    const result = adapter.convert(gsdTask, { featureId: 'F001', subFeatureId: 'A' });

    expect(result.id).toMatch(/^F001-A-\d{2}$/);
    expect(result.tdd).toBe(true);
    expect(result.files).toContain('src/components/Register.tsx');
    expect(result.timeEstimate).toBeLessThanOrEqual(30);
  });

  it('should extract files from action text', () => {
    const action = 'Update styles in `src/styles/main.css` and `src/components/App.tsx`';

    const files = adapter['extractFiles'](action);

    expect(files).toContain('src/styles/main.css');
    expect(files).toContain('src/components/App.tsx');
  });
});

describe('RateLimitWrapper', () => {
  it('should queue requests when limit reached', async () => {
    const wrapper = new RateLimitWrapperImpl();
    const calls: number[] = [];

    // Simulate rapid requests
    const promises = Array(10).fill(null).map((_, i) =>
      wrapper.execute('claude', async () => {
        calls.push(i);
        return i;
      })
    );

    await Promise.all(promises);

    // All calls should complete
    expect(calls.length).toBe(10);
  });

  it('should retry on rate limit error', async () => {
    const wrapper = new RateLimitWrapperImpl();
    let attempts = 0;

    const result = await wrapper.execute('claude', async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('429 rate limit exceeded');
      }
      return 'success';
    });

    expect(attempts).toBe(3);
    expect(result).toBe('success');
  });
});

// ============================================================================
// BRIDGE TESTS
// ============================================================================

describe('AgentWorktreeBridge', () => {
  it('should create worktree when spawning agent', async () => {
    const bridge = new AgentWorktreeBridgeImpl(mockWorktreeManager, mockAgentPool);
    const task: NexusTask = createMockTask();

    const handle = await bridge.spawnWithWorktree(task, 'coder');

    expect(mockWorktreeManager.create).toHaveBeenCalled();
    expect(handle.worktreePath).toBeDefined();
    expect(handle.status).toBe('active');
  });

  it('should cleanup worktree after successful merge', async () => {
    const bridge = new AgentWorktreeBridgeImpl(mockWorktreeManager, mockAgentPool);
    const handle = await bridge.spawnWithWorktree(createMockTask(), 'coder');

    mockWorktreeManager.merge.mockResolvedValue({ success: true });

    await bridge.mergeAndCleanup(handle);

    expect(mockWorktreeManager.remove).toHaveBeenCalledWith(handle.worktreePath);
    expect(handle.status).toBe('complete');
  });

  it('should escalate to Merger Agent on conflict', async () => {
    const bridge = new AgentWorktreeBridgeImpl(mockWorktreeManager, mockAgentPool);
    const handle = await bridge.spawnWithWorktree(createMockTask(), 'coder');

    mockWorktreeManager.merge.mockResolvedValue({
      success: false,
      conflicts: [{ file: 'src/index.ts', type: 'both_modified' }],
    });

    await bridge.mergeAndCleanup(handle);

    expect(mockAgentPool.spawn).toHaveBeenCalledWith('merger', expect.anything());
  });
});

describe('PlanningExecutionBridge', () => {
  it('should calculate parallel waves correctly', async () => {
    const bridge = new PlanningExecutionBridgeImpl(mockTaskQueue, mockEventBus);
    const tasks: NexusTask[] = [
      createMockTask({ id: 'T1', dependsOn: [] }),
      createMockTask({ id: 'T2', dependsOn: [] }),
      createMockTask({ id: 'T3', dependsOn: ['T1', 'T2'] }),
    ];

    const plan: NexusPlan = { id: 'P1', tasks, waves: [], metadata: {} as any };
    const handle = await bridge.submitPlan(plan);

    const wave1 = await bridge.getNextWave(handle.id);

    expect(wave1?.tasks.map(t => t.id)).toEqual(expect.arrayContaining(['T1', 'T2']));
    expect(wave1?.tasks.length).toBe(2);
  });

  it('should detect cycles in dependencies', () => {
    const bridge = new PlanningExecutionBridgeImpl(mockTaskQueue, mockEventBus);
    const tasks: NexusTask[] = [
      createMockTask({ id: 'T1', dependsOn: ['T3'] }),
      createMockTask({ id: 'T2', dependsOn: ['T1'] }),
      createMockTask({ id: 'T3', dependsOn: ['T2'] }),
    ];

    expect(() => bridge['calculateWaves'](tasks)).toThrow('Cycle detected');
  });
});
```

---

#### Flow Integration Tests

```typescript
/**
 * Flow Integration Tests
 * End-to-end workflow testing
 */

describe('Genesis Mode Flow', () => {
  let orchestrator: OrchestrationAPI;
  let persistence: PersistenceAPI;

  beforeAll(async () => {
    orchestrator = createTestOrchestrator();
    persistence = createTestPersistence();
  });

  it('should complete full Genesis Mode workflow', async () => {
    // 1. Start project
    const project = await orchestrator.startProject({
      name: 'Test Project',
      mode: 'genesis',
      basePath: '/tmp/test-project',
      requirements: createMockRequirements(),
    });

    expect(project.id).toBeDefined();

    // 2. Wait for planning to complete
    await waitForEvent('plan.completed');

    const status = await orchestrator.getProjectStatus(project.id);
    expect(status.phase).toBe('executing');

    // 3. Execute waves
    let wave = await orchestrator.executeNextWave(project.id);
    while (wave) {
      await waitForEvent('wave.completed');
      wave = await orchestrator.executeNextWave(project.id);
    }

    // 4. Verify completion
    const finalStatus = await orchestrator.getProjectStatus(project.id);
    expect(finalStatus.phase).toBe('complete');
    expect(finalStatus.progress.percentage).toBe(100);

    // 5. Verify persistence
    const state = await persistence.loadState(project.id);
    expect(state).toBeDefined();
  }, 60000); // 60 second timeout
});

describe('Evolution Mode Flow', () => {
  it('should execute feature from Kanban drag', async () => {
    // 1. Load existing project
    const project = await orchestrator.startProject({
      name: 'Existing Project',
      mode: 'evolution',
      basePath: '/tmp/existing-project',
      existingProject: true,
    });

    // 2. Get features
    const features = await orchestrator.getFeatures(project.id);
    const feature = features.find(f => f.status === 'backlog');

    // 3. Trigger execution (simulating drag to "In Progress")
    const handle = await orchestrator.executeFeature(feature!.id);

    expect(handle.status).toBe('executing');

    // 4. Wait for completion
    await waitForEvent('feature.completed');

    // 5. Verify feature moved to "Done"
    const updatedFeatures = await orchestrator.getFeatures(project.id);
    const completedFeature = updatedFeatures.find(f => f.id === feature!.id);

    expect(completedFeature?.status).toBe('done');
  });
});

describe('QA Loop Flow', () => {
  it('should complete QA loop with self-healing', async () => {
    const executionAPI = createTestExecutionAPI();

    // Mock: First build fails, second passes
    mockBuildRunner
      .mockResolvedValueOnce({ success: false, errors: [{ message: 'Type error' }] })
      .mockResolvedValueOnce({ success: true });

    const result = await executionAPI.runQALoop('task-1', createMockChanges());

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
    expect(result.phases.build).toBeDefined();
  });

  it('should escalate after max iterations', async () => {
    const executionAPI = createTestExecutionAPI();

    // Mock: Build always fails
    mockBuildRunner.mockResolvedValue({
      success: false,
      errors: [{ message: 'Persistent error' }],
    });

    const result = await executionAPI.runQALoop('task-1', createMockChanges());

    expect(result.success).toBe(false);
    expect(result.finalStatus).toBe('escalated');
    expect(result.iterations).toBe(50);
    expect(result.humanEscalated).toBe(true);
  });
});
```

---

#### Chaos Testing

```typescript
/**
 * Chaos Testing
 * Testing system resilience under failure conditions
 */

describe('Chaos: Agent Failures', () => {
  it('should recover when Coder agent crashes', async () => {
    const orchestrator = createTestOrchestrator();

    // Start execution
    const handle = await orchestrator.executeFeature('feature-1');

    // Simulate agent crash
    await simulateAgentCrash('coder-1');

    // System should spawn replacement
    await waitForEvent('agent.spawned');

    // Task should eventually complete
    await waitForEvent('task.completed');

    const status = await orchestrator.getProjectStatus(handle.id);
    expect(status.phase).not.toBe('failed');
  });

  it('should fall back to Claude when Gemini reviewer unavailable', async () => {
    const orchestrator = createTestOrchestrator();

    // Disable Gemini
    mockGeminiClient.throwOnAllCalls(new Error('Service unavailable'));

    // Start execution
    const handle = await orchestrator.executeFeature('feature-1');

    // Wait for review phase
    await waitForEvent('qa.review.started');

    // Should have fallen back to Claude
    const agents = await orchestrator.getAgentStatuses();
    const reviewer = agents.find(a => a.type === 'reviewer');

    expect(reviewer?.model).toContain('claude');
  });
});

describe('Chaos: Network Failures', () => {
  it('should retry API calls with exponential backoff', async () => {
    const executionAPI = createTestExecutionAPI();

    // Simulate network failures then success
    let callCount = 0;
    mockClaudeClient.chat.mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Network timeout');
      }
      return createMockResponse();
    });

    const result = await executionAPI.executeTask(createMockTask());

    expect(callCount).toBe(3);
    expect(result.success).toBe(true);
  });

  it('should preserve state on unexpected shutdown', async () => {
    const orchestrator = createTestOrchestrator();
    const persistence = createTestPersistence();

    // Start execution
    const handle = await orchestrator.executeFeature('feature-1');

    // Wait for some progress
    await waitForEvent('task.completed');

    // Simulate unexpected shutdown
    await simulateShutdown();

    // Restart and resume
    const newOrchestrator = createTestOrchestrator();
    await newOrchestrator.resumeProject(handle.id);

    // Verify state was preserved
    const state = await persistence.loadState(handle.id);
    expect(state.completedTasks.length).toBeGreaterThan(0);
  });
});

describe('Chaos: Resource Exhaustion', () => {
  it('should handle token limit gracefully', async () => {
    const executionAPI = createTestExecutionAPI();

    // Create task with very large context
    const task = createMockTask({
      files: Array(100).fill('large-file.ts'),
    });

    const result = await executionAPI.executeTask(task);

    // Should complete (possibly with reduced context)
    expect(result).toBeDefined();
  });

  it('should respect cost limits', async () => {
    const orchestrator = createTestOrchestrator();

    // Start project with low cost limit
    const project = await orchestrator.startProject({
      name: 'Cost Limited Project',
      mode: 'genesis',
      basePath: '/tmp/test',
      requirements: createMockRequirements(),
      costLimit: 1.00, // $1 limit
    });

    // Execute until cost limit
    try {
      while (true) {
        await orchestrator.executeNextWave(project.id);
      }
    } catch (error) {
      expect((error as Error).message).toContain('cost limit');
    }

    const status = await orchestrator.getProjectStatus(project.id);
    expect(status.costs.actual).toBeLessThanOrEqual(1.00);
  });
});
```

---

### Task 5.4 Completion Checklist

- [x] Feature integration map complete
  - [x] GSD features integration (8 features)
  - [x] Auto-Claude features integration (8 features)
  - [x] OMO features integration (5 features)
  - [x] AutoMaker features integration (3 features)
  - [x] Ralph features integration (6 features)
- [x] All adapter specifications defined
  - [x] StateFormatAdapter
  - [x] AgentContextAdapter
  - [x] TaskSchemaAdapter
  - [x] MemoryQueryAdapter
  - [x] RateLimitWrapper
  - [x] QALoopWrapper
- [x] All bridge specifications defined
  - [x] AgentWorktreeBridge
  - [x] PlanningExecutionBridge
  - [x] UIBackendBridge
  - [x] MemoryPersistenceBridge
- [x] Event system designed
  - [x] Event types (6 categories, 40+ events)
  - [x] Event handlers
  - [x] Event flow diagrams
- [x] Internal APIs defined
  - [x] Orchestration API
  - [x] Planning API
  - [x] Execution API
  - [x] Persistence API
- [x] Integration testing strategy documented
  - [x] Unit integration tests
  - [x] Flow integration tests
  - [x] Chaos testing

**[TASK 5.4 COMPLETE]**

---

## Task 5.5: Technology Decisions

### Objective

Make and document all technology choices for Nexus implementation. This section provides concrete technology decisions with rationale, version specifications, and configuration guidelines.

---

### Part A: Core Technology Stack

#### Runtime Environment

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Runtime** | Node.js | 22.x LTS | Latest LTS with native ESM, improved performance, native fetch API |
| **Platform** | Electron | 33.x | Desktop-first for worktree management, file system access, Git integration |
| **Process Model** | Main + Renderer + Workers | - | Main for orchestration, Renderer for UI, Workers for AI calls |

**Node.js 22.x Benefits:**
- Native ESM support (no transpilation needed for imports)
- Built-in fetch API (no node-fetch dependency)
- Improved garbage collection for long-running processes
- Better TypeScript integration with tsx loader
- Native test runner (backup option)

**Electron 33.x Configuration:**
```typescript
// electron.config.ts
export const electronConfig = {
  main: {
    entry: 'src/main/index.ts',
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  },
  renderer: {
    entry: 'src/renderer/index.tsx',
    preload: 'src/preload/index.ts',
  },
  build: {
    appId: 'com.nexus.ai-builder',
    productName: 'Nexus AI Builder',
    directories: {
      output: 'dist',
      buildResources: 'resources',
    },
  },
};
```

**Process Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXUS PROCESS MODEL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────── MAIN PROCESS ────────────────────────┐    │
│  │  • Orchestration Layer (Layer 2)                            │    │
│  │  • Planning Layer (Layer 3)                                 │    │
│  │  • Persistence Layer (Layer 6)                              │    │
│  │  • Infrastructure Layer (Layer 7)                           │    │
│  │  • IPC Handler for Renderer communication                   │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│            ┌────────────────┼────────────────┐                      │
│            │                │                │                      │
│            ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │
│  │  RENDERER   │  │   WORKER    │  │        WORKER           │    │
│  │  (UI Layer) │  │  (AI Agent) │  │  (Background Tasks)     │    │
│  │             │  │             │  │                         │    │
│  │  React App  │  │  Claude API │  │  Git Operations         │    │
│  │  Layer 1    │  │  Gemini API │  │  File Watching          │    │
│  │             │  │  Layer 4    │  │  Embedding Generation   │    │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### Language & Types

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Language** | TypeScript | 5.4+ | Strict typing, excellent IDE support, required for Nexus complexity |
| **Target** | ES2022 | - | Modern features (top-level await, private fields) |
| **Module** | ESNext | - | Native ES modules throughout |

**TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@nexus/core/*": ["src/core/*"],
      "@nexus/ui/*": ["src/ui/*"],
      "@nexus/orchestration/*": ["src/orchestration/*"],
      "@nexus/planning/*": ["src/planning/*"],
      "@nexus/execution/*": ["src/execution/*"],
      "@nexus/quality/*": ["src/quality/*"],
      "@nexus/persistence/*": ["src/persistence/*"],
      "@nexus/infrastructure/*": ["src/infrastructure/*"],
      "@nexus/shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

**Type Checking Strategy:**
```typescript
// Strict null checks example
function getAgent(id: string): Agent | undefined {
  return agentRegistry.get(id);  // Returns undefined if not found
}

// Usage with null check
const agent = getAgent('coder-1');
if (agent) {
  // TypeScript knows agent is Agent here
  await agent.executeTask(task);
}

// Type guards for runtime safety
function isTaskComplete(task: Task): task is Task & { status: 'completed' } {
  return task.status === 'completed';
}

// Branded types for ID safety
type TaskId = string & { readonly __brand: 'TaskId' };
type AgentId = string & { readonly __brand: 'AgentId' };

function createTaskId(id: string): TaskId {
  return id as TaskId;
}
```

---

#### Package Manager

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Package Manager** | pnpm | 9.x | Fast, disk-efficient, strict dependency resolution |
| **Monorepo** | pnpm workspaces | - | Native workspace support, no Lerna needed |
| **Lock File** | pnpm-lock.yaml | - | Reproducible builds |

**Monorepo Structure:**
```
nexus/
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # Workspace configuration
├── packages/
│   ├── core/                 # @nexus/core - Shared types and utilities
│   │   ├── package.json
│   │   └── src/
│   ├── ui/                   # @nexus/ui - React UI layer
│   │   ├── package.json
│   │   └── src/
│   ├── orchestration/        # @nexus/orchestration - Agent coordination
│   │   ├── package.json
│   │   └── src/
│   ├── planning/             # @nexus/planning - Task decomposition
│   │   ├── package.json
│   │   └── src/
│   ├── execution/            # @nexus/execution - QA loop, tool running
│   │   ├── package.json
│   │   └── src/
│   ├── persistence/          # @nexus/persistence - State, memory, DB
│   │   ├── package.json
│   │   └── src/
│   └── infrastructure/       # @nexus/infrastructure - Git, LSP, tools
│       ├── package.json
│       └── src/
└── apps/
    └── desktop/              # Electron app
        ├── package.json
        └── src/
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Root package.json:**
```json
{
  "name": "nexus",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r clean",
    "desktop": "pnpm --filter @nexus/desktop dev"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^22.0.0"
  }
}
```

---

### Part A Completion

- [x] Runtime Environment documented (Node.js 22.x, Electron 33.x)
- [x] Language & Types documented (TypeScript 5.4+, strict mode)
- [x] Package Manager documented (pnpm 9.x with workspaces)
- [x] Process architecture diagram created
- [x] Configuration examples provided

---

## Part B: Frontend Stack (UI Layer)

### Framework Selection

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **UI Framework** | React | 18.3+ | Industry standard, extensive ecosystem, team familiarity |
| **Meta-Framework** | None (Electron) | - | Desktop app, no SSR needed, direct React rendering |
| **Routing** | React Router | 6.x | Client-side routing within Electron |
| **Data Fetching** | TanStack Query | 5.x | Caching, background sync, optimistic updates |

**React Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXUS UI ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────── ELECTRON MAIN ──────────────────────────────┐│
│  │  [IPC Handler] ──────────────────────────────────► Backend Services     ││
│  └────────────────────────────────┬───────────────────────────────────────┘│
│                                   │                                          │
│                                   │ IPC (contextBridge)                      │
│                                   ▼                                          │
│  ┌─────────────────────────── REACT APP ─────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────────── APP SHELL ─────────────────────────────────┐ │ │
│  │  │  [App.tsx] ─► [RouterProvider] ─► [QueryClientProvider]           │ │ │
│  │  │              ─► [ThemeProvider] ─► [ToastProvider]                │ │ │
│  │  └───────────────────────────┬───────────────────────────────────────┘ │ │
│  │                              │                                          │ │
│  │  ┌───────────────────────────▼───────────────────────────────────────┐ │ │
│  │  │                          PAGES                                     │ │ │
│  │  │                                                                    │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │ │ │
│  │  │  │  Interview  │  │   Kanban    │  │  Dashboard  │  │ Settings │ │ │ │
│  │  │  │    Page     │  │    Page     │  │    Page     │  │   Page   │ │ │ │
│  │  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │ │ │
│  │  │         │                │                │               │       │ │ │
│  │  │         └────────────────┴────────────────┴───────────────┘       │ │ │
│  │  │                                   │                                │ │ │
│  │  │  ┌───────────────────────────────▼────────────────────────────────┐│ │ │
│  │  │  │                       SHARED COMPONENTS                         ││ │ │
│  │  │  │  [Header] [Sidebar] [TaskCard] [FeatureTree] [AgentStatus]     ││ │ │
│  │  │  │  [ProgressBar] [Terminal] [CodeViewer] [FileTree]              ││ │ │
│  │  │  └────────────────────────────────────────────────────────────────┘│ │ │
│  │  │                                                                    │ │ │
│  │  │  ┌───────────────────────────────────────────────────────────────┐│ │ │
│  │  │  │                         HOOKS LAYER                           ││ │ │
│  │  │  │  useProject() useAgents() useTasks() useRequirements()        ││ │ │
│  │  │  │  useRealTime() useTerminal() useFileSystem()                  ││ │ │
│  │  │  └───────────────────────────────┬───────────────────────────────┘│ │ │
│  │  │                                  │                                 │ │ │
│  │  │  ┌───────────────────────────────▼───────────────────────────────┐│ │ │
│  │  │  │                       STATE MANAGEMENT                        ││ │ │
│  │  │  │  Zustand Store ──► TanStack Query ──► IPC Bridge              ││ │ │
│  │  │  └───────────────────────────────────────────────────────────────┘│ │ │
│  │  │                                                                    │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### State Management

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Client State** | Zustand | Lightweight, TypeScript-first, no boilerplate |
| **Server State** | TanStack Query | Automatic caching, background refetch, stale-while-revalidate |
| **Form State** | React Hook Form | Performance-focused, validation integration |
| **URL State** | React Router | Search params for shareable state |

**Zustand Store Architecture:**
```typescript
// src/ui/store/index.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Project Store - Current project state
interface ProjectStore {
  // State
  currentProject: Project | null;
  mode: 'genesis' | 'evolution' | null;
  phase: InterviewPhase | ExecutionPhase;

  // Actions
  setProject: (project: Project) => void;
  setMode: (mode: 'genesis' | 'evolution') => void;
  advancePhase: () => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          // Initial state
          currentProject: null,
          mode: null,
          phase: 'requirements',

          // Actions
          setProject: (project) => set((state) => {
            state.currentProject = project;
          }),
          setMode: (mode) => set((state) => {
            state.mode = mode;
          }),
          advancePhase: () => set((state) => {
            const phases = ['requirements', 'features', 'planning', 'execution', 'review'];
            const currentIndex = phases.indexOf(state.phase as string);
            if (currentIndex < phases.length - 1) {
              state.phase = phases[currentIndex + 1] as any;
            }
          }),
          resetProject: () => set((state) => {
            state.currentProject = null;
            state.mode = null;
            state.phase = 'requirements';
          }),
        }))
      ),
      { name: 'nexus-project-store' }
    ),
    { name: 'ProjectStore' }
  )
);

// Agent Store - Agent states and activities
interface AgentStore {
  // State
  agents: Map<string, AgentState>;
  activeAgentCount: number;

  // Derived
  getAgent: (id: string) => AgentState | undefined;
  getActiveAgents: () => AgentState[];

  // Actions
  updateAgent: (id: string, update: Partial<AgentState>) => void;
  setAgentTask: (agentId: string, taskId: string) => void;
  clearAgentTask: (agentId: string) => void;
  registerAgent: (agent: AgentState) => void;
  unregisterAgent: (agentId: string) => void;
}

export const useAgentStore = create<AgentStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        agents: new Map(),
        activeAgentCount: 0,

        getAgent: (id) => get().agents.get(id),
        getActiveAgents: () =>
          Array.from(get().agents.values()).filter(a => a.status === 'working'),

        updateAgent: (id, update) => set((state) => {
          const agent = state.agents.get(id);
          if (agent) {
            Object.assign(agent, update);
          }
          state.activeAgentCount = Array.from(state.agents.values())
            .filter(a => a.status === 'working').length;
        }),
        setAgentTask: (agentId, taskId) => set((state) => {
          const agent = state.agents.get(agentId);
          if (agent) {
            agent.currentTask = taskId;
            agent.status = 'working';
          }
          state.activeAgentCount = Array.from(state.agents.values())
            .filter(a => a.status === 'working').length;
        }),
        clearAgentTask: (agentId) => set((state) => {
          const agent = state.agents.get(agentId);
          if (agent) {
            agent.currentTask = undefined;
            agent.status = 'idle';
          }
          state.activeAgentCount = Array.from(state.agents.values())
            .filter(a => a.status === 'working').length;
        }),
        registerAgent: (agent) => set((state) => {
          state.agents.set(agent.id, agent);
        }),
        unregisterAgent: (agentId) => set((state) => {
          state.agents.delete(agentId);
        }),
      }))
    ),
    { name: 'AgentStore' }
  )
);

// Task Store - Task queue and status
interface TaskStore {
  // State
  tasks: Map<string, Task>;
  taskQueue: string[];  // Task IDs in execution order
  completedTasks: string[];
  failedTasks: string[];

  // Derived
  getTask: (id: string) => Task | undefined;
  getPendingTasks: () => Task[];
  getInProgressTasks: () => Task[];

  // Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, update: Partial<Task>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  reorderQueue: (taskIds: string[]) => void;
  bulkAddTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        tasks: new Map(),
        taskQueue: [],
        completedTasks: [],
        failedTasks: [],

        getTask: (id) => get().tasks.get(id),
        getPendingTasks: () =>
          Array.from(get().tasks.values()).filter(t => t.status === 'pending'),
        getInProgressTasks: () =>
          Array.from(get().tasks.values()).filter(t => t.status === 'in-progress'),

        addTask: (task) => set((state) => {
          state.tasks.set(task.id, task);
          state.taskQueue.push(task.id);
        }),
        updateTask: (id, update) => set((state) => {
          const task = state.tasks.get(id);
          if (task) {
            Object.assign(task, update);
          }
        }),
        setTaskStatus: (id, status) => set((state) => {
          const task = state.tasks.get(id);
          if (task) {
            task.status = status;
            if (status === 'completed') {
              state.completedTasks.push(id);
              state.taskQueue = state.taskQueue.filter(tid => tid !== id);
            } else if (status === 'failed') {
              state.failedTasks.push(id);
            }
          }
        }),
        reorderQueue: (taskIds) => set((state) => {
          state.taskQueue = taskIds;
        }),
        bulkAddTasks: (tasks) => set((state) => {
          tasks.forEach(task => {
            state.tasks.set(task.id, task);
            state.taskQueue.push(task.id);
          });
        }),
      }))
    ),
    { name: 'TaskStore' }
  )
);

// UI Store - UI preferences and layout
interface UIStore {
  // State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  terminalHeight: number;
  selectedPanel: 'tasks' | 'agents' | 'logs' | 'files';

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setTerminalHeight: (height: number) => void;
  setSelectedPanel: (panel: 'tasks' | 'agents' | 'logs' | 'files') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      terminalHeight: 200,
      selectedPanel: 'tasks',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setTerminalHeight: (height) => set({ terminalHeight: Math.max(100, Math.min(500, height)) }),
      setSelectedPanel: (panel) => set({ selectedPanel: panel }),
    }),
    { name: 'nexus-ui-store' }
  )
);
```

**TanStack Query Setup:**
```typescript
// src/ui/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds (data considered fresh)
      staleTime: 30 * 1000,
      // Cache time: 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus for real-time feel
      refetchOnWindowFocus: true,
      // Background refetch interval: 10 seconds for active queries
      refetchInterval: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query Keys Factory - Type-safe query keys
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
    features: (projectId: string) => ['projects', projectId, 'features'] as const,
    requirements: (projectId: string) => ['projects', projectId, 'requirements'] as const,
  },
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    byFeature: (featureId: string) => ['tasks', 'feature', featureId] as const,
    detail: (id: string) => ['tasks', id] as const,
    queue: ['tasks', 'queue'] as const,
  },
  // Agents
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => ['agents', id] as const,
    metrics: (id: string) => ['agents', id, 'metrics'] as const,
    systemMetrics: ['agents', 'system-metrics'] as const,
  },
  // Execution
  execution: {
    status: ['execution', 'status'] as const,
    logs: (taskId: string) => ['execution', 'logs', taskId] as const,
    qaLoop: (taskId: string) => ['execution', 'qa-loop', taskId] as const,
  },
} as const;
```

**Custom Hooks Pattern:**
```typescript
// src/ui/hooks/useProject.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { useProjectStore } from '../store';

// IPC Bridge - Communication with Electron main process
declare global {
  interface Window {
    nexusAPI: {
      project: {
        create: (config: ProjectConfig) => Promise<Project>;
        load: (id: string) => Promise<Project>;
        save: (project: Project) => Promise<void>;
        delete: (id: string) => Promise<void>;
        list: () => Promise<Project[]>;
      };
      // ... other APIs
    };
  }
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => window.nexusAPI.project.list(),
  });
}

export function useProject(projectId: string) {
  const setProject = useProjectStore((s) => s.setProject);

  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: async () => {
      const project = await window.nexusAPI.project.load(projectId);
      setProject(project);
      return project;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const setProject = useProjectStore((s) => s.setProject);

  return useMutation({
    mutationFn: (config: ProjectConfig) => window.nexusAPI.project.create(config),
    onSuccess: (project) => {
      // Update cache
      queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // Update store
      setProject(project);
    },
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: Project) => window.nexusAPI.project.save(project),
    onSuccess: (_, project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
    },
  });
}

// src/ui/hooks/useTasks.ts
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byProject(projectId),
    queryFn: () => window.nexusAPI.tasks.getByProject(projectId),
    enabled: !!projectId,
    // Poll for task updates every 2 seconds during execution
    refetchInterval: (query) => {
      const tasks = query.state.data as Task[] | undefined;
      const hasInProgress = tasks?.some(t => t.status === 'in-progress');
      return hasInProgress ? 2000 : false;
    },
  });
}

export function useTaskQueue() {
  const taskQueue = useTaskStore((s) => s.taskQueue);
  const tasks = useTaskStore((s) => s.tasks);

  return useQuery({
    queryKey: queryKeys.tasks.queue,
    queryFn: () => window.nexusAPI.tasks.getQueue(),
    // Sync with local store
    onSuccess: (remoteTasks) => {
      const store = useTaskStore.getState();
      remoteTasks.forEach(task => {
        if (!store.tasks.has(task.id)) {
          store.addTask(task);
        } else {
          store.updateTask(task.id, task);
        }
      });
    },
  });
}

// src/ui/hooks/useAgents.ts
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => window.nexusAPI.agents.getAll(),
    refetchInterval: 1000, // Poll every second for agent status
  });
}

export function useAgentMetrics(agentId: string) {
  return useQuery({
    queryKey: queryKeys.agents.metrics(agentId),
    queryFn: () => window.nexusAPI.agents.getMetrics(agentId),
    enabled: !!agentId,
    refetchInterval: 5000, // Update metrics every 5 seconds
  });
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: queryKeys.agents.systemMetrics,
    queryFn: () => window.nexusAPI.agents.getSystemMetrics(),
    refetchInterval: 10000, // Update every 10 seconds
  });
}

// src/ui/hooks/useRealTime.ts
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealTimeEvents() {
  const queryClient = useQueryClient();
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const setTaskStatus = useTaskStore((s) => s.setTaskStatus);

  useEffect(() => {
    // Subscribe to real-time events from main process
    const unsubscribe = window.nexusAPI.events.subscribe((event) => {
      switch (event.type) {
        case 'task.started':
          setTaskStatus(event.payload.taskId, 'in-progress');
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.queue });
          break;

        case 'task.completed':
          setTaskStatus(event.payload.taskId, 'completed');
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.queue });
          break;

        case 'agent.status-changed':
          updateAgent(event.payload.agentId, { status: event.payload.status });
          queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
          break;

        case 'checkpoint.created':
          queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
          break;

        // Handle other events...
      }
    });

    return () => unsubscribe();
  }, [queryClient, updateAgent, setTaskStatus]);
}
```

---

### UI Components Library

| Component Type | Choice | Rationale |
|---------------|--------|-----------|
| **Component Library** | shadcn/ui | Copy-paste components, full control, Radix primitives |
| **Base Primitives** | Radix UI | Accessible, unstyled, composable |
| **Icons** | Lucide React | Consistent, tree-shakeable, MIT license |
| **Charts** | Recharts | React-native, composable, good for dashboards |
| **Code Display** | Monaco Editor | VSCode-quality, syntax highlighting, diff view |
| **Terminal** | xterm.js | Full terminal emulation for execution logs |
| **Drag & Drop** | @dnd-kit | Accessible, touch-friendly, for Kanban |
| **Virtual Lists** | @tanstack/virtual | Performance for large task lists |

**Component Structure:**
```
src/ui/components/
├── primitives/                # Base shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── progress.tsx
│   ├── select.tsx
│   ├── sheet.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toast.tsx
│   ├── tooltip.tsx
│   └── index.ts
├── composite/                 # Complex composed components
│   ├── task-card.tsx          # Task display with status, actions
│   ├── feature-tree.tsx       # Hierarchical feature view
│   ├── agent-status.tsx       # Agent card with metrics
│   ├── requirement-item.tsx   # Requirement with links
│   ├── code-viewer.tsx        # Monaco-based code display
│   ├── diff-viewer.tsx        # Git diff display
│   ├── terminal-output.tsx    # xterm.js wrapper
│   ├── file-tree.tsx          # Project file explorer
│   ├── progress-timeline.tsx  # Visual timeline
│   ├── kanban-column.tsx      # DnD column
│   ├── interview-question.tsx # Interview form field
│   └── index.ts
├── layout/                    # Layout components
│   ├── app-shell.tsx          # Main app layout
│   ├── header.tsx             # Top navigation
│   ├── sidebar.tsx            # Left sidebar
│   ├── main-content.tsx       # Main content area
│   ├── bottom-panel.tsx       # Resizable bottom panel
│   └── index.ts
├── pages/                     # Page-level components
│   ├── home/
│   │   ├── home-page.tsx
│   │   └── components/
│   ├── interview/
│   │   ├── interview-page.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── kanban/
│   │   ├── kanban-page.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── dashboard/
│   │   ├── dashboard-page.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── settings/
│       ├── settings-page.tsx
│       └── components/
└── providers/                 # Context providers
    ├── theme-provider.tsx
    ├── toast-provider.tsx
    ├── query-provider.tsx
    └── index.ts
```

**Example Component Implementation:**
```typescript
// src/ui/components/composite/task-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/card';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Task } from '@nexus/core';

interface TaskCardProps {
  task: Task;
  onExecute?: () => void;
  onCancel?: () => void;
  className?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-slate-500', label: 'Pending' },
  'in-progress': { icon: PlayCircle, color: 'bg-blue-500', label: 'Running' },
  completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Complete' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  blocked: { icon: Clock, color: 'bg-yellow-500', label: 'Blocked' },
};

export function TaskCard({ task, onExecute, onCancel, className }: TaskCardProps) {
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', status.color)} />
            <Badge variant="outline" className="text-xs">
              {task.id}
            </Badge>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
        <CardTitle className="text-sm font-medium">{task.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {task.description}
        </p>

        {/* Time estimate */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span>{task.timeEstimate} min estimated</span>
        </div>

        {/* Assigned agent */}
        {task.assignedAgent && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <User className="h-3 w-3" />
            <span>Assigned to {task.assignedAgent}</span>
          </div>
        )}

        {/* Files affected */}
        {task.files.length > 0 && (
          <div className="text-xs text-muted-foreground mb-3">
            <span className="font-medium">Files:</span>{' '}
            {task.files.slice(0, 3).join(', ')}
            {task.files.length > 3 && ` +${task.files.length - 3} more`}
          </div>
        )}

        {/* Progress bar for in-progress tasks */}
        {task.status === 'in-progress' && task.progress !== undefined && (
          <Progress value={task.progress} className="mb-3" />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {task.status === 'pending' && onExecute && (
            <Button size="sm" onClick={onExecute}>
              <PlayCircle className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {task.status === 'in-progress' && onCancel && (
            <Button size="sm" variant="destructive" onClick={onCancel}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Styling Approach

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **CSS Framework** | Tailwind CSS | Utility-first, consistent, excellent DX |
| **Version** | 3.4+ | Latest features, container queries |
| **Preset** | Default + Custom | shadcn/ui base, Nexus customizations |
| **Dark Mode** | class strategy | Toggle via Zustand, system preference fallback |
| **Animations** | Tailwind + Framer Motion | Tailwind for basic, Framer for complex |

**Tailwind Configuration:**
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';
import animatePlugin from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: [
    './src/ui/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Nexus brand colors
        nexus: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dfff',
          300: '#7cc4ff',
          400: '#36a5ff',
          500: '#0c87f5',  // Primary
          600: '#006ad4',
          700: '#0054ab',
          800: '#04478d',
          900: '#0a3d74',
          950: '#07264c',
        },
        // Status colors
        status: {
          pending: '#64748b',
          running: '#3b82f6',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#eab308',
          blocked: '#f59e0b',
        },
        // Agent type colors
        agent: {
          planner: '#8b5cf6',   // Purple
          coder: '#3b82f6',     // Blue
          reviewer: '#10b981',  // Green
          tester: '#f59e0b',    // Amber
          merger: '#ec4899',    // Pink
        },
        // shadcn/ui theme tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter var', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config;
```

**CSS Variables for Theme:**
```css
/* src/ui/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 209 100% 50%;        /* Nexus blue */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 209 100% 50%;
    --radius: 0.5rem;
  }

  .dark {
    /* Dark theme */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 209 100% 50%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Custom utilities */
@layer utilities {
  /* Scrollbar styling */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 4px;
  }

  /* Agent status indicators */
  .agent-status-indicator {
    @apply relative before:absolute before:top-0 before:left-0
           before:h-2 before:w-2 before:rounded-full;
  }

  .agent-idle::before {
    @apply before:bg-status-pending;
  }

  .agent-working::before {
    @apply before:bg-status-running before:animate-pulse-slow;
  }

  .agent-error::before {
    @apply before:bg-status-error;
  }
}
```

---

### Page Implementations

**Interview Page (Genesis Mode Entry):**
```typescript
// src/ui/components/pages/interview/interview-page.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../primitives/button';
import { Progress } from '../../primitives/progress';
import { InterviewQuestion } from './components/interview-question';
import { InterviewSummary } from './components/interview-summary';
import { useProjectStore } from '../../../store';
import type { Requirement, RequirementCategory } from '@nexus/core';

// Interview phases
const INTERVIEW_PHASES = [
  { id: 'project-overview', title: 'Project Overview', questions: 3 },
  { id: 'core-features', title: 'Core Features', questions: 5 },
  { id: 'technical-requirements', title: 'Technical Requirements', questions: 4 },
  { id: 'design-preferences', title: 'Design Preferences', questions: 3 },
  { id: 'constraints', title: 'Constraints', questions: 2 },
] as const;

interface CollectedRequirement {
  category: RequirementCategory;
  description: string;
  source: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function InterviewPage() {
  const navigate = useNavigate();
  const setProject = useProjectStore((s) => s.setProject);
  const setMode = useProjectStore((s) => s.setMode);

  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [requirements, setRequirements] = useState<CollectedRequirement[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  // Calculate overall progress
  const totalQuestions = INTERVIEW_PHASES.reduce((sum, p) => sum + p.questions, 0);
  const completedQuestions = INTERVIEW_PHASES
    .slice(0, currentPhase)
    .reduce((sum, p) => sum + p.questions, 0) + currentQuestion;
  const progress = (completedQuestions / totalQuestions) * 100;

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async () => {
      const project = await window.nexusAPI.project.create({
        mode: 'genesis',
        requirements: requirements as Requirement[],
      });
      return project;
    },
    onSuccess: (project) => {
      setProject(project);
      setMode('genesis');
      navigate(`/project/${project.id}/planning`);
    },
  });

  const handleAnswer = (answer: string) => {
    // Extract requirements from answer (simplified)
    // In reality, this would use AI to parse the answer
    const phase = INTERVIEW_PHASES[currentPhase];

    const newReq: CollectedRequirement = {
      category: mapPhaseToCategory(phase.id),
      description: answer,
      source: `Interview/${phase.title}/Q${currentQuestion + 1}`,
      priority: 'medium',
    };

    setRequirements([...requirements, newReq]);

    // Advance to next question
    if (currentQuestion < phase.questions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentPhase < INTERVIEW_PHASES.length - 1) {
      setCurrentPhase(currentPhase + 1);
      setCurrentQuestion(0);
    } else {
      setIsReviewing(true);
    }
  };

  if (isReviewing) {
    return (
      <InterviewSummary
        requirements={requirements}
        onEdit={(index) => {
          // Navigate back to specific question
        }}
        onConfirm={() => createProject.mutate()}
        isCreating={createProject.isPending}
      />
    );
  }

  const phase = INTERVIEW_PHASES[currentPhase];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{phase.title}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Phase indicator */}
      <div className="flex gap-2 mb-8">
        {INTERVIEW_PHASES.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              'h-1 flex-1 rounded',
              i < currentPhase ? 'bg-primary' :
              i === currentPhase ? 'bg-primary/50' :
              'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Current question */}
      <InterviewQuestion
        phase={phase}
        questionIndex={currentQuestion}
        onAnswer={handleAnswer}
        onBack={currentQuestion > 0 || currentPhase > 0 ? () => {
          if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
          } else if (currentPhase > 0) {
            setCurrentPhase(currentPhase - 1);
            setCurrentQuestion(INTERVIEW_PHASES[currentPhase - 1].questions - 1);
          }
        } : undefined}
      />
    </div>
  );
}

function mapPhaseToCategory(phaseId: string): RequirementCategory {
  const mapping: Record<string, RequirementCategory> = {
    'project-overview': 'core',
    'core-features': 'functional',
    'technical-requirements': 'technical',
    'design-preferences': 'design',
    'constraints': 'constraint',
  };
  return mapping[phaseId] || 'core';
}
```

**Kanban Page (Task Execution View):**
```typescript
// src/ui/components/pages/kanban/kanban-page.tsx
import { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './components/kanban-column';
import { TaskCard } from '../../composite/task-card';
import { useTaskStore } from '../../../store';
import { useTasks } from '../../../hooks/useTasks';
import { useProjectStore } from '../../../store';
import type { Task, TaskStatus } from '@nexus/core';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pending', color: 'bg-slate-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'In Review', color: 'bg-yellow-500' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
  { id: 'failed', title: 'Failed', color: 'bg-red-500' },
];

export function KanbanPage() {
  const project = useProjectStore((s) => s.currentProject);
  const { data: tasks = [] } = useTasks(project?.id || '');
  const setTaskStatus = useTaskStore((s) => s.setTaskStatus);

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      'in-progress': [],
      review: [],
      completed: [],
      failed: [],
      blocked: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Update task status via API
    window.nexusAPI.tasks.updateStatus(taskId, newStatus);
    // Optimistic update
    setTaskStatus(taskId, newStatus);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">Task Board</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{tasks.length} total tasks</span>
          <span>
            {tasksByStatus.completed.length} completed
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} className="opacity-80 rotate-3" />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
```

---

### Part B Completion

- [x] Framework documented (React 18.3+, no meta-framework for Electron)
- [x] State Management defined (Zustand + TanStack Query, full store implementations)
- [x] UI Components library selected (shadcn/ui + Radix + specialized libs)
- [x] Styling approach documented (Tailwind CSS 3.4+ with custom theme)
- [x] Component architecture defined with full structure
- [x] Example implementations provided (TaskCard, Interview Page, Kanban Page)
- [x] Custom hooks pattern established
- [x] Real-time event handling documented

---

## Part C: Backend Stack (Non-UI Layers)

This section documents the technology choices for all non-UI layers (Orchestration, Planning, Execution, Quality, Persistence, Infrastructure).

---

### Database

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Primary Database** | SQLite | 3.45+ | Zero-config, portable, file-based, perfect for desktop apps |
| **SQLite Driver** | better-sqlite3 | 11.x | Synchronous API (faster than async), native bindings |
| **Backup Strategy** | File copy | - | SQLite's backup-friendly design |

**Database Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXUS DATABASE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────── .nexus/ ────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  nexus.db (Main SQLite Database)                                 │  │ │
│  │  │  ├── projects         # Project metadata                         │  │ │
│  │  │  ├── features         # Feature definitions                      │  │ │
│  │  │  ├── tasks            # Task definitions and status              │  │ │
│  │  │  ├── agents           # Agent registry and state                 │  │ │
│  │  │  ├── checkpoints      # Checkpoint metadata                      │  │ │
│  │  │  ├── metrics          # Execution metrics                        │  │ │
│  │  │  └── sessions         # Session history                          │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  memory.db (Embeddings Database)                                 │  │ │
│  │  │  ├── episodes         # Stored episodes with embeddings          │  │ │
│  │  │  ├── patterns         # Learned patterns                         │  │ │
│  │  │  ├── decisions        # Recorded decisions                       │  │ │
│  │  │  └── embeddings_cache # Cached embedding vectors                 │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  JSON Files (Human-Readable State)                               │  │ │
│  │  │  ├── requirements/{project}/   # Structured requirements         │  │ │
│  │  │  ├── checkpoints/{id}.json     # Full checkpoint data            │  │ │
│  │  │  └── agents/*.json             # Agent configurations            │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────── Project Root ───────────────────────────────────┐ │
│  │  STATE.md    # GSD-compatible state file (committed to git)            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**SQLite Schema (Core Tables):**
```sql
-- nexus.db schema

-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('genesis', 'evolution')),
  repository_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  settings TEXT NOT NULL DEFAULT '{}',  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Features table
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  complexity TEXT DEFAULT 'medium',
  depends_on TEXT DEFAULT '[]',  -- JSON array of feature IDs
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  estimated_time INTEGER,        -- Minutes
  actual_time INTEGER,           -- Minutes
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_features_project ON features(project_id);
CREATE INDEX idx_features_status ON features(status);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  files TEXT NOT NULL DEFAULT '[]',        -- JSON array of file paths
  test_criteria TEXT NOT NULL,
  depends_on TEXT DEFAULT '[]',            -- JSON array of task IDs
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT DEFAULT 'implementation',
  time_estimate INTEGER NOT NULL,          -- Minutes (max 30)
  actual_time INTEGER,                     -- Minutes
  assigned_agent TEXT,
  max_iterations INTEGER DEFAULT 50,
  iterations INTEGER DEFAULT 0,
  worktree_path TEXT,
  commit_hash TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX idx_tasks_feature ON tasks(feature_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent);

-- Agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('planner', 'coder', 'reviewer', 'tester', 'merger')),
  name TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  current_task TEXT REFERENCES tasks(id),
  worktree_path TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);

-- Checkpoints table
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id),
  type TEXT NOT NULL DEFAULT 'auto',  -- auto, manual, recovery
  state_snapshot TEXT NOT NULL,       -- JSON
  git_ref TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_checkpoints_project ON checkpoints(project_id);
CREATE INDEX idx_checkpoints_task ON checkpoints(task_id);

-- Metrics table
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metadata TEXT DEFAULT '{}',   -- JSON
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_metrics_project ON metrics(project_id);
CREATE INDEX idx_metrics_type ON metrics(metric_type);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  tasks_completed INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  events TEXT DEFAULT '[]'  -- JSON array of event summaries
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
```

**Embeddings Schema (memory.db):**
```sql
-- memory.db schema

-- Episodes table with vector storage
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'task', 'error', 'decision', 'pattern'
  content TEXT NOT NULL,
  context TEXT,        -- JSON
  embedding BLOB,      -- Float32 array (1536 dimensions for OpenAI, 768 for local)
  embedding_model TEXT,
  importance REAL DEFAULT 0.5,
  accessed_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed TEXT
);

CREATE INDEX idx_episodes_project ON episodes(project_id);
CREATE INDEX idx_episodes_type ON episodes(type);

-- Enable SQLite's virtual table for vector similarity (using sqlite-vss extension)
-- Note: This requires the sqlite-vss extension to be loaded

-- Patterns table
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  project_id TEXT,  -- NULL for global patterns
  pattern_type TEXT NOT NULL,  -- 'code', 'error', 'workflow'
  pattern TEXT NOT NULL,
  description TEXT,
  frequency INTEGER DEFAULT 1,
  success_rate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Decisions table
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  decision TEXT NOT NULL,
  rationale TEXT,
  alternatives TEXT,  -- JSON array
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### ORM / Query Builder

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **ORM** | Drizzle ORM | 0.30+ | TypeScript-first, SQL-like syntax, excellent DX |
| **Migrations** | Drizzle Kit | 0.22+ | Generate and run migrations from schema |
| **Type Safety** | Full inference | - | Query results fully typed |

**Drizzle Configuration:**
```typescript
// src/persistence/db/schema.ts
import { sqliteTable, text, integer, real, blob, index } from 'drizzle-orm/sqlite-core';

// Projects
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mode: text('mode', { enum: ['genesis', 'evolution'] }).notNull(),
  repositoryPath: text('repository_path').notNull(),
  status: text('status').notNull().default('active'),
  settings: text('settings', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
});

// Features
export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  complexity: text('complexity').default('medium'),
  dependsOn: text('depends_on', { mode: 'json' }).default('[]'),
  totalTasks: integer('total_tasks').default(0),
  completedTasks: integer('completed_tasks').default(0),
  estimatedTime: integer('estimated_time'),
  actualTime: integer('actual_time'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
}, (table) => ({
  projectIdx: index('idx_features_project').on(table.projectId),
  statusIdx: index('idx_features_status').on(table.status),
}));

// Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  files: text('files', { mode: 'json' }).notNull().default('[]'),
  testCriteria: text('test_criteria').notNull(),
  dependsOn: text('depends_on', { mode: 'json' }).default('[]'),
  status: text('status').notNull().default('pending'),
  type: text('type').default('implementation'),
  timeEstimate: integer('time_estimate').notNull(),
  actualTime: integer('actual_time'),
  assignedAgent: text('assigned_agent'),
  maxIterations: integer('max_iterations').default(50),
  iterations: integer('iterations').default(0),
  worktreePath: text('worktree_path'),
  commitHash: text('commit_hash'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
}, (table) => ({
  featureIdx: index('idx_tasks_feature').on(table.featureId),
  statusIdx: index('idx_tasks_status').on(table.status),
  assignedIdx: index('idx_tasks_assigned').on(table.assignedAgent),
}));

// Agents
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['planner', 'coder', 'reviewer', 'tester', 'merger'] }).notNull(),
  name: text('name').notNull(),
  modelProvider: text('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  status: text('status').notNull().default('idle'),
  currentTask: text('current_task').references(() => tasks.id),
  worktreePath: text('worktree_path'),
  sessionId: text('session_id'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  lastActivity: text('last_activity').default(sql`datetime('now')`),
}, (table) => ({
  statusIdx: index('idx_agents_status').on(table.status),
  typeIdx: index('idx_agents_type').on(table.type),
}));

// Type exports for use throughout the application
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
```

**Drizzle Database Client:**
```typescript
// src/persistence/db/client.ts
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import { app } from 'electron';

// Database paths
const NEXUS_DIR = path.join(app.getPath('userData'), '.nexus');
const MAIN_DB_PATH = path.join(NEXUS_DIR, 'nexus.db');
const MEMORY_DB_PATH = path.join(NEXUS_DIR, 'memory.db');

// Database instances
let mainDb: BetterSQLite3Database<typeof schema>;
let memoryDb: BetterSQLite3Database;

export function initializeDatabases(): void {
  // Ensure directory exists
  fs.ensureDirSync(NEXUS_DIR);

  // Initialize main database
  const sqlite = new Database(MAIN_DB_PATH);
  sqlite.pragma('journal_mode = WAL');  // Write-Ahead Logging for performance
  sqlite.pragma('foreign_keys = ON');   // Enforce foreign key constraints
  sqlite.pragma('busy_timeout = 5000'); // Wait 5s on lock

  mainDb = drizzle(sqlite, { schema });

  // Run migrations
  migrate(mainDb, { migrationsFolder: './drizzle/migrations' });

  // Initialize memory database
  const memorySqlite = new Database(MEMORY_DB_PATH);
  memorySqlite.pragma('journal_mode = WAL');
  memoryDb = drizzle(memorySqlite);
}

export function getMainDb(): BetterSQLite3Database<typeof schema> {
  if (!mainDb) throw new Error('Database not initialized');
  return mainDb;
}

export function getMemoryDb(): BetterSQLite3Database {
  if (!memoryDb) throw new Error('Memory database not initialized');
  return memoryDb;
}

// Example queries
export const queries = {
  // Projects
  getProject: (id: string) => mainDb.select().from(schema.projects).where(eq(schema.projects.id, id)).get(),
  getAllProjects: () => mainDb.select().from(schema.projects).all(),

  // Tasks by status
  getTasksByStatus: (status: string) =>
    mainDb.select().from(schema.tasks).where(eq(schema.tasks.status, status)).all(),

  // Tasks for feature with relations
  getFeatureTasks: (featureId: string) =>
    mainDb.select().from(schema.tasks).where(eq(schema.tasks.featureId, featureId)).all(),

  // Active agents
  getActiveAgents: () =>
    mainDb.select().from(schema.agents).where(eq(schema.agents.status, 'working')).all(),
};
```

---

### Embeddings

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Cloud Embeddings** | OpenAI text-embedding-3-small | - | High quality, 1536 dimensions, cost-effective |
| **Local Fallback** | @xenova/transformers | 2.17+ | In-browser/Node transformers, no API needed |
| **Local Model** | all-MiniLM-L6-v2 | - | Fast, 384 dimensions, good quality |
| **Vector Search** | sqlite-vec | 0.1+ | SQLite extension for vector similarity |

**Embeddings Strategy:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMBEDDINGS STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ONLINE MODE (Default):                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Text → OpenAI API → text-embedding-3-small → 1536d vector           │   │
│  │         (with caching)                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  OFFLINE MODE (Fallback):                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Text → @xenova/transformers → all-MiniLM-L6-v2 → 384d vector        │   │
│  │         (runs locally, no API needed)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  HYBRID APPROACH:                                                            │
│  1. Check cache first                                                        │
│  2. Try OpenAI if online and API key configured                             │
│  3. Fall back to local model if offline or error                            │
│  4. Store result in cache with source indicator                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Embeddings Service Implementation:**
```typescript
// src/persistence/memory/embeddings.ts
import { OpenAI } from 'openai';
import { pipeline, Pipeline } from '@xenova/transformers';

interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  source: 'openai' | 'local';
}

class EmbeddingsService {
  private openai: OpenAI | null = null;
  private localPipeline: Pipeline | null = null;
  private cache: Map<string, EmbeddingResult> = new Map();

  constructor() {
    // Initialize OpenAI if API key available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async initialize(): Promise<void> {
    // Pre-load local model for fast fallback
    this.localPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }

  async embed(text: string): Promise<EmbeddingResult> {
    // Check cache
    const cacheKey = this.hashText(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: EmbeddingResult;

    // Try OpenAI first
    if (this.openai) {
      try {
        result = await this.embedWithOpenAI(text);
      } catch (error) {
        console.warn('OpenAI embedding failed, using local model:', error);
        result = await this.embedWithLocal(text);
      }
    } else {
      result = await this.embedWithLocal(text);
    }

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  private async embedWithOpenAI(text: string): Promise<EmbeddingResult> {
    const response = await this.openai!.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return {
      vector: response.data[0].embedding,
      model: 'text-embedding-3-small',
      dimensions: 1536,
      source: 'openai',
    };
  }

  private async embedWithLocal(text: string): Promise<EmbeddingResult> {
    if (!this.localPipeline) {
      await this.initialize();
    }

    const output = await this.localPipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });

    return {
      vector: Array.from(output.data),
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      source: 'local',
    };
  }

  private hashText(text: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  // Vector similarity search
  async findSimilar(
    query: string,
    projectId: string,
    limit: number = 10
  ): Promise<Episode[]> {
    const queryEmbedding = await this.embed(query);

    // Use sqlite-vec for efficient similarity search
    // This requires the extension to be loaded
    const db = getMemoryDb();

    const results = db.all(sql`
      SELECT e.*, vec_distance_cosine(e.embedding, ${queryEmbedding.vector}) as distance
      FROM episodes e
      WHERE e.project_id = ${projectId}
        AND e.embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return results as Episode[];
  }
}

export const embeddingsService = new EmbeddingsService();
```

---

### File System

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **File Operations** | fs-extra | 11.x | Promise-based, extra utilities, drop-in fs replacement |
| **File Watching** | chokidar | 3.6+ | Cross-platform, efficient, debounced |
| **Glob Patterns** | fast-glob | 3.3+ | Fast directory traversal |
| **Path Handling** | pathe | 1.x | Cross-platform path handling |

**File System Service:**
```typescript
// src/infrastructure/fs/file-system.ts
import fs from 'fs-extra';
import chokidar from 'chokidar';
import fg from 'fast-glob';
import { normalize, join, dirname, basename, extname } from 'pathe';

interface FileSystemConfig {
  baseDir: string;
  watchPatterns?: string[];
  ignorePatterns?: string[];
}

class FileSystemService {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  constructor(private config: FileSystemConfig) {}

  // Basic operations
  async readFile(path: string): Promise<string> {
    return fs.readFile(normalize(join(this.config.baseDir, path)), 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = normalize(join(this.config.baseDir, path));
    await fs.ensureDir(dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async appendFile(path: string, content: string): Promise<void> {
    const fullPath = normalize(join(this.config.baseDir, path));
    await fs.ensureDir(dirname(fullPath));
    await fs.appendFile(fullPath, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    await fs.remove(normalize(join(this.config.baseDir, path)));
  }

  async exists(path: string): Promise<boolean> {
    return fs.pathExists(normalize(join(this.config.baseDir, path)));
  }

  async isDirectory(path: string): Promise<boolean> {
    const stat = await fs.stat(normalize(join(this.config.baseDir, path)));
    return stat.isDirectory();
  }

  // Directory operations
  async readDir(path: string): Promise<string[]> {
    return fs.readdir(normalize(join(this.config.baseDir, path)));
  }

  async ensureDir(path: string): Promise<void> {
    await fs.ensureDir(normalize(join(this.config.baseDir, path)));
  }

  async removeDir(path: string): Promise<void> {
    await fs.remove(normalize(join(this.config.baseDir, path)));
  }

  // Glob operations
  async glob(pattern: string | string[], options?: fg.Options): Promise<string[]> {
    return fg(pattern, {
      cwd: this.config.baseDir,
      ignore: this.config.ignorePatterns || ['**/node_modules/**', '**/.git/**'],
      ...options,
    });
  }

  // File watching
  watch(
    pattern: string,
    callbacks: {
      onChange?: (path: string) => void;
      onAdd?: (path: string) => void;
      onDelete?: (path: string) => void;
    }
  ): () => void {
    const watcher = chokidar.watch(pattern, {
      cwd: this.config.baseDir,
      ignored: this.config.ignorePatterns || ['**/node_modules/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: true,
    });

    if (callbacks.onChange) watcher.on('change', callbacks.onChange);
    if (callbacks.onAdd) watcher.on('add', callbacks.onAdd);
    if (callbacks.onDelete) watcher.on('unlink', callbacks.onDelete);

    const id = crypto.randomUUID();
    this.watchers.set(id, watcher);

    return () => {
      watcher.close();
      this.watchers.delete(id);
    };
  }

  // Utility methods
  resolvePath(...paths: string[]): string {
    return normalize(join(this.config.baseDir, ...paths));
  }

  getBasename(path: string): string {
    return basename(path);
  }

  getExtension(path: string): string {
    return extname(path);
  }

  // Cleanup
  async cleanup(): Promise<void> {
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();
  }
}

export function createFileSystem(config: FileSystemConfig): FileSystemService {
  return new FileSystemService(config);
}
```

---

### Process Management

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Process Execution** | execa | 9.x | Modern, promise-based, TypeScript support |
| **Process Killing** | tree-kill | 1.2+ | Kill entire process trees |
| **Shell Parsing** | shell-quote | 1.8+ | Safe shell argument parsing |
| **Output Streaming** | - | - | Built into execa |

**Process Runner Implementation:**
```typescript
// src/infrastructure/process/runner.ts
import { execa, type ExecaReturnValue, type Options } from 'execa';
import treeKill from 'tree-kill';
import { quote, parse } from 'shell-quote';

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  killed: boolean;
}

interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  shell?: boolean;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

class ProcessRunner {
  private runningProcesses: Map<string, number> = new Map();  // id -> pid

  async run(
    command: string,
    args: string[] = [],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const id = crypto.randomUUID();

    const execaOptions: Options = {
      cwd: options.cwd,
      timeout: options.timeout || 300000,  // 5 min default
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      reject: false,  // Don't throw on non-zero exit
    };

    try {
      const subprocess = execa(command, args, execaOptions);

      // Track PID for potential kill
      if (subprocess.pid) {
        this.runningProcesses.set(id, subprocess.pid);
      }

      // Stream output if callbacks provided
      if (options.onStdout && subprocess.stdout) {
        subprocess.stdout.on('data', (data) => options.onStdout!(data.toString()));
      }
      if (options.onStderr && subprocess.stderr) {
        subprocess.stderr.on('data', (data) => options.onStderr!(data.toString()));
      }

      const result = await subprocess;

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? -1,
        duration: Date.now() - startTime,
        killed: result.killed,
      };
    } finally {
      this.runningProcesses.delete(id);
    }
  }

  async runShell(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    // Parse and quote for safety
    const parsed = parse(command);
    if (parsed.length === 0) {
      throw new Error('Empty command');
    }

    // Check for dangerous patterns
    this.validateCommand(command);

    return this.run(command, [], { ...options, shell: true });
  }

  async kill(id: string): Promise<void> {
    const pid = this.runningProcesses.get(id);
    if (pid) {
      await new Promise<void>((resolve, reject) => {
        treeKill(pid, 'SIGTERM', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.runningProcesses.delete(id);
    }
  }

  async killAll(): Promise<void> {
    const pids = Array.from(this.runningProcesses.values());
    await Promise.all(
      pids.map(pid => new Promise<void>((resolve) => {
        treeKill(pid, 'SIGTERM', () => resolve());
      }))
    );
    this.runningProcesses.clear();
  }

  private validateCommand(command: string): void {
    const dangerous = [
      'rm -rf /',
      'rm -rf ~',
      'format c:',
      ':(){ :|:& };:',  // Fork bomb
      'dd if=/dev/',
      '> /dev/sda',
    ];

    const lower = command.toLowerCase();
    for (const pattern of dangerous) {
      if (lower.includes(pattern)) {
        throw new Error(`Potentially dangerous command detected: ${pattern}`);
      }
    }
  }
}

export const processRunner = new ProcessRunner();
```

---

### Git Operations

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Git Client** | simple-git | 3.24+ | Promise-based, comprehensive, well-maintained |
| **Diff Parsing** | parse-diff | 0.11+ | Parse unified diff format |
| **Worktree Management** | simple-git | - | Built-in worktree commands |

**Git Service Implementation:**
```typescript
// src/infrastructure/git/git-service.ts
import simpleGit, { SimpleGit, SimpleGitOptions, StatusResult, LogResult } from 'simple-git';
import parseDiff from 'parse-diff';

interface GitConfig {
  baseDir: string;
  maxConcurrent?: number;
}

interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  locked: boolean;
}

class GitService {
  private git: SimpleGit;
  private worktrees: Map<string, string> = new Map();  // agentId -> worktreePath

  constructor(config: GitConfig) {
    const options: Partial<SimpleGitOptions> = {
      baseDir: config.baseDir,
      binary: 'git',
      maxConcurrentProcesses: config.maxConcurrent || 6,
    };

    this.git = simpleGit(options);
  }

  // Basic operations
  async status(): Promise<StatusResult> {
    return this.git.status();
  }

  async log(options: { maxCount?: number; from?: string; to?: string } = {}): Promise<LogResult> {
    return this.git.log({
      maxCount: options.maxCount || 50,
      from: options.from,
      to: options.to,
    });
  }

  async diff(options: { staged?: boolean; ref?: string } = {}): Promise<string> {
    if (options.staged) {
      return this.git.diff(['--staged']);
    }
    if (options.ref) {
      return this.git.diff([options.ref]);
    }
    return this.git.diff();
  }

  async parsedDiff(options: { staged?: boolean; ref?: string } = {}): Promise<parseDiff.File[]> {
    const diffText = await this.diff(options);
    return parseDiff(diffText);
  }

  // Commit operations
  async add(files: string | string[]): Promise<void> {
    await this.git.add(files);
  }

  async commit(message: string, options?: { amend?: boolean }): Promise<string> {
    const args: string[] = ['-m', message];
    if (options?.amend) {
      args.push('--amend', '--no-edit');
    }
    const result = await this.git.commit(message, undefined, options?.amend ? { '--amend': null, '--no-edit': null } : undefined);
    return result.commit;
  }

  // Branch operations
  async currentBranch(): Promise<string> {
    return this.git.revparse(['--abbrev-ref', 'HEAD']);
  }

  async createBranch(name: string, startPoint?: string): Promise<void> {
    await this.git.checkoutBranch(name, startPoint || 'HEAD');
  }

  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }

  // Worktree operations (for parallel agents)
  async createWorktree(agentId: string, branchName: string): Promise<string> {
    const worktreePath = `${this.git.options.baseDir}/.worktrees/${agentId}`;

    // Create new branch if it doesn't exist
    try {
      await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath]);
    } catch (error) {
      // Branch might exist, try without -b
      await this.git.raw(['worktree', 'add', worktreePath, branchName]);
    }

    this.worktrees.set(agentId, worktreePath);
    return worktreePath;
  }

  async removeWorktree(agentId: string): Promise<void> {
    const worktreePath = this.worktrees.get(agentId);
    if (worktreePath) {
      await this.git.raw(['worktree', 'remove', worktreePath, '--force']);
      this.worktrees.delete(agentId);
    }
  }

  async listWorktrees(): Promise<WorktreeInfo[]> {
    const output = await this.git.raw(['worktree', 'list', '--porcelain']);
    const worktrees: WorktreeInfo[] = [];

    const entries = output.split('\n\n').filter(Boolean);
    for (const entry of entries) {
      const lines = entry.split('\n');
      const info: Partial<WorktreeInfo> = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) info.path = line.slice(9);
        if (line.startsWith('branch ')) info.branch = line.slice(7).replace('refs/heads/', '');
        if (line.startsWith('HEAD ')) info.commit = line.slice(5);
        if (line === 'locked') info.locked = true;
      }

      if (info.path) {
        worktrees.push({
          path: info.path,
          branch: info.branch || '',
          commit: info.commit || '',
          locked: info.locked || false,
        });
      }
    }

    return worktrees;
  }

  // Merge operations
  async merge(branch: string, options?: { noFf?: boolean; squash?: boolean }): Promise<{ success: boolean; conflicts?: string[] }> {
    try {
      const args: string[] = [branch];
      if (options?.noFf) args.unshift('--no-ff');
      if (options?.squash) args.unshift('--squash');

      await this.git.merge(args);
      return { success: true };
    } catch (error: any) {
      // Check for conflicts
      const status = await this.status();
      const conflicts = status.conflicted;
      return { success: false, conflicts };
    }
  }

  async abortMerge(): Promise<void> {
    await this.git.merge(['--abort']);
  }

  // Stash operations
  async stash(message?: string): Promise<void> {
    if (message) {
      await this.git.stash(['push', '-m', message]);
    } else {
      await this.git.stash();
    }
  }

  async stashPop(): Promise<void> {
    await this.git.stash(['pop']);
  }

  // Utility
  getWorktreePath(agentId: string): string | undefined {
    return this.worktrees.get(agentId);
  }

  async isClean(): Promise<boolean> {
    const status = await this.status();
    return status.isClean();
  }
}

export function createGitService(config: GitConfig): GitService {
  return new GitService(config);
}
```

---

### Event System

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Event Emitter** | EventEmitter3 | 5.x | High-performance, tree-shakeable |
| **Typed Events** | Custom | - | Full TypeScript typing for events |
| **Event Storage** | SQLite | - | Persist event history for replay |

**Event Bus Implementation:**
```typescript
// src/orchestration/events/event-bus.ts
import EventEmitter from 'eventemitter3';

// See Task 5.4 Part D for full event type definitions
type NexusEventType = keyof NexusEventPayloads;
type NexusEventPayload<T extends NexusEventType> = NexusEventPayloads[T];

interface EventRecord {
  id: string;
  event: string;
  payload: unknown;
  timestamp: Date;
}

type Unsubscribe = () => void;

class NexusEventBus {
  private emitter = new EventEmitter();
  private history: EventRecord[] = [];
  private maxHistory = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  emit<E extends NexusEventType>(event: E, payload: NexusEventPayload<E>): void {
    const record: EventRecord = {
      id: crypto.randomUUID(),
      event,
      payload,
      timestamp: new Date(),
    };

    // Store in history
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit to listeners
    this.emitter.emit(event, payload);
    this.emitter.emit('*', event, payload);  // Wildcard for debugging
  }

  on<E extends NexusEventType>(
    event: E,
    handler: (payload: NexusEventPayload<E>) => void
  ): Unsubscribe {
    this.emitter.on(event, handler);

    // Track for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.emitter.off(event, handler);
      this.listeners.get(event)?.delete(handler);
    };
  }

  once<E extends NexusEventType>(
    event: E,
    handler: (payload: NexusEventPayload<E>) => void
  ): Unsubscribe {
    this.emitter.once(event, handler);
    return () => this.emitter.off(event, handler);
  }

  onAny(handler: (event: string, payload: unknown) => void): Unsubscribe {
    this.emitter.on('*', handler);
    return () => this.emitter.off('*', handler);
  }

  getHistory(filter?: {
    event?: string;
    since?: Date;
    limit?: number;
  }): EventRecord[] {
    let result = [...this.history];

    if (filter?.event) {
      result = result.filter(r => r.event === filter.event);
    }
    if (filter?.since) {
      result = result.filter(r => r.timestamp >= filter.since!);
    }
    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  clearHistory(): void {
    this.history = [];
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new NexusEventBus();
```

---

### Part C Completion

- [x] Database documented (SQLite with better-sqlite3, full schema defined)
- [x] ORM/Query Builder documented (Drizzle ORM with full schema)
- [x] Embeddings documented (OpenAI + local fallback with @xenova/transformers)
- [x] File System documented (fs-extra + chokidar + fast-glob)
- [x] Process Management documented (execa + tree-kill)
- [x] Git Operations documented (simple-git with worktree support)
- [x] Event System documented (EventEmitter3 with typed events)

---

## Part D: AI/LLM Stack

The AI/LLM Stack defines how Nexus integrates with language models for agent intelligence. This is the brain of the system, powering all agent capabilities from planning to code generation to review.

### AI Provider Overview

| Provider | SDK | Primary Use Cases | Models Used |
|----------|-----|-------------------|-------------|
| **Anthropic** | @anthropic-ai/sdk | Planning, Coding, Testing, Merging | Claude Opus 4, Claude Sonnet 4 |
| **Google** | @google/generative-ai | Code Review, Research | Gemini 2.5 Pro |
| **OpenAI** | openai | Embeddings only | text-embedding-3-small |

### Model Selection Strategy

| Agent Type | Primary Model | Fallback Model | Rationale |
|------------|---------------|----------------|-----------|
| **Planner** | Claude Opus 4 | Claude Sonnet 4 | Opus excels at complex reasoning and planning |
| **Coder** | Claude Sonnet 4 | Claude Sonnet 4 | Best balance of speed/quality for code gen |
| **Reviewer** | Gemini 2.5 Pro | Claude Sonnet 4 | Different perspective for unbiased review |
| **Tester** | Claude Sonnet 4 | Claude Sonnet 4 | Fast test generation with good coverage |
| **Merger** | Claude Sonnet 4 | Claude Sonnet 4 | Reliable git operations and conflict resolution |

---

### Claude Integration (Anthropic)

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **SDK** | @anthropic-ai/sdk | ^0.32.0 | Official SDK, full TypeScript support |
| **Models** | Claude Opus 4, Claude Sonnet 4 | Latest | Best-in-class reasoning and code generation |
| **Streaming** | Enabled | - | Real-time feedback to UI |
| **Tools** | Claude Tools API | - | Native tool calling for agent actions |

**Claude Client Implementation:**
```typescript
// src/orchestration/llm/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageCreateParams,
  MessageStream,
  Message,
  TextBlock,
  ToolUseBlock,
  ContentBlock
} from '@anthropic-ai/sdk/resources/messages';

// Model configuration
export const CLAUDE_MODELS = {
  OPUS_4: 'claude-opus-4-5-20250115',
  SONNET_4: 'claude-sonnet-4-5-20250115',
  HAIKU_4: 'claude-haiku-4-5-20250115',  // For simple tasks
} as const;

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];

// Default configurations per use case
export const MODEL_CONFIGS: Record<string, ClaudeModelConfig> = {
  planner: {
    model: CLAUDE_MODELS.OPUS_4,
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.9,
  },
  coder: {
    model: CLAUDE_MODELS.SONNET_4,
    maxTokens: 16384,
    temperature: 0.2,
    topP: 0.95,
  },
  tester: {
    model: CLAUDE_MODELS.SONNET_4,
    maxTokens: 8192,
    temperature: 0.2,
    topP: 0.9,
  },
  merger: {
    model: CLAUDE_MODELS.SONNET_4,
    maxTokens: 4096,
    temperature: 0.1,
    topP: 0.9,
  },
};

interface ClaudeModelConfig {
  model: ClaudeModel;
  maxTokens: number;
  temperature: number;
  topP?: number;
}

interface ClaudeClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

interface SendMessageOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  system?: string;
  tools?: Anthropic.Tool[];
  stopSequences?: string[];
  stream?: boolean;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

class ClaudeClient {
  private client: Anthropic;
  private defaultConfig: ClaudeModelConfig;

  // Rate limiting state
  private requestCount = 0;
  private tokenCount = 0;
  private windowStart = Date.now();
  private readonly rateWindow = 60000;  // 1 minute window
  private readonly maxRequestsPerMinute = 50;
  private readonly maxTokensPerMinute = 100000;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 120000,  // 2 minutes default
      maxRetries: config.maxRetries || 3,
    });

    this.defaultConfig = MODEL_CONFIGS.coder;
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    messages: ConversationMessage[],
    options: SendMessageOptions = {}
  ): Promise<Message> {
    await this.checkRateLimit();

    const params: MessageCreateParams = {
      model: options.model || this.defaultConfig.model,
      max_tokens: options.maxTokens || this.defaultConfig.maxTokens,
      temperature: options.temperature ?? this.defaultConfig.temperature,
      top_p: options.topP ?? this.defaultConfig.topP,
      messages: this.formatMessages(messages),
    };

    if (options.system) {
      params.system = options.system;
    }

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }

    if (options.stopSequences) {
      params.stop_sequences = options.stopSequences;
    }

    const response = await this.client.messages.create(params);

    // Track usage
    this.requestCount++;
    this.tokenCount += response.usage.input_tokens + response.usage.output_tokens;

    return response;
  }

  /**
   * Send a message with streaming response
   */
  async *streamMessage(
    messages: ConversationMessage[],
    options: SendMessageOptions = {}
  ): AsyncGenerator<string, Message, undefined> {
    await this.checkRateLimit();

    const params: MessageCreateParams = {
      model: options.model || this.defaultConfig.model,
      max_tokens: options.maxTokens || this.defaultConfig.maxTokens,
      temperature: options.temperature ?? this.defaultConfig.temperature,
      messages: this.formatMessages(messages),
      stream: true,
    };

    if (options.system) {
      params.system = options.system;
    }

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }

    const stream = this.client.messages.stream(params);

    let fullContent = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string };
        if (delta.type === 'text_delta' && delta.text) {
          fullContent += delta.text;
          yield delta.text;
        }
      }
    }

    // Get final message for usage tracking
    const finalMessage = await stream.finalMessage();
    this.requestCount++;
    this.tokenCount += finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;

    return finalMessage;
  }

  /**
   * Send a message with tool use capabilities
   */
  async sendWithTools(
    messages: ConversationMessage[],
    tools: Anthropic.Tool[],
    options: Omit<SendMessageOptions, 'tools'> = {}
  ): Promise<{
    message: Message;
    toolCalls: ToolUseBlock[];
  }> {
    const response = await this.sendMessage(messages, {
      ...options,
      tools,
    });

    const toolCalls = response.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    );

    return {
      message: response,
      toolCalls,
    };
  }

  /**
   * Continue a conversation with tool results
   */
  async continueWithToolResults(
    originalMessages: ConversationMessage[],
    assistantMessage: Message,
    toolResults: Array<{
      toolUseId: string;
      result: string;
      isError?: boolean;
    }>,
    options: SendMessageOptions = {}
  ): Promise<Message> {
    // Build the continuation messages
    const messages: ConversationMessage[] = [
      ...originalMessages,
      {
        role: 'assistant',
        content: assistantMessage.content,
      },
      {
        role: 'user',
        content: toolResults.map(result => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolUseId,
          content: result.result,
          is_error: result.isError,
        })),
      },
    ];

    return this.sendMessage(messages, options);
  }

  /**
   * Extract text content from a message
   */
  extractText(message: Message): string {
    return message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart > this.rateWindow) {
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = now;
    }

    // Check limits
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.rateWindow - (now - this.windowStart);
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = Date.now();
    }

    if (this.tokenCount >= this.maxTokensPerMinute) {
      const waitTime = this.rateWindow - (now - this.windowStart);
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = Date.now();
    }
  }

  private formatMessages(messages: ConversationMessage[]): Anthropic.MessageParam[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): { requests: number; tokens: number; windowStart: Date } {
    return {
      requests: this.requestCount,
      tokens: this.tokenCount,
      windowStart: new Date(this.windowStart),
    };
  }

  /**
   * Set default configuration for this client
   */
  setDefaultConfig(config: Partial<ClaudeModelConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

export function createClaudeClient(config: ClaudeClientConfig): ClaudeClient {
  return new ClaudeClient(config);
}
```

**Claude Tools Definition:**
```typescript
// src/orchestration/llm/claude-tools.ts
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Define tools available to Claude agents
 */
export const NEXUS_TOOLS: Record<string, Tool> = {
  // File system tools
  readFile: {
    name: 'read_file',
    description: 'Read the contents of a file at the given path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to read',
        },
        startLine: {
          type: 'number',
          description: 'Optional line number to start reading from (1-indexed)',
        },
        endLine: {
          type: 'number',
          description: 'Optional line number to stop reading at (inclusive)',
        },
      },
      required: ['path'],
    },
  },

  writeFile: {
    name: 'write_file',
    description: 'Write content to a file, creating directories if needed',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to write the file to',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },

  editFile: {
    name: 'edit_file',
    description: 'Edit a file by replacing a specific string with new content',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to edit',
        },
        oldString: {
          type: 'string',
          description: 'The exact string to find and replace',
        },
        newString: {
          type: 'string',
          description: 'The string to replace it with',
        },
      },
      required: ['path', 'oldString', 'newString'],
    },
  },

  // Search tools
  searchFiles: {
    name: 'search_files',
    description: 'Search for files matching a glob pattern',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match (e.g., "**/*.ts", "src/**/*.tsx")',
        },
        cwd: {
          type: 'string',
          description: 'Directory to search from (defaults to project root)',
        },
      },
      required: ['pattern'],
    },
  },

  searchContent: {
    name: 'search_content',
    description: 'Search file contents for a regex pattern',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Directory or file to search in',
        },
        fileType: {
          type: 'string',
          description: 'File type filter (e.g., "ts", "tsx", "json")',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Whether search is case-sensitive (default: false)',
        },
      },
      required: ['pattern'],
    },
  },

  // Terminal tools
  runCommand: {
    name: 'run_command',
    description: 'Run a terminal command and return the output',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The command to run',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000)',
        },
      },
      required: ['command'],
    },
  },

  // Memory tools
  queryMemory: {
    name: 'query_memory',
    description: 'Query the semantic memory system for relevant past experiences',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query for semantic search',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
        filter: {
          type: 'object',
          description: 'Optional filters (e.g., { type: "error", project: "nexus" })',
        },
      },
      required: ['query'],
    },
  },

  // Task tools
  updateTaskStatus: {
    name: 'update_task_status',
    description: 'Update the status of the current task',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['in-progress', 'blocked', 'completed', 'failed'],
          description: 'The new status for the task',
        },
        message: {
          type: 'string',
          description: 'Status message or reason',
        },
        progress: {
          type: 'number',
          description: 'Progress percentage (0-100)',
        },
      },
      required: ['status'],
    },
  },

  requestReview: {
    name: 'request_review',
    description: 'Request a code review for completed changes',
    input_schema: {
      type: 'object' as const,
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of changed files to review',
        },
        summary: {
          type: 'string',
          description: 'Summary of changes made',
        },
      },
      required: ['files', 'summary'],
    },
  },
};

/**
 * Get tools for a specific agent type
 */
export function getToolsForAgent(agentType: string): Tool[] {
  const toolSets: Record<string, string[]> = {
    planner: ['read_file', 'search_files', 'search_content', 'query_memory'],
    coder: ['read_file', 'write_file', 'edit_file', 'search_files', 'search_content', 'run_command', 'query_memory', 'update_task_status', 'request_review'],
    reviewer: ['read_file', 'search_files', 'search_content', 'run_command', 'query_memory'],
    tester: ['read_file', 'write_file', 'edit_file', 'search_files', 'search_content', 'run_command', 'query_memory', 'update_task_status'],
    merger: ['read_file', 'search_files', 'run_command', 'update_task_status'],
  };

  const toolNames = toolSets[agentType] || [];
  return toolNames
    .map(name => NEXUS_TOOLS[name])
    .filter((tool): tool is Tool => tool !== undefined);
}
```

---

### Gemini Integration (Google)

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **SDK** | @google/generative-ai | ^0.21.0 | Official SDK, TypeScript support |
| **Models** | Gemini 2.5 Pro | Latest | Different perspective for code review |
| **Primary Use** | Code review, research | - | Provides unbiased second opinion |
| **Streaming** | Enabled | - | Real-time feedback for long reviews |

**Gemini Client Implementation:**
```typescript
// src/orchestration/llm/gemini-client.ts
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerateContentRequest,
  GenerateContentResult,
  Content,
  Part,
  FunctionDeclaration,
  Tool as GeminiTool,
} from '@google/generative-ai';

// Model configuration
export const GEMINI_MODELS = {
  PRO_2_5: 'gemini-2.5-pro-preview-05-06',
  PRO_2_0: 'gemini-2.0-pro-exp',
  FLASH_2_0: 'gemini-2.0-flash',          // Fast, for simple tasks
  FLASH_THINKING: 'gemini-2.0-flash-thinking-exp',  // For complex reasoning
} as const;

export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];

interface GeminiModelConfig {
  model: GeminiModel;
  maxOutputTokens: number;
  temperature: number;
  topP?: number;
  topK?: number;
}

interface GeminiClientConfig {
  apiKey: string;
  timeout?: number;
}

interface SendMessageOptions {
  model?: GeminiModel;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
  tools?: GeminiTool[];
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: Part[];
}

// Default configurations
const MODEL_CONFIGS: Record<string, GeminiModelConfig> = {
  reviewer: {
    model: GEMINI_MODELS.PRO_2_5,
    maxOutputTokens: 8192,
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
  },
  researcher: {
    model: GEMINI_MODELS.PRO_2_5,
    maxOutputTokens: 16384,
    temperature: 0.7,  // Higher for creative research
    topP: 0.95,
    topK: 64,
  },
  reasoning: {
    model: GEMINI_MODELS.FLASH_THINKING,
    maxOutputTokens: 32768,
    temperature: 0.5,
    topP: 0.9,
  },
};

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private defaultConfig: GeminiModelConfig;
  private models: Map<GeminiModel, GenerativeModel> = new Map();

  // Rate limiting
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly rateWindow = 60000;
  private readonly maxRequestsPerMinute = 60;

  constructor(config: GeminiClientConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.defaultConfig = MODEL_CONFIGS.reviewer;
  }

  /**
   * Get or create a model instance
   */
  private getModel(
    modelName: GeminiModel,
    options: SendMessageOptions = {}
  ): GenerativeModel {
    const cacheKey = modelName;

    // Don't cache - configuration may differ
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens || this.defaultConfig.maxOutputTokens,
        temperature: options.temperature ?? this.defaultConfig.temperature,
        topP: options.topP ?? this.defaultConfig.topP,
        topK: options.topK ?? this.defaultConfig.topK,
      },
      systemInstruction: options.systemInstruction,
      tools: options.tools,
    });

    return model;
  }

  /**
   * Send a single message and get response
   */
  async sendMessage(
    content: string | Part[],
    options: SendMessageOptions = {}
  ): Promise<GenerateContentResult> {
    await this.checkRateLimit();

    const model = this.getModel(
      options.model || this.defaultConfig.model,
      options
    );

    const parts: Part[] = typeof content === 'string'
      ? [{ text: content }]
      : content;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    this.requestCount++;
    return result;
  }

  /**
   * Send with streaming response
   */
  async *streamMessage(
    content: string | Part[],
    options: SendMessageOptions = {}
  ): AsyncGenerator<string, GenerateContentResult, undefined> {
    await this.checkRateLimit();

    const model = this.getModel(
      options.model || this.defaultConfig.model,
      options
    );

    const parts: Part[] = typeof content === 'string'
      ? [{ text: content }]
      : content;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts }],
    });

    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      yield text;
    }

    this.requestCount++;
    return await result.response;
  }

  /**
   * Multi-turn conversation
   */
  async chat(
    history: ChatMessage[],
    newMessage: string | Part[],
    options: SendMessageOptions = {}
  ): Promise<GenerateContentResult> {
    await this.checkRateLimit();

    const model = this.getModel(
      options.model || this.defaultConfig.model,
      options
    );

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      })),
    });

    const parts: Part[] = typeof newMessage === 'string'
      ? [{ text: newMessage }]
      : newMessage;

    const result = await chat.sendMessage(parts);

    this.requestCount++;
    return result;
  }

  /**
   * Code review specific method
   */
  async reviewCode(params: {
    diff: string;
    context: string;
    taskDescription: string;
    reviewCriteria?: string[];
  }): Promise<{
    approved: boolean;
    issues: Array<{ severity: 'error' | 'warning' | 'info'; file: string; line?: number; message: string }>;
    suggestions: string[];
    summary: string;
  }> {
    const defaultCriteria = [
      'Code correctness and logic',
      'Error handling',
      'TypeScript best practices',
      'Security vulnerabilities',
      'Performance concerns',
      'Code readability and maintainability',
    ];

    const systemPrompt = `You are a senior code reviewer for the Nexus AI Builder project.
Your role is to provide thorough, constructive code reviews that improve code quality.

## Review Criteria
${(params.reviewCriteria || defaultCriteria).map(c => `- ${c}`).join('\n')}

## Task Context
${params.taskDescription}

## Codebase Context
${params.context}

## Response Format
Respond with a JSON object containing:
- approved: boolean (true if code is acceptable with at most minor suggestions)
- issues: array of { severity: "error"|"warning"|"info", file: string, line?: number, message: string }
- suggestions: array of improvement suggestions (strings)
- summary: brief overall assessment (string)

Be thorough but fair. Focus on substantive issues, not style nitpicks.`;

    const result = await this.sendMessage(
      `Please review the following code changes:\n\n\`\`\`diff\n${params.diff}\n\`\`\``,
      {
        model: GEMINI_MODELS.PRO_2_5,
        temperature: 0.2,  // Lower for consistent reviews
        systemInstruction: systemPrompt,
      }
    );

    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback if JSON extraction fails
      return {
        approved: false,
        issues: [{ severity: 'error', file: 'unknown', message: 'Failed to parse review response' }],
        suggestions: [],
        summary: text,
      };
    }

    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      return {
        approved: false,
        issues: [{ severity: 'error', file: 'unknown', message: 'Invalid JSON in review response' }],
        suggestions: [],
        summary: text,
      };
    }
  }

  /**
   * Research assistant method
   */
  async research(params: {
    query: string;
    context?: string;
    maxDepth?: number;
  }): Promise<{
    findings: string[];
    recommendations: string[];
    references: string[];
    confidence: 'high' | 'medium' | 'low';
  }> {
    const systemPrompt = `You are a research assistant for the Nexus AI Builder project.
Analyze the query and provide well-reasoned findings based on the context provided.

${params.context ? `## Context\n${params.context}` : ''}

## Response Format
Respond with a JSON object containing:
- findings: array of key findings (strings)
- recommendations: array of actionable recommendations (strings)
- references: array of relevant references or code locations (strings)
- confidence: overall confidence level ("high"|"medium"|"low")`;

    const result = await this.sendMessage(params.query, {
      model: GEMINI_MODELS.PRO_2_5,
      temperature: 0.5,
      systemInstruction: systemPrompt,
    });

    const text = result.response.text();
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        findings: [text],
        recommendations: [],
        references: [],
        confidence: 'low',
      };
    }

    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      return {
        findings: [text],
        recommendations: [],
        references: [],
        confidence: 'low',
      };
    }
  }

  /**
   * Extract text from result
   */
  extractText(result: GenerateContentResult): string {
    return result.response.text();
  }

  /**
   * Rate limit check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart > this.rateWindow) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.rateWindow - (now - this.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }

  /**
   * Set default configuration
   */
  setDefaultConfig(configName: keyof typeof MODEL_CONFIGS): void {
    if (MODEL_CONFIGS[configName]) {
      this.defaultConfig = MODEL_CONFIGS[configName];
    }
  }

  /**
   * Get usage stats
   */
  getUsageStats(): { requests: number; windowStart: Date } {
    return {
      requests: this.requestCount,
      windowStart: new Date(this.windowStart),
    };
  }
}

export function createGeminiClient(config: GeminiClientConfig): GeminiClient {
  return new GeminiClient(config);
}
```

---

### OpenAI Integration (Embeddings Only)

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **SDK** | openai | ^4.72.0 | Official SDK, widely adopted |
| **Model** | text-embedding-3-small | Latest | Best cost/performance for embeddings |
| **Use Case** | Semantic search, memory | - | Embeddings only, not chat |
| **Fallback** | @xenova/transformers | - | Local embeddings if API unavailable |

**OpenAI Embeddings Client:**
```typescript
// src/orchestration/llm/openai-embeddings.ts
import OpenAI from 'openai';

export const EMBEDDING_MODELS = {
  SMALL: 'text-embedding-3-small',    // 1536 dimensions, cheapest
  LARGE: 'text-embedding-3-large',    // 3072 dimensions, highest quality
  ADA: 'text-embedding-ada-002',      // Legacy, 1536 dimensions
} as const;

export type EmbeddingModel = typeof EMBEDDING_MODELS[keyof typeof EMBEDDING_MODELS];

interface EmbeddingClientConfig {
  apiKey: string;
  baseUrl?: string;
  model?: EmbeddingModel;
  dimensions?: number;  // For text-embedding-3-* models
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

class OpenAIEmbeddingsClient {
  private client: OpenAI;
  private model: EmbeddingModel;
  private dimensions?: number;

  // Rate limiting
  private requestCount = 0;
  private tokenCount = 0;
  private windowStart = Date.now();
  private readonly rateWindow = 60000;
  private readonly maxRequestsPerMinute = 500;
  private readonly maxTokensPerMinute = 1000000;

  constructor(config: EmbeddingClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model || EMBEDDING_MODELS.SMALL;
    this.dimensions = config.dimensions;
  }

  /**
   * Get embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingResult> {
    await this.checkRateLimit();

    const params: OpenAI.EmbeddingCreateParams = {
      model: this.model,
      input: text,
    };

    // text-embedding-3-* models support custom dimensions
    if (this.dimensions && this.model.includes('text-embedding-3')) {
      params.dimensions = this.dimensions;
    }

    const response = await this.client.embeddings.create(params);

    this.requestCount++;
    this.tokenCount += response.usage.total_tokens;

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Get embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    await this.checkRateLimit();

    // OpenAI supports up to 2048 inputs per request
    const MAX_BATCH_SIZE = 2048;

    if (texts.length > MAX_BATCH_SIZE) {
      // Process in chunks
      const results: number[][] = [];
      let totalPromptTokens = 0;
      let totalTokens = 0;
      let lastModel = '';

      for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const chunk = texts.slice(i, i + MAX_BATCH_SIZE);
        const chunkResult = await this.embedBatchInternal(chunk);
        results.push(...chunkResult.embeddings);
        totalPromptTokens += chunkResult.usage.promptTokens;
        totalTokens += chunkResult.usage.totalTokens;
        lastModel = chunkResult.model;
      }

      return {
        embeddings: results,
        model: lastModel,
        usage: {
          promptTokens: totalPromptTokens,
          totalTokens: totalTokens,
        },
      };
    }

    return this.embedBatchInternal(texts);
  }

  private async embedBatchInternal(texts: string[]): Promise<BatchEmbeddingResult> {
    const params: OpenAI.EmbeddingCreateParams = {
      model: this.model,
      input: texts,
    };

    if (this.dimensions && this.model.includes('text-embedding-3')) {
      params.dimensions = this.dimensions;
    }

    const response = await this.client.embeddings.create(params);

    this.requestCount++;
    this.tokenCount += response.usage.total_tokens;

    // Sort by index to ensure correct order
    const sortedData = response.data.sort((a, b) => a.index - b.index);

    return {
      embeddings: sortedData.map(d => d.embedding),
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar items from a list
   */
  findSimilar(
    queryEmbedding: number[],
    candidates: Array<{ id: string; embedding: number[] }>,
    topK: number = 5,
    minSimilarity: number = 0.5
  ): Array<{ id: string; similarity: number }> {
    const scored = candidates.map(candidate => ({
      id: candidate.id,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
    }));

    return scored
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Rate limit checking
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart > this.rateWindow) {
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute ||
        this.tokenCount >= this.maxTokensPerMinute) {
      const waitTime = this.rateWindow - (now - this.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = Date.now();
    }
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): { requests: number; tokens: number; windowStart: Date } {
    return {
      requests: this.requestCount,
      tokens: this.tokenCount,
      windowStart: new Date(this.windowStart),
    };
  }

  /**
   * Get embedding dimensions for current model
   */
  getDimensions(): number {
    if (this.dimensions) return this.dimensions;

    switch (this.model) {
      case EMBEDDING_MODELS.LARGE:
        return 3072;
      case EMBEDDING_MODELS.SMALL:
      case EMBEDDING_MODELS.ADA:
      default:
        return 1536;
    }
  }
}

export function createOpenAIEmbeddingsClient(
  config: EmbeddingClientConfig
): OpenAIEmbeddingsClient {
  return new OpenAIEmbeddingsClient(config);
}
```

---

### Unified LLM Provider

A unified interface that abstracts over all LLM providers:

```typescript
// src/orchestration/llm/llm-provider.ts
import { createClaudeClient, ClaudeModel, CLAUDE_MODELS } from './claude-client';
import { createGeminiClient, GeminiModel, GEMINI_MODELS } from './gemini-client';
import { createOpenAIEmbeddingsClient, EmbeddingModel, EMBEDDING_MODELS } from './openai-embeddings';

type Provider = 'anthropic' | 'google' | 'openai';
type ModelType = ClaudeModel | GeminiModel | EmbeddingModel;

interface LLMProviderConfig {
  anthropic?: {
    apiKey: string;
    baseUrl?: string;
  };
  google?: {
    apiKey: string;
  };
  openai?: {
    apiKey: string;
    baseUrl?: string;
  };
  defaultProvider?: Provider;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  provider?: Provider;
  model?: ModelType;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  stream?: boolean;
}

interface CompletionResult {
  content: string;
  provider: Provider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

class UnifiedLLMProvider {
  private claudeClient?: ReturnType<typeof createClaudeClient>;
  private geminiClient?: ReturnType<typeof createGeminiClient>;
  private embeddingsClient?: ReturnType<typeof createOpenAIEmbeddingsClient>;
  private defaultProvider: Provider;

  constructor(config: LLMProviderConfig) {
    if (config.anthropic) {
      this.claudeClient = createClaudeClient(config.anthropic);
    }
    if (config.google) {
      this.geminiClient = createGeminiClient(config.google);
    }
    if (config.openai) {
      this.embeddingsClient = createOpenAIEmbeddingsClient(config.openai);
    }
    this.defaultProvider = config.defaultProvider || 'anthropic';
  }

  /**
   * Send a completion request to the appropriate provider
   */
  async complete(
    messages: Message[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const provider = options.provider || this.defaultProvider;

    switch (provider) {
      case 'anthropic':
        return this.completeWithClaude(messages, options);
      case 'google':
        return this.completeWithGemini(messages, options);
      default:
        throw new Error(`Provider ${provider} does not support chat completions`);
    }
  }

  /**
   * Stream a completion response
   */
  async *stream(
    messages: Message[],
    options: CompletionOptions = {}
  ): AsyncGenerator<string, CompletionResult, undefined> {
    const provider = options.provider || this.defaultProvider;

    switch (provider) {
      case 'anthropic':
        return yield* this.streamWithClaude(messages, options);
      case 'google':
        return yield* this.streamWithGemini(messages, options);
      default:
        throw new Error(`Provider ${provider} does not support streaming`);
    }
  }

  /**
   * Get embeddings for text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.embeddingsClient) {
      throw new Error('OpenAI client not configured for embeddings');
    }
    const result = await this.embeddingsClient.embed(text);
    return result.embedding;
  }

  /**
   * Get embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.embeddingsClient) {
      throw new Error('OpenAI client not configured for embeddings');
    }
    const result = await this.embeddingsClient.embedBatch(texts);
    return result.embeddings;
  }

  private async completeWithClaude(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.claudeClient) {
      throw new Error('Anthropic client not configured');
    }

    const result = await this.claudeClient.sendMessage(messages, {
      model: options.model as ClaudeModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      system: options.system,
    });

    return {
      content: this.claudeClient.extractText(result),
      provider: 'anthropic',
      model: result.model,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
    };
  }

  private async *streamWithClaude(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<string, CompletionResult, undefined> {
    if (!this.claudeClient) {
      throw new Error('Anthropic client not configured');
    }

    const stream = this.claudeClient.streamMessage(messages, {
      model: options.model as ClaudeModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      system: options.system,
    });

    let result;
    for await (const chunk of stream) {
      yield chunk;
      result = chunk;
    }

    // Get final result
    const finalMessage = await stream.next();
    const msg = finalMessage.value;

    return {
      content: this.claudeClient.extractText(msg),
      provider: 'anthropic',
      model: msg.model,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
    };
  }

  private async completeWithGemini(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.geminiClient) {
      throw new Error('Google client not configured');
    }

    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1];
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }));

    const result = await this.geminiClient.chat(
      history,
      lastMessage.content,
      {
        model: options.model as GeminiModel,
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        systemInstruction: options.system,
      }
    );

    return {
      content: this.geminiClient.extractText(result),
      provider: 'google',
      model: options.model || GEMINI_MODELS.PRO_2_5,
      usage: {
        inputTokens: 0,  // Gemini doesn't report this in same way
        outputTokens: 0,
      },
    };
  }

  private async *streamWithGemini(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<string, CompletionResult, undefined> {
    if (!this.geminiClient) {
      throw new Error('Google client not configured');
    }

    const lastMessage = messages[messages.length - 1];
    const stream = this.geminiClient.streamMessage(lastMessage.content, {
      model: options.model as GeminiModel,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      systemInstruction: options.system,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
      yield chunk;
    }

    return {
      content: fullContent,
      provider: 'google',
      model: options.model || GEMINI_MODELS.PRO_2_5,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: Provider): boolean {
    switch (provider) {
      case 'anthropic':
        return !!this.claudeClient;
      case 'google':
        return !!this.geminiClient;
      case 'openai':
        return !!this.embeddingsClient;
    }
  }

  /**
   * Get usage stats across all providers
   */
  getUsageStats(): Record<Provider, { requests: number; tokens?: number }> {
    const stats: Record<string, any> = {};

    if (this.claudeClient) {
      const claudeStats = this.claudeClient.getUsageStats();
      stats.anthropic = { requests: claudeStats.requests, tokens: claudeStats.tokens };
    }

    if (this.geminiClient) {
      const geminiStats = this.geminiClient.getUsageStats();
      stats.google = { requests: geminiStats.requests };
    }

    if (this.embeddingsClient) {
      const openaiStats = this.embeddingsClient.getUsageStats();
      stats.openai = { requests: openaiStats.requests, tokens: openaiStats.tokens };
    }

    return stats as Record<Provider, { requests: number; tokens?: number }>;
  }
}

export function createLLMProvider(config: LLMProviderConfig): UnifiedLLMProvider {
  return new UnifiedLLMProvider(config);
}

// Export model constants
export { CLAUDE_MODELS, GEMINI_MODELS, EMBEDDING_MODELS };
```

---

### Token Management & Cost Optimization

```typescript
// src/orchestration/llm/token-manager.ts

/**
 * Token pricing (as of Jan 2025)
 */
export const TOKEN_PRICING = {
  anthropic: {
    'claude-opus-4-5-20250115': {
      input: 15.00 / 1_000_000,   // $15 per 1M input tokens
      output: 75.00 / 1_000_000,  // $75 per 1M output tokens
    },
    'claude-sonnet-4-5-20250115': {
      input: 3.00 / 1_000_000,    // $3 per 1M input tokens
      output: 15.00 / 1_000_000,  // $15 per 1M output tokens
    },
    'claude-haiku-4-5-20250115': {
      input: 0.25 / 1_000_000,    // $0.25 per 1M input tokens
      output: 1.25 / 1_000_000,   // $1.25 per 1M output tokens
    },
  },
  google: {
    'gemini-2.5-pro-preview-05-06': {
      input: 1.25 / 1_000_000,    // $1.25 per 1M input tokens (<200k)
      output: 10.00 / 1_000_000,  // $10 per 1M output tokens
    },
    'gemini-2.0-flash': {
      input: 0.10 / 1_000_000,    // $0.10 per 1M input tokens
      output: 0.40 / 1_000_000,   // $0.40 per 1M output tokens
    },
  },
  openai: {
    'text-embedding-3-small': {
      input: 0.02 / 1_000_000,    // $0.02 per 1M tokens
    },
    'text-embedding-3-large': {
      input: 0.13 / 1_000_000,    // $0.13 per 1M tokens
    },
  },
} as const;

interface TokenUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byProvider: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  byModel: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

class TokenManager {
  private usageHistory: TokenUsage[] = [];
  private budgetLimit?: number;
  private budgetWarningThreshold = 0.8;

  constructor(options?: { budgetLimit?: number }) {
    this.budgetLimit = options?.budgetLimit;
  }

  /**
   * Record token usage
   */
  recordUsage(params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): void {
    const cost = this.calculateCost(
      params.provider,
      params.model,
      params.inputTokens,
      params.outputTokens
    );

    this.usageHistory.push({
      ...params,
      cost,
      timestamp: new Date(),
    });

    // Check budget
    if (this.budgetLimit) {
      const totalCost = this.getTotalCost();
      if (totalCost >= this.budgetLimit * this.budgetWarningThreshold) {
        console.warn(`Token budget warning: ${((totalCost / this.budgetLimit) * 100).toFixed(1)}% used`);
      }
      if (totalCost >= this.budgetLimit) {
        throw new Error(`Token budget exceeded: $${totalCost.toFixed(2)} >= $${this.budgetLimit}`);
      }
    }
  }

  /**
   * Calculate cost for given usage
   */
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = (TOKEN_PRICING as any)[provider];
    if (!providerPricing) return 0;

    const modelPricing = providerPricing[model];
    if (!modelPricing) return 0;

    const inputCost = inputTokens * modelPricing.input;
    const outputCost = outputTokens * (modelPricing.output || 0);

    return inputCost + outputCost;
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    return this.usageHistory.reduce((sum, usage) => sum + usage.cost, 0);
  }

  /**
   * Get usage summary
   */
  getSummary(since?: Date): UsageSummary {
    let history = this.usageHistory;
    if (since) {
      history = history.filter(u => u.timestamp >= since);
    }

    const summary: UsageSummary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
    };

    for (const usage of history) {
      summary.totalInputTokens += usage.inputTokens;
      summary.totalOutputTokens += usage.outputTokens;
      summary.totalCost += usage.cost;

      // By provider
      if (!summary.byProvider[usage.provider]) {
        summary.byProvider[usage.provider] = { inputTokens: 0, outputTokens: 0, cost: 0 };
      }
      summary.byProvider[usage.provider].inputTokens += usage.inputTokens;
      summary.byProvider[usage.provider].outputTokens += usage.outputTokens;
      summary.byProvider[usage.provider].cost += usage.cost;

      // By model
      if (!summary.byModel[usage.model]) {
        summary.byModel[usage.model] = { inputTokens: 0, outputTokens: 0, cost: 0 };
      }
      summary.byModel[usage.model].inputTokens += usage.inputTokens;
      summary.byModel[usage.model].outputTokens += usage.outputTokens;
      summary.byModel[usage.model].cost += usage.cost;
    }

    return summary;
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(params: {
    provider: string;
    model: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
  }): number {
    return this.calculateCost(
      params.provider,
      params.model,
      params.estimatedInputTokens,
      params.estimatedOutputTokens
    );
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): {
    budgetLimit?: number;
    used: number;
    remaining?: number;
    percentUsed?: number;
  } {
    const used = this.getTotalCost();
    return {
      budgetLimit: this.budgetLimit,
      used,
      remaining: this.budgetLimit ? this.budgetLimit - used : undefined,
      percentUsed: this.budgetLimit ? (used / this.budgetLimit) * 100 : undefined,
    };
  }

  /**
   * Set budget limit
   */
  setBudgetLimit(limit: number): void {
    this.budgetLimit = limit;
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory = [];
  }

  /**
   * Export usage data
   */
  exportUsage(): TokenUsage[] {
    return [...this.usageHistory];
  }
}

export const tokenManager = new TokenManager();
```

---

### Model Selection Logic

```typescript
// src/orchestration/llm/model-selector.ts
import { CLAUDE_MODELS, GEMINI_MODELS } from './llm-provider';

type TaskComplexity = 'simple' | 'moderate' | 'complex';
type TaskType = 'planning' | 'coding' | 'review' | 'testing' | 'merging' | 'research';

interface ModelRecommendation {
  primary: {
    provider: string;
    model: string;
  };
  fallback: {
    provider: string;
    model: string;
  };
  rationale: string;
}

/**
 * Model selection matrix based on task characteristics
 */
const MODEL_MATRIX: Record<TaskType, Record<TaskComplexity, ModelRecommendation>> = {
  planning: {
    simple: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      rationale: 'Simple planning can use Sonnet for cost efficiency',
    },
    moderate: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate planning needs Sonnet reasoning capabilities',
    },
    complex: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.OPUS_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Complex planning requires Opus for deep reasoning',
    },
  },
  coding: {
    simple: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      rationale: 'Simple coding tasks can use Sonnet effectively',
    },
    moderate: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate coding needs Sonnet for quality code',
    },
    complex: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.OPUS_4 },
      rationale: 'Complex coding still uses Sonnet, with Opus fallback for edge cases',
    },
  },
  review: {
    simple: {
      primary: { provider: 'google', model: GEMINI_MODELS.PRO_2_5 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      rationale: 'Simple reviews use Gemini for different perspective',
    },
    moderate: {
      primary: { provider: 'google', model: GEMINI_MODELS.PRO_2_5 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate reviews benefit from Gemini analysis',
    },
    complex: {
      primary: { provider: 'google', model: GEMINI_MODELS.PRO_2_5 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Complex reviews need thorough Gemini analysis',
    },
  },
  testing: {
    simple: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Simple tests can use Haiku for speed',
    },
    moderate: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate tests need Sonnet for coverage',
    },
    complex: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Complex tests require Sonnet for edge cases',
    },
  },
  merging: {
    simple: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Simple merges use Haiku for fast operations',
    },
    moderate: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate merges need Sonnet for conflict resolution',
    },
    complex: {
      primary: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.OPUS_4 },
      rationale: 'Complex merges may need Opus for sophisticated resolution',
    },
  },
  research: {
    simple: {
      primary: { provider: 'google', model: GEMINI_MODELS.FLASH_2_0 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.HAIKU_4 },
      rationale: 'Simple research uses Flash for speed',
    },
    moderate: {
      primary: { provider: 'google', model: GEMINI_MODELS.PRO_2_5 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.SONNET_4 },
      rationale: 'Moderate research needs Pro for depth',
    },
    complex: {
      primary: { provider: 'google', model: GEMINI_MODELS.PRO_2_5 },
      fallback: { provider: 'anthropic', model: CLAUDE_MODELS.OPUS_4 },
      rationale: 'Complex research benefits from Gemini context window',
    },
  },
};

/**
 * Determine task complexity based on characteristics
 */
export function assessComplexity(params: {
  taskDescription: string;
  filesAffected: number;
  estimatedTime: number;
  hasDependencies: boolean;
  requiresArchitecturalDecisions: boolean;
}): TaskComplexity {
  let score = 0;

  // File count factor
  if (params.filesAffected <= 2) score += 0;
  else if (params.filesAffected <= 5) score += 1;
  else score += 2;

  // Time estimate factor
  if (params.estimatedTime <= 10) score += 0;
  else if (params.estimatedTime <= 20) score += 1;
  else score += 2;

  // Dependencies factor
  if (params.hasDependencies) score += 1;

  // Architectural factor
  if (params.requiresArchitecturalDecisions) score += 2;

  // Description length/complexity proxy
  if (params.taskDescription.length > 500) score += 1;

  // Map score to complexity
  if (score <= 2) return 'simple';
  if (score <= 5) return 'moderate';
  return 'complex';
}

/**
 * Get model recommendation for a task
 */
export function selectModel(
  taskType: TaskType,
  complexity: TaskComplexity
): ModelRecommendation {
  return MODEL_MATRIX[taskType][complexity];
}

/**
 * Get model recommendation with fallback chain
 */
export function selectModelWithFallbacks(
  taskType: TaskType,
  complexity: TaskComplexity,
  availableProviders: string[]
): ModelRecommendation {
  const recommendation = MODEL_MATRIX[taskType][complexity];

  // Check if primary provider is available
  if (availableProviders.includes(recommendation.primary.provider)) {
    return recommendation;
  }

  // Check if fallback provider is available
  if (availableProviders.includes(recommendation.fallback.provider)) {
    return {
      ...recommendation,
      primary: recommendation.fallback,
      rationale: `${recommendation.rationale} (using fallback due to provider availability)`,
    };
  }

  // Ultimate fallback - use whatever is available
  const fallbackProvider = availableProviders[0];
  return {
    primary: {
      provider: fallbackProvider,
      model: fallbackProvider === 'anthropic'
        ? CLAUDE_MODELS.SONNET_4
        : GEMINI_MODELS.PRO_2_5,
    },
    fallback: {
      provider: fallbackProvider,
      model: fallbackProvider === 'anthropic'
        ? CLAUDE_MODELS.HAIKU_4
        : GEMINI_MODELS.FLASH_2_0,
    },
    rationale: 'Using available provider as fallback',
  };
}
```

---

### Part D Completion

- [x] Claude Integration documented (@anthropic-ai/sdk, models, streaming, tools API)
- [x] Gemini Integration documented (@google/generative-ai, code review, research)
- [x] OpenAI Integration documented (embeddings only, with batch support)
- [x] Unified LLM Provider documented (abstraction layer over all providers)
- [x] Token Management documented (cost tracking, budget limits)
- [x] Model Selection Logic documented (task-based selection matrix)

---

## Part E: Development Tools

This section documents the development tools, testing frameworks, linting configuration, and build tools for Nexus.

---

### Testing Framework

#### Primary: Vitest

Vitest is the primary testing framework for Nexus, chosen for its:
- Native TypeScript support
- ESM-first design
- Fast execution with built-in watch mode
- Jest-compatible API (easy migration)
- Excellent monorepo support

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'node',
    environmentMatchGlobs: [
      // Use jsdom for UI tests
      ['src/ui/**/*.test.{ts,tsx}', 'jsdom'],
      // Use happy-dom for faster component tests
      ['src/ui/**/*.spec.{ts,tsx}', 'happy-dom'],
    ],

    // Global configuration
    globals: true,
    root: '.',

    // Include patterns
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'tests/**/*.test.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.git',
      'tests/e2e/**', // Handled by Playwright
    ],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',

      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Per-layer thresholds
        'src/persistence/**': {
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'src/orchestration/**': {
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },

      // Files to include in coverage
      include: ['src/**/*.ts', 'src/**/*.tsx'],

      // Files to exclude from coverage
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/types/**',
      ],
    },

    // Test setup
    setupFiles: [
      './tests/setup.ts',
      './tests/mocks/setup.ts',
    ],

    // Alias resolution
    alias: {
      '@': resolve(__dirname, './src'),
      '@ui': resolve(__dirname, './src/ui'),
      '@orchestration': resolve(__dirname, './src/orchestration'),
      '@planning': resolve(__dirname, './src/planning'),
      '@execution': resolve(__dirname, './src/execution'),
      '@quality': resolve(__dirname, './src/quality'),
      '@persistence': resolve(__dirname, './src/persistence'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@shared': resolve(__dirname, './src/shared'),
      '@tests': resolve(__dirname, './tests'),
    },

    // Reporter configuration
    reporters: ['default', 'html', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
      html: './test-results/html/index.html',
    },

    // Parallelization
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        maxThreads: 8,
        minThreads: 1,
      },
    },

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,

    // Watch mode configuration
    watch: true,
    watchExclude: ['node_modules', 'dist', '.git'],

    // Snapshot configuration
    snapshotFormat: {
      indent: 2,
      escapeString: false,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

---

#### Test Setup Files

```typescript
// tests/setup.ts
/**
 * Global test setup for Nexus
 */
import { beforeAll, afterAll, vi } from 'vitest';
import { createTestDatabase } from './utils/database';
import { mockFileSystem } from './mocks/fs';

// Global test database
let testDb: ReturnType<typeof createTestDatabase>;

beforeAll(async () => {
  // Initialize test database
  testDb = await createTestDatabase();

  // Mock file system for tests that don't need real FS
  if (process.env.MOCK_FS !== 'false') {
    mockFileSystem();
  }

  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXUS_DATA_DIR = '/tmp/nexus-test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Cleanup test database
  await testDb?.cleanup();

  // Clear all mocks
  vi.clearAllMocks();
});

// Increase timeout for integration tests
vi.setConfig({ testTimeout: 30000 });

// Global expect extensions
expect.extend({
  toBeValidTask(received) {
    const pass =
      received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      received.status !== undefined;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid task`
          : `Expected ${JSON.stringify(received)} to be a valid task`,
    };
  },

  toHaveAllRequiredFields(received, fields: string[]) {
    const missing = fields.filter(f => !(f in received));
    const pass = missing.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected object not to have fields: ${fields.join(', ')}`
          : `Missing required fields: ${missing.join(', ')}`,
    };
  },
});
```

```typescript
// tests/mocks/setup.ts
/**
 * Mock setup for external services
 */
import { vi } from 'vitest';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        id: 'mock-message-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Mock response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
      stream: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Mock' } };
          yield { type: 'content_block_delta', delta: { text: ' streaming' } };
        },
      }),
    },
  })),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Mock Gemini response',
          usageMetadata: { totalTokenCount: 150 },
        },
      }),
      generateContentStream: vi.fn().mockReturnValue({
        stream: {
          async *[Symbol.asyncIterator]() {
            yield { text: () => 'Mock' };
            yield { text: () => ' streaming' };
          },
        },
      }),
    }),
  })),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
        usage: { total_tokens: 10 },
      }),
    },
  })),
}));

// Mock better-sqlite3
vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => ({
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      iterate: vi.fn().mockReturnValue([]),
    }),
    transaction: vi.fn((fn) => fn),
    close: vi.fn(),
  })),
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn().mockReturnValue({
    status: vi.fn().mockResolvedValue({
      isClean: () => true,
      current: 'main',
      files: [],
    }),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue({ commit: 'abc1234' }),
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue({ summary: { changes: 0 } }),
    checkout: vi.fn().mockResolvedValue(undefined),
    branch: vi.fn().mockResolvedValue({ all: ['main'] }),
    log: vi.fn().mockResolvedValue({ all: [] }),
    diff: vi.fn().mockResolvedValue(''),
  }),
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0,
  }),
  execaCommand: vi.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0,
  }),
}));
```

---

#### Test Utilities

```typescript
// tests/utils/factories.ts
/**
 * Test factories for creating test data
 */
import type { NexusTask, NexusFeature, NexusProject, Agent } from '@/types';

let taskCounter = 0;
let featureCounter = 0;
let projectCounter = 0;
let agentCounter = 0;

/**
 * Create a test task
 */
export function createTestTask(overrides: Partial<NexusTask> = {}): NexusTask {
  const id = ++taskCounter;
  return {
    id: `F001-A-${String(id).padStart(2, '0')}`,
    name: `Test Task ${id}`,
    description: `Test task description ${id}`,
    files: ['src/test.ts'],
    test: 'Test passes',
    dependsOn: [],
    timeEstimate: 15,
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test feature
 */
export function createTestFeature(
  overrides: Partial<NexusFeature> = {}
): NexusFeature {
  const id = ++featureCounter;
  return {
    id: `F${String(id).padStart(3, '0')}`,
    name: `Test Feature ${id}`,
    description: `Test feature description ${id}`,
    subFeatures: [],
    totalTasks: 0,
    estimatedTime: '1-2 hours',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test project
 */
export function createTestProject(
  overrides: Partial<NexusProject> = {}
): NexusProject {
  const id = ++projectCounter;
  return {
    id: `proj-${id}`,
    name: `Test Project ${id}`,
    description: `Test project description ${id}`,
    mode: 'genesis',
    basePath: `/tmp/test-project-${id}`,
    status: 'pending',
    requirements: [],
    features: [],
    settings: {
      maxParallelAgents: 3,
      maxQAIterations: 50,
      autoMerge: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test agent
 */
export function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  const id = ++agentCounter;
  return {
    id: `agent-${id}`,
    type: 'coder',
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    status: 'idle',
    capabilities: ['code', 'test'],
    metrics: {
      tasksCompleted: 0,
      totalTime: 0,
      avgTaskTime: 0,
      successRate: 1,
      tokensUsed: 0,
    },
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Reset all counters (call in beforeEach)
 */
export function resetFactories(): void {
  taskCounter = 0;
  featureCounter = 0;
  projectCounter = 0;
  agentCounter = 0;
}
```

```typescript
// tests/utils/database.ts
/**
 * Test database utilities
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/persistence/schema';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

interface TestDatabase {
  db: ReturnType<typeof drizzle>;
  sqlite: Database.Database;
  cleanup: () => Promise<void>;
}

const TEST_DB_DIR = '/tmp/nexus-test-dbs';
let dbCounter = 0;

/**
 * Create a fresh test database
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  // Ensure test directory exists
  if (!existsSync(TEST_DB_DIR)) {
    mkdirSync(TEST_DB_DIR, { recursive: true });
  }

  const dbPath = join(TEST_DB_DIR, `test-${++dbCounter}-${Date.now()}.db`);
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, { schema });

  // Run migrations
  await migrate(db, { migrationsFolder: './migrations' });

  return {
    db,
    sqlite,
    cleanup: async () => {
      sqlite.close();
      if (existsSync(dbPath)) {
        rmSync(dbPath, { force: true });
        rmSync(`${dbPath}-wal`, { force: true });
        rmSync(`${dbPath}-shm`, { force: true });
      }
    },
  };
}

/**
 * Seed database with test data
 */
export async function seedTestDatabase(
  db: ReturnType<typeof drizzle>,
  data: {
    projects?: Parameters<typeof db.insert>[1][];
    features?: Parameters<typeof db.insert>[1][];
    tasks?: Parameters<typeof db.insert>[1][];
  }
): Promise<void> {
  if (data.projects?.length) {
    await db.insert(schema.projects).values(data.projects);
  }
  if (data.features?.length) {
    await db.insert(schema.features).values(data.features);
  }
  if (data.tasks?.length) {
    await db.insert(schema.tasks).values(data.tasks);
  }
}
```

---

### E2E Testing: Playwright

Playwright handles end-to-end testing for the Electron application.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',

  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/e2e-html' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],

  // Global configuration
  use: {
    // Base URL for testing
    baseURL: 'http://localhost:3000',

    // Tracing
    trace: 'on-first-retry',

    // Screenshots
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects for different browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Electron-specific tests
    {
      name: 'electron',
      testMatch: /.*\.electron\.spec\.ts/,
      use: {
        // Electron-specific settings
      },
    },
  ],

  // Web server configuration (for dev mode testing)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

```typescript
// tests/e2e/fixtures/electron.ts
/**
 * Electron test fixtures for Playwright
 */
import { test as base, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { join } from 'path';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  mainWindow: Page;
};

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const electronApp = await electron.launch({
      args: [join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXUS_TEST_MODE: 'true',
      },
    });

    await use(electronApp);

    await electronApp.close();
  },

  mainWindow: async ({ electronApp }, use) => {
    const mainWindow = await electronApp.firstWindow();

    // Wait for the app to be ready
    await mainWindow.waitForLoadState('domcontentloaded');

    await use(mainWindow);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// tests/e2e/interview.spec.ts
/**
 * E2E tests for the Interview UI
 */
import { test, expect } from './fixtures/electron';

test.describe('Interview Flow', () => {
  test('should complete project interview', async ({ mainWindow }) => {
    // Navigate to interview page
    await mainWindow.click('[data-testid="new-project-button"]');

    // Fill in project name
    await mainWindow.fill('[data-testid="project-name-input"]', 'Test Project');

    // Select project mode
    await mainWindow.click('[data-testid="mode-genesis"]');

    // Proceed to next step
    await mainWindow.click('[data-testid="next-button"]');

    // Verify we're on the requirements step
    await expect(mainWindow.locator('[data-testid="requirements-step"]')).toBeVisible();
  });

  test('should save interview progress', async ({ mainWindow }) => {
    // Start interview
    await mainWindow.click('[data-testid="new-project-button"]');

    // Fill partial data
    await mainWindow.fill('[data-testid="project-name-input"]', 'Partial Project');

    // Simulate page reload
    await mainWindow.reload();

    // Verify progress was saved
    const nameInput = mainWindow.locator('[data-testid="project-name-input"]');
    await expect(nameInput).toHaveValue('Partial Project');
  });
});

test.describe('Kanban Board', () => {
  test('should display task cards', async ({ mainWindow }) => {
    // Navigate to kanban
    await mainWindow.click('[data-testid="nav-kanban"]');

    // Verify columns are visible
    await expect(mainWindow.locator('[data-testid="column-pending"]')).toBeVisible();
    await expect(mainWindow.locator('[data-testid="column-in-progress"]')).toBeVisible();
    await expect(mainWindow.locator('[data-testid="column-complete"]')).toBeVisible();
  });

  test('should drag and drop tasks', async ({ mainWindow }) => {
    // Navigate to kanban
    await mainWindow.click('[data-testid="nav-kanban"]');

    // Find a task card
    const taskCard = mainWindow.locator('[data-testid="task-card"]').first();
    const targetColumn = mainWindow.locator('[data-testid="column-in-progress"]');

    // Drag and drop
    await taskCard.dragTo(targetColumn);

    // Verify task moved
    await expect(targetColumn.locator('[data-testid="task-card"]')).toHaveCount(1);
  });
});
```

---

### Linting & Formatting

#### ESLint Configuration

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      'tests/**/*.test.ts',
    ],
  },

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
    },
  },

  // React configuration
  {
    files: ['src/ui/**/*.tsx', 'src/ui/**/*.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/prop-types': 'off', // Using TypeScript
      'react/react-in-jsx-scope': 'off', // React 17+
      'react/jsx-no-target-blank': 'error',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
    },
  },

  // Test file configuration
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Prettier compatibility (must be last)
  prettier
);
```

---

#### Prettier Configuration

```javascript
// prettier.config.js
/**
 * Prettier configuration for Nexus
 */
export default {
  // Basic formatting
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX
  jsxSingleQuote: false,

  // Trailing commas
  trailingComma: 'es5',

  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'always',

  // Line endings
  endOfLine: 'lf',

  // Prose wrap (for Markdown)
  proseWrap: 'preserve',

  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Single attribute per line
  singleAttributePerLine: true,

  // Plugins
  plugins: [
    'prettier-plugin-tailwindcss',
    'prettier-plugin-organize-imports',
  ],

  // Tailwind function order
  tailwindFunctions: ['cn', 'cva', 'clsx'],

  // File-specific overrides
  overrides: [
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 100,
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
    {
      files: ['*.yaml', '*.yml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
  ],
};
```

---

#### Pre-commit Hooks (Husky + lint-staged)

```json
// package.json (partial)
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --cache",
    "lint:fix": "eslint . --fix --cache",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --cache",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix --cache",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.css": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Run type check
npm run type-check
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
npx commitlint --edit "$1"
```

---

#### Commitlint Configuration

```javascript
// commitlint.config.js
/**
 * Commitlint configuration for conventional commits
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type rules
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting (no code change)
        'refactor', // Refactoring
        'perf',     // Performance improvement
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI configuration
        'chore',    // Maintenance
        'revert',   // Revert commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Scope rules
    'scope-enum': [
      2,
      'always',
      [
        'ui',           // UI layer
        'orchestration', // Orchestration layer
        'planning',     // Planning layer
        'execution',    // Execution layer
        'quality',      // Quality layer
        'persistence',  // Persistence layer
        'infrastructure', // Infrastructure layer
        'agents',       // Agent system
        'config',       // Configuration
        'deps',         // Dependencies
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],

    // Subject rules
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],

    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],

    // Header rules
    'header-max-length': [2, 'always', 100],
  },
};
```

---

### Build Tools

#### Vite Configuration (UI Layer)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist/main',
            sourcemap: mode === 'development',
            minify: mode === 'production',
            rollupOptions: {
              external: [
                'better-sqlite3',
                'electron',
                '@anthropic-ai/sdk',
                '@google/generative-ai',
              ],
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist/preload',
            sourcemap: mode === 'development',
          },
        },
      },
    ]),
    electronRenderer(),
  ],

  // Path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@ui': resolve(__dirname, './src/ui'),
      '@orchestration': resolve(__dirname, './src/orchestration'),
      '@planning': resolve(__dirname, './src/planning'),
      '@execution': resolve(__dirname, './src/execution'),
      '@quality': resolve(__dirname, './src/quality'),
      '@persistence': resolve(__dirname, './src/persistence'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },

  // Build configuration
  build: {
    outDir: 'dist/renderer',
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          editor: ['monaco-editor'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Development server
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },

  // Optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
    exclude: ['better-sqlite3', 'electron'],
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Environment variables
  envPrefix: 'NEXUS_',
}));
```

---

#### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module Resolution
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "noEmit": false,

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ui/*": ["./src/ui/*"],
      "@orchestration/*": ["./src/orchestration/*"],
      "@planning/*": ["./src/planning/*"],
      "@execution/*": ["./src/execution/*"],
      "@quality/*": ["./src/quality/*"],
      "@persistence/*": ["./src/persistence/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@shared/*": ["./src/shared/*"],
      "@tests/*": ["./tests/*"]
    },

    // JSX
    "jsx": "react-jsx",
    "jsxImportSource": "react",

    // Other
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "tests/**/*.ts",
    "tests/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "composite": true
  },
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts",
    "eslint.config.js",
    "prettier.config.js",
    "commitlint.config.js"
  ]
}
```

---

### NPM Scripts

```json
// package.json (scripts section)
{
  "scripts": {
    // Development
    "dev": "vite",
    "dev:main": "vite build --watch -c vite.config.ts --mode development",
    "start": "electron .",

    // Build
    "build": "npm run build:types && npm run build:main && npm run build:renderer",
    "build:types": "tsc --noEmit",
    "build:main": "vite build -c vite.config.ts",
    "build:renderer": "vite build",
    "build:prod": "NODE_ENV=production npm run build",

    // Testing
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:run && npm run test:e2e",

    // Linting & Formatting
    "lint": "eslint . --cache",
    "lint:fix": "eslint . --fix --cache",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",

    // Validation (pre-commit/CI)
    "validate": "npm run type-check && npm run lint && npm run test:run",
    "validate:full": "npm run validate && npm run test:e2e",

    // Database
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",

    // Utilities
    "clean": "rimraf dist coverage .eslintcache",
    "prepare": "husky",
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

---

### Part E Completion

- [x] Testing framework documented (Vitest with complete configuration)
- [x] Test setup files documented (global setup, mocks)
- [x] Test utilities documented (factories, database helpers)
- [x] E2E testing documented (Playwright configuration)
- [x] ESLint configuration documented (TypeScript + React + Accessibility)
- [x] Prettier configuration documented
- [x] Pre-commit hooks documented (Husky + lint-staged)
- [x] Commitlint configuration documented
- [x] Build tools documented (Vite for Electron)
- [x] TypeScript configuration documented
- [x] NPM scripts documented

---

## Part F: Git Strategy

Nexus uses a **worktree-based isolation strategy** adapted from Auto-Claude, enabling safe parallel agent execution and user-controlled merging.

### Git Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           NEXUS GIT STRATEGY                                    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   USER'S REPOSITORY                                                            │
│   ├── main (or master)          ← User's working branch, protected            │
│   │                                                                            │
│   ├── nexus/{task-id}          ← Per-task branches                            │
│   │   ├── nexus/F001-A-01      ← Feature 1, SubFeature A, Task 1             │
│   │   ├── nexus/F001-A-02      ← Feature 1, SubFeature A, Task 2             │
│   │   └── nexus/F002-B-01      ← Feature 2, SubFeature B, Task 1             │
│   │                                                                            │
│   └── nexus/merge/{feature-id} ← Feature integration branches                  │
│       └── nexus/merge/F001     ← All F001 tasks merged here first             │
│                                                                                │
│   WORKTREES (.nexus/worktrees/)                                               │
│   ├── tasks/                   ← Active task worktrees                        │
│   │   ├── F001-A-01/          ← Full repo copy, isolated filesystem          │
│   │   └── F002-B-01/          ← Agents work here in parallel                 │
│   └── integration/             ← Feature integration worktrees                │
│       └── F001/               ← For merging all F001 tasks                   │
│                                                                                │
│   LIFECYCLE:                                                                   │
│   1. Coordinator creates worktree + branch                                     │
│   2. Agent works in isolated worktree                                          │
│   3. Commits stay local (no auto-push)                                         │
│   4. QA Loop validates in worktree                                            │
│   5. On success → Merger Agent handles integration                            │
│   6. User reviews and approves final merge                                    │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Branch Strategy

#### Branch Naming Conventions

| Branch Type | Pattern | Example | Purpose |
|-------------|---------|---------|---------|
| **Main Branch** | `main` or `master` | `main` | User's protected branch |
| **Task Branch** | `nexus/{task-id}` | `nexus/F001-A-01` | Individual task isolation |
| **Feature Merge** | `nexus/merge/{feature-id}` | `nexus/merge/F001` | Feature integration point |
| **Hotfix Branch** | `nexus/hotfix/{id}` | `nexus/hotfix/001` | Urgent fixes |

#### Branch Hierarchy

```
main
├── nexus/merge/F001 ──────────────────┐
│   │                                  │ Feature Integration
│   ├── nexus/F001-A-01 ──────┐       │
│   ├── nexus/F001-A-02 ──────┤       │
│   └── nexus/F001-A-03 ──────┘ Tasks │
│                                      │
├── nexus/merge/F002 ──────────────────┤
│   ├── nexus/F002-A-01               │
│   └── nexus/F002-A-02               │
│                                      │
└── nexus/merge/F003 ──────────────────┘
```

#### Base Branch Detection

```typescript
// src/infrastructure/git/branch-detection.ts
import { simpleGit, SimpleGit } from 'simple-git';

export interface BaseBranchConfig {
  projectDir: string;
  defaultBranch?: string;
  envVariable?: string;
}

export async function detectBaseBranch(config: BaseBranchConfig): Promise<string> {
  const git = simpleGit(config.projectDir);

  // Priority 1: Environment variable
  const envBranch = process.env[config.envVariable || 'NEXUS_DEFAULT_BRANCH'];
  if (envBranch) {
    const exists = await branchExists(git, envBranch);
    if (exists) return envBranch;
  }

  // Priority 2: Explicit configuration
  if (config.defaultBranch) {
    const exists = await branchExists(git, config.defaultBranch);
    if (exists) return config.defaultBranch;
  }

  // Priority 3: Auto-detect main/master
  for (const branch of ['main', 'master', 'develop']) {
    const exists = await branchExists(git, branch);
    if (exists) return branch;
  }

  // Priority 4: Current branch (with warning)
  const current = await git.revparse(['--abbrev-ref', 'HEAD']);
  console.warn(`Warning: Using current branch '${current}' as base.`);
  return current;
}

async function branchExists(git: SimpleGit, branch: string): Promise<boolean> {
  try {
    const branches = await git.branchLocal();
    if (branches.all.includes(branch)) return true;
    const remoteBranches = await git.branch(['-r']);
    return remoteBranches.all.includes(`origin/${branch}`);
  } catch {
    return false;
  }
}
```

### Worktree Management

#### Worktree Directory Structure

```
.nexus/
├── worktrees/
│   ├── tasks/
│   │   ├── F001-A-01/           ← Task worktree (full repo)
│   │   │   ├── src/
│   │   │   ├── package.json
│   │   │   └── ...
│   │   └── F001-A-02/           ← Parallel task worktree
│   └── integration/
│       └── F001/                ← Feature integration worktree
└── git-metadata/
    └── worktree-info.json       ← Worktree tracking data
```

#### WorktreeManager Implementation

```typescript
// src/infrastructure/git/worktree-manager.ts
import { simpleGit, SimpleGit } from 'simple-git';
import { EventEmitter3 } from 'eventemitter3';
import path from 'path';
import fs from 'fs-extra';

export interface WorktreeInfo {
  path: string;
  branch: string;
  taskId: string;
  baseBranch: string;
  isActive: boolean;
  commitCount: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  lastCommitDate: Date | null;
  createdAt: Date;
}

export interface WorktreeCreateOptions {
  taskId: string;
  baseBranch?: string;
  fetchLatest?: boolean;
}

export class WorktreeManager extends EventEmitter3 {
  private readonly projectDir: string;
  private readonly worktreesDir: string;
  private readonly git: SimpleGit;
  private baseBranch: string = 'main';

  // Timeouts for git operations
  private static readonly GIT_TIMEOUT = 30_000;
  private static readonly GIT_PUSH_TIMEOUT = 120_000;
  private static readonly GIT_FETCH_TIMEOUT = 60_000;

  constructor(projectDir: string) {
    super();
    this.projectDir = projectDir;
    this.worktreesDir = path.join(projectDir, '.nexus', 'worktrees', 'tasks');
    this.git = simpleGit(projectDir);
  }

  async initialize(): Promise<void> {
    this.baseBranch = await detectBaseBranch({ projectDir: this.projectDir });
    await fs.ensureDir(this.worktreesDir);
    this.emit('initialized', { baseBranch: this.baseBranch });
  }

  async createWorktree(options: WorktreeCreateOptions): Promise<WorktreeInfo> {
    const { taskId, baseBranch = this.baseBranch, fetchLatest = true } = options;
    const worktreePath = this.getWorktreePath(taskId);
    const branchName = this.getBranchName(taskId);

    if (await fs.pathExists(worktreePath)) {
      throw new Error(`Worktree already exists for task ${taskId}`);
    }

    await this.checkBranchNamespaceConflict();

    if (fetchLatest) {
      try {
        await this.git.fetch('origin', baseBranch, { '--prune': null });
      } catch (error) {
        console.warn(`Failed to fetch: ${(error as Error).message}`);
      }
    }

    const remoteRef = `origin/${baseBranch}`;
    const remoteExists = await this.refExists(remoteRef);
    const startPoint = remoteExists ? remoteRef : baseBranch;

    await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, startPoint]);

    const info: WorktreeInfo = {
      path: worktreePath,
      branch: branchName,
      taskId,
      baseBranch,
      isActive: true,
      commitCount: 0,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      lastCommitDate: null,
      createdAt: new Date(),
    };

    await this.saveWorktreeMetadata(info);
    this.emit('worktree:created', info);
    return info;
  }

  getWorktreePath(taskId: string): string {
    return path.join(this.worktreesDir, taskId);
  }

  getBranchName(taskId: string): string {
    return `nexus/${taskId}`;
  }

  async listWorktrees(): Promise<WorktreeInfo[]> {
    const worktrees: WorktreeInfo[] = [];
    if (!await fs.pathExists(this.worktreesDir)) return worktrees;

    const entries = await fs.readdir(this.worktreesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const info = await this.getWorktreeInfo(entry.name);
        if (info) worktrees.push(info);
      }
    }
    return worktrees;
  }

  async getWorktreeInfo(taskId: string): Promise<WorktreeInfo | null> {
    const worktreePath = this.getWorktreePath(taskId);
    if (!await fs.pathExists(worktreePath)) return null;

    const worktreeGit = simpleGit(worktreePath);
    try {
      const log = await worktreeGit.log({ maxCount: 1000 });
      const diffSummary = await worktreeGit.diffSummary([`${this.baseBranch}...HEAD`]);

      return {
        path: worktreePath,
        branch: this.getBranchName(taskId),
        taskId,
        baseBranch: this.baseBranch,
        isActive: true,
        commitCount: log.total,
        filesChanged: diffSummary.files.length,
        additions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        lastCommitDate: log.latest ? new Date(log.latest.date) : null,
        createdAt: await this.getWorktreeCreationDate(taskId),
      };
    } catch (error) {
      console.error(`Failed to get info for worktree ${taskId}:`, error);
      return null;
    }
  }

  async removeWorktree(taskId: string, deleteBranch = false): Promise<void> {
    const worktreePath = this.getWorktreePath(taskId);
    const branchName = this.getBranchName(taskId);

    if (!await fs.pathExists(worktreePath)) {
      throw new Error(`Worktree not found for task ${taskId}`);
    }

    await this.git.raw(['worktree', 'remove', worktreePath, '--force']);

    if (deleteBranch) {
      try {
        await this.git.deleteLocalBranch(branchName, true);
      } catch (error) {
        console.warn(`Failed to delete branch: ${(error as Error).message}`);
      }
    }

    await this.removeWorktreeMetadata(taskId);
    this.emit('worktree:removed', { taskId, branchName });
  }

  async cleanupOldWorktrees(daysThreshold = 30): Promise<string[]> {
    const worktrees = await this.listWorktrees();
    const removed: string[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    for (const worktree of worktrees) {
      const lastActivity = worktree.lastCommitDate || worktree.createdAt;
      if (lastActivity < cutoffDate) {
        try {
          await this.removeWorktree(worktree.taskId, true);
          removed.push(worktree.taskId);
        } catch (error) {
          console.error(`Failed to cleanup ${worktree.taskId}:`, error);
        }
      }
    }
    this.emit('worktrees:cleaned', { removed });
    return removed;
  }

  private async checkBranchNamespaceConflict(): Promise<void> {
    const branches = await this.git.branchLocal();
    if (branches.all.includes('nexus')) {
      throw new Error(
        `Branch 'nexus' blocks creating 'nexus/*' branches.\n` +
        `Fix: git branch -m nexus nexus-backup`
      );
    }
  }

  private async refExists(ref: string): Promise<boolean> {
    try {
      await this.git.raw(['rev-parse', '--verify', ref]);
      return true;
    } catch {
      return false;
    }
  }

  private async saveWorktreeMetadata(info: WorktreeInfo): Promise<void> {
    const metadataDir = path.join(this.projectDir, '.nexus', 'git-metadata');
    await fs.ensureDir(metadataDir);
    const metadataFile = path.join(metadataDir, 'worktree-info.json');
    let metadata: Record<string, WorktreeInfo> = {};
    if (await fs.pathExists(metadataFile)) {
      metadata = await fs.readJson(metadataFile);
    }
    metadata[info.taskId] = info;
    await fs.writeJson(metadataFile, metadata, { spaces: 2 });
  }

  private async removeWorktreeMetadata(taskId: string): Promise<void> {
    const metadataFile = path.join(this.projectDir, '.nexus', 'git-metadata', 'worktree-info.json');
    if (await fs.pathExists(metadataFile)) {
      const metadata = await fs.readJson(metadataFile);
      delete metadata[taskId];
      await fs.writeJson(metadataFile, metadata, { spaces: 2 });
    }
  }

  private async getWorktreeCreationDate(taskId: string): Promise<Date> {
    const metadataFile = path.join(this.projectDir, '.nexus', 'git-metadata', 'worktree-info.json');
    if (await fs.pathExists(metadataFile)) {
      const metadata = await fs.readJson(metadataFile);
      if (metadata[taskId]?.createdAt) {
        return new Date(metadata[taskId].createdAt);
      }
    }
    return new Date();
  }
}
```

### Commit Conventions

#### Conventional Commits Format

Nexus follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix | `fix(sidebar): resolve overflow` |
| `refactor` | Code refactoring | `refactor(api): extract validation` |
| `docs` | Documentation | `docs(readme): update install steps` |
| `test` | Tests | `test(auth): add unit tests` |
| `perf` | Performance | `perf(queries): optimize DB calls` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `style` | Code style | `style(lint): fix formatting` |
| `ci` | CI/CD changes | `ci(github): add deploy workflow` |
| `build` | Build system | `build(vite): update config` |

#### Scope Conventions

| Scope | Description |
|-------|-------------|
| `ui` | User interface components |
| `orchestration` | Agent orchestration layer |
| `planning` | Task planning and decomposition |
| `execution` | Task execution and QA |
| `quality` | Testing and validation |
| `persistence` | State and database |
| `git` | Git operations |
| `agent:{type}` | Specific agent (e.g., `agent:coder`) |

#### AI-Generated Commit Messages

```typescript
// src/infrastructure/git/commit-generator.ts
import { LLMProvider } from '@/llm/provider';

const COMMIT_PROMPT = `You are a Git expert writing conventional commit messages.

RULES:
1. First line: type(scope): description (max 72 chars)
2. Body: 1-3 sentences explaining WHAT and WHY
3. Use imperative mood ("Add" not "Added")

TYPES: feat, fix, refactor, docs, test, perf, chore, style, ci, build

TASK: {{taskContext}}
DIFF: {{gitDiff}}

Generate a commit message.`;

export class CommitGenerator {
  constructor(private readonly llm: LLMProvider) {}

  async generateCommitMessage(taskContext: string, gitDiff: string): Promise<string> {
    const prompt = COMMIT_PROMPT
      .replace('{{taskContext}}', taskContext)
      .replace('{{gitDiff}}', gitDiff.slice(0, 4000));

    const response = await this.llm.complete({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 200,
    });

    return response.content.trim();
  }
}

export const CATEGORY_TO_COMMIT_TYPE: Record<string, string> = {
  feature: 'feat', bug_fix: 'fix', bug: 'fix',
  refactoring: 'refactor', refactor: 'refactor',
  documentation: 'docs', docs: 'docs',
  testing: 'test', test: 'test',
  performance: 'perf', perf: 'perf',
  security: 'security', chore: 'chore',
  style: 'style', ci: 'ci', build: 'build',
};
```

### Merge Strategy

#### 3-Tier Merge System

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          NEXUS 3-TIER MERGE SYSTEM                              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   TIER 1: DETERMINISTIC AUTO-MERGE (No AI)                                     │
│   ├── COMBINE_IMPORTS - Merge import statements                               │
│   ├── APPEND_FUNCTIONS - Add new functions                                    │
│   ├── APPEND_METHODS - Add new class methods                                  │
│   ├── COMBINE_EXPORTS - Merge export statements                               │
│   └── Cost: Zero AI tokens                                                     │
│                                                                                │
│   TIER 2: AI-ASSISTED MERGE                                                    │
│   ├── Used for MEDIUM/HIGH severity conflicts                                  │
│   ├── Merger Agent understands code semantics                                 │
│   ├── Max context: 4000 tokens per conflict                                    │
│   └── Cost: ~100-500 tokens per conflict                                       │
│                                                                                │
│   TIER 3: HUMAN REVIEW                                                         │
│   ├── When AI cannot resolve confidently                                       │
│   ├── When context too large (>4000 tokens)                                   │
│   └── Output: Detailed conflict report                                         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### Merge Orchestrator

```typescript
// src/infrastructure/git/merge-orchestrator.ts
import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';

export enum MergeTier { DETERMINISTIC = 1, AI_ASSISTED = 2, HUMAN_REVIEW = 3 }
export enum MergeStrategy {
  COMBINE_IMPORTS = 'combine_imports',
  APPEND_FUNCTIONS = 'append_functions',
  AI_REQUIRED = 'ai_required',
  HUMAN_REQUIRED = 'human_required',
}
export enum ConflictSeverity { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }

export interface ConflictInfo {
  file: string;
  severity: ConflictSeverity;
  suggestedStrategy: MergeStrategy;
  oursContent: string;
  theirsContent: string;
}

export interface MergeResult {
  success: boolean;
  tier: MergeTier;
  conflicts: ConflictInfo[];
  resolvedConflicts: number;
  humanReviewRequired: boolean;
  commitHash?: string;
}

export class MergeOrchestrator {
  private readonly git: SimpleGit;
  private readonly maxAIContextTokens = 4000;

  constructor(private readonly projectDir: string, private readonly mergerAgent: any) {
    this.git = simpleGit(projectDir);
  }

  async mergeTaskBranch(taskBranch: string, targetBranch: string): Promise<MergeResult> {
    const result: MergeResult = {
      success: false, tier: MergeTier.DETERMINISTIC,
      conflicts: [], resolvedConflicts: 0, humanReviewRequired: false,
    };

    try {
      const mergeResult = await this.git.merge([taskBranch, '--no-commit']);

      if (!mergeResult.conflicts?.length) {
        result.success = true;
        await this.git.commit(`Merge '${taskBranch}' into ${targetBranch}`);
        const log = await this.git.log({ maxCount: 1 });
        result.commitHash = log.latest?.hash;
        return result;
      }

      result.conflicts = await this.analyzeConflicts(mergeResult.conflicts);

      for (const conflict of result.conflicts) {
        const resolved = await this.resolveConflict(conflict);
        if (resolved) {
          result.resolvedConflicts++;
          result.tier = Math.max(result.tier, resolved.tier) as MergeTier;
        } else {
          result.humanReviewRequired = true;
        }
      }

      if (result.resolvedConflicts === result.conflicts.length) {
        result.success = true;
        await this.git.add('.');
        await this.git.commit(`Merge '${taskBranch}' - resolved ${result.resolvedConflicts} conflicts`);
        const log = await this.git.log({ maxCount: 1 });
        result.commitHash = log.latest?.hash;
      }
    } catch (error) {
      console.error('Merge failed:', error);
      result.humanReviewRequired = true;
    }

    return result;
  }

  private async analyzeConflicts(files: string[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(this.projectDir, file), 'utf-8');
      const parsed = this.parseConflictMarkers(content);
      const severity = this.assessSeverity(parsed);
      const strategy = this.suggestStrategy(file, parsed);
      conflicts.push({ file, severity, suggestedStrategy: strategy, ...parsed });
    }
    return conflicts;
  }

  private parseConflictMarkers(content: string): { oursContent: string; theirsContent: string } {
    const regex = /<<<<<<< .*?\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> .*?/g;
    let ours = '', theirs = '';
    let match;
    while ((match = regex.exec(content)) !== null) {
      ours += match[1];
      theirs += match[2];
    }
    return { oursContent: ours, theirsContent: theirs };
  }

  private assessSeverity(conflict: { oursContent: string; theirsContent: string }): ConflictSeverity {
    const total = conflict.oursContent.split('\n').length + conflict.theirsContent.split('\n').length;
    if (total <= 5) return ConflictSeverity.LOW;
    if (total <= 20) return ConflictSeverity.MEDIUM;
    if (total <= 50) return ConflictSeverity.HIGH;
    return ConflictSeverity.CRITICAL;
  }

  private suggestStrategy(file: string, conflict: any): MergeStrategy {
    const ext = path.extname(file);
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      if (this.isImportOnly(conflict)) return MergeStrategy.COMBINE_IMPORTS;
    }
    return MergeStrategy.AI_REQUIRED;
  }

  private isImportOnly(conflict: { oursContent: string; theirsContent: string }): boolean {
    const importRe = /^import\s+/;
    const check = (s: string) => s.trim().split('\n').every(l => !l.trim() || importRe.test(l));
    return check(conflict.oursContent) && check(conflict.theirsContent);
  }

  private async resolveConflict(conflict: ConflictInfo): Promise<{ tier: MergeTier } | null> {
    if (conflict.suggestedStrategy === MergeStrategy.COMBINE_IMPORTS) {
      const merged = this.combineImports(conflict.oursContent, conflict.theirsContent);
      await fs.writeFile(path.join(this.projectDir, conflict.file), merged);
      return { tier: MergeTier.DETERMINISTIC };
    }

    if (conflict.severity !== ConflictSeverity.CRITICAL) {
      const tokens = Math.ceil((conflict.oursContent + conflict.theirsContent).length / 4);
      if (tokens <= this.maxAIContextTokens) {
        const resolved = await this.mergerAgent.resolveConflict(conflict);
        if (resolved.success) {
          await fs.writeFile(path.join(this.projectDir, conflict.file), resolved.mergedContent);
          return { tier: MergeTier.AI_ASSISTED };
        }
      }
    }
    return null;
  }

  private combineImports(ours: string, theirs: string): string {
    const set = new Set(ours.trim().split('\n').filter(l => l.trim()));
    theirs.trim().split('\n').filter(l => l.trim()).forEach(l => set.add(l));
    return Array.from(set).sort().join('\n') + '\n';
  }
}
```

### Branch Protection & Safety

| Principle | Implementation |
|-----------|----------------|
| **Isolation** | Each task in separate worktree |
| **No Auto-Push** | Changes stay local until user pushes |
| **User Control** | Merge on user command only |
| **Safe Rollback** | Discard worktree without affecting main |
| **Parallel Work** | Multiple tasks run simultaneously |

#### Pre-Merge Checks

```typescript
// src/infrastructure/git/safety-checks.ts
import { simpleGit } from 'simple-git';

export interface SafetyCheckResult {
  passed: boolean;
  checks: { name: string; passed: boolean; message: string }[];
}

export async function runPreMergeChecks(worktreePath: string, baseBranch: string): Promise<SafetyCheckResult> {
  const git = simpleGit(worktreePath);
  const checks: SafetyCheckResult['checks'] = [];

  const status = await git.status();
  checks.push({
    name: 'no_uncommitted_changes',
    passed: status.isClean(),
    message: status.isClean() ? 'All committed' : `${status.modified.length} uncommitted`,
  });

  const log = await git.log([`${baseBranch}..HEAD`]);
  checks.push({
    name: 'has_commits',
    passed: log.total > 0,
    message: log.total > 0 ? `${log.total} commits to merge` : 'No commits',
  });

  return { passed: checks.every(c => c.passed), checks };
}
```

#### Agent Git Operations

```typescript
// src/infrastructure/git/agent-git.ts
import { simpleGit, SimpleGit } from 'simple-git';

export class AgentGitOperations {
  private readonly git: SimpleGit;

  constructor(worktreePath: string) {
    this.git = simpleGit(worktreePath);
  }

  async commit(message: string): Promise<{ hash: string; filesChanged: number }> {
    await this.git.add('.');
    const status = await this.git.status();
    if (!status.staged.length) throw new Error('No changes to commit');
    await this.git.commit(message);
    const log = await this.git.log({ maxCount: 1 });
    return { hash: log.latest!.hash, filesChanged: status.staged.length };
  }

  async getDiff(baseBranch: string): Promise<string> {
    return this.git.diff([`${baseBranch}...HEAD`]);
  }

  async getChangedFiles(baseBranch: string): Promise<string[]> {
    const diff = await this.git.diffSummary([`${baseBranch}...HEAD`]);
    return diff.files.map(f => f.file);
  }

  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }
}
```

### Part F Completion

- [x] Git architecture overview documented
- [x] Branch strategy defined (naming, hierarchy, detection)
- [x] Worktree management implementation (WorktreeManager)
- [x] Commit conventions documented (Conventional Commits + AI)
- [x] 3-tier merge system documented
- [x] Merge orchestrator implementation
- [x] Branch protection and safety principles
- [x] Pre-merge checks implementation
- [x] Agent git operations documented

---

## Part G: Dependency Matrix

This section provides a complete inventory of all dependencies used in Nexus, organized by category and layer. Each dependency includes version constraints, purpose, and the layers/components that use it.

### Core Runtime Dependencies

| Package | Version | Purpose | Layer(s) | Critical |
|---------|---------|---------|----------|----------|
| typescript | ^5.4.0 | Primary language, type safety | All | ✅ |
| node | ^22.0.0 | Runtime environment (LTS) | All | ✅ |
| electron | ^33.0.0 | Desktop application framework | UI, Infrastructure | ✅ |

### UI Layer Dependencies (Layer 1)

#### React & State Management

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| react | ^18.3.0 | UI framework | ✅ |
| react-dom | ^18.3.0 | DOM rendering for React | ✅ |
| react-router-dom | ^6.26.0 | Client-side routing | ✅ |
| zustand | ^4.5.0 | Lightweight state management | ✅ |
| immer | ^10.1.0 | Immutable state updates via Zustand middleware | ✅ |
| @tanstack/react-query | ^5.59.0 | Server state management, caching | ✅ |

#### UI Components & Styling

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| @radix-ui/react-dialog | ^1.1.0 | Accessible dialog/modal primitive | ✅ |
| @radix-ui/react-dropdown-menu | ^2.1.0 | Accessible dropdown primitive | ✅ |
| @radix-ui/react-popover | ^1.1.0 | Accessible popover primitive | ✅ |
| @radix-ui/react-progress | ^1.1.0 | Accessible progress bar primitive | ✅ |
| @radix-ui/react-select | ^2.1.0 | Accessible select primitive | ✅ |
| @radix-ui/react-slot | ^1.1.0 | Composition utility for shadcn | ✅ |
| @radix-ui/react-tabs | ^1.1.0 | Accessible tabs primitive | ✅ |
| @radix-ui/react-toast | ^1.2.0 | Accessible toast notifications | ✅ |
| @radix-ui/react-tooltip | ^1.1.0 | Accessible tooltip primitive | ✅ |
| tailwindcss | ^3.4.0 | Utility-first CSS framework | ✅ |
| tailwindcss-animate | ^1.0.7 | Animation utilities for Tailwind | ⬜ |
| class-variance-authority | ^0.7.0 | Variant management for components | ✅ |
| clsx | ^2.1.0 | Conditional class names | ✅ |
| tailwind-merge | ^2.5.0 | Merge Tailwind classes safely | ✅ |
| lucide-react | ^0.447.0 | Icon library | ⬜ |

#### Specialized UI

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| @dnd-kit/core | ^6.1.0 | Drag-and-drop for Kanban board | ✅ |
| @dnd-kit/sortable | ^8.0.0 | Sortable extension for dnd-kit | ✅ |
| @dnd-kit/utilities | ^3.2.0 | DnD utilities | ✅ |
| @tanstack/react-virtual | ^3.10.0 | Virtual scrolling for large lists | ⬜ |
| @monaco-editor/react | ^4.6.0 | Code editor for viewing/editing | ⬜ |
| @xterm/xterm | ^5.5.0 | Terminal emulator for agent output | ⬜ |
| @xterm/addon-fit | ^0.10.0 | Auto-fit terminal addon | ⬜ |
| @xterm/addon-web-links | ^0.11.0 | Clickable links in terminal | ⬜ |
| framer-motion | ^11.11.0 | Animations and transitions | ⬜ |

### Orchestration Layer Dependencies (Layer 2)

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| eventemitter3 | ^5.0.0 | High-performance event emitter | ✅ |
| p-queue | ^8.0.0 | Promise-based task queue with concurrency | ✅ |
| p-retry | ^6.2.0 | Retry failed operations with backoff | ✅ |
| ms | ^2.1.0 | Time string parsing for timeouts | ⬜ |

### Planning Layer Dependencies (Layer 3)

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| uuid | ^10.0.0 | Unique ID generation for tasks | ✅ |
| nanoid | ^5.0.0 | Compact unique IDs for sessions | ✅ |

### Execution Layer Dependencies (Layer 4)

#### AI/LLM SDKs

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| @anthropic-ai/sdk | ^0.32.0 | Claude API client (Planner, Coder, Tester, Merger) | ✅ |
| @google/generative-ai | ^0.21.0 | Gemini API client (Reviewer, Research) | ✅ |
| openai | ^4.72.0 | OpenAI API client (Embeddings only) | ⬜ |
| @xenova/transformers | ^2.17.0 | Local embeddings fallback (no API) | ⬜ |

#### Process & Tool Execution

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| execa | ^9.4.0 | Process execution for commands | ✅ |
| tree-kill | ^1.2.0 | Kill process trees on timeout | ✅ |
| shell-quote | ^1.8.0 | Command line argument quoting | ✅ |

### Quality Layer Dependencies (Layer 5)

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| vitest | ^2.1.0 | Unit/integration testing framework | ✅ |
| @vitest/coverage-v8 | ^2.1.0 | Code coverage via V8 | ✅ |
| @vitest/ui | ^2.1.0 | Visual test UI (development) | ⬜ |
| playwright | ^1.48.0 | E2E testing framework | ✅ |
| @playwright/test | ^1.48.0 | Playwright test runner | ✅ |

### Persistence Layer Dependencies (Layer 6)

#### Database

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| better-sqlite3 | ^11.3.0 | SQLite database driver | ✅ |
| drizzle-orm | ^0.30.0 | Type-safe ORM for SQLite | ✅ |
| drizzle-kit | ^0.21.0 | Database migrations CLI | ✅ |

#### File System

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| fs-extra | ^11.2.0 | Enhanced file system operations | ✅ |
| pathe | ^1.1.0 | Cross-platform path utilities | ✅ |
| fast-glob | ^3.3.0 | Fast file globbing | ✅ |
| chokidar | ^4.0.0 | File watching for live updates | ✅ |

### Infrastructure Layer Dependencies (Layer 7)

#### Git Operations

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| simple-git | ^3.27.0 | Git operations (worktrees, commits) | ✅ |
| parse-diff | ^0.11.0 | Parse git diff output | ✅ |

### Development Dependencies

#### Build Tools

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| vite | ^5.4.0 | Build tool & dev server | ✅ |
| vite-plugin-electron | ^0.28.0 | Electron integration for Vite | ✅ |
| vite-plugin-electron-renderer | ^0.14.0 | Renderer process for Electron | ✅ |
| @swc/core | ^1.7.0 | Fast TypeScript compilation | ✅ |
| @vitejs/plugin-react-swc | ^3.7.0 | React plugin with SWC | ✅ |
| electron-builder | ^24.13.0 | Electron packaging & distribution | ⬜ |

#### Code Quality

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| eslint | ^9.12.0 | JavaScript/TypeScript linting | ✅ |
| typescript-eslint | ^8.8.0 | TypeScript rules for ESLint | ✅ |
| eslint-plugin-react | ^7.37.0 | React-specific linting rules | ✅ |
| eslint-plugin-react-hooks | ^5.0.0 | React Hooks linting | ✅ |
| eslint-plugin-jsx-a11y | ^6.10.0 | Accessibility linting | ✅ |
| prettier | ^3.3.0 | Code formatting | ✅ |
| prettier-plugin-tailwindcss | ^0.6.0 | Tailwind class sorting | ⬜ |
| @trivago/prettier-plugin-sort-imports | ^4.3.0 | Import sorting | ⬜ |

#### Git Hooks & Commit

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| husky | ^9.1.0 | Git hooks management | ✅ |
| lint-staged | ^15.2.0 | Run linters on staged files | ✅ |
| @commitlint/cli | ^19.5.0 | Commit message linting | ✅ |
| @commitlint/config-conventional | ^19.5.0 | Conventional commit rules | ✅ |

### Type Definitions (Development)

| Package | Version | Purpose |
|---------|---------|---------|
| @types/node | ^22.7.0 | Node.js type definitions |
| @types/react | ^18.3.0 | React type definitions |
| @types/react-dom | ^18.3.0 | ReactDOM type definitions |
| @types/better-sqlite3 | ^7.6.0 | better-sqlite3 types |
| @types/fs-extra | ^11.0.0 | fs-extra type definitions |
| @types/ms | ^0.7.0 | ms type definitions |

### Dependency Summary by Layer

| Layer | Production Deps | Dev Deps | Critical | Total |
|-------|-----------------|----------|----------|-------|
| Core Runtime | 3 | 0 | 3 | 3 |
| UI (Layer 1) | 31 | 0 | 20 | 31 |
| Orchestration (Layer 2) | 4 | 0 | 3 | 4 |
| Planning (Layer 3) | 2 | 0 | 2 | 2 |
| Execution (Layer 4) | 7 | 0 | 5 | 7 |
| Quality (Layer 5) | 5 | 0 | 4 | 5 |
| Persistence (Layer 6) | 7 | 0 | 7 | 7 |
| Infrastructure (Layer 7) | 2 | 0 | 2 | 2 |
| **Subtotal Production** | **61** | - | **46** | **61** |
| Build Tools | 0 | 6 | 5 | 6 |
| Code Quality | 0 | 10 | 5 | 10 |
| Git Hooks | 0 | 4 | 4 | 4 |
| Types | 0 | 6 | - | 6 |
| **Subtotal Dev** | - | **26** | **14** | **26** |
| **TOTAL** | **61** | **26** | **60** | **87** |

### Version Pinning Strategy

```jsonc
// package.json version constraints
{
  // CRITICAL: Pin major versions for stability
  "dependencies": {
    "react": "^18.3.0",        // ^18.x - Allow minor/patch updates
    "@anthropic-ai/sdk": "^0.32.0",  // ^0.x - SDK evolving rapidly
    "better-sqlite3": "^11.3.0"      // ^11.x - Native module, careful updates
  },

  // IMPORTANT: Lock native modules in shrinkwrap/lockfile
  // better-sqlite3, @xenova/transformers require native compilation

  // DEV: More flexible versioning acceptable
  "devDependencies": {
    "vitest": "^2.1.0",        // Latest features welcome
    "eslint": "^9.12.0",       // Keep current for rule updates
    "typescript": "^5.4.0"     // Align with project features
  }
}
```

### Dependency Update Policy

| Category | Update Frequency | Testing Required |
|----------|------------------|------------------|
| Security patches | Immediate | Smoke tests |
| AI SDKs (@anthropic, @google) | Weekly review | Full integration tests |
| Native modules (better-sqlite3) | Quarterly | Full regression + build |
| React ecosystem | Monthly | Full E2E suite |
| Dev tools | As needed | CI pipeline |

### Critical Dependency Risks

| Package | Risk | Mitigation |
|---------|------|------------|
| better-sqlite3 | Native compilation issues | Pre-built binaries, fallback to sql.js |
| @xenova/transformers | Large bundle size (~500MB models) | Lazy loading, optional feature |
| electron | Security vulnerabilities | Regular updates, context isolation |
| @anthropic-ai/sdk | API changes | Version lock, adapter pattern |
| simple-git | Command injection | Input sanitization, safe defaults |

### Complete package.json

```json
{
  "name": "nexus",
  "version": "0.1.0",
  "description": "Nexus AI Builder - Multi-agent autonomous development",
  "type": "module",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "typecheck": "tsc --noEmit",
    "prepare": "husky",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.0",
    "immer": "^10.1.0",
    "@tanstack/react-query": "^5.59.0",

    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "@radix-ui/react-tooltip": "^1.1.0",

    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.447.0",

    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "@tanstack/react-virtual": "^3.10.0",
    "@monaco-editor/react": "^4.6.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0",
    "framer-motion": "^11.11.0",

    "eventemitter3": "^5.0.0",
    "p-queue": "^8.0.0",
    "p-retry": "^6.2.0",
    "ms": "^2.1.0",

    "uuid": "^10.0.0",
    "nanoid": "^5.0.0",

    "@anthropic-ai/sdk": "^0.32.0",
    "@google/generative-ai": "^0.21.0",
    "openai": "^4.72.0",
    "@xenova/transformers": "^2.17.0",

    "execa": "^9.4.0",
    "tree-kill": "^1.2.0",
    "shell-quote": "^1.8.0",

    "better-sqlite3": "^11.3.0",
    "drizzle-orm": "^0.30.0",

    "fs-extra": "^11.2.0",
    "pathe": "^1.1.0",
    "fast-glob": "^3.3.0",
    "chokidar": "^4.0.0",

    "simple-git": "^3.27.0",
    "parse-diff": "^0.11.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "electron": "^33.0.0",

    "vite": "^5.4.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "@swc/core": "^1.7.0",
    "@vitejs/plugin-react-swc": "^3.7.0",
    "electron-builder": "^24.13.0",

    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "playwright": "^1.48.0",
    "@playwright/test": "^1.48.0",

    "drizzle-kit": "^0.21.0",

    "eslint": "^9.12.0",
    "typescript-eslint": "^8.8.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-jsx-a11y": "^6.10.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "@trivago/prettier-plugin-sort-imports": "^4.3.0",

    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0",

    "@types/node": "^22.7.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/fs-extra": "^11.0.0",
    "@types/ms": "^0.7.0"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.12.0"
}
```

### Part G Completion

- [x] Core runtime dependencies documented (3 packages)
- [x] UI Layer dependencies documented (31 packages)
- [x] Orchestration Layer dependencies documented (4 packages)
- [x] Planning Layer dependencies documented (2 packages)
- [x] Execution Layer dependencies documented (7 packages)
- [x] Quality Layer dependencies documented (5 packages)
- [x] Persistence Layer dependencies documented (7 packages)
- [x] Infrastructure Layer dependencies documented (2 packages)
- [x] Development dependencies documented (26 packages)
- [x] Version pinning strategy defined
- [x] Dependency update policy documented
- [x] Critical dependency risks identified
- [x] Complete package.json provided

---

## Part H: Architecture Decision Records (ADRs)

This section documents all significant architectural decisions made during the design of Nexus. Each ADR follows the standard format: Context, Decision, Consequences, and Alternatives Considered.

### ADR Index

| ADR ID | Title | Status | Date |
|--------|-------|--------|------|
| ADR-001 | State Management Approach | Accepted | 2026-01-13 |
| ADR-002 | Agent Model Selection | Accepted | 2026-01-13 |
| ADR-003 | Persistence Strategy | Accepted | 2026-01-13 |
| ADR-004 | Git Worktree-Based Isolation | Accepted | 2026-01-13 |
| ADR-005 | Event-Driven Architecture | Accepted | 2026-01-13 |
| ADR-006 | Multi-Provider LLM Support | Accepted | 2026-01-13 |
| ADR-007 | 30-Minute Task Time Limit | Accepted | 2026-01-13 |
| ADR-008 | QA Loop Iteration Strategy | Accepted | 2026-01-13 |
| ADR-009 | Desktop Application via Electron | Accepted | 2026-01-13 |
| ADR-010 | Monorepo vs Multi-Package Structure | Accepted | 2026-01-13 |

---

### ADR-001: State Management Approach

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus requires state management at two levels:
1. **UI State** - React component state, user preferences, UI mode (Genesis/Evolution)
2. **Application State** - Project data, task queues, agent status, requirements

Key requirements:
- Real-time synchronization between UI and backend
- Recovery from crashes (persistence)
- Support for concurrent agent updates
- Minimal boilerplate for developer productivity
- TypeScript-first with strong type inference

#### Decision

**We will use a hybrid approach:**

1. **Zustand** for UI layer state management
   - Lightweight (~2KB), no boilerplate
   - Built-in middleware support (immer, persist)
   - Works well with React 18+ concurrent features
   - TypeScript-native with excellent inference

2. **TanStack Query** for server/async state
   - Handles caching, background updates, optimistic updates
   - Automatic refetching and stale-while-revalidate
   - Perfect for task status polling and agent updates

3. **GSD STATE.md Pattern** for file-based persistence
   - Human-readable checkpoint format
   - Git-trackable for version history
   - Recovery point for crash scenarios

#### Implementation

```typescript
// Zustand store for UI state
interface UIStore {
  mode: 'genesis' | 'evolution';
  activeProjectId: string | null;
  sidebarCollapsed: boolean;
  // ...actions
}

// TanStack Query for server state
const useProject = (id: string) => useQuery({
  queryKey: ['project', id],
  queryFn: () => projectApi.get(id),
  staleTime: 30_000, // 30 seconds
});

// STATE.md for persistence
const stateContent = `
## Current Task
- ID: F001-A-01
- Status: in-progress
- Agent: coder-1

## Queue
1. F001-A-02 (pending)
2. F001-A-03 (pending)
`;
```

#### Consequences

**Positive:**
- Simple mental model: UI state in Zustand, server state in TanStack Query
- Automatic cache invalidation reduces manual state sync
- STATE.md provides human-readable checkpoints
- Easy testing with isolated stores

**Negative:**
- Three state systems to understand (Zustand, TanStack Query, STATE.md)
- STATE.md parsing adds complexity
- Potential for state drift between systems

**Mitigations:**
- Clear documentation on which state goes where
- Event system ensures all systems stay in sync
- Automated tests for state consistency

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Redux Toolkit | More boilerplate, larger bundle (~12KB vs ~2KB) |
| Jotai | Less ecosystem support for complex state |
| MobX | Proxy-based reactivity harder to debug |
| Plain React Context | No built-in persistence, middleware |
| Recoil | Facebook-backed but less active development |

---

### ADR-002: Agent Model Selection

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus requires multiple AI agents working together. Key decisions needed:
- How many agent types?
- Which LLM for each agent type?
- How to assign tasks to agents?
- How to handle agent specialization vs generalization?

Source analysis:
- Auto-Claude: Uses single-model with role-based prompts
- GSD: Uses Claude claude-sonnet-4-20250514 for all tasks
- Ralph: Multi-provider support (Claude, Gemini, GPT)

#### Decision

**We will use 5 specialized agent types with optimal model pairing:**

| Agent Type | Primary Model | Backup Model | Rationale |
|------------|---------------|--------------|-----------|
| **Planner** | Claude Opus 4 | Claude Sonnet 4 | Complex reasoning, strategic planning |
| **Coder** | Claude Sonnet 4 | Claude Sonnet 4 | Fast coding, good at implementation |
| **Reviewer** | Gemini 2.5 Pro | Claude Sonnet 4 | Different perspective, large context |
| **Tester** | Claude Sonnet 4 | Claude Haiku | Test generation, fast iteration |
| **Merger** | Claude Sonnet 4 | Claude Haiku | Git operations, conflict resolution |

**Agent Selection Matrix:**

```typescript
const selectModel = (agent: AgentType, complexity: TaskComplexity): Model => {
  const matrix: Record<AgentType, Record<TaskComplexity, Model>> = {
    planner: {
      low: 'claude-sonnet-4-20250514',
      medium: 'claude-sonnet-4-20250514',
      high: 'claude-opus-4-20250514',
      critical: 'claude-opus-4-20250514',
    },
    coder: {
      low: 'claude-haiku-3.5',
      medium: 'claude-sonnet-4-20250514',
      high: 'claude-sonnet-4-20250514',
      critical: 'claude-sonnet-4-20250514',
    },
    reviewer: {
      low: 'gemini-2.5-flash',
      medium: 'gemini-2.5-pro',
      high: 'gemini-2.5-pro',
      critical: 'gemini-2.5-pro',
    },
    tester: {
      low: 'claude-haiku-3.5',
      medium: 'claude-sonnet-4-20250514',
      high: 'claude-sonnet-4-20250514',
      critical: 'claude-sonnet-4-20250514',
    },
    merger: {
      low: 'claude-haiku-3.5',
      medium: 'claude-sonnet-4-20250514',
      high: 'claude-sonnet-4-20250514',
      critical: 'claude-sonnet-4-20250514',
    },
  };
  return matrix[agent][complexity];
};
```

#### Consequences

**Positive:**
- Optimal cost/performance per task type
- Reviewer diversity reduces blind spots (different AI perspective)
- Specialization enables better system prompts
- Clear responsibility boundaries

**Negative:**
- Multiple API integrations to maintain
- Model availability may vary by region
- Pricing changes affect cost projections
- Need fallback logic for service outages

**Mitigations:**
- Unified LLM provider abstraction layer
- Graceful degradation when preferred model unavailable
- Cost tracking and alerts per agent type
- Circuit breaker for repeated failures

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Single model for all | No cost optimization, no diversity in review |
| Local models only | Quality insufficient for production code |
| OpenAI GPT-4 for all | Higher cost, less competitive on coding |
| Per-task model selection | Too complex, unclear ownership |

---

### ADR-003: Persistence Strategy

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus must persist:
- User requirements (structured data)
- Project state (tasks, progress, agent assignments)
- Memory/embeddings (semantic search)
- Session data (current work, checkpoints)

Requirements:
- No external database server (standalone desktop app)
- Portable project data
- Human-readable recovery files
- Support for semantic search
- Fast read/write for real-time updates

#### Decision

**We will use a hybrid storage approach:**

| Data Type | Storage | Format | Rationale |
|-----------|---------|--------|-----------|
| **Requirements** | JSON Files | `requirements/*.json` | Human-readable, git-trackable |
| **Project State** | SQLite | `.nexus/nexus.db` | Relational queries, atomic writes |
| **Memory/Embeddings** | SQLite + Binary | `.nexus/memory.db` | Vector search with sqlite-vec |
| **Checkpoints** | Markdown | `STATE.md` | Human recovery, GSD compatible |
| **Session** | In-memory + SQLite | Runtime + WAL | Fast access, crash recovery |

**Database Schema Strategy:**

```sql
-- Core tables in nexus.db
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT CHECK(mode IN ('genesis', 'evolution')),
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  feature_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_agent TEXT,
  time_estimate INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Vector storage in memory.db
CREATE VIRTUAL TABLE embeddings USING vec0(
  embedding FLOAT[1536]  -- OpenAI text-embedding-3-small dimension
);
```

**File Structure:**

```
project/
├── .nexus/
│   ├── nexus.db           # SQLite: projects, tasks, agents
│   ├── memory.db          # SQLite: embeddings, semantic memory
│   ├── checkpoints/       # Periodic state snapshots
│   │   ├── 2026-01-13-1200.json
│   │   └── 2026-01-13-1300.json
│   └── logs/              # Agent execution logs
├── requirements/
│   ├── core/
│   │   └── features.json
│   ├── technical/
│   │   └── constraints.json
│   └── design/
│       └── ui-specs.json
└── STATE.md               # Human-readable current state
```

#### Consequences

**Positive:**
- No external dependencies (SQLite is embedded)
- Human-readable requirements and checkpoints
- Git-trackable project configuration
- Fast queries with proper indexing
- Vector search for semantic memory

**Negative:**
- Multiple storage systems to manage
- JSON/SQLite sync complexity
- SQLite WAL mode requires careful handling
- Vector search performance limited compared to dedicated vector DB

**Mitigations:**
- Drizzle ORM for type-safe SQLite access
- Write-ahead logging (WAL) for crash recovery
- Automated consistency checks between JSON and SQLite
- Index optimization for common query patterns

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| PostgreSQL | Requires external server, not portable |
| MongoDB | Complex setup, overkill for desktop app |
| Pure JSON files | No relational queries, poor for large datasets |
| IndexedDB | Browser-only, not suitable for Electron main process |
| LevelDB | Less querying capability than SQLite |

---

### ADR-004: Git Worktree-Based Isolation

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus runs multiple agents in parallel, each potentially modifying code. Key challenges:
- Prevent agents from interfering with each other's work
- Enable true parallel execution
- Support easy rollback of individual agent work
- Maintain clean commit history

Source analysis:
- Auto-Claude: Uses git worktrees for agent isolation
- GSD: Single-threaded, no isolation needed
- General practice: Branch-per-feature

#### Decision

**We will use Git worktrees for agent isolation:**

```
project/
├── .git/                   # Main repository
├── src/                    # Main worktree (main branch)
├── .nexus/
│   └── worktrees/
│       ├── agent-coder-1/  # worktree for coder-1 (feature/F001-A-01)
│       ├── agent-coder-2/  # worktree for coder-2 (feature/F001-B-01)
│       └── agent-tester/   # worktree for tester (test/F001-A-01)
```

**Worktree Lifecycle:**

```typescript
interface WorktreeManager {
  // Create worktree for agent task
  create(agentId: string, taskId: string): Promise<WorktreePath>;

  // Get worktree path for agent
  get(agentId: string): WorktreePath | null;

  // Cleanup worktree after merge
  remove(agentId: string): Promise<void>;

  // List all active worktrees
  list(): Promise<WorktreeInfo[]>;
}

// Usage
const worktreePath = await worktreeManager.create('coder-1', 'F001-A-01');
// Agent works in worktreePath
await worktreeManager.remove('coder-1'); // After merge
```

**Branch Naming Convention:**

```
main                        # Production code
├── feature/F001-A-01       # Feature task branch
├── feature/F001-A-02       # Another feature task
├── test/F001-A-01          # Test branch for feature
└── fix/F001-A-01-review    # Fix branch after review
```

#### Consequences

**Positive:**
- True file system isolation per agent
- No merge conflicts during parallel work
- Clean rollback via worktree removal
- Familiar git workflow for developers
- No lock contention on files

**Negative:**
- Disk space for multiple checkouts
- Worktree management overhead
- Need to handle orphaned worktrees
- Git operations add latency

**Mitigations:**
- Cleanup worktrees immediately after merge
- Limit concurrent worktrees (configurable, default 5)
- Orphan detection and cleanup on startup
- Shallow clones for worktrees to reduce disk usage

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| In-memory file system | Complex, no git integration |
| Lock-based single worktree | Serializes all agent work |
| Docker containers per agent | Heavy, complex orchestration |
| Branch-only (no worktrees) | Requires constant switching, error-prone |

---

### ADR-005: Event-Driven Architecture

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus has multiple components that need to react to state changes:
- UI needs real-time updates on task progress
- Persistence layer needs to save state changes
- Orchestrator needs to assign next tasks
- Metrics need to record events

Traditional approach: Direct function calls or polling
Modern approach: Event-driven with pub/sub

#### Decision

**We will use event-driven architecture with EventEmitter3:**

```typescript
// Core event types
enum NexusEventType {
  // Task lifecycle
  TASK_CREATED = 'task.created',
  TASK_ASSIGNED = 'task.assigned',
  TASK_STARTED = 'task.started',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',

  // Agent lifecycle
  AGENT_STARTED = 'agent.started',
  AGENT_IDLE = 'agent.idle',
  AGENT_ERROR = 'agent.error',

  // Project lifecycle
  PROJECT_STARTED = 'project.started',
  PROJECT_PAUSED = 'project.paused',
  PROJECT_COMPLETED = 'project.completed',

  // QA Loop
  QA_ITERATION_START = 'qa.iteration.start',
  QA_ITERATION_END = 'qa.iteration.end',
  QA_ESCALATION = 'qa.escalation',
}

// Typed event payloads
interface NexusEventMap {
  [NexusEventType.TASK_COMPLETED]: { taskId: string; result: TaskResult };
  [NexusEventType.AGENT_ERROR]: { agentId: string; error: Error };
  // ...
}

// Event bus implementation
class NexusEventBus extends EventEmitter3<NexusEventMap> {
  emit<K extends keyof NexusEventMap>(
    event: K,
    payload: NexusEventMap[K]
  ): boolean;
}
```

**Event Flow Example:**

```
TASK_COMPLETED
    │
    ├──► UIStore.updateTaskStatus()      // UI update
    ├──► PersistenceLayer.saveState()    // Persist to SQLite
    ├──► Coordinator.assignNextTask()    // Assign next task
    └──► MetricsCollector.recordEvent()  // Analytics
```

#### Consequences

**Positive:**
- Loose coupling between layers
- Easy to add new listeners
- Natural async processing
- Testable with event spies
- Replay capability for debugging

**Negative:**
- Event ordering can be tricky
- Memory leaks from unremoved listeners
- Harder to trace execution flow
- Need event schema versioning

**Mitigations:**
- Strict TypeScript types for all events
- Auto-cleanup listeners on component unmount
- Event tracing in development mode
- Structured logging of all events

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Direct function calls | Tight coupling, hard to extend |
| Redux middleware | Requires Redux, more complex |
| RxJS Observables | Steep learning curve, large bundle |
| Custom pub/sub | Reinventing the wheel |
| WebSockets | Overkill for same-process communication |

---

### ADR-006: Multi-Provider LLM Support

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus uses multiple AI providers:
- Anthropic (Claude) - Primary for planning and coding
- Google (Gemini) - For review and research
- OpenAI - For embeddings

Requirements:
- Unified interface across providers
- Provider-specific optimizations
- Graceful fallback when provider unavailable
- Cost tracking per provider
- Rate limit handling

Source analysis:
- Ralph: Multi-provider via ACP protocol
- Auto-Claude: Claude-only
- OMO: Multi-provider with fallback

#### Decision

**We will create a unified LLM provider abstraction:**

```typescript
// Unified provider interface
interface LLMProvider {
  id: string;
  name: string;
  models: ModelInfo[];

  // Core methods
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;

  // Provider-specific features
  supportsTools(): boolean;
  supportsVision(): boolean;
  getContextLimit(model: string): number;

  // Health and limits
  isAvailable(): Promise<boolean>;
  getRateLimitStatus(): RateLimitInfo;
}

// Provider implementations
class ClaudeProvider implements LLMProvider { /*...*/ }
class GeminiProvider implements LLMProvider { /*...*/ }
class OpenAIProvider implements LLMProvider { /*...*/ }

// Unified client with fallback
class UnifiedLLMClient {
  constructor(private providers: Map<string, LLMProvider>) {}

  async complete(
    request: CompletionRequest,
    options: { provider?: string; fallback?: string[] }
  ): Promise<CompletionResponse> {
    const providerOrder = options.provider
      ? [options.provider, ...(options.fallback || [])]
      : ['claude', 'gemini', 'openai'];

    for (const providerId of providerOrder) {
      const provider = this.providers.get(providerId);
      if (await provider?.isAvailable()) {
        try {
          return await provider.complete(request);
        } catch (e) {
          if (!this.isRetryable(e)) throw e;
        }
      }
    }
    throw new Error('All providers unavailable');
  }
}
```

**Provider Selection Matrix:**

| Use Case | Primary Provider | Fallback | Rationale |
|----------|------------------|----------|-----------|
| Planning | Claude Opus | Claude Sonnet | Best reasoning |
| Coding | Claude Sonnet | Claude Haiku | Fast, accurate |
| Review | Gemini 2.5 Pro | Claude Sonnet | Different perspective |
| Research | Gemini 2.5 Pro | Claude Sonnet | Large context |
| Embeddings | OpenAI | Local (transformers.js) | Best quality/cost |

#### Consequences

**Positive:**
- Flexibility to use best model per task
- Resilience through fallback
- Cost optimization per use case
- Future-proof for new providers/models

**Negative:**
- Multiple API keys to manage
- Different error handling per provider
- Inconsistent feature support
- Testing complexity

**Mitigations:**
- Unified error types with provider-specific mapping
- Feature detection before use
- Mock providers for testing
- Environment variable management for keys

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Single provider (Claude only) | No fallback, no cost optimization |
| LangChain | Too heavy, abstraction overhead |
| LiteLLM | Python-only, Node.js version immature |
| Vercel AI SDK | Less control over provider-specific features |

---

### ADR-007: 30-Minute Task Time Limit

#### Status
**Accepted** - 2026-01-13

#### Context

A core Nexus principle is atomic tasks that can be completed quickly. Key considerations:
- Prevent runaway agent execution
- Enable meaningful progress checkpoints
- Support human oversight
- Match LLM context window limitations
- Align with development best practices (small PRs)

Source analysis:
- GSD: Implicit small task principle
- NEXUS description: "30 minutes or less" hard requirement
- Industry: 15-60 minute developer tasks common

#### Decision

**We will enforce a 30-minute maximum task execution time:**

```typescript
const TASK_TIME_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

interface TaskExecutionConfig {
  maxDuration: number;           // Default: 30 minutes
  warningThreshold: number;      // Default: 25 minutes (alert)
  checkpointInterval: number;    // Default: 10 minutes (auto-save)
  hardKillAfter: number;         // Default: 35 minutes (force stop)
}

class TaskExecutor {
  async execute(task: Task, agent: Agent): Promise<TaskResult> {
    const timeout = this.createTimeout(task);
    const checkpointer = this.createCheckpointer(task);

    try {
      const result = await Promise.race([
        agent.execute(task),
        timeout.promise,
      ]);
      return result;
    } catch (error) {
      if (error instanceof TaskTimeoutError) {
        await this.handleTimeout(task, agent);
      }
      throw error;
    } finally {
      timeout.cancel();
      checkpointer.stop();
    }
  }

  private async handleTimeout(task: Task, agent: Agent): Promise<void> {
    // 1. Save current progress
    await this.savePartialProgress(task, agent);
    // 2. Create continuation task
    await this.createContinuationTask(task);
    // 3. Log for analysis
    this.logTimeout(task);
  }
}
```

**Task Decomposition Rules:**

| Complexity Indicator | Action |
|---------------------|--------|
| >3 files modified | Split into sub-tasks |
| >200 lines of code | Split into sub-tasks |
| Multiple concerns | Split by concern |
| Integration required | Split: implement, integrate |

**Estimation Algorithm:**

```typescript
function estimateTaskTime(task: Task): number {
  let estimate = 5; // Base: 5 minutes

  // Files impact
  estimate += task.files.length * 3; // 3 min per file

  // Complexity multipliers
  if (task.requiresNewFile) estimate *= 1.5;
  if (task.hasExternalDependency) estimate *= 1.3;
  if (task.requiresTesting) estimate += 5;

  // Cap at 25 minutes (leave buffer)
  return Math.min(estimate, 25);
}
```

#### Consequences

**Positive:**
- Predictable progress increments
- Natural checkpointing points
- Prevents token runaway
- Enables cost estimation
- Supports parallel work

**Negative:**
- Some tasks naturally take longer
- Overhead from task splitting
- Continuation logic complexity
- May feel restrictive for complex features

**Mitigations:**
- Sub-task system for large work
- Partial progress preservation
- Clear continuation handoff
- User override for special cases (with warning)

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| No time limit | Runaway execution, unpredictable costs |
| 60-minute limit | Too coarse, less frequent checkpoints |
| 15-minute limit | Too restrictive for meaningful work |
| Dynamic limit | Complex to implement, unpredictable |
| Token-based limit | Doesn't account for execution time |

---

### ADR-008: QA Loop Iteration Strategy

#### Status
**Accepted** - 2026-01-13

#### Context

The QA Loop is central to Nexus code quality. Questions:
- How many iterations before escalation?
- When to involve humans?
- How to prevent infinite loops?
- How to balance thoroughness vs speed?

Source analysis:
- Auto-Claude: 50-iteration max, human escalation
- Industry: CI/CD typically 3 retries
- Experience: Most issues resolved in 1-5 iterations

#### Decision

**We will use a tiered iteration strategy:**

```typescript
interface QALoopConfig {
  // Iteration limits
  maxIterations: 50;           // Hard cap
  warningIterations: 10;       // Log warning
  escalationIterations: 25;    // Offer human help

  // Early exit conditions
  minConfidence: 0.95;         // Exit if highly confident
  stabilityThreshold: 3;       // Exit if same result 3x

  // Timeouts
  maxLoopDuration: 30 * 60;    // 30 minutes total
  iterationTimeout: 5 * 60;    // 5 minutes per iteration
}

enum QALoopState {
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  ESCALATED = 'escalated',
  TIMEOUT = 'timeout',
}

class QALoopEngine {
  async run(changes: CodeChanges): Promise<QALoopResult> {
    let iteration = 0;
    let lastResult: QAResult | null = null;
    let stableCount = 0;

    while (iteration < this.config.maxIterations) {
      iteration++;

      // Run QA checks
      const result = await this.runChecks(changes);

      // Check for stability (same result)
      if (this.isSameResult(result, lastResult)) {
        stableCount++;
        if (stableCount >= this.config.stabilityThreshold) {
          return this.exitStable(result);
        }
      } else {
        stableCount = 0;
      }

      // Check for success
      if (result.passed && result.confidence >= this.config.minConfidence) {
        return this.exitSuccess(result);
      }

      // Check escalation threshold
      if (iteration === this.config.escalationIterations) {
        const humanDecision = await this.requestHumanHelp(result);
        if (humanDecision === 'abort') return this.exitEscalated(result);
      }

      // Apply fixes and continue
      await this.applyFixes(result.suggestions);
      lastResult = result;
    }

    return this.exitMaxIterations(lastResult);
  }
}
```

**QA Check Sequence:**

```
Iteration N:
    │
    ├─► Build Check ──────► Pass/Fail
    │       │
    │       ▼ (if pass)
    ├─► Lint Check ───────► Pass/Fail + Suggestions
    │       │
    │       ▼ (if pass)
    ├─► Type Check ───────► Pass/Fail + Errors
    │       │
    │       ▼ (if pass)
    ├─► Unit Tests ───────► Pass/Fail + Coverage
    │       │
    │       ▼ (if pass)
    ├─► Code Review ──────► Approve/Changes + Feedback
    │       │
    │       ▼ (if approve)
    └─► SUCCESS (exit loop)
```

**Escalation Triggers:**

| Trigger | Action |
|---------|--------|
| 25 iterations | Offer human intervention |
| Same failure 3x | Likely fundamental issue |
| Build fails 5x | Possible dependency issue |
| Review rejects 3x | May need requirements clarification |

#### Consequences

**Positive:**
- Prevents infinite loops
- Human escalation at right time
- Metrics on iteration patterns
- Early exit for confident results
- Stable exit prevents thrashing

**Negative:**
- 50 iterations may be too many for simple issues
- Stability detection could miss edge cases
- Human interrupts may delay automation

**Mitigations:**
- Adaptive iteration limits based on task type
- Pattern detection for common failures
- Async human escalation (continue while waiting)
- Clear metrics for tuning thresholds

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Fixed 3 retries | Too few for complex issues |
| No limit | Risk of infinite loops, runaway costs |
| Human approval each iteration | Too slow, defeats automation |
| AI-determined limit | Unpredictable, hard to debug |

---

### ADR-009: Desktop Application via Electron

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus needs to:
- Access local file system (read/write code)
- Execute shell commands (git, npm, etc.)
- Run for extended periods
- Work offline (after initial setup)
- Provide rich UI

Deployment options:
- Web application (browser-based)
- Desktop application (Electron, Tauri)
- CLI tool
- VS Code extension

#### Decision

**We will build Nexus as an Electron desktop application:**

```typescript
// Main process - full Node.js access
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { FileSystemService } from './services/file-system';
import { GitService } from './services/git';
import { ProcessService } from './services/process';

// Renderer process - React UI
// src/renderer/index.tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
```

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────┐│
│  │   RENDERER PROCESS  │    │      MAIN PROCESS          ││
│  │   (Chromium)        │◄──►│      (Node.js)             ││
│  │                     │ IPC│                            ││
│  │  React UI           │    │  File System Access        ││
│  │  Zustand State      │    │  Git Operations            ││
│  │  TanStack Query     │    │  Shell Commands            ││
│  │                     │    │  SQLite Database           ││
│  │                     │    │  LLM API Calls             ││
│  └─────────────────────┘    └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**IPC Communication:**

```typescript
// Main process handler
ipcMain.handle('file:read', async (event, path: string) => {
  return fileSystemService.read(path);
});

// Renderer process call
const content = await window.electron.invoke('file:read', filePath);
```

**Security Configuration:**

```typescript
// Main process - create window
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // Security: no Node in renderer
    contextIsolation: true,           // Security: isolated context
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true,                    // Security: sandboxed renderer
  },
});
```

#### Consequences

**Positive:**
- Full file system and git access
- Rich, responsive UI
- Offline capable
- Cross-platform (Windows, macOS, Linux)
- Single installation, no server required

**Negative:**
- Larger application size (~150MB)
- Chromium memory overhead
- Security considerations (careful with IPC)
- Slower startup than native apps
- Update distribution complexity

**Mitigations:**
- Delta updates via electron-updater
- Memory monitoring and limits
- Strict IPC validation
- Lazy loading of features
- Context isolation for security

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Web app | Cannot access local file system directly |
| Tauri | Less mature ecosystem, Rust learning curve |
| CLI only | Poor UX for complex workflows |
| VS Code extension | Limited to VS Code users, constrained UI |
| Native (Swift/Kotlin) | Two codebases, no code reuse |

---

### ADR-010: Monorepo vs Multi-Package Structure

#### Status
**Accepted** - 2026-01-13

#### Context

Nexus has multiple logical packages:
- UI components
- Orchestration engine
- Planning engine
- Persistence layer
- CLI (future)

Options:
- Single package (all code together)
- Monorepo with workspaces
- Multiple repositories

#### Decision

**We will use a single-package structure with layer-based directories:**

```
nexus/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts
│   │   ├── ipc/                 # IPC handlers
│   │   └── services/            # Main process services
│   │
│   ├── renderer/                # Electron renderer (React)
│   │   ├── index.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── stores/
│   │
│   ├── shared/                  # Shared types and utilities
│   │   ├── types/
│   │   ├── constants/
│   │   └── utils/
│   │
│   ├── orchestration/           # Layer 2
│   ├── planning/                # Layer 3
│   ├── execution/               # Layer 4
│   ├── quality/                 # Layer 5
│   ├── persistence/             # Layer 6
│   └── infrastructure/          # Layer 7
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json                 # Single package
├── tsconfig.json
└── vite.config.ts
```

**Path Aliases:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@main/*": ["./src/main/*"],
      "@renderer/*": ["./src/renderer/*"],
      "@shared/*": ["./src/shared/*"],
      "@orchestration/*": ["./src/orchestration/*"],
      "@planning/*": ["./src/planning/*"],
      "@execution/*": ["./src/execution/*"],
      "@quality/*": ["./src/quality/*"],
      "@persistence/*": ["./src/persistence/*"],
      "@infrastructure/*": ["./src/infrastructure/*"]
    }
  }
}
```

**Import Example:**

```typescript
// src/orchestration/coordinator.ts
import { Task } from '@shared/types';
import { TaskDecomposer } from '@planning/decomposer';
import { QALoopEngine } from '@execution/qa-loop';
import { StateManager } from '@persistence/state';
```

#### Consequences

**Positive:**
- Simpler tooling (single package.json)
- No workspace linking issues
- Faster builds (single compilation)
- Easier refactoring across layers
- Single version for all code

**Negative:**
- Cannot publish layers as separate packages
- All code must use same dependency versions
- Larger initial install
- No independent versioning per layer

**Mitigations:**
- Clear directory boundaries enforce modularity
- Path aliases prevent deep relative imports
- Layer interfaces documented in types
- Future extraction to monorepo possible if needed

#### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| pnpm monorepo | Overhead for single-app project |
| Nx monorepo | Too complex for initial development |
| Multi-repo | Coordination overhead, version drift |
| Turborepo | Not needed without multiple packages |

---

### Part H Completion

- [x] ADR-001: State Management Approach documented
- [x] ADR-002: Agent Model Selection documented
- [x] ADR-003: Persistence Strategy documented
- [x] ADR-004: Git Worktree-Based Isolation documented
- [x] ADR-005: Event-Driven Architecture documented
- [x] ADR-006: Multi-Provider LLM Support documented
- [x] ADR-007: 30-Minute Task Time Limit documented
- [x] ADR-008: QA Loop Iteration Strategy documented
- [x] ADR-009: Desktop Application via Electron documented
- [x] ADR-010: Monorepo vs Multi-Package Structure documented

---

## Part I: Architecture Summary Diagram

This section provides comprehensive visual summaries of the Nexus architecture, showing how all components, layers, and decisions come together.

### Complete System Architecture Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                           NEXUS AI BUILDER                                                          ║
║                                    Autonomous Software Development System                                            ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
║  │                                          LAYER 1: USER INTERFACE                                                 │ ║
║  │                                     React 18 + Zustand + shadcn/ui + Tailwind                                   │ ║
║  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐│ ║
║  │  │    Interview     │  │      Kanban      │  │    Dashboard     │  │    Settings      │  │    File Browser   ││ ║
║  │  │       UI         │  │       Board      │  │    (Progress)    │  │    (Config)      │  │    (Monaco)       ││ ║
║  │  │  Genesis Mode    │  │   Task Columns   │  │   Agent Status   │  │  API Keys/Prefs  │  │   Code Viewer     ││ ║
║  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └──────────┬─────────┘│ ║
║  │           │                     │                     │                     │                       │          │ ║
║  │           └─────────────────────┴─────────────────────┴─────────────────────┴───────────────────────┘          │ ║
║  │                                                       │                                                          │ ║
║  │                                           ┌───────────┴───────────┐                                             │ ║
║  │                                           │    Electron IPC       │                                             │ ║
║  │                                           │  (Secure Bridge)      │                                             │ ║
║  │                                           └───────────┬───────────┘                                             │ ║
║  └───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┘ ║
║                                                          │                                                            ║
║  ┌───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┐ ║
║  │                                          LAYER 2: ORCHESTRATION                                                  │ ║
║  │                                        Ralph ACP + EventEmitter3                                                 │ ║
║  │                                                       │                                                          │ ║
║  │  ┌────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┐│ ║
║  │  │                                    NEXUS COORDINATOR                                                         ││ ║
║  │  │                           (Central Control, Mode Management, Agent Lifecycle)                               ││ ║
║  │  │                                                                                                              ││ ║
║  │  │  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ││ ║
║  │  │  │                                         AGENT POOL                                                      │ ││ ║
║  │  │  │                                                                                                         │ ││ ║
║  │  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │ ││ ║
║  │  │  │  │    PLANNER      │  │     CODER       │  │    REVIEWER     │  │     TESTER      │  │    MERGER     │ │ ││ ║
║  │  │  │  │   (1 Active)    │  │   (1-4 Active)  │  │   (1 Active)    │  │   (1 Active)    │  │  (1 Active)   │ │ ││ ║
║  │  │  │  │                 │  │                 │  │                 │  │                 │  │               │ │ ││ ║
║  │  │  │  │  Claude Opus 4  │  │ Claude Sonnet 4 │  │ Gemini 2.5 Pro  │  │ Claude Sonnet 4 │  │Claude Sonnet 4│ │ ││ ║
║  │  │  │  │                 │  │                 │  │                 │  │                 │  │               │ │ ││ ║
║  │  │  │  │  Strategic      │  │  Code Gen       │  │  Quality        │  │  Validation     │  │  Git Ops      │ │ ││ ║
║  │  │  │  │  Decomposition  │  │  Implementation │  │  Assessment     │  │  Test Writing   │  │  Conflict     │ │ ││ ║
║  │  │  │  │  Priority       │  │  File Ops       │  │  Code Review    │  │  Test Running   │  │  Resolution   │ │ ││ ║
║  │  │  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └───────┬───────┘ │ ││ ║
║  │  │  │           │                    │                    │                    │                   │         │ ││ ║
║  │  │  └───────────┼────────────────────┼────────────────────┼────────────────────┼───────────────────┼─────────┘ ││ ║
║  │  │              │                    │                    │                    │                   │           ││ ║
║  │  │              └────────────────────┴────────────────────┴────────────────────┴───────────────────┘           ││ ║
║  │  │                                                        │                                                     ││ ║
║  │  │                                            ┌───────────┴───────────┐                                         ││ ║
║  │  │                                            │    Message Queue      │                                         ││ ║
║  │  │                                            │   (Event-Driven)      │                                         ││ ║
║  │  │                                            └───────────┬───────────┘                                         ││ ║
║  │  └────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┘│ ║
║  └───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┘ ║
║                                                              │                                                        ║
║  ┌───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┐ ║
║  │                                           LAYER 3: PLANNING                                                      │ ║
║  │                                    GSD Task Discipline + AutoMaker                                               │ ║
║  │                                                           │                                                      │ ║
║  │  ┌───────────────────────┐  ┌────────────────────────┐   │   ┌───────────────────────┐  ┌───────────────────┐  │ ║
║  │  │   TASK DECOMPOSER     │  │  DEPENDENCY RESOLVER   │◄──┼──►│   TIME ESTIMATOR      │  │  PRIORITY SORTER  │  │ ║
║  │  │                       │  │                        │   │   │                       │  │                   │  │ ║
║  │  │  Feature → Tasks      │  │  Kahn's Algorithm      │   │   │  ≤30 min enforced     │  │  P0 → P3 bands    │  │ ║
║  │  │  Sub-features         │  │  DAG validation        │   │   │  AI estimation        │  │  Dependency-aware │  │ ║
║  │  │  Atomic units         │  │  Cycle detection       │   │   │  Historical data      │  │  Optimal order    │  │ ║
║  │  └───────────┬───────────┘  └────────────┬───────────┘   │   └───────────┬───────────┘  └─────────┬─────────┘  │ ║
║  │              │                           │               │               │                       │             │ ║
║  │              └───────────────────────────┴───────────────┴───────────────┴───────────────────────┘             │ ║
║  │                                                          │                                                      │ ║
║  └──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┘ ║
║                                                             │                                                         ║
║  ┌──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┐ ║
║  │                                          LAYER 4: EXECUTION                                                      │ ║
║  │                                    Auto-Claude QA Loop + OMO Tools                                               │ ║
║  │                                                          │                                                       │ ║
║  │                              ┌───────────────────────────┴───────────────────────────┐                           │ ║
║  │                              │                    QA LOOP ENGINE                      │                           │ ║
║  │                              │                   (Max 50 iterations)                  │                           │ ║
║  │                              │                                                        │                           │ ║
║  │   ┌───────────────────┐      │   ┌─────────┐    ┌─────────┐    ┌─────────┐          │      ┌──────────────────┐ │ ║
║  │   │                   │      │   │         │    │         │    │         │          │      │                  │ │ ║
║  │   │   TASK RUNNER     │─────►│   │  BUILD  │───►│  LINT   │───►│  TEST   │──────────│─────►│  REVIEW GATE     │ │ ║
║  │   │                   │      │   │         │    │         │    │         │          │      │                  │ │ ║
║  │   │  Worktree Setup   │      │   │ Compile │    │ ESLint  │    │ Vitest  │          │      │ Gemini Analysis  │ │ ║
║  │   │  Context Load     │      │   │ Bundle  │    │ Format  │    │ E2E     │          │      │ APPROVE/REJECT   │ │ ║
║  │   │  Tool Injection   │      │   │         │    │         │    │         │          │      │                  │ │ ║
║  │   └───────────────────┘      │   └────┬────┘    └────┬────┘    └────┬────┘          │      └────────┬─────────┘ │ ║
║  │                              │        │              │              │               │               │            │ ║
║  │                              │        │    ┌─────────┴──────────────┘               │               │            │ ║
║  │                              │        │    │                                        │               │            │ ║
║  │                              │   ┌────▼────▼─────┐      ┌─────────────────┐        │               │            │ ║
║  │                              │   │  ERROR?       │─────►│  FIX & RETRY    │────────┤               │            │ ║
║  │                              │   │  (Any stage)  │ Yes  │  (Back to Coder)│        │               │            │ ║
║  │                              │   └───────────────┘      └─────────────────┘        │               │            │ ║
║  │                              │                                                      │               │            │ ║
║  │                              └──────────────────────────────────────────────────────┘               │            │ ║
║  │                                                                                                     │            │ ║
║  │                                         ┌───────────────────────────────────────────────────────────┘            │ ║
║  │                                         │                                                                        │ ║
║  │                                         ▼                                                                        │ ║
║  │                              ┌──────────────────────┐                                                            │ ║
║  │                              │     MERGE GATE       │                                                            │ ║
║  │                              │                      │                                                            │ ║
║  │                              │  3-Tier Strategy:    │                                                            │ ║
║  │                              │  1. Deterministic    │                                                            │ ║
║  │                              │  2. AI-Assisted      │                                                            │ ║
║  │                              │  3. Human Review     │                                                            │ ║
║  │                              └──────────┬───────────┘                                                            │ ║
║  │                                         │                                                                        │ ║
║  └─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┘ ║
║                                            │                                                                          ║
║  ┌─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┐ ║
║  │                                         LAYER 5: QUALITY                                                          │ ║
║  │                                   Vitest + Playwright + Review Patterns                                           │ ║
║  │                                                                                                                   │ ║
║  │  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐ │ ║
║  │  │     UNIT TESTING       │  │     E2E TESTING        │  │    CODE REVIEW         │  │   COVERAGE TRACKER     │ │ ║
║  │  │                        │  │                        │  │                        │  │                        │ │ ║
║  │  │  Vitest                │  │  Playwright            │  │  Multi-Model Review    │  │  80% Line Target       │ │ ║
║  │  │  Happy Path + Edge     │  │  Electron Fixtures     │  │  9-Point Checklist     │  │  70% Branch Target     │ │ ║
║  │  │  Test Factories        │  │  Visual Regression     │  │  Severity Scoring      │  │  Critical Path: 100%   │ │ ║
║  │  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘ │ ║
║  │                                                                                                                   │ ║
║  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                                                       ║
║  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
║  │                                           LAYER 6: PERSISTENCE                                                    │ ║
║  │                                    SQLite + STATE.md + Checkpoints + Embeddings                                   │ ║
║  │                                                                                                                   │ ║
║  │  ┌───────────────────────────────────────┐  ┌───────────────────────────────────────┐                            │ ║
║  │  │          DATABASE LAYER               │  │           FILE LAYER                  │                            │ ║
║  │  │                                       │  │                                       │                            │ ║
║  │  │  ┌─────────────────────────────────┐  │  │  ┌─────────────────────────────────┐  │                            │ ║
║  │  │  │  SQLite + Drizzle ORM           │  │  │  │  STATE.md (GSD Format)          │  │                            │ ║
║  │  │  │                                 │  │  │  │                                 │  │                            │ ║
║  │  │  │  • requirements (schema)        │  │  │  │  • Current task status          │  │                            │ ║
║  │  │  │  • projects                     │  │  │  │  • Active agents                │  │                            │ ║
║  │  │  │  • features                     │  │  │  │  • Blockers                     │  │                            │ ║
║  │  │  │  • tasks                        │  │  │  │  • Next steps                   │  │                            │ ║
║  │  │  │  • agents                       │  │  │  │  • Decisions log                │  │                            │ ║
║  │  │  │  • checkpoints                  │  │  │  └─────────────────────────────────┘  │                            │ ║
║  │  │  │  • memory_entries               │  │  │                                       │                            │ ║
║  │  │  └─────────────────────────────────┘  │  │  ┌─────────────────────────────────┐  │                            │ ║
║  │  │                                       │  │  │  Requirements DB (JSON)         │  │                            │ ║
║  │  │  ┌─────────────────────────────────┐  │  │  │                                 │  │                            │ ║
║  │  │  │  Embeddings (text-embedding-3)  │  │  │  │  • core/                        │  │                            │ ║
║  │  │  │                                 │  │  │  │  • functional/                  │  │                            │ ║
║  │  │  │  • Semantic memory              │  │  │  │  • technical/                   │  │                            │ ║
║  │  │  │  • Context retrieval            │  │  │  │  • design/                      │  │                            │ ║
║  │  │  │  • Similar task lookup          │  │  │  │  • constraint/                  │  │                            │ ║
║  │  │  └─────────────────────────────────┘  │  │  │  • metadata/                    │  │                            │ ║
║  │  └───────────────────────────────────────┘  │  └─────────────────────────────────┘  │                            │ ║
║  │                                              └───────────────────────────────────────┘                            │ ║
║  │                                                                                                                   │ ║
║  │  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐│ ║
║  │  │                                      CHECKPOINT SYSTEM                                                        ││ ║
║  │  │                                                                                                               ││ ║
║  │  │  Automatic: Every 5 tasks  │  Manual: User-triggered  │  Recovery: Last-known-good  │  Retention: 50 max    ││ ║
║  │  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘│ ║
║  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                                                       ║
║  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
║  │                                         LAYER 7: INFRASTRUCTURE                                                   │ ║
║  │                                      Git Worktrees + LSP/AST + File System                                        │ ║
║  │                                                                                                                   │ ║
║  │  ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐                      │ ║
║  │  │          GIT WORKTREE MANAGER            │  │         CODE INTELLIGENCE                │                      │ ║
║  │  │                                          │  │                                          │                      │ ║
║  │  │  • 1 worktree per Coder agent            │  │  • TypeScript Language Server            │                      │ ║
║  │  │  • Automatic creation/cleanup            │  │  • AST parsing (via TypeScript)          │                      │ ║
║  │  │  • Parallel isolation                    │  │  • Symbol resolution                     │                      │ ║
║  │  │  • Branch-per-task convention            │  │  • Import graph analysis                 │                      │ ║
║  │  │                                          │  │  • Dependency detection                  │                      │ ║
║  │  └──────────────────────────────────────────┘  └──────────────────────────────────────────┘                      │ ║
║  │                                                                                                                   │ ║
║  │  ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐                      │ ║
║  │  │          FILE SYSTEM OPS                 │  │         PROCESS MANAGEMENT               │                      │ ║
║  │  │                                          │  │                                          │                      │ ║
║  │  │  • fs-extra for operations               │  │  • execa for command execution           │                      │ ║
║  │  │  • chokidar for file watching            │  │  • tree-kill for process cleanup         │                      │ ║
║  │  │  • fast-glob for pattern matching        │  │  • Timeout enforcement (300s max)        │                      │ ║
║  │  │  • Atomic writes                         │  │  • Sandbox for untrusted commands        │                      │ ║
║  │  └──────────────────────────────────────────┘  └──────────────────────────────────────────┘                      │ ║
║  │                                                                                                                   │ ║
║  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                              EXTERNAL SERVICES                                                        ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                                       ║
║  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐ ║
║  │     ANTHROPIC API       │  │     GOOGLE AI API       │  │     OPENAI API          │  │     LOCAL FILESYSTEM    │ ║
║  │                         │  │                         │  │                         │  │                         │ ║
║  │  Claude Opus 4          │  │  Gemini 2.5 Pro         │  │  text-embedding-3-small │  │  Project files          │ ║
║  │  Claude Sonnet 4        │  │  (Review/Research)      │  │  (Semantic embeddings)  │  │  Git repository         │ ║
║  │  (Primary LLM)          │  │                         │  │                         │  │  Data directory         │ ║
║  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘ ║
║                                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Data Flow Summary Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                        NEXUS DATA FLOW ARCHITECTURE                                        ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                       GENESIS MODE FLOW                                               │  ║
║  │                                                                                                       │  ║
║  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │  ║
║  │   │  USER INPUT  │───►│  INTERVIEW   │───►│ REQUIREMENTS │───►│   FEATURES   │───►│    TASKS     │  │  ║
║  │   │              │    │   ENGINE     │    │   DATABASE   │    │  GENERATION  │    │ DECOMPOSITION│  │  ║
║  │   │  Answers,    │    │              │    │              │    │              │    │              │  │  ║
║  │   │  Preferences │    │  Extract &   │    │  JSON files  │    │  Hierarchical│    │  30-min max  │  │  ║
║  │   │              │    │  Categorize  │    │  per category│    │  breakdown   │    │  atomic      │  │  ║
║  │   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘  │  ║
║  │                                                                                          │          │  ║
║  │                       ┌──────────────────────────────────────────────────────────────────┘          │  ║
║  │                       │                                                                              │  ║
║  │                       ▼                                                                              │  ║
║  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │  ║
║  │   │  TASK QUEUE  │───►│    CODER     │───►│   QA LOOP    │───►│   REVIEWER   │───►│    MERGE     │  │  ║
║  │   │              │    │    AGENT     │    │              │    │    AGENT     │    │    AGENT     │  │  ║
║  │   │  Ordered by  │    │              │    │              │    │              │    │              │  │  ║
║  │   │  dependency  │    │  Worktree    │    │  Build/Lint/ │    │  Code review │    │  Git merge   │  │  ║
║  │   │  & priority  │    │  isolation   │    │  Test cycle  │    │  (Gemini)    │    │  to main     │  │  ║
║  │   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘  │  ║
║  │                                                                                          │          │  ║
║  │                       ┌──────────────────────────────────────────────────────────────────┘          │  ║
║  │                       │                                                                              │  ║
║  │                       ▼                                                                              │  ║
║  │   ┌──────────────┐    ┌──────────────┐                                                              │  ║
║  │   │  CHECKPOINT  │───►│   COMPLETE   │                                                              │  ║
║  │   │              │    │   PROJECT    │                                                              │  ║
║  │   │  Auto-save   │    │              │                                                              │  ║
║  │   │  every 5     │    │  Deliverable │                                                              │  ║
║  │   │  tasks       │    │  codebase    │                                                              │  ║
║  │   └──────────────┘    └──────────────┘                                                              │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                      EVOLUTION MODE FLOW                                              │  ║
║  │                                                                                                       │  ║
║  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │  ║
║  │   │   EXISTING   │───►│   CONTEXT    │───►│   PLANNING   │───►│     SAME     │───►│   UPDATED    │  │  ║
║  │   │   PROJECT    │    │   ANALYSIS   │    │    PHASE     │    │   EXECUTION  │    │   PROJECT    │  │  ║
║  │   │              │    │              │    │              │    │              │    │              │  ║
║  │   │  Codebase    │    │  AST/LSP     │    │  Decompose   │    │  QA Loop     │    │  Evolved     │  │  ║
║  │   │  STATE.md    │    │  Analysis    │    │  feature     │    │  Review/Merge│    │  codebase    │  │  ║
║  │   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Agent Interaction Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                       AGENT INTERACTION PATTERNS                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║     ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║     │                                     COORDINATOR (Central Hub)                                     │  ║
║     │                                                                                                    │  ║
║     │    Responsibilities:                                                                               │  ║
║     │    • Agent lifecycle management (create, assign, terminate)                                        │  ║
║     │    • Task queue management (priority, dependencies)                                                │  ║
║     │    • Event routing (publish/subscribe)                                                             │  ║
║     │    • Checkpoint triggers                                                                           │  ║
║     │    • Human escalation decisions                                                                    │  ║
║     └───────────────────────────────────────────┬──────────────────────────────────────────────────────┘  ║
║                                                 │                                                          ║
║           ┌─────────────────────────────────────┼─────────────────────────────────────────────┐            ║
║           │                                     │                                             │            ║
║           ▼                                     ▼                                             ▼            ║
║     ┌───────────────┐                   ┌───────────────┐                             ┌───────────────┐    ║
║     │   PLANNER     │                   │    CODER(s)   │                             │   TESTER      │    ║
║     │               │                   │               │                             │               │    ║
║     │ Claude Opus 4 │                   │Claude Sonnet 4│                             │Claude Sonnet 4│    ║
║     │               │                   │               │                             │               │    ║
║     │ ┌───────────┐ │  Task Specs       │ ┌───────────┐ │  Test Requirements          │ ┌───────────┐ │    ║
║     │ │ Decompose │─┼──────────────────►│ │ Implement │ │◄─────────────────────────── │ │ Write     │ │    ║
║     │ │ Features  │ │                   │ │ Code      │ │                             │ │ Tests     │ │    ║
║     │ └───────────┘ │                   │ └─────┬─────┘ │                             │ └─────┬─────┘ │    ║
║     │               │                   │       │       │                             │       │       │    ║
║     │ Outputs:      │                   │       │       │                             │       │       │    ║
║     │ • Task list   │                   │       │       │                             │       │       │    ║
║     │ • Priorities  │                   │       │ Code  │                             │       │ Test  │    ║
║     │ • Time est.   │                   │       │ Changes                             │       │ Results    ║
║     └───────────────┘                   │       ▼       │                             │       │       │    ║
║                                         │ ┌───────────┐ │                             │       │       │    ║
║                                         │ │  QA Loop  │◄┼─────────────────────────────┼───────┘       │    ║
║                                         │ │ (Build/   │ │                             │               │    ║
║                                         │ │ Lint/Test)│ │                             └───────────────┘    ║
║                                         │ └─────┬─────┘ │                                                  ║
║                                         │       │       │                                                  ║
║                                         └───────┼───────┘                                                  ║
║                                                 │                                                          ║
║                                    ┌────────────┴────────────┐                                             ║
║                                    │                         │                                             ║
║                                    ▼                         ▼                                             ║
║                             ┌───────────────┐         ┌───────────────┐                                    ║
║                             │   REVIEWER    │         │    MERGER     │                                    ║
║                             │               │         │               │                                    ║
║                             │Gemini 2.5 Pro │         │Claude Sonnet 4│                                    ║
║                             │               │         │               │                                    ║
║                             │ ┌───────────┐ │ Approve │ ┌───────────┐ │                                    ║
║                             │ │ Code      │─┼────────►│ │ Git Merge │ │                                    ║
║                             │ │ Review    │ │         │ │ Resolve   │ │                                    ║
║                             │ └───────────┘ │         │ │ Conflicts │ │                                    ║
║                             │               │         │ └───────────┘ │                                    ║
║                             │ Outputs:      │         │               │                                    ║
║                             │ • APPROVE     │         │ Outputs:      │                                    ║
║                             │ • REJECT      │         │ • Merged      │                                    ║
║                             │ • Suggestions │         │ • Conflicted  │                                    ║
║                             └───────────────┘         └───────────────┘                                    ║
║                                                                                                            ║
║     ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║     │                                    MESSAGE FLOW PATTERNS                                          │  ║
║     │                                                                                                    │  ║
║     │   TASK_CREATED ────────► Coordinator ────────► Planner/Coder (Assignment)                         │  ║
║     │   TASK_COMPLETED ──────► Coordinator ────────► Next Agent (Handoff) + Persistence (Save)          │  ║
║     │   REVIEW_REQUESTED ────► Coordinator ────────► Reviewer (Review Queue)                            │  ║
║     │   REVIEW_COMPLETED ────► Coordinator ────────► Merger (if APPROVE) or Coder (if REJECT)           │  ║
║     │   MERGE_COMPLETED ─────► Coordinator ────────► UI (Progress) + Persistence (Checkpoint)           │  ║
║     │   ERROR_OCCURRED ──────► Coordinator ────────► Recovery Handler (Retry/Escalate)                  │  ║
║     └──────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Technology Stack Summary Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                         TECHNOLOGY STACK SUMMARY                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                         CORE RUNTIME                                                  │  ║
║  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │  ║
║  │  │  Node.js 22.x   │  │ Electron 33.x   │  │ TypeScript 5.4+ │  │   pnpm 9.x      │                  │  ║
║  │  │  (LTS Runtime)  │  │ (Desktop App)   │  │ (Strict Mode)   │  │ (Package Mgr)   │                  │  ║
║  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                         FRONTEND (UI Layer)                                           │  ║
║  │                                                                                                       │  ║
║  │  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │  ║
║  │  │  React 18.3+                                                                                  │   │  ║
║  │  │  ├── Zustand 5.x (Client State)                                                               │   │  ║
║  │  │  ├── TanStack Query 5.x (Server State)                                                        │   │  ║
║  │  │  ├── shadcn/ui + Radix UI (Components)                                                        │   │  ║
║  │  │  ├── Tailwind CSS 3.4+ (Styling)                                                              │   │  ║
║  │  │  ├── Monaco Editor (Code Display)                                                             │   │  ║
║  │  │  ├── xterm.js (Terminal Output)                                                               │   │  ║
║  │  │  └── @dnd-kit (Drag & Drop)                                                                   │   │  ║
║  │  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                         BACKEND (Non-UI Layers)                                       │  ║
║  │                                                                                                       │  ║
║  │  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │  ║
║  │  │  Database & ORM                           │  File System & Process                            │   │  ║
║  │  │  ├── SQLite 3.45+ (better-sqlite3)        │  ├── fs-extra (File Operations)                   │   │  ║
║  │  │  ├── Drizzle ORM 0.30+ (Type-safe)        │  ├── chokidar (File Watching)                     │   │  ║
║  │  │  └── WAL Mode (Concurrency)               │  ├── execa 9.x (Process Execution)                │   │  ║
║  │  │                                           │  └── simple-git 3.24+ (Git Operations)            │   │  ║
║  │  ├─────────────────────────────────────────────────────────────────────────────────────────────┤   │  ║
║  │  │  Embeddings                               │  Events                                           │   │  ║
║  │  │  ├── OpenAI text-embedding-3-small        │  └── EventEmitter3 5.x (Typed Events)             │   │  ║
║  │  │  └── @xenova/transformers (Local Fallback)│                                                   │   │  ║
║  │  └──────────────────────────────────────────────────────────────────────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                           AI / LLM STACK                                              │  ║
║  │                                                                                                       │  ║
║  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌────────────────────────────┐   │  ║
║  │  │       ANTHROPIC             │  │         GOOGLE              │  │         OPENAI             │   │  ║
║  │  │   @anthropic-ai/sdk ^0.32   │  │   @google/generative-ai     │  │     openai ^4.72           │   │  ║
║  │  │                             │  │         ^0.21               │  │                            │   │  ║
║  │  │   ┌───────────────────┐     │  │                             │  │   ┌────────────────────┐   │   │  ║
║  │  │   │  Claude Opus 4    │     │  │   ┌───────────────────┐     │  │   │ text-embedding-3   │   │   │  ║
║  │  │   │  (Planner Agent)  │     │  │   │  Gemini 2.5 Pro   │     │  │   │     -small         │   │   │  ║
║  │  │   └───────────────────┘     │  │   │  (Reviewer Agent) │     │  │   │  (Embeddings)      │   │   │  ║
║  │  │                             │  │   └───────────────────┘     │  │   └────────────────────┘   │   │  ║
║  │  │   ┌───────────────────┐     │  │                             │  │                            │   │  ║
║  │  │   │  Claude Sonnet 4  │     │  │   Usage:                    │  │   Usage:                   │   │  ║
║  │  │   │  (Coder/Tester/   │     │  │   • Code review             │  │   • Semantic memory        │   │  ║
║  │  │   │   Merger Agents)  │     │  │   • Research queries        │  │   • Context retrieval      │   │  ║
║  │  │   └───────────────────┘     │  │   • 1M token context        │  │   • Similar task lookup    │   │  ║
║  │  └─────────────────────────────┘  └─────────────────────────────┘  └────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                       DEVELOPMENT TOOLS                                               │  ║
║  │                                                                                                       │  ║
║  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │  ║
║  │  │      TESTING         │  │   QUALITY TOOLS      │  │   BUILD SYSTEM       │  │    GIT HOOKS     │ │  ║
║  │  │                      │  │                      │  │                      │  │                  │ │  ║
║  │  │  Vitest (Unit)       │  │  ESLint (Linting)    │  │  Vite (Bundler)      │  │  Husky           │ │  ║
║  │  │  Playwright (E2E)    │  │  Prettier (Format)   │  │  SWC (Fast Compile)  │  │  lint-staged     │ │  ║
║  │  │  Coverage: 80%+      │  │  TypeScript strict   │  │  vite-plugin-electron│  │  commitlint      │ │  ║
║  │  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Key Architecture Decisions Summary

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                   KEY ARCHITECTURE DECISIONS (ADR Summary)                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │  ADR #  │ Decision                      │ Rationale                                                  │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-001 │ Zustand + TanStack Query      │ Client/server state separation, minimal boilerplate        │  ║
║  │         │ + STATE.md for persistence    │ Human-readable recovery, GSD compatibility                 │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-002 │ 5 Agent Types with optimal    │ Task specialization, model cost optimization               │  ║
║  │         │ model pairing                 │ Opus for planning, Sonnet for execution, Gemini for review │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-003 │ SQLite + JSON files hybrid    │ Structured queries + human-editable requirements           │  ║
║  │         │                               │ Single-file portability, no external database              │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-004 │ Git worktree-based isolation  │ Parallel agent execution without conflicts                 │  ║
║  │         │                               │ Clean branch-per-task, native git operations               │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-005 │ EventEmitter3 event-driven    │ Loose coupling, testability, async communication           │  ║
║  │         │                               │ Real-time UI updates, audit logging                        │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-006 │ Multi-provider LLM abstraction│ Best model for each task, cost optimization                │  ║
║  │         │ (Claude + Gemini + OpenAI)    │ Provider redundancy, future flexibility                    │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-007 │ 30-minute task time limit     │ Enforces atomic tasks, progress visibility                 │  ║
║  │         │                               │ Reduces blast radius of failures                           │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-008 │ 50 max QA loop iterations     │ Prevents infinite loops, tiered escalation                 │  ║
║  │         │ with tiered escalation        │ Model upgrade at 10, human escalation at 50                │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-009 │ Desktop via Electron          │ Full filesystem access, native git, no server required     │  ║
║  │         │                               │ Cross-platform (Windows, macOS, Linux)                     │  ║
║  ├─────────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤  ║
║  │ ADR-010 │ Single-package, layer-based   │ Simpler tooling, faster builds, easier refactoring         │  ║
║  │         │ structure (not monorepo)      │ Clear directory boundaries enforce modularity              │  ║
║  └─────────┴───────────────────────────────┴────────────────────────────────────────────────────────────┘  ║
║                                                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Component Count by Layer

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    COMPONENT INVENTORY SUMMARY                                             ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║   Layer                    │ Components │ Source Breakdown                                                 ║
║   ─────────────────────────┼────────────┼───────────────────────────────────────────────────────────────   ║
║   Layer 1: UI              │     8      │ Gap: 8 (Interview, Kanban, Dashboard, etc.)                      ║
║   Layer 2: Orchestration   │     8      │ Ralph: 2, Auto-Claude: 1, Gap: 5                                 ║
║   Layer 3: Planning        │     5      │ GSD: 2, AutoMaker: 2, Gap: 1                                     ║
║   Layer 4: Execution       │     6      │ Auto-Claude: 2, OMO: 2, Gap: 2                                   ║
║   Layer 5: Quality         │     6      │ Gap: 4, Auto-Claude: 2                                           ║
║   Layer 6: Persistence     │     5      │ GSD: 2, Auto-Claude: 1, Gap: 2                                   ║
║   Layer 7: Infrastructure  │     5      │ Auto-Claude: 2, OMO: 2, Gap: 1                                   ║
║   ─────────────────────────┼────────────┼───────────────────────────────────────────────────────────────   ║
║   TOTAL                    │    43      │ Gap: 23 (54%), Existing: 20 (46%)                                ║
║                                                                                                            ║
║   Estimated Implementation │  ~25,000   │ Lines of production code                                         ║
║   Estimated Test Code      │  ~8,000    │ Lines of test code                                               ║
║   Estimated Config/Types   │  ~3,500    │ Configuration and type definitions                               ║
║                                                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

### Part I Completion

- [x] Complete system architecture diagram
- [x] Data flow summary diagram
- [x] Agent interaction diagram
- [x] Technology stack summary diagram
- [x] Key architecture decisions summary
- [x] Component count by layer

---

## Task 5.5 Completion Checklist

- [x] Part A: Core Technology Stack (Node.js 22.x, Electron 33.x, TypeScript 5.4+, pnpm 9.x)
- [x] Part B: Frontend Stack (React 18.3+, Zustand + TanStack Query, shadcn/ui + Radix, Tailwind CSS 3.4+)
- [x] Part C: Backend Stack (SQLite 3.45+ + Drizzle ORM, OpenAI embeddings, fs-extra + chokidar, simple-git)
- [x] Part D: AI/LLM Stack (Claude Opus 4/Sonnet 4, Gemini 2.5 Pro, OpenAI embeddings, unified provider)
- [x] Part E: Development Tools (Vitest + Playwright, ESLint + Prettier, Vite + SWC, Husky + commitlint)
- [x] Part F: Git Strategy (Worktree-based isolation, Conventional Commits, 3-tier merge system)
- [x] Part G: Dependency Matrix (87 packages across 7 layers + dev dependencies)
- [x] Part H: Architecture Decision Records (10 ADRs documented)
- [x] Part I: Architecture Summary Diagram (6 comprehensive diagrams)

**[TASK 5.5 COMPLETE]**

---

## Summary

### Architecture Highlights

The Nexus AI Builder architecture is designed around the following core principles:

1. **7-Layer Separation of Concerns**
   - Clear boundaries between UI, Orchestration, Planning, Execution, Quality, Persistence, and Infrastructure
   - Each layer has defined interfaces and responsibilities
   - Enables independent development and testing of each layer

2. **Multi-Agent System with Specialized Roles**
   - 5 agent types (Planner, Coder, Reviewer, Tester, Merger)
   - Optimal LLM model selection per agent type
   - Coordinator manages lifecycle, assignment, and handoffs

3. **Event-Driven Architecture**
   - Loose coupling between components
   - Real-time UI updates via event subscription
   - Comprehensive audit trail through event logging

4. **Dual-Mode Operation**
   - Genesis Mode: Full project creation from requirements
   - Evolution Mode: Feature addition to existing projects
   - Shared execution pipeline for both modes

5. **Quality-First Design**
   - Automated QA loop (build → lint → test → review)
   - 50-iteration limit with tiered escalation
   - 80% code coverage target

6. **Robust Persistence**
   - SQLite for structured data with Drizzle ORM
   - JSON files for human-readable requirements
   - STATE.md for session recovery
   - Automatic checkpoints every 5 tasks

7. **Parallel Execution via Git Worktrees**
   - Up to 4 concurrent Coder agents
   - Branch-per-task isolation
   - 3-tier merge strategy (deterministic → AI-assisted → human)

### Estimated Metrics

| Metric | Value |
|--------|-------|
| Total Components | 43 |
| Lines of Production Code | ~25,000 |
| Lines of Test Code | ~8,000 |
| Dependencies (Production) | 61 |
| Dependencies (Development) | 26 |
| Architecture Decision Records | 10 |
| Adapters Defined | 6 |
| Bridges Defined | 4 |
| Event Types | 40+ |
| API Endpoints (Internal) | 4 APIs, ~50 methods |

### Ready for Phase 6: Integration Specification

This architecture blueprint provides the foundation for Phase 6, which will specify:
- Detailed integration sequences
- API contracts and schemas
- Configuration specifications
- Migration strategies
- Deployment procedures

All architectural decisions have been documented with rationale, enabling informed implementation choices in subsequent phases.

---

## Phase 5 Complete

**[PHASE 5 COMPLETE]**

- Task 5.1: System Architecture ✓
- Task 5.2: Data Architecture ✓
- Task 5.3: Agent Architecture ✓
- Task 5.4: Integration Architecture ✓
- Task 5.5: Technology Decisions ✓

**Total Document Size:** ~18,500 lines
**Completion Date:** 2026-01-13
