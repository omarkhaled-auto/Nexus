# Nexus Data Models & Types

**Task R2: Extract Data Models & Types**
**Status:** COMPLETED
**Last Updated:** Phase 17 Research

This document provides a comprehensive map of all data models and types in Nexus that the UI needs to display and interact with.

---

## Table of Contents

1. [Core Domain Types](#core-domain-types)
2. [Task Types](#task-types)
3. [Agent Types](#agent-types)
4. [Settings Types](#settings-types)
5. [LLM Types](#llm-types)
6. [Orchestration Types](#orchestration-types)
7. [Planning Types](#planning-types)
8. [Interview Types](#interview-types)
9. [UI-Specific Types](#ui-specific-types)
10. [Model Configuration](#model-configuration)

---

## Core Domain Types

**Source:** `src/types/core.ts`

### Status Enums

```typescript
// Project lifecycle status
type ProjectStatus =
  | 'pending'      // Not yet started
  | 'planning'     // In planning/decomposition phase
  | 'executing'    // Active execution
  | 'paused'       // Temporarily paused
  | 'completed'    // Successfully completed
  | 'failed';      // Failed

// Feature lifecycle status
type FeatureStatus =
  | 'pending'      // Not yet started
  | 'decomposing'  // Being broken into tasks
  | 'ready'        // Tasks defined, ready for execution
  | 'in_progress'  // Some tasks executing
  | 'completed'    // All tasks completed
  | 'failed';      // Failed

// Requirement classification
type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
type RequirementCategory =
  | 'functional'
  | 'technical'
  | 'ui'
  | 'performance'
  | 'security'
  | 'integration'
  | 'testing';
```

### Project

The main project entity representing a Nexus project.

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  mode: 'genesis' | 'evolution';  // Creation vs Enhancement mode
  path: string;                    // File system path
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metrics: ProjectMetrics;
  settings?: ProjectSettings;
}

interface ProjectMetrics {
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  featuresTotal: number;
  featuresCompleted: number;
  estimatedTotalMinutes: number;
  actualTotalMinutes: number;
  averageQAIterations: number;
}

interface ProjectSettings {
  maxConcurrentAgents?: number;
  maxTaskMinutes?: number;
  qaMaxIterations?: number;
  enableTDD?: boolean;
  autoMerge?: boolean;
}
```

**UI Usage:**
- Dashboard: Project cards, progress indicators
- Project overview page
- Settings page (project defaults)

### Feature

A feature within a project.

```typescript
interface Feature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: RequirementPriority;
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentId?: string;  // For sub-features
}
```

**UI Usage:**
- Kanban board cards
- Feature detail modals
- Progress tracking

### Requirement

A requirement captured during the interview phase.

```typescript
interface Requirement {
  id: string;
  projectId: string;
  featureId?: string;
  content: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  source: 'interview' | 'manual' | 'inferred';
  createdAt: Date;
  updatedAt: Date;
}
```

**UI Usage:**
- Interview page (extracted requirements panel)
- Requirements list/management

### Interview Session

Interview session tracking.

```typescript
interface InterviewSession {
  id: string;
  projectId: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  currentCategory?: RequirementCategory;
  questionsAsked: number;
  requirementsCaptured: number;
  startedAt: Date;
  completedAt?: Date;
}
```

**UI Usage:**
- Interview page progress indicator
- Session history

---

## Task Types

**Source:** `src/types/task.ts`

### Task Status & Classification

```typescript
type TaskType = 'auto' | 'checkpoint' | 'tdd';

type TaskStatus =
  | 'pending'      // Not yet started
  | 'queued'       // In queue waiting for agent
  | 'assigned'     // Assigned to an agent
  | 'in_progress'  // Currently being executed
  | 'completed'    // Successfully completed
  | 'failed'       // Failed after all retries
  | 'blocked'      // Blocked by dependency or issue
  | 'skipped';     // Skipped (e.g., no longer needed)

type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
```

### Task

Full task entity with all properties.

```typescript
interface Task {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority?: TaskPriority;
  featureId?: string;
  projectId?: string;
  files?: string[];
  dependencies?: string[];
  testCriteria?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  assignedAgentId?: string;
  worktreePath?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  qaIterations?: number;
}
```

**UI Usage:**
- Kanban board task cards
- Task detail modal
- Agent activity panel (current task)

### Task Result

Result of task execution.

```typescript
interface TaskResult {
  taskId: string;
  success: boolean;
  escalated?: boolean;
  reason?: string;
  files?: {
    path: string;
    action: 'created' | 'modified' | 'deleted';
  }[];
  metrics?: {
    iterations: number;
    tokensUsed: number;
    timeMs: number;
  };
  error?: string;
}
```

**UI Usage:**
- Task completion notifications
- Execution logs
- Metrics display

### QA Results

```typescript
interface QAStepResult {
  step: 'build' | 'lint' | 'test' | 'review';
  passed: boolean;
  errors?: string[];
  warnings?: string[];
  details?: Record<string, unknown>;
  durationMs?: number;
}

interface QAResult {
  passed: boolean;
  iteration: number;
  steps: QAStepResult[];
  totalDurationMs: number;
  finalVerdict?: 'approved' | 'rejected' | 'needs_review';
}
```

**UI Usage:**
- Execution page (QA status cards)
- Agent activity (QA indicators)
- Task detail (QA history)

---

## Agent Types

**Source:** `src/types/agent.ts`

### Agent Classification

```typescript
type AgentType =
  | 'planner'   // Plans and decomposes tasks
  | 'coder'     // Writes code
  | 'tester'    // Writes and runs tests
  | 'reviewer'  // Reviews code changes
  | 'merger';   // Merges branches

type AgentStatus =
  | 'idle'       // Ready for work
  | 'assigned'   // Has a task assigned
  | 'working'    // Actively executing
  | 'waiting'    // Waiting for something (e.g., QA, human review)
  | 'error'      // In error state
  | 'terminated'; // No longer active
```

### Agent

Full agent entity.

```typescript
interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
  terminatedAt?: Date;
}

interface AgentModelConfig {
  provider: 'anthropic' | 'google' | 'openai';
  model: string;
  maxTokens?: number;
  temperature?: number;
}

interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalIterations: number;
  averageIterationsPerTask: number;
  totalTokensUsed: number;
  totalTimeActive: number;  // milliseconds
}
```

**UI Usage:**
- Agents page (agent pool status)
- Agent activity cards
- Dashboard (agent feed)
- Settings (agent configuration)

### Agent Spawn Options

```typescript
interface AgentSpawnOptions {
  type: AgentType;
  modelConfig?: Partial<AgentModelConfig>;
  initialTaskId?: string;
}
```

---

## Settings Types

**Source:** `src/shared/types/settings.ts`

### Backend Types

```typescript
// CLI or API backend for LLM providers
type LLMBackendType = 'cli' | 'api';

// Local or API backend for embeddings
type EmbeddingsBackendType = 'local' | 'api';
```

### LLM Provider Settings

```typescript
interface ClaudeProviderSettings {
  backend: LLMBackendType;          // 'cli' (default) or 'api'
  apiKeyEncrypted?: string;          // Required when backend='api'
  cliPath?: string;                  // Path to CLI binary
  timeout?: number;                  // Default: 300000 (5 min)
  maxRetries?: number;               // Default: 2
  model?: string;                    // Model ID
}

interface GeminiProviderSettings {
  backend: LLMBackendType;
  apiKeyEncrypted?: string;
  cliPath?: string;
  timeout?: number;
  model?: string;
}

interface EmbeddingsProviderSettings {
  backend: EmbeddingsBackendType;    // 'local' (default) or 'api'
  apiKeyEncrypted?: string;          // Required when backend='api'
  localModel?: string;               // Default: 'Xenova/all-MiniLM-L6-v2'
  dimensions?: number;               // Auto-detected from model
  cacheEnabled?: boolean;            // Default: true
  maxCacheSize?: number;             // Default: 10000
}

interface LLMSettings {
  claude: ClaudeProviderSettings;
  gemini: GeminiProviderSettings;
  embeddings: EmbeddingsProviderSettings;
  defaultProvider: 'claude' | 'gemini';
  defaultModel: string;
  fallbackEnabled: boolean;
  fallbackOrder: string[];
}
```

**UI Usage:**
- Settings page (LLM Providers tab)
- Model dropdowns
- Backend toggles

### Other Settings

```typescript
interface AgentSettings {
  maxParallelAgents: number;         // Default: 4
  taskTimeoutMinutes: number;        // Default: 30
  maxRetries: number;                // Default: 3
  autoRetryEnabled: boolean;         // Default: true
}

interface CheckpointSettings {
  autoCheckpointEnabled: boolean;           // Default: true
  autoCheckpointIntervalMinutes: number;    // Default: 5
  maxCheckpointsToKeep: number;             // Default: 10
  checkpointOnFeatureComplete: boolean;     // Default: true
}

interface UISettings {
  theme: 'light' | 'dark' | 'system';       // Default: 'system'
  sidebarWidth: number;                     // Default: 280
  showNotifications: boolean;               // Default: true
  notificationDuration: number;             // Default: 5000
}

interface ProjectSettings {
  defaultLanguage: string;                  // Default: 'typescript'
  defaultTestFramework: string;             // Default: 'vitest'
  outputDirectory: string;                  // Default: '.nexus'
}
```

### Complete Settings Structure

```typescript
interface NexusSettings {
  llm: LLMSettings;
  agents: AgentSettings;
  checkpoints: CheckpointSettings;
  ui: UISettings;
  project: ProjectSettings;
}

// Public view (safe for renderer, no encrypted values)
interface NexusSettingsPublic {
  llm: LLMSettingsPublic;  // hasApiKey booleans instead of keys
  agents: AgentSettings;
  checkpoints: CheckpointSettings;
  ui: UISettings;
  project: ProjectSettings;
}
```

### Default Values

```typescript
// Default LLM Settings
DEFAULT_LLM_SETTINGS = {
  claude: { backend: 'cli', timeout: 300000, maxRetries: 2, model: 'claude-sonnet-4-5-20250929' },
  gemini: { backend: 'cli', timeout: 300000, model: 'gemini-2.5-flash' },
  embeddings: { backend: 'local', localModel: 'Xenova/all-MiniLM-L6-v2', dimensions: 384 },
  defaultProvider: 'claude',
  defaultModel: 'claude-sonnet-4-5-20250929',
  fallbackEnabled: true,
  fallbackOrder: ['claude', 'gemini'],
}

// Default Agent Settings
DEFAULT_AGENT_SETTINGS = {
  maxParallelAgents: 4,
  taskTimeoutMinutes: 30,
  maxRetries: 3,
  autoRetryEnabled: true,
}

// Default Checkpoint Settings
DEFAULT_CHECKPOINT_SETTINGS = {
  autoCheckpointEnabled: true,
  autoCheckpointIntervalMinutes: 5,
  maxCheckpointsToKeep: 10,
  checkpointOnFeatureComplete: true,
}
```

---

## LLM Types

**Source:** `src/llm/types.ts`

### Message Types

```typescript
type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
type FinishReason = 'stop' | 'max_tokens' | 'tool_use' | 'error';

interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}
```

### LLM Response

```typescript
interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
  thinking?: string;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  thinkingTokens?: number;
}
```

**UI Usage:**
- Agent activity (live output)
- Token usage metrics

### Streaming Types

```typescript
type StreamChunkType = 'text' | 'thinking' | 'tool_use' | 'done' | 'error';

interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}
```

**UI Usage:**
- Real-time agent output streaming

### Usage Statistics

```typescript
interface AgentUsageStats {
  tokens: number;
  calls: number;
  cost: number;
}

interface UsageStats {
  byAgent: Record<AgentType, AgentUsageStats>;
  total: AgentUsageStats;
}
```

**UI Usage:**
- Dashboard metrics
- Project usage analytics

---

## Orchestration Types

**Source:** `src/orchestration/types.ts`

### Coordinator State

```typescript
type CoordinatorState = 'idle' | 'running' | 'paused' | 'stopping';
type ExecutionPhase = 'planning' | 'execution' | 'review' | 'completed';
type ProjectMode = 'genesis' | 'evolution';
```

### Coordinator Status

```typescript
interface CoordinatorStatus {
  state: CoordinatorState;
  projectId?: string;
  activeAgents: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentPhase: ExecutionPhase;
  currentWave: number;
  totalWaves: number;
  pauseReason?: string;
}
```

**UI Usage:**
- Dashboard (overall status)
- Project header (status badge)

### Project Progress

```typescript
interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  progressPercent: number;
  estimatedRemainingMinutes: number;
  currentWave: number;
  totalWaves: number;
  activeAgents: number;
}
```

**UI Usage:**
- Dashboard progress bars
- Project overview

### Pool Agent

```typescript
interface PoolAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig?: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
}
```

**UI Usage:**
- Agents page (pool status display)
- Dashboard (agent feed)

### Checkpoint

```typescript
interface Checkpoint {
  id: string;
  metadata: CheckpointMetadata;
  gitCommit?: string;
  createdAt: Date;
}

interface CheckpointMetadata {
  name?: string;
  projectId?: string;
  waveId: number;
  completedTaskIds: string[];
  pendingTaskIds: string[];
  coordinatorState: CoordinatorState;
}
```

**UI Usage:**
- Checkpoint timeline (optional)
- Restore functionality

---

## Planning Types

**Source:** `src/planning/types.ts`

### Task Sizing

```typescript
type TaskSize = 'atomic' | 'small' | 'medium' | 'large';
```

### Planning Task

```typescript
interface PlanningTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  size: TaskSize;
  estimatedMinutes: number;  // Should be <= 30
  dependsOn: string[];
  testCriteria: string[];
  files: string[];
}
```

### Wave

Tasks grouped for parallel execution.

```typescript
interface Wave {
  id: number;
  tasks: PlanningTask[];
  estimatedMinutes: number;  // Max of all tasks in wave
}
```

**UI Usage:**
- Task visualization
- Dependency graphs
- Execution timeline

### Decomposition Result

```typescript
interface DecompositionResult {
  tasks: PlanningTask[];
  dependencies: Map<string, string[]>;
  waves: Wave[];
  totalEstimatedMinutes: number;
}
```

---

## Interview Types

**Source:** `src/interview/types.ts` and `src/renderer/src/types/interview.ts`

### Interview Stages

```typescript
type InterviewStage =
  | 'welcome'
  | 'project_name'
  | 'project_overview'
  | 'overview'
  | 'functional'
  | 'technical'
  | 'technical_requirements'
  | 'features'
  | 'ui'
  | 'performance'
  | 'security'
  | 'integration'
  | 'constraints'
  | 'testing'
  | 'summary'
  | 'review'
  | 'complete';
