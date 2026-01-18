/**
 * BaseAgentRunner Tests
 *
 * Phase 14B Task 12: Tests for the abstract base agent runner class.
 * We test through a concrete implementation (TestAgent).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BaseAgentRunner,
  AgentContext,
  AgentConfig,
  AgentTaskResult,
} from './BaseAgentRunner';
import type { AgentType } from '../../types/agent';
import type { Task } from '../../types/task';
import { EventBus } from '../../orchestration/events/EventBus';

// ============================================================================
// Mock LLM Client
// ============================================================================

interface MockLLMClient {
  chat: ReturnType<typeof vi.fn>;
}

function createMockLLMClient(): MockLLMClient {
  return {
    chat: vi.fn(),
  };
}

// ============================================================================
// Concrete Test Implementation
// ============================================================================

/**
 * Concrete implementation for testing the abstract BaseAgentRunner
 */
class TestAgent extends BaseAgentRunner {
  private systemPrompt: string;
  private completionCheck: (response: string) => boolean;

  constructor(
    llmClient: MockLLMClient,
    config?: AgentConfig,
    options?: {
      systemPrompt?: string;
      completionCheck?: (response: string) => boolean;
    }
  ) {
    super(llmClient as unknown as BaseAgentRunner['llmClient'], config);
    this.systemPrompt = options?.systemPrompt ?? 'You are a test agent.';
    this.completionCheck =
      options?.completionCheck ??
      ((response) => response.includes('[TASK_COMPLETE]'));
  }

  getAgentType(): AgentType {
    return 'coder';
  }

  async execute(task: Task, context: AgentContext): Promise<AgentTaskResult> {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }

  protected getSystemPrompt(): string {
    return this.systemPrompt;
  }

  protected buildTaskPrompt(task: Task, context: AgentContext): string {
    return `Task: ${task.name}\nDescription: ${task.description}\n${this.buildContextSection(context)}`;
  }

  protected isTaskComplete(response: string, _task: Task): boolean {
    return this.completionCheck(response);
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-123',
    name: 'Test Task',
    description: 'A test task description',
    type: 'auto',
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-123',
    featureId: 'feature-456',
    projectId: 'project-789',
    workingDir: '/test/working/dir',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseAgentRunner', () => {
  let mockClient: MockLLMClient;

  beforeEach(() => {
    mockClient = createMockLLMClient();
    EventBus.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.resetInstance();
  });

  describe('constructor', () => {
    it('should use default config values when not provided', () => {
      const agent = new TestAgent(mockClient);
      // The config is private, but we can verify behavior indirectly
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('coder');
    });

    it('should use provided config values', () => {
      const config: AgentConfig = {
        maxIterations: 10,
        timeout: 60000,
      };
      const agent = new TestAgent(mockClient, config);
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentType', () => {
    it('should return the agent type', () => {
      const agent = new TestAgent(mockClient);
      expect(agent.getAgentType()).toBe('coder');
    });
  });

  describe('execute', () => {
    it('should complete task when LLM returns completion marker', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: 'I have completed the task. [TASK_COMPLETE]',
        usage: { totalTokens: 100 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.escalated).toBe(false);
      expect(result.iterations).toBe(1);
      expect(result.output).toContain('[TASK_COMPLETE]');
    });

    it('should continue iteration when task not complete', async () => {
      mockClient.chat
        .mockResolvedValueOnce({
          content: 'Working on it...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Still working...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Done! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(mockClient.chat).toHaveBeenCalledTimes(3);
    });

    it('should escalate when max iterations reached', async () => {
      // Always return incomplete response
      mockClient.chat.mockResolvedValue({
        content: 'Still working...',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient, { maxIterations: 3 });
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.reason).toContain('Maximum iterations');
      expect(result.iterations).toBe(3);
    });

    it('should escalate when timeout reached', async () => {
      // Mock a slow response that will cause timeout
      // We need to actually wait for the timeout to trigger
      mockClient.chat.mockImplementation(async () => {
        // Wait longer than the timeout
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          content: 'Still working...',
          usage: { totalTokens: 50 },
        };
      });

      // Use a very short timeout (shorter than the mock delay)
      const agent = new TestAgent(mockClient, {
        timeout: 10, // 10ms timeout
        maxIterations: 100,
      });
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      // Should timeout after first iteration
      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.reason).toContain('timed out');
    });

    it('should handle LLM errors and retry', async () => {
      mockClient.chat
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: 'Recovered and completed! [TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildContextSection', () => {
    it('should include working directory', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext({
        workingDir: '/my/project/path',
      });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      // First message (index 0) is system prompt, index 1 is user message with task
      expect(callArgs[1].content).toContain('/my/project/path');
    });

    it('should include relevant files when provided', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext({
        relevantFiles: ['src/index.ts', 'src/utils.ts'],
      });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      // First message (index 0) is system prompt, index 1 is user message with task
      expect(callArgs[1].content).toContain('src/index.ts');
      expect(callArgs[1].content).toContain('src/utils.ts');
    });

    it('should include previous attempts when provided', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext({
        previousAttempts: ['First attempt failed due to syntax error'],
      });

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      // First message (index 0) is system prompt, index 1 is user message with task
      expect(callArgs[1].content).toContain('Previous Attempts');
      expect(callArgs[1].content).toContain('First attempt failed');
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

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      // Check that events were emitted
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

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      // Should have called handler for completion event
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('custom completion check', () => {
    it('should use custom completion check', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: 'DONE',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient, undefined, {
        completionCheck: (response) => response.includes('DONE'),
      });
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });
  });

  describe('result metrics', () => {
    it('should include token usage in result', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 150 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.tokensUsed).toBe(150);
    });

    it('should track duration in result', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.timeMs).toBeDefined();
    });

    it('should track iteration count in result', async () => {
      mockClient.chat
        .mockResolvedValueOnce({
          content: 'Working...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: '[TASK_COMPLETE]',
          usage: { totalTokens: 50 },
        });

      const agent = new TestAgent(mockClient);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.iterations).toBe(2);
      expect(result.metrics?.iterations).toBe(2);
    });
  });
});
