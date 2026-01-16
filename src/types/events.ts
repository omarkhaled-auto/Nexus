import type { Project, Feature, Requirement, ProjectStatus, FeatureStatus } from './core';
import type { Task, TaskResult, QAResult } from './task';
import type { Agent, AgentType } from './agent';

// Base event structure
export interface NexusEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: Date;
  payload: T;
  source: string; // Component that emitted
  correlationId?: string; // For tracing related events
}

// All event types (51 total)
export type EventType =
  // Project lifecycle (8 events)
  | 'project:created'
  | 'project:updated'
  | 'project:status-changed'
  | 'project:completed'
  | 'project:failed'
  | 'project:paused'
  | 'project:resumed'
  | 'project:deleted'

  // Feature lifecycle (6 events)
  | 'feature:created'
  | 'feature:updated'
  | 'feature:status-changed'
  | 'feature:completed'
  | 'feature:failed'
  | 'feature:deleted'

  // Task lifecycle (10 events)
  | 'task:created'
  | 'task:queued'
  | 'task:assigned'
  | 'task:started'
  | 'task:progress'
  | 'task:qa-iteration'
  | 'task:completed'
  | 'task:failed'
  | 'task:blocked'
  | 'task:escalated'

  // Agent lifecycle (8 events)
  | 'agent:spawned'
  | 'agent:assigned'
  | 'agent:started'
  | 'agent:progress'
  | 'agent:idle'
  | 'agent:error'
  | 'agent:terminated'
  | 'agent:metrics-updated'

  // QA events (6 events)
  | 'qa:build-started'
  | 'qa:build-completed'
  | 'qa:lint-completed'
  | 'qa:test-completed'
  | 'qa:review-completed'
  | 'qa:loop-completed'

  // Interview events (7 events)
  | 'interview:started'
  | 'interview:question-asked'
  | 'interview:requirement-captured'
  | 'interview:category-completed'
  | 'interview:completed'
  | 'interview:cancelled'
  | 'interview:saved'

  // Human review events (3 events)
  | 'review:requested'
  | 'review:approved'
  | 'review:rejected'

  // System events (4 events)
  | 'system:checkpoint-created'
  | 'system:checkpoint-restored'
  | 'system:error'
  | 'system:warning';

// ============================================
// Project Event Payloads
// ============================================

export interface ProjectCreatedPayload {
  project: Project;
}

export interface ProjectUpdatedPayload {
  projectId: string;
  changes: Partial<Project>;
}

export interface ProjectStatusChangedPayload {
  projectId: string;
  previousStatus: ProjectStatus;
  newStatus: ProjectStatus;
  reason?: string;
}

export interface ProjectCompletedPayload {
  projectId: string;
  totalDuration: number;
  metrics: Project['metrics'];
}

export interface ProjectFailedPayload {
  projectId: string;
  error: string;
  recoverable: boolean;
}

export interface ProjectPausedPayload {
  projectId: string;
  reason?: string;
}

export interface ProjectResumedPayload {
  projectId: string;
}

export interface ProjectDeletedPayload {
  projectId: string;
}

// ============================================
// Feature Event Payloads
// ============================================

export interface FeatureCreatedPayload {
  feature: Feature;
  projectId: string;
}

export interface FeatureUpdatedPayload {
  featureId: string;
  projectId: string;
  changes: Partial<Feature>;
}

export interface FeatureStatusChangedPayload {
  featureId: string;
  projectId: string;
  previousStatus: FeatureStatus;
  newStatus: FeatureStatus;
}

export interface FeatureCompletedPayload {
  featureId: string;
  projectId: string;
  tasksCompleted: number;
  duration: number;
}

export interface FeatureFailedPayload {
  featureId: string;
  projectId: string;
  error: string;
}

export interface FeatureDeletedPayload {
  featureId: string;
  projectId: string;
}

// ============================================
// Task Event Payloads
// ============================================

export interface TaskCreatedPayload {
  task: Task;
  projectId: string;
  featureId?: string;
}

