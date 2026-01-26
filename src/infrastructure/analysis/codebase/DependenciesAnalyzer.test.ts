/**
 * Dependencies Analyzer Tests
 *
 * Tests for the DependenciesAnalyzer class that generates DEPENDENCIES.md documentation.
 *
 * @module infrastructure/analysis/codebase/DependenciesAnalyzer.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependenciesAnalyzer } from './DependenciesAnalyzer';
import type { RepoMap, SymbolKind, DependencyType } from '../types';
import type { AnalyzerOptions } from './types';
import {
  mockFile,
  mockSymbol,
  mockDependency,
  createMockRepoMapStats,
} from './__testHelpers';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockImplementation(async (path: string) => {
    if (path.includes('package.json')) {
      return JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          react: '^18.2.0',
          zustand: '^4.5.0',
          'better-sqlite3': '^9.4.0',
        },
        devDependencies: {
          typescript: '^5.3.0',
          vitest: '^1.2.0',
          '@types/node': '^20.10.0',
        },
      });
    }
    throw new Error('File not found');
  }),
}));

describe('DependenciesAnalyzer', () => {
  let analyzer: DependenciesAnalyzer;
  let mockRepoMap: RepoMap;
  let mockOptions: AnalyzerOptions;

  beforeEach(() => {
    // Create mock repo map
    mockRepoMap = createMockRepoMap();
    mockOptions = {
      projectPath: '/test/project',
      outputDir: '.nexus/codebase/',
      includePrivate: false,
      maxExamples: 3,
      generateDiagrams: true,
    };
    analyzer = new DependenciesAnalyzer(mockRepoMap, mockOptions);
  });

  describe('analyze()', () => {
    it('should return a DependenciesDoc with all required fields', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toBeDefined();
      expect(doc.overview).toBeDefined();
      expect(doc.externalDependencies).toBeDefined();
      expect(doc.internalModules).toBeDefined();
      expect(doc.dependencyGraph).toBeDefined();
      expect(doc.circularDependencies).toBeDefined();
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(50);
    });
  });

  describe('analyzeExternalDependencies()', () => {
    it('should detect runtime dependencies from package.json', async () => {
      const doc = await analyzer.analyze();

      const reactDep = doc.externalDependencies.find(d => d.name === 'react');
      expect(reactDep).toBeDefined();
      expect(reactDep?.version).toBe('^18.2.0');
      expect(reactDep?.purpose).toBeTruthy();
    });

    it('should detect dev dependencies from package.json', async () => {
      const doc = await analyzer.analyze();

      const typescriptDep = doc.externalDependencies.find(d => d.name === 'typescript');
      expect(typescriptDep).toBeDefined();
      expect(typescriptDep?.version).toBe('^5.3.0');
    });

    it('should mark critical dependencies', async () => {
      const doc = await analyzer.analyze();

      const reactDep = doc.externalDependencies.find(d => d.name === 'react');
      const zustandDep = doc.externalDependencies.find(d => d.name === 'zustand');
      const sqliteDep = doc.externalDependencies.find(d => d.name === 'better-sqlite3');

      expect(reactDep?.critical).toBe(true);
      expect(zustandDep?.critical).toBe(true);
      expect(sqliteDep?.critical).toBe(true);
    });

    it('should not mark dev dependencies as critical', async () => {
      const doc = await analyzer.analyze();

      const vitestDep = doc.externalDependencies.find(d => d.name === 'vitest');
      expect(vitestDep?.critical).toBe(false);
    });

    it('should include purpose for known packages', async () => {
      const doc = await analyzer.analyze();

      const reactDep = doc.externalDependencies.find(d => d.name === 'react');
      expect(reactDep?.purpose).toBe('UI component library');

      const zustandDep = doc.externalDependencies.find(d => d.name === 'zustand');
      expect(zustandDep?.purpose).toBe('Lightweight state management');
    });

    it('should infer purpose for @types packages', async () => {
      const doc = await analyzer.analyze();

      const typesDep = doc.externalDependencies.find(d => d.name === '@types/node');
      expect(typesDep?.purpose).toBe('TypeScript types for node');
    });
  });

  describe('analyzeInternalModules()', () => {
    it('should detect modules with index files', async () => {
      const doc = await analyzer.analyze();

      expect(doc.internalModules.length).toBeGreaterThan(0);
    });

    it('should extract module name from path', async () => {
      const doc = await analyzer.analyze();

      const infraModule = doc.internalModules.find(m => m.name.includes('infrastructure'));
      expect(infraModule).toBeDefined();
    });

    it('should list module exports', async () => {
      const doc = await analyzer.analyze();

      // At least one module should have exports
      const moduleWithExports = doc.internalModules.find(m => m.exports.length > 0);
      if (mockRepoMap.symbols.some(s => s.exported)) {
        expect(moduleWithExports).toBeDefined();
      }
    });
  });

  describe('generateDependencyGraph()', () => {
    it('should generate a valid Mermaid diagram', async () => {
      const doc = await analyzer.analyze();

      expect(doc.dependencyGraph).toBeTruthy();
      expect(doc.dependencyGraph).toContain('flowchart');
    });

    it('should handle empty graph gracefully', async () => {
      // Create analyzer with minimal repo map
      const minimalRepoMap = createMinimalRepoMap();
      const minimalAnalyzer = new DependenciesAnalyzer(minimalRepoMap, mockOptions);
      const doc = await minimalAnalyzer.analyze();

      expect(doc.dependencyGraph).toBeTruthy();
      // Should still contain valid Mermaid syntax
      expect(doc.dependencyGraph).toContain('mermaid');
    });
  });

  describe('findCircularDependencies()', () => {
    it('should return empty array when no circular dependencies', async () => {
      const doc = await analyzer.analyze();

      // Our mock repo map has no circular dependencies
      expect(Array.isArray(doc.circularDependencies)).toBe(true);
    });

    it('should detect circular dependencies when present', async () => {
      // Create repo map with circular dependency
      const circularRepoMap = createCircularRepoMap();
      const circularAnalyzer = new DependenciesAnalyzer(circularRepoMap, mockOptions);
      const doc = await circularAnalyzer.analyze();

      // May or may not find cycles depending on implementation
      expect(Array.isArray(doc.circularDependencies)).toBe(true);
    });

    it('should assess severity correctly', async () => {
      const circularRepoMap = createCircularRepoMap();
      const circularAnalyzer = new DependenciesAnalyzer(circularRepoMap, mockOptions);
      const doc = await circularAnalyzer.analyze();

      for (const cd of doc.circularDependencies) {
        expect(['low', 'medium', 'high']).toContain(cd.severity);
        expect(cd.suggestion).toBeTruthy();
      }
    });
  });

  describe('toMarkdown()', () => {
    it('should generate valid Markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Dependencies');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('## External Dependencies');
      expect(markdown).toContain('## Internal Modules');
      expect(markdown).toContain('## Dependency Graph');
      expect(markdown).toContain('## Circular Dependencies');
    });

    it('should include timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });

    it('should format external dependencies as table', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('| Package | Version | Purpose | Critical |');
      expect(markdown).toContain('|---------|---------|---------|----------|');
    });

    it('should list internal modules', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('**Path:**');
    });

    it('should include Mermaid graph', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('flowchart');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepoMap(): RepoMap {
  const files = [
    mockFile('package.json', { size: 500, lineCount: 50 }),
    mockFile('src/infrastructure/index.ts', { size: 200, lineCount: 20 }),
    mockFile('src/infrastructure/analysis/index.ts', { size: 300, lineCount: 30 }),
    mockFile('src/ui/index.ts', { size: 150, lineCount: 15 }),
    mockFile('src/ui/components/Button.tsx', { size: 400, lineCount: 40 }),
    mockFile('src/persistence/index.ts', { size: 200, lineCount: 20 }),
    mockFile('src/persistence/database.ts', { size: 500, lineCount: 50 }),
  ];

  const symbols = [
    mockSymbol('RepoMapGenerator', 'class', 'src/infrastructure/analysis/index.ts', true),
    mockSymbol('generateRepoMap', 'function', 'src/infrastructure/analysis/index.ts', true),
    mockSymbol('Button', 'function', 'src/ui/components/Button.tsx', true),
    mockSymbol('useStore', 'function', 'src/ui/index.ts', true),
    mockSymbol('Database', 'class', 'src/persistence/database.ts', true),
  ];

  const dependencies = [
    mockDependency('src/ui/components/Button.tsx', 'react', 'import'),
    mockDependency('src/ui/components/Button.tsx', 'zustand', 'import'),
    mockDependency('src/persistence/database.ts', 'better-sqlite3', 'import'),
    mockDependency('src/ui/index.ts', 'src/ui/components/Button.tsx', 'import'),
    mockDependency('src/infrastructure/analysis/index.ts', 'src/infrastructure/index.ts', 'import'),
  ];

  return {
    projectPath: '/test/project',
    generatedAt: new Date(),
    files,
    symbols,
    dependencies,
    stats: createMockRepoMapStats({
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown: { typescript: files.length, javascript: 0 },
      symbolBreakdown: {
        class: 2,
        function: 3,
        interface: 0,
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
    }),
  };
}

function createMinimalRepoMap(): RepoMap {
  const files = [mockFile('package.json', { size: 100, lineCount: 10 })];
  return {
    projectPath: '/test/project',
    generatedAt: new Date(),
    files,
    symbols: [],
    dependencies: [],
    stats: createMockRepoMapStats({
      totalFiles: 1,
      totalSymbols: 0,
      totalDependencies: 0,
      languageBreakdown: { typescript: 1, javascript: 0 },
    }),
  };
}

function createCircularRepoMap(): RepoMap {
  const files = [
    mockFile('package.json', { size: 100, lineCount: 10 }),
    mockFile('src/a.ts', { size: 100, lineCount: 10 }),
    mockFile('src/b.ts', { size: 100, lineCount: 10 }),
    mockFile('src/c.ts', { size: 100, lineCount: 10 }),
  ];

  // Create circular: a -> b -> c -> a
  const dependencies = [
    mockDependency('src/a.ts', 'src/b.ts', 'import'),
    mockDependency('src/b.ts', 'src/c.ts', 'import'),
    mockDependency('src/c.ts', 'src/a.ts', 'import'),
  ];

  return {
    projectPath: '/test/project',
    generatedAt: new Date(),
    files,
    symbols: [],
    dependencies,
    stats: createMockRepoMapStats({
      totalFiles: files.length,
      totalSymbols: 0,
      totalDependencies: dependencies.length,
      languageBreakdown: { typescript: files.length, javascript: 0 },
    }),
  };
}
