/**
 * IPC Dialog Handlers - Native File Dialogs
 * Phase 21 Task 4: Electron native dialog IPC handlers
 *
 * Provides native file dialogs for:
 * - Folder selection (openDirectory)
 * - File selection (openFile)
 * - Save dialogs (saveFile)
 *
 * Security:
 * - Validates sender origin for all handlers
 * - Uses ipcMain.handle (request-response pattern)
 * - Never exposes raw Electron APIs
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain, dialog, BrowserWindow } from 'electron';

/**
 * Dialog result interface
 * Consistent structure for all dialog operations
 */
export interface DialogResult {
  canceled: boolean;
  path: string | null;
}

/**
 * Options for openDirectory dialog
 */
export interface OpenDirectoryOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
}

/**
 * Options for openFile dialog
 */
export interface OpenFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiSelections?: boolean;
}

/**
 * Options for saveFile dialog
 */
export interface SaveFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Validate IPC sender is from allowed origin
 * Security: Prevents malicious pages from invoking IPC handlers
 * Allows localhost on any port (for dev server port changes) and file:// for production
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL();
  return url.startsWith('http://localhost:') || url.startsWith('file://');
}

/**
 * Register all dialog IPC handlers
 * Call this during app initialization after app.whenReady()
 */
export function registerDialogHandlers(): void {
  // ========================================
  // Handler: Open Directory (Folder Picker)
  // ========================================
  ipcMain.handle(
    'dialog:openDirectory',
    async (event, options?: OpenDirectoryOptions): Promise<DialogResult> => {
      if (!validateSender(event)) {
        console.error('[DialogHandlers] Unauthorized sender for dialog:openDirectory');
        throw new Error('Unauthorized IPC sender');
      }

      const window = BrowserWindow.fromWebContents(event.sender);

      try {
        const result = await dialog.showOpenDialog(window!, {
          title: options?.title ?? 'Select Directory',
          defaultPath: options?.defaultPath,
          buttonLabel: options?.buttonLabel ?? 'Select',
          properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true, path: null };
        }

        return { canceled: false, path: result.filePaths[0] };
      } catch (error) {
        console.error('[DialogHandlers] Error in openDirectory:', error);
        throw error;
      }
    }
  );

  // ========================================
  // Handler: Open File (File Picker)
  // ========================================
  ipcMain.handle(
    'dialog:openFile',
    async (event, options?: OpenFileOptions): Promise<DialogResult> => {
      if (!validateSender(event)) {
        console.error('[DialogHandlers] Unauthorized sender for dialog:openFile');
        throw new Error('Unauthorized IPC sender');
      }

      const window = BrowserWindow.fromWebContents(event.sender);

      try {
        const properties: Array<'openFile' | 'multiSelections'> = ['openFile'];
        if (options?.multiSelections) {
          properties.push('multiSelections');
        }

        const result = await dialog.showOpenDialog(window!, {
          title: options?.title ?? 'Select File',
          defaultPath: options?.defaultPath,
          filters: options?.filters,
          properties,
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true, path: null };
        }

        // For single file selection, return first file
        return { canceled: false, path: result.filePaths[0] };
      } catch (error) {
        console.error('[DialogHandlers] Error in openFile:', error);
        throw error;
      }
    }
  );

  // ========================================
  // Handler: Save File (Save Dialog)
  // ========================================
  ipcMain.handle(
    'dialog:saveFile',
    async (event, options?: SaveFileOptions): Promise<DialogResult> => {
      if (!validateSender(event)) {
        console.error('[DialogHandlers] Unauthorized sender for dialog:saveFile');
        throw new Error('Unauthorized IPC sender');
      }

      const window = BrowserWindow.fromWebContents(event.sender);

      try {
        const result = await dialog.showSaveDialog(window!, {
          title: options?.title ?? 'Save File',
          defaultPath: options?.defaultPath,
          filters: options?.filters,
        });

        if (result.canceled || !result.filePath) {
          return { canceled: true, path: null };
        }

        return { canceled: false, path: result.filePath };
      } catch (error) {
        console.error('[DialogHandlers] Error in saveFile:', error);
        throw error;
      }
    }
  );

  console.log('[DialogHandlers] Registered dialog IPC handlers');
}
