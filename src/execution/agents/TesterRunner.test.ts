import { describe, it, expect, vi } from 'vitest';
import { TesterRunner } from './TesterRunner';
import type { Task, ToolExecutor, Logger } from './types';
import type { LLMClient, LLMResponse, ToolCall } from '@/llm';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Write Tests',
    description: 'Write tests for the user service',
    files: ['src/services/user.ts'],
    test: 'pnpm test',
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
  const executeFn = executeImpl
    ? vi.fn().mockImplementation(executeImpl)
    : vi.fn().mockResolvedValue({ toolCallId: 'tool-1', result: 'success' });

  return {
    execute: executeFn,
    getAvailableTools: vi.fn().mockReturnValue([
      { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } },
      { name: 'write_file', description: 'Write a file', inputSchema: { type: 'object' } },
      { name: 'run_command', description: 'Run a command', inputSchema: { type: 'object' } },
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
// Tests
// ============================================================================

describe('TesterRunner', () => {
  describe('agentType and systemPrompt', () => {
    it('should have agentType of "tester"', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.agentType).toBe('tester');
    });

    it('should have a tester system prompt', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.systemPrompt).toBeDefined();
      expect(runner.systemPrompt.length).toBeGreaterThan(100);
      expect(runner.systemPrompt.toLowerCase()).toContain('test');
    });
  });

  describe('execute() - test creation', () => {
    it('should analyze source code before writing tests', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/services/user.ts' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: {
              path: 'src/services/user.test.ts',
              content: 'describe("UserService", () => { it("works", () => {}); });',
            },
          },
        ]),
        createStopResponse('Tests written successfully.'),
      ]);

      const readPaths: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'read_file') {
          readPaths.push(params.path as string);
          return { toolCallId: 'call-1', result: 'export class UserService {}' };
        }
        return { toolCallId: 'call-2', result: 'success' };
      });

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(readPaths).toContain('src/services/user.ts');
    });

    it('should create test file with proper naming', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/services/user.ts' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: {
              path: 'src/services/user.test.ts',
              content: 'test content',
            },
          },
        ]),
        createStopResponse('Done.'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'success',
      }));

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.filesChanged).toContain('src/services/user.test.ts');
    });

    it('should run tests after writing to verify they pass', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/test.test.ts', content: 'test' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'run_command',
            arguments: { command: 'pnpm test' },
          },
        ]),
        createStopResponse('Tests pass.'),
      ]);

      const commands: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'run_command') {
          commands.push(params.command as string);
          return {
            toolCallId: 'call-2',
            result: { stdout: 'Tests passed', stderr: '', exitCode: 0, killed: false },
          };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask({ test: 'pnpm test' }));

      expect(commands).toContain('pnpm test');
    });

    it('should attempt to fix failing tests', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/test.test.ts', content: 'bad test' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'run_command',
            arguments: { command: 'pnpm test' },
          },
        ]),
        // Test fails, fix it
        createToolUseResponse([
          {
            id: 'call-3',
            name: 'write_file',
            arguments: { path: 'src/test.test.ts', content: 'fixed test' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-4',
            name: 'run_command',
            arguments: { command: 'pnpm test' },
          },
        ]),
        createStopResponse('Tests fixed and pass.'),
      ]);

      let testRunCount = 0;
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'run_command') {
          testRunCount++;
          if (testRunCount === 1) {
            return {
              toolCallId: 'call-2',
              result: { stdout: '', stderr: 'Test failed', exitCode: 1, killed: false },
            };
          }
          return {
            toolCallId: 'call-4',
            result: { stdout: 'Tests passed', stderr: '', exitCode: 0, killed: false },
          };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(testRunCount).toBe(2);
    });
  });

  describe('execute() - edge cases and coverage', () => {
    it('should test edge cases mentioned in description', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/validator.ts' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: {
              path: 'src/validator.test.ts',
              content: `
describe('Validator', () => {
  it('handles empty input', () => {});
  it('handles null input', () => {});
  it('handles valid input', () => {});
});`,
            },
          },
        ]),
        createStopResponse('Edge case tests written.'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'success',
      }));

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(
        createMockTask({
          description: 'Write tests for validator including edge cases',
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getTools()', () => {
    it('should return tester-specific tools', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new TesterRunner({
        llmClient,
        toolExecutor,
      });

      const tools = runner.getTools();

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('run_command');
      // Tester doesn't have edit_file or search_code
      expect(toolNames).not.toContain('edit_file');
      expect(toolNames).not.toContain('search_code');
    });
  });
});
