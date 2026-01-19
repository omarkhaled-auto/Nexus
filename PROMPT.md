# Phase 15: Comprehensive Nexus Testing Prompt Generator

## MISSION CRITICAL - READ CAREFULLY

This is a **META-PROMPT**. Your job is NOT to test Nexus directly. Your job is to **GENERATE a comprehensive testing prompt** that will be run in a SEPARATE Ralph session to verify every feature of Nexus works correctly.

**Output:** A single file `NEXUS_COMPREHENSIVE_TESTING_PROMPT.md` (~2,000+ lines) that contains detailed instructions for testing EVERY component, integration, workflow, and silent failure mode in Nexus.

---

## Project Paths

- **Nexus Project:** `C:\Users\Omar Khaled\OneDrive\Desktop\Nexus`
- **Source Documents (in Nexus root):**
  - `07_NEXUS_MASTER_BOOK.md` - Complete architecture reference
  - `06_INTEGRATION_SPECIFICATION.md` - Build specs, sequences, tests
  - `05_ARCHITECTURE_BLUEPRINT.md` - 7 layers, 40+ components
  - `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` - Context management features
  - `PHASE_14B_ANALYSIS.md` (in .agent/workspace/) - Execution bindings analysis

---

## THE ACCUMULATOR PATTERN

You will use an **ACCUMULATOR FILE** to build the testing prompt incrementally:

```
File: .agent/workspace/TESTING_PROMPT_ACCUMULATOR.md
```

**Pattern:**
1. Create the accumulator file with header structure
2. After EACH extraction task, APPEND findings to the accumulator
3. Each append adds a new section of tests
4. Final task assembles everything into the output file

**Why This Pattern:**
- Prevents context loss over long extraction process
- Creates checkpoint at each phase
- Allows review of intermediate progress
- Ensures nothing is missed

---

## PHASE STRUCTURE (12 Tasks)

```
PHASE A: SETUP & FOUNDATION EXTRACTION
======================================
Task 1: Create Accumulator + Extract Layer Architecture
Task 2: Extract All 40+ Components from Master Book
Task 3: Extract All ADRs and Constraints

PHASE B: INTEGRATION & WORKFLOW EXTRACTION
==========================================
Task 4: Extract Integration Sequences from Integration Spec
Task 5: Extract Genesis Mode Workflow Tests
Task 6: Extract Evolution Mode Workflow Tests

PHASE C: PHASE 13 & 14B EXTRACTION
==================================
Task 7: Extract Phase 13 Context Enhancement Features
Task 8: Extract Phase 14B Execution Bindings (QA Runners, Agents, Planning)

PHASE D: SILENT FAILURE ANALYSIS
================================
Task 9: Generate Silent Failure Tests for All Components
Task 10: Generate Edge Case and Boundary Tests

PHASE E: SYNTHESIS & ASSEMBLY
=============================
Task 11: Synthesize All Extractions into Test Categories
Task 12: Assemble Final Testing Prompt

[PHASE 15 COMPLETE]
```

---

# ============================================================================
# PHASE A: SETUP & FOUNDATION EXTRACTION
# ============================================================================

## Task 1: Create Accumulator + Extract Layer Architecture

### Objective
Create the accumulator file and extract the 7-layer architecture for testing.

### Instructions

**Step 1: Create the accumulator file**

Create `.agent/workspace/TESTING_PROMPT_ACCUMULATOR.md` with this initial structure:

```markdown
# Nexus Comprehensive Testing Prompt - Accumulator

> This file is built incrementally by Phase 15.
> Each task appends a new section.
> Final assembly produces NEXUS_COMPREHENSIVE_TESTING_PROMPT.md

---

## Extraction Log

| Task | Description | Status | Tests Added |
|------|-------------|--------|-------------|
| 1 | Layer Architecture | PENDING | 0 |
| 2 | Component Catalog | PENDING | 0 |
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
```

**Step 2: Read the Master Book**

Read `07_NEXUS_MASTER_BOOK.md` and extract the 7-layer architecture:

| Layer | Name | Purpose |
|-------|------|---------|
| 7 | Infrastructure | FileSystem, Git, Worktree, LSP, Process |
| 6 | Persistence | Database, Schema, State, Checkpoint, Memory |
| 5 | Quality | Build, Lint, Test, Review, QALoop |
| 4 | Execution | AgentRunner, ToolExecutor, Context |
| 3 | Planning | TaskDecomposer, DependencyResolver, TimeEstimator |
| 2 | Orchestration | NexusCoordinator, AgentPool, TaskQueue, EventBus |
| 1 | UI | Interview, Kanban, Dashboard, Components |

**Step 3: Append to accumulator**

Append this section to the accumulator:

```markdown
---

## SECTION 1: LAYER ARCHITECTURE TESTS

### Layer 7: Infrastructure Tests

#### INF-001: FileSystemService
```
TEST: FileSystemService reads files correctly
VERIFY: readFile() returns file contents
VERIFY: readFile() throws on non-existent file
VERIFY: writeFile() creates new file
VERIFY: writeFile() overwrites existing file
VERIFY: listDirectory() returns correct entries
VERIFY: exists() returns true for existing files
VERIFY: exists() returns false for non-existent files
SILENT_FAILURE_CHECK: Empty string returned instead of error for missing file
```

#### INF-002: GitService
```
TEST: GitService manages repositories
VERIFY: init() creates new repository
VERIFY: clone() clones remote repository
VERIFY: commit() creates commit with message
VERIFY: branch() creates new branch
VERIFY: checkout() switches branches
VERIFY: diff() returns changes
VERIFY: status() returns current state
SILENT_FAILURE_CHECK: Empty diff returned when changes exist
SILENT_FAILURE_CHECK: Commit succeeds but files not staged
```

#### INF-003: WorktreeManager
```
TEST: WorktreeManager handles git worktrees
VERIFY: create() creates new worktree
VERIFY: remove() removes worktree
VERIFY: list() returns all worktrees
VERIFY: getPath() returns correct path
VERIFY: cleanup() removes orphaned worktrees
SILENT_FAILURE_CHECK: Worktree created but not tracked
SILENT_FAILURE_CHECK: Remove fails silently, worktree still exists
SILENT_FAILURE_CHECK: Orphaned worktrees accumulate without cleanup
```

#### INF-004: ProcessRunner
```
TEST: ProcessRunner executes commands
VERIFY: run() executes command and returns output
VERIFY: run() captures stderr
VERIFY: run() respects timeout
VERIFY: run() handles exit codes
VERIFY: kill() terminates running process
SILENT_FAILURE_CHECK: Command fails but exit code 0 returned
SILENT_FAILURE_CHECK: Timeout reached but no error thrown
SILENT_FAILURE_CHECK: stderr ignored, only stdout checked
```

### Layer 6: Persistence Tests

#### PER-001: DatabaseService
```
TEST: DatabaseService manages SQLite operations
VERIFY: connect() establishes connection
VERIFY: query() executes SQL
VERIFY: transaction() wraps in transaction
VERIFY: close() closes connection
SILENT_FAILURE_CHECK: Connection pool exhausted silently
SILENT_FAILURE_CHECK: Transaction commits despite error
```

#### PER-002: StateManager
```
TEST: StateManager tracks application state
VERIFY: getState() returns current state
VERIFY: setState() updates state
VERIFY: subscribe() notifies on change
VERIFY: persist() saves to disk
VERIFY: restore() loads from disk
SILENT_FAILURE_CHECK: State in memory differs from persisted state
SILENT_FAILURE_CHECK: Subscribers not called on state change
SILENT_FAILURE_CHECK: Circular reference causes silent corruption
```

#### PER-003: CheckpointManager
```
TEST: CheckpointManager handles recovery points
VERIFY: create() creates checkpoint
VERIFY: restore() restores from checkpoint
VERIFY: list() returns all checkpoints
VERIFY: delete() removes checkpoint
VERIFY: autoCheckpoint() triggers on interval
SILENT_FAILURE_CHECK: Checkpoint created but incomplete
SILENT_FAILURE_CHECK: Restore succeeds but state corrupted
SILENT_FAILURE_CHECK: Auto-checkpoint disabled without warning
```

#### PER-004: MemorySystem
```
TEST: MemorySystem handles embeddings and search
VERIFY: store() saves embedding
VERIFY: query() returns similar items
VERIFY: storeCodeChunk() saves code with embedding
VERIFY: queryCode() searches code semantically
VERIFY: findUsages() finds symbol usages
SILENT_FAILURE_CHECK: Embedding dimension mismatch ignored
SILENT_FAILURE_CHECK: Query returns empty instead of error on API failure
SILENT_FAILURE_CHECK: Stale embeddings not refreshed
```

### Layer 5: Quality Tests

[Will be filled by Task 2]

### Layer 4: Execution Tests

[Will be filled by Task 2]

### Layer 3: Planning Tests

[Will be filled by Task 2]

### Layer 2: Orchestration Tests

[Will be filled by Task 2]

### Layer 1: UI Tests

[Will be filled by Task 2]
```

**Step 4: Update extraction log**

Update Task 1 in the extraction log:
```
| 1 | Layer Architecture | COMPLETE | 28 |
```

### Task 1 Completion Checklist
- [x] Accumulator file created
- [x] Layer 7 tests extracted (5 components: FileSystemService, GitService, WorktreeManager, LSPClient, ProcessRunner)
- [x] Layer 6 tests extracted (6 components: DatabaseClient, StateManager, CheckpointManager, MemorySystem, RequirementsDB, Schema)
- [x] Silent failure checks included for each
- [x] Extraction log updated

**[TASK 1 COMPLETE]** - Completed 2026-01-19

### Task 1 Completion Notes:
- Created `.agent/workspace/TESTING_PROMPT_ACCUMULATOR.md` with initial structure
- Extracted 11 components (5 Layer 7 + 6 Layer 6) with ~28 test verifications
- Each component includes VERIFY statements, INTEGRATION_CHECKs, and SILENT_FAILURE_CHECKs
- Extraction log shows Task 1 as COMPLETE with 28 tests added

---

## Task 2: Extract All 40+ Components from Master Book

### Objective
Extract every component from the Master Book's component catalog and generate tests.

### Instructions

**Step 1: Read Component Catalog**

Read `07_NEXUS_MASTER_BOOK.md` Part III Section 3.2 "Component Catalog" and extract ALL components:

**Layer 7 - Infrastructure (5 components):**
- INF-01: FileSystemService
- INF-02: GitService
- INF-03: WorktreeManager
- INF-04: LSPClient
- INF-05: ProcessRunner

**Layer 6 - Persistence (6 components):**
- PER-01: DatabaseService
- PER-02: StateManager
- PER-03: CheckpointManager
- PER-04: MemorySystem
- PER-05: RequirementsDB
- PER-06: Schema

**Layer 5 - Quality (4 components):**
- QUA-01: BuildVerifier
- QUA-02: LintRunner
- QUA-03: TestRunner
- QUA-04: CodeReviewer
- QUA-05: QALoopEngine

