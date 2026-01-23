# Phase 21: Critical Infrastructure Audit & Implementation

## Context

- **Project:** Nexus AI Builder
- **Repository:** https://github.com/omarkhaled-auto/Nexus
- **Current State:** Phase 20 completed system wiring, but critical infrastructure features may be missing
- **Problem Discovered:** No file browser dialog for project selection - users cannot start Genesis or Evolution mode
- **Reference Repos:** Auto-Claude, Get-Shit-Done, Autocoder, AutoMaker, OMO (in the extraction analysis)

---

## Problem Statement

During Phase 20, we successfully wired all the components together. However, a critical discovery was made:

**Users cannot select a project directory** - there is no file browser dialog implementation.

This means:
- Genesis Mode: Users cannot choose where to create their new project
- Evolution Mode: Users cannot select an existing project to enhance

Without this basic infrastructure, the entire system is non-functional regardless of how well the internal components work.

---

## Pre-Requisites

- [ ] Phase 20 complete (system wiring done)
- [ ] TypeScript compiles (0 errors)
- [ ] All existing tests pass
- [ ] Repository: https://github.com/omarkhaled-auto/Nexus

---

## Critical Rules

+============================================================================+
|                                                                            |
|  RULE 1: DO NOT BREAK EXISTING FUNCTIONALITY                               |
|          - All 2222+ tests must continue passing                           |
|          - Existing wiring must remain intact                              |
|          - NexusBootstrap orchestration must still work                    |
|                                                                            |
|  RULE 2: USE REFERENCE REPO PATTERNS                                       |
|          - Check Feature Catalog (01_FEATURE_CATALOG_BY_FUNCTION.md)       |
|          - Check Architecture Blueprint (05_ARCHITECTURE_BLUEPRINT.md)     |
|          - Check Integration Spec (06_INTEGRATION_SPECIFICATION.md)        |
|          - Check Master Book (07_NEXUS_MASTER_BOOK.md)                     |
|          - These contain patterns from Auto-Claude, GSD, etc.              |
|                                                                            |
|  RULE 3: ELECTRON MAIN PROCESS FOR NATIVE DIALOGS                          |
|          - Native dialogs (file browser) MUST run in main process          |
|          - Use IPC to communicate between renderer and main                |
|          - Follow existing IPC handler patterns in the codebase            |
|                                                                            |
|  RULE 4: TEST EACH FEATURE AFTER IMPLEMENTATION                            |
|          - Write unit tests for new functionality                          |
|          - Verify integration with existing components                     |
|          - Manual verification where automated tests are not possible      |
|                                                                            |
+============================================================================+

---

# =============================================================================
# PHASE A: INFRASTRUCTURE AUDIT (Tasks 1-3)
# =============================================================================

## Task 1: Audit Current Infrastructure State

### Objective
Discover what infrastructure exists and what is missing by examining the codebase.

### Requirements

- [ ] Check for Electron dialog implementation:
  ```bash
  echo "=== Searching for Electron dialog usage ==="
  grep -rn "dialog\|showOpenDialog\|showSaveDialog" src/main/ --include="*.ts"
  
  echo ""
  echo "=== Searching for folder selection ==="
  grep -rn "openDirectory\|folder\|directory" src/main/ --include="*.ts"
  
  echo ""
  echo "=== Searching for IPC dialog handlers ==="
  grep -rn "ipcMain.handle.*dialog\|ipcMain.on.*dialog" src/main/ --include="*.ts"
  ```

- [ ] Check for project initialization:
  ```bash
  echo "=== Searching for project creation ==="
  grep -rn "createProject\|initProject\|initializeProject" src/ --include="*.ts"
  
  echo ""
  echo "=== Searching for project path handling ==="
  grep -rn "rootPath\|projectPath\|workingDirectory" src/ --include="*.ts"
  ```

- [ ] Check for existing infrastructure services:
  ```bash
  echo "=== FileSystemService ==="
  cat src/infrastructure/file-system/FileSystemService.ts 2>/dev/null | head -50 || echo "NOT FOUND"
  
  echo ""
  echo "=== GitService ==="
  cat src/infrastructure/git/GitService.ts 2>/dev/null | head -50 || echo "NOT FOUND"
  
  echo ""
  echo "=== WorktreeManager ==="
  cat src/infrastructure/git/WorktreeManager.ts 2>/dev/null | head -50 || echo "NOT FOUND"
  ```

- [ ] Check UI components for project selection:
  ```bash
  echo "=== Welcome/Home page ==="
  grep -rn "Genesis\|Evolution\|New Project\|Open Project" src/renderer/ --include="*.tsx"
  
  echo ""
  echo "=== Project selector component ==="
  find src/renderer -name "*Project*" -o -name "*Selector*" -o -name "*Welcome*" | head -20
  ```

- [ ] Document findings:
  ```bash
  cat > .agent/workspace/INFRASTRUCTURE_AUDIT.md << 'EOF'
  # Infrastructure Audit Results
  
  ## Date: [DATE]
  
  ## Electron Dialogs
  - showOpenDialog: EXISTS / MISSING
  - showSaveDialog: EXISTS / MISSING
  - IPC handlers for dialogs: EXISTS / MISSING
  
  ## Project Management
  - Create project function: EXISTS / MISSING
  - Load project function: EXISTS / MISSING
  - Project path configuration: EXISTS / MISSING
  
  ## File System
  - FileSystemService: EXISTS / MISSING
  - Directory creation: EXISTS / MISSING
  - File watching: EXISTS / MISSING
  
  ## Git
  - GitService: EXISTS / MISSING
  - Git init: EXISTS / MISSING
  - WorktreeManager: EXISTS / MISSING
  
  ## UI Components
  - Welcome/Home page: EXISTS / MISSING
  - Project selector: EXISTS / MISSING
  - Folder browser trigger: EXISTS / MISSING
  
  ## Missing Critical Features
  1. [List all missing features]
  
  EOF
  ```

### Task 1 Completion Checklist
- [ ] All grep searches executed
- [ ] Existing infrastructure documented
- [ ] Missing features identified
- [ ] INFRASTRUCTURE_AUDIT.md created

