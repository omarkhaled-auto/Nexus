/**
 * Preload Script - Nexus API
 * Phase 05-04: Complete IPC bridge to main process
 *
 * Security:
 * - Uses contextBridge to safely expose API to renderer
 * - Never exposes raw ipcRenderer
 * - Never passes event object to callbacks
 * - Returns unsubscribe functions for cleanup
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/** Type-safe unsubscribe function */
type Unsubscribe = () => void

/**
 * Nexus API exposed to the renderer process via contextBridge.
 *
 * All methods use ipcRenderer.invoke for request-response patterns.
 * Event subscriptions return unsubscribe functions.
 */
const nexusAPI = {
  // ========================================
  // Mode Operations
  // ========================================

  /**
   * Start Genesis mode - create new project from scratch
   * @returns Promise with success status and new projectId
   */
  startGenesis: (): Promise<{ success: boolean; projectId?: string }> =>
    ipcRenderer.invoke('mode:genesis'),

  /**
   * Start Evolution mode - work on existing project
   * @param projectId - ID of project to evolve
   * @returns Promise with success status
   */
  startEvolution: (projectId: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('mode:evolution', projectId),

  // ========================================
  // Project Operations
  // ========================================

  /**
   * Get project by ID
   * @param id - Project ID
   * @returns Promise with project data or null
   */
  getProject: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('project:get', id),

  /**
   * Create a new project
   * @param input - Project name and mode
   * @returns Promise with new project ID
   */
  createProject: (input: {
    name: string
    mode: 'genesis' | 'evolution'
  }): Promise<{ id: string }> => ipcRenderer.invoke('project:create', input),

  // ========================================
  // Task Operations
  // ========================================

  /**
   * Get all tasks
   * @returns Promise with array of tasks
   */
  getTasks: (): Promise<unknown[]> => ipcRenderer.invoke('tasks:list'),

  /**
   * Update a task
   * @param id - Task ID
   * @param update - Partial task update
   * @returns Promise that resolves on success
   */
  updateTask: (id: string, update: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('task:update', id, update),

  // ========================================
  // Agent Operations
  // ========================================

  /**
   * Get status of all agents
   * @returns Promise with array of agent statuses
   */
  getAgentStatus: (): Promise<unknown[]> => ipcRenderer.invoke('agents:status'),

  // ========================================
  // Execution Control
  // ========================================

  /**
   * Pause execution gracefully
   * @param reason - Optional reason for pausing
   * @returns Promise with success status
   */
  pauseExecution: (reason?: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('execution:pause', reason),

  // ========================================
  // Interview Events (BUILD-014)
  // ========================================

  /**
   * Emit interview started event
   */
  emitInterviewStarted: (payload: {
    projectName: string | null
    mode: 'genesis' | 'evolution'
  }): Promise<void> => ipcRenderer.invoke('interview:emit-started', payload),

  /**
   * Emit interview message event
   */
  emitInterviewMessage: (payload: {
    messageId: string
    role: 'user' | 'assistant'
    content: string
  }): Promise<void> => ipcRenderer.invoke('interview:emit-message', payload),

  /**
   * Emit interview requirement captured event
   */
  emitInterviewRequirement: (payload: {
    requirementId: string
    category: string
    text: string
    priority: string
  }): Promise<void> => ipcRenderer.invoke('interview:emit-requirement', payload),

  /**
   * Emit interview completed event
   */
  emitInterviewCompleted: (payload: {
    requirementCount: number
    categories: string[]
    duration: number
  }): Promise<void> => ipcRenderer.invoke('interview:emit-completed', payload),

  // ========================================
  // Event Subscriptions
  // ========================================

  /**
   * Subscribe to task update events
   * @param callback - Called when a task is updated
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onTaskUpdate: (callback: (task: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, task: unknown): void => {
      callback(task)
    }
    ipcRenderer.on('task:updated', handler)
    return () => {
      ipcRenderer.removeListener('task:updated', handler)
    }
  },

  /**
   * Subscribe to agent status events
   * @param callback - Called when agent status changes
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onAgentStatus: (callback: (status: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, status: unknown): void => {
      callback(status)
    }
    ipcRenderer.on('agent:status', handler)
    return () => {
      ipcRenderer.removeListener('agent:status', handler)
    }
  },

  /**
   * Subscribe to execution progress events
   * @param callback - Called with progress updates
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onExecutionProgress: (callback: (progress: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, progress: unknown): void => {
      callback(progress)
    }
    ipcRenderer.on('execution:progress', handler)
    return () => {
      ipcRenderer.removeListener('execution:progress', handler)
    }
  },
}

// Expose the API to the renderer process via contextBridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('nexusAPI', nexusAPI)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // Fallback for non-isolated context (should not happen in production)
  window.electron = electronAPI
  window.nexusAPI = nexusAPI
}

// Export type for use in other files
export type NexusAPI = typeof nexusAPI

// Global type declaration
declare global {
  interface Window {
    electron: typeof electronAPI
    nexusAPI: typeof nexusAPI
  }
}