```

### Extracted Requirements

```typescript
type ExtractedRequirementCategory =
  | 'functional'
  | 'non-functional'
  | 'technical'
  | 'constraint'
  | 'assumption';

type ExtractedRequirementPriority = 'must' | 'should' | 'could' | 'wont';

interface ExtractedRequirement {
  id: string;
  text: string;
  category: ExtractedRequirementCategory;
  priority: ExtractedRequirementPriority;
  confidence: number;  // 0.0 to 1.0
  area?: string;
  sourceMessageId: string;
}

interface ExtractionResult {
  requirements: ExtractedRequirement[];
  rawCount: number;
  filteredCount: number;
}
```

**UI Usage:**
- Interview page (extracted requirements panel)
- Confidence indicators
- Category filtering

### Interview Message (Renderer)

```typescript
interface InterviewMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  category?: RequirementCategory;
  isStreaming?: boolean;
}
```

**UI Usage:**
- Chat interface
- Message bubbles
- Streaming indicators

### Interview Session Data (Renderer)

```typescript
interface InterviewSessionData {
  projectName: string | null;
  stage: InterviewStage;
  messages: InterviewMessage[];
  requirements: Requirement[];
  startedAt: number | null;
  completedAt: number | null;
}
```

**UI Usage:**
- Interview page state
- Progress tracking
- Draft saving

---

## UI-Specific Types

**Source:** `src/renderer/src/types/`

### Feature (Kanban)

```typescript
type FeatureStatus =
  | 'backlog'       // Not yet started
  | 'planning'      // In planning phase
  | 'in_progress'   // Development in progress
  | 'ai_review'     // Pending AI review
  | 'human_review'  // Pending human review
  | 'done';         // Completed

