# Nexus Services Map

> Generated for Phase 17 UI Redesign - Service Layer Capabilities
> Generated: 2025-01-19

## Interview Services

### InterviewEngine
**Purpose:** Main orchestrator for interview conversations and requirements gathering

**Public Methods:**
- `startSession(projectId: string): InterviewSession` - Creates new interview session with unique ID, timestamps, and empty message/requirements arrays
- `processMessage(sessionId: string, userMessage: string): Promise<ProcessMessageResult>` - Handles user input, calls LLM, extracts requirements, stores them, detects gaps. Returns response, extracted requirements, and suggested gaps to explore
- `getSession(sessionId: string): InterviewSession | null` - Retrieves session by ID with full conversation history and extracted requirements
- `endSession(sessionId: string): void` - Marks session complete, emits completion event with total requirements and duration
- `pauseSession(sessionId: string): void` - Pauses active session without closing it
- `resumeSession(sessionId: string): void` - Resumes paused session back to active status
- `getInitialGreeting(): string` - Returns greeting text for new interviews

**UI Use Cases:**
- Display active interview session with conversation thread
- Show real-time requirement extraction results
- Suggest missing areas to explore with gap detection
- Manage session pause/resume for interrupted interviews

### InterviewSessionManager
**Purpose:** Persists interview sessions to database with auto-save capability

**Public Methods:**
- `save(session: InterviewSession): void` - Saves/updates session to SQLite with status tracking
- `load(sessionId: string): InterviewSession | null` - Loads session by ID from database
- `loadByProject(projectId: string): InterviewSession | null` - Gets active interview session for a project
- `delete(sessionId: string): void` - Removes session from database
- `startAutoSave(session: InterviewSession): void` - Starts periodic auto-save with configurable interval (default 30s)
- `stopAutoSave(): void` - Stops auto-save timer
- `exportToRequirementsDB(session: InterviewSession, requirementsDB): number` - Exports all requirements to RequirementsDB, returns count exported

**UI Use Cases:**
- Load previous interviews for continuation
- Auto-save indicator showing save status
- Session recovery after crashes
- Export requirements to planning system

### QuestionGenerator
**Purpose:** Generates contextual follow-up questions and detects coverage gaps

**Public Methods:**
- `generate(context: GenerationContext): Promise<GenerationResult>` - Generates next contextual question based on conversation history and extracted requirements. Returns question with area/depth metadata and gap suggestions
- `detectGaps(exploredAreas: string[]): string[]` - Returns unexplored standard areas (security, performance, api, ui_ux, data_model, etc.)
- `shouldSuggestGap(context: GenerationContext): boolean` - Determines if gaps should be surfaced (requires min requirements + explored areas)
- `getSystemPrompt(): string` - Returns interviewer system prompt for LLM

**UI Use Cases:**
- Display suggested follow-up questions to guide interview
- Show coverage gaps to explore
- Highlight unexplored requirements areas

### RequirementExtractor
**Purpose:** Parses XML-tagged requirements from LLM responses

**Public Methods:**
- `extract(responseText: string, sourceMessageId: string): ExtractionResult` - Parses `<requirement>` blocks from response, filters by confidence threshold. Returns requirements array with raw/filtered counts
- `setConfidenceThreshold(threshold: number): void` - Updates confidence filter (0.0-1.0)

**UI Use Cases:**
- Display extracted requirements with confidence scores
- Filter requirements by category/priority
- Show requirement parsing statistics

---

## Planning Services

### TaskDecomposer
**Purpose:** Breaks features into atomic 30-minute-or-less tasks using LLM

**Public Methods:**
- `decompose(featureDescription: string, options?: DecompositionOptions): Promise<PlanningTask[]>` - Calls Claude to decompose feature into atomic tasks, validates 30-minute rule, splits oversized tasks automatically. Returns validated task array with dependencies
- `validateTaskSize(task: PlanningTask): TaskValidationResult` - Checks task against time/file limits. Returns errors/warnings
- `splitTask(task: PlanningTask): Promise<PlanningTask[]>` - Recursively splits oversized task into smaller components
- `estimateTime(task: PlanningTask): number` - Estimates task duration using heuristics (file count, complexity, tests)

**UI Use Cases:**
- Display decomposed task breakdown with dependencies
- Show task validation errors for adjustment
- Visualize task hierarchy and split operations

### TimeEstimator
**Purpose:** Provides heuristic-based time estimation with historical calibration

