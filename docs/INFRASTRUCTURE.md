# Nexus Infrastructure

## Overview

This document describes the core infrastructure components that enable Nexus to function. These components were implemented in Phase 21 to solve the critical issue of users being unable to select project directories for Genesis and Evolution modes.

## Architecture Overview

```
+------------------+      IPC        +------------------+
|   Renderer       | <-------------> |   Main Process   |
|   (React UI)     |                 |   (Electron)     |
+------------------+                 +------------------+
        |                                    |
        v                                    v
+------------------+                 +------------------+
|   Preload API    |                 |   IPC Handlers   |
|   (Bridge)       |                 |   + Services     |
+------------------+                 +------------------+
```

## Dialog System

### File: src/main/ipc/dialogHandlers.ts

Provides native file dialogs for project selection. Uses Electron's `dialog` module exposed via IPC.

#### Available Dialogs

| Channel | Purpose | Returns |
|---------|---------|---------|
| `dialog:openDirectory` | Select a folder | `{ canceled: boolean, path: string \| null }` |
| `dialog:openFile` | Select a file | `{ canceled: boolean, path: string \| null }` |
| `dialog:saveFile` | Save file dialog | `{ canceled: boolean, path: string \| null }` |

#### Usage from Renderer

```typescript
// Open folder picker for project selection
const result = await window.electron.dialog.openDirectory({
  title: 'Select Project Directory',
  defaultPath: '/home/user/projects',
  buttonLabel: 'Select',
});

if (!result.canceled && result.path) {
  console.log('Selected:', result.path);
}

// Open file picker with filters
const fileResult = await window.electron.dialog.openFile({
  title: 'Select Configuration File',
  filters: [{ name: 'JSON', extensions: ['json'] }],
});

// Save file dialog
const saveResult = await window.electron.dialog.saveFile({
  title: 'Export Project',
  defaultPath: 'project-export.json',
});
```

## Project Management

### File: src/main/services/ProjectInitializer.ts

Creates new projects with a standardized directory structure.

#### Project Structure Created

```
<project-name>/
  src/             # Source code directory
  tests/           # Test files directory
  .nexus/          # Nexus configuration
    config.json    # Project configuration
    STATE.md       # Project state tracking
    checkpoints/   # Checkpoint storage
    worktrees/     # Git worktrees
  .git/            # Git repository (if initGit=true)
  .gitignore       # Standard gitignore
```

#### Configuration File Format

```json
{
  "name": "my-project",
  "description": "Project description",
  "version": "1.0.0",
  "created": "2025-01-23T00:00:00.000Z",
  "nexusVersion": "1.0.0",
  "settings": {
    "maxAgents": 4,
    "qaMaxIterations": 50,
    "taskMaxMinutes": 30,
    "checkpointIntervalSeconds": 7200
  }
}
```

#### Usage from Renderer

```typescript
const result = await window.electron.projectInit.initialize({
  name: 'my-new-project',
  path: '/home/user/projects',
  description: 'An awesome project',
  initGit: true,
});

if (result.success) {
  console.log('Project created at:', result.project.path);
  // Navigate to interview page
} else {
  console.error('Failed:', result.error);
}
```

### File: src/main/services/ProjectLoader.ts

Loads and validates existing projects.

#### Features

- Validates project directory exists
- Loads existing Nexus configuration
- Creates Nexus structure for non-Nexus projects
- Detects Git repository presence

#### Usage from Renderer

```typescript
// Load a project
const result = await window.electron.projectInit.load('/path/to/project');

if (result.success) {
  console.log('Loaded project:', result.project.name);
  console.log('Is Nexus project:', result.project.isNexusProject);
  console.log('Has Git:', result.project.hasGit);
}

// Validate a path
const validation = await window.electron.projectInit.validate('/path/to/check');
console.log('Valid directory:', validation.valid);
```

### File: src/main/services/RecentProjectsService.ts

Manages a list of recently opened projects for quick access.

#### Features

- Stores up to 10 recent projects
- Persists in app user data directory
- Sorted by last opened date
- Automatic deduplication

#### Usage from Renderer

```typescript
// Get all recent projects
const projects = await window.electron.recentProjects.get();
// Returns: Array<{ path: string, name: string, lastOpened: string }>

// Add a project to recents
await window.electron.recentProjects.add({
  path: '/home/user/projects/my-project',
  name: 'my-project',
});

// Remove a project from recents
await window.electron.recentProjects.remove('/path/to/project');

// Clear all recent projects
await window.electron.recentProjects.clear();
```

## IPC Handlers Summary