export interface TaskQueuedPayload {
  taskId: string;
  projectId: string;
  position: number;
}

export interface TaskAssignedPayload {
  taskId: string;
  agentId: string;
  agentType: AgentType;
  worktreePath: string;
}

export interface TaskStartedPayload {
  taskId: string;
  agentId: string;
  startedAt: Date;
}

export interface TaskProgressPayload {
  taskId: string;
  agentId: string;
  message: string;
  percentage?: number;
}

export interface TaskQAIterationPayload {
  taskId: string;
  iteration: number;
  result: QAResult;
}

export interface TaskCompletedPayload {
  taskId: string;
  result: TaskResult;
}

export interface TaskFailedPayload {
  taskId: string;
  error: string;
  iterations: number;
  escalated: boolean;
}

export interface TaskBlockedPayload {
  taskId: string;
  blockedBy: string;
  reason: string;
}

export interface TaskEscalatedPayload {
  taskId: string;
  reason: string;
  iterations: number;
  lastError?: string;
}

// ============================================
// Agent Event Payloads
// ============================================

export interface AgentSpawnedPayload {
  agent: Agent;
}

export interface AgentAssignedPayload {
  agentId: string;
  taskId: string;
  worktreePath: string;
}

export interface AgentStartedPayload {
  agentId: string;
  taskId: string;
}

export interface AgentProgressPayload {
  agentId: string;
  taskId: string;
  action: string;
  details?: string;
}

export interface AgentIdlePayload {
  agentId: string;
  idleSince: Date;
}

export interface AgentErrorPayload {
  agentId: string;
  taskId?: string;
  error: string;
  recoverable: boolean;
}

export interface AgentTerminatedPayload {
  agentId: string;
  reason: 'completed' | 'error' | 'timeout' | 'manual';
  metrics: Agent['metrics'];
}

export interface AgentMetricsUpdatedPayload {
  agentId: string;
  metrics: Agent['metrics'];
}

// ============================================
// QA Event Payloads
// ============================================

export interface QABuildStartedPayload {
  taskId: string;
  iteration: number;
}

export interface QABuildCompletedPayload {
  taskId: string;
  passed: boolean;
  errors: string[];
  duration: number;
}

export interface QALintCompletedPayload {
  taskId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface QATestCompletedPayload {
  taskId: string;
  passed: boolean;
  passedCount: number;
  failedCount: number;
  coverage?: number;
  duration: number;
}

export interface QAReviewCompletedPayload {
  taskId: string;
  approved: boolean;
  reviewer: 'ai' | 'human';
  issueCount: number;
  duration: number;
}

export interface QALoopCompletedPayload {
  taskId: string;
  passed: boolean;
  iterations: number;
  finalResult: QAResult;
}

// ============================================
// Interview Event Payloads
// ============================================

export interface InterviewStartedPayload {
  projectId: string;
  projectName: string;
  mode: 'genesis' | 'evolution';
}

export interface InterviewQuestionAskedPayload {
  projectId: string;
  questionId: string;
  question: string;
  category?: string;
}

export interface InterviewRequirementCapturedPayload {
  projectId: string;
  requirement: Requirement;
}

export interface InterviewCategoryCompletedPayload {
  projectId: string;
  category: string;
  requirementCount: number;
}

export interface InterviewCompletedPayload {
  projectId: string;
  totalRequirements: number;
  categories: string[];
  duration: number;
}

export interface InterviewCancelledPayload {
  projectId: string;
  reason?: string;
}

export interface InterviewSavedPayload {
  projectId: string;
  sessionId: string;
}

// ============================================
// Human Review Event Payloads
// ============================================

export interface ReviewContext {
  qaIterations?: number;
  escalationReason?: string;
  suggestedAction?: string;
}

export interface ReviewRequestedPayload {
  reviewId: string;
  taskId: string;
  reason: 'qa_exhausted' | 'merge_conflict' | 'manual_request';
  context: ReviewContext;
}

export interface ReviewApprovedPayload {
  reviewId: string;
  resolution?: string;
}

export interface ReviewRejectedPayload {
  reviewId: string;
  feedback: string;
}

// ============================================
// System Event Payloads
// ============================================

export interface CheckpointCreatedPayload {
  checkpointId: string;
  projectId: string;
  reason: string;
  gitCommit: string;
}

export interface CheckpointRestoredPayload {
  checkpointId: string;
  projectId: string;
  gitCommit: string;
}

export interface SystemErrorPayload {
  component: string;
  error: string;
  stack?: string;
  recoverable: boolean;
}

export interface SystemWarningPayload {
  component: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Event Handler Type
// ============================================

export type EventHandler<T = unknown> = (event: NexusEvent<T>) => void | Promise<void>;

// ============================================
// Type-safe Event Payload Map
// ============================================

export interface EventPayloadMap {
  // Project events
  'project:created': ProjectCreatedPayload;
  'project:updated': ProjectUpdatedPayload;
  'project:status-changed': ProjectStatusChangedPayload;
  'project:completed': ProjectCompletedPayload;
  'project:failed': ProjectFailedPayload;
  'project:paused': ProjectPausedPayload;
  'project:resumed': ProjectResumedPayload;
  'project:deleted': ProjectDeletedPayload;

