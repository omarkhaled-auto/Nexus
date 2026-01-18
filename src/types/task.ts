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

// ============================================================================
// Extended Task Types
// ============================================================================

/**
 * Full task interface with all properties
 */
export interface Task extends BaseTask {
  featureId?: string;
  projectId?: string;
  files?: string[];
  dependencies?: string[];
  testCriteria?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  assignedAgentId?: string;
  worktreePath?: string;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  qaIterations?: number;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  escalated?: boolean;
  reason?: string;
  files?: {
    path: string;
    action: 'created' | 'modified' | 'deleted';
  }[];
  metrics?: {
    iterations: number;
    tokensUsed: number;
    timeMs: number;
  };
  error?: string;
}

// ============================================================================
// QA Result Types
// ============================================================================

/**
 * Individual QA step result
 */
export interface QAStepResult {
  step: 'build' | 'lint' | 'test' | 'review';
  passed: boolean;
  errors?: string[];
  warnings?: string[];
  details?: Record<string, unknown>;
  durationMs?: number;
}

/**
 * QA loop overall result
 */
export interface QAResult {
  passed: boolean;
  iteration: number;
  steps: QAStepResult[];
  totalDurationMs: number;
  finalVerdict?: 'approved' | 'rejected' | 'needs_review';
}
