import { app, session, ipcMain, BrowserWindow, safeStorage, shell } from "electron";
import { join } from "path";
import { nanoid } from "nanoid";
import Store from "electron-store";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const is = {
  dev: !app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      app.setLoginItemSettings({ openAtLogin: auto });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "KeyI" && (input.alt && input.meta || input.control && input.shift)) {
            event.preventDefault();
          }
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    ipcMain.on("win:invoke", (event, action) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
class EventBus {
  /** Singleton instance for static getInstance() */
  static instance = null;
  /** Event subscriptions by type */
  subscriptions = /* @__PURE__ */ new Map();
  /** Wildcard subscriptions (receive all events) */
  wildcardSubscriptions = [];
  /** Event history for debugging */
  history = [];
  /** Maximum history size */
  maxHistorySize;
  /** Default source name */
  defaultSource;
  /**
   * Create a new EventBus
   *
   * @param options - Configuration options
   */
  constructor(options = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 1e3;
    this.defaultSource = options.defaultSource ?? "nexus";
  }
  /**
   * Get the singleton EventBus instance
   * Static method for compatibility with getInstance() pattern
   *
   * @returns Global EventBus instance
   */
  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance() {
    EventBus.instance = null;
  }
  /**
   * Emit an event to all subscribed handlers
   *
   * @param type - Event type
   * @param payload - Event payload
   * @param options - Emit options
   */
  async emit(type, payload, options = {}) {
    const event = {
      id: nanoid(),
      type,
      timestamp: /* @__PURE__ */ new Date(),
      payload,
      source: options.source ?? this.defaultSource,
      ...options.correlationId !== void 0 ? { correlationId: options.correlationId } : {}
    };
    this.addToHistory(event);
    const typeSubscriptions = this.subscriptions.get(type) ?? [];
    const handlers = [];
    for (const sub of typeSubscriptions) {
      handlers.push({ sub, handler: sub.handler });
    }
    for (const sub of this.wildcardSubscriptions) {
      handlers.push({ sub, handler: sub.handler });
    }
    const toRemove = [];
    await Promise.all(
      handlers.map(async ({ sub, handler }) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`EventBus handler error for ${type}:`, error);
        }
        if (sub.once) {
          const isWildcard = this.wildcardSubscriptions.includes(sub);
          toRemove.push({ type: isWildcard ? null : type, id: sub.id });
        }
      })
    );
    for (const { type: subType, id } of toRemove) {
      if (subType === null) {
        this.wildcardSubscriptions = this.wildcardSubscriptions.filter((s) => s.id !== id);
      } else {
        const subs = this.subscriptions.get(subType);
        if (subs) {
          this.subscriptions.set(
            subType,
            subs.filter((s) => s.id !== id)
          );
        }
      }
    }
  }
  /**
   * Subscribe to an event type
   *
   * @param type - Event type to subscribe to
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on(type, handler) {
    const subscription = {
      id: nanoid(),
      handler,
      once: false
    };
    const existing = this.subscriptions.get(type) ?? [];
    this.subscriptions.set(type, [...existing, subscription]);
    return () => {
      const subs = this.subscriptions.get(type);
      if (subs) {
        this.subscriptions.set(
          type,
          subs.filter((s) => s.id !== subscription.id)
        );
      }
    };
  }
  /**
   * Subscribe to an event type (single trigger)
   *
   * @param type - Event type to subscribe to
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  once(type, handler) {
    const subscription = {
      id: nanoid(),
      handler,
      once: true
    };
    const existing = this.subscriptions.get(type) ?? [];
    this.subscriptions.set(type, [...existing, subscription]);
    return () => {
      const subs = this.subscriptions.get(type);
      if (subs) {
        this.subscriptions.set(
          type,
          subs.filter((s) => s.id !== subscription.id)
        );
      }
    };
  }
  /**
   * Unsubscribe from an event type
   *
   * @param type - Event type
   * @param handler - Handler function to remove
   */
  off(type, handler) {
    const subs = this.subscriptions.get(type);
    if (subs) {
      this.subscriptions.set(
        type,
        subs.filter((s) => s.handler !== handler)
      );
    }
  }
  /**
   * Subscribe to all events (wildcard)
   *
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  onAny(handler) {
    const subscription = {
      id: nanoid(),
      handler,
      once: false
    };
    this.wildcardSubscriptions.push(subscription);
    return () => {
      this.wildcardSubscriptions = this.wildcardSubscriptions.filter(
        (s) => s.id !== subscription.id
      );
    };
  }
  /**
   * Unsubscribe from all events (wildcard)
   *
   * @param handler - Handler function to remove
   */
  offAny(handler) {
    this.wildcardSubscriptions = this.wildcardSubscriptions.filter(
      (s) => s.handler !== handler
    );
  }
  /**
   * Get event history
   *
   * @param limit - Maximum number of events to return (default: 100)
   * @returns Array of recent events
   */
  getEventHistory(limit = 100) {
    return this.history.slice(-limit);
  }
  /**
   * Clear event history
   */
  clearHistory() {
    this.history = [];
  }
  /**
   * Get subscription count for an event type
   *
   * @param type - Event type
   * @returns Number of subscriptions
   */
  getSubscriptionCount(type) {
    return (this.subscriptions.get(type) ?? []).length;
  }
  /**
   * Get total subscription count (including wildcards)
   *
   * @returns Total number of subscriptions
   */
  getTotalSubscriptionCount() {
    let count = this.wildcardSubscriptions.length;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }
  /**
   * Get listener count for a specific event type
   *
   * @param type - Event type
   * @returns Number of listeners for this event type
   */
  listenerCount(type) {
    return (this.subscriptions.get(type) ?? []).length;
  }
  /**
   * Remove all listeners for all event types
   * Clears both type-specific and wildcard subscriptions
   */
  removeAllListeners() {
    this.subscriptions.clear();
    this.wildcardSubscriptions = [];
  }
  /**
   * Add event to history with size limit
   */
  addToHistory(event) {
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}
const ALLOWED_ORIGINS$1 = ["http://localhost:5173", "file://"];
function validateSender$1(event) {
  const url = event.sender.getURL();
  return ALLOWED_ORIGINS$1.some((origin) => url.startsWith(origin));
}
const state = {
  mode: null,
  projectId: null,
  projects: /* @__PURE__ */ new Map(),
  tasks: /* @__PURE__ */ new Map(),
  agents: /* @__PURE__ */ new Map(),
  features: /* @__PURE__ */ new Map()
};
function registerIpcHandlers() {
  ipcMain.handle("mode:genesis", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    state.mode = "genesis";
    const projectId = `genesis-${Date.now()}`;
    state.projectId = projectId;
    state.projects.set(projectId, {
      id: projectId,
      name: `Genesis Project ${state.projects.size + 1}`,
      mode: "genesis"
    });
    return { success: true, projectId };
  });
  ipcMain.handle("mode:evolution", (event, projectId) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof projectId !== "string" || !projectId) {
      throw new Error("Invalid projectId");
    }
    if (!state.projects.has(projectId)) {
      throw new Error(`Project not found: ${projectId}`);
    }
    state.mode = "evolution";
    state.projectId = projectId;
    return { success: true };
  });
  ipcMain.handle("project:get", (event, id) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid project id");
    }
    const project = state.projects.get(id);
    if (!project) {
      return null;
    }
    return project;
  });
  ipcMain.handle("projects:list", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.projects.values());
  });
  ipcMain.handle("dashboard:getMetrics", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const projects = Array.from(state.projects.values());
    const tasks = Array.from(state.tasks.values());
    const agents = Array.from(state.agents.values());
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const failedTasks = tasks.filter((t) => t.status === "failed").length;
    const activeAgents = agents.filter((a) => a.status === "working").length;
    return {
      projectId: state.projectId || "no-project",
      projectName: projects.length > 0 ? projects[0].name : "No Active Project",
      totalFeatures: Math.ceil(tasks.length / 3),
      // Approximate features from tasks
      completedFeatures: Math.floor(completedTasks / 3),
      completedTasks,
      totalTasks: tasks.length,
      failedTasks,
      activeAgents,
      estimatedRemainingMinutes: Math.max(0, (tasks.length - completedTasks) * 5),
      estimatedCompletion: new Date(Date.now() + Math.max(0, (tasks.length - completedTasks) * 5) * 6e4),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1e3),
      // 2 hours ago
      updatedAt: /* @__PURE__ */ new Date()
    };
  });
  ipcMain.handle("dashboard:getCosts", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return {
      totalCost: 0,
      totalTokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUSD: 0,
      breakdownByModel: [],
      breakdownByAgent: [],
      updatedAt: /* @__PURE__ */ new Date()
    };
  });
  ipcMain.handle(
    "project:create",
    (event, input) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof input.name !== "string" || !input.name) {
        throw new Error("Invalid project name");
      }
      if (input.mode !== "genesis" && input.mode !== "evolution") {
        throw new Error("Invalid project mode");
      }
      const id = `project-${Date.now()}`;
      const project = { id, name: input.name, mode: input.mode };
      state.projects.set(id, project);
      return { id };
    }
  );
  ipcMain.handle("tasks:list", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.tasks.values());
  });
  ipcMain.handle(
    "task:update",
    (event, id, update) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof id !== "string" || !id) {
        throw new Error("Invalid task id");
      }
      const task = state.tasks.get(id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      const allowedKeys = ["name", "status", "assignedAgent"];
      for (const key of allowedKeys) {
        if (key in update) {
          task[key] = update[key];
        }
      }
      state.tasks.set(id, task);
      return void 0;
    }
  );
  ipcMain.handle("agents:status", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.agents.values());
  });
  ipcMain.handle("agents:list", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const agents = Array.from(state.agents.values()).map((agent) => ({
      id: agent.id,
      type: agent.type || "coder",
      status: agent.status || "idle",
      model: void 0,
      currentTask: void 0,
      iteration: void 0,
      metrics: void 0,
      currentFile: void 0
    }));
    return agents;
  });
  ipcMain.handle("agents:get", (event, id) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid agent id");
    }
    const agent = state.agents.get(id);
    if (!agent) {
      return null;
    }
    return {
      id: agent.id,
      type: agent.type || "coder",
      status: agent.status || "idle",
      model: void 0,
      currentTask: void 0,
      iteration: void 0,
      metrics: void 0,
      currentFile: void 0
    };
  });
  ipcMain.handle("agents:getPoolStatus", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const agents = Array.from(state.agents.values());
    const working = agents.filter((a) => a.status === "working").length;
    const idle = agents.filter((a) => a.status === "idle" || !a.status).length;
    const error = agents.filter((a) => a.status === "error").length;
    const complete = agents.filter((a) => a.status === "complete").length;
    const byType = {
      planner: { total: 0, active: 0, idle: 0, max: 1 },
      coder: { total: 0, active: 0, idle: 0, max: 4 },
      tester: { total: 0, active: 0, idle: 0, max: 2 },
      reviewer: { total: 0, active: 0, idle: 0, max: 2 },
      merger: { total: 0, active: 0, idle: 0, max: 1 }
    };
    for (const agent of agents) {
      const agentType = agent.type || "coder";
      if (byType[agentType]) {
        byType[agentType].total++;
        if (agent.status === "working") {
          byType[agentType].active++;
        } else {
          byType[agentType].idle++;
        }
      }
    }
    return {
      totalAgents: agents.length,
      maxAgents: 10,
      // Default maximum
      working,
      idle,
      error,
      complete,
      byType,
      tasksInProgress: working
    };
  });
  ipcMain.handle("agents:getOutput", (event, id) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid agent id");
    }
    return [];
  });
  ipcMain.handle("agents:getQAStatus", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return {
      steps: [
        { type: "build", status: "pending" },
        { type: "lint", status: "pending" },
        { type: "test", status: "pending" },
        { type: "review", status: "pending" }
      ],
      iteration: 0,
      maxIterations: 50
    };
  });
  const executionLogs = /* @__PURE__ */ new Map([
    ["build", []],
    ["lint", []],
    ["test", []],
    ["review", []]
  ]);
  const executionStatuses = /* @__PURE__ */ new Map([
    ["build", "pending"],
    ["lint", "pending"],
    ["test", "pending"],
    ["review", "pending"]
  ]);
  const executionDurations = /* @__PURE__ */ new Map();
  const executionCounts = /* @__PURE__ */ new Map();
  let currentExecutionTaskId = null;
  let currentExecutionTaskName = null;
  ipcMain.handle("execution:getLogs", (event, stepType) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!["build", "lint", "test", "review"].includes(stepType)) {
      throw new Error("Invalid step type");
    }
    return executionLogs.get(stepType) || [];
  });
  ipcMain.handle("execution:getStatus", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const steps = ["build", "lint", "test", "review"].map((type) => ({
      type,
      status: executionStatuses.get(type) || "pending",
      count: executionCounts.get(type),
      duration: executionDurations.get(type),
      logs: executionLogs.get(type) || []
    }));
    return {
      steps,
      currentTaskId: currentExecutionTaskId,
      currentTaskName: currentExecutionTaskName,
      totalDuration: Array.from(executionDurations.values()).reduce((a, b) => a + b, 0)
    };
  });
  ipcMain.handle("execution:clearLogs", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    for (const type of ["build", "lint", "test", "review"]) {
      executionLogs.set(type, []);
      executionStatuses.set(type, "pending");
      executionDurations.delete(type);
      executionCounts.delete(type);
    }
    currentExecutionTaskId = null;
    currentExecutionTaskName = null;
    return { success: true };
  });
  ipcMain.handle("execution:exportLogs", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    let output = `Nexus Execution Logs
`;
    output += `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
    output += `Task: ${currentExecutionTaskName || "N/A"}
`;
    output += `${"=".repeat(60)}

`;
    for (const type of ["build", "lint", "test", "review"]) {
      const logs = executionLogs.get(type) || [];
      const status = executionStatuses.get(type) || "pending";
      const duration = executionDurations.get(type);
      output += `## ${type.toUpperCase()} [${status.toUpperCase()}]`;
      if (duration) output += ` (${(duration / 1e3).toFixed(2)}s)`;
      output += `
${"-".repeat(40)}
`;
      if (logs.length === 0) {
        output += `No logs
`;
      } else {
        for (const log of logs) {
          output += `[${new Date(log.timestamp).toISOString()}] ${log.message}
`;
          if (log.details) output += `  ${log.details}
`;
        }
      }
      output += `
`;
    }
    return output;
  });
  function addExecutionLog(type, message, details, logType = "info") {
    const logs = executionLogs.get(type) || [];
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: /* @__PURE__ */ new Date(),
      type: logType,
      message,
      details
    });
    executionLogs.set(type, logs);
  }
  global.addExecutionLog = addExecutionLog;
  global.executionStatuses = executionStatuses;
  global.executionDurations = executionDurations;
  global.executionCounts = executionCounts;
  global.setCurrentExecutionTask = (id, name) => {
    currentExecutionTaskId = id;
    currentExecutionTaskName = name;
  };
  ipcMain.handle("features:list", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.features.values());
  });
  ipcMain.handle("feature:get", (event, id) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid feature id");
    }
    return state.features.get(id) || null;
  });
  ipcMain.handle("feature:create", (event, input) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof input.title !== "string" || !input.title) {
      throw new Error("Invalid feature title");
    }
    const id = `feature-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const feature = {
      id,
      title: input.title,
      description: input.description || "",
      status: "backlog",
      priority: input.priority || "medium",
      complexity: input.complexity || "moderate",
      progress: 0,
      tasks: [],
      createdAt: now,
      updatedAt: now
    };
    state.features.set(id, feature);
    const eventBus = EventBus.getInstance();
    void eventBus.emit("feature:created", {
      feature: {
        id,
        projectId: state.projectId || "current",
        name: feature.title,
        description: feature.description,
        priority: feature.priority === "critical" ? "critical" : feature.priority === "high" ? "high" : feature.priority === "medium" ? "medium" : "low",
        status: "pending",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      projectId: state.projectId || "current"
    }, { source: "IPC" });
    return feature;
  });
  ipcMain.handle("feature:update", (event, id, update) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid feature id");
    }
    const feature = state.features.get(id);
    if (!feature) {
      throw new Error(`Feature not found: ${id}`);
    }
    const previousStatus = feature.status;
    const allowedKeys = ["title", "description", "status", "priority", "complexity", "progress", "assignedAgent"];
    for (const key of allowedKeys) {
      if (key in update) {
        feature[key] = update[key];
      }
    }
    feature.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.features.set(id, feature);
    if (update.status && update.status !== previousStatus) {
      const eventBus = EventBus.getInstance();
      void eventBus.emit("feature:status-changed", {
        featureId: id,
        projectId: state.projectId || "current",
        previousStatus: mapUIStatusToCoreStatus(previousStatus),
        newStatus: mapUIStatusToCoreStatus(update.status)
      }, { source: "IPC" });
      if (update.status === "done") {
        void eventBus.emit("feature:completed", {
          featureId: id,
          projectId: state.projectId || "current",
          tasksCompleted: feature.tasks.length,
          duration: 0
        }, { source: "IPC" });
      }
    }
    return feature;
  });
  ipcMain.handle("feature:delete", (event, id) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid feature id");
    }
    const deleted = state.features.delete(id);
    if (!deleted) {
      throw new Error(`Feature not found: ${id}`);
    }
    const eventBus = EventBus.getInstance();
    void eventBus.emit("feature:deleted", {
      featureId: id,
      projectId: state.projectId || "current"
    }, { source: "IPC" });
    return { success: true };
  });
  ipcMain.handle("execution:pause", (event, reason) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:paused", { reason });
    }
    return { success: true };
  });
  ipcMain.handle(
    "interview:emit-started",
    (event, payload) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || `interview-${Date.now()}`;
      void eventBus.emit(
        "interview:started",
        {
          projectId,
          projectName: payload.projectName || "Untitled Project",
          mode: payload.mode
        },
        { source: "InterviewUI" }
      );
    }
  );
  ipcMain.handle(
    "interview:emit-message",
    (event, payload) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      void eventBus.emit(
        "interview:question-asked",
        {
          projectId,
          questionId: payload.messageId,
          question: payload.content,
          category: payload.role === "assistant" ? "ai-response" : "user-input"
        },
        { source: "InterviewUI" }
      );
    }
  );
  ipcMain.handle(
    "interview:emit-requirement",
    (event, payload) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      const categoryMap = {
        non_functional: "performance",
        user_story: "functional",
        constraint: "technical",
        functional: "functional",
        technical: "technical",
        ui: "ui",
        performance: "performance",
        security: "security"
      };
      const mappedCategory = categoryMap[payload.category] ?? "functional";
      const priorityMap = {
        must: "critical",
        should: "high",
        could: "medium",
        wont: "low",
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low"
      };
      const mappedPriority = priorityMap[payload.priority] ?? "medium";
      const now = /* @__PURE__ */ new Date();
      void eventBus.emit(
        "interview:requirement-captured",
        {
          projectId,
          requirement: {
            id: payload.requirementId,
            projectId,
            category: mappedCategory,
            content: payload.text,
            priority: mappedPriority,
            source: "interview",
            createdAt: now,
            updatedAt: now
          }
        },
        { source: "InterviewUI" }
      );
    }
  );
  ipcMain.handle(
    "interview:emit-completed",
    (event, payload) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      void eventBus.emit(
        "interview:completed",
        {
          projectId,
          totalRequirements: payload.requirementCount,
          categories: payload.categories,
          duration: payload.duration
        },
        { source: "InterviewUI" }
      );
    }
  );
  ipcMain.handle(
    "eventbus:emit",
    (event, channel, payload) => {
      if (!validateSender$1(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof channel !== "string" || !channel) {
        throw new Error("Invalid event channel");
      }
      const eventBus = EventBus.getInstance();
      void eventBus.emit(channel, payload, { source: "RendererUI" });
    }
  );
}
function setupEventForwarding(mainWindow2) {
  eventForwardingWindow = mainWindow2;
  const eventBus = EventBus.getInstance();
  eventBus.on("task:started", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "task_started",
      title: `Task ${event.payload.taskId} started`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        agentId: event.payload.agentId
      }
    });
  });
  eventBus.on("task:completed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "task_completed",
      title: `Task ${event.payload.taskId} completed`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    });
  });
  eventBus.on("task:failed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "task_failed",
      title: `Task ${event.payload.taskId} failed: ${event.payload.error}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    });
  });
  eventBus.on("task:qa-iteration", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "qa_iteration",
      title: `QA iteration ${event.payload.iteration}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iteration: event.payload.iteration
      }
    });
  });
  eventBus.on("agent:assigned", (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: "working",
      currentTask: event.payload.taskId
    });
    forwardTimelineEvent({
      id: event.id,
      type: "agent_task_assigned",
      title: `Agent ${event.payload.agentId} assigned task`,
      timestamp: event.timestamp,
      metadata: {
        agentId: event.payload.agentId,
        taskId: event.payload.taskId
      }
    });
  });
  eventBus.on("agent:idle", (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: "idle",
      currentTask: null,
      progress: 100
    });
  });
  eventBus.on("agent:error", (event) => {
    forwardAgentMetrics({
      id: event.payload.agentId,
      status: "error"
    });
    forwardTimelineEvent({
      id: event.id,
      type: "agent_error",
      title: `Agent ${event.payload.agentId} error: ${event.payload.error}`,
      timestamp: event.timestamp,
      metadata: {
        agentId: event.payload.agentId
      }
    });
  });
  eventBus.on("qa:build-started", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "build_started",
      title: `Build started for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    });
  });
  eventBus.on("qa:build-completed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "build_completed",
      title: event.payload.passed ? "Build succeeded" : "Build failed",
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    });
  });
  eventBus.on("qa:loop-completed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: event.payload.passed ? "qa_passed" : "qa_failed",
      title: event.payload.passed ? `QA passed for task ${event.payload.taskId}` : `QA failed for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iterations: event.payload.iterations
      }
    });
  });
  eventBus.on("feature:status-changed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "feature_status_changed",
      title: `Feature moved to ${event.payload.newStatus}`,
      timestamp: event.timestamp,
      metadata: {
        featureId: event.payload.featureId
      }
    });
  });
  eventBus.on("feature:completed", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "feature_completed",
      title: `Feature ${event.payload.featureId} completed`,
      timestamp: event.timestamp,
      metadata: {
        featureId: event.payload.featureId,
        tasksCompleted: event.payload.tasksCompleted
      }
    });
  });
  eventBus.on("system:checkpoint-created", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "checkpoint_created",
      title: `Checkpoint created: ${event.payload.checkpointId}`,
      timestamp: event.timestamp,
      metadata: {}
    });
  });
}
let eventForwardingWindow = null;
function forwardAgentMetrics(agentMetrics) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("agent:metrics", agentMetrics);
  }
}
function forwardTimelineEvent(timelineEvent) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("timeline:event", timelineEvent);
  }
}
function mapUIStatusToCoreStatus(status) {
  const map = {
    backlog: "pending",
    planning: "decomposing",
    in_progress: "in_progress",
    ai_review: "in_progress",
    // AI review is still in progress
    human_review: "ready",
    // Ready for final review
    done: "completed"
  };
  return map[status] || "pending";
}
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const LOCAL_EMBEDDING_MODELS = {
  "Xenova/all-MiniLM-L6-v2": {
    id: "Xenova/all-MiniLM-L6-v2",
    name: "MiniLM L6 v2",
    dimensions: 384,
    description: "Fast, lightweight - Best for most use cases",
    isDefault: true
  },
  "Xenova/all-mpnet-base-v2": {
    id: "Xenova/all-mpnet-base-v2",
    name: "MPNet Base v2",
    dimensions: 768,
    description: "Higher quality - Larger model"
  },
  "Xenova/bge-small-en-v1.5": {
    id: "Xenova/bge-small-en-v1.5",
    name: "BGE Small English",
    dimensions: 384,
    description: "Optimized for retrieval tasks"
  },
  "Xenova/bge-base-en-v1.5": {
    id: "Xenova/bge-base-en-v1.5",
    name: "BGE Base English",
    dimensions: 768,
    description: "Higher quality BGE model"
  }
};
const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const defaults = {
  llm: {
    // Phase 16: Provider-specific settings with CLI-first defaults
    claude: {
      backend: "cli",
      timeout: 3e5,
      // 5 minutes
      maxRetries: 2,
      model: DEFAULT_CLAUDE_MODEL
      // claude-sonnet-4-5-20250929
    },
    gemini: {
      backend: "cli",
      timeout: 3e5,
      // 5 minutes
      model: DEFAULT_GEMINI_MODEL
      // gemini-2.5-flash
    },
    embeddings: {
      backend: "local",
      localModel: DEFAULT_LOCAL_EMBEDDING_MODEL,
      // Xenova/all-MiniLM-L6-v2
      dimensions: LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL].dimensions,
      cacheEnabled: true,
      maxCacheSize: 1e4
    },
    // Orchestration settings
    defaultProvider: "claude",
    defaultModel: DEFAULT_CLAUDE_MODEL,
    // claude-sonnet-4-5-20250929
    fallbackEnabled: true,
    fallbackOrder: ["claude", "gemini"]
  },
  agents: {
    maxParallelAgents: 4,
    taskTimeoutMinutes: 30,
    maxRetries: 3,
    autoRetryEnabled: true
  },
  checkpoints: {
    autoCheckpointEnabled: true,
    autoCheckpointIntervalMinutes: 5,
    maxCheckpointsToKeep: 10,
    checkpointOnFeatureComplete: true
  },
  ui: {
    theme: "system",
    sidebarWidth: 280,
    showNotifications: true,
    notificationDuration: 5e3
  },
  project: {
    defaultLanguage: "typescript",
    defaultTestFramework: "vitest",
    outputDirectory: ".nexus"
  }
};
const schema = {
  llm: {
    type: "object",
    properties: {
      // Phase 16: Claude provider settings
      claude: {
        type: "object",
        properties: {
          backend: { type: "string", enum: ["cli", "api"] },
          apiKeyEncrypted: { type: "string" },
          cliPath: { type: "string" },
          timeout: { type: "number", minimum: 1e3, maximum: 6e5 },
          maxRetries: { type: "number", minimum: 0, maximum: 10 },
          model: { type: "string" }
        },
        default: defaults.llm.claude
      },
      // Phase 16: Gemini provider settings
      gemini: {
        type: "object",
        properties: {
          backend: { type: "string", enum: ["cli", "api"] },
          apiKeyEncrypted: { type: "string" },
          cliPath: { type: "string" },
          timeout: { type: "number", minimum: 1e3, maximum: 6e5 },
          model: { type: "string" }
        },
        default: defaults.llm.gemini
      },
      // Phase 16: Embeddings provider settings
      embeddings: {
        type: "object",
        properties: {
          backend: { type: "string", enum: ["local", "api"] },
          apiKeyEncrypted: { type: "string" },
          localModel: { type: "string" },
          dimensions: { type: "number", minimum: 1 },
          cacheEnabled: { type: "boolean" },
          maxCacheSize: { type: "number", minimum: 100 }
        },
        default: defaults.llm.embeddings
      },
      // Legacy API key fields (kept for backwards compatibility)
      claudeApiKeyEncrypted: { type: "string" },
      geminiApiKeyEncrypted: { type: "string" },
      openaiApiKeyEncrypted: { type: "string" },
      // Orchestration settings
      defaultProvider: { type: "string", enum: ["claude", "gemini"] },
      defaultModel: { type: "string" },
      fallbackEnabled: { type: "boolean" },
      fallbackOrder: { type: "array", items: { type: "string" } }
    },
    default: defaults.llm
  },
  agents: {
    type: "object",
    properties: {
      maxParallelAgents: { type: "number", minimum: 1, maximum: 10 },
      taskTimeoutMinutes: { type: "number", minimum: 1, maximum: 120 },
      maxRetries: { type: "number", minimum: 0, maximum: 10 },
      autoRetryEnabled: { type: "boolean" }
    },
    default: defaults.agents
  },
  checkpoints: {
    type: "object",
    properties: {
      autoCheckpointEnabled: { type: "boolean" },
      autoCheckpointIntervalMinutes: { type: "number", minimum: 5, maximum: 60 },
      maxCheckpointsToKeep: { type: "number", minimum: 1, maximum: 50 },
      checkpointOnFeatureComplete: { type: "boolean" }
    },
    default: defaults.checkpoints
  },
  ui: {
    type: "object",
    properties: {
      theme: { type: "string", enum: ["light", "dark", "system"] },
      sidebarWidth: { type: "number", minimum: 200, maximum: 500 },
      showNotifications: { type: "boolean" },
      notificationDuration: { type: "number", minimum: 1e3, maximum: 3e4 }
    },
    default: defaults.ui
  },
  project: {
    type: "object",
    properties: {
      defaultLanguage: { type: "string" },
      defaultTestFramework: { type: "string" },
      outputDirectory: { type: "string" }
    },
    default: defaults.project
  }
};
class SettingsService {
  store;
  constructor() {
    this.store = new Store({
      name: "nexus-settings",
      schema,
      defaults,
      clearInvalidConfig: true
    });
  }
  /**
   * Get all settings with public view (no encrypted keys)
   * Returns hasXxxKey booleans instead of actual encrypted values
   * Phase 16: Updated to include provider-specific settings
   */
  getAll() {
    const llm = this.store.get("llm");
    const agents = this.store.get("agents");
    const checkpoints = this.store.get("checkpoints");
    const ui = this.store.get("ui");
    const project = this.store.get("project");
    const claude = llm.claude ?? defaults.llm.claude;
    const gemini = llm.gemini ?? defaults.llm.gemini;
    const embeddings = llm.embeddings ?? defaults.llm.embeddings;
    return {
      llm: {
        // Phase 16: Provider-specific public views
        claude: {
          backend: claude.backend ?? "cli",
          hasApiKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
          cliPath: claude.cliPath,
          timeout: claude.timeout,
          maxRetries: claude.maxRetries,
          model: claude.model
        },
        gemini: {
          backend: gemini.backend ?? "cli",
          hasApiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
          cliPath: gemini.cliPath,
          timeout: gemini.timeout,
          model: gemini.model
        },
        embeddings: {
          backend: embeddings.backend ?? "local",
          hasApiKey: !!embeddings.apiKeyEncrypted || !!llm.openaiApiKeyEncrypted,
          localModel: embeddings.localModel,
          dimensions: embeddings.dimensions,
          cacheEnabled: embeddings.cacheEnabled,
          maxCacheSize: embeddings.maxCacheSize
        },
        // Orchestration settings
        defaultProvider: llm.defaultProvider ?? "claude",
        defaultModel: llm.defaultModel ?? DEFAULT_CLAUDE_MODEL,
        fallbackEnabled: llm.fallbackEnabled ?? true,
        fallbackOrder: llm.fallbackOrder ?? ["claude", "gemini"],
        // Legacy compatibility
        hasClaudeKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
        hasGeminiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
        hasOpenaiKey: !!embeddings.apiKeyEncrypted || !!llm.openaiApiKeyEncrypted
      },
      agents,
      checkpoints,
      ui,
      project
    };
  }
  /**
   * Get a single setting by dot-notation path
   * @param key - Dot-notation path (e.g., 'llm.defaultProvider')
   * @returns The setting value or undefined
   */
  get(key) {
    if (key.includes("ApiKeyEncrypted")) {
      console.warn("Cannot access encrypted API keys via get(). Use hasApiKey() instead.");
      return void 0;
    }
    return this.store.get(key);
  }
  /**
   * Set a single setting by dot-notation path
   * @param key - Dot-notation path (e.g., 'ui.theme')
   * @param value - The value to set
   */
  set(key, value) {
    if (key.includes("ApiKeyEncrypted")) {
      console.warn("Cannot set encrypted API keys via set(). Use setApiKey() instead.");
      return;
    }
    this.store.set(key, value);
  }
  /**
   * Securely set an API key using OS-level encryption
   * @param provider - The LLM provider ('claude', 'gemini', or 'openai')
   * @param plainKey - The plain text API key
   * @returns true if successful, false if encryption unavailable
   */
  setApiKey(provider, plainKey) {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error("safeStorage encryption not available on this system");
      return false;
    }
    try {
      const encrypted = safeStorage.encryptString(plainKey);
      const base64 = encrypted.toString("base64");
      this.store.set(`llm.${provider}ApiKeyEncrypted`, base64);
      return true;
    } catch (error) {
      console.error(`Failed to encrypt ${provider} API key:`, error);
      return false;
    }
  }
  /**
   * Get a decrypted API key
   * @param provider - The LLM provider
   * @returns The decrypted API key or null if not set/unavailable
   */
  getApiKey(provider) {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error("safeStorage encryption not available on this system");
      return null;
    }
    const base64 = this.store.get(`llm.${provider}ApiKeyEncrypted`);
    if (!base64 || typeof base64 !== "string") {
      return null;
    }
    try {
      const encrypted = Buffer.from(base64, "base64");
      return safeStorage.decryptString(encrypted);
    } catch (error) {
      console.error(`Failed to decrypt ${provider} API key:`, error);
      return null;
    }
  }
  /**
   * Check if an API key is set for a provider
   * @param provider - The LLM provider
   * @returns true if a key is stored
   */
  hasApiKey(provider) {
    const key = this.store.get(`llm.${provider}ApiKeyEncrypted`);
    return !!key;
  }
  /**
   * Clear an API key for a provider
   * @param provider - The LLM provider
   */
  clearApiKey(provider) {
    this.store.delete(`llm.${provider}ApiKeyEncrypted`);
  }
  /**
   * Reset all settings to defaults
   * This also clears all API keys
   */
  reset() {
    this.store.clear();
  }
  /**
   * Get the path to the settings file
   * Useful for debugging
   */
  getStorePath() {
    return this.store.path;
  }
}
const settingsService = new SettingsService();
const ALLOWED_ORIGINS = ["http://localhost:5173", "file://"];
function validateSender(event) {
  const url = event.sender.getURL();
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}
function isValidProvider(provider) {
  return provider === "claude" || provider === "gemini" || provider === "openai";
}
function registerSettingsHandlers() {
  ipcMain.handle("settings:getAll", (event) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return settingsService.getAll();
  });
  ipcMain.handle("settings:get", (event, key) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Invalid settings key");
    }
    return settingsService.get(key);
  });
  ipcMain.handle("settings:set", (event, key, value) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Invalid settings key");
    }
    settingsService.set(key, value);
    return true;
  });
  ipcMain.handle("settings:setApiKey", (event, provider, key) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!isValidProvider(provider)) {
      throw new Error("Invalid LLM provider. Must be claude, gemini, or openai.");
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Invalid API key");
    }
    return settingsService.setApiKey(provider, key);
  });
  ipcMain.handle("settings:hasApiKey", (event, provider) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!isValidProvider(provider)) {
      throw new Error("Invalid LLM provider. Must be claude, gemini, or openai.");
    }
    return settingsService.hasApiKey(provider);
  });
  ipcMain.handle("settings:clearApiKey", (event, provider) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!isValidProvider(provider)) {
      throw new Error("Invalid LLM provider. Must be claude, gemini, or openai.");
    }
    settingsService.clearApiKey(provider);
    return true;
  });
  ipcMain.handle("settings:reset", (event) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    settingsService.reset();
    return true;
  });
}
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
void app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.nexus.app");
  registerIpcHandlers();
  registerSettingsHandlers();
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  if (mainWindow) {
    setupEventForwarding(mainWindow);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
export {
  createWindow,
  mainWindow
};
