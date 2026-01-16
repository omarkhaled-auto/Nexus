/**
 * Test Factories for Domain Objects
 *
 * Provides factory functions that generate valid test instances of domain objects.
 * Each factory returns a complete object with sensible defaults that can be overridden.
 *
 * @module tests/factories
 */
import type {
  Task,
  Feature,
  Requirement,
  Project,
  Agent,
  AgentType,
  AgentStatus,
  TaskStatus,
  TaskType,
  TaskSize,
  FeatureStatus,
  FeatureComplexity,
  Priority,
  RequirementCategory,
  ProjectMode,
  ProjectStatus,
} from '@/types';

// ============================================================================
// ID Counter
// ============================================================================

let idCounter = 0;

/**
 * Reset the ID counter to 0.
 * Call this in beforeEach if you need deterministic IDs.
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Generate a unique ID with optional prefix.
 */
function generateId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Create a valid Task object.
 *
 * @example
 * const task = createTask(); // Default task
 * const task = createTask({ status: 'executing' }); // With override
 * const task = createTask({ dependencies: ['task-1', 'task-2'] }); // With dependencies
 */
export function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  const id = overrides.id ?? generateId('task');

  return {
    id,
    projectId: 'project-1',
    featureId: undefined,
    subFeatureId: undefined,
    name: `Test Task ${id}`,
    description: 'A test task for unit testing',
    type: 'auto' as TaskType,
    status: 'pending' as TaskStatus,
    size: 'small' as TaskSize,
    priority: 5,
    tags: [],
    notes: [],
    assignedAgent: undefined,
    worktreePath: undefined,
    branchName: undefined,
    dependsOn: [],
    blockedBy: undefined,
    qaIterations: 0,
    maxIterations: 50,
    estimatedMinutes: 15,
    actualMinutes: undefined,
    startedAt: undefined,
    completedAt: undefined,
    filesCreated: [],
    filesModified: [],
    testsWritten: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple tasks with optional shared overrides.
 *
 * @example
 * const tasks = createTasks(3); // 3 default tasks
 * const tasks = createTasks(3, { status: 'queued' }); // 3 queued tasks
 */
export function createTasks(count: number, overrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, () => createTask(overrides));
}

// ============================================================================
// Feature Factory
// ============================================================================

/**
 * Create a valid Feature object.
 *
 * @example
 * const feature = createFeature(); // Default feature
 * const feature = createFeature({ complexity: 'complex' }); // Complex feature
 */
