/**
 * IPC Handlers - Main Process
 * Phase 05-04: IPC handlers connecting renderer to orchestration layer
 * Phase 06: Interview event handlers (BUILD-014)
 *
 * Security:
 * - Validates sender origin for all handlers
 * - Never trusts input without validation
 * - Uses invoke pattern (request-response)
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { EventBus } from '../../orchestration/events/EventBus'

/**
 * Allowed origins for IPC communication
 * - localhost:5173 for Vite dev server
 * - file:// for production builds
 */
const ALLOWED_ORIGINS = ['http://localhost:5173', 'file://']

/**
 * Validate IPC sender is from allowed origin
 * Security: Prevents malicious pages from invoking IPC handlers
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL()
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))
}

/**
 * Orchestration state holder
 * Will be wired to real NexusCoordinator when dependencies are ready
 */
interface OrchestrationState {
  mode: 'genesis' | 'evolution' | null
  projectId: string | null
  projects: Map<string, { id: string; name: string; mode: 'genesis' | 'evolution' }>
  tasks: Map<string, { id: string; name: string; status: string }>
  agents: Map<string, { id: string; type: string; status: string }>
}

// Orchestration state (will be replaced by real coordinator)
const state: OrchestrationState = {
  mode: null,
  projectId: null,
  projects: new Map(),
  tasks: new Map(),
  agents: new Map(),
}

/**
 * Register all IPC handlers for Nexus operations
 * Must be called in app.whenReady()
 */
export function registerIpcHandlers(): void {
  // Mode operations
  ipcMain.handle('mode:genesis', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    state.mode = 'genesis'
    const projectId = `genesis-${Date.now()}`
    state.projectId = projectId
    state.projects.set(projectId, {
      id: projectId,
      name: `Genesis Project ${state.projects.size + 1}`,
      mode: 'genesis',
    })

    return { success: true, projectId }
  })

  ipcMain.handle('mode:evolution', async (event, projectId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('Invalid projectId')
    }

    // Verify project exists
    if (!state.projects.has(projectId)) {
      throw new Error(`Project not found: ${projectId}`)
    }

    state.mode = 'evolution'
    state.projectId = projectId

    return { success: true }
  })

  // Project operations
  ipcMain.handle('project:get', async (event, id: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid project id')
    }

    const project = state.projects.get(id)
    if (!project) {
      return null
    }

    return project
  })

  ipcMain.handle(
    'project:create',
    async (
      event,
      input: { name: string; mode: 'genesis' | 'evolution' }
    ) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (!input || typeof input.name !== 'string' || !input.name) {
        throw new Error('Invalid project name')
      }
      if (input.mode !== 'genesis' && input.mode !== 'evolution') {
        throw new Error('Invalid project mode')
      }

      const id = `project-${Date.now()}`
      const project = { id, name: input.name, mode: input.mode }
      state.projects.set(id, project)

      return { id }
    }
  )

  // Task operations
  ipcMain.handle('tasks:list', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.tasks.values())
  })

  ipcMain.handle(
    'task:update',
    async (event, id: string, update: Record<string, unknown>) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof id !== 'string' || !id) {
        throw new Error('Invalid task id')
      }

      const task = state.tasks.get(id)
      if (!task) {
        throw new Error(`Task not found: ${id}`)
      }

      // Merge update (only allow safe properties)
      const allowedKeys = ['name', 'status', 'assignedAgent']
      for (const key of allowedKeys) {
        if (key in update) {
          ;(task as Record<string, unknown>)[key] = update[key]
        }
      }
      state.tasks.set(id, task)

      return undefined
    }
  )

  // Agent operations
  ipcMain.handle('agents:status', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.agents.values())
  })

  // Execution control
  ipcMain.handle('execution:pause', async (event, reason?: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Will be wired to NexusCoordinator.pause() when coordinator is available
    // For now, emit event that execution was paused
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:paused', { reason })
    }

    return { success: true }
  })

  // ========================================
  // Interview Events (BUILD-014)
  // ========================================

  ipcMain.handle(
    'interview:emit-started',
    async (
      event,
      payload: { projectName: string | null; mode: 'genesis' | 'evolution' }
    ) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || `interview-${Date.now()}`

      eventBus.emit(
        'interview:started',
        {
          projectId,
          projectName: payload.projectName || 'Untitled Project',
          mode: payload.mode
        },
        { source: 'InterviewUI' }
      )
    }
  )

  ipcMain.handle(
    'interview:emit-message',
    async (
      event,
      payload: { messageId: string; role: 'user' | 'assistant'; content: string }
    ) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      eventBus.emit(
        'interview:question-asked',
        {
          projectId,
          questionId: payload.messageId,
          question: payload.content,
          category: payload.role === 'assistant' ? 'ai-response' : 'user-input'
        },
        { source: 'InterviewUI' }
      )
    }
  )

  ipcMain.handle(
    'interview:emit-requirement',
    async (
      event,
      payload: {
        requirementId: string
        category: string
        text: string
        priority: string
      }
    ) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      // Map frontend categories (underscores) to backend categories (hyphens)
      const categoryMap: Record<string, string> = {
        non_functional: 'non-functional',
        user_story: 'business-logic',
        constraint: 'technical'
      }
      const mappedCategory = categoryMap[payload.category] || payload.category

      eventBus.emit(
        'interview:requirement-captured',
        {
          projectId,
          requirement: {
            id: payload.requirementId,
            projectId,
            category: mappedCategory as
              | 'functional'
              | 'non-functional'
              | 'ui-ux'
              | 'technical'
              | 'business-logic'
              | 'integration',
            description: payload.text,
            priority: payload.priority as 'must' | 'should' | 'could' | 'wont',
            userStories: [],
            acceptanceCriteria: [],
            linkedFeatures: [],
            validated: false,
            confidence: 1,
            tags: [],
            createdAt: new Date()
          }
        },
        { source: 'InterviewUI' }
      )
    }
  )

  ipcMain.handle(
    'interview:emit-completed',
    async (
      event,
      payload: {
        requirementCount: number
        categories: string[]
        duration: number
      }
    ) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      eventBus.emit(
        'interview:completed',
        {
          projectId,
          totalRequirements: payload.requirementCount,
          categories: payload.categories,
          duration: payload.duration
        },
        { source: 'InterviewUI' }
      )
    }
  )

  // ========================================
  // Generic Event Emission (BUILD-015)
  // ========================================

  ipcMain.handle(
    'eventbus:emit',
    async (event, channel: string, payload: unknown) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      if (typeof channel !== 'string' || !channel) {
        throw new Error('Invalid event channel')
      }

      const eventBus = EventBus.getInstance()

      // Emit generic event with payload
      // The channel should be a valid event type (e.g., 'feature:created')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.emit(channel as any, payload as any, { source: 'RendererUI' })
    }
  )
}

