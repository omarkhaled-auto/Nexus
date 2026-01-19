/**
 * CoderAgent - Agent specialized for writing code
 *
 * Phase 14B Task 13: Implements the coder agent that writes code
 * using Claude to implement task requirements.
 *
 * @module execution/agents
 */

import type { LLMClient } from '../../llm/types';
import type { AgentType } from '../../types/agent';
import type { Task } from '../../types/task';
import {
  BaseAgentRunner,
  type AgentConfig,
  type AgentContext,
  type AgentTaskResult,
} from './BaseAgentRunner';

// ============================================================================
// System Prompt
// ============================================================================

const CODER_SYSTEM_PROMPT = `You are an expert software engineer. Your job is to implement code changes for the given task.

## Guidelines
1. Write clean, maintainable, well-documented code
2. Follow existing code patterns in the project
3. Include appropriate error handling
4. Keep changes focused and minimal
5. Consider edge cases
6. Add JSDoc comments for public APIs
7. Follow TypeScript best practices

## Process
1. Understand the task requirements and acceptance criteria
2. Plan your approach - identify files to create or modify
3. Implement the solution step by step
4. Verify your implementation meets all acceptance criteria

## Code Quality Standards
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Handle errors appropriately with try/catch blocks
- Add type annotations for all function parameters and returns
- Avoid any type - use proper typing
- Use async/await for asynchronous operations

## Output Format
For each file change, use this format:

### File: path/to/file.ts
\`\`\`typescript
// Your code here
\`\`\`

Explanation: Brief explanation of the changes and why they were made.

## Completion
When you have completed the implementation, include [TASK_COMPLETE] in your response along with:
1. A summary of all changes made
2. List of files created/modified
3. How the acceptance criteria are satisfied`;

// ============================================================================
// CoderAgent Implementation
// ============================================================================

/**
 * Agent specialized for writing and modifying code.
 *
 * Uses Claude to implement code changes based on task requirements.
 * Follows clean code principles and project conventions.
 *
 * @example
 * ```typescript
 * const coderAgent = new CoderAgent(claudeClient);
 * const result = await coderAgent.execute(task, context);
 * ```
 */
export class CoderAgent extends BaseAgentRunner {
  /**
   * Create a new CoderAgent
   *
   * @param llmClient - LLM client for interactions (API or CLI)
   * @param config - Optional agent configuration
   */
  constructor(llmClient: LLMClient, config?: AgentConfig) {
    super(llmClient, config);
  }

  /**
   * Get the agent type identifier
   */
  getAgentType(): AgentType {
    return 'coder';
  }

  /**
   * Execute a coding task
   *
   * @param task - The task to implement
   * @param context - Execution context with working directory and files
   * @returns Task execution result
   */
  async execute(task: Task, context: AgentContext): Promise<AgentTaskResult> {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }

  /**
   * Get the system prompt for the coder agent
   */
  protected getSystemPrompt(): string {
    return CODER_SYSTEM_PROMPT;
  }

  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task to implement
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  protected buildTaskPrompt(task: Task, context: AgentContext): string {
    const sections: string[] = [];

    // Task header
    sections.push(`# Task: ${task.name}`);
    sections.push('');

    // Description
    sections.push('## Description');
    sections.push(task.description || 'No description provided.');
    sections.push('');

    // Files to modify
    if (task.files && task.files.length > 0) {
      sections.push('## Files to Modify');
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push('');
    }

    // Dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push('## Dependencies');
      sections.push('This task depends on the following tasks being completed:');
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push('');
    }

    // Acceptance criteria / test criteria
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push('## Acceptance Criteria');
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push('');
    }

    // Time estimate
    if (task.estimatedMinutes) {
      sections.push(`## Time Estimate`);
      sections.push(`This task should take approximately ${task.estimatedMinutes} minutes.`);
      sections.push('');
    }

    // Context section
    sections.push(this.buildContextSection(context));
    sections.push('');

    // Instructions
    sections.push('## Instructions');
    sections.push('Please implement this task following the guidelines in the system prompt.');
    sections.push('When complete, include [TASK_COMPLETE] in your response with a summary.');

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

    // Alternative completion phrases
    const completionPhrases = [
      'implementation complete',
      'task completed successfully',
      'all acceptance criteria satisfied',
      'implementation is complete',
      'changes have been completed',
      'task has been completed',
    ];

    return completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }

  /**
   * Override continuation prompt for coder-specific guidance
   */
  protected getContinuationPrompt(): string {
    return `Please continue with the implementation.
If you need to modify more files, provide them in the same format.
If you have completed all changes, include [TASK_COMPLETE] with a summary of:
1. All files created or modified
2. How each acceptance criterion was addressed
3. Any important notes or caveats`;
  }
}
