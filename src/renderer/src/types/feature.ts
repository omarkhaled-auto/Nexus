/**
 * Feature Types for Renderer
 *
 * Renderer-specific feature types with UI-friendly status values.
 * These map to the core types but use snake_case for status values
 * to align with the Kanban board column IDs.
 */

// ============================================================================
// Feature Status Types
// ============================================================================

/**
 * Feature status values used in the Kanban board.
 * Uses snake_case to match column IDs.
 */
export type FeatureStatus =
  | 'backlog'       // Not yet started
  | 'planning'      // In planning phase
  | 'in_progress'   // Development in progress
  | 'ai_review'     // Pending AI review
  | 'human_review'  // Pending human review
  | 'done';         // Completed

/**
 * Feature priority levels
 */
export type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Feature complexity levels
 */
export type FeatureComplexity = 'simple' | 'moderate' | 'complex';

// ============================================================================
// Feature Interfaces
// ============================================================================

/**
 * A task within a feature
 */
export interface FeatureTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedMinutes?: number;
}

/**
 * A feature in the Kanban board
 */
export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  complexity: FeatureComplexity;
  tasks: FeatureTask[];
  assignedAgent?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Column counts for the Kanban board
 */
export interface ColumnCounts {
  backlog: number;
  planning: number;
  in_progress: number;
  ai_review: number;
  human_review: number;
  done: number;
}

/**
 * Feature filter options
 */
export interface FeatureFilter {
  search: string;
  priority: FeaturePriority[] | null;
  status: FeatureStatus[] | null;
}
