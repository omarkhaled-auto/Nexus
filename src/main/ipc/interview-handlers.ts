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
import type { InterviewEngine, InterviewSession, ProcessMessageResult } from '../../interview';
import type { InterviewSessionManager } from '../../interview';

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
 * Register IPC handlers for interview operations
 *
 * @param interviewEngine The InterviewEngine instance
 * @param sessionManager The InterviewSessionManager instance
 */
export function registerInterviewHandlers(
  interviewEngine: InterviewEngine,
  sessionManager: InterviewSessionManager
): void {
  // ========================================
  // Start new interview
  // ========================================
  ipcMain.handle(
    'interview:start',
    (event, projectId: string): InterviewSession => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender');
      }
      if (typeof projectId !== 'string' || !projectId) {
        throw new Error('Invalid projectId');
      }

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
