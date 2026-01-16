/**
 * Tests for RepoMapGenerator
 *
 * @module infrastructure/analysis/RepoMapGenerator.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RepoMapGenerator, resetRepoMapGenerator } from './RepoMapGenerator';
import type { RepoMap, SymbolEntry, ParseResult } from './types';

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: vi.fn().mockResolvedValue([]),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
  stat: vi.fn().mockResolvedValue({
    size: 100,
    mtime: new Date(),
  }),
}));

// Get mocked modules
import fg from 'fast-glob';
import { readFile, stat } from 'fs/promises';

describe('RepoMapGenerator', () => {
  let generator: RepoMapGenerator;

  beforeEach(() => {
    resetRepoMapGenerator();
    generator = new RepoMapGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('initialization', () => {
    it('should not be initialized by default', () => {
      // Generator doesn't expose initialized state directly,
      // but we can test that generate() calls initialize()
      expect(generator.getCurrentMap()).toBeNull();
    });

    it('should initialize without errors', async () => {
      // Mock the parser initialization by replacing the parser instance
      (generator as any).parser = {
        initialize: vi.fn().mockResolvedValue(undefined),
        isReady: vi.fn().mockReturnValue(true),
        detectLanguage: vi.fn().mockReturnValue('typescript'),
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          file: '',
          symbols: [],
          imports: [],
          exports: [],
          errors: [],
          parseTime: 0,
        }),
      };

      await generator.initialize();
      // Should not throw - verify initialized flag is set
      expect((generator as any).initialized).toBe(true);
    });
  });

  // ============================================================================
  // Generation Tests (Mocked)
  // ============================================================================

  describe('generate', () => {
    beforeEach(() => {
      // Mock parser
      (generator as any).parser = {
        initialize: vi.fn().mockResolvedValue(undefined),
        isReady: vi.fn().mockReturnValue(true),
        detectLanguage: vi.fn().mockReturnValue('typescript'),
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          file: '/test/file.ts',
          symbols: [
            {
              id: '/test/file.ts#TestClass#1',
              name: 'TestClass',
              kind: 'class',
              file: '/test/file.ts',
              line: 1,
              endLine: 10,
              column: 0,
              signature: 'class TestClass',
              exported: true,
              references: 0,
              modifiers: ['export'],
            },
          ],
          imports: [],
          exports: [],
          errors: [],
          parseTime: 5,
        }),
      };

      // Mock fast-glob to return test files
      vi.mocked(fg).mockResolvedValue(['/test/file.ts']);

      // Mock file reading
      vi.mocked(readFile).mockResolvedValue('class TestClass {}');

      // Mock stat
      vi.mocked(stat).mockResolvedValue({
        size: 100,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as any);
    });

    it('should generate a repository map', async () => {
      const map = await generator.generate('/test');

      expect(map).toBeDefined();
      expect(map.projectPath).toContain('test');
      expect(map.generatedAt).toBeInstanceOf(Date);
      expect(map.stats).toBeDefined();
    });

    it('should store the current map', async () => {
      await generator.generate('/test');

      const currentMap = generator.getCurrentMap();
      expect(currentMap).not.toBeNull();
    });

    it('should calculate statistics', async () => {
      const map = await generator.generate('/test');

      expect(map.stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(map.stats.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(map.stats.totalDependencies).toBeGreaterThanOrEqual(0);
      expect(map.stats.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxFiles option', async () => {
      vi.mocked(fg).mockResolvedValue([
        '/test/file1.ts',
        '/test/file2.ts',
        '/test/file3.ts',
      ]);

      const map = await generator.generate('/test', { maxFiles: 2 });

      // Generator should limit files parsed
      expect((generator as any).parser.parseFile).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Query Methods Tests
  // ============================================================================

  describe('findSymbol', () => {
    it('should return empty array when no map is generated', () => {
      const results = generator.findSymbol('TestClass');
      expect(results).toEqual([]);
    });

    it('should find symbols by name after generation', async () => {
      // Setup mock
      const testSymbol: SymbolEntry = {
        id: '/test/file.ts#TestClass#1',
        name: 'TestClass',
        kind: 'class',
        file: '/test/file.ts',
        line: 1,
        endLine: 10,
        column: 0,
        signature: 'class TestClass',
        exported: true,
        references: 0,
        modifiers: ['export'],
      };

      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [testSymbol],
        dependencies: [],
        stats: {
          totalFiles: 1,
          totalSymbols: 1,
          totalDependencies: 0,
          languageBreakdown: { typescript: 1, javascript: 0 },
          symbolBreakdown: {
            class: 1,
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
          generationTime: 10,
        },
      };

      const results = generator.findSymbol('TestClass');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('TestClass');
    });
  });

  describe('findUsages', () => {
    it('should return empty array when no map is generated', () => {
      const usages = generator.findUsages('TestClass');
      expect(usages).toEqual([]);
    });

    it('should find usages in dependencies', async () => {
      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [],
        dependencies: [
          {
            from: '/test/consumer.ts',
            to: '/test/provider.ts',
            type: 'import',
            symbols: ['TestClass'],
            statement: "import { TestClass } from './provider'",
            line: 1,
          },
        ],
        stats: {} as any,
      };

      const usages = generator.findUsages('TestClass');
      expect(usages).toHaveLength(1);
      expect(usages[0].file).toBe('/test/consumer.ts');
      expect(usages[0].usageType).toBe('import');
    });
  });

  describe('findImplementations', () => {
    it('should return empty array when no map is generated', () => {
      const implementations = generator.findImplementations('ITestInterface');
      expect(implementations).toEqual([]);
    });

    it('should find classes implementing an interface', async () => {
      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [
          {
            id: '/test/impl.ts#TestImpl#1',
            name: 'TestImpl',
            kind: 'class',
            file: '/test/impl.ts',
            line: 1,
            endLine: 10,
            column: 0,
            signature: 'class TestImpl implements ITestInterface',
            exported: true,
            references: 0,
            modifiers: ['export'],
          },
          {
            id: '/test/other.ts#OtherClass#1',
            name: 'OtherClass',
            kind: 'class',
            file: '/test/other.ts',
            line: 1,
            endLine: 10,
            column: 0,
            signature: 'class OtherClass',
            exported: true,
            references: 0,
            modifiers: ['export'],
          },
        ],
        dependencies: [],
        stats: {} as any,
      };

      const implementations = generator.findImplementations('ITestInterface');
      expect(implementations).toHaveLength(1);
      expect(implementations[0].name).toBe('TestImpl');
    });
  });

  // ============================================================================
  // Formatting Tests
  // ============================================================================

  describe('formatForContext', () => {
    it('should throw error when no map is generated', () => {
      expect(() => generator.formatForContext()).toThrow(
        'No repo map generated. Call generate() first.'
      );
    });

    it('should format repository map', async () => {
      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [
          {
            path: '/test/file.ts',
            relativePath: 'file.ts',
            language: 'typescript',
            size: 100,
            lastModified: new Date(),
            symbolCount: 1,
            lineCount: 10,
          },
        ],
        symbols: [
          {
            id: '/test/file.ts#TestClass#1',
            name: 'TestClass',
            kind: 'class',
            file: '/test/file.ts',
            line: 1,
            endLine: 10,
            column: 0,
            signature: 'class TestClass',
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
            class: 1,
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
          generationTime: 10,
        },
      };

      const formatted = generator.formatForContext();
      expect(formatted).toContain('Repository Map');
      expect(formatted).toContain('TestClass');
    });

    it('should respect maxTokens option', async () => {
      // Create a map with many symbols
      const symbols: SymbolEntry[] = [];
      for (let i = 0; i < 100; i++) {
        symbols.push({
          id: `/test/file.ts#Symbol${i}#${i + 1}`,
          name: `Symbol${i}`,
          kind: 'function',
          file: '/test/file.ts',
          line: i + 1,
          endLine: i + 2,
          column: 0,
          signature: `Symbol${i}()`,
          exported: true,
          references: 0,
          modifiers: ['export'],
        });
      }

      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [
          {
            path: '/test/file.ts',
            relativePath: 'file.ts',
            language: 'typescript',
            size: 1000,
            lastModified: new Date(),
            symbolCount: 100,
            lineCount: 200,
          },
        ],
        symbols,
        dependencies: [],
        stats: {
          totalFiles: 1,
          totalSymbols: 100,
          totalDependencies: 0,
          languageBreakdown: { typescript: 1, javascript: 0 },
          symbolBreakdown: {
            class: 0,
            interface: 0,
            function: 100,
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
          generationTime: 10,
        },
      };

      const formatted = generator.formatForContext({ maxTokens: 100 });
      const tokenEstimate = formatted.length / 4;

      // Should be within budget (with some tolerance)
      expect(tokenEstimate).toBeLessThanOrEqual(150);
    });
  });

  describe('getTokenCount', () => {
    it('should return 0 when no map is generated', () => {
      const count = generator.getTokenCount();
      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // Cache Management Tests
  // ============================================================================

  describe('clearCache', () => {
    it('should clear the current map', async () => {
      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [],
        dependencies: [],
        stats: {} as any,
      };

      expect(generator.getCurrentMap()).not.toBeNull();

      generator.clearCache();

      expect(generator.getCurrentMap()).toBeNull();
    });
  });

  // ============================================================================
  // Dependency Methods Tests
  // ============================================================================

  describe('getDependencies', () => {
    it('should return dependencies for a file', () => {
      // This delegates to DependencyGraphBuilder
      const deps = generator.getDependencies('/test/file.ts');
      expect(Array.isArray(deps)).toBe(true);
    });
  });

  describe('getDependents', () => {
    it('should return dependents for a file', () => {
      // This delegates to DependencyGraphBuilder
      const dependents = generator.getDependents('/test/file.ts');
      expect(Array.isArray(dependents)).toBe(true);
    });
  });

  // ============================================================================
  // Incremental Generation Tests
  // ============================================================================

  describe('generateIncremental', () => {
    it('should do full generation if no current map exists', async () => {
      const generateSpy = vi.spyOn(generator, 'generate');
      generateSpy.mockResolvedValue({
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [],
        dependencies: [],
        stats: {} as any,
      });

      await generator.generateIncremental('/test', ['/test/changed.ts']);

      expect(generateSpy).toHaveBeenCalledWith('/test');
    });

    it('should update only changed files when map exists', async () => {
      // Setup existing map
      (generator as any).currentMap = {
        projectPath: '/test',
        generatedAt: new Date(),
        files: [],
        symbols: [],
        dependencies: [],
        stats: {} as any,
      };

      (generator as any).parseResultsCache = new Map();

      // Mock parser
      const mockParseFile = vi.fn().mockResolvedValue({
        success: true,
        file: '/test/changed.ts',
        symbols: [],
        imports: [],
        exports: [],
        errors: [],
        parseTime: 5,
      });

      (generator as any).parser = {
        initialize: vi.fn(),
        isReady: vi.fn().mockReturnValue(true),
        parseFile: mockParseFile,
        detectLanguage: vi.fn().mockReturnValue('typescript'),
      };

      vi.mocked(readFile).mockResolvedValue('const x = 1;');
      vi.mocked(stat).mockResolvedValue({
        size: 15,
        mtime: new Date(),
        isFile: () => true,
      } as any);

      await generator.generateIncremental('/test', ['/test/changed.ts']);

      expect(mockParseFile).toHaveBeenCalledWith(
        expect.stringContaining('changed.ts'),
        expect.any(String)
      );
    });
  });
});
