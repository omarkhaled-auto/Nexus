/**
 * UIBackendBridge - Connects UI Stores to Backend Orchestration
 * Phase 05-04: Bridge between React Zustand stores and Electron IPC
 *
 * This bridge:
 * - Subscribes to backend events via IPC
 * - Updates Zustand stores when events arrive
 * - Provides methods to invoke backend operations
 * - Manages cleanup of subscriptions
 */

import { useProjectStore } from '../stores/projectStore'
import { useTaskStore, type Task } from '../stores/taskStore'
import { useAgentStore, type AgentStatus } from '../stores/agentStore'
import { useUIStore } from '../stores/uiStore'

type Unsubscribe = () => void

/**
 * Bridge connecting UI Zustand stores to backend orchestration via IPC.
 * Singleton pattern - use getInstance().
 */
class UIBackendBridge {
  private static instance: UIBackendBridge | undefined
  private unsubscribers: Unsubscribe[] = []
  private initialized = false

  /**
   * Get singleton instance
   */
  static getInstance(): UIBackendBridge {
    if (!UIBackendBridge.instance) {
      UIBackendBridge.instance = new UIBackendBridge()
    }
    return UIBackendBridge.instance
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (UIBackendBridge.instance) {
      UIBackendBridge.instance.cleanup()
    }
    UIBackendBridge.instance = undefined
  }

  /**
   * Initialize the bridge - subscribe to backend events
   * Safe to call multiple times (idempotent)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Subscribe to task update events
    const unsubTask = window.nexusAPI.onTaskUpdate((task) => {
      const typedTask = task as Task
      if (typedTask && typedTask.id) {
        useTaskStore.getState().updateTask(typedTask.id, typedTask)
      }
    })

    // Subscribe to agent status events
    const unsubAgent = window.nexusAPI.onAgentStatus((status) => {
      const typedStatus = status as AgentStatus
      if (typedStatus && typedStatus.id) {
        useAgentStore.getState().setAgentStatus(typedStatus)
      }
    })

    // Subscribe to execution progress events
    const unsubProgress = window.nexusAPI.onExecutionProgress((progress) => {
      // Log progress for now - could update a progress store in future
      console.log('Execution progress:', progress)
    })

    this.unsubscribers.push(unsubTask, unsubAgent, unsubProgress)
    this.initialized = true
  }

  /**
   * Start Genesis mode - create new project from scratch
   */
  async startGenesis(): Promise<void> {
    useUIStore.getState().setLoading(true)
    try {
      useProjectStore.getState().setMode('genesis')
      const result = await window.nexusAPI.startGenesis()
      if (!result.success) {
        throw new Error('Failed to start Genesis mode')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      useUIStore.getState().setError(message)
      throw error
    } finally {
      useUIStore.getState().setLoading(false)
    }
  }

  /**
   * Start Evolution mode - work on existing project
   * @param projectId - ID of project to evolve
   */
  async startEvolution(projectId: string): Promise<void> {
    useUIStore.getState().setLoading(true)
    try {
      useProjectStore.getState().setMode('evolution')
      const result = await window.nexusAPI.startEvolution(projectId)
      if (!result.success) {
        throw new Error('Failed to start Evolution mode')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      useUIStore.getState().setError(message)
      throw error
    } finally {
      useUIStore.getState().setLoading(false)
    }
  }

  /**
   * Load all tasks from backend
   */
  async loadTasks(): Promise<void> {
    const tasks = await window.nexusAPI.getTasks()
    useTaskStore.getState().setTasks(tasks as Task[])
  }

  /**
   * Load agent status from backend
   */
  async loadAgentStatus(): Promise<void> {
    const agents = await window.nexusAPI.getAgentStatus()
    for (const agent of agents as AgentStatus[]) {
      useAgentStore.getState().setAgentStatus(agent)
    }
  }

  /**
   * Check if bridge is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.initialized = false
  }
}

// Export singleton instance
export const uiBackendBridge = UIBackendBridge.getInstance()
export { UIBackendBridge }
