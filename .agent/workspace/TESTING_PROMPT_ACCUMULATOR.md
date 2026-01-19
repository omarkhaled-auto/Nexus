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
| 5 | Genesis Workflow | COMPLETE | 75 |
| 6 | Evolution Workflow | COMPLETE | 80 |
| 7 | Phase 13 Features | COMPLETE | 70 |
| 8 | Phase 14B Bindings | COMPLETE | 85 |
| 9 | Silent Failures | COMPLETE | 35 |
| 10 | Edge Cases | COMPLETE | 34 |
| 11 | Synthesis | COMPLETE | 717 (summary) |
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

---

## SECTION 5: GENESIS MODE WORKFLOW TESTS

### GEN-E2E-001: Complete Genesis Flow (Simple CLI App)
```
TEST: Genesis mode creates simple CLI app from scratch
INPUT: "I want a CLI calculator that adds and subtracts numbers"
EXPECTED_OUTPUT: Working CLI app with tests, passing build, lint, and test
TIME_LIMIT: 30 minutes for simple app

PHASE 1: INTERVIEW
VERIFY: Interview UI loads without errors
VERIFY: User can enter initial project description
VERIFY: ClaudeClient.stream() called with interview system prompt
VERIFY: Claude generates at least 3 clarifying questions
VERIFY: User answers are appended to conversation history
VERIFY: Requirements extracted and displayed in sidebar
VERIFY: Minimum 3 requirements captured before completion allowed
VERIFY: INTERVIEW_COMPLETE event emitted with projectId, requirementCount
VERIFY: Requirements persisted to RequirementsDB with categories and priorities

PHASE 2: PLANNING
VERIFY: PLANNING_START event emitted with projectId
VERIFY: TaskDecomposer creates feature list from requirements
VERIFY: Each feature decomposed into atomic tasks
VERIFY: Each task estimated <= 30 minutes
VERIFY: Tasks > 30 minutes automatically split by TaskSplitter
VERIFY: DependencyResolver orders tasks with topological sort
VERIFY: No circular dependencies detected
VERIFY: TaskWave[] groups parallelizable tasks correctly
VERIFY: Execution plan displayed for user review
VERIFY: PLANNING_COMPLETE event emitted with taskCount, waveCount

PHASE 3: EXECUTION
VERIFY: EXECUTION_START event emitted with totalTasks, totalWaves
VERIFY: Tasks execute in wave order
VERIFY: Parallel tasks within wave execute concurrently (up to 4)
VERIFY: CoderAgent generates code for each task
VERIFY: Code written to correct worktree location
VERIFY: [TASK_COMPLETE] marker detected after each task
VERIFY: TASK_COMPLETED events emitted for each task
VERIFY: Progress visible in Dashboard UI

PHASE 4: QA VALIDATION
VERIFY: QALoopEngine runs Build → Lint → Test → Review for each task
VERIFY: tsc --noEmit passes (no TypeScript errors)
VERIFY: eslint passes (no lint errors, warnings acceptable)
VERIFY: vitest passes (all tests pass)
VERIFY: Gemini code review approves changes
VERIFY: If QA fails, CoderAgent receives errors and fixes
VERIFY: Iteration count tracked correctly
VERIFY: QA cycle completes within 50 iterations

PHASE 5: DELIVERY
VERIFY: All tasks complete with status 'done'
VERIFY: MergerRunner merges all worktrees to main
VERIFY: Final build passes (tsc --noEmit)
VERIFY: Final lint passes (eslint)
VERIFY: Final tests pass (vitest)
VERIFY: EXECUTION_COMPLETE event emitted with tasksCompleted, tasksFailed, cost
VERIFY: Project is runnable from command line

SILENT_FAILURE_CHECK: Interview completes but requirements array empty
SILENT_FAILURE_CHECK: Planning succeeds but 0 tasks generated
SILENT_FAILURE_CHECK: Execution completes but code doesn't compile
SILENT_FAILURE_CHECK: Tests pass but functionality doesn't match requirements
SILENT_FAILURE_CHECK: QA loop exits without all steps passing
SILENT_FAILURE_CHECK: Merge succeeds but files missing from main
```

### GEN-E2E-002: Genesis with Market Research
```
TEST: Genesis mode includes market research phase for competitive analysis
INPUT: "Build a task management app like Todoist but simpler"
EXPECTED: Research data influences feature planning and MVP scope
TIME_LIMIT: 45 minutes (includes research phase)

PHASE 1: INTERVIEW WITH RESEARCH TRIGGER
VERIFY: Interview detects existing market competitors mentioned
VERIFY: Research Engine activated when competitors detected
VERIFY: RESEARCH_START event emitted

PHASE 2: RESEARCH
VERIFY: Competitor features analyzed (Todoist feature list extracted)
VERIFY: UX patterns identified from similar apps
VERIFY: Research summary generated with key differentiators
VERIFY: RESEARCH_COMPLETE event emitted with insights

PHASE 3: RESEARCH-INFORMED PLANNING
VERIFY: TaskDecomposer receives research context
VERIFY: Features align with identified patterns
VERIFY: MVP scope suggested based on competitor analysis
VERIFY: Unique differentiators captured as requirements
VERIFY: Realistic scope based on market research

INTEGRATION_CHECK: Research data flows to TaskDecomposer
INTEGRATION_CHECK: MVP suggestions reflect competitive analysis
SILENT_FAILURE_CHECK: Research fails silently, continues without data
SILENT_FAILURE_CHECK: Research data ignored in planning phase
SILENT_FAILURE_CHECK: Competitor features not reflected in requirements
```

### GEN-E2E-003: Genesis with Complex Multi-Feature App
```
TEST: Genesis handles complex multi-feature application over multiple waves
INPUT: "Build a full-stack e-commerce site with auth, products, cart, checkout"
EXPECTED: Large app built through wave-based parallel execution
TIME_LIMIT: 8-48 hours depending on complexity

PHASE 1: COMPREHENSIVE INTERVIEW
VERIFY: Interview captures all major features (auth, products, cart, checkout)
VERIFY: Sub-features captured (user registration, login, product listing, search, etc.)
VERIFY: Technical requirements captured (database, API, frontend framework)
VERIFY: Minimum 20+ requirements captured for complex app
VERIFY: Interview duration may exceed 30 minutes for complex apps

PHASE 2: HIERARCHICAL PLANNING
VERIFY: Features decomposed hierarchically (Feature → Sub-feature → Task)
VERIFY: Total task count > 50 for complex app
VERIFY: All tasks <= 30 minutes estimated
VERIFY: DependencyResolver handles complex dependency graph
VERIFY: Multiple waves created (typically 5+ waves)
VERIFY: Critical path identified through dependency graph

PHASE 3: WAVE-BASED EXECUTION
VERIFY: Wave 1 tasks have no dependencies (foundation tasks)
VERIFY: Subsequent waves depend only on completed tasks
VERIFY: Parallel tasks execute concurrently (up to max agents)
VERIFY: Wave N+1 doesn't start until all Wave N tasks complete
VERIFY: Checkpoints created every 2 hours of execution
VERIFY: Progress percentage calculated correctly

PHASE 4: CROSS-FEATURE INTEGRATION
VERIFY: Features integrate correctly (auth used by cart/checkout)
VERIFY: Shared components detected and created once
VERIFY: API endpoints consistent across features
VERIFY: Database schema migrations run in correct order
VERIFY: Integration tests pass between features

INTEGRATION_CHECK: Wave calculator optimizes parallel execution
INTEGRATION_CHECK: Checkpoint manager creates recovery points
SILENT_FAILURE_CHECK: Wave deadlock occurs, no progress
SILENT_FAILURE_CHECK: Checkpoint restore fails mid-project
SILENT_FAILURE_CHECK: Feature interaction bugs not caught by QA
SILENT_FAILURE_CHECK: Database migration order wrong, breaks schema
```

### GEN-E2E-004: Genesis Recovery from Interruption
```
TEST: Genesis recovers gracefully from mid-execution interruption
SETUP: Start Genesis with simple app, interrupt at 50% task completion
EXPECTED: Resume from most recent checkpoint, continue to completion

PHASE 1: SIMULATE INTERRUPTION
VERIFY: Genesis started with valid project
VERIFY: At least 50% of tasks completed
VERIFY: Checkpoint exists with state hash
VERIFY: Force stop execution (simulate crash/user stop)

PHASE 2: CHECKPOINT VALIDATION
VERIFY: CheckpointManager.list() returns available checkpoints
VERIFY: Latest checkpoint has correct timestamp
VERIFY: State hash validated (SHA256 match)
VERIFY: Checkpoint contains tasksPending, tasksCompleted counts
VERIFY: Git branch checkpoint/{timestamp} exists

PHASE 3: RECOVERY PROCESS
VERIFY: CheckpointManager.restore() called with selected checkpoint
VERIFY: AgentPool.pauseAll() called before restore
VERIFY: GitService.checkout() switches to checkpoint branch
VERIFY: StateManager.restore() loads serialized state
VERIFY: TaskQueue re-populated with pending tasks only
VERIFY: Completed tasks NOT re-executed

PHASE 4: RESUME EXECUTION
VERIFY: AgentPool.resetAll() clears stale agent states
VERIFY: Execution continues from checkpoint position
VERIFY: CHECKPOINT_RESTORED event emitted with tasksRequeued, dataLost
VERIFY: Remaining tasks complete successfully
VERIFY: Final project state identical to uninterrupted run

INTEGRATION_CHECK: State serialization is reversible
INTEGRATION_CHECK: Git state matches database state after restore
SILENT_FAILURE_CHECK: Checkpoint corrupted, full restart required
SILENT_FAILURE_CHECK: Some tasks re-executed unnecessarily (wasted work)
SILENT_FAILURE_CHECK: State mismatch after restore (inconsistent data)
SILENT_FAILURE_CHECK: Worktrees orphaned during restore
```

### GEN-E2E-005: Genesis Human Escalation at QA Limit
```
TEST: Genesis escalates stuck tasks to human after 50 QA iterations
SETUP: Task with intentionally unfixable issue (e.g., impossible requirement)
EXPECTED: Human notification sent, task paused, other tasks continue

PHASE 1: TRIGGER ESCALATION
VERIFY: Task encounters persistent QA failure
VERIFY: CoderAgent attempts fix each iteration
VERIFY: Iteration counter increments correctly (1→2→3...→50)
VERIFY: QALoopEngine tracks iteration count in state

PHASE 2: ESCALATION THRESHOLD
VERIFY: At iteration 30, warning event emitted (ESCALATION_WARNING)
VERIFY: At iteration 40, detailed checkpoint created
VERIFY: At iteration 50, EscalationHandler.escalate() called
VERIFY: ESCALATION_TRIGGERED event emitted with taskId, iterationCount, errors

PHASE 3: ESCALATION HANDLING
VERIFY: Human notification sent (in-app notification, optional email/webhook)
VERIFY: Task status changed to 'escalated'
VERIFY: Task removed from active execution queue
VERIFY: Detailed error context preserved for human review
VERIFY: Suggested fixes presented to human

PHASE 4: CONTINUED EXECUTION
VERIFY: Other tasks in project continue executing
VERIFY: Dependent tasks wait but don't block entire system
VERIFY: AgentPool resources released from escalated task
VERIFY: Project progress shows "X tasks complete, 1 escalated"

PHASE 5: HUMAN RESOLUTION
VERIFY: Human can view escalated task details
VERIFY: Human can provide fix or skip task
VERIFY: On human fix: task re-queued for verification
VERIFY: On human skip: task marked 'skipped', dependents notified
VERIFY: ESCALATION_RESOLVED event emitted

INTEGRATION_CHECK: Escalation doesn't block entire project
INTEGRATION_CHECK: Human interface shows all context needed for decision
SILENT_FAILURE_CHECK: Escalation triggered but notification not sent
SILENT_FAILURE_CHECK: Notification lost in delivery
SILENT_FAILURE_CHECK: System hangs waiting for human response indefinitely
SILENT_FAILURE_CHECK: Iteration counter resets, bypasses escalation
```

### GEN-E2E-006: Genesis with Minimal Requirements
```
TEST: Genesis handles minimal input and prompts for more detail
INPUT: "Make me an app"
EXPECTED: Interview guides user to provide sufficient detail

PHASE 1: MINIMAL INPUT DETECTION
VERIFY: Interview detects vague/minimal input
VERIFY: Claude responds with targeted clarifying questions
VERIFY: Questions guide toward: purpose, users, features, constraints

PHASE 2: ITERATIVE REFINEMENT
VERIFY: Each user response triggers more specific questions
VERIFY: Requirements accumulate through conversation
VERIFY: No premature completion allowed with < 3 requirements
VERIFY: Completion warning shows if requirements seem insufficient

PHASE 3: ADEQUATE REQUIREMENTS
VERIFY: Eventually, requirements reach threshold for planning
VERIFY: User explicitly confirms completion
VERIFY: Planning proceeds only with confirmed requirements

INTEGRATION_CHECK: Interview system prompt encourages detail extraction
SILENT_FAILURE_CHECK: Vague requirements passed to planning without refinement
SILENT_FAILURE_CHECK: User allowed to proceed with empty requirements
```

### GEN-E2E-007: Genesis with Conflicting Requirements
```
TEST: Genesis detects and resolves conflicting requirements
INPUT: Project with conflicting requirements (e.g., "must be offline-only" AND "must sync in real-time")
EXPECTED: Conflict detected during interview, user prompted to resolve

PHASE 1: CONFLICT DETECTION
VERIFY: Interview captures all requirements including conflicting ones
VERIFY: Conflict detection runs before planning starts
VERIFY: REQUIREMENTS_CONFLICT event emitted with conflicting pairs

PHASE 2: CONFLICT RESOLUTION
VERIFY: User presented with conflicting requirements
VERIFY: User can choose which to prioritize or modify
VERIFY: Modified requirements updated in RequirementsDB
VERIFY: Conflict resolved before planning proceeds

PHASE 3: VERIFIED PLANNING
VERIFY: TaskDecomposer receives conflict-free requirements
VERIFY: Planning produces consistent, achievable tasks

SILENT_FAILURE_CHECK: Conflicting requirements accepted, impossible tasks created
SILENT_FAILURE_CHECK: Conflict detected but user not notified
```

### GEN-E2E-008: Genesis Cost Tracking
```
TEST: Genesis accurately tracks API costs throughout execution
INPUT: Any valid project
EXPECTED: Cost tracking shows accurate per-task and total costs

PHASE 1: COST TRACKING INITIALIZATION
VERIFY: CostTracker initialized at project start
VERIFY: Initial cost is $0.00

PHASE 2: PER-REQUEST TRACKING
VERIFY: Each LLM API call tracked with model and tokens
VERIFY: Claude Opus calls tracked at correct rate
VERIFY: Claude Sonnet calls tracked at correct rate
VERIFY: Gemini calls tracked at correct rate
VERIFY: Embedding API calls tracked

PHASE 3: PER-TASK AGGREGATION
VERIFY: Each task has associated cost
VERIFY: Task cost = sum of all LLM calls during task execution
VERIFY: QA iterations add to task cost

PHASE 4: PROJECT TOTAL
VERIFY: Project total = sum of all task costs
VERIFY: EXECUTION_COMPLETE event includes totalCost
VERIFY: Dashboard shows cost breakdown by phase and task
VERIFY: Cost stays within estimate (±50% of estimate)

INTEGRATION_CHECK: CostTracker receives all LLM call notifications
SILENT_FAILURE_CHECK: API calls not tracked, cost shows $0.00
SILENT_FAILURE_CHECK: Cost calculation uses wrong token rates
SILENT_FAILURE_CHECK: Cost tracking stops mid-project
```

---

**[TASK 5 COMPLETE]**

Task 5 extracted 8 Genesis Mode E2E workflow tests:
- GEN-E2E-001: Complete Genesis Flow (Simple CLI App) - 40+ VERIFY statements
- GEN-E2E-002: Genesis with Market Research - 15 VERIFY statements
- GEN-E2E-003: Genesis with Complex Multi-Feature App - 20 VERIFY statements
- GEN-E2E-004: Genesis Recovery from Interruption - 20 VERIFY statements
- GEN-E2E-005: Genesis Human Escalation at QA Limit - 25 VERIFY statements
- GEN-E2E-006: Genesis with Minimal Requirements - 10 VERIFY statements
- GEN-E2E-007: Genesis with Conflicting Requirements - 10 VERIFY statements
- GEN-E2E-008: Genesis Cost Tracking - 15 VERIFY statements

Each test includes:
- INPUT/EXPECTED specifications
- TIME_LIMIT where applicable
- Phase-by-phase VERIFY statements
- INTEGRATION_CHECK statements
- SILENT_FAILURE_CHECK statements

Total tests added: ~75 new workflow tests

---

## SECTION 6: EVOLUTION MODE WORKFLOW TESTS

