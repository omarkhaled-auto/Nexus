/**
 * Nexus AI Builder - Main Entry Point
 *
 * This is the main library entry point for Nexus AI Builder.
 * It exports all core components for programmatic usage.
 *
 * For Electron app usage, see src/main/main.ts
 *
 * @module nexus
 *
 * @example
 * ```typescript
 * import {
 *   NexusCoordinator,
 *   LLMProvider,
 *   generateRepoMap,
 * } from 'nexus';
 *
 * // Initialize LLM provider
 * const llm = new LLMProvider({ claudeApiKey: '...' });
 *
 * // Generate repository map
 * const repoMap = await generateRepoMap('./my-project');
 * ```
 */

// ============================================================================
// Layer 2: Orchestration - Core Coordination
// ============================================================================

export {
  // Coordinator
  NexusCoordinator,
  type NexusCoordinatorOptions,
  // Event Bus
  EventBus,
  type EmitOptions,
  type WildcardHandler,
  type Unsubscribe,
  // Task Queue
  TaskQueue,
  // Agent Pool
  AgentPool,
  PoolCapacityError,
  AgentNotFoundError,
  // Context Management (Phase 13-04)
  FreshContextManager,
  TokenBudgeter,
  ContextBuilder,
  type TaskContext,
  type TokenBudget,
  type ContextValidation,
  // Dynamic Replanner (Phase 13-07)
  DynamicReplanner,
  TaskSplitter,
  type ReplanDecision,
  type ReplanResult,
  type ReplanTrigger,
  // Self-Assessment Engine (Phase 13-08)
  SelfAssessmentEngine,
  type ProgressAssessment,
  type BlockerAssessment,
  type ApproachAssessment,
  type Recommendation,
  // Assessment-Replanner Bridge
  AssessmentReplannerBridge,
  createAssessmentReplannerBridge,
  type AssessmentReplanResult,
  type BridgeConfig,
} from './orchestration';

// ============================================================================
// Layer 3: Planning - Task Decomposition
// ============================================================================

export type {
  TaskSize,
  PlanningTask,
  CompletedTask,
  Wave,
  DecompositionResult,
  DecompositionOptions,
  TaskValidationResult,
  ITaskDecomposer,
  IDependencyResolver,
  ITimeEstimator,
} from './planning';

// ============================================================================
// Layer 4: Execution - Agent System
// ============================================================================

export {
  // Iteration (Phase 13-06)
  RalphStyleIterator,
  createFullRalphStyleIterator,
  GitDiffContextBuilder,
  ErrorContextAggregator,
  type IterationResult,
  type IterationOptions,
  type IterationContext,
  type IterationStatus,
  // Tools
  RequestContextToolHandler,
  createRequestContextTool,
  REQUEST_CONTEXT_TOOL_DEFINITION,
  type ToolDefinition,
  type ToolExecutionResult,
  // Agents
  loadPrompt,
  clearPromptCache,
  preloadPrompts,
} from './execution';

// ============================================================================
// Layer 6: Persistence - Data Management
// ============================================================================

export {
  // Memory System
  MemorySystem,
  MemoryError,
  EpisodeNotFoundError,
  QueryError,
  type MemorySystemOptions,
  type Episode,
  type SimilarityResult,
  type MemoryQuery,
  type ContextResult,
  // Embeddings
  EmbeddingsService,
  type EmbeddingsServiceOptions,
  type EmbeddingResult,
  type EmbeddingError,
  // Code Memory (Phase 13-03)
  CodeMemory,
  CodeChunker,
  CodeSearchEngine,
  type CodeChunk,
  type CodeSearchResult,
  type IndexStats,
} from './persistence/memory';

export {
  // Checkpoints
  CheckpointManager,
  CheckpointScheduler,
  type CheckpointManagerOptions,
  type CheckpointConfig,
} from './persistence/checkpoints';

// ============================================================================
// Layer 7: Infrastructure - Analysis Tools
// ============================================================================

export {
  // Repository Map Generator (Phase 13-01)
  RepoMapGenerator,
  TreeSitterParser,
  SymbolExtractor,
  DependencyGraphBuilder,
  ReferenceCounter,
  RepoMapFormatter,
  // Convenience functions
  createRepoMapGenerator,
  generateRepoMap,
  formatRepoMapForContext,
  getRepoStats,
  // Types
  type RepoMap,
  type RepoMapOptions,
  type FormatOptions,
  type SymbolEntry,
  type FileEntry,
  type DependencyEdge,
  // Codebase Analyzer (Phase 13-02)
  CodebaseAnalyzer,
  ArchitectureAnalyzer,
  PatternsAnalyzer,
  DependenciesAnalyzer,
  type CodebaseDocumentation,
  type ArchitectureDoc,
  type PatternsDoc,
  type DependenciesDoc,
} from './infrastructure/analysis';

// ============================================================================
// LLM Layer - AI Clients
// ============================================================================

export {
  // Provider
  LLMProvider,
  type LLMProviderOptions,
  type ClaudeBackend,
  // Claude Client
  ClaudeClient,
  LLMError,
  APIError,
  RateLimitError,
  AuthenticationError,
  TimeoutError,
  type ClaudeClientOptions,
  // Gemini Client
  GeminiClient,
  GeminiAPIError,
  GeminiRateLimitError,
  GeminiTimeoutError,
  type GeminiClientOptions,
  // Claude Code CLI
  ClaudeCodeCLIClient,
  CLIError,
  CLINotFoundError,
  type ClaudeCodeCLIConfig,
  // Mock Clients (for testing)
  MockClaudeClient,
  MockGeminiClient,
  // Types
  type Message,
  type MessageRole,
  type ToolCall,
  type ToolResult,
  type ThinkingConfig,
  type ChatOptions,
  type LLMResponse,
  type StreamChunk,
  type TokenUsage,
  type AgentType,
  type ModelConfig,
  type LLMClient,
} from './llm';

// ============================================================================
// NexusFactory - Main Entry Point
// ============================================================================

export {
  // Factory for creating fully-wired Nexus instances
  NexusFactory,
  createNexus,
  createTestingNexus,
  createMinimalNexus,
  type NexusConfig,
  type NexusInstance,
} from './NexusFactory';

// ============================================================================
// Version Information
// ============================================================================

/**
 * Nexus version
 */
export const VERSION = '0.1.0';

/**
 * Nexus build information
 */
export const BUILD_INFO = {
  version: VERSION,
  name: 'Nexus AI Builder',
  description: 'Autonomous AI application builder',
} as const;
