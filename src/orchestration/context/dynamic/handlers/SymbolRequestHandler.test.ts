/**
 * SymbolRequestHandler Tests
 *
 * Tests for the symbol definition and context request handler.
 *
 * @module SymbolRequestHandler.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SymbolRequestHandler, createSymbolRequestHandler } from './SymbolRequestHandler';
import { ContextRequest } from '../types';
import type {
  IRepoMapGenerator,
  SymbolEntry,
  SymbolUsage,
  RepoMap,
} from '../../../../infrastructure/analysis/types';

// ============================================================================
// Mock RepoMapGenerator
// ============================================================================

function createMockRepoMapGenerator(
  symbols: SymbolEntry[] = [],
  usages: SymbolUsage[] = []
): IRepoMapGenerator {
  const mockMap: RepoMap = {
    projectPath: '/mock/project',
    generatedAt: new Date(),
    files: [],
    symbols,
    dependencies: [],
    stats: {
      totalFiles: 0,
      totalSymbols: symbols.length,
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

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue(mockMap),
    generateIncremental: vi.fn().mockResolvedValue(mockMap),
    findSymbol: vi.fn().mockImplementation((name: string) => {
      return symbols.filter((s) =>
        s.name === name || s.name.toLowerCase() === name.toLowerCase()
      );
    }),
    findUsages: vi.fn().mockImplementation((_symbolName: string) => {
      return usages;
    }),
    findImplementations: vi.fn().mockReturnValue([]),
    getCurrentMap: vi.fn().mockReturnValue(mockMap),
    formatForContext: vi.fn().mockReturnValue(''),
    clearCache: vi.fn(),
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

const createRequest = (
  query: string,
  type: 'symbol' | 'definition' = 'symbol',
  options?: Partial<ContextRequest>
): ContextRequest => ({
  type,
  query,
  agentId: 'test-agent',
  taskId: 'test-task',
  reason: 'Testing symbol lookup',
  timestamp: new Date(),
  ...options,
});

const createMockSymbol = (overrides: Partial<SymbolEntry> = {}): SymbolEntry => ({
  id: 'test-symbol-1',
  name: 'TestClass',
  kind: 'class',
  file: '/mock/project/src/TestClass.ts',
  line: 10,
  endLine: 50,
  column: 0,
  signature: 'export class TestClass implements ITest',
  documentation: '/** A test class for demonstration */',
  references: 5,
  exported: true,
  modifiers: ['export'],
  ...overrides,
});

