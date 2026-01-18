/**
 * BuildRunner Tests
 *
 * Tests for the TypeScript compilation runner that powers
 * the build step in RalphStyleIterator's QA pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuildRunner, createBuildRunner, createBuildCallback } from './BuildRunner';
import type { BuildResult, ErrorEntry } from '../iteration/types';
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

describe('BuildRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration when no config provided', () => {
      const runner = new BuildRunner();
      // Verify defaults by running with mocked process
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['tsc', '--noEmit', '-p', 'tsconfig.json']),
        expect.objectContaining({ timeout: 60000 })
      );
    });

    it('should use custom configuration when provided', () => {
      const runner = new BuildRunner({
        timeout: 120000,
        tsconfigPath: 'tsconfig.build.json',
      });

      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['-p', 'tsconfig.build.json']),
        expect.objectContaining({ timeout: 120000 })
      );
    });
  });

  describe('run', () => {
    it('should return success when TypeScript compiles without errors', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '' }));

      const runner = new BuildRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should parse TypeScript errors correctly', async () => {
      const tscOutput = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/utils.ts(25,10): error TS2339: Property 'foo' does not exist on type 'Bar'.`;

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: tscOutput })
      );

      const runner = new BuildRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Check first error
      expect(result.errors[0]).toMatchObject({
        type: 'build',
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
        file: 'src/index.ts',
        line: 10,
        column: 5,
        code: 'TS2322',
      });

      // Check second error
      expect(result.errors[1]).toMatchObject({
        type: 'build',
        severity: 'error',
        message: "Property 'foo' does not exist on type 'Bar'.",
        file: 'src/utils.ts',
        line: 25,
        column: 10,
        code: 'TS2339',
      });
    });

    it('should handle compilation timeout', async () => {
      // Simulate timeout by returning an error
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('ETIMEDOUT: Operation timed out'),
        })
      );

      const runner = new BuildRunner({ timeout: 1000 });
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('ETIMEDOUT');
      expect(result.errors[0].code).toBe('SPAWN_ERROR');
    });

    it('should handle spawn errors', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('spawn ENOENT'),
        })
      );

      const runner = new BuildRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('spawn ENOENT');
      expect(result.errors[0].type).toBe('build');
    });

    it('should capture duration correctly', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner();
      const result = await runner.run('/test/project');

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should combine stdout and stderr for parsing', async () => {
      // Use stdout with both errors since the mock emits them in order
      // and regex parses them from the combined output
      const combinedOutput = `src/a.ts(1,1): error TS1234: Error in stdout
src/b.ts(2,2): error TS5678: Error in stderr`;

      mockSpawn.mockReturnValue(
        createMockProcess({ stdout: combinedOutput, exitCode: 1 })
      );

      const runner = new BuildRunner();
      const result = await runner.run('/test/project');

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].file).toBe('src/a.ts');
      expect(result.errors[1].file).toBe('src/b.ts');
    });

    it('should use correct working directory', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner();
      await runner.run('/my/project/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/my/project/path' })
      );
    });
  });

  describe('createCallback', () => {
    it('should return a function compatible with QARunner interface', () => {
      const runner = new BuildRunner();
      const callback = runner.createCallback('/test/path');

      expect(typeof callback).toBe('function');
    });

    it('should pass working directory correctly when called', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner();
      const callback = runner.createCallback('/specific/project');

      await callback('task-123');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/specific/project' })
      );
    });

    it('should return BuildResult matching the interface', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner();
      const callback = runner.createCallback('/test/path');

      const result = await callback('task-456');

      // Verify result matches BuildResult interface
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('duration');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('parseErrors', () => {
    it('should parse single error', () => {
      const runner = new BuildRunner();
      const output = `src/file.ts(42,8): error TS2551: Property 'naem' does not exist on type 'User'. Did you mean 'name'?`;

      const errors = runner.parseErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: 'build',
        severity: 'error',
        file: 'src/file.ts',
        line: 42,
        column: 8,
        code: 'TS2551',
        message: "Property 'naem' does not exist on type 'User'. Did you mean 'name'?",
      });
    });

    it('should parse multiple errors', () => {
      const runner = new BuildRunner();
      const output = `src/a.ts(1,1): error TS1001: First error
src/b.ts(2,2): error TS1002: Second error
src/c.ts(3,3): error TS1003: Third error`;

      const errors = runner.parseErrors(output);

      expect(errors).toHaveLength(3);
      expect(errors[0].file).toBe('src/a.ts');
      expect(errors[1].file).toBe('src/b.ts');
      expect(errors[2].file).toBe('src/c.ts');
    });

    it('should handle empty output', () => {
      const runner = new BuildRunner();
      const errors = runner.parseErrors('');

      expect(errors).toHaveLength(0);
    });

    it('should handle Windows-style paths', () => {
      const runner = new BuildRunner();
      const output = `C:\\Users\\dev\\project\\src\\index.ts(10,5): error TS2322: Type error`;

      const errors = runner.parseErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].file).toBe('C:\\Users\\dev\\project\\src\\index.ts');
    });
  });

  describe('parseWarnings', () => {
    it('should parse TypeScript warnings', () => {
      const runner = new BuildRunner();
      const output = `src/file.ts(10,5): warning TS6385: This is a warning`;

      const warnings = runner.parseWarnings(output);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        type: 'build',
        severity: 'warning',
        file: 'src/file.ts',
        line: 10,
        column: 5,
        code: 'TS6385',
      });
    });

    it('should return empty array when no warnings', () => {
      const runner = new BuildRunner();
      const warnings = runner.parseWarnings('No warnings here');

      expect(warnings).toHaveLength(0);
    });
  });

  describe('setIteration', () => {
    it('should set iteration number on parsed errors', () => {
      const runner = new BuildRunner();
      runner.setIteration(5);

      const output = `src/file.ts(1,1): error TS1234: Error message`;
      const errors = runner.parseErrors(output);

      expect(errors[0].iteration).toBe(5);
    });
  });

  describe('configuration options', () => {
    it('should support project references', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner({ useProjectReferences: true });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--build']),
        expect.any(Object)
      );
    });

    it('should support additional arguments', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

      const runner = new BuildRunner({
        additionalArgs: ['--skipLibCheck', '--strict'],
      });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--skipLibCheck', '--strict']),
        expect.any(Object)
      );
    });
  });

  describe('factory functions', () => {
    describe('createBuildRunner', () => {
      it('should create a BuildRunner instance', () => {
        const runner = createBuildRunner();
        expect(runner).toBeInstanceOf(BuildRunner);
      });

      it('should pass config to the runner', () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

        const runner = createBuildRunner({ timeout: 999999 });
        runner.run('/test');

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.any(Array),
          expect.objectContaining({ timeout: 999999 })
        );
      });
    });

    describe('createBuildCallback', () => {
      it('should create a callback function directly', async () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0 }));

        const callback = createBuildCallback('/test/path');
        expect(typeof callback).toBe('function');

        const result = await callback!('task-id');
        expect(result.success).toBe(true);
      });
    });
  });
});
