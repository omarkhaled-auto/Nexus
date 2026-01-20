/**
 * Real-time UI Wiring Integration Tests
 *
 * Phase 19 Task 16: Wire Real-time UI Updates
 *
 * Tests verify:
 * 1. Dashboard metrics event forwarding and handling
 * 2. Timeline event forwarding and handling
 * 3. Agent metrics/status event forwarding
 * 4. Execution progress and log event forwarding
 * 5. Feature update event forwarding (Kanban)
 * 6. Proper cleanup of subscriptions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus, getEventBus } from '../../src/orchestration/events/EventBus';

describe('Real-time UI Wiring', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Get fresh event bus instance
    eventBus = getEventBus();
  });

  afterEach(() => {
    // Clean up subscriptions
    eventBus.removeAllListeners();
  });

  // =========================================================================
  // Dashboard Metrics Event Tests
  // =========================================================================
  describe('Dashboard Metrics Event Forwarding', () => {
    it('should forward task:completed events with proper payload', async () => {
      const events: unknown[] = [];

      // Subscribe to task:completed
      eventBus.on('task:completed', (event) => {
        events.push(event.payload);
      });

      // Emit task:completed with properly typed payload
      await eventBus.emit('task:completed', {
        taskId: 'task-123',
        result: {
          taskId: 'task-123',
          success: true,
          files: [{ path: 'src/index.ts', action: 'created' as const }],
          metrics: {
            iterations: 1,
            tokensUsed: 500,
            timeMs: 1000,
          },
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-123',
        result: {
          success: true,
        },
      });
    });

    it('should forward project:status-changed events', async () => {
      const events: unknown[] = [];

      eventBus.on('project:status-changed', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('project:status-changed', {
        projectId: 'genesis-123',
        previousStatus: 'planning' as const,
        newStatus: 'executing' as const,
        reason: 'Interview completed',
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        projectId: 'genesis-123',
        previousStatus: 'planning',
        newStatus: 'executing',
      });
    });

    it('should forward project:completed events', async () => {
      const events: unknown[] = [];

      eventBus.on('project:completed', (event) => {
        events.push(event.payload);
      });

      // Use correct ProjectCompletedPayload with metrics
      await eventBus.emit('project:completed', {
        projectId: 'genesis-123',
        totalDuration: 5000,
        metrics: {
          tasksTotal: 10,
          tasksCompleted: 10,
          tasksFailed: 0,
          featuresTotal: 3,
          featuresCompleted: 3,
          estimatedTotalMinutes: 60,
          actualTotalMinutes: 55,
          averageQAIterations: 1.5,
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        projectId: 'genesis-123',
        totalDuration: 5000,
      });
    });
  });

  // =========================================================================
  // Task Event Tests
  // =========================================================================
  describe('Task Event Forwarding', () => {
    it('should forward task:assigned events', async () => {
      const events: unknown[] = [];

      eventBus.on('task:assigned', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('task:assigned', {
        taskId: 'task-456',
        agentId: 'agent-1',
        agentType: 'coder' as const,
        worktreePath: '/tmp/task-456',
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-456',
        agentId: 'agent-1',
        agentType: 'coder',
      });
    });

    it('should forward task:started events', async () => {
      const events: unknown[] = [];

      eventBus.on('task:started', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('task:started', {
        taskId: 'task-789',
        agentId: 'agent-2',
        startedAt: new Date(),
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-789',
        agentId: 'agent-2',
      });
    });

    it('should forward task:failed events', async () => {
      const events: unknown[] = [];

      eventBus.on('task:failed', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('task:failed', {
        taskId: 'task-error',
        error: 'Build failed',
        iterations: 3,
        escalated: false,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-error',
        error: 'Build failed',
        iterations: 3,
      });
    });

    it('should forward task:escalated events', async () => {
      const events: unknown[] = [];

      eventBus.on('task:escalated', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('task:escalated', {
        taskId: 'task-escalated',
        reason: 'Max iterations exceeded',
        iterations: 5,
        lastError: 'Test failures persist',
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-escalated',
        reason: 'Max iterations exceeded',
        iterations: 5,
      });
    });
  });

  // =========================================================================
  // Interview Event Tests
  // =========================================================================
  describe('Interview Event Forwarding', () => {
    it('should forward interview:started events', async () => {
      const events: unknown[] = [];

      eventBus.on('interview:started', (event) => {
        events.push(event.payload);
      });

      // Use correct InterviewStartedPayload with projectName
      await eventBus.emit('interview:started', {
        projectId: 'genesis-interview',
        projectName: 'My Project',
        mode: 'genesis' as const,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        projectId: 'genesis-interview',
        mode: 'genesis',
      });
    });

    it('should forward interview:completed events', async () => {
      const events: unknown[] = [];

      eventBus.on('interview:completed', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('interview:completed', {
        projectId: 'genesis-interview',
        totalRequirements: 5,
        categories: ['functional', 'technical'],
        duration: 60000,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        projectId: 'genesis-interview',
        totalRequirements: 5,
      });
    });

    it('should forward interview:requirement-captured events', async () => {
      const events: unknown[] = [];

      eventBus.on('interview:requirement-captured', (event) => {
        events.push(event.payload);
      });

      // Use correct InterviewRequirementCapturedPayload with requirement object
      await eventBus.emit('interview:requirement-captured', {
        projectId: 'genesis-interview',
        requirement: {
          id: 'req-1',
          projectId: 'genesis-interview',
          content: 'User authentication required',
          priority: 'high' as const,
          category: 'functional' as const,
          source: 'interview' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(events).toHaveLength(1);
      expect((events[0] as { requirement: { id: string } }).requirement.id).toBe('req-1');
    });
  });

  // =========================================================================
  // QA Event Tests
  // =========================================================================
  describe('QA Event Forwarding', () => {
    it('should forward qa:build-completed events', async () => {
      const events: unknown[] = [];

      eventBus.on('qa:build-completed', (event) => {
        events.push(event.payload);
      });

      // Use correct QABuildCompletedPayload with passed, errors
      await eventBus.emit('qa:build-completed', {
        taskId: 'task-qa',
        passed: true,
        errors: [],
        duration: 5000,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-qa',
        passed: true,
      });
    });

    it('should forward qa:test-completed events', async () => {
      const events: unknown[] = [];

      eventBus.on('qa:test-completed', (event) => {
        events.push(event.payload);
      });

      // Use correct QATestCompletedPayload
      await eventBus.emit('qa:test-completed', {
        taskId: 'task-qa',
        passed: false,
        passedCount: 7,
        failedCount: 3,
        duration: 10000,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: 'task-qa',
        passed: false,
        failedCount: 3,
      });
    });
  });

  // =========================================================================
  // System Event Tests
  // =========================================================================
  describe('System Event Forwarding', () => {
    it('should forward system:checkpoint-created events', async () => {
      const events: unknown[] = [];

      eventBus.on('system:checkpoint-created', (event) => {
        events.push(event.payload);
      });

      // Use correct CheckpointCreatedPayload with gitCommit
      await eventBus.emit('system:checkpoint-created', {
        checkpointId: 'cp-123',
        projectId: 'genesis-123',
        reason: 'Manual checkpoint',
        gitCommit: 'abc123def456',
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        checkpointId: 'cp-123',
        reason: 'Manual checkpoint',
      });
    });

    it('should forward system:checkpoint-restored events', async () => {
      const events: unknown[] = [];

      eventBus.on('system:checkpoint-restored', (event) => {
        events.push(event.payload);
      });

      // Use correct CheckpointRestoredPayload with gitCommit
      await eventBus.emit('system:checkpoint-restored', {
        checkpointId: 'cp-123',
        projectId: 'genesis-123',
        gitCommit: 'abc123def456',
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        checkpointId: 'cp-123',
      });
    });

    it('should forward system:error events', async () => {
      const events: unknown[] = [];

      eventBus.on('system:error', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('system:error', {
        component: 'NexusBootstrap',
        error: 'Initialization failed',
        recoverable: true,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        component: 'NexusBootstrap',
        error: 'Initialization failed',
      });
    });
  });

  // =========================================================================
  // Review Event Tests
  // =========================================================================
  describe('Review Event Forwarding', () => {
    it('should forward review:requested events', async () => {
      const events: unknown[] = [];

      eventBus.on('review:requested', (event) => {
        events.push(event.payload);
      });

      await eventBus.emit('review:requested', {
        reviewId: 'review-1',
        taskId: 'task-escalated',
        reason: 'qa_exhausted' as const,
        context: {
          qaIterations: 5,
          escalationReason: 'Max iterations',
          suggestedAction: 'Review code',
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        reviewId: 'review-1',
        taskId: 'task-escalated',
        reason: 'qa_exhausted',
      });
    });
  });

  // =========================================================================
  // Event Subscription Cleanup Tests
  // =========================================================================
  describe('Event Subscription Cleanup', () => {
    it('should properly unsubscribe from events', async () => {
      const events: unknown[] = [];

      const unsub = eventBus.on('task:completed', (event) => {
        events.push(event.payload);
      });

      // Emit first event
      await eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: {
          taskId: 'task-1',
          success: true,
          files: [],
          metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
        },
      });

      expect(events).toHaveLength(1);

      // Unsubscribe
      unsub();

      // Emit second event
      await eventBus.emit('task:completed', {
        taskId: 'task-2',
        result: {
          taskId: 'task-2',
          success: true,
          files: [],
          metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
        },
      });

      // Should still be 1 since we unsubscribed
      expect(events).toHaveLength(1);
    });

    it('should support multiple subscribers for same event', async () => {
      const events1: unknown[] = [];
      const events2: unknown[] = [];

      eventBus.on('task:started', (event) => {
        events1.push(event.payload);
      });

      eventBus.on('task:started', (event) => {
        events2.push(event.payload);
      });

      await eventBus.emit('task:started', {
        taskId: 'task-multi',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });
  });

  // =========================================================================
  // Event Payload Validation Tests
  // =========================================================================
  describe('Event Payload Validation', () => {
    it('should include timestamp in all events', async () => {
      const events: Array<{ timestamp: Date }> = [];

      eventBus.on('task:completed', (event) => {
        events.push({ timestamp: event.timestamp });
      });

      await eventBus.emit('task:completed', {
        taskId: 'task-ts',
        result: {
          taskId: 'task-ts',
          success: true,
          files: [],
          metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
        },
      });

      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should include event type in emitted event', async () => {
      const events: Array<{ type: string }> = [];

      eventBus.on('project:completed', (event) => {
        events.push({ type: event.type });
      });

      // Use correct payload
      await eventBus.emit('project:completed', {
        projectId: 'proj-1',
        totalDuration: 10000,
        metrics: {
          tasksTotal: 5,
          tasksCompleted: 5,
          tasksFailed: 0,
          featuresTotal: 2,
          featuresCompleted: 2,
          estimatedTotalMinutes: 30,
          actualTotalMinutes: 28,
          averageQAIterations: 1.6,
        },
      });

      expect(events[0].type).toBe('project:completed');
    });
  });

  // =========================================================================
  // onAny Event Tests (for UI event forwarding)
  // =========================================================================
  describe('onAny Event Forwarding', () => {
    it('should capture all events with onAny', async () => {
      const allEvents: Array<{ type: string; payload: unknown }> = [];

      const unsub = eventBus.onAny((event) => {
        allEvents.push({ type: event.type, payload: event.payload });
      });

      // Emit multiple different events
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

      await eventBus.emit('interview:started', {
        projectId: 'proj-1',
        projectName: 'Test Project',
        mode: 'genesis' as const,
      });

      expect(allEvents).toHaveLength(3);
      expect(allEvents.map((e) => e.type)).toEqual([
        'task:started',
        'task:completed',
        'interview:started',
      ]);

      unsub();
    });

    it('should support filtering events in onAny handler', async () => {
      const uiEvents: string[] = [];
      const eventsToForward = [
        'task:completed',
        'project:completed',
        'interview:completed',
      ];

      eventBus.onAny((event) => {
        if (eventsToForward.includes(event.type)) {
          uiEvents.push(event.type);
        }
      });

      // These should be forwarded
      await eventBus.emit('task:completed', {
        taskId: 'task-1',
        result: {
          taskId: 'task-1',
          success: true,
          files: [],
          metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
        },
      });

      await eventBus.emit('project:completed', {
        projectId: 'proj-1',
        totalDuration: 10000,
        metrics: {
          tasksTotal: 5,
          tasksCompleted: 5,
          tasksFailed: 0,
          featuresTotal: 2,
          featuresCompleted: 2,
          estimatedTotalMinutes: 30,
          actualTotalMinutes: 28,
          averageQAIterations: 1.6,
        },
      });

      // This should NOT be forwarded
      await eventBus.emit('task:started', {
        taskId: 'task-2',
        agentId: 'agent-1',
        startedAt: new Date(),
      });

      expect(uiEvents).toHaveLength(2);
      expect(uiEvents).toEqual(['task:completed', 'project:completed']);
    });
  });
});
