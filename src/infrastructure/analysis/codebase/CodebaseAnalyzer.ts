/**
 * Codebase Analyzer - Main Orchestrator
 *
 * Coordinates all 6 sub-analyzers to generate comprehensive codebase documentation.
 * This is the primary entry point for generating documentation that gives agents
 * deep understanding of codebase architecture, patterns, and conventions.
 *
 * @module infrastructure/analysis/codebase/CodebaseAnalyzer
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { RepoMapGenerator } from '../RepoMapGenerator';
import type { RepoMap } from '../types';
import { ArchitectureAnalyzer } from './ArchitectureAnalyzer';
import { PatternsAnalyzer } from './PatternsAnalyzer';
import { DependenciesAnalyzer } from './DependenciesAnalyzer';
import { APISurfaceAnalyzer } from './APISurfaceAnalyzer';
import { DataFlowAnalyzer } from './DataFlowAnalyzer';
import { TestStrategyAnalyzer } from './TestStrategyAnalyzer';
import { KnownIssuesAnalyzer } from './KnownIssuesAnalyzer';
import type {
  ICodebaseAnalyzer,
  CodebaseDocumentation,
  ArchitectureDoc,
  PatternsDoc,
  DependenciesDoc,
  APISurfaceDoc,
  DataFlowDoc,
  TestStrategyDoc,
  KnownIssuesDoc,
  AnalyzerOptions,
} from './types';
import { DEFAULT_ANALYZER_OPTIONS } from './types';

/**
 * Mapping of documentation type to filename
 */
const DOC_FILENAMES: Record<keyof Omit<CodebaseDocumentation, 'projectPath' | 'generatedAt'>, string> = {
  architecture: 'ARCHITECTURE.md',
  patterns: 'PATTERNS.md',
  dependencies: 'DEPENDENCIES.md',
  apiSurface: 'API_SURFACE.md',
  dataFlow: 'DATA_FLOW.md',
  testStrategy: 'TEST_STRATEGY.md',
  knownIssues: 'KNOWN_ISSUES.md',
};

/**
 * CodebaseAnalyzer - Main orchestrator for codebase documentation generation
 *
 * Coordinates all sub-analyzers to produce 7 comprehensive documentation files
 * that give agents deep understanding of:
 * - System architecture and layers
 * - Coding patterns and conventions
 * - Dependencies (internal and external)
 * - Public API surface
 * - Data flow and state management
 * - Testing strategy
 * - Known issues and technical debt
 *
 * @example
 * ```typescript
 * const analyzer = new CodebaseAnalyzer();
 * const docs = await analyzer.analyze('./my-project');
 * await analyzer.saveDocs('.nexus/codebase');
 * ```
 */
export class CodebaseAnalyzer implements ICodebaseAnalyzer {
  /** RepoMap generator instance */
  private repoMapGenerator: RepoMapGenerator;

  /** Current generated documentation */
  private currentDocs: CodebaseDocumentation | null = null;

  /** Current analyzer options */
  private options: Required<AnalyzerOptions> | null = null;

  /** Current RepoMap */
  private currentRepoMap: RepoMap | null = null;

  /**
   * Create a new CodebaseAnalyzer
   * @param wasmBasePath - Optional base path for WASM files (for TreeSitter)
   */
  constructor(wasmBasePath?: string) {
    this.repoMapGenerator = new RepoMapGenerator(wasmBasePath);
  }

  // ============================================================================
  // Main Analysis Methods
  // ============================================================================

