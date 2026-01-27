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
import type { DatabaseClient } from '../../persistence/database/DatabaseClient'
import { MODEL_PRICING_INFO } from '../../llm/models'

/**
 * Validate IPC sender is from allowed origin
 * Security: Prevents malicious pages from invoking IPC handlers
 * Allows localhost on any port (for dev server port changes) and file:// for production
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL()
  return url.startsWith('http://localhost:') || url.startsWith('file://')
}

class ReviewNotInitializedError extends Error {
  constructor(initError?: string) {
    const baseMessage = 'Review system is not available. '
    const hint = initError
      ? `Initialization failed: ${initError}.`
      : 'Please wait for Nexus to finish initializing.'
    super(baseMessage + hint)
    this.name = 'ReviewNotInitializedError'
  }
}

const REVIEW_CHANNELS = [
  'review:list',
  'review:get',
  'review:approve',
  'review:reject',
] as const

/**
 * Feature interface for Kanban data
 * Maps database schema to UI-friendly format
 */
interface UIFeature {
  id: string
  title: string
  description: string
  status: string
  priority: string
  complexity: string
  progress: number
  assignedAgent?: string
  tasks: { id: string; title: string; status: string }[]
  createdAt: string
  updatedAt: string
}

/**
 * Database task row type for type-safe database queries
 * Represents the structure returned from tasks table select
 */
interface DbTaskRow {
  id: string
  projectId: string
  featureId: string | null
  subFeatureId: string | null
  name: string
  description: string | null
  type: 'auto' | 'checkpoint' | 'tdd'
  status: string
  size: 'atomic' | 'small'
  priority: number
  tags: string | null
  notes: string | null
  assignedAgent: string | null
  worktreePath: string | null
  branchName: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Orchestration state holder
 * Will be wired to real NexusCoordinator when dependencies are ready
 */
interface OrchestrationState {
  mode: 'genesis' | 'evolution' | null
  projectId: string | null
  projects: Map<string, { id: string; name: string; mode: 'genesis' | 'evolution' }>
  tasks: Map<string, { id: string; name: string; status: string; featureId?: string }>
  agents: Map<string, { id: string; type: string; status: string }>
  features: Map<string, UIFeature>
}

// Orchestration state (will be replaced by real coordinator)
const state: OrchestrationState = {
  mode: null,
  projectId: null,
  projects: new Map(),
  tasks: new Map(),
  agents: new Map(),
  features: new Map(),
}

// Service references for checkpoint and review handlers
let checkpointManagerRef: CheckpointManager | null = null
let humanReviewServiceRef: HumanReviewService | null = null

// Database client reference for feature/task queries
let databaseClientRef: DatabaseClient | null = null

// QA iteration tracking (file-level for cross-function access)
let currentQAIteration = 0
const maxQAIterations = 50

// ========================================
// Token/Cost Tracking (Phase 25 - Feature Parity)
// ========================================
// Pricing is now loaded from MODEL_PRICING_INFO for accurate per-model costs
// Default fallback rates (Claude Sonnet 4.5) if model not found
const DEFAULT_INPUT_COST_PER_MILLION = 3
const DEFAULT_OUTPUT_COST_PER_MILLION = 15

interface TokenUsageAccumulator {
  totalInputTokens: number
  totalOutputTokens: number
  totalCalls: number
  byModel: Record<string, { inputTokens: number; outputTokens: number; calls: number } | undefined>
  byAgent: Record<string, { inputTokens: number; outputTokens: number; calls: number } | undefined>
  updatedAt: Date
}

const tokenUsage: TokenUsageAccumulator = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCalls: 0,
  byModel: {},
  byAgent: {},
  updatedAt: new Date(),
}

/**
 * Accumulate token usage from an LLM response
 * Called from ClaudeCodeCLIClient after each response
 */
export function accumulateTokenUsage(usage: {
  inputTokens: number
  outputTokens: number
  model?: string
  agentId?: string
}): void {
  tokenUsage.totalInputTokens += usage.inputTokens
  tokenUsage.totalOutputTokens += usage.outputTokens
  tokenUsage.totalCalls++
  tokenUsage.updatedAt = new Date()

  // Forward real-time cost update to renderer
  forwardCostUpdate(getTokenUsageAndCosts())

  // Track by model
  if (usage.model) {
    const modelKey = usage.model
    const modelUsage = tokenUsage.byModel[modelKey] ?? { inputTokens: 0, outputTokens: 0, calls: 0 }
    modelUsage.inputTokens += usage.inputTokens
    modelUsage.outputTokens += usage.outputTokens
    modelUsage.calls++
    tokenUsage.byModel[modelKey] = modelUsage
  }

  // Track by agent
  if (usage.agentId) {
    const agentKey = usage.agentId
    const agentUsage = tokenUsage.byAgent[agentKey] ?? { inputTokens: 0, outputTokens: 0, calls: 0 }
    agentUsage.inputTokens += usage.inputTokens
    agentUsage.outputTokens += usage.outputTokens
    agentUsage.calls++
    tokenUsage.byAgent[agentKey] = agentUsage
  }
}

/**
 * Get current token usage and calculate costs
 * Uses MODEL_PRICING_INFO for accurate per-model pricing
 */
export function getTokenUsageAndCosts(): {
  totalCost: number
  totalTokensUsed: number
  inputTokens: number
  outputTokens: number
  estimatedCostUSD: number
  breakdownByModel: Array<{ model: string; inputTokens: number; outputTokens: number; cost: number }>
  breakdownByAgent: Array<{ agentId: string; inputTokens: number; outputTokens: number; cost: number }>
  updatedAt: Date
} {
  /**
   * Calculate cost for a specific model using MODEL_PRICING_INFO
   * Falls back to default rates if model not found
   */
  const calculateCostForModel = (input: number, output: number, model?: string): number => {
    const pricing = model ? MODEL_PRICING_INFO[model] : undefined
    const inputRate = pricing?.inputPerMillion ?? DEFAULT_INPUT_COST_PER_MILLION
    const outputRate = pricing?.outputPerMillion ?? DEFAULT_OUTPUT_COST_PER_MILLION
    return (input * inputRate + output * outputRate) / 1_000_000
  }

  // Calculate total cost by summing per-model costs (more accurate than using default rate)
  let totalCost = 0
  for (const [model, data] of Object.entries(tokenUsage.byModel)) {
    if (!data) continue
    totalCost += calculateCostForModel(data.inputTokens, data.outputTokens, model)
  }

  // If no model breakdown exists, use default rate for total
  if (Object.keys(tokenUsage.byModel).length === 0) {
    totalCost = calculateCostForModel(tokenUsage.totalInputTokens, tokenUsage.totalOutputTokens)
  }

  return {
    totalCost,
    totalTokensUsed: tokenUsage.totalInputTokens + tokenUsage.totalOutputTokens,
    inputTokens: tokenUsage.totalInputTokens,
    outputTokens: tokenUsage.totalOutputTokens,
    estimatedCostUSD: totalCost,
    breakdownByModel: Object.entries(tokenUsage.byModel)
      .filter((entry): entry is [string, { inputTokens: number; outputTokens: number; calls: number }] => entry[1] !== undefined)
      .map(([model, data]) => ({
        model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: calculateCostForModel(data.inputTokens, data.outputTokens, model),
      })),
    breakdownByAgent: Object.entries(tokenUsage.byAgent)
      .filter((entry): entry is [string, { inputTokens: number; outputTokens: number; calls: number }] => entry[1] !== undefined)
      .map(([agentId, data]) => ({
        agentId,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: calculateCostForModel(data.inputTokens, data.outputTokens),
      })),
    updatedAt: tokenUsage.updatedAt,
  }
}

