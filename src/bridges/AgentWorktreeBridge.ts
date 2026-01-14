// AgentWorktreeBridge - Agent to Worktree Connection
// Phase 04-03: Connects agents to isolated git worktrees

import type { WorktreeManager, WorktreeInfo } from '@/infrastructure/git/WorktreeManager';

/**
 * Options for AgentWorktreeBridge constructor
 */
export interface AgentWorktreeBridgeOptions {
  /** WorktreeManager instance for git worktree operations */
  worktreeManager: WorktreeManager;
  /** If true, worktrees are removed when released (default: false) */
  cleanupOnRelease?: boolean;
}

/**
 * AgentWorktreeBridge connects agents to isolated git worktrees.
 *
 * Each agent working on a task gets a dedicated worktree, providing
 * complete isolation between parallel task executions. This is a core
 * Nexus innovation enabling true parallel development.
 *
 * Features:
 * - Assign worktrees to agents for task isolation
 * - Track agent-worktree associations
 * - Optional cleanup on release
 * - Reverse lookup (task -> agent)
 */
export class AgentWorktreeBridge {
  private readonly worktreeManager: WorktreeManager;
  private readonly cleanupOnRelease: boolean;

  /** Map of agentId -> WorktreeInfo */
  private assignments: Map<string, WorktreeInfo> = new Map();

  /** Reverse map of taskId -> agentId */
  private taskToAgent: Map<string, string> = new Map();

  constructor(options: AgentWorktreeBridgeOptions) {
    this.worktreeManager = options.worktreeManager;
    this.cleanupOnRelease = options.cleanupOnRelease ?? false;
  }

  /**
   * Assign a worktree to an agent for a task
   *
   * Creates a new worktree via WorktreeManager and associates it
   * with the agent. The worktree provides an isolated working directory
   * with its own branch for the task.
   *
   * @param agentId Unique identifier of the agent
   * @param taskId Task the agent will work on
   * @param baseBranch Optional base branch (defaults to current branch)
   * @returns WorktreeInfo with path and branch details
   */
  async assignWorktree(
    agentId: string,
    taskId: string,
    baseBranch?: string
  ): Promise<WorktreeInfo> {
    // Create the worktree via manager
    const worktreeInfo = await this.worktreeManager.createWorktree(
      taskId,
      baseBranch
    );

    // Store the assignment
    this.assignments.set(agentId, worktreeInfo);
    this.taskToAgent.set(taskId, agentId);

    return worktreeInfo;
  }

  /**
   * Release an agent's worktree
   *
   * Removes the agent-worktree association. If cleanupOnRelease is enabled,
   * also removes the worktree from disk.
   *
   * @param agentId Agent whose worktree to release
   */
  async releaseWorktree(agentId: string): Promise<void> {
    const worktreeInfo = this.assignments.get(agentId);

    if (!worktreeInfo) {
      // Silently handle non-existent assignments
      return;
    }

    // Remove the assignment
    this.assignments.delete(agentId);
    this.taskToAgent.delete(worktreeInfo.taskId);

    // Optionally cleanup the worktree
    if (this.cleanupOnRelease) {
      await this.worktreeManager.removeWorktree(worktreeInfo.taskId);
    }
  }

  /**
   * Get worktree info for an agent
   *
   * @param agentId Agent to look up
   * @returns WorktreeInfo if assigned, null otherwise
   */
  async getWorktree(agentId: string): Promise<WorktreeInfo | null> {
    return this.assignments.get(agentId) ?? null;
  }

  /**
   * Get all agent-worktree assignments
   *
   * Returns a copy of the internal map to prevent external mutation.
   *
   * @returns Map of agentId -> WorktreeInfo
   */
  getAllAssignments(): Map<string, WorktreeInfo> {
    return new Map(this.assignments);
  }

  /**
   * Get agent ID for a task
   *
   * Reverse lookup to find which agent is working on a task.
   *
   * @param taskId Task to look up
   * @returns Agent ID if assigned, null otherwise
   */
  getAgentForTask(taskId: string): string | null {
    return this.taskToAgent.get(taskId) ?? null;
  }

  /**
   * Check if agent has a worktree assigned
   *
   * @param agentId Agent to check
   * @returns true if agent has a worktree
   */
  hasWorktree(agentId: string): boolean {
    return this.assignments.has(agentId);
  }
}
