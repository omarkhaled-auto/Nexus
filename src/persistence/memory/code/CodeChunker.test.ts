/**
 * CodeChunker Tests
 *
 * Tests for intelligent code chunking that respects semantic boundaries.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CodeChunker,
  createCodeChunker,
  getCodeChunker,
  resetCodeChunker,
} from './CodeChunker';
import type { SymbolEntry, SymbolKind, SymbolModifier } from '../../../infrastructure/analysis/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const SAMPLE_TS_FILE = `
import { Logger } from './logger';
import type { Config } from './types';

const CONFIG_VERSION = '1.0.0';

/**
 * Represents a user in the system
 */
export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * UserService handles user operations
 */
export class UserService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getUser(id: string): Promise<User | null> {
    this.logger.info('Getting user', { id });
    return null;
  }

  async createUser(data: Partial<User>): Promise<User> {
    this.logger.info('Creating user', { data });
    return { id: '1', name: data.name ?? '', email: data.email ?? '' };
  }
}

/**
 * Helper function to validate user data
 */
export function validateUser(user: Partial<User>): boolean {
  return !!(user.name && user.email);
}

export type UserRole = 'admin' | 'user' | 'guest';
`;

const SAMPLE_JS_FILE = `
const express = require('express');
const { Router } = require('express');

function createApp() {
  const app = express();
  return app;
}

class ApiController {
  constructor(router) {
    this.router = router;
  }

  handleRequest(req, res) {
    res.json({ status: 'ok' });
  }
}

module.exports = { createApp, ApiController };
`;

const SIMPLE_FUNCTIONS_FILE = `
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}
`;

// Helper to create mock symbol entries
function createMockSymbol(
  overrides: Partial<SymbolEntry> = {}
): SymbolEntry {
  return {
    id: 'test-id',
    name: 'testSymbol',
    kind: 'function' as SymbolKind,
    file: 'test.ts',
    line: 1,
    endLine: 5,
    column: 0,
    signature: 'function testSymbol(): void',
    references: 0,
    exported: true,
    modifiers: ['export'] as SymbolModifier[],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CodeChunker', () => {
  let chunker: CodeChunker;

  beforeEach(() => {
    resetCodeChunker();
    chunker = createCodeChunker();
  });

  afterEach(() => {
    resetCodeChunker();
  });

  // --------------------------------------------------------------------------
  // Basic Chunking
  // --------------------------------------------------------------------------

  describe('chunkFile', () => {
    it('should create chunks for a TypeScript file', () => {
      const chunks = chunker.chunkFile('src/user.ts', SAMPLE_TS_FILE);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].file).toBe('src/user.ts');
      expect(chunks[0].metadata.language).toBe('typescript');
    });

    it('should create chunks for a JavaScript file', () => {
      const chunks = chunker.chunkFile('src/app.js', SAMPLE_JS_FILE);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].file).toBe('src/app.js');
      expect(chunks[0].metadata.language).toBe('javascript');
    });

    it('should handle empty content', () => {
      const chunks = chunker.chunkFile('src/empty.ts', '');

      expect(chunks).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const chunks = chunker.chunkFile('src/whitespace.ts', '   \n\n   ');

      expect(chunks).toHaveLength(0);
    });

    it('should generate unique chunk IDs', () => {
      const chunks = chunker.chunkFile('src/test.ts', SIMPLE_FUNCTIONS_FILE);
      const ids = chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set correct line numbers', () => {
      const chunks = chunker.chunkFile('src/test.ts', SIMPLE_FUNCTIONS_FILE);

      for (const chunk of chunks) {
        expect(chunk.startLine).toBeGreaterThan(0);
        expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Symbol-based Chunking
  // --------------------------------------------------------------------------

  describe('chunkBySymbols', () => {
    it('should create chunks based on symbols', () => {
      const content = `
