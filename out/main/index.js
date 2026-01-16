import { app, session, ipcMain, BrowserWindow, shell } from "electron";
import { join } from "path";
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
  static instance = null;
  /** Event type to handlers map */
  handlers = /* @__PURE__ */ new Map();
  /** Wildcard handlers that receive all events */
  wildcardHandlers = /* @__PURE__ */ new Set();
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance() {
    EventBus.instance = null;
  }
  /**
   * Emit an event to all registered handlers
   *
   * @param type Event type from EventType union
   * @param payload Type-safe payload for the event type
   * @param options Optional correlationId and source override
   */
  emit(type, payload, options) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: /* @__PURE__ */ new Date(),
      payload,
      source: options?.source ?? "EventBus",
      correlationId: options?.correlationId
    };
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        this.safeCall(handler, event);
      }
    }
    for (const handler of this.wildcardHandlers) {
      this.safeCall(handler, event);
    }
  }
  /**
   * Subscribe to events of a specific type
   *
   * @param type Event type to subscribe to
   * @param handler Handler function called with NexusEvent
   * @returns Unsubscribe function
   */
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, /* @__PURE__ */ new Set());
    }
    const internalHandler = handler;
    this.handlers.get(type).add(internalHandler);
    return () => {
      this.handlers.get(type)?.delete(internalHandler);
    };
  }
  /**
   * Subscribe to events of a specific type, but only fire once
   *
   * @param type Event type to subscribe to
   * @param handler Handler function called with NexusEvent
   * @returns Unsubscribe function
   */
  once(type, handler) {
    let unsubscribed = false;
    const wrappedHandler = (event) => {
      if (unsubscribed) return;
      unsubscribed = true;
      unsubscribe();
      handler(event);
    };
    const unsubscribe = this.on(type, wrappedHandler);
    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }
  /**
   * Unsubscribe a specific handler from an event type
   *
   * @param type Event type
   * @param handler Handler to remove
   */
  off(type, handler) {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
    }
  }
  /**
   * Subscribe to all events (wildcard)
   *
   * @param handler Handler function called with any event
   * @returns Unsubscribe function
   */
  onAny(handler) {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }
  /**
   * Remove all listeners for a specific type or all types
   *
   * @param type Optional event type - if omitted, removes ALL handlers
   */
  removeAllListeners(type) {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
      this.wildcardHandlers.clear();
    }
  }
  /**
   * Get the number of listeners for an event type
   *
   * @param type Event type
   * @returns Number of registered handlers
   */
  listenerCount(type) {
    return this.handlers.get(type)?.size ?? 0;
  }
  /**
   * Safely call a handler, catching any errors to prevent
   * one handler from affecting others
   */
  safeCall(handler, event) {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        void result.catch(() => {
        });
      }
    } catch {
    }
  }
}
const ALLOWED_ORIGINS = ["http://localhost:5173", "file://"];
function validateSender(event) {
  const url = event.sender.getURL();
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}
const state = {
  mode: null,
  projectId: null,
  projects: /* @__PURE__ */ new Map(),
  tasks: /* @__PURE__ */ new Map(),
  agents: /* @__PURE__ */ new Map()
};
function registerIpcHandlers() {
  ipcMain.handle("mode:genesis", async (event) => {
    if (!validateSender(event)) {
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
  ipcMain.handle("mode:evolution", async (event, projectId) => {
    if (!validateSender(event)) {
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
  ipcMain.handle("project:get", async (event, id) => {
    if (!validateSender(event)) {
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
  ipcMain.handle(
    "project:create",
    async (event, input) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (!input || typeof input.name !== "string" || !input.name) {
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
  ipcMain.handle("tasks:list", async (event) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.tasks.values());
  });
  ipcMain.handle(
    "task:update",
    async (event, id, update) => {
      if (!validateSender(event)) {
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
  ipcMain.handle("agents:status", async (event) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.agents.values());
  });
  ipcMain.handle("execution:pause", async (event, reason) => {
    if (!validateSender(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:paused", { reason });
    }
    return { success: true };
  });
  ipcMain.handle(
    "interview:emit-started",
    async (event, payload) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || `interview-${Date.now()}`;
      eventBus.emit(
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
    async (event, payload) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      eventBus.emit(
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
    async (event, payload) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      const categoryMap = {
        non_functional: "non-functional",
        user_story: "business-logic",
        constraint: "technical"
      };
      const mappedCategory = categoryMap[payload.category] || payload.category;
      eventBus.emit(
        "interview:requirement-captured",
        {
          projectId,
          requirement: {
            id: payload.requirementId,
            projectId,
            category: mappedCategory,
            description: payload.text,
            priority: payload.priority,
            userStories: [],
            acceptanceCriteria: [],
            linkedFeatures: [],
            validated: false,
            confidence: 1,
            tags: [],
            createdAt: /* @__PURE__ */ new Date()
          }
        },
        { source: "InterviewUI" }
      );
    }
  );
  ipcMain.handle(
    "interview:emit-completed",
    async (event, payload) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      const eventBus = EventBus.getInstance();
      const projectId = state.projectId || "unknown";
      eventBus.emit(
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
    async (event, channel, payload) => {
      if (!validateSender(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof channel !== "string" || !channel) {
        throw new Error("Invalid event channel");
      }
      const eventBus = EventBus.getInstance();
      eventBus.emit(channel, payload, { source: "RendererUI" });
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
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.nexus.app");
  registerIpcHandlers();
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
