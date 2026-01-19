# Nexus Comprehensive Testing Prompt - Accumulator

> This file is built incrementally by Phase 15.
> Each task appends a new section.
> Final assembly produces NEXUS_COMPREHENSIVE_TESTING_PROMPT.md

---

## Extraction Log

| Task | Description | Status | Tests Added |
|------|-------------|--------|-------------|
| 1 | Layer Architecture | COMPLETE | 28 |
| 2 | Component Catalog | COMPLETE | 85 |
| 3 | ADRs & Constraints | PENDING | 0 |
| 4 | Integration Sequences | PENDING | 0 |
| 5 | Genesis Workflow | PENDING | 0 |
| 6 | Evolution Workflow | PENDING | 0 |
| 7 | Phase 13 Features | PENDING | 0 |
| 8 | Phase 14B Bindings | PENDING | 0 |
| 9 | Silent Failures | PENDING | 0 |
| 10 | Edge Cases | PENDING | 0 |
| 11 | Synthesis | PENDING | 0 |
| 12 | Assembly | PENDING | 0 |

---

## Accumulated Test Sections

[Tests will be appended below this line]

---

## SECTION 1: LAYER ARCHITECTURE TESTS

### Layer 7: Infrastructure Tests

#### INF-001: FileSystemService
```
TEST: FileSystemService reads files correctly
LOCATION: src/infrastructure/file-system/FileSystemService.ts
METHODS: readFile(), writeFile(), glob(), watch()

VERIFY: readFile() returns file contents
VERIFY: readFile() throws on non-existent file
VERIFY: writeFile() creates new file
VERIFY: writeFile() overwrites existing file
VERIFY: listDirectory() returns correct entries
VERIFY: exists() returns true for existing files
VERIFY: exists() returns false for non-existent files
VERIFY: glob() matches patterns correctly
VERIFY: watch() emits events on file changes

INTEGRATION_CHECK: Used by StateManager for persistence
SILENT_FAILURE_CHECK: Empty string returned instead of error for missing file
SILENT_FAILURE_CHECK: Write succeeds but file not flushed to disk
SILENT_FAILURE_CHECK: Watch events missed during high-frequency changes
```

#### INF-002: GitService
```
TEST: GitService manages repositories
LOCATION: src/infrastructure/git/GitService.ts
METHODS: createBranch(), commit(), merge(), getDiff()

VERIFY: init() creates new repository
VERIFY: clone() clones remote repository
VERIFY: commit() creates commit with message
VERIFY: branch() creates new branch
VERIFY: checkout() switches branches
VERIFY: diff() returns changes
VERIFY: status() returns current state
VERIFY: merge() combines branches
VERIFY: push() pushes to remote
VERIFY: pull() pulls from remote

INTEGRATION_CHECK: Used by WorktreeManager for isolation
INTEGRATION_CHECK: Used by CheckpointManager for recovery
SILENT_FAILURE_CHECK: Empty diff returned when changes exist
SILENT_FAILURE_CHECK: Commit succeeds but files not staged
SILENT_FAILURE_CHECK: Branch exists but checkout fails silently
SILENT_FAILURE_CHECK: Merge conflict auto-resolved incorrectly
```

#### INF-003: WorktreeManager
```
TEST: WorktreeManager handles git worktrees
LOCATION: src/infrastructure/git/WorktreeManager.ts
METHODS: createWorktree(), removeWorktree(), cleanup()

VERIFY: create() creates new worktree
VERIFY: remove() removes worktree
VERIFY: list() returns all worktrees
VERIFY: getPath() returns correct path
VERIFY: cleanup() removes orphaned worktrees
VERIFY: isActive() correctly identifies active worktrees
VERIFY: getWorktreeForTask() returns correct worktree

INTEGRATION_CHECK: Used by AgentPool for task isolation
INTEGRATION_CHECK: Used by MergerRunner for merge operations
SILENT_FAILURE_CHECK: Worktree created but not tracked
SILENT_FAILURE_CHECK: Remove fails silently, worktree still exists
SILENT_FAILURE_CHECK: Orphaned worktrees accumulate without cleanup
SILENT_FAILURE_CHECK: Worktree path collision not detected
```

#### INF-004: LSPClient
```
TEST: LSPClient provides language intelligence
LOCATION: src/infrastructure/lsp/LSPClient.ts
METHODS: getDefinition(), getReferences(), getDiagnostics()

VERIFY: initialize() starts LSP server
VERIFY: getDefinition() returns symbol definition
VERIFY: getReferences() returns all references
VERIFY: getDiagnostics() returns errors and warnings
VERIFY: shutdown() cleanly stops server
VERIFY: supports TypeScript files
VERIFY: handles multiple workspaces

INTEGRATION_CHECK: Used by MemorySystem for code analysis
INTEGRATION_CHECK: Used by CoderAgent for context
SILENT_FAILURE_CHECK: Server crash not detected
SILENT_FAILURE_CHECK: Stale diagnostics returned after file change
SILENT_FAILURE_CHECK: Definition lookup fails, returns null instead of error
```