| Channel | Purpose | Handler File |
|---------|---------|--------------|
| `dialog:openDirectory` | Open folder picker | dialogHandlers.ts |
| `dialog:openFile` | Open file picker | dialogHandlers.ts |
| `dialog:saveFile` | Open save dialog | dialogHandlers.ts |
| `projectInit:initialize` | Create new project | projectHandlers.ts |
| `projectInit:load` | Load existing project | projectHandlers.ts |
| `projectInit:validate` | Validate project path | projectHandlers.ts |
| `recentProjects:get` | Get recent projects | projectHandlers.ts |
| `recentProjects:add` | Add to recent | projectHandlers.ts |
| `recentProjects:remove` | Remove from recent | projectHandlers.ts |
| `recentProjects:clear` | Clear all recent | projectHandlers.ts |

## UI Components

### ProjectSelector Component

**File:** `src/renderer/src/components/ProjectSelector.tsx`

A reusable component for both Genesis and Evolution modes.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `'genesis' \| 'evolution'` | Determines UI behavior |
| `onProjectSelected` | `(path: string, name?: string) => void` | Called on successful selection |
| `onCancel` | `() => void` | Called when user cancels |

#### Features

- Folder picker integration
- Project name input (Genesis mode)
- Validation before proceeding
- Loading state handling
- Error display

### RecentProjectsList Component

**File:** `src/renderer/src/components/RecentProjectsList.tsx`

Displays recent projects for quick access.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `onSelect` | `(path: string) => void` | Called when project selected |

## Preload API Reference

All infrastructure APIs are exposed through the preload script:

```typescript
// Available on window.electron

interface ElectronAPI {
  // Dialog APIs
  dialog: {
    openDirectory: (options?: DialogOptions) => Promise<DialogResult>;
    openFile: (options?: FileDialogOptions) => Promise<DialogResult>;
    saveFile: (options?: FileDialogOptions) => Promise<DialogResult>;
  };

  // Project APIs
  projectInit: {
    initialize: (options: ProjectInitOptions) => Promise<ProjectResult>;
    load: (path: string) => Promise<ProjectResult>;
    validate: (path: string) => Promise<ValidationResult>;
  };

  // Recent Projects APIs
  recentProjects: {
    get: () => Promise<RecentProject[]>;
    add: (project: { path: string; name: string }) => Promise<void>;
    remove: (path: string) => Promise<void>;
    clear: () => Promise<void>;
  };
}
```

## Testing

### Unit Tests

All infrastructure components have comprehensive unit tests:

| Component | Test File | Tests |
|-----------|-----------|-------|
| Dialog Handlers | `tests/unit/main/ipc/dialogHandlers.test.ts` | 11 tests |
| Project Initializer | `tests/unit/main/services/ProjectInitializer.test.ts` | 16 tests |
| Project Loader | `tests/unit/main/services/ProjectLoader.test.ts` | 20 tests |
| Project Handlers | `tests/unit/main/ipc/projectHandlers.test.ts` | 12 tests |
| Recent Projects | `tests/unit/main/services/RecentProjectsService.test.ts` | 21 tests |
| ProjectSelector UI | `tests/unit/renderer/components/ProjectSelector.test.tsx` | 10 tests |

### Running Tests

```bash
# Run all tests
npm test

# Run infrastructure tests only
npm test -- --grep "Dialog\|Project\|Recent"

# Run main process tests
npm test -- tests/unit/main
```

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| "Project path does not exist" | Path not found | Verify path exists |
| "Project path is not a directory" | Path is a file | Select a directory |
| "Path already exists as a file" | Naming conflict | Choose different name |
| "Directory not empty and not a Nexus project" | Non-empty folder | Choose empty folder or Nexus project |

### Error Response Format

All IPC handlers return consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
}

interface SuccessResponse<T> {
  success: true;
  project: T;
}
```

## Integration Flow

### Genesis Mode Flow

1. User clicks "Genesis Mode" on welcome page
2. ProjectSelector opens in genesis mode
3. User enters project name and selects folder
4. `projectInit.initialize()` creates project
5. Project added to recent projects
6. Navigation to Interview page

### Evolution Mode Flow

1. User clicks "Evolution Mode" on welcome page
2. ProjectSelector opens in evolution mode
3. User selects existing project folder
4. `projectInit.load()` validates and loads project
5. Project added to recent projects
6. Navigation to Kanban page

### Recent Project Flow

1. RecentProjectsList displays on welcome page
2. User clicks a recent project
3. `projectInit.load()` loads the project
4. Navigation to appropriate page

## Future Enhancements

Potential improvements for future phases:

1. **Project Templates** - Pre-configured project structures
2. **Git URL Import** - Clone from remote repository
3. **Project Search** - Search through recent/all projects
4. **Project Tags** - Categorize projects
5. **Cloud Sync** - Sync recent projects across devices

## Changelog

### Phase 21 (2025-01-23)

- Added dialog IPC handlers
- Added ProjectInitializer service
- Added ProjectLoader service
- Added RecentProjectsService
- Added ProjectSelector component
- Added RecentProjectsList component
- Updated preload script with all APIs
- Added comprehensive test coverage (90+ tests)
