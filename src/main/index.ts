/**
 * Main Process Entry Point
 *
 * Phase 19 Task 4: Uses NexusBootstrap for complete system wiring.
 * NexusBootstrap handles:
 * - Creating NexusFactory and all orchestration components
 * - Wiring Interview -> Planning -> Execution flow
 * - Setting up event forwarding to renderer
 * - Providing Genesis and Evolution mode entry points
 */

import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerIpcHandlers, registerSettingsHandlers, registerInterviewHandlers, setupEventForwarding } from './ipc';
import {
  initializeNexus,
  setMainWindow,
  clearMainWindow,
  type BootstrappedNexus,
} from './NexusBootstrap';

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
 * Initialize Nexus system with NexusBootstrap
 */
async function initializeNexusSystem(): Promise<void> {
  try {
    console.log('[Main] Initializing Nexus system...');

    // Get configuration from environment variables
    const config = {
      workingDir: getWorkingDir(),
      dataDir: getDataDir(),
      apiKeys: {
        anthropic: process.env['ANTHROPIC_API_KEY'],
        google: process.env['GOOGLE_AI_API_KEY'],
        openai: process.env['OPENAI_API_KEY'],
      },
      useCli: {
        // Default to CLI if no API keys are set
        claude: !process.env['ANTHROPIC_API_KEY'],
        gemini: !process.env['GOOGLE_AI_API_KEY'],
      },
    };

    // Initialize Nexus via bootstrap
    nexusInstance = await initializeNexus(config);

    // Register interview handlers with the bootstrapped engine and session manager
    registerInterviewHandlers(
      nexusInstance.interviewEngine,
      nexusInstance.sessionManager
    );

    console.log('[Main] Nexus system initialized successfully');
    console.log(`[Main] Working directory: ${config.workingDir}`);
    console.log(`[Main] Data directory: ${config.dataDir}`);
    console.log(`[Main] Claude backend: ${config.useCli.claude ? 'CLI' : 'API'}`);
    console.log(`[Main] Gemini backend: ${config.useCli.gemini ? 'CLI' : 'API'}`);
  } catch (error) {
    console.error('[Main] Failed to initialize Nexus system:', error);
    // Don't crash the app - allow it to run with limited functionality
    // User can still use the UI, just without backend functionality
  }
}

// This method will be called when Electron has finished initialization
void app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.nexus.app');

  // Register basic IPC handlers before Nexus initialization
  registerIpcHandlers();
  registerSettingsHandlers();

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
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean shutdown
app.on('before-quit', async () => {
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
});

// Export for testing
export { createWindow, mainWindow, nexusInstance };