### EVO-E2E-001: Add Simple Feature to Existing Codebase
```
TEST: Evolution mode adds simple feature to existing React application
SETUP: Existing React app with basic routing (src/, package.json, tsconfig.json present)
INPUT: "Add a dark mode toggle to the header"
EXPECTED: Feature added matching existing patterns, all existing tests pass
TIME_LIMIT: 45 minutes for simple feature

PHASE 1: CONTEXT ANALYSIS
VERIFY: PROJECT_LOAD event emitted with projectPath and mode='evolution'
VERIFY: FileSystemService.glob() scans all source files (*.ts, *.tsx, *.js, *.jsx)
VERIFY: File metadata collected (path, size, lastModified, type, language)
VERIFY: LSPClient.initialize() starts TypeScript language server
VERIFY: LSPClient returns ProjectStructure with entryPoints, modules, symbols
VERIFY: Symbol index created (classes, functions, interfaces, variables)
VERIFY: Dependency graph built (internal imports and external packages)
VERIFY: MemorySystem.query() retrieves historical context from previous sessions
VERIFY: CONTEXT_READY event emitted with fileCount, symbolCount, memoryCount
VERIFY: KanbanPage displays project overview with detected patterns

PHASE 2: FEATURE PLANNING
VERIFY: User creates feature card "Add dark mode toggle"
VERIFY: Drag to "In Progress" triggers complexity assessment
VERIFY: ComplexityAssessment calculates score based on:
  - fileCount: estimated files to modify
  - dependencyDepth: component dependencies
  - integrationPoints: system integrations
  - estimatedDuration: time estimate
VERIFY: Score <= 4 AND duration <= 60min → auto-task (no planning required)
VERIFY: Score > 4 OR duration > 60min → planning required (user review)
VERIFY: TaskDecomposer receives EvolutionPlanningContext with:
  - relatedFiles (likely modified files)
  - dependencies (files depending on related files)
  - patterns (detected code patterns)
  - previousDecisions (historical architectural decisions)
  - constraints (backward compat, existing tests, protected files)
VERIFY: Tasks include predicted file locations based on context

PHASE 3: KANBAN WORKFLOW
VERIFY: Tasks appear in Backlog column
VERIFY: User can drag tasks between columns
VERIFY: Drag to "In Progress" triggers execution
VERIFY: Task status updates reflected in real-time
VERIFY: FeatureCard shows progress (tasks completed / total)
VERIFY: AgentStatusGrid shows active agents working on tasks

PHASE 4: EXECUTION
VERIFY: CoderAgent receives task with existing code context
VERIFY: Agent prompt includes relevant existing files
VERIFY: Generated code matches existing naming conventions (camelCase vs snake_case)
VERIFY: Generated code matches existing file structure
VERIFY: Generated code matches existing error handling patterns
VERIFY: Generated code matches existing logging patterns
VERIFY: Generated tests match existing test structure
VERIFY: WorktreeManager creates isolated worktree for task

PHASE 5: QA VALIDATION
VERIFY: QALoopEngine runs Build → Lint → Test → Review sequence
VERIFY: tsc --noEmit passes on generated code
VERIFY: eslint passes with existing project rules
VERIFY: NEW tests pass (vitest)
VERIFY: EXISTING tests still pass (regression check)
VERIFY: Gemini code review approves changes
VERIFY: Code style consistent with existing codebase

PHASE 6: INTEGRATION
VERIFY: MergerRunner merges worktree changes to feature branch
VERIFY: No unrelated files modified (scope isolation)
VERIFY: Feature branch created: feature/{featureId}
VERIFY: PR NOT created for simple features (direct merge)
VERIFY: Task marked as 'done'
VERIFY: TASK_COMPLETED event emitted

INTEGRATION_CHECK: Context analysis results inform task decomposition
INTEGRATION_CHECK: Generated code respects existing patterns
INTEGRATION_CHECK: Existing tests remain green after changes
SILENT_FAILURE_CHECK: Context analysis misses key files/patterns
SILENT_FAILURE_CHECK: Generated code conflicts with existing code style
SILENT_FAILURE_CHECK: Existing tests broken by changes but not detected
SILENT_FAILURE_CHECK: Unrelated files modified, scope creep not detected
```

### EVO-E2E-002: Add Complex Multi-File Feature
```
TEST: Evolution handles complex feature requiring database, API, and frontend changes
SETUP: Existing Node.js/Express API with authentication stub
INPUT: "Add user authentication with JWT, login/logout endpoints, and protected routes"
EXPECTED: Auth feature across multiple files/layers, all tests pass
TIME_LIMIT: 2-4 hours for complex feature

PHASE 1: CONTEXT ANALYSIS
VERIFY: Full codebase scan identifies all relevant files:
  - API routes (routes/*.ts)
  - Middleware (middleware/*.ts)
  - Database models (models/*.ts)
  - Configuration (config/*.ts)
  - Existing auth stub (if any)
VERIFY: LSP identifies existing patterns:
  - Route handler structure
  - Error handling approach
  - Request/response patterns
  - Database access patterns
VERIFY: Dependencies identified:
  - Existing packages (express, etc.)
  - Missing packages (jsonwebtoken, bcrypt)

PHASE 2: FEATURE PLANNING
VERIFY: Complexity assessment returns score > 4 (planning required)
VERIFY: User presented with complexity breakdown
VERIFY: TaskDecomposer creates hierarchical task breakdown:
  - Task 1: Add JWT and bcrypt packages (5 min)
  - Task 2: Create User model and migration (15 min)
  - Task 3: Create auth middleware (20 min)
  - Task 4: Create login endpoint (20 min)
  - Task 5: Create logout endpoint (10 min)
  - Task 6: Add protected route middleware (15 min)
  - Task 7: Update existing routes with protection (15 min)
  - Task 8: Add auth tests (25 min)
VERIFY: DependencyResolver orders tasks correctly (migration before auth)
VERIFY: All tasks estimated <= 30 minutes
VERIFY: User reviews and approves plan

PHASE 3: WAVE-BASED EXECUTION
VERIFY: Tasks execute in dependency order
VERIFY: Wave 1: Package installation, model creation
VERIFY: Wave 2: Middleware, endpoints (can parallelize)
VERIFY: Wave 3: Route updates, tests (depend on Wave 2)
VERIFY: Parallel tasks execute concurrently within waves

PHASE 4: DATABASE CHANGES
VERIFY: Database migration created for users table
VERIFY: Migration runs successfully in worktree
VERIFY: Migration script follows existing migration patterns
VERIFY: No existing data corrupted (test database)

PHASE 5: API CHANGES
VERIFY: New endpoints follow existing route structure
VERIFY: Request validation consistent with existing patterns
VERIFY: Response format consistent with existing API
VERIFY: Error handling consistent with existing patterns
VERIFY: Logging follows existing conventions

PHASE 6: TESTS AND COVERAGE
VERIFY: Unit tests for each component
VERIFY: Integration tests for auth flow
VERIFY: Test coverage for feature code >= 80%
VERIFY: Existing API tests still pass
VERIFY: No regression in existing functionality

INTEGRATION_CHECK: Migration + API + Tests integrate correctly
INTEGRATION_CHECK: Feature branch contains all related changes
SILENT_FAILURE_CHECK: Migration created but not run (schema mismatch)
SILENT_FAILURE_CHECK: Security vulnerability in auth code (weak JWT secret)
SILENT_FAILURE_CHECK: Existing endpoints broken by middleware changes
SILENT_FAILURE_CHECK: Tests pass but functionality doesn't match requirements
```

### EVO-E2E-003: Evolution Pattern Matching and Style Consistency
```
TEST: Evolution matches existing code patterns automatically
SETUP: Codebase with specific conventions (PascalCase components, kebab-case files, etc.)
INPUT: "Add a new UserSettings component and API endpoint"
EXPECTED: New code follows all existing conventions exactly
TIME_LIMIT: 30 minutes

PHASE 1: PATTERN DETECTION
VERIFY: FileSystemService detects file naming patterns:
  - Component files: PascalCase.tsx
  - Hook files: useCamelCase.ts
  - Service files: camelCase.service.ts
  - Test files: *.test.ts or *.spec.ts
VERIFY: LSPClient detects code patterns:
  - Function naming (camelCase vs PascalCase)
  - Variable naming conventions
  - Import organization (grouping, ordering)
  - Export patterns (named vs default)
VERIFY: Style patterns detected:
  - Indentation (spaces vs tabs, count)
  - Quotes (single vs double)
  - Semicolons (required vs optional)
  - Trailing commas
VERIFY: Error handling patterns detected:
  - try/catch structure
  - Error types used
  - Error response format
VERIFY: Logging patterns detected:
  - Logger used (console, winston, pino)
  - Log levels (info, debug, error)
  - Log format

PHASE 2: PATTERN APPLICATION
VERIFY: CoderAgent prompt includes detected patterns
VERIFY: Generated component file named UserSettings.tsx (PascalCase)
VERIFY: Generated hook file named useUserSettings.ts
VERIFY: Generated service file named userSettings.service.ts
VERIFY: Generated test file named UserSettings.test.tsx
VERIFY: Function names follow detected casing
VERIFY: Imports organized same as existing files
VERIFY: Error handling matches existing patterns
VERIFY: Logging matches existing patterns

PHASE 3: STYLE VALIDATION
VERIFY: ESLint with existing config passes
VERIFY: Prettier format matches existing code
VERIFY: No new linting warnings introduced
VERIFY: TypeScript strict mode respected

PHASE 4: INTEGRATION
VERIFY: New files integrate with existing module structure
VERIFY: No import cycles created
VERIFY: Barrel exports updated if existing pattern

INTEGRATION_CHECK: Patterns from analysis used in generation
INTEGRATION_CHECK: Generated code indistinguishable from human-written
SILENT_FAILURE_CHECK: Pattern detection fails, generic code generated
SILENT_FAILURE_CHECK: Inconsistent style introduced (mixed conventions)
SILENT_FAILURE_CHECK: Pattern applied to wrong context (backend pattern in frontend)
```

### EVO-E2E-004: Evolution with Merge Conflicts
```
TEST: Evolution handles merge conflicts when main branch changes during execution
SETUP: Start feature, modify main branch during execution
EXPECTED: Conflicts detected, analyzed, and resolved (auto or escalated)
TIME_LIMIT: Variable (depends on conflict complexity)

PHASE 1: CREATE CONFLICT SCENARIO
VERIFY: Feature execution starts on branch feature/{featureId}
VERIFY: Worktree created from main at commit C1
VERIFY: While feature executes, main advances to commit C2
VERIFY: Main changes overlap with feature changes (same files)

PHASE 2: CONFLICT DETECTION
VERIFY: Before merge, GitService detects main has advanced
VERIFY: GitService.merge() attempts merge from main
VERIFY: Conflict detected in overlapping files
VERIFY: MERGE_CONFLICT event emitted with conflict details

PHASE 3: CONFLICT ANALYSIS
VERIFY: MergerAgent receives conflict context:
  - conflictFiles: list of files with conflicts
  - ourChanges: feature branch changes
  - theirChanges: main branch changes
  - conflictMarkers: specific conflict regions
VERIFY: Conflict complexity assessed:
  - Simple: Same file, different regions (auto-resolvable)
  - Moderate: Same region, compatible changes (maybe auto-resolve)
  - Complex: Same region, incompatible changes (escalate)

PHASE 4A: AUTO-RESOLUTION (Simple/Moderate Conflicts)
VERIFY: MergerAgent uses Claude to analyze both changes
VERIFY: Resolution strategy determined:
  - Keep both (different regions)
  - Merge logic (compatible changes)
  - Choose one (duplicate functionality)
VERIFY: Merged code generated
VERIFY: Merged code compiles (tsc --noEmit)
VERIFY: Tests pass with merged code
VERIFY: MERGE_RESOLVED event emitted with resolution summary

PHASE 4B: ESCALATION (Complex Conflicts)
VERIFY: MERGE_CONFLICT_ESCALATED event emitted
VERIFY: Human notification sent with conflict details
VERIFY: Task marked as 'conflict_pending'
VERIFY: Conflict context preserved for human review:
  - Base version
  - Our version
  - Their version
  - Suggested resolutions
VERIFY: Human can resolve manually
VERIFY: After human resolution, execution continues

PHASE 5: FINAL VERIFICATION
VERIFY: Merged code passes all QA checks
VERIFY: No code corruption from resolution
VERIFY: Feature functionality preserved
VERIFY: Main branch changes preserved

INTEGRATION_CHECK: Conflict detection reliable
INTEGRATION_CHECK: Auto-resolution produces valid code
INTEGRATION_CHECK: Escalation path works correctly
SILENT_FAILURE_CHECK: Conflict missed, code corrupted silently
SILENT_FAILURE_CHECK: Auto-resolution produces invalid/incomplete code
SILENT_FAILURE_CHECK: Escalation not triggered for complex conflict
SILENT_FAILURE_CHECK: Merged code compiles but logic broken
```

### EVO-E2E-005: Evolution Context Freshness Between Tasks
```
TEST: Evolution uses fresh, accurate context for each task in sequence
SETUP: Feature with multiple tasks that modify the same files sequentially
INPUT: Feature requiring Task A to modify file.ts, then Task B to modify file.ts
EXPECTED: Task B sees Task A's changes, no overwriting or stale context
TIME_LIMIT: 60 minutes

PHASE 1: INITIAL STATE
VERIFY: File.ts exists with initial content
VERIFY: Task A and Task B both target File.ts
VERIFY: Task A executes first (dependency order)

PHASE 2: TASK A EXECUTION
VERIFY: CoderAgent for Task A sees initial File.ts content
VERIFY: Task A modifies File.ts (adds function X)
VERIFY: Task A completes, changes committed to worktree
VERIFY: Worktree merged to feature branch

PHASE 3: CONTEXT REFRESH
VERIFY: FreshContextManager.reset() clears stale context
VERIFY: FreshContextManager.initializeForTask(TaskB) loads fresh context
VERIFY: Fresh context includes Task A's changes
VERIFY: File.ts in context shows function X from Task A

PHASE 4: TASK B EXECUTION
VERIFY: CoderAgent for Task B sees updated File.ts (with function X)
VERIFY: Task B modifies File.ts (adds function Y)
VERIFY: Function X preserved (not overwritten)
VERIFY: Task B completes, changes committed

PHASE 5: FINAL VERIFICATION
VERIFY: File.ts contains both function X (Task A) and function Y (Task B)
VERIFY: No code lost between tasks
VERIFY: No duplicate code created
VERIFY: Tests pass for both functions

PHASE 6: MEMORY SYSTEM UPDATE
VERIFY: MemorySystem updated after each task completion
VERIFY: Embeddings regenerated for modified files
VERIFY: Subsequent context queries return fresh data

INTEGRATION_CHECK: Context refresh happens between every task
INTEGRATION_CHECK: Memory system stays synchronized with code
SILENT_FAILURE_CHECK: Task uses stale context, overwrites previous changes
SILENT_FAILURE_CHECK: Context size limit reached, critical code truncated
SILENT_FAILURE_CHECK: Memory system out of sync, returns old file content
SILENT_FAILURE_CHECK: Race condition between tasks causes data loss
```

### EVO-E2E-006: Evolution PR Creation for Complex Features
```
TEST: Evolution creates PR with proper documentation for complex features
SETUP: Complex feature requiring human review before merge to main
INPUT: "Add user profile management with avatar upload"
EXPECTED: PR created with title, description, affected files, test summary
TIME_LIMIT: 2-3 hours

PHASE 1: FEATURE EXECUTION
VERIFY: All tasks in feature complete successfully
VERIFY: All QA checks pass
VERIFY: Feature branch contains all changes

PHASE 2: PR PREPARATION
VERIFY: Feature complete triggers PR creation flow
VERIFY: GitService identifies all commits in feature branch
VERIFY: Changed files list compiled
VERIFY: Test results summary compiled

PHASE 3: PR CONTENT GENERATION
VERIFY: PR title auto-generated from feature name
VERIFY: PR body generated with:
  - Summary of changes
  - List of affected files (with change type: added/modified/deleted)
  - Task breakdown with status
  - Test results summary
  - AI confidence score
  - Potential risks/concerns identified
VERIFY: PR labels applied from project config
VERIFY: Reviewers assigned from project config

PHASE 4: PR CREATION
VERIFY: GitService creates PR via GitHub/GitLab API
VERIFY: PR visible in repository
VERIFY: Feature branch set as source
VERIFY: main set as target
VERIFY: PR status is 'open'

PHASE 5: HUMAN NOTIFICATION
VERIFY: HUMAN_REVIEW_REQUESTED event emitted
VERIFY: Notification sent to configured reviewers
VERIFY: In-app notification displayed
VERIFY: Optional email/webhook notification

INTEGRATION_CHECK: All PR metadata accurate
INTEGRATION_CHECK: PR links to feature tracking
SILENT_FAILURE_CHECK: PR created but no description
SILENT_FAILURE_CHECK: PR created to wrong branch
SILENT_FAILURE_CHECK: Notification not sent, PR orphaned
SILENT_FAILURE_CHECK: PR contains unrelated commits
```

### EVO-E2E-007: Evolution Codebase Impact Analysis
```
TEST: Evolution accurately predicts and limits impact of changes
SETUP: Large codebase with interconnected modules
INPUT: "Rename User model to Account model"
EXPECTED: All affected files identified, changes scoped correctly
TIME_LIMIT: 1-2 hours

PHASE 1: IMPACT ANALYSIS
VERIFY: MemorySystem.findUsages('User') finds all references
VERIFY: LSPClient.getReferences() confirms symbol usages
VERIFY: Affected files categorized:
  - Direct: Files defining User
  - Imports: Files importing User
  - Tests: Test files referencing User
  - Docs: Documentation mentioning User
VERIFY: Impact summary displayed to user:
  - X files will be modified
  - Y tests may need updates
  - Z documentation references found
VERIFY: User confirms scope before execution

PHASE 2: SCOPED EXECUTION
VERIFY: Tasks generated only for affected files
VERIFY: Unaffected modules not touched
VERIFY: Rename performed atomically (all or nothing)
VERIFY: Import statements updated across codebase

PHASE 3: VERIFICATION
VERIFY: No broken imports after rename
VERIFY: All tests pass after rename
VERIFY: Type checking passes
VERIFY: No orphaned references to old name

INTEGRATION_CHECK: Impact analysis matches actual changes
INTEGRATION_CHECK: No scope creep beyond predicted impact
SILENT_FAILURE_CHECK: Impact analysis misses files, broken imports
SILENT_FAILURE_CHECK: Some files renamed, others not (inconsistent state)
SILENT_FAILURE_CHECK: Tests pass but runtime errors from missed references
```

### EVO-E2E-008: Evolution Rollback on Failure
```
TEST: Evolution rolls back cleanly when feature cannot complete
SETUP: Feature that will fail (impossible requirement or persistent error)
INPUT: Feature that triggers multiple QA failures and escalation
EXPECTED: Worktree cleaned up, main branch unchanged, state restored
TIME_LIMIT: Variable

PHASE 1: TRIGGER FAILURE
VERIFY: Feature execution starts
VERIFY: Tasks begin executing
VERIFY: Persistent failure encountered (can't be fixed by QA loop)
VERIFY: Iteration count reaches 50
VERIFY: Escalation triggered

PHASE 2: HUMAN DECISION
VERIFY: Human notified of failure
VERIFY: Human chooses "Abort Feature" option
VERIFY: FEATURE_ABORT event emitted

PHASE 3: ROLLBACK EXECUTION
VERIFY: All active agents for feature stopped
VERIFY: Worktrees for feature tasks removed
VERIFY: Feature branch deleted (or kept for debugging based on config)
VERIFY: Main branch unchanged (no partial changes)
VERIFY: Database state rolled back to pre-feature state
VERIFY: TaskQueue cleared of feature's remaining tasks

PHASE 4: STATE RESTORATION
VERIFY: KanbanPage shows feature back in Backlog (or removed based on config)
VERIFY: Project state consistent
VERIFY: No orphaned resources (worktrees, branches, processes)

PHASE 5: POST-MORTEM DATA
VERIFY: Failure details logged for analysis:
  - Iteration history
  - Error messages
  - Files attempted to modify
  - QA results per iteration
VERIFY: Data available for human review
VERIFY: Learnings can be added to MemorySystem

INTEGRATION_CHECK: Rollback is atomic and complete
INTEGRATION_CHECK: No side effects on other features
SILENT_FAILURE_CHECK: Partial rollback leaves inconsistent state
SILENT_FAILURE_CHECK: Orphaned worktrees consume disk space
SILENT_FAILURE_CHECK: Main branch has partial changes from feature
```

