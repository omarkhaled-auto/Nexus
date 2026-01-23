/**
 * Project Loader Service
 * Phase 21 Task 6: Load and validate existing projects
 *
 * Responsibilities:
 * - Load existing Nexus projects
 * - Initialize Nexus structure for non-Nexus directories
 * - Validate project paths
 * - Check if directory is a Nexus project
 *
 * When loading a non-Nexus directory:
 * - Creates .nexus/ folder structure
 * - Creates default config.json
 * - Creates STATE.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/** Helper to check if path exists */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Helper to ensure directory exists */
async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

/** Helper to write JSON file */
async function writeJson(p: string, data: unknown, options?: { spaces?: number }): Promise<void> {
  await fs.writeFile(p, JSON.stringify(data, null, options?.spaces ?? 2));
}

/** Helper to read JSON file */
async function readJson<T = unknown>(p: string): Promise<T> {
  const content = await fs.readFile(p, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Loaded project information
 */
export interface LoadedProject {
  /** Unique project ID (generated from path hash) */
  id: string;
  /** Project name */
  name: string;
  /** Full path to project directory */
  path: string;
  /** Project description */
  description?: string;
  /** Project configuration */
  config: ProjectConfig;
  /** Whether this was originally a Nexus project */
  isNexusProject: boolean;
  /** Whether the project has a git repository */
  hasGit: boolean;
}

/**
 * Nexus project configuration structure
 */
export interface ProjectConfig {
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Project version */
  version: string;
  /** Creation timestamp (ISO string) */
  created: string;
  /** Nexus version used to create */
  nexusVersion: string;
  /** Project settings */
  settings: {
    maxAgents: number;
    qaMaxIterations: number;
    taskMaxMinutes: number;
    checkpointIntervalSeconds: number;
  };
}

/**
 * Project Loader - loads and validates existing projects
 */
export class ProjectLoader {
  /**
   * Load an existing project from the given path
   *
   * For Nexus projects: Loads existing configuration
   * For non-Nexus directories: Creates .nexus structure with defaults
   *
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to loaded project info
   * @throws Error if path does not exist or is not a directory
   */
  async loadProject(projectPath: string): Promise<LoadedProject> {
    // Validate path exists
    if (!(await pathExists(projectPath))) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) {
      throw new Error(`Project path is not a directory: ${projectPath}`);
    }

    // Check if it's a Nexus project
    const nexusConfigPath = path.join(projectPath, '.nexus', 'config.json');
    const isNexusProject = await pathExists(nexusConfigPath);

    // Check for git
    const gitDir = path.join(projectPath, '.git');
    const hasGit = await pathExists(gitDir);

    let config: ProjectConfig;

    if (isNexusProject) {
      // Load existing Nexus config
      config = await readJson(nexusConfigPath);
      console.log(`[ProjectLoader] Loaded existing Nexus project: ${config.name}`);
    } else {
      // Create default config for non-Nexus project
      config = this.createDefaultConfig(path.basename(projectPath));

      // Initialize Nexus structure
      await this.initializeNexusStructure(projectPath, config);
      console.log(`[ProjectLoader] Initialized Nexus structure for: ${config.name}`);
    }

    return {
      id: this.generateProjectId(projectPath),
      name: config.name,
      path: projectPath,
      description: config.description,
      config,
      isNexusProject,
      hasGit,
    };
  }

  /**
   * Validate if a path is a valid project directory
   *
   * @param projectPath - Path to validate
   * @returns Promise resolving to boolean
   */
  async validateProjectPath(projectPath: string): Promise<boolean> {
    try {
      if (!(await pathExists(projectPath))) {
        return false;
      }

      const stat = await fs.stat(projectPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if path contains a Nexus project
   *
   * @param projectPath - Path to check
   * @returns Promise resolving to boolean
   */
  async isNexusProject(projectPath: string): Promise<boolean> {
    const configPath = path.join(projectPath, '.nexus', 'config.json');
    return pathExists(configPath);
  }

  /**
   * Get project config without full loading
   * Returns null if not a Nexus project
   *
   * @param projectPath - Path to project
   * @returns Promise resolving to config or null
   */
  async getProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
    const configPath = path.join(projectPath, '.nexus', 'config.json');

    if (!(await pathExists(configPath))) {
      return null;
    }

    try {
      return await readJson(configPath);
    } catch {
      return null;
    }
  }

  /**
   * Update project configuration
   *
   * @param projectPath - Path to project
   * @param updates - Partial config updates
   * @returns Promise resolving to updated config
   * @throws Error if project not found
   */
  async updateProjectConfig(
    projectPath: string,
    updates: Partial<ProjectConfig>
  ): Promise<ProjectConfig> {
    const configPath = path.join(projectPath, '.nexus', 'config.json');

    if (!(await pathExists(configPath))) {
      throw new Error(`Not a Nexus project: ${projectPath}`);
    }

    const currentConfig = await readJson(configPath);
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      // Don't allow overwriting certain fields
      created: currentConfig.created,
    };

    await writeJson(configPath, updatedConfig, { spaces: 2 });
    console.log(`[ProjectLoader] Updated project config: ${projectPath}`);

    return updatedConfig;
  }

  /**
   * Create default configuration for a project
   */
  private createDefaultConfig(name: string): ProjectConfig {
    return {
      name,
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
  }

  /**
   * Initialize Nexus structure for an existing directory
   */
  private async initializeNexusStructure(
    projectPath: string,
    config: ProjectConfig
  ): Promise<void> {
    const nexusDir = path.join(projectPath, '.nexus');

    // Create .nexus directory structure
    await ensureDir(nexusDir);
    await ensureDir(path.join(nexusDir, 'checkpoints'));
    await ensureDir(path.join(nexusDir, 'worktrees'));

    // Write config
    await writeJson(path.join(nexusDir, 'config.json'), config, { spaces: 2 });

    // Create STATE.md
    const stateContent = `# Project State

## Current Phase
loaded

## Status
ready

## Last Updated
${new Date().toISOString()}
`;
    await fs.writeFile(path.join(nexusDir, 'STATE.md'), stateContent);

    console.log(`[ProjectLoader] Initialized Nexus structure for existing project`);
  }

  /**
   * Generate a consistent project ID from path
   * Same path always produces same ID
   */
  private generateProjectId(projectPath: string): string {
    // Simple hash function for consistent ID generation
    let hash = 0;
    for (let i = 0; i < projectPath.length; i++) {
      const char = projectPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `proj_${Math.abs(hash).toString(36)}`;
  }
}

// Singleton instance
export const projectLoader = new ProjectLoader();
