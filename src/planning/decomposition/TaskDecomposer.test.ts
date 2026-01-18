/**
 * TaskDecomposer Tests
 *
 * Tests for the task decomposition system that breaks features
 * into atomic, 30-minute-or-less tasks using Claude.
 *
 * Phase 14B: Execution Bindings Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskDecomposer, createTaskDecomposer } from './TaskDecomposer';
import type { PlanningTask } from '../types';

// ============================================================================
// Mocks
// ============================================================================

// Mock ClaudeClient
const mockClaudeClient = {
  chat: vi.fn(),
  chatStream: vi.fn(),
  countTokens: vi.fn().mockReturnValue(100),
};

// ============================================================================
// Test Data
// ============================================================================

const validDecompositionResponse = JSON.stringify([
  {
    name: 'Define types',
    description: 'Create TypeScript interfaces for the feature',
    files: ['src/types.ts'],
    testCriteria: ['Types compile without errors', 'Exports are correct'],
    dependsOn: [],
    estimatedMinutes: 15,
  },
  {
    name: 'Implement core logic',
    description: 'Implement the main business logic',
    files: ['src/core.ts'],
    testCriteria: ['Unit tests pass', 'Edge cases handled'],
    dependsOn: ['Define types'],
    estimatedMinutes: 25,
  },
  {
    name: 'Add API endpoint',
    description: 'Create REST endpoint for the feature',
    files: ['src/api/routes.ts', 'src/api/handlers.ts'],
    testCriteria: ['Endpoint responds correctly', 'Error handling works'],
    dependsOn: ['Implement core logic'],
    estimatedMinutes: 20,
  },
]);

const oversizedTaskResponse = JSON.stringify([
  {
    name: 'Big refactor task',
    description: 'Refactor the entire codebase structure',
    files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'src/e.ts', 'src/f.ts'],
    testCriteria: ['All tests pass'],
    dependsOn: [],
    estimatedMinutes: 60, // Too large!
  },
]);

const splitTasksResponse = JSON.stringify([
  {
    name: 'Refactor part 1',
    description: 'Refactor first module',
    files: ['src/a.ts', 'src/b.ts'],
    testCriteria: ['Tests pass'],
    dependsOn: [],
    estimatedMinutes: 25,
  },
  {
    name: 'Refactor part 2',
    description: 'Refactor second module',
    files: ['src/c.ts', 'src/d.ts'],
    testCriteria: ['Tests pass'],
    dependsOn: ['Refactor part 1'],
    estimatedMinutes: 25,
  },
]);

// ============================================================================
// Tests
// ============================================================================

describe('TaskDecomposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      expect(decomposer).toBeInstanceOf(TaskDecomposer);
    });

    it('should accept custom config', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any, {
        maxTaskMinutes: 20,
        maxFilesPerTask: 3,
        verbose: true,
      });
      expect(decomposer).toBeInstanceOf(TaskDecomposer);
    });
  });

  describe('decompose', () => {
    it('should decompose feature into tasks', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose(
        'Implement user authentication feature'
      );

      expect(tasks).toHaveLength(3);
      expect(tasks[0].name).toBe('Define types');
      expect(tasks[1].name).toBe('Implement core logic');
      expect(tasks[2].name).toBe('Add API endpoint');
    });

    it('should call Claude with correct system prompt', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      await decomposer.decompose('Test feature');

      // System prompt is now passed as a message with role 'system'
      expect(mockClaudeClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('30-MINUTE RULE'),
          }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          maxTokens: 4000,
        })
      );
    });

    it('should assign unique IDs to each task', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose('Test feature');

      const ids = tasks.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should resolve task name dependencies to IDs', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose('Test feature');

      // Second task depends on first task
      const firstTask = tasks.find((t) => t.name === 'Define types');
      const secondTask = tasks.find((t) => t.name === 'Implement core logic');

      expect(firstTask).toBeDefined();
      expect(secondTask).toBeDefined();
      expect(secondTask!.dependsOn).toContain(firstTask!.id);
    });

    it('should handle JSON in markdown code blocks', async () => {
      const markdownResponse = '```json\n' + validDecompositionResponse + '\n```';
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: markdownResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose('Test feature');

      expect(tasks).toHaveLength(3);
    });

    it('should include context files in prompt when provided', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      await decomposer.decompose('Test feature', {
        contextFiles: ['src/existing.ts', 'src/related.ts'],
      });

      expect(mockClaudeClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('src/existing.ts'),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should request TDD approach when useTDD option is set', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: validDecompositionResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose('Test feature', { useTDD: true });

      expect(tasks[0].type).toBe('tdd');
    });

    it('should throw on invalid JSON response', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: 'This is not valid JSON at all',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);

      await expect(decomposer.decompose('Test feature')).rejects.toThrow(
        'Failed to parse decomposition response'
      );
    });

    it('should split oversized tasks automatically', async () => {
      // First call returns oversized task
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: oversizedTaskResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });
      // Second call (split) returns smaller tasks
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: splitTasksResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const tasks = await decomposer.decompose('Test feature');

      // Should have called Claude twice (decompose + split)
      expect(mockClaudeClient.chat).toHaveBeenCalledTimes(2);
      // Should have the split tasks
      expect(tasks.every((t) => t.estimatedMinutes <= 30)).toBe(true);
    });
  });

  describe('validateTaskSize', () => {
    it('should return valid for tasks under 30 minutes', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: '123',
        name: 'Small task',
        description: 'A small task that takes little time',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 15,
        dependsOn: [],
        testCriteria: ['Test 1'],
        files: ['src/file.ts'],
      };

      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for tasks over 30 minutes', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: '123',
        name: 'Big task',
        description: 'A big task',
        type: 'auto',
        size: 'large',
        estimatedMinutes: 45,
        dependsOn: [],
        testCriteria: ['Test 1'],
        files: ['src/file.ts'],
      };

      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds 30-minute limit'))).toBe(true);
    });

    it('should return invalid for tasks with too many files', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: '123',
        name: 'Many files task',
        description: 'A task with many files',
        type: 'auto',
        size: 'medium',
        estimatedMinutes: 25,
        dependsOn: [],
        testCriteria: ['Test 1'],
        files: ['1.ts', '2.ts', '3.ts', '4.ts', '5.ts', '6.ts', '7.ts'],
      };

      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too many files'))).toBe(true);
    });

    it('should warn for tasks without test criteria', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: '123',
        name: 'No tests task',
        description: 'A task without test criteria',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 10,
        dependsOn: [],
        testCriteria: [],
        files: ['src/file.ts'],
      };

      const result = decomposer.validateTaskSize(task);

      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.includes('no test criteria'))).toBe(true);
    });
  });

  describe('splitTask', () => {
    it('should split oversized task into smaller tasks', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: splitTasksResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const oversizedTask: PlanningTask = {
        id: 'oversized-123',
        name: 'Big refactor',
        description: 'Refactor everything',
        type: 'auto',
        size: 'large',
        estimatedMinutes: 60,
        dependsOn: [],
        testCriteria: ['Tests pass'],
        files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
      };

      const splitTasks = await decomposer.splitTask(oversizedTask);

      expect(splitTasks.length).toBeGreaterThan(1);
      expect(splitTasks.every((t) => t.estimatedMinutes <= 30)).toBe(true);
    });

    it('should include original task info in split prompt', async () => {
      mockClaudeClient.chat.mockResolvedValueOnce({
        content: splitTasksResponse,
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: 'task-123',
        name: 'Original task name',
        description: 'Original description here',
        type: 'auto',
        size: 'large',
        estimatedMinutes: 50,
        dependsOn: [],
        testCriteria: ['Criterion 1'],
        files: ['file1.ts', 'file2.ts'],
      };

      await decomposer.splitTask(task);

      expect(mockClaudeClient.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Original task name'),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('estimateTime', () => {
    it('should estimate based on file count', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const task: PlanningTask = {
        id: '123',
        name: 'Task',
        description: 'A task',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 0, // Will be recalculated
        dependsOn: [],
        testCriteria: [],
        files: ['a.ts', 'b.ts', 'c.ts'],
      };

      const estimate = decomposer.estimateTime(task);

      // Base (10) + files (3 * 5) = 25, after adjustments
      expect(estimate).toBeGreaterThan(15);
      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should cap estimate at max minutes', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any, {
        maxTaskMinutes: 30,
      });
      const task: PlanningTask = {
        id: '123',
        name: 'Complex algorithm with many considerations',
        description:
          'A very complex task with many files and lots of description words that should take a long time to complete and requires extensive testing and validation of all edge cases',
        type: 'auto',
        size: 'large',
        estimatedMinutes: 0,
        dependsOn: [],
        testCriteria: ['Test 1', 'Test 2', 'Test 3', 'Test 4', 'Test 5'],
        files: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
      };

      const estimate = decomposer.estimateTime(task);

      expect(estimate).toBeLessThanOrEqual(30);
    });

    it('should reduce estimate for simple tasks', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const simpleTask: PlanningTask = {
        id: '123',
        name: 'Rename variable',
        description: 'Simple rename of a variable',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 0,
        dependsOn: [],
        testCriteria: [],
        files: ['src/file.ts'],
      };

      const estimate = decomposer.estimateTime(simpleTask);

      // Should be low due to 'simple' and 'rename' keywords
      expect(estimate).toBeLessThan(15);
    });

    it('should increase estimate for complex tasks', () => {
      const decomposer = new TaskDecomposer(mockClaudeClient as any);
      const complexTask: PlanningTask = {
        id: '123',
        name: 'Implement authentication with encryption',
        description:
          'Complex security integration with encrypted tokens and parallel processing',
        type: 'auto',
        size: 'medium',
        estimatedMinutes: 0,
        dependsOn: [],
        testCriteria: ['Security tests pass'],
        files: ['src/auth.ts', 'src/crypto.ts'],
      };

      const estimate = decomposer.estimateTime(complexTask);

      // Should be higher due to complexity keywords
      expect(estimate).toBeGreaterThanOrEqual(20);
    });
  });

  describe('createTaskDecomposer', () => {
    it('should create TaskDecomposer instance', () => {
      const decomposer = createTaskDecomposer(mockClaudeClient as any);
      expect(decomposer).toBeInstanceOf(TaskDecomposer);
    });

    it('should pass config to instance', () => {
      const decomposer = createTaskDecomposer(mockClaudeClient as any, {
        maxTaskMinutes: 20,
      });
      expect(decomposer).toBeInstanceOf(TaskDecomposer);
    });
  });
});
