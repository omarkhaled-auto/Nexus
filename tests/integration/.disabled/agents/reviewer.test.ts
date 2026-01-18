/**
 * Reviewer Agent Integration Tests
 *
 * Tests the reviewer agent's ability to review code changes, approve good code,
 * request changes for issues, integrate with QALoopEngine, and emit review events.
 *
 * @module tests/integration/agents/reviewer
 */
import { test, expect, describe, beforeEach, vi } from '../../helpers/fixtures';
import { ReviewerRunner } from '@/execution/agents/ReviewerRunner';
import { QALoopEngine } from '@/execution/qa-loop/QALoopEngine';
import type { Task, ExecutionResult, ToolExecutor, ToolDefinition, ReviewResult } from '@/execution/agents/types';
import type { LLMClient, Message, LLMResponse, ChatOptions, ToolCall, ToolResult } from '@/llm';
import type { NexusEvent } from '@/types/events';
import type { BuildVerifier } from '@/quality/build/BuildVerifier';
import type { LintRunner } from '@/quality/lint/LintRunner';
import type { TestRunner } from '@/quality/test/TestRunner';
import type { CodeReviewer } from '@/quality/review/CodeReviewer';
import type { CoderRunner } from '@/execution/agents/CoderRunner';
import type { VerificationResult, TestResult, ReviewResult as QAReviewResult } from '@/quality/types';
import { nanoid } from 'nanoid';
import { resetMockState } from '../../mocks/handlers';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Create a mock LLM client with configurable responses
 */
function createMockLLMClient(
  responses: Array<{ content: string; finishReason: 'stop' | 'tool_use'; toolCalls?: ToolCall[] }>
): LLMClient {
  let callIndex = 0;

  return {
    chat: vi.fn(async (_messages: Message[], _options?: ChatOptions): Promise<LLMResponse> => {
      const response = responses[callIndex] ?? responses[responses.length - 1]!;
      callIndex++;
      return {
        content: response.content,
        finishReason: response.finishReason,
        toolCalls: response.toolCalls,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      };
    }),
    getModel: () => 'gemini-2.5-pro',
  } as unknown as LLMClient;
}

/**
 * Create a mock tool executor for reviewer (read-only tools)
 */