**Layer 4 - Execution (6 components):**
- EXE-01: ToolExecutor
- EXE-02: CoderRunner/CoderAgent
- EXE-03: TesterRunner/TesterAgent
- EXE-04: ReviewerRunner/ReviewerAgent
- EXE-05: MergerRunner/MergerAgent
- EXE-06: BaseAgentRunner

**Layer 3 - Planning (6 components):**
- PLN-01: TaskDecomposer
- PLN-02: DependencyResolver
- PLN-03: TimeEstimator
- PLN-04: PlanGenerator
- PLN-05: DynamicReplanner (Phase 13)
- PLN-06: TaskSplitter (Phase 14B)

**Layer 2 - Orchestration (6 components):**
- ORC-01: NexusCoordinator
- ORC-02: AgentPool
- ORC-03: TaskQueue
- ORC-04: EventBus
- ORC-05: WorkflowController
- ORC-06: RalphStyleIterator (Phase 14)

**Layer 1 - UI (7 components):**
- UI-01: InterviewPage
- UI-02: KanbanPage
- UI-03: DashboardPage
- UI-04: FeatureCard
- UI-05: AgentStatusGrid
- UI-06: RequirementsSidebar
- UI-07: SettingsPanel

**Step 2: Generate tests for each component**

For EACH component, generate a test block with this structure:

```markdown
#### [COMPONENT-ID]: [ComponentName]
```
TEST: [ComponentName] [primary function]
LOCATION: [file path from Master Book]
METHODS: [list key methods]

VERIFY: [method1]() [expected behavior]
VERIFY: [method2]() [expected behavior]
VERIFY: [method3]() [expected behavior]
...

INTEGRATION_CHECK: [how it integrates with other components]
SILENT_FAILURE_CHECK: [potential silent failure mode 1]
SILENT_FAILURE_CHECK: [potential silent failure mode 2]
```

**Step 3: Append to accumulator**

Append the complete Layer 5, 4, 3, 2, 1 tests to the accumulator, filling in the placeholders from Task 1.

**Example for Layer 5:**

```markdown
### Layer 5: Quality Tests

#### QUA-001: BuildVerifier
```
TEST: BuildVerifier runs TypeScript compilation
LOCATION: src/execution/qa/BuildRunner.ts
METHODS: run(), createCallback(), parseErrors()

VERIFY: run() spawns tsc process
VERIFY: run() parses TypeScript errors correctly
VERIFY: run() returns BuildResult with errors array
VERIFY: run() handles timeout
VERIFY: createCallback() returns QARunner-compatible function
VERIFY: parseErrors() extracts file, line, column, message

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.build
SILENT_FAILURE_CHECK: tsc succeeds but wrong tsconfig used
SILENT_FAILURE_CHECK: Errors parsed but wrong format returned
SILENT_FAILURE_CHECK: Timeout reached but partial result returned as success
```

#### QUA-002: LintRunner
```
TEST: LintRunner runs ESLint
LOCATION: src/execution/qa/LintRunner.ts
METHODS: run(), runWithFix(), createCallback(), parseJsonOutput()

VERIFY: run() spawns eslint process
VERIFY: run() uses --format json
VERIFY: runWithFix() passes --fix flag
VERIFY: parseJsonOutput() extracts errors and warnings
VERIFY: createCallback() returns QARunner-compatible function

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.lint
SILENT_FAILURE_CHECK: ESLint config missing, runs with defaults silently
SILENT_FAILURE_CHECK: Fixable issues not fixed despite --fix
SILENT_FAILURE_CHECK: Warnings treated as success when they shouldn't be
```

#### QUA-003: TestRunner
```
TEST: TestRunner runs Vitest
LOCATION: src/execution/qa/TestRunner.ts
METHODS: run(), runFiles(), runWithCoverage(), createCallback()

VERIFY: run() spawns vitest process
VERIFY: run() parses JSON output
VERIFY: runFiles() runs specific test files
VERIFY: runWithCoverage() includes coverage data
VERIFY: parseOutput() extracts passed/failed/skipped counts

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.test
SILENT_FAILURE_CHECK: Tests skip silently, pass count inflated
SILENT_FAILURE_CHECK: Coverage below threshold but not flagged
SILENT_FAILURE_CHECK: Test timeout not enforced, hangs indefinitely
```

#### QUA-004: CodeReviewer / ReviewRunner
```
TEST: ReviewRunner calls Gemini for code review
LOCATION: src/execution/qa/ReviewRunner.ts
METHODS: run(), createCallback(), parseReviewResponse()

VERIFY: run() calls GeminiClient
VERIFY: run() builds review prompt with diff
VERIFY: parseReviewResponse() extracts approval status
VERIFY: parseReviewResponse() extracts issues array
VERIFY: createCallback() returns QARunner-compatible function

INTEGRATION_CHECK: Plugs into RalphStyleIterator via QARunner.review
SILENT_FAILURE_CHECK: Gemini API fails, returns approved=true anyway
SILENT_FAILURE_CHECK: Review prompt too long, truncated without warning
SILENT_FAILURE_CHECK: JSON parse fails, default approval returned
```

#### QUA-005: QALoopEngine / RalphStyleIterator
```
TEST: RalphStyleIterator orchestrates QA pipeline
LOCATION: src/orchestration/iteration/RalphStyleIterator.ts
METHODS: run(), iterate(), checkQA(), escalate()

VERIFY: run() executes Build -> Lint -> Test -> Review sequence
VERIFY: run() respects 50 iteration maximum
VERIFY: run() escalates when limit reached
VERIFY: iterate() calls agent for fixes
VERIFY: checkQA() aggregates all QA results

INTEGRATION_CHECK: Uses QARunner callbacks, AgentRunner, EscalationHandler
SILENT_FAILURE_CHECK: QA step skipped but iteration counted
SILENT_FAILURE_CHECK: Escalation triggered but handler not called
SILENT_FAILURE_CHECK: State machine gets stuck in invalid state
SILENT_FAILURE_CHECK: 50 iterations reached but no escalation
```
```

**Continue for ALL remaining components in Layers 4, 3, 2, 1...**

### Task 2 Completion Checklist
- [x] All Layer 5 components extracted (5)
- [x] All Layer 4 components extracted (6)
- [x] All Layer 3 components extracted (6)
- [x] All Layer 2 components extracted (6)
- [x] All Layer 1 components extracted (7)
- [x] Each has VERIFY, INTEGRATION_CHECK, SILENT_FAILURE_CHECK
- [x] Extraction log updated

**[TASK 2 COMPLETE]** - Completed 2026-01-19

### Task 2 Completion Notes:
- Extracted 30 components across Layers 5, 4, 3, 2, and 1
- Each component includes LOCATION, METHODS, VERIFY statements, INTEGRATION_CHECKs, and SILENT_FAILURE_CHECKs
- ~85 new tests added to accumulator
- Accumulator extraction log updated with Task 2 as COMPLETE

---

## Task 3: Extract All ADRs and Constraints

### Objective
Extract all Architecture Decision Records and their testable constraints.

### Instructions

**Step 1: Read ADRs from Master Book**

Read `07_NEXUS_MASTER_BOOK.md` Section 3.5 "Architecture Decision Records" and extract all 10 ADRs:

| ADR | Decision | Testable Constraint |
|-----|----------|---------------------|
| ADR-001 | Zustand + TanStack Query | State updates propagate to UI |
| ADR-002 | Five Specialized Agents | Each agent type has distinct role |
| ADR-003 | SQLite + JSON Hybrid | JSON columns validate with Zod |
| ADR-004 | Git Worktrees | Each task gets isolated worktree |
| ADR-005 | EventEmitter3 | Events delivered to all subscribers |
| ADR-006 | Multi-LLM Provider | Claude and Gemini both work |
| ADR-007 | 30-Minute Task Limit | Tasks over 30 min get split |
| ADR-008 | 50 QA Iteration Limit | Escalation at iteration 50 |
| ADR-009 | Electron Desktop | App runs in Electron |
| ADR-010 | Monorepo Structure | All code in single repo |

**Step 2: Generate constraint tests**

For EACH ADR, generate tests that verify the constraint is enforced:

```markdown
## SECTION 3: ARCHITECTURE CONSTRAINT TESTS

### ADR-001: Zustand + TanStack Query
```
TEST: State management uses Zustand correctly
CONSTRAINT: State updates must propagate to UI components

VERIFY: useStore() returns current state
VERIFY: setState() triggers re-render
VERIFY: subscribe() calls listener on change
VERIFY: persist middleware saves to localStorage
VERIFY: TanStack Query caches API responses

SILENT_FAILURE_CHECK: State updates but UI doesn't re-render
SILENT_FAILURE_CHECK: Persistence fails, falls back to memory without warning
```

### ADR-002: Five Specialized Agents
```
TEST: Five agent types exist with distinct roles
CONSTRAINT: Planner, Coder, Tester, Reviewer, Merger each have specific responsibilities

VERIFY: Planner uses Claude Opus for decomposition
VERIFY: Coder uses Claude Sonnet for code generation
VERIFY: Tester uses Claude Sonnet for test writing
VERIFY: Reviewer uses Gemini for code review
VERIFY: Merger uses Claude Sonnet for conflict resolution

SILENT_FAILURE_CHECK: Wrong model used for agent type
SILENT_FAILURE_CHECK: Agent assigned task outside its role
```

### ADR-003: SQLite + JSON Hybrid
```
TEST: JSON columns are validated with Zod
CONSTRAINT: All JSON data must pass schema validation

VERIFY: JSON columns serialize correctly
VERIFY: Invalid JSON rejected with error
VERIFY: Zod schemas validate on insert
VERIFY: Zod schemas validate on update

SILENT_FAILURE_CHECK: Invalid JSON stored without validation
SILENT_FAILURE_CHECK: Zod schema mismatch ignored
```

### ADR-004: Git Worktrees
```
TEST: Each task gets isolated worktree
CONSTRAINT: Task execution must not affect main branch

VERIFY: createWorktree() creates isolated directory
VERIFY: Task changes don't appear in main
VERIFY: Worktree cleaned up after task completes
VERIFY: Parallel tasks use separate worktrees

SILENT_FAILURE_CHECK: Worktree reused between tasks
SILENT_FAILURE_CHECK: Cleanup fails, orphaned worktrees accumulate
SILENT_FAILURE_CHECK: Changes leak to main branch
```

### ADR-005: EventEmitter3
```
TEST: Events delivered to all subscribers
CONSTRAINT: EventBus must guarantee delivery

VERIFY: emit() calls all subscribers
VERIFY: subscribe() registers handler
VERIFY: unsubscribe() removes handler
VERIFY: Events have correct type and payload

SILENT_FAILURE_CHECK: Subscriber throws, others not called
SILENT_FAILURE_CHECK: Event emitted but no subscribers registered
SILENT_FAILURE_CHECK: Wrong event type delivered
```

