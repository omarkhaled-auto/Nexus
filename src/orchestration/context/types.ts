/**
 * Fresh Context Manager Types and Interfaces
 *
 * This module defines all TypeScript types for the Fresh Context Manager system,
 * which ensures agents receive clean, relevant context for each task.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * Philosophy: Agents work best with fresh, relevant context.
 * - No accumulated garbage from previous conversations
 * - Right amount of context for the task
 * - Token budget enforced
 */

// Import CodeSearchResult from Code Memory for integration
import type { CodeSearchResult } from '../../persistence/memory/code/types';

// Re-export for convenience
export type { CodeSearchResult };

// ============================================================================
// Core Task Types
// ============================================================================

/**
 * Specification for a task to be executed by an agent
 */
export interface TaskSpec {
  /** Unique identifier for the task */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of what needs to be done */
  description: string;
  /** Files that are the primary focus of this task */
  files: string[];
  /** How to test that the task is complete */
  testCriteria: string;
  /** Acceptance criteria as checklist items */
  acceptanceCriteria: string[];
  /** Task IDs that must be completed before this task */
  dependencies: string[];
  /** Estimated time to complete in minutes */
  estimatedTime: number;
}

// ============================================================================
// File Context Types
// ============================================================================

/**
 * Why a file was included in context
 */
export type FileIncludeReason =
  | 'task_file'       // Directly mentioned in task.files
  | 'dependency'      // Imported by a task file
  | 'test'            // Test file for a task file
  | 'type_definition' // Types/interfaces used by task files
  | 'related'         // Semantically related code
  | 'requested';      // Explicitly requested by caller

/**
 * File content with metadata for context building
 */
export interface FileContent {
  /** Full path to the file */
  path: string;
  /** File contents */
  content: string;
  /** Estimated token count for this file */
  tokenCount: number;
  /** How relevant this file is to the task (0.0 to 1.0) */
  relevanceScore: number;
  /** Why this file was included */
  includeReason: FileIncludeReason;
}

// ============================================================================
// Codebase Documentation Types
// ============================================================================

/**
 * Summary of codebase documentation relevant to a task
 */
export interface CodebaseDocsSummary {
  /** High-level overview of the architecture */
  architectureSummary: string;
  /** Patterns relevant to the task's files */
  relevantPatterns: string[];
  /** API signatures relevant to the task */
  relevantAPIs: string[];
  /** Total tokens used for this summary */
  tokenCount: number;
}

// ============================================================================
// Project Configuration Types
// ============================================================================

/**
 * Project configuration for context building
 * Note: This is a simplified version for context purposes.
 * See orchestration/types.ts for the full ProjectConfig used by coordinator.
 */
export interface ContextProjectConfig {
  /** Project name */
  name: string;
  /** Root path of the project */
  path: string;
  /** Primary language (e.g., 'typescript', 'python') */
  language: string;
  /** Framework in use (e.g., 'react', 'express') */
  framework?: string;
  /** Test framework (e.g., 'vitest', 'jest', 'pytest') */
  testFramework?: string;
}

// ============================================================================
// Memory Types
// ============================================================================

/**
 * A memory entry relevant to the task
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string;
  /** The memory content */
  content: string;
  /** How relevant this memory is to the task (0.0 to 1.0) */
  relevanceScore: number;
  /** Where this memory came from */
  source: string;
  /** Estimated token count */
  tokenCount: number;
}

// ============================================================================
// Context Options Types
// ============================================================================

/**
 * Options for configuring context building
 */
export interface ContextOptions {
  /** Maximum tokens for the entire context */
  maxTokens?: number;
  /** Include repository map in context */
  includeRepoMap?: boolean;
  /** Include codebase documentation summary */
  includeCodebaseDocs?: boolean;
  /** Maximum number of relevant files to include */
  maxRelevantFiles?: number;
  /** Maximum number of code search results */
  maxCodeResults?: number;
  /** Maximum number of memory entries */
  maxMemories?: number;
  /** Custom query for code search (if empty, uses task description) */
  codeSearchQuery?: string;
}

/**
 * Default context options
 */
export const DEFAULT_CONTEXT_OPTIONS: Required<ContextOptions> = {
  maxTokens: 150000,
  includeRepoMap: true,
  includeCodebaseDocs: true,
  maxRelevantFiles: 10,
  maxCodeResults: 5,
  maxMemories: 5,
  codeSearchQuery: '',
};

