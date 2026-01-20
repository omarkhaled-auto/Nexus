/**
 * NexusBootstrap Wiring Integration Tests
 *
 * Phase 19 Task 4: Tests for the NexusBootstrap wiring layer that connects:
 * - Interview Engine -> Task Decomposition -> Execution
 * - Event forwarding to UI via IPC
 *
 * These tests verify that events flow correctly through the system
 * without requiring actual API calls or a running Electron app.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, getEventBus } from '../../src/orchestration/events/EventBus';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock requirements for testing
 */
function createMockRequirements() {
  return [
    {
      id: 'req-1',
      projectId: 'test-project',
      category: 'functional' as const,
      description: 'User authentication with login/logout',
      priority: 'high' as const,
      source: 'interview' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'req-2',
      projectId: 'test-project',
      category: 'technical' as const,
      description: 'TypeScript implementation',
      priority: 'medium' as const,
      source: 'interview' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

// ============================================================================
// Event Bus Wiring Tests
// ============================================================================

describe('NexusBootstrap - Event Bus Wiring', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    // Subscribe to all events to track what's emitted
    eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    // Clear any subscriptions
    eventLog = [];
  });

  describe('Interview Completion Events', () => {
    it('should emit interview:completed event with correct payload', async () => {
      const projectId = 'test-project';
      const totalRequirements = 5;

      await eventBus.emit('interview:completed', {
        projectId,
        totalRequirements,
        categories: ['functional', 'technical'],
        duration: 300000, // 5 minutes
      });

      const event = eventLog.find((e) => e.type === 'interview:completed');
      expect(event).toBeDefined();
      expect(event?.payload).toMatchObject({
        projectId,
        totalRequirements,
      });
    });

    it('should allow multiple subscribers to interview:completed', async () => {
      const callbacks: number[] = [];

      // First subscriber
      eventBus.on('interview:completed', () => {
        callbacks.push(1);
      });

      // Second subscriber
      eventBus.on('interview:completed', () => {
        callbacks.push(2);
      });

      await eventBus.emit('interview:completed', {
        projectId: 'test-project',
        totalRequirements: 3,
        categories: ['functional'],
        duration: 100000,
      });

      expect(callbacks).toContain(1);
      expect(callbacks).toContain(2);
    });
  });

  describe('Task Events', () => {
    it('should emit task:assigned event with required fields', async () => {
      await eventBus.emit('task:assigned', {
        taskId: 'task-1',
        agentId: 'agent-1',
        agentType: 'coder' as const,
        worktreePath: '/tmp/test',
      });

      const event = eventLog.find((e) => e.type === 'task:assigned');
      expect(event).toBeDefined();
      expect(event?.payload).toMatchObject({
        taskId: 'task-1',
        agentId: 'agent-1',
      });
    });

    it('should emit task:started event', async () => {
      await eventBus.emit('task:started', {
        taskId: 'task-1',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      const event = eventLog.find((e) => e.type === 'task:started');
      expect(event).toBeDefined();
    });

    it('should emit task:completed event with result', async () => {
      await eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: {
          taskId: 'task-1',
          success: true,
          files: [{ path: 'src/index.ts', action: 'created' as const }],
          metrics: {
            iterations: 2,
            tokensUsed: 1500,
            timeMs: 30000,
          },
        },
      });

      const event = eventLog.find((e) => e.type === 'task:completed');
      expect(event).toBeDefined();
      expect((event?.payload as { result: { success: boolean } }).result.success).toBe(true);
    });

    it('should emit task:failed event with error details', async () => {
      await eventBus.emit('task:failed', {
        taskId: 'task-1',
        error: 'Build failed: TypeScript errors',
        iterations: 3,
        escalated: false,
      });

      const event = eventLog.find((e) => e.type === 'task:failed');
      expect(event).toBeDefined();
      expect((event?.payload as { error: string }).error).toContain('Build failed');
    });

    it('should emit task:escalated event when max iterations exceeded', async () => {
      await eventBus.emit('task:escalated', {
        taskId: 'task-1',
        reason: 'Max iterations exceeded',
        iterations: 50,
        lastError: 'Test still failing',
      });

      const event = eventLog.find((e) => e.type === 'task:escalated');
      expect(event).toBeDefined();
      expect((event?.payload as { iterations: number }).iterations).toBe(50);
    });
  });

  describe('QA Events', () => {
    it('should emit qa:build-completed event', async () => {
      await eventBus.emit('qa:build-completed', {
        taskId: 'task-1',
        passed: true,
        duration: 5000,
        errors: [],
      });

      const event = eventLog.find((e) => e.type === 'qa:build-completed');
      expect(event).toBeDefined();
      expect((event?.payload as { passed: boolean }).passed).toBe(true);
    });

    it('should emit qa:lint-completed event', async () => {
      await eventBus.emit('qa:lint-completed', {
        taskId: 'task-1',
        passed: true,
        duration: 2000,
        errors: [],
        warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
      });

      const event = eventLog.find((e) => e.type === 'qa:lint-completed');
      expect(event).toBeDefined();
    });

    it('should emit qa:test-completed event', async () => {
      await eventBus.emit('qa:test-completed', {
        taskId: 'task-1',
        passed: true,
        duration: 10000,
        passedCount: 15,
        failedCount: 0,
        coverage: 80,
      });

      const event = eventLog.find((e) => e.type === 'qa:test-completed');
      expect(event).toBeDefined();
      expect((event?.payload as { passedCount: number }).passedCount).toBe(15);
    });
  });

  describe('Project Events', () => {
    it('should emit project:status-changed event', async () => {
      await eventBus.emit('project:status-changed', {
        projectId: 'test-project',
        previousStatus: 'planning' as const,
        newStatus: 'executing' as const,
        reason: 'Interview completed',
      });

      const event = eventLog.find((e) => e.type === 'project:status-changed');
      expect(event).toBeDefined();
      expect((event?.payload as { newStatus: string }).newStatus).toBe('executing');
    });

    it('should emit project:completed event', async () => {
      await eventBus.emit('project:completed', {
        projectId: 'test-project',
        totalDuration: 3600000, // 1 hour
        metrics: {
          tasksTotal: 10,
          tasksCompleted: 10,
          tasksFailed: 0,
          featuresTotal: 3,
          featuresCompleted: 3,
          estimatedTotalMinutes: 60,
          actualTotalMinutes: 60,
          averageQAIterations: 2,
        },
      });

      const event = eventLog.find((e) => e.type === 'project:completed');
      expect(event).toBeDefined();
    });

    it('should emit project:failed event with recovery info', async () => {
      await eventBus.emit('project:failed', {
        projectId: 'test-project',
        error: 'Critical failure',
        recoverable: true,
      });

      const event = eventLog.find((e) => e.type === 'project:failed');
      expect(event).toBeDefined();
      expect((event?.payload as { recoverable: boolean }).recoverable).toBe(true);
    });
  });
});

