// NexusCoordinator - Main Orchestration Loop
// Phase 04-02: Full implementation
//
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
import { RepoMapGenerator } from '@/infrastructure/analysis/RepoMapGenerator';
import type { QALoopEngine } from '@/execution/qa/QALoopEngine';
import type { CheckpointManager } from '@/persistence/checkpoints/CheckpointManager';
import type { MergerRunner } from '@/infrastructure/git/MergerRunner';
import type { AgentWorktreeBridge } from '@/bridges/AgentWorktreeBridge';
import type { HumanReviewService } from '@/orchestration/review/HumanReviewService';

/**
 * NexusCoordinator constructor options
 */
export interface NexusCoordinatorOptions {
  taskQueue: ITaskQueue;
  agentPool: IAgentPool;
  decomposer: ITaskDecomposer;
  resolver: IDependencyResolver;
  estimator: ITimeEstimator;
  qaEngine: QALoopEngine;
  worktreeManager: WorktreeManager;
  checkpointManager: CheckpointManager | null;
  mergerRunner?: MergerRunner;
  agentWorktreeBridge?: AgentWorktreeBridge;
  humanReviewService?: HumanReviewService;
}

/**
 * MergerRunner result interface
 */
export interface MergeResult {
  success: boolean;
  commitHash?: string;
  error?: string;
  conflictFiles?: string[];
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
  private readonly qaEngine: QALoopEngine;
  private worktreeManager: WorktreeManager; // Mutable - can be replaced with project-specific instance
  private checkpointManager: CheckpointManager | null; // Mutable - can be injected after creation
  private mergerRunner?: MergerRunner; // Mutable - can be injected after creation (Phase 3)
  private readonly agentWorktreeBridge?: AgentWorktreeBridge;
  private humanReviewService?: HumanReviewService; // Mutable - can be injected after creation (Phase 3: HITL)

