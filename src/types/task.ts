/**
 * Core Task Types
 *
 * Defines the fundamental task types used throughout Nexus.
 */

/**
 * Task execution type
 * - auto: Fully automated task, no human intervention
 * - checkpoint: Requires human verification/approval
 * - tdd: Test-driven development task, tests written first
 */
export type TaskType = 'auto' | 'checkpoint' | 'tdd';

/**
 * Task status in the execution pipeline
 */
export type TaskStatus =
  | 'pending'      // Not yet started
  | 'queued'       // In queue waiting for agent
  | 'assigned'     // Assigned to an agent
  | 'in_progress'  // Currently being executed
  | 'completed'    // Successfully completed
  | 'failed'       // Failed after all retries
  | 'blocked'      // Blocked by dependency or issue
  | 'skipped';     // Skipped (e.g., no longer needed)

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Base task interface shared across layers
 */
export interface BaseTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority?: TaskPriority;
  createdAt: Date;
  updatedAt?: Date;
}