---

**[TASK 6 COMPLETE]**

Task 6 extracted 8 Evolution Mode E2E workflow tests:
- EVO-E2E-001: Add Simple Feature to Existing Codebase - 50+ VERIFY statements
- EVO-E2E-002: Add Complex Multi-File Feature - 35 VERIFY statements
- EVO-E2E-003: Evolution Pattern Matching and Style Consistency - 30 VERIFY statements
- EVO-E2E-004: Evolution with Merge Conflicts - 30 VERIFY statements
- EVO-E2E-005: Evolution Context Freshness Between Tasks - 20 VERIFY statements
- EVO-E2E-006: Evolution PR Creation for Complex Features - 25 VERIFY statements
- EVO-E2E-007: Evolution Codebase Impact Analysis - 20 VERIFY statements
- EVO-E2E-008: Evolution Rollback on Failure - 25 VERIFY statements

Each test includes:
- SETUP: Initial conditions and codebase state
- INPUT: User request triggering Evolution mode
- EXPECTED: Expected outcome
- TIME_LIMIT: Estimated duration
- Phase-by-phase VERIFY statements
- INTEGRATION_CHECK statements
- SILENT_FAILURE_CHECK statements

Total tests added: ~80 new workflow tests

---

## SECTION 7: PHASE 13 CONTEXT ENHANCEMENT TESTS

### P13-001: RepoMapGenerator
```
TEST: RepoMapGenerator creates compressed codebase representation
LOCATION: src/infrastructure/analysis/RepoMapGenerator.ts
METHODS: generate(), generateIncremental(), findSymbol(), findUsages(), formatForContext(), getTokenCount()

VERIFY: generate() scans codebase and returns RepoMap
VERIFY: generate() uses tree-sitter for TypeScript/JavaScript parsing
VERIFY: generate() extracts functions, classes, interfaces, types
VERIFY: generate() outputs compressed representation with signatures
VERIFY: generate() includes file structure and symbol count
VERIFY: generate() excludes implementation details
VERIFY: generate() respects includePatterns and excludePatterns
VERIFY: generate() handles maxFiles limit
VERIFY: generateIncremental() only processes changed files
VERIFY: generateIncremental() merges with existing RepoMap
VERIFY: findSymbol() returns SymbolEntry[] for symbol name
VERIFY: findUsages() returns Usage[] with file, line, context, usageType
VERIFY: findImplementations() returns implementations of interface
VERIFY: getDependencies() returns import dependencies for file
VERIFY: getDependents() returns files that import given file
VERIFY: formatForContext() produces text within maxTokens budget
VERIFY: formatForContext() prioritizes by reference count when rankByReferences=true
VERIFY: formatForContext() groups by file when groupByFile=true
VERIFY: getTokenCount() returns accurate token estimate
VERIFY: Output size < 10% of codebase size

INTEGRATION_CHECK: RepoMap used by agents for context building
INTEGRATION_CHECK: RepoMap integrated with FreshContextManager
INTEGRATION_CHECK: RepoMap persisted in RepoMapStore
SILENT_FAILURE_CHECK: tree-sitter fails on syntax error, empty map generated
SILENT_FAILURE_CHECK: Large files skipped without warning
SILENT_FAILURE_CHECK: Binary files cause crash or corruption
SILENT_FAILURE_CHECK: Incremental update misses changed file
SILENT_FAILURE_CHECK: Symbol references miscounted
```

### P13-002: CodebaseAnalyzer
```
TEST: CodebaseAnalyzer generates comprehensive documentation
LOCATION: src/infrastructure/analysis/CodebaseAnalyzer.ts
METHODS: analyze(), generateArchitecture(), generatePatterns(), generateDependencies(), generateAPISurface(), generateDataFlow(), generateTestStrategy(), generateKnownIssues(), saveDocs(), loadDocs(), updateDocs()

VERIFY: analyze() generates all 7 document types
VERIFY: generateArchitecture() produces ARCHITECTURE.md with:
  - Directory structure analysis
  - Layer patterns identification
  - Entry points documentation
  - Key components description
VERIFY: generatePatterns() produces PATTERNS.md with:
  - Naming conventions (camelCase, snake_case, etc.)
  - Error handling patterns
  - Component patterns
  - State management approach
  - Async patterns
VERIFY: generateDependencies() produces DEPENDENCIES.md with:
  - Runtime dependencies from package.json
  - Dev dependencies
  - Peer dependencies
  - Version constraints
  - Security notes
VERIFY: generateAPISurface() produces API_SURFACE.md with:
  - Exported functions with signatures
  - Exported classes with methods
  - Exported types and interfaces
  - Public API endpoints
VERIFY: generateDataFlow() produces DATA_FLOW.md with:
  - State management description
  - Data transformation flows
  - API integrations
  - Event flows
VERIFY: generateTestStrategy() produces TEST_STRATEGY.md with:
  - Test framework used
  - Test structure conventions
  - Coverage targets
  - Mocking strategy
  - E2E approach
VERIFY: generateKnownIssues() produces KNOWN_ISSUES.md with:
  - TODO/FIXME/HACK comments extracted
  - Complexity hotspots (cyclomatic complexity)
  - Tech debt items
  - Workarounds documented
VERIFY: saveDocs() persists all docs to .nexus/codebase/
VERIFY: loadDocs() restores docs from disk
VERIFY: updateDocs() performs incremental update based on changed files
VERIFY: useParallelAnalysis option runs generators concurrently

INTEGRATION_CHECK: Docs available to agents via DynamicContextProvider
INTEGRATION_CHECK: Docs stored in CodebaseDocsStore
INTEGRATION_CHECK: Docs refreshed when codebase changes detected
SILENT_FAILURE_CHECK: Analysis incomplete, partial docs saved as complete
SILENT_FAILURE_CHECK: Docs outdated after code changes
SILENT_FAILURE_CHECK: LLM call fails, generic placeholder doc saved
SILENT_FAILURE_CHECK: forceRegenerate=false skips stale docs
```

### P13-003: Code Embeddings / MemorySystem Extension
```
TEST: MemorySystem extended with semantic code search
LOCATION: src/persistence/memory/MemorySystem.ts (extended), src/persistence/memory/CodeMemory.ts
METHODS: indexFile(), indexProject(), updateFile(), removeFile(), searchCode(), findSimilarCode(), findUsages(), findDefinition(), getChunksForFile()

VERIFY: indexFile() chunks code by function/class boundaries
VERIFY: indexFile() generates embedding for each chunk
VERIFY: indexFile() stores chunks in code_chunks table
VERIFY: indexProject() indexes all relevant files in project
VERIFY: indexProject() respects include/exclude patterns
VERIFY: updateFile() updates chunks when file changes
VERIFY: removeFile() removes all chunks for deleted file
VERIFY: searchCode() performs semantic similarity search
VERIFY: searchCode() returns CodeSearchResult[] with score
VERIFY: searchCode() respects threshold option (default 0.7)
VERIFY: searchCode() respects limit option (default 10)
VERIFY: searchCode() supports projectId filter
VERIFY: searchCode() supports filePattern filter
VERIFY: findSimilarCode() finds semantically similar code snippets
VERIFY: findUsages() returns all usages of symbol with context
VERIFY: findDefinition() returns symbol definition with signature and docs
VERIFY: getChunksForFile() returns all chunks for a file
VERIFY: Embeddings persisted to SQLite with vector similarity search
VERIFY: Incremental indexing updates only changed files

INTEGRATION_CHECK: MemorySystem.getRelevantContext() includes code search results
INTEGRATION_CHECK: CodeMemory used by DynamicContextProvider for search requests
INTEGRATION_CHECK: Schema includes code_chunks table with proper indexes
SILENT_FAILURE_CHECK: Embedding API fails, empty results returned instead of error
SILENT_FAILURE_CHECK: Stale embeddings after code change (index not updated)
SILENT_FAILURE_CHECK: Dimension mismatch corrupts search results
SILENT_FAILURE_CHECK: Chunking fails on complex syntax, file skipped
SILENT_FAILURE_CHECK: Query returns 0 results when matches exist (threshold too high)
```

### P13-004: FreshContextManager
```
TEST: FreshContextManager ensures clean context per task
LOCATION: src/orchestration/context/FreshContextManager.ts
METHODS: buildFreshContext(), clearAgentContext(), clearTaskContext(), validateContextSize(), estimateTokenCount()

VERIFY: buildFreshContext() returns complete TaskContext with:
  - repoMap: Compressed repository structure
  - codebaseDocs: Relevant architectural info
  - projectConfig: Project settings
  - taskSpec: Full task specification
  - relevantFiles: Task-specific file contents
  - relevantMemories: Relevant memory entries
  - conversationHistory: ALWAYS EMPTY (no accumulated history)
  - tokenCount: Accurate count
  - generatedAt: Timestamp
VERIFY: clearAgentContext() removes all context for agent ID
VERIFY: clearTaskContext() removes all context for task ID
VERIFY: validateContextSize() returns ContextValidation with:
  - valid: boolean indicating within budget
  - tokenCount: actual count
  - maxTokens: configured maximum
  - warnings: list of issues
  - suggestions: optimization hints
VERIFY: estimateTokenCount() returns accurate token count

TOKEN_BUDGET_VERIFICATION:
  - System Prompt: ~2,000 tokens (fixed)
  - Repo Map: ~2,000 tokens (configurable)
  - Codebase Docs: ~3,000 tokens (fixed)
  - Task Spec: ~1,000 tokens (fixed)
  - Reserved Response: ~16,000 tokens (fixed)
  - Task Files: 60% of remaining (~75,000 tokens)
  - Related Files: 25% of remaining (~31,500 tokens)
  - Memories: 15% of remaining (~19,000 tokens)

VERIFY: Token budget allocation follows priority order
VERIFY: Lower-priority content truncated when over budget
VERIFY: Critical content (task files) never truncated silently

INTEGRATION_CHECK: Called by AgentPool before task assignment
INTEGRATION_CHECK: Context cleared after task completion or failure
INTEGRATION_CHECK: No context pollution between sequential tasks
SILENT_FAILURE_CHECK: Reset fails silently, stale context persists
SILENT_FAILURE_CHECK: Context pollution between tasks (Task B sees Task A history)
SILENT_FAILURE_CHECK: Context exceeds limit, truncated without warning
SILENT_FAILURE_CHECK: relevantFiles empty despite task requiring files
SILENT_FAILURE_CHECK: conversationHistory not empty (accumulation bug)
```

### P13-005: DynamicContextProvider
```
TEST: DynamicContextProvider allows agent mid-task context requests
LOCATION: src/orchestration/context/DynamicContextProvider.ts
METHODS: registerAgent(), unregisterAgent(), requestFile(), requestSymbol(), requestSearch(), requestUsages(), requestFiles(), requestContext(), getRemainingBudget(), getUsedTokens()

VERIFY: registerAgent() tracks agent and associates with task
VERIFY: unregisterAgent() removes agent tracking
VERIFY: requestFile() loads file content from project
VERIFY: requestFile() respects token budget
VERIFY: requestFile() returns null for non-existent file
VERIFY: requestFile() tracks file in used context
VERIFY: requestSymbol() uses RepoMap to find symbol
VERIFY: requestSymbol() returns SymbolContext with definition, signature, docs, usages
VERIFY: requestSymbol() handles ambiguous names (multiple matches)
VERIFY: requestSearch() uses CodeMemory for semantic search
VERIFY: requestSearch() returns ranked SearchResults with scores
VERIFY: requestSearch() respects result limit
VERIFY: requestUsages() returns UsageContext[] with surrounding code
VERIFY: requestFiles() batch loads multiple files efficiently
VERIFY: requestContext() handles all request types via single interface
VERIFY: getRemainingBudget() returns accurate remaining tokens
VERIFY: getUsedTokens() returns accurate used tokens

AGENT_TOOL_INTEGRATION:
VERIFY: request_context tool available to coder/tester agents
VERIFY: Tool calls routed correctly to DynamicContextProvider
VERIFY: Results formatted appropriately for agent consumption
VERIFY: Tool usage tracked in metrics

INTEGRATION_CHECK: Handlers use RepoMapGenerator and CodeMemory
INTEGRATION_CHECK: Budget enforcement prevents excessive requests
INTEGRATION_CHECK: All requests logged for debugging and analysis
SILENT_FAILURE_CHECK: Request fails silently, agent continues without context
SILENT_FAILURE_CHECK: Budget exceeded without warning to agent
SILENT_FAILURE_CHECK: Circular request loop (infinite context fetching)
SILENT_FAILURE_CHECK: File loaded but content corrupted
SILENT_FAILURE_CHECK: Symbol search returns wrong symbol (name collision)
```

### P13-006: RalphStyleIterator
```
TEST: RalphStyleIterator implements persistent git-based iteration
LOCATION: src/execution/iteration/RalphStyleIterator.ts
METHODS: execute(), pause(), resume(), abort(), getStatus(), getHistory()

VERIFY: execute() runs iteration loop with IterationOptions:
  - maxIterations: respects limit (default 20)
  - commitEachIteration: commits after each iteration (default true)
  - includeGitDiff: includes diff in context (default true)
  - includePreviousErrors: includes errors in context (default true)
  - escalateAfter: triggers escalation at threshold
VERIFY: execute() returns IterationResult with:
  - success: boolean indicating pass/fail
  - iterations: count of iterations executed
  - finalState: 'passed' | 'failed' | 'escalated' | 'aborted'
  - history: complete IterationHistory[]
  - totalDuration: total time
  - totalTokens: total tokens used

ITERATION_FLOW_VERIFICATION:
VERIFY: Step 1 - Build fresh context (includes task spec, relevant files, repo map)
VERIFY: Step 1 - If N > 1, includes previous diff and errors
VERIFY: Step 2 - Agent executes and writes/modifies code
VERIFY: Step 3 - Iteration work committed with message "iteration-N: {summary}"
VERIFY: Step 4 - QA sequence runs: Build -> Lint -> Test -> Review
VERIFY: Step 5 - If ALL PASS: SUCCESS, merge to main
VERIFY: Step 5 - If FAIL and N < maxIter: increment N, loop back
VERIFY: Step 5 - If N >= maxIter: ESCALATE

VERIFY: pause() pauses iteration at next safe point
VERIFY: resume() continues from paused state
VERIFY: abort() terminates immediately
VERIFY: getStatus() returns current IterationStatus:
  - taskId, currentIteration, maxIterations
  - state: 'running' | 'paused' | 'completed' | 'failed'
  - lastActivity, currentPhase
VERIFY: getHistory() returns complete IterationHistory

INTEGRATION_CHECK: Uses FreshContextManager for context per iteration
INTEGRATION_CHECK: Git diff injected via GitDiffContextBuilder
INTEGRATION_CHECK: Errors aggregated via ErrorContextAggregator
INTEGRATION_CHECK: Commits handled via IterationCommitHandler
INTEGRATION_CHECK: QALoopEngine can use Ralph mode
SILENT_FAILURE_CHECK: Git diff empty when changes exist
SILENT_FAILURE_CHECK: State not persisted, progress lost on crash
SILENT_FAILURE_CHECK: Iteration count resets (runs forever)
SILENT_FAILURE_CHECK: Commit fails silently, changes lost
SILENT_FAILURE_CHECK: QA step skipped but iteration counted
SILENT_FAILURE_CHECK: Escalation triggered but handler not called
```

### P13-007: DynamicReplanner
```
TEST: DynamicReplanner detects complexity and re-decomposes tasks
LOCATION: src/orchestration/planning/DynamicReplanner.ts
METHODS: startMonitoring(), stopMonitoring(), checkReplanningNeeded(), replan(), setTriggerThresholds()

VERIFY: startMonitoring() begins tracking task execution
VERIFY: stopMonitoring() stops tracking task
VERIFY: checkReplanningNeeded() evaluates all triggers:
  - time_exceeded: Task taking > 1.5x estimate
  - iterations_high: Iterations > 40% of max
  - scope_creep: Files modified > expected + 3
  - complexity_discovered: Agent reports complexity
  - dependency_discovered: New dependencies found
  - blocking_issue: Fundamental blocker detected
  - agent_request: Agent explicitly requests replan
VERIFY: checkReplanningNeeded() returns ReplanDecision with:
  - shouldReplan: boolean
  - reason: ReplanReason if applicable
  - confidence: 0.0-1.0
  - suggestedAction: 'continue' | 'split' | 'escalate' | 'abort'
VERIFY: replan() performs re-decomposition
VERIFY: replan() returns ReplanResult with:
  - success: boolean
  - action: 'split' | 'rescoped' | 'escalated' | 'continued'
  - originalTask: the oversized task
  - newTasks: split subtasks if applicable
  - message: explanation
VERIFY: setTriggerThresholds() configures trigger sensitivity

TRIGGER_EVALUATION_VERIFICATION:
VERIFY: TimeExceededTrigger fires when elapsed > estimate * 1.5
VERIFY: IterationsTrigger fires when iteration > maxIterations * 0.4
VERIFY: ScopeCreepTrigger fires when filesModified > filesExpected + 3
VERIFY: All triggers respect configured thresholds

TASK_SPLITTING_VERIFICATION:
VERIFY: TaskSplitter creates valid subtasks from oversized task
VERIFY: Subtasks preserve original dependencies
VERIFY: Subtasks added to TaskQueue in correct order
VERIFY: Partial completion preserved (completed work not lost)

AGENT_TOOL_INTEGRATION:
VERIFY: request_replan tool available to agents
VERIFY: Tool accepts reason, suggestion, blockers
VERIFY: Agent requests routed to DynamicReplanner

INTEGRATION_CHECK: NexusCoordinator calls replanner during execution
INTEGRATION_CHECK: TaskQueue updated with new tasks from split
INTEGRATION_CHECK: Replanning events emitted for tracking
SILENT_FAILURE_CHECK: Complexity not detected, task runs forever
SILENT_FAILURE_CHECK: Replan creates invalid/circular dependencies
SILENT_FAILURE_CHECK: Subtasks not added to queue
SILENT_FAILURE_CHECK: Partial completion lost during split
SILENT_FAILURE_CHECK: Trigger fires repeatedly (replan loop)
```

