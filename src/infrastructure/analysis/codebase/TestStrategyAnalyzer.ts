/**
 * Test Strategy Analyzer
 *
 * Analyzes codebase testing approach and generates TEST_STRATEGY.md documentation.
 * Examines test frameworks, test types, coverage configuration, and testing patterns.
 *
 * @module infrastructure/analysis/codebase/TestStrategyAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  TestStrategyDoc,
  TestFramework,
  TestTypeDoc,
  CoverageDoc,
  TestPatternDoc,
} from './types';

/**
 * Known test framework configurations
 */
const TEST_FRAMEWORK_CONFIGS: Record<string, { name: string; purpose: string }> = {
  'vitest.config.ts': { name: 'Vitest', purpose: 'Fast unit testing with Vite integration' },
  'vitest.config.js': { name: 'Vitest', purpose: 'Fast unit testing with Vite integration' },
  'vitest.config.mts': { name: 'Vitest', purpose: 'Fast unit testing with Vite integration' },
  'jest.config.js': { name: 'Jest', purpose: 'JavaScript testing framework' },
  'jest.config.ts': { name: 'Jest', purpose: 'JavaScript testing framework' },
  'jest.config.mjs': { name: 'Jest', purpose: 'JavaScript testing framework' },
  'playwright.config.ts': { name: 'Playwright', purpose: 'End-to-end browser testing' },
  'playwright.config.js': { name: 'Playwright', purpose: 'End-to-end browser testing' },
  'cypress.config.ts': { name: 'Cypress', purpose: 'End-to-end testing framework' },
  'cypress.config.js': { name: 'Cypress', purpose: 'End-to-end testing framework' },
};

/**
 * Test file patterns and their types
 */
const TEST_FILE_PATTERNS: Array<{ pattern: RegExp; type: TestTypeDoc['type']; description: string }> = [
  { pattern: /\.test\.tsx?$/, type: 'unit', description: 'Unit tests' },
  { pattern: /\.spec\.tsx?$/, type: 'integration', description: 'Integration tests' },
  { pattern: /\.e2e\.tsx?$/, type: 'e2e', description: 'End-to-end tests' },
  { pattern: /\.component\.test\.tsx?$/, type: 'component', description: 'Component tests' },
];

