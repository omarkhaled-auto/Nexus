// TesterRunner - Test writing agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner } from './AgentRunner';
import { loadPrompt } from './PromptLoader';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Tester Tool Definitions
// ============================================================================

const TESTER_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file to understand what needs testing',
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
    description: 'Write test file content',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the test file to write',
        },
        content: {
          type: 'string',
          description: 'Test file content',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a command (typically to run tests)',
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
];

// ============================================================================
// TesterRunner Class
// ============================================================================

/**
 * TesterRunner - Agent specialized for writing tests.
 *
 * Tools available (limited set for safety):
 * - read_file: Read source files to understand what to test
 * - write_file: Create test files
 * - run_command: Execute tests to verify they pass
 */
export class TesterRunner extends AgentRunner {
  public readonly agentType: AgentType = 'tester';
  public readonly systemPrompt: string = loadPrompt('tester');

  /**
   * Get the list of tools available to this agent
   */
  getTools(): ToolDefinition[] {
    return TESTER_TOOLS;
  }

  /**
   * Override buildMessages to inject tester-specific context
   */
  protected override buildMessages(task: Task, history: Message[]): Message[] {
    const baseMessages = super.buildMessages(task, history);

    // Could add tester-specific context here if needed
    return baseMessages;
  }
}
