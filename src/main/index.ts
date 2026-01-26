/**
 * Main Process Entry Point
 *
 * Phase 19 Task 4: Uses NexusBootstrap for complete system wiring.
 * Phase 19 Task 15: Reads configuration from SettingsService for proper wiring.
 *
 * NexusBootstrap handles:
 * - Creating NexusFactory and all orchestration components
 * - Wiring Interview -> Planning -> Execution flow
 * - Setting up event forwarding to renderer
 * - Providing Genesis and Evolution mode entry points
 *
 * Settings Configuration:
 * - LLM provider selection (Claude/Gemini)
 * - Backend selection (CLI/API) per provider
 * - API keys from secure storage
 * - Agent configuration
 */

import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerIpcHandlers, registerCheckpointReviewHandlers, registerDatabaseHandlers, registerSettingsHandlers, registerInterviewHandlers, registerFallbackInterviewHandlers, removeInterviewHandlers, setupEventForwarding, registerDialogHandlers, registerProjectHandlers } from './ipc';
import {
  initializeNexus,
  setMainWindow,
  clearMainWindow,
  type BootstrappedNexus,
} from './NexusBootstrap';
import { settingsService } from './services/settingsService';

let mainWindow: BrowserWindow | null = null;
let nexusInstance: BootstrappedNexus | null = null;

/**
 * Get working directory for Nexus operations
 */
function getWorkingDir(): string {
  // In development, use current working directory
  // In production, use app's userData path
  if (is.dev) {
    return process.cwd();
  }
  return app.getPath('userData');
}

/**
 * Get data directory for persistence (SQLite, etc.)
 */
function getDataDir(): string {
  // Use app's userData path for database and persistence
  return app.getPath('userData');
}

