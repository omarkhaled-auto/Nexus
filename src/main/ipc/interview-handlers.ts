/**
 * Interview IPC Handlers
 *
 * Phase 9: IPC handlers connecting renderer to InterviewEngine and SessionManager.
 * Follows same pattern as existing handlers in handlers.ts.
 *
 * Includes fallback handlers for when Nexus initialization fails, providing
 * helpful error messages to the UI instead of cryptic "No handler" errors.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { eq } from 'drizzle-orm';
import type { InterviewEngine, InterviewSession, ProcessMessageResult } from '../../interview';
import type { InterviewSessionManager } from '../../interview';
import type { DatabaseClient } from '../../persistence/database/DatabaseClient';
import { projects } from '../../persistence/database/schema';
import { pendingProjectPaths } from './projectHandlers';

/**
 * Error thrown when interview operations are attempted but Nexus is not initialized.
 * This provides a helpful message to the user about how to fix the issue.
 */
export class NexusNotInitializedError extends Error {
  constructor(initError?: string) {
    const baseMessage = 'Interview system is not available. ';
    const hint = initError
      ? `Initialization failed: ${initError}. Please check Settings to configure your LLM provider (Claude CLI or API key).`
      : 'Please configure your LLM provider in Settings (Claude CLI or API key).';
    super(baseMessage + hint);
    this.name = 'NexusNotInitializedError';
  }
}

/**
 * Validate IPC sender is from allowed origin
 * Security: Prevents malicious pages from invoking IPC handlers
 * Allows localhost on any port (for dev server port changes) and file:// for production
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL();
  return url.startsWith('http://localhost:') || url.startsWith('file://');
}

/**
 * Ensure a project exists in the database before creating a session.
 * Creates a minimal project record if one doesn't exist.
 *
 * Uses the pendingProjectPaths Map to retrieve the rootPath that was stored
 * by project:initialize handler. This ensures the correct project path is used.
 *
 * @param db The DatabaseClient instance
 * @param projectId The project ID to ensure exists
 * @param projectName The project name (used to look up stored rootPath)
 * @param mode The interview mode ('genesis' or 'evolution')
 */
