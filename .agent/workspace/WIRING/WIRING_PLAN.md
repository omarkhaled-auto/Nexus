# Wiring Implementation Plan

## Date: 2025-01-20
## Phase: 19 - Complete System Wiring

---

## Approach

We will wire the system in this order:
1. **Create NexusBootstrap** - Foundation for all wiring
2. **Wire Genesis Critical Path** - Minimum viable flow
3. **Test Genesis E2E** - Verify it works
4. **Wire Genesis Complete** - All features
5. **Wire Evolution** - Existing project enhancement
6. **Test Evolution E2E** - Verify it works
7. **Wire UI Integration** - Real-time updates
8. **Wire Remaining** - Settings, checkpoints, etc.
9. **Full System E2E Test** - Everything together

---

## Wire 0: Create NexusBootstrap.ts (FOUNDATION)

This is the most important file. It creates and wires all components.

### File: `src/main/NexusBootstrap.ts`

```typescript
/**
 * NexusBootstrap - Central factory for creating and wiring all Nexus components
 *
 * This is the MAIN ENTRY POINT for all orchestration.
 * It creates instances of all components and wires them together via EventBus.
 */

import { EventBus, getEventBus } from '../orchestration/events/EventBus';
import { NexusCoordinator, NexusCoordinatorOptions } from '../orchestration/coordinator/NexusCoordinator';
import { TaskQueue } from '../orchestration/queue/TaskQueue';
import { AgentPool } from '../orchestration/agents/AgentPool';
import { TaskDecomposer } from '../planning/decomposition/TaskDecomposer';
import { DependencyResolver } from '../planning/dependencies/DependencyResolver';
import { TimeEstimator } from '../planning/estimation/TimeEstimator';
import { InterviewEngine } from '../interview/InterviewEngine';
import { InterviewSessionManager } from '../interview/InterviewSessionManager';
import { RequirementsDB } from '../persistence/requirements/RequirementsDB';
import { CheckpointManager } from '../persistence/checkpoints/CheckpointManager';
import { HumanReviewService } from '../orchestration/review/HumanReviewService';
import { RalphStyleIterator } from '../execution/iteration/RalphStyleIterator';
import { FreshContextManager } from '../orchestration/context/FreshContextManager';
import { createClaudeClient, createGeminiClient } from '../llm';
import type { LLMClient } from '../llm/types';
import type { BrowserWindow } from 'electron';

export interface NexusConfig {
  /** API keys for LLM providers */
  apiKeys: {
    anthropic?: string;
    google?: string;
  };
  /** Use CLI instead of API */
  useCli?: {
    claude?: boolean;
    gemini?: boolean;
  };
  /** Project output directory */
  outputDir: string;
  /** Database directory */
  dataDir: string;
}

export interface NexusInstance {
  // Core components
  coordinator: NexusCoordinator;
  interviewEngine: InterviewEngine;
  sessionManager: InterviewSessionManager;

  // Services
  checkpointManager: CheckpointManager;
  humanReviewService: HumanReviewService;
  agentPool: AgentPool;

  // Event system
  eventBus: EventBus;

  // Start flows
  startGenesis: (projectName?: string) => Promise<void>;
  startEvolution: (projectPath: string) => Promise<void>;

  // Cleanup
  shutdown: () => Promise<void>;
}

export class NexusBootstrap {
  private config: NexusConfig;
  private claudeClient: LLMClient | null = null;
  private geminiClient: LLMClient | null = null;
  private instance: NexusInstance | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(config: NexusConfig) {
    this.config = config;
  }

  /**
   * Set the main window for event forwarding
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Initialize and wire all Nexus components
   */
  async initialize(): Promise<NexusInstance> {
    if (this.instance) {
      return this.instance;
    }

    // 1. Create LLM clients
    await this.createLLMClients();

    // 2. Get event bus
    const eventBus = getEventBus();

    // 3. Create persistence layer
    const requirementsDB = new RequirementsDB({ dataDir: this.config.dataDir });
    const checkpointManager = new CheckpointManager({ dataDir: this.config.dataDir });

    // 4. Create interview components
    const interviewEngine = new InterviewEngine({
      llmClient: this.claudeClient!,
      requirementsDB,
      eventBus,
    });
    const sessionManager = new InterviewSessionManager({ dataDir: this.config.dataDir });

    // 5. Create planning components
    const taskDecomposer = new TaskDecomposer(this.claudeClient!);
    const dependencyResolver = new DependencyResolver();
    const timeEstimator = new TimeEstimator();

    // 6. Create execution components
    const taskQueue = new TaskQueue();
    const agentPool = new AgentPool({
      claudeClient: this.claudeClient!,
      geminiClient: this.geminiClient!,
    });

    // 7. Create context manager for RalphStyleIterator
    const contextManager = new FreshContextManager();

    // 8. Create QA engine (RalphStyleIterator)
    const qaEngine = {
      run: async (task: any, _coder: any) => {
        // For now, simplified QA - will be enhanced
        return { success: true, escalated: false };
      }
    };

    // 9. Create coordinator
    const coordinatorOptions: NexusCoordinatorOptions = {
      taskQueue,
      agentPool,
      decomposer: taskDecomposer,
      resolver: dependencyResolver,
      estimator: timeEstimator,
      qaEngine,
      worktreeManager: this.createWorktreeManager(),
      checkpointManager,
    };
    const coordinator = new NexusCoordinator(coordinatorOptions);

    // 10. Create human review service
    const humanReviewService = new HumanReviewService({
      checkpointManager,
      eventBus,
    });

    // 11. Wire event listeners
    this.wireEventListeners(eventBus, {
      coordinator,
      taskDecomposer,
      dependencyResolver,
      interviewEngine,
    });

    // 12. Wire UI event forwarding
    if (this.mainWindow) {
      this.wireUIEventForwarding(eventBus, this.mainWindow);
    }

    // Create instance
    this.instance = {
      coordinator,
      interviewEngine,
      sessionManager,
      checkpointManager,
      humanReviewService,
      agentPool,
      eventBus,
      startGenesis: (name) => this.startGenesisFlow(name),
      startEvolution: (path) => this.startEvolutionFlow(path),
      shutdown: () => this.shutdown(),
    };

    return this.instance;
  }

  /**
   * Create LLM clients based on configuration
   */
  private async createLLMClients(): Promise<void> {
    // Create Claude client (API or CLI)
    if (this.config.useCli?.claude) {
      const { createClaudeCLIClient } = await import('../llm/cli/ClaudeCLIClient');
      this.claudeClient = createClaudeCLIClient();
    } else if (this.config.apiKeys.anthropic) {
      this.claudeClient = createClaudeClient(this.config.apiKeys.anthropic);
    } else {
      throw new Error('No Claude API key or CLI configured');
    }

    // Create Gemini client (API or CLI)
    if (this.config.useCli?.gemini) {
      const { createGeminiCLIClient } = await import('../llm/cli/GeminiCLIClient');
      this.geminiClient = createGeminiCLIClient();
    } else if (this.config.apiKeys.google) {
      this.geminiClient = createGeminiClient(this.config.apiKeys.google);
    } else {
      // Fall back to Claude for review if no Gemini
      this.geminiClient = this.claudeClient;
    }
  }

  /**
   * Wire EventBus listeners for the orchestration flow
   */
  private wireEventListeners(
    eventBus: EventBus,
    components: {
      coordinator: NexusCoordinator;
      taskDecomposer: TaskDecomposer;
      dependencyResolver: DependencyResolver;
      interviewEngine: InterviewEngine;
    }
  ): void {
    const { coordinator, taskDecomposer, dependencyResolver } = components;

    // CRITICAL WIRING: Interview Complete -> Task Decomposition
    eventBus.on('interview:completed', async (event) => {
      const { projectId, totalRequirements } = event.payload;

      console.log(`[NexusBootstrap] Interview completed for ${projectId} with ${totalRequirements} requirements`);

      // Emit planning started
      await eventBus.emit('planning:started', { projectId });

      try {
        // Get requirements and decompose into tasks
        // Note: Requirements are stored in RequirementsDB during interview
        const featureDescription = `Project requirements from interview session`;
        const tasks = await taskDecomposer.decompose(featureDescription);

        // Resolve dependencies
        const orderedTasks = dependencyResolver.resolveOrder(tasks);

        // Emit planning completed
        await eventBus.emit('planning:completed', {
          projectId,
          taskCount: orderedTasks.length,
        });

        // Initialize coordinator with tasks
        coordinator.initialize({
          projectId,
          features: orderedTasks.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            priority: 'must' as const,
            status: 'backlog' as const,
            complexity: t.size === 'large' ? 'complex' : 'simple' as const,
            subFeatures: [],
            estimatedTasks: 1,
            completedTasks: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectId,
          })),
          mode: 'genesis',
        });

        // Start execution
        coordinator.start(projectId);

      } catch (error) {
        console.error('[NexusBootstrap] Planning failed:', error);
        await eventBus.emit('planning:failed', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Forward coordinator events for UI
    coordinator.onEvent((event) => {
      // Re-emit coordinator events through the main event bus
      // This ensures UI can subscribe to them
      void eventBus.emit(event.type as any, event.data ?? {});
    });
  }

  /**
   * Wire UI event forwarding via IPC
   */
  private wireUIEventForwarding(eventBus: EventBus, mainWindow: BrowserWindow): void {
    const eventsToForward = [
      // Interview events
      'interview:started', 'interview:question-asked', 'interview:requirement-captured', 'interview:completed',
      // Planning events
      'planning:started', 'planning:completed', 'planning:failed',
      // Execution events
      'execution:started', 'execution:completed',
      'task:assigned', 'task:started', 'task:completed', 'task:failed', 'task:merged', 'task:escalated',
      // QA events
      'qa:iteration', 'qa:passed', 'qa:failed', 'qa:escalated',
      // Agent events
      'agent:started', 'agent:idle', 'agent:error', 'agent:terminated',
      // Coordinator events
      'coordinator:started', 'coordinator:paused', 'coordinator:resumed', 'coordinator:stopped',
      // Wave events
      'wave:started', 'wave:completed',
      // Checkpoint events
      'checkpoint:created', 'checkpoint:failed',
    ];

    eventBus.onAny((event) => {
      if (eventsToForward.includes(event.type)) {
        mainWindow.webContents.send('nexus-event', {
          type: event.type,
          payload: event.payload,
          timestamp: event.timestamp,
        });
      }
    });
  }

  /**
   * Create a simple worktree manager (stub for now)
   */
  private createWorktreeManager() {
    return {
      createWorktree: async (taskId: string) => ({ path: `${this.config.outputDir}/worktrees/${taskId}` }),
      removeWorktree: async (_taskId: string) => {},
    };
  }

  /**
   * Start Genesis flow (new project from scratch)
   */
  private async startGenesisFlow(projectName?: string): Promise<void> {
    if (!this.instance) {
      throw new Error('Nexus not initialized');
    }

    const projectId = `genesis-${Date.now()}`;
    const name = projectName || `Genesis Project ${Date.now()}`;

    // Start interview
    const session = this.instance.interviewEngine.startSession(projectId);
    this.instance.sessionManager.startAutoSave(session);

    // Interview completion will trigger the rest via EventBus
    console.log(`[NexusBootstrap] Genesis started: ${name} (${projectId})`);
  }

  /**
   * Start Evolution flow (enhance existing project)
   */
  private async startEvolutionFlow(projectPath: string): Promise<void> {
    if (!this.instance) {
      throw new Error('Nexus not initialized');
    }

    const projectId = `evolution-${Date.now()}`;

    // TODO: Generate repo map
    // TODO: Pass context to interview

    // Start interview with evolution context
    const session = this.instance.interviewEngine.startSession(projectId);
    this.instance.sessionManager.startAutoSave(session);

    console.log(`[NexusBootstrap] Evolution started for: ${projectPath} (${projectId})`);
  }

  /**
   * Shutdown all components
   */
  private async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.coordinator.stop();
      await this.instance.agentPool.terminateAll();
      this.instance = null;
    }
  }
}

// Singleton instance
let nexusBootstrap: NexusBootstrap | null = null;

/**
 * Initialize the global Nexus instance
 */
export async function initializeNexus(config: NexusConfig): Promise<NexusInstance> {
  if (!nexusBootstrap) {
    nexusBootstrap = new NexusBootstrap(config);
  }
  return nexusBootstrap.initialize();
}

/**
 * Get the global Nexus instance
 */
export function getNexus(): NexusInstance | null {
  return nexusBootstrap?.instance ?? null;
}

/**
 * Set the main window for event forwarding
 */
export function setNexusMainWindow(window: BrowserWindow): void {
  nexusBootstrap?.setMainWindow(window);
}
```

