/**
 * Codebase Documentation Types
 *
 * Comprehensive type definitions for auto-generated codebase documentation.
 * These types define the structure of 7 documentation files that give agents
 * deep understanding of codebase architecture, patterns, and conventions.
 *
 * @module infrastructure/analysis/codebase/types
 */

// ============================================================================
// Main Documentation Types
// ============================================================================

/**
 * Complete codebase documentation combining all 7 documentation types
 */
export interface CodebaseDocumentation {
  /** Root project path */
  projectPath: string;
  /** When documentation was generated */
  generatedAt: Date;
  /** System architecture documentation */
  architecture: ArchitectureDoc;
  /** Coding patterns documentation */
  patterns: PatternsDoc;
  /** Dependency analysis documentation */
  dependencies: DependenciesDoc;
  /** Public API surface documentation */
  apiSurface: APISurfaceDoc;
  /** Data flow documentation */
  dataFlow: DataFlowDoc;
  /** Test strategy documentation */
  testStrategy: TestStrategyDoc;
  /** Known issues documentation */
  knownIssues: KnownIssuesDoc;
}

// ============================================================================
// Architecture Documentation Types
// ============================================================================

/**
 * Architecture documentation describing system structure
 */
export interface ArchitectureDoc {
  /** High-level overview of the architecture */
  overview: string;
  /** System layers with descriptions */
  layers: LayerDescription[];
  /** Key components in the system */
  keyComponents: ComponentDescription[];
  /** Entry points into the application */
  entryPoints: EntryPointDescription[];
  /** Major design decisions and rationale */
  designDecisions: DesignDecision[];
}

/**
 * Description of an architectural layer
 */
export interface LayerDescription {
  /** Layer name (e.g., "UI Layer", "Persistence Layer") */
  name: string;
  /** Layer number in hierarchy (1 = top, 7 = bottom) */
  number: number;
  /** Purpose and responsibilities of this layer */
  purpose: string;
  /** Directories belonging to this layer */
  directories: string[];
  /** Key files in this layer */
  keyFiles: string[];
  /** Other layers this layer depends on */
  dependencies: string[];
}

/**
 * Description of a key component
 */
export interface ComponentDescription {
  /** Component name */
  name: string;
  /** File containing this component */
  file: string;
  /** Purpose of the component */
  purpose: string;
  /** Public API methods/properties */
  publicAPI: string[];
  /** Components this depends on */
  dependencies: string[];
  /** Components that depend on this */
  dependents: string[];
}

/**
 * Description of an application entry point
 */
export interface EntryPointDescription {
  /** Entry point name */
  name: string;
  /** File path */
  file: string;
  /** Type of entry point */
  type: 'main' | 'renderer' | 'preload' | 'worker' | 'api';
  /** Description of what this entry point does */
  description: string;
}

/**
 * A design decision with rationale
 */
export interface DesignDecision {
  /** The decision that was made */
  decision: string;
  /** Why this decision was made */
  rationale: string;
  /** Alternatives that were considered */
  alternatives: string[];
  /** Trade-offs of this decision */
  tradeoffs: string;
}

// ============================================================================
// Patterns Documentation Types
// ============================================================================

/**
 * Patterns documentation describing coding conventions
 */
export interface PatternsDoc {
  /** Overview of patterns used */
  overview: string;
  /** Architectural patterns (Repository, Service, etc.) */
  architecturalPatterns: PatternDescription[];
  /** Coding patterns (async/await, error handling, etc.) */
  codingPatterns: PatternDescription[];
  /** Naming conventions */
  namingConventions: NamingConvention[];
  /** File organization rules */
  fileOrganization: FileOrganizationRule[];
}

/**
 * Description of a pattern used in the codebase
 */
export interface PatternDescription {
  /** Pattern name */
  name: string;
  /** Description of the pattern */
  description: string;
  /** Examples of this pattern in the codebase */
  examples: PatternExample[];
  /** When to use this pattern */
  whenToUse: string;
  /** Related patterns */
  relatedPatterns: string[];
}

/**
 * Example of a pattern in the codebase
 */