**[TASK 1 COMPLETE]** <- Mark when done, proceed to Task 2

---

## Task 2: Review Reference Repository Patterns

### Objective
Extract implementation patterns from the documented reference repositories.

### Requirements

- [ ] Review Feature Catalog for infrastructure patterns:
  ```bash
  echo "=== File System patterns from Feature Catalog ==="
  grep -A 20 "FileSystemService\|file-system" docs/01_FEATURE_CATALOG_BY_FUNCTION.md 2>/dev/null || \
  grep -A 20 "FileSystemService\|file-system" 01_FEATURE_CATALOG_BY_FUNCTION.md 2>/dev/null || \
  echo "Check project knowledge files for FileSystemService patterns"
  
  echo ""
  echo "=== Git patterns ==="
  grep -A 30 "GitService\|worktree" docs/01_FEATURE_CATALOG_BY_FUNCTION.md 2>/dev/null || \
  grep -A 30 "GitService\|worktree" 01_FEATURE_CATALOG_BY_FUNCTION.md 2>/dev/null || \
  echo "Check project knowledge files for Git patterns"
  ```

- [ ] Review Architecture Blueprint for Layer 7 specs:
  ```bash
  echo "=== Layer 7 Infrastructure specs ==="
  grep -A 100 "Layer 7\|Infrastructure" docs/05_ARCHITECTURE_BLUEPRINT.md 2>/dev/null | head -150 || \
  echo "Check project knowledge files for Layer 7 specifications"
  ```

- [ ] Review Integration Specification for IPC patterns:
  ```bash
  echo "=== IPC communication patterns ==="
  grep -A 50 "IPC\|ipcMain\|ipcRenderer" docs/06_INTEGRATION_SPECIFICATION.md 2>/dev/null | head -100 || \
  echo "Check project knowledge files for IPC patterns"
  ```

- [ ] Document reference patterns:
  ```bash
  cat > .agent/workspace/REFERENCE_PATTERNS.md << 'EOF'
  # Reference Repository Patterns
  
  ## From Auto-Claude
  - Worktree management pattern
  - Git operations pattern
  
  ## From GSD
  - Project initialization pattern
  - Working directory management
  
  ## From Electron Best Practices
  - Dialog IPC pattern
  - Main/Renderer communication
  
  ## Patterns to Implement
  1. [Pattern 1]
  2. [Pattern 2]
  
  EOF
  ```

### Task 2 Completion Checklist
- [ ] Feature Catalog patterns reviewed
- [ ] Architecture Blueprint patterns reviewed
- [ ] Integration Spec patterns reviewed
- [ ] REFERENCE_PATTERNS.md created

**[TASK 2 COMPLETE]** <- Mark when done, proceed to Task 3

---

## Task 3: Create Implementation Plan

### Objective
Create a prioritized implementation plan for missing infrastructure.

### Requirements

- [ ] Prioritize missing features:
  ```
  P0 (Blocker - system unusable without):
  - File browser dialog for project selection
  - Project initialization (create directory structure)
  - Project loading (set working directory)
  
  P1 (Important - affects user experience):
  - Git initialization for new projects
  - Recent projects list
  - Project validation
  
  P2 (Nice to have):
  - Project templates
  - Project import from git URL
  ```

- [ ] Create implementation plan:
  ```bash
  cat > .agent/workspace/IMPLEMENTATION_PLAN.md << 'EOF'
  # Infrastructure Implementation Plan
  
  ## Priority Order
  
  ### P0: Critical Path (Must have for basic functionality)
  
  1. **IPC Dialog Handlers** (Task 4)
     - Implement showOpenDialog IPC handler in main process
     - Implement showSaveDialog IPC handler in main process
     - Expose to renderer via preload script
     - Files: src/main/ipc/dialogHandlers.ts
  
  2. **Project Initialization** (Task 5)
     - Create project directory structure
     - Initialize git repository
     - Create .nexus/ configuration folder
     - Files: src/main/services/ProjectInitializer.ts
  
  3. **Project Loading** (Task 6)
     - Validate project directory
     - Load project configuration
     - Set working directory for agents
     - Files: src/main/services/ProjectLoader.ts
  
  4. **UI Integration** (Task 7)
     - Add folder selection to Genesis start
     - Add folder selection to Evolution start
     - Show selected path in UI
     - Files: src/renderer/components/ProjectSelector.tsx
  
  ### P1: Important Features
  
  5. **Recent Projects** (Task 8)
     - Store recent project paths
     - Display in welcome screen
     - Quick access to previous projects
  
  ### Estimated Time
  - P0 Features: 4-6 hours
  - P1 Features: 2-3 hours
  
  EOF
  ```

### Task 3 Completion Checklist
- [ ] Missing features prioritized
- [ ] Implementation plan created
- [ ] Dependencies identified
- [ ] IMPLEMENTATION_PLAN.md created

**[TASK 3 COMPLETE]** <- Mark when done, proceed to Phase B

---

# =============================================================================
# PHASE B: IMPLEMENT CRITICAL INFRASTRUCTURE (Tasks 4-7)
# =============================================================================

## Task 4: Implement IPC Dialog Handlers

### Objective
Create Electron IPC handlers for native file dialogs.

### Requirements

- [ ] Create dialog handlers file:
  ```typescript
  // src/main/ipc/dialogHandlers.ts
  
  import { ipcMain, dialog, BrowserWindow } from 'electron';
  
  export function registerDialogHandlers(): void {
    // Handler for selecting a directory (for project location)
    ipcMain.handle('dialog:openDirectory', async (event, options?: {
      title?: string;
      defaultPath?: string;
      buttonLabel?: string;
    }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      
      const result = await dialog.showOpenDialog(window!, {
        title: options?.title || 'Select Project Directory',
        defaultPath: options?.defaultPath,
        buttonLabel: options?.buttonLabel || 'Select',
        properties: ['openDirectory', 'createDirectory'],
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, path: null };
      }
      
      return { canceled: false, path: result.filePaths[0] };
    });
    
    // Handler for selecting a file
    ipcMain.handle('dialog:openFile', async (event, options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      
      const result = await dialog.showOpenDialog(window!, {
        title: options?.title || 'Select File',
        defaultPath: options?.defaultPath,
        filters: options?.filters,
        properties: ['openFile'],
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, path: null };
      }
      
      return { canceled: false, path: result.filePaths[0] };
    });
    
    // Handler for save dialog
    ipcMain.handle('dialog:saveFile', async (event, options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      
      const result = await dialog.showSaveDialog(window!, {
        title: options?.title || 'Save File',
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      
      if (result.canceled || !result.filePath) {
        return { canceled: true, path: null };
      }
      
      return { canceled: false, path: result.filePath };
    });
    
    console.log('[DialogHandlers] Registered dialog IPC handlers');
  }
  ```

