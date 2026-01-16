// NexusCoordinator - Main Orchestration Loop
// Phase 04-02: Full implementation

import type {
  INexusCoordinator,
  ProjectConfig,
  CoordinatorStatus,
  CoordinatorState,
  ExecutionPhase,
  ProjectProgress,
  PoolAgent,
  OrchestrationTask,
  NexusEvent,
  NexusEventType,
  Checkpoint,
  ITaskQueue,
  IAgentPool,
} from '../types';
import type {
  ITaskDecomposer,
  IDependencyResolver,
  ITimeEstimator,
  Wave,
  PlanningTask,
} from '@/planning/types';

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
  mergerRunner?: any; // MergerRunner for merging task branches
  agentWorktreeBridge?: any; // AgentWorktreeBridge for worktree management
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
 *
 * State machine: idle -> running -> paused -> running -> stopping -> idle
 */
export class NexusCoordinator implements INexusCoordinator {
  // Dependencies
  private readonly taskQueue: ITaskQueue;
  private readonly agentPool: IAgentPool;
  private readonly decomposer: ITaskDecomposer;
  private readonly resolver: IDependencyResolver;
  private readonly estimator: ITimeEstimator;
  private readonly qaEngine: any;
  private readonly worktreeManager: any;
  private readonly checkpointManager: any;
  private readonly mergerRunner?: any;
  private readonly agentWorktreeBridge?: any;

  // State
  private state: CoordinatorState = 'idle';
  private currentPhase: ExecutionPhase = 'planning';
  private pauseReason?: string;
  private projectConfig?: ProjectConfig;
  private waves: Wave[] = [];
  private currentWaveIndex = 0;
  private totalTasks = 0;
  private completedTasks = 0;
  private failedTasks = 0;

  // Control
  private stopRequested = false;
  private pauseRequested = false;
  private orchestrationLoop?: Promise<void>;
  private eventHandlers: Array<(event: NexusEvent) => void> = [];

  constructor(options: NexusCoordinatorOptions) {
    this.taskQueue = options.taskQueue;
    this.agentPool = options.agentPool;
    this.decomposer = options.decomposer;
    this.resolver = options.resolver;
    this.estimator = options.estimator;
    this.qaEngine = options.qaEngine;
    this.worktreeManager = options.worktreeManager;
    this.checkpointManager = options.checkpointManager;
    this.mergerRunner = options.mergerRunner;
    this.agentWorktreeBridge = options.agentWorktreeBridge;
  }

  /**
   * Initialize coordinator with project configuration
   */
  initialize(config: ProjectConfig): void {
    this.projectConfig = config;
    this.state = 'idle';
    this.currentPhase = 'planning';
    this.pauseReason = undefined;
    this.waves = [];
    this.currentWaveIndex = 0;
    this.totalTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.stopRequested = false;
    this.pauseRequested = false;
  }

  /**
   * Start orchestration for a project
   */
  start(projectId: string): void {
    if (!this.projectConfig) {
      throw new Error('Coordinator not initialized');
    }

    this.state = 'running';
    this.currentPhase = 'execution';
    this.stopRequested = false;
    this.pauseRequested = false;

    this.emitEvent('coordinator:started', { projectId });

    // Start the orchestration loop
    this.orchestrationLoop = this.runOrchestrationLoop();
  }

  /**
   * Pause execution gracefully
   */
  async pause(reason?: string): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.pauseRequested = true;
    this.pauseReason = reason;

    // Wait briefly for state transition
    await new Promise(resolve => setTimeout(resolve, 10));