// ============================================================================
// Token Budget Types
// ============================================================================

/**
 * Breakdown of tokens by component
 */
export interface TokenBreakdown {
  /** System prompt tokens */
  systemPrompt: number;
  /** Repository map tokens */
  repoMap: number;
  /** Codebase documentation tokens */
  codebaseDocs: number;
  /** Task specification tokens */
  taskSpec: number;
  /** File content tokens */
  files: number;
  /** Code search result tokens */
  codeResults: number;
  /** Memory entry tokens */
  memories: number;
  /** Reserved tokens for response */
  reserved: number;
  /** Total tokens used */
  total: number;
}

/**
 * Token budget allocation
 */
export interface TokenBudget {
  /** Total token budget */
  total: number;
  /** Fixed allocations (must be present) */
  fixed: {
    /** System prompt allocation */
    systemPrompt: number;
    /** Repository map allocation */
    repoMap: number;
    /** Codebase docs allocation */
    codebaseDocs: number;
    /** Task spec allocation */
    taskSpec: number;
    /** Reserved for response */
    reserved: number;
  };
  /** Dynamic allocations (filled based on available space) */
  dynamic: {
    /** File content allocation */
    files: number;
    /** Code search results allocation */
    codeResults: number;
    /** Memory entries allocation */
    memories: number;
  };
}

/**
 * Content to be allocated into budget
 */
export interface ContextContent {
  /** System prompt text */
  systemPrompt: string;
  /** Repository map text */
  repoMap: string;
  /** Codebase documentation */
  codebaseDocs: CodebaseDocsSummary;
  /** Task specification */
  taskSpec: TaskSpec;
  /** File contents */
  files: FileContent[];
  /** Code search results */
  codeResults: CodeSearchResult[];
  /** Memory entries */
  memories: MemoryEntry[];
}

/**
 * Result of token allocation
 */
export interface TokenAllocation {
  /** Actual tokens used per component */
  breakdown: TokenBreakdown;
  /** Whether any content was truncated */
  truncated: boolean;
  /** Components that were truncated */
  truncatedComponents: string[];
  /** Human-readable allocation report */
  report: string;
}

// ============================================================================
// Context Validation Types
// ============================================================================

/**
 * Result of context validation
 */
export interface ContextValidation {
  /** Whether the context is valid (under budget) */
  valid: boolean;
  /** Total tokens in context */
  tokenCount: number;
  /** Maximum tokens allowed */
  maxTokens: number;
  /** Token breakdown by component */
  breakdown: TokenBreakdown;
  /** Warnings about the context */
  warnings: string[];
  /** Suggestions for optimization */
  suggestions: string[];
}

// ============================================================================
// Main Context Types
// ============================================================================

/**
 * Complete context for a task - the main output of FreshContextManager
 *
 * This is what gets provided to an agent before it starts work on a task.
 * The context is ALWAYS fresh - no accumulated conversation history.
 */
export interface TaskContext {
  // -------------------- Structural (same every task) --------------------

  /** Repository map showing project structure */
  repoMap: string;
  /** Summary of codebase documentation */
  codebaseDocs: CodebaseDocsSummary;
  /** Project configuration */
  projectConfig: ContextProjectConfig;

  // -------------------- Task-specific (fresh each time) --------------------

  /** The task specification */
  taskSpec: TaskSpec;
  /** Relevant file contents */
  relevantFiles: FileContent[];
  /** Relevant code from semantic search */
  relevantCode: CodeSearchResult[];
  /** Relevant memories */
  relevantMemories: MemoryEntry[];

  // -------------------- Always empty (fresh context) --------------------

  /**
   * Conversation history - ALWAYS empty for fresh context
   * Using never[] to enforce at type level that this is always empty
   */
  conversationHistory: never[];

  // -------------------- Metadata --------------------

  /** Total tokens in this context */
  tokenCount: number;
  /** Maximum tokens allowed */
  tokenBudget: number;
  /** When this context was generated */
  generatedAt: Date;
  /** Unique identifier for this context instance */
  contextId: string;
}

// ============================================================================
// Context Statistics Types
// ============================================================================

/**
 * Statistics about context usage
 */
