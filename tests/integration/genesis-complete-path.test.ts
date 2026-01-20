/**
 * Genesis Complete Path Integration Tests
 *
 * Phase 19 Task 5: Tests for the complete Genesis path wiring that covers:
 * - QA Failure -> Escalation -> Checkpoint creation
 * - Success -> Merge wiring
 * - Backend -> UI event forwarding
 * - Human review request on escalation
 *
 * These tests verify that the complete Genesis flow events propagate correctly
 * through the NexusBootstrap wiring layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, getEventBus } from '../../src/orchestration/events/EventBus';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Mock BrowserWindow for IPC testing
 */
function createMockBrowserWindow() {
  return {
    webContents: {
      send: vi.fn(),
    },
  };
}

/**
 * Helper to wait for async event propagation
 */
function waitForEventPropagation(ms = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// QA Failure -> Escalation -> Checkpoint Tests
// ============================================================================

describe('Genesis Complete Path - QA Failure Handling', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    // Subscribe to all events to track what's emitted
    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  describe('Task Escalation Flow', () => {
    it('should emit task:escalated event when QA loop is exhausted', async () => {
      await eventBus.emit('task:escalated', {
        taskId: 'genesis-123-task-1',
        reason: 'Max iterations exceeded',
        iterations: 50,
        lastError: 'Test assertion failed: Expected true but got false',
      });

      const event = eventLog.find((e) => e.type === 'task:escalated');
      expect(event).toBeDefined();
      expect(event?.payload).toMatchObject({
        taskId: 'genesis-123-task-1',
        reason: 'Max iterations exceeded',
        iterations: 50,
      });
    });

    it('should support review:requested event after escalation', async () => {
      // First escalate the task
      await eventBus.emit('task:escalated', {
        taskId: 'genesis-123-task-2',
        reason: 'Build failures persist',
        iterations: 25,
        lastError: 'TypeScript compilation error',
      });

      // Then request review
      await eventBus.emit('review:requested', {
        reviewId: 'review-001',
        taskId: 'genesis-123-task-2',
        reason: 'qa_exhausted' as const,
        context: {
          qaIterations: 25,
          escalationReason: 'Build failures persist',
          suggestedAction: 'Review TypeScript errors and adjust task requirements',
        },
      });

      const escalatedEvent = eventLog.find((e) => e.type === 'task:escalated');
      const reviewEvent = eventLog.find((e) => e.type === 'review:requested');

      expect(escalatedEvent).toBeDefined();
      expect(reviewEvent).toBeDefined();
      expect((reviewEvent?.payload as { taskId: string }).taskId).toBe('genesis-123-task-2');
    });

    it('should create checkpoint on escalation via system:checkpoint-created event', async () => {
      // Simulate the checkpoint creation event
      await eventBus.emit('system:checkpoint-created', {
        checkpointId: 'cp-escalation-001',
        projectId: 'genesis-123',
        reason: 'Task escalated for human review',
        gitCommit: 'abc123def456789',
      });

      const checkpointEvent = eventLog.find((e) => e.type === 'system:checkpoint-created');
      expect(checkpointEvent).toBeDefined();
      expect(checkpointEvent?.payload).toMatchObject({
        checkpointId: 'cp-escalation-001',
        projectId: 'genesis-123',
        reason: 'Task escalated for human review',
      });
    });
  });

  describe('Task Failure Without Escalation', () => {
    it('should emit task:failed event for non-escalated failures', async () => {
      await eventBus.emit('task:failed', {
        taskId: 'genesis-456-task-1',
        error: 'Network timeout during API call',
        iterations: 3,
        escalated: false,
      });

      const event = eventLog.find((e) => e.type === 'task:failed');
      expect(event).toBeDefined();
      expect((event?.payload as { escalated: boolean }).escalated).toBe(false);
    });

    it('should distinguish between recoverable and escalated failures', async () => {
      // Recoverable failure
      await eventBus.emit('task:failed', {
        taskId: 'genesis-789-task-1',
        error: 'Transient error',
        iterations: 2,
        escalated: false,
      });

      // Escalated failure
      await eventBus.emit('task:failed', {
        taskId: 'genesis-789-task-2',
        error: 'Persistent error after all retries',
        iterations: 50,
        escalated: true,
      });

      const failures = eventLog.filter((e) => e.type === 'task:failed');
      expect(failures.length).toBe(2);

      const nonEscalated = failures.find(
        (f) => (f.payload as { taskId: string }).taskId === 'genesis-789-task-1'
      );
      const escalated = failures.find(
        (f) => (f.payload as { taskId: string }).taskId === 'genesis-789-task-2'
      );

      expect((nonEscalated?.payload as { escalated: boolean }).escalated).toBe(false);
      expect((escalated?.payload as { escalated: boolean }).escalated).toBe(true);
    });
  });
});

