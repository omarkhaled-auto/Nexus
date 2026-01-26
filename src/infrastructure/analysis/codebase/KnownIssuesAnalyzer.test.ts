/**
 * Known Issues Analyzer Tests
 *
 * Tests for the KnownIssuesAnalyzer class that generates KNOWN_ISSUES.md documentation.
 *
 * @module infrastructure/analysis/codebase/KnownIssuesAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnownIssuesAnalyzer } from './KnownIssuesAnalyzer';
import type { RepoMap } from '../types';
import type { AnalyzerOptions } from './types';
import {
  mockFile,
  mockSymbol,
  mockDependency,
  createMockRepoMapStats,
} from './__testHelpers';

describe('KnownIssuesAnalyzer', () => {
  let analyzer: KnownIssuesAnalyzer;
  let mockRepoMap: RepoMap;
  let mockOptions: AnalyzerOptions;

  beforeEach(() => {
    mockRepoMap = createMockRepoMap();
    mockOptions = {
      projectPath: '/test/project',
      outputDir: '.nexus/codebase/',
      includePrivate: false,
      maxExamples: 3,
      generateDiagrams: true,
    };
    analyzer = new KnownIssuesAnalyzer(mockRepoMap, mockOptions);
  });

  describe('analyze()', () => {
    it('should return a KnownIssuesDoc with all required fields', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toBeDefined();
      expect(doc.overview).toBeDefined();
      expect(doc.technicalDebt).toBeDefined();
      expect(doc.limitations).toBeDefined();
      expect(doc.workarounds).toBeDefined();
      expect(doc.futureImprovements).toBeDefined();
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(20);
    });
  });

  describe('findTechnicalDebt()', () => {
    it('should detect deprecated symbols', async () => {
      const repoMapWithDeprecated = createMockRepoMapWithDeprecated();
      const analyzerWithDeprecated = new KnownIssuesAnalyzer(repoMapWithDeprecated, mockOptions);
      const doc = await analyzerWithDeprecated.analyze();

      const deprecatedItem = doc.technicalDebt.find(d => d.description.includes('Deprecated'));
      expect(deprecatedItem).toBeDefined();
      expect(deprecatedItem?.severity).toBe('medium');
    });

    it('should detect temporary files', async () => {
      const repoMapWithTemp = createMockRepoMapWithTempFiles();
      const analyzerWithTemp = new KnownIssuesAnalyzer(repoMapWithTemp, mockOptions);
      const doc = await analyzerWithTemp.analyze();

      const tempItem = doc.technicalDebt.find(d => d.description.includes('Temporary'));
      expect(tempItem).toBeDefined();
    });

    it('should detect old/legacy files', async () => {
      const repoMapWithOld = createMockRepoMapWithOldFiles();
      const analyzerWithOld = new KnownIssuesAnalyzer(repoMapWithOld, mockOptions);
      const doc = await analyzerWithOld.analyze();

      const oldItem = doc.technicalDebt.find(d => d.description.includes('legacy'));
      expect(oldItem).toBeDefined();
    });

    it('should assign unique IDs to debt items', async () => {
      const repoMapWithMultiple = createMockRepoMapWithMultipleIssues();
      const analyzerWithMultiple = new KnownIssuesAnalyzer(repoMapWithMultiple, mockOptions);
      const doc = await analyzerWithMultiple.analyze();

      const ids = doc.technicalDebt.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('detectLimitations()', () => {
    it('should detect better-sqlite3 limitation', async () => {
      const doc = await analyzer.analyze();

      const sqliteLimit = doc.limitations.find(l => l.limitation.includes('better-sqlite3'));
      expect(sqliteLimit).toBeDefined();
      expect(sqliteLimit?.workaround).toBeTruthy();
    });

    it('should detect platform-specific code', async () => {
      const repoMapWithPlatform = createMockRepoMapWithPlatformCode();
      const analyzerWithPlatform = new KnownIssuesAnalyzer(repoMapWithPlatform, mockOptions);
      const doc = await analyzerWithPlatform.analyze();

      const platformLimit = doc.limitations.find(l => l.limitation.includes('Platform'));
      expect(platformLimit).toBeDefined();
    });

    it('should detect tree-sitter WASM limitation', async () => {
      const repoMapWithTreeSitter = createMockRepoMapWithTreeSitter();
      const analyzerWithTreeSitter = new KnownIssuesAnalyzer(repoMapWithTreeSitter, mockOptions);
      const doc = await analyzerWithTreeSitter.analyze();

      const wasmLimit = doc.limitations.find(l => l.limitation.includes('WASM'));
      expect(wasmLimit).toBeDefined();
    });
  });

  describe('findWorkarounds()', () => {
    it('should detect workaround files', async () => {
      const repoMapWithWorkaround = createMockRepoMapWithWorkaround();
      const analyzerWithWorkaround = new KnownIssuesAnalyzer(repoMapWithWorkaround, mockOptions);
      const doc = await analyzerWithWorkaround.analyze();

      expect(doc.workarounds.length).toBeGreaterThan(0);
    });

    it('should detect shim files', async () => {
      const repoMapWithShim = createMockRepoMapWithShim();
      const analyzerWithShim = new KnownIssuesAnalyzer(repoMapWithShim, mockOptions);
      const doc = await analyzerWithShim.analyze();

      const shimWorkaround = doc.workarounds.find(w => w.workaround.includes('Shim'));
      expect(shimWorkaround).toBeDefined();
    });

    it('should mark workarounds as non-permanent by default', async () => {
      const repoMapWithWorkaround = createMockRepoMapWithWorkaround();
      const analyzerWithWorkaround = new KnownIssuesAnalyzer(repoMapWithWorkaround, mockOptions);
      const doc = await analyzerWithWorkaround.analyze();

      for (const wa of doc.workarounds) {
        expect(wa.permanent).toBe(false);
      }
    });
  });

  describe('suggestImprovements()', () => {
    it('should suggest test coverage improvements when tests are sparse', async () => {
      const repoMapSparseTests = createMockRepoMapWithSparseTests();
      const analyzerSparse = new KnownIssuesAnalyzer(repoMapSparseTests, mockOptions);
      const doc = await analyzerSparse.analyze();

      const coverageImprovement = doc.futureImprovements.find(i =>
        i.improvement.includes('test coverage')
      );
      expect(coverageImprovement).toBeDefined();
    });

    it('should suggest documentation improvements when exports lack docs', async () => {
      const repoMapNoDocs = createMockRepoMapWithUndocumented();
      const analyzerNoDocs = new KnownIssuesAnalyzer(repoMapNoDocs, mockOptions);
      const doc = await analyzerNoDocs.analyze();

      const docImprovement = doc.futureImprovements.find(i =>
        i.improvement.includes('JSDoc')
      );
      expect(docImprovement).toBeDefined();
    });

    it('should include complexity and priority for improvements', async () => {
      const doc = await analyzer.analyze();

      for (const imp of doc.futureImprovements) {
        expect(['low', 'medium', 'high']).toContain(imp.complexity);
        expect(['low', 'medium', 'high']).toContain(imp.priority);
      }
    });
  });

  describe('toMarkdown()', () => {
    it('should generate valid Markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Known Issues');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('## Technical Debt');
      expect(markdown).toContain('## Known Limitations');
      expect(markdown).toContain('## Workarounds');
      expect(markdown).toContain('## Suggested Improvements');
    });

    it('should include timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });

    it('should format technical debt as table', async () => {
      const repoMapWithDebt = createMockRepoMapWithMultipleIssues();
      const analyzerWithDebt = new KnownIssuesAnalyzer(repoMapWithDebt, mockOptions);
      const doc = await analyzerWithDebt.analyze();
      const markdown = analyzerWithDebt.toMarkdown(doc);

      expect(markdown).toContain('| ID | Description | Location | Severity | Effort |');
    });

    it('should format improvements as table', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('| Improvement | Benefit | Complexity | Priority |');
    });

    it('should handle empty sections gracefully', async () => {
      const emptyRepoMap = createMinimalRepoMap();
      const emptyAnalyzer = new KnownIssuesAnalyzer(emptyRepoMap, mockOptions);
      const doc = await emptyAnalyzer.analyze();
      const markdown = emptyAnalyzer.toMarkdown(doc);

      expect(markdown).toContain('No technical debt items detected');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepoMap(): RepoMap {
  const files = [
    mockFile('package.json', { size: 500, lineCount: 50 }),
    mockFile('src/index.ts', { size: 200, lineCount: 20 }),
    mockFile('src/utils/helper.ts', { size: 300, lineCount: 30 }),
  ];

  const symbols = [
    mockSymbol('helper', 'function', 'src/utils/helper.ts', true),
  ];

  const dependencies = [
    mockDependency('src/index.ts', 'better-sqlite3', 'import'),
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

function createMockRepoMapWithDeprecated(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    symbols: [
      ...base.symbols,
      mockSymbol('oldFunction', 'function', 'src/utils/old.ts', true, {
        line: 10,
        references: 5,
        documentation: '/** @deprecated Use newFunction instead */',
      }),
    ],
  };
}