export function createFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date();
  const id = overrides.id ?? generateId('feature');

  return {
    id,
    projectId: 'project-1',
    name: `Test Feature ${id}`,
    description: 'A test feature for unit testing',
    priority: 'should' as Priority,
    status: 'backlog' as FeatureStatus,
    complexity: 'simple' as FeatureComplexity,
    subFeatures: [],
    estimatedTasks: 3,
    completedTasks: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple features with optional shared overrides.
 */
export function createFeatures(count: number, overrides: Partial<Feature> = {}): Feature[] {
  return Array.from({ length: count }, () => createFeature(overrides));
}

// ============================================================================
// Requirement Factory
// ============================================================================

/**
 * Create a valid Requirement object.
 *
 * @example
 * const req = createRequirement(); // Default requirement
 * const req = createRequirement({ category: 'non-functional', priority: 'must' });
 */
export function createRequirement(overrides: Partial<Requirement> = {}): Requirement {
  const now = new Date();
  const id = overrides.id ?? generateId('req');

  return {
    id,
    projectId: 'project-1',
    category: 'functional' as RequirementCategory,
    description: `Test requirement ${id}`,
    priority: 'should' as Priority,
    source: 'test',
    userStories: ['As a user, I want to test things'],
    acceptanceCriteria: ['Tests should pass'],
    linkedFeatures: [],
    validated: false,
    confidence: 0.9,
    tags: [],
    createdAt: now,
    ...overrides,
  };
}

/**
 * Create multiple requirements with optional shared overrides.
 */
export function createRequirements(count: number, overrides: Partial<Requirement> = {}): Requirement[] {
  return Array.from({ length: count }, () => createRequirement(overrides));
}

// ============================================================================
// Project Factory
// ============================================================================

/**
 * Create a valid Project object.
 *
 * @example
 * const project = createProject(); // Default genesis project
 * const project = createProject({ mode: 'evolution', status: 'executing' });
 */
export function createProject(overrides: Partial<Project> = {}): Project {
  const now = new Date();
  const id = overrides.id ?? generateId('project');

  return {
    id,
    name: `Test Project ${id}`,
    description: 'A test project for unit testing',
    mode: 'genesis' as ProjectMode,
    status: 'initializing' as ProjectStatus,
    rootPath: `/tmp/test-projects/${id}`,
    repositoryUrl: undefined,
    features: [],
    requirements: [],
    settings: {
      maxParallelAgents: 4,
      testCoverageTarget: 80,
      maxTaskMinutes: 30,
      qaMaxIterations: 50,
      checkpointIntervalHours: 2,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    metrics: {
      totalFeatures: 0,
      completedFeatures: 0,
      totalTasks: 0,
      completedTasks: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageQAIterations: 0,
      startedAt: undefined,
      estimatedCompletion: undefined,
    },
    ...overrides,
  };
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a valid Agent object.
 *
 * @example
 * const agent = createAgent(); // Default coder agent
 * const agent = createAgent({ type: 'reviewer', status: 'executing' });
 */
export function createAgent(overrides: Partial<Agent> = {}): Agent {
  const now = new Date();
  const id = overrides.id ?? generateId('agent');
  const type: AgentType = overrides.type ?? 'coder';

  // Get default model config based on type
  const modelConfigs: Record<AgentType, Agent['model']> = {
    planner: { model: 'claude-opus-4', maxTokens: 8000, temperature: 0.7, provider: 'anthropic' },
    coder: { model: 'claude-sonnet-4', maxTokens: 16000, temperature: 0.3, provider: 'anthropic' },
    tester: { model: 'claude-sonnet-4', maxTokens: 8000, temperature: 0.3, provider: 'anthropic' },
    reviewer: { model: 'gemini-2.5-pro', maxTokens: 8000, temperature: 0.2, provider: 'google' },
    merger: { model: 'claude-sonnet-4', maxTokens: 4000, temperature: 0.1, provider: 'anthropic' },
  };

  const toolConfigs: Record<AgentType, Agent['tools']> = {
    planner: ['file_read', 'search_code'],
    coder: ['file_read', 'file_write', 'file_edit', 'terminal', 'search_code', 'git_status', 'git_diff'],
    tester: ['file_read', 'file_write', 'terminal', 'run_tests', 'search_code'],
    reviewer: ['file_read', 'search_code', 'git_diff'],
    merger: ['file_read', 'git_status', 'git_diff', 'git_commit', 'terminal'],
  };

  return {
    id,
    type,
    status: 'idle' as AgentStatus,
    model: modelConfigs[type],
    systemPrompt: `prompts/${type}.md`,
    tools: toolConfigs[type],
    currentTaskId: undefined,
    worktreePath: undefined,
    branchName: undefined,
    metrics: {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageTaskDuration: 0,
      qaIterationsTotal: 0,
      successRate: 100,
    },
    spawnedAt: now,
    lastActivityAt: now,
    terminatedAt: undefined,
    terminationReason: undefined,
    ...overrides,
  };
}

/**
 * Create multiple agents with optional shared overrides.
 */
export function createAgents(count: number, overrides: Partial<Agent> = {}): Agent[] {
  return Array.from({ length: count }, () => createAgent(overrides));
}

// ============================================================================
// Composite Factories
// ============================================================================

/**
 * Create a project with features and tasks.
 * Useful for integration tests that need a complete project structure.
 */
export function createProjectWithFeatures(
  featureCount = 2,
  tasksPerFeature = 3
): { project: Project; features: Feature[]; tasks: Task[] } {
  const project = createProject();
  const features: Feature[] = [];
  const tasks: Task[] = [];

  for (let i = 0; i < featureCount; i++) {
    const feature = createFeature({
      projectId: project.id,
      estimatedTasks: tasksPerFeature,
    });
    features.push(feature);

    for (let j = 0; j < tasksPerFeature; j++) {
      tasks.push(
        createTask({
          projectId: project.id,
          featureId: feature.id,
        })
      );
    }
  }

  // Update project with features array
  project.features = features;
  project.metrics.totalFeatures = featureCount;
  project.metrics.totalTasks = featureCount * tasksPerFeature;

  return { project, features, tasks };
}

/**
 * Create a task chain with dependencies.
 * Each task depends on the previous one.
 */
export function createTaskChain(length: number, overrides: Partial<Task> = {}): Task[] {
  const tasks: Task[] = [];

  for (let i = 0; i < length; i++) {
    const task = createTask({
      ...overrides,
      dependsOn: i > 0 ? [tasks[i - 1]!.id] : [],
    });
    tasks.push(task);
  }

  return tasks;
}