### P13-008: SelfAssessmentEngine
```
TEST: SelfAssessmentEngine evaluates agent progress and identifies blockers
LOCATION: src/orchestration/assessment/SelfAssessmentEngine.ts
METHODS: assessProgress(), assessBlockers(), assessApproach(), recommendNextStep(), recommendAlternativeApproach(), recordOutcome(), getHistoricalInsights()

VERIFY: assessProgress() returns ProgressAssessment with:
  - taskId: task being assessed
  - completionEstimate: 0.0-1.0
  - confidence: 0.0-1.0
  - remainingWork: string[] of outstanding items
  - blockers: string[] of current blockers
  - risks: Risk[] with type, description, probability, impact
VERIFY: assessBlockers() returns BlockerAssessment with:
  - blockers: Blocker[] with type, description, affectedFiles, possibleSolutions
  - severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  - canProceed: boolean
  - suggestedActions: string[]
VERIFY: assessBlockers() detects blocker types:
  - technical: Code/implementation issues
  - dependency: Missing or incompatible dependencies
  - unclear_requirement: Ambiguous task definition
  - external: External service/API issues
  - knowledge_gap: Agent lacks required knowledge
VERIFY: assessApproach() returns ApproachAssessment with:
  - currentApproach: description of current strategy
  - effectiveness: 'working' | 'struggling' | 'stuck' | 'wrong_direction'
  - confidence: 0.0-1.0
  - alternatives: AlternativeApproach[] with pros/cons
  - recommendation: suggested action
VERIFY: recommendNextStep() returns Recommendation with:
  - action: 'continue' | 'try_alternative' | 'request_help' | 'split_task' | 'abort'
  - reason: explanation
  - details: specific guidance
  - confidence: 0.0-1.0
VERIFY: recommendAlternativeApproach() returns AlternativeApproach[] with:
  - description, pros, cons, estimatedEffort, confidence

LEARNING_VERIFICATION:
VERIFY: recordOutcome() saves task outcome with:
  - success, approach, iterations, blockers, lessonsLearned
VERIFY: getHistoricalInsights() returns HistoricalInsight[] with:
  - pattern: type of task
  - successRate: historical success rate
  - averageIterations: typical iteration count
  - commonBlockers: frequently encountered blockers
  - recommendedApproach: historically successful approach

INTEGRATION_CHECK: Assessments used by DynamicReplanner
INTEGRATION_CHECK: Called periodically by NexusCoordinator
INTEGRATION_CHECK: Outcomes stored in MemorySystem for learning
SILENT_FAILURE_CHECK: Assessment always returns "good" (false positive)
SILENT_FAILURE_CHECK: Blocker identified but not acted upon
SILENT_FAILURE_CHECK: Historical data not retrieved (always cold start)
SILENT_FAILURE_CHECK: Confidence always 1.0 (overconfident)
SILENT_FAILURE_CHECK: Recommendation action not executed
```

---

**[TASK 7 COMPLETE]**

Task 7 extracted all 8 Phase 13 Context Enhancement features:
- P13-001: RepoMapGenerator - 30+ VERIFY statements
- P13-002: CodebaseAnalyzer - 35+ VERIFY statements
- P13-003: Code Embeddings / MemorySystem Extension - 30+ VERIFY statements
- P13-004: FreshContextManager - 25+ VERIFY statements
- P13-005: DynamicContextProvider - 25+ VERIFY statements
- P13-006: RalphStyleIterator - 30+ VERIFY statements
- P13-007: DynamicReplanner - 30+ VERIFY statements
- P13-008: SelfAssessmentEngine - 30+ VERIFY statements

Each feature includes:
- LOCATION: Source file path
- METHODS: Key methods to test
- VERIFY: Specific behavior verifications
- INTEGRATION_CHECK: Integration points
- SILENT_FAILURE_CHECK: Potential silent failure modes

Total tests added: ~70 new Phase 13 tests

---

## SECTION 8: PHASE 14B EXECUTION BINDINGS TESTS

### QA RUNNERS

#### P14B-QA-001: BuildRunner
```
TEST: BuildRunner spawns real tsc process
LOCATION: src/execution/qa/BuildRunner.ts
METHODS: run(), createCallback(), parseErrors()

VERIFY: run() spawns 'npx tsc --noEmit' process
VERIFY: run() uses ProcessRunner for command execution
VERIFY: run() respects timeout (default 60s)
VERIFY: run() handles spawn errors gracefully
VERIFY: parseErrors() extracts file, line, column, code, message from tsc output
VERIFY: parseErrors() returns ErrorEntry[] with type='build'
VERIFY: Returns BuildResult with:
  - success: boolean (true if no errors)
  - errors: ErrorEntry[] (parsed errors)
  - warnings: ErrorEntry[] (parsed warnings)
  - duration: number (ms)
VERIFY: createCallback() returns QARunner.build compatible function
VERIFY: createCallback() captures workingDir via closure

REAL_EXECUTION_TEST: Create TypeScript file with error, verify detection
REAL_EXECUTION_TEST: Create clean TypeScript file, verify success
REAL_EXECUTION_TEST: Test timeout handling with hanging process

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.build
INTEGRATION_CHECK: Uses ProcessRunner for command execution
INTEGRATION_CHECK: ErrorEntry has iteration field set correctly
SILENT_FAILURE_CHECK: tsc returns non-zero but errors array empty
SILENT_FAILURE_CHECK: Wrong tsconfig.json used (not project root)
SILENT_FAILURE_CHECK: Timeout reached but partial result returned as success
SILENT_FAILURE_CHECK: tsc not found in PATH, fails silently
SILENT_FAILURE_CHECK: Working directory incorrect, wrong files analyzed
```

#### P14B-QA-002: LintRunner
```
TEST: LintRunner spawns real eslint process
LOCATION: src/execution/qa/LintRunner.ts
METHODS: run(), runWithFix(), createCallback(), parseJsonOutput()

VERIFY: run() spawns 'npx eslint --format json' process
VERIFY: run() targets correct files/directories
VERIFY: run() uses ProcessRunner for command execution
VERIFY: runWithFix() passes --fix flag for auto-fixing
VERIFY: parseJsonOutput() extracts errors and warnings separately
VERIFY: parseJsonOutput() handles ESLint JSON format correctly
VERIFY: Returns LintResult with:
  - success: boolean (true if no errors)
  - errors: ErrorEntry[] (type='lint', severity='error')
  - warnings: ErrorEntry[] (type='lint', severity='warning')
  - fixable: number (count of auto-fixable issues)
VERIFY: createCallback() returns QARunner.lint compatible function
VERIFY: createCallback() captures workingDir via closure

REAL_EXECUTION_TEST: Create file with lint errors, verify detection
REAL_EXECUTION_TEST: Test auto-fix with fixable errors
REAL_EXECUTION_TEST: Test with no lint config (should handle gracefully)

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.lint
INTEGRATION_CHECK: Uses ProcessRunner for command execution
SILENT_FAILURE_CHECK: ESLint config missing, runs with defaults silently
SILENT_FAILURE_CHECK: --fix fails silently (no write permissions)
SILENT_FAILURE_CHECK: Warnings treated as success when they shouldn't be
SILENT_FAILURE_CHECK: JSON parsing fails, empty result returned
SILENT_FAILURE_CHECK: eslint not found in PATH, fails silently
SILENT_FAILURE_CHECK: Ignore patterns incorrectly configured
```

#### P14B-QA-003: TestRunner
```
TEST: TestRunner spawns real vitest process
LOCATION: src/execution/qa/TestRunner.ts
METHODS: run(), runFiles(), runWithCoverage(), createCallback(), parseOutput()

VERIFY: run() spawns 'npx vitest run --reporter=json' process
VERIFY: run() uses ProcessRunner for command execution
VERIFY: runFiles() runs specific test files only
VERIFY: runWithCoverage() includes --coverage flag
VERIFY: parseOutput() extracts passed, failed, skipped counts
VERIFY: parseOutput() captures test failure details:
  - testName, file, error message, expected vs actual
VERIFY: Returns TestResult with:
  - success: boolean (true if all pass)
  - passed: number
  - failed: number
  - skipped: number
  - errors: ErrorEntry[] (type='test')
  - duration: number (ms)
VERIFY: createCallback() returns QARunner.test compatible function
VERIFY: createCallback() captures workingDir via closure

REAL_EXECUTION_TEST: Create failing test, verify detection
REAL_EXECUTION_TEST: Create passing tests, verify success
REAL_EXECUTION_TEST: Test coverage threshold detection

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.test
INTEGRATION_CHECK: Uses ProcessRunner for command execution
SILENT_FAILURE_CHECK: Tests skip but reported as pass (skipped > 0, failed = 0)
SILENT_FAILURE_CHECK: Coverage below threshold but not flagged
SILENT_FAILURE_CHECK: Test timeout not enforced, hangs indefinitely
SILENT_FAILURE_CHECK: Test file not found, returns success
SILENT_FAILURE_CHECK: vitest not found in PATH, fails silently
SILENT_FAILURE_CHECK: watch mode accidentally enabled
```

#### P14B-QA-004: ReviewRunner
```
TEST: ReviewRunner calls Gemini API for code review
LOCATION: src/execution/qa/ReviewRunner.ts
METHODS: run(), createCallback(), parseReviewResponse(), buildReviewPrompt()

VERIFY: run() calls GeminiClient with review prompt
VERIFY: buildReviewPrompt() includes git diff
VERIFY: buildReviewPrompt() includes task context
VERIFY: buildReviewPrompt() respects token limits
VERIFY: parseReviewResponse() extracts approval status (boolean)
VERIFY: parseReviewResponse() extracts comments, suggestions, blockers
VERIFY: Returns ReviewResult with:
  - approved: boolean
  - comments: string[]
  - suggestions: string[]
  - blockers: string[]
VERIFY: createCallback() returns QARunner.review compatible function
VERIFY: createCallback() captures GeminiClient and GitService via closure
VERIFY: Handles API timeout gracefully (default 60s)

REAL_EXECUTION_TEST: Submit code change, verify review response structure
REAL_EXECUTION_TEST: Test with empty diff (should handle gracefully)
REAL_EXECUTION_TEST: Test with very large diff (truncation handling)

INTEGRATION_CHECK: Uses GeminiClient for AI review
INTEGRATION_CHECK: Uses GitService for diff generation
INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.review
SILENT_FAILURE_CHECK: Gemini API fails, returns approved=true anyway
SILENT_FAILURE_CHECK: Prompt too long, truncated without warning
SILENT_FAILURE_CHECK: JSON parse fails, default approval returned
SILENT_FAILURE_CHECK: Empty diff returns false positive approval
SILENT_FAILURE_CHECK: Rate limiting causes silent retry loop
SILENT_FAILURE_CHECK: Blockers identified but approval=true
```

#### P14B-QA-005: QARunnerFactory
```
TEST: QARunnerFactory creates complete QARunner object
LOCATION: src/execution/qa/QARunnerFactory.ts
METHODS: create(), createMock(), createPartial()

VERIFY: create() returns object implementing QARunner interface:
  - build: (taskId: string) => Promise<BuildResult>
  - lint: (taskId: string) => Promise<LintResult>
  - test: (taskId: string) => Promise<TestResult>
  - review: (taskId: string) => Promise<ReviewResult>
VERIFY: Each method is callable with taskId parameter
VERIFY: Working directory correctly passed to each runner
VERIFY: GeminiClient and GitService passed to ReviewRunner
VERIFY: createMock() returns mock implementation for testing
VERIFY: createPartial() returns QARunner with only specified runners
VERIFY: Factory validates dependencies before creation

FACTORY_TEST: Create QARunner and execute each method
FACTORY_TEST: Create mock and verify mock behavior
FACTORY_TEST: Create partial with only build+test

INTEGRATION_CHECK: Returned QARunner works with RalphStyleIterator
INTEGRATION_CHECK: All dependencies injected correctly
SILENT_FAILURE_CHECK: One runner fails to create, others missing
SILENT_FAILURE_CHECK: Working directory not validated
SILENT_FAILURE_CHECK: Dependencies null but no error thrown
```

### PLANNING

#### P14B-PLN-001: TaskDecomposer
```
TEST: TaskDecomposer calls Claude for task decomposition
LOCATION: src/planning/decomposition/TaskDecomposer.ts
METHODS: decompose(), validateTaskSize(), splitTask(), estimateTime()
INTERFACE: ITaskDecomposer

VERIFY: Implements ITaskDecomposer interface
VERIFY: decompose() accepts featureDescription string
VERIFY: decompose() accepts DecompositionOptions:
  - maxTaskMinutes?: number (default 30)
  - generateTestCriteria?: boolean
  - contextFiles?: string[]
  - useTDD?: boolean
VERIFY: decompose() calls ClaudeClient with decomposition prompt
VERIFY: decompose() parses JSON response into PlanningTask[]
VERIFY: Each PlanningTask has:
  - id, name, description, type, size
  - estimatedMinutes (<= 30)
  - dependsOn: string[]
  - testCriteria: string[]
  - files: string[]
VERIFY: validateTaskSize() returns TaskValidationResult:
  - valid: boolean
  - errors: string[]
  - warnings: string[]
VERIFY: validateTaskSize() rejects tasks > maxTaskMinutes
VERIFY: splitTask() divides large tasks into subtasks
VERIFY: splitTask() maintains dependency integrity
VERIFY: estimateTime() returns minutes estimate

REAL_EXECUTION_TEST: Decompose "build login page", verify task structure
REAL_EXECUTION_TEST: Decompose complex feature, verify 30-min limit
REAL_EXECUTION_TEST: Test invalid Claude response handling

INTEGRATION_CHECK: Works with NexusCoordinator.decomposer
INTEGRATION_CHECK: Uses ClaudeClient for LLM calls
SILENT_FAILURE_CHECK: Claude returns malformed JSON, partial tasks created
SILENT_FAILURE_CHECK: 45-minute task accepted without split
SILENT_FAILURE_CHECK: Split creates circular dependencies
SILENT_FAILURE_CHECK: Empty response treated as success
SILENT_FAILURE_CHECK: estimatedMinutes always 30 (no real estimation)
```

#### P14B-PLN-002: DependencyResolver
```
TEST: DependencyResolver implements topological sort
LOCATION: src/planning/dependency/DependencyResolver.ts
METHODS: calculateWaves(), topologicalSort(), hasCircularDependency(), detectCycles(), getAllDependencies()
INTERFACE: IDependencyResolver

VERIFY: Implements IDependencyResolver interface
VERIFY: calculateWaves() returns Wave[] with:
  - id: number (wave number)
  - tasks: PlanningTask[] (tasks in wave)
  - estimatedMinutes: number (total time)
VERIFY: calculateWaves() groups parallelizable tasks
VERIFY: calculateWaves() respects dependsOn constraints
VERIFY: topologicalSort() returns tasks in execution order
VERIFY: hasCircularDependency() returns boolean
VERIFY: detectCycles() returns { taskIds: string[] }[] for each cycle
VERIFY: getAllDependencies() returns transitive dependencies
VERIFY: Empty task list handled gracefully (returns empty waves)
VERIFY: Single task handled correctly (single wave)

ALGORITHM_TEST: Linear dependency chain (A→B→C→D)
ALGORITHM_TEST: Diamond dependency (A→B,C→D where B,C both depend on A and D depends on both)
ALGORITHM_TEST: Multiple independent chains
ALGORITHM_TEST: Circular dependency detection (A→B→C→A)

INTEGRATION_CHECK: Works with NexusCoordinator.resolver
INTEGRATION_CHECK: detectCycles() format matches NexusCoordinator expectations
SILENT_FAILURE_CHECK: Cycle not detected, execution deadlocks
SILENT_FAILURE_CHECK: Parallel tasks serialized unnecessarily
SILENT_FAILURE_CHECK: Transitive dependencies missed
SILENT_FAILURE_CHECK: Self-dependency not detected
```

#### P14B-PLN-003: TimeEstimator
```
TEST: TimeEstimator calculates task duration
LOCATION: src/planning/estimation/TimeEstimator.ts
METHODS: estimate(), estimateTotal(), calibrate()
INTERFACE: ITimeEstimator

VERIFY: Implements ITimeEstimator interface
VERIFY: estimate() returns Promise<number> (minutes)
VERIFY: estimate() uses heuristics:
  - Task complexity
  - File count
  - Historical data
VERIFY: estimateTotal() returns total time for task set
VERIFY: estimateTotal() considers parallelism
VERIFY: calibrate() records actual vs estimated
VERIFY: calibrate() adjusts future estimates based on history
VERIFY: Minimum estimate is 5 minutes
VERIFY: Maximum estimate is 30 minutes (ADR-007)

ACCURACY_TEST: Estimate simple task (< 10 min)
ACCURACY_TEST: Estimate complex task (20-30 min)
ACCURACY_TEST: Test calibration improves estimates over time

INTEGRATION_CHECK: Works with NexusCoordinator.estimator
INTEGRATION_CHECK: Calibration data persisted
SILENT_FAILURE_CHECK: Estimation always returns 30 (max)
SILENT_FAILURE_CHECK: Historical data not loaded
SILENT_FAILURE_CHECK: Calibration not persisted
SILENT_FAILURE_CHECK: Parallel time not considered in total
```

### AGENTS

#### P14B-AGT-001: BaseAgentRunner
```
TEST: BaseAgentRunner implements agent loop base class
LOCATION: src/execution/agents/BaseAgentRunner.ts
METHODS: runAgentLoop(), handleResponse(), detectCompletion(), emitEvent()

VERIFY: BaseAgentRunner is abstract class (cannot instantiate)
VERIFY: runAgentLoop() iterates until completion or limit
VERIFY: runAgentLoop() respects iteration limit (50)
VERIFY: runAgentLoop() handles LLM responses
VERIFY: detectCompletion() finds [TASK_COMPLETE] marker
VERIFY: Emits events via EventBus:
  - AGENT_STARTED
  - AGENT_ITERATION
  - AGENT_COMPLETED
  - AGENT_ERROR
VERIFY: Handles API errors gracefully
VERIFY: Logs each iteration for debugging

ABSTRACT_CHECK: Cannot instantiate BaseAgentRunner directly
ABSTRACT_CHECK: Subclasses must implement getSystemPrompt()
ABSTRACT_CHECK: Subclasses must implement processResponse()

INTEGRATION_CHECK: Uses ClaudeClient or GeminiClient for LLM
INTEGRATION_CHECK: Uses ToolExecutor for tool calls
INTEGRATION_CHECK: Emits events to EventBus
SILENT_FAILURE_CHECK: Iteration limit bypassed
SILENT_FAILURE_CHECK: Events not emitted
SILENT_FAILURE_CHECK: [TASK_COMPLETE] marker in middle of response
SILENT_FAILURE_CHECK: API error causes silent exit
```

