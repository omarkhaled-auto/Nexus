// AgentPool - Multi-Agent Management
// Phase 04-02: Full implementation

import type { PoolAgent, PoolAgentType, IAgentPool } from '../types';
import { MAX_AGENTS } from '../types';

/**
 * Error thrown when pool is at maximum capacity
 */
export class PoolCapacityError extends Error {
  constructor() {
    super('Agent pool at maximum capacity');
    this.name = 'PoolCapacityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when agent is not found
 */
export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Generate unique ID for agents
 */
function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * AgentPool manages agent lifecycle with max 4 concurrent agents.
 *
 * Features:
 * - Spawn agents of different types (coder, tester, reviewer, merger)
 * - Track agent states (idle, assigned, running, terminated)
 * - Assign agents to tasks with worktree paths
 * - Release and terminate agents
 * - Enforces MAX_AGENTS (4) capacity limit
 */
export class AgentPool implements IAgentPool {
  /** Agent storage: agentId -> agent */
  private agents: Map<string, PoolAgent> = new Map();

  /**
   * Create new agent of specified type
   * @throws PoolCapacityError if pool at max capacity (4)
   */
  spawn(type: PoolAgentType): PoolAgent {
    if (this.agents.size >= MAX_AGENTS) {
      throw new PoolCapacityError();
    }

    const agent: PoolAgent = {
      id: generateAgentId(),
      type,
      state: 'idle',
      createdAt: new Date(),
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Get an available (idle) agent
   * @returns idle agent or null if none available
   */
  getAvailable(): PoolAgent | null {
    for (const agent of this.agents.values()) {
      if (agent.state === 'idle') {
        return agent;
      }
    }
    return null;
  }

  /**
   * Assign agent to a task
   * @throws AgentNotFoundError if agent doesn't exist
   */
  assign(agentId: string, taskId: string, worktreePath?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    agent.state = 'assigned';
    agent.currentTaskId = taskId;
    agent.worktreePath = worktreePath;
    agent.lastActivity = new Date();
  }

  /**
   * Release agent back to idle state
   * @throws AgentNotFoundError if agent doesn't exist
   */
  release(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    agent.state = 'idle';
    agent.currentTaskId = undefined;
    agent.worktreePath = undefined;
    agent.lastActivity = new Date();
  }

  /**
   * Terminate agent and remove from pool
   * @throws AgentNotFoundError if agent doesn't exist
   */
  terminate(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    this.agents.delete(agentId);
  }

  /**
   * Get all agents in the pool
   */
  getAll(): PoolAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all non-idle (active) agents
   */
  getActive(): PoolAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.state !== 'idle'
    );
  }

  /**
   * Get total number of agents in pool
   */
  size(): number {
    return this.agents.size;
  }

  /**
   * Get count of available (idle) agents
   */
  availableCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.state === 'idle') {
        count++;
      }
    }
    return count;
  }
}