  /**
   * Analyze codebase and generate all documentation
   *
   * This is the main entry point. It:
   * 1. Generates a RepoMap of the entire codebase
   * 2. Runs all 6 analyzers in sequence
   * 3. Combines results into CodebaseDocumentation
   *
   * @param projectPath - Root project path to analyze
   * @param options - Optional analysis options
   * @returns Complete codebase documentation
   *
   * @example
   * ```typescript
   * const analyzer = new CodebaseAnalyzer();
   * const docs = await analyzer.analyze('./my-project', {
   *   includePrivate: false,
   *   maxExamples: 5,
   * });
   * console.log(`Analyzed ${docs.architecture.layers.length} layers`);
   * ```
   */
  async analyze(
    projectPath: string,
    options?: Partial<AnalyzerOptions>
  ): Promise<CodebaseDocumentation> {
    // Merge options with defaults
    this.options = {
      ...DEFAULT_ANALYZER_OPTIONS,
      projectPath,
      outputDir: options?.outputDir ?? DEFAULT_ANALYZER_OPTIONS.outputDir,
      includePrivate: options?.includePrivate ?? DEFAULT_ANALYZER_OPTIONS.includePrivate,
      maxExamples: options?.maxExamples ?? DEFAULT_ANALYZER_OPTIONS.maxExamples,
      generateDiagrams: options?.generateDiagrams ?? DEFAULT_ANALYZER_OPTIONS.generateDiagrams,
    };

    // Initialize and generate RepoMap
    await this.repoMapGenerator.initialize();
    this.currentRepoMap = await this.repoMapGenerator.generate(projectPath, {
      extractDocs: true,
      countReferences: true,
    });

    // Run all analyzers
    const architecture = await this.runArchitectureAnalyzer();
    const patterns = await this.runPatternsAnalyzer();
    const dependencies = await this.runDependenciesAnalyzer();
    const apiSurface = await this.runAPISurfaceAnalyzer();
    const dataFlow = await this.runDataFlowAnalyzer();
    const testStrategy = await this.runTestStrategyAnalyzer();
    const knownIssues = await this.runKnownIssuesAnalyzer();

    // Combine into documentation
    this.currentDocs = {
      projectPath,
      generatedAt: new Date(),
      architecture,
      patterns,
      dependencies,
      apiSurface,
      dataFlow,
      testStrategy,
      knownIssues,
    };

    return this.currentDocs;
  }