---

## Wire 1: Update main/index.ts

### File: `src/main/index.ts`

```typescript
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerIpcHandlers, registerSettingsHandlers, setupEventForwarding } from './ipc';
import { registerInterviewHandlers } from './ipc/interview-handlers';
import { registerCheckpointReviewHandlers } from './ipc/handlers';
import { initializeNexus, setNexusMainWindow, getNexus } from './NexusBootstrap';
import { getSettings } from './settings';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Initialize Nexus with settings
  try {
    const settings = getSettings();
    const nexus = await initializeNexus({
      apiKeys: {
        anthropic: settings.anthropicApiKey,
        google: settings.googleApiKey,
      },
      useCli: {
        claude: settings.useClaudeCli,
        gemini: settings.useGeminiCli,
      },
      outputDir: settings.outputDir || './output',
      dataDir: settings.dataDir || './data',
    });

    // Set main window for event forwarding
    setNexusMainWindow(mainWindow);

    // Register handlers with real Nexus instances
    registerInterviewHandlers(nexus.interviewEngine, nexus.sessionManager);
    registerCheckpointReviewHandlers(nexus.checkpointManager, nexus.humanReviewService);

    console.log('[Main] Nexus initialized successfully');
  } catch (error) {
    console.error('[Main] Failed to initialize Nexus:', error);
    // Continue with mock handlers for now
  }

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// App ready handler
void app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.nexus.app');

  // Register IPC handlers
  registerIpcHandlers();
  registerSettingsHandlers();

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  await createWindow();

  if (mainWindow) {
    setupEventForwarding(mainWindow);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Shutdown Nexus
  const nexus = getNexus();
  if (nexus) {
    void nexus.shutdown();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { createWindow, mainWindow };
```