#### P14B-AGT-002: CoderAgent
```
TEST: CoderAgent generates code for tasks
LOCATION: src/execution/agents/CoderAgent.ts
METHODS: execute(), generateCode(), writeFile(), getSystemPrompt()
EXTENDS: BaseAgentRunner

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for code generation
VERIFY: getSystemPrompt() returns coding-focused prompt
VERIFY: execute() returns TaskResult with:
  - taskId, success, files[], metrics
VERIFY: Detects [TASK_COMPLETE] marker in response
VERIFY: Writes generated code to correct files
VERIFY: Handles file creation and modification
VERIFY: Tracks tokens used and time spent

REAL_EXECUTION_TEST: Generate simple function, verify code
REAL_EXECUTION_TEST: Modify existing file, verify changes
REAL_EXECUTION_TEST: Test iteration limit (should not loop forever)

INTEGRATION_CHECK: Uses ToolExecutor for file operations
INTEGRATION_CHECK: Works within WorktreeManager isolation
INTEGRATION_CHECK: Returns TaskResult compatible with QA loop
SILENT_FAILURE_CHECK: Code generated but not written to file
SILENT_FAILURE_CHECK: Infinite loop without completion marker
SILENT_FAILURE_CHECK: Wrong file modified
SILENT_FAILURE_CHECK: Partial code written on error
SILENT_FAILURE_CHECK: Token count not tracked
```

#### P14B-AGT-003: TesterAgent
```
TEST: TesterAgent writes tests for code
LOCATION: src/execution/agents/TesterAgent.ts
METHODS: execute(), writeTests(), analyzeCode(), getSystemPrompt()
EXTENDS: BaseAgentRunner

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for test generation
VERIFY: getSystemPrompt() returns testing-focused prompt
VERIFY: execute() returns TaskResult with files
VERIFY: Generates tests that match target code
VERIFY: Places test files in correct location
VERIFY: Uses appropriate test framework (Vitest)
VERIFY: Includes edge cases and error handling tests

REAL_EXECUTION_TEST: Generate tests for simple function
REAL_EXECUTION_TEST: Test coverage of target code

INTEGRATION_CHECK: Uses TestRunner to validate generated tests
INTEGRATION_CHECK: Works within WorktreeManager isolation
SILENT_FAILURE_CHECK: Tests generated but don't actually test anything
SILENT_FAILURE_CHECK: Tests pass but don't cover target code
SILENT_FAILURE_CHECK: Test file created in wrong location
SILENT_FAILURE_CHECK: Import paths incorrect
```

#### P14B-AGT-004: ReviewerAgent
```
TEST: ReviewerAgent reviews code changes
LOCATION: src/execution/agents/ReviewerAgent.ts
METHODS: execute(), reviewChanges(), formatFeedback(), getSystemPrompt()
EXTENDS: BaseAgentRunner

VERIFY: Extends BaseAgentRunner
VERIFY: Uses GeminiClient for code review
VERIFY: getSystemPrompt() returns review-focused prompt
VERIFY: execute() returns TaskResult with review outcome
VERIFY: Reviews git diff for changes
VERIFY: Returns approval status and issue list
VERIFY: Formats feedback for CoderAgent consumption

REAL_EXECUTION_TEST: Review code change, verify issues identified
REAL_EXECUTION_TEST: Review clean code, verify approval

INTEGRATION_CHECK: Coordinates with CoderRunner for fix cycle
INTEGRATION_CHECK: Uses GitService for diff generation
SILENT_FAILURE_CHECK: Always approves regardless of quality
SILENT_FAILURE_CHECK: Issues identified but not reported
SILENT_FAILURE_CHECK: API failure returns false approval
SILENT_FAILURE_CHECK: Review prompt too large (truncated)
```

#### P14B-AGT-005: MergerAgent
```
TEST: MergerAgent handles merge operations
LOCATION: src/execution/agents/MergerAgent.ts
METHODS: execute(), resolveConflicts(), analyzeDiff(), getSystemPrompt()
EXTENDS: BaseAgentRunner

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for conflict resolution
VERIFY: getSystemPrompt() returns merge-focused prompt
VERIFY: execute() returns TaskResult with merge outcome
VERIFY: Analyzes merge conflicts from git
VERIFY: Proposes conflict resolutions
VERIFY: Escalates complex conflicts to human
VERIFY: Preserves both sides' intent when resolving

REAL_EXECUTION_TEST: Resolve simple conflict
REAL_EXECUTION_TEST: Detect complex conflict requiring escalation

INTEGRATION_CHECK: Uses GitService for merge operations
INTEGRATION_CHECK: Works with WorktreeManager
INTEGRATION_CHECK: Coordinates with EscalationHandler
SILENT_FAILURE_CHECK: Conflict ignored, code corrupted
SILENT_FAILURE_CHECK: Auto-resolution produces invalid code
SILENT_FAILURE_CHECK: Complex conflict not escalated
SILENT_FAILURE_CHECK: Merge markers left in code
```

#### P14B-AGT-006: AgentPool
```
TEST: AgentPool manages agent lifecycle
LOCATION: src/orchestration/agents/AgentPool.ts
METHODS: spawn(), terminate(), assign(), release(), getAll(), getActive(), getAvailable(), getById(), size()
INTERFACE: IAgentPool

VERIFY: Implements IAgentPool interface
VERIFY: spawn() creates PoolAgent with:
  - id: unique identifier
  - type: AgentType
  - status: 'idle'
  - metrics: initialized AgentMetrics
  - spawnedAt: Date
VERIFY: spawn() respects max agents per type
VERIFY: terminate() destroys agent and cleans up
VERIFY: assign() links agent to task
VERIFY: assign() accepts optional worktreePath
VERIFY: assign() updates status to 'assigned'
VERIFY: release() returns agent to pool
VERIFY: release() updates status to 'idle'
VERIFY: release() updates lastActiveAt
VERIFY: getAll() returns all agents
VERIFY: getActive() returns non-idle agents
VERIFY: getAvailable() returns first idle agent or undefined
VERIFY: getById() returns agent or undefined
VERIFY: size() returns current pool size

STUB_CHECK: NO stub markers in code (TODO, FIXME, stub, placeholder)
REAL_CHECK: spawn() actually creates agent instances
REAL_CHECK: Agents can execute tasks

INTEGRATION_CHECK: Works with NexusCoordinator.agentPool
INTEGRATION_CHECK: spawn() creates correct agent runner type
SILENT_FAILURE_CHECK: Pool exhausted without error
SILENT_FAILURE_CHECK: Agent leaked, not returned to pool
SILENT_FAILURE_CHECK: Terminated agent still in pool
SILENT_FAILURE_CHECK: Metrics not updated on task completion
```

### WIRING

#### P14B-WIRE-001: NexusFactory
```
TEST: NexusFactory creates complete Nexus instance
LOCATION: src/NexusFactory.ts
METHODS: create(), createForTesting(), createNexus()

VERIFY: create() returns NexusInstance with:
  - coordinator: NexusCoordinator
  - agentPool: AgentPool
  - taskQueue: TaskQueue
  - qaRunner: QARunner (from QARunnerFactory)
  - iterator: RalphStyleIterator
  - checkpointManager: CheckpointManager
VERIFY: All dependencies wired correctly:
  - ClaudeClient created with API key
  - GeminiClient created with API key
  - TaskDecomposer with ClaudeClient
  - DependencyResolver
  - TimeEstimator
  - AgentPool with both clients
  - QARunnerFactory with GeminiClient, GitService
  - RalphStyleIterator with QARunner
  - NexusCoordinator with all dependencies
VERIFY: createForTesting() returns mock-enabled instance
VERIFY: createForTesting() allows dependency injection
VERIFY: createNexus() is convenience function for create()

INTEGRATION_CHECK: Returned instance can run Genesis mode
INTEGRATION_CHECK: Returned instance can run Evolution mode
INTEGRATION_CHECK: All components communicate correctly
SILENT_FAILURE_CHECK: Dependency missing, null reference later
SILENT_FAILURE_CHECK: Wrong client passed to wrong component
SILENT_FAILURE_CHECK: API keys not validated
SILENT_FAILURE_CHECK: Environment variables missing but no error
```

---

**[TASK 8 COMPLETE]**

Task 8 extracted all Phase 14B Execution Bindings:
- P14B-QA-001 through P14B-QA-005: QA Runners (5 components)
- P14B-PLN-001 through P14B-PLN-003: Planning (3 components)
- P14B-AGT-001 through P14B-AGT-006: Agents (6 components)
- P14B-WIRE-001: NexusFactory (1 component)

Total: 15 Phase 14B components with ~85 new tests

Each component includes:
- LOCATION: Source file path
- METHODS: Key methods to test
- INTERFACE: Interface implemented (if applicable)
- VERIFY: Specific behavior verifications
- REAL_EXECUTION_TEST: Tests requiring actual execution
- INTEGRATION_CHECK: Integration points
- SILENT_FAILURE_CHECK: Potential silent failure modes
- STUB_CHECK: Verification that no stubs remain

---

## SECTION 9: SILENT FAILURE DETECTION TESTS

> **What is a Silent Failure?**
> A silent failure is when something goes wrong but:
> - No error is thrown
> - No warning is logged
> - The system appears to work
> - But the result is incorrect or incomplete

### Category 1: Empty Results Instead of Errors

#### SF-EMPTY-001: Claude API Returns Empty
```
TEST: Detect when Claude API returns empty instead of error
COMPONENTS: ClaudeClient
LOCATION: src/llm/ClaudeClient.ts

SCENARIO: API key invalid or rate limited
EXPECTED: Error thrown with clear message
SILENT_FAILURE: Empty response returned, downstream code continues with null/undefined

DETECTION_STRATEGY:
- VERIFY: Response is not empty before using
- VERIFY: Response matches expected schema (has .content, .role, etc.)
- VERIFY: Log warning if response suspiciously small (<10 chars)
- VERIFY: Throw explicit error on empty response

TEST_CASE:
1. Mock Claude API to return empty string
2. Call ClaudeClient.chat()
3. ASSERT: Error thrown with message "Empty response from Claude"
4. ASSERT: Error logged with request context
```

#### SF-EMPTY-002: Gemini API Returns Empty
```
TEST: Detect when Gemini API returns empty instead of error
COMPONENTS: GeminiClient
LOCATION: src/llm/GeminiClient.ts

SCENARIO: API key invalid, quota exceeded, or model unavailable
EXPECTED: Error thrown with clear message
SILENT_FAILURE: Empty or malformed response returned

DETECTION_STRATEGY:
- VERIFY: Response has expected structure
- VERIFY: Review results have approval status
- VERIFY: Issues array exists (even if empty)
- VERIFY: Throw on malformed response

TEST_CASE:
1. Mock Gemini API to return {}
2. Call GeminiClient.review()
3. ASSERT: Error thrown with message "Invalid response from Gemini"
4. ASSERT: Fallback NOT to approved=true
```

#### SF-EMPTY-003: Database Query Returns Empty Unexpectedly
```
TEST: Detect when query returns empty when data should exist
COMPONENTS: DatabaseService, StateManager, RequirementsDB
LOCATION: src/persistence/database/DatabaseService.ts

SCENARIO: Record exists but query has wrong conditions
EXPECTED: Record returned
SILENT_FAILURE: Empty array returned, code assumes no data

DETECTION_STRATEGY:
- VERIFY: Distinguish "no results" from "query error"
- VERIFY: Log queries that return empty when expecting data
- VERIFY: Use getOrThrow() for required records
- VERIFY: RequirementsDB.getByFeatureId() throws if feature not found

TEST_CASE:
1. Insert requirement with featureId='F-001'
2. Query with typo: featureId='F-001 ' (trailing space)
3. ASSERT: Empty result triggers warning
4. ASSERT: getOrThrow() throws "Requirement not found"
```

#### SF-EMPTY-004: File Read Returns Empty String
```
TEST: Detect when file read returns empty but file has content
COMPONENTS: FileSystemService, CheckpointManager
LOCATION: src/infrastructure/file-system/FileSystemService.ts

SCENARIO: File exists but encoding wrong, or file descriptor issue
EXPECTED: File contents
SILENT_FAILURE: Empty string returned, no error

DETECTION_STRATEGY:
- VERIFY: Check file size before reading if expecting content
- VERIFY: Warn if file size > 0 but content empty
- VERIFY: Handle encoding explicitly (UTF-8)

TEST_CASE:
1. Create file with 100 bytes of content
2. Mock read to return empty string
3. ASSERT: Warning logged "Expected content but got empty"
4. ASSERT: Retry mechanism triggered
```

#### SF-EMPTY-005: Git Diff Returns Empty When Changes Exist
```
TEST: Detect empty diff when worktree has changes
COMPONENTS: GitService, RalphStyleIterator
LOCATION: src/infrastructure/git/GitService.ts

SCENARIO: Changes exist but diff against wrong ref
EXPECTED: Diff with changes
SILENT_FAILURE: Empty diff, agent has no context of changes

DETECTION_STRATEGY:
- VERIFY: Check git status before diff
- VERIFY: If status shows changes but diff empty, warn
- VERIFY: Log refs being compared

TEST_CASE:
1. Create worktree with modified files
2. Call getDiff() with wrong base ref
3. ASSERT: Warning logged "Status shows changes but diff empty"
4. ASSERT: Fallback to full file content
```

### Category 2: State Drift

#### SF-DRIFT-001: Memory vs Database Mismatch
```
TEST: Detect state drift between in-memory and persisted state
COMPONENTS: StateManager, DatabaseService
LOCATION: src/persistence/state/StateManager.ts

SCENARIO: Update in memory succeeds, persist fails silently
EXPECTED: Memory and disk always in sync
SILENT_FAILURE: Memory updated, disk has old data, restart loses progress

DETECTION_STRATEGY:
- VERIFY: Use transactions for atomic updates
- VERIFY: Periodically verify memory matches disk (every 5 min)
- VERIFY: Log all persistence operations with success/fail
- VERIFY: On restore, compare checksums

TEST_CASE:
1. Update state in memory
2. Mock persist() to fail silently
3. Call reconcile()
4. ASSERT: Mismatch detected
5. ASSERT: Event emitted: 'state.drift.detected'
```

#### SF-DRIFT-002: Task Status Mismatch
```
TEST: Detect task status drift between TaskQueue and database
COMPONENTS: TaskQueue, NexusCoordinator, DatabaseService
LOCATION: src/orchestration/queue/TaskQueue.ts

SCENARIO: Task completes but status update fails
EXPECTED: Status = 'completed' in queue AND database
SILENT_FAILURE: Queue shows completed, database shows in_progress

DETECTION_STRATEGY:
- VERIFY: Status update is transactional
- VERIFY: Queue and database reconciled after each operation
- VERIFY: Alert on stale status (in_progress > 2 hours)

TEST_CASE:
1. Complete task in queue
2. Mock database update to fail
3. Run reconciliation
4. ASSERT: Mismatch detected
5. ASSERT: Corrective action logged
```

#### SF-DRIFT-003: Agent State Mismatch
```
TEST: Detect agent state drift in AgentPool
COMPONENTS: AgentPool, BaseAgentRunner
LOCATION: src/orchestration/agents/AgentPool.ts

SCENARIO: Agent finishes task but pool still shows it as 'working'
EXPECTED: Agent released to pool, status = 'idle'
SILENT_FAILURE: Agent stuck in 'working' state, pool appears full

DETECTION_STRATEGY:
- VERIFY: Agent state updated after task completion
- VERIFY: Implement heartbeat (agent pings every 30s)
- VERIFY: Clean up stale agents (no heartbeat for 5 min)
- VERIFY: Watchdog process monitors agent states

TEST_CASE:
1. Spawn agent
2. Assign task
3. Complete task but don't call release()
4. Wait 5 minutes
5. ASSERT: Watchdog detects stale agent
6. ASSERT: Agent auto-released with warning
```

#### SF-DRIFT-004: Iteration Count Mismatch
```
TEST: Detect iteration count drift in RalphStyleIterator
COMPONENTS: RalphStyleIterator
LOCATION: src/orchestration/iteration/RalphStyleIterator.ts

SCENARIO: Iteration counter in memory differs from persisted count
EXPECTED: Iteration count accurate after restart
SILENT_FAILURE: Counter resets on restart, runs 100+ iterations

DETECTION_STRATEGY:
- VERIFY: Iteration count persisted after each iteration
- VERIFY: On resume, load persisted count
- VERIFY: Log count at each iteration
- VERIFY: Hard limit: kill after 60 iterations even if counter wrong

TEST_CASE:
1. Run 25 iterations
2. Simulate restart
3. Resume execution
4. ASSERT: Counter resumes at 25, not 0
```

### Category 3: Event Delivery Failures

#### SF-EVENT-001: Event Emitted But Not Received
```
TEST: Detect lost events in EventBus
COMPONENTS: EventBus
LOCATION: src/orchestration/events/EventBus.ts

SCENARIO: Subscriber throws error, remaining subscribers not called
EXPECTED: All subscribers notified, errors isolated
SILENT_FAILURE: Some subscribers never receive event

DETECTION_STRATEGY:
- VERIFY: Each subscriber wrapped in try-catch
- VERIFY: Error in one subscriber doesn't stop others
- VERIFY: Failed deliveries logged
- VERIFY: Event delivery confirmation/receipt

TEST_CASE:
1. Register 3 subscribers
2. Subscriber 2 throws error
3. Emit event
4. ASSERT: Subscriber 1 called
5. ASSERT: Subscriber 2 error logged
6. ASSERT: Subscriber 3 called
```

#### SF-EVENT-002: Event Emitted With Wrong Payload Type
```
TEST: Detect type mismatches in event payloads
COMPONENTS: EventBus, Type system
LOCATION: src/orchestration/events/EventBus.ts

SCENARIO: Event emitted with payload that doesn't match expected schema
EXPECTED: Type error or runtime validation failure
SILENT_FAILURE: Wrong data passed, downstream code fails mysteriously

DETECTION_STRATEGY:
- VERIFY: Runtime type checking with Zod for event payloads
- VERIFY: Log payload structure on emit
- VERIFY: Subscriber can reject malformed payload

TEST_CASE:
1. Define event 'task.completed' with schema { taskId: string }
2. Emit with payload { taskId: 123 } (number instead of string)
3. ASSERT: Validation error thrown
4. ASSERT: Event NOT delivered to subscribers
```

#### SF-EVENT-003: Event Lost During High-Frequency Emission
```
TEST: Detect event loss under load
COMPONENTS: EventBus
LOCATION: src/orchestration/events/EventBus.ts

SCENARIO: Rapid event emission overwhelms event queue
EXPECTED: All events eventually delivered
SILENT_FAILURE: Events dropped without notice

DETECTION_STRATEGY:
- VERIFY: Event sequence numbers to detect gaps
- VERIFY: Backpressure mechanism if queue full
- VERIFY: Warning when queue depth > threshold

TEST_CASE:
1. Register subscriber with slow processing (100ms)
2. Emit 1000 events rapidly
3. Wait for processing
4. ASSERT: All 1000 events received
5. ASSERT: No sequence gaps
```

### Category 4: Fallback Masking Errors

