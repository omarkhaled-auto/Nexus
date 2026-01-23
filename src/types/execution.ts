/**
 * Execution Types for Phase 24
 *
 * Types for task orchestration, execution state, and planning progress.
 * These extend the core Task types with execution-specific details.
 */

import type { TaskStatus, TaskPriority } from './task';
import type { AgentType } from './agent';

// Re-export AgentType for convenience
export type { AgentType };

// ============================================================================
// Kanban-Specific Status Types
// ============================================================================

/**
 * Extended task status for Kanban board display
 * Maps to columns in the Kanban UI
 */
export type KanbanTaskStatus =
  | 'pending'      // In backlog, not ready to start
  | 'ready'        // Dependencies met, can be started
  | 'queued'       // Waiting in execution queue
  | 'in-progress'  // Currently being executed
  | 'ai-review'    // AI is reviewing the work
  | 'human-review' // Waiting for human review
  | 'blocked'      // Blocked by an issue
  | 'completed'    // Successfully done
  | 'failed'       // Failed after retries
  | 'cancelled';   // Manually cancelled

/**
 * Task complexity levels
 */
export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';

// ============================================================================
// Task Log Types
// ============================================================================

/**
 * Log level for task execution logs
 */
export type TaskLogLevel = 'info' | 'warning' | 'error' | 'debug';

/**
 * A single log entry during task execution
 */
export interface TaskLog {
  id: string;
  timestamp: string;
  level: TaskLogLevel;
  message: string;
  details?: string;
  agentId?: string;
  phase?: 'planning' | 'coding' | 'testing' | 'review';
}

/**
 * An error that occurred during task execution
 */
export interface TaskError {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  resolved?: boolean;
  resolvedAt?: string;
}

// ============================================================================
// Enhanced Task Interface for Kanban
// ============================================================================

/**
 * Enhanced task interface for Kanban board with all execution details
 * Extends the base Task type with orchestration-specific fields
 */
export interface KanbanTask {
  // Identity
  id: string;
  featureId: string;
  projectId: string;

  // Content
  title: string;
  description: string;
  acceptanceCriteria: string[];

  // Classification
  priority: TaskPriority | 'critical';  // Allow 'critical' as priority
  complexity: TaskComplexity;
  estimatedMinutes: number;

  // Dependencies
  dependsOn: string[];   // Array of task IDs this task depends on
  blockedBy: string[];   // Array of task IDs currently blocking this task

  // Status
  status: KanbanTaskStatus;
  assignedAgent: AgentType | null;

  // Progress
  progress: number;      // 0 to 100
  startedAt: string | null;
  completedAt: string | null;
  actualMinutes: number | null;

  // Files
  filesToCreate: string[];
  filesToModify: string[];
  filesCreated: string[];
  filesModified: string[];

  // Execution
  logs: TaskLog[];
  errors: TaskError[];
  retryCount: number;
  maxRetries: number;

  // QA
  qaIterations: number;
  maxQAIterations: number;