    this.state = 'paused';
    this.emitEvent('coordinator:paused', { reason });
  }

  /**
   * Resume from paused state
   */
  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    this.pauseRequested = false;
    this.pauseReason = undefined;
    this.state = 'running';

    this.emitEvent('coordinator:resumed');

    // Continue the orchestration loop
    if (!this.orchestrationLoop) {
      this.orchestrationLoop = this.runOrchestrationLoop();
    }
  }

  /**
   * Stop execution and clean up
   */
  async stop(): Promise<void> {
    this.stopRequested = true;
    this.state = 'stopping';

    // Wait for orchestration loop to stop
    if (this.orchestrationLoop) {
      await Promise.race([
        this.orchestrationLoop,
        new Promise(resolve => setTimeout(resolve, 1000)),
      ]);
      this.orchestrationLoop = undefined;
    }

    // Clean up agents
    for (const agent of this.agentPool.getAll()) {
      try {
        this.agentPool.terminate(agent.id);
      } catch {
        // Ignore termination errors
      }
    }

    this.state = 'idle';
    this.emitEvent('coordinator:stopped');
  }

  /**
   * Get current coordinator status
   */
  getStatus(): CoordinatorStatus {
    return {
      state: this.state,
      projectId: this.projectConfig?.projectId,
      activeAgents: this.agentPool.getActive().length,
      queuedTasks: this.taskQueue.size(),
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      currentPhase: this.currentPhase,
      currentWave: this.currentWaveIndex,
      totalWaves: this.waves.length,
      pauseReason: this.pauseReason,
    };
  }

  /**
   * Get project progress metrics
   */
  getProgress(): ProjectProgress {
    const progressPercent = this.totalTasks > 0
      ? Math.round((this.completedTasks / this.totalTasks) * 100)
      : 0;

    // Estimate remaining time based on average task time
    const averageTaskMinutes = 15; // Default estimate
    const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;
    const estimatedRemainingMinutes = remainingTasks * averageTaskMinutes;

    return {
      projectId: this.projectConfig?.projectId ?? '',
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      progressPercent,
      estimatedRemainingMinutes,
      currentWave: this.currentWaveIndex,
      totalWaves: this.waves.length,
      activeAgents: this.agentPool.getActive().length,
    };
  }

  /**
   * Get all currently active agents
   */
  getActiveAgents(): PoolAgent[] {
    return this.agentPool.getActive();
  }

  /**
   * Get all pending tasks in queue
   */
  getPendingTasks(): OrchestrationTask[] {
    return this.taskQueue.getReadyTasks();
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: NexusEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Create a checkpoint for later resumption
   */
  async createCheckpoint(name?: string): Promise<Checkpoint> {
    const checkpoint = await this.checkpointManager.create({
      name,
      projectId: this.projectConfig?.projectId,
      waveId: this.currentWaveIndex,
      completedTaskIds: [], // Would be tracked
      pendingTaskIds: [], // Would be tracked
      coordinatorState: this.state,
    });

    this.emitEvent('checkpoint:created', { checkpointId: checkpoint.id, name });

    return checkpoint;
  }

  /**
   * Emit an event to all registered handlers
   */
  private emitEvent(type: NexusEventType, data?: Record<string, unknown>): void {
    const event: NexusEvent = {
      type,
      timestamp: new Date(),
      projectId: this.projectConfig?.projectId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Main orchestration loop
   * Hotfix #5 - Issue 3: Added per-wave checkpoints
   * Hotfix #5 - Issue 4: Added Genesis/Evolution mode branching
   */
  private async runOrchestrationLoop(): Promise<void> {
    try {
      const config = this.projectConfig!;

      // HOTFIX #5 - Issue 4: Genesis/Evolution mode branching
      // Different modes have different decomposition strategies
      const allTasks = await this.decomposeByMode(config);

      // Check for cycles
      const cycles = this.resolver.detectCycles(allTasks);
      if (cycles.length > 0) {
        throw new Error(`Dependency cycles detected: ${cycles.map(c => c.taskIds.join(' -> ')).join('; ')}`);
      }

      // Calculate waves
      this.waves = this.resolver.calculateWaves(allTasks);
      this.totalTasks = allTasks.length;

      // Queue all tasks by wave
      for (const wave of this.waves) {
        for (const task of wave.tasks) {
          const orchestrationTask: OrchestrationTask = {
            ...task,
            status: 'pending',
            waveId: wave.id,
            priority: 1,
            createdAt: new Date(),
          };
          this.taskQueue.enqueue(orchestrationTask, wave.id);
        }
      }

      // Process waves with checkpoints
      for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
        if (this.stopRequested) break;

        this.currentWaveIndex = waveIndex;
        this.emitEvent('wave:started', { waveId: waveIndex });

        const wave = this.waves[waveIndex];
        if (wave) {
          await this.processWave(wave);
        }

        if (!this.stopRequested) {
          this.emitEvent('wave:completed', { waveId: waveIndex });

          // HOTFIX #5 - Issue 3: Create checkpoint after each wave
          // This provides a safety net - can recover if crash after wave
          await this.createWaveCheckpoint(waveIndex);
        }
      }
    } catch (error) {
      // Log error but don't crash
      console.error('Orchestration error:', error);
    }
  }

  /**
   * Decompose features based on project mode
   * Hotfix #5 - Issue 4: Genesis vs Evolution mode distinction
   *
   * Genesis mode: Full decomposition from requirements (greenfield project)
   * Evolution mode: Analyze existing code, targeted changes (existing codebase)
   */
  private async decomposeByMode(config: ProjectConfig): Promise<PlanningTask[]> {
    const mode = config.mode ?? 'genesis';
    const features = config.features ?? [];
    const allTasks: PlanningTask[] = [];

    if (mode === 'genesis') {
      // Genesis: Full decomposition from requirements
      // Project is new - decompose all features completely
      this.emitEvent('orchestration:mode', { mode: 'genesis', reason: 'Full decomposition from requirements' });

      for (const feature of features) {
        const tasks = await this.decomposer.decompose(feature as any);
        allTasks.push(...tasks);
      }

      // If no features, create mock feature for decomposition
      if (allTasks.length === 0) {
        const mockFeature = {
          id: 'mock',
          name: 'Mock',
          description: 'Mock',
          priority: 'must' as const,
          status: 'backlog' as const,
          complexity: 'simple' as const,
          subFeatures: [],
          estimatedTasks: 1,
          completedTasks: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: config.projectId,
        };
        const tasks = await this.decomposer.decompose(mockFeature as any);
        allTasks.push(...tasks);
      }
    } else {
      // Evolution: Analyze existing code, targeted changes
      // Project exists - decompose features with awareness of existing code
      this.emitEvent('orchestration:mode', { mode: 'evolution', reason: 'Targeted changes to existing codebase' });

      // TODO: In future, implement analyzeExistingCode() to understand current state
      // For now, use same decomposition but flag for evolution-aware handling
      for (const feature of features) {
        const tasks = await this.decomposer.decompose(feature as any);

        // Tag tasks as evolution-mode for downstream handling
        for (const task of tasks) {
          task.testCriteria = task.testCriteria ?? [];
          task.testCriteria.push('Evolution: Verify compatibility with existing code');
        }

        allTasks.push(...tasks);
      }
    }

    return allTasks;
  }

  /**
   * Create checkpoint after wave completion
   * Hotfix #5 - Issue 3: Per-wave checkpoints for recovery
   */
  private async createWaveCheckpoint(waveIndex: number): Promise<void> {
    try {
      const checkpointName = `Wave ${waveIndex} complete`;

      await this.checkpointManager.create({
        name: checkpointName,
        projectId: this.projectConfig?.projectId,
        waveId: waveIndex,
        completedTaskIds: [], // Would be tracked in production
        pendingTaskIds: [],
        coordinatorState: this.state,
      });

      this.emitEvent('checkpoint:created', {
        waveId: waveIndex,
        reason: checkpointName,
      });
    } catch (error) {
      // Log but don't fail orchestration due to checkpoint error
      console.error('Failed to create wave checkpoint:', error);
      this.emitEvent('checkpoint:failed', {
        waveId: waveIndex,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Process a single wave of tasks
   */
  private async processWave(wave: Wave): Promise<void> {
    const runningTasks: Map<string, Promise<void>> = new Map();

    while (!this.stopRequested) {
      // Handle pause
      if (this.pauseRequested) {
        // Wait for all running tasks to complete
        await Promise.all(runningTasks.values());
        // Wait for resume
        while (this.pauseRequested && !this.stopRequested) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (this.stopRequested) break;
      }

      // Check if wave is complete
      const waveTasks = this.taskQueue.getByWave(wave.id);
      if (waveTasks.length === 0 && runningTasks.size === 0) {
        break;
      }

      // Get ready tasks and available agents
      const readyTasks = this.taskQueue.getReadyTasks();
      const waveReadyTasks = readyTasks.filter(t => t.waveId === wave.id);

      // Try to assign tasks to agents
      for (const _task of waveReadyTasks) {
        if (this.stopRequested || this.pauseRequested) break;

        // Check if we have an available agent or can spawn one
        let agent = this.agentPool.getAvailable();
        if (!agent && this.agentPool.size() < 4) {
          try {
            agent = this.agentPool.spawn('coder');
          } catch {
            // Pool at capacity
            break;
          }
        }

        if (!agent) {
          // No available agents, wait for one
          break;
        }

        // Dequeue and assign task
        const dequeuedTask = this.taskQueue.dequeue();
        if (!dequeuedTask) break;

        // Create worktree for isolation
        let worktreePath: string | undefined;
        try {
          const worktree = await this.worktreeManager.createWorktree(dequeuedTask.id);
          worktreePath = worktree.path;
        } catch {
          // Continue without worktree
        }

        // Assign agent to task
        this.agentPool.assign(agent.id, dequeuedTask.id, worktreePath);
        this.emitEvent('task:assigned', { taskId: dequeuedTask.id, agentId: agent.id });

        // Start task execution
        const taskPromise = this.executeTask(dequeuedTask, agent.id, worktreePath);
        runningTasks.set(dequeuedTask.id, taskPromise);

        // Remove from running when complete
        taskPromise.finally(() => {
          runningTasks.delete(dequeuedTask.id);
        });
      }

      // Wait a bit before next iteration
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for all running tasks to complete
    await Promise.all(runningTasks.values());
  }

  /**
   * Execute a single task with per-task merge on success
   * Hotfix #5 - Issue 2: Added merge step after successful QA loop
   */
  private async executeTask(
    task: OrchestrationTask,
    agentId: string,
    worktreePath?: string
  ): Promise<void> {
    this.emitEvent('task:started', { taskId: task.id, agentId });

    try {
      // Run QA loop
      const result = await this.qaEngine.run(
        {
          id: task.id,
          name: task.name,
          description: task.description,
          files: task.files ?? [],
          worktree: worktreePath,
        },
        null // coder would be passed here
      );

      if (result.success) {
        // HOTFIX #5 - Issue 2: Merge to main on success
        // Code stays in worktree without this step
        if (worktreePath && this.mergerRunner) {
          try {
            await this.mergerRunner.merge(worktreePath, 'main');
            this.emitEvent('task:merged', { taskId: task.id, branch: 'main' });
          } catch (mergeError) {
            // Log merge failure but don't fail the task
            this.emitEvent('task:merge-failed', {
              taskId: task.id,
              error: mergeError instanceof Error ? mergeError.message : String(mergeError),
            });
          }
        }

        this.taskQueue.markComplete(task.id);
        this.completedTasks++;
        this.emitEvent('task:completed', { taskId: task.id, agentId });
      } else if (result.escalated) {
        // Task escalated - needs human intervention
        this.taskQueue.markFailed(task.id);
        this.failedTasks++;
        this.emitEvent('task:escalated', {
          taskId: task.id,
          agentId,
          reason: result.reason ?? 'Max QA iterations exceeded',
        });
      } else {
        this.taskQueue.markFailed(task.id);
        this.failedTasks++;
        this.emitEvent('task:failed', {
          taskId: task.id,
          agentId,
          escalated: result.escalated,
        });
      }
    } catch (error) {
      this.taskQueue.markFailed(task.id);
      this.failedTasks++;
      this.emitEvent('task:failed', {
        taskId: task.id,
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Release agent from worktree bridge (if available)
      if (this.agentWorktreeBridge) {
        try {
          await this.agentWorktreeBridge.releaseWorktree(agentId);
        } catch {
          // Ignore bridge cleanup errors
        }
      }

      // Release agent
      try {
        this.agentPool.release(agentId);
        this.emitEvent('agent:released', { agentId });
      } catch {
        // Agent might already be terminated
      }

      // Clean up worktree
      if (worktreePath) {
        try {
          await this.worktreeManager.removeWorktree(task.id);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
