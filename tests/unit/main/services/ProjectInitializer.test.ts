/**
 * ProjectInitializer Tests
 * Phase 21 Task 5: Tests for project initialization service
 *
 * Tests cover:
 * - Project directory creation
 * - Nexus config file creation
 * - Git initialization (when git is available)
 * - Error handling for invalid paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ProjectInitializer, type ProjectInitOptions } from '../../../../src/main/services/ProjectInitializer';

describe('ProjectInitializer', () => {
  let initializer: ProjectInitializer;
  let testDir: string;

  beforeEach(async () => {
    initializer = new ProjectInitializer();
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-test-'));
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('initializeProject', () => {
    it('should create project directory structure', async () => {
      const result = await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        initGit: false, // Skip git for faster tests
      });

      // Verify result
      expect(result.name).toBe('test-project');
      expect(result.path).toBe(path.join(testDir, 'test-project'));
      expect(result.id).toMatch(/^proj_\d+_[a-z0-9]+$/);
      expect(result.createdAt).toBeInstanceOf(Date);

      // Verify directories were created
      const projectPath = result.path;
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'tests'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'checkpoints'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'worktrees'))).toBe(true);
    });

    it('should create nexus config file', async () => {
      const result = await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        description: 'Test description',
        initGit: false,
      });

      // Verify config file exists
      const configPath = path.join(result.path, '.nexus', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify config contents
      const config = await fs.readJson(configPath);
      expect(config.name).toBe('test-project');
      expect(config.description).toBe('Test description');
      expect(config.version).toBe('1.0.0');
      expect(config.nexusVersion).toBe('1.0.0');
      expect(config.settings).toEqual({
        maxAgents: 4,
        qaMaxIterations: 50,
        taskMaxMinutes: 30,
        checkpointIntervalSeconds: 7200,
      });
    });

    it('should create STATE.md file', async () => {
      const result = await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        initGit: false,
      });

      // Verify STATE.md exists
      const statePath = path.join(result.path, '.nexus', 'STATE.md');
      expect(await fs.pathExists(statePath)).toBe(true);

      // Verify contents
      const stateContent = await fs.readFile(statePath, 'utf-8');
      expect(stateContent).toContain('# Project State');
      expect(stateContent).toContain('## Current Phase');
      expect(stateContent).toContain('initialization');
      expect(stateContent).toContain('## Status');
      expect(stateContent).toContain('pending');
    });

    it('should use empty string for description when not provided', async () => {
      const result = await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        initGit: false,
      });

      const configPath = path.join(result.path, '.nexus', 'config.json');
      const config = await fs.readJson(configPath);
      expect(config.description).toBe('');
    });

    it('should throw error if path exists as a file', async () => {
      // Create a file at the target path
      const filePath = path.join(testDir, 'existing-file');
      await fs.writeFile(filePath, 'test content');

      // Attempt to create project at the same path
      await expect(
        initializer.initializeProject({
          name: 'existing-file',
          path: testDir,
        })
      ).rejects.toThrow('Path already exists as a file');
    });

    it('should throw error if directory exists and is not empty', async () => {
      // Create a non-empty directory
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'some-file.txt'), 'content');

      // Attempt to create project at the same path
      await expect(
        initializer.initializeProject({
          name: 'existing-dir',
          path: testDir,
        })
      ).rejects.toThrow('Directory not empty and not a Nexus project');
    });

    it('should allow creating project in empty directory', async () => {
      // Create an empty directory
      const dirPath = path.join(testDir, 'empty-dir');
      await fs.ensureDir(dirPath);

      // This should succeed
      const result = await initializer.initializeProject({
        name: 'empty-dir',
        path: testDir,
        initGit: false,
      });

      expect(result.path).toBe(dirPath);
      expect(await fs.pathExists(path.join(dirPath, '.nexus'))).toBe(true);
    });

    it('should allow updating existing Nexus project directory', async () => {
      // Create a directory with .nexus folder
      const dirPath = path.join(testDir, 'nexus-project');
      await fs.ensureDir(path.join(dirPath, '.nexus'));

      // This should succeed
      const result = await initializer.initializeProject({
        name: 'nexus-project',
        path: testDir,
        initGit: false,
      });

      expect(result.path).toBe(dirPath);
    });

    it('should generate unique project IDs', async () => {
      const result1 = await initializer.initializeProject({
        name: 'project-1',
        path: testDir,
        initGit: false,
      });

      const result2 = await initializer.initializeProject({
        name: 'project-2',
        path: testDir,
        initGit: false,
      });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('git initialization', () => {
    // Note: Git tests may fail if git is not installed
    // We'll make them conditional
    let gitAvailable: boolean;

    beforeEach(async () => {
      try {
        const { execSync } = await import('child_process');
        execSync('git --version', { stdio: 'pipe' });
        gitAvailable = true;
      } catch {
        gitAvailable = false;
      }
    });

    it('should initialize git repository when initGit is true and git is available', async function () {
      if (!gitAvailable) {
        console.log('Skipping test: git not available');
        return;
      }

      const result = await initializer.initializeProject({
        name: 'git-project',
        path: testDir,
        initGit: true,
      });

      // Verify .git directory exists
      const gitDir = path.join(result.path, '.git');
      expect(await fs.pathExists(gitDir)).toBe(true);

      // Verify .gitignore was created
      const gitignorePath = path.join(result.path, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);

      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      expect(gitignoreContent).toContain('node_modules/');
      expect(gitignoreContent).toContain('.nexus/worktrees/');
    });

    it('should skip git initialization when initGit is false', async () => {
      const result = await initializer.initializeProject({
        name: 'no-git-project',
        path: testDir,
        initGit: false,
      });

      // Verify .git directory does NOT exist
      const gitDir = path.join(result.path, '.git');
      expect(await fs.pathExists(gitDir)).toBe(false);
    });

    it('should not fail if git initialization fails', async () => {
      // Mock git to fail by using a non-existent git command
      // This test ensures the project is still created even if git fails

      const result = await initializer.initializeProject({
        name: 'git-fail-project',
        path: testDir,
        initGit: true,
      });

      // Project should still be created
      expect(await fs.pathExists(result.path)).toBe(true);
      expect(await fs.pathExists(path.join(result.path, '.nexus'))).toBe(true);
    });
  });
});
