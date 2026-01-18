/**
 * ArchitectureAnalyzer Tests
 *
 * Tests for the architecture analyzer that generates ARCHITECTURE.md documentation.
 *
 * @module infrastructure/analysis/codebase/ArchitectureAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RepoMap, SymbolEntry, DependencyEdge, FileEntry } from '../types';
import { ArchitectureAnalyzer } from './ArchitectureAnalyzer';
import type { AnalyzerOptions } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    // UI Layer
    {
      id: 'src/ui/components/Button.tsx#Button#5',
      name: 'Button',
      kind: 'function',
      file: 'src/ui/components/Button.tsx',
      line: 5,
      endLine: 20,
      column: 0,
      signature: 'function Button(props: ButtonProps): JSX.Element',
      exported: true,
      references: 25,
      modifiers: ['export'],
    },
    // Orchestration Layer
    {
      id: 'src/orchestration/AgentOrchestrator.ts#AgentOrchestrator#10',
      name: 'AgentOrchestrator',
      kind: 'class',
      file: 'src/orchestration/AgentOrchestrator.ts',
      line: 10,
      endLine: 100,
      column: 0,
      signature: 'class AgentOrchestrator',
      exported: true,
      references: 15,
      modifiers: ['export'],
      documentation: '/** Orchestrates agent workflows */',
    },
    // Infrastructure Layer
    {
      id: 'src/infrastructure/analysis/RepoMapGenerator.ts#RepoMapGenerator#15',
      name: 'RepoMapGenerator',
      kind: 'class',
      file: 'src/infrastructure/analysis/RepoMapGenerator.ts',
      line: 15,
      endLine: 200,
      column: 0,
      signature: 'class RepoMapGenerator',
      exported: true,
      references: 10,
      modifiers: ['export'],
    },
    // Index file export
    {
      id: 'src/infrastructure/analysis/index.ts#generateRepoMap#20',
      name: 'generateRepoMap',
      kind: 'function',
      file: 'src/infrastructure/analysis/index.ts',
      line: 20,
      endLine: 25,
      column: 0,
      signature: 'function generateRepoMap(path: string): Promise<RepoMap>',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    // Persistence Layer
    {
      id: 'src/persistence/database/ProjectDB.ts#ProjectDB#5',
      name: 'ProjectDB',
      kind: 'class',
      file: 'src/persistence/database/ProjectDB.ts',
      line: 5,
      endLine: 80,
      column: 0,
      signature: 'class ProjectDB',
      exported: true,
      references: 12,
      modifiers: ['export'],
    },
    // Main entry
    {
      id: 'src/main.ts#main#1',
      name: 'main',
      kind: 'function',
      file: 'src/main.ts',
      line: 1,
      endLine: 30,
      column: 0,
      signature: 'function main(): void',
      exported: true,
      references: 1,
      modifiers: ['export'],
    },
    // Interface
    {
      id: 'src/infrastructure/types.ts#IAnalyzer#10',
      name: 'IAnalyzer',
      kind: 'interface',
      file: 'src/infrastructure/types.ts',
      line: 10,
      endLine: 20,
      column: 0,
      signature: 'interface IAnalyzer',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
  ];

  const files: FileEntry[] = [
    // UI Layer files
    {
      path: '/project/src/ui/components/Button.tsx',
      relativePath: 'src/ui/components/Button.tsx',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    {
      path: '/project/src/ui/index.ts',
      relativePath: 'src/ui/index.ts',
      language: 'typescript',
      size: 100,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 10,
    },
    // Orchestration Layer files
    {
      path: '/project/src/orchestration/AgentOrchestrator.ts',
      relativePath: 'src/orchestration/AgentOrchestrator.ts',
      language: 'typescript',
      size: 2000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 100,
    },
    // Infrastructure Layer files
    {
      path: '/project/src/infrastructure/analysis/RepoMapGenerator.ts',
      relativePath: 'src/infrastructure/analysis/RepoMapGenerator.ts',
      language: 'typescript',
      size: 3000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 200,
    },
    {
      path: '/project/src/infrastructure/analysis/index.ts',
      relativePath: 'src/infrastructure/analysis/index.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 25,
    },
    {
      path: '/project/src/infrastructure/types.ts',
      relativePath: 'src/infrastructure/types.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    // Persistence Layer files
    {
      path: '/project/src/persistence/database/ProjectDB.ts',
      relativePath: 'src/persistence/database/ProjectDB.ts',
      language: 'typescript',
      size: 1500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 80,
    },
    // Entry points
    {
      path: '/project/src/main.ts',
      relativePath: 'src/main.ts',
      language: 'typescript',
      size: 600,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/renderer.ts',
      relativePath: 'src/renderer.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 20,
    },
    {
      path: '/project/src/preload.ts',
      relativePath: 'src/preload.ts',
      language: 'typescript',
      size: 300,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 15,
    },
  ];

  const dependencies: DependencyEdge[] = [
    {
      from: 'src/orchestration/AgentOrchestrator.ts',
      to: 'src/infrastructure/analysis/index.ts',
      type: 'import',
      symbols: ['generateRepoMap'],
    },
    {
      from: 'src/orchestration/AgentOrchestrator.ts',
      to: 'src/persistence/database/ProjectDB.ts',
      type: 'import',
      symbols: ['ProjectDB'],
    },
    {
      from: 'src/ui/components/Button.tsx',
      to: 'src/infrastructure/types.ts',
      type: 'type_import',
      symbols: ['ButtonProps'],
    },
    {
      from: 'src/main.ts',
      to: 'src/orchestration/AgentOrchestrator.ts',
      type: 'import',
      symbols: ['AgentOrchestrator'],
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
      languageBreakdown: { typescript: 10, javascript: 0 },
      symbolBreakdown: {
        class: 3,
        interface: 1,
        function: 3,
        method: 0,
        property: 0,
        variable: 0,
        constant: 0,
        type: 0,
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

describe('ArchitectureAnalyzer', () => {
  let analyzer: ArchitectureAnalyzer;
  let repoMap: RepoMap;
  let options: AnalyzerOptions;

  beforeEach(() => {
    repoMap = createMockRepoMap();
    options = createOptions();
    analyzer = new ArchitectureAnalyzer(repoMap, options);
  });

  describe('analyze', () => {
    it('should return complete ArchitectureDoc', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toHaveProperty('overview');
      expect(doc).toHaveProperty('layers');
      expect(doc).toHaveProperty('keyComponents');
      expect(doc).toHaveProperty('entryPoints');
      expect(doc).toHaveProperty('designDecisions');
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(50);
    });
  });

  describe('layer detection', () => {
    it('should detect layers based on directory structure', async () => {
      const doc = await analyzer.analyze();

      expect(doc.layers.length).toBeGreaterThan(0);
    });

    it('should detect UI layer', async () => {
      const doc = await analyzer.analyze();

      const uiLayer = doc.layers.find(l => l.name === 'UI Layer');
      expect(uiLayer).toBeDefined();
      expect(uiLayer?.directories.some(d => d.includes('ui'))).toBe(true);
    });

    it('should detect Orchestration layer', async () => {
      const doc = await analyzer.analyze();

      const orchLayer = doc.layers.find(l => l.name === 'Orchestration Layer');
      expect(orchLayer).toBeDefined();
    });

    it('should detect Infrastructure layer', async () => {
      const doc = await analyzer.analyze();

      const infraLayer = doc.layers.find(l => l.name === 'Infrastructure Layer');
      expect(infraLayer).toBeDefined();
    });

    it('should detect Persistence layer', async () => {
      const doc = await analyzer.analyze();

      const persistLayer = doc.layers.find(l => l.name === 'Persistence Layer');
      expect(persistLayer).toBeDefined();
    });

    it('should include key files for each layer', async () => {
      const doc = await analyzer.analyze();

      for (const layer of doc.layers) {
        expect(layer.keyFiles).toBeDefined();
        expect(Array.isArray(layer.keyFiles)).toBe(true);
      }
    });

    it('should sort layers by number', async () => {
      const doc = await analyzer.analyze();

      for (let i = 1; i < doc.layers.length; i++) {
        expect(doc.layers[i].number).toBeGreaterThanOrEqual(doc.layers[i - 1].number);
      }
    });
  });

  describe('component identification', () => {
    it('should identify key components', async () => {
      const doc = await analyzer.analyze();

      expect(doc.keyComponents.length).toBeGreaterThan(0);
    });

    it('should include highly referenced components', async () => {
      const doc = await analyzer.analyze();

      const componentNames = doc.keyComponents.map(c => c.name);
      expect(componentNames).toContain('Button'); // 25 refs
      expect(componentNames).toContain('AgentOrchestrator'); // 15 refs
    });

    it('should include purpose for each component', async () => {
      const doc = await analyzer.analyze();

      for (const comp of doc.keyComponents) {
        expect(comp.purpose).toBeTruthy();
      }
    });

    it('should include file path for each component', async () => {
      const doc = await analyzer.analyze();

      for (const comp of doc.keyComponents) {
        expect(comp.file).toBeTruthy();
        expect(comp.file).toContain('src/');
      }
    });
  });

  describe('entry point detection', () => {
    it('should detect main entry point', async () => {
      const doc = await analyzer.analyze();

      const mainEntry = doc.entryPoints.find(e => e.file.includes('main.ts'));
      expect(mainEntry).toBeDefined();
      expect(mainEntry?.type).toBe('main');
    });

    it('should detect renderer entry point', async () => {
      const doc = await analyzer.analyze();

      const rendererEntry = doc.entryPoints.find(e => e.file.includes('renderer.ts'));
      expect(rendererEntry).toBeDefined();
      expect(rendererEntry?.type).toBe('renderer');
    });

    it('should detect preload entry point', async () => {
      const doc = await analyzer.analyze();

      const preloadEntry = doc.entryPoints.find(e => e.file.includes('preload.ts'));
      expect(preloadEntry).toBeDefined();
      expect(preloadEntry?.type).toBe('preload');
    });

    it('should include description for each entry point', async () => {
      const doc = await analyzer.analyze();

      for (const entry of doc.entryPoints) {
        expect(entry.description).toBeTruthy();
      }
    });
  });

  describe('design decision inference', () => {
    it('should infer design decisions', async () => {
      const doc = await analyzer.analyze();

      // Should infer TypeScript since all files are .ts
      expect(doc.designDecisions.length).toBeGreaterThan(0);
    });

    it('should include rationale for each decision', async () => {
      const doc = await analyzer.analyze();

      for (const decision of doc.designDecisions) {
        expect(decision.rationale).toBeTruthy();
      }
    });

    it('should include alternatives for each decision', async () => {
      const doc = await analyzer.analyze();

      for (const decision of doc.designDecisions) {
        expect(decision.alternatives).toBeDefined();
        expect(Array.isArray(decision.alternatives)).toBe(true);
      }
    });

    it('should include tradeoffs for each decision', async () => {
      const doc = await analyzer.analyze();

      for (const decision of doc.designDecisions) {
        expect(decision.tradeoffs).toBeTruthy();
      }
    });
  });

  describe('toMarkdown', () => {
    it('should generate valid markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Architecture Documentation');
      expect(markdown).toContain('## Overview');
    });

    it('should include layer section when layers exist', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Architecture Layers');
    });

    it('should include Mermaid diagram when diagrams enabled', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('```mermaid');
      expect(markdown).toContain('flowchart');
    });

    it('should include key components table', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Key Components');
      expect(markdown).toContain('| Component | File | Purpose |');
    });

    it('should include entry points section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Entry Points');
    });

    it('should include design decisions section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Design Decisions');
    });

    it('should include generation timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });
  });

  describe('without diagrams', () => {
    it('should skip Mermaid diagram when disabled', async () => {
      const noDiagramOptions = { ...options, generateDiagrams: false };
      const noDiagramAnalyzer = new ArchitectureAnalyzer(repoMap, noDiagramOptions);

      const doc = await noDiagramAnalyzer.analyze();
      const markdown = noDiagramAnalyzer.toMarkdown(doc);

      expect(markdown).not.toContain('```mermaid');
    });
  });
});
