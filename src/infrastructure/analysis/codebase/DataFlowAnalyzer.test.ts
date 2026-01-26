/**
 * DataFlowAnalyzer Tests
 *
 * Tests for the data flow analyzer that generates DATA_FLOW.md documentation.
 *
 * @module infrastructure/analysis/codebase/DataFlowAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RepoMap, SymbolEntry, DependencyEdge, FileEntry } from '../types';
import { DataFlowAnalyzer } from './DataFlowAnalyzer';
import type { AnalyzerOptions } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    // Zustand store
    {
      id: 'src/stores/projectStore.ts#useProjectStore#5',
      name: 'useProjectStore',
      kind: 'function',
      file: 'src/stores/projectStore.ts',
      line: 5,
      endLine: 50,
      column: 0,
      signature: 'const useProjectStore = create<ProjectState>((set) => ({ ... }))',
      exported: true,
      references: 20,
      modifiers: ['export'],
      documentation: '/** Project state store */',
    },
    // Store property
    {
      id: 'src/stores/projectStore.ts#useProjectStore.projects#10',
      name: 'projects',
      kind: 'property',
      file: 'src/stores/projectStore.ts',
      line: 10,
      endLine: 10,
      column: 4,
      signature: 'projects: Project[]',
      exported: false,
      references: 5,
      modifiers: [],
      parentId: 'useProjectStore',
    },
    // Store action
    {
      id: 'src/stores/projectStore.ts#useProjectStore.setProjects#15',
      name: 'setProjects',
      kind: 'method',
      file: 'src/stores/projectStore.ts',
      line: 15,
      endLine: 18,
      column: 4,
      signature: 'setProjects: (projects: Project[]) => void',
      exported: false,
      references: 8,
      modifiers: [],
      parentId: 'useProjectStore',
    },
    // Another store action
    {
      id: 'src/stores/projectStore.ts#useProjectStore.addProject#20',
      name: 'addProject',
      kind: 'method',
      file: 'src/stores/projectStore.ts',
      line: 20,
      endLine: 25,
      column: 4,
      signature: 'addProject: (project: Project) => void',
      exported: false,
      references: 4,
      modifiers: [],
      parentId: 'useProjectStore',
    },
    // Database class
    {
      id: 'src/persistence/database/ProjectDB.ts#ProjectDB#5',
      name: 'ProjectDB',
      kind: 'class',
      file: 'src/persistence/database/ProjectDB.ts',
      line: 5,
      endLine: 100,
      column: 0,
      signature: 'class ProjectDB',
      exported: true,
      references: 10,
      modifiers: ['export'],
      documentation: '/** SQLite database for projects */',
    },
    // EventBus class
    {
      id: 'src/infrastructure/events/EventBus.ts#EventBus#10',
      name: 'EventBus',
      kind: 'class',
      file: 'src/infrastructure/events/EventBus.ts',
      line: 10,
      endLine: 80,
      column: 0,
      signature: 'class EventBus',
      exported: true,
      references: 15,
      modifiers: ['export'],
      documentation: '/** Central event bus for application events */',
    },
    // EventBus emit method
    {
      id: 'src/infrastructure/events/EventBus.ts#EventBus.emit#30',
      name: 'emit',
      kind: 'method',
      file: 'src/infrastructure/events/EventBus.ts',
      line: 30,
      endLine: 40,
      column: 2,
      signature: 'emit<T>(event: string, payload: T): void',
      exported: false,
      references: 12,
      modifiers: ['public'],
      parentId: 'EventBus',
    },
    // EventBus subscribe method
    {
      id: 'src/infrastructure/events/EventBus.ts#EventBus.subscribe#45',
      name: 'subscribe',
      kind: 'method',
      file: 'src/infrastructure/events/EventBus.ts',
      line: 45,
      endLine: 55,
      column: 2,
      signature: 'subscribe<T>(event: string, handler: (payload: T) => void): () => void',
      exported: false,
      references: 10,
      modifiers: ['public'],
      parentId: 'EventBus',
    },
    // Event type
    {
      id: 'src/types/events.ts#ProjectCreatedEvent#5',
      name: 'ProjectCreatedEvent',
      kind: 'type',
      file: 'src/types/events.ts',
      line: 5,
      endLine: 10,
      column: 0,
      signature: 'type ProjectCreatedEvent = { type: "project:created"; payload: Project }',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
    // Event handler
    {
      id: 'src/handlers/projectHandlers.ts#handleProjectCreated#10',
      name: 'handleProjectCreated',
      kind: 'function',
      file: 'src/handlers/projectHandlers.ts',
      line: 10,
      endLine: 30,
      column: 0,
      signature: 'function handleProjectCreated(event: ProjectCreatedEvent): void',
      exported: true,
      references: 3,
      modifiers: ['export'],
    },
    // Adapter
    {
      id: 'src/adapters/ProjectAdapter.ts#ProjectAdapter#5',
      name: 'ProjectAdapter',
      kind: 'class',
      file: 'src/adapters/ProjectAdapter.ts',
      line: 5,
      endLine: 50,
      column: 0,
      signature: 'class ProjectAdapter',
      exported: true,
      references: 8,
      modifiers: ['export'],
      documentation: '/** Adapts project data between formats */',
    },
    // Transform function
    {
      id: 'src/utils/transforms.ts#transformToDTO#5',
      name: 'transformToDTO',
      kind: 'function',
      file: 'src/utils/transforms.ts',
      line: 5,
      endLine: 20,
      column: 0,
      signature: 'function transformToDTO(project: ProjectEntity): ProjectDTO',
      exported: true,
      references: 6,
      modifiers: ['export'],
      documentation: '/** Transform entity to DTO */',
    },
    // Another transform function
    {
      id: 'src/utils/transforms.ts#parseProjectInput#25',
      name: 'parseProjectInput',
      kind: 'function',
      file: 'src/utils/transforms.ts',
      line: 25,
      endLine: 40,
      column: 0,
      signature: 'function parseProjectInput(input: string): ParsedProject',
      exported: true,
      references: 4,
      modifiers: ['export'],
    },
    // Memory cache
    {
      id: 'src/infrastructure/cache/ProjectCache.ts#ProjectCache#5',
      name: 'ProjectCache',
      kind: 'class',
      file: 'src/infrastructure/cache/ProjectCache.ts',
      line: 5,
      endLine: 60,
      column: 0,
      signature: 'class ProjectCache',
      exported: true,
      references: 7,
      modifiers: ['export'],
    },
    // IPC handler
    {
      id: 'src/main/ipc/handlers.ts#handleGetProject#10',
      name: 'handleGetProject',
      kind: 'function',
      file: 'src/main/ipc/handlers.ts',
      line: 10,
      endLine: 30,
      column: 0,
      signature: "ipcMain.handle('get-project', async (event, id) => { })",
      exported: true,
      references: 1,
      modifiers: ['export'],
    },
    // React component that uses store
    {
      id: 'src/ui/components/ProjectList.tsx#ProjectList#5',
      name: 'ProjectList',
      kind: 'function',
      file: 'src/ui/components/ProjectList.tsx',
      line: 5,
      endLine: 50,
      column: 0,
      signature: 'function ProjectList(): JSX.Element',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
    // Schema constant
    {
      id: 'src/persistence/database/schema.ts#projectsTable#5',
      name: 'projectsTable',
      kind: 'constant',
      file: 'src/persistence/database/schema.ts',
      line: 5,
      endLine: 20,
      column: 0,
      signature: 'const projectsTable = sqliteTable("projects", { ... })',
      exported: true,
      references: 3,
      modifiers: ['export'],
    },
  ];

  const files: FileEntry[] = [
    {
      path: '/project/src/stores/projectStore.ts',
      relativePath: 'src/stores/projectStore.ts',
      language: 'typescript',
      size: 1500,
      lastModified: new Date(),
      symbolCount: 4,
      lineCount: 50,
    },
    {
      path: '/project/src/persistence/database/ProjectDB.ts',
      relativePath: 'src/persistence/database/ProjectDB.ts',
      language: 'typescript',
      size: 2000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 100,
    },
    {
      path: '/project/src/persistence/database/schema.ts',
      relativePath: 'src/persistence/database/schema.ts',
      language: 'typescript',
      size: 800,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/infrastructure/events/EventBus.ts',
      relativePath: 'src/infrastructure/events/EventBus.ts',
      language: 'typescript',
      size: 1200,
      lastModified: new Date(),
      symbolCount: 3,
      lineCount: 80,
    },
    {
      path: '/project/src/types/events.ts',
      relativePath: 'src/types/events.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    {
      path: '/project/src/handlers/projectHandlers.ts',
      relativePath: 'src/handlers/projectHandlers.ts',
      language: 'typescript',
      size: 600,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/adapters/ProjectAdapter.ts',
      relativePath: 'src/adapters/ProjectAdapter.ts',
      language: 'typescript',
      size: 900,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 50,
    },
    {
      path: '/project/src/utils/transforms.ts',
      relativePath: 'src/utils/transforms.ts',
      language: 'typescript',
      size: 700,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 40,
    },
    {
      path: '/project/src/infrastructure/cache/ProjectCache.ts',
      relativePath: 'src/infrastructure/cache/ProjectCache.ts',
      language: 'typescript',
      size: 800,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 60,
    },
    {
      path: '/project/src/main/ipc/handlers.ts',
      relativePath: 'src/main/ipc/handlers.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/ui/components/ProjectList.tsx',
      relativePath: 'src/ui/components/ProjectList.tsx',
      language: 'typescript',
      size: 1000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 50,
    },
  ];

  const dependencies: DependencyEdge[] = [
    // Component uses store
    {
      from: 'src/ui/components/ProjectList.tsx',
      to: 'src/stores/projectStore.ts',
      type: 'import',
      symbols: ['useProjectStore'],
    },
    // Store file imports zustand
    {
      from: 'src/stores/projectStore.ts',
      to: 'zustand',
      type: 'import',
      symbols: ['create'],
    },
    // DB uses better-sqlite3
    {
      from: 'src/persistence/database/ProjectDB.ts',
      to: 'better-sqlite3',
      type: 'import',
      symbols: ['Database'],
    },
    // Handlers use event bus
    {
      from: 'src/handlers/projectHandlers.ts',
      to: 'src/infrastructure/events/EventBus.ts',
      type: 'import',
      symbols: ['EventBus'],
    },
    // IPC uses electron
    {
      from: 'src/main/ipc/handlers.ts',
      to: 'electron',
      type: 'import',
      symbols: ['ipcMain'],
    },
  ];

  return {
    projectPath: '/project',
    generatedAt: new Date(),
    files,
    symbols,
    dependencies,
    stats: {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown: { typescript: files.length, javascript: 0 },
      symbolBreakdown: {
        class: 4,
        interface: 0,
        function: 5,
        method: 4,
        property: 1,
        variable: 0,
        constant: 1,
        type: 1,
        enum: 0,
        enum_member: 0,
        namespace: 0,
        module: 0,
      },
      largestFiles: [],
      mostReferencedSymbols: [],
      mostConnectedFiles: [],
      generationTime: 100,
    },
  };
}

