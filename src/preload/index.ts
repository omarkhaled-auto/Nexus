import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

/**
 * Nexus API exposed to the renderer process via contextBridge.
 *
 * Security: Only wrapped, specific methods are exposed.
 * Never expose raw ipcRenderer or event objects.
 *
 * These are stubs that will be implemented in 05-04.
 */
const nexusAPI = {
  // Mode operations
  startGenesis: async (): Promise<{ success: boolean }> => {
    console.log('stub: startGenesis');
    return { success: true };
  },
  startEvolution: async (projectId: string): Promise<{ success: boolean }> => {
    console.log('stub: startEvolution', projectId);
    return { success: true };
  },

  // Project operations
  listProjects: async (): Promise<{ projects: unknown[] }> => {
    console.log('stub: listProjects');
    return { projects: [] };
  },
  openProject: async (projectId: string): Promise<{ success: boolean }> => {
    console.log('stub: openProject', projectId);
    return { success: true };
  },

  // Event subscriptions (will be implemented with IPC in 05-04)
  onProgress: (callback: (progress: unknown) => void): (() => void) => {
    console.log('stub: onProgress registered');
    // Return unsubscribe function
    return () => {
      console.log('stub: onProgress unsubscribed');
    };
  },
  onAgentStatus: (callback: (status: unknown) => void): (() => void) => {
    console.log('stub: onAgentStatus registered');
    return () => {
      console.log('stub: onAgentStatus unsubscribed');
    };
  },

  // System info
  getVersion: async (): Promise<{ version: string }> => {
    console.log('stub: getVersion');
    return { version: '0.1.0' };
  },
};

// Expose the API to the renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('nexusAPI', nexusAPI);
  } catch (error) {
    console.error('Failed to expose API:', error);
  }
} else {
  // Fallback for non-isolated context (should not happen in production)
  window.electron = electronAPI;
  window.nexusAPI = nexusAPI;
}

// Type declaration for the renderer process
export type NexusAPI = typeof nexusAPI;

declare global {
  interface Window {
    electron: typeof electronAPI;
    nexusAPI: typeof nexusAPI;
  }
}
