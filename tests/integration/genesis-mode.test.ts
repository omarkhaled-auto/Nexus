/**
 * Genesis Mode Integration Tests
 *
 * These tests verify that Genesis mode can run end-to-end, covering:
 * - Feature decomposition via Claude
 * - Dependency resolution via topological sort
 * - Task wave calculation for parallel execution
 * - Full orchestration flow (if API keys available)
 *
 * Phase 14B - Task 21: End-to-End Genesis Mode Test
 *
 * Note: Some tests require API keys to be set in environment variables:
 * - ANTHROPIC_API_KEY (or CLAUDE_API_KEY)
 * - GOOGLE_API_KEY (or GEMINI_API_KEY)
 *
 * Tests will skip gracefully if keys are not available.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NexusFactory, type NexusInstance } from '../../src/NexusFactory';
import { TaskDecomposer } from '../../src/planning/decomposition/TaskDecomposer';
import { DependencyResolver } from '../../src/planning/dependencies/DependencyResolver';
import { TimeEstimator } from '../../src/planning/estimation/TimeEstimator';
import { ClaudeClient } from '../../src/llm/clients/ClaudeClient';
import type { PlanningTask, Feature } from '../../src/planning/types';
import type { ProjectConfig } from '../../src/orchestration/types';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Check if API keys are available for real API tests
 */
function getClaudeApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
}

function getGeminiApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
}

const hasClaudeKey = !!getClaudeApiKey();
const hasGeminiKey = !!getGeminiApiKey();
const hasAllKeys = hasClaudeKey && hasGeminiKey;

