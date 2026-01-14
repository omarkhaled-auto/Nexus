// EventBus Tests - Phase 04-03
// TDD RED: Failing tests for cross-layer event communication

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from './EventBus';
import type { EventType, EventPayload, NexusEvent, EventHandler } from '@/types/events';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Reset singleton for testing
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  // ============================================================================
  // Singleton Pattern Tests
  // ============================================================================

  describe('singleton pattern', () => {
    it('should return the same instance when getInstance called multiple times', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = EventBus.getInstance();
      EventBus.resetInstance();
      const instance2 = EventBus.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // emit() Tests
  // ============================================================================

  describe('emit()', () => {
    it('should call registered handler with correct event shape', () => {
      const handler = vi.fn();
      eventBus.on('task:completed', handler);

      const payload = {
        taskId: 'task-1',
        result: {
          success: true,
          filesChanged: ['file.ts'],
          output: 'Done',
          qaIterations: 1,
          duration: 1000,
        },
      };

      eventBus.emit('task:completed', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as NexusEvent<typeof payload>;
      expect(event.type).toBe('task:completed');
      expect(event.payload).toEqual(payload);
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.source).toBe('EventBus');
    });

    it('should not throw when no handlers registered', () => {
      expect(() => {
        eventBus.emit('task:created', {
          task: {
            id: 'task-1',
            projectId: 'proj-1',
            name: 'Test Task',
            description: 'Test',
            type: 'feature',
            status: 'pending',
            priority: 'medium',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          projectId: 'proj-1',
        });
      }).not.toThrow();
    });

    it('should call all registered handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('agent:spawned', handler1);
      eventBus.on('agent:spawned', handler2);
      eventBus.on('agent:spawned', handler3);

      eventBus.emit('agent:spawned', {
        agent: {
          id: 'agent-1',
          type: 'coder',
          status: 'idle',
          capabilities: [],
          currentTask: null,
          metrics: {
            tasksCompleted: 0,
            tasksFailed: 0,
            totalExecutionTime: 0,
            averageQAIterations: 0,
          },
        },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should not affect other handlers when one throws', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn(() => {
        throw new Error('Handler error');
      });
      const handler3 = vi.fn();

      eventBus.on('project:created', handler1);
      eventBus.on('project:created', handler2);
      eventBus.on('project:created', handler3);

      eventBus.emit('project:created', {
        project: {
          id: 'proj-1',
          name: 'Test',
          description: 'Test project',
          path: '/path',
          status: 'planning',
          settings: {
            aiModel: 'claude-3-opus',
            maxAgents: 4,
            targetCoverage: 80,
            qaConfig: {
              maxIterations: 3,
              requireAllPassing: true,
            },
            gitConfig: {
              createWorktrees: true,
              autoCommit: true,
              autoPush: false,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should create unique event IDs for each emit', () => {
      const eventIds: string[] = [];
      const handler = vi.fn((event: NexusEvent) => {
        eventIds.push(event.id);
      });

      eventBus.on('system:warning', handler);

      for (let i = 0; i < 5; i++) {
        eventBus.emit('system:warning', {
          component: 'test',
          message: `Warning ${i}`,
        });
      }

      expect(new Set(eventIds).size).toBe(5);
    });
  });

  // ============================================================================
  // on() Tests
  // ============================================================================

  describe('on()', () => {
    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('task:started', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe when unsubscribe function called', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('task:started', handler);

      eventBus.emit('task:started', {
        taskId: 'task-1',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      eventBus.emit('task:started', {
        taskId: 'task-2',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should register multiple handlers for same event type', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];

      handlers.forEach(h => eventBus.on('task:progress', h));

      expect(eventBus.listenerCount('task:progress')).toBe(3);
    });
  });

  // ============================================================================
  // once() Tests
  // ============================================================================

  describe('once()', () => {
    it('should fire handler only once', () => {
      const handler = vi.fn();
      eventBus.once('task:completed', handler);

      const payload = {
        taskId: 'task-1',
        result: {
          success: true,
          filesChanged: [],
          output: '',
          qaIterations: 1,
          duration: 100,
        },
      };

      eventBus.emit('task:completed', payload);
      eventBus.emit('task:completed', payload);
      eventBus.emit('task:completed', payload);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.once('task:failed', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should prevent handler from being called if unsubscribed before emit', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.once('task:failed', handler);

      unsubscribe();

      eventBus.emit('task:failed', {
        taskId: 'task-1',
        error: 'Failed',
        iterations: 3,
        escalated: false,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // off() Tests
  // ============================================================================

  describe('off()', () => {
    it('should remove specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('agent:idle', handler1);
      eventBus.on('agent:idle', handler2);

      eventBus.off('agent:idle', handler1);

      eventBus.emit('agent:idle', {
        agentId: 'agent-1',
        idleSince: new Date(),
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should silently ignore removing non-existent handler', () => {
      const handler = vi.fn();

      expect(() => {
        eventBus.off('agent:error', handler);
      }).not.toThrow();
    });

    it('should not affect other handlers when removing one', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('feature:created', handler1);
      eventBus.on('feature:created', handler2);
      eventBus.on('feature:created', handler3);

      eventBus.off('feature:created', handler2);

      expect(eventBus.listenerCount('feature:created')).toBe(2);
    });
  });

  // ============================================================================
  // onAny() Tests
  // ============================================================================

  describe('onAny()', () => {
    it('should receive all event types', () => {
      const wildcardHandler = vi.fn();
      eventBus.onAny(wildcardHandler);

      eventBus.emit('task:created', {
        task: {
          id: 'task-1',
          projectId: 'proj-1',
          name: 'Task',
          description: 'Desc',
          type: 'feature',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        projectId: 'proj-1',
      });

      eventBus.emit('agent:spawned', {
        agent: {
          id: 'agent-1',
          type: 'coder',
          status: 'idle',
          capabilities: [],
          currentTask: null,
          metrics: {
            tasksCompleted: 0,
            tasksFailed: 0,
            totalExecutionTime: 0,
            averageQAIterations: 0,
          },
        },
      });

      eventBus.emit('project:completed', {
        projectId: 'proj-1',
        totalDuration: 1000,
        metrics: {
          totalTasks: 10,
          completedTasks: 10,
          failedTasks: 0,
          totalAgentsUsed: 4,
          averageTaskTime: 100,
          totalExecutionTime: 1000,
        },
      });

      expect(wildcardHandler).toHaveBeenCalledTimes(3);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.onAny(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop receiving events after unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.onAny(handler);

      eventBus.emit('system:error', {
        component: 'test',
        error: 'Error 1',
        recoverable: true,
      });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      eventBus.emit('system:error', {
        component: 'test',
        error: 'Error 2',
        recoverable: true,
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // removeAllListeners() Tests
  // ============================================================================

  describe('removeAllListeners()', () => {
    it('should clear handlers for specific event type', () => {
      eventBus.on('task:queued', vi.fn());
      eventBus.on('task:queued', vi.fn());
      eventBus.on('task:assigned', vi.fn());

      expect(eventBus.listenerCount('task:queued')).toBe(2);
      expect(eventBus.listenerCount('task:assigned')).toBe(1);

      eventBus.removeAllListeners('task:queued');

      expect(eventBus.listenerCount('task:queued')).toBe(0);
      expect(eventBus.listenerCount('task:assigned')).toBe(1);
    });

    it('should clear all handlers when no type specified', () => {
      eventBus.on('task:queued', vi.fn());
      eventBus.on('task:assigned', vi.fn());
      eventBus.on('agent:spawned', vi.fn());
      eventBus.onAny(vi.fn());

      eventBus.removeAllListeners();

      expect(eventBus.listenerCount('task:queued')).toBe(0);
      expect(eventBus.listenerCount('task:assigned')).toBe(0);
      expect(eventBus.listenerCount('agent:spawned')).toBe(0);
    });
  });

  // ============================================================================
  // listenerCount() Tests
  // ============================================================================

  describe('listenerCount()', () => {
    it('should return correct count for event type', () => {
      expect(eventBus.listenerCount('task:blocked')).toBe(0);

      eventBus.on('task:blocked', vi.fn());
      expect(eventBus.listenerCount('task:blocked')).toBe(1);

      eventBus.on('task:blocked', vi.fn());
      expect(eventBus.listenerCount('task:blocked')).toBe(2);
    });

    it('should return 0 for event type with no handlers', () => {
      expect(eventBus.listenerCount('qa:build-started')).toBe(0);
    });

    it('should decrease after unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('qa:test-completed', handler);

      expect(eventBus.listenerCount('qa:test-completed')).toBe(1);

      unsubscribe();

      expect(eventBus.listenerCount('qa:test-completed')).toBe(0);
    });
  });

  // ============================================================================
  // Event Shape Tests
  // ============================================================================

  describe('event shape', () => {
    it('should have correct structure with id, type, timestamp, payload, source', () => {
      const handler = vi.fn();
      eventBus.on('interview:started', handler);

      eventBus.emit('interview:started', {
        projectId: 'proj-1',
        projectName: 'Test Project',
        mode: 'genesis',
      });

      const event = handler.mock.calls[0][0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('type', 'interview:started');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('payload');
      expect(event).toHaveProperty('source');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include correlationId when provided', () => {
      const handler = vi.fn();
      eventBus.on('task:progress', handler);

      eventBus.emit(
        'task:progress',
        {
          taskId: 'task-1',
          agentId: 'agent-1',
          message: 'In progress',
          percentage: 50,
        },
        { correlationId: 'corr-123' }
      );

      const event = handler.mock.calls[0][0];
      expect(event.correlationId).toBe('corr-123');
    });

    it('should include custom source when provided', () => {
      const handler = vi.fn();
      eventBus.on('system:checkpoint-created', handler);

      eventBus.emit(
        'system:checkpoint-created',
        {
          checkpointId: 'cp-1',
          projectId: 'proj-1',
          reason: 'Manual',
          gitCommit: 'abc123',
        },
        { source: 'NexusCoordinator' }
      );

      const event = handler.mock.calls[0][0];
      expect(event.source).toBe('NexusCoordinator');
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================

  describe('type safety', () => {
    it('should enforce correct payload type for event', () => {
      const handler = vi.fn<[NexusEvent<{ taskId: string; result: unknown }>], void>();
      eventBus.on('task:completed', handler);

      // This should work - correct payload
      eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: {
          success: true,
          filesChanged: [],
          output: '',
          qaIterations: 1,
          duration: 100,
        },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Async Handler Tests
  // ============================================================================

  describe('async handlers', () => {
    it('should handle async handlers without blocking', async () => {
      const results: number[] = [];

      eventBus.on('task:started', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(1);
      });

      eventBus.on('task:started', () => {
        results.push(2);
      });

      eventBus.emit('task:started', {
        taskId: 'task-1',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      // Sync handler runs first
      expect(results).toContain(2);

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(results).toContain(1);
    });
  });
});