- [ ] Update preload script to expose dialog API:
  ```typescript
  // In src/main/preload.ts or src/preload/index.ts
  // Add to existing contextBridge.exposeInMainWorld
  
  dialog: {
    openDirectory: (options?: {
      title?: string;
      defaultPath?: string;
      buttonLabel?: string;
    }) => ipcRenderer.invoke('dialog:openDirectory', options),
    
    openFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => ipcRenderer.invoke('dialog:openFile', options),
    
    saveFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => ipcRenderer.invoke('dialog:saveFile', options),
  },
  ```

- [ ] Register handlers in main process initialization:
  ```typescript
  // In src/main/index.ts or wherever app initialization happens
  import { registerDialogHandlers } from './ipc/dialogHandlers';
  
  // Call during app initialization (after app.whenReady())
  registerDialogHandlers();
  ```

- [ ] Add TypeScript types for renderer:
  ```typescript
  // In src/renderer/src/types/electron.d.ts or global.d.ts
  
  interface DialogAPI {
    openDirectory: (options?: {
      title?: string;
      defaultPath?: string;
      buttonLabel?: string;
    }) => Promise<{ canceled: boolean; path: string | null }>;
    
    openFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; path: string | null }>;
    
    saveFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; path: string | null }>;
  }
  
  interface Window {
    electron: {
      // ... existing properties
      dialog: DialogAPI;
    };
  }
  ```

- [ ] Write tests for dialog handlers:
  ```typescript
  // tests/unit/main/dialogHandlers.test.ts
  
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  
  // Note: Dialog handlers are hard to unit test directly
  // Focus on integration testing with manual verification
  
  describe('Dialog Handlers', () => {
    it('should be registered without errors', () => {
      // Verify handlers can be imported and registered
      expect(() => {
        // Import would throw if there are syntax errors
        const { registerDialogHandlers } = require('../../../src/main/ipc/dialogHandlers');
        expect(typeof registerDialogHandlers).toBe('function');
      }).not.toThrow();
    });
  });
  ```

### Task 4 Completion Checklist
- [x] dialogHandlers.ts created (src/main/ipc/dialogHandlers.ts)
- [x] Preload script updated with dialog API (src/preload/index.ts)
- [x] Handlers registered in main process (src/main/index.ts)
- [x] TypeScript types added for renderer (inline in preload)
- [x] Basic tests written (tests/unit/main/ipc/dialogHandlers.test.ts - 11 tests passing)
- [x] TypeScript compiles without errors
- [x] Build succeeds
- [x] All 2278 existing tests still pass

**[TASK 4 COMPLETE]** (2025-01-23) - Proceed to Task 5

---

## Task 5: Implement Project Initialization

### Objective
Create service to initialize new projects with proper directory structure.

### Requirements

- [ ] Create ProjectInitializer service:
  ```typescript
  // src/main/services/ProjectInitializer.ts
  
  import * as fs from 'fs-extra';
  import * as path from 'path';
  import { execSync } from 'child_process';
  
  export interface ProjectInitOptions {
    name: string;
    path: string;
    description?: string;
    initGit?: boolean;
  }
  
  export interface InitializedProject {
    id: string;
    name: string;
    path: string;
    createdAt: Date;
  }
  
  export class ProjectInitializer {
    /**
     * Initialize a new Nexus project at the specified path
     */
    async initializeProject(options: ProjectInitOptions): Promise<InitializedProject> {
      const projectPath = path.join(options.path, options.name);
      
      // Validate path doesn't already exist as a file
      if (await fs.pathExists(projectPath)) {
        const stat = await fs.stat(projectPath);
        if (!stat.isDirectory()) {
          throw new Error(`Path already exists as a file: ${projectPath}`);
        }
        // Directory exists - check if it's empty or already a project
        const files = await fs.readdir(projectPath);
        if (files.length > 0 && !files.includes('.nexus')) {
          throw new Error(`Directory not empty and not a Nexus project: ${projectPath}`);
        }
      }
      
      // Create project directory structure
      await this.createDirectoryStructure(projectPath);
      
      // Create .nexus configuration
      await this.createNexusConfig(projectPath, options);
      
      // Initialize git if requested
      if (options.initGit !== false) {
        await this.initializeGit(projectPath);
      }
      
      const projectId = this.generateProjectId();
      
      return {
        id: projectId,
        name: options.name,
        path: projectPath,
        createdAt: new Date(),
      };
    }
    
    private async createDirectoryStructure(projectPath: string): Promise<void> {
      // Create main directories
      const directories = [
        projectPath,
        path.join(projectPath, 'src'),
        path.join(projectPath, 'tests'),
        path.join(projectPath, '.nexus'),
        path.join(projectPath, '.nexus', 'checkpoints'),
        path.join(projectPath, '.nexus', 'worktrees'),
      ];
      
      for (const dir of directories) {
        await fs.ensureDir(dir);
      }
      
      console.log(`[ProjectInitializer] Created directory structure at ${projectPath}`);
    }
    
    private async createNexusConfig(projectPath: string, options: ProjectInitOptions): Promise<void> {
      const config = {
        name: options.name,
        description: options.description || '',
        version: '1.0.0',
        created: new Date().toISOString(),
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 4,
          qaMaxIterations: 50,
          taskMaxMinutes: 30,
          checkpointIntervalSeconds: 7200,
        },
      };
      
      await fs.writeJson(
        path.join(projectPath, '.nexus', 'config.json'),
        config,
        { spaces: 2 }
      );
      
      // Create initial STATE.md
      const stateContent = `# Project State

