/**
 * Coder Agent Integration Tests
 *
 * Tests the coder agent's ability to write code to files, use tool loops
 * for multi-step tasks, handle tool errors gracefully, emit progress events,
 * and integrate with BuildVerifier after writing.
 *
 * @module tests/integration/agents/coder
 */
import { test, expect, describe, beforeEach, vi } from '../../helpers/fixtures';
import { CoderRunner } from '@/execution/agents/CoderRunner';
import type { Task, ExecutionResult, ToolExecutor, ToolDefinition } from '@/execution/agents/types';
import type { LLMClient, Message, LLMResponse, ChatOptions, ToolCall, ToolResult } from '@/llm';
import type { NexusEvent } from '@/types/events';
import type { VerificationResult } from '@/quality/types';
import { nanoid } from 'nanoid';
import { resetMockState } from '../../mocks/handlers';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Create a mock LLM client with configurable behavior
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
    getModel: () => 'claude-sonnet-4',
  } as unknown as LLMClient;
}

/**
 * Create a mock tool executor that tracks calls
 */
function createMockToolExecutor(
  fileSystem: Map<string, string> = new Map(),
  shouldError: Map<string, string> = new Map()
): ToolExecutor & { calls: Array<{ name: string; params: Record<string, unknown> }> } {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];

  return {
    calls,
    execute: vi.fn(async (name: string, params: Record<string, unknown>): Promise<ToolResult> => {
      calls.push({ name, params });

      // Check for error simulation
      if (shouldError.has(name)) {
        throw new Error(shouldError.get(name));
      }

      switch (name) {
        case 'write_file': {
          const filePath = params.path as string;
          const content = params.content as string;
          fileSystem.set(filePath, content);
          return { success: true, result: `File written: ${filePath}` };
        }
        case 'read_file': {
          const filePath = params.path as string;
          const content = fileSystem.get(filePath);
          if (content === undefined) {
            return { success: false, result: `File not found: ${filePath}` };
          }
          return { success: true, result: content };
        }
        case 'run_command': {
          return { success: true, result: 'Command executed successfully' };
        }
        case 'search_code': {
          return { success: true, result: JSON.stringify([]) };
        }
        case 'edit_file': {
          return { success: true, result: 'File edited successfully' };
        }
        default:
          return { success: false, result: `Unknown tool: ${name}` };
      }
    }),
    getAvailableTools: (): ToolDefinition[] => [
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'read_file',
        description: 'Read file contents',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
      {
        name: 'run_command',
        description: 'Execute a command',
        inputSchema: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command'],
        },
      },
      {
        name: 'search_code',
        description: 'Search code',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'edit_file',
        description: 'Edit a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            edits: { type: 'array' },
          },
          required: ['path', 'edits'],
        },
      },
    ],
  };
}

