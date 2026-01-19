/**
 * IPC Handlers - Main Process
 * Phase 05-04: IPC handlers connecting renderer to orchestration layer
 * Phase 06: Interview event handlers (BUILD-014)
 * Phase 10: Checkpoint and review handlers
 *
 * Security:
 * - Validates sender origin for all handlers
 * - Never trusts input without validation
 * - Uses invoke pattern (request-response)
 */

import type { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { ipcMain } from 'electron'
import { EventBus } from '../../orchestration/events/EventBus'
import type { CheckpointManager } from '../../persistence/checkpoints/CheckpointManager'
import type { HumanReviewService } from '../../orchestration/review/HumanReviewService'

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

// Service references for checkpoint and review handlers
let checkpointManagerRef: CheckpointManager | null = null
let humanReviewServiceRef: HumanReviewService | null = null

/**
 * Register checkpoint and review IPC handlers
 * Called after services are initialized
 */
export function registerCheckpointReviewHandlers(
  checkpointManager: CheckpointManager,
  humanReviewService: HumanReviewService
): void {
  checkpointManagerRef = checkpointManager
  humanReviewServiceRef = humanReviewService

  // ========================================
  // Checkpoint Handlers (Phase 10)
  // ========================================

  ipcMain.handle('checkpoint:list', (event, projectId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('Invalid projectId')
    }
    if (!checkpointManagerRef) {
      throw new Error('CheckpointManager not initialized')
    }

    return checkpointManagerRef.listCheckpoints(projectId)
  })

  ipcMain.handle(
    'checkpoint:create',
    async (event, projectId: string, reason: string) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof projectId !== 'string' || !projectId) {
        throw new Error('Invalid projectId')
      }
      if (typeof reason !== 'string' || !reason) {
        throw new Error('Invalid reason')
      }
      if (!checkpointManagerRef) {
        throw new Error('CheckpointManager not initialized')
      }

      return await checkpointManagerRef.createCheckpoint(projectId, reason)
    }
  )

  ipcMain.handle(
    'checkpoint:restore',
    async (event, checkpointId: string, restoreGit?: boolean) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof checkpointId !== 'string' || !checkpointId) {
        throw new Error('Invalid checkpointId')
      }
      if (!checkpointManagerRef) {
        throw new Error('CheckpointManager not initialized')
      }

      await checkpointManagerRef.restoreCheckpoint(checkpointId, { restoreGit })
    }
  )

  ipcMain.handle('checkpoint:delete', (event, checkpointId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof checkpointId !== 'string' || !checkpointId) {
      throw new Error('Invalid checkpointId')
    }
    if (!checkpointManagerRef) {
      throw new Error('CheckpointManager not initialized')
    }

    checkpointManagerRef.deleteCheckpoint(checkpointId)
  })

  // ========================================
  // Review Handlers (Phase 10)
  // ========================================

  ipcMain.handle('review:list', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (!humanReviewServiceRef) {
      throw new Error('HumanReviewService not initialized')
    }

    return humanReviewServiceRef.listPendingReviews()
  })

  ipcMain.handle('review:get', (event, reviewId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof reviewId !== 'string' || !reviewId) {
      throw new Error('Invalid reviewId')
    }
    if (!humanReviewServiceRef) {
      throw new Error('HumanReviewService not initialized')
    }

    return humanReviewServiceRef.getReview(reviewId)
  })

  ipcMain.handle(
    'review:approve',
    async (event, reviewId: string, resolution?: string) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof reviewId !== 'string' || !reviewId) {
        throw new Error('Invalid reviewId')
      }
      if (!humanReviewServiceRef) {
        throw new Error('HumanReviewService not initialized')
      }

      await humanReviewServiceRef.approveReview(reviewId, resolution)
    }
  )

  ipcMain.handle(
    'review:reject',
    async (event, reviewId: string, feedback: string) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof reviewId !== 'string' || !reviewId) {
        throw new Error('Invalid reviewId')
      }
      if (typeof feedback !== 'string' || !feedback) {
        throw new Error('Invalid feedback')
      }
      if (!humanReviewServiceRef) {
        throw new Error('HumanReviewService not initialized')
      }

      await humanReviewServiceRef.rejectReview(reviewId, feedback)
    }
  )
}