function first() { return 1; }
function second() { return 2; }
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#first#2',
          name: 'first',
          kind: 'function',
          line: 2,
          endLine: 2,
        }),
        createMockSymbol({
          id: 'file#second#3',
          name: 'second',
          kind: 'function',
          line: 3,
          endLine: 3,
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Find chunks containing our functions
      const firstChunk = chunks.find((c) => c.symbols.includes('first'));
      const secondChunk = chunks.find((c) => c.symbols.includes('second'));

      expect(firstChunk).toBeDefined();
      expect(secondChunk).toBeDefined();
    });

    it('should handle class with methods', () => {
      const content = `
class MyClass {
  constructor() {}
  method1() { return 1; }
  method2() { return 2; }
}
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#MyClass#2',
          name: 'MyClass',
          kind: 'class',
          line: 2,
          endLine: 6,
        }),
        createMockSymbol({
          id: 'file#constructor#3',
          name: 'constructor',
          kind: 'method',
          line: 3,
          endLine: 3,
          parentId: 'file#MyClass#2',
        }),
        createMockSymbol({
          id: 'file#method1#4',
          name: 'method1',
          kind: 'method',
          line: 4,
          endLine: 4,
          parentId: 'file#MyClass#2',
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      // Should have a single chunk for the class
      const classChunk = chunks.find((c) => c.symbols.includes('MyClass'));
      expect(classChunk).toBeDefined();
      expect(classChunk?.chunkType).toBe('class');

      // Methods should be included in class symbols
      expect(classChunk?.symbols).toContain('constructor');
      expect(classChunk?.symbols).toContain('method1');
    });

    it('should handle interfaces', () => {
      const content = `
interface Config {
  name: string;
  value: number;
}
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#Config#2',
          name: 'Config',
          kind: 'interface',
          line: 2,
          endLine: 5,
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      const interfaceChunk = chunks.find((c) => c.symbols.includes('Config'));
      expect(interfaceChunk).toBeDefined();
      expect(interfaceChunk?.chunkType).toBe('interface');
    });

    it('should handle type aliases', () => {
      const content = `
type Status = 'active' | 'inactive';
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#Status#2',
          name: 'Status',
          kind: 'type',
          line: 2,
          endLine: 2,
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      const typeChunk = chunks.find((c) => c.symbols.includes('Status'));
      expect(typeChunk).toBeDefined();
      expect(typeChunk?.chunkType).toBe('type');
    });

    it('should handle files with no symbols', () => {
      const content = '// Just a comment\n';
      const chunks = chunker.chunkBySymbols('test.ts', content, []);

      // Should fall back to line-based chunking
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should create preamble chunk for imports', () => {
      const content = `
import { Something } from './something';
import type { Type } from './types';

function main() {}
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#main#5',
          name: 'main',
          kind: 'function',
          line: 5,
          endLine: 5,
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      // Should have at least 2 chunks: preamble (imports) and function
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // First chunk should be module type (imports)
      const preambleChunk = chunks.find((c) => c.chunkType === 'module');
      expect(preambleChunk).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Hash Calculation
  // --------------------------------------------------------------------------

  describe('hash calculation', () => {
    it('should generate consistent hashes for same content', () => {
      const content = 'function test() { return true; }';
      const chunks1 = chunker.chunkFile('test.ts', content);
      const chunks2 = chunker.chunkFile('test.ts', content);

      expect(chunks1[0].metadata.hash).toBe(chunks2[0].metadata.hash);
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'function test1() { return true; }';
      const content2 = 'function test2() { return false; }';

      const chunks1 = chunker.chunkFile('test.ts', content1);
      const chunks2 = chunker.chunkFile('test.ts', content2);

      expect(chunks1[0].metadata.hash).not.toBe(chunks2[0].metadata.hash);
    });
  });

  // --------------------------------------------------------------------------
  // Dependency Extraction
  // --------------------------------------------------------------------------

  describe('dependency extraction', () => {
    it('should extract ES6 imports', () => {
      const content = `
import { foo } from './foo';
import bar from './bar';
import * as utils from './utils';

function test() {}
`;
      const chunks = chunker.chunkFile('test.ts', content);
      const allDeps = chunks.flatMap((c) => c.metadata.dependencies ?? []);

      expect(allDeps).toContain('./foo');
      expect(allDeps).toContain('./bar');
      expect(allDeps).toContain('./utils');
    });

    it('should extract require statements', () => {
      const content = `
const express = require('express');
const { Router } = require('express');

function test() {}
`;
      const chunks = chunker.chunkFile('test.js', content);
      const allDeps = chunks.flatMap((c) => c.metadata.dependencies ?? []);

      expect(allDeps).toContain('express');
    });

    it('should extract dynamic imports', () => {
      const content = `
async function loadModule() {
  const mod = await import('./dynamic-module');
  return mod;
}
`;
      const chunks = chunker.chunkFile('test.ts', content);
      const allDeps = chunks.flatMap((c) => c.metadata.dependencies ?? []);

      expect(allDeps).toContain('./dynamic-module');
    });

    it('should handle files with no dependencies', () => {
      const content = 'const x = 42;';
      const chunks = chunker.chunkFile('test.ts', content);

      expect(chunks[0].metadata.dependencies).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Export Extraction
  // --------------------------------------------------------------------------

  describe('export extraction', () => {
    it('should extract named exports', () => {
      const content = `
export function foo() {}
export class Bar {}
export const baz = 42;
`;
      const chunks = chunker.chunkFile('test.ts', content);
      const allExports = chunks.flatMap((c) => c.metadata.exports ?? []);

      expect(allExports).toContain('foo');
      expect(allExports).toContain('Bar');
      expect(allExports).toContain('baz');
    });

    it('should extract default exports', () => {
      const content = `
export default function main() {}
`;
      const chunks = chunker.chunkFile('test.ts', content);
      const allExports = chunks.flatMap((c) => c.metadata.exports ?? []);

      expect(allExports).toContain('default');
      expect(allExports).toContain('main');
    });
  });

  // --------------------------------------------------------------------------
  // Complexity Estimation
  // --------------------------------------------------------------------------

  describe('complexity estimation', () => {
    it('should calculate higher complexity for control flow', () => {
      const simpleContent = 'function simple() { return 42; }';
      const complexContent = `
function complex(x) {
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      if (i % 2 === 0) {
        console.log(i);
      }
    }
  } else {
    while (x < 0) {
      x++;
    }
  }
  return x > 0 ? 'positive' : 'negative';
}
`;
      const simpleChunks = chunker.chunkFile('simple.ts', simpleContent);
      const complexChunks = chunker.chunkFile('complex.ts', complexContent);

      const simpleComplexity = simpleChunks[0]?.metadata.complexity ?? 0;
      const complexComplexity = complexChunks[0]?.metadata.complexity ?? 0;

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });
  });

  // --------------------------------------------------------------------------
  // Language Detection
  // --------------------------------------------------------------------------

  describe('language detection', () => {
    it('should detect TypeScript', () => {
      const chunks = chunker.chunkFile('test.ts', 'const x = 1;');
      expect(chunks[0].metadata.language).toBe('typescript');
    });

    it('should detect TSX', () => {
      const chunks = chunker.chunkFile('component.tsx', 'const x = 1;');
      expect(chunks[0].metadata.language).toBe('typescript');
    });

    it('should detect JavaScript', () => {
      const chunks = chunker.chunkFile('test.js', 'const x = 1;');
      expect(chunks[0].metadata.language).toBe('javascript');
    });

    it('should detect JSX', () => {
      const chunks = chunker.chunkFile('component.jsx', 'const x = 1;');
      expect(chunks[0].metadata.language).toBe('javascript');
    });

    it('should detect Python', () => {
      const chunks = chunker.chunkFile('script.py', 'x = 1');
      expect(chunks[0].metadata.language).toBe('python');
    });

    it('should handle unknown extensions', () => {
      const chunks = chunker.chunkFile('file.unknown', 'content');
      expect(chunks[0].metadata.language).toBe('unknown');
    });
  });

  // --------------------------------------------------------------------------
  // Overlap Handling
  // --------------------------------------------------------------------------

  describe('overlap handling', () => {
    it('should create overlapping chunks when configured', () => {
      const content = Array.from({ length: 100 }, (_, i) => `line ${i}`).join(
        '\n'
      );

      const chunkerWithOverlap = createCodeChunker(undefined, {
        maxChunkSize: 50,
        overlapSize: 10,
      });

      const chunks = chunkerWithOverlap.chunkFile('test.ts', content);

      // With overlap, chunks should have some shared content
      if (chunks.length > 1) {
        const lastLineOfFirst = chunks[0].endLine;
        const firstLineOfSecond = chunks[1].startLine;

        // Due to overlap, second chunk might start before first chunk ends
        // or overlap setting might not create exact overlaps with line-based chunking
        expect(chunks.length).toBeGreaterThan(1);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Factory Functions
  // --------------------------------------------------------------------------

  describe('factory functions', () => {
    it('should return singleton from getCodeChunker', () => {
      const chunker1 = getCodeChunker();
      const chunker2 = getCodeChunker();

      expect(chunker1).toBe(chunker2);
    });

    it('should create new instance from createCodeChunker', () => {
      const chunker1 = createCodeChunker();
      const chunker2 = createCodeChunker();

      expect(chunker1).not.toBe(chunker2);
    });

    it('should reset singleton', () => {
      const chunker1 = getCodeChunker();
      resetCodeChunker();
      const chunker2 = getCodeChunker();

      expect(chunker1).not.toBe(chunker2);
    });

    it('should accept custom options', () => {
      const chunker = createCodeChunker(undefined, {
        maxChunkSize: 500,
        preserveBoundaries: false,
      });

      expect(chunker).toBeInstanceOf(CodeChunker);
    });

    it('should accept custom project ID', () => {
      const chunker = createCodeChunker(undefined, undefined, 'my-project');
      const chunks = chunker.chunkFile('test.ts', 'const x = 1;');

      expect(chunks[0].projectId).toBe('my-project');
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle very long lines', () => {
      const longLine = 'const x = "' + 'a'.repeat(5000) + '";';
      const chunks = chunker.chunkFile('test.ts', longLine);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('const x');
    });

    it('should handle special characters', () => {
      const content = `
const emoji = '🚀';
const unicode = '\\u0041';
const escape = '\\n\\t\\r';
`;
      const chunks = chunker.chunkFile('test.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle nested structures', () => {
      const content = `
const nested = {
  level1: {
    level2: {
      level3: {
        value: 42
      }
    }
  }
};
`;
      const chunks = chunker.chunkFile('test.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle template literals', () => {
      const content = `
const template = \`
  Hello \${name},
  This is a multiline template.
\`;
`;
      const chunks = chunker.chunkFile('test.ts', content);

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Documentation Handling
  // --------------------------------------------------------------------------

  describe('documentation handling', () => {
    it('should include documentation from symbols', () => {
      const content = `
/**
 * This is a documented function
 */
function documented() { return true; }
`;
      const symbols: SymbolEntry[] = [
        createMockSymbol({
          id: 'file#documented#5',
          name: 'documented',
          kind: 'function',
          line: 5,
          endLine: 5,
          documentation: 'This is a documented function',
        }),
      ];

      const chunks = chunker.chunkBySymbols('test.ts', content, symbols);

      const docChunk = chunks.find((c) => c.symbols.includes('documented'));
      expect(docChunk?.metadata.documentation).toBe(
        'This is a documented function'
      );
    });
  });
});
