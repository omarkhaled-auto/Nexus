// NexusCoordinator - Main Orchestration Loop
// Phase 04-02: Stub implementation for TDD RED phase

import type {
  INexusCoordinator,
  ProjectConfig,
  CoordinatorStatus,
  ProjectProgress,
  PoolAgent,
  OrchestrationTask,
  NexusEvent,
  Checkpoint,
  ITaskQueue,
  IAgentPool,
} from '../types';
import type { ITaskDecomposer, IDependencyResolver, ITimeEstimator } from '@/planning/types';

/**
 * NexusCoordinator constructor options
 */
export interface NexusCoordinatorOptions {
  taskQueue: ITaskQueue;
  agentPool: IAgentPool;
  decomposer: ITaskDecomposer;
  resolver: IDependencyResolver;
  estimator: ITimeEstimator;
  qaEngine: any; // QALoopEngine type
  worktreeManager: any; // WorktreeManager type
  checkpointManager: any; // CheckpointManager type
}

/**
 * NexusCoordinator is the main orchestration entry point.
 *
 * Features:
 * - Initialize with project config
 * - Start/pause/resume/stop orchestration
 * - Coordinate agents and tasks in waves
 * - Track progress and emit events
 * - Create checkpoints for resumption
 */
export class NexusCoordinator implements INexusCoordinator {
  constructor(_options: NexusCoordinatorOptions) {
    // Stub
  }

  async initialize(_config: ProjectConfig): Promise<void> {
    throw new Error('Not implemented');
  }

  async start(_projectId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async pause(_reason?: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async resume(): Promise<void> {
    throw new Error('Not implemented');
  }

  async stop(): Promise<void> {
    throw new Error('Not implemented');
  }

  getStatus(): CoordinatorStatus {
    throw new Error('Not implemented');
  }

  getProgress(): ProjectProgress {
    throw new Error('Not implemented');
  }

  getActiveAgents(): PoolAgent[] {
    throw new Error('Not implemented');
  }

  getPendingTasks(): OrchestrationTask[] {
    throw new Error('Not implemented');
  }

  onEvent(_handler: (event: NexusEvent) => void): void {
    throw new Error('Not implemented');
  }

  async createCheckpoint(_name?: string): Promise<Checkpoint> {
    throw new Error('Not implemented');
  }
}
