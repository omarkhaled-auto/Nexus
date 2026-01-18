/**
 * Integration Tests for Fresh Context Manager Module
 *
 * Tests the full integration of:
 * - FreshContextManager
 * - TokenBudgeter
 * - ContextBuilder
 * - AgentContextIntegration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createContextSystem,
  createTestContextSystem,
  FreshContextManager,
  TokenBudgeter,
  ContextBuilder,
  AgentContextIntegration,
  createFreshContextManager,
  createTokenBudgeter,
  createAgentContextIntegration,
} from './index';

import type {
  TaskSpec,
  TaskContext,
  ContextProjectConfig,
  ContextSystem,
} from './index';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a sample task spec for testing
 */
function createSampleTaskSpec(overrides?: Partial<TaskSpec>): TaskSpec {
  return {
    id: 'test-task-1',
    name: 'Test Task',
    description: 'A test task for integration testing',
    files: ['src/test.ts'],
    testCriteria: 'All tests pass',
    acceptanceCriteria: ['Code compiles', 'Tests pass'],
    dependencies: [],
    estimatedTime: 30,
    ...overrides,
  };
}

/**
 * Create a sample project config for testing
 */
function createSampleProjectConfig(
  overrides?: Partial<ContextProjectConfig>
): ContextProjectConfig {
  return {
    name: 'test-project',
    path: '/test/project',
    language: 'typescript',
    framework: 'vitest',
    testFramework: 'vitest',
    ...overrides,
  };
}

// ============================================================================
// Module Exports Tests
// ============================================================================

describe('Context Module Exports', () => {
  it('should export all main classes', () => {
    expect(FreshContextManager).toBeDefined();
    expect(TokenBudgeter).toBeDefined();
    expect(ContextBuilder).toBeDefined();
    expect(AgentContextIntegration).toBeDefined();
  });

  it('should export factory functions', () => {
    expect(createContextSystem).toBeDefined();
    expect(createTestContextSystem).toBeDefined();
    expect(createFreshContextManager).toBeDefined();
    expect(createTokenBudgeter).toBeDefined();
    expect(createAgentContextIntegration).toBeDefined();
  });
});

// ============================================================================
// createContextSystem Tests
// ============================================================================

describe('createContextSystem', () => {
  it('should create complete context system', () => {
    const system = createContextSystem({
      projectConfig: createSampleProjectConfig(),
    });

    expect(system.budgeter).toBeInstanceOf(TokenBudgeter);
    expect(system.builder).toBeInstanceOf(ContextBuilder);
    expect(system.manager).toBeInstanceOf(FreshContextManager);
    expect(system.integration).toBeInstanceOf(AgentContextIntegration);
  });

  it('should accept custom budget settings', () => {
    const system = createContextSystem({
      projectConfig: createSampleProjectConfig(),
      customBudget: {
        systemPrompt: 3000,
        repoMap: 3000,
      },
    });

    const budget = system.budgeter.createBudget(100000);
    expect(budget.fixed.systemPrompt).toBe(3000);
    expect(budget.fixed.repoMap).toBe(3000);
  });

  it('should wire components correctly', async () => {
    const system = createContextSystem({
      projectConfig: createSampleProjectConfig(),
    });

    const taskSpec = createSampleTaskSpec();

    // Build context through manager
    const context = await system.manager.buildFreshContext(taskSpec);

    // Verify context is tracked
    expect(system.manager.getActiveContexts().size).toBe(1);

    // Verify integration can see the context
    const result = await system.integration.prepareAgentContext(
      'agent-1',
      createSampleTaskSpec({ id: 'task-2' })
    );

    expect(result.context).toBeDefined();
    expect(result.agentId).toBe('agent-1');
  });
});

// ============================================================================
// createTestContextSystem Tests
// ============================================================================

describe('createTestContextSystem', () => {
  it('should create minimal test system', () => {
    const system = createTestContextSystem();

    expect(system.budgeter).toBeInstanceOf(TokenBudgeter);
    expect(system.builder).toBeInstanceOf(ContextBuilder);
    expect(system.manager).toBeInstanceOf(FreshContextManager);
    expect(system.integration).toBeInstanceOf(AgentContextIntegration);
  });

  it('should allow project config overrides', () => {
    const system = createTestContextSystem({
      name: 'custom-test',
      language: 'python',
    });

    // The project config is internal, but we can verify the system works
    expect(system.manager).toBeDefined();
  });
});

// ============================================================================
// Full Context Building Pipeline Tests
// ============================================================================