#### INF-005: ProcessRunner
```
TEST: ProcessRunner executes commands
LOCATION: src/infrastructure/process/ProcessRunner.ts
METHODS: run(), runStreaming(), kill()

VERIFY: run() executes command and returns output
VERIFY: run() captures stderr
VERIFY: run() respects timeout
VERIFY: run() handles exit codes
VERIFY: kill() terminates running process
VERIFY: runStreaming() emits output incrementally
VERIFY: environment variables are passed correctly
VERIFY: working directory is respected

INTEGRATION_CHECK: Used by BuildVerifier, LintRunner, TestRunner
SILENT_FAILURE_CHECK: Command fails but exit code 0 returned
SILENT_FAILURE_CHECK: Timeout reached but no error thrown
SILENT_FAILURE_CHECK: stderr ignored, only stdout checked
SILENT_FAILURE_CHECK: Zombie processes after kill
```

### Layer 6: Persistence Tests

#### PER-001: DatabaseClient
```
TEST: DatabaseClient manages SQLite operations
LOCATION: src/persistence/database/DatabaseClient.ts
METHODS: query(), insert(), update(), transaction()

VERIFY: connect() establishes connection
VERIFY: query() executes SQL correctly
VERIFY: insert() adds new records
VERIFY: update() modifies existing records
VERIFY: delete() removes records
VERIFY: transaction() wraps operations atomically
VERIFY: close() closes connection cleanly
VERIFY: migration() runs schema migrations

INTEGRATION_CHECK: Used by all persistence components
INTEGRATION_CHECK: Used by CheckpointManager for state storage
SILENT_FAILURE_CHECK: Connection pool exhausted silently
SILENT_FAILURE_CHECK: Transaction commits despite error
SILENT_FAILURE_CHECK: Query returns empty when record exists
SILENT_FAILURE_CHECK: Migration fails silently, schema outdated
```

#### PER-002: StateManager
```
TEST: StateManager tracks application state
LOCATION: src/persistence/state/StateManager.ts
METHODS: saveState(), loadState(), exportSTATEmd()

VERIFY: getState() returns current state
VERIFY: setState() updates state
VERIFY: subscribe() notifies on change
VERIFY: persist() saves to disk
VERIFY: restore() loads from disk
VERIFY: exportSTATEmd() creates readable STATE.md
VERIFY: mergeState() combines partial updates

INTEGRATION_CHECK: Used by NexusCoordinator for workflow state
INTEGRATION_CHECK: Used by CheckpointManager for snapshots
SILENT_FAILURE_CHECK: State in memory differs from persisted state
SILENT_FAILURE_CHECK: Subscribers not called on state change
SILENT_FAILURE_CHECK: Circular reference causes silent corruption
SILENT_FAILURE_CHECK: Concurrent updates cause race condition
```

#### PER-003: CheckpointManager
```
TEST: CheckpointManager handles recovery points
LOCATION: src/persistence/checkpoints/CheckpointManager.ts
METHODS: createCheckpoint(), restore(), list()

VERIFY: create() creates checkpoint
VERIFY: restore() restores from checkpoint
VERIFY: list() returns all checkpoints
VERIFY: delete() removes checkpoint
VERIFY: autoCheckpoint() triggers on interval
VERIFY: getLatest() returns most recent checkpoint
VERIFY: validate() checks checkpoint integrity

INTEGRATION_CHECK: Uses DatabaseClient for storage
INTEGRATION_CHECK: Uses GitService for code state
SILENT_FAILURE_CHECK: Checkpoint created but incomplete
SILENT_FAILURE_CHECK: Restore succeeds but state corrupted
SILENT_FAILURE_CHECK: Auto-checkpoint disabled without warning
SILENT_FAILURE_CHECK: Checkpoint list returns stale data
```

#### PER-004: MemorySystem
```
TEST: MemorySystem handles embeddings and search
LOCATION: src/persistence/memory/MemorySystem.ts
METHODS: store(), query(), getRelevant()

VERIFY: store() saves embedding
VERIFY: query() returns similar items
VERIFY: storeCodeChunk() saves code with embedding
VERIFY: queryCode() searches code semantically
VERIFY: findUsages() finds symbol usages
VERIFY: getRelevant() returns contextually relevant items
VERIFY: embeddings persist across sessions

INTEGRATION_CHECK: Uses OpenAI API for embeddings
INTEGRATION_CHECK: Used by agents for context building
SILENT_FAILURE_CHECK: Embedding dimension mismatch ignored
SILENT_FAILURE_CHECK: Query returns empty instead of error on API failure
SILENT_FAILURE_CHECK: Stale embeddings not refreshed
SILENT_FAILURE_CHECK: Similarity threshold too permissive
```

