/**
 * Metrics types for dashboard state management
 * Used by metricsStore for real-time dashboard updates
 */

/**
 * Agent status indicator
 */
export type AgentStatus = 'idle' | 'working' | 'waiting' | 'blocked' | 'error'

/**
 * Timeline event type categories
 */
export type TimelineEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'agent_status_changed'
  | 'agent_task_assigned'
  | 'qa_iteration'
  | 'qa_passed'
  | 'qa_failed'
  | 'checkpoint_created'
  | 'feature_completed'
  | 'build_started'
  | 'build_completed'
  | 'build_failed'
  | 'error'

/**
 * Overview metrics for the main dashboard summary
 */
export interface OverviewMetrics {
  totalFeatures: number
  completedTasks: number
  totalTasks: number
  activeAgents: number
  estimatedCompletion: Date | null
}

/**
 * Single timeline event for activity log
 */
export interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  timestamp: Date
  metadata: {
    taskId?: string
    featureId?: string
    agentId?: string
    iteration?: number
    error?: string
    [key: string]: unknown
  }
}

/**
 * Metrics for a single agent
 */
export interface AgentMetrics {
  id: string
  name: string
  type: 'coder' | 'tester' | 'reviewer' | 'architect'
  status: AgentStatus
  currentTask: string | null
  progress: number
  lastActivity: Date | null
}

/**
 * Cost tracking metrics
 */
export interface CostMetrics {
  totalCost: number
  tokenBreakdown: {
    input: number
    output: number
  }
  budgetLimit: number | null
  currency: string
}
