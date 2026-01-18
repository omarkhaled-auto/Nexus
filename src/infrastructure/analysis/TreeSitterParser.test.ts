/**
 * TreeSitterParser Tests
 *
 * Tests for the WASM-based tree-sitter parser wrapper.
 *
 * Unit tests use mocks to avoid WASM loading during CI.
 * Integration tests (marked with .skip) use real WASM parsing.
 *
 * @module infrastructure/analysis/TreeSitterParser.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TreeSitterParser, getParser, resetParser } from './TreeSitterParser';
import type { ParseResult, SupportedLanguage } from './types';

// ============================================================================
// Mocks
// ============================================================================

// Mock web-tree-sitter for unit tests
vi.mock('web-tree-sitter', () => {
  const mockTree = {
    rootNode: {
      type: 'program',
      text: '',
      startPosition: { row: 0, column: 0 },
      endPosition: { row: 0, column: 0 },
      children: [],
      childCount: 0,
      namedChildren: [],
      namedChildCount: 0,
      parent: null,
      childForFieldName: () => null,
      childrenForFieldName: () => [],
      previousSibling: null,
      nextSibling: null,
      isNamed: true,
      hasError: false,
      descendantsOfType: () => [],
    },
  };

  const MockParser = vi.fn().mockImplementation(() => ({
    parse: vi.fn().mockReturnValue(mockTree),
    setLanguage: vi.fn(),
  }));

  MockParser.init = vi.fn().mockResolvedValue(undefined);
  MockParser.Language = {
    load: vi.fn().mockResolvedValue({}),
  };

  return {
    default: MockParser,
  };
});

describe('TreeSitterParser', () => {
  let parser: TreeSitterParser;

  beforeEach(() => {
    resetParser();
    parser = new TreeSitterParser();
  });

  afterEach(() => {
    resetParser();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('initialization', () => {
    it('should not be ready before initialization', () => {
      expect(parser.isReady()).toBe(false);
    });

    it('should be ready after initialization', async () => {
      await parser.initialize();
      expect(parser.isReady()).toBe(true);
    });

    it('should support TypeScript and JavaScript', () => {
      const languages = parser.getSupportedLanguages();
      expect(languages).toContain('typescript');
      expect(languages).toContain('javascript');
      expect(languages).toHaveLength(2);
    });

    it('should only initialize once', async () => {
      await parser.initialize();
      const readyBefore = parser.isReady();
      await parser.initialize();
      const readyAfter = parser.isReady();
      // Parser should remain ready after second call
      expect(readyBefore).toBe(true);
      expect(readyAfter).toBe(true);
    });
  });

  // ============================================================================
  // Language Detection Tests
  // ============================================================================

  describe('detectLanguage', () => {
    it('should detect TypeScript from .ts extension', () => {
      expect(parser.detectLanguage('file.ts')).toBe('typescript');
    });

    it('should detect TypeScript from .tsx extension', () => {
      expect(parser.detectLanguage('component.tsx')).toBe('typescript');
    });

    it('should detect TypeScript from .mts extension', () => {
      expect(parser.detectLanguage('module.mts')).toBe('typescript');
    });

    it('should detect JavaScript from .js extension', () => {
      expect(parser.detectLanguage('script.js')).toBe('javascript');
    });

    it('should detect JavaScript from .jsx extension', () => {
      expect(parser.detectLanguage('component.jsx')).toBe('javascript');
    });

    it('should detect JavaScript from .mjs extension', () => {
      expect(parser.detectLanguage('module.mjs')).toBe('javascript');
    });

    it('should return null for .css files', () => {
      expect(parser.detectLanguage('styles.css')).toBeNull();
    });

    it('should return null for .json files', () => {
      expect(parser.detectLanguage('config.json')).toBeNull();
    });

    it('should return null for .md files', () => {
      expect(parser.detectLanguage('README.md')).toBeNull();
    });

    it('should handle paths with directories', () => {
      expect(parser.detectLanguage('/src/utils/helpers.ts')).toBe('typescript');
      expect(parser.detectLanguage('C:\\Users\\dev\\project\\file.js')).toBe('javascript');
    });

    it('should be case-insensitive for extensions', () => {
      expect(parser.detectLanguage('FILE.TS')).toBe('typescript');
      expect(parser.detectLanguage('file.JS')).toBe('javascript');
    });
  });

  // ============================================================================
  // Parse Result Structure Tests
  // ============================================================================

  describe('parseFile', () => {
    it('should return error for unsupported file types', async () => {
      await parser.initialize();
      const result = await parser.parseFile('styles.css', '.body { color: red; }');

      expect(result.success).toBe(false);
      expect(result.file).toBe('styles.css');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unsupported file type');
    });

    it('should return proper ParseResult structure', async () => {
      await parser.initialize();
      const result = await parser.parseFile('test.ts', 'const x = 1;');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('symbols');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('parseTime');

      expect(Array.isArray(result.symbols)).toBe(true);
      expect(Array.isArray(result.imports)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.parseTime).toBe('number');
    });

    it('should handle empty files', async () => {
      await parser.initialize();
      const result = await parser.parseFile('empty.ts', '');

      expect(result.success).toBe(true);
      expect(result.symbols).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });

    it('should include file path in result', async () => {
      await parser.initialize();
      const result = await parser.parseFile('/path/to/file.ts', 'const x = 1;');

      expect(result.file).toBe('/path/to/file.ts');
    });

    it('should measure parse time', async () => {
      await parser.initialize();
      const result = await parser.parseFile('test.ts', 'const x = 1;');

      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // parseFiles Tests
  // ============================================================================

  describe('parseFiles', () => {
    it('should parse multiple files', async () => {
      await parser.initialize();
      const files = [
        { path: 'file1.ts', content: 'const a = 1;' },
        { path: 'file2.ts', content: 'const b = 2;' },
        { path: 'file3.ts', content: 'const c = 3;' },
      ];

      const results = await parser.parseFiles(files);

      expect(results).toHaveLength(3);
      expect(results[0].file).toBe('file1.ts');
      expect(results[1].file).toBe('file2.ts');
      expect(results[2].file).toBe('file3.ts');
    });

    it('should handle empty array', async () => {
      await parser.initialize();
      const results = await parser.parseFiles([]);

      expect(results).toHaveLength(0);
    });

    it('should process files in order', async () => {
      await parser.initialize();
      const files = [
        { path: 'first.ts', content: 'const first = 1;' },
        { path: 'second.ts', content: 'const second = 2;' },
      ];

      const results = await parser.parseFiles(files);

      expect(results[0].file).toBe('first.ts');
      expect(results[1].file).toBe('second.ts');
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('getParser', () => {
    it('should return a TreeSitterParser instance', () => {
      const instance = getParser();
      expect(instance).toBeInstanceOf(TreeSitterParser);
    });

    it('should return the same instance on multiple calls', () => {
      const instance1 = getParser();
      const instance2 = getParser();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getParser();
      resetParser();
      const instance2 = getParser();
      expect(instance1).not.toBe(instance2);
    });
  });
});

// Integration tests moved to TreeSitterParser.integration.test.ts
// They use real WASM parsing without mocking