## Current Phase
initialization

## Status
pending

## Last Updated
${new Date().toISOString()}
`;
      
      await fs.writeFile(
        path.join(projectPath, '.nexus', 'STATE.md'),
        stateContent
      );
      
      console.log(`[ProjectInitializer] Created Nexus configuration`);
    }
    
    private async initializeGit(projectPath: string): Promise<void> {
      try {
        // Check if already a git repo
        const gitDir = path.join(projectPath, '.git');
        if (await fs.pathExists(gitDir)) {
          console.log(`[ProjectInitializer] Git already initialized`);
          return;
        }
        
        // Initialize git
        execSync('git init', { cwd: projectPath, stdio: 'pipe' });
        
        // Create .gitignore
        const gitignore = `# Dependencies
node_modules/

# Build
dist/
build/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# Nexus working files
.nexus/worktrees/
.nexus/checkpoints/

# OS
.DS_Store
Thumbs.db
`;
        
        await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
        
        // Initial commit
        execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
        execSync('git commit -m "Initial commit - Nexus project initialized"', { 
          cwd: projectPath, 
          stdio: 'pipe' 
        });
        
        console.log(`[ProjectInitializer] Git initialized with initial commit`);
      } catch (error) {
        console.warn(`[ProjectInitializer] Git initialization failed:`, error);
        // Non-fatal - project can still work without git
      }
    }
    
    private generateProjectId(): string {
      return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  
  export const projectInitializer = new ProjectInitializer();
  ```

- [ ] Create IPC handlers for project initialization:
  ```typescript
  // src/main/ipc/projectHandlers.ts
  
  import { ipcMain } from 'electron';
  import { projectInitializer, ProjectInitOptions } from '../services/ProjectInitializer';
  import { projectLoader } from '../services/ProjectLoader';
  
  export function registerProjectHandlers(): void {
    // Initialize new project
    ipcMain.handle('project:initialize', async (_event, options: ProjectInitOptions) => {
      try {
        const project = await projectInitializer.initializeProject(options);
        return { success: true, project };
      } catch (error) {
        console.error('[ProjectHandlers] Initialize failed:', error);
        return { success: false, error: (error as Error).message };
      }
    });
    
    // Load existing project
    ipcMain.handle('project:load', async (_event, projectPath: string) => {
      try {
        const project = await projectLoader.loadProject(projectPath);
        return { success: true, project };
      } catch (error) {
        console.error('[ProjectHandlers] Load failed:', error);
        return { success: false, error: (error as Error).message };
      }
    });
    
    // Validate project path
    ipcMain.handle('project:validate', async (_event, projectPath: string) => {
      try {
        const isValid = await projectLoader.validateProjectPath(projectPath);
        return { valid: isValid };
      } catch (error) {
        return { valid: false, error: (error as Error).message };
      }
    });
    
    console.log('[ProjectHandlers] Registered project IPC handlers');
  }
  ```

- [ ] Write unit tests:
  ```typescript
  // tests/unit/main/ProjectInitializer.test.ts
  
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';
  import * as fs from 'fs-extra';
  import * as path from 'path';
  import * as os from 'os';
  import { ProjectInitializer } from '../../../src/main/services/ProjectInitializer';
  
  describe('ProjectInitializer', () => {
    let initializer: ProjectInitializer;
    let testDir: string;
    
    beforeEach(async () => {
      initializer = new ProjectInitializer();
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-test-'));
    });
    
    afterEach(async () => {
      await fs.remove(testDir);
    });
    
    it('should create project directory structure', async () => {
      const result = await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        initGit: false,
      });
      
      expect(result.name).toBe('test-project');
      expect(await fs.pathExists(path.join(testDir, 'test-project'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'test-project', 'src'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'test-project', '.nexus'))).toBe(true);
    });
    
    it('should create nexus config file', async () => {
      await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        description: 'Test description',
        initGit: false,
      });
      
      const configPath = path.join(testDir, 'test-project', '.nexus', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);
      
      const config = await fs.readJson(configPath);
      expect(config.name).toBe('test-project');
      expect(config.description).toBe('Test description');
    });
    
    it('should initialize git repository', async () => {
      await initializer.initializeProject({
        name: 'test-project',
        path: testDir,
        initGit: true,
      });
      
      const gitDir = path.join(testDir, 'test-project', '.git');
      expect(await fs.pathExists(gitDir)).toBe(true);
    });
    
    it('should throw error if path exists as file', async () => {
      const filePath = path.join(testDir, 'existing-file');
      await fs.writeFile(filePath, 'test');
      
      await expect(
        initializer.initializeProject({
          name: 'existing-file',
          path: testDir,
        })
      ).rejects.toThrow('Path already exists as a file');
    });
  });
  ```

### Task 5 Completion Checklist
- [ ] ProjectInitializer.ts created
- [ ] Project IPC handlers created
- [ ] Directory structure creation works
- [ ] Nexus config creation works
- [ ] Git initialization works
- [ ] Unit tests written and passing
- [ ] TypeScript compiles without errors

**[TASK 5 COMPLETE]** <- Mark when done, proceed to Task 6

---

## Task 6: Implement Project Loading

### Objective
Create service to load and validate existing projects.

### Requirements

