/**
 * Evolution Flow Integration Tests
 *
 * Tests the complete Evolution mode flow:
 * FeatureStore -> Task Decomposition -> Wave Execution -> Human Checkpoints -> QA
 *
 * Evolution mode differs from Genesis by:
 * - Starting from existing FeatureStore (not interview)
 * - Using Evolution mode routing in NexusCoordinator
 * - Integrating with HumanReviewService for checkpoints
 *
 * These are higher-complexity tests with MSW-mocked LLM APIs.
 *
 * @module tests/integration/flows/evolution
 */
import { test, expect, describe, beforeEach, vi } from '../../helpers/fixtures';
import { TaskDecomposer } from '@/planning/decomposition/TaskDecomposer';
import { DependencyResolver } from '@/planning/dependencies/DependencyResolver';
import { TaskQueue } from '@/orchestration/queue/TaskQueue';
import { AgentPool } from '@/orchestration/agents/AgentPool';
import { QALoopEngine } from '@/execution/qa-loop/QALoopEngine';
import type { LLMClient, Message, LLMResponse, ChatOptions } from '@/llm';
import type { Feature } from '@/types/core';
import type { PlanningTask } from '@/planning/types';
import type { OrchestrationTask } from '@/orchestration/types';
import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { VerificationResult, TestResult, ReviewResult } from '@/quality/types';
import type { NexusEvent, EventBus as EventBusType } from '@/types/events';
import { nanoid } from 'nanoid';
import { resetMockState } from '../../mocks/handlers';

// ============================================================================
// Feature Store Mock
// ============================================================================

/**
 * Mock FeatureStore for Evolution mode
 * Simulates an existing project with stored features
 */
class MockFeatureStore {
  private features: Map<string, Feature> = new Map();

  addFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
  }

  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  getFeaturesByStatus(status: Feature['status']): Feature[] {
    return this.getAllFeatures().filter(f => f.status === status);
  }

  getFeaturesByPriority(priority: Feature['priority']): Feature[] {
    return this.getAllFeatures().filter(f => f.priority === priority);
  }

  updateFeatureStatus(featureId: string, status: Feature['status']): void {
    const feature = this.features.get(featureId);
    if (feature) {
      feature.status = status;
      feature.updatedAt = new Date();
    }
  }
}

