/**
 * Genesis Flow Integration Tests
 *
 * Tests the complete Genesis mode flow:
 * Interview -> Requirements Extraction -> Task Decomposition -> Agent Pool -> QA
 *
 * These are higher-complexity tests exercising full end-to-end paths
 * with MSW-mocked LLM APIs and real component integration.
 *
 * @module tests/integration/flows/genesis
 */
import { test, expect, describe, beforeEach, vi, afterEach } from '../../helpers/fixtures';
import { InterviewEngine } from '@/interview/InterviewEngine';
import { RequirementExtractor } from '@/interview/RequirementExtractor';
import { TaskDecomposer } from '@/planning/decomposition/TaskDecomposer';
import { DependencyResolver } from '@/planning/dependencies/DependencyResolver';
import { TaskQueue } from '@/orchestration/queue/TaskQueue';
import { AgentPool } from '@/orchestration/agents/AgentPool';
import { QALoopEngine } from '@/execution/qa-loop/QALoopEngine';
import type { LLMClient, Message, LLMResponse, ChatOptions } from '@/llm';
import type { RequirementsDB, RequirementCategory } from '@/persistence/requirements/RequirementsDB';
import type { Feature } from '@/types/core';
import type { PlanningTask } from '@/planning/types';
import type { OrchestrationTask } from '@/orchestration/types';
import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { VerificationResult, TestResult, ReviewResult } from '@/quality/types';
import type { NexusEvent } from '@/types/events';
import { nanoid } from 'nanoid';
import { resetMockState } from '../../mocks/handlers';

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
    chat: vi.fn(async (messages: Message[], _options?: ChatOptions): Promise<LLMResponse> => {
      return {
        content: responseGenerator(messages),
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      };
    }),
    getModel: () => 'claude-sonnet-4',
  } as unknown as LLMClient;
}

/**
 * Create mock RequirementsDB for storing extracted requirements
 */