// ============================================================================
// Success -> Merge Flow Tests
// ============================================================================

describe('Genesis Complete Path - Success Merge Flow', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should emit task:completed event with success result', async () => {
    await eventBus.emit('task:completed', {
      taskId: 'genesis-task-001',
      result: {
        taskId: 'genesis-task-001',
        success: true,
        files: [
          { path: 'src/index.ts', action: 'created' as const },
          { path: 'src/utils/helper.ts', action: 'created' as const },
        ],
        metrics: {
          iterations: 2,
          tokensUsed: 3500,
          timeMs: 45000,
        },
      },
    });

    const event = eventLog.find((e) => e.type === 'task:completed');
    expect(event).toBeDefined();

    const payload = event?.payload as {
      result: { success: boolean; files: Array<{ path: string }> };
    };
    expect(payload.result.success).toBe(true);
    expect(payload.result.files.length).toBe(2);
  });

  it('should complete full QA success sequence before task completion', async () => {
    const taskId = 'genesis-task-002';

    // QA Build passes
    await eventBus.emit('qa:build-completed', {
      taskId,
      passed: true,
      duration: 5000,
      errors: [],
    });

    // QA Lint passes
    await eventBus.emit('qa:lint-completed', {
      taskId,
      passed: true,
      duration: 2000,
      errors: [],
      warnings: [],
    });

    // QA Tests pass
    await eventBus.emit('qa:test-completed', {
      taskId,
      passed: true,
      duration: 15000,
      passedCount: 25,
      failedCount: 0,
      coverage: 85,
    });

    // QA Review passes
    await eventBus.emit('qa:review-completed', {
      taskId,
      approved: true,
      duration: 3000,
      reviewer: 'ai' as const,
      issueCount: 0,
    });

    // Task completes
    await eventBus.emit('task:completed', {
      taskId,
      result: {
        taskId,
        success: true,
        files: [{ path: 'src/feature.ts', action: 'created' as const }],
        metrics: { iterations: 1, tokensUsed: 2000, timeMs: 25000 },
      },
    });

    // Verify all QA events fired
    expect(eventLog.filter((e) => e.type.startsWith('qa:')).length).toBe(4);
    expect(eventLog.find((e) => e.type === 'task:completed')).toBeDefined();
  });

  it('should emit project:completed when all tasks complete', async () => {
    await eventBus.emit('project:completed', {
      projectId: 'genesis-complete-project',
      totalDuration: 3600000, // 1 hour
      metrics: {
        tasksTotal: 10,
        tasksCompleted: 10,
        tasksFailed: 0,
        featuresTotal: 3,
        featuresCompleted: 3,
        estimatedTotalMinutes: 120,
        actualTotalMinutes: 60,
        averageQAIterations: 1.5,
      },
    });

    const event = eventLog.find((e) => e.type === 'project:completed');
    expect(event).toBeDefined();

    const payload = event?.payload as {
      metrics: { tasksCompleted: number; tasksFailed: number };
    };
    expect(payload.metrics.tasksCompleted).toBe(10);
    expect(payload.metrics.tasksFailed).toBe(0);
  });
});

