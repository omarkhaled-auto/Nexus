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
| 3 | ADRs & Constraints | COMPLETE | 105 |
| 4 | Integration Sequences | COMPLETE | 120 |
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

---

## SECTION 3: ARCHITECTURE CONSTRAINT TESTS

### ADR-001: Zustand + TanStack Query for State Management
```
TEST: State management uses Zustand and TanStack Query correctly
CONSTRAINT: Client state via Zustand, server state via TanStack Query
DECISION_RATIONALE: Simple API, excellent TypeScript support, minimal boilerplate

VERIFY: useStore() returns current state from Zustand store
VERIFY: setState() triggers React component re-render
VERIFY: subscribe() calls listener on state change
VERIFY: persist middleware saves to localStorage
VERIFY: TanStack Query caches API responses
VERIFY: TanStack Query handles background refetching
VERIFY: TanStack Query supports optimistic updates
VERIFY: State stores are properly typed with TypeScript
VERIFY: DevTools integration works (Zustand/TanStack Query)

INTEGRATION_CHECK: StateManager uses Zustand internally
INTEGRATION_CHECK: UI components access state via hooks
SILENT_FAILURE_CHECK: State updates but UI doesn't re-render
SILENT_FAILURE_CHECK: Persistence fails, falls back to memory without warning
SILENT_FAILURE_CHECK: Cache returns stale data without invalidation
SILENT_FAILURE_CHECK: Optimistic update reverts but UI doesn't show error
```

### ADR-002: Five Specialized Agents
```
TEST: Five agent types exist with distinct roles and optimal models
CONSTRAINT: Planner, Coder, Tester, Reviewer, Merger each have specific responsibilities
DECISION_RATIONALE: Clear responsibility separation, optimal model per task

VERIFY: Planner uses Claude Opus 4 (temperature 0.7) for strategic decomposition
VERIFY: Coder uses Claude Sonnet 4 (temperature 0.3) for code generation
VERIFY: Tester uses Claude Sonnet 4 (temperature 0.3) for test writing
VERIFY: Reviewer uses Gemini 2.5 Pro (temperature 0.1) for code review
VERIFY: Merger uses Claude Sonnet 4 (temperature 0.1) for conflict resolution
VERIFY: Each agent type has focused system prompt
VERIFY: Each agent type has limited, appropriate tool set
VERIFY: AgentPool creates correct agent type for task type
VERIFY: Agent types cannot be mixed (e.g., Coder cannot review)

INTEGRATION_CHECK: AgentPool correctly spawns each agent type
INTEGRATION_CHECK: SegmentRouter assigns task to correct agent type
SILENT_FAILURE_CHECK: Wrong model used for agent type
SILENT_FAILURE_CHECK: Agent assigned task outside its role
SILENT_FAILURE_CHECK: Temperature setting ignored, using default
SILENT_FAILURE_CHECK: Wrong tools available to agent
```

### ADR-003: SQLite + JSON Hybrid Storage
```
TEST: Data persistence uses SQLite with JSON columns validated by Zod
CONSTRAINT: SQLite for structured data, JSON for requirements/state export
DECISION_RATIONALE: Fast, zero-config, portable, human-readable exports

VERIFY: SQLite database created on first run
VERIFY: JSON columns serialize correctly (objects to JSON strings)
VERIFY: JSON columns deserialize correctly (JSON strings to objects)
VERIFY: Invalid JSON rejected with Zod validation error
VERIFY: Zod schemas validate on insert operations
VERIFY: Zod schemas validate on update operations
VERIFY: STATE.md export is human-readable
VERIFY: Database migrations run correctly
VERIFY: Database is portable (can be copied)

INTEGRATION_CHECK: DatabaseClient uses better-sqlite3
INTEGRATION_CHECK: Schema definitions use Drizzle ORM
INTEGRATION_CHECK: All persistence components use DatabaseClient
SILENT_FAILURE_CHECK: Invalid JSON stored without validation
SILENT_FAILURE_CHECK: Zod schema mismatch ignored at runtime
SILENT_FAILURE_CHECK: Migration fails silently, schema outdated
SILENT_FAILURE_CHECK: Concurrent writes corrupt database
```

### ADR-004: Git Worktrees for Parallel Execution
```
TEST: Each task gets isolated git worktree for execution
CONSTRAINT: Task execution must not affect main branch until merge
DECISION_RATIONALE: True filesystem isolation, native git support, clean merge path

VERIFY: createWorktree() creates isolated directory for task
VERIFY: Worktree path follows pattern: .nexus/worktrees/{taskId}
VERIFY: Worktree has dedicated branch: nexus/task/{taskId}
VERIFY: Changes in worktree don't appear in main
VERIFY: Worktree cleaned up after task completes successfully
VERIFY: Worktree preserved on failure for debugging
VERIFY: Parallel tasks use separate worktrees
VERIFY: Maximum worktree count enforced (equal to max agents)
VERIFY: Orphaned worktrees detected and cleaned periodically

INTEGRATION_CHECK: AgentPool creates worktree before agent execution
INTEGRATION_CHECK: MergerRunner merges worktree to main
INTEGRATION_CHECK: CheckpointManager can restore worktree state
SILENT_FAILURE_CHECK: Worktree reused between tasks (contamination)
SILENT_FAILURE_CHECK: Cleanup fails, orphaned worktrees accumulate
SILENT_FAILURE_CHECK: Changes leak to main branch before merge
SILENT_FAILURE_CHECK: Worktree path collision not detected
```

