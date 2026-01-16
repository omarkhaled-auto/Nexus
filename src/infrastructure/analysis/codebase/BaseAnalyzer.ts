/**
 * Base Analyzer
 *
 * Abstract base class for all codebase analyzers. Provides common helper methods
 * for working with RepoMap data, extracting documentation, and generating diagrams.
 *
 * @module infrastructure/analysis/codebase/BaseAnalyzer
 */

import type {
  RepoMap,
  SymbolEntry,
  SymbolKind,
  DependencyEdge,
} from '../types';
import type { AnalyzerOptions } from './types';
import { DEFAULT_ANALYZER_OPTIONS } from './types';

/**
 * Abstract base class for codebase analyzers
 *
 * Provides common functionality for analyzing RepoMap data and generating
 * documentation. Each specific analyzer extends this class.
 *
 * @example
 * ```typescript
 * class ArchitectureAnalyzer extends BaseAnalyzer {
 *   async analyze(): Promise<ArchitectureDoc> {
 *     const classes = this.getSymbolsByKind('class');
 *     // ... analysis logic
 *   }
 * }
 * ```
 */
export abstract class BaseAnalyzer {
  /** Repository map containing all symbols and dependencies */
  protected repoMap: RepoMap;

  /** Analyzer options */
  protected options: Required<AnalyzerOptions>;

  /**
   * Create a new BaseAnalyzer
   * @param repoMap - Repository map to analyze
   * @param options - Analyzer options
   */
  constructor(repoMap: RepoMap, options: AnalyzerOptions) {
    this.repoMap = repoMap;
    this.options = {
      ...DEFAULT_ANALYZER_OPTIONS,
      projectPath: options.projectPath,
      outputDir: options.outputDir ?? DEFAULT_ANALYZER_OPTIONS.outputDir,
      includePrivate: options.includePrivate ?? DEFAULT_ANALYZER_OPTIONS.includePrivate,
      maxExamples: options.maxExamples ?? DEFAULT_ANALYZER_OPTIONS.maxExamples,
      generateDiagrams: options.generateDiagrams ?? DEFAULT_ANALYZER_OPTIONS.generateDiagrams,
    };
  }

  /**
   * Perform analysis and return documentation
   * Each analyzer must implement this method.
   */
  abstract analyze(): Promise<unknown>;

  // ============================================================================
  // Symbol Helper Methods
  // ============================================================================

  /**
   * Get all symbols of a specific kind
   * @param kind - Symbol kind to filter by
   * @returns Array of matching symbols
   */
  protected getSymbolsByKind(kind: SymbolKind): SymbolEntry[] {
    return this.repoMap.symbols.filter(s => s.kind === kind);
  }

  /**
   * Get all exported symbols
   * @returns Array of exported symbols
   */
  protected getExportedSymbols(): SymbolEntry[] {
    return this.repoMap.symbols.filter(s => s.exported);
  }

  /**
   * Get symbols from a specific file
   * @param filePath - File path to get symbols from
   * @returns Array of symbols in that file
   */
  protected getSymbolsInFile(filePath: string): SymbolEntry[] {
    return this.repoMap.symbols.filter(s => s.file === filePath);
  }