- [ ] Create ProjectLoader service:
  ```typescript
  // src/main/services/ProjectLoader.ts
  
  import * as fs from 'fs-extra';
  import * as path from 'path';
  
  export interface LoadedProject {
    id: string;
    name: string;
    path: string;
    description?: string;
    config: ProjectConfig;
    isNexusProject: boolean;
    hasGit: boolean;
  }
  
  export interface ProjectConfig {
    name: string;
    description?: string;
    version: string;
    created: string;
    nexusVersion: string;
    settings: {
      maxAgents: number;
      qaMaxIterations: number;
      taskMaxMinutes: number;
      checkpointIntervalSeconds: number;
    };
  }
  
  export class ProjectLoader {
    /**
     * Load an existing project from the given path
     */
    async loadProject(projectPath: string): Promise<LoadedProject> {
      // Validate path exists
      if (!(await fs.pathExists(projectPath))) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }
      
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) {
        throw new Error(`Project path is not a directory: ${projectPath}`);
      }
      
      // Check if it's a Nexus project
      const nexusConfigPath = path.join(projectPath, '.nexus', 'config.json');
      const isNexusProject = await fs.pathExists(nexusConfigPath);
      
      // Check for git
      const gitDir = path.join(projectPath, '.git');
      const hasGit = await fs.pathExists(gitDir);
      
      let config: ProjectConfig;
      
      if (isNexusProject) {
        // Load existing Nexus config
        config = await fs.readJson(nexusConfigPath);
      } else {
        // Create default config for non-Nexus project
        config = this.createDefaultConfig(path.basename(projectPath));
        
        // Optionally initialize Nexus structure
        await this.initializeNexusStructure(projectPath, config);
      }
      
      return {
        id: this.generateProjectId(projectPath),
        name: config.name,
        path: projectPath,
        description: config.description,
        config,
        isNexusProject,
        hasGit,
      };
    }
    
    /**
     * Validate if a path is a valid project directory
     */
    async validateProjectPath(projectPath: string): Promise<boolean> {
      try {
        if (!(await fs.pathExists(projectPath))) {
          return false;
        }
        
        const stat = await fs.stat(projectPath);
        return stat.isDirectory();
      } catch {
        return false;
      }
    }
    
    /**
     * Check if path contains a Nexus project
     */
    async isNexusProject(projectPath: string): Promise<boolean> {
      const configPath = path.join(projectPath, '.nexus', 'config.json');
      return fs.pathExists(configPath);
    }
    
    private createDefaultConfig(name: string): ProjectConfig {
      return {
        name,
        version: '1.0.0',
        created: new Date().toISOString(),
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 4,
          qaMaxIterations: 50,
          taskMaxMinutes: 30,
          checkpointIntervalSeconds: 7200,
        },
      };
    }
    
    private async initializeNexusStructure(projectPath: string, config: ProjectConfig): Promise<void> {
      const nexusDir = path.join(projectPath, '.nexus');
      
      // Create .nexus directory structure
      await fs.ensureDir(nexusDir);
      await fs.ensureDir(path.join(nexusDir, 'checkpoints'));
      await fs.ensureDir(path.join(nexusDir, 'worktrees'));
      
      // Write config
      await fs.writeJson(path.join(nexusDir, 'config.json'), config, { spaces: 2 });
      
      // Create STATE.md
      const stateContent = `# Project State

## Current Phase
loaded

## Status
ready

## Last Updated
${new Date().toISOString()}
`;
      await fs.writeFile(path.join(nexusDir, 'STATE.md'), stateContent);
      
      console.log(`[ProjectLoader] Initialized Nexus structure for existing project`);
    }
    
    private generateProjectId(projectPath: string): string {
      // Generate consistent ID from path
      const hash = projectPath.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return `proj_${Math.abs(hash).toString(36)}`;
    }
  }
  
  export const projectLoader = new ProjectLoader();
  ```

- [ ] Update preload script with project API:
  ```typescript
  // Add to preload script
  
  project: {
    initialize: (options: {
      name: string;
      path: string;
      description?: string;
      initGit?: boolean;
    }) => ipcRenderer.invoke('project:initialize', options),
    
    load: (projectPath: string) => ipcRenderer.invoke('project:load', projectPath),
    
    validate: (projectPath: string) => ipcRenderer.invoke('project:validate', projectPath),
  },
  ```

- [ ] Write unit tests:
  ```typescript
  // tests/unit/main/ProjectLoader.test.ts
  
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';
  import * as fs from 'fs-extra';
  import * as path from 'path';
  import * as os from 'os';
  import { ProjectLoader } from '../../../src/main/services/ProjectLoader';
  
  describe('ProjectLoader', () => {
    let loader: ProjectLoader;
    let testDir: string;
    
    beforeEach(async () => {
      loader = new ProjectLoader();
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-test-'));
    });
    
    afterEach(async () => {
      await fs.remove(testDir);
    });
    
    it('should load existing Nexus project', async () => {
      // Create a Nexus project structure
      const projectPath = path.join(testDir, 'my-project');
      await fs.ensureDir(path.join(projectPath, '.nexus'));
      await fs.writeJson(path.join(projectPath, '.nexus', 'config.json'), {
        name: 'my-project',
        version: '1.0.0',
        created: new Date().toISOString(),
        nexusVersion: '1.0.0',
        settings: {
          maxAgents: 4,
          qaMaxIterations: 50,
          taskMaxMinutes: 30,
          checkpointIntervalSeconds: 7200,
        },
      });
      
      const result = await loader.loadProject(projectPath);
      
      expect(result.name).toBe('my-project');
      expect(result.isNexusProject).toBe(true);
    });
    
    it('should initialize Nexus structure for non-Nexus project', async () => {
      // Create a regular directory
      const projectPath = path.join(testDir, 'regular-project');
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'README.md'), '# My Project');
      
      const result = await loader.loadProject(projectPath);
      
      expect(result.isNexusProject).toBe(false);
      expect(await fs.pathExists(path.join(projectPath, '.nexus', 'config.json'))).toBe(true);
    });
    
    it('should throw error for non-existent path', async () => {
      await expect(
        loader.loadProject('/non/existent/path')
      ).rejects.toThrow('Project path does not exist');
    });
    
    it('should validate project paths correctly', async () => {
      const validPath = path.join(testDir, 'valid');
      await fs.ensureDir(validPath);
      
      expect(await loader.validateProjectPath(validPath)).toBe(true);
      expect(await loader.validateProjectPath('/non/existent')).toBe(false);
    });
  });
  ```

### Task 6 Completion Checklist
- [ ] ProjectLoader.ts created
- [ ] Preload script updated with project API
- [ ] Project loading works for Nexus projects
- [ ] Project loading works for regular directories
- [ ] Validation functions work correctly
- [ ] Unit tests written and passing
- [ ] TypeScript compiles without errors

**[TASK 6 COMPLETE]** <- Mark when done, proceed to Task 7

---

## Task 7: Integrate with UI Components

### Objective
Update UI components to use the new infrastructure.

### Requirements