  // History
  statusHistory: TaskStatusHistoryEntry[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Entry in the task status history
 */
export interface TaskStatusHistoryEntry {
  timestamp: string;
  fromStatus: KanbanTaskStatus | null;
  toStatus: KanbanTaskStatus;
  reason?: string;
  agentId?: string;
}

// ============================================================================
// Execution State
// ============================================================================

/**
 * Overall execution status
 */
export type ExecutionStatus =
  | 'idle'       // Not started
  | 'planning'   // Creating tasks
  | 'ready'      // Tasks created, waiting to start
  | 'running'    // Executing tasks
  | 'paused'     // Paused by user
  | 'completed'  // All tasks done
  | 'failed';    // Unrecoverable error

/**
 * Error that occurred during orchestration
 */
export interface ExecutionError {
  id: string;
  timestamp: string;
  taskId: string | null;
  message: string;
  fatal: boolean;
}

/**
 * State of the execution orchestration
 */
export interface ExecutionState {
  // Overall status
  status: ExecutionStatus;
  projectId: string | null;

  // Current execution
  currentTaskId: string | null;
  queuedTaskIds: string[];
  completedTaskIds: string[];
  failedTaskIds: string[];
  blockedTaskIds: string[];

  // Timing
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;

  // Counts
  totalTasks: number;
  completedCount: number;
  failedCount: number;
  inProgressCount: number;

  // Progress
  overallProgress: number;  // 0 to 100
  estimatedRemainingMinutes: number | null;

  // Errors
  errors: ExecutionError[];

  // History
  executionHistory: ExecutionHistoryEntry[];
}

/**
 * Entry in execution history
 */
export interface ExecutionHistoryEntry {
  timestamp: string;
  event: 'started' | 'paused' | 'resumed' | 'stopped' | 'task-completed' | 'task-failed' | 'completed' | 'failed';
  taskId?: string;
  details?: string;
}

// ============================================================================
// Planning State
// ============================================================================

/**
 * Status of the planning phase
 */
export type PlanningStatus =
  | 'idle'
  | 'analyzing'      // Analyzing requirements
  | 'decomposing'    // Breaking into features
  | 'creating-tasks' // Creating individual tasks
  | 'validating'     // Validating dependencies
  | 'complete'
  | 'error';

/**
 * State of the planning phase
 */
export interface PlanningState {
  status: PlanningStatus;
  projectId: string | null;

  // Progress
  progress: number;  // 0 to 100
  currentStep: string;

  // Tasks created during planning
  tasksCreated: PlanningTaskPreview[];
  totalTasksExpected: number | null;

  // Features identified
  featuresIdentified: PlanningFeaturePreview[];

  // Timing
  startedAt: string | null;
  completedAt: string | null;

  // Error
  error: string | null;
}

/**
 * Preview of a task during planning (before full creation)
 */
export interface PlanningTaskPreview {
  id: string;
  title: string;
  featureId: string;
  priority: TaskPriority | 'critical';
  complexity: TaskComplexity;
  estimatedMinutes: number;
  dependsOn: string[];
  status: 'created' | 'pending';
}

/**
 * Preview of a feature during planning
 */
export interface PlanningFeaturePreview {
  id: string;
  name: string;
  taskCount: number;
  status: 'identified' | 'decomposing' | 'ready';
}

// ============================================================================
// Kanban Column Configuration
// ============================================================================

/**
 * Configuration for a Kanban column
 */
export interface KanbanColumnConfig {
  id: string;
  title: string;
  statuses: KanbanTaskStatus[];  // Which task statuses appear in this column
  wipLimit: number | null;       // Work in progress limit, null for unlimited
  color: string;                 // Accent color for the column
  icon?: string;                 // Optional icon name
}

/**
 * Default Kanban column configuration
 */
export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    statuses: ['pending', 'ready'],
    wipLimit: null,
    color: 'gray'
  },
  {
    id: 'queued',
    title: 'Queued',
    statuses: ['queued'],
    wipLimit: null,
    color: 'blue'
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    statuses: ['in-progress'],
    wipLimit: 3,
    color: 'yellow'
  },
  {
    id: 'review',
    title: 'Review',
    statuses: ['ai-review', 'human-review'],
    wipLimit: null,
    color: 'purple'
  },
  {
    id: 'done',
    title: 'Done',
    statuses: ['completed'],
    wipLimit: null,
    color: 'green'
  }
];

// ============================================================================
// IPC Event Payloads
// ============================================================================

/**
 * Payload for planning progress events
 */
export interface PlanningProgressPayload {
  projectId: string;
  status: PlanningStatus;
  progress: number;
  currentStep: string;
  tasksCreated: number;
  totalExpected: number | null;
}

/**
 * Payload for task created during planning
 */
export interface PlanningTaskCreatedPayload {
  projectId: string;
  task: PlanningTaskPreview;
}

/**
 * Payload for planning completed event
 */
export interface PlanningCompletedPayload {
  projectId: string;
  totalTasks: number;
  totalFeatures: number;
  estimatedMinutes: number;
}

/**
 * Payload for execution progress events
 */
export interface ExecutionProgressPayload {
  projectId: string;
  currentTaskId: string | null;
  completedCount: number;
  totalCount: number;
  overallProgress: number;
  status: ExecutionStatus;
}

/**
 * Payload for task status changed event
 */
export interface TaskStatusChangedPayload {
  taskId: string;
  projectId: string;
  previousStatus: KanbanTaskStatus;
  newStatus: KanbanTaskStatus;
  reason?: string;
}
