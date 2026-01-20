// ReviewerRunner - Code review agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner } from './AgentRunner';
import { loadPrompt } from './PromptLoader';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Reviewer Tool Definitions
// ============================================================================

const REVIEWER_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file to review',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for patterns in the codebase to understand conventions',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (regex supported)',
        },
        path: {
          type: 'string',
          description: 'Directory to search in (optional)',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files (optional)',
        },
      },
      required: ['query'],
    },
  },
];

// ============================================================================
// ReviewerRunner Class
// ============================================================================

/**
 * ReviewerRunner - Agent specialized for code review.
 *
 * Uses Gemini for large context review capability.
 * Read-only tools only - cannot modify files.
 *
 * Tools available:
 * - read_file: Read file contents for review
 * - search_code: Search for related patterns
 */
export class ReviewerRunner extends AgentRunner {
  public readonly agentType: AgentType = 'reviewer';
  public readonly systemPrompt: string = loadPrompt('reviewer');

  /**
   * Get the list of tools available to this agent (read-only)
   */
  getTools(): ToolDefinition[] {
    return REVIEWER_TOOLS;
  }

  /**
   * Override buildMessages to inject reviewer-specific context
   */
  protected override buildMessages(task: Task, history: Message[]): Message[] {
    const baseMessages = super.buildMessages(task, history);

    // Could add reviewer-specific context here if needed
    return baseMessages;
  }
}