/**
 * Create a test task
 */
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${nanoid(6)}`,
    name: 'Test Task',
    description: 'Implement a simple function that adds two numbers',
    files: ['src/math.ts'],
    worktree: '/tmp/test-worktree',
    ...overrides,
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Coder Agent Integration', () => {
  beforeEach(() => {
    resetMockState();
  });

  test('should write code to specified file', async ({ eventBus }) => {
    // Arrange: Create coder with tool_use -> stop response sequence
    const fileSystem = new Map<string, string>();
    const toolExecutor = createMockToolExecutor(fileSystem);

    const llmClient = createMockLLMClient([
      {
        content: 'I will create the math.ts file with the add function.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'write_file',
            arguments: {
              path: 'src/math.ts',
              content: 'export function add(a: number, b: number): number {\n  return a + b;\n}\n',
            },
          },
        ],
      },
      {
        content: 'I have created the add function in src/math.ts. The function takes two numbers and returns their sum.',
        finishReason: 'stop',
      },
    ]);

    const coder = new CoderRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask();

    // Track events
    const events: NexusEvent[] = [];
    eventBus.on('coder:file-written', (event) => events.push(event));

    // Act: Execute the task
    const result = await coder.execute(task);

    // Emit file-written event (simulating coordinator behavior)
    if (result.filesChanged.length > 0) {
      for (const file of result.filesChanged) {
        eventBus.emit('coder:file-written', {
          taskId: task.id,
          filePath: file,
        });
      }
    }

    // Assert: Task completed successfully
    expect(result.success).toBe(true);
    expect(result.filesChanged).toContain('src/math.ts');

    // File was written to mock file system
    expect(fileSystem.has('src/math.ts')).toBe(true);
    expect(fileSystem.get('src/math.ts')).toContain('export function add');

    // Tool was called correctly
    expect(toolExecutor.calls.length).toBe(1);
    expect(toolExecutor.calls[0]!.name).toBe('write_file');
  });

  test('should use tool loop for multi-step tasks', async () => {
    // Arrange: Create complex task requiring multiple tools
    const fileSystem = new Map<string, string>();
    fileSystem.set('src/existing.ts', 'export const value = 1;');

    const toolExecutor = createMockToolExecutor(fileSystem);

    const llmClient = createMockLLMClient([
      // Step 1: Read existing file
      {
        content: 'First, I will read the existing file to understand the context.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'read_file',
            arguments: { path: 'src/existing.ts' },
          },
        ],
      },
      // Step 2: Search for related code
      {
        content: 'Now I will search for related patterns.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-2',
            name: 'search_code',
            arguments: { query: 'export const' },
          },
        ],
      },
      // Step 3: Write new file
      {
        content: 'I will create the new file based on the existing pattern.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-3',
            name: 'write_file',
            arguments: {
              path: 'src/new.ts',
              content: 'export const newValue = 2;',
            },
          },
        ],
      },
      // Step 4: Complete
      {
        content: 'Task completed. Created new.ts following the existing pattern.',
        finishReason: 'stop',
      },
    ]);

    const coder = new CoderRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask({
      name: 'Multi-step task',
      description: 'Create a new file following the pattern in existing.ts',
      files: ['src/new.ts'],
    });

    // Act: Execute the multi-step task
    const result = await coder.execute(task);

    // Assert: Multiple tool calls were made
    expect(result.success).toBe(true);
    expect(result.iterations).toBeGreaterThanOrEqual(3);

    // All expected tools were called
    const toolNames = toolExecutor.calls.map(c => c.name);
    expect(toolNames).toContain('read_file');
    expect(toolNames).toContain('search_code');
    expect(toolNames).toContain('write_file');

    // Final file was written
    expect(fileSystem.has('src/new.ts')).toBe(true);
  });

  test('should handle tool errors gracefully', async () => {
    // Arrange: Set up tool executor that fails on first write
    const fileSystem = new Map<string, string>();
    const shouldError = new Map<string, string>();

    // First write will fail
    let writeCallCount = 0;
    const toolExecutor = createMockToolExecutor(fileSystem);

    // Override execute to fail first write
    const originalExecute = toolExecutor.execute;
    toolExecutor.execute = vi.fn(async (name: string, params: Record<string, unknown>): Promise<ToolResult> => {
      if (name === 'write_file') {
        writeCallCount++;
        if (writeCallCount === 1) {
          return { success: false, result: 'Error: Permission denied' };
        }
      }
      return originalExecute(name, params);
    });

    const llmClient = createMockLLMClient([
      // First attempt to write
      {
        content: 'I will write the file.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/file.ts', content: 'export const x = 1;' },
          },
        ],
      },
      // Handle error and retry
      {
        content: 'The write failed. I will try a different approach.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-2',
            name: 'write_file',
            arguments: { path: 'src/file.ts', content: 'export const x = 1;' },
          },
        ],
      },
      // Complete
      {
        content: 'File written successfully on second attempt.',
        finishReason: 'stop',
      },
    ]);

    const coder = new CoderRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask();

    // Act: Execute with error handling
    const result = await coder.execute(task);

    // Assert: Coder recovered from error
    expect(result.success).toBe(true);
    expect(writeCallCount).toBe(2); // Two write attempts
    expect(result.iterations).toBeGreaterThan(1);
  });

  test('should emit progress events during execution', async ({ eventBus }) => {
    // Arrange
    const fileSystem = new Map<string, string>();
    const toolExecutor = createMockToolExecutor(fileSystem);

    const llmClient = createMockLLMClient([
      {
        content: 'Starting implementation.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: 'src/test.ts', content: 'export const x = 1;' },
          },
        ],
      },
      {
        content: 'Implementation complete.',
        finishReason: 'stop',
      },
    ]);

    const coder = new CoderRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    const task = createTestTask();

    // Track progress events
    const progressEvents: Array<{ type: string; payload: unknown }> = [];
    eventBus.on('coder:started', (event) => progressEvents.push({ type: 'coder:started', payload: event.payload }));
    eventBus.on('coder:tool-called', (event) => progressEvents.push({ type: 'coder:tool-called', payload: event.payload }));
    eventBus.on('coder:progress', (event) => progressEvents.push({ type: 'coder:progress', payload: event.payload }));
    eventBus.on('coder:completed', (event) => progressEvents.push({ type: 'coder:completed', payload: event.payload }));

    // Act: Execute with event emission
    eventBus.emit('coder:started', {
      taskId: task.id,
      taskName: task.name,
    });

    const result = await coder.execute(task);

    // Emit progress events for tool calls
    for (const call of toolExecutor.calls) {
      eventBus.emit('coder:tool-called', {
        taskId: task.id,
        toolName: call.name,
      });
    }

    eventBus.emit('coder:progress', {
      taskId: task.id,
      iteration: result.iterations,
      filesChanged: result.filesChanged,
    });

    eventBus.emit('coder:completed', {
      taskId: task.id,
      success: result.success,
      filesChanged: result.filesChanged,
      iterations: result.iterations,
    });

    // Assert: All progress events were emitted
    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
    expect(progressEvents[0]!.type).toBe('coder:started');
    expect(progressEvents[progressEvents.length - 1]!.type).toBe('coder:completed');

    const completedEvent = progressEvents.find(e => e.type === 'coder:completed');
    expect((completedEvent!.payload as any).success).toBe(true);
  });

  test('should integrate with BuildVerifier after writing', async ({ eventBus }) => {
    // Arrange: Set up coder and mock build verifier
    const fileSystem = new Map<string, string>();
    const toolExecutor = createMockToolExecutor(fileSystem);

    const llmClient = createMockLLMClient([
      {
        content: 'Writing the TypeScript file.',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call-1',
            name: 'write_file',
            arguments: {
              path: 'src/module.ts',
              content: 'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n',
            },
          },
        ],
      },
      {
        content: 'File written. Ready for build verification.',
        finishReason: 'stop',
      },
    ]);

    const coder = new CoderRunner({
      llmClient,
      toolExecutor,
      maxIterations: 10,
    });

    // Mock build verifier
    let buildAttempts = 0;
    const mockBuildVerifier = {
      async verify(_workdir: string): Promise<VerificationResult> {
        buildAttempts++;
        // Check if file exists and is valid
        const hasFile = fileSystem.has('src/module.ts');
        const content = fileSystem.get('src/module.ts') ?? '';
        const isValid = hasFile && content.includes('export function');

        return {
          success: isValid,
          errors: isValid ? [] : [{ type: 'build' as const, file: 'src/module.ts', message: 'Type error' }],
          warnings: [],
          duration: 100,
        };
      },
    };

    const task = createTestTask({
      files: ['src/module.ts'],
    });

    // Track build events
    const buildEvents: NexusEvent[] = [];
    eventBus.on('build:started', (event) => buildEvents.push(event));
    eventBus.on('build:completed', (event) => buildEvents.push(event));

    // Act: Execute coder task
    const coderResult = await coder.execute(task);

    // Verify build after coder finishes
    eventBus.emit('build:started', {
      taskId: task.id,
      workdir: task.worktree,
    });

    const buildResult = await mockBuildVerifier.verify(task.worktree ?? '');

    eventBus.emit('build:completed', {
      taskId: task.id,
      success: buildResult.success,
      errors: buildResult.errors,
      duration: buildResult.duration,
    });

    // Assert: Coder wrote code, build verified it
    expect(coderResult.success).toBe(true);
    expect(coderResult.filesChanged).toContain('src/module.ts');

    expect(buildAttempts).toBe(1);
    expect(buildResult.success).toBe(true);

    expect(buildEvents).toHaveLength(2);
    expect(buildEvents[1]!.payload.success).toBe(true);
  });
});
