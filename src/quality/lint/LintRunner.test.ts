// LintRunner Tests
// Phase 03-03: Quality Verification Layer - TDD RED Phase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LintRunner, LintError, LintConfigError } from './LintRunner';
import type { ProcessRunner, ProcessResult } from '@/infrastructure/process/ProcessRunner';

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

// ESLint JSON output format (array of file results)
function createEslintOutput(
  results: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string;
      severity: number; // 1 = warning, 2 = error
      message: string;
      line: number;
      column: number;
    }>;
    errorCount: number;
    warningCount: number;
  }>
): string {
  return JSON.stringify(results);
}

// ============================================================================
// LintRunner Tests
// ============================================================================

describe('LintRunner', () => {
  let processRunner: ProcessRunner;
  let runner: LintRunner;

  beforeEach(() => {
    processRunner = createMockProcessRunner();
    runner = new LintRunner({ processRunner });
  });

  describe('constructor', () => {
    it('should accept processRunner', () => {
      const runner = new LintRunner({ processRunner });
      expect(runner).toBeDefined();
    });

    it('should accept optional eslintPath', () => {
      const runner = new LintRunner({
        processRunner,
        eslintPath: 'custom-eslint',
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
      const runner = new LintRunner({ processRunner, logger });
      expect(runner).toBeDefined();
    });
  });

  describe('run', () => {
    it('should return success for clean code', async () => {
      const eslintOutput = createEslintOutput([
        {
          filePath: '/path/to/file.ts',
          messages: [],
          errorCount: 0,
          warningCount: 0,
        },
      ]);

      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: eslintOutput, exitCode: 0 })
      );

      const result = await runner.run('/path/to/project');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should run eslint with JSON format', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      await runner.run('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('--format json'),
        expect.objectContaining({ cwd: '/path/to/project' })
      );
    });

    it('should use custom eslintPath if provided', async () => {
      const customRunner = new LintRunner({
        processRunner,
        eslintPath: './node_modules/.bin/eslint',
      });
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      await customRunner.run('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('./node_modules/.bin/eslint'),
        expect.any(Object)
      );
    });

    it('should return errors for lint errors', async () => {
      const eslintOutput = createEslintOutput([
        {
          filePath: '/path/to/file.ts',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: "'x' is defined but never used",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: eslintOutput,
        stderr: '',
      });

      const result = await runner.run('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          type: 'lint',
          file: '/path/to/file.ts',
          line: 10,
          column: 5,
          message: expect.stringContaining("'x' is defined but never used"),
          code: 'no-unused-vars',
        })
      );
    });

    it('should return warnings separately from errors', async () => {
      const eslintOutput = createEslintOutput([
        {
          filePath: '/path/to/file.ts',
          messages: [
            {
              ruleId: 'prefer-const',
              severity: 1,
              message: "'x' is never reassigned",
              line: 5,
              column: 3,
            },
          ],
          errorCount: 0,
          warningCount: 1,
        },
      ]);

      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: eslintOutput, exitCode: 0 })
      );

      const result = await runner.run('/path/to/project');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual(
        expect.objectContaining({
          type: 'lint',
          file: '/path/to/file.ts',
          line: 5,
          message: expect.stringContaining("'x' is never reassigned"),
        })
      );
    });

    it('should lint specific files when provided', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      await runner.run('/path/to/project', ['src/a.ts', 'src/b.ts']);

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('src/a.ts'),
        expect.any(Object)
      );
      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('src/b.ts'),
        expect.any(Object)
      );
    });

    it('should handle multiple files with errors', async () => {
      const eslintOutput = createEslintOutput([
        {
          filePath: '/path/to/a.ts',
          messages: [
            {
              ruleId: 'no-console',
              severity: 2,
              message: 'Unexpected console statement',
              line: 1,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
        {
          filePath: '/path/to/b.ts',
          messages: [
            {
              ruleId: 'no-debugger',
              severity: 2,
              message: 'Unexpected debugger statement',
              line: 5,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: eslintOutput,
        stderr: '',
      });

      const result = await runner.run('/path/to/project');

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].file).toBe('/path/to/a.ts');
      expect(result.errors[1].file).toBe('/path/to/b.ts');
    });

    it('should throw LintConfigError for missing config', async () => {
      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 2,
        stdout: '',
        stderr: 'Error: No ESLint configuration found',
      });

      await expect(runner.run('/path/to/project')).rejects.toThrow(LintConfigError);
    });

    it('should track duration', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', duration: 500 })
      );

      const result = await runner.run('/path/to/project');

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runWithFix', () => {
    it('should run eslint with --fix flag', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      await runner.runWithFix('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('--fix'),
        expect.any(Object)
      );
    });

    it('should return success after fixing issues', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      const result = await runner.runWithFix('/path/to/project');

      expect(result.success).toBe(true);
    });

    it('should fix specific files when provided', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '[]', exitCode: 0 })
      );

      await runner.runWithFix('/path/to/project', ['src/file.ts']);

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('src/file.ts'),
        expect.any(Object)
      );
    });

    it('should return remaining errors that cannot be auto-fixed', async () => {
      const eslintOutput = createEslintOutput([
        {
          filePath: '/path/to/file.ts',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: "'x' is defined but never used",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: eslintOutput,
        stderr: '',
      });

      const result = await runner.runWithFix('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseOutput', () => {
    it('should parse valid JSON output', () => {
      const output = createEslintOutput([
        {
          filePath: '/file.ts',
          messages: [
            {
              ruleId: 'rule',
              severity: 2,
              message: 'Error message',
              line: 1,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);

      const errors = runner.parseOutput(output);

      expect(errors).toHaveLength(1);
    });

    it('should return empty array for empty output', () => {
      const errors = runner.parseOutput('[]');

      expect(errors).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const errors = runner.parseOutput('not valid json');

      expect(errors).toHaveLength(0);
    });
  });

  describe('error types', () => {
    it('should have LintError class', () => {
      const error = new LintError('Lint failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LintError');
      expect(error.message).toBe('Lint failed');
    });

    it('should have LintConfigError class', () => {
      const error = new LintConfigError('Invalid config');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LintConfigError');
      expect(error.message).toBe('Invalid config');
    });
  });
});