describe('Full Context Building Pipeline', () => {
  let system: ContextSystem;
  let taskSpec: TaskSpec;

  beforeEach(() => {
    system = createTestContextSystem();
    taskSpec = createSampleTaskSpec();
  });

  it('should build fresh context with all components', async () => {
    const context = await system.manager.buildFreshContext(taskSpec);

    // Verify structure
    expect(context.taskSpec).toEqual(taskSpec);
    expect(context.conversationHistory).toEqual([]);
    expect(context.tokenCount).toBeGreaterThanOrEqual(0);
    expect(context.tokenBudget).toBeGreaterThan(0);
    expect(context.generatedAt).toBeInstanceOf(Date);
    expect(context.contextId).toBeDefined();
  });

  it('should always have empty conversation history', async () => {
    // Build multiple contexts
    const context1 = await system.manager.buildFreshContext(taskSpec);
    const context2 = await system.manager.buildFreshContext(
      createSampleTaskSpec({ id: 'task-2' })
    );

    // Both should have empty conversation history
    expect(context1.conversationHistory).toEqual([]);
    expect(context2.conversationHistory).toEqual([]);
  });

  it('should respect token budget', async () => {
    const context = await system.manager.buildFreshContext(taskSpec, {
      maxTokens: 50000,
    });

    expect(context.tokenBudget).toBe(50000);
    expect(context.tokenCount).toBeLessThanOrEqual(50000);
  });

  it('should validate context correctly', async () => {
    const context = await system.manager.buildFreshContext(taskSpec);
    const validation = system.manager.validateContext(context);

    expect(validation.valid).toBe(true);
    expect(validation.tokenCount).toEqual(context.tokenCount);
    expect(validation.maxTokens).toEqual(context.tokenBudget);
    expect(validation.breakdown).toBeDefined();
  });
});

// ============================================================================
// Context Isolation Tests
// ============================================================================

describe('Context Isolation', () => {
  let system: ContextSystem;

  beforeEach(() => {
    system = createTestContextSystem();
  });

  it('should isolate context between tasks', async () => {
    const task1 = createSampleTaskSpec({ id: 'task-1', name: 'Task One' });
    const task2 = createSampleTaskSpec({ id: 'task-2', name: 'Task Two' });

    const context1 = await system.manager.buildFreshContext(task1);
    const context2 = await system.manager.buildFreshContext(task2);

    // Contexts should be different
    expect(context1.contextId).not.toEqual(context2.contextId);
    expect(context1.taskSpec.id).toBe('task-1');
    expect(context2.taskSpec.id).toBe('task-2');
  });

  it('should isolate context between agents', async () => {
    const task1 = createSampleTaskSpec({ id: 'task-1' });
    const task2 = createSampleTaskSpec({ id: 'task-2' });

    const result1 = await system.integration.prepareAgentContext('agent-1', task1);
    const result2 = await system.integration.prepareAgentContext('agent-2', task2);

    // Each agent should have their own context
    expect(result1.agentId).toBe('agent-1');
    expect(result2.agentId).toBe('agent-2');
    expect(result1.taskId).toBe('task-1');
    expect(result2.taskId).toBe('task-2');

    // Contexts should be different
    const context1 = system.integration.getAgentContext('agent-1');
    const context2 = system.integration.getAgentContext('agent-2');

    expect(context1?.contextId).not.toEqual(context2?.contextId);
  });

  it('should clean up old context when same task is rebuilt', async () => {
    const task = createSampleTaskSpec({ id: 'task-1' });

    const context1 = await system.manager.buildFreshContext(task);
    const contextId1 = context1.contextId;

    const context2 = await system.manager.buildFreshContext(task);
    const contextId2 = context2.contextId;

    // New context should have different ID
    expect(contextId1).not.toEqual(contextId2);

    // Only the new context should be active
    const activeContexts = system.manager.getActiveContexts();
    expect(activeContexts.has(contextId1)).toBe(false);
    expect(activeContexts.has(contextId2)).toBe(true);
  });
});

// ============================================================================
// AgentContextIntegration Tests
// ============================================================================