### ADR-006: Multi-LLM Provider
```
TEST: Claude and Gemini both work
CONSTRAINT: System must support multiple LLM providers

VERIFY: ClaudeClient connects to Anthropic API
VERIFY: GeminiClient connects to Google API
VERIFY: Fallback works when primary fails
VERIFY: Rate limiting respected for both

SILENT_FAILURE_CHECK: API key invalid but cached response returned
SILENT_FAILURE_CHECK: Rate limit exceeded, requests silently queued forever
SILENT_FAILURE_CHECK: Wrong provider used for task type
```

### ADR-007: 30-Minute Task Limit
```
TEST: Tasks over 30 minutes get split
CONSTRAINT: No single task should exceed 30 minutes

VERIFY: TaskDecomposer rejects tasks > 30 min
VERIFY: TaskSplitter splits oversized tasks
VERIFY: TimeEstimator calculates accurate estimates
VERIFY: Validation runs before task execution

SILENT_FAILURE_CHECK: 45-minute task accepted without split
SILENT_FAILURE_CHECK: Time estimate wrong, task runs 2 hours
SILENT_FAILURE_CHECK: Split creates invalid task dependencies
```

### ADR-008: 50 QA Iteration Limit
```
TEST: Escalation at iteration 50
CONSTRAINT: QA loop must not run forever

VERIFY: Iteration counter increments correctly
VERIFY: Escalation triggered at iteration 50
VERIFY: Human notification sent on escalation
VERIFY: Task marked as escalated in database

SILENT_FAILURE_CHECK: Counter resets, runs 100+ iterations
SILENT_FAILURE_CHECK: Escalation triggered but no handler
SILENT_FAILURE_CHECK: Iteration 50 reached, continues anyway
```

### ADR-009: Electron Desktop
```
TEST: App runs in Electron
CONSTRAINT: Must be a desktop application

VERIFY: Main process starts correctly
VERIFY: Renderer process loads React app
VERIFY: IPC communication works
VERIFY: Native file dialogs work

SILENT_FAILURE_CHECK: Electron crash not reported
SILENT_FAILURE_CHECK: IPC message lost between processes
```

### ADR-010: Monorepo Structure
```
TEST: All code in single repo
CONSTRAINT: No external package dependencies for core

VERIFY: All imports resolve within monorepo
VERIFY: Shared types accessible from all layers
VERIFY: Build produces single artifact

SILENT_FAILURE_CHECK: Circular dependency not detected
SILENT_FAILURE_CHECK: Type mismatch between layers
```
```

**Step 3: Append to accumulator**

Append Section 3 to the accumulator file.

### Task 3 Completion Checklist
- [x] All 10 ADRs extracted
- [x] Each ADR has testable constraints
- [x] Each has SILENT_FAILURE_CHECK
- [x] Extraction log updated

**[TASK 3 COMPLETE]** - Completed 2026-01-19

### Task 3 Completion Notes:
- Extracted all 10 ADRs from Master Book Section 3.5
- Each ADR includes VERIFY statements, INTEGRATION_CHECKs, and SILENT_FAILURE_CHECKs
- Added specialized checks (SIZING_GUIDELINES, ESCALATION_FLOW, DIRECTORY_STRUCTURE)
- ~105 new constraint tests added to accumulator
- Accumulator extraction log updated with Task 3 as COMPLETE

---

# ============================================================================
# PHASE B: INTEGRATION & WORKFLOW EXTRACTION
# ============================================================================

## Task 4: Extract Integration Sequences from Integration Spec

### Objective
Extract all integration sequences documented in the Integration Specification.

### Instructions

**Step 1: Read Integration Specification**

Read `06_INTEGRATION_SPECIFICATION.md` and extract all documented sequences:

| Sequence ID | Name | Components Involved |
|-------------|------|---------------------|
| SEQ-GEN-001 | Interview Sequence | InterviewPage, Claude, RequirementsDB |
| SEQ-GEN-002 | Planning Sequence | TaskDecomposer, DependencyResolver, TaskQueue |
| SEQ-GEN-003 | Execution Sequence | AgentPool, CoderAgent, QALoopEngine |
| SEQ-EVO-001 | Context Analysis | ContextAnalyzer, MemorySystem, RepoMap |
| SEQ-EVO-002 | Feature Planning | TaskDecomposer, KanbanBoard |
| SEQ-EVO-003 | Evolution Execution | Same as Genesis + PR creation |
| SEQ-QA-001 | Full QA Loop | Build, Lint, Test, Review (6 phases) |
| SEQ-CHK-001 | Automatic Checkpoint | CheckpointManager, StateManager |
| SEQ-CHK-002 | Checkpoint Recovery | CheckpointManager, StateManager |
| SEQ-AGT-001 | Planner → Coder Handoff | TaskDecomposer, AgentPool, CoderAgent |
| SEQ-AGT-002 | Coder → Reviewer Handoff | CoderAgent, ReviewerAgent |
| SEQ-AGT-003 | Reviewer → Merger Handoff | ReviewerAgent, MergerAgent |

**Step 2: Generate integration tests for each sequence**

```markdown
## SECTION 4: INTEGRATION SEQUENCE TESTS

### SEQ-GEN-001: Interview Sequence
```
TEST: Interview captures requirements correctly
FLOW: User Input -> InterviewPage -> Claude -> RequirementsDB

STEP 1: User enters project description
VERIFY: InterviewPage captures input

STEP 2: Claude generates follow-up questions
VERIFY: Claude API called with context
VERIFY: Response displayed in UI

STEP 3: User answers questions
VERIFY: Answers appended to context

STEP 4: Interview completes
VERIFY: RequirementsDB populated
VERIFY: Requirements have categories
VERIFY: Requirements have priorities

INTEGRATION_CHECK: Data flows correctly between all components
SILENT_FAILURE_CHECK: Claude response ignored, empty requirements saved
SILENT_FAILURE_CHECK: RequirementsDB write fails, interview continues
SILENT_FAILURE_CHECK: User input truncated without warning
```

### SEQ-GEN-002: Planning Sequence
```
TEST: Planning decomposes features into tasks
FLOW: Requirements -> TaskDecomposer -> DependencyResolver -> TaskQueue

STEP 1: Requirements loaded from RequirementsDB
VERIFY: All requirements retrieved

STEP 2: TaskDecomposer calls Claude for decomposition
VERIFY: Claude returns task list
VERIFY: Each task < 30 minutes

STEP 3: DependencyResolver orders tasks
VERIFY: Topological sort applied
VERIFY: No circular dependencies

STEP 4: Tasks enqueued
VERIFY: TaskQueue contains all tasks
VERIFY: Tasks ordered by wave

INTEGRATION_CHECK: Decomposition output matches queue input format
SILENT_FAILURE_CHECK: Claude returns malformed JSON, partial tasks created
SILENT_FAILURE_CHECK: Dependency cycle ignored, execution deadlocks
SILENT_FAILURE_CHECK: Tasks enqueued but status not updated
```

### SEQ-GEN-003: Execution Sequence
```
TEST: Execution completes tasks with QA
FLOW: TaskQueue -> AgentPool -> CoderAgent -> QALoopEngine -> Merge

STEP 1: Task dequeued
VERIFY: Highest priority task selected

STEP 2: Agent spawned
VERIFY: CoderAgent created with correct model

STEP 3: Agent executes task
VERIFY: Code generated in worktree
VERIFY: Files created/modified

STEP 4: QA loop runs
VERIFY: Build passes (tsc)
VERIFY: Lint passes (eslint)
VERIFY: Tests pass (vitest)
VERIFY: Review approves (Gemini)

STEP 5: Changes merged
VERIFY: Worktree merged to main
VERIFY: Task marked complete

INTEGRATION_CHECK: All components coordinate correctly
SILENT_FAILURE_CHECK: Agent fails silently, task marked complete
SILENT_FAILURE_CHECK: QA step skipped, bad code merged
SILENT_FAILURE_CHECK: Merge conflict ignored, code corrupted
```

### SEQ-QA-001: Full QA Loop
```
TEST: QA loop iterates until pass or escalation
FLOW: CoderAgent -> Build -> Lint -> Test -> Review -> (Fix or Complete)

ITERATION 1-N:
STEP 1: Run build (tsc --noEmit)
VERIFY: BuildResult returned
IF FAIL: Errors sent to agent for fix

STEP 2: Run lint (eslint)
VERIFY: LintResult returned
IF FAIL: Errors sent to agent for fix

STEP 3: Run tests (vitest)
VERIFY: TestResult returned
IF FAIL: Failures sent to agent for fix

STEP 4: Run review (Gemini)
VERIFY: ReviewResult returned
IF NOT APPROVED: Issues sent to agent for fix

STEP 5: Check iteration count
IF < 50 AND NOT ALL PASS: Go to Step 1
IF >= 50: Escalate to human
IF ALL PASS: Complete task

INTEGRATION_CHECK: Each step feeds into next correctly
SILENT_FAILURE_CHECK: Build step returns success despite errors
SILENT_FAILURE_CHECK: Iteration count not incremented
SILENT_FAILURE_CHECK: Escalation threshold bypassed
```

[Continue for SEQ-EVO-001, SEQ-EVO-002, SEQ-EVO-003, SEQ-CHK-001, SEQ-CHK-002, SEQ-AGT-001, SEQ-AGT-002, SEQ-AGT-003...]
```

**Step 3: Append to accumulator**

Append Section 4 to the accumulator file.

### Task 4 Completion Checklist
- [x] All 12 sequences extracted
- [x] Each sequence has step-by-step verification
- [x] Integration checks included
- [x] Silent failure checks included
- [x] Extraction log updated

**[TASK 4 COMPLETE]** - Completed 2026-01-19

### Task 4 Completion Notes:
- Extracted 12 integration sequences from Integration Specification (06_INTEGRATION_SPECIFICATION.md)
- Each sequence includes PURPOSE, TRIGGER, step-by-step VERIFY statements
- All sequences have INTEGRATION_CHECK and SILENT_FAILURE_CHECK statements
- Sequences cover Genesis Mode, Evolution Mode, QA Loop, Checkpoints, and Agent Handoffs
- ~120 new integration tests added to accumulator
- Accumulator extraction log updated with Task 4 as COMPLETE

---

## Task 5: Extract Genesis Mode Workflow Tests

### Objective
Create end-to-end workflow tests for Genesis Mode.

### Instructions

**Step 1: Read Genesis Mode flow from Master Book**

Genesis Mode Flow:
1. Interview Engine - Capture requirements
2. Research Engine - Market analysis (optional)
3. Planning Engine - Decompose into tasks
4. Execution Engine - Multi-agent development
5. Delivery - Tested, deployable code

**Step 2: Generate E2E workflow tests**

```markdown
## SECTION 5: GENESIS MODE WORKFLOW TESTS

