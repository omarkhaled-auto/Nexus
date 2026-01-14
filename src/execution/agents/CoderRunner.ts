// CoderRunner - Code generation agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner } from './AgentRunner';
import { loadPrompt } from './PromptLoader';
import type { AgentType, Task, ToolDefinition, ExecutionResult } from './types';
import type { Message } from '@/llm';

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
  public readonly systemPrompt: string = loadPrompt('coder');

  /** Track current task for fixIssues() */
  private currentTask?: Task;

  /**
   * Get the list of tools available to this agent
   */
  getTools(): ToolDefinition[] {
    return CODER_TOOLS;
  }

  /**
   * Execute a task (override to track current task)
   */
  override async execute(task: Task): Promise<ExecutionResult> {
    this.currentTask = task;
    return super.execute(task);
  }

  /**
   * Fix issues reported by QA loop.
   * Creates a fix task from error messages and executes it.
   *
   * @param errors - Array of error messages to fix
   * @returns ExecutionResult from attempting to fix the issues
   */
  async fixIssues(errors: string[]): Promise<ExecutionResult> {
    if (!this.currentTask) {
      throw new Error('fixIssues called without a current task. Call execute() first.');
    }

    // Create a fix task from errors
    const fixTask: Task = {
      ...this.currentTask,
      id: `${this.currentTask.id}-fix`,
      name: `Fix issues for ${this.currentTask.name}`,
      description: `Fix the following issues:\n\n${errors.map((e, i) => `${String(i + 1)}. ${e}`).join('\n')}`,
    };

    return this.execute(fixTask);
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
