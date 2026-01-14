import { describe, it, expect, vi } from 'vitest';
import { ReviewerRunner } from './ReviewerRunner';
import type { Task, ToolExecutor, Logger, ReviewResult } from './types';
import type { LLMClient, LLMResponse, ToolCall } from '@/llm';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Review Code',
    description: 'Review changes in user service',
    files: ['src/services/user.ts'],
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

describe('ReviewerRunner', () => {
  describe('agentType and systemPrompt', () => {
    it('should have agentType of "reviewer"', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.agentType).toBe('reviewer');
    });

    it('should have a reviewer system prompt', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      expect(runner.systemPrompt).toBeDefined();
      expect(runner.systemPrompt.length).toBeGreaterThan(100);
      expect(runner.systemPrompt.toLowerCase()).toContain('review');
    });
  });

  describe('execute() - code review', () => {
    it('should read files to review', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/services/user.ts' },
          },
        ]),
        createStopResponse(
          JSON.stringify({
            approved: true,
            issues: [],
            summary: 'Code looks good.',
          })
        ),
      ]);

      const readPaths: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'read_file') {
          readPaths.push(params.path as string);
          return { toolCallId: 'call-1', result: 'export class UserService {}' };
        }
        return { toolCallId: 'call-1', result: 'success' };
      });

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(readPaths).toContain('src/services/user.ts');
    });

    it('should approve clean code with no issues', async () => {
      const reviewResult: ReviewResult = {
        approved: true,
        issues: [],
        summary: 'Code is well-structured and follows best practices.',
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/clean.ts' },
          },
        ]),
        createStopResponse(JSON.stringify(reviewResult)),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'export const clean = () => {}',
      }));

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.output).toContain('approved');
    });

    it('should identify issues and reject buggy code', async () => {
      const reviewResult: ReviewResult = {
        approved: false,
        issues: [
          {
            severity: 'critical',
            file: 'src/buggy.ts',
            line: 10,
            message: 'SQL injection vulnerability',
            suggestion: 'Use parameterized queries',
          },
        ],
        summary: 'Critical security issue found.',
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/buggy.ts' },
          },
        ]),
        createStopResponse(JSON.stringify(reviewResult)),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
      }));

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.output).toContain('critical');
      expect(result.output).toContain('SQL injection');
    });

    it('should approve with minor suggestions', async () => {
      const reviewResult: ReviewResult = {
        approved: true,
        issues: [
          {
            severity: 'suggestion',
            file: 'src/ok.ts',
            message: 'Consider extracting this into a separate function',
          },
        ],
        summary: 'Code is acceptable with minor improvements suggested.',
      };

      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/ok.ts' },
          },
        ]),
        createStopResponse(JSON.stringify(reviewResult)),
      ]);

      const toolExecutor = createMockToolExecutor(async () => ({
        toolCallId: 'call-1',
        result: 'working code here',
      }));

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.success).toBe(true);
      expect(result.output).toContain('suggestion');
    });
  });

  describe('execute() - code search for context', () => {
    it('should use search_code to find related patterns', async () => {
      const llmClient = createMockLLMClient([
        createToolUseResponse([
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/new-service.ts' },
          },
        ]),
        createToolUseResponse([
          {
            id: 'call-2',
            name: 'search_code',
            arguments: { query: 'class.*Service', path: 'src/' },
          },
        ]),
        createStopResponse(
          JSON.stringify({
            approved: true,
            issues: [],
            summary: 'Service follows existing patterns.',
          })
        ),
      ]);

      const searchQueries: string[] = [];
      const toolExecutor = createMockToolExecutor(async (name, params) => {
        if (name === 'search_code') {
          searchQueries.push(params.query as string);
          return {
            toolCallId: 'call-2',
            result: [{ file: 'src/other-service.ts', line: 1, content: 'class OtherService' }],
          };
        }
        return { toolCallId: 'call-1', result: 'class NewService {}' };
      });

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      await runner.execute(createMockTask());

      expect(searchQueries.length).toBeGreaterThan(0);
    });
  });

  describe('getTools()', () => {
    it('should return reviewer-specific tools (read-only)', () => {
      const llmClient = createMockLLMClient([createStopResponse('done')]);
      const toolExecutor = createMockToolExecutor();

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      const tools = runner.getTools();

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('search_code');
      // Reviewer should NOT have write capabilities
      expect(toolNames).not.toContain('write_file');
      expect(toolNames).not.toContain('edit_file');
      expect(toolNames).not.toContain('run_command');
    });
  });

  describe('parseReviewResult()', () => {
    it('should parse JSON review output', async () => {
      const reviewJson = {
        approved: false,
        issues: [
          { severity: 'major', file: 'test.ts', message: 'Issue 1' },
          { severity: 'minor', file: 'test.ts', message: 'Issue 2' },
        ],
        summary: 'Some issues found',
      };

      const llmClient = createMockLLMClient([
        createStopResponse(JSON.stringify(reviewJson)),
      ]);

      const toolExecutor = createMockToolExecutor();

      const runner = new ReviewerRunner({
        llmClient,
        toolExecutor,
      });

      const result = await runner.execute(createMockTask());

      expect(result.output).toContain('major');
      expect(result.output).toContain('minor');
    });
  });
});