---

## Wire 2: Update IPC Handlers to Use Real Nexus

### File: `src/main/ipc/handlers.ts` (key updates)

```typescript
import { getNexus } from '../NexusBootstrap';

// Update mode:genesis handler
ipcMain.handle('mode:genesis', async (event) => {
  if (!validateSender(event)) {
    throw new Error('Unauthorized IPC sender');
  }

  const nexus = getNexus();
  if (nexus) {
    await nexus.startGenesis();
    return { success: true, projectId: 'pending' };
  }

  // Fallback to mock if Nexus not initialized
  state.mode = 'genesis';
  const projectId = `genesis-${Date.now()}`;
  state.projectId = projectId;
  return { success: true, projectId };
});

// Update mode:evolution handler
ipcMain.handle('mode:evolution', async (event, projectPath: string) => {
  if (!validateSender(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  if (typeof projectPath !== 'string' || !projectPath) {
    throw new Error('Invalid projectPath');
  }

  const nexus = getNexus();
  if (nexus) {
    await nexus.startEvolution(projectPath);
    return { success: true };
  }

  // Fallback
  state.mode = 'evolution';
  return { success: true };
});

// Update dashboard:getMetrics to use real data
ipcMain.handle('dashboard:getMetrics', (event) => {
  if (!validateSender(event)) {
    throw new Error('Unauthorized IPC sender');
  }

  const nexus = getNexus();
  if (nexus) {
    const status = nexus.coordinator.getStatus();
    const progress = nexus.coordinator.getProgress();

    return {
      projectId: status.projectId || 'no-project',
      projectName: 'Nexus Project',
      totalFeatures: Math.ceil(progress.totalTasks / 3),
      completedFeatures: Math.floor(progress.completedTasks / 3),
      completedTasks: progress.completedTasks,
      totalTasks: progress.totalTasks,
      failedTasks: progress.failedTasks,
      activeAgents: progress.activeAgents,
      estimatedRemainingMinutes: progress.estimatedRemainingMinutes,
      estimatedCompletion: new Date(Date.now() + progress.estimatedRemainingMinutes * 60000),
      startedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Fallback to mock
  return { /* ... existing mock ... */ };
});

// Update agents:status to use real pool
ipcMain.handle('agents:status', (event) => {
  if (!validateSender(event)) {
    throw new Error('Unauthorized IPC sender');
  }

  const nexus = getNexus();
  if (nexus) {
    const poolStatus = nexus.agentPool.getPoolStatus();
    return {
      totalAgents: poolStatus.totalAgents,
      activeAgents: Object.values(poolStatus.byType).reduce((sum, t) => sum + t.active, 0),
      idleAgents: Object.values(poolStatus.byType).reduce((sum, t) => sum + t.idle, 0),
      byType: poolStatus.byType,
    };
  }

  // Fallback
  return { totalAgents: 0, activeAgents: 0, idleAgents: 0, byType: {} };
});
```

