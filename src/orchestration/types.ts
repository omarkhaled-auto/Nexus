/**
 * Orchestration Layer Types
 *
 * Types for the orchestration layer including:
 * - NexusCoordinator interfaces
 * - AgentPool interfaces
 * - TaskQueue interfaces
 * - Event types
 * - Checkpoint types
 */

import type { AgentType, AgentStatus, AgentMetrics, AgentModelConfig } from '../types/agent';
import type { TaskType, TaskStatus, TaskPriority } from '../types/task';

// Re-export agent types for convenience
export type { AgentType, AgentStatus, AgentMetrics, AgentModelConfig };

// ============================================================================
// Coordinator State Types
// ============================================================================

/**
 * Coordinator operational state
 */
export type CoordinatorState =
  | 'idle'      // Not started
  | 'running'   // Active execution
  | 'paused'    // Temporarily paused
  | 'stopping'; // Shutting down

/**
 * Execution phase within orchestration
 */
export type ExecutionPhase =
  | 'planning'    // Decomposing and planning tasks
  | 'execution'   // Executing tasks
  | 'review'      // Human review checkpoint
  | 'completed';  // All tasks done

/**
 * Project mode for orchestration
 */
export type ProjectMode = 'genesis' | 'evolution';

// ============================================================================
// Project Configuration
// ============================================================================

/**
 * Feature definition for orchestration
 */
export interface OrchestrationFeature {
  id: string;
  name: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  status: 'backlog' | 'planning' | 'in_progress' | 'completed';
  complexity: 'simple' | 'moderate' | 'complex';
  subFeatures?: OrchestrationFeature[];
  estimatedTasks?: number;
  completedTasks?: number;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}

/**
 * Project configuration for coordinator initialization
 */
export interface ProjectConfig {
  projectId: string;
  projectPath: string;
  name?: string;
  description?: string;
  mode?: ProjectMode;
  features?: OrchestrationFeature[];
  settings?: {
    maxConcurrentAgents?: number;
    maxTaskMinutes?: number;
    qaMaxIterations?: number;
    enableTDD?: boolean;
    autoMerge?: boolean;
  };
}

// ============================================================================
// Status Types
// ============================================================================

/**
 * Coordinator status snapshot
 */
export interface CoordinatorStatus {
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

/**
 * Project progress metrics
 */
export interface ProjectProgress {
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

// ============================================================================
// Task Types (Orchestration Layer)
// ============================================================================

/**
 * Task as used in orchestration
 */
export interface OrchestrationTask {
  id: string;
  name: string;
  description: string;
  type?: TaskType;
  status: TaskStatus;
  priority: number;
  waveId?: number;
  featureId?: string;
  files?: string[];
  dependencies?: string[];
  testCriteria?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Agent Pool Types
// ============================================================================

/**
 * Agent as managed by the pool
 */
export interface PoolAgent {
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

/**
 * Agent pool interface
 */
export interface IAgentPool {
  /** Spawn a new agent of the given type */
  spawn(type: AgentType): PoolAgent;

  /** Terminate an agent */
  terminate(agentId: string): void;

  /** Assign agent to a task */
  assign(agentId: string, taskId: string, worktreePath?: string): void;

  /** Release agent from current task */
  release(agentId: string): void;

  /** Get all agents */
  getAll(): PoolAgent[];

  /** Get active (non-idle) agents */
  getActive(): PoolAgent[];

  /** Get an available (idle) agent */
  getAvailable(): PoolAgent | undefined;

  /** Get agent by ID */
  getById(agentId: string): PoolAgent | undefined;

  /** Get current pool size */
  size(): number;
}

// ============================================================================
// Task Queue Types
// ============================================================================

/**
 * Task queue interface
 */
export interface ITaskQueue {
  /** Add task to queue */
  enqueue(task: OrchestrationTask, waveId?: number): void;

  /** Remove and return highest priority ready task */
  dequeue(): OrchestrationTask | undefined;

  /** Get tasks ready for execution */
  getReadyTasks(): OrchestrationTask[];

  /** Get tasks in a specific wave */
  getByWave(waveId: number): OrchestrationTask[];

  /** Mark task as complete */
  markComplete(taskId: string): void;

  /** Mark task as failed */
  markFailed(taskId: string): void;

  /** Get queue size */
  size(): number;

  /** Check if queue is empty */
  isEmpty(): boolean;
}

// ============================================================================
// Event Types (Orchestration-specific)
// ============================================================================

/**
 * Event types specific to orchestration
 */
export type NexusEventType =
  | 'coordinator:started'
  | 'coordinator:paused'
  | 'coordinator:resumed'
  | 'coordinator:stopped'
  | 'wave:started'
  | 'wave:completed'
  | 'task:assigned'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:escalated'
  | 'task:merged'
  | 'task:merge-failed'
  | 'agent:released'
  | 'checkpoint:created'
  | 'checkpoint:failed'
  | 'orchestration:mode';

/**
 * Orchestration event structure
 */
export interface NexusEvent {
  type: NexusEventType;
  timestamp: Date;
  projectId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Checkpoint Types
// ============================================================================

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  name?: string;
  projectId?: string;
  waveId: number;
  completedTaskIds: string[];
  pendingTaskIds: string[];
  coordinatorState: CoordinatorState;
}

/**
 * Checkpoint for resumption
 */
export interface Checkpoint {
  id: string;
  metadata: CheckpointMetadata;
  gitCommit?: string;
  createdAt: Date;
}

// ============================================================================
// Coordinator Interface
// ============================================================================

/**
 * Main coordinator interface
 */
export interface INexusCoordinator {
  /** Initialize with project configuration */
  initialize(config: ProjectConfig): void;

  /** Start orchestration for a project */
  start(projectId: string): void;

  /** Pause execution gracefully */
  pause(reason?: string): Promise<void>;

  /** Resume from paused state */
  resume(): void;

  /** Stop execution and clean up */
  stop(): Promise<void>;

  /** Get current coordinator status */
  getStatus(): CoordinatorStatus;

  /** Get project progress metrics */
  getProgress(): ProjectProgress;

  /** Get all currently active agents */
  getActiveAgents(): PoolAgent[];

  /** Get all pending tasks in queue */
  getPendingTasks(): OrchestrationTask[];

  /** Register event handler */
  onEvent(handler: (event: NexusEvent) => void): void;

  /** Create a checkpoint for later resumption */
  createCheckpoint(name?: string): Promise<Checkpoint>;
}
