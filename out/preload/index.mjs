import { webUtils, webFrame, ipcRenderer, contextBridge } from "electron";
const electronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      ipcRenderer.send(channel, ...args);
    },
    sendTo(webContentsId, channel, ...args) {
      const electronVer = process.versions.electron;
      const electronMajorVer = electronVer ? parseInt(electronVer.split(".")[0]) : 0;
      if (electronMajorVer >= 28) {
        throw new Error('"sendTo" method has been removed since Electron 28.');
      } else {
        ipcRenderer.sendTo(webContentsId, channel, ...args);
      }
    },
    sendSync(channel, ...args) {
      return ipcRenderer.sendSync(channel, ...args);
    },
    sendToHost(channel, ...args) {
      ipcRenderer.sendToHost(channel, ...args);
    },
    postMessage(channel, message, transfer) {
      ipcRenderer.postMessage(channel, message, transfer);
    },
    invoke(channel, ...args) {
      return ipcRenderer.invoke(channel, ...args);
    },
    on(channel, listener) {
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    once(channel, listener) {
      ipcRenderer.once(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    removeListener(channel, listener) {
      ipcRenderer.removeListener(channel, listener);
      return this;
    },
    removeAllListeners(channel) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  webFrame: {
    insertCSS(css) {
      return webFrame.insertCSS(css);
    },
    setZoomFactor(factor) {
      if (typeof factor === "number" && factor > 0) {
        webFrame.setZoomFactor(factor);
      }
    },
    setZoomLevel(level) {
      if (typeof level === "number") {
        webFrame.setZoomLevel(level);
      }
    }
  },
  webUtils: {
    getPathForFile(file) {
      return webUtils.getPathForFile(file);
    }
  },
  process: {
    get platform() {
      return process.platform;
    },
    get versions() {
      return process.versions;
    },
    get env() {
      return { ...process.env };
    }
  }
};
const interviewAPI = {
  /**
   * Start a new interview session
   * @param projectId - Project to conduct interview for
   * @returns Promise with the new session
   */
  start: (projectId) => ipcRenderer.invoke("interview:start", projectId),
  /**
   * Send a message in the interview
   * @param sessionId - Current session ID
   * @param message - User's message content
   * @returns Promise with processing result (response, requirements, gaps)
   */
  sendMessage: (sessionId, message) => ipcRenderer.invoke("interview:sendMessage", sessionId, message),
  /**
   * Get a session by ID (from memory)
   * @param sessionId - Session ID to retrieve
   * @returns Promise with session or null
   */
  getSession: (sessionId) => ipcRenderer.invoke("interview:getSession", sessionId),
  /**
   * Resume a session from persistence
   * @param sessionId - Session ID to resume
   * @returns Promise with session or null
   */
  resume: (sessionId) => ipcRenderer.invoke("interview:resume", sessionId),
  /**
   * Resume a session by project ID
   * @param projectId - Project ID to find active session for
   * @returns Promise with session or null
   */
  resumeByProject: (projectId) => ipcRenderer.invoke("interview:resumeByProject", projectId),
  /**
   * End an interview session
   * @param sessionId - Session ID to end
   * @returns Promise that resolves when session is ended and saved
   */
  end: (sessionId) => ipcRenderer.invoke("interview:end", sessionId),
  /**
   * Pause an interview session
   * @param sessionId - Session ID to pause
   * @returns Promise that resolves when session is paused and saved
   */
  pause: (sessionId) => ipcRenderer.invoke("interview:pause", sessionId),
  /**
   * Get the initial greeting message
   * @returns Promise with greeting string
   */
  getGreeting: () => ipcRenderer.invoke("interview:getGreeting")
};
const nexusAPI = {
  // ========================================
  // Mode Operations
  // ========================================
  /**
   * Start Genesis mode - create new project from scratch
   * @returns Promise with success status and new projectId
   */
  startGenesis: () => ipcRenderer.invoke("mode:genesis"),
  /**
   * Start Evolution mode - work on existing project
   * @param projectId - ID of project to evolve
   * @returns Promise with success status
   */
  startEvolution: (projectId) => ipcRenderer.invoke("mode:evolution", projectId),
  // ========================================
  // Project Operations
  // ========================================
  /**
   * Get project by ID
   * @param id - Project ID
   * @returns Promise with project data or null
   */
  getProject: (id) => ipcRenderer.invoke("project:get", id),
  /**
   * List all projects
   * @returns Promise with array of all projects
   */
  getProjects: () => ipcRenderer.invoke("projects:list"),
  /**
   * Create a new project
   * @param input - Project name and mode
   * @returns Promise with new project ID
   */
  createProject: (input) => ipcRenderer.invoke("project:create", input),
  // ========================================
  // Dashboard Data API (Phase 17)
  // ========================================
  /**
   * Get dashboard metrics overview
   * @returns Promise with aggregated metrics for dashboard
   */
  getDashboardMetrics: () => ipcRenderer.invoke("dashboard:getMetrics"),
  /**
   * Get cost metrics
   * @returns Promise with token usage and cost breakdown
   */
  getDashboardCosts: () => ipcRenderer.invoke("dashboard:getCosts"),
  /**
   * Get historical progress data for ProgressChart
   * @returns Promise with array of progress data points
   */
  getHistoricalProgress: () => ipcRenderer.invoke("dashboard:getHistoricalProgress"),
  // ========================================
  // Task Operations
  // ========================================
  /**
   * Get all tasks
   * @returns Promise with array of tasks
   */
  getTasks: () => ipcRenderer.invoke("tasks:list"),
  /**
   * Update a task
   * @param id - Task ID
   * @param update - Partial task update
   * @returns Promise that resolves on success
   */
  updateTask: (id, update) => ipcRenderer.invoke("task:update", id, update),
  // ========================================
  // Feature Operations (Phase 17 - Kanban)
  // ========================================
  /**
   * Get all features for Kanban board
   * @returns Promise with array of features
   */
  getFeatures: () => ipcRenderer.invoke("features:list"),
  /**
   * Get a single feature by ID
   * @param id - Feature ID
   * @returns Promise with feature data or null
   */
  getFeature: (id) => ipcRenderer.invoke("feature:get", id),
  /**
   * Create a new feature
   * @param input - Feature creation data
   * @returns Promise with created feature
   */
  createFeature: (input) => ipcRenderer.invoke("feature:create", input),
  /**
   * Update a feature
   * @param id - Feature ID
   * @param update - Partial feature update
   * @returns Promise with updated feature
   */
  updateFeature: (id, update) => ipcRenderer.invoke("feature:update", id, update),
  /**
   * Delete a feature
   * @param id - Feature ID
   * @returns Promise that resolves on success
   */
  deleteFeature: (id) => ipcRenderer.invoke("feature:delete", id),
  /**
   * Subscribe to feature update events
   * @param callback - Called when a feature is updated
   * @returns Unsubscribe function
   */
  onFeatureUpdate: (callback) => {
    const handler = (_event, feature) => {
      callback(feature);
    };
    ipcRenderer.on("feature:updated", handler);
    return () => {
      ipcRenderer.removeListener("feature:updated", handler);
    };
  },
  // ========================================
  // Agent Operations (Phase 17 - Agents Page)
  // ========================================
  /**
   * Get status of all agents (legacy)
   * @returns Promise with array of agent statuses
   */
  getAgentStatus: () => ipcRenderer.invoke("agents:status"),
  /**
   * List all agents with detailed data
   * @returns Promise with array of agent data
   */
  getAgents: () => ipcRenderer.invoke("agents:list"),
  /**
   * Get a single agent by ID
   * @param id - Agent ID
   * @returns Promise with agent data or null
   */
  getAgent: (id) => ipcRenderer.invoke("agents:get", id),
  /**
   * Get agent pool status overview
   * @returns Promise with pool status
   */
  getAgentPoolStatus: () => ipcRenderer.invoke("agents:getPoolStatus"),
  /**
   * Get agent output/logs
   * @param id - Agent ID
   * @returns Promise with array of log lines
   */
  getAgentOutput: (id) => ipcRenderer.invoke("agents:getOutput", id),
  /**
   * Get QA status for current execution
   * @returns Promise with QA pipeline status
   */
  getQAStatus: () => ipcRenderer.invoke("agents:getQAStatus"),
  /**
   * Subscribe to agent output events (streaming logs)
   * @param callback - Called when new log line arrives
   * @returns Unsubscribe function
   */
  onAgentOutput: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    ipcRenderer.on("agent:output", handler);
    return () => {
      ipcRenderer.removeListener("agent:output", handler);
    };
  },
  /**
   * Subscribe to QA status update events
   * @param callback - Called when QA status changes
   * @returns Unsubscribe function
   */
  onQAStatusUpdate: (callback) => {
    const handler = (_event, status) => {
      callback(status);
    };
    ipcRenderer.on("qa:status", handler);
    return () => {
      ipcRenderer.removeListener("qa:status", handler);
    };
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
  pauseExecution: (reason) => ipcRenderer.invoke("execution:pause", reason),
  /**
   * Get execution logs for a specific QA step
   * @param stepType - The step type: 'build', 'lint', 'test', or 'review'
   * @returns Promise with array of log entries
   */
  getExecutionLogs: (stepType) => ipcRenderer.invoke("execution:getLogs", stepType),
  /**
   * Get execution status for all QA steps
   * @returns Promise with execution status object
   */
  getExecutionStatus: () => ipcRenderer.invoke("execution:getStatus"),
  /**
   * Clear all execution logs
   * @returns Promise with success status
   */
  clearExecutionLogs: () => ipcRenderer.invoke("execution:clearLogs"),
  /**
   * Export execution logs to a formatted string
   * @returns Promise with formatted log string
   */
  exportExecutionLogs: () => ipcRenderer.invoke("execution:exportLogs"),
  /**
   * Subscribe to execution log update events (real-time streaming)
   * @param callback - Called when new log entries arrive
   * @returns Unsubscribe function
   */
  onExecutionLogUpdate: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    ipcRenderer.on("execution:log", handler);
    return () => {
      ipcRenderer.removeListener("execution:log", handler);
    };
  },
  /**
   * Subscribe to execution status change events
   * @param callback - Called when status changes for any step
   * @returns Unsubscribe function
   */
  onExecutionStatusChange: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    ipcRenderer.on("execution:status", handler);
    return () => {
      ipcRenderer.removeListener("execution:status", handler);
    };
  },
  // Interview Events (BUILD-014)
  // ========================================
  /**
   * Emit interview started event
   */
  emitInterviewStarted: (payload) => ipcRenderer.invoke("interview:emit-started", payload),
  /**
   * Emit interview message event
   */
  emitInterviewMessage: (payload) => ipcRenderer.invoke("interview:emit-message", payload),
  /**
   * Emit interview requirement captured event
   */
  emitInterviewRequirement: (payload) => ipcRenderer.invoke("interview:emit-requirement", payload),
  /**
   * Emit interview completed event
   */
  emitInterviewCompleted: (payload) => ipcRenderer.invoke("interview:emit-completed", payload),
  // ========================================
  // Generic Event Emission (BUILD-015)
  // ========================================
  /**
   * Generic event emission to main process EventBus
   * @param channel - Event channel name (e.g., 'feature:created')
   * @param payload - Event payload data
   * @returns Promise that resolves on success
   */
  emitEvent: (channel, payload) => ipcRenderer.invoke("eventbus:emit", channel, payload),
  // ========================================
  // Checkpoint API (Phase 10)
  // ========================================
  /**
   * List checkpoints for a project
   * @param projectId - Project ID to list checkpoints for
   * @returns Promise with array of checkpoints
   */
  checkpointList: (projectId) => ipcRenderer.invoke("checkpoint:list", projectId),
  /**
   * Create a new checkpoint
   * @param projectId - Project ID to checkpoint
   * @param reason - Reason for the checkpoint
   * @returns Promise with created checkpoint
   */
  checkpointCreate: (projectId, reason) => ipcRenderer.invoke("checkpoint:create", projectId, reason),
  /**
   * Restore state from a checkpoint
   * @param checkpointId - Checkpoint ID to restore
   * @param restoreGit - Whether to also restore git state
   * @returns Promise that resolves on success
   */
  checkpointRestore: (checkpointId, restoreGit) => ipcRenderer.invoke("checkpoint:restore", checkpointId, restoreGit),
  /**
   * Delete a checkpoint
   * @param checkpointId - Checkpoint ID to delete
   * @returns Promise that resolves on success
   */
  checkpointDelete: (checkpointId) => ipcRenderer.invoke("checkpoint:delete", checkpointId),
  // ========================================
  // Review API (Phase 10)
  // ========================================
  /**
   * List pending reviews
   * @returns Promise with array of pending reviews
   */
  reviewList: () => ipcRenderer.invoke("review:list"),
  /**
   * Get a specific review by ID
   * @param reviewId - Review ID to get
   * @returns Promise with review or undefined
   */
  reviewGet: (reviewId) => ipcRenderer.invoke("review:get", reviewId),
  /**
   * Approve a pending review
   * @param reviewId - Review ID to approve
   * @param resolution - Optional resolution notes
   * @returns Promise that resolves on success
   */
  reviewApprove: (reviewId, resolution) => ipcRenderer.invoke("review:approve", reviewId, resolution),
  /**
   * Reject a pending review
   * @param reviewId - Review ID to reject
   * @param feedback - Required feedback for rejection
   * @returns Promise that resolves on success
   */
  reviewReject: (reviewId, feedback) => ipcRenderer.invoke("review:reject", reviewId, feedback),
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
  onTaskUpdate: (callback) => {
    const handler = (_event, task) => {
      callback(task);
    };
    ipcRenderer.on("task:updated", handler);
    return () => {
      ipcRenderer.removeListener("task:updated", handler);
    };
  },
  /**
   * Subscribe to agent status events
   * @param callback - Called when agent status changes
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onAgentStatus: (callback) => {
    const handler = (_event, status) => {
      callback(status);
    };
    ipcRenderer.on("agent:status", handler);
    return () => {
      ipcRenderer.removeListener("agent:status", handler);
    };
  },
  /**
   * Subscribe to execution progress events
   * @param callback - Called with progress updates
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onExecutionProgress: (callback) => {
    const handler = (_event, progress) => {
      callback(progress);
    };
    ipcRenderer.on("execution:progress", handler);
    return () => {
      ipcRenderer.removeListener("execution:progress", handler);
    };
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
  onMetricsUpdate: (callback) => {
    const handler = (_event, metrics) => {
      callback(metrics);
    };
    ipcRenderer.on("metrics:updated", handler);
    return () => {
      ipcRenderer.removeListener("metrics:updated", handler);
    };
  },
  /**
   * Subscribe to agent status update events
   * @param callback - Called when agent metrics change
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onAgentStatusUpdate: (callback) => {
    const handler = (_event, status) => {
      callback(status);
    };
    ipcRenderer.on("agent:metrics", handler);
    return () => {
      ipcRenderer.removeListener("agent:metrics", handler);
    };
  },
  /**
   * Subscribe to timeline event notifications
   * @param callback - Called when new timeline events occur
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onTimelineEvent: (callback) => {
    const handler = (_event, timelineEvent) => {
      callback(timelineEvent);
    };
    ipcRenderer.on("timeline:event", handler);
    return () => {
      ipcRenderer.removeListener("timeline:event", handler);
    };
  },
  /**
   * Subscribe to cost update events
   * @param callback - Called when cost metrics change
   * @returns Unsubscribe function
   *
   * Security: Does not pass event object to callback
   */
  onCostUpdate: (callback) => {
    const handler = (_event, costs) => {
      callback(costs);
    };
    ipcRenderer.on("costs:updated", handler);
    return () => {
      ipcRenderer.removeListener("costs:updated", handler);
    };
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
    getAll: () => ipcRenderer.invoke("settings:getAll"),
    /**
     * Get a single setting by dot-notation path
     * @param key - Setting path (e.g., 'ui.theme')
     * @returns Promise with setting value
     */
    get: (key) => ipcRenderer.invoke("settings:get", key),
    /**
     * Set a single setting by dot-notation path
     * @param key - Setting path (e.g., 'ui.theme')
     * @param value - New value
     * @returns Promise with success status
     */
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
    /**
     * Set an API key securely (encrypted via safeStorage)
     * @param provider - LLM provider ('claude', 'gemini', 'openai')
     * @param key - Plain text API key
     * @returns Promise with success status
     */
    setApiKey: (provider, key) => ipcRenderer.invoke("settings:setApiKey", provider, key),
    /**
     * Check if an API key is set for a provider
     * @param provider - LLM provider
     * @returns Promise with boolean
     */
    hasApiKey: (provider) => ipcRenderer.invoke("settings:hasApiKey", provider),
    /**
     * Clear an API key for a provider
     * @param provider - LLM provider
     * @returns Promise with success status
     */
    clearApiKey: (provider) => ipcRenderer.invoke("settings:clearApiKey", provider),
    /**
     * Reset all settings to defaults (also clears API keys)
     * @returns Promise with success status
     */
    reset: () => ipcRenderer.invoke("settings:reset"),
    /**
     * Check if CLI is available for a provider (Phase 17B)
     * @param provider - LLM provider to check ('claude' or 'gemini')
     * @returns Promise with detection status and message
     */
    checkCliAvailability: (provider) => ipcRenderer.invoke("settings:checkCliAvailability", provider)
  },
  // ========================================
  // Interview Engine API (Phase 9)
  // ========================================
  /**
   * Interview operations via InterviewEngine backend
   */
  interview: interviewAPI
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("nexusAPI", nexusAPI);
  } catch (error) {
    console.error("Failed to expose API:", error);
  }
} else {
  window.electron = electronAPI;
  window.nexusAPI = nexusAPI;
}
