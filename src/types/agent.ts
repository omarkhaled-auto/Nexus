/**
 * Agent Types
 *
 * Defines types for the agent system.
 */

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Types of agents in the system
 */
export type AgentType =
  | 'planner'   // Plans and decomposes tasks
  | 'coder'     // Writes code
  | 'tester'    // Writes and runs tests
  | 'reviewer'  // Reviews code changes
  | 'merger';   // Merges branches

/**
 * Agent status
 */
export type AgentStatus =
  | 'idle'       // Ready for work
  | 'assigned'   // Has a task assigned
  | 'working'    // Actively executing
  | 'waiting'    // Waiting for something (e.g., QA, human review)
  | 'error'      // In error state
  | 'terminated'; // No longer active

/**
 * Agent metrics
 */
export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalIterations: number;
  averageIterationsPerTask: number;
  totalTokensUsed: number;
  totalTimeActive: number;  // milliseconds
}

/**
 * Agent model configuration
 */
export interface AgentModelConfig {
  provider: 'anthropic' | 'google' | 'openai';
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * An agent in the system
 */
export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  modelConfig: AgentModelConfig;
  currentTaskId?: string;
  worktreePath?: string;
  metrics: AgentMetrics;
  spawnedAt: Date;
  lastActiveAt: Date;
  terminatedAt?: Date;
}

/**
 * Agent spawn options
 */
export interface AgentSpawnOptions {
  type: AgentType;
  modelConfig?: Partial<AgentModelConfig>;
  initialTaskId?: string;
}