export interface ContextStats {
  /** Number of contexts currently active */
  activeContexts: number;
  /** Total contexts created in session */
  totalCreated: number;
  /** Total contexts cleared in session */
  totalCleared: number;
  /** Average token usage */
  averageTokens: number;
  /** Peak token usage */
  peakTokens: number;
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Interface for the Fresh Context Manager
 */
export interface IFreshContextManager {
  /**
   * Build a fresh context for a task
   * This is the main method - creates a complete, fresh context.
   *
   * @param task Task specification
   * @param options Context building options
   * @returns Complete task context
   */
  buildFreshContext(task: TaskSpec, options?: ContextOptions): Promise<TaskContext>;

  /**
   * Clear context associated with an agent
   * Call when agent is done with its work.
   *
   * @param agentId Agent identifier
   */
  clearAgentContext(agentId: string): void;

  /**
   * Clear context for a specific task
   * Call when task is complete or failed.
   *
   * @param taskId Task identifier
   */
  clearTaskContext(taskId: string): void;

  /**
   * Validate a context against token budget
   *
   * @param context Context to validate
   * @returns Validation result with suggestions
   */
  validateContext(context: TaskContext): ContextValidation;

  /**
   * Estimate token count for text
   *
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokenCount(text: string): number;

  /**
   * Get all active contexts (for debugging)
   *
   * @returns Map of context IDs to contexts
   */
  getActiveContexts(): Map<string, TaskContext>;

  /**
   * Get statistics about context usage
   *
   * @returns Context statistics
   */
  getContextStats(): ContextStats;
}

/**
 * Interface for the Token Budgeter
 */
export interface ITokenBudgeter {
  /**
   * Create a token budget for a given total
   *
   * @param totalTokens Total tokens available
   * @returns Token budget with fixed and dynamic allocations
   */
  createBudget(totalTokens: number): TokenBudget;

  /**
   * Allocate content into the budget
   * May truncate content to fit.
   *
   * @param budget Token budget to use
   * @param content Content to allocate
   * @returns Allocation result
   */
  allocate(budget: TokenBudget, content: ContextContent): TokenAllocation;

  /**
   * Truncate content to fit within token limit
   *
   * @param content Content to truncate
   * @param maxTokens Maximum tokens allowed
   * @returns Truncated content
   */
  truncateToFit(content: string, maxTokens: number): string;

  /**
   * Estimate token count for text
   *
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;
}

/**
 * Interface for the Context Builder
 */
export interface IContextBuilder {
  /**
   * Build repository map context
   *
   * @param projectPath Path to the project
   * @param maxTokens Maximum tokens for repo map
   * @returns Formatted repo map string
   */
  buildRepoMapContext(projectPath: string, maxTokens: number): Promise<string>;

  /**
   * Build codebase documentation context
   *
   * @param projectPath Path to the project
   * @param taskSpec Task to build context for
   * @param maxTokens Maximum tokens for docs
   * @returns Codebase docs summary
   */
  buildCodebaseDocsContext(
    projectPath: string,
    taskSpec: TaskSpec,
    maxTokens: number
  ): Promise<CodebaseDocsSummary>;

  /**
   * Build file context for relevant files
   *
   * @param files File paths to include
   * @param maxTokens Maximum tokens for files
   * @returns File contents with metadata
   */
  buildFileContext(files: string[], maxTokens: number): Promise<FileContent[]>;

  /**
   * Build code context from semantic search
   *
   * @param query Search query
   * @param maxTokens Maximum tokens for results
   * @returns Code search results
   */
  buildCodeContext(query: string, maxTokens: number): Promise<CodeSearchResult[]>;

  /**
   * Build memory context for relevant memories
   *
   * @param taskSpec Task to find memories for
   * @param maxTokens Maximum tokens for memories
   * @returns Memory entries
   */
  buildMemoryContext(taskSpec: TaskSpec, maxTokens: number): Promise<MemoryEntry[]>;
}

// ============================================================================
// Agent Integration Types
// ============================================================================

/**
 * Mapping of agent ID to its current context
 */
export interface AgentContextMap {
  [agentId: string]: TaskContext | undefined;
}

/**
 * Mapping of task ID to its context
 */
export interface TaskContextMap {
  [taskId: string]: TaskContext | undefined;
}

/**
 * Result of preparing agent context
 */
export interface AgentContextResult {
  /** The prepared context */
  context: TaskContext;
  /** Agent ID the context is for */
  agentId: string;
  /** Task ID the context is for */
  taskId: string;
  /** Time taken to build context in ms */
  buildTimeMs: number;
}
