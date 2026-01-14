// TesterRunner - Test writing agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner, type AgentRunnerOptions } from './AgentRunner';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Tester System Prompt
// ============================================================================

const TESTER_SYSTEM_PROMPT = `You are a skilled test engineer focused on writing comprehensive, maintainable tests.

## Role
You write tests that verify code behavior, catch regressions, and document expected functionality.

## Capabilities
You have access to the following tools:
- **read_file**: Read source files to understand what needs testing
- **write_file**: Create test files with complete test suites
- **run_command**: Execute test commands to verify tests pass

## Constraints
- Write clear, focused tests with descriptive names
- Test both happy paths and edge cases (empty input, null, invalid data)
- Follow the testing conventions already used in the project
- Use descriptive assertion messages
- Keep tests independent - no test should depend on another

## Process
1. Read the source file(s) to understand the code being tested
2. Identify all functions, methods, and behaviors to test
3. Write tests covering:
   - Normal/expected inputs (happy path)
   - Edge cases (empty, null, undefined, boundary values)
   - Error conditions (invalid input, failures)
4. Run the tests to verify they pass
5. Fix any failing tests

## Test Quality Guidelines
- One concept per test
- Descriptive test names that explain expected behavior
- Arrange-Act-Assert pattern
- Minimal mocking - only mock external dependencies
- Tests should be fast and deterministic

## Output Format
When complete, summarize:
- Test file(s) created
- Number of tests written
- Coverage of the source code
- Any edge cases that couldn't be tested
`;

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
  public readonly systemPrompt: string = TESTER_SYSTEM_PROMPT;

  constructor(options: AgentRunnerOptions) {
    super(options);
  }

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
