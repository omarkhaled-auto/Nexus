// Agent types per Master Book specification
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

export type AgentStatus =
  | 'idle' // Ready for work
  | 'assigned' // Has task, not started
  | 'executing' // Running task
  | 'waiting' // Waiting for external resource (API, review)
  | 'error' // Encountered error
  | 'terminated'; // Shut down

// Model configuration per agent type
export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  provider: 'anthropic' | 'google' | 'openai';
}

// Agent configurations from Master Book
export const AGENT_CONFIGS: Record<AgentType, ModelConfig> = {
  planner: {
    model: 'claude-opus-4',
    maxTokens: 8000,
    temperature: 0.7,
    provider: 'anthropic',
  },
  coder: {
    model: 'claude-sonnet-4',
    maxTokens: 16000,
    temperature: 0.3,
    provider: 'anthropic',
  },
  tester: {
    model: 'claude-sonnet-4',
    maxTokens: 8000,
    temperature: 0.3,
    provider: 'anthropic',
  },
  reviewer: {
    model: 'gemini-2.5-pro',
    maxTokens: 8000,
    temperature: 0.2,
    provider: 'google',
  },
  merger: {
    model: 'claude-sonnet-4',
    maxTokens: 4000,
    temperature: 0.1,
    provider: 'anthropic',
  },
} as const;

export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;

  // Current work
  currentTaskId?: string;
  worktreePath?: string;
  branchName?: string;

  // Metrics
  metrics: AgentMetrics;

  // Lifecycle
  spawnedAt: Date;
  lastActivityAt: Date;
  terminatedAt?: Date;
  terminationReason?: string;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTaskDuration: number; // milliseconds
  qaIterationsTotal: number;
  successRate: number; // percentage
}

// Tool definitions available to agents
export type AgentTool =
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'terminal'
  | 'search_code'
  | 'git_status'
  | 'git_diff'
  | 'git_commit'
  | 'run_tests'
  | 'run_lint';

// Tool access per agent type
export const AGENT_TOOLS: Record<AgentType, AgentTool[]> = {
  planner: ['file_read', 'search_code'],
  coder: [
    'file_read',
    'file_write',
    'file_edit',
    'terminal',
    'search_code',
    'git_status',
    'git_diff',
  ],
  tester: ['file_read', 'file_write', 'terminal', 'run_tests', 'search_code'],
  reviewer: ['file_read', 'search_code', 'git_diff'],
  merger: ['file_read', 'git_status', 'git_diff', 'git_commit', 'terminal'],
} as const;

// Agent pool configuration
export interface AgentPoolConfig {
  maxConcurrentAgents: number; // Default 4
  idleTimeout: number; // milliseconds before terminating idle agent
  spawnDelay: number; // milliseconds between spawns
}

export const DEFAULT_POOL_CONFIG: AgentPoolConfig = {
  maxConcurrentAgents: 4,
  idleTimeout: 300000, // 5 minutes
  spawnDelay: 1000, // 1 second
} as const;
