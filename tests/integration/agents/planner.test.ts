/**
 * Planner Agent Integration Tests
 *
 * Tests the planner agent's ability to decompose features into executable tasks,
 * respect complexity limits, emit events, handle ambiguous requirements, and
 * integrate with TimeEstimator for calibration.
 *
 * @module tests/integration/agents/planner
 */
import { test, expect, describe, beforeEach, vi } from '../../helpers/fixtures';
import { TaskDecomposer } from '@/planning/decomposition/TaskDecomposer';
import { TimeEstimator } from '@/planning/estimation/TimeEstimator';
import { DependencyResolver } from '@/planning/dependencies/DependencyResolver';
import type { Feature } from '@/types/core';
import type { PlanningTask, CompletedTask } from '@/planning/types';
import type { LLMClient, Message, LLMResponse, ChatOptions } from '@/llm';
import type { NexusEvent } from '@/types/events';
import { nanoid } from 'nanoid';
import { resetMockState, setClaudeResponse } from '../../mocks/handlers';

// ============================================================================
// Mock LLM Client
// ============================================================================

/**
 * Create a mock LLM client that returns configurable responses
 */
function createMockLLMClient(responseGenerator?: (messages: Message[]) => string): LLMClient {
  const defaultResponse = JSON.stringify({
    tasks: [
      {
        id: 'task-1',
        name: 'Setup project structure',
        description: 'Initialize the basic project files and configuration',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
        testCriteria: ['Project initializes successfully'],
        files: ['package.json', 'tsconfig.json'],
      },
      {
        id: 'task-2',
        name: 'Implement core logic',
        description: 'Implement the main business logic',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 25,
        dependsOn: ['task-1'],
        testCriteria: ['Logic executes correctly'],
        files: ['src/core.ts'],
      },
    ],
  });

  return {
    chat: vi.fn(async (messages: Message[], _options?: ChatOptions): Promise<LLMResponse> => {
      const content = responseGenerator ? responseGenerator(messages) : defaultResponse;
      return {
        content,
        finishReason: 'stop',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      };
    }),
    getModel: () => 'claude-sonnet-4',
  } as unknown as LLMClient;
}

/**
 * Create a test feature
 */