#### SF-FALLBACK-001: LLM Fallback Hides Real Error
```
TEST: Detect when fallback masks primary provider failure
COMPONENTS: ClaudeClient, GeminiClient, LLMProvider
LOCATION: src/llm/

SCENARIO: Claude fails with important error, Gemini used without logging why
EXPECTED: Error logged, explicit fallback notification
SILENT_FAILURE: Primary failure hidden, issues not investigated

DETECTION_STRATEGY:
- VERIFY: Always log fallback activation with reason
- VERIFY: Track fallback frequency (alert if > 10% of calls)
- VERIFY: Include original error in fallback context
- VERIFY: Emit event 'llm.fallback.activated'

TEST_CASE:
1. Mock Claude to fail with "Rate limit exceeded"
2. Call LLMProvider.chat()
3. ASSERT: Gemini fallback used
4. ASSERT: Log entry: "Falling back to Gemini. Claude error: Rate limit exceeded"
5. ASSERT: Metric tracked: claude_fallbacks_total++
```

#### SF-FALLBACK-002: Default TimeEstimate Hides Calculation Error
```
TEST: Detect when default value masks estimation failure
COMPONENTS: TimeEstimator
LOCATION: src/planning/estimation/TimeEstimator.ts

SCENARIO: Estimation fails, default 30 minutes used without warning
EXPECTED: Error or warning when using default
SILENT_FAILURE: Always estimates 30min, planning seems to work but is inaccurate

DETECTION_STRATEGY:
- VERIFY: Log when default value used
- VERIFY: Track default usage frequency
- VERIFY: Emit event 'estimation.defaulted'
- VERIFY: Flag task as 'estimated_with_default'

TEST_CASE:
1. Provide task with no estimable attributes
2. Call estimate()
3. ASSERT: Default 30 returned
4. ASSERT: Warning logged "Using default estimate, could not calculate"
5. ASSERT: Task flagged with estimationMethod='default'
```

#### SF-FALLBACK-003: QA Step Fallback to Pass
```
TEST: Detect when QA step defaults to pass on error
COMPONENTS: BuildRunner, LintRunner, TestRunner, ReviewRunner
LOCATION: src/execution/qa/

SCENARIO: QA step throws exception, returns pass by default
EXPECTED: Error propagated, step marked as failed
SILENT_FAILURE: Bad code passes QA, merged to main

DETECTION_STRATEGY:
- VERIFY: No catch blocks that return success
- VERIFY: All QA errors propagate
- VERIFY: Explicit failure state, not default success

TEST_CASE:
1. Mock BuildRunner.run() to throw exception
2. Run QA loop
3. ASSERT: Build step marked as FAILED
4. ASSERT: Exception details in BuildResult.error
5. ASSERT: QA loop does NOT continue to lint
```

### Category 5: Resource Leaks

#### SF-LEAK-001: Orphaned Worktrees
```
TEST: Detect orphaned worktrees accumulating
COMPONENTS: WorktreeManager, AgentPool
LOCATION: src/infrastructure/git/WorktreeManager.ts

SCENARIO: Task fails, worktree not cleaned up
EXPECTED: Worktree removed on task completion (success or failure)
SILENT_FAILURE: Worktrees accumulate, disk fills up

DETECTION_STRATEGY:
- VERIFY: Track worktree creation/deletion count
- VERIFY: Periodic cleanup job (every 10 min)
- VERIFY: Alert when worktree count > 10
- VERIFY: Each worktree tagged with taskId for tracking

TEST_CASE:
1. Create worktree for task
2. Task throws exception
3. Wait for cleanup interval
4. ASSERT: Worktree removed
5. ASSERT: Log entry "Cleaned orphan worktree for task X"
```

#### SF-LEAK-002: Database Connection Leak
```
TEST: Detect database connection leaks
COMPONENTS: DatabaseService
LOCATION: src/persistence/database/DatabaseService.ts

SCENARIO: Query errors, connection not returned to pool
EXPECTED: Connection released on success AND error
SILENT_FAILURE: Pool exhausted over time, queries start failing

DETECTION_STRATEGY:
- VERIFY: Connection checkout/return tracked
- VERIFY: Connection timeout (idle > 60s returns to pool)
- VERIFY: Alert on pool exhaustion approaching
- VERIFY: Use connection wrapper with finally{} release

TEST_CASE:
1. Run query that throws error
2. Check pool state
3. ASSERT: Connection returned to pool
4. ASSERT: Pool size unchanged
```

#### SF-LEAK-003: Agent Memory Leak
```
TEST: Detect memory leaks in long-running agents
COMPONENTS: BaseAgentRunner, AgentPool
LOCATION: src/execution/agents/

SCENARIO: Agent retains references to old messages, memory grows
EXPECTED: Agent memory stable over many iterations
SILENT_FAILURE: Memory grows indefinitely, eventual OOM

DETECTION_STRATEGY:
- VERIFY: Monitor agent heap usage
- VERIFY: Clear conversation history after task
- VERIFY: Force GC between tasks
- VERIFY: Alert if agent memory > 500MB

TEST_CASE:
1. Run agent for 50 iterations
2. Measure memory after each iteration
3. ASSERT: Memory growth < 10MB total
4. ASSERT: No unbounded arrays in agent state
```

#### SF-LEAK-004: Event Listener Leak
```
TEST: Detect event listener leaks
COMPONENTS: EventBus
LOCATION: src/orchestration/events/EventBus.ts

SCENARIO: Listeners registered but never unregistered
EXPECTED: Listeners cleaned up when component disposed
SILENT_FAILURE: Listener count grows, memory leak, duplicate handlers

DETECTION_STRATEGY:
- VERIFY: Track listener count per event type
- VERIFY: Warn if listener count > 100 for any event
- VERIFY: Components call off() in dispose()
- VERIFY: Weak references for component-bound listeners

TEST_CASE:
1. Create 50 components, each registers listener
2. Dispose 49 components
3. ASSERT: Only 1 listener remains
4. ASSERT: Disposed component listeners removed
```

### Category 6: QA Bypasses

#### SF-QA-001: QA Step Skipped Without Notice
```
TEST: Detect when QA step is skipped
COMPONENTS: RalphStyleIterator, QALoopEngine
LOCATION: src/orchestration/iteration/RalphStyleIterator.ts

SCENARIO: Build step throws, iteration continues to lint
EXPECTED: Build failure stops iteration for that step
SILENT_FAILURE: Bad code passes because build was skipped

DETECTION_STRATEGY:
- VERIFY: Each step has explicit ran/skipped status
- VERIFY: Cannot proceed without explicit step result
- VERIFY: Log step execution timestamps
- VERIFY: Alert if step timestamp missing

TEST_CASE:
1. Mock BuildRunner to throw "tsc not found"
2. Run iteration
3. ASSERT: Iteration marked as FAILED at build step
4. ASSERT: Lint NOT executed
5. ASSERT: Log shows "Build step failed, iteration incomplete"
```

#### SF-QA-002: Iteration Counter Not Incrementing
```
TEST: Detect iteration count manipulation
COMPONENTS: RalphStyleIterator
LOCATION: src/orchestration/iteration/RalphStyleIterator.ts

SCENARIO: Counter not incremented on certain error paths
EXPECTED: Counter ALWAYS increments, regardless of outcome
SILENT_FAILURE: Infinite loop, never reaches escalation threshold

DETECTION_STRATEGY:
- VERIFY: Counter incremented FIRST, before any step
- VERIFY: Hard timeout as backup (30 min per task)
- VERIFY: Log iteration start/end with count
- VERIFY: Kill process if iteration 0 appears after iteration 1

TEST_CASE:
1. Mock step to fail repeatedly
2. Run 55 iterations
3. ASSERT: Counter shows 55
4. ASSERT: Escalation triggered at 50
```

#### SF-QA-003: Escalation Handler Not Called
```
TEST: Detect escalation bypass
COMPONENTS: EscalationHandler, RalphStyleIterator
LOCATION: src/orchestration/escalation/EscalationHandler.ts

SCENARIO: 50 iterations reached but escalation fails silently
EXPECTED: Human notified, task paused
SILENT_FAILURE: System continues beyond 50, no notification

DETECTION_STRATEGY:
- VERIFY: Escalation returns success/failure
- VERIFY: Retry escalation 3 times if fails
- VERIFY: Hard kill after 60 iterations regardless
- VERIFY: Emit event 'escalation.required' for monitoring

TEST_CASE:
1. Mock EscalationHandler.notify() to fail
2. Run 50 iterations
3. ASSERT: 3 retry attempts logged
4. ASSERT: After retries exhausted, task marked 'escalation_failed'
5. ASSERT: Execution STOPS, does not continue to 51
```

#### SF-QA-004: Review Always Approves
```
TEST: Detect when review rubber-stamps everything
COMPONENTS: ReviewRunner, ReviewerAgent
LOCATION: src/execution/qa/ReviewRunner.ts

SCENARIO: Review always returns approved=true regardless of code quality
EXPECTED: Actual code review with meaningful feedback
SILENT_FAILURE: Bad code approved, technical debt accumulates

DETECTION_STRATEGY:
- VERIFY: Review includes specific feedback, not generic
- VERIFY: Track approval rate (alert if > 95%)
- VERIFY: Review response includes line-specific comments
- VERIFY: Audit random sample of reviews for quality

TEST_CASE:
1. Submit obviously bad code (syntax errors, no types, etc.)
2. Run review
3. ASSERT: approved=false
4. ASSERT: Issues array has specific, actionable items
```

### Category 7: Context Issues

#### SF-CTX-001: Context Truncated Without Warning
```
TEST: Detect silent context truncation
COMPONENTS: FreshContextManager, DynamicContextProvider
LOCATION: src/orchestration/context/FreshContextManager.ts

SCENARIO: Context exceeds token limit, truncated from end
EXPECTED: Warning logged, truncation strategy clear (prioritize recent)
SILENT_FAILURE: Important context lost, agent makes wrong decisions

DETECTION_STRATEGY:
- VERIFY: Log when truncation occurs with amount truncated
- VERIFY: Mark what was truncated (files, history, etc.)
- VERIFY: Emit event 'context.truncated'
- VERIFY: Agent can request specific context back

TEST_CASE:
1. Create context with 200k tokens
2. Limit is 100k
3. Initialize context
4. ASSERT: Warning "Truncated 100k tokens from context"
5. ASSERT: Event emitted with truncation details
```

#### SF-CTX-002: Stale Context Between Tasks
```
TEST: Detect stale context not refreshed
COMPONENTS: FreshContextManager, MemorySystem
LOCATION: src/orchestration/context/FreshContextManager.ts

SCENARIO: Task 2 uses context from Task 1, not updated
EXPECTED: Fresh context for each task
SILENT_FAILURE: Task uses outdated information, makes incorrect changes

DETECTION_STRATEGY:
- VERIFY: Context reset called before each task
- VERIFY: Timestamp on context data
- VERIFY: Invalidate context when files change
- VERIFY: Log context age at task start

TEST_CASE:
1. Run Task 1, modify file A
2. Start Task 2
3. Check context for Task 2
4. ASSERT: Context includes Task 1's changes to file A
5. ASSERT: Context timestamp is recent
```

#### SF-CTX-003: Context Budget Exceeded Without Limit
```
TEST: Detect context budget not enforced
COMPONENTS: DynamicContextProvider
LOCATION: src/orchestration/context/DynamicContextProvider.ts

SCENARIO: Agent keeps requesting more context, no limit
EXPECTED: Budget enforced, agent warned
SILENT_FAILURE: Context grows unbounded, API calls fail

DETECTION_STRATEGY:
- VERIFY: Budget tracked per task (e.g., 50k tokens)
- VERIFY: Warn at 80% of budget
- VERIFY: Reject requests beyond budget
- VERIFY: Log all context requests with sizes

TEST_CASE:
1. Set budget to 50k tokens
2. Request 60k tokens of context
3. ASSERT: First 50k provided
4. ASSERT: Warning "Context budget exceeded"
5. ASSERT: Subsequent requests rejected
```

### Category 8: Type Mismatches

#### SF-TYPE-001: Runtime Type Mismatch from API
```
TEST: Detect runtime type mismatches from external APIs
COMPONENTS: ClaudeClient, GeminiClient, All external integrations
LOCATION: src/llm/

SCENARIO: API returns unexpected structure
EXPECTED: Validation error, clear message
SILENT_FAILURE: Wrong field accessed, undefined cascades through code

DETECTION_STRATEGY:
- VERIFY: All external responses validated with Zod
- VERIFY: Strict null checks enabled
- VERIFY: Log validation failures with payload

TEST_CASE:
1. Mock Claude response: { choices: [] } instead of { content: "" }
2. Call ClaudeClient.chat()
3. ASSERT: Zod validation error thrown
4. ASSERT: Error message includes expected vs received structure
```

#### SF-TYPE-002: Interface Implementation Mismatch
```
TEST: Detect interface implementation mismatches
COMPONENTS: All Phase 14B bindings
LOCATION: src/

SCENARIO: Implementation doesn't match interface contract
EXPECTED: Compile error
SILENT_FAILURE: Runtime error or incorrect behavior

DETECTION_STRATEGY:
- VERIFY: TypeScript strict mode enabled
- VERIFY: Integration tests verify interface contracts
- VERIFY: No 'any' types on interface boundaries

TEST_CASE:
1. Review ITaskDecomposer interface
2. Review TaskDecomposer implementation
3. ASSERT: All interface methods implemented
4. ASSERT: Return types match exactly
5. ASSERT: No additional methods that should be in interface
```

#### SF-TYPE-003: JSON Parse Without Validation
```
TEST: Detect JSON parsing without schema validation
COMPONENTS: StateManager, CheckpointManager, All persistence
LOCATION: src/persistence/

SCENARIO: JSON parsed but structure not validated
EXPECTED: Validated JSON or clear error
SILENT_FAILURE: Malformed data loaded, causes errors later

DETECTION_STRATEGY:
- VERIFY: All JSON.parse() followed by Zod validation
- VERIFY: No raw JSON.parse() in codebase
- VERIFY: Use typed parse functions (parseState(), parseCheckpoint())

TEST_CASE:
1. Save checkpoint with extra field
2. Modify saved file to remove required field
3. Load checkpoint
4. ASSERT: Validation error on load
5. ASSERT: Error message shows missing field
```

#### SF-TYPE-004: Event Payload Schema Mismatch
```
TEST: Detect event payload schema violations
COMPONENTS: EventBus, All event emitters
LOCATION: src/orchestration/events/

SCENARIO: Event emitted with wrong payload shape
EXPECTED: Runtime validation error
SILENT_FAILURE: Subscriber receives wrong data, undefined behavior

DETECTION_STRATEGY:
- VERIFY: Event schemas defined centrally
- VERIFY: emit() validates payload against schema
- VERIFY: Log schema violations

TEST_CASE:
1. Define TaskCompletedEvent = { taskId: string, duration: number }
2. Emit with { taskId: 123, duration: "5min" }
3. ASSERT: Schema validation error
4. ASSERT: Event NOT emitted
```

### Category 9: Concurrency Issues

#### SF-CONC-001: Race Condition in Task Assignment
```
TEST: Detect race conditions in agent assignment
COMPONENTS: AgentPool, NexusCoordinator
LOCATION: src/orchestration/agents/AgentPool.ts

SCENARIO: Two tasks try to claim same agent simultaneously
EXPECTED: One succeeds, one waits
SILENT_FAILURE: Both think they have the agent, conflicts ensue

DETECTION_STRATEGY:
- VERIFY: Agent assignment uses mutex/lock
- VERIFY: Double-check agent status before assignment
- VERIFY: Assignment returns success/failure explicitly

TEST_CASE:
1. Create pool with 1 agent
2. Simultaneously submit 2 tasks
3. ASSERT: Exactly 1 task assigned immediately
4. ASSERT: Other task queued/waiting
5. ASSERT: No "agent already assigned" errors later
```

#### SF-CONC-002: Concurrent File Writes
```
TEST: Detect file write conflicts
COMPONENTS: FileSystemService, AgentRunner
LOCATION: src/infrastructure/file-system/FileSystemService.ts

SCENARIO: Two agents write same file simultaneously
EXPECTED: Writes serialized or merged
SILENT_FAILURE: One write lost, code inconsistent

DETECTION_STRATEGY:
- VERIFY: File locks for write operations
- VERIFY: Conflict detection before write
- VERIFY: Atomic write operations (write to temp, rename)

TEST_CASE:
1. Start two agents writing to same file
2. Both complete
3. ASSERT: File contains expected merged content OR
4. ASSERT: Conflict detected and reported
```

#### SF-CONC-003: Database Transaction Conflicts
```
TEST: Detect database transaction isolation issues
COMPONENTS: DatabaseService
LOCATION: src/persistence/database/DatabaseService.ts

SCENARIO: Concurrent transactions conflict
EXPECTED: Proper isolation, retry on conflict
SILENT_FAILURE: Data corruption from partial commits

DETECTION_STRATEGY:
- VERIFY: Transactions use SERIALIZABLE isolation
- VERIFY: Retry logic for conflict errors
- VERIFY: Log all transaction conflicts

TEST_CASE:
1. Start transaction A: read task status
2. Start transaction B: update same task status
3. A tries to update based on old read
4. ASSERT: Conflict detected
5. ASSERT: Transaction A retries with fresh data
```

### Category 10: Configuration Issues

#### SF-CONFIG-001: Missing Environment Variable
```
TEST: Detect missing required environment variables
COMPONENTS: NexusFactory, Configuration
LOCATION: src/NexusFactory.ts

SCENARIO: CLAUDE_API_KEY not set
EXPECTED: Clear error at startup
SILENT_FAILURE: Undefined used, cryptic API errors later

DETECTION_STRATEGY:
- VERIFY: All required env vars validated at startup
- VERIFY: Clear error message for each missing var
- VERIFY: Startup blocked until resolved

TEST_CASE:
1. Unset CLAUDE_API_KEY
2. Call NexusFactory.create()
3. ASSERT: Error "Missing required env var: CLAUDE_API_KEY"
4. ASSERT: Error thrown BEFORE any LLM calls
```

#### SF-CONFIG-002: Invalid Configuration Value
```
TEST: Detect invalid configuration values
COMPONENTS: Configuration
LOCATION: src/config/

SCENARIO: MAX_ITERATIONS set to "fifty" instead of 50
EXPECTED: Validation error
SILENT_FAILURE: NaN used, infinite loop or crash

DETECTION_STRATEGY:
- VERIFY: All config values validated with types
- VERIFY: Range checks for numeric values
- VERIFY: Enum checks for string values

TEST_CASE:
1. Set MAX_ITERATIONS="fifty"
2. Load configuration
3. ASSERT: Validation error "MAX_ITERATIONS must be number"
```

---

**[TASK 9 COMPLETE]**

