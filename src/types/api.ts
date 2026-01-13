import type { Project, Feature, Requirement, Priority, RequirementCategory } from './core';
import type { Task, TaskStatus } from './task';
import type { Agent, AgentType, AgentStatus } from './agent';

// ============================================
// Generic API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Pagination
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// Project API
// ============================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
  mode: 'genesis' | 'evolution';
  rootPath?: string;
  repositoryUrl?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectResponse extends Project {}

export interface ProjectFilterParams extends PaginationParams {
  status?: Project['status'] | Project['status'][];
  mode?: Project['mode'];
}

// ============================================
// Feature API
// ============================================

export interface CreateFeatureRequest {
  projectId: string;
  name: string;
  description?: string;
  priority?: Priority;
}

export interface UpdateFeatureRequest {
  name?: string;
  description?: string;
  priority?: Priority;
}

export interface FeatureResponse extends Feature {}

export interface FeatureFilterParams extends PaginationParams {
  projectId?: string;
  status?: Feature['status'] | Feature['status'][];
  priority?: Priority | Priority[];
}

// ============================================
// Task API
// ============================================

export interface CreateTaskRequest {
  projectId: string;
  featureId?: string;
  name: string;
  description?: string;
  dependsOn?: string[];
  estimatedMinutes?: number;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  status?: TaskStatus;
}

export interface TaskResponse extends Task {}

export interface TaskFilterParams extends PaginationParams {
  projectId?: string;
  featureId?: string;
  status?: TaskStatus | TaskStatus[];
  assignedAgent?: string;
  size?: Task['size'];
}

// ============================================
// Agent API
// ============================================

export interface SpawnAgentRequest {
  type: AgentType;
  taskId?: string;
}

export interface AgentResponse extends Agent {}

export interface AgentFilterParams extends PaginationParams {
  type?: AgentType | AgentType[];
  status?: AgentStatus | AgentStatus[];
}

// ============================================
// Interview API
// ============================================

export interface InterviewMessageRequest {
  projectId: string;
  message: string;
}

export interface InterviewMessageResponse {
  question?: string;
  captured?: Requirement[];
  isComplete: boolean;
  nextCategory?: string;
  progress?: InterviewProgress;
}

export interface InterviewProgress {
  currentCategory: string;
  completedCategories: string[];
  remainingCategories: string[];
  totalRequirements: number;
}

export interface StartInterviewRequest {
  projectId: string;
  mode: 'genesis' | 'evolution';
}

export interface InterviewStatusResponse {
  projectId: string;
  active: boolean;
  currentCategory?: string;
  progress?: InterviewProgress;
}

// ============================================
// Requirement API
// ============================================

export interface CreateRequirementRequest {
  projectId: string;
  category: RequirementCategory;
  description: string;
  priority?: Priority;
  source?: string;
}

export interface UpdateRequirementRequest {
  description?: string;
  priority?: Priority;
  validated?: boolean;
}

export interface RequirementResponse extends Requirement {}

export interface RequirementFilterParams extends PaginationParams {
  projectId?: string;
  category?: RequirementCategory | RequirementCategory[];
  priority?: Priority | Priority[];
  validated?: boolean;
}

// ============================================
// Checkpoint API
// ============================================

export interface CreateCheckpointRequest {
  projectId: string;
  reason?: string;
}

export interface CheckpointResponse {
  id: string;
  projectId: string;
  name?: string;
  gitCommit: string;
  createdAt: Date;
}

export interface RestoreCheckpointRequest {
  checkpointId: string;
  projectId: string;
}

export interface CheckpointFilterParams extends PaginationParams {
  projectId?: string;
}

// ============================================
// Metrics API
// ============================================

export interface ProjectMetricsResponse {
  projectId: string;
  totalFeatures: number;
  completedFeatures: number;
  totalTasks: number;
  completedTasks: number;
  tasksInProgress: number;
  averageQAIterations: number;
  totalTokensUsed: number;
  estimatedCost: number;
  velocity: number; // tasks per hour
}

export interface AgentMetricsResponse {
  agentId: string;
  type: AgentType;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  averageDuration: number;
  tokensUsed: number;
}

export interface SystemMetricsResponse {
  activeProjects: number;
  activeAgents: number;
  totalTasksToday: number;
  totalTokensToday: number;
  estimatedCostToday: number;
  uptime: number; // milliseconds
}

// ============================================
// WebSocket Message Types (Real-time Updates)
// ============================================

export interface WSMessage<T = unknown> {
  type: 'event' | 'command' | 'response';
  payload: T;
  requestId?: string;
}

export interface WSEventMessage {
  type: 'event';
  eventType: string;
  payload: unknown;
}

export interface WSCommandMessage {
  type: 'command';
  command: string;
  params: Record<string, unknown>;
  requestId: string;
}

export interface WSResponseMessage<T = unknown> {
  type: 'response';
  requestId: string;
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================
// Subscription Types
// ============================================

export interface SubscriptionRequest {
  eventTypes: string[];
  projectId?: string;
  taskId?: string;
  agentId?: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  eventTypes: string[];
  filters: Record<string, string>;
}

// ============================================
// Batch Operations
// ============================================

export interface BatchOperationRequest<T> {
  operations: T[];
}

export interface BatchOperationResponse<T> {
  results: BatchOperationResult<T>[];
  successCount: number;
  failureCount: number;
}

export interface BatchOperationResult<T> {
  index: number;
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================
// Health Check API
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}
