/**
 * Project Handlers Tests
 * Phase 21 Task 5 & 6: Tests for project initialization and loading IPC handlers
 *
 * Tests cover:
 * - Handler registration
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Electron modules before importing the handler
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

// Mock ProjectInitializer
vi.mock('../../../../src/main/services/ProjectInitializer', () => ({
  projectInitializer: {
    initializeProject: vi.fn(),
  },
}));

// Mock ProjectLoader (Phase 21 Task 6)
vi.mock('../../../../src/main/services/ProjectLoader', () => ({
  projectLoader: {
    loadProject: vi.fn(),
  },
}));

import { registerProjectHandlers } from '../../../../src/main/ipc/projectHandlers';
import { ipcMain } from 'electron';
import { projectInitializer } from '../../../../src/main/services/ProjectInitializer';

describe('Project Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerProjectHandlers', () => {
    it('should register all project IPC handlers', () => {
      registerProjectHandlers();

      // Verify all handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'project:initialize',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'project:load',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'project:validatePath',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'project:isPathEmpty',
        expect.any(Function)
      );

      // Verify exactly 4 handlers were registered (initialize, load, validatePath, isPathEmpty)
      expect(ipcMain.handle).toHaveBeenCalledTimes(4);
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        registerProjectHandlers();
      }).not.toThrow();
    });
  });

  describe('project:initialize handler', () => {
    let initializeHandler: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      registerProjectHandlers();
      // Get the handler function that was registered
      const calls = vi.mocked(ipcMain.handle).mock.calls;
      const initCall = calls.find((call) => call[0] === 'project:initialize');
      initializeHandler = initCall?.[1] as (...args: unknown[]) => Promise<unknown>;
    });

    it('should call projectInitializer.initializeProject with sanitized options', async () => {
      const mockProject = {
        id: 'proj_123',
        name: 'test-project',
        path: '/test/path/test-project',
        createdAt: new Date(),
      };
      vi.mocked(projectInitializer.initializeProject).mockResolvedValue(mockProject);

      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await initializeHandler(mockEvent, {
        name: 'test-project',
        path: '/test/path',
        description: 'Test desc',
        initGit: true,
      }) as { success: boolean; data?: unknown };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(projectInitializer.initializeProject).toHaveBeenCalledWith({
        name: 'test-project',
        path: '/test/path',
        description: 'Test desc',
        initGit: true,
      });
    });

    it('should sanitize project name by removing invalid characters', async () => {
      const mockProject = {
        id: 'proj_123',
        name: 'test-project',
        path: '/test/path/test-project',
        createdAt: new Date(),
      };
      vi.mocked(projectInitializer.initializeProject).mockResolvedValue(mockProject);

      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      await initializeHandler(mockEvent, {
        name: 'test<>:project',
        path: '/test/path',
      });

      expect(projectInitializer.initializeProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test---project',
        })
      );
    });

    it('should return error for missing project name', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await initializeHandler(mockEvent, {
        path: '/test/path',
      }) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project name is required');
    });

    it('should return error for missing project path', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await initializeHandler(mockEvent, {
        name: 'test-project',
      }) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project path is required');
    });

    it('should return error for empty project name after sanitization', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await initializeHandler(mockEvent, {
        name: '   ',
        path: '/test/path',
      }) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid project name');
    });

    it('should return error for unauthorized sender', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'https://malicious-site.com',
        },
      };

      const result = await initializeHandler(mockEvent, {
        name: 'test-project',
        path: '/test/path',
      }) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized IPC sender');
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(projectInitializer.initializeProject).mockRejectedValue(
        new Error('Directory not empty')
      );

      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await initializeHandler(mockEvent, {
        name: 'test-project',
        path: '/test/path',
      }) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Directory not empty');
    });
  });

  describe('project:validatePath handler', () => {
    // Note: The validatePath handler dynamically imports fs-extra
    // Testing it fully would require more complex mocking
    // These tests verify the handler is registered correctly
    let validateHandler: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      registerProjectHandlers();
      const calls = vi.mocked(ipcMain.handle).mock.calls;
      const validateCall = calls.find((call) => call[0] === 'project:validatePath');
      validateHandler = validateCall?.[1] as (...args: unknown[]) => Promise<unknown>;
    });

    it('should be a function', () => {
      expect(typeof validateHandler).toBe('function');
    });

    it('should return error for unauthorized sender', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'https://malicious-site.com',
        },
      };

      const result = await validateHandler(mockEvent, '/test/path') as { valid: boolean; error?: string };

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unauthorized IPC sender');
    });

    it('should return error for missing path', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await validateHandler(mockEvent, '') as { valid: boolean; error?: string };

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Project path is required');
    });
  });

  describe('project:isPathEmpty handler', () => {
    let isEmptyHandler: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      registerProjectHandlers();
      const calls = vi.mocked(ipcMain.handle).mock.calls;
      const isEmptyCall = calls.find((call) => call[0] === 'project:isPathEmpty');
      isEmptyHandler = isEmptyCall?.[1] as (...args: unknown[]) => Promise<unknown>;
    });

    it('should be a function', () => {
      expect(typeof isEmptyHandler).toBe('function');
    });

    it('should return error for unauthorized sender', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'https://malicious-site.com',
        },
      };

      const result = await isEmptyHandler(mockEvent, '/test/path') as { empty: boolean; exists: boolean; error?: string };

      expect(result.empty).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.error).toBe('Unauthorized IPC sender');
    });

    it('should return error for missing path', async () => {
      const mockEvent = {
        sender: {
          getURL: () => 'http://localhost:5173',
        },
      };

      const result = await isEmptyHandler(mockEvent, '') as { empty: boolean; exists: boolean; error?: string };

      expect(result.empty).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.error).toBe('Path is required');
    });
  });
});
