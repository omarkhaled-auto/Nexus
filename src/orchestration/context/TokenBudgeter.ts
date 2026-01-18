/**
 * Token Budgeter - Smart token allocation across context components
 *
 * This module manages token budget allocation for Fresh Context Manager,
 * ensuring context fits within model limits while prioritizing important content.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * Token Estimation Strategy:
 * - Uses character-to-token ratio of ~4 chars per token (industry standard estimate)
 * - Actual tokenization varies by model, but this provides consistent estimation
 *
 * Budget Allocation Strategy:
 * - Fixed allocations for essential components (system prompt, repo map, etc.)
 * - Dynamic allocations for variable content (files, code, memories)
 * - Dynamic split: 60% files, 25% code results, 15% memories
 */

import type {
  ITokenBudgeter,
  TokenBudget,
  ContextContent,
  TokenAllocation,
  TokenBreakdown,
  FileContent,
  MemoryEntry,
} from './types';
import type { CodeSearchResult } from '../../persistence/memory/code/types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Average characters per token
 * Industry standard estimate, works well for most LLMs
 */
const CHARS_PER_TOKEN = 4;

/**
 * Default fixed budget allocations (in tokens)
 */
const DEFAULT_FIXED_BUDGET = {
  systemPrompt: 2000,
  repoMap: 2000,
  codebaseDocs: 3000,
  taskSpec: 1000,
  reserved: 16000, // Reserved for model response
} as const;

/**
 * Type for custom fixed budget input (accepts regular numbers)
 */
export type FixedBudgetInput = Partial<{
  systemPrompt: number;
  repoMap: number;
  codebaseDocs: number;
  taskSpec: number;
  reserved: number;
}>;

/**
 * Dynamic budget allocation ratios
 * Sum must equal 1.0
 */
const DYNAMIC_ALLOCATION_RATIOS = {
  files: 0.60,      // 60% for file content
  codeResults: 0.25, // 25% for code search results
  memories: 0.15,    // 15% for memory entries
} as const;

/**
 * Truncation indicator suffix
 */
const TRUNCATION_INDICATOR = '\n\n... [truncated to fit token budget]';

// ============================================================================
// TokenBudgeter Implementation
// ============================================================================

/**
 * TokenBudgeter - Manages token budget allocation for context building
 *
 * Responsibilities:
 * - Create budgets with fixed and dynamic allocations
 * - Allocate content into budget, truncating as needed
 * - Estimate token counts from text
 * - Generate allocation reports for debugging
 *
 * @example
 * ```typescript
 * const budgeter = new TokenBudgeter();
 *
 * // Create budget for 150k context window
 * const budget = budgeter.createBudget(150000);
 *
 * // Allocate content
 * const allocation = budgeter.allocate(budget, {
 *   systemPrompt: 'You are a helpful assistant...',
 *   repoMap: 'src/...',
 *   // ... other content
 * });
 *
 * console.log(allocation.report);
 * ```
 */
export class TokenBudgeter implements ITokenBudgeter {
  /**
   * Configuration for fixed budget allocations
   */
  private readonly fixedBudget: {
    systemPrompt: number;
    repoMap: number;
    codebaseDocs: number;
    taskSpec: number;
    reserved: number;
  };

