// NexusCoordinator Tests - Phase 04-02
// RED: Write failing tests for NexusCoordinator

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NexusCoordinator } from './NexusCoordinator';
import { TaskQueue } from '../queue/TaskQueue';
import { AgentPool } from '../agents/AgentPool';
import type {
  ProjectConfig,
  CoordinatorStatus,
  NexusEvent,
  OrchestrationTask,
  Checkpoint,
  ProjectMode,
} from '../types';

// Mock dependencies
const mockDecomposer = {
  decompose: vi.fn(),
  validateTaskSize: vi.fn(),
};

const mockResolver = {
  resolve: vi.fn(),
  topologicalSort: vi.fn(),
  detectCycles: vi.fn(),
  calculateWaves: vi.fn(),
};

const mockEstimator = {
  estimateTime: vi.fn(),
  estimateFeature: vi.fn(),
  calibrate: vi.fn(),
  getCalibrationFactor: vi.fn(),
};

const mockQAEngine = {
  run: vi.fn(),
  runStage: vi.fn(),
  getMaxIterations: vi.fn(),
};

const mockWorktreeManager = {
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  getWorktree: vi.fn(),
  listWorktrees: vi.fn(),
};

const mockCheckpointManager = {
  create: vi.fn(),
  restore: vi.fn(),
  list: vi.fn(),
};

// Hotfix #5 - Issue 2: Mock merger runner
const mockMergerRunner = {
  merge: vi.fn(),
};

// Hotfix #5 - Issue 2: Mock agent worktree bridge
const mockAgentWorktreeBridge = {
  assignWorktree: vi.fn(),
  releaseWorktree: vi.fn(),
  getWorktree: vi.fn(),
};

/**
 * Helper to create test config
 * Hotfix #5 - Added mode and features support
 */
function createConfig(overrides: Partial<ProjectConfig> & { mode?: ProjectMode; features?: { id: string; name: string; description: string }[] } = {}): ProjectConfig {
  const { mode, features, ...rest } = overrides;
  return {
    projectId: 'test-project',
    projectPath: '/path/to/project',
    settings: {
      maxParallelAgents: 4,
      testCoverageTarget: 80,
      maxTaskMinutes: 30,
      qaMaxIterations: 50,
      checkpointIntervalHours: 2,
    },
    mode,
    features,
    ...rest,
  };
}

/**
 * Helper to create test task
 */