function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date();
  return {
    id: `feature-${nanoid(6)}`,
    projectId: 'project-1',
    name: 'Test Feature',
    description: 'A feature for testing the planner',
    priority: 'must',
    status: 'backlog',
    complexity: 'simple',
    subFeatures: [],
    estimatedTasks: 3,
    completedTasks: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Planner Agent Integration', () => {
  beforeEach(() => {
    resetMockState();
  });

  test('should decompose feature into executable tasks', async ({ eventBus }) => {
    // Arrange: Create planner components
    const llmClient = createMockLLMClient();
    const decomposer = new TaskDecomposer({ llmClient });
    const resolver = new DependencyResolver();
    const feature = createTestFeature({
      name: 'User Authentication',
      description: 'Implement user login and registration with email verification',
    });

    // Track planning events
    const events: NexusEvent[] = [];
    eventBus.on('planning:started', (event) => events.push(event));
    eventBus.on('planning:completed', (event) => events.push(event));

    // Act: Decompose the feature
    eventBus.emit('planning:started', {
      featureId: feature.id,
      featureName: feature.name,
    });

    const tasks = await decomposer.decompose(feature);

    // Calculate waves for dependency verification
    const waves = resolver.calculateWaves(tasks);

    eventBus.emit('planning:completed', {
      featureId: feature.id,
      taskCount: tasks.length,
      waveCount: waves.length,
    });

    // Assert: Tasks were created correctly
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBe(2);

    // Each task has required fields
    for (const task of tasks) {
      expect(task.id).toBeDefined();
      expect(task.name).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.type).toBeDefined();
      expect(Array.isArray(task.dependsOn)).toBe(true);
    }

    // Dependencies form valid waves
    expect(waves.length).toBeGreaterThan(0);

    // Events were emitted
    expect(events).toHaveLength(2);
    expect(events[0]!.payload.featureId).toBe(feature.id);
    expect(events[1]!.payload.taskCount).toBe(2);
  });

  test('should respect complexity limits per task', async () => {
    // Arrange: Create LLM that returns an oversized task initially
    let callCount = 0;
    const llmClient = createMockLLMClient((_messages) => {
      callCount++;
      if (callCount === 1) {
        // First call: return oversized task
        return JSON.stringify({
          tasks: [
            {
              id: 'task-big',
              name: 'Large task',
              description: 'A task that exceeds the 30-minute limit',
              type: 'auto',
              size: 'small',
              estimatedMinutes: 60, // Exceeds MAX_TASK_MINUTES (30)
              dependsOn: [],
              testCriteria: ['Should be split'],
              files: ['src/large.ts'],
            },
          ],
        });
      }
      // Second call: return split tasks
      return JSON.stringify({
        tasks: [
          {
            id: 'task-big-1',
            name: 'Large task part 1',
            description: 'First part',
            type: 'auto',
            size: 'atomic',
            estimatedMinutes: 20,
            dependsOn: [],
            parentTaskId: 'task-big',
            testCriteria: ['Part 1 works'],
            files: ['src/large-1.ts'],
          },
          {
            id: 'task-big-2',
            name: 'Large task part 2',
            description: 'Second part',
            type: 'auto',
            size: 'atomic',
            estimatedMinutes: 20,
            dependsOn: ['task-big-1'],
            parentTaskId: 'task-big',
            testCriteria: ['Part 2 works'],
            files: ['src/large-2.ts'],
          },
        ],
      });
    });

    const decomposer = new TaskDecomposer({ llmClient });
    const feature = createTestFeature({
      name: 'Complex Feature',
      description: 'A feature with complex requirements',
    });

    // Act: Decompose (should auto-split oversized tasks)
    const tasks = await decomposer.decompose(feature);

    // Assert: No task exceeds 30 minutes
    for (const task of tasks) {
      expect(task.estimatedMinutes).toBeLessThanOrEqual(30);
    }

    // Tasks were split (2 calls = initial + split)
    expect(callCount).toBe(2);
    expect(tasks.length).toBe(2);
    expect(tasks[0]!.parentTaskId).toBe('task-big');
  });

  test('should emit planning events', async ({ eventBus }) => {
    // Arrange
    const llmClient = createMockLLMClient();
    const decomposer = new TaskDecomposer({ llmClient });
    const feature = createTestFeature();

    // Track all planning-related events
    const events: Array<{ type: string; payload: unknown }> = [];
    eventBus.on('planning:started', (event) => events.push({ type: 'planning:started', payload: event.payload }));
    eventBus.on('planning:completed', (event) => events.push({ type: 'planning:completed', payload: event.payload }));
    eventBus.on('planning:task-created', (event) => events.push({ type: 'planning:task-created', payload: event.payload }));

    // Act: Simulate full planning workflow with events
    eventBus.emit('planning:started', {
      featureId: feature.id,
      featureName: feature.name,
      complexity: feature.complexity,
    });

    const tasks = await decomposer.decompose(feature);

    // Emit task-created events for each task
    for (const task of tasks) {
      eventBus.emit('planning:task-created', {
        taskId: task.id,
        taskName: task.name,
        featureId: feature.id,
        estimatedMinutes: task.estimatedMinutes,
      });
    }

    eventBus.emit('planning:completed', {
      featureId: feature.id,
      taskCount: tasks.length,
      totalEstimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    });

    // Assert: Events were emitted in order
    expect(events.length).toBe(4); // started + 2 task-created + completed
    expect(events[0]!.type).toBe('planning:started');
    expect(events[1]!.type).toBe('planning:task-created');
    expect(events[2]!.type).toBe('planning:task-created');
    expect(events[3]!.type).toBe('planning:completed');

    // Verify event payloads
    const startedEvent = events[0]!;
    expect((startedEvent.payload as any).featureId).toBe(feature.id);

    const completedEvent = events[3]!;
    expect((completedEvent.payload as any).taskCount).toBe(2);
  });

  test('should handle ambiguous requirements', async () => {
    // Arrange: Create LLM that handles vague input
    const llmClient = createMockLLMClient((messages) => {
      // Check if the prompt contains vague language
      const userMessage = messages.find(m => m.role === 'user')?.content ?? '';

      // Return tasks with assumptions documented
      return JSON.stringify({
        tasks: [
          {
            id: 'task-clarify',
            name: 'Clarify requirements',
            description: 'Document assumptions: Assuming standard authentication flow with email/password',
            type: 'checkpoint', // Mark as checkpoint for human review
            size: 'atomic',
            estimatedMinutes: 10,
            dependsOn: [],
            testCriteria: ['Requirements documented and assumptions listed'],
            files: ['docs/requirements.md'],
          },
          {
            id: 'task-impl',
            name: 'Implement based on assumptions',
            description: 'Implement feature based on documented assumptions',
            type: 'auto',
            size: 'small',
            estimatedMinutes: 20,
            dependsOn: ['task-clarify'],
            testCriteria: ['Implementation matches assumptions'],
            files: ['src/feature.ts'],
          },
        ],
      });
    });

    const decomposer = new TaskDecomposer({ llmClient });
    const feature = createTestFeature({
      name: 'Make it better',
      description: 'Improve the thing', // Vague requirements
    });

    // Act: Decompose with vague requirements
    const tasks = await decomposer.decompose(feature);

    // Assert: Planner created reasonable tasks despite vagueness
    expect(tasks.length).toBeGreaterThan(0);

    // Check that at least one task is a checkpoint (for clarification)
    const checkpointTasks = tasks.filter(t => t.type === 'checkpoint');
    expect(checkpointTasks.length).toBeGreaterThanOrEqual(1);

    // The checkpoint task should mention clarification or assumptions
    const clarifyTask = tasks.find(t => t.type === 'checkpoint');
    expect(clarifyTask!.description.toLowerCase()).toMatch(/assum/i);
  });

  test('should integrate with TimeEstimator for calibration', async () => {
    // Arrange: Create TimeEstimator with historical data
    const llmClient = createMockLLMClient(() =>
      JSON.stringify({
        estimatedMinutes: 15,
        confidence: 0.8,
        reasoning: 'Standard task complexity',
      })
    );

    const estimator = new TimeEstimator({ llmClient });

    // Historical data showing estimates were 20% low
    const history: CompletedTask[] = [
      { taskId: 'h1', estimatedMinutes: 10, actualMinutes: 12 },
      { taskId: 'h2', estimatedMinutes: 15, actualMinutes: 18 },
      { taskId: 'h3', estimatedMinutes: 20, actualMinutes: 24 },
    ];

    // Act: Calibrate estimator
    const initialFactor = estimator.getCalibrationFactor();
    estimator.calibrate(history);
    const calibratedFactor = estimator.getCalibrationFactor();

    // Create a task to estimate
    const task: PlanningTask = {
      id: 'test-task',
      name: 'Test estimation',
      description: 'A task to test calibrated estimation',
      type: 'auto',
      size: 'atomic',
      estimatedMinutes: 15,
      dependsOn: [],
      testCriteria: ['Estimation is calibrated'],
      files: ['src/test.ts'],
    };

    const estimate = await estimator.estimateTime(task);

    // Assert: Calibration factor changed based on history
    expect(initialFactor).toBe(1.0); // Default
    expect(calibratedFactor).toBeCloseTo(1.2, 1); // History shows 20% underestimate

    // Estimate should be affected by calibration
    // The LLM returns 15, calibrated with 1.2 factor = 18
    expect(estimate).toBeGreaterThanOrEqual(15);
    expect(estimate).toBeLessThanOrEqual(30); // Still within max
  });
});