/**
 * Set up event forwarding from backend to renderer
 * Forwards orchestration events via IPC send
 *
 * @param mainWindow - BrowserWindow to send events to
 */
export function setupEventForwarding(mainWindow: BrowserWindow): void {
  // In a full implementation, this would subscribe to EventBus
  // For now, we expose methods that can be called when events occur

  // Store reference for forwarding
  eventForwardingWindow = mainWindow
}

// Reference to main window for event forwarding
let eventForwardingWindow: BrowserWindow | null = null

/**
 * Forward a task update event to the renderer
 */
export function forwardTaskUpdate(task: Record<string, unknown>): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('task:updated', task)
  }
}

/**
 * Forward an agent status event to the renderer
 */
export function forwardAgentStatus(status: Record<string, unknown>): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('agent:status', status)
  }
}

/**
 * Forward execution progress event to the renderer
 */
export function forwardExecutionProgress(
  progress: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('execution:progress', progress)
  }
}

// ========================================
// Dashboard Event Forwarding (BUILD-016)
// ========================================

/**
 * Forward overview metrics update to the renderer
 */
export function forwardMetricsUpdate(
  metrics: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('metrics:updated', metrics)
  }
}

/**
 * Forward agent metrics update to the renderer
 */
export function forwardAgentMetrics(
  agentMetrics: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('agent:metrics', agentMetrics)
  }
}

/**
 * Forward timeline event to the renderer
 */
export function forwardTimelineEvent(
  timelineEvent: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('timeline:event', timelineEvent)
  }
}

/**
 * Forward cost update to the renderer
 */
export function forwardCostUpdate(
  costs: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('costs:updated', costs)
  }
}