#### PER-005: RequirementsDB
```
TEST: RequirementsDB stores requirements
LOCATION: src/persistence/requirements/RequirementsDB.ts
METHODS: save(), load(), search(), categorize()

VERIFY: save() persists requirement
VERIFY: load() retrieves requirement
VERIFY: search() finds matching requirements
VERIFY: categorize() assigns category
VERIFY: getAllByProject() returns project requirements
VERIFY: update() modifies existing requirement
VERIFY: delete() removes requirement

INTEGRATION_CHECK: Used by InterviewPage for capture
INTEGRATION_CHECK: Used by TaskDecomposer for planning
SILENT_FAILURE_CHECK: Duplicate requirement not detected
SILENT_FAILURE_CHECK: Search returns partial matches as exact
SILENT_FAILURE_CHECK: Category assignment inconsistent
```

#### PER-006: Schema
```
TEST: Schema defines database structure
LOCATION: src/persistence/database/schema.ts
METHODS: Drizzle table definitions

VERIFY: All tables defined correctly
VERIFY: Foreign keys enforced
VERIFY: Indexes created for common queries
VERIFY: JSON columns validate with Zod
VERIFY: Timestamps auto-populated
VERIFY: Enums constrained to valid values

INTEGRATION_CHECK: Used by DatabaseClient for queries
SILENT_FAILURE_CHECK: Schema mismatch not detected at runtime
SILENT_FAILURE_CHECK: Invalid JSON stored without validation
SILENT_FAILURE_CHECK: Missing index causes slow queries
```

### Layer 5: Quality Tests

#### QUA-001: BuildVerifier
```
TEST: BuildVerifier runs TypeScript compilation
LOCATION: src/quality/build/BuildVerifier.ts
METHODS: verify(), getErrors(), isClean()

VERIFY: verify() spawns tsc --noEmit process
VERIFY: verify() parses TypeScript errors correctly
VERIFY: verify() returns BuildResult with errors array
VERIFY: verify() handles timeout (default 60s)
VERIFY: getErrors() extracts file, line, column, code, message
VERIFY: isClean() returns true when no errors
VERIFY: handles missing tsconfig gracefully

INTEGRATION_CHECK: Plugs into QALoopEngine via Quality pipeline
INTEGRATION_CHECK: Uses ProcessRunner for command execution
SILENT_FAILURE_CHECK: tsc succeeds but wrong tsconfig used
SILENT_FAILURE_CHECK: Errors parsed but wrong format returned
SILENT_FAILURE_CHECK: Timeout reached but partial result returned as success
SILENT_FAILURE_CHECK: Non-zero exit code but errors array empty
```

#### QUA-002: LintRunner
```
TEST: LintRunner runs ESLint
LOCATION: src/quality/linting/LintRunner.ts
METHODS: run(), fix(), getErrors()

VERIFY: run() spawns eslint process
VERIFY: run() uses --format json for parseable output
VERIFY: fix() passes --fix flag for auto-fixing
VERIFY: getErrors() extracts errors and warnings separately
VERIFY: handles missing eslint config gracefully
VERIFY: respects .eslintignore patterns
VERIFY: returns structured LintResult

INTEGRATION_CHECK: Plugs into QALoopEngine via Quality pipeline
INTEGRATION_CHECK: Uses ProcessRunner for command execution
SILENT_FAILURE_CHECK: ESLint config missing, runs with defaults silently
SILENT_FAILURE_CHECK: Fixable issues not fixed despite --fix
SILENT_FAILURE_CHECK: Warnings treated as success when they shouldn't be
SILENT_FAILURE_CHECK: JSON parsing fails, empty result returned
```

#### QUA-003: TestRunner
```
TEST: TestRunner runs Vitest
LOCATION: src/quality/testing/TestRunner.ts
METHODS: runAll(), runFile(), getCoverage()

VERIFY: runAll() spawns vitest run process
VERIFY: runAll() parses JSON output correctly
VERIFY: runFile() runs specific test files
VERIFY: getCoverage() includes coverage data
VERIFY: parseOutput() extracts passed/failed/skipped counts
VERIFY: handles test file not found gracefully
VERIFY: respects vitest config

INTEGRATION_CHECK: Plugs into QALoopEngine via Quality pipeline
INTEGRATION_CHECK: Uses ProcessRunner for command execution
SILENT_FAILURE_CHECK: Tests skip silently, pass count inflated
SILENT_FAILURE_CHECK: Coverage below threshold but not flagged
SILENT_FAILURE_CHECK: Test timeout not enforced, hangs indefinitely
SILENT_FAILURE_CHECK: Test file missing, returns success anyway
```