### GEN-E2E-001: Complete Genesis Flow (Simple App)
```
TEST: Genesis mode creates simple CLI app from scratch
INPUT: "I want a CLI calculator that adds and subtracts numbers"
EXPECTED_OUTPUT: Working CLI app with tests

PHASE 1: INTERVIEW
VERIFY: Interview UI loads
VERIFY: User can enter description
VERIFY: Claude asks clarifying questions
VERIFY: Requirements captured (minimum 3)
VERIFY: User can approve requirements

PHASE 2: PLANNING
VERIFY: TaskDecomposer creates feature list
VERIFY: Features decomposed into tasks
VERIFY: Each task < 30 minutes
VERIFY: Dependencies resolved
VERIFY: Execution plan displayed

PHASE 3: EXECUTION
VERIFY: Tasks execute in order
VERIFY: CoderAgent generates code
VERIFY: TesterAgent generates tests
VERIFY: QA loop validates each task
VERIFY: Progress visible in UI

PHASE 4: DELIVERY
VERIFY: All tasks complete
VERIFY: Code compiles (tsc)
VERIFY: Tests pass (vitest)
VERIFY: Lint passes (eslint)
VERIFY: Project runnable

TOTAL_TIME_LIMIT: 30 minutes for simple app
SILENT_FAILURE_CHECK: Interview completes but requirements empty
SILENT_FAILURE_CHECK: Planning succeeds but 0 tasks generated
SILENT_FAILURE_CHECK: Execution completes but code doesn't compile
SILENT_FAILURE_CHECK: Tests pass but functionality broken
```

### GEN-E2E-002: Genesis with Research
```
TEST: Genesis mode includes market research
INPUT: "Build a task management app like Todoist"
EXPECTED: Research data influences feature planning

VERIFY: Research Engine activated
VERIFY: Competitor features analyzed
VERIFY: UX patterns identified
VERIFY: Research influences task decomposition
VERIFY: MVP scope suggested

SILENT_FAILURE_CHECK: Research fails silently, continues without data
SILENT_FAILURE_CHECK: Research data ignored in planning
```

### GEN-E2E-003: Genesis with Complex App
```
TEST: Genesis handles complex multi-feature app
INPUT: "Build a full-stack e-commerce site with auth, products, cart, checkout"
EXPECTED: Large app built over multiple waves

VERIFY: Features decomposed hierarchically
VERIFY: Wave-based execution
VERIFY: Parallel tasks execute in parallel
VERIFY: Cross-feature dependencies handled
VERIFY: Checkpoints created every 2 hours

TIME_LIMIT: 8-48 hours depending on complexity
SILENT_FAILURE_CHECK: Wave deadlock, no progress
SILENT_FAILURE_CHECK: Checkpoint restore fails
SILENT_FAILURE_CHECK: Feature interaction bugs not caught
```

### GEN-E2E-004: Genesis Recovery
```
TEST: Genesis recovers from interruption
SETUP: Start Genesis, interrupt at 50% completion
EXPECTED: Resume from checkpoint

VERIFY: Checkpoint exists
VERIFY: restore() loads state
VERIFY: TaskQueue position preserved
VERIFY: Completed tasks not re-executed
VERIFY: Execution continues to completion

SILENT_FAILURE_CHECK: Checkpoint corrupted, full restart required
SILENT_FAILURE_CHECK: Some tasks re-executed unnecessarily
SILENT_FAILURE_CHECK: State mismatch after restore
```

### GEN-E2E-005: Genesis Human Escalation
```
TEST: Genesis escalates stuck tasks to human
SETUP: Task that fails QA 50 times
EXPECTED: Human notification, task paused

VERIFY: Iteration count reaches 50
VERIFY: EscalationHandler triggered
VERIFY: Human notification sent
VERIFY: Task marked as 'escalated'
VERIFY: Other tasks can continue
VERIFY: Human can resolve and resume

SILENT_FAILURE_CHECK: Escalation not triggered
SILENT_FAILURE_CHECK: Notification lost
SILENT_FAILURE_CHECK: System hangs waiting for human
```
```

**Step 3: Append to accumulator**

Append Section 5 to the accumulator file.

### Task 5 Completion Checklist
- [x] 5+ Genesis E2E tests extracted (8 total: GEN-E2E-001 through GEN-E2E-008)
- [x] Each covers full workflow (Interview → Planning → Execution → QA → Delivery)
- [x] Time limits specified (30 min simple, 45 min with research, 8-48h complex)
- [x] Recovery scenarios included (GEN-E2E-004: Recovery from Interruption)
- [x] Silent failure checks included (each test has 3-6 SILENT_FAILURE_CHECKs)
- [x] Extraction log updated (Task 5 marked COMPLETE with 75 tests)

**[TASK 5 COMPLETE]** - Completed 2026-01-19

### Task 5 Completion Notes:
- Extracted 8 comprehensive Genesis Mode E2E workflow tests
- Tests cover: Simple app, Research mode, Complex app, Recovery, Escalation, Minimal input, Conflicts, Cost tracking
- Each test includes phase-by-phase VERIFY statements (~155 total)
- ~75 new workflow tests added to accumulator
- Accumulator extraction log updated with Task 5 as COMPLETE

---

## Task 6: Extract Evolution Mode Workflow Tests

### Objective
Create end-to-end workflow tests for Evolution Mode.

### Instructions

**Step 1: Read Evolution Mode flow from Master Book**

Evolution Mode Flow:
1. Context Analysis - Understand existing codebase
2. Feature Planning - Decompose new feature
3. Kanban Workflow - Visual task management
4. Execution - Same multi-agent QA loop
5. Integration - Merge with PR

**Step 2: Generate E2E workflow tests**

```markdown
## SECTION 6: EVOLUTION MODE WORKFLOW TESTS

### EVO-E2E-001: Add Simple Feature
```
TEST: Evolution adds simple feature to existing codebase
SETUP: Existing React app with basic routing
INPUT: "Add a dark mode toggle"
EXPECTED: Feature added matching existing patterns

PHASE 1: CONTEXT ANALYSIS
VERIFY: Codebase scanned
VERIFY: Existing patterns detected (React, CSS approach)
VERIFY: RepoMap generated
VERIFY: Relevant files identified

PHASE 2: FEATURE PLANNING
VERIFY: Feature decomposed into tasks
VERIFY: Tasks respect existing architecture
VERIFY: Dependencies on existing code identified

PHASE 3: KANBAN
VERIFY: Tasks appear in Backlog
VERIFY: User can drag to In Progress
VERIFY: Execution triggered on drag

PHASE 4: EXECUTION
VERIFY: CoderAgent generates code
VERIFY: New code matches existing style
VERIFY: Existing tests still pass
VERIFY: New tests added

PHASE 5: INTEGRATION
VERIFY: PR created (or direct merge)
VERIFY: Changes isolated to feature
VERIFY: No unrelated changes

SILENT_FAILURE_CHECK: Context analysis misses key patterns
SILENT_FAILURE_CHECK: Generated code conflicts with existing
SILENT_FAILURE_CHECK: Existing tests broken by change
SILENT_FAILURE_CHECK: PR includes unrelated files
```

### EVO-E2E-002: Add Complex Feature
```
TEST: Evolution handles complex multi-file feature
SETUP: Existing Node.js API
INPUT: "Add user authentication with JWT"
EXPECTED: Auth feature across multiple files

VERIFY: Multiple tasks created
VERIFY: Database migration included
VERIFY: API routes added
VERIFY: Middleware created
VERIFY: Tests cover auth flows

SILENT_FAILURE_CHECK: Migration created but not run
SILENT_FAILURE_CHECK: Security vulnerability in auth code
SILENT_FAILURE_CHECK: Existing endpoints broken
```

### EVO-E2E-003: Evolution Pattern Matching
```
TEST: Evolution matches existing code patterns
SETUP: Codebase with specific conventions
INPUT: "Add a new API endpoint"
EXPECTED: New code follows conventions

VERIFY: Function naming matches (camelCase/snake_case)
VERIFY: File structure matches
VERIFY: Error handling matches
VERIFY: Logging matches
VERIFY: Test structure matches

SILENT_FAILURE_CHECK: Pattern detection fails, generic code generated
SILENT_FAILURE_CHECK: Inconsistent style introduced
```

### EVO-E2E-004: Evolution with Merge Conflicts
```
TEST: Evolution handles merge conflicts
SETUP: Changes on main during execution
EXPECTED: Conflicts detected and resolved

VERIFY: Conflict detected
VERIFY: MergerAgent analyzes conflict
VERIFY: Auto-resolution for simple conflicts
VERIFY: Escalation for complex conflicts
VERIFY: Final code is correct

SILENT_FAILURE_CHECK: Conflict missed, code corrupted
SILENT_FAILURE_CHECK: Auto-resolution produces invalid code
SILENT_FAILURE_CHECK: Escalation not triggered for complex conflict
```

### EVO-E2E-005: Evolution Context Freshness
```
TEST: Evolution uses fresh context per task
SETUP: Multiple tasks modifying same file
EXPECTED: Each task sees latest state

VERIFY: FreshContextManager resets context
VERIFY: Task 2 sees Task 1's changes
VERIFY: No stale data in context
VERIFY: Memory system updated after each task

SILENT_FAILURE_CHECK: Task uses stale context, overwrites changes
SILENT_FAILURE_CHECK: Context too large, truncated without warning
```
```

**Step 3: Append to accumulator**

Append Section 6 to the accumulator file.

### Task 6 Completion Checklist
- [x] 5+ Evolution E2E tests extracted (8 total: EVO-E2E-001 through EVO-E2E-008)
- [x] Each covers full workflow (Context Analysis → Feature Planning → Kanban → Execution → QA → Integration)
- [x] Pattern matching tested (EVO-E2E-003: Pattern Matching and Style Consistency)
- [x] Merge conflicts tested (EVO-E2E-004: Evolution with Merge Conflicts)
- [x] Context freshness tested (EVO-E2E-005: Context Freshness Between Tasks)
- [x] Silent failure checks included (each test has 3-4 SILENT_FAILURE_CHECKs)
- [x] Extraction log updated (Task 6 marked COMPLETE with 80 tests)

**[TASK 6 COMPLETE]** - Completed 2026-01-19

### Task 6 Completion Notes:
- Extracted 8 comprehensive Evolution Mode E2E workflow tests
- Tests cover: Simple feature, Complex feature, Pattern matching, Merge conflicts, Context freshness, PR creation, Impact analysis, Rollback
- Each test includes SETUP, INPUT, EXPECTED, TIME_LIMIT specifications
- ~80 new workflow tests added to accumulator with ~235 VERIFY statements
- Accumulator extraction log updated with Task 6 as COMPLETE

---

# ============================================================================
# PHASE C: PHASE 13 & 14B EXTRACTION
# ============================================================================

## Task 7: Extract Phase 13 Context Enhancement Features

### Objective
Extract all Phase 13 features and generate tests for them.

### Instructions

**Step 1: Read Phase 13 Context Enhancement Plan**

Read `PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md` and extract all 8 plans:

| Plan | Feature | Purpose |
|------|---------|---------|
| Plan 1 | RepoMapGenerator | Compressed codebase representation |
| Plan 2 | CodebaseAnalyzer | Auto-generated architecture docs |
| Plan 3 | Code Embeddings | Semantic code search in MemorySystem |
| Plan 4 | FreshContextManager | Clean context per task |
| Plan 5 | DynamicContextProvider | Agent-requested context expansion |
| Plan 6 | RalphStyleIterator | Persistent git-based iteration |
| Plan 7 | DynamicReplanner | Complexity detection and re-decomposition |
| Plan 8 | SelfAssessmentEngine | Progress evaluation and blocker ID |

**Step 2: Generate tests for each Phase 13 feature**

```markdown
## SECTION 7: PHASE 13 CONTEXT ENHANCEMENT TESTS