Task 9 generated Silent Failure Detection Tests across 10 categories:
- Category 1: Empty Results Instead of Errors (5 tests)
- Category 2: State Drift (4 tests)
- Category 3: Event Delivery Failures (3 tests)
- Category 4: Fallback Masking Errors (3 tests)
- Category 5: Resource Leaks (4 tests)
- Category 6: QA Bypasses (4 tests)
- Category 7: Context Issues (3 tests)
- Category 8: Type Mismatches (4 tests)
- Category 9: Concurrency Issues (3 tests)
- Category 10: Configuration Issues (2 tests)

Total: 35 Silent Failure Detection Tests

Each test includes:
- SCENARIO: What goes wrong
- EXPECTED: Correct behavior
- SILENT_FAILURE: How it fails silently
- DETECTION_STRATEGY: How to catch it
- TEST_CASE: Specific test steps and assertions

---

## SECTION 10: EDGE CASE AND BOUNDARY TESTS

### Layer 7: Infrastructure Edge Cases

#### EDGE-INF-001: Empty File Operations
```
TEST: Handle empty files correctly
COMPONENTS: FileSystemService

EDGE_CASE: Empty file read/write operations
EXPECTED_BEHAVIOR: Empty files handled as valid state

VERIFY: readFile('empty.txt') returns '' (empty string, not null/undefined)
VERIFY: writeFile('new.txt', '') creates empty file with 0 bytes
VERIFY: exists() returns true for empty files
VERIFY: getSize('empty.txt') returns 0
VERIFY: glob() includes empty files in results
VERIFY: watch() triggers events for empty file modifications

TEST_CASE:
  1. Create empty file
  2. Read file, verify returns ''
  3. Write '' to existing file
  4. Verify file exists with 0 bytes
  5. Delete and recreate as empty
```

#### EDGE-INF-002: Very Large Files
```
TEST: Handle large files without crashing
COMPONENTS: FileSystemService, GitService, MemorySystem

EDGE_CASE: Files exceeding memory limits
EXPECTED_BEHAVIOR: Graceful handling with streaming or chunking

VERIFY: Read 100MB file doesn't OOM (uses streaming)
VERIFY: Write 100MB file uses chunked writes
VERIFY: Git diff handles 10MB+ file changes
VERIFY: Memory system limits embedding size
VERIFY: Context truncation for >500KB files
VERIFY: Progress callback for large operations

TEST_CASE:
  1. Generate 100MB test file
  2. Read file, measure memory usage
  3. Write 100MB data, verify completion
  4. Create git diff with large file
  5. Verify no memory leaks after operations
```

#### EDGE-INF-003: Special Characters in Paths
```
TEST: Handle special characters in file paths
COMPONENTS: FileSystemService, WorktreeManager, GitService

EDGE_CASE: Non-ASCII and problematic path characters
EXPECTED_BEHAVIOR: Proper escaping and encoding

VERIFY: Spaces in path work: 'path with spaces/file.ts'
VERIFY: Unicode in path works: 'путь/文件.ts'
VERIFY: Windows/Unix path normalization: C:\Users vs /c/Users
VERIFY: Special chars escaped: 'file[1](2).ts'
VERIFY: Dots handled: '../relative/path.ts'
VERIFY: Null bytes rejected
VERIFY: Max path length (260 Windows, 4096 Unix) enforced

TEST_CASE:
  1. Create file with spaces in path
  2. Create file with unicode name
  3. Test cross-platform path conversion
  4. Test bracket and parenthesis handling
  5. Verify relative path resolution
```

#### EDGE-INF-004: Concurrent File Access
```
TEST: Handle concurrent file operations
COMPONENTS: FileSystemService, CheckpointManager

EDGE_CASE: Multiple readers/writers on same file
EXPECTED_BEHAVIOR: No corruption, proper synchronization

VERIFY: Parallel reads work (multiple readers OK)
VERIFY: Parallel writes don't corrupt (mutex/queue)
VERIFY: Read during write returns consistent state
VERIFY: File locking prevents conflicts
VERIFY: Lock timeout prevents deadlock
VERIFY: Atomic operations for critical files

TEST_CASE:
  1. Spawn 10 parallel readers
  2. Verify all get same content
  3. Spawn 10 parallel writers
  4. Verify final content is one complete write
  5. Test read-write interleaving
```

#### EDGE-INF-005: Network Failures during Git Operations
```
TEST: Handle network issues during git
COMPONENTS: GitService

EDGE_CASE: Network timeout/disconnect during remote operations
EXPECTED_BEHAVIOR: Graceful retry or error

VERIFY: Clone handles network timeout
VERIFY: Push retries on transient failure
VERIFY: Pull handles partial fetch
VERIFY: Detects incomplete clone
VERIFY: Rollback on push failure
VERIFY: Clear error message for user

TEST_CASE:
  1. Simulate network drop during clone
  2. Verify partial clone cleaned up
  3. Simulate timeout during push
  4. Verify local commits preserved
  5. Test retry logic with eventual success
```

### Layer 6: Persistence Edge Cases

#### EDGE-PER-001: Database Under Load
```
TEST: Database handles high load
COMPONENTS: DatabaseService

EDGE_CASE: Many concurrent queries/connections
EXPECTED_BEHAVIOR: Connection pooling, query queuing

VERIFY: 1000 concurrent queries complete
VERIFY: Transaction isolation maintained
VERIFY: Connection pool limits respected
VERIFY: Queue backpressure when saturated
VERIFY: No deadlocks under load
VERIFY: Graceful degradation when overwhelmed

TEST_CASE:
  1. Create 1000 parallel queries
  2. Measure latency distribution
  3. Verify no query failures
  4. Test with 100 parallel transactions
  5. Verify isolation (no dirty reads)
```

#### EDGE-PER-002: Checkpoint Size Limits
```
TEST: Handle large checkpoints
COMPONENTS: CheckpointManager, StateManager

EDGE_CASE: Checkpoint with many tasks and large state
EXPECTED_BEHAVIOR: Incremental/compressed checkpoints

VERIFY: Checkpoint with 1000 tasks succeeds
VERIFY: Restore 1000-task checkpoint in reasonable time
VERIFY: Incremental checkpoints only save diffs
VERIFY: Compression reduces checkpoint size
VERIFY: Checkpoint size limit enforced (500MB)
VERIFY: Warning at 80% of size limit

TEST_CASE:
  1. Create project with 1000 tasks
  2. Create checkpoint
  3. Measure checkpoint file size
  4. Modify 1 task
  5. Create incremental checkpoint (should be small)
```

#### EDGE-PER-003: Memory System Limits
```
TEST: Handle embedding storage limits
COMPONENTS: MemorySystem

EDGE_CASE: Very large codebase or many queries
EXPECTED_BEHAVIOR: LRU eviction, query limits

VERIFY: Maximum embeddings stored (configurable limit)
VERIFY: LRU eviction when limit reached
VERIFY: Query with no results returns empty array
VERIFY: Query with thousands of results paginated
VERIFY: Stale embeddings automatically refreshed
VERIFY: Memory usage stays bounded

TEST_CASE:
  1. Store maximum number of embeddings
  2. Add one more, verify oldest evicted
  3. Query for non-existent term
  4. Query with 1000+ results
  5. Monitor memory over extended use
```

#### EDGE-PER-004: State Recovery from Corruption
```
TEST: Handle corrupted state files
COMPONENTS: StateManager, CheckpointManager

EDGE_CASE: Power loss or crash during write
EXPECTED_BEHAVIOR: Recovery from backup or graceful reset

VERIFY: Detects corrupted JSON files
VERIFY: Falls back to backup if available
VERIFY: Initializes fresh state if no backup
VERIFY: Logs corruption for debugging
VERIFY: Notifies user of data loss
VERIFY: Atomic writes prevent partial corruption

TEST_CASE:
  1. Write state file
  2. Corrupt file mid-write (truncate)
  3. Restart system
  4. Verify recovery or reset
  5. Verify user notification
```

### Layer 5: Quality Edge Cases

#### EDGE-QUA-001: No Files to Lint/Build
```
TEST: Handle empty project
COMPONENTS: BuildRunner, LintRunner, TestRunner

EDGE_CASE: Project with no source files
EXPECTED_BEHAVIOR: Graceful success or clear message

VERIFY: Build with no .ts files returns success (nothing to compile)
VERIFY: Lint with no .ts files returns success (nothing to lint)
VERIFY: Test with no .test.ts files returns success (0/0 tests)
VERIFY: Clear message distinguishing "no files" from "no errors"
VERIFY: Metrics report 0 files processed

TEST_CASE:
  1. Create empty project directory
  2. Run tsc --noEmit
  3. Verify exit code 0
  4. Run eslint
  5. Verify reports no files
```

#### EDGE-QUA-002: All Tests Skip
```
TEST: Handle all tests skipped
COMPONENTS: TestRunner

EDGE_CASE: Every test marked skip or only.skip()
EXPECTED_BEHAVIOR: Report skips, not falsely report success

VERIFY: Result shows 0 pass, 0 fail, N skip
VERIFY: Skips counted in statistics
VERIFY: NOT marked as full success (warning state)
VERIFY: Reason for skip included if available
VERIFY: Can configure skip-is-failure mode

TEST_CASE:
  1. Create test file with all tests skipped
  2. Run vitest
  3. Verify result distinguishes from success
  4. Check skip reasons in output
```

#### EDGE-QUA-003: Review Very Large Diff
```
TEST: Handle large code review
COMPONENTS: ReviewRunner, GeminiClient

EDGE_CASE: Diff exceeding context window
EXPECTED_BEHAVIOR: Smart truncation or chunked review

VERIFY: Diff > 10000 lines handled (chunked)
VERIFY: Truncation preserves critical changes
VERIFY: Summary of truncated sections provided
VERIFY: Still produces meaningful review
VERIFY: Token count tracked and warned

TEST_CASE:
  1. Generate 10000+ line diff
  2. Submit for review
  3. Verify review completes
  4. Check review covers all sections
  5. Verify truncation warning if needed
```

#### EDGE-QUA-004: Timeout During QA Step
```
TEST: Handle QA step timeout
COMPONENTS: BuildRunner, TestRunner, ReviewRunner

EDGE_CASE: QA step exceeds timeout
EXPECTED_BEHAVIOR: Kill process, report timeout error

VERIFY: Process killed after timeout (60s default)
VERIFY: Timeout error clearly reported
VERIFY: Partial output captured before timeout
VERIFY: Resources cleaned up (no zombie processes)
VERIFY: Iteration continues with timeout error

TEST_CASE:
  1. Create test that runs forever
  2. Run with 5s timeout
  3. Verify killed after 5s
  4. Verify error includes "timeout"
  5. Verify no hung process
```

### Layer 4: Execution Edge Cases

#### EDGE-EXE-001: Agent Generates No Code
```
TEST: Handle agent producing nothing
COMPONENTS: CoderAgent, BaseAgentRunner

EDGE_CASE: Agent response contains no code
EXPECTED_BEHAVIOR: Detected as failure, retry

VERIFY: Detected as incomplete (not success)
VERIFY: Iteration continues with "no code" error
VERIFY: Eventually escalates if repeated
VERIFY: Error message specific: "Agent produced no code"
VERIFY: Context fed back includes failure reason

TEST_CASE:
  1. Mock LLM to return only text
  2. Run CoderAgent
  3. Verify detected as failure
  4. Verify iteration increments
  5. Check escalation after N failures
```

#### EDGE-EXE-002: Agent Generates Invalid Code
```
TEST: Handle syntactically invalid code
COMPONENTS: CoderAgent, BuildRunner

EDGE_CASE: Agent produces unparseable code
EXPECTED_BEHAVIOR: Build catches it, feeds back to agent

VERIFY: Build step catches syntax errors
VERIFY: Error includes file and line number
VERIFY: Error fed back to agent with context
VERIFY: Agent can attempt fix
VERIFY: Multiple syntax errors all reported

TEST_CASE:
  1. Mock LLM to return invalid TypeScript
  2. Run through QA loop
  3. Verify build fails with syntax error
  4. Verify error sent to agent
  5. (With real LLM) Verify fix attempt
```

#### EDGE-EXE-003: Agent Exceeds Token Limit
```
TEST: Handle token limit exceeded
COMPONENTS: BaseAgentRunner, ClaudeClient, GeminiClient

EDGE_CASE: Agent response or context too large
EXPECTED_BEHAVIOR: Truncation or chunking with warning

VERIFY: Response truncated gracefully (at sentence boundary)
VERIFY: Agent notified of limit in next iteration
VERIFY: Can request continuation for long outputs
VERIFY: Context automatically trimmed if needed
VERIFY: Warning logged when truncation occurs

TEST_CASE:
  1. Request very large code generation
  2. Verify response truncated
  3. Check log for truncation warning
  4. Verify continuation mechanism works
```

#### EDGE-EXE-004: Agent Stuck in Loop
```
TEST: Handle agent repeating same fix
COMPONENTS: RalphStyleIterator, BaseAgentRunner

EDGE_CASE: Agent keeps trying same unsuccessful fix
EXPECTED_BEHAVIOR: Detect loop, escalate or try different approach

VERIFY: Same diff detected across iterations
VERIFY: Loop counter increments
VERIFY: After N same-diffs, flag as stuck
VERIFY: Stuck triggers escalation or context reset
VERIFY: Log includes "repetition detected"

TEST_CASE:
  1. Create scenario with only one failing fix
  2. Run multiple iterations
  3. Verify loop detection triggers
  4. Verify escalation or intervention
```

### Layer 3: Planning Edge Cases

#### EDGE-PLN-001: Feature with No Tasks
```
TEST: Handle feature that needs no tasks
COMPONENTS: TaskDecomposer

EDGE_CASE: Simple feature already implemented or trivial
EXPECTED_BEHAVIOR: Empty task list or single verification task

VERIFY: Decomposition can return zero tasks (already done)
VERIFY: Decomposition can return single "verify" task
VERIFY: Not treated as error
VERIFY: Clear message: "Feature requires no changes"
VERIFY: Status updated appropriately

TEST_CASE:
  1. Request feature that already exists
  2. Decompose
  3. Verify returns 0 tasks or 1 verification task
  4. Verify appropriate status
```

#### EDGE-PLN-002: Circular Dependencies
```
TEST: Handle circular dependencies
COMPONENTS: DependencyResolver

EDGE_CASE: Task A depends on B, B depends on A
EXPECTED_BEHAVIOR: Cycle detected, error reported clearly

VERIFY: Cycle detected before execution
VERIFY: Error message includes cycle path: A -> B -> A
VERIFY: All cycles reported (not just first)
VERIFY: Suggests resolution (break dependency)
VERIFY: Does not attempt execution of cyclic tasks

TEST_CASE:
  1. Create task A depending on B
  2. Create task B depending on A
  3. Run dependency resolution
  4. Verify cycle error with path
```

#### EDGE-PLN-003: All Tasks Same Priority
```
TEST: Handle no clear priority order
COMPONENTS: DependencyResolver, TaskQueue

EDGE_CASE: All tasks priority 5, no dependencies
EXPECTED_BEHAVIOR: Deterministic arbitrary order

VERIFY: Consistent ordering across runs (stable sort)
VERIFY: All tasks can run in parallel
VERIFY: No single task blocked
VERIFY: FIFO or creation-order fallback

TEST_CASE:
  1. Create 10 tasks all priority 5
  2. No dependencies between them
  3. Run resolution twice
  4. Verify same order both times
```

#### EDGE-PLN-004: Extremely Deep Dependency Chain
```
TEST: Handle very deep dependency chains
COMPONENTS: DependencyResolver

EDGE_CASE: Task A -> B -> C -> ... -> Z (26+ levels)
EXPECTED_BEHAVIOR: Correct ordering, no stack overflow

VERIFY: Deep chain (100+ levels) handled
VERIFY: No stack overflow in topological sort
VERIFY: Correct execution order maintained
VERIFY: Progress reporting for deep chains
VERIFY: Time warning for very deep chains

TEST_CASE:
  1. Create chain of 100 dependent tasks
  2. Run dependency resolution
  3. Verify correct order (first is 0, last is 99)
  4. Verify no crash or timeout
```

### Layer 2: Orchestration Edge Cases

#### EDGE-ORC-001: All Agents Busy
```
TEST: Handle agent pool exhaustion
COMPONENTS: AgentPool, NexusCoordinator

EDGE_CASE: More tasks than available agents
EXPECTED_BEHAVIOR: Queue tasks, wait for agents

VERIFY: New task waits in queue (doesn't fail)
VERIFY: Doesn't create extra agents beyond limit
VERIFY: Task resumes when agent becomes free
VERIFY: Priority queue respected while waiting
VERIFY: Timeout for waiting in queue (optional)

TEST_CASE:
  1. Set agent pool limit to 2
  2. Start 5 concurrent tasks
  3. Verify 2 run immediately
  4. Verify 3 queued
  5. Complete 1, verify next starts
```

#### EDGE-ORC-002: Empty Task Queue
```
TEST: Handle empty queue
COMPONENTS: TaskQueue, NexusCoordinator

EDGE_CASE: No tasks to execute
EXPECTED_BEHAVIOR: Idle state, wait for tasks

VERIFY: dequeue() returns null/undefined (not error)
VERIFY: Coordinator enters idle state
VERIFY: Idle state is observable (event/status)
VERIFY: Resumes immediately when tasks added
VERIFY: No busy-wait (CPU efficient)

TEST_CASE:
  1. Start with empty queue
  2. Verify dequeue() returns null
  3. Verify coordinator status is 'idle'
  4. Add task
  5. Verify immediate processing
```

#### EDGE-ORC-003: Event Flood
```
TEST: Handle rapid event emission
COMPONENTS: EventBus

EDGE_CASE: 1000+ events/second
EXPECTED_BEHAVIOR: No events lost, reasonable throughput

VERIFY: No events lost under load
VERIFY: Subscribers not overwhelmed (async/queue)
VERIFY: Backpressure mechanism if needed
VERIFY: Memory bounded during flood
VERIFY: Slow subscriber doesn't block others

TEST_CASE:
  1. Emit 10000 events rapidly
  2. Count events received by subscriber
  3. Verify count matches
  4. Measure latency distribution
```

#### EDGE-ORC-004: Agent Crash During Execution
```
TEST: Handle agent crash mid-task
COMPONENTS: AgentPool, BaseAgentRunner

EDGE_CASE: Agent throws unhandled exception
EXPECTED_BEHAVIOR: Task marked failed, resources cleaned

VERIFY: Exception caught at AgentPool level
VERIFY: Task marked as failed (not stuck)
VERIFY: Agent removed from pool
VERIFY: Worktree cleaned up
VERIFY: New agent can be spawned
VERIFY: Task can be retried

TEST_CASE:
  1. Inject crash in agent mid-execution
  2. Verify task status = 'failed'
  3. Verify agent not in pool
  4. Verify worktree removed
  5. Retry task with new agent
```

