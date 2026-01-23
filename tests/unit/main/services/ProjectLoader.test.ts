/**
 * ProjectLoader Tests
 * Phase 21 Task 6: Tests for project loading service
 *
 * Tests cover:
 * - Loading existing Nexus projects
 * - Initializing Nexus structure for non-Nexus directories
 * - Path validation
 * - Error handling for invalid paths
 * - Project config retrieval and updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ProjectLoader, type ProjectConfig } from '../../../../src/main/services/ProjectLoader';

describe('ProjectLoader', () => {
  let loader: ProjectLoader;
  let testDir: string;

  beforeEach(async () => {
    loader = new ProjectLoader();
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-loader-test-'));
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('loadProject', () => {
    it('should load existing Nexus project', async () => {
      // Create a Nexus project structure
      const projectPath = path.join(testDir, 'my-nexus-project');
      await fs.ensureDir(path.join(projectPath, '.nexus'));
      await fs.ensureDir(path.join(projectPath, '.nexus', 'checkpoints'));
      await fs.ensureDir(path.join(projectPath, '.nexus', 'worktrees'));

      const config: ProjectConfig = {
        name: 'my-nexus-project',
        description: 'Test project',
        version: '1.0.0',
        created: new Date().toISOString(),
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 4,
          qaMaxIterations: 50,
          taskMaxMinutes: 30,
          checkpointIntervalSeconds: 7200,
        },
      };

      await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), config, { spaces: 2 });

      const result = await loader.loadProject(projectPath);

      expect(result.name).toBe('my-nexus-project');
      expect(result.path).toBe(projectPath);
      expect(result.isNexusProject).toBe(true);
      expect(result.config.name).toBe('my-nexus-project');
      expect(result.config.description).toBe('Test project');
      expect(result.id).toBeDefined();
    });

    it('should initialize Nexus structure for non-Nexus directory', async () => {
      // Create a regular directory with some files
      const projectPath = path.join(testDir, 'regular-project');
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'README.md'), '# My Project');
      await fs.ensureDir(path.join(projectPath, 'src'));

      const result = await loader.loadProject(projectPath);

      // Should not be marked as originally a Nexus project
      expect(result.isNexusProject).toBe(false);

      // But .nexus structure should now exist
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'config.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'STATE.md'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'checkpoints'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'worktrees'))).toBe(true);

      // Config should use directory name as project name
      expect(result.name).toBe('regular-project');
    });

    it('should detect git repository', async () => {
      // Create a project with .git directory
      const projectPath = path.join(testDir, 'git-project');
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, '.git'));

      const result = await loader.loadProject(projectPath);

      expect(result.hasGit).toBe(true);
    });

    it('should detect when git is not present', async () => {
      // Create a project without .git directory
      const projectPath = path.join(testDir, 'no-git-project');
      await fs.ensureDir(projectPath);

      const result = await loader.loadProject(projectPath);

      expect(result.hasGit).toBe(false);
    });

    it('should throw error for non-existent path', async () => {
      await expect(
        loader.loadProject(path.join(testDir, 'non-existent'))
      ).rejects.toThrow('Project path does not exist');
    });

    it('should throw error for file path instead of directory', async () => {
      const filePath = path.join(testDir, 'somefile.txt');
      await fs.writeFile(filePath, 'content');

      await expect(
        loader.loadProject(filePath)
      ).rejects.toThrow('Project path is not a directory');
    });

    it('should generate consistent project ID for same path', async () => {
      const projectPath = path.join(testDir, 'consistent-id-project');
      await fs.ensureDir(projectPath);

      const result1 = await loader.loadProject(projectPath);
      const result2 = await loader.loadProject(projectPath);

      expect(result1.id).toBe(result2.id);
    });

    it('should generate different IDs for different paths', async () => {
      const projectPath1 = path.join(testDir, 'project-1');
      const projectPath2 = path.join(testDir, 'project-2');
      await fs.ensureDir(projectPath1);
      await fs.ensureDir(projectPath2);

      const result1 = await loader.loadProject(projectPath1);
      const result2 = await loader.loadProject(projectPath2);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('validateProjectPath', () => {
    it('should return true for valid directory', async () => {
      const projectPath = path.join(testDir, 'valid-dir');
      await fs.ensureDir(projectPath);

      expect(await loader.validateProjectPath(projectPath)).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      expect(await loader.validateProjectPath(path.join(testDir, 'not-exists'))).toBe(false);
    });

    it('should return false for file path', async () => {
      const filePath = path.join(testDir, 'afile.txt');
      await fs.writeFile(filePath, 'content');

      expect(await loader.validateProjectPath(filePath)).toBe(false);
    });
  });

  describe('isNexusProject', () => {
    it('should return true for Nexus project', async () => {
      const projectPath = path.join(testDir, 'nexus-check');
      await fs.ensureDir(path.join(projectPath, '.nexus'));
      await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), { name: 'test' });

      expect(await loader.isNexusProject(projectPath)).toBe(true);
    });

    it('should return false for non-Nexus directory', async () => {
      const projectPath = path.join(testDir, 'not-nexus');
      await fs.ensureDir(projectPath);

      expect(await loader.isNexusProject(projectPath)).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      expect(await loader.isNexusProject(path.join(testDir, 'nope'))).toBe(false);
    });
  });

  describe('getProjectConfig', () => {
    it('should return config for Nexus project', async () => {
      const projectPath = path.join(testDir, 'config-project');
      await fs.ensureDir(path.join(projectPath, '.nexus'));

      const config: ProjectConfig = {
        name: 'config-project',
        description: 'Has config',
        version: '2.0.0',
        created: new Date().toISOString(),
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 8,
          qaMaxIterations: 100,
          taskMaxMinutes: 60,
          checkpointIntervalSeconds: 3600,
        },
      };

      await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), config, { spaces: 2 });

      const result = await loader.getProjectConfig(projectPath);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('config-project');
      expect(result?.version).toBe('2.0.0');
      expect(result?.settings.maxAgents).toBe(8);
    });

    it('should return null for non-Nexus project', async () => {
      const projectPath = path.join(testDir, 'no-config');
      await fs.ensureDir(projectPath);

      const result = await loader.getProjectConfig(projectPath);

      expect(result).toBeNull();
    });

    it('should return null for non-existent path', async () => {
      const result = await loader.getProjectConfig(path.join(testDir, 'nope'));

      expect(result).toBeNull();
    });
  });

  describe('updateProjectConfig', () => {
    it('should update project config', async () => {
      const projectPath = path.join(testDir, 'update-config');
      await fs.ensureDir(path.join(projectPath, '.nexus'));

      const originalConfig: ProjectConfig = {
        name: 'update-config',
        description: 'Original description',
        version: '1.0.0',
        created: '2024-01-01T00:00:00.000Z',
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 4,
          qaMaxIterations: 50,
          taskMaxMinutes: 30,
          checkpointIntervalSeconds: 7200,
        },
      };

      await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), originalConfig, { spaces: 2 });

      const updated = await loader.updateProjectConfig(projectPath, {
        description: 'Updated description',
        version: '2.0.0',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.version).toBe('2.0.0');
      // Created should not be changed
      expect(updated.created).toBe('2024-01-01T00:00:00.000Z');
      expect(updated.name).toBe('update-config');
    });

    it('should throw error for non-Nexus project', async () => {
      const projectPath = path.join(testDir, 'cannot-update');
      await fs.ensureDir(projectPath);

      await expect(
        loader.updateProjectConfig(projectPath, { description: 'new' })
      ).rejects.toThrow('Not a Nexus project');
    });
  });

  describe('STATE.md creation', () => {
    it('should create STATE.md when initializing non-Nexus project', async () => {
      const projectPath = path.join(testDir, 'state-test');
      await fs.ensureDir(projectPath);

      await loader.loadProject(projectPath);

      const statePath = path.join(projectPath, '.nexus', 'STATE.md');
      expect(await fs.pathExists(statePath)).toBe(true);

      const stateContent = await fs.readFile(statePath, 'utf-8');
      expect(stateContent).toContain('# Project State');
      expect(stateContent).toContain('## Current Phase');
      expect(stateContent).toContain('loaded');
      expect(stateContent).toContain('## Status');
      expect(stateContent).toContain('ready');
    });
  });
});