  /**
   * Create a new TokenBudgeter
   *
   * @param customFixedBudget Optional custom fixed budget allocations
   */
  constructor(customFixedBudget?: FixedBudgetInput) {
    this.fixedBudget = {
      ...DEFAULT_FIXED_BUDGET,
      ...customFixedBudget,
    };
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Create a token budget for a given total
   *
   * Calculates fixed allocations and distributes remaining tokens
   * to dynamic content using predefined ratios.
   *
   * @param totalTokens Total tokens available
   * @returns Token budget with fixed and dynamic allocations
   */
  createBudget(totalTokens: number): TokenBudget {
    // Calculate total fixed allocation
    const totalFixed =
      this.fixedBudget.systemPrompt +
      this.fixedBudget.repoMap +
      this.fixedBudget.codebaseDocs +
      this.fixedBudget.taskSpec +
      this.fixedBudget.reserved;

    // Calculate remaining for dynamic content
    const dynamicBudget = Math.max(0, totalTokens - totalFixed);

    // Allocate dynamic budget using ratios
    return {
      total: totalTokens,
      fixed: {
        systemPrompt: this.fixedBudget.systemPrompt,
        repoMap: this.fixedBudget.repoMap,
        codebaseDocs: this.fixedBudget.codebaseDocs,
        taskSpec: this.fixedBudget.taskSpec,
        reserved: this.fixedBudget.reserved,
      },
      dynamic: {
        files: Math.floor(dynamicBudget * DYNAMIC_ALLOCATION_RATIOS.files),
        codeResults: Math.floor(dynamicBudget * DYNAMIC_ALLOCATION_RATIOS.codeResults),
        memories: Math.floor(dynamicBudget * DYNAMIC_ALLOCATION_RATIOS.memories),
      },
    };
  }

  /**
   * Allocate content into the budget
   *
   * Fits content into allocated budget, truncating lower-priority
   * components if necessary. Priority order:
   * 1. System prompt
   * 2. Task spec
   * 3. Task files
   * 4. Repo map
   * 5. Codebase docs
   * 6. Code results
   * 7. Memories
   *
   * @param budget Token budget to use
   * @param content Content to allocate
   * @returns Allocation result with breakdown and report
   */
  allocate(budget: TokenBudget, content: ContextContent): TokenAllocation {
    const truncatedComponents: string[] = [];

    // Allocate fixed components
    const systemPromptTokens = this.allocateComponent(
      content.systemPrompt,
      budget.fixed.systemPrompt,
      'systemPrompt',
      truncatedComponents
    );

    const taskSpecTokens = this.allocateComponent(
      this.taskSpecToString(content.taskSpec),
      budget.fixed.taskSpec,
      'taskSpec',
      truncatedComponents
    );

    const repoMapTokens = this.allocateComponent(
      content.repoMap,
      budget.fixed.repoMap,
      'repoMap',
      truncatedComponents
    );

    const codebaseDocsTokens = this.allocateComponent(
      this.codebaseDocsToString(content.codebaseDocs),
      budget.fixed.codebaseDocs,
      'codebaseDocs',
      truncatedComponents
    );

    // Allocate dynamic components
    const filesTokens = this.allocateFiles(
      content.files,
      budget.dynamic.files,
      truncatedComponents
    );

    const codeResultsTokens = this.allocateCodeResults(
      content.codeResults,
      budget.dynamic.codeResults,
      truncatedComponents
    );

    const memoriesTokens = this.allocateMemories(
      content.memories,
      budget.dynamic.memories,
      truncatedComponents
    );

    // Build breakdown
    const breakdown: TokenBreakdown = {
      systemPrompt: systemPromptTokens,
      repoMap: repoMapTokens,
      codebaseDocs: codebaseDocsTokens,
      taskSpec: taskSpecTokens,
      files: filesTokens,
      codeResults: codeResultsTokens,
      memories: memoriesTokens,
      reserved: budget.fixed.reserved,
      total:
        systemPromptTokens +
        repoMapTokens +
        codebaseDocsTokens +
        taskSpecTokens +
        filesTokens +
        codeResultsTokens +
        memoriesTokens +
        budget.fixed.reserved,
    };

    return {
      breakdown,
      truncated: truncatedComponents.length > 0,
      truncatedComponents,
      report: this.createAllocationReport(budget, breakdown, truncatedComponents),
    };
  }

  /**
   * Truncate content to fit within token limit
   *
   * Attempts to truncate at natural boundaries (line, sentence, word).
   *
   * @param content Content to truncate
   * @param maxTokens Maximum tokens allowed
   * @returns Truncated content
   */
  truncateToFit(content: string, maxTokens: number): string {
    const currentTokens = this.estimateTokens(content);

    if (currentTokens <= maxTokens) {
      return content;
    }

    // Calculate target character count (leave room for truncation indicator)
    const indicatorTokens = this.estimateTokens(TRUNCATION_INDICATOR);
    const targetTokens = maxTokens - indicatorTokens;
    const targetChars = targetTokens * CHARS_PER_TOKEN;

    // Truncate at boundary
    const truncated = this.truncateAtBoundary(content, targetChars);

    return truncated + TRUNCATION_INDICATOR;
  }

  /**
   * Estimate token count for text
   *
   * Uses character-to-token ratio for estimation.
   * This is a heuristic; actual tokenization depends on model.
   *
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Allocate a single component within budget
   *
   * @param content Component content
   * @param maxTokens Maximum tokens for this component
   * @param componentName Name for tracking truncations
   * @param truncatedComponents Array to record truncations
   * @returns Actual tokens used
   */
  private allocateComponent(
    content: string,
    maxTokens: number,
    componentName: string,
    truncatedComponents: string[]
  ): number {
    const tokens = this.estimateTokens(content);

    if (tokens > maxTokens) {
      truncatedComponents.push(componentName);
      return maxTokens;
    }

    return tokens;
  }

  /**
   * Allocate file content within budget
   *
   * Files are sorted by relevance and included in order until budget exhausted.
   *
   * @param files Files to allocate
   * @param maxTokens Maximum tokens for files
   * @param truncatedComponents Array to record truncations
   * @returns Actual tokens used
   */
  private allocateFiles(
    files: FileContent[],
    maxTokens: number,
    truncatedComponents: string[]
  ): number {
    if (!files.length) return 0;

    // Sort by relevance (highest first)
    const sorted = [...files].sort((a, b) => b.relevanceScore - a.relevanceScore);

    let usedTokens = 0;
    let includedCount = 0;

    for (const file of sorted) {
      const fileTokens = file.tokenCount || this.estimateTokens(file.content);

      if (usedTokens + fileTokens <= maxTokens) {
        usedTokens += fileTokens;
        includedCount++;
      } else if (includedCount < files.length) {
        // Some files won't fit
        truncatedComponents.push(`files (${files.length - includedCount} excluded)`);
        break;
      }
    }

    return usedTokens;
  }

  /**
   * Allocate code search results within budget
   *
   * Results are sorted by score and included in order.
   *
   * @param results Code results to allocate
   * @param maxTokens Maximum tokens for code results
   * @param truncatedComponents Array to record truncations
   * @returns Actual tokens used
   */
  private allocateCodeResults(
    results: CodeSearchResult[],
    maxTokens: number,
    truncatedComponents: string[]
  ): number {
    if (!results.length) return 0;

    // Sort by score (highest first)
    const sorted = [...results].sort((a, b) => b.score - a.score);

    let usedTokens = 0;
    let includedCount = 0;

    for (const result of sorted) {
      const resultTokens = this.estimateTokens(result.chunk.content);

      if (usedTokens + resultTokens <= maxTokens) {
        usedTokens += resultTokens;
        includedCount++;
      } else if (includedCount < results.length) {
        truncatedComponents.push(`codeResults (${results.length - includedCount} excluded)`);
        break;
      }
    }

    return usedTokens;
  }

  /**
   * Allocate memory entries within budget
   *
   * @param memories Memories to allocate
   * @param maxTokens Maximum tokens for memories
   * @param truncatedComponents Array to record truncations
   * @returns Actual tokens used
   */
  private allocateMemories(
    memories: MemoryEntry[],
    maxTokens: number,
    truncatedComponents: string[]
  ): number {
    if (!memories.length) return 0;

    // Sort by relevance (highest first)
    const sorted = [...memories].sort((a, b) => b.relevanceScore - a.relevanceScore);

    let usedTokens = 0;
    let includedCount = 0;

    for (const memory of sorted) {
      const memoryTokens = memory.tokenCount || this.estimateTokens(memory.content);

      if (usedTokens + memoryTokens <= maxTokens) {
        usedTokens += memoryTokens;
        includedCount++;
      } else if (includedCount < memories.length) {
        truncatedComponents.push(`memories (${memories.length - includedCount} excluded)`);
        break;
      }
    }

    return usedTokens;
  }

  /**
   * Truncate text at a natural boundary
   *
   * Tries to find a good break point (newline, period, space).
   *
   * @param text Text to truncate
   * @param maxChars Maximum characters
   * @returns Truncated text
   */
  private truncateAtBoundary(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    // Start at max chars and look backwards for a good boundary
    const searchRegion = text.slice(0, maxChars);

    // Try to find last newline
    const lastNewline = searchRegion.lastIndexOf('\n');
    if (lastNewline > maxChars * 0.7) {
      return text.slice(0, lastNewline);
    }

    // Try to find last period/semicolon
    const lastPunctuation = Math.max(
      searchRegion.lastIndexOf('. '),
      searchRegion.lastIndexOf(';\n'),
      searchRegion.lastIndexOf('}\n')
    );
    if (lastPunctuation > maxChars * 0.7) {
      return text.slice(0, lastPunctuation + 1);
    }

    // Try to find last space
    const lastSpace = searchRegion.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.7) {
      return text.slice(0, lastSpace);
    }

    // Fall back to hard cut
    return text.slice(0, maxChars);
  }

