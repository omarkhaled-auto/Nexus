/**
 * Test Strategy Analyzer Tests
 *
 * Tests for the TestStrategyAnalyzer class that generates TEST_STRATEGY.md documentation.
 *
 * @module infrastructure/analysis/codebase/TestStrategyAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestStrategyAnalyzer } from './TestStrategyAnalyzer';
import type { RepoMap } from '../types';
import type { AnalyzerOptions } from './types';
import {
  mockFile,
  mockSymbol,
  mockDependency,
  createMockRepoMapStats,
} from './__testHelpers';

describe('TestStrategyAnalyzer', () => {
  let analyzer: TestStrategyAnalyzer;
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
    analyzer = new TestStrategyAnalyzer(mockRepoMap, mockOptions);
  });

  describe('analyze()', () => {
    it('should return a TestStrategyDoc with all required fields', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toBeDefined();
      expect(doc.overview).toBeDefined();
      expect(doc.frameworks).toBeDefined();
      expect(doc.testTypes).toBeDefined();
      expect(doc.coverage).toBeDefined();
      expect(doc.testPatterns).toBeDefined();
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(20);
    });
  });

  describe('detectTestFrameworks()', () => {
    it('should detect Vitest from config file', async () => {
      const doc = await analyzer.analyze();

      const vitestFramework = doc.frameworks.find(f => f.name === 'Vitest');
      expect(vitestFramework).toBeDefined();
      expect(vitestFramework?.purpose).toContain('unit testing');
    });

    it('should include config file path', async () => {
      const doc = await analyzer.analyze();

      const vitestFramework = doc.frameworks.find(f => f.name === 'Vitest');
      expect(vitestFramework?.configFile).toBe('vitest.config.ts');
    });

    it('should detect multiple frameworks', async () => {
      // Add Playwright config
      const repoMapWithPlaywright = createMockRepoMapWithPlaywright();
      const analyzerWithPlaywright = new TestStrategyAnalyzer(repoMapWithPlaywright, mockOptions);
      const doc = await analyzerWithPlaywright.analyze();

      expect(doc.frameworks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('analyzeTestTypes()', () => {
    it('should categorize unit tests', async () => {
      const doc = await analyzer.analyze();

      const unitTests = doc.testTypes.find(t => t.type === 'unit');
      expect(unitTests).toBeDefined();
      expect(unitTests?.count).toBeGreaterThan(0);
    });

    it('should include naming pattern', async () => {
      const doc = await analyzer.analyze();

      const unitTests = doc.testTypes.find(t => t.type === 'unit');
      expect(unitTests?.namingPattern).toBeTruthy();
    });

    it('should detect test location', async () => {
      const doc = await analyzer.analyze();

      const unitTests = doc.testTypes.find(t => t.type === 'unit');
      expect(unitTests?.location).toBeTruthy();
    });

    it('should handle codebase with no tests', async () => {
      const repoMapWithoutTests = createMockRepoMapWithoutTests();
      const analyzerWithoutTests = new TestStrategyAnalyzer(repoMapWithoutTests, mockOptions);
      const doc = await analyzerWithoutTests.analyze();

      expect(doc.testTypes.length).toBe(0);
      expect(doc.overview).toContain('does not appear to have test files');
    });
  });

  describe('analyzeCoverage()', () => {
    it('should return default coverage target', async () => {
      const doc = await analyzer.analyze();

      expect(doc.coverage.target).toBe(80);
    });

    it('should include common coverage excludes', async () => {
      const doc = await analyzer.analyze();

      expect(doc.coverage.excludes).toContain('node_modules');
      expect(doc.coverage.excludes).toContain('dist');
    });
  });

  describe('detectTestPatterns()', () => {
    it('should detect Arrange-Act-Assert pattern', async () => {
      const doc = await analyzer.analyze();

      const aaaPattern = doc.testPatterns.find(p => p.pattern.includes('Arrange-Act-Assert'));
      expect(aaaPattern).toBeDefined();
      expect(aaaPattern?.example).toBeTruthy();
    });

    it('should detect describe/it blocks pattern when tests exist', async () => {
      const doc = await analyzer.analyze();

      const describePattern = doc.testPatterns.find(p => p.pattern.includes('describe/it'));
      expect(describePattern).toBeDefined();
    });

    it('should detect mocking pattern when mocks exist', async () => {
      const repoMapWithMocks = createMockRepoMapWithMocks();
      const analyzerWithMocks = new TestStrategyAnalyzer(repoMapWithMocks, mockOptions);
      const doc = await analyzerWithMocks.analyze();

      const mockPattern = doc.testPatterns.find(p => p.pattern.includes('Mock'));
      expect(mockPattern).toBeDefined();
    });

    it('should return empty patterns for codebase without tests', async () => {
      const repoMapWithoutTests = createMockRepoMapWithoutTests();
      const analyzerWithoutTests = new TestStrategyAnalyzer(repoMapWithoutTests, mockOptions);
      const doc = await analyzerWithoutTests.analyze();

      expect(doc.testPatterns.length).toBe(0);
    });
  });

  describe('toMarkdown()', () => {
    it('should generate valid Markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Test Strategy');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('## Test Frameworks');
      expect(markdown).toContain('## Test Types');
      expect(markdown).toContain('## Coverage Configuration');
      expect(markdown).toContain('## Testing Patterns');
    });

    it('should include timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });

    it('should format frameworks as table', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('| Framework | Purpose | Config File |');
      expect(markdown).toContain('|-----------|---------|-------------|');
    });

    it('should format test types as table', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('| Type | Location | Pattern | Count |');
    });

    it('should include code examples for patterns', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('```typescript');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepoMap(): RepoMap {
  const files = [
    mockFile('package.json', { size: 500, lineCount: 50 }),
    mockFile('vitest.config.ts', { size: 200, lineCount: 20 }),
    mockFile('src/utils/helper.ts', { size: 300, lineCount: 30 }),
    mockFile('src/utils/helper.test.ts', { size: 400, lineCount: 40 }),
    mockFile('src/components/Button.tsx', { size: 250, lineCount: 25 }),
    mockFile('src/components/Button.test.tsx', { size: 350, lineCount: 35 }),
  ];

  const symbols = [
    mockSymbol('helper', 'function', 'src/utils/helper.ts', true),
    mockSymbol('Button', 'function', 'src/components/Button.tsx', true),
  ];

  const dependencies = [
    mockDependency('src/utils/helper.test.ts', 'vitest', 'import'),
    mockDependency('src/components/Button.test.tsx', 'vitest', 'import'),
    mockDependency('src/components/Button.test.tsx', '@testing-library/react', 'import'),
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

function createMockRepoMapWithPlaywright(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('playwright.config.ts', { size: 300, lineCount: 30 }),
      mockFile('e2e/login.e2e.ts', { size: 500, lineCount: 50 }),
    ],
  };
}

function createMockRepoMapWithMocks(): RepoMap {
  const base = createMockRepoMap();
  return {
    ...base,
    files: [
      ...base.files,
      mockFile('src/__mocks__/api.ts', { size: 200, lineCount: 20 }),
    ],
  };
}

function createMockRepoMapWithoutTests(): RepoMap {
  const files = [
    mockFile('package.json', { size: 500, lineCount: 50 }),
    mockFile('src/index.ts', { size: 200, lineCount: 20 }),
  ];
  return {
    projectPath: '/test/project',
    generatedAt: new Date(),
    files,
    symbols: [],
    dependencies: [],
    stats: createMockRepoMapStats({
      totalFiles: 2,
      totalSymbols: 0,
      totalDependencies: 0,
      languageBreakdown: { typescript: 2, javascript: 0 },
    }),
  };
}