**Public Methods:**
- `estimate(task: PlanningTask): Promise<number>` - Estimates single task time in minutes
- `estimateTotal(tasks: PlanningTask[]): Promise<number>` - Sums estimated time for task set
- `estimateDetailed(task: PlanningTask): EstimationResult` - Returns estimate with breakdown (base/files/complexity/tests) and confidence level
- `calibrate(task: PlanningTask, actualMinutes: number): void` - Records actual time to improve future estimates
- `getAccuracy(category?: TaskCategory): { ratio: number; sampleSize: number } | null` - Returns estimation accuracy metrics
- `resetCalibration(category?: TaskCategory): void` - Clears historical calibration data
- `getFactors(): EstimationFactors` - Returns current estimation multipliers
- `setFactors(factors: Partial<EstimationFactors>): void` - Updates estimation multipliers

**UI Use Cases:**
- Display estimated time per task and total project time
- Show confidence levels for estimates
- Track actual vs estimated for metrics dashboard
- Adjust estimation parameters based on team performance

### DependencyResolver
**Purpose:** Resolves task dependencies and calculates parallel execution waves

**Public Methods:**
- `calculateWaves(tasks: PlanningTask[]): Wave[]` - Topologically sorts tasks, groups executable-in-parallel tasks into waves. Returns waves with estimated times
- `topologicalSort(tasks: PlanningTask[]): PlanningTask[]` - Kahn's algorithm for execution order. Throws if circular dependencies found
- `hasCircularDependency(tasks: PlanningTask[]): boolean` - Quick check for cycles
- `detectCycles(tasks: PlanningTask[]): { taskIds: string[] }[]` - Finds all circular dependency cycles
- `getAllDependencies(taskId: string, tasks: PlanningTask[]): string[]` - Returns transitive dependencies
- `getDependents(taskId: string, tasks: PlanningTask[]): PlanningTask[]` - Gets tasks that depend on given task
- `getCriticalPath(tasks: PlanningTask[]): PlanningTask[]` - Longest chain by time (minimum total execution time)
- `getNextAvailable(tasks: PlanningTask[], completedIds: string[]): PlanningTask[]` - Returns ready-to-execute tasks
- `validate(tasks: PlanningTask[]): { valid: boolean; issues: string[] }` - Full graph validation

**UI Use Cases:**
- Display task dependency graph visualization
- Show execution waves for parallel execution planning
- Highlight critical path for project timeline
- Detect and display dependency conflicts
- Queue next available tasks for agents

---

## Orchestration Services

### NexusCoordinator
**Purpose:** Main orchestration entry point managing execution phases and agent coordination

**Public Methods:**
- `initialize(config: ProjectConfig): void` - Prepares coordinator with project config
- `start(projectId: string): void` - Starts orchestration loop, sets state to 'running'
- `pause(reason?: string): Promise<void>` - Gracefully pauses execution, creates checkpoint
- `resume(): Promise<void>` - Resumes from paused state
- `stop(): Promise<void>` - Gracefully stops orchestration, creates final checkpoint
- `getStatus(): CoordinatorStatus` - Returns current state, phase, progress metrics
- `getProgress(): ProjectProgress` - Returns completed/failed/total tasks and time estimates
- `on(eventType: NexusEventType, handler: (event: NexusEvent) => void): void` - Subscribes to orchestration events

**UI Use Cases:**
- Display orchestration status (running/paused/stopped)
- Show current execution phase and progress
- Control orchestration (start/pause/resume/stop buttons)
- Real-time event updates for agent activity

### AgentPool
**Purpose:** Manages lifecycle of AI agents (Coder, Tester, Reviewer, Merger)

**Public Methods:**
- `spawn(agentType: AgentType): PoolAgent` - Creates new agent instance of specified type
- `assign(agent: PoolAgent, task: OrchestrationTask): void` - Assigns task to agent
- `release(agentId: string): void` - Returns agent to idle pool
- `terminate(agentId: string): void` - Removes agent from pool
- `getStatus(): PoolStatus` - Returns pool metrics (total agents, active/idle by type, tasks in progress)
- `getAgent(agentId: string): PoolAgent | null` - Retrieves agent by ID
- `getAvailableAgents(agentType?: AgentType): PoolAgent[]` - Returns idle agents

**UI Use Cases:**
- Display agent pool status and utilization
- Show which tasks are assigned to which agents
- Monitor agent performance metrics

### HumanReviewService
**Purpose:** Manages human-in-the-loop review gates for critical operations

**Public Methods:**
- `createReview(options: CreateReviewOptions): HumanReviewRequest` - Creates review request with context (reason: qa_exhausted, merge_conflict, manual_request)
- `getReview(reviewId: string): HumanReviewRequest | null` - Retrieves review by ID with status
- `approve(reviewId: string, resolution?: string): void` - Marks review approved
- `reject(reviewId: string, resolution: string): void` - Marks review rejected
- `getPendingReviews(projectId: string): HumanReviewRequest[]` - Lists all pending reviews for project

