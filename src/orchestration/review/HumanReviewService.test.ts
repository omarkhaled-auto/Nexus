/**
 * HumanReviewService Tests
 *
 * Tests for the HITL gate system including review request creation,
 * approval/rejection, persistence, and event emission.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../events/EventBus';
import {
  HumanReviewService,
  ReviewNotFoundError,
} from './HumanReviewService';
import type { DatabaseClient } from '../../persistence/database/DatabaseClient';
import type { CheckpointManager } from '../../persistence/checkpoints/CheckpointManager';

// ============================================================================
// Mocks
// ============================================================================

function createMockDatabaseClient(): DatabaseClient & {
  mockStorage: Map<string, { status: string; data: string }>;
} {
  const mockStorage = new Map<string, { status: string; data: string }>();

  return {
    mockStorage,
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockImplementation(() => {
              // Return all pending reviews
              return Array.from(mockStorage.entries())
                .filter(([, v]) => v.status === 'pending')
                .map(([id, v]) => ({
                  id,
                  type: 'review',
                  status: v.status,
                  data: v.data,
                  projectId: 'project-1',
                  startedAt: new Date(),
                  endedAt: null,
                }));
            }),
            get: vi.fn().mockImplementation(() => null),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((data: { id: string; status: string; data: string }) => ({
          run: vi.fn().mockImplementation(() => {
            mockStorage.set(data.id, { status: data.status, data: data.data });
          }),
        })),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: { status: string; data: string }) => ({
          where: vi.fn().mockImplementation(() => ({
            run: vi.fn().mockImplementation(() => {
              // Update the stored data (simplified - updates first pending item for test)
              // In real implementation, the where clause would select the right item
            }),
          })),
        })),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
    },
    raw: {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue(null),
      }),
    },
  } as unknown as DatabaseClient & {
    mockStorage: Map<string, { status: string; data: string }>;
  };
}

function createMockCheckpointManager(): CheckpointManager {
  return {
    createCheckpoint: vi.fn().mockResolvedValue({
      id: 'checkpoint-123',
      projectId: 'project-1',
      reason: 'test',
      state: '{}',
      gitCommit: 'abc123',
      createdAt: new Date(),
    }),
    restoreCheckpoint: vi.fn(),
    listCheckpoints: vi.fn().mockReturnValue([]),
    deleteCheckpoint: vi.fn(),
    createAutoCheckpoint: vi.fn(),
  } as unknown as CheckpointManager;
}

// ============================================================================
// Tests
// ============================================================================

describe('HumanReviewService', () => {
  let dbClient: ReturnType<typeof createMockDatabaseClient>;
  let eventBus: EventBus;
  let service: HumanReviewService;

  beforeEach(() => {
    // Reset EventBus singleton
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();

    // Create fresh mock database
    dbClient = createMockDatabaseClient();

    // Create service
    service = new HumanReviewService({
      db: dbClient,
      eventBus,
    });
  });

  afterEach(() => {
    EventBus.resetInstance();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // requestReview tests
  // ==========================================================================

  describe('requestReview', () => {
    it('creates review and emits event', async () => {
      const eventHandler = vi.fn();
      eventBus.on('review:requested', eventHandler);

      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
        context: { qaIterations: 5 },
      });

      expect(review.id).toBeDefined();
      expect(review.taskId).toBe('task-1');
      expect(review.projectId).toBe('project-1');
      expect(review.reason).toBe('qa_exhausted');
      expect(review.context).toEqual({ qaIterations: 5 });
      expect(review.status).toBe('pending');
      expect(review.createdAt).toBeInstanceOf(Date);

      expect(eventHandler).toHaveBeenCalledOnce();
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:requested',
          payload: expect.objectContaining({
            reviewId: review.id,
            taskId: 'task-1',
            reason: 'qa_exhausted',
          }),
        })
      );
    });

    it('persists to database', async () => {
      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'merge_conflict',
      });

      // Verify insert was called
      expect(dbClient.db.insert).toHaveBeenCalled();

      // Verify review is in pending reviews
      const pending = service.listPendingReviews();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe(review.id);
    });

    it('creates checkpoint if CheckpointManager provided', async () => {
      const mockCheckpointManager = createMockCheckpointManager();

      const serviceWithCheckpoint = new HumanReviewService({
        db: dbClient,
        eventBus,
        checkpointManager: mockCheckpointManager,
      });

      await serviceWithCheckpoint.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'manual_request',
      });

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledWith(
        'project-1',
        'Review requested: manual_request'
      );
    });
  });

  // ==========================================================================
  // approveReview tests
  // ==========================================================================

  describe('approveReview', () => {
    it('updates status and emits event', async () => {
      const eventHandler = vi.fn();
      eventBus.on('review:approved', eventHandler);

      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
      });

      await service.approveReview(review.id, 'Looks good to me');

      expect(eventHandler).toHaveBeenCalledOnce();
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:approved',
          payload: expect.objectContaining({
            reviewId: review.id,
            resolution: 'Looks good to me',
          }),
        })
      );

      // Verify review is no longer pending
      expect(service.getReview(review.id)).toBeUndefined();
    });

    it('throws for unknown ID', async () => {
      await expect(service.approveReview('unknown-id')).rejects.toThrow(
        ReviewNotFoundError
      );
    });

    it('updates database record', async () => {
      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
      });

      await service.approveReview(review.id, 'Approved with changes');

      // Verify update was called
      expect(dbClient.db.update).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // rejectReview tests
  // ==========================================================================

  describe('rejectReview', () => {
    it('updates status with feedback', async () => {
      const eventHandler = vi.fn();
      eventBus.on('review:rejected', eventHandler);

      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
      });

      await service.rejectReview(review.id, 'Needs more tests');

      expect(eventHandler).toHaveBeenCalledOnce();
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review:rejected',
          payload: expect.objectContaining({
            reviewId: review.id,
            feedback: 'Needs more tests',
          }),
        })
      );

      // Verify review is no longer pending
      expect(service.getReview(review.id)).toBeUndefined();
    });

    it('throws for unknown ID', async () => {
      await expect(
        service.rejectReview('unknown-id', 'feedback')
      ).rejects.toThrow(ReviewNotFoundError);
    });

    it('updates database record', async () => {
      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'merge_conflict',
      });

      await service.rejectReview(review.id, 'Conflict not resolved properly');

      // Verify update was called
      expect(dbClient.db.update).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // listPendingReviews tests
  // ==========================================================================

  describe('listPendingReviews', () => {
    it('returns all pending reviews', async () => {
      await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
      });

      await service.requestReview({
        taskId: 'task-2',
        projectId: 'project-1',
        reason: 'merge_conflict',
      });

      const pending = service.listPendingReviews();

      expect(pending).toHaveLength(2);
      expect(pending.map((r) => r.taskId)).toContain('task-1');
      expect(pending.map((r) => r.taskId)).toContain('task-2');
    });

    it('excludes resolved reviews', async () => {
      const review1 = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
      });

      await service.requestReview({
        taskId: 'task-2',
        projectId: 'project-1',
        reason: 'merge_conflict',
      });

      await service.approveReview(review1.id);

      const pending = service.listPendingReviews();

      expect(pending).toHaveLength(1);
      expect(pending[0]?.taskId).toBe('task-2');
    });
  });

  // ==========================================================================
  // getReview tests
  // ==========================================================================

  describe('getReview', () => {
    it('returns single review', async () => {
      const review = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
        context: { qaIterations: 3 },
      });

      const found = service.getReview(review.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(review.id);
      expect(found?.taskId).toBe('task-1');
      expect(found?.context).toEqual({ qaIterations: 3 });
    });

    it('returns undefined for unknown ID', () => {
      expect(service.getReview('unknown-id')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Persistence/recovery tests
  // ==========================================================================

  describe('persistence', () => {
    it('reviews survive restart (load from DB on construction)', async () => {
      // Create reviews in first service instance
      const review1 = await service.requestReview({
        taskId: 'task-1',
        projectId: 'project-1',
        reason: 'qa_exhausted',
        context: { qaIterations: 5 },
      });

      const review2 = await service.requestReview({
        taskId: 'task-2',
        projectId: 'project-1',
        reason: 'merge_conflict',
      });

      // Create mock that returns the stored reviews
      const mockDbWithData = createMockDatabaseClient();
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([
              {
                id: review1.id,
                type: 'review',
                status: 'pending',
                data: JSON.stringify({
                  id: review1.id,
                  taskId: 'task-1',
                  projectId: 'project-1',
                  reason: 'qa_exhausted',
                  context: { qaIterations: 5 },
                  status: 'pending',
                  createdAt: review1.createdAt.toISOString(),
                }),
                projectId: 'project-1',
                startedAt: new Date(),
                endedAt: null,
              },
              {
                id: review2.id,
                type: 'review',
                status: 'pending',
                data: JSON.stringify({
                  id: review2.id,
                  taskId: 'task-2',
                  projectId: 'project-1',
                  reason: 'merge_conflict',
                  context: {},
                  status: 'pending',
                  createdAt: review2.createdAt.toISOString(),
                }),
                projectId: 'project-1',
                startedAt: new Date(),
                endedAt: null,
              },
            ]),
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });
      mockDbWithData.db.select = selectMock;

      // Create new service instance (simulating restart)
      const newService = new HumanReviewService({
        db: mockDbWithData,
        eventBus,
      });

      // Verify reviews are loaded
      const pending = newService.listPendingReviews();
      expect(pending).toHaveLength(2);

      // Verify review data is intact
      const loadedReview = pending.find((r) => r.taskId === 'task-1');
      expect(loadedReview).toBeDefined();
      expect(loadedReview?.reason).toBe('qa_exhausted');
      expect(loadedReview?.context).toEqual({ qaIterations: 5 });
    });

    it('resolved reviews are not loaded on restart', async () => {
      // Create a mock DB that returns only one pending review (simulating the other was resolved)
      const mockDbWithData = createMockDatabaseClient();
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([
              {
                id: 'review-2',
                type: 'review',
                status: 'pending',
                data: JSON.stringify({
                  id: 'review-2',
                  taskId: 'task-2',
                  projectId: 'project-1',
                  reason: 'merge_conflict',
                  context: {},
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                }),
                projectId: 'project-1',
                startedAt: new Date(),
                endedAt: null,
              },
            ]),
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });
      mockDbWithData.db.select = selectMock;

      // Create new service instance (simulating restart)
      const newService = new HumanReviewService({
        db: mockDbWithData,
        eventBus,
      });

      // Only pending review should be loaded
      const pending = newService.listPendingReviews();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.taskId).toBe('task-2');
    });
  });
});