/**
 * Reset token usage (e.g., when starting a new project)
 */
export function resetTokenUsage(): void {
  tokenUsage.totalInputTokens = 0
  tokenUsage.totalOutputTokens = 0
  tokenUsage.totalCalls = 0
  tokenUsage.byModel = {}
  tokenUsage.byAgent = {}
  tokenUsage.updatedAt = new Date()
}

// Expose accumulation function globally for CLI client to call
;(global as unknown as { accumulateTokenUsage: typeof accumulateTokenUsage }).accumulateTokenUsage = accumulateTokenUsage

export function removeReviewHandlers(): void {
  for (const channel of REVIEW_CHANNELS) {
    ipcMain.removeHandler(channel)
  }
}

export function registerFallbackReviewHandlers(initError?: string): void {
  const error = new ReviewNotInitializedError(initError)

  ipcMain.handle('review:list', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    return []
  })

  ipcMain.handle('review:get', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    throw error
  })

  ipcMain.handle('review:approve', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    throw error
  })

  ipcMain.handle('review:reject', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    throw error
  })
}

/**
 * Register checkpoint and review IPC handlers
 * Called after services are initialized
 */
export function registerCheckpointReviewHandlers(
  checkpointManager: CheckpointManager,
  humanReviewService: HumanReviewService
): void {
  removeReviewHandlers()
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

      // Phase 3: Also notify the coordinator to handle the approved task
      try {
        const { getBootstrappedNexus } = await import('../NexusBootstrap')
        const bootstrappedNexus = getBootstrappedNexus()
        if (bootstrappedNexus?.nexus.coordinator) {
          await bootstrappedNexus.nexus.coordinator.handleReviewApproved(reviewId, resolution)
        }
      } catch (coordError) {
        console.warn('[IPC] Failed to notify coordinator of review approval:', coordError)
      }
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

      // Phase 3: Also notify the coordinator to handle the rejected task
      try {
        const { getBootstrappedNexus } = await import('../NexusBootstrap')
        const bootstrappedNexus = getBootstrappedNexus()
        if (bootstrappedNexus?.nexus.coordinator) {
          await bootstrappedNexus.nexus.coordinator.handleReviewRejected(reviewId, feedback)
        }
      } catch (coordError) {
        console.warn('[IPC] Failed to notify coordinator of review rejection:', coordError)
      }
    }
  )
}

/**
 * Register database client for feature/task queries
 * Called after DatabaseClient is initialized
 */
