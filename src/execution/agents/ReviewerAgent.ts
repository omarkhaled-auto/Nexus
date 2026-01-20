/**
 * ReviewerAgent - Agent specialized for code review
 *
 * Phase 14B Task 15: Implements the reviewer agent that analyzes code
 * using Gemini for comprehensive code review including security,
 * performance, and maintainability assessment.
 *
 * @module execution/agents
 */

import type { AgentType } from '../../types/agent';
import type { Task } from '../../types/task';
import {
  BaseAgentRunner,
  type AgentContext,
  type AgentTaskResult,
} from './BaseAgentRunner';

// ============================================================================
// Types
// ============================================================================

/**
 * Review severity levels
 */
export type ReviewSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * Individual review issue found during code review
 */
export interface ReviewIssue {
  severity: ReviewSeverity;
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  category: 'security' | 'performance' | 'maintainability' | 'correctness' | 'style';
}

/**
 * Structured review result
 */
export interface ReviewOutput {
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
  summary: string;
}

// ============================================================================
// System Prompt
// ============================================================================

const REVIEWER_SYSTEM_PROMPT = `You are a senior code reviewer with expertise in security, performance, and software architecture. Your job is to thoroughly review code changes and provide actionable feedback.

## Review Criteria

### 1. Security (Priority: Critical)
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication and authorization issues
- Sensitive data exposure
- Insecure configurations
- Input validation gaps

### 2. Correctness (Priority: Major)
- Logic errors and edge cases
- Off-by-one errors
- Null/undefined handling
- Type safety issues
- Race conditions

### 3. Performance (Priority: Major)
- N+1 query patterns
- Memory leaks
- Unnecessary computations
- Missing caching opportunities
- Inefficient algorithms

### 4. Maintainability (Priority: Minor)
- Code complexity (functions too long, nested too deep)
- Naming clarity
- Code duplication
- Missing documentation
- Inconsistent patterns

### 5. Style (Priority: Suggestion)
- Code formatting
- Import organization
- Consistent conventions

## Review Process
1. Analyze the code changes in context
2. Identify issues by category
3. Prioritize by severity
4. Provide specific, actionable suggestions
5. Note positive patterns worth keeping

## Output Format
Provide your review in JSON format:
\`\`\`json
{
  "approved": true/false,
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "security|performance|maintainability|correctness|style",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Clear description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": ["General improvement suggestions"],
  "summary": "Brief summary of the review"
}
\`\`\`

## Approval Rules
- Set approved=false if there are ANY critical issues
- Set approved=false if there are more than 2 major issues
- Set approved=true only if the code is production-ready
- Include [TASK_COMPLETE] when review is finished

## Best Practices
- Be specific and cite line numbers when possible
- Explain WHY something is an issue, not just WHAT
- Provide concrete code examples for fixes
- Acknowledge good patterns and clean code
- Focus on issues that matter most first`;

// ============================================================================
// ReviewerAgent Implementation
// ============================================================================

/**
 * Agent specialized for comprehensive code review.
 *
 * Uses Gemini to analyze code changes for security vulnerabilities,
 * performance issues, maintainability problems, and correctness.
 *
 * @example
 * ```typescript
 * const reviewerAgent = new ReviewerAgent(geminiClient);
 * const result = await reviewerAgent.execute(task, context);
 * const review = reviewerAgent.parseReviewOutput(result.output);
 * ```
 */
export class ReviewerAgent extends BaseAgentRunner {

  /**
   * Get the agent type identifier
   */
  getAgentType(): AgentType {
    return 'reviewer';
  }

  /**
   * Execute a code review task
   *
   * @param task - The task containing code to review
   * @param context - Execution context with working directory and files
   * @returns Task execution result with review output
   */
  async execute(task: Task, context: AgentContext): Promise<AgentTaskResult> {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }

