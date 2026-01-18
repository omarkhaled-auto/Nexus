/**
 * Fresh Context Manager - Builds clean, relevant context for agent tasks
 *
 * This module implements the core FreshContextManager that ensures agents
 * receive fresh, task-specific context without accumulated garbage from
 * previous conversations.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * Philosophy:
 * - Each task gets a completely fresh context
 * - No conversation history carried over
 * - Token budget strictly enforced
 * - Only relevant context included
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IFreshContextManager,
  ITokenBudgeter,
  IContextBuilder,
  TaskSpec,
  TaskContext,
  ContextOptions,
  ContextValidation,
  ContextStats,
  TokenBreakdown,
  ContextProjectConfig,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default context options (re-exported from types for convenience)
 */
const DEFAULTS: Required<ContextOptions> = {
  maxTokens: 150000,
  includeRepoMap: true,
  includeCodebaseDocs: true,
  maxRelevantFiles: 10,
  maxCodeResults: 5,
  maxMemories: 5,
  codeSearchQuery: '',
};

/**
 * Thresholds for context validation warnings
 */
const WARNING_THRESHOLDS = {
  /** Warn if any component uses more than this percentage of budget */
  componentPercentage: 0.40,
  /** Warn if total usage exceeds this percentage */
  totalPercentage: 0.95,
  /** Warn if files component is empty when task has files */
  emptyFiles: true,
} as const;

// ============================================================================
// FreshContextManager Implementation
// ============================================================================

/**
 * FreshContextManager - Builds and manages fresh context for agent tasks
 *
 * This is the main class for context management. It:
 * 1. Builds fresh context for each task (no conversation history)
 * 2. Manages token budget across context components
 * 3. Tracks active contexts for debugging
 * 4. Provides validation and statistics
 *
 * @example
 * ```typescript
 * const manager = new FreshContextManager(budgeter, builder, config);
 *
 * // Build fresh context for a task
 * const context = await manager.buildFreshContext(taskSpec);
 *
 * // Context is always fresh - no conversation history
 * console.log(context.conversationHistory.length); // 0
 *
 * // Clear context when task completes
 * await manager.clearTaskContext(taskSpec.id);
 * ```
 */
export class FreshContextManager implements IFreshContextManager {
  /**
   * Token budgeter for managing allocations
   */
  private readonly budgeter: ITokenBudgeter;

  /**
   * Context builder for assembling context components
   */
  private readonly builder: IContextBuilder;

  /**
   * Project configuration
   */
  private readonly projectConfig: ContextProjectConfig;

  /**
   * Active contexts indexed by context ID
   */
  private readonly activeContexts: Map<string, TaskContext>;

  /**
   * Mapping from task ID to context ID
   */
  private readonly taskToContext: Map<string, string>;

  /**
   * Mapping from agent ID to context ID
   */
  private readonly agentToContext: Map<string, string>;

  /**
   * Statistics tracking
   */
  private stats: {
    totalCreated: number;
    totalCleared: number;
    peakTokens: number;
    tokenHistory: number[];
  };

