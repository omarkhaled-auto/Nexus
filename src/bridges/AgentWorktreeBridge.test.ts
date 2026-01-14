// AgentWorktreeBridge Tests - Phase 04-03
// TDD RED: Failing tests for agent-to-worktree connection

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentWorktreeBridge } from './AgentWorktreeBridge';
import type { WorktreeManager, WorktreeInfo } from '@/infrastructure/git/WorktreeManager';

// Mock WorktreeManager
const createMockWorktreeManager = () => {
  const worktrees = new Map<string, WorktreeInfo>();

  return {
    createWorktree: vi.fn(async (taskId: string, _baseBranch?: string): Promise<WorktreeInfo> => {
      const info: WorktreeInfo = {
        taskId,
        path: `/worktrees/${taskId}`,
        branch: `nexus/task/${taskId}/${Date.now()}`,
        baseBranch: 'main',
        createdAt: new Date(),
        status: 'active',
      };
      worktrees.set(taskId, info);
      return info;
    }),
    getWorktree: vi.fn(async (taskId: string): Promise<WorktreeInfo | null> => {
      return worktrees.get(taskId) ?? null;
    }),
    removeWorktree: vi.fn(async (taskId: string): Promise<void> => {
      worktrees.delete(taskId);
    }),
    listWorktrees: vi.fn(async (): Promise<WorktreeInfo[]> => {
      return Array.from(worktrees.values());
    }),
    getWorktreePath: vi.fn((taskId: string): string => {
      return `/worktrees/${taskId}`;
    }),
    updateActivity: vi.fn(async (_taskId: string): Promise<void> => {}),
    // Helper for tests
    _worktrees: worktrees,
  };
};

