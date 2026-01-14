// AgentWorktreeBridge - Stub for TDD RED phase
// Phase 04-03: Agent to worktree connection

import type { WorktreeManager, WorktreeInfo } from '@/infrastructure/git/WorktreeManager';

/**
 * Options for AgentWorktreeBridge constructor
 */
export interface AgentWorktreeBridgeOptions {
  worktreeManager: WorktreeManager;
  cleanupOnRelease?: boolean;
}

/**
 * AgentWorktreeBridge connects agents to isolated git worktrees.
 * Each agent gets a dedicated worktree for task execution.
 */
export class AgentWorktreeBridge {
  constructor(_options: AgentWorktreeBridgeOptions) {
    throw new Error('Not implemented');
  }

  /**
   * Assign a worktree to an agent for a task
   */
  async assignWorktree(
    _agentId: string,
    _taskId: string,
    _baseBranch?: string
  ): Promise<WorktreeInfo> {
    throw new Error('Not implemented');
  }

  /**
   * Release an agent's worktree
   */
  async releaseWorktree(_agentId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Get worktree info for an agent
   */
  async getWorktree(_agentId: string): Promise<WorktreeInfo | null> {
    throw new Error('Not implemented');
  }

  /**
   * Get all agent-worktree assignments
   */
  getAllAssignments(): Map<string, WorktreeInfo> {
    throw new Error('Not implemented');
  }

  /**
   * Get agent ID for a task
   */
  getAgentForTask(_taskId: string): string | null {
    throw new Error('Not implemented');
  }

  /**
   * Check if agent has a worktree assigned
   */
  hasWorktree(_agentId: string): boolean {
    throw new Error('Not implemented');
  }
}