// ============================================================================
// Human Review Service Mock
// ============================================================================

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface HumanReview {
  id: string;
  taskId: string;
  projectId: string;
  reason: string;
  status: ReviewStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Mock HumanReviewService for testing checkpoint integration
 */
class MockHumanReviewService {
  private reviews: Map<string, HumanReview> = new Map();
  private eventBus: EventBusType;
  private autoApprove: boolean;

  constructor(eventBus: EventBusType, autoApprove = true) {
    this.eventBus = eventBus;
    this.autoApprove = autoApprove;
  }

  async requestReview(options: {
    taskId: string;
    projectId: string;
    reason: string;
    context?: Record<string, unknown>;
  }): Promise<HumanReview> {
    const review: HumanReview = {
      id: `review-${nanoid(6)}`,
      taskId: options.taskId,
      projectId: options.projectId,
      reason: options.reason,
      status: 'pending',
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);

    this.eventBus.emit('review:requested', {
      reviewId: review.id,
      taskId: options.taskId,
      reason: options.reason,
      context: options.context,
    });

    // Auto-approve for testing if enabled
    if (this.autoApprove) {
      await this.approveReview(review.id, 'Auto-approved for testing');
    }

    return review;
  }

  async approveReview(reviewId: string, resolution?: string): Promise<void> {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error(`Review not found: ${reviewId}`);

    review.status = 'approved';
    review.resolvedAt = new Date();
    review.resolution = resolution;

    this.eventBus.emit('review:approved', {
      reviewId,
      resolution,
    });
  }

  async rejectReview(reviewId: string, feedback: string): Promise<void> {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error(`Review not found: ${reviewId}`);

    review.status = 'rejected';
    review.resolvedAt = new Date();
    review.resolution = feedback;

    this.eventBus.emit('review:rejected', {
      reviewId,
      feedback,
    });
  }

  listPendingReviews(): HumanReview[] {
    return Array.from(this.reviews.values()).filter(r => r.status === 'pending');
  }

  getReview(reviewId: string): HumanReview | undefined {
    return this.reviews.get(reviewId);
  }

  setAutoApprove(value: boolean): void {
    this.autoApprove = value;
  }
}

// ============================================================================
// Mock Factory Functions
// ============================================================================

/**
 * Create mock LLM client with configurable response generator
 */
function createMockLLMClient(
  responseGenerator: (messages: Message[]) => string
): LLMClient {
  return {
    chat: vi.fn(async (messages: Message[], _options?: ChatOptions): Promise<LLMResponse> => ({
      content: responseGenerator(messages),
      finishReason: 'stop',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    })),
    getModel: () => 'claude-sonnet-4',
  } as unknown as LLMClient;
}

/**
 * Create mock QA components that all pass
 */
function createPassingQAComponents() {
  const buildVerifier: BuildVerifier = {
    verify: vi.fn(async (_workdir: string): Promise<VerificationResult> => ({
      success: true,
      errors: [],
      warnings: [],
      duration: 100,
    })),
  } as unknown as BuildVerifier;

  const lintRunner: LintRunner = {
    run: vi.fn(async (_workdir: string): Promise<VerificationResult> => ({
      success: true,
      errors: [],
      warnings: [],
      duration: 50,
    })),
  } as unknown as LintRunner;

  const testRunner: TestRunner = {
    run: vi.fn(async (_workdir: string, _pattern?: string): Promise<TestResult> => ({
      success: true,
      passed: 5,
      failed: 0,
      skipped: 0,
      failures: [],
      duration: 200,
    })),
  } as unknown as TestRunner;

  const codeReviewer: CodeReviewer = {
    review: vi.fn(async (_files): Promise<ReviewResult> => ({
      approved: true,
      hasBlockingIssues: false,
      issues: [],
      summary: 'Code looks good',
    })),
  } as unknown as CodeReviewer;

  return { buildVerifier, lintRunner, testRunner, codeReviewer };
}

/**
 * Create mock coder runner
 */
function createMockCoderRunner() {
  return {
    fixIssues: vi.fn(async (_errors: string[]) => {}),
    execute: vi.fn(async (_task: any) => ({
      success: true,
      filesChanged: ['src/test.ts'],
      output: 'Task completed',
      iterations: 1,
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    })),
  } as unknown as CoderRunner;
}

/**
 * Create a test feature for Evolution mode
 */
function createEvolutionFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: `feature-${nanoid(6)}`,
    projectId: 'evolution-project',
    name: 'Enhanced Search',
    description: 'Add advanced search capabilities to existing system',
    priority: 'should',
    status: 'backlog',
    complexity: 'simple',
    subFeatures: [],
    estimatedTasks: 3,
    completedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Seed feature store with test data
 */
function seedFeatureStore(store: MockFeatureStore): void {
  // Add backlog features
  store.addFeature(createEvolutionFeature({
    name: 'User Profile Enhancement',
    description: 'Add profile customization options',
    priority: 'must',
    status: 'backlog',
  }));

  store.addFeature(createEvolutionFeature({
    name: 'Performance Optimization',
    description: 'Optimize database queries for faster response',
    priority: 'should',
    status: 'backlog',
  }));

  store.addFeature(createEvolutionFeature({
    name: 'Analytics Dashboard',
    description: 'Build analytics visualization dashboard',
    priority: 'could',
    status: 'backlog',
  }));

  // Add in-progress feature
  store.addFeature(createEvolutionFeature({
    name: 'Dark Mode Support',
    description: 'Add dark mode theme option',
    status: 'in_progress',
  }));
}

// ============================================================================
// Integration Tests - Evolution Flow (30s timeout each)
// ============================================================================

describe('Evolution Flow Integration', () => {
  beforeEach(() => {
    resetMockState();
  });

  test('should load features from feature store', async ({ eventBus }) => {
    // Arrange: Create and seed feature store
    const featureStore = new MockFeatureStore();
    seedFeatureStore(featureStore);

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('evolution:features-loaded', (event) => events.push(event));

    // Act: Load features from store
    const allFeatures = featureStore.getAllFeatures();
    const backlogFeatures = featureStore.getFeaturesByStatus('backlog');
    const mustFeatures = featureStore.getFeaturesByPriority('must');

    eventBus.emit('evolution:features-loaded', {
      projectId: 'evolution-project',
      totalFeatures: allFeatures.length,
      backlogCount: backlogFeatures.length,
      inProgressCount: featureStore.getFeaturesByStatus('in_progress').length,
    });

    // Assert: Features loaded correctly
    expect(allFeatures.length).toBe(4);
    expect(backlogFeatures.length).toBe(3);
    expect(mustFeatures.length).toBe(1);

    // In-progress feature exists
    const inProgress = featureStore.getFeaturesByStatus('in_progress');
    expect(inProgress.length).toBe(1);
    expect(inProgress[0]!.name).toBe('Dark Mode Support');

    // Event emitted
    expect(events).toHaveLength(1);
    expect((events[0]!.payload as any).totalFeatures).toBe(4);
  }, 30000);

  test('should decompose feature into tasks', async ({ eventBus }) => {
    // Arrange: Set up decomposer with Evolution-aware responses
    const llmClient = createMockLLMClient((_messages) => JSON.stringify({
      tasks: [
        {
          id: 'profile-schema',
          name: 'Update user schema',
          description: 'Add new profile fields to existing schema',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: [],
          testCriteria: ['Schema migration runs', 'Evolution: Verify compatibility with existing code'],
          files: ['src/db/schema.ts', 'migrations/add-profile-fields.ts'],
        },
        {
          id: 'profile-api',
          name: 'Extend profile API',
          description: 'Add endpoints for new profile features',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 20,
          dependsOn: ['profile-schema'],
          testCriteria: ['New endpoints work', 'Evolution: Verify compatibility with existing code'],
          files: ['src/api/profile.ts'],
        },
        {
          id: 'profile-ui',
          name: 'Update profile UI',
          description: 'Add UI components for profile customization',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 25,
          dependsOn: ['profile-api'],
          testCriteria: ['UI renders correctly', 'Evolution: Verify compatibility with existing code'],
          files: ['src/components/Profile.tsx'],
        },
      ],
    }));

    const featureStore = new MockFeatureStore();
    seedFeatureStore(featureStore);

    const decomposer = new TaskDecomposer({ llmClient });
    const resolver = new DependencyResolver();

    // Select a feature to work on
    const feature = featureStore.getFeaturesByPriority('must')[0]!;

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('evolution:decomposition-started', (event) => events.push(event));
    eventBus.on('evolution:decomposition-completed', (event) => events.push(event));

    // Act: Decompose feature
    eventBus.emit('evolution:decomposition-started', {
      featureId: feature.id,
      featureName: feature.name,
      mode: 'evolution',
    });

    const tasks = await decomposer.decompose(feature);
    const waves = resolver.calculateWaves(tasks);

    // Update feature status
    featureStore.updateFeatureStatus(feature.id, 'in_progress');

    eventBus.emit('evolution:decomposition-completed', {
      featureId: feature.id,
      taskCount: tasks.length,
      waveCount: waves.length,
    });

    // Assert: Tasks created with Evolution markers
    expect(tasks.length).toBe(3);

    // All tasks have Evolution compatibility check in test criteria
    for (const task of tasks) {
      const hasEvolutionCheck = task.testCriteria?.some(tc =>
        tc.toLowerCase().includes('evolution') || tc.toLowerCase().includes('compatibility')
      );
      expect(hasEvolutionCheck).toBe(true);
    }

    // Waves calculated correctly
    expect(waves.length).toBe(3); // Linear dependency chain

    // Feature status updated
    expect(featureStore.getFeature(feature.id)!.status).toBe('in_progress');

    // Events emitted
    expect(events).toHaveLength(2);
    expect((events[0]!.payload as any).mode).toBe('evolution');
  }, 30000);

  test('should execute tasks respecting wave order', async ({ eventBus }) => {
    // Arrange: Set up task queue with wave-ordered tasks
    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool();
    const qaComponents = createPassingQAComponents();
    const mockCoder = createMockCoderRunner();
    const qaEngine = new QALoopEngine({ ...qaComponents, maxIterations: 3 });

    // Create tasks in 3 waves
    const tasks: Array<PlanningTask & { wave: number }> = [
      // Wave 0 - parallel
      { id: 't1', name: 'Task 1', description: '', type: 'auto', size: 'atomic', estimatedMinutes: 10, dependsOn: [], wave: 0 },
      { id: 't2', name: 'Task 2', description: '', type: 'auto', size: 'atomic', estimatedMinutes: 10, dependsOn: [], wave: 0 },
      // Wave 1 - depends on wave 0
      { id: 't3', name: 'Task 3', description: '', type: 'auto', size: 'atomic', estimatedMinutes: 10, dependsOn: ['t1', 't2'], wave: 1 },
      // Wave 2 - depends on wave 1
      { id: 't4', name: 'Task 4', description: '', type: 'auto', size: 'atomic', estimatedMinutes: 10, dependsOn: ['t3'], wave: 2 },
    ];

    // Queue tasks by wave
    for (const task of tasks) {
      taskQueue.enqueue({
        ...task,
        status: 'pending',
        waveId: task.wave,
        priority: 5,
        createdAt: new Date(),
      }, task.wave);
    }

    // Track execution order
    const executionOrder: string[] = [];
    const events: NexusEvent[] = [];
    eventBus.on('evolution:wave-started', (event) => events.push(event));
    eventBus.on('evolution:wave-completed', (event) => events.push(event));

    // Act: Execute waves in order
    // Spawn agents once upfront (max 2 agents, reuse across waves)
    const agent1 = agentPool.spawn('coder');
    const agent2 = agentPool.spawn('coder');
    const agents = [agent1, agent2];

    const waves = [0, 1, 2];

    for (const waveId of waves) {
      eventBus.emit('evolution:wave-started', {
        waveId,
        taskCount: taskQueue.getByWave(waveId).length,
      });

      const waveTasks = taskQueue.getByWave(waveId);

      // Execute wave tasks
      const waveExecutionPromises: Promise<void>[] = [];

      for (let i = 0; i < waveTasks.length; i++) {
        const task = taskQueue.dequeue();
        if (!task) break;

        const agent = agents[i % agents.length]!;
        agentPool.assign(agent.id, task.id);

        const executeTask = async () => {
          executionOrder.push(task.id);

          const result = await qaEngine.run(
            { id: task.id, name: task.name, description: task.description, files: [] },
            mockCoder
          );

          if (result.success) {
            taskQueue.markComplete(task.id);
          }
          agentPool.release(agent.id);
        };

        waveExecutionPromises.push(executeTask());
      }

      await Promise.all(waveExecutionPromises);

      eventBus.emit('evolution:wave-completed', {
        waveId,
        completedCount: waveTasks.length,
      });
    }

    // Assert: Tasks executed in wave order
    expect(executionOrder.length).toBe(4);

    // Wave 0 tasks executed first (either order)
    expect(executionOrder.slice(0, 2).sort()).toEqual(['t1', 't2']);

    // Wave 1 task after wave 0
    expect(executionOrder[2]).toBe('t3');

    // Wave 2 task last
    expect(executionOrder[3]).toBe('t4');

    // All tasks completed
    expect(taskQueue.getCompletedCount()).toBe(4);

    // Wave events emitted
    expect(events.filter(e => e.type === 'evolution:wave-started')).toHaveLength(3);
    expect(events.filter(e => e.type === 'evolution:wave-completed')).toHaveLength(3);
  }, 30000);

  test('should handle human checkpoint integration', async ({ eventBus }) => {
    // Arrange: Set up review service with manual approval control
    const humanReviewService = new MockHumanReviewService(eventBus, false); // No auto-approve

    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool();
    const qaComponents = createPassingQAComponents();
    const mockCoder = createMockCoderRunner();
    const qaEngine = new QALoopEngine({ ...qaComponents, maxIterations: 3 });

    // Create task with checkpoint requirement
    const checkpointTask: OrchestrationTask = {
      id: 'checkpoint-task',
      name: 'Critical Database Migration',
      description: 'Migrate user data - requires human approval',
      type: 'checkpoint',
      size: 'small',
      estimatedMinutes: 20,
      dependsOn: [],
      status: 'pending',
      waveId: 0,
      priority: 10,
      createdAt: new Date(),
    };

    taskQueue.enqueue(checkpointTask, 0);

    // Track review events
    const events: NexusEvent[] = [];
    eventBus.on('review:requested', (event) => events.push(event));
    eventBus.on('review:approved', (event) => events.push(event));

    // Act: Execute task that requires checkpoint
    const task = taskQueue.dequeue()!;
    const agent = agentPool.spawn('coder');
    agentPool.assign(agent.id, task.id);

    // Task is checkpoint type - request human review
    if (task.type === 'checkpoint') {
      const review = await humanReviewService.requestReview({
        taskId: task.id,
        projectId: 'evolution-project',
        reason: 'manual_request',
        context: { description: task.description },
      });

      // Check review is pending
      expect(review.status).toBe('pending');
      expect(humanReviewService.listPendingReviews().length).toBe(1);

      // Simulate human approval
      await humanReviewService.approveReview(review.id, 'Migration plan approved');

      // Verify approval
      const approvedReview = humanReviewService.getReview(review.id);
      expect(approvedReview!.status).toBe('approved');
    }

    // After approval, execute the task
    const result = await qaEngine.run(
      { id: task.id, name: task.name, description: task.description, files: [] },
      mockCoder
    );

    expect(result.success).toBe(true);
    taskQueue.markComplete(task.id);
    agentPool.release(agent.id);

    // Assert: Checkpoint flow completed
    expect(taskQueue.getCompletedCount()).toBe(1);
    expect(humanReviewService.listPendingReviews().length).toBe(0);

    // Review events emitted
    expect(events.filter(e => e.type === 'review:requested')).toHaveLength(1);
    expect(events.filter(e => e.type === 'review:approved')).toHaveLength(1);
  }, 30000);

  test('should complete full Evolution flow end-to-end', async ({ eventBus }) => {
    // Arrange: Set up complete Evolution flow components
    const featureStore = new MockFeatureStore();
    seedFeatureStore(featureStore);

    const llmClient = createMockLLMClient((_messages) => JSON.stringify({
      tasks: [
        {
          id: 'perf-analyze',
          name: 'Analyze slow queries',
          description: 'Profile and identify slow database queries',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: [],
          testCriteria: ['Analysis complete', 'Evolution: Verify compatibility with existing code'],
          files: ['docs/performance-analysis.md'],
        },
        {
          id: 'perf-optimize',
          name: 'Optimize queries',
          description: 'Add indexes and optimize query patterns',
          type: 'checkpoint', // Requires human review
          size: 'small',
          estimatedMinutes: 25,
          dependsOn: ['perf-analyze'],
          testCriteria: ['Queries faster', 'Evolution: Verify compatibility with existing code'],
          files: ['src/db/queries.ts', 'migrations/add-indexes.ts'],
        },
        {
          id: 'perf-verify',
          name: 'Verify performance',
          description: 'Run benchmarks to confirm improvements',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 10,
          dependsOn: ['perf-optimize'],
          testCriteria: ['Benchmarks pass', 'Evolution: Verify compatibility with existing code'],
          files: ['tests/benchmarks/queries.bench.ts'],
        },
      ],
    }));

    const decomposer = new TaskDecomposer({ llmClient });
    const resolver = new DependencyResolver();
    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool();
    const qaComponents = createPassingQAComponents();
    const mockCoder = createMockCoderRunner();
    const qaEngine = new QALoopEngine({ ...qaComponents, maxIterations: 3 });
    const humanReviewService = new MockHumanReviewService(eventBus, true); // Auto-approve for e2e

    // Track flow phases
    const flowEvents: Array<{ phase: string; data: unknown }> = [];

    // Act: Execute full Evolution flow

    // Phase 1: Load and select feature
    flowEvents.push({ phase: 'evolution:start', data: { mode: 'evolution' } });
    const backlogFeatures = featureStore.getFeaturesByStatus('backlog');
    const selectedFeature = backlogFeatures.find(f => f.name.includes('Performance'))!;
    flowEvents.push({ phase: 'feature:selected', data: { featureId: selectedFeature.id } });

    // Phase 2: Decompose into tasks
    const tasks = await decomposer.decompose(selectedFeature);
    const waves = resolver.calculateWaves(tasks);
    featureStore.updateFeatureStatus(selectedFeature.id, 'in_progress');
    flowEvents.push({ phase: 'decomposition:complete', data: { taskCount: tasks.length, waveCount: waves.length } });

    // Phase 3: Queue tasks
    for (const wave of waves) {
      for (const task of wave.tasks) {
        taskQueue.enqueue({
          ...task,
          status: 'pending',
          waveId: wave.id,
          priority: 5,
          createdAt: new Date(),
        }, wave.id);
      }
    }

    // Phase 4: Execute with checkpoints
    const agent = agentPool.spawn('coder');
    let checkpointCount = 0;
    let completedCount = 0;

    for (const wave of waves) {
      const waveTasks = taskQueue.getByWave(wave.id);

      for (const _ of waveTasks) {
        const task = taskQueue.dequeue();
        if (!task) break;

        agentPool.assign(agent.id, task.id);

        // Handle checkpoint tasks
        if (task.type === 'checkpoint') {
          checkpointCount++;
          await humanReviewService.requestReview({
            taskId: task.id,
            projectId: selectedFeature.projectId,
            reason: 'manual_request',
          });
          // Auto-approved
        }

        // Run QA
        const result = await qaEngine.run(
          { id: task.id, name: task.name, description: task.description, files: task.files ?? [] },
          mockCoder
        );

        if (result.success) {
          taskQueue.markComplete(task.id);
          completedCount++;
        }

        agentPool.release(agent.id);
      }
    }

    // Phase 5: Complete feature
    featureStore.updateFeatureStatus(selectedFeature.id, 'done');
    flowEvents.push({ phase: 'evolution:complete', data: { completedTasks: completedCount, checkpoints: checkpointCount } });

    // Assert: Full Evolution flow completed
    expect(tasks.length).toBe(3);
    expect(waves.length).toBe(3);
    expect(completedCount).toBe(3);
    expect(checkpointCount).toBe(1);

    // Feature status updated
    expect(featureStore.getFeature(selectedFeature.id)!.status).toBe('done');

    // All tasks have Evolution compatibility marker
    for (const task of tasks) {
      expect(task.testCriteria?.some(tc => tc.includes('Evolution'))).toBe(true);
    }

    // Flow phases executed in order
    const phases = flowEvents.map(e => e.phase);
    expect(phases).toEqual([
      'evolution:start',
      'feature:selected',
      'decomposition:complete',
      'evolution:complete',
    ]);

    // Final state
    expect(taskQueue.size()).toBe(0);
    expect(taskQueue.getCompletedCount()).toBe(3);
  }, 30000);
});