type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';
type FeatureComplexity = 'simple' | 'moderate' | 'complex';

interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  complexity: FeatureComplexity;
  tasks: FeatureTask[];
  progress?: number;
  assignedAgent?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface FeatureTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedMinutes?: number;
}
```

**UI Usage:**
- Kanban board
- Task cards
- Filter/sorting

### Column Counts

```typescript
interface ColumnCounts {
  backlog: number;
  planning: number;
  in_progress: number;
  ai_review: number;
  human_review: number;
  done: number;
}
```

---

## Model Configuration

**Source:** `src/llm/models.ts`

### Model Info

```typescript
interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  description?: string;
  released?: string;
  isDefault?: boolean;
  deprecated?: boolean;
}

interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions: number;
  description?: string;
  isDefault?: boolean;
}
```

### Available Claude Models

| Model ID | Name | Context | Description |
|----------|------|---------|-------------|
| claude-opus-4-5-20251101 | Claude Opus 4.5 | 200K | Most intelligent |
| claude-sonnet-4-5-20250929 | Claude Sonnet 4.5 | 200K | **Default** - Best balance |
| claude-haiku-4-5-20251001 | Claude Haiku 4.5 | 200K | Fast and lightweight |
| claude-opus-4-1-20250805 | Claude Opus 4.1 | 200K | Previous Opus |
| claude-sonnet-4-20250514 | Claude Sonnet 4 | 200K | Previous Sonnet |

### Available Gemini Models

| Model ID | Name | Context | Description |
|----------|------|---------|-------------|
| gemini-3-pro | Gemini 3 Pro | 1M | Most powerful |
| gemini-3-flash | Gemini 3 Flash | 1M | Fast with reasoning |
| gemini-2.5-pro | Gemini 2.5 Pro | 1M | Advanced reasoning |
| gemini-2.5-flash | Gemini 2.5 Flash | 1M | **Default** - Fast, capable |
| gemini-2.5-flash-lite | Gemini 2.5 Flash-Lite | 1M | Cost-optimized |

### Available Local Embedding Models

| Model ID | Name | Dimensions | Description |
|----------|------|------------|-------------|
| Xenova/all-MiniLM-L6-v2 | MiniLM L6 v2 | 384 | **Default** - Fast, lightweight |
| Xenova/all-mpnet-base-v2 | MPNet Base v2 | 768 | Higher quality |
| Xenova/bge-small-en-v1.5 | BGE Small English | 384 | Optimized for retrieval |
| Xenova/bge-base-en-v1.5 | BGE Base English | 768 | Higher quality BGE |

### Agent Role Model Assignments

```typescript
const NEXUS_AGENT_MODELS = {
  planner: {
    claude: 'claude-opus-4-5-20251101',
    gemini: 'gemini-2.5-pro',
  },
  coder: {
    claude: 'claude-sonnet-4-5-20250929',
    gemini: 'gemini-2.5-flash',
  },
  tester: {
    claude: 'claude-sonnet-4-5-20250929',
    gemini: 'gemini-2.5-flash',
  },
  reviewer: {
    claude: 'claude-sonnet-4-5-20250929',
    gemini: 'gemini-2.5-pro',
  },
  merger: {
    claude: 'claude-sonnet-4-5-20250929',
    gemini: 'gemini-2.5-flash',
  },
};
```

**UI Usage:**
- Settings page model dropdowns
- Agent configuration
- Model selection hints

---

## Helper Functions for UI

From `src/llm/models.ts`:

```typescript
// Get model lists for dropdowns
getClaudeModelList(): ModelInfo[]
getGeminiModelList(): ModelInfo[]
getLocalEmbeddingModelList(): EmbeddingModelInfo[]
getOpenAIEmbeddingModelList(): EmbeddingModelInfo[]

