// TestRunner Tests
// Phase 03-03: Quality Verification Layer - TDD RED Phase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestRunner, TestError, TestTimeoutError } from './TestRunner';
import type { ProcessRunner, ProcessResult } from '@/infrastructure/process/ProcessRunner';
import { TimeoutError } from '@/infrastructure/process/ProcessRunner';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockProcessRunner(): ProcessRunner {
  return {
    run: vi.fn(),
    runStreaming: vi.fn(),
    kill: vi.fn(),
    isCommandAllowed: vi.fn().mockReturnValue(true),
    getDefaultTimeout: vi.fn().mockReturnValue(30000),
  } as unknown as ProcessRunner;
}

function createProcessResult(overrides: Partial<ProcessResult> = {}): ProcessResult {
  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    duration: 100,
    killed: false,
    ...overrides,
  };
}

// Vitest JSON output format
function createVitestOutput(
  results: {
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    numPendingTests: number;
    testResults: Array<{
      name: string;
      status: 'passed' | 'failed' | 'pending';
      assertionResults: Array<{
        title: string;
        fullName: string;
        status: 'passed' | 'failed' | 'pending';
        failureMessages?: string[];
      }>;
    }>;
    coverageMap?: Record<
      string,
      {
        path: string;
        s: Record<string, number>;
        b: Record<string, number[]>;
        f: Record<string, number>;
        l: Record<string, number>;
      }
    >;
    success: boolean;
  }
): string {
  return JSON.stringify(results);
}

// ============================================================================
// TestRunner Tests
// ============================================================================

describe('TestRunner', () => {
  let processRunner: ProcessRunner;
  let runner: TestRunner;

  beforeEach(() => {
    processRunner = createMockProcessRunner();
    runner = new TestRunner({ processRunner });
  });

  describe('constructor', () => {
    it('should accept processRunner', () => {
      const runner = new TestRunner({ processRunner });
      expect(runner).toBeDefined();
    });

    it('should accept optional vitestPath', () => {
      const runner = new TestRunner({
        processRunner,
        vitestPath: 'custom-vitest',
      });
      expect(runner).toBeDefined();
    });

    it('should accept optional timeout', () => {
      const runner = new TestRunner({
        processRunner,
        timeout: 60000,
      });
      expect(runner).toBeDefined();
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const runner = new TestRunner({ processRunner, logger });
      expect(runner).toBeDefined();
    });
  });

  describe('run', () => {
    it('should return success when all tests pass', async () => {
      const vitestOutput = createVitestOutput({
        numTotalTests: 5,
        numPassedTests: 5,
        numFailedTests: 0,
        numPendingTests: 0,
        testResults: [],
        success: true,
      });

      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: vitestOutput, exitCode: 0 })
      );

      const result = await runner.run('/path/to/project');

      expect(result.success).toBe(true);
      expect(result.passed).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it('should run vitest with JSON reporter', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      await runner.run('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('--reporter=json'),
        expect.objectContaining({ cwd: '/path/to/project' })
      );
    });

    it('should use custom vitestPath if provided', async () => {
      const customRunner = new TestRunner({
        processRunner,
        vitestPath: './node_modules/.bin/vitest',
      });
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      await customRunner.run('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('./node_modules/.bin/vitest'),
        expect.any(Object)
      );
    });

    it('should return failure details when tests fail', async () => {
      const vitestOutput = createVitestOutput({
        numTotalTests: 3,
        numPassedTests: 2,
        numFailedTests: 1,
        numPendingTests: 0,
        testResults: [
          {
            name: 'src/test.spec.ts',
            status: 'failed',
            assertionResults: [
              {
                title: 'should work',
                fullName: 'MyClass should work',
                status: 'failed',
                failureMessages: ['Expected true to be false\n    at src/test.spec.ts:10:5'],
              },
            ],
          },
        ],
        success: false,
      });

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: vitestOutput,
        stderr: '',
      });

      const result = await runner.run('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toEqual(
        expect.objectContaining({
          testName: 'MyClass should work',
          file: 'src/test.spec.ts',
          message: expect.stringContaining('Expected true to be false'),
        })
      );
    });

    it('should filter tests by pattern when provided', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 1,
            numPassedTests: 1,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      await runner.run('/path/to/project', 'MyClass');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('--testNamePattern'),
        expect.any(Object)
      );
      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('MyClass'),
        expect.any(Object)
      );
    });

    it('should track skipped tests', async () => {
      const vitestOutput = createVitestOutput({
        numTotalTests: 5,
        numPassedTests: 3,
        numFailedTests: 0,
        numPendingTests: 2,
        testResults: [],
        success: true,
      });

      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: vitestOutput })
      );

      const result = await runner.run('/path/to/project');

      expect(result.skipped).toBe(2);
    });

    it('should throw TestTimeoutError when tests timeout', async () => {
      vi.mocked(processRunner.run).mockRejectedValue(
        new TimeoutError('Command timed out', 'vitest', 300000)
      );

      await expect(runner.run('/path/to/project')).rejects.toThrow(TestTimeoutError);
    });

    it('should use custom timeout when provided', async () => {
      const customRunner = new TestRunner({
        processRunner,
        timeout: 60000,
      });
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      await customRunner.run('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 60000 })
      );
    });

    it('should track duration', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 1,
            numPassedTests: 1,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
          duration: 500,
        })
      );

      const result = await runner.run('/path/to/project');

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runWithCoverage', () => {
    it('should run vitest with coverage flag', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 5,
            numPassedTests: 5,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      await runner.runWithCoverage('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('--coverage'),
        expect.any(Object)
      );
    });

    it('should parse coverage metrics when available', async () => {
      // For coverage parsing, we'll need to handle the coverage JSON output
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({
          stdout: createVitestOutput({
            numTotalTests: 5,
            numPassedTests: 5,
            numFailedTests: 0,
            numPendingTests: 0,
            testResults: [],
            success: true,
          }),
        })
      );

      const result = await runner.runWithCoverage('/path/to/project');

      expect(result.success).toBe(true);
      // Coverage may or may not be present depending on output format
    });
  });

  describe('parseOutput', () => {
    it('should parse valid Vitest JSON output', () => {
      const output = createVitestOutput({
        numTotalTests: 10,
        numPassedTests: 8,
        numFailedTests: 2,
        numPendingTests: 0,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                title: 'test 1',
                fullName: 'Suite test 1',
                status: 'failed',
                failureMessages: ['Error message'],
              },
            ],
          },
        ],
        success: false,
      });

      const result = runner.parseOutput(output);

      expect(result.passed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.failures).toHaveLength(1);
    });

    it('should handle invalid JSON gracefully', () => {
      const result = runner.parseOutput('not valid json');

      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(0);
    });

    it('should extract stack traces from failure messages', () => {
      const output = createVitestOutput({
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        numPendingTests: 0,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                title: 'failing test',
                fullName: 'Suite failing test',
                status: 'failed',
                failureMessages: ['Error: Something failed\n    at Object.<anonymous> (test.ts:5:10)'],
              },
            ],
          },
        ],
        success: false,
      });

      const result = runner.parseOutput(output);

      expect(result.failures[0].stack).toContain('at Object.<anonymous>');
    });
  });

  describe('error types', () => {
    it('should have TestError class', () => {
      const error = new TestError('Test failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TestError');
      expect(error.message).toBe('Test failed');
    });

    it('should have TestTimeoutError class', () => {
      const error = new TestTimeoutError(300000);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TestTimeoutError');
      expect(error.timeout).toBe(300000);
    });
  });
});
