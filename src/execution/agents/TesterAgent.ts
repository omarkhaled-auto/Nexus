/**
 * TesterAgent - Agent specialized for writing tests
 *
 * Phase 14B Task 14: Implements the tester agent that writes comprehensive
 * tests using Claude to validate code implementations.
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

const TESTER_SYSTEM_PROMPT = `You are an expert test engineer specializing in comprehensive test coverage. Your job is to write high-quality tests for the given code.

## Guidelines
1. Write thorough tests that cover happy paths and edge cases
2. Follow existing test patterns in the project
3. Use descriptive test names that explain what is being tested
4. Include setup/teardown when needed (beforeEach, afterEach)
5. Test both positive and negative scenarios
6. Mock external dependencies appropriately
7. Aim for high code coverage without redundant tests

## Testing Best Practices
- Use AAA pattern: Arrange, Act, Assert
- One assertion per test when possible (multiple related assertions are OK)
- Test behavior, not implementation details
- Use meaningful test data (not just "test" or "123")
- Group related tests using describe blocks
- Clean up any side effects in afterEach/afterAll
- Test error conditions and edge cases

## Test Categories to Consider
1. **Unit Tests**: Test individual functions/methods in isolation
2. **Integration Tests**: Test interactions between components
3. **Edge Cases**: Boundary conditions, empty inputs, null values
4. **Error Handling**: Verify proper error throwing and handling
5. **Async Operations**: Test promises, async/await, callbacks
6. **State Management**: Test state transitions and side effects

## Test Naming Convention
Use descriptive names that explain:
- What is being tested
- Under what conditions
- What the expected outcome is

Example: "should return empty array when input is empty"

## Output Format
For each test file, use this format:

### File: path/to/file.test.ts
\`\`\`typescript
// Your test code here
\`\`\`

Explanation: Brief explanation of what tests were added and why.

## Completion
When you have completed writing tests, include [TASK_COMPLETE] in your response along with:
1. Summary of all test files created
2. Total number of test cases
3. Categories of tests covered (unit, integration, edge cases, etc.)
4. Coverage goals achieved`;

// ============================================================================
// TesterAgent Implementation
// ============================================================================

/**
 * Agent specialized for writing comprehensive tests.
 *
 * Uses Claude to write test code that validates implementation correctness.
 * Focuses on edge cases, error handling, and comprehensive coverage.
 *
 * @example
 * ```typescript
 * const testerAgent = new TesterAgent(claudeClient);
 * const result = await testerAgent.execute(task, context);
 * ```
 */
export class TesterAgent extends BaseAgentRunner {
  /**
   * Create a new TesterAgent
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
    return 'tester';
  }

  /**
   * Execute a testing task
   *
   * @param task - The task to implement tests for
   * @param context - Execution context with working directory and files
   * @returns Task execution result
   */
  async execute(task: Task, context: AgentContext): Promise<AgentTaskResult> {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }

  /**
   * Get the system prompt for the tester agent
   */
  protected getSystemPrompt(): string {
    return TESTER_SYSTEM_PROMPT;
  }

  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task to implement tests for
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  protected buildTaskPrompt(task: Task, context: AgentContext): string {
    const sections: string[] = [];

    // Task header
    sections.push(`# Testing Task: ${task.name}`);
    sections.push('');

    // Description
    sections.push('## Description');
    sections.push(task.description || 'Write comprehensive tests for the implementation.');
    sections.push('');

    // Files to test
    if (task.files && task.files.length > 0) {
      sections.push('## Files to Test');
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
        // Suggest test file location
        const testFile = this.suggestTestFileName(f);
        sections.push(`  - Test file: ${testFile}`);
      });
      sections.push('');
    }

    // Test requirements / acceptance criteria
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push('## Test Requirements');
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
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

    // Time estimate
    if (task.estimatedMinutes) {
      sections.push(`## Time Estimate`);
      sections.push(`This task should take approximately ${task.estimatedMinutes} minutes.`);
      sections.push('');
    }

    // Context section
    sections.push(this.buildContextSection(context));
    sections.push('');

    // Test-specific instructions
    sections.push('## Testing Instructions');
    sections.push('1. Analyze the code to understand its functionality');
    sections.push('2. Identify key scenarios to test (happy path, edge cases, errors)');
    sections.push('3. Write comprehensive tests using the project\'s test framework');
    sections.push('4. Include mocks/stubs for external dependencies');
    sections.push('5. Ensure all test criteria are covered');
    sections.push('');
    sections.push('When complete, include [TASK_COMPLETE] in your response with a test summary.');

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

    // Alternative completion phrases for testing
    const completionPhrases = [
      'tests complete',
      'test implementation complete',
      'all tests have been written',
      'testing is complete',
      'test coverage complete',
      'tests are ready',
      'test suite is complete',
    ];

    return completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }

  /**
   * Override continuation prompt for tester-specific guidance
   */
  protected getContinuationPrompt(): string {
    return `Please continue writing tests.
If you need to add more test cases, provide them in the same format.
If you have completed all tests, include [TASK_COMPLETE] with a summary of:
1. All test files created
2. Number of test cases per file
3. Test categories covered (unit, integration, edge cases)
4. Any test scenarios that still need coverage`;
  }

  /**
   * Suggest a test file name based on the source file
   *
   * @param sourceFile - The source file path
   * @returns Suggested test file path
   */
  private suggestTestFileName(sourceFile: string): string {
    // Replace .ts with .test.ts
    if (sourceFile.endsWith('.ts') && !sourceFile.endsWith('.test.ts')) {
      return sourceFile.replace(/\.ts$/, '.test.ts');
    }
    // Replace .tsx with .test.tsx
    if (sourceFile.endsWith('.tsx') && !sourceFile.endsWith('.test.tsx')) {
      return sourceFile.replace(/\.tsx$/, '.test.tsx');
    }
    // Replace .js with .test.js
    if (sourceFile.endsWith('.js') && !sourceFile.endsWith('.test.js')) {
      return sourceFile.replace(/\.js$/, '.test.js');
    }
    // Replace .jsx with .test.jsx
    if (sourceFile.endsWith('.jsx') && !sourceFile.endsWith('.test.jsx')) {
      return sourceFile.replace(/\.jsx$/, '.test.jsx');
    }
    // Default: append .test before extension
    const lastDotIndex = sourceFile.lastIndexOf('.');
    if (lastDotIndex > 0) {
      return `${sourceFile.slice(0, lastDotIndex)}.test${sourceFile.slice(lastDotIndex)}`;
    }
    return `${sourceFile}.test`;
  }
}
