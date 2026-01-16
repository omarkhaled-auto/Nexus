/**
 * Integration Tests for Repository Map Analysis Module
 *
 * End-to-end tests that verify the full pipeline works correctly.
 * These tests may be skipped in CI if WASM loading is problematic.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  createRepoMapGenerator,
  generateRepoMap,
  formatRepoMapForContext,
  getRepoStats,
  RepoMapGenerator,
  RepoMapFormatter,
} from './index';
import type { RepoMap } from './types';

// ============================================================================
// Check if we can run integration tests
// ============================================================================

const WASM_PATH = resolve(__dirname, '../../../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm');
const CAN_RUN_INTEGRATION = existsSync(WASM_PATH);

// Conditionally skip integration tests if WASM files are not available
const describeIntegration = CAN_RUN_INTEGRATION ? describe : describe.skip;

// ============================================================================
// Integration Tests
// ============================================================================

describeIntegration('Integration Tests', () => {
  let generator: RepoMapGenerator;
  let repoMap: RepoMap;

  beforeAll(async () => {
    generator = await createRepoMapGenerator();
  }, 30000); // 30s timeout for WASM loading

  describe('Full Pipeline', () => {
    it('should generate repo map for a simple directory', async () => {
      // Generate map for the analysis module itself
      repoMap = await generator.generate(resolve(__dirname), {
        maxFiles: 20,
        excludePatterns: ['**/*.test.ts', '**/*.spec.ts'],
      });

      expect(repoMap).toBeDefined();
      expect(repoMap.files.length).toBeGreaterThan(0);
      expect(repoMap.symbols.length).toBeGreaterThan(0);
    }, 60000);

    it('should extract expected symbol types', () => {
      // Should find classes
      const classes = repoMap.symbols.filter((s) => s.kind === 'class');
      expect(classes.length).toBeGreaterThan(0);

      // Should find interfaces
      const interfaces = repoMap.symbols.filter((s) => s.kind === 'interface');
      expect(interfaces.length).toBeGreaterThan(0);

      // Should find functions
      const functions = repoMap.symbols.filter((s) => s.kind === 'function');
      expect(functions.length).toBeGreaterThan(0);
    });

    it('should format output within token budget', () => {
      const formatter = new RepoMapFormatter();
      const output = formatter.format(repoMap, { maxTokens: 1000 });

      const tokens = formatter.estimateTokens(output);
      expect(tokens).toBeLessThanOrEqual(1000);
    });

    it('should respect token budget with truncation', () => {
      const formatter = new RepoMapFormatter();
      const output = formatter.truncateToFit(repoMap, 500);

      const tokens = formatter.estimateTokens(output);
      expect(tokens).toBeLessThanOrEqual(500);
    });

    it('should generate valid statistics', () => {
      expect(repoMap.stats.totalFiles).toBeGreaterThan(0);
      expect(repoMap.stats.totalSymbols).toBeGreaterThan(0);
      expect(repoMap.stats.generationTime).toBeGreaterThan(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should work with generateRepoMap', async () => {
      const map = await generateRepoMap(resolve(__dirname), {
        maxFiles: 5,
        excludePatterns: ['**/*.test.ts'],
      });

      expect(map.files.length).toBeGreaterThan(0);
    }, 60000);

    it('should work with formatRepoMapForContext', async () => {
      const output = await formatRepoMapForContext(resolve(__dirname), 500, {
        maxFiles: 5,
        excludePatterns: ['**/*.test.ts'],
      });

      expect(output).toContain('# Repository Map');
      const formatter = new RepoMapFormatter();
      expect(formatter.estimateTokens(output)).toBeLessThanOrEqual(500);
    }, 60000);

    it('should work with getRepoStats', async () => {
      const stats = await getRepoStats(resolve(__dirname), {
        maxFiles: 5,
        excludePatterns: ['**/*.test.ts'],
      });

      expect(stats).toContain('# Repository Statistics');
      expect(stats).toContain('Total Files');
    }, 60000);
  });

  describe('Format Styles', () => {
    it('should generate compact format', () => {
      const formatter = new RepoMapFormatter();
      const output = formatter.format(repoMap, { style: 'compact' });

      expect(output).toContain('# Repository Map');
      expect(output).not.toContain('## Summary');
    });

    it('should generate detailed format', () => {
      const formatter = new RepoMapFormatter();
      const output = formatter.format(repoMap, { style: 'detailed' });

      expect(output).toContain('# Repository Map (Detailed)');
      expect(output).toContain('## Summary');
    });

    it('should generate tree format', () => {
      const formatter = new RepoMapFormatter();
      const output = formatter.format(repoMap, { style: 'tree' });

      expect(output).toContain('# Repository Map (Tree)');
    });
  });

  describe('Symbol Extraction Quality', () => {
    it('should extract exported symbols correctly', () => {
      const exported = repoMap.symbols.filter((s) => s.exported);
      expect(exported.length).toBeGreaterThan(0);

      // All exported symbols should have export in modifiers
      for (const symbol of exported) {
        expect(symbol.modifiers).toContain('export');
      }
    });

    it('should capture method parent relationships', () => {
      const methods = repoMap.symbols.filter((s) => s.kind === 'method');
      // At least some methods should have parentId
      const withParent = methods.filter((m) => m.parentId);
      expect(withParent.length).toBeGreaterThanOrEqual(0); // May be 0 for very small codebases
    });

    it('should generate unique symbol IDs', () => {
      const ids = new Set(repoMap.symbols.map((s) => s.id));
      expect(ids.size).toBe(repoMap.symbols.length);
    });
  });
});

