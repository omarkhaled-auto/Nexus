// AgentPool - Multi-Agent Management
// Phase 04-02: Stub implementation for TDD RED phase

import type { PoolAgent, PoolAgentType, IAgentPool } from '../types';

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
 * AgentPool manages agent lifecycle with max 4 concurrent agents.
 *
 * Features:
 * - Spawn agents of different types
 * - Track agent states (idle, assigned, running, terminated)
 * - Assign agents to tasks with worktree paths
 * - Release and terminate agents
 */
export class AgentPool implements IAgentPool {
  spawn(_type: PoolAgentType): PoolAgent {
    throw new Error('Not implemented');
  }

  getAvailable(): PoolAgent | null {
    throw new Error('Not implemented');
  }

  assign(_agentId: string, _taskId: string, _worktreePath?: string): void {
    throw new Error('Not implemented');
  }

  release(_agentId: string): void {
    throw new Error('Not implemented');
  }

  terminate(_agentId: string): void {
    throw new Error('Not implemented');
  }

  getAll(): PoolAgent[] {
    throw new Error('Not implemented');
  }

  getActive(): PoolAgent[] {
    throw new Error('Not implemented');
  }

  size(): number {
    throw new Error('Not implemented');
  }

  availableCount(): number {
    throw new Error('Not implemented');
  }
}
