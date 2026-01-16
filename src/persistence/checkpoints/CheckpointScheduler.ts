/**
 * CheckpointScheduler - Automatic time-based and event-triggered checkpoints
 *
 * Phase 10-02: Creates checkpoints on intervals and in response to system events
 * like feature completion or QA escalation.
 */

import type { EventBus, Unsubscribe } from '../../orchestration/events/EventBus';
import type { HumanReviewService } from '../../orchestration/review/HumanReviewService';
import type { CheckpointManager, AutoCheckpointTrigger } from './CheckpointManager';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for automatic checkpoints
 */
export interface CheckpointConfig {
  /** Interval between scheduled checkpoints in ms (default: 2 hours) */
  autoCheckpointInterval: number;
  /** Maximum checkpoints to keep per project (default: 50) */
  maxCheckpoints: number;
  /** Create checkpoint on feature completion (default: true) */
  checkpointOnFeatureComplete: boolean;
  /** Create checkpoint before risky operations (default: true) */
  checkpointBeforeRiskyOps: boolean;
}

/**
 * Logger interface for CheckpointScheduler
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Options for CheckpointScheduler constructor
 */
export interface CheckpointSchedulerOptions {
  checkpointManager: CheckpointManager;
  humanReviewService: HumanReviewService;
  eventBus: EventBus;
  config?: Partial<CheckpointConfig>;
  logger?: Logger;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CheckpointConfig = {
  autoCheckpointInterval: 7200000, // 2 hours in ms
  maxCheckpoints: 50,
  checkpointOnFeatureComplete: true,
  checkpointBeforeRiskyOps: true,
};

// ============================================================================
// CheckpointScheduler Implementation
// ============================================================================

/**
 * CheckpointScheduler manages automatic checkpoint creation.
 *
 * Features:
 * - Time-based scheduled checkpoints
 * - Event-triggered checkpoints on feature completion
 * - QA escalation handling with human review requests
 */
export class CheckpointScheduler {
  private readonly checkpointManager: CheckpointManager;
  private readonly humanReviewService: HumanReviewService;
  private readonly eventBus: EventBus;
  private readonly config: CheckpointConfig;
  private readonly logger?: Logger;

  /** Timer for scheduled checkpoints */
  private intervalId: NodeJS.Timeout | null = null;

  /** EventBus unsubscribers for cleanup */
  private unsubscribers: Unsubscribe[] = [];

  /** Currently active project */
  private activeProjectId: string | null = null;

  constructor(options: CheckpointSchedulerOptions) {
    this.checkpointManager = options.checkpointManager;
    this.humanReviewService = options.humanReviewService;
    this.eventBus = options.eventBus;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.logger = options.logger;
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
   * Start the checkpoint scheduler for a project.
   * Sets up time-based interval and event subscriptions.
   *
   * @param projectId Project to create checkpoints for
   */
  start(projectId: string): void {
    if (this.intervalId !== null) {
      this.log('warn', 'CheckpointScheduler already running, stopping first');
      this.stop();
    }

    this.activeProjectId = projectId;
    this.log('info', `Starting CheckpointScheduler for project ${projectId}`);

    // Set up time-based scheduled checkpoint
    this.intervalId = setInterval(
      () => void this.createScheduledCheckpoint('scheduled'),
      this.config.autoCheckpointInterval
    );

    // Subscribe to feature:completed events
    if (this.config.checkpointOnFeatureComplete) {
      const featureUnsub = this.eventBus.on('feature:completed', () => {
        void this.createScheduledCheckpoint('feature_complete');
      });
      this.unsubscribers.push(featureUnsub);
    }

    // Subscribe to task:escalated events (QA exhausted)
    const escalatedUnsub = this.eventBus.on('task:escalated', (event) => {
      void this.handleTaskEscalated(event.payload);
    });
    this.unsubscribers.push(escalatedUnsub);

    this.log('debug', 'CheckpointScheduler started with config', this.config);
  }

  /**
   * Stop the checkpoint scheduler.
   * Clears interval and unsubscribes from events.
   */
  stop(): void {
    this.log('info', 'Stopping CheckpointScheduler');

    // Clear scheduled interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Unsubscribe from all events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.activeProjectId = null;
  }

  /**
   * Check if the scheduler is currently running.
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get a copy of the current configuration.
   */
  getConfig(): CheckpointConfig {
    return { ...this.config };
  }

  /**
   * Create a scheduled checkpoint with the given trigger.
   */
  private async createScheduledCheckpoint(
    trigger: AutoCheckpointTrigger
  ): Promise<void> {
    if (!this.activeProjectId) {
      this.log('warn', 'Cannot create checkpoint: no active project');
      return;
    }

    try {
      const checkpoint = await this.checkpointManager.createAutoCheckpoint(
        this.activeProjectId,
        trigger
      );
      this.log('info', `Created scheduled checkpoint: ${checkpoint.id}`, {
        trigger,
        projectId: this.activeProjectId,
      });
    } catch (err) {
      this.log('error', 'Failed to create scheduled checkpoint', {
        trigger,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle task escalation event (QA exhausted).
   * Creates a checkpoint and requests human review.
   */
  private async handleTaskEscalated(payload: {
    taskId: string;
    reason: string;
    iterations: number;
    lastError?: string;
  }): Promise<void> {
    if (!this.activeProjectId) {
      this.log('warn', 'Cannot handle escalation: no active project');
      return;
    }

    this.log('info', 'Handling task escalation', {
      taskId: payload.taskId,
      iterations: payload.iterations,
    });

    try {
      // Create safety checkpoint
      await this.createScheduledCheckpoint('qa_exhausted');

      // Request human review
      await this.humanReviewService.requestReview({
        taskId: payload.taskId,
        projectId: this.activeProjectId,
        reason: 'qa_exhausted',
        context: {
          qaIterations: payload.iterations,
          escalationReason: payload.reason,
        },
      });

      this.log('info', 'Human review requested for escalated task', {
        taskId: payload.taskId,
      });
    } catch (err) {
      this.log('error', 'Failed to handle task escalation', {
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