#### QUA-004: CodeReviewer
```
TEST: CodeReviewer performs AI code review with Gemini
LOCATION: src/quality/review/CodeReviewer.ts
METHODS: review(), getIssues(), suggest()

VERIFY: review() calls GeminiClient for review
VERIFY: review() builds review prompt with git diff
VERIFY: getIssues() extracts issues from response
VERIFY: suggest() provides improvement suggestions
VERIFY: parseResponse() extracts approval status
VERIFY: handles API timeout gracefully
VERIFY: validates response format

INTEGRATION_CHECK: Uses GeminiClient for AI review
INTEGRATION_CHECK: Plugs into QALoopEngine via Quality pipeline
SILENT_FAILURE_CHECK: Gemini API fails, returns approved=true anyway
SILENT_FAILURE_CHECK: Review prompt too long, truncated without warning
SILENT_FAILURE_CHECK: JSON parse fails, default approval returned
SILENT_FAILURE_CHECK: Empty diff submitted, returns false positive approval
```

#### QUA-005: QALoopEngine
```
TEST: QALoopEngine orchestrates QA pipeline
LOCATION: src/quality/qa-loop/QALoopEngine.ts
METHODS: run(), iterate(), escalate()

VERIFY: run() executes Build → Lint → Test → Review sequence
VERIFY: run() respects 50 iteration maximum
VERIFY: run() escalates when limit reached
VERIFY: iterate() calls agent for fixes on failure
VERIFY: escalate() notifies human and pauses task
VERIFY: checkQA() aggregates all QA results correctly
VERIFY: iteration counter increments correctly

INTEGRATION_CHECK: Uses BuildVerifier, LintRunner, TestRunner, CodeReviewer
INTEGRATION_CHECK: Coordinates with AgentRunner for fixes
INTEGRATION_CHECK: Emits events via EventBus
SILENT_FAILURE_CHECK: QA step skipped but iteration counted
SILENT_FAILURE_CHECK: Escalation triggered but handler not called
SILENT_FAILURE_CHECK: State machine gets stuck in invalid state
SILENT_FAILURE_CHECK: 50 iterations reached but no escalation
SILENT_FAILURE_CHECK: Iteration count resets unexpectedly
```

### Layer 4: Execution Tests

#### EXE-001: ToolExecutor
```
TEST: ToolExecutor dispatches and executes tools
LOCATION: src/execution/tools/ToolExecutor.ts
METHODS: execute(), parseResult(), getAvailableTools()

VERIFY: execute() dispatches to correct tool handler
VERIFY: execute() validates tool input parameters
VERIFY: parseResult() structures tool output correctly
VERIFY: getAvailableTools() returns all registered tools
VERIFY: handles unknown tool gracefully
VERIFY: handles tool execution timeout
VERIFY: logs tool execution for debugging

INTEGRATION_CHECK: Used by all agent runners for tool calls
INTEGRATION_CHECK: Uses ProcessRunner for shell tools
SILENT_FAILURE_CHECK: Tool fails but success returned
SILENT_FAILURE_CHECK: Tool output truncated without warning
SILENT_FAILURE_CHECK: Unknown tool silently ignored
SILENT_FAILURE_CHECK: Timeout not enforced, tool hangs
```

#### EXE-002: CoderRunner
```
TEST: CoderRunner generates code for tasks
LOCATION: src/execution/agents/CoderRunner.ts
METHODS: execute(), generateCode(), modifyFile()

VERIFY: execute() runs agent loop until completion
VERIFY: generateCode() calls ClaudeClient for code generation
VERIFY: modifyFile() writes changes to correct file
VERIFY: detects [TASK_COMPLETE] marker
VERIFY: respects iteration limit (50)
VERIFY: uses coding-focused system prompt
VERIFY: handles LLM API errors gracefully

INTEGRATION_CHECK: Uses ClaudeClient for generation
INTEGRATION_CHECK: Uses ToolExecutor for file operations
INTEGRATION_CHECK: Works within WorktreeManager isolation
SILENT_FAILURE_CHECK: Code generated but not written to file
SILENT_FAILURE_CHECK: Infinite loop without completion marker
SILENT_FAILURE_CHECK: Wrong file modified
SILENT_FAILURE_CHECK: Partial code written on error
```

#### EXE-003: TesterRunner
```
TEST: TesterRunner writes tests for tasks
LOCATION: src/execution/agents/TesterRunner.ts
METHODS: execute(), writeTests(), analyzeFailures()

VERIFY: execute() runs agent loop until completion
VERIFY: writeTests() generates test code with ClaudeClient
VERIFY: analyzeFailures() extracts failure information
VERIFY: uses testing-focused system prompt
VERIFY: generates tests matching target code
VERIFY: handles missing target files

INTEGRATION_CHECK: Uses ClaudeClient for generation
INTEGRATION_CHECK: Uses TestRunner for validation
INTEGRATION_CHECK: Works within WorktreeManager isolation
SILENT_FAILURE_CHECK: Tests generated but don't actually test anything
SILENT_FAILURE_CHECK: Tests pass but don't cover target code
SILENT_FAILURE_CHECK: Test file created in wrong location
```

