/**
 * Interview IPC Handlers
 *
 * Phase 9: IPC handlers connecting renderer to InterviewEngine and SessionManager.
 * Follows same pattern as existing handlers in handlers.ts.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import type { InterviewEngine, InterviewSession, ProcessMessageResult } from '../../interview';
import type { InterviewSessionManager } from '../../interview';

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