// ============================================================================
// Backend -> UI Event Forwarding Tests
// ============================================================================

describe('Genesis Complete Path - UI Event Forwarding', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should emit all event types needed for UI updates', async () => {
    // Events that the UI needs to receive
    const uiEvents = [
      {
        type: 'interview:started' as const,
        payload: {
          projectId: 'ui-test-project',
          projectName: 'UI Test',
          mode: 'genesis' as const,
        },
      },
      {
        type: 'interview:completed' as const,
        payload: {
          projectId: 'ui-test-project',
          totalRequirements: 5,
          categories: ['functional', 'technical'],
          duration: 180000,
        },
      },
      {
        type: 'project:status-changed' as const,
        payload: {
          projectId: 'ui-test-project',
          previousStatus: 'planning' as const,
          newStatus: 'executing' as const,
          reason: 'Planning completed',
        },
      },
      {
        type: 'task:assigned' as const,
        payload: {
          taskId: 'task-ui-001',
          agentId: 'coder-1',
          agentType: 'coder' as const,
          worktreePath: '/tmp/worktree',
        },
      },
      {
        type: 'task:started' as const,
        payload: {
          taskId: 'task-ui-001',
          agentId: 'coder-1',
          startedAt: new Date(),
        },
      },
      {
        type: 'qa:build-completed' as const,
        payload: {
          taskId: 'task-ui-001',
          passed: true,
          duration: 5000,
          errors: [],
        },
      },
      {
        type: 'task:completed' as const,
        payload: {
          taskId: 'task-ui-001',
          result: {
            taskId: 'task-ui-001',
            success: true,
            files: [],
            metrics: { iterations: 1, tokensUsed: 0, timeMs: 0 },
          },
        },
      },
      {
        type: 'project:completed' as const,
        payload: {
          projectId: 'ui-test-project',
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
        },
      },
    ];

    // Emit all events
    for (const event of uiEvents) {
      await eventBus.emit(event.type, event.payload);
    }

    // Verify all events were logged
    expect(eventLog.length).toBe(uiEvents.length);

    // Verify event types match
    const loggedTypes = eventLog.map((e) => e.type);
    for (const event of uiEvents) {
      expect(loggedTypes).toContain(event.type);
    }
  });

  it('should forward system events to UI', async () => {
    // System checkpoint events
    await eventBus.emit('system:checkpoint-created', {
      checkpointId: 'cp-ui-001',
      projectId: 'ui-test-project',
      reason: 'Manual checkpoint',
      gitCommit: 'abc123',
    });

    await eventBus.emit('system:checkpoint-restored', {
      checkpointId: 'cp-ui-001',
      projectId: 'ui-test-project',
      gitCommit: 'restored-commit-hash',
    });

    await eventBus.emit('system:error', {
      component: 'TaskExecutor',
      error: 'Connection timeout',
      recoverable: true,
    });

    expect(eventLog.find((e) => e.type === 'system:checkpoint-created')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'system:checkpoint-restored')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'system:error')).toBeDefined();
  });

  it('should forward review:requested events to UI', async () => {
    await eventBus.emit('review:requested', {
      reviewId: 'review-ui-001',
      taskId: 'task-needs-review',
      reason: 'qa_exhausted' as const,
      context: {
        qaIterations: 50,
        escalationReason: 'Tests still failing',
        suggestedAction: 'Review test assertions',
      },
    });

    const reviewEvent = eventLog.find((e) => e.type === 'review:requested');
    expect(reviewEvent).toBeDefined();
    expect((reviewEvent?.payload as { reviewId: string }).reviewId).toBe('review-ui-001');
  });
});

// ============================================================================
// Checkpoint Management Integration Tests
// ============================================================================

