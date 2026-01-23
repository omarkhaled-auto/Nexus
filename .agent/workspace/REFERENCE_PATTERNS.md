# Reference Repository Patterns

## Date: 2025-01-23

## Summary

This document extracts implementation patterns from reference repositories (Auto-Claude, Automaker) for implementing critical infrastructure in Nexus.

---

## 1. Dialog IPC Patterns

### From Automaker (main.ts)

**IPC Handler Registration:**
```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';

// Open Directory Dialog
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) {
    return { canceled: true, filePaths: [] };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result;
});

// Open File Dialog
ipcMain.handle('dialog:openFile', async (_, options = {}) => {
  if (!mainWindow) {
    return { canceled: true, filePaths: [] };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options,
  });
  return result;
});

// Save File Dialog
ipcMain.handle('dialog:saveFile', async (_, options = {}) => {
  if (!mainWindow) {
    return { canceled: true, filePath: undefined };
  }
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});
```

**Key Points:**
- Always check if mainWindow exists
- Return `{ canceled: true, ... }` if window is null
- Use `properties: ['openDirectory', 'createDirectory']` for folder selection
- Allow custom options to be passed through

### From Automaker (preload.ts)

**Preload Exposure:**
```typescript
import { contextBridge, ipcRenderer, OpenDialogOptions, SaveDialogOptions } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Native dialogs
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (options?: OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options?: SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:saveFile', options),
});
```

---

## 2. Project Creation Patterns

### From Auto-Claude (settings-handlers.ts)

**Select Project Directory:**
```typescript
ipcMain.handle(
  IPC_CHANNELS.DIALOG_SELECT_PROJECT_DIRECTORY,
  async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Directory'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }
);
```

**Create Project Folder with Git Init:**
```typescript
ipcMain.handle(
  IPC_CHANNELS.DIALOG_CREATE_PROJECT_FOLDER,
  async (
    _,
    location: string,
    name: string,
    initGit: boolean
  ): Promise<IPCResult<{ path: string; name: string; gitInitialized: boolean }>> => {
    try {
      // Validate inputs
      if (!location || !name) {
        return { success: false, error: 'Location and name are required' };
      }

      // Sanitize project name (convert to kebab-case, remove invalid chars)
      const sanitizedName = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!sanitizedName) {
        return { success: false, error: 'Invalid project name' };
      }

      const projectPath = path.join(location, sanitizedName);

      // Check if folder already exists
      if (existsSync(projectPath)) {
        return { success: false, error: `Folder "${sanitizedName}" already exists` };
      }

      // Create the directory
      mkdirSync(projectPath, { recursive: true });

      // Initialize git if requested
      let gitInitialized = false;
      if (initGit) {
        try {
          execFileSync(getToolPath('git'), ['init'], { cwd: projectPath, stdio: 'ignore' });
          gitInitialized = true;
        } catch {
          console.warn('Failed to initialize git repository');
        }
      }

      return {
        success: true,
        data: {
          path: projectPath,
          name: sanitizedName,
          gitInitialized
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
);
```

**Key Points:**
- Sanitize project name to kebab-case
- Check if folder already exists before creating
- Use `mkdirSync` with `recursive: true`
- Git init is optional and should not fail the operation
- Return structured result with success/error

---

## 3. IPC Result Pattern