### ADR-005: EventEmitter3 for Internal Events
```
TEST: Event communication uses EventEmitter3 with typed events
CONSTRAINT: All cross-component communication via EventBus
DECISION_RATIONALE: Simple, fast, well-typed, good for single-process desktop app

VERIFY: EventBus uses EventEmitter3 internally
VERIFY: emit() calls all registered subscribers
VERIFY: subscribe() registers event handler
VERIFY: unsubscribe() removes event handler
VERIFY: Events are strongly typed with TypeScript
VERIFY: Event payloads match expected interface
VERIFY: Multiple subscribers per event supported
VERIFY: Subscriber errors don't crash the system
VERIFY: Memory cleanup on component unmount

INTEGRATION_CHECK: All 48 event types defined and typed
INTEGRATION_CHECK: UI components subscribe to relevant events
INTEGRATION_CHECK: Backend components emit lifecycle events
SILENT_FAILURE_CHECK: Subscriber throws, other subscribers not called
SILENT_FAILURE_CHECK: Event emitted but no subscribers registered
SILENT_FAILURE_CHECK: Wrong event type delivered
SILENT_FAILURE_CHECK: Memory leak from unremoved subscribers
```

### ADR-006: Multi-LLM Provider Strategy
```
TEST: Multiple LLM providers used for different tasks
CONSTRAINT: Best model for each task type with fallback support
DECISION_RATIONALE: Optimal performance per task, cost optimization, redundancy

VERIFY: ClaudeClient connects to Anthropic API correctly
VERIFY: GeminiClient connects to Google API correctly
VERIFY: OpenAI API used for embeddings
VERIFY: Planning uses Claude Opus (claude-opus-4)
VERIFY: Coding uses Claude Sonnet (claude-sonnet-4)
VERIFY: Testing uses Claude Sonnet (claude-sonnet-4)
VERIFY: Review uses Gemini 2.5 Pro
VERIFY: Merging uses Claude Sonnet (claude-sonnet-4)
VERIFY: Embeddings use OpenAI text-embedding-3-small
VERIFY: Rate limiting respected for all providers
VERIFY: Fallback works when primary provider fails

INTEGRATION_CHECK: LLMProviderFactory creates correct client
INTEGRATION_CHECK: RateLimitWrapper throttles requests
INTEGRATION_CHECK: API keys stored securely
SILENT_FAILURE_CHECK: API key invalid but cached response returned
SILENT_FAILURE_CHECK: Rate limit exceeded, requests silently queued forever
SILENT_FAILURE_CHECK: Wrong provider used for task type
SILENT_FAILURE_CHECK: Fallback activates without logging
```

### ADR-007: 30-Minute Task Hard Limit
```
TEST: No single task exceeds 30 minutes estimated duration
CONSTRAINT: All atomic tasks must fit within 30-minute context window
DECISION_RATIONALE: Context fit guaranteed, granular progress, easy rollback

VERIFY: TaskDecomposer validates task duration <= 30 minutes
VERIFY: Tasks estimated > 30 minutes rejected with error
VERIFY: Oversized tasks automatically split by TaskSplitter
VERIFY: TimeEstimator uses consistent estimation methodology
VERIFY: Split tasks maintain correct dependencies
VERIFY: UI shows time estimate for each task
VERIFY: Validation runs BEFORE task execution starts

SIZING_GUIDELINES_CHECK:
- Atomic tasks: 5-15 minutes (single function, fix bug)
- Small tasks: 15-25 minutes (component, API endpoint)
- Medium tasks: 25-30 minutes (complex component + tests)
- Over limit: >30 minutes - MUST DECOMPOSE

INTEGRATION_CHECK: TimeEstimator used during planning phase
INTEGRATION_CHECK: TaskDecomposer calls validateSize()
SILENT_FAILURE_CHECK: 45-minute task accepted without split
SILENT_FAILURE_CHECK: Time estimate wrong, task runs 2+ hours
SILENT_FAILURE_CHECK: Split creates invalid task dependencies
SILENT_FAILURE_CHECK: Estimation always returns 30 (max default)
```