  /**
   * Get all symbols matching a name pattern
   * @param pattern - Regular expression or string to match
   * @returns Array of matching symbols
   */
  protected getSymbolsByName(pattern: string | RegExp): SymbolEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.repoMap.symbols.filter(s => regex.test(s.name));
  }

  /**
   * Get the most referenced symbols
   * @param limit - Maximum number of symbols to return
   * @returns Array of symbols sorted by reference count
   */
  protected getMostReferencedSymbols(limit: number = 20): SymbolEntry[] {
    return [...this.repoMap.symbols]
      .sort((a, b) => b.references - a.references)
      .slice(0, limit);
  }

  // ============================================================================
  // File Helper Methods
  // ============================================================================

  /**
   * Get all files in a directory (recursively)
   * @param dir - Directory path (relative or absolute)
   * @returns Array of file paths
   */
  protected getFilesInDirectory(dir: string): string[] {
    const normalizedDir = dir.replace(/\\/g, '/');
    return this.repoMap.files
      .filter(f => {
        const filePath = f.relativePath.replace(/\\/g, '/');
        return filePath.startsWith(normalizedDir) ||
               filePath.startsWith('./' + normalizedDir);
      })
      .map(f => f.relativePath);
  }

  /**
   * Get all unique directories in the codebase
   * @returns Array of directory paths
   */
  protected getAllDirectories(): string[] {
    const dirs = new Set<string>();
    for (const file of this.repoMap.files) {
      const parts = file.relativePath.replace(/\\/g, '/').split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        dirs.add(path);
      }
    }
    return Array.from(dirs).sort();
  }

  // ============================================================================
  // Dependency Helper Methods
  // ============================================================================

  /**
   * Get files that the given file depends on (imports from)
   * @param filePath - File to get dependencies for
   * @returns Array of file paths
   */
  protected getDependenciesOf(filePath: string): string[] {
    const deps = new Set<string>();
    for (const edge of this.repoMap.dependencies) {
      if (this.normalizePath(edge.from) === this.normalizePath(filePath)) {
        deps.add(edge.to);
      }
    }
    return Array.from(deps);
  }

  /**
   * Get files that depend on the given file (import it)
   * @param filePath - File to get dependents for
   * @returns Array of file paths
   */
  protected getDependentsOf(filePath: string): string[] {
    const dependents = new Set<string>();
    for (const edge of this.repoMap.dependencies) {
      if (this.normalizePath(edge.to) === this.normalizePath(filePath)) {
        dependents.add(edge.from);
      }
    }
    return Array.from(dependents);
  }

  /**
   * Get all dependency edges for a file
   * @param filePath - File to get edges for
   * @returns Array of dependency edges
   */
  protected getDependencyEdges(filePath: string): DependencyEdge[] {
    const normalized = this.normalizePath(filePath);
    return this.repoMap.dependencies.filter(
      e => this.normalizePath(e.from) === normalized ||
           this.normalizePath(e.to) === normalized
    );
  }

  // ============================================================================
  // Documentation Helper Methods
  // ============================================================================

  /**
   * Extract JSDoc documentation from a symbol
   * @param symbol - Symbol to extract documentation from
   * @returns Cleaned documentation string
   */
  protected extractJSDoc(symbol: SymbolEntry): string {
    if (!symbol.documentation) {
      return '';
    }
    // Clean up JSDoc formatting
    return symbol.documentation
      .replace(/\/\*\*|\*\/|\n\s*\*/g, '')
      .replace(/@\w+\s+\{[^}]*\}/g, '') // Remove @param {type}, @returns {type}, etc.
      .replace(/@\w+\s+/g, '') // Remove remaining tags
      .trim();
  }

  /**
   * Infer the purpose of a symbol based on its name and context
   * @param symbol - Symbol to infer purpose for
   * @returns Inferred purpose description
   */
  protected inferPurpose(symbol: SymbolEntry): string {
    const name = symbol.name;
    const kind = symbol.kind;

    // First check for existing documentation
    const doc = this.extractJSDoc(symbol);
    if (doc && doc.length > 10) {
      return doc.split('\n')[0]; // First line of documentation
    }

    // Infer from name patterns
    const patterns: Array<[RegExp, string]> = [
      // Services
      [/Service$/i, `Service for managing ${this.humanize(name.replace(/Service$/i, ''))} operations`],
      // Repositories
      [/Repository$/i, `Repository for ${this.humanize(name.replace(/Repository$/i, ''))} data access`],
      [/DB$/i, `Database operations for ${this.humanize(name.replace(/DB$/i, ''))}`],
      // Controllers
      [/Controller$/i, `Controller handling ${this.humanize(name.replace(/Controller$/i, ''))} requests`],
      // Managers
      [/Manager$/i, `Manager for ${this.humanize(name.replace(/Manager$/i, ''))} coordination`],
      // Handlers
      [/Handler$/i, `Handler for ${this.humanize(name.replace(/Handler$/i, ''))} events`],
      // Providers
      [/Provider$/i, `Provider supplying ${this.humanize(name.replace(/Provider$/i, ''))}`],
      // Factories
      [/Factory$/i, `Factory creating ${this.humanize(name.replace(/Factory$/i, ''))} instances`],
      // Builders
      [/Builder$/i, `Builder for constructing ${this.humanize(name.replace(/Builder$/i, ''))} objects`],
      // Adapters
      [/Adapter$/i, `Adapter for ${this.humanize(name.replace(/Adapter$/i, ''))} integration`],
      // Validators
      [/Validator$/i, `Validator for ${this.humanize(name.replace(/Validator$/i, ''))} data`],
      // Utils/Helpers
      [/Utils?$/i, `Utility functions for ${this.humanize(name.replace(/Utils?$/i, ''))}`],
      [/Helper$/i, `Helper functions for ${this.humanize(name.replace(/Helper$/i, ''))}`],
      // Types/Interfaces
      [/^I[A-Z]/, `Interface defining ${this.humanize(name.slice(1))} contract`],
      [/Type$/i, `Type definition for ${this.humanize(name.replace(/Type$/i, ''))}`],
      [/Props$/i, `Props type for ${this.humanize(name.replace(/Props$/i, ''))} component`],
      // State
      [/State$/i, `State type for ${this.humanize(name.replace(/State$/i, ''))}`],
      [/Store$/i, `State store for ${this.humanize(name.replace(/Store$/i, ''))} data`],
      // Events
      [/Event$/i, `Event type for ${this.humanize(name.replace(/Event$/i, ''))} actions`],
      // React components (PascalCase)
      [/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/, kind === 'function' ? `React component rendering ${this.humanize(name)}` : ''],
      // Common prefixes
      [/^get[A-Z]/, `Gets ${this.humanize(name.replace(/^get/, ''))}`],
      [/^set[A-Z]/, `Sets ${this.humanize(name.replace(/^set/, ''))}`],
      [/^is[A-Z]/, `Checks if ${this.humanize(name.replace(/^is/, ''))}`],
      [/^has[A-Z]/, `Checks if has ${this.humanize(name.replace(/^has/, ''))}`],
      [/^create[A-Z]/, `Creates ${this.humanize(name.replace(/^create/, ''))}`],
      [/^build[A-Z]/, `Builds ${this.humanize(name.replace(/^build/, ''))}`],
      [/^parse[A-Z]/, `Parses ${this.humanize(name.replace(/^parse/, ''))}`],
      [/^format[A-Z]/, `Formats ${this.humanize(name.replace(/^format/, ''))}`],
      [/^validate[A-Z]/, `Validates ${this.humanize(name.replace(/^validate/, ''))}`],
      [/^handle[A-Z]/, `Handles ${this.humanize(name.replace(/^handle/, ''))} event`],
      [/^on[A-Z]/, `Handler for ${this.humanize(name.replace(/^on/, ''))} event`],
    ];

    for (const [pattern, description] of patterns) {
      if (pattern.test(name) && description) {
        return description;
      }
    }

    // Default based on kind
    switch (kind) {
      case 'class':
        return `Class for ${this.humanize(name)}`;
      case 'interface':
        return `Interface defining ${this.humanize(name)}`;
      case 'function':
        return `Function performing ${this.humanize(name)}`;
      case 'type':
        return `Type alias for ${this.humanize(name)}`;
      case 'enum':
        return `Enumeration of ${this.humanize(name)} values`;
      case 'constant':
        return `Constant value for ${this.humanize(name)}`;
      default:
        return `${kind} ${this.humanize(name)}`;
    }
  }

  // ============================================================================
  // Diagram Generation Methods
  // ============================================================================

  /**
   * Generate a Mermaid diagram
   * @param type - Diagram type
   * @param data - Data for the diagram
   * @returns Mermaid diagram string
   */
  protected generateMermaidDiagram(
    type: 'flowchart' | 'classDiagram' | 'sequenceDiagram',
    data: unknown
  ): string {
    switch (type) {
      case 'flowchart':
        return this.generateFlowchart(data as FlowchartData);
      case 'classDiagram':
        return this.generateClassDiagram(data as ClassDiagramData);
      case 'sequenceDiagram':
        return this.generateSequenceDiagram(data as SequenceDiagramData);
      default:
        return '';
    }
  }

  /**
   * Generate a Mermaid flowchart
   */
  private generateFlowchart(data: FlowchartData): string {
    const lines = ['flowchart TD'];
    const direction = data.direction || 'TD';
    lines[0] = `flowchart ${direction}`;

    // Add nodes
    for (const node of data.nodes) {
      const shape = node.shape || 'rectangle';
      const label = node.label || node.id;
      switch (shape) {
        case 'rectangle':
          lines.push(`    ${node.id}[${label}]`);
          break;
        case 'rounded':
          lines.push(`    ${node.id}(${label})`);
          break;
        case 'circle':
          lines.push(`    ${node.id}((${label}))`);
          break;
        case 'diamond':
          lines.push(`    ${node.id}{${label}}`);
          break;
        default:
          lines.push(`    ${node.id}[${label}]`);
      }
    }

    // Add edges
    for (const edge of data.edges) {
      const arrow = edge.style === 'dotted' ? '-.->' : '-->';
      if (edge.label) {
        lines.push(`    ${edge.from} ${arrow}|${edge.label}| ${edge.to}`);
      } else {
        lines.push(`    ${edge.from} ${arrow} ${edge.to}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate a Mermaid class diagram
   */
  private generateClassDiagram(data: ClassDiagramData): string {
    const lines = ['classDiagram'];

    // Add classes
    for (const cls of data.classes) {
      lines.push(`    class ${cls.name} {`);
      for (const member of cls.members || []) {
        const visibility = member.visibility === 'private' ? '-' :
                          member.visibility === 'protected' ? '#' : '+';
        lines.push(`        ${visibility}${member.name}`);
      }
      lines.push(`    }`);
    }

    // Add relationships
    for (const rel of data.relationships || []) {
      switch (rel.type) {
        case 'inheritance':
          lines.push(`    ${rel.from} --|> ${rel.to}`);
          break;
        case 'composition':
          lines.push(`    ${rel.from} *-- ${rel.to}`);
          break;
        case 'aggregation':
          lines.push(`    ${rel.from} o-- ${rel.to}`);
          break;
        case 'dependency':
          lines.push(`    ${rel.from} ..> ${rel.to}`);
          break;
        case 'implementation':
          lines.push(`    ${rel.from} ..|> ${rel.to}`);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate a Mermaid sequence diagram
   */
  private generateSequenceDiagram(data: SequenceDiagramData): string {
    const lines = ['sequenceDiagram'];

    // Add participants
    for (const participant of data.participants) {
      lines.push(`    participant ${participant.id} as ${participant.label || participant.id}`);
    }

    // Add messages
    for (const msg of data.messages) {
      const arrow = msg.type === 'async' ? '-)' :
                   msg.type === 'return' ? '-->' : '->';
      lines.push(`    ${msg.from}${arrow}${msg.to}: ${msg.label}`);
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Normalize a file path for comparison
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  /**
   * Convert camelCase/PascalCase to human-readable string
   */
  private humanize(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .toLowerCase()
      .trim();
  }
}

// ============================================================================
// Diagram Data Types
// ============================================================================

interface FlowchartData {
  direction?: 'TD' | 'TB' | 'LR' | 'RL';
  nodes: Array<{
    id: string;
    label?: string;
    shape?: 'rectangle' | 'rounded' | 'circle' | 'diamond';
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    style?: 'solid' | 'dotted';
  }>;
}

interface ClassDiagramData {
  classes: Array<{
    name: string;
    members?: Array<{
      name: string;
      visibility?: 'public' | 'private' | 'protected';
    }>;
  }>;
  relationships?: Array<{
    from: string;
    to: string;
    type: 'inheritance' | 'composition' | 'aggregation' | 'dependency' | 'implementation';
  }>;
}

interface SequenceDiagramData {
  participants: Array<{
    id: string;
    label?: string;
  }>;
  messages: Array<{
    from: string;
    to: string;
    label: string;
    type?: 'sync' | 'async' | 'return';
  }>;
}
