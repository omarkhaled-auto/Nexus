/**
 * Patterns Analyzer
 *
 * Analyzes codebase patterns and generates PATTERNS.md documentation.
 * Detects architectural patterns, coding patterns, naming conventions,
 * and file organization rules.
 *
 * @module infrastructure/analysis/codebase/PatternsAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  PatternsDoc,
  PatternDescription,
  PatternExample,
  NamingConvention,
  FileOrganizationRule,
} from './types';
import type { SymbolEntry } from '../types';

/**
 * Pattern detection configuration
 */
interface PatternConfig {
  name: string;
  description: string;
  whenToUse: string;
  relatedPatterns: string[];
  detectors: PatternDetector[];
}

interface PatternDetector {
  type: 'suffix' | 'prefix' | 'method' | 'class' | 'function' | 'pattern';
  match: string | RegExp;
}

/**
 * Predefined architectural patterns to detect
 */
const ARCHITECTURAL_PATTERNS: PatternConfig[] = [
  {
    name: 'Repository Pattern',
    description: 'Provides an abstraction layer between the domain and data mapping layers, acting as a collection of domain objects.',
    whenToUse: 'When you need to separate data access logic from business logic, enabling easier testing and maintenance.',
    relatedPatterns: ['Unit of Work', 'Data Mapper'],
    detectors: [
      { type: 'suffix', match: 'Repository' },
      { type: 'suffix', match: 'DB' },
      { type: 'suffix', match: 'Store' },
    ],
  },
  {
    name: 'Service Pattern',
    description: 'Encapsulates business logic into reusable service classes that can be called from multiple parts of the application.',
    whenToUse: 'When you need to share business logic across different components or layers.',
    relatedPatterns: ['Repository Pattern', 'Facade Pattern'],
    detectors: [
      { type: 'suffix', match: 'Service' },
    ],
  },
  {
    name: 'Factory Pattern',
    description: 'Creates objects without exposing the instantiation logic, providing a common interface for creating families of related objects.',
    whenToUse: 'When object creation is complex, needs to be decoupled from usage, or when you need to create objects of various types at runtime.',
    relatedPatterns: ['Abstract Factory', 'Builder Pattern'],
    detectors: [
      { type: 'suffix', match: 'Factory' },
      { type: 'prefix', match: 'create' },
      { type: 'prefix', match: 'build' },
      { type: 'prefix', match: 'make' },
    ],
  },
  {
    name: 'Singleton Pattern',
    description: 'Ensures a class has only one instance and provides a global point of access to it.',
    whenToUse: 'When you need exactly one instance of a class to coordinate actions across the system.',
    relatedPatterns: ['Factory Pattern', 'Registry Pattern'],
    detectors: [
      { type: 'method', match: 'getInstance' },
      { type: 'method', match: 'instance' },
    ],
  },
  {
    name: 'Observer Pattern',
    description: 'Defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified.',
    whenToUse: 'When changes to one object require changing others, and you don\'t know how many objects need to be changed.',
    relatedPatterns: ['Event Bus', 'Pub/Sub'],
    detectors: [
      { type: 'class', match: 'EventBus' },
      { type: 'class', match: 'EventEmitter' },
      { type: 'method', match: 'subscribe' },
      { type: 'method', match: 'emit' },
      { type: 'method', match: 'on' },
    ],
  },
  {
    name: 'Adapter Pattern',
    description: 'Converts the interface of a class into another interface clients expect, letting classes work together that couldn\'t otherwise.',
    whenToUse: 'When you want to use an existing class but its interface doesn\'t match what you need.',
    relatedPatterns: ['Bridge Pattern', 'Facade Pattern'],
    detectors: [
      { type: 'suffix', match: 'Adapter' },
    ],
  },
  {
    name: 'Bridge Pattern',
    description: 'Decouples an abstraction from its implementation so that the two can vary independently.',
    whenToUse: 'When you want to avoid a permanent binding between an abstraction and its implementation.',
    relatedPatterns: ['Adapter Pattern', 'Strategy Pattern'],
    detectors: [
      { type: 'suffix', match: 'Bridge' },
    ],
  },
  {
    name: 'Strategy Pattern',
    description: 'Defines a family of algorithms, encapsulates each one, and makes them interchangeable.',
    whenToUse: 'When you need to select an algorithm at runtime or have many related classes that differ only in their behavior.',
    relatedPatterns: ['Factory Pattern', 'State Pattern'],
    detectors: [
      { type: 'suffix', match: 'Strategy' },
      { type: 'suffix', match: 'Policy' },
    ],
  },
  {
    name: 'Handler Pattern',
    description: 'Processes requests or events, often as part of a chain of responsibility.',
    whenToUse: 'When you need to process different types of requests in a flexible and extensible way.',
    relatedPatterns: ['Chain of Responsibility', 'Command Pattern'],
    detectors: [
      { type: 'suffix', match: 'Handler' },
    ],
  },
  {
    name: 'Builder Pattern',
    description: 'Separates the construction of a complex object from its representation, allowing the same construction process to create various representations.',
    whenToUse: 'When an object needs to be created with many possible configurations or optional parameters.',
    relatedPatterns: ['Factory Pattern', 'Fluent Interface'],
    detectors: [
      { type: 'suffix', match: 'Builder' },
    ],
  },
];

