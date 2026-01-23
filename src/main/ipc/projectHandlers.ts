/**
 * IPC Project Handlers - Project Management
 * Phase 21 Task 5: Project initialization and loading IPC handlers
 *
 * Provides IPC handlers for:
 * - project:initialize - Create new Nexus project
 * - project:load - Load existing project
 * - project:validate - Validate project path
 *
 * Security:
 * - Validates sender origin for all handlers
 * - Uses ipcMain.handle (request-response pattern)
 * - Validates all input parameters
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import {
  projectInitializer,
  type ProjectInitOptions,
  type InitializedProject,
} from '../services/ProjectInitializer';
import {
  projectLoader,
  type LoadedProject,
} from '../services/ProjectLoader';

/**
 * Result type for project operations
 */
export interface ProjectOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate IPC sender is from allowed origin
 * Security: Prevents malicious pages from invoking IPC handlers
 * Allows localhost on any port (for dev server) and file:// for production
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL();
  return url.startsWith('http://localhost:') || url.startsWith('file://');
}

/**
 * Register all project-related IPC handlers
 * Call this during app initialization after app.whenReady()
 */
export function registerProjectHandlers(): void {
  // ========================================
  // Handler: Initialize New Project
  // ========================================
  ipcMain.handle(
    'project:initialize',
    async (
      event,
      options: ProjectInitOptions
    ): Promise<ProjectOperationResult<InitializedProject>> => {
      if (!validateSender(event)) {
        console.error('[ProjectHandlers] Unauthorized sender for project:initialize');
        return { success: false, error: 'Unauthorized IPC sender' };
      }

      // Validate required options
      if (!options?.name || typeof options.name !== 'string') {
        return { success: false, error: 'Project name is required' };
      }

      if (!options?.path || typeof options.path !== 'string') {
        return { success: false, error: 'Project path is required' };
      }

      // Sanitize project name - remove invalid characters
      const sanitizedName = options.name.trim().replace(/[<>:"/\\|?*]/g, '-');
      if (sanitizedName.length === 0) {
        return { success: false, error: 'Invalid project name' };
      }

      try {
        const project = await projectInitializer.initializeProject({
          ...options,
          name: sanitizedName,
        });

        console.log(`[ProjectHandlers] Project initialized: ${project.name}`);
        return { success: true, data: project };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ProjectHandlers] Initialize failed:', message);
        return { success: false, error: message };
      }
    }
  );

  // ========================================
  // Handler: Load Existing Project
  // ========================================
  ipcMain.handle(
    'project:load',
    async (
      event,
      projectPath: string
    ): Promise<ProjectOperationResult<LoadedProject>> => {
      if (!validateSender(event)) {
        console.error('[ProjectHandlers] Unauthorized sender for project:load');
        return { success: false, error: 'Unauthorized IPC sender' };
      }

      if (!projectPath || typeof projectPath !== 'string') {
        return { success: false, error: 'Project path is required' };
      }

      try {
        const project = await projectLoader.loadProject(projectPath);

        console.log(`[ProjectHandlers] Project loaded: ${project.name} from ${project.path}`);
        return { success: true, data: project };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ProjectHandlers] Load failed:', message);
        return { success: false, error: message };
      }
    }
  );

  // ========================================
  // Handler: Validate Project Path
  // ========================================
  ipcMain.handle(
    'project:validatePath',
    async (
      event,
      projectPath: string
    ): Promise<{ valid: boolean; isNexusProject?: boolean; error?: string }> => {
      if (!validateSender(event)) {
        console.error('[ProjectHandlers] Unauthorized sender for project:validatePath');
        return { valid: false, error: 'Unauthorized IPC sender' };
      }

      if (!projectPath || typeof projectPath !== 'string') {
        return { valid: false, error: 'Project path is required' };
      }

      try {
        const fs = await import('fs-extra');
        const path = await import('path');

        // Check if path exists
        const exists = await fs.pathExists(projectPath);
        if (!exists) {
          return { valid: false, error: 'Path does not exist' };
        }

        // Check if it's a directory
        const stat = await fs.stat(projectPath);
        if (!stat.isDirectory()) {
          return { valid: false, error: 'Path is not a directory' };
        }

        // Check if it's a Nexus project
        const nexusConfigPath = path.join(projectPath, '.nexus', 'config.json');
        const isNexusProject = await fs.pathExists(nexusConfigPath);

        return { valid: true, isNexusProject };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ProjectHandlers] Validation failed:', message);
        return { valid: false, error: message };
      }
    }
  );

  // ========================================
  // Handler: Check if Path is Empty
  // ========================================
  ipcMain.handle(
    'project:isPathEmpty',
    async (
      event,
      targetPath: string
    ): Promise<{ empty: boolean; exists: boolean; error?: string }> => {
      if (!validateSender(event)) {
        console.error('[ProjectHandlers] Unauthorized sender for project:isPathEmpty');
        return { empty: false, exists: false, error: 'Unauthorized IPC sender' };
      }

      if (!targetPath || typeof targetPath !== 'string') {
        return { empty: false, exists: false, error: 'Path is required' };
      }

      try {
        const fs = await import('fs-extra');

        const exists = await fs.pathExists(targetPath);
        if (!exists) {
          return { empty: true, exists: false };
        }

        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
          return { empty: false, exists: true, error: 'Path is not a directory' };
        }

        const files = await fs.readdir(targetPath);
        return { empty: files.length === 0, exists: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ProjectHandlers] isPathEmpty failed:', message);
        return { empty: false, exists: false, error: message };
      }
    }
  );

  console.log('[ProjectHandlers] Registered project IPC handlers');
}