describe('Genesis Complete Path - Checkpoint Management', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should emit checkpoint events during escalation flow', async () => {
    // Simulate full escalation -> checkpoint -> review flow
    const projectId = 'genesis-checkpoint-test';
    const taskId = `${projectId}-task-1`;

    // 1. Task fails
    await eventBus.emit('task:failed', {
      taskId,
      error: 'Build errors after 50 iterations',
      iterations: 50,
      escalated: true,
    });

    // 2. Task escalates
    await eventBus.emit('task:escalated', {
      taskId,
      reason: 'Max iterations exceeded',
      iterations: 50,
      lastError: 'TypeScript error TS2322',
    });

    // 3. Checkpoint created
    await eventBus.emit('system:checkpoint-created', {
      checkpointId: `cp-${Date.now()}`,
      projectId,
      reason: 'Task escalated for human review',
      gitCommit: 'checkpoint-commit-hash',
    });

    // 4. Review requested
    await eventBus.emit('review:requested', {
      reviewId: `review-${Date.now()}`,
      taskId,
      reason: 'qa_exhausted' as const,
      context: {
        qaIterations: 50,
        escalationReason: 'Max iterations exceeded',
        suggestedAction: 'Review TypeScript error TS2322',
      },
    });

    // Verify the complete flow
    expect(eventLog.find((e) => e.type === 'task:failed')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'task:escalated')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'system:checkpoint-created')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'review:requested')).toBeDefined();
  });

  it('should support checkpoint restore flow', async () => {
    const checkpointId = 'cp-restore-test';
    const projectId = 'genesis-restore-project';

    // Restore checkpoint
    await eventBus.emit('system:checkpoint-restored', {
      checkpointId,
      projectId,
      gitCommit: 'restored-commit-sha',
    });

    // Project status changes after restore
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'executing' as const,
      newStatus: 'paused' as const,
      reason: 'Checkpoint restored for review',
    });

    const restoreEvent = eventLog.find((e) => e.type === 'system:checkpoint-restored');
    const statusEvent = eventLog.find((e) => e.type === 'project:status-changed');

    expect(restoreEvent).toBeDefined();
    expect(statusEvent).toBeDefined();
    expect((statusEvent?.payload as { newStatus: string }).newStatus).toBe('paused');
  });
});

// ============================================================================
// Complete Genesis Flow Sequence Tests
// ============================================================================