  /**
   * Get the system prompt for the reviewer agent
   */
  protected getSystemPrompt(): string {
    return REVIEWER_SYSTEM_PROMPT;
  }

  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task containing code to review
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  protected buildTaskPrompt(task: Task, context: AgentContext): string {
    const sections: string[] = [];

    // Task header
    sections.push(`# Code Review Task: ${task.name}`);
    sections.push('');

    // Description
    sections.push('## Review Objective');
    sections.push(task.description || 'Review the code changes for issues and improvements.');
    sections.push('');

    // Files to review
    if (task.files && task.files.length > 0) {
      sections.push('## Files to Review');
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push('');
    }

    // Review criteria / acceptance criteria
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push('## Review Criteria');
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push('');
    }

    // Dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push('## Related Tasks');
      sections.push('This review is related to the following tasks:');
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push('');
    }

    // Context section
    sections.push(this.buildContextSection(context));
    sections.push('');

    // Review instructions
    sections.push('## Review Instructions');
    sections.push('1. Analyze the code changes thoroughly');
    sections.push('2. Check for security vulnerabilities');
    sections.push('3. Evaluate performance implications');
    sections.push('4. Assess code maintainability');
    sections.push('5. Verify correctness and edge case handling');
    sections.push('6. Check for style consistency');
    sections.push('');
    sections.push('Provide your review in the JSON format specified in the system prompt.');
    sections.push('When complete, include [TASK_COMPLETE] with your review summary.');

    return sections.join('\n');
  }

  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  protected isTaskComplete(response: string, _task: Task): boolean {
    const lowerResponse = response.toLowerCase();

    // Primary completion marker
    if (response.includes('[TASK_COMPLETE]')) {
      return true;
    }

    // Alternative completion phrases for review
    const completionPhrases = [
      'review complete',
      'code review complete',
      'review is complete',
      'review has been completed',
      'finished reviewing',
      'review summary:',
    ];

    // Also check for JSON output with approved field (indicates review is done)
    const hasJsonReview = response.includes('"approved"') && response.includes('"summary"');

    return hasJsonReview || completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }

  /**
   * Override continuation prompt for reviewer-specific guidance
   */
  protected getContinuationPrompt(): string {
    return `Please continue with your review analysis.
If you need to examine more files or details, describe what you're looking at.
If you have completed the review, provide the JSON output and include [TASK_COMPLETE] with:
1. Your approval decision (approved: true/false)
2. All identified issues with severity levels
3. A summary of your findings`;
  }

  /**
   * Parse the review output from the LLM response
   *
   * @param output - Raw LLM output containing review JSON
   * @returns Parsed review output or null if parsing fails
   */
  parseReviewOutput(output: string | undefined): ReviewOutput | null {
    if (!output) {
      return null;
    }

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/) ||
                        output.match(/```\s*([\s\S]*?)\s*```/) ||
                        output.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[1]);

      return {
        approved: parsed.approved === true,
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.map((i: Partial<ReviewIssue>) => ({
              severity: i.severity || 'minor',
              category: i.category || 'maintainability',
              file: i.file || 'unknown',
              line: i.line,
              message: i.message || 'No message',
              suggestion: i.suggestion,
            }))
          : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        summary: parsed.summary || 'No summary provided',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the count of issues by severity
   *
   * @param issues - Array of review issues
   * @returns Object with counts by severity
   */
  getIssueCounts(issues: ReviewIssue[]): Record<ReviewSeverity, number> {
    const counts: Record<ReviewSeverity, number> = {
      critical: 0,
      major: 0,
      minor: 0,
      suggestion: 0,
    };

    for (const issue of issues) {
      counts[issue.severity]++;
    }

    return counts;
  }

  /**
   * Determine if review should approve based on issue counts
   * Uses stricter criteria than LLM might apply
   *
   * @param issues - Array of review issues
   * @returns True if should approve, false otherwise
   */
  shouldApprove(issues: ReviewIssue[]): boolean {
    const counts = this.getIssueCounts(issues);

    // Never approve with critical issues
    if (counts.critical > 0) {
      return false;
    }

    // Don't approve with more than 2 major issues
    if (counts.major > 2) {
      return false;
    }

    return true;
  }
}
