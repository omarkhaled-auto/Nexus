/**
 * SymbolExtractor Tests
 *
 * Unit tests for the SymbolExtractor utility class.
 *
 * @module infrastructure/analysis/SymbolExtractor.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SymbolExtractor, resetSymbolExtractor, getSymbolExtractor } from './SymbolExtractor';
import type { SymbolEntry, ParseResult, SymbolKind } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createSymbol(overrides: Partial<SymbolEntry> = {}): SymbolEntry {
  return {
    id: overrides.id || 'test/file.ts#TestSymbol#1',
    name: overrides.name || 'TestSymbol',
    kind: overrides.kind || 'function',
    file: overrides.file || 'test/file.ts',
    line: overrides.line || 1,
    endLine: overrides.endLine || 10,
    column: overrides.column || 0,
    signature: overrides.signature || 'TestSymbol()',
    documentation: overrides.documentation,
    references: overrides.references || 0,
    exported: overrides.exported || false,
    parentId: overrides.parentId,
    modifiers: overrides.modifiers || [],
  };
}

function createParseResult(symbols: SymbolEntry[]): ParseResult {
  return {
    success: true,
    file: symbols[0]?.file || 'test/file.ts',
    symbols,
    imports: [],
    exports: [],
    errors: [],
    parseTime: 10,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SymbolExtractor', () => {
  let extractor: SymbolExtractor;

  beforeEach(() => {
    resetSymbolExtractor();
    extractor = new SymbolExtractor();
  });

  // --------------------------------------------------------------------------
  // Singleton Tests
  // --------------------------------------------------------------------------

  describe('singleton', () => {
    it('should return same instance from getSymbolExtractor', () => {
      const instance1 = getSymbolExtractor();
      const instance2 = getSymbolExtractor();
      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = getSymbolExtractor();
      resetSymbolExtractor();
      const instance2 = getSymbolExtractor();
      expect(instance1).not.toBe(instance2);
    });
  });

  // --------------------------------------------------------------------------
  // Processing Tests
  // --------------------------------------------------------------------------

  describe('processSymbols', () => {
    it('should process symbols from multiple parse results into a Map', () => {
      const symbol1 = createSymbol({ name: 'func1', file: 'a.ts', line: 1 });
      const symbol2 = createSymbol({ name: 'func2', file: 'b.ts', line: 1 });
      const parseResults: ParseResult[] = [
        createParseResult([symbol1]),
        createParseResult([symbol2]),
      ];

      const result = extractor.processSymbols(parseResults);

      expect(result.size).toBe(2);
      expect(result.get('a.ts#func1#1')).toBe(symbol1);
      expect(result.get('b.ts#func2#1')).toBe(symbol2);
    });

    it('should handle empty parse results', () => {
      const result = extractor.processSymbols([]);
      expect(result.size).toBe(0);
    });
  });

  describe('createSymbolKey', () => {
    it('should create key from file, name, and line', () => {
      const symbol = createSymbol({
        file: 'src/utils.ts',
        name: 'myFunction',
        line: 42,
      });

      const key = extractor.createSymbolKey(symbol);

      expect(key).toBe('src/utils.ts#myFunction#42');
    });
  });

  // --------------------------------------------------------------------------
  // Filtering Tests
  // --------------------------------------------------------------------------

  describe('filterByKind', () => {
    it('should filter symbols by kind', () => {
      const symbols = [
        createSymbol({ kind: 'function', name: 'func1' }),
        createSymbol({ kind: 'class', name: 'Class1' }),
        createSymbol({ kind: 'function', name: 'func2' }),
        createSymbol({ kind: 'interface', name: 'Interface1' }),
      ];

      const functions = extractor.filterByKind(symbols, 'function');

      expect(functions).toHaveLength(2);
      expect(functions.map((s) => s.name)).toEqual(['func1', 'func2']);
    });

    it('should return empty array when no matches', () => {
      const symbols = [createSymbol({ kind: 'function' })];

      const result = extractor.filterByKind(symbols, 'class');

      expect(result).toHaveLength(0);
    });
  });

  describe('getExportedSymbols', () => {
    it('should return only exported symbols', () => {
      const symbols = [
        createSymbol({ name: 'exported1', exported: true }),
        createSymbol({ name: 'private1', exported: false }),
        createSymbol({ name: 'exported2', exported: true }),
      ];

      const exported = extractor.getExportedSymbols(symbols);

      expect(exported).toHaveLength(2);
      expect(exported.map((s) => s.name)).toEqual(['exported1', 'exported2']);
    });
  });

  describe('getTopLevelSymbols', () => {
    it('should return symbols with no parent', () => {
      const parentSymbol = createSymbol({
        id: 'file.ts#Parent#1',
        name: 'Parent',
        kind: 'class',
      });
      const childSymbol = createSymbol({
        name: 'child',
        kind: 'method',
        parentId: 'file.ts#Parent#1',
      });
      const topLevelFunc = createSymbol({ name: 'topFunc', kind: 'function' });

      const symbols = [parentSymbol, childSymbol, topLevelFunc];

      const topLevel = extractor.getTopLevelSymbols(symbols);

      expect(topLevel).toHaveLength(2);
      expect(topLevel.map((s) => s.name)).toContain('Parent');
      expect(topLevel.map((s) => s.name)).toContain('topFunc');
    });
  });

  describe('getChildSymbols', () => {
    it('should return child symbols of a parent', () => {
      const parentId = 'file.ts#Parent#1';
      const symbols = [
        createSymbol({ id: parentId, name: 'Parent', kind: 'class' }),
        createSymbol({ name: 'method1', kind: 'method', parentId }),
        createSymbol({ name: 'method2', kind: 'method', parentId }),
        createSymbol({ name: 'otherFunc', kind: 'function' }),
      ];

      const children = extractor.getChildSymbols(symbols, parentId);

      expect(children).toHaveLength(2);
      expect(children.map((s) => s.name)).toEqual(['method1', 'method2']);
    });

    it('should return empty array when parent has no children', () => {
      const symbols = [createSymbol({ name: 'lonely', kind: 'class' })];

      const children = extractor.getChildSymbols(symbols, 'file.ts#lonely#1');

      expect(children).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Hierarchy Tests
  // --------------------------------------------------------------------------

  describe('buildHierarchy', () => {
    it('should build tree structure from flat symbols', () => {
      const classSymbol = createSymbol({
        id: 'file.ts#MyClass#1',
        name: 'MyClass',
        kind: 'class',
        line: 1,
        endLine: 20,
      });
      const method1 = createSymbol({
        id: 'file.ts#method1#5',
        name: 'method1',
        kind: 'method',
        line: 5,
        parentId: 'file.ts#MyClass#1',
      });
      const method2 = createSymbol({
        id: 'file.ts#method2#10',
        name: 'method2',
        kind: 'method',
        line: 10,
        parentId: 'file.ts#MyClass#1',
      });
      const topFunc = createSymbol({
        id: 'file.ts#topFunc#25',
        name: 'topFunc',
        kind: 'function',
        line: 25,
      });

      const symbols = [classSymbol, method1, method2, topFunc];

      const hierarchy = extractor.buildHierarchy(symbols);

      expect(hierarchy).toHaveLength(2); // class and top-level function

      const classNode = hierarchy.find((n) => n.symbol.name === 'MyClass');
      expect(classNode).toBeDefined();
      expect(classNode!.children).toHaveLength(2);
      expect(classNode!.children.map((c) => c.symbol.name)).toContain('method1');
      expect(classNode!.children.map((c) => c.symbol.name)).toContain('method2');

      const funcNode = hierarchy.find((n) => n.symbol.name === 'topFunc');
      expect(funcNode).toBeDefined();
      expect(funcNode!.children).toHaveLength(0);
    });

    it('should handle empty symbols array', () => {
      const hierarchy = extractor.buildHierarchy([]);
      expect(hierarchy).toHaveLength(0);
    });

    it('should handle nested hierarchy', () => {
      const namespace = createSymbol({
        id: 'file.ts#NS#1',
        name: 'NS',
        kind: 'namespace',
      });
      const classInNs = createSymbol({
        id: 'file.ts#MyClass#5',
        name: 'MyClass',
        kind: 'class',
        parentId: 'file.ts#NS#1',
      });
      const methodInClass = createSymbol({
        id: 'file.ts#method#10',
        name: 'method',
        kind: 'method',
        parentId: 'file.ts#MyClass#5',
      });

      const symbols = [namespace, classInNs, methodInClass];

      const hierarchy = extractor.buildHierarchy(symbols);

      expect(hierarchy).toHaveLength(1); // Only namespace at top level
      expect(hierarchy[0].symbol.name).toBe('NS');
      expect(hierarchy[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].symbol.name).toBe('MyClass');
      expect(hierarchy[0].children[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].children[0].symbol.name).toBe('method');
    });
  });

  // --------------------------------------------------------------------------
  // Grouping Tests
  // --------------------------------------------------------------------------

  describe('groupByFile', () => {
    it('should group symbols by file path', () => {
      const symbols = [
        createSymbol({ name: 'func1', file: 'a.ts' }),
        createSymbol({ name: 'func2', file: 'b.ts' }),
        createSymbol({ name: 'func3', file: 'a.ts' }),
      ];

      const groups = extractor.groupByFile(symbols);

      expect(groups.size).toBe(2);
      expect(groups.get('a.ts')).toHaveLength(2);
      expect(groups.get('b.ts')).toHaveLength(1);
    });

    it('should handle empty symbols array', () => {
      const groups = extractor.groupByFile([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('groupByKind', () => {
    it('should group symbols by kind', () => {
      const symbols = [
        createSymbol({ kind: 'function', name: 'func1' }),
        createSymbol({ kind: 'class', name: 'Class1' }),
        createSymbol({ kind: 'function', name: 'func2' }),
      ];

      const groups = extractor.groupByKind(symbols);

      expect(groups.size).toBe(2);
      expect(groups.get('function')).toHaveLength(2);
      expect(groups.get('class')).toHaveLength(1);
    });

    it('should handle all symbol kinds', () => {
      const kinds: SymbolKind[] = [
        'class', 'interface', 'function', 'method', 'property',
        'variable', 'constant', 'type', 'enum', 'enum_member',
        'namespace', 'module',
      ];
      const symbols = kinds.map((kind) => createSymbol({ kind, name: `${kind}1` }));

      const groups = extractor.groupByKind(symbols);

      expect(groups.size).toBe(kinds.length);
    });
  });

  // --------------------------------------------------------------------------
  // Search Tests
  // --------------------------------------------------------------------------

  describe('searchByName', () => {
    it('should find symbols by partial name match (case-insensitive)', () => {
      const symbols = [
        createSymbol({ name: 'getUserById' }),
        createSymbol({ name: 'getAllUsers' }),
        createSymbol({ name: 'createProduct' }),
      ];

      const results = extractor.searchByName(symbols, 'user');

      expect(results).toHaveLength(2);
      expect(results.map((s) => s.name)).toContain('getUserById');
      expect(results.map((s) => s.name)).toContain('getAllUsers');
    });

    it('should be case-insensitive', () => {
      const symbols = [
        createSymbol({ name: 'MyClass' }),
        createSymbol({ name: 'myFunction' }),
      ];

      const results = extractor.searchByName(symbols, 'MY');

      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const symbols = [createSymbol({ name: 'foo' })];

      const results = extractor.searchByName(symbols, 'xyz');

      expect(results).toHaveLength(0);
    });
  });

  describe('findByName', () => {
    it('should find symbols by exact name match', () => {
      const symbols = [
        createSymbol({ name: 'User', file: 'a.ts' }),
        createSymbol({ name: 'User', file: 'b.ts' }),
        createSymbol({ name: 'UserService', file: 'c.ts' }),
      ];

      const results = extractor.findByName(symbols, 'User');

      expect(results).toHaveLength(2);
      expect(results.every((s) => s.name === 'User')).toBe(true);
    });

    it('should be case-sensitive', () => {
      const symbols = [
        createSymbol({ name: 'User' }),
        createSymbol({ name: 'user' }),
      ];

      const results = extractor.findByName(symbols, 'User');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('User');
    });
  });

  describe('findAtLocation', () => {
    it('should find symbol at specific file and line', () => {
      const symbols = [
        createSymbol({ name: 'func1', file: 'test.ts', line: 1, endLine: 5 }),
        createSymbol({ name: 'func2', file: 'test.ts', line: 10, endLine: 15 }),
        createSymbol({ name: 'func3', file: 'other.ts', line: 1, endLine: 5 }),
      ];

      const result = extractor.findAtLocation(symbols, 'test.ts', 12);

      expect(result).toBeDefined();
      expect(result!.name).toBe('func2');
    });

    it('should return undefined when no symbol at location', () => {
      const symbols = [
        createSymbol({ name: 'func1', file: 'test.ts', line: 1, endLine: 5 }),
      ];

      const result = extractor.findAtLocation(symbols, 'test.ts', 100);

      expect(result).toBeUndefined();
    });

    it('should return undefined for wrong file', () => {
      const symbols = [
        createSymbol({ name: 'func1', file: 'test.ts', line: 1, endLine: 5 }),
      ];

      const result = extractor.findAtLocation(symbols, 'other.ts', 3);

      expect(result).toBeUndefined();
    });

    it('should match inclusive of start and end lines', () => {
      const symbols = [
        createSymbol({ name: 'func', file: 'test.ts', line: 5, endLine: 10 }),
      ];

      expect(extractor.findAtLocation(symbols, 'test.ts', 5)?.name).toBe('func');
      expect(extractor.findAtLocation(symbols, 'test.ts', 10)?.name).toBe('func');
      expect(extractor.findAtLocation(symbols, 'test.ts', 4)).toBeUndefined();
      expect(extractor.findAtLocation(symbols, 'test.ts', 11)).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Statistics Tests
  // --------------------------------------------------------------------------

  describe('getStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const symbols = [
        createSymbol({ kind: 'function', exported: true, documentation: 'docs' }),
        createSymbol({ kind: 'function', exported: false }),
        createSymbol({ kind: 'class', exported: true, documentation: 'docs' }),
        createSymbol({ kind: 'interface', exported: true }),
      ];

      const stats = extractor.getStatistics(symbols);

      expect(stats.total).toBe(4);
      expect(stats.byKind.function).toBe(2);
      expect(stats.byKind.class).toBe(1);
      expect(stats.byKind.interface).toBe(1);
      expect(stats.exported).toBe(3);
      expect(stats.documented).toBe(2);
      expect(stats.documentationCoverage).toBe(0.5);
    });

    it('should handle empty symbols array', () => {
      const stats = extractor.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.exported).toBe(0);
      expect(stats.documented).toBe(0);
      expect(stats.documentationCoverage).toBe(0);
    });

    it('should count symbols by file', () => {
      const symbols = [
        createSymbol({ file: 'a.ts' }),
        createSymbol({ file: 'a.ts' }),
        createSymbol({ file: 'b.ts' }),
      ];

      const stats = extractor.getStatistics(symbols);

      expect(stats.byFile['a.ts']).toBe(2);
      expect(stats.byFile['b.ts']).toBe(1);
    });

    it('should initialize all kind counts to 0', () => {
      const stats = extractor.getStatistics([]);

      expect(stats.byKind.class).toBe(0);
      expect(stats.byKind.interface).toBe(0);
      expect(stats.byKind.function).toBe(0);
      expect(stats.byKind.method).toBe(0);
      expect(stats.byKind.property).toBe(0);
      expect(stats.byKind.variable).toBe(0);
      expect(stats.byKind.constant).toBe(0);
      expect(stats.byKind.type).toBe(0);
      expect(stats.byKind.enum).toBe(0);
      expect(stats.byKind.enum_member).toBe(0);
      expect(stats.byKind.namespace).toBe(0);
      expect(stats.byKind.module).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Sorting Tests
  // --------------------------------------------------------------------------

  describe('sortSymbols', () => {
    it('should sort by name alphabetically', () => {
      const symbols = [
        createSymbol({ name: 'zebra' }),
        createSymbol({ name: 'apple' }),
        createSymbol({ name: 'mango' }),
      ];

      const sorted = extractor.sortSymbols(symbols, 'name');

      expect(sorted.map((s) => s.name)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('should sort by file then line', () => {
      const symbols = [
        createSymbol({ name: 's1', file: 'b.ts', line: 10 }),
        createSymbol({ name: 's2', file: 'a.ts', line: 5 }),
        createSymbol({ name: 's3', file: 'a.ts', line: 1 }),
      ];

      const sorted = extractor.sortSymbols(symbols, 'file');

      expect(sorted.map((s) => s.name)).toEqual(['s3', 's2', 's1']);
    });

    it('should sort by references descending', () => {
      const symbols = [
        createSymbol({ name: 's1', references: 5 }),
        createSymbol({ name: 's2', references: 10 }),
        createSymbol({ name: 's3', references: 1 }),
      ];

      const sorted = extractor.sortSymbols(symbols, 'references');

      expect(sorted.map((s) => s.name)).toEqual(['s2', 's1', 's3']);
    });

    it('should sort by line (file then line)', () => {
      const symbols = [
        createSymbol({ name: 's1', file: 'a.ts', line: 20 }),
        createSymbol({ name: 's2', file: 'a.ts', line: 5 }),
        createSymbol({ name: 's3', file: 'b.ts', line: 1 }),
      ];

      const sorted = extractor.sortSymbols(symbols, 'line');

      expect(sorted.map((s) => s.name)).toEqual(['s2', 's1', 's3']);
    });

    it('should not mutate original array', () => {
      const symbols = [
        createSymbol({ name: 'b' }),
        createSymbol({ name: 'a' }),
      ];

      const sorted = extractor.sortSymbols(symbols, 'name');

      expect(symbols[0].name).toBe('b');
      expect(sorted[0].name).toBe('a');
    });
  });

  // --------------------------------------------------------------------------
  // Deduplication Tests
  // --------------------------------------------------------------------------

  describe('deduplicate', () => {
    it('should remove duplicate symbols based on key', () => {
      const symbol1 = createSymbol({ name: 'func', file: 'a.ts', line: 1 });
      const symbol2 = createSymbol({ name: 'func', file: 'a.ts', line: 1 }); // duplicate
      const symbol3 = createSymbol({ name: 'func', file: 'b.ts', line: 1 }); // different file

      const result = extractor.deduplicate([symbol1, symbol2, symbol3]);

      expect(result).toHaveLength(2);
    });

    it('should preserve order of first occurrence', () => {
      const symbol1 = createSymbol({ name: 'first', file: 'a.ts', line: 1 });
      const symbol2 = createSymbol({ name: 'second', file: 'b.ts', line: 1 });
      const symbol3 = createSymbol({ name: 'first', file: 'a.ts', line: 1 }); // duplicate

      const result = extractor.deduplicate([symbol1, symbol2, symbol3]);

      expect(result.map((s) => s.name)).toEqual(['first', 'second']);
    });

    it('should handle empty array', () => {
      const result = extractor.deduplicate([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('mergeSymbols', () => {
    it('should merge symbols from multiple parse results', () => {
      const result1 = createParseResult([
        createSymbol({ name: 'func1', file: 'a.ts', line: 1 }),
      ]);
      const result2 = createParseResult([
        createSymbol({ name: 'func2', file: 'b.ts', line: 1 }),
      ]);

      const merged = extractor.mergeSymbols([result1, result2]);

      expect(merged).toHaveLength(2);
      expect(merged.map((s) => s.name)).toContain('func1');
      expect(merged.map((s) => s.name)).toContain('func2');
    });

    it('should deduplicate during merge', () => {
      const symbol = createSymbol({ name: 'shared', file: 'shared.ts', line: 1 });
      const result1 = createParseResult([symbol]);
      const result2 = createParseResult([{ ...symbol }]); // Same symbol in different result

      const merged = extractor.mergeSymbols([result1, result2]);

      expect(merged).toHaveLength(1);
    });

    it('should handle empty parse results', () => {
      const merged = extractor.mergeSymbols([]);
      expect(merged).toHaveLength(0);
    });
  });
});