### P13-001: RepoMapGenerator
```
TEST: RepoMapGenerator creates compressed codebase representation
LOCATION: src/infrastructure/repo-map/RepoMapGenerator.ts

VERIFY: generate() scans codebase
VERIFY: Uses tree-sitter for parsing
VERIFY: Outputs compressed representation
VERIFY: Includes file structure
VERIFY: Includes function/class signatures
VERIFY: Excludes implementation details
VERIFY: Size < 10% of codebase

INTEGRATION_CHECK: RepoMap used by agents for context
SILENT_FAILURE_CHECK: tree-sitter fails, empty map generated
SILENT_FAILURE_CHECK: Large files skipped without warning
SILENT_FAILURE_CHECK: Binary files cause crash
```

### P13-002: CodebaseAnalyzer
```
TEST: CodebaseAnalyzer generates documentation
LOCATION: src/infrastructure/codebase-docs/CodebaseAnalyzer.ts

VERIFY: analyze() scans codebase
VERIFY: Generates 7 document types:
  - ARCHITECTURE.md
  - DATA_FLOW.md
  - API_REFERENCE.md
  - DEPENDENCIES.md
  - PATTERNS.md
  - SECURITY.md
  - TESTING.md
VERIFY: Documents stored in CodebaseDocsStore
VERIFY: Documents updated on codebase change

INTEGRATION_CHECK: Docs available to agents
SILENT_FAILURE_CHECK: Analysis incomplete, partial docs saved
SILENT_FAILURE_CHECK: Docs outdated after changes
```

### P13-003: Code Embeddings / MemorySystem Extension
```
TEST: MemorySystem supports code embeddings
LOCATION: src/persistence/memory/MemorySystem.ts (extended)

VERIFY: storeCodeChunk() saves code with embedding
VERIFY: queryCode() returns semantically similar code
VERIFY: findUsages() finds symbol usages
VERIFY: Embeddings persisted to SQLite
VERIFY: Incremental updates on file change

INTEGRATION_CHECK: Agents use queryCode() for context
SILENT_FAILURE_CHECK: Embedding API fails, empty results returned
SILENT_FAILURE_CHECK: Stale embeddings after code change
SILENT_FAILURE_CHECK: Dimension mismatch corrupts search
```

### P13-004: FreshContextManager
```
TEST: FreshContextManager ensures clean context per task
LOCATION: src/orchestration/context/FreshContextManager.ts

VERIFY: reset() clears all context
VERIFY: initializeForTask() loads task-specific context
VERIFY: No cross-task context pollution
VERIFY: Context size within limits

INTEGRATION_CHECK: Called by AgentPool before each task
SILENT_FAILURE_CHECK: Reset fails, stale context persists
SILENT_FAILURE_CHECK: Context pollution between tasks
SILENT_FAILURE_CHECK: Context exceeds limit, truncated silently
```

### P13-005: DynamicContextProvider
```
TEST: DynamicContextProvider allows agent context requests
LOCATION: src/orchestration/context/DynamicContextProvider.ts

VERIFY: requestContext() fetches additional context
VERIFY: Agent can request specific files
VERIFY: Agent can request symbol definitions
VERIFY: Context budget tracked
VERIFY: Requests logged for analysis

INTEGRATION_CHECK: Agents call via RequestContextTool
SILENT_FAILURE_CHECK: Request fails, agent continues without context
SILENT_FAILURE_CHECK: Budget exceeded without warning
SILENT_FAILURE_CHECK: Circular request loop
```

### P13-006: RalphStyleIterator
```
TEST: RalphStyleIterator implements persistent iteration
LOCATION: src/orchestration/iteration/RalphStyleIterator.ts

VERIFY: run() manages iteration loop
VERIFY: Git diff injected each iteration
VERIFY: State persisted between iterations
VERIFY: Iteration count tracked
VERIFY: Escalation at limit

INTEGRATION_CHECK: Replaces/extends QALoopEngine
SILENT_FAILURE_CHECK: Git diff empty when changes exist
SILENT_FAILURE_CHECK: State not persisted, progress lost
SILENT_FAILURE_CHECK: Iteration count resets
```

### P13-007: DynamicReplanner
```
TEST: DynamicReplanner detects complexity and re-decomposes
LOCATION: src/orchestration/planning/DynamicReplanner.ts

VERIFY: monitorTask() tracks task progress
VERIFY: detectComplexity() identifies stuck tasks
VERIFY: Triggers include: time, iterations, scope creep, failures
VERIFY: replan() re-decomposes oversized task
VERIFY: TaskSplitter creates subtasks

INTEGRATION_CHECK: Integrates with NexusCoordinator
SILENT_FAILURE_CHECK: Complexity not detected, task runs forever
SILENT_FAILURE_CHECK: Replan creates invalid dependencies
SILENT_FAILURE_CHECK: Subtasks not added to queue
```

### P13-008: SelfAssessmentEngine
```
TEST: SelfAssessmentEngine evaluates progress
LOCATION: src/orchestration/assessment/SelfAssessmentEngine.ts

VERIFY: assess() evaluates current state
VERIFY: Identifies blockers
VERIFY: Suggests remediation
VERIFY: Confidence score calculated
VERIFY: Assessment logged

INTEGRATION_CHECK: Called periodically by Coordinator
SILENT_FAILURE_CHECK: Assessment always returns "good"
SILENT_FAILURE_CHECK: Blocker identified but not acted upon
```
```

**Step 3: Append to accumulator**

Append Section 7 to the accumulator file.

### Task 7 Completion Checklist
- [x] All 8 Phase 13 features extracted
- [x] Each has VERIFY statements
- [x] Integration checks included
- [x] Silent failure checks included
- [x] Extraction log updated

**[TASK 7 COMPLETE]** - Completed 2026-01-19

### Task 7 Completion Notes:
- Extracted all 8 Phase 13 Context Enhancement features from PHASE_13_CONTEXT_ENHANCEMENT_PLAN.md
- Features: RepoMapGenerator, CodebaseAnalyzer, Code Embeddings, FreshContextManager, DynamicContextProvider, RalphStyleIterator, DynamicReplanner, SelfAssessmentEngine
- Each feature includes LOCATION, METHODS, 25-35 VERIFY statements, INTEGRATION_CHECKs, and SILENT_FAILURE_CHECKs
- ~70 new Phase 13 tests added to accumulator
- Accumulator extraction log updated with Task 7 as COMPLETE

---

## Task 8: Extract Phase 14B Execution Bindings

### Objective
Extract all Phase 14B components and generate tests.

### Instructions

**Step 1: Read Phase 14B Analysis**

Read `.agent/workspace/PHASE_14B_ANALYSIS.md` and the implementation files to extract:

**QA Runners:**
- BuildRunner - spawns tsc
- LintRunner - spawns eslint
- TestRunner - spawns vitest
- ReviewRunner - calls Gemini
- QARunnerFactory - creates QARunner interface

**Planning:**
- TaskDecomposer - calls Claude for decomposition
- DependencyResolver - topological sort
- TimeEstimator - heuristic estimation

**Agents:**
- BaseAgentRunner - agent loop base class
- CoderAgent - code generation
- TesterAgent - test writing
- ReviewerAgent - code review
- MergerAgent - merge handling
- AgentPool - agent lifecycle management

**Wiring:**
- NexusFactory - creates complete Nexus instance

**Step 2: Generate tests for Phase 14B**

```markdown
## SECTION 8: PHASE 14B EXECUTION BINDINGS TESTS

### QA RUNNERS

#### P14B-QA-001: BuildRunner
```
TEST: BuildRunner spawns real tsc process
LOCATION: src/execution/qa/BuildRunner.ts

VERIFY: run() spawns 'npx tsc --noEmit'
VERIFY: parseErrors() extracts file, line, column, code, message
VERIFY: Returns BuildResult with ErrorEntry[]
VERIFY: Handles timeout (default 60s)
VERIFY: Handles spawn errors
VERIFY: createCallback() returns QARunner.build compatible function

REAL_EXECUTION_TEST: Create file with TypeScript error, verify detection
SILENT_FAILURE_CHECK: tsc returns non-zero but errors array empty
SILENT_FAILURE_CHECK: Wrong tsconfig used
SILENT_FAILURE_CHECK: Timeout not enforced
```

#### P14B-QA-002: LintRunner
```
TEST: LintRunner spawns real eslint process
LOCATION: src/execution/qa/LintRunner.ts

VERIFY: run() spawns 'npx eslint --format json'
VERIFY: runWithFix() passes --fix flag
VERIFY: parseJsonOutput() extracts errors and warnings
VERIFY: Returns LintResult with ErrorEntry[]
VERIFY: createCallback() returns QARunner.lint compatible function

REAL_EXECUTION_TEST: Create file with lint error, verify detection
SILENT_FAILURE_CHECK: ESLint config missing, runs with defaults
SILENT_FAILURE_CHECK: --fix fails silently
SILENT_FAILURE_CHECK: Warnings not counted
```

#### P14B-QA-003: TestRunner
```
TEST: TestRunner spawns real vitest process
LOCATION: src/execution/qa/TestRunner.ts

VERIFY: run() spawns 'npx vitest run --reporter=json'
VERIFY: parseOutput() extracts passed, failed, skipped counts
VERIFY: Captures test failure details
VERIFY: runWithCoverage() includes coverage data
VERIFY: createCallback() returns QARunner.test compatible function

REAL_EXECUTION_TEST: Create failing test, verify detection
SILENT_FAILURE_CHECK: Tests skip but reported as pass
SILENT_FAILURE_CHECK: Coverage below threshold not flagged
SILENT_FAILURE_CHECK: Test hangs, timeout not enforced
```

#### P14B-QA-004: ReviewRunner
```
TEST: ReviewRunner calls Gemini API
LOCATION: src/execution/qa/ReviewRunner.ts

VERIFY: run() calls GeminiClient
VERIFY: Builds review prompt with git diff
VERIFY: parseReviewResponse() extracts approval status
VERIFY: parseReviewResponse() extracts issues array
VERIFY: createCallback() returns QARunner.review compatible function

REAL_EXECUTION_TEST: Submit code change, verify review response
SILENT_FAILURE_CHECK: Gemini API fails, returns approved=true
SILENT_FAILURE_CHECK: Prompt too long, truncated without warning
SILENT_FAILURE_CHECK: JSON parse fails, default approval returned
```