**UI Use Cases:**
- Display pending reviews with task context and reason
- Approve/reject reviews with optional comments
- Block agent execution until human reviews are resolved

---

## Execution Services

### BaseAgentRunner
**Purpose:** Abstract base providing common LLM interaction loop for all agents

**Public Methods:**
- `execute(task: Task, context: AgentContext): Promise<AgentTaskResult>` - Main execution loop with iteration limits, timeout handling, and error recovery. Returns task result with status, output, and metrics
- `getAgentType(): AgentType` - Returns agent type (coder/tester/reviewer/merger)

**Subclasses:**
- `CoderAgent` - Generates code implementations
- `TesterAgent` - Writes and runs tests
- `ReviewerAgent` - Reviews code quality
- `MergerAgent` - Merges branches

**UI Use Cases:**
- Display agent progress (iteration count, elapsed time)
- Show agent output and error messages in real-time
- Track agent timeout and escalation

### QARunnerFactory
**Purpose:** Creates configured QA pipeline (Build → Lint → Test → Review)

**Public Methods:**
- `QARunnerFactory.create(config: QARunnerFactoryConfig): QARunner` - Creates full QA pipeline with build/lint/test/review runners
- `QARunnerFactory.createQuickRunner(config: QuickQARunnerConfig): QARunner` - Creates minimal pipeline (build + lint only)

**UI Use Cases:**
- Display QA pipeline progress (which step is running)
- Show build/lint/test/review results
- Indicate QA status (passing/failing/in-progress)

---

## Persistence Services

### RequirementsDB
**Purpose:** Stores and retrieves project requirements with categorization

**Public Methods:**
- `addRequirement(projectId: string, input: CreateRequirementInput): Requirement` - Stores requirement with category/priority/source
- `getRequirement(requirementId: string): Requirement | null` - Retrieves by ID
- `getRequirementsByProject(projectId: string, options?: QueryOptions): Requirement[]` - Lists requirements with filtering by category/priority/tags
- `updateRequirement(requirementId: string, updates: Partial<Requirement>): void` - Updates requirement fields
- `deleteRequirement(requirementId: string): void` - Removes requirement
- `validateRequirement(requirementId: string): void` - Marks requirement as validated

**UI Use Cases:**
- Display requirements list with filters
- Edit requirement details (priority, acceptance criteria)
- Track requirement validation status
- Link requirements to features/tasks

### MemorySystem
**Purpose:** Episodic memory storage for learning from past episodes

**Public Methods:**
- `storeEpisode(projectId: string, episode: Omit<Episode, 'id' | 'createdAt' | 'accessCount'>): Episode` - Stores episode (code_generation, error_fix, review_feedback, decision, research)
- `getEpisode(episodeId: string): Episode | null` - Retrieves episode by ID
- `search(query: MemoryQuery): Promise<SimilarityResult[]>` - Semantic search using embeddings with similarity scoring
- `pruneOldEpisodes(projectId: string): number` - Removes low-importance old episodes, returns count pruned
- `updateAccessMetrics(episodeId: string): void` - Updates access count and timestamp for ranking

**UI Use Cases:**
- Display similar past episodes when new issues occur
- Show memory search results for context
- Display episode importance and access frequency

### CheckpointManager
**Purpose:** Creates state snapshots for recovery and resumption

**Public Methods:**
- `createCheckpoint(trigger: AutoCheckpointTrigger): Checkpoint` - Creates checkpoint from current state with trigger reason
- `getCheckpoint(checkpointId: string): Checkpoint | null` - Retrieves checkpoint by ID
- `listCheckpoints(projectId: string, limit?: number): Checkpoint[]` - Lists recent checkpoints for project
- `restore(checkpointId: string, options?: RestoreOptions): Promise<void>` - Restores system to checkpoint state
- `deleteCheckpoint(checkpointId: string): void` - Removes checkpoint
- `deleteOldCheckpoints(projectId: string, keepCount: number): number` - Prunes old checkpoints, returns count deleted

**UI Use Cases:**
- Display checkpoint timeline
- Allow manual checkpoint creation
- Restore from checkpoint with confirmation
- Show checkpoint metadata (size, trigger, timestamp)

---

## LLM Services

### LLMProvider
**Purpose:** Factory and manager for LLM clients (Claude API/CLI, Gemini, mocks)

**Public Methods:**
- `getClaudeClient(): LLMClient` - Returns Claude client (API or CLI based on config)
- `getGeminiClient(): LLMClient` - Returns Gemini client (API or CLI)
- `getUsageStats(): UsageStats` - Returns token/cost metrics by agent type
- `resetUsageStats(): void` - Clears usage tracking