function createMockRepoMapWithTempFiles(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/utils/temp-helper.ts', { size: 100, lineCount: 10 }),
    ],
  };
}

function createMockRepoMapWithOldFiles(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/utils/helper.old.ts', { size: 100, lineCount: 10 }),
    ],
  };
}

function createMockRepoMapWithMultipleIssues(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/utils/temp-fix.ts', { size: 100, lineCount: 10 }),
      mockFile('src/old-module.ts', { size: 100, lineCount: 10 }),
    ],
    symbols: [
      ...base.symbols,
      mockSymbol('deprecatedHelper', 'function', 'src/utils/old.ts', true, {
        documentation: '/** @deprecated */',
      }),
    ],
  };
}

function createMockRepoMapWithPlatformCode(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/platform-win32/utils.ts', { size: 200, lineCount: 20 }),
      mockFile('src/platform-darwin/utils.ts', { size: 200, lineCount: 20 }),
    ],
  };
}

function createMockRepoMapWithTreeSitter(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    dependencies: [
      ...base.dependencies,
      mockDependency('src/parser.ts', 'web-tree-sitter', 'import'),
    ],
  };
}

function createMockRepoMapWithWorkaround(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/utils/workaround-auth.ts', { size: 150, lineCount: 15 }),
    ],
  };
}

