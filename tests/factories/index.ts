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
  AgentMetrics,
  AgentModelConfig,
  TaskStatus,
  TaskType,
  TaskPriority,
  FeatureStatus,
  RequirementCategory,
  RequirementPriority,
  ProjectStatus,
  ProjectMetrics,
  ProjectSettings,
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
 * const task = createTask({ status: 'in_progress' }); // With override
 * const task = createTask({ dependencies: ['task-1', 'task-2'] }); // With dependencies
 */
export function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  const id = overrides.id ?? generateId('task');

  return {
    id,
    name: `Test Task ${id}`,
    description: 'A test task for unit testing',
    type: 'auto' as TaskType,
    status: 'pending' as TaskStatus,
    priority: 'normal' as TaskPriority,
    createdAt: now,
    updatedAt: now,
    featureId: undefined,
    projectId: 'project-1',
    files: [],
    dependencies: [],
    testCriteria: ['Tests should pass'],
    estimatedMinutes: 15,
    actualMinutes: undefined,
    assignedAgentId: undefined,
    worktreePath: undefined,
    completedAt: undefined,
    failedAt: undefined,
    errorMessage: undefined,
    qaIterations: 0,
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
 * const feature = createFeature({ priority: 'critical' }); // With override
 */
export function createFeature(overrides: Partial<Feature> = {}): Feature {
  const now = new Date();
  const id = overrides.id ?? generateId('feature');

  return {
    id,
    projectId: 'project-1',
    name: `Test Feature ${id}`,
    description: 'A test feature for unit testing',
    priority: 'medium' as RequirementPriority,
    status: 'pending' as FeatureStatus,
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    parentId: undefined,
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
 * const req = createRequirement({ category: 'technical', priority: 'critical' });
 */
export function createRequirement(overrides: Partial<Requirement> = {}): Requirement {
  const now = new Date();
  const id = overrides.id ?? generateId('req');

  return {
    id,
    projectId: 'project-1',
    featureId: undefined,
    content: `Test requirement ${id}`,
    category: 'functional' as RequirementCategory,
    priority: 'medium' as RequirementPriority,
    source: 'interview' as const,
    createdAt: now,
    updatedAt: now,
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

  const defaultMetrics: ProjectMetrics = {
    tasksTotal: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    featuresTotal: 0,
    featuresCompleted: 0,
    estimatedTotalMinutes: 0,
    actualTotalMinutes: 0,
    averageQAIterations: 0,
  };

  const defaultSettings: ProjectSettings = {
    maxConcurrentAgents: 4,
    maxTaskMinutes: 30,
    qaMaxIterations: 50,
    enableTDD: true,
    autoMerge: true,
  };

  return {
    id,
    name: `Test Project ${id}`,
    description: 'A test project for unit testing',
    mode: 'genesis' as const,
    status: 'pending' as ProjectStatus,
    path: `/tmp/test-projects/${id}`,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    metrics: overrides.metrics ? { ...defaultMetrics, ...overrides.metrics } : defaultMetrics,
    settings: overrides.settings ? { ...defaultSettings, ...overrides.settings } : defaultSettings,
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
 * const agent = createAgent({ type: 'reviewer', status: 'working' });
 */
export function createAgent(overrides: Partial<Agent> = {}): Agent {
  const now = new Date();
  const id = overrides.id ?? generateId('agent');
  const type: AgentType = overrides.type ?? 'coder';

  // Get default model config based on type
  const modelConfigs: Record<AgentType, AgentModelConfig> = {
    planner: { model: 'claude-opus-4', maxTokens: 8000, temperature: 0.7, provider: 'anthropic' },
    coder: { model: 'claude-sonnet-4', maxTokens: 16000, temperature: 0.3, provider: 'anthropic' },
    tester: { model: 'claude-sonnet-4', maxTokens: 8000, temperature: 0.3, provider: 'anthropic' },
    reviewer: { model: 'gemini-2.5-pro', maxTokens: 8000, temperature: 0.2, provider: 'google' },
    merger: { model: 'claude-sonnet-4', maxTokens: 4000, temperature: 0.1, provider: 'anthropic' },
  };

  const defaultMetrics: AgentMetrics = {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalIterations: 0,
    averageIterationsPerTask: 0,
    totalTokensUsed: 0,
    totalTimeActive: 0,
  };

  return {
    id,
    type,
    status: 'idle' as AgentStatus,
    modelConfig: modelConfigs[type],
    currentTaskId: undefined,
    worktreePath: undefined,
    metrics: overrides.metrics ? { ...defaultMetrics, ...overrides.metrics } : defaultMetrics,
    spawnedAt: now,
    lastActiveAt: now,
    terminatedAt: undefined,
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
      estimatedMinutes: tasksPerFeature * 15,
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

  // Update project metrics
  project.metrics.featuresTotal = featureCount;
  project.metrics.tasksTotal = featureCount * tasksPerFeature;

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
      dependencies: i > 0 ? [tasks[i - 1]!.id] : [],
    });
    tasks.push(task);
  }

  return tasks;
}