  /**
   * Create a new FreshContextManager
   *
   * @param budgeter Token budgeter for managing allocations
   * @param builder Context builder for assembling components
   * @param projectConfig Project configuration
   */
  constructor(
    budgeter: ITokenBudgeter,
    builder: IContextBuilder,
    projectConfig: ContextProjectConfig
  ) {
    this.budgeter = budgeter;
    this.builder = builder;
    this.projectConfig = projectConfig;
    this.activeContexts = new Map();
    this.taskToContext = new Map();
    this.agentToContext = new Map();
    this.stats = {
      totalCreated: 0,
      totalCleared: 0,
      peakTokens: 0,
      tokenHistory: [],
    };
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Build a fresh context for a task
   *
   * This is the MAIN METHOD of the Fresh Context Manager.
   * It creates a completely fresh context with:
   * - Repo map (if enabled)
   * - Codebase documentation summary
   * - Task-specific file contents
   * - Relevant code from semantic search
   * - Relevant memories
   * - ALWAYS empty conversation history
   *
   * @param task Task specification
   * @param options Context building options
   * @returns Complete task context
   */
  async buildFreshContext(
    task: TaskSpec,
    options?: ContextOptions
  ): Promise<TaskContext> {
    // Merge options with defaults
    const opts: Required<ContextOptions> = {
      ...DEFAULTS,
      ...options,
    };

    // Create token budget
    const budget = this.budgeter.createBudget(opts.maxTokens);

    // Clear any existing context for this task
    this.clearTaskContext(task.id);

    // Generate unique context ID
    const contextId = uuidv4();

    // Build each context component within budget
    const [repoMap, codebaseDocs, relevantFiles, relevantCode, relevantMemories] =
      await Promise.all([
        opts.includeRepoMap
          ? this.builder.buildRepoMapContext(
              this.projectConfig.path,
              budget.fixed.repoMap
            )
          : Promise.resolve(''),
        opts.includeCodebaseDocs
          ? this.builder.buildCodebaseDocsContext(
              this.projectConfig.path,
              task,
              budget.fixed.codebaseDocs
            )
          : Promise.resolve({
              architectureSummary: '',
              relevantPatterns: [],
              relevantAPIs: [],
              tokenCount: 0,
            }),
        this.builder.buildFileContext(
          task.files.slice(0, opts.maxRelevantFiles),
          budget.dynamic.files
        ),
        this.builder.buildCodeContext(
          opts.codeSearchQuery || task.description,
          budget.dynamic.codeResults
        ),
        this.builder.buildMemoryContext(task, budget.dynamic.memories),
      ]);

    // Calculate total tokens used
    const tokenCount = this.calculateTotalTokens(
      repoMap,
      codebaseDocs,
      task,
      relevantFiles,
      relevantCode,
      relevantMemories
    );

    // Assemble the TaskContext
    const context: TaskContext = {
      // Structural components
      repoMap,
      codebaseDocs,
      projectConfig: this.projectConfig,

      // Task-specific components
      taskSpec: task,
      relevantFiles,
      relevantCode,
      relevantMemories,

      // ALWAYS empty - fresh context means no conversation history
      conversationHistory: [] as never[],

      // Metadata
      tokenCount,
      tokenBudget: opts.maxTokens,
      generatedAt: new Date(),
      contextId,
    };

    // Store context reference
    this.activeContexts.set(contextId, context);
    this.taskToContext.set(task.id, contextId);

    // Update statistics
    this.stats.totalCreated++;
    this.stats.tokenHistory.push(tokenCount);
    if (tokenCount > this.stats.peakTokens) {
      this.stats.peakTokens = tokenCount;
    }

    return context;
  }

  /**
   * Clear context associated with an agent
   *
   * Call this when an agent is done with its work to free up memory.
   *
   * @param agentId Agent identifier
   */
  clearAgentContext(agentId: string): void {
    const contextId = this.agentToContext.get(agentId);
    if (contextId) {
      this.activeContexts.delete(contextId);
      this.agentToContext.delete(agentId);
      this.stats.totalCleared++;
    }
  }

  /**
   * Clear context for a specific task
   *
   * Call this when a task is complete or failed.
   *
   * @param taskId Task identifier
   */
  clearTaskContext(taskId: string): void {
    const contextId = this.taskToContext.get(taskId);
    if (contextId) {
      this.activeContexts.delete(contextId);
      this.taskToContext.delete(taskId);
      this.stats.totalCleared++;
    }
  }

  /**
   * Validate a context against token budget
   *
   * Checks:
   * - Total tokens vs budget
   * - Component allocations
   * - Generates warnings for potential issues
   * - Suggests optimizations
   *
   * @param context Context to validate
   * @returns Validation result with suggestions
   */
  validateContext(context: TaskContext): ContextValidation {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Calculate breakdown
    const breakdown = this.createBreakdown(context);

    // Check total tokens
    const valid = breakdown.total <= context.tokenBudget;

    if (!valid) {
      warnings.push(
        `Context exceeds budget: ${breakdown.total} > ${context.tokenBudget} tokens`
      );
      suggestions.push('Reduce maxRelevantFiles or maxCodeResults options');
    }

    // Check for high usage
    if (breakdown.total > context.tokenBudget * WARNING_THRESHOLDS.totalPercentage) {
      warnings.push(
        `Context usage is high: ${((breakdown.total / context.tokenBudget) * 100).toFixed(1)}%`
      );
    }

    // Check individual components
    this.checkComponentUsage(
      'repoMap',
      breakdown.repoMap,
      context.tokenBudget,
      warnings,
      suggestions
    );
    this.checkComponentUsage(
      'files',
      breakdown.files,
      context.tokenBudget,
      warnings,
      suggestions
    );
    this.checkComponentUsage(
      'codeResults',
      breakdown.codeResults,
      context.tokenBudget,
      warnings,
      suggestions
    );

    // Check for empty files when task has files
    if (
      context.taskSpec.files.length > 0 &&
      context.relevantFiles.length === 0
    ) {
      warnings.push('Task specifies files but none were included in context');
      suggestions.push('Check that task files exist and are readable');
    }

    return {
      valid,
      tokenCount: breakdown.total,
      maxTokens: context.tokenBudget,
      breakdown,
      warnings,
      suggestions,
    };
  }

  /**
   * Estimate token count for text
   *
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokenCount(text: string): number {
    return this.budgeter.estimateTokens(text);
  }

  /**
   * Get all active contexts
   *
   * Useful for debugging and monitoring.
   *
   * @returns Map of context IDs to contexts
   */
  getActiveContexts(): Map<string, TaskContext> {
    return new Map(this.activeContexts);
  }

  /**
   * Get statistics about context usage
   *
   * @returns Context statistics
   */
  getContextStats(): ContextStats {
    const tokenHistory = this.stats.tokenHistory;
    const averageTokens =
      tokenHistory.length > 0
        ? tokenHistory.reduce((a, b) => a + b, 0) / tokenHistory.length
        : 0;

    return {
      activeContexts: this.activeContexts.size,
      totalCreated: this.stats.totalCreated,
      totalCleared: this.stats.totalCleared,
      averageTokens: Math.round(averageTokens),
      peakTokens: this.stats.peakTokens,
    };
  }

  /**
   * Associate an agent with a context
   *
   * Used by AgentContextIntegration to track which agent has which context.
   *
   * @param agentId Agent identifier
   * @param contextId Context identifier
   */
  associateAgentWithContext(agentId: string, contextId: string): void {
    this.agentToContext.set(agentId, contextId);
  }

  /**
   * Get context for an agent
   *
   * @param agentId Agent identifier
   * @returns Context or undefined if none
   */
  getContextForAgent(agentId: string): TaskContext | undefined {
    const contextId = this.agentToContext.get(agentId);
    if (contextId) {
      return this.activeContexts.get(contextId);
    }
    return undefined;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Calculate total tokens used in context
   */
  private calculateTotalTokens(
    repoMap: string,
    codebaseDocs: TaskContext['codebaseDocs'],
    task: TaskSpec,
    relevantFiles: TaskContext['relevantFiles'],
    relevantCode: TaskContext['relevantCode'],
    relevantMemories: TaskContext['relevantMemories']
  ): number {
    let total = 0;

    // Repo map
    total += this.budgeter.estimateTokens(repoMap);

    // Codebase docs
    total +=
      codebaseDocs.tokenCount ||
      this.budgeter.estimateTokens(codebaseDocs.architectureSummary);

    // Task spec (approximate)
    total += this.budgeter.estimateTokens(
      JSON.stringify(task)
    );

    // Files
    for (const file of relevantFiles) {
      total += file.tokenCount || this.budgeter.estimateTokens(file.content);
    }

    // Code results
    for (const result of relevantCode) {
      total += this.budgeter.estimateTokens(result.chunk.content);
    }

    // Memories
    for (const memory of relevantMemories) {
      total += memory.tokenCount || this.budgeter.estimateTokens(memory.content);
    }

    return total;
  }

  /**
   * Create token breakdown from context
   */
  private createBreakdown(context: TaskContext): TokenBreakdown {
    const repoMap = this.budgeter.estimateTokens(context.repoMap);
    const codebaseDocs =
      context.codebaseDocs.tokenCount ||
      this.budgeter.estimateTokens(context.codebaseDocs.architectureSummary);
    const taskSpec = this.budgeter.estimateTokens(JSON.stringify(context.taskSpec));

    let files = 0;
    for (const file of context.relevantFiles) {
      files += file.tokenCount || this.budgeter.estimateTokens(file.content);
    }

    let codeResults = 0;
    for (const result of context.relevantCode) {
      codeResults += this.budgeter.estimateTokens(result.chunk.content);
    }

    let memories = 0;
    for (const memory of context.relevantMemories) {
      memories +=
        memory.tokenCount || this.budgeter.estimateTokens(memory.content);
    }

    const total =
      repoMap + codebaseDocs + taskSpec + files + codeResults + memories;

    return {
      systemPrompt: 0, // Not tracked in context
      repoMap,
      codebaseDocs,
      taskSpec,
      files,
      codeResults,
      memories,
      reserved: 0, // Not tracked in context
      total,
    };
  }

  /**
   * Check component usage and add warnings/suggestions
   */
  private checkComponentUsage(
    componentName: string,
    tokenCount: number,
    totalBudget: number,
    warnings: string[],
    suggestions: string[]
  ): void {
    const percentage = tokenCount / totalBudget;
    if (percentage > WARNING_THRESHOLDS.componentPercentage) {
      warnings.push(
        `${componentName} uses ${(percentage * 100).toFixed(1)}% of total budget`
      );
      suggestions.push(`Consider reducing ${componentName} size`);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a FreshContextManager with dependencies
 *
 * @param budgeter Token budgeter
 * @param builder Context builder
 * @param projectConfig Project configuration
 * @returns Configured FreshContextManager
 */
export function createFreshContextManager(
  budgeter: ITokenBudgeter,
  builder: IContextBuilder,
  projectConfig: ContextProjectConfig
): FreshContextManager {
  return new FreshContextManager(budgeter, builder, projectConfig);
}

/**
 * Options for creating a test FreshContextManager
 */
export interface TestFreshContextManagerOptions {
  budgeter?: ITokenBudgeter;
  builder?: IContextBuilder;
  projectConfig?: Partial<ContextProjectConfig>;
}

/**
 * Create a FreshContextManager for testing with mock dependencies
 *
 * @param options Optional test configuration
 * @returns Configured FreshContextManager with mock dependencies
 */
export function createTestFreshContextManager(
  options: TestFreshContextManagerOptions = {}
): FreshContextManager {
  // Create mock budgeter
  const mockBudgeter: ITokenBudgeter =
    options.budgeter ?? {
      createBudget: (totalTokens: number) => ({
        total: totalTokens,
        fixed: {
          systemPrompt: 2000,
          repoMap: 2000,
          codebaseDocs: 3000,
          taskSpec: 1000,
          reserved: 16000,
        },
        dynamic: {
          files: Math.floor((totalTokens - 24000) * 0.6),
          codeResults: Math.floor((totalTokens - 24000) * 0.25),
          memories: Math.floor((totalTokens - 24000) * 0.15),
        },
      }),
      allocate: () => ({
        breakdown: {
          systemPrompt: 0,
          repoMap: 0,
          codebaseDocs: 0,
          taskSpec: 0,
          files: 0,
          codeResults: 0,
          memories: 0,
          reserved: 0,
          total: 0,
        },
        truncated: false,
        truncatedComponents: [],
        report: '',
      }),
      truncateToFit: (content: string) => content,
      estimateTokens: (text: string) => Math.ceil((text.length) / 4),
    };

  // Create mock builder
  const mockBuilder: IContextBuilder =
    options.builder ?? {
      buildRepoMapContext: () => Promise.resolve('mock repo map'),
      buildCodebaseDocsContext: () => Promise.resolve({
        architectureSummary: 'mock summary',
        relevantPatterns: [],
        relevantAPIs: [],
        tokenCount: 100,
      }),
      buildFileContext: () => Promise.resolve([]),
      buildCodeContext: () => Promise.resolve([]),
      buildMemoryContext: () => Promise.resolve([]),
    };

  // Create project config
  const projectConfig: ContextProjectConfig = {
    name: 'test-project',
    path: '/test/path',
    language: 'typescript',
    framework: 'vitest',
    testFramework: 'vitest',
    ...options.projectConfig,
  };

  return new FreshContextManager(mockBudgeter, mockBuilder, projectConfig);
}