**Clients Created:**
- `ClaudeClient` - Direct API calls via Anthropic SDK
- `GeminiClient` - Direct API calls via Google SDK
- `ClaudeCodeCLIClient` - Calls via `claude` command
- Mock clients for testing

**UI Use Cases:**
- Display current LLM being used
- Show token usage and cost estimates
- Switch between API/CLI backends
- Track usage by agent type

### LLMClient Interface
**Core Methods:**
- `chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>` - Core LLM interaction, returns response with content and usage stats
- `stream(messages: Message[]): AsyncIterable<StreamChunk>` - Streaming responses for long operations

**UI Use Cases:**
- Display LLM response streaming in real-time
- Show token usage per request
- Display cost per operation

---

## Infrastructure Services

### GitService
**Purpose:** Version control operations for agent branches

**Public Methods:**
- `getStatus(workingDir: string): Promise<GitStatus>` - Returns current branch, staged/unstaged files, status flags
- `createBranch(workingDir: string, branchName: string, baseBranch?: string): Promise<void>` - Creates feature branch from base (default main)
- `checkout(workingDir: string, branchName: string): Promise<void>` - Switches to branch
- `getCommits(workingDir: string, count?: number): Promise<CommitInfo[]>` - Lists recent commits
- `stage(workingDir: string, files: string[]): Promise<void>` - Stages files for commit
- `commit(workingDir: string, message: string): Promise<string>` - Creates commit, returns hash
- `push(workingDir: string, branchName?: string): Promise<void>` - Pushes branch to remote
- `getDiff(workingDir: string, baseBranch: string, targetBranch: string): Promise<string>` - Returns unified diff between branches
- `merge(workingDir: string, sourceBranch: string): Promise<void>` - Merges branch, throws on conflicts
- `revertCommit(workingDir: string, commitHash: string): Promise<void>` - Reverts commit
- `deleteBranch(workingDir: string, branchName: string): Promise<void>` - Removes local branch

**UI Use Cases:**
- Display current git branch and status
- Show staged/unstaged files
- Display diff of changes before commit
- Show commit history with messages

### RepoMapGenerator
**Purpose:** Analyzes repository structure and dependencies

**Public Methods:**
- `generate(options?: RepoMapOptions): Promise<RepoMap>` - Analyzes entire repo, returns file entries with symbols and dependencies
- `analyzeFile(filePath: string): Promise<FileEntry>` - Analyzes single file for symbols and imports
- `getSymbols(filePath: string, kind?: SymbolKind): Promise<SymbolEntry[]>` - Extracts symbols from file (functions, classes, types, etc.)
- `getDependencies(filePath: string): Promise<DependencyEdge[]>` - Finds import/export dependencies
- `formatMap(map: RepoMap, options?: FormatOptions): string` - Formats repo map as markdown or JSON
- `getStats(): RepoMapStats` - Returns analysis statistics

**UI Use Cases:**
- Display repo structure tree
- Show file dependencies and import graph
- Search for symbols across codebase
- Display codebase complexity metrics

---

## Main Process Services

### SettingsService
**Purpose:** Persists configuration with secure API key storage

**Public Methods:**
- `getSettings(): NexusSettingsPublic` - Returns all settings (API keys never included)
- `hasClaudeKey(): boolean` - Check if Claude API key is stored (secure)
- `hasGeminiKey(): boolean` - Check if Gemini API key is stored (secure)
- `setClaudeKey(key: string): void` - Encrypts and stores Claude key via OS safeStorage
- `setGeminiKey(key: string): void` - Encrypts and stores Gemini key via OS safeStorage
- `updateSettings(partial: Partial<NexusSettings>): void` - Updates non-sensitive settings
- `getLLMSettings(): LLMSettings` - Returns LLM provider configuration

**UI Use Cases:**
- Settings form for API keys (secure input, never displays)
- LLM backend selection (API vs CLI)
- Agent pool size configuration
- Checkpoint auto-save settings
- Embeddings model selection

---

## UI Integration Patterns

### Data Flow to UI:
1. **Interview Module**: `InterviewEngine.processMessage()` → UI displays response + requirements + gaps
2. **Planning Module**: `TaskDecomposer.decompose()` → UI displays task tree + dependencies
3. **Orchestration**: `NexusCoordinator` events → UI updates progress bar, agent status
4. **Execution**: Agent runners emit events → UI shows real-time iteration count, output
5. **Persistence**: `CheckpointManager` stores snapshots → UI enables recovery UI

### Key UI Features Enabled:
- Real-time interview conversation with requirement extraction
- Decomposed task breakdown with dependency visualization
- Parallel execution wave display
- Agent pool monitoring dashboard
- Human review gate display and approval interface
- Git branch and diff visualization
- Settings management with secure key input
- Memory search for contextual suggestions
- Checkpoint timeline and restore interface