- [ ] Find and update Welcome/Home page:
  ```bash
  # First find the relevant files
  find src/renderer -name "*.tsx" | xargs grep -l "Genesis\|Evolution\|Welcome\|Home" | head -10
  ```

- [ ] Create or update ProjectSelector component:
  ```typescript
  // src/renderer/src/components/ProjectSelector.tsx
  
  import React, { useState } from 'react';
  import { Button } from './ui/button';
  import { Input } from './ui/input';
  import { FolderOpen, Plus } from 'lucide-react';
  
  interface ProjectSelectorProps {
    mode: 'genesis' | 'evolution';
    onProjectSelected: (projectPath: string, projectName?: string) => void;
    onCancel: () => void;
  }
  
  export function ProjectSelector({ mode, onProjectSelected, onCancel }: ProjectSelectorProps) {
    const [projectName, setProjectName] = useState('');
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSelectFolder = async () => {
      try {
        const result = await window.electron.dialog.openDirectory({
          title: mode === 'genesis' 
            ? 'Select Location for New Project' 
            : 'Select Existing Project',
          buttonLabel: 'Select',
        });
        
        if (!result.canceled && result.path) {
          setSelectedPath(result.path);
          setError(null);
          
          // For evolution mode, validate it's a project directory
          if (mode === 'evolution') {
            const validation = await window.electron.project.validate(result.path);
            if (!validation.valid) {
              setError('Selected directory is not a valid project');
              return;
            }
          }
        }
      } catch (err) {
        setError('Failed to open folder dialog');
        console.error(err);
      }
    };
    
    const handleConfirm = async () => {
      if (!selectedPath) {
        setError('Please select a folder');
        return;
      }
      
      if (mode === 'genesis' && !projectName.trim()) {
        setError('Please enter a project name');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (mode === 'genesis') {
          // Initialize new project
          const result = await window.electron.project.initialize({
            name: projectName.trim(),
            path: selectedPath,
            initGit: true,
          });
          
          if (!result.success) {
            setError(result.error || 'Failed to create project');
            return;
          }
          
          onProjectSelected(result.project.path, result.project.name);
        } else {
          // Load existing project
          const result = await window.electron.project.load(selectedPath);
          
          if (!result.success) {
            setError(result.error || 'Failed to load project');
            return;
          }
          
          onProjectSelected(result.project.path, result.project.name);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    return (
      <div className="flex flex-col gap-4 p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold">
          {mode === 'genesis' ? 'Create New Project' : 'Open Existing Project'}
        </h2>
        
        {mode === 'genesis' && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Project Name</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-awesome-app"
              disabled={isLoading}
            />
          </div>
        )}
        
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            {mode === 'genesis' ? 'Location' : 'Project Folder'}
          </label>
          <div className="flex gap-2">
            <Input
              value={selectedPath || ''}
              readOnly
              placeholder="Select a folder..."
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleSelectFolder}
              disabled={isLoading}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !selectedPath}>
            {isLoading ? 'Loading...' : mode === 'genesis' ? 'Create Project' : 'Open Project'}
          </Button>
        </div>
      </div>
    );
  }
  ```

- [ ] Update Welcome/Home page to use ProjectSelector:
  ```typescript
  // Example integration in WelcomePage.tsx or similar
  
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'genesis' | 'evolution'>('genesis');
  
  const handleGenesisClick = () => {
    setSelectorMode('genesis');
    setShowProjectSelector(true);
  };
  
  const handleEvolutionClick = () => {
    setSelectorMode('evolution');
    setShowProjectSelector(true);
  };
  
  const handleProjectSelected = (projectPath: string, projectName?: string) => {
    // Store project info in state/store
    // Navigate to appropriate page
    if (selectorMode === 'genesis') {
      navigate('/interview');
    } else {
      navigate('/kanban');
    }
  };
  ```

- [ ] Verify UI integration works:
  ```bash
  # Build and run the app
  npm run build
  npm run dev:electron
  
  # Manual test:
  # 1. Click Genesis mode
  # 2. Verify folder dialog opens
  # 3. Select a folder
  # 4. Enter project name
  # 5. Click Create
  # 6. Verify project is created and interview starts
  
  # Repeat for Evolution mode
  ```

### Task 7 Completion Checklist
- [ ] ProjectSelector component created
- [ ] Welcome/Home page updated
- [ ] Genesis mode uses ProjectSelector
- [ ] Evolution mode uses ProjectSelector
- [ ] Folder dialog opens correctly
- [ ] Project creation works
- [ ] Project loading works
- [ ] Navigation after selection works

**[TASK 7 COMPLETE]** <- Mark when done, proceed to Phase C

---

# =============================================================================
# PHASE C: ADDITIONAL INFRASTRUCTURE (Tasks 8-9)
# =============================================================================

## Task 8: Implement Recent Projects

### Objective
Store and display recently opened projects for quick access.

### Requirements

- [ ] Create RecentProjects service:
  ```typescript
  // src/main/services/RecentProjects.ts
  
  import * as fs from 'fs-extra';
  import * as path from 'path';
  import { app } from 'electron';
  
  interface RecentProject {
    path: string;
    name: string;
    lastOpened: string;
  }
  
  const MAX_RECENT = 10;
  
  export class RecentProjectsService {
    private configPath: string;
    
    constructor() {
      this.configPath = path.join(app.getPath('userData'), 'recent-projects.json');
    }
    
    async getRecent(): Promise<RecentProject[]> {
      try {
        if (await fs.pathExists(this.configPath)) {
          return await fs.readJson(this.configPath);
        }
      } catch (error) {
        console.error('[RecentProjects] Failed to load:', error);
      }
      return [];
    }
    
    async addRecent(project: { path: string; name: string }): Promise<void> {
      const recent = await this.getRecent();
      
      // Remove if already exists
      const filtered = recent.filter(p => p.path !== project.path);
      
      // Add to front
      filtered.unshift({
        path: project.path,
        name: project.name,
        lastOpened: new Date().toISOString(),
      });
      
      // Keep only MAX_RECENT
      const trimmed = filtered.slice(0, MAX_RECENT);
      
      await fs.writeJson(this.configPath, trimmed, { spaces: 2 });
    }
    
    async removeRecent(projectPath: string): Promise<void> {
      const recent = await this.getRecent();
      const filtered = recent.filter(p => p.path !== projectPath);
      await fs.writeJson(this.configPath, filtered, { spaces: 2 });
    }
    
    async clearRecent(): Promise<void> {
      await fs.writeJson(this.configPath, [], { spaces: 2 });
    }
  }
  
  export const recentProjects = new RecentProjectsService();
  ```