export function registerDatabaseHandlers(databaseClient: DatabaseClient): void {
  databaseClientRef = databaseClient
  console.log('[IPC] Database handlers registered')
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

    // Reset cost tracking for new project
    resetTokenUsage()

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

    // Reset cost tracking for new project session
    resetTokenUsage()

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
   * Phase 25 Feature Parity: Now returns real accumulated token data
   */
  ipcMain.handle('dashboard:getCosts', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Return real token usage and cost data accumulated from LLM calls
    return getTokenUsageAndCosts()
  })

  /**
   * Get historical progress data for ProgressChart
   * Returns array of progress data points over time
   */
  ipcMain.handle('dashboard:getHistoricalProgress', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Try to get real historical data from database
    if (databaseClientRef) {
      try {
        const { tasks } = await import('../../persistence/database/schema')
        const { isNotNull } = await import('drizzle-orm')

        // Query all tasks with completedAt timestamps
        const allTasks = await databaseClientRef.db.select().from(tasks) as DbTaskRow[]
        const totalTasks = allTasks.length

        if (totalTasks === 0) {
          return []
        }

        // Get tasks with completion times
        const completedTasksData = await databaseClientRef.db
          .select()
          .from(tasks)
          .where(isNotNull(tasks.completedAt)) as DbTaskRow[]

        // Build historical progress from real completion times
        if (completedTasksData.length === 0) {
          // No completed tasks yet - return current state only
          return [{ timestamp: new Date(), completed: 0, total: totalTasks }]
        }

        // Sort by completion time and create progress points
        // Filter ensures completedAt is not null, so we can safely cast
        const tasksWithCompletion = completedTasksData.filter(
          (t): t is DbTaskRow & { completedAt: Date } => t.completedAt !== null
        )
        const sortedCompletions = tasksWithCompletion.sort(
          (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        )

        const progressData: Array<{ timestamp: Date; completed: number; total: number }> = []

        // Add starting point
        const firstCompletion = sortedCompletions[0].completedAt
        progressData.push({
          timestamp: new Date(new Date(firstCompletion).getTime() - 1000),
          completed: 0,
          total: totalTasks
        })

        // Add progress point for each completion
        sortedCompletions.forEach((task, index) => {
          progressData.push({
            timestamp: new Date(task.completedAt),
            completed: index + 1,
            total: totalTasks
          })
        })

        // Add current point
        progressData.push({
          timestamp: new Date(),
          completed: completedTasksData.length,
          total: totalTasks
        })

        return progressData
      } catch (err) {
        console.error('[IPC] Failed to get historical progress from database:', err)
        // Fall through to fallback
      }
    }

    // Fallback: Get current task state for calculating progress
    const taskList = Array.from(state.tasks.values())
    const totalTasks = taskList.length
    const completedTasks = taskList.filter(t => t.status === 'completed').length

    // If no tasks exist, return empty progress history
    if (totalTasks === 0) {
      return []
    }

    // Return only the current state as a single data point
    return [{ timestamp: new Date(), completed: completedTasks, total: totalTasks }]
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
  // Fix #2: Add optional projectId parameter to filter tasks by project
  ipcMain.handle('tasks:list', async (event, projectId?: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Query database if available, otherwise fall back to in-memory state
    if (databaseClientRef) {
      try {
        const { tasks } = await import('../../persistence/database/schema')
        const { eq } = await import('drizzle-orm')

        // Build query with optional projectId filter
        let dbTasks: Array<{
          id: string
          featureId: string | null
          name: string
          description: string | null
          status: string
          estimatedMinutes: number | null
        }>

        if (projectId) {
          console.log(`[IPC] tasks:list filtering by projectId: ${projectId}`)
          dbTasks = databaseClientRef.db
            .select()
            .from(tasks)
            .where(eq(tasks.projectId, projectId))
            .all() as typeof dbTasks
        } else {
          dbTasks = databaseClientRef.db.select().from(tasks).all() as typeof dbTasks
        }

        // Map to UI format
        const uiTasks = dbTasks.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          featureId: t.featureId,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes
        }))

        console.log('[IPC] tasks:list returning', uiTasks.length, 'tasks from database', projectId ? `(filtered by ${projectId})` : '(all)')
        return uiTasks
      } catch (error) {
        console.error('[IPC] tasks:list database query failed:', error)
        // Fall back to in-memory state
      }
    }

    console.log('[IPC] tasks:list returning', state.tasks.size, 'tasks from memory')
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

  // ========================================
  // Agent Operations (Phase 17 - Agents Page)
  // ========================================

  /**
   * UI-friendly agent data interface for the Agents page
   */
  interface UIAgent {
    id: string
    type: 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger' | 'architect' | 'debugger' | 'documenter'
    status: 'idle' | 'working' | 'success' | 'error' | 'pending'
    model?: string
    currentTask?: {
      id: string
      name: string
      progress: number
    }
    iteration?: {
      current: number
      max: number
    }
    metrics?: {
      tokensUsed: number
      duration: number
    }
    currentFile?: string
  }

  /**
   * Get status of all agents (legacy - for backward compatibility)
   * @returns Array of agent statuses
   */
  ipcMain.handle('agents:status', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return Array.from(state.agents.values())
  })

  /**
   * List all agents with detailed data (Phase 17)
   * @returns Array of UI-friendly agent data
   */
  ipcMain.handle('agents:list', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Return agents with UI-friendly format
    const agents: UIAgent[] = Array.from(state.agents.values()).map(agent => ({
      id: agent.id,
      type: (agent.type || 'coder') as UIAgent['type'],
      status: (agent.status || 'idle') as UIAgent['status'],
      model: undefined,
      currentTask: undefined,
      iteration: undefined,
      metrics: undefined,
      currentFile: undefined
    }))

    return agents
  })

  /**
   * Get a single agent by ID
   * @param id - Agent ID
   * @returns Agent data or null
   */
  ipcMain.handle('agents:get', (event, id: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid agent id')
    }

    const agent = state.agents.get(id)
    if (!agent) {
      return null
    }

    return {
      id: agent.id,
      type: agent.type || 'coder',
      status: agent.status || 'idle',
      model: undefined,
      currentTask: undefined,
      iteration: undefined,
      metrics: undefined,
      currentFile: undefined
    }
  })

  /**
   * Get agent pool status (Phase 17)
   * @returns Pool status overview
   */
  ipcMain.handle('agents:getPoolStatus', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    const agents = Array.from(state.agents.values())

    // Count by status
    const working = agents.filter(a => a.status === 'working').length
    const idle = agents.filter(a => a.status === 'idle' || !a.status).length
    const error = agents.filter(a => a.status === 'error').length
    const complete = agents.filter(a => a.status === 'complete').length

    // Count by type
    const byType: Record<string, { total: number; active: number; idle: number; max: number } | undefined> = {
      planner: { total: 0, active: 0, idle: 0, max: 1 },
      coder: { total: 0, active: 0, idle: 0, max: 4 },
      tester: { total: 0, active: 0, idle: 0, max: 2 },
      reviewer: { total: 0, active: 0, idle: 0, max: 2 },
      merger: { total: 0, active: 0, idle: 0, max: 1 }
    }

    for (const agent of agents) {
      const agentType = agent.type || 'coder'
      const bucket = byType[agentType]
      if (!bucket) {
        continue
      }
      bucket.total++
      if (agent.status === 'working') {
        bucket.active++
      } else {
        bucket.idle++
      }
    }

    return {
      totalAgents: agents.length,
      maxAgents: 10, // Default maximum
      working,
      idle,
      error,
      complete,
      byType,
      tasksInProgress: working
    }
  })

  /**
   * Get agent output/logs
   * @param id - Agent ID
   * @returns Array of log lines
   */
  ipcMain.handle('agents:getOutput', (event, id: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid agent id')
    }

    // Return real output from the agent's buffer
    const buffer = agentOutputBuffers.get(id)
    return buffer ? [...buffer] : []
  })

  /**
   * Get QA status for current execution
   * @returns QA pipeline status
   */
  ipcMain.handle('agents:getQAStatus', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Return real QA status from executionStatuses map
    return {
      steps: [
        { type: 'build', status: executionStatuses.get('build') ?? 'pending' },
        { type: 'lint', status: executionStatuses.get('lint') ?? 'pending' },
        { type: 'test', status: executionStatuses.get('test') ?? 'pending' },
        { type: 'review', status: executionStatuses.get('review') ?? 'pending' }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    }
  })

  // ========================================
  // ========================================
  // Execution Logs Operations (Phase 17 - Task 30.5)
  // ========================================

  /**
   * Execution log entry interface for the Execution page
   */
  interface ExecutionLogEntry {
    id: string
    timestamp: Date
    type: 'build' | 'lint' | 'test' | 'review' | 'info' | 'error' | 'warning'
    message: string
    details?: string
    duration?: number
  }

  /**
   * Execution step status interface
   */
  interface ExecutionStepStatus {
    type: 'build' | 'lint' | 'test' | 'review'
    status: 'pending' | 'running' | 'success' | 'error'
    count?: number
    duration?: number
    logs: ExecutionLogEntry[]
  }

  // In-memory execution logs storage (will be populated by QA events)
  const executionLogs: Map<string, ExecutionLogEntry[]> = new Map([
    ['build', []],
    ['lint', []],
    ['test', []],
    ['review', []]
  ])

  // ========================================
  // Agent Output Buffer (Phase 25 - Feature Parity)
  // ========================================
  // Stores the last 1000 lines of output per agent to prevent memory growth
  const MAX_OUTPUT_LINES_PER_AGENT = 1000
  const agentOutputBuffers: Map<string, string[]> = new Map()

  /**
   * Add a line of output to an agent's buffer
   * Automatically trims to MAX_OUTPUT_LINES_PER_AGENT
   */
  function addAgentOutput(agentId: string, line: string): void {
    let buffer = agentOutputBuffers.get(agentId)
    if (!buffer) {
      buffer = []
      agentOutputBuffers.set(agentId, buffer)
    }
    buffer.push(line)
    // Trim to max lines
    if (buffer.length > MAX_OUTPUT_LINES_PER_AGENT) {
      buffer.splice(0, buffer.length - MAX_OUTPUT_LINES_PER_AGENT)
    }
  }

  /**
   * Clear an agent's output buffer (e.g., when agent terminates)
   */
  function clearAgentOutput(agentId: string): void {
    agentOutputBuffers.delete(agentId)
  }

  // Export for use in event forwarding setup
  ;(global as unknown as { addAgentOutput: typeof addAgentOutput }).addAgentOutput = addAgentOutput
  ;(global as unknown as { clearAgentOutput: typeof clearAgentOutput }).clearAgentOutput = clearAgentOutput
  ;(global as unknown as { agentOutputBuffers: typeof agentOutputBuffers }).agentOutputBuffers = agentOutputBuffers

  // Execution step statuses
  const executionStatuses: Map<string, 'pending' | 'running' | 'success' | 'error'> = new Map([
    ['build', 'pending'],
    ['lint', 'pending'],
    ['test', 'pending'],
    ['review', 'pending']
  ])

  // Execution step durations
  const executionDurations: Map<string, number> = new Map()

  // Execution step counts (for lint warnings/test counts)
  const executionCounts: Map<string, number> = new Map()

  // Current task being executed
  let currentExecutionTaskId: string | null = null
  let currentExecutionTaskName: string | null = null

  // NOTE: QA iteration tracking (currentQAIteration, maxQAIterations)
  // is now at file-level scope for cross-function access

  /**
   * Get execution logs for a specific step (build/lint/test/review)
   * @param stepType - The QA step type
   * @returns Array of log entries
   */
  ipcMain.handle('execution:getLogs', (event, stepType: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (!['build', 'lint', 'test', 'review'].includes(stepType)) {
      throw new Error('Invalid step type')
    }

    return executionLogs.get(stepType) || []
  })

  /**
   * Get execution status for all steps
   * @returns Array of step statuses with logs
   */
  ipcMain.handle('execution:getStatus', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    const steps: ExecutionStepStatus[] = ['build', 'lint', 'test', 'review'].map(type => ({
      type: type as 'build' | 'lint' | 'test' | 'review',
      status: executionStatuses.get(type) || 'pending',
      count: executionCounts.get(type),
      duration: executionDurations.get(type),
      logs: executionLogs.get(type) || []
    }))

    return {
      steps,
      currentTaskId: currentExecutionTaskId,
      currentTaskName: currentExecutionTaskName,
      totalDuration: Array.from(executionDurations.values()).reduce((a, b) => a + b, 0)
    }
  })

  /**
   * Clear execution logs for all steps
   * @returns Success status
   */
  ipcMain.handle('execution:clearLogs', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Clear all logs
    for (const type of ['build', 'lint', 'test', 'review']) {
      executionLogs.set(type, [])
      executionStatuses.set(type, 'pending')
      executionDurations.delete(type)
      executionCounts.delete(type)
    }
    currentExecutionTaskId = null
    currentExecutionTaskName = null
    currentQAIteration = 0

    return { success: true }
  })

  /**
   * Export execution logs to a string format
   * @returns Formatted log string
   */
  ipcMain.handle('execution:exportLogs', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    let output = `Nexus Execution Logs\n`
    output += `Generated: ${new Date().toISOString()}\n`
    output += `Task: ${currentExecutionTaskName || 'N/A'}\n`
    output += `${'='.repeat(60)}\n\n`

    for (const type of ['build', 'lint', 'test', 'review']) {
      const logs = executionLogs.get(type) || []
      const status = executionStatuses.get(type) || 'pending'
      const duration = executionDurations.get(type)

      output += `## ${type.toUpperCase()} [${status.toUpperCase()}]`
      if (duration) output += ` (${(duration / 1000).toFixed(2)}s)`
      output += `\n${'-'.repeat(40)}\n`

      if (logs.length === 0) {
        output += `No logs\n`
      } else {
        for (const log of logs) {
          output += `[${new Date(log.timestamp).toISOString()}] ${log.message}\n`
          if (log.details) output += `  ${log.details}\n`
        }
      }
      output += `\n`
    }

    return output
  })

  /**
   * Helper function to add a log entry (used by event handlers)
   */
  function addExecutionLog(
    type: 'build' | 'lint' | 'test' | 'review',
    message: string,
    details?: string,
    logType: 'info' | 'error' | 'warning' = 'info'
  ): void {
    const logs = executionLogs.get(type) || []
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: logType,
      message,
      details
    })
    executionLogs.set(type, logs)
  }

  // Export for use in event forwarding setup
  ;(global as unknown as { addExecutionLog: typeof addExecutionLog }).addExecutionLog = addExecutionLog
  ;(global as unknown as { executionStatuses: typeof executionStatuses }).executionStatuses = executionStatuses
  ;(global as unknown as { executionDurations: typeof executionDurations }).executionDurations = executionDurations
  ;(global as unknown as { executionCounts: typeof executionCounts }).executionCounts = executionCounts
  ;(global as unknown as { setCurrentExecutionTask: (id: string | null, name: string | null) => void }).setCurrentExecutionTask = (id, name) => {
    currentExecutionTaskId = id
    currentExecutionTaskName = name
  }

  // ========================================
  // Feature Operations (Phase 17 - Kanban)
  // ========================================

  /**
   * List all features (for Kanban board)
   * Fix #3: Add optional projectId parameter to filter features by project
   * @param projectId - Optional project ID to filter features
   * @returns Array of features with their tasks
   */
  ipcMain.handle('features:list', async (event, projectId?: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    // Enhanced startup logging for data source verification
    console.log('[IPC] features:list called', {
      projectId: projectId || '(none)',
      databaseAvailable: !!databaseClientRef,
      memoryFeatureCount: state.features.size
    })

    // Query database if available, otherwise fall back to in-memory state
    if (databaseClientRef) {
      try {
        // Import schema dynamically to avoid circular dependency
        const { features, tasks } = await import('../../persistence/database/schema')
        const { eq } = await import('drizzle-orm')

        // Query features from database with optional project filter
        let dbFeatures: Array<{
          id: string
          projectId: string
          name: string
          description: string | null
          priority: string
          status: string
          complexity: string
          estimatedTasks: number | null
          completedTasks: number | null
          createdAt: Date
          updatedAt: Date
        }>

        let dbTasks: Array<{
          id: string
          featureId: string | null
          name: string
          status: string
        }>

        if (projectId) {
          console.log(`[IPC] features:list filtering by projectId: ${projectId}`)
          dbFeatures = databaseClientRef.db
            .select()
            .from(features)
            .where(eq(features.projectId, projectId))
            .all() as typeof dbFeatures

          // Also filter tasks by projectId
          dbTasks = databaseClientRef.db
            .select()
            .from(tasks)
            .where(eq(tasks.projectId, projectId))
            .all() as typeof dbTasks
        } else {
          dbFeatures = databaseClientRef.db.select().from(features).all() as typeof dbFeatures
          dbTasks = databaseClientRef.db.select().from(tasks).all() as typeof dbTasks
        }

        // Map to UI format with tasks
        const uiFeatures: UIFeature[] = dbFeatures.map(f => {
          const featureTasks = dbTasks
            .filter(t => t.featureId === f.id)
            .map(t => ({
              id: t.id,
              title: t.name,
              status: t.status
            }))

          return {
            id: f.id,
            title: f.name,
            description: f.description || '',
            status: f.status,
            priority: f.priority,
            complexity: f.complexity,
            progress: f.estimatedTasks && f.estimatedTasks > 0
              ? Math.round((f.completedTasks || 0) / f.estimatedTasks * 100)
              : 0,
            tasks: featureTasks,
            createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
            updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : String(f.updatedAt)
          }
        })

        console.log('[IPC] features:list returning', uiFeatures.length, 'features from database', projectId ? `(filtered by ${projectId})` : '(all)')
        return uiFeatures
      } catch (error) {
        console.error('[IPC] features:list database query failed:', error)
        // Fall back to in-memory state
      }
    }

    console.log('[IPC] features:list returning', state.features.size, 'features from memory')
    return Array.from(state.features.values())
  })

  /**
   * Get a single feature by ID
   * @param id - Feature ID
   * @returns Feature or null
   */
  ipcMain.handle('feature:get', (event, id: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid feature id')
    }

    return state.features.get(id) || null
  })

  /**
   * Create a new feature
   * @param input - Feature data
   * @returns Created feature with ID
   */
  ipcMain.handle('feature:create', async (event, input: { title: string; description?: string; priority?: string; complexity?: string }) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof input.title !== 'string' || !input.title) {
      throw new Error('Invalid feature title')
    }

    const id = `feature-${Date.now()}`
    const now = new Date()
    const nowISO = now.toISOString()

    // Map UI priority to database priority
    const uiPriority = input.priority || 'medium'
    const dbPriority: 'must' | 'should' | 'could' | 'wont' =
      uiPriority === 'critical' ? 'must' :
      uiPriority === 'high' ? 'should' :
      uiPriority === 'medium' ? 'could' : 'wont'

    // Map UI complexity to database complexity
    const uiComplexity = input.complexity || 'moderate'
    const dbComplexity: 'simple' | 'complex' = uiComplexity === 'simple' ? 'simple' : 'complex'

    const feature: UIFeature = {
      id,
      title: input.title,
      description: input.description || '',
      status: 'backlog',
      priority: uiPriority,
      complexity: uiComplexity,
      progress: 0,
      tasks: [],
      createdAt: nowISO,
      updatedAt: nowISO
    }

    // Persist feature to database if available (fixes manual feature execution bug)
    if (databaseClientRef && state.projectId) {
      try {
        const { features, tasks } = await import('../../persistence/database/schema')

        // Insert feature into database
        databaseClientRef.db.insert(features).values({
          id,
          projectId: state.projectId,
          name: input.title,
          description: input.description || '',
          priority: dbPriority,
          status: 'backlog',
          complexity: dbComplexity,
          estimatedTasks: 1,
          completedTasks: 0,
          createdAt: now,
          updatedAt: now,
        }).run()

        console.log('[IPC] feature:create - persisted feature to database:', id)

        // Create a default "Implementation" task for the feature
        const taskId = `task-${id}-impl-${Date.now()}`
        databaseClientRef.db.insert(tasks).values({
          id: taskId,
          projectId: state.projectId,
          featureId: id,
          name: `Implement: ${input.title}`,
          description: input.description || `Implementation task for ${input.title}`,
          type: 'auto',
          status: 'pending',
          size: 'small',
          priority: 5,
          tags: JSON.stringify([]),
          notes: JSON.stringify([]),
          dependsOn: JSON.stringify([]),
          estimatedMinutes: 30,
          createdAt: now,
          updatedAt: now,
        }).run()

        console.log('[IPC] feature:create - created default task:', taskId)

        // Update feature with the task reference
        feature.tasks = [{ id: taskId, title: `Implement: ${input.title}`, status: 'pending' }]

        // Also update in-memory task state
        state.tasks.set(taskId, {
          id: taskId,
          name: `Implement: ${input.title}`,
          status: 'pending',
          featureId: id
        })

        // Emit task created event for UI updates
        const eventBus = EventBus.getInstance()
        void eventBus.emit('task:created', {
          task: {
            id: taskId,
            projectId: state.projectId,
            featureId: id,
            name: `Implement: ${input.title}`,
            description: input.description || `Implementation task for ${input.title}`,
            type: 'auto' as const,
            status: 'pending' as const,
            priority: 'normal' as const,
            dependencies: [],
            createdAt: now,
            updatedAt: now,
          },
          projectId: state.projectId,
          featureId: id,
        }, { source: 'IPC' })

      } catch (error) {
        console.error('[IPC] feature:create - database persistence failed:', error)
        // Fall through to in-memory only
      }
    }

    // Always update in-memory state
    state.features.set(id, feature)

    // Emit feature created event
    // Note: Using type assertion to work around core vs UI type differences
    const eventBus = EventBus.getInstance()
    void eventBus.emit('feature:created', {
      feature: {
        id,
        projectId: state.projectId || 'current',
        name: feature.title,
        description: feature.description,
        priority: (feature.priority === 'critical' ? 'critical' : feature.priority === 'high' ? 'high' : feature.priority === 'medium' ? 'medium' : 'low'),
        status: 'pending' as 'pending' | 'decomposing' | 'ready' | 'in_progress' | 'completed' | 'failed',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      projectId: state.projectId || 'current'
    }, { source: 'IPC' })

    return feature
  })

  /**
   * Update a feature
   * @param id - Feature ID
   * @param update - Partial feature update
   */
  ipcMain.handle('feature:update', async (event, id: string, update: Partial<UIFeature>) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid feature id')
    }

    console.log('[IPC] feature:update called with id:', id)

    // First check in-memory state (for manually created features)
    let feature = state.features.get(id)
    let fromDatabase = false

    // If not in memory, check database (same pattern as features:list)
    if (!feature && databaseClientRef) {
      console.log('[IPC] feature:update - not in memory, checking database...')
      try {
        // Dynamic imports to avoid circular dependency (same as features:list)
        const { features } = await import('../../persistence/database/schema')
        const { eq } = await import('drizzle-orm')

        const dbFeature = databaseClientRef.db
          .select()
          .from(features)
          .where(eq(features.id, id))
          .get() as {
            id: string
            name: string
            description: string | null
            status: string
            priority: string
            complexity: string
            estimatedTasks: number | null
            completedTasks: number | null
            createdAt: Date
            updatedAt: Date
          } | undefined

        if (dbFeature) {
          console.log('[IPC] feature:update - found in database')
          fromDatabase = true
          // Convert DB feature to UIFeature format
          feature = {
            id: dbFeature.id,
            title: dbFeature.name,
            description: dbFeature.description || '',
            status: dbFeature.status,
            priority: dbFeature.priority,
            complexity: dbFeature.complexity,
            progress: dbFeature.estimatedTasks && dbFeature.estimatedTasks > 0
              ? Math.round((dbFeature.completedTasks || 0) / dbFeature.estimatedTasks * 100)
              : 0,
            tasks: [],
            createdAt: dbFeature.createdAt instanceof Date ? dbFeature.createdAt.toISOString() : String(dbFeature.createdAt),
            updatedAt: dbFeature.updatedAt instanceof Date ? dbFeature.updatedAt.toISOString() : String(dbFeature.updatedAt),
          }
        }
      } catch (error) {
        console.error('[IPC] feature:update database query failed:', error)
      }
    }

    if (!feature) {
      console.log('[IPC] feature:update - Feature not found anywhere!')
      console.log('[IPC] In-memory features:', Array.from(state.features.keys()))
      throw new Error(`Feature not found: ${id}`)
    }

    const previousStatus = feature.status

    // Merge update (only allow safe properties)
    const allowedKeys = ['title', 'description', 'status', 'priority', 'complexity', 'progress', 'assignedAgent']
    for (const key of allowedKeys) {
      if (key in update) {
        ;(feature as unknown as Record<string, unknown>)[key] = update[key as keyof typeof update]
      }
    }
    feature.updatedAt = new Date().toISOString()

    // Update in-memory state
    state.features.set(id, feature)

    // If from database, also persist update to database
    if (fromDatabase && databaseClientRef) {
      console.log('[IPC] feature:update - persisting to database...')
      try {
        const { features } = await import('../../persistence/database/schema')
        const { eq } = await import('drizzle-orm')

        // Map UI priority to DB priority (UI uses critical/high/medium/low, DB uses must/should/could/wont)
        const mapPriorityToDb = (uiPriority: string): 'must' | 'should' | 'could' | 'wont' => {
          const mapping: Record<string, 'must' | 'should' | 'could' | 'wont'> = {
            critical: 'must',
            high: 'should',
            medium: 'could',
            low: 'wont',
          }
          return mapping[uiPriority] ?? 'should'
        }

        // Map UI complexity to DB complexity (DB only supports 'simple' | 'complex')
        const mapComplexityToDb = (uiComplexity: string): 'simple' | 'complex' => {
          return uiComplexity === 'complex' ? 'complex' : 'simple'
        }

        databaseClientRef.db
          .update(features)
          .set({
            name: feature.title,
            description: feature.description,
            status: feature.status,
            priority: mapPriorityToDb(feature.priority),
            complexity: mapComplexityToDb(feature.complexity),
            updatedAt: new Date(),
          })
          .where(eq(features.id, id))
          .run()
        console.log('[IPC] feature:update - database updated successfully')
      } catch (error) {
        console.error('[IPC] feature:update database persist failed:', error)
      }
    }

    // Emit status change event if status changed
    if (update.status && update.status !== previousStatus) {
      const eventBus = EventBus.getInstance()
      void eventBus.emit('feature:status-changed', {
        featureId: id,
        projectId: state.projectId || 'current',
        previousStatus: mapUIStatusToCoreStatus(previousStatus),
        newStatus: mapUIStatusToCoreStatus(update.status)
      }, { source: 'IPC' })

      // Emit completed event if moved to done
      if (update.status === 'done') {
        void eventBus.emit('feature:completed', {
          featureId: id,
          projectId: state.projectId || 'current',
          tasksCompleted: feature.tasks.length,
          duration: 0
        }, { source: 'IPC' })
      }
    }

    console.log('[IPC] feature:update - success')
    return feature
  })

  /**
   * Delete a feature
   * @param id - Feature ID
   */
  ipcMain.handle('feature:delete', (event, id: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid feature id')
    }

    const deleted = state.features.delete(id)
    if (!deleted) {
      throw new Error(`Feature not found: ${id}`)
    }

    // Emit feature deleted event
    const eventBus = EventBus.getInstance()
    void eventBus.emit('feature:deleted', {
      featureId: id,
      projectId: state.projectId || 'current'
    }, { source: 'IPC' })

    return { success: true }
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

  /**
   * Start execution for a project
   * Phase 20 Task 7: Wire manual execution start
   * Phase 24 Fix: Fetch rootPath and tasks from DB, call executeExistingTasks
   * @param projectId - Project ID to start execution for
   * @returns Promise with success status
   */
  ipcMain.handle('execution:start', async (event, projectId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('Invalid projectId')
    }

    console.log('[ExecutionHandlers] Starting execution for:', projectId)

    try {
      // Import the bootstrapped Nexus to access coordinator
      const { getBootstrappedNexus } = await import('../NexusBootstrap')
      const bootstrappedNexus = getBootstrappedNexus()

      if (!bootstrappedNexus) {
        throw new Error('Nexus not initialized')
      }

      // Start execution via the coordinator
      const coordinator = bootstrappedNexus.nexus.coordinator

      // Check coordinator state
      const status = coordinator.getStatus()
      console.log('[ExecutionHandlers] Current coordinator status:', status.state)

      // If already running, just return success
      if (status.state === 'running') {
        console.log('[ExecutionHandlers] Execution already running')
        return { success: true, message: 'Execution already running' }
      }

      // If paused, resume instead of start
      if (status.state === 'paused') {
        coordinator.resume()
        console.log('[ExecutionHandlers] Execution resumed')
        return { success: true, message: 'Execution resumed' }
      }

      // Fetch project's rootPath from database
      const { projects, tasks: tasksTable } = await import('../../persistence/database/schema')
      const { eq } = await import('drizzle-orm')

      const dbClient = bootstrappedNexus.databaseClient

      // Query project to get rootPath
      const project = dbClient.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get() as { id: string; rootPath: string; name: string } | undefined

      if (!project) {
        throw new Error(`Project not found: ${projectId}`)
      }

      const projectPath = project.rootPath
      console.log('[ExecutionHandlers] Project path:', projectPath)

      // Query tasks for this project
      const dbTasks = dbClient.db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.projectId, projectId))
        .all() as Array<{
          id: string
          name: string
          description: string | null
          status: string
          featureId: string | null
          dependsOn: string | null
          priority: number
          estimatedMinutes: number | null
        }>

      console.log('[ExecutionHandlers] Found', dbTasks.length, 'tasks for project')

      if (dbTasks.length === 0) {
        return {
          success: false,
          error: 'No tasks found for project. Complete the interview to generate tasks.'
        }
      }

      // Convert database tasks to OrchestrationTask format
      // Include type and size fields required for PlanningTask compatibility
      const orchestrationTasks = dbTasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description || '',
        type: 'auto' as const, // Default task type
        size: 'small' as const, // Default task size
        status: 'pending' as const,
        featureId: task.featureId || undefined,
        dependsOn: task.dependsOn ? JSON.parse(task.dependsOn) as string[] : [],
        priority: task.priority || 1,
        estimatedMinutes: task.estimatedMinutes || 15,
        files: [],
        testCriteria: [],
        waveId: 0,
        createdAt: new Date(),
      }))

      // Record execution start time for metrics
      const { recordExecutionStart } = await import('../NexusBootstrap')
      recordExecutionStart(projectId)

      // Use the new executeExistingTasks method that skips decomposition
      coordinator.executeExistingTasks(projectId, orchestrationTasks, projectPath)
      console.log('[ExecutionHandlers] Execution started with executeExistingTasks')

      // Forward event to UI
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send('execution:started', { projectId })
      }

      return { success: true, message: 'Execution started' }
    } catch (error) {
      console.error('[ExecutionHandlers] Execution start failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Resume execution for a paused project
   * Phase 20 Task 7: Wire execution resume
   * @returns Promise with success status
   */
  ipcMain.handle('execution:resume', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    console.log('[ExecutionHandlers] Resuming execution')

    try {
      const { getBootstrappedNexus } = await import('../NexusBootstrap')
      const bootstrappedNexus = getBootstrappedNexus()

      if (!bootstrappedNexus) {
        throw new Error('Nexus not initialized')
      }

      const coordinator = bootstrappedNexus.nexus.coordinator

      coordinator.resume()
      console.log('[ExecutionHandlers] Execution resumed successfully')

      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send('execution:resumed', {})
      }

      return { success: true }
    } catch (error) {
      console.error('[ExecutionHandlers] Resume failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Stop execution gracefully
   * Phase 20 Task 7: Wire execution stop
   * @returns Promise with success status
   */
  ipcMain.handle('execution:stop', async (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    console.log('[ExecutionHandlers] Stopping execution')

    try {
      const { getBootstrappedNexus } = await import('../NexusBootstrap')
      const bootstrappedNexus = getBootstrappedNexus()

      if (!bootstrappedNexus) {
        throw new Error('Nexus not initialized')
      }

      const coordinator = bootstrappedNexus.nexus.coordinator

      await coordinator.stop()
      console.log('[ExecutionHandlers] Execution stopped successfully')

      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send('execution:stopped', {})
      }

      return { success: true }
    } catch (error) {
      console.error('[ExecutionHandlers] Stop failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // ========================================
  // Planning Operations (Phase 25 - End-to-End Wiring)
  // ========================================

  /**
   * Start planning for a project
   * This triggers the TaskDecomposer to break down requirements into tasks
   * Called after interview completion or when user manually triggers planning
   * @param projectId - Project ID to start planning for
   * @returns Promise with success status and planning info
   */
  ipcMain.handle('planning:start', async (event, projectId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('Invalid projectId')
    }

    console.log('[IPC] planning:start called for projectId:', projectId)

    try {
      // Import NexusBootstrap to access planning components
      const { getBootstrappedNexus } = await import('../NexusBootstrap')
      const bootstrappedNexus = getBootstrappedNexus()

      if (!bootstrappedNexus) {
        throw new Error('Nexus not initialized')
      }

      // Emit planning:started event to UI
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send('nexus-event', {
          type: 'planning:started',
          payload: {
            projectId,
            requirementCount: 0, // Will be updated during progress
            startedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        })
      }

      // Check if coordinator is already running planning
      const coordinator = bootstrappedNexus.nexus.coordinator
      const status = coordinator.getStatus()

      if (status.state === 'running') {
        console.log('[IPC] planning:start - Execution already running')
        return { success: true, message: 'Execution already in progress' }
      }

      // Trigger interview:completed event to start the planning chain
      // The NexusBootstrap will handle decomposition when it receives this event
      const _eventBus = EventBus.getInstance()

      // Get requirements count from database
      let requirementCount = 0
      if (databaseClientRef) {
        try {
          const { eq, count } = await import('drizzle-orm')
          const { requirements } = await import('../../persistence/database/schema')
          const result = databaseClientRef.db
            .select({ count: count() })
            .from(requirements)
            .where(eq(requirements.projectId, projectId))
            .get() as { count: number } | undefined
          requirementCount = result?.count ?? 0
        } catch (dbError) {
          console.warn('[IPC] planning:start - Could not get requirement count:', dbError)
        }
      }

      // The planning will be triggered by interview:completed event
      // which is already wired in NexusBootstrap
      console.log('[IPC] planning:start - Starting planning with', requirementCount, 'requirements')

      return {
        success: true,
        message: 'Planning started',
        requirementCount,
      }
    } catch (error) {
      console.error('[IPC] planning:start failed:', error)

      // Emit planning:error event to UI
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send('nexus-event', {
          type: 'planning:error',
          payload: {
            projectId,
            error: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
          timestamp: new Date().toISOString(),
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  /**
   * Get planning status for a project
   * Returns current planning state and progress
   */
  ipcMain.handle('planning:getStatus', async (event, projectId: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('Invalid projectId')
    }

    // Check database for tasks created for this project
    if (databaseClientRef) {
      try {
        const { eq, count } = await import('drizzle-orm')
        const { tasks: tasksTable, features: featuresTable } = await import('../../persistence/database/schema')

        const taskResult = databaseClientRef.db
          .select({ count: count() })
          .from(tasksTable)
          .where(eq(tasksTable.projectId, projectId))
          .get() as { count: number } | undefined

        const featureResult = databaseClientRef.db
          .select({ count: count() })
          .from(featuresTable)
          .where(eq(featuresTable.projectId, projectId))
          .get() as { count: number } | undefined

        const taskCount = taskResult?.count ?? 0
        const featureCount = featureResult?.count ?? 0

        // If tasks exist, planning is complete
        if (taskCount > 0) {
          return {
            status: 'complete',
            progress: 100,
            taskCount,
            featureCount,
          }
        }

        return {
          status: 'idle',
          progress: 0,
          taskCount: 0,
          featureCount: 0,
        }
      } catch (dbError) {
        console.error('[IPC] planning:getStatus database error:', dbError)
      }
    }

    return {
      status: 'unknown',
      progress: 0,
      taskCount: 0,
      featureCount: 0,
    }
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
  const globalExecutionStatuses = (global as unknown as {
    executionStatuses?: Map<string, 'pending' | 'running' | 'success' | 'error'>
  }).executionStatuses
  const getExecutionStatus = (type: 'build' | 'lint' | 'test' | 'review'): 'pending' | 'running' | 'success' | 'error' =>
    globalExecutionStatuses?.get(type) ?? 'pending'

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
    // Track current iteration for getQAStatus
    currentQAIteration = event.payload.iteration

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

    // Forward QA status update to renderer
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('qa:status-update', {
        steps: [
          { type: 'build', status: getExecutionStatus('build') },
          { type: 'lint', status: getExecutionStatus('lint') },
          { type: 'test', status: getExecutionStatus('test') },
          { type: 'review', status: getExecutionStatus('review') }
        ],
        iteration: currentQAIteration,
        maxIterations: maxQAIterations
      })
    }
  })

  // ========================================
  // Agent Events → Agent Metrics + Timeline
  // ========================================

  // FIX #5: Forward agent:spawned events for dynamic agent discovery in UI
  // AgentSpawnedPayload contains { agent: Agent }, access nested properties
  eventBus.on('agent:spawned', (event) => {
    const agent = event.payload.agent;
    const agentId = agent.id;
    const agentType = agent.type;
    forwardAgentCreated({
      id: agentId,
      type: agentType || 'coder',
      status: 'idle',
      model: agent.modelConfig?.model,
      spawnedAt: event.timestamp
    })
    forwardTimelineEvent({
      id: event.id,
      type: 'agent_spawned',
      title: `Agent ${agentId} spawned`,
      timestamp: event.timestamp,
      metadata: {
        agentId,
        agentType
      }
    })
  })

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

  // Agent output streaming (Phase 25 - Feature Parity)
  const globalAddAgentOutput = (global as unknown as {
    addAgentOutput?: (agentId: string, line: string) => void
  }).addAgentOutput

  eventBus.on('agent:output', (event) => {
    const { agentId, line } = event.payload
    // Store in buffer
    globalAddAgentOutput?.(agentId, line)
    // Forward to renderer for real-time display
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('agent:output', {
        agentId,
        line,
        timestamp: event.timestamp
      })
    }
  })

  // ========================================
  // QA Events → Timeline
  // ========================================

  // Get global references to execution log helpers (defined in registerIpcHandlers)
  const globalAddExecutionLog = (global as unknown as {
    addExecutionLog?: (type: 'build' | 'lint' | 'test' | 'review', message: string, details?: string, logType?: 'info' | 'error' | 'warning') => void
  }).addExecutionLog
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
    // FIX: Add execution log and forward to renderer
    globalAddExecutionLog?.('build', `Build started for task ${event.payload.taskId}`)
    globalExecutionStatuses?.set('build', 'running')
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:log', {
        type: 'build',
        status: 'running',
        message: `Build started for task ${event.payload.taskId}`
      })
    }
  })

  eventBus.on('qa:build-completed', (event) => {
    const passed = event.payload.passed
    forwardTimelineEvent({
      id: event.id,
      type: 'build_completed',
      title: passed ? 'Build succeeded' : 'Build failed',
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    })
    // FIX: Add execution log and forward to renderer
    globalAddExecutionLog?.('build', passed ? 'Build succeeded' : 'Build failed', undefined, passed ? 'info' : 'error')
    globalExecutionStatuses?.set('build', passed ? 'success' : 'error')
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:log', {
        type: 'build',
        status: passed ? 'success' : 'error',
        message: passed ? 'Build succeeded' : 'Build failed'
      })
    }
    // CRITICAL FIX: Forward QA status update for Agents page
    forwardQAStatusUpdate({
      steps: [
        { type: 'build', status: getExecutionStatus('build') },
        { type: 'lint', status: getExecutionStatus('lint') },
        { type: 'test', status: getExecutionStatus('test') },
        { type: 'review', status: getExecutionStatus('review') }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    })
  })

  eventBus.on('qa:loop-completed', (event) => {
    const passed = event.payload.passed
    forwardTimelineEvent({
      id: event.id,
      type: passed ? 'qa_passed' : 'qa_failed',
      title: passed
        ? `QA passed for task ${event.payload.taskId}`
        : `QA failed for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iterations: event.payload.iterations
      }
    })
    // FIX: Add execution log for QA loop completion
    globalAddExecutionLog?.('review',
      passed ? `QA passed after ${event.payload.iterations} iterations` : `QA failed after ${event.payload.iterations} iterations`,
      undefined, passed ? 'info' : 'error')
    globalExecutionStatuses?.set('review', passed ? 'success' : 'error')
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:log', {
        type: 'review',
        status: passed ? 'success' : 'error',
        message: passed ? `QA passed after ${event.payload.iterations} iterations` : `QA failed after ${event.payload.iterations} iterations`
      })
    }
    // CRITICAL FIX: Forward QA status update for Agents page
    forwardQAStatusUpdate({
      steps: [
        { type: 'build', status: getExecutionStatus('build') },
        { type: 'lint', status: getExecutionStatus('lint') },
        { type: 'test', status: getExecutionStatus('test') },
        { type: 'review', status: getExecutionStatus('review') }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    })
  })

  // FIX: Add lint event handlers for execution logs
  // Note: qa:lint-started may not exist in the EventBus types yet, so we use qa:lint-completed for both start and end
  eventBus.on('qa:lint-completed', (event) => {
    const passed = event.payload.passed
    globalAddExecutionLog?.('lint', passed ? 'Lint passed' : 'Lint failed',
      undefined, passed ? 'info' : 'error')
    globalExecutionStatuses?.set('lint', passed ? 'success' : 'error')
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:log', {
        type: 'lint',
        status: passed ? 'success' : 'error',
        message: passed ? 'Lint passed' : 'Lint failed'
      })
    }
    // CRITICAL FIX: Forward QA status update for Agents page
    forwardQAStatusUpdate({
      steps: [
        { type: 'build', status: getExecutionStatus('build') },
        { type: 'lint', status: getExecutionStatus('lint') },
        { type: 'test', status: getExecutionStatus('test') },
        { type: 'review', status: getExecutionStatus('review') }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    })
  })

  // FIX: Add test event handlers for execution logs
  eventBus.on('qa:test-completed', (event) => {
    const passed = event.payload.passed
    globalAddExecutionLog?.('test', passed ? 'All tests passed' : 'Tests failed',
      undefined, passed ? 'info' : 'error')
    globalExecutionStatuses?.set('test', passed ? 'success' : 'error')
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('execution:log', {
        type: 'test',
        status: passed ? 'success' : 'error',
        message: passed ? 'All tests passed' : 'Tests failed'
      })
    }
    // CRITICAL FIX: Forward QA status update for Agents page
    forwardQAStatusUpdate({
      steps: [
        { type: 'build', status: getExecutionStatus('build') },
        { type: 'lint', status: getExecutionStatus('lint') },
        { type: 'test', status: getExecutionStatus('test') },
        { type: 'review', status: getExecutionStatus('review') }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
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
    // FIX: Also forward feature update so Kanban board refreshes
    forwardFeatureUpdate({
      featureId: event.payload.featureId,
      status: event.payload.newStatus
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

  eventBus.on('system:checkpoint-restored', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'checkpoint_restored',
      title: `Checkpoint restored: ${event.payload.checkpointId}`,
      timestamp: event.timestamp,
      metadata: {
        checkpointId: event.payload.checkpointId,
        projectId: event.payload.projectId
      }
    })
  })

  // ========================================
  // Metrics & Cost Event Forwarding (FIX: Wire unused forwarding functions)
  // ========================================

  // Forward metrics updates when tasks complete or progress changes
  eventBus.on('task:completed', (_event) => {
    // Calculate updated metrics after task completion
    const tasks = Array.from(state.tasks.values())
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    forwardMetricsUpdate({
      completedTasks,
      totalTasks: tasks.length,
      projectId: state.projectId || 'current',
      updatedAt: new Date()
    })
  })

  // Forward feature updates when features are created or updated
  eventBus.on('feature:created', (event) => {
    forwardFeatureUpdate({
      featureId: event.payload.feature.id,
      title: event.payload.feature.name,
      status: event.payload.feature.status,
      priority: event.payload.feature.priority
    })
  })

  // Cost updates will be triggered when LLM token tracking events are added to EventBus
  // TODO: Add llm:tokens-used event type to EventBus and wire forwardCostUpdate() here

  // ========================================
  // Human Review Events → Timeline + UI Notification
  // ========================================

  eventBus.on('review:requested', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'review_requested',
      title: `Human review requested for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId,
        taskId: event.payload.taskId,
        reason: event.payload.reason
      }
    })
    // Also forward directly for UI to show review panel
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('review:requested', event.payload)
    }
  })

  eventBus.on('review:approved', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'review_approved',
      title: `Review approved: ${event.payload.reviewId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId
      }
    })
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('review:approved', event.payload)
    }
  })

  eventBus.on('review:rejected', (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: 'review_rejected',
      title: `Review rejected: ${event.payload.reviewId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId
      }
    })
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send('review:rejected', event.payload)
    }
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
 * FIX #5: Forward an agent created event to the renderer for dynamic discovery
 */