function ensureProjectExists(
  db: DatabaseClient,
  projectId: string,
  projectName: string | undefined,
  mode: 'genesis' | 'evolution' = 'genesis'
): void {
  // Check if project already exists
  const existing = db.db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!existing) {
    // Get stored rootPath from projectHandlers (set by project:initialize)
    const storedPath = projectName ? pendingProjectPaths.get(projectName) : undefined;
    if (storedPath && projectName) {
      pendingProjectPaths.delete(projectName);
      console.log(`[InterviewHandlers] Using stored rootPath for ${projectName}: ${storedPath}`);
    }

    const now = new Date();
    db.db.insert(projects).values({
      id: projectId,
      name: projectName || `New ${mode === 'genesis' ? 'Genesis' : 'Evolution'} Project`,
      mode: mode,
      status: 'interview',
      rootPath: storedPath || '',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log(`[InterviewHandlers] Created project record: ${projectId} with rootPath: ${storedPath || '(empty)'}`);
  }
}

/**
 * Register IPC handlers for interview operations
 *
 * @param interviewEngine The InterviewEngine instance
 * @param sessionManager The InterviewSessionManager instance
 * @param db The DatabaseClient instance for project creation
 */
export function registerInterviewHandlers(
  interviewEngine: InterviewEngine,
  sessionManager: InterviewSessionManager,
  db: DatabaseClient
): void {
  // ========================================
  // Start new interview
  // ========================================
  ipcMain.handle(
    'interview:start',
    (event, projectId: string, projectName?: string): InterviewSession => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof projectId !== 'string' || !projectId) {
        throw new Error('Invalid projectId');
      }

      // Ensure project exists in database before creating session
      // Pass projectName to retrieve stored rootPath from pendingProjectPaths
      ensureProjectExists(db, projectId, projectName, 'genesis');

      const session = interviewEngine.startSession(projectId);
      sessionManager.startAutoSave(session);
      return session;
    }
  );

  // ========================================
  // Send message
  // ========================================
  ipcMain.handle(
    'interview:sendMessage',
    async (event, sessionId: string, message: string): Promise<ProcessMessageResult> => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Invalid sessionId');
      }
      if (typeof message !== 'string' || !message) {
        throw new Error('Invalid message');
      }

      const result = await interviewEngine.processMessage(sessionId, message);
      return result;
    }
  );

  // ========================================
  // Get session
  // ========================================
  ipcMain.handle(
    'interview:getSession',
    (event, sessionId: string): InterviewSession | null => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Invalid sessionId');
      }

      return interviewEngine.getSession(sessionId);
    }
  );

  // ========================================
  // Resume session from persistence
  // ========================================
  ipcMain.handle(
    'interview:resume',
    (event, sessionId: string): InterviewSession | null => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Invalid sessionId');
      }

      const session = sessionManager.load(sessionId);
      if (session) {
        sessionManager.startAutoSave(session);
      }
      return session;
    }
  );

  // ========================================
  // Resume session by project
  // ========================================
  ipcMain.handle(
    'interview:resumeByProject',
    (event, projectId: string): InterviewSession | null => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof projectId !== 'string' || !projectId) {
        throw new Error('Invalid projectId');
      }

      const session = sessionManager.loadByProject(projectId);
      if (session) {
        sessionManager.startAutoSave(session);
      }
      return session;
    }
  );

  // ========================================
  // End interview
  // ========================================
  ipcMain.handle(
    'interview:end',
    (event, sessionId: string): void => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Invalid sessionId');
      }

      interviewEngine.endSession(sessionId);
      sessionManager.stopAutoSave();

      const session = interviewEngine.getSession(sessionId);
      if (session) {
        sessionManager.save(session);
      }
    }
  );

  // ========================================
  // Pause interview
  // ========================================
  ipcMain.handle(
    'interview:pause',
    (event, sessionId: string): void => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Invalid sessionId');
      }

      interviewEngine.pauseSession(sessionId);
      sessionManager.stopAutoSave();

      const session = interviewEngine.getSession(sessionId);
      if (session) {
        sessionManager.save(session);
      }
    }
  );

  // ========================================
  // Get initial greeting
  // ========================================
  ipcMain.handle(
    'interview:getGreeting',
    (event): string => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }

      return interviewEngine.getInitialGreeting();
    }
  );
}

/**
 * List of all interview IPC channel names.
 * Used for removing handlers before re-registering.
 */
const INTERVIEW_CHANNELS = [
  'interview:start',
  'interview:sendMessage',
  'interview:getSession',
  'interview:resume',
  'interview:resumeByProject',
  'interview:end',
  'interview:pause',
  'interview:getGreeting',
] as const;

/**
 * Remove all interview IPC handlers.
 *
 * This must be called before registering new handlers to avoid
 * "Attempted to register a second handler" errors.
 */
export function removeInterviewHandlers(): void {
  for (const channel of INTERVIEW_CHANNELS) {
    ipcMain.removeHandler(channel);
  }
  console.log('[InterviewHandlers] Removed existing interview handlers');
}

/**
 * Register fallback IPC handlers for when Nexus initialization fails.
 *
 * These handlers return helpful error messages instead of silent failures,
 * allowing the UI to display meaningful information to the user.
 *
 * @param initError Optional error message from the failed initialization
 */
export function registerFallbackInterviewHandlers(initError?: string): void {
  const error = new NexusNotInitializedError(initError);

  // ========================================
  // Fallback: Start new interview
  // ========================================
  ipcMain.handle(
    'interview:start',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Send message
  // ========================================
  ipcMain.handle(
    'interview:sendMessage',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Get session
  // ========================================
  ipcMain.handle(
    'interview:getSession',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Resume session
  // ========================================
  ipcMain.handle(
    'interview:resume',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Resume by project
  // ========================================
  ipcMain.handle(
    'interview:resumeByProject',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: End interview
  // ========================================
  ipcMain.handle(
    'interview:end',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Pause interview
  // ========================================
  ipcMain.handle(
    'interview:pause',
    (): never => {
      throw error;
    }
  );

  // ========================================
  // Fallback: Get greeting
  // ========================================
  ipcMain.handle(
    'interview:getGreeting',
    (): never => {
      throw error;
    }
  );

  console.log('[InterviewHandlers] Registered fallback handlers (Nexus not initialized)');
}
