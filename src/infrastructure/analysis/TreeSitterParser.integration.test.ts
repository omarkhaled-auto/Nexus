/**
 * TreeSitterParser Integration Tests
 *
 * These tests use the real web-tree-sitter WASM implementation
 * to verify actual parsing behavior. They require WASM files to be present.
 *
 * @module infrastructure/analysis/TreeSitterParser.integration.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TreeSitterParser, resetParser } from './TreeSitterParser';

describe('TreeSitterParser Integration', () => {
  let parser: TreeSitterParser;

  beforeEach(async () => {
    resetParser();
    parser = new TreeSitterParser();
    await parser.initialize();
  });

  afterEach(() => {
    resetParser();
  });

  describe('symbol extraction', () => {
    it('should extract function declarations', async () => {
      const code = `
        function greet(name: string): string {
          return 'Hello, ' + name;
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);
      const func = result.symbols.find((s) => s.name === 'greet');
      expect(func).toBeDefined();
      expect(func?.kind).toBe('function');
      expect(func?.signature).toContain('greet');
      expect(func?.signature).toContain('name: string');
    });

    it('should extract classes with methods', async () => {
      const code = `
        export class UserService {
          private users: User[] = [];

          async findById(id: string): Promise<User | null> {
            return this.users.find(u => u.id === id) || null;
          }

          create(data: CreateUserDto): User {
            const user = { id: generateId(), ...data };
            this.users.push(user);
            return user;
          }
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);

      const classSymbol = result.symbols.find((s) => s.name === 'UserService');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe('class');
      expect(classSymbol?.exported).toBe(true);

      const methods = result.symbols.filter((s) => s.kind === 'method');
      expect(methods.length).toBeGreaterThanOrEqual(2);

      const findById = result.symbols.find((s) => s.name === 'findById');
      expect(findById).toBeDefined();
      expect(findById?.modifiers).toContain('async');
    });

    it('should extract interfaces', async () => {
      const code = `
        export interface User {
          id: string;
          name: string;
          email: string;
          createdAt: Date;
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);
      const iface = result.symbols.find((s) => s.name === 'User');
      expect(iface).toBeDefined();
      expect(iface?.kind).toBe('interface');
      expect(iface?.exported).toBe(true);
    });

    it('should extract type aliases', async () => {
      const code = `
        export type UserRole = 'admin' | 'user' | 'guest';
        type ID = string | number;
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);

      const userRole = result.symbols.find((s) => s.name === 'UserRole');
      expect(userRole).toBeDefined();
      expect(userRole?.kind).toBe('type');
      expect(userRole?.exported).toBe(true);

      const id = result.symbols.find((s) => s.name === 'ID');
      expect(id).toBeDefined();
      expect(id?.exported).toBe(false);
    });

    it('should extract enums', async () => {
      const code = `
        export enum Status {
          Pending = 'pending',
          Active = 'active',
          Completed = 'completed',
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);

      const enumSymbol = result.symbols.find((s) => s.name === 'Status');
      expect(enumSymbol).toBeDefined();
      expect(enumSymbol?.kind).toBe('enum');

      const members = result.symbols.filter((s) => s.kind === 'enum_member');
      expect(members.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract arrow functions assigned to const', async () => {
      const code = `
        export const add = (a: number, b: number): number => a + b;
        const multiply = (a: number, b: number) => a * b;
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.success).toBe(true);

      const add = result.symbols.find((s) => s.name === 'add');
      expect(add).toBeDefined();
      expect(add?.kind).toBe('function');
      expect(add?.exported).toBe(true);

      const multiply = result.symbols.find((s) => s.name === 'multiply');
      expect(multiply).toBeDefined();
    });
  });

  describe('import extraction', () => {
    it('should extract named imports', async () => {
      const code = `
        import { useState, useEffect, useCallback } from 'react';
        import { UserService, type User } from './services/user';
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.imports.length).toBeGreaterThanOrEqual(2);

      const reactImport = result.imports.find((i) => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport?.type).toBe('named');
      expect(reactImport?.symbols.length).toBe(3);

      const userImport = result.imports.find((i) => i.source === './services/user');
      expect(userImport).toBeDefined();
    });

    it('should extract default imports', async () => {
      const code = `
        import React from 'react';
        import axios from 'axios';
      `;
      const result = await parser.parseFile('test.ts', code);

      const reactImport = result.imports.find((i) => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport?.type).toBe('default');
      expect(reactImport?.symbols[0].local).toBe('React');
    });

    it('should extract namespace imports', async () => {
      const code = `
        import * as path from 'path';
        import * as utils from './utils';
      `;
      const result = await parser.parseFile('test.ts', code);

      const pathImport = result.imports.find((i) => i.source === 'path');
      expect(pathImport).toBeDefined();
      expect(pathImport?.type).toBe('namespace');
      expect(pathImport?.symbols[0].local).toBe('path');
      expect(pathImport?.symbols[0].imported).toBe('*');
    });

    it('should extract side-effect imports', async () => {
      const code = `
        import './styles.css';
        import 'reflect-metadata';
      `;
      const result = await parser.parseFile('test.ts', code);

      const cssImport = result.imports.find((i) => i.source === './styles.css');
      expect(cssImport).toBeDefined();
      expect(cssImport?.type).toBe('side_effect');
      expect(cssImport?.symbols).toHaveLength(0);
    });

    it('should extract type-only imports', async () => {
      const code = `
        import type { User, Role } from './types';
        import { type Config } from './config';
      `;
      const result = await parser.parseFile('test.ts', code);

      const typeImport = result.imports.find((i) => i.source === './types');
      expect(typeImport).toBeDefined();
      expect(typeImport?.typeOnly).toBe(true);
    });
  });

  describe('export extraction', () => {
    it('should extract named exports', async () => {
      const code = `
        const a = 1;
        const b = 2;
        export { a, b };
      `;
      const result = await parser.parseFile('test.ts', code);

      const namedExport = result.exports.find((e) => e.type === 'named');
      expect(namedExport).toBeDefined();
      expect(namedExport?.symbols.length).toBe(2);
    });

    it('should extract default exports', async () => {
      const code = `
        export default function main() {}
      `;
      const result = await parser.parseFile('test.ts', code);

      const defaultExport = result.exports.find((e) => e.type === 'default');
      expect(defaultExport).toBeDefined();
    });

    it('should extract re-exports', async () => {
      const code = `
        export { User, Role } from './types';
        export * from './utils';
      `;
      const result = await parser.parseFile('test.ts', code);

      const reExport = result.exports.find((e) => e.source === './types');
      expect(reExport).toBeDefined();
      expect(reExport?.type).toBe('re_export');

      const allExport = result.exports.find((e) => e.source === './utils');
      expect(allExport).toBeDefined();
      expect(allExport?.type).toBe('all');
    });
  });

  describe('documentation extraction', () => {
    it('should extract JSDoc documentation', async () => {
      const code = `
        /**
         * Calculates the sum of two numbers.
         * @param a First number
         * @param b Second number
         * @returns The sum of a and b
         */
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      const func = result.symbols.find((s) => s.name === 'add');
      expect(func?.documentation).toBeDefined();
      expect(func?.documentation).toContain('Calculates the sum of two numbers');
    });
  });

  describe('error detection', () => {
    it('should detect syntax errors', async () => {
      const code = `
        function broken( {
          const x = ;
        }
      `;
      const result = await parser.parseFile('test.ts', code);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
