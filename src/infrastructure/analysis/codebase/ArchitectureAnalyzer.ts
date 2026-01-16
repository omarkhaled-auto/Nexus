/**
 * Architecture Analyzer
 *
 * Analyzes codebase architecture and generates ARCHITECTURE.md documentation.
 * Detects layers, key components, entry points, and infers design decisions.
 *
 * @module infrastructure/analysis/codebase/ArchitectureAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  ArchitectureDoc,
  LayerDescription,
  ComponentDescription,
  EntryPointDescription,
  DesignDecision,
} from './types';

/**
 * Layer configuration for detection
 */
interface LayerConfig {
  name: string;
  number: number;
  patterns: string[];
  purpose: string;
}

/**
 * Predefined Nexus architecture layers
 */
const NEXUS_LAYERS: LayerConfig[] = [
  {
    name: 'UI Layer',
    number: 1,
    patterns: ['src/ui/', 'src/renderer/', 'src/components/'],
    purpose: 'User interface components, React views, and presentation logic',
  },
  {
    name: 'Orchestration Layer',
    number: 2,
    patterns: ['src/orchestration/'],
    purpose: 'Workflow coordination, agent orchestration, and task management',
  },
  {
    name: 'Planning Layer',
    number: 3,
    patterns: ['src/planning/'],
    purpose: 'Task planning, strategy generation, and decision making',
  },
  {
    name: 'Execution Layer',
    number: 4,
    patterns: ['src/execution/'],
    purpose: 'Task execution, tool invocation, and action handling',
  },
  {
    name: 'Quality Layer',
    number: 5,
    patterns: ['src/quality/', 'src/validation/'],
    purpose: 'Quality assurance, validation, and output verification',
  },
  {
    name: 'Persistence Layer',
    number: 6,
    patterns: ['src/persistence/', 'src/database/', 'src/storage/'],
    purpose: 'Data storage, caching, and state persistence',
  },
  {
    name: 'Infrastructure Layer',
    number: 7,
    patterns: ['src/infrastructure/', 'src/core/', 'src/shared/', 'src/utils/'],
    purpose: 'Cross-cutting concerns, utilities, and shared infrastructure',
  },
];

/**
 * Technology detection patterns
 */
const TECHNOLOGY_PATTERNS: Array<{ name: string; patterns: string[] }> = [
  { name: 'React', patterns: ['.tsx', 'react', 'useState', 'useEffect'] },
  { name: 'Electron', patterns: ['electron', 'ipcMain', 'ipcRenderer', 'BrowserWindow'] },
  { name: 'TypeScript', patterns: ['.ts', '.tsx', 'interface ', 'type '] },
  { name: 'Zustand', patterns: ['zustand', 'create(', 'useStore'] },
  { name: 'SQLite', patterns: ['sqlite', 'better-sqlite3', '.db'] },
  { name: 'Vite', patterns: ['vite', 'vite.config'] },
  { name: 'Vitest', patterns: ['vitest', '.test.ts', '.spec.ts'] },
  { name: 'TailwindCSS', patterns: ['tailwind', 'tailwindcss'] },
];

