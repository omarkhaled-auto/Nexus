/**
 * Tests for EscalationHandler
 *
 * This test suite covers:
 * - Escalation report generation
 * - Checkpoint creation
 * - Human notification
 * - Action suggestions
 * - File saving
 * - Different escalation reasons
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EscalationHandler,
  createTestEscalationHandler,
  createMockEscalationGitExecutor,
  createMockFileSystem,
  DEFAULT_ESCALATION_HANDLER_OPTIONS,
} from './EscalationHandler';
import type {
  IterationContext,
  EscalationReason,
  ErrorEntry,
  TaskSpec,
  TaskContext,
} from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock iteration context for testing
 */
function createMockIterationContext(overrides?: Partial<IterationContext>): IterationContext {
  const taskSpec: TaskSpec = {
    id: 'test-task-123',
    name: 'Test Task',
    description: 'A test task for escalation',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Feature works correctly'],
    dependencies: [],
    estimatedTime: 30,
  };

  const taskContext: TaskContext = {
    repoMap: 'mock repo map',
    codebaseDocs: {
      architectureSummary: 'Mock architecture',
      relevantPatterns: [],
      relevantAPIs: [],
    },
    projectConfig: {
      name: 'test-project',
      path: '/test/project',
    },
    taskSpec,
    relevantFiles: [],
    relevantMemories: [],
    conversationHistory: [],
    tokenCount: 1000,
    generatedAt: new Date(),
  };

  return {
    task: taskSpec,
    iteration: 5,
    options: {
      maxIterations: 10,
      commitEachIteration: true,
      includeGitDiff: true,
      includePreviousErrors: true,
      escalateAfter: 10,
      timeoutMinutes: 60,
    },
    previousErrors: [],
    taskContext,
    ...overrides,
  };
}

/**
 * Create mock error entries
 */
