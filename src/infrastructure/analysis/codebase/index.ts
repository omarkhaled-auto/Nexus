/**
 * Codebase Documentation Analysis Module
 *
 * Auto-generates 7 comprehensive documentation files that give agents deep
 * understanding of codebase architecture, patterns, and conventions.
 *
 * @module infrastructure/analysis/codebase
 *
 * @example
 * ```typescript
 * import { analyzeCodebase, generateCodebaseDocs } from './infrastructure/analysis/codebase';
 *
 * // Generate and save docs in one call
 * await generateCodebaseDocs('.', '.nexus/codebase');
 *
 * // Or analyze and work with docs programmatically
 * const docs = await analyzeCodebase('.');
 * console.log(docs.architecture.layers);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Main documentation types
  CodebaseDocumentation,
  ArchitectureDoc,
  PatternsDoc,
  DependenciesDoc,
  APISurfaceDoc,
  DataFlowDoc,
  TestStrategyDoc,
  KnownIssuesDoc,

  // Architecture types
  LayerDescription,
  ComponentDescription,
  EntryPointDescription,
  DesignDecision,

  // Patterns types
  PatternDescription,
  PatternExample,
  NamingConvention,
  FileOrganizationRule,

  // Dependencies types
  ExternalDependency,
  InternalModule,
  CircularDependency,

  // API Surface types
  InterfaceDoc,
  ClassDoc,
  FunctionDoc,
  TypeDoc,
  PropertyDoc,
  MethodDoc,
  ParameterDoc,
  IPCChannelDoc,

  // Data Flow types
  StateManagementDoc,
  StoreDoc,
  DataStoreDoc,
  EventFlowDoc,
  DataTransformationDoc,

  // Test Strategy types
  TestFramework,
  TestTypeDoc,
  CoverageDoc,
  TestPatternDoc,

  // Known Issues types
  TechnicalDebtItem,
  LimitationDoc,
  WorkaroundDoc,
  FutureImprovementDoc,

  // Options types
  AnalyzerOptions,
  ICodebaseAnalyzer,
} from './types';

export { DEFAULT_ANALYZER_OPTIONS } from './types';

// ============================================================================
// Class Exports
// ============================================================================

export { BaseAnalyzer } from './BaseAnalyzer';
export { ArchitectureAnalyzer } from './ArchitectureAnalyzer';
export { PatternsAnalyzer } from './PatternsAnalyzer';
export { DependenciesAnalyzer } from './DependenciesAnalyzer';
export { APISurfaceAnalyzer } from './APISurfaceAnalyzer';
export { DataFlowAnalyzer } from './DataFlowAnalyzer';
export { TestStrategyAnalyzer } from './TestStrategyAnalyzer';
export { KnownIssuesAnalyzer } from './KnownIssuesAnalyzer';
export { CodebaseAnalyzer } from './CodebaseAnalyzer';

// ============================================================================
// Convenience Functions
// ============================================================================

import type { CodebaseDocumentation, AnalyzerOptions } from './types';
import { CodebaseAnalyzer } from './CodebaseAnalyzer';

/**
 * Analyze a codebase and return documentation
 *
 * Convenience function that creates a CodebaseAnalyzer, runs analysis,
 * and returns the documentation.
 *
 * @param projectPath - Root project path to analyze
 * @param options - Optional analysis options
 * @returns Complete codebase documentation
 *
 * @example
 * ```typescript
 * const docs = await analyzeCodebase('./my-project');
 * console.log(`Found ${docs.architecture.layers.length} layers`);
 * console.log(`Found ${docs.patterns.architecturalPatterns.length} patterns`);
 * ```
 */
export async function analyzeCodebase(
  projectPath: string,
  options?: Partial<AnalyzerOptions>
): Promise<CodebaseDocumentation> {
  const analyzer = new CodebaseAnalyzer();
  return analyzer.analyze(projectPath, options);
}

/**
 * Generate and save codebase documentation to files
 *
 * Convenience function that analyzes a codebase and saves all 7
 * documentation files to the specified output directory.
 *
 * @param projectPath - Root project path to analyze
 * @param outputDir - Output directory for documentation (default: .nexus/codebase/)
 * @param options - Optional analysis options
 *
 * @example
 * ```typescript
 * // Generate docs with defaults
 * await generateCodebaseDocs('.');
 *
 * // Generate docs to custom directory
 * await generateCodebaseDocs('.', './docs/codebase');
 *
 * // Generate docs with options
 * await generateCodebaseDocs('.', '.nexus/codebase', {
 *   includePrivate: true,
 *   maxExamples: 10,
 * });
 * ```
 */
export async function generateCodebaseDocs(
  projectPath: string,
  outputDir: string = '.nexus/codebase',
  options?: Partial<AnalyzerOptions>
): Promise<CodebaseDocumentation> {
  const analyzer = new CodebaseAnalyzer();
  const docs = await analyzer.analyze(projectPath, {
    ...options,
    outputDir,
  });
  await analyzer.saveDocs(outputDir);
  return docs;
}

/**
 * Get condensed codebase documentation for context window
 *
 * Convenience function that analyzes a codebase and returns a condensed
 * version suitable for inclusion in prompts or context windows.
 *
 * @param projectPath - Root project path to analyze
 * @param maxTokens - Maximum token budget (default: 8000)
 * @param options - Optional analysis options
 * @returns Condensed documentation string
 *
 * @example
 * ```typescript
 * const context = await getCodebaseContext('.', 4000);
 * const prompt = `Here's the codebase context:\n${context}\n\nTask: ...`;
 * ```
 */
export async function getCodebaseContext(
  projectPath: string,
  maxTokens: number = 8000,
  options?: Partial<AnalyzerOptions>
): Promise<string> {
  const analyzer = new CodebaseAnalyzer();
  await analyzer.analyze(projectPath, options);
  return analyzer.getDocsForContext(maxTokens);
}
