/**
 * Milestone 3: Agents Work - Integration Tests
 *
 * Master Book Reference: Section 4.4
 *
 * These tests verify the LLM clients, agent runners, and QA loop
 * work correctly as an integrated system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMProvider } from '../../llm/LLMProvider';
import { MockClaudeClient } from '../../llm/clients/MockClaudeClient';
import { MockGeminiClient } from '../../llm/clients/MockGeminiClient';
import { CoderRunner } from '../../execution/agents/CoderRunner';
import { TesterRunner } from '../../execution/agents/TesterRunner';
import { ReviewerRunner } from '../../execution/agents/ReviewerRunner';
import { MergerRunner } from '../../execution/agents/MergerRunner';
import { QALoopEngine } from '../../execution/qa-loop/QALoopEngine';
import { loadPrompt, clearPromptCache } from '../../execution/agents/PromptLoader';
import type { Task, ExecutionResult } from '../../execution/agents/types';
import type { BuildVerifier } from '../../quality/build/BuildVerifier';
import type { LintRunner } from '../../quality/lint/LintRunner';
import type { TestRunner } from '../../quality/test/TestRunner';
import type { CodeReviewer } from '../../quality/review/CodeReviewer';
import type { LLMClient, ToolDefinition, Message, LLMResponse } from '../../llm/types';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockLLMClient(): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({
      content: 'Mock response',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(10),
  } as unknown as LLMClient;
}

function createMockToolExecutor() {
  return {
    execute: vi.fn().mockResolvedValue({ success: true, output: 'Tool executed' }),
    getAvailableTools: vi.fn().mockReturnValue([
      {
        name: 'read_file',
        description: 'Read a file',
        inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      },
      {
        name: 'write_file',
        description: 'Write a file',
        inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      },
    ]),
  };
}

function createMockBuildVerifier(): BuildVerifier {
  return {
    verify: vi.fn().mockResolvedValue({
      success: true,
      errors: [],
      warnings: [],
      duration: 100,
    }),
    parseErrors: vi.fn(),
  } as unknown as BuildVerifier;
}

function createMockLintRunner(): LintRunner {
  return {
    run: vi.fn().mockResolvedValue({
      success: true,
      errors: [],
      warnings: [],
      duration: 50,
    }),
    runWithFix: vi.fn(),
    parseOutput: vi.fn(),
  } as unknown as LintRunner;
}

function createMockTestRunner(): TestRunner {
  return {
    run: vi.fn().mockResolvedValue({
      success: true,
      passed: 5,
      failed: 0,
      skipped: 0,
      failures: [],
      duration: 200,
    }),
    runWithCoverage: vi.fn(),
    parseOutput: vi.fn(),
  } as unknown as TestRunner;
}

function createMockCodeReviewer(): CodeReviewer {
  return {
    review: vi.fn().mockResolvedValue({
      approved: true,
      hasBlockingIssues: false,
      issues: [],
      summary: 'Code looks good',
    }),
    reviewDiff: vi.fn(),
  } as unknown as CodeReviewer;
}

function createTask(id: string, name: string): Task {
  return {
    id,
    name,
    description: `Task: ${name}`,
    files: ['src/utils.ts'],
    test: 'vitest',
    worktree: '/tmp/test-worktree',
  };
}

// ============================================================================
// Milestone 3 Integration Tests
// ============================================================================

describe('Milestone 3: Agents Work', () => {
  beforeEach(() => {
    clearPromptCache();
  });

  // ===========================================================================
  // LLMProvider Mock Mode Integration
  // ===========================================================================

  describe('LLMProvider Mock Mode', () => {
    it('should use mock mode for LLM clients', () => {
      const provider = new LLMProvider({
        anthropicApiKey: 'test-key',
        googleApiKey: 'test-key',
        mockMode: true,
      });

      expect(provider.isMockMode()).toBe(true);
      expect(provider.getMockClaudeClient()).toBeDefined();
      expect(provider.getMockGeminiClient()).toBeDefined();
    });

    it('should configure mock responses', async () => {
      const provider = new LLMProvider({
        anthropicApiKey: 'test-key',
        googleApiKey: 'test-key',
        mockMode: true,
        mockConfig: {
          claude: {
            defaultResponse: 'Custom mock response',
          },
        },
      });

      const mockClient = provider.getMockClaudeClient();
      expect(mockClient).toBeInstanceOf(MockClaudeClient);

      const response = await provider.chat('coder', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.content).toBe('Custom mock response');
    });

    it('should track usage stats in mock mode', async () => {
      const provider = new LLMProvider({
        anthropicApiKey: 'test-key',
        googleApiKey: 'test-key',
        mockMode: true,
      });

      await provider.chat('coder', [{ role: 'user', content: 'Test message' }]);

      const stats = provider.getUsageStats();
      expect(stats.total.calls).toBe(1);
      expect(stats.byAgent.coder.calls).toBe(1);
    });

    it('should throw when accessing mock clients in real mode', () => {
      const provider = new LLMProvider({
        anthropicApiKey: 'test-key',
        googleApiKey: 'test-key',
        mockMode: false,
      });

      expect(() => provider.getMockClaudeClient()).toThrow(
        'getMockClaudeClient() only available in mock mode'
      );
      expect(() => provider.getMockGeminiClient()).toThrow(
        'getMockGeminiClient() only available in mock mode'
      );
    });
  });

  // ===========================================================================
  // Agent Runners Integration
  // ===========================================================================

  describe('Agent Runners Integration', () => {
    let mockLLMClient: LLMClient;
    let mockToolExecutor: ReturnType<typeof createMockToolExecutor>;

    beforeEach(() => {
      mockLLMClient = createMockLLMClient();
      mockToolExecutor = createMockToolExecutor();
    });

    it('should create CoderRunner with correct agent type', () => {
      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });

      expect(coder.agentType).toBe('coder');
      expect(coder.systemPrompt).toBeTruthy();
    });

    it('should create TesterRunner with correct agent type', () => {
      const tester = new TesterRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });

      expect(tester.agentType).toBe('tester');
      expect(tester.systemPrompt).toBeTruthy();
    });

    it('should create ReviewerRunner with correct agent type', () => {
      const reviewer = new ReviewerRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });

      expect(reviewer.agentType).toBe('reviewer');
      expect(reviewer.systemPrompt).toBeTruthy();
    });

    it('should create MergerRunner with correct agent type', () => {
      const merger = new MergerRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });

      expect(merger.agentType).toBe('merger');
      expect(merger.systemPrompt).toBeTruthy();
    });

    it('should execute code generation task', async () => {
      // Configure mock to return a completion response
      vi.mocked(mockLLMClient.chat).mockResolvedValue({
        content: 'I have created the utils.ts file with the date formatting function.',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        finishReason: 'stop',
      });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const task = createTask('task-001', 'Create utils.ts');
      task.description = 'Create a utility function that formats dates';

      const result = await coder.execute(task);

      expect(result.success).toBe(true);
      expect(result.output).toContain('utils.ts');
      expect(mockLLMClient.chat).toHaveBeenCalled();
    });

    it('should handle tool calls during execution', async () => {
      // First call returns tool use, second call returns completion
      vi.mocked(mockLLMClient.chat)
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [
            {
              id: 'tool-1',
              name: 'write_file',
              arguments: { path: 'src/utils.ts', content: 'export function formatDate() {}' },
            },
          ],
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          finishReason: 'tool_use',
        })
        .mockResolvedValueOnce({
          content: 'File created successfully.',
          usage: { inputTokens: 150, outputTokens: 30, totalTokens: 180 },
          finishReason: 'stop',
        });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const task = createTask('task-002', 'Create file');

      const result = await coder.execute(task);

      expect(result.success).toBe(true);
      expect(mockToolExecutor.execute).toHaveBeenCalledWith(
        'write_file',
        expect.objectContaining({ path: 'src/utils.ts' })
      );
    });

    it('should support fixIssues method on CoderRunner', async () => {
      vi.mocked(mockLLMClient.chat).mockResolvedValue({
        content: 'Fixed the issues.',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const task = createTask('task-003', 'Original task');

      // First execute to set currentTask
      await coder.execute(task);

      // Then call fixIssues
      const fixResult = await coder.fixIssues([
        'TypeError: Cannot read property x of undefined',
        'Missing import statement',
      ]);

      expect(fixResult.success).toBe(true);
    });
  });

  // ===========================================================================
  // PromptLoader Integration
  // ===========================================================================

  describe('PromptLoader Integration', () => {
    it('should load prompts for all agent types', () => {
      const coderPrompt = loadPrompt('coder');
      const testerPrompt = loadPrompt('tester');
      const reviewerPrompt = loadPrompt('reviewer');
      const mergerPrompt = loadPrompt('merger');

      expect(coderPrompt).toBeTruthy();
      expect(testerPrompt).toBeTruthy();
      expect(reviewerPrompt).toBeTruthy();
      expect(mergerPrompt).toBeTruthy();
    });

    it('should cache prompts after first load', () => {
      const prompt1 = loadPrompt('coder');
      const prompt2 = loadPrompt('coder');

      expect(prompt1).toBe(prompt2); // Same reference due to caching
    });

    it('should clear cache when requested', () => {
      loadPrompt('coder');
      clearPromptCache();

      // After clearing, a fresh load should work
      const freshPrompt = loadPrompt('coder');
      expect(freshPrompt).toBeTruthy();
    });
  });

  // ===========================================================================
  // QALoopEngine Integration
  // ===========================================================================

  describe('QALoopEngine Integration', () => {
    let buildVerifier: BuildVerifier;
    let lintRunner: LintRunner;
    let testRunner: TestRunner;
    let codeReviewer: CodeReviewer;
    let mockLLMClient: LLMClient;
    let mockToolExecutor: ReturnType<typeof createMockToolExecutor>;

    beforeEach(() => {
      buildVerifier = createMockBuildVerifier();
      lintRunner = createMockLintRunner();
      testRunner = createMockTestRunner();
      codeReviewer = createMockCodeReviewer();
      mockLLMClient = createMockLLMClient();
      mockToolExecutor = createMockToolExecutor();
    });

    it('should run QA loop to completion', async () => {
      const qaEngine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
      });

      vi.mocked(mockLLMClient.chat).mockResolvedValue({
        content: 'Task completed.',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const task = createTask('task-qa-001', 'QA test task');

      const result = await qaEngine.run(task, coder);

      expect(result.success).toBe(true);
      expect(result.iterations).toBeLessThanOrEqual(50);
      expect(result.stages).toHaveLength(4);
      expect(result.stages.map((s) => s.stage)).toEqual(['build', 'lint', 'test', 'review']);
    });

    it('should escalate after max iterations', async () => {
      const qaEngine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
        maxIterations: 3,
      });

      // Build always fails
      vi.mocked(buildVerifier.verify).mockResolvedValue({
        success: false,
        errors: [{ type: 'build', file: 'test.ts', message: 'Persistent error' }],
        warnings: [],
        duration: 100,
      });

      vi.mocked(mockLLMClient.chat).mockResolvedValue({
        content: 'Attempted fix.',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const impossibleTask = createTask('task-impossible', 'Impossible task');

      // Pre-execute the task so coder has currentTask set for fixIssues
      await coder.execute(impossibleTask);

      const result = await qaEngine.run(impossibleTask, coder);

      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(result.iterations).toBe(3);
    });

    it('should fix issues and retry on stage failure', async () => {
      const qaEngine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
      });

      // Build fails first, then succeeds
      vi.mocked(buildVerifier.verify)
        .mockResolvedValueOnce({
          success: false,
          errors: [{ type: 'build', file: 'test.ts', message: 'Type error' }],
          warnings: [],
          duration: 100,
        })
        .mockResolvedValue({
          success: true,
          errors: [],
          warnings: [],
          duration: 100,
        });

      vi.mocked(mockLLMClient.chat).mockResolvedValue({
        content: 'Fixed the type error.',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const coder = new CoderRunner({ llmClient: mockLLMClient, toolExecutor: mockToolExecutor });
      const task = createTask('task-fix-001', 'Fix task');

      // Pre-execute the task so coder has currentTask set for fixIssues
      await coder.execute(task);

      const result = await qaEngine.run(task, coder);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
      expect(coder.fixIssues).toBeDefined();
    });

    it('should run individual stages', async () => {
      const qaEngine = new QALoopEngine({
        buildVerifier,
        lintRunner,
        testRunner,
        codeReviewer,
      });

      const buildResult = await qaEngine.runStage('build', '/tmp/project');
      expect(buildResult.success).toBe(true);
      expect(buildVerifier.verify).toHaveBeenCalledWith('/tmp/project');

      const lintResult = await qaEngine.runStage('lint', '/tmp/project');
      expect(lintResult.success).toBe(true);
      expect(lintRunner.run).toHaveBeenCalledWith('/tmp/project');

      const testResult = await qaEngine.runStage('test', '/tmp/project', 'MyClass');
      expect(testResult.success).toBe(true);
      expect(testRunner.run).toHaveBeenCalledWith('/tmp/project', 'MyClass');
    });
  });

  // ===========================================================================
  // Mock Clients Integration
  // ===========================================================================

  describe('Mock Clients Integration', () => {
    it('should simulate Claude responses with patterns', async () => {
      const mockClient = new MockClaudeClient({
        responsePatterns: [
          {
            pattern: /create.*file/i,
            response: 'I will create the file for you.',
            toolCalls: [
              {
                id: 'tool-1',
                name: 'write_file',
                arguments: { path: 'test.ts', content: '// test' },
              },
            ],
          },
        ],
      });

      const response = await mockClient.chat([
        { role: 'user', content: 'Please create a file' },
      ]);

      expect(response.content).toBe('I will create the file for you.');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('write_file');
    });

    it('should simulate Gemini responses', async () => {
      const mockClient = new MockGeminiClient({
        defaultResponse: 'Gemini analysis complete.',
      });

      const response = await mockClient.chat([
        { role: 'user', content: 'Review this code' },
      ]);

      expect(response.content).toBe('Gemini analysis complete.');
      expect(response.finishReason).toBe('stop');
    });

    it('should track call history for testing', async () => {
      const mockClient = new MockClaudeClient();

      await mockClient.chat([{ role: 'user', content: 'First call' }]);
      await mockClient.chat([{ role: 'user', content: 'Second call' }]);

      const history = mockClient.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].messages[0].content).toBe('First call');
      expect(history[1].messages[0].content).toBe('Second call');
    });

    it('should simulate errors when configured', async () => {
      const mockClient = new MockClaudeClient({
        shouldFail: true,
        errorMessage: 'API rate limit exceeded',
      });

      await expect(
        mockClient.chat([{ role: 'user', content: 'Test' }])
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should stream responses', async () => {
      const mockClient = new MockClaudeClient({
        defaultResponse: 'Hello world',
      });

      const chunks: string[] = [];
      for await (const chunk of mockClient.chatStream([
        { role: 'user', content: 'Hi' },
      ])) {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks.join('')).toContain('Hello');
      expect(chunks.join('')).toContain('world');
    });
  });

  // ===========================================================================
  // End-to-End Agent Workflow
  // ===========================================================================

  describe('End-to-End Agent Workflow', () => {
    it('should complete full agent execution cycle', async () => {
      // Setup mock provider
      const provider = new LLMProvider({
        anthropicApiKey: 'test',
        googleApiKey: 'test',
        mockMode: true,
        mockConfig: {
          claude: {
            defaultResponse: 'Task completed successfully. Created the requested file.',
          },
        },
      });

      const mockToolExecutor = createMockToolExecutor();

      // Create coder using mock client
      const coder = new CoderRunner({
        llmClient: provider.getMockClaudeClient(),
        toolExecutor: mockToolExecutor,
      });

      // Execute task
      const task = createTask('e2e-001', 'End-to-end test');
      const result = await coder.execute(task);

      // Verify
      expect(result.success).toBe(true);
      expect(provider.getMockClaudeClient().getCallHistory().length).toBeGreaterThan(0);
    });

    it('should run multiple agents in sequence', async () => {
      const mockClient = new MockClaudeClient({
        defaultResponse: 'Done',
      });
      const mockToolExecutor = createMockToolExecutor();

      const coder = new CoderRunner({ llmClient: mockClient, toolExecutor: mockToolExecutor });
      const tester = new TesterRunner({ llmClient: mockClient, toolExecutor: mockToolExecutor });

      const codeTask = createTask('multi-001', 'Write code');
      const testTask = createTask('multi-002', 'Write tests');

      const codeResult = await coder.execute(codeTask);
      const testResult = await tester.execute(testTask);

      expect(codeResult.success).toBe(true);
      expect(testResult.success).toBe(true);
      expect(mockClient.getCallHistory().length).toBe(2);
    });
  });
});