#### EXE-004: ReviewerRunner
```
TEST: ReviewerRunner reviews code changes
LOCATION: src/execution/agents/ReviewerRunner.ts
METHODS: execute(), reviewChanges(), provideFeedback()

VERIFY: execute() runs agent loop until completion
VERIFY: reviewChanges() calls GeminiClient for review
VERIFY: provideFeedback() formats issues clearly
VERIFY: uses review-focused system prompt
VERIFY: returns approval status and issues list
VERIFY: handles empty diff gracefully

INTEGRATION_CHECK: Uses GeminiClient for review
INTEGRATION_CHECK: Coordinates with CoderRunner for fixes
SILENT_FAILURE_CHECK: Always approves regardless of quality
SILENT_FAILURE_CHECK: Issues identified but not reported
SILENT_FAILURE_CHECK: API failure returns false approval
```

#### EXE-005: MergerRunner
```
TEST: MergerRunner handles merge operations
LOCATION: src/execution/agents/MergerRunner.ts
METHODS: execute(), resolveConflicts(), merge()

VERIFY: execute() runs agent loop until completion
VERIFY: resolveConflicts() analyzes merge conflicts
VERIFY: resolveConflicts() proposes resolutions
VERIFY: merge() performs git merge operation
VERIFY: escalates complex conflicts to human
VERIFY: uses merge-focused system prompt

INTEGRATION_CHECK: Uses ClaudeClient for conflict resolution
INTEGRATION_CHECK: Uses GitService for merge operations
INTEGRATION_CHECK: Works with WorktreeManager
SILENT_FAILURE_CHECK: Conflict ignored, code corrupted
SILENT_FAILURE_CHECK: Auto-resolution produces invalid code
SILENT_FAILURE_CHECK: Merge succeeds but files missing
SILENT_FAILURE_CHECK: Escalation not triggered for complex conflict
```

#### EXE-006: BaseRunner (Abstract)
```
TEST: BaseRunner provides common agent functionality
LOCATION: src/execution/agents/BaseRunner.ts
METHODS: runAgentLoop(), handleResponse(), detectCompletion()

VERIFY: runAgentLoop() iterates until completion
VERIFY: runAgentLoop() respects iteration limit (50)
VERIFY: handleResponse() processes LLM output
VERIFY: detectCompletion() identifies task completion markers
VERIFY: emits events via EventBus
VERIFY: tracks iteration count correctly

INTEGRATION_CHECK: Base class for all agent runners
INTEGRATION_CHECK: Coordinates with QALoopEngine
ABSTRACT_CHECK: Cannot be instantiated directly
SILENT_FAILURE_CHECK: Iteration limit bypassed
SILENT_FAILURE_CHECK: Events not emitted
SILENT_FAILURE_CHECK: Completion marker missed
```

### Layer 3: Planning Tests

#### PLN-001: TaskDecomposer
```
TEST: TaskDecomposer decomposes features into tasks
LOCATION: src/planning/decomposition/TaskDecomposer.ts
METHODS: decompose(), validateSize(), split()

VERIFY: decompose() calls ClaudeClient for decomposition
VERIFY: decompose() returns array of atomic tasks
VERIFY: validateSize() enforces 30-minute task limit
VERIFY: split() divides oversized tasks
VERIFY: uses decomposition-focused system prompt
VERIFY: parses JSON response into task objects
VERIFY: handles malformed LLM response

INTEGRATION_CHECK: Uses ClaudeClient for AI decomposition
INTEGRATION_CHECK: Feeds into DependencyResolver
INTEGRATION_CHECK: Feeds into TaskQueue
SILENT_FAILURE_CHECK: Claude returns malformed JSON, partial tasks created
SILENT_FAILURE_CHECK: 45-minute task accepted without split
SILENT_FAILURE_CHECK: Split creates circular dependencies
SILENT_FAILURE_CHECK: Empty task list returned without error
```

#### PLN-002: DependencyResolver
```
TEST: DependencyResolver orders tasks by dependencies
LOCATION: src/planning/dependencies/DependencyResolver.ts
METHODS: resolve(), topologicalSort(), detectCycles()

VERIFY: resolve() returns tasks in execution order
VERIFY: topologicalSort() implements correct algorithm
VERIFY: detectCycles() finds circular dependencies
VERIFY: getWaves() groups parallelizable tasks
VERIFY: getNextAvailable() returns ready tasks
VERIFY: handles empty task list

INTEGRATION_CHECK: Uses graphlib for dependency graph
INTEGRATION_CHECK: Feeds into WaveCalculator
INTEGRATION_CHECK: Used by TaskQueue for ordering
ALGORITHM_TEST: Various dependency graphs, verify correct order
SILENT_FAILURE_CHECK: Cycle not detected, execution deadlocks
SILENT_FAILURE_CHECK: Parallel tasks serialized unnecessarily
SILENT_FAILURE_CHECK: Dependency missing, wrong execution order
```

