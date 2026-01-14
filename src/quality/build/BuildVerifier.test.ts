// BuildVerifier Tests
// Phase 03-03: Quality Verification Layer - TDD RED Phase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuildVerifier, BuildError, ConfigError } from './BuildVerifier';
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

// ============================================================================
// BuildVerifier Tests
// ============================================================================

describe('BuildVerifier', () => {
  let processRunner: ProcessRunner;
  let verifier: BuildVerifier;

  beforeEach(() => {
    processRunner = createMockProcessRunner();
    verifier = new BuildVerifier({ processRunner });
  });

  describe('constructor', () => {
    it('should accept processRunner', () => {
      const verifier = new BuildVerifier({ processRunner });
      expect(verifier).toBeDefined();
    });

    it('should accept optional tscPath', () => {
      const verifier = new BuildVerifier({
        processRunner,
        tscPath: 'custom-tsc',
      });
      expect(verifier).toBeDefined();
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const verifier = new BuildVerifier({ processRunner, logger });
      expect(verifier).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should return success for clean build', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ stdout: '', stderr: '', exitCode: 0 })
      );

      const result = await verifier.verify('/path/to/project');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should run tsc --noEmit in the workdir', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(createProcessResult());

      await verifier.verify('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('tsc'),
        expect.objectContaining({ cwd: '/path/to/project' })
      );
    });

    it('should use custom tscPath if provided', async () => {
      const customVerifier = new BuildVerifier({
        processRunner,
        tscPath: './node_modules/.bin/tsc',
      });
      vi.mocked(processRunner.run).mockResolvedValue(createProcessResult());

      await customVerifier.verify('/path/to/project');

      expect(processRunner.run).toHaveBeenCalledWith(
        expect.stringContaining('./node_modules/.bin/tsc'),
        expect.any(Object)
      );
    });

    it('should return errors for TypeScript compilation errors', async () => {
      const tscOutput = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: tscOutput,
        stderr: '',
      });

      const result = await verifier.verify('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          type: 'build',
          file: 'src/index.ts',
          line: 10,
          column: 5,
          message: expect.stringContaining('Type \'string\' is not assignable to type \'number\''),
          code: 'TS2322',
        })
      );
    });

    it('should parse multiple TypeScript errors', async () => {
      const tscOutput = `src/a.ts(1,1): error TS2304: Cannot find name 'foo'.
src/b.ts(5,10): error TS2339: Property 'bar' does not exist on type 'object'.`;

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: tscOutput,
        stderr: '',
      });

      const result = await verifier.verify('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].file).toBe('src/a.ts');
      expect(result.errors[1].file).toBe('src/b.ts');
    });

    it('should handle errors in stderr', async () => {
      const tscError = `src/index.ts(1,1): error TS1005: ';' expected.`;

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: '',
        stderr: tscError,
      });

      const result = await verifier.verify('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should throw ConfigError for missing tsconfig', async () => {
      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'error TS5058: The specified path does not exist: \'tsconfig.json\'.',
      });

      await expect(verifier.verify('/path/to/project')).rejects.toThrow(ConfigError);
    });

    it('should throw ConfigError for invalid tsconfig', async () => {
      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'error TS5023: Unknown compiler option \'invalidOption\'.',
      });

      await expect(verifier.verify('/path/to/project')).rejects.toThrow(ConfigError);
    });

    it('should parse errors without column number', async () => {
      const tscOutput = `src/index.ts(10): error TS2322: Type error.`;

      vi.mocked(processRunner.run).mockRejectedValue({
        exitCode: 1,
        stdout: tscOutput,
        stderr: '',
      });

      const result = await verifier.verify('/path/to/project');

      expect(result.success).toBe(false);
      expect(result.errors[0].line).toBe(10);
      expect(result.errors[0].column).toBeUndefined();
    });

    it('should track duration', async () => {
      vi.mocked(processRunner.run).mockResolvedValue(
        createProcessResult({ duration: 500 })
      );

      const result = await verifier.verify('/path/to/project');

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parseErrors', () => {
    it('should parse standard tsc error format', () => {
      const output = `src/file.ts(10,5): error TS2322: Some error message`;

      const errors = verifier.parseErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        type: 'build',
        file: 'src/file.ts',
        line: 10,
        column: 5,
        message: 'Some error message',
        code: 'TS2322',
      });
    });

    it('should parse esbuild error format', () => {
      const output = `X [ERROR] Cannot find module 'missing'

    src/index.ts:15:0:
      15 | import { foo } from 'missing'
         ~
`;

      const errors = verifier.parseErrors(output);

      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].type).toBe('build');
    });

    it('should return empty array for no errors', () => {
      const output = '';

      const errors = verifier.parseErrors(output);

      expect(errors).toHaveLength(0);
    });

    it('should handle Windows-style paths', () => {
      const output = `src\\file.ts(10,5): error TS2322: Some error`;

      const errors = verifier.parseErrors(output);

      expect(errors).toHaveLength(1);
      // Should normalize to forward slashes
      expect(errors[0].file).toBe('src/file.ts');
    });
  });

  describe('error types', () => {
    it('should have BuildError class', () => {
      const error = new BuildError('Build failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('BuildError');
      expect(error.message).toBe('Build failed');
    });

    it('should have ConfigError class', () => {
      const error = new ConfigError('Invalid config');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConfigError');
      expect(error.message).toBe('Invalid config');
    });
  });
});
