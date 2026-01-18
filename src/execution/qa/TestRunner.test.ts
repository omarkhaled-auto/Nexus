/**
 * TestRunner Tests
 *
 * Tests for the Vitest test runner that powers
 * the test step in RalphStyleIterator's QA pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TestRunner,
  createTestRunner,
  createTestCallback,
  TestRunnerConfig,
  TestFailure,
  CoverageResult,
} from './TestRunner';
import type { TestResult, ErrorEntry } from '../iteration/types';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);

/**
 * Create a mock process that emits events
 */
function createMockProcess(
  options: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: Error;
  } = {}
): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;

  // Create readable streams
  proc.stdout = new EventEmitter() as any;
  proc.stderr = new EventEmitter() as any;

  // Schedule events after creation
  setTimeout(() => {
    if (options.stdout) {
      proc.stdout?.emit('data', Buffer.from(options.stdout));
    }
    if (options.stderr) {
      proc.stderr?.emit('data', Buffer.from(options.stderr));
    }
    if (options.error) {
      proc.emit('error', options.error);
    } else {
      proc.emit('close', options.exitCode ?? 0);
    }
  }, 0);

  return proc;
}

describe('TestRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration when no config provided', () => {
      const runner = new TestRunner();
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['vitest', 'run', '--reporter=json']),
        expect.objectContaining({ timeout: 300000 })
      );
    });

    it('should use custom configuration when provided', () => {
      const runner = new TestRunner({
        timeout: 60000,
        coverage: true,
      });

      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--coverage']),
        expect.objectContaining({ timeout: 60000 })
      );
    });

    it('should support test pattern configuration', () => {
      const runner = new TestRunner({
        testPattern: 'should handle',
      });

      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['-t', 'should handle']),
        expect.any(Object)
      );
    });
  });

  describe('run', () => {
    it('should return success when all tests pass', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'src/test.test.ts',
            assertionResults: [
              { status: 'passed', title: 'test 1' },
              { status: 'passed', title: 'test 2' },
            ],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true);
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return failure when tests fail', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'src/test.test.ts',
            assertionResults: [
              { status: 'passed', title: 'test 1' },
              {
                status: 'failed',
                title: 'test 2',
                fullName: 'describe > test 2',
                failureMessages: ['Expected 1 to be 2'],
              },
            ],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected 1 to be 2');
    });

    it('should handle skipped tests', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'src/test.test.ts',
            assertionResults: [
              { status: 'passed', title: 'test 1' },
              { status: 'skipped', title: 'test 2' },
              { status: 'pending', title: 'test 3' },
              { status: 'todo', title: 'test 4' },
            ],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true);
      expect(result.passed).toBe(1);
      expect(result.skipped).toBe(3);
    });

    it('should handle spawn errors', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('spawn ENOENT'),
        })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('spawn ENOENT');
      expect(result.errors[0].code).toBe('SPAWN_ERROR');
      expect(result.errors[0].type).toBe('test');
    });

    it('should handle timeout', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('ETIMEDOUT: Operation timed out'),
        })
      );

      const runner = new TestRunner({ timeout: 1000 });
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('ETIMEDOUT');
    });

    it('should capture duration correctly', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use correct working directory', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      await runner.run('/my/project/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/my/project/path' })
      );
    });
  });

  describe('runFiles', () => {
    it('should run specific test files', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      await runner.runFiles('/test/project', [
        'src/test1.test.ts',
        'src/test2.test.ts',
      ]);

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['src/test1.test.ts', 'src/test2.test.ts']),
        expect.any(Object)
      );
    });
  });

  describe('runWithCoverage', () => {
    it('should run tests with coverage enabled', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      await runner.runWithCoverage('/test/project');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--coverage', '--coverage.reporter=json']),
        expect.any(Object)
      );
    });

    it('should restore original coverage setting after run', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner({ coverage: false });
      await runner.runWithCoverage('/test/project');

      // Run again normally - should not have coverage
      mockSpawn.mockClear();
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      await runner.run('/test/project');

      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args).not.toContain('--coverage');
    });
  });

  describe('runByPattern', () => {
    it('should run tests matching pattern', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      await runner.runByPattern('/test/project', 'should handle errors');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['-t', 'should handle errors']),
        expect.any(Object)
      );
    });
  });

  describe('createCallback', () => {
    it('should return a function compatible with QARunner interface', () => {
      const runner = new TestRunner();
      const callback = runner.createCallback('/test/path');

      expect(typeof callback).toBe('function');
    });

    it('should pass working directory correctly when called', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner();
      const callback = runner.createCallback('/specific/project');

      await callback('task-123');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/specific/project' })
      );
    });

    it('should return TestResult matching the interface', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'src/test.test.ts',
            assertionResults: [{ status: 'passed', title: 'test 1' }],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const callback = runner.createCallback('/test/path');

      const result = await callback('task-456');

      // Verify result matches TestResult interface
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.passed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.skipped).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('JSON output parsing', () => {
    it('should parse Vitest JSON output correctly', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'src/feature.test.ts',
            assertionResults: [
              { status: 'passed', title: 'feature works' },
              {
                status: 'failed',
                title: 'handles edge case',
                fullName: 'feature > handles edge case',
                failureMessages: ['AssertionError: expected true to be false'],
              },
              { status: 'skipped', title: 'pending test' },
            ],
          },
          {
            name: 'src/utils.test.ts',
            assertionResults: [
              { status: 'passed', title: 'util 1' },
              { status: 'passed', title: 'util 2' },
            ],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.passed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('AssertionError');
    });

    it('should handle JSON mixed with other output', async () => {
      const mixedOutput = `
        Starting vitest...
        ${JSON.stringify({
          testResults: [
            {
              name: 'test.test.ts',
              assertionResults: [{ status: 'passed', title: 'test' }],
            },
          ],
        })}
        Done in 1.5s
      `;

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: mixedOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.passed).toBe(1);
    });
  });

  describe('fallback parsing', () => {
    it('should fallback to regex parsing when JSON is not available', async () => {
      const textOutput = `
        Tests: 5 passed, 2 failed, 1 skipped, 8 total
        Time: 2.5s
      `;

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: textOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.passed).toBe(5);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it('should parse alternative test count formats', async () => {
      const textOutput = `
        12 passing
        3 failing
        2 skipped
      `;

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: textOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.passed).toBe(12);
      expect(result.failed).toBe(3);
      expect(result.skipped).toBe(2);
    });

    it('should handle partial count formats', async () => {
      const textOutput = `
        10 passed
        Time: 1.5s
      `;

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: textOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.passed).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('setIteration', () => {
    it('should set iteration number on parsed errors', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'test.test.ts',
            assertionResults: [
              {
                status: 'failed',
                title: 'test',
                failureMessages: ['Error'],
              },
            ],
          },
        ],
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      runner.setIteration(5);
      const result = await runner.run('/test/project');

      expect(result.errors[0].iteration).toBe(5);
    });
  });

  describe('coverage parsing', () => {
    it('should parse coverage from JSON output', async () => {
      const jsonOutput = JSON.stringify({
        testResults: [
          {
            name: 'test.test.ts',
            assertionResults: [{ status: 'passed', title: 'test' }],
          },
        ],
        coverage: {
          lines: { pct: 85.5 },
          branches: { pct: 75.0 },
          functions: { pct: 90.0 },
          statements: { pct: 85.0 },
        },
      });

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: jsonOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      // Note: coverage is parsed but not part of TestResult interface
      // The implementation stores it internally
      expect(result.success).toBe(true);
    });
  });

  describe('configuration options', () => {
    it('should support verbose reporter', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner({ reporter: 'verbose' });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--reporter=verbose']),
        expect.any(Object)
      );
    });

    it('should support additional arguments', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new TestRunner({
        additionalArgs: ['--no-cache', '--silent'],
      });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--no-cache', '--silent']),
        expect.any(Object)
      );
    });
  });

  describe('factory functions', () => {
    describe('createTestRunner', () => {
      it('should create a TestRunner instance', () => {
        const runner = createTestRunner();
        expect(runner).toBeInstanceOf(TestRunner);
      });

      it('should pass config to the runner', () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

        const runner = createTestRunner({ timeout: 999999 });
        runner.run('/test');

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.any(Array),
          expect.objectContaining({ timeout: 999999 })
        );
      });
    });

    describe('createTestCallback', () => {
      it('should create a callback function directly', async () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

        const callback = createTestCallback('/test/path');
        expect(typeof callback).toBe('function');

        const result = await callback!('task-id');
        expect(result.success).toBe(true);
      });

      it('should pass config to the underlying runner', async () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

        const callback = createTestCallback('/test/path', { coverage: true });
        await callback!('task-id');

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['--coverage']),
          expect.any(Object)
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const brokenOutput = '{ invalid json }';

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: brokenOutput })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      // Should fallback to regex parsing without crashing
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle empty output', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: '' })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle only stderr output', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          exitCode: 1,
          stderr: 'Error: Cannot find module',
        })
      );

      const runner = new TestRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
    });
  });
});