function createMockRepoMapWithShim(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/shim/fetch-shim.ts', { size: 100, lineCount: 10 }),
    ],
  };
}

function createMockRepoMapWithSparseTests(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/moduleA.ts', { size: 200, lineCount: 20 }),
      mockFile('src/moduleB.ts', { size: 200, lineCount: 20 }),
      mockFile('src/moduleC.ts', { size: 200, lineCount: 20 }),
      mockFile('src/moduleD.ts', { size: 200, lineCount: 20 }),
      mockFile('src/moduleE.ts', { size: 200, lineCount: 20 }),
      mockFile('src/moduleA.test.ts', { size: 100, lineCount: 10 }),
    ],
  };
}

function createMockRepoMapWithUndocumented(): RepoMap {
  const symbols = [];
  for (let i = 0; i < 15; i++) {
    symbols.push(
      mockSymbol(`exportedFunc${i}`, 'function', `src/module${i}.ts`, true)
    );
  }

  return {
    projectPath: '/test/project',
    generatedAt: new Date(),
    files: [mockFile('package.json', { size: 100, lineCount: 10 })],
    symbols,
    dependencies: [],
    stats: createMockRepoMapStats({
      totalFiles: 1,
      totalSymbols: symbols.length,
      totalDependencies: 0,
      languageBreakdown: { typescript: 1, javascript: 0 },
    }),
  };
}