function createMockErrors(count: number = 3): ErrorEntry[] {
  const types: Array<'build' | 'lint' | 'test' | 'review'> = ['build', 'lint', 'test', 'review'];
  const errors: ErrorEntry[] = [];

  for (let i = 0; i < count; i++) {
    errors.push({
      type: types[i % types.length],
      severity: 'error',
      message: `Error ${i + 1}: Something went wrong`,
      file: `src/file${i}.ts`,
      line: 10 + i,
      column: 5,
      code: `ERR${i}`,
      suggestion: `Fix by doing X for error ${i + 1}`,
      iteration: Math.ceil((i + 1) / 2),
    });
  }

  return errors;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('EscalationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to prevent noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create handler with default options', () => {
      const gitExecutor = createMockEscalationGitExecutor();
      const fileSystem = createMockFileSystem();

      const handler = new EscalationHandler(gitExecutor, fileSystem, '/test/project');

      expect(handler).toBeDefined();
    });

    it('should create handler with custom options', () => {
      const gitExecutor = createMockEscalationGitExecutor();
      const fileSystem = createMockFileSystem();

      const handler = new EscalationHandler(gitExecutor, fileSystem, '/test/project', {
        checkpointDirectory: 'custom/escalations',
        checkpointTagPrefix: 'custom-cp',
      });

      expect(handler).toBeDefined();
    });

    it('should create handler with notification handler', async () => {
      const notificationHandler = vi.fn().mockResolvedValue(undefined);
      const { handler } = createTestEscalationHandler({}, { notificationHandler });
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      expect(notificationHandler).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Escalation Tests
  // ==========================================================================

  describe('escalate', () => {
    it('should generate escalation report with correct fields', async () => {
      const { handler } = createTestEscalationHandler({ headCommit: 'abc123' });
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(report.taskId).toBe('test-task');
      expect(report.reason).toBe('max_iterations');
      expect(report.iterationsCompleted).toBe(5);
      expect(report.checkpointCommit).toBe('abc123');
      expect(report.createdAt).toBeInstanceOf(Date);
      expect(report.summary).toBeTruthy();
      expect(report.suggestedActions).toBeInstanceOf(Array);
      expect(report.lastErrors).toBeInstanceOf(Array);
    });

    it('should include last errors in report', async () => {
      const { handler } = createTestEscalationHandler();
      const errors = createMockErrors(5);
      const context = createMockIterationContext({ previousErrors: errors });

      const report = await handler.escalate('test-task', 'repeated_failures', context);

      expect(report.lastErrors.length).toBe(5);
    });

    it('should limit last errors to 10', async () => {
      const { handler } = createTestEscalationHandler();
      const errors = createMockErrors(15);
      const context = createMockIterationContext({ previousErrors: errors });

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(report.lastErrors.length).toBe(10);
    });

    it('should generate appropriate summary for max_iterations', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(report.summary).toContain('maximum iteration limit');
      expect(report.summary).toContain('10'); // maxIterations
    });

    it('should generate appropriate summary for timeout', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'timeout', context);

      expect(report.summary).toContain('time limit');
      expect(report.summary).toContain('60'); // timeoutMinutes
    });

    it('should generate appropriate summary for repeated_failures', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'repeated_failures', context);

      expect(report.summary).toContain('same error repeatedly');
    });

    it('should generate appropriate summary for blocking_error', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'blocking_error', context);

      expect(report.summary).toContain('blocking error');
    });

    it('should generate appropriate summary for agent_request', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'agent_request', context);

      expect(report.summary).toContain('explicitly requested human assistance');
    });
  });

  // ==========================================================================
  // Suggested Actions Tests
  // ==========================================================================

  describe('suggested actions', () => {
    it('should suggest breaking into subtasks for max_iterations', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'max_iterations', context);

      const hasSubtaskSuggestion = report.suggestedActions.some(
        action => action.toLowerCase().includes('subtask') || action.toLowerCase().includes('smaller')
      );
      expect(hasSubtaskSuggestion).toBe(true);
    });

    it('should suggest time limit increase for timeout', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'timeout', context);

      const hasTimeSuggestion = report.suggestedActions.some(
        action => action.toLowerCase().includes('time limit')
      );
      expect(hasTimeSuggestion).toBe(true);
    });

    it('should suggest reviewing errors for repeated_failures', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'repeated_failures', context);

      const hasReviewSuggestion = report.suggestedActions.some(
        action => action.toLowerCase().includes('review') && action.toLowerCase().includes('error')
      );
      expect(hasReviewSuggestion).toBe(true);
    });

    it('should include suggestions based on error types', async () => {
      const { handler } = createTestEscalationHandler();
      const errors: ErrorEntry[] = [
        { type: 'build', severity: 'error', message: 'Build failed', iteration: 1 },
        { type: 'test', severity: 'error', message: 'Test failed', iteration: 2 },
      ];
      const context = createMockIterationContext({ previousErrors: errors });

      const report = await handler.escalate('test-task', 'max_iterations', context);

      const hasBuildSuggestion = report.suggestedActions.some(
        action => action.toLowerCase().includes('build') || action.toLowerCase().includes('compilation')
      );
      const hasTestSuggestion = report.suggestedActions.some(
        action => action.toLowerCase().includes('test')
      );
      expect(hasBuildSuggestion).toBe(true);
      expect(hasTestSuggestion).toBe(true);
    });

    it('should include checkpoint recovery instruction', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'max_iterations', context);

      const hasCheckpointAction = report.suggestedActions.some(
        action => action.toLowerCase().includes('checkpoint')
      );
      expect(hasCheckpointAction).toBe(true);
    });
  });

  // ==========================================================================
  // Checkpoint Tests
  // ==========================================================================

  describe('createCheckpoint', () => {
    it('should create checkpoint without uncommitted changes', async () => {
      const { handler, gitExecutor } = createTestEscalationHandler({
        hasChanges: false,
        headCommit: 'abc123',
      });

      const commit = await handler.createCheckpoint('test-task');

      expect(commit).toBe('abc123');
      // Should not have committed (no add or commit commands)
      const hasCommit = gitExecutor.commands.some(c => c[0] === 'commit');
      expect(hasCommit).toBe(false);
    });

    it('should commit changes when uncommitted changes exist', async () => {
      const { handler, gitExecutor } = createTestEscalationHandler({
        hasChanges: true,
        headCommit: 'abc123',
      });

      await handler.createCheckpoint('test-task');

      // Should have staged changes
      const hasAdd = gitExecutor.commands.some(c => c[0] === 'add' && c[1] === '-A');
      expect(hasAdd).toBe(true);

      // Should have committed
      const hasCommit = gitExecutor.commands.some(c => c[0] === 'commit');
      expect(hasCommit).toBe(true);
    });

    it('should create tag for checkpoint', async () => {
      const { handler, gitExecutor } = createTestEscalationHandler({
        headCommit: 'abc123',
      });

      await handler.createCheckpoint('test-task');

      // Should have created tag
      const hasTag = gitExecutor.commands.some(
        c => c[0] === 'tag' && c[1] === 'checkpoint-test-tas' && c[2] === 'abc123'
      );
      expect(hasTag).toBe(true);
    });

    it('should truncate long task IDs in tag name', async () => {
      const { handler, gitExecutor } = createTestEscalationHandler({
        headCommit: 'abc123',
      });

      await handler.createCheckpoint('very-long-task-id-that-exceeds-8-chars');

      // Should truncate to 8 chars
      const hasTag = gitExecutor.commands.some(
        c => c[0] === 'tag' && c[1] === 'checkpoint-very-lon'
      );
      expect(hasTag).toBe(true);
    });
  });

  // ==========================================================================
  // Notification Tests
  // ==========================================================================

  describe('notifyHuman', () => {
    it('should log notification to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedContent = consoleSpy.mock.calls.flat().join('\n');
      expect(loggedContent).toContain('ESCALATION NOTIFICATION');
    });

    it('should call custom notification handler', async () => {
      const notificationHandler = vi.fn().mockResolvedValue(undefined);
      const { handler } = createTestEscalationHandler({}, { notificationHandler });
      const context = createMockIterationContext();

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(notificationHandler).toHaveBeenCalledWith(report);
    });
  });

  // ==========================================================================
  // File Saving Tests
  // ==========================================================================

  describe('file saving', () => {
    it('should create checkpoint directory if not exists', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      // Should have called mkdir
      const hasDir = fileSystem.writtenFiles.size > 0;
      expect(hasDir).toBe(true);
    });

    it('should save JSON report', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const jsonFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.json')
      );
      expect(jsonFiles.length).toBe(1);

      const jsonContent = fileSystem.writtenFiles.get(jsonFiles[0]);
      expect(jsonContent).toBeDefined();
      const parsed = JSON.parse(jsonContent!);
      expect(parsed.taskId).toBe('test-task');
    });

    it('should save human-readable markdown report', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const mdFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.md')
      );
      expect(mdFiles.length).toBe(1);

      const mdContent = fileSystem.writtenFiles.get(mdFiles[0]);
      expect(mdContent).toBeDefined();
      expect(mdContent).toContain('# Escalation Report');
    });

    it('should skip JSON report when disabled', async () => {
      const { handler, fileSystem } = createTestEscalationHandler(
        {},
        { saveJsonReport: false }
      );
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const jsonFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.json')
      );
      expect(jsonFiles.length).toBe(0);
    });

    it('should skip markdown report when disabled', async () => {
      const { handler, fileSystem } = createTestEscalationHandler(
        {},
        { saveHumanReadableReport: false }
      );
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const mdFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.md')
      );
      expect(mdFiles.length).toBe(0);
    });

    it('should use custom checkpoint directory', async () => {
      const { handler, fileSystem } = createTestEscalationHandler(
        {},
        { checkpointDirectory: 'custom/path' }
      );
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const hasCustomPath = Array.from(fileSystem.writtenFiles.keys()).some(
        k => k.includes('custom/path')
      );
      expect(hasCustomPath).toBe(true);
    });
  });

  // ==========================================================================
  // Markdown Report Tests
  // ==========================================================================

  describe('markdown report format', () => {
    it('should include overview table', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const mdFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.md')
      );
      const mdContent = fileSystem.writtenFiles.get(mdFiles[0])!;

      expect(mdContent).toContain('| Field | Value |');
      expect(mdContent).toContain('| Task ID |');
      expect(mdContent).toContain('| Reason |');
    });

    it('should include errors section when errors present', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const context = createMockIterationContext({
        previousErrors: createMockErrors(3),
      });

      await handler.escalate('test-task', 'repeated_failures', context);

      const mdFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.md')
      );
      const mdContent = fileSystem.writtenFiles.get(mdFiles[0])!;

      expect(mdContent).toContain('## Last Errors');
    });

    it('should include recovery instructions', async () => {
      const { handler, fileSystem } = createTestEscalationHandler({
        headCommit: 'abc123',
      });
      const context = createMockIterationContext();

      await handler.escalate('test-task', 'max_iterations', context);

      const mdFiles = Array.from(fileSystem.writtenFiles.keys()).filter(
        k => k.endsWith('.md')
      );
      const mdContent = fileSystem.writtenFiles.get(mdFiles[0])!;

      expect(mdContent).toContain('## Recovery');
      expect(mdContent).toContain('git checkout abc123');
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('factory functions', () => {
    it('createTestEscalationHandler should return handler and dependencies', () => {
      const result = createTestEscalationHandler();

      expect(result.handler).toBeInstanceOf(EscalationHandler);
      expect(result.gitExecutor).toBeDefined();
      expect(result.gitExecutor.commands).toBeInstanceOf(Array);
      expect(result.fileSystem).toBeDefined();
      expect(result.fileSystem.writtenFiles).toBeInstanceOf(Map);
    });

    it('createMockEscalationGitExecutor should track commands', async () => {
      const executor = createMockEscalationGitExecutor();

      await executor.run(['status']);
      await executor.run(['add', '-A']);

      expect(executor.commands).toHaveLength(2);
      expect(executor.commands[0]).toEqual(['status']);
      expect(executor.commands[1]).toEqual(['add', '-A']);
    });

    it('createMockFileSystem should track written files', async () => {
      const fs = createMockFileSystem();

      await fs.writeFile('/test/file.txt', 'content');
      await fs.writeFile('/test/other.txt', 'other');

      expect(fs.writtenFiles.size).toBe(2);
      expect(fs.writtenFiles.get('/test/file.txt')).toBe('content');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty task name', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext();
      context.task.name = '';

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(report.summary).toBeDefined();
    });

    it('should handle empty errors array', async () => {
      const { handler } = createTestEscalationHandler();
      const context = createMockIterationContext({ previousErrors: [] });

      const report = await handler.escalate('test-task', 'max_iterations', context);

      expect(report.lastErrors).toHaveLength(0);
    });

    it('should handle very long error messages', async () => {
      const { handler, fileSystem } = createTestEscalationHandler();
      const longMessage = 'A'.repeat(1000);
      const context = createMockIterationContext({
        previousErrors: [{
          type: 'build',
          severity: 'error',
          message: longMessage,
          iteration: 1,
        }],
      });

      const report = await handler.escalate('test-task', 'blocking_error', context);

      expect(report.lastErrors[0].message).toBe(longMessage);
    });

    it('should handle all escalation reason types', async () => {
      const reasons: EscalationReason[] = [
        'max_iterations',
        'timeout',
        'repeated_failures',
        'blocking_error',
        'agent_request',
      ];

      for (const reason of reasons) {
        const { handler } = createTestEscalationHandler();
        const context = createMockIterationContext();

        const report = await handler.escalate('test-task', reason, context);

        expect(report.reason).toBe(reason);
        expect(report.summary).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // Default Options Tests
  // ==========================================================================

  describe('default options', () => {
    it('should have correct default checkpoint directory', () => {
      expect(DEFAULT_ESCALATION_HANDLER_OPTIONS.checkpointDirectory).toBe('.nexus/escalations');
    });

    it('should have correct default checkpoint tag prefix', () => {
      expect(DEFAULT_ESCALATION_HANDLER_OPTIONS.checkpointTagPrefix).toBe('checkpoint');
    });

    it('should enable JSON report by default', () => {
      expect(DEFAULT_ESCALATION_HANDLER_OPTIONS.saveJsonReport).toBe(true);
    });

    it('should enable human-readable report by default', () => {
      expect(DEFAULT_ESCALATION_HANDLER_OPTIONS.saveHumanReadableReport).toBe(true);
    });
  });
});