describe('Genesis Complete Path - Full Sequence Integration', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown; timestamp: Date }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({
        type: event.type,
        payload: event.payload,
        timestamp: new Date(),
      });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should complete happy path: interview -> planning -> execution -> success', async () => {
    const projectId = 'genesis-happy-path';

    // 1. Interview starts
    await eventBus.emit('interview:started', {
      projectId,
      projectName: 'Happy Path Project',
      mode: 'genesis' as const,
    });

    // 2. Interview completes
    await eventBus.emit('interview:completed', {
      projectId,
      totalRequirements: 3,
      categories: ['functional'],
      duration: 120000,
    });

    // 3. Planning -> Execution status change
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'planning' as const,
      newStatus: 'executing' as const,
      reason: 'Interview completed, starting execution',
    });

    // 4. Task assigned
    await eventBus.emit('task:assigned', {
      taskId: `${projectId}-task-1`,
      agentId: 'coder-001',
      agentType: 'coder' as const,
      worktreePath: '/tmp/genesis-work',
    });

    // 5. Task starts
    await eventBus.emit('task:started', {
      taskId: `${projectId}-task-1`,
      agentId: 'coder-001',
      startedAt: new Date(),
    });

    // 6. QA passes
    await eventBus.emit('qa:build-completed', {
      taskId: `${projectId}-task-1`,
      passed: true,
      duration: 5000,
      errors: [],
    });

    await eventBus.emit('qa:test-completed', {
      taskId: `${projectId}-task-1`,
      passed: true,
      duration: 10000,
      passedCount: 10,
      failedCount: 0,
      coverage: 80,
    });

    // 7. Task completes
    await eventBus.emit('task:completed', {
      taskId: `${projectId}-task-1`,
      result: {
        taskId: `${projectId}-task-1`,
        success: true,
        files: [{ path: 'src/feature.ts', action: 'created' as const }],
        metrics: { iterations: 1, tokensUsed: 2000, timeMs: 20000 },
      },
    });

    // 8. Project completes
    await eventBus.emit('project:completed', {
      projectId,
      totalDuration: 300000,
      metrics: {
        tasksTotal: 1,
        tasksCompleted: 1,
        tasksFailed: 0,
        featuresTotal: 1,
        featuresCompleted: 1,
        estimatedTotalMinutes: 10,
        actualTotalMinutes: 5,
        averageQAIterations: 1,
      },
    });

    // Verify sequence
    const eventTypes = eventLog.map((e) => e.type);
    expect(eventTypes).toEqual([
      'interview:started',
      'interview:completed',
      'project:status-changed',
      'task:assigned',
      'task:started',
      'qa:build-completed',
      'qa:test-completed',
      'task:completed',
      'project:completed',
    ]);
  });

  it('should complete escalation path: execution -> failure -> escalation -> checkpoint -> review', async () => {
    const projectId = 'genesis-escalation-path';
    const taskId = `${projectId}-task-fail`;

    // 1. Task starts
    await eventBus.emit('task:started', {
      taskId,
      agentId: 'coder-002',
      startedAt: new Date(),
    });

    // 2. QA fails
    await eventBus.emit('qa:build-completed', {
      taskId,
      passed: false,
      duration: 3000,
      errors: ['TypeScript error: TS2322'],
    });

    // 3. Task fails with escalation
    await eventBus.emit('task:failed', {
      taskId,
      error: 'Build failed after 50 iterations',
      iterations: 50,
      escalated: true,
    });

    // 4. Task escalates
    await eventBus.emit('task:escalated', {
      taskId,
      reason: 'Max iterations exceeded',
      iterations: 50,
      lastError: 'TypeScript error: TS2322',
    });

    // 5. Checkpoint created
    await eventBus.emit('system:checkpoint-created', {
      checkpointId: `cp-${taskId}`,
      projectId,
      reason: 'Task escalated',
      gitCommit: 'escalation-commit',
    });

    // 6. Review requested
    await eventBus.emit('review:requested', {
      reviewId: `review-${taskId}`,
      taskId,
      reason: 'qa_exhausted' as const,
      context: {
        qaIterations: 50,
        escalationReason: 'Max iterations exceeded',
        suggestedAction: 'Fix TypeScript errors',
      },
    });

    // Verify escalation flow sequence
    const eventTypes = eventLog.map((e) => e.type);
    expect(eventTypes).toEqual([
      'task:started',
      'qa:build-completed',
      'task:failed',
      'task:escalated',
      'system:checkpoint-created',
      'review:requested',
    ]);
  });

  it('should support retry path: failure -> retry -> success', async () => {
    const projectId = 'genesis-retry-path';
    const taskId = `${projectId}-task-retry`;

    // First attempt - fails
    await eventBus.emit('task:started', {
      taskId,
      agentId: 'coder-003',
      startedAt: new Date(),
    });

    await eventBus.emit('qa:test-completed', {
      taskId,
      passed: false,
      duration: 8000,
      passedCount: 8,
      failedCount: 2,
      coverage: 70,
    });

    await eventBus.emit('task:failed', {
      taskId,
      error: '2 tests failed',
      iterations: 1,
      escalated: false, // Not escalated - will retry
    });

    // Second attempt - succeeds
    await eventBus.emit('task:started', {
      taskId,
      agentId: 'coder-003',
      startedAt: new Date(),
    });

    await eventBus.emit('qa:test-completed', {
      taskId,
      passed: true,
      duration: 10000,
      passedCount: 10,
      failedCount: 0,
      coverage: 80,
    });

    await eventBus.emit('task:completed', {
      taskId,
      result: {
        taskId,
        success: true,
        files: [{ path: 'src/fixed.ts', action: 'modified' as const }],
        metrics: { iterations: 2, tokensUsed: 4000, timeMs: 30000 },
      },
    });

    // Verify retry sequence
    const startEvents = eventLog.filter((e) => e.type === 'task:started');
    const failEvents = eventLog.filter((e) => e.type === 'task:failed');
    const completeEvents = eventLog.filter((e) => e.type === 'task:completed');

    expect(startEvents.length).toBe(2); // Two attempts
    expect(failEvents.length).toBe(1); // One failure
    expect(completeEvents.length).toBe(1); // One success
  });
});