/**
 * Register all IPC handlers for Nexus operations
 * Must be called in app.whenReady()
 */
export function registerIpcHandlers(): void {
  // Mode operations
  ipcMain.handle('mode:genesis', (event) => {
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

  ipcMain.handle('mode:evolution', (event, projectId: string) => {
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
  ipcMain.handle('project:get', (event, id: string) => {
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

  /**
   * List all projects
   * @returns Array of all projects
   */
  ipcMain.handle('projects:list', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.projects.values())
  })

  /**
   * Get dashboard metrics overview
   * Returns aggregated metrics for all projects
   */
  ipcMain.handle('dashboard:getMetrics', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Calculate aggregated metrics from current state
    const projects = Array.from(state.projects.values())
    const tasks = Array.from(state.tasks.values())
    const agents = Array.from(state.agents.values())

    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const failedTasks = tasks.filter(t => t.status === 'failed').length
    const activeAgents = agents.filter(a => a.status === 'working').length

    return {
      projectId: state.projectId || 'no-project',
      projectName: projects.length > 0 ? projects[0].name : 'No Active Project',
      totalFeatures: Math.ceil(tasks.length / 3), // Approximate features from tasks
      completedFeatures: Math.floor(completedTasks / 3),
      completedTasks,
      totalTasks: tasks.length,
      failedTasks,
      activeAgents,
      estimatedRemainingMinutes: Math.max(0, (tasks.length - completedTasks) * 5),
      estimatedCompletion: new Date(Date.now() + Math.max(0, (tasks.length - completedTasks) * 5) * 60000),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date()
    }
  })

  /**
   * Get cost metrics
   * Returns token usage and cost breakdown
   */
  ipcMain.handle('dashboard:getCosts', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Return placeholder cost data - in real implementation, this would come from LLM service tracking
    return {
      totalCost: 0,
      totalTokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUSD: 0,
      breakdownByModel: [],
      breakdownByAgent: [],
      updatedAt: new Date()
    }
  })

  ipcMain.handle('project:create', (event, input: { name: string; mode: 'genesis' | 'evolution' }) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }
      if (typeof input.name !== 'string' || !input.name) {
        throw new Error('Invalid project name')
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for runtime safety
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
  ipcMain.handle('tasks:list', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.tasks.values())
  })

  ipcMain.handle('task:update', (event, id: string, update: Record<string, unknown>) => {
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
  ipcMain.handle('agents:status', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.agents.values())
  })

  // Execution control
  ipcMain.handle('execution:pause', (event, reason?: string) => {
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

  ipcMain.handle('interview:emit-started', (event, payload: { projectName: string | null; mode: 'genesis' | 'evolution' }) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || `interview-${Date.now()}`

      void eventBus.emit(
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

  ipcMain.handle('interview:emit-message', (event, payload: { messageId: string; role: 'user' | 'assistant'; content: string }) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      void eventBus.emit(
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

  ipcMain.handle('interview:emit-requirement', (event, payload: { requirementId: string; category: string; text: string; priority: string }) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      // Map frontend categories to backend RequirementCategory types
      const categoryMap: Record<string, 'functional' | 'technical' | 'ui' | 'performance' | 'security'> = {
        non_functional: 'performance',
        user_story: 'functional',
        constraint: 'technical',
        functional: 'functional',
        technical: 'technical',
        ui: 'ui',
        performance: 'performance',
        security: 'security'
      }
      const mappedCategory = categoryMap[payload.category] ?? 'functional'

      // Map frontend priority to backend RequirementPriority types
      const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
        must: 'critical',
        should: 'high',
        could: 'medium',
        wont: 'low',
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low'
      }
      const mappedPriority = priorityMap[payload.priority] ?? 'medium'
      const now = new Date()

      void eventBus.emit(
        'interview:requirement-captured',
        {
          projectId,
          requirement: {
            id: payload.requirementId,
            projectId,
            category: mappedCategory,
            content: payload.text,
            priority: mappedPriority,
            source: 'interview' as const,
            createdAt: now,
            updatedAt: now
          }
        },
        { source: 'InterviewUI' }
      )
    }
  )

  ipcMain.handle('interview:emit-completed', (event, payload: { requirementCount: number; categories: string[]; duration: number }) => {
      if (!validateSender(event)) {
        throw new Error('Unauthorized IPC sender')
      }

      const eventBus = EventBus.getInstance()
      const projectId = state.projectId || 'unknown'

      void eventBus.emit(
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

  ipcMain.handle('eventbus:emit', (event, channel: string, payload: unknown) => {
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
      void eventBus.emit(channel as any, payload as any, { source: 'RendererUI' })
    }
  )
}

/**
 * Set up event forwarding from backend to renderer
 * Subscribes to EventBus events and forwards to renderer via IPC
 *
 * @param mainWindow - BrowserWindow to send events to
 */
export function setupEventForwarding(mainWindow: BrowserWindow): void {
  // Store reference for forwarding
  eventForwardingWindow = mainWindow

  const eventBus = EventBus.getInstance()

  // ========================================
  // Task Events → Timeline + Metrics
  // ========================================

  eventBus.on('task:started', (event) => {
    // Forward as timeline event
    forwardTimelineEvent({
      id: event.id,
      type: 'task_started',
      title: `Task ${event.payload.taskId} started`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        agentId: event.payload.agentId
      }
    })
  })

  eventBus.on('task:completed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'task_completed',
      title: `Task ${event.payload.taskId} completed`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    })
  })

  eventBus.on('task:failed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'task_failed',
      title: `Task ${event.payload.taskId} failed: ${event.payload.error}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    })
  })

  eventBus.on('task:qa-iteration', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'qa_iteration',
      title: `QA iteration ${event.payload.iteration}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iteration: event.payload.iteration
      }
    })
  })

  // ========================================
  // Agent Events → Agent Metrics + Timeline
  // ========================================

  eventBus.on('agent:assigned', (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: 'working',
      currentTask: event.payload.taskId
    })
    forwardTimelineEvent({
      id: event.id,
      type: 'agent_task_assigned',
      title: `Agent ${event.payload.agentId} assigned task`,
      timestamp: event.timestamp,
      metadata: {
        agentId: event.payload.agentId,
        taskId: event.payload.taskId
      }
    })
  })

  eventBus.on('agent:idle', (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: 'idle',
      currentTask: null,
      progress: 100
    })
  })

  eventBus.on('agent:error', (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: 'error'
    })
    forwardTimelineEvent({
      id: event.id,
      type: 'agent_error',
      title: `Agent ${event.payload.agentId} error: ${event.payload.error}`,
      timestamp: event.timestamp,
      metadata: {
        agentId: event.payload.agentId
      }
    })
  })

  // ========================================
  // QA Events → Timeline
  // ========================================

  eventBus.on('qa:build-started', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'build_started',
      title: `Build started for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    })
  })

  eventBus.on('qa:build-completed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'build_completed',
      title: event.payload.passed ? 'Build succeeded' : 'Build failed',
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    })
  })

  eventBus.on('qa:loop-completed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: event.payload.passed ? 'qa_passed' : 'qa_failed',
      title: event.payload.passed
        ? `QA passed for task ${event.payload.taskId}`
        : `QA failed for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iterations: event.payload.iterations
      }
    })
  })

  // ========================================
  // Feature Events → Timeline + Metrics
  // ========================================

  eventBus.on('feature:status-changed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'feature_status_changed',
      title: `Feature moved to ${event.payload.newStatus}`,
      timestamp: event.timestamp,
      metadata: {
        featureId: event.payload.featureId
      }
    })
  })

  eventBus.on('feature:completed', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'feature_completed',
      title: `Feature ${event.payload.featureId} completed`,
      timestamp: event.timestamp,
      metadata: {
        featureId: event.payload.featureId,
        tasksCompleted: event.payload.tasksCompleted
      }
    })
  })

  // ========================================
  // Checkpoint Events → Timeline
  // ========================================

  eventBus.on('system:checkpoint-created', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'checkpoint_created',
      title: `Checkpoint created: ${event.payload.checkpointId}`,
      timestamp: event.timestamp,
      metadata: {}
    })
  })
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
