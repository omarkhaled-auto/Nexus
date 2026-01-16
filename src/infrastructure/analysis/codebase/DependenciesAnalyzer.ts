/**
 * Dependencies Analyzer
 *
 * Analyzes codebase dependencies and generates DEPENDENCIES.md documentation.
 * Examines external npm packages, internal modules, and circular dependencies.
 *
 * @module infrastructure/analysis/codebase/DependenciesAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import { DependencyGraphBuilder } from '../DependencyGraphBuilder';
import type { ParseResult } from '../types';
import type {
  DependenciesDoc,
  ExternalDependency,
  InternalModule,
  CircularDependency,
} from './types';

/**
 * Known npm package categories and their purposes
 */
const PACKAGE_PURPOSES: Record<string, string> = {
  // React ecosystem
  'react': 'UI component library',
  'react-dom': 'React DOM renderer',
  'react-router': 'Client-side routing',
  'react-router-dom': 'React DOM routing components',
  // State management
  'zustand': 'Lightweight state management',
  'redux': 'Predictable state container',
  '@reduxjs/toolkit': 'Official Redux toolkit',
  'jotai': 'Primitive state management',
  'recoil': 'React state management library',
  // Styling
  'tailwindcss': 'Utility-first CSS framework',
  'tailwind-merge': 'Merge Tailwind classes without conflicts',
  'class-variance-authority': 'CSS class variance authority',
  'clsx': 'Conditional class name utility',
  // UI components
  'lucide-react': 'React icon library',
  'framer-motion': 'Animation library for React',
  '@radix-ui/react-dialog': 'Accessible dialog component',
  '@radix-ui/react-slot': 'Radix UI slot component',
  '@radix-ui/react-scroll-area': 'Accessible scroll area component',
  // Database
  'better-sqlite3': 'Better SQLite3 bindings',
  'drizzle-orm': 'TypeScript ORM',
  'prisma': 'Next-generation ORM',
  // Build tools
  'vite': 'Next generation frontend build tool',
  'electron-vite': 'Vite integration for Electron',
  'tsup': 'TypeScript build tool',
  'esbuild': 'Fast JavaScript bundler',
  // Testing
  'vitest': 'Vite-native test framework',
  'jest': 'JavaScript testing framework',
  '@testing-library/react': 'React testing utilities',
  '@testing-library/jest-dom': 'Custom jest matchers',
  '@playwright/test': 'End-to-end testing framework',
  // TypeScript
  'typescript': 'JavaScript with type syntax',
  'tsx': 'TypeScript execute and REPL',
  // Utilities
  'zod': 'TypeScript-first schema validation',
  'date-fns': 'Modern JavaScript date utility',
  'nanoid': 'Small unique ID generator',
  'uuid': 'RFC4122 UUID generator',
  'fs-extra': 'Extra file system methods',
  'pathe': 'Cross-platform path utilities',
  'fast-glob': 'Fast glob file matching',
  'execa': 'Process execution for humans',
  'simple-git': 'Simple git commands',
  'chokidar': 'File system watcher',
  // AI
  '@anthropic-ai/sdk': 'Anthropic Claude API client',
  '@google/genai': 'Google Generative AI SDK',
  'openai': 'OpenAI API client',
  // Electron
  'electron': 'Cross-platform desktop apps',
  'electron-store': 'Simple Electron data persistence',
  '@electron-toolkit/utils': 'Electron development utilities',
  '@electron-toolkit/preload': 'Electron preload utilities',
  // Parser
  'web-tree-sitter': 'Tree-sitter WASM bindings',
  // Drag and drop
  '@dnd-kit/core': 'Drag and drop toolkit',
  '@dnd-kit/sortable': 'Sortable preset for dnd-kit',
  '@dnd-kit/utilities': 'Utilities for dnd-kit',
  // Charts
  'recharts': 'React charting library',
  // Notifications
  'sonner': 'Toast notification library',
  // Virtualization
  'react-virtuoso': 'Virtualized list component',
  // Hotkeys
  'react-hotkeys-hook': 'React hook for keyboard shortcuts',
  // Process management
  'tree-kill': 'Kill all processes in a tree',
};