- [ ] Add IPC handlers for recent projects:
  ```typescript
  // Add to src/main/ipc/projectHandlers.ts
  
  ipcMain.handle('project:getRecent', async () => {
    return recentProjects.getRecent();
  });
  
  ipcMain.handle('project:addRecent', async (_event, project: { path: string; name: string }) => {
    await recentProjects.addRecent(project);
  });
  
  ipcMain.handle('project:removeRecent', async (_event, projectPath: string) => {
    await recentProjects.removeRecent(projectPath);
  });
  ```

- [ ] Update preload script:
  ```typescript
  // Add to preload
  recentProjects: {
    get: () => ipcRenderer.invoke('project:getRecent'),
    add: (project: { path: string; name: string }) => ipcRenderer.invoke('project:addRecent', project),
    remove: (projectPath: string) => ipcRenderer.invoke('project:removeRecent', projectPath),
  },
  ```

- [ ] Add recent projects to UI:
  ```typescript
  // RecentProjectsList.tsx component
  
  export function RecentProjectsList({ onSelect }: { onSelect: (path: string) => void }) {
    const [projects, setProjects] = useState<Array<{ path: string; name: string; lastOpened: string }>>([]);
    
    useEffect(() => {
      window.electron.recentProjects.get().then(setProjects);
    }, []);
    
    if (projects.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Recent Projects</h3>
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.path}
              onClick={() => onSelect(project.path)}
              className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">{project.name}</div>
                <div className="text-xs text-gray-400 truncate">{project.path}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  ```

### Task 8 Completion Checklist
- [ ] RecentProjectsService created
- [ ] IPC handlers added
- [ ] Preload script updated
- [ ] UI component created
- [ ] Recent projects display on welcome page
- [ ] Clicking recent project loads it

**[TASK 8 COMPLETE]** <- Mark when done, proceed to Task 9

---

## Task 9: Register All Handlers & Final Integration

### Objective
Ensure all handlers are registered and the system works end-to-end.

### Requirements

- [ ] Update main process initialization:
  ```typescript
  // src/main/index.ts
  
  import { app, BrowserWindow } from 'electron';
  import { registerDialogHandlers } from './ipc/dialogHandlers';
  import { registerProjectHandlers } from './ipc/projectHandlers';
  // ... other imports
  
  async function createWindow() {
    // ... window creation code
  }
  
  app.whenReady().then(async () => {
    // Register all IPC handlers BEFORE creating window
    registerDialogHandlers();
    registerProjectHandlers();
    // ... register other handlers
    
    await createWindow();
    
    console.log('[Main] All IPC handlers registered');
  });
  ```

- [ ] Verify complete preload script:
  ```typescript
  // Ensure preload.ts has all APIs exposed
  contextBridge.exposeInMainWorld('electron', {
    // Existing APIs...
    ipcRenderer: {
      invoke: ipcRenderer.invoke.bind(ipcRenderer),
      on: ipcRenderer.on.bind(ipcRenderer),
      // ...
    },
    
    // New infrastructure APIs
    dialog: {
      openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
      openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
      saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    },
    
    project: {
      initialize: (options) => ipcRenderer.invoke('project:initialize', options),
      load: (path) => ipcRenderer.invoke('project:load', path),
      validate: (path) => ipcRenderer.invoke('project:validate', path),
    },
    
    recentProjects: {
      get: () => ipcRenderer.invoke('project:getRecent'),
      add: (project) => ipcRenderer.invoke('project:addRecent', project),
      remove: (path) => ipcRenderer.invoke('project:removeRecent', path),
    },
  });
  ```

- [ ] Run all tests:
  ```bash
  npm test
  ```

- [ ] Build and verify:
  ```bash
  npm run build
  npm run dev:electron
  ```

- [ ] Manual E2E test:
  ```
  1. Start application
  2. Click "Genesis Mode"
  3. Verify folder dialog opens
  4. Select a directory
  5. Enter project name "test-project"
  6. Click "Create"
  7. Verify project created at selected location
  8. Verify interview page loads
  9. Verify .nexus folder exists in project
  
  10. Restart application
  11. Verify "test-project" appears in recent projects
  12. Click on recent project
  13. Verify project loads
  
  14. Click "Evolution Mode"
  15. Verify folder dialog opens
  16. Select an existing project
  17. Verify Kanban page loads
  ```

### Task 9 Completion Checklist
- [ ] All handlers registered in main process
- [ ] Preload script complete
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Genesis flow works end-to-end
- [ ] Evolution flow works end-to-end
- [ ] Recent projects work

**[TASK 9 COMPLETE]** <- Mark when done, proceed to Task 10

---

# =============================================================================
# PHASE D: QUALITY & VERIFICATION (Tasks 10-11)
# =============================================================================

## Task 10: Lint & Quality Verification

### Objective
Ensure all new code passes quality checks.

### Requirements

- [ ] Run lint with auto-fix:
  ```bash
  npm run lint -- --fix
  ```

- [ ] Fix remaining lint errors:
  - Fix `no-unused-vars` (prefix unused params with _)
  - Fix `restrict-template-expressions` (use String() or ??)
  - Fix any other errors

- [ ] Run full lint check:
  ```bash
  npm run lint
  ```
  Expected: 0 errors

- [ ] Run build:
  ```bash
  npm run build
  ```
  Expected: Success

- [ ] Run all tests:
  ```bash
  npm test
  ```
  Expected: All pass

### Task 10 Completion Checklist
- [ ] `npm run lint -- --fix` executed
- [ ] All remaining lint errors fixed
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All tests pass
- [ ] No regressions

**[TASK 10 COMPLETE]** <- Mark when done, proceed to Task 11

---

## Task 11: Documentation & Final Verification

### Objective
Document the new infrastructure and verify everything works.

### Requirements

