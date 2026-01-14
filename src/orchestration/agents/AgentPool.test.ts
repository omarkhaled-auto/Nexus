// AgentPool Tests - Phase 04-02
// RED: Write failing tests for AgentPool

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentPool, PoolCapacityError } from './AgentPool';
import type { PoolAgent, PoolAgentType } from '../types';
import { MAX_AGENTS } from '../types';

describe('AgentPool', () => {
  let pool: AgentPool;

  beforeEach(() => {
    pool = new AgentPool();
  });

  describe('spawn()', () => {
    it('should create agent with unique ID', () => {
      const agent = pool.spawn('coder');
      expect(agent.id).toBeDefined();
      expect(typeof agent.id).toBe('string');
      expect(agent.id.length).toBeGreaterThan(0);
    });

    it('should create agent with correct type', () => {
      const coder = pool.spawn('coder');
      const tester = pool.spawn('tester');
      const reviewer = pool.spawn('reviewer');

      expect(coder.type).toBe('coder');
      expect(tester.type).toBe('tester');
      expect(reviewer.type).toBe('reviewer');
    });

    it('should create agent in idle state', () => {
      const agent = pool.spawn('coder');
      expect(agent.state).toBe('idle');
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const agent = pool.spawn('coder');
      const after = new Date();

      expect(agent.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(agent.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw PoolCapacityError at max capacity (4)', () => {
      // Spawn max agents
      pool.spawn('coder');
      pool.spawn('tester');
      pool.spawn('reviewer');
      pool.spawn('merger');

      // Fifth should throw
      expect(() => pool.spawn('coder')).toThrow(PoolCapacityError);
      expect(() => pool.spawn('coder')).toThrow(/maximum capacity/i);
    });

    it('should generate unique IDs for each agent', () => {
      const agent1 = pool.spawn('coder');
      const agent2 = pool.spawn('coder');
      const agent3 = pool.spawn('coder');

      expect(agent1.id).not.toBe(agent2.id);
      expect(agent2.id).not.toBe(agent3.id);
      expect(agent1.id).not.toBe(agent3.id);
    });

    it('should increment pool size', () => {
      expect(pool.size()).toBe(0);
      pool.spawn('coder');
      expect(pool.size()).toBe(1);
      pool.spawn('tester');
      expect(pool.size()).toBe(2);
    });
  });

  describe('getAvailable()', () => {
    it('should return idle agent', () => {
      const spawned = pool.spawn('coder');
      const available = pool.getAvailable();

      expect(available).not.toBeNull();
      expect(available?.id).toBe(spawned.id);
      expect(available?.state).toBe('idle');
    });

    it('should return null when all agents are assigned', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');

      const available = pool.getAvailable();
      expect(available).toBeNull();
    });

    it('should return null when pool is empty', () => {
      const available = pool.getAvailable();
      expect(available).toBeNull();
    });

    it('should return first idle agent when multiple available', () => {
      const agent1 = pool.spawn('coder');
      const agent2 = pool.spawn('tester');

      // Assign first, release
      pool.assign(agent1.id, 'task-1');
      pool.release(agent1.id);

      // Both should be idle, should get one of them
      const available = pool.getAvailable();
      expect(available).not.toBeNull();
      expect(available?.state).toBe('idle');
    });
  });

  describe('assign()', () => {
    it('should update agent state to assigned', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');

      const all = pool.getAll();
      const assigned = all.find(a => a.id === agent.id);
      expect(assigned?.state).toBe('assigned');
    });

    it('should set currentTaskId', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-123');

      const all = pool.getAll();
      const assigned = all.find(a => a.id === agent.id);
      expect(assigned?.currentTaskId).toBe('task-123');
    });

    it('should set worktreePath when provided', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1', '/path/to/worktree');

      const all = pool.getAll();
      const assigned = all.find(a => a.id === agent.id);
      expect(assigned?.worktreePath).toBe('/path/to/worktree');
    });

    it('should throw error for non-existent agent', () => {
      expect(() => pool.assign('non-existent', 'task-1')).toThrow();
    });

    it('should update lastActivity timestamp', () => {
      const agent = pool.spawn('coder');
      const beforeAssign = new Date();

      // Small delay to ensure different timestamp
      pool.assign(agent.id, 'task-1');

      const all = pool.getAll();
      const assigned = all.find(a => a.id === agent.id);
      expect(assigned?.lastActivity).toBeDefined();
      expect(assigned?.lastActivity?.getTime()).toBeGreaterThanOrEqual(beforeAssign.getTime());
    });
  });

  describe('release()', () => {
    it('should make agent available again', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');

      // Should not be available while assigned
      expect(pool.getAvailable()?.id).not.toBe(agent.id);

      pool.release(agent.id);

      // Should be available after release
      const available = pool.getAvailable();
      expect(available?.id).toBe(agent.id);
    });

    it('should set state to idle', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');
      pool.release(agent.id);

      const all = pool.getAll();
      const released = all.find(a => a.id === agent.id);
      expect(released?.state).toBe('idle');
    });

    it('should clear currentTaskId', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');
      pool.release(agent.id);

      const all = pool.getAll();
      const released = all.find(a => a.id === agent.id);
      expect(released?.currentTaskId).toBeUndefined();
    });

    it('should clear worktreePath', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1', '/path/to/worktree');
      pool.release(agent.id);

      const all = pool.getAll();
      const released = all.find(a => a.id === agent.id);
      expect(released?.worktreePath).toBeUndefined();
    });

    it('should throw error for non-existent agent', () => {
      expect(() => pool.release('non-existent')).toThrow();
    });
  });

  describe('terminate()', () => {
    it('should remove agent from pool', () => {
      const agent = pool.spawn('coder');
      expect(pool.size()).toBe(1);

      pool.terminate(agent.id);
      expect(pool.size()).toBe(0);
    });

    it('should allow spawning new agent after termination', () => {
      // Fill pool to max
      const agents: PoolAgent[] = [];
      for (let i = 0; i < MAX_AGENTS; i++) {
        agents.push(pool.spawn('coder'));
      }
      expect(pool.size()).toBe(MAX_AGENTS);

      // Terminate one
      pool.terminate(agents[0].id);
      expect(pool.size()).toBe(MAX_AGENTS - 1);

      // Should be able to spawn another
      const newAgent = pool.spawn('coder');
      expect(newAgent).toBeDefined();
      expect(pool.size()).toBe(MAX_AGENTS);
    });

    it('should throw error for non-existent agent', () => {
      expect(() => pool.terminate('non-existent')).toThrow();
    });
  });

  describe('getAll()', () => {
    it('should return all agents in pool', () => {
      pool.spawn('coder');
      pool.spawn('tester');
      pool.spawn('reviewer');

      const all = pool.getAll();
      expect(all).toHaveLength(3);
    });

    it('should return empty array for empty pool', () => {
      const all = pool.getAll();
      expect(all).toHaveLength(0);
    });

    it('should include agents in all states', () => {
      const idle = pool.spawn('coder');
      const assigned = pool.spawn('tester');
      pool.assign(assigned.id, 'task-1');

      const all = pool.getAll();
      expect(all).toHaveLength(2);

      const states = all.map(a => a.state);
      expect(states).toContain('idle');
      expect(states).toContain('assigned');
    });
  });

  describe('getActive()', () => {
    it('should return non-idle agents', () => {
      const idle = pool.spawn('coder');
      const assigned = pool.spawn('tester');
      pool.assign(assigned.id, 'task-1');

      const active = pool.getActive();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(assigned.id);
    });

    it('should exclude idle agents', () => {
      pool.spawn('coder');
      pool.spawn('tester');

      const active = pool.getActive();
      expect(active).toHaveLength(0);
    });

    it('should return empty array when all agents are idle', () => {
      pool.spawn('coder');
      pool.spawn('tester');

      const active = pool.getActive();
      expect(active).toHaveLength(0);
    });
  });

  describe('size()', () => {
    it('should return correct count', () => {
      expect(pool.size()).toBe(0);
      pool.spawn('coder');
      expect(pool.size()).toBe(1);
      const agent = pool.spawn('tester');
      expect(pool.size()).toBe(2);
      pool.terminate(agent.id);
      expect(pool.size()).toBe(1);
    });
  });

  describe('availableCount()', () => {
    it('should return count of idle agents', () => {
      expect(pool.availableCount()).toBe(0);

      pool.spawn('coder');
      expect(pool.availableCount()).toBe(1);

      const agent = pool.spawn('tester');
      expect(pool.availableCount()).toBe(2);

      pool.assign(agent.id, 'task-1');
      expect(pool.availableCount()).toBe(1);

      pool.release(agent.id);
      expect(pool.availableCount()).toBe(2);
    });
  });

  describe('multiple agent types coexistence', () => {
    it('should support different agent types simultaneously', () => {
      const coder = pool.spawn('coder');
      const tester = pool.spawn('tester');
      const reviewer = pool.spawn('reviewer');
      const merger = pool.spawn('merger');

      const all = pool.getAll();
      const types = all.map(a => a.type);

      expect(types).toContain('coder');
      expect(types).toContain('tester');
      expect(types).toContain('reviewer');
      expect(types).toContain('merger');
    });
  });

  describe('agent state transitions', () => {
    it('should follow correct state transitions: idle -> assigned -> idle', () => {
      const agent = pool.spawn('coder');
      expect(agent.state).toBe('idle');

      pool.assign(agent.id, 'task-1');
      let updated = pool.getAll().find(a => a.id === agent.id);
      expect(updated?.state).toBe('assigned');

      pool.release(agent.id);
      updated = pool.getAll().find(a => a.id === agent.id);
      expect(updated?.state).toBe('idle');
    });

    it('should track terminated state when terminating assigned agent', () => {
      const agent = pool.spawn('coder');
      pool.assign(agent.id, 'task-1');
      pool.terminate(agent.id);

      // Agent should be removed from pool
      expect(pool.size()).toBe(0);
      expect(pool.getAll().find(a => a.id === agent.id)).toBeUndefined();
    });
  });
});
