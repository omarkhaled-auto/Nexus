import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskDecomposer } from './TaskDecomposer';
import type { Feature, SubFeature } from '../../types/core';
import type { PlanningTask, ValidationResult } from '../types';
import type { LLMClient, LLMResponse, Message } from '../../llm/types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-1',
    projectId: 'project-1',
    name: 'User Authentication',
    description: 'Implement user login and registration',
    priority: 'must',
    status: 'backlog',
    complexity: 'complex',
    subFeatures: [],
    estimatedTasks: 0,
    completedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockSubFeature(overrides: Partial<SubFeature> = {}): SubFeature {
  return {
    id: 'subfeature-1',
    featureId: 'feature-1',
    name: 'Login Form',
    description: 'Create login form with email and password',
    status: 'backlog',
    taskIds: [],
    ...overrides,
  };
}

function createMockTask(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: 'task-1',
    name: 'Create login form component',
    description: 'Build React component for login form',
    type: 'auto',
    size: 'atomic',
    estimatedMinutes: 15,
    dependsOn: [],
    testCriteria: ['Form renders email input', 'Form renders password input'],
    files: ['src/components/LoginForm.tsx'],
    ...overrides,
  };
}

function createMockLLMClient(responses: LLMResponse[]): LLMClient {
  let callIndex = 0;
  return {
    chat: vi.fn().mockImplementation(() => {
      const response = responses[callIndex];
      callIndex++;
      return Promise.resolve(response);
    }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(100),
  };
}

function createDecomposeResponse(tasks: Partial<PlanningTask>[]): LLMResponse {
  const result = {
    tasks: tasks.map((t, i) => ({
      id: t.id || `task-${i + 1}`,
      name: t.name || `Task ${i + 1}`,
      description: t.description || `Description ${i + 1}`,
      type: t.type || 'auto',
      size: t.size || 'atomic',
      estimatedMinutes: t.estimatedMinutes || 15,
      dependsOn: t.dependsOn || [],
      testCriteria: t.testCriteria || [`Test for task ${i + 1}`],
      files: t.files || [`src/file${i + 1}.ts`],
    })),
  };

  return {
    content: JSON.stringify(result),
    usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
    finishReason: 'stop',
  };
}

function createComplexDecomposeResponse(): LLMResponse {
  const result = {
    subFeatures: [
      {
        id: 'sub-1',
        name: 'Login Component',
        description: 'Login UI components',
        taskIds: ['task-1', 'task-2'],
      },
      {
        id: 'sub-2',
        name: 'Auth Logic',
        description: 'Authentication business logic',
        taskIds: ['task-3', 'task-4'],
      },
    ],
    tasks: [
      {
        id: 'task-1',
        name: 'Create login form',
        description: 'Build login form component',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 20,
        dependsOn: [],
        testCriteria: ['Form renders'],
        files: ['src/LoginForm.tsx'],
      },
      {
        id: 'task-2',
        name: 'Style login form',
        description: 'Add CSS to login form',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 10,
        dependsOn: ['task-1'],
        testCriteria: ['Styles applied'],
        files: ['src/LoginForm.css'],
      },
      {
        id: 'task-3',
        name: 'Implement auth service',
        description: 'Create authentication service',
        type: 'tdd',
        size: 'small',
        estimatedMinutes: 25,
        dependsOn: [],
        testCriteria: ['Auth works'],
        files: ['src/auth.ts'],
      },
      {
        id: 'task-4',
        name: 'Connect form to auth',
        description: 'Wire up form to auth service',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: ['task-1', 'task-3'],
        testCriteria: ['Integration works'],
        files: ['src/LoginForm.tsx'],
      },
    ],
  };

  return {
    content: JSON.stringify(result),
    usage: { inputTokens: 200, outputTokens: 400, totalTokens: 600 },
    finishReason: 'stop',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TaskDecomposer', () => {
  describe('decompose()', () => {
    it('should create tasks from a simple feature', async () => {
      const llmClient = createMockLLMClient([
        createDecomposeResponse([
          { name: 'Create component', estimatedMinutes: 15 },
          { name: 'Add styles', estimatedMinutes: 10 },
        ]),
      ]);

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature({ complexity: 'simple' });

      const tasks = await decomposer.decompose(feature);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].name).toBe('Create component');
      expect(tasks[1].name).toBe('Add styles');
    });

    it('should break complex feature into SubFeatures first', async () => {
      const llmClient = createMockLLMClient([createComplexDecomposeResponse()]);

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature({ complexity: 'complex' });

      const tasks = await decomposer.decompose(feature);

      expect(tasks).toHaveLength(4);
      // Should have tasks from both subfeatures
      expect(tasks.some(t => t.name === 'Create login form')).toBe(true);
      expect(tasks.some(t => t.name === 'Implement auth service')).toBe(true);
    });

    it('should ensure all generated tasks have timeEstimate <= 30 minutes', async () => {
      const llmClient = createMockLLMClient([
        createDecomposeResponse([
          { name: 'Task 1', estimatedMinutes: 20 },
          { name: 'Task 2', estimatedMinutes: 25 },
          { name: 'Task 3', estimatedMinutes: 30 },
        ]),
      ]);

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature();

      const tasks = await decomposer.decompose(feature);

      for (const task of tasks) {
        expect(task.estimatedMinutes).toBeLessThanOrEqual(30);
      }
    });

    it('should auto-split tasks that exceed 30-minute limit', async () => {
      // LLM returns a task that's too large
      const oversizedResponse: LLMResponse = {
        content: JSON.stringify({
          tasks: [
            {
              id: 'task-1',
              name: 'Large task',
              description: 'A task that needs splitting',
              type: 'auto',
              size: 'small',
              estimatedMinutes: 45, // Over the limit
              dependsOn: [],
              testCriteria: ['Test 1', 'Test 2'],
              files: ['src/big.ts'],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      };

      // Split response
      const splitResponse: LLMResponse = {
        content: JSON.stringify({
          tasks: [
            {
              id: 'task-1a',
              name: 'Large task - Part 1',
              description: 'First part',
              type: 'auto',
              size: 'atomic',
              estimatedMinutes: 20,
              dependsOn: [],
              parentTaskId: 'task-1',
              testCriteria: ['Test 1'],
              files: ['src/big.ts'],
            },
            {
              id: 'task-1b',
              name: 'Large task - Part 2',
              description: 'Second part',
              type: 'auto',
              size: 'atomic',
              estimatedMinutes: 20,
              dependsOn: ['task-1a'],
              parentTaskId: 'task-1',
              testCriteria: ['Test 2'],
              files: ['src/big.ts'],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      };

      const llmClient = createMockLLMClient([oversizedResponse, splitResponse]);
      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature();

      const tasks = await decomposer.decompose(feature);

      // Should have split the task
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      for (const task of tasks) {
        expect(task.estimatedMinutes).toBeLessThanOrEqual(30);
      }
    });

    it('should return empty task list for empty feature', async () => {
      const llmClient = createMockLLMClient([
        {
          content: JSON.stringify({ tasks: [] }),
          usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
          finishReason: 'stop',
        },
      ]);

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature({
        name: '',
        description: '',
      });

      const tasks = await decomposer.decompose(feature);

      expect(tasks).toHaveLength(0);
    });

    it('should handle LLM errors gracefully', async () => {
      const llmClient: LLMClient = {
        chat: vi.fn().mockRejectedValue(new Error('API Error')),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature();

      await expect(decomposer.decompose(feature)).rejects.toThrow('Failed to decompose feature');
    });

    it('should preserve dependencies between tasks', async () => {
      const llmClient = createMockLLMClient([
        createDecomposeResponse([
          { id: 'task-1', name: 'Base task', dependsOn: [] },
          { id: 'task-2', name: 'Dependent task', dependsOn: ['task-1'] },
          { id: 'task-3', name: 'Another dependent', dependsOn: ['task-1', 'task-2'] },
        ]),
      ]);

      const decomposer = new TaskDecomposer({ llmClient });
      const feature = createMockFeature();

      const tasks = await decomposer.decompose(feature);

      expect(tasks[1].dependsOn).toContain('task-1');
      expect(tasks[2].dependsOn).toContain('task-1');
      expect(tasks[2].dependsOn).toContain('task-2');
    });
  });

  describe('decomposeSubFeature()', () => {
    it('should decompose a sub-feature into tasks', async () => {
      const llmClient = createMockLLMClient([
        createDecomposeResponse([
          { name: 'SubFeature Task 1', estimatedMinutes: 15 },
          { name: 'SubFeature Task 2', estimatedMinutes: 20 },
        ]),
      ]);

      const decomposer = new TaskDecomposer({ llmClient });
      const subFeature = createMockSubFeature();

      const tasks = await decomposer.decomposeSubFeature(subFeature);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].name).toBe('SubFeature Task 1');
    });
  });

  describe('validateTaskSize()', () => {
    it('should reject task with 45-minute estimate as too_large', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 45 });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe('too_large');
      expect(result.issues[0].suggestion).toBeDefined();
    });

    it('should accept task with 25-minute estimate', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 25 });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should accept task with exactly 30-minute estimate', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 30 });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(true);
    });

    it('should reject task without test criteria', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({
        testCriteria: [],
        estimatedMinutes: 15,
      });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'no_test_criteria')).toBe(true);
    });

    it('should reject task without clear scope (no files)', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({
        files: [],
        estimatedMinutes: 15,
      });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'no_scope')).toBe(true);
    });

    it('should reject task with too many files (multi-concern)', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({
        files: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
        estimatedMinutes: 15,
      });
      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'multi_concern')).toBe(true);
    });
  });

  describe('splitTask()', () => {
    it('should divide 60-min task into two ~30-min tasks', async () => {
      const splitResponse: LLMResponse = {
        content: JSON.stringify({
          tasks: [
            {
              id: 'task-1a',
              name: 'Original - Part 1',
              description: 'First half',
              type: 'auto',
              size: 'small',
              estimatedMinutes: 30,
              dependsOn: [],
              parentTaskId: 'task-1',
              testCriteria: ['Part 1 tests'],
              files: ['src/file.ts'],
            },
            {
              id: 'task-1b',
              name: 'Original - Part 2',
              description: 'Second half',
              type: 'auto',
              size: 'small',
              estimatedMinutes: 30,
              dependsOn: ['task-1a'],
              parentTaskId: 'task-1',
              testCriteria: ['Part 2 tests'],
              files: ['src/file.ts'],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      };

      const llmClient = createMockLLMClient([splitResponse]);
      const decomposer = new TaskDecomposer({ llmClient });

      const oversizedTask = createMockTask({
        id: 'task-1',
        name: 'Original task',
        estimatedMinutes: 60,
      });

      const splitTasks = await decomposer.splitTask(oversizedTask);

      expect(splitTasks).toHaveLength(2);
      expect(splitTasks[0].estimatedMinutes).toBeLessThanOrEqual(30);
      expect(splitTasks[1].estimatedMinutes).toBeLessThanOrEqual(30);
    });

    it('should preserve dependency chain after split', async () => {
      const splitResponse: LLMResponse = {
        content: JSON.stringify({
          tasks: [
            {
              id: 'task-1a',
              name: 'Part 1',
              description: 'First',
              type: 'auto',
              size: 'atomic',
              estimatedMinutes: 25,
              dependsOn: [],
              parentTaskId: 'task-1',
              testCriteria: ['Test 1'],
              files: ['src/a.ts'],
            },
            {
              id: 'task-1b',
              name: 'Part 2',
              description: 'Second',
              type: 'auto',
              size: 'atomic',
              estimatedMinutes: 25,
              dependsOn: ['task-1a'],
              parentTaskId: 'task-1',
              testCriteria: ['Test 2'],
              files: ['src/a.ts'],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      };

      const llmClient = createMockLLMClient([splitResponse]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ id: 'task-1', estimatedMinutes: 50 });
      const splitTasks = await decomposer.splitTask(task);

      // Second task should depend on first
      expect(splitTasks[1].dependsOn).toContain('task-1a');
      // Both should reference parent
      expect(splitTasks[0].parentTaskId).toBe('task-1');
      expect(splitTasks[1].parentTaskId).toBe('task-1');
    });

    it('should handle LLM errors during split', async () => {
      const llmClient: LLMClient = {
        chat: vi.fn().mockRejectedValue(new Error('Split failed')),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };

      const decomposer = new TaskDecomposer({ llmClient });
      const task = createMockTask({ estimatedMinutes: 60 });

      await expect(decomposer.splitTask(task)).rejects.toThrow('Failed to split task');
    });
  });

  describe('estimateTime()', () => {
    it('should return task estimatedMinutes', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 20 });
      const estimate = decomposer.estimateTime(task);

      expect(estimate).toBe(20);
    });

    it('should cap estimates at 30 minutes', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 50 });
      const estimate = decomposer.estimateTime(task);

      expect(estimate).toBe(30);
    });

    it('should enforce minimum of 5 minutes', () => {
      const llmClient = createMockLLMClient([]);
      const decomposer = new TaskDecomposer({ llmClient });

      const task = createMockTask({ estimatedMinutes: 2 });
      const estimate = decomposer.estimateTime(task);

      expect(estimate).toBe(5);
    });
  });
});