  // Escalation tracking - maps reviewId to taskId for review responses
  private escalatedTasks: Map<string, { taskId: string; agentId: string; worktreePath?: string }> = new Map();

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
    this.humanReviewService = options.humanReviewService;
  }

  // ========================================
  // Service Injection Methods (Phase 3)
  // ========================================

  /**
   * Set the human review service for HITL escalation
   * This allows the service to be injected after coordinator creation
   * (since NexusFactory creates coordinator before HumanReviewService)
   */
  setHumanReviewService(service: HumanReviewService): void {
    this.humanReviewService = service;
    console.log('[NexusCoordinator] HumanReviewService injected');
  }

  /**
   * Set the merger runner for worktree->main merging
   */
  setMergerRunner(runner: MergerRunner): void {
    this.mergerRunner = runner;
    console.log('[NexusCoordinator] MergerRunner injected');
  }

  /**
   * Set the checkpoint manager for wave checkpoints
   * Injected after construction since NexusFactory creates coordinator before CheckpointManager
   */
  setCheckpointManager(manager: CheckpointManager): void {
    this.checkpointManager = manager;
    console.log('[NexusCoordinator] CheckpointManager injected');
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
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
              projectId: this.projectConfig?.projectId ?? 'unknown',
              totalTasks: this.totalTasks,
              completedTasks: this.completedTasks,
              failedTasks: this.failedTasks,
              totalWaves: this.waves.length,
            });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);

            this.emitEvent('project:failed', {
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
              projectId: this.projectConfig?.projectId ?? 'unknown',
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
    // Guard: Skip if no checkpoint manager
    if (!this.checkpointManager) {
      throw new Error('CheckpointManager not available');
    }

    const projectId = this.projectConfig?.projectId;
    if (!projectId) {
      throw new Error('No project configured');
    }

    const reason = name ?? `Manual checkpoint at wave ${this.currentWaveIndex}`;

    const result = await this.checkpointManager.createCheckpoint(projectId, reason);

    // Map CheckpointManager result to Checkpoint interface
    const checkpoint: Checkpoint = {
      id: result.id,
      metadata: {
        projectId,
        waveId: this.currentWaveIndex,
        completedTaskIds: [],
        pendingTaskIds: [],
        coordinatorState: this.state,
      },
      gitCommit: result.gitCommit ?? undefined,
      createdAt: result.createdAt,
    };

    this.emitEvent('checkpoint:created', { checkpointId: checkpoint.id, name: reason });

    return checkpoint;
  }

  // ========================================
  // Human Review Response Handlers (Phase 3)
  // ========================================

  /**
   * Handle approval of an escalated task review
   * This is called when a human approves a review request
   *
   * @param reviewId - ID of the review being approved
   * @param resolution - Optional resolution notes from the human
   */
  async handleReviewApproved(reviewId: string, resolution?: string): Promise<void> {
    const escalatedTask = this.escalatedTasks.get(reviewId);
    if (!escalatedTask) {
      console.warn(`[NexusCoordinator] Review ${reviewId} not found in escalated tasks`);
      return;
    }

    const { taskId, agentId, worktreePath } = escalatedTask;
    console.log(`[NexusCoordinator] Review ${reviewId} approved for task ${taskId}`);
    console.log(`[NexusCoordinator] Resolution: ${resolution ?? 'No resolution provided'}`);

    // Remove from tracking
    this.escalatedTasks.delete(reviewId);

    // Mark task as complete (human approved the escalation)
    this.taskQueue.markComplete(taskId);
    this.completedTasks++;

    this.emitEvent('task:completed', {
      taskId,
      agentId,
      resolution,
      humanApproved: true,
    });

    // Clean up worktree if exists
    if (worktreePath) {
      try {
        await this.worktreeManager.removeWorktree(taskId);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Release agent if still held
    try {
      this.agentPool.release(agentId);
    } catch {
      // Agent might already be released
    }

    // Resume orchestration if paused
    if (this.state === 'paused' && this.pauseReason === 'review_pending') {
      this.resume();
    }
  }

  /**
   * Handle rejection of an escalated task review
   * This is called when a human rejects a review request
   *
   * @param reviewId - ID of the review being rejected
   * @param feedback - Required feedback from the human
   */
  async handleReviewRejected(reviewId: string, feedback: string): Promise<void> {
    const escalatedTask = this.escalatedTasks.get(reviewId);
    if (!escalatedTask) {
      console.warn(`[NexusCoordinator] Review ${reviewId} not found in escalated tasks`);
      return;
    }

    const { taskId, agentId, worktreePath } = escalatedTask;
    console.log(`[NexusCoordinator] Review ${reviewId} rejected for task ${taskId}`);
    console.log(`[NexusCoordinator] Feedback: ${feedback}`);

    // Remove from tracking
    this.escalatedTasks.delete(reviewId);

    // Mark task as failed (human rejected)
    this.taskQueue.markFailed(taskId);
    this.failedTasks++;

    this.emitEvent('task:failed', {
      taskId,
      agentId,
      error: `Human rejected: ${feedback}`,
      humanRejected: true,
      feedback,
    });

    // Clean up worktree if exists
    if (worktreePath) {
      try {
        await this.worktreeManager.removeWorktree(taskId);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Release agent if still held
    try {
      this.agentPool.release(agentId);
    } catch {
      // Agent might already be released
    }

    // Resume orchestration if paused
    if (this.state === 'paused' && this.pauseReason === 'review_pending') {
      this.resume();
    }
  }

  /**
   * Get list of escalated tasks awaiting human review
   */
  getEscalatedTasks(): Array<{ reviewId: string; taskId: string }> {
    return Array.from(this.escalatedTasks.entries()).map(([reviewId, { taskId }]) => ({
      reviewId,
      taskId,
    }));
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
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? 'unknown',
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            totalWaves: this.waves.length,
          });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          // All tasks failed - project failed
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);

          this.emitEvent('project:failed', {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? 'unknown',
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

      // Analyze existing codebase to provide context for decomposition
      let existingCodeContext = '';
      if (config.projectPath) {
        try {
          console.log(`[NexusCoordinator] Analyzing existing codebase for Evolution mode at: ${config.projectPath}`);
          this.emitEvent('evolution:analyzing', { projectPath: config.projectPath });

          // Generate repo map for existing code
          const repoMapGenerator = new RepoMapGenerator();
          await repoMapGenerator.initialize();
          const repoMap = await repoMapGenerator.generate(config.projectPath, {
            maxFiles: 500,
            countReferences: true,
          });

          // Format for context with token limit
          existingCodeContext = repoMapGenerator.formatForContext({
            maxTokens: 8000,
            includeSignatures: true,
            rankByReferences: true,
          });

          console.log(`[NexusCoordinator] Repo map generated: ${repoMap.stats.totalFiles} files, ${repoMap.stats.totalSymbols} symbols`);
          this.emitEvent('evolution:analyzed', {
            totalFiles: repoMap.stats.totalFiles,
            totalSymbols: repoMap.stats.totalSymbols,
          });
        } catch (error) {
          console.warn('[NexusCoordinator] Failed to analyze existing code (continuing without context):', error);
          this.emitEvent('evolution:analysis-failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Decompose features with existing code context
      for (const feature of features) {
        let featureDesc = this.featureToDescription(feature);

        // Prepend existing code context if available
        if (existingCodeContext) {
          featureDesc = `## Existing Codebase Context\n\nThe following is a map of the existing codebase. Use this to understand the current architecture and avoid conflicts:\n\n${existingCodeContext}\n\n---\n\n${featureDesc}`;
        }

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
    // Guard: Skip if no checkpoint manager or projectId
    if (!this.checkpointManager) {
      console.log(`[NexusCoordinator] Skipping checkpoint for wave ${waveIndex} - no CheckpointManager`);
      return;
    }

    const projectId = this.projectConfig?.projectId;
    if (!projectId) {
      console.log(`[NexusCoordinator] Skipping checkpoint for wave ${waveIndex} - no projectId`);
      return;
    }

    try {
      const reason = `Wave ${waveIndex} complete`;

      // CheckpointManager.createCheckpoint(projectId, reason) is the correct API
      await this.checkpointManager.createCheckpoint(projectId, reason);

      this.emitEvent('checkpoint:created', {
        waveId: waveIndex,
        reason,
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
          console.log(`[NexusCoordinator] Starting merge for task ${task.id}`);
          console.log(`[NexusCoordinator] Worktree: ${worktreePath}`);
          console.log(`[NexusCoordinator] Target branch: main`);

          try {
            const mergeResult: MergeResult = await this.mergerRunner.merge(worktreePath, 'main');

            if (mergeResult.success) {
              console.log(`[NexusCoordinator] Merge successful for task ${task.id}`);
              console.log(`[NexusCoordinator] Commit: ${mergeResult.commitHash ?? 'unknown'}`);

              this.emitEvent('task:merged', {
                taskId: task.id,
                branch: 'main',
                commitHash: mergeResult.commitHash,
              });

              // Push merged changes to remote (non-blocking)
              try {
                const pushResult: { success: boolean; error?: string } = await this.mergerRunner.pushToRemote('main');
                if (pushResult.success) {
                  console.log(`[NexusCoordinator] Pushed to remote successfully for task ${task.id}`);
                  this.emitEvent('task:pushed', { taskId: task.id, branch: 'main' });
                } else {
                  console.warn(`[NexusCoordinator] Push failed (non-blocking): ${pushResult.error ?? 'unknown error'}`);
                }
              } catch (pushError) {
                console.warn(`[NexusCoordinator] Push exception (non-blocking):`, pushError);
              }
            } else {
              console.error(`[NexusCoordinator] Merge failed for task ${task.id}: ${mergeResult.error ?? 'unknown error'}`);

              // Check if merge conflict - escalate to human
              if (mergeResult.conflictFiles && mergeResult.conflictFiles.length > 0) {
                console.log(`[NexusCoordinator] Merge conflict detected, escalating to human review`);

                if (this.humanReviewService) {
                  try {
                    const review = await this.humanReviewService.requestReview({
                      taskId: task.id,
                      projectId: this.projectConfig?.projectId ?? 'unknown',
                      reason: 'merge_conflict' as const,
                      context: {
                        conflictFiles: mergeResult.conflictFiles,
                        error: mergeResult.error,
                      },
                    });
                     
                    const reviewId = review.id;

                    // Track this escalated task for review response handling
                    this.escalatedTasks.set(reviewId, { taskId: task.id, agentId, worktreePath });

                    // Emit escalation event but don't mark as failed yet
                    this.emitEvent('task:escalated', {
                      taskId: task.id,
                      agentId,
                      reason: `Merge conflict: ${mergeResult.conflictFiles.join(', ')}`,
                    });
                    return; // Don't mark complete - wait for human review
                  } catch (reviewError) {
                    console.error(`[NexusCoordinator] Failed to create review for merge conflict:`, reviewError);
                  }
                }

                // Fallback if HumanReviewService not available
                this.emitEvent('task:merge-failed', {
                  taskId: task.id,
                  error: `Merge conflict: ${mergeResult.conflictFiles.join(', ')}`,
                });
              } else {
                // Non-conflict merge failure
                this.emitEvent('task:merge-failed', {
                  taskId: task.id,
                  error: mergeResult.error ?? 'Unknown merge error',
                });
              }
            }
          } catch (mergeError) {
            console.error(`[NexusCoordinator] Merge exception for task ${task.id}:`, mergeError);
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
        // Phase 3 Fix: Properly integrate with HumanReviewService
        console.log(`[NexusCoordinator] Task ${task.id} escalated: ${result.reason ?? 'Max QA iterations exceeded'}`);

        if (this.humanReviewService) {
          try {
            // Create a review request for human intervention
            const review = await this.humanReviewService.requestReview({
              taskId: task.id,
              projectId: this.projectConfig?.projectId ?? 'unknown',
              reason: 'qa_exhausted' as const,
              context: {
                qaIterations: result.iterations,
                escalationReason: result.reason ?? 'Max QA iterations exceeded',
              },
            });
             
            const reviewId = review.id;

            console.log(`[NexusCoordinator] Created review request ${reviewId} for task ${task.id}`);

            // Track this escalated task for review response handling
            this.escalatedTasks.set(reviewId, { taskId: task.id, agentId, worktreePath });

            // Emit escalation event
            this.emitEvent('task:escalated', {
              taskId: task.id,
              agentId,
              reason: result.reason ?? 'Max QA iterations exceeded',
              reviewId, // Include review ID for UI correlation
            });

            // Don't mark as failed yet - wait for human review
            // Task remains in 'escalated' status until human responds
            return;
          } catch (reviewError) {
            console.error(`[NexusCoordinator] Failed to create review request:`, reviewError);
            // Fallback to original behavior if review creation fails
          }
        }

        // Fallback: Mark as failed if HumanReviewService not available
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
