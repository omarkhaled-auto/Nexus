/**
 * AgentPool - Real implementation for managing AI agent pool
 *
 * Phase 14B Task 17: Production-ready agent pool that:
 * - Creates real agent instances (CoderAgent, TesterAgent, ReviewerAgent, MergerAgent)
 * - Manages agent lifecycle (spawn, assign, release, terminate)
 * - Tracks agent metrics
 * - Integrates with EventBus for observability
 *
 * @module orchestration/agents
 */

import { nanoid } from 'nanoid';
import type { LLMClient } from '../../llm/types';
import { CoderAgent } from '../../execution/agents/CoderAgent';
import { TesterAgent } from '../../execution/agents/TesterAgent';
import { ReviewerAgent } from '../../execution/agents/ReviewerAgent';
import { MergerAgent } from '../../execution/agents/MergerAgent';
import type { BaseAgentRunner, AgentContext } from '../../execution/agents/BaseAgentRunner';
import { EventBus } from '../events/EventBus';
import type {
  Agent,
  AgentType,
  AgentMetrics,
  AgentModelConfig,
} from '../../types/agent';
import type { Task, TaskResult } from '../../types/task';
import type { IAgentPool, PoolAgent } from '../types';
import { DEFAULT_CLAUDE_MODEL } from '../../llm/models';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when agent pool is at capacity
 */
export class PoolCapacityError extends Error {
  constructor(agentType: AgentType, max: number) {
    super(`Agent pool at capacity for type '${agentType}' (max: ${max})`);
    this.name = 'PoolCapacityError';
    Object.setPrototypeOf(this, PoolCapacityError.prototype);
  }
}

/**
 * Error thrown when agent is not found
 */
export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
    Object.setPrototypeOf(this, AgentNotFoundError.prototype);
  }
}

/**
 * Error thrown when no runner is available for agent type
 */
