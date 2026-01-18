/**
 * Integration Tests for Codebase Documentation Analyzer
 *
 * Tests the full pipeline from analysis to documentation generation.
 * These tests analyze a small test fixture to verify end-to-end functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { CodebaseAnalyzer } from './CodebaseAnalyzer';
import { analyzeCodebase, generateCodebaseDocs, getCodebaseContext } from './index';
import type { CodebaseDocumentation } from './types';

// Test fixture directory
const TEST_OUTPUT_DIR = join(__dirname, '__test_output__');

describe('CodebaseAnalyzer Integration', () => {
  let analyzer: CodebaseAnalyzer;
  let docs: CodebaseDocumentation;

  beforeAll(async () => {
    // Create test output directory
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });

    // Analyze the codebase module itself as a test fixture
    analyzer = new CodebaseAnalyzer();
    docs = await analyzer.analyze(__dirname, {
      outputDir: TEST_OUTPUT_DIR,
      maxExamples: 3,
      generateDiagrams: true,
    });
  }, 60000); // Allow 60 seconds for analysis

  afterAll(async () => {
    // Cleanup test output directory
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Full Pipeline Analysis', () => {
    it('should generate complete documentation', () => {
      expect(docs).toBeDefined();
      expect(docs.projectPath).toBe(__dirname);
      expect(docs.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate architecture documentation', () => {
      expect(docs.architecture).toBeDefined();
      expect(docs.architecture.overview).toBeTruthy();
      expect(typeof docs.architecture.overview).toBe('string');
      expect(docs.architecture.overview.length).toBeGreaterThan(50);
    });

    it('should detect layers', () => {
      expect(docs.architecture.layers).toBeDefined();
      expect(Array.isArray(docs.architecture.layers)).toBe(true);
      // May or may not find layers in test fixture
    });

    it('should identify key components', () => {
      expect(docs.architecture.keyComponents).toBeDefined();
      expect(Array.isArray(docs.architecture.keyComponents)).toBe(true);
      // Should find at least some components
      if (docs.architecture.keyComponents.length > 0) {
        const comp = docs.architecture.keyComponents[0];
        expect(comp.name).toBeTruthy();
        expect(comp.file).toBeTruthy();
        expect(comp.purpose).toBeTruthy();
      }
    });

    it('should generate patterns documentation', () => {
      expect(docs.patterns).toBeDefined();
      expect(docs.patterns.overview).toBeTruthy();
      expect(Array.isArray(docs.patterns.architecturalPatterns)).toBe(true);
      expect(Array.isArray(docs.patterns.codingPatterns)).toBe(true);
      expect(Array.isArray(docs.patterns.namingConventions)).toBe(true);
      expect(Array.isArray(docs.patterns.fileOrganization)).toBe(true);
    });

    it('should generate dependencies documentation', () => {
      expect(docs.dependencies).toBeDefined();
      expect(docs.dependencies.overview).toBeTruthy();
      expect(Array.isArray(docs.dependencies.externalDependencies)).toBe(true);
      expect(Array.isArray(docs.dependencies.internalModules)).toBe(true);
      expect(Array.isArray(docs.dependencies.circularDependencies)).toBe(true);
    });

    it('should generate API surface documentation', () => {
      expect(docs.apiSurface).toBeDefined();
      expect(docs.apiSurface.overview).toBeTruthy();
      expect(Array.isArray(docs.apiSurface.publicInterfaces)).toBe(true);
      expect(Array.isArray(docs.apiSurface.publicClasses)).toBe(true);
      expect(Array.isArray(docs.apiSurface.publicFunctions)).toBe(true);
      expect(Array.isArray(docs.apiSurface.publicTypes)).toBe(true);
    });

    it('should generate data flow documentation', () => {
      expect(docs.dataFlow).toBeDefined();
      expect(docs.dataFlow.overview).toBeTruthy();
      expect(docs.dataFlow.stateManagement).toBeDefined();
      expect(Array.isArray(docs.dataFlow.dataStores)).toBe(true);
      expect(Array.isArray(docs.dataFlow.eventFlows)).toBe(true);
      expect(Array.isArray(docs.dataFlow.dataTransformations)).toBe(true);
    });

    it('should generate test strategy documentation', () => {
      expect(docs.testStrategy).toBeDefined();
      expect(docs.testStrategy.overview).toBeTruthy();
      expect(Array.isArray(docs.testStrategy.frameworks)).toBe(true);
      expect(Array.isArray(docs.testStrategy.testTypes)).toBe(true);
      expect(docs.testStrategy.coverage).toBeDefined();
    });

    it('should generate known issues documentation', () => {
      expect(docs.knownIssues).toBeDefined();
      expect(docs.knownIssues.overview).toBeTruthy();
      expect(Array.isArray(docs.knownIssues.technicalDebt)).toBe(true);
      expect(Array.isArray(docs.knownIssues.limitations)).toBe(true);
      expect(Array.isArray(docs.knownIssues.workarounds)).toBe(true);
      expect(Array.isArray(docs.knownIssues.futureImprovements)).toBe(true);
    });
  });

  describe('Save Documentation', () => {
    it('should save all documentation files', async () => {
      await analyzer.saveDocs(TEST_OUTPUT_DIR);

      // Check that files were created
      const expectedFiles = [
        'index.md',
        'ARCHITECTURE.md',
        'PATTERNS.md',
        'DEPENDENCIES.md',
        'API_SURFACE.md',
        'DATA_FLOW.md',
        'TEST_STRATEGY.md',
        'KNOWN_ISSUES.md',
      ];

      for (const file of expectedFiles) {
        const filePath = join(TEST_OUTPUT_DIR, file);
        await expect(access(filePath)).resolves.toBeUndefined();
      }
    });

    it('should generate valid markdown content', async () => {
      const archContent = await readFile(join(TEST_OUTPUT_DIR, 'ARCHITECTURE.md'), 'utf-8');

      // Check for markdown structure
      expect(archContent).toContain('# Architecture Documentation');
      expect(archContent).toContain('## Overview');
      expect(archContent).toContain('Generated:');
    });

    it('should generate index with links to all docs', async () => {
      const indexContent = await readFile(join(TEST_OUTPUT_DIR, 'index.md'), 'utf-8');

      expect(indexContent).toContain('# Codebase Documentation');
      expect(indexContent).toContain('[ARCHITECTURE.md](./ARCHITECTURE.md)');
      expect(indexContent).toContain('[PATTERNS.md](./PATTERNS.md)');
      expect(indexContent).toContain('[DEPENDENCIES.md](./DEPENDENCIES.md)');
      expect(indexContent).toContain('[API_SURFACE.md](./API_SURFACE.md)');
      expect(indexContent).toContain('[DATA_FLOW.md](./DATA_FLOW.md)');
      expect(indexContent).toContain('[TEST_STRATEGY.md](./TEST_STRATEGY.md)');
      expect(indexContent).toContain('[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)');
    });
  });

  describe('Context Generation', () => {
    it('should generate condensed context for token budget', () => {
      const context = analyzer.getDocsForContext(4000);

      expect(context).toBeTruthy();
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(100);
      // Rough token estimate (4 chars/token)
      expect(context.length).toBeLessThan(4000 * 4);
    });

    it('should prioritize architecture in context', () => {
      const context = analyzer.getDocsForContext(2000);

      expect(context).toContain('Architecture');
    });

    it('should get current docs', () => {
      const current = analyzer.getCurrentDocs();

      expect(current).toBeDefined();
      expect(current).toEqual(docs);
    });
  });

  describe('Update Documentation', () => {
    it('should update docs when files change', async () => {
      const originalOverview = docs.architecture.overview;

      // Update docs (currently does full re-analysis)
      await analyzer.updateDocs(['test-file.ts']);

      const updated = analyzer.getCurrentDocs();
      expect(updated).toBeDefined();
      // After update, should still have valid docs
      expect(updated?.architecture.overview).toBeTruthy();
    });
  });
});

describe('Convenience Functions', () => {
  const TEST_OUTPUT_DIR_2 = join(__dirname, '__test_output_2__');

  afterAll(async () => {
    try {
      await rm(TEST_OUTPUT_DIR_2, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('analyzeCodebase should return documentation', async () => {
    const docs = await analyzeCodebase(__dirname);

    expect(docs).toBeDefined();
    expect(docs.architecture).toBeDefined();
    expect(docs.patterns).toBeDefined();
  }, 60000);

  it('generateCodebaseDocs should create files', async () => {
    await mkdir(TEST_OUTPUT_DIR_2, { recursive: true });

    const docs = await generateCodebaseDocs(__dirname, TEST_OUTPUT_DIR_2);

    expect(docs).toBeDefined();

    // Check file exists
    await expect(access(join(TEST_OUTPUT_DIR_2, 'ARCHITECTURE.md'))).resolves.toBeUndefined();
  }, 60000);

  it('getCodebaseContext should return condensed docs', async () => {
    const context = await getCodebaseContext(__dirname, 2000);

    expect(context).toBeTruthy();
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(100);
  }, 60000);
});

describe('Error Handling', () => {
  it('should throw when saving docs before analysis', async () => {
    const analyzer = new CodebaseAnalyzer();

    await expect(analyzer.saveDocs()).rejects.toThrow('Must call analyze()');
  });

  it('should throw when generating architecture before analysis', async () => {
    const analyzer = new CodebaseAnalyzer();

    await expect(analyzer.generateArchitecture()).rejects.toThrow('Must call analyze()');
  });

  it('should return empty string for context before analysis', () => {
    const analyzer = new CodebaseAnalyzer();

    expect(analyzer.getDocsForContext()).toBe('');
  });

  it('should return null for getCurrentDocs before analysis', () => {
    const analyzer = new CodebaseAnalyzer();

    expect(analyzer.getCurrentDocs()).toBeNull();
  });
});
