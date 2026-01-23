/**
 * RecentProjectsService Tests
 * Phase 21 Task 8: Tests for recent projects service
 *
 * Tests cover:
 * - Getting recent projects (empty, with data)
 * - Adding projects (new, existing, max limit)
 * - Removing projects
 * - Clearing all projects
 * - Cleanup of non-existent paths
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { RecentProjectsService, type RecentProject } from '../../../../src/main/services/RecentProjectsService';

describe('RecentProjectsService', () => {
  let service: RecentProjectsService;
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-recent-test-'));
    configPath = path.join(testDir, 'recent-projects.json');

    // Create service with custom config path (for testing)
    service = new RecentProjectsService();
    service.setConfigPath(configPath);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('getRecent', () => {
    it('should return empty array when no recent projects exist', async () => {
      const result = await service.getRecent();
      expect(result).toEqual([]);
    });

    it('should return empty array when config file does not exist', async () => {
      const result = await service.getRecent();
      expect(result).toEqual([]);
    });

    it('should return projects from existing config file', async () => {
      // Create config file with data
      const testData: RecentProject[] = [
        { path: '/path/to/project1', name: 'Project 1', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/path/to/project2', name: 'Project 2', lastOpened: '2025-01-22T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      const result = await service.getRecent();
      expect(result).toEqual(testData);
    });

    it('should filter out invalid entries', async () => {
      // Create config file with mix of valid and invalid data
      const testData = [
        { path: '/valid/path', name: 'Valid', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/missing-name' }, // Missing name and lastOpened
        { name: 'Missing Path', lastOpened: '2025-01-23T10:00:00Z' }, // Missing path
        null,
        'string instead of object',
        { path: '/valid2', name: 'Valid 2', lastOpened: '2025-01-22T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      const result = await service.getRecent();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Valid');
      expect(result[1].name).toBe('Valid 2');
    });

    it('should handle corrupted config file gracefully', async () => {
      // Write invalid JSON
      await fs.writeFile(configPath, '{ invalid json');

      const result = await service.getRecent();
      expect(result).toEqual([]);
    });

    it('should cache results after first call', async () => {
      const testData: RecentProject[] = [
        { path: '/path/to/project', name: 'Project', lastOpened: '2025-01-23T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // First call
      const result1 = await service.getRecent();
      expect(result1).toHaveLength(1);

      // Modify file directly (simulating external change)
      await fs.writeJson(configPath, []);

      // Second call should return cached result
      const result2 = await service.getRecent();
      expect(result2).toHaveLength(1);
      expect(result2).toBe(result1); // Same reference (cached)
    });
  });

  describe('addRecent', () => {
    it('should add new project to empty list', async () => {
      await service.addRecent({ path: '/new/project', name: 'New Project' });

      const result = await service.getRecent();
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/new/project');
      expect(result[0].name).toBe('New Project');
      expect(result[0].lastOpened).toBeDefined();
    });

    it('should add new project to front of existing list', async () => {
      // Setup existing data
      const testData: RecentProject[] = [
        { path: '/old/project', name: 'Old Project', lastOpened: '2025-01-22T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      await service.addRecent({ path: '/new/project', name: 'New Project' });

      const result = await service.getRecent();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('New Project'); // New is first
      expect(result[1].name).toBe('Old Project');
    });

    it('should move existing project to front and update timestamp', async () => {
      // Setup existing data
      const oldTimestamp = '2025-01-20T10:00:00Z';
      const testData: RecentProject[] = [
        { path: '/project2', name: 'Project 2', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/project1', name: 'Project 1', lastOpened: oldTimestamp },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      // Re-add project1
      await service.addRecent({ path: '/project1', name: 'Project 1' });

      const result = await service.getRecent();
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('/project1'); // Now first
      expect(result[0].lastOpened).not.toBe(oldTimestamp); // Updated timestamp
      expect(result[1].path).toBe('/project2');
    });

    it('should limit to MAX_RECENT (10) entries', async () => {
      // Add 12 projects
      for (let i = 0; i < 12; i++) {
        await service.addRecent({ path: `/project${i}`, name: `Project ${i}` });
      }

      const result = await service.getRecent();
      expect(result).toHaveLength(10);
      // Most recent should be project11 (last added)
      expect(result[0].name).toBe('Project 11');
      // Project 0 and 1 should be dropped
      expect(result.find(p => p.name === 'Project 0')).toBeUndefined();
      expect(result.find(p => p.name === 'Project 1')).toBeUndefined();
    });

    it('should persist to file', async () => {
      await service.addRecent({ path: '/project', name: 'Project' });

      // Verify file was created
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify file contents
      const fileData = await fs.readJson(configPath);
      expect(fileData).toHaveLength(1);
      expect(fileData[0].path).toBe('/project');
    });

    it('should ignore add with empty path or name', async () => {
      await service.addRecent({ path: '', name: 'Project' });
      await service.addRecent({ path: '/project', name: '' });

      const result = await service.getRecent();
      expect(result).toHaveLength(0);
    });
  });

  describe('removeRecent', () => {
    it('should remove project by path', async () => {
      // Setup existing data
      const testData: RecentProject[] = [
        { path: '/project1', name: 'Project 1', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/project2', name: 'Project 2', lastOpened: '2025-01-22T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      await service.removeRecent('/project1');

      const result = await service.getRecent();
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/project2');
    });

    it('should do nothing if path not found', async () => {
      // Setup existing data
      const testData: RecentProject[] = [
        { path: '/project1', name: 'Project 1', lastOpened: '2025-01-23T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      await service.removeRecent('/nonexistent');

      const result = await service.getRecent();
      expect(result).toHaveLength(1);
    });

    it('should handle empty path gracefully', async () => {
      await service.removeRecent('');
      // Should not throw
      const result = await service.getRecent();
      expect(result).toEqual([]);
    });
  });

  describe('clearRecent', () => {
    it('should remove all projects', async () => {
      // Setup existing data
      const testData: RecentProject[] = [
        { path: '/project1', name: 'Project 1', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/project2', name: 'Project 2', lastOpened: '2025-01-22T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      await service.clearRecent();

      const result = await service.getRecent();
      expect(result).toEqual([]);

      // Verify file was updated
      const fileData = await fs.readJson(configPath);
      expect(fileData).toEqual([]);
    });

    it('should work on empty list', async () => {
      await service.clearRecent();
      const result = await service.getRecent();
      expect(result).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should remove non-existent paths', async () => {
      // Create one real directory
      const realDir = path.join(testDir, 'real-project');
      await fs.ensureDir(realDir);

      // Setup data with mix of real and fake paths
      const testData: RecentProject[] = [
        { path: realDir, name: 'Real Project', lastOpened: '2025-01-23T10:00:00Z' },
        { path: '/fake/project1', name: 'Fake 1', lastOpened: '2025-01-22T10:00:00Z' },
        { path: '/fake/project2', name: 'Fake 2', lastOpened: '2025-01-21T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      const removed = await service.cleanup();

      expect(removed).toBe(2);

      const result = await service.getRecent();
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe(realDir);
    });

    it('should return 0 if all paths exist', async () => {
      const realDir = path.join(testDir, 'real-project');
      await fs.ensureDir(realDir);

      const testData: RecentProject[] = [
        { path: realDir, name: 'Real Project', lastOpened: '2025-01-23T10:00:00Z' },
      ];
      await fs.writeJson(configPath, testData);

      // Create new service to clear cache
      service = new RecentProjectsService();
      service.setConfigPath(configPath);

      const removed = await service.cleanup();
      expect(removed).toBe(0);
    });

    it('should handle empty list', async () => {
      const removed = await service.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe('setConfigPath', () => {
    it('should clear cache when config path changes', async () => {
      // Add some data
      await service.addRecent({ path: '/project', name: 'Project' });
      const result1 = await service.getRecent();
      expect(result1).toHaveLength(1);

      // Change config path
      const newConfigPath = path.join(testDir, 'new-config.json');
      service.setConfigPath(newConfigPath);

      // Should return empty (cache cleared, new file doesn't exist)
      const result2 = await service.getRecent();
      expect(result2).toEqual([]);
    });
  });
});