const createMockUsage = (overrides: Partial<SymbolUsage> = {}): SymbolUsage => ({
  file: '/mock/project/src/consumer.ts',
  line: 15,
  context: 'const instance = new TestClass();',
  usageType: 'call',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('SymbolRequestHandler', () => {
  let handler: SymbolRequestHandler;
  let mockRepoMapGenerator: IRepoMapGenerator;

  beforeEach(() => {
    mockRepoMapGenerator = createMockRepoMapGenerator();
    handler = new SymbolRequestHandler(
      { projectRoot: '/mock/project' },
      mockRepoMapGenerator
    );
  });

  describe('canHandle', () => {
    it('should return true for "symbol" type', () => {
      expect(handler.canHandle('symbol')).toBe(true);
    });

    it('should return true for "definition" type', () => {
      expect(handler.canHandle('definition')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(handler.canHandle('file')).toBe(false);
      expect(handler.canHandle('search')).toBe(false);
      expect(handler.canHandle('usages')).toBe(false);
    });
  });

  describe('handle - symbol finding', () => {
    it('should find symbol and return context', async () => {
      const mockSymbol = createMockSymbol();
      const mockUsage = createMockUsage();
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], [mockUsage]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.type).toBe('symbol');
      expect(response.content).toContain('TestClass');
      expect(response.content).toContain('class');
      expect(response.metadata?.symbolName).toBe('TestClass');
      expect(response.metadata?.symbolKind).toBe('class');
    });

    it('should return error for non-existent symbol', async () => {
      const request = createRequest('NonExistentSymbol');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
      expect(response.content).toBe('');
    });

    it('should include usages when type is "symbol"', async () => {
      const mockSymbol = createMockSymbol();
      const mockUsages = [
        createMockUsage({ line: 15, context: 'const a = new TestClass();' }),
        createMockUsage({ line: 20, context: 'const b = new TestClass();' }),
      ];
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], mockUsages);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'symbol');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Usages');
      expect(response.metadata?.usagesCount).toBe(2);
    });

    it('should not include usages when type is "definition"', async () => {
      const mockSymbol = createMockSymbol();
      const mockUsages = [
        createMockUsage({ line: 15 }),
        createMockUsage({ line: 20 }),
      ];
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], mockUsages);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'definition');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.usagesCount).toBe(0);
    });
  });

  describe('handle - definition retrieval', () => {
    it('should retrieve definition with correct file and line', async () => {
      const mockSymbol = createMockSymbol({
        file: '/mock/project/src/MyClass.ts',
        line: 25,
        column: 7,
      });
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'definition');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.source).toBe('/mock/project/src/MyClass.ts');
      expect(response.metadata?.file).toBe('/mock/project/src/MyClass.ts');
      expect(response.metadata?.line).toBe(25);
      expect(response.metadata?.column).toBe(7);
    });

    it('should include documentation when present', async () => {
      const mockSymbol = createMockSymbol({
        documentation: '/** This is a detailed documentation comment */',
      });
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Documentation');
      expect(response.content).toContain('detailed documentation');
      expect(response.metadata?.hasDocumentation).toBe(true);
    });
  });

  describe('handle - usage finding', () => {
    it('should limit usages based on options', async () => {
      const mockSymbol = createMockSymbol();
      const mockUsages = Array.from({ length: 20 }, (_, i) =>
        createMockUsage({ line: i + 1 })
      );
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], mockUsages);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project', maxUsages: 5 },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'symbol', {
        options: { limit: 3 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      // Should respect the limit option (3) which is less than maxUsages (5)
      expect(response.metadata?.usagesCount).toBeLessThanOrEqual(3);
    });

    it('should categorize usage types correctly', async () => {
      const mockSymbol = createMockSymbol();
      const mockUsages = [
        createMockUsage({ usageType: 'import', context: "import { TestClass } from './test'" }),
        createMockUsage({ usageType: 'call', context: 'new TestClass()' }),
        createMockUsage({ usageType: 'reference', context: 'const ref = TestClass' }),
        createMockUsage({ usageType: 'type', context: 'const x: TestClass' }),
      ];
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], mockUsages);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('import');
      expect(response.content).toContain('call');
    });
  });

  describe('handle - ambiguous symbol handling', () => {
    it('should return first match when multiple symbols have same name', async () => {
      const mockSymbols = [
        createMockSymbol({ id: '1', file: '/mock/project/src/file1.ts', line: 10 }),
        createMockSymbol({ id: '2', file: '/mock/project/src/file2.ts', line: 20 }),
      ];
      mockRepoMapGenerator = createMockRepoMapGenerator(mockSymbols);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      // Should return the first match
      expect(response.source).toBe('/mock/project/src/file1.ts');
    });
  });

  describe('handle - not found handling', () => {
    it('should return appropriate error for not found symbol', async () => {
      const request = createRequest('MissingSymbol');
      const response = await handler.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('MissingSymbol');
      expect(response.error).toContain('not found');
    });

    it('should work without RepoMapGenerator (returns not found)', async () => {
      const handlerWithoutGenerator = new SymbolRequestHandler({
        projectRoot: '/mock/project',
      });

      const request = createRequest('SomeSymbol');
      const response = await handlerWithoutGenerator.handle(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });
  });

  describe('handle - different symbol kinds', () => {
    it.each([
      ['function', 'function myFunction() {}'],
      ['class', 'class MyClass {}'],
      ['interface', 'interface IMyInterface {}'],
      ['type', 'type MyType = string'],
      ['variable', 'const myVar = 123'],
      ['method', 'myMethod() {}'],
      ['enum', 'enum MyEnum {}'],
    ])('should handle %s symbols', async (kind, signature) => {
      const mockSymbol = createMockSymbol({
        kind: kind as SymbolEntry['kind'],
        name: 'TestSymbol',
        signature,
      });
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestSymbol');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.symbolKind).toBeDefined();
    });
  });

  describe('handle - token budget', () => {
    it('should truncate response when exceeding token budget', async () => {
      const mockSymbol = createMockSymbol({
        documentation: 'A'.repeat(5000), // Large documentation
      });
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'symbol', {
        options: { maxTokens: 100 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.wasTruncated).toBe(true);
      expect(response.content).toContain('truncated');
    });

    it('should not truncate when within token budget', async () => {
      const mockSymbol = createMockSymbol();
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol]);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass', 'symbol', {
        options: { maxTokens: 10000 },
      });
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.wasTruncated).toBe(false);
    });
  });

  describe('createSymbolRequestHandler factory', () => {
    it('should create handler with project root only', () => {
      const handler = createSymbolRequestHandler('/test/project');
      expect(handler).toBeInstanceOf(SymbolRequestHandler);
      expect(handler.canHandle('symbol')).toBe(true);
    });

    it('should create handler with RepoMapGenerator', () => {
      const mockGenerator = createMockRepoMapGenerator();
      const handler = createSymbolRequestHandler('/test/project', mockGenerator);
      expect(handler).toBeInstanceOf(SymbolRequestHandler);
    });

    it('should create handler with additional options', () => {
      const handler = createSymbolRequestHandler('/test/project', undefined, {
        contextLines: 10,
        maxUsages: 20,
      });
      expect(handler).toBeInstanceOf(SymbolRequestHandler);
    });
  });

  describe('response metadata', () => {
    it('should include all expected metadata fields', async () => {
      const mockSymbol = createMockSymbol({
        documentation: '/** Docs */',
      });
      const mockUsages = [createMockUsage(), createMockUsage()];
      mockRepoMapGenerator = createMockRepoMapGenerator([mockSymbol], mockUsages);
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('TestClass');
      const response = await handler.handle(request);

      expect(response.metadata).toBeDefined();
      expect(response.metadata?.symbolName).toBe('TestClass');
      expect(response.metadata?.symbolKind).toBe('class');
      expect(response.metadata?.file).toBeDefined();
      expect(response.metadata?.line).toBeDefined();
      expect(response.metadata?.column).toBeDefined();
      expect(response.metadata?.usagesCount).toBeDefined();
      expect(response.metadata?.hasDocumentation).toBe(true);
      expect(response.metadata?.wasTruncated).toBeDefined();
      expect(response.metadata?.relatedSymbols).toBeDefined();
    });
  });

  describe('related symbols', () => {
    it('should find related symbols in same file', async () => {
      const mainSymbol = createMockSymbol({
        id: 'main',
        name: 'MainClass',
        file: '/mock/project/src/main.ts',
      });
      const relatedSymbol = createMockSymbol({
        id: 'related',
        name: 'RelatedHelper',
        file: '/mock/project/src/main.ts',
        exported: true,
      });

      const mockMap: RepoMap = {
        projectPath: '/mock/project',
        generatedAt: new Date(),
        files: [],
        symbols: [mainSymbol, relatedSymbol],
        dependencies: [],
        stats: {
          totalFiles: 1,
          totalSymbols: 2,
          totalDependencies: 0,
          languageBreakdown: { typescript: 1, javascript: 0 },
          symbolBreakdown: {
            class: 2,
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

      mockRepoMapGenerator = {
        ...createMockRepoMapGenerator([mainSymbol]),
        getCurrentMap: vi.fn().mockReturnValue(mockMap),
      };
      handler = new SymbolRequestHandler(
        { projectRoot: '/mock/project' },
        mockRepoMapGenerator
      );

      const request = createRequest('MainClass');
      const response = await handler.handle(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.relatedSymbols).toContain('RelatedHelper');
    });
  });
});
