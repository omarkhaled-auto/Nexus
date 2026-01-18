/**
 * Planning <-> Execution Integration Tests
 *
 * Tests real integration between Planning layer (TaskDecomposer, DependencyResolver)
 * and Execution layer (AgentPool, TaskQueue, EventBus).
 *
 * These tests use real components - only external APIs are mocked via MSW.
 *
 * @module tests/integration/planning-execution
 */
import { test, expect, describe, vi, beforeEach } from '../helpers/fixtures';
import { TaskQueue } from '@/orchestration/queue/TaskQueue';
import { AgentPool, PoolCapacityError } from '@/orchestration/agents/AgentPool';
import { DependencyResolver } from '@/planning/dependencies/DependencyResolver';
import type { PlanningTask, Wave } from '@/planning/types';
import type { OrchestrationTask } from '@/orchestration/types';
import { nanoid } from 'nanoid';
import type { NexusEvent, EventType } from '@/types/events';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Convert PlanningTask to OrchestrationTask
 */
function toOrchestrationTask(
  planningTask: PlanningTask,
  waveId = 0,
  priority = 5
): OrchestrationTask {
  return {
    ...planningTask,
    status: 'pending',
    waveId,
    priority,
    createdAt: new Date(),
  };
}

/**
 * Create a set of planning tasks for testing
 */