/**
 * Predefined coding patterns to detect
 */
const CODING_PATTERNS: PatternConfig[] = [
  {
    name: 'Async/Await Pattern',
    description: 'Uses async/await syntax for handling asynchronous operations, making async code look synchronous.',
    whenToUse: 'When dealing with asynchronous operations like API calls, file I/O, or database queries.',
    relatedPatterns: ['Promise Pattern', 'Error Handling'],
    detectors: [
      { type: 'pattern', match: /async\s+\w+/ },
    ],
  },
  {
    name: 'Type Guards Pattern',
    description: 'Uses type predicates to narrow types at runtime, providing type safety when dealing with unknown types.',
    whenToUse: 'When you need to differentiate between types at runtime while maintaining type safety.',
    relatedPatterns: ['Discriminated Unions', 'Assertion Functions'],
    detectors: [
      { type: 'prefix', match: 'is' },
      { type: 'pattern', match: /is\s*\w+.*:\s*\w+\s+is\s+\w+/ },
    ],
  },
  {
    name: 'Error Handling Pattern',
    description: 'Structured approach to catching and handling errors throughout the application.',
    whenToUse: 'When you need to handle errors gracefully and provide meaningful error messages.',
    relatedPatterns: ['Result Type', 'Try/Catch'],
    detectors: [
      { type: 'suffix', match: 'Error' },
      { type: 'method', match: 'handleError' },
    ],
  },
  {
    name: 'Dependency Injection Pattern',
    description: 'Provides dependencies to a class rather than having the class create them, enabling loose coupling.',
    whenToUse: 'When you want to make components easily testable and loosely coupled.',
    relatedPatterns: ['Inversion of Control', 'Service Locator'],
    detectors: [
      { type: 'suffix', match: 'Provider' },
    ],
  },
];