describe('AgentContextIntegration', () => {
  let system: ContextSystem;

  beforeEach(() => {
    system = createTestContextSystem();
  });

  it('should prepare context for agent', async () => {
    const task = createSampleTaskSpec();
    const result = await system.integration.prepareAgentContext('agent-1', task);

    expect(result.agentId).toBe('agent-1');
    expect(result.taskId).toBe(task.id);
    expect(result.context).toBeDefined();
    expect(result.buildTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should track context info for agent', async () => {
    const task = createSampleTaskSpec();
    await system.integration.prepareAgentContext('agent-1', task);

    const info = system.integration.getAgentContextInfo('agent-1');

    expect(info).toBeDefined();
    expect(info?.agentId).toBe('agent-1');
    expect(info?.taskId).toBe(task.id);
    expect(info?.status).toBe('ready');
    expect(info?.preparedAt).toBeInstanceOf(Date);
  });

  it('should clean up on task complete', async () => {
    const task = createSampleTaskSpec();
    await system.integration.prepareAgentContext('agent-1', task);

    // Verify context exists
    expect(system.integration.getAgentContext('agent-1')).toBeDefined();

    // Complete the task
    system.integration.onTaskComplete('agent-1', task.id);

    // Context should be cleared
    expect(system.integration.getAgentContext('agent-1')).toBeUndefined();

    // Status should be updated
    const info = system.integration.getAgentContextInfo('agent-1');
    expect(info?.status).toBe('cleared');
  });

  it('should clean up on task failed', async () => {
    const task = createSampleTaskSpec();
    await system.integration.prepareAgentContext('agent-1', task);

    // Fail the task
    system.integration.onTaskFailed('agent-1', task.id, new Error('Test error'));

    // Context should be cleared
    expect(system.integration.getAgentContext('agent-1')).toBeUndefined();

    // Status should be updated
    const info = system.integration.getAgentContextInfo('agent-1');
    expect(info?.status).toBe('cleared');
  });

  it('should provide accurate statistics', async () => {
    const task1 = createSampleTaskSpec({ id: 'task-1' });
    const task2 = createSampleTaskSpec({ id: 'task-2' });

    await system.integration.prepareAgentContext('agent-1', task1);
    await system.integration.prepareAgentContext('agent-2', task2);

    let stats = system.integration.getStats();
    expect(stats.total).toBe(2);
    expect(stats.ready).toBe(2);
    expect(stats.pending).toBe(0);
    expect(stats.cleared).toBe(0);

    system.integration.onTaskComplete('agent-1', 'task-1');

    stats = system.integration.getStats();
    expect(stats.ready).toBe(1);
    expect(stats.cleared).toBe(1);
  });
});

// ============================================================================
// Token Budget Integration Tests
// ============================================================================

describe('Token Budget Integration', () => {
  let system: ContextSystem;

  beforeEach(() => {
    system = createTestContextSystem();
  });

  it('should create budget with correct structure', () => {
    const budget = system.budgeter.createBudget(100000);

    expect(budget.total).toBe(100000);
    expect(budget.fixed).toBeDefined();
    expect(budget.dynamic).toBeDefined();
    expect(budget.fixed.systemPrompt).toBeGreaterThan(0);
    expect(budget.dynamic.files).toBeGreaterThan(0);
  });

  it('should estimate tokens consistently', () => {
    const text = 'This is a test string with some content.';
    const tokens1 = system.budgeter.estimateTokens(text);
    const tokens2 = system.manager.estimateTokenCount(text);

    // Both should use the same estimation method
    expect(tokens1).toBe(tokens2);
  });

  it('should truncate content to fit budget', () => {
    const longContent = 'x'.repeat(1000);
    const truncated = system.budgeter.truncateToFit(longContent, 50);

    // Should be significantly shorter
    expect(truncated.length).toBeLessThan(longContent.length);
    expect(system.budgeter.estimateTokens(truncated)).toBeLessThanOrEqual(50);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle context build errors gracefully', async () => {
    // Create system with mock builder that throws
    const budgeter = new TokenBudgeter();
    const builder = {
      buildRepoMapContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildCodebaseDocsContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildFileContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildCodeContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildMemoryContext: vi.fn().mockRejectedValue(new Error('Build error')),
    };

    const manager = new FreshContextManager(
      budgeter,
      builder as any,
      createSampleProjectConfig()
    );

    const integration = new AgentContextIntegration(manager, {
      throwOnError: false,
    });

    const task = createSampleTaskSpec();

    // Should not throw
    const result = await integration.prepareAgentContext('agent-1', task);

    // Should return fallback context
    expect(result.context).toBeDefined();

    // Status should be error
    const info = integration.getAgentContextInfo('agent-1');
    expect(info?.status).toBe('error');
  });

  it('should throw on error when configured', async () => {
    const budgeter = new TokenBudgeter();
    const builder = {
      buildRepoMapContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildCodebaseDocsContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildFileContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildCodeContext: vi.fn().mockRejectedValue(new Error('Build error')),
      buildMemoryContext: vi.fn().mockRejectedValue(new Error('Build error')),
    };

    const manager = new FreshContextManager(
      budgeter,
      builder as any,
      createSampleProjectConfig()
    );

    const integration = new AgentContextIntegration(manager, {
      throwOnError: true,
    });

    const task = createSampleTaskSpec();

    // Should throw
    await expect(
      integration.prepareAgentContext('agent-1', task)
    ).rejects.toThrow('Build error');
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('Context Statistics', () => {
  it('should track context creation and clearing', async () => {
    const system = createTestContextSystem();
    const task1 = createSampleTaskSpec({ id: 'task-1' });
    const task2 = createSampleTaskSpec({ id: 'task-2' });

    await system.manager.buildFreshContext(task1);
    await system.manager.buildFreshContext(task2);

    let stats = system.manager.getContextStats();
    expect(stats.totalCreated).toBe(2);
    expect(stats.activeContexts).toBe(2);

    system.manager.clearTaskContext('task-1');

    stats = system.manager.getContextStats();
    expect(stats.totalCleared).toBe(1);
    expect(stats.activeContexts).toBe(1);
  });

  it('should track peak token usage', async () => {
    const system = createTestContextSystem();

    await system.manager.buildFreshContext(
      createSampleTaskSpec({ id: 'task-1' }),
      { maxTokens: 50000 }
    );

    await system.manager.buildFreshContext(
      createSampleTaskSpec({ id: 'task-2' }),
      { maxTokens: 100000 }
    );

    const stats = system.manager.getContextStats();
    expect(stats.peakTokens).toBeGreaterThan(0);
  });
});
