/**
 * AgentPool Tests
 *
 * Phase 14B Task 17: Comprehensive tests for the real AgentPool implementation.
 *
 * @module orchestration/agents
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentPool,
  PoolCapacityError,
  AgentNotFoundError,
  NoRunnerError,
  type AgentPoolConfig,
} from './AgentPool';
import type { ClaudeClient } from '../../llm/clients/ClaudeClient';
import type { GeminiClient } from '../../llm/clients/GeminiClient';
import type { Task } from '../../types/task';
import type { PoolAgent } from '../types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock LLM clients
const mockClaudeClient = {
  chat: vi.fn().mockResolvedValue({
    content: '[TASK_COMPLETE] Mock implementation done',
    usage: { totalTokens: 100 },
  }),
} as unknown as ClaudeClient;

const mockGeminiClient = {
  chat: vi.fn().mockResolvedValue({
    content: '{"approved": true, "issues": [], "suggestions": [], "summary": "LGTM"}',
    usage: { totalTokens: 50 },
  }),
} as unknown as GeminiClient;

// Mock EventBus
vi.mock('../events/EventBus', () => ({
  EventBus: {
    getInstance: vi.fn().mockReturnValue({
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockReturnValue(() => {}),
    }),
  },
}));

// Default test configuration
const createTestConfig = (
  overrides?: Partial<AgentPoolConfig>
): AgentPoolConfig => ({
  claudeClient: mockClaudeClient,
  geminiClient: mockGeminiClient,
  ...overrides,
});

// Create a test task
const createTestTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  name: 'Test Task',
  description: 'A test task',
  type: 'auto',
  status: 'pending',
  priority: 'normal',
  files: ['src/test.ts'],
  testCriteria: ['It should work'],
  createdAt: new Date(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('AgentPool', () => {
  let pool: AgentPool;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = new AgentPool(createTestConfig());
  });

  afterEach(async () => {
    await pool.terminateAll();
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create pool with default configuration', () => {
      expect(pool).toBeInstanceOf(AgentPool);
      expect(pool.size()).toBe(0);
    });

    it('should accept custom max agents configuration', () => {
      const customPool = new AgentPool(
        createTestConfig({
          maxAgentsByType: { coder: 2, tester: 1 },
        })
      );

      // Spawn up to custom limit
      customPool.spawn('coder');
      customPool.spawn('coder');

      expect(() => customPool.spawn('coder')).toThrow(PoolCapacityError);
    });

    it('should initialize with all agent runners', () => {
      expect(pool.getRunner('coder')).toBeDefined();
      expect(pool.getRunner('tester')).toBeDefined();
      expect(pool.getRunner('reviewer')).toBeDefined();
      expect(pool.getRunner('merger')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // spawn()
  // --------------------------------------------------------------------------

  describe('spawn', () => {
    it('should spawn a coder agent', () => {
      const agent = pool.spawn('coder');

      expect(agent).toBeDefined();
      expect(agent.type).toBe('coder');
      expect(agent.status).toBe('idle');
      expect(agent.id).toBeTruthy();
      expect(pool.size()).toBe(1);
    });

    it('should spawn a tester agent', () => {
      const agent = pool.spawn('tester');

      expect(agent.type).toBe('tester');
      expect(agent.status).toBe('idle');
    });

    it('should spawn a reviewer agent', () => {
      const agent = pool.spawn('reviewer');

      expect(agent.type).toBe('reviewer');
      expect(agent.status).toBe('idle');
    });

    it('should spawn a merger agent', () => {
      const agent = pool.spawn('merger');

      expect(agent.type).toBe('merger');
      expect(agent.status).toBe('idle');
    });

    it('should initialize agent with empty metrics', () => {
      const agent = pool.spawn('coder');

      expect(agent.metrics).toEqual({
        tasksCompleted: 0,
        tasksFailed: 0,
        totalIterations: 0,
        averageIterationsPerTask: 0,
        totalTokensUsed: 0,
        totalTimeActive: 0,
      });
    });

    it('should set spawnedAt and lastActiveAt timestamps', () => {
      const before = new Date();
      const agent = pool.spawn('coder');
      const after = new Date();

      expect(agent.spawnedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(agent.spawnedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(agent.lastActiveAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw PoolCapacityError when at capacity', () => {
      const customPool = new AgentPool(
        createTestConfig({
          maxAgentsByType: { coder: 1 },
        })
      );

      customPool.spawn('coder');
      expect(() => customPool.spawn('coder')).toThrow(PoolCapacityError);
    });

    it('should respect different limits for different types', () => {
      const customPool = new AgentPool(
        createTestConfig({
          maxAgentsByType: { coder: 2, tester: 1 },
        })
      );

      customPool.spawn('coder');
      customPool.spawn('coder');
      customPool.spawn('tester');

      expect(() => customPool.spawn('coder')).toThrow(PoolCapacityError);
      expect(() => customPool.spawn('tester')).toThrow(PoolCapacityError);
    });
  });

  // --------------------------------------------------------------------------
  // terminate()
  // --------------------------------------------------------------------------

  describe('terminate', () => {
    it('should remove agent from pool', () => {
      const agent = pool.spawn('coder');
      expect(pool.size()).toBe(1);

      pool.terminate(agent.id);
      expect(pool.size()).toBe(0);
    });

    it('should throw AgentNotFoundError for unknown agent', () => {
      expect(() => pool.terminate('unknown-id')).toThrow(AgentNotFoundError);
    });

    it('should allow spawning new agent after termination', () => {
      const customPool = new AgentPool(
        createTestConfig({
          maxAgentsByType: { coder: 1 },
        })
      );

      const agent1 = customPool.spawn('coder');
      customPool.terminate(agent1.id);

      const agent2 = customPool.spawn('coder');
      expect(agent2).toBeDefined();
      expect(agent2.id).not.toBe(agent1.id);
    });
  });

  // --------------------------------------------------------------------------
  // assign() and release()
  // --------------------------------------------------------------------------

  describe('assign', () => {
    it('should assign agent to a task', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1', '/path/to/worktree');

      const updated = pool.getById(agent.id);
      expect(updated?.status).toBe('assigned');
      expect(updated?.currentTaskId).toBe('task-1');
      expect(updated?.worktreePath).toBe('/path/to/worktree');
    });

    it('should throw AgentNotFoundError for unknown agent', () => {
      expect(() => pool.assign('unknown-id', 'task-1')).toThrow(AgentNotFoundError);
    });

    it('should update lastActiveAt timestamp', () => {
      const agent = pool.spawn('coder');
      const beforeAssign = agent.lastActiveAt;

      pool.assign(agent.id, 'task-1');
      const updated = pool.getById(agent.id);

      // lastActiveAt should be updated (at least equal, since assign happens immediately)
      expect(updated?.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        beforeAssign.getTime()
      );
    });
  });

  describe('release', () => {
    it('should release agent from task', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1', '/path/to/worktree');
      pool.release(agent.id);

      const updated = pool.getById(agent.id);
      expect(updated?.status).toBe('idle');
      expect(updated?.currentTaskId).toBeUndefined();
      expect(updated?.worktreePath).toBeUndefined();
    });

    it('should throw AgentNotFoundError for unknown agent', () => {
      expect(() => pool.release('unknown-id')).toThrow(AgentNotFoundError);
    });
  });

  // --------------------------------------------------------------------------
  // getAll(), getActive(), getAvailable()
  // --------------------------------------------------------------------------

  describe('getAll', () => {
    it('should return empty array when no agents', () => {
      expect(pool.getAll()).toEqual([]);
    });

    it('should return all spawned agents', () => {
      pool.spawn('coder');
      pool.spawn('tester');
      pool.spawn('reviewer');

      expect(pool.getAll().length).toBe(3);
    });
  });

  describe('getActive', () => {
    it('should return empty array when no active agents', () => {
      pool.spawn('coder');
      expect(pool.getActive()).toEqual([]);
    });

    it('should return agents with assigned or working status', () => {
      const agent1 = pool.spawn('coder');
      const agent2 = pool.spawn('tester');
      pool.spawn('reviewer'); // Will remain idle

      pool.assign(agent1.id, 'task-1');
      pool.assign(agent2.id, 'task-2');

      const active = pool.getActive();
      expect(active.length).toBe(2);
      expect(active.map((a) => a.type)).toContain('coder');
      expect(active.map((a) => a.type)).toContain('tester');
    });
  });

  describe('getAvailable', () => {
    it('should return undefined when no agents', () => {
      expect(pool.getAvailable()).toBeUndefined();
    });

    it('should return an idle agent', () => {
      const agent = pool.spawn('coder');
      expect(pool.getAvailable()).toEqual(agent);
    });

    it('should not return assigned agents', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');
      expect(pool.getAvailable()).toBeUndefined();
    });
  });

  describe('getAvailableByType', () => {
    it('should return available agent of specific type', () => {
      pool.spawn('coder');
      const tester = pool.spawn('tester');

      expect(pool.getAvailableByType('tester')?.id).toBe(tester.id);
    });

    it('should return undefined if no available agent of type', () => {
      pool.spawn('coder');
      expect(pool.getAvailableByType('tester')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getById() and size()
  // --------------------------------------------------------------------------

  describe('getById', () => {
    it('should return agent by ID', () => {
      const agent = pool.spawn('coder');
      expect(pool.getById(agent.id)).toEqual(agent);
    });

    it('should return undefined for unknown ID', () => {
      expect(pool.getById('unknown-id')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return 0 for empty pool', () => {
      expect(pool.size()).toBe(0);
    });

    it('should return correct count', () => {
      pool.spawn('coder');
      pool.spawn('tester');
      expect(pool.size()).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // getPoolStatus()
  // --------------------------------------------------------------------------

  describe('getPoolStatus', () => {
    it('should return empty status for empty pool', () => {
      const status = pool.getPoolStatus();

      expect(status.totalAgents).toBe(0);
      expect(status.tasksInProgress).toBe(0);
      expect(status.byType.coder.total).toBe(0);
    });

    it('should return correct counts by type', () => {
      pool.spawn('coder');
      pool.spawn('coder');
      pool.spawn('tester');

      const status = pool.getPoolStatus();

      expect(status.totalAgents).toBe(3);
      expect(status.byType.coder.total).toBe(2);
      expect(status.byType.coder.idle).toBe(2);
      expect(status.byType.tester.total).toBe(1);
    });

    it('should track active and idle correctly', () => {
      const coder = pool.spawn('coder');
      pool.spawn('tester');

      pool.assign(coder.id, 'task-1');

      const status = pool.getPoolStatus();

      expect(status.byType.coder.active).toBe(1);
      expect(status.byType.coder.idle).toBe(0);
      expect(status.byType.tester.active).toBe(0);
      expect(status.byType.tester.idle).toBe(1);
      expect(status.tasksInProgress).toBe(1);
    });

    it('should include max capacity for each type', () => {
      const status = pool.getPoolStatus();

      expect(status.byType.coder.max).toBe(4);
      expect(status.byType.tester.max).toBe(2);
      expect(status.byType.reviewer.max).toBe(2);
      expect(status.byType.merger.max).toBe(1);
      expect(status.byType.planner.max).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // hasCapacity()
  // --------------------------------------------------------------------------

  describe('hasCapacity', () => {
    it('should return true when under capacity', () => {
      expect(pool.hasCapacity('coder')).toBe(true);
    });

    it('should return false when at capacity', () => {
      const customPool = new AgentPool(
        createTestConfig({
          maxAgentsByType: { coder: 1 },
        })
      );

      customPool.spawn('coder');
      expect(customPool.hasCapacity('coder')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // terminateAll()
  // --------------------------------------------------------------------------

  describe('terminateAll', () => {
    it('should remove all agents', async () => {
      pool.spawn('coder');
      pool.spawn('tester');
      pool.spawn('reviewer');

      expect(pool.size()).toBe(3);

      await pool.terminateAll();

      expect(pool.size()).toBe(0);
    });

    it('should handle empty pool gracefully', async () => {
      await expect(pool.terminateAll()).resolves.not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // getAggregatedMetrics()
  // --------------------------------------------------------------------------

  describe('getAggregatedMetrics', () => {
    it('should return empty metrics for empty pool', () => {
      const metrics = pool.getAggregatedMetrics();

      expect(metrics.tasksCompleted).toBe(0);
      expect(metrics.tasksFailed).toBe(0);
      expect(metrics.totalIterations).toBe(0);
    });

    it('should aggregate metrics from all agents', () => {
      const agent1 = pool.spawn('coder');
      const agent2 = pool.spawn('tester');

      // Manually set metrics for testing (simulating completed tasks)
      const poolAgent1 = pool.getById(agent1.id)!;
      const poolAgent2 = pool.getById(agent2.id)!;

      poolAgent1.metrics.tasksCompleted = 5;
      poolAgent1.metrics.totalIterations = 25;
      poolAgent1.metrics.totalTokensUsed = 1000;

      poolAgent2.metrics.tasksCompleted = 3;
      poolAgent2.metrics.tasksFailed = 1;
      poolAgent2.metrics.totalIterations = 20;
      poolAgent2.metrics.totalTokensUsed = 500;

      const metrics = pool.getAggregatedMetrics();

      expect(metrics.tasksCompleted).toBe(8);
      expect(metrics.tasksFailed).toBe(1);
      expect(metrics.totalIterations).toBe(45);
      expect(metrics.totalTokensUsed).toBe(1500);
      expect(metrics.averageIterationsPerTask).toBe(5); // 45 / 9
    });
  });

  // --------------------------------------------------------------------------
  // getRunner()
  // --------------------------------------------------------------------------

  describe('getRunner', () => {
    it('should return coder runner', () => {
      expect(pool.getRunner('coder')).toBeDefined();
    });

    it('should return tester runner', () => {
      expect(pool.getRunner('tester')).toBeDefined();
    });

    it('should return reviewer runner', () => {
      expect(pool.getRunner('reviewer')).toBeDefined();
    });

    it('should return merger runner', () => {
      expect(pool.getRunner('merger')).toBeDefined();
    });

    it('should return undefined for planner (no runner)', () => {
      expect(pool.getRunner('planner')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // runTask()
  // --------------------------------------------------------------------------

  describe('runTask', () => {
    it('should execute task and return result', async () => {
      const agent = pool.spawn('coder');
      const task = createTestTask();

      const result = await pool.runTask(agent, task, {
        workingDir: '/test',
      });

      expect(result).toBeDefined();
      expect(result.taskId).toBe(task.id);
    });

    it('should update agent metrics on success', async () => {
      const agent = pool.spawn('coder');
      const task = createTestTask();

      await pool.runTask(agent, task, { workingDir: '/test' });

      const updated = pool.getById(agent.id);
      expect(updated?.metrics.tasksCompleted).toBe(1);
      // Time active should be at least 0 (can be 0 if very fast)
      expect(updated?.metrics.totalTimeActive).toBeGreaterThanOrEqual(0);
    });

    it('should throw AgentNotFoundError for unknown agent', async () => {
      const fakeAgent: PoolAgent = {
        id: 'unknown',
        type: 'coder',
        status: 'idle',
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          totalIterations: 0,
          averageIterationsPerTask: 0,
          totalTokensUsed: 0,
          totalTimeActive: 0,
        },
        spawnedAt: new Date(),
        lastActiveAt: new Date(),
      };

      const task = createTestTask();

      await expect(
        pool.runTask(fakeAgent, task, { workingDir: '/test' })
      ).rejects.toThrow(AgentNotFoundError);
    });

    it('should throw NoRunnerError for planner type', async () => {
      // Manually create a planner agent (bypassing normal spawn)
      const agent = pool.spawn('coder');
      // Change type to planner to trigger no runner error
      const poolAgent = pool.getById(agent.id);
      if (poolAgent) {
        (poolAgent as any).type = 'planner';
      }

      const task = createTestTask();

      await expect(
        pool.runTask(agent, task, { workingDir: '/test' })
      ).rejects.toThrow(NoRunnerError);
    });

    it('should release agent after task completion', async () => {
      const agent = pool.spawn('coder');
      const task = createTestTask();

      await pool.runTask(agent, task, { workingDir: '/test' });

      const updated = pool.getById(agent.id);
      expect(updated?.status).toBe('idle');
      expect(updated?.currentTaskId).toBeUndefined();
    });
  });
});
