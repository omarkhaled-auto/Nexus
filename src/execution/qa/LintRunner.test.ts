/**
 * LintRunner Tests
 *
 * Tests for the ESLint runner that powers
 * the lint step in RalphStyleIterator's QA pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LintRunner, createLintRunner, createLintCallback } from './LintRunner';
import type { LintResult, ErrorEntry } from '../iteration/types';
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

/**
 * Create sample ESLint JSON output
 */
function createEslintJsonOutput(
  files: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string;
      severity: 1 | 2;
      message: string;
      line: number;
      column: number;
      fix?: boolean;
    }>;
    fixableErrorCount?: number;
    fixableWarningCount?: number;
    output?: string;
  }>
): string {
  return JSON.stringify(
    files.map((f) => ({
      filePath: f.filePath,
      messages: f.messages.map((m) => ({
        ruleId: m.ruleId,
        severity: m.severity,
        message: m.message,
        line: m.line,
        column: m.column,
        fix: m.fix ? { range: [0, 1], text: '' } : undefined,
      })),
      errorCount: f.messages.filter((m) => m.severity === 2).length,
      warningCount: f.messages.filter((m) => m.severity === 1).length,
      fixableErrorCount: f.fixableErrorCount ?? 0,
      fixableWarningCount: f.fixableWarningCount ?? 0,
      output: f.output,
    }))
  );
}

