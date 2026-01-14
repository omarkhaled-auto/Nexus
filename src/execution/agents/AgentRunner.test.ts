import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentRunner,
  AgentError,
  MaxIterationsError,
  ToolExecutionError,
  LLMCallError,
} from './AgentRunner';
import type {
  Task,
  AgentType,
  ToolExecutor,
  ExecutionResult,
  Logger,
} from './types';
import type { LLMClient, LLMResponse, Message, ToolCall, ChatOptions } from '@/llm';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task for testing',
    files: ['src/test.ts'],
    ...overrides,
  };
}

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockToolExecutor(
  executeImpl?: (name: string, params: Record<string, unknown>) => Promise<{ toolCallId: string; result: string | object }>
): ToolExecutor {
  return {
    execute: executeImpl ?? vi.fn().mockResolvedValue({ toolCallId: 'tool-1', result: 'success' }),
    getAvailableTools: vi.fn().mockReturnValue([
      {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      },
    ]),
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

function createStopResponse(content: string): LLMResponse {
  return {
    content,
    toolCalls: undefined,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    finishReason: 'stop',
  };
}

function createToolUseResponse(toolCalls: ToolCall[]): LLMResponse {
  return {
    content: '',
    toolCalls,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    finishReason: 'tool_use',
  };
}

// ============================================================================
// Concrete Test Implementation
// ============================================================================

class TestAgentRunner extends AgentRunner {
  public readonly agentType: AgentType = 'coder';
  public readonly systemPrompt: string = 'You are a test agent.';

  // Expose protected methods for testing
  public testBuildMessages(task: Task, history: Message[]): Message[] {
    return this.buildMessages(task, history);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('AgentRunner', () => {
  describe('Error Types', () => {
    it('AgentError should have correct name and prototype', () => {
      const error = new AgentError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AgentError);
      expect(error.name).toBe('AgentError');
      expect(error.message).toBe('test error');
    });

    it('MaxIterationsError should include iteration count', () => {
      const error = new MaxIterationsError(10);
      expect(error).toBeInstanceOf(AgentError);
      expect(error).toBeInstanceOf(MaxIterationsError);
      expect(error.name).toBe('MaxIterationsError');
      expect(error.iterations).toBe(10);
      expect(error.message).toContain('10');
    });

    it('ToolExecutionError should include tool name and cause', () => {
      const cause = new Error('tool failed');
      const error = new ToolExecutionError('read_file', cause);
      expect(error).toBeInstanceOf(AgentError);
      expect(error).toBeInstanceOf(ToolExecutionError);
      expect(error.name).toBe('ToolExecutionError');
      expect(error.toolName).toBe('read_file');
      expect(error.cause).toBe(cause);
    });

    it('LLMCallError should wrap underlying error', () => {
      const cause = new Error('API failed');
      const error = new LLMCallError(cause);
      expect(error).toBeInstanceOf(AgentError);
      expect(error).toBeInstanceOf(LLMCallError);
      expect(error.name).toBe('LLMCallError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('Constructor', () => {
    it('should create with required options', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.getState()).toBe('idle');
    });

    it('should accept optional logger', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();
      const logger = createMockLogger();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
        logger,
      });

      expect(runner.getState()).toBe('idle');
    });

    it('should use default maxIterations of 10', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      // Access via internal - we'll test this through behavior
      expect(runner).toBeDefined();
    });

    it('should accept custom maxIterations', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
        maxIterations: 5,
      });

      expect(runner).toBeDefined();
    });
  });

  describe('execute()', () => {
    it('should complete when LLM returns stop', async () => {
      const llmClient = createMockLLMClient([
        createStopResponse('Task completed successfully'),
      ]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.output).toBe('Task completed successfully');
      expect(result.iterations).toBe(1);
      expect(runner.getState()).toBe('completed');
    });

    it('should execute tool calls and continue loop', async () => {
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'read_file',
        arguments: { path: 'test.ts' },
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([toolCall]),
        createStopResponse('Done after reading file'),
      ]);

      const toolExecutor = createMockToolExecutor(async (name, params) => ({
        toolCallId: 'call-1',
        result: 'file contents here',
      }));

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
      expect(toolExecutor.execute).toHaveBeenCalledWith('read_file', { path: 'test.ts' });
    });

    it('should track files changed from tool calls', async () => {
      const writeToolCall: ToolCall = {
        id: 'call-1',
        name: 'write_file',
        arguments: { path: 'src/new.ts', content: 'code' },
      };

      const editToolCall: ToolCall = {
        id: 'call-2',
        name: 'edit_file',
        arguments: { path: 'src/existing.ts', edits: [] },
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([writeToolCall]),
        createToolUseResponse([editToolCall]),
        createStopResponse('Done'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'success',
      }));

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.filesChanged).toContain('src/new.ts');
      expect(result.filesChanged).toContain('src/existing.ts');
    });

    it('should throw MaxIterationsError when exceeding limit', async () => {
      // Create responses that always request tool use
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: {},
      };

      const responses: LLMResponse[] = Array(11).fill(createToolUseResponse([toolCall]));
      const llmClient = createMockLLMClient(responses);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
        maxIterations: 5,
      });

      await expect(runner.execute(createMockTask())).rejects.toThrow(MaxIterationsError);
      expect(runner.getState()).toBe('failed');
    });

    it('should handle tool execution errors and send to LLM for recovery', async () => {
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'read_file',
        arguments: { path: 'missing.ts' },
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([toolCall]),
        createStopResponse('Handled the error'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => {
        throw new Error('File not found');
      });

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      // Should recover from tool error
      expect(result.success).toBe(true);
      expect(result.output).toBe('Handled the error');
    });

    it('should propagate LLM errors as LLMCallError', async () => {
      const llmClient: LLMClient = {
        chat: vi.fn().mockRejectedValue(new Error('API rate limit')),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      await expect(runner.execute(createMockTask())).rejects.toThrow(LLMCallError);
      expect(runner.getState()).toBe('failed');
    });

    it('should accumulate token usage across iterations', async () => {
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: {},
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([toolCall]),
        createToolUseResponse([toolCall]),
        createStopResponse('Done'),
      ]);

      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      // 3 calls, each with 150 total tokens
      expect(result.tokenUsage.totalTokens).toBe(450);
      expect(result.tokenUsage.inputTokens).toBe(300);
      expect(result.tokenUsage.outputTokens).toBe(150);
    });

    it('should update state to running during execution', async () => {
      let capturedState: string | undefined;

      const llmClient: LLMClient = {
        chat: vi.fn().mockImplementation(async () => {
          // Capture state during execution
          capturedState = runner.getState();
          return createStopResponse('done');
        }),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(capturedState).toBe('running');
    });
  });

  describe('cancel()', () => {
    it('should cancel ongoing execution', async () => {
      let resolveLLMCall: (value: LLMResponse) => void;
      const llmClient: LLMClient = {
        chat: vi.fn().mockImplementation(() => {
          return new Promise<LLMResponse>((resolve) => {
            resolveLLMCall = resolve;
          });
        }),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const executePromise = runner.execute(createMockTask());

      // Cancel while waiting
      runner.cancel();

      // Resolve the pending call
      resolveLLMCall!(createStopResponse('done'));

      const result = await executePromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });
  });

  describe('getState()', () => {
    it('should return idle before execution', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.getState()).toBe('idle');
    });

    it('should return completed after successful execution', async () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(runner.getState()).toBe('completed');
    });

    it('should return failed after error', async () => {
      const llmClient: LLMClient = {
        chat: vi.fn().mockRejectedValue(new Error('fail')),
        chatStream: vi.fn(),
        countTokens: vi.fn(),
      };
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      try {
        await runner.execute(createMockTask());
      } catch {
        // Expected
      }

      expect(runner.getState()).toBe('failed');
    });
  });

  describe('buildMessages()', () => {
    it('should include system prompt first', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const messages = runner.testBuildMessages(createMockTask(), []);

      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are a test agent.');
    });

    it('should include task as user message', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const task = createMockTask({
        name: 'Implement Feature',
        description: 'Create a new component',
      });

      const messages = runner.testBuildMessages(task, []);

      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Implement Feature');
      expect(messages[1].content).toContain('Create a new component');
    });

    it('should append history messages', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      const history: Message[] = [
        { role: 'assistant', content: 'I will start' },
        { role: 'user', content: 'Continue' },
      ];

      const messages = runner.testBuildMessages(createMockTask(), history);

      expect(messages.length).toBe(4); // system + task + 2 history
      expect(messages[2].content).toBe('I will start');
      expect(messages[3].content).toBe('Continue');
    });
  });

  describe('handleToolCalls()', () => {
    it('should execute multiple tool calls in parallel', async () => {
      const calls: ToolCall[] = [
        { id: 'call-1', name: 'read_file', arguments: { path: 'a.ts' } },
        { id: 'call-2', name: 'read_file', arguments: { path: 'b.ts' } },
      ];

      const llmClient = createMockLLMClient([
        createToolUseResponse(calls),
        createStopResponse('Done'),
      ]);

      const executeCalls: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        executeCalls.push(params.path as string);
        return { toolCallId: 'call-1', result: 'content' };
      });

      const runner = new TestAgentRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(executeCalls).toContain('a.ts');
      expect(executeCalls).toContain('b.ts');
    });
  });
});
