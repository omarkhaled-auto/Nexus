/**
 * Core Domain Types
 *
 * Defines the fundamental domain types for projects, features, and requirements.
 */

// ============================================================================
// Status Types
// ============================================================================

export type ProjectStatus =
  | 'pending'      // Not yet started
  | 'planning'     // In planning/decomposition phase
  | 'executing'    // Active execution
  | 'paused'       // Temporarily paused
  | 'completed'    // Successfully completed
  | 'failed';      // Failed

export type FeatureStatus =
  | 'pending'      // Not yet started
  | 'decomposing'  // Being broken into tasks
  | 'ready'        // Tasks defined, ready for execution
  | 'in_progress'  // Some tasks executing
  | 'completed'    // All tasks completed
  | 'failed';      // Failed

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type RequirementCategory =
  | 'functional'
  | 'technical'
  | 'ui'
  | 'performance'
  | 'security'
  | 'integration'
  | 'testing';

// ============================================================================
// Core Domain Interfaces
// ============================================================================

/**
 * Project metrics and statistics
 */
export interface ProjectMetrics {
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  featuresTotal: number;
  featuresCompleted: number;
  estimatedTotalMinutes: number;
  actualTotalMinutes: number;
  averageQAIterations: number;
}

/**
 * A project in Nexus
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  mode: 'genesis' | 'evolution';
  path: string;  // File system path
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metrics: ProjectMetrics;
  settings?: ProjectSettings;
}

/**
 * Project configuration settings
 */
export interface ProjectSettings {
  maxConcurrentAgents?: number;
  maxTaskMinutes?: number;
  qaMaxIterations?: number;
  enableTDD?: boolean;
  autoMerge?: boolean;
}

/**
 * A feature within a project
 */
export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: RequirementPriority;
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentId?: string;  // For sub-features
}

/**
 * A requirement captured during interview
 */
export interface Requirement {
  id: string;
  projectId: string;
  featureId?: string;
  content: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  source: 'interview' | 'manual' | 'inferred';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interview session data
 */
export interface InterviewSession {
  id: string;
  projectId: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  currentCategory?: RequirementCategory;
  questionsAsked: number;
  requirementsCaptured: number;
  startedAt: Date;
  completedAt?: Date;
}