describe('AgentWorktreeBridge', () => {
  let bridge: AgentWorktreeBridge;
  let mockWorktreeManager: ReturnType<typeof createMockWorktreeManager>;

  beforeEach(() => {
    mockWorktreeManager = createMockWorktreeManager();
    bridge = new AgentWorktreeBridge({
      worktreeManager: mockWorktreeManager as unknown as WorktreeManager,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // assignWorktree() Tests
  // ============================================================================

  describe('assignWorktree()', () => {
    it('should create worktree for task via WorktreeManager', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');

      expect(mockWorktreeManager.createWorktree).toHaveBeenCalledWith(
        'task-1',
        undefined
      );
    });

    it('should return correct worktree info', async () => {
      const result = await bridge.assignWorktree('agent-1', 'task-1');

      expect(result).toHaveProperty('taskId', 'task-1');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('branch');
      expect(result.path).toContain('task-1');
    });

    it('should associate worktree with agent', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');

      const worktree = await bridge.getWorktree('agent-1');
      expect(worktree).not.toBeNull();
      expect(worktree?.taskId).toBe('task-1');
    });

    it('should use branch pattern nexus/task/{taskId}/{timestamp}', async () => {
      const result = await bridge.assignWorktree('agent-1', 'task-123');

      expect(result.branch).toMatch(/^nexus\/task\/task-123\/\d+$/);
    });

    it('should allow specifying base branch', async () => {
      await bridge.assignWorktree('agent-1', 'task-1', 'develop');

      expect(mockWorktreeManager.createWorktree).toHaveBeenCalledWith(
        'task-1',
        'develop'
      );
    });
  });

  // ============================================================================
  // releaseWorktree() Tests
  // ============================================================================

  describe('releaseWorktree()', () => {
    it('should remove agent-worktree association', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.releaseWorktree('agent-1');

      const worktree = await bridge.getWorktree('agent-1');
      expect(worktree).toBeNull();
    });

    it('should optionally clean up worktree when configured', async () => {
      const bridgeWithCleanup = new AgentWorktreeBridge({
        worktreeManager: mockWorktreeManager as unknown as WorktreeManager,
        cleanupOnRelease: true,
      });

      await bridgeWithCleanup.assignWorktree('agent-1', 'task-1');
      await bridgeWithCleanup.releaseWorktree('agent-1');

      expect(mockWorktreeManager.removeWorktree).toHaveBeenCalledWith('task-1');
    });

    it('should not cleanup worktree by default', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.releaseWorktree('agent-1');

      expect(mockWorktreeManager.removeWorktree).not.toHaveBeenCalled();
    });

    it('should silently handle releasing non-assigned agent', async () => {
      await expect(bridge.releaseWorktree('non-existent-agent')).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // getWorktree() Tests
  // ============================================================================

  describe('getWorktree()', () => {
    it('should return worktree info for assigned agent', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');

      const worktree = await bridge.getWorktree('agent-1');
      expect(worktree).not.toBeNull();
      expect(worktree?.taskId).toBe('task-1');
    });

    it('should return null for unassigned agent', async () => {
      const worktree = await bridge.getWorktree('unassigned-agent');
      expect(worktree).toBeNull();
    });
  });

  // ============================================================================
  // getAllAssignments() Tests
  // ============================================================================

  describe('getAllAssignments()', () => {
    it('should return all agent-worktree assignments', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.assignWorktree('agent-2', 'task-2');
      await bridge.assignWorktree('agent-3', 'task-3');

      const assignments = bridge.getAllAssignments();

      expect(assignments.size).toBe(3);
      expect(assignments.get('agent-1')?.taskId).toBe('task-1');
      expect(assignments.get('agent-2')?.taskId).toBe('task-2');
      expect(assignments.get('agent-3')?.taskId).toBe('task-3');
    });

    it('should return empty map when no assignments', () => {
      const assignments = bridge.getAllAssignments();
      expect(assignments.size).toBe(0);
    });

    it('should reflect released agents', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.assignWorktree('agent-2', 'task-2');
      await bridge.releaseWorktree('agent-1');

      const assignments = bridge.getAllAssignments();

      expect(assignments.size).toBe(1);
      expect(assignments.has('agent-1')).toBe(false);
      expect(assignments.has('agent-2')).toBe(true);
    });
  });

  // ============================================================================
  // Multiple Agents Tests
  // ============================================================================

  describe('multiple agents', () => {
    it('should maintain separate worktrees for different agents', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.assignWorktree('agent-2', 'task-2');

      const worktree1 = await bridge.getWorktree('agent-1');
      const worktree2 = await bridge.getWorktree('agent-2');

      expect(worktree1?.taskId).toBe('task-1');
      expect(worktree2?.taskId).toBe('task-2');
      expect(worktree1?.path).not.toBe(worktree2?.path);
    });

    it('should handle reassigning agent to different task', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');
      await bridge.releaseWorktree('agent-1');
      await bridge.assignWorktree('agent-1', 'task-2');

      const worktree = await bridge.getWorktree('agent-1');
      expect(worktree?.taskId).toBe('task-2');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should propagate WorktreeManager errors', async () => {
      mockWorktreeManager.createWorktree.mockRejectedValueOnce(
        new Error('Worktree creation failed')
      );

      await expect(bridge.assignWorktree('agent-1', 'task-1')).rejects.toThrow(
        'Worktree creation failed'
      );
    });

    it('should not leave partial state on assignment failure', async () => {
      mockWorktreeManager.createWorktree.mockRejectedValueOnce(
        new Error('Worktree creation failed')
      );

      try {
        await bridge.assignWorktree('agent-1', 'task-1');
      } catch {
        // Expected
      }

      const worktree = await bridge.getWorktree('agent-1');
      expect(worktree).toBeNull();
    });
  });

  // ============================================================================
  // getAgentForTask() Tests
  // ============================================================================

  describe('getAgentForTask()', () => {
    it('should return agent ID for task', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');

      const agentId = bridge.getAgentForTask('task-1');
      expect(agentId).toBe('agent-1');
    });

    it('should return null for unassigned task', () => {
      const agentId = bridge.getAgentForTask('unassigned-task');
      expect(agentId).toBeNull();
    });
  });

  // ============================================================================
  // hasWorktree() Tests
  // ============================================================================

  describe('hasWorktree()', () => {
    it('should return true for agent with worktree', async () => {
      await bridge.assignWorktree('agent-1', 'task-1');

      expect(bridge.hasWorktree('agent-1')).toBe(true);
    });

    it('should return false for agent without worktree', () => {
      expect(bridge.hasWorktree('agent-1')).toBe(false);
    });
  });
});
