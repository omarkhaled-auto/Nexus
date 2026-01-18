/**
 * CoderAgent Tests
 *
 * Phase 14B Task 13: Tests for the CoderAgent implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoderAgent } from './CoderAgent';
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
    id: 'task-coder-123',
    name: 'Implement User Authentication',
    description: 'Add JWT-based authentication to the API endpoints',
    type: 'auto',
    status: 'pending',
    createdAt: new Date(),
    files: ['src/auth/jwt.ts', 'src/middleware/auth.ts'],
    testCriteria: [
      'JWT tokens are properly generated',
      'Tokens expire after 24 hours',
      'Invalid tokens return 401 status',
    ],
    estimatedMinutes: 30,
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-coder-123',
    featureId: 'feature-auth-456',
    projectId: 'project-789',
    workingDir: '/test/project',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CoderAgent', () => {
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
      const agent = new CoderAgent(mockClient as unknown as Parameters<typeof CoderAgent['prototype']['execute']>[0]['assignedAgentId'] extends string ? never : Parameters<typeof CoderAgent['prototype']['constructor']>[0]);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('coder');
    });

    it('should create agent with custom config', () => {
      const agent = new CoderAgent(mockClient as unknown as any, {
        maxIterations: 20,
        timeout: 60000,
      });
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentType', () => {
    it('should return "coder"', () => {
      const agent = new CoderAgent(mockClient as unknown as any);
      expect(agent.getAgentType()).toBe('coder');
    });
  });

  describe('execute', () => {
    it('should complete task when LLM returns [TASK_COMPLETE]', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
### File: src/auth/jwt.ts
\`\`\`typescript
export function generateToken(userId: string): string {
  // Implementation
  return 'token';
}
\`\`\`

[TASK_COMPLETE]
Summary: Implemented JWT token generation.
        `,
        usage: { totalTokens: 200 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.escalated).toBe(false);
      expect(result.output).toContain('[TASK_COMPLETE]');
    });

    it('should complete task when LLM says "implementation complete"', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
I have finished implementing the JWT authentication.
The implementation is complete and all files have been created.
        `,
        usage: { totalTokens: 150 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should complete task when LLM says "task completed successfully"', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
All changes have been made. The task completed successfully.
        `,
        usage: { totalTokens: 100 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should iterate until completion', async () => {
      mockClient.chat
        .mockResolvedValueOnce({
          content: 'Working on the JWT implementation...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Adding the middleware...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Done! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(mockClient.chat).toHaveBeenCalledTimes(3);
    });

    it('should escalate when max iterations reached', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still working on implementation...',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any, { maxIterations: 3 });
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

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask({ name: 'Custom Task Name' });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      // System prompt at index 0, user message at index 1
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Custom Task Name');
    });

    it('should include task description in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask({ description: 'Build a REST API for users' });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Build a REST API for users');
    });

    it('should include files to modify in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask({
        files: ['src/controllers/user.ts', 'src/models/user.ts'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/controllers/user.ts');
      expect(userMessage.content).toContain('src/models/user.ts');
    });

    it('should include acceptance criteria in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask({
        testCriteria: ['All tests pass', 'No lint errors'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('All tests pass');
      expect(userMessage.content).toContain('No lint errors');
    });

    it('should include working directory in context', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext({ workingDir: '/custom/project/path' });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('/custom/project/path');
    });

    it('should include relevant files in context', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext({
        relevantFiles: ['src/existing/code.ts', 'src/utils/helpers.ts'],
      });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/existing/code.ts');
      expect(userMessage.content).toContain('src/utils/helpers.ts');
    });

    it('should include dependencies in prompt when present', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask({
        dependencies: ['task-1', 'task-2'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('task-1');
      expect(userMessage.content).toContain('task-2');
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockResolvedValueOnce({
          content: 'Recovered! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('system prompt', () => {
    it('should include coding guidelines in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('clean');
      expect(systemMessage.content).toContain('maintainable');
      expect(systemMessage.content).toContain('error handling');
    });

    it('should include output format instructions in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage.content).toContain('### File:');
      expect(systemMessage.content).toContain('[TASK_COMPLETE]');
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

      const agent = new CoderAgent(mockClient as unknown as any);
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

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit task:escalated event on max iterations', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still working...',
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('task:escalated', handler);

      const agent = new CoderAgent(mockClient as unknown as any, { maxIterations: 2 });
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

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.iterations).toBe(2);
      expect(result.metrics?.iterations).toBe(2);
    });

    it('should track token usage', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 250 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.metrics?.tokensUsed).toBe(250);
    });

    it('should track duration', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new CoderAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
