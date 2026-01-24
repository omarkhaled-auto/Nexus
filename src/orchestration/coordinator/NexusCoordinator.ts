// NexusCoordinator - Main Orchestration Loop
// Phase 04-02: Full implementation
//
// Note: This file uses `any` typed external services (QALoopEngine, WorktreeManager, etc.)
// to avoid circular dependencies. The unsafe-* lint rules are disabled for lines that
// interact with these services.
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

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
  OrchestrationFeature,
} from '../types';
import type {
  ITaskDecomposer,
  IDependencyResolver,
  ITimeEstimator,
  Wave,
  PlanningTask,
} from '@/planning/types';
import { GitService } from '@/infrastructure/git/GitService';
import { WorktreeManager } from '@/infrastructure/git/WorktreeManager';

/**
 * NexusCoordinator constructor options
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- These types come from other modules to avoid circular dependencies */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  /* eslint-disable @typescript-eslint/no-explicit-any -- External service types to avoid circular dependencies */
  private readonly qaEngine: any;
  private worktreeManager: any; // Mutable - can be replaced with project-specific instance
  private readonly checkpointManager: any;
  private readonly mergerRunner?: any;
  private readonly agentWorktreeBridge?: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

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
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- any-typed services from options */
    this.qaEngine = options.qaEngine;
    this.worktreeManager = options.worktreeManager;
    this.checkpointManager = options.checkpointManager;
    this.mergerRunner = options.mergerRunner;
    this.agentWorktreeBridge = options.agentWorktreeBridge;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
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
   * Execute pre-decomposed tasks (skip decomposition phase)
   * Used when tasks already exist in database from planning phase.
   * This is the correct method to call when user clicks "Start Execution"
   * after features/tasks have been generated during the interview.
   *
   * @param projectId - The project ID
   * @param tasks - Array of existing tasks from database
   * @param projectPath - Path to user's project folder (NOT Nexus-master)
   */
  executeExistingTasks(
    projectId: string,
    tasks: OrchestrationTask[],
    projectPath: string
  ): void {
    // Set project config with the project's actual path
    this.projectConfig = {
      projectId,
      projectPath, // User's project folder, NOT Nexus-master
      features: [],
      mode: 'evolution',
    };

    this.state = 'running';
    this.currentPhase = 'execution';
    this.stopRequested = false;
    this.pauseRequested = false;

    console.log(`[NexusCoordinator] Executing ${tasks.length} existing tasks`);
    console.log(`[NexusCoordinator] Project path: ${projectPath}`);

    // Create project-specific WorktreeManager for correct worktree location
    // This ensures worktrees are created in the user's project, not Nexus-master
    const projectGitService = new GitService({ baseDir: projectPath });
    this.worktreeManager = new WorktreeManager({
      baseDir: projectPath,
      gitService: projectGitService,
      worktreeDir: `${projectPath}/.nexus/worktrees`,
    });
    console.log(`[NexusCoordinator] Created WorktreeManager for project: ${projectPath}`);

    this.emitEvent('coordinator:started', { projectId });

    // Skip decomposition - go directly to execution loop
    this.orchestrationLoop = this.runExecutionLoop(tasks, projectPath);
  }

  /**
   * Run execution loop for existing tasks (no decomposition)
   * This skips the decomposeByMode step and directly processes
   * the provided tasks in waves.
   */
  private async runExecutionLoop(
    allTasks: OrchestrationTask[],
    _projectPath: string
  ): Promise<void> {
    try {
      if (!this.projectConfig) {
        throw new Error('Project configuration not initialized');
      }

      console.log(`[NexusCoordinator] Running execution loop with ${allTasks.length} tasks`);

      // Convert OrchestrationTask[] to PlanningTask[] format for dependency resolver
      // The resolver only uses id and dependsOn fields, so we add required fields with defaults
      const planningTasks: PlanningTask[] = allTasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        type: (task.type ?? 'auto') as 'auto' | 'checkpoint' | 'tdd',
        size: 'small' as const,
        estimatedMinutes: task.estimatedMinutes ?? 15,
        dependsOn: task.dependsOn,
        testCriteria: task.testCriteria ?? [],
        files: task.files ?? [],
      }));

      // Check for cycles
      const cycles: { taskIds: string[] }[] = this.resolver.detectCycles(planningTasks);
      if (cycles.length > 0) {
        throw new Error(`Dependency cycles detected: ${cycles.map(c => c.taskIds.join(' -> ')).join('; ')}`);
      }

      // Calculate waves from existing tasks
      this.waves = this.resolver.calculateWaves(planningTasks);
      this.totalTasks = allTasks.length;

      console.log(`[NexusCoordinator] Calculated ${this.waves.length} waves`);

      // Queue all tasks by wave
      for (const wave of this.waves) {
        for (const task of wave.tasks) {
          const orchestrationTask: OrchestrationTask = {
            ...task,
            dependsOn: task.dependsOn,
            status: 'pending',
            waveId: wave.id,
            priority: 1,
            createdAt: new Date(),
          };
          this.taskQueue.enqueue(orchestrationTask, wave.id);
        }
      }

      // Process waves with checkpoints (same as runOrchestrationLoop)
      for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
        if (this.stopRequested) break;

        this.currentWaveIndex = waveIndex;
        this.emitEvent('wave:started', { waveId: waveIndex });

        const wave = this.waves[waveIndex];
        await this.processWave(wave);

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stopRequested can be mutated during processWave
        if (!this.stopRequested) {
          this.emitEvent('wave:completed', { waveId: waveIndex });
          await this.createWaveCheckpoint(waveIndex);
        }
      }

      // Emit project:completed when all tasks are done
      if (!this.stopRequested) {
        const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;

        if (remainingTasks === 0 && this.completedTasks > 0) {
          this.currentPhase = 'completion';
          this.state = 'idle';

          console.log(`[NexusCoordinator] Project completed: ${this.completedTasks}/${this.totalTasks} tasks completed, ${this.failedTasks} failed`);

          this.emitEvent('project:completed', {
            projectId: this.projectConfig?.projectId,
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            totalWaves: this.waves.length,
          });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);

          this.emitEvent('project:failed', {
            projectId: this.projectConfig?.projectId,
            error: 'All tasks failed',
            totalTasks: this.totalTasks,
            failedTasks: this.failedTasks,
            recoverable: true,
          });
        }
      }
    } catch (error) {
      console.error('[NexusCoordinator] Execution error:', error);

      this.emitEvent('project:failed', {
        projectId: this.projectConfig?.projectId,
        error: error instanceof Error ? error.message : String(error),
        recoverable: false,
      });
    }
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- checkpointManager is any-typed
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
      if (!this.projectConfig) {
        throw new Error('Project configuration not initialized');
      }
      const config = this.projectConfig;

      // HOTFIX #5 - Issue 4: Genesis/Evolution mode branching
      // Different modes have different decomposition strategies
      const allTasks = await this.decomposeByMode(config);

      // Check for cycles
       
      const cycles: { taskIds: string[] }[] = this.resolver.detectCycles(allTasks);
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
            dependsOn: task.dependsOn,
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
        await this.processWave(wave);

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stopRequested can be mutated during processWave
        if (!this.stopRequested) {
          this.emitEvent('wave:completed', { waveId: waveIndex });

          // HOTFIX #5 - Issue 3: Create checkpoint after each wave
          // This provides a safety net - can recover if crash after wave
          await this.createWaveCheckpoint(waveIndex);
        }
      }

      // Phase 20 Task 10: Emit project:completed when all tasks are done
       
      if (!this.stopRequested) {
        const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;

        if (remainingTasks === 0 && this.completedTasks > 0) {
          // All tasks completed (some may have failed)
          this.currentPhase = 'completion';
          this.state = 'idle';

          console.log(`[NexusCoordinator] Project completed: ${this.completedTasks}/${this.totalTasks} tasks completed, ${this.failedTasks} failed`);

          this.emitEvent('project:completed', {
            projectId: this.projectConfig?.projectId,
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            totalWaves: this.waves.length,
          });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          // All tasks failed - project failed
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);

          this.emitEvent('project:failed', {
            projectId: this.projectConfig?.projectId,
            error: 'All tasks failed',
            totalTasks: this.totalTasks,
            failedTasks: this.failedTasks,
            recoverable: true,
          });
        }
      }
    } catch (error) {
      // Log error but don't crash
      console.error('Orchestration error:', error);

      // Emit project:failed on orchestration error
      this.emitEvent('project:failed', {
        projectId: this.projectConfig?.projectId,
        error: error instanceof Error ? error.message : String(error),
        recoverable: false,
      });
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
        const featureDesc = this.featureToDescription(feature);
        const tasks = await this.decomposer.decompose(featureDesc);
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
        const mockFeatureDesc = this.featureToDescription(mockFeature as OrchestrationFeature);
        const tasks = await this.decomposer.decompose(mockFeatureDesc);
        allTasks.push(...tasks);
      }
    } else {
      // Evolution: Analyze existing code, targeted changes
      // Project exists - decompose features with awareness of existing code
      this.emitEvent('orchestration:mode', { mode: 'evolution', reason: 'Targeted changes to existing codebase' });

      // TODO: In future, implement analyzeExistingCode() to understand current state
      // For now, use same decomposition but flag for evolution-aware handling
      for (const feature of features) {
        const featureDesc = this.featureToDescription(feature);
        const tasks = await this.decomposer.decompose(featureDesc);

        // Tag tasks as evolution-mode for downstream handling
        for (const task of tasks) {
          // testCriteria is always present in PlanningTask, just push to it
          task.testCriteria.push('Evolution: Verify compatibility with existing code');
        }

        allTasks.push(...tasks);
      }
    }

    return allTasks;
  }

  /**
   * Convert a Feature object to a string description for decomposition
   * Fix: TaskDecomposer expects string, not Feature object
   */
  private featureToDescription(feature: OrchestrationFeature): string {
    let desc = `## Feature: ${feature.name}\n`;
    desc += `Priority: ${feature.priority}\n`;
    desc += `Description: ${feature.description}`;
    return desc;
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- pauseRequested/stopRequested are mutated asynchronously
        while (this.pauseRequested && !this.stopRequested) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stopRequested can be set during pause wait
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stopRequested/pauseRequested mutated asynchronously
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- worktreeManager is any-typed
          const worktree = await this.worktreeManager.createWorktree(dequeuedTask.id);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- worktree.path is any
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
        void taskPromise.finally(() => {
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
   * Fix: Now passes projectPath to QA engine for correct CLI working directory
   */
  private async executeTask(
    task: OrchestrationTask,
    agentId: string,
    worktreePath?: string
  ): Promise<void> {
    this.emitEvent('task:started', { taskId: task.id, agentId });

    // Get project path from config - this is the user's project folder, NOT Nexus-master
    const projectPath = this.projectConfig?.projectPath;
    console.log(`[NexusCoordinator] executeTask: projectPath = ${projectPath ?? 'UNDEFINED'}`);

    try {
      // Run QA loop with projectPath for correct working directory
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- qaEngine is any-typed
      const result = await this.qaEngine.run(
        {
          id: task.id,
          name: task.name,
          description: task.description,
          files: task.files ?? [],
          worktree: worktreePath,
          projectPath: projectPath,  // Pass project path for Claude CLI working directory
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