export interface PatternExample {
  /** File containing the example */
  file: string;
  /** Line range (e.g., "45-67") */
  lines: string;
  /** Description of this example */
  description: string;
  /** Optional code snippet */
  code?: string;
}

/**
 * A naming convention used in the codebase
 */
export interface NamingConvention {
  /** Element type (e.g., "class", "interface", "function") */
  element: string;
  /** Convention used (e.g., "PascalCase", "camelCase") */
  convention: string;
  /** Optional prefix (e.g., "I" for interfaces) */
  prefix?: string;
  /** Optional suffix (e.g., "Service", "Repository") */
  suffix?: string;
  /** Examples of this convention */
  examples: string[];
}

/**
 * A file organization rule
 */
export interface FileOrganizationRule {
  /** File pattern (e.g., "*.test.ts") */
  pattern: string;
  /** Where these files are located */
  location: string;
  /** Purpose of this organization */
  purpose: string;
}

// ============================================================================
// Dependencies Documentation Types
// ============================================================================

/**
 * Dependencies documentation
 */
export interface DependenciesDoc {
  /** Overview of dependency structure */
  overview: string;
  /** External npm dependencies */
  externalDependencies: ExternalDependency[];
  /** Internal module dependencies */
  internalModules: InternalModule[];
  /** Mermaid dependency graph */
  dependencyGraph: string;
  /** Detected circular dependencies */
  circularDependencies: CircularDependency[];
}

/**
 * An external npm dependency
 */
export interface ExternalDependency {
  /** Package name */
  name: string;
  /** Version string */
  version: string;
  /** Purpose of this dependency */
  purpose: string;
  /** Files that use this dependency */
  usedBy: string[];
  /** Whether this is critical for core functionality */
  critical: boolean;
}

/**
 * An internal module
 */
export interface InternalModule {
  /** Module name */
  name: string;
  /** Module path */
  path: string;
  /** Exported symbols */
  exports: string[];
  /** Files that import this module */
  importedBy: string[];
  /** Modules this imports */
  imports: string[];
}

/**
 * A circular dependency in the codebase
 */
export interface CircularDependency {
  /** Files in the cycle */
  cycle: string[];
  /** Severity of the circular dependency */
  severity: 'low' | 'medium' | 'high';
  /** Suggestion for fixing */
  suggestion: string;
}

// ============================================================================
// API Surface Documentation Types
// ============================================================================

/**
 * API surface documentation
 */
export interface APISurfaceDoc {
  /** Overview of public API */
  overview: string;
  /** Public interfaces */
  publicInterfaces: InterfaceDoc[];
  /** Public classes */
  publicClasses: ClassDoc[];
  /** Public functions */
  publicFunctions: FunctionDoc[];
  /** Public type aliases */
  publicTypes: TypeDoc[];
  /** IPC channels (for Electron apps) */
  ipcChannels?: IPCChannelDoc[];
}

/**
 * Documentation for an interface
 */
export interface InterfaceDoc {
  /** Interface name */
  name: string;
  /** File containing the interface */
  file: string;
  /** Description from JSDoc */
  description: string;
  /** Properties in the interface */
  properties: PropertyDoc[];
  /** Methods in the interface */
  methods: MethodDoc[];
  /** Interfaces this extends */
  extends?: string[];
}

/**
 * Documentation for a class
 */
export interface ClassDoc {
  /** Class name */
  name: string;
  /** File containing the class */
  file: string;
  /** Description from JSDoc */
  description: string;
  /** Constructor signature */
  constructor: string;
  /** Public properties */
  properties: PropertyDoc[];
  /** Public methods */
  methods: MethodDoc[];
  /** Parent class */
  extends?: string;
  /** Implemented interfaces */
  implements?: string[];
}

/**
 * Documentation for a function
 */
export interface FunctionDoc {
  /** Function name */
  name: string;
  /** File containing the function */
  file: string;
  /** Full function signature */
  signature: string;
  /** Description from JSDoc */
  description: string;
  /** Function parameters */
  parameters: ParameterDoc[];
  /** Return type description */
  returns: string;
}

/**
 * Documentation for a type alias
 */