function createMockToolExecutor(
  fileContents: Map<string, string> = new Map()
): ToolExecutor & { calls: Array<{ name: string; params: Record<string, unknown> }> } {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];

  return {
    calls,
    execute: vi.fn(async (name: string, params: Record<string, unknown>): Promise<ToolResult> => {
      calls.push({ name, params });

      switch (name) {
        case 'read_file': {
          const filePath = params.path as string;
          const content = fileContents.get(filePath);
          if (content === undefined) {
            return { success: false, result: `File not found: ${filePath}` };
          }
          return { success: true, result: content };
        }
        case 'search_code': {
          const query = params.query as string;
          // Return mock search results
          const results: Array<{ file: string; line: number; content: string }> = [];
          for (const [file, content] of fileContents) {
            if (content.includes(query)) {
              results.push({ file, line: 1, content: content.substring(0, 100) });
            }
          }
          return { success: true, result: JSON.stringify(results) };
        }
        default:
          return { success: false, result: `Unknown tool: ${name}` };
      }
    }),
    getAvailableTools: (): ToolDefinition[] => [
      {
        name: 'read_file',
        description: 'Read file contents for review',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
      {
        name: 'search_code',
        description: 'Search for patterns in code',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ],
  };
}

/**
 * Create a test task for review
 */
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${nanoid(6)}`,
    name: 'Review Task',
    description: 'Review the code changes and provide feedback',
    files: ['src/feature.ts'],
    worktree: '/tmp/test-worktree',
    ...overrides,
  };
}

/**
 * Create mock QA components
 */
function createMockQAComponents(options: {
  buildPass?: boolean;
  lintPass?: boolean;
  testPass?: boolean;
  reviewApprove?: boolean;
} = {}) {
  const { buildPass = true, lintPass = true, testPass = true, reviewApprove = true } = options;

  const buildVerifier: BuildVerifier = {
    verify: vi.fn(async (_workdir: string): Promise<VerificationResult> => ({
      success: buildPass,
      errors: buildPass ? [] : [{ type: 'build' as const, file: 'src/file.ts', message: 'Error' }],
      warnings: [],
      duration: 100,
    })),
  } as unknown as BuildVerifier;

  const lintRunner: LintRunner = {
    run: vi.fn(async (_workdir: string): Promise<VerificationResult> => ({
      success: lintPass,
      errors: lintPass ? [] : [{ type: 'lint' as const, file: 'src/file.ts', message: 'Lint error' }],
      warnings: [],
      duration: 50,
    })),
  } as unknown as LintRunner;

  const testRunner: TestRunner = {
    run: vi.fn(async (_workdir: string, _pattern?: string): Promise<TestResult> => ({
      success: testPass,
      passed: testPass ? 5 : 3,
      failed: testPass ? 0 : 2,
      skipped: 0,
      failures: testPass ? [] : [{ testName: 'test1', file: 'test.ts', message: 'Failed' }],
      duration: 200,
    })),
  } as unknown as TestRunner;

  const codeReviewer: CodeReviewer = {
    review: vi.fn(async (_files: { path: string; content: string }[]): Promise<QAReviewResult> => ({
      approved: reviewApprove,
      hasBlockingIssues: !reviewApprove,
      issues: reviewApprove ? [] : [{ severity: 'major' as const, file: 'src/file.ts', message: 'Issue found' }],
      summary: reviewApprove ? 'Code looks good' : 'Issues found',
    })),
  } as unknown as CodeReviewer;

  return { buildVerifier, lintRunner, testRunner, codeReviewer };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Reviewer Agent Integration', () => {
  beforeEach(() => {
    resetMockState();
  });

  test('should review code changes', async ({ eventBus }) => {
    // Arrange: Set up reviewer with file to review
    const fileContents = new Map<string, string>();
    fileContents.set('src/feature.ts', `
export function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
    `.trim());

    const toolExecutor = createMockToolExecutor(fileContents);

    const llmClient = createMockLLMClient([
      // First, read the file
      {
        content: 'I will read the file to review.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/feature.ts' },
          },
        ],
      },
      // Complete review
      {
        content: `Review complete.

APPROVED: Yes

Summary: The code is well-structured and follows best practices.
- Uses proper TypeScript typing
- Implements reduce correctly for summing
- Clean and readable

No issues found.`,
        finishReason: 'stop',
      },
    ]);

    const reviewer = new ReviewerRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask({
      description: 'Review the calculateTotal function implementation',
    });

    // Track review events
    const events: NexusEvent[] = [];
    eventBus.on('review:started', (event) => events.push(event));
    eventBus.on('review:completed', (event) => events.push(event));

    // Act: Execute review
    eventBus.emit('review:started', {
      taskId: task.id,
      files: task.files,
    });

    const result = await reviewer.execute(task);

    eventBus.emit('review:completed', {
      taskId: task.id,
      approved: result.output.includes('APPROVED: Yes'),
      issueCount: 0,
    });

    // Assert: Review was performed
    expect(result.success).toBe(true);
    expect(result.output).toContain('Review complete');

    // File was read
    expect(toolExecutor.calls.some(c => c.name === 'read_file')).toBe(true);

    // Events emitted
    expect(events).toHaveLength(2);
  });

  test('should approve good code', async () => {
    // Arrange: Good quality code
    const fileContents = new Map<string, string>();
    fileContents.set('src/utils.ts', `
/**
 * Safely parses a JSON string
 * @param json - The JSON string to parse
 * @returns The parsed object or null if invalid
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
    `.trim());

    const toolExecutor = createMockToolExecutor(fileContents);

    const llmClient = createMockLLMClient([
      {
        content: 'Reading file for review.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/utils.ts' },
          },
        ],
      },
      {
        content: `Code Review Result:

APPROVED: Yes
QUALITY_SCORE: 9/10

Strengths:
- Excellent TypeScript generics usage
- Proper JSDoc documentation
- Safe error handling with try-catch
- Clean, single-responsibility function

This code is production-ready.`,
        finishReason: 'stop',
      },
    ]);

    const reviewer = new ReviewerRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask({
      files: ['src/utils.ts'],
      description: 'Review the safeJsonParse utility function',
    });

    // Act
    const result = await reviewer.execute(task);

    // Assert: Code approved
    expect(result.success).toBe(true);
    expect(result.output).toContain('APPROVED: Yes');
    expect(result.output).toContain('production-ready');
  });

  test('should request changes for issues', async ({ eventBus }) => {
    // Arrange: Code with issues
    const fileContents = new Map<string, string>();
    fileContents.set('src/broken.ts', `
export function process(data) {  // Missing type annotation
  let result;  // Uninitialized variable
  for(var i=0; i<data.length; i++) {  // Using var instead of let
    result = data[i] * 2;
    console.log(result);  // Console.log in production code
  }
  return result;  // Could be undefined
}
    `.trim());

    const toolExecutor = createMockToolExecutor(fileContents);

    const llmClient = createMockLLMClient([
      {
        content: 'Reading file for review.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/broken.ts' },
          },
        ],
      },
      {
        content: `Code Review Result:

APPROVED: No
CHANGES_REQUESTED: Yes

Issues Found:
1. [MAJOR] Missing type annotation on function parameter 'data'
2. [MAJOR] Variable 'result' could be undefined when returned
3. [MINOR] Using 'var' instead of 'let' in for loop
4. [MINOR] console.log should not be in production code

Recommendations:
- Add proper TypeScript types
- Initialize 'result' with a default value
- Replace 'var' with 'let'
- Remove or conditionally include console.log`,
        finishReason: 'stop',
      },
    ]);

    const reviewer = new ReviewerRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask({
      files: ['src/broken.ts'],
      description: 'Review the process function',
    });

    // Track change request events
    const events: NexusEvent[] = [];
    eventBus.on('review:changes-requested', (event) => events.push(event));

    // Act
    const result = await reviewer.execute(task);

    // Emit changes requested event
    if (result.output.includes('CHANGES_REQUESTED: Yes')) {
      eventBus.emit('review:changes-requested', {
        taskId: task.id,
        issues: ['Missing type annotation', 'Undefined variable', 'Using var', 'Console.log'],
      });
    }

    // Assert: Changes were requested
    expect(result.success).toBe(true); // Execution succeeded
    expect(result.output).toContain('APPROVED: No');
    expect(result.output).toContain('CHANGES_REQUESTED: Yes');
    expect(result.output).toContain('Issues Found');

    // Event was emitted
    expect(events).toHaveLength(1);
    expect((events[0]!.payload as any).issues.length).toBeGreaterThan(0);
  });

  test('should integrate with QALoopEngine', async ({ eventBus }) => {
    // Arrange: Set up QA components with reviewer
    let reviewCallCount = 0;
    const qaComponents = createMockQAComponents({ reviewApprove: true });

    // Track review calls
    const originalReview = qaComponents.codeReviewer.review;
    qaComponents.codeReviewer.review = vi.fn(async (files) => {
      reviewCallCount++;
      return originalReview(files);
    });

    const mockCoder = {
      fixIssues: vi.fn(async (_errors: string[]) => {}),
      execute: vi.fn(async (_task: Task) => ({})),
    } as unknown as CoderRunner;

    const qaEngine = new QALoopEngine({
      buildVerifier: qaComponents.buildVerifier,
      lintRunner: qaComponents.lintRunner,
      testRunner: qaComponents.testRunner,
      codeReviewer: qaComponents.codeReviewer,
      maxIterations: 3,
    });

    const task = createTestTask();

    // Track QA events
    const qaEvents: NexusEvent[] = [];
    eventBus.on('qa:review-completed', (event) => qaEvents.push(event));

    // Act: Run QA loop (includes review stage)
    const result = await qaEngine.run(task, mockCoder);

    // Emit review completed event
    eventBus.emit('qa:review-completed', {
      taskId: task.id,
      approved: result.success,
      iterations: result.iterations,
    });

    // Assert: Review was integrated into QA loop
    expect(result.success).toBe(true);
    expect(result.stages.map(s => s.stage)).toContain('review');

    // Review was called
    expect(reviewCallCount).toBe(1);

    // Event emitted
    expect(qaEvents).toHaveLength(1);
    expect((qaEvents[0]!.payload as any).approved).toBe(true);
  });

  test('should emit review events', async ({ eventBus }) => {
    // Arrange
    const fileContents = new Map<string, string>();
    fileContents.set('src/test.ts', 'export const x = 1;');

    const toolExecutor = createMockToolExecutor(fileContents);

    const llmClient = createMockLLMClient([
      {
        content: 'Reading file.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/test.ts' },
          },
        ],
      },
      {
        content: 'APPROVED: Yes\nGood code.',
        finishReason: 'stop',
      },
    ]);

    const reviewer = new ReviewerRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask({ files: ['src/test.ts'] });

    // Track all review events
    const events: Array<{ type: string; payload: unknown }> = [];
    eventBus.on('review:started', (event) => events.push({ type: 'review:started', payload: event.payload }));
    eventBus.on('review:file-read', (event) => events.push({ type: 'review:file-read', payload: event.payload }));
    eventBus.on('review:completed', (event) => events.push({ type: 'review:completed', payload: event.payload }));

    // Act: Execute review with full event emission
    eventBus.emit('review:started', {
      taskId: task.id,
      files: task.files,
      reviewer: 'ai',
    });

    const result = await reviewer.execute(task);

    // Emit file-read events for each file accessed
    for (const call of toolExecutor.calls) {
      if (call.name === 'read_file') {
        eventBus.emit('review:file-read', {
          taskId: task.id,
          filePath: call.params.path,
        });
      }
    }

    eventBus.emit('review:completed', {
      taskId: task.id,
      approved: result.output.includes('APPROVED: Yes'),
      duration: 100,
      issueCount: 0,
    });

    // Assert: All expected events were emitted
    expect(events).toHaveLength(3);
    expect(events[0]!.type).toBe('review:started');
    expect(events[1]!.type).toBe('review:file-read');
    expect(events[2]!.type).toBe('review:completed');

    // Verify event payloads
    expect((events[0]!.payload as any).reviewer).toBe('ai');
    expect((events[2]!.payload as any).approved).toBe(true);
    expect((events[2]!.payload as any).issueCount).toBe(0);
  });
});
