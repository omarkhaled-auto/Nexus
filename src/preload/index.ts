/**
 * Preload Script - Nexus API
 * Phase 05-04: Complete IPC bridge to main process
 * Phase 12-01: Settings API for secure settings storage
 *
 * Security:
 * - Uses contextBridge to safely expose API to renderer
 * - Never exposes raw ipcRenderer
 * - Never passes event object to callbacks
 * - Returns unsubscribe functions for cleanup
 */

import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { interviewAPI } from './interview-api'
import type { NexusSettingsPublic, LLMProvider, SettingsAPI } from '../shared/types/settings'

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
   * List all projects
   * @returns Promise with array of all projects
   */
  getProjects: (): Promise<unknown[]> =>
    ipcRenderer.invoke('projects:list'),

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
  // Dashboard Data API (Phase 17)
  // ========================================

  /**
   * Get dashboard metrics overview
   * @returns Promise with aggregated metrics for dashboard
   */
  getDashboardMetrics: (): Promise<unknown> =>
    ipcRenderer.invoke('dashboard:getMetrics'),

  /**
   * Get cost metrics
   * @returns Promise with token usage and cost breakdown
   */
  getDashboardCosts: (): Promise<unknown> =>
    ipcRenderer.invoke('dashboard:getCosts'),

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
  // Feature Operations (Phase 17 - Kanban)
  // ========================================

  /**
   * Get all features for Kanban board
   * @returns Promise with array of features
   */
  getFeatures: (): Promise<unknown[]> => ipcRenderer.invoke('features:list'),

  /**
   * Get a single feature by ID
   * @param id - Feature ID
   * @returns Promise with feature data or null
   */
  getFeature: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('feature:get', id),

  /**
   * Create a new feature
   * @param input - Feature creation data
   * @returns Promise with created feature
   */
  createFeature: (input: {
    title: string
    description?: string
    priority?: string
    complexity?: string
  }): Promise<unknown> => ipcRenderer.invoke('feature:create', input),

  /**
   * Update a feature
   * @param id - Feature ID
   * @param update - Partial feature update
   * @returns Promise with updated feature
   */
  updateFeature: (id: string, update: Record<string, unknown>): Promise<unknown> =>
    ipcRenderer.invoke('feature:update', id, update),

  /**
   * Delete a feature
   * @param id - Feature ID
   * @returns Promise that resolves on success
   */
  deleteFeature: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('feature:delete', id),

  /**
   * Subscribe to feature update events
   * @param callback - Called when a feature is updated
   * @returns Unsubscribe function
   */
  onFeatureUpdate: (callback: (feature: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, feature: unknown): void => {
      callback(feature)
    }
    ipcRenderer.on('feature:updated', handler)
    return () => {
      ipcRenderer.removeListener('feature:updated', handler)
    }
  },

  // ========================================
  // Agent Operations (Phase 17 - Agents Page)
  // ========================================

  /**
   * Get status of all agents (legacy)
   * @returns Promise with array of agent statuses
   */
  getAgentStatus: (): Promise<unknown[]> => ipcRenderer.invoke('agents:status'),

  /**
   * List all agents with detailed data
   * @returns Promise with array of agent data
   */
  getAgents: (): Promise<unknown[]> => ipcRenderer.invoke('agents:list'),

  /**
   * Get a single agent by ID
   * @param id - Agent ID
   * @returns Promise with agent data or null
   */
  getAgent: (id: string): Promise<unknown> => ipcRenderer.invoke('agents:get', id),

  /**
   * Get agent pool status overview
   * @returns Promise with pool status
   */
  getAgentPoolStatus: (): Promise<unknown> => ipcRenderer.invoke('agents:getPoolStatus'),

  /**
   * Get agent output/logs
   * @param id - Agent ID
   * @returns Promise with array of log lines
   */
  getAgentOutput: (id: string): Promise<string[]> => ipcRenderer.invoke('agents:getOutput', id),

  /**
   * Get QA status for current execution
   * @returns Promise with QA pipeline status
   */
  getQAStatus: (): Promise<unknown> => ipcRenderer.invoke('agents:getQAStatus'),

  /**
   * Subscribe to agent output events (streaming logs)
   * @param callback - Called when new log line arrives
   * @returns Unsubscribe function
   */
  onAgentOutput: (callback: (data: { agentId: string; line: string }) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { agentId: string; line: string }): void => {
      callback(data)
    }
    ipcRenderer.on('agent:output', handler)
    return () => {
      ipcRenderer.removeListener('agent:output', handler)
    }
  },

  /**
   * Subscribe to QA status update events
   * @param callback - Called when QA status changes
   * @returns Unsubscribe function
   */
  onQAStatusUpdate: (callback: (status: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, status: unknown): void => {
      callback(status)
    }
    ipcRenderer.on('qa:status', handler)
    return () => {
      ipcRenderer.removeListener('qa:status', handler)
    }
  },

  // ========================================
  // ========================================
  // Execution Control & Logs (Phase 17 - Task 30.5)
  // ========================================

  /**
   * Pause execution gracefully
   * @param reason - Optional reason for pausing
   * @returns Promise with success status
   */
  pauseExecution: (reason?: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('execution:pause', reason),

  /**
   * Get execution logs for a specific QA step
   * @param stepType - The step type: 'build', 'lint', 'test', or 'review'
   * @returns Promise with array of log entries
   */
  getExecutionLogs: (stepType: string): Promise<unknown[]> =>
    ipcRenderer.invoke('execution:getLogs', stepType),

  /**
   * Get execution status for all QA steps
   * @returns Promise with execution status object
   */
  getExecutionStatus: (): Promise<{
    steps: Array<{
      type: 'build' | 'lint' | 'test' | 'review'
      status: 'pending' | 'running' | 'success' | 'error'
      count?: number
      duration?: number
      logs: unknown[]
    }>
    currentTaskId: string | null
    currentTaskName: string | null
    totalDuration: number
  }> => ipcRenderer.invoke('execution:getStatus'),

  /**
   * Clear all execution logs
   * @returns Promise with success status
   */
  clearExecutionLogs: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('execution:clearLogs'),

  /**
   * Export execution logs to a formatted string
   * @returns Promise with formatted log string
   */
  exportExecutionLogs: (): Promise<string> =>
    ipcRenderer.invoke('execution:exportLogs'),

  /**
   * Subscribe to execution log update events (real-time streaming)
   * @param callback - Called when new log entries arrive
   * @returns Unsubscribe function
   */
  onExecutionLogUpdate: (callback: (data: { stepType: string; log: unknown }) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { stepType: string; log: unknown }): void => {
      callback(data)
    }
    ipcRenderer.on('execution:log', handler)
    return () => {
      ipcRenderer.removeListener('execution:log', handler)
    }
  },

  /**
   * Subscribe to execution status change events
   * @param callback - Called when status changes for any step
   * @returns Unsubscribe function
   */
  onExecutionStatusChange: (callback: (data: { stepType: string; status: string }) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { stepType: string; status: string }): void => {
      callback(data)
    }
    ipcRenderer.on('execution:status', handler)
    return () => {
      ipcRenderer.removeListener('execution:status', handler)
    }
  },

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
  // Generic Event Emission (BUILD-015)
  // ========================================

  /**
   * Generic event emission to main process EventBus
   * @param channel - Event channel name (e.g., 'feature:created')
   * @param payload - Event payload data
   * @returns Promise that resolves on success
   */
  emitEvent: (channel: string, payload: unknown): Promise<void> =>
    ipcRenderer.invoke('eventbus:emit', channel, payload),

  // ========================================
  // Checkpoint API (Phase 10)
  // ========================================

  /**
   * List checkpoints for a project
   * @param projectId - Project ID to list checkpoints for
   * @returns Promise with array of checkpoints
   */
  checkpointList: (projectId: string): Promise<unknown[]> =>
    ipcRenderer.invoke('checkpoint:list', projectId),

  /**
   * Create a new checkpoint
   * @param projectId - Project ID to checkpoint
   * @param reason - Reason for the checkpoint
   * @returns Promise with created checkpoint
   */
  checkpointCreate: (projectId: string, reason: string): Promise<unknown> =>
    ipcRenderer.invoke('checkpoint:create', projectId, reason),

  /**
   * Restore state from a checkpoint
   * @param checkpointId - Checkpoint ID to restore
   * @param restoreGit - Whether to also restore git state
   * @returns Promise that resolves on success
   */
  checkpointRestore: (checkpointId: string, restoreGit?: boolean): Promise<void> =>
    ipcRenderer.invoke('checkpoint:restore', checkpointId, restoreGit),

  /**
   * Delete a checkpoint
   * @param checkpointId - Checkpoint ID to delete
   * @returns Promise that resolves on success
   */
  checkpointDelete: (checkpointId: string): Promise<void> =>
    ipcRenderer.invoke('checkpoint:delete', checkpointId),

  // ========================================
  // Review API (Phase 10)
  // ========================================

  /**
   * List pending reviews
   * @returns Promise with array of pending reviews
   */
  reviewList: (): Promise<unknown[]> =>
    ipcRenderer.invoke('review:list'),

  /**
   * Get a specific review by ID
   * @param reviewId - Review ID to get
   * @returns Promise with review or undefined
   */
  reviewGet: (reviewId: string): Promise<unknown> =>
    ipcRenderer.invoke('review:get', reviewId),

  /**
   * Approve a pending review
   * @param reviewId - Review ID to approve
   * @param resolution - Optional resolution notes
   * @returns Promise that resolves on success
   */
  reviewApprove: (reviewId: string, resolution?: string): Promise<void> =>
    ipcRenderer.invoke('review:approve', reviewId, resolution),

  /**
   * Reject a pending review
   * @param reviewId - Review ID to reject
   * @param feedback - Required feedback for rejection
   * @returns Promise that resolves on success
   */
  reviewReject: (reviewId: string, feedback: string): Promise<void> =>
    ipcRenderer.invoke('review:reject', reviewId, feedback),

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

  // ========================================
  // Dashboard Event Subscriptions (BUILD-016)
  // ========================================

  /**
   * Subscribe to metrics update events
   * @param callback - Called when overview metrics are updated
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onMetricsUpdate: (callback: (metrics: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, metrics: unknown): void => {
      callback(metrics)
    }
    ipcRenderer.on('metrics:updated', handler)
    return () => {
      ipcRenderer.removeListener('metrics:updated', handler)
    }
  },

  /**
   * Subscribe to agent status update events
   * @param callback - Called when agent metrics change
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onAgentStatusUpdate: (callback: (status: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, status: unknown): void => {
      callback(status)
    }
    ipcRenderer.on('agent:metrics', handler)
    return () => {
      ipcRenderer.removeListener('agent:metrics', handler)
    }
  },

  /**
   * Subscribe to timeline event notifications
   * @param callback - Called when new timeline events occur
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onTimelineEvent: (callback: (event: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, timelineEvent: unknown): void => {
      callback(timelineEvent)
    }
    ipcRenderer.on('timeline:event', handler)
    return () => {
      ipcRenderer.removeListener('timeline:event', handler)
    }
  },

  /**
   * Subscribe to cost update events
   * @param callback - Called when cost metrics change
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onCostUpdate: (callback: (costs: unknown) => void): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, costs: unknown): void => {
      callback(costs)
    }
    ipcRenderer.on('costs:updated', handler)
    return () => {
      ipcRenderer.removeListener('costs:updated', handler)
    }
  },

  // ========================================
  // Settings API (Phase 12-01)
  // ========================================

  /**
   * Settings operations for secure settings storage
   */
  settings: {
    /**
     * Get all settings (public view with hasXxxKey flags)
     * @returns Promise with all settings
     */
    getAll: (): Promise<NexusSettingsPublic> =>
      ipcRenderer.invoke('settings:getAll'),

    /**
     * Get a single setting by dot-notation path
     * @param key - Setting path (e.g., 'ui.theme')
     * @returns Promise with setting value
     */
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:get', key),

    /**
     * Set a single setting by dot-notation path
     * @param key - Setting path (e.g., 'ui.theme')
     * @param value - New value
     * @returns Promise with success status
     */
    set: (key: string, value: unknown): Promise<boolean> =>
      ipcRenderer.invoke('settings:set', key, value),

    /**
     * Set an API key securely (encrypted via safeStorage)
     * @param provider - LLM provider ('claude', 'gemini', 'openai')
     * @param key - Plain text API key
     * @returns Promise with success status
     */
    setApiKey: (provider: LLMProvider, key: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:setApiKey', provider, key),

    /**
     * Check if an API key is set for a provider
     * @param provider - LLM provider
     * @returns Promise with boolean
     */
    hasApiKey: (provider: LLMProvider): Promise<boolean> =>
      ipcRenderer.invoke('settings:hasApiKey', provider),

    /**
     * Clear an API key for a provider
     * @param provider - LLM provider
     * @returns Promise with success status
     */
    clearApiKey: (provider: LLMProvider): Promise<boolean> =>
      ipcRenderer.invoke('settings:clearApiKey', provider),

    /**
     * Reset all settings to defaults (also clears API keys)
     * @returns Promise with success status
     */
    reset: (): Promise<boolean> =>
      ipcRenderer.invoke('settings:reset'),
  } satisfies SettingsAPI,

  // ========================================
  // Interview Engine API (Phase 9)
  // ========================================

  /**
   * Interview operations via InterviewEngine backend
   */
  interview: interviewAPI,
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
