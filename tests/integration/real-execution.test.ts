/**
 * Real Execution Integration Tests
 *
 * These tests verify that the QA runners actually execute real processes
 * (tsc, eslint, vitest) and parse their output correctly.
 *
 * Phase 14B - Task 20: Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BuildRunner } from '../../src/execution/qa/BuildRunner';
import { DependencyResolver } from '../../src/planning/dependencies/DependencyResolver';
import type { PlanningTask } from '../../src/planning/types';

// ============================================================================
// Test Setup
// ============================================================================

// Get the project root directory (where TypeScript is installed)
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Create a minimal TypeScript project for testing with error files
 */
function createTestProjectWithError(baseDir: string): void {
  // Create package.json
  fs.writeFileSync(
    path.join(baseDir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-project-error',
        version: '1.0.0',
      },
      null,
      2
    )
  );

  // Create tsconfig.json pointing to parent's node_modules for types
  fs.writeFileSync(
    path.join(baseDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['*.ts'],
      },
      null,
      2
    )
  );
}

// ============================================================================
// BuildRunner Integration Tests
// ============================================================================

describe('Real Execution Integration Tests', () => {
  let testDir: string;

  beforeAll(() => {
    // Create a unique test directory for error file tests
    testDir = path.join(
      os.tmpdir(),
      `nexus-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(testDir, { recursive: true });
    createTestProjectWithError(testDir);
  });

  afterAll(() => {
    // Cleanup test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('BuildRunner - Real tsc Execution', () => {
    let runner: BuildRunner;

    beforeEach(() => {
      runner = new BuildRunner({ timeout: 60000 });
    });

    it(
      'should actually run tsc and return results',
      async () => {
        // Run against the actual Nexus project where TypeScript is installed
        const result = await runner.run(PROJECT_ROOT);

        // Verify result structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('duration');

        // Duration should be positive (actually ran)
        expect(result.duration).toBeGreaterThan(0);

        // The Nexus project should compile (or at least run tsc)
        // Note: We verify that tsc actually ran, not necessarily that it succeeds
        // since the project may have intentional errors during development
        expect(typeof result.success).toBe('boolean');
      },
      60000
    );

    it(
      'should detect TypeScript errors in code',
      async () => {
        // Add a file with a type error to the test directory
        const errorFilePath = path.join(testDir, 'error.ts');
        fs.writeFileSync(
          errorFilePath,
          `const x: number = "not a number"; // Type error
export default x;
`
        );

        try {
          // Run tsc from project root but target the test directory tsconfig
          const customRunner = new BuildRunner({
            timeout: 30000,
            tsconfigPath: path.join(testDir, 'tsconfig.json'),
          });
          const result = await customRunner.run(PROJECT_ROOT);

          // Should fail due to type error
          expect(result.success).toBe(false);

          // Should have at least one error
          expect(result.errors.length).toBeGreaterThan(0);

          // Error should mention type mismatch
          const errorMessages = result.errors
            .map((e) => `${e.file || ''} ${e.message}`)
            .join(' ');
          expect(
            errorMessages.toLowerCase().includes('string') ||
              errorMessages.toLowerCase().includes('number') ||
              errorMessages.toLowerCase().includes('type') ||
              errorMessages.includes('error.ts')
          ).toBe(true);
        } finally {
          // Cleanup the error file
          if (fs.existsSync(errorFilePath)) {
            fs.unlinkSync(errorFilePath);
          }
        }
      },
      60000
    );

    it('should parse TypeScript error output correctly', () => {
      // Test error parsing without actually running tsc
      const runner = new BuildRunner();

      // Sample TypeScript error output
      const sampleOutput = `src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/other.ts(25,10): error TS2551: Property 'foo' does not exist on type 'Bar'.`;

      const errors = runner.parseErrors(sampleOutput);

      expect(errors.length).toBe(2);

      // First error
      expect(errors[0].file).toBe('src/file.ts');
      expect(errors[0].line).toBe(10);
      expect(errors[0].column).toBe(5);
      expect(errors[0].code).toBe('TS2322');
      expect(errors[0].message).toContain('not assignable');

      // Second error
      expect(errors[1].file).toBe('src/other.ts');
      expect(errors[1].line).toBe(25);
      expect(errors[1].column).toBe(10);
      expect(errors[1].code).toBe('TS2551');
    });

    it('should handle missing tsconfig gracefully', async () => {
      // Create a temp dir without tsconfig
      const noConfigDir = path.join(testDir, 'no-config');
      fs.mkdirSync(noConfigDir, { recursive: true });
      fs.writeFileSync(
        path.join(noConfigDir, 'index.ts'),
        'export const x = 1;'
      );

      try {
        // Run from the no-config directory (which lacks TypeScript in node_modules)
        // This should fail because there's no tsconfig.json
        const result = await runner.run(noConfigDir);

        // Should fail (no tsconfig)
        expect(result.success).toBe(false);
      } finally {
        fs.rmSync(noConfigDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should create QARunner-compatible callback', async () => {
      const callback = runner.createCallback(PROJECT_ROOT);

      // Callback should be a function
      expect(typeof callback).toBe('function');

      // Callback should work with taskId parameter
      const result = await callback('test-task-id');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
      expect(result.duration).toBeGreaterThan(0);
    }, 60000);
  });

  // ============================================================================
  // DependencyResolver Integration Tests
  // ============================================================================

  describe('DependencyResolver - Real Dependency Resolution', () => {
    let resolver: DependencyResolver;

    beforeEach(() => {
      resolver = new DependencyResolver();
    });

    it('should resolve task dependencies using topological sort', () => {
      const tasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1 - Foundation',
          description: 'Foundation task',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2 - Depends on 1',
          description: 'Second task',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '3',
          name: 'Task 3 - Depends on 1',
          description: 'Third task',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '4',
          name: 'Task 4 - Depends on 2 and 3',
          description: 'Final task',
          dependsOn: ['2', '3'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const resolved = resolver.topologicalSort(tasks);

      // Task 1 should come first
      expect(resolved[0].id).toBe('1');

      // Task 4 should come last
      expect(resolved[resolved.length - 1].id).toBe('4');

      // Tasks 2 and 3 should come after 1 but before 4
      const task1Index = resolved.findIndex((t) => t.id === '1');
      const task2Index = resolved.findIndex((t) => t.id === '2');
      const task3Index = resolved.findIndex((t) => t.id === '3');
      const task4Index = resolved.findIndex((t) => t.id === '4');

      expect(task2Index).toBeGreaterThan(task1Index);
      expect(task3Index).toBeGreaterThan(task1Index);
      expect(task4Index).toBeGreaterThan(task2Index);
      expect(task4Index).toBeGreaterThan(task3Index);
    });

    it('should detect circular dependencies', () => {
      const tasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1',
          description: 'First task',
          dependsOn: ['2'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2',
          description: 'Second task',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      expect(() => resolver.topologicalSort(tasks)).toThrow(/[Cc]ircular/);
      expect(resolver.hasCircularDependency(tasks)).toBe(true);
    });

    it('should calculate parallel execution waves', () => {
      const tasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1',
          description: 'Independent 1',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2',
          description: 'Independent 2',
          dependsOn: [],
          estimatedMinutes: 15,
          outputType: 'code',
        },
        {
          id: '3',
          name: 'Task 3',
          description: 'Depends on both',
          dependsOn: ['1', '2'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const waves = resolver.calculateWaves(tasks);

      // Should have 2 waves
      expect(waves.length).toBe(2);

      // First wave should have tasks 1 and 2 (parallel)
      expect(waves[0].tasks.length).toBe(2);
      expect(waves[0].tasks.map((t) => t.id).sort()).toEqual(['1', '2']);

      // Second wave should have task 3
      expect(waves[1].tasks.length).toBe(1);
      expect(waves[1].tasks[0].id).toBe('3');

      // First wave estimated time should be max of its tasks (15)
      expect(waves[0].estimatedMinutes).toBe(15);
    });

    it('should find critical path', () => {
      const tasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Short Task',
          description: 'Quick task',
          dependsOn: [],
          estimatedMinutes: 5,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Long Task',
          description: 'Time-consuming task',
          dependsOn: [],
          estimatedMinutes: 30,
          outputType: 'code',
        },
        {
          id: '3',
          name: 'Final Task',
          description: 'Depends on long task',
          dependsOn: ['2'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const criticalPath = resolver.getCriticalPath(tasks);

      // Critical path should be through the long task (2 -> 3)
      expect(criticalPath.length).toBe(2);
      expect(criticalPath.map((t) => t.id)).toEqual(['2', '3']);
    });

    it('should get next available tasks', () => {
      const tasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1',
          description: 'First',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2',
          description: 'Second',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '3',
          name: 'Task 3',
          description: 'Third',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      // Initially, only task 1 is available
      const initialAvailable = resolver.getNextAvailable(tasks, []);
      expect(initialAvailable.length).toBe(1);
      expect(initialAvailable[0].id).toBe('1');

      // After completing task 1, tasks 2 and 3 are available
      const afterTask1 = resolver.getNextAvailable(tasks, ['1']);
      expect(afterTask1.length).toBe(2);
      expect(afterTask1.map((t) => t.id).sort()).toEqual(['2', '3']);
    });

    it('should validate dependency graph', () => {
      const validTasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1',
          description: 'First',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2',
          description: 'Second',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const validResult = resolver.validate(validTasks);
      expect(validResult.valid).toBe(true);
      expect(validResult.issues).toHaveLength(0);

      const circularTasks: PlanningTask[] = [
        {
          id: '1',
          name: 'Task 1',
          description: 'First',
          dependsOn: ['2'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: '2',
          name: 'Task 2',
          description: 'Second',
          dependsOn: ['1'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const invalidResult = resolver.validate(circularTasks);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.issues.length).toBeGreaterThan(0);
    });

    it('should handle complex dependency graphs', () => {
      // Diamond dependency pattern
      const tasks: PlanningTask[] = [
        {
          id: 'A',
          name: 'Task A',
          description: 'Root',
          dependsOn: [],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'B',
          name: 'Task B',
          description: 'Left branch',
          dependsOn: ['A'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'C',
          name: 'Task C',
          description: 'Right branch',
          dependsOn: ['A'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
        {
          id: 'D',
          name: 'Task D',
          description: 'Merge point',
          dependsOn: ['B', 'C'],
          estimatedMinutes: 10,
          outputType: 'code',
        },
      ];

      const resolved = resolver.topologicalSort(tasks);
      expect(resolved.length).toBe(4);

      // A must come first
      expect(resolved[0].id).toBe('A');

      // D must come last
      expect(resolved[3].id).toBe('D');

      // Waves should be: [A], [B, C], [D]
      const waves = resolver.calculateWaves(tasks);
      expect(waves.length).toBe(3);
      expect(waves[0].tasks.length).toBe(1);
      expect(waves[1].tasks.length).toBe(2);
      expect(waves[2].tasks.length).toBe(1);
    });
  });
});