### ADR-008: 50 QA Iteration Limit
```
TEST: QA loop enforces 50 iteration maximum with escalation
CONSTRAINT: Prevent infinite loops, force human review for hard problems
DECISION_RATIONALE: Prevents runaway costs, guarantees termination

VERIFY: Iteration counter starts at 1 for new task
VERIFY: Iteration counter increments after each QA cycle
VERIFY: QALoopEngine checks counter before each iteration
VERIFY: Escalation triggered at iteration 50 (not 51)
VERIFY: Human notification sent on escalation
VERIFY: Task marked as 'escalated' in database
VERIFY: Detailed checkpoint created before escalation
VERIFY: Other tasks can continue while one is escalated

ESCALATION_FLOW_CHECK:
- Iteration 1-10: Normal operation
- Iteration 11-30: Increase context, try alternative approaches
- Iteration 31-49: Alert human, create detailed checkpoint
- Iteration 50: Escalate, pause task, notify human

INTEGRATION_CHECK: QALoopEngine enforces limit
INTEGRATION_CHECK: EscalationHandler receives notification
INTEGRATION_CHECK: UI shows escalation status
SILENT_FAILURE_CHECK: Counter resets accidentally, runs 100+ iterations
SILENT_FAILURE_CHECK: Escalation triggered but handler not called
SILENT_FAILURE_CHECK: Iteration 50 reached, continues anyway
SILENT_FAILURE_CHECK: Counter not incremented on certain errors
```

### ADR-009: Electron Desktop Application
```
TEST: Application runs as Electron desktop app with full system access
CONSTRAINT: Full filesystem access, native git integration, cross-platform
DECISION_RATIONALE: Full access to git, file system, no CORS restrictions

VERIFY: Electron main process starts correctly
VERIFY: Electron renderer process loads React app
VERIFY: IPC communication works between main and renderer
VERIFY: Native file dialogs work (open, save)
VERIFY: Full filesystem access available
VERIFY: Git operations work via child process
VERIFY: Application runs on Windows, macOS, Linux
VERIFY: Auto-updater configured correctly
VERIFY: Bundle size reasonable (~150MB or less)

INTEGRATION_CHECK: electron.vite.config.ts configured correctly
INTEGRATION_CHECK: Main process handles file system operations
INTEGRATION_CHECK: Renderer process handles React UI
SILENT_FAILURE_CHECK: Electron crash not reported to user
SILENT_FAILURE_CHECK: IPC message lost between processes
SILENT_FAILURE_CHECK: File system permission denied silently
SILENT_FAILURE_CHECK: Git operations fail in packaged app
```

### ADR-010: Monorepo Structure
```
TEST: All code in single repository with layered architecture
CONSTRAINT: Simpler deployment, shared types, unified versioning
DECISION_RATIONALE: Atomic commits, no cross-repo sync issues

VERIFY: All imports resolve within monorepo
VERIFY: Shared types accessible from all layers (src/types/)
VERIFY: Build produces single artifact
VERIFY: No circular dependencies between layers
VERIFY: Layer dependencies only flow downward (L1 → L7)
VERIFY: TypeScript strict mode enabled
VERIFY: Single package.json for all dependencies
VERIFY: ESLint/Prettier configuration shared

DIRECTORY_STRUCTURE_CHECK:
- nexus/src/types/ - Shared types (all layers)
- nexus/src/infrastructure/ - Layer 7
- nexus/src/persistence/ - Layer 6
- nexus/src/quality/ - Layer 5
- nexus/src/execution/ - Layer 4
- nexus/src/planning/ - Layer 3
- nexus/src/orchestration/ - Layer 2
- nexus/src/ui/ - Layer 1

INTEGRATION_CHECK: TypeScript paths configured for layer imports
INTEGRATION_CHECK: No external packages for core functionality
SILENT_FAILURE_CHECK: Circular dependency not detected at compile time
SILENT_FAILURE_CHECK: Type mismatch between layers at runtime
SILENT_FAILURE_CHECK: Layer boundary violation not caught
```

---

**[TASK 3 COMPLETE]**

