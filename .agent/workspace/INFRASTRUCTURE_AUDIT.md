# Infrastructure Audit Results

## Date: 2025-01-23

## Summary

This audit examines the current state of Nexus infrastructure to identify what exists and what is missing for critical project selection functionality.

---

## Electron Dialogs

| Feature | Status | Details |
|---------|--------|---------|
| showOpenDialog | **MISSING** | No implementation found in src/main/ |
| showSaveDialog | **MISSING** | No implementation found in src/main/ |
| IPC handlers for dialogs | **MISSING** | No `ipcMain.handle.*dialog` patterns found |
| Folder selection | **MISSING** | No folder picker implementation |

**Impact:** Users cannot select directories for Genesis or Evolution modes.

---

## Project Management

| Feature | Status | Details |
|---------|--------|---------|
| Create project function | **PARTIAL** | `createProject` exists in preload API but only stores in DB, doesn't create filesystem directories |
| Load project function | **MISSING** | No `loadProject` or `loadProjectFromPath` implementation |
| Project path configuration | **PARTIAL** | `workingDir` exists in NexusBootstrap config but is hardcoded to `process.cwd()` or `userData` |
| Initialize project directory | **MISSING** | No `.nexus/` folder creation, no git init |

### Existing Project API in Preload (src/preload/index.ts):
```typescript
createProject: (input: { name: string; mode: 'genesis' | 'evolution' }) =>
  ipcRenderer.invoke('project:create', input)
getProject: (id: string) => ipcRenderer.invoke('project:get', id)
getProjects: () => ipcRenderer.invoke('projects:list')
```

**Note:** The existing `createProject` creates a database entry but doesn't:
- Create project directory on filesystem
- Create `.nexus/` configuration folder
- Initialize git repository
- Set the project path dynamically

---

## File System Infrastructure

| Feature | Status | Location |
|---------|--------|----------|
| FileSystemService | **EXISTS** | src/infrastructure/file-system/FileSystemService.ts |
| Directory creation | Needs verification | Part of FileSystemService |
| File watching | Needs verification | Part of FileSystemService |

---

## Git Infrastructure

| Feature | Status | Location |
|---------|--------|----------|
| GitService | **EXISTS** | src/infrastructure/git/GitService.ts |
| Git init | Needs verification | Part of GitService |
| WorktreeManager | **EXISTS** | src/infrastructure/git/WorktreeManager.ts |

---

## UI Components

| Feature | Status | Details |
|---------|--------|---------|
| Welcome/Mode Selector page | **EXISTS** | src/renderer/src/pages/ModeSelectorPage.tsx |
| Project selector modal | **PARTIAL** | Shows DB projects, no folder browser |
| Folder browser trigger | **MISSING** | No native folder dialog integration |
| Recent projects | **MISSING** | No recent projects service or UI |

### Current UI Flow:
1. ModeSelectorPage shows Genesis/Evolution cards
2. Genesis click -> navigates to `/genesis` directly (no folder selection)
3. Evolution click -> shows modal with DB projects (no folder browser)
4. No way to select a directory from filesystem

---

## IPC Handlers (src/main/ipc/)

### Existing Handlers:
- `handlers.ts` - Main IPC handlers (features, tasks, agents, execution, etc.)
- `interview-handlers.ts` - Interview-related handlers
- `settingsHandlers.ts` - Settings handlers
- `index.ts` - Handler registration

### Missing Handlers:
- Dialog handlers (showOpenDialog, showSaveDialog)
- Project initialization handlers (create directory, init git)
- Project loading handlers (load from path, validate path)
- Recent projects handlers

---

## Configuration

### NexusBootstrap Config (src/main/NexusBootstrap.ts):
```typescript
export interface NexusBootstrapConfig {
  workingDir: string;    // Currently hardcoded, should be dynamic
  dataDir: string;
  // ...
}
```

### Working Directory (src/main/index.ts):
```typescript
function getWorkingDir(): string {
  if (is.dev) return process.cwd();  // Hardcoded!
  return app.getPath('userData');     // Hardcoded!
}
```

**Problem:** Working directory is fixed, cannot be set per-project.

---

## Missing Critical Features

### P0 (Blocker - System Unusable Without):
1. **File Browser Dialog IPC Handlers** - Native dialogs for folder/file selection
2. **Project Initialization Service** - Create project directory structure with `.nexus/`
3. **Project Loading Service** - Load and validate project from filesystem path
4. **Dynamic Working Directory** - Set working directory based on selected project

### P1 (Important - Affects User Experience):
5. **Recent Projects Service** - Store and display recently opened projects
6. **Project Validation** - Verify project structure before loading
7. **UI Integration** - ProjectSelector component with folder browser

### P2 (Nice to Have):
8. **Project Templates** - Pre-configured project templates
9. **Git URL Import** - Clone project from git URL

---

## Files That Need Modification

### New Files to Create:
- `src/main/ipc/dialogHandlers.ts` - Dialog IPC handlers
- `src/main/services/ProjectInitializer.ts` - Project initialization service
- `src/main/services/ProjectLoader.ts` - Project loading service
- `src/main/services/RecentProjects.ts` - Recent projects management
- `src/renderer/src/components/ProjectSelector.tsx` - UI component

### Files to Modify:
- `src/main/index.ts` - Register new handlers
- `src/preload/index.ts` - Expose new APIs
- `src/renderer/src/pages/ModeSelectorPage.tsx` - Integrate ProjectSelector
- `src/main/NexusBootstrap.ts` - Dynamic working directory

---

## Conclusion

The core issue is that **there is no way for users to select a project directory**. The system assumes:
- Genesis: Works in current working directory or userData
- Evolution: Selects from database projects (which have no filesystem path)

This makes the system non-functional for real-world usage. Users need:
1. A native folder browser to select where to create/load projects
2. Project initialization that creates actual directory structures
3. Project loading that validates and sets the working directory
4. UI integration to trigger these actions
