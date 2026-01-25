/**
 * Test Bootstrap - Electron-free version of NexusBootstrap for E2E testing
 *
 * This module provides a test-compatible version of NexusBootstrap that can
 * run outside of Electron. It mocks the Electron-specific functionality and
 * provides the same core interfaces.
 */

import { join } from 'path';
import { getEventBus, EventBus } from '../../src/orchestration/events/EventBus';
import { NexusFactory, type NexusInstance, type NexusFactoryConfig } from '../../src/NexusFactory';
import { InterviewEngine, type InterviewEngineOptions } from '../../src/interview/InterviewEngine';
import { InterviewSessionManager, type InterviewSessionManagerOptions } from '../../src/interview/InterviewSessionManager';
import { RequirementsDB } from '../../src/persistence/requirements/RequirementsDB';
import { DatabaseClient } from '../../src/persistence/database/DatabaseClient';
import { StateManager } from '../../src/persistence/state/StateManager';
import { CheckpointManager } from '../../src/persistence/checkpoints/CheckpointManager';
import { HumanReviewService } from '../../src/orchestration/review/HumanReviewService';
import { GitService } from '../../src/infrastructure/git/GitService';
import { MergerRunner } from '../../src/infrastructure/git/MergerRunner';
import type { PlanningTask } from '../../src/planning/types';
import type { OrchestrationFeature } from '../../src/orchestration/types';
import { features, tasks, projects } from '../../src/persistence/database/schema';

// ============================================================================
// Types
// ============================================================================

export interface TestBootstrapConfig {
  workingDir: string;
  dataDir: string;
  apiKeys?: {
    anthropic?: string;
    google?: string;
    openai?: string;
  };
  useCli?: {
    claude?: boolean;
    gemini?: boolean;
  };
}

export interface TestBootstrappedNexus {
  nexus: NexusInstance;
  interviewEngine: InterviewEngine;
  sessionManager: InterviewSessionManager;
  eventBus: EventBus;
  databaseClient: DatabaseClient;
  checkpointManager: CheckpointManager;
  humanReviewService: HumanReviewService;
  recordExecutionStart: (projectId: string) => void;
  shutdown: () => Promise<void>;
}

// ============================================================================
// Test Bootstrap Class
// ============================================================================

export class TestBootstrap {
  private config: TestBootstrapConfig;
  private nexus: NexusInstance | null = null;
  private interviewEngine: InterviewEngine | null = null;
  private sessionManager: InterviewSessionManager | null = null;
  private eventBus: EventBus;
  private requirementsDB: RequirementsDB | null = null;
  private databaseClient: DatabaseClient | null = null;
  private stateManager: StateManager | null = null;
  private checkpointManager: CheckpointManager | null = null;
  private humanReviewService: HumanReviewService | null = null;
  private gitService: GitService | null = null;
  private mergerRunner: MergerRunner | null = null;
  private unsubscribers: Array<() => void> = [];
  private projectStartTimes: Map<string, Date> = new Map();
  private projectFeatures: Map<string, OrchestrationFeature[]> = new Map();

  constructor(config: TestBootstrapConfig) {
    this.config = config;
    this.eventBus = getEventBus();
  }