describe('LintRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration when no config provided', () => {
      const runner = new LintRunner();
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['eslint', '.', '--format', 'json']),
        expect.objectContaining({ timeout: 120000 })
      );
    });

    it('should use custom configuration when provided', () => {
      const runner = new LintRunner({
        timeout: 60000,
        extensions: ['.js', '.jsx'],
      });

      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));
      runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--ext', '.js', '--ext', '.jsx']),
        expect.objectContaining({ timeout: 60000 })
      );
    });
  });

  describe('run', () => {
    it('should return success when ESLint finds no errors', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse ESLint errors correctly', async () => {
      const eslintOutput = createEslintJsonOutput([
        {
          filePath: '/test/src/index.ts',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: "'foo' is assigned a value but never used.",
              line: 10,
              column: 5,
            },
            {
              ruleId: '@typescript-eslint/no-explicit-any',
              severity: 2,
              message: "Unexpected any. Specify a different type.",
              line: 25,
              column: 10,
            },
          ],
        },
      ]);

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: eslintOutput })
      );

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Check first error
      expect(result.errors[0]).toMatchObject({
        type: 'lint',
        severity: 'error',
        message: "'foo' is assigned a value but never used.",
        file: '/test/src/index.ts',
        line: 10,
        column: 5,
        code: 'no-unused-vars',
      });

      // Check second error
      expect(result.errors[1]).toMatchObject({
        type: 'lint',
        severity: 'error',
        message: "Unexpected any. Specify a different type.",
        file: '/test/src/index.ts',
        line: 25,
        column: 10,
        code: '@typescript-eslint/no-explicit-any',
      });
    });

    it('should parse ESLint warnings correctly', async () => {
      const eslintOutput = createEslintJsonOutput([
        {
          filePath: '/test/src/utils.ts',
          messages: [
            {
              ruleId: 'prefer-const',
              severity: 1,
              message: "'x' is never reassigned. Use 'const' instead.",
              line: 5,
              column: 3,
            },
          ],
        },
      ]);

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: eslintOutput })
      );

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(true); // Warnings don't fail
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        type: 'lint',
        severity: 'warning',
        message: "'x' is never reassigned. Use 'const' instead.",
        code: 'prefer-const',
      });
    });

    it('should handle spawn errors', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('spawn ENOENT'),
        })
      );

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('spawn ENOENT');
      expect(result.errors[0].code).toBe('SPAWN_ERROR');
      expect(result.errors[0].type).toBe('lint');
    });

    it('should handle timeout errors', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({
          error: new Error('ETIMEDOUT: Operation timed out'),
        })
      );

      const runner = new LintRunner({ timeout: 1000 });
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('ETIMEDOUT');
    });

    it('should count fixable issues correctly', async () => {
      const eslintOutput = createEslintJsonOutput([
        {
          filePath: '/test/src/index.ts',
          messages: [
            {
              ruleId: 'semi',
              severity: 2,
              message: 'Missing semicolon.',
              line: 10,
              column: 20,
              fix: true,
            },
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: "'x' is unused",
              line: 15,
              column: 5,
            },
          ],
          fixableErrorCount: 1,
          fixableWarningCount: 2,
        },
      ]);

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: eslintOutput })
      );

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.fixable).toBe(3); // 1 error + 2 warnings
    });

    it('should use correct working directory', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner();
      await runner.run('/my/project/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/my/project/path' })
      );
    });

    it('should handle invalid JSON output gracefully', async () => {
      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 1, stdout: 'Not valid JSON output' })
      );

      const runner = new LintRunner();
      const result = await runner.run('/test/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
    });
  });

  describe('runWithFix', () => {
    it('should pass --fix flag when running with fix', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner();
      await runner.runWithFix('/test/project');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--fix']),
        expect.any(Object)
      );
    });

    it('should detect fixed files in output', async () => {
      const eslintOutput = createEslintJsonOutput([
        {
          filePath: '/test/src/index.ts',
          messages: [],
          output: 'fixed content', // Indicates file was modified
        },
      ]);

      mockSpawn.mockReturnValue(
        createMockProcess({ exitCode: 0, stdout: eslintOutput })
      );

      const runner = new LintRunner();
      const result = await runner.runWithFix('/test/project');

      expect(result.success).toBe(true);
    });
  });

  describe('createCallback', () => {
    it('should return a function compatible with QARunner interface', () => {
      const runner = new LintRunner();
      const callback = runner.createCallback('/test/path');

      expect(typeof callback).toBe('function');
    });

    it('should pass working directory correctly when called', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner();
      const callback = runner.createCallback('/specific/project');

      await callback!('task-123');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: '/specific/project' })
      );
    });

    it('should return LintResult matching the interface', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner();
      const callback = runner.createCallback('/test/path');

      const result = await callback!('task-456');

      // Verify result matches LintResult interface
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('fixable');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.fixable).toBe('number');
    });
  });

  describe('parseJsonOutput', () => {
    it('should parse empty output', () => {
      const runner = new LintRunner();
      const result = runner.parseJsonOutput('[]');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.fixableErrors).toBe(0);
      expect(result.fixableWarnings).toBe(0);
    });

    it('should parse multiple files with errors', () => {
      const runner = new LintRunner();
      const output = createEslintJsonOutput([
        {
          filePath: '/a.ts',
          messages: [
            { ruleId: 'rule1', severity: 2, message: 'Error 1', line: 1, column: 1 },
          ],
        },
        {
          filePath: '/b.ts',
          messages: [
            { ruleId: 'rule2', severity: 2, message: 'Error 2', line: 2, column: 2 },
          ],
        },
      ]);

      const result = runner.parseJsonOutput(output);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].file).toBe('/a.ts');
      expect(result.errors[1].file).toBe('/b.ts');
    });

    it('should handle null ruleId', () => {
      const runner = new LintRunner();
      const output = JSON.stringify([
        {
          filePath: '/test.ts',
          messages: [
            { ruleId: null, severity: 2, message: 'Parse error', line: 1, column: 1 },
          ],
          errorCount: 1,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
        },
      ]);

      const result = runner.parseJsonOutput(output);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBeUndefined();
    });

    it('should mark fixable issues with suggestion', () => {
      const runner = new LintRunner();
      const output = createEslintJsonOutput([
        {
          filePath: '/test.ts',
          messages: [
            { ruleId: 'semi', severity: 2, message: 'Missing semicolon', line: 1, column: 10, fix: true },
          ],
          fixableErrorCount: 1,
        },
      ]);

      const result = runner.parseJsonOutput(output);

      expect(result.errors[0].suggestion).toContain('auto-fixed');
    });
  });

  describe('setIteration', () => {
    it('should set iteration number on parsed errors', () => {
      const runner = new LintRunner();
      runner.setIteration(5);

      const output = createEslintJsonOutput([
        {
          filePath: '/test.ts',
          messages: [
            { ruleId: 'rule', severity: 2, message: 'Error', line: 1, column: 1 },
          ],
        },
      ]);

      const result = runner.parseJsonOutput(output);

      expect(result.errors[0].iteration).toBe(5);
    });
  });

  describe('configuration options', () => {
    it('should support autoFix config', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner({ autoFix: true });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--fix']),
        expect.any(Object)
      );
    });

    it('should support maxWarnings config', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner({ maxWarnings: 10 });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--max-warnings', '10']),
        expect.any(Object)
      );
    });

    it('should support additional arguments', async () => {
      mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

      const runner = new LintRunner({
        additionalArgs: ['--cache', '--quiet'],
      });
      await runner.run('/test/path');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['--cache', '--quiet']),
        expect.any(Object)
      );
    });
  });

  describe('factory functions', () => {
    describe('createLintRunner', () => {
      it('should create a LintRunner instance', () => {
        const runner = createLintRunner();
        expect(runner).toBeInstanceOf(LintRunner);
      });

      it('should pass config to the runner', () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

        const runner = createLintRunner({ timeout: 999999 });
        runner.run('/test');

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.any(Array),
          expect.objectContaining({ timeout: 999999 })
        );
      });
    });

    describe('createLintCallback', () => {
      it('should create a callback function directly', async () => {
        mockSpawn.mockReturnValue(createMockProcess({ exitCode: 0, stdout: '[]' }));

        const callback = createLintCallback('/test/path');
        expect(typeof callback).toBe('function');

        const result = await callback!('task-id');
        expect(result.success).toBe(true);
      });
    });
  });
});
