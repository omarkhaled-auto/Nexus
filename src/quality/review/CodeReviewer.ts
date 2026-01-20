// CodeReviewer - AI-powered code review
// Phase 03-03: Quality Verification Layer

import type { LLMProvider } from '@/llm/LLMProvider';
import type { Message } from '@/llm';
import type { ReviewResult, FileChange, Logger } from '../types';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Error thrown when code review fails
 */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for CodeReviewer constructor
 */
export interface CodeReviewerOptions {
  /** LLMProvider for AI review */
  llmProvider: LLMProvider;
  /** Optional logger */
  logger?: Logger;
}

// ============================================================================
// Constants
// ============================================================================

const REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer focused on security, correctness, and best practices.

## Your Task
Review the provided code changes and produce a structured review.

## Focus Areas
1. **Security** - SQL injection, XSS, authentication issues, data exposure
2. **Bugs** - Logic errors, null references, race conditions, edge cases
3. **Patterns** - Consistency with codebase conventions, anti-patterns
4. **Performance** - N+1 queries, unnecessary computations, memory leaks
5. **Maintainability** - Code clarity, documentation, test coverage

## Issue Severity Levels
- **critical**: Must fix before merge (security, data loss, crashes)
- **major**: Should fix before merge (bugs, significant issues)
- **minor**: Nice to fix (code quality, minor improvements)
- **suggestion**: Optional improvements (style, alternative approaches)

## Blocking Rules
- critical issues: ALWAYS blocking (approved: false, hasBlockingIssues: true)
- major issues: blocking if > 2 issues
- minor/suggestion: NEVER blocking

## Output Format
You MUST respond with a valid JSON object (no markdown, no explanation):
{
  "approved": boolean,
  "hasBlockingIssues": boolean,
  "issues": [
    {
      "severity": "critical" | "major" | "minor" | "suggestion",
      "file": "path/to/file",
      "line": number (optional),
      "message": "Description of the issue",
      "suggestion": "How to fix (optional)"
    }
  ],
  "summary": "Overall review summary"
}`;

// ============================================================================
// CodeReviewer Implementation
// ============================================================================

/**
 * CodeReviewer - AI-powered code review using LLM.
 *
 * Uses Gemini (via LLMProvider) for large context code review.
 * Produces structured review results with categorized issues.
 */
export class CodeReviewer {
  private readonly llmProvider: LLMProvider;
  private readonly logger?: Logger;

  constructor(options: CodeReviewerOptions) {
    this.llmProvider = options.llmProvider;
    this.logger = options.logger;
  }

  /**
   * Review file changes
   */
  async review(files: FileChange[]): Promise<ReviewResult> {
    this.logger?.info(`Reviewing ${String(files.length)} files`);

    const userMessage = this.formatFilesForReview(files);
    return this.performReview(userMessage);
  }

  /**
   * Review a git diff
   */
  async reviewDiff(diff: string): Promise<ReviewResult> {
    this.logger?.info('Reviewing diff');

    const userMessage = this.formatDiffForReview(diff);
    return this.performReview(userMessage);
  }

  /**
   * Perform the actual review via LLM
   */
  private async performReview(userMessage: string): Promise<ReviewResult> {
    const messages: Message[] = [
      { role: 'system', content: REVIEW_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.llmProvider.chat('reviewer', messages, {});

      // Parse JSON response
      const result = this.parseReviewResponse(response.content);

      // Validate and correct blocking status
      const correctedResult = this.validateBlockingStatus(result);

      this.logger?.info(
        `Review complete: ${correctedResult.approved ? 'approved' : 'not approved'}, ${String(correctedResult.issues.length)} issues`
      );

      return correctedResult;
    } catch (error) {
      if (error instanceof ReviewError) {
        throw error;
      }
      throw new ReviewError(`Review failed: ${(error as Error).message}`);
    }
  }

  /**
   * Format files for review prompt
   */
  private formatFilesForReview(files: FileChange[]): string {
    const parts: string[] = ['Please review the following code changes:'];

    for (const file of files) {
      parts.push(`\n## File: ${file.path}`);

      if (file.diff) {
        parts.push('\n### Diff:');
        parts.push('```diff');
        parts.push(file.diff);
        parts.push('```');
      }

      parts.push('\n### Content:');
      parts.push('```typescript');
      parts.push(file.content);
      parts.push('```');
    }

    return parts.join('\n');
  }

  /**
   * Format diff for review prompt
   */
  private formatDiffForReview(diff: string): string {
    return `Please review the following git diff:

\`\`\`diff
${diff}
\`\`\``;
  }

  /**
   * Parse LLM response into ReviewResult
   */
  private parseReviewResponse(content: string): ReviewResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger?.warn('No JSON found in review response');
        return this.createFailedReview('Could not parse review response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      // Validate required fields
      if (typeof parsed.approved !== 'boolean') {
        return this.createFailedReview('Invalid review format: missing approved');
      }

      return {
        approved: parsed.approved,
        hasBlockingIssues: parsed.hasBlockingIssues === true,
        issues: Array.isArray(parsed.issues) ? (parsed.issues as ReviewResult['issues']) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'No summary provided',
      };
    } catch (error) {
      this.logger?.warn('Failed to parse review response:', error);
      return this.createFailedReview('Failed to parse review response');
    }
  }

  /**
   * Validate and correct blocking status based on issues
   */
  private validateBlockingStatus(result: ReviewResult): ReviewResult {
    const issues = result.issues;

    // Count issues by severity
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const majorCount = issues.filter((i) => i.severity === 'major').length;

    // Apply blocking rules
    const hasBlockingIssues = criticalCount > 0 || majorCount > 2;

    // Only override approved if there are blocking issues
    // If the LLM returned approved: false for another reason, respect that
    const approved = hasBlockingIssues ? false : result.approved;

    return {
      ...result,
      approved,
      hasBlockingIssues,
    };
  }

  /**
   * Create a failed review result
   */
  private createFailedReview(reason: string): ReviewResult {
    return {
      approved: false,
      hasBlockingIssues: true,
      issues: [
        {
          severity: 'major',
          file: 'unknown',
          message: reason,
        },
      ],
      summary: reason,
    };
  }
}