#### PLN-003: TimeEstimator
```
TEST: TimeEstimator calculates task duration estimates
LOCATION: src/planning/estimation/TimeEstimator.ts
METHODS: estimate(), calibrate(), getVelocity()

VERIFY: estimate() returns minutes for task
VERIFY: estimate() uses heuristics (file count, complexity)
VERIFY: calibrate() adjusts based on historical data
VERIFY: getVelocity() returns team velocity metric
VERIFY: recordActual() saves real duration
VERIFY: handles missing historical data

INTEGRATION_CHECK: Uses DatabaseClient for history
INTEGRATION_CHECK: Used by TaskDecomposer for validation
ACCURACY_TEST: Estimate vs actual within 50%
SILENT_FAILURE_CHECK: Estimation always returns 30 (max)
SILENT_FAILURE_CHECK: Historical data ignored
SILENT_FAILURE_CHECK: Calibration worsens estimates
```

#### PLN-004: TaskPrioritizer
```
TEST: TaskPrioritizer orders tasks by priority
LOCATION: src/planning/prioritization/TaskPrioritizer.ts
METHODS: prioritize(), reorder()

VERIFY: prioritize() assigns priority scores
VERIFY: reorder() sorts tasks by priority
VERIFY: considers dependencies in prioritization
VERIFY: handles equal priority ties consistently

INTEGRATION_CHECK: Uses DependencyResolver for context
INTEGRATION_CHECK: Feeds into TaskQueue
SILENT_FAILURE_CHECK: Priority always same, no effect
SILENT_FAILURE_CHECK: Reorder breaks dependency order
```

#### PLN-005: WaveCalculator
```
TEST: WaveCalculator groups parallel-safe tasks
LOCATION: src/planning/waves/WaveCalculator.ts
METHODS: calculate(), optimize(), getParallelLimit()

VERIFY: calculate() groups tasks into waves
VERIFY: optimize() minimizes total execution time
VERIFY: getParallelLimit() respects agent pool size
VERIFY: no inter-wave dependencies exist
VERIFY: handles single-task waves

INTEGRATION_CHECK: Uses DependencyResolver for graph
INTEGRATION_CHECK: Used by AgentPool for scheduling
SILENT_FAILURE_CHECK: Dependent tasks in same wave
SILENT_FAILURE_CHECK: Over-parallelization exhausts resources
```

#### PLN-006: ScopeAnalyzer
```
TEST: ScopeAnalyzer estimates project scope
LOCATION: src/planning/scope/ScopeAnalyzer.ts
METHODS: analyze(), estimateEffort(), suggestMVP()

VERIFY: analyze() assesses feature complexity
VERIFY: estimateEffort() returns total hours
VERIFY: suggestMVP() identifies minimum features
VERIFY: handles incomplete requirements

INTEGRATION_CHECK: Uses TaskDecomposer for breakdown
INTEGRATION_CHECK: Informs planning phase
SILENT_FAILURE_CHECK: Effort always underestimated
SILENT_FAILURE_CHECK: MVP suggestion misses critical features
```

### Layer 2: Orchestration Tests

#### ORC-001: NexusCoordinator
```
TEST: NexusCoordinator orchestrates multi-agent execution
LOCATION: src/orchestration/coordinator/NexusCoordinator.ts
METHODS: start(), pause(), resume(), orchestrate()

VERIFY: initialize() sets up all dependencies
VERIFY: start() begins project execution
VERIFY: pause() suspends execution gracefully
VERIFY: resume() continues from pause point
VERIFY: orchestrate() manages full workflow
VERIFY: handles Genesis and Evolution modes
VERIFY: creates checkpoints periodically

INTEGRATION_CHECK: Uses AgentPool, TaskQueue, EventBus
INTEGRATION_CHECK: Coordinates all layer 3 and 4 components
INTEGRATION_CHECK: Emits project lifecycle events
SILENT_FAILURE_CHECK: Pause doesn't actually stop agents
SILENT_FAILURE_CHECK: Resume loses state
SILENT_FAILURE_CHECK: Checkpoint not created on schedule
SILENT_FAILURE_CHECK: Mode switch corrupts state
```

#### ORC-002: AgentPool
```
TEST: AgentPool manages agent lifecycle
LOCATION: src/orchestration/agents/AgentPool.ts
METHODS: spawn(), release(), getAvailable()

VERIFY: spawn() creates new agent instance
VERIFY: spawn() respects max agents limit (4)
VERIFY: release() returns agent to pool
VERIFY: getAvailable() returns free agents
VERIFY: tracks agent metrics
VERIFY: handles agent failure gracefully

INTEGRATION_CHECK: Uses WorktreeManager for isolation
INTEGRATION_CHECK: Coordinates with agent runners
INTEGRATION_CHECK: Emits agent lifecycle events
SILENT_FAILURE_CHECK: Pool exhausted without error
SILENT_FAILURE_CHECK: Agent leaked, not returned to pool
SILENT_FAILURE_CHECK: Max limit exceeded
SILENT_FAILURE_CHECK: Dead agent marked as available
```