  /**
   * Convert TaskSpec to string for token estimation
   */
  private taskSpecToString(taskSpec: ContextContent['taskSpec']): string {
    return [
      `Task: ${taskSpec.name}`,
      `Description: ${taskSpec.description}`,
      `Files: ${taskSpec.files.join(', ')}`,
      `Test Criteria: ${taskSpec.testCriteria}`,
      `Acceptance Criteria:`,
      ...taskSpec.acceptanceCriteria.map((c) => `  - ${c}`),
      `Dependencies: ${taskSpec.dependencies.join(', ')}`,
      `Estimated Time: ${taskSpec.estimatedTime} minutes`,
    ].join('\n');
  }

  /**
   * Convert CodebaseDocsSummary to string for token estimation
   */
  private codebaseDocsToString(docs: ContextContent['codebaseDocs']): string {
    return [
      docs.architectureSummary,
      '',
      'Relevant Patterns:',
      ...docs.relevantPatterns.map((p) => `  - ${p}`),
      '',
      'Relevant APIs:',
      ...docs.relevantAPIs.map((a) => `  - ${a}`),
    ].join('\n');
  }

  /**
   * Create human-readable allocation report
   */
  private createAllocationReport(
    budget: TokenBudget,
    breakdown: TokenBreakdown,
    truncatedComponents: string[]
  ): string {
    const lines: string[] = [
      '=== Token Allocation Report ===',
      '',
      `Total Budget: ${budget.total.toLocaleString()} tokens`,
      `Total Used: ${breakdown.total.toLocaleString()} tokens (${this.formatPercent(breakdown.total, budget.total)})`,
      '',
      'Fixed Allocations:',
      `  System Prompt: ${breakdown.systemPrompt.toLocaleString()} / ${budget.fixed.systemPrompt.toLocaleString()} (${this.formatPercent(breakdown.systemPrompt, budget.fixed.systemPrompt)})`,
      `  Repo Map:      ${breakdown.repoMap.toLocaleString()} / ${budget.fixed.repoMap.toLocaleString()} (${this.formatPercent(breakdown.repoMap, budget.fixed.repoMap)})`,
      `  Codebase Docs: ${breakdown.codebaseDocs.toLocaleString()} / ${budget.fixed.codebaseDocs.toLocaleString()} (${this.formatPercent(breakdown.codebaseDocs, budget.fixed.codebaseDocs)})`,
      `  Task Spec:     ${breakdown.taskSpec.toLocaleString()} / ${budget.fixed.taskSpec.toLocaleString()} (${this.formatPercent(breakdown.taskSpec, budget.fixed.taskSpec)})`,
      `  Reserved:      ${breakdown.reserved.toLocaleString()} / ${budget.fixed.reserved.toLocaleString()} (${this.formatPercent(breakdown.reserved, budget.fixed.reserved)})`,
      '',
      'Dynamic Allocations:',
      `  Files:         ${breakdown.files.toLocaleString()} / ${budget.dynamic.files.toLocaleString()} (${this.formatPercent(breakdown.files, budget.dynamic.files)})`,
      `  Code Results:  ${breakdown.codeResults.toLocaleString()} / ${budget.dynamic.codeResults.toLocaleString()} (${this.formatPercent(breakdown.codeResults, budget.dynamic.codeResults)})`,
      `  Memories:      ${breakdown.memories.toLocaleString()} / ${budget.dynamic.memories.toLocaleString()} (${this.formatPercent(breakdown.memories, budget.dynamic.memories)})`,
    ];

    if (truncatedComponents.length > 0) {
      lines.push('');
      lines.push('Truncated Components:');
      for (const component of truncatedComponents) {
        lines.push(`  - ${component}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a percentage for display
   */
  private formatPercent(value: number, max: number): string {
    if (max === 0) return '0%';
    const percent = (value / max) * 100;
    return `${percent.toFixed(1)}%`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TokenBudgeter with default settings
 */
export function createTokenBudgeter(): TokenBudgeter {
  return new TokenBudgeter();
}

/**
 * Create a TokenBudgeter with custom fixed budget
 */
export function createCustomTokenBudgeter(
  customFixedBudget: FixedBudgetInput
): TokenBudgeter {
  return new TokenBudgeter(customFixedBudget);
}

// ============================================================================
// Constants Export (for testing)
// ============================================================================

export const TOKEN_CONSTANTS = {
  CHARS_PER_TOKEN,
  DEFAULT_FIXED_BUDGET,
  DYNAMIC_ALLOCATION_RATIOS,
  TRUNCATION_INDICATOR,
} as const;
