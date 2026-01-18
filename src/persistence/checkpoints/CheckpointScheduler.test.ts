/**
 * CheckpointScheduler tests
 *
 * Tests for automatic checkpoint creation with time-based and event-based triggers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../../orchestration/events/EventBus';
import { CheckpointScheduler, type CheckpointConfig } from './CheckpointScheduler';

// ============================================================================
// Mocks
// ============================================================================

const mockCheckpointManager = {
  createAutoCheckpoint: vi.fn().mockResolvedValue({
    id: 'chk-123',
    projectId: 'proj-1',
    reason: 'Auto-checkpoint: scheduled',
    state: '{}',
    gitCommit: 'abc123',
    createdAt: new Date(),
  }),
  createCheckpoint: vi.fn().mockResolvedValue({
    id: 'chk-123',
    projectId: 'proj-1',
    reason: 'Test checkpoint',
    state: '{}',
    gitCommit: 'abc123',
    createdAt: new Date(),
  }),
  restoreCheckpoint: vi.fn().mockResolvedValue(undefined),
  listCheckpoints: vi.fn().mockReturnValue([]),
  deleteCheckpoint: vi.fn(),
  pruneOldCheckpoints: vi.fn().mockReturnValue(0),
};

const mockHumanReviewService = {
  requestReview: vi.fn().mockResolvedValue({
    id: 'review-123',
    taskId: 'task-1',
    projectId: 'proj-1',
    reason: 'qa_exhausted',
    context: {},
    status: 'pending',
    createdAt: new Date(),
  }),
  approveReview: vi.fn().mockResolvedValue(undefined),
  rejectReview: vi.fn().mockResolvedValue(undefined),
  listPendingReviews: vi.fn().mockReturnValue([]),
  getReview: vi.fn().mockReturnValue(undefined),
};

describe('CheckpointScheduler', () => {
  let eventBus: EventBus;
  let scheduler: CheckpointScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();

    scheduler = new CheckpointScheduler({
      checkpointManager: mockCheckpointManager as never,
      humanReviewService: mockHumanReviewService as never,
      eventBus,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  // ============================================================================
  // Start/Stop
  // ============================================================================

  describe('start()', () => {
    it('begins interval', () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.start('proj-1');

      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('clears interval', () => {
      scheduler.start('proj-1');
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('isRunning()', () => {
    it('reflects state correctly', () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.start('proj-1');
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  // ============================================================================
  // Time-Based Checkpoints
  // ============================================================================

  describe('Time-based checkpoints', () => {
    it('creates checkpoint on interval', async () => {
      const config: Partial<CheckpointConfig> = {
        autoCheckpointInterval: 1000, // 1 second for test
      };

      const schedulerWithConfig = new CheckpointScheduler({
        checkpointManager: mockCheckpointManager as never,
        humanReviewService: mockHumanReviewService as never,
        eventBus,
        config,
      });

      schedulerWithConfig.start('proj-1');

      // Advance timer past interval
      await vi.advanceTimersByTimeAsync(1100);

      expect(mockCheckpointManager.createAutoCheckpoint).toHaveBeenCalledWith(
        'proj-1',
        'scheduled'
      );

      schedulerWithConfig.stop();
    });
  });

  // ============================================================================
  // Event-Based Checkpoints
  // ============================================================================

  describe('Event-based checkpoints', () => {
    it('creates checkpoint on feature:completed event', async () => {
      // Create scheduler with very long interval to avoid interference
      const schedulerForEvent = new CheckpointScheduler({
        checkpointManager: mockCheckpointManager as never,
        humanReviewService: mockHumanReviewService as never,
        eventBus,
        config: {
          autoCheckpointInterval: 9999999999, // Very long to avoid triggering
        },
      });

      schedulerForEvent.start('proj-1');

      // Emit feature completed event
      eventBus.emit('feature:completed', {
        featureId: 'feat-1',
        projectId: 'proj-1',
        tasksCompleted: 5,
        duration: 3600000,
      });

      // Wait for microtasks to flush
      await Promise.resolve();

      expect(mockCheckpointManager.createAutoCheckpoint).toHaveBeenCalledWith(
        'proj-1',
        'feature_complete'
      );

      schedulerForEvent.stop();
    });

    it('creates checkpoint and requests review on task:escalated event', async () => {
      // Create scheduler with very long interval to avoid interference
      const schedulerForEscalate = new CheckpointScheduler({
        checkpointManager: mockCheckpointManager as never,
        humanReviewService: mockHumanReviewService as never,
        eventBus,
        config: {
          autoCheckpointInterval: 9999999999, // Very long to avoid triggering
        },
      });

      schedulerForEscalate.start('proj-1');

      // Emit task escalated event (QA exhausted)
      eventBus.emit('task:escalated', {
        taskId: 'task-1',
        reason: 'QA iterations exhausted',
        iterations: 50,
        lastError: 'Test failed',
      });

      // Wait for async operations
      await Promise.resolve();
      await Promise.resolve();

      // Should create checkpoint
      expect(mockCheckpointManager.createAutoCheckpoint).toHaveBeenCalledWith(
        'proj-1',
        'qa_exhausted'
      );

      // Should request human review
      expect(mockHumanReviewService.requestReview).toHaveBeenCalledWith({
        taskId: 'task-1',
        projectId: 'proj-1',
        reason: 'qa_exhausted',
        context: {
          qaIterations: 50,
          escalationReason: 'QA iterations exhausted',
        },
      });

      schedulerForEscalate.stop();
    });

    it('respects checkpointOnFeatureComplete config', async () => {
      const schedulerNoFeature = new CheckpointScheduler({
        checkpointManager: mockCheckpointManager as never,
        humanReviewService: mockHumanReviewService as never,
        eventBus,
        config: {
          checkpointOnFeatureComplete: false,
          autoCheckpointInterval: 9999999999, // Very long to avoid triggering
        },
      });

      schedulerNoFeature.start('proj-1');

      // Emit feature completed event
      eventBus.emit('feature:completed', {
        featureId: 'feat-1',
        projectId: 'proj-1',
        tasksCompleted: 5,
        duration: 3600000,
      });

      // Wait for microtasks
      await Promise.resolve();

      // Should NOT create checkpoint for feature completion
      expect(mockCheckpointManager.createAutoCheckpoint).not.toHaveBeenCalled();

      schedulerNoFeature.stop();
    });
  });

  // ============================================================================
  // Configuration
  // ============================================================================

  describe('Configuration', () => {
    it('uses default config values', () => {
      const config = scheduler.getConfig();

      expect(config.autoCheckpointInterval).toBe(7200000); // 2 hours
      expect(config.maxCheckpoints).toBe(50);
      expect(config.checkpointOnFeatureComplete).toBe(true);
      expect(config.checkpointBeforeRiskyOps).toBe(true);
    });

    it('merges provided config with defaults', () => {
      const customScheduler = new CheckpointScheduler({
        checkpointManager: mockCheckpointManager as never,
        humanReviewService: mockHumanReviewService as never,
        eventBus,
        config: {
          autoCheckpointInterval: 3600000, // 1 hour
          maxCheckpoints: 25,
        },
      });

      const config = customScheduler.getConfig();

      expect(config.autoCheckpointInterval).toBe(3600000);
      expect(config.maxCheckpoints).toBe(25);
      // Defaults preserved
      expect(config.checkpointOnFeatureComplete).toBe(true);
      expect(config.checkpointBeforeRiskyOps).toBe(true);
    });
  });
});