### Standard Result Type
```typescript
interface IPCResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

All IPC handlers should return this structure for consistency.

---

## 4. Nexus-Specific Patterns

### Current Nexus Preload Structure

The Nexus preload script (`src/preload/index.ts`) uses:
- `contextBridge.exposeInMainWorld('nexusAPI', ...)` for Nexus-specific APIs
- `contextBridge.exposeInMainWorld('electron', electronAPI)` for Electron toolkit APIs
- Callback unsubscribe pattern for events
- Settings namespace: `nexusAPI.settings`

### Recommended Dialog API Location

Add to existing `nexusAPI` object:
```typescript
// Add to nexusAPI in preload
dialog: {
  openDirectory: (options?: { title?: string }) =>
    ipcRenderer.invoke('dialog:openDirectory', options),
  openFile: (options?: OpenDialogOptions) =>
    ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options?: SaveDialogOptions) =>
    ipcRenderer.invoke('dialog:saveFile', options),
},
```

### Recommended Project API Location

Add to existing `nexusAPI` object:
```typescript
// Add to nexusAPI in preload
project: {
  // Existing
  get: (id: string) => ipcRenderer.invoke('project:get', id),
  list: () => ipcRenderer.invoke('projects:list'),
  create: (input: { name: string; mode: 'genesis' | 'evolution' }) =>
    ipcRenderer.invoke('project:create', input),

  // New
  initialize: (options: { path: string; name: string; initGit?: boolean }) =>
    ipcRenderer.invoke('project:initialize', options),
  load: (path: string) => ipcRenderer.invoke('project:load', path),
  validate: (path: string) => ipcRenderer.invoke('project:validate', path),
},
```

---

## 5. Nexus Config Folder Pattern

Based on Architecture Blueprint Layer 7 specifications:

### .nexus/ Directory Structure
```
project-root/
  .nexus/
    config.json       # Project configuration
    state.json        # Runtime state (optional)
    checkpoints/      # Checkpoint data
    agents/           # Agent working directories
```

### config.json Schema
```typescript
interface NexusProjectConfig {
  version: string;           // Config version (e.g., "1.0.0")
  projectId: string;         // UUID
  name: string;              // Human-readable name
  mode: 'genesis' | 'evolution';
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
  settings: {
    llmProvider?: string;
    maxAgents?: number;
    // ... other project-specific settings
  };
}
```

---

## 6. Working Directory Pattern

### From Architecture Blueprint

The NexusBootstrap currently uses:
```typescript
function getWorkingDir(): string {
  if (is.dev) return process.cwd();
  return app.getPath('userData');
}
```

### Required Change

Make working directory dynamic per-project:
```typescript
interface NexusBootstrapConfig {
  workingDir: string;  // Should be set from loaded project path
  dataDir: string;
  // ...
}

// In main process, when loading project:
const project = await projectLoader.load('/user/selected/path');
nexusBootstrap.configure({
  workingDir: project.path,
  // ...
});
```

---

## 7. Implementation Recommendations

### File Structure for New Infrastructure

```
src/main/
  ipc/
    dialogHandlers.ts      # Dialog IPC handlers (NEW)
    projectHandlers.ts     # Project IPC handlers (EXISTING - extend)
    index.ts               # Handler registration (UPDATE)
  services/
    ProjectInitializer.ts  # Project creation service (NEW)
    ProjectLoader.ts       # Project loading service (NEW)
    RecentProjects.ts      # Recent projects management (NEW)
```

### Registration Pattern

In `src/main/index.ts`:
```typescript
import { registerDialogHandlers } from './ipc/dialogHandlers';
import { registerProjectInfraHandlers } from './ipc/projectHandlers';

app.whenReady().then(async () => {
  // Register IPC handlers BEFORE creating window
  registerDialogHandlers(mainWindow);
  registerProjectInfraHandlers();
  // ... other handlers

  await createWindow();
});
```

---

## 8. Patterns to Implement

1. **Dialog Handlers** (P0)
   - `dialog:openDirectory` - Folder selection
   - `dialog:openFile` - File selection
   - `dialog:saveFile` - Save dialog

2. **Project Initialization** (P0)
   - `project:initialize` - Create project directory with .nexus/
   - Name sanitization
   - Git initialization (optional)

3. **Project Loading** (P0)
   - `project:load` - Load project from path
   - `project:validate` - Validate project structure

4. **Recent Projects** (P1)
   - `project:getRecent` - Get recent projects list
   - `project:addRecent` - Add to recent
   - `project:removeRecent` - Remove from recent
   - Storage in app userData

---

## Conclusion

The patterns from Auto-Claude and Automaker provide solid foundations for implementing:

1. **Native dialog integration** via IPC handlers in main process
2. **Project creation** with sanitization and git init
3. **Structured IPC results** for consistent error handling
4. **Preload API exposure** following security best practices

These patterns align with Nexus's existing architecture and can be integrated without breaking current functionality.