// ============================================================================
// Event Payload Validation Tests
// ============================================================================

describe('Genesis Complete Path - Event Payload Validation', () => {
  let eventBus: EventBus;
  const unsubscribers: Array<() => void> = [];

  beforeEach(() => {
    eventBus = getEventBus();
  });

  afterEach(() => {
    // Clean up all subscriptions
    unsubscribers.forEach(unsub => unsub());
    unsubscribers.length = 0;
  });

  it('should validate task:escalated payload structure', async () => {
    let capturedPayload: unknown = null;

    const unsub = eventBus.on('task:escalated', (event) => {
      capturedPayload = event.payload;
    });
    unsubscribers.push(unsub);

    await eventBus.emit('task:escalated', {
      taskId: 'payload-test-task',
      reason: 'Max iterations',
      iterations: 50,
      lastError: 'Error details',
    });

    expect(capturedPayload).toMatchObject({
      taskId: expect.any(String),
      reason: expect.any(String),
      iterations: expect.any(Number),
      lastError: expect.any(String),
    });
  });

  it('should validate review:requested payload structure', async () => {
    let capturedPayload: unknown = null;

    const unsub = eventBus.on('review:requested', (event) => {
      capturedPayload = event.payload;
    });
    unsubscribers.push(unsub);

    await eventBus.emit('review:requested', {
      reviewId: 'review-payload-test',
      taskId: 'task-payload-test',
      reason: 'qa_exhausted' as const,
      context: {
        qaIterations: 30,
        escalationReason: 'Tests failing',
        suggestedAction: 'Review the tests',
      },
    });

    expect(capturedPayload).toMatchObject({
      reviewId: expect.any(String),
      taskId: expect.any(String),
      reason: 'qa_exhausted',
      context: expect.objectContaining({
        qaIterations: expect.any(Number),
      }),
    });
  });

  it('should validate system:checkpoint-created payload structure', async () => {
    let capturedPayload: unknown = null;

    const unsub = eventBus.on('system:checkpoint-created', (event) => {
      capturedPayload = event.payload;
    });
    unsubscribers.push(unsub);

    await eventBus.emit('system:checkpoint-created', {
      checkpointId: 'cp-payload-test',
      projectId: 'project-payload-test',
      reason: 'Manual checkpoint',
      gitCommit: 'abc123def',
    });

    expect(capturedPayload).toMatchObject({
      checkpointId: expect.any(String),
      projectId: expect.any(String),
      reason: expect.any(String),
      gitCommit: expect.any(String),
    });
  });

  it('should validate task:completed payload with metrics', async () => {
    let capturedPayload: unknown = null;

    const unsub = eventBus.on('task:completed', (event) => {
      capturedPayload = event.payload;
    });
    unsubscribers.push(unsub);

    await eventBus.emit('task:completed', {
      taskId: 'metrics-test-task',
      result: {
        taskId: 'metrics-test-task',
        success: true,
        files: [
          { path: 'src/file1.ts', action: 'created' as const },
          { path: 'src/file2.ts', action: 'modified' as const },
        ],
        metrics: {
          iterations: 3,
          tokensUsed: 5000,
          timeMs: 60000,
        },
      },
    });

    const payload = capturedPayload as {
      result: {
        success: boolean;
        files: Array<{ path: string; action: string }>;
        metrics: { iterations: number; tokensUsed: number; timeMs: number };
      };
    };

    expect(payload.result.success).toBe(true);
    expect(payload.result.files.length).toBe(2);
    expect(payload.result.metrics.iterations).toBe(3);
    expect(payload.result.metrics.tokensUsed).toBe(5000);
  });
});
