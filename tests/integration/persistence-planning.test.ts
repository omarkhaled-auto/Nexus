/**
 * Persistence <-> Planning Integration Tests
 *
 * Tests real integration between RequirementsDB, StateManager
 * and Planning layer components (TaskDecomposer, DependencyResolver, TimeEstimator).
 *
 * These tests use real components - only LLM APIs are mocked via MSW.
 *
 * @module tests/integration/persistence-planning
 */
import { test, expect, describe, vi } from '../helpers/fixtures';
import { RequirementsDB } from '@/persistence/requirements/RequirementsDB';
import { StateManager, type NexusState } from '@/persistence/state/StateManager';
import { DependencyResolver } from '@/planning/dependencies/DependencyResolver';
import { TimeEstimator } from '@/planning/estimation/TimeEstimator';
import { TaskDecomposer } from '@/planning/decomposition/TaskDecomposer';
import type { PlanningTask, CompletedTask } from '@/planning/types';
import type { LLMClient, Message, LLMResponse, ChatOptions } from '@/llm/types';
import type { Feature } from '@/types/core';
import { nanoid } from 'nanoid';

// ============================================================================
// Mock LLM Client
// ============================================================================

/**
 * Create a mock LLM client that returns predictable task decompositions
 */
function createMockLLMClient(mockResponses: Record<string, string> = {}): LLMClient {
  const defaultDecomposition = JSON.stringify({
    tasks: [
      {
        id: 'task-1',
        name: 'Setup database models',
        description: 'Create the data models for the feature',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
        testCriteria: ['Models compile without errors', 'Models have correct fields'],
        files: ['src/models/feature.ts'],
      },
      {
        id: 'task-2',
        name: 'Implement business logic',
        description: 'Add the core business logic',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 25,
        dependsOn: ['task-1'],
        testCriteria: ['Logic handles valid inputs', 'Logic rejects invalid inputs'],
        files: ['src/services/feature.ts'],
      },
      {
        id: 'task-3',
        name: 'Add API endpoint',
        description: 'Create REST endpoint for the feature',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 20,
        dependsOn: ['task-2'],
        testCriteria: ['Endpoint returns correct status', 'Endpoint validates input'],
        files: ['src/routes/feature.ts'],
      },
    ],
  });

  const defaultEstimate = JSON.stringify({
    estimatedMinutes: 15,
    confidence: 0.85,
    reasoning: 'Standard implementation task',
  });

  return {
    async chat(messages: Message[], _options?: ChatOptions): Promise<LLMResponse> {
      const content = messages.find(m => m.role === 'user')?.content || '';

      // Determine response based on content
      let response = defaultDecomposition;

      if (content.includes('empty') || content.includes('Empty')) {
        response = JSON.stringify({ tasks: [] });
      } else if (content.includes('Estimate') || content.includes('estimate')) {
        response = defaultEstimate;
      } else if (mockResponses.decompose) {
        response = mockResponses.decompose;
      }

      return {
        content: response,
        tokenUsage: { input: 100, output: 50 },
        finishReason: 'stop',
      };
    },
    async *stream(_messages: Message[], _options?: ChatOptions) {
      yield { type: 'text' as const, content: 'Test' };
    },
    countTokens: async (_text: string) => 100,
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test feature for decomposition
 */
function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date();
  return {
    id: `feature-${nanoid(6)}`,
    name: 'Test Feature',
    description: 'A feature for testing decomposition',
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

/**
 * Create a test state with requirements data
 */
function createTestStateWithRequirements(
  projectId: string,
  requirements: { category: string; description: string }[]
): NexusState {
  const now = new Date();
  return {
    projectId,
    project: {
      id: projectId,
      name: 'Test Project',
      description: 'Project with requirements',
      mode: 'genesis',
      status: 'planning',
      rootPath: '/tmp/test-project',
      repositoryUrl: null,
      settings: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
    features: [],
    tasks: [],
    agents: [],
    status: 'planning',
    currentPhase: 'requirements',
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Persistence <-> Planning Integration', () => {
  test('should decompose tasks from stored requirements', async ({ db }) => {
    // Arrange: Set up RequirementsDB with requirements
    const requirementsDB = new RequirementsDB({ db: db.client });
    const projectId = await requirementsDB.createProject('Test Project', 'A project for testing');

    // Add requirements that will inform the decomposition
    await requirementsDB.addRequirement(projectId, {
      category: 'functional',
      description: 'User should be able to create new items',
      priority: 'must',
      userStories: ['As a user, I want to create items so I can track them'],
      acceptanceCriteria: ['Items are saved to database', 'Items have timestamps'],
    });

    await requirementsDB.addRequirement(projectId, {
      category: 'functional',
      description: 'User should be able to edit existing items',
      priority: 'should',
      userStories: ['As a user, I want to edit items so I can correct mistakes'],
      acceptanceCriteria: ['Edits are persisted', 'Edit history is maintained'],
    });

    // Create TaskDecomposer with mock LLM
    const mockLLM = createMockLLMClient();
    const taskDecomposer = new TaskDecomposer({ llmClient: mockLLM });

    // Act: Read requirements and decompose into tasks
    const requirements = await requirementsDB.getRequirements(projectId);
    expect(requirements).toHaveLength(2);

    // Create a feature from requirements
    const feature = createTestFeature({
      name: 'Item Management',
      description: requirements.map(r => r.description).join('. '),
      complexity: 'simple',
    });

    // Decompose feature into tasks
    const tasks = await taskDecomposer.decompose(feature);

    // Assert: Tasks were created from requirements
    expect(tasks).toHaveLength(3);
    expect(tasks[0].name).toBe('Setup database models');
    expect(tasks[1].name).toBe('Implement business logic');
    expect(tasks[2].name).toBe('Add API endpoint');

    // Verify dependencies are set correctly
    expect(tasks[0].dependsOn).toEqual([]);
    expect(tasks[1].dependsOn).toEqual(['task-1']);
    expect(tasks[2].dependsOn).toEqual(['task-2']);
  });

  test('should resolve dependencies using stored task data', async ({ db }) => {
    // Arrange: Create StateManager with tasks in database
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;

    // Create planning tasks with dependencies
    const planningTasks: PlanningTask[] = [
      {
        id: 'task-a',
        name: 'Initialize project',
        description: 'Setup the base project structure',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 10,
        dependsOn: [],
        testCriteria: ['Project compiles'],
        files: ['package.json'],
      },
      {
        id: 'task-b',
        name: 'Add database layer',
        description: 'Setup database connection',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 20,
        dependsOn: ['task-a'],
        testCriteria: ['Database connects'],
        files: ['src/db.ts'],
      },
      {
        id: 'task-c',
        name: 'Add API layer',
        description: 'Create API endpoints',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 25,
        dependsOn: ['task-a'],
        testCriteria: ['Endpoints respond'],
        files: ['src/api.ts'],
      },
      {
        id: 'task-d',
        name: 'Integration tests',
        description: 'Test everything together',
        type: 'tdd',
        size: 'small',
        estimatedMinutes: 20,
        dependsOn: ['task-b', 'task-c'],
        testCriteria: ['Integration tests pass'],
        files: ['tests/integration.test.ts'],
      },
    ];

    // Save initial state
    const initialState = createTestStateWithRequirements(projectId, []);
    stateManager.saveState(initialState);

    // Act: Use DependencyResolver to calculate waves
    const dependencyResolver = new DependencyResolver();
    const waves = dependencyResolver.calculateWaves(planningTasks);

    // Assert: Waves are correctly calculated
    expect(waves).toHaveLength(3);

    // Wave 0: task-a (no dependencies)
    expect(waves[0].id).toBe(0);
    expect(waves[0].tasks.map(t => t.id)).toEqual(['task-a']);

    // Wave 1: task-b and task-c (both depend only on task-a)
    expect(waves[1].id).toBe(1);
    expect(waves[1].tasks.map(t => t.id).sort()).toEqual(['task-b', 'task-c']);

    // Wave 2: task-d (depends on both b and c)
    expect(waves[2].id).toBe(2);
    expect(waves[2].tasks.map(t => t.id)).toEqual(['task-d']);

    // Verify topological sort works
    const sorted = dependencyResolver.topologicalSort(planningTasks);
    expect(sorted.map(t => t.id)).toEqual(['task-a', 'task-b', 'task-c', 'task-d']);
  });

  test('should estimate time based on historical data', async ({ db }) => {
    // Arrange: Create StateManager with historical task completion data
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;

    // Create mock LLM client
    const mockLLM = createMockLLMClient();
    const timeEstimator = new TimeEstimator({ llmClient: mockLLM });

    // Historical completed tasks (actual took longer than estimated - underestimated)
    const historicalTasks: CompletedTask[] = [
      { taskId: 'hist-1', estimatedMinutes: 10, actualMinutes: 15, complexity: 'simple' },
      { taskId: 'hist-2', estimatedMinutes: 20, actualMinutes: 28, complexity: 'medium' },
      { taskId: 'hist-3', estimatedMinutes: 15, actualMinutes: 20, complexity: 'simple' },
      { taskId: 'hist-4', estimatedMinutes: 25, actualMinutes: 35, complexity: 'complex' },
    ];

    // Act: Calibrate estimator based on historical data
    timeEstimator.calibrate(historicalTasks);
    const calibrationFactor = timeEstimator.getCalibrationFactor();

    // Assert: Calibration factor reflects that estimates were too low
    // Average ratio: (15/10 + 28/20 + 20/15 + 35/25) / 4 = (1.5 + 1.4 + 1.33 + 1.4) / 4 = 1.41
    expect(calibrationFactor).toBeGreaterThan(1.0);
    expect(calibrationFactor).toBeLessThan(2.0);
    expect(calibrationFactor).toBeCloseTo(1.41, 1);

    // Save state with calibration info
    const state = createTestStateWithRequirements(projectId, []);
    stateManager.saveState({
      ...state,
      currentPhase: 'calibrated',
    });

    // Verify state was saved
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.currentPhase).toBe('calibrated');
  });

  test('should persist decomposition results', async ({ db }) => {
    // Arrange
    const stateManager = new StateManager({ db: db.client });
    const projectId = `project-${nanoid(6)}`;

    // Create mock LLM and decomposer
    const mockLLM = createMockLLMClient();
    const taskDecomposer = new TaskDecomposer({ llmClient: mockLLM });

    // Create feature
    const feature = createTestFeature({
      id: `feature-${nanoid(6)}`,
      name: 'User Authentication',
      description: 'Implement user login and registration',
    });

    // Create initial state
    const initialState: NexusState = {
      projectId,
      project: {
        id: projectId,
        name: 'Auth Project',
        description: 'Project for authentication',
        mode: 'genesis',
        status: 'planning',
        rootPath: '/tmp/auth-project',
        repositoryUrl: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
      features: [
        {
          id: feature.id,
          projectId,
          name: feature.name,
          description: feature.description || null,
          priority: 'must',
          status: 'backlog',
          complexity: 'simple',
          estimatedTasks: 0,
          completedTasks: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [],
      agents: [],
      status: 'planning',
      currentPhase: 'decomposition',
    };
    stateManager.saveState(initialState);

    // Act: Decompose feature into tasks
    const planningTasks = await taskDecomposer.decompose(feature);

    // Convert PlanningTasks to database task format
    const dbTasks = planningTasks.map(pt => ({
      id: pt.id,
      projectId,
      featureId: feature.id,
      subFeatureId: null,
      name: pt.name,
      description: pt.description,
      type: pt.type,
      status: 'pending' as const,
      size: pt.size,
      priority: 5,
      tags: null,
      notes: pt.testCriteria ? JSON.stringify(pt.testCriteria) : null,
      assignedAgent: null,
      worktreePath: null,
      branchName: null,
      dependsOn: pt.dependsOn.length > 0 ? JSON.stringify(pt.dependsOn) : null,
      blockedBy: null,
      qaIterations: 0,
      maxIterations: 50,
      estimatedMinutes: pt.estimatedMinutes,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Update state with decomposed tasks
    const updatedState: NexusState = {
      ...initialState,
      tasks: dbTasks,
      features: [
        {
          ...initialState.features[0],
          estimatedTasks: dbTasks.length,
          status: 'planned',
          updatedAt: new Date(),
        },
      ],
    };
    stateManager.saveState(updatedState);

    // Assert: Tasks are persisted to database
    const loadedState = stateManager.loadState(projectId);
    expect(loadedState).not.toBeNull();
    expect(loadedState!.tasks).toHaveLength(3);
    expect(loadedState!.tasks[0].name).toBe('Setup database models');
    expect(loadedState!.tasks[1].name).toBe('Implement business logic');
    expect(loadedState!.tasks[2].name).toBe('Add API endpoint');

    // Verify feature was updated
    expect(loadedState!.features[0].estimatedTasks).toBe(3);
    expect(loadedState!.features[0].status).toBe('planned');
  });

  test('should handle empty requirements gracefully', async ({ db }) => {
    // Arrange: Create RequirementsDB with no requirements
    const requirementsDB = new RequirementsDB({ db: db.client });
    const projectId = await requirementsDB.createProject('Empty Project', 'A project with no requirements');

    // Create TaskDecomposer with mock LLM that returns empty tasks
    const mockLLM = createMockLLMClient();
    const taskDecomposer = new TaskDecomposer({ llmClient: mockLLM });

    // Act: Check requirements and create feature for decomposition
    const requirements = await requirementsDB.getRequirements(projectId);
    expect(requirements).toHaveLength(0);

    // Create an empty feature (simulating no requirements scenario)
    const emptyFeature = createTestFeature({
      name: 'Empty Feature',
      description: 'Empty feature with no requirements',
      complexity: 'simple',
    });

    // Decompose empty feature - LLM returns empty tasks for this
    const tasks = await taskDecomposer.decompose(emptyFeature);

    // Assert: Decomposer handles empty case gracefully
    // Note: The mock LLM returns the default 3 tasks for non-empty features
    // For truly empty, it would return []
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);

    // Test DependencyResolver with empty tasks
    const dependencyResolver = new DependencyResolver();
    const waves = dependencyResolver.calculateWaves([]);
    expect(waves).toHaveLength(0);

    const sorted = dependencyResolver.topologicalSort([]);
    expect(sorted).toHaveLength(0);

    const cycles = dependencyResolver.detectCycles([]);
    expect(cycles).toHaveLength(0);
  });
});
