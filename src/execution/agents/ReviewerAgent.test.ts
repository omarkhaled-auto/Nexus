/**
 * ReviewerAgent Tests
 *
 * Phase 14B Task 15: Tests for the ReviewerAgent implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReviewerAgent, type ReviewIssue, type ReviewOutput } from './ReviewerAgent';
import type { AgentContext } from './BaseAgentRunner';
import type { Task } from '../../types/task';
import { EventBus } from '../../orchestration/events/EventBus';

// ============================================================================
// Mock LLM Client
// ============================================================================

interface MockLLMClient {
  chat: ReturnType<typeof vi.fn>;
}

function createMockGeminiClient(): MockLLMClient {
  return {
    chat: vi.fn(),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-review-123',
    name: 'Review AuthService Implementation',
    description: 'Review the authentication service code for security and quality issues',
    type: 'auto',
    status: 'pending',
    createdAt: new Date(),
    files: ['src/services/AuthService.ts', 'src/middleware/auth.ts'],
    testCriteria: [
      'Check for SQL injection vulnerabilities',
      'Verify proper password hashing',
      'Review JWT token handling',
      'Check for rate limiting',
    ],
    estimatedMinutes: 15,
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-review-123',
    featureId: 'feature-auth-456',
    projectId: 'project-789',
    workingDir: '/test/project',
    ...overrides,
  };
}

function createMockReviewResponse(approved: boolean, issues: Partial<ReviewIssue>[] = []): string {
  const review: ReviewOutput = {
    approved,
    issues: issues.map((i) => ({
      severity: i.severity || 'minor',
      category: i.category || 'maintainability',
      file: i.file || 'unknown',
      line: i.line,
      message: i.message || 'Test issue',
      suggestion: i.suggestion,
    })),
    suggestions: ['Consider adding more logging'],
    summary: approved ? 'Code looks good, approved' : 'Issues found, needs revision',
  };

  return `\`\`\`json\n${JSON.stringify(review, null, 2)}\n\`\`\`\n\n[TASK_COMPLETE]`;
}

// ============================================================================
// Tests
// ============================================================================

describe('ReviewerAgent', () => {
  let mockClient: MockLLMClient;

  beforeEach(() => {
    mockClient = createMockGeminiClient();
    EventBus.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.resetInstance();
  });

  describe('constructor', () => {
    it('should create agent with default config', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('reviewer');
    });

    it('should create agent with custom config', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any, {
        maxIterations: 20,
        timeout: 60000,
      });
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentType', () => {
    it('should return "reviewer"', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      expect(agent.getAgentType()).toBe('reviewer');
    });
  });

  describe('execute', () => {
    it('should complete review with approved result', async () => {
      const response = createMockReviewResponse(true);
      mockClient.chat.mockResolvedValue({
        content: response,
        usage: { totalTokens: 1000 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.output).toContain('[TASK_COMPLETE]');
      expect(mockClient.chat).toHaveBeenCalled();
    });

    it('should complete review with issues found', async () => {
      const response = createMockReviewResponse(false, [
        {
          severity: 'critical',
          category: 'security',
          file: 'src/services/AuthService.ts',
          line: 42,
          message: 'SQL injection vulnerability found',
          suggestion: 'Use parameterized queries',
        },
      ]);
      mockClient.chat.mockResolvedValue({
        content: response,
        usage: { totalTokens: 1000 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('SQL injection');

      // Parse and verify the review output
      const review = agent.parseReviewOutput(result.output);
      expect(review).not.toBeNull();
      expect(review?.approved).toBe(false);
      expect(review?.issues).toHaveLength(1);
      expect(review?.issues[0].severity).toBe('critical');
    });

    it('should include files to review in prompt', async () => {
      mockClient.chat.mockResolvedValue({
        content: createMockReviewResponse(true),
        usage: { totalTokens: 500 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask({
        files: ['src/auth.ts', 'src/middleware.ts'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0];
      const prompt = callArgs[0].find((m: { role: string }) => m.role === 'user')?.content;
      expect(prompt).toContain('src/auth.ts');
      expect(prompt).toContain('src/middleware.ts');
    });

    it('should include review criteria in prompt', async () => {
      mockClient.chat.mockResolvedValue({
        content: createMockReviewResponse(true),
        usage: { totalTokens: 500 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask({
        testCriteria: ['Check XSS protection', 'Verify input validation'],
      });
      const context = createTestContext();

      await agent.execute(task, context);

      const callArgs = mockClient.chat.mock.calls[0];
      const prompt = callArgs[0].find((m: { role: string }) => m.role === 'user')?.content;
      expect(prompt).toContain('Check XSS protection');
      expect(prompt).toContain('Verify input validation');
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockResolvedValueOnce({
          content: createMockReviewResponse(true),
          usage: { totalTokens: 500 },
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any, {
        maxIterations: 5,
      });
      const task = createTestTask();
      const context = createTestContext();

      const result = await agent.execute(task, context);

      // Should retry and succeed
      expect(result.success).toBe(true);
      expect(mockClient.chat).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseReviewOutput', () => {
    it('should parse valid JSON review output', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const output = createMockReviewResponse(true, [
        { severity: 'minor', message: 'Consider renaming variable' },
      ]);

      const review = agent.parseReviewOutput(output);

      expect(review).not.toBeNull();
      expect(review?.approved).toBe(true);
      expect(review?.issues).toHaveLength(1);
      expect(review?.suggestions).toContain('Consider adding more logging');
    });

    it('should parse JSON without code blocks', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const output = JSON.stringify({
        approved: false,
        issues: [{ severity: 'major', message: 'Bug found', file: 'test.ts', category: 'correctness' }],
        suggestions: [],
        summary: 'Needs fixes',
      });

      const review = agent.parseReviewOutput(output);

      expect(review).not.toBeNull();
      expect(review?.approved).toBe(false);
      expect(review?.issues).toHaveLength(1);
    });

    it('should return null for invalid output', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const output = 'This is not JSON at all';

      const review = agent.parseReviewOutput(output);

      expect(review).toBeNull();
    });

    it('should return null for undefined output', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);

      const review = agent.parseReviewOutput(undefined);

      expect(review).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const output = '```json\n{ "approved": true, "issues": [broken json\n```';

      const review = agent.parseReviewOutput(output);

      expect(review).toBeNull();
    });
  });

  describe('getIssueCounts', () => {
    it('should count issues by severity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const issues: ReviewIssue[] = [
        { severity: 'critical', category: 'security', file: 'a.ts', message: 'Issue 1' },
        { severity: 'major', category: 'correctness', file: 'b.ts', message: 'Issue 2' },
        { severity: 'major', category: 'correctness', file: 'c.ts', message: 'Issue 3' },
        { severity: 'minor', category: 'style', file: 'd.ts', message: 'Issue 4' },
        { severity: 'suggestion', category: 'maintainability', file: 'e.ts', message: 'Issue 5' },
      ];

      const counts = agent.getIssueCounts(issues);

      expect(counts.critical).toBe(1);
      expect(counts.major).toBe(2);
      expect(counts.minor).toBe(1);
      expect(counts.suggestion).toBe(1);
    });

    it('should return zero counts for empty array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);

      const counts = agent.getIssueCounts([]);

      expect(counts.critical).toBe(0);
      expect(counts.major).toBe(0);
      expect(counts.minor).toBe(0);
      expect(counts.suggestion).toBe(0);
    });
  });

  describe('shouldApprove', () => {
    it('should not approve with critical issues', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const issues: ReviewIssue[] = [
        { severity: 'critical', category: 'security', file: 'a.ts', message: 'SQL injection' },
      ];

      expect(agent.shouldApprove(issues)).toBe(false);
    });

    it('should not approve with more than 2 major issues', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const issues: ReviewIssue[] = [
        { severity: 'major', category: 'correctness', file: 'a.ts', message: 'Issue 1' },
        { severity: 'major', category: 'correctness', file: 'b.ts', message: 'Issue 2' },
        { severity: 'major', category: 'correctness', file: 'c.ts', message: 'Issue 3' },
      ];

      expect(agent.shouldApprove(issues)).toBe(false);
    });

    it('should approve with 2 or fewer major issues and no criticals', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const issues: ReviewIssue[] = [
        { severity: 'major', category: 'correctness', file: 'a.ts', message: 'Issue 1' },
        { severity: 'major', category: 'correctness', file: 'b.ts', message: 'Issue 2' },
        { severity: 'minor', category: 'style', file: 'c.ts', message: 'Issue 3' },
      ];

      expect(agent.shouldApprove(issues)).toBe(true);
    });

    it('should approve with only minor and suggestion issues', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const issues: ReviewIssue[] = [
        { severity: 'minor', category: 'style', file: 'a.ts', message: 'Issue 1' },
        { severity: 'suggestion', category: 'maintainability', file: 'b.ts', message: 'Issue 2' },
      ];

      expect(agent.shouldApprove(issues)).toBe(true);
    });

    it('should approve with no issues', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);

      expect(agent.shouldApprove([])).toBe(true);
    });
  });

  describe('isTaskComplete', () => {
    it('should detect [TASK_COMPLETE] marker', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();

      // Access protected method via type assertion
      const isComplete = (agent as unknown as { isTaskComplete: (r: string, t: Task) => boolean })
        .isTaskComplete('Review done [TASK_COMPLETE]', task);

      expect(isComplete).toBe(true);
    });

    it('should detect JSON review output as complete', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const response = '{"approved": true, "issues": [], "summary": "All good"}';

      // Access protected method via type assertion
      const isComplete = (agent as unknown as { isTaskComplete: (r: string, t: Task) => boolean })
        .isTaskComplete(response, task);

      expect(isComplete).toBe(true);
    });

    it('should detect completion phrases', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();

      const phrases = [
        'Review complete',
        'Code review complete',
        'Finished reviewing the code',
      ];

      for (const phrase of phrases) {
        const isComplete = (agent as unknown as { isTaskComplete: (r: string, t: Task) => boolean })
          .isTaskComplete(phrase, task);
        expect(isComplete).toBe(true);
      }
    });

    it('should not detect incomplete responses', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();

      const isComplete = (agent as unknown as { isTaskComplete: (r: string, t: Task) => boolean })
        .isTaskComplete('Still analyzing the code...', task);

      expect(isComplete).toBe(false);
    });
  });

  describe('event emission', () => {
    it('should emit events during review execution', async () => {
      const response = createMockReviewResponse(true);
      mockClient.chat.mockResolvedValue({
        content: response,
        usage: { totalTokens: 500 },
      });

      const eventBus = EventBus.getInstance();
      const events: string[] = [];
      eventBus.on('agent:started', () => events.push('started'));
      eventBus.on('agent:progress', () => events.push('progress'));
      eventBus.on('task:completed', () => events.push('completed'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = new ReviewerAgent(mockClient as unknown as any);
      const task = createTestTask();
      const context = createTestContext();

      await agent.execute(task, context);

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });
  });
});