export interface TypeDoc {
  /** Type name */
  name: string;
  /** File containing the type */
  file: string;
  /** Type definition */
  definition: string;
  /** Description from JSDoc */
  description: string;
}

/**
 * Documentation for a property
 */
export interface PropertyDoc {
  /** Property name */
  name: string;
  /** Property type */
  type: string;
  /** Description from JSDoc */
  description: string;
  /** Whether the property is optional */
  optional: boolean;
}

/**
 * Documentation for a method
 */
export interface MethodDoc {
  /** Method name */
  name: string;
  /** Method signature */
  signature: string;
  /** Description from JSDoc */
  description: string;
  /** Method parameters */
  parameters: ParameterDoc[];
  /** Return type description */
  returns: string;
}

/**
 * Documentation for a parameter
 */
export interface ParameterDoc {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Description from JSDoc */
  description: string;
  /** Whether the parameter is optional */
  optional: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * Documentation for an IPC channel (Electron)
 */
export interface IPCChannelDoc {
  /** Channel name */
  channel: string;
  /** Direction of communication */
  direction: 'main-to-renderer' | 'renderer-to-main' | 'bidirectional';
  /** Payload type/description */
  payload: string;
  /** Response type/description */
  response?: string;
  /** Channel description */
  description: string;
}

// ============================================================================
// Data Flow Documentation Types
// ============================================================================

/**
 * Data flow documentation
 */
export interface DataFlowDoc {
  /** Overview of data flow */
  overview: string;
  /** State management approach */
  stateManagement: StateManagementDoc;
  /** Data stores in the application */
  dataStores: DataStoreDoc[];
  /** Event flows in the application */
  eventFlows: EventFlowDoc[];
  /** Data transformations */
  dataTransformations: DataTransformationDoc[];
}

/**
 * State management documentation
 */
export interface StateManagementDoc {
  /** Approach used (e.g., "Zustand stores") */
  approach: string;
  /** Individual stores */
  stores: StoreDoc[];
  /** Persistence strategy */
  persistence: string;
}

/**
 * Documentation for a state store
 */
export interface StoreDoc {
  /** Store name */
  name: string;
  /** File containing the store */
  file: string;
  /** State properties */
  state: string[];
  /** Actions available */
  actions: string[];
  /** Components that subscribe to this store */
  subscribers: string[];
}

/**
 * Documentation for a data store
 */
export interface DataStoreDoc {
  /** Store name */
  name: string;
  /** Type of storage */
  type: 'sqlite' | 'memory' | 'file' | 'indexeddb';
  /** Schema if applicable */
  schema?: string;
  /** Location of the store */
  location: string;
  /** Files that access this store */
  accessedBy: string[];
}

/**
 * Documentation for an event flow
 */
export interface EventFlowDoc {
  /** Event name */
  name: string;
  /** What triggers this event */
  trigger: string;
  /** Handlers for this event */
  handlers: string[];
  /** Mermaid sequence diagram */
  flow: string;
}

/**
 * Documentation for a data transformation
 */
export interface DataTransformationDoc {
  /** Transformation name */
  name: string;
  /** Input type/format */
  input: string;
  /** Output type/format */
  output: string;
  /** File/function that performs the transformation */
  transformer: string;
  /** Description of the transformation */
  description: string;
}

// ============================================================================
// Test Strategy Documentation Types
// ============================================================================

/**
 * Test strategy documentation
 */
export interface TestStrategyDoc {
  /** Overview of testing approach */
  overview: string;
  /** Test frameworks used */
  frameworks: TestFramework[];
  /** Types of tests */
  testTypes: TestTypeDoc[];
  /** Coverage information */
  coverage: CoverageDoc;
  /** Test patterns used */
  testPatterns: TestPatternDoc[];
}

/**
 * A test framework used
 */
export interface TestFramework {
  /** Framework name */
  name: string;
  /** Purpose of this framework */
  purpose: string;
  /** Configuration file */
  configFile: string;
}

/**
 * Documentation for a type of test
 */
export interface TestTypeDoc {
  /** Test type */
  type: 'unit' | 'integration' | 'e2e' | 'component';
  /** Where these tests are located */
  location: string;
  /** Naming pattern for these tests */
  namingPattern: string;
  /** Number of tests of this type */
  count: number;
}

/**
 * Coverage documentation
 */
export interface CoverageDoc {
  /** Target coverage percentage */
  target: number;
  /** Current coverage percentage */
  current?: number;
  /** Patterns excluded from coverage */
  excludes: string[];
}

/**
 * A test pattern used
 */
export interface TestPatternDoc {
  /** Pattern name */
  pattern: string;
  /** Description of the pattern */
  description: string;
  /** Example of this pattern */
  example: string;
}

// ============================================================================
// Known Issues Documentation Types
// ============================================================================

/**
 * Known issues documentation
 */
export interface KnownIssuesDoc {
  /** Overview of known issues */
  overview: string;
  /** Technical debt items */
  technicalDebt: TechnicalDebtItem[];
  /** Known limitations */
  limitations: LimitationDoc[];
  /** Workarounds in place */
  workarounds: WorkaroundDoc[];
  /** Future improvements suggested */
  futureImprovements: FutureImprovementDoc[];
}

/**
 * A technical debt item
 */
export interface TechnicalDebtItem {
  /** Unique identifier */
  id: string;
  /** Description of the debt */
  description: string;
  /** Location in the codebase */
  location: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Effort required to fix */
  effort: 'small' | 'medium' | 'large';
  /** Suggested fix */
  suggestion: string;
}

/**
 * A known limitation
 */
export interface LimitationDoc {
  /** The limitation */
  limitation: string;
  /** Reason for the limitation */
  reason: string;
  /** Impact on functionality */
  impact: string;
  /** Workaround if any */
  workaround?: string;
}

/**
 * A workaround in place
 */
export interface WorkaroundDoc {
  /** Issue being worked around */
  issue: string;
  /** The workaround */
  workaround: string;
  /** Location of the workaround */
  location: string;
  /** Whether this is a permanent solution */
  permanent: boolean;
}

/**
 * A future improvement suggestion
 */
export interface FutureImprovementDoc {
  /** The improvement */
  improvement: string;
  /** Benefit of implementing */
  benefit: string;
  /** Complexity to implement */
  complexity: 'low' | 'medium' | 'high';
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Analyzer Options Types
// ============================================================================

/**
 * Options for the codebase analyzers
 */
export interface AnalyzerOptions {
  /** Root project path */
  projectPath: string;
  /** Output directory for generated docs (default: .nexus/codebase/) */
  outputDir?: string;
  /** Include private members in documentation */
  includePrivate?: boolean;
  /** Maximum number of examples per pattern */
  maxExamples?: number;
  /** Generate Mermaid diagrams */
  generateDiagrams?: boolean;
}

/**
 * Default analyzer options
 */
export const DEFAULT_ANALYZER_OPTIONS: Required<Omit<AnalyzerOptions, 'projectPath'>> = {
  outputDir: '.nexus/codebase/',
  includePrivate: false,
  maxExamples: 3,
  generateDiagrams: true,
};

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Interface for the main codebase analyzer
 */
export interface ICodebaseAnalyzer {
  /**
   * Analyze codebase and generate all documentation
   * @param projectPath - Root project path
   * @param options - Analysis options
   * @returns Complete codebase documentation
   */
  analyze(projectPath: string, options?: Partial<AnalyzerOptions>): Promise<CodebaseDocumentation>;

  /**
   * Generate only architecture documentation
   * @returns Architecture documentation
   */
  generateArchitecture(): Promise<ArchitectureDoc>;

  /**
   * Save documentation to output directory
   * @param outputDir - Output directory path
   */
  saveDocs(outputDir?: string): Promise<void>;

  /**
   * Update documentation for changed files
   * @param changedFiles - List of changed file paths
   */
  updateDocs(changedFiles: string[]): Promise<void>;

  /**
   * Get documentation condensed for context window
   * @param maxTokens - Maximum tokens
   * @returns Condensed documentation string
   */
  getDocsForContext(maxTokens?: number): string;

  /**
   * Get current documentation
   * @returns Current documentation or null
   */
  getCurrentDocs(): CodebaseDocumentation | null;
}
