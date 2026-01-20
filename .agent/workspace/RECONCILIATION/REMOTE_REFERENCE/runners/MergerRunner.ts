// MergerRunner - Branch merge agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner } from './AgentRunner';
import { loadPrompt } from './PromptLoader';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Merger Tool Definitions
// ============================================================================

const MERGER_TOOLS: ToolDefinition[] = [
  {
    name: 'git_diff',
    description: 'Show differences between branches or commits',
    inputSchema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Branch to compare with current branch',
        },
        ref1: {
          type: 'string',
          description: 'First reference (branch, commit, tag)',
        },
        ref2: {
          type: 'string',
          description: 'Second reference (branch, commit, tag)',
        },
      },
    },
  },
  {
    name: 'git_merge',
    description: 'Merge a branch into the current branch',
    inputSchema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Branch to merge into current branch',
        },
        message: {
          type: 'string',
          description: 'Merge commit message (optional)',
        },
        noFf: {
          type: 'boolean',
          description: 'Disable fast-forward merge (optional)',
        },
      },
      required: ['branch'],
    },
  },
  {
    name: 'git_status',
    description: 'Get the current git repository status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'read_file',
    description: 'Read file contents (useful for reading conflicted files)',
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
    name: 'write_file',
    description: 'Write file contents (useful for writing resolved conflicts)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
];

// ============================================================================
// MergerRunner Class
// ============================================================================

/**
 * MergerRunner - Agent specialized for branch merging.
 *
 * Tools available:
 * - git_diff: View branch differences
 * - git_merge: Perform merge operation
 * - git_status: Check repository status
 * - read_file: Read files (for conflict inspection)
 * - write_file: Write files (for conflict resolution)
 */
export class MergerRunner extends AgentRunner {
  public readonly agentType: AgentType = 'merger';
  public readonly systemPrompt: string = loadPrompt('merger');

  /**
   * Get the list of tools available to this agent
   */
  getTools(): ToolDefinition[] {
    return MERGER_TOOLS;
  }

  /**
   * Override buildMessages to inject merger-specific context
   */
  protected override buildMessages(task: Task, history: Message[]): Message[] {
    const baseMessages = super.buildMessages(task, history);

    // Could add merger-specific context here if needed
    return baseMessages;
  }
}