#### P14B-QA-005: QARunnerFactory
```
TEST: QARunnerFactory creates complete QARunner
LOCATION: src/execution/qa/QARunnerFactory.ts

VERIFY: create() returns object with build, lint, test, review
VERIFY: Each method is callable
VERIFY: createMock() returns mock implementation
VERIFY: Working directory correctly passed

INTEGRATION_CHECK: Plugs into RalphStyleIterator
SILENT_FAILURE_CHECK: One runner fails to create, others missing
```

### PLANNING

#### P14B-PLN-001: TaskDecomposer
```
TEST: TaskDecomposer calls Claude for decomposition
LOCATION: src/planning/decomposition/TaskDecomposer.ts

VERIFY: decompose() calls ClaudeClient
VERIFY: Uses decomposition system prompt
VERIFY: Parses JSON response into tasks
VERIFY: validateTaskSize() enforces 30-minute rule
VERIFY: splitTask() divides oversized tasks
VERIFY: Implements ITaskDecomposer interface

REAL_EXECUTION_TEST: Decompose "build login page", verify tasks
SILENT_FAILURE_CHECK: Claude returns malformed JSON, partial tasks
SILENT_FAILURE_CHECK: 45-minute task accepted without split
SILENT_FAILURE_CHECK: Split creates circular dependencies
```

#### P14B-PLN-002: DependencyResolver
```
TEST: DependencyResolver implements topological sort
LOCATION: src/planning/dependencies/DependencyResolver.ts

VERIFY: resolve() returns tasks in execution order
VERIFY: detectCycles() finds circular dependencies
VERIFY: getWaves() groups parallelizable tasks
VERIFY: getNextAvailable() returns ready tasks
VERIFY: Implements IDependencyResolver interface

ALGORITHM_TEST: Various dependency graphs, verify correct order
SILENT_FAILURE_CHECK: Cycle not detected, execution deadlocks
SILENT_FAILURE_CHECK: Parallel tasks serialized unnecessarily
```

#### P14B-PLN-003: TimeEstimator
```
TEST: TimeEstimator calculates task duration
LOCATION: src/planning/estimation/TimeEstimator.ts

VERIFY: estimate() returns minutes
VERIFY: Uses heuristics (file count, complexity)
VERIFY: recordActual() saves real duration
VERIFY: calibrate() adjusts based on history
VERIFY: Implements ITimeEstimator interface

ACCURACY_TEST: Estimate vs actual within 50%
SILENT_FAILURE_CHECK: Estimation always returns 30 (max)
SILENT_FAILURE_CHECK: Historical data ignored
```

### AGENTS

#### P14B-AGT-001: BaseAgentRunner
```
TEST: BaseAgentRunner implements agent loop
LOCATION: src/execution/agents/BaseAgentRunner.ts

VERIFY: runAgentLoop() iterates until completion
VERIFY: Respects iteration limit (50)
VERIFY: Handles LLM responses
VERIFY: Detects task completion markers
VERIFY: Emits events via EventBus

ABSTRACT_CHECK: Cannot instantiate directly
SILENT_FAILURE_CHECK: Iteration limit bypassed
SILENT_FAILURE_CHECK: Events not emitted
```

#### P14B-AGT-002: CoderAgent
```
TEST: CoderAgent generates code
LOCATION: src/execution/agents/CoderAgent.ts

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for generation
VERIFY: Has coding-focused system prompt
VERIFY: execute() returns TaskResult
VERIFY: Detects [TASK_COMPLETE] marker

REAL_EXECUTION_TEST: Generate simple function, verify code
SILENT_FAILURE_CHECK: Code generated but not written to file
SILENT_FAILURE_CHECK: Infinite loop without completion
```

#### P14B-AGT-003: TesterAgent
```
TEST: TesterAgent writes tests
LOCATION: src/execution/agents/TesterAgent.ts

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for generation
VERIFY: Has testing-focused system prompt
VERIFY: Generates tests for target code

REAL_EXECUTION_TEST: Generate tests for function, verify coverage
SILENT_FAILURE_CHECK: Tests generated but don't actually test anything
```

#### P14B-AGT-004: ReviewerAgent
```
TEST: ReviewerAgent reviews code
LOCATION: src/execution/agents/ReviewerAgent.ts

VERIFY: Extends BaseAgentRunner
VERIFY: Uses GeminiClient for review
VERIFY: Has review-focused system prompt
VERIFY: Returns approval status and issues

REAL_EXECUTION_TEST: Review code change, verify issues identified
SILENT_FAILURE_CHECK: Always approves regardless of quality
```

#### P14B-AGT-005: MergerAgent
```
TEST: MergerAgent handles merges
LOCATION: src/execution/agents/MergerAgent.ts

VERIFY: Extends BaseAgentRunner
VERIFY: Uses ClaudeClient for conflict resolution
VERIFY: Analyzes merge conflicts
VERIFY: Proposes resolutions
VERIFY: Escalates complex conflicts

REAL_EXECUTION_TEST: Resolve simple conflict, verify result
SILENT_FAILURE_CHECK: Conflict ignored, code corrupted
```

#### P14B-AGT-006: AgentPool
```
TEST: AgentPool manages agent lifecycle
LOCATION: src/orchestration/agents/AgentPool.ts

VERIFY: createAgent() spawns real agent
VERIFY: runTask() executes task with agent
VERIFY: releaseAgent() returns agent to pool
VERIFY: terminateAgent() destroys agent
VERIFY: getPoolStatus() returns metrics
VERIFY: Respects max agents per type

STUB_CHECK: NO stub markers in code
REAL_CHECK: Actually creates agent instances
SILENT_FAILURE_CHECK: Pool exhausted without error
SILENT_FAILURE_CHECK: Agent leaked, not returned to pool
```

### WIRING

#### P14B-WIRE-001: NexusFactory
```
TEST: NexusFactory creates complete Nexus instance
LOCATION: src/NexusFactory.ts

VERIFY: create() returns NexusInstance
VERIFY: All dependencies wired correctly:
  - ClaudeClient created
  - GeminiClient created
  - TaskDecomposer with ClaudeClient
  - DependencyResolver
  - TimeEstimator
  - AgentPool with clients
  - QARunnerFactory with GeminiClient
  - RalphStyleIterator with QARunner
  - NexusCoordinator with all deps

VERIFY: createForTesting() returns mock-enabled instance
VERIFY: createNexus() convenience function works

INTEGRATION_CHECK: Returned instance can run Genesis mode
SILENT_FAILURE_CHECK: Dependency missing, null reference later
SILENT_FAILURE_CHECK: Wrong client passed to wrong component
```
```

**Step 3: Append to accumulator**

Append Section 8 to the accumulator file.

### Task 8 Completion Checklist
- [x] All QA Runners extracted (5)
- [x] All Planning components extracted (3)
- [x] All Agents extracted (6)
- [x] NexusFactory extracted
- [x] REAL_EXECUTION_TEST for key components
- [x] STUB_CHECK for AgentPool
- [x] Silent failure checks included
- [x] Extraction log updated

**[TASK 8 COMPLETE]** - Completed 2026-01-19

### Task 8 Completion Notes:
- Extracted 15 Phase 14B components from PHASE_14B_ANALYSIS.md
- QA Runners: BuildRunner, LintRunner, TestRunner, ReviewRunner, QARunnerFactory
- Planning: TaskDecomposer, DependencyResolver, TimeEstimator (all implementing interfaces)
- Agents: BaseAgentRunner, CoderAgent, TesterAgent, ReviewerAgent, MergerAgent, AgentPool
- Wiring: NexusFactory for complete dependency injection
- Each component includes REAL_EXECUTION_TEST and STUB_CHECK where applicable
- ~85 new Phase 14B binding tests added to accumulator
- Accumulator extraction log updated with Task 8 as COMPLETE

---

# ============================================================================
# PHASE D: SILENT FAILURE ANALYSIS
# ============================================================================

## Task 9: Generate Silent Failure Tests for All Components

### Objective
Create a comprehensive silent failure test suite.

### What is a Silent Failure?

A **silent failure** is when something goes wrong but:
- No error is thrown
- No warning is logged
- The system appears to work
- But the result is incorrect or incomplete

### Instructions

**Step 1: Review all components from Tasks 1-8**

For EACH component, identify potential silent failure modes.

**Step 2: Generate comprehensive silent failure tests**

```markdown
## SECTION 9: SILENT FAILURE DETECTION TESTS

### Category 1: Empty Results Instead of Errors

#### SF-EMPTY-001: API Returns Empty
```
TEST: Detect when API returns empty instead of error
COMPONENTS: ClaudeClient, GeminiClient, MemorySystem

SCENARIO: API key invalid
EXPECTED: Error thrown
SILENT_FAILURE: Empty response returned, processing continues

DETECTION:
- Check response is not empty before using
- Verify response matches expected schema
- Log warning if response suspiciously small
```

#### SF-EMPTY-002: Database Query Returns Empty
```
TEST: Detect when query returns empty unexpectedly
COMPONENTS: DatabaseService, StateManager, RequirementsDB

SCENARIO: Record exists but query wrong
EXPECTED: Record returned
SILENT_FAILURE: Empty array returned, code assumes no data

DETECTION:
- Distinguish "no results" from "query error"
- Verify expected data exists before querying
- Alert on unexpected empty results
```

#### SF-EMPTY-003: File Read Returns Empty
```
TEST: Detect when file read returns empty
COMPONENTS: FileSystemService, CheckpointManager

SCENARIO: File exists but encoding wrong
EXPECTED: File contents
SILENT_FAILURE: Empty string returned

DETECTION:
- Check file size before reading
- Verify content not empty when expected
- Handle encoding explicitly
```

### Category 2: State Drift

#### SF-DRIFT-001: Memory vs Database Mismatch
```
TEST: Detect state drift between memory and persistence
COMPONENTS: StateManager, DatabaseService

SCENARIO: Update in memory, persist fails silently
EXPECTED: Memory and disk in sync
SILENT_FAILURE: Memory updated, disk old

DETECTION:
- Periodically verify memory matches disk
- Use transactions for atomic updates
- Log all persistence operations
```

#### SF-DRIFT-002: Task Status Mismatch
```
TEST: Detect task status drift
COMPONENTS: TaskQueue, NexusCoordinator

SCENARIO: Task completes but status not updated
EXPECTED: Status = 'completed'
SILENT_FAILURE: Status still 'in_progress'

DETECTION:
- Verify status after each operation
- Reconcile queue with database periodically
- Alert on stale status
```

#### SF-DRIFT-003: Agent State Mismatch
```
TEST: Detect agent state drift
COMPONENTS: AgentPool, BaseAgentRunner

SCENARIO: Agent finishes but pool thinks it's busy
EXPECTED: Agent released to pool
SILENT_FAILURE: Agent stuck in 'working' state

DETECTION:
- Verify agent state after task
- Implement heartbeat/watchdog
- Clean up stale agents periodically
```

