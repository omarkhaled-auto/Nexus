// Orchestration Types for Nexus
// Phase 04-02: NexusCoordinator, AgentPool, TaskQueue

import type { Task as ExecutionTask } from '@/execution/agents/types';
import type { PlanningTask, Wave } from '@/planning/types';
import type { ProjectSettings } from '@/types/core';

// Re-export for convenience
export type { ExecutionTask, PlanningTask, Wave };

// ============================================================================
// Orchestration Task (extends PlanningTask with execution context)
// ============================================================================

/**
 * Orchestration task status
 */
export type OrchestrationTaskStatus =
  | 'pending'
  | 'queued'
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed';

/**
 * Task for orchestration - extends PlanningTask with execution context
 */
export interface OrchestrationTask extends PlanningTask {
  status: OrchestrationTaskStatus;
  waveId?: number;
  assignedAgentId?: string;
  worktreePath?: string;
  priority: number; // Lower number = higher priority
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskExecutionResult;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  success: boolean;
  filesChanged: string[];
  output: string;
  error?: string;
  qaIterations: number;
  duration: number; // milliseconds
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent types for orchestration
 */
export type PoolAgentType = 'coder' | 'tester' | 'reviewer' | 'merger';

/**
 * Agent states in pool
 */
export type PoolAgentState = 'idle' | 'assigned' | 'running' | 'terminated';

/**
 * Agent in the pool
 */
export interface PoolAgent {
  id: string;
  type: PoolAgentType;
  state: PoolAgentState;
  currentTaskId?: string;
  worktreePath?: string;
  createdAt: Date;
  lastActivity?: Date;
}

// ============================================================================
// Coordinator Types
// ============================================================================

/**
 * Coordinator state machine
 */
export type CoordinatorState = 'idle' | 'running' | 'paused' | 'stopping';

/**
 * Execution phase
 */
export type ExecutionPhase = 'interview' | 'planning' | 'execution' | 'review';

/**
 * Coordinator status
 */
export interface CoordinatorStatus {
  state: CoordinatorState;
  projectId?: string;
  activeAgents: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentPhase: ExecutionPhase;
  currentWave?: number;
  totalWaves?: number;
  pauseReason?: string;
}

/**
 * Project progress
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

/**
 * Checkpoint for resumption
 */
export interface Checkpoint {
  id: string;
  name?: string;
  projectId: string;
  waveId: number;
  completedTaskIds: string[];
  pendingTaskIds: string[];
  timestamp: Date;
  coordinatorState: CoordinatorState;
}

/**
 * Project mode - Genesis (new project) or Evolution (existing codebase)
 * Hotfix #5 - Issue 4: Mode affects decomposition strategy
 */
export type ProjectMode = 'genesis' | 'evolution';

/**
 * Project configuration for coordinator
 */
export interface ProjectConfig {
  projectId: string;
  projectPath: string;
  settings: ProjectSettings;
  features?: { id: string; name: string; description: string }[];
  /** Project mode: 'genesis' for new projects, 'evolution' for existing codebases */
  mode?: ProjectMode;
  /** Requirements for Genesis mode */
  requirements?: { id: string; description: string }[];
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Nexus event types
 * Hotfix #5 - Added new events for merge, mode, and checkpoint operations
 */
export type NexusEventType =
  | 'coordinator:started'
  | 'coordinator:paused'
  | 'coordinator:resumed'
  | 'coordinator:stopped'
  | 'wave:started'
  | 'wave:completed'
  | 'task:queued'
  | 'task:assigned'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:merged'       // Hotfix #5 - Issue 2: Task merged to main
  | 'task:merge-failed' // Hotfix #5 - Issue 2: Task merge failed
  | 'task:escalated'    // Hotfix #5 - Task escalated for human intervention
  | 'agent:spawned'
  | 'agent:assigned'
  | 'agent:released'
  | 'agent:terminated'
  | 'checkpoint:created'
  | 'checkpoint:failed'    // Hotfix #5 - Issue 3: Checkpoint creation failed
  | 'orchestration:mode';  // Hotfix #5 - Issue 4: Mode selection event

/**
 * Base Nexus event
 */
export interface NexusEvent {
  type: NexusEventType;
  timestamp: Date;
  projectId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Task queue interface
 */
export interface ITaskQueue {
  enqueue(task: OrchestrationTask, waveId?: number): void;
  dequeue(): OrchestrationTask | null;
  peek(): OrchestrationTask | null;
  markComplete(taskId: string): void;
  markFailed(taskId: string): void;
  getReadyTasks(): OrchestrationTask[];
  getByWave(waveId: number): OrchestrationTask[];
  size(): number;
  clear(): void;
}

/**
 * Agent pool interface
 */
export interface IAgentPool {
  spawn(type: PoolAgentType): PoolAgent;
  getAvailable(): PoolAgent | null;
  assign(agentId: string, taskId: string, worktreePath?: string): void;
  release(agentId: string): void;
  terminate(agentId: string): void;
  getAll(): PoolAgent[];
  getActive(): PoolAgent[];
  size(): number;
  availableCount(): number;
}

/**
 * Nexus coordinator interface
 */
export interface INexusCoordinator {
  initialize(config: ProjectConfig): Promise<void>;
  start(projectId: string): Promise<void>;
  pause(reason?: string): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): CoordinatorStatus;
  getProgress(): ProjectProgress;
  getActiveAgents(): PoolAgent[];
  getPendingTasks(): OrchestrationTask[];
  onEvent(handler: (event: NexusEvent) => void): void;
  createCheckpoint(name?: string): Promise<Checkpoint>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum agents in pool
 */
export const MAX_AGENTS = 4;

/**
 * Default wave poll interval (ms)
 */
export const DEFAULT_POLL_INTERVAL = 100;
