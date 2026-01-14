// Agent Types and Interfaces for Nexus
// Phase 03-02: Agent Execution Framework

import type { LLMClient, TokenUsage, ToolDefinition, ToolResult, Message } from '@/llm';

/**
 * Agent types in the system
 */
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

/**
 * Agent execution states
 */
export type AgentState = 'idle' | 'running' | 'waiting_tool' | 'completed' | 'failed';

/**
 * Task definition for agent execution
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Human-readable task name */
  name: string;
  /** Detailed task description */
  description: string;
  /** Target files for the task */
  files: string[];
  /** Optional test command to run */
  test?: string;
  /** Optional isolated worktree path */
  worktree?: string;
}

/**
 * Result from agent execution
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Files that were changed during execution */
  filesChanged: string[];
  /** Output from the agent */
  output: string;
  /** Error message if execution failed */
  error?: string;
  /** Number of LLM iterations performed */
  iterations: number;
  /** Token usage statistics */
  tokenUsage: TokenUsage;
}

/**
 * Tool executor interface for agent tool calls
 */
export interface ToolExecutor {
  /**
   * Execute a tool by name with given parameters
   */
  execute(name: string, params: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Get list of available tools
   */
  getAvailableTools(): ToolDefinition[];
}

/**
 * Agent context containing dependencies for execution
 */
export interface AgentContext {
  /** Task to execute */
  task: Task;
  /** LLM client for AI interactions */
  llmClient: LLMClient;
  /** Tool executor for tool calls */
  tools: ToolExecutor;
  /** Optional logger */
  logger?: Logger;
  /** Maximum iterations before failing (default: 10) */
  maxIterations: number;
}

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Command execution result from run_command tool
 */
export interface CommandResult {
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Whether the command was killed */
  killed: boolean;
}

/**
 * Search result from search_code tool
 */
export interface SearchResult {
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Matched content */
  content: string;
  /** Context around the match */
  context?: string;
}

/**
 * Edit operation for edit_file tool
 */
export interface Edit {
  /** Line number to start edit */
  startLine: number;
  /** Line number to end edit (exclusive) */
  endLine: number;
  /** New content to replace the range */
  newContent: string;
}

/**
 * Merge result from git_merge tool
 */
export interface GitMergeResult {
  /** Whether merge was successful */
  success: boolean;
  /** Merge commit hash if created */
  mergeCommit?: string;
  /** Files with conflicts if any */
  conflicts?: string[];
}

/**
 * Git status information
 */
export interface GitStatusInfo {
  /** Current branch name */
  current: string;
  /** Remote tracking branch */
  tracking?: string;
  /** Staged files */
  staged: string[];
  /** Modified (unstaged) files */
  modified: string[];
  /** Untracked files */
  untracked: string[];
  /** Files with merge conflicts */
  conflicted: string[];
}

// ============================================================================
// Review Types (for ReviewerRunner)
// ============================================================================

/**
 * Issue severity levels
 */
export type IssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * Individual review issue
 */
export interface ReviewIssue {
  /** Issue severity */
  severity: IssueSeverity;
  /** File containing the issue */
  file: string;
  /** Line number (optional) */
  line?: number;
  /** Issue description */
  message: string;
  /** Suggested fix (optional) */
  suggestion?: string;
}

/**
 * Complete review result
 */
export interface ReviewResult {
  /** Whether the code is approved */
  approved: boolean;
  /** List of issues found */
  issues: ReviewIssue[];
  /** Summary of the review */
  summary: string;
}

// ============================================================================
// Re-export types from LLM module for convenience
// ============================================================================

export type { LLMClient, TokenUsage, ToolDefinition, ToolResult, Message };