### Category 3: Event Delivery Failures

#### SF-EVENT-001: Event Emitted But Not Received
```
TEST: Detect lost events
COMPONENTS: EventBus, All subscribers

SCENARIO: Subscriber throws, event lost
EXPECTED: All subscribers notified
SILENT_FAILURE: Some subscribers never called

DETECTION:
- Catch errors in event handlers
- Log all emitted events
- Verify expected handlers called
```

#### SF-EVENT-002: Wrong Event Type
```
TEST: Detect wrong event types
COMPONENTS: EventBus, Type system

SCENARIO: Event emitted with wrong payload
EXPECTED: Type error
SILENT_FAILURE: Runtime error or wrong behavior

DETECTION:
- Runtime type checking for events
- Log payload structure
- Verify payload matches schema
```

### Category 4: Fallback Masking Errors

#### SF-FALLBACK-001: Fallback Hides Real Error
```
TEST: Detect when fallback masks real failure
COMPONENTS: LLMProvider, All clients

SCENARIO: Claude fails, Gemini used without logging
EXPECTED: Error logged, fallback used explicitly
SILENT_FAILURE: Primary failure hidden

DETECTION:
- Always log fallback activation
- Track fallback frequency
- Alert on repeated fallbacks
```

#### SF-FALLBACK-002: Default Value Hides Error
```
TEST: Detect default values hiding errors
COMPONENTS: TimeEstimator, Configuration

SCENARIO: Estimation fails, default 30 used
EXPECTED: Error or warning
SILENT_FAILURE: Always estimates 30, seems to work

DETECTION:
- Log when defaults used
- Track default usage frequency
- Verify real calculation attempted
```

### Category 5: Resource Leaks

#### SF-LEAK-001: Worktree Leak
```
TEST: Detect orphaned worktrees
COMPONENTS: WorktreeManager, AgentPool

SCENARIO: Task fails, worktree not cleaned
EXPECTED: Worktree removed on failure
SILENT_FAILURE: Worktrees accumulate

DETECTION:
- Track worktree creation/deletion
- Periodic cleanup job
- Alert when worktree count high
```

#### SF-LEAK-002: Connection Leak
```
TEST: Detect database connection leak
COMPONENTS: DatabaseService

SCENARIO: Query errors, connection not returned
EXPECTED: Connection released
SILENT_FAILURE: Pool exhausted over time

DETECTION:
- Track connection checkout/return
- Timeout idle connections
- Alert on pool exhaustion
```

#### SF-LEAK-003: Memory Leak
```
TEST: Detect memory leaks
COMPONENTS: MemorySystem, StateManager

SCENARIO: Large objects not garbage collected
EXPECTED: Memory stable
SILENT_FAILURE: Memory grows indefinitely

DETECTION:
- Monitor memory usage
- Profile long-running operations
- Force GC and check reclamation
```

### Category 6: QA Bypasses

#### SF-QA-001: QA Step Skipped
```
TEST: Detect skipped QA steps
COMPONENTS: RalphStyleIterator, QALoopEngine

SCENARIO: Build step throws, marked as pass
EXPECTED: Build failure recorded
SILENT_FAILURE: Bad code passes QA

DETECTION:
- Verify each step actually ran
- Check step results are not null
- Log step execution timestamps
```

#### SF-QA-002: Iteration Count Manipulation
```
TEST: Detect iteration count issues
COMPONENTS: RalphStyleIterator

SCENARIO: Counter not incremented on error
EXPECTED: Counter always increments
SILENT_FAILURE: Infinite loop possible

DETECTION:
- Verify counter increases each iteration
- Set hard timeout as backup
- Log iteration start/end
```

#### SF-QA-003: Escalation Bypass
```
TEST: Detect escalation bypass
COMPONENTS: EscalationHandler, RalphStyleIterator

SCENARIO: 50 iterations reached but no escalation
EXPECTED: Human notified
SILENT_FAILURE: System continues forever

DETECTION:
- Verify escalation called at limit
- Log escalation attempts
- Fallback: hard kill after 100 iterations
```

### Category 7: Context Issues

#### SF-CTX-001: Context Truncation
```
TEST: Detect silent context truncation
COMPONENTS: FreshContextManager, DynamicContextProvider

SCENARIO: Context exceeds limit, truncated
EXPECTED: Warning logged
SILENT_FAILURE: Important context lost

DETECTION:
- Log when truncation occurs
- Mark what was truncated
- Agent can request more context
```

#### SF-CTX-002: Stale Context
```
TEST: Detect stale context
COMPONENTS: FreshContextManager, MemorySystem

SCENARIO: Context not refreshed between tasks
EXPECTED: Fresh context each task
SILENT_FAILURE: Task uses outdated info

DETECTION:
- Verify context reset before each task
- Timestamp context data
- Invalidate on code changes
```

### Category 8: Type Mismatches

#### SF-TYPE-001: Runtime Type Mismatch
```
TEST: Detect runtime type mismatches
COMPONENTS: All components with external data

SCENARIO: API returns unexpected structure
EXPECTED: Type error or validation failure
SILENT_FAILURE: Wrong field accessed, undefined used

DETECTION:
- Runtime validation with Zod
- Strict null checks
- Log type validation results
```

#### SF-TYPE-002: Interface Mismatch
```
TEST: Detect interface mismatches
COMPONENTS: Phase 14B bindings

SCENARIO: Implementation doesn't match interface
EXPECTED: Compile error
SILENT_FAILURE: Runtime error or wrong behavior

DETECTION:
- TypeScript strict mode
- Integration tests verify contracts
- Document expected interfaces
```
```

**Step 3: Append to accumulator**

Append Section 9 to the accumulator file.

### Task 9 Completion Checklist
- [x] 10 categories of silent failures identified (expanded from 8)
- [x] 35 specific silent failure tests (exceeds 20+ requirement)
- [x] Detection strategies for each
- [x] Extraction log updated

**[TASK 9 COMPLETE]** - Completed 2026-01-19

### Task 9 Completion Notes:
- Extracted 10 categories of silent failures:
  1. Empty Results Instead of Errors (5 tests)
  2. State Drift (4 tests)
  3. Event Delivery Failures (3 tests)
  4. Fallback Masking Errors (3 tests)
  5. Resource Leaks (4 tests)
  6. QA Bypasses (4 tests)
  7. Context Issues (3 tests)
  8. Type Mismatches (4 tests)
  9. Concurrency Issues (3 tests) - Added
  10. Configuration Issues (2 tests) - Added
- Each test includes SCENARIO, EXPECTED, SILENT_FAILURE, DETECTION_STRATEGY, TEST_CASE
- ~35 new silent failure detection tests added to accumulator
- Accumulator extraction log updated with Task 9 as COMPLETE

---

## Task 10: Generate Edge Case and Boundary Tests

### Objective
Create tests for edge cases and boundary conditions.

### Instructions

**Step 1: Identify edge cases for each layer**

```markdown
## SECTION 10: EDGE CASE AND BOUNDARY TESTS

### Layer 7: Infrastructure Edge Cases

#### EDGE-INF-001: Empty File Operations
```
TEST: Handle empty files correctly
VERIFY: readFile('empty.txt') returns ''
VERIFY: writeFile('new.txt', '') creates empty file
VERIFY: File exists check works for empty files
```

#### EDGE-INF-002: Very Large Files
```
TEST: Handle large files without crashing
VERIFY: Read 100MB file doesn't OOM
VERIFY: Write large file uses streaming
VERIFY: Git handles large diffs
```

#### EDGE-INF-003: Special Characters in Paths
```
TEST: Handle special characters in file paths
VERIFY: Spaces in path work
VERIFY: Unicode in path works
VERIFY: Windows/Unix path normalization
```

#### EDGE-INF-004: Concurrent File Access
```
TEST: Handle concurrent file operations
VERIFY: Parallel reads work
VERIFY: Parallel writes don't corrupt
VERIFY: File locking works
```

### Layer 6: Persistence Edge Cases

#### EDGE-PER-001: Database Under Load
```
TEST: Database handles high load
VERIFY: 1000 concurrent queries
VERIFY: Transaction isolation
VERIFY: Connection pool limits respected
```

#### EDGE-PER-002: Checkpoint Size Limits
```
TEST: Handle large checkpoints
VERIFY: Checkpoint with 1000 tasks
VERIFY: Restore large checkpoint
VERIFY: Incremental checkpoints work
```

#### EDGE-PER-003: Memory System Limits
```
TEST: Handle embedding limits
VERIFY: Maximum embeddings stored
VERIFY: Query with no results
VERIFY: Query with thousands of results
```

### Layer 5: Quality Edge Cases

#### EDGE-QUA-001: No Files to Lint/Build
```
TEST: Handle empty project
VERIFY: Build with no .ts files
VERIFY: Lint with no .ts files
VERIFY: Test with no .test.ts files
```

#### EDGE-QUA-002: All Tests Skip
```
TEST: Handle all tests skipped
VERIFY: Result shows 0 pass, 0 fail, N skip
VERIFY: Not marked as success
```

#### EDGE-QUA-003: Review Very Large Diff
```
TEST: Handle large code review
VERIFY: Diff > 10000 lines handled
VERIFY: Truncation if needed
VERIFY: Still gets useful review
```

### Layer 4: Execution Edge Cases

#### EDGE-EXE-001: Agent Generates No Code
```
TEST: Handle agent producing nothing
VERIFY: Detected as failure
VERIFY: Iteration continues
VERIFY: Eventually escalates
```

#### EDGE-EXE-002: Agent Generates Invalid Code
```
TEST: Handle syntactically invalid code
VERIFY: Build step catches it
VERIFY: Error fed back to agent
VERIFY: Agent can fix it
```

#### EDGE-EXE-003: Agent Exceeds Token Limit
```
TEST: Handle token limit exceeded
VERIFY: Response truncated gracefully
VERIFY: Agent notified of limit
VERIFY: Can request continuation
```

### Layer 3: Planning Edge Cases

#### EDGE-PLN-001: Feature with No Tasks
```
TEST: Handle feature that needs no tasks
VERIFY: Decomposition returns empty or single task
VERIFY: Not an error condition
```

#### EDGE-PLN-002: Circular Dependencies
```
TEST: Handle circular dependencies
VERIFY: Cycle detected
VERIFY: Error reported clearly
VERIFY: Suggests resolution
```

#### EDGE-PLN-003: All Tasks Same Priority
```
TEST: Handle no clear priority order
VERIFY: Consistent ordering
VERIFY: Parallel execution still works
```

### Layer 2: Orchestration Edge Cases

#### EDGE-ORC-001: All Agents Busy
```
TEST: Handle agent pool exhaustion
VERIFY: New task waits
VERIFY: Doesn't create extra agents
VERIFY: Continues when agent free
```