// Validation
isValidClaudeModel(modelId: string): boolean
isValidGeminiModel(modelId: string): boolean
isValidEmbeddingModel(modelId: string, backend: 'local' | 'api'): boolean

// Model info retrieval
getClaudeModel(modelId: string): ModelInfo | undefined
getGeminiModel(modelId: string): ModelInfo | undefined
getEmbeddingDimensions(modelId: string, backend: 'local' | 'api'): number
```

---

## Type Compatibility Notes

### Core vs Renderer Types

Some types have variants between core and renderer:

1. **FeatureStatus**
   - Core: `'pending' | 'decomposing' | 'ready' | 'in_progress' | 'completed' | 'failed'`
   - Renderer: `'backlog' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'done'`
   - **Note:** Renderer uses snake_case for Kanban column IDs

2. **RequirementCategory**
   - Core and Interview engine have slightly different categories
   - Use adapters when converting between layers

3. **Date vs Number**
   - Core types use `Date` objects
   - Renderer types often use `number` (timestamps) or `string` (ISO)
   - Convert appropriately when passing data

---

## Summary

This document maps all 50+ interfaces and types used throughout Nexus:

- **Core Domain:** 8 interfaces (Project, Feature, Requirement, etc.)
- **Task Types:** 6 interfaces (Task, TaskResult, QAResult, etc.)
- **Agent Types:** 4 interfaces (Agent, AgentMetrics, etc.)
- **Settings:** 12 interfaces (LLMSettings, AgentSettings, etc.)
- **LLM Types:** 10 interfaces (Message, LLMResponse, etc.)
- **Orchestration:** 8 interfaces (CoordinatorStatus, ProjectProgress, etc.)
- **Planning:** 6 interfaces (PlanningTask, Wave, etc.)
- **Interview:** 6 interfaces (InterviewMessage, ExtractedRequirement, etc.)
- **UI-Specific:** 5 interfaces (Feature for Kanban, etc.)
- **Model Config:** 2 interfaces + helper functions

The UI must be able to display and interact with all these types to fully expose Nexus's capabilities.
