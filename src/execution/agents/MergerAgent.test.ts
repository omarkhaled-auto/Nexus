/**
 * MergerAgent Tests
 *
 * Phase 14B Task 16: Tests for the MergerAgent implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MergerAgent, type MergeConflict, type MergeOutput } from './MergerAgent';
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
    id: 'task-merger-123',
    name: 'Resolve merge conflicts in feature branch',
    description: 'Merge feature-auth into main branch and resolve conflicts',
    type: 'auto',
    status: 'pending',
    createdAt: new Date(),
    files: ['src/auth/auth.ts', 'src/middleware/auth.ts'],
    testCriteria: [
      'All merge conflicts are resolved',
      'Code compiles without errors',
      'Tests pass after merge',
    ],
    estimatedMinutes: 30,
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-merger-123',
    featureId: 'feature-auth-456',
    projectId: 'project-789',
    workingDir: '/test/project',
    ...overrides,
  };
}

function createTestMergeOutput(): MergeOutput {
  return {
    success: true,
    conflicts: [
      {
        file: 'src/auth/auth.ts',
        type: 'content',
        severity: 'simple',
        description: 'Import statement conflict',
        ourChanges: 'Added import for jwt',
        theirChanges: 'Added import for auth-utils',
        suggestedResolution: 'Keep both imports',
        needsManualReview: false,
      },
      {
        file: 'src/middleware/auth.ts',
        type: 'content',
        severity: 'moderate',
        description: 'Function parameter differences',
        ourChanges: 'Added timeout parameter',
        theirChanges: 'Added retry parameter',
        suggestedResolution: 'Merge both parameters',
        needsManualReview: false,
      },
    ],
    resolutions: [
      {
        file: 'src/auth/auth.ts',
        strategy: 'merge',
        resolvedContent: 'import { jwt } from "jwt";\nimport { utils } from "auth-utils";',
        explanation: 'Both imports are needed for functionality',
      },
    ],
    unresolvedCount: 0,
    summary: 'All conflicts resolved successfully',
    requiresHumanReview: false,
  };
}

function createJsonOutput(output: MergeOutput): string {
  return `\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\`

[TASK_COMPLETE]`;
}

// ============================================================================
// Tests
// ============================================================================

describe('MergerAgent', () => {
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
      const agent = new MergerAgent(mockClient as unknown as any);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('merger');
    });

    it('should create agent with custom config', () => {
      const agent = new MergerAgent(mockClient as unknown as any, {
        maxIterations: 20,
        timeout: 60000,
      });
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentType', () => {
    it('should return "merger"', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      expect(agent.getAgentType()).toBe('merger');
    });
  });

  describe('execute', () => {
    it('should complete task when LLM returns [TASK_COMPLETE]', async () => {
      const mergeOutput = createTestMergeOutput();
      mockClient.chat.mockResolvedValueOnce({
        content: createJsonOutput(mergeOutput),
        usage: { totalTokens: 500 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.escalated).toBe(false);
      expect(result.output).toContain('[TASK_COMPLETE]');
    });

    it('should complete task when LLM says "merge complete"', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `
All conflicts have been analyzed and the merge is complete.
{"success": true, "conflicts": [], "resolutions": [], "unresolvedCount": 0, "summary": "Clean merge", "requiresHumanReview": false}
        `,
        usage: { totalTokens: 150 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should complete task when JSON output has success and conflicts fields', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: `{"success": true, "conflicts": [], "resolutions": [], "unresolvedCount": 0, "summary": "No conflicts", "requiresHumanReview": false}`,
        usage: { totalTokens: 100 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
    });

    it('should iterate until completion', async () => {
      mockClient.chat
        .mockResolvedValueOnce({
          content: 'Analyzing merge conflicts in auth.ts...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Found 2 conflicts, analyzing resolutions...',
          usage: { totalTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: createJsonOutput(createTestMergeOutput()),
          usage: { totalTokens: 200 },
        });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(mockClient.chat).toHaveBeenCalledTimes(3);
    });

    it('should escalate when max iterations reached', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still analyzing conflicts...',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any, { maxIterations: 3 });
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

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask({ name: 'Merge feature-payments' });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Merge feature-payments');
    });

    it('should include files with conflicts in prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask({
        files: ['src/conflict1.ts', 'src/conflict2.ts'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const userMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'user');
      expect(userMessage.content).toContain('src/conflict1.ts');
      expect(userMessage.content).toContain('src/conflict2.ts');
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          content: createJsonOutput(createTestMergeOutput()),
          usage: { totalTokens: 50 },
        });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('system prompt', () => {
    it('should include conflict classification in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('simple');
      expect(systemMessage.content).toContain('moderate');
      expect(systemMessage.content).toContain('complex');
      expect(systemMessage.content).toContain('critical');
    });

    it('should include safety rules in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage.content).toContain('NEVER');
      expect(systemMessage.content).toContain('critical');
      expect(systemMessage.content).toContain('human review');
    });

    it('should include output format in system prompt', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0][0];
      const systemMessage = callArgs.find((m: { role: string; content: string }) => m.role === 'system');
      expect(systemMessage.content).toContain('"success"');
      expect(systemMessage.content).toContain('"conflicts"');
      expect(systemMessage.content).toContain('[TASK_COMPLETE]');
    });
  });

  describe('parseMergeOutput', () => {
    it('should parse valid JSON output', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const output = createTestMergeOutput();
      const jsonString = createJsonOutput(output);

      const parsed = agent.parseMergeOutput(jsonString);

      expect(parsed).not.toBeNull();
      expect(parsed?.success).toBe(true);
      expect(parsed?.conflicts).toHaveLength(2);
      expect(parsed?.resolutions).toHaveLength(1);
    });

    it('should handle raw JSON without code blocks', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const output = createTestMergeOutput();
      const jsonString = JSON.stringify(output);

      const parsed = agent.parseMergeOutput(jsonString);

      expect(parsed).not.toBeNull();
      expect(parsed?.success).toBe(true);
    });

    it('should return null for invalid JSON', () => {
      const agent = new MergerAgent(mockClient as unknown as any);

      const parsed = agent.parseMergeOutput('Not valid JSON at all');

      expect(parsed).toBeNull();
    });

    it('should return null for undefined output', () => {
      const agent = new MergerAgent(mockClient as unknown as any);

      const parsed = agent.parseMergeOutput(undefined);

      expect(parsed).toBeNull();
    });

    it('should handle partial/missing fields gracefully', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const partialJson = '{"success": true}';

      const parsed = agent.parseMergeOutput(partialJson);

      expect(parsed).not.toBeNull();
      expect(parsed?.success).toBe(true);
      expect(parsed?.conflicts).toEqual([]);
      expect(parsed?.resolutions).toEqual([]);
    });
  });

  describe('getConflictCounts', () => {
    it('should count conflicts by severity', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'b.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'c.ts', type: 'content', severity: 'moderate', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'd.ts', type: 'content', severity: 'complex', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
        { file: 'e.ts', type: 'content', severity: 'critical', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
      ];

      const counts = agent.getConflictCounts(conflicts);

      expect(counts.simple).toBe(2);
      expect(counts.moderate).toBe(1);
      expect(counts.complex).toBe(1);
      expect(counts.critical).toBe(1);
    });

    it('should return all zeros for empty array', () => {
      const agent = new MergerAgent(mockClient as unknown as any);

      const counts = agent.getConflictCounts([]);

      expect(counts.simple).toBe(0);
      expect(counts.moderate).toBe(0);
      expect(counts.complex).toBe(0);
      expect(counts.critical).toBe(0);
    });
  });

  describe('getConflictsByType', () => {
    it('should count conflicts by type', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'b.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'c.ts', type: 'rename', severity: 'moderate', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'd.ts', type: 'delete-modify', severity: 'complex', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
        { file: 'e.ts', type: 'semantic', severity: 'moderate', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
      ];

      const counts = agent.getConflictsByType(conflicts);

      expect(counts.content).toBe(2);
      expect(counts.rename).toBe(1);
      expect(counts['delete-modify']).toBe(1);
      expect(counts.semantic).toBe(1);
      expect(counts.dependency).toBe(0);
    });
  });

  describe('canAutoComplete', () => {
    it('should return true for simple conflicts only', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'b.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(true);
    });

    it('should return true for simple and moderate conflicts without manual review', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
        { file: 'b.ts', type: 'content', severity: 'moderate', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(true);
    });

    it('should return false for critical conflicts', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'critical', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(false);
    });

    it('should return false for complex conflicts', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'complex', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(false);
    });

    it('should return false when any conflict needs manual review', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(false);
    });

    it('should return false for delete-modify conflicts', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'delete-modify', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      expect(agent.canAutoComplete(conflicts)).toBe(false);
    });
  });

  describe('getFilesNeedingReview', () => {
    it('should return files with needsManualReview flag', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'a.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: true },
        { file: 'b.ts', type: 'content', severity: 'simple', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      const files = agent.getFilesNeedingReview(conflicts);

      expect(files).toContain('a.ts');
      expect(files).not.toContain('b.ts');
    });

    it('should return files with critical severity', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'critical.ts', type: 'content', severity: 'critical', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      const files = agent.getFilesNeedingReview(conflicts);

      expect(files).toContain('critical.ts');
    });

    it('should return files with complex severity', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const conflicts: MergeConflict[] = [
        { file: 'complex.ts', type: 'content', severity: 'complex', description: '', ourChanges: '', theirChanges: '', needsManualReview: false },
      ];

      const files = agent.getFilesNeedingReview(conflicts);

      expect(files).toContain('complex.ts');
    });
  });

  describe('summarizeMerge', () => {
    it('should generate human-readable summary', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const output = createTestMergeOutput();

      const summary = agent.summarizeMerge(output);

      expect(summary).toContain('Merge Status: Success');
      expect(summary).toContain('Total Conflicts: 2');
      expect(summary).toContain('Unresolved: 0');
    });

    it('should include human review notice when required', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const output: MergeOutput = {
        ...createTestMergeOutput(),
        requiresHumanReview: true,
        conflicts: [
          {
            file: 'critical.ts',
            type: 'content',
            severity: 'critical',
            description: 'Critical issue',
            ourChanges: '',
            theirChanges: '',
            needsManualReview: true,
          },
        ],
      };

      const summary = agent.summarizeMerge(output);

      expect(summary).toContain('HUMAN REVIEW REQUIRED');
      expect(summary).toContain('critical.ts');
    });

    it('should include conflict breakdown', () => {
      const agent = new MergerAgent(mockClient as unknown as any);
      const output = createTestMergeOutput();

      const summary = agent.summarizeMerge(output);

      expect(summary).toContain('Conflict Breakdown:');
      expect(summary).toContain('Simple:');
      expect(summary).toContain('Moderate:');
      expect(summary).toContain('Complex:');
      expect(summary).toContain('Critical:');
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

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit task:completed event on success', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: createJsonOutput(createTestMergeOutput()),
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('task:completed', handler);

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit task:escalated event on max iterations', async () => {
      mockClient.chat.mockResolvedValue({
        content: 'Still analyzing...',
        usage: { totalTokens: 50 },
      });

      const eventBus = EventBus.getInstance();
      const handler = vi.fn();
      eventBus.on('task:escalated', handler);

      const agent = new MergerAgent(mockClient as unknown as any, { maxIterations: 2 });
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('result metrics', () => {
    it('should track iteration count', async () => {
      mockClient.chat
        .mockResolvedValueOnce({ content: 'Analyzing...', usage: { totalTokens: 50 } })
        .mockResolvedValueOnce({ content: '[TASK_COMPLETE]', usage: { totalTokens: 50 } });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.iterations).toBe(2);
      expect(result.metrics?.iterations).toBe(2);
    });

    it('should track token usage', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 350 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.metrics?.tokensUsed).toBe(350);
    });

    it('should track duration', async () => {
      mockClient.chat.mockResolvedValueOnce({
        content: '[TASK_COMPLETE]',
        usage: { totalTokens: 50 },
      });

      const agent = new MergerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