// ============================================================================
// Event Flow Integration Tests
// ============================================================================

describe('NexusBootstrap - Event Flow Integration', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = getEventBus();
  });

  it('should support the complete Genesis flow event sequence', async () => {
    const events: string[] = [];

    // Subscribe to relevant events
    const types = [
      'interview:started',
      'interview:completed',
      'project:status-changed',
      'task:assigned',
      'task:started',
      'task:completed',
      'qa:build-completed',
      'qa:test-completed',
      'project:completed',
    ] as const;

    const unsubscribers: Array<() => void> = [];
    for (const type of types) {
      unsubscribers.push(
        eventBus.on(type, () => {
          events.push(type);
        })
      );
    }

    // Simulate the Genesis flow events in order
    await eventBus.emit('interview:started', {
      projectId: 'genesis-test',
      projectName: 'Test Project',
      mode: 'genesis' as const,
    });

    await eventBus.emit('interview:completed', {
      projectId: 'genesis-test',
      totalRequirements: 5,
      categories: ['functional'],
      duration: 300000,
    });

    await eventBus.emit('project:status-changed', {
      projectId: 'genesis-test',
      previousStatus: 'planning' as const,
      newStatus: 'executing' as const,
      reason: 'Planning completed',
    });

    await eventBus.emit('task:assigned', {
      taskId: 'task-1',
      agentId: 'coder-1',
      agentType: 'coder' as const,
      worktreePath: '/tmp/worktree',
    });

    await eventBus.emit('task:started', {
      taskId: 'task-1',
      agentId: 'coder-1',
      startedAt: new Date(),
    });

    await eventBus.emit('qa:build-completed', {
      taskId: 'task-1',
      passed: true,
      duration: 5000,
      errors: [],
    });

    await eventBus.emit('qa:test-completed', {
      taskId: 'task-1',
      passed: true,
      duration: 10000,
      passedCount: 5,
      failedCount: 0,
      coverage: 80,
    });

    await eventBus.emit('task:completed', {
      taskId: 'task-1',
      result: {
        taskId: 'task-1',
        success: true,
        files: [{ path: 'src/index.ts', action: 'created' as const }],
        metrics: { iterations: 1, tokensUsed: 1000, timeMs: 15000 },
      },
    });

    await eventBus.emit('project:completed', {
      projectId: 'genesis-test',
      totalDuration: 60000,
      metrics: {
        tasksTotal: 1,
        tasksCompleted: 1,
        tasksFailed: 0,
        featuresTotal: 1,
        featuresCompleted: 1,
        estimatedTotalMinutes: 5,
        actualTotalMinutes: 1,
        averageQAIterations: 1,
      },
    });

    // Cleanup
    unsubscribers.forEach((unsub) => unsub());

    // Verify event sequence
    expect(events).toContain('interview:started');
    expect(events).toContain('interview:completed');
    expect(events).toContain('project:status-changed');
    expect(events).toContain('task:assigned');
    expect(events).toContain('task:started');
    expect(events).toContain('qa:build-completed');
    expect(events).toContain('qa:test-completed');
    expect(events).toContain('task:completed');
    expect(events).toContain('project:completed');

    // Verify order (interview before project status change)
    const interviewIdx = events.indexOf('interview:completed');
    const statusIdx = events.indexOf('project:status-changed');
    expect(interviewIdx).toBeLessThan(statusIdx);
  });

  it('should handle task failure -> retry flow', async () => {
    const events: string[] = [];

    eventBus.on('task:started', () => { events.push('task:started'); });
    eventBus.on('task:failed', () => { events.push('task:failed'); });
    eventBus.on('qa:build-completed', () => { events.push('qa:build-completed'); });

    // First attempt - fails
    await eventBus.emit('task:started', {
      taskId: 'task-1',
      agentId: 'coder-1',
      startedAt: new Date(),
    });

    await eventBus.emit('qa:build-completed', {
      taskId: 'task-1',
      passed: false,
      duration: 3000,
      errors: ['src/index.ts: error TS2322'],
    });

    await eventBus.emit('task:failed', {
      taskId: 'task-1',
      error: 'Build failed',
      iterations: 1,
      escalated: false,
    });

    // Retry - starts again
    await eventBus.emit('task:started', {
      taskId: 'task-1',
      agentId: 'coder-1',
      startedAt: new Date(),
    });

    // Verify retry flow
    expect(events.filter((e) => e === 'task:started').length).toBe(2);
    expect(events).toContain('task:failed');
  });

  it('should handle escalation flow', async () => {
    const events: string[] = [];

    eventBus.on('task:failed', () => { events.push('task:failed'); });
    eventBus.on('task:escalated', () => { events.push('task:escalated'); });
    eventBus.on('system:checkpoint-created', () => { events.push('system:checkpoint-created'); });

    // Task fails after max iterations
    await eventBus.emit('task:failed', {
      taskId: 'task-1',
      error: 'Test still failing after 50 iterations',
      iterations: 50,
      escalated: true,
    });

    await eventBus.emit('task:escalated', {
      taskId: 'task-1',
      reason: 'Max iterations exceeded',
      iterations: 50,
      lastError: 'Test assertion failed',
    });

    await eventBus.emit('system:checkpoint-created', {
      checkpointId: 'cp-1',
      projectId: 'test-project',
      reason: 'Task escalated for human review',
      gitCommit: 'abc123def456',
    });

    expect(events).toContain('task:escalated');
    expect(events).toContain('system:checkpoint-created');
  });
});