  async initialize(): Promise<TestBootstrappedNexus> {
    console.log('[TestBootstrap] Initializing components...');

    // 1. Create NexusFactory configuration
    const factoryConfig: NexusFactoryConfig = {
      workingDir: this.config.workingDir,
      claudeApiKey: this.config.apiKeys?.anthropic,
      geminiApiKey: this.config.apiKeys?.google,
      openaiApiKey: this.config.apiKeys?.openai,
      claudeBackend: this.config.useCli?.claude ? 'cli' : 'api',
      geminiBackend: this.config.useCli?.gemini ? 'cli' : 'api',
      // Enable skip permissions for automated E2E testing
      claudeCliConfig: this.config.useCli?.claude ? {
        skipPermissions: true,
      } : undefined,
    };

    // 2. Create core Nexus instance via factory
    try {
      this.nexus = await NexusFactory.create(factoryConfig);
      console.log('[TestBootstrap] NexusFactory created successfully');
    } catch (error) {
      console.error('[TestBootstrap] Failed to create NexusFactory:', error);
      throw error;
    }

    // 3. Initialize database client
    const dbPath = join(this.config.dataDir, 'nexus-test.db');
    const migrationsDir = join(process.cwd(), 'src', 'persistence', 'database', 'migrations');

    this.databaseClient = DatabaseClient.create({
      path: dbPath,
      migrationsDir,
    });

    // 4. Initialize RequirementsDB
    this.requirementsDB = new RequirementsDB(this.databaseClient);

    // 5. Initialize GitService, StateManager, and CheckpointManager
    this.gitService = new GitService({ baseDir: this.config.workingDir });
    this.stateManager = new StateManager({ db: this.databaseClient });
    this.checkpointManager = new CheckpointManager({
      db: this.databaseClient,
      stateManager: this.stateManager,
      gitService: this.gitService,
      eventBus: this.eventBus,
    });
    console.log('[TestBootstrap] CheckpointManager created');

    // 5a. Initialize HumanReviewService
    this.humanReviewService = new HumanReviewService({
      db: this.databaseClient,
      eventBus: this.eventBus,
      checkpointManager: this.checkpointManager,
    });
    console.log('[TestBootstrap] HumanReviewService created');

    // 5b. Inject services into coordinator
    if (this.nexus.coordinator && typeof this.nexus.coordinator.setHumanReviewService === 'function') {
      this.nexus.coordinator.setHumanReviewService(this.humanReviewService);
    }

    // 5c. Create and inject MergerRunner
    this.mergerRunner = new MergerRunner({
      baseDir: this.config.workingDir,
      worktreeManager: this.nexus.worktreeManager,
    });

    if (this.nexus.coordinator && typeof this.nexus.coordinator.setMergerRunner === 'function') {
      this.nexus.coordinator.setMergerRunner(this.mergerRunner);
    }

    // 5d. Inject CheckpointManager into coordinator
    if (this.nexus.coordinator && typeof this.nexus.coordinator.setCheckpointManager === 'function') {
      this.nexus.coordinator.setCheckpointManager(this.checkpointManager);
    }

    // 6. Initialize Interview Engine
    const interviewOptions: InterviewEngineOptions = {
      llmClient: this.nexus.llm.claude,
      requirementsDB: this.requirementsDB,
      eventBus: this.eventBus,
    };
    this.interviewEngine = new InterviewEngine(interviewOptions);
    console.log('[TestBootstrap] InterviewEngine created');

    // 7. Initialize Session Manager
    const sessionManagerOptions: InterviewSessionManagerOptions = {
      db: this.databaseClient,
      eventBus: this.eventBus,
    };
    this.sessionManager = new InterviewSessionManager(sessionManagerOptions);
    console.log('[TestBootstrap] SessionManager created');

    // 8. Wire critical event listeners
    this.wireEventListeners();
    console.log('[TestBootstrap] Event listeners wired');

    console.log('[TestBootstrap] Initialization complete');

    return {
      nexus: this.nexus,
      interviewEngine: this.interviewEngine,
      sessionManager: this.sessionManager,
      eventBus: this.eventBus,
      databaseClient: this.databaseClient,
      checkpointManager: this.checkpointManager,
      humanReviewService: this.humanReviewService,
      recordExecutionStart: (projectId: string) => this.recordExecutionStart(projectId),
      shutdown: () => this.shutdown(),
    };
  }