  /**
   * Generate only architecture documentation
   *
   * Useful when you only need the architecture overview without running
   * all analyzers.
   *
   * @returns Architecture documentation
   *
   * @example
   * ```typescript
   * const analyzer = new CodebaseAnalyzer();
   * await analyzer.analyze('./my-project');
   * const arch = await analyzer.generateArchitecture();
   * console.log(arch.overview);
   * ```
   */
  async generateArchitecture(): Promise<ArchitectureDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('Must call analyze() before generateArchitecture()');
    }

    return this.runArchitectureAnalyzer();
  }

  // ============================================================================
  // Documentation Output Methods
  // ============================================================================

  /**
   * Save all documentation to output directory
   *
   * Creates the output directory if it doesn't exist and saves all 7
   * documentation files plus an index file.
   *
   * @param outputDir - Output directory path (default: .nexus/codebase/)
   *
   * @example
   * ```typescript
   * const analyzer = new CodebaseAnalyzer();
   * await analyzer.analyze('./my-project');
   * await analyzer.saveDocs('.nexus/codebase');
   * // Creates:
   * // - .nexus/codebase/index.md
   * // - .nexus/codebase/ARCHITECTURE.md
   * // - .nexus/codebase/PATTERNS.md
   * // - etc.
   * ```
   */
  async saveDocs(outputDir?: string): Promise<void> {
    if (!this.currentDocs || !this.options) {
      throw new Error('Must call analyze() before saveDocs()');
    }

    const dir = outputDir ?? this.options.outputDir;

    // Create directory
    await mkdir(dir, { recursive: true });

    // Get Markdown for each doc type
    const markdownDocs = this.generateAllMarkdown();

    // Save each document
    const savePromises: Promise<void>[] = [];

    for (const [docType, filename] of Object.entries(DOC_FILENAMES)) {
      const content = markdownDocs[docType];
      if (content) {
        const filePath = join(dir, filename);
        savePromises.push(writeFile(filePath, content, 'utf-8'));
      }
    }

    // Save index file
    const indexContent = this.generateIndexMarkdown(dir);
    savePromises.push(writeFile(join(dir, 'index.md'), indexContent, 'utf-8'));

    await Promise.all(savePromises);
  }

  /**
   * Update documentation for changed files
   *
   * Re-analyzes only the parts affected by the changed files and updates
   * the relevant documentation.
   *
   * @param changedFiles - List of changed file paths (relative to project root)
   *
   * @example
   * ```typescript
   * const analyzer = new CodebaseAnalyzer();
   * await analyzer.analyze('./my-project');
   * // ... after some files change ...
   * await analyzer.updateDocs(['src/components/Button.tsx', 'src/utils/helpers.ts']);
   * await analyzer.saveDocs();
   * ```
   */
  async updateDocs(_changedFiles: string[]): Promise<void> {
    if (!this.currentDocs || !this.options) {
      throw new Error('Must call analyze() before updateDocs()');
    }

    // For now, perform full re-analysis
    // TODO: Implement incremental updates by detecting which analyzers need to re-run
    // based on the changed files (e.g., test file changes only need TestStrategyAnalyzer)
    await this.analyze(this.options.projectPath, this.options);
  }

  /**
   * Get documentation condensed for context window
   *
   * Returns a condensed version of all documentation that fits within
   * the specified token budget, prioritizing architecture and patterns.
   *
   * @param maxTokens - Maximum tokens for output (default: 8000)
   * @returns Condensed documentation string
   *
   * @example
   * ```typescript
   * const analyzer = new CodebaseAnalyzer();
   * await analyzer.analyze('./my-project');
   * const context = analyzer.getDocsForContext(4000);
   * const prompt = `Here's the codebase context:\n${context}\n\nTask: ...`;
   * ```
   */
  getDocsForContext(maxTokens: number = 8000): string {
    if (!this.currentDocs) {
      return '';
    }

    const sections: string[] = [];
    let estimatedTokens = 0;

    // Estimate ~4 characters per token
    const charsPerToken = 4;

    // Priority 1: Architecture overview (most important)
    if (this.currentDocs.architecture.overview) {
      const archSection = this.getCondensedArchitecture();
      if (estimatedTokens + archSection.length / charsPerToken < maxTokens) {
        sections.push(archSection);
        estimatedTokens += archSection.length / charsPerToken;
      }
    }

    // Priority 2: Key patterns
    if (this.currentDocs.patterns.overview) {
      const patternsSection = this.getCondensedPatterns();
      if (estimatedTokens + patternsSection.length / charsPerToken < maxTokens) {
        sections.push(patternsSection);
        estimatedTokens += patternsSection.length / charsPerToken;
      }
    }

    // Priority 3: Dependencies overview
    if (this.currentDocs.dependencies.overview) {
      const depsSection = this.getCondensedDependencies();
      if (estimatedTokens + depsSection.length / charsPerToken < maxTokens) {
        sections.push(depsSection);
        estimatedTokens += depsSection.length / charsPerToken;
      }
    }

    // Priority 4: Test strategy
    if (this.currentDocs.testStrategy.overview) {
      const testSection = this.getCondensedTestStrategy();
      if (estimatedTokens + testSection.length / charsPerToken < maxTokens) {
        sections.push(testSection);
        estimatedTokens += testSection.length / charsPerToken;
      }
    }

    // Priority 5: Known issues summary
    if (this.currentDocs.knownIssues.overview) {
      const issuesSection = this.getCondensedKnownIssues();
      if (estimatedTokens + issuesSection.length / charsPerToken < maxTokens) {
        sections.push(issuesSection);
        estimatedTokens += issuesSection.length / charsPerToken;
      }
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Get current documentation
   *
   * @returns Current documentation or null if not analyzed yet
   */
  getCurrentDocs(): CodebaseDocumentation | null {
    return this.currentDocs;
  }

  // ============================================================================
  // Private Analyzer Methods
  // ============================================================================

  private async runArchitectureAnalyzer(): Promise<ArchitectureDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new ArchitectureAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runPatternsAnalyzer(): Promise<PatternsDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new PatternsAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runDependenciesAnalyzer(): Promise<DependenciesDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new DependenciesAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runAPISurfaceAnalyzer(): Promise<APISurfaceDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new APISurfaceAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runDataFlowAnalyzer(): Promise<DataFlowDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new DataFlowAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runTestStrategyAnalyzer(): Promise<TestStrategyDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new TestStrategyAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  private async runKnownIssuesAnalyzer(): Promise<KnownIssuesDoc> {
    if (!this.currentRepoMap || !this.options) {
      throw new Error('RepoMap and options must be set before running analyzers');
    }
    const analyzer = new KnownIssuesAnalyzer(this.currentRepoMap, this.options);
    return analyzer.analyze();
  }

  // ============================================================================
  // Private Markdown Generation Methods
  // ============================================================================

  private generateAllMarkdown(): Record<string, string> {
    if (!this.currentDocs || !this.options || !this.currentRepoMap) {
      return {};
    }

    const archAnalyzer = new ArchitectureAnalyzer(this.currentRepoMap, this.options);
    const patternsAnalyzer = new PatternsAnalyzer(this.currentRepoMap, this.options);
    const depsAnalyzer = new DependenciesAnalyzer(this.currentRepoMap, this.options);
    const apiAnalyzer = new APISurfaceAnalyzer(this.currentRepoMap, this.options);
    const dataFlowAnalyzer = new DataFlowAnalyzer(this.currentRepoMap, this.options);
    const testAnalyzer = new TestStrategyAnalyzer(this.currentRepoMap, this.options);
    const issuesAnalyzer = new KnownIssuesAnalyzer(this.currentRepoMap, this.options);

    return {
      architecture: archAnalyzer.toMarkdown(this.currentDocs.architecture),
      patterns: patternsAnalyzer.toMarkdown(this.currentDocs.patterns),
      dependencies: depsAnalyzer.toMarkdown(this.currentDocs.dependencies),
      apiSurface: apiAnalyzer.toMarkdown(this.currentDocs.apiSurface),
      dataFlow: dataFlowAnalyzer.toMarkdown(this.currentDocs.dataFlow),
      testStrategy: testAnalyzer.toMarkdown(this.currentDocs.testStrategy),
      knownIssues: issuesAnalyzer.toMarkdown(this.currentDocs.knownIssues),
    };
  }

  private generateIndexMarkdown(_outputDir: string): string {
    const timestamp = new Date().toISOString();
    const lines: string[] = [];

    lines.push('# Codebase Documentation');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push(`> Project: ${this.options?.projectPath ?? 'Unknown'}`);
    lines.push('');
    lines.push('## Documentation Files');
    lines.push('');
    lines.push('| Document | Description |');
    lines.push('|----------|-------------|');
    lines.push('| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, layers, and design decisions |');
    lines.push('| [PATTERNS.md](./PATTERNS.md) | Coding patterns, conventions, and file organization |');
    lines.push('| [DEPENDENCIES.md](./DEPENDENCIES.md) | External and internal dependencies |');
    lines.push('| [API_SURFACE.md](./API_SURFACE.md) | Public interfaces, classes, and functions |');
    lines.push('| [DATA_FLOW.md](./DATA_FLOW.md) | State management and data flow |');
    lines.push('| [TEST_STRATEGY.md](./TEST_STRATEGY.md) | Testing approach and patterns |');
    lines.push('| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Technical debt and known limitations |');
    lines.push('');
    lines.push('## Quick Stats');
    lines.push('');

    if (this.currentRepoMap) {
      lines.push(`- **Total Files:** ${String(this.currentRepoMap.files.length)}`);
      lines.push(`- **Total Symbols:** ${String(this.currentRepoMap.symbols.length)}`);
      lines.push(`- **Dependencies:** ${String(this.currentRepoMap.dependencies.length)}`);
    }

    if (this.currentDocs) {
      lines.push(`- **Layers Detected:** ${String(this.currentDocs.architecture.layers.length)}`);
      lines.push(`- **Patterns Found:** ${String(this.currentDocs.patterns.architecturalPatterns.length + this.currentDocs.patterns.codingPatterns.length)}`);
      lines.push(`- **Technical Debt Items:** ${String(this.currentDocs.knownIssues.technicalDebt.length)}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*This documentation was auto-generated by the Nexus Codebase Analyzer.*');

    return lines.join('\n');
  }

  // ============================================================================
  // Private Condensed Output Methods
  // ============================================================================

  private getCondensedArchitecture(): string {
    if (!this.currentDocs) return '';

    const doc = this.currentDocs.architecture;
    const lines: string[] = [];

    lines.push('# Architecture Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');
    lines.push('## Layers');
    lines.push('');

    for (const layer of doc.layers) {
      lines.push(`**${String(layer.number)}. ${layer.name}:** ${layer.purpose}`);
    }

    lines.push('');
    lines.push('## Key Components');
    lines.push('');

    for (const comp of doc.keyComponents.slice(0, 10)) {
      lines.push(`- **${comp.name}** (${comp.file}): ${comp.purpose}`);
    }

    return lines.join('\n');
  }

  private getCondensedPatterns(): string {
    if (!this.currentDocs) return '';

    const doc = this.currentDocs.patterns;
    const lines: string[] = [];

    lines.push('# Patterns & Conventions');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');
    lines.push('## Architectural Patterns');
    lines.push('');

    for (const pattern of doc.architecturalPatterns.slice(0, 5)) {
      lines.push(`- **${pattern.name}:** ${pattern.description}`);
    }

    lines.push('');
    lines.push('## Naming Conventions');
    lines.push('');

    for (const conv of doc.namingConventions.slice(0, 5)) {
      lines.push(`- **${conv.element}:** ${conv.convention}${conv.prefix ? ` (prefix: ${conv.prefix})` : ''}`);
    }

    return lines.join('\n');
  }

  private getCondensedDependencies(): string {
    if (!this.currentDocs) return '';

    const doc = this.currentDocs.dependencies;
    const lines: string[] = [];

    lines.push('# Dependencies');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');
    lines.push('## Critical External Dependencies');
    lines.push('');

    const critical = doc.externalDependencies.filter(d => d.critical);
    for (const dep of critical.slice(0, 10)) {
      lines.push(`- **${dep.name}** (${dep.version}): ${dep.purpose}`);
    }

    if (doc.circularDependencies.length > 0) {
      lines.push('');
      lines.push('## Circular Dependencies');
      lines.push('');

      for (const circ of doc.circularDependencies) {
        lines.push(`- ${circ.cycle.join(' -> ')} (${circ.severity})`);
      }
    }

    return lines.join('\n');
  }

  private getCondensedTestStrategy(): string {
    if (!this.currentDocs) return '';

    const doc = this.currentDocs.testStrategy;
    const lines: string[] = [];

    lines.push('# Test Strategy');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');
    lines.push('## Frameworks');
    lines.push('');

    for (const fw of doc.frameworks) {
      lines.push(`- **${fw.name}:** ${fw.purpose}`);
    }

    lines.push('');
    lines.push('## Test Types');
    lines.push('');

    for (const type of doc.testTypes) {
      lines.push(`- **${type.type}:** ${String(type.count)} tests (${type.namingPattern})`);
    }

    return lines.join('\n');
  }

  private getCondensedKnownIssues(): string {
    if (!this.currentDocs) return '';

    const doc = this.currentDocs.knownIssues;
    const lines: string[] = [];

    lines.push('# Known Issues');
    lines.push('');
    lines.push(doc.overview);

    if (doc.technicalDebt.length > 0) {
      lines.push('');
      lines.push('## High Priority Technical Debt');
      lines.push('');

      const highPriority = doc.technicalDebt.filter(d => d.severity === 'high');
      for (const debt of highPriority.slice(0, 5)) {
        lines.push(`- **${debt.location}:** ${debt.description}`);
      }
    }

    if (doc.limitations.length > 0) {
      lines.push('');
      lines.push('## Limitations');
      lines.push('');

      for (const limit of doc.limitations.slice(0, 5)) {
        lines.push(`- ${limit.limitation}`);
      }
    }

    return lines.join('\n');
  }
}