### Layer 1: UI Edge Cases

#### EDGE-UI-001: Very Long Interview
```
TEST: Handle long interview session
COMPONENTS: InterviewPage, InterviewEngine

EDGE_CASE: 100+ message exchanges
EXPECTED_BEHAVIOR: Performance maintained, no memory leak

VERIFY: 100+ messages displayed without lag
VERIFY: No memory leak (monitor heap)
VERIFY: Scroll performance remains smooth
VERIFY: Can scroll to any message quickly
VERIFY: History persisted correctly

TEST_CASE:
  1. Simulate 100 message interview
  2. Measure scroll FPS
  3. Monitor memory usage
  4. Verify all messages retrievable
```

#### EDGE-UI-002: Rapid User Input
```
TEST: Handle rapid user actions
COMPONENTS: All UI components

EDGE_CASE: User clicking buttons rapidly
EXPECTED_BEHAVIOR: Debounce, no duplicates

VERIFY: Debounce works (500ms default)
VERIFY: No duplicate form submissions
VERIFY: UI remains responsive
VERIFY: Visual feedback for pending action
VERIFY: Can cancel pending action

TEST_CASE:
  1. Click submit 10 times in 100ms
  2. Verify only 1 submission
  3. Verify loading state shown
```

#### EDGE-UI-003: Browser Refresh During Operation
```
TEST: Handle page refresh mid-operation
COMPONENTS: StateManager, UI

EDGE_CASE: User refreshes during task execution
EXPECTED_BEHAVIOR: State restored, operation resumable

VERIFY: State saved to localStorage/IndexedDB
VERIFY: On refresh, state restored
VERIFY: Pending operations can resume
VERIFY: No duplicate executions
VERIFY: User notified of recovery

TEST_CASE:
  1. Start long operation
  2. Refresh page mid-way
  3. Verify state restored
  4. Verify operation can continue
```

### Boundary Tests

#### BOUNDARY-001: Task Duration Exactly 30 Minutes
```
TEST: Task exactly at time limit
COMPONENTS: TaskDecomposer, TimeEstimator

BOUNDARY: 30-minute task limit

VERIFY: Task estimated at exactly 30 min accepted
VERIFY: Task estimated at 30.001 min triggers split
VERIFY: Task at 29.999 min accepted without split
VERIFY: Rounding rules documented and consistent
VERIFY: Buffer zone configurable

TEST_CASE:
  1. Create task with 30:00 estimate
  2. Verify accepted
  3. Create task with 30:01 estimate
  4. Verify split triggered
```

#### BOUNDARY-002: Iteration Count Exactly 50
```
TEST: Iteration exactly at escalation limit
COMPONENTS: RalphStyleIterator

BOUNDARY: 50-iteration escalation limit

VERIFY: Iteration 49 runs QA and continues
VERIFY: Iteration 50 runs QA and can complete
VERIFY: Iteration 51 would trigger escalation
VERIFY: Success on iteration 50 completes task
VERIFY: Failure on iteration 50 escalates

TEST_CASE:
  1. Run QA loop to iteration 49
  2. Verify continues
  3. Run to iteration 50, pass QA
  4. Verify task completes (no escalation)
  5. Repeat with failure at 50
  6. Verify escalation triggered
```

#### BOUNDARY-003: Context Size at Limit
```
TEST: Context exactly at token limit
COMPONENTS: FreshContextManager, DynamicContextProvider

BOUNDARY: Token limit (e.g., 100K tokens)

VERIFY: Context at exactly limit not truncated
VERIFY: Context at limit+1 truncated
VERIFY: Warning at 90% of limit (90K)
VERIFY: Critical warning at 95% of limit (95K)
VERIFY: Truncation preserves most recent/relevant content

TEST_CASE:
  1. Build context to exactly limit
  2. Verify no truncation
  3. Add 1 more token
  4. Verify truncation and warning
```

#### BOUNDARY-004: Maximum Concurrent Agents
```
TEST: Agent pool at maximum capacity
COMPONENTS: AgentPool

BOUNDARY: Maximum agents per type (e.g., 5 CoderAgents)

VERIFY: At max, new requests queue
VERIFY: max+1 request doesn't spawn new agent
VERIFY: Releasing one agent allows queued request to proceed
VERIFY: Each agent type has independent limit

TEST_CASE:
  1. Set Coder limit to 3
  2. Start 3 Coder tasks
  3. Start 4th Coder task
  4. Verify 4th queued
  5. Complete 1, verify 4th starts
```

#### BOUNDARY-005: Maximum Task Dependencies
```
TEST: Maximum dependencies per task
COMPONENTS: DependencyResolver

BOUNDARY: Maximum incoming/outgoing dependencies

VERIFY: Task with 100 dependencies resolved correctly
VERIFY: Warning for tasks with >50 dependencies
VERIFY: Hard limit enforced (if exists)
VERIFY: Performance acceptable with many dependencies

TEST_CASE:
  1. Create task with 100 dependencies
  2. Verify resolution completes
  3. Measure resolution time
  4. Verify warning logged
```

#### BOUNDARY-006: Zero-Length Operations
```
TEST: Handle zero-length operations
COMPONENTS: All layers

BOUNDARY: Zero-length inputs that are technically valid

VERIFY: Empty string search returns no results (not error)
VERIFY: Zero-second timeout rejects immediately
VERIFY: Zero-byte file write succeeds
VERIFY: Zero tasks in queue is valid state
VERIFY: Zero requirements from interview is valid (rare)

TEST_CASE:
  1. Search for ''
  2. Verify returns []
  3. Write 0 bytes
  4. Verify file created empty
```

---

**[TASK 10 COMPLETE]**

Task 10 generated Edge Case and Boundary Tests across 7 layers + boundary conditions:

### Layer Edge Cases:
- Layer 7 Infrastructure: 5 tests (empty files, large files, special chars, concurrent access, network failures)
- Layer 6 Persistence: 4 tests (database load, checkpoint limits, memory limits, corruption recovery)
- Layer 5 Quality: 4 tests (empty project, all skips, large diff, timeout)
- Layer 4 Execution: 4 tests (no code, invalid code, token limit, stuck loop)
- Layer 3 Planning: 4 tests (no tasks, circular deps, same priority, deep chain)
- Layer 2 Orchestration: 4 tests (busy agents, empty queue, event flood, agent crash)
- Layer 1 UI: 3 tests (long interview, rapid input, browser refresh)

### Boundary Tests:
- BOUNDARY-001: Task Duration at 30 minutes
- BOUNDARY-002: Iteration Count at 50
- BOUNDARY-003: Context Size at token limit
- BOUNDARY-004: Maximum Concurrent Agents
- BOUNDARY-005: Maximum Task Dependencies
- BOUNDARY-006: Zero-Length Operations

Total: 34 Edge Case and Boundary Tests

Each test includes:
- EDGE_CASE/BOUNDARY: What condition is being tested
- EXPECTED_BEHAVIOR: Correct system response
- VERIFY: Specific assertions (5-7 per test)
- TEST_CASE: Step-by-step test procedure

---

## SECTION 11: SYNTHESIS

### Test Count Summary

Based on Tasks 1-10, here is the comprehensive test count:

| Section | Category | Test Count | Description |
|---------|----------|------------|-------------|
| 1 | Layer Architecture | 28 | Layer 7 (Infrastructure) + Layer 6 (Persistence) |
| 2 | Component Catalog | 85 | Layers 5, 4, 3, 2, 1 components |
| 3 | ADRs & Constraints | 105 | 10 ADRs with constraints |
| 4 | Integration Sequences | 120 | 12 sequences with step verification |
| 5 | Genesis Workflow | 75 | 8 E2E Genesis tests |
| 6 | Evolution Workflow | 80 | 8 E2E Evolution tests |
| 7 | Phase 13 Features | 70 | 8 context enhancement features |
| 8 | Phase 14B Bindings | 85 | QA runners, planning, agents, wiring |
| 9 | Silent Failures | 35 | 10 categories of silent failures |
| 10 | Edge Cases | 34 | 7 layer edge cases + 6 boundary tests |
| **TOTAL** | | **717** | |

### Test Organization by Category

For the final testing prompt, tests are organized into 8 main categories:

#### Category 1: Unit Tests (~113 tests)
- Layer 7: Infrastructure - 28 tests
  - INF-001 through INF-005: FileSystemService, GitService, WorktreeManager, LSPClient, ProcessRunner
- Layer 6: Persistence - 35 tests
  - PER-001 through PER-006: DatabaseClient, StateManager, CheckpointManager, MemorySystem, RequirementsDB, Schema
- Layer 5: Quality - 25 tests
  - QUA-001 through QUA-005: BuildRunner, LintRunner, TestRunner, ReviewRunner, QALoopEngine
- Layer 4: Execution - 15 tests
  - EXE-001 through EXE-006: ToolExecutor, CoderAgent, TesterAgent, ReviewerAgent, MergerAgent, BaseAgentRunner
- Layer 3: Planning - 10 tests
  - PLN-001 through PLN-006: TaskDecomposer, DependencyResolver, TimeEstimator, PlanGenerator, DynamicReplanner, TaskSplitter

#### Category 2: ADR Constraint Tests (~105 tests)
- ADR-001: Zustand + TanStack Query (10 tests)
- ADR-002: Five Specialized Agents (10 tests)
- ADR-003: SQLite + JSON Hybrid (10 tests)
- ADR-004: Git Worktrees (12 tests)
- ADR-005: EventEmitter3 (10 tests)
- ADR-006: Multi-LLM Provider (12 tests)
- ADR-007: 30-Minute Task Limit (10 tests)
- ADR-008: 50 QA Iteration Limit (10 tests)
- ADR-009: Electron Desktop (8 tests)
- ADR-010: Monorepo Structure (13 tests)

#### Category 3: Integration Tests (~120 tests)
- SEQ-GEN-001: Interview Sequence (12 tests)
- SEQ-GEN-002: Planning Sequence (12 tests)
- SEQ-GEN-003: Execution Sequence (15 tests)
- SEQ-EVO-001: Context Analysis (10 tests)
- SEQ-EVO-002: Feature Planning (10 tests)
- SEQ-EVO-003: Evolution Execution (12 tests)
- SEQ-QA-001: Full QA Loop (15 tests)
- SEQ-CHK-001: Automatic Checkpoint (10 tests)
- SEQ-CHK-002: Checkpoint Recovery (10 tests)
- SEQ-AGT-001: Planner → Coder Handoff (8 tests)
- SEQ-AGT-002: Coder → Reviewer Handoff (8 tests)
- SEQ-AGT-003: Reviewer → Merger Handoff (8 tests)

#### Category 4: Workflow Tests (~155 tests)
**Genesis Mode E2E (75 tests):**
- GEN-E2E-001: Complete Genesis Flow (Simple App) - 12 tests
- GEN-E2E-002: Genesis with Research - 8 tests
- GEN-E2E-003: Genesis with Complex App - 10 tests
- GEN-E2E-004: Genesis Recovery - 10 tests
- GEN-E2E-005: Genesis Human Escalation - 8 tests
- GEN-E2E-006: Genesis with Minimal Input - 8 tests
- GEN-E2E-007: Genesis with Git Conflicts - 10 tests
- GEN-E2E-008: Genesis Cost Tracking - 9 tests

**Evolution Mode E2E (80 tests):**
- EVO-E2E-001: Add Simple Feature - 12 tests
- EVO-E2E-002: Add Complex Feature - 10 tests
- EVO-E2E-003: Evolution Pattern Matching - 10 tests
- EVO-E2E-004: Evolution with Merge Conflicts - 10 tests
- EVO-E2E-005: Evolution Context Freshness - 10 tests
- EVO-E2E-006: Evolution PR Creation - 10 tests
- EVO-E2E-007: Evolution Impact Analysis - 10 tests
- EVO-E2E-008: Evolution Rollback - 8 tests

#### Category 5: Phase 13 Feature Tests (~70 tests)
- P13-001: RepoMapGenerator - 8 tests
- P13-002: CodebaseAnalyzer - 10 tests
- P13-003: Code Embeddings / MemorySystem Extension - 10 tests
- P13-004: FreshContextManager - 8 tests
- P13-005: DynamicContextProvider - 10 tests
- P13-006: RalphStyleIterator - 10 tests
- P13-007: DynamicReplanner - 8 tests
- P13-008: SelfAssessmentEngine - 6 tests

#### Category 6: Phase 14B Binding Tests (~85 tests)
**QA Runners (25 tests):**
- P14B-QA-001: BuildRunner - 6 tests
- P14B-QA-002: LintRunner - 5 tests
- P14B-QA-003: TestRunner - 5 tests
- P14B-QA-004: ReviewRunner - 5 tests
- P14B-QA-005: QARunnerFactory - 4 tests

**Planning (15 tests):**
- P14B-PLN-001: TaskDecomposer - 6 tests
- P14B-PLN-002: DependencyResolver - 5 tests
- P14B-PLN-003: TimeEstimator - 4 tests

**Agents (40 tests):**
- P14B-AGT-001: BaseAgentRunner - 6 tests
- P14B-AGT-002: CoderAgent - 6 tests
- P14B-AGT-003: TesterAgent - 5 tests
- P14B-AGT-004: ReviewerAgent - 5 tests
- P14B-AGT-005: MergerAgent - 6 tests
- P14B-AGT-006: AgentPool - 12 tests

**Wiring (5 tests):**
- P14B-WIRE-001: NexusFactory - 5 tests

#### Category 7: Silent Failure Tests (~35 tests)
- SF-EMPTY: Empty Results Instead of Errors - 5 tests
- SF-DRIFT: State Drift - 4 tests
- SF-EVENT: Event Delivery Failures - 3 tests
- SF-FALLBACK: Fallback Masking Errors - 3 tests
- SF-LEAK: Resource Leaks - 4 tests
- SF-QA: QA Bypasses - 4 tests
- SF-CTX: Context Issues - 3 tests
- SF-TYPE: Type Mismatches - 4 tests
- SF-CONCURRENCY: Concurrency Issues - 3 tests
- SF-CONFIG: Configuration Issues - 2 tests

#### Category 8: Edge Case Tests (~34 tests)
**Layer Edge Cases (28 tests):**
- Layer 7 Infrastructure: 5 tests
- Layer 6 Persistence: 4 tests
- Layer 5 Quality: 4 tests
- Layer 4 Execution: 4 tests
- Layer 3 Planning: 4 tests
- Layer 2 Orchestration: 4 tests
- Layer 1 UI: 3 tests

**Boundary Tests (6 tests):**
- BOUNDARY-001: Task Duration at 30 minutes
- BOUNDARY-002: Iteration Count at 50
- BOUNDARY-003: Context Size at token limit
- BOUNDARY-004: Maximum Concurrent Agents
- BOUNDARY-005: Maximum Task Dependencies
- BOUNDARY-006: Zero-Length Operations

### Final Prompt Structure

The final testing prompt (`NEXUS_COMPREHENSIVE_TESTING_PROMPT.md`) will be structured as follows:

```markdown
# Nexus Comprehensive Testing Prompt

## Metadata
- Total Tests: 717
- Categories: 8
- Generated: 2026-01-19
- Source: Phases 1-14B Documentation

## Instructions for Test Runner (Ralph)
[Setup and execution instructions]

## Test Execution Order
1. Unit Tests (Components) - ~113 tests
2. ADR Constraint Tests - ~105 tests
3. Integration Tests (Sequences) - ~120 tests
4. Workflow Tests (E2E) - ~155 tests
5. Phase 13 Feature Tests - ~70 tests
6. Phase 14B Binding Tests - ~85 tests
7. Silent Failure Tests - ~35 tests
8. Edge Case Tests - ~34 tests

## Category 1-8: [All test sections]

## Final Verification Checklist
[Pass/fail criteria]

## Report Generation
[Output format specification]
```

### Verification Checklist

Before marking Phase 15 complete, verify:

- [x] All 10 extraction tasks (1-10) are COMPLETE
- [x] Test count >= 700 (actual: 717)
- [x] All 8 categories have tests
- [x] Silent failure tests cover all critical areas
- [x] Edge case tests cover all 7 layers
- [x] Each test has VERIFY statements
- [x] Each test has SILENT_FAILURE_CHECK where applicable
- [x] Each test has INTEGRATION_CHECK where applicable
- [ ] Final prompt file created (Task 12)
- [ ] Final prompt file is ~2000+ lines (Task 12)

### Test Coverage Analysis

| Area | Coverage Status |
|------|-----------------|
| Layer 7 Infrastructure | ✅ Complete (5 components) |
| Layer 6 Persistence | ✅ Complete (6 components) |
| Layer 5 Quality | ✅ Complete (5 components) |
| Layer 4 Execution | ✅ Complete (6 components) |
| Layer 3 Planning | ✅ Complete (6 components) |
| Layer 2 Orchestration | ✅ Complete (6 components) |
| Layer 1 UI | ✅ Complete (7 components) |
| ADR Constraints | ✅ Complete (10 ADRs) |
| Genesis Mode | ✅ Complete (8 E2E tests) |
| Evolution Mode | ✅ Complete (8 E2E tests) |
| Phase 13 Features | ✅ Complete (8 features) |
| Phase 14B Bindings | ✅ Complete (15 components) |
| Silent Failures | ✅ Complete (10 categories) |
| Edge Cases | ✅ Complete (7 layers + 6 boundaries) |

### Critical Path Tests

These tests are CRITICAL and must pass for Nexus to be production-ready:

1. **QA Loop Integrity**
   - SF-QA-001: QA Step Skipped
   - SF-QA-002: Iteration Count Manipulation
   - SF-QA-003: Escalation Bypass
   - BOUNDARY-002: Iteration Count at 50

2. **Agent Execution**
   - P14B-AGT-002: CoderAgent (real code generation)
   - P14B-AGT-006: AgentPool (no stubs)
   - SF-DRIFT-003: Agent State Mismatch

3. **Data Integrity**
   - SF-DRIFT-001: Memory vs Database Mismatch
   - PER-003: CheckpointManager (recovery)
   - EDGE-PER-004: Corruption Recovery

4. **Context Management**
   - P13-004: FreshContextManager
   - SF-CTX-001: Context Truncation
   - SF-CTX-002: Stale Context

5. **Workflow Completion**
   - GEN-E2E-001: Complete Genesis Flow
   - EVO-E2E-001: Add Simple Feature
   - SEQ-QA-001: Full QA Loop

---

**[TASK 11 COMPLETE]**

Task 11 synthesized all 10 extraction tasks into:
- 8 test categories with 717 total tests
- Final prompt structure specification
- Verification checklist
- Coverage analysis
- Critical path identification

The accumulator is now ready for Task 12: Assembly of the final testing prompt.