export function forwardAgentCreated(agent: Record<string, unknown>): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('agent:created', agent)
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

/**
 * Forward feature update to the renderer
 */
export function forwardFeatureUpdate(
  feature: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('feature:updated', feature)
  }
}

/**
 * CRITICAL FIX: Forward QA status update to the renderer for Agents page
 * This enables the QA pipeline status panel to show real-time updates
 */
export function forwardQAStatusUpdate(
  status: Record<string, unknown>
): void {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send('qa:status', status)
  }
}

// ========================================
// Helper Functions
// ========================================

/**
 * Map UI feature status to core FeatureStatus for EventBus payloads
 * UI uses kanban statuses (backlog, planning, in_progress, ai_review, human_review, done)
 * Core uses execution statuses (pending, decomposing, ready, in_progress, completed, failed)
 */
function mapUIStatusToCoreStatus(
  status: string
): 'pending' | 'decomposing' | 'ready' | 'in_progress' | 'completed' | 'failed' {
  const map: Partial<Record<string, 'pending' | 'decomposing' | 'ready' | 'in_progress' | 'completed' | 'failed'>> = {
    backlog: 'pending',
    planning: 'decomposing',
    in_progress: 'in_progress',
    ai_review: 'in_progress',  // AI review is still in progress
    human_review: 'ready',     // Ready for final review
    done: 'completed'
  }
  return map[status] ?? 'pending'
}
