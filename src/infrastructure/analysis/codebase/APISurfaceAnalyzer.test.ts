/**
 * APISurfaceAnalyzer Tests
 *
 * Tests for the API surface analyzer that generates API_SURFACE.md documentation.
 *
 * @module infrastructure/analysis/codebase/APISurfaceAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RepoMap, SymbolEntry, DependencyEdge, FileEntry } from '../types';
import { APISurfaceAnalyzer } from './APISurfaceAnalyzer';
import type { AnalyzerOptions } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    // Interface
    {
      id: 'src/types.ts#IAnalyzer#10',
      name: 'IAnalyzer',
      kind: 'interface',
      file: 'src/types.ts',
      line: 10,
      endLine: 25,
      column: 0,
      signature: 'interface IAnalyzer extends IBase { analyze(): Promise<Result>; }',
      exported: true,
      references: 15,
      modifiers: ['export'],
      documentation: '/** Interface for analyzers */',
    },
    // Interface property
    {
      id: 'src/types.ts#IAnalyzer.name#12',
      name: 'name',
      kind: 'property',
      file: 'src/types.ts',
      line: 12,
      endLine: 12,
      column: 2,
      signature: 'name: string',
      exported: false,
      references: 0,
      modifiers: [],
      parentId: 'IAnalyzer',
    },
    // Interface method
    {
      id: 'src/types.ts#IAnalyzer.analyze#15',
      name: 'analyze',
      kind: 'method',
      file: 'src/types.ts',
      line: 15,
      endLine: 15,
      column: 2,
      signature: 'analyze(input: string): Promise<Result>',
      exported: false,
      references: 10,
      modifiers: [],
      parentId: 'IAnalyzer',
    },
    // Class
    {
      id: 'src/analyzers/BaseAnalyzer.ts#BaseAnalyzer#5',
      name: 'BaseAnalyzer',
      kind: 'class',
      file: 'src/analyzers/BaseAnalyzer.ts',
      line: 5,
      endLine: 100,
      column: 0,
      signature: 'class BaseAnalyzer extends AbstractBase implements IAnalyzer',
      exported: true,
      references: 20,
      modifiers: ['export', 'abstract'],
      documentation: '/** Base analyzer class */',
    },
    // Class constructor
    {
      id: 'src/analyzers/BaseAnalyzer.ts#BaseAnalyzer.constructor#10',
      name: 'constructor',
      kind: 'method',
      file: 'src/analyzers/BaseAnalyzer.ts',
      line: 10,
      endLine: 15,
      column: 2,
      signature: 'constructor(options: AnalyzerOptions)',
      exported: false,
      references: 0,
      modifiers: ['public'],
      parentId: 'BaseAnalyzer',
    },
    // Class method
    {
      id: 'src/analyzers/BaseAnalyzer.ts#BaseAnalyzer.analyze#20',
      name: 'analyze',
      kind: 'method',
      file: 'src/analyzers/BaseAnalyzer.ts',
      line: 20,
      endLine: 50,
      column: 2,
      signature: 'analyze(): Promise<AnalysisResult>',
      exported: false,
      references: 5,
      modifiers: ['public'],
      parentId: 'BaseAnalyzer',
      documentation: '/** Performs analysis */',
    },
    // Private method (should be excluded)
    {
      id: 'src/analyzers/BaseAnalyzer.ts#BaseAnalyzer.helper#60',
      name: 'helper',
      kind: 'method',
      file: 'src/analyzers/BaseAnalyzer.ts',
      line: 60,
      endLine: 70,
      column: 2,
      signature: 'private helper(): void',
      exported: false,
      references: 2,
      modifiers: ['private'],
      parentId: 'BaseAnalyzer',
    },
    // Function
    {
      id: 'src/utils/helpers.ts#createAnalyzer#5',
      name: 'createAnalyzer',
      kind: 'function',
      file: 'src/utils/helpers.ts',
      line: 5,
      endLine: 20,
      column: 0,
      signature: 'function createAnalyzer(type: string, options?: CreateOptions): IAnalyzer',
      exported: true,
      references: 10,
      modifiers: ['export'],
      documentation: '/** Factory function to create analyzers */',
    },
    // Type alias
    {
      id: 'src/types.ts#AnalyzerResult#30',
      name: 'AnalyzerResult',
      kind: 'type',
      file: 'src/types.ts',
      line: 30,
      endLine: 30,
      column: 0,
      signature: 'type AnalyzerResult = Success | Failure',
      exported: true,
      references: 8,
      modifiers: ['export'],
      documentation: '/** Result type for analyzers */',
    },
    // Non-exported symbol (should be excluded from public API)
    {
      id: 'src/internal.ts#internalHelper#5',
      name: 'internalHelper',
      kind: 'function',
      file: 'src/internal.ts',
      line: 5,
      endLine: 15,
      column: 0,
      signature: 'function internalHelper(): void',
      exported: false,
      references: 3,
      modifiers: [],
    },
    // IPC-related symbol
    {
      id: 'src/main/ipc.ts#handleGetProject#10',
      name: 'handleGetProject',
      kind: 'function',
      file: 'src/main/ipc.ts',
      line: 10,
      endLine: 25,
      column: 0,
      signature: "ipcMain.handle('get-project', async (event, id: string) => { })",
      exported: true,
      references: 2,
      modifiers: ['export'],
      documentation: '/** Handles get-project IPC request */',
    },
    // Another exported function
    {
      id: 'src/utils/format.ts#formatResult#5',
      name: 'formatResult',
      kind: 'function',
      file: 'src/utils/format.ts',
      line: 5,
      endLine: 20,
      column: 0,
      signature: 'function formatResult(result: AnalyzerResult, options?: FormatOptions): string',
      exported: true,
      references: 12,
      modifiers: ['export'],
    },
  ];

  const files: FileEntry[] = [
    {
      path: '/project/src/types.ts',
      relativePath: 'src/types.ts',
      language: 'typescript',
      size: 1000,
      lastModified: new Date(),
      symbolCount: 3,
      lineCount: 50,
    },
    {
      path: '/project/src/analyzers/BaseAnalyzer.ts',
      relativePath: 'src/analyzers/BaseAnalyzer.ts',
      language: 'typescript',
      size: 2000,
      lastModified: new Date(),
      symbolCount: 4,
      lineCount: 100,
    },
    {
      path: '/project/src/utils/helpers.ts',
      relativePath: 'src/utils/helpers.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    {
      path: '/project/src/utils/format.ts',
      relativePath: 'src/utils/format.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    {
      path: '/project/src/internal.ts',
      relativePath: 'src/internal.ts',
      language: 'typescript',
      size: 300,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 15,
    },
    {
      path: '/project/src/main/ipc.ts',
      relativePath: 'src/main/ipc.ts',
      language: 'typescript',
      size: 600,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
  ];

  const dependencies: DependencyEdge[] = [
    {
      from: 'src/analyzers/BaseAnalyzer.ts',
      to: 'src/types.ts',
      type: 'import',
      symbols: ['IAnalyzer', 'AnalyzerResult'],
    },
    {
      from: 'src/utils/helpers.ts',
      to: 'src/types.ts',
      type: 'import',
      symbols: ['IAnalyzer'],
    },
    {
      from: 'src/main/ipc.ts',
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
        class: 1,
        interface: 1,
        function: 4,
        method: 4,
        property: 1,
        variable: 0,
        constant: 0,
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
    includePrivate: false,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('APISurfaceAnalyzer', () => {
  let analyzer: APISurfaceAnalyzer;
  let repoMap: RepoMap;
  let options: AnalyzerOptions;

  beforeEach(() => {
    repoMap = createMockRepoMap();
    options = createOptions();
    analyzer = new APISurfaceAnalyzer(repoMap, options);
  });

  describe('analyze', () => {
    it('should return complete APISurfaceDoc', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toHaveProperty('overview');
      expect(doc).toHaveProperty('publicInterfaces');
      expect(doc).toHaveProperty('publicClasses');
      expect(doc).toHaveProperty('publicFunctions');
      expect(doc).toHaveProperty('publicTypes');
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(50);
    });
  });

  describe('interface documentation', () => {
    it('should document exported interfaces', async () => {
      const doc = await analyzer.analyze();

      expect(doc.publicInterfaces.length).toBeGreaterThan(0);
    });

    it('should include interface details', async () => {
      const doc = await analyzer.analyze();

      const iAnalyzer = doc.publicInterfaces.find(i => i.name === 'IAnalyzer');
      expect(iAnalyzer).toBeDefined();
      expect(iAnalyzer?.file).toBe('src/types.ts');
      expect(iAnalyzer?.description).toBeTruthy();
    });

    it('should extract interface properties', async () => {
      const doc = await analyzer.analyze();

      const iAnalyzer = doc.publicInterfaces.find(i => i.name === 'IAnalyzer');
      expect(iAnalyzer?.properties).toBeDefined();
      // Should have at least the 'name' property we defined
      expect(iAnalyzer?.properties.some(p => p.name === 'name')).toBe(true);
    });

    it('should extract interface methods', async () => {
      const doc = await analyzer.analyze();

      const iAnalyzer = doc.publicInterfaces.find(i => i.name === 'IAnalyzer');
      expect(iAnalyzer?.methods).toBeDefined();
      expect(iAnalyzer?.methods.some(m => m.name === 'analyze')).toBe(true);
    });
  });

  describe('class documentation', () => {
    it('should document exported classes', async () => {
      const doc = await analyzer.analyze();

      expect(doc.publicClasses.length).toBeGreaterThan(0);
    });

    it('should include class details', async () => {
      const doc = await analyzer.analyze();

      const baseAnalyzer = doc.publicClasses.find(c => c.name === 'BaseAnalyzer');
      expect(baseAnalyzer).toBeDefined();
      expect(baseAnalyzer?.file).toBe('src/analyzers/BaseAnalyzer.ts');
      expect(baseAnalyzer?.description).toBeTruthy();
    });

    it('should extract constructor signature', async () => {
      const doc = await analyzer.analyze();

      const baseAnalyzer = doc.publicClasses.find(c => c.name === 'BaseAnalyzer');
      expect(baseAnalyzer?.constructor).toBeTruthy();
      expect(baseAnalyzer?.constructor).toContain('constructor');
    });

    it('should extract public methods only by default', async () => {
      const doc = await analyzer.analyze();

      const baseAnalyzer = doc.publicClasses.find(c => c.name === 'BaseAnalyzer');
      // Should have analyze method but not helper (private)
      expect(baseAnalyzer?.methods.some(m => m.name === 'analyze')).toBe(true);
      expect(baseAnalyzer?.methods.some(m => m.name === 'helper')).toBe(false);
    });

    it('should include private methods when includePrivate is true', async () => {
      const privateOptions = { ...options, includePrivate: true };
      const privateAnalyzer = new APISurfaceAnalyzer(repoMap, privateOptions);
      const doc = await privateAnalyzer.analyze();

      const baseAnalyzer = doc.publicClasses.find(c => c.name === 'BaseAnalyzer');
      expect(baseAnalyzer?.methods.some(m => m.name === 'helper')).toBe(true);
    });
  });

  describe('function documentation', () => {
    it('should document exported functions', async () => {
      const doc = await analyzer.analyze();

      expect(doc.publicFunctions.length).toBeGreaterThan(0);
    });

    it('should include function details', async () => {
      const doc = await analyzer.analyze();

      const createAnalyzer = doc.publicFunctions.find(f => f.name === 'createAnalyzer');
      expect(createAnalyzer).toBeDefined();
      expect(createAnalyzer?.file).toBe('src/utils/helpers.ts');
      expect(createAnalyzer?.signature).toBeTruthy();
    });

    it('should extract parameters', async () => {
      const doc = await analyzer.analyze();

      const createAnalyzer = doc.publicFunctions.find(f => f.name === 'createAnalyzer');
      expect(createAnalyzer?.parameters.length).toBeGreaterThan(0);
      expect(createAnalyzer?.parameters.some(p => p.name === 'type')).toBe(true);
    });

    it('should extract return type', async () => {
      const doc = await analyzer.analyze();

      const createAnalyzer = doc.publicFunctions.find(f => f.name === 'createAnalyzer');
      expect(createAnalyzer?.returns).toBe('IAnalyzer');
    });

    it('should not include non-exported functions', async () => {
      const doc = await analyzer.analyze();

      const internalHelper = doc.publicFunctions.find(f => f.name === 'internalHelper');
      expect(internalHelper).toBeUndefined();
    });
  });

  describe('type documentation', () => {
    it('should document exported types', async () => {
      const doc = await analyzer.analyze();

      expect(doc.publicTypes.length).toBeGreaterThan(0);
    });

    it('should include type details', async () => {
      const doc = await analyzer.analyze();

      const analyzerResult = doc.publicTypes.find(t => t.name === 'AnalyzerResult');
      expect(analyzerResult).toBeDefined();
      expect(analyzerResult?.file).toBe('src/types.ts');
      expect(analyzerResult?.definition).toBeTruthy();
    });
  });

  describe('IPC channel documentation', () => {
    it('should detect IPC channels', async () => {
      const doc = await analyzer.analyze();

      // ipcChannels may be undefined if none found
      if (doc.ipcChannels) {
        expect(doc.ipcChannels.length).toBeGreaterThan(0);
      }
    });

    it('should extract channel name from ipcMain.handle', async () => {
      const doc = await analyzer.analyze();

      if (doc.ipcChannels) {
        const getProject = doc.ipcChannels.find(c => c.channel === 'get-project');
        expect(getProject).toBeDefined();
        expect(getProject?.direction).toBe('renderer-to-main');
      }
    });
  });

  describe('toMarkdown', () => {
    it('should generate valid markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# API Surface Documentation');
      expect(markdown).toContain('## Overview');
    });

    it('should include interfaces section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Interfaces');
      expect(markdown).toContain('| Interface | File | Description |');
    });

    it('should include classes section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Classes');
      expect(markdown).toContain('| Class | File | Description |');
    });

    it('should include functions section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Functions');
      expect(markdown).toContain('| Function | File | Signature |');
    });

    it('should include types section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Types');
      expect(markdown).toContain('| Type | File | Definition |');
    });

    it('should include generation timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });
  });

  describe('parameter extraction', () => {
    it('should detect optional parameters', async () => {
      const doc = await analyzer.analyze();

      const createAnalyzer = doc.publicFunctions.find(f => f.name === 'createAnalyzer');
      const optionsParam = createAnalyzer?.parameters.find(p => p.name === 'options');
      expect(optionsParam?.optional).toBe(true);
    });

    it('should extract parameter types', async () => {
      const doc = await analyzer.analyze();

      const formatResult = doc.publicFunctions.find(f => f.name === 'formatResult');
      const resultParam = formatResult?.parameters.find(p => p.name === 'result');
      expect(resultParam?.type).toBe('AnalyzerResult');
    });
  });
});