Task 3 extracted all 10 ADRs with testable constraints:
- ADR-001: Zustand + TanStack Query (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-002: Five Specialized Agents (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-003: SQLite + JSON Hybrid (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-004: Git Worktrees (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-005: EventEmitter3 (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-006: Multi-LLM Provider (11 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-007: 30-Minute Task Limit (7 VERIFY + 4 SIZING_GUIDELINES + 4 SILENT_FAILURE_CHECK)
- ADR-008: 50 QA Iteration Limit (8 VERIFY + 4 ESCALATION_FLOW + 4 SILENT_FAILURE_CHECK)
- ADR-009: Electron Desktop (9 VERIFY + 4 SILENT_FAILURE_CHECK)
- ADR-010: Monorepo Structure (8 VERIFY + 8 DIRECTORY_STRUCTURE + 3 SILENT_FAILURE_CHECK)

Total tests added: ~105 new constraint tests

---

## SECTION 4: INTEGRATION SEQUENCE TESTS

### SEQ-GEN-001: Interview Sequence
```
TEST: Interview captures requirements correctly
FLOW: User Input → InterviewPage → ClaudeClient → RequirementsDB → EventBus
PURPOSE: Gather requirements through conversational AI interview
TRIGGER: User clicks "New Project" in the UI

STEP 1: User clicks "New Project"
VERIFY: InterviewPage captures navigation event
VERIFY: PROJECT_START event emitted with timestamp and userId

STEP 2: Mount InterviewChat interface
VERIFY: Chat UI renders correctly
VERIFY: Typing indicators work

STEP 3: User sends message
VERIFY: Message validated (non-empty)
VERIFY: Message appended to conversation history

STEP 4: Claude generates response
VERIFY: ClaudeClient.stream() called with interview system prompt
VERIFY: Response chunks displayed in real-time
VERIFY: AI follows up with clarifying questions

STEP 5: Extract requirements from response
VERIFY: RequirementsDB receives extracted requirements
VERIFY: Requirements have categories (functional, non-functional, constraint, assumption)
VERIFY: Requirements have priorities (high, medium, low)
VERIFY: Confidence scores calculated

STEP 6: User completes interview
VERIFY: Interview completion confirmed if <5 requirements (warning)
VERIFY: RequirementsDB.exportToJSON() creates JSON file
VERIFY: INTERVIEW_COMPLETE event emitted with projectId, requirementCount

INTEGRATION_CHECK: Data flows correctly between InterviewPage → ClaudeClient → RequirementsDB
INTEGRATION_CHECK: EventBus correctly routes PROJECT_START and INTERVIEW_COMPLETE events
SILENT_FAILURE_CHECK: Claude response ignored, empty requirements saved
SILENT_FAILURE_CHECK: RequirementsDB write fails, interview continues without error
SILENT_FAILURE_CHECK: User input truncated without warning
SILENT_FAILURE_CHECK: API rate limit hit, no "AI is busy" message shown
```

### SEQ-GEN-002: Planning Sequence
```
TEST: Planning decomposes features into tasks
FLOW: Requirements → NexusCoordinator → TaskDecomposer → DependencyResolver → TaskQueue → Database
PURPOSE: Decompose approved requirements into executable tasks
TRIGGER: User approves requirements (clicks "Approve and Plan")

STEP 1: User approves requirements
VERIFY: PLANNING_START event emitted with projectId

STEP 2: Load requirements
VERIFY: All requirements retrieved from RequirementsDB
VERIFY: RequirementsExport structure validated

STEP 3: Create Planner Agent
VERIFY: Planner initialized with Claude Opus model
VERIFY: System prompt loaded from config/prompts/planner.md

STEP 4: Decompose each feature
VERIFY: TaskDecomposer.decompose() called for each feature
VERIFY: Each task has title, description, type, estimatedMinutes, dependencies
VERIFY: Each task < 30 minutes (else split automatically)
VERIFY: Acceptance criteria included

STEP 5: Resolve dependencies
VERIFY: DependencyResolver.resolve() creates dependency graph
VERIFY: Topological sort (Kahn's algorithm) applied
VERIFY: No circular dependencies (or detected and reported)
VERIFY: TaskWave[] groups parallelizable tasks

STEP 6: Persist tasks
VERIFY: All tasks saved to database atomically (transaction)
VERIFY: Tasks ordered by wave number
VERIFY: Task status initialized to 'pending'

STEP 7: Complete planning
VERIFY: PLANNING_COMPLETE event emitted with taskCount, waveCount
VERIFY: Plan displayed for user review
VERIFY: User can approve or request changes

INTEGRATION_CHECK: Decomposition output matches DependencyResolver input format
INTEGRATION_CHECK: DependencyResolver output matches TaskQueue expected format
SILENT_FAILURE_CHECK: Claude returns malformed JSON, partial tasks created
SILENT_FAILURE_CHECK: Dependency cycle ignored, execution will deadlock
SILENT_FAILURE_CHECK: Tasks enqueued but status not updated
SILENT_FAILURE_CHECK: Database transaction fails, partial tasks saved
```

### SEQ-GEN-003: Execution Sequence
```
TEST: Execution completes tasks through agent coordination with QA
FLOW: TaskQueue → NexusCoordinator → AgentPool → CoderRunner → WorktreeManager → QALoopEngine → MergerRunner
PURPOSE: Execute tasks through multi-agent coordination
TRIGGER: User approves the project plan

STEP 1: Start execution
VERIFY: EXECUTION_START event emitted with totalTasks, totalWaves, estimatedDuration

STEP 2: Get waves from DependencyResolver
VERIFY: TaskWave[] returned with parallel groups
VERIFY: Wave 1 tasks have no dependencies

STEP 3: For each task in wave (parallel up to 4)
  STEP 3a: Get available agent
  VERIFY: AgentPool.spawn() returns Coder agent
  VERIFY: Wait if pool exhausted (max 4)

  STEP 3b: Create worktree
  VERIFY: WorktreeManager.create() creates isolated directory
  VERIFY: Path follows pattern: .nexus/worktrees/{taskId}
  VERIFY: Branch created: nexus/task/{taskId}

  STEP 3c: Execute task
  VERIFY: CoderRunner.execute() generates code
  VERIFY: [TASK_COMPLETE] marker detected
  VERIFY: Files created/modified in worktree

  STEP 3d: Run QA loop
  VERIFY: Build passes (tsc --noEmit)
  VERIFY: Lint passes (eslint)
  VERIFY: Tests pass (vitest)
  VERIFY: Review approves (Gemini)

  STEP 3e: Merge changes
  VERIFY: MergerRunner.merge() to main branch
  VERIFY: Conflict resolution if needed

  STEP 3f: Cleanup worktree
  VERIFY: WorktreeManager.remove() cleans up

STEP 4: Advance to next wave
VERIFY: All Wave N tasks complete before Wave N+1 starts
VERIFY: Checkpoints created every 2 hours

STEP 5: Complete execution
VERIFY: EXECUTION_COMPLETE event emitted with tasksCompleted, tasksFailed, cost

INTEGRATION_CHECK: All components coordinate correctly across layers
INTEGRATION_CHECK: Events emitted at each major step
SILENT_FAILURE_CHECK: Agent fails silently, task marked complete anyway
SILENT_FAILURE_CHECK: QA step skipped, bad code merged
SILENT_FAILURE_CHECK: Merge conflict ignored, code corrupted
SILENT_FAILURE_CHECK: Worktree not cleaned up, accumulates
```

### SEQ-EVO-001: Context Analysis Sequence
```
TEST: Context analysis understands existing codebase for Evolution mode
FLOW: User → NexusCoordinator → FileSystemService → LSPClient → MemorySystem → EventBus
PURPOSE: Analyze existing codebase to understand current state
TRIGGER: User selects existing project for Evolution mode

STEP 1: Select project
VERIFY: PROJECT_LOAD event emitted with projectPath and mode='evolution'

STEP 2: Scan filesystem
VERIFY: FileSystemService.glob() finds all source files
VERIFY: File metadata collected (path, size, lastModified, type, language)

STEP 3: Initialize LSP
VERIFY: LSPClient.initialize() starts TypeScript server
VERIFY: Fallback to basic parsing if LSP fails

STEP 4: Analyze project structure
VERIFY: Entry points identified
VERIFY: Module exports/imports mapped
VERIFY: Symbol index created (classes, functions, interfaces)
VERIFY: Dependency graph built (internal and external)

STEP 5: Query memory system
VERIFY: MemorySystem.query() returns relevant historical context
VERIFY: Previous architectural decisions surfaced

STEP 6: Context ready
VERIFY: CONTEXT_READY event emitted with fileCount, symbolCount, memoryCount
VERIFY: Project overview displayed in UI

INTEGRATION_CHECK: FileSystemService → LSPClient → MemorySystem data flows correctly
INTEGRATION_CHECK: Analysis results stored for later agent use
SILENT_FAILURE_CHECK: LSP crashes but no warning shown
SILENT_FAILURE_CHECK: Memory query fails, continues without historical context
SILENT_FAILURE_CHECK: File scan incomplete, missing files
```

### SEQ-EVO-002: Feature Planning Sequence
```
TEST: Feature planning integrates with existing codebase context
FLOW: User → KanbanBoard → NexusCoordinator → TaskDecomposer (with context) → Database → TaskQueue
PURPOSE: Plan implementation of new feature in existing codebase
TRIGGER: User drags feature card to "In Progress"

STEP 1: Drag to "In Progress"
VERIFY: Kanban state updated
VERIFY: Complexity assessment triggered

STEP 2: Assess complexity
VERIFY: Factors checked: fileCount, dependencyDepth, integrationPoints, estimatedDuration
VERIFY: If score > 4 OR duration > 60min → planning required
VERIFY: Simple features bypass planning

STEP 3: Decompose with context
VERIFY: TaskDecomposer receives EvolutionPlanningContext:
  - relatedFiles (files likely to be modified)
  - dependencies (files depending on related files)
  - patterns (detected code patterns)
  - previousDecisions (historical architectural decisions)
  - constraints (backward compat, existing tests, protected files)
VERIFY: Tasks include predicted file locations

STEP 4: User reviews plan
VERIFY: Plan displayed with task breakdown
VERIFY: Affected files highlighted
VERIFY: User can approve or modify

STEP 5: Save and queue tasks
VERIFY: Tasks saved to database
VERIFY: Tasks added to TaskQueue with dependencies
VERIFY: TASKS_CREATED event emitted

INTEGRATION_CHECK: Context from SEQ-EVO-001 used by TaskDecomposer
INTEGRATION_CHECK: Decomposition respects existing patterns
SILENT_FAILURE_CHECK: Context analysis incomplete, wrong files identified
SILENT_FAILURE_CHECK: Pattern detection fails, generic code generated
SILENT_FAILURE_CHECK: Protected files not respected
```

### SEQ-EVO-003: Evolution Execution Sequence
```
TEST: Evolution execution integrates changes with existing codebase
FLOW: Same as SEQ-GEN-003 but with existing code context and PR creation
PURPOSE: Execute feature tasks while integrating with existing code
TRIGGER: Feature plan approved

SAME AS SEQ-GEN-003 WITH DIFFERENCES:
VERIFY: Base branch is main (with existing code), not empty
VERIFY: Agent prompts include existing code context
VERIFY: Merge strategy is conflict-aware
VERIFY: New tests AND existing tests must pass

ADDITIONAL STEP: PR Creation (after feature complete)
VERIFY: Feature branch created: feature/{featureId}
VERIFY: PR created with auto-generated title and body
VERIFY: Human review requested
VERIFY: Labels applied from project config

INTEGRATION_CHECK: Existing tests run and pass
INTEGRATION_CHECK: PR integrates with git workflow
SILENT_FAILURE_CHECK: Existing tests broken by change but not detected
SILENT_FAILURE_CHECK: PR created but merge conflicts not surfaced
SILENT_FAILURE_CHECK: Code style inconsistent with existing codebase
```

### SEQ-QA-001: Full QA Loop
```
TEST: QA loop iterates until pass or escalation
FLOW: CoderRunner → BuildVerifier → LintRunner → TestRunner → CodeReviewer → (Fix or Complete)
PURPOSE: Iteratively improve code until it passes all quality checks
TRIGGER: Coder completes initial implementation

STATE MACHINE:
  START → BUILD → [PASS] → LINT → [PASS] → TEST → [PASS] → REVIEW → [APPROVED] → COMPLETE
                   [FAIL] → CODER_FIX (iteration++) → BUILD
                            [FAIL] → AUTO-FIX → [FIXED] → TEST
                                               [NOT_FIXED] → CODER_FIX
                                     [FAIL] → CODER_FIX
                            [ISSUES] → CODER_FIX

PHASE 1: BUILD (tsc --noEmit)
VERIFY: BuildVerifier.verify() spawns tsc process
VERIFY: TypeScript errors parsed (file, line, column, code, message)
VERIFY: BuildResult returned with success/errors
IF FAIL: Errors sent to CoderRunner for fix

PHASE 2: LINT (eslint)
VERIFY: LintRunner.run() spawns eslint with --format json
VERIFY: Errors and warnings extracted separately
IF FAIL:
  VERIFY: LintRunner.fix() tries auto-fix with --fix
  IF STILL FAIL: Errors sent to CoderRunner for fix

PHASE 3: TEST (vitest)
VERIFY: TestRunner.run() spawns vitest with --reporter=json
VERIFY: Passed/failed/skipped counts extracted
VERIFY: Test failure details captured (testName, file, error, expected, actual)
IF FAIL: Failures sent to CoderRunner for fix

PHASE 4: REVIEW (Gemini)
VERIFY: CodeReviewer.review() calls GeminiClient
VERIFY: Git diff included in review prompt
VERIFY: Issues extracted with severity (critical, major, minor, suggestion)
VERIFY: Approval status determined
IF ISSUES: Issues sent to CoderRunner for fix

ITERATION LIMIT:
VERIFY: iteration counter starts at 1
VERIFY: iteration increments after each CODER_FIX
VERIFY: If iteration >= 50: ESCALATE to human
VERIFY: Escalation includes detailed checkpoint

EXIT CONDITIONS:
- All phases pass → COMPLETE (success)
- Iteration >= 50 → ESCALATE (escalated)
- Critical error → IMMEDIATE_ESCALATE (critical)
- User cancellation → ABORT (cancelled)

INTEGRATION_CHECK: Each phase output feeds into next correctly
INTEGRATION_CHECK: CoderRunner receives structured error context
SILENT_FAILURE_CHECK: Build step returns success despite tsc errors
SILENT_FAILURE_CHECK: Iteration count not incremented on certain errors
SILENT_FAILURE_CHECK: Escalation threshold bypassed
SILENT_FAILURE_CHECK: QA step skipped but iteration counted
SILENT_FAILURE_CHECK: Tests skip but reported as pass
```

### SEQ-CHK-001: Automatic Checkpoint
```
TEST: Automatic checkpoints create recovery points
FLOW: Trigger → CheckpointManager → StateManager → GitService → Database → EventBus
PURPOSE: Create recovery points automatically
TRIGGER: Time-based (every 2 hours), Event-based (feature completion), Safety-based (before risky ops)

STEP 1: Trigger checkpoint
VERIFY: Timer triggers every 2 hours (configurable)
VERIFY: Feature completion triggers checkpoint
VERIFY: Risky operations (merge, replan) trigger safety checkpoint

STEP 2: Load current state
VERIFY: StateManager.getState() returns complete NexusState
VERIFY: State includes tasks, agents, queue, progress

STEP 3: Create checkpoint branch
VERIFY: GitService creates branch: checkpoint/{timestamp}
VERIFY: Current commit hash recorded
VERIFY: Uncommitted changes noted

STEP 4: Save checkpoint metadata
VERIFY: Checkpoint record saved to database:
  - id, projectId, type, trigger
  - serialized state with SHA256 hash
  - git branch and commit info
  - database snapshot path
  - metadata (tasksPending, tasksCompleted)
VERIFY: Transaction ensures atomicity

STEP 5: Emit event
VERIFY: CHECKPOINT_CREATED event emitted with checkpointId, size, duration

INTEGRATION_CHECK: State serialization reversible
INTEGRATION_CHECK: Git state matches database state
SILENT_FAILURE_CHECK: Checkpoint created but state incomplete
SILENT_FAILURE_CHECK: Database backup fails silently
SILENT_FAILURE_CHECK: Git branch creation fails, no recovery point
SILENT_FAILURE_CHECK: State hash not verified
```

### SEQ-CHK-002: Checkpoint Recovery
```
TEST: Checkpoint recovery restores project to previous state
FLOW: User/System → CheckpointManager → AgentPool → GitService → StateManager → TaskQueue
PURPOSE: Restore project to a previous checkpoint
TRIGGER: User selects checkpoint OR system detects unrecoverable failure

STEP 1: Select checkpoint
VERIFY: User can list available checkpoints
VERIFY: System auto-selects on failure

STEP 2: Load and verify checkpoint
VERIFY: Checkpoint record loaded from database
VERIFY: State hash verified (SHA256 match)
VERIFY: Corrupted checkpoints rejected with clear error

STEP 3: Pause all agents
VERIFY: AgentPool.pauseAll() stops all running agents
VERIFY: Force terminate if agents don't pause within timeout

STEP 4: Git checkout
VERIFY: GitService.checkout() switches to checkpoint branch
VERIFY: Conflicts handled (stash or discard)

STEP 5: Restore state
VERIFY: StateManager.restore() loads serialized state
VERIFY: State fully reconstructed

STEP 6: Re-queue incomplete tasks
VERIFY: Tasks that were in_progress marked as pending
VERIFY: TaskQueue re-populated with correct order

STEP 7: Reset agents
VERIFY: AgentPool.resetAll() clears agent states
VERIFY: Agents ready for new work

STEP 8: Emit event
VERIFY: CHECKPOINT_RESTORED event emitted with:
  - tasksRequeued count
  - agentsReset count
  - dataLost (tasks lost since checkpoint)

INTEGRATION_CHECK: All components restore to consistent state
INTEGRATION_CHECK: No orphaned worktrees after restore
SILENT_FAILURE_CHECK: State corrupted during restore
SILENT_FAILURE_CHECK: Tasks lost during restore
SILENT_FAILURE_CHECK: Agent state mismatch after restore
SILENT_FAILURE_CHECK: Git conflicts cause partial restore
```

### SEQ-AGT-001: Planner → Coder Handoff
```
TEST: Planner successfully hands off decomposed tasks to Coder
FLOW: Planner → EventBus (TASKS_CREATED) → TaskQueue → NexusCoordinator → AgentPool → CoderRunner
PURPOSE: Transfer decomposed tasks from Planner to Coder for execution

STEP 1: Planner completes decomposition
VERIFY: Feature broken into Task[] with dependencies
VERIFY: Each task has title, description, estimatedMinutes

STEP 2: Emit TASKS_CREATED
VERIFY: Event includes featureId, tasks array, totalEstimate, waveCount

STEP 3: TaskQueue enqueues
VERIFY: Tasks added in dependency order
VERIFY: Wave assignments correct

STEP 4: Signal task available
VERIFY: Coordinator notified of new work

STEP 5: Get available Coder
VERIFY: AgentPool returns available agent
VERIFY: Wait if pool exhausted

STEP 6: Dequeue task
VERIFY: Highest priority ready task returned
VERIFY: Dependencies satisfied

STEP 7: Emit TASK_ASSIGNED
VERIFY: Event includes taskId, agentId, worktreePath

STEP 8: Build context and execute
VERIFY: PlannerToCoderHandoff includes:
  - task details
  - featureGoal and taskRationale
  - relatedTasks
  - filesIdentified
  - techStack and conventions
  - existingPatterns

INTEGRATION_CHECK: Task format matches Coder expectations
INTEGRATION_CHECK: Context sufficient for independent execution
SILENT_FAILURE_CHECK: Task lost between queue and agent
SILENT_FAILURE_CHECK: Wrong task dequeued (priority bug)
SILENT_FAILURE_CHECK: Context incomplete, agent lacks information
```

### SEQ-AGT-002: Coder → Reviewer Handoff
```
TEST: Coder successfully hands off completed code to Reviewer
FLOW: CoderRunner → GitService → EventBus (REVIEW_REQUESTED) → CodeReviewer → (back to Coder if issues)
PURPOSE: Submit completed code for AI review

STEP 1: Complete implementation
VERIFY: CoderRunner.execute() returns FileChange[]
VERIFY: [TASK_COMPLETE] marker detected

STEP 2: Stage and commit
VERIFY: GitService.commit() stages all changes
VERIFY: Commit message descriptive

STEP 3: Generate diff
VERIFY: GitService.diff() returns unified diff
VERIFY: Diff includes file additions, modifications, deletions

STEP 4: Emit REVIEW_REQUESTED
VERIFY: Event includes taskId, commitHash, diff, context (taskDescription, acceptanceCriteria)

STEP 5: Reviewer receives
VERIFY: EventBus routes to CodeReviewer

STEP 6: Review with Gemini
VERIFY: CodeReviewer.review() calls GeminiClient
VERIFY: Review prompt includes diff and context

STEP 7: Parse review
VERIFY: Issues extracted with severity, category, file, line, description, suggestion
VERIFY: Approval status determined

STEP 8a: If APPROVED
VERIFY: REVIEW_APPROVED event emitted with confidence and summary

STEP 8b: If ISSUES
VERIFY: REVIEW_ISSUES event emitted with issues array and blockers count

STEP 9: If issues, Coder fixes
VERIFY: CoderRunner receives issues in structured format
VERIFY: Fixes applied and back to step 2

INTEGRATION_CHECK: Diff format parseable by reviewer
INTEGRATION_CHECK: Issues format actionable by coder
SILENT_FAILURE_CHECK: Commit succeeds but diff empty
SILENT_FAILURE_CHECK: Review always approves (Gemini failure masked)
SILENT_FAILURE_CHECK: Issues lost between reviewer and coder
```

### SEQ-AGT-003: Reviewer → Merger Handoff
```
TEST: Reviewer successfully hands off approved code to Merger
FLOW: CodeReviewer → EventBus (MERGE_REQUESTED) → MergerRunner → WorktreeManager → Coordinator
PURPOSE: Transfer approved code for merging to main branch

STEP 1: Approve review
VERIFY: CodeReviewer marks task as approved
VERIFY: Review result recorded

STEP 2: Emit MERGE_REQUESTED
VERIFY: Event includes taskId, featureId, sourceBranch, targetBranch

STEP 3: Merger receives
VERIFY: MergerRunner triggered by event

STEP 4: Get worktree info
VERIFY: WorktreeManager.getInfo() returns path and branch

STEP 5: Attempt merge
VERIFY: GitService.merge() attempts merge to main

STEP 6a: If SUCCESS
VERIFY: MERGE_COMPLETED event emitted with commitHash
VERIFY: Task status updated to 'done'

STEP 6b: If CONFLICT
VERIFY: Conflict analyzed (files, lines, severity)
  IF RESOLVABLE: Auto-resolve with Claude assistance
  IF COMPLEX: Escalate to human with MERGE_CONFLICT_ESCALATED event

STEP 7: Cleanup worktree
VERIFY: WorktreeManager.remove() cleans up task worktree

STEP 8: Update task status
VERIFY: Database updated with final status
VERIFY: Coordinator notified for next task

INTEGRATION_CHECK: Merge result correctly updates all state
INTEGRATION_CHECK: Worktree cleanup happens even on failure
SILENT_FAILURE_CHECK: Merge succeeds but conflict resolution wrong
SILENT_FAILURE_CHECK: Worktree not cleaned up
SILENT_FAILURE_CHECK: Task marked done but merge actually failed
SILENT_FAILURE_CHECK: Escalation not triggered for complex conflict
```

---

**[TASK 4 COMPLETE]**

Task 4 extracted all 12 integration sequences from Integration Specification:
- SEQ-GEN-001: Interview Sequence (11 steps)
- SEQ-GEN-002: Planning Sequence (11 steps)
- SEQ-GEN-003: Execution Sequence (7+ steps per task)
- SEQ-EVO-001: Context Analysis Sequence (10 steps)
- SEQ-EVO-002: Feature Planning Sequence (9 steps)
- SEQ-EVO-003: Evolution Execution Sequence (same as Genesis + PR)
- SEQ-QA-001: Full QA Loop (6 phases, 50 max iterations)
- SEQ-CHK-001: Automatic Checkpoint (7 steps)
- SEQ-CHK-002: Checkpoint Recovery (10 steps)
- SEQ-AGT-001: Planner → Coder Handoff (9 steps)
- SEQ-AGT-002: Coder → Reviewer Handoff (9 steps)
- SEQ-AGT-003: Reviewer → Merger Handoff (10 steps)

Each sequence includes:
- PURPOSE and TRIGGER
- Step-by-step VERIFY statements
- INTEGRATION_CHECK statements
- SILENT_FAILURE_CHECK statements

Total tests added: ~120 new integration tests
