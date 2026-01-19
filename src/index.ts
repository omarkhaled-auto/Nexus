/**
 * Nexus - AI-Powered Software Development Orchestration Framework
 *
 * This is the main entry point for the Nexus library.
 * It provides access to all major components for building AI-orchestrated
 * software development pipelines.
 *
 * @example
 * ```typescript
 * import {
 *   // Factory (primary API)
 *   NexusFactory,
 *   createNexus,
 *
 *   // Planning
 *   TaskDecomposer,
 *   DependencyResolver,
 *   TimeEstimator,
 *
 *   // Execution
 *   CoderAgent,
 *   TesterAgent,
 *   ReviewerAgent,
 *   BuildRunner,
 *   LintRunner,
 *   TestRunner,
 * } from 'nexus';
 *
 * // Create a complete Nexus instance
 * const nexus = createNexus({
 *   claudeApiKey: process.env.ANTHROPIC_API_KEY!,
 *   geminiApiKey: process.env.GOOGLE_API_KEY!,
 *   workingDir: '/path/to/project',
 * });
 *
 * // Use Genesis mode to build from scratch
 * await nexus.coordinator.initialize({ projectPath: '/path/to/project' });
 * await nexus.coordinator.start();
 * ```
 *
 * @module nexus
 */

// ============================================================================
// NexusFactory (Primary API)
// ============================================================================

/**
 * NexusFactory is the main entry point for creating Nexus instances.
 * It handles all dependency wiring and configuration.
 */
export {
  NexusFactory,
  createNexus,
  createTestingNexus,
  DEFAULT_NEXUS_CONFIG,
  type NexusFactoryConfig,
  type NexusTestingConfig,
  type NexusInstance,
  type LLMBackend,
  type EmbeddingsBackend,
} from './NexusFactory';

// ============================================================================
// Planning Layer (Layer 3)
// ============================================================================

/**
 * Planning components handle task decomposition, dependency resolution,
 * and time estimation.
 */
export {
  // Implementations
  TaskDecomposer,
  createTaskDecomposer,
  DependencyResolver,
  createDependencyResolver,
  TimeEstimator,
  createTimeEstimator,

  // Types
  type TaskSize,
  type PlanningTask,
  type CompletedTask,
  type Wave,
  type DecompositionResult,
  type DecompositionOptions,
  type TaskValidationResult,
  type ITaskDecomposer,
  type IDependencyResolver,
  type ITimeEstimator,
  type TaskDecomposerConfig,
  type Cycle,
  type DependencyResolverConfig,
  type EstimationFactors,
  type EstimationResult,
  type TimeEstimatorConfig,
  type ComplexityLevel,
  type TaskCategory,
} from './planning';

// ============================================================================
// Execution Layer (Layer 4)
// ============================================================================

/**
 * Execution components handle agent execution, iteration, QA, and tools.
 */
export {
  // Iteration
  RalphStyleIterator,
  createFullRalphStyleIterator,
  GitDiffContextBuilder,
  ErrorContextAggregator,
  type RalphStyleIteratorConfig,

  // Agents
  BaseAgentRunner,
  CoderAgent,
  TesterAgent,
  ReviewerAgent,
  MergerAgent,
  type AgentConfig,
  type AgentContext,
  type AgentTaskResult,
  type ReviewSeverity,
  type ReviewIssue,
  type ReviewOutput,
  type ConflictSeverity,
  type ConflictType,
  type MergeConflict,
  type MergeResolution,
  type MergeOutput,

  // QA Runners
  BuildRunner,
  LintRunner,
  TestRunner,
  ReviewRunner,
  QARunnerFactory,
  createQARunner,
  createQuickQARunner,
  createMockQARunner,
  type QARunner,
  type BuildResult,
  type LintResult,
  type TestResult,
  type ReviewResult,
  type QARunnerFactoryConfig,
  type BuildRunnerConfig,
  type LintRunnerConfig,
  type TestRunnerConfig,
  type ReviewRunnerConfig,
  type ReviewContext,

  // Tools
  REQUEST_CONTEXT_TOOL_DEFINITION,
  RequestContextToolHandler,
  createRequestContextTool,
} from './execution';

// ============================================================================
// Orchestration Layer
// ============================================================================

/**
 * Orchestration components handle coordination, agent pools, task queues,
 * and event management.
 */
export {
  // Coordinator
  NexusCoordinator,
  type NexusCoordinatorOptions,

  // Agent Pool
  AgentPool,
  PoolCapacityError,
  AgentNotFoundError,

  // Task Queue
  TaskQueue,

  // Event Bus
  EventBus,
  type EmitOptions,
  type WildcardHandler,
  type Unsubscribe,

  // Assessment-Replanner Bridge
  AssessmentReplannerBridge,
  createAssessmentReplannerBridge,
  type AssessmentReplanResult,
  type BridgeConfig,
  type BridgeEventEmitter,
} from './orchestration';

// ============================================================================
// LLM Clients
// ============================================================================

/**
 * LLM clients for interacting with Claude and Gemini APIs.
 */
export {
  // Claude
  ClaudeClient,
  LLMError,
  APIError,
  RateLimitError,
  AuthenticationError,
  TimeoutError,
  type ClaudeClientOptions,

  // Gemini
  GeminiClient,
  GeminiAPIError,
  GeminiRateLimitError,
  GeminiTimeoutError,
  type GeminiClientOptions,

  // Claude CLI
  ClaudeCodeCLIClient,
  CLIError,
  CLINotFoundError,
  type ClaudeCodeCLIConfig,

  // Provider
  LLMProvider,
  type LLMProviderOptions,
  type ClaudeBackend,

  // Mock clients for testing
  MockClaudeClient,
  MockGeminiClient,
  type MockResponseConfig,

  // Types
  type Message,
  type MessageRole,
  type ToolCall,
  type ToolResult,
  type ToolDefinition,
  type ThinkingConfig,
  type ChatOptions,
  type LLMResponse,
  type StreamChunk,
  type StreamChunkType,
  type TokenUsage,
  type AgentUsageStats,
  type UsageStats,
  type ModelConfig,
  type ModelPricing,
  type JSONSchema,
  type Logger,
  type LLMClient,
  type FinishReason,

  // Constants
  DEFAULT_MODEL_CONFIGS,
  MODEL_PRICING,
} from './llm';

// ============================================================================
// Errors (Phase 16)
// ============================================================================

/**
 * Unified error classes for LLM backend failures.
 * These provide standardized, helpful error messages.
 */
export {
  // Base error
  LLMBackendError,
  // CLI errors
  CLINotFoundError as UnifiedCLINotFoundError,
  CLIAuthError,
  CLITimeoutError,
  // API errors
  APIKeyMissingError,
  // Embeddings errors
  LocalEmbeddingsError,
  // Common errors
  RateLimitError as UnifiedRateLimitError,
  BackendUnavailableError,
} from './errors/LLMBackendErrors';

// ============================================================================
// Types
// ============================================================================

/**
 * Core type definitions used throughout Nexus.
 */
export type { AgentType, AgentStatus, Agent } from './types/agent';
export type { Task, TaskStatus, TaskResult, TaskPriority } from './types/task';