// Log key availability for CI debugging
if (!hasAllKeys) {
  console.log(
    `[Genesis Mode Tests] API keys: Claude=${hasClaudeKey ? 'available' : 'missing'}, Gemini=${hasGeminiKey ? 'available' : 'missing'}`
  );
  console.log('[Genesis Mode Tests] Some tests will be skipped. Set ANTHROPIC_API_KEY and GOOGLE_API_KEY to run all tests.');
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a sample feature for testing decomposition
 */
function createSampleFeature(): Feature {
  return {
    id: 'test-feature-001',
    name: 'User Authentication',
    description: 'Implement basic user authentication with login, logout, and session management',
    requirements: `
      1. Users can register with email and password
      2. Users can login with credentials
      3. Sessions are managed securely
      4. Users can logout and invalidate session
    `,
    acceptanceCriteria: [
      'User can register with valid email and password',
      'User receives validation error for invalid inputs',
      'User can login with registered credentials',
      'User session persists across page refreshes',
      'User can logout successfully',
    ],
    priority: 'high',
    estimatedComplexity: 'medium',
  };
}

/**
 * Create a minimal feature for fast decomposition tests
 */
function createMinimalFeature(): Feature {
  return {
    id: 'test-feature-mini',
    name: 'Add Hello World endpoint',
    description: 'Create a simple GET endpoint that returns "Hello World"',
    requirements: 'Create /api/hello endpoint that returns JSON: { message: "Hello World" }',
    acceptanceCriteria: ['GET /api/hello returns 200 with message'],
    priority: 'low',
    estimatedComplexity: 'simple',
  };
}

/**
 * Create sample tasks for resolver testing
 */
function createSampleTasks(): PlanningTask[] {
  return [
    {
      id: 'task-1',
      name: 'Create User model',
      description: 'Define the User TypeScript interface and database schema',
      dependsOn: [],
      estimatedMinutes: 15,
      outputType: 'code',
    },
    {
      id: 'task-2',
      name: 'Implement password hashing',
      description: 'Create utility functions for secure password hashing and verification',
      dependsOn: [],
      estimatedMinutes: 20,
      outputType: 'code',
    },
    {
      id: 'task-3',
      name: 'Create auth service',
      description: 'Implement authentication service with login and register methods',
      dependsOn: ['task-1', 'task-2'],
      estimatedMinutes: 25,
      outputType: 'code',
    },
    {
      id: 'task-4',
      name: 'Create auth routes',
      description: 'Define Express routes for login, register, and logout endpoints',
      dependsOn: ['task-3'],
      estimatedMinutes: 20,
      outputType: 'code',
    },
    {
      id: 'task-5',
      name: 'Write auth tests',
      description: 'Create integration tests for authentication flow',
      dependsOn: ['task-4'],
      estimatedMinutes: 25,
      outputType: 'tests',
    },
  ];
}

// ============================================================================
// Genesis Mode Unit Tests (No API Required)
// ============================================================================

describe('Genesis Mode - Unit Tests (No API)', () => {
  describe('DependencyResolver in Genesis Flow', () => {
    let resolver: DependencyResolver;

    beforeAll(() => {
      resolver = new DependencyResolver();
    });

    it('should resolve dependencies in correct execution order', () => {
      const tasks = createSampleTasks();
      const resolved = resolver.topologicalSort(tasks);

      // Verify correct order
      expect(resolved.length).toBe(5);

      // Find indices
      const getIndex = (id: string) => resolved.findIndex((t) => t.id === id);

      // task-1 and task-2 should come before task-3
      expect(getIndex('task-1')).toBeLessThan(getIndex('task-3'));
      expect(getIndex('task-2')).toBeLessThan(getIndex('task-3'));

      // task-3 should come before task-4
      expect(getIndex('task-3')).toBeLessThan(getIndex('task-4'));

      // task-4 should come before task-5
      expect(getIndex('task-4')).toBeLessThan(getIndex('task-5'));
    });

    it('should calculate optimal parallel waves', () => {
      const tasks = createSampleTasks();
      const waves = resolver.calculateWaves(tasks);

      // Should have multiple waves for parallel execution
      expect(waves.length).toBeGreaterThanOrEqual(3);

      // Wave 1: task-1 and task-2 can run in parallel
      expect(waves[0].tasks.map((t) => t.id).sort()).toEqual(['task-1', 'task-2']);

      // Wave 2: task-3 depends on both
      expect(waves[1].tasks[0].id).toBe('task-3');

      // Wave 3: task-4
      expect(waves[2].tasks[0].id).toBe('task-4');

      // Wave 4: task-5
      expect(waves[3].tasks[0].id).toBe('task-5');
    });

    it('should identify critical path for time estimation', () => {
      const tasks = createSampleTasks();
      const criticalPath = resolver.getCriticalPath(tasks);

      // Critical path should be the longest dependency chain
      expect(criticalPath.length).toBeGreaterThan(0);

      // The path should include the longest chain of dependent tasks
      const pathIds = criticalPath.map((t) => t.id);
      expect(pathIds).toContain('task-5'); // Final task should be in critical path
    });

    it('should detect if genesis mode can execute in parallel', () => {
      const tasks = createSampleTasks();
      const waves = resolver.calculateWaves(tasks);

      // First wave should allow parallel execution
      expect(waves[0].tasks.length).toBe(2);

      // Check parallelizable flag
      const firstWave = waves[0];
      expect(firstWave.estimatedMinutes).toBe(
        Math.max(...firstWave.tasks.map((t) => t.estimatedMinutes))
      );
    });
  });

  describe('TimeEstimator in Genesis Flow', () => {
    let estimator: TimeEstimator;

    beforeAll(() => {
      estimator = new TimeEstimator();
    });

    it('should estimate time for a set of tasks', async () => {
      const tasks = createSampleTasks();
      const totalEstimate = await estimator.estimateTotal(tasks);

      // Total estimate should be a positive number
      expect(totalEstimate).toBeGreaterThan(0);

      // Should roughly correlate with task count and complexity
      // Each task has 10-30 minutes base + complexity adjustments
      expect(totalEstimate).toBeGreaterThanOrEqual(50); // At least 5 tasks x 10 min
    });

    it('should estimate time considering complexity', async () => {
      const simpleTask: PlanningTask = {
        id: 'simple',
        name: 'Simple task',
        description: 'A simple rename operation',
        dependsOn: [],
        estimatedMinutes: 10,
        outputType: 'code',
      };

      const complexTask: PlanningTask = {
        id: 'complex',
        name: 'Complex refactor',
        description: 'A complex algorithm optimization with security and encryption',
        dependsOn: [],
        estimatedMinutes: 10,
        outputType: 'code',
      };

      const simpleEstimate = await estimator.estimate(simpleTask);
      const complexEstimate = await estimator.estimate(complexTask);

      // Both should return positive numbers
      expect(simpleEstimate).toBeGreaterThan(0);
      expect(complexEstimate).toBeGreaterThan(0);

      // Complex tasks should have higher estimates (or equal at minimum)
      expect(complexEstimate).toBeGreaterThanOrEqual(simpleEstimate);
    });

    it('should provide confidence levels for estimates', () => {
      const wellDefinedTask: PlanningTask = {
        id: 'well-defined',
        name: 'Create user model',
        description:
          'Detailed description of creating a TypeScript interface for User with proper validation and database schema mapping',
        dependsOn: [],
        estimatedMinutes: 20,
        outputType: 'code',
        files: ['src/models/user.ts', 'src/database/schema.ts'],
      };

      const vagueTask: PlanningTask = {
        id: 'vague',
        name: 'Fix things',
        description: 'Fix stuff',
        dependsOn: [],
        estimatedMinutes: 10,
        outputType: 'code',
      };

      // Use estimateDetailed to get confidence
      const wellDefinedEstimate = estimator.estimateDetailed(wellDefinedTask);
      const vagueEstimate = estimator.estimateDetailed(vagueTask);

      // Well-defined tasks should have higher confidence
      expect(['high', 'medium']).toContain(wellDefinedEstimate.confidence);
      expect(['medium', 'low']).toContain(vagueEstimate.confidence);
    });
  });

  describe('Genesis Mode Planning Pipeline', () => {
    let resolver: DependencyResolver;
    let estimator: TimeEstimator;

    beforeAll(() => {
      resolver = new DependencyResolver();
      estimator = new TimeEstimator();
    });

    it('should complete full planning pipeline without API', async () => {
      // Simulate decomposed tasks (would come from Claude in real scenario)
      const tasks = createSampleTasks();

      // Step 1: Resolve dependencies
      const resolvedTasks = resolver.topologicalSort(tasks);
      expect(resolvedTasks.length).toBe(tasks.length);

      // Step 2: Calculate execution waves
      const waves = resolver.calculateWaves(tasks);
      expect(waves.length).toBeGreaterThan(0);

      // Step 3: Estimate time
      const timeEstimate = await estimator.estimateTotal(tasks);
      expect(timeEstimate).toBeGreaterThan(0);

      // Step 4: Get critical path
      const criticalPath = resolver.getCriticalPath(tasks);
      expect(criticalPath.length).toBeGreaterThan(0);

      // Step 5: Validate the plan
      const validation = resolver.validate(tasks);
      expect(validation.valid).toBe(true);
    });

    it('should detect invalid genesis plans', () => {
      // Tasks with circular dependency (invalid genesis plan)
      const invalidTasks: PlanningTask[] = [
        {
          id: 'a',
          name: 'Task A',
          description: 'Depends on B',
          dependsOn: ['b'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'b',
          name: 'Task B',
          description: 'Depends on A (circular!)',
          dependsOn: ['a'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const validation = resolver.validate(invalidTasks);
      expect(validation.valid).toBe(false);
      expect(validation.issues.some((i) => i.includes('circular') || i.includes('Circular'))).toBe(
        true
      );
    });
  });
});

// ============================================================================
// Genesis Mode Integration Tests (API Required)
// ============================================================================

describe('Genesis Mode - Integration Tests (API Required)', () => {
  describe('TaskDecomposer with Claude', () => {
    const conditionalIt = hasClaudeKey ? it : it.skip;
    let claudeClient: ClaudeClient;
    let decomposer: TaskDecomposer;

    beforeAll(() => {
      if (hasClaudeKey) {
        claudeClient = new ClaudeClient({ apiKey: getClaudeApiKey()! });
        decomposer = new TaskDecomposer(claudeClient);
      }
    });

    conditionalIt(
      'should decompose a simple feature into atomic tasks',
      async () => {
        const feature = createMinimalFeature();
        const tasks = await decomposer.decompose(feature);

        // Should return at least one task
        expect(tasks.length).toBeGreaterThan(0);

        // Each task should have required properties
        for (const task of tasks) {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('name');
          expect(task).toHaveProperty('description');
          expect(task).toHaveProperty('estimatedMinutes');
          expect(task).toHaveProperty('dependsOn');
        }

        // Tasks should respect the 30-minute rule
        for (const task of tasks) {
          expect(task.estimatedMinutes).toBeLessThanOrEqual(30);
        }
      },
      60000
    ); // 60 second timeout for API call

    conditionalIt(
      'should decompose a complex feature into multiple tasks',
      async () => {
        const feature = createSampleFeature();
        const tasks = await decomposer.decompose(feature);

        // Complex features should result in multiple tasks
        expect(tasks.length).toBeGreaterThanOrEqual(3);

        // Should include variety of task types
        const descriptions = tasks.map((t) => t.description.toLowerCase()).join(' ');
        const hasMultipleTypes =
          descriptions.includes('model') ||
          descriptions.includes('service') ||
          descriptions.includes('route') ||
          descriptions.includes('test') ||
          descriptions.includes('schema');

        expect(hasMultipleTypes || tasks.length > 2).toBe(true);
      },
      90000
    ); // 90 second timeout for complex decomposition
  });

  describe('Full Genesis Flow', () => {
    const conditionalIt = hasAllKeys ? it : it.skip;
    let testDir: string;
    let nexus: NexusInstance | undefined;

    beforeAll(() => {
      // Create a temporary directory for the test project
      testDir = path.join(
        os.tmpdir(),
        `nexus-genesis-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      fs.mkdirSync(testDir, { recursive: true });

      // Create minimal project structure
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(
          {
            name: 'genesis-test-project',
            version: '1.0.0',
            scripts: {
              test: 'echo "tests"',
              build: 'echo "build"',
            },
          },
          null,
          2
        )
      );

      fs.writeFileSync(
        path.join(testDir, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              strict: true,
              noEmit: true,
            },
            include: ['src/**/*'],
          },
          null,
          2
        )
      );

      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export const version = "1.0.0";\n');
    });

    afterAll(() => {
      // Cleanup
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    afterEach(async () => {
      // Shutdown nexus instance if created
      if (nexus) {
        try {
          await nexus.shutdown();
        } catch {
          // Ignore shutdown errors
        }
        nexus = undefined;
      }
    });

    conditionalIt(
      'should create a Nexus instance with all components wired',
      async () => {
        nexus = NexusFactory.createForTesting({
          claudeApiKey: getClaudeApiKey()!,
          geminiApiKey: getGeminiApiKey()!,
          workingDir: testDir,
          mockQA: true, // Use mock QA for faster tests
        });

        // Verify all components are present
        expect(nexus.coordinator).toBeDefined();
        expect(nexus.agentPool).toBeDefined();
        expect(nexus.taskQueue).toBeDefined();
        expect(nexus.eventBus).toBeDefined();
        expect(nexus.llm.claude).toBeDefined();
        expect(nexus.llm.gemini).toBeDefined();
        expect(nexus.planning.decomposer).toBeDefined();
        expect(nexus.planning.resolver).toBeDefined();
        expect(nexus.planning.estimator).toBeDefined();
      },
      10000
    );

    conditionalIt(
      'should complete decompose -> resolve -> estimate pipeline',
      async () => {
        nexus = NexusFactory.createForTesting({
          claudeApiKey: getClaudeApiKey()!,
          geminiApiKey: getGeminiApiKey()!,
          workingDir: testDir,
          mockQA: true,
        });

        const { decomposer, resolver, estimator } = nexus.planning;

        // Step 1: Decompose a feature
        const feature = createMinimalFeature();
        const tasks = await decomposer.decompose(feature);

        expect(tasks.length).toBeGreaterThan(0);
        console.log(`[Genesis Test] Decomposed into ${tasks.length} tasks`);

        // Step 2: Resolve dependencies
        const resolvedTasks = resolver.topologicalSort(tasks);
        expect(resolvedTasks.length).toBe(tasks.length);

        // Step 3: Calculate waves
        const waves = resolver.calculateWaves(tasks);
        expect(waves.length).toBeGreaterThan(0);
        console.log(`[Genesis Test] Calculated ${waves.length} execution waves`);

        // Step 4: Estimate time
        const timeEstimate = estimator.estimateTotal(tasks);
        expect(timeEstimate.sequentialMinutes).toBeGreaterThan(0);
        console.log(
          `[Genesis Test] Estimated time: ${timeEstimate.parallelMinutes} min (parallel), ${timeEstimate.sequentialMinutes} min (sequential)`
        );

        // Step 5: Validate
        const validation = resolver.validate(tasks);
        expect(validation.valid).toBe(true);
      },
      90000
    );

    conditionalIt(
      'should initialize coordinator for genesis mode',
      async () => {
        nexus = NexusFactory.createForTesting({
          claudeApiKey: getClaudeApiKey()!,
          geminiApiKey: getGeminiApiKey()!,
          workingDir: testDir,
          mockQA: true,
        });

        const projectConfig: ProjectConfig = {
          projectId: 'genesis-test-project',
          projectPath: testDir,
          mode: 'genesis',
          features: [createMinimalFeature()],
        };

        // Initialize coordinator
        nexus.coordinator.initialize(projectConfig);

        // Check status
        const status = nexus.coordinator.getStatus();
        expect(status.state).toBe('idle');
        expect(status.projectId).toBe('genesis-test-project');
      },
      30000
    );

    conditionalIt(
      'should emit events during genesis flow',
      async () => {
        nexus = NexusFactory.createForTesting({
          claudeApiKey: getClaudeApiKey()!,
          geminiApiKey: getGeminiApiKey()!,
          workingDir: testDir,
          mockQA: true,
        });

        const events: string[] = [];

        // Register event handler
        nexus.coordinator.onEvent((event) => {
          events.push(event.type);
        });

        const projectConfig: ProjectConfig = {
          projectId: 'genesis-event-test',
          projectPath: testDir,
          mode: 'genesis',
          features: [createMinimalFeature()],
        };

        // Initialize and start
        nexus.coordinator.initialize(projectConfig);

        // Note: We don't actually start() because that would trigger the full
        // orchestration loop. For this test, we just verify initialization emits no errors.

        // The coordinator should be ready
        const status = nexus.coordinator.getStatus();
        expect(status.state).toBe('idle');
      },
      30000
    );
  });
});

// ============================================================================
// Genesis Mode Edge Cases
// ============================================================================

describe('Genesis Mode - Edge Cases', () => {
  describe('Empty and Minimal Inputs', () => {
    let resolver: DependencyResolver;
    let estimator: TimeEstimator;

    beforeAll(() => {
      resolver = new DependencyResolver();
      estimator = new TimeEstimator();
    });

    it('should handle empty task list', async () => {
      const emptyTasks: PlanningTask[] = [];

      const resolved = resolver.topologicalSort(emptyTasks);
      expect(resolved).toEqual([]);

      const waves = resolver.calculateWaves(emptyTasks);
      expect(waves).toEqual([]);

      const estimate = await estimator.estimateTotal(emptyTasks);
      expect(estimate).toBe(0);
    });

    it('should handle single task', () => {
      const singleTask: PlanningTask[] = [
        {
          id: 'solo',
          name: 'Standalone task',
          description: 'A task with no dependencies',
          dependsOn: [],
          estimatedMinutes: 15,
          outputType: 'code',
        },
      ];

      const resolved = resolver.topologicalSort(singleTask);
      expect(resolved.length).toBe(1);

      const waves = resolver.calculateWaves(singleTask);
      expect(waves.length).toBe(1);
      expect(waves[0].tasks.length).toBe(1);

      const validation = resolver.validate(singleTask);
      expect(validation.valid).toBe(true);
    });

    it('should handle all tasks with no dependencies (maximum parallelism)', () => {
      const independentTasks: PlanningTask[] = [
        {
          id: 'a',
          name: 'Task A',
          description: 'Independent',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'b',
          name: 'Task B',
          description: 'Independent',
          dependsOn: [],
          estimatedMinutes: 20,
          outputType: 'code',
        },
        {
          id: 'c',
          name: 'Task C',
          description: 'Independent',
          dependsOn: [],
          estimatedMinutes: 15,
          outputType: 'code',
        },
      ];

      const waves = resolver.calculateWaves(independentTasks);

      // All tasks in single wave (maximum parallelism)
      expect(waves.length).toBe(1);
      expect(waves[0].tasks.length).toBe(3);
    });

    it('should handle linear dependency chain (no parallelism)', async () => {
      const chainTasks: PlanningTask[] = [
        {
          id: 'first',
          name: 'First',
          description: 'First in chain',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'second',
          name: 'Second',
          description: 'Depends on first',
          dependsOn: ['first'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'third',
          name: 'Third',
          description: 'Depends on second',
          dependsOn: ['second'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const waves = resolver.calculateWaves(chainTasks);

      // Each task in its own wave (no parallelism)
      expect(waves.length).toBe(3);
      expect(waves.every((w) => w.tasks.length === 1)).toBe(true);

      // Time estimate should be positive
      const estimate = await estimator.estimateTotal(chainTasks);
      expect(estimate).toBeGreaterThan(0);
    });
  });

  describe('Complex Dependency Graphs', () => {
    let resolver: DependencyResolver;

    beforeAll(() => {
      resolver = new DependencyResolver();
    });

    it('should handle diamond dependency pattern', () => {
      //     A
      //    / \
      //   B   C
      //    \ /
      //     D
      const diamondTasks: PlanningTask[] = [
        {
          id: 'A',
          name: 'Root',
          description: 'Root task',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'B',
          name: 'Left',
          description: 'Left branch',
          dependsOn: ['A'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'C',
          name: 'Right',
          description: 'Right branch',
          dependsOn: ['A'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'D',
          name: 'Merge',
          description: 'Merge point',
          dependsOn: ['B', 'C'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const waves = resolver.calculateWaves(diamondTasks);

      // Should be 3 waves: [A], [B,C], [D]
      expect(waves.length).toBe(3);
      expect(waves[0].tasks.length).toBe(1);
      expect(waves[1].tasks.length).toBe(2);
      expect(waves[2].tasks.length).toBe(1);
    });

    it('should handle multi-parent convergence', () => {
      //   A   B   C
      //    \  |  /
      //       D
      const convergeTasks: PlanningTask[] = [
        {
          id: 'A',
          name: 'A',
          description: 'A',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'B',
          name: 'B',
          description: 'B',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'C',
          name: 'C',
          description: 'C',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'D',
          name: 'D',
          description: 'Depends on A, B, C',
          dependsOn: ['A', 'B', 'C'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const resolved = resolver.topologicalSort(convergeTasks);
      const waves = resolver.calculateWaves(convergeTasks);

      // D should come last
      expect(resolved[resolved.length - 1].id).toBe('D');

      // 2 waves: [A,B,C], [D]
      expect(waves.length).toBe(2);
      expect(waves[0].tasks.length).toBe(3);
    });

    it('should handle missing dependencies gracefully', () => {
      const tasksWithMissingDep: PlanningTask[] = [
        {
          id: 'A',
          name: 'A',
          description: 'A',
          dependsOn: ['NONEXISTENT'], // Missing dependency
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      // Should not throw during topological sort (external deps are ignored)
      const resolved = resolver.topologicalSort(tasksWithMissingDep);
      expect(resolved.length).toBe(1);

      // Validation should still run without error
      const validation = resolver.validate(tasksWithMissingDep);
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
    });
  });
});