- [ ] Create infrastructure documentation:
  ```bash
  cat > docs/INFRASTRUCTURE.md << 'EOF'
  # Nexus Infrastructure
  
  ## Overview
  
  This document describes the core infrastructure components that enable Nexus to function.
  
  ## Dialog System
  
  ### File: src/main/ipc/dialogHandlers.ts
  
  Provides native file dialogs for:
  - `dialog:openDirectory` - Select a folder
  - `dialog:openFile` - Select a file
  - `dialog:saveFile` - Save file dialog
  
  ### Usage from Renderer
  
  ```typescript
  const result = await window.electron.dialog.openDirectory({
    title: 'Select Project',
  });
  
  if (!result.canceled) {
    console.log('Selected:', result.path);
  }
  ```
  
  ## Project Management
  
  ### File: src/main/services/ProjectInitializer.ts
  
  Creates new projects with:
  - Directory structure (src/, tests/, .nexus/)
  - Configuration file (.nexus/config.json)
  - Git initialization
  - Initial commit
  
  ### File: src/main/services/ProjectLoader.ts
  
  Loads existing projects:
  - Validates project directory
  - Loads or creates .nexus configuration
  - Returns project metadata
  
  ### File: src/main/services/RecentProjects.ts
  
  Manages recent projects list:
  - Stores in app user data
  - Maximum 10 recent projects
  - Sorted by last opened
  
  ## IPC Handlers
  
  | Channel | Purpose |
  |---------|---------|
  | dialog:openDirectory | Open folder picker |
  | dialog:openFile | Open file picker |
  | dialog:saveFile | Open save dialog |
  | project:initialize | Create new project |
  | project:load | Load existing project |
  | project:validate | Validate project path |
  | project:getRecent | Get recent projects |
  | project:addRecent | Add to recent |
  | project:removeRecent | Remove from recent |
  
  EOF
  ```

- [ ] Final verification checklist:
  ```
  INFRASTRUCTURE VERIFICATION
  ===========================
  
  [ ] Dialog handlers registered
  [ ] Project handlers registered
  [ ] Preload exposes all APIs
  [ ] TypeScript types correct
  [ ] All tests pass
  [ ] Build succeeds
  [ ] Genesis mode works
  [ ] Evolution mode works
  [ ] Recent projects work
  [ ] Documentation created
  ```

- [ ] Commit changes:
  ```bash
  git add -A
  git commit -m "feat: Add critical infrastructure for project selection

  - Add Electron dialog IPC handlers for folder/file selection
  - Add ProjectInitializer service for creating new projects
  - Add ProjectLoader service for loading existing projects
  - Add RecentProjects service for quick access
  - Add ProjectSelector UI component
  - Update preload script with infrastructure APIs
  - Add comprehensive tests
  - Add infrastructure documentation

  This enables users to actually select project directories
  for both Genesis and Evolution modes."
  
  git push origin main
  ```

### Task 11 Completion Checklist
- [ ] Documentation created
- [ ] All verification checks pass
- [ ] Changes committed
- [ ] Changes pushed

**[TASK 11 COMPLETE]**

---

## Success Criteria

+============================================================================+
|                                                                            |
|  1. DIALOG SYSTEM WORKS                                                    |
|     - Folder picker opens and returns selected path                        |
|     - File picker opens and returns selected path                          |
|     - Save dialog opens and returns selected path                          |
|                                                                            |
|  2. PROJECT INITIALIZATION WORKS                                           |
|     - New project directory created                                        |
|     - .nexus/ configuration folder created                                 |
|     - Git repository initialized                                           |
|     - Initial commit made                                                  |
|                                                                            |
|  3. PROJECT LOADING WORKS                                                  |
|     - Existing Nexus projects load correctly                               |
|     - Non-Nexus directories get .nexus/ added                              |
|     - Invalid paths rejected with error                                    |
|                                                                            |
|  4. UI INTEGRATION WORKS                                                   |
|     - Genesis mode shows project selector                                  |
|     - Evolution mode shows project selector                                |
|     - Recent projects displayed                                            |
|     - Navigation works after selection                                     |
|                                                                            |
|  5. ALL TESTS PASS                                                         |
|     - New tests pass                                                       |
|     - Existing 2222+ tests still pass                                      |
|     - No regressions                                                       |
|                                                                            |
|  6. CODE QUALITY                                                           |
|     - Lint passes with 0 errors                                            |
|     - Build succeeds                                                       |
|     - TypeScript compiles                                                  |
|                                                                            |
+============================================================================+

---

## Recommended Settings

```
ralph run PROMPT-PHASE-21-INFRASTRUCTURE-AUDIT.md --max-iterations 60
```

---

## Task Completion Markers

**Phase A: Audit**
- [x] [TASK 1 COMPLETE] - Audit current state (2025-01-23: Created INFRASTRUCTURE_AUDIT.md)
- [x] [TASK 2 COMPLETE] - Review reference patterns (2025-01-23: Created REFERENCE_PATTERNS.md)
- [x] [TASK 3 COMPLETE] - Create implementation plan (2025-01-23: Created IMPLEMENTATION_PLAN.md)

**Phase B: Core Implementation**
- [x] [TASK 4 COMPLETE] - Dialog handlers (2025-01-23: Created dialogHandlers.ts, updated preload script, tests pass)
- [ ] [TASK 5 COMPLETE] - Project initialization
- [ ] [TASK 6 COMPLETE] - Project loading
- [ ] [TASK 7 COMPLETE] - UI integration

**Phase C: Additional Features**
- [ ] [TASK 8 COMPLETE] - Recent projects
- [ ] [TASK 9 COMPLETE] - Final integration

**Phase D: Quality**
- [ ] [TASK 10 COMPLETE] - Lint & quality
- [ ] [TASK 11 COMPLETE] - Documentation

**Final:**
- [ ] [PHASE 21 COMPLETE]

---

## Notes

- ASCII only in all output (no Unicode symbols)
- Do NOT break existing functionality
- All 2222+ existing tests must continue to pass
- Use existing patterns from the codebase
- Test each feature after implementation
- Refer to reference repository patterns in project knowledge files
- This is critical infrastructure - without it, Nexus is unusable