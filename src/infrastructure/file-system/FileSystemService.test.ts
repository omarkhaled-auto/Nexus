/**
 * FileSystemService Tests
 *
 * TDD RED Phase: These tests define the expected behavior of FileSystemService.
 * All tests should fail initially until the implementation is complete.
 *
 * Tests cover:
 * - Basic read/write operations
 * - Non-existent file handling
 * - Directory operations
 * - Glob patterns
 * - Watch subscription/disposal
 * - Cross-platform path normalization
 * - Error handling with custom error types
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  FileSystemService,
  FileNotFoundError,
  WriteError,
  GlobError,
  FileSystemError,
} from './FileSystemService';

describe('FileSystemService', () => {
  let fs: FileSystemService;
  let testDir: string;

  beforeEach(async () => {
    fs = new FileSystemService();
    // Create unique temp directory for each test
    testDir = join(tmpdir(), 'nexus-test', randomUUID());
    await fs.mkdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.remove(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Custom Error Types', () => {
    it('should have FileSystemError as base class', () => {
      const error = new FileSystemError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FileSystemError');
      expect(error.message).toBe('test error');
    });

    it('should have FileNotFoundError with path property', () => {
      const error = new FileNotFoundError('/some/path');
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.name).toBe('FileNotFoundError');
      expect(error.path).toBe('/some/path');
      expect(error.message).toContain('/some/path');
    });

    it('should have WriteError with path and reason', () => {
      const error = new WriteError('/some/path', 'permission denied');
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.name).toBe('WriteError');
      expect(error.path).toBe('/some/path');
      expect(error.reason).toBe('permission denied');
    });

    it('should have GlobError with pattern property', () => {
      const error = new GlobError('**/*.ts', 'invalid pattern');
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.name).toBe('GlobError');
      expect(error.pattern).toBe('**/*.ts');
    });
  });

  describe('readFile', () => {
    it('should read text file contents', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should read file with UTF-8 encoding', async () => {
      const filePath = join(testDir, 'unicode.txt');
      const content = 'Unicode: \u4F60\u597D \uD83D\uDE80';
      await fs.writeFile(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should throw FileNotFoundError for non-existent file', async () => {
      const filePath = join(testDir, 'does-not-exist.txt');

      await expect(fs.readFile(filePath)).rejects.toThrow(FileNotFoundError);
      await expect(fs.readFile(filePath)).rejects.toMatchObject({
        path: filePath,
      });
    });
  });

  describe('readFileBuffer', () => {
    it('should read file as Buffer', async () => {
      const filePath = join(testDir, 'binary.bin');
      const content = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      await fs.writeFile(filePath, content);

      const result = await fs.readFileBuffer(filePath);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(content);
    });

    it('should throw FileNotFoundError for non-existent file', async () => {
      const filePath = join(testDir, 'does-not-exist.bin');

      await expect(fs.readFileBuffer(filePath)).rejects.toThrow(FileNotFoundError);
    });
  });

  describe('writeFile', () => {
    it('should write string content to file', async () => {
      const filePath = join(testDir, 'output.txt');
      const content = 'Test content';

      await fs.writeFile(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should write Buffer content to file', async () => {
      const filePath = join(testDir, 'output.bin');
      const content = Buffer.from([0xde, 0xad, 0xbe, 0xef]);

      await fs.writeFile(filePath, content);

      const result = await fs.readFileBuffer(filePath);
      expect(result).toEqual(content);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = join(testDir, 'deep', 'nested', 'dir', 'file.txt');
      const content = 'Nested content';

      await fs.writeFile(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = join(testDir, 'overwrite.txt');
      await fs.writeFile(filePath, 'Original');
      await fs.writeFile(filePath, 'Updated');

      const result = await fs.readFile(filePath);
      expect(result).toBe('Updated');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fs.exists(filePath);
      expect(result).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = join(testDir, 'exists-dir');
      await fs.mkdir(dirPath);

      const result = await fs.exists(dirPath);
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const filePath = join(testDir, 'does-not-exist.txt');

      const result = await fs.exists(filePath);
      expect(result).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', async () => {
      const dirPath = join(testDir, 'a-directory');
      await fs.mkdir(dirPath);

      const result = await fs.isDirectory(dirPath);
      expect(result).toBe(true);
    });

    it('should return false for file', async () => {
      const filePath = join(testDir, 'a-file.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fs.isDirectory(filePath);
      expect(result).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      const path = join(testDir, 'does-not-exist');

      const result = await fs.isDirectory(path);
      expect(result).toBe(false);
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      const dirPath = join(testDir, 'new-dir');

      await fs.mkdir(dirPath);

      const exists = await fs.isDirectory(dirPath);
      expect(exists).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const dirPath = join(testDir, 'a', 'b', 'c', 'd');

      await fs.mkdir(dirPath);

      const exists = await fs.isDirectory(dirPath);
      expect(exists).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = join(testDir, 'existing-dir');
      await fs.mkdir(dirPath);

      await expect(fs.mkdir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove file', async () => {
      const filePath = join(testDir, 'to-delete.txt');
      await fs.writeFile(filePath, 'content');

      await fs.remove(filePath);

      const exists = await fs.exists(filePath);
      expect(exists).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const dirPath = join(testDir, 'dir-to-delete');
      await fs.mkdir(join(dirPath, 'nested'));
      await fs.writeFile(join(dirPath, 'file.txt'), 'content');
      await fs.writeFile(join(dirPath, 'nested', 'deep.txt'), 'deep');

      await fs.remove(dirPath);

      const exists = await fs.exists(dirPath);
      expect(exists).toBe(false);
    });

    it('should not throw if path does not exist', async () => {
      const filePath = join(testDir, 'non-existent.txt');

      await expect(fs.remove(filePath)).resolves.not.toThrow();
    });
  });

  describe('copy', () => {
    it('should copy file', async () => {
      const srcPath = join(testDir, 'source.txt');
      const destPath = join(testDir, 'destination.txt');
      await fs.writeFile(srcPath, 'copy me');

      await fs.copy(srcPath, destPath);

      const content = await fs.readFile(destPath);
      expect(content).toBe('copy me');
    });

    it('should copy directory recursively', async () => {
      const srcDir = join(testDir, 'src-dir');
      const destDir = join(testDir, 'dest-dir');
      await fs.mkdir(join(srcDir, 'nested'));
      await fs.writeFile(join(srcDir, 'file.txt'), 'content');
      await fs.writeFile(join(srcDir, 'nested', 'deep.txt'), 'deep');

      await fs.copy(srcDir, destDir);

      const file1 = await fs.readFile(join(destDir, 'file.txt'));
      const file2 = await fs.readFile(join(destDir, 'nested', 'deep.txt'));
      expect(file1).toBe('content');
      expect(file2).toBe('deep');
    });

    it('should create parent directories for destination', async () => {
      const srcPath = join(testDir, 'src.txt');
      const destPath = join(testDir, 'deep', 'nested', 'dest.txt');
      await fs.writeFile(srcPath, 'content');

      await fs.copy(srcPath, destPath);

      const content = await fs.readFile(destPath);
      expect(content).toBe('content');
    });
  });

  describe('move', () => {
    it('should move file', async () => {
      const srcPath = join(testDir, 'source.txt');
      const destPath = join(testDir, 'destination.txt');
      await fs.writeFile(srcPath, 'move me');

      await fs.move(srcPath, destPath);

      const content = await fs.readFile(destPath);
      expect(content).toBe('move me');
      const srcExists = await fs.exists(srcPath);
      expect(srcExists).toBe(false);
    });

    it('should move directory', async () => {
      const srcDir = join(testDir, 'src-dir');
      const destDir = join(testDir, 'dest-dir');
      await fs.mkdir(srcDir);
      await fs.writeFile(join(srcDir, 'file.txt'), 'content');

      await fs.move(srcDir, destDir);

      const content = await fs.readFile(join(destDir, 'file.txt'));
      expect(content).toBe('content');
      const srcExists = await fs.exists(srcDir);
      expect(srcExists).toBe(false);
    });

    it('should create parent directories for destination', async () => {
      const srcPath = join(testDir, 'src.txt');
      const destPath = join(testDir, 'new', 'nested', 'dest.txt');
      await fs.writeFile(srcPath, 'content');

      await fs.move(srcPath, destPath);

      const content = await fs.readFile(destPath);
      expect(content).toBe('content');
    });
  });

  describe('glob', () => {
    beforeEach(async () => {
      // Create a file structure for glob tests
      await fs.mkdir(join(testDir, 'glob-test', 'src'));
      await fs.mkdir(join(testDir, 'glob-test', 'lib'));
      await fs.writeFile(join(testDir, 'glob-test', 'index.ts'), 'export {};');
      await fs.writeFile(join(testDir, 'glob-test', 'src', 'main.ts'), 'main');
      await fs.writeFile(join(testDir, 'glob-test', 'src', 'util.ts'), 'util');
      await fs.writeFile(join(testDir, 'glob-test', 'src', 'style.css'), 'css');
      await fs.writeFile(join(testDir, 'glob-test', 'lib', 'helper.ts'), 'helper');
    });

    it('should match files with glob pattern', async () => {
      const results = await fs.glob('**/*.ts', { cwd: join(testDir, 'glob-test') });

      expect(results).toHaveLength(4);
      expect(results.some(f => f.endsWith('index.ts'))).toBe(true);
      expect(results.some(f => f.endsWith('main.ts'))).toBe(true);
      expect(results.some(f => f.endsWith('util.ts'))).toBe(true);
      expect(results.some(f => f.endsWith('helper.ts'))).toBe(true);
    });

    it('should match files in specific directory', async () => {
      const results = await fs.glob('src/*.ts', { cwd: join(testDir, 'glob-test') });

      expect(results).toHaveLength(2);
      expect(results.some(f => f.includes('main.ts'))).toBe(true);
      expect(results.some(f => f.includes('util.ts'))).toBe(true);
    });

    it('should support ignore patterns', async () => {
      const results = await fs.glob('**/*.ts', {
        cwd: join(testDir, 'glob-test'),
        ignore: ['**/lib/**'],
      });

      expect(results).toHaveLength(3);
      expect(results.every(f => !f.includes('helper.ts'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const results = await fs.glob('**/*.xyz', { cwd: join(testDir, 'glob-test') });

      expect(results).toEqual([]);
    });

    it('should return absolute paths when absolute option is true', async () => {
      const results = await fs.glob('**/*.ts', {
        cwd: join(testDir, 'glob-test'),
        absolute: true,
      });

      // Check for absolute paths (cross-platform: / on Unix, C:\ on Windows)
      const isAbsolute = (p: string) => p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p);
      expect(results.every(isAbsolute)).toBe(true);
    });
  });

  describe('watch', () => {
    it('should detect file creation', async () => {
      const watchDir = join(testDir, 'watch-test');
      await fs.mkdir(watchDir);
      const events: Array<{ type: string; path: string }> = [];

      const dispose = fs.watch(watchDir, (event) => {
        events.push(event);
      });

      // Wait for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create a file
      await fs.writeFile(join(watchDir, 'new-file.txt'), 'content');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 200));

      dispose();

      expect(events.some(e => e.type === 'add' && e.path.includes('new-file.txt'))).toBe(true);
    });

    it('should detect file changes', async () => {
      const watchDir = join(testDir, 'watch-change');
      await fs.mkdir(watchDir);
      const filePath = join(watchDir, 'file.txt');
      await fs.writeFile(filePath, 'initial');
      const events: Array<{ type: string; path: string }> = [];

      const dispose = fs.watch(watchDir, (event) => {
        events.push(event);
      });

      // Wait for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Modify the file
      await fs.writeFile(filePath, 'modified');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 200));

      dispose();

      expect(events.some(e => e.type === 'change' && e.path.includes('file.txt'))).toBe(true);
    });

    it('should detect file deletion', async () => {
      const watchDir = join(testDir, 'watch-delete');
      await fs.mkdir(watchDir);
      const filePath = join(watchDir, 'to-delete.txt');
      await fs.writeFile(filePath, 'delete me');
      const events: Array<{ type: string; path: string }> = [];

      const dispose = fs.watch(watchDir, (event) => {
        events.push(event);
      });

      // Wait for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Delete the file
      await fs.remove(filePath);

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 200));

      dispose();

      expect(events.some(e => e.type === 'unlink' && e.path.includes('to-delete.txt'))).toBe(true);
    });

    it('should stop watching after dispose is called', async () => {
      const watchDir = join(testDir, 'watch-dispose');
      await fs.mkdir(watchDir);
      const events: Array<{ type: string; path: string }> = [];

      const dispose = fs.watch(watchDir, (event) => {
        events.push(event);
      });

      // Wait for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dispose immediately
      dispose();

      // Create file after dispose
      await fs.writeFile(join(watchDir, 'after-dispose.txt'), 'content');

      // Wait to confirm no events
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(events.filter(e => e.path.includes('after-dispose.txt'))).toHaveLength(0);
    });
  });

  describe('Cross-platform path handling', () => {
    it('should normalize Windows-style paths', async () => {
      // This tests that paths work regardless of platform
      const filePath = join(testDir, 'cross-platform.txt');
      await fs.writeFile(filePath, 'content');

      // Reading with normalized path should work
      const content = await fs.readFile(filePath);
      expect(content).toBe('content');
    });

    it('should handle paths with special characters', async () => {
      const fileName = 'file with spaces.txt';
      const filePath = join(testDir, fileName);
      await fs.writeFile(filePath, 'content with spaces');

      const content = await fs.readFile(filePath);
      expect(content).toBe('content with spaces');
    });
  });

  describe('Logger support', () => {
    it('should accept optional logger in constructor', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const fsWithLogger = new FileSystemService({ logger });
      expect(fsWithLogger).toBeInstanceOf(FileSystemService);
    });
  });
});