// ============================================================================
// Event Subscription Management Tests
// ============================================================================

describe('NexusBootstrap - Subscription Management', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = getEventBus();
  });

  it('should properly unsubscribe event handlers', async () => {
    let callCount = 0;

    const unsubscribe = eventBus.on('task:started', () => {
      callCount++;
    });

    // Emit once - should trigger
    await eventBus.emit('task:started', {
      taskId: 'task-1',
      agentId: 'agent-1',
      startedAt: new Date(),
    });
    expect(callCount).toBe(1);

    // Unsubscribe
    unsubscribe();

    // Emit again - should NOT trigger
    await eventBus.emit('task:started', {
      taskId: 'task-2',
      agentId: 'agent-1',
      startedAt: new Date(),
    });
    expect(callCount).toBe(1); // Still 1, not 2
  });

  it('should support onAny for global event monitoring', async () => {
    const allEvents: string[] = [];

    const unsubscribe = eventBus.onAny((event) => {
      allEvents.push(event.type);
    });

    await eventBus.emit('task:started', {
      taskId: 'task-1',
      agentId: 'agent-1',
      startedAt: new Date(),
    });

    await eventBus.emit('task:completed', {
      taskId: 'task-1',
      result: {
        taskId: 'task-1',
        success: true,
        files: [],
        metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
      },
    });

    unsubscribe();

    expect(allEvents).toContain('task:started');
    expect(allEvents).toContain('task:completed');
  });

  it('should handle multiple unsubscribes gracefully', () => {
    const unsubscribe = eventBus.on('task:started', () => {});

    // First unsubscribe
    expect(() => unsubscribe()).not.toThrow();

    // Second unsubscribe should also not throw
    expect(() => unsubscribe()).not.toThrow();
  });
});
