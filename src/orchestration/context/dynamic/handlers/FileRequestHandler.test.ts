/**
 * FileRequestHandler Tests
 *
 * Tests for the file content request handler.
 *
 * @module FileRequestHandler.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'pathe';
import { tmpdir } from 'os';

import { FileRequestHandler, createFileRequestHandler } from './FileRequestHandler';
import { ContextRequest } from '../types';

describe('FileRequestHandler', () => {
  let testDir: string;
  let handler: FileRequestHandler;

  // Helper to create a test request
  const createRequest = (
    query: string,
    options?: Partial<ContextRequest>
  ): ContextRequest => ({
    type: 'file',
    query,
    agentId: 'test-agent',
    taskId: 'test-task',
    reason: 'Testing file reading',
    timestamp: new Date(),
    ...options,
  });

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `nexus-file-handler-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create handler with test directory as project root
    handler = new FileRequestHandler({
      projectRoot: testDir,
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('canHandle', () => {
    it('should return true for "file" type', () => {
      expect(handler.canHandle('file')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(handler.canHandle('symbol')).toBe(false);
      expect(handler.canHandle('search')).toBe(false);
      expect(handler.canHandle('usages')).toBe(false);
      expect(handler.canHandle('definition')).toBe(false);
    });
  });

  describe('handle - file reading', () => {
    it('should read file contents successfully', async () => {
      // Create a test file
      const testFile = join(testDir, 'test.ts');
      const content = 'const hello = "world";\nexport { hello };';
      writeFileSync(testFile, content);

      // Request file
      const request = createRequest('test.ts');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toBe(content);
      expect(response.type).toBe('file');
      expect(response.tokenCount).toBeGreaterThan(0);
      expect(response.source).toBe(testFile);
    });

    it('should read file using relative path', async () => {
      // Create nested directory and file
      const subDir = join(testDir, 'src', 'utils');
      mkdirSync(subDir, { recursive: true });
      const testFile = join(subDir, 'helper.ts');
      const content = 'export function helper() {}';
      writeFileSync(testFile, content);

      // Request using relative path
      const request = createRequest('src/utils/helper.ts');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toBe(content);
    });

    it('should read file using absolute path', async () => {
      const testFile = join(testDir, 'absolute.ts');
      const content = 'const absolute = true;';
      writeFileSync(testFile, content);

      // Request using absolute path
      const request = createRequest(testFile);
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toBe(content);
    });

    it('should detect language from file extension', async () => {
      const tsFile = join(testDir, 'test.ts');
      writeFileSync(tsFile, 'const x = 1;');

      const request = createRequest('test.ts');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.language).toBe('typescript');
    });

    it('should include metadata about the file', async () => {
      const testFile = join(testDir, 'meta.ts');
      const content = 'const meta = "data";';
      writeFileSync(testFile, content);

      const request = createRequest('meta.ts');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.filePath).toBe(testFile);
      expect(response.metadata?.relativePath).toBe('meta.ts');
      expect(response.metadata?.fileSize).toBeGreaterThan(0);
      expect(response.metadata?.wasTruncated).toBe(false);
    });
  });

  describe('handle - error cases', () => {
    it('should return error for non-existent file', async () => {
      const request = createRequest('nonexistent.ts');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
      expect(response.content).toBe('');
    });

    it('should return error for directory path', async () => {
      const dir = join(testDir, 'subdir');
      mkdirSync(dir);

      const request = createRequest('subdir');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('directory');
    });
  });

  describe('handle - path security', () => {
    it('should reject paths outside project root by default', async () => {
      // Create a file outside the test directory
      const outsideDir = join(tmpdir(), `outside-${Date.now()}`);
      mkdirSync(outsideDir, { recursive: true });
      const outsideFile = join(outsideDir, 'secret.ts');
      writeFileSync(outsideFile, 'const secret = "password";');

      try {
        const request = createRequest(outsideFile);
        const response = await handler.handle(request);

        expect(response.success).toBe(false);
        expect(response.error).toContain('outside the project root');
      } finally {
        rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('should reject parent directory traversal', async () => {
      const request = createRequest('../../../etc/passwd');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('outside the project root');
    });

    it('should allow paths outside project when configured', async () => {
      const outsideDir = join(tmpdir(), `allowed-${Date.now()}`);
      mkdirSync(outsideDir, { recursive: true });
      const outsideFile = join(outsideDir, 'allowed.ts');
      writeFileSync(outsideFile, 'const allowed = true;');

      const permissiveHandler = new FileRequestHandler({
        projectRoot: testDir,
        allowOutsideProject: true,
      });

      try {
        const request = createRequest(outsideFile);
        const response = await permissiveHandler.handle(request);

        expect(response.success).toBe(true);
        expect(response.content).toBe('const allowed = true;');
      } finally {
        rmSync(outsideDir, { recursive: true, force: true });
      }
    });
  });

  describe('handle - truncation', () => {
    it('should truncate large files to token limit', async () => {
      // Create a large file (more than 100 tokens ~= 400 chars)
      const lines = Array(100).fill('const line = "this is a test line";').join('\n');
      const largeFile = join(testDir, 'large.ts');
      writeFileSync(largeFile, lines);

      // Request with low token limit
      const request = createRequest('large.ts', {
        options: { maxTokens: 100 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.wasTruncated).toBe(true);
      expect(response.content).toContain('[Content truncated');
      expect(response.tokenCount).toBeLessThanOrEqual(150); // Allow some overhead for truncation message
    });

    it('should not truncate files within token limit', async () => {
      const content = 'const small = "file";';
      const smallFile = join(testDir, 'small.ts');
      writeFileSync(smallFile, content);

      const request = createRequest('small.ts', {
        options: { maxTokens: 10000 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.wasTruncated).toBe(false);
      expect(response.content).toBe(content);
    });

    it('should truncate at line boundaries', async () => {
      const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
      const testFile = join(testDir, 'lines.txt');
      writeFileSync(testFile, content);

      // Token limit that should cut off partway through
      const request = createRequest('lines.txt', {
        options: { maxTokens: 5 }, // ~20 chars
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      // Should truncate at a line boundary, not mid-line
      expect(response.content).not.toMatch(/line \d$/); // Should not end with partial line
    });
  });

  describe('handle - file size limit', () => {
    it('should reject files exceeding size limit', async () => {
      // Create handler with small size limit
      const smallHandler = new FileRequestHandler({
        projectRoot: testDir,
        maxFileSize: 100, // 100 bytes max
      });

      // Create file larger than limit
      const content = 'x'.repeat(200);
      const largeFile = join(testDir, 'toolarge.ts');
      writeFileSync(largeFile, content);

      const request = createRequest('toolarge.ts');
      const response = await smallHandler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('exceeds maximum size');
    });
  });

  describe('createFileRequestHandler factory', () => {
    it('should create handler with project root', () => {
      const handler = createFileRequestHandler(testDir);
      expect(handler).toBeInstanceOf(FileRequestHandler);
      expect(handler.canHandle('file')).toBe(true);
    });

    it('should accept additional options', () => {
      const handler = createFileRequestHandler(testDir, {
        maxFileSize: 500,
        allowOutsideProject: true,
      });
      expect(handler).toBeInstanceOf(FileRequestHandler);
    });
  });
});