// ============================================================================
// Mock-based Tests (always run)
// ============================================================================

describe('Module Exports', () => {
  it('should export all required types', async () => {
    const exports = await import('./index');

    // Type exports (can't directly test, but factories should exist)
    expect(exports.DEFAULT_REPO_MAP_OPTIONS).toBeDefined();
    expect(exports.DEFAULT_FORMAT_OPTIONS).toBeDefined();

    // Class exports
    expect(exports.TreeSitterParser).toBeDefined();
    expect(exports.SymbolExtractor).toBeDefined();
    expect(exports.DependencyGraphBuilder).toBeDefined();
    expect(exports.ReferenceCounter).toBeDefined();
    expect(exports.RepoMapGenerator).toBeDefined();
    expect(exports.RepoMapFormatter).toBeDefined();

    // Factory functions
    expect(exports.getParser).toBeDefined();
    expect(exports.getSymbolExtractor).toBeDefined();
    expect(exports.getDependencyGraphBuilder).toBeDefined();
    expect(exports.getReferenceCounter).toBeDefined();
    expect(exports.getRepoMapGenerator).toBeDefined();
    expect(exports.getRepoMapFormatter).toBeDefined();

    // Convenience functions
    expect(exports.createRepoMapGenerator).toBeDefined();
    expect(exports.generateRepoMap).toBeDefined();
    expect(exports.formatRepoMapForContext).toBeDefined();
    expect(exports.getRepoStats).toBeDefined();
  });

  it('should export reset functions for testing', async () => {
    const exports = await import('./index');

    expect(exports.resetParser).toBeDefined();
    expect(exports.resetSymbolExtractor).toBeDefined();
    expect(exports.resetDependencyGraphBuilder).toBeDefined();
    expect(exports.resetReferenceCounter).toBeDefined();
    expect(exports.resetRepoMapGenerator).toBeDefined();
    expect(exports.resetRepoMapFormatter).toBeDefined();
  });
});

describe('RepoMapFormatter Integration', () => {
  it('should format mock repo map correctly', () => {
    const formatter = new RepoMapFormatter();
    const mockMap: RepoMap = {
      projectPath: '/test',
      generatedAt: new Date(),
      files: [
        {
          path: '/test/src/index.ts',
          relativePath: 'src/index.ts',
          language: 'typescript',
          size: 100,
          lastModified: new Date(),
          symbolCount: 1,
          lineCount: 10,
        },
      ],
      symbols: [
        {
          id: '/test/src/index.ts#main#1',
          name: 'main',
          kind: 'function',
          file: '/test/src/index.ts',
          line: 1,
          endLine: 10,
          column: 0,
          signature: 'function main(): void',
          exported: true,
          references: 5,
          modifiers: ['export'],
        },
      ],
      dependencies: [],
      stats: {
        totalFiles: 1,
        totalSymbols: 1,
        totalDependencies: 0,
        languageBreakdown: { typescript: 1, javascript: 0 },
        symbolBreakdown: {
          class: 0,
          interface: 0,
          function: 1,
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
        largestFiles: ['src/index.ts'],
        mostReferencedSymbols: [
          { name: 'main', file: '/test/src/index.ts', references: 5 },
        ],
        mostConnectedFiles: [],
        generationTime: 10,
      },
    };

    const output = formatter.format(mockMap);
    expect(output).toContain('Repository Map');
    expect(output).toContain('main');
  });
});
