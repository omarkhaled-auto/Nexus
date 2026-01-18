/**
 * BaseAnalyzer Tests
 *
 * Tests for the base analyzer class helper methods.
 *
 * @module infrastructure/analysis/codebase/BaseAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RepoMap, SymbolEntry, DependencyEdge, FileEntry } from '../types';
import { BaseAnalyzer } from './BaseAnalyzer';
import type { AnalyzerOptions } from './types';

// Concrete implementation for testing
class TestAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<unknown> {
    return {};
  }

  // Expose protected methods for testing
  public testGetSymbolsByKind(kind: Parameters<BaseAnalyzer['getSymbolsByKind']>[0]) {
    return this.getSymbolsByKind(kind);
  }

  public testGetExportedSymbols() {
    return this.getExportedSymbols();
  }

  public testGetFilesInDirectory(dir: string) {
    return this.getFilesInDirectory(dir);
  }

  public testGetDependenciesOf(file: string) {
    return this.getDependenciesOf(file);
  }

  public testGetDependentsOf(file: string) {
    return this.getDependentsOf(file);
  }

  public testExtractJSDoc(symbol: SymbolEntry) {
    return this.extractJSDoc(symbol);
  }

  public testInferPurpose(symbol: SymbolEntry) {
    return this.inferPurpose(symbol);
  }

  public testGenerateMermaidDiagram(type: 'flowchart' | 'classDiagram' | 'sequenceDiagram', data: unknown) {
    return this.generateMermaidDiagram(type, data);
  }

  public testGetMostReferencedSymbols(limit: number) {
    return this.getMostReferencedSymbols(limit);
  }

  public testGetAllDirectories() {
    return this.getAllDirectories();
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    {
      id: 'src/services/UserService.ts#UserService#10',
      name: 'UserService',
      kind: 'class',
      file: 'src/services/UserService.ts',
      line: 10,
      endLine: 50,
      column: 0,
      signature: 'class UserService',
      exported: true,
      references: 15,
      modifiers: ['export'],
      documentation: '/**\n * Service for managing user operations\n * @param config - Configuration options\n */',
    },
    {
      id: 'src/repositories/UserRepository.ts#UserRepository#5',
      name: 'UserRepository',
      kind: 'class',
      file: 'src/repositories/UserRepository.ts',
      line: 5,
      endLine: 30,
      column: 0,
      signature: 'class UserRepository',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    {
      id: 'src/utils/helpers.ts#formatDate#10',
      name: 'formatDate',
      kind: 'function',
      file: 'src/utils/helpers.ts',
      line: 10,
      endLine: 15,
      column: 0,
      signature: 'function formatDate(date: Date): string',
      exported: true,
      references: 3,
      modifiers: ['export'],
    },
    {
      id: 'src/utils/helpers.ts#privateHelper#20',
      name: 'privateHelper',
      kind: 'function',
      file: 'src/utils/helpers.ts',
      line: 20,
      endLine: 25,
      column: 0,
      signature: 'function privateHelper(): void',
      exported: false,
      references: 1,
      modifiers: [],
    },
    {
      id: 'src/types/index.ts#IUser#1',
      name: 'IUser',
      kind: 'interface',
      file: 'src/types/index.ts',
      line: 1,
      endLine: 10,
      column: 0,
      signature: 'interface IUser',
      exported: true,
      references: 20,
      modifiers: ['export'],
    },
    {
      id: 'src/handlers/EventHandler.ts#handleClick#5',
      name: 'handleClick',
      kind: 'function',
      file: 'src/handlers/EventHandler.ts',
      line: 5,
      endLine: 15,
      column: 0,
      signature: 'function handleClick(e: Event): void',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
  ];

  const files: FileEntry[] = [
    {
      path: '/project/src/services/UserService.ts',
      relativePath: 'src/services/UserService.ts',
      language: 'typescript',
      size: 1500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 50,
    },
    {
      path: '/project/src/repositories/UserRepository.ts',
      relativePath: 'src/repositories/UserRepository.ts',
      language: 'typescript',
      size: 800,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/utils/helpers.ts',
      relativePath: 'src/utils/helpers.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 25,
    },
    {
      path: '/project/src/types/index.ts',
      relativePath: 'src/types/index.ts',
      language: 'typescript',
      size: 300,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 10,
    },
    {
      path: '/project/src/handlers/EventHandler.ts',
      relativePath: 'src/handlers/EventHandler.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 15,
    },
  ];

  const dependencies: DependencyEdge[] = [
    {
      from: 'src/services/UserService.ts',
      to: 'src/repositories/UserRepository.ts',
      type: 'import',
      symbols: ['UserRepository'],
    },
    {
      from: 'src/services/UserService.ts',
      to: 'src/types/index.ts',
      type: 'type_import',
      symbols: ['IUser'],
    },
    {
      from: 'src/handlers/EventHandler.ts',
      to: 'src/services/UserService.ts',
      type: 'import',
      symbols: ['UserService'],
    },
    {
      from: 'src/repositories/UserRepository.ts',
      to: 'src/types/index.ts',
      type: 'type_import',
      symbols: ['IUser'],
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
      languageBreakdown: { typescript: 5, javascript: 0 },
      symbolBreakdown: {
        class: 2,
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
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseAnalyzer', () => {
  let analyzer: TestAnalyzer;
  let repoMap: RepoMap;
  let options: AnalyzerOptions;

  beforeEach(() => {
    repoMap = createMockRepoMap();
    options = createOptions();
    analyzer = new TestAnalyzer(repoMap, options);
  });

  describe('getSymbolsByKind', () => {
    it('should return all symbols of a specific kind', () => {
      const classes = analyzer.testGetSymbolsByKind('class');
      expect(classes).toHaveLength(2);
      expect(classes.every(s => s.kind === 'class')).toBe(true);
    });

    it('should return empty array for non-existent kind', () => {
      const enums = analyzer.testGetSymbolsByKind('enum');
      expect(enums).toHaveLength(0);
    });

    it('should return functions correctly', () => {
      const functions = analyzer.testGetSymbolsByKind('function');
      expect(functions).toHaveLength(3);
    });
  });

  describe('getExportedSymbols', () => {
    it('should return only exported symbols', () => {
      const exported = analyzer.testGetExportedSymbols();
      expect(exported).toHaveLength(5);
      expect(exported.every(s => s.exported)).toBe(true);
    });

    it('should not include private symbols', () => {
      const exported = analyzer.testGetExportedSymbols();
      const privateHelper = exported.find(s => s.name === 'privateHelper');
      expect(privateHelper).toBeUndefined();
    });
  });

  describe('getFilesInDirectory', () => {
    it('should return files in a directory', () => {
      const files = analyzer.testGetFilesInDirectory('src/services');
      expect(files).toHaveLength(1);
      expect(files[0]).toBe('src/services/UserService.ts');
    });

    it('should return files in nested directories', () => {
      const files = analyzer.testGetFilesInDirectory('src');
      expect(files).toHaveLength(5);
    });

    it('should return empty array for non-existent directory', () => {
      const files = analyzer.testGetFilesInDirectory('nonexistent');
      expect(files).toHaveLength(0);
    });
  });

  describe('getDependenciesOf', () => {
    it('should return files that a file imports', () => {
      const deps = analyzer.testGetDependenciesOf('src/services/UserService.ts');
      expect(deps).toHaveLength(2);
      expect(deps).toContain('src/repositories/UserRepository.ts');
      expect(deps).toContain('src/types/index.ts');
    });

    it('should return empty array for files with no dependencies', () => {
      const deps = analyzer.testGetDependenciesOf('src/utils/helpers.ts');
      expect(deps).toHaveLength(0);
    });
  });

  describe('getDependentsOf', () => {
    it('should return files that import a given file', () => {
      const dependents = analyzer.testGetDependentsOf('src/types/index.ts');
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain('src/services/UserService.ts');
      expect(dependents).toContain('src/repositories/UserRepository.ts');
    });

    it('should return empty array for files with no dependents', () => {
      const dependents = analyzer.testGetDependentsOf('src/utils/helpers.ts');
      expect(dependents).toHaveLength(0);
    });
  });

  describe('extractJSDoc', () => {
    it('should extract and clean JSDoc documentation', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'UserService')!;
      const doc = analyzer.testExtractJSDoc(symbol);
      expect(doc).toContain('Service for managing user operations');
      expect(doc).not.toContain('/**');
      expect(doc).not.toContain('*/');
    });

    it('should return empty string for symbols without documentation', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'formatDate')!;
      const doc = analyzer.testExtractJSDoc(symbol);
      expect(doc).toBe('');
    });
  });

  describe('inferPurpose', () => {
    it('should infer purpose for Service pattern', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'UserService')!;
      symbol.documentation = undefined; // Clear doc to test inference
      const purpose = analyzer.testInferPurpose(symbol);
      expect(purpose.toLowerCase()).toContain('user');
    });

    it('should infer purpose for Repository pattern', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'UserRepository')!;
      const purpose = analyzer.testInferPurpose(symbol);
      expect(purpose.toLowerCase()).toContain('user');
      expect(purpose.toLowerCase()).toContain('data access');
    });

    it('should infer purpose for Interface with I prefix', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'IUser')!;
      const purpose = analyzer.testInferPurpose(symbol);
      expect(purpose.toLowerCase()).toContain('interface');
    });

    it('should infer purpose for handler functions', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'handleClick')!;
      const purpose = analyzer.testInferPurpose(symbol);
      expect(purpose.toLowerCase()).toContain('handle');
    });

    it('should use documentation if available', () => {
      const symbol = repoMap.symbols.find(s => s.name === 'UserService')!;
      const purpose = analyzer.testInferPurpose(symbol);
      expect(purpose).toContain('Service for managing user operations');
    });
  });

  describe('generateMermaidDiagram', () => {
    it('should generate a flowchart', () => {
      const data = {
        direction: 'TD' as const,
        nodes: [
          { id: 'A', label: 'Start' },
          { id: 'B', label: 'Process' },
          { id: 'C', label: 'End' },
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ],
      };

      const diagram = analyzer.testGenerateMermaidDiagram('flowchart', data);
      expect(diagram).toContain('flowchart TD');
      expect(diagram).toContain('A[Start]');
      expect(diagram).toContain('B[Process]');
      expect(diagram).toContain('C[End]');
      expect(diagram).toContain('A --> B');
      expect(diagram).toContain('B --> C');
    });

    it('should generate a flowchart with labels on edges', () => {
      const data = {
        nodes: [
          { id: 'A', label: 'Start' },
          { id: 'B', label: 'End' },
        ],
        edges: [
          { from: 'A', to: 'B', label: 'process' },
        ],
      };

      const diagram = analyzer.testGenerateMermaidDiagram('flowchart', data);
      expect(diagram).toContain('A -->|process| B');
    });

    it('should generate a class diagram', () => {
      const data = {
        classes: [
          {
            name: 'UserService',
            members: [
              { name: 'findUser()', visibility: 'public' as const },
              { name: 'repository', visibility: 'private' as const },
            ],
          },
        ],
        relationships: [
          { from: 'UserService', to: 'UserRepository', type: 'dependency' as const },
        ],
      };

      const diagram = analyzer.testGenerateMermaidDiagram('classDiagram', data);
      expect(diagram).toContain('classDiagram');
      expect(diagram).toContain('class UserService');
      expect(diagram).toContain('+findUser()');
      expect(diagram).toContain('-repository');
      expect(diagram).toContain('UserService ..> UserRepository');
    });

    it('should generate a sequence diagram', () => {
      const data = {
        participants: [
          { id: 'UI', label: 'User Interface' },
          { id: 'API', label: 'API Server' },
        ],
        messages: [
          { from: 'UI', to: 'API', label: 'request', type: 'sync' as const },
          { from: 'API', to: 'UI', label: 'response', type: 'return' as const },
        ],
      };

      const diagram = analyzer.testGenerateMermaidDiagram('sequenceDiagram', data);
      expect(diagram).toContain('sequenceDiagram');
      expect(diagram).toContain('participant UI as User Interface');
      expect(diagram).toContain('UI->API: request');
      expect(diagram).toContain('API-->UI: response');
    });
  });

  describe('getMostReferencedSymbols', () => {
    it('should return symbols sorted by reference count', () => {
      const top = analyzer.testGetMostReferencedSymbols(3);
      expect(top).toHaveLength(3);
      expect(top[0].name).toBe('IUser'); // 20 references
      expect(top[1].name).toBe('UserService'); // 15 references
      expect(top[2].name).toBe('UserRepository'); // 8 references
    });

    it('should respect the limit parameter', () => {
      const top = analyzer.testGetMostReferencedSymbols(2);
      expect(top).toHaveLength(2);
    });
  });

  describe('getAllDirectories', () => {
    it('should return all unique directories', () => {
      const dirs = analyzer.testGetAllDirectories();
      expect(dirs).toContain('src');
      expect(dirs).toContain('src/services');
      expect(dirs).toContain('src/repositories');
      expect(dirs).toContain('src/utils');
      expect(dirs).toContain('src/types');
      expect(dirs).toContain('src/handlers');
    });

    it('should return sorted directories', () => {
      const dirs = analyzer.testGetAllDirectories();
      const sorted = [...dirs].sort();
      expect(dirs).toEqual(sorted);
    });
  });
});
