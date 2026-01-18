/**
 * DependencyGraphBuilder Tests
 *
 * Tests for the dependency graph builder including path resolution,
 * alias handling, cycle detection, and graph queries.
 *
 * @module infrastructure/analysis/DependencyGraphBuilder.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DependencyGraphBuilder,
  getDependencyGraphBuilder,
  resetDependencyGraphBuilder,
} from './DependencyGraphBuilder';
import type { ParseResult, ImportStatement, ExportStatement } from './types';

describe('DependencyGraphBuilder', () => {
  let builder: DependencyGraphBuilder;

  // Helper to create mock parse results
  const createParseResult = (
    file: string,
    imports: ImportStatement[] = [],
    exports: ExportStatement[] = []
  ): ParseResult => ({
    success: true,
    file,
    symbols: [],
    imports,
    exports,
    errors: [],
    parseTime: 0,
  });

  beforeEach(() => {
    builder = new DependencyGraphBuilder();
    resetDependencyGraphBuilder();
  });

  // ============================================================================
  // Building Graph Tests
  // ============================================================================

  describe('build', () => {
    it('should build graph from parse results with imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo', imported: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].from).toBe('/project/src/a.ts');
      expect(edges[0].to).toBe('/project/src/b.ts');
      expect(edges[0].type).toBe('import');
      expect(edges[0].symbols).toContain('foo');
    });

    it('should handle multiple imports from same file', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/main.ts', [
          {
            type: 'named',
            source: './utils',
            symbols: [{ local: 'a', imported: 'a' }],
            line: 1,
            typeOnly: false,
          },
          {
            type: 'named',
            source: './utils',
            symbols: [{ local: 'b', imported: 'b' }],
            line: 2,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/utils.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(2);
    });

    it('should handle type-only imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './types',
            symbols: [{ local: 'User', imported: 'User' }],
            line: 1,
            typeOnly: true,
          },
        ]),
        createParseResult('/project/src/types.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('type_import');
    });

    it('should handle re-exports', () => {
      const parseResults: ParseResult[] = [
        createParseResult(
          '/project/src/index.ts',
          [],
          [
            {
              type: 're_export',
              symbols: [{ local: '*' }],
              source: './utils',
              line: 1,
            },
          ]
        ),
        createParseResult('/project/src/utils.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('export_from');
    });

    it('should skip external modules', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: 'react',
            symbols: [{ local: 'useState' }],
            line: 1,
            typeOnly: false,
          },
          {
            type: 'named',
            source: '@tanstack/react-query',
            symbols: [{ local: 'useQuery' }],
            line: 2,
            typeOnly: false,
          },
        ]),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(0);
    });

    it('should handle side-effect imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/main.ts', [
          {
            type: 'side_effect',
            source: './styles',
            symbols: [],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/styles.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('side_effect');
      expect(edges[0].symbols).toHaveLength(0);
    });

    it('should handle require imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'require',
            source: './b',
            symbols: [],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('require');
    });

    it('should handle dynamic imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'dynamic',
            source: './lazy',
            symbols: [],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/lazy.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('dynamic');
    });
  });

  // ============================================================================
  // Path Resolution Tests
  // ============================================================================

  describe('resolveImport', () => {
    beforeEach(() => {
      // Set up known files
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts'),
        createParseResult('/project/src/b.ts'),
        createParseResult('/project/src/utils/index.ts'),
        createParseResult('/project/src/utils/helpers.ts'),
      ];
      builder.build(parseResults, '/project');
    });

    it('should resolve relative imports', () => {
      const resolved = builder.resolveImport(
        './b',
        '/project/src/a.ts',
        '/project'
      );
      expect(resolved).toBe('/project/src/b.ts');
    });

    it('should resolve with extension', () => {
      const resolved = builder.resolveImport(
        './b.ts',
        '/project/src/a.ts',
        '/project'
      );
      expect(resolved).toBe('/project/src/b.ts');
    });

    it('should resolve index files', () => {
      const resolved = builder.resolveImport(
        './utils',
        '/project/src/a.ts',
        '/project'
      );
      expect(resolved).toBe('/project/src/utils/index.ts');
    });

    it('should resolve parent directory imports', () => {
      const resolved = builder.resolveImport(
        '../a',
        '/project/src/utils/helpers.ts',
        '/project'
      );
      expect(resolved).toBe('/project/src/a.ts');
    });

    it('should return null for external modules', () => {
      const resolved = builder.resolveImport(
        'react',
        '/project/src/a.ts',
        '/project'
      );
      expect(resolved).toBeNull();
    });

    it('should return null for scoped packages', () => {
      const resolved = builder.resolveImport(
        '@tanstack/react-query',
        '/project/src/a.ts',
        '/project'
      );
      expect(resolved).toBeNull();
    });
  });

  // ============================================================================
  // Alias Resolution Tests
  // ============================================================================

  describe('alias resolution', () => {
    beforeEach(() => {
      builder.registerAlias('@/', 'src/');
    });

    it('should resolve aliased imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/pages/home.ts', [
          {
            type: 'named',
            source: '@/utils/helpers',
            symbols: [{ local: 'formatDate' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/utils/helpers.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].to).toBe('/project/src/utils/helpers.ts');
    });

    it('should clear aliases', () => {
      builder.clearAliases();

      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: '@/utils',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/utils.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      // @/ without alias registered is treated as external
      expect(edges).toHaveLength(0);
    });
  });

  // ============================================================================
  // Graph Query Tests
  // ============================================================================

  describe('getDependents', () => {
    it('should return files that import the given file', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './shared',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './shared',
            symbols: [{ local: 'bar' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/shared.ts', []),
      ];

      builder.build(parseResults, '/project');

      const dependents = builder.getDependents('/project/src/shared.ts');

      expect(dependents).toHaveLength(2);
      expect(dependents).toContain('/project/src/a.ts');
      expect(dependents).toContain('/project/src/b.ts');
    });

    it('should return empty array for file with no dependents', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', []),
      ];

      builder.build(parseResults, '/project');

      const dependents = builder.getDependents('/project/src/a.ts');

      expect(dependents).toHaveLength(0);
    });
  });

  describe('getDependencies', () => {
    it('should return files imported by the given file', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/main.ts', [
          {
            type: 'named',
            source: './a',
            symbols: [{ local: 'a' }],
            line: 1,
            typeOnly: false,
          },
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'b' }],
            line: 2,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/a.ts', []),
        createParseResult('/project/src/b.ts', []),
      ];

      builder.build(parseResults, '/project');

      const dependencies = builder.getDependencies('/project/src/main.ts');

      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain('/project/src/a.ts');
      expect(dependencies).toContain('/project/src/b.ts');
    });
  });

  describe('getEdgesForFile', () => {
    it('should return all edges involving a file', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './c',
            symbols: [{ local: 'bar' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/c.ts', []),
      ];

      builder.build(parseResults, '/project');

      const edges = builder.getEdgesForFile('/project/src/b.ts');

      expect(edges).toHaveLength(2);
      // b imports c
      expect(edges.some((e) => e.from === '/project/src/b.ts')).toBe(true);
      // a imports b
      expect(edges.some((e) => e.to === '/project/src/b.ts')).toBe(true);
    });
  });

  // ============================================================================
  // Cycle Detection Tests
  // ============================================================================

  describe('findCircularDependencies', () => {
    it('should find direct circular dependency', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './a',
            symbols: [{ local: 'bar' }],
            line: 1,
            typeOnly: false,
          },
        ]),
      ];

      builder.build(parseResults, '/project');

      const cycles = builder.findCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      // Should find cycle a -> b -> a
      const cycleFiles = cycles.flat();
      expect(cycleFiles).toContain('/project/src/a.ts');
      expect(cycleFiles).toContain('/project/src/b.ts');
    });

    it('should find indirect circular dependency', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './c',
            symbols: [{ local: 'bar' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/c.ts', [
          {
            type: 'named',
            source: './a',
            symbols: [{ local: 'baz' }],
            line: 1,
            typeOnly: false,
          },
        ]),
      ];

      builder.build(parseResults, '/project');

      const cycles = builder.findCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty array when no cycles exist', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', []),
      ];

      builder.build(parseResults, '/project');

      const cycles = builder.findCircularDependencies();

      expect(cycles).toHaveLength(0);
    });
  });

  // ============================================================================
  // Analysis Tests
  // ============================================================================

  describe('getSortedByConnections', () => {
    it('should sort files by connection count', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './shared',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './shared',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/c.ts', [
          {
            type: 'named',
            source: './shared',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/shared.ts', []),
      ];

      builder.build(parseResults, '/project');

      const sorted = builder.getSortedByConnections();

      // shared.ts should be first (3 dependents)
      expect(sorted[0].file).toBe('/project/src/shared.ts');
      expect(sorted[0].connections).toBe(3);
    });
  });

  describe('calculateDepth', () => {
    it('should calculate dependency depth', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/b.ts', [
          {
            type: 'named',
            source: './c',
            symbols: [{ local: 'bar' }],
            line: 1,
            typeOnly: false,
          },
        ]),
        createParseResult('/project/src/c.ts', []),
      ];

      builder.build(parseResults, '/project');

      const depth = builder.calculateDepth('/project/src/a.ts');

      expect(depth).toBe(2); // a -> b -> c
    });

    it('should return 0 for file with no dependencies', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/leaf.ts', []),
      ];

      builder.build(parseResults, '/project');

      const depth = builder.calculateDepth('/project/src/leaf.ts');

      expect(depth).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './b',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
          {
            type: 'named',
            source: './c',
            symbols: [{ local: 'bar' }],
            line: 2,
            typeOnly: true,
          },
        ]),
        createParseResult('/project/src/b.ts', []),
        createParseResult('/project/src/c.ts', []),
      ];

      builder.build(parseResults, '/project');

      const stats = builder.getStatistics();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalEdges).toBe(2);
      expect(stats.edgesByType.import).toBe(1);
      expect(stats.edgesByType.type_import).toBe(1);
      expect(stats.circularDependencies).toBe(0);
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getDependencyGraphBuilder();
      const instance2 = getDependencyGraphBuilder();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getDependencyGraphBuilder();
      resetDependencyGraphBuilder();
      const instance2 = getDependencyGraphBuilder();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty parse results', () => {
      const edges = builder.build([], '/project');

      expect(edges).toHaveLength(0);
    });

    it('should handle files with no imports', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', []),
        createParseResult('/project/src/b.ts', []),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(0);
    });

    it('should handle unresolvable imports gracefully', () => {
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './nonexistent',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(0);
    });

    it('should handle self-imports', () => {
      // While unusual, this shouldn't crash
      const parseResults: ParseResult[] = [
        createParseResult('/project/src/a.ts', [
          {
            type: 'named',
            source: './a',
            symbols: [{ local: 'foo' }],
            line: 1,
            typeOnly: false,
          },
        ]),
      ];

      const edges = builder.build(parseResults, '/project');

      expect(edges).toHaveLength(1);
      expect(edges[0].from).toBe(edges[0].to);
    });
  });
});
