/**
 * Recent Projects Service
 * Phase 21 Task 8: Store and manage recently opened projects
 *
 * Features:
 * - Store up to 10 most recent projects
 * - Persist to user data directory
 * - Sorted by last opened date
 * - Automatic cleanup of non-existent paths
 *
 * Storage Location: {userData}/recent-projects.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

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
 * Recent project entry
 */
export interface RecentProject {
  /** Absolute path to project directory */
  path: string;
  /** Project name */
  name: string;
  /** ISO timestamp of last open */
  lastOpened: string;
}

/**
 * Maximum number of recent projects to store
 */
const MAX_RECENT = 10;

/**
 * Service for managing recently opened projects
 */
export class RecentProjectsService {
  private configPath: string;
  private cache: RecentProject[] | null = null;

  constructor() {
    // Use userData directory for persistent storage across sessions
    // In development, app.getPath may throw if app not ready
    try {
      this.configPath = path.join(app.getPath('userData'), 'recent-projects.json');
    } catch {
      // Fallback for testing or when app not ready
      this.configPath = path.join(process.cwd(), '.nexus-recent-projects.json');
    }
  }

  /**
   * Allow setting a custom config path (for testing)
   */
  setConfigPath(configPath: string): void {
    this.configPath = configPath;
    this.cache = null;
  }

  /**
   * Get list of recent projects, sorted by lastOpened descending
   * @returns Array of recent projects
   */
  async getRecent(): Promise<RecentProject[]> {
    // Return cached if available
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      if (await pathExists(this.configPath)) {
        const data = await readJson(this.configPath);
        // Validate data structure
        if (Array.isArray(data)) {
          this.cache = data.filter((item) => this.isValidRecentProject(item));
          return this.cache;
        }
      }
    } catch (error) {
      console.error('[RecentProjectsService] Failed to load recent projects:', error);
    }

    this.cache = [];
    return this.cache;
  }

  /**
   * Add a project to the recent list (or update if exists)
   * @param project - Project to add (path and name required)
   */
  async addRecent(project: { path: string; name: string }): Promise<void> {
    if (!project.path || !project.name) {
      console.warn('[RecentProjectsService] Invalid project data, skipping add');
      return;
    }

    const recent = await this.getRecent();

    // Remove if already exists (we'll re-add at top)
    const filtered = recent.filter((p) => p.path !== project.path);

    // Add to front with updated timestamp
    filtered.unshift({
      path: project.path,
      name: project.name,
      lastOpened: new Date().toISOString(),
    });

    // Keep only MAX_RECENT entries
    const trimmed = filtered.slice(0, MAX_RECENT);

    // Save and update cache
    await this.save(trimmed);
    console.log(`[RecentProjectsService] Added recent project: ${project.name}`);
  }

  /**
   * Remove a project from the recent list
   * @param projectPath - Path of project to remove
   */
  async removeRecent(projectPath: string): Promise<void> {
    if (!projectPath) {
      return;
    }

    const recent = await this.getRecent();
    const filtered = recent.filter((p) => p.path !== projectPath);

    if (filtered.length !== recent.length) {
      await this.save(filtered);
      console.log(`[RecentProjectsService] Removed recent project: ${projectPath}`);
    }
  }

  /**
   * Clear all recent projects
   */
  async clearRecent(): Promise<void> {
    await this.save([]);
    console.log('[RecentProjectsService] Cleared all recent projects');
  }

  /**
   * Clean up entries for projects that no longer exist
   * @returns Number of entries removed
   */
  async cleanup(): Promise<number> {
    const recent = await this.getRecent();
    const valid: RecentProject[] = [];

    for (const project of recent) {
      try {
        if (await pathExists(project.path)) {
          valid.push(project);
        }
      } catch {
        // Path check failed, skip this entry
      }
    }

    const removed = recent.length - valid.length;
    if (removed > 0) {
      await this.save(valid);
      console.log(`[RecentProjectsService] Cleaned up ${removed} non-existent entries`);
    }

    return removed;
  }

  /**
   * Save recent projects to disk
   */
  private async save(projects: RecentProject[]): Promise<void> {
    try {
      await ensureDir(path.dirname(this.configPath));
      await writeJson(this.configPath, projects, { spaces: 2 });
      this.cache = projects;
    } catch (error) {
      console.error('[RecentProjectsService] Failed to save recent projects:', error);
      throw error;
    }
  }

  /**
   * Validate that an object is a valid RecentProject
   */
  private isValidRecentProject(obj: unknown): obj is RecentProject {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as RecentProject).path === 'string' &&
      typeof (obj as RecentProject).name === 'string' &&
      typeof (obj as RecentProject).lastOpened === 'string'
    );
  }
}

/**
 * Singleton instance for use across the application
 */
export const recentProjectsService = new RecentProjectsService();