/**
 * Critical packages that core functionality depends on
 */
const CRITICAL_PACKAGES = new Set([
  'react',
  'react-dom',
  'electron',
  'better-sqlite3',
  'typescript',
  'zustand',
  '@anthropic-ai/sdk',
]);

/**
 * Analyzer that generates DEPENDENCIES.md documentation
 *
 * Examines the codebase to:
 * - Document external npm dependencies
 * - Identify internal module structure
 * - Generate dependency graphs
 * - Find circular dependencies
 *
 * @example
 * ```typescript
 * const analyzer = new DependenciesAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class DependenciesAnalyzer extends BaseAnalyzer {
  /** Package.json content */
  private packageJson: PackageJsonContent | null = null;

  /**
   * Perform dependency analysis
   * @returns Dependencies documentation
   */
  async analyze(): Promise<DependenciesDoc> {
    // Load package.json
    await this.loadPackageJson();

    const overview = this.generateOverview();
    const externalDependencies = this.analyzeExternalDependencies();
    const internalModules = this.analyzeInternalModules();
    const dependencyGraph = this.generateDependencyGraph();
    const circularDependencies = this.findCircularDependencies();

    return {
      overview,
      externalDependencies,
      internalModules,
      dependencyGraph,
      circularDependencies,
    };
  }

  /**
   * Load and parse package.json
   */
  private async loadPackageJson(): Promise<void> {
    // Find package.json in the repo map files
    const packageJsonFile = this.repoMap.files.find(
      f => f.relativePath === 'package.json' || f.relativePath === './package.json'
    );

    if (packageJsonFile) {
      try {
        // Read from file system if we have the path
        const { readFile } = await import('fs/promises');
        const { resolve } = await import('path');
        const fullPath = resolve(this.options.projectPath, 'package.json');
        const content = await readFile(fullPath, 'utf-8');
        this.packageJson = JSON.parse(content) as PackageJsonContent;
      } catch {
        // Fall back to null if reading fails
        this.packageJson = null;
      }
    }
  }

  /**
   * Generate dependency overview
   */
  private generateOverview(): string {
    const externalCount = this.packageJson
      ? Object.keys(this.packageJson.dependencies || {}).length +
        Object.keys(this.packageJson.devDependencies || {}).length
      : 0;

    const internalModuleCount = this.repoMap.files.filter(
      f => f.relativePath.endsWith('index.ts') || f.relativePath.endsWith('index.tsx')
    ).length;

    const circularCount = this.countCircularDependencies();

    const paragraphs: string[] = [];

    paragraphs.push(
      `This codebase manages ${externalCount} external npm dependencies and ${internalModuleCount} internal modules. ` +
      `The dependency structure follows a layered architecture with clear module boundaries.`
    );

    if (circularCount > 0) {
      paragraphs.push(
        `**Note:** ${circularCount} circular dependencies were detected. ` +
        `See the Circular Dependencies section for details and suggested fixes.`
      );
    } else {
      paragraphs.push(
        `The codebase has no circular dependencies, indicating a clean dependency hierarchy.`
      );
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Analyze external npm dependencies
   */
  private analyzeExternalDependencies(): ExternalDependency[] {
    const dependencies: ExternalDependency[] = [];

    if (!this.packageJson) {
      return dependencies;
    }

    // Process runtime dependencies
    for (const [name, version] of Object.entries(this.packageJson.dependencies || {})) {
      dependencies.push(this.createExternalDependency(name, version, false));
    }

    // Process dev dependencies
    for (const [name, version] of Object.entries(this.packageJson.devDependencies || {})) {
      dependencies.push(this.createExternalDependency(name, version, true));
    }

    // Sort by criticality then name
    return dependencies.sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Create external dependency record
   */
  private createExternalDependency(
    name: string,
    version: string,
    isDev: boolean
  ): ExternalDependency {
    // Find files that import this package
    const usedBy = this.findFilesImportingPackage(name);

    // Determine purpose from known list or infer from name
    const purpose = PACKAGE_PURPOSES[name] || this.inferPackagePurpose(name, isDev);

    // Determine if critical
    const critical = !isDev && (CRITICAL_PACKAGES.has(name) || usedBy.length > 10);

    return {
      name,
      version,
      purpose,
      usedBy: usedBy.slice(0, 10), // Limit to 10 files
      critical,
    };
  }

  /**
   * Find files that import a package
   */
  private findFilesImportingPackage(packageName: string): string[] {
    const files: string[] = [];

    for (const edge of this.repoMap.dependencies) {
      // Check if the edge is an external import
      if (edge.to === packageName || edge.to.startsWith(packageName + '/')) {
        if (!files.includes(edge.from)) {
          files.push(edge.from);
        }
      }
    }

    return files.sort();
  }

  /**
   * Infer package purpose from its name
   */
  private inferPackagePurpose(name: string, isDev: boolean): string {
    const lowerName = name.toLowerCase();

    // Type definitions
    if (name.startsWith('@types/')) {
      const baseName = name.replace('@types/', '');
      return `TypeScript types for ${baseName}`;
    }

    // Testing
    if (lowerName.includes('test') || lowerName.includes('jest') || lowerName.includes('vitest')) {
      return 'Testing utility';
    }

    // Linting
    if (lowerName.includes('eslint') || lowerName.includes('lint')) {
      return 'Code linting';
    }

    // Build tools
    if (lowerName.includes('webpack') || lowerName.includes('vite') || lowerName.includes('build')) {
      return 'Build tooling';
    }

    // React related
    if (lowerName.includes('react')) {
      return 'React ecosystem package';
    }

    // Default
    return isDev ? 'Development dependency' : 'Runtime dependency';
  }

  /**
   * Analyze internal module structure
   */
  private analyzeInternalModules(): InternalModule[] {
    const modules: InternalModule[] = [];

    // Find all index files (module entry points)
    const indexFiles = this.repoMap.files.filter(
      f => f.relativePath.endsWith('index.ts') ||
           f.relativePath.endsWith('index.tsx') ||
           f.relativePath.endsWith('index.js')
    );

    for (const indexFile of indexFiles) {
      const modulePath = indexFile.relativePath.replace(/\/index\.[jt]sx?$/, '');
      const moduleName = this.extractModuleName(modulePath);

      // Get exports from this module
      const exports = this.getModuleExports(indexFile.relativePath);

      // Get files that import this module
      const importedBy = this.getDependentsOf(indexFile.relativePath);

      // Get modules this imports
      const imports = this.getDependenciesOf(indexFile.relativePath);

      modules.push({
        name: moduleName,
        path: modulePath,
        exports,
        importedBy,
        imports,
      });
    }

    return modules.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract module name from path
   */
  private extractModuleName(path: string): string {
    const parts = path.replace(/^(src\/|\.\/)+/, '').split('/');
    return parts.filter(p => p).join('/') || 'root';
  }

  /**
   * Get exports from a module
   */
  private getModuleExports(filePath: string): string[] {
    const exports: string[] = [];

    // Find all exported symbols from this file
    const symbols = this.repoMap.symbols.filter(
      s => s.file === filePath && s.exported
    );

    for (const symbol of symbols) {
      exports.push(symbol.name);
    }

    return exports;
  }

  /**
   * Generate dependency graph as Mermaid flowchart
   */
  private generateDependencyGraph(): string {
    // Get unique directories from internal modules
    const directories = new Set<string>();
    const edges: Array<{ from: string; to: string }> = [];

    // Collect layer directories
    const layerPatterns = [
      'src/ui',
      'src/orchestration',
      'src/planning',
      'src/execution',
      'src/quality',
      'src/persistence',
      'src/infrastructure',
    ];

    // Identify which layers exist
    for (const file of this.repoMap.files) {
      for (const pattern of layerPatterns) {
        if (file.relativePath.startsWith(pattern.replace('src/', ''))) {
          directories.add(pattern);
        }
      }
    }

    // Build edges between layers
    for (const edge of this.repoMap.dependencies) {
      const fromLayer = this.getLayerForFile(edge.from);
      const toLayer = this.getLayerForFile(edge.to);

      if (fromLayer && toLayer && fromLayer !== toLayer) {
        const edgeKey = `${fromLayer}|${toLayer}`;
        if (!edges.some(e => `${e.from}|${e.to}` === edgeKey)) {
          edges.push({ from: fromLayer, to: toLayer });
        }
      }
    }

    // Generate Mermaid flowchart
    const nodes = Array.from(directories).map(dir => ({
      id: this.sanitizeId(dir),
      label: this.formatLayerName(dir),
      shape: 'rounded' as const,
    }));

    const graphEdges = edges.map(e => ({
      from: this.sanitizeId(e.from),
      to: this.sanitizeId(e.to),
    }));

    // If we have no meaningful graph, return a simple placeholder
    if (nodes.length === 0) {
      return '```mermaid\nflowchart TD\n    A[No layer structure detected]\n```';
    }

    return this.generateMermaidDiagram('flowchart', {
      direction: 'TD',
      nodes,
      edges: graphEdges,
    });
  }

  /**
   * Get layer for a file path
   */
  private getLayerForFile(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');

    const layerMappings: Array<[string, string]> = [
      ['ui/', 'src/ui'],
      ['orchestration/', 'src/orchestration'],
      ['planning/', 'src/planning'],
      ['execution/', 'src/execution'],
      ['quality/', 'src/quality'],
      ['persistence/', 'src/persistence'],
      ['infrastructure/', 'src/infrastructure'],
    ];

    for (const [pattern, layer] of layerMappings) {
      if (normalized.includes(pattern)) {
        return layer;
      }
    }

    return null;
  }

  /**
   * Sanitize ID for Mermaid
   */
  private sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Format layer name for display
   */
  private formatLayerName(path: string): string {
    const name = path.split('/').pop() || path;
    return name.charAt(0).toUpperCase() + name.slice(1) + ' Layer';
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];

    // Use DependencyGraphBuilder to find cycles
    const builder = new DependencyGraphBuilder();

    // Build from repo map dependencies - create minimal parse results
    const parseResults: ParseResult[] = this.repoMap.files.map(f => ({
      success: true,
      file: f.relativePath,
      symbols: [],
      imports: this.repoMap.dependencies
        .filter(d => d.from === f.relativePath)
        .map(d => ({
          type: 'named' as const,
          source: d.to,
          symbols: (d.symbols || []).map(s => ({ local: s })),
          line: 1,
          typeOnly: false,
        })),
      exports: [],
      errors: [],
      parseTime: 0,
    }));

    builder.build(parseResults, this.options.projectPath);
    const cycles = builder.findCircularDependencies();

    for (const cycle of cycles) {
      circularDeps.push({
        cycle,
        severity: this.assessCycleSeverity(cycle),
        suggestion: this.suggestCycleFix(cycle),
      });
    }

    return circularDeps;
  }

  /**
   * Count circular dependencies
   */
  private countCircularDependencies(): number {
    const builder = new DependencyGraphBuilder();
    const parseResults: ParseResult[] = this.repoMap.files.map(f => ({
      success: true,
      file: f.relativePath,
      symbols: [],
      imports: this.repoMap.dependencies
        .filter(d => d.from === f.relativePath)
        .map(d => ({
          type: 'named' as const,
          source: d.to,
          symbols: (d.symbols || []).map(s => ({ local: s })),
          line: 1,
          typeOnly: false,
        })),
      exports: [],
      errors: [],
      parseTime: 0,
    }));
    builder.build(parseResults, this.options.projectPath);
    return builder.findCircularDependencies().length;
  }

  /**
   * Assess severity of a circular dependency
   */
  private assessCycleSeverity(cycle: string[]): 'low' | 'medium' | 'high' {
    // Get layers for each file in cycle
    const layers = cycle.map(f => this.getLayerForFile(f)).filter(Boolean);
    const uniqueLayers = new Set(layers);

    // Same layer - low severity
    if (uniqueLayers.size <= 1) {
      return 'low';
    }

    // Adjacent layers - medium severity
    if (uniqueLayers.size === 2) {
      return 'medium';
    }

    // Multiple distant layers - high severity
    return 'high';
  }

  /**
   * Suggest fix for a circular dependency
   */
  private suggestCycleFix(cycle: string[]): string {
    if (cycle.length === 2) {
      return `Extract shared functionality into a new module that both ${cycle[0]} and ${cycle[1]} can import.`;
    }

    const layers = new Set(cycle.map(f => this.getLayerForFile(f)).filter(Boolean));

    if (layers.size === 1) {
      return 'Consider restructuring the module to use dependency injection or event-based communication.';
    }

    return 'Introduce an interface/abstraction layer to break the dependency cycle. Consider using dependency inversion principle.';
  }

  /**
   * Convert documentation to Markdown
   */
  toMarkdown(doc: DependenciesDoc): string {
    const lines: string[] = [];

    // Header
    lines.push('# Dependencies');
    lines.push('');
    lines.push(`*Generated: ${new Date().toISOString()}*`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // External Dependencies
    lines.push('## External Dependencies');
    lines.push('');

    if (doc.externalDependencies.length > 0) {
      lines.push('| Package | Version | Purpose | Critical |');
      lines.push('|---------|---------|---------|----------|');

      for (const dep of doc.externalDependencies) {
        const critical = dep.critical ? 'Yes' : 'No';
        lines.push(`| ${dep.name} | ${dep.version} | ${dep.purpose} | ${critical} |`);
      }
    } else {
      lines.push('No external dependencies found.');
    }
    lines.push('');

    // Internal Modules
    lines.push('## Internal Modules');
    lines.push('');

    if (doc.internalModules.length > 0) {
      for (const mod of doc.internalModules) {
        lines.push(`### ${mod.name}`);
        lines.push('');
        lines.push(`**Path:** \`${mod.path}\``);
        lines.push('');

        if (mod.exports.length > 0) {
          lines.push('**Exports:**');
          for (const exp of mod.exports.slice(0, 10)) {
            lines.push(`- \`${exp}\``);
          }
          if (mod.exports.length > 10) {
            lines.push(`- ... and ${mod.exports.length - 10} more`);
          }
          lines.push('');
        }

        if (mod.importedBy.length > 0) {
          lines.push(`**Imported by:** ${mod.importedBy.length} file(s)`);
          lines.push('');
        }
      }
    } else {
      lines.push('No internal modules with index files found.');
    }
    lines.push('');

    // Dependency Graph
    lines.push('## Dependency Graph');
    lines.push('');
    lines.push(doc.dependencyGraph);
    lines.push('');

    // Circular Dependencies
    lines.push('## Circular Dependencies');
    lines.push('');

    if (doc.circularDependencies.length > 0) {
      lines.push(`Found ${doc.circularDependencies.length} circular dependencies:`);
      lines.push('');

      doc.circularDependencies.forEach((cd, i) => {
        lines.push(`### Cycle ${i + 1} (${cd.severity} severity)`);
        lines.push('');
        lines.push('```');
        lines.push(cd.cycle.join(' -> '));
        lines.push('```');
        lines.push('');
        lines.push(`**Suggestion:** ${cd.suggestion}`);
        lines.push('');
      });
    } else {
      lines.push('No circular dependencies detected.');
    }

    return lines.join('\n');
  }
}

/**
 * Package.json structure
 */
interface PackageJsonContent {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}