#### ORC-003: TaskQueue
```
TEST: TaskQueue manages task execution order
LOCATION: src/orchestration/queue/TaskQueue.ts
METHODS: enqueue(), dequeue(), peek(), reorder()

VERIFY: enqueue() adds task to queue
VERIFY: dequeue() returns highest priority task
VERIFY: peek() returns next task without removing
VERIFY: reorder() adjusts task priorities
VERIFY: respects dependency ordering
VERIFY: handles empty queue

INTEGRATION_CHECK: Used by NexusCoordinator for scheduling
INTEGRATION_CHECK: Receives tasks from TaskDecomposer
SILENT_FAILURE_CHECK: Dequeue returns wrong priority task
SILENT_FAILURE_CHECK: Reorder breaks dependency order
SILENT_FAILURE_CHECK: Task lost during enqueue
```

#### ORC-004: EventBus
```
TEST: EventBus manages cross-layer event communication
LOCATION: src/orchestration/events/EventBus.ts
METHODS: emit(), subscribe(), unsubscribe()

VERIFY: emit() calls all subscribers
VERIFY: subscribe() registers event handler
VERIFY: unsubscribe() removes event handler
VERIFY: events have correct type and payload
VERIFY: handles subscriber errors gracefully
VERIFY: supports multiple subscribers per event

INTEGRATION_CHECK: Uses EventEmitter3 library
INTEGRATION_CHECK: Used by all layers for communication
SILENT_FAILURE_CHECK: Subscriber throws, others not called
SILENT_FAILURE_CHECK: Event emitted but no subscribers
SILENT_FAILURE_CHECK: Wrong event type delivered
SILENT_FAILURE_CHECK: Unsubscribe doesn't remove handler
```

#### ORC-005: SegmentRouter
```
TEST: SegmentRouter provides context-aware routing
LOCATION: src/orchestration/routing/SegmentRouter.ts
METHODS: route(), getContext(), optimize()

VERIFY: route() selects appropriate agent type
VERIFY: getContext() provides relevant context
VERIFY: optimize() improves routing decisions
VERIFY: handles unknown task types

INTEGRATION_CHECK: Uses StateManager for context
INTEGRATION_CHECK: Used by AgentPool for assignment
SILENT_FAILURE_CHECK: Wrong agent type selected
SILENT_FAILURE_CHECK: Context missing critical information
```

#### ORC-006: WorkflowController
```
TEST: WorkflowController manages Genesis/Evolution workflows
LOCATION: src/orchestration/workflow/WorkflowController.ts
METHODS: startGenesis(), startEvolution(), transition()

VERIFY: startGenesis() initiates Genesis mode
VERIFY: startEvolution() initiates Evolution mode
VERIFY: transition() moves between workflow phases
VERIFY: tracks current workflow state
VERIFY: handles mode-specific logic

INTEGRATION_CHECK: Coordinates with NexusCoordinator
INTEGRATION_CHECK: Manages workflow-specific UI state
SILENT_FAILURE_CHECK: Mode transition loses state
SILENT_FAILURE_CHECK: Wrong mode started
SILENT_FAILURE_CHECK: Phase transition skips steps
```

### Layer 1: UI Tests

#### UI-001: InterviewPage
```
TEST: InterviewPage provides conversational UI for Genesis mode
LOCATION: src/ui/pages/InterviewPage.tsx
METHODS: React component lifecycle, event handlers

VERIFY: Renders chat-style conversation interface
VERIFY: Handles user message input
VERIFY: Displays Claude responses
VERIFY: Shows typing indicators
VERIFY: Captures requirements in sidebar
VERIFY: Supports interview completion flow
VERIFY: Handles API errors gracefully

INTEGRATION_CHECK: Uses ClaudeClient for conversation
INTEGRATION_CHECK: Stores requirements in RequirementsDB
INTEGRATION_CHECK: Uses Zustand for local state
SILENT_FAILURE_CHECK: User input lost on submit
SILENT_FAILURE_CHECK: Requirements not saved
SILENT_FAILURE_CHECK: Claude response not displayed
SILENT_FAILURE_CHECK: Completion not detected
```

#### UI-002: KanbanPage
```
TEST: KanbanPage provides drag-and-drop board for Evolution mode
LOCATION: src/ui/pages/KanbanPage.tsx
METHODS: React component lifecycle, drag handlers

VERIFY: Renders five-column layout (Backlog, Planning, In Progress, Review, Done)
VERIFY: Supports drag-and-drop of feature cards
VERIFY: Triggers appropriate actions on column transition
VERIFY: Shows task progress within features
VERIFY: Handles empty columns gracefully
VERIFY: Responsive layout on different screens

INTEGRATION_CHECK: Uses @dnd-kit for drag-and-drop
INTEGRATION_CHECK: Coordinates with WorkflowController
INTEGRATION_CHECK: Updates state via Zustand
SILENT_FAILURE_CHECK: Drag doesn't trigger action
SILENT_FAILURE_CHECK: Card position not saved
SILENT_FAILURE_CHECK: Column transition doesn't update state
```

