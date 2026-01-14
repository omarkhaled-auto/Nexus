import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoderRunner } from './CoderRunner';
import type { Task, ToolExecutor, Logger } from './types';
import type { LLMClient, LLMResponse, ToolCall } from '@/llm';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Implement Feature',
    description: 'Create a new utility function',
    files: ['src/utils.ts'],
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
      { name: 'edit_file', description: 'Edit a file', inputSchema: { type: 'object' } },
      { name: 'run_command', description: 'Run a command', inputSchema: { type: 'object' } },
      { name: 'search_code', description: 'Search code', inputSchema: { type: 'object' } },
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

describe('CoderRunner', () => {
  describe('agentType and systemPrompt', () => {
    it('should have agentType of "coder"', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.agentType).toBe('coder');
    });

    it('should have a coder system prompt', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.systemPrompt).toBeDefined();
      expect(runner.systemPrompt.length).toBeGreaterThan(100);
      expect(runner.systemPrompt.toLowerCase()).toContain('code');
    });
  });

  describe('execute() - code generation', () => {
    it('should complete a code generation task', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/utils.ts' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: { path: 'src/utils.ts', content: 'export function test() {}' },
          },
        ]),
        createStopResponse('I have created the utility function.'),
      ]);

      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'read_file') {
          return { toolCallId: 'call-1', result: '// existing code' };
        }
        return { toolCallId: 'call-2', result: 'File written successfully' };
      });

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.filesChanged).toContain('src/utils.ts');
    });

    it('should track multiple file changes', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/feature.ts', content: 'export class Feature {}' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: { path: 'src/feature.test.ts', content: 'describe("Feature", () => {})' },
          },
        ]),
        createStopResponse('Created feature and its tests.'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'success',
      }));

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.filesChanged).toContain('src/feature.ts');
      expect(result.filesChanged).toContain('src/feature.test.ts');
    });

    it('should use edit_file for modifications', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'edit_file',
            arguments: {
              path: 'src/existing.ts',
              edits: [{ startLine: 1, endLine: 2, newContent: '// updated' }],
            },
          },
        ]),
        createStopResponse('Modified the existing file.'),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'Edit applied',
      }));

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.filesChanged).toContain('src/existing.ts');
    });
  });

  describe('execute() - command execution', () => {
    it('should run build commands to verify code compiles', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/new.ts', content: 'export const x = 1;' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'run_command',
            arguments: { command: 'pnpm typecheck' },
          },
        ]),
        createStopResponse('Code written and verified.'),
      ]);

      const commandResults: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'run_command') {
          commandResults.push(params.command as string);
          return {
            toolCallId: 'call-2',
            result: { stdout: '', stderr: '', exitCode: 0, killed: false },
          };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(commandResults).toContain('pnpm typecheck');
    });

    it('should handle build errors and attempt fixes', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/bad.ts', content: 'export const x: strin = "";' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'run_command',
            arguments: { command: 'pnpm typecheck' },
          },
        ]),
        // LLM gets error, fixes it
        createToolUseResponse([
          {
            id: 'call-3',
            name: 'edit_file',
            arguments: { path: 'src/bad.ts', edits: [] },
          },
        ]),
        createStopResponse('Fixed the type error.'),
      ]);

      let buildCallCount = 0;
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'run_command') {
          buildCallCount++;
          if (buildCallCount === 1) {
            return {
              toolCallId: 'call-2',
              result: { stdout: '', stderr: 'Type "strin" not found', exitCode: 1, killed: false },
            };
          }
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
    });
  });

  describe('execute() - code search', () => {
    it('should use search_code to find patterns', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'search_code',
            arguments: { query: 'export function', path: 'src/' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'write_file',
            arguments: { path: 'src/new.ts', content: 'export function newFunc() {}' },
          },
        ]),
        createStopResponse('Found patterns and created new function.'),
      ]);

      const searchQueries: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'search_code') {
          searchQueries.push(params.query as string);
          return {
            toolCallId: 'call-1',
            result: [
              { file: 'src/utils.ts', line: 1, content: 'export function existing() {}' },
            ],
          };
        }
        return { toolCallId: 'call-2', result: 'success' };
      });

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(searchQueries).toContain('export function');
    });
  });

  describe('getAvailableTools()', () => {
    it('should return coder-specific tools', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new CoderRunner({
        llmClient,
        toolExecutor,
      });

      const tools = runner.getTools();

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('edit_file');
      expect(toolNames).toContain('run_command');
      expect(toolNames).toContain('search_code');
    });
  });
});