function createOptions(): AnalyzerOptions {
  return {
    projectPath: '/project',
    generateDiagrams: true,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DataFlowAnalyzer', () => {
  let analyzer: DataFlowAnalyzer;
  let repoMap: RepoMap;
  let options: AnalyzerOptions;

  beforeEach(() => {
    repoMap = createMockRepoMap();
    options = createOptions();
    analyzer = new DataFlowAnalyzer(repoMap, options);
  });

  describe('analyze', () => {
    it('should return complete DataFlowDoc', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toHaveProperty('overview');
      expect(doc).toHaveProperty('stateManagement');
      expect(doc).toHaveProperty('dataStores');
      expect(doc).toHaveProperty('eventFlows');
      expect(doc).toHaveProperty('dataTransformations');
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(50);
    });
  });

  describe('state management analysis', () => {
    it('should detect Zustand as state management approach', async () => {
      const doc = await analyzer.analyze();

      expect(doc.stateManagement.approach).toBe('Zustand stores');
    });

    it('should find Zustand stores', async () => {
      const doc = await analyzer.analyze();

      expect(doc.stateManagement.stores.length).toBeGreaterThan(0);
    });

    it('should include store details', async () => {
      const doc = await analyzer.analyze();

      const projectStore = doc.stateManagement.stores.find(
        s => s.name === 'useProjectStore'
      );
      expect(projectStore).toBeDefined();
      expect(projectStore?.file).toBe('src/stores/projectStore.ts');
    });

    it('should extract store state properties', async () => {
      const doc = await analyzer.analyze();

      const projectStore = doc.stateManagement.stores.find(
        s => s.name === 'useProjectStore'
      );
      expect(projectStore?.state).toBeDefined();
      expect(projectStore?.state.some(s => s === 'projects')).toBe(true);
    });

    it('should extract store actions', async () => {
      const doc = await analyzer.analyze();

      const projectStore = doc.stateManagement.stores.find(
        s => s.name === 'useProjectStore'
      );
      expect(projectStore?.actions).toBeDefined();
      expect(projectStore?.actions.some(a => a === 'setProjects')).toBe(true);
      expect(projectStore?.actions.some(a => a === 'addProject')).toBe(true);
    });

    it('should find store subscribers', async () => {
      const doc = await analyzer.analyze();

      const projectStore = doc.stateManagement.stores.find(
        s => s.name === 'useProjectStore'
      );
      expect(projectStore?.subscribers).toBeDefined();
      // ProjectList.tsx imports the store
      expect(projectStore?.subscribers.some(s => s.includes('ProjectList'))).toBe(true);
    });

    it('should include persistence information', async () => {
      const doc = await analyzer.analyze();

      expect(doc.stateManagement.persistence).toBeTruthy();
    });
  });

  describe('data stores analysis', () => {
    it('should detect SQLite data store', async () => {
      const doc = await analyzer.analyze();

      const sqliteStore = doc.dataStores.find(s => s.type === 'sqlite');
      expect(sqliteStore).toBeDefined();
    });

    it('should detect memory cache', async () => {
      const doc = await analyzer.analyze();

      const memoryStore = doc.dataStores.find(
        s => s.type === 'memory' && s.name.includes('Cache')
      );
      expect(memoryStore).toBeDefined();
    });

    it('should include store location', async () => {
      const doc = await analyzer.analyze();

      for (const store of doc.dataStores) {
        expect(store.location).toBeTruthy();
      }
    });

    it('should detect database schema', async () => {
      const doc = await analyzer.analyze();

      const sqliteStore = doc.dataStores.find(s => s.type === 'sqlite');
      if (sqliteStore?.schema) {
        expect(sqliteStore.schema).toContain('projectsTable');
      }
    });
  });

  describe('event flows analysis', () => {
    it('should detect EventBus', async () => {
      const doc = await analyzer.analyze();

      const eventBusFlow = doc.eventFlows.find(f => f.name === 'EventBus');
      expect(eventBusFlow).toBeDefined();
    });

    it('should detect event types', async () => {
      const doc = await analyzer.analyze();

      const projectCreatedFlow = doc.eventFlows.find(
        f => f.name === 'ProjectCreatedEvent'
      );
      expect(projectCreatedFlow).toBeDefined();
    });

    it('should find event handlers', async () => {
      const doc = await analyzer.analyze();

      const eventFlow = doc.eventFlows.find(
        f => f.name === 'ProjectCreatedEvent' || f.handlers.length > 0
      );
      if (eventFlow) {
        expect(eventFlow.handlers).toBeDefined();
        // Should find handleProjectCreated
        expect(eventFlow.handlers.some(h => h.includes('handleProject'))).toBe(true);
      }
    });

    it('should detect IPC communication', async () => {
      const doc = await analyzer.analyze();

      const ipcFlow = doc.eventFlows.find(
        f => f.name.includes('IPC') || f.trigger.includes('IPC')
      );
      expect(ipcFlow).toBeDefined();
    });

    it('should include flow diagrams', async () => {
      const doc = await analyzer.analyze();

      for (const flow of doc.eventFlows) {
        expect(flow.flow).toBeTruthy();
      }
    });
  });

  describe('data transformations analysis', () => {
    it('should detect adapters', async () => {
      const doc = await analyzer.analyze();

      const adapterTransform = doc.dataTransformations.find(
        t => t.name.includes('Adapter')
      );
      expect(adapterTransform).toBeDefined();
    });

    it('should detect transform functions', async () => {
      const doc = await analyzer.analyze();

      const transformToDTO = doc.dataTransformations.find(
        t => t.name === 'transformToDTO'
      );
      expect(transformToDTO).toBeDefined();
    });

    it('should detect parse functions', async () => {
      const doc = await analyzer.analyze();

      const parseFunc = doc.dataTransformations.find(
        t => t.name.includes('parse')
      );
      expect(parseFunc).toBeDefined();
    });

    it('should include input type', async () => {
      const doc = await analyzer.analyze();

      const transformToDTO = doc.dataTransformations.find(
        t => t.name === 'transformToDTO'
      );
      expect(transformToDTO?.input).toBeTruthy();
      expect(transformToDTO?.input).toBe('ProjectEntity');
    });

    it('should include output type', async () => {
      const doc = await analyzer.analyze();

      const transformToDTO = doc.dataTransformations.find(
        t => t.name === 'transformToDTO'
      );
      expect(transformToDTO?.output).toBeTruthy();
      expect(transformToDTO?.output).toBe('ProjectDTO');
    });
  });

  describe('toMarkdown', () => {
    it('should generate valid markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Data Flow Documentation');
      expect(markdown).toContain('## Overview');
    });

    it('should include state management section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## State Management');
      expect(markdown).toContain('**Approach:**');
    });

    it('should include stores subsection', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('### Stores');
    });

    it('should include data stores section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Data Stores');
      expect(markdown).toContain('| Store | Type | Location |');
    });

    it('should include event flows section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Event Flows');
    });

    it('should include data transformations section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Data Transformations');
      expect(markdown).toContain('| Transformation | Input | Output | Location |');
    });

    it('should include generation timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });

    it('should include Mermaid diagrams when enabled', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      // If there are event flows with diagrams
      if (doc.eventFlows.length > 0) {
        expect(markdown).toContain('```mermaid');
      }
    });
  });

  describe('without diagrams', () => {
    it('should skip Mermaid diagrams when disabled', async () => {
      const noDiagramOptions = { ...options, generateDiagrams: false };
      const noDiagramAnalyzer = new DataFlowAnalyzer(repoMap, noDiagramOptions);

      const doc = await noDiagramAnalyzer.analyze();
      const markdown = noDiagramAnalyzer.toMarkdown(doc);

      expect(markdown).not.toContain('```mermaid');
    });
  });
});