function createWindow(): void {
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

  // Set main window reference for NexusBootstrap event forwarding
  setMainWindow(mainWindow);

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

/**
 * Get NexusBootstrap configuration from SettingsService
 *
 * Phase 19 Task 15: Settings now properly configure the backend.
 * Priority order for API keys:
 * 1. Environment variables (for CI/CD and development)
 * 2. SettingsService (user-configured via UI, encrypted with safeStorage)
 *
 * Priority order for backend selection:
 * 1. SettingsService configuration (user preference)
 * 2. Fall back to CLI if no API key available
 */
function getNexusConfigFromSettings(): {
  workingDir: string;
  dataDir: string;
  apiKeys: { anthropic?: string; google?: string; openai?: string };
  useCli: { claude: boolean; gemini: boolean };
} {
  // Read settings from SettingsService
  const settings = settingsService.getAll();

  // Get API keys: environment variables take precedence, then settings
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? settingsService.getApiKey('claude');
  const googleKey = process.env['GOOGLE_AI_API_KEY'] ?? settingsService.getApiKey('gemini');
  const openaiKey = process.env['OPENAI_API_KEY'] ?? settingsService.getApiKey('openai');

  // Get backend preference from settings
  // If user explicitly set 'api' but no key is available, fall back to 'cli'
  const claudeWantsCli = settings.llm.claude.backend === 'cli';
  const geminiWantsCli = settings.llm.gemini.backend === 'cli';

  // Determine actual backend:
  // - If user wants CLI -> use CLI
  // - If user wants API but no key -> fall back to CLI
  // - If user wants API and has key -> use API
  const useClaudeCli = claudeWantsCli || (!claudeWantsCli && !anthropicKey);
  const useGeminiCli = geminiWantsCli || (!geminiWantsCli && !googleKey);

  return {
    workingDir: getWorkingDir(),
    dataDir: getDataDir(),
    apiKeys: {
      anthropic: anthropicKey ?? undefined,
      google: googleKey ?? undefined,
      openai: openaiKey ?? undefined,
    },
    useCli: {
      claude: useClaudeCli,
      gemini: useGeminiCli,
    },
  };
}

/**
 * Initialize Nexus system with NexusBootstrap
 *
 * Phase 19 Task 15: Now reads configuration from SettingsService
 */
async function initializeNexusSystem(): Promise<void> {
  try {
    console.log('[Main] Initializing Nexus system...');

    // Get configuration from SettingsService (with env var fallback)
    const config = getNexusConfigFromSettings();

    // Log configuration source for debugging
    const settings = settingsService.getAll();
    console.log('[Main] Configuration sources:');
    console.log(`[Main]   Claude backend preference: ${settings.llm.claude.backend}`);
    console.log(`[Main]   Claude API key: ${config.apiKeys.anthropic ? 'present' : 'not set'}`);
    console.log(`[Main]   Gemini backend preference: ${settings.llm.gemini.backend}`);
    console.log(`[Main]   Gemini API key: ${config.apiKeys.google ? 'present' : 'not set'}`);

    // Initialize Nexus via bootstrap
    nexusInstance = await initializeNexus(config);

    // Remove fallback handlers before registering real ones
    // (fallback handlers were registered early to handle race conditions)
    removeInterviewHandlers();

    // Register interview handlers with the bootstrapped engine, session manager, and database
    registerInterviewHandlers(
      nexusInstance.interviewEngine,
      nexusInstance.sessionManager,
      nexusInstance.databaseClient
    );

    // Register checkpoint and review IPC handlers
    registerCheckpointReviewHandlers(
      nexusInstance.checkpointManager,
      nexusInstance.humanReviewService
    );

    // Register database handlers for feature/task queries
    registerDatabaseHandlers(nexusInstance.databaseClient);

    console.log('[Main] Nexus system initialized successfully');
    console.log(`[Main] Working directory: ${config.workingDir}`);
    console.log(`[Main] Data directory: ${config.dataDir}`);
    console.log(`[Main] Claude backend: ${config.useCli.claude ? 'CLI' : 'API'}`);
    console.log(`[Main] Gemini backend: ${config.useCli.gemini ? 'CLI' : 'API'}`);
  } catch (error) {
    console.error('[Main] Failed to initialize Nexus system:', error);
    // Don't crash the app - allow it to run with limited functionality
    // User can still use the UI, just without backend functionality

    // Fallback handlers were already registered early (before window creation)
    // to handle race conditions. Update them with the specific error message.
    const errorMessage = error instanceof Error ? error.message : String(error);
    removeInterviewHandlers();
    registerFallbackInterviewHandlers(errorMessage);
  }
}

// This method will be called when Electron has finished initialization
void app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.nexus.app');

  // Register basic IPC handlers before Nexus initialization
  registerIpcHandlers();
  registerSettingsHandlers();
  registerDialogHandlers(); // Phase 21 Task 4: Dialog handlers for file/folder selection
  registerProjectHandlers(); // Phase 21 Task 5: Project initialization handlers

  // Register fallback interview handlers BEFORE window creation
  // This prevents "No handler registered" errors if the renderer tries to
  // call interview APIs before Nexus finishes initializing.
  // These will be replaced with real handlers when Nexus initializes successfully.
  registerFallbackInterviewHandlers('Nexus is still initializing...');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Create window first so user sees UI while Nexus initializes
  createWindow();

  // Set up basic event forwarding (for events not handled by NexusBootstrap)
  if (mainWindow) {
    setupEventForwarding(mainWindow);
  }

  // Initialize Nexus system in the background
  // This wires Interview -> Planning -> Execution flow
  await initializeNexusSystem();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('[Main] Failed to initialize app:', error);
  app.quit();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean shutdown
app.on('before-quit', () => {
  void (async () => {
    console.log('[Main] Application shutting down...');

    // Clear main window reference
    clearMainWindow();

    // Shutdown Nexus system
    if (nexusInstance) {
      try {
        await nexusInstance.shutdown();
        console.log('[Main] Nexus system shut down successfully');
      } catch (error) {
        console.error('[Main] Error during Nexus shutdown:', error);
      }
      nexusInstance = null;
    }
  })();
});

// Export for testing
export { createWindow, mainWindow, nexusInstance };