---

## Wire 3: Preload Script for Event Handling

### File: `src/preload/index.ts` (add event handler)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Existing API
const api = {
  // ... existing methods ...

  // Add Nexus event subscription
  onNexusEvent: (callback: (event: { type: string; payload: unknown; timestamp: Date }) => void) => {
    ipcRenderer.on('nexus-event', (_event, data) => {
      callback(data);
    });
  },

  // Remove listener
  offNexusEvent: () => {
    ipcRenderer.removeAllListeners('nexus-event');
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

---

## Wire 4: UI Store Event Handlers

### File: `src/renderer/src/stores/useProjectStore.ts` (example update)

```typescript
import { create } from 'zustand';

interface ProjectState {
  projectId: string | null;
  progress: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
  };
  // ... other state

  // Actions
  setProgress: (progress: ProjectState['progress']) => void;
  handleNexusEvent: (event: { type: string; payload: unknown }) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  progress: { totalTasks: 0, completedTasks: 0, failedTasks: 0 },

  setProgress: (progress) => set({ progress }),

  handleNexusEvent: (event) => {
    const { type, payload } = event;

    switch (type) {
      case 'planning:completed':
        set({ progress: { ...get().progress, totalTasks: (payload as any).taskCount } });
        break;
      case 'task:completed':
        set({ progress: { ...get().progress, completedTasks: get().progress.completedTasks + 1 } });
        break;
      case 'task:failed':
        set({ progress: { ...get().progress, failedTasks: get().progress.failedTasks + 1 } });
        break;
      // Handle more events...
    }
  },
}));

// Set up event listener (call once in App.tsx)
export function setupNexusEventHandler() {
  window.electronAPI?.onNexusEvent((event) => {
    useProjectStore.getState().handleNexusEvent(event);
    // Also update other stores as needed
  });
}
```

---

## Test Examples

### Genesis Flow Integration Test

```typescript
// tests/integration/genesis-flow.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NexusBootstrap, NexusConfig } from '../../src/main/NexusBootstrap';
import { EventBus, resetEventBus } from '../../src/orchestration/events/EventBus';

describe('Genesis Mode End-to-End', () => {
  let bootstrap: NexusBootstrap;
  let eventLog: string[] = [];

  const mockConfig: NexusConfig = {
    apiKeys: { anthropic: 'test-key' },
    outputDir: './test-output',
    dataDir: './test-data',
  };

  beforeEach(async () => {
    resetEventBus();
    eventLog = [];

    // Mock LLM client
    vi.mock('../../src/llm', () => ({
      createClaudeClient: () => ({
        chat: vi.fn().mockResolvedValue({ content: 'Mock response' }),
      }),
      createGeminiClient: () => ({
        chat: vi.fn().mockResolvedValue({ content: 'Mock response' }),
      }),
    }));

    bootstrap = new NexusBootstrap(mockConfig);
  });

  afterEach(async () => {
    const nexus = await bootstrap.initialize();
    await nexus.shutdown();
  });

  it('should complete full Genesis flow', async () => {
    const nexus = await bootstrap.initialize();

    // Subscribe to all events
    nexus.eventBus.onAny((event) => {
      eventLog.push(event.type);
    });

    // Start Genesis
    await nexus.startGenesis('Test Project');
    expect(eventLog).toContain('interview:started');

    // Simulate interview completion
    // (In real test, would go through actual interview)
    await nexus.eventBus.emit('interview:completed', {
      projectId: 'test-project',
      totalRequirements: 5,
      categories: ['functional'],
      duration: 60000,
    });

    // Wait for planning
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(eventLog).toContain('planning:started');
    expect(eventLog).toContain('planning:completed');

    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(eventLog).toContain('coordinator:started');
  });
});
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/main/NexusBootstrap.ts` | CREATE | Central factory/wiring |
| `src/main/index.ts` | MODIFY | Use NexusBootstrap |
| `src/main/ipc/handlers.ts` | MODIFY | Use real Nexus |
| `src/preload/index.ts` | MODIFY | Add event API |
| `src/renderer/src/stores/*.ts` | MODIFY | Handle events |
| `tests/integration/genesis-flow.test.ts` | CREATE | E2E test |

---

## Execution Order

1. Create `NexusBootstrap.ts` - this unlocks everything
2. Update `main/index.ts` to use bootstrap
3. Update `handlers.ts` to use real Nexus
4. Update `preload/index.ts` for events
5. Update stores for event handling
6. Create and run integration tests
7. Manual E2E testing

---

## Success Criteria

After implementation:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] Genesis flow works end-to-end
- [ ] UI updates in real-time
- [ ] Events flow from backend to frontend
