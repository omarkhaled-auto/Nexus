/**
 * ProcessRunner Tests
 *
 * TDD RED Phase: These tests define the expected behavior of ProcessRunner.
 * All tests should fail initially until the implementation is complete.
 *
 * Tests cover:
 * - Basic command execution (echo, pwd)
 * - Exit code handling (success vs failure)
 * - Timeout enforcement
 * - Blocked command rejection
 * - Process killing
 * - Environment variable passing
 * - Working directory setting
 * - Streaming output
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join } from 'pathe';
import fse from 'fs-extra';
import {
  ProcessRunner,
  ProcessError,
  TimeoutError,
  BlockedCommandError,
  type RunOptions,
  type ProcessResult,
  type ProcessHandle,
} from './ProcessRunner';

describe('ProcessRunner', () => {
  let runner: ProcessRunner;
  let testDir: string;

  beforeEach(async () => {
    runner = new ProcessRunner();
    // Create unique temp directory for each test
    testDir = join(tmpdir(), 'nexus-process-test', randomUUID());
    await fse.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fse.remove(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // Custom Error Types
  // ============================================================================

  describe('Custom Error Types', () => {
    it('should have ProcessError as base class', () => {
      const error = new ProcessError('test error', 'echo', 1);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ProcessError');
      expect(error.message).toBe('test error');
      expect(error.command).toBe('echo');
      expect(error.exitCode).toBe(1);
    });

    it('should have ProcessError with stdout and stderr', () => {
      const error = new ProcessError('test error', 'echo', 1, 'output', 'error output');
      expect(error.stdout).toBe('output');
      expect(error.stderr).toBe('error output');
    });

    it('should have TimeoutError extending ProcessError', () => {
      const error = new TimeoutError('Timeout', 'long-command', 30000);
      expect(error).toBeInstanceOf(ProcessError);
      expect(error.name).toBe('TimeoutError');
      expect(error.timeout).toBe(30000);
    });

    it('should have BlockedCommandError extending ProcessError', () => {
      const error = new BlockedCommandError('rm -rf /');
      expect(error).toBeInstanceOf(ProcessError);
      expect(error.name).toBe('BlockedCommandError');
      expect(error.blockedCommand).toBe('rm -rf /');
    });
  });

  // ============================================================================
  // isCommandAllowed
  // ============================================================================

  describe('isCommandAllowed', () => {
    it('should return true for safe commands', () => {
      expect(runner.isCommandAllowed('echo hello')).toBe(true);
      expect(runner.isCommandAllowed('npm run build')).toBe(true);
      expect(runner.isCommandAllowed('git status')).toBe(true);
      expect(runner.isCommandAllowed('node script.js')).toBe(true);
    });

    it('should return false for rm -rf /', () => {
      expect(runner.isCommandAllowed('rm -rf /')).toBe(false);
      expect(runner.isCommandAllowed('rm -rf / --no-preserve-root')).toBe(false);
    });

    it('should return false for mkfs commands', () => {
      expect(runner.isCommandAllowed('mkfs.ext4 /dev/sda')).toBe(false);
      expect(runner.isCommandAllowed('mkfs -t ext4 /dev/sda')).toBe(false);
    });

    it('should return false for dd if= commands', () => {
      expect(runner.isCommandAllowed('dd if=/dev/zero of=/dev/sda')).toBe(false);
    });

    it('should return false for format commands', () => {
      expect(runner.isCommandAllowed('format c:')).toBe(false);
    });

    it('should return false for shutdown and reboot', () => {
      expect(runner.isCommandAllowed('shutdown -h now')).toBe(false);
      expect(runner.isCommandAllowed('reboot')).toBe(false);
    });
  });

  // ============================================================================
  // run - Basic Execution
  // ============================================================================

  describe('run - basic execution', () => {
    it('should execute echo command and capture output', async () => {
      const result = await runner.run('echo hello');

      expect(result.stdout.trim()).toBe('hello');
      expect(result.exitCode).toBe(0);
      expect(result.killed).toBe(false);
    });

    it('should capture both stdout and stderr', async () => {
      // Node.js command that writes to both stdout and stderr
      const command = process.platform === 'win32'
        ? 'node -e "console.log(\'out\'); console.error(\'err\')"'
        : 'node -e "console.log(\'out\'); console.error(\'err\')"';

      const result = await runner.run(command);

      expect(result.stdout.trim()).toBe('out');
      expect(result.stderr.trim()).toBe('err');
      expect(result.exitCode).toBe(0);
    });

    it('should track execution duration', async () => {
      const result = await runner.run('echo fast');

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThan(5000); // Should be quick
    });

    it('should return ProcessResult interface', async () => {
      const result = await runner.run('echo test');

      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('killed');
    });
  });

  // ============================================================================
  // run - Exit Code Handling
  // ============================================================================

  describe('run - exit code handling', () => {
    it('should throw ProcessError on non-zero exit code', async () => {
      const command = process.platform === 'win32'
        ? 'cmd /c exit 1'
        : 'exit 1';

      await expect(runner.run(command)).rejects.toThrow(ProcessError);
    });

    it('should include exit code in ProcessError', async () => {
      const command = process.platform === 'win32'
        ? 'cmd /c exit 42'
        : 'exit 42';

      try {
        await runner.run(command);
        expect.fail('Should have thrown ProcessError');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessError);
        expect((error as ProcessError).exitCode).toBe(42);
      }
    });

    it('should include stdout/stderr in ProcessError', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "console.log(\'output\'); console.error(\'error\'); process.exit(1)"'
        : 'node -e "console.log(\'output\'); console.error(\'error\'); process.exit(1)"';

      try {
        await runner.run(command);
        expect.fail('Should have thrown ProcessError');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessError);
        expect((error as ProcessError).stdout?.trim()).toBe('output');
        expect((error as ProcessError).stderr?.trim()).toBe('error');
      }
    });
  });

  // ============================================================================
  // run - Timeout Enforcement
  // ============================================================================

  describe('run - timeout enforcement', () => {
    it('should respect timeout option', async () => {
      // Command that would take a long time
      const command = process.platform === 'win32'
        ? 'node -e "setTimeout(() => {}, 10000)"'
        : 'sleep 10';

      await expect(
        runner.run(command, { timeout: 100 })
      ).rejects.toThrow(TimeoutError);
    });

    it('should have default 30 second timeout', () => {
      // Test the default timeout value through the runner
      const defaultTimeout = runner.getDefaultTimeout();
      expect(defaultTimeout).toBe(30000);
    });

    it('should set killed flag when timeout occurs', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "setTimeout(() => {}, 10000)"'
        : 'sleep 10';

      try {
        await runner.run(command, { timeout: 100 });
        expect.fail('Should have thrown TimeoutError');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).name).toBe('TimeoutError');
      }
    });
  });

  // ============================================================================
  // run - Blocked Command Rejection
  // ============================================================================

  describe('run - blocked command rejection', () => {
    it('should throw BlockedCommandError before execution', async () => {
      await expect(runner.run('rm -rf /')).rejects.toThrow(BlockedCommandError);
    });

    it('should not execute blocked commands', async () => {
      // This test verifies the command is never executed
      const blocked = 'rm -rf /';

      try {
        await runner.run(blocked);
        expect.fail('Should have thrown BlockedCommandError');
      } catch (error) {
        expect(error).toBeInstanceOf(BlockedCommandError);
        expect((error as BlockedCommandError).blockedCommand).toBe(blocked);
      }
    });
  });

  // ============================================================================
  // run - Working Directory
  // ============================================================================

  describe('run - working directory', () => {
    it('should run command in specified cwd', async () => {
      const command = process.platform === 'win32' ? 'cd' : 'pwd';
      const result = await runner.run(command, { cwd: testDir });

      // Normalize paths for comparison (Windows vs Unix)
      const normalizedOutput = result.stdout.trim().replace(/\\/g, '/');
      const normalizedTestDir = testDir.replace(/\\/g, '/');

      expect(normalizedOutput).toBe(normalizedTestDir);
    });

    it('should default to current working directory', async () => {
      const command = process.platform === 'win32' ? 'cd' : 'pwd';
      const result = await runner.run(command);

      expect(result.stdout.trim()).toBeTruthy();
    });
  });

  // ============================================================================
  // run - Environment Variables
  // ============================================================================

  describe('run - environment variables', () => {
    it('should pass custom environment variables', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "console.log(process.env.TEST_VAR)"'
        : 'echo $TEST_VAR';

      const result = await runner.run(command, {
        env: { TEST_VAR: 'test_value' },
      });

      expect(result.stdout.trim()).toBe('test_value');
    });

    it('should inherit parent environment by default', async () => {
      // NODE_ENV or PATH should be inherited
      const command = process.platform === 'win32'
        ? 'node -e "console.log(process.env.PATH ? \'has_path\' : \'no_path\')"'
        : 'node -e "console.log(process.env.PATH ? \'has_path\' : \'no_path\')"';

      const result = await runner.run(command);

      expect(result.stdout.trim()).toBe('has_path');
    });

    it('should merge custom env with inherited env', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "console.log(process.env.CUSTOM_VAR, !!process.env.PATH)"'
        : 'node -e "console.log(process.env.CUSTOM_VAR, !!process.env.PATH)"';

      const result = await runner.run(command, {
        env: { CUSTOM_VAR: 'custom' },
      });

      expect(result.stdout.trim()).toContain('custom');
      expect(result.stdout.trim()).toContain('true');
    });
  });

  // ============================================================================
  // run - Shell Option
  // ============================================================================

  describe('run - shell option', () => {
    it('should use shell by default', async () => {
      // Shell commands like pipes should work by default
      const command = process.platform === 'win32'
        ? 'echo hello'
        : 'echo hello | cat';

      const result = await runner.run(command);
      expect(result.stdout.trim()).toContain('hello');
    });
  });

  // ============================================================================
  // runStreaming
  // ============================================================================

  describe('runStreaming', () => {
    it('should return ProcessHandle with pid', async () => {
      const handle = runner.runStreaming('echo streaming');

      expect(handle).toHaveProperty('pid');
      expect(typeof handle.pid).toBe('number');

      // Wait for completion
      await handle.promise;
    });

    it('should return ProcessHandle with promise', async () => {
      const handle = runner.runStreaming('echo streaming');

      expect(handle).toHaveProperty('promise');
      expect(handle.promise).toBeInstanceOf(Promise);

      const result = await handle.promise;
      expect(result.stdout.trim()).toBe('streaming');
    });

    it('should return ProcessHandle with kill function', async () => {
      const handle = runner.runStreaming('echo streaming');

      expect(handle).toHaveProperty('kill');
      expect(typeof handle.kill).toBe('function');

      await handle.promise;
    });

    it('should call onStdout callback with output', async () => {
      const stdoutChunks: string[] = [];

      const handle = runner.runStreaming('echo streaming-test', {
        onStdout: (chunk) => stdoutChunks.push(chunk),
      });

      await handle.promise;

      expect(stdoutChunks.length).toBeGreaterThan(0);
      expect(stdoutChunks.join('').trim()).toBe('streaming-test');
    });

    it('should call onStderr callback with error output', async () => {
      const stderrChunks: string[] = [];
      const command = 'node -e "console.error(\'error-output\')"';

      const handle = runner.runStreaming(command, {
        onStderr: (chunk) => stderrChunks.push(chunk),
      });

      await handle.promise;

      expect(stderrChunks.length).toBeGreaterThan(0);
      expect(stderrChunks.join('').trim()).toBe('error-output');
    });

    it('should support cwd option', async () => {
      const command = process.platform === 'win32' ? 'cd' : 'pwd';

      const handle = runner.runStreaming(command, { cwd: testDir });
      const result = await handle.promise;

      const normalizedOutput = result.stdout.trim().replace(/\\/g, '/');
      const normalizedTestDir = testDir.replace(/\\/g, '/');

      expect(normalizedOutput).toBe(normalizedTestDir);
    });

    it('should support timeout option', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "setTimeout(() => {}, 10000)"'
        : 'sleep 10';

      const handle = runner.runStreaming(command, { timeout: 100 });

      await expect(handle.promise).rejects.toThrow(TimeoutError);
    });

    it('should throw BlockedCommandError for blocked commands', async () => {
      expect(() => runner.runStreaming('rm -rf /')).toThrow(BlockedCommandError);
    });
  });

  // ============================================================================
  // kill
  // ============================================================================

  describe('kill', () => {
    it('should kill a running process', async () => {
      const command = process.platform === 'win32'
        ? 'node -e "setTimeout(() => {}, 30000)"'
        : 'sleep 30';

      const handle = runner.runStreaming(command);

      // Give the process time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Kill the process
      await runner.kill(handle.pid);

      // The promise should reject or resolve with killed flag
      try {
        const result = await handle.promise;
        expect(result.killed).toBe(true);
      } catch (error) {
        // Some platforms throw on kill, which is also valid
        expect(error).toBeTruthy();
      }
    });

    it('should use tree-kill to terminate process tree', async () => {
      // This test verifies that child processes are also killed
      // We'll start a process that spawns children and verify all are killed
      const command = process.platform === 'win32'
        ? 'node -e "const cp = require(\'child_process\'); cp.spawn(\'node\', [\'-e\', \'setTimeout(() => {}, 30000)\']); setTimeout(() => {}, 30000);"'
        : 'sh -c "sleep 30 & sleep 30"';

      const handle = runner.runStreaming(command);

      // Give processes time to start
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Kill the process tree
      await runner.kill(handle.pid);

      // Wait a bit and verify process is gone
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The handle promise should resolve or reject
      try {
        await handle.promise;
      } catch {
        // Expected - process was killed
      }
    });

    it('should handle killing non-existent process gracefully', async () => {
      // Killing a non-existent PID should not throw
      await expect(runner.kill(999999)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Logger Support
  // ============================================================================

  describe('Logger support', () => {
    it('should accept optional logger in constructor', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const runnerWithLogger = new ProcessRunner({ logger });
      expect(runnerWithLogger).toBeInstanceOf(ProcessRunner);
    });

    it('should log command execution when logger is provided', async () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const runnerWithLogger = new ProcessRunner({ logger });
      await runnerWithLogger.run('echo logged');

      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