/**
 * Analyzer that generates ARCHITECTURE.md documentation
 *
 * Examines the codebase structure to:
 * - Detect architectural layers
 * - Identify key components
 * - Find application entry points
 * - Infer design decisions
 *
 * @example
 * ```typescript
 * const analyzer = new ArchitectureAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class ArchitectureAnalyzer extends BaseAnalyzer {
  /**
   * Perform architecture analysis
   * @returns Architecture documentation
   */
  async analyze(): Promise<ArchitectureDoc> {
    const overview = this.generateOverview();
    const layers = this.detectLayers();
    const keyComponents = this.identifyKeyComponents();
    const entryPoints = this.findEntryPoints();
    const designDecisions = this.inferDesignDecisions();

    return {
      overview,
      layers,
      keyComponents,
      entryPoints,
      designDecisions,
    };
  }

  /**
   * Generate high-level architecture overview
   */
  private generateOverview(): string {
    const fileCount = this.repoMap.files.length;
    const symbolCount = this.repoMap.symbols.length;
    const dependencyCount = this.repoMap.dependencies.length;

    // Detect technologies
    const technologies = this.detectTechnologies();

    // Count layers found
    const layerDirs = this.getAllDirectories();
    const layerCount = NEXUS_LAYERS.filter(layer =>
      layer.patterns.some(pattern =>
        layerDirs.some(dir => dir.startsWith(pattern.replace('src/', '')))
      )
    ).length;

    // Build overview paragraphs
    const paragraphs: string[] = [];

    // First paragraph - project type and scale
    paragraphs.push(
      `This codebase is a ${technologies.length > 0 ? technologies.slice(0, 3).join('/') + ' ' : ''}application ` +
      `consisting of ${fileCount} source files containing ${symbolCount} symbols. ` +
      `The project follows a ${layerCount > 3 ? 'multi-layered' : 'modular'} architecture ` +
      `with ${dependencyCount} inter-file dependencies.`
    );

    // Second paragraph - key technologies
    if (technologies.length > 0) {
      paragraphs.push(
        `Key technologies include: ${technologies.join(', ')}. ` +
        `The codebase emphasizes type safety with TypeScript and follows ` +
        `modern ${technologies.includes('React') ? 'React component patterns' : 'module patterns'} ` +
        `for maintainability.`
      );
    }

    // Third paragraph - architectural style
    if (layerCount >= 5) {
      paragraphs.push(
        `The architecture follows a clean separation of concerns with ${layerCount} distinct layers, ` +
        `enabling independent development and testing of each layer. ` +
        `Dependencies flow downward through the layer hierarchy, minimizing coupling.`
      );
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Detect technologies used in the codebase
   */
  private detectTechnologies(): string[] {
    const detected: string[] = [];

    // Check file extensions and imports
    const allFiles = this.repoMap.files.map(f => f.relativePath.toLowerCase());
    const allSymbols = this.repoMap.symbols.map(s => s.signature?.toLowerCase() || '');

    for (const tech of TECHNOLOGY_PATTERNS) {
      const found = tech.patterns.some(pattern => {
        const lowerPattern = pattern.toLowerCase();
        return allFiles.some(f => f.includes(lowerPattern)) ||
               allSymbols.some(s => s.includes(lowerPattern));
      });

      if (found) {
        detected.push(tech.name);
      }
    }

    return detected;
  }

  /**
   * Detect architectural layers in the codebase
   */
  private detectLayers(): LayerDescription[] {
    const layers: LayerDescription[] = [];
    const allDirs = this.getAllDirectories();

    for (const layerConfig of NEXUS_LAYERS) {
      // Find directories matching this layer
      const matchingDirs: string[] = [];
      for (const pattern of layerConfig.patterns) {
        const normalizedPattern = pattern.replace(/^src\//, '').replace(/\/$/, '');
        const matches = allDirs.filter(dir => {
          const normalizedDir = dir.replace(/^src\//, '');
          return normalizedDir === normalizedPattern ||
                 normalizedDir.startsWith(normalizedPattern + '/');
        });
        matchingDirs.push(...matches);
      }

      if (matchingDirs.length === 0) {
        continue;
      }

      // Get unique directories
      const directories = [...new Set(matchingDirs)].map(d => 'src/' + d);

      // Find key files in this layer
      const keyFiles = this.findKeyFilesInDirectories(directories);

      // Find layer dependencies
      const dependencies = this.findLayerDependencies(directories);

      layers.push({
        name: layerConfig.name,
        number: layerConfig.number,
        purpose: layerConfig.purpose,
        directories,
        keyFiles: keyFiles.slice(0, 5), // Top 5 key files
        dependencies,
      });
    }

    // Sort by layer number
    return layers.sort((a, b) => a.number - b.number);
  }

  /**
   * Find key files in given directories based on reference count and exports
   */
  private findKeyFilesInDirectories(directories: string[]): string[] {
    const filesInDirs = new Set<string>();

    for (const dir of directories) {
      const files = this.getFilesInDirectory(dir);
      files.forEach(f => filesInDirs.add(f));
    }

    // Rank files by symbol importance
    const fileScores = new Map<string, number>();

    for (const file of filesInDirs) {
      const symbols = this.repoMap.symbols.filter(s => s.file === file);
      const totalRefs = symbols.reduce((sum, s) => sum + s.references, 0);
      const exportedCount = symbols.filter(s => s.exported).length;
      const score = totalRefs * 2 + exportedCount * 5;

      // Bonus for index files
      if (file.endsWith('/index.ts') || file.endsWith('/index.tsx')) {
        fileScores.set(file, score + 10);
      } else {
        fileScores.set(file, score);
      }
    }

    // Sort by score descending
    return [...fileScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([file]) => file);
  }

  /**
   * Find dependencies between layers
   */
  private findLayerDependencies(directories: string[]): string[] {
    const dependentLayers = new Set<string>();

    for (const dir of directories) {
      const files = this.getFilesInDirectory(dir);

      for (const file of files) {
        const deps = this.getDependenciesOf(file);

        for (const dep of deps) {
          // Check which layer this dependency belongs to
          for (const layer of NEXUS_LAYERS) {
            const isInLayer = layer.patterns.some(pattern => {
              const normalizedDep = dep.replace(/\\/g, '/');
              return normalizedDep.includes(pattern.replace(/\/$/, ''));
            });

            if (isInLayer && !directories.some(d => dep.includes(d))) {
              dependentLayers.add(layer.name);
            }
          }
        }
      }
    }

    return Array.from(dependentLayers);
  }

  /**
   * Identify key components in the codebase
   */
  private identifyKeyComponents(): ComponentDescription[] {
    const components: ComponentDescription[] = [];

    // Get most referenced symbols (classes and functions)
    const candidates = this.getMostReferencedSymbols(30)
      .filter(s => s.kind === 'class' || s.kind === 'function' || s.kind === 'interface');

    // Get exported symbols from index files
    const indexExports = this.repoMap.symbols.filter(s => {
      return s.exported && s.file.endsWith('index.ts');
    });

    // Combine and dedupe
    const allCandidates = [...candidates, ...indexExports];
    const seen = new Set<string>();
    const uniqueCandidates = allCandidates.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });

    // Build component descriptions
    for (const symbol of uniqueCandidates.slice(0, 20)) {
      const purpose = this.inferPurpose(symbol);

      // Get public API
      const publicAPI = this.getPublicAPI(symbol);

      // Get dependencies and dependents
      const deps = this.getDependenciesOf(symbol.file);
      const dependents = this.getDependentsOf(symbol.file);

      components.push({
        name: symbol.name,
        file: symbol.file,
        purpose,
        publicAPI,
        dependencies: deps.slice(0, 5),
        dependents: dependents.slice(0, 5),
      });
    }

    return components;
  }

  /**
   * Get public API of a symbol (methods for classes, parameters for functions)
   */
  private getPublicAPI(symbol: { name: string; kind: string; file: string; signature: string }): string[] {
    const api: string[] = [];

    if (symbol.kind === 'class') {
      // Find methods of this class
      const methods = this.repoMap.symbols.filter(s => {
        return s.kind === 'method' &&
               s.file === symbol.file &&
               s.parentId?.includes(symbol.name);
      });

      for (const method of methods) {
        if (method.exported || !method.modifiers.includes('private')) {
          api.push(method.signature || method.name);
        }
      }
    } else if (symbol.kind === 'interface') {
      // For interfaces, include the signature
      api.push(symbol.signature || symbol.name);
    } else if (symbol.kind === 'function') {
      api.push(symbol.signature || symbol.name);
    }

    return api.slice(0, 8); // Limit to 8 methods
  }

  /**
   * Find application entry points
   */
  private findEntryPoints(): EntryPointDescription[] {
    const entryPoints: EntryPointDescription[] = [];
    const allFiles = this.repoMap.files.map(f => f.relativePath);

    // Define entry point patterns
    const entryPatterns: Array<{
      pattern: RegExp;
      type: EntryPointDescription['type'];
      description: string;
    }> = [
      {
        pattern: /main\.(ts|tsx|js|jsx)$/,
        type: 'main',
        description: 'Main entry point for the Electron main process',
      },
      {
        pattern: /renderer\.(ts|tsx|js|jsx)$/,
        type: 'renderer',
        description: 'Entry point for the Electron renderer process',
      },
      {
        pattern: /preload\.(ts|tsx|js|jsx)$/,
        type: 'preload',
        description: 'Preload script bridging main and renderer processes',
      },
      {
        pattern: /worker\.(ts|tsx|js|jsx)$/,
        type: 'worker',
        description: 'Web worker entry point for background processing',
      },
      {
        pattern: /^src\/index\.(ts|tsx|js|jsx)$/,
        type: 'main',
        description: 'Main module exports',
      },
      {
        pattern: /api\.(ts|tsx|js|jsx)$/,
        type: 'api',
        description: 'API entry point for external integrations',
      },
    ];

    for (const file of allFiles) {
      for (const entry of entryPatterns) {
        if (entry.pattern.test(file)) {
          const name = file.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || file;

          entryPoints.push({
            name,
            file,
            type: entry.type,
            description: entry.description,
          });
          break; // Only match first pattern
        }
      }
    }

    return entryPoints;
  }

  /**
   * Infer design decisions from the codebase
   */
  private inferDesignDecisions(): DesignDecision[] {
    const decisions: DesignDecision[] = [];
    const technologies = this.detectTechnologies();

    // State management decision
    if (technologies.includes('Zustand')) {
      decisions.push({
        decision: 'Use Zustand for state management',
        rationale: 'Zustand provides a simple, lightweight state management solution with TypeScript support and React hooks integration.',
        alternatives: ['Redux', 'MobX', 'Jotai', 'React Context'],
        tradeoffs: 'Less boilerplate than Redux, but fewer middleware options and smaller ecosystem.',
      });
    }

    // Database decision
    if (technologies.includes('SQLite')) {
      decisions.push({
        decision: 'Use SQLite for local data persistence',
        rationale: 'SQLite provides a reliable, embedded database solution ideal for desktop applications requiring local data storage.',
        alternatives: ['IndexedDB', 'LevelDB', 'JSON files', 'MongoDB'],
        tradeoffs: 'Requires native module compilation (better-sqlite3), but offers full SQL support and ACID compliance.',
      });
    }

    // UI framework decision
    if (technologies.includes('React')) {
      decisions.push({
        decision: 'Use React for UI development',
        rationale: 'React offers a mature component-based architecture with excellent TypeScript support and a large ecosystem.',
        alternatives: ['Vue', 'Svelte', 'Angular', 'Solid'],
        tradeoffs: 'Larger bundle size and learning curve, but excellent tooling and community support.',
      });
    }

    // Desktop framework decision
    if (technologies.includes('Electron')) {
      decisions.push({
        decision: 'Use Electron for desktop application',
        rationale: 'Electron enables cross-platform desktop applications using web technologies, with full Node.js access.',
        alternatives: ['Tauri', 'NW.js', 'Neutralino', 'Native development'],
        tradeoffs: 'Larger application size and memory usage, but faster development and cross-platform compatibility.',
      });
    }

    // Testing framework decision
    if (technologies.includes('Vitest')) {
      decisions.push({
        decision: 'Use Vitest for testing',
        rationale: 'Vitest provides fast, native ESM and TypeScript support with Jest-compatible API.',
        alternatives: ['Jest', 'Mocha', 'Ava', 'uvu'],
        tradeoffs: 'Newer tool with smaller ecosystem, but excellent Vite integration and speed.',
      });
    }

    // Build tool decision
    if (technologies.includes('Vite')) {
      decisions.push({
        decision: 'Use Vite for build tooling',
        rationale: 'Vite offers fast HMR and build times with native ESM support and minimal configuration.',
        alternatives: ['Webpack', 'Parcel', 'esbuild', 'Rollup'],
        tradeoffs: 'Some plugins may not be available, but significantly faster development experience.',
      });
    }

    // Architecture decision based on layer count
    const layers = this.detectLayers();
    if (layers.length >= 5) {
      decisions.push({
        decision: 'Implement layered architecture with separation of concerns',
        rationale: 'Layered architecture enables independent development, testing, and modification of each layer while maintaining clear boundaries.',
        alternatives: ['Monolithic architecture', 'Microservices', 'Hexagonal architecture'],
        tradeoffs: 'More initial structure required, but better long-term maintainability and testability.',
      });
    }

    return decisions;
  }

  /**
   * Convert architecture documentation to Markdown
   * @param doc - Architecture documentation
   * @returns Markdown string
   */
  toMarkdown(doc: ArchitectureDoc): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push('# Architecture Documentation');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // Layer diagram
    if (doc.layers.length > 0 && this.options.generateDiagrams) {
      lines.push('## Architecture Layers');
      lines.push('');
      lines.push(this.generateLayerDiagram(doc.layers));
      lines.push('');
    }

    // Layer descriptions
    if (doc.layers.length > 0) {
      lines.push('### Layer Details');
      lines.push('');

      for (const layer of doc.layers) {
        lines.push(`#### ${layer.number}. ${layer.name}`);
        lines.push('');
        lines.push(`**Purpose:** ${layer.purpose}`);
        lines.push('');
        lines.push('**Directories:**');
        for (const dir of layer.directories) {
          lines.push(`- \`${dir}\``);
        }
        lines.push('');

        if (layer.keyFiles.length > 0) {
          lines.push('**Key Files:**');
          for (const file of layer.keyFiles) {
            lines.push(`- \`${file}\``);
          }
          lines.push('');
        }

        if (layer.dependencies.length > 0) {
          lines.push(`**Dependencies:** ${layer.dependencies.join(', ')}`);
          lines.push('');
        }
      }
    }

    // Key components
    if (doc.keyComponents.length > 0) {
      lines.push('## Key Components');
      lines.push('');
      lines.push('| Component | File | Purpose |');
      lines.push('|-----------|------|---------|');

      for (const comp of doc.keyComponents) {
        const purpose = comp.purpose.length > 60
          ? comp.purpose.substring(0, 57) + '...'
          : comp.purpose;
        lines.push(`| \`${comp.name}\` | \`${comp.file}\` | ${purpose} |`);
      }
      lines.push('');

      // Detailed component descriptions
      lines.push('### Component Details');
      lines.push('');

      for (const comp of doc.keyComponents.slice(0, 10)) {
        lines.push(`#### ${comp.name}`);
        lines.push('');
        lines.push(`**File:** \`${comp.file}\``);
        lines.push('');
        lines.push(`**Purpose:** ${comp.purpose}`);
        lines.push('');

        if (comp.publicAPI.length > 0) {
          lines.push('**Public API:**');
          for (const api of comp.publicAPI) {
            lines.push(`- \`${api}\``);
          }
          lines.push('');
        }

        if (comp.dependencies.length > 0) {
          lines.push(`**Dependencies:** ${comp.dependencies.map(d => `\`${d}\``).join(', ')}`);
          lines.push('');
        }

        if (comp.dependents.length > 0) {
          lines.push(`**Used By:** ${comp.dependents.map(d => `\`${d}\``).join(', ')}`);
          lines.push('');
        }
      }
    }

    // Entry points
    if (doc.entryPoints.length > 0) {
      lines.push('## Entry Points');
      lines.push('');

      for (const entry of doc.entryPoints) {
        lines.push(`### ${entry.name}`);
        lines.push('');
        lines.push(`- **Type:** ${entry.type}`);
        lines.push(`- **File:** \`${entry.file}\``);
        lines.push(`- **Description:** ${entry.description}`);
        lines.push('');
      }
    }

    // Design decisions
    if (doc.designDecisions.length > 0) {
      lines.push('## Design Decisions');
      lines.push('');

      for (const decision of doc.designDecisions) {
        lines.push(`### ${decision.decision}`);
        lines.push('');
        lines.push(`**Rationale:** ${decision.rationale}`);
        lines.push('');
        lines.push(`**Alternatives Considered:** ${decision.alternatives.join(', ')}`);
        lines.push('');
        lines.push(`**Trade-offs:** ${decision.tradeoffs}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Mermaid layer diagram
   */
  private generateLayerDiagram(layers: LayerDescription[]): string {
    const nodes = layers.map(layer => ({
      id: `L${layer.number}`,
      label: `${layer.number}. ${layer.name}`,
      shape: 'rectangle' as const,
    }));

    const edges: Array<{ from: string; to: string; style?: 'solid' | 'dotted' }> = [];

    // Add edges for layer dependencies
    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayer = layers[i];
      const nextLayer = layers[i + 1];
      if (currentLayer && nextLayer) {
        edges.push({
          from: `L${currentLayer.number}`,
          to: `L${nextLayer.number}`,
          style: 'solid',
        });
      }
    }

    return '```mermaid\n' + this.generateMermaidDiagram('flowchart', {
      direction: 'TB',
      nodes,
      edges,
    }) + '\n```';
  }
}
