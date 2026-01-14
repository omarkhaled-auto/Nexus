// CoderRunner - Code generation agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner, type AgentRunnerOptions } from './AgentRunner';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Coder System Prompt
// ============================================================================

const CODER_SYSTEM_PROMPT = `You are a skilled software engineer focused on code generation and modification.

## Role
You write clean, maintainable, well-tested code following established patterns and best practices.

## Capabilities
You have access to the following tools:
- **read_file**: Read file contents to understand existing code
- **write_file**: Create new files with complete content
- **edit_file**: Modify existing files with targeted edits
- **run_command**: Execute shell commands (build, test, lint)
- **search_code**: Search for patterns across the codebase

## Constraints
- Complete tasks within 30 minutes of focused work
- Follow existing code patterns and conventions in the project
- Write tests alongside implementation when appropriate
- Verify code compiles by running typecheck/build commands
- Keep changes minimal and focused on the task

## Process
1. Read relevant existing files to understand context
2. Search for similar patterns or related code if needed
3. Implement changes using write_file or edit_file
4. Run build/typecheck to verify code compiles
5. Fix any errors that arise
6. Report what was accomplished

## Output Format
When complete, summarize:
- Files created or modified
- Key implementation decisions
- Any issues encountered and how they were resolved
`;

// ============================================================================
// Coder Tool Definitions
// ============================================================================

const CODER_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
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
    description: 'Write content to a file (creates parent directories if needed)',
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
  {
    name: 'edit_file',
    description: 'Edit an existing file with line-based modifications',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to edit',
        },
        edits: {
          type: 'array',
          description: 'Array of edits to apply',
          items: {
            type: 'object',
            properties: {
              startLine: {
                type: 'number',
                description: 'Line number to start edit (1-based)',
              },
              endLine: {
                type: 'number',
                description: 'Line number to end edit (exclusive)',
              },
              newContent: {
                type: 'string',
                description: 'New content to replace the range',
              },
            },
            required: ['startLine', 'endLine', 'newContent'],
          },
        },
      },
      required: ['path', 'edits'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Command to execute',
        },
        cwd: {
          type: 'string',
          description: 'Working directory (optional)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (optional)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for patterns in the codebase',
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
// CoderRunner Class
// ============================================================================

/**
 * CoderRunner - Agent specialized for code generation and modification.
 *
 * Tools available:
 * - read_file: Read file contents
 * - write_file: Create/overwrite files
 * - edit_file: Modify existing files
 * - run_command: Execute commands (build, test, lint)
 * - search_code: Search for patterns
 */
export class CoderRunner extends AgentRunner {
  public readonly agentType: AgentType = 'coder';
  public readonly systemPrompt: string = CODER_SYSTEM_PROMPT;

  constructor(options: AgentRunnerOptions) {
    super(options);
  }

  /**
   * Get the list of tools available to this agent
   */
  getTools(): ToolDefinition[] {
    return CODER_TOOLS;
  }

  /**
   * Override buildMessages to inject coder-specific context
   */
  protected override buildMessages(task: Task, history: Message[]): Message[] {
    const baseMessages = super.buildMessages(task, history);

    // Could add coder-specific context here if needed
    // For now, use the base implementation
    return baseMessages;
  }
}
