# Infrastructure Implementation Plan

## Date: 2025-01-23

## Summary

Based on the Infrastructure Audit and Reference Patterns analysis, this document outlines the prioritized implementation plan for adding critical infrastructure to Nexus.

---

## Priority Order

### P0: Critical Path (Must have for basic functionality)

#### 1. IPC Dialog Handlers (Task 4)
**Estimated Time:** 45 minutes
**Files to Create:**
- `src/main/ipc/dialogHandlers.ts`

**Implementation:**
- Implement `dialog:openDirectory` IPC handler for folder selection
- Implement `dialog:openFile` IPC handler for file selection
- Implement `dialog:saveFile` IPC handler for save dialogs
- Follow Automaker pattern: check for mainWindow, return structured result
- Use `properties: ['openDirectory', 'createDirectory']` for folder picker

**Dependencies:** None

**Preload Changes:**
- Add `dialog` namespace to `nexusAPI` in `src/preload/index.ts`

---

#### 2. Project Initialization (Task 5)
**Estimated Time:** 1 hour
**Files to Create:**
- `src/main/services/ProjectInitializer.ts`
- `tests/unit/main/ProjectInitializer.test.ts`

**Implementation:**
- Create `ProjectInitializer` class with `initializeProject()` method
- Create directory structure: `src/`, `tests/`, `.nexus/`
- Create `.nexus/config.json` with project configuration
- Create `.nexus/STATE.md` for phase tracking
- Optional git initialization with initial commit
- Name sanitization (kebab-case, remove invalid chars)
- Return `IPCResult<InitializedProject>` structure

**Dependencies:** Task 4 (dialog handlers for selecting location)

**IPC Channels:**
- `project:initialize` - Create new project

---

#### 3. Project Loading (Task 6)
**Estimated Time:** 45 minutes
**Files to Create:**
- `src/main/services/ProjectLoader.ts`
- `tests/unit/main/ProjectLoader.test.ts`

**Implementation:**
- Create `ProjectLoader` class with `loadProject()` method
- Validate project path exists and is a directory
- Check for `.nexus/config.json` to identify Nexus projects
- For non-Nexus projects, create `.nexus/` structure
- Return `LoadedProject` with metadata

**Dependencies:** Task 4 (dialog handlers for selecting location)

**IPC Channels:**
- `project:load` - Load existing project
- `project:validate` - Validate project path

---

#### 4. Project IPC Handlers (Task 5-6 combined)
**Estimated Time:** 30 minutes
**Files to Create:**
- `src/main/ipc/projectInfraHandlers.ts`

**Implementation:**
- Register `project:initialize` handler
- Register `project:load` handler
- Register `project:validate` handler
- Follow IPCResult pattern for all responses

**Dependencies:** Tasks 5, 6

---

#### 5. UI Integration (Task 7)
**Estimated Time:** 1.5 hours
**Files to Create:**
- `src/renderer/src/components/project/ProjectSelector.tsx`
- `src/renderer/src/components/project/index.ts`

**Files to Modify:**
- `src/renderer/src/pages/ModeSelectorPage.tsx`
- `src/preload/index.ts` (add dialog and project APIs)

**Implementation:**
- Create `ProjectSelector` component with:
  - Mode selection (genesis vs evolution)
  - Folder browser button
  - Project name input (genesis mode)
  - Validation display
  - Create/Open button
- Update `ModeSelectorPage` to show ProjectSelector modal
- Wire up to navigate to appropriate page after selection

**Dependencies:** Tasks 4, 5, 6

---

### P1: Important Features (Affects User Experience)

#### 6. Recent Projects (Task 8)
**Estimated Time:** 1 hour
**Files to Create:**
- `src/main/services/RecentProjects.ts`
- `src/renderer/src/components/project/RecentProjectsList.tsx`
- `tests/unit/main/RecentProjects.test.ts`

**Implementation:**
- Store recent projects in `app.getPath('userData')/recent-projects.json`
- Maximum 10 recent projects
- FIFO when limit reached
- Display on ModeSelectorPage
- Click to quick-load project

**Dependencies:** Tasks 5, 6

**IPC Channels:**
- `project:getRecent` - Get recent projects list
- `project:addRecent` - Add to recent
- `project:removeRecent` - Remove from recent

---

#### 7. Final Integration (Task 9)
**Estimated Time:** 1 hour
**Files to Modify:**
- `src/main/index.ts` - Register all new handlers
- `src/preload/index.ts` - Final verification of exposed APIs
- `src/renderer/src/types/electron.d.ts` - TypeScript types

**Implementation:**
- Register all handlers in correct order
- Verify preload exposes all APIs
- Add comprehensive TypeScript types
- Manual E2E testing

**Dependencies:** All previous tasks

---

### P2: Nice to Have (Deferred)

- Project templates
- Git URL import
- Project settings UI

---

## Dependency Graph

```
Task 4 (Dialog Handlers)
    |
    +---> Task 5 (Project Initialization)
    |         |
    |         +---> Task 7 (UI Integration)
    |                    |
    +---> Task 6 (Project Loading) --+
                                      |
                                      v
                              Task 8 (Recent Projects)
                                      |
                                      v
                              Task 9 (Final Integration)
```

---

## File Impact Summary

### New Files (9)
| File | Purpose |
|------|---------|
| `src/main/ipc/dialogHandlers.ts` | Dialog IPC handlers |
| `src/main/services/ProjectInitializer.ts` | Project creation service |
| `src/main/services/ProjectLoader.ts` | Project loading service |
| `src/main/services/RecentProjects.ts` | Recent projects management |
| `src/main/ipc/projectInfraHandlers.ts` | Project infrastructure handlers |
| `src/renderer/src/components/project/ProjectSelector.tsx` | Project selection UI |
| `src/renderer/src/components/project/RecentProjectsList.tsx` | Recent projects UI |
| `tests/unit/main/ProjectInitializer.test.ts` | ProjectInitializer tests |
| `tests/unit/main/ProjectLoader.test.ts` | ProjectLoader tests |

### Modified Files (4)
| File | Changes |
|------|---------|
| `src/main/index.ts` | Register new handlers |
| `src/preload/index.ts` | Expose dialog and project APIs |
| `src/renderer/src/pages/ModeSelectorPage.tsx` | Integrate ProjectSelector |
| `src/renderer/src/types/electron.d.ts` | Add TypeScript types |

---

## Estimated Total Time

| Phase | Time |
|-------|------|
| P0 Tasks (4-7) | 4-5 hours |
| P1 Tasks (8-9) | 2 hours |
| Testing & QA | 1 hour |
| **Total** | **7-8 hours** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing tests | Run tests after each task |
| Type conflicts in preload | Carefully extend existing types |
| Dialog not working in renderer | Test IPC channel registration order |
| Git not available on system | Make git init optional, handle gracefully |

---

## Success Criteria

1. [ ] Dialog handlers work in Electron app
2. [ ] New projects can be created with folder selection
3. [ ] Existing projects can be loaded with folder selection
4. [ ] Recent projects are tracked and displayed
5. [ ] All 2222+ existing tests still pass
6. [ ] TypeScript compiles without errors
7. [ ] Lint passes with 0 errors
8. [ ] Manual E2E test succeeds for Genesis flow
9. [ ] Manual E2E test succeeds for Evolution flow

---

## Next Steps

Proceed to **Task 4: Implement IPC Dialog Handlers**