function createTestPlanningTasks(): PlanningTask[] {
  return [
    {
      id: 'task-1',
      name: 'Setup project',
      description: 'Initialize project structure',
      type: 'auto',
      size: 'atomic',
      estimatedMinutes: 10,
      dependsOn: [],
      testCriteria: ['Project initializes'],
      files: ['package.json'],
    },
    {
      id: 'task-2',
      name: 'Add database',
      description: 'Setup database models',
      type: 'auto',
      size: 'small',
      estimatedMinutes: 20,
      dependsOn: ['task-1'],
      testCriteria: ['Models compile'],
      files: ['src/db.ts'],
    },
    {
      id: 'task-3',
      name: 'Add API routes',
      description: 'Create API endpoints',
      type: 'auto',
      size: 'small',
      estimatedMinutes: 15,
      dependsOn: ['task-1'],
      testCriteria: ['Endpoints respond'],
      files: ['src/api.ts'],
    },
    {
      id: 'task-4',
      name: 'Integration layer',
      description: 'Connect DB and API',
      type: 'auto',
      size: 'small',
      estimatedMinutes: 25,
      dependsOn: ['task-2', 'task-3'],
      testCriteria: ['Full stack works'],
      files: ['src/integration.ts'],
    },
  ];
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Planning <-> Execution Integration', () => {
  let taskQueue: TaskQueue;
  let agentPool: AgentPool;
  let dependencyResolver: DependencyResolver;

  beforeEach(() => {
    taskQueue = new TaskQueue();
    agentPool = new AgentPool();
    dependencyResolver = new DependencyResolver();
  });

  test('should queue decomposed tasks for execution', async ({ eventBus }) => {
    // Arrange: Create planning tasks and resolve dependencies
    const planningTasks = createTestPlanningTasks();
    const waves = dependencyResolver.calculateWaves(planningTasks);

    // Track queued events
    const queuedEvents: NexusEvent[] = [];
    eventBus.on('task:queued', (event) => {
      queuedEvents.push(event);
    });

    // Act: Queue tasks by wave
    for (const wave of waves) {
      for (const task of wave.tasks) {
        const orchTask = toOrchestrationTask(task, wave.id);
        taskQueue.enqueue(orchTask, wave.id);

        // Emit queue event (simulating coordinator behavior)
        eventBus.emit('task:queued', {
          taskId: task.id,
          projectId: 'test-project',
          position: taskQueue.size(),
        });
      }
    }

    // Assert: All tasks are queued
    expect(taskQueue.size()).toBe(4);

    // Tasks in wave 0 are ready
    const readyTasks = taskQueue.getReadyTasks();
    expect(readyTasks).toHaveLength(1);
    expect(readyTasks[0].id).toBe('task-1');

    // Events were emitted
    expect(queuedEvents).toHaveLength(4);
    expect(queuedEvents.map(e => e.payload.taskId)).toContain('task-1');
    expect(queuedEvents.map(e => e.payload.taskId)).toContain('task-4');
  });

  test('should assign tasks to agents respecting dependencies', async ({ eventBus }) => {
    // Arrange
    const planningTasks = createTestPlanningTasks();
    const waves = dependencyResolver.calculateWaves(planningTasks);

    // Queue all tasks
    for (const wave of waves) {
      for (const task of wave.tasks) {
        taskQueue.enqueue(toOrchestrationTask(task, wave.id));
      }
    }

    // Spawn agents
    const agent1 = agentPool.spawn('coder');
    const agent2 = agentPool.spawn('coder');

    // Track assignment events
    const assignmentEvents: NexusEvent[] = [];
    eventBus.on('task:assigned', (event) => {
      assignmentEvents.push(event);
    });

    // Act: Dequeue and assign first wave
    const firstTask = taskQueue.dequeue();
    expect(firstTask).not.toBeNull();
    expect(firstTask!.id).toBe('task-1');

    agentPool.assign(agent1.id, firstTask!.id, '/worktree/task-1');
    eventBus.emit('task:assigned', {
      taskId: firstTask!.id,
      agentId: agent1.id,
      agentType: 'coder',
      worktreePath: '/worktree/task-1',
    });

    // Wave 1 tasks should NOT be ready yet (wave 0 not complete)
    const readyBeforeComplete = taskQueue.getReadyTasks();
    expect(readyBeforeComplete).toHaveLength(0);

    // Complete task-1
    taskQueue.markComplete('task-1');

    // Now wave 1 tasks should be ready
    const readyAfterComplete = taskQueue.getReadyTasks();
    expect(readyAfterComplete).toHaveLength(2);
    expect(readyAfterComplete.map(t => t.id).sort()).toEqual(['task-2', 'task-3']);

    // Assign wave 1 tasks to agents
    const task2 = taskQueue.dequeue();
    const task3 = taskQueue.dequeue();

    agentPool.release(agent1.id);
    agentPool.assign(agent1.id, task2!.id, '/worktree/task-2');
    agentPool.assign(agent2.id, task3!.id, '/worktree/task-3');

    eventBus.emit('task:assigned', {
      taskId: task2!.id,
      agentId: agent1.id,
      agentType: 'coder',
      worktreePath: '/worktree/task-2',
    });
    eventBus.emit('task:assigned', {
      taskId: task3!.id,
      agentId: agent2.id,
      agentType: 'coder',
      worktreePath: '/worktree/task-3',
    });

    // Assert
    expect(assignmentEvents).toHaveLength(3);
    expect(agentPool.getActive()).toHaveLength(2);
  });

  test('should emit events when tasks transition states', async ({ eventBus }) => {
    // Arrange
    const planningTasks = createTestPlanningTasks().slice(0, 2); // Just first two tasks
    const events: Array<{ type: EventType; payload: unknown }> = [];

    // Track multiple event types
    eventBus.on('task:queued', (event) => events.push({ type: 'task:queued', payload: event.payload }));
    eventBus.on('task:assigned', (event) => events.push({ type: 'task:assigned', payload: event.payload }));
    eventBus.on('task:started', (event) => events.push({ type: 'task:started', payload: event.payload }));
    eventBus.on('task:completed', (event) => events.push({ type: 'task:completed', payload: event.payload }));

    // Act: Simulate full task lifecycle
    // 1. Queue task
    const task = toOrchestrationTask(planningTasks[0], 0);
    taskQueue.enqueue(task);
    eventBus.emit('task:queued', {
      taskId: task.id,
      projectId: 'test-project',
      position: 1,
    });

    // 2. Assign to agent
    const agent = agentPool.spawn('coder');
    const dequeuedTask = taskQueue.dequeue();
    agentPool.assign(agent.id, dequeuedTask!.id, '/worktree/task');
    eventBus.emit('task:assigned', {
      taskId: dequeuedTask!.id,
      agentId: agent.id,
      agentType: 'coder',
      worktreePath: '/worktree/task',
    });

    // 3. Start execution
    eventBus.emit('task:started', {
      taskId: dequeuedTask!.id,
      agentId: agent.id,
      startedAt: new Date(),
    });

    // 4. Complete task
    taskQueue.markComplete(dequeuedTask!.id);
    agentPool.release(agent.id);
    eventBus.emit('task:completed', {
      taskId: dequeuedTask!.id,
      result: {
        success: true,
        filesCreated: [],
        filesModified: ['src/test.ts'],
        testsWritten: [],
        qaIterations: 1,
        duration: 5000,
      },
    });

    // Assert: All state transitions emitted events
    expect(events).toHaveLength(4);
    expect(events.map(e => e.type)).toEqual([
      'task:queued',
      'task:assigned',
      'task:started',
      'task:completed',
    ]);

    // Agent should be idle again
    expect(agentPool.getAvailable()).not.toBeNull();
    expect(agentPool.getAvailable()!.id).toBe(agent.id);
  });

  test('should handle agent failure with task requeue', async ({ eventBus }) => {
    // Arrange
    const task = toOrchestrationTask(createTestPlanningTasks()[0], 0);

    // Track events
    const failureEvents: NexusEvent[] = [];
    eventBus.on('task:failed', (event) => failureEvents.push(event));
    eventBus.on('agent:error', (event) => failureEvents.push(event));

    // Queue and assign task
    taskQueue.enqueue(task);
    const agent = agentPool.spawn('coder');
    const dequeuedTask = taskQueue.dequeue()!;
    agentPool.assign(agent.id, dequeuedTask.id);

    // Act: Simulate agent failure
    const failedTask: OrchestrationTask = {
      ...dequeuedTask,
      status: 'failed',
    };

    // Mark task as failed
    taskQueue.markFailed(dequeuedTask.id);

    // Emit failure events
    eventBus.emit('agent:error', {
      agentId: agent.id,
      taskId: dequeuedTask.id,
      error: 'Agent crashed during execution',
      recoverable: true,
    });

    eventBus.emit('task:failed', {
      taskId: dequeuedTask.id,
      error: 'Execution failed due to agent error',
      iterations: 1,
      escalated: false,
    });

    // Release/terminate the failed agent
    agentPool.terminate(agent.id);

    // Re-queue the task (simulating retry logic)
    const retryTask: OrchestrationTask = {
      ...failedTask,
      status: 'pending',
      id: `${failedTask.id}-retry`,
    };
    taskQueue.enqueue(retryTask);

    // Assert
    expect(failureEvents).toHaveLength(2);
    expect(taskQueue.size()).toBe(1);
    expect(taskQueue.getFailedCount()).toBe(1);
    expect(agentPool.size()).toBe(0);

    // Retry task is ready
    const readyTasks = taskQueue.getReadyTasks();
    expect(readyTasks).toHaveLength(1);
    expect(readyTasks[0].id).toBe('task-1-retry');
  });

  test('should coordinate multiple agents on parallel tasks', async ({ eventBus }) => {
    // Arrange: Create tasks with parallelizable dependencies
    const planningTasks: PlanningTask[] = [
      {
        id: 'parallel-1',
        name: 'Independent task 1',
        description: 'Can run in parallel',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
      },
      {
        id: 'parallel-2',
        name: 'Independent task 2',
        description: 'Can run in parallel',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
      },
      {
        id: 'parallel-3',
        name: 'Independent task 3',
        description: 'Can run in parallel',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
      },
      {
        id: 'merge-task',
        name: 'Merge results',
        description: 'Depends on all parallel tasks',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 10,
        dependsOn: ['parallel-1', 'parallel-2', 'parallel-3'],
      },
    ];

    // Calculate waves
    const waves = dependencyResolver.calculateWaves(planningTasks);

    // Assert wave structure
    expect(waves).toHaveLength(2);
    expect(waves[0].tasks).toHaveLength(3); // All parallel tasks in wave 0
    expect(waves[1].tasks).toHaveLength(1); // Merge task in wave 1

    // Queue all tasks
    for (const wave of waves) {
      for (const task of wave.tasks) {
        taskQueue.enqueue(toOrchestrationTask(task, wave.id));
      }
    }

    // Spawn 3 agents (simulate max parallelism)
    const agents = [
      agentPool.spawn('coder'),
      agentPool.spawn('coder'),
      agentPool.spawn('coder'),
    ];

    // Track started events
    const startedEvents: NexusEvent[] = [];
    eventBus.on('task:started', (event) => startedEvents.push(event));

    // Act: Assign all parallel tasks to agents
    const parallelTasks = [
      taskQueue.dequeue()!,
      taskQueue.dequeue()!,
      taskQueue.dequeue()!,
    ];

    for (let i = 0; i < 3; i++) {
      agentPool.assign(agents[i].id, parallelTasks[i].id, `/worktree/${parallelTasks[i].id}`);
      eventBus.emit('task:started', {
        taskId: parallelTasks[i].id,
        agentId: agents[i].id,
        startedAt: new Date(),
      });
    }

    // Assert: All 3 agents are active
    expect(agentPool.getActive()).toHaveLength(3);
    expect(agentPool.availableCount()).toBe(0);
    expect(startedEvents).toHaveLength(3);

    // Complete all parallel tasks
    for (let i = 0; i < 3; i++) {
      taskQueue.markComplete(parallelTasks[i].id);
      agentPool.release(agents[i].id);
    }

    // Merge task should now be ready
    const readyTasks = taskQueue.getReadyTasks();
    expect(readyTasks).toHaveLength(1);
    expect(readyTasks[0].id).toBe('merge-task');
    expect(taskQueue.getCompletedCount()).toBe(3);
  });
});