#### UI-003: DashboardPage
```
TEST: DashboardPage shows progress visualization and metrics
LOCATION: src/ui/pages/DashboardPage.tsx
METHODS: React component lifecycle, data fetching

VERIFY: Renders progress charts correctly
VERIFY: Shows live agent status
VERIFY: Displays performance metrics
VERIFY: Shows event log/activity feed
VERIFY: Lists available checkpoints
VERIFY: Auto-refreshes data periodically

INTEGRATION_CHECK: Uses Recharts for visualization
INTEGRATION_CHECK: Subscribes to EventBus for updates
INTEGRATION_CHECK: Uses TanStack Query for data fetching
SILENT_FAILURE_CHECK: Charts don't update with new data
SILENT_FAILURE_CHECK: Agent status stale
SILENT_FAILURE_CHECK: Metrics calculation wrong
```

#### UI-004: FeatureCard
```
TEST: FeatureCard displays individual feature on Kanban
LOCATION: src/ui/components/kanban/FeatureCard.tsx
METHODS: React component lifecycle

VERIFY: Renders feature name and description
VERIFY: Shows task completion progress bar
VERIFY: Displays status indicators
VERIFY: Supports drag handle
VERIFY: Shows agent assignment
VERIFY: Handles click for details

INTEGRATION_CHECK: Used by KanbanPage
INTEGRATION_CHECK: Uses shadcn/ui components
SILENT_FAILURE_CHECK: Progress bar wrong percentage
SILENT_FAILURE_CHECK: Status indicator wrong color
SILENT_FAILURE_CHECK: Click doesn't open details
```

#### UI-005: AgentStatusGrid
```
TEST: AgentStatusGrid shows live agent activity
LOCATION: src/ui/components/dashboard/AgentStatusGrid.tsx
METHODS: React component lifecycle, event subscriptions

VERIFY: Renders all active agents
VERIFY: Shows current task for each agent
VERIFY: Displays agent type and status
VERIFY: Updates in real-time
VERIFY: Handles no active agents state

INTEGRATION_CHECK: Subscribes to agent events via EventBus
INTEGRATION_CHECK: Used by DashboardPage
SILENT_FAILURE_CHECK: Agent status not updating
SILENT_FAILURE_CHECK: Terminated agent still shown
SILENT_FAILURE_CHECK: Task assignment not displayed
```

#### UI-006: RequirementsSidebar
```
TEST: RequirementsSidebar shows live requirement capture
LOCATION: src/ui/components/interview/RequirementsSidebar.tsx
METHODS: React component lifecycle

VERIFY: Renders captured requirements list
VERIFY: Shows requirement categories
VERIFY: Displays requirement priorities
VERIFY: Updates as interview progresses
VERIFY: Supports requirement editing
VERIFY: Handles empty state

INTEGRATION_CHECK: Used by InterviewPage
INTEGRATION_CHECK: Reads from RequirementsDB
SILENT_FAILURE_CHECK: New requirements not appearing
SILENT_FAILURE_CHECK: Category assignment wrong
SILENT_FAILURE_CHECK: Priority not displayed
```

#### UI-007: SettingsPanel
```
TEST: SettingsPanel provides configuration UI
LOCATION: src/ui/components/settings/SettingsPanel.tsx
METHODS: React component lifecycle, form handlers

VERIFY: Renders all configuration options
VERIFY: Handles API key input securely
VERIFY: Supports max agents configuration
VERIFY: Allows checkpoint interval setting
VERIFY: Validates input values
VERIFY: Saves settings persistently

INTEGRATION_CHECK: Uses shadcn/ui form components
INTEGRATION_CHECK: Persists to configuration store
SILENT_FAILURE_CHECK: Settings not saved on close
SILENT_FAILURE_CHECK: Invalid input accepted
SILENT_FAILURE_CHECK: API keys visible in logs
```

---

**[TASK 1 COMPLETE]**

---

**[TASK 2 COMPLETE]**

Task 2 extracted 30 additional components across Layers 5-1:
- Layer 5: 5 components (BuildVerifier, LintRunner, TestRunner, CodeReviewer, QALoopEngine)
- Layer 4: 6 components (ToolExecutor, CoderRunner, TesterRunner, ReviewerRunner, MergerRunner, BaseRunner)
- Layer 3: 6 components (TaskDecomposer, DependencyResolver, TimeEstimator, TaskPrioritizer, WaveCalculator, ScopeAnalyzer)
- Layer 2: 6 components (NexusCoordinator, AgentPool, TaskQueue, EventBus, SegmentRouter, WorkflowController)
- Layer 1: 7 components (InterviewPage, KanbanPage, DashboardPage, FeatureCard, AgentStatusGrid, RequirementsSidebar, SettingsPanel)

Each component includes:
- LOCATION (file path)
- METHODS (key methods to test)
- Multiple VERIFY statements
- INTEGRATION_CHECK statements
- SILENT_FAILURE_CHECK statements

Total tests added: ~85 new tests
