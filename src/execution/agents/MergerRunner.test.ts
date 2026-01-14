import { describe, it, expect, vi } from 'vitest';
import { MergerRunner } from './MergerRunner';
import type { Task, ToolExecutor, Logger } from './types';
import type { LLMClient, LLMResponse, ToolCall } from '@/llm';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Merge Branch',
    description: 'Merge feature/login into main',
    files: [],
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
      { name: 'git_diff', description: 'Git diff', inputSchema: { type: 'object' } },
      { name: 'git_merge', description: 'Git merge', inputSchema: { type: 'object' } },
      { name: 'git_status', description: 'Git status', inputSchema: { type: 'object' } },
      { name: 'read_file', description: 'Read file', inputSchema: { type: 'object' } },
      { name: 'write_file', description: 'Write file', inputSchema: { type: 'object' } },
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

describe('MergerRunner', () => {
  describe('agentType and systemPrompt', () => {
    it('should have agentType of "merger"', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.agentType).toBe('merger');
    });

    it('should have a merger system prompt', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.systemPrompt).toBeDefined();
      expect(runner.systemPrompt.length).toBeGreaterThan(100);
      expect(runner.systemPrompt.toLowerCase()).toContain('merge');
    });
  });

  describe('execute() - clean merge', () => {
    it('should perform clean merge when no conflicts', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'git_diff',
            arguments: { branch: 'feature/login' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'git_merge',
            arguments: { branch: 'feature/login' },
          },
        ]),
        createStopResponse('Merge completed successfully.'),
      ]);

      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'git_diff') {
          return { toolCallId: 'call-1', result: 'diff output here' };
        }
        if (name === 'git_merge') {
          return {
            toolCallId: 'call-2',
            result: { success: true, mergeCommit: 'abc123' },
          };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
    });
  });

  describe('execute() - conflict detection', () => {
    it('should detect merge conflicts', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'git_merge',
            arguments: { branch: 'feature/conflict' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'git_status',
            arguments: {},
          },
        ]),
        createStopResponse('Conflicts detected in merge.'),
      ]);

      const toolExecutor = createMockToolExecutor(async (name) => {
        if (name === 'git_merge') {
          return {
            toolCallId: 'call-1',
            result: {
              success: false,
              conflicts: ['src/file1.ts', 'src/file2.ts'],
            },
          };
        }
        if (name === 'git_status') {
          return {
            toolCallId: 'call-2',
            result: {
              current: 'main',
              staged: [],
              modified: [],
              untracked: [],
              conflicted: ['src/file1.ts', 'src/file2.ts'],
            },
          };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      // Agent completes but reports conflicts
      expect(result.output).toContain('Conflict');
    });
  });

  describe('execute() - conflict resolution', () => {
    it('should attempt to resolve conflicts using code understanding', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'git_merge',
            arguments: { branch: 'feature/conflict' },
          },
        ]),
        // Read conflicted file
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'read_file',
            arguments: { path: 'src/conflict.ts' },
          },
        ]),
        // Write resolved file
        createToolUseResponse([
          {
            id: 'call-3',
            name: 'write_file',
            arguments: { path: 'src/conflict.ts', content: 'resolved content' },
          },
        ]),
        createStopResponse('Conflict resolved successfully.'),
      ]);

      const actions: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        actions.push(name);
        if (name === 'git_merge') {
          return {
            toolCallId: 'call-1',
            result: { success: false, conflicts: ['src/conflict.ts'] },
          };
        }
        if (name === 'read_file') {
          return {
            toolCallId: 'call-2',
            result: '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature',
          };
        }
        return { toolCallId: 'call-3', result: 'success' };
      });

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(actions).toContain('read_file');
      expect(actions).toContain('write_file');
      expect(result.filesChanged).toContain('src/conflict.ts');
    });
  });

  describe('execute() - validation', () => {
    it('should check git status after merge', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'git_merge',
            arguments: { branch: 'feature/test' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'git_status',
            arguments: {},
          },
        ]),
        createStopResponse('Merge verified.'),
      ]);

      const statusCalled: boolean[] = [];
      const toolExecutor = createMockToolExecutor(async (name) => {
        if (name === 'git_status') {
          statusCalled.push(true);
          return {
            toolCallId: 'call-2',
            result: {
              current: 'main',
              staged: [],
              modified: [],
              untracked: [],
              conflicted: [],
            },
          };
        }
        return {
          toolCallId: 'call-1',
          result: { success: true, mergeCommit: 'abc123' },
        };
      });

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(statusCalled.length).toBeGreaterThan(0);
    });
  });

  describe('getTools()', () => {
    it('should return merger-specific tools', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new MergerRunner({
        llmClient,
        toolExecutor,
      });

      const tools = runner.getTools();

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('git_diff');
      expect(toolNames).toContain('git_merge');
      expect(toolNames).toContain('git_status');
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      // Merger doesn't need run_command or search_code
      expect(toolNames).not.toContain('run_command');
      expect(toolNames).not.toContain('search_code');
    });
  });
});