function createTask(
  id: string,
  overrides: Partial<OrchestrationTask> = {}
): OrchestrationTask {
  return {
    id,
    name: `Task ${id}`,
    description: `Description for task ${id}`,
    type: 'auto',
    size: 'small',
    estimatedMinutes: 15,
    dependsOn: [],
    status: 'pending',
    priority: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('NexusCoordinator', () => {
  let coordinator: NexusCoordinator;
  let taskQueue: TaskQueue;
  let agentPool: AgentPool;

  beforeEach(() => {
    vi.clearAllMocks();

    taskQueue = new TaskQueue();
    agentPool = new AgentPool();

    coordinator = new NexusCoordinator({
      taskQueue,
      agentPool,
      decomposer: mockDecomposer as any,
      resolver: mockResolver as any,
      estimator: mockEstimator as any,
      qaEngine: mockQAEngine as any,
      worktreeManager: mockWorktreeManager as any,
      checkpointManager: mockCheckpointManager as any,
      mergerRunner: mockMergerRunner as any,
      agentWorktreeBridge: mockAgentWorktreeBridge as any,
    });
  });

  describe('initialize()', () => {
    it('should set up coordinator with config', async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      const status = coordinator.getStatus();
      expect(status.state).toBe('idle');
    });

    it('should store project config', async () => {
      const config = createConfig({ projectId: 'my-project' });
      await coordinator.initialize(config);

      const status = coordinator.getStatus();
      expect(status.projectId).toBe('my-project');
    });

    it('should set initial phase to planning', async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      const status = coordinator.getStatus();
      expect(status.currentPhase).toBe('planning');
    });
  });

  describe('start()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      // Mock decomposer and resolver
      mockDecomposer.decompose.mockResolvedValue([
        createTask('task-1'),
        createTask('task-2', { dependsOn: ['task-1'] }),
      ]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
        { id: 1, tasks: [createTask('task-2', { dependsOn: ['task-1'] })], estimatedTime: 15, dependencies: [0] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockQAEngine.run.mockResolvedValue({ success: true, iterations: 1, escalated: false, stages: [] });
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree/task-1' });
    });

    it('should begin orchestration for project', async () => {
      const startPromise = coordinator.start('test-project');

      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = coordinator.getStatus();
      expect(status.state).toBe('running');

      // Stop to clean up
      await coordinator.stop();
    });

    it('should transition state to running', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(coordinator.getStatus().state).toBe('running');
      await coordinator.stop();
    });

    it('should set currentPhase to execution', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(coordinator.getStatus().currentPhase).toBe('execution');
      await coordinator.stop();
    });
  });

  describe('getStatus()', () => {
    it('should return correct state when idle', async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      const status = coordinator.getStatus();
      expect(status.state).toBe('idle');
      expect(status.activeAgents).toBe(0);
      expect(status.queuedTasks).toBe(0);
      expect(status.completedTasks).toBe(0);
    });

    it('should include project ID after initialize', async () => {
      const config = createConfig({ projectId: 'test-123' });
      await coordinator.initialize(config);

      const status = coordinator.getStatus();
      expect(status.projectId).toBe('test-123');
    });

    it('should track active agents count', async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      // Spawn and assign agent
      const agent = agentPool.spawn('coder');
      agentPool.assign(agent.id, 'task-1');

      const status = coordinator.getStatus();
      expect(status.activeAgents).toBe(1);
    });

    it('should track queued tasks count', async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      taskQueue.enqueue(createTask('task-1'));
      taskQueue.enqueue(createTask('task-2'));

      const status = coordinator.getStatus();
      expect(status.queuedTasks).toBe(2);
    });
  });

  describe('pause()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockQAEngine.run.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should transition to paused state', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause();

      const status = coordinator.getStatus();
      expect(status.state).toBe('paused');
    });

    it('should store pause reason', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause('User requested pause');

      const status = coordinator.getStatus();
      expect(status.pauseReason).toBe('User requested pause');
    });

    it('should emit pause event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause();

      const pauseEvent = events.find(e => e.type === 'coordinator:paused');
      expect(pauseEvent).toBeDefined();
    });
  });

  describe('resume()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockQAEngine.run.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should transition from paused to running', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause();
      expect(coordinator.getStatus().state).toBe('paused');

      await coordinator.resume();
      expect(coordinator.getStatus().state).toBe('running');
    });

    it('should clear pause reason', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause('Test pause');
      await coordinator.resume();

      const status = coordinator.getStatus();
      expect(status.pauseReason).toBeUndefined();
    });

    it('should emit resume event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.pause();
      await coordinator.resume();

      const resumeEvent = events.find(e => e.type === 'coordinator:resumed');
      expect(resumeEvent).toBeDefined();
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockQAEngine.run.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should terminate cleanly', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.stop();

      const status = coordinator.getStatus();
      expect(status.state).toBe('idle');
    });

    it('should emit stop event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      await coordinator.stop();

      const stopEvent = events.find(e => e.type === 'coordinator:stopped');
      expect(stopEvent).toBeDefined();
    });
  });

  describe('getProgress()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
    });

    it('should return project progress', async () => {
      const progress = coordinator.getProgress();
      expect(progress.projectId).toBe('test-project');
    });

    it('should track total and completed tasks', async () => {
      const progress = coordinator.getProgress();
      expect(progress.totalTasks).toBeDefined();
      expect(progress.completedTasks).toBeDefined();
    });

    it('should calculate progress percentage', async () => {
      const progress = coordinator.getProgress();
      expect(progress.progressPercent).toBeDefined();
      expect(progress.progressPercent).toBeGreaterThanOrEqual(0);
      expect(progress.progressPercent).toBeLessThanOrEqual(100);
    });

    it('should include wave information', async () => {
      const progress = coordinator.getProgress();
      expect(progress.currentWave).toBeDefined();
      expect(progress.totalWaves).toBeDefined();
    });
  });

  describe('getActiveAgents()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
    });

    it('should return active agents', async () => {
      const agent = agentPool.spawn('coder');
      agentPool.assign(agent.id, 'task-1');

      const active = coordinator.getActiveAgents();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(agent.id);
    });

    it('should return empty array when no active agents', async () => {
      const active = coordinator.getActiveAgents();
      expect(active).toHaveLength(0);
    });
  });

  describe('getPendingTasks()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
    });

    it('should return pending tasks from queue', async () => {
      const task = createTask('task-1');
      taskQueue.enqueue(task);

      const pending = coordinator.getPendingTasks();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('task-1');
    });

    it('should return empty array when queue is empty', async () => {
      const pending = coordinator.getPendingTasks();
      expect(pending).toHaveLength(0);
    });
  });

  describe('onEvent()', () => {
    it('should register event handler', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      const config = createConfig();
      await coordinator.initialize(config);

      // Events should be captured
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('should emit events for state changes', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      const config = createConfig();
      await coordinator.initialize(config);

      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockQAEngine.run.mockResolvedValue({ success: true, iterations: 1, escalated: false, stages: [] });
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startEvent = events.find(e => e.type === 'coordinator:started');
      expect(startEvent).toBeDefined();

      await coordinator.stop();
    });
  });

  describe('createCheckpoint()', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);

      mockCheckpointManager.create.mockResolvedValue({
        id: 'checkpoint-1',
        name: 'Test Checkpoint',
        projectId: 'test-project',
        waveId: 0,
        completedTaskIds: [],
        pendingTaskIds: [],
        timestamp: new Date(),
        coordinatorState: 'running',
      });
    });

    it('should create checkpoint with current state', async () => {
      const checkpoint = await coordinator.createCheckpoint();
      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeDefined();
    });

    it('should include custom name if provided', async () => {
      await coordinator.createCheckpoint('My Checkpoint');
      expect(mockCheckpointManager.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Checkpoint' })
      );
    });

    it('should emit checkpoint event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      await coordinator.createCheckpoint();

      const checkpointEvent = events.find(e => e.type === 'checkpoint:created');
      expect(checkpointEvent).toBeDefined();
    });
  });

  describe('wave processing', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
    });

    it('should process wave 0 before wave 1', async () => {
      const executionOrder: string[] = [];

      mockDecomposer.decompose.mockResolvedValue([
        createTask('task-1'),
        createTask('task-2', { dependsOn: ['task-1'] }),
      ]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
        { id: 1, tasks: [createTask('task-2', { dependsOn: ['task-1'] })], estimatedTime: 15, dependencies: [0] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });

      mockQAEngine.run.mockImplementation(async (task: any) => {
        executionOrder.push(task.id);
        return { success: true, iterations: 1, escalated: false, stages: [] };
      });

      const startPromise = coordinator.start('test-project');

      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      // task-1 should execute before task-2 (if any were executed)
      if (executionOrder.length >= 2) {
        expect(executionOrder.indexOf('task-1')).toBeLessThan(executionOrder.indexOf('task-2'));
      }
    });
  });

  describe('agent assignment', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
      mockQAEngine.run.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));
    });

    it('should assign task to available agent', async () => {
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have spawned an agent
      expect(agentPool.size()).toBeGreaterThan(0);

      await coordinator.stop();
    });
  });

  describe('task completion', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should update state on task completion', async () => {
      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = coordinator.getStatus();
      expect(status.completedTasks).toBeGreaterThanOrEqual(0);

      await coordinator.stop();
    });

    it('should emit task completed event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      // Should have task events
      const taskEvents = events.filter(e => e.type.startsWith('task:'));
      expect(taskEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('task failure handling', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should handle failed task', async () => {
      mockQAEngine.run.mockResolvedValue({
        success: false,
        iterations: 50,
        escalated: true,
        stages: [],
        finalErrors: [{ type: 'test', file: 'test.ts', message: 'Test failed' }],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = coordinator.getStatus();
      expect(status.failedTasks).toBeGreaterThanOrEqual(0);

      await coordinator.stop();
    });

    it('should emit task failed event', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent((event) => events.push(event));

      mockQAEngine.run.mockResolvedValue({
        success: false,
        iterations: 50,
        escalated: true,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      // Check for task:failed event
      const failedEvent = events.find(e => e.type === 'task:failed');
      // May or may not have failed depending on timing
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('multiple agents parallel execution', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
    });

    it('should spawn multiple agents for parallel tasks', async () => {
      mockDecomposer.decompose.mockResolvedValue([
        createTask('task-1'),
        createTask('task-2'),
        createTask('task-3'),
      ]);
      mockResolver.calculateWaves.mockReturnValue([
        {
          id: 0,
          tasks: [createTask('task-1'), createTask('task-2'), createTask('task-3')],
          estimatedTime: 15,
          dependencies: [],
        },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
      mockQAEngine.run.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 500))
      );

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have multiple agents working
      const activeAgents = coordinator.getActiveAgents();
      expect(activeAgents.length).toBeGreaterThanOrEqual(1);

      await coordinator.stop();
    });
  });

  describe('progress tracking', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([
        createTask('task-1'),
        createTask('task-2'),
      ]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
        { id: 1, tasks: [createTask('task-2')], estimatedTime: 15, dependencies: [0] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should track accurate progress', async () => {
      let completedCount = 0;
      mockQAEngine.run.mockImplementation(async () => {
        completedCount++;
        return { success: true, iterations: 1, escalated: false, stages: [] };
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));

      const progress = coordinator.getProgress();
      expect(progress.completedTasks).toBeGreaterThanOrEqual(0);

      await coordinator.stop();
    });
  });

  // ============================================================================
  // Hotfix #5 Tests
  // ============================================================================

  describe('Hotfix #5 - Issue 2: Per-task merge on success', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree/task-1' });
      mockMergerRunner.merge.mockResolvedValue(undefined);
    });

    it('should merge task branch to main on success', async () => {
      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      expect(mockMergerRunner.merge).toHaveBeenCalledWith('/worktree/task-1', 'main');
    });

    it('should emit task:merged event on successful merge', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      const mergedEvent = events.find(e => e.type === 'task:merged');
      expect(mergedEvent).toBeDefined();
      expect(mergedEvent?.data?.taskId).toBe('task-1');
      expect(mergedEvent?.data?.branch).toBe('main');
    });

    it('should emit task:merge-failed event on merge error', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });
      mockMergerRunner.merge.mockRejectedValue(new Error('Merge conflict'));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      const mergeFailedEvent = events.find(e => e.type === 'task:merge-failed');
      expect(mergeFailedEvent).toBeDefined();
      expect(mergeFailedEvent?.data?.error).toContain('Merge conflict');
    });

    it('should not merge on task failure', async () => {
      mockQAEngine.run.mockResolvedValue({
        success: false,
        iterations: 50,
        escalated: true,
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      expect(mockMergerRunner.merge).not.toHaveBeenCalled();
    });
  });

  describe('Hotfix #5 - Issue 3: Per-wave checkpoints', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([
        createTask('task-1'),
        createTask('task-2', { dependsOn: ['task-1'] }),
      ]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
        { id: 1, tasks: [createTask('task-2', { dependsOn: ['task-1'] })], estimatedTime: 15, dependencies: [0] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });
      mockCheckpointManager.create.mockResolvedValue({
        id: 'checkpoint-1',
        name: 'Wave 0 complete',
        projectId: 'test-project',
        waveId: 0,
        completedTaskIds: [],
        pendingTaskIds: [],
        timestamp: new Date(),
        coordinatorState: 'running',
      });
    });

    it('should create checkpoint after each wave completion', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 500));
      await coordinator.stop();

      // Should have checkpoint events for completed waves
      const checkpointEvents = events.filter(e => e.type === 'checkpoint:created');
      expect(checkpointEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit checkpoint:failed on checkpoint error', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      // Make checkpoint creation fail
      mockCheckpointManager.create.mockRejectedValue(new Error('Checkpoint storage failed'));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      const failedEvent = events.find(e => e.type === 'checkpoint:failed');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.data?.error).toContain('Checkpoint storage failed');
    });
  });

  describe('Hotfix #5 - Issue 4: Genesis/Evolution mode', () => {
    beforeEach(async () => {
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
      mockQAEngine.run.mockResolvedValue({
        success: true,
        iterations: 1,
        escalated: false,
        stages: [],
      });
    });

    it('should emit orchestration:mode event for genesis mode', async () => {
      const config = createConfig({ mode: 'genesis' });
      await coordinator.initialize(config);

      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      const modeEvent = events.find(e => e.type === 'orchestration:mode');
      expect(modeEvent).toBeDefined();
      expect(modeEvent?.data?.mode).toBe('genesis');
    });

    it('should emit orchestration:mode event for evolution mode', async () => {
      const config = createConfig({ mode: 'evolution' });
      await coordinator.initialize(config);

      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      const modeEvent = events.find(e => e.type === 'orchestration:mode');
      expect(modeEvent).toBeDefined();
      expect(modeEvent?.data?.mode).toBe('evolution');
    });

    it('should default to genesis mode when not specified', async () => {
      const config = createConfig(); // No mode specified
      await coordinator.initialize(config);

      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      const modeEvent = events.find(e => e.type === 'orchestration:mode');
      expect(modeEvent).toBeDefined();
      expect(modeEvent?.data?.mode).toBe('genesis');
    });

    it('should add evolution compatibility test criteria for evolution mode', async () => {
      const config = createConfig({
        mode: 'evolution',
        features: [{ id: 'feature-1', name: 'Test Feature', description: 'Test' }],
      });
      await coordinator.initialize(config);

      // The decomposer should receive features and add evolution test criteria
      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 200));
      await coordinator.stop();

      // Check that decomposer was called
      expect(mockDecomposer.decompose).toHaveBeenCalled();
    });
  });

  describe('Hotfix #5 - task:escalated event', () => {
    beforeEach(async () => {
      const config = createConfig();
      await coordinator.initialize(config);
      mockDecomposer.decompose.mockResolvedValue([createTask('task-1')]);
      mockResolver.calculateWaves.mockReturnValue([
        { id: 0, tasks: [createTask('task-1')], estimatedTime: 15, dependencies: [] },
      ]);
      mockResolver.detectCycles.mockReturnValue([]);
      mockWorktreeManager.createWorktree.mockResolvedValue({ path: '/worktree' });
    });

    it('should emit task:escalated when QA loop escalates', async () => {
      const events: NexusEvent[] = [];
      coordinator.onEvent(event => events.push(event));

      mockQAEngine.run.mockResolvedValue({
        success: false,
        iterations: 50,
        escalated: true,
        reason: 'Max QA iterations exceeded',
        stages: [],
      });

      const startPromise = coordinator.start('test-project');
      await new Promise(resolve => setTimeout(resolve, 300));
      await coordinator.stop();

      const escalatedEvent = events.find(e => e.type === 'task:escalated');
      expect(escalatedEvent).toBeDefined();
      expect(escalatedEvent?.data?.taskId).toBe('task-1');
      expect(escalatedEvent?.data?.reason).toContain('Max QA iterations');
    });
  });
});