function createMockRequirementsDB(): RequirementsDB & { requirements: Map<string, any> } {
  const requirements = new Map<string, any>();

  return {
    requirements,
    addRequirement: vi.fn(async (projectId: string, req: {
      category: RequirementCategory;
      description: string;
      priority: string;
      source: string;
      confidence: number;
      tags: string[];
    }) => {
      const id = nanoid();
      requirements.set(id, { id, projectId, ...req });
      return { id, projectId, ...req, createdAt: new Date() };
    }),
    getRequirementsByProject: vi.fn(async (projectId: string) => {
      return Array.from(requirements.values()).filter(r => r.projectId === projectId);
    }),
    getRequirementsByCategory: vi.fn(async (_projectId: string, _category: RequirementCategory) => {
      return [];
    }),
  } as unknown as RequirementsDB & { requirements: Map<string, any> };
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
 * Create a test feature from requirements
 */
function createFeatureFromRequirements(requirements: any[]): Feature {
  return {
    id: `feature-${nanoid(6)}`,
    projectId: 'test-project',
    name: requirements[0]?.description?.substring(0, 50) ?? 'Generated Feature',
    description: requirements.map(r => r.description).join('. '),
    priority: 'must',
    status: 'backlog',
    complexity: requirements.length > 3 ? 'complex' : 'simple',
    subFeatures: [],
    estimatedTasks: requirements.length * 2,
    completedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Integration Tests - Genesis Flow (30s timeout each)
// ============================================================================

describe('Genesis Flow Integration', () => {
  beforeEach(() => {
    resetMockState();
  });

  test('should complete interview to requirements extraction', async ({ eventBus }) => {
    // Arrange: Create interview engine with mock LLM that outputs requirements
    const llmClient = createMockLLMClient((_messages) => `
Thank you for sharing those details. I understand you want to build a task management app.

<requirement>
<text>Users should be able to create and assign tasks to team members</text>
<category>functional</category>
<priority>must</priority>
<confidence>0.9</confidence>
<area>task-management</area>
</requirement>

<requirement>
<text>System should support real-time notifications when tasks are updated</text>
<category>functional</category>
<priority>should</priority>
<confidence>0.85</confidence>
<area>notifications</area>
</requirement>

What other features would you like to include?
    `);

    const requirementsDB = createMockRequirementsDB();

    const interviewEngine = new InterviewEngine({
      llmClient,
      requirementsDB,
      eventBus,
    });

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('interview:started', (event) => events.push(event));
    eventBus.on('interview:requirement-captured', (event) => events.push(event));
    eventBus.on('interview:completed', (event) => events.push(event));

    // Act: Conduct interview
    const session = interviewEngine.startSession('test-project');

    // Process user message
    const result = await interviewEngine.processMessage(
      session.id,
      'I want to build a task management app for teams'
    );

    // End session
    interviewEngine.endSession(session.id);

    // Assert: Requirements were extracted and stored
    expect(result.extractedRequirements.length).toBeGreaterThan(0);
    expect(result.extractedRequirements.length).toBe(2);

    // Requirements stored in DB
    expect(requirementsDB.requirements.size).toBe(2);

    // Correct categories extracted
    const storedReqs = Array.from(requirementsDB.requirements.values());
    expect(storedReqs.some(r => r.category === 'functional')).toBe(true);

    // Events emitted
    expect(events.filter(e => e.type === 'interview:started')).toHaveLength(1);
    expect(events.filter(e => e.type === 'interview:requirement-captured')).toHaveLength(2);
    expect(events.filter(e => e.type === 'interview:completed')).toHaveLength(1);
  }, 30000);

  test('should decompose requirements into tasks', async ({ eventBus }) => {
    // Arrange: Create decomposer with mock LLM
    const llmClient = createMockLLMClient((_messages) => JSON.stringify({
      tasks: [
        {
          id: 'task-1',
          name: 'Setup database schema',
          description: 'Create database schema for tasks and users',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: [],
          testCriteria: ['Schema creates successfully'],
          files: ['src/db/schema.ts'],
        },
        {
          id: 'task-2',
          name: 'Implement task CRUD API',
          description: 'Create REST endpoints for task operations',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 25,
          dependsOn: ['task-1'],
          testCriteria: ['API endpoints respond correctly'],
          files: ['src/api/tasks.ts'],
        },
        {
          id: 'task-3',
          name: 'Add notification system',
          description: 'Implement real-time notifications',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 20,
          dependsOn: ['task-1'],
          testCriteria: ['Notifications are sent'],
          files: ['src/notifications/service.ts'],
        },
        {
          id: 'task-4',
          name: 'Integration testing',
          description: 'Test full task workflow',
          type: 'tdd',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: ['task-2', 'task-3'],
          testCriteria: ['Integration tests pass'],
          files: ['tests/integration/tasks.test.ts'],
        },
      ],
    }));

    const decomposer = new TaskDecomposer({ llmClient });
    const resolver = new DependencyResolver();

    // Create feature from "requirements"
    const feature: Feature = {
      id: 'feature-1',
      projectId: 'test-project',
      name: 'Task Management',
      description: 'Create and assign tasks with notifications',
      priority: 'must',
      status: 'backlog',
      complexity: 'simple',
      subFeatures: [],
      estimatedTasks: 4,
      completedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('planning:started', (event) => events.push(event));
    eventBus.on('planning:completed', (event) => events.push(event));

    // Act: Decompose requirements into tasks
    eventBus.emit('planning:started', {
      featureId: feature.id,
      featureName: feature.name,
    });

    const tasks = await decomposer.decompose(feature);

    // Calculate dependency waves
    const waves = resolver.calculateWaves(tasks);

    eventBus.emit('planning:completed', {
      featureId: feature.id,
      taskCount: tasks.length,
      waveCount: waves.length,
    });

    // Assert: Tasks created with proper dependencies
    expect(tasks.length).toBe(4);

    // Waves calculated correctly
    expect(waves.length).toBe(3); // Wave 0: task-1, Wave 1: task-2,3, Wave 2: task-4

    // First wave has no dependencies
    expect(waves[0]!.tasks.every(t => t.dependsOn.length === 0)).toBe(true);

    // Last wave depends on previous tasks
    const lastWaveTask = waves[waves.length - 1]!.tasks[0];
    expect(lastWaveTask!.dependsOn.length).toBeGreaterThan(0);

    // Events emitted
    expect(events).toHaveLength(2);
  }, 30000);

  test('should execute tasks through agent pool', async ({ eventBus }) => {
    // Arrange: Set up task queue and agent pool
    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool();

    // Create tasks
    const planningTasks: PlanningTask[] = [
      {
        id: 'task-1',
        name: 'Task 1',
        description: 'First task',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 10,
        dependsOn: [],
        testCriteria: [],
        files: ['src/file1.ts'],
      },
      {
        id: 'task-2',
        name: 'Task 2',
        description: 'Second task (depends on 1)',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 10,
        dependsOn: ['task-1'],
        testCriteria: [],
        files: ['src/file2.ts'],
      },
    ];

    // Queue tasks
    for (const task of planningTasks) {
      const orchTask: OrchestrationTask = {
        ...task,
        status: 'pending',
        waveId: task.dependsOn.length === 0 ? 0 : 1,
        priority: 5,
        createdAt: new Date(),
      };
      taskQueue.enqueue(orchTask, orchTask.waveId);
    }

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('task:assigned', (event) => events.push(event));
    eventBus.on('task:completed', (event) => events.push(event));

    // Act: Execute tasks through agent pool
    // Spawn agents
    const agent1 = agentPool.spawn('coder');

    // Get and execute first task
    const task1 = taskQueue.dequeue();
    expect(task1).not.toBeNull();

    agentPool.assign(agent1.id, task1!.id, '/worktree/task-1');
    eventBus.emit('task:assigned', {
      taskId: task1!.id,
      agentId: agent1.id,
    });

    // Simulate task completion
    taskQueue.markComplete(task1!.id);
    agentPool.release(agent1.id);
    eventBus.emit('task:completed', {
      taskId: task1!.id,
      success: true,
    });

    // Now task 2 should be ready
    const readyTasks = taskQueue.getReadyTasks();
    expect(readyTasks.length).toBe(1);
    expect(readyTasks[0]!.id).toBe('task-2');

    // Execute task 2
    const task2 = taskQueue.dequeue();
    agentPool.assign(agent1.id, task2!.id, '/worktree/task-2');
    eventBus.emit('task:assigned', {
      taskId: task2!.id,
      agentId: agent1.id,
    });

    taskQueue.markComplete(task2!.id);
    agentPool.release(agent1.id);
    eventBus.emit('task:completed', {
      taskId: task2!.id,
      success: true,
    });

    // Assert: All tasks executed in order
    expect(taskQueue.size()).toBe(0);
    expect(taskQueue.getCompletedCount()).toBe(2);

    // Events show proper ordering
    expect(events).toHaveLength(4);
    expect(events.filter(e => e.type === 'task:assigned')).toHaveLength(2);
    expect(events.filter(e => e.type === 'task:completed')).toHaveLength(2);
  }, 30000);

  test('should run QA loop on completed tasks', async ({ eventBus }) => {
    // Arrange: Set up QA engine with passing components
    const qaComponents = createPassingQAComponents();
    const mockCoder = createMockCoderRunner();

    const qaEngine = new QALoopEngine({
      ...qaComponents,
      maxIterations: 3,
    });

    const task = {
      id: 'task-1',
      name: 'Test Task',
      description: 'A task to test QA',
      files: ['src/test.ts'],
      worktree: '/tmp/test',
    };

    // Track QA events
    const events: NexusEvent[] = [];
    eventBus.on('qa:loop-started', (event) => events.push(event));
    eventBus.on('qa:loop-completed', (event) => events.push(event));

    // Act: Run QA loop
    eventBus.emit('qa:loop-started', {
      taskId: task.id,
      maxIterations: 3,
    });

    const result = await qaEngine.run(task, mockCoder);

    eventBus.emit('qa:loop-completed', {
      taskId: task.id,
      success: result.success,
      iterations: result.iterations,
      stages: result.stages.map(s => s.stage),
    });

    // Assert: QA loop completed successfully
    expect(result.success).toBe(true);
    expect(result.escalated).toBe(false);
    expect(result.iterations).toBe(1);

    // All stages ran
    expect(result.stages).toHaveLength(4);
    expect(result.stages.map(s => s.stage)).toEqual(['build', 'lint', 'test', 'review']);

    // Events emitted
    expect(events).toHaveLength(2);
    expect((events[1]!.payload as any).success).toBe(true);
  }, 30000);

  test('should complete full Genesis flow end-to-end', async ({ eventBus }) => {
    // Arrange: Set up complete Genesis flow components
    const interviewLLM = createMockLLMClient((_messages) => `
I understand. Here are the requirements I've captured:

<requirement>
<text>User authentication with email and password</text>
<category>functional</category>
<priority>must</priority>
<confidence>0.9</confidence>
<area>auth</area>
</requirement>

<requirement>
<text>Dashboard showing user statistics</text>
<category>functional</category>
<priority>should</priority>
<confidence>0.85</confidence>
<area>dashboard</area>
</requirement>

Is this correct?
    `);

    const planningLLM = createMockLLMClient((_messages) => JSON.stringify({
      tasks: [
        {
          id: 'auth-task',
          name: 'Implement authentication',
          description: 'Add login/register functionality',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 20,
          dependsOn: [],
          testCriteria: ['Auth works'],
          files: ['src/auth/index.ts'],
        },
        {
          id: 'dashboard-task',
          name: 'Create dashboard',
          description: 'Build user dashboard',
          type: 'auto',
          size: 'small',
          estimatedMinutes: 15,
          dependsOn: ['auth-task'],
          testCriteria: ['Dashboard renders'],
          files: ['src/dashboard/index.ts'],
        },
      ],
    }));

    const requirementsDB = createMockRequirementsDB();
    const qaComponents = createPassingQAComponents();
    const mockCoder = createMockCoderRunner();

    // Initialize components
    const interviewEngine = new InterviewEngine({
      llmClient: interviewLLM,
      requirementsDB,
      eventBus,
    });

    const decomposer = new TaskDecomposer({ llmClient: planningLLM });
    const resolver = new DependencyResolver();
    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool();
    const qaEngine = new QALoopEngine({ ...qaComponents, maxIterations: 3 });

    // Track all flow events
    const flowEvents: Array<{ phase: string; data: unknown }> = [];

    // Act: Execute full Genesis flow

    // Phase 1: Interview
    flowEvents.push({ phase: 'interview:start', data: {} });
    const session = interviewEngine.startSession('genesis-project');
    await interviewEngine.processMessage(session.id, 'Build a user dashboard app');
    interviewEngine.endSession(session.id);
    flowEvents.push({ phase: 'interview:complete', data: { requirementCount: requirementsDB.requirements.size } });

    // Phase 2: Create feature from requirements
    const requirements = Array.from(requirementsDB.requirements.values());
    const feature = createFeatureFromRequirements(requirements);
    flowEvents.push({ phase: 'feature:created', data: { featureId: feature.id } });

    // Phase 3: Decompose into tasks
    const tasks = await decomposer.decompose(feature);
    const waves = resolver.calculateWaves(tasks);
    flowEvents.push({ phase: 'planning:complete', data: { taskCount: tasks.length, waveCount: waves.length } });

    // Phase 4: Queue and execute tasks
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

    const agent = agentPool.spawn('coder');
    let completedCount = 0;

    // Execute all tasks
    while (taskQueue.size() > 0) {
      const task = taskQueue.dequeue();
      if (!task) break;

      agentPool.assign(agent.id, task.id);

      // Run QA
      const qaResult = await qaEngine.run(
        { id: task.id, name: task.name, description: task.description, files: task.files ?? [] },
        mockCoder
      );

      if (qaResult.success) {
        taskQueue.markComplete(task.id);
        completedCount++;
      }

      agentPool.release(agent.id);
    }

    flowEvents.push({ phase: 'execution:complete', data: { completedTasks: completedCount } });

    // Assert: Full flow completed successfully
    expect(requirementsDB.requirements.size).toBe(2); // 2 requirements captured
    expect(tasks.length).toBe(2); // 2 tasks created
    expect(waves.length).toBe(2); // 2 waves (dependency chain)
    expect(completedCount).toBe(2); // All tasks completed

    // Flow phases executed in order
    const phases = flowEvents.map(e => e.phase);
    expect(phases).toEqual([
      'interview:start',
      'interview:complete',
      'feature:created',
      'planning:complete',
      'execution:complete',
    ]);

    // Final state assertions
    expect(taskQueue.size()).toBe(0);
    expect(taskQueue.getCompletedCount()).toBe(2);
    expect(agentPool.getAvailable()).not.toBeNull();
  }, 30000);
});