  private wireEventListeners(): void {
    if (!this.nexus || !this.requirementsDB) {
      throw new Error('Nexus or RequirementsDB not initialized');
    }

    const { coordinator } = this.nexus;
    const { decomposer, resolver } = this.nexus.planning;

    // Log requirements as they are captured
    const requirementCapturedUnsub = this.eventBus.on('interview:requirement-captured', (event) => {
      const { projectId, requirement } = event.payload;
      console.log(`[TestBootstrap] Requirement captured for ${projectId}: ${requirement.content.substring(0, 50)}...`);
    });
    this.unsubscribers.push(requirementCapturedUnsub);

    // Interview Complete -> Task Decomposition -> Execution
    const interviewCompletedUnsub = this.eventBus.on('interview:completed', async (event) => {
      const { projectId, totalRequirements } = event.payload;
      console.log(`[TestBootstrap] Interview completed for ${projectId} with ${totalRequirements} requirements`);

      try {
        // Get requirements from DB
        const requirements = this.requirementsDB!.getRequirements(projectId);
        console.log(`[TestBootstrap] Retrieved ${requirements.length} requirements for decomposition`);

        // Build feature description from requirements
        const featureDescription = requirements
          .map(r => `- [${r.priority}] ${r.description}`)
          .join('\n');

        // Decompose requirements into tasks
        const decomposedTasks = await decomposer.decompose(featureDescription);
        console.log(`[TestBootstrap] Decomposed into ${decomposedTasks.length} tasks`);

        // Store decomposition to database
        const { featureCount, taskCount } = await this.storeDecomposition(projectId, decomposedTasks);
        console.log(`[TestBootstrap] Stored ${featureCount} features and ${taskCount} tasks to database`);

        // Resolve dependencies and calculate waves
        const waves = resolver.calculateWaves(decomposedTasks);
        console.log(`[TestBootstrap] Calculated ${waves.length} execution waves`);

        // Estimate total time
        const totalMinutes = await this.nexus!.planning.estimator.estimateTotal(decomposedTasks);
        console.log(`[TestBootstrap] Estimated ${totalMinutes} minutes total`);

        // Get actual project path from database
        let actualProjectPath = this.config.workingDir;
        if (this.databaseClient) {
          try {
            const { eq } = await import('drizzle-orm');
            const projectRecord = this.databaseClient.db
              .select()
              .from(projects)
              .where(eq(projects.id, projectId))
              .get() as { id: string; rootPath: string } | undefined;
            if (projectRecord?.rootPath) {
              actualProjectPath = projectRecord.rootPath;
            }
          } catch (pathError) {
            console.error('[TestBootstrap] Failed to get project path:', pathError);
          }
        }

        // Initialize coordinator
        const projectFeatures = this.tasksToFeatures(decomposedTasks, projectId);
        coordinator.initialize({
          projectId,
          projectPath: actualProjectPath,
          features: projectFeatures,
          mode: 'genesis',
        });

        // Store features
        this.projectFeatures.set(projectId, projectFeatures);

        // Emit planning:completed event
        await this.eventBus.emit('planning:completed', {
          projectId,
          featureCount,
          taskCount,
          totalMinutes,
          waveCount: waves.length,
        });

        console.log(`[TestBootstrap] Planning complete - ready for execution`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[TestBootstrap] Planning failed:', errorMessage);

        await this.eventBus.emit('project:failed', {
          projectId,
          error: `[Planning] ${errorMessage}`,
          recoverable: true,
        });
      }
    });
    this.unsubscribers.push(interviewCompletedUnsub);

    // Forward coordinator events
    coordinator.onEvent((event) => {
      const eventType = event.type;
      const eventData = event.data ?? {};
      console.log(`[TestBootstrap] Coordinator event: ${eventType}`);

      if (eventType === 'task:assigned' && 'taskId' in eventData && 'agentId' in eventData) {
        void this.eventBus.emit('task:assigned', {
          taskId: String(eventData.taskId),
          agentId: String(eventData.agentId),
          agentType: 'coder' as const,
          worktreePath: String(eventData.worktreePath ?? ''),
        });
      } else if (eventType === 'task:started' && 'taskId' in eventData) {
        void this.eventBus.emit('task:started', {
          taskId: String(eventData.taskId),
          agentId: String(eventData.agentId ?? ''),
          startedAt: new Date(),
        });
      } else if (eventType === 'task:completed' && 'taskId' in eventData) {
        void this.eventBus.emit('task:completed', {
          taskId: String(eventData.taskId),
          result: {
            taskId: String(eventData.taskId),
            success: true,
            files: [],
            metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
          },
        });
      } else if (eventType === 'task:failed' && 'taskId' in eventData) {
        void this.eventBus.emit('task:failed', {
          taskId: String(eventData.taskId),
          error: String(eventData.error ?? 'Unknown error'),
          iterations: Number(eventData.iterations ?? 1),
          escalated: Boolean(eventData.escalated ?? false),
        });
      } else if (eventType === 'task:escalated' && 'taskId' in eventData) {
        // Auto-approve escalated tasks in E2E test mode
        const taskId = String(eventData.taskId);
        const reviewId = eventData.reviewId as string | undefined;
        console.log(`[TestBootstrap] Auto-approving escalated task: ${taskId} (reviewId: ${reviewId ?? 'none'})`);

        // Auto-approve by calling the coordinator's handleReviewApproved method
        if (reviewId) {
          try {
            // Approve in HumanReviewService if available
            if (this.humanReviewService) {
              console.log(`[TestBootstrap] Approving review ${reviewId} in HumanReviewService`);
              void this.humanReviewService.approveReview(reviewId, 'E2E test auto-approved');
            }
            // Notify coordinator to complete the task
            console.log(`[TestBootstrap] Calling coordinator.handleReviewApproved for ${reviewId}`);
            void coordinator.handleReviewApproved(reviewId, 'E2E test auto-approved');
          } catch (reviewError) {
            console.error(`[TestBootstrap] Failed to auto-approve task ${taskId}:`, reviewError);
          }
        }

        void this.eventBus.emit('task:escalated', {
          taskId,
          reason: String(eventData.reason ?? 'Unknown'),
          iterations: Number(eventData.iterations ?? 0),
          lastError: eventData.lastError as string | undefined,
        });
      } else if (eventType === 'project:completed' && 'projectId' in eventData) {
        const projectIdStr = String(eventData.projectId);
        const startTime = this.projectStartTimes.get(projectIdStr);
        const totalDuration = startTime
          ? Math.round((Date.now() - startTime.getTime()) / 1000)
          : 0;

        const features = this.projectFeatures.get(projectIdStr) ?? [];

        this.projectStartTimes.delete(projectIdStr);
        this.projectFeatures.delete(projectIdStr);

        void this.eventBus.emit('project:completed', {
          projectId: projectIdStr,
          totalDuration,
          metrics: {
            tasksTotal: Number(eventData.totalTasks ?? 0),
            tasksCompleted: Number(eventData.completedTasks ?? 0),
            tasksFailed: Number(eventData.failedTasks ?? 0),
            featuresTotal: features.length,
            featuresCompleted: features.filter(f => f.status === 'completed').length,
            estimatedTotalMinutes: 0,
            actualTotalMinutes: Math.round(totalDuration / 60),
            averageQAIterations: 0,
          },
        });
      }
    });
  }

  private tasksToFeatures(tasks: PlanningTask[], projectId: string): OrchestrationFeature[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      priority: 'must' as const,
      status: 'backlog' as const,
      complexity: task.size === 'large' ? 'complex' as const : 'simple' as const,
      subFeatures: [],
      estimatedTasks: 1,
      completedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId,
    }));
  }

  recordExecutionStart(projectId: string): void {
    this.projectStartTimes.set(projectId, new Date());
    console.log(`[TestBootstrap] Recorded execution start for project: ${projectId}`);
  }

  private async storeDecomposition(
    projectId: string,
    planningTasks: PlanningTask[]
  ): Promise<{ featureCount: number; taskCount: number }> {
    if (!this.databaseClient) {
      throw new Error('DatabaseClient not initialized');
    }

    const now = new Date();
    let featureCount = 0;
    let taskCount = 0;

    const featureId = `feature-${projectId}-${Date.now()}`;

    try {
      this.databaseClient.db.insert(features).values({
        id: featureId,
        projectId: projectId,
        name: 'Project Requirements',
        description: 'Auto-generated feature from interview requirements',
        priority: 'must',
        status: 'backlog',
        complexity: 'complex',
        estimatedTasks: planningTasks.length,
        completedTasks: 0,
        createdAt: now,
        updatedAt: now,
      }).run();
      featureCount = 1;

      for (const task of planningTasks) {
        const taskId = task.id || `task-${projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        this.databaseClient.db.insert(tasks).values({
          id: taskId,
          projectId: projectId,
          featureId: featureId,
          name: task.name,
          description: task.description,
          type: task.type || 'auto',
          status: 'pending',
          size: task.size === 'large' || task.size === 'medium' ? 'small' : task.size,
          priority: 5,
          tags: JSON.stringify(task.files || []),
          notes: JSON.stringify(task.testCriteria || []),
          dependsOn: JSON.stringify(task.dependsOn || []),
          estimatedMinutes: task.estimatedMinutes || 15,
          createdAt: now,
          updatedAt: now,
        }).run();
        taskCount++;
      }

      return { featureCount, taskCount };
    } catch (error) {
      console.error('[TestBootstrap] Failed to store decomposition:', error);
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    console.log('[TestBootstrap] Shutting down...');

    for (const unsub of this.unsubscribers) {
      try { unsub(); } catch {}
    }
    this.unsubscribers = [];

    if (this.nexus) {
      await this.nexus.shutdown();
      this.nexus = null;
    }

    this.interviewEngine = null;
    this.sessionManager = null;
    this.requirementsDB = null;
    this.stateManager = null;
    this.checkpointManager = null;
    this.humanReviewService = null;
    this.gitService = null;
    this.mergerRunner = null;
    this.databaseClient = null;

    console.log('[TestBootstrap] Shutdown complete');
  }
}

/**
 * Initialize test bootstrap
 */
export async function initializeTestNexus(config: TestBootstrapConfig): Promise<TestBootstrappedNexus> {
  const bootstrap = new TestBootstrap(config);
  return bootstrap.initialize();
}
