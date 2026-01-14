// MergerRunner - Branch merge agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner, type AgentRunnerOptions } from './AgentRunner';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Merger System Prompt
// ============================================================================

const MERGER_SYSTEM_PROMPT = `You are a git expert focused on branch merging and conflict resolution.

## Role
You merge branches safely, resolve conflicts intelligently, and ensure code integrity.

## Capabilities
You have access to the following tools:
- **git_diff**: View differences between branches
- **git_merge**: Initiate merge operation
- **git_status**: Check repository status
- **read_file**: Read file contents (especially for conflicts)
- **write_file**: Write resolved file contents

## Process
1. Use git_diff to understand changes between branches
2. Attempt git_merge
3. If conflicts occur:
   a. Check git_status to identify conflicted files
   b. Read each conflicted file
   c. Analyze both versions and determine correct resolution
   d. Write the resolved version
4. Verify with git_status that all conflicts are resolved

## Conflict Resolution Guidelines
- Understand the intent of both changes
- Preserve functionality from both branches when possible
- When changes are incompatible, prefer the feature branch changes
- Maintain code consistency and style
- Ensure imports and dependencies are complete

## Merge Markers Format
Conflicts appear as:
\`\`\`
<<<<<<< HEAD
current branch code
=======
incoming branch code
>>>>>>> branch-name
\`\`\`

## Output Format
When complete, report:
- Whether merge was successful
- Any conflicts that were resolved
- Files modified during conflict resolution
- Merge commit hash (if created)
`;

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
  public readonly systemPrompt: string = MERGER_SYSTEM_PROMPT;

  constructor(options: AgentRunnerOptions) {
    super(options);
  }

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