export class NoRunnerError extends Error {
  constructor(agentType: AgentType) {
    super(`No runner available for agent type: ${agentType}`);
    this.name = 'NoRunnerError';
    Object.setPrototypeOf(this, NoRunnerError.prototype);
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration options for AgentPool
 */
export interface AgentPoolConfig {
  /** Claude client for coder, tester, and merger agents (API or CLI) */
  claudeClient: LLMClient;
  /** Gemini client for reviewer agent (API or CLI) */
  geminiClient: LLMClient;
  /** Maximum agents per type (optional overrides) */
  maxAgentsByType?: Partial<Record<AgentType, number>>;
  /** Default model configuration for agents */
  defaultModelConfig?: Partial<AgentModelConfig>;
}

/**
 * Status of the agent pool
 */
export interface PoolStatus {
  /** Total number of agents in pool */
  totalAgents: number;
  /** Agent counts by type */
  byType: Record<AgentType, {
    total: number;
    active: number;
    idle: number;
    max: number;
  }>;
  /** Number of tasks currently in progress */
  tasksInProgress: number;
}

/**
 * Extended context for running tasks
 */
export type RunTaskContext = Omit<AgentContext, 'taskId' | 'featureId' | 'projectId'>;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MAX_AGENTS: Record<AgentType, number> = {
  planner: 1,
  coder: 4,
  tester: 2,
  reviewer: 2,
  merger: 1,
};

const DEFAULT_MODEL_CONFIG: AgentModelConfig = {
  provider: 'anthropic',
  model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
  maxTokens: 8192,
  temperature: 0.3,
};

// ============================================================================
// AgentPool Implementation
// ============================================================================

/**
 * AgentPool manages a pool of AI agents for task execution.
 *
 * Features:
 * - Creates real agent instances (CoderAgent, TesterAgent, ReviewerAgent, MergerAgent)
 * - Manages agent lifecycle (spawn, assign, release, terminate)
 * - Enforces capacity limits per agent type
 * - Tracks agent metrics (tasks completed, failed, iterations, time)
 * - Integrates with EventBus for observability
 *
 * @example
 * ```typescript
 * const pool = new AgentPool({
 *   claudeClient,
 *   geminiClient,
 *   maxAgentsByType: { coder: 4, tester: 2 }
 * });
 *
 * const agent = pool.spawn('coder');
 * pool.assign(agent.id, taskId, worktreePath);
 * const result = await pool.runTask(agent, task, context);
 * pool.release(agent.id);
 * ```
 */
export class AgentPool implements IAgentPool {
  /** Active agents in the pool */
  private agents: Map<string, PoolAgent> = new Map();

  /** Agent runners by type */
  private runners: Map<AgentType, BaseAgentRunner>;

  /** Maximum agents by type */
  private maxAgentsByType: Map<AgentType, number>;

  /** Default model configuration */
  private defaultModelConfig: AgentModelConfig;

  /** Event bus for observability */
  private eventBus: EventBus;

  /** LLM clients (API or CLI) */
  private claudeClient: LLMClient;
  private geminiClient: LLMClient;

  /**
   * Create a new AgentPool
   *
   * @param config - Pool configuration including LLM clients
   */
  constructor(config: AgentPoolConfig) {
    this.claudeClient = config.claudeClient;
    this.geminiClient = config.geminiClient;
    this.eventBus = EventBus.getInstance();
    this.defaultModelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...config.defaultModelConfig,
    };

    // Initialize runners with real agent implementations
    this.runners = new Map<AgentType, BaseAgentRunner>([
      ['coder', new CoderAgent(this.claudeClient)],
      ['tester', new TesterAgent(this.claudeClient)],
      ['reviewer', new ReviewerAgent(this.geminiClient)],
      ['merger', new MergerAgent(this.claudeClient)],
    ]);

    // Set maximum agents per type
    this.maxAgentsByType = new Map<AgentType, number>(
      Object.entries({
        ...DEFAULT_MAX_AGENTS,
        ...config.maxAgentsByType,
      }) as [AgentType, number][]
    );
  }

  // ============================================================================
  // IAgentPool Interface Implementation
  // ============================================================================

  /**
   * Spawn a new agent of the given type
   *
   * @param type - Type of agent to spawn
   * @returns The spawned agent
   * @throws PoolCapacityError if pool is at capacity for this type
   */
  spawn(type: AgentType): PoolAgent {
    const currentCount = this.getAgentCountByType(type);
    const maxCount = this.maxAgentsByType.get(type) ?? DEFAULT_MAX_AGENTS[type];

    if (currentCount >= maxCount) {
      throw new PoolCapacityError(type, maxCount);
    }

    const now = new Date();
    const agent: PoolAgent = {
      id: nanoid(),
      type,
      status: 'idle',
      modelConfig: { ...this.defaultModelConfig },
      metrics: this.createEmptyMetrics(),
      spawnedAt: now,
      lastActiveAt: now,
    };

    this.agents.set(agent.id, agent);

    // Emit spawn event with correct payload for dynamic agent discovery
    // Cast to Agent since modelConfig is always defined in this context
    void this.eventBus.emit('agent:spawned', {
      agent: agent as Agent,
    });

    return agent;
  }

  /**
   * Terminate an agent and remove from pool
   *
   * @param agentId - ID of agent to terminate
   */
  terminate(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    // Update agent status
    agent.status = 'terminated';

    // Remove from pool
    this.agents.delete(agentId);

    // Emit termination event
    void this.eventBus.emit('agent:terminated', {
      agentId,
      reason: 'manual',
      metrics: agent.metrics,
    });
  }

  /**
   * Assign an agent to a task
   *
   * @param agentId - ID of agent to assign
   * @param taskId - ID of task to assign
   * @param worktreePath - Optional worktree path for the agent
   */
  assign(agentId: string, taskId: string, worktreePath?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    agent.status = 'assigned';
    agent.currentTaskId = taskId;
    agent.worktreePath = worktreePath;
    agent.lastActiveAt = new Date();
  }

  /**
   * Release an agent from its current task
   *
   * @param agentId - ID of agent to release
   */
  release(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    agent.status = 'idle';
    agent.currentTaskId = undefined;
    agent.worktreePath = undefined;
    agent.lastActiveAt = new Date();

    // Emit release event (using idle event as there's no specific release event)
    void this.eventBus.emit('agent:idle', {
      agentId,
      idleSince: new Date(),
    });
  }

  /**
   * Get all agents in the pool
   */
  getAll(): PoolAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all active (non-idle) agents
   */
  getActive(): PoolAgent[] {
    return this.getAll().filter(
      (agent) => agent.status === 'assigned' || agent.status === 'working'
    );
  }

  /**
   * Get an available (idle) agent of any type
   */
  getAvailable(): PoolAgent | undefined {
    return this.getAll().find((agent) => agent.status === 'idle');
  }

  /**
   * Get an agent by ID
   *
   * @param agentId - ID of agent to get
   */
  getById(agentId: string): PoolAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get current pool size
   */
  size(): number {
    return this.agents.size;
  }

  // ============================================================================
  // Extended Methods
  // ============================================================================

  /**
   * Get an available agent of a specific type
   *
   * @param type - Type of agent to get
   * @returns Available agent or undefined
   */
  getAvailableByType(type: AgentType): PoolAgent | undefined {
    return this.getAll().find(
      (agent) => agent.type === type && agent.status === 'idle'
    );
  }

  /**
   * Run a task with a specific agent
   *
   * @param agent - The agent to use
   * @param task - The task to execute
   * @param context - Execution context
   * @returns Task execution result
   */
  async runTask(
    agent: PoolAgent,
    task: Task,
    context: RunTaskContext
  ): Promise<TaskResult> {
    const runner = this.runners.get(agent.type);
    if (!runner) {
      throw new NoRunnerError(agent.type);
    }

    const existingAgent = this.agents.get(agent.id);
    if (!existingAgent) {
      throw new AgentNotFoundError(agent.id);
    }

    // Update agent status
    existingAgent.status = 'working';
    existingAgent.currentTaskId = task.id;
    existingAgent.lastActiveAt = new Date();

    const startTime = Date.now();

    try {
      // Execute the task
      const result = await runner.execute(task, {
        taskId: task.id,
        featureId: task.featureId ?? '',
        projectId: task.projectId ?? '',
        workingDir: context.workingDir,
        relevantFiles: context.relevantFiles,
        previousAttempts: context.previousAttempts,
      });

      // Update metrics
      this.updateAgentMetrics(existingAgent, result, startTime);

      return result;
    } catch (error) {
      // Update failure metrics
      existingAgent.metrics.tasksFailed++;
      existingAgent.metrics.totalTimeActive += Date.now() - startTime;

      // Emit error event
      void this.eventBus.emit('agent:error', {
        agentId: agent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      });

      throw error;
    } finally {
      // Release agent
      existingAgent.status = 'idle';
      existingAgent.currentTaskId = undefined;
      existingAgent.lastActiveAt = new Date();
    }
  }

  /**
   * Get the pool status
   */
  getPoolStatus(): PoolStatus {
    const byType: PoolStatus['byType'] = {
      planner: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get('planner') ?? 1 },
      coder: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get('coder') ?? 4 },
      tester: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get('tester') ?? 2 },
      reviewer: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get('reviewer') ?? 2 },
      merger: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get('merger') ?? 1 },
    };

    let tasksInProgress = 0;

    for (const agent of this.agents.values()) {
      byType[agent.type].total++;

      if (agent.status === 'working' || agent.status === 'assigned') {
        byType[agent.type].active++;
        if (agent.currentTaskId) {
          tasksInProgress++;
        }
      } else if (agent.status === 'idle') {
        byType[agent.type].idle++;
      }
    }

    return {
      totalAgents: this.agents.size,
      byType,
      tasksInProgress,
    };
  }

  /**
   * Terminate all agents in the pool
   */
  terminateAll(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      this.terminate(agentId);
    }
    return Promise.resolve();
  }

  /**
   * Get aggregated metrics for all agents
   */
  getAggregatedMetrics(): AgentMetrics {
    const metrics: AgentMetrics = this.createEmptyMetrics();

    for (const agent of this.agents.values()) {
      metrics.tasksCompleted += agent.metrics.tasksCompleted;
      metrics.tasksFailed += agent.metrics.tasksFailed;
      metrics.totalIterations += agent.metrics.totalIterations;
      metrics.totalTokensUsed += agent.metrics.totalTokensUsed;
      metrics.totalTimeActive += agent.metrics.totalTimeActive;
    }

    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.averageIterationsPerTask = totalTasks > 0
      ? metrics.totalIterations / totalTasks
      : 0;

    return metrics;
  }

  /**
   * Check if pool has capacity for a specific agent type
   *
   * @param type - Agent type to check
   */
  hasCapacity(type: AgentType): boolean {
    const current = this.getAgentCountByType(type);
    const max = this.maxAgentsByType.get(type) ?? DEFAULT_MAX_AGENTS[type];
    return current < max;
  }

  /**
   * Get the runner for a specific agent type
   *
   * @param type - Agent type
   * @returns The runner or undefined
   */
  getRunner(type: AgentType): BaseAgentRunner | undefined {
    return this.runners.get(type);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get count of agents by type
   */
  private getAgentCountByType(type: AgentType): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.type === type) {
        count++;
      }
    }
    return count;
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): AgentMetrics {
    return {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalIterations: 0,
      averageIterationsPerTask: 0,
      totalTokensUsed: 0,
      totalTimeActive: 0,
    };
  }

  /**
   * Update agent metrics after task execution
   */
  private updateAgentMetrics(
    agent: PoolAgent,
    result: TaskResult,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;

    if (result.success) {
      agent.metrics.tasksCompleted++;
    } else {
      agent.metrics.tasksFailed++;
    }

    // Extract iterations from result metrics if available
    const iterations = result.metrics?.iterations ?? 1;
    agent.metrics.totalIterations += iterations;

    // Extract tokens from result metrics if available
    const tokens = result.metrics?.tokensUsed ?? 0;
    agent.metrics.totalTokensUsed += tokens;

    // Update time active
    agent.metrics.totalTimeActive += duration;

    // Recalculate average
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    agent.metrics.averageIterationsPerTask = totalTasks > 0
      ? agent.metrics.totalIterations / totalTasks
      : 0;
  }
}
