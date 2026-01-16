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
import { useMetricsStore } from '../stores/metricsStore'
import type { OverviewMetrics, AgentMetrics, TimelineEvent, CostMetrics } from '../types/metrics'

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
  initialize(): void {
    if (this.initialized) return

    // Guard against missing nexusAPI (e.g., during tests or non-Electron context)
    if (!window.nexusAPI) {
      console.warn('UIBackendBridge: window.nexusAPI not available, skipping event subscriptions')
      this.initialized = true
      return
    }

    // Subscribe to task update events
    if (window.nexusAPI.onTaskUpdate) {
      const unsubTask = window.nexusAPI.onTaskUpdate((task) => {
        const typedTask = task as Task
        if (typedTask && typedTask.id) {
          useTaskStore.getState().updateTask(typedTask.id, typedTask)
        }
      })
      this.unsubscribers.push(unsubTask)
    }

    // Subscribe to agent status events
    if (window.nexusAPI.onAgentStatus) {
      const unsubAgent = window.nexusAPI.onAgentStatus((status) => {
        const typedStatus = status as AgentStatus
        if (typedStatus && typedStatus.id) {
          useAgentStore.getState().setAgentStatus(typedStatus)
        }
      })
      this.unsubscribers.push(unsubAgent)
    }

    // Subscribe to execution progress events
    if (window.nexusAPI.onExecutionProgress) {
      const unsubProgress = window.nexusAPI.onExecutionProgress((progress) => {
        // Log progress for now - could update a progress store in future
        console.log('Execution progress:', progress)
      })
      this.unsubscribers.push(unsubProgress)
    }

    // ========================================
    // Dashboard Subscriptions (BUILD-016)
    // ========================================

    // Subscribe to metrics update events
    if (window.nexusAPI?.onMetricsUpdate) {
      const unsubMetrics = window.nexusAPI.onMetricsUpdate((metrics) => {
        const typedMetrics = metrics as OverviewMetrics
        if (typedMetrics) {
          useMetricsStore.getState().setOverview(typedMetrics)
        }
      })
      this.unsubscribers.push(unsubMetrics)
    }

    // Subscribe to agent status update events
    if (window.nexusAPI?.onAgentStatusUpdate) {
      const unsubAgentStatus = window.nexusAPI.onAgentStatusUpdate((status) => {
        const typedStatus = status as AgentMetrics
        if (typedStatus && typedStatus.id) {
          useMetricsStore.getState().updateAgentMetrics(typedStatus.id, typedStatus)
        }
      })
      this.unsubscribers.push(unsubAgentStatus)
    }

    // Subscribe to timeline event notifications
    if (window.nexusAPI?.onTimelineEvent) {
      const unsubTimeline = window.nexusAPI.onTimelineEvent((event) => {
        const typedEvent = event as TimelineEvent
        if (typedEvent && typedEvent.id) {
          useMetricsStore.getState().addTimelineEvent(typedEvent)
        }
      })
      this.unsubscribers.push(unsubTimeline)
    }

    // Subscribe to cost update events
    if (window.nexusAPI?.onCostUpdate) {
      const unsubCosts = window.nexusAPI.onCostUpdate((costs) => {
        const typedCosts = costs as CostMetrics
        if (typedCosts) {
          useMetricsStore.getState().setCosts(typedCosts)
        }
      })
      this.unsubscribers.push(unsubCosts)
    }

    this.initialized = true
  }

  /**
   * Start Genesis mode - create new project from scratch
   */
  async startGenesis(): Promise<void> {
    // Guard against missing nexusAPI
    if (!window.nexusAPI?.startGenesis) {
      console.warn('UIBackendBridge: startGenesis not available')
      useProjectStore.getState().setMode('genesis')
      return
    }

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
    // Guard against missing nexusAPI
    if (!window.nexusAPI?.startEvolution) {
      console.warn('UIBackendBridge: startEvolution not available')
      useProjectStore.getState().setMode('evolution')
      return
    }

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
    if (!window.nexusAPI?.getTasks) {
      console.warn('UIBackendBridge: getTasks not available')
      return
    }
    const tasks = await window.nexusAPI.getTasks()
    useTaskStore.getState().setTasks(tasks as Task[])
  }

  /**
   * Load agent status from backend
   */
  async loadAgentStatus(): Promise<void> {
    if (!window.nexusAPI?.getAgentStatus) {
      console.warn('UIBackendBridge: getAgentStatus not available')
      return
    }
    const agents = await window.nexusAPI.getAgentStatus()
    for (const agent of agents as AgentStatus[]) {
      useAgentStore.getState().setAgentStatus(agent)
    }
  }

  /**
   * Pause execution gracefully
   * Calls NexusCoordinator.pause() via IPC
   * @param reason - Optional reason for pausing
   */
  async pauseExecution(reason?: string): Promise<void> {
    if (!window.nexusAPI?.pauseExecution) {
      console.warn('UIBackendBridge: pauseExecution not available')
      return
    }

    useUIStore.getState().setLoading(true)
    try {
      const result = await window.nexusAPI.pauseExecution(reason)
      if (!result.success) {
        throw new Error('Failed to pause execution')
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
   * Check if bridge is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.unsubscribers.forEach((unsub) => { unsub(); })
    this.unsubscribers = []
    this.initialized = false
  }
}

// Export singleton instance
export const uiBackendBridge = UIBackendBridge.getInstance()
export { UIBackendBridge }
