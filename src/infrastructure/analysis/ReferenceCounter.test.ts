/**
 * ReferenceCounter Tests
 *
 * Unit tests for the ReferenceCounter class.
 *
 * @module infrastructure/analysis/ReferenceCounter.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferenceCounter,
  resetReferenceCounter,
  getReferenceCounter,
} from './ReferenceCounter';
import type {
  SymbolEntry,
  ParseResult,
  DependencyEdge,
  ImportStatement,
} from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createSymbol(overrides: Partial<SymbolEntry> = {}): SymbolEntry {
  const name = overrides.name || 'TestSymbol';
  const file = overrides.file || 'test/file.ts';
  const line = overrides.line || 1;
  return {
    id: overrides.id || `${file}#${name}#${line}`,
    name,
    kind: overrides.kind || 'function',
    file,
    line,
    endLine: overrides.endLine || 10,
    column: overrides.column || 0,
    signature: overrides.signature || `${name}()`,
    documentation: overrides.documentation,
    references: overrides.references || 0,
    exported: overrides.exported ?? true, // Default to exported for reference counting
    parentId: overrides.parentId,
    modifiers: overrides.modifiers || [],
  };
}

function createImport(
  source: string,
  symbols: Array<{ local: string; imported?: string }>,
  line = 1
): ImportStatement {
  return {
    type: 'named',
    source,
    symbols,
    line,
    typeOnly: false,
  };
}

function createParseResult(
  file: string,
  symbols: SymbolEntry[] = [],
  imports: ImportStatement[] = []
): ParseResult {
  return {
    success: true,
    file,
    symbols,
    imports,
    exports: [],
    errors: [],
    parseTime: 10,
  };
}

function createDependencyEdge(
  from: string,
  to: string,
  symbols: string[] = []
): DependencyEdge {
  return {
    from,
    to,
    type: 'import',
    symbols,
    line: 1,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ReferenceCounter', () => {
  let counter: ReferenceCounter;

  beforeEach(() => {
    resetReferenceCounter();
    counter = new ReferenceCounter();
  });

  // --------------------------------------------------------------------------
  // Singleton Tests
  // --------------------------------------------------------------------------

  describe('singleton', () => {
    it('should return same instance from getReferenceCounter', () => {
      const instance1 = getReferenceCounter();
      const instance2 = getReferenceCounter();
      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = getReferenceCounter();
      resetReferenceCounter();
      const instance2 = getReferenceCounter();
      expect(instance1).not.toBe(instance2);
    });
  });

  // --------------------------------------------------------------------------
  // Count Method Tests
  // --------------------------------------------------------------------------

  describe('count', () => {
    it('should count references from imports', () => {
      const userSymbol = createSymbol({
        name: 'User',
        file: 'src/models/User.ts',
        kind: 'class',
        exported: true,
      });

      const symbols = [userSymbol];

      const parseResults = [
        createParseResult('src/services/auth.ts', [], [
          createImport('./User', [{ local: 'User' }]),
        ]),
        createParseResult('src/services/profile.ts', [], [
          createImport('./User', [{ local: 'User' }]),
        ]),
      ];

      const counts = counter.count(symbols, parseResults);

      const key = `${userSymbol.file}#${userSymbol.name}#${userSymbol.line}`;
      expect(counts.get(key)).toBe(2);
      expect(userSymbol.references).toBe(2);
    });

    it('should handle renamed imports', () => {
      const utilsSymbol = createSymbol({
        name: 'formatDate',
        file: 'src/utils.ts',
        exported: true,
      });

      const symbols = [utilsSymbol];

      const parseResults = [
        createParseResult('src/app.ts', [], [
          createImport('./utils', [{ local: 'fd', imported: 'formatDate' }]),
        ]),
      ];

      const counts = counter.count(symbols, parseResults);

      const key = `${utilsSymbol.file}#${utilsSymbol.name}#${utilsSymbol.line}`;
      expect(counts.get(key)).toBe(1);
    });

    it('should not count non-exported symbols', () => {
      const privateSymbol = createSymbol({
        name: 'helperFn',
        file: 'src/utils.ts',
        exported: false,
      });

      const symbols = [privateSymbol];

      const parseResults = [
        createParseResult('src/app.ts', [], [
          createImport('./utils', [{ local: 'helperFn' }]),
        ]),
      ];

      const counts = counter.count(symbols, parseResults);

      const key = `${privateSymbol.file}#${privateSymbol.name}#${privateSymbol.line}`;
      expect(counts.get(key)).toBe(0);
    });

    it('should handle empty symbols array', () => {
      const counts = counter.count([], []);
      expect(counts.size).toBe(0);
    });

    it('should handle empty parse results', () => {
      const symbols = [createSymbol({ name: 'foo', exported: true })];
      const counts = counter.count(symbols, []);

      expect(counts.size).toBe(1);
      const key = 'test/file.ts#foo#1';
      expect(counts.get(key)).toBe(0);
    });

    it('should count multiple symbols from same import', () => {
      const symbol1 = createSymbol({
        name: 'func1',
        file: 'src/utils.ts',
        line: 1,
        exported: true,
      });
      const symbol2 = createSymbol({
        name: 'func2',
        file: 'src/utils.ts',
        line: 10,
        exported: true,
      });

      const symbols = [symbol1, symbol2];

      const parseResults = [
        createParseResult('src/app.ts', [], [
          createImport('./utils', [{ local: 'func1' }, { local: 'func2' }]),
        ]),
      ];

      const counts = counter.count(symbols, parseResults);

      expect(counts.get('src/utils.ts#func1#1')).toBe(1);
      expect(counts.get('src/utils.ts#func2#10')).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Top Referenced Tests
  // --------------------------------------------------------------------------

  describe('getTopReferenced', () => {
    it('should return top N most referenced symbols', () => {
      const symbols = [
        createSymbol({ name: 'a', file: 'a.ts', line: 1, exported: true }),
        createSymbol({ name: 'b', file: 'b.ts', line: 1, exported: true }),
        createSymbol({ name: 'c', file: 'c.ts', line: 1, exported: true }),
      ];

      const parseResults = [
        createParseResult('x.ts', [], [
          createImport('./b', [{ local: 'b' }]),
          createImport('./c', [{ local: 'c' }]),
        ]),
        createParseResult('y.ts', [], [
          createImport('./b', [{ local: 'b' }]),
        ]),
      ];

      counter.count(symbols, parseResults);
      const top = counter.getTopReferenced(2);

      expect(top).toHaveLength(2);
      expect(top[0].name).toBe('b'); // 2 references
      expect(top[1].name).toBe('c'); // 1 reference
    });

    it('should return all symbols if n exceeds count', () => {
      const symbols = [
        createSymbol({ name: 'a', exported: true }),
        createSymbol({ name: 'b', exported: true }),
      ];

      counter.count(symbols, []);
      const top = counter.getTopReferenced(10);

      expect(top).toHaveLength(2);
    });

    it('should return empty array if no symbols', () => {
      counter.count([], []);
      const top = counter.getTopReferenced(5);

      expect(top).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Importance Calculation Tests
  // --------------------------------------------------------------------------

  describe('calculateImportance', () => {
    it('should calculate importance scores', () => {
      const symbols = [
        createSymbol({ name: 'api', file: 'api.ts', exported: true }),
        createSymbol({ name: 'util', file: 'util.ts', exported: true }),
      ];

      const dependencies = [
        createDependencyEdge('app.ts', 'api.ts', ['api']),
        createDependencyEdge('service.ts', 'api.ts', ['api']),
        createDependencyEdge('app.ts', 'util.ts', ['util']),
      ];

      const scores = counter.calculateImportance(symbols, dependencies);

      expect(scores.size).toBe(2);
      // All scores should be between 0 and 1
      for (const score of scores.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('should return empty map for empty symbols', () => {
      const scores = counter.calculateImportance([], []);
      expect(scores.size).toBe(0);
    });

    it('should handle symbols with no references', () => {
      const symbols = [
        createSymbol({ name: 'orphan', file: 'orphan.ts', exported: true }),
      ];

      const scores = counter.calculateImportance(symbols, []);

      expect(scores.size).toBe(1);
      // Single symbol should have normalized score
      const key = 'orphan.ts#orphan#1';
      expect(scores.get(key)).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Ranked Symbols Tests
  // --------------------------------------------------------------------------

  describe('getRankedSymbols', () => {
    it('should return ranked symbols with combined scores', () => {
      const symbols = [
        createSymbol({ name: 'high', file: 'high.ts', exported: true }),
        createSymbol({ name: 'low', file: 'low.ts', exported: true }),
      ];

      const dependencies = [
        createDependencyEdge('a.ts', 'high.ts', ['high']),
        createDependencyEdge('b.ts', 'high.ts', ['high']),
      ];

      // Count references first
      counter.count(symbols, [
        createParseResult('a.ts', [], [
          createImport('./high', [{ local: 'high' }]),
        ]),
        createParseResult('b.ts', [], [
          createImport('./high', [{ local: 'high' }]),
        ]),
      ]);

      const ranked = counter.getRankedSymbols(symbols, dependencies);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].symbol.name).toBe('high');
      expect(ranked[0].referenceCount).toBe(2);
      expect(ranked[0].combinedScore).toBeGreaterThan(ranked[1].combinedScore);
    });

    it('should include all ranking fields', () => {
      const symbols = [createSymbol({ name: 'test', exported: true })];

      const ranked = counter.getRankedSymbols(symbols, []);

      expect(ranked[0]).toHaveProperty('symbol');
      expect(ranked[0]).toHaveProperty('referenceCount');
      expect(ranked[0]).toHaveProperty('importanceScore');
      expect(ranked[0]).toHaveProperty('combinedScore');
    });
  });

  // --------------------------------------------------------------------------
  // Referencing Sources Tests
  // --------------------------------------------------------------------------

  describe('getReferencingSources', () => {
    it('should return files that reference a symbol', () => {
      const dependencies = [
        createDependencyEdge('a.ts', 'utils.ts', ['format']),
        createDependencyEdge('b.ts', 'utils.ts', ['format']),
        createDependencyEdge('c.ts', 'utils.ts', ['parse']),
      ];

      const sources = counter.getReferencingSources(
        'utils.ts#format#1',
        dependencies
      );

      expect(sources).toHaveLength(2);
      expect(sources).toContain('a.ts');
      expect(sources).toContain('b.ts');
    });

    it('should return empty array for unreferenced symbol', () => {
      const dependencies = [
        createDependencyEdge('a.ts', 'utils.ts', ['other']),
      ];

      const sources = counter.getReferencingSources(
        'utils.ts#unused#1',
        dependencies
      );

      expect(sources).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Clustering Coefficient Tests
  // --------------------------------------------------------------------------

  describe('getClusteringCoefficient', () => {
    it('should return 0 for symbol with less than 2 referencers', () => {
      const symbol = createSymbol({ name: 'test', exported: true });
      const dependencies = [createDependencyEdge('a.ts', 'test.ts', ['test'])];

      const coefficient = counter.getClusteringCoefficient(symbol, dependencies);

      expect(coefficient).toBe(0);
    });

    it('should calculate coefficient for interconnected referencers', () => {
      const symbol = createSymbol({
        name: 'shared',
        file: 'shared.ts',
        exported: true,
      });

      // a.ts and b.ts both reference shared, and a.ts imports from b.ts
      const dependencies = [
        createDependencyEdge('a.ts', 'shared.ts', ['shared']),
        createDependencyEdge('b.ts', 'shared.ts', ['shared']),
        createDependencyEdge('a.ts', 'b.ts', ['something']),
      ];

      const coefficient = counter.getClusteringCoefficient(symbol, dependencies);

      // 2 referencers, 1 max connection, 1 actual connection = 1.0
      expect(coefficient).toBe(1);
    });

    it('should return 0 for non-interconnected referencers', () => {
      const symbol = createSymbol({
        name: 'shared',
        file: 'shared.ts',
        exported: true,
      });

      // a.ts and b.ts both reference shared, but don't reference each other
      const dependencies = [
        createDependencyEdge('a.ts', 'shared.ts', ['shared']),
        createDependencyEdge('b.ts', 'shared.ts', ['shared']),
      ];

      const coefficient = counter.getClusteringCoefficient(symbol, dependencies);

      expect(coefficient).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Get Reference Count Tests
  // --------------------------------------------------------------------------

  describe('getReferenceCount', () => {
    it('should return reference count for a symbol', () => {
      const symbol = createSymbol({ name: 'test', file: 'test.ts', exported: true });

      counter.count(
        [symbol],
        [
          createParseResult('a.ts', [], [
            createImport('./test', [{ local: 'test' }]),
          ]),
        ]
      );

      expect(counter.getReferenceCount(symbol)).toBe(1);
    });

    it('should return 0 for uncounted symbol', () => {
      const symbol = createSymbol({ name: 'uncounted', exported: true });

      expect(counter.getReferenceCount(symbol)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Get Importance Score Tests
  // --------------------------------------------------------------------------

  describe('getImportanceScore', () => {
    it('should return importance score after calculation', () => {
      const symbols = [
        createSymbol({ name: 'test', file: 'test.ts', exported: true }),
      ];

      counter.calculateImportance(symbols, []);

      expect(counter.getImportanceScore(symbols[0])).toBeGreaterThanOrEqual(0);
      expect(counter.getImportanceScore(symbols[0])).toBeLessThanOrEqual(1);
    });

    it('should return 0 for symbol without calculated importance', () => {
      const symbol = createSymbol({ name: 'test', exported: true });

      expect(counter.getImportanceScore(symbol)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Statistics Tests
  // --------------------------------------------------------------------------

  describe('getStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const symbols = [
        createSymbol({ name: 'a', file: 'a.ts', exported: true }),
        createSymbol({ name: 'b', file: 'b.ts', exported: true }),
        createSymbol({ name: 'c', file: 'c.ts', exported: false }),
      ];

      counter.count(symbols, [
        createParseResult('x.ts', [], [
          createImport('./a', [{ local: 'a' }]),
          createImport('./a', [{ local: 'a' }]),
        ]),
      ]);

      const stats = counter.getStatistics(symbols);

      expect(stats.totalReferences).toBe(2); // Only 'a' has refs
      expect(stats.averageReferences).toBeCloseTo(0.667, 2);
      expect(stats.maxReferences).toBe(2);
      expect(stats.symbolsWithReferences).toBe(1);
      expect(stats.orphanedExports).toBe(1); // 'b' is exported but unreferenced
      expect(stats.coveragePercent).toBeCloseTo(33.33, 1);
    });

    it('should handle empty symbols array', () => {
      const stats = counter.getStatistics([]);

      expect(stats.totalReferences).toBe(0);
      expect(stats.averageReferences).toBe(0);
      expect(stats.maxReferences).toBe(0);
      expect(stats.symbolsWithReferences).toBe(0);
      expect(stats.orphanedExports).toBe(0);
      expect(stats.coveragePercent).toBe(0);
    });

    it('should correctly identify orphaned exports', () => {
      const symbols = [
        createSymbol({ name: 'used', exported: true }),
        createSymbol({ name: 'unused1', exported: true, file: 'b.ts' }),
        createSymbol({ name: 'unused2', exported: true, file: 'c.ts' }),
        createSymbol({ name: 'private', exported: false, file: 'd.ts' }),
      ];

      counter.count(symbols, [
        createParseResult('x.ts', [], [
          createImport('./a', [{ local: 'used' }]),
        ]),
      ]);

      const stats = counter.getStatistics(symbols);

      expect(stats.orphanedExports).toBe(2); // unused1 and unused2
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle circular references', () => {
      const symbolA = createSymbol({ name: 'A', file: 'a.ts', exported: true });
      const symbolB = createSymbol({ name: 'B', file: 'b.ts', exported: true });

      const symbols = [symbolA, symbolB];

      // Circular: a imports b, b imports a
      const parseResults = [
        createParseResult('a.ts', [], [createImport('./b', [{ local: 'B' }])]),
        createParseResult('b.ts', [], [createImport('./a', [{ local: 'A' }])]),
      ];

      const dependencies = [
        createDependencyEdge('a.ts', 'b.ts', ['B']),
        createDependencyEdge('b.ts', 'a.ts', ['A']),
      ];

      // Should not throw or hang
      counter.count(symbols, parseResults);
      const importance = counter.calculateImportance(symbols, dependencies);

      expect(importance.size).toBe(2);
    });

    it('should handle symbols with same name in different files', () => {
      const symbol1 = createSymbol({
        name: 'Config',
        file: 'config/db.ts',
        exported: true,
      });
      const symbol2 = createSymbol({
        name: 'Config',
        file: 'config/app.ts',
        exported: true,
      });

      const symbols = [symbol1, symbol2];

      // Import references Config - both should get counted
      const parseResults = [
        createParseResult('app.ts', [], [
          createImport('./config', [{ local: 'Config' }]),
        ]),
      ];

      counter.count(symbols, parseResults);

      // Both exported Configs should be counted
      expect(counter.getReferenceCount(symbol1)).toBe(1);
      expect(counter.getReferenceCount(symbol2)).toBe(1);
    });

    it('should handle large number of symbols', () => {
      const symbols: SymbolEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        symbols.push(
          createSymbol({
            name: `func${i}`,
            file: `file${i}.ts`,
            line: 1,
            exported: true,
          })
        );
      }

      // Should complete without issues
      const counts = counter.count(symbols, []);
      const stats = counter.getStatistics(symbols);

      expect(counts.size).toBe(1000);
      expect(stats.totalReferences).toBe(0);
    });
  });
});
