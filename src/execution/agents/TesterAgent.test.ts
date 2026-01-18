/**
 * TesterAgent Tests
 *
 * Phase 14B Task 14: Tests for the TesterAgent implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TesterAgent } from './TesterAgent';
import type { AgentContext } from './BaseAgentRunner';
import type { Task } from '../../types/task';
import { EventBus } from '../../orchestration/events/EventBus';

// ============================================================================
// Mock LLM Client
// ============================================================================

interface MockLLMClient {
  chat: ReturnType<typeof vi.fn>;
}

function createMockClaudeClient(): MockLLMClient {
  return {
    chat: vi.fn(),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-tester-123',
    name: 'Write Tests for UserService',
    description: 'Create comprehensive unit tests for the UserService class',
    type: 'auto',
    status: 'pending',
    createdAt: new Date(),
    files: ['src/services/UserService.ts'],
    testCriteria: [
      'Test user creation with valid data',
      'Test user creation with invalid data',
      'Test user retrieval by ID',
      'Test error handling for missing users',
    ],
    estimatedMinutes: 20,
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-tester-123',
    featureId: 'feature-user-456',
    projectId: 'project-789',
    workingDir: '/test/project',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TesterAgent', () => {
  let mockClient: MockLLMClient;

  beforeEach(() => {
    mockClient = createMockClaudeClient();
    EventBus.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.resetInstance();
  });

  describe('constructor', () => {
    it('should create agent with default config', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('tester');
    });

    it('should create agent with custom config', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any, {
        maxIterations: 20,
        timeout: 60000,
      });
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentType', () => {
    it('should return "tester"', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      expect(agent.getAgentType()).toBe('tester');
    });
  });

  describe('execute', () => {
    it('should complete task when LLM returns [TASK_COMPLETE]', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
### File: src/services/UserService.test.ts
\`\`\`typescript
describe('UserService', () => {
  it('should create user with valid data', () => {
    // test implementation
  });
});
\`\`\`

[TASK_COMPLETE]
Summary: Created comprehensive test suite with 10 test cases.
        `,
        usage: { totalTokens: 300 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.escalated).toBe(false);
      expect(result.output).toContain('[TASK_COMPLETE]');
    });

    it('should complete task when LLM says "tests complete"', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
All unit tests have been written. The tests complete the coverage requirements.
        `,
        usage: { totalTokens: 150 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should complete task when LLM says "test suite is complete"', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
I have finished writing all the tests. The test suite is complete.
        `,
        usage: { totalTokens: 100 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should iterate until completion', async () => {
      mockClient.chat
        .mockResolvedValueOnce({
          content: 'Writing unit tests for UserService...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Adding edge case tests...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Done! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(mockClient.chat).toHaveBeenCalledTimes(3);
    });

    it('should escalate when max iterations reached', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still writing more tests...',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any, { maxIterations: 3 });
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.reason).toContain('Maximum iterations');
    });

    it('should include task name in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({ name: 'Write Integration Tests' });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Write Integration Tests');
    });

    it('should include files to test in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({
        files: ['src/controllers/UserController.ts', 'src/models/User.ts'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/controllers/UserController.ts');
      expect(userMessage.content).toContain('src/models/User.ts');
    });

    it('should suggest test file names in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({
        files: ['src/services/AuthService.ts'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/services/AuthService.test.ts');
    });

    it('should include test requirements in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({
        testCriteria: ['Cover edge cases', 'Test error scenarios'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Cover edge cases');
      expect(userMessage.content).toContain('Test error scenarios');
    });

    it('should include working directory in context', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext({ workingDir: '/custom/test/path' });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('/custom/test/path');
    });

    it('should include relevant files in context', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext({
        relevantFiles: ['src/existing/test.utils.ts', 'src/fixtures/userData.ts'],
      });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/existing/test.utils.ts');
      expect(userMessage.content).toContain('src/fixtures/userData.ts');
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockResolvedValueOnce({
          content: 'Recovered! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('system prompt', () => {
    it('should include testing guidelines in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('edge cases');
      expect(systemMessage.content).toContain('coverage');
      expect(systemMessage.content).toContain('Mock');
    });

    it('should include AAA pattern guidance in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage.content).toContain('AAA pattern');
      expect(systemMessage.content).toContain('Arrange');
      expect(systemMessage.content).toContain('Assert');
    });

    it('should include test categories in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage.content).toContain('Unit Tests');
      expect(systemMessage.content).toContain('Integration Tests');
      expect(systemMessage.content).toContain('Error Handling');
    });
  });

  describe('event emission', () => {
    it('should emit agent:started event', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('agent:started', handler);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit task:completed event on success', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('task:completed', handler);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit task:escalated event on max iterations', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still writing tests...',
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('task:escalated', handler);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any, { maxIterations: 2 });
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('result metrics', () => {
    it('should track iteration count', async () => {
      mockClient.chat
        .mockResolvedValueOnce({ content: 'Working...', usage: { totalTokens: 50 } })
        .mockResolvedValueOnce({ content: '[TASK_COMPLETE]', usage: { totalTokens: 50 } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.iterations).toBe(2);
      expect(result.metrics?.iterations).toBe(2);
    });

    it('should track token usage', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 350 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.metrics?.tokensUsed).toBe(350);
    });

    it('should track duration', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('test file name suggestions', () => {
    it('should suggest .test.ts for .ts files', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({ files: ['src/utils/helper.ts'] });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/utils/helper.test.ts');
    });

    it('should suggest .test.tsx for .tsx files', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({ files: ['src/components/Button.tsx'] });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/components/Button.test.tsx');
    });

    it('should suggest .test.js for .js files', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new TesterAgent(mockClient as unknown as any);
      const task = createTestTask({ files: ['src/legacy/module.js'] });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/legacy/module.test.js');
    });
  });
});
