/**
 * RepoMapFormatter Tests
 *
 * Tests for the repository map formatter with multiple output styles.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RepoMapFormatter,
  getRepoMapFormatter,
  resetRepoMapFormatter,
} from './RepoMapFormatter';
import type { RepoMap, SymbolEntry, FileEntry } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    {
      id: '/project/src/services/AuthService.ts#AuthService#10',
      name: 'AuthService',
      kind: 'class',
      file: '/project/src/services/AuthService.ts',
      line: 10,
      endLine: 100,
      column: 0,
      signature: 'class AuthService implements IAuthService',
      exported: true,
      references: 15,
      modifiers: ['export'],
    },
    {
      id: '/project/src/services/AuthService.ts#validateUser#20',
      name: 'validateUser',
      kind: 'method',
      file: '/project/src/services/AuthService.ts',
      line: 20,
      endLine: 30,
      column: 2,
      signature: 'validateUser(user: User): Promise<boolean>',
      exported: false,
      references: 8,
      parentId: '/project/src/services/AuthService.ts#AuthService#10',
      modifiers: ['async', 'public'],
    },
    {
      id: '/project/src/types/user.ts#User#5',
      name: 'User',
      kind: 'interface',
      file: '/project/src/types/user.ts',
      line: 5,
      endLine: 15,
      column: 0,
      signature: 'interface User',
      exported: true,
      references: 25,
      modifiers: ['export'],
    },
    {
      id: '/project/src/types/user.ts#UserRole#20',
      name: 'UserRole',
      kind: 'type',
      file: '/project/src/types/user.ts',
      line: 20,
      endLine: 20,
      column: 0,
      signature: "type UserRole = 'admin' | 'user' | 'guest'",
      exported: true,
      references: 10,
      modifiers: ['export'],
    },
    {
      id: '/project/src/utils/helpers.ts#formatDate#1',
      name: 'formatDate',
      kind: 'function',
      file: '/project/src/utils/helpers.ts',
      line: 1,
      endLine: 5,
      column: 0,
      signature: 'function formatDate(date: Date): string',
      exported: true,
      references: 3,
      modifiers: ['export'],
    },
    {
      id: '/project/src/constants.ts#MAX_RETRIES#1',
      name: 'MAX_RETRIES',
      kind: 'constant',
      file: '/project/src/constants.ts',
      line: 1,
      endLine: 1,
      column: 0,
      signature: 'const MAX_RETRIES = 3',
      exported: true,
      references: 5,
      modifiers: ['export', 'readonly'],
    },
  ];

  const files: FileEntry[] = [
    {
      path: '/project/src/services/AuthService.ts',
      relativePath: 'src/services/AuthService.ts',
      language: 'typescript',
      size: 2500,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 100,
    },
    {
      path: '/project/src/types/user.ts',
      relativePath: 'src/types/user.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 30,
    },
    {
      path: '/project/src/utils/helpers.ts',
      relativePath: 'src/utils/helpers.ts',
      language: 'typescript',
      size: 200,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 10,
    },
    {
      path: '/project/src/constants.ts',
      relativePath: 'src/constants.ts',
      language: 'typescript',
      size: 100,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 5,
    },
  ];

  return {
    projectPath: '/project',
    generatedAt: new Date('2024-01-15'),
    files,
    symbols,
    dependencies: [
      {
        from: '/project/src/services/AuthService.ts',
        to: '/project/src/types/user.ts',
        type: 'import',
        symbols: ['User', 'UserRole'],
        line: 1,
      },
      {
        from: '/project/src/services/AuthService.ts',
        to: '/project/src/constants.ts',
        type: 'import',
        symbols: ['MAX_RETRIES'],
        line: 2,
      },
    ],
    stats: {
      totalFiles: 4,
      totalSymbols: 6,
      totalDependencies: 2,
      languageBreakdown: { typescript: 4, javascript: 0 },
      symbolBreakdown: {
        class: 1,
        interface: 1,
        function: 1,
        method: 1,
        property: 0,
        variable: 0,
        constant: 1,
        type: 1,
        enum: 0,
        enum_member: 0,
        namespace: 0,
        module: 0,
      },
      largestFiles: ['src/services/AuthService.ts', 'src/types/user.ts'],
      mostReferencedSymbols: [
        { name: 'User', file: '/project/src/types/user.ts', references: 25 },
        { name: 'AuthService', file: '/project/src/services/AuthService.ts', references: 15 },
        { name: 'UserRole', file: '/project/src/types/user.ts', references: 10 },
      ],
      mostConnectedFiles: [
        { file: '/project/src/services/AuthService.ts', connections: 2 },
      ],
      generationTime: 150,
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('RepoMapFormatter', () => {
  let formatter: RepoMapFormatter;
  let repoMap: RepoMap;

  beforeEach(() => {
    resetRepoMapFormatter();
    formatter = new RepoMapFormatter();
    repoMap = createMockRepoMap();
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe('singleton', () => {
    it('should return same instance from getRepoMapFormatter', () => {
      const instance1 = getRepoMapFormatter();
      const instance2 = getRepoMapFormatter();
      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = getRepoMapFormatter();
      resetRepoMapFormatter();
      const instance2 = getRepoMapFormatter();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // Compact Format Tests
  // ==========================================================================

  describe('compact format', () => {
    it('should format with compact style by default', () => {
      const output = formatter.format(repoMap);
      expect(output).toContain('# Repository Map');
      expect(output).toContain('Files: 4');
      expect(output).toContain('Symbols: 6');
    });

    it('should include symbol prefixes', () => {
      const output = formatter.format(repoMap, { style: 'compact' });
      // Check for class prefix (⊕)
      expect(output).toContain('\u2295');
      // Check for interface prefix (◇)
      expect(output).toContain('\u25C7');
      // Check for function prefix (ƒ)
      expect(output).toContain('\u0192');
    });

    it('should mark exported symbols with epsilon', () => {
      const output = formatter.format(repoMap, { style: 'compact' });
      // Exported symbols should have ε marker
      expect(output).toContain('\u03B5');
    });

    it('should include reference counts when enabled', () => {
      const output = formatter.format(repoMap, {
        style: 'compact',
        rankByReferences: true,
      });
      // User has 25 references
      expect(output).toContain('(25)');
      // AuthService has 15 references
      expect(output).toContain('(15)');
    });

    it('should group by file when enabled', () => {
      const output = formatter.format(repoMap, {
        style: 'compact',
        groupByFile: true,
      });
      expect(output).toContain('## src/types/user.ts');
      expect(output).toContain('## src/services/AuthService.ts');
    });

    it('should include signatures when enabled', () => {
      const output = formatter.format(repoMap, {
        style: 'compact',
        includeSignatures: true,
      });
      expect(output).toContain('validateUser(user: User): Promise<boolean>');
    });

    it('should indent child symbols', () => {
      const output = formatter.format(repoMap, {
        style: 'compact',
        groupByFile: true,
      });
      // Method should be indented (has parentId)
      const lines = output.split('\n');
      const methodLine = lines.find((l) => l.includes('validateUser'));
      expect(methodLine).toBeTruthy();
      expect(methodLine!.startsWith('  ')).toBe(true);
    });
  });

  // ==========================================================================
  // Detailed Format Tests
  // ==========================================================================

  describe('detailed format', () => {
    it('should format with detailed style', () => {
      const output = formatter.format(repoMap, { style: 'detailed' });
      expect(output).toContain('# Repository Map (Detailed)');
      expect(output).toContain('## Summary');
    });

    it('should include project information', () => {
      const output = formatter.format(repoMap, { style: 'detailed' });
      expect(output).toContain('**Project:**');
      expect(output).toContain('**Generated:**');
      expect(output).toContain('**Files:** 4');
    });

    it('should include symbol breakdown', () => {
      const output = formatter.format(repoMap, { style: 'detailed' });
      expect(output).toContain('## Symbol Breakdown');
      expect(output).toContain('class: 1');
      expect(output).toContain('interface: 1');
    });

    it('should include dependencies when enabled', () => {
      const output = formatter.format(repoMap, {
        style: 'detailed',
        includeDependencies: true,
      });
      expect(output).toContain('## Key Dependencies');
    });

    it('should include documentation when enabled', () => {
      // Add documentation to a symbol
      repoMap.symbols[0].documentation = 'Authentication service for user management';

      const output = formatter.format(repoMap, {
        style: 'detailed',
        includeDocstrings: true,
      });
      expect(output).toContain('Authentication service');
    });
  });

  // ==========================================================================
  // Tree Format Tests
  // ==========================================================================

  describe('tree format', () => {
    it('should format with tree style', () => {
      const output = formatter.format(repoMap, { style: 'tree' });
      expect(output).toContain('# Repository Map (Tree)');
      expect(output).toContain('4 files, 6 symbols');
    });

    it('should use tree characters', () => {
      const output = formatter.format(repoMap, { style: 'tree' });
      // Should contain tree characters (├── or └──)
      expect(output.includes('\u251C') || output.includes('\u2514')).toBe(true);
    });

    it('should show directory structure', () => {
      const output = formatter.format(repoMap, { style: 'tree' });
      expect(output).toContain('src/');
      expect(output).toContain('services/');
      expect(output).toContain('types/');
    });

    it('should include symbols in tree when signatures enabled', () => {
      const output = formatter.format(repoMap, {
        style: 'tree',
        includeSignatures: true,
      });
      expect(output).toContain('AuthService');
      expect(output).toContain('User');
    });
  });

  // ==========================================================================
  // Token Estimation Tests
  // ==========================================================================

  describe('token estimation', () => {
    it('should estimate tokens for text', () => {
      const text = 'Hello world!'; // 12 chars
      const tokens = formatter.estimateTokens(text);
      // ~4 chars per token = ~3 tokens
      expect(tokens).toBe(3);
    });

    it('should estimate tokens for longer text', () => {
      const text = 'A'.repeat(100); // 100 chars
      const tokens = formatter.estimateTokens(text);
      expect(tokens).toBe(25);
    });

    it('should round up token count', () => {
      const text = 'Hi!'; // 3 chars
      const tokens = formatter.estimateTokens(text);
      expect(tokens).toBe(1); // ceil(3/4) = 1
    });
  });

  // ==========================================================================
  // Truncation Tests
  // ==========================================================================

  describe('truncation', () => {
    it('should truncate to fit token budget', () => {
      // Use a larger budget that can fit header plus some content
      const output = formatter.truncateToFit(repoMap, 200);
      const tokens = formatter.estimateTokens(output);
      expect(tokens).toBeLessThanOrEqual(200);
    });

    it('should indicate truncation when budget is very small', () => {
      // A very small budget will cause truncation before all content is shown
      const output = formatter.truncateToFit(repoMap, 75);
      // Should still have the header but may not have all symbols
      expect(output).toContain('# Repository Map');
      // With small budget, truncation indicator should appear if content doesn't fit
      const fullOutput = formatter.format(repoMap, { maxTokens: 10000 });
      if (output.length < fullOutput.length) {
        expect(output).toContain('truncated');
      }
    });

    it('should include header within budget', () => {
      const output = formatter.truncateToFit(repoMap, 100);
      expect(output).toContain('# Repository Map');
    });
  });

  // ==========================================================================
  // Symbol Selection Tests
  // ==========================================================================

  describe('symbol selection', () => {
    it('should prioritize most referenced symbols', () => {
      const output = formatter.format(repoMap, {
        maxTokens: 100,
        rankByReferences: true,
        groupByFile: false,
      });
      // User has most references (25), should appear first
      const lines = output.split('\n').filter((l) => l.trim());
      const userIndex = lines.findIndex((l) => l.includes('User'));
      const authIndex = lines.findIndex((l) => l.includes('AuthService'));
      // User should come before AuthService
      expect(userIndex).toBeLessThan(authIndex);
    });

    it('should prioritize exported symbols', () => {
      // All our test symbols are exported, so this just verifies they're included
      const output = formatter.format(repoMap, { maxTokens: 200 });
      expect(output).toContain('User');
      expect(output).toContain('AuthService');
    });
  });

  // ==========================================================================
  // Symbol Prefix Tests
  // ==========================================================================

  describe('symbol prefixes', () => {
    it('should use correct prefix for classes', () => {
      const output = formatter.format(repoMap);
      // ⊕ for class
      expect(output).toContain('\u2295');
    });

    it('should use correct prefix for interfaces', () => {
      const output = formatter.format(repoMap);
      // ◇ for interface
      expect(output).toContain('\u25C7');
    });

    it('should use correct prefix for functions', () => {
      const output = formatter.format(repoMap);
      // ƒ for function
      expect(output).toContain('\u0192');
    });

    it('should use correct prefix for constants', () => {
      const output = formatter.format(repoMap);
      // ∷ for constant
      expect(output).toContain('\u2237');
    });

    it('should use correct prefix for types', () => {
      const output = formatter.format(repoMap);
      // ⊤ for type
      expect(output).toContain('\u22A4');
    });
  });

  // ==========================================================================
  // Signature Truncation Tests
  // ==========================================================================

  describe('signature truncation', () => {
    it('should truncate long signatures', () => {
      // Add a symbol with very long signature
      repoMap.symbols.push({
        id: '/project/src/long.ts#longFunction#1',
        name: 'longFunction',
        kind: 'function',
        file: '/project/src/long.ts',
        line: 1,
        endLine: 1,
        column: 0,
        signature: 'function longFunction(param1: VeryLongTypeName, param2: AnotherLongTypeName, param3: YetAnotherLongTypeName): Promise<SuperLongReturnTypeName>',
        exported: true,
        references: 0,
        modifiers: [],
      });

      const output = formatter.format(repoMap, {
        includeSignatures: true,
        maxTokens: 1000,
      });
      // Should contain "..." for truncation
      expect(output).toContain('...');
    });

    it('should not truncate short signatures', () => {
      const output = formatter.format(repoMap, { includeSignatures: true });
      // formatDate signature is short enough
      expect(output).toContain('formatDate');
    });
  });

  // ==========================================================================
  // Stats Formatting Tests
  // ==========================================================================

  describe('stats formatting', () => {
    it('should format statistics summary', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('# Repository Statistics');
      expect(stats).toContain('## Overview');
    });

    it('should include all key statistics', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('Total Files:** 4');
      expect(stats).toContain('Total Symbols:** 6');
      expect(stats).toContain('Generation Time:**');
    });

    it('should include language breakdown', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('## Language Breakdown');
      expect(stats).toContain('typescript:** 4');
    });

    it('should include symbol breakdown', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('## Symbol Breakdown');
      expect(stats).toContain('class:** 1');
    });

    it('should include most referenced symbols', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('## Most Referenced Symbols');
      expect(stats).toContain('User');
    });

    it('should include most connected files', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('## Most Connected Files');
    });

    it('should include largest files', () => {
      const stats = formatter.formatStats(repoMap);
      expect(stats).toContain('## Largest Files');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty repo map', () => {
      const emptyMap: RepoMap = {
        projectPath: '/empty',
        generatedAt: new Date(),
        files: [],
        symbols: [],
        dependencies: [],
        stats: {
          totalFiles: 0,
          totalSymbols: 0,
          totalDependencies: 0,
          languageBreakdown: { typescript: 0, javascript: 0 },
          symbolBreakdown: {
            class: 0,
            interface: 0,
            function: 0,
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
          generationTime: 0,
        },
      };

      const output = formatter.format(emptyMap);
      expect(output).toContain('# Repository Map');
      expect(output).toContain('Files: 0');
    });

    it('should handle symbols with zero references', () => {
      repoMap.symbols.forEach((s) => (s.references = 0));
      const output = formatter.format(repoMap, { rankByReferences: true });
      expect(output).not.toContain('(0)'); // Don't show (0) for zero refs
    });

    it('should handle deeply nested paths', () => {
      repoMap.files.push({
        path: '/project/src/deep/nested/path/to/file.ts',
        relativePath: 'src/deep/nested/path/to/file.ts',
        language: 'typescript',
        size: 100,
        lastModified: new Date(),
        symbolCount: 0,
        lineCount: 10,
      });

      const output = formatter.format(repoMap, { style: 'tree' });
      expect(output).toContain('deep/');
      expect(output).toContain('nested/');
    });
  });
});
