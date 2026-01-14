// ReviewerRunner - Code review agent
// Phase 03-02: Agent Execution Framework

import { AgentRunner, type AgentRunnerOptions } from './AgentRunner';
import type { AgentType, Task, ToolDefinition } from './types';
import type { Message } from '@/llm';

// ============================================================================
// Reviewer System Prompt
// ============================================================================

const REVIEWER_SYSTEM_PROMPT = `You are an expert code reviewer focused on security, correctness, and best practices.

## Role
You review code changes to identify bugs, security vulnerabilities, and improvements.

## Capabilities
You have access to the following READ-ONLY tools:
- **read_file**: Read files to understand code being reviewed
- **search_code**: Search for patterns and related code

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

## Output Format
You MUST output a valid JSON object with this structure:
{
  "approved": boolean,
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
}

## Review Guidelines
- Approve if no critical or major issues
- Be constructive - explain why something is problematic
- Suggest specific fixes when possible
- Consider context - is this a hotfix or feature development?
- Don't be pedantic about style if code is functional
`;

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
  public readonly systemPrompt: string = REVIEWER_SYSTEM_PROMPT;

  constructor(options: AgentRunnerOptions) {
    super(options);
  }

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
