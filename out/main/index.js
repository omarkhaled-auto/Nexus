import { app, session, ipcMain, BrowserWindow, safeStorage, dialog, shell } from "electron";
import * as path from "path";
import { resolve, extname, posix, relative, basename, join as join$1 } from "path";
import { webcrypto, randomFillSync, randomUUID } from "node:crypto";
import { relations, eq, and, or, desc } from "drizzle-orm";
import { sqliteTable, integer, text, real, blob } from "drizzle-orm/sqlite-core";
import * as fs from "fs/promises";
import { readFile, stat } from "fs/promises";
import { execSync, spawn } from "child_process";
import Store from "electron-store";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { simpleGit } from "simple-git";
import { normalize, join, dirname } from "pathe";
import fse, { ensureDirSync } from "fs-extra";
import { execaCommand } from "execa";
import fg from "fast-glob";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
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
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function nanoid(size = 21) {
  fillPool(size |= 0);
  let id = "";
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id;
}
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
let globalEventBus = null;
function getEventBus() {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
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
const MODEL_PRICING_INFO = {
  // Claude 4.5 Family
  "claude-opus-4-5-20251101": {
    inputPerMillion: 5,
    outputPerMillion: 25
  },
  "claude-sonnet-4-5-20250929": {
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillion: 1,
    outputPerMillion: 5
  },
  // Claude 4.x Family
  "claude-opus-4-1-20250805": {
    inputPerMillion: 15,
    outputPerMillion: 75
  },
  "claude-sonnet-4-20250514": {
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  // Gemini models (approximate)
  "gemini-3-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 5
  },
  "gemini-3-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3
  },
  "gemini-2.5-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 5
  },
  "gemini-2.5-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3
  },
  "gemini-2.5-flash-lite": {
    inputPerMillion: 0.0375,
    outputPerMillion: 0.15
  }
};
function validateSender$4(event) {
  const url = event.sender.getURL();
  return url.startsWith("http://localhost:") || url.startsWith("file://");
}
class ReviewNotInitializedError extends Error {
  constructor(initError) {
    const baseMessage = "Review system is not available. ";
    const hint = initError ? `Initialization failed: ${initError}.` : "Please wait for Nexus to finish initializing.";
    super(baseMessage + hint);
    this.name = "ReviewNotInitializedError";
  }
}
const REVIEW_CHANNELS = [
  "review:list",
  "review:get",
  "review:approve",
  "review:reject"
];
const state = {
  mode: null,
  projectId: null,
  projects: /* @__PURE__ */ new Map(),
  tasks: /* @__PURE__ */ new Map(),
  agents: /* @__PURE__ */ new Map(),
  features: /* @__PURE__ */ new Map()
};
let checkpointManagerRef = null;
let humanReviewServiceRef = null;
let databaseClientRef = null;
let currentQAIteration = 0;
const maxQAIterations = 50;
const DEFAULT_INPUT_COST_PER_MILLION = 3;
const DEFAULT_OUTPUT_COST_PER_MILLION = 15;
const tokenUsage = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCalls: 0,
  byModel: {},
  byAgent: {},
  updatedAt: /* @__PURE__ */ new Date()
};
function accumulateTokenUsage(usage) {
  tokenUsage.totalInputTokens += usage.inputTokens;
  tokenUsage.totalOutputTokens += usage.outputTokens;
  tokenUsage.totalCalls++;
  tokenUsage.updatedAt = /* @__PURE__ */ new Date();
  forwardCostUpdate(getTokenUsageAndCosts());
  if (usage.model) {
    const modelKey = usage.model;
    const modelUsage = tokenUsage.byModel[modelKey] ?? { inputTokens: 0, outputTokens: 0, calls: 0 };
    modelUsage.inputTokens += usage.inputTokens;
    modelUsage.outputTokens += usage.outputTokens;
    modelUsage.calls++;
    tokenUsage.byModel[modelKey] = modelUsage;
  }
  if (usage.agentId) {
    const agentKey = usage.agentId;
    const agentUsage = tokenUsage.byAgent[agentKey] ?? { inputTokens: 0, outputTokens: 0, calls: 0 };
    agentUsage.inputTokens += usage.inputTokens;
    agentUsage.outputTokens += usage.outputTokens;
    agentUsage.calls++;
    tokenUsage.byAgent[agentKey] = agentUsage;
  }
}
function getTokenUsageAndCosts() {
  const calculateCostForModel = (input, output, model) => {
    const pricing = model ? MODEL_PRICING_INFO[model] : void 0;
    const inputRate = pricing?.inputPerMillion ?? DEFAULT_INPUT_COST_PER_MILLION;
    const outputRate = pricing?.outputPerMillion ?? DEFAULT_OUTPUT_COST_PER_MILLION;
    return (input * inputRate + output * outputRate) / 1e6;
  };
  let totalCost = 0;
  for (const [model, data] of Object.entries(tokenUsage.byModel)) {
    if (!data) continue;
    totalCost += calculateCostForModel(data.inputTokens, data.outputTokens, model);
  }
  if (Object.keys(tokenUsage.byModel).length === 0) {
    totalCost = calculateCostForModel(tokenUsage.totalInputTokens, tokenUsage.totalOutputTokens);
  }
  return {
    totalCost,
    totalTokensUsed: tokenUsage.totalInputTokens + tokenUsage.totalOutputTokens,
    inputTokens: tokenUsage.totalInputTokens,
    outputTokens: tokenUsage.totalOutputTokens,
    estimatedCostUSD: totalCost,
    breakdownByModel: Object.entries(tokenUsage.byModel).filter((entry) => entry[1] !== void 0).map(([model, data]) => ({
      model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: calculateCostForModel(data.inputTokens, data.outputTokens, model)
    })),
    breakdownByAgent: Object.entries(tokenUsage.byAgent).filter((entry) => entry[1] !== void 0).map(([agentId, data]) => ({
      agentId,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: calculateCostForModel(data.inputTokens, data.outputTokens)
    })),
    updatedAt: tokenUsage.updatedAt
  };
}
function resetTokenUsage() {
  tokenUsage.totalInputTokens = 0;
  tokenUsage.totalOutputTokens = 0;
  tokenUsage.totalCalls = 0;
  tokenUsage.byModel = {};
  tokenUsage.byAgent = {};
  tokenUsage.updatedAt = /* @__PURE__ */ new Date();
}
global.accumulateTokenUsage = accumulateTokenUsage;
function removeReviewHandlers() {
  for (const channel of REVIEW_CHANNELS) {
    ipcMain.removeHandler(channel);
  }
}
function registerFallbackReviewHandlers(initError) {
  const error = new ReviewNotInitializedError(initError);
  ipcMain.handle("review:list", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return [];
  });
  ipcMain.handle("review:get", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    throw error;
  });
  ipcMain.handle("review:approve", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    throw error;
  });
  ipcMain.handle("review:reject", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    throw error;
  });
}
function registerCheckpointReviewHandlers(checkpointManager, humanReviewService) {
  removeReviewHandlers();
  checkpointManagerRef = checkpointManager;
  humanReviewServiceRef = humanReviewService;
  ipcMain.handle("checkpoint:list", (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof projectId !== "string" || !projectId) {
      throw new Error("Invalid projectId");
    }
    if (!checkpointManagerRef) {
      throw new Error("CheckpointManager not initialized");
    }
    return checkpointManagerRef.listCheckpoints(projectId);
  });
  ipcMain.handle(
    "checkpoint:create",
    async (event, projectId, reason) => {
      if (!validateSender$4(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof projectId !== "string" || !projectId) {
        throw new Error("Invalid projectId");
      }
      if (typeof reason !== "string" || !reason) {
        throw new Error("Invalid reason");
      }
      if (!checkpointManagerRef) {
        throw new Error("CheckpointManager not initialized");
      }
      return await checkpointManagerRef.createCheckpoint(projectId, reason);
    }
  );
  ipcMain.handle(
    "checkpoint:restore",
    async (event, checkpointId, restoreGit) => {
      if (!validateSender$4(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof checkpointId !== "string" || !checkpointId) {
        throw new Error("Invalid checkpointId");
      }
      if (!checkpointManagerRef) {
        throw new Error("CheckpointManager not initialized");
      }
      await checkpointManagerRef.restoreCheckpoint(checkpointId, { restoreGit });
    }
  );
  ipcMain.handle("checkpoint:delete", (event, checkpointId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof checkpointId !== "string" || !checkpointId) {
      throw new Error("Invalid checkpointId");
    }
    if (!checkpointManagerRef) {
      throw new Error("CheckpointManager not initialized");
    }
    checkpointManagerRef.deleteCheckpoint(checkpointId);
  });
  ipcMain.handle("review:list", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!humanReviewServiceRef) {
      throw new Error("HumanReviewService not initialized");
    }
    return humanReviewServiceRef.listPendingReviews();
  });
  ipcMain.handle("review:get", (event, reviewId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof reviewId !== "string" || !reviewId) {
      throw new Error("Invalid reviewId");
    }
    if (!humanReviewServiceRef) {
      throw new Error("HumanReviewService not initialized");
    }
    return humanReviewServiceRef.getReview(reviewId);
  });
  ipcMain.handle(
    "review:approve",
    async (event, reviewId, resolution) => {
      if (!validateSender$4(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof reviewId !== "string" || !reviewId) {
        throw new Error("Invalid reviewId");
      }
      if (!humanReviewServiceRef) {
        throw new Error("HumanReviewService not initialized");
      }
      await humanReviewServiceRef.approveReview(reviewId, resolution);
      try {
        const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
        const bootstrappedNexus2 = getBootstrappedNexus2();
        if (bootstrappedNexus2?.nexus.coordinator) {
          await bootstrappedNexus2.nexus.coordinator.handleReviewApproved(reviewId, resolution);
        }
      } catch (coordError) {
        console.warn("[IPC] Failed to notify coordinator of review approval:", coordError);
      }
    }
  );
  ipcMain.handle(
    "review:reject",
    async (event, reviewId, feedback) => {
      if (!validateSender$4(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof reviewId !== "string" || !reviewId) {
        throw new Error("Invalid reviewId");
      }
      if (typeof feedback !== "string" || !feedback) {
        throw new Error("Invalid feedback");
      }
      if (!humanReviewServiceRef) {
        throw new Error("HumanReviewService not initialized");
      }
      await humanReviewServiceRef.rejectReview(reviewId, feedback);
      try {
        const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
        const bootstrappedNexus2 = getBootstrappedNexus2();
        if (bootstrappedNexus2?.nexus.coordinator) {
          await bootstrappedNexus2.nexus.coordinator.handleReviewRejected(reviewId, feedback);
        }
      } catch (coordError) {
        console.warn("[IPC] Failed to notify coordinator of review rejection:", coordError);
      }
    }
  );
}
function registerDatabaseHandlers(databaseClient) {
  databaseClientRef = databaseClient;
  console.log("[IPC] Database handlers registered");
}
function registerIpcHandlers() {
  ipcMain.handle("mode:genesis", (event) => {
    if (!validateSender$4(event)) {
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
    resetTokenUsage();
    return { success: true, projectId };
  });
  ipcMain.handle("mode:evolution", (event, projectId) => {
    if (!validateSender$4(event)) {
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
    resetTokenUsage();
    return { success: true };
  });
  ipcMain.handle("project:get", (event, id) => {
    if (!validateSender$4(event)) {
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.projects.values());
  });
  ipcMain.handle("dashboard:getMetrics", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const projects2 = Array.from(state.projects.values());
    const tasks2 = Array.from(state.tasks.values());
    const agents2 = Array.from(state.agents.values());
    const completedTasks = tasks2.filter((t) => t.status === "completed").length;
    const failedTasks = tasks2.filter((t) => t.status === "failed").length;
    const activeAgents = agents2.filter((a) => a.status === "working").length;
    return {
      projectId: state.projectId || "no-project",
      projectName: projects2.length > 0 ? projects2[0].name : "No Active Project",
      totalFeatures: Math.ceil(tasks2.length / 3),
      // Approximate features from tasks
      completedFeatures: Math.floor(completedTasks / 3),
      completedTasks,
      totalTasks: tasks2.length,
      failedTasks,
      activeAgents,
      estimatedRemainingMinutes: Math.max(0, (tasks2.length - completedTasks) * 5),
      estimatedCompletion: new Date(Date.now() + Math.max(0, (tasks2.length - completedTasks) * 5) * 6e4),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1e3),
      // 2 hours ago
      updatedAt: /* @__PURE__ */ new Date()
    };
  });
  ipcMain.handle("dashboard:getCosts", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return getTokenUsageAndCosts();
  });
  ipcMain.handle("dashboard:getHistoricalProgress", async (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (databaseClientRef) {
      try {
        const { tasks: tasks2 } = await Promise.resolve().then(() => schema$1);
        const { isNotNull } = await import("drizzle-orm");
        const allTasks = await databaseClientRef.db.select().from(tasks2);
        const totalTasks2 = allTasks.length;
        if (totalTasks2 === 0) {
          return [];
        }
        const completedTasksData = await databaseClientRef.db.select().from(tasks2).where(isNotNull(tasks2.completedAt));
        if (completedTasksData.length === 0) {
          return [{ timestamp: /* @__PURE__ */ new Date(), completed: 0, total: totalTasks2 }];
        }
        const tasksWithCompletion = completedTasksData.filter(
          (t) => t.completedAt !== null
        );
        const sortedCompletions = tasksWithCompletion.sort(
          (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        const progressData = [];
        const firstCompletion = sortedCompletions[0].completedAt;
        progressData.push({
          timestamp: new Date(new Date(firstCompletion).getTime() - 1e3),
          completed: 0,
          total: totalTasks2
        });
        sortedCompletions.forEach((task, index) => {
          progressData.push({
            timestamp: new Date(task.completedAt),
            completed: index + 1,
            total: totalTasks2
          });
        });
        progressData.push({
          timestamp: /* @__PURE__ */ new Date(),
          completed: completedTasksData.length,
          total: totalTasks2
        });
        return progressData;
      } catch (err) {
        console.error("[IPC] Failed to get historical progress from database:", err);
      }
    }
    const taskList = Array.from(state.tasks.values());
    const totalTasks = taskList.length;
    const completedTasks = taskList.filter((t) => t.status === "completed").length;
    if (totalTasks === 0) {
      return [];
    }
    return [{ timestamp: /* @__PURE__ */ new Date(), completed: completedTasks, total: totalTasks }];
  });
  ipcMain.handle(
    "project:create",
    (event, input) => {
      if (!validateSender$4(event)) {
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
  ipcMain.handle("tasks:list", async (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (databaseClientRef) {
      try {
        const { tasks: tasks2 } = await Promise.resolve().then(() => schema$1);
        const { eq: eq2 } = await import("drizzle-orm");
        let dbTasks;
        if (projectId) {
          console.log(`[IPC] tasks:list filtering by projectId: ${projectId}`);
          dbTasks = databaseClientRef.db.select().from(tasks2).where(eq2(tasks2.projectId, projectId)).all();
        } else {
          dbTasks = databaseClientRef.db.select().from(tasks2).all();
        }
        const uiTasks = dbTasks.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          featureId: t.featureId,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes
        }));
        console.log("[IPC] tasks:list returning", uiTasks.length, "tasks from database", projectId ? `(filtered by ${projectId})` : "(all)");
        return uiTasks;
      } catch (error) {
        console.error("[IPC] tasks:list database query failed:", error);
      }
    }
    console.log("[IPC] tasks:list returning", state.tasks.size, "tasks from memory");
    return Array.from(state.tasks.values());
  });
  ipcMain.handle(
    "task:update",
    (event, id, update) => {
      if (!validateSender$4(event)) {
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return Array.from(state.agents.values());
  });
  ipcMain.handle("agents:list", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const agents2 = Array.from(state.agents.values()).map((agent) => ({
      id: agent.id,
      type: agent.type || "coder",
      status: agent.status || "idle",
      model: void 0,
      currentTask: void 0,
      iteration: void 0,
      metrics: void 0,
      currentFile: void 0
    }));
    return agents2;
  });
  ipcMain.handle("agents:get", (event, id) => {
    if (!validateSender$4(event)) {
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    const agents2 = Array.from(state.agents.values());
    const working = agents2.filter((a) => a.status === "working").length;
    const idle = agents2.filter((a) => a.status === "idle" || !a.status).length;
    const error = agents2.filter((a) => a.status === "error").length;
    const complete = agents2.filter((a) => a.status === "complete").length;
    const byType = {
      planner: { total: 0, active: 0, idle: 0, max: 1 },
      coder: { total: 0, active: 0, idle: 0, max: 4 },
      tester: { total: 0, active: 0, idle: 0, max: 2 },
      reviewer: { total: 0, active: 0, idle: 0, max: 2 },
      merger: { total: 0, active: 0, idle: 0, max: 1 }
    };
    for (const agent of agents2) {
      const agentType = agent.type || "coder";
      const bucket = byType[agentType];
      if (!bucket) {
        continue;
      }
      bucket.total++;
      if (agent.status === "working") {
        bucket.active++;
      } else {
        bucket.idle++;
      }
    }
    return {
      totalAgents: agents2.length,
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid agent id");
    }
    const buffer = agentOutputBuffers.get(id);
    return buffer ? [...buffer] : [];
  });
  ipcMain.handle("agents:getQAStatus", (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return {
      steps: [
        { type: "build", status: executionStatuses.get("build") ?? "pending" },
        { type: "lint", status: executionStatuses.get("lint") ?? "pending" },
        { type: "test", status: executionStatuses.get("test") ?? "pending" },
        { type: "review", status: executionStatuses.get("review") ?? "pending" }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    };
  });
  const executionLogs = /* @__PURE__ */ new Map([
    ["build", []],
    ["lint", []],
    ["test", []],
    ["review", []]
  ]);
  const MAX_OUTPUT_LINES_PER_AGENT = 1e3;
  const agentOutputBuffers = /* @__PURE__ */ new Map();
  function addAgentOutput(agentId, line) {
    let buffer = agentOutputBuffers.get(agentId);
    if (!buffer) {
      buffer = [];
      agentOutputBuffers.set(agentId, buffer);
    }
    buffer.push(line);
    if (buffer.length > MAX_OUTPUT_LINES_PER_AGENT) {
      buffer.splice(0, buffer.length - MAX_OUTPUT_LINES_PER_AGENT);
    }
  }
  function clearAgentOutput(agentId) {
    agentOutputBuffers.delete(agentId);
  }
  global.addAgentOutput = addAgentOutput;
  global.clearAgentOutput = clearAgentOutput;
  global.agentOutputBuffers = agentOutputBuffers;
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!["build", "lint", "test", "review"].includes(stepType)) {
      throw new Error("Invalid step type");
    }
    return executionLogs.get(stepType) || [];
  });
  ipcMain.handle("execution:getStatus", (event) => {
    if (!validateSender$4(event)) {
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
    if (!validateSender$4(event)) {
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
    currentQAIteration = 0;
    return { success: true };
  });
  ipcMain.handle("execution:exportLogs", (event) => {
    if (!validateSender$4(event)) {
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
  ipcMain.handle("features:list", async (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    console.log("[IPC] features:list called", {
      projectId: projectId || "(none)",
      databaseAvailable: !!databaseClientRef,
      memoryFeatureCount: state.features.size
    });
    if (databaseClientRef) {
      try {
        const { features: features2, tasks: tasks2 } = await Promise.resolve().then(() => schema$1);
        const { eq: eq2 } = await import("drizzle-orm");
        let dbFeatures;
        let dbTasks;
        if (projectId) {
          console.log(`[IPC] features:list filtering by projectId: ${projectId}`);
          dbFeatures = databaseClientRef.db.select().from(features2).where(eq2(features2.projectId, projectId)).all();
          dbTasks = databaseClientRef.db.select().from(tasks2).where(eq2(tasks2.projectId, projectId)).all();
        } else {
          dbFeatures = databaseClientRef.db.select().from(features2).all();
          dbTasks = databaseClientRef.db.select().from(tasks2).all();
        }
        const uiFeatures = dbFeatures.map((f) => {
          const featureTasks = dbTasks.filter((t) => t.featureId === f.id).map((t) => ({
            id: t.id,
            title: t.name,
            status: t.status
          }));
          return {
            id: f.id,
            title: f.name,
            description: f.description || "",
            status: f.status,
            priority: f.priority,
            complexity: f.complexity,
            progress: f.estimatedTasks && f.estimatedTasks > 0 ? Math.round((f.completedTasks || 0) / f.estimatedTasks * 100) : 0,
            tasks: featureTasks,
            createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
            updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : String(f.updatedAt)
          };
        });
        console.log("[IPC] features:list returning", uiFeatures.length, "features from database", projectId ? `(filtered by ${projectId})` : "(all)");
        return uiFeatures;
      } catch (error) {
        console.error("[IPC] features:list database query failed:", error);
      }
    }
    console.log("[IPC] features:list returning", state.features.size, "features from memory");
    return Array.from(state.features.values());
  });
  ipcMain.handle("feature:get", (event, id) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid feature id");
    }
    return state.features.get(id) || null;
  });
  ipcMain.handle("feature:create", async (event, input) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof input.title !== "string" || !input.title) {
      throw new Error("Invalid feature title");
    }
    const id = `feature-${Date.now()}`;
    const now = /* @__PURE__ */ new Date();
    const nowISO = now.toISOString();
    const uiPriority = input.priority || "medium";
    const dbPriority = uiPriority === "critical" ? "must" : uiPriority === "high" ? "should" : uiPriority === "medium" ? "could" : "wont";
    const uiComplexity = input.complexity || "moderate";
    const dbComplexity = uiComplexity === "simple" ? "simple" : "complex";
    const feature = {
      id,
      title: input.title,
      description: input.description || "",
      status: "backlog",
      priority: uiPriority,
      complexity: uiComplexity,
      progress: 0,
      tasks: [],
      createdAt: nowISO,
      updatedAt: nowISO
    };
    if (databaseClientRef && state.projectId) {
      try {
        const { features: features2, tasks: tasks2 } = await Promise.resolve().then(() => schema$1);
        databaseClientRef.db.insert(features2).values({
          id,
          projectId: state.projectId,
          name: input.title,
          description: input.description || "",
          priority: dbPriority,
          status: "backlog",
          complexity: dbComplexity,
          estimatedTasks: 1,
          completedTasks: 0,
          createdAt: now,
          updatedAt: now
        }).run();
        console.log("[IPC] feature:create - persisted feature to database:", id);
        const taskId = `task-${id}-impl-${Date.now()}`;
        databaseClientRef.db.insert(tasks2).values({
          id: taskId,
          projectId: state.projectId,
          featureId: id,
          name: `Implement: ${input.title}`,
          description: input.description || `Implementation task for ${input.title}`,
          type: "auto",
          status: "pending",
          size: "small",
          priority: 5,
          tags: JSON.stringify([]),
          notes: JSON.stringify([]),
          dependsOn: JSON.stringify([]),
          estimatedMinutes: 30,
          createdAt: now,
          updatedAt: now
        }).run();
        console.log("[IPC] feature:create - created default task:", taskId);
        feature.tasks = [{ id: taskId, title: `Implement: ${input.title}`, status: "pending" }];
        state.tasks.set(taskId, {
          id: taskId,
          name: `Implement: ${input.title}`,
          status: "pending",
          featureId: id
        });
        const eventBus2 = EventBus.getInstance();
        void eventBus2.emit("task:created", {
          task: {
            id: taskId,
            projectId: state.projectId,
            featureId: id,
            name: `Implement: ${input.title}`,
            description: input.description || `Implementation task for ${input.title}`,
            type: "auto",
            status: "pending",
            priority: "normal",
            dependencies: [],
            createdAt: now,
            updatedAt: now
          },
          projectId: state.projectId,
          featureId: id
        }, { source: "IPC" });
      } catch (error) {
        console.error("[IPC] feature:create - database persistence failed:", error);
      }
    }
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
  ipcMain.handle("feature:update", async (event, id, update) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof id !== "string" || !id) {
      throw new Error("Invalid feature id");
    }
    console.log("[IPC] feature:update called with id:", id);
    let feature = state.features.get(id);
    let fromDatabase = false;
    if (!feature && databaseClientRef) {
      console.log("[IPC] feature:update - not in memory, checking database...");
      try {
        const { features: features2 } = await Promise.resolve().then(() => schema$1);
        const { eq: eq2 } = await import("drizzle-orm");
        const dbFeature = databaseClientRef.db.select().from(features2).where(eq2(features2.id, id)).get();
        if (dbFeature) {
          console.log("[IPC] feature:update - found in database");
          fromDatabase = true;
          feature = {
            id: dbFeature.id,
            title: dbFeature.name,
            description: dbFeature.description || "",
            status: dbFeature.status,
            priority: dbFeature.priority,
            complexity: dbFeature.complexity,
            progress: dbFeature.estimatedTasks && dbFeature.estimatedTasks > 0 ? Math.round((dbFeature.completedTasks || 0) / dbFeature.estimatedTasks * 100) : 0,
            tasks: [],
            createdAt: dbFeature.createdAt instanceof Date ? dbFeature.createdAt.toISOString() : String(dbFeature.createdAt),
            updatedAt: dbFeature.updatedAt instanceof Date ? dbFeature.updatedAt.toISOString() : String(dbFeature.updatedAt)
          };
        }
      } catch (error) {
        console.error("[IPC] feature:update database query failed:", error);
      }
    }
    if (!feature) {
      console.log("[IPC] feature:update - Feature not found anywhere!");
      console.log("[IPC] In-memory features:", Array.from(state.features.keys()));
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
    if (fromDatabase && databaseClientRef) {
      console.log("[IPC] feature:update - persisting to database...");
      try {
        const { features: features2 } = await Promise.resolve().then(() => schema$1);
        const { eq: eq2 } = await import("drizzle-orm");
        const mapPriorityToDb = (uiPriority) => {
          const mapping = {
            critical: "must",
            high: "should",
            medium: "could",
            low: "wont"
          };
          return mapping[uiPriority] ?? "should";
        };
        const mapComplexityToDb = (uiComplexity) => {
          return uiComplexity === "complex" ? "complex" : "simple";
        };
        databaseClientRef.db.update(features2).set({
          name: feature.title,
          description: feature.description,
          status: feature.status,
          priority: mapPriorityToDb(feature.priority),
          complexity: mapComplexityToDb(feature.complexity),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(features2.id, id)).run();
        console.log("[IPC] feature:update - database updated successfully");
      } catch (error) {
        console.error("[IPC] feature:update database persist failed:", error);
      }
    }
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
    console.log("[IPC] feature:update - success");
    return feature;
  });
  ipcMain.handle("feature:delete", (event, id) => {
    if (!validateSender$4(event)) {
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
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:paused", { reason });
    }
    return { success: true };
  });
  ipcMain.handle("execution:start", async (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof projectId !== "string" || !projectId) {
      throw new Error("Invalid projectId");
    }
    console.log("[ExecutionHandlers] Starting execution for:", projectId);
    try {
      const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
      const bootstrappedNexus2 = getBootstrappedNexus2();
      if (!bootstrappedNexus2) {
        throw new Error("Nexus not initialized");
      }
      const coordinator = bootstrappedNexus2.nexus.coordinator;
      const status = coordinator.getStatus();
      console.log("[ExecutionHandlers] Current coordinator status:", status.state);
      if (status.state === "running") {
        console.log("[ExecutionHandlers] Execution already running");
        return { success: true, message: "Execution already running" };
      }
      if (status.state === "paused") {
        coordinator.resume();
        console.log("[ExecutionHandlers] Execution resumed");
        return { success: true, message: "Execution resumed" };
      }
      const { projects: projects2, tasks: tasksTable } = await Promise.resolve().then(() => schema$1);
      const { eq: eq2 } = await import("drizzle-orm");
      const dbClient = bootstrappedNexus2.databaseClient;
      const project = dbClient.db.select().from(projects2).where(eq2(projects2.id, projectId)).get();
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      const projectPath = project.rootPath;
      console.log("[ExecutionHandlers] Project path:", projectPath);
      const dbTasks = dbClient.db.select().from(tasksTable).where(eq2(tasksTable.projectId, projectId)).all();
      console.log("[ExecutionHandlers] Found", dbTasks.length, "tasks for project");
      if (dbTasks.length === 0) {
        return {
          success: false,
          error: "No tasks found for project. Complete the interview to generate tasks."
        };
      }
      const orchestrationTasks = dbTasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description || "",
        type: "auto",
        // Default task type
        size: "small",
        // Default task size
        status: "pending",
        featureId: task.featureId || void 0,
        dependsOn: task.dependsOn ? JSON.parse(task.dependsOn) : [],
        priority: task.priority || 1,
        estimatedMinutes: task.estimatedMinutes || 15,
        files: [],
        testCriteria: [],
        waveId: 0,
        createdAt: /* @__PURE__ */ new Date()
      }));
      const { recordExecutionStart: recordExecutionStart2 } = await Promise.resolve().then(() => NexusBootstrap$1);
      recordExecutionStart2(projectId);
      coordinator.executeExistingTasks(projectId, orchestrationTasks, projectPath);
      console.log("[ExecutionHandlers] Execution started with executeExistingTasks");
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send("execution:started", { projectId });
      }
      return { success: true, message: "Execution started" };
    } catch (error) {
      console.error("[ExecutionHandlers] Execution start failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("execution:resume", async (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    console.log("[ExecutionHandlers] Resuming execution");
    try {
      const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
      const bootstrappedNexus2 = getBootstrappedNexus2();
      if (!bootstrappedNexus2) {
        throw new Error("Nexus not initialized");
      }
      const coordinator = bootstrappedNexus2.nexus.coordinator;
      coordinator.resume();
      console.log("[ExecutionHandlers] Execution resumed successfully");
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send("execution:resumed", {});
      }
      return { success: true };
    } catch (error) {
      console.error("[ExecutionHandlers] Resume failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("execution:stop", async (event) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    console.log("[ExecutionHandlers] Stopping execution");
    try {
      const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
      const bootstrappedNexus2 = getBootstrappedNexus2();
      if (!bootstrappedNexus2) {
        throw new Error("Nexus not initialized");
      }
      const coordinator = bootstrappedNexus2.nexus.coordinator;
      await coordinator.stop();
      console.log("[ExecutionHandlers] Execution stopped successfully");
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send("execution:stopped", {});
      }
      return { success: true };
    } catch (error) {
      console.error("[ExecutionHandlers] Stop failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("planning:start", async (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof projectId !== "string" || !projectId) {
      throw new Error("Invalid projectId");
    }
    console.log("[IPC] planning:start called for projectId:", projectId);
    try {
      const { getBootstrappedNexus: getBootstrappedNexus2 } = await Promise.resolve().then(() => NexusBootstrap$1);
      const bootstrappedNexus2 = getBootstrappedNexus2();
      if (!bootstrappedNexus2) {
        throw new Error("Nexus not initialized");
      }
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send("nexus-event", {
          type: "planning:started",
          payload: {
            projectId,
            requirementCount: 0,
            // Will be updated during progress
            startedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const coordinator = bootstrappedNexus2.nexus.coordinator;
      const status = coordinator.getStatus();
      if (status.state === "running") {
        console.log("[IPC] planning:start - Execution already running");
        return { success: true, message: "Execution already in progress" };
      }
      const _eventBus = EventBus.getInstance();
      let requirementCount = 0;
      if (databaseClientRef) {
        try {
          const { eq: eq2, count } = await import("drizzle-orm");
          const { requirements: requirements2 } = await Promise.resolve().then(() => schema$1);
          const result = databaseClientRef.db.select({ count: count() }).from(requirements2).where(eq2(requirements2.projectId, projectId)).get();
          requirementCount = result?.count ?? 0;
        } catch (dbError) {
          console.warn("[IPC] planning:start - Could not get requirement count:", dbError);
        }
      }
      console.log("[IPC] planning:start - Starting planning with", requirementCount, "requirements");
      return {
        success: true,
        message: "Planning started",
        requirementCount
      };
    } catch (error) {
      console.error("[IPC] planning:start failed:", error);
      if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
        eventForwardingWindow.webContents.send("nexus-event", {
          type: "planning:error",
          payload: {
            projectId,
            error: error instanceof Error ? error.message : String(error),
            recoverable: true
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("planning:getStatus", async (event, projectId) => {
    if (!validateSender$4(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof projectId !== "string" || !projectId) {
      throw new Error("Invalid projectId");
    }
    if (databaseClientRef) {
      try {
        const { eq: eq2, count } = await import("drizzle-orm");
        const { tasks: tasksTable, features: featuresTable } = await Promise.resolve().then(() => schema$1);
        const taskResult = databaseClientRef.db.select({ count: count() }).from(tasksTable).where(eq2(tasksTable.projectId, projectId)).get();
        const featureResult = databaseClientRef.db.select({ count: count() }).from(featuresTable).where(eq2(featuresTable.projectId, projectId)).get();
        const taskCount = taskResult?.count ?? 0;
        const featureCount = featureResult?.count ?? 0;
        if (taskCount > 0) {
          return {
            status: "complete",
            progress: 100,
            taskCount,
            featureCount
          };
        }
        return {
          status: "idle",
          progress: 0,
          taskCount: 0,
          featureCount: 0
        };
      } catch (dbError) {
        console.error("[IPC] planning:getStatus database error:", dbError);
      }
    }
    return {
      status: "unknown",
      progress: 0,
      taskCount: 0,
      featureCount: 0
    };
  });
  ipcMain.handle(
    "interview:emit-started",
    (event, payload) => {
      if (!validateSender$4(event)) {
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
      if (!validateSender$4(event)) {
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
      if (!validateSender$4(event)) {
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
      if (!validateSender$4(event)) {
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
      if (!validateSender$4(event)) {
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
  const globalExecutionStatuses = global.executionStatuses;
  const getExecutionStatus = (type) => globalExecutionStatuses?.get(type) ?? "pending";
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
    currentQAIteration = event.payload.iteration;
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
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("qa:status-update", {
        steps: [
          { type: "build", status: getExecutionStatus("build") },
          { type: "lint", status: getExecutionStatus("lint") },
          { type: "test", status: getExecutionStatus("test") },
          { type: "review", status: getExecutionStatus("review") }
        ],
        iteration: currentQAIteration,
        maxIterations: maxQAIterations
      });
    }
  });
  eventBus.on("agent:spawned", (event) => {
    const agent = event.payload.agent;
    const agentId = agent.id;
    const agentType = agent.type;
    forwardAgentCreated({
      id: agentId,
      type: agentType || "coder",
      status: "idle",
      model: agent.modelConfig?.model,
      spawnedAt: event.timestamp
    });
    forwardTimelineEvent({
      id: event.id,
      type: "agent_spawned",
      title: `Agent ${agentId} spawned`,
      timestamp: event.timestamp,
      metadata: {
        agentId,
        agentType
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
  const globalAddAgentOutput = global.addAgentOutput;
  eventBus.on("agent:output", (event) => {
    const { agentId, line } = event.payload;
    globalAddAgentOutput?.(agentId, line);
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("agent:output", {
        agentId,
        line,
        timestamp: event.timestamp
      });
    }
  });
  const globalAddExecutionLog = global.addExecutionLog;
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
    globalAddExecutionLog?.("build", `Build started for task ${event.payload.taskId}`);
    globalExecutionStatuses?.set("build", "running");
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:log", {
        type: "build",
        status: "running",
        message: `Build started for task ${event.payload.taskId}`
      });
    }
  });
  eventBus.on("qa:build-completed", (event) => {
    const passed = event.payload.passed;
    forwardTimelineEvent({
      id: event.id,
      type: "build_completed",
      title: passed ? "Build succeeded" : "Build failed",
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId
      }
    });
    globalAddExecutionLog?.("build", passed ? "Build succeeded" : "Build failed", void 0, passed ? "info" : "error");
    globalExecutionStatuses?.set("build", passed ? "success" : "error");
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:log", {
        type: "build",
        status: passed ? "success" : "error",
        message: passed ? "Build succeeded" : "Build failed"
      });
    }
    forwardQAStatusUpdate({
      steps: [
        { type: "build", status: getExecutionStatus("build") },
        { type: "lint", status: getExecutionStatus("lint") },
        { type: "test", status: getExecutionStatus("test") },
        { type: "review", status: getExecutionStatus("review") }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    });
  });
  eventBus.on("qa:loop-completed", (event) => {
    const passed = event.payload.passed;
    forwardTimelineEvent({
      id: event.id,
      type: passed ? "qa_passed" : "qa_failed",
      title: passed ? `QA passed for task ${event.payload.taskId}` : `QA failed for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        taskId: event.payload.taskId,
        iterations: event.payload.iterations
      }
    });
    globalAddExecutionLog?.(
      "review",
      passed ? `QA passed after ${event.payload.iterations} iterations` : `QA failed after ${event.payload.iterations} iterations`,
      void 0,
      passed ? "info" : "error"
    );
    globalExecutionStatuses?.set("review", passed ? "success" : "error");
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:log", {
        type: "review",
        status: passed ? "success" : "error",
        message: passed ? `QA passed after ${event.payload.iterations} iterations` : `QA failed after ${event.payload.iterations} iterations`
      });
    }
    forwardQAStatusUpdate({
      steps: [
        { type: "build", status: getExecutionStatus("build") },
        { type: "lint", status: getExecutionStatus("lint") },
        { type: "test", status: getExecutionStatus("test") },
        { type: "review", status: getExecutionStatus("review") }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    });
  });
  eventBus.on("qa:lint-completed", (event) => {
    const passed = event.payload.passed;
    globalAddExecutionLog?.(
      "lint",
      passed ? "Lint passed" : "Lint failed",
      void 0,
      passed ? "info" : "error"
    );
    globalExecutionStatuses?.set("lint", passed ? "success" : "error");
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:log", {
        type: "lint",
        status: passed ? "success" : "error",
        message: passed ? "Lint passed" : "Lint failed"
      });
    }
    forwardQAStatusUpdate({
      steps: [
        { type: "build", status: getExecutionStatus("build") },
        { type: "lint", status: getExecutionStatus("lint") },
        { type: "test", status: getExecutionStatus("test") },
        { type: "review", status: getExecutionStatus("review") }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
    });
  });
  eventBus.on("qa:test-completed", (event) => {
    const passed = event.payload.passed;
    globalAddExecutionLog?.(
      "test",
      passed ? "All tests passed" : "Tests failed",
      void 0,
      passed ? "info" : "error"
    );
    globalExecutionStatuses?.set("test", passed ? "success" : "error");
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("execution:log", {
        type: "test",
        status: passed ? "success" : "error",
        message: passed ? "All tests passed" : "Tests failed"
      });
    }
    forwardQAStatusUpdate({
      steps: [
        { type: "build", status: getExecutionStatus("build") },
        { type: "lint", status: getExecutionStatus("lint") },
        { type: "test", status: getExecutionStatus("test") },
        { type: "review", status: getExecutionStatus("review") }
      ],
      iteration: currentQAIteration,
      maxIterations: maxQAIterations
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
    forwardFeatureUpdate({
      featureId: event.payload.featureId,
      status: event.payload.newStatus
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
  eventBus.on("system:checkpoint-restored", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "checkpoint_restored",
      title: `Checkpoint restored: ${event.payload.checkpointId}`,
      timestamp: event.timestamp,
      metadata: {
        checkpointId: event.payload.checkpointId,
        projectId: event.payload.projectId
      }
    });
  });
  eventBus.on("task:completed", (_event) => {
    const tasks2 = Array.from(state.tasks.values());
    const completedTasks = tasks2.filter((t) => t.status === "completed").length;
    forwardMetricsUpdate({
      completedTasks,
      totalTasks: tasks2.length,
      projectId: state.projectId || "current",
      updatedAt: /* @__PURE__ */ new Date()
    });
  });
  eventBus.on("feature:created", (event) => {
    forwardFeatureUpdate({
      featureId: event.payload.feature.id,
      title: event.payload.feature.name,
      status: event.payload.feature.status,
      priority: event.payload.feature.priority
    });
  });
  eventBus.on("review:requested", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "review_requested",
      title: `Human review requested for task ${event.payload.taskId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId,
        taskId: event.payload.taskId,
        reason: event.payload.reason
      }
    });
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("review:requested", event.payload);
    }
  });
  eventBus.on("review:approved", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "review_approved",
      title: `Review approved: ${event.payload.reviewId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId
      }
    });
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("review:approved", event.payload);
    }
  });
  eventBus.on("review:rejected", (event) => {
    forwardTimelineEvent({
      id: event.id,
      type: "review_rejected",
      title: `Review rejected: ${event.payload.reviewId}`,
      timestamp: event.timestamp,
      metadata: {
        reviewId: event.payload.reviewId
      }
    });
    if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
      eventForwardingWindow.webContents.send("review:rejected", event.payload);
    }
  });
}
let eventForwardingWindow = null;
function forwardAgentCreated(agent) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("agent:created", agent);
  }
}
function forwardMetricsUpdate(metrics2) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("metrics:updated", metrics2);
  }
}
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
function forwardCostUpdate(costs) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("costs:updated", costs);
  }
}
function forwardFeatureUpdate(feature) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("feature:updated", feature);
  }
}
function forwardQAStatusUpdate(status) {
  if (eventForwardingWindow && !eventForwardingWindow.isDestroyed()) {
    eventForwardingWindow.webContents.send("qa:status", status);
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
  return map[status] ?? "pending";
}
const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mode: text("mode").$type().notNull(),
  status: text("status").notNull(),
  // ProjectStatus
  rootPath: text("root_path").notNull(),
  repositoryUrl: text("repository_url"),
  settings: text("settings"),
  // JSON: ProjectSettings
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" })
});
const features = sqliteTable("features", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priority: text("priority").$type().notNull().default("should"),
  status: text("status").notNull().default("backlog"),
  complexity: text("complexity").$type().notNull().default("simple"),
  estimatedTasks: integer("estimated_tasks").default(0),
  completedTasks: integer("completed_tasks").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const subFeatures = sqliteTable("sub_features", {
  id: text("id").primaryKey(),
  featureId: text("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  featureId: text("feature_id").references(() => features.id),
  subFeatureId: text("sub_feature_id").references(() => subFeatures.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").$type().notNull().default("auto"),
  status: text("status").notNull().default("pending"),
  size: text("size").$type().notNull().default("small"),
  priority: integer("priority").notNull().default(5),
  // for sorting (1 = highest)
  tags: text("tags"),
  // JSON array for categorization
  notes: text("notes"),
  // JSON array of implementation notes
  assignedAgent: text("assigned_agent"),
  worktreePath: text("worktree_path"),
  branchName: text("branch_name"),
  dependsOn: text("depends_on"),
  // JSON array of task IDs
  blockedBy: text("blocked_by"),
  qaIterations: integer("qa_iterations").default(0),
  maxIterations: integer("max_iterations").default(50),
  estimatedMinutes: integer("estimated_minutes").default(15),
  actualMinutes: integer("actual_minutes"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  type: text("type").$type().notNull(),
  status: text("status").notNull().default("idle"),
  // Model configuration
  modelProvider: text("model_provider").$type().notNull().default("anthropic"),
  modelName: text("model_name").notNull().default("claude-sonnet-4"),
  temperature: real("temperature").notNull().default(0.3),
  maxTokens: integer("max_tokens").notNull().default(8e3),
  systemPrompt: text("system_prompt"),
  // path to prompt file or content
  tools: text("tools"),
  // JSON array of tool names
  // Current work
  currentTaskId: text("current_task_id"),
  worktreePath: text("worktree_path"),
  branchName: text("branch_name"),
  tokensUsed: integer("tokens_used").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksFailed: integer("tasks_failed").default(0),
  spawnedAt: integer("spawned_at", { mode: "timestamp" }).notNull(),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).notNull(),
  terminatedAt: integer("terminated_at", { mode: "timestamp" }),
  terminationReason: text("termination_reason")
});
const checkpoints = sqliteTable("checkpoints", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name"),
  reason: text("reason"),
  state: text("state"),
  // JSON blob of full state
  gitCommit: text("git_commit"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
const requirements = sqliteTable("requirements", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  source: text("source"),
  userStories: text("user_stories"),
  // JSON array of user stories
  acceptanceCriteria: text("acceptance_criteria"),
  // JSON array of acceptance criteria
  linkedFeatures: text("linked_features"),
  // JSON array
  validated: integer("validated", { mode: "boolean" }).default(false),
  confidence: real("confidence").default(1),
  // 0-1, AI confidence in extraction
  tags: text("tags"),
  // JSON array for filtering/categorization
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agentId: text("agent_id"),
  taskId: text("task_id"),
  type: text("type").notNull(),
  // 'token_usage', 'task_duration', 'qa_iterations'
  value: real("value").notNull(),
  metadata: text("metadata"),
  // JSON
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull()
});
const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // 'interview', 'planning', 'execution'
  status: text("status").notNull().default("active"),
  data: text("data"),
  // JSON blob
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" })
});
const projectsRelations = relations(projects, ({ many }) => ({
  features: many(features),
  tasks: many(tasks),
  checkpoints: many(checkpoints),
  requirements: many(requirements),
  metrics: many(metrics),
  sessions: many(sessions),
  episodes: many(episodes),
  continuePoints: many(continuePoints),
  projectStates: many(projectStates)
}));
const featuresRelations = relations(features, ({ one, many }) => ({
  project: one(projects, {
    fields: [features.projectId],
    references: [projects.id]
  }),
  subFeatures: many(subFeatures),
  tasks: many(tasks)
}));
const subFeaturesRelations = relations(subFeatures, ({ one, many }) => ({
  feature: one(features, {
    fields: [subFeatures.featureId],
    references: [features.id]
  }),
  tasks: many(tasks)
}));
const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  feature: one(features, {
    fields: [tasks.featureId],
    references: [features.id]
  }),
  subFeature: one(subFeatures, {
    fields: [tasks.subFeatureId],
    references: [subFeatures.id]
  })
}));
const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  project: one(projects, {
    fields: [checkpoints.projectId],
    references: [projects.id]
  })
}));
const requirementsRelations = relations(requirements, ({ one }) => ({
  project: one(projects, {
    fields: [requirements.projectId],
    references: [projects.id]
  })
}));
const metricsRelations = relations(metrics, ({ one }) => ({
  project: one(projects, {
    fields: [metrics.projectId],
    references: [projects.id]
  })
}));
const sessionsRelations = relations(sessions, ({ one }) => ({
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id]
  })
}));
const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").$type().notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  // Short summary for display
  embedding: text("embedding"),
  // JSON array of floats (1536 dimensions)
  context: text("context"),
  // JSON metadata
  taskId: text("task_id"),
  agentId: text("agent_id"),
  importance: real("importance").default(1),
  // For pruning priority
  accessCount: integer("access_count").default(0),
  lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
const episodesRelations = relations(episodes, ({ one }) => ({
  project: one(projects, {
    fields: [episodes.projectId],
    references: [projects.id]
  })
}));
const continuePoints = sqliteTable("continue_points", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull(),
  lastAction: text("last_action").notNull(),
  file: text("file"),
  line: integer("line"),
  functionName: text("function_name"),
  nextSteps: text("next_steps"),
  // JSON array
  agentId: text("agent_id"),
  iterationCount: integer("iteration_count").notNull().default(0),
  savedAt: integer("saved_at", { mode: "timestamp" }).notNull()
});
const continuePointsRelations = relations(continuePoints, ({ one }) => ({
  project: one(projects, {
    fields: [continuePoints.projectId],
    references: [projects.id]
  })
}));
const projectStates = sqliteTable("project_states", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("initializing"),
  mode: text("mode").$type().notNull(),
  stateData: text("state_data"),
  // JSON blob of full NexusState
  currentFeatureIndex: integer("current_feature_index").default(0),
  currentTaskIndex: integer("current_task_index").default(0),
  completedTasks: integer("completed_tasks").default(0),
  totalTasks: integer("total_tasks").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const projectStatesRelations = relations(projectStates, ({ one }) => ({
  project: one(projects, {
    fields: [projectStates.projectId],
    references: [projects.id]
  })
}));
const codeChunks = sqliteTable("code_chunks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  file: text("file").notNull(),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
  content: text("content").notNull(),
  embedding: blob("embedding", { mode: "buffer" }),
  // Binary blob of Float32Array
  symbols: text("symbols", { mode: "json" }).$type(),
  // JSON array of symbol names
  chunkType: text("chunk_type").notNull(),
  language: text("language").notNull(),
  complexity: integer("complexity"),
  hash: text("hash").notNull(),
  indexedAt: integer("indexed_at", { mode: "timestamp" }).notNull()
});
const schema$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  agents,
  checkpoints,
  checkpointsRelations,
  codeChunks,
  continuePoints,
  continuePointsRelations,
  episodes,
  episodesRelations,
  features,
  featuresRelations,
  metrics,
  metricsRelations,
  projectStates,
  projectStatesRelations,
  projects,
  projectsRelations,
  requirements,
  requirementsRelations,
  sessions,
  sessionsRelations,
  subFeatures,
  subFeaturesRelations,
  tasks,
  tasksRelations
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_NEXUS_IDENTITY = {
  name: "Nexus Agent",
  email: "nexus@localhost"
};
function checkGitIdentity(cwd) {
  let name = null;
  let email = null;
  try {
    name = execSync("git config user.name", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
  }
  try {
    email = execSync("git config user.email", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
  }
  return { name: name || null, email: email || null };
}
function ensureIdentityForCommit(cwd, projectName) {
  const existing = checkGitIdentity(cwd);
  if (existing.name && existing.email) {
    return {
      name: existing.name,
      email: existing.email
    };
  }
  const identity = {
    name: existing.name || DEFAULT_NEXUS_IDENTITY.name,
    email: existing.email || generateProjectEmail(projectName)
  };
  if (!existing.name) {
    execSync(`git config --local user.name "${identity.name}"`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  }
  if (!existing.email) {
    execSync(`git config --local user.email "${identity.email}"`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  }
  console.log(`[GitIdentityHelper] Auto-configured identity: ${identity.name} <${identity.email}>`);
  return identity;
}
function generateProjectEmail(projectName) {
  if (projectName) {
    const sanitized = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return `nexus+${sanitized}@localhost`;
  }
  return DEFAULT_NEXUS_IDENTITY.email;
}
async function pathExists$2(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir$2(p) {
  await fs.mkdir(p, { recursive: true });
}
async function writeJson$2(p, data, options) {
  await fs.writeFile(p, JSON.stringify(data, null, options?.spaces ?? 2));
}
class ProjectInitializer {
  /**
   * Initialize a new Nexus project at the specified path
   *
   * @param options - Project initialization options
   * @returns Promise resolving to initialized project info
   * @throws Error if path already exists as a file or non-empty directory
   */
  async initializeProject(options) {
    const projectPath = path.join(options.path, options.name);
    if (await pathExists$2(projectPath)) {
      const stat2 = await fs.stat(projectPath);
      if (!stat2.isDirectory()) {
        throw new Error(`Path already exists as a file: ${projectPath}`);
      }
      const files = await fs.readdir(projectPath);
      if (files.length > 0 && !files.includes(".nexus")) {
        throw new Error(`Directory not empty and not a Nexus project: ${projectPath}`);
      }
    }
    await this.createDirectoryStructure(projectPath);
    await this.createNexusConfig(projectPath, options);
    if (options.initGit !== false) {
      await this.initializeGit(projectPath, options.name);
    }
    await this.createClaudeCodeConfig(projectPath, options.name);
    const projectId = this.generateProjectId();
    console.log(`[ProjectInitializer] Project initialized: ${options.name} at ${projectPath}`);
    return {
      id: projectId,
      name: options.name,
      path: projectPath,
      createdAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Create the standard Nexus project directory structure
   */
  async createDirectoryStructure(projectPath) {
    const directories = [
      projectPath,
      path.join(projectPath, "src"),
      path.join(projectPath, "tests"),
      path.join(projectPath, ".nexus"),
      path.join(projectPath, ".nexus", "checkpoints"),
      path.join(projectPath, ".nexus", "worktrees")
    ];
    for (const dir of directories) {
      await ensureDir$2(dir);
    }
    console.log(`[ProjectInitializer] Created directory structure at ${projectPath}`);
  }
  /**
   * Create the .nexus configuration files
   */
  async createNexusConfig(projectPath, options) {
    const config = {
      name: options.name,
      description: options.description ?? "",
      version: "1.0.0",
      created: (/* @__PURE__ */ new Date()).toISOString(),
      nexusVersion: "1.0.0",
      settings: {
        maxAgents: 4,
        qaMaxIterations: 50,
        taskMaxMinutes: 30,
        checkpointIntervalSeconds: 7200
      }
    };
    await writeJson$2(path.join(projectPath, ".nexus", "config.json"), config, {
      spaces: 2
    });
    const stateContent = `# Project State

## Current Phase
initialization

## Status
pending

## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`;
    await fs.writeFile(path.join(projectPath, ".nexus", "STATE.md"), stateContent);
    console.log(`[ProjectInitializer] Created Nexus configuration`);
  }
  /**
   * Initialize git repository for the project
   */
  async initializeGit(projectPath, projectName) {
    try {
      const gitDir = path.join(projectPath, ".git");
      if (await pathExists$2(gitDir)) {
        console.log(`[ProjectInitializer] Git already initialized`);
        return;
      }
      try {
        execSync("git --version", { stdio: "pipe" });
      } catch {
        console.warn(`[ProjectInitializer] Git not available, skipping git initialization`);
        return;
      }
      execSync("git init", { cwd: projectPath, stdio: "pipe" });
      ensureIdentityForCommit(projectPath, projectName);
      const gitignore = `# Dependencies
node_modules/

# Build
dist/
build/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Nexus working files
.nexus/worktrees/
.nexus/checkpoints/

# Claude Code local settings (machine-specific permissions)
.claude/settings.local.json

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage
coverage/

# TypeScript cache
*.tsbuildinfo
`;
      await fs.writeFile(path.join(projectPath, ".gitignore"), gitignore);
      execSync("git add .", { cwd: projectPath, stdio: "pipe" });
      execSync('git commit -m "Initial commit - Nexus project initialized"', {
        cwd: projectPath,
        stdio: "pipe"
      });
      console.log(`[ProjectInitializer] Git initialized with initial commit`);
    } catch (error) {
      console.warn(`[ProjectInitializer] Git initialization failed:`, error);
    }
  }
  /**
   * Generate a unique project ID
   */
  generateProjectId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Create Claude Code configuration for automated execution
   * Creates .claude/settings.local.json with auto-approve permissions
   * and .claude/CLAUDE.md with project context
   */
  async createClaudeCodeConfig(projectPath, projectName) {
    try {
      const claudeDir = path.join(projectPath, ".claude");
      await ensureDir$2(claudeDir);
      const settings = {
        permissions: {
          allow: [
            "Read(*)",
            // Allow reading any file
            "Write(*)",
            // Allow writing any file
            "Edit(*)",
            // Allow editing any file
            "Bash(*)",
            // Allow bash commands
            "Glob(*)",
            // Allow glob searches
            "Grep(*)"
            // Allow grep searches
          ],
          deny: []
        }
      };
      await writeJson$2(path.join(claudeDir, "settings.local.json"), settings, { spaces: 2 });
      const claudeMd = `# ${projectName}

This project is managed by Nexus - an autonomous AI application builder.

## Project Structure
- \`src/\` - Source code
- \`tests/\` - Test files
- \`.nexus/\` - Nexus configuration and state

## Guidelines
- Follow existing code patterns
- Write comprehensive tests
- Use TypeScript with strict mode
- Ensure all code is production-ready
`;
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), claudeMd);
      console.log(`[ProjectInitializer] Created Claude Code configuration`);
    } catch (error) {
      console.warn(`[ProjectInitializer] Failed to create Claude Code config:`, error);
    }
  }
}
const projectInitializer = new ProjectInitializer();
async function pathExists$1(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir$1(p) {
  await fs.mkdir(p, { recursive: true });
}
async function writeJson$1(p, data, options) {
  await fs.writeFile(p, JSON.stringify(data, null, options?.spaces ?? 2));
}
async function readJson$1(p) {
  const content = await fs.readFile(p, "utf-8");
  return JSON.parse(content);
}
class ProjectLoader {
  /**
   * Load an existing project from the given path
   *
   * For Nexus projects: Loads existing configuration
   * For non-Nexus directories: Creates .nexus structure with defaults
   *
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to loaded project info
   * @throws Error if path does not exist or is not a directory
   */
  async loadProject(projectPath) {
    if (!await pathExists$1(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }
    const stat2 = await fs.stat(projectPath);
    if (!stat2.isDirectory()) {
      throw new Error(`Project path is not a directory: ${projectPath}`);
    }
    const nexusConfigPath = path.join(projectPath, ".nexus", "config.json");
    const isNexusProject = await pathExists$1(nexusConfigPath);
    const gitDir = path.join(projectPath, ".git");
    const hasGit = await pathExists$1(gitDir);
    let config;
    if (isNexusProject) {
      config = await readJson$1(nexusConfigPath);
      console.log(`[ProjectLoader] Loaded existing Nexus project: ${config.name}`);
    } else {
      config = this.createDefaultConfig(path.basename(projectPath));
      await this.initializeNexusStructure(projectPath, config);
      console.log(`[ProjectLoader] Initialized Nexus structure for: ${config.name}`);
    }
    return {
      id: this.generateProjectId(projectPath),
      name: config.name,
      path: projectPath,
      description: config.description,
      config,
      isNexusProject,
      hasGit
    };
  }
  /**
   * Validate if a path is a valid project directory
   *
   * @param projectPath - Path to validate
   * @returns Promise resolving to boolean
   */
  async validateProjectPath(projectPath) {
    try {
      if (!await pathExists$1(projectPath)) {
        return false;
      }
      const stat2 = await fs.stat(projectPath);
      return stat2.isDirectory();
    } catch {
      return false;
    }
  }
  /**
   * Check if path contains a Nexus project
   *
   * @param projectPath - Path to check
   * @returns Promise resolving to boolean
   */
  async isNexusProject(projectPath) {
    const configPath = path.join(projectPath, ".nexus", "config.json");
    return pathExists$1(configPath);
  }
  /**
   * Get project config without full loading
   * Returns null if not a Nexus project
   *
   * @param projectPath - Path to project
   * @returns Promise resolving to config or null
   */
  async getProjectConfig(projectPath) {
    const configPath = path.join(projectPath, ".nexus", "config.json");
    if (!await pathExists$1(configPath)) {
      return null;
    }
    try {
      return await readJson$1(configPath);
    } catch {
      return null;
    }
  }
  /**
   * Update project configuration
   *
   * @param projectPath - Path to project
   * @param updates - Partial config updates
   * @returns Promise resolving to updated config
   * @throws Error if project not found
   */
  async updateProjectConfig(projectPath, updates) {
    const configPath = path.join(projectPath, ".nexus", "config.json");
    if (!await pathExists$1(configPath)) {
      throw new Error(`Not a Nexus project: ${projectPath}`);
    }
    const currentConfig = await readJson$1(configPath);
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      // Don't allow overwriting certain fields
      created: currentConfig.created
    };
    await writeJson$1(configPath, updatedConfig, { spaces: 2 });
    console.log(`[ProjectLoader] Updated project config: ${projectPath}`);
    return updatedConfig;
  }
  /**
   * Create default configuration for a project
   */
  createDefaultConfig(name) {
    return {
      name,
      version: "1.0.0",
      created: (/* @__PURE__ */ new Date()).toISOString(),
      nexusVersion: "1.0.0",
      settings: {
        maxAgents: 4,
        qaMaxIterations: 50,
        taskMaxMinutes: 30,
        checkpointIntervalSeconds: 7200
      }
    };
  }
  /**
   * Initialize Nexus structure for an existing directory
   */
  async initializeNexusStructure(projectPath, config) {
    const nexusDir = path.join(projectPath, ".nexus");
    await ensureDir$1(nexusDir);
    await ensureDir$1(path.join(nexusDir, "checkpoints"));
    await ensureDir$1(path.join(nexusDir, "worktrees"));
    await writeJson$1(path.join(nexusDir, "config.json"), config, { spaces: 2 });
    const stateContent = `# Project State

## Current Phase
loaded

## Status
ready

## Last Updated
${(/* @__PURE__ */ new Date()).toISOString()}
`;
    await fs.writeFile(path.join(nexusDir, "STATE.md"), stateContent);
    console.log(`[ProjectLoader] Initialized Nexus structure for existing project`);
  }
  /**
   * Generate a consistent project ID from path
   * Same path always produces same ID
   */
  generateProjectId(projectPath) {
    let hash = 0;
    for (let i = 0; i < projectPath.length; i++) {
      const char = projectPath.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `proj_${Math.abs(hash).toString(36)}`;
  }
}
const projectLoader = new ProjectLoader();
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}
async function writeJson(p, data, options) {
  await fs.writeFile(p, JSON.stringify(data, null, options?.spaces));
}
async function readJson(p) {
  const content = await fs.readFile(p, "utf-8");
  return JSON.parse(content);
}
const MAX_RECENT = 10;
class RecentProjectsService {
  configPath;
  cache = null;
  constructor() {
    try {
      this.configPath = path.join(app.getPath("userData"), "recent-projects.json");
    } catch {
      this.configPath = path.join(process.cwd(), ".nexus-recent-projects.json");
    }
  }
  /**
   * Allow setting a custom config path (for testing)
   */
  setConfigPath(configPath) {
    this.configPath = configPath;
    this.cache = null;
  }
  /**
   * Get list of recent projects, sorted by lastOpened descending
   * @returns Array of recent projects
   */
  async getRecent() {
    if (this.cache !== null) {
      return this.cache;
    }
    try {
      if (await pathExists(this.configPath)) {
        const data = await readJson(this.configPath);
        if (Array.isArray(data)) {
          this.cache = data.filter((item) => this.isValidRecentProject(item));
          return this.cache;
        }
      }
    } catch (error) {
      console.error("[RecentProjectsService] Failed to load recent projects:", error);
    }
    this.cache = [];
    return this.cache;
  }
  /**
   * Add a project to the recent list (or update if exists)
   * @param project - Project to add (path and name required)
   */
  async addRecent(project) {
    if (!project.path || !project.name) {
      console.warn("[RecentProjectsService] Invalid project data, skipping add");
      return;
    }
    const recent = await this.getRecent();
    const filtered = recent.filter((p) => p.path !== project.path);
    filtered.unshift({
      path: project.path,
      name: project.name,
      lastOpened: (/* @__PURE__ */ new Date()).toISOString()
    });
    const trimmed = filtered.slice(0, MAX_RECENT);
    await this.save(trimmed);
    console.log(`[RecentProjectsService] Added recent project: ${project.name}`);
  }
  /**
   * Remove a project from the recent list
   * @param projectPath - Path of project to remove
   */
  async removeRecent(projectPath) {
    if (!projectPath) {
      return;
    }
    const recent = await this.getRecent();
    const filtered = recent.filter((p) => p.path !== projectPath);
    if (filtered.length !== recent.length) {
      await this.save(filtered);
      console.log(`[RecentProjectsService] Removed recent project: ${projectPath}`);
    }
  }
  /**
   * Clear all recent projects
   */
  async clearRecent() {
    await this.save([]);
    console.log("[RecentProjectsService] Cleared all recent projects");
  }
  /**
   * Clean up entries for projects that no longer exist
   * @returns Number of entries removed
   */
  async cleanup() {
    const recent = await this.getRecent();
    const valid = [];
    for (const project of recent) {
      try {
        if (await pathExists(project.path)) {
          valid.push(project);
        }
      } catch {
      }
    }
    const removed = recent.length - valid.length;
    if (removed > 0) {
      await this.save(valid);
      console.log(`[RecentProjectsService] Cleaned up ${removed} non-existent entries`);
    }
    return removed;
  }
  /**
   * Save recent projects to disk
   */
  async save(projects2) {
    try {
      await ensureDir(path.dirname(this.configPath));
      await writeJson(this.configPath, projects2, { spaces: 2 });
      this.cache = projects2;
    } catch (error) {
      console.error("[RecentProjectsService] Failed to save recent projects:", error);
      throw error;
    }
  }
  /**
   * Validate that an object is a valid RecentProject
   */
  isValidRecentProject(obj) {
    return typeof obj === "object" && obj !== null && typeof obj.path === "string" && typeof obj.name === "string" && typeof obj.lastOpened === "string";
  }
}
const recentProjectsService = new RecentProjectsService();
const pendingProjectPaths = /* @__PURE__ */ new Map();
function validateSender$3(event) {
  const url = event.sender.getURL();
  return url.startsWith("http://localhost:") || url.startsWith("file://");
}
function registerProjectHandlers() {
  ipcMain.handle(
    "project:initialize",
    async (event, options) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:initialize");
        return { success: false, error: "Unauthorized IPC sender" };
      }
      if (!options.name || typeof options.name !== "string") {
        return { success: false, error: "Project name is required" };
      }
      if (!options.path || typeof options.path !== "string") {
        return { success: false, error: "Project path is required" };
      }
      const sanitizedName = options.name.trim().replace(/[<>:"/\\|?*]/g, "-");
      if (sanitizedName.length === 0) {
        return { success: false, error: "Invalid project name" };
      }
      try {
        const project = await projectInitializer.initializeProject({
          ...options,
          name: sanitizedName
        });
        console.log(`[ProjectHandlers] Project initialized: ${project.name}`);
        pendingProjectPaths.set(project.name, project.path);
        console.log(`[ProjectHandlers] Stored pending rootPath: ${project.name} -> ${project.path}`);
        return { success: true, data: project };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] Initialize failed:", message);
        return { success: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:load",
    async (event, projectPath) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:load");
        return { success: false, error: "Unauthorized IPC sender" };
      }
      if (!projectPath || typeof projectPath !== "string") {
        return { success: false, error: "Project path is required" };
      }
      try {
        const project = await projectLoader.loadProject(projectPath);
        console.log(`[ProjectHandlers] Project loaded: ${project.name} from ${project.path}`);
        return { success: true, data: project };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] Load failed:", message);
        return { success: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:validatePath",
    async (event, projectPath) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:validatePath");
        return { valid: false, error: "Unauthorized IPC sender" };
      }
      if (!projectPath || typeof projectPath !== "string") {
        return { valid: false, error: "Project path is required" };
      }
      try {
        const fs2 = await import("fs/promises");
        const path2 = await import("path");
        let exists = true;
        try {
          await fs2.access(projectPath);
        } catch {
          exists = false;
        }
        if (!exists) {
          return { valid: false, error: "Path does not exist" };
        }
        const stat2 = await fs2.stat(projectPath);
        if (!stat2.isDirectory()) {
          return { valid: false, error: "Path is not a directory" };
        }
        const nexusConfigPath = path2.join(projectPath, ".nexus", "config.json");
        let isNexusProject = true;
        try {
          await fs2.access(nexusConfigPath);
        } catch {
          isNexusProject = false;
        }
        return { valid: true, isNexusProject };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] Validation failed:", message);
        return { valid: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:isPathEmpty",
    async (event, targetPath) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:isPathEmpty");
        return { empty: false, exists: false, error: "Unauthorized IPC sender" };
      }
      if (!targetPath || typeof targetPath !== "string") {
        return { empty: false, exists: false, error: "Path is required" };
      }
      try {
        const fs2 = await import("fs/promises");
        let exists = true;
        try {
          await fs2.access(targetPath);
        } catch {
          exists = false;
        }
        if (!exists) {
          return { empty: true, exists: false };
        }
        const stat2 = await fs2.stat(targetPath);
        if (!stat2.isDirectory()) {
          return { empty: false, exists: true, error: "Path is not a directory" };
        }
        const files = await fs2.readdir(targetPath);
        return { empty: files.length === 0, exists: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] isPathEmpty failed:", message);
        return { empty: false, exists: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:getRecent",
    async (event) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:getRecent");
        return [];
      }
      try {
        return await recentProjectsService.getRecent();
      } catch (error) {
        console.error("[ProjectHandlers] getRecent failed:", error);
        return [];
      }
    }
  );
  ipcMain.handle(
    "project:addRecent",
    async (event, project) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:addRecent");
        return { success: false, error: "Unauthorized IPC sender" };
      }
      if (!project.path || !project.name) {
        return { success: false, error: "Project path and name are required" };
      }
      try {
        await recentProjectsService.addRecent(project);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] addRecent failed:", message);
        return { success: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:removeRecent",
    async (event, projectPath) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:removeRecent");
        return { success: false, error: "Unauthorized IPC sender" };
      }
      if (!projectPath) {
        return { success: false, error: "Project path is required" };
      }
      try {
        await recentProjectsService.removeRecent(projectPath);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] removeRecent failed:", message);
        return { success: false, error: message };
      }
    }
  );
  ipcMain.handle(
    "project:clearRecent",
    async (event) => {
      if (!validateSender$3(event)) {
        console.error("[ProjectHandlers] Unauthorized sender for project:clearRecent");
        return { success: false, error: "Unauthorized IPC sender" };
      }
      try {
        await recentProjectsService.clearRecent();
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ProjectHandlers] clearRecent failed:", message);
        return { success: false, error: message };
      }
    }
  );
  console.log("[ProjectHandlers] Registered project IPC handlers");
}
class NexusNotInitializedError extends Error {
  constructor(initError) {
    const baseMessage = "Interview system is not available. ";
    const hint = initError ? `Initialization failed: ${initError}. Please check Settings to configure your LLM provider (Claude CLI or API key).` : "Please configure your LLM provider in Settings (Claude CLI or API key).";
    super(baseMessage + hint);
    this.name = "NexusNotInitializedError";
  }
}
function validateSender$2(event) {
  const url = event.sender.getURL();
  return url.startsWith("http://localhost:") || url.startsWith("file://");
}
function ensureProjectExists(db, projectId, projectName, mode = "genesis") {
  const existing = db.db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) {
    const storedPath = projectName ? pendingProjectPaths.get(projectName) : void 0;
    if (storedPath && projectName) {
      pendingProjectPaths.delete(projectName);
      console.log(`[InterviewHandlers] Using stored rootPath for ${projectName}: ${storedPath}`);
    }
    const now = /* @__PURE__ */ new Date();
    db.db.insert(projects).values({
      id: projectId,
      name: projectName || `New ${mode === "genesis" ? "Genesis" : "Evolution"} Project`,
      mode,
      status: "interview",
      rootPath: storedPath || "",
      createdAt: now,
      updatedAt: now
    }).run();
    console.log(`[InterviewHandlers] Created project record: ${projectId} with rootPath: ${storedPath || "(empty)"}`);
  }
}
function registerInterviewHandlers(interviewEngine, sessionManager, db) {
  ipcMain.handle(
    "interview:start",
    (event, projectId, projectName) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof projectId !== "string" || !projectId) {
        throw new Error("Invalid projectId");
      }
      ensureProjectExists(db, projectId, projectName, "genesis");
      const session2 = interviewEngine.startSession(projectId);
      sessionManager.startAutoSave(session2);
      return session2;
    }
  );
  ipcMain.handle(
    "interview:sendMessage",
    async (event, sessionId, message) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid sessionId");
      }
      if (typeof message !== "string" || !message) {
        throw new Error("Invalid message");
      }
      const result = await interviewEngine.processMessage(sessionId, message);
      return result;
    }
  );
  ipcMain.handle(
    "interview:getSession",
    (event, sessionId) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid sessionId");
      }
      return interviewEngine.getSession(sessionId);
    }
  );
  ipcMain.handle(
    "interview:resume",
    (event, sessionId) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid sessionId");
      }
      const session2 = sessionManager.load(sessionId);
      if (session2) {
        sessionManager.startAutoSave(session2);
      }
      return session2;
    }
  );
  ipcMain.handle(
    "interview:resumeByProject",
    (event, projectId) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof projectId !== "string" || !projectId) {
        throw new Error("Invalid projectId");
      }
      const session2 = sessionManager.loadByProject(projectId);
      if (session2) {
        sessionManager.startAutoSave(session2);
      }
      return session2;
    }
  );
  ipcMain.handle(
    "interview:end",
    (event, sessionId) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid sessionId");
      }
      interviewEngine.endSession(sessionId);
      sessionManager.stopAutoSave();
      const session2 = interviewEngine.getSession(sessionId);
      if (session2) {
        sessionManager.save(session2);
      }
    }
  );
  ipcMain.handle(
    "interview:pause",
    (event, sessionId) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid sessionId");
      }
      interviewEngine.pauseSession(sessionId);
      sessionManager.stopAutoSave();
      const session2 = interviewEngine.getSession(sessionId);
      if (session2) {
        sessionManager.save(session2);
      }
    }
  );
  ipcMain.handle(
    "interview:getGreeting",
    (event) => {
      if (!validateSender$2(event)) {
        throw new Error("Unauthorized IPC sender");
      }
      return interviewEngine.getInitialGreeting();
    }
  );
}
const INTERVIEW_CHANNELS = [
  "interview:start",
  "interview:sendMessage",
  "interview:getSession",
  "interview:resume",
  "interview:resumeByProject",
  "interview:end",
  "interview:pause",
  "interview:getGreeting"
];
function removeInterviewHandlers() {
  for (const channel of INTERVIEW_CHANNELS) {
    ipcMain.removeHandler(channel);
  }
  console.log("[InterviewHandlers] Removed existing interview handlers");
}
function registerFallbackInterviewHandlers(initError) {
  const error = new NexusNotInitializedError(initError);
  ipcMain.handle(
    "interview:start",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:sendMessage",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:getSession",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:resume",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:resumeByProject",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:end",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:pause",
    () => {
      throw error;
    }
  );
  ipcMain.handle(
    "interview:getGreeting",
    () => {
      throw error;
    }
  );
  console.log("[InterviewHandlers] Registered fallback handlers (Nexus not initialized)");
}
const DEFAULT_AGENT_MODEL_ASSIGNMENTS = {
  planner: { provider: "claude", model: "claude-opus-4-5-20251101" },
  coder: { provider: "claude", model: "claude-sonnet-4-5-20250929" },
  tester: { provider: "claude", model: "claude-sonnet-4-5-20250929" },
  reviewer: { provider: "gemini", model: "gemini-2.5-pro" },
  merger: { provider: "claude", model: "claude-sonnet-4-5-20250929" },
  architect: { provider: "claude", model: "claude-opus-4-5-20251101" },
  debugger: { provider: "claude", model: "claude-sonnet-4-5-20250929" },
  documenter: { provider: "gemini", model: "gemini-2.5-flash" }
};
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
    autoRetryEnabled: true,
    qaIterationLimit: 50,
    agentModels: DEFAULT_AGENT_MODEL_ASSIGNMENTS
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
      autoRetryEnabled: { type: "boolean" },
      qaIterationLimit: { type: "number", minimum: 10, maximum: 100 },
      agentModels: {
        type: "object",
        properties: {
          planner: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          coder: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          tester: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          reviewer: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          merger: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          architect: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          debugger: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } },
          documenter: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" } } }
        },
        default: defaults.agents.agentModels
      }
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
    const agents2 = this.store.get("agents");
    const checkpoints2 = this.store.get("checkpoints");
    const ui = this.store.get("ui");
    const project = this.store.get("project");
    const claude = llm.claude ?? defaults.llm.claude;
    const gemini = llm.gemini ?? defaults.llm.gemini;
    const embeddings = llm.embeddings ?? defaults.llm.embeddings;
    return {
      llm: {
        // Phase 16: Provider-specific public views
        claude: {
          backend: claude.backend,
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Legacy migration support
          hasApiKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
          cliPath: claude.cliPath,
          timeout: claude.timeout,
          maxRetries: claude.maxRetries,
          model: claude.model
        },
        gemini: {
          backend: gemini.backend,
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Legacy migration support
          hasApiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
          cliPath: gemini.cliPath,
          timeout: gemini.timeout,
          model: gemini.model
        },
        embeddings: {
          backend: embeddings.backend,
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Legacy migration support
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
        // Legacy compatibility - intentionally accessing deprecated fields
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        hasClaudeKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        hasGeminiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        hasOpenaiKey: !!embeddings.apiKeyEncrypted || !!llm.openaiApiKeyEncrypted
      },
      agents: agents2,
      checkpoints: checkpoints2,
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
class LLMError extends Error {
  constructor(message) {
    super(message);
    this.name = "LLMError";
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}
class APIError extends LLMError {
  statusCode;
  constructor(message, statusCode) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}
class RateLimitError extends APIError {
  retryAfter;
  constructor(message = "Rate limit exceeded", retryAfter) {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
class AuthenticationError extends APIError {
  constructor(message = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
class TimeoutError extends LLMError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
const DEFAULT_TIMEOUT$2 = 12e4;
const DEFAULT_MAX_RETRIES$2 = 3;
class ClaudeClient {
  client;
  logger;
  timeout;
  maxRetries;
  constructor(options) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      timeout: options.timeout ?? DEFAULT_TIMEOUT$2,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES$2
    });
    this.logger = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT$2;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES$2;
  }
  /**
   * Send a chat completion request to Claude
   */
  async chat(messages, options) {
    const systemPrompt = this.extractSystemPrompt(messages);
    const conversationMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : void 0;
    try {
      this.logger?.debug("Sending chat request to Claude", {
        messageCount: messages.length,
        hasTools: !!tools,
        thinking: options?.thinking?.enabled
      });
      const response = await this.client.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
        stop_sequences: options?.stopSequences,
        // Extended thinking configuration
        ...options?.thinking?.enabled && {
          thinking: {
            type: "enabled",
            budget_tokens: options.thinking.budgetTokens
          }
        }
      });
      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Stream a chat completion from Claude
   */
  async *chatStream(messages, options) {
    const systemPrompt = this.extractSystemPrompt(messages);
    const conversationMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : void 0;
    try {
      this.logger?.debug("Starting streaming chat with Claude");
      const stream = this.client.messages.stream({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
        stop_sequences: options?.stopSequences,
        ...options?.thinking?.enabled && {
          thinking: {
            type: "enabled",
            budget_tokens: options.thinking.budgetTokens
          }
        }
      });
      for await (const event of stream) {
        const chunk = this.parseStreamEvent(event);
        if (chunk) {
          yield chunk;
        }
      }
      yield { type: "done" };
    } catch (error) {
      yield { type: "error", error: String(error) };
      throw this.handleError(error);
    }
  }
  /**
   * Count tokens in content using Claude's tokenizer
   * Approximation: ~4 characters per token
   */
  countTokens(content) {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Extract system prompt from messages
   */
  extractSystemPrompt(messages) {
    const systemMsg = messages.find((msg) => msg.role === "system");
    return systemMsg?.content;
  }
  /**
   * Convert internal message format to Anthropic format
   */
  convertMessages(messages) {
    return messages.filter((msg) => msg.role !== "system").map((msg) => {
      if (msg.role === "tool" && msg.toolResults) {
        return {
          role: "user",
          content: msg.toolResults.map((result) => ({
            type: "tool_result",
            tool_use_id: result.toolCallId,
            content: typeof result.result === "string" ? result.result : JSON.stringify(result.result),
            is_error: result.isError
          }))
        };
      }
      if (msg.role === "assistant" && msg.toolCalls) {
        return {
          role: "assistant",
          content: [
            ...msg.content ? [{ type: "text", text: msg.content }] : [],
            ...msg.toolCalls.map((tc) => ({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.arguments
            }))
          ]
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });
  }
  /**
   * Convert tool definitions to Anthropic format
   */
  convertTools(tools) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }
  /**
   * Parse Anthropic response to internal format
   */
  parseResponse(response) {
    let content = "";
    let thinking = "";
    const toolCalls = [];
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "thinking") {
        thinking += block.thinking;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input
        });
      }
    }
    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens
    };
    let finishReason = "stop";
    if (response.stop_reason === "tool_use") {
      finishReason = "tool_use";
    } else if (response.stop_reason === "max_tokens") {
      finishReason = "max_tokens";
    }
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
      usage,
      finishReason,
      thinking: thinking || void 0
    };
  }
  /**
   * Parse stream event to chunk
   */
  parseStreamEvent(event) {
    switch (event.type) {
      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          return { type: "text", content: event.delta.text };
        }
        if (event.delta.type === "thinking_delta") {
          return { type: "thinking", content: event.delta.thinking };
        }
        break;
      case "content_block_start":
        if (event.content_block.type === "tool_use") {
          return {
            type: "tool_use",
            toolCall: {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: {}
            }
          };
        }
        break;
    }
    return null;
  }
  /**
   * Handle and convert API errors
   */
  handleError(error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return new AuthenticationError(error.message);
      }
      if (error.status === 429) {
        const headers = error.headers;
        const retryAfter = headers?.["retry-after"];
        return new RateLimitError(
          error.message,
          retryAfter ? parseInt(retryAfter, 10) : void 0
        );
      }
      return new APIError(error.message, error.status);
    }
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return new TimeoutError(error.message);
      }
      return new LLMError(error.message);
    }
    return new LLMError(String(error));
  }
}
class CLIError extends LLMError {
  exitCode;
  constructor(message, exitCode = null) {
    super(message);
    this.name = "CLIError";
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, CLIError.prototype);
  }
}
class CLINotFoundError extends CLIError {
  /** Command to install the CLI */
  installCommand = "npm install -g @anthropic-ai/claude-code";
  /** URL for more installation information */
  installUrl = "https://docs.anthropic.com/claude/docs/claude-code-cli";
  /** Environment variable for API key fallback */
  envVariable = "ANTHROPIC_API_KEY";
  /** Path in Settings UI to configure API backend */
  settingsPath = "Settings → LLM Providers → Claude → Use API";
  constructor(message = `Claude CLI not found.

You have two options:

━━━ OPTION 1: Install the CLI ━━━
  npm install -g @anthropic-ai/claude-code
  More info: https://docs.anthropic.com/claude/docs/claude-code-cli

━━━ OPTION 2: Use API Key ━━━
  Set ANTHROPIC_API_KEY in your .env file
  Or: Settings → LLM Providers → Claude → Use API
`) {
    super(message, null);
    this.name = "CLINotFoundError";
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}
const DEFAULT_CLAUDE_PATH = "claude";
const DEFAULT_TIMEOUT$1 = 3e5;
const DEFAULT_MAX_RETRIES$1 = 2;
class ClaudeCodeCLIClient {
  config;
  constructor(config = {}) {
    this.config = {
      claudePath: config.claudePath ?? DEFAULT_CLAUDE_PATH,
      workingDirectory: config.workingDirectory ?? process.cwd(),
      timeout: config.timeout ?? DEFAULT_TIMEOUT$1,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES$1,
      logger: config.logger,
      skipPermissions: config.skipPermissions ?? false
    };
  }
  /**
   * Send a chat completion request via Claude Code CLI.
   * Uses --print flag for non-interactive output.
   */
  async chat(messages, options) {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    const [args, stdinPrompt] = this.buildArgs(prompt, systemPrompt, options);
    const agentContext = options?.agentId ? { agentId: options.agentId, taskId: options.taskId } : void 0;
    const result = await this.executeWithRetry(args, stdinPrompt, options?.workingDirectory, agentContext);
    return this.parseResponse(result, options);
  }
  /**
   * Stream a chat completion from Claude Code CLI.
   * Note: CLI doesn't support true streaming, so we execute and yield complete response.
   * Passes through workingDirectory from options if provided.
   */
  async *chatStream(messages, options) {
    const response = await this.chat(messages, options);
    if (response.content) {
      yield { type: "text", content: response.content };
    }
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        yield { type: "tool_use", toolCall };
      }
    }
    yield { type: "done" };
  }
  /**
   * Approximate token count for content.
   * Uses ~4 characters per token approximation.
   */
  countTokens(content) {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }
  /**
   * Execute a task with tools via Claude Code CLI.
   * Claude Code has built-in tools (Read, Write, Bash, etc.)
   * Passes through workingDirectory from options if provided.
   */
  async executeWithTools(messages, tools, options) {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    const [args, stdinPrompt] = this.buildArgs(prompt, systemPrompt, options);
    if (tools.length > 0) {
      const allowedToolsIdx = args.indexOf("--allowedTools");
      if (allowedToolsIdx !== -1) {
        args.splice(allowedToolsIdx, 2);
      }
      const cliToolNames = tools.map((t) => this.mapToolName(t.name));
      args.push("--allowedTools", cliToolNames.join(","));
    }
    const agentContext = options?.agentId ? { agentId: options.agentId, taskId: options.taskId } : void 0;
    const result = await this.executeWithRetry(args, stdinPrompt, options?.workingDirectory, agentContext);
    return this.parseResponse(result, options);
  }
  /**
   * Continue an existing conversation by ID.
   * Uses --resume flag to continue from where the conversation left off.
   */
  async continueConversation(conversationId, message, options) {
    const args = ["--print", "--output-format", "json"];
    args.push("--resume", conversationId);
    const result = await this.executeWithRetry(args, message);
    return this.parseResponse(result, options);
  }
  /**
   * Check if Claude CLI is available on the system.
   */
  async isAvailable() {
    try {
      await this.execute(["--version"]);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get Claude CLI version string.
   */
  async getVersion() {
    const result = await this.execute(["--version"]);
    return result.trim();
  }
  // ============ Private Methods ============
  /**
   * Build CLI arguments from options (prompt is passed via stdin).
   * Returns [args, prompt] tuple.
   */
  buildArgs(prompt, system, options) {
    const args = ["--print"];
    args.push("--output-format", "json");
    if (options?.disableTools) ;
    else {
      if (this.config.skipPermissions) {
        args.push("--dangerously-skip-permissions");
      }
      if (options?.tools && options.tools.length > 0) {
        const toolNames = this.mapToolNames(options.tools);
        args.push("--allowedTools", toolNames.join(","));
      }
    }
    const stdinPrompt = system ? `<system>
${system}
</system>

${prompt}` : prompt;
    return [args, stdinPrompt];
  }
  /**
   * Execute CLI command with retry logic.
   * @param args CLI arguments
   * @param stdinPrompt Optional prompt to pass via stdin (avoids shell escaping issues)
   * @param workingDirectory Optional per-call working directory override
   * @param agentContext Optional agent context for output streaming
   */
  async executeWithRetry(args, stdinPrompt, workingDirectory, agentContext) {
    let lastError = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.execute(args, stdinPrompt, workingDirectory, agentContext);
      } catch (error) {
        lastError = error;
        this.config.logger?.warn(
          `CLI attempt ${attempt + 1}/${this.config.maxRetries + 1} failed: ${lastError.message}`
        );
        if (attempt < this.config.maxRetries) {
          const delay = 1e3 * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }
    throw lastError ?? new CLIError("Unknown CLI error");
  }
  /**
   * Execute the Claude CLI command.
   * @param args CLI arguments
   * @param stdinPrompt Optional prompt to pass via stdin (avoids shell escaping issues)
   * @param workingDirectory Optional per-call working directory override
   * @param agentContext Optional agent context for output streaming
   */
  execute(args, stdinPrompt, workingDirectory, agentContext) {
    return new Promise((resolve2, reject) => {
      const cwd = workingDirectory || this.config.workingDirectory;
      this.config.logger?.debug("Executing Claude CLI", { args: args.join(" "), cwd });
      console.log("[ClaudeCodeCLIClient] ========== DEBUG START ==========");
      console.log("[ClaudeCodeCLIClient] Full args:", args.join(" "));
      console.log("[ClaudeCodeCLIClient] Using stdin for prompt:", stdinPrompt ? "YES" : "NO");
      console.log("[ClaudeCodeCLIClient] Prompt length:", stdinPrompt?.length ?? 0);
      console.log("[ClaudeCodeCLIClient] Prompt preview:", stdinPrompt?.substring(0, 100) ?? "N/A");
      console.log("[ClaudeCodeCLIClient] Config working dir:", this.config.workingDirectory);
      console.log("[ClaudeCodeCLIClient] Per-call override:", workingDirectory ?? "NONE");
      console.log("[ClaudeCodeCLIClient] Resolved working dir:", cwd);
      console.log("[ClaudeCodeCLIClient] Shell mode:", process.platform === "win32");
      console.log("[ClaudeCodeCLIClient] Agent context:", agentContext?.agentId ?? "NONE");
      console.log("[ClaudeCodeCLIClient] ========== DEBUG END ==========");
      const eventBus = agentContext?.agentId ? EventBus.getInstance() : null;
      const child = spawn(this.config.claudePath, args, {
        cwd,
        // Use resolved cwd (per-call or config default)
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32"
        // Use shell on Windows for PATH resolution
      });
      console.log("[ClaudeCodeCLIClient] Process spawned, PID:", child.pid);
      if (stdinPrompt) {
        child.stdin.write(stdinPrompt);
        child.stdin.end();
        console.log("[ClaudeCodeCLIClient] Prompt written to stdin and closed");
      }
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log("[ClaudeCodeCLIClient] stdout chunk:", chunk.substring(0, 200));
        if (eventBus && agentContext?.agentId) {
          const lines = chunk.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            void eventBus.emit("agent:output", {
              agentId: agentContext.agentId,
              taskId: agentContext.taskId,
              line,
              stream: "stdout",
              timestamp: /* @__PURE__ */ new Date()
            }, { source: "ClaudeCodeCLIClient" });
          }
        }
      });
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log("[ClaudeCodeCLIClient] stderr chunk:", chunk.substring(0, 200));
        if (eventBus && agentContext?.agentId) {
          const lines = chunk.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            void eventBus.emit("agent:output", {
              agentId: agentContext.agentId,
              taskId: agentContext.taskId,
              line,
              stream: "stderr",
              timestamp: /* @__PURE__ */ new Date()
            }, { source: "ClaudeCodeCLIClient" });
          }
        }
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new TimeoutError(`Claude CLI timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.config.logger?.debug("Claude CLI completed successfully");
          resolve2(stdout);
        } else {
          reject(new CLIError(`Claude CLI exited with code ${String(code)}: ${stderr}`, code));
        }
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        if (error.code === "ENOENT") {
          reject(new CLINotFoundError());
        } else {
          reject(new CLIError(`Failed to spawn Claude CLI: ${error.message}`));
        }
      });
    });
  }
  /**
   * Convert messages array to a single prompt string.
   */
  messagesToPrompt(messages) {
    return messages.filter((msg) => msg.role !== "system").map((msg) => {
      if (msg.role === "user") {
        return `Human: ${msg.content}`;
      } else if (msg.role === "assistant") {
        return `Assistant: ${msg.content}`;
      } else if (msg.role === "tool" && msg.toolResults) {
        const results = msg.toolResults.map((r) => `Tool ${r.toolCallId}: ${JSON.stringify(r.result)}`).join("\n");
        return `Tool Results:
${results}`;
      }
      return msg.content;
    }).join("\n\n");
  }
  /**
   * Extract system prompt from messages.
   */
  extractSystemPrompt(messages) {
    const systemMsg = messages.find((msg) => msg.role === "system");
    return systemMsg?.content;
  }
  /**
   * Parse CLI output to LLMResponse.
   * Phase 25 Feature Parity: Accumulates token usage for cost tracking.
   */
  parseResponse(result, options) {
    try {
      const json = JSON.parse(result);
      const content = json.result || json.response || json.content || result;
      const usage = {
        inputTokens: Number(json.inputTokens ?? json.input_tokens ?? 0),
        outputTokens: Number(json.outputTokens ?? json.output_tokens ?? 0),
        totalTokens: 0
      };
      usage.totalTokens = usage.inputTokens + usage.outputTokens;
      const globalAccumulate = global.accumulateTokenUsage;
      if (globalAccumulate && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        globalAccumulate({
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          model: "claude-sonnet-4-5-20250929",
          // Default model used by CLI
          agentId: options?.agentId
        });
      }
      let finishReason = "stop";
      const stopReason = json.stopReason ?? json.stop_reason;
      if (stopReason === "tool_use") {
        finishReason = "tool_use";
      } else if (stopReason === "max_tokens") {
        finishReason = "max_tokens";
      }
      const toolCalls = this.extractToolCalls(json);
      return {
        content: typeof content === "string" ? content : JSON.stringify(content),
        toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
        usage,
        finishReason: toolCalls.length > 0 ? "tool_use" : finishReason
      };
    } catch {
      return {
        content: result.trim(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        finishReason: "stop"
      };
    }
  }
  /**
   * Extract tool calls from JSON response if present.
   */
  extractToolCalls(json) {
    const toolCalls = [];
    if (Array.isArray(json.tool_calls)) {
      for (const tc of json.tool_calls) {
        if (tc && typeof tc === "object") {
          const call = tc;
          toolCalls.push({
            id: typeof call.id === "string" ? call.id : `cli_tool_${Date.now()}`,
            name: call.name,
            arguments: call.arguments ?? call.input ?? {}
          });
        }
      }
    }
    return toolCalls;
  }
  /**
   * Map a single Nexus tool name to Claude Code CLI tool name.
   */
  mapToolName(nexusTool) {
    const toolMap = {
      read_file: "Read",
      write_file: "Write",
      edit_file: "Edit",
      run_command: "Bash",
      search_code: "Grep",
      list_files: "LS",
      web_search: "WebSearch",
      web_fetch: "WebFetch"
    };
    return toolMap[nexusTool] ?? nexusTool;
  }
  /**
   * Map Nexus tool names to Claude Code CLI tool names.
   */
  mapToolNames(tools) {
    return tools.map((t) => this.mapToolName(t.name));
  }
  /**
   * Generate tool hints string for prompt enhancement.
   */
  toolsToHints(tools) {
    return tools.map((t) => `${t.name}: ${t.description}`).join(", ");
  }
  /**
   * Sleep utility for retry delays.
   */
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
}
const DEFAULT_GEMINI_CLI_CONFIG = {
  cliPath: "gemini",
  workingDirectory: process.cwd(),
  timeout: 3e5,
  // 5 minutes
  maxRetries: 2,
  model: DEFAULT_GEMINI_MODEL
  // gemini-2.5-flash
};
const GEMINI_ERROR_PATTERNS = [
  { pattern: /ENOENT|not found|command not found/i, code: "CLI_NOT_FOUND", retriable: false },
  { pattern: /auth|credentials|permission denied|401/i, code: "AUTH_FAILED", retriable: false },
  { pattern: /timeout|timed out/i, code: "TIMEOUT", retriable: true },
  { pattern: /rate limit|429|too many requests/i, code: "RATE_LIMIT", retriable: true },
  { pattern: /invalid|400|bad request/i, code: "INVALID_REQUEST", retriable: false },
  { pattern: /500|502|503|504|server error/i, code: "SERVER_ERROR", retriable: true }
];
class GeminiCLIError extends LLMError {
  exitCode;
  errorCode;
  constructor(message, exitCode = null, errorCode = "UNKNOWN") {
    super(message);
    this.name = "GeminiCLIError";
    this.exitCode = exitCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, GeminiCLIError.prototype);
  }
}
class GeminiCLINotFoundError extends GeminiCLIError {
  constructor(message = `Gemini CLI not found. You have two options:

1. Install Gemini CLI:
   npm install -g @anthropic-ai/gemini-cli
   (or visit: https://ai.google.dev/gemini-api/docs/cli)

2. Use API key instead:
   Set GOOGLE_AI_API_KEY in your .env file
   Or configure in Settings > LLM Providers > Gemini > Use API
`) {
    super(message, null, "CLI_NOT_FOUND");
    this.name = "GeminiCLINotFoundError";
    Object.setPrototypeOf(this, GeminiCLINotFoundError.prototype);
  }
}
class GeminiCLIAuthError extends GeminiCLIError {
  constructor(message = `Gemini CLI authentication failed. Options:

1. Authenticate with gcloud:
   gcloud auth application-default login

2. Use API key instead:
   Set GOOGLE_AI_API_KEY in your .env file
`) {
    super(message, null, "AUTH_FAILED");
    this.name = "GeminiCLIAuthError";
    Object.setPrototypeOf(this, GeminiCLIAuthError.prototype);
  }
}
class GeminiCLITimeoutError extends GeminiCLIError {
  constructor(timeout) {
    super(
      `Gemini CLI request timed out after ${timeout / 1e3} seconds.
Try increasing timeout in Settings > LLM Providers > Gemini > Timeout`,
      null,
      "TIMEOUT"
    );
    this.name = "GeminiCLITimeoutError";
    Object.setPrototypeOf(this, GeminiCLITimeoutError.prototype);
  }
}
class GeminiCLIClient {
  config;
  constructor(config = {}) {
    this.config = {
      cliPath: config.cliPath ?? DEFAULT_GEMINI_CLI_CONFIG.cliPath,
      workingDirectory: config.workingDirectory ?? DEFAULT_GEMINI_CLI_CONFIG.workingDirectory,
      timeout: config.timeout ?? DEFAULT_GEMINI_CLI_CONFIG.timeout,
      maxRetries: config.maxRetries ?? DEFAULT_GEMINI_CLI_CONFIG.maxRetries,
      model: config.model ?? DEFAULT_GEMINI_CLI_CONFIG.model,
      additionalFlags: config.additionalFlags ?? [],
      logger: config.logger
    };
  }
  // ============================================================================
  // Public LLMClient Interface Methods
  // ============================================================================
  /**
   * Send a chat completion request via Gemini CLI.
   * Uses --yolo flag for non-interactive output.
   */
  async chat(messages, options) {
    const prompt = this.messagesToPrompt(messages);
    const args = this.buildArgs(prompt, options);
    const result = await this.executeWithRetry(args);
    return this.parseResponse(result);
  }
  /**
   * Stream a chat completion from Gemini CLI.
   * Uses `-o stream-json` for NDJSON streaming.
   */
  async *chatStream(messages, options) {
    const prompt = this.messagesToPrompt(messages);
    const args = this.buildStreamArgs(prompt, options);
    try {
      for await (const chunk of this.executeStream(args)) {
        if (chunk.type === "message" && chunk.role === "assistant") {
          yield { type: "text", content: chunk.content };
        } else if (chunk.type === "error") {
          yield { type: "error", error: chunk.error };
        }
      }
      yield { type: "done" };
    } catch (error) {
      this.config.logger?.warn("Streaming failed, falling back to non-streaming", {
        error: error.message
      });
      const response = await this.chat(messages, options);
      if (response.content) {
        yield { type: "text", content: response.content };
      }
      yield { type: "done" };
    }
  }
  /**
   * Approximate token count for content.
   * Uses ~4 characters per token approximation.
   */
  countTokens(content) {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }
  // ============================================================================
  // Additional Public Methods
  // ============================================================================
  /**
   * Check if Gemini CLI is available on the system.
   */
  async isAvailable() {
    try {
      await this.execute(["--version"]);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get Gemini CLI version string.
   */
  async getVersion() {
    const result = await this.execute(["--version"]);
    return result.trim();
  }
  /**
   * Get the current configuration.
   */
  getConfig() {
    return { ...this.config };
  }
  // ============================================================================
  // Private Methods - Argument Building
  // ============================================================================
  /**
   * Build CLI arguments for non-streaming request.
   */
  buildArgs(prompt, _options) {
    const args = [];
    args.push("--yolo");
    args.push("-o", "json");
    args.push("-m", this.config.model);
    args.push(...this.config.additionalFlags);
    args.push(prompt);
    return args;
  }
  /**
   * Build CLI arguments for streaming request.
   */
  buildStreamArgs(prompt, _options) {
    const args = [];
    args.push("--yolo");
    args.push("-o", "stream-json");
    args.push("-m", this.config.model);
    args.push(...this.config.additionalFlags);
    args.push(prompt);
    return args;
  }
  // ============================================================================
  // Private Methods - Message Conversion
  // ============================================================================
  /**
   * Convert messages array to a single prompt string.
   * Gemini CLI doesn't support --system-prompt, so we prepend it to the prompt.
   */
  messagesToPrompt(messages) {
    const parts = [];
    const systemMsg = messages.find((msg) => msg.role === "system");
    if (systemMsg) {
      parts.push(`[System Instructions]
${systemMsg.content}
[End System Instructions]
`);
    }
    const conversationParts = messages.filter((msg) => msg.role !== "system").map((msg) => {
      if (msg.role === "user") {
        return `Human: ${msg.content}`;
      } else if (msg.role === "assistant") {
        return `Assistant: ${msg.content}`;
      } else if (msg.role === "tool" && msg.toolResults) {
        const results = msg.toolResults.map((r) => `Tool ${r.toolCallId}: ${JSON.stringify(r.result)}`).join("\n");
        return `Tool Results:
${results}`;
      }
      return msg.content;
    });
    parts.push(...conversationParts);
    return parts.join("\n\n");
  }
  // ============================================================================
  // Private Methods - Response Parsing
  // ============================================================================
  /**
   * Parse CLI JSON output to LLMResponse.
   */
  parseResponse(result) {
    try {
      const json = JSON.parse(result);
      const content = json.response || "";
      const modelStats = json.stats?.models ? Object.values(json.stats.models)[0] : void 0;
      const tokens = modelStats?.tokens;
      const usage = {
        inputTokens: tokens?.input ?? tokens?.prompt ?? 0,
        outputTokens: tokens?.candidates ?? 0,
        totalTokens: tokens?.total ?? 0,
        thinkingTokens: tokens?.thoughts
      };
      if (usage.totalTokens === 0 && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        usage.totalTokens = usage.inputTokens + usage.outputTokens;
      }
      const finishReason = "stop";
      return {
        content: typeof content === "string" ? content : JSON.stringify(content),
        usage,
        finishReason
      };
    } catch {
      return {
        content: result.trim(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        finishReason: "stop"
      };
    }
  }
  // ============================================================================
  // Private Methods - CLI Execution
  // ============================================================================
  /**
   * Execute CLI command with retry logic.
   */
  async executeWithRetry(args) {
    let lastError = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.execute(args);
      } catch (error) {
        lastError = error;
        this.config.logger?.warn(
          `Gemini CLI attempt ${attempt + 1}/${this.config.maxRetries + 1} failed: ${lastError.message}`
        );
        if (!this.isRetriableError(lastError)) {
          throw this.wrapError(lastError);
        }
        if (attempt < this.config.maxRetries) {
          const delay = 1e3 * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }
    throw this.wrapError(lastError ?? new GeminiCLIError("Unknown Gemini CLI error"));
  }
  /**
   * Execute the Gemini CLI command.
   */
  execute(args) {
    return new Promise((resolve2, reject) => {
      this.config.logger?.debug("Executing Gemini CLI", { args: args.join(" ") });
      const child = spawn(this.config.cliPath, args, {
        cwd: this.config.workingDirectory,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32"
        // Use shell on Windows for PATH resolution
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new GeminiCLITimeoutError(this.config.timeout));
      }, this.config.timeout);
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.config.logger?.debug("Gemini CLI completed successfully");
          resolve2(stdout);
        } else {
          const error = new GeminiCLIError(
            `Gemini CLI exited with code ${String(code)}: ${stderr}`,
            code
          );
          reject(this.wrapError(error));
        }
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        if (error.code === "ENOENT") {
          reject(new GeminiCLINotFoundError());
        } else {
          reject(new GeminiCLIError(`Failed to spawn Gemini CLI: ${error.message}`));
        }
      });
    });
  }
  /**
   * Execute the Gemini CLI command with streaming output.
   */
  async *executeStream(args) {
    this.config.logger?.debug("Executing Gemini CLI with streaming", { args: args.join(" ") });
    const child = spawn(this.config.cliPath, args, {
      cwd: this.config.workingDirectory,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    let buffer = "";
    let stderr = "";
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    const processEndPromise = new Promise((resolve2, reject) => {
      child.on("close", (code) => {
        resolve2(code);
      });
      child.on("error", (error) => {
        if (error.code === "ENOENT") {
          reject(new GeminiCLINotFoundError());
          return;
        }
        reject(new GeminiCLIError(`Failed to spawn Gemini CLI: ${error.message}`));
      });
    });
    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      throw new GeminiCLITimeoutError(this.config.timeout);
    }, this.config.timeout);
    try {
      for await (const data of child.stdout) {
        buffer += data.toString();
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            try {
              const chunk = JSON.parse(line);
              yield chunk;
            } catch {
              this.config.logger?.debug("Skipped non-JSON line in stream", { line });
            }
          }
        }
      }
      const exitCode = await processEndPromise;
      if (exitCode !== 0) {
        throw new GeminiCLIError(`Gemini CLI exited with code ${exitCode !== null ? String(exitCode) : "unknown"}: ${stderr}`, exitCode);
      }
    } finally {
      clearTimeout(timeoutId);
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (child.exitCode === null) {
            child.kill("SIGKILL");
          }
        }, 1e3);
      }
    }
  }
  // ============================================================================
  // Private Methods - Error Handling
  // ============================================================================
  /**
   * Check if an error is retriable.
   */
  isRetriableError(error) {
    const message = error.message.toLowerCase();
    for (const pattern of GEMINI_ERROR_PATTERNS) {
      if (pattern.pattern.test(message)) {
        return pattern.retriable;
      }
    }
    return true;
  }
  /**
   * Wrap generic errors in specific error classes.
   */
  wrapError(error) {
    const message = error.message.toLowerCase();
    if (message.includes("enoent") || message.includes("not found") || message.includes("command not found")) {
      return new GeminiCLINotFoundError();
    }
    if (message.includes("auth") || message.includes("credentials") || message.includes("permission denied") || message.includes("401")) {
      return new GeminiCLIAuthError();
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      return new GeminiCLITimeoutError(this.config.timeout);
    }
    if (error instanceof GeminiCLIError) {
      return error;
    }
    return new GeminiCLIError(error.message);
  }
  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================
  /**
   * Sleep utility for retry delays.
   */
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
}
function validateSender$1(event) {
  const url = event.sender.getURL();
  return url.startsWith("http://localhost:") || url.startsWith("file://");
}
function isValidProvider(provider) {
  return provider === "claude" || provider === "gemini" || provider === "openai";
}
function registerSettingsHandlers() {
  ipcMain.handle("settings:getAll", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    return settingsService.getAll();
  });
  ipcMain.handle("settings:get", (event, key) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Invalid settings key");
    }
    return settingsService.get(key);
  });
  ipcMain.handle("settings:set", (event, key, value) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Invalid settings key");
    }
    settingsService.set(key, value);
    return true;
  });
  ipcMain.handle("settings:setApiKey", (event, provider, key) => {
    if (!validateSender$1(event)) {
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
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!isValidProvider(provider)) {
      throw new Error("Invalid LLM provider. Must be claude, gemini, or openai.");
    }
    return settingsService.hasApiKey(provider);
  });
  ipcMain.handle("settings:clearApiKey", (event, provider) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (!isValidProvider(provider)) {
      throw new Error("Invalid LLM provider. Must be claude, gemini, or openai.");
    }
    settingsService.clearApiKey(provider);
    return true;
  });
  ipcMain.handle("settings:reset", (event) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    settingsService.reset();
    return true;
  });
  ipcMain.handle("settings:checkCliAvailability", async (event, provider) => {
    if (!validateSender$1(event)) {
      throw new Error("Unauthorized IPC sender");
    }
    if (provider !== "claude" && provider !== "gemini") {
      throw new Error("Invalid provider. Must be claude or gemini.");
    }
    try {
      if (provider === "claude") {
        const client = new ClaudeCodeCLIClient();
        const available = await client.isAvailable();
        if (available) {
          const version = await client.getVersion();
          return { detected: true, message: `Claude CLI ${version}` };
        }
        return { detected: false, message: "Claude CLI not found" };
      } else {
        const client = new GeminiCLIClient();
        const available = await client.isAvailable();
        if (available) {
          const version = await client.getVersion();
          return { detected: true, message: `Gemini CLI ${version}` };
        }
        return { detected: false, message: "Gemini CLI not found" };
      }
    } catch (error) {
      console.error(`Failed to check ${provider} CLI availability:`, error);
      return { detected: false, message: `Failed to detect ${provider} CLI` };
    }
  });
}
function validateSender(event) {
  const url = event.sender.getURL();
  return url.startsWith("http://localhost:") || url.startsWith("file://");
}
function registerDialogHandlers() {
  ipcMain.handle(
    "dialog:openDirectory",
    async (event, options) => {
      if (!validateSender(event)) {
        console.error("[DialogHandlers] Unauthorized sender for dialog:openDirectory");
        throw new Error("Unauthorized IPC sender");
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("No browser window available for dialog");
      }
      try {
        const result = await dialog.showOpenDialog(window, {
          title: options?.title ?? "Select Directory",
          defaultPath: options?.defaultPath,
          buttonLabel: options?.buttonLabel ?? "Select",
          properties: ["openDirectory", "createDirectory"]
        });
        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true, path: null };
        }
        return { canceled: false, path: result.filePaths[0] };
      } catch (error) {
        console.error("[DialogHandlers] Error in openDirectory:", error);
        throw error;
      }
    }
  );
  ipcMain.handle(
    "dialog:openFile",
    async (event, options) => {
      if (!validateSender(event)) {
        console.error("[DialogHandlers] Unauthorized sender for dialog:openFile");
        throw new Error("Unauthorized IPC sender");
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("No browser window available for dialog");
      }
      try {
        const properties = ["openFile"];
        if (options?.multiSelections) {
          properties.push("multiSelections");
        }
        const result = await dialog.showOpenDialog(window, {
          title: options?.title ?? "Select File",
          defaultPath: options?.defaultPath,
          filters: options?.filters,
          properties
        });
        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true, path: null };
        }
        return { canceled: false, path: result.filePaths[0] };
      } catch (error) {
        console.error("[DialogHandlers] Error in openFile:", error);
        throw error;
      }
    }
  );
  ipcMain.handle(
    "dialog:saveFile",
    async (event, options) => {
      if (!validateSender(event)) {
        console.error("[DialogHandlers] Unauthorized sender for dialog:saveFile");
        throw new Error("Unauthorized IPC sender");
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("No browser window available for dialog");
      }
      try {
        const result = await dialog.showSaveDialog(window, {
          title: options?.title ?? "Save File",
          defaultPath: options?.defaultPath,
          filters: options?.filters
        });
        if (result.canceled || !result.filePath) {
          return { canceled: true, path: null };
        }
        return { canceled: false, path: result.filePath };
      } catch (error) {
        console.error("[DialogHandlers] Error in saveFile:", error);
        throw error;
      }
    }
  );
  console.log("[DialogHandlers] Registered dialog IPC handlers");
}
class GeminiAPIError extends Error {
  statusCode;
  constructor(message, statusCode) {
    super(message);
    this.name = "GeminiAPIError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GeminiAPIError.prototype);
  }
}
class GeminiRateLimitError extends GeminiAPIError {
  retryAfter;
  constructor(message = "Rate limit exceeded", retryAfter) {
    super(message, 429);
    this.name = "GeminiRateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, GeminiRateLimitError.prototype);
  }
}
class GeminiTimeoutError extends GeminiAPIError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "GeminiTimeoutError";
    Object.setPrototypeOf(this, GeminiTimeoutError.prototype);
  }
}
const DEFAULT_TIMEOUT = 12e4;
class GeminiClient {
  client;
  modelName;
  logger;
  timeout;
  constructor(options) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.modelName = options.model ?? DEFAULT_GEMINI_MODEL;
    this.logger = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }
  /**
   * Send a chat completion request to Gemini
   */
  async chat(messages, options) {
    const contents = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    try {
      this.logger?.debug("Sending chat request to Gemini", {
        messageCount: messages.length,
        model: this.modelName
      });
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens,
          temperature: options?.temperature,
          stopSequences: options?.stopSequences,
          tools: options?.tools ? this.convertTools(options.tools) : void 0
        }
      });
      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Stream a chat completion from Gemini
   */
  async *chatStream(messages, options) {
    const contents = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    try {
      this.logger?.debug("Starting streaming chat with Gemini");
      const response = await this.client.models.generateContentStream({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens,
          temperature: options?.temperature,
          stopSequences: options?.stopSequences,
          tools: options?.tools ? this.convertTools(options.tools) : void 0
        }
      });
      for await (const chunk of response) {
        const text2 = chunk.text;
        if (text2) {
          yield { type: "text", content: text2 };
        }
      }
      yield { type: "done" };
    } catch (error) {
      yield { type: "error", error: String(error) };
      throw this.handleError(error);
    }
  }
  /**
   * Count tokens in content
   * Approximation: ~4 characters per token
   */
  countTokens(content) {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Extract system prompt from messages
   */
  extractSystemPrompt(messages) {
    const systemMsg = messages.find((msg) => msg.role === "system");
    return systemMsg?.content;
  }
  /**
   * Convert internal message format to Gemini format
   */
  convertMessages(messages) {
    return messages.filter((msg) => msg.role !== "system").map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));
  }
  /**
   * Convert tool definitions to Gemini format
   */
  convertTools(tools) {
    return [{
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }))
    }];
  }
  /**
   * Parse Gemini response to internal format
   */
  parseResponse(response) {
    const content = response.text ?? "";
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: (response.usageMetadata?.promptTokenCount ?? 0) + (response.usageMetadata?.candidatesTokenCount ?? 0)
    };
    const finishReason = "stop";
    return {
      content,
      usage,
      finishReason
    };
  }
  /**
   * Handle and convert API errors
   */
  handleError(error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("quota") || message.includes("rate")) {
        return new GeminiRateLimitError(error.message);
      }
      if (message.includes("timeout") || message.includes("timed out")) {
        return new GeminiTimeoutError(error.message);
      }
      return new GeminiAPIError(error.message);
    }
    return new GeminiAPIError(String(error));
  }
}
const MODEL_DIMENSIONS = {
  // Transformers.js models
  "Xenova/all-MiniLM-L6-v2": 384,
  "Xenova/all-MiniLM-L12-v2": 384,
  "Xenova/all-mpnet-base-v2": 768,
  "Xenova/paraphrase-MiniLM-L6-v2": 384,
  "Xenova/bge-small-en-v1.5": 384,
  "Xenova/bge-base-en-v1.5": 768,
  "Xenova/gte-small": 384,
  "Xenova/gte-base": 768,
  "Xenova/e5-small-v2": 384,
  "Xenova/e5-base-v2": 768,
  // Short aliases (for convenience)
  "all-MiniLM-L6-v2": 384,
  "all-MiniLM-L12-v2": 384,
  "all-mpnet-base-v2": 768,
  "bge-small-en-v1.5": 384,
  "bge-base-en-v1.5": 768,
  "gte-small": 384,
  "gte-base": 768,
  // OpenAI (for reference in fallback scenarios)
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536
};
const DEFAULT_LOCAL_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_LOCAL_EMBEDDINGS_CONFIG = {
  model: DEFAULT_LOCAL_MODEL,
  dimensions: MODEL_DIMENSIONS[DEFAULT_LOCAL_MODEL],
  cacheEnabled: true,
  maxCacheSize: 1e4,
  batchSize: 32,
  mockMode: false
};
var LocalEmbeddingsErrorCode = /* @__PURE__ */ ((LocalEmbeddingsErrorCode2) => {
  LocalEmbeddingsErrorCode2["INIT_FAILED"] = "INIT_FAILED";
  LocalEmbeddingsErrorCode2["MODEL_NOT_FOUND"] = "MODEL_NOT_FOUND";
  LocalEmbeddingsErrorCode2["DOWNLOAD_FAILED"] = "DOWNLOAD_FAILED";
  LocalEmbeddingsErrorCode2["INFERENCE_FAILED"] = "INFERENCE_FAILED";
  LocalEmbeddingsErrorCode2["INPUT_TOO_LONG"] = "INPUT_TOO_LONG";
  LocalEmbeddingsErrorCode2["NOT_INITIALIZED"] = "NOT_INITIALIZED";
  LocalEmbeddingsErrorCode2["UNKNOWN"] = "UNKNOWN";
  return LocalEmbeddingsErrorCode2;
})(LocalEmbeddingsErrorCode || {});
class LocalEmbeddingsError extends Error {
  code;
  suggestion;
  cause;
  constructor(code, message, suggestion, cause) {
    super(message, { cause });
    this.name = "LocalEmbeddingsError";
    this.code = code;
    this.suggestion = suggestion;
    this.cause = cause;
  }
}
class LocalEmbeddingsInitError extends LocalEmbeddingsError {
  constructor(model, cause) {
    super(
      LocalEmbeddingsErrorCode.INIT_FAILED,
      `Failed to initialize local embeddings model '${model}'.

Options:
1. Check your internet connection (model downloads on first use)
2. Use a different model in Settings > Embeddings > Model
3. Use OpenAI API for embeddings:
   Set OPENAI_API_KEY in your .env file
`,
      "Try using OpenAI API as a fallback",
      cause
    );
    this.name = "LocalEmbeddingsInitError";
  }
}
class LocalEmbeddingsNotInitializedError extends LocalEmbeddingsError {
  constructor() {
    super(
      LocalEmbeddingsErrorCode.NOT_INITIALIZED,
      "LocalEmbeddingsService not initialized. Call initialize() first.",
      "Call await service.initialize() before using embed()"
    );
    this.name = "LocalEmbeddingsNotInitializedError";
  }
}
class LocalEmbeddingsInferenceError extends LocalEmbeddingsError {
  constructor(message, cause) {
    super(
      LocalEmbeddingsErrorCode.INFERENCE_FAILED,
      `Embedding inference failed: ${message}`,
      "Try with shorter input text or different model",
      cause
    );
    this.name = "LocalEmbeddingsInferenceError";
  }
}
class LocalEmbeddingsService {
  // Configuration
  model;
  dimensions;
  cacheEnabled;
  maxCacheSize;
  batchSize;
  mockMode;
  progressCallback;
  logger;
  // State
  initialized = false;
  pipeline = null;
  cache = /* @__PURE__ */ new Map();
  // Statistics
  totalEmbeddings = 0;
  cacheHits = 0;
  totalLatencyMs = 0;
  constructor(config = {}) {
    const merged = { ...DEFAULT_LOCAL_EMBEDDINGS_CONFIG, ...config };
    this.model = merged.model;
    this.cacheEnabled = merged.cacheEnabled;
    this.maxCacheSize = merged.maxCacheSize;
    this.batchSize = merged.batchSize;
    this.mockMode = merged.mockMode;
    this.progressCallback = config.progressCallback;
    this.logger = config.logger ?? {};
    const modelDimensions = MODEL_DIMENSIONS[this.model];
    this.dimensions = config.dimensions ?? modelDimensions ?? merged.dimensions;
    this.logger.debug?.("LocalEmbeddingsService created", {
      model: this.model,
      dimensions: this.dimensions,
      mockMode: this.mockMode
    });
  }
  // ==========================================================================
  // Public API
  // ==========================================================================
  /**
   * Initialize the embeddings pipeline
   *
   * Downloads the model on first use if not cached locally.
   * Safe to call multiple times - subsequent calls are no-ops.
   *
   * @throws LocalEmbeddingsInitError if initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.mockMode) {
      this.initialized = true;
      this.logger.info?.("LocalEmbeddingsService initialized in mock mode");
      return;
    }
    try {
      this.logger.info?.(`Loading model: ${this.model}`, { model: this.model });
      const { pipeline } = await import("@huggingface/transformers");
      let lastProgress = 0;
      const progressHandler = (progress) => {
        if (progress && typeof progress.progress === "number") {
          const pct = Math.round(progress.progress);
          if (pct !== lastProgress) {
            lastProgress = pct;
            this.progressCallback?.(pct);
            this.logger.debug?.(`Model loading: ${pct}%`);
          }
        }
      };
      this.pipeline = await pipeline("feature-extraction", this.model, {
        progress_callback: progressHandler
      });
      this.initialized = true;
      this.progressCallback?.(100);
      this.logger.info?.("LocalEmbeddingsService initialized successfully", {
        model: this.model,
        dimensions: this.dimensions
      });
    } catch (error) {
      this.logger.error?.("Failed to initialize LocalEmbeddingsService", {
        model: this.model,
        error: String(error)
      });
      throw new LocalEmbeddingsInitError(
        this.model,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  /**
   * Check if local embeddings are available
   *
   * Attempts to initialize the service and returns true if successful.
   * Returns false if initialization fails (e.g., model unavailable).
   */
  async isAvailable() {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Generate embedding for a single text
   *
   * @param text - Input text to embed
   * @returns Embedding result with vector and metadata
   * @throws LocalEmbeddingsNotInitializedError if not initialized
   * @throws LocalEmbeddingsInferenceError if inference fails
   */
  async embed(text2) {
    const startTime = Date.now();
    if (this.cacheEnabled) {
      const cached = this.getFromCache(text2);
      if (cached) {
        this.cacheHits++;
        this.totalEmbeddings++;
        return {
          embedding: cached,
          tokenCount: this.estimateTokens(text2),
          cached: true,
          model: this.model,
          latencyMs: Date.now() - startTime
        };
      }
    }
    let embedding;
    if (this.mockMode) {
      embedding = this.generateMockEmbedding(text2);
    } else {
      if (!this.initialized) {
        await this.initialize();
      }
      if (!this.pipeline) {
        throw new LocalEmbeddingsNotInitializedError();
      }
      try {
        const output = await this.pipeline(text2, {
          pooling: "mean",
          normalize: true
        });
        let embeddingData;
        if (Array.isArray(output?.embeddings) && output.embeddings.length > 0) {
          const first = output.embeddings[0];
          if (Array.isArray(first)) {
            embeddingData = first;
          }
        }
        if (!embeddingData && output?.data) {
          embeddingData = Array.from(output.data);
        }
        if (!embeddingData || embeddingData.length === 0) {
          throw new LocalEmbeddingsInferenceError("Empty embedding output");
        }
        embedding = embeddingData;
      } catch (error) {
        throw new LocalEmbeddingsInferenceError(
          String(error),
          error instanceof Error ? error : void 0
        );
      }
    }
    const latencyMs = Date.now() - startTime;
    if (this.cacheEnabled) {
      this.addToCache(text2, embedding);
    }
    this.totalEmbeddings++;
    this.totalLatencyMs += latencyMs;
    return {
      embedding,
      tokenCount: this.estimateTokens(text2),
      cached: false,
      model: this.model,
      latencyMs
    };
  }
  /**
   * Generate embeddings for multiple texts
   *
   * Processes texts in batches for efficiency.
   * Uses cache when available to skip already-embedded texts.
   *
   * @param texts - Array of input texts
   * @returns Array of embedding results
   */
  async embedBatch(texts) {
    const results = new Array(texts.length);
    const uncached = [];
    for (let i = 0; i < texts.length; i++) {
      const text2 = texts[i];
      if (this.cacheEnabled) {
        const cached = this.getFromCache(text2);
        if (cached) {
          this.cacheHits++;
          this.totalEmbeddings++;
          results[i] = {
            embedding: cached,
            tokenCount: this.estimateTokens(text2),
            cached: true,
            model: this.model,
            latencyMs: 0
          };
          continue;
        }
      }
      uncached.push({ index: i, text: text2 });
    }
    if (uncached.length > 0) {
      for (let i = 0; i < uncached.length; i += this.batchSize) {
        const batch = uncached.slice(i, i + this.batchSize);
        const batchResults = await Promise.all(
          batch.map(({ text: text2 }) => this.embed(text2))
        );
        for (let j = 0; j < batch.length; j++) {
          results[batch[j].index] = batchResults[j];
        }
      }
    }
    return results;
  }
  /**
   * Calculate cosine similarity between two embeddings
   *
   * @param a - First embedding vector
   * @param b - Second embedding vector
   * @returns Similarity score (-1 to 1, higher = more similar)
   * @throws Error if dimensions don't match
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error(
        `Embedding dimensions must match: got ${a.length} and ${b.length}`
      );
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }
  /**
   * Find most similar embeddings from a collection
   *
   * @param query - Query embedding vector
   * @param candidates - Array of candidate embedding vectors
   * @param topK - Number of results to return (default: 10)
   * @returns Sorted array of indices and similarity scores
   */
  findMostSimilar(query, candidates, topK = 10) {
    const similarities = candidates.map((candidate, index) => ({
      index,
      similarity: this.cosineSimilarity(query, candidate)
    }));
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }
  /**
   * Get embedding dimension for current model
   */
  getDimension() {
    return this.dimensions;
  }
  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug?.("Cache cleared");
  }
  /**
   * Get current cache size
   */
  getCacheSize() {
    return this.cache.size;
  }
  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      model: this.model,
      dimensions: this.dimensions,
      cacheSize: this.cache.size,
      cacheHitRate: this.totalEmbeddings > 0 ? this.cacheHits / this.totalEmbeddings : 0,
      totalEmbeddings: this.totalEmbeddings,
      cacheHits: this.cacheHits,
      averageLatencyMs: this.totalEmbeddings > 0 ? this.totalLatencyMs / this.totalEmbeddings : 0
    };
  }
  /**
   * Get the model name
   */
  getModel() {
    return this.model;
  }
  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  /**
   * Generate a deterministic mock embedding for testing
   * Uses a hash-based approach to ensure same input = same output
   */
  generateMockEmbedding(text2) {
    const embedding = new Array(this.dimensions);
    let hash = 0;
    for (let i = 0; i < text2.length; i++) {
      const char = text2.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    for (let i = 0; i < this.dimensions; i++) {
      const seed = hash + i * 1234;
      embedding[i] = Math.sin(seed * 1e-3) * 0.1;
    }
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] = embedding[i] / norm;
      }
    }
    return embedding;
  }
  /**
   * Generate cache key for text
   */
  getCacheKey(text2) {
    let hash = 0;
    for (let i = 0; i < text2.length; i++) {
      const char = text2.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${this.model}:${hash}`;
  }
  /**
   * Add embedding to cache with LRU eviction
   * FIX: Implement true LRU - delete and re-add on existing entry to maintain order
   */
  addToCache(text2, embedding) {
    const cacheKey = this.getCacheKey(text2);
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    }
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(cacheKey, embedding);
  }
  /**
   * Get embedding from cache with LRU refresh
   * FIX: Move to end (most recently used) on access
   */
  getFromCache(text2) {
    const cacheKey = this.getCacheKey(text2);
    const embedding = this.cache.get(cacheKey);
    if (embedding) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, embedding);
    }
    return embedding;
  }
  /**
   * Estimate token count for text
   * Rough approximation: ~4 characters per token
   */
  estimateTokens(text2) {
    return Math.ceil(text2.length / 4);
  }
}
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;
const EMBEDDING_DIMENSION = 1536;
class EmbeddingsService {
  client = null;
  model;
  mockMode;
  maxRetries;
  batchSize;
  cache;
  constructor(options) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.mockMode = options.mockMode ?? false;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.cache = /* @__PURE__ */ new Map();
    if (!this.mockMode) {
      this.client = new OpenAI({
        apiKey: options.apiKey,
        maxRetries: this.maxRetries
      });
    }
  }
  /**
   * Generate embedding for a single text
   */
  async embed(text2) {
    const cacheKey = this.getCacheKey(text2);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        embedding: cached,
        tokenCount: this.estimateTokens(text2)
      };
    }
    let embedding;
    if (this.mockMode) {
      embedding = this.generateMockEmbedding(text2);
    } else {
      embedding = await this.callAPI(text2);
    }
    this.cache.set(cacheKey, embedding);
    return {
      embedding,
      tokenCount: this.estimateTokens(text2)
    };
  }
  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts) {
    const results = [];
    const uncached = [];
    for (let i = 0; i < texts.length; i++) {
      const text2 = texts[i];
      const cacheKey = this.getCacheKey(text2);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        results[i] = {
          embedding: cached,
          tokenCount: this.estimateTokens(text2)
        };
      } else {
        uncached.push({ index: i, text: text2 });
      }
    }
    if (uncached.length > 0) {
      for (let i = 0; i < uncached.length; i += this.batchSize) {
        const batch = uncached.slice(i, i + this.batchSize);
        const batchTexts = batch.map((b) => b.text);
        let embeddings;
        if (this.mockMode) {
          embeddings = batchTexts.map((t) => this.generateMockEmbedding(t));
        } else {
          embeddings = await this.callBatchAPI(batchTexts);
        }
        for (let j = 0; j < batch.length; j++) {
          const { index, text: text2 } = batch[j];
          const embedding = embeddings[j];
          this.cache.set(this.getCacheKey(text2), embedding);
          results[index] = {
            embedding,
            tokenCount: this.estimateTokens(text2)
          };
        }
      }
    }
    return results;
  }
  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error("Embedding dimensions must match");
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }
  /**
   * Find most similar embeddings from a collection
   */
  findMostSimilar(query, candidates, topK = 10) {
    const similarities = candidates.map((candidate, index) => ({
      index,
      similarity: this.cosineSimilarity(query, candidate)
    }));
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }
  /**
   * Get embedding dimension
   */
  getDimension() {
    return EMBEDDING_DIMENSION;
  }
  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Call OpenAI API for single embedding
   */
  async callAPI(text2) {
    if (!this.client) {
      throw new Error("OpenAI client not initialized");
    }
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text2
    });
    return response.data[0].embedding;
  }
  /**
   * Call OpenAI API for batch embeddings
   */
  async callBatchAPI(texts) {
    if (!this.client) {
      throw new Error("OpenAI client not initialized");
    }
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts
    });
    return response.data.map((d) => d.embedding);
  }
  /**
   * Generate a deterministic mock embedding for testing
   * Uses a hash-based approach to ensure same input = same output
   */
  generateMockEmbedding(text2) {
    const embedding = new Array(EMBEDDING_DIMENSION);
    let hash = 0;
    for (let i = 0; i < text2.length; i++) {
      const char = text2.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      const seed = hash + i * 1234;
      embedding[i] = Math.sin(seed * 1e-3) * 0.1;
    }
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
        embedding[i] = embedding[i] / norm;
      }
    }
    return embedding;
  }
  /**
   * Generate cache key for text
   */
  getCacheKey(text2) {
    let hash = 0;
    for (let i = 0; i < text2.length; i++) {
      const char = text2.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${this.model}:${hash}`;
  }
  /**
   * Estimate token count for text
   * Rough approximation: ~4 characters per token
   */
  estimateTokens(text2) {
    return Math.ceil(text2.length / 4);
  }
}
class LLMBackendError extends LLMError {
  /** The provider that failed: 'claude', 'gemini', or 'embeddings' */
  provider;
  /** Whether the error is recoverable (can fall back to another backend) */
  recoverable;
  constructor(message, provider, recoverable = false) {
    super(message);
    this.name = "LLMBackendError";
    this.provider = provider;
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, LLMBackendError.prototype);
  }
}
const API_KEY_DETAILS = {
  claude: {
    name: "Claude",
    envVariable: "ANTHROPIC_API_KEY",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    cliSettingsPath: "Settings → LLM Providers → Claude → Use CLI"
  },
  gemini: {
    name: "Gemini",
    envVariable: "GOOGLE_API_KEY",
    getKeyUrl: "https://aistudio.google.com/apikey",
    cliSettingsPath: "Settings → LLM Providers → Gemini → Use CLI"
  },
  embeddings: {
    name: "OpenAI Embeddings",
    envVariable: "OPENAI_API_KEY",
    getKeyUrl: "https://platform.openai.com/api-keys",
    cliSettingsPath: "Settings → Embeddings → Use Local"
  }
};
class APIKeyMissingError extends LLMBackendError {
  /** Environment variable that should contain the API key */
  envVariable;
  /** URL to get an API key */
  getKeyUrl;
  /** Path in Settings UI to switch to CLI backend */
  cliSettingsPath;
  constructor(provider) {
    const details = API_KEY_DETAILS[provider];
    const message = `${details.name} API key required.

You have two options:

━━━ OPTION 1: Set API Key ━━━
  Set ${details.envVariable} in your .env file
  Get key: ${details.getKeyUrl}

━━━ OPTION 2: Use CLI/Local ━━━
  ${details.cliSettingsPath}
  (No API key required)
`;
    super(message, provider, true);
    this.name = "APIKeyMissingError";
    this.envVariable = details.envVariable;
    this.getKeyUrl = details.getKeyUrl;
    this.cliSettingsPath = details.cliSettingsPath;
    Object.setPrototypeOf(this, APIKeyMissingError.prototype);
  }
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID };
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
const DECOMPOSITION_SYSTEM_PROMPT = `You are a senior technical architect. Your job is to decompose features into atomic, implementable tasks.

## CRITICAL CONSTRAINTS
1. **30-MINUTE RULE**: Every task MUST be completable in 30 minutes or less. This is NON-NEGOTIABLE.
2. **5-FILE LIMIT**: Each task should modify at most 5 files.
3. **ATOMIC**: Each task must be independently testable and verifiable.
4. **DEPENDENCIES**: Explicitly declare dependencies between tasks using task names.

## OUTPUT FORMAT
Respond with ONLY a valid JSON array (no markdown code blocks, no explanation):
[
  {
    "name": "Short task name",
    "description": "Detailed description of what to implement",
    "files": ["src/path/to/file.ts"],
    "testCriteria": ["Criterion 1", "Criterion 2"],
    "dependsOn": [],
    "estimatedMinutes": 20
  }
]

## DECOMPOSITION STRATEGY
1. Start with types/interfaces (foundation)
2. Then infrastructure/utilities
3. Then core implementation
4. Then integration/wiring
5. Finally tests if not included in each task

## SIZE GUIDELINES
- atomic: 1-10 minutes (single function, small fix)
- small: 10-20 minutes (single file, simple feature)
- medium: 20-30 minutes (multi-file, moderate complexity)
- Never create tasks over 30 minutes - split them instead`;
const SPLIT_SYSTEM_PROMPT = `You are splitting an oversized task into smaller, atomic tasks.

## RULES
1. Each resulting task must be under 30 minutes
2. Maintain logical dependencies between split tasks
3. Preserve all functionality from the original task
4. Keep file changes focused per task

## OUTPUT FORMAT
Respond with ONLY a valid JSON array (no markdown code blocks, no explanation):
[
  {
    "name": "Short task name",
    "description": "Detailed description",
    "files": ["src/path/to/file.ts"],
    "testCriteria": ["Criterion 1"],
    "dependsOn": [],
    "estimatedMinutes": 20
  }
]`;
class TaskDecomposer {
  llmClient;
  config;
  constructor(llmClient, config) {
    this.llmClient = llmClient;
    this.config = {
      maxTaskMinutes: config?.maxTaskMinutes ?? 30,
      maxFilesPerTask: config?.maxFilesPerTask ?? 5,
      verbose: config?.verbose ?? false
    };
  }
  /**
   * Decompose a feature description into atomic tasks
   * This is the main method used by NexusCoordinator
   */
  async decompose(featureDescription, options) {
    const prompt = this.buildDecompositionPrompt(featureDescription, options);
    const response = await this.llmClient.chat(
      [
        { role: "system", content: DECOMPOSITION_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      {
        maxTokens: 4e3,
        temperature: 0.3,
        // Lower temperature for more consistent structure
        disableTools: true
        // Chat-only mode for decomposition
      }
    );
    const rawTasks = this.parseJsonResponse(response.content);
    const tasks2 = rawTasks.map(
      (raw, index) => this.createPlanningTask(raw, index, options)
    );
    const validatedTasks = await this.validateAndSplitTasks(tasks2);
    const resolvedTasks = this.resolveInternalDependencies(validatedTasks);
    if (this.config.verbose) {
      console.log(`Decomposed feature into ${resolvedTasks.length} tasks`);
    }
    return resolvedTasks;
  }
  /**
   * Validate that a task meets size requirements
   */
  validateTaskSize(task) {
    const errors = [];
    const warnings = [];
    if (task.estimatedMinutes > this.config.maxTaskMinutes) {
      errors.push(
        `Task exceeds ${this.config.maxTaskMinutes}-minute limit (estimated: ${task.estimatedMinutes} min)`
      );
    }
    if (task.files.length > this.config.maxFilesPerTask) {
      errors.push(
        `Task modifies too many files (${task.files.length}, max ${this.config.maxFilesPerTask})`
      );
    }
    if (task.testCriteria.length === 0) {
      warnings.push("Task has no test criteria defined");
    }
    if (!task.description || task.description.length < 10) {
      warnings.push("Task description is too brief");
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  /**
   * Split an oversized task into smaller tasks
   */
  async splitTask(task) {
    const prompt = this.buildSplitPrompt(task);
    const response = await this.llmClient.chat(
      [
        { role: "system", content: SPLIT_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      {
        maxTokens: 2e3,
        temperature: 0.3,
        disableTools: true
        // Chat-only mode for task splitting
      }
    );
    const rawTasks = this.parseJsonResponse(response.content);
    return rawTasks.map(
      (raw, index) => this.createPlanningTask(raw, index, void 0, task.id)
    );
  }
  /**
   * Estimate time for a task based on heuristics
   */
  estimateTime(task) {
    let estimate = 10;
    estimate += task.files.length * 5;
    const wordCount = task.description.split(/\s+/).length;
    estimate += Math.min(wordCount / 10, 10);
    if (task.testCriteria.length > 0) {
      estimate += task.testCriteria.length * 2;
    }
    const complexity = this.assessComplexity(task);
    if (complexity === "high") {
      estimate *= 1.5;
    } else if (complexity === "low") {
      estimate *= 0.7;
    }
    return Math.min(Math.round(estimate), this.config.maxTaskMinutes);
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Build the decomposition prompt
   */
  buildDecompositionPrompt(featureDescription, options) {
    let prompt = `Decompose this feature into atomic tasks:

`;
    prompt += `## Feature Description
${featureDescription}

`;
    if (options?.contextFiles && options.contextFiles.length > 0) {
      prompt += `## Context Files
`;
      options.contextFiles.forEach((file) => {
        prompt += `- ${file}
`;
      });
      prompt += "\n";
    }
    if (options?.useTDD) {
      prompt += `## Approach
Use TDD (Test-Driven Development) - write tests first.

`;
    }
    prompt += `Remember: Each task MUST be under ${options?.maxTaskMinutes ?? 30} minutes. Split larger tasks.`;
    return prompt;
  }
  /**
   * Build the split prompt for oversized tasks
   */
  buildSplitPrompt(task) {
    return `This task is too large (${task.estimatedMinutes} minutes, max 30). Split it into smaller tasks:

Task: ${task.name}
Description: ${task.description}
Files: ${task.files.join(", ")}
Test Criteria: ${task.testCriteria.join("; ")}

Return a JSON array of smaller tasks, each under 30 minutes.`;
  }
  /**
   * Parse JSON response from LLM, handling various formats
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Type is used for caller inference
  parseJsonResponse(response) {
    try {
      let jsonString = response.trim();
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }
      const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        throw new Error("No JSON array found in response");
      }
      return JSON.parse(arrayMatch[0]);
    } catch (error) {
      throw new Error(
        `Failed to parse decomposition response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Create a PlanningTask from raw LLM output
   */
  createPlanningTask(raw, index, options, parentId) {
    const id = v4();
    const estimatedMinutes = raw.estimatedMinutes ?? this.estimateTimeFromRaw(raw);
    return {
      id,
      name: raw.name || `Task ${index + 1}`,
      description: raw.description || "",
      type: options?.useTDD ? "tdd" : "auto",
      size: this.categorizeSize(estimatedMinutes),
      estimatedMinutes,
      dependsOn: raw.dependsOn || [],
      testCriteria: raw.testCriteria || [],
      files: raw.files || [],
      // Store parentId for reference if this was split from another task
      ...parentId && { parentId }
    };
  }
  /**
   * Estimate time from raw task data (before full conversion)
   */
  estimateTimeFromRaw(raw) {
    let estimate = 10;
    estimate += (raw.files?.length || 1) * 5;
    const wordCount = (raw.description || "").split(/\s+/).length;
    estimate += Math.min(wordCount / 10, 10);
    return Math.min(Math.round(estimate), this.config.maxTaskMinutes);
  }
  /**
   * Categorize task size based on estimated minutes
   */
  categorizeSize(minutes) {
    if (minutes <= 10) return "atomic";
    if (minutes <= 20) return "small";
    if (minutes <= 30) return "medium";
    return "large";
  }
  /**
   * Assess task complexity based on keywords
   */
  assessComplexity(task) {
    const text2 = `${task.name} ${task.description}`.toLowerCase();
    const highIndicators = [
      "algorithm",
      "optimize",
      "refactor",
      "complex",
      "integration",
      "security",
      "authentication",
      "encryption",
      "migration",
      "state machine",
      "concurrent",
      "parallel",
      "async",
      "distributed"
    ];
    const lowIndicators = [
      "rename",
      "move",
      "delete",
      "simple",
      "basic",
      "typo",
      "comment",
      "format",
      "lint",
      "config",
      "update dependency",
      "add import"
    ];
    const highCount = highIndicators.filter((i) => text2.includes(i)).length;
    const lowCount = lowIndicators.filter((i) => text2.includes(i)).length;
    if (highCount >= 2) return "high";
    if (lowCount >= 2) return "low";
    return "medium";
  }
  /**
   * Validate all tasks and split any that are too large
   */
  async validateAndSplitTasks(tasks2) {
    const result = [];
    for (const task of tasks2) {
      const validation = this.validateTaskSize(task);
      if (validation.valid) {
        result.push(task);
      } else if (task.estimatedMinutes > this.config.maxTaskMinutes) {
        if (this.config.verbose) {
          console.log(
            `Splitting oversized task "${task.name}" (${task.estimatedMinutes} min)`
          );
        }
        const splitTasks = await this.splitTask(task);
        result.push(...splitTasks);
      } else {
        if (this.config.verbose) {
          console.warn(
            `Task "${task.name}" has issues: ${validation.errors.join(", ")}`
          );
        }
        result.push(task);
      }
    }
    return result;
  }
  /**
   * Resolve internal dependencies (convert task names to IDs)
   */
  resolveInternalDependencies(tasks2) {
    const nameToId = /* @__PURE__ */ new Map();
    for (const task of tasks2) {
      nameToId.set(task.name.toLowerCase().trim(), task.id);
    }
    return tasks2.map((task) => ({
      ...task,
      dependsOn: task.dependsOn.map((dep) => {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(dep)) return dep;
        const resolvedId = nameToId.get(dep.toLowerCase().trim());
        if (resolvedId) return resolvedId;
        if (this.config.verbose) {
          console.warn(`Could not resolve dependency "${dep}" for task "${task.name}"`);
        }
        return dep;
      })
    }));
  }
}
class DependencyResolver {
  config;
  constructor(config) {
    this.config = {
      verbose: config?.verbose ?? false,
      maxWaveDepth: config?.maxWaveDepth ?? 100
    };
  }
  /**
   * Calculate execution waves from tasks
   * Tasks in the same wave can be executed in parallel
   */
  calculateWaves(tasks2) {
    const waves = [];
    const completed = /* @__PURE__ */ new Set();
    const remaining = new Set(tasks2.map((t) => t.id));
    const taskMap = new Map(tasks2.map((t) => [t.id, t]));
    let waveNumber = 0;
    while (remaining.size > 0 && waveNumber < this.config.maxWaveDepth) {
      const waveTaskIds = [];
      for (const taskId of Array.from(remaining)) {
        const task = taskMap.get(taskId);
        if (!task) continue;
        const deps = task.dependsOn;
        const allDepsSatisfied = deps.every(
          (d) => completed.has(d) || !taskMap.has(d)
        );
        if (allDepsSatisfied) {
          waveTaskIds.push(taskId);
        }
      }
      if (waveTaskIds.length === 0 && remaining.size > 0) {
        if (this.config.verbose) {
          console.warn(
            `Circular dependency detected - breaking cycle with first remaining task`
          );
        }
        const first = remaining.values().next().value;
        if (first !== void 0) {
          waveTaskIds.push(first);
        }
      }
      if (waveTaskIds.length === 0) {
        break;
      }
      const waveTasks = waveTaskIds.map((id) => taskMap.get(id)).filter((t) => t !== void 0);
      const estimatedMinutes = Math.max(
        ...waveTasks.map((t) => t.estimatedMinutes || 30)
      );
      waves.push({
        id: waveNumber,
        tasks: waveTasks,
        estimatedMinutes
      });
      for (const id of waveTaskIds) {
        completed.add(id);
        remaining.delete(id);
      }
      waveNumber++;
    }
    if (this.config.verbose) {
      console.log(`Calculated ${waves.length} execution waves`);
    }
    return waves;
  }
  /**
   * Get topologically sorted task order using Kahn's algorithm
   * @throws Error if circular dependency is detected
   */
  topologicalSort(tasks2) {
    const graph = /* @__PURE__ */ new Map();
    const inDegree = /* @__PURE__ */ new Map();
    const taskMap = /* @__PURE__ */ new Map();
    for (const task of tasks2) {
      taskMap.set(task.id, task);
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    }
    for (const task of tasks2) {
      for (const dep of task.dependsOn) {
        if (taskMap.has(dep)) {
          graph.get(dep)?.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
        }
      }
    }
    const queue = [];
    const result = [];
    for (const [id, degree] of Array.from(inDegree)) {
      if (degree === 0) {
        queue.push(id);
      }
    }
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const currentTask = taskMap.get(current);
      if (currentTask) result.push(currentTask);
      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    if (result.length !== tasks2.length) {
      const remaining = tasks2.filter((t) => !result.find((r) => r.id === t.id));
      throw new Error(
        `Circular dependency detected involving: ${remaining.map((t) => t.name).join(", ")}`
      );
    }
    if (this.config.verbose) {
      console.log(`Topological sort complete: ${result.length} tasks`);
    }
    return result;
  }
  /**
   * Check for circular dependencies
   */
  hasCircularDependency(tasks2) {
    try {
      this.topologicalSort(tasks2);
      return false;
    } catch {
      return true;
    }
  }
  /**
   * Detect circular dependency cycles using DFS
   */
  detectCycles(tasks2) {
    const cycles = [];
    const taskMap = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const path2 = [];
    for (const task of tasks2) {
      taskMap.set(task.id, task);
    }
    const dfs = (taskId) => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path2.push(taskId);
      const task = taskMap.get(taskId);
      for (const dep of task?.dependsOn || []) {
        if (!taskMap.has(dep)) continue;
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recursionStack.has(dep)) {
          const cycleStart = path2.indexOf(dep);
          const cyclePath = path2.slice(cycleStart);
          cycles.push({
            taskIds: [...cyclePath]
          });
        }
      }
      path2.pop();
      recursionStack.delete(taskId);
    };
    for (const task of tasks2) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }
    if (this.config.verbose && cycles.length > 0) {
      console.warn(`Detected ${cycles.length} circular dependency cycles`);
    }
    return cycles;
  }
  /**
   * Get all dependencies for a task (transitive)
   * Returns all task IDs that must be completed before this task
   */
  getAllDependencies(taskId, tasks2) {
    const taskMap = new Map(tasks2.map((t) => [t.id, t]));
    const allDeps = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    const collectDeps = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const task = taskMap.get(id);
      if (!task) return;
      for (const dep of task.dependsOn) {
        if (taskMap.has(dep)) {
          allDeps.add(dep);
          collectDeps(dep);
        }
      }
    };
    collectDeps(taskId);
    return Array.from(allDeps);
  }
  /**
   * Get direct dependents of a task
   * Returns tasks that directly depend on the given task
   */
  getDependents(taskId, tasks2) {
    return tasks2.filter((task) => task.dependsOn.includes(taskId));
  }
  /**
   * Get the critical path (longest chain of dependencies by time)
   * The critical path determines the minimum total execution time
   */
  getCriticalPath(tasks2) {
    const taskMap = new Map(tasks2.map((t) => [t.id, t]));
    const memo = /* @__PURE__ */ new Map();
    const getLongestPath = (taskId) => {
      const cached = memo.get(taskId);
      if (cached) return cached;
      const task = taskMap.get(taskId);
      if (!task) return { path: [], time: 0 };
      const deps = task.dependsOn;
      if (deps.length === 0) {
        const result2 = { path: [task], time: task.estimatedMinutes || 0 };
        memo.set(taskId, result2);
        return result2;
      }
      let longestDepResult = { path: [], time: 0 };
      for (const dep of deps) {
        if (!taskMap.has(dep)) continue;
        const depResult = getLongestPath(dep);
        if (depResult.time > longestDepResult.time) {
          longestDepResult = depResult;
        }
      }
      const result = {
        path: [...longestDepResult.path, task],
        time: longestDepResult.time + (task.estimatedMinutes || 0)
      };
      memo.set(taskId, result);
      return result;
    };
    let criticalResult = { path: [], time: 0 };
    for (const task of tasks2) {
      const result = getLongestPath(task.id);
      if (result.time > criticalResult.time) {
        criticalResult = result;
      }
    }
    if (this.config.verbose) {
      console.log(
        `Critical path: ${criticalResult.path.length} tasks, ${criticalResult.time} minutes`
      );
    }
    return criticalResult.path;
  }
  /**
   * Get the next available tasks given completed task IDs
   */
  getNextAvailable(tasks2, completedIds) {
    const completed = new Set(completedIds);
    const taskMap = new Map(tasks2.map((t) => [t.id, t]));
    const pending = tasks2.filter((t) => !completed.has(t.id));
    return pending.filter((task) => {
      const deps = task.dependsOn;
      return deps.every((d) => completed.has(d) || !taskMap.has(d));
    });
  }
  /**
   * Validate the dependency graph
   * Returns validation issues found
   */
  validate(tasks2) {
    const issues = [];
    const taskIds = new Set(tasks2.map((t) => t.id));
    for (const task of tasks2) {
      if (task.dependsOn.includes(task.id)) {
        issues.push(`Task "${task.name}" depends on itself`);
      }
    }
    for (const task of tasks2) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          if (this.config.verbose) {
            console.warn(
              `Task "${task.name}" depends on unknown task "${dep}" (may be external)`
            );
          }
        }
      }
    }
    const cycles = this.detectCycles(tasks2);
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        const taskNames = cycle.taskIds.map((id) => tasks2.find((t) => t.id === id)?.name || id).join(" -> ");
        issues.push(`Circular dependency: ${taskNames}`);
      }
    }
    return {
      valid: issues.length === 0,
      issues
    };
  }
}
class TimeEstimator {
  factors;
  historicalData;
  verbose;
  maxHistoryPerCategory;
  constructor(config) {
    this.factors = {
      fileWeight: config?.factors?.fileWeight ?? 5,
      complexityMultiplier: config?.factors?.complexityMultiplier ?? 1.5,
      testWeight: config?.factors?.testWeight ?? 10,
      baseTime: config?.factors?.baseTime ?? 10,
      maxTime: config?.factors?.maxTime ?? 30,
      minTime: config?.factors?.minTime ?? 5
    };
    this.historicalData = /* @__PURE__ */ new Map();
    this.verbose = config?.verbose ?? false;
    this.maxHistoryPerCategory = config?.maxHistoryPerCategory ?? 100;
  }
  /**
   * Estimate time for a single task
   */
  estimate(task) {
    const result = this.estimateDetailed(task);
    return Promise.resolve(result.estimatedMinutes);
  }
  /**
   * Estimate total time for a set of tasks
   * Accounts for parallel execution when possible
   */
  async estimateTotal(tasks2) {
    if (tasks2.length === 0) return 0;
    let total = 0;
    for (const task of tasks2) {
      const estimate = await this.estimate(task);
      total += estimate;
    }
    if (this.verbose) {
      console.log(`Estimated total time for ${tasks2.length} tasks: ${total} minutes`);
    }
    return total;
  }
  /**
   * Calibrate estimator with actual data
   * Records actual time taken for a task to improve future estimates
   */
  calibrate(task, actualMinutes) {
    const category = this.categorizeTask(task);
    const history = this.historicalData.get(category) || [];
    history.push(actualMinutes);
    if (history.length > this.maxHistoryPerCategory) {
      history.shift();
    }
    this.historicalData.set(category, history);
    if (this.verbose) {
      console.log(
        `Calibrated ${category} task: actual=${actualMinutes}min, history size=${history.length}`
      );
    }
  }
  /**
   * Get detailed estimation with breakdown
   */
  estimateDetailed(task) {
    let estimate = this.factors.baseTime;
    const factors = [];
    const breakdown = {
      base: this.factors.baseTime,
      files: 0,
      complexity: 0,
      tests: 0
    };
    const fileCount = task.files.length || 1;
    const fileTime = fileCount * this.factors.fileWeight;
    estimate += fileTime;
    breakdown.files = fileTime;
    if (fileCount > 1) {
      factors.push(`${fileCount} files`);
    }
    const complexity = this.assessComplexity(task);
    if (complexity === "high") {
      const complexityTime = estimate * (this.factors.complexityMultiplier - 1);
      estimate += complexityTime;
      breakdown.complexity = complexityTime;
      factors.push("high complexity");
    } else if (complexity === "medium") {
      const complexityTime = estimate * 0.2;
      estimate += complexityTime;
      breakdown.complexity = complexityTime;
      factors.push("medium complexity");
    }
    if (this.requiresTests(task)) {
      estimate += this.factors.testWeight;
      breakdown.tests = this.factors.testWeight;
      factors.push("includes tests");
    }
    const historical = this.getHistoricalAverage(task);
    if (historical !== null) {
      const originalEstimate = estimate;
      estimate = (estimate + historical) / 2;
      if (this.verbose) {
        console.log(
          `Blended estimate: heuristic=${originalEstimate.toFixed(1)}, historical=${historical.toFixed(1)}, final=${estimate.toFixed(1)}`
        );
      }
      factors.push("historical adjustment");
    }
    const finalEstimate = Math.min(
      Math.max(Math.round(estimate), this.factors.minTime),
      this.factors.maxTime
    );
    return {
      estimatedMinutes: finalEstimate,
      confidence: this.getConfidence(task, historical),
      breakdown,
      factors
    };
  }
  /**
   * Get average estimation accuracy from historical data
   * Returns ratio of actual/estimated - values > 1 mean underestimating
   */
  getAccuracy(category) {
    const categories = category ? [category] : Array.from(this.historicalData.keys());
    let totalActual = 0;
    let sampleSize = 0;
    for (const cat of categories) {
      const history = this.historicalData.get(cat);
      if (history && history.length > 0) {
        totalActual += history.reduce((a, b) => a + b, 0);
        sampleSize += history.length;
      }
    }
    if (sampleSize === 0) return null;
    const avgActual = totalActual / sampleSize;
    const baseline = 20;
    return {
      ratio: avgActual / baseline,
      sampleSize
    };
  }
  /**
   * Reset calibration data
   */
  resetCalibration(category) {
    if (category) {
      this.historicalData.delete(category);
    } else {
      this.historicalData.clear();
    }
    if (this.verbose) {
      console.log(
        category ? `Reset calibration for ${category}` : "Reset all calibration data"
      );
    }
  }
  /**
   * Get current estimation factors
   */
  getFactors() {
    return { ...this.factors };
  }
  /**
   * Update estimation factors
   */
  setFactors(factors) {
    this.factors = {
      ...this.factors,
      ...factors
    };
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Assess task complexity based on description and requirements
   */
  assessComplexity(task) {
    const description = (task.description || "").toLowerCase();
    const name = (task.name || "").toLowerCase();
    const text2 = description + " " + name;
    const highIndicators = [
      "algorithm",
      "optimize",
      "refactor",
      "complex",
      "integration",
      "security",
      "authentication",
      "encryption",
      "database migration",
      "state machine",
      "concurrent",
      "parallel",
      "async",
      "distributed",
      "architecture",
      "redesign"
    ];
    const lowIndicators = [
      "rename",
      "move",
      "delete",
      "simple",
      "basic",
      "typo",
      "comment",
      "format",
      "lint",
      "config",
      "update dependency",
      "bump version",
      "add log",
      "fix import"
    ];
    const highCount = highIndicators.filter((i) => text2.includes(i)).length;
    const lowCount = lowIndicators.filter((i) => text2.includes(i)).length;
    const fileCount = task.files.length;
    const criteriaCount = task.testCriteria.length;
    if (highCount >= 2 || fileCount >= 5 || criteriaCount >= 5) {
      return "high";
    }
    if (lowCount >= 2 || fileCount <= 1 && criteriaCount <= 1) {
      return "low";
    }
    return "medium";
  }
  /**
   * Check if task requires test implementation
   */
  requiresTests(task) {
    const description = (task.description || "").toLowerCase();
    const criteria = task.testCriteria.join(" ").toLowerCase();
    const text2 = description + " " + criteria;
    return text2.includes("test") || text2.includes("verify") || text2.includes("coverage") || text2.includes("spec") || task.files.some(
      (f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")
    ) || false;
  }
  /**
   * Categorize task for historical tracking
   */
  categorizeTask(task) {
    const files = task.files;
    const description = (task.description || "").toLowerCase();
    if (files.some((f) => f.includes("test") || f.includes("spec")) || description.includes("test")) {
      return "test";
    }
    if (files.some(
      (f) => f.includes("component") || f.includes("ui") || f.includes(".tsx") || f.includes(".vue") || f.includes(".svelte")
    )) {
      return "ui";
    }
    if (files.some(
      (f) => f.includes("api") || f.includes("service") || f.includes("controller") || f.includes("route")
    )) {
      return "backend";
    }
    if (files.some(
      (f) => f.includes("config") || f.includes("setup") || f.includes("infrastructure")
    ) || description.includes("config") || description.includes("setup")) {
      return "infrastructure";
    }
    return "general";
  }
  /**
   * Get historical average for task category
   */
  getHistoricalAverage(task) {
    const category = this.categorizeTask(task);
    const history = this.historicalData.get(category);
    if (!history || history.length < 5) {
      return null;
    }
    return history.reduce((a, b) => a + b, 0) / history.length;
  }
  /**
   * Determine confidence level for estimate
   */
  getConfidence(task, historical) {
    if (historical !== null) {
      return "high";
    }
    if (task.files.length > 0 && task.description.length > 50) {
      return "medium";
    }
    return "low";
  }
}
class BaseAgentRunner {
  /** LLM client (API or CLI) */
  llmClient;
  /** Event bus for emitting agent events */
  eventBus;
  /** Agent configuration */
  config;
  /**
   * Create a new agent runner
   *
   * @param llmClient - The LLM client to use for chat (API or CLI)
   * @param config - Optional configuration overrides
   */
  constructor(llmClient, config) {
    this.llmClient = llmClient;
    this.eventBus = EventBus.getInstance();
    this.config = {
      maxIterations: config?.maxIterations ?? 50,
      timeout: config?.timeout ?? 18e5
      // 30 minutes
    };
  }
  // ============================================================================
  // Protected Methods (for use by subclasses)
  // ============================================================================
  /**
   * Run the agent loop - iteratively interact with LLM until task complete
   *
   * This is the core execution method that handles:
   * - Iteration limits
   * - Timeouts
   * - Error recovery
   * - Event emission
   *
   * @param task - The task being executed
   * @param context - Execution context
   * @param initialPrompt - The initial prompt to send to the LLM
   * @returns Task execution result
   */
  async runAgentLoop(task, context, initialPrompt) {
    const startTime = Date.now();
    let iteration = 0;
    const messages = [
      { role: "user", content: initialPrompt }
    ];
    this.emitEvent("agent:started", {
      taskId: task.id,
      agentType: this.getAgentType()
    });
    while (iteration < this.config.maxIterations) {
      iteration++;
      if (Date.now() - startTime > this.config.timeout) {
        return this.createTimeoutResult(task, iteration, startTime);
      }
      this.emitEvent("agent:iteration", {
        taskId: task.id,
        iteration,
        agentType: this.getAgentType()
      });
      try {
        const chatOptions = {
          workingDirectory: context.workingDir
        };
        const response = await this.llmClient.chat(
          this.convertToLLMMessages(messages, this.getSystemPrompt()),
          chatOptions
        );
        const content = response.content;
        if (this.isTaskComplete(content, task)) {
          this.emitEvent("agent:completed", {
            taskId: task.id,
            iterations: iteration,
            success: true,
            agentType: this.getAgentType()
          });
          return {
            taskId: task.id,
            success: true,
            escalated: false,
            output: content,
            iterations: iteration,
            duration: Date.now() - startTime,
            metrics: {
              iterations: iteration,
              tokensUsed: response.usage.totalTokens,
              timeMs: Date.now() - startTime
            }
          };
        }
        messages.push({ role: "assistant", content });
        messages.push({
          role: "user",
          content: this.getContinuationPrompt()
        });
      } catch (error) {
        this.emitEvent("agent:error", {
          taskId: task.id,
          error: error instanceof Error ? error.message : "Unknown error",
          agentType: this.getAgentType(),
          iteration
        });
        messages.push({
          role: "user",
          content: this.getErrorRecoveryPrompt(error)
        });
      }
    }
    return this.createMaxIterationsResult(task, iteration, startTime);
  }
  /**
   * Emit an event through the event bus
   *
   * @param type - Internal event type (will be mapped to proper EventType)
   * @param payload - Event payload
   */
  emitEvent(type, payload) {
    const payloadAgentId = payload.agentId;
    const payloadTaskId = payload.taskId;
    const agentId = typeof payloadAgentId === "string" ? payloadAgentId : typeof payloadTaskId === "string" ? payloadTaskId : "unknown";
    const taskId = typeof payloadTaskId === "string" ? payloadTaskId : "unknown";
    if (type === "agent:started") {
      void this.eventBus.emit("agent:started", {
        agentId,
        taskId
      });
    } else if (type === "agent:iteration") {
      const iteration = typeof payload.iteration === "number" ? payload.iteration : 0;
      void this.eventBus.emit("agent:progress", {
        agentId,
        taskId,
        action: "iteration",
        details: `Iteration ${String(iteration)}`
      });
    } else if (type === "agent:completed") {
      void this.eventBus.emit("task:completed", {
        taskId,
        result: {
          taskId,
          success: true,
          files: []
        }
      });
    } else if (type === "agent:error") {
      const errorMsg = typeof payload.error === "string" ? payload.error : "Unknown error";
      void this.eventBus.emit("agent:error", {
        agentId,
        error: errorMsg,
        recoverable: true
      });
    } else if (type === "agent:escalated") {
      const reason = typeof payload.reason === "string" ? payload.reason : "Unknown reason";
      const iterations = typeof payload.iterations === "number" ? payload.iterations : 0;
      const lastError = typeof payload.error === "string" ? payload.error : void 0;
      void this.eventBus.emit("task:escalated", {
        taskId,
        reason,
        iterations,
        lastError
      });
    } else {
      void this.eventBus.emit("agent:progress", {
        agentId,
        taskId,
        action: type,
        details: JSON.stringify(payload)
      });
    }
  }
  /**
   * Build the context section for prompts
   *
   * @param context - Agent context
   * @returns Formatted context string
   */
  buildContextSection(context) {
    const sections = [];
    sections.push("## Context");
    sections.push(`Working Directory: ${context.workingDir}`);
    if (context.relevantFiles?.length) {
      sections.push("");
      sections.push("### Relevant Files");
      context.relevantFiles.forEach((f) => {
        sections.push(`- ${f}`);
      });
    }
    if (context.previousAttempts?.length) {
      sections.push("");
      sections.push("### Previous Attempts");
      context.previousAttempts.forEach((a, i) => {
        sections.push(`${i + 1}. ${a}`);
      });
    }
    return sections.join("\n");
  }
  /**
   * Create a timeout result
   */
  createTimeoutResult(task, iteration, startTime) {
    this.emitEvent("agent:escalated", {
      taskId: task.id,
      reason: "timeout",
      iterations: iteration,
      agentType: this.getAgentType()
    });
    return {
      taskId: task.id,
      success: false,
      escalated: true,
      reason: "Task timed out",
      output: "Task execution timed out",
      iterations: iteration,
      duration: Date.now() - startTime,
      escalationReason: `Task timed out after ${Math.round((Date.now() - startTime) / 1e3)} seconds`,
      metrics: {
        iterations: iteration,
        tokensUsed: 0,
        timeMs: Date.now() - startTime
      }
    };
  }
  /**
   * Create a max iterations result
   */
  createMaxIterationsResult(task, iteration, startTime) {
    this.emitEvent("agent:escalated", {
      taskId: task.id,
      reason: "max_iterations",
      iterations: iteration,
      agentType: this.getAgentType()
    });
    return {
      taskId: task.id,
      success: false,
      escalated: true,
      reason: "Maximum iterations reached",
      output: "Maximum iterations reached without completion",
      iterations: iteration,
      duration: Date.now() - startTime,
      escalationReason: `Maximum iterations (${this.config.maxIterations}) reached`,
      metrics: {
        iterations: iteration,
        tokensUsed: 0,
        timeMs: Date.now() - startTime
      }
    };
  }
  /**
   * Get the continuation prompt for multi-turn conversations
   */
  getContinuationPrompt() {
    return "Please continue. If you have completed the task, include [TASK_COMPLETE] in your response along with a summary of what you accomplished.";
  }
  /**
   * Get the error recovery prompt
   */
  getErrorRecoveryPrompt(error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `An error occurred: ${message}. Please address this issue and continue with the task.`;
  }
  /**
   * Convert internal messages to LLM-compatible format
   * Includes system prompt as a system message at the beginning
   */
  convertToLLMMessages(messages, systemPrompt) {
    const result = [];
    if (systemPrompt) {
      result.push({
        role: "system",
        content: systemPrompt
      });
    }
    for (const m of messages) {
      if (m.role !== "system") {
        result.push({
          role: m.role,
          content: m.content
        });
      }
    }
    return result;
  }
}
const CODER_SYSTEM_PROMPT = `You are an expert software engineer. Your job is to implement code changes for the given task.

## Guidelines
1. Write clean, maintainable, well-documented code
2. Follow existing code patterns in the project
3. Include appropriate error handling
4. Keep changes focused and minimal
5. Consider edge cases
6. Add JSDoc comments for public APIs
7. Follow TypeScript best practices

## Process
1. Understand the task requirements and acceptance criteria
2. Plan your approach - identify files to create or modify
3. Implement the solution step by step
4. Verify your implementation meets all acceptance criteria

## Code Quality Standards
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Handle errors appropriately with try/catch blocks
- Add type annotations for all function parameters and returns
- Avoid any type - use proper typing
- Use async/await for asynchronous operations

## Output Format
For each file change, use this format:

### File: path/to/file.ts
\`\`\`typescript
// Your code here
\`\`\`

Explanation: Brief explanation of the changes and why they were made.

## Completion
When you have completed the implementation, include [TASK_COMPLETE] in your response along with:
1. A summary of all changes made
2. List of files created/modified
3. How the acceptance criteria are satisfied`;
class CoderAgent extends BaseAgentRunner {
  /**
   * Get the agent type identifier
   */
  getAgentType() {
    return "coder";
  }
  /**
   * Execute a coding task
   *
   * @param task - The task to implement
   * @param context - Execution context with working directory and files
   * @returns Task execution result
   */
  async execute(task, context) {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }
  /**
   * Get the system prompt for the coder agent
   */
  getSystemPrompt() {
    return CODER_SYSTEM_PROMPT;
  }
  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task to implement
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  buildTaskPrompt(task, context) {
    const sections = [];
    sections.push(`# Task: ${task.name}`);
    sections.push("");
    sections.push("## Description");
    sections.push(task.description || "No description provided.");
    sections.push("");
    if (task.files && task.files.length > 0) {
      sections.push("## Files to Modify");
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push("");
    }
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push("## Dependencies");
      sections.push("This task depends on the following tasks being completed:");
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push("");
    }
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push("## Acceptance Criteria");
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push("");
    }
    if (task.estimatedMinutes) {
      sections.push(`## Time Estimate`);
      sections.push(`This task should take approximately ${task.estimatedMinutes} minutes.`);
      sections.push("");
    }
    sections.push(this.buildContextSection(context));
    sections.push("");
    sections.push("## Instructions");
    sections.push("Please implement this task following the guidelines in the system prompt.");
    sections.push("When complete, include [TASK_COMPLETE] in your response with a summary.");
    return sections.join("\n");
  }
  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  isTaskComplete(response, _task) {
    const lowerResponse = response.toLowerCase();
    if (response.includes("[TASK_COMPLETE]")) {
      return true;
    }
    const completionPhrases = [
      "implementation complete",
      "task completed successfully",
      "all acceptance criteria satisfied",
      "implementation is complete",
      "changes have been completed",
      "task has been completed"
    ];
    return completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }
  /**
   * Override continuation prompt for coder-specific guidance
   */
  getContinuationPrompt() {
    return `Please continue with the implementation.
If you need to modify more files, provide them in the same format.
If you have completed all changes, include [TASK_COMPLETE] with a summary of:
1. All files created or modified
2. How each acceptance criterion was addressed
3. Any important notes or caveats`;
  }
}
const TESTER_SYSTEM_PROMPT = `You are an expert test engineer specializing in comprehensive test coverage. Your job is to write high-quality tests for the given code.

## Guidelines
1. Write thorough tests that cover happy paths and edge cases
2. Follow existing test patterns in the project
3. Use descriptive test names that explain what is being tested
4. Include setup/teardown when needed (beforeEach, afterEach)
5. Test both positive and negative scenarios
6. Mock external dependencies appropriately
7. Aim for high code coverage without redundant tests

## Testing Best Practices
- Use AAA pattern: Arrange, Act, Assert
- One assertion per test when possible (multiple related assertions are OK)
- Test behavior, not implementation details
- Use meaningful test data (not just "test" or "123")
- Group related tests using describe blocks
- Clean up any side effects in afterEach/afterAll
- Test error conditions and edge cases

## Test Categories to Consider
1. **Unit Tests**: Test individual functions/methods in isolation
2. **Integration Tests**: Test interactions between components
3. **Edge Cases**: Boundary conditions, empty inputs, null values
4. **Error Handling**: Verify proper error throwing and handling
5. **Async Operations**: Test promises, async/await, callbacks
6. **State Management**: Test state transitions and side effects

## Test Naming Convention
Use descriptive names that explain:
- What is being tested
- Under what conditions
- What the expected outcome is

Example: "should return empty array when input is empty"

## Output Format
For each test file, use this format:

### File: path/to/file.test.ts
\`\`\`typescript
// Your test code here
\`\`\`

Explanation: Brief explanation of what tests were added and why.

## Completion
When you have completed writing tests, include [TASK_COMPLETE] in your response along with:
1. Summary of all test files created
2. Total number of test cases
3. Categories of tests covered (unit, integration, edge cases, etc.)
4. Coverage goals achieved`;
class TesterAgent extends BaseAgentRunner {
  /**
   * Get the agent type identifier
   */
  getAgentType() {
    return "tester";
  }
  /**
   * Execute a testing task
   *
   * @param task - The task to implement tests for
   * @param context - Execution context with working directory and files
   * @returns Task execution result
   */
  async execute(task, context) {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }
  /**
   * Get the system prompt for the tester agent
   */
  getSystemPrompt() {
    return TESTER_SYSTEM_PROMPT;
  }
  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task to implement tests for
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  buildTaskPrompt(task, context) {
    const sections = [];
    sections.push(`# Testing Task: ${task.name}`);
    sections.push("");
    sections.push("## Description");
    sections.push(task.description || "Write comprehensive tests for the implementation.");
    sections.push("");
    if (task.files && task.files.length > 0) {
      sections.push("## Files to Test");
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
        const testFile = this.suggestTestFileName(f);
        sections.push(`  - Test file: ${testFile}`);
      });
      sections.push("");
    }
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push("## Test Requirements");
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push("");
    }
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push("## Dependencies");
      sections.push("This task depends on the following tasks being completed:");
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push("");
    }
    if (task.estimatedMinutes) {
      sections.push(`## Time Estimate`);
      sections.push(`This task should take approximately ${task.estimatedMinutes} minutes.`);
      sections.push("");
    }
    sections.push(this.buildContextSection(context));
    sections.push("");
    sections.push("## Testing Instructions");
    sections.push("1. Analyze the code to understand its functionality");
    sections.push("2. Identify key scenarios to test (happy path, edge cases, errors)");
    sections.push("3. Write comprehensive tests using the project's test framework");
    sections.push("4. Include mocks/stubs for external dependencies");
    sections.push("5. Ensure all test criteria are covered");
    sections.push("");
    sections.push("When complete, include [TASK_COMPLETE] in your response with a test summary.");
    return sections.join("\n");
  }
  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  isTaskComplete(response, _task) {
    const lowerResponse = response.toLowerCase();
    if (response.includes("[TASK_COMPLETE]")) {
      return true;
    }
    const completionPhrases = [
      "tests complete",
      "test implementation complete",
      "all tests have been written",
      "testing is complete",
      "test coverage complete",
      "tests are ready",
      "test suite is complete"
    ];
    return completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }
  /**
   * Override continuation prompt for tester-specific guidance
   */
  getContinuationPrompt() {
    return `Please continue writing tests.
If you need to add more test cases, provide them in the same format.
If you have completed all tests, include [TASK_COMPLETE] with a summary of:
1. All test files created
2. Number of test cases per file
3. Test categories covered (unit, integration, edge cases)
4. Any test scenarios that still need coverage`;
  }
  /**
   * Suggest a test file name based on the source file
   *
   * @param sourceFile - The source file path
   * @returns Suggested test file path
   */
  suggestTestFileName(sourceFile) {
    if (sourceFile.endsWith(".ts") && !sourceFile.endsWith(".test.ts")) {
      return sourceFile.replace(/\.ts$/, ".test.ts");
    }
    if (sourceFile.endsWith(".tsx") && !sourceFile.endsWith(".test.tsx")) {
      return sourceFile.replace(/\.tsx$/, ".test.tsx");
    }
    if (sourceFile.endsWith(".js") && !sourceFile.endsWith(".test.js")) {
      return sourceFile.replace(/\.js$/, ".test.js");
    }
    if (sourceFile.endsWith(".jsx") && !sourceFile.endsWith(".test.jsx")) {
      return sourceFile.replace(/\.jsx$/, ".test.jsx");
    }
    const lastDotIndex = sourceFile.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return `${sourceFile.slice(0, lastDotIndex)}.test${sourceFile.slice(lastDotIndex)}`;
    }
    return `${sourceFile}.test`;
  }
}
const REVIEWER_SYSTEM_PROMPT = `You are a senior code reviewer with expertise in security, performance, and software architecture. Your job is to thoroughly review code changes and provide actionable feedback.

## Review Criteria

### 1. Security (Priority: Critical)
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication and authorization issues
- Sensitive data exposure
- Insecure configurations
- Input validation gaps

### 2. Correctness (Priority: Major)
- Logic errors and edge cases
- Off-by-one errors
- Null/undefined handling
- Type safety issues
- Race conditions

### 3. Performance (Priority: Major)
- N+1 query patterns
- Memory leaks
- Unnecessary computations
- Missing caching opportunities
- Inefficient algorithms

### 4. Maintainability (Priority: Minor)
- Code complexity (functions too long, nested too deep)
- Naming clarity
- Code duplication
- Missing documentation
- Inconsistent patterns

### 5. Style (Priority: Suggestion)
- Code formatting
- Import organization
- Consistent conventions

## Review Process
1. Analyze the code changes in context
2. Identify issues by category
3. Prioritize by severity
4. Provide specific, actionable suggestions
5. Note positive patterns worth keeping

## Output Format
Provide your review in JSON format:
\`\`\`json
{
  "approved": true/false,
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "security|performance|maintainability|correctness|style",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Clear description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": ["General improvement suggestions"],
  "summary": "Brief summary of the review"
}
\`\`\`

## Approval Rules
- Set approved=false if there are ANY critical issues
- Set approved=false if there are more than 2 major issues
- Set approved=true only if the code is production-ready
- Include [TASK_COMPLETE] when review is finished

## Best Practices
- Be specific and cite line numbers when possible
- Explain WHY something is an issue, not just WHAT
- Provide concrete code examples for fixes
- Acknowledge good patterns and clean code
- Focus on issues that matter most first`;
class ReviewerAgent extends BaseAgentRunner {
  /**
   * Get the agent type identifier
   */
  getAgentType() {
    return "reviewer";
  }
  /**
   * Execute a code review task
   *
   * @param task - The task containing code to review
   * @param context - Execution context with working directory and files
   * @returns Task execution result with review output
   */
  async execute(task, context) {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }
  /**
   * Get the system prompt for the reviewer agent
   */
  getSystemPrompt() {
    return REVIEWER_SYSTEM_PROMPT;
  }
  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task containing code to review
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  buildTaskPrompt(task, context) {
    const sections = [];
    sections.push(`# Code Review Task: ${task.name}`);
    sections.push("");
    sections.push("## Review Objective");
    sections.push(task.description || "Review the code changes for issues and improvements.");
    sections.push("");
    if (task.files && task.files.length > 0) {
      sections.push("## Files to Review");
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push("");
    }
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push("## Review Criteria");
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push("");
    }
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push("## Related Tasks");
      sections.push("This review is related to the following tasks:");
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push("");
    }
    sections.push(this.buildContextSection(context));
    sections.push("");
    sections.push("## Review Instructions");
    sections.push("1. Analyze the code changes thoroughly");
    sections.push("2. Check for security vulnerabilities");
    sections.push("3. Evaluate performance implications");
    sections.push("4. Assess code maintainability");
    sections.push("5. Verify correctness and edge case handling");
    sections.push("6. Check for style consistency");
    sections.push("");
    sections.push("Provide your review in the JSON format specified in the system prompt.");
    sections.push("When complete, include [TASK_COMPLETE] with your review summary.");
    return sections.join("\n");
  }
  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  isTaskComplete(response, _task) {
    const lowerResponse = response.toLowerCase();
    if (response.includes("[TASK_COMPLETE]")) {
      return true;
    }
    const completionPhrases = [
      "review complete",
      "code review complete",
      "review is complete",
      "review has been completed",
      "finished reviewing",
      "review summary:"
    ];
    const hasJsonReview = response.includes('"approved"') && response.includes('"summary"');
    return hasJsonReview || completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }
  /**
   * Override continuation prompt for reviewer-specific guidance
   */
  getContinuationPrompt() {
    return `Please continue with your review analysis.
If you need to examine more files or details, describe what you're looking at.
If you have completed the review, provide the JSON output and include [TASK_COMPLETE] with:
1. Your approval decision (approved: true/false)
2. All identified issues with severity levels
3. A summary of your findings`;
  }
  /**
   * Parse the review output from the LLM response
   *
   * @param output - Raw LLM output containing review JSON
   * @returns Parsed review output or null if parsing fails
   */
  parseReviewOutput(output) {
    if (!output) {
      return null;
    }
    try {
      const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/) || output.match(/```\s*([\s\S]*?)\s*```/) || output.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        return null;
      }
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        approved: parsed.approved === true,
        issues: Array.isArray(parsed.issues) ? parsed.issues.map((i) => ({
          severity: i.severity ?? "minor",
          category: i.category ?? "maintainability",
          file: i.file ?? "unknown",
          line: i.line,
          message: i.message ?? "No message",
          suggestion: i.suggestion
        })) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s) => typeof s === "string") : [],
        summary: parsed.summary ?? "No summary provided"
      };
    } catch {
      return null;
    }
  }
  /**
   * Get the count of issues by severity
   *
   * @param issues - Array of review issues
   * @returns Object with counts by severity
   */
  getIssueCounts(issues) {
    const counts = {
      critical: 0,
      major: 0,
      minor: 0,
      suggestion: 0
    };
    for (const issue of issues) {
      counts[issue.severity]++;
    }
    return counts;
  }
  /**
   * Determine if review should approve based on issue counts
   * Uses stricter criteria than LLM might apply
   *
   * @param issues - Array of review issues
   * @returns True if should approve, false otherwise
   */
  shouldApprove(issues) {
    const counts = this.getIssueCounts(issues);
    if (counts.critical > 0) {
      return false;
    }
    if (counts.major > 2) {
      return false;
    }
    return true;
  }
}
const MERGER_SYSTEM_PROMPT = `You are an expert software engineer specializing in merge conflict resolution. Your job is to analyze merge conflicts, understand the intent of both sets of changes, and propose safe resolutions.

## Analysis Approach

### 1. Understand Context
- Identify what each branch was trying to accomplish
- Look at commit messages and related changes
- Consider the broader feature or fix being implemented

### 2. Conflict Classification
Classify each conflict by type and severity:

**Conflict Types:**
- content: Same lines modified differently
- rename: File renamed in different ways
- delete-modify: Deleted in one branch, modified in another
- semantic: Logic conflicts without git markers
- dependency: Package or import conflicts

**Severity Levels:**
- simple: Straightforward resolution (formatting, imports, non-overlapping logic)
- moderate: Requires careful analysis but clear resolution path
- complex: Multiple valid resolutions, needs deep understanding
- critical: Potential for breaking changes, needs human review

### 3. Resolution Strategies
- **ours**: Keep the current branch's version
- **theirs**: Accept the incoming branch's version
- **merge**: Combine both changes intelligently
- **manual**: Escalate to human for review

## Safety Rules

1. **NEVER** automatically resolve critical conflicts
2. **NEVER** resolve semantic conflicts without thorough analysis
3. **ALWAYS** flag delete-modify conflicts for review
4. **ALWAYS** preserve both sets of tests when merging test files
5. When in doubt, flag for human review

## Output Format
Provide your analysis in JSON format:
\`\`\`json
{
  "success": true/false,
  "conflicts": [
    {
      "file": "path/to/file.ts",
      "type": "content|rename|delete-modify|semantic|dependency",
      "severity": "simple|moderate|complex|critical",
      "description": "Clear description of the conflict",
      "ourChanges": "Summary of our changes",
      "theirChanges": "Summary of their changes",
      "suggestedResolution": "How to resolve this",
      "needsManualReview": true/false
    }
  ],
  "resolutions": [
    {
      "file": "path/to/file.ts",
      "strategy": "ours|theirs|merge|manual",
      "resolvedContent": "The merged content (if applicable)",
      "explanation": "Why this resolution was chosen"
    }
  ],
  "unresolvedCount": 0,
  "summary": "Overall merge analysis summary",
  "requiresHumanReview": true/false
}
\`\`\`

## Process
1. Parse all conflict markers in affected files
2. Classify each conflict by type and severity
3. Analyze the intent of both change sets
4. Propose resolutions for simple/moderate conflicts
5. Flag complex/critical conflicts for human review
6. Verify the merged result makes sense as a whole
7. Include [TASK_COMPLETE] when analysis is done

## Best Practices
- Consider the overall coherence of the merged code
- Check for semantic conflicts even where git didn't flag markers
- Preserve important changes from both branches when possible
- Be conservative - it's better to ask for human review than to break code
- Document your reasoning for each resolution`;
class MergerAgent extends BaseAgentRunner {
  /**
   * Get the agent type identifier
   */
  getAgentType() {
    return "merger";
  }
  /**
   * Execute a merge conflict resolution task
   *
   * @param task - The task containing merge conflict information
   * @param context - Execution context with working directory and files
   * @returns Task execution result with merge output
   */
  async execute(task, context) {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }
  /**
   * Get the system prompt for the merger agent
   */
  getSystemPrompt() {
    return MERGER_SYSTEM_PROMPT;
  }
  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task containing merge information
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  buildTaskPrompt(task, context) {
    const sections = [];
    sections.push(`# Merge Conflict Resolution: ${task.name}`);
    sections.push("");
    sections.push("## Merge Context");
    sections.push(task.description || "Resolve merge conflicts between branches.");
    sections.push("");
    if (task.files && task.files.length > 0) {
      sections.push("## Files with Conflicts");
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push("");
    }
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push("## Merge Requirements");
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push("");
    }
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push("## Related Tasks");
      sections.push("These tasks may provide context for the merge:");
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push("");
    }
    sections.push(this.buildContextSection(context));
    sections.push("");
    sections.push("## Resolution Instructions");
    sections.push("1. Analyze all conflict markers in the affected files");
    sections.push("2. Classify each conflict by type and severity");
    sections.push("3. Understand the intent of both sets of changes");
    sections.push("4. Propose safe resolutions for simple/moderate conflicts");
    sections.push("5. Flag complex/critical conflicts for human review");
    sections.push("6. Verify the merged result maintains code coherence");
    sections.push("");
    sections.push("Provide your analysis in the JSON format specified in the system prompt.");
    sections.push("When complete, include [TASK_COMPLETE] with your merge summary.");
    return sections.join("\n");
  }
  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  isTaskComplete(response, _task) {
    const lowerResponse = response.toLowerCase();
    if (response.includes("[TASK_COMPLETE]")) {
      return true;
    }
    const completionPhrases = [
      "merge complete",
      "merge analysis complete",
      "conflict resolution complete",
      "resolution complete",
      "merge is complete",
      "finished resolving",
      "conflicts resolved"
    ];
    const hasJsonMerge = response.includes('"success"') && response.includes('"conflicts"');
    return hasJsonMerge || completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }
  /**
   * Override continuation prompt for merger-specific guidance
   */
  getContinuationPrompt() {
    return `Please continue with your merge analysis.
If you need to examine more files or conflict details, describe what you're analyzing.
If you have completed the analysis, provide the JSON output and include [TASK_COMPLETE] with:
1. All identified conflicts with classifications
2. Proposed resolutions for each
3. Which conflicts require human review
4. A summary of the merge state`;
  }
  /**
   * Parse the merge output from the LLM response
   *
   * @param output - Raw LLM output containing merge JSON
   * @returns Parsed merge output or null if parsing fails
   */
  parseMergeOutput(output) {
    if (!output) {
      return null;
    }
    try {
      const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/) || output.match(/```\s*([\s\S]*?)\s*```/) || output.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        return null;
      }
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        success: parsed.success === true,
        conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts.map((c) => ({
          file: c.file ?? "unknown",
          type: c.type ?? "content",
          severity: c.severity ?? "moderate",
          description: c.description ?? "No description",
          ourChanges: c.ourChanges ?? "",
          theirChanges: c.theirChanges ?? "",
          suggestedResolution: c.suggestedResolution,
          needsManualReview: c.needsManualReview ?? false
        })) : [],
        resolutions: Array.isArray(parsed.resolutions) ? parsed.resolutions.map((r) => ({
          file: r.file ?? "unknown",
          strategy: r.strategy ?? "manual",
          resolvedContent: r.resolvedContent,
          explanation: r.explanation ?? "No explanation"
        })) : [],
        unresolvedCount: parsed.unresolvedCount ?? 0,
        summary: parsed.summary ?? "No summary provided",
        requiresHumanReview: parsed.requiresHumanReview ?? false
      };
    } catch {
      return null;
    }
  }
  /**
   * Get the count of conflicts by severity
   *
   * @param conflicts - Array of merge conflicts
   * @returns Object with counts by severity
   */
  getConflictCounts(conflicts) {
    const counts = {
      simple: 0,
      moderate: 0,
      complex: 0,
      critical: 0
    };
    for (const conflict of conflicts) {
      counts[conflict.severity]++;
    }
    return counts;
  }
  /**
   * Get the count of conflicts by type
   *
   * @param conflicts - Array of merge conflicts
   * @returns Object with counts by type
   */
  getConflictsByType(conflicts) {
    const counts = {
      content: 0,
      rename: 0,
      "delete-modify": 0,
      semantic: 0,
      dependency: 0
    };
    for (const conflict of conflicts) {
      counts[conflict.type]++;
    }
    return counts;
  }
  /**
   * Determine if merge can be auto-completed based on conflicts
   *
   * @param conflicts - Array of merge conflicts
   * @returns True if merge can be auto-completed, false if human review needed
   */
  canAutoComplete(conflicts) {
    const counts = this.getConflictCounts(conflicts);
    if (counts.critical > 0 || counts.complex > 0) {
      return false;
    }
    if (conflicts.some((c) => c.needsManualReview)) {
      return false;
    }
    if (conflicts.some((c) => c.type === "delete-modify")) {
      return false;
    }
    return true;
  }
  /**
   * Get files that need human review
   *
   * @param conflicts - Array of merge conflicts
   * @returns Array of file paths needing human review
   */
  getFilesNeedingReview(conflicts) {
    return conflicts.filter((c) => c.needsManualReview || c.severity === "critical" || c.severity === "complex").map((c) => c.file);
  }
  /**
   * Summarize the merge state for human review
   *
   * @param output - Parsed merge output
   * @returns Human-readable summary
   */
  summarizeMerge(output) {
    const lines = [];
    lines.push(`Merge Status: ${output.success ? "Success" : "Needs Attention"}`);
    lines.push(`Total Conflicts: ${output.conflicts.length}`);
    lines.push(`Unresolved: ${output.unresolvedCount}`);
    if (output.requiresHumanReview) {
      lines.push("");
      lines.push("HUMAN REVIEW REQUIRED:");
      const reviewFiles = this.getFilesNeedingReview(output.conflicts);
      reviewFiles.forEach((f) => {
        lines.push(`  - ${f}`);
      });
    }
    const counts = this.getConflictCounts(output.conflicts);
    lines.push("");
    lines.push("Conflict Breakdown:");
    lines.push(`  Simple: ${counts.simple}`);
    lines.push(`  Moderate: ${counts.moderate}`);
    lines.push(`  Complex: ${counts.complex}`);
    lines.push(`  Critical: ${counts.critical}`);
    lines.push("");
    lines.push(`Summary: ${output.summary}`);
    return lines.join("\n");
  }
}
class PoolCapacityError extends Error {
  constructor(agentType, max) {
    super(`Agent pool at capacity for type '${agentType}' (max: ${max})`);
    this.name = "PoolCapacityError";
    Object.setPrototypeOf(this, PoolCapacityError.prototype);
  }
}
class AgentNotFoundError extends Error {
  constructor(agentId) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
    Object.setPrototypeOf(this, AgentNotFoundError.prototype);
  }
}
class NoRunnerError extends Error {
  constructor(agentType) {
    super(`No runner available for agent type: ${agentType}`);
    this.name = "NoRunnerError";
    Object.setPrototypeOf(this, NoRunnerError.prototype);
  }
}
const DEFAULT_MAX_AGENTS = {
  planner: 1,
  coder: 4,
  tester: 2,
  reviewer: 2,
  merger: 1
};
const DEFAULT_MODEL_CONFIG = {
  provider: "anthropic",
  model: DEFAULT_CLAUDE_MODEL,
  // claude-sonnet-4-5-20250929
  maxTokens: 8192,
  temperature: 0.3
};
class AgentPool {
  /** Active agents in the pool */
  agents = /* @__PURE__ */ new Map();
  /** Agent runners by type */
  runners;
  /** Maximum agents by type */
  maxAgentsByType;
  /** Default model configuration */
  defaultModelConfig;
  /** Event bus for observability */
  eventBus;
  /** LLM clients (API or CLI) */
  claudeClient;
  geminiClient;
  /**
   * Create a new AgentPool
   *
   * @param config - Pool configuration including LLM clients
   */
  constructor(config) {
    this.claudeClient = config.claudeClient;
    this.geminiClient = config.geminiClient;
    this.eventBus = EventBus.getInstance();
    this.defaultModelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...config.defaultModelConfig
    };
    this.runners = /* @__PURE__ */ new Map([
      ["coder", new CoderAgent(this.claudeClient)],
      ["tester", new TesterAgent(this.claudeClient)],
      ["reviewer", new ReviewerAgent(this.geminiClient)],
      ["merger", new MergerAgent(this.claudeClient)]
    ]);
    this.maxAgentsByType = new Map(
      Object.entries({
        ...DEFAULT_MAX_AGENTS,
        ...config.maxAgentsByType
      })
    );
  }
  // ============================================================================
  // IAgentPool Interface Implementation
  // ============================================================================
  /**
   * Spawn a new agent of the given type
   *
   * @param type - Type of agent to spawn
   * @returns The spawned agent
   * @throws PoolCapacityError if pool is at capacity for this type
   */
  spawn(type) {
    const currentCount = this.getAgentCountByType(type);
    const maxCount = this.maxAgentsByType.get(type) ?? DEFAULT_MAX_AGENTS[type];
    if (currentCount >= maxCount) {
      throw new PoolCapacityError(type, maxCount);
    }
    const now = /* @__PURE__ */ new Date();
    const agent = {
      id: nanoid(),
      type,
      status: "idle",
      modelConfig: { ...this.defaultModelConfig },
      metrics: this.createEmptyMetrics(),
      spawnedAt: now,
      lastActiveAt: now
    };
    this.agents.set(agent.id, agent);
    void this.eventBus.emit("agent:spawned", {
      agent
    });
    return agent;
  }
  /**
   * Terminate an agent and remove from pool
   *
   * @param agentId - ID of agent to terminate
   */
  terminate(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    agent.status = "terminated";
    this.agents.delete(agentId);
    void this.eventBus.emit("agent:terminated", {
      agentId,
      reason: "manual",
      metrics: agent.metrics
    });
  }
  /**
   * Assign an agent to a task
   *
   * @param agentId - ID of agent to assign
   * @param taskId - ID of task to assign
   * @param worktreePath - Optional worktree path for the agent
   */
  assign(agentId, taskId, worktreePath) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    agent.status = "assigned";
    agent.currentTaskId = taskId;
    agent.worktreePath = worktreePath;
    agent.lastActiveAt = /* @__PURE__ */ new Date();
  }
  /**
   * Release an agent from its current task
   *
   * @param agentId - ID of agent to release
   */
  release(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    agent.status = "idle";
    agent.currentTaskId = void 0;
    agent.worktreePath = void 0;
    agent.lastActiveAt = /* @__PURE__ */ new Date();
    void this.eventBus.emit("agent:idle", {
      agentId,
      idleSince: /* @__PURE__ */ new Date()
    });
  }
  /**
   * Get all agents in the pool
   */
  getAll() {
    return Array.from(this.agents.values());
  }
  /**
   * Get all active (non-idle) agents
   */
  getActive() {
    return this.getAll().filter(
      (agent) => agent.status === "assigned" || agent.status === "working"
    );
  }
  /**
   * Get an available (idle) agent of any type
   */
  getAvailable() {
    return this.getAll().find((agent) => agent.status === "idle");
  }
  /**
   * Get an agent by ID
   *
   * @param agentId - ID of agent to get
   */
  getById(agentId) {
    return this.agents.get(agentId);
  }
  /**
   * Get current pool size
   */
  size() {
    return this.agents.size;
  }
  // ============================================================================
  // Extended Methods
  // ============================================================================
  /**
   * Get an available agent of a specific type
   *
   * @param type - Type of agent to get
   * @returns Available agent or undefined
   */
  getAvailableByType(type) {
    return this.getAll().find(
      (agent) => agent.type === type && agent.status === "idle"
    );
  }
  /**
   * Run a task with a specific agent
   *
   * @param agent - The agent to use
   * @param task - The task to execute
   * @param context - Execution context
   * @returns Task execution result
   */
  async runTask(agent, task, context) {
    const runner = this.runners.get(agent.type);
    if (!runner) {
      throw new NoRunnerError(agent.type);
    }
    const existingAgent = this.agents.get(agent.id);
    if (!existingAgent) {
      throw new AgentNotFoundError(agent.id);
    }
    existingAgent.status = "working";
    existingAgent.currentTaskId = task.id;
    existingAgent.lastActiveAt = /* @__PURE__ */ new Date();
    const startTime = Date.now();
    try {
      const result = await runner.execute(task, {
        taskId: task.id,
        featureId: task.featureId ?? "",
        projectId: task.projectId ?? "",
        workingDir: context.workingDir,
        relevantFiles: context.relevantFiles,
        previousAttempts: context.previousAttempts
      });
      this.updateAgentMetrics(existingAgent, result, startTime);
      return result;
    } catch (error) {
      existingAgent.metrics.tasksFailed++;
      existingAgent.metrics.totalTimeActive += Date.now() - startTime;
      void this.eventBus.emit("agent:error", {
        agentId: agent.id,
        error: error instanceof Error ? error.message : "Unknown error",
        recoverable: false
      });
      throw error;
    } finally {
      existingAgent.status = "idle";
      existingAgent.currentTaskId = void 0;
      existingAgent.lastActiveAt = /* @__PURE__ */ new Date();
    }
  }
  /**
   * Get the pool status
   */
  getPoolStatus() {
    const byType = {
      planner: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get("planner") ?? 1 },
      coder: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get("coder") ?? 4 },
      tester: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get("tester") ?? 2 },
      reviewer: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get("reviewer") ?? 2 },
      merger: { total: 0, active: 0, idle: 0, max: this.maxAgentsByType.get("merger") ?? 1 }
    };
    let tasksInProgress = 0;
    for (const agent of this.agents.values()) {
      byType[agent.type].total++;
      if (agent.status === "working" || agent.status === "assigned") {
        byType[agent.type].active++;
        if (agent.currentTaskId) {
          tasksInProgress++;
        }
      } else if (agent.status === "idle") {
        byType[agent.type].idle++;
      }
    }
    return {
      totalAgents: this.agents.size,
      byType,
      tasksInProgress
    };
  }
  /**
   * Terminate all agents in the pool
   */
  terminateAll() {
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      this.terminate(agentId);
    }
    return Promise.resolve();
  }
  /**
   * Get aggregated metrics for all agents
   */
  getAggregatedMetrics() {
    const metrics2 = this.createEmptyMetrics();
    for (const agent of this.agents.values()) {
      metrics2.tasksCompleted += agent.metrics.tasksCompleted;
      metrics2.tasksFailed += agent.metrics.tasksFailed;
      metrics2.totalIterations += agent.metrics.totalIterations;
      metrics2.totalTokensUsed += agent.metrics.totalTokensUsed;
      metrics2.totalTimeActive += agent.metrics.totalTimeActive;
    }
    const totalTasks = metrics2.tasksCompleted + metrics2.tasksFailed;
    metrics2.averageIterationsPerTask = totalTasks > 0 ? metrics2.totalIterations / totalTasks : 0;
    return metrics2;
  }
  /**
   * Check if pool has capacity for a specific agent type
   *
   * @param type - Agent type to check
   */
  hasCapacity(type) {
    const current = this.getAgentCountByType(type);
    const max = this.maxAgentsByType.get(type) ?? DEFAULT_MAX_AGENTS[type];
    return current < max;
  }
  /**
   * Get the runner for a specific agent type
   *
   * @param type - Agent type
   * @returns The runner or undefined
   */
  getRunner(type) {
    return this.runners.get(type);
  }
  // ============================================================================
  // Private Helpers
  // ============================================================================
  /**
   * Get count of agents by type
   */
  getAgentCountByType(type) {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.type === type) {
        count++;
      }
    }
    return count;
  }
  /**
   * Create empty metrics object
   */
  createEmptyMetrics() {
    return {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalIterations: 0,
      averageIterationsPerTask: 0,
      totalTokensUsed: 0,
      totalTimeActive: 0
    };
  }
  /**
   * Update agent metrics after task execution
   */
  updateAgentMetrics(agent, result, startTime) {
    const duration = Date.now() - startTime;
    if (result.success) {
      agent.metrics.tasksCompleted++;
    } else {
      agent.metrics.tasksFailed++;
    }
    const iterations = result.metrics?.iterations ?? 1;
    agent.metrics.totalIterations += iterations;
    const tokens = result.metrics?.tokensUsed ?? 0;
    agent.metrics.totalTokensUsed += tokens;
    agent.metrics.totalTimeActive += duration;
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    agent.metrics.averageIterationsPerTask = totalTasks > 0 ? agent.metrics.totalIterations / totalTasks : 0;
  }
}
const DEFAULT_BUILD_CONFIG = {
  timeout: 6e4,
  tsconfigPath: "tsconfig.json",
  useProjectReferences: false,
  additionalArgs: []
};
class BuildRunner {
  config;
  currentIteration = 0;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_BUILD_CONFIG,
      ...config
    };
  }
  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration) {
    this.currentIteration = iteration;
  }
  /**
   * Run TypeScript compilation check
   *
   * Spawns tsc with --noEmit to perform type checking without emitting files.
   * Parses the output to extract errors and warnings in structured format.
   *
   * @param workingDir - Directory containing the TypeScript project
   * @returns BuildResult with success status and parsed errors/warnings
   */
  async run(workingDir) {
    const startTime = Date.now();
    return new Promise((resolve2) => {
      const args = this.buildTscArgs();
      const proc = spawn("npx", args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (code) => {
        const output = stdout + stderr;
        const errors = this.parseErrors(output);
        const warnings = this.parseWarnings(output);
        resolve2({
          success: code === 0,
          errors,
          warnings,
          duration: Date.now() - startTime
        });
      });
      proc.on("error", (err) => {
        resolve2({
          success: false,
          errors: [
            this.createErrorEntry(
              `Failed to spawn TypeScript compiler: ${err.message}`,
              "error",
              "SPAWN_ERROR"
            )
          ],
          warnings: [],
          duration: Date.now() - startTime
        });
      });
    });
  }
  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the TypeScript project
   * @returns Function that takes taskId and optional workingDir, returns Promise<BuildResult>
   */
  createCallback(defaultWorkingDir) {
    return async (_taskId, workingDir) => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir);
    };
  }
  /**
   * Build the tsc command arguments
   */
  buildTscArgs() {
    const args = [
      "tsc",
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      this.config.tsconfigPath
    ];
    if (this.config.useProjectReferences) {
      args.push("--build");
    }
    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }
    return args;
  }
  /**
   * Parse TypeScript error output into structured ErrorEntry array
   *
   * TypeScript error format:
   * - Pretty=false: src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
   * - Also handles: file(line,col): error TSxxxx: message
   *
   * @param output - Raw output from tsc process
   * @returns Array of parsed ErrorEntry objects
   */
  parseErrors(output) {
    const errors = [];
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm;
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
      errors.push(
        this.createErrorEntry(
          match[5],
          // message
          "error",
          match[4],
          // TS error code
          match[1],
          // file
          parseInt(match[2], 10),
          // line
          parseInt(match[3], 10)
          // column
        )
      );
    }
    return errors;
  }
  /**
   * Parse TypeScript warning output into structured ErrorEntry array
   *
   * TypeScript typically doesn't emit warnings (uses strict mode errors instead),
   * but we check for them in case of custom configurations.
   *
   * @param output - Raw output from tsc process
   * @returns Array of parsed ErrorEntry objects with 'warning' severity
   */
  parseWarnings(output) {
    const warnings = [];
    const warningRegex = /^(.+?)\((\d+),(\d+)\):\s*warning\s+(TS\d+):\s*(.+)$/gm;
    let match;
    while ((match = warningRegex.exec(output)) !== null) {
      warnings.push(
        this.createErrorEntry(
          match[5],
          "warning",
          match[4],
          match[1],
          parseInt(match[2], 10),
          parseInt(match[3], 10)
        )
      );
    }
    return warnings;
  }
  /**
   * Create a structured ErrorEntry object
   */
  createErrorEntry(message, severity, code, file, line, column) {
    return {
      type: "build",
      severity,
      message,
      file,
      line,
      column,
      code,
      iteration: this.currentIteration
    };
  }
}
const DEFAULT_LINT_CONFIG = {
  timeout: 12e4,
  autoFix: false,
  extensions: [".ts", ".tsx"],
  additionalArgs: [],
  maxWarnings: -1
};
class LintRunner {
  config;
  currentIteration = 0;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_LINT_CONFIG,
      ...config
    };
  }
  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration) {
    this.currentIteration = iteration;
  }
  /**
   * Run ESLint check
   *
   * Spawns eslint with JSON output format to get structured results.
   * Parses the output to extract errors and warnings in structured format.
   *
   * @param workingDir - Directory containing the project to lint
   * @param fix - Whether to apply fixes (overrides config)
   * @returns LintResult with success status and parsed errors/warnings
   */
  async run(workingDir, fix) {
    const shouldFix = fix ?? this.config.autoFix;
    return new Promise((resolve2) => {
      const args = this.buildEslintArgs(shouldFix);
      const proc = spawn("npx", args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout
      });
      let stdout = "";
      let _stderr = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        _stderr += data.toString();
      });
      proc.on("close", (_code) => {
        const parsed = this.parseJsonOutput(stdout);
        const fixable = parsed.fixableErrors + parsed.fixableWarnings;
        resolve2({
          success: parsed.errors.length === 0,
          errors: parsed.errors,
          warnings: parsed.warnings,
          fixable
        });
      });
      proc.on("error", (err) => {
        resolve2({
          success: false,
          errors: [
            this.createErrorEntry(
              `Failed to spawn ESLint: ${err.message}`,
              "error",
              "SPAWN_ERROR"
            )
          ],
          warnings: [],
          fixable: 0
        });
      });
    });
  }
  /**
   * Run ESLint with auto-fix enabled
   *
   * @param workingDir - Directory containing the project to lint
   * @returns LintResult with success status and parsed errors/warnings
   */
  async runWithFix(workingDir) {
    return this.run(workingDir, true);
  }
  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the project to lint
   * @returns Function that takes taskId and optional workingDir, returns Promise<LintResult>
   */
  createCallback(defaultWorkingDir) {
    return async (_taskId, workingDir) => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir);
    };
  }
  /**
   * Build the eslint command arguments
   */
  buildEslintArgs(fix) {
    const args = ["eslint", "."];
    for (const ext of this.config.extensions) {
      args.push("--ext", ext);
    }
    if (fix) {
      args.push("--fix");
    }
    if (this.config.maxWarnings >= 0) {
      args.push("--max-warnings", String(this.config.maxWarnings));
    }
    args.push("--format", "json");
    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }
    return args;
  }
  /**
   * Parse ESLint JSON output into structured format
   *
   * ESLint JSON format is an array of file results, each containing
   * messages with severity (1 = warning, 2 = error).
   *
   * @param output - Raw JSON output from eslint
   * @returns Parsed errors, warnings, and fixable counts
   */
  parseJsonOutput(output) {
    const errors = [];
    const warnings = [];
    let fixableErrors = 0;
    let fixableWarnings = 0;
    let fixedCount = 0;
    try {
      const results = JSON.parse(output || "[]");
      for (const file of results) {
        if (file.output !== void 0) {
          fixedCount++;
        }
        fixableErrors += file.fixableErrorCount || 0;
        fixableWarnings += file.fixableWarningCount || 0;
        for (const msg of file.messages) {
          const entry = this.createErrorEntry(
            msg.message,
            msg.severity === 2 ? "error" : "warning",
            msg.ruleId || void 0,
            file.filePath,
            msg.line,
            msg.column,
            msg.fix !== void 0
          );
          if (msg.severity === 2) {
            errors.push(entry);
          } else {
            warnings.push(entry);
          }
        }
      }
    } catch {
      if (output.trim()) {
        errors.push(
          this.createErrorEntry(
            `ESLint output parse error: ${output.substring(0, 200)}`,
            "error",
            "PARSE_ERROR"
          )
        );
      }
    }
    return { errors, warnings, fixableErrors, fixableWarnings, fixedCount };
  }
  /**
   * Create a structured ErrorEntry object
   */
  createErrorEntry(message, severity, code, file, line, column, isFixable) {
    return {
      type: "lint",
      severity,
      message,
      file,
      line,
      column,
      code,
      suggestion: isFixable ? "This issue can be auto-fixed with --fix" : void 0,
      iteration: this.currentIteration
    };
  }
}
const DEFAULT_TEST_CONFIG = {
  timeout: 3e5,
  // 5 minutes
  coverage: false,
  testPattern: "",
  watch: false,
  reporter: "json",
  additionalArgs: []
};
class TestRunner {
  config;
  currentIteration = 0;
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_TEST_CONFIG,
      ...config
    };
  }
  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration) {
    this.currentIteration = iteration;
  }
  /**
   * Run all tests
   *
   * Spawns vitest run, captures output, and parses results.
   *
   * @param workingDir - Directory containing the test project
   * @returns TestResult with success status and parsed errors
   */
  async run(workingDir) {
    return this.executeVitest(workingDir, []);
  }
  /**
   * Run specific test files
   *
   * @param workingDir - Directory containing the test project
   * @param files - Array of file paths to test
   * @returns TestResult with success status and parsed errors
   */
  async runFiles(workingDir, files) {
    return this.executeVitest(workingDir, files);
  }
  /**
   * Run tests with coverage enabled
   *
   * @param workingDir - Directory containing the test project
   * @returns TestResult with coverage information
   */
  async runWithCoverage(workingDir) {
    const originalCoverage = this.config.coverage;
    this.config.coverage = true;
    const result = await this.executeVitest(workingDir, []);
    this.config.coverage = originalCoverage;
    return result;
  }
  /**
   * Run tests matching a pattern
   *
   * @param workingDir - Directory containing the test project
   * @param pattern - Test name pattern to match
   * @returns TestResult for matching tests
   */
  async runByPattern(workingDir, pattern) {
    const originalPattern = this.config.testPattern;
    this.config.testPattern = pattern;
    const result = await this.executeVitest(workingDir, []);
    this.config.testPattern = originalPattern;
    return result;
  }
  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the test project
   * @returns Function that takes taskId and optional workingDir, returns Promise<TestResult>
   */
  createCallback(defaultWorkingDir) {
    return async (_taskId, workingDir) => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir);
    };
  }
  /**
   * Execute vitest with specified options
   */
  async executeVitest(workingDir, files) {
    const startTime = Date.now();
    return new Promise((resolve2) => {
      const args = this.buildVitestArgs(files);
      const proc = spawn("npx", args, {
        cwd: workingDir,
        shell: true,
        timeout: this.config.timeout
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (code) => {
        const parsed = this.parseOutput(stdout, stderr);
        const duration = Date.now() - startTime;
        const combinedOutput = stdout + stderr;
        const vitestNotConfigured = code !== 0 && parsed.passed === 0 && parsed.failed === 0 && (combinedOutput.includes("vitest") && (combinedOutput.includes("not found") || combinedOutput.includes("Cannot find") || combinedOutput.includes("is not recognized") || combinedOutput.includes("command not found") || combinedOutput.includes("ENOENT") || combinedOutput.includes("No test files found")) || // No vitest config file
        combinedOutput.includes("no test files found") || combinedOutput.includes("No test files match"));
        if (vitestNotConfigured) {
          console.log("[TestRunner] Vitest not configured or no tests found - treating as success");
          resolve2({
            success: true,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [
              this.createErrorEntry(
                "Vitest not configured or no test files found - skipping tests",
                "warning",
                "VITEST_NOT_CONFIGURED"
              )
            ],
            duration
          });
          return;
        }
        const noTestsFound = parsed.passed === 0 && parsed.failed === 0 && code === 0;
        const allTestsPassed = code === 0 && parsed.failed === 0;
        const isSuccess = allTestsPassed || noTestsFound;
        resolve2({
          success: isSuccess,
          passed: parsed.passed,
          failed: parsed.failed,
          skipped: parsed.skipped,
          errors: parsed.errors,
          duration
        });
      });
      proc.on("error", (err) => {
        const duration = Date.now() - startTime;
        const errMsg = err.message.toLowerCase();
        const isNotFoundError = errMsg.includes("enoent") || errMsg.includes("not found") || errMsg.includes("command not found") || errMsg.includes("is not recognized");
        if (isNotFoundError) {
          console.log("[TestRunner] Vitest/npx not found - treating as success");
          resolve2({
            success: true,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [
              this.createErrorEntry(
                "Vitest not installed - skipping tests",
                "warning",
                "VITEST_NOT_INSTALLED"
              )
            ],
            duration
          });
          return;
        }
        resolve2({
          success: false,
          passed: 0,
          failed: 1,
          skipped: 0,
          errors: [
            this.createErrorEntry(
              `Failed to spawn Vitest: ${err.message}`,
              "error",
              "SPAWN_ERROR"
            )
          ],
          duration
        });
      });
    });
  }
  /**
   * Build the vitest command arguments
   */
  buildVitestArgs(files) {
    const args = ["vitest", "run"];
    if (this.config.reporter === "json") {
      args.push("--reporter=json");
    } else if (this.config.reporter === "verbose") {
      args.push("--reporter=verbose");
    }
    if (this.config.coverage) {
      args.push("--coverage");
      args.push("--coverage.reporter=json");
    }
    if (this.config.testPattern) {
      args.push("-t", this.config.testPattern);
    }
    if (files.length > 0) {
      args.push(...files);
    }
    if (this.config.additionalArgs.length > 0) {
      args.push(...this.config.additionalArgs);
    }
    return args;
  }
  /**
   * Parse vitest output into structured result
   *
   * Attempts JSON parsing first, falls back to regex parsing
   */
  parseOutput(stdout, stderr) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors = [];
    try {
      const jsonResult = this.parseJsonOutput(stdout);
      if (jsonResult) {
        return jsonResult;
      }
    } catch {
    }
    const output = stdout + stderr;
    const summaryMatch = output.match(
      /Tests?:\s*(?:(\d+)\s*passed)?[,\s]*(?:(\d+)\s*failed)?[,\s]*(?:(\d+)\s*skipped)?/i
    );
    if (summaryMatch) {
      passed = parseInt(summaryMatch[1] || "0", 10);
      failed = parseInt(summaryMatch[2] || "0", 10);
      skipped = parseInt(summaryMatch[3] || "0", 10);
    } else {
      const passMatch = output.match(/(\d+)\s*pass(?:ed|ing)?/i);
      const failMatch = output.match(/(\d+)\s*fail(?:ed|ing|ure)?/i);
      const skipMatch = output.match(/(\d+)\s*skip(?:ped)?/i);
      if (passMatch) passed = parseInt(passMatch[1], 10);
      if (failMatch) failed = parseInt(failMatch[1], 10);
      if (skipMatch) skipped = parseInt(skipMatch[1], 10);
    }
    const failureErrors = this.parseFailureDetails(output);
    errors.push(...failureErrors);
    const coverageResult = this.parseCoverage(output);
    return { passed, failed, skipped, errors, coverage: coverageResult };
  }
  /**
   * Parse JSON reporter output
   */
  parseJsonOutput(stdout) {
    const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    try {
      const json = JSON.parse(jsonMatch[0]);
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      const errors = [];
      let coverage;
      for (const file of json.testResults ?? []) {
        for (const test of file.assertionResults ?? []) {
          switch (test.status) {
            case "passed":
              passed++;
              break;
            case "failed":
              failed++;
              errors.push(
                this.createErrorEntry(
                  test.failureMessages?.join("\n") ?? `Test failed: ${test.fullName ?? test.title ?? "Unknown test"}`,
                  "error",
                  void 0,
                  file.name ?? "unknown",
                  void 0,
                  void 0,
                  test.failureMessages?.join("\n")
                )
              );
              break;
            case "skipped":
            case "pending":
            case "todo":
              skipped++;
              break;
          }
        }
      }
      const coverageData = json.coverageMap ?? json.coverage;
      if (coverageData) {
        coverage = {
          lines: coverageData.lines?.pct ?? coverageData.total?.lines?.pct ?? 0,
          branches: coverageData.branches?.pct ?? coverageData.total?.branches?.pct ?? 0,
          functions: coverageData.functions?.pct ?? coverageData.total?.functions?.pct ?? 0,
          statements: coverageData.statements?.pct ?? coverageData.total?.statements?.pct ?? 0
        };
      }
      return { passed, failed, skipped, errors, coverage };
    } catch {
      return null;
    }
  }
  /**
   * Parse failure details from output
   */
  parseFailureDetails(output) {
    const errors = [];
    const failFileRegex = /FAIL\s+(.+\.(?:test|spec)\.[jt]sx?)/g;
    let fileMatch;
    while ((fileMatch = failFileRegex.exec(output)) !== null) {
      const filePath = fileMatch[1];
      const errorDetailRegex = /[×✕]\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm;
      let errorMatch;
      while ((errorMatch = errorDetailRegex.exec(output)) !== null) {
        const testName = errorMatch[1].trim();
        if (!errors.some((e) => e.message.includes(testName))) {
          errors.push(
            this.createErrorEntry(
              `Test failed: ${testName}`,
              "error",
              void 0,
              filePath
            )
          );
        }
      }
    }
    const assertionRegex = /AssertionError:\s*(.+?)(?:\n|$)|expected\s+(.+?)\s+to\s+(?:equal|be|have)\s+(.+?)(?:\n|$)/gi;
    let assertMatch;
    while ((assertMatch = assertionRegex.exec(output)) !== null) {
      const message = assertMatch[1] || `Expected ${assertMatch[2]} to equal ${assertMatch[3]}`;
      if (!errors.some((e) => e.message.includes(message))) {
        errors.push(this.createErrorEntry(message, "error", "ASSERTION_ERROR"));
      }
    }
    return errors;
  }
  /**
   * Parse coverage information from output
   */
  parseCoverage(output) {
    const coverageRegex = /All\s+files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/i;
    const match = output.match(coverageRegex);
    if (match) {
      return {
        statements: parseFloat(match[1]),
        branches: parseFloat(match[2]),
        functions: parseFloat(match[3]),
        lines: parseFloat(match[4])
      };
    }
    return void 0;
  }
  /**
   * Create a structured ErrorEntry object
   */
  createErrorEntry(message, severity, code, file, line, column, stack) {
    return {
      type: "test",
      severity,
      message,
      file,
      line,
      column,
      code,
      suggestion: stack,
      iteration: this.currentIteration
    };
  }
}
const DEFAULT_REVIEW_CONFIG = {
  timeout: 12e4,
  maxDiffSize: 5e4,
  includeSuggestions: true,
  additionalCriteria: []
};
const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer with expertise in TypeScript, software architecture, and best practices.
Your task is to review code changes and provide constructive feedback.

## Review Criteria
1. **Correctness**: Does the code do what it's supposed to do?
2. **Bugs**: Are there any obvious bugs, edge cases not handled, or potential runtime errors?
3. **Security**: Are there any security vulnerabilities (injection, exposure, etc.)?
4. **Performance**: Are there any obvious performance issues (N+1 queries, unnecessary loops, etc.)?
5. **Maintainability**: Is the code clean, well-structured, and maintainable?
6. **Types**: Are TypeScript types properly used? Any 'any' types that should be avoided?
7. **Error Handling**: Is error handling appropriate and comprehensive?

## Response Format
You MUST respond with ONLY a valid JSON object (no markdown code blocks, no explanation before or after):
{
  "approved": true,
  "comments": ["comment1", "comment2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "blockers": ["blocker1"]
}

Rules:
- Set "approved" to false if there are ANY blockers
- "comments" are general observations about the code
- "suggestions" are non-blocking improvements that would be nice to have
- "blockers" are critical issues that MUST be fixed before the code can be approved
- All arrays can be empty if not applicable
- Keep feedback concise and actionable`;
class ReviewRunner {
  llmClient;
  gitService;
  config;
  currentIteration = 0;
  constructor(llmClient, gitService, config = {}) {
    this.llmClient = llmClient;
    this.gitService = gitService;
    this.config = {
      ...DEFAULT_REVIEW_CONFIG,
      ...config,
      additionalCriteria: config.additionalCriteria ?? []
    };
  }
  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration) {
    this.currentIteration = iteration;
  }
  /**
   * Run code review on the current git diff
   *
   * Retrieves the diff of uncommitted changes, sends it to Gemini for review,
   * and returns structured feedback compatible with RalphStyleIterator.
   *
   * @param workingDir - Directory containing the git repository
   * @param context - Optional context about the task being reviewed
   * @returns ReviewResult with approval status and feedback
   */
  async run(workingDir, context) {
    try {
      let diff = await this.gitService.diff({ staged: true });
      const unstagedDiff = await this.gitService.diff();
      if (unstagedDiff) {
        diff = diff ? `${diff}
${unstagedDiff}` : unstagedDiff;
      }
      if (!diff || diff.trim().length === 0) {
        return {
          approved: true,
          comments: ["No changes to review"],
          suggestions: [],
          blockers: []
        };
      }
      const truncatedDiff = this.truncateDiff(diff);
      const prompt = this.buildReviewPrompt(truncatedDiff, context);
      const response = await this.llmClient.chat([
        { role: "system", content: this.buildSystemPrompt() },
        { role: "user", content: prompt }
      ]);
      return this.parseReviewResponse(response.content);
    } catch (error) {
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: [
          `Review failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ]
      };
    }
  }
  /**
   * Review specific files instead of the full diff
   *
   * @param workingDir - Directory containing the git repository
   * @param files - Specific files to review
   * @param context - Optional context about the task
   * @returns ReviewResult with approval status and feedback
   */
  async reviewFiles(workingDir, files, context) {
    try {
      const fullDiff = await this.gitService.diff();
      if (!fullDiff || fullDiff.trim().length === 0) {
        return {
          approved: true,
          comments: ["No changes to review in specified files"],
          suggestions: [],
          blockers: []
        };
      }
      const filteredDiff = this.filterDiffByFiles(fullDiff, files);
      if (!filteredDiff || filteredDiff.trim().length === 0) {
        return {
          approved: true,
          comments: ["No changes to review in specified files"],
          suggestions: [],
          blockers: []
        };
      }
      const prompt = this.buildReviewPrompt(filteredDiff, context);
      const response = await this.llmClient.chat([
        { role: "system", content: this.buildSystemPrompt() },
        { role: "user", content: prompt }
      ]);
      return this.parseReviewResponse(response.content);
    } catch (error) {
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: [
          `Review failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ]
      };
    }
  }
  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the git repository
   * @param context - Optional static context for all reviews
   * @returns Function that takes taskId and optional workingDir, returns Promise<ReviewResult>
   */
  createCallback(defaultWorkingDir, context) {
    return async (taskId, workingDir) => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir, { ...context, taskId });
    };
  }
  /**
   * Build the full system prompt including additional criteria
   */
  buildSystemPrompt() {
    if (this.config.additionalCriteria.length === 0) {
      return REVIEW_SYSTEM_PROMPT;
    }
    const additionalCriteriaText = this.config.additionalCriteria.map((c, i) => `${i + 8}. ${c}`).join("\n");
    return REVIEW_SYSTEM_PROMPT.replace(
      "7. **Error Handling**: Is error handling appropriate and comprehensive?",
      `7. **Error Handling**: Is error handling appropriate and comprehensive?
${additionalCriteriaText}`
    );
  }
  /**
   * Build the review prompt from diff and context
   */
  buildReviewPrompt(diff, context) {
    let prompt = "## Code Changes to Review\n\n```diff\n" + diff + "\n```\n";
    if (context?.taskDescription) {
      prompt += `
## Task Description
${context.taskDescription}
`;
    }
    if (context?.acceptanceCriteria?.length) {
      prompt += `
## Acceptance Criteria
`;
      context.acceptanceCriteria.forEach((c, i) => {
        prompt += `${i + 1}. ${c}
`;
      });
    }
    if (context?.expectedFiles?.length) {
      prompt += `
## Expected Files to Modify
`;
      context.expectedFiles.forEach((f) => {
        prompt += `- ${f}
`;
      });
    }
    prompt += "\nPlease review these changes and provide your assessment in JSON format.";
    return prompt;
  }
  /**
   * Parse Gemini response into ReviewResult
   */
  parseReviewResponse(response) {
    try {
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
      const parsed = JSON.parse(jsonStr);
      return {
        approved: Boolean(parsed.approved),
        comments: Array.isArray(parsed.comments) ? parsed.comments.filter((c) => typeof c === "string") : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s) => typeof s === "string") : [],
        blockers: Array.isArray(parsed.blockers) ? parsed.blockers.filter((b) => typeof b === "string") : []
      };
    } catch {
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: ["Failed to parse review response. Raw response: " + response.substring(0, 200)]
      };
    }
  }
  /**
   * Truncate diff if it exceeds maximum size
   */
  truncateDiff(diff) {
    if (diff.length <= this.config.maxDiffSize) {
      return diff;
    }
    const truncated = diff.substring(0, this.config.maxDiffSize);
    const lastNewline = truncated.lastIndexOf("\n");
    return `${truncated.substring(0, lastNewline)}

... [DIFF TRUNCATED - showing first ${this.config.maxDiffSize} characters] ...`;
  }
  /**
   * Filter a diff to only include specific files
   */
  filterDiffByFiles(diff, files) {
    const fileChunks = diff.split(/(?=^diff --git)/m);
    const filteredChunks = fileChunks.filter((chunk) => {
      return files.some((file) => chunk.includes(file));
    });
    return filteredChunks.join("");
  }
  /**
   * Convert blockers to ErrorEntry format for error aggregation
   */
  blockersToErrors(blockers) {
    return blockers.map((blocker) => ({
      type: "review",
      severity: "error",
      message: blocker,
      iteration: this.currentIteration
    }));
  }
  /**
   * Convert suggestions to ErrorEntry format for tracking
   */
  suggestionsToWarnings(suggestions) {
    return suggestions.map((suggestion) => ({
      type: "review",
      severity: "warning",
      message: suggestion,
      iteration: this.currentIteration
    }));
  }
}
class GitError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class NotARepositoryError extends GitError {
  path;
  constructor(path2) {
    super(`Not a git repository: ${path2}`);
    this.name = "NotARepositoryError";
    this.path = path2;
  }
}
class BranchNotFoundError extends GitError {
  branch;
  constructor(branch) {
    super(`Branch not found: ${branch}`);
    this.name = "BranchNotFoundError";
    this.branch = branch;
  }
}
class CommitError extends GitError {
  reason;
  constructor(reason) {
    super(`Commit failed: ${reason}`);
    this.name = "CommitError";
    this.reason = reason;
  }
}
class GitService {
  baseDir;
  binary;
  logger;
  git;
  constructor(options) {
    this.baseDir = normalize(options.baseDir);
    this.binary = options.binary;
    this.logger = options.logger;
    const gitOptions = {
      baseDir: this.baseDir,
      trimmed: true
    };
    if (this.binary) {
      gitOptions.binary = this.binary;
    }
    this.git = simpleGit(gitOptions);
  }
  /**
   * Log a message if logger is available
   */
  log(level, message, ...args) {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }
  /**
   * Ensure path is a git repository before operations
   */
  async ensureRepository() {
    const isRepo = await this.isRepository();
    if (!isRepo) {
      throw new NotARepositoryError(this.baseDir);
    }
  }
  // ==========================================================================
  // Repository Status
  // ==========================================================================
  /**
   * Check if path is inside a git repository
   */
  async isRepository() {
    this.log("debug", `Checking if ${this.baseDir} is a git repository`);
    try {
      const result = await this.git.checkIsRepo();
      return result;
    } catch {
      return false;
    }
  }
  /**
   * Get current repository status
   * @throws NotARepositoryError if not in a git repository
   */
  async status() {
    this.log("debug", `Getting status for ${this.baseDir}`);
    await this.ensureRepository();
    const result = await this.git.status();
    return {
      current: result.current || "",
      tracking: result.tracking || void 0,
      staged: [...result.staged, ...result.created],
      modified: result.modified,
      untracked: result.not_added,
      conflicted: result.conflicted,
      ahead: result.ahead,
      behind: result.behind
    };
  }
  /**
   * Get name of current branch
   * @throws NotARepositoryError if not in a git repository
   */
  async currentBranch() {
    this.log("debug", `Getting current branch for ${this.baseDir}`);
    await this.ensureRepository();
    const result = await this.git.branch();
    return result.current;
  }
  // ==========================================================================
  // Branch Operations
  // ==========================================================================
  /**
   * Create new branch from source (default: current)
   * Does NOT checkout the branch
   * @throws NotARepositoryError if not in a git repository
   */
  async createBranch(name, from) {
    this.log("debug", `Creating branch ${name}${from ? ` from ${from}` : ""}`);
    await this.ensureRepository();
    if (from) {
      await this.git.branch([name, from]);
    } else {
      await this.git.branch([name]);
    }
  }
  /**
   * Switch to existing branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async checkoutBranch(name) {
    this.log("debug", `Checking out branch ${name}`);
    await this.ensureRepository();
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(name)) {
      throw new BranchNotFoundError(name);
    }
    await this.git.checkout(name);
  }
  /**
   * Delete a branch
   * @param force Force delete unmerged branch
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async deleteBranch(name, force) {
    this.log("debug", `Deleting branch ${name}${force ? " (force)" : ""}`);
    await this.ensureRepository();
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(name)) {
      throw new BranchNotFoundError(name);
    }
    try {
      await this.git.deleteLocalBranch(name, force ?? false);
    } catch (error) {
      if (!force) {
        throw error;
      }
      throw new GitError(`Failed to delete branch ${name}: ${error.message}`);
    }
  }
  /**
   * List all local branches with metadata
   * @throws NotARepositoryError if not in a git repository
   */
  async listBranches() {
    this.log("debug", `Listing branches for ${this.baseDir}`);
    await this.ensureRepository();
    const result = await this.git.branchLocal();
    return result.all.map((name) => {
      const branch = result.branches[name];
      return {
        name,
        current: name === result.current,
        commit: branch.commit
      };
    });
  }
  // ==========================================================================
  // Commit Operations
  // ==========================================================================
  /**
   * Stage specific files or all changes
   * @param files Array of file paths or 'all' for all changes
   * @throws NotARepositoryError if not in a git repository
   */
  async stageFiles(files) {
    this.log("debug", `Staging files: ${files === "all" ? "all" : files.join(", ")}`);
    await this.ensureRepository();
    if (files === "all") {
      await this.git.add(".");
    } else {
      await this.git.add(files);
    }
  }
  /**
   * Create commit and return commit hash
   * @throws NotARepositoryError if not in a git repository
   * @throws CommitError if nothing to commit
   */
  async commit(message) {
    this.log("debug", `Creating commit: ${message}`);
    await this.ensureRepository();
    const status = await this.git.status();
    if (status.staged.length === 0 && status.created.length === 0) {
      throw new CommitError("Nothing to commit");
    }
    try {
      const result = await this.git.commit(message);
      return result.commit;
    } catch (error) {
      const errMsg = error.message;
      throw new CommitError(errMsg);
    }
  }
  /**
   * Get commit history
   * @param limit Maximum number of commits to return
   * @throws NotARepositoryError if not in a git repository
   */
  async getLog(limit) {
    this.log("debug", `Getting log${limit ? ` (limit: ${limit})` : ""}`);
    await this.ensureRepository();
    const options = limit ? { maxCount: limit } : {};
    const result = await this.git.log(options);
    return result.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date)
    }));
  }
  // ==========================================================================
  // Diff Operations
  // ==========================================================================
  /**
   * Get diff of changes
   * @throws NotARepositoryError if not in a git repository
   */
  async diff(options) {
    this.log("debug", `Getting diff`, options);
    await this.ensureRepository();
    const args = [];
    if (options?.ref1 && options.ref2) {
      args.push(options.ref1, options.ref2);
    } else if (options?.staged) {
      args.push("--cached");
    }
    const result = await this.git.diff(args);
    return result;
  }
  /**
   * Get diff statistics
   * @throws NotARepositoryError if not in a git repository
   */
  async diffStat(options) {
    this.log("debug", `Getting diff stat`, options);
    await this.ensureRepository();
    const args = [];
    if (options?.ref1 && options.ref2) {
      args.push(options.ref1, options.ref2);
    } else if (options?.staged) {
      args.push("--cached");
    }
    const result = await this.git.diffSummary(args);
    return {
      filesChanged: result.files.length,
      insertions: result.insertions,
      deletions: result.deletions,
      files: result.files.map((file) => ({
        path: file.file,
        insertions: "insertions" in file ? file.insertions : 0,
        deletions: "deletions" in file ? file.deletions : 0
      }))
    };
  }
  // ==========================================================================
  // Merge Operations
  // ==========================================================================
  /**
   * Merge branch into current
   * Returns conflict info if any
   * @throws NotARepositoryError if not in a git repository
   * @throws BranchNotFoundError if branch does not exist
   */
  async merge(branch, options) {
    this.log("debug", `Merging branch ${branch}`, options);
    await this.ensureRepository();
    const branches = await this.git.branchLocal();
    if (!branches.all.includes(branch)) {
      throw new BranchNotFoundError(branch);
    }
    const args = [branch];
    if (options?.noFf) {
      args.unshift("--no-ff");
    }
    if (options?.message) {
      args.unshift("-m", options.message);
    }
    try {
      const result = await this.git.merge(args);
      if (result.failed) {
        return {
          success: false,
          conflicts: result.conflicts.map((c) => typeof c === "string" ? c : c.file ?? JSON.stringify(c))
        };
      }
      return {
        success: true,
        mergeCommit: result.merges[0]
      };
    } catch (error) {
      const status = await this.git.status();
      if (status.conflicted.length > 0) {
        return {
          success: false,
          conflicts: status.conflicted
        };
      }
      throw new GitError(`Merge failed: ${error.message}`);
    }
  }
  /**
   * Abort in-progress merge
   * @throws NotARepositoryError if not in a git repository
   */
  async abortMerge() {
    this.log("debug", `Aborting merge`);
    await this.ensureRepository();
    try {
      await this.git.merge(["--abort"]);
    } catch (error) {
      throw new GitError(`Failed to abort merge: ${error.message}`);
    }
  }
}
class QARunnerFactory {
  /**
   * Create a complete QARunner with all real implementations
   *
   * This is the primary factory method. It creates a QARunner that:
   * - Runs TypeScript compilation (BuildRunner)
   * - Runs ESLint (LintRunner)
   * - Runs Vitest (TestRunner)
   * - Runs AI code review (ReviewRunner) - requires geminiClient
   *
   * @param config - Factory configuration
   * @returns Complete QARunner instance
   */
  static create(config) {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);
    const testRunner = new TestRunner(config.testConfig);
    const qaRunner = {
      build: buildRunner.createCallback(config.workingDir),
      lint: lintRunner.createCallback(config.workingDir),
      test: testRunner.createCallback(config.workingDir)
    };
    if (config.geminiClient) {
      const gitService = config.gitService ?? new GitService({ baseDir: config.workingDir });
      const reviewRunner = new ReviewRunner(
        config.geminiClient,
        gitService,
        config.reviewConfig
      );
      qaRunner.review = reviewRunner.createCallback(
        config.workingDir,
        config.reviewContext
      );
    }
    return qaRunner;
  }
  /**
   * Create a QARunner with only build and lint (for quick checks)
   *
   * This is useful for fast feedback loops where you don't need
   * full test or review coverage. Commonly used during development
   * or when you want quick type checking and linting.
   *
   * @param config - Quick QA runner configuration
   * @returns QARunner with only build and lint
   */
  static createQuick(config) {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);
    return {
      build: buildRunner.createCallback(config.workingDir),
      lint: lintRunner.createCallback(config.workingDir)
    };
  }
  /**
   * Create a QARunner with mocked implementations (for testing)
   *
   * This creates a QARunner where all steps immediately return
   * successful results without actually running any tools.
   * Useful for unit testing code that depends on QARunner.
   *
   * @returns QARunner with mocked implementations
   */
  static createMock() {
    return {
      build: (_taskId) => Promise.resolve({
        success: true,
        errors: [],
        warnings: [],
        duration: 0
      }),
      lint: (_taskId) => Promise.resolve({
        success: true,
        errors: [],
        warnings: [],
        fixable: 0
      }),
      test: (_taskId) => Promise.resolve({
        success: true,
        passed: 10,
        failed: 0,
        skipped: 0,
        errors: [],
        duration: 0
      }),
      review: (_taskId) => Promise.resolve({
        approved: true,
        comments: [],
        suggestions: [],
        blockers: []
      })
    };
  }
  /**
   * Create a QARunner with configurable mock results (for testing)
   *
   * This allows you to specify exactly what results each step
   * should return, enabling testing of various failure scenarios.
   *
   * @param mockResults - The results to return from each step
   * @returns QARunner with configurable mock implementations
   */
  static createConfigurableMock(mockResults) {
    const defaultBuild = {
      success: true,
      errors: [],
      warnings: [],
      duration: 0
    };
    const defaultLint = {
      success: true,
      errors: [],
      warnings: [],
      fixable: 0
    };
    const defaultTest = {
      success: true,
      passed: 10,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0
    };
    const defaultReview = {
      approved: true,
      comments: [],
      suggestions: [],
      blockers: []
    };
    return {
      build: () => Promise.resolve(mockResults.build ?? defaultBuild),
      lint: () => Promise.resolve(mockResults.lint ?? defaultLint),
      test: () => Promise.resolve(mockResults.test ?? defaultTest),
      review: () => Promise.resolve(mockResults.review ?? defaultReview)
    };
  }
  /**
   * Create individual runner instances for custom composition
   *
   * Use this when you need fine-grained control over individual
   * runners or want to use them outside the QARunner interface.
   *
   * @param config - Factory configuration
   * @returns Object containing individual runner instances
   */
  static createRunners(config) {
    const buildRunner = new BuildRunner(config.buildConfig);
    const lintRunner = new LintRunner(config.lintConfig);
    const testRunner = new TestRunner(config.testConfig);
    const result = {
      buildRunner,
      lintRunner,
      testRunner
    };
    if (config.geminiClient) {
      const gitService = config.gitService ?? new GitService({ baseDir: config.workingDir });
      result.reviewRunner = new ReviewRunner(
        config.geminiClient,
        gitService,
        config.reviewConfig
      );
    }
    return result;
  }
}
class QALoopEngine {
  qaRunner;
  maxIterations;
  stopOnFirstFailure;
  workingDir;
  agentPool;
  constructor(config) {
    this.qaRunner = config.qaRunner;
    this.maxIterations = config.maxIterations ?? 50;
    this.stopOnFirstFailure = config.stopOnFirstFailure ?? true;
    this.workingDir = config.workingDir;
    this.agentPool = config.agentPool;
  }
  /**
   * Generate or fix code using the CoderAgent
   *
   * This method calls the CoderAgent to either:
   * - Generate initial code for a task (mode='generate')
   * - Fix errors from build/lint failures (mode='fix')
   *
   * @param task - The task being worked on
   * @param mode - 'generate' for initial code, 'fix' for error fixing
   * @param errors - Error details to fix (only used in 'fix' mode)
   * @returns true if code generation/fix was successful
   */
  async generateOrFixCode(task, mode, errors) {
    if (!this.agentPool) {
      console.warn("[QALoopEngine] No agentPool - skipping code generation");
      return false;
    }
    const workingDir = task.projectPath || task.worktree || this.workingDir;
    if (!workingDir) {
      console.error("[QALoopEngine] No working directory for code generation");
      return false;
    }
    let coderAgent = this.agentPool.getAvailableByType("coder");
    if (!coderAgent) {
      try {
        coderAgent = this.agentPool.spawn("coder");
      } catch (spawnError) {
        console.error("[QALoopEngine] Failed to spawn coder agent:", spawnError);
        return false;
      }
    }
    const context = {
      workingDir,
      relevantFiles: task.files,
      previousAttempts: mode === "fix" ? errors : void 0
    };
    const agentTask = {
      id: task.id,
      name: task.name,
      description: mode === "fix" ? `Fix the following errors:
${errors?.join("\n") ?? "Unknown errors"}

Original task: ${task.description}` : task.description,
      type: "auto",
      status: "in_progress",
      priority: "high",
      files: task.files,
      createdAt: /* @__PURE__ */ new Date()
    };
    console.log(`[QALoopEngine] Calling CoderAgent to ${mode} code...`);
    console.log(`[QALoopEngine] Working directory: ${workingDir}`);
    try {
      const result = await this.agentPool.runTask(coderAgent, agentTask, context);
      try {
        this.agentPool.release(coderAgent.id);
      } catch {
      }
      if (result.success) {
        console.log(`[QALoopEngine] CoderAgent ${mode} succeeded`);
      } else {
        console.log(`[QALoopEngine] CoderAgent ${mode} failed: ${result.error ?? "unknown"}`);
      }
      return result.success;
    } catch (error) {
      console.error(`[QALoopEngine] CoderAgent ${mode} error:`, error);
      try {
        this.agentPool.release(coderAgent.id);
      } catch {
      }
      return false;
    }
  }
  /**
   * Run the QA loop on a task
   *
   * This is the main method that NexusCoordinator calls. It:
   * 1. Runs build step (if available)
   * 2. Runs lint step (if available)
   * 3. Runs test step (if available)
   * 4. Runs review step (if available)
   * 5. Returns success if all pass
   * 6. Tracks iterations and escalates if max reached
   *
   * @param task - Task to run QA on
   * @param _coder - Agent that did the coding (currently unused, for future use)
   * @returns QA loop result
   */
  async run(task, _coder) {
    let iteration = 0;
    let lastBuild;
    let lastLint;
    let lastTest;
    let lastReview;
    const effectiveWorkingDir = task.projectPath || task.worktree || this.workingDir || process.cwd();
    console.log(`[QALoopEngine] Starting QA loop for task ${task.id}: ${task.name}`);
    console.log(`[QALoopEngine] Project path: ${task.projectPath ?? "NOT PROVIDED"}`);
    console.log(`[QALoopEngine] Worktree: ${task.worktree ?? "NONE"}`);
    console.log(`[QALoopEngine] Effective working directory: ${effectiveWorkingDir}`);
    if (this.agentPool) {
      console.log(`[QALoopEngine] Generating initial code for task ${task.id}...`);
      const generated = await this.generateOrFixCode(task, "generate");
      if (!generated) {
        console.warn(`[QALoopEngine] Initial code generation failed or skipped`);
      }
    } else {
      console.log(`[QALoopEngine] No agentPool - skipping initial code generation`);
    }
    while (iteration < this.maxIterations) {
      iteration++;
      console.log(`[QALoopEngine] Iteration ${iteration}/${this.maxIterations}`);
      let allPassed = true;
      const failureReasons = [];
      const errorDetails = [];
      if (this.qaRunner.build) {
        console.log(`[QALoopEngine] Running build step in ${effectiveWorkingDir}...`);
        try {
          lastBuild = await this.qaRunner.build(task.id, effectiveWorkingDir);
          if (!lastBuild.success) {
            allPassed = false;
            failureReasons.push(`Build failed with ${lastBuild.errors.length} errors`);
            errorDetails.push(...lastBuild.errors.map(
              (e) => typeof e === "string" ? e : `${e.file ?? "unknown"}:${e.line ?? 0} - ${e.message}`
            ));
            console.log(`[QALoopEngine] Build failed: ${lastBuild.errors.length} errors`);
            if (lastBuild.errors.length === 0) {
              console.warn(`[QALoopEngine] Build failed with no parseable errors - checking iteration count`);
              if (iteration >= 3) {
                console.log(`[QALoopEngine] Escalating after ${iteration} iterations with unparseable build errors`);
                return {
                  success: false,
                  escalated: true,
                  reason: "Build failing with unparseable errors after multiple attempts",
                  iterations: iteration,
                  lastBuild,
                  lastLint,
                  lastTest,
                  lastReview
                };
              }
              errorDetails.push("Build failed but no specific errors could be parsed. Please review the build output and fix any issues.");
            }
            if (this.agentPool && this.stopOnFirstFailure) {
              console.log(`[QALoopEngine] Calling CoderAgent to fix build errors...`);
              await this.generateOrFixCode(task, "fix", errorDetails);
            }
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Build passed`);
          }
        } catch (error) {
          allPassed = false;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failureReasons.push(`Build error: ${errorMsg}`);
          errorDetails.push(`Build execution error: ${errorMsg}`);
          console.error(`[QALoopEngine] Build error:`, error);
          if (this.agentPool && this.stopOnFirstFailure) {
            console.log(`[QALoopEngine] Calling CoderAgent to fix build error...`);
            await this.generateOrFixCode(task, "fix", errorDetails);
          }
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }
      if (this.qaRunner.lint && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running lint step in ${effectiveWorkingDir}...`);
        try {
          lastLint = await this.qaRunner.lint(task.id, effectiveWorkingDir);
          if (!lastLint.success || lastLint.errors.length > 0) {
            allPassed = false;
            failureReasons.push(`Lint failed with ${lastLint.errors.length} errors`);
            errorDetails.push(...lastLint.errors.map(
              (e) => typeof e === "string" ? e : `${e.file ?? "unknown"}:${e.line ?? 0} - ${e.message}${e.code ? ` (${e.code})` : ""}`
            ));
            console.log(`[QALoopEngine] Lint failed: ${lastLint.errors.length} errors`);
            if (this.agentPool && this.stopOnFirstFailure) {
              console.log(`[QALoopEngine] Calling CoderAgent to fix lint errors...`);
              await this.generateOrFixCode(task, "fix", errorDetails);
            }
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Lint passed`);
          }
        } catch (error) {
          allPassed = false;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failureReasons.push(`Lint error: ${errorMsg}`);
          errorDetails.push(`Lint execution error: ${errorMsg}`);
          console.error(`[QALoopEngine] Lint error:`, error);
          if (this.agentPool && this.stopOnFirstFailure) {
            console.log(`[QALoopEngine] Calling CoderAgent to fix lint error...`);
            await this.generateOrFixCode(task, "fix", errorDetails);
          }
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }
      if (this.qaRunner.test && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running test step in ${effectiveWorkingDir}...`);
        try {
          lastTest = await this.qaRunner.test(task.id, effectiveWorkingDir);
          if (!lastTest.success) {
            allPassed = false;
            failureReasons.push(`Tests failed: ${lastTest.failed}/${lastTest.passed + lastTest.failed} failed`);
            console.log(`[QALoopEngine] Tests failed: ${lastTest.failed} failed, ${lastTest.passed} passed`);
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Tests passed: ${lastTest.passed} tests`);
          }
        } catch (error) {
          allPassed = false;
          failureReasons.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`[QALoopEngine] Test error:`, error);
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }
      if (this.qaRunner.review && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running review step in ${effectiveWorkingDir}...`);
        try {
          lastReview = await this.qaRunner.review(task.id, effectiveWorkingDir);
          if (!lastReview.approved) {
            allPassed = false;
            failureReasons.push(`Review not approved: ${lastReview.blockers.length} blockers`);
            console.log(`[QALoopEngine] Review not approved: ${lastReview.blockers.join(", ")}`);
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Review approved`);
          }
        } catch (error) {
          allPassed = false;
          failureReasons.push(`Review error: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`[QALoopEngine] Review error:`, error);
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }
      if (allPassed) {
        console.log(`[QALoopEngine] All QA steps passed for task ${task.id}`);
        return {
          success: true,
          escalated: false,
          iterations: iteration,
          lastBuild,
          lastLint,
          lastTest,
          lastReview
        };
      }
      console.log(`[QALoopEngine] Iteration ${iteration} failed: ${failureReasons.join("; ")}`);
    }
    console.log(`[QALoopEngine] Max iterations (${this.maxIterations}) reached for task ${task.id}, escalating`);
    return {
      success: false,
      escalated: true,
      reason: "Max QA iterations exceeded",
      iterations: iteration,
      lastBuild,
      lastLint,
      lastTest,
      lastReview
    };
  }
  /**
   * Run a single QA cycle without iteration (for testing/debugging)
   */
  async runOnce(task) {
    const results = { allPassed: true };
    if (this.qaRunner.build) {
      results.build = await this.qaRunner.build(task.id);
      if (!results.build.success) {
        results.allPassed = false;
      }
    }
    if (this.qaRunner.lint) {
      results.lint = await this.qaRunner.lint(task.id);
      if (!results.lint.success || results.lint.errors.length > 0) {
        results.allPassed = false;
      }
    }
    if (this.qaRunner.test) {
      results.test = await this.qaRunner.test(task.id);
      if (!results.test.success) {
        results.allPassed = false;
      }
    }
    if (this.qaRunner.review) {
      results.review = await this.qaRunner.review(task.id);
      if (!results.review.approved) {
        results.allPassed = false;
      }
    }
    return results;
  }
}
class WorktreeError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class WorktreeExistsError extends WorktreeError {
  taskId;
  constructor(taskId) {
    super(`Worktree already exists for task: ${taskId}`);
    this.name = "WorktreeExistsError";
    this.taskId = taskId;
  }
}
class WorktreeNotFoundError extends WorktreeError {
  taskId;
  constructor(taskId) {
    super(`Worktree not found for task: ${taskId}`);
    this.name = "WorktreeNotFoundError";
    this.taskId = taskId;
  }
}
const DEFAULT_MAX_AGE = 1 * 60 * 60 * 1e3;
const IDLE_THRESHOLD = 15 * 60 * 1e3;
const STALE_THRESHOLD = 30 * 60 * 1e3;
const LOCK_TIMEOUT = 5e3;
const LOCK_RETRY_INTERVAL = 50;
class WorktreeManager {
  baseDir;
  worktreeDir;
  gitService;
  registryPath;
  lockPath;
  isLocked = false;
  constructor(options) {
    this.baseDir = normalize(options.baseDir);
    this.worktreeDir = normalize(
      options.worktreeDir || join(this.baseDir, ".nexus", "worktrees")
    );
    this.gitService = options.gitService;
    this.registryPath = join(this.worktreeDir, "registry.json");
    this.lockPath = join(this.worktreeDir, ".lock");
  }
  // ==========================================================================
  // Lock Management (for concurrent access)
  // ==========================================================================
  /**
   * Acquire file lock for registry access
   * Uses a simple file-based lock with timeout
   */
  async acquireLock() {
    const startTime = Date.now();
    await fse.ensureDir(this.worktreeDir);
    while (true) {
      try {
        await fse.writeFile(this.lockPath, String(process.pid), { flag: "wx" });
        this.isLocked = true;
        return;
      } catch {
        if (Date.now() - startTime > LOCK_TIMEOUT) {
          try {
            await fse.remove(this.lockPath);
            await fse.writeFile(this.lockPath, String(process.pid), { flag: "wx" });
            this.isLocked = true;
            return;
          } catch {
            throw new WorktreeError("Failed to acquire registry lock");
          }
        }
        await new Promise((resolve2) => setTimeout(resolve2, LOCK_RETRY_INTERVAL));
      }
    }
  }
  /**
   * Release file lock
   */
  async releaseLock() {
    if (this.isLocked) {
      try {
        await fse.remove(this.lockPath);
      } catch {
      }
      this.isLocked = false;
    }
  }
  /**
   * Execute a function with registry lock
   */
  async withLock(fn) {
    await this.acquireLock();
    try {
      return await fn();
    } finally {
      await this.releaseLock();
    }
  }
  // ==========================================================================
  // Path Operations
  // ==========================================================================
  /**
   * Get absolute path to worktree directory for a task
   * @param taskId Task identifier
   * @returns Absolute path to worktree directory
   */
  getWorktreePath(taskId) {
    return join(this.worktreeDir, taskId);
  }
  /**
   * Generate branch name for a task
   * @param taskId Task identifier
   * @returns Branch name following pattern nexus/task/{taskId}/{timestamp}
   */
  generateBranchName(taskId) {
    const timestamp = Date.now();
    return `nexus/task/${taskId}/${timestamp}`;
  }
  // ==========================================================================
  // Registry Operations
  // ==========================================================================
  /**
   * Internal: Load registry from disk (creates if not exists)
   * Should only be called when lock is held
   */
  async loadRegistryInternal() {
    await fse.ensureDir(this.worktreeDir);
    try {
      if (await fse.pathExists(this.registryPath)) {
        const content = await fse.readFile(this.registryPath, "utf-8");
        const raw = JSON.parse(content);
        const registry2 = {
          version: 1,
          baseDir: this.baseDir,
          lastUpdated: new Date(raw.lastUpdated),
          worktrees: {}
        };
        for (const [taskId, info] of Object.entries(raw.worktrees)) {
          const worktreeRaw = info;
          registry2.worktrees[taskId] = {
            ...worktreeRaw,
            createdAt: new Date(worktreeRaw.createdAt),
            lastActivity: worktreeRaw.lastActivity ? new Date(worktreeRaw.lastActivity) : void 0
          };
        }
        return registry2;
      }
    } catch {
    }
    const registry = {
      version: 1,
      baseDir: this.baseDir,
      worktrees: {},
      lastUpdated: /* @__PURE__ */ new Date()
    };
    await this.saveRegistryInternal(registry);
    return registry;
  }
  /**
   * Internal: Save registry to disk
   * Should only be called when lock is held
   */
  async saveRegistryInternal(registry) {
    await fse.ensureDir(this.worktreeDir);
    registry.lastUpdated = /* @__PURE__ */ new Date();
    const tempPath = `${this.registryPath}.tmp`;
    await fse.writeFile(tempPath, JSON.stringify(registry, null, 2), "utf-8");
    await fse.rename(tempPath, this.registryPath);
  }
  /**
   * Load registry from disk (creates if not exists)
   * @returns WorktreeRegistry
   */
  async loadRegistry() {
    return this.withLock(() => this.loadRegistryInternal());
  }
  /**
   * Save registry to disk
   * Uses atomic write (temp file + rename) for safety
   * @param registry Registry to save
   */
  async saveRegistry(registry) {
    return this.withLock(() => this.saveRegistryInternal(registry));
  }
  // ==========================================================================
  // Worktree Operations
  // ==========================================================================
  /**
   * Create a new worktree for a task
   * @param taskId Task identifier
   * @param baseBranch Branch to create worktree from (default: main/master)
   * @returns WorktreeInfo for the created worktree
   * @throws WorktreeExistsError if worktree already exists for taskId
   */
  async createWorktree(taskId, baseBranch) {
    return this.withLock(async () => {
      const registry = await this.loadRegistryInternal();
      if (registry.worktrees[taskId]) {
        throw new WorktreeExistsError(taskId);
      }
      const actualBaseBranch = baseBranch || await this.gitService.currentBranch();
      const branchName = this.generateBranchName(taskId);
      const worktreePath = this.getWorktreePath(taskId);
      const cmd = `git worktree add "${worktreePath}" -b "${branchName}" "${actualBaseBranch}"`;
      await execaCommand(cmd, { cwd: this.baseDir, shell: true });
      const now = /* @__PURE__ */ new Date();
      const info = {
        taskId,
        path: worktreePath,
        branch: branchName,
        baseBranch: actualBaseBranch,
        createdAt: now,
        lastActivity: now,
        status: "active"
      };
      registry.worktrees[taskId] = info;
      await this.saveRegistryInternal(registry);
      return info;
    });
  }
  /**
   * Get worktree info by task ID
   * @param taskId Task identifier
   * @returns WorktreeInfo if exists, null otherwise
   */
  async getWorktree(taskId) {
    const registry = await this.loadRegistry();
    return registry.worktrees[taskId] || null;
  }
  /**
   * List all active worktrees
   * @returns Array of WorktreeInfo
   */
  async listWorktrees() {
    const registry = await this.loadRegistry();
    return Object.values(registry.worktrees).filter((info) => info !== void 0);
  }
  /**
   * Remove a worktree
   * @param taskId Task identifier
   * @param options Removal options
   * @throws WorktreeNotFoundError if worktree doesn't exist
   */
  async removeWorktree(taskId, options) {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];
    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }
    try {
      const cmd = `git worktree remove "${info.path}" --force`;
      await execaCommand(cmd, { cwd: this.baseDir, shell: true });
    } catch {
      if (await fse.pathExists(info.path)) {
        await fse.remove(info.path);
        await execaCommand("git worktree prune", { cwd: this.baseDir, shell: true });
      }
    }
    if (options?.deleteBranch) {
      try {
        await this.gitService.deleteBranch(info.branch, true);
      } catch {
      }
    }
    delete registry.worktrees[taskId];
    await this.saveRegistry(registry);
  }
  /**
   * Cleanup stale worktrees
   * @param options Cleanup options
   * @returns CleanupResult with removed, failed, and skipped tasks
   */
  async cleanup(options) {
    const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE;
    const force = options?.force ?? false;
    const dryRun = options?.dryRun ?? false;
    const result = {
      removed: [],
      failed: [],
      skipped: []
    };
    const registry = await this.loadRegistry();
    const now = Date.now();
    for (const [taskId, info] of Object.entries(registry.worktrees)) {
      if (!info) {
        continue;
      }
      const lastActivityTime = info.lastActivity?.getTime() ?? info.createdAt.getTime();
      const age = now - lastActivityTime;
      if (age < maxAge && !force) {
        result.skipped.push(taskId);
        continue;
      }
      if (info.status !== "stale" && age < maxAge && !force) {
        result.skipped.push(taskId);
        continue;
      }
      if (dryRun) {
        result.removed.push(taskId);
        continue;
      }
      try {
        await this.removeWorktree(taskId, { deleteBranch: true });
        result.removed.push(taskId);
      } catch (error) {
        result.failed.push({
          taskId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return result;
  }
  // ==========================================================================
  // Activity Tracking
  // ==========================================================================
  /**
   * Update activity timestamp for a worktree
   * @param taskId Task identifier
   */
  async updateActivity(taskId) {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];
    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }
    info.lastActivity = /* @__PURE__ */ new Date();
    info.status = "active";
    await this.saveRegistry(registry);
  }
  /**
   * Refresh status based on activity
   * Status transitions:
   * - active: lastActivity < 15 minutes ago
   * - idle: lastActivity 15-30 minutes ago
   * - stale: lastActivity > 30 minutes ago
   * @param taskId Task identifier
   */
  async refreshStatus(taskId) {
    const registry = await this.loadRegistry();
    const info = registry.worktrees[taskId];
    if (!info) {
      throw new WorktreeNotFoundError(taskId);
    }
    const now = Date.now();
    const lastActivityTime = info.lastActivity?.getTime() ?? info.createdAt.getTime();
    const age = now - lastActivityTime;
    if (age < IDLE_THRESHOLD) {
      info.status = "active";
    } else if (age < STALE_THRESHOLD) {
      info.status = "idle";
    } else {
      info.status = "stale";
    }
    await this.saveRegistry(registry);
  }
}
const DEFAULT_REPO_MAP_OPTIONS = {
  includePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  excludePatterns: [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    "coverage/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.d.ts"
  ],
  maxFiles: 500,
  maxTokens: 4e3,
  languages: ["typescript", "javascript"],
  extractDocs: true,
  countReferences: true,
  basePath: ""
};
const DEFAULT_FORMAT_OPTIONS = {
  maxTokens: 4e3,
  includeSignatures: true,
  includeDocstrings: false,
  rankByReferences: true,
  groupByFile: true,
  includeDependencies: false,
  style: "compact"
};
class TreeSitterParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Parser = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languages = /* @__PURE__ */ new Map();
  initialized = false;
  wasmBasePath;
  /**
   * Create a new TreeSitterParser
   * @param wasmBasePath - Optional base path for WASM files (defaults to node_modules)
   */
  constructor(wasmBasePath) {
    const defaultPath = resolve(process.cwd(), "node_modules");
    this.wasmBasePath = wasmBasePath || defaultPath;
  }
  /**
   * Initialize the parser by loading WASM modules
   */
  async initialize() {
    if (this.initialized) return;
    try {
      const treeSitterModule = await import("web-tree-sitter");
      const TreeSitter = treeSitterModule.default || treeSitterModule;
      const treeSitterWasmPath = resolve(
        this.wasmBasePath,
        "web-tree-sitter",
        "tree-sitter.wasm"
      );
      await TreeSitter.init({
        locateFile: () => treeSitterWasmPath
      });
      this.Parser = TreeSitter;
      const tsWasmPath = resolve(
        this.wasmBasePath,
        "tree-sitter-typescript",
        "tree-sitter-typescript.wasm"
      );
      const typescriptLanguage = await TreeSitter.Language.load(tsWasmPath);
      this.languages.set("typescript", typescriptLanguage);
      const jsWasmPath = resolve(
        this.wasmBasePath,
        "tree-sitter-javascript",
        "tree-sitter-javascript.wasm"
      );
      const javascriptLanguage = await TreeSitter.Language.load(jsWasmPath);
      this.languages.set("javascript", javascriptLanguage);
      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize TreeSitterParser: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Check if the parser is ready
   */
  isReady() {
    return this.initialized;
  }
  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return ["typescript", "javascript"];
  }
  /**
   * Detect language from file extension
   */
  detectLanguage(filePath) {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case ".ts":
      case ".tsx":
      case ".mts":
        return "typescript";
      case ".js":
      case ".jsx":
      case ".mjs":
        return "javascript";
      default:
        return null;
    }
  }
  /**
   * Parse a single file
   */
  async parseFile(filePath, content) {
    const startTime = Date.now();
    const language = this.detectLanguage(filePath);
    if (!language) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [
          {
            message: `Unsupported file type: ${extname(filePath)}`,
            line: 1,
            column: 0
          }
        ],
        parseTime: Date.now() - startTime
      };
    }
    if (!this.initialized || !this.Parser) {
      await this.initialize();
    }
    const languageModule = this.languages.get(language);
    if (!languageModule) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [{ message: `Language not loaded: ${language}`, line: 1, column: 0 }],
        parseTime: Date.now() - startTime
      };
    }
    try {
      const parser = new this.Parser();
      parser.setLanguage(languageModule);
      const tree = parser.parse(content);
      const rootNode = tree.rootNode;
      const symbols = this.extractSymbols(rootNode, filePath);
      const imports = this.extractImports(rootNode);
      const exports$1 = this.extractExports(rootNode);
      const errors = this.findErrors(rootNode);
      return {
        success: errors.length === 0,
        file: filePath,
        symbols,
        imports,
        exports: exports$1,
        errors,
        parseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [
          {
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
            line: 1,
            column: 0
          }
        ],
        parseTime: Date.now() - startTime
      };
    }
  }
  /**
   * Parse multiple files
   */
  async parseFiles(files) {
    const results = [];
    for (const file of files) {
      const result = await this.parseFile(file.path, file.content);
      results.push(result);
    }
    return results;
  }
  // ============================================================================
  // Symbol Extraction
  // ============================================================================
  /**
   * Extract symbols from AST
   */
  extractSymbols(rootNode, filePath, parentId) {
    const symbols = [];
    this.walkNode(rootNode, filePath, symbols, parentId);
    return symbols;
  }
  /**
   * Walk AST nodes recursively
   */
  walkNode(node, filePath, symbols, parentId) {
    const symbol = this.nodeToSymbol(node, filePath, parentId);
    if (symbol) {
      symbols.push(symbol);
      if (symbol.kind === "class" || symbol.kind === "interface" || symbol.kind === "enum") {
        for (const child of node.namedChildren) {
          this.walkNode(child, filePath, symbols, symbol.id);
        }
        return;
      }
    }
    for (const child of node.namedChildren) {
      this.walkNode(child, filePath, symbols, parentId);
    }
  }
  /**
   * Convert AST node to SymbolEntry if applicable
   */
  nodeToSymbol(node, filePath, parentId) {
    const kind = this.getSymbolKind(node);
    if (!kind) return null;
    const name = this.getSymbolName(node, kind);
    if (!name) return null;
    const line = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const column = node.startPosition.column;
    const id = `${filePath}#${name}#${line}`;
    const modifiers = this.extractModifiers(node);
    const exported = this.isExported(node);
    const signature = this.buildSignature(node, kind, name);
    const documentation = this.extractDocumentation(node);
    return {
      id,
      name,
      kind,
      file: filePath,
      line,
      endLine,
      column,
      signature,
      documentation,
      references: 0,
      exported,
      parentId,
      modifiers
    };
  }
  /**
   * Get symbol kind from node type
   */
  getSymbolKind(node) {
    switch (node.type) {
      case "function_declaration":
      case "function":
        return "function";
      case "arrow_function":
        if (node.parent?.type === "variable_declarator" || node.parent?.type === "lexical_declaration") {
          return null;
        }
        return null;
      case "method_definition":
      case "method_signature":
        return "method";
      case "class_declaration":
      case "class":
        return "class";
      case "interface_declaration":
        return "interface";
      case "type_alias_declaration":
        return "type";
      case "enum_declaration":
        return "enum";
      case "enum_assignment":
        return "enum_member";
      case "variable_declarator": {
        const init = node.childForFieldName("value");
        if (init?.type === "arrow_function" || init?.type === "function") {
          return "function";
        }
        const declaration = node.parent;
        if (declaration?.type === "lexical_declaration") {
          const keyword = declaration.children[0]?.text;
          if (keyword === "const") {
            return "constant";
          }
        }
        return "variable";
      }
      case "property_signature":
      case "property_definition":
      case "public_field_definition":
        return "property";
      case "namespace_declaration":
      case "internal_module":
        return "namespace";
      case "module":
        return "module";
      default:
        return null;
    }
  }
  /**
   * Get symbol name from node
   */
  getSymbolName(node, _kind) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      return nameNode.text;
    }
    if (node.type === "variable_declarator") {
      const name = node.childForFieldName("name");
      if (name) return name.text;
      if (node.namedChildren[0]?.type === "identifier") {
        return node.namedChildren[0].text;
      }
    }
    if (node.type === "method_definition" || node.type === "method_signature") {
      const propName = node.childForFieldName("name");
      if (propName) return propName.text;
    }
    if (node.type === "property_signature" || node.type === "property_definition" || node.type === "public_field_definition") {
      const propName = node.childForFieldName("name");
      if (propName) return propName.text;
      if (node.namedChildren[0]) {
        return node.namedChildren[0].text;
      }
    }
    if (node.type === "enum_assignment") {
      if (node.namedChildren[0]) {
        return node.namedChildren[0].text;
      }
    }
    return null;
  }
  /**
   * Extract modifiers from node
   */
  extractModifiers(node) {
    const modifiers = [];
    if (this.isExported(node)) {
      modifiers.push("export");
    }
    for (const child of node.children) {
      switch (child.text) {
        case "async":
          modifiers.push("async");
          break;
        case "static":
          modifiers.push("static");
          break;
        case "private":
          modifiers.push("private");
          break;
        case "protected":
          modifiers.push("protected");
          break;
        case "public":
          modifiers.push("public");
          break;
        case "readonly":
          modifiers.push("readonly");
          break;
        case "abstract":
          modifiers.push("abstract");
          break;
        case "override":
          modifiers.push("override");
          break;
        case "default":
          modifiers.push("default");
          break;
      }
    }
    const accessibility = node.childForFieldName("accessibility");
    if (accessibility) {
      if (accessibility.text === "private" || accessibility.text === "protected" || accessibility.text === "public") {
        if (!modifiers.includes(accessibility.text)) {
          modifiers.push(accessibility.text);
        }
      }
    }
    return modifiers;
  }
  /**
   * Check if node is exported
   */
  isExported(node) {
    const parent = node.parent;
    if (parent?.type === "export_statement") {
      return true;
    }
    if (node.children[0]?.text === "export") {
      return true;
    }
    if (node.type === "variable_declarator") {
      const declaration = node.parent;
      if (declaration?.parent?.type === "export_statement") {
        return true;
      }
    }
    return false;
  }
  /**
   * Build signature string for symbol
   */
  buildSignature(node, kind, name) {
    switch (kind) {
      case "function": {
        const params = this.extractParameters(node);
        const returnType = this.extractReturnType(node);
        return `${name}(${params})${returnType ? `: ${returnType}` : ""}`;
      }
      case "method": {
        const params = this.extractParameters(node);
        const returnType = this.extractReturnType(node);
        return `${name}(${params})${returnType ? `: ${returnType}` : ""}`;
      }
      case "class": {
        const heritage = this.extractClassHeritage(node);
        return `class ${name}${heritage}`;
      }
      case "interface": {
        const extends_ = this.extractInterfaceExtends(node);
        return `interface ${name}${extends_}`;
      }
      case "type": {
        const typeValue = this.extractTypeValue(node);
        return `type ${name} = ${typeValue}`;
      }
      case "enum":
        return `enum ${name}`;
      case "constant":
      case "variable": {
        const type = this.extractVariableType(node);
        return `${kind === "constant" ? "const" : "let"} ${name}${type ? `: ${type}` : ""}`;
      }
      case "property": {
        const type = this.extractPropertyType(node);
        return `${name}${type ? `: ${type}` : ""}`;
      }
      default:
        return name;
    }
  }
  /**
   * Extract function/method parameters
   */
  extractParameters(node) {
    const params = node.childForFieldName("parameters");
    if (params) {
      const text2 = params.text;
      return text2.slice(1, -1);
    }
    return "";
  }
  /**
   * Extract return type annotation
   */
  extractReturnType(node) {
    const returnType = node.childForFieldName("return_type");
    if (returnType) {
      return returnType.text.replace(/^:\s*/, "");
    }
    return null;
  }
  /**
   * Extract class heritage (extends/implements)
   */
  extractClassHeritage(node) {
    const parts = [];
    const heritage = node.childForFieldName("heritage");
    if (heritage) {
      for (const child of heritage.namedChildren) {
        if (child.type === "extends_clause") {
          parts.push(` extends ${child.namedChildren.map((n) => n.text).join(", ")}`);
        }
        if (child.type === "implements_clause") {
          parts.push(` implements ${child.namedChildren.map((n) => n.text).join(", ")}`);
        }
      }
    }
    for (const child of node.namedChildren) {
      if (child.type === "class_heritage") {
        for (const clause of child.namedChildren) {
          if (clause.type === "extends_clause") {
            const types = clause.namedChildren.filter((n) => n.type !== "extends").map((n) => n.text);
            if (types.length) parts.push(` extends ${types.join(", ")}`);
          }
          if (clause.type === "implements_clause") {
            const types = clause.namedChildren.filter((n) => n.type !== "implements").map((n) => n.text);
            if (types.length) parts.push(` implements ${types.join(", ")}`);
          }
        }
      }
    }
    return parts.join("");
  }
  /**
   * Extract interface extends clause
   */
  extractInterfaceExtends(node) {
    for (const child of node.namedChildren) {
      if (child.type === "extends_type_clause" || child.type === "extends_clause") {
        const types = child.namedChildren.map((n) => n.text);
        return types.length ? ` extends ${types.join(", ")}` : "";
      }
    }
    return "";
  }
  /**
   * Extract type alias value (truncated)
   */
  extractTypeValue(node) {
    const value = node.childForFieldName("value");
    if (value) {
      const text2 = value.text;
      return text2.length > 50 ? text2.slice(0, 50) + "..." : text2;
    }
    return "...";
  }
  /**
   * Extract variable type annotation
   */
  extractVariableType(node) {
    const type = node.childForFieldName("type");
    if (type) {
      return type.text.replace(/^:\s*/, "");
    }
    return null;
  }
  /**
   * Extract property type annotation
   */
  extractPropertyType(node) {
    const type = node.childForFieldName("type");
    if (type) {
      return type.text.replace(/^:\s*/, "");
    }
    return null;
  }
  /**
   * Extract JSDoc documentation
   */
  extractDocumentation(node) {
    const nodeToCheck = node.parent?.type === "export_statement" ? node.parent : node;
    let sibling = nodeToCheck.previousSibling;
    while (sibling) {
      if (sibling.type === "comment") {
        const text2 = sibling.text;
        if (text2.startsWith("/**") && text2.endsWith("*/")) {
          return text2.slice(3, -2).split("\n").map(
            (line) => line.trim().replace(/^\*\s?/, "").trim()
          ).filter((line) => line.length > 0 && !line.startsWith("@")).join(" ").trim();
        }
        break;
      }
      if (sibling.type !== "comment" && sibling.isNamed) {
        break;
      }
      sibling = sibling.previousSibling;
    }
    return void 0;
  }
  // ============================================================================
  // Import Extraction
  // ============================================================================
  /**
   * Extract all import statements
   */
  extractImports(rootNode) {
    const imports = [];
    const importNodes = rootNode.descendantsOfType("import_statement");
    for (const node of importNodes) {
      const importStatement = this.parseImportStatement(node);
      if (importStatement) {
        imports.push(importStatement);
      }
    }
    const callNodes = rootNode.descendantsOfType("call_expression");
    for (const node of callNodes) {
      const func = node.childForFieldName("function");
      if (func?.text === "require") {
        const args = node.childForFieldName("arguments");
        if (args && args.namedChildren[0]) {
          const source = args.namedChildren[0].text.replace(/['"]/g, "");
          imports.push({
            type: "require",
            source,
            symbols: [],
            line: node.startPosition.row + 1,
            typeOnly: false
          });
        }
      }
    }
    const dynamicImports = rootNode.descendantsOfType("import");
    for (const node of dynamicImports) {
      if (node.parent?.type === "call_expression") {
        const args = node.parent.childForFieldName("arguments");
        if (args && args.namedChildren[0]) {
          const source = args.namedChildren[0].text.replace(/['"]/g, "");
          imports.push({
            type: "dynamic",
            source,
            symbols: [],
            line: node.startPosition.row + 1,
            typeOnly: false
          });
        }
      }
    }
    return imports;
  }
  /**
   * Parse a single import statement
   */
  parseImportStatement(node) {
    const line = node.startPosition.row + 1;
    const typeOnly = node.children.some((c) => c.text === "type");
    const source = node.childForFieldName("source");
    if (!source) return null;
    const sourceText = source.text.replace(/['"]/g, "");
    if (node.namedChildCount === 1) {
      return {
        type: "side_effect",
        source: sourceText,
        symbols: [],
        line,
        typeOnly: false
      };
    }
    const symbols = [];
    let importType = "named";
    for (const child of node.namedChildren) {
      if (child.type === "identifier") {
        importType = "default";
        symbols.push({ local: child.text });
      }
      if (child.type === "namespace_import") {
        importType = "namespace";
        const alias = child.firstNamedChild;
        if (alias && alias.type === "identifier") {
          symbols.push({ local: alias.text, imported: "*" });
        }
      }
      if (child.type === "named_imports") {
        for (const specifier of child.namedChildren) {
          if (specifier.type === "import_specifier") {
            const name = specifier.childForFieldName("name");
            const alias = specifier.childForFieldName("alias");
            if (name) {
              symbols.push({
                local: alias?.text || name.text,
                imported: name.text
              });
            }
          }
        }
      }
      if (child.type === "import_clause") {
        for (const clauseChild of child.namedChildren) {
          if (clauseChild.type === "identifier") {
            importType = "default";
            symbols.push({ local: clauseChild.text });
          }
          if (clauseChild.type === "namespace_import") {
            importType = "namespace";
            const alias = clauseChild.firstNamedChild;
            if (alias && alias.type === "identifier") {
              symbols.push({ local: alias.text, imported: "*" });
            }
          }
          if (clauseChild.type === "named_imports") {
            importType = "named";
            for (const specifier of clauseChild.namedChildren) {
              if (specifier.type === "import_specifier") {
                const name = specifier.childForFieldName("name");
                const alias = specifier.childForFieldName("alias");
                if (name) {
                  symbols.push({
                    local: alias?.text || name.text,
                    imported: name.text
                  });
                }
              }
            }
          }
        }
      }
    }
    return {
      type: importType,
      source: sourceText,
      symbols,
      line,
      typeOnly
    };
  }
  // ============================================================================
  // Export Extraction
  // ============================================================================
  /**
   * Extract all export statements
   */
  extractExports(rootNode) {
    const exports$1 = [];
    const exportNodes = rootNode.descendantsOfType("export_statement");
    for (const node of exportNodes) {
      const exportStatement = this.parseExportStatement(node);
      if (exportStatement) {
        exports$1.push(exportStatement);
      }
    }
    return exports$1;
  }
  /**
   * Parse a single export statement
   */
  parseExportStatement(node) {
    const line = node.startPosition.row + 1;
    const symbols = [];
    let exportType = "named";
    let source;
    const sourceNode = node.childForFieldName("source");
    if (sourceNode) {
      source = sourceNode.text.replace(/['"]/g, "");
    }
    for (const child of node.namedChildren) {
      if (child.type === "identifier" && node.children.some((c) => c.text === "default")) {
        exportType = "default";
        symbols.push({ local: child.text });
      }
      if ((child.type === "function_declaration" || child.type === "class_declaration") && node.children.some((c) => c.text === "default")) {
        exportType = "default";
        const name = child.childForFieldName("name");
        symbols.push({ local: name?.text || "default" });
      }
      if (child.type === "export_clause") {
        for (const specifier of child.namedChildren) {
          if (specifier.type === "export_specifier") {
            const name = specifier.childForFieldName("name");
            const alias = specifier.childForFieldName("alias");
            if (name) {
              symbols.push({
                local: name.text,
                exported: alias?.text
              });
            }
          }
        }
        exportType = source ? "re_export" : "named";
      }
      if (child.type === "namespace_export" || child.text === "*") {
        exportType = "all";
        symbols.push({ local: "*" });
      }
      if (child.type === "function_declaration" || child.type === "class_declaration" || child.type === "lexical_declaration") {
        const name = child.childForFieldName("name");
        if (name) {
          symbols.push({ local: name.text });
        } else if (child.type === "lexical_declaration") {
          for (const declarator of child.namedChildren) {
            if (declarator.type === "variable_declarator") {
              const varName = declarator.childForFieldName("name");
              if (varName) {
                symbols.push({ local: varName.text });
              }
            }
          }
        }
      }
      if (child.type === "type_alias_declaration" || child.type === "interface_declaration") {
        const name = child.childForFieldName("name");
        if (name) {
          symbols.push({ local: name.text });
        }
      }
    }
    if (source && symbols.length === 0) {
      const hasNamespaceExport = node.children.some(
        (c) => c.type === "namespace_export" || c.text === "*"
      );
      if (hasNamespaceExport) {
        exportType = "all";
        symbols.push({ local: "*" });
      }
    }
    if (symbols.length === 0) return null;
    return {
      type: exportType,
      symbols,
      source,
      line
    };
  }
  // ============================================================================
  // Error Detection
  // ============================================================================
  /**
   * Find parse errors in AST
   */
  findErrors(rootNode) {
    const errors = [];
    const walk = (node) => {
      if (node.type === "ERROR" || node.hasError) {
        errors.push({
          message: `Syntax error: unexpected ${node.type}`,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          nodeType: node.type
        });
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(rootNode);
    return errors;
  }
}
class SymbolExtractor {
  // ============================================================================
  // Processing Methods
  // ============================================================================
  /**
   * Process symbols from multiple parse results into a Map
   * @param parseResults - Array of parse results
   * @returns Map keyed by unique symbol ID
   */
  processSymbols(parseResults) {
    const symbolMap = /* @__PURE__ */ new Map();
    for (const result of parseResults) {
      for (const symbol of result.symbols) {
        const key = this.createSymbolKey(symbol);
        symbolMap.set(key, symbol);
      }
    }
    return symbolMap;
  }
  /**
   * Create a unique key for a symbol
   * @param symbol - Symbol entry
   * @returns Unique key string
   */
  createSymbolKey(symbol) {
    return `${symbol.file}#${symbol.name}#${String(symbol.line)}`;
  }
  // ============================================================================
  // Filtering Methods
  // ============================================================================
  /**
   * Filter symbols by kind
   * @param symbols - Array of symbols
   * @param kind - Symbol kind to filter by
   * @returns Filtered symbols
   */
  filterByKind(symbols, kind) {
    return symbols.filter((s) => s.kind === kind);
  }
  /**
   * Get only exported symbols
   * @param symbols - Array of symbols
   * @returns Exported symbols only
   */
  getExportedSymbols(symbols) {
    return symbols.filter((s) => s.exported);
  }
  /**
   * Get top-level symbols (no parent)
   * @param symbols - Array of symbols
   * @returns Top-level symbols
   */
  getTopLevelSymbols(symbols) {
    return symbols.filter((s) => !s.parentId);
  }
  /**
   * Get child symbols of a parent
   * @param symbols - Array of symbols
   * @param parentId - Parent symbol ID
   * @returns Child symbols
   */
  getChildSymbols(symbols, parentId) {
    return symbols.filter((s) => s.parentId === parentId);
  }
  // ============================================================================
  // Hierarchy Methods
  // ============================================================================
  /**
   * Build a hierarchy tree from flat symbol list
   * @param symbols - Array of symbols
   * @returns Tree structure of symbols
   */
  buildHierarchy(symbols) {
    const symbolMap = /* @__PURE__ */ new Map();
    const childrenMap = /* @__PURE__ */ new Map();
    for (const symbol of symbols) {
      symbolMap.set(symbol.id, symbol);
      if (symbol.parentId) {
        const children = childrenMap.get(symbol.parentId) || [];
        children.push(symbol);
        childrenMap.set(symbol.parentId, children);
      }
    }
    const buildNode = (symbol) => {
      const children = childrenMap.get(symbol.id) || [];
      return {
        symbol,
        children: children.map(buildNode)
      };
    };
    const topLevel = symbols.filter((s) => !s.parentId);
    return topLevel.map(buildNode);
  }
  // ============================================================================
  // Grouping Methods
  // ============================================================================
  /**
   * Group symbols by file path
   * @param symbols - Array of symbols
   * @returns Map grouped by file
   */
  groupByFile(symbols) {
    const groups = /* @__PURE__ */ new Map();
    for (const symbol of symbols) {
      const existing = groups.get(symbol.file) || [];
      existing.push(symbol);
      groups.set(symbol.file, existing);
    }
    return groups;
  }
  /**
   * Group symbols by kind
   * @param symbols - Array of symbols
   * @returns Map grouped by kind
   */
  groupByKind(symbols) {
    const groups = /* @__PURE__ */ new Map();
    for (const symbol of symbols) {
      const existing = groups.get(symbol.kind) || [];
      existing.push(symbol);
      groups.set(symbol.kind, existing);
    }
    return groups;
  }
  // ============================================================================
  // Search Methods
  // ============================================================================
  /**
   * Search symbols by name (case-insensitive partial match)
   * @param symbols - Array of symbols
   * @param query - Search query
   * @returns Matching symbols
   */
  searchByName(symbols, query) {
    const lowerQuery = query.toLowerCase();
    return symbols.filter((s) => s.name.toLowerCase().includes(lowerQuery));
  }
  /**
   * Find symbols by exact name match
   * @param symbols - Array of symbols
   * @param name - Exact name to match
   * @returns Matching symbols (may be multiple across files)
   */
  findByName(symbols, name) {
    return symbols.filter((s) => s.name === name);
  }
  /**
   * Find symbol at specific file and line location
   * @param symbols - Array of symbols
   * @param file - File path
   * @param line - Line number
   * @returns Symbol at location or undefined
   */
  findAtLocation(symbols, file, line) {
    return symbols.find(
      (s) => s.file === file && line >= s.line && line <= s.endLine
    );
  }
  // ============================================================================
  // Statistics Methods
  // ============================================================================
  /**
   * Get statistics about symbols
   * @param symbols - Array of symbols
   * @returns Symbol statistics
   */
  getStatistics(symbols) {
    const byKind = {
      class: 0,
      interface: 0,
      function: 0,
      method: 0,
      property: 0,
      variable: 0,
      constant: 0,
      type: 0,
      enum: 0,
      enum_member: 0,
      namespace: 0,
      module: 0
    };
    const byFile = {};
    let exported = 0;
    let documented = 0;
    for (const symbol of symbols) {
      byKind[symbol.kind]++;
      byFile[symbol.file] = (byFile[symbol.file] || 0) + 1;
      if (symbol.exported) {
        exported++;
      }
      if (symbol.documentation) {
        documented++;
      }
    }
    const total = symbols.length;
    const documentationCoverage = total > 0 ? documented / total : 0;
    return {
      total,
      byKind,
      byFile,
      exported,
      documented,
      documentationCoverage
    };
  }
  // ============================================================================
  // Sorting Methods
  // ============================================================================
  /**
   * Sort symbols by specified criteria
   * @param symbols - Array of symbols
   * @param criteria - Sort criteria
   * @returns New sorted array
   */
  sortSymbols(symbols, criteria) {
    const sorted = [...symbols];
    switch (criteria) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "file":
        sorted.sort((a, b) => {
          const fileCompare = a.file.localeCompare(b.file);
          if (fileCompare !== 0) return fileCompare;
          return a.line - b.line;
        });
        break;
      case "references":
        sorted.sort((a, b) => b.references - a.references);
        break;
      case "line":
        sorted.sort((a, b) => {
          const fileCompare = a.file.localeCompare(b.file);
          if (fileCompare !== 0) return fileCompare;
          return a.line - b.line;
        });
        break;
    }
    return sorted;
  }
  // ============================================================================
  // Deduplication Methods
  // ============================================================================
  /**
   * Remove duplicate symbols based on symbol key
   * @param symbols - Array of symbols
   * @returns Deduplicated array
   */
  deduplicate(symbols) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(symbol);
      }
    }
    return result;
  }
  /**
   * Merge symbols from multiple parse results
   * @param parseResults - Array of parse results
   * @returns Merged and deduplicated symbols
   */
  mergeSymbols(parseResults) {
    const allSymbols = [];
    for (const result of parseResults) {
      allSymbols.push(...result.symbols);
    }
    return this.deduplicate(allSymbols);
  }
}
class DependencyGraphBuilder {
  /** All dependency edges */
  edges = [];
  /** Map of file -> files that depend on it */
  dependentsMap = /* @__PURE__ */ new Map();
  /** Map of file -> files it depends on */
  dependenciesMap = /* @__PURE__ */ new Map();
  /** Path aliases for resolution (e.g., "@/" -> "src/") */
  fileAliases = /* @__PURE__ */ new Map();
  /** All known file paths (for resolution) */
  knownFiles = /* @__PURE__ */ new Set();
  // ============================================================================
  // Main Build Method
  // ============================================================================
  /**
   * Build dependency graph from parse results
   * @param parseResults - Results from parsing files
   * @param projectPath - Root project path for resolution
   * @returns Array of dependency edges
   */
  build(parseResults, projectPath) {
    this.edges = [];
    this.dependentsMap.clear();
    this.dependenciesMap.clear();
    this.knownFiles.clear();
    for (const result of parseResults) {
      const normalizedPath = this.normalizePath(result.file);
      this.knownFiles.add(normalizedPath);
    }
    for (const result of parseResults) {
      const fromFile = this.normalizePath(result.file);
      for (const imp of result.imports) {
        const edge = this.createEdgeFromImport(imp, fromFile, projectPath);
        if (edge) {
          this.addEdge(edge);
        }
      }
      for (const exp of result.exports) {
        if (exp.source) {
          const edge = this.createEdgeFromExport(exp, fromFile, projectPath);
          if (edge) {
            this.addEdge(edge);
          }
        }
      }
    }
    return this.edges;
  }
  // ============================================================================
  // Path Resolution
  // ============================================================================
  /**
   * Resolve an import path to an absolute file path
   * @param importPath - The import source path
   * @param fromFile - File containing the import
   * @param projectPath - Project root path
   * @returns Resolved absolute path or null if external/not found
   */
  resolveImport(importPath, fromFile, projectPath) {
    if (this.isExternalModule(importPath)) {
      return null;
    }
    const normalizedFromFile = this.normalizePath(fromFile);
    const normalizedProjectPath = this.normalizePath(projectPath);
    let resolvedPath;
    for (const [alias, target] of this.fileAliases) {
      if (importPath.startsWith(alias)) {
        const remainder = importPath.slice(alias.length);
        const targetPath = posix.join(normalizedProjectPath, target, remainder);
        const resolved = this.tryResolveFile(targetPath);
        if (resolved) {
          return resolved;
        }
      }
    }
    if (importPath.startsWith(".")) {
      const fromDir = posix.dirname(normalizedFromFile);
      resolvedPath = posix.resolve(fromDir, importPath);
    } else {
      resolvedPath = posix.resolve(normalizedProjectPath, importPath);
    }
    return this.tryResolveFile(resolvedPath);
  }
  /**
   * Try to resolve a file path, checking extensions and index files
   * @param basePath - Base path without extension
   * @returns Resolved path or null
   */
  tryResolveFile(basePath) {
    const normalizedBase = this.normalizePath(basePath);
    if (this.knownFiles.has(normalizedBase)) {
      return normalizedBase;
    }
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];
    for (const ext of extensions) {
      const withExt = normalizedBase + ext;
      if (this.knownFiles.has(withExt)) {
        return withExt;
      }
    }
    const indexExtensions = [
      "/index.ts",
      "/index.tsx",
      "/index.js",
      "/index.jsx"
    ];
    for (const indexExt of indexExtensions) {
      const withIndex = normalizedBase + indexExt;
      if (this.knownFiles.has(withIndex)) {
        return withIndex;
      }
    }
    return null;
  }
  /**
   * Check if module is external (npm package)
   * @param source - Import source
   * @returns True if external module
   */
  isExternalModule(source) {
    if (source.startsWith(".") || source.startsWith("/")) {
      return false;
    }
    for (const alias of this.fileAliases.keys()) {
      if (source.startsWith(alias)) {
        return false;
      }
    }
    if (source.startsWith("@")) {
      if (source.startsWith("@/")) {
        return false;
      }
      return true;
    }
    return true;
  }
  // ============================================================================
  // Alias Management
  // ============================================================================
  /**
   * Register a path alias for resolution
   * @param alias - Alias pattern (e.g., "@/")
   * @param target - Target path (e.g., "src/")
   */
  registerAlias(alias, target) {
    this.fileAliases.set(alias, target);
  }
  /**
   * Clear all registered aliases
   */
  clearAliases() {
    this.fileAliases.clear();
  }
  // ============================================================================
  // Graph Queries
  // ============================================================================
  /**
   * Get files that import the given file
   * @param filePath - File to check
   * @returns Array of importing file paths
   */
  getDependents(filePath) {
    const normalized = this.normalizePath(filePath);
    const dependents = this.dependentsMap.get(normalized);
    return dependents ? Array.from(dependents) : [];
  }
  /**
   * Get files imported by the given file
   * @param filePath - File to check
   * @returns Array of imported file paths
   */
  getDependencies(filePath) {
    const normalized = this.normalizePath(filePath);
    const dependencies = this.dependenciesMap.get(normalized);
    return dependencies ? Array.from(dependencies) : [];
  }
  /**
   * Get all edges involving a file (both in and out)
   * @param filePath - File to check
   * @returns All edges involving the file
   */
  getEdgesForFile(filePath) {
    const normalized = this.normalizePath(filePath);
    return this.edges.filter(
      (e) => e.from === normalized || e.to === normalized
    );
  }
  /**
   * Get all edges in the graph
   * @returns All dependency edges
   */
  getAllEdges() {
    return [...this.edges];
  }
  // ============================================================================
  // Cycle Detection
  // ============================================================================
  /**
   * Find circular dependencies in the graph
   * @returns Array of cycles (each cycle is array of file paths)
   */
  findCircularDependencies() {
    const cycles = [];
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const path2 = [];
    const dfs = (node) => {
      if (recursionStack.has(node)) {
        const cycleStart = path2.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path2.slice(cycleStart);
          cycle.push(node);
          cycles.push(cycle);
        }
        return;
      }
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      recursionStack.add(node);
      path2.push(node);
      const dependencies = this.dependenciesMap.get(node);
      if (dependencies) {
        for (const dep of dependencies) {
          dfs(dep);
        }
      }
      path2.pop();
      recursionStack.delete(node);
    };
    for (const file of this.knownFiles) {
      if (!visited.has(file)) {
        dfs(file);
      }
    }
    return cycles;
  }
  // ============================================================================
  // Analysis Methods
  // ============================================================================
  /**
   * Get files sorted by total connection count
   * @returns Files sorted by most connected first
   */
  getSortedByConnections() {
    const connectionCounts = /* @__PURE__ */ new Map();
    for (const file of this.knownFiles) {
      const dependents = this.dependentsMap.get(file)?.size || 0;
      const dependencies = this.dependenciesMap.get(file)?.size || 0;
      connectionCounts.set(file, dependents + dependencies);
    }
    return Array.from(connectionCounts.entries()).map(([file, connections]) => ({ file, connections })).sort((a, b) => b.connections - a.connections);
  }
  /**
   * Calculate the depth of dependencies from a file
   * @param filePath - Starting file
   * @returns Maximum depth of dependency chain
   */
  calculateDepth(filePath) {
    const normalized = this.normalizePath(filePath);
    const visited = /* @__PURE__ */ new Set();
    const dfs = (node, depth) => {
      if (visited.has(node)) {
        return depth;
      }
      visited.add(node);
      const dependencies = this.dependenciesMap.get(node);
      if (!dependencies || dependencies.size === 0) {
        return depth;
      }
      let maxDepth = depth;
      for (const dep of dependencies) {
        const depDepth = dfs(dep, depth + 1);
        maxDepth = Math.max(maxDepth, depDepth);
      }
      return maxDepth;
    };
    return dfs(normalized, 0);
  }
  /**
   * Get statistics about the dependency graph
   * @returns Dependency graph statistics
   */
  getStatistics() {
    const edgesByType = {
      import: 0,
      require: 0,
      dynamic: 0,
      export_from: 0,
      type_import: 0,
      side_effect: 0
    };
    for (const edge of this.edges) {
      edgesByType[edge.type]++;
    }
    const circularDependencies = this.findCircularDependencies().length;
    const mostConnectedFiles = this.getSortedByConnections().slice(0, 10);
    return {
      totalFiles: this.knownFiles.size,
      totalEdges: this.edges.length,
      edgesByType,
      circularDependencies,
      mostConnectedFiles
    };
  }
  // ============================================================================
  // Private Helpers
  // ============================================================================
  /**
   * Create a dependency edge from an import statement
   */
  createEdgeFromImport(imp, fromFile, projectPath) {
    const resolved = this.resolveImport(imp.source, fromFile, projectPath);
    if (!resolved) {
      return null;
    }
    let type;
    switch (imp.type) {
      case "require":
        type = "require";
        break;
      case "dynamic":
        type = "dynamic";
        break;
      case "side_effect":
        type = "side_effect";
        break;
      default:
        type = imp.typeOnly ? "type_import" : "import";
    }
    return {
      from: fromFile,
      to: resolved,
      type,
      symbols: imp.symbols.map((s) => s.local),
      statement: this.buildStatementString(imp),
      line: imp.line
    };
  }
  /**
   * Create a dependency edge from a re-export statement
   */
  createEdgeFromExport(exp, fromFile, projectPath) {
    if (!exp.source) {
      return null;
    }
    const resolved = this.resolveImport(exp.source, fromFile, projectPath);
    if (!resolved) {
      return null;
    }
    return {
      from: fromFile,
      to: resolved,
      type: "export_from",
      symbols: exp.symbols.map((s) => s.local),
      statement: `export from '${exp.source}'`,
      line: exp.line
    };
  }
  /**
   * Add an edge to the graph and update maps
   */
  addEdge(edge) {
    this.edges.push(edge);
    if (!this.dependentsMap.has(edge.to)) {
      this.dependentsMap.set(edge.to, /* @__PURE__ */ new Set());
    }
    this.dependentsMap.get(edge.to)?.add(edge.from);
    if (!this.dependenciesMap.has(edge.from)) {
      this.dependenciesMap.set(edge.from, /* @__PURE__ */ new Set());
    }
    this.dependenciesMap.get(edge.from)?.add(edge.to);
  }
  /**
   * Build a statement string from an import
   */
  buildStatementString(imp) {
    switch (imp.type) {
      case "default":
        return `import ${imp.symbols[0]?.local || ""} from '${imp.source}'`;
      case "namespace":
        return `import * as ${imp.symbols[0]?.local || ""} from '${imp.source}'`;
      case "named": {
        const syms = imp.symbols.map(
          (s) => s.imported && s.imported !== s.local ? `${s.imported} as ${s.local}` : s.local
        ).join(", ");
        return `import { ${syms} } from '${imp.source}'`;
      }
      case "side_effect":
        return `import '${imp.source}'`;
      case "require":
        return `require('${imp.source}')`;
      case "dynamic":
        return `import('${imp.source}')`;
      default:
        return `import from '${imp.source}'`;
    }
  }
  /**
   * Normalize a file path for consistent comparisons
   * Always uses forward slashes for cross-platform consistency
   */
  normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
  }
}
class ReferenceCounter {
  /** Map of symbol key to reference count */
  referenceCounts = /* @__PURE__ */ new Map();
  /** Map of symbol key to importance score */
  importanceScores = /* @__PURE__ */ new Map();
  /** Index of symbol name -> symbol entries for fast lookup */
  symbolIndex = /* @__PURE__ */ new Map();
  /** Stored symbols for later queries */
  symbols = [];
  // ============================================================================
  // Main Counting Method
  // ============================================================================
  /**
   * Count references to symbols from imports
   * @param symbols - All symbols in the codebase
   * @param parseResults - Parse results with import information
   * @returns Map of symbol key to reference count
   */
  count(symbols, parseResults) {
    this.referenceCounts.clear();
    this.symbolIndex.clear();
    this.symbols = symbols;
    for (const symbol of symbols) {
      const existing = this.symbolIndex.get(symbol.name) || [];
      existing.push(symbol);
      this.symbolIndex.set(symbol.name, existing);
      const key = this.createSymbolKey(symbol);
      this.referenceCounts.set(key, 0);
    }
    for (const result of parseResults) {
      for (const imp of result.imports) {
        for (const importedSymbol of imp.symbols) {
          const symbolName = importedSymbol.imported || importedSymbol.local;
          this.incrementReferenceCount(symbolName, result.file);
        }
      }
    }
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      symbol.references = this.referenceCounts.get(key) || 0;
    }
    return new Map(this.referenceCounts);
  }
  // ============================================================================
  // Top Referenced Query
  // ============================================================================
  /**
   * Get top N most referenced symbols
   * @param n - Number of symbols to return
   * @returns Array of symbols sorted by reference count descending
   */
  getTopReferenced(n) {
    const sorted = [...this.symbols].sort((a, b) => {
      const aCount = this.getReferenceCount(a);
      const bCount = this.getReferenceCount(b);
      return bCount - aCount;
    });
    return sorted.slice(0, n);
  }
  // ============================================================================
  // Importance Calculation
  // ============================================================================
  /**
   * Calculate importance scores using PageRank-style algorithm
   * Symbols referenced by important files are more important
   * @param symbols - All symbols
   * @param dependencies - Dependency edges
   * @returns Map of symbol key to importance score (0-1)
   */
  calculateImportance(symbols, dependencies) {
    this.importanceScores.clear();
    if (symbols.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const fileImportance = this.calculateFileImportance(dependencies);
    const initialScore = 1 / symbols.length;
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      this.importanceScores.set(key, initialScore);
    }
    const dampingFactor = 0.85;
    const iterations = 20;
    const symbolReferencers = this.buildSymbolReferencers(symbols, dependencies);
    for (let i = 0; i < iterations; i++) {
      const newScores = /* @__PURE__ */ new Map();
      for (const symbol of symbols) {
        const key = this.createSymbolKey(symbol);
        const referencers = symbolReferencers.get(key) || [];
        let incomingScore = 0;
        for (const refFile of referencers) {
          const fileScore = fileImportance.get(refFile) || 0;
          const outgoingRefs = this.countOutgoingReferences(refFile, dependencies);
          if (outgoingRefs > 0) {
            incomingScore += fileScore / outgoingRefs;
          }
        }
        const baseScore = (1 - dampingFactor) / symbols.length;
        const newScore = baseScore + dampingFactor * incomingScore;
        newScores.set(key, newScore);
      }
      for (const [key, score] of newScores) {
        this.importanceScores.set(key, score);
      }
    }
    this.normalizeScores();
    return new Map(this.importanceScores);
  }
  // ============================================================================
  // Ranked Symbols
  // ============================================================================
  /**
   * Get symbols with combined ranking from references and importance
   * @param symbols - All symbols
   * @param dependencies - Dependency edges
   * @returns Array of ranked symbols sorted by combined score
   */
  getRankedSymbols(symbols, dependencies) {
    if (this.symbols.length === 0 || this.symbols !== symbols) {
      this.count(symbols, []);
    }
    this.calculateImportance(symbols, dependencies);
    const maxRefs = Math.max(
      1,
      ...symbols.map((s) => this.getReferenceCount(s))
    );
    const ranked = symbols.map((symbol) => {
      const key = this.createSymbolKey(symbol);
      const referenceCount = this.referenceCounts.get(key) || 0;
      const importanceScore = this.importanceScores.get(key) || 0;
      const normalizedRefs = referenceCount / maxRefs;
      const combinedScore = 0.6 * normalizedRefs + 0.4 * importanceScore;
      return {
        symbol,
        referenceCount,
        importanceScore,
        combinedScore
      };
    });
    ranked.sort((a, b) => b.combinedScore - a.combinedScore);
    return ranked;
  }
  // ============================================================================
  // Query Methods
  // ============================================================================
  /**
   * Get files that reference a symbol
   * @param symbolKey - Symbol key
   * @param dependencies - Dependency edges
   * @returns List of file paths that reference this symbol
   */
  getReferencingSources(symbolKey, dependencies) {
    const sources = /* @__PURE__ */ new Set();
    const parts = symbolKey.split("#");
    const symbolName = parts.length >= 2 ? parts[1] : symbolKey;
    for (const edge of dependencies) {
      if (edge.symbols.includes(symbolName)) {
        sources.add(edge.from);
      }
    }
    return Array.from(sources);
  }
  /**
   * Calculate clustering coefficient for a symbol
   * How interconnected are the files that reference this symbol?
   * @param symbol - Symbol to analyze
   * @param dependencies - Dependency edges
   * @returns Clustering coefficient (0-1)
   */
  getClusteringCoefficient(symbol, dependencies) {
    const key = this.createSymbolKey(symbol);
    const referencers = this.getReferencingSources(key, dependencies);
    if (referencers.length < 2) {
      return 0;
    }
    let connections = 0;
    const maxConnections = referencers.length * (referencers.length - 1) / 2;
    for (let i = 0; i < referencers.length; i++) {
      for (let j = i + 1; j < referencers.length; j++) {
        const hasConnection = dependencies.some(
          (e) => e.from === referencers[i] && e.to === referencers[j] || e.from === referencers[j] && e.to === referencers[i]
        );
        if (hasConnection) {
          connections++;
        }
      }
    }
    return maxConnections > 0 ? connections / maxConnections : 0;
  }
  /**
   * Get reference count for a symbol
   * @param symbol - Symbol to check
   * @returns Reference count
   */
  getReferenceCount(symbol) {
    const key = this.createSymbolKey(symbol);
    return this.referenceCounts.get(key) || 0;
  }
  /**
   * Get importance score for a symbol
   * @param symbol - Symbol to check
   * @returns Importance score (0-1)
   */
  getImportanceScore(symbol) {
    const key = this.createSymbolKey(symbol);
    return this.importanceScores.get(key) || 0;
  }
  // ============================================================================
  // Statistics
  // ============================================================================
  /**
   * Get statistics about references
   * @param symbols - Symbols to analyze
   * @returns Reference statistics
   */
  getStatistics(symbols) {
    if (symbols.length === 0) {
      return {
        totalReferences: 0,
        averageReferences: 0,
        maxReferences: 0,
        symbolsWithReferences: 0,
        orphanedExports: 0,
        coveragePercent: 0
      };
    }
    let totalReferences = 0;
    let maxReferences = 0;
    let symbolsWithReferences = 0;
    let orphanedExports = 0;
    for (const symbol of symbols) {
      const refs = this.getReferenceCount(symbol);
      totalReferences += refs;
      maxReferences = Math.max(maxReferences, refs);
      if (refs > 0) {
        symbolsWithReferences++;
      }
      if (symbol.exported && refs === 0) {
        orphanedExports++;
      }
    }
    const averageReferences = totalReferences / symbols.length;
    const coveragePercent = symbolsWithReferences / symbols.length * 100;
    return {
      totalReferences,
      averageReferences,
      maxReferences,
      symbolsWithReferences,
      orphanedExports,
      coveragePercent
    };
  }
  // ============================================================================
  // Private Helpers
  // ============================================================================
  /**
   * Create unique key for a symbol
   */
  createSymbolKey(symbol) {
    return `${symbol.file}#${symbol.name}#${String(symbol.line)}`;
  }
  /**
   * Increment reference count for a symbol by name
   */
  incrementReferenceCount(symbolName, _fromFile) {
    const matchingSymbols = this.symbolIndex.get(symbolName);
    if (!matchingSymbols) return;
    for (const symbol of matchingSymbols) {
      if (symbol.exported) {
        const key = this.createSymbolKey(symbol);
        const current = this.referenceCounts.get(key) || 0;
        this.referenceCounts.set(key, current + 1);
      }
    }
  }
  /**
   * Calculate importance of each file based on how many files depend on it
   */
  calculateFileImportance(dependencies) {
    const fileCounts = /* @__PURE__ */ new Map();
    for (const edge of dependencies) {
      const current = fileCounts.get(edge.to) || 0;
      fileCounts.set(edge.to, current + 1);
    }
    const maxCount = Math.max(1, ...Array.from(fileCounts.values()));
    const normalized = /* @__PURE__ */ new Map();
    for (const [file, count] of fileCounts) {
      normalized.set(file, count / maxCount);
    }
    return normalized;
  }
  /**
   * Build a map of symbol key -> files that reference that symbol
   */
  buildSymbolReferencers(symbols, dependencies) {
    const referencers = /* @__PURE__ */ new Map();
    for (const symbol of symbols) {
      const key = this.createSymbolKey(symbol);
      referencers.set(key, []);
    }
    for (const edge of dependencies) {
      for (const importedName of edge.symbols) {
        const matchingSymbols = this.symbolIndex.get(importedName);
        if (!matchingSymbols) continue;
        for (const symbol of matchingSymbols) {
          if (symbol.exported) {
            const key = this.createSymbolKey(symbol);
            const refs = referencers.get(key) || [];
            if (!refs.includes(edge.from)) {
              refs.push(edge.from);
              referencers.set(key, refs);
            }
          }
        }
      }
    }
    return referencers;
  }
  /**
   * Count how many symbols a file references (outgoing edges)
   */
  countOutgoingReferences(filePath, dependencies) {
    let count = 0;
    for (const edge of dependencies) {
      if (edge.from === filePath) {
        count += edge.symbols.length;
      }
    }
    return count;
  }
  /**
   * Normalize importance scores to 0-1 range
   */
  normalizeScores() {
    const scores = Array.from(this.importanceScores.values());
    if (scores.length === 0) return;
    const maxScore = Math.max(...scores);
    if (maxScore === 0) return;
    for (const [key, score] of this.importanceScores) {
      this.importanceScores.set(key, score / maxScore);
    }
  }
}
class RepoMapFormatter {
  /**
   * Approximate characters per token for GPT-like models
   * This is a conservative estimate (actual varies by content)
   */
  static CHARS_PER_TOKEN = 4;
  /**
   * Maximum signature length before truncation
   */
  static MAX_SIGNATURE_LENGTH = 80;
  /**
   * Symbol prefixes for visual differentiation
   */
  static SYMBOL_PREFIXES = {
    class: "⊕",
    // ⊕
    interface: "◇",
    // ◇
    function: "ƒ",
    // ƒ
    method: "·",
    // ·
    property: ".",
    // .
    variable: "→",
    // →
    constant: "∷",
    // ∷
    type: "⊤",
    // ⊤
    enum: "⊞",
    // ⊞
    enum_member: "▪",
    // ▪
    namespace: "N",
    module: "M"
  };
  // ============================================================================
  // Main Format Methods
  // ============================================================================
  /**
   * Format repository map as string
   * @param repoMap - Repository map to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(repoMap, options) {
    const mergedOptions = {
      ...DEFAULT_FORMAT_OPTIONS,
      ...options
    };
    switch (mergedOptions.style) {
      case "compact":
        return this.formatCompact(repoMap, mergedOptions);
      case "detailed":
        return this.formatDetailed(repoMap, mergedOptions);
      case "tree":
        return this.formatTree(repoMap, mergedOptions);
      default:
        return this.formatCompact(repoMap, mergedOptions);
    }
  }
  // ============================================================================
  // Compact Format
  // ============================================================================
  /**
   * Format in compact style - maximum info density, minimal tokens
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Compact formatted string
   */
  formatCompact(repoMap, options) {
    const lines = [];
    let currentTokens = 0;
    const header = this.buildCompactHeader(repoMap);
    lines.push(...header);
    currentTokens += this.estimateTokens(header.join("\n"));
    const symbolsToShow = this.selectSymbolsForBudget(
      repoMap.symbols,
      options.maxTokens - currentTokens,
      options.includeSignatures
    );
    if (options.groupByFile) {
      const byFile = this.groupByFile(symbolsToShow);
      const sortedFiles = this.sortFilesByImportance(byFile, repoMap);
      for (const { file, symbols } of sortedFiles) {
        const relativePath = relative(repoMap.projectPath, file);
        const fileHeader = `
## ${this.normalizePath(relativePath)}`;
        if (currentTokens + this.estimateTokens(fileHeader) > options.maxTokens) {
          lines.push("\n... (truncated)");
          break;
        }
        lines.push(fileHeader);
        currentTokens += this.estimateTokens(fileHeader);
        const sortedSymbols = this.sortSymbols(symbols, options.rankByReferences);
        for (const symbol of sortedSymbols) {
          const formattedLine = this.formatSymbolCompact(
            symbol,
            options.includeSignatures,
            options.rankByReferences
          );
          if (currentTokens + this.estimateTokens(formattedLine) > options.maxTokens) {
            lines.push("  ... (truncated)");
            break;
          }
          lines.push(formattedLine);
          currentTokens += this.estimateTokens(formattedLine);
        }
      }
    } else {
      const sortedSymbols = this.sortSymbols(symbolsToShow, options.rankByReferences);
      for (const symbol of sortedSymbols) {
        const formattedLine = this.formatSymbolCompact(
          symbol,
          options.includeSignatures,
          options.rankByReferences
        );
        if (currentTokens + this.estimateTokens(formattedLine) > options.maxTokens) {
          lines.push("... (truncated)");
          break;
        }
        lines.push(formattedLine);
        currentTokens += this.estimateTokens(formattedLine);
      }
    }
    return lines.join("\n");
  }
  /**
   * Build compact header section
   */
  buildCompactHeader(repoMap) {
    return [
      "# Repository Map",
      "",
      `Files: ${String(repoMap.stats.totalFiles)} | Symbols: ${String(repoMap.stats.totalSymbols)} | Dependencies: ${String(repoMap.stats.totalDependencies)}`,
      ""
    ];
  }
  /**
   * Format a single symbol in compact style
   */
  formatSymbolCompact(symbol, includeSignatures, rankByReferences) {
    const prefix = this.getSymbolPrefix(symbol.kind);
    const exportMark = symbol.exported ? "ε" : "";
    const indent = symbol.parentId ? "  " : "";
    const refCount = rankByReferences && symbol.references > 0 ? ` (${String(symbol.references)})` : "";
    let content;
    if (includeSignatures && symbol.signature !== symbol.name) {
      content = this.truncateSignature(
        symbol.signature,
        RepoMapFormatter.MAX_SIGNATURE_LENGTH
      );
    } else {
      content = symbol.name;
    }
    return `${indent}${prefix}${exportMark}${content}${refCount}`;
  }
  // ============================================================================
  // Detailed Format
  // ============================================================================
  /**
   * Format in detailed style - verbose with documentation
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Detailed formatted string
   */
  formatDetailed(repoMap, options) {
    const lines = [];
    let currentTokens = 0;
    lines.push("# Repository Map (Detailed)");
    lines.push("");
    lines.push(`## Summary`);
    lines.push(`- **Project:** ${repoMap.projectPath}`);
    lines.push(`- **Generated:** ${repoMap.generatedAt.toISOString()}`);
    lines.push(`- **Files:** ${String(repoMap.stats.totalFiles)}`);
    lines.push(`- **Symbols:** ${String(repoMap.stats.totalSymbols)}`);
    lines.push(`- **Dependencies:** ${String(repoMap.stats.totalDependencies)}`);
    lines.push("");
    currentTokens = this.estimateTokens(lines.join("\n"));
    lines.push("## Symbol Breakdown");
    for (const [kind, count] of Object.entries(repoMap.stats.symbolBreakdown)) {
      if (count > 0) {
        lines.push(`- ${kind}: ${String(count)}`);
      }
    }
    lines.push("");
    if (options.includeDependencies && repoMap.dependencies.length > 0) {
      lines.push("## Key Dependencies");
      const depLines = [];
      const bySource = /* @__PURE__ */ new Map();
      for (const dep of repoMap.dependencies.slice(0, 20)) {
        const from = relative(repoMap.projectPath, dep.from);
        const to = relative(repoMap.projectPath, dep.to);
        if (!bySource.has(from)) {
          bySource.set(from, []);
        }
        bySource.get(from)?.push(to);
      }
      for (const [from, targets] of bySource) {
        depLines.push(`- \`${this.normalizePath(from)}\` imports:`);
        for (const target of targets.slice(0, 5)) {
          depLines.push(`  - \`${this.normalizePath(target)}\``);
        }
        if (targets.length > 5) {
          depLines.push(`  - ... and ${String(targets.length - 5)} more`);
        }
      }
      lines.push(...depLines);
      lines.push("");
    }
    currentTokens = this.estimateTokens(lines.join("\n"));
    lines.push("## Files");
    lines.push("");
    const byFile = this.groupByFile(repoMap.symbols);
    const sortedFiles = this.sortFilesByImportance(byFile, repoMap);
    for (const { file, symbols } of sortedFiles) {
      const relativePath = this.normalizePath(relative(repoMap.projectPath, file));
      const fileEntry = repoMap.files.find((f) => f.path === file);
      const fileHeader = [`### ${relativePath}`];
      if (fileEntry) {
        fileHeader.push(`*${String(fileEntry.lineCount)} lines, ${String(fileEntry.symbolCount)} symbols*`);
      }
      fileHeader.push("");
      if (currentTokens + this.estimateTokens(fileHeader.join("\n")) > options.maxTokens) {
        lines.push("### ... (truncated)");
        break;
      }
      lines.push(...fileHeader);
      currentTokens += this.estimateTokens(fileHeader.join("\n"));
      const sortedSymbols = this.sortSymbols(symbols, options.rankByReferences);
      for (const symbol of sortedSymbols) {
        const symbolLines = this.formatSymbolDetailed(
          symbol,
          options.includeDocstrings,
          options.rankByReferences
        );
        if (currentTokens + this.estimateTokens(symbolLines.join("\n")) > options.maxTokens) {
          lines.push("*... (truncated)*");
          break;
        }
        lines.push(...symbolLines);
        currentTokens += this.estimateTokens(symbolLines.join("\n"));
      }
      lines.push("");
    }
    return lines.join("\n");
  }
  /**
   * Format a single symbol in detailed style
   */
  formatSymbolDetailed(symbol, includeDocstrings, rankByReferences) {
    const lines = [];
    const prefix = this.getSymbolPrefix(symbol.kind);
    const exportMark = symbol.exported ? " (exported)" : "";
    const refCount = rankByReferences && symbol.references > 0 ? ` [refs: ${String(symbol.references)}]` : "";
    const indent = symbol.parentId ? "  " : "";
    lines.push(`${indent}- ${prefix} **${symbol.name}**${exportMark}${refCount}`);
    if (symbol.signature !== symbol.name) {
      lines.push(`${indent}  \`${symbol.signature}\``);
    }
    if (includeDocstrings && symbol.documentation) {
      const docLines = symbol.documentation.split("\n");
      const doc = docLines[0] ?? "";
      if (doc.length > 100) {
        lines.push(`${indent}  *${doc.substring(0, 100)}...*`);
      } else if (doc.length > 0) {
        lines.push(`${indent}  *${doc}*`);
      }
    }
    return lines;
  }
  // ============================================================================
  // Tree Format
  // ============================================================================
  /**
   * Format in tree style - directory tree structure
   * @param repoMap - Repository map
   * @param options - Format options
   * @returns Tree formatted string
   */
  formatTree(repoMap, options) {
    const lines = [];
    let currentTokens = 0;
    lines.push("# Repository Map (Tree)");
    lines.push("");
    lines.push(`${String(repoMap.stats.totalFiles)} files, ${String(repoMap.stats.totalSymbols)} symbols`);
    lines.push("");
    currentTokens = this.estimateTokens(lines.join("\n"));
    const root = this.buildDirectoryTree(repoMap);
    const treeLines = this.renderDirectoryTree(
      root,
      "",
      true,
      options,
      currentTokens,
      options.maxTokens
    );
    lines.push(...treeLines);
    return lines.join("\n");
  }
  /**
   * Build directory tree structure from repo map
   */
  buildDirectoryTree(repoMap) {
    const root = {
      name: basename(repoMap.projectPath) || "root",
      path: "",
      children: /* @__PURE__ */ new Map(),
      files: []
    };
    const symbolsByFile = this.groupByFile(repoMap.symbols);
    for (const file of repoMap.files) {
      const relativePath = this.normalizePath(relative(repoMap.projectPath, file.path));
      const parts = relativePath.split("/");
      const fileName = parts.pop() ?? "";
      let current = root;
      let currentPath = "";
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: currentPath,
            children: /* @__PURE__ */ new Map(),
            files: []
          });
        }
        current = current.children.get(part) ?? current;
      }
      current.files.push({
        name: fileName,
        file,
        symbols: symbolsByFile.get(file.path) || []
      });
    }
    return root;
  }
  /**
   * Render directory tree as string array
   */
  renderDirectoryTree(node, prefix, isLast, options, currentTokens, maxTokens) {
    const lines = [];
    let tokens = currentTokens;
    const dirs = Array.from(node.children.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
    const items = [
      ...dirs.map((d) => ({ type: "dir", item: d })),
      ...files.map((f) => ({ type: "file", item: f }))
    ];
    for (const [i, currentItem] of items.entries()) {
      const { type, item } = currentItem;
      const isLastItem = i === items.length - 1;
      const connector = isLastItem ? "└──" : "├──";
      const childPrefix = prefix + (isLastItem ? "    " : "│   ");
      if (type === "dir") {
        const dir = item;
        const line = `${prefix}${connector} ${dir.name}/`;
        if (tokens + this.estimateTokens(line) > maxTokens) {
          lines.push(`${prefix}... (truncated)`);
          break;
        }
        lines.push(line);
        tokens += this.estimateTokens(line);
        const childLines = this.renderDirectoryTree(
          dir,
          childPrefix,
          isLastItem,
          options,
          tokens,
          maxTokens
        );
        lines.push(...childLines);
        tokens += this.estimateTokens(childLines.join("\n"));
      } else {
        const fileItem = item;
        const line = `${prefix}${connector} ${fileItem.name}`;
        if (tokens + this.estimateTokens(line) > maxTokens) {
          lines.push(`${prefix}... (truncated)`);
          break;
        }
        lines.push(line);
        tokens += this.estimateTokens(line);
        if (options.includeSignatures && fileItem.symbols.length > 0) {
          const sortedSymbols = this.sortSymbols(fileItem.symbols, options.rankByReferences);
          const topLevelSymbols = sortedSymbols.filter((s) => !s.parentId);
          for (const symbol of topLevelSymbols.slice(0, 10)) {
            const symbolPrefix = this.getSymbolPrefix(symbol.kind);
            const exportMark = symbol.exported ? "ε" : "";
            const refCount = options.rankByReferences && symbol.references > 0 ? ` (${String(symbol.references)})` : "";
            const symbolLine = `${childPrefix}    ${symbolPrefix}${exportMark}${symbol.name}${refCount}`;
            if (tokens + this.estimateTokens(symbolLine) > maxTokens) {
              lines.push(`${childPrefix}    ... (truncated)`);
              break;
            }
            lines.push(symbolLine);
            tokens += this.estimateTokens(symbolLine);
          }
          if (topLevelSymbols.length > 10) {
            lines.push(`${childPrefix}    ... +${String(topLevelSymbols.length - 10)} more`);
          }
        }
      }
    }
    return lines;
  }
  // ============================================================================
  // Token Management
  // ============================================================================
  /**
   * Estimate token count for text
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text2) {
    return Math.ceil(text2.length / RepoMapFormatter.CHARS_PER_TOKEN);
  }
  /**
   * Truncate output to fit token budget
   * @param repoMap - Repository map
   * @param maxTokens - Maximum tokens
   * @returns Truncated formatted string
   */
  truncateToFit(repoMap, maxTokens) {
    let budget = maxTokens;
    let output = this.format(repoMap, {
      ...DEFAULT_FORMAT_OPTIONS,
      maxTokens: budget,
      style: "compact"
    });
    const tokens = this.estimateTokens(output);
    if (tokens > maxTokens) {
      const overshoot = tokens - maxTokens;
      budget = Math.max(0, maxTokens - overshoot - 1);
      output = this.format(repoMap, {
        ...DEFAULT_FORMAT_OPTIONS,
        maxTokens: budget,
        style: "compact"
      });
    }
    return output;
  }
  /**
   * Select symbols that fit within token budget
   * @param symbols - All symbols
   * @param maxTokens - Token budget
   * @param includeSignatures - Whether to include signatures
   * @returns Selected symbols
   */
  selectSymbolsForBudget(symbols, maxTokens, includeSignatures) {
    const sorted = [...symbols].sort((a, b) => {
      if (b.references !== a.references) return b.references - a.references;
      if (a.exported && !b.exported) return -1;
      if (!a.exported && b.exported) return 1;
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return a.name.localeCompare(b.name);
    });
    const selected = [];
    let currentTokens = 0;
    for (const symbol of sorted) {
      const content = includeSignatures ? symbol.signature : symbol.name;
      const estimatedTokens = this.estimateTokens(content) + 2;
      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }
      selected.push(symbol);
      currentTokens += estimatedTokens;
    }
    return selected;
  }
  // ============================================================================
  // Statistics Formatting
  // ============================================================================
  /**
   * Format statistics as string
   * @param repoMap - Repository map
   * @returns Formatted statistics
   */
  formatStats(repoMap) {
    const stats = repoMap.stats;
    const lines = [];
    lines.push("# Repository Statistics");
    lines.push("");
    lines.push("## Overview");
    lines.push(`- **Total Files:** ${String(stats.totalFiles)}`);
    lines.push(`- **Total Symbols:** ${String(stats.totalSymbols)}`);
    lines.push(`- **Total Dependencies:** ${String(stats.totalDependencies)}`);
    lines.push(`- **Generation Time:** ${String(stats.generationTime)}ms`);
    lines.push("");
    lines.push("## Language Breakdown");
    for (const [lang, count] of Object.entries(stats.languageBreakdown)) {
      if (count > 0) {
        lines.push(`- **${lang}:** ${String(count)} files`);
      }
    }
    lines.push("");
    lines.push("## Symbol Breakdown");
    for (const [kind, count] of Object.entries(stats.symbolBreakdown)) {
      if (count > 0) {
        lines.push(`- **${kind}:** ${String(count)}`);
      }
    }
    lines.push("");
    if (stats.mostReferencedSymbols.length > 0) {
      lines.push("## Most Referenced Symbols");
      for (const { name, references } of stats.mostReferencedSymbols.slice(0, 10)) {
        lines.push(`- **${name}:** ${String(references)} references`);
      }
      lines.push("");
    }
    if (stats.mostConnectedFiles.length > 0) {
      lines.push("## Most Connected Files");
      for (const { file, connections } of stats.mostConnectedFiles.slice(0, 10)) {
        const relativePath = relative(repoMap.projectPath, file);
        lines.push(`- **${this.normalizePath(relativePath)}:** ${String(connections)} connections`);
      }
      lines.push("");
    }
    if (stats.largestFiles.length > 0) {
      lines.push("## Largest Files");
      for (const file of stats.largestFiles.slice(0, 10)) {
        lines.push(`- ${this.normalizePath(file)}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }
  // ============================================================================
  // Private Helpers
  // ============================================================================
  /**
   * Get symbol prefix for kind
   */
  getSymbolPrefix(kind) {
    return RepoMapFormatter.SYMBOL_PREFIXES[kind] || "?";
  }
  /**
   * Truncate signature if too long
   */
  truncateSignature(signature, maxLength) {
    if (signature.length <= maxLength) {
      return signature;
    }
    return signature.substring(0, maxLength - 3) + "...";
  }
  /**
   * Group symbols by file
   */
  groupByFile(symbols) {
    const byFile = /* @__PURE__ */ new Map();
    for (const symbol of symbols) {
      const normalizedFile = this.normalizePath(symbol.file);
      if (!byFile.has(normalizedFile)) {
        byFile.set(normalizedFile, []);
      }
      byFile.get(normalizedFile)?.push(symbol);
    }
    return byFile;
  }
  /**
   * Sort files by importance (total references in file)
   */
  sortFilesByImportance(byFile, _repoMap) {
    const filesWithRefs = Array.from(byFile.entries()).map(([file, symbols]) => ({
      file,
      symbols,
      totalRefs: symbols.reduce((sum, s) => sum + s.references, 0)
    }));
    filesWithRefs.sort((a, b) => b.totalRefs - a.totalRefs);
    return filesWithRefs;
  }
  /**
   * Sort symbols by importance
   */
  sortSymbols(symbols, rankByReferences) {
    return [...symbols].sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      if (rankByReferences) {
        if (b.references !== a.references) return b.references - a.references;
      }
      if (a.exported && !b.exported) return -1;
      if (!a.exported && b.exported) return 1;
      return a.name.localeCompare(b.name);
    });
  }
  /**
   * Normalize file path for consistent display
   */
  normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
  }
}
class RepoMapGenerator {
  /** TreeSitter parser instance */
  parser;
  /** Symbol extractor instance */
  symbolExtractor;
  /** Dependency graph builder instance */
  dependencyBuilder;
  /** Reference counter instance */
  referenceCounter;
  /** Repository map formatter instance */
  formatter;
  /** Current generated map */
  currentMap = null;
  /** Whether the generator has been initialized */
  initialized = false;
  /** Parse results cache for incremental updates */
  parseResultsCache = /* @__PURE__ */ new Map();
  /**
   * Create a new RepoMapGenerator
   * @param wasmBasePath - Optional base path for WASM files
   */
  constructor(wasmBasePath) {
    this.parser = new TreeSitterParser(wasmBasePath);
    this.symbolExtractor = new SymbolExtractor();
    this.dependencyBuilder = new DependencyGraphBuilder();
    this.referenceCounter = new ReferenceCounter();
    this.formatter = new RepoMapFormatter();
  }
  // ============================================================================
  // Initialization
  // ============================================================================
  /**
   * Initialize the generator
   */
  async initialize() {
    if (this.initialized) return;
    await this.parser.initialize();
    this.initialized = true;
  }
  // ============================================================================
  // Main Generation Methods
  // ============================================================================
  /**
   * Generate a complete repository map
   * @param projectPath - Root project path
   * @param options - Generation options
   * @returns Complete repository map
   */
  async generate(projectPath, options) {
    const startTime = Date.now();
    const mergedOptions = {
      ...DEFAULT_REPO_MAP_OPTIONS,
      ...options
    };
    if (!this.initialized) {
      await this.initialize();
    }
    const normalizedProjectPath = this.normalizePath(resolve(projectPath));
    const files = await this.findFiles(normalizedProjectPath, mergedOptions);
    const parseResults = await this.parseAllFiles(
      files,
      mergedOptions.maxFiles
    );
    this.parseResultsCache.clear();
    for (const result of parseResults) {
      this.parseResultsCache.set(this.normalizePath(result.file), result);
    }
    const fileEntries = await this.buildFileEntries(
      files.slice(0, mergedOptions.maxFiles),
      normalizedProjectPath,
      parseResults
    );
    const symbols = this.symbolExtractor.mergeSymbols(parseResults);
    this.dependencyBuilder.registerAlias("@/", "src/");
    const dependencies = this.dependencyBuilder.build(
      parseResults,
      normalizedProjectPath
    );
    if (mergedOptions.countReferences) {
      this.referenceCounter.count(symbols, parseResults);
    }
    const generationTime = Date.now() - startTime;
    const stats = this.calculateStats(
      fileEntries,
      symbols,
      dependencies,
      generationTime
    );
    this.currentMap = {
      projectPath: normalizedProjectPath,
      generatedAt: /* @__PURE__ */ new Date(),
      files: fileEntries,
      symbols,
      dependencies,
      stats
    };
    return this.currentMap;
  }
  /**
   * Generate incremental update for changed files
   * @param projectPath - Root project path
   * @param changedFiles - Files that changed
   * @returns Updated repository map
   */
  async generateIncremental(projectPath, changedFiles) {
    if (!this.currentMap) {
      return this.generate(projectPath);
    }
    const startTime = Date.now();
    const normalizedProjectPath = this.normalizePath(resolve(projectPath));
    const normalizedChangedFiles = changedFiles.map(
      (f) => this.normalizePath(resolve(f))
    );
    const changedParseResults = [];
    for (const filePath of normalizedChangedFiles) {
      try {
        const content = await readFile(filePath, "utf-8");
        const result = await this.parser.parseFile(filePath, content);
        changedParseResults.push(result);
        this.parseResultsCache.set(filePath, result);
      } catch {
        this.parseResultsCache.delete(filePath);
      }
    }
    const allParseResults = Array.from(this.parseResultsCache.values());
    const fileEntries = await this.buildFileEntries(
      Array.from(this.parseResultsCache.keys()),
      normalizedProjectPath,
      allParseResults
    );
    const symbols = this.symbolExtractor.mergeSymbols(allParseResults);
    const dependencies = this.dependencyBuilder.build(
      allParseResults,
      normalizedProjectPath
    );
    this.referenceCounter.count(symbols, allParseResults);
    const generationTime = Date.now() - startTime;
    const stats = this.calculateStats(
      fileEntries,
      symbols,
      dependencies,
      generationTime
    );
    this.currentMap = {
      projectPath: normalizedProjectPath,
      generatedAt: /* @__PURE__ */ new Date(),
      files: fileEntries,
      symbols,
      dependencies,
      stats
    };
    return this.currentMap;
  }
  // ============================================================================
  // Query Methods
  // ============================================================================
  /**
   * Find symbols by name
   * @param name - Symbol name to search
   * @returns Matching symbols
   */
  findSymbol(name) {
    if (!this.currentMap) return [];
    return this.symbolExtractor.findByName(this.currentMap.symbols, name);
  }
  /**
   * Find usages of a symbol
   * @param symbolName - Symbol name
   * @returns Usage locations
   */
  findUsages(symbolName) {
    if (!this.currentMap) return [];
    const usages = [];
    for (const edge of this.currentMap.dependencies) {
      if (edge.symbols.includes(symbolName)) {
        usages.push({
          file: edge.from,
          line: edge.line || 1,
          context: edge.statement || `import ${symbolName}`,
          usageType: "import"
        });
      }
    }
    return usages;
  }
  /**
   * Find implementations of an interface
   * @param interfaceName - Interface name
   * @returns Implementing classes
   */
  findImplementations(interfaceName) {
    if (!this.currentMap) return [];
    return this.currentMap.symbols.filter((symbol) => {
      if (symbol.kind !== "class") return false;
      return symbol.signature.includes(`implements ${interfaceName}`);
    });
  }
  /**
   * Get files imported by a file
   * @param file - File path
   * @returns Array of imported file paths
   */
  getDependencies(file) {
    return this.dependencyBuilder.getDependencies(file);
  }
  /**
   * Get files that import a file
   * @param file - File path
   * @returns Array of importing file paths
   */
  getDependents(file) {
    return this.dependencyBuilder.getDependents(file);
  }
  // ============================================================================
  // Formatting Methods
  // ============================================================================
  /**
   * Format map for context window
   * @param options - Format options
   * @returns Formatted string
   */
  formatForContext(options) {
    if (!this.currentMap) {
      throw new Error("No repo map generated. Call generate() first.");
    }
    return this.formatter.format(this.currentMap, options);
  }
  /**
   * Get estimated token count for formatted output
   * @returns Token count
   */
  getTokenCount() {
    if (!this.currentMap) {
      return 0;
    }
    const formatted = this.formatter.format(this.currentMap);
    return this.formatter.estimateTokens(formatted);
  }
  // ============================================================================
  // Cache Management
  // ============================================================================
  /**
   * Get current repository map
   * @returns Current map or null
   */
  getCurrentMap() {
    return this.currentMap;
  }
  /**
   * Clear cached data
   */
  clearCache() {
    this.currentMap = null;
    this.parseResultsCache.clear();
  }
  // ============================================================================
  // Private Helpers - File Discovery
  // ============================================================================
  /**
   * Find files matching patterns
   * @param projectPath - Project root
   * @param options - Generation options
   * @returns Array of absolute file paths
   */
  async findFiles(projectPath, options) {
    const patterns = options.includePatterns.map(
      (p) => this.normalizePath(`${projectPath}/${p}`)
    );
    const ignorePatterns = options.excludePatterns.map(
      (p) => this.normalizePath(p)
    );
    const files = await fg(patterns, {
      ignore: ignorePatterns,
      onlyFiles: true,
      absolute: true,
      cwd: projectPath
    });
    if (options.languages.length > 0) {
      return files.filter((file) => {
        const lang = this.parser.detectLanguage(file);
        return lang !== null && options.languages.includes(lang);
      });
    }
    return files.map((f) => this.normalizePath(f));
  }
  /**
   * Parse all files and return results
   * @param files - File paths to parse
   * @param maxFiles - Maximum files to parse
   * @returns Array of parse results
   */
  async parseAllFiles(files, maxFiles) {
    const filesToParse = files.slice(0, maxFiles);
    const results = [];
    for (const filePath of filesToParse) {
      try {
        const content = await readFile(filePath, "utf-8");
        const result = await this.parser.parseFile(filePath, content);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          file: filePath,
          symbols: [],
          imports: [],
          exports: [],
          errors: [
            {
              message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
              line: 1,
              column: 0
            }
          ],
          parseTime: 0
        });
      }
    }
    return results;
  }
  /**
   * Build file entries with metadata
   * @param files - File paths
   * @param projectPath - Project root
   * @param parseResults - Parse results for symbol counts
   * @returns Array of file entries
   */
  async buildFileEntries(files, projectPath, parseResults) {
    const entries = [];
    const symbolCountMap = /* @__PURE__ */ new Map();
    for (const result of parseResults) {
      symbolCountMap.set(
        this.normalizePath(result.file),
        result.symbols.length
      );
    }
    for (const filePath of files) {
      try {
        const normalizedPath = this.normalizePath(filePath);
        const fileStat = await stat(filePath);
        const content = await readFile(filePath, "utf-8");
        const lineCount = content.split("\n").length;
        const language = this.parser.detectLanguage(filePath);
        if (!language) continue;
        entries.push({
          path: normalizedPath,
          relativePath: this.normalizePath(relative(projectPath, filePath)),
          language,
          size: fileStat.size,
          lastModified: fileStat.mtime,
          symbolCount: symbolCountMap.get(normalizedPath) || 0,
          lineCount
        });
      } catch {
      }
    }
    return entries;
  }
  // ============================================================================
  // Private Helpers - Statistics
  // ============================================================================
  /**
   * Calculate repository map statistics
   */
  calculateStats(files, symbols, dependencies, generationTime) {
    const languageBreakdown = {
      typescript: 0,
      javascript: 0
    };
    for (const file of files) {
      languageBreakdown[file.language]++;
    }
    const symbolBreakdown = {
      class: 0,
      interface: 0,
      function: 0,
      method: 0,
      property: 0,
      variable: 0,
      constant: 0,
      type: 0,
      enum: 0,
      enum_member: 0,
      namespace: 0,
      module: 0
    };
    for (const symbol of symbols) {
      symbolBreakdown[symbol.kind]++;
    }
    const sortedBySize = [...files].sort((a, b) => b.size - a.size);
    const largestFiles = sortedBySize.slice(0, 10).map((f) => f.relativePath);
    const sortedByRefs = [...symbols].filter((s) => s.references > 0).sort((a, b) => b.references - a.references);
    const mostReferencedSymbols = sortedByRefs.slice(0, 10).map((s) => ({
      name: s.name,
      file: s.file,
      references: s.references
    }));
    const mostConnectedFiles = this.dependencyBuilder.getSortedByConnections().slice(0, 10);
    return {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown,
      symbolBreakdown,
      largestFiles,
      mostReferencedSymbols,
      mostConnectedFiles,
      generationTime
    };
  }
  /**
   * Normalize file path for consistent comparisons
   */
  normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
  }
}
class NexusCoordinator {
  // Dependencies
  taskQueue;
  agentPool;
  decomposer;
  resolver;
  estimator;
  qaEngine;
  worktreeManager;
  // Mutable - can be replaced with project-specific instance
  checkpointManager;
  // Mutable - can be injected after creation
  mergerRunner;
  // Mutable - can be injected after creation (Phase 3)
  agentWorktreeBridge;
  humanReviewService;
  // Mutable - can be injected after creation (Phase 3: HITL)
  // Escalation tracking - maps reviewId to taskId for review responses
  escalatedTasks = /* @__PURE__ */ new Map();
  // State
  state = "idle";
  currentPhase = "planning";
  pauseReason;
  projectConfig;
  waves = [];
  currentWaveIndex = 0;
  totalTasks = 0;
  completedTasks = 0;
  failedTasks = 0;
  // Control
  stopRequested = false;
  pauseRequested = false;
  orchestrationLoop;
  eventHandlers = [];
  constructor(options) {
    this.taskQueue = options.taskQueue;
    this.agentPool = options.agentPool;
    this.decomposer = options.decomposer;
    this.resolver = options.resolver;
    this.estimator = options.estimator;
    this.qaEngine = options.qaEngine;
    this.worktreeManager = options.worktreeManager;
    this.checkpointManager = options.checkpointManager;
    this.mergerRunner = options.mergerRunner;
    this.agentWorktreeBridge = options.agentWorktreeBridge;
    this.humanReviewService = options.humanReviewService;
  }
  // ========================================
  // Service Injection Methods (Phase 3)
  // ========================================
  /**
   * Set the human review service for HITL escalation
   * This allows the service to be injected after coordinator creation
   * (since NexusFactory creates coordinator before HumanReviewService)
   */
  setHumanReviewService(service) {
    this.humanReviewService = service;
    console.log("[NexusCoordinator] HumanReviewService injected");
  }
  /**
   * Set the merger runner for worktree->main merging
   */
  setMergerRunner(runner) {
    this.mergerRunner = runner;
    console.log("[NexusCoordinator] MergerRunner injected");
  }
  /**
   * Set the checkpoint manager for wave checkpoints
   * Injected after construction since NexusFactory creates coordinator before CheckpointManager
   */
  setCheckpointManager(manager) {
    this.checkpointManager = manager;
    console.log("[NexusCoordinator] CheckpointManager injected");
  }
  /**
   * Initialize coordinator with project configuration
   * Phase 2 Workflow Fix: Wire up TaskQueue events for status tracking
   */
  initialize(config) {
    this.projectConfig = config;
    this.state = "idle";
    this.currentPhase = "planning";
    this.pauseReason = void 0;
    this.waves = [];
    this.currentWaveIndex = 0;
    this.totalTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.stopRequested = false;
    this.pauseRequested = false;
    this.taskQueue.onEvent((event) => {
      for (const handler of this.eventHandlers) {
        try {
          handler(event);
        } catch {
        }
      }
    });
  }
  /**
   * Start orchestration for a project
   */
  start(projectId) {
    if (!this.projectConfig) {
      throw new Error("Coordinator not initialized");
    }
    this.state = "running";
    this.currentPhase = "execution";
    this.stopRequested = false;
    this.pauseRequested = false;
    this.emitEvent("coordinator:started", { projectId });
    this.orchestrationLoop = this.runOrchestrationLoop();
  }
  /**
   * Execute pre-decomposed tasks (skip decomposition phase)
   * Used when tasks already exist in database from planning phase.
   * This is the correct method to call when user clicks "Start Execution"
   * after features/tasks have been generated during the interview.
   *
   * @param projectId - The project ID
   * @param tasks - Array of existing tasks from database
   * @param projectPath - Path to user's project folder (NOT Nexus-master)
   */
  executeExistingTasks(projectId, tasks2, projectPath) {
    this.projectConfig = {
      projectId,
      projectPath,
      // User's project folder, NOT Nexus-master
      features: [],
      mode: "evolution"
    };
    this.state = "running";
    this.currentPhase = "execution";
    this.stopRequested = false;
    this.pauseRequested = false;
    console.log(`[NexusCoordinator] Executing ${tasks2.length} existing tasks`);
    console.log(`[NexusCoordinator] Project path: ${projectPath}`);
    const projectGitService = new GitService({ baseDir: projectPath });
    this.worktreeManager = new WorktreeManager({
      baseDir: projectPath,
      gitService: projectGitService,
      worktreeDir: `${projectPath}/.nexus/worktrees`
    });
    console.log(`[NexusCoordinator] Created WorktreeManager for project: ${projectPath}`);
    this.emitEvent("coordinator:started", { projectId });
    this.orchestrationLoop = this.runExecutionLoop(tasks2, projectPath);
  }
  /**
   * Run execution loop for existing tasks (no decomposition)
   * This skips the decomposeByMode step and directly processes
   * the provided tasks in waves.
   */
  async runExecutionLoop(allTasks, _projectPath) {
    try {
      if (!this.projectConfig) {
        throw new Error("Project configuration not initialized");
      }
      console.log(`[NexusCoordinator] Running execution loop with ${allTasks.length} tasks`);
      const planningTasks = allTasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        type: task.type ?? "auto",
        size: "small",
        estimatedMinutes: task.estimatedMinutes ?? 15,
        dependsOn: task.dependsOn,
        testCriteria: task.testCriteria ?? [],
        files: task.files ?? []
      }));
      const cycles = this.resolver.detectCycles(planningTasks);
      if (cycles.length > 0) {
        throw new Error(`Dependency cycles detected: ${cycles.map((c) => c.taskIds.join(" -> ")).join("; ")}`);
      }
      this.waves = this.resolver.calculateWaves(planningTasks);
      this.totalTasks = allTasks.length;
      console.log(`[NexusCoordinator] Calculated ${this.waves.length} waves`);
      for (const wave of this.waves) {
        for (const task of wave.tasks) {
          const orchestrationTask = {
            ...task,
            dependsOn: task.dependsOn,
            status: "pending",
            waveId: wave.id,
            priority: 1,
            createdAt: /* @__PURE__ */ new Date()
          };
          this.taskQueue.enqueue(orchestrationTask, wave.id);
        }
      }
      for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
        if (this.stopRequested) break;
        this.currentWaveIndex = waveIndex;
        this.emitEvent("wave:started", { waveId: waveIndex });
        const wave = this.waves[waveIndex];
        await this.processWave(wave);
        if (!this.stopRequested) {
          this.emitEvent("wave:completed", { waveId: waveIndex });
          await this.createWaveCheckpoint(waveIndex);
        }
      }
      if (!this.stopRequested) {
        const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;
        if (remainingTasks === 0 && this.completedTasks > 0) {
          this.currentPhase = "completion";
          this.state = "idle";
          console.log(`[NexusCoordinator] Project completed: ${this.completedTasks}/${this.totalTasks} tasks completed, ${this.failedTasks} failed`);
          this.emitEvent("project:completed", {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? "unknown",
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            totalWaves: this.waves.length
          });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);
          this.emitEvent("project:failed", {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? "unknown",
            error: "All tasks failed",
            totalTasks: this.totalTasks,
            failedTasks: this.failedTasks,
            recoverable: true
          });
        }
      }
    } catch (error) {
      console.error("[NexusCoordinator] Execution error:", error);
      this.emitEvent("project:failed", {
        projectId: this.projectConfig?.projectId,
        error: error instanceof Error ? error.message : String(error),
        recoverable: false
      });
    }
  }
  /**
   * Pause execution gracefully
   */
  async pause(reason) {
    if (this.state !== "running") {
      return;
    }
    this.pauseRequested = true;
    this.pauseReason = reason;
    await new Promise((resolve2) => setTimeout(resolve2, 10));
    this.state = "paused";
    this.emitEvent("coordinator:paused", { reason });
  }
  /**
   * Resume from paused state
   */
  resume() {
    if (this.state !== "paused") {
      return;
    }
    this.pauseRequested = false;
    this.pauseReason = void 0;
    this.state = "running";
    this.emitEvent("coordinator:resumed");
    if (!this.orchestrationLoop) {
      this.orchestrationLoop = this.runOrchestrationLoop();
    }
  }
  /**
   * Stop execution and clean up
   */
  async stop() {
    this.stopRequested = true;
    this.state = "stopping";
    if (this.orchestrationLoop) {
      await Promise.race([
        this.orchestrationLoop,
        new Promise((resolve2) => setTimeout(resolve2, 1e3))
      ]);
      this.orchestrationLoop = void 0;
    }
    for (const agent of this.agentPool.getAll()) {
      try {
        this.agentPool.terminate(agent.id);
      } catch {
      }
    }
    this.state = "idle";
    this.emitEvent("coordinator:stopped");
  }
  /**
   * Get current coordinator status
   */
  getStatus() {
    return {
      state: this.state,
      projectId: this.projectConfig?.projectId,
      activeAgents: this.agentPool.getActive().length,
      queuedTasks: this.taskQueue.size(),
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      currentPhase: this.currentPhase,
      currentWave: this.currentWaveIndex,
      totalWaves: this.waves.length,
      pauseReason: this.pauseReason
    };
  }
  /**
   * Get project progress metrics
   */
  getProgress() {
    const progressPercent = this.totalTasks > 0 ? Math.round(this.completedTasks / this.totalTasks * 100) : 0;
    const averageTaskMinutes = 15;
    const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;
    const estimatedRemainingMinutes = remainingTasks * averageTaskMinutes;
    return {
      projectId: this.projectConfig?.projectId ?? "",
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      progressPercent,
      estimatedRemainingMinutes,
      currentWave: this.currentWaveIndex,
      totalWaves: this.waves.length,
      activeAgents: this.agentPool.getActive().length
    };
  }
  /**
   * Get all currently active agents
   */
  getActiveAgents() {
    return this.agentPool.getActive();
  }
  /**
   * Get all pending tasks in queue
   */
  getPendingTasks() {
    return this.taskQueue.getReadyTasks();
  }
  /**
   * Register event handler
   */
  onEvent(handler) {
    this.eventHandlers.push(handler);
  }
  /**
   * Get a task by ID from the queue
   * Used for looking up task details (e.g., projectId) without dequeuing
   */
  getTask(taskId) {
    return this.taskQueue.getTask(taskId);
  }
  /**
   * Create a checkpoint for later resumption
   */
  async createCheckpoint(name) {
    if (!this.checkpointManager) {
      throw new Error("CheckpointManager not available");
    }
    const projectId = this.projectConfig?.projectId;
    if (!projectId) {
      throw new Error("No project configured");
    }
    const reason = name ?? `Manual checkpoint at wave ${this.currentWaveIndex}`;
    const result = await this.checkpointManager.createCheckpoint(projectId, reason);
    const checkpoint = {
      id: result.id,
      metadata: {
        projectId,
        waveId: this.currentWaveIndex,
        completedTaskIds: [],
        pendingTaskIds: [],
        coordinatorState: this.state
      },
      gitCommit: result.gitCommit ?? void 0,
      createdAt: result.createdAt
    };
    this.emitEvent("checkpoint:created", { checkpointId: checkpoint.id, name: reason });
    return checkpoint;
  }
  // ========================================
  // Human Review Response Handlers (Phase 3)
  // ========================================
  /**
   * Handle approval of an escalated task review
   * This is called when a human approves a review request
   *
   * @param reviewId - ID of the review being approved
   * @param resolution - Optional resolution notes from the human
   */
  async handleReviewApproved(reviewId, resolution) {
    const escalatedTask = this.escalatedTasks.get(reviewId);
    if (!escalatedTask) {
      console.warn(`[NexusCoordinator] Review ${reviewId} not found in escalated tasks`);
      return;
    }
    const { taskId, agentId, worktreePath } = escalatedTask;
    console.log(`[NexusCoordinator] Review ${reviewId} approved for task ${taskId}`);
    console.log(`[NexusCoordinator] Resolution: ${resolution ?? "No resolution provided"}`);
    this.escalatedTasks.delete(reviewId);
    this.taskQueue.markComplete(taskId);
    this.completedTasks++;
    this.emitEvent("task:completed", {
      taskId,
      agentId,
      resolution,
      humanApproved: true
    });
    if (worktreePath) {
      try {
        await this.worktreeManager.removeWorktree(taskId);
      } catch {
      }
    }
    try {
      this.agentPool.release(agentId);
    } catch {
    }
    if (this.state === "paused" && this.pauseReason === "review_pending") {
      this.resume();
    }
  }
  /**
   * Handle rejection of an escalated task review
   * This is called when a human rejects a review request
   *
   * @param reviewId - ID of the review being rejected
   * @param feedback - Required feedback from the human
   */
  async handleReviewRejected(reviewId, feedback) {
    const escalatedTask = this.escalatedTasks.get(reviewId);
    if (!escalatedTask) {
      console.warn(`[NexusCoordinator] Review ${reviewId} not found in escalated tasks`);
      return;
    }
    const { taskId, agentId, worktreePath } = escalatedTask;
    console.log(`[NexusCoordinator] Review ${reviewId} rejected for task ${taskId}`);
    console.log(`[NexusCoordinator] Feedback: ${feedback}`);
    this.escalatedTasks.delete(reviewId);
    this.taskQueue.markFailed(taskId);
    this.failedTasks++;
    this.emitEvent("task:failed", {
      taskId,
      agentId,
      error: `Human rejected: ${feedback}`,
      humanRejected: true,
      feedback
    });
    if (worktreePath) {
      try {
        await this.worktreeManager.removeWorktree(taskId);
      } catch {
      }
    }
    try {
      this.agentPool.release(agentId);
    } catch {
    }
    if (this.state === "paused" && this.pauseReason === "review_pending") {
      this.resume();
    }
  }
  /**
   * Get list of escalated tasks awaiting human review
   */
  getEscalatedTasks() {
    return Array.from(this.escalatedTasks.entries()).map(([reviewId, { taskId }]) => ({
      reviewId,
      taskId
    }));
  }
  /**
   * Emit an event to all registered handlers
   */
  emitEvent(type, data) {
    const event = {
      type,
      timestamp: /* @__PURE__ */ new Date(),
      projectId: this.projectConfig?.projectId,
      data
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
      }
    }
  }
  /**
   * Main orchestration loop
   * Hotfix #5 - Issue 3: Added per-wave checkpoints
   * Hotfix #5 - Issue 4: Added Genesis/Evolution mode branching
   */
  async runOrchestrationLoop() {
    try {
      if (!this.projectConfig) {
        throw new Error("Project configuration not initialized");
      }
      const config = this.projectConfig;
      const allTasks = await this.decomposeByMode(config);
      const cycles = this.resolver.detectCycles(allTasks);
      if (cycles.length > 0) {
        throw new Error(`Dependency cycles detected: ${cycles.map((c) => c.taskIds.join(" -> ")).join("; ")}`);
      }
      this.waves = this.resolver.calculateWaves(allTasks);
      this.totalTasks = allTasks.length;
      for (const wave of this.waves) {
        for (const task of wave.tasks) {
          const orchestrationTask = {
            ...task,
            dependsOn: task.dependsOn,
            status: "pending",
            waveId: wave.id,
            priority: 1,
            createdAt: /* @__PURE__ */ new Date()
          };
          this.taskQueue.enqueue(orchestrationTask, wave.id);
        }
      }
      for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
        if (this.stopRequested) break;
        this.currentWaveIndex = waveIndex;
        this.emitEvent("wave:started", { waveId: waveIndex });
        const wave = this.waves[waveIndex];
        await this.processWave(wave);
        if (!this.stopRequested) {
          this.emitEvent("wave:completed", { waveId: waveIndex });
          await this.createWaveCheckpoint(waveIndex);
        }
      }
      if (!this.stopRequested) {
        const remainingTasks = this.totalTasks - this.completedTasks - this.failedTasks;
        if (remainingTasks === 0 && this.completedTasks > 0) {
          this.currentPhase = "completion";
          this.state = "idle";
          console.log(`[NexusCoordinator] Project completed: ${this.completedTasks}/${this.totalTasks} tasks completed, ${this.failedTasks} failed`);
          this.emitEvent("project:completed", {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? "unknown",
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            totalWaves: this.waves.length
          });
        } else if (this.failedTasks > 0 && this.failedTasks === this.totalTasks) {
          console.log(`[NexusCoordinator] Project failed: all ${this.failedTasks} tasks failed`);
          this.emitEvent("project:failed", {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- projectConfig can be cleared during async operations
            projectId: this.projectConfig?.projectId ?? "unknown",
            error: "All tasks failed",
            totalTasks: this.totalTasks,
            failedTasks: this.failedTasks,
            recoverable: true
          });
        }
      }
    } catch (error) {
      console.error("Orchestration error:", error);
      this.emitEvent("project:failed", {
        projectId: this.projectConfig?.projectId,
        error: error instanceof Error ? error.message : String(error),
        recoverable: false
      });
    }
  }
  /**
   * Decompose features based on project mode
   * Hotfix #5 - Issue 4: Genesis vs Evolution mode distinction
   *
   * Genesis mode: Full decomposition from requirements (greenfield project)
   * Evolution mode: Analyze existing code, targeted changes (existing codebase)
   */
  async decomposeByMode(config) {
    const mode = config.mode ?? "genesis";
    const features2 = config.features ?? [];
    const allTasks = [];
    if (mode === "genesis") {
      this.emitEvent("orchestration:mode", { mode: "genesis", reason: "Full decomposition from requirements" });
      for (const feature of features2) {
        const featureDesc = this.featureToDescription(feature);
        const tasks2 = await this.decomposer.decompose(featureDesc);
        allTasks.push(...tasks2);
      }
      if (allTasks.length === 0) {
        const mockFeature = {
          id: "mock",
          name: "Mock",
          description: "Mock",
          priority: "must",
          status: "backlog",
          complexity: "simple",
          subFeatures: [],
          estimatedTasks: 1,
          completedTasks: 0,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          projectId: config.projectId
        };
        const mockFeatureDesc = this.featureToDescription(mockFeature);
        const tasks2 = await this.decomposer.decompose(mockFeatureDesc);
        allTasks.push(...tasks2);
      }
    } else {
      this.emitEvent("orchestration:mode", { mode: "evolution", reason: "Targeted changes to existing codebase" });
      let existingCodeContext = "";
      if (config.projectPath) {
        try {
          console.log(`[NexusCoordinator] Analyzing existing codebase for Evolution mode at: ${config.projectPath}`);
          this.emitEvent("evolution:analyzing", { projectPath: config.projectPath });
          const repoMapGenerator = new RepoMapGenerator();
          await repoMapGenerator.initialize();
          const repoMap = await repoMapGenerator.generate(config.projectPath, {
            maxFiles: 500,
            countReferences: true
          });
          existingCodeContext = repoMapGenerator.formatForContext({
            maxTokens: 8e3,
            includeSignatures: true,
            rankByReferences: true
          });
          console.log(`[NexusCoordinator] Repo map generated: ${repoMap.stats.totalFiles} files, ${repoMap.stats.totalSymbols} symbols`);
          this.emitEvent("evolution:analyzed", {
            totalFiles: repoMap.stats.totalFiles,
            totalSymbols: repoMap.stats.totalSymbols
          });
        } catch (error) {
          console.warn("[NexusCoordinator] Failed to analyze existing code (continuing without context):", error);
          this.emitEvent("evolution:analysis-failed", {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      for (const feature of features2) {
        let featureDesc = this.featureToDescription(feature);
        if (existingCodeContext) {
          featureDesc = `## Existing Codebase Context

The following is a map of the existing codebase. Use this to understand the current architecture and avoid conflicts:

${existingCodeContext}

---

${featureDesc}`;
        }
        const tasks2 = await this.decomposer.decompose(featureDesc);
        for (const task of tasks2) {
          task.testCriteria.push("Evolution: Verify compatibility with existing code");
        }
        allTasks.push(...tasks2);
      }
    }
    return allTasks;
  }
  /**
   * Convert a Feature object to a string description for decomposition
   * Fix: TaskDecomposer expects string, not Feature object
   */
  featureToDescription(feature) {
    let desc2 = `## Feature: ${feature.name}
`;
    desc2 += `Priority: ${feature.priority}
`;
    desc2 += `Description: ${feature.description}`;
    return desc2;
  }
  /**
   * Create checkpoint after wave completion
   * Hotfix #5 - Issue 3: Per-wave checkpoints for recovery
   */
  async createWaveCheckpoint(waveIndex) {
    if (!this.checkpointManager) {
      console.log(`[NexusCoordinator] Skipping checkpoint for wave ${waveIndex} - no CheckpointManager`);
      return;
    }
    const projectId = this.projectConfig?.projectId;
    if (!projectId) {
      console.log(`[NexusCoordinator] Skipping checkpoint for wave ${waveIndex} - no projectId`);
      return;
    }
    try {
      const reason = `Wave ${waveIndex} complete`;
      await this.checkpointManager.createCheckpoint(projectId, reason);
      this.emitEvent("checkpoint:created", {
        waveId: waveIndex,
        reason
      });
    } catch (error) {
      console.error("Failed to create wave checkpoint:", error);
      this.emitEvent("checkpoint:failed", {
        waveId: waveIndex,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  /**
   * Process a single wave of tasks
   */
  async processWave(wave) {
    const runningTasks = /* @__PURE__ */ new Map();
    while (!this.stopRequested) {
      if (this.pauseRequested) {
        await Promise.all(runningTasks.values());
        while (this.pauseRequested && !this.stopRequested) {
          await new Promise((resolve2) => setTimeout(resolve2, 50));
        }
        if (this.stopRequested) break;
      }
      const waveTasks = this.taskQueue.getByWave(wave.id);
      if (waveTasks.length === 0 && runningTasks.size === 0) {
        break;
      }
      const readyTasks = this.taskQueue.getReadyTasks();
      const waveReadyTasks = readyTasks.filter((t) => t.waveId === wave.id);
      for (const _task of waveReadyTasks) {
        if (this.stopRequested || this.pauseRequested) break;
        let agent = this.agentPool.getAvailable();
        if (!agent && this.agentPool.size() < 4) {
          try {
            agent = this.agentPool.spawn("coder");
          } catch {
            break;
          }
        }
        if (!agent) {
          break;
        }
        const dequeuedTask = this.taskQueue.dequeue();
        if (!dequeuedTask) break;
        let worktreePath;
        try {
          const worktree = await this.worktreeManager.createWorktree(dequeuedTask.id);
          worktreePath = worktree.path;
        } catch {
        }
        this.agentPool.assign(agent.id, dequeuedTask.id, worktreePath);
        this.emitEvent("task:assigned", {
          taskId: dequeuedTask.id,
          agentId: agent.id,
          featureId: dequeuedTask.featureId
        });
        const taskPromise = this.executeTask(dequeuedTask, agent.id, worktreePath);
        runningTasks.set(dequeuedTask.id, taskPromise);
        void taskPromise.finally(() => {
          runningTasks.delete(dequeuedTask.id);
        });
      }
      await new Promise((resolve2) => setTimeout(resolve2, 50));
    }
    await Promise.all(runningTasks.values());
  }
  /**
   * Execute a single task with per-task merge on success
   * Hotfix #5 - Issue 2: Added merge step after successful QA loop
   * Fix: Now passes projectPath to QA engine for correct CLI working directory
   * Phase 2 Workflow Fix: Added status transitions for UI visibility
   */
  async executeTask(task, agentId, worktreePath) {
    this.taskQueue.updateTaskStatus(task.id, "in_progress");
    this.emitEvent("task:started", { taskId: task.id, agentId, featureId: task.featureId });
    const projectPath = this.projectConfig?.projectPath;
    console.log(`[NexusCoordinator] executeTask: projectPath = ${projectPath ?? "UNDEFINED"}`);
    try {
      const result = await this.qaEngine.run(
        {
          id: task.id,
          name: task.name,
          description: task.description,
          files: task.files ?? [],
          worktree: worktreePath,
          projectPath
          // Pass project path for Claude CLI working directory
        },
        null
        // coder would be passed here
      );
      if (result.success) {
        if (worktreePath && this.mergerRunner) {
          console.log(`[NexusCoordinator] Starting merge for task ${task.id}`);
          console.log(`[NexusCoordinator] Worktree: ${worktreePath}`);
          console.log(`[NexusCoordinator] Target branch: main`);
          try {
            const mergeResult = await this.mergerRunner.merge(worktreePath, "main");
            if (mergeResult.success) {
              console.log(`[NexusCoordinator] Merge successful for task ${task.id}`);
              console.log(`[NexusCoordinator] Commit: ${mergeResult.commitHash ?? "unknown"}`);
              this.emitEvent("task:merged", {
                taskId: task.id,
                branch: "main",
                commitHash: mergeResult.commitHash
              });
              try {
                const pushResult = await this.mergerRunner.pushToRemote("main");
                if (pushResult.success) {
                  console.log(`[NexusCoordinator] Pushed to remote successfully for task ${task.id}`);
                  this.emitEvent("task:pushed", { taskId: task.id, branch: "main" });
                } else {
                  console.warn(`[NexusCoordinator] Push failed (non-blocking): ${pushResult.error ?? "unknown error"}`);
                }
              } catch (pushError) {
                console.warn(`[NexusCoordinator] Push exception (non-blocking):`, pushError);
              }
            } else {
              console.error(`[NexusCoordinator] Merge failed for task ${task.id}: ${mergeResult.error ?? "unknown error"}`);
              if (mergeResult.conflictFiles && mergeResult.conflictFiles.length > 0) {
                console.log(`[NexusCoordinator] Merge conflict detected, escalating to human review`);
                if (this.humanReviewService) {
                  try {
                    const review = await this.humanReviewService.requestReview({
                      taskId: task.id,
                      projectId: this.projectConfig?.projectId ?? "unknown",
                      reason: "merge_conflict",
                      context: {
                        conflictFiles: mergeResult.conflictFiles,
                        error: mergeResult.error
                      }
                    });
                    const reviewId = review.id;
                    this.escalatedTasks.set(reviewId, { taskId: task.id, agentId, worktreePath });
                    this.emitEvent("task:escalated", {
                      taskId: task.id,
                      agentId,
                      reason: `Merge conflict: ${mergeResult.conflictFiles.join(", ")}`
                    });
                    return;
                  } catch (reviewError) {
                    console.error(`[NexusCoordinator] Failed to create review for merge conflict:`, reviewError);
                  }
                }
                this.emitEvent("task:merge-failed", {
                  taskId: task.id,
                  error: `Merge conflict: ${mergeResult.conflictFiles.join(", ")}`
                });
              } else {
                this.emitEvent("task:merge-failed", {
                  taskId: task.id,
                  error: mergeResult.error ?? "Unknown merge error"
                });
              }
            }
          } catch (mergeError) {
            console.error(`[NexusCoordinator] Merge exception for task ${task.id}:`, mergeError);
            this.emitEvent("task:merge-failed", {
              taskId: task.id,
              error: mergeError instanceof Error ? mergeError.message : String(mergeError)
            });
          }
        }
        this.taskQueue.markComplete(task.id);
        this.completedTasks++;
        this.emitEvent("task:completed", { taskId: task.id, agentId, featureId: task.featureId });
      } else if (result.escalated) {
        console.log(`[NexusCoordinator] Task ${task.id} escalated: ${result.reason ?? "Max QA iterations exceeded"}`);
        if (this.humanReviewService) {
          try {
            const review = await this.humanReviewService.requestReview({
              taskId: task.id,
              projectId: this.projectConfig?.projectId ?? "unknown",
              reason: "qa_exhausted",
              context: {
                qaIterations: result.iterations,
                escalationReason: result.reason ?? "Max QA iterations exceeded"
              }
            });
            const reviewId = review.id;
            console.log(`[NexusCoordinator] Created review request ${reviewId} for task ${task.id}`);
            this.escalatedTasks.set(reviewId, { taskId: task.id, agentId, worktreePath });
            this.emitEvent("task:escalated", {
              taskId: task.id,
              agentId,
              reason: result.reason ?? "Max QA iterations exceeded",
              reviewId
              // Include review ID for UI correlation
            });
            return;
          } catch (reviewError) {
            console.error(`[NexusCoordinator] Failed to create review request:`, reviewError);
          }
        }
        this.taskQueue.markFailed(task.id);
        this.failedTasks++;
        this.emitEvent("task:escalated", {
          taskId: task.id,
          agentId,
          reason: result.reason ?? "Max QA iterations exceeded"
        });
      } else {
        this.taskQueue.markFailed(task.id);
        this.failedTasks++;
        this.emitEvent("task:failed", {
          taskId: task.id,
          agentId,
          escalated: result.escalated
        });
      }
    } catch (error) {
      this.taskQueue.markFailed(task.id);
      this.failedTasks++;
      this.emitEvent("task:failed", {
        taskId: task.id,
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      if (this.agentWorktreeBridge) {
        try {
          await this.agentWorktreeBridge.releaseWorktree(agentId);
        } catch {
        }
      }
      try {
        this.agentPool.release(agentId);
        this.emitEvent("agent:released", { agentId });
      } catch {
      }
      if (worktreePath) {
        try {
          await this.worktreeManager.removeWorktree(task.id);
        } catch {
        }
      }
    }
  }
}
class TaskQueue {
  /** Main task storage: taskId -> task */
  tasks = /* @__PURE__ */ new Map();
  /** Tasks that have been dequeued but not yet completed/failed */
  assignedTasks = /* @__PURE__ */ new Map();
  /** Tasks by wave: waveId -> Set<taskId> */
  waveIndex = /* @__PURE__ */ new Map();
  /** Completed task IDs for dependency resolution */
  completedTaskIds = /* @__PURE__ */ new Set();
  /** Failed task IDs */
  failedTaskIds = /* @__PURE__ */ new Set();
  /** Current active wave being processed */
  currentWave = 0;
  /** Event handlers for task status changes (Phase 2 addition) */
  eventHandlers = [];
  /**
   * Add task to queue with optional wave assignment
   */
  enqueue(task, waveId) {
    const queuedTask = {
      ...task,
      status: "queued",
      waveId: waveId ?? task.waveId ?? 0
    };
    this.tasks.set(queuedTask.id, queuedTask);
    const wave = queuedTask.waveId ?? 0;
    if (!this.waveIndex.has(wave)) {
      this.waveIndex.set(wave, /* @__PURE__ */ new Set());
    }
    const waveSet = this.waveIndex.get(wave);
    if (waveSet) waveSet.add(queuedTask.id);
  }
  /**
   * Get and remove next ready task
   * Returns undefined if no tasks are ready (dependencies unmet or queue empty)
   *
   * CRITICAL FIX: Track assigned tasks separately to enable status updates
   * after dequeue. Previously, deleting from tasks Map broke updateTaskStatus().
   */
  dequeue() {
    const readyTask = this.findNextReadyTask();
    if (!readyTask) {
      return void 0;
    }
    readyTask.status = "assigned";
    this.tasks.delete(readyTask.id);
    this.assignedTasks.set(readyTask.id, readyTask);
    const waveId = readyTask.waveId ?? 0;
    this.waveIndex.get(waveId)?.delete(readyTask.id);
    return readyTask;
  }
  /**
   * View next ready task without removing
   */
  peek() {
    return this.findNextReadyTask();
  }
  /**
   * Mark task as complete, enabling dependent tasks
   * CRITICAL FIX: Also remove from assignedTasks Map
   */
  markComplete(taskId) {
    this.completedTaskIds.add(taskId);
    this.assignedTasks.delete(taskId);
    this.updateCurrentWave();
  }
  /**
   * Mark task as failed
   * CRITICAL FIX: Also remove from assignedTasks Map
   */
  markFailed(taskId) {
    this.failedTaskIds.add(taskId);
    this.assignedTasks.delete(taskId);
    this.updateCurrentWave();
  }
  /**
   * Get all tasks whose dependencies are satisfied
   */
  getReadyTasks() {
    const ready = [];
    for (const task of this.tasks.values()) {
      if (this.isTaskReady(task)) {
        ready.push(task);
      }
    }
    return this.sortTasks(ready);
  }
  /**
   * Get all tasks in a specific wave
   */
  getByWave(waveId) {
    const taskIds = this.waveIndex.get(waveId);
    if (!taskIds || taskIds.size === 0) {
      return [];
    }
    const tasks2 = [];
    for (const id of taskIds) {
      const task = this.tasks.get(id);
      if (task) {
        tasks2.push(task);
      }
    }
    return tasks2;
  }
  /**
   * Get number of tasks in queue
   */
  size() {
    return this.tasks.size;
  }
  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.tasks.size === 0;
  }
  /**
   * Clear all tasks and reset state
   */
  clear() {
    this.tasks.clear();
    this.assignedTasks.clear();
    this.waveIndex.clear();
    this.completedTaskIds.clear();
    this.failedTaskIds.clear();
    this.currentWave = 0;
  }
  /**
   * Get count of completed tasks
   */
  getCompletedCount() {
    return this.completedTaskIds.size;
  }
  /**
   * Get count of failed tasks
   */
  getFailedCount() {
    return this.failedTaskIds.size;
  }
  /**
   * Get a task by ID without removing it from the queue
   * Used for looking up task details (e.g., projectId) without dequeuing
   *
   * CRITICAL FIX: Also check assignedTasks Map for dequeued tasks
   */
  getTask(taskId) {
    return this.tasks.get(taskId) ?? this.assignedTasks.get(taskId);
  }
  /**
   * Register event handler for task status changes
   * Phase 2 Workflow Fix: Enable UI visibility of status transitions
   */
  onEvent(handler) {
    this.eventHandlers.push(handler);
  }
  /**
   * Update task status and emit status change event
   * Phase 2 Workflow Fix: Track status transitions for UI visibility
   *
   * CRITICAL FIX: Also check assignedTasks Map for dequeued tasks
   *
   * Status flow:
   * - pending -> planning (when decomposing)
   * - planning -> in_progress (when assigned to agent)
   * - in_progress -> ai_review (when QA loop starts)
   * - ai_review -> human_review (when escalated)
   * - human_review -> completed (when approved)
   */
  updateTaskStatus(taskId, newStatus) {
    const task = this.tasks.get(taskId) ?? this.assignedTasks.get(taskId);
    if (!task) {
      console.warn(`[TaskQueue] Cannot update status for unknown task: ${taskId}`);
      return;
    }
    const oldStatus = task.status;
    if (oldStatus === newStatus) return;
    task.status = newStatus;
    task.updatedAt = /* @__PURE__ */ new Date();
    console.log(`[TaskQueue] Task ${taskId} status: ${oldStatus} -> ${newStatus}`);
    this.emitEvent("task:status-changed", {
      taskId,
      oldStatus,
      newStatus,
      featureId: task.featureId,
      projectId: task.projectId
    });
  }
  /**
   * Emit event to all registered handlers
   */
  emitEvent(type, data) {
    const event = {
      type,
      timestamp: /* @__PURE__ */ new Date(),
      data
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("[TaskQueue] Event handler error:", error);
      }
    }
  }
  /**
   * Find the next ready task respecting wave ordering and priorities
   */
  findNextReadyTask() {
    const readyTasks = this.getReadyTasks();
    if (readyTasks.length === 0) {
      return null;
    }
    return readyTasks[0] ?? null;
  }
  /**
   * Check if a task is ready to be dequeued
   */
  isTaskReady(task) {
    const taskWave = task.waveId ?? 0;
    if (taskWave > this.currentWave) {
      return false;
    }
    for (const depId of task.dependsOn) {
      if (!this.completedTaskIds.has(depId)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Sort tasks by wave, priority, then createdAt
   */
  sortTasks(tasks2) {
    return tasks2.sort((a, b) => {
      const waveA = a.waveId ?? 0;
      const waveB = b.waveId ?? 0;
      if (waveA !== waveB) {
        return waveA - waveB;
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
  /**
   * Update current wave if all tasks in current wave are complete
   */
  updateCurrentWave() {
    const currentWaveTasks = this.waveIndex.get(this.currentWave);
    if (currentWaveTasks && currentWaveTasks.size > 0) {
      return;
    }
    const waves = Array.from(this.waveIndex.keys()).sort((a, b) => a - b);
    for (const wave of waves) {
      if (wave > this.currentWave) {
        const waveTasks = this.waveIndex.get(wave);
        if (waveTasks && waveTasks.size > 0) {
          this.currentWave = wave;
          return;
        }
      }
    }
  }
}
const DEFAULT_NEXUS_CONFIG = {
  claudeBackend: "cli",
  geminiBackend: "cli",
  embeddingsBackend: "local"
};
class NexusFactory {
  /**
   * Create a complete Nexus instance with all dependencies wired.
   *
   * This is the primary factory method for production use.
   *
   * Backend selection (Phase 16 - Task 12):
   * - CLI-first: Prefers CLI clients over API when available
   * - Smart fallback: Falls back to API if CLI unavailable and API key exists
   * - Helpful errors: Throws descriptive errors with install instructions
   *
   * @param config - Factory configuration
   * @returns Promise resolving to fully-wired Nexus instance
   */
  static async create(config) {
    const [claudeResult, geminiResult] = await Promise.all([
      this.createClaudeClient(config),
      this.createGeminiClient(config)
    ]);
    const claudeClient = claudeResult.client;
    const geminiClient = geminiResult.client;
    const claudeBackend = claudeResult.backend;
    const geminiBackend = geminiResult.backend;
    let embeddingsResult;
    let embeddingsBackend = config.embeddingsBackend ?? "local";
    try {
      embeddingsResult = await this.createEmbeddingsService(config);
      embeddingsBackend = embeddingsResult.backend;
    } catch (error) {
      console.warn("[NexusFactory] Embeddings service unavailable:", error instanceof Error ? error.message : error);
    }
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType
    });
    const gitService = new GitService({ baseDir: config.workingDir });
    const qaRunner = QARunnerFactory.create({
      workingDir: config.workingDir,
      geminiClient,
      gitService,
      buildConfig: {
        timeout: config.qaConfig?.buildTimeout
      },
      lintConfig: {
        timeout: config.qaConfig?.lintTimeout,
        autoFix: config.qaConfig?.autoFixLint
      },
      testConfig: {
        timeout: config.qaConfig?.testTimeout
      }
    });
    const qaEngine = new QALoopEngine({
      qaRunner,
      maxIterations: config.qaConfig?.maxIterations ?? 50,
      stopOnFirstFailure: true,
      workingDir: config.workingDir,
      agentPool
      // Pass agentPool for code generation/fixing
    });
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/worktrees`
    });
    const checkpointManager = null;
    const coordinatorOptions = {
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine,
      worktreeManager,
      checkpointManager
    };
    const coordinator = new NexusCoordinator(coordinatorOptions);
    const shutdown = async () => {
      try {
        await coordinator.stop();
      } catch {
      }
      try {
        await agentPool.terminateAll();
      } catch {
      }
      try {
        await worktreeManager.cleanup();
      } catch {
      }
      try {
        eventBus.removeAllListeners();
      } catch {
      }
    };
    return {
      coordinator,
      agentPool,
      taskQueue,
      eventBus,
      worktreeManager,
      llm: {
        claude: claudeClient,
        gemini: geminiClient
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator
      },
      embeddings: embeddingsResult?.service,
      backends: {
        claude: claudeBackend,
        gemini: geminiBackend,
        embeddings: embeddingsBackend
      },
      shutdown
    };
  }
  /**
   * Create a Nexus instance optimized for testing.
   *
   * This version:
   * - Uses mocked QA runners for faster execution
   * - Reduces iteration limits
   * - Maintains full functionality for integration testing
   * - Supports backend selection with fallback (Phase 16 - Task 12)
   *
   * @param config - Testing configuration
   * @returns Promise resolving to Nexus instance optimized for testing
   */
  static async createForTesting(config) {
    const [claudeResult, geminiResult] = await Promise.all([
      this.createClaudeClient(config),
      this.createGeminiClient(config)
    ]);
    const claudeClient = claudeResult.client;
    const geminiClient = geminiResult.client;
    const claudeBackend = claudeResult.backend;
    const geminiBackend = geminiResult.backend;
    let embeddingsResult;
    let embeddingsBackend = config.embeddingsBackend ?? "local";
    try {
      embeddingsResult = await this.createEmbeddingsService(config);
      embeddingsBackend = embeddingsResult.backend;
    } catch {
    }
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();
    const agentPool = new AgentPool({
      claudeClient,
      geminiClient,
      maxAgentsByType: config.maxAgentsByType
    });
    const qaRunner = config.mockQA ? QARunnerFactory.createMock() : QARunnerFactory.create({
      workingDir: config.workingDir,
      geminiClient
    });
    const qaEngine = new QALoopEngine({
      qaRunner,
      maxIterations: 50,
      stopOnFirstFailure: true,
      workingDir: config.workingDir,
      agentPool
      // Pass agentPool for code generation/fixing
    });
    const taskQueue = new TaskQueue();
    const eventBus = EventBus.getInstance();
    const gitService = new GitService({ baseDir: config.workingDir });
    const worktreeManager = new WorktreeManager({
      baseDir: config.workingDir,
      gitService,
      worktreeDir: `${config.workingDir}/.nexus/test-worktrees`
    });
    const checkpointManager = null;
    const coordinator = new NexusCoordinator({
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine,
      worktreeManager,
      checkpointManager
    });
    const shutdown = async () => {
      try {
        await coordinator.stop();
      } catch {
      }
      try {
        await agentPool.terminateAll();
      } catch {
      }
      try {
        await worktreeManager.cleanup();
      } catch {
      }
      try {
        eventBus.removeAllListeners();
      } catch {
      }
    };
    return {
      coordinator,
      agentPool,
      taskQueue,
      eventBus,
      worktreeManager,
      llm: {
        claude: claudeClient,
        gemini: geminiClient
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator
      },
      embeddings: embeddingsResult?.service,
      backends: {
        claude: claudeBackend,
        gemini: geminiBackend,
        embeddings: embeddingsBackend
      },
      shutdown
    };
  }
  /**
   * Create a minimal Nexus instance with only planning components.
   *
   * Useful for scenarios where you only need task decomposition
   * and dependency resolution without full orchestration.
   *
   * @param claudeApiKey - Anthropic API key
   * @returns Minimal Nexus instance with planning only
   */
  static createPlanningOnly(claudeApiKey) {
    const claudeClient = new ClaudeClient({ apiKey: claudeApiKey });
    const geminiClient = null;
    const taskDecomposer = new TaskDecomposer(claudeClient);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();
    return {
      llm: {
        claude: claudeClient,
        gemini: geminiClient
      },
      planning: {
        decomposer: taskDecomposer,
        resolver: dependencyResolver,
        estimator: timeEstimator
      },
      shutdown: async () => {
      }
    };
  }
  // ==========================================================================
  // Private Backend Selection Methods (Task 12)
  // ==========================================================================
  /**
   * Create a Claude client based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='cli' → try CLI, fallback to API if available
   * 2. If backend='api' → require API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Claude client (CLI or API)
   * @throws CLINotFoundError when CLI unavailable and no API fallback
   */
  static async createClaudeClient(config) {
    const backend = config.claudeBackend ?? DEFAULT_NEXUS_CONFIG.claudeBackend ?? "cli";
    if (backend === "cli") {
      const cliClient = new ClaudeCodeCLIClient({
        ...config.claudeCliConfig,
        workingDirectory: config.workingDir
      });
      if (await cliClient.isAvailable()) {
        return { client: cliClient, backend: "cli" };
      }
      if (config.claudeApiKey) {
        console.warn(
          "[NexusFactory] Claude CLI not available, falling back to API backend"
        );
        return {
          client: new ClaudeClient({
            apiKey: config.claudeApiKey,
            ...config.claudeConfig
          }),
          backend: "api"
        };
      }
      throw new CLINotFoundError();
    }
    if (!config.claudeApiKey) {
      throw new APIKeyMissingError("claude");
    }
    return {
      client: new ClaudeClient({
        apiKey: config.claudeApiKey,
        ...config.claudeConfig
      }),
      backend: "api"
    };
  }
  /**
   * Create a Gemini client based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='cli' → try CLI, fallback to API if available
   * 2. If backend='api' → require API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Gemini client (CLI or API)
   * @throws GeminiCLINotFoundError when CLI unavailable and no API fallback
   */
  static async createGeminiClient(config) {
    const backend = config.geminiBackend ?? DEFAULT_NEXUS_CONFIG.geminiBackend ?? "cli";
    if (backend === "cli") {
      const cliClient = new GeminiCLIClient(config.geminiCliConfig);
      if (await cliClient.isAvailable()) {
        return { client: cliClient, backend: "cli" };
      }
      if (config.geminiApiKey) {
        console.warn(
          "[NexusFactory] Gemini CLI not available, falling back to API backend"
        );
        return {
          client: new GeminiClient({
            apiKey: config.geminiApiKey,
            ...config.geminiConfig
          }),
          backend: "api"
        };
      }
      throw new GeminiCLINotFoundError();
    }
    if (!config.geminiApiKey) {
      throw new APIKeyMissingError("gemini");
    }
    return {
      client: new GeminiClient({
        apiKey: config.geminiApiKey,
        ...config.geminiConfig
      }),
      backend: "api"
    };
  }
  /**
   * Create an embeddings service based on backend preference.
   *
   * Order of precedence:
   * 1. If backend='local' → try local, fallback to API if available
   * 2. If backend='api' → require OpenAI API key, throw if not available
   *
   * @param config - Factory configuration
   * @returns Embeddings service (local or API)
   * @throws LocalEmbeddingsInitError when local unavailable and no API fallback
   */
  static async createEmbeddingsService(config) {
    const backend = config.embeddingsBackend ?? DEFAULT_NEXUS_CONFIG.embeddingsBackend ?? "local";
    if (backend === "local") {
      const localService = new LocalEmbeddingsService(config.localEmbeddingsConfig);
      if (await localService.isAvailable()) {
        return { service: localService, backend: "local" };
      }
      if (config.openaiApiKey) {
        console.warn(
          "[NexusFactory] Local embeddings not available, falling back to OpenAI API"
        );
        return {
          service: new EmbeddingsService({ apiKey: config.openaiApiKey }),
          backend: "api"
        };
      }
      throw new LocalEmbeddingsInitError(
        config.localEmbeddingsConfig?.model ?? "default",
        new Error("Local embeddings initialization failed and no API key fallback available")
      );
    }
    if (!config.openaiApiKey) {
      throw new APIKeyMissingError("embeddings");
    }
    return {
      service: new EmbeddingsService({ apiKey: config.openaiApiKey }),
      backend: "api"
    };
  }
}
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_CONFIDENCE = 0.5;
const DEFAULT_PRIORITY = "should";
const CATEGORY_MAP = {
  functional: "functional",
  non_functional: "non-functional",
  "non-functional": "non-functional",
  technical: "technical",
  constraint: "constraint",
  assumption: "assumption"
};
const VALID_CATEGORIES = /* @__PURE__ */ new Set([
  "functional",
  "non-functional",
  "technical",
  "constraint",
  "assumption"
]);
const VALID_PRIORITIES = /* @__PURE__ */ new Set([
  "must",
  "should",
  "could",
  "wont"
]);
class RequirementExtractor {
  confidenceThreshold;
  /**
   * Create a new RequirementExtractor
   * @param options Configuration options
   */
  constructor(options) {
    this.confidenceThreshold = options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  }
  /**
   * Extract requirements from LLM response text
   * @param responseText The full LLM response text
   * @param sourceMessageId ID of the message this response belongs to
   * @returns ExtractionResult with requirements, raw count, and filtered count
   */
  extract(responseText, sourceMessageId) {
    const requirements2 = [];
    const rawRequirements = [];
    const requirementRegex = /<requirement>([\s\S]*?)<\/requirement>/g;
    let match;
    while ((match = requirementRegex.exec(responseText)) !== null) {
      const block = match[1];
      if (!block) continue;
      const parsed = this.parseRequirementBlock(block, sourceMessageId);
      if (parsed) {
        rawRequirements.push(parsed);
        if (parsed.confidence >= this.confidenceThreshold) {
          requirements2.push(parsed);
        }
      }
    }
    return {
      requirements: requirements2,
      rawCount: rawRequirements.length,
      filteredCount: requirements2.length
    };
  }
  /**
   * Set the confidence threshold for filtering
   * @param threshold New threshold (0.0 to 1.0)
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = threshold;
  }
  /**
   * Parse a single requirement block into a structured requirement
   * @param block The content inside <requirement>...</requirement>
   * @param sourceMessageId Source message ID
   * @returns ExtractedRequirement or null if invalid
   */
  parseRequirementBlock(block, sourceMessageId) {
    const text2 = this.extractTag(block, "text");
    const categoryRaw = this.extractTag(block, "category");
    if (!text2 || !categoryRaw) {
      return null;
    }
    const category = this.mapCategory(categoryRaw);
    if (!category) {
      return null;
    }
    const priorityRaw = this.extractTag(block, "priority");
    const priority = this.mapPriority(priorityRaw) ?? DEFAULT_PRIORITY;
    const confidenceRaw = this.extractTag(block, "confidence");
    const confidence = confidenceRaw ? parseFloat(confidenceRaw) : DEFAULT_CONFIDENCE;
    const area = this.extractTag(block, "area") ?? void 0;
    return {
      id: nanoid(),
      text: text2,
      category,
      priority,
      confidence: isNaN(confidence) ? DEFAULT_CONFIDENCE : confidence,
      area,
      sourceMessageId
    };
  }
  /**
   * Extract content from an XML tag
   * @param content The content to search
   * @param tag The tag name
   * @returns Trimmed content or null if not found
   */
  extractTag(content, tag) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
    const match = content.match(regex);
    return match?.[1] ? match[1].trim() : null;
  }
  /**
   * Map LLM category to internal format
   * @param raw The raw category string from LLM
   * @returns Mapped category or null if invalid
   */
  mapCategory(raw) {
    const normalized = raw.trim().toLowerCase();
    const mapped = CATEGORY_MAP[normalized];
    return mapped && VALID_CATEGORIES.has(mapped) ? mapped : null;
  }
  /**
   * Map LLM priority to internal format
   * @param raw The raw priority string from LLM
   * @returns Mapped priority or null if invalid
   */
  mapPriority(raw) {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return VALID_PRIORITIES.has(normalized) ? normalized : null;
  }
}
const STANDARD_AREAS = [
  "authentication",
  "authorization",
  "data_model",
  "api",
  "ui_ux",
  "performance",
  "security",
  "integrations",
  "deployment"
];
const INTERVIEWER_SYSTEM_PROMPT = `You are an expert requirements analyst conducting a discovery interview for a software project.

Your role:
- Ask clarifying questions to understand the user's vision
- Extract clear, actionable requirements from their descriptions
- Identify gaps and suggest areas to explore
- Maintain a conversational, non-interrogative tone

Behavior:
- Start broad, then go detailed per area
- Summarize periodically to confirm understanding
- Suggest missing areas when appropriate ("You haven't mentioned authentication...")
- Be adaptive - follow the user's thread of thought
- Keep responses focused and not too long

Requirement Extraction:
When the user describes features, needs, or constraints, extract them as requirements.
For each requirement found, output in this format BEFORE your conversational response:

<requirement>
  <text>Clear description of the requirement</text>
  <category>functional|non_functional|technical|constraint|assumption</category>
  <priority>must|should|could|wont</priority>
  <confidence>0.0-1.0 (how certain you are this is a real requirement)</confidence>
  <area>domain area like "authentication", "payments", "ui"</area>
</requirement>

Category definitions:
- functional: What the system does (features, behaviors)
- non_functional: How well the system does it (performance, scalability, reliability)
- technical: Technology choices, architecture decisions
- constraint: Limitations, boundaries, rules
- assumption: Things taken as given but should be validated

Priority definitions (MoSCoW):
- must: Critical for MVP, cannot ship without
- should: Important but not critical
- could: Nice to have
- wont: Explicitly out of scope for now

Rules for extraction:
- Only extract requirements the user explicitly stated or clearly implied
- Do NOT invent requirements or assume features not mentioned
- Set confidence based on how explicit the user was (0.9+ for explicit, 0.5-0.7 for implied)
- One requirement per <requirement> block
- Multiple requirements can be extracted from a single message

After extracting requirements (if any), continue the natural conversation with:
- A brief acknowledgment of what you understood
- A follow-up question to explore deeper or a new area

Example response format:
<requirement>
  <text>Users must be able to log in with email and password</text>
  <category>functional</category>
  <priority>must</priority>
  <confidence>0.95</confidence>
  <area>authentication</area>
</requirement>

Got it! You need email/password authentication. Do you also want to support social logins like Google or GitHub?`;
const INITIAL_GREETING = `Hello! I'm here to help you define the requirements for your software project.

Let's start with the big picture: What are you building, and what problem does it solve?

Feel free to describe your vision in your own words - I'll ask follow-up questions to make sure I understand everything correctly.`;
const EVOLUTION_INITIAL_GREETING = `Hello! I see you want to enhance an existing project.

I've analyzed your codebase and have context about its structure. What changes or features would you like to add?

You can describe:
- New features to add
- Existing functionality to modify
- Bugs to fix
- Performance improvements
- Refactoring goals

I'll help translate your ideas into actionable requirements that work with your existing code.`;
function getEvolutionSystemPrompt(repoMapContext) {
  return `${INTERVIEWER_SYSTEM_PROMPT}

---

EVOLUTION MODE: You are enhancing an existing project, not creating one from scratch.

EXISTING CODEBASE CONTEXT:
${repoMapContext}

Additional Evolution Mode Guidelines:
- Reference existing files, functions, and patterns when discussing changes
- Consider backward compatibility with existing code
- Identify potential conflicts with current implementation
- Suggest integration points based on the existing architecture
- Extract requirements that account for existing functionality
- Mark requirements that modify existing code vs add new code

When extracting requirements in Evolution mode, add this field:
<modification_type>add|modify|extend|refactor|fix</modification_type>

Where:
- add: Completely new functionality
- modify: Changes to existing behavior
- extend: Building on existing features
- refactor: Code improvement without behavior change
- fix: Bug fixes or corrections`;
}
function getGapSuggestionPrompt(gaps) {
  if (gaps.length === 0) return "";
  const topGaps = gaps.slice(0, 3);
  return `

Note: You haven't discussed these areas yet: ${topGaps.join(", ")}. Consider asking about them if relevant to this project.`;
}
const MIN_REQUIREMENTS_FOR_GAPS = 3;
const MIN_EXPLORED_AREAS_FOR_GAPS = 2;
class QuestionGenerator {
  llmClient;
  logger;
  constructor(options) {
    this.llmClient = options.llmClient;
    this.logger = options.logger;
  }
  /**
   * Generate a follow-up question based on context
   *
   * @param context The current conversation context
   * @returns Generated question with metadata
   */
  async generate(context) {
    this.logger?.debug("Generating question", {
      messageCount: context.conversationHistory.length,
      requirementCount: context.extractedRequirements.length,
      exploredAreas: context.exploredAreas
    });
    const gaps = this.detectGaps(context.exploredAreas);
    const shouldSuggestGaps = this.shouldSuggestGap(context);
    const systemPrompt = this.buildQuestionPrompt(context, shouldSuggestGaps ? gaps : []);
    const messages = [
      { role: "system", content: systemPrompt },
      ...context.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    ];
    const options = {
      maxTokens: 1024,
      temperature: 0.7
    };
    const response = await this.llmClient.chat(messages, options);
    const question = this.parseQuestionResponse(response.content, context);
    this.logger?.info("Generated question", {
      area: question.area,
      depth: question.depth,
      gapsFound: gaps.length
    });
    return {
      question,
      suggestedGaps: gaps,
      shouldSuggestGaps
    };
  }
  /**
   * Detect unexplored standard areas
   *
   * @param exploredAreas Areas that have been discussed
   * @returns Array of standard areas not yet explored
   */
  detectGaps(exploredAreas) {
    const explored = new Set(exploredAreas.map((a) => a.toLowerCase()));
    return STANDARD_AREAS.filter((area) => !explored.has(area));
  }
  /**
   * Determine if gaps should be suggested to the user
   *
   * Gaps are only suggested after enough context has been gathered
   * (minimum requirements and explored areas)
   *
   * @param context The generation context
   * @returns True if gaps should be surfaced
   */
  shouldSuggestGap(context) {
    const hasEnoughRequirements = context.extractedRequirements.length >= MIN_REQUIREMENTS_FOR_GAPS;
    const hasEnoughExploration = context.exploredAreas.length >= MIN_EXPLORED_AREAS_FOR_GAPS;
    const hasGaps = this.detectGaps(context.exploredAreas).length > 0;
    return hasEnoughRequirements && hasEnoughExploration && hasGaps;
  }
  /**
   * Get the interviewer system prompt
   *
   * @returns The full system prompt for the interviewer
   */
  getSystemPrompt() {
    return INTERVIEWER_SYSTEM_PROMPT;
  }
  /**
   * Build the question generation prompt
   */
  buildQuestionPrompt(context, gaps) {
    let prompt = INTERVIEWER_SYSTEM_PROMPT;
    if (context.projectDescription) {
      prompt += `

Project Context:
${context.projectDescription}`;
    }
    if (context.extractedRequirements.length > 0) {
      const reqSummary = context.extractedRequirements.slice(-10).map((r) => `- [${r.category}] ${r.text}`).join("\n");
      prompt += `

Requirements captured so far:
${reqSummary}`;
    }
    if (context.exploredAreas.length > 0) {
      prompt += `

Areas already discussed: ${context.exploredAreas.join(", ")}`;
    }
    if (gaps.length > 0) {
      prompt += getGapSuggestionPrompt(gaps);
    }
    return prompt;
  }
  /**
   * Parse LLM response to extract question metadata
   */
  parseQuestionResponse(response, context) {
    let depth = "broad";
    if (context.conversationHistory.length === 0) {
      depth = "broad";
    } else if (context.extractedRequirements.length > 5) {
      depth = "detailed";
    } else if (context.conversationHistory.length > 2) {
      depth = "clarifying";
    }
    const area = this.inferAreaFromResponse(response, context);
    const lastUserMessage = context.conversationHistory.filter((m) => m.role === "user").pop();
    return {
      question: response,
      area,
      depth,
      followsUp: lastUserMessage?.id
    };
  }
  /**
   * Infer the domain area from response content
   */
  inferAreaFromResponse(response, context) {
    const responseLower = response.toLowerCase();
    for (const area of STANDARD_AREAS) {
      if (responseLower.includes(area.replace("_", " "))) {
        return area;
      }
    }
    const areaKeywords = [
      // Check security first - has specific keywords that shouldn't be confused with data_model
      ["security", ["encrypt", "secure", "vulnerability", "protect", "safety", "threat"]],
      // Authentication - specific keywords
      ["authentication", ["login", "sign in", "password", "auth", "sso", "oauth", "credential"]],
      // Authorization - distinct from authentication
      ["authorization", ["permission", "role", "access control", "admin", "privilege"]],
      // Performance - specific metrics
      ["performance", ["speed", "latency", "response time", "load", "throughput", "benchmark"]],
      // Integrations - external connections
      ["integrations", ["integrate", "third-party", "external", "connect", "plugin"]],
      // Deployment - infrastructure
      ["deployment", ["deploy", "hosting", "cloud", "infrastructure", "server", "container"]],
      // UI/UX - user interface
      ["ui_ux", ["interface", "design", "user experience", "layout", "screen", "component"]],
      // API - endpoints
      ["api", ["endpoint", "rest", "graphql", "webhook", "route"]],
      // Data model - last since 'data' is generic
      ["data_model", ["database", "schema", "entity", "model", "table", "migration"]]
    ];
    for (const [area, keywords] of areaKeywords) {
      for (const keyword of keywords) {
        if (responseLower.includes(keyword)) {
          return area;
        }
      }
    }
    return context.exploredAreas[context.exploredAreas.length - 1] || "general";
  }
}
const CATEGORY_MAPPING$1 = {
  "functional": "functional",
  "non-functional": "non-functional",
  "technical": "technical",
  "constraint": "technical",
  // Map to technical as constraint isn't in RequirementsDB
  "assumption": "functional"
  // Map assumptions to functional for now
};
class InterviewEngine {
  llmClient;
  requirementsDB;
  eventBus;
  logger;
  extractor;
  questionGenerator;
  /** Active sessions indexed by session ID */
  sessions = /* @__PURE__ */ new Map();
  constructor(options) {
    this.llmClient = options.llmClient;
    this.requirementsDB = options.requirementsDB;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.extractor = new RequirementExtractor();
    this.questionGenerator = new QuestionGenerator({
      llmClient: this.llmClient,
      logger: this.logger
    });
  }
  /**
   * Start a new interview session
   *
   * @param projectId The project to conduct interview for
   * @param options Optional session configuration (mode, evolution context)
   * @returns The new interview session
   */
  startSession(projectId, options) {
    const now = /* @__PURE__ */ new Date();
    const mode = options?.mode ?? "genesis";
    const evolutionContext = options?.evolutionContext;
    if (mode === "evolution" && !evolutionContext) {
      this.logger?.warn("Evolution mode started without context", { projectId });
    }
    const session2 = {
      id: nanoid(),
      projectId,
      status: "active",
      mode,
      evolutionContext,
      messages: [],
      extractedRequirements: [],
      exploredAreas: [],
      startedAt: now,
      lastActivityAt: now
    };
    this.sessions.set(session2.id, session2);
    this.logger?.info("Started interview session", {
      sessionId: session2.id,
      projectId,
      mode,
      hasEvolutionContext: !!evolutionContext
    });
    void this.eventBus.emit("interview:started", {
      projectId,
      projectName: projectId,
      // Will be resolved from DB if needed
      mode
    });
    return session2;
  }
  /**
   * Process a user message in the interview
   *
   * Flow:
   * 1. Add user message to session
   * 2. Build messages array with system prompt + history
   * 3. Call LLM
   * 4. Add assistant response to session
   * 5. Extract requirements
   * 6. Store requirements in DB
   * 7. Update explored areas
   * 8. Check for gaps to suggest
   * 9. Emit events
   *
   * @param sessionId The session ID
   * @param userMessage The user's message content
   * @returns Processing result with response, requirements, and gaps
   */
  async processMessage(sessionId, userMessage) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session2.status !== "active") {
      throw new Error(`Session is not active: ${session2.status}`);
    }
    const userMsgId = nanoid();
    const userMsg = {
      id: userMsgId,
      role: "user",
      content: userMessage,
      timestamp: /* @__PURE__ */ new Date()
    };
    session2.messages.push(userMsg);
    this.logger?.debug("Processing user message", {
      sessionId,
      messageId: userMsgId,
      contentLength: userMessage.length
    });
    this.emitMessageEvent(session2, userMsg);
    const llmMessages = this.buildLLMMessages(session2);
    this.logger?.debug("Calling LLM", {
      sessionId,
      messageCount: llmMessages.length,
      clientType: this.llmClient.constructor.name
    });
    const options = {
      maxTokens: 2048,
      temperature: 0.7,
      disableTools: true
      // Chat-only mode for interview
    };
    const llmResponse = await this.llmClient.chat(llmMessages, options);
    const responseContent = llmResponse.content;
    const assistantMsgId = nanoid();
    const assistantMsg = {
      id: assistantMsgId,
      role: "assistant",
      content: responseContent,
      timestamp: /* @__PURE__ */ new Date()
    };
    session2.messages.push(assistantMsg);
    this.emitMessageEvent(session2, assistantMsg);
    const extractionResult = this.extractor.extract(responseContent, assistantMsgId);
    const newRequirements = extractionResult.requirements;
    this.logger?.info("Extracted requirements", {
      sessionId,
      rawCount: extractionResult.rawCount,
      filteredCount: extractionResult.filteredCount
    });
    for (const req of newRequirements) {
      try {
        const dbCategory = CATEGORY_MAPPING$1[req.category] ?? "functional";
        this.requirementsDB.addRequirement(session2.projectId, {
          category: dbCategory,
          description: req.text,
          priority: req.priority,
          source: `interview:${session2.id}`,
          confidence: req.confidence,
          tags: req.area ? [req.area] : []
        });
        session2.extractedRequirements.push(req);
        this.emitRequirementEvent(session2, req);
      } catch (error) {
        this.logger?.warn("Failed to store requirement", {
          sessionId,
          requirementId: req.id,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    this.updateExploredAreas(session2, newRequirements);
    const context = {
      conversationHistory: session2.messages,
      extractedRequirements: session2.extractedRequirements,
      exploredAreas: session2.exploredAreas
    };
    const gaps = this.questionGenerator.detectGaps(session2.exploredAreas);
    const suggestedGaps = this.questionGenerator.shouldSuggestGap(context) ? gaps : [];
    session2.lastActivityAt = /* @__PURE__ */ new Date();
    return {
      response: responseContent,
      extractedRequirements: newRequirements,
      suggestedGaps
    };
  }
  /**
   * Get a session by ID
   *
   * @param sessionId The session ID
   * @returns The session or null if not found
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) ?? null;
  }
  /**
   * End an interview session
   *
   * @param sessionId The session ID
   */
  endSession(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session2.status = "completed";
    session2.completedAt = /* @__PURE__ */ new Date();
    this.logger?.info("Ended interview session", {
      sessionId,
      projectId: session2.projectId,
      requirementCount: session2.extractedRequirements.length,
      messageCount: session2.messages.length
    });
    void this.eventBus.emit("interview:completed", {
      projectId: session2.projectId,
      totalRequirements: session2.extractedRequirements.length,
      categories: [...new Set(session2.extractedRequirements.map((r) => r.category))],
      duration: session2.completedAt.getTime() - session2.startedAt.getTime()
    });
  }
  /**
   * Pause an interview session
   *
   * @param sessionId The session ID
   */
  pauseSession(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session2.status = "paused";
    session2.lastActivityAt = /* @__PURE__ */ new Date();
    this.logger?.info("Paused interview session", {
      sessionId,
      projectId: session2.projectId
    });
  }
  /**
   * Resume a paused interview session
   *
   * @param sessionId The session ID
   */
  resumeSession(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session2.status !== "paused") {
      throw new Error(`Session is not paused: ${session2.status}`);
    }
    session2.status = "active";
    session2.lastActivityAt = /* @__PURE__ */ new Date();
    this.logger?.info("Resumed interview session", {
      sessionId,
      projectId: session2.projectId
    });
  }
  /**
   * Get the initial greeting for a new session
   * @param mode The interview mode (genesis or evolution)
   */
  getInitialGreeting(mode = "genesis") {
    return mode === "evolution" ? EVOLUTION_INITIAL_GREETING : INITIAL_GREETING;
  }
  /**
   * Build messages array for LLM call
   */
  buildLLMMessages(session2) {
    let systemPrompt = INTERVIEWER_SYSTEM_PROMPT;
    if (session2.mode === "evolution" && session2.evolutionContext) {
      systemPrompt = getEvolutionSystemPrompt(session2.evolutionContext.repoMapContext);
    }
    const messages = [
      { role: "system", content: systemPrompt }
    ];
    for (const msg of session2.messages) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    return messages;
  }
  /**
   * Update explored areas based on extracted requirements
   */
  updateExploredAreas(session2, requirements2) {
    for (const req of requirements2) {
      if (req.area && !session2.exploredAreas.includes(req.area)) {
        session2.exploredAreas.push(req.area);
      }
    }
  }
  /**
   * Emit message event (fire-and-forget)
   */
  emitMessageEvent(session2, message) {
    void this.eventBus.emit("interview:question-asked", {
      projectId: session2.projectId,
      questionId: message.id,
      question: message.content,
      category: void 0
    });
  }
  /**
   * Emit requirement captured event (fire-and-forget)
   */
  emitRequirementEvent(session2, requirement) {
    const mappedCategory = CATEGORY_MAPPING$1[requirement.category] ?? "functional";
    const now = /* @__PURE__ */ new Date();
    void this.eventBus.emit("interview:requirement-captured", {
      projectId: session2.projectId,
      requirement: {
        id: requirement.id,
        projectId: session2.projectId,
        category: mappedCategory,
        content: requirement.text,
        priority: requirement.priority,
        source: "interview",
        createdAt: now,
        updatedAt: now
      }
    });
  }
}
const CATEGORY_MAPPING = {
  "functional": "functional",
  "non-functional": "non-functional",
  "technical": "technical",
  "constraint": "technical",
  "assumption": "functional"
};
class InterviewSessionManager {
  db;
  eventBus;
  logger;
  autoSaveIntervalMs;
  autoSaveTimer = null;
  currentSession = null;
  constructor(options) {
    this.db = options.db;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.autoSaveIntervalMs = options.autoSaveInterval ?? 3e4;
  }
  /**
   * Save an interview session to the database
   *
   * @param session The session to save
   */
  save(session2) {
    const serialized = this.serializeSession(session2);
    const now = /* @__PURE__ */ new Date();
    const existing = this.db.db.select().from(sessions).where(eq(sessions.id, session2.id)).get();
    if (existing) {
      this.db.db.update(sessions).set({
        status: session2.status,
        data: JSON.stringify(serialized),
        endedAt: session2.status === "completed" ? now : null
      }).where(eq(sessions.id, session2.id)).run();
      this.logger?.debug("Updated interview session", { sessionId: session2.id });
    } else {
      this.db.db.insert(sessions).values({
        id: session2.id,
        projectId: session2.projectId,
        type: "interview",
        status: session2.status,
        data: JSON.stringify(serialized),
        startedAt: session2.startedAt,
        endedAt: session2.status === "completed" ? now : null
      }).run();
      this.logger?.info("Created interview session", { sessionId: session2.id });
    }
    void this.eventBus.emit("interview:saved", {
      projectId: session2.projectId,
      sessionId: session2.id
    });
  }
  /**
   * Load an interview session by ID
   *
   * @param sessionId The session ID to load
   * @returns The session or null if not found
   */
  load(sessionId) {
    const row = this.db.db.select().from(sessions).where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.type, "interview")
      )
    ).get();
    if (!row || !row.data) {
      return null;
    }
    return this.deserializeSession(row.data);
  }
  /**
   * Load the active or paused interview session for a project
   *
   * @param projectId The project ID
   * @returns The resumable session or null if none found
   */
  loadByProject(projectId) {
    const row = this.db.db.select().from(sessions).where(
      and(
        eq(sessions.projectId, projectId),
        eq(sessions.type, "interview"),
        or(
          eq(sessions.status, "active"),
          eq(sessions.status, "paused")
        )
      )
    ).orderBy(desc(sessions.startedAt)).get();
    if (!row || !row.data) {
      return null;
    }
    return this.deserializeSession(row.data);
  }
  /**
   * Delete an interview session
   *
   * @param sessionId The session ID to delete
   */
  delete(sessionId) {
    this.db.db.delete(sessions).where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.type, "interview")
      )
    ).run();
    this.logger?.info("Deleted interview session", { sessionId });
  }
  /**
   * Start auto-save for a session
   *
   * @param session The session to auto-save
   */
  startAutoSave(session2) {
    this.stopAutoSave();
    this.currentSession = session2;
    this.autoSaveTimer = setInterval(() => {
      if (this.currentSession) {
        this.save(this.currentSession);
        this.logger?.debug("Auto-saved interview session", {
          sessionId: this.currentSession.id
        });
      }
    }, this.autoSaveIntervalMs);
    this.logger?.info("Started auto-save for interview session", {
      sessionId: session2.id,
      intervalMs: this.autoSaveIntervalMs
    });
  }
  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.currentSession = null;
      this.logger?.debug("Stopped auto-save");
    }
  }
  /**
   * Export session requirements to RequirementsDB
   *
   * @param session The session containing requirements
   * @param requirementsDB The RequirementsDB instance
   * @returns Number of requirements exported
   */
  exportToRequirementsDB(session2, requirementsDB) {
    let exported = 0;
    for (const req of session2.extractedRequirements) {
      try {
        const dbCategory = CATEGORY_MAPPING[req.category] ?? "functional";
        requirementsDB.addRequirement(session2.projectId, {
          category: dbCategory,
          description: req.text,
          priority: req.priority,
          source: `interview:${session2.id}`,
          confidence: req.confidence,
          tags: req.area ? [req.area] : []
        });
        exported++;
      } catch (error) {
        this.logger?.warn("Failed to export requirement", {
          requirementId: req.id,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    this.logger?.info("Exported requirements to RequirementsDB", {
      sessionId: session2.id,
      exportedCount: exported,
      totalCount: session2.extractedRequirements.length
    });
    return exported;
  }
  /**
   * Serialize session for database storage
   */
  serializeSession(session2) {
    return {
      id: session2.id,
      projectId: session2.projectId,
      status: session2.status,
      mode: session2.mode,
      evolutionContext: session2.evolutionContext,
      messages: session2.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })),
      extractedRequirements: session2.extractedRequirements,
      exploredAreas: session2.exploredAreas,
      startedAt: session2.startedAt.toISOString(),
      lastActivityAt: session2.lastActivityAt.toISOString(),
      completedAt: session2.completedAt?.toISOString()
    };
  }
  /**
   * Deserialize session from database storage
   */
  deserializeSession(data) {
    const parsed = JSON.parse(data);
    return {
      id: parsed.id,
      projectId: parsed.projectId,
      status: parsed.status,
      mode: parsed.mode ?? "genesis",
      // Default to genesis for backward compatibility
      evolutionContext: parsed.evolutionContext,
      messages: parsed.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })),
      extractedRequirements: parsed.extractedRequirements,
      exploredAreas: parsed.exploredAreas,
      startedAt: new Date(parsed.startedAt),
      lastActivityAt: new Date(parsed.lastActivityAt),
      completedAt: parsed.completedAt ? new Date(parsed.completedAt) : void 0
    };
  }
}
class RequirementsDB {
  db;
  /**
   * In-memory storage for requirements
   * TODO: Replace with actual database table queries
   */
  requirements = /* @__PURE__ */ new Map();
  constructor(db) {
    this.db = db;
  }
  /**
   * Add a new requirement to a project
   *
   * @param projectId - The project ID
   * @param input - The requirement data
   * @returns The created requirement
   */
  addRequirement(projectId, input) {
    const now = /* @__PURE__ */ new Date();
    const requirement = {
      id: nanoid(),
      projectId,
      category: input.category,
      description: input.description,
      priority: input.priority,
      source: input.source,
      confidence: input.confidence ?? 0.8,
      tags: input.tags ?? [],
      userStories: input.userStories ?? [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      linkedFeatures: [],
      validated: false,
      createdAt: now
    };
    const existing = Array.from(this.requirements.values()).find(
      (r) => r.projectId === projectId && r.description === input.description
    );
    if (existing) {
      throw new Error(`Duplicate requirement: ${input.description.substring(0, 50)}...`);
    }
    this.requirements.set(requirement.id, requirement);
    return requirement;
  }
  /**
   * Get a requirement by ID
   *
   * @param id - The requirement ID
   * @returns The requirement or null if not found
   */
  getRequirement(id) {
    return this.requirements.get(id) ?? null;
  }
  /**
   * Get all requirements for a project
   *
   * @param projectId - The project ID
   * @param options - Query options
   * @returns Array of requirements
   */
  getRequirements(projectId, options = {}) {
    let results = Array.from(this.requirements.values()).filter((r) => r.projectId === projectId);
    if (options.category) {
      results = results.filter((r) => r.category === options.category);
    }
    if (options.priority) {
      results = results.filter((r) => r.priority === options.priority);
    }
    if (options.validated !== void 0) {
      results = results.filter((r) => r.validated === options.validated);
    }
    if (options.tags && options.tags.length > 0) {
      const tagList = options.tags;
      results = results.filter((r) => tagList.some((tag) => r.tags.includes(tag)));
    }
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }
  /**
   * Update a requirement
   *
   * @param id - The requirement ID
   * @param updates - The fields to update
   * @returns The updated requirement
   */
  updateRequirement(id, updates) {
    const existing = this.requirements.get(id);
    if (!existing) {
      throw new Error(`Requirement not found: ${id}`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.requirements.set(id, updated);
    return updated;
  }
  /**
   * Delete a requirement
   *
   * @param id - The requirement ID
   * @returns True if deleted, false if not found
   */
  deleteRequirement(id) {
    return this.requirements.delete(id);
  }
  /**
   * Validate a requirement (mark as reviewed and approved)
   *
   * @param id - The requirement ID
   * @returns The updated requirement
   */
  validateRequirement(id) {
    return this.updateRequirement(id, { validated: true });
  }
  /**
   * Link a requirement to a feature
   *
   * @param requirementId - The requirement ID
   * @param featureId - The feature ID
   * @returns The updated requirement
   */
  linkToFeature(requirementId, featureId) {
    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }
    if (!existing.linkedFeatures.includes(featureId)) {
      existing.linkedFeatures.push(featureId);
      existing.updatedAt = /* @__PURE__ */ new Date();
    }
    return existing;
  }
  /**
   * Get requirements statistics for a project
   *
   * @param projectId - The project ID
   * @returns Statistics about the requirements
   */
  getStatistics(projectId) {
    const requirements2 = this.getRequirements(projectId);
    const byCategory = {
      functional: 0,
      "non-functional": 0,
      technical: 0
    };
    const byPriority = {
      must: 0,
      should: 0,
      could: 0,
      wont: 0
    };
    let validated = 0;
    for (const req of requirements2) {
      byCategory[req.category]++;
      byPriority[req.priority]++;
      if (req.validated) validated++;
    }
    return {
      total: requirements2.length,
      byCategory,
      byPriority,
      validated,
      unvalidated: requirements2.length - validated
    };
  }
  /**
   * Clear all requirements for a project (for testing)
   *
   * @param projectId - The project ID
   */
  clearProject(projectId) {
    const toDelete = Array.from(this.requirements.entries()).filter(([, r]) => r.projectId === projectId).map(([id]) => id);
    for (const id of toDelete) {
      this.requirements.delete(id);
    }
  }
}
class DatabaseClient {
  sqlite;
  _db;
  options;
  constructor(options) {
    this.options = options;
    if (options.path !== ":memory:") {
      ensureDirSync(dirname(options.path));
    }
    this.sqlite = new Database(options.path);
    this.sqlite.pragma("journal_mode = WAL");
    this.sqlite.pragma("foreign_keys = ON");
    this.sqlite.pragma("busy_timeout = 5000");
    this._db = drizzle(this.sqlite, {
      schema: schema$1,
      logger: options.debug
    });
  }
  /**
   * Create and initialize a DatabaseClient.
   *
   * @param options - Configuration options
   * @returns Initialized DatabaseClient
   */
  static create(options) {
    const client = new DatabaseClient(options);
    if (options.migrationsDir) {
      client.migrate(options.migrationsDir);
    }
    return client;
  }
  /**
   * Create an in-memory database (useful for testing).
   *
   * @param migrationsDir - Optional migrations directory
   * @returns In-memory DatabaseClient
   */
  static createInMemory(migrationsDir) {
    return DatabaseClient.create({
      path: ":memory:",
      migrationsDir,
      debug: false
    });
  }
  /**
   * Get the Drizzle database instance for queries.
   */
  get db() {
    return this._db;
  }
  /**
   * Get the raw better-sqlite3 database instance.
   * Use with caution - prefer Drizzle queries.
   */
  get raw() {
    return this.sqlite;
  }
  /**
   * Run database migrations.
   *
   * @param migrationsDir - Path to migrations folder
   */
  migrate(migrationsDir) {
    try {
      migrate(this._db, { migrationsFolder: migrationsDir });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Migration failed: ${message}`);
    }
  }
  /**
   * Get list of all tables in the database.
   *
   * @returns Array of table names
   */
  tables() {
    const result = this.sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__%'"
    ).all();
    return result.map((r) => r.name);
  }
  /**
   * Check database health status.
   *
   * @returns Health status object
   */
  health() {
    try {
      this.sqlite.prepare("SELECT 1").get();
      const journalMode = this.sqlite.pragma("journal_mode");
      const walMode = journalMode[0]?.journal_mode.toLowerCase() === "wal";
      const foreignKeys = this.sqlite.pragma("foreign_keys");
      const foreignKeysEnabled = foreignKeys[0]?.foreign_keys === 1;
      const tables = this.tables();
      return {
        healthy: true,
        walMode,
        foreignKeys: foreignKeysEnabled,
        tables
      };
    } catch {
      return {
        healthy: false,
        walMode: false,
        foreignKeys: false,
        tables: []
      };
    }
  }
  /**
   * Simple health check ping.
   *
   * @returns true if database is responsive
   */
  ping() {
    try {
      this.sqlite.prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Execute operations within a transaction.
   *
   * @param fn - Function to execute within transaction
   * @returns Result of the function
   */
  transaction(fn) {
    return this.sqlite.transaction(() => {
      return fn(this._db);
    })();
  }
  /**
   * Execute raw SQL (use with caution).
   *
   * @param sql - SQL statement to execute
   */
  exec(sql) {
    this.sqlite.exec(sql);
  }
  /**
   * Close the database connection.
   */
  close() {
    try {
      if (this.options.path !== ":memory:") {
        this.sqlite.pragma("wal_checkpoint(TRUNCATE)");
      }
      this.sqlite.close();
    } catch {
    }
  }
  /**
   * Get database file path.
   */
  get path() {
    return this.options.path;
  }
  /**
   * Check if this is an in-memory database.
   */
  get isInMemory() {
    return this.options.path === ":memory:";
  }
}
class StateManager {
  db;
  autoPersist;
  states;
  constructor(options) {
    this.db = options.db;
    this.autoPersist = options.autoPersist ?? true;
    this.states = /* @__PURE__ */ new Map();
  }
  /**
   * Load state for a project
   * @param projectId Project to load state for
   * @returns State if found, null otherwise
   */
  loadState(projectId) {
    const cached = this.states.get(projectId);
    if (cached) {
      return cached;
    }
    try {
      const row = this.db.db.select().from(projectStates).where(eq(projectStates.projectId, projectId)).get();
      if (row && row.stateData) {
        const state2 = JSON.parse(row.stateData);
        state2.lastUpdatedAt = new Date(state2.lastUpdatedAt);
        state2.createdAt = new Date(state2.createdAt);
        this.states.set(projectId, state2);
        return state2;
      }
    } catch (error) {
      console.error("[StateManager] Failed to load state from database:", error);
    }
    return null;
  }
  /**
   * Save state for a project (with database persistence)
   * @param state State to save
   */
  saveState(state2) {
    state2.lastUpdatedAt = /* @__PURE__ */ new Date();
    this.states.set(state2.projectId, state2);
    if (this.autoPersist) {
      this.persistToDatabase(state2);
    }
  }
  /**
   * Persist state to database
   */
  persistToDatabase(state2) {
    try {
      const now = /* @__PURE__ */ new Date();
      const stateData = JSON.stringify(state2);
      const existing = this.db.db.select().from(projectStates).where(eq(projectStates.projectId, state2.projectId)).get();
      if (existing) {
        this.db.db.update(projectStates).set({
          status: state2.status,
          mode: state2.mode,
          stateData,
          currentFeatureIndex: state2.currentFeatureIndex,
          currentTaskIndex: state2.currentTaskIndex,
          completedTasks: state2.completedTasks,
          totalTasks: state2.totalTasks,
          updatedAt: now
        }).where(eq(projectStates.projectId, state2.projectId)).run();
      } else {
        this.db.db.insert(projectStates).values({
          id: v4(),
          projectId: state2.projectId,
          status: state2.status,
          mode: state2.mode,
          stateData,
          currentFeatureIndex: state2.currentFeatureIndex,
          currentTaskIndex: state2.currentTaskIndex,
          completedTasks: state2.completedTasks,
          totalTasks: state2.totalTasks,
          createdAt: now,
          updatedAt: now
        }).run();
      }
      console.log(`[StateManager] Persisted state for project ${state2.projectId}`);
    } catch (error) {
      console.error("[StateManager] Failed to persist state:", error);
    }
  }
  /**
   * Update partial state for a project
   * @param projectId Project to update
   * @param updates Partial state updates
   * @returns Updated state
   */
  updateState(projectId, updates) {
    const current = this.loadState(projectId);
    if (!current) {
      return null;
    }
    const updated = {
      ...current,
      ...updates,
      projectId,
      // Ensure projectId doesn't change
      lastUpdatedAt: /* @__PURE__ */ new Date()
    };
    this.saveState(updated);
    return updated;
  }
  /**
   * Delete state for a project
   * @param projectId Project to delete state for
   */
  deleteState(projectId) {
    try {
      this.db.db.delete(projectStates).where(eq(projectStates.projectId, projectId)).run();
    } catch (error) {
      console.error("[StateManager] Failed to delete state from database:", error);
    }
    return this.states.delete(projectId);
  }
  /**
   * Check if state exists for a project
   * @param projectId Project to check
   */
  hasState(projectId) {
    return this.states.has(projectId);
  }
  /**
   * Get all project IDs with state
   */
  getAllProjectIds() {
    return Array.from(this.states.keys());
  }
  /**
   * Create a new state for a project
   * @param projectId Project identifier
   * @param projectName Human-readable project name
   * @param mode Genesis or evolution mode
   * @returns Created state
   */
  createState(projectId, projectName, mode) {
    const now = /* @__PURE__ */ new Date();
    const state2 = {
      projectId,
      projectName,
      status: "initializing",
      mode,
      features: [],
      currentFeatureIndex: 0,
      currentTaskIndex: 0,
      completedTasks: 0,
      totalTasks: 0,
      lastUpdatedAt: now,
      createdAt: now
    };
    this.saveState(state2);
    return state2;
  }
  /**
   * Clear all in-memory state (for testing)
   */
  clearAll() {
    this.states.clear();
  }
}
class CheckpointError extends Error {
  constructor(message) {
    super(message);
    this.name = "CheckpointError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class CheckpointNotFoundError extends CheckpointError {
  checkpointId;
  constructor(checkpointId) {
    super(`Checkpoint not found: ${checkpointId}`);
    this.name = "CheckpointNotFoundError";
    this.checkpointId = checkpointId;
  }
}
class RestoreError extends CheckpointError {
  checkpointId;
  reason;
  constructor(checkpointId, reason) {
    super(`Failed to restore checkpoint ${checkpointId}: ${reason}`);
    this.name = "RestoreError";
    this.checkpointId = checkpointId;
    this.reason = reason;
  }
}
class CheckpointManager {
  db;
  stateManager;
  gitService;
  eventBus;
  maxCheckpoints;
  logger;
  constructor(options) {
    this.db = options.db;
    this.stateManager = options.stateManager;
    this.gitService = options.gitService;
    this.eventBus = options.eventBus;
    this.maxCheckpoints = options.maxCheckpoints ?? 50;
    this.logger = options.logger;
  }
  /**
   * Log a message if logger is available
   */
  log(level, message, ...args) {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }
  /**
   * Create a checkpoint for a project.
   * @param projectId Project to checkpoint
   * @param reason Human-readable reason for checkpoint
   * @returns Created checkpoint with id and timestamp
   */
  async createCheckpoint(projectId, reason) {
    this.log("debug", `Creating checkpoint for project ${projectId}: ${reason}`);
    const state2 = this.stateManager.loadState(projectId);
    if (!state2) {
      throw new CheckpointError(`Project not found: ${projectId}`);
    }
    let gitCommit = null;
    try {
      const log = await this.gitService.getLog(1);
      if (log.length > 0 && log[0]) {
        gitCommit = log[0].hash;
      }
    } catch {
      this.log("warn", "Could not get git commit hash");
    }
    const stateJson = JSON.stringify(state2);
    const checkpointId = v4();
    const now = /* @__PURE__ */ new Date();
    const newCheckpoint = {
      id: checkpointId,
      projectId,
      name: `Checkpoint: ${reason}`,
      reason,
      state: stateJson,
      gitCommit,
      createdAt: now
    };
    this.db.db.insert(checkpoints).values(newCheckpoint).run();
    const pruned = this.pruneOldCheckpoints(projectId);
    if (pruned > 0) {
      this.log("info", `Pruned ${String(pruned)} old checkpoints for project ${projectId}`);
    }
    if (this.eventBus) {
      void this.eventBus.emit(
        "system:checkpoint-created",
        {
          checkpointId,
          projectId,
          reason,
          gitCommit: gitCommit ?? ""
        },
        { source: "CheckpointManager" }
      );
    }
    return {
      id: checkpointId,
      projectId,
      name: `Checkpoint: ${reason}`,
      reason,
      state: stateJson,
      gitCommit,
      createdAt: now
    };
  }
  /**
   * Restore state from a checkpoint.
   * @param checkpointId Checkpoint to restore
   * @param options Restore options (e.g., restore git state)
   * @throws CheckpointNotFoundError if checkpoint doesn't exist
   */
  async restoreCheckpoint(checkpointId, options) {
    this.log("debug", `Restoring checkpoint ${checkpointId}`);
    const checkpoint = this.db.db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId)).get();
    if (!checkpoint) {
      throw new CheckpointNotFoundError(checkpointId);
    }
    if (!checkpoint.state) {
      throw new RestoreError(checkpointId, "Checkpoint has no state data");
    }
    let state2;
    try {
      state2 = JSON.parse(checkpoint.state);
    } catch {
      throw new RestoreError(checkpointId, "Invalid state data");
    }
    this.stateManager.saveState(state2);
    if (options?.restoreGit && checkpoint.gitCommit) {
      try {
        await this.gitService.checkoutBranch(checkpoint.gitCommit);
      } catch (err) {
        this.log(
          "warn",
          `Could not restore git state: ${err.message}`
        );
      }
    }
    if (this.eventBus) {
      void this.eventBus.emit(
        "system:checkpoint-restored",
        {
          checkpointId,
          projectId: checkpoint.projectId,
          gitCommit: checkpoint.gitCommit ?? ""
        },
        { source: "CheckpointManager" }
      );
    }
  }
  /**
   * List all checkpoints for a project.
   * @param projectId Project to list checkpoints for
   * @returns Checkpoints ordered by date descending
   */
  listCheckpoints(projectId) {
    this.log("debug", `Listing checkpoints for project ${projectId}`);
    const result = this.db.db.select().from(checkpoints).where(eq(checkpoints.projectId, projectId)).orderBy(desc(checkpoints.createdAt)).all();
    return result;
  }
  /**
   * Delete a checkpoint.
   * @param checkpointId Checkpoint to delete
   */
  deleteCheckpoint(checkpointId) {
    this.log("debug", `Deleting checkpoint ${checkpointId}`);
    this.db.db.delete(checkpoints).where(eq(checkpoints.id, checkpointId)).run();
  }
  /**
   * Create automatic checkpoint based on system event.
   * @param projectId Project to checkpoint
   * @param trigger System event that triggered checkpoint
   */
  async createAutoCheckpoint(projectId, trigger) {
    const reason = `Auto-checkpoint: ${trigger}`;
    return this.createCheckpoint(projectId, reason);
  }
  /**
   * Prune old checkpoints beyond maxCheckpoints limit.
   * Keeps the N most recent checkpoints and deletes the rest.
   * @param projectId Project to prune checkpoints for
   * @returns Number of checkpoints deleted
   */
  pruneOldCheckpoints(projectId) {
    const allCheckpoints = this.listCheckpoints(projectId);
    if (allCheckpoints.length <= this.maxCheckpoints) {
      return 0;
    }
    const toDelete = allCheckpoints.slice(this.maxCheckpoints);
    for (const cp of toDelete) {
      this.deleteCheckpoint(cp.id);
    }
    this.log(
      "debug",
      `Pruned ${String(toDelete.length)} checkpoints for project ${projectId}`
    );
    return toDelete.length;
  }
}
class ReviewNotFoundError extends Error {
  reviewId;
  constructor(reviewId) {
    super(`Review not found: ${reviewId}`);
    this.name = "ReviewNotFoundError";
    this.reviewId = reviewId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class HumanReviewService {
  db;
  eventBus;
  checkpointManager;
  logger;
  /** In-memory cache of pending reviews */
  pendingReviews = /* @__PURE__ */ new Map();
  constructor(options) {
    this.db = options.db;
    this.eventBus = options.eventBus;
    this.checkpointManager = options.checkpointManager;
    this.logger = options.logger;
    this.loadPendingReviews();
  }
  /**
   * Log a message if logger is available
   */
  log(level, message, ...args) {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }
  /**
   * Load pending reviews from database into memory cache
   */
  loadPendingReviews() {
    this.log("debug", "Loading pending reviews from database");
    const rows = this.db.db.select().from(sessions).where(
      and(
        eq(sessions.type, "review"),
        eq(sessions.status, "pending")
      )
    ).all();
    for (const row of rows) {
      if (row.data) {
        try {
          const review = this.deserializeReview(row.data);
          if (review.status === "pending") {
            this.pendingReviews.set(review.id, review);
          }
        } catch (err) {
          this.log("warn", "Failed to deserialize review", {
            sessionId: row.id,
            error: err instanceof Error ? err.message : "Unknown error"
          });
        }
      }
    }
    this.log("info", `Loaded ${String(this.pendingReviews.size)} pending reviews`);
  }
  /**
   * Create a new review request
   */
  async requestReview(options) {
    const reviewId = v4();
    const now = /* @__PURE__ */ new Date();
    const review = {
      id: reviewId,
      taskId: options.taskId,
      projectId: options.projectId,
      reason: options.reason,
      context: options.context ?? {},
      status: "pending",
      createdAt: now
    };
    const serialized = this.serializeReview(review);
    this.db.db.insert(sessions).values({
      id: reviewId,
      projectId: options.projectId,
      type: "review",
      status: "pending",
      data: serialized,
      startedAt: now
    }).run();
    this.log("info", "Created review request", {
      reviewId,
      taskId: options.taskId,
      reason: options.reason
    });
    if (this.checkpointManager) {
      try {
        await this.checkpointManager.createCheckpoint(
          options.projectId,
          `Review requested: ${options.reason}`
        );
        this.log("debug", "Created safety checkpoint for review", { reviewId });
      } catch (err) {
        this.log("warn", "Failed to create safety checkpoint", {
          reviewId,
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }
    this.pendingReviews.set(reviewId, review);
    void this.eventBus.emit(
      "review:requested",
      {
        reviewId,
        taskId: options.taskId,
        reason: options.reason,
        context: review.context
      },
      { source: "HumanReviewService" }
    );
    return review;
  }
  /**
   * Approve a pending review
   */
  approveReview(reviewId, resolution) {
    const review = this.pendingReviews.get(reviewId);
    if (!review) {
      return Promise.reject(new ReviewNotFoundError(reviewId));
    }
    const now = /* @__PURE__ */ new Date();
    review.status = "approved";
    review.resolvedAt = now;
    review.resolution = resolution;
    const serialized = this.serializeReview(review);
    this.db.db.update(sessions).set({
      status: "approved",
      data: serialized,
      endedAt: now
    }).where(eq(sessions.id, reviewId)).run();
    this.log("info", "Review approved", { reviewId, resolution });
    this.pendingReviews.delete(reviewId);
    void this.eventBus.emit(
      "review:approved",
      {
        reviewId,
        resolution
      },
      { source: "HumanReviewService" }
    );
    return Promise.resolve();
  }
  /**
   * Reject a pending review
   */
  rejectReview(reviewId, feedback) {
    const review = this.pendingReviews.get(reviewId);
    if (!review) {
      return Promise.reject(new ReviewNotFoundError(reviewId));
    }
    const now = /* @__PURE__ */ new Date();
    review.status = "rejected";
    review.resolvedAt = now;
    review.resolution = feedback;
    const serialized = this.serializeReview(review);
    this.db.db.update(sessions).set({
      status: "rejected",
      data: serialized,
      endedAt: now
    }).where(eq(sessions.id, reviewId)).run();
    this.log("info", "Review rejected", { reviewId, feedback });
    this.pendingReviews.delete(reviewId);
    void this.eventBus.emit(
      "review:rejected",
      {
        reviewId,
        feedback
      },
      { source: "HumanReviewService" }
    );
    return Promise.resolve();
  }
  /**
   * List all pending reviews
   */
  listPendingReviews() {
    return Array.from(this.pendingReviews.values());
  }
  /**
   * Get a specific review by ID
   */
  getReview(reviewId) {
    return this.pendingReviews.get(reviewId);
  }
  /**
   * Serialize a review for database storage
   */
  serializeReview(review) {
    const serialized = {
      id: review.id,
      taskId: review.taskId,
      projectId: review.projectId,
      reason: review.reason,
      context: review.context,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
      resolvedAt: review.resolvedAt?.toISOString(),
      resolution: review.resolution
    };
    return JSON.stringify(serialized);
  }
  /**
   * Deserialize a review from database storage
   */
  deserializeReview(data) {
    const parsed = JSON.parse(data);
    return {
      id: parsed.id,
      taskId: parsed.taskId,
      projectId: parsed.projectId,
      reason: parsed.reason,
      context: parsed.context,
      status: parsed.status,
      createdAt: new Date(parsed.createdAt),
      resolvedAt: parsed.resolvedAt ? new Date(parsed.resolvedAt) : void 0,
      resolution: parsed.resolution
    };
  }
}
class MergerRunner {
  baseDir;
  worktreeManager;
  constructor(config) {
    this.baseDir = config.baseDir;
    this.worktreeManager = config.worktreeManager;
  }
  /**
   * Merge a worktree branch to the target branch
   *
   * @param worktreePath - Path to the worktree or branch name
   * @param targetBranch - Target branch to merge into (default: 'main')
   * @param options - Additional merge options
   * @returns MergeResult with success/failure and details
   */
  async merge(worktreePath, targetBranch = "main", options = {}) {
    console.log(`[MergerRunner] Starting merge: ${worktreePath} -> ${targetBranch}`);
    try {
      const branchName = await this.getBranchFromWorktree(worktreePath);
      if (!branchName) {
        return {
          success: false,
          error: `Could not determine branch for worktree: ${worktreePath}`
        };
      }
      console.log(`[MergerRunner] Source branch: ${branchName}`);
      await this.checkoutTargetBranch(targetBranch);
      await this.pullLatestChanges(targetBranch);
      const mergeResult = await this.performMerge(branchName, targetBranch, options);
      if (mergeResult.success) {
        console.log(`[MergerRunner] Merge successful: ${mergeResult.commitHash ?? "unknown"}`);
      } else {
        console.log(`[MergerRunner] Merge failed: ${mergeResult.error ?? "unknown"}`);
      }
      return mergeResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MergerRunner] Merge exception: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  /**
   * Get the branch name from a worktree path
   */
  async getBranchFromWorktree(worktreePath) {
    if (this.worktreeManager) {
      try {
        const info = this.getWorktreeInfoByPath(worktreePath);
        if (info?.branch) {
          return info.branch;
        }
      } catch {
      }
    }
    try {
      const { stdout } = await execaCommand("git rev-parse --abbrev-ref HEAD", {
        cwd: worktreePath
      });
      return stdout.trim();
    } catch {
      if (!worktreePath.includes("/") && !worktreePath.includes("\\")) {
        return worktreePath;
      }
      return null;
    }
  }
  /**
   * Get worktree info by path (if worktreeManager available)
   */
  getWorktreeInfoByPath(_path) {
    return null;
  }
  /**
   * Checkout the target branch in the base directory
   */
  async checkoutTargetBranch(targetBranch) {
    console.log(`[MergerRunner] Checking out target branch: ${targetBranch}`);
    try {
      const { stdout: statusOutput } = await execaCommand("git status --porcelain", {
        cwd: this.baseDir
      });
      if (statusOutput.trim()) {
        console.warn(`[MergerRunner] Warning: Working directory has uncommitted changes`);
        await execaCommand('git stash push -m "nexus-merge-autostash"', {
          cwd: this.baseDir
        });
      }
      await execaCommand(`git checkout ${targetBranch}`, {
        cwd: this.baseDir
      });
    } catch (error) {
      throw new Error(`Failed to checkout ${targetBranch}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Pull latest changes from remote
   */
  async pullLatestChanges(branch) {
    console.log(`[MergerRunner] Pulling latest changes for: ${branch}`);
    try {
      const { stdout: remoteOutput } = await execaCommand("git remote", {
        cwd: this.baseDir
      });
      if (remoteOutput.trim()) {
        const remote = remoteOutput.trim().split("\n")[0];
        await execaCommand(`git pull ${remote} ${branch} --ff-only`, {
          cwd: this.baseDir
        });
      }
    } catch {
      console.log(`[MergerRunner] Could not pull latest changes (continuing with local state)`);
    }
  }
  /**
   * Perform the actual merge operation
   */
  async performMerge(sourceBranch, targetBranch, options) {
    const message = options.message || `Merge ${sourceBranch} into ${targetBranch} (Nexus task completion)`;
    try {
      let mergeCmd = `git merge ${sourceBranch}`;
      if (options.squash) {
        mergeCmd += " --squash";
      }
      if (options.fastForward === false) {
        mergeCmd += " --no-ff";
      }
      mergeCmd += ` -m "${message}"`;
      console.log(`[MergerRunner] Executing: ${mergeCmd}`);
      const { stdout } = await execaCommand(mergeCmd, {
        cwd: this.baseDir
      });
      const { stdout: commitHash } = await execaCommand("git rev-parse HEAD", {
        cwd: this.baseDir
      });
      const stats = this.parseMergeStats(stdout);
      return {
        success: true,
        commitHash: commitHash.trim(),
        filesChanged: stats.filesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions
      };
    } catch (error) {
      const conflictFiles = await this.checkForConflicts();
      if (conflictFiles.length > 0) {
        try {
          await execaCommand("git merge --abort", { cwd: this.baseDir });
        } catch {
        }
        return {
          success: false,
          error: `Merge conflict in ${conflictFiles.length} file(s)`,
          conflictFiles
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Check for merge conflicts
   */
  async checkForConflicts() {
    try {
      const { stdout } = await execaCommand("git diff --name-only --diff-filter=U", {
        cwd: this.baseDir
      });
      if (stdout.trim()) {
        return stdout.trim().split("\n").filter(Boolean);
      }
    } catch {
    }
    return [];
  }
  /**
   * Parse merge output for statistics
   */
  parseMergeStats(output) {
    const stats = { filesChanged: 0, insertions: 0, deletions: 0 };
    const statsMatch = output.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    if (statsMatch) {
      stats.filesChanged = parseInt(statsMatch[1], 10) || 0;
      stats.insertions = parseInt(statsMatch[2], 10) || 0;
      stats.deletions = parseInt(statsMatch[3], 10) || 0;
    }
    return stats;
  }
  /**
   * Push merged changes to remote
   */
  async pushToRemote(branch = "main") {
    console.log(`[MergerRunner] Pushing to remote: ${branch}`);
    try {
      const { stdout: remoteOutput } = await execaCommand("git remote", {
        cwd: this.baseDir
      });
      if (!remoteOutput.trim()) {
        return { success: false, error: "No remote configured" };
      }
      const remote = remoteOutput.trim().split("\n")[0];
      await execaCommand(`git push ${remote} ${branch}`, {
        cwd: this.baseDir
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Abort an in-progress merge
   */
  async abortMerge() {
    try {
      await execaCommand("git merge --abort", { cwd: this.baseDir });
      console.log(`[MergerRunner] Merge aborted`);
    } catch {
    }
  }
  /**
   * Check if a merge is currently in progress
   */
  async isMergeInProgress() {
    try {
      await execaCommand("git merge HEAD", {
        cwd: this.baseDir
      });
      return false;
    } catch {
      try {
        const { stdout } = await execaCommand("git rev-parse -q --verify MERGE_HEAD", {
          cwd: this.baseDir
        });
        return !!stdout.trim();
      } catch {
        return false;
      }
    }
  }
}
let bootstrappedNexus = null;
let bootstrapInstance = null;
let mainWindowRef = null;
class NexusBootstrap {
  config;
  nexus = null;
  interviewEngine = null;
  sessionManager = null;
  eventBus;
  requirementsDB = null;
  databaseClient = null;
  stateManager = null;
  checkpointManager = null;
  humanReviewService = null;
  gitService = null;
  mergerRunner = null;
  repoMapGenerator = null;
  unsubscribers = [];
  /** Track project start times for completion metrics */
  projectStartTimes = /* @__PURE__ */ new Map();
  /** Track project features for completion metrics */
  projectFeatures = /* @__PURE__ */ new Map();
  constructor(config) {
    this.config = config;
    this.eventBus = getEventBus();
  }
  /**
   * Initialize all components and wire them together
   */
  async initialize() {
    if (bootstrappedNexus) {
      return bootstrappedNexus;
    }
    console.log("[NexusBootstrap] Initializing components...");
    const factoryConfig = {
      workingDir: this.config.workingDir,
      claudeApiKey: this.config.apiKeys?.anthropic,
      geminiApiKey: this.config.apiKeys?.google,
      openaiApiKey: this.config.apiKeys?.openai,
      claudeBackend: this.config.useCli?.claude ? "cli" : "api",
      geminiBackend: this.config.useCli?.gemini ? "cli" : "api"
    };
    try {
      this.nexus = await NexusFactory.create(factoryConfig);
      console.log("[NexusBootstrap] NexusFactory created successfully");
    } catch (error) {
      console.error("[NexusBootstrap] Failed to create NexusFactory:", error);
      throw error;
    }
    const dbPath = `${this.config.dataDir}/nexus.db`;
    const isDev = !app.isPackaged;
    const migrationsDir = isDev ? join$1(process.cwd(), "src", "persistence", "database", "migrations") : join$1(app.getAppPath(), "migrations");
    this.databaseClient = DatabaseClient.create({
      path: dbPath,
      migrationsDir
    });
    this.requirementsDB = new RequirementsDB(this.databaseClient);
    this.gitService = new GitService({ baseDir: this.config.workingDir });
    this.stateManager = new StateManager({ db: this.databaseClient });
    this.checkpointManager = new CheckpointManager({
      db: this.databaseClient,
      stateManager: this.stateManager,
      gitService: this.gitService,
      eventBus: this.eventBus
    });
    console.log("[NexusBootstrap] CheckpointManager created");
    this.humanReviewService = new HumanReviewService({
      db: this.databaseClient,
      eventBus: this.eventBus,
      checkpointManager: this.checkpointManager
    });
    console.log("[NexusBootstrap] HumanReviewService created");
    this.nexus.coordinator.setHumanReviewService(this.humanReviewService);
    console.log("[NexusBootstrap] HumanReviewService injected into coordinator");
    this.mergerRunner = new MergerRunner({
      baseDir: this.config.workingDir,
      worktreeManager: this.nexus.worktreeManager
    });
    console.log("[NexusBootstrap] MergerRunner created");
    this.nexus.coordinator.setMergerRunner(this.mergerRunner);
    console.log("[NexusBootstrap] MergerRunner injected into coordinator");
    this.nexus.coordinator.setCheckpointManager(this.checkpointManager);
    console.log("[NexusBootstrap] CheckpointManager injected into coordinator");
    this.repoMapGenerator = new RepoMapGenerator();
    console.log("[NexusBootstrap] RepoMapGenerator created");
    const interviewOptions = {
      llmClient: this.nexus.llm.claude,
      requirementsDB: this.requirementsDB,
      eventBus: this.eventBus
    };
    this.interviewEngine = new InterviewEngine(interviewOptions);
    console.log("[NexusBootstrap] InterviewEngine created");
    const sessionManagerOptions = {
      db: this.databaseClient,
      eventBus: this.eventBus
    };
    this.sessionManager = new InterviewSessionManager(sessionManagerOptions);
    console.log("[NexusBootstrap] SessionManager created");
    this.wireEventListeners();
    console.log("[NexusBootstrap] Event listeners wired");
    this.wireCheckpointListeners();
    console.log("[NexusBootstrap] Checkpoint listeners wired");
    this.wireUIEventForwarding();
    console.log("[NexusBootstrap] UI event forwarding wired");
    bootstrappedNexus = {
      nexus: this.nexus,
      interviewEngine: this.interviewEngine,
      sessionManager: this.sessionManager,
      eventBus: this.eventBus,
      startGenesis: (name) => this.startGenesisMode(name),
      startEvolution: (path2, name) => this.startEvolutionMode(path2, name),
      createCheckpoint: (projectId, reason) => this.createCheckpointForProject(projectId, reason),
      restoreCheckpoint: (checkpointId, restoreGit) => this.restoreCheckpointById(checkpointId, restoreGit),
      listCheckpoints: (projectId) => this.listCheckpointsForProject(projectId),
      checkpointManager: this.checkpointManager,
      humanReviewService: this.humanReviewService,
      databaseClient: this.databaseClient,
      shutdown: () => this.shutdown()
    };
    console.log("[NexusBootstrap] Initialization complete");
    return bootstrappedNexus;
  }
  /**
   * CRITICAL: Wire the event listeners that connect the components
   *
   * This is where the magic happens:
   * interview:completed -> planning -> execution
   */
  wireEventListeners() {
    if (!this.nexus || !this.requirementsDB) {
      throw new Error("Nexus or RequirementsDB not initialized");
    }
    const { coordinator } = this.nexus;
    const { decomposer, resolver } = this.nexus.planning;
    const requirementCapturedUnsub = this.eventBus.on("interview:requirement-captured", (event) => {
      const { projectId, requirement } = event.payload;
      console.log(`[NexusBootstrap] Requirement captured for ${projectId}: ${requirement.content.substring(0, 50)}...`);
    });
    this.unsubscribers.push(requirementCapturedUnsub);
    const interviewCompletedUnsub = this.eventBus.on("interview:completed", async (event) => {
      const { projectId, totalRequirements } = event.payload;
      console.log(`[NexusBootstrap] Interview completed for ${projectId} with ${totalRequirements} requirements`);
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send("nexus-event", {
          type: "planning:started",
          payload: {
            projectId,
            requirementCount: totalRequirements,
            startedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[NexusBootstrap] Sent planning:started to UI`);
      }
      await this.eventBus.emit("project:status-changed", {
        projectId,
        previousStatus: "planning",
        newStatus: "executing",
        reason: "Interview completed, starting planning"
      });
      try {
        if (!this.requirementsDB) {
          throw new Error("RequirementsDB not initialized");
        }
        const requirements2 = this.requirementsDB.getRequirements(projectId);
        console.log(`[NexusBootstrap] Retrieved ${requirements2.length} requirements for decomposition`);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:progress",
            payload: {
              projectId,
              status: "analyzing",
              progress: 10,
              currentStep: "Analyzing requirements...",
              tasksCreated: 0,
              totalExpected: requirements2.length * 3
              // Estimate 3 tasks per requirement
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const featureDescription = requirements2.map((r) => `- [${r.priority}] ${r.description}`).join("\n");
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:progress",
            payload: {
              projectId,
              status: "decomposing",
              progress: 30,
              currentStep: "Breaking down into atomic tasks...",
              tasksCreated: 0,
              totalExpected: requirements2.length * 3
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const decomposedTasks = await decomposer.decompose(featureDescription);
        console.log(`[NexusBootstrap] Decomposed into ${decomposedTasks.length} tasks`);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:progress",
            payload: {
              projectId,
              status: "creating-tasks",
              progress: 60,
              currentStep: `Creating ${decomposedTasks.length} tasks...`,
              tasksCreated: 0,
              totalExpected: decomposedTasks.length
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const requirementsForFeatures = requirements2.map((r) => ({
          id: r.id,
          description: r.description,
          priority: r.priority
        }));
        const { featureCount, taskCount } = await this.storeDecomposition(projectId, decomposedTasks, requirementsForFeatures);
        console.log(`[NexusBootstrap] Stored ${featureCount} features and ${taskCount} tasks to database`);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:progress",
            payload: {
              projectId,
              status: "validating",
              progress: 85,
              currentStep: "Validating dependencies and calculating execution waves...",
              tasksCreated: taskCount,
              totalExpected: taskCount
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const waves = resolver.calculateWaves(decomposedTasks);
        console.log(`[NexusBootstrap] Calculated ${waves.length} execution waves`);
        if (!this.nexus) {
          throw new Error("Nexus not initialized");
        }
        const totalMinutes = this.nexus.planning?.estimator ? await this.nexus.planning.estimator.estimateTotal(decomposedTasks) : 0;
        console.log(`[NexusBootstrap] Estimated ${totalMinutes} minutes total`);
        await this.eventBus.emit("project:status-changed", {
          projectId,
          previousStatus: "planning",
          newStatus: "executing",
          reason: `Planning complete: ${taskCount} tasks created`
        });
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:completed",
            payload: {
              projectId,
              featureCount,
              taskCount,
              totalMinutes,
              waveCount: waves.length
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          console.log(`[NexusBootstrap] Forwarded planning:completed to UI`);
        }
        const projectFeatures = this.tasksToFeatures(decomposedTasks, projectId);
        let actualProjectPath = this.config.workingDir;
        if (this.databaseClient) {
          try {
            const { eq: eq2 } = await import("drizzle-orm");
            const projectRecord = this.databaseClient.db.select().from(projects).where(eq2(projects.id, projectId)).get();
            if (projectRecord?.rootPath) {
              actualProjectPath = projectRecord.rootPath;
              console.log(`[NexusBootstrap] Using project path from database: ${actualProjectPath}`);
            } else {
              console.warn(`[NexusBootstrap] No rootPath found for project ${projectId}, using workingDir: ${this.config.workingDir}`);
            }
          } catch (pathError) {
            console.error("[NexusBootstrap] Failed to get project path from database:", pathError);
          }
        }
        coordinator.initialize({
          projectId,
          projectPath: actualProjectPath,
          features: projectFeatures,
          mode: "genesis"
        });
        this.projectFeatures.set(projectId, projectFeatures);
        console.log(`[NexusBootstrap] Planning complete - ready for manual execution start`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[NexusBootstrap] Planning failed:", errorMessage);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send("nexus-event", {
            type: "planning:error",
            payload: {
              projectId,
              error: errorMessage,
              recoverable: true
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          console.log(`[NexusBootstrap] Sent planning:error to UI`);
        }
        try {
          const coordStatus = coordinator.getStatus();
          if (coordStatus.state !== "idle") {
            await coordinator.stop();
            console.log("[NexusBootstrap] Coordinator stopped after planning failure");
          }
        } catch (stopError) {
          console.error("[NexusBootstrap] Failed to stop coordinator:", stopError);
        }
        await this.eventBus.emit("project:failed", {
          projectId,
          error: `[Planning] ${errorMessage}`,
          recoverable: true
        });
      }
    });
    this.unsubscribers.push(interviewCompletedUnsub);
    coordinator.onEvent((event) => {
      const eventType = event.type;
      const eventData = event.data ?? {};
      const safeStr = (val, fallback) => {
        if (typeof val === "string") return val;
        if (typeof val === "number" || typeof val === "boolean") return String(val);
        return fallback;
      };
      console.log(`[NexusBootstrap] Coordinator event: ${eventType}`, eventData);
      if (eventType === "task:assigned" && "taskId" in eventData && "agentId" in eventData) {
        void this.eventBus.emit("task:assigned", {
          taskId: safeStr(eventData.taskId, ""),
          agentId: safeStr(eventData.agentId, ""),
          agentType: "coder",
          worktreePath: safeStr(eventData.worktreePath, ""),
          featureId: safeStr(eventData.featureId, "")
          // CRITICAL FIX: Forward featureId
        });
      } else if (eventType === "task:started" && "taskId" in eventData) {
        void this.eventBus.emit("task:started", {
          taskId: safeStr(eventData.taskId, ""),
          agentId: safeStr(eventData.agentId, ""),
          startedAt: /* @__PURE__ */ new Date(),
          featureId: safeStr(eventData.featureId, "")
          // CRITICAL FIX: Forward featureId
        });
      } else if (eventType === "task:completed" && "taskId" in eventData) {
        const taskIdStr = safeStr(eventData.taskId, "");
        void this.eventBus.emit("task:completed", {
          taskId: taskIdStr,
          featureId: safeStr(eventData.featureId, ""),
          // CRITICAL FIX: Forward featureId
          result: {
            taskId: taskIdStr,
            success: true,
            files: [],
            metrics: {
              iterations: 1,
              tokensUsed: 0,
              timeMs: 0
            }
          }
        });
      } else if (eventType === "task:failed" && "taskId" in eventData) {
        void this.eventBus.emit("task:failed", {
          taskId: safeStr(eventData.taskId, ""),
          error: safeStr(eventData.error, "Unknown error"),
          iterations: typeof eventData.iterations === "number" ? eventData.iterations : 1,
          escalated: Boolean(eventData.escalated ?? false)
        });
      } else if (eventType === "task:escalated" && "taskId" in eventData) {
        void this.eventBus.emit("task:escalated", {
          taskId: safeStr(eventData.taskId, ""),
          reason: safeStr(eventData.reason, "Max iterations exceeded"),
          iterations: typeof eventData.iterations === "number" ? eventData.iterations : 1,
          lastError: safeStr(eventData.lastError, "")
        });
      } else if (eventType === "project:completed" && "projectId" in eventData) {
        const projectIdStr = String(eventData.projectId);
        console.log(`[NexusBootstrap] Project completed: ${projectIdStr}`);
        const totalTasks = Number(eventData.totalTasks ?? 0);
        const completedTasks = Number(eventData.completedTasks ?? 0);
        const failedTasks = Number(eventData.failedTasks ?? 0);
        const startTime = this.projectStartTimes.get(projectIdStr);
        const totalDuration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1e3) : 0;
        const features2 = this.projectFeatures.get(projectIdStr) ?? [];
        const featuresTotal = features2.length;
        const featuresCompleted = features2.filter((f) => f.status === "completed").length;
        this.projectStartTimes.delete(projectIdStr);
        this.projectFeatures.delete(projectIdStr);
        void this.eventBus.emit("project:completed", {
          projectId: projectIdStr,
          totalDuration,
          metrics: {
            tasksTotal: totalTasks,
            tasksCompleted: completedTasks,
            tasksFailed: failedTasks,
            featuresTotal,
            featuresCompleted,
            estimatedTotalMinutes: 0,
            // Would require deeper tracking of task estimates
            actualTotalMinutes: Math.round(totalDuration / 60),
            averageQAIterations: 0
            // Requires deeper tracking
          }
        });
      } else if (eventType === "project:failed" && "projectId" in eventData) {
        const projectIdFailed = safeStr(eventData.projectId, "");
        console.log(`[NexusBootstrap] Project failed: ${projectIdFailed}`);
        void this.eventBus.emit("project:failed", {
          projectId: projectIdFailed,
          error: safeStr(eventData.error, "Unknown error"),
          recoverable: Boolean(eventData.recoverable ?? false)
        });
      }
    });
  }
  /**
   * Wire event forwarding to the renderer process via IPC
   * Phase 2 Workflow Fix: Forward ALL NexusEventType events to renderer
   */
  wireUIEventForwarding() {
    const eventsToForward = [
      // Interview events
      "interview:started",
      "interview:question-asked",
      "interview:requirement-captured",
      "interview:completed",
      // Planning events
      "planning:started",
      "planning:progress",
      "planning:completed",
      "planning:error",
      // Project events
      "project:status-changed",
      "project:failed",
      "project:completed",
      // Coordinator events (Phase 2 addition)
      "coordinator:started",
      "coordinator:paused",
      "coordinator:resumed",
      "coordinator:stopped",
      // Wave events (Phase 2 addition)
      "wave:started",
      "wave:completed",
      // Task events (expanded)
      "task:assigned",
      "task:started",
      "task:completed",
      "task:failed",
      "task:escalated",
      "task:merged",
      "task:merge-failed",
      "task:pushed",
      "task:status-changed",
      // Phase 2 addition
      // Agent events (Phase 2 addition)
      "agent:released",
      // Checkpoint events (Phase 2 addition)
      "checkpoint:created",
      "checkpoint:failed",
      // Orchestration events (Phase 2 addition)
      "orchestration:mode",
      // Evolution events (Phase 2 addition)
      "evolution:analyzing",
      "evolution:analyzed",
      "evolution:analysis-failed",
      // QA events
      "qa:build-completed",
      "qa:lint-completed",
      "qa:test-completed",
      "qa:review-completed",
      // System events
      "system:checkpoint-created",
      "system:checkpoint-restored",
      "system:error",
      // Human review events
      "review:requested",
      // Feature events (Phase 2 addition)
      "feature:created",
      "feature:status-changed",
      "feature:completed"
    ];
    const unsub = this.eventBus.onAny((event) => {
      if (eventsToForward.includes(event.type) && mainWindowRef) {
        mainWindowRef.webContents.send("nexus-event", {
          type: event.type,
          payload: event.payload,
          timestamp: event.timestamp
        });
        console.log(`[NexusBootstrap] Forwarded event to UI: ${event.type}`);
      }
    });
    this.unsubscribers.push(unsub);
  }
  /**
   * Convert planning tasks to feature format for coordinator
   */
  tasksToFeatures(tasks2, projectId) {
    return tasks2.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      priority: "must",
      status: "backlog",
      complexity: task.size === "large" ? "complex" : "simple",
      subFeatures: [],
      estimatedTasks: 1,
      completedTasks: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      projectId
    }));
  }
  /**
   * Record execution start time for a project
   * Called when execution is manually started via IPC
   */
  recordExecutionStart(projectId) {
    this.projectStartTimes.set(projectId, /* @__PURE__ */ new Date());
    console.log(`[NexusBootstrap] Recorded execution start for project: ${projectId}`);
  }
  /**
   * Store decomposed features and tasks in the database
   * Phase 20 Task 3: Wire TaskDecomposer Output to Database
   * Phase 2 Workflow Fix: Create N features from N requirements (not 1 generic feature)
   */
  storeDecomposition(projectId, planningTasks, requirements2) {
    if (!this.databaseClient) {
      throw new Error("DatabaseClient not initialized");
    }
    console.log("[NexusBootstrap] Storing decomposition for project:", projectId);
    const now = /* @__PURE__ */ new Date();
    let featureCount = 0;
    let taskCount = 0;
    try {
      if (requirements2 && requirements2.length > 0) {
        const tasksPerRequirement = Math.ceil(planningTasks.length / requirements2.length);
        for (let reqIndex = 0; reqIndex < requirements2.length; reqIndex++) {
          const req = requirements2[reqIndex];
          const featureId = `feature-${projectId}-${req.id}`;
          const startIdx = reqIndex * tasksPerRequirement;
          const endIdx = Math.min(startIdx + tasksPerRequirement, planningTasks.length);
          const featureTasks = planningTasks.slice(startIdx, endIdx);
          this.databaseClient.db.insert(features).values({
            id: featureId,
            projectId,
            name: req.description.substring(0, 100),
            // Truncate for name
            description: req.description,
            priority: req.priority || "should",
            status: "backlog",
            complexity: featureTasks.length > 3 ? "complex" : "simple",
            estimatedTasks: featureTasks.length,
            completedTasks: 0,
            createdAt: now,
            updatedAt: now
          }).run();
          featureCount++;
          console.log(`[NexusBootstrap] Created feature ${featureId} for requirement: ${req.description.substring(0, 50)}...`);
          for (const task of featureTasks) {
            const taskId = task.id || `task-${projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            this.databaseClient.db.insert(tasks).values({
              id: taskId,
              projectId,
              featureId,
              name: task.name,
              description: task.description,
              type: task.type,
              status: "pending",
              size: task.size === "large" || task.size === "medium" ? "small" : task.size,
              priority: 5,
              tags: JSON.stringify(task.files),
              notes: JSON.stringify(task.testCriteria),
              dependsOn: JSON.stringify(task.dependsOn),
              estimatedMinutes: task.estimatedMinutes,
              createdAt: now,
              updatedAt: now
            }).run();
            taskCount++;
          }
        }
        console.log(`[NexusBootstrap] Stored ${featureCount} features and ${taskCount} tasks`);
      } else {
        const featureId = `feature-${projectId}-${Date.now()}`;
        this.databaseClient.db.insert(features).values({
          id: featureId,
          projectId,
          name: "Project Requirements",
          description: "Auto-generated feature from interview requirements",
          priority: "must",
          status: "backlog",
          complexity: "complex",
          estimatedTasks: planningTasks.length,
          completedTasks: 0,
          createdAt: now,
          updatedAt: now
        }).run();
        featureCount = 1;
        console.log("[NexusBootstrap] Stored fallback feature:", featureId);
        for (const task of planningTasks) {
          const taskId = task.id || `task-${projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          this.databaseClient.db.insert(tasks).values({
            id: taskId,
            projectId,
            featureId,
            name: task.name,
            description: task.description,
            type: task.type,
            status: "pending",
            size: task.size === "large" || task.size === "medium" ? "small" : task.size,
            priority: 5,
            tags: JSON.stringify(task.files),
            notes: JSON.stringify(task.testCriteria),
            dependsOn: JSON.stringify(task.dependsOn),
            estimatedMinutes: task.estimatedMinutes,
            createdAt: now,
            updatedAt: now
          }).run();
          taskCount++;
        }
        console.log("[NexusBootstrap] Stored", taskCount, "tasks for feature", featureId);
      }
      return Promise.resolve({ featureCount, taskCount });
    } catch (error) {
      console.error("[NexusBootstrap] Failed to store decomposition:", error);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
  /**
   * Start Genesis mode (new project from scratch)
   */
  startGenesisMode(projectName) {
    if (!this.interviewEngine || !this.sessionManager) {
      return Promise.reject(new Error("NexusBootstrap not initialized"));
    }
    const projectId = `genesis-${Date.now()}`;
    const name = projectName ?? `Genesis Project ${Date.now()}`;
    console.log(`[NexusBootstrap] Starting Genesis mode: ${name} (${projectId})`);
    const session2 = this.interviewEngine.startSession(projectId);
    this.sessionManager.startAutoSave(session2);
    return Promise.resolve({
      projectId,
      sessionId: session2.id
    });
  }
  /**
   * Start Evolution mode (enhance existing project)
   *
   * Task 9: Wire Evolution Critical Path
   * 1. Generate repo map from projectPath
   * 2. Pass context to interview engine
   * 3. Interview completion triggers same execution path as Genesis
   */
  async startEvolutionMode(projectPath, projectName) {
    if (!this.interviewEngine || !this.sessionManager || !this.repoMapGenerator) {
      throw new Error("NexusBootstrap not initialized");
    }
    const projectId = `evolution-${Date.now()}`;
    const name = projectName ?? `Evolution: ${projectPath}`;
    console.log(`[NexusBootstrap] Starting Evolution mode: ${name} (${projectId})`);
    await this.eventBus.emit("project:status-changed", {
      projectId,
      previousStatus: "planning",
      newStatus: "planning",
      reason: "Starting Evolution mode - analyzing existing codebase"
    });
    console.log(`[NexusBootstrap] Generating repo map for: ${projectPath}`);
    let evolutionContext;
    try {
      await this.repoMapGenerator.initialize();
      const repoMap = await this.repoMapGenerator.generate(projectPath, {
        maxFiles: 500,
        // Reasonable limit for context
        countReferences: true
      });
      const repoMapContext = this.repoMapGenerator.formatForContext({
        maxTokens: 8e3,
        // Limit for context window
        includeSignatures: true,
        rankByReferences: true,
        groupByFile: true,
        includeDependencies: true,
        style: "compact"
      });
      console.log(`[NexusBootstrap] Repo map generated: ${repoMap.stats.totalFiles} files, ${repoMap.stats.totalSymbols} symbols`);
      const projectSummary = this.buildProjectSummary(repoMap);
      evolutionContext = {
        projectPath,
        repoMapContext,
        projectSummary
      };
      console.log(`[NexusBootstrap] Evolution context prepared with ${repoMapContext.length} chars of context`);
    } catch (error) {
      console.error("[NexusBootstrap] Failed to generate repo map:", error);
      console.log("[NexusBootstrap] Continuing Evolution mode without repo map context");
    }
    const session2 = this.interviewEngine.startSession(projectId, {
      mode: "evolution",
      evolutionContext
    });
    this.sessionManager.startAutoSave(session2);
    console.log(`[NexusBootstrap] Evolution session started: ${session2.id}`);
    return {
      projectId,
      sessionId: session2.id
    };
  }
  /**
   * Build a human-readable summary of the project from the repo map
   */
  buildProjectSummary(repoMap) {
    const stats = repoMap.stats;
    const lines = [
      `Project: ${repoMap.projectPath}`,
      `Files: ${stats.totalFiles} (${stats.languageBreakdown.typescript} TypeScript, ${stats.languageBreakdown.javascript} JavaScript)`,
      `Symbols: ${stats.totalSymbols} (${stats.symbolBreakdown.class} classes, ${stats.symbolBreakdown.function} functions, ${stats.symbolBreakdown.interface} interfaces)`,
      `Dependencies: ${stats.totalDependencies} connections`
    ];
    if (stats.largestFiles.length > 0) {
      lines.push(`Largest files: ${stats.largestFiles.slice(0, 5).join(", ")}`);
    }
    if (stats.mostConnectedFiles.length > 0) {
      const fileNames = stats.mostConnectedFiles.slice(0, 5).map((f) => f.file);
      lines.push(`Key files (most connected): ${fileNames.join(", ")}`);
    }
    return lines.join("\n");
  }
  // =========================================================================
  // TASK 5: Wire Checkpoint Listeners
  // =========================================================================
  /**
   * Wire checkpoint creation on task escalation (QA Failure -> Checkpoint)
   *
   * This is the critical wiring for Task 5:
   * - When a task is escalated (QA failed after max iterations)
   * - Automatically create a checkpoint for recovery
   * - Request human review
   */
  wireCheckpointListeners() {
    if (!this.checkpointManager || !this.stateManager) {
      console.warn("[NexusBootstrap] CheckpointManager not initialized, skipping checkpoint wiring");
      return;
    }
    const escalatedUnsub = this.eventBus.on("task:escalated", async (event) => {
      const { taskId, reason, iterations, lastError } = event.payload;
      const projectId = this.extractProjectIdFromTask(taskId);
      console.log(`[NexusBootstrap] Task ${taskId} escalated after ${iterations} iterations: ${reason}`);
      if (!projectId) {
        console.warn(`[NexusBootstrap] Skipping checkpoint for escalated task ${taskId} - no valid projectId`);
        await this.eventBus.emit("review:requested", {
          reviewId: `review-${Date.now()}`,
          taskId,
          reason: "qa_exhausted",
          context: {
            qaIterations: iterations,
            escalationReason: reason,
            suggestedAction: lastError ? `Last error: ${lastError}. Consider reviewing the task requirements.` : "QA loop exhausted. Manual intervention required."
          }
        });
        return;
      }
      try {
        this.ensureProjectState(projectId);
        if (!this.checkpointManager) {
          throw new Error("CheckpointManager not initialized");
        }
        const checkpoint = await this.checkpointManager.createAutoCheckpoint(
          projectId,
          "qa_exhausted"
        );
        console.log(`[NexusBootstrap] Created escalation checkpoint: ${checkpoint.id}`);
        await this.eventBus.emit("review:requested", {
          reviewId: `review-${Date.now()}`,
          taskId,
          reason: "qa_exhausted",
          context: {
            qaIterations: iterations,
            escalationReason: reason,
            suggestedAction: lastError ? `Last error: ${lastError}. Consider reviewing the task requirements.` : "QA loop exhausted. Manual intervention required."
          }
        });
        console.log(`[NexusBootstrap] Human review requested for task ${taskId}`);
      } catch (error) {
        console.error("[NexusBootstrap] Failed to create escalation checkpoint:", error);
        await this.eventBus.emit("system:error", {
          component: "NexusBootstrap",
          error: `Checkpoint creation failed: ${error instanceof Error ? error.message : String(error)}`,
          recoverable: true
        });
      }
    });
    this.unsubscribers.push(escalatedUnsub);
    const failedUnsub = this.eventBus.on("task:failed", async (event) => {
      const { taskId, error, escalated } = event.payload;
      if (escalated) {
        return;
      }
      const projectId = this.extractProjectIdFromTask(taskId);
      console.log(`[NexusBootstrap] Task ${taskId} failed: ${error}`);
      if (!projectId) {
        console.warn(`[NexusBootstrap] Skipping checkpoint for failed task ${taskId} - no valid projectId`);
        return;
      }
      try {
        this.ensureProjectState(projectId);
        if (this.checkpointManager) {
          await this.checkpointManager.createAutoCheckpoint(
            projectId,
            "task_failed"
          );
        }
        console.log(`[NexusBootstrap] Created failure checkpoint for task ${taskId}`);
      } catch (checkpointError) {
        console.error("[NexusBootstrap] Failed to create failure checkpoint:", checkpointError);
      }
    });
    this.unsubscribers.push(failedUnsub);
  }
  /**
   * Extract project ID from task ID
   * Task IDs typically follow patterns like: "genesis-123456-task-1" or "task-uuid"
   *
   * Returns null if no valid projectId can be extracted (instead of generating invalid IDs)
   */
  extractProjectIdFromTask(taskId) {
    if (this.nexus?.coordinator) {
      const task = this.nexus.coordinator.getTask(taskId);
      if (task?.projectId) {
        return task.projectId;
      }
    }
    const genesisMatch = taskId.match(/^(genesis-\d+)/);
    if (genesisMatch) {
      return genesisMatch[1];
    }
    const evolutionMatch = taskId.match(/^(evolution-\d+)/);
    if (evolutionMatch) {
      return evolutionMatch[1];
    }
    console.warn(`[NexusBootstrap] Could not extract valid projectId for task ${taskId}`);
    return null;
  }
  /**
   * Ensure project state exists for checkpoint creation
   */
  ensureProjectState(projectId) {
    if (!this.stateManager) {
      return;
    }
    if (!this.stateManager.hasState(projectId)) {
      this.stateManager.createState(
        projectId,
        projectId,
        projectId.startsWith("evolution") ? "evolution" : "genesis"
      );
    }
  }
  // =========================================================================
  // Checkpoint Management Methods
  // =========================================================================
  /**
   * Create a checkpoint for a project
   */
  async createCheckpointForProject(projectId, reason) {
    if (!this.checkpointManager) {
      throw new Error("CheckpointManager not initialized");
    }
    this.ensureProjectState(projectId);
    const checkpoint = await this.checkpointManager.createCheckpoint(projectId, reason);
    return {
      id: checkpoint.id,
      projectId: checkpoint.projectId,
      name: checkpoint.name ?? `Checkpoint: ${reason}`,
      reason: checkpoint.reason,
      gitCommit: checkpoint.gitCommit,
      createdAt: checkpoint.createdAt
    };
  }
  /**
   * Restore a checkpoint by ID
   */
  async restoreCheckpointById(checkpointId, restoreGit = false) {
    if (!this.checkpointManager) {
      throw new Error("CheckpointManager not initialized");
    }
    console.log(`[NexusBootstrap] Restoring checkpoint ${checkpointId} (restoreGit: ${restoreGit})`);
    await this.checkpointManager.restoreCheckpoint(checkpointId, { restoreGit });
    console.log(`[NexusBootstrap] Checkpoint ${checkpointId} restored successfully`);
  }
  /**
   * List all checkpoints for a project
   */
  listCheckpointsForProject(projectId) {
    if (!this.checkpointManager) {
      return [];
    }
    const checkpoints2 = this.checkpointManager.listCheckpoints(projectId);
    return checkpoints2.map((cp) => ({
      id: cp.id,
      projectId: cp.projectId,
      name: cp.name ?? `Checkpoint`,
      reason: cp.reason,
      gitCommit: cp.gitCommit,
      createdAt: cp.createdAt
    }));
  }
  /**
   * Shutdown all components
   */
  async shutdown() {
    console.log("[NexusBootstrap] Shutting down...");
    for (const unsub of this.unsubscribers) {
      try {
        unsub();
      } catch {
      }
    }
    this.unsubscribers = [];
    if (this.nexus) {
      await this.nexus.shutdown();
      this.nexus = null;
    }
    this.interviewEngine = null;
    this.sessionManager = null;
    this.requirementsDB = null;
    this.stateManager = null;
    this.checkpointManager = null;
    this.humanReviewService = null;
    this.gitService = null;
    this.mergerRunner = null;
    this.repoMapGenerator = null;
    this.databaseClient = null;
    bootstrappedNexus = null;
    console.log("[NexusBootstrap] Shutdown complete");
  }
}
async function initializeNexus(config) {
  const bootstrap = new NexusBootstrap(config);
  bootstrapInstance = bootstrap;
  return bootstrap.initialize();
}
function getBootstrappedNexus() {
  return bootstrappedNexus;
}
function setMainWindow(window) {
  mainWindowRef = window;
}
function clearMainWindow() {
  mainWindowRef = null;
}
function recordExecutionStart(projectId) {
  if (bootstrapInstance) {
    bootstrapInstance.recordExecutionStart(projectId);
  } else {
    console.warn("[NexusBootstrap] Cannot record start time - bootstrap not initialized");
  }
}
const NexusBootstrap$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NexusBootstrap,
  clearMainWindow,
  getBootstrappedNexus,
  initializeNexus,
  recordExecutionStart,
  setMainWindow
}, Symbol.toStringTag, { value: "Module" }));
let mainWindow = null;
let nexusInstance = null;
function getWorkingDir() {
  if (is.dev) {
    return process.cwd();
  }
  return app.getPath("userData");
}
function getDataDir() {
  return app.getPath("userData");
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join$1(__dirname, "../preload/index.js"),
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
  setMainWindow(mainWindow);
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join$1(__dirname, "../renderer/index.html"));
  }
}
function getNexusConfigFromSettings() {
  const settings = settingsService.getAll();
  const anthropicKey = process.env["ANTHROPIC_API_KEY"] ?? settingsService.getApiKey("claude");
  const googleKey = process.env["GOOGLE_AI_API_KEY"] ?? settingsService.getApiKey("gemini");
  const openaiKey = process.env["OPENAI_API_KEY"] ?? settingsService.getApiKey("openai");
  const claudeWantsCli = settings.llm.claude.backend === "cli";
  const geminiWantsCli = settings.llm.gemini.backend === "cli";
  const useClaudeCli = claudeWantsCli || !anthropicKey;
  const useGeminiCli = geminiWantsCli || !googleKey;
  return {
    workingDir: getWorkingDir(),
    dataDir: getDataDir(),
    apiKeys: {
      anthropic: anthropicKey ?? void 0,
      google: googleKey ?? void 0,
      openai: openaiKey ?? void 0
    },
    useCli: {
      claude: useClaudeCli,
      gemini: useGeminiCli
    }
  };
}
async function initializeNexusSystem() {
  try {
    console.log("[Main] Initializing Nexus system...");
    const config = getNexusConfigFromSettings();
    const settings = settingsService.getAll();
    console.log("[Main] Configuration sources:");
    console.log(`[Main]   Claude backend preference: ${settings.llm.claude.backend}`);
    console.log(`[Main]   Claude API key: ${config.apiKeys.anthropic ? "present" : "not set"}`);
    console.log(`[Main]   Gemini backend preference: ${settings.llm.gemini.backend}`);
    console.log(`[Main]   Gemini API key: ${config.apiKeys.google ? "present" : "not set"}`);
    nexusInstance = await initializeNexus(config);
    removeInterviewHandlers();
    registerInterviewHandlers(
      nexusInstance.interviewEngine,
      nexusInstance.sessionManager,
      nexusInstance.databaseClient
    );
    registerCheckpointReviewHandlers(
      nexusInstance.checkpointManager,
      nexusInstance.humanReviewService
    );
    registerDatabaseHandlers(nexusInstance.databaseClient);
    console.log("[Main] Nexus system initialized successfully");
    console.log(`[Main] Working directory: ${config.workingDir}`);
    console.log(`[Main] Data directory: ${config.dataDir}`);
    console.log(`[Main] Claude backend: ${config.useCli.claude ? "CLI" : "API"}`);
    console.log(`[Main] Gemini backend: ${config.useCli.gemini ? "CLI" : "API"}`);
  } catch (error) {
    console.error("[Main] Failed to initialize Nexus system:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    removeInterviewHandlers();
    registerFallbackInterviewHandlers(errorMessage);
    removeReviewHandlers();
    registerFallbackReviewHandlers(errorMessage);
  }
}
void app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.nexus.app");
  registerIpcHandlers();
  registerSettingsHandlers();
  registerDialogHandlers();
  registerProjectHandlers();
  registerFallbackInterviewHandlers("Nexus is still initializing...");
  registerFallbackReviewHandlers("Nexus is still initializing...");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  if (mainWindow) {
    setupEventForwarding(mainWindow);
  }
  await initializeNexusSystem();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error("[Main] Failed to initialize app:", error);
  app.quit();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("before-quit", () => {
  void (async () => {
    console.log("[Main] Application shutting down...");
    clearMainWindow();
    if (nexusInstance) {
      try {
        await nexusInstance.shutdown();
        console.log("[Main] Nexus system shut down successfully");
      } catch (error) {
        console.error("[Main] Error during Nexus shutdown:", error);
      }
      nexusInstance = null;
    }
  })();
});
export {
  createWindow,
  mainWindow,
  nexusInstance
};
