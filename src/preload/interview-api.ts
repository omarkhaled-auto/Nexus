/**
 * Interview Preload API
 *
 * Phase 9: Exposes interview operations to renderer process via contextBridge.
 * Types imported from interview module for type safety.
 */

import { ipcRenderer } from 'electron';
import type { InterviewSession, ProcessMessageResult } from '../interview';

/**
 * Interview API exposed to the renderer process
 */
export const interviewAPI = {
  /**
   * Start a new interview session
   * @param projectId - Project to conduct interview for
   * @param projectName - Optional project name (used to retrieve stored rootPath)
   * @returns Promise with the new session
   */
  start: (projectId: string, projectName?: string): Promise<InterviewSession> =>
    ipcRenderer.invoke('interview:start', projectId, projectName),

  /**
   * Send a message in the interview
   * @param sessionId - Current session ID
   * @param message - User's message content
   * @returns Promise with processing result (response, requirements, gaps)
   */
  sendMessage: (sessionId: string, message: string): Promise<ProcessMessageResult> =>
    ipcRenderer.invoke('interview:sendMessage', sessionId, message),

  /**
   * Get a session by ID (from memory)
   * @param sessionId - Session ID to retrieve
   * @returns Promise with session or null
   */
  getSession: (sessionId: string): Promise<InterviewSession | null> =>
    ipcRenderer.invoke('interview:getSession', sessionId),

  /**
   * Resume a session from persistence
   * @param sessionId - Session ID to resume
   * @returns Promise with session or null
   */
  resume: (sessionId: string): Promise<InterviewSession | null> =>
    ipcRenderer.invoke('interview:resume', sessionId),

  /**
   * Resume a session by project ID
   * @param projectId - Project ID to find active session for
   * @returns Promise with session or null
   */
  resumeByProject: (projectId: string): Promise<InterviewSession | null> =>
    ipcRenderer.invoke('interview:resumeByProject', projectId),

  /**
   * End an interview session
   * @param sessionId - Session ID to end
   * @returns Promise that resolves when session is ended and saved
   */
  end: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('interview:end', sessionId),

  /**
   * Pause an interview session
   * @param sessionId - Session ID to pause
   * @returns Promise that resolves when session is paused and saved
   */
  pause: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('interview:pause', sessionId),

  /**
   * Get the initial greeting message
   * @returns Promise with greeting string
   */
  getGreeting: (): Promise<string> =>
    ipcRenderer.invoke('interview:getGreeting'),
};

/** Type for the interview API */
export type InterviewAPI = typeof interviewAPI;
