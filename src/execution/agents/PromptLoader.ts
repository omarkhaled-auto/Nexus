// PromptLoader - Load system prompts from config/prompts/*.md files
// Phase 03 Hotfix #4: Single source of truth for system prompts

import { readFileSync, existsSync } from 'fs';
import { join } from 'pathe';
import type { AgentType } from './types';

/**
 * Cache for loaded prompts to avoid repeated file reads
 */
const promptCache = new Map<AgentType, string>();

/**
 * Default prompts as fallback if files don't exist
 */
const DEFAULT_PROMPTS: Record<Exclude<AgentType, 'planner'>, string> = {
  coder: `You are a skilled software engineer focused on code generation and modification.

## Role
You write clean, maintainable, well-tested code following established patterns and best practices.

## Capabilities
You have access to the following tools:
- **read_file**: Read file contents to understand existing code
- **write_file**: Create new files with complete content
- **edit_file**: Modify existing files with targeted edits
- **run_command**: Execute shell commands (build, test, lint)
- **search_code**: Search for patterns across the codebase

## Process
1. Read relevant existing files to understand context
2. Implement changes using write_file or edit_file
3. Run build/typecheck to verify code compiles
4. Report what was accomplished`,

  tester: `You are a test engineer focused on writing comprehensive tests.

## Role
You write thorough tests that cover edge cases and ensure code correctness.

## Capabilities
- **read_file**: Read source code to understand what to test
- **write_file**: Create test files
- **run_command**: Execute tests to verify they pass`,

  reviewer: `You are a code reviewer focused on quality and correctness.

## Role
You review code for bugs, security issues, and best practices.

## Capabilities
- **read_file**: Read code to review
- **search_code**: Search for patterns across the codebase

Output a structured review with issues categorized by severity.`,

  merger: `You are a merge specialist focused on branch integration.

## Role
You merge branches and resolve conflicts while preserving functionality.

## Capabilities
- **git_diff**: View differences between branches
- **git_merge**: Merge branches
- **git_status**: Check repository status
- **read_file**: Read files to understand conflicts
- **write_file**: Write resolved conflict content`,
};

/**
 * Get the base path for config/prompts directory.
 * Handles both development and production environments.
 */
function getPromptsBasePath(): string {
  // Try common locations
  const candidates = [
    join(process.cwd(), 'config', 'prompts'),
    join(__dirname, '..', '..', '..', 'config', 'prompts'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Default to cwd-based path
  return join(process.cwd(), 'config', 'prompts');
}

/**
 * Load a system prompt for an agent type.
 *
 * Priority:
 * 1. Cached value (if available)
 * 2. config/prompts/{agentType}.md file
 * 3. Built-in default fallback
 *
 * @param agentType - The type of agent to load prompt for
 * @returns The system prompt string
 */
export function loadPrompt(agentType: AgentType): string {
  // Check cache first
  const cached = promptCache.get(agentType);
  if (cached) {
    return cached;
  }

  // Note: planner doesn't have a dedicated prompt file yet
  if (agentType === 'planner') {
    return 'You are an expert software architect and planner.';
  }

  // Try to load from file
  const basePath = getPromptsBasePath();
  const promptPath = join(basePath, `${agentType}.md`);

  let prompt: string;

  if (existsSync(promptPath)) {
    try {
      prompt = readFileSync(promptPath, 'utf-8');
      // Remove markdown title line if present (e.g., "# Coder Agent System Prompt")
      prompt = prompt.replace(/^#\s+.*\n+/, '');
    } catch {
      // Fall back to default if read fails
      prompt = DEFAULT_PROMPTS[agentType as keyof typeof DEFAULT_PROMPTS];
    }
  } else {
    // Use built-in default
    prompt = DEFAULT_PROMPTS[agentType as keyof typeof DEFAULT_PROMPTS];
  }

  // Cache the result
  promptCache.set(agentType, prompt);

  return prompt;
}

/**
 * Clear the prompt cache.
 * Useful for testing or when prompts are updated at runtime.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

/**
 * Preload all prompts into cache.
 * Call this at startup to avoid file I/O during execution.
 */
export function preloadPrompts(): void {
  const agentTypes: AgentType[] = ['planner', 'coder', 'tester', 'reviewer', 'merger'];
  for (const agentType of agentTypes) {
    loadPrompt(agentType);
  }
}