/**
 * Analyzer that generates TEST_STRATEGY.md documentation
 *
 * Examines the codebase to:
 * - Identify test frameworks used
 * - Categorize tests by type
 * - Document coverage configuration
 * - Identify testing patterns
 *
 * @example
 * ```typescript
 * const analyzer = new TestStrategyAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class TestStrategyAnalyzer extends BaseAnalyzer {
  /**
   * Perform test strategy analysis
   * @returns Test strategy documentation
   */
  analyze(): TestStrategyDoc {
    const overview = this.generateOverview();
    const frameworks = this.detectTestFrameworks();
    const testTypes = this.analyzeTestTypes();
    const coverage = this.analyzeCoverage();
    const testPatterns = this.detectTestPatterns();

    return {
      overview,
      frameworks,
      testTypes,
      coverage,
      testPatterns,
    };
  }

  /**
   * Generate test strategy overview
   */
  private generateOverview(): string {
    const testFiles = this.getTestFiles();
    const testCount = testFiles.length;
    const frameworks = this.detectTestFrameworks();
    const frameworkNames = frameworks.map(f => f.name).join(', ') || 'None detected';

    const paragraphs: string[] = [];

    if (testCount === 0) {
      paragraphs.push(
        `This codebase does not appear to have test files yet. ` +
        `Consider implementing a testing strategy to ensure code quality and prevent regressions.`
      );
    } else {
      paragraphs.push(
        `This codebase has ${String(testCount)} test file(s) using ${frameworkNames}. ` +
        `Tests are organized to validate functionality at multiple levels of the application.`
      );
    }

    // Add framework-specific information
    if (frameworks.length > 0) {
      const primaryFramework = frameworks[0]!;
      paragraphs.push(
        `The primary testing framework is ${primaryFramework.name}, which provides ${primaryFramework.purpose.toLowerCase()}.`
      );
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Detect test frameworks used in the project
   */
  private detectTestFrameworks(): TestFramework[] {
    const frameworks: TestFramework[] = [];
    const foundConfigs = new Set<string>();

    // Check for framework config files
    for (const file of this.repoMap.files) {
      const fileName = file.relativePath.split('/').pop() || '';
      const config = TEST_FRAMEWORK_CONFIGS[fileName];

      if (config !== undefined && !foundConfigs.has(config.name)) {
        frameworks.push({
          name: config.name,
          purpose: config.purpose,
          configFile: file.relativePath,
        });
        foundConfigs.add(config.name);
      }
    }

    // Check dependencies for testing libraries
    const testingLibraries = this.detectTestingLibraries();
    for (const lib of testingLibraries) {
      if (!foundConfigs.has(lib.name)) {
        frameworks.push(lib);
        foundConfigs.add(lib.name);
      }
    }

    return frameworks;
  }

  /**
   * Detect testing libraries from dependencies
   */
  private detectTestingLibraries(): TestFramework[] {
    const libraries: TestFramework[] = [];

    // Check for @testing-library usage in dependencies
    const hasReactTestingLibrary = this.repoMap.dependencies.some(
      d => d.to.includes('@testing-library/react')
    );

    if (hasReactTestingLibrary) {
      libraries.push({
        name: 'React Testing Library',
        purpose: 'Testing React components with user-centric approach',
        configFile: 'package.json',
      });
    }

    // Check for other common testing utilities
    const hasTestingLibraryJestDom = this.repoMap.dependencies.some(
      d => d.to.includes('@testing-library/jest-dom')
    );

    if (hasTestingLibraryJestDom) {
      libraries.push({
        name: 'Jest DOM',
        purpose: 'Custom Jest matchers for DOM testing',
        configFile: 'package.json',
      });
    }

    return libraries;
  }

  /**
   * Analyze different types of tests in the codebase
   */
  private analyzeTestTypes(): TestTypeDoc[] {
    const testTypes: TestTypeDoc[] = [];
    const testFiles = this.getTestFiles();

    for (const patternDef of TEST_FILE_PATTERNS) {
      const matchingFiles = testFiles.filter(f => patternDef.pattern.test(f));

      if (matchingFiles.length > 0) {
        // Determine location pattern
        const locations = this.inferTestLocation(matchingFiles);

        testTypes.push({
          type: patternDef.type,
          location: locations,
          namingPattern: this.getPatternString(patternDef.pattern),
          count: matchingFiles.length,
        });
      }
    }

    // If no specific patterns matched but we have test files, add generic unit tests
    if (testTypes.length === 0 && testFiles.length > 0) {
      testTypes.push({
        type: 'unit',
        location: 'Co-located with source files',
        namingPattern: '*.test.ts',
        count: testFiles.length,
      });
    }

    return testTypes;
  }

  /**
   * Get all test files from the repo map
   */
  private getTestFiles(): string[] {
    return this.repoMap.files
      .filter(f =>
        f.relativePath.includes('.test.') ||
        f.relativePath.includes('.spec.') ||
        f.relativePath.includes('.e2e.') ||
        f.relativePath.includes('__tests__')
      )
      .map(f => f.relativePath);
  }

  /**
   * Infer test location pattern from file paths
   */
  private inferTestLocation(files: string[]): string {
    const hasTestsDir = files.some(f => f.includes('__tests__'));
    const hasE2eDir = files.some(f => f.includes('e2e/') || f.includes('/e2e'));
    const isColocated = files.some(f => {
      const parts = f.split('/');
      const _fileName = parts[parts.length - 1];
      const dirPath = parts.slice(0, -1).join('/');
      // Check if there's a source file in the same directory
      return this.repoMap.files.some(src =>
        src.relativePath.startsWith(dirPath) &&
        !src.relativePath.includes('.test.') &&
        !src.relativePath.includes('.spec.')
      );
    });

    if (hasTestsDir) {
      return '__tests__/ directories';
    }
    if (hasE2eDir) {
      return 'e2e/ directory';
    }
    if (isColocated) {
      return 'Co-located with source files';
    }
    return 'Various locations';
  }

  /**
   * Convert regex pattern to readable string
   */
  private getPatternString(pattern: RegExp): string {
    return pattern.source
      .replace(/\\/g, '')
      .replace(/\$/, '')
      .replace(/\?/g, '')
      .replace(/\+/g, '')
      .replace(/\[tsx\]/g, 'ts(x)')
      || pattern.toString();
  }

  /**
   * Analyze coverage configuration
   */
  private analyzeCoverage(): CoverageDoc {
    // Default coverage doc
    const coverage: CoverageDoc = {
      target: 80, // Default target
      excludes: [],
    };

    // Try to read coverage config from vitest.config or jest.config
    const _configFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('vitest.config') ||
      f.relativePath.includes('jest.config')
    );

    // Infer excludes from common patterns
    coverage.excludes = this.inferCoverageExcludes();

    return coverage;
  }

  /**
   * Infer common coverage excludes
   */
  private inferCoverageExcludes(): string[] {
    const excludes: string[] = [];

    // Common exclusion patterns
    const commonExcludes = [
      'node_modules',
      'dist',
      'build',
      '*.test.ts',
      '*.spec.ts',
      '*.d.ts',
      'coverage',
    ];

    for (const pattern of commonExcludes) {
      excludes.push(pattern);
    }

    return excludes;
  }

  /**
   * Detect testing patterns used in the codebase
   */
  private detectTestPatterns(): TestPatternDoc[] {
    const patterns: TestPatternDoc[] = [];
    const testFiles = this.getTestFiles();

    if (testFiles.length === 0) {
      return patterns;
    }

    // Detect common patterns based on file analysis
    // Note: In a real implementation, we'd parse the test files
    // For now, we infer patterns from naming and structure

    // Arrange-Act-Assert pattern (most common)
    patterns.push({
      pattern: 'Arrange-Act-Assert (AAA)',
      description: 'Structure tests with setup, execution, and verification phases',
      example: `describe('Component', () => {
  it('should handle user action', () => {
    // Arrange
    const props = { ... };

    // Act
    const result = doSomething(props);

    // Assert
    expect(result).toBe(expected);
  });
});`,
    });

    // Check for mock patterns
    const hasMocks = this.repoMap.files.some(f =>
      f.relativePath.includes('__mocks__') ||
      f.relativePath.includes('.mock.')
    );

    if (hasMocks) {
      patterns.push({
        pattern: 'Mocking',
        description: 'Use mock objects and functions to isolate units under test',
        example: `vi.mock('./dependency', () => ({
  myFunction: vi.fn().mockReturnValue('mocked'),
}));`,
      });
    }

    // Check for fixture/factory patterns
    const hasFixtures = this.repoMap.files.some(f =>
      f.relativePath.includes('fixture') ||
      f.relativePath.includes('factory')
    );

    if (hasFixtures) {
      patterns.push({
        pattern: 'Test Fixtures/Factories',
        description: 'Use dedicated fixtures or factories to create test data',
        example: `const createUser = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test User',
  ...overrides,
});`,
      });
    }

    // Add describe/it pattern if tests exist
    if (testFiles.length > 0) {
      patterns.push({
        pattern: 'describe/it blocks',
        description: 'Organize tests with describe blocks for grouping and it blocks for individual tests',
        example: `describe('ModuleName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => {
      // test implementation
    });
  });
});`,
      });
    }

    return patterns;
  }

  /**
   * Convert documentation to Markdown
   */
  toMarkdown(doc: TestStrategyDoc): string {
    const lines: string[] = [];

    // Header
    lines.push('# Test Strategy');
    lines.push('');
    lines.push(`*Generated: ${new Date().toISOString()}*`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // Frameworks
    lines.push('## Test Frameworks');
    lines.push('');

    if (doc.frameworks.length > 0) {
      lines.push('| Framework | Purpose | Config File |');
      lines.push('|-----------|---------|-------------|');

      for (const framework of doc.frameworks) {
        lines.push(`| ${framework.name} | ${framework.purpose} | \`${framework.configFile}\` |`);
      }
    } else {
      lines.push('No test frameworks detected. Consider adding a testing framework.');
    }
    lines.push('');

    // Test Types
    lines.push('## Test Types');
    lines.push('');

    if (doc.testTypes.length > 0) {
      lines.push('| Type | Location | Pattern | Count |');
      lines.push('|------|----------|---------|-------|');

      for (const testType of doc.testTypes) {
        lines.push(`| ${testType.type} | ${testType.location} | \`${testType.namingPattern}\` | ${String(testType.count)} |`);
      }
    } else {
      lines.push('No test files detected in the codebase.');
    }
    lines.push('');

    // Coverage
    lines.push('## Coverage Configuration');
    lines.push('');
    lines.push(`**Target Coverage:** ${String(doc.coverage.target)}%`);
    lines.push('');

    if (doc.coverage.current !== undefined) {
      lines.push(`**Current Coverage:** ${String(doc.coverage.current)}%`);
      lines.push('');
    }

    if (doc.coverage.excludes.length > 0) {
      lines.push('**Excluded from Coverage:**');
      for (const exclude of doc.coverage.excludes) {
        lines.push(`- \`${exclude}\``);
      }
    }
    lines.push('');

    // Test Patterns
    lines.push('## Testing Patterns');
    lines.push('');

    if (doc.testPatterns.length > 0) {
      for (const pattern of doc.testPatterns) {
        lines.push(`### ${pattern.pattern}`);
        lines.push('');
        lines.push(pattern.description);
        lines.push('');
        lines.push('```typescript');
        lines.push(pattern.example);
        lines.push('```');
        lines.push('');
      }
    } else {
      lines.push('No specific testing patterns detected.');
    }

    return lines.join('\n');
  }
}
