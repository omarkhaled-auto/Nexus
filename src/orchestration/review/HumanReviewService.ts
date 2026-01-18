/**
 * HumanReviewService - Human-in-the-Loop (HITL) gate for agent execution
 *
 * Phase 10: Manages review requests when QA escalates or critical
 * operations need human approval. Blocks agent execution until
 * human approves or rejects.
 */

import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../../persistence/database/DatabaseClient';
import type { EventBus } from '../events/EventBus';
import type { CheckpointManager } from '../../persistence/checkpoints/CheckpointManager';
import { sessions } from '../../persistence/database/schema';
import type { ReviewContext } from '../../types/events';

// ============================================================================
// Types
// ============================================================================

export type ReviewReason = 'qa_exhausted' | 'merge_conflict' | 'manual_request';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface HumanReviewRequest {
  id: string;
  taskId: string;
  projectId: string;
  reason: ReviewReason;
  context: ReviewContext;
  status: ReviewStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface CreateReviewOptions {
  taskId: string;
  projectId: string;
  reason: ReviewReason;
  context?: ReviewContext;
}

/**
 * Logger interface for HumanReviewService
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Options for HumanReviewService constructor
 */
export interface HumanReviewServiceOptions {
  db: DatabaseClient;
  eventBus: EventBus;
  checkpointManager?: CheckpointManager;
  logger?: Logger;
}

// ============================================================================
// Errors
// ============================================================================

export class ReviewNotFoundError extends Error {
  public readonly reviewId: string;

  constructor(reviewId: string) {
    super(`Review not found: ${reviewId}`);
    this.name = 'ReviewNotFoundError';
    this.reviewId = reviewId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ReviewAlreadyResolvedError extends Error {
  public readonly reviewId: string;

  constructor(reviewId: string) {
    super(`Review already resolved: ${reviewId}`);
    this.name = 'ReviewAlreadyResolvedError';
    this.reviewId = reviewId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Serialization Types
// ============================================================================

interface SerializedReview {
  id: string;
  taskId: string;
  projectId: string;
  reason: ReviewReason;
  context: ReviewContext;
  status: ReviewStatus;
  createdAt: string; // ISO string
  resolvedAt?: string; // ISO string
  resolution?: string;
}

// ============================================================================
// HumanReviewService Implementation
// ============================================================================

/**
 * HumanReviewService manages human review requests for the HITL gate system.
 *
 * Features:
 * - Create review requests when QA exhausts iterations or critical ops need approval
 * - Persist reviews to database for crash recovery
 * - Emit events for UI notification
 * - Optional checkpoint creation for safety
 */
export class HumanReviewService {
  private readonly db: DatabaseClient;
  private readonly eventBus: EventBus;
  private readonly checkpointManager?: CheckpointManager;
  private readonly logger?: Logger;

  /** In-memory cache of pending reviews */
  private pendingReviews: Map<string, HumanReviewRequest> = new Map();

  constructor(options: HumanReviewServiceOptions) {
    this.db = options.db;
    this.eventBus = options.eventBus;
    this.checkpointManager = options.checkpointManager;
    this.logger = options.logger;

    // Load pending reviews from database on construction
    this.loadPendingReviews();
  }

  /**
   * Log a message if logger is available
   */
  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Load pending reviews from database into memory cache
   */
  private loadPendingReviews(): void {
    this.log('debug', 'Loading pending reviews from database');

    const rows = this.db.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.type, 'review'),
          eq(sessions.status, 'pending')
        )
      )
      .all();

    for (const row of rows) {
      if (row.data) {
        try {
          const review = this.deserializeReview(row.data);
          if (review.status === 'pending') {
            this.pendingReviews.set(review.id, review);
          }
        } catch (err) {
          this.log('warn', 'Failed to deserialize review', {
            sessionId: row.id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    this.log('info', `Loaded ${String(this.pendingReviews.size)} pending reviews`);
  }

  /**
   * Create a new review request
   */
  async requestReview(options: CreateReviewOptions): Promise<HumanReviewRequest> {
    const reviewId = uuidv4();
    const now = new Date();

    const review: HumanReviewRequest = {
      id: reviewId,
      taskId: options.taskId,
      projectId: options.projectId,
      reason: options.reason,
      context: options.context ?? {},
      status: 'pending',
      createdAt: now,
    };

    // Persist to sessions table
    const serialized = this.serializeReview(review);
    this.db.db.insert(sessions).values({
      id: reviewId,
      projectId: options.projectId,
      type: 'review',
      status: 'pending',
      data: serialized,
      startedAt: now,
    }).run();

    this.log('info', 'Created review request', {
      reviewId,
      taskId: options.taskId,
      reason: options.reason,
    });

    // Create safety checkpoint if CheckpointManager provided
    if (this.checkpointManager) {
      try {
        await this.checkpointManager.createCheckpoint(
          options.projectId,
          `Review requested: ${options.reason}`
        );
        this.log('debug', 'Created safety checkpoint for review', { reviewId });
      } catch (err) {
        this.log('warn', 'Failed to create safety checkpoint', {
          reviewId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Add to in-memory cache
    this.pendingReviews.set(reviewId, review);

    // Emit review:requested event
    void this.eventBus.emit(
      'review:requested',
      {
        reviewId,
        taskId: options.taskId,
        reason: options.reason,
        context: review.context,
      },
      { source: 'HumanReviewService' }
    );

    return review;
  }

  /**
   * Approve a pending review
   */
  approveReview(reviewId: string, resolution?: string): Promise<void> {
    const review = this.pendingReviews.get(reviewId);
    if (!review) {
      return Promise.reject(new ReviewNotFoundError(reviewId));
    }

    const now = new Date();

    // Update review
    review.status = 'approved';
    review.resolvedAt = now;
    review.resolution = resolution;

    // Update in database
    const serialized = this.serializeReview(review);
    this.db.db
      .update(sessions)
      .set({
        status: 'approved',
        data: serialized,
        endedAt: now,
      })
      .where(eq(sessions.id, reviewId))
      .run();

    this.log('info', 'Review approved', { reviewId, resolution });

    // Remove from pending cache
    this.pendingReviews.delete(reviewId);

    // Emit review:approved event
    void this.eventBus.emit(
      'review:approved',
      {
        reviewId,
        resolution,
      },
      { source: 'HumanReviewService' }
    );

    return Promise.resolve();
  }

  /**
   * Reject a pending review
   */
  rejectReview(reviewId: string, feedback: string): Promise<void> {
    const review = this.pendingReviews.get(reviewId);
    if (!review) {
      return Promise.reject(new ReviewNotFoundError(reviewId));
    }

    const now = new Date();

    // Update review
    review.status = 'rejected';
    review.resolvedAt = now;
    review.resolution = feedback;

    // Update in database
    const serialized = this.serializeReview(review);
    this.db.db
      .update(sessions)
      .set({
        status: 'rejected',
        data: serialized,
        endedAt: now,
      })
      .where(eq(sessions.id, reviewId))
      .run();

    this.log('info', 'Review rejected', { reviewId, feedback });

    // Remove from pending cache
    this.pendingReviews.delete(reviewId);

    // Emit review:rejected event
    void this.eventBus.emit(
      'review:rejected',
      {
        reviewId,
        feedback,
      },
      { source: 'HumanReviewService' }
    );

    return Promise.resolve();
  }

  /**
   * List all pending reviews
   */
  listPendingReviews(): HumanReviewRequest[] {
    return Array.from(this.pendingReviews.values());
  }

  /**
   * Get a specific review by ID
   */
  getReview(reviewId: string): HumanReviewRequest | undefined {
    return this.pendingReviews.get(reviewId);
  }

  /**
   * Serialize a review for database storage
   */
  private serializeReview(review: HumanReviewRequest): string {
    const serialized: SerializedReview = {
      id: review.id,
      taskId: review.taskId,
      projectId: review.projectId,
      reason: review.reason,
      context: review.context,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
      resolvedAt: review.resolvedAt?.toISOString(),
      resolution: review.resolution,
    };
    return JSON.stringify(serialized);
  }

  /**
   * Deserialize a review from database storage
   */
  private deserializeReview(data: string): HumanReviewRequest {
    const parsed = JSON.parse(data) as SerializedReview;
    return {
      id: parsed.id,
      taskId: parsed.taskId,
      projectId: parsed.projectId,
      reason: parsed.reason,
      context: parsed.context,
      status: parsed.status,
      createdAt: new Date(parsed.createdAt),
      resolvedAt: parsed.resolvedAt ? new Date(parsed.resolvedAt) : undefined,
      resolution: parsed.resolution,
    };
  }
}
