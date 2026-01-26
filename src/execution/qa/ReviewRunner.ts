/**
 * ReviewRunner - AI-powered code review runner
 *
 * Actually calls GeminiClient to perform code reviews on git diffs
 * and returns structured ReviewResult format compatible with
 * RalphStyleIterator's QARunner interface.
 *
 * Layer 4: Execution - QA subsystem
 */

import type {
  ReviewResult,
  ErrorEntry,
  QARunner,
} from '../iteration/types';
import type { LLMClient } from '../../llm/types';
import type { GitService } from '../../infrastructure/git/GitService';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for ReviewRunner
 */
export interface ReviewRunnerConfig {
  /** Timeout for review request in milliseconds (default: 120000 = 2min) */
  timeout?: number;
  /** Maximum diff size in characters to send for review (default: 50000) */
  maxDiffSize?: number;
  /** Whether to include suggestions in review (default: true) */
  includeSuggestions?: boolean;
  /** Custom review criteria to add to prompt */
  additionalCriteria?: string[];
}

/**
 * Context about the task being reviewed
 */
export interface ReviewContext {
  /** Task ID being reviewed */
  taskId: string;
  /** Description of what the task should accomplish */
  taskDescription?: string;
  /** Acceptance criteria for the task */
  acceptanceCriteria?: string[];
  /** Files that were supposed to be modified */
  expectedFiles?: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_REVIEW_CONFIG: Required<Omit<ReviewRunnerConfig, 'additionalCriteria'>> & { additionalCriteria: string[] } = {
  timeout: 120000,
  maxDiffSize: 50000,
  includeSuggestions: true,
  additionalCriteria: [],
};

// ============================================================================
// System Prompt for Code Review
// ============================================================================

const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer with expertise in TypeScript, software architecture, and best practices.
Your task is to review code changes and provide constructive feedback.

## Review Criteria
1. **Correctness**: Does the code do what it's supposed to do?
2. **Bugs**: Are there any obvious bugs, edge cases not handled, or potential runtime errors?
3. **Security**: Are there any security vulnerabilities (injection, exposure, etc.)?
4. **Performance**: Are there any obvious performance issues (N+1 queries, unnecessary loops, etc.)?
5. **Maintainability**: Is the code clean, well-structured, and maintainable?
6. **Types**: Are TypeScript types properly used? Any 'any' types that should be avoided?
7. **Error Handling**: Is error handling appropriate and comprehensive?

## Response Format
You MUST respond with ONLY a valid JSON object (no markdown code blocks, no explanation before or after):
{
  "approved": true,
  "comments": ["comment1", "comment2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "blockers": ["blocker1"]
}

Rules:
- Set "approved" to false if there are ANY blockers
- "comments" are general observations about the code
- "suggestions" are non-blocking improvements that would be nice to have
- "blockers" are critical issues that MUST be fixed before the code can be approved
- All arrays can be empty if not applicable
- Keep feedback concise and actionable`;

/**
 * Raw parsed JSON from LLM review response
 * Used for type-safe parsing before normalization
 */
interface ReviewResponseRawParsed {
  approved?: boolean;
  comments?: unknown[];
  suggestions?: unknown[];
  blockers?: unknown[];
}

// ============================================================================
// ReviewRunner Class
// ============================================================================

/**
 * ReviewRunner performs AI-powered code reviews using Gemini.
 *
 * It retrieves the git diff of changes, sends it to Gemini for review,
 * and parses the response into structured format compatible with
 * RalphStyleIterator's QARunner interface.
 *
 * @example
 * ```typescript
 * const runner = new ReviewRunner(geminiClient, gitService);
 * const result = await runner.run('/path/to/project', {
 *   taskId: 'task-123',
 *   taskDescription: 'Implement user authentication'
 * });
 *
 * if (!result.approved) {
 *   console.log('Blockers:', result.blockers);
 * }
 * ```
 */
export class ReviewRunner {
  private llmClient: LLMClient;
  private gitService: GitService;
  private config: Required<Omit<ReviewRunnerConfig, 'additionalCriteria'>> & { additionalCriteria: string[] };
  private currentIteration: number = 0;

  constructor(
    llmClient: LLMClient,
    gitService: GitService,
    config: ReviewRunnerConfig = {}
  ) {
    this.llmClient = llmClient;
    this.gitService = gitService;
    this.config = {
      ...DEFAULT_REVIEW_CONFIG,
      ...config,
      additionalCriteria: config.additionalCriteria ?? [],
    };
  }

  /**
   * Set the current iteration number for error tracking
   */
  setIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  /**
   * Run code review on the current git diff
   *
   * Retrieves the diff of uncommitted changes, sends it to Gemini for review,
   * and returns structured feedback compatible with RalphStyleIterator.
   *
   * @param workingDir - Directory containing the git repository
   * @param context - Optional context about the task being reviewed
   * @returns ReviewResult with approval status and feedback
   */
  async run(workingDir: string, context?: ReviewContext): Promise<ReviewResult> {
    try {
      // Get the diff of staged and unstaged changes
      let diff = await this.gitService.diff({ staged: true });
      const unstagedDiff = await this.gitService.diff();

      // Combine staged and unstaged diffs
      if (unstagedDiff) {
        diff = diff ? `${diff}\n${unstagedDiff}` : unstagedDiff;
      }

      // Handle empty diff - approve by default
      if (!diff || diff.trim().length === 0) {
        return {
          approved: true,
          comments: ['No changes to review'],
          suggestions: [],
          blockers: [],
        };
      }

      // Truncate diff if too large
      const truncatedDiff = this.truncateDiff(diff);

      // Build the review prompt
      const prompt = this.buildReviewPrompt(truncatedDiff, context);

      // Call Gemini for review
      // System prompt is passed as a message with role 'system'
      const response = await this.llmClient.chat([
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ]);

      // Parse the response
      return this.parseReviewResponse(response.content);
    } catch (error) {
      // Return a failed review result on error
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: [
          `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Review specific files instead of the full diff
   *
   * @param workingDir - Directory containing the git repository
   * @param files - Specific files to review
   * @param context - Optional context about the task
   * @returns ReviewResult with approval status and feedback
   */
  async reviewFiles(
    workingDir: string,
    files: string[],
    context?: ReviewContext
  ): Promise<ReviewResult> {
    try {
      // Get diff for specific files
      // Note: GitService.diff() doesn't support file filtering directly,
      // so we get the full diff and filter it
      const fullDiff = await this.gitService.diff();

      if (!fullDiff || fullDiff.trim().length === 0) {
        return {
          approved: true,
          comments: ['No changes to review in specified files'],
          suggestions: [],
          blockers: [],
        };
      }

      // Filter diff to only include specified files
      const filteredDiff = this.filterDiffByFiles(fullDiff, files);

      if (!filteredDiff || filteredDiff.trim().length === 0) {
        return {
          approved: true,
          comments: ['No changes to review in specified files'],
          suggestions: [],
          blockers: [],
        };
      }

      // Build the review prompt with filtered diff
      const prompt = this.buildReviewPrompt(filteredDiff, context);

      // Call Gemini for review
      // System prompt is passed as a message with role 'system'
      const response = await this.llmClient.chat([
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ]);

      return this.parseReviewResponse(response.content);
    } catch (error) {
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: [
          `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Create a callback function compatible with RalphStyleIterator's QARunner interface.
   *
   * The callback captures the working directory in a closure, allowing
   * RalphStyleIterator to call it with just the taskId parameter.
   * An optional workingDir parameter can override the default path.
   *
   * @param defaultWorkingDir - Default directory containing the git repository
   * @param context - Optional static context for all reviews
   * @returns Function that takes taskId and optional workingDir, returns Promise<ReviewResult>
   */
  createCallback(defaultWorkingDir: string, context?: ReviewContext): QARunner['review'] {
    return async (taskId: string, workingDir?: string): Promise<ReviewResult> => {
      const effectiveDir = workingDir ?? defaultWorkingDir;
      return this.run(effectiveDir, { ...context, taskId });
    };
  }

  /**
   * Build the full system prompt including additional criteria
   */
  private buildSystemPrompt(): string {
    if (this.config.additionalCriteria.length === 0) {
      return REVIEW_SYSTEM_PROMPT;
    }

    const additionalCriteriaText = this.config.additionalCriteria
      .map((c, i) => `${i + 8}. ${c}`)
      .join('\n');

    return REVIEW_SYSTEM_PROMPT.replace(
      '7. **Error Handling**: Is error handling appropriate and comprehensive?',
      `7. **Error Handling**: Is error handling appropriate and comprehensive?\n${additionalCriteriaText}`
    );
  }

  /**
   * Build the review prompt from diff and context
   */
  private buildReviewPrompt(diff: string, context?: ReviewContext): string {
    let prompt = '## Code Changes to Review\n\n```diff\n' + diff + '\n```\n';

    if (context?.taskDescription) {
      prompt += `\n## Task Description\n${context.taskDescription}\n`;
    }

    if (context?.acceptanceCriteria?.length) {
      prompt += `\n## Acceptance Criteria\n`;
      context.acceptanceCriteria.forEach((c, i) => {
        prompt += `${i + 1}. ${c}\n`;
      });
    }

    if (context?.expectedFiles?.length) {
      prompt += `\n## Expected Files to Modify\n`;
      context.expectedFiles.forEach((f) => {
        prompt += `- ${f}\n`;
      });
    }

    prompt +=
      '\nPlease review these changes and provide your assessment in JSON format.';

    return prompt;
  }

  /**
   * Parse Gemini response into ReviewResult
   */
  parseReviewResponse(response: string): ReviewResult {
    try {
      // Try to extract JSON from response (handle potential markdown code blocks)
      let jsonStr = response;

      // Remove markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // Try to find raw JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }

      const parsed = JSON.parse(jsonStr) as ReviewResponseRawParsed;

      // Validate and normalize the parsed response
      return {
        approved: Boolean(parsed.approved),
        comments: Array.isArray(parsed.comments)
          ? parsed.comments.filter((c): c is string => typeof c === 'string')
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
          : [],
        blockers: Array.isArray(parsed.blockers)
          ? parsed.blockers.filter((b): b is string => typeof b === 'string')
          : [],
      };
    } catch {
      // If parsing fails, treat as a blocked review
      return {
        approved: false,
        comments: [],
        suggestions: [],
        blockers: ['Failed to parse review response. Raw response: ' + response.substring(0, 200)],
      };
    }
  }

  /**
   * Truncate diff if it exceeds maximum size
   */
  private truncateDiff(diff: string): string {
    if (diff.length <= this.config.maxDiffSize) {
      return diff;
    }

    const truncated = diff.substring(0, this.config.maxDiffSize);
    const lastNewline = truncated.lastIndexOf('\n');

    return (
      truncated.substring(0, lastNewline) +
      '\n\n... [DIFF TRUNCATED - showing first ' +
      this.config.maxDiffSize +
      ' characters] ...'
    );
  }

  /**
   * Filter a diff to only include specific files
   */
  private filterDiffByFiles(diff: string, files: string[]): string {
    // Split diff into file chunks
    const fileChunks = diff.split(/(?=^diff --git)/m);

    // Filter to only include chunks for specified files
    const filteredChunks = fileChunks.filter((chunk) => {
      return files.some((file) => chunk.includes(file));
    });

    return filteredChunks.join('');
  }

  /**
   * Convert blockers to ErrorEntry format for error aggregation
   */
  blockersToErrors(blockers: string[]): ErrorEntry[] {
    return blockers.map((blocker) => ({
      type: 'review' as const,
      severity: 'error' as const,
      message: blocker,
      iteration: this.currentIteration,
    }));
  }

  /**
   * Convert suggestions to ErrorEntry format for tracking
   */
  suggestionsToWarnings(suggestions: string[]): ErrorEntry[] {
    return suggestions.map((suggestion) => ({
      type: 'review' as const,
      severity: 'warning' as const,
      message: suggestion,
      iteration: this.currentIteration,
    }));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a ReviewRunner instance with default configuration
 */
export function createReviewRunner(
  llmClient: LLMClient,
  gitService: GitService,
  config?: ReviewRunnerConfig
): ReviewRunner {
  return new ReviewRunner(llmClient, gitService, config);
}

/**
 * Create a QARunner-compatible review callback for RalphStyleIterator
 */
export function createReviewCallback(
  llmClient: LLMClient,
  gitService: GitService,
  workingDir: string,
  config?: ReviewRunnerConfig,
  context?: ReviewContext
): QARunner['review'] {
  const runner = new ReviewRunner(llmClient, gitService, config);
  return runner.createCallback(workingDir, context);
}
