/**
 * Execution Layer Module - Public Exports
 *
 * This module provides all exports for the Execution Layer (Layer 4),
 * which handles agent execution, iteration, and tool management.
 *
 * Layer 4: Execution
 *
 * @module execution
 *
 * Key Components:
 * - **Iteration**: Ralph-style persistent iteration with git diffs
 * - **Tools**: Agent tools for context requests and other capabilities
 * - **Agents**: Agent execution and prompt loading
 *
 * @example
 * ```typescript
 * import {
 *   // Iteration
 *   RalphStyleIterator,
 *   createFullRalphStyleIterator,
 *   GitDiffContextBuilder,
 *   ErrorContextAggregator,
 *
 *   // Tools
 *   createRequestContextTool,
 *   REQUEST_CONTEXT_TOOL_DEFINITION,
 * } from './execution';
 *
 * // Create an iterator for persistent execution
 * const iterator = createFullRalphStyleIterator({
 *   projectPath: '/path/to/project',
 *   contextManager: manager,
 *   qaRunner: { build, lint, test },
 * });
 *
 * // Execute task with iteration
 * const result = await iterator.execute(task, { maxIterations: 10 });
 * ```
 */

// ============================================================================
// Iteration Submodule Exports
// ============================================================================

/**
 * Ralph-Style Iterator - persistent iteration with git diffs
 * for showing agents their previous work.
 *
 * @see ./iteration/README.md for detailed documentation
 */
export * from './iteration';

// ============================================================================
// Tools Submodule Exports
// ============================================================================

/**
 * Request Context Tool - allows agents to request additional context
 * during task execution.
 */
export {
  // Tool definition
  REQUEST_CONTEXT_TOOL_DEFINITION,

  // Handler class
  RequestContextToolHandler,

  // Factory functions
  createRequestContextTool,

  // Types
  type ToolDefinition,
  type ToolParameterSchema,
  type PropertySchema,
  type ToolExecutionResult,
  type RequestContextParams,
  type RequestContextToolConfig,
} from './tools/RequestContextTool';

// ============================================================================
// Agents Submodule Exports
// ============================================================================

/**
 * Prompt Loader - loads and manages agent prompts
 */
export { PromptLoader } from './agents/PromptLoader';
