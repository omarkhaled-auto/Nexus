/**
 * Project Initializer Service
 * Phase 21 Task 5: Create new Nexus projects with proper structure
 *
 * Responsibilities:
 * - Create project directory structure
 * - Initialize .nexus configuration folder
 * - Initialize git repository (optional)
 * - Create initial project files
 *
 * Directory Structure Created:
 * project-name/
 *   src/
 *   tests/
 *   .nexus/
 *     config.json
 *     STATE.md
 *     checkpoints/
 *     worktrees/
 *   .gitignore
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Options for initializing a new project
 */
export interface ProjectInitOptions {
  /** Project name - will be used as directory name */
  name: string;
  /** Parent directory where project will be created */
  path: string;
  /** Optional project description */
  description?: string;
  /** Whether to initialize git repository (default: true) */
  initGit?: boolean;
}

/**
 * Result of project initialization
 */
export interface InitializedProject {
  /** Unique project ID */
  id: string;
  /** Project name */
  name: string;
  /** Full path to project directory */
  path: string;
  /** Timestamp of creation */
  createdAt: Date;
}

/**
 * Nexus project configuration structure
 */
interface NexusConfig {
  name: string;
  description: string;
  version: string;
  created: string;
  nexusVersion: string;
  settings: {
    maxAgents: number;
    qaMaxIterations: number;
    taskMaxMinutes: number;
    checkpointIntervalSeconds: number;
  };
}

/**
 * Project Initializer - creates new Nexus projects
 */
export class ProjectInitializer {
  /**
   * Initialize a new Nexus project at the specified path
   *
   * @param options - Project initialization options
   * @returns Promise resolving to initialized project info
   * @throws Error if path already exists as a file or non-empty directory
   */
  async initializeProject(options: ProjectInitOptions): Promise<InitializedProject> {
    const projectPath = path.join(options.path, options.name);

    // Validate path doesn't already exist as a file
    if (await fs.pathExists(projectPath)) {
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path already exists as a file: ${projectPath}`);
      }
      // Directory exists - check if it's empty or already a Nexus project
      const files = await fs.readdir(projectPath);
      if (files.length > 0 && !files.includes('.nexus')) {
        throw new Error(`Directory not empty and not a Nexus project: ${projectPath}`);
      }
    }

    // Create project directory structure
    await this.createDirectoryStructure(projectPath);

    // Create .nexus configuration
    await this.createNexusConfig(projectPath, options);

    // Initialize git if requested (default: true)
    if (options.initGit !== false) {
      await this.initializeGit(projectPath);
    }

    const projectId = this.generateProjectId();

    console.log(`[ProjectInitializer] Project initialized: ${options.name} at ${projectPath}`);

    return {
      id: projectId,
      name: options.name,
      path: projectPath,
      createdAt: new Date(),
    };
  }

  /**
   * Create the standard Nexus project directory structure
   */
  private async createDirectoryStructure(projectPath: string): Promise<void> {
    // Create main directories
    const directories = [
      projectPath,
      path.join(projectPath, 'src'),
      path.join(projectPath, 'tests'),
      path.join(projectPath, '.nexus'),
      path.join(projectPath, '.nexus', 'checkpoints'),
      path.join(projectPath, '.nexus', 'worktrees'),
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
    }

    console.log(`[ProjectInitializer] Created directory structure at ${projectPath}`);
  }

  /**
   * Create the .nexus configuration files
   */
  private async createNexusConfig(
    projectPath: string,
    options: ProjectInitOptions
  ): Promise<void> {
    const config: NexusConfig = {
      name: options.name,
      description: options.description ?? '',
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

    // Write config.json
    await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), config, {
      spaces: 2,
    });

    // Create initial STATE.md
    const stateContent = `# Project State

## Current Phase
initialization

## Status
pending

## Last Updated
${new Date().toISOString()}
`;

    await fs.writeFile(path.join(projectPath, '.nexus', 'STATE.md'), stateContent);

    console.log(`[ProjectInitializer] Created Nexus configuration`);
  }

  /**
   * Initialize git repository for the project
   */
  private async initializeGit(projectPath: string): Promise<void> {
    try {
      // Check if already a git repo
      const gitDir = path.join(projectPath, '.git');
      if (await fs.pathExists(gitDir)) {
        console.log(`[ProjectInitializer] Git already initialized`);
        return;
      }

      // Check if git is available
      try {
        execSync('git --version', { stdio: 'pipe' });
      } catch {
        console.warn(`[ProjectInitializer] Git not available, skipping git initialization`);
        return;
      }

      // Initialize git
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });

      // Create .gitignore
      const gitignore = `# Dependencies
node_modules/

# Build
dist/
build/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Nexus working files
.nexus/worktrees/
.nexus/checkpoints/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage
coverage/

# TypeScript cache
*.tsbuildinfo
`;

      await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);

      // Initial commit
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
      execSync('git commit -m "Initial commit - Nexus project initialized"', {
        cwd: projectPath,
        stdio: 'pipe',
      });

      console.log(`[ProjectInitializer] Git initialized with initial commit`);
    } catch (error) {
      console.warn(`[ProjectInitializer] Git initialization failed:`, error);
      // Non-fatal - project can still work without git
    }
  }

  /**
   * Generate a unique project ID
   */
  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const projectInitializer = new ProjectInitializer();