#### EDGE-ORC-002: Empty Task Queue
```
TEST: Handle empty queue
VERIFY: dequeue() returns null
VERIFY: Coordinator waits for tasks
VERIFY: Resumes when tasks added
```

#### EDGE-ORC-003: Event Flood
```
TEST: Handle rapid event emission
VERIFY: No events lost
VERIFY: Subscribers not overwhelmed
VERIFY: Backpressure if needed
```

### Layer 1: UI Edge Cases

#### EDGE-UI-001: Very Long Interview
```
TEST: Handle long interview session
VERIFY: 100+ messages handled
VERIFY: No memory leak
VERIFY: Scroll performance OK
```

#### EDGE-UI-002: Rapid User Input
```
TEST: Handle rapid user actions
VERIFY: Debounce works
VERIFY: No duplicate submissions
VERIFY: UI responsive
```

### Boundary Tests

#### BOUNDARY-001: Task Duration Exactly 30 Minutes
```
TEST: Task exactly at limit
VERIFY: Not split if exactly 30
VERIFY: Split if 30.001
```

#### BOUNDARY-002: Iteration Count Exactly 50
```
TEST: Iteration exactly at limit
VERIFY: Iteration 50 runs QA
VERIFY: Iteration 51 would escalate
VERIFY: Success on iteration 50 completes
```

#### BOUNDARY-003: Context Size at Limit
```
TEST: Context exactly at token limit
VERIFY: Not truncated if exactly at limit
VERIFY: Truncated if 1 over
VERIFY: Warning at 90% of limit
```
```

**Step 2: Append to accumulator**

Append Section 10 to the accumulator file.

### Task 10 Completion Checklist
- [x] Edge cases for all 7 layers (28 edge case tests across 7 layers)
- [x] 25+ edge case tests (34 total: 28 edge cases + 6 boundary tests)
- [x] Boundary condition tests (6 boundary tests)
- [x] Extraction log updated (Task 10 marked COMPLETE with 34 tests)

**[TASK 10 COMPLETE]** - Completed 2026-01-19

### Task 10 Completion Notes:
- Extracted 34 Edge Case and Boundary Tests across all 7 layers
- Layer 7 Infrastructure: 5 tests (empty files, large files, special chars, concurrent access, network failures)
- Layer 6 Persistence: 4 tests (database load, checkpoint limits, memory limits, corruption recovery)
- Layer 5 Quality: 4 tests (empty project, all skips, large diff, timeout)
- Layer 4 Execution: 4 tests (no code, invalid code, token limit, stuck loop)
- Layer 3 Planning: 4 tests (no tasks, circular deps, same priority, deep chain)
- Layer 2 Orchestration: 4 tests (busy agents, empty queue, event flood, agent crash)
- Layer 1 UI: 3 tests (long interview, rapid input, browser refresh)
- 6 Boundary Tests: task duration, iteration count, context size, max agents, max dependencies, zero-length
- Each test includes EDGE_CASE/BOUNDARY, EXPECTED_BEHAVIOR, 5-7 VERIFY statements, and TEST_CASE procedure
- Accumulator extraction log updated with Task 10 as COMPLETE

---

# ============================================================================
# PHASE E: SYNTHESIS & ASSEMBLY
# ============================================================================

## Task 11: Synthesize All Extractions into Test Categories

### Objective
Organize all extracted tests into logical categories for the final prompt.

### Instructions

**Step 1: Count all extracted tests**

Review the accumulator and count tests by category:

| Section | Category | Test Count |
|---------|----------|------------|
| 1 | Layer Architecture | ~28 |
| 2 | Component Catalog | ~45 |
| 3 | ADR Constraints | ~30 |
| 4 | Integration Sequences | ~36 |
| 5 | Genesis Workflow | ~15 |
| 6 | Evolution Workflow | ~15 |
| 7 | Phase 13 Features | ~24 |
| 8 | Phase 14B Bindings | ~40 |
| 9 | Silent Failures | ~30 |
| 10 | Edge Cases | ~25 |
| **TOTAL** | | **~288** |

**Step 2: Reorganize into final prompt structure**

The final testing prompt should have this structure:

```markdown
# Nexus Comprehensive Testing Prompt

## How to Use This Prompt

1. Run this prompt in Ralph Orchestrator
2. Ralph will execute each test category
3. Tests that PASS get marked ✅
4. Tests that FAIL get detailed error report
5. Silent failures get special attention
6. Final report summarizes results

## Test Execution Order

1. Unit Tests (Components)
2. Integration Tests (Sequences)
3. Workflow Tests (E2E)
4. Silent Failure Tests
5. Edge Case Tests

## Category 1: Unit Tests (~100 tests)

### 1.1 Layer 7: Infrastructure
[All INF-* tests]

### 1.2 Layer 6: Persistence
[All PER-* tests]

### 1.3 Layer 5: Quality
[All QUA-* tests]

### 1.4 Layer 4: Execution
[All EXE-* tests]

### 1.5 Layer 3: Planning
[All PLN-* tests]

### 1.6 Layer 2: Orchestration
[All ORC-* tests]

### 1.7 Layer 1: UI
[All UI-* tests]

## Category 2: ADR Constraint Tests (~30 tests)
[All ADR-* tests]

## Category 3: Integration Tests (~36 tests)
[All SEQ-* tests]

## Category 4: Workflow Tests (~30 tests)

### 4.1 Genesis Mode E2E
[All GEN-E2E-* tests]

### 4.2 Evolution Mode E2E
[All EVO-E2E-* tests]

## Category 5: Phase 13 Feature Tests (~24 tests)
[All P13-* tests]

## Category 6: Phase 14B Binding Tests (~40 tests)
[All P14B-* tests]

## Category 7: Silent Failure Tests (~30 tests)
[All SF-* tests]

## Category 8: Edge Case Tests (~25 tests)
[All EDGE-* and BOUNDARY-* tests]

## Final Verification Checklist

At the end of all tests, verify:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Genesis mode E2E works
- [ ] Evolution mode E2E works
- [ ] No silent failures detected
- [ ] Edge cases handled

## Report Format

Generate NEXUS_TEST_RESULTS.md with:
- Test count by category
- Pass/Fail summary
- Detailed failures
- Silent failure detections
- Recommendations
```

**Step 3: Append synthesis to accumulator**

```markdown
## SECTION 11: SYNTHESIS

### Test Count Summary
| Category | Count |
|----------|-------|
| Unit Tests | ~100 |
| ADR Constraints | ~30 |
| Integration Tests | ~36 |
| Genesis E2E | ~15 |
| Evolution E2E | ~15 |
| Phase 13 | ~24 |
| Phase 14B | ~40 |
| Silent Failures | ~30 |
| Edge Cases | ~25 |
| **TOTAL** | **~315** |

### Final Prompt Structure
[Structure documented above]

### Verification Checklist
[Checklist documented above]
```

### Task 11 Completion Checklist
- [ ] All tests counted
- [ ] Final structure defined
- [ ] Verification checklist created
- [ ] Extraction log updated

**[TASK 11 COMPLETE]** <- Mark when done

---

## Task 12: Assemble Final Testing Prompt

### Objective
Assemble all sections into the final testing prompt file.

### Instructions

**Step 1: Create the final output file**

Create `NEXUS_COMPREHENSIVE_TESTING_PROMPT.md` in the outputs directory.

**Step 2: Assemble from accumulator**

Copy all sections from the accumulator into the final file with proper formatting:

```markdown
# Nexus Comprehensive Testing Prompt
## Generated by Phase 15

> **Total Tests:** ~315
> **Categories:** 8
> **Generated:** [DATE]
> **Source:** Phases 1-14B Documentation

---

## Instructions for Test Runner (Ralph)

### Setup
1. Navigate to Nexus project: `C:\Users\Omar Khaled\OneDrive\Desktop\Nexus`
2. Ensure all dependencies installed: `npm install`
3. Ensure API keys configured in `.env`

### Execution
1. Read each test section
2. For each test:
   - Run the VERIFY statements
   - Check SILENT_FAILURE conditions
   - Record results
3. Generate report at end

### Test Evidence
For each test, collect:
- Command executed
- Output received
- Pass/Fail determination
- Any warnings or anomalies

---

## Category 1: Unit Tests

[Insert all unit tests from Sections 1-2 of accumulator]

---

## Category 2: ADR Constraint Tests

[Insert all ADR tests from Section 3 of accumulator]

---

## Category 3: Integration Tests

[Insert all integration tests from Section 4 of accumulator]

---

## Category 4: Workflow Tests

### Genesis Mode E2E
[Insert from Section 5 of accumulator]

### Evolution Mode E2E
[Insert from Section 6 of accumulator]

---

## Category 5: Phase 13 Feature Tests

[Insert from Section 7 of accumulator]

---

## Category 6: Phase 14B Binding Tests

[Insert from Section 8 of accumulator]

---

## Category 7: Silent Failure Tests

[Insert from Section 9 of accumulator]

---

## Category 8: Edge Case Tests

[Insert from Section 10 of accumulator]

---

## Final Verification

After all tests complete:

### Summary Statistics
- Total Tests: ___
- Passed: ___
- Failed: ___
- Silent Failures Detected: ___

### Critical Failures
[List any critical failures]

### Silent Failures Found
[List any silent failures detected]

### Recommendations
[Recommendations based on results]

---

## Report Generation

Generate `NEXUS_TEST_RESULTS.md` with complete results.

---

**[END OF TESTING PROMPT]**
```

**Step 3: Copy to outputs**

Copy the final file to `/mnt/user-data/outputs/NEXUS_COMPREHENSIVE_TESTING_PROMPT.md`

**Step 4: Update extraction log**

Mark all tasks as COMPLETE in the accumulator.

### Task 12 Completion Checklist
- [ ] Final prompt file created
- [ ] All sections assembled
- [ ] Instructions included
- [ ] Report format specified
- [ ] Copied to outputs directory
- [ ] Extraction log shows all COMPLETE

**[TASK 12 COMPLETE]**

---

# ============================================================================
# COMPLETION
# ============================================================================

## Phase 15 Complete Checklist

Before marking Phase 15 complete, verify:

- [ ] Accumulator file exists with all 11 sections
- [ ] Final prompt file is ~2000+ lines
- [ ] All 315+ tests included
- [ ] Silent failure tests comprehensive
- [ ] Edge case tests comprehensive
- [ ] Instructions clear for test runner
- [ ] Report format specified

## Output Files

1. `.agent/workspace/TESTING_PROMPT_ACCUMULATOR.md` - Working file with all extractions
2. `NEXUS_COMPREHENSIVE_TESTING_PROMPT.md` - Final testing prompt (~2000+ lines)

## Next Steps

After Phase 15 completes:
1. Review generated testing prompt
2. Run testing prompt in new Ralph session
3. Review test results
4. Fix any failures found
5. Nexus is production-ready!

---

## Recommended Settings

```
--max-iterations 80
--completion-promise "PHASE_15_TESTING_PROMPT_GENERATION_COMPLETE"
```

---

**[PHASE 15 COMPLETE]**