/**
 * FreshContextManager Tests
 *
 * Tests for the Fresh Context Manager that builds clean, relevant context
 * for agent tasks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FreshContextManager,
  createFreshContextManager,
  createTestFreshContextManager,
} from './FreshContextManager';
import type {
  ITokenBudgeter,
  IContextBuilder,
  TaskSpec,
  ContextProjectConfig,
  TokenBudget,
  TokenAllocation,
  FileContent,
  MemoryEntry,
  CodebaseDocsSummary,
} from './types';
import type { CodeSearchResult, CodeChunk } from '../../persistence/memory/code/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock TaskSpec for testing
 */
function createMockTaskSpec(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task for testing purposes',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Feature works', 'Tests pass'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create a mock ContextProjectConfig
 */
function createMockProjectConfig(
  overrides: Partial<ContextProjectConfig> = {}
): ContextProjectConfig {
  return {
    name: 'test-project',
    path: '/test/path',
    language: 'typescript',
    framework: 'vitest',
    testFramework: 'vitest',
    ...overrides,
  };
}

/**
 * Create a mock TokenBudget
 */
function createMockBudget(totalTokens: number = 150000): TokenBudget {
  const dynamicBudget = totalTokens - 24000;
  return {
    total: totalTokens,
    fixed: {
      systemPrompt: 2000,
      repoMap: 2000,
      codebaseDocs: 3000,
      taskSpec: 1000,
      reserved: 16000,
    },
    dynamic: {
      files: Math.floor(dynamicBudget * 0.6),
      codeResults: Math.floor(dynamicBudget * 0.25),
      memories: Math.floor(dynamicBudget * 0.15),
    },
  };
}

/**
 * Create a mock TokenBudgeter
 */
function createMockBudgeter(): ITokenBudgeter {
  return {
    createBudget: vi.fn((totalTokens: number) => createMockBudget(totalTokens)),
    allocate: vi.fn(
      (): TokenAllocation => ({
        breakdown: {
          systemPrompt: 0,
          repoMap: 0,
          codebaseDocs: 0,
          taskSpec: 0,
          files: 0,
          codeResults: 0,
          memories: 0,
          reserved: 0,
          total: 0,
        },
        truncated: false,
        truncatedComponents: [],
        report: '',
      })
    ),
    truncateToFit: vi.fn((content: string) => content),
    estimateTokens: vi.fn((text: string) => Math.ceil((text?.length || 0) / 4)),
  };
}

/**
 * Create a mock FileContent
 */
function createMockFileContent(overrides: Partial<FileContent> = {}): FileContent {
  return {
    path: 'src/test.ts',
    content: 'const test = true;',
    tokenCount: 10,
    relevanceScore: 0.9,
    includeReason: 'task_file',
    ...overrides,
  };
}

/**
 * Create a mock MemoryEntry
 */
function createMockMemory(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'memory-1',
    content: 'Some memory content',
    relevanceScore: 0.8,
    source: 'test',
    tokenCount: 20,
    ...overrides,
  };
}

/**
 * Create a mock CodeChunk
 */
function createMockCodeChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  return {
    id: 'chunk-1',
    projectId: 'project-1',
    file: 'src/test.ts',
    startLine: 1,
    endLine: 10,
    content: 'function test() { return true; }',
    embedding: [],
    symbols: ['test'],
    chunkType: 'function',
    metadata: {
      language: 'typescript',
      hash: 'abc123',
    },
    indexedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock CodeSearchResult
 */
function createMockCodeResult(overrides: Partial<CodeSearchResult> = {}): CodeSearchResult {
  return {
    chunk: createMockCodeChunk(),
    score: 0.85,
    ...overrides,
  };
}

/**
 * Create a mock ContextBuilder
 */
function createMockBuilder(): IContextBuilder {
  return {
    buildRepoMapContext: vi.fn(async () => 'mock repo map'),
    buildCodebaseDocsContext: vi.fn(
      async (): Promise<CodebaseDocsSummary> => ({
        architectureSummary: 'mock summary',
        relevantPatterns: ['pattern1'],
        relevantAPIs: ['api1'],
        tokenCount: 100,
      })
    ),
    buildFileContext: vi.fn(async () => [createMockFileContent()]),
    buildCodeContext: vi.fn(async () => [createMockCodeResult()]),
    buildMemoryContext: vi.fn(async () => [createMockMemory()]),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('FreshContextManager', () => {
  let manager: FreshContextManager;
  let mockBudgeter: ITokenBudgeter;
  let mockBuilder: IContextBuilder;
  let mockProjectConfig: ContextProjectConfig;

  beforeEach(() => {
    mockBudgeter = createMockBudgeter();
    mockBuilder = createMockBuilder();
    mockProjectConfig = createMockProjectConfig();
    manager = new FreshContextManager(mockBudgeter, mockBuilder, mockProjectConfig);
  });

  // --------------------------------------------------------------------------
  // Factory Functions
  // --------------------------------------------------------------------------

  describe('Factory Functions', () => {
    it('should create a FreshContextManager with createFreshContextManager', () => {
      const instance = createFreshContextManager(
        mockBudgeter,
        mockBuilder,
        mockProjectConfig
      );
      expect(instance).toBeInstanceOf(FreshContextManager);
    });

    it('should create a test FreshContextManager with createTestFreshContextManager', () => {
      const instance = createTestFreshContextManager();
      expect(instance).toBeInstanceOf(FreshContextManager);
    });

    it('should create a test FreshContextManager with custom options', () => {
      const customConfig = { name: 'custom-project' };
      const instance = createTestFreshContextManager({
        projectConfig: customConfig,
      });
      expect(instance).toBeInstanceOf(FreshContextManager);
    });
  });

  // --------------------------------------------------------------------------
  // Building Fresh Context
  // --------------------------------------------------------------------------

  describe('buildFreshContext', () => {
    it('should build a complete task context', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(context).toBeDefined();
      expect(context.taskSpec).toEqual(task);
      expect(context.projectConfig).toEqual(mockProjectConfig);
      expect(context.contextId).toBeDefined();
      expect(context.generatedAt).toBeInstanceOf(Date);
    });

    it('should always have empty conversation history', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(context.conversationHistory).toEqual([]);
      expect(context.conversationHistory.length).toBe(0);
    });

    it('should include repo map when enabled', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        includeRepoMap: true,
      });

      expect(mockBuilder.buildRepoMapContext).toHaveBeenCalled();
      expect(context.repoMap).toBe('mock repo map');
    });

    it('should exclude repo map when disabled', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        includeRepoMap: false,
      });

      expect(context.repoMap).toBe('');
    });

    it('should include codebase docs when enabled', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        includeCodebaseDocs: true,
      });

      expect(mockBuilder.buildCodebaseDocsContext).toHaveBeenCalled();
      expect(context.codebaseDocs.architectureSummary).toBe('mock summary');
    });

    it('should exclude codebase docs when disabled', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        includeCodebaseDocs: false,
      });

      expect(context.codebaseDocs.architectureSummary).toBe('');
    });

    it('should include relevant files', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(mockBuilder.buildFileContext).toHaveBeenCalled();
      expect(context.relevantFiles.length).toBeGreaterThan(0);
    });

    it('should include code search results', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(mockBuilder.buildCodeContext).toHaveBeenCalled();
      expect(context.relevantCode.length).toBeGreaterThan(0);
    });

    it('should include relevant memories', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(mockBuilder.buildMemoryContext).toHaveBeenCalled();
      expect(context.relevantMemories.length).toBeGreaterThan(0);
    });

    it('should use custom code search query when provided', async () => {
      const task = createMockTaskSpec();
      const customQuery = 'custom search query';

      await manager.buildFreshContext(task, {
        codeSearchQuery: customQuery,
      });

      expect(mockBuilder.buildCodeContext).toHaveBeenCalledWith(
        customQuery,
        expect.any(Number)
      );
    });

    it('should use task description for code search when no custom query', async () => {
      const task = createMockTaskSpec({ description: 'task description' });

      await manager.buildFreshContext(task);

      expect(mockBuilder.buildCodeContext).toHaveBeenCalledWith(
        'task description',
        expect.any(Number)
      );
    });

    it('should respect maxTokens option', async () => {
      const task = createMockTaskSpec();

      await manager.buildFreshContext(task, { maxTokens: 100000 });

      expect(mockBudgeter.createBudget).toHaveBeenCalledWith(100000);
    });

    it('should calculate token count', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      expect(context.tokenCount).toBeGreaterThan(0);
      expect(context.tokenBudget).toBeDefined();
    });

    it('should track context in activeContexts', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      const activeContexts = manager.getActiveContexts();
      expect(activeContexts.has(context.contextId)).toBe(true);
    });

    it('should clear previous context for same task', async () => {
      const task = createMockTaskSpec({ id: 'same-task' });

      // Build first context
      await manager.buildFreshContext(task);

      // Build second context for same task
      await manager.buildFreshContext(task);

      // Should only have one context for this task
      const stats = manager.getContextStats();
      expect(stats.activeContexts).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Context Clearing
  // --------------------------------------------------------------------------

  describe('clearAgentContext', () => {
    it('should clear context associated with agent', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      // Associate agent with context
      manager.associateAgentWithContext('agent-1', context.contextId);

      // Clear agent context
      await manager.clearAgentContext('agent-1');

      // Context should be removed
      const activeContexts = manager.getActiveContexts();
      expect(activeContexts.has(context.contextId)).toBe(false);
    });

    it('should handle clearing non-existent agent', async () => {
      // Should not throw
      await expect(manager.clearAgentContext('non-existent')).resolves.not.toThrow();
    });

    it('should update statistics when clearing', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);
      manager.associateAgentWithContext('agent-1', context.contextId);

      const statsBefore = manager.getContextStats();
      await manager.clearAgentContext('agent-1');
      const statsAfter = manager.getContextStats();

      expect(statsAfter.totalCleared).toBe(statsBefore.totalCleared + 1);
    });
  });

  describe('clearTaskContext', () => {
    it('should clear context for task', async () => {
      const task = createMockTaskSpec({ id: 'task-to-clear' });
      const context = await manager.buildFreshContext(task);

      await manager.clearTaskContext('task-to-clear');

      const activeContexts = manager.getActiveContexts();
      expect(activeContexts.has(context.contextId)).toBe(false);
    });

    it('should handle clearing non-existent task', async () => {
      // Should not throw
      await expect(manager.clearTaskContext('non-existent')).resolves.not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Context Validation
  // --------------------------------------------------------------------------

  describe('validateContext', () => {
    it('should validate context under budget as valid', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      const validation = manager.validateContext(context);

      expect(validation.valid).toBe(true);
    });

    it('should include token breakdown', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      const validation = manager.validateContext(context);

      expect(validation.breakdown).toBeDefined();
      expect(validation.breakdown.total).toBe(validation.tokenCount);
    });

    it('should provide warnings for high usage', async () => {
      // Create a context that uses most of the budget
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        maxTokens: 100, // Very small budget
      });

      // Manually set high token count for testing
      (context as { tokenCount: number }).tokenCount = 96; // 96% usage

      const validation = manager.validateContext(context);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for optimization', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        maxTokens: 10, // Very small budget
      });

      // Set tokens over budget
      (context as { tokenCount: number }).tokenCount = 20;

      const validation = manager.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });

    it('should warn when task files are missing from context', async () => {
      // Create builder that returns no files
      const emptyBuilder: IContextBuilder = {
        ...createMockBuilder(),
        buildFileContext: vi.fn(async () => []),
      };

      const customManager = new FreshContextManager(
        mockBudgeter,
        emptyBuilder,
        mockProjectConfig
      );

      const task = createMockTaskSpec({ files: ['src/important.ts'] });
      const context = await customManager.buildFreshContext(task);

      const validation = customManager.validateContext(context);

      expect(validation.warnings.some((w) => w.includes('files'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Token Estimation
  // --------------------------------------------------------------------------

  describe('estimateTokenCount', () => {
    it('should estimate token count for text', () => {
      const text = 'Hello world';
      const tokens = manager.estimateTokenCount(text);

      expect(tokens).toBeGreaterThan(0);
      expect(mockBudgeter.estimateTokens).toHaveBeenCalledWith(text);
    });

    it('should return 0 for empty text', () => {
      const tokens = manager.estimateTokenCount('');
      expect(tokens).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  describe('getContextStats', () => {
    it('should return initial statistics', () => {
      const stats = manager.getContextStats();

      expect(stats.activeContexts).toBe(0);
      expect(stats.totalCreated).toBe(0);
      expect(stats.totalCleared).toBe(0);
      expect(stats.averageTokens).toBe(0);
      expect(stats.peakTokens).toBe(0);
    });

    it('should track created contexts', async () => {
      await manager.buildFreshContext(createMockTaskSpec({ id: 'task-1' }));
      await manager.buildFreshContext(createMockTaskSpec({ id: 'task-2' }));

      const stats = manager.getContextStats();

      expect(stats.totalCreated).toBe(2);
      expect(stats.activeContexts).toBe(2);
    });

    it('should track cleared contexts', async () => {
      const task = createMockTaskSpec();
      await manager.buildFreshContext(task);
      await manager.clearTaskContext(task.id);

      const stats = manager.getContextStats();

      expect(stats.totalCleared).toBe(1);
      expect(stats.activeContexts).toBe(0);
    });

    it('should track peak token usage', async () => {
      // Create first context
      await manager.buildFreshContext(createMockTaskSpec({ id: 'task-1' }));

      const stats = manager.getContextStats();
      expect(stats.peakTokens).toBeGreaterThan(0);
    });

    it('should calculate average token usage', async () => {
      await manager.buildFreshContext(createMockTaskSpec({ id: 'task-1' }));
      await manager.buildFreshContext(createMockTaskSpec({ id: 'task-2' }));

      const stats = manager.getContextStats();

      expect(stats.averageTokens).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Agent Context Association
  // --------------------------------------------------------------------------

  describe('associateAgentWithContext', () => {
    it('should associate agent with context', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);

      manager.associateAgentWithContext('agent-1', context.contextId);

      const retrieved = manager.getContextForAgent('agent-1');
      expect(retrieved).toEqual(context);
    });
  });

  describe('getContextForAgent', () => {
    it('should return context for associated agent', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task);
      manager.associateAgentWithContext('agent-1', context.contextId);

      const retrieved = manager.getContextForAgent('agent-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.contextId).toBe(context.contextId);
    });

    it('should return undefined for unknown agent', () => {
      const context = manager.getContextForAgent('unknown');
      expect(context).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle task with no files', async () => {
      const task = createMockTaskSpec({ files: [] });
      const context = await manager.buildFreshContext(task);

      expect(context).toBeDefined();
      expect(context.taskSpec.files).toEqual([]);
    });

    it('should handle empty task description', async () => {
      const task = createMockTaskSpec({ description: '' });
      const context = await manager.buildFreshContext(task);

      expect(context).toBeDefined();
    });

    it('should handle all options disabled', async () => {
      const task = createMockTaskSpec();
      const context = await manager.buildFreshContext(task, {
        includeRepoMap: false,
        includeCodebaseDocs: false,
        maxRelevantFiles: 0,
        maxCodeResults: 0,
        maxMemories: 0,
      });

      expect(context).toBeDefined();
      expect(context.repoMap).toBe('');
      expect(context.codebaseDocs.architectureSummary).toBe('');
    });

    it('should handle multiple contexts for different tasks', async () => {
      const task1 = createMockTaskSpec({ id: 'task-1' });
      const task2 = createMockTaskSpec({ id: 'task-2' });
      const task3 = createMockTaskSpec({ id: 'task-3' });

      const context1 = await manager.buildFreshContext(task1);
      const context2 = await manager.buildFreshContext(task2);
      const context3 = await manager.buildFreshContext(task3);

      expect(context1.contextId).not.toBe(context2.contextId);
      expect(context2.contextId).not.toBe(context3.contextId);

      const activeContexts = manager.getActiveContexts();
      expect(activeContexts.size).toBe(3);
    });

    it('should handle rapid context building and clearing', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const task = createMockTaskSpec({ id: `task-${i}` });
        await manager.buildFreshContext(task);
        await manager.clearTaskContext(task.id);
      }

      const stats = manager.getContextStats();
      expect(stats.totalCreated).toBe(iterations);
      expect(stats.totalCleared).toBe(iterations);
      expect(stats.activeContexts).toBe(0);
    });
  });
});