  // Feature events
  'feature:created': FeatureCreatedPayload;
  'feature:updated': FeatureUpdatedPayload;
  'feature:status-changed': FeatureStatusChangedPayload;
  'feature:completed': FeatureCompletedPayload;
  'feature:failed': FeatureFailedPayload;
  'feature:deleted': FeatureDeletedPayload;

  // Task events
  'task:created': TaskCreatedPayload;
  'task:queued': TaskQueuedPayload;
  'task:assigned': TaskAssignedPayload;
  'task:started': TaskStartedPayload;
  'task:progress': TaskProgressPayload;
  'task:qa-iteration': TaskQAIterationPayload;
  'task:completed': TaskCompletedPayload;
  'task:failed': TaskFailedPayload;
  'task:blocked': TaskBlockedPayload;
  'task:escalated': TaskEscalatedPayload;

  // Agent events
  'agent:spawned': AgentSpawnedPayload;
  'agent:assigned': AgentAssignedPayload;
  'agent:started': AgentStartedPayload;
  'agent:progress': AgentProgressPayload;
  'agent:idle': AgentIdlePayload;
  'agent:error': AgentErrorPayload;
  'agent:terminated': AgentTerminatedPayload;
  'agent:metrics-updated': AgentMetricsUpdatedPayload;

  // QA events
  'qa:build-started': QABuildStartedPayload;
  'qa:build-completed': QABuildCompletedPayload;
  'qa:lint-completed': QALintCompletedPayload;
  'qa:test-completed': QATestCompletedPayload;
  'qa:review-completed': QAReviewCompletedPayload;
  'qa:loop-completed': QALoopCompletedPayload;

  // Interview events
  'interview:started': InterviewStartedPayload;
  'interview:question-asked': InterviewQuestionAskedPayload;
  'interview:requirement-captured': InterviewRequirementCapturedPayload;
  'interview:category-completed': InterviewCategoryCompletedPayload;
  'interview:completed': InterviewCompletedPayload;
  'interview:cancelled': InterviewCancelledPayload;
  'interview:saved': InterviewSavedPayload;

  // Human review events
  'review:requested': ReviewRequestedPayload;
  'review:approved': ReviewApprovedPayload;
  'review:rejected': ReviewRejectedPayload;

  // System events
  'system:checkpoint-created': CheckpointCreatedPayload;
  'system:checkpoint-restored': CheckpointRestoredPayload;
  'system:error': SystemErrorPayload;
  'system:warning': SystemWarningPayload;
}

// ============================================
// Utility Types for Type-Safe Event Handling
// ============================================

// Get payload type for a specific event type
export type EventPayload<T extends EventType> = T extends keyof EventPayloadMap
  ? EventPayloadMap[T]
  : unknown;

// Type-safe event factory
export type TypedNexusEvent<T extends EventType> = NexusEvent<EventPayload<T>> & {
  type: T;
};
