/**
 * Metrics Types for Renderer
 *
 * Renderer-specific types for displaying metrics in the dashboard.
 */

// ============================================================================
// Agent Status Types
// ============================================================================

/**
 * Agent type identifiers
 */
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

/**
 * Agent operational status
 */
export type AgentStatus = 'idle' | 'working' | 'error' | 'waiting';

// ============================================================================
// Timeline Event Types
// ============================================================================

/**
 * Types of events that appear in the timeline
 */
export type TimelineEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'feature_completed'
  | 'agent_spawned'
  | 'agent_terminated'
  | 'checkpoint_created'
  | 'review_requested'
  | 'error_occurred';

/**
 * Severity levels for timeline events
 */
export type EventSeverity = 'info' | 'warning' | 'error' | 'success';

// ============================================================================
// Metrics Interfaces
// ============================================================================

/**
 * Overview metrics for the dashboard header
 */
export interface OverviewMetrics {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalFeatures: number;
  completedFeatures: number;
  activeAgents: number;
  estimatedRemainingMinutes: number;
  startedAt: Date | null;
  updatedAt: Date;
}

/**
 * A timeline event for the activity feed
 */
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  severity: EventSeverity;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Metrics for a single agent
 */
export interface AgentMetrics {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTaskId?: string;
  currentTaskName?: string;
  tasksCompleted: number;
  tasksFailed: number;
  tokensUsed: number;
  lastActivity: Date;
  spawnedAt: Date;
}

/**
 * Cost tracking metrics
 */
export interface CostMetrics {
  totalTokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  breakdownByModel: ModelCostBreakdown[];
  breakdownByAgent: AgentCostBreakdown[];
  updatedAt: Date;
}

/**
 * Cost breakdown by model
 */
export interface ModelCostBreakdown {
  model: string;
  provider: 'anthropic' | 'google' | 'openai';
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

/**
 * Cost breakdown by agent type
 */
export interface AgentCostBreakdown {
  agentType: AgentType;
  tokensUsed: number;
  costUSD: number;
  taskCount: number;
}

/**
 * Dashboard state combining all metrics
 */
export interface DashboardState {
  overview: OverviewMetrics | null;
  timeline: TimelineEvent[];
  agents: AgentMetrics[];
  costs: CostMetrics | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}