/**
 * Analyzer that generates PATTERNS.md documentation
 *
 * Examines the codebase to:
 * - Detect architectural patterns (Repository, Service, Factory, etc.)
 * - Detect coding patterns (async/await, type guards, etc.)
 * - Detect naming conventions (PascalCase, camelCase, etc.)
 * - Detect file organization rules
 *
 * @example
 * ```typescript
 * const analyzer = new PatternsAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class PatternsAnalyzer extends BaseAnalyzer {
  /**
   * Perform patterns analysis
   * @returns Patterns documentation
   */
  analyze(): PatternsDoc {
    const architecturalPatterns = this.detectArchitecturalPatterns();
    const codingPatterns = this.detectCodingPatterns();
    const namingConventions = this.detectNamingConventions();
    const fileOrganization = this.detectFileOrganization();

    const overview = this.generateOverview(
      architecturalPatterns,
      codingPatterns,
      namingConventions
    );

    return {
      overview,
      architecturalPatterns,
      codingPatterns,
      namingConventions,
      fileOrganization,
    };
  }

  /**
   * Generate patterns overview
   */
  private generateOverview(
    archPatterns: PatternDescription[],
    codePatterns: PatternDescription[],
    conventions: NamingConvention[]
  ): string {
    const paragraphs: string[] = [];

    paragraphs.push(
      `This codebase follows ${String(archPatterns.length)} architectural patterns and ` +
      `${String(codePatterns.length)} coding patterns. The following document describes ` +
      `the patterns detected in the codebase along with examples.`
    );

    if (archPatterns.length > 0) {
      const patternNames = archPatterns.slice(0, 3).map(p => p.name).join(', ');
      paragraphs.push(
        `Key architectural patterns include: ${patternNames}. ` +
        `These patterns help maintain separation of concerns and enable testability.`
      );
    }

    if (conventions.length > 0) {
      paragraphs.push(
        `The codebase follows consistent naming conventions with ` +
        `${String(conventions.length)} documented rules for naming different code elements.`
      );
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Detect architectural patterns in the codebase
   */
  private detectArchitecturalPatterns(): PatternDescription[] {
    const patterns: PatternDescription[] = [];

    for (const config of ARCHITECTURAL_PATTERNS) {
      const examples = this.findPatternExamples(config);

      if (examples.length > 0) {
        patterns.push({
          name: config.name,
          description: config.description,
          examples: examples.slice(0, this.options.maxExamples),
          whenToUse: config.whenToUse,
          relatedPatterns: config.relatedPatterns,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect coding patterns in the codebase
   */
  private detectCodingPatterns(): PatternDescription[] {
    const patterns: PatternDescription[] = [];

    for (const config of CODING_PATTERNS) {
      const examples = this.findPatternExamples(config);

      if (examples.length > 0) {
        patterns.push({
          name: config.name,
          description: config.description,
          examples: examples.slice(0, this.options.maxExamples),
          whenToUse: config.whenToUse,
          relatedPatterns: config.relatedPatterns,
        });
      }
    }

    return patterns;
  }

  /**
   * Find examples of a pattern in the codebase
   */
  private findPatternExamples(config: PatternConfig): PatternExample[] {
    const examples: PatternExample[] = [];
    const seenFiles = new Set<string>();

    for (const detector of config.detectors) {
      const matches = this.findMatchingSymbols(detector);

      for (const symbol of matches) {
        // Skip if we already have an example from this file
        if (seenFiles.has(symbol.file)) {
          continue;
        }
        seenFiles.add(symbol.file);

        examples.push({
          file: symbol.file,
          lines: `${String(symbol.line)}-${String(symbol.endLine || symbol.line)}`,
          description: this.inferPurpose(symbol),
        });

        // Limit examples per detector
        if (examples.length >= this.options.maxExamples * 2) {
          break;
        }
      }
    }

    return examples;
  }

  /**
   * Find symbols matching a detector
   */
  private findMatchingSymbols(detector: PatternDetector): SymbolEntry[] {
    const symbols = this.repoMap.symbols;

    switch (detector.type) {
      case 'suffix':
        return symbols.filter(s =>
          (s.kind === 'class' || s.kind === 'interface') &&
          s.name.endsWith(detector.match as string)
        );

      case 'prefix':
        return symbols.filter(s =>
          s.kind === 'function' &&
          s.name.startsWith(detector.match as string) &&
          s.name.length > (detector.match as string).length
        );

      case 'method':
        return symbols.filter(s =>
          s.kind === 'method' &&
          s.name === detector.match
        );

      case 'class':
        return symbols.filter(s =>
          s.kind === 'class' &&
          s.name === detector.match
        );

      case 'function':
        return symbols.filter(s =>
          s.kind === 'function' &&
          s.name === detector.match
        );

      case 'pattern':
        if (detector.match instanceof RegExp) {
          return symbols.filter(s =>
            detector.match instanceof RegExp &&
            (detector.match.test(s.signature || '') || detector.match.test(s.name))
          );
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * Detect naming conventions in the codebase
   */
  private detectNamingConventions(): NamingConvention[] {
    const conventions: NamingConvention[] = [];

    // Analyze classes
    const classes = this.getSymbolsByKind('class');
    if (classes.length > 0) {
      const classExamples = classes.slice(0, 5).map(c => c.name);
      const hasPascalCase = classes.every(c => /^[A-Z][a-zA-Z0-9]*$/.test(c.name));

      conventions.push({
        element: 'class',
        convention: hasPascalCase ? 'PascalCase' : 'Mixed',
        examples: classExamples,
      });

      // Check for common suffixes
      const suffixes = this.detectCommonSuffixes(classes);
      if (suffixes.length > 0) {
        conventions.push({
          element: 'class (with suffix)',
          convention: 'PascalCase',
          suffix: suffixes.join(', '),
          examples: classes
            .filter(c => suffixes.some(s => c.name.endsWith(s)))
            .slice(0, 5)
            .map(c => c.name),
        });
      }
    }

    // Analyze interfaces
    const interfaces = this.getSymbolsByKind('interface');
    if (interfaces.length > 0) {
      const hasIPrefix = interfaces.some(i => i.name.startsWith('I') && i.name.length > 1 && i.name[1].toUpperCase() === i.name[1]);
      const noIPrefix = interfaces.some(i => !i.name.startsWith('I'));

      let convention = 'PascalCase';
      let prefix: string | undefined;

      if (hasIPrefix && !noIPrefix) {
        convention = 'PascalCase';
        prefix = 'I';
      } else if (hasIPrefix && noIPrefix) {
        convention = 'Mixed (some with I prefix)';
      }

      conventions.push({
        element: 'interface',
        convention,
        prefix,
        examples: interfaces.slice(0, 5).map(i => i.name),
      });
    }

    // Analyze functions
    const functions = this.getSymbolsByKind('function');
    if (functions.length > 0) {
      const funcExamples = functions.slice(0, 5).map(f => f.name);
      const hasCamelCase = functions.every(f => /^[a-z][a-zA-Z0-9]*$/.test(f.name));

      conventions.push({
        element: 'function',
        convention: hasCamelCase ? 'camelCase' : 'Mixed',
        examples: funcExamples,
      });
    }

    // Analyze constants
    const constants = this.getSymbolsByKind('constant');
    if (constants.length > 0) {
      const upperSnake = constants.filter(c => /^[A-Z][A-Z0-9_]*$/.test(c.name));
      const camelCase = constants.filter(c => /^[a-z][a-zA-Z0-9]*$/.test(c.name));

      let convention = 'Mixed';
      if (upperSnake.length > camelCase.length) {
        convention = 'UPPER_SNAKE_CASE';
      } else if (camelCase.length > upperSnake.length) {
        convention = 'camelCase';
      }

      conventions.push({
        element: 'constant',
        convention,
        examples: constants.slice(0, 5).map(c => c.name),
      });
    }

    // Analyze type aliases
    const types = this.getSymbolsByKind('type');
    if (types.length > 0) {
      conventions.push({
        element: 'type',
        convention: 'PascalCase',
        examples: types.slice(0, 5).map(t => t.name),
      });
    }

    // Analyze file naming
    const fileConvention = this.detectFileNamingConvention();
    if (fileConvention) {
      conventions.push(fileConvention);
    }

    return conventions;
  }

  /**
   * Detect common suffixes in symbol names
   */
  private detectCommonSuffixes(symbols: SymbolEntry[]): string[] {
    const suffixCounts = new Map<string, number>();
    const commonSuffixes = [
      'Service', 'Repository', 'Controller', 'Handler', 'Manager',
      'Factory', 'Builder', 'Adapter', 'Provider', 'Validator',
      'Store', 'DB', 'Error', 'Exception', 'Props', 'State',
    ];

    for (const symbol of symbols) {
      for (const suffix of commonSuffixes) {
        if (symbol.name.endsWith(suffix)) {
          suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
        }
      }
    }

    return Array.from(suffixCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([suffix]) => suffix)
      .slice(0, 5);
  }

  /**
   * Detect file naming convention
   */
  private detectFileNamingConvention(): NamingConvention | null {
    const files = this.repoMap.files.map(f => {
      const parts = f.relativePath.split('/');
      return parts[parts.length - 1] || '';
    }).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    if (files.length === 0) {
      return null;
    }

    // Check conventions
    const kebabCase = files.filter(f => /^[a-z][a-z0-9-]*\.(ts|tsx)$/.test(f));
    const pascalCase = files.filter(f => /^[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/.test(f));
    const camelCase = files.filter(f => /^[a-z][a-zA-Z0-9]*\.(ts|tsx)$/.test(f));

    let convention = 'Mixed';
    if (pascalCase.length > kebabCase.length && pascalCase.length > camelCase.length) {
      convention = 'PascalCase';
    } else if (kebabCase.length > pascalCase.length && kebabCase.length > camelCase.length) {
      convention = 'kebab-case';
    } else if (camelCase.length > kebabCase.length && camelCase.length > pascalCase.length) {
      convention = 'camelCase';
    }

    return {
      element: 'file',
      convention,
      examples: files.slice(0, 5),
    };
  }

  /**
   * Detect file organization rules
   */
  private detectFileOrganization(): FileOrganizationRule[] {
    const rules: FileOrganizationRule[] = [];

    // Test file organization
    const testFiles = this.repoMap.files.filter(f =>
      f.relativePath.endsWith('.test.ts') ||
      f.relativePath.endsWith('.test.tsx') ||
      f.relativePath.endsWith('.spec.ts') ||
      f.relativePath.endsWith('.spec.tsx')
    );

    if (testFiles.length > 0) {
      // Check if tests are co-located or in __tests__ directory
      const coLocated = testFiles.filter(f => !f.relativePath.includes('__tests__'));
      const inTestsDir = testFiles.filter(f => f.relativePath.includes('__tests__'));

      if (coLocated.length > inTestsDir.length) {
        rules.push({
          pattern: '*.test.ts, *.test.tsx',
          location: 'Co-located with source files',
          purpose: 'Keep tests close to the code they test for easier navigation and maintenance',
        });
      } else if (inTestsDir.length > 0) {
        rules.push({
          pattern: '*.test.ts, *.test.tsx',
          location: '__tests__ directories',
          purpose: 'Separate test files from source files for cleaner directory structure',
        });
      }
    }

    // Types file organization
    const typesFiles = this.repoMap.files.filter(f =>
      f.relativePath.endsWith('/types.ts') ||
      f.relativePath.endsWith('\\types.ts')
    );

    if (typesFiles.length > 0) {
      rules.push({
        pattern: 'types.ts',
        location: 'Per module directory (e.g., src/module/types.ts)',
        purpose: 'Define module-specific type definitions in a dedicated file',
      });
    }

    // Index file organization
    const indexFiles = this.repoMap.files.filter(f =>
      f.relativePath.endsWith('/index.ts') ||
      f.relativePath.endsWith('\\index.ts')
    );

    if (indexFiles.length > 0) {
      rules.push({
        pattern: 'index.ts',
        location: 'Per module directory',
        purpose: 'Re-export public API from module for cleaner imports',
      });
    }

    // Config file organization
    const configFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('config') ||
      f.relativePath.endsWith('.config.ts') ||
      f.relativePath.endsWith('.config.js')
    );

    if (configFiles.length > 0) {
      rules.push({
        pattern: '*.config.ts, *.config.js',
        location: 'Root directory or src/config/',
        purpose: 'Centralize configuration files for tools and application settings',
      });
    }

    // Component organization (React)
    const componentFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('/components/') &&
      (f.relativePath.endsWith('.tsx') || f.relativePath.endsWith('.jsx'))
    );

    if (componentFiles.length > 0) {
      rules.push({
        pattern: '*.tsx, *.jsx (components)',
        location: 'src/ui/components/ or src/components/',
        purpose: 'Organize React components in a dedicated directory structure',
      });
    }

    // Store organization (Zustand/Redux)
    const storeFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('/stores/') ||
      f.relativePath.includes('/store/')
    );

    if (storeFiles.length > 0) {
      rules.push({
        pattern: '*Store.ts, *store.ts',
        location: 'src/stores/ or src/ui/stores/',
        purpose: 'Organize state management stores in dedicated directories',
      });
    }

    // Handler organization
    const handlerFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('/handlers/')
    );

    if (handlerFiles.length > 0) {
      rules.push({
        pattern: '*Handler.ts',
        location: 'Within relevant layer (e.g., src/execution/handlers/)',
        purpose: 'Organize handlers by their layer responsibility',
      });
    }

    return rules;
  }

  /**
   * Convert patterns documentation to Markdown
   * @param doc - Patterns documentation
   * @returns Markdown string
   */
  toMarkdown(doc: PatternsDoc): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push('# Patterns Documentation');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // Architectural Patterns
    if (doc.architecturalPatterns.length > 0) {
      lines.push('## Architectural Patterns');
      lines.push('');

      for (const pattern of doc.architecturalPatterns) {
        lines.push(`### ${pattern.name}`);
        lines.push('');
        lines.push(pattern.description);
        lines.push('');
        lines.push(`**When to Use:** ${pattern.whenToUse}`);
        lines.push('');

        if (pattern.relatedPatterns.length > 0) {
          lines.push(`**Related Patterns:** ${pattern.relatedPatterns.join(', ')}`);
          lines.push('');
        }

        if (pattern.examples.length > 0) {
          lines.push('**Examples:**');
          for (const example of pattern.examples) {
            lines.push(`- \`${example.file}\` (lines ${example.lines}): ${example.description}`);
          }
          lines.push('');
        }
      }
    }

    // Coding Patterns
    if (doc.codingPatterns.length > 0) {
      lines.push('## Coding Patterns');
      lines.push('');

      for (const pattern of doc.codingPatterns) {
        lines.push(`### ${pattern.name}`);
        lines.push('');
        lines.push(pattern.description);
        lines.push('');
        lines.push(`**When to Use:** ${pattern.whenToUse}`);
        lines.push('');

        if (pattern.relatedPatterns.length > 0) {
          lines.push(`**Related Patterns:** ${pattern.relatedPatterns.join(', ')}`);
          lines.push('');
        }

        if (pattern.examples.length > 0) {
          lines.push('**Examples:**');
          for (const example of pattern.examples) {
            lines.push(`- \`${example.file}\` (lines ${example.lines}): ${example.description}`);
          }
          lines.push('');
        }
      }
    }

    // Naming Conventions
    if (doc.namingConventions.length > 0) {
      lines.push('## Naming Conventions');
      lines.push('');
      lines.push('| Element | Convention | Prefix/Suffix | Examples |');
      lines.push('|---------|------------|---------------|----------|');

      for (const conv of doc.namingConventions) {
        const prefixSuffix = [conv.prefix, conv.suffix].filter(Boolean).join('/') || '-';
        const examples = conv.examples.slice(0, 3).map(e => `\`${e}\``).join(', ');
        lines.push(`| ${conv.element} | ${conv.convention} | ${prefixSuffix} | ${examples} |`);
      }
      lines.push('');
    }

    // File Organization
    if (doc.fileOrganization.length > 0) {
      lines.push('## File Organization');
      lines.push('');

      for (const rule of doc.fileOrganization) {
        lines.push(`### ${rule.pattern}`);
        lines.push('');
        lines.push(`**Location:** ${rule.location}`);
        lines.push('');
        lines.push(`**Purpose:** ${rule.purpose}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
