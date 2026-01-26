/**
 * TaskDecomposer Implementation
 *
 * Decomposes features into atomic, 30-minute-or-less tasks using Claude.
 * Implements ITaskDecomposer interface for NexusCoordinator integration.
 *
 * Phase 14B: Execution Bindings Implementation
 */

import { v4 as uuidv4 } from 'uuid';
import type { LLMClient } from '../../llm/types';
import type {
  ITaskDecomposer,
  PlanningTask,
  TaskSize,
  DecompositionOptions,
  TaskValidationResult,
} from '../types';
import type { TaskType } from '../../types/task';

// ============================================================================
// System Prompts
// ============================================================================

const DECOMPOSITION_SYSTEM_PROMPT = `You are a senior technical architect. Your job is to decompose features into atomic, implementable tasks.

## CRITICAL CONSTRAINTS
1. **30-MINUTE RULE**: Every task MUST be completable in 30 minutes or less. This is NON-NEGOTIABLE.
2. **5-FILE LIMIT**: Each task should modify at most 5 files.
3. **ATOMIC**: Each task must be independently testable and verifiable.
4. **DEPENDENCIES**: Explicitly declare dependencies between tasks using task names.

## OUTPUT FORMAT
Respond with ONLY a valid JSON array (no markdown code blocks, no explanation):
[
  {
    "name": "Short task name",
    "description": "Detailed description of what to implement",
    "files": ["src/path/to/file.ts"],
    "testCriteria": ["Criterion 1", "Criterion 2"],
    "dependsOn": [],
    "estimatedMinutes": 20
  }
]

## DECOMPOSITION STRATEGY
1. Start with types/interfaces (foundation)
2. Then infrastructure/utilities
3. Then core implementation
4. Then integration/wiring
5. Finally tests if not included in each task

## SIZE GUIDELINES
- atomic: 1-10 minutes (single function, small fix)
- small: 10-20 minutes (single file, simple feature)
- medium: 20-30 minutes (multi-file, moderate complexity)
- Never create tasks over 30 minutes - split them instead`;

const SPLIT_SYSTEM_PROMPT = `You are splitting an oversized task into smaller, atomic tasks.

## RULES
1. Each resulting task must be under 30 minutes
2. Maintain logical dependencies between split tasks
3. Preserve all functionality from the original task
4. Keep file changes focused per task

## OUTPUT FORMAT
Respond with ONLY a valid JSON array (no markdown code blocks, no explanation):
[
  {
    "name": "Short task name",
    "description": "Detailed description",
    "files": ["src/path/to/file.ts"],
    "testCriteria": ["Criterion 1"],
    "dependsOn": [],
    "estimatedMinutes": 20
  }
]`;

// ============================================================================
// TaskDecomposer Implementation
// ============================================================================

/**
 * Configuration for TaskDecomposer
 */
export interface TaskDecomposerConfig {
  /** Maximum minutes per task (default: 30) */
  maxTaskMinutes?: number;
  /** Maximum files per task (default: 5) */
  maxFilesPerTask?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Raw task format from LLM response
 */
interface RawTask {
  name: string;
  description: string;
  files?: string[];
  testCriteria?: string[];
  dependsOn?: string[];
  estimatedMinutes?: number;
}

/**
 * TaskDecomposer - Decomposes features into atomic tasks using an LLM
 *
 * This implementation:
 * - Actually calls an LLMClient (Claude or CLI) to decompose features
 * - Enforces the 30-minute rule
 * - Validates task size and can split oversized tasks
 * - Resolves internal dependencies (task names to IDs)
 */
export class TaskDecomposer implements ITaskDecomposer {
  private llmClient: LLMClient;
  private config: Required<TaskDecomposerConfig>;

  constructor(llmClient: LLMClient, config?: TaskDecomposerConfig) {
    this.llmClient = llmClient;
    this.config = {
      maxTaskMinutes: config?.maxTaskMinutes ?? 30,
      maxFilesPerTask: config?.maxFilesPerTask ?? 5,
      verbose: config?.verbose ?? false,
    };
  }

  /**
   * Decompose a feature description into atomic tasks
   * This is the main method used by NexusCoordinator
   */
  async decompose(
    featureDescription: string,
    options?: DecompositionOptions
  ): Promise<PlanningTask[]> {
    const prompt = this.buildDecompositionPrompt(featureDescription, options);

    // Call Claude for decomposition
    // System prompt is passed as a message with role 'system'
    // disableTools: true for chat-only mode (prevents Claude CLI tool errors)
    const response = await this.llmClient.chat(
      [
        { role: 'system', content: DECOMPOSITION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: 4000,
        temperature: 0.3, // Lower temperature for more consistent structure
        disableTools: true, // Chat-only mode for decomposition
      }
    );

    // Parse the response into raw tasks
    const rawTasks = this.parseJsonResponse<RawTask[]>(response.content);

    // Convert to PlanningTask objects with proper IDs
    const tasks = rawTasks.map((raw, index) =>
      this.createPlanningTask(raw, index, options)
    );

    // Validate and split oversized tasks
    const validatedTasks = await this.validateAndSplitTasks(tasks);

    // Resolve internal dependencies (convert names to IDs)
    const resolvedTasks = this.resolveInternalDependencies(validatedTasks);

    if (this.config.verbose) {
      console.log(`Decomposed feature into ${resolvedTasks.length} tasks`);
    }

    return resolvedTasks;
  }

  /**
   * Validate that a task meets size requirements
   */
  validateTaskSize(task: PlanningTask): TaskValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check time limit
    if (task.estimatedMinutes > this.config.maxTaskMinutes) {
      errors.push(
        `Task exceeds ${this.config.maxTaskMinutes}-minute limit ` +
          `(estimated: ${task.estimatedMinutes} min)`
      );
    }

    // Check file count
    if (task.files.length > this.config.maxFilesPerTask) {
      errors.push(
        `Task modifies too many files (${task.files.length}, ` +
          `max ${this.config.maxFilesPerTask})`
      );
    }

    // Check for test criteria
    if (!task.testCriteria || task.testCriteria.length === 0) {
      warnings.push('Task has no test criteria defined');
    }

    // Check for description
    if (!task.description || task.description.length < 10) {
      warnings.push('Task description is too brief');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Split an oversized task into smaller tasks
   */
  async splitTask(task: PlanningTask): Promise<PlanningTask[]> {
    const prompt = this.buildSplitPrompt(task);

    // System prompt is passed as a message with role 'system'
    // disableTools: true for chat-only mode (prevents Claude CLI tool errors)
    const response = await this.llmClient.chat(
      [
        { role: 'system', content: SPLIT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: 2000,
        temperature: 0.3,
        disableTools: true, // Chat-only mode for task splitting
      }
    );

    const rawTasks = this.parseJsonResponse<RawTask[]>(response.content);

    return rawTasks.map((raw, index) =>
      this.createPlanningTask(raw, index, undefined, task.id)
    );
  }

  /**
   * Estimate time for a task based on heuristics
   */
  estimateTime(task: PlanningTask): number {
    let estimate = 10; // Base time in minutes

    // Add time based on file count
    estimate += task.files.length * 5;

    // Add time based on description complexity (word count)
    const wordCount = task.description.split(/\s+/).length;
    estimate += Math.min(wordCount / 10, 10);

    // Add time if test criteria exist (suggests testing work)
    if (task.testCriteria.length > 0) {
      estimate += task.testCriteria.length * 2;
    }

    // Complexity-based adjustment
    const complexity = this.assessComplexity(task);
    if (complexity === 'high') {
      estimate *= 1.5;
    } else if (complexity === 'low') {
      estimate *= 0.7;
    }

    // Cap at max and round
    return Math.min(Math.round(estimate), this.config.maxTaskMinutes);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build the decomposition prompt
   */
  private buildDecompositionPrompt(
    featureDescription: string,
    options?: DecompositionOptions
  ): string {
    let prompt = `Decompose this feature into atomic tasks:\n\n`;
    prompt += `## Feature Description\n${featureDescription}\n\n`;

    if (options?.contextFiles && options.contextFiles.length > 0) {
      prompt += `## Context Files\n`;
      options.contextFiles.forEach((file) => {
        prompt += `- ${file}\n`;
      });
      prompt += '\n';
    }

    if (options?.useTDD) {
      prompt += `## Approach\nUse TDD (Test-Driven Development) - write tests first.\n\n`;
    }

    prompt += `Remember: Each task MUST be under ${options?.maxTaskMinutes ?? 30} minutes. Split larger tasks.`;

    return prompt;
  }

  /**
   * Build the split prompt for oversized tasks
   */
  private buildSplitPrompt(task: PlanningTask): string {
    return `This task is too large (${task.estimatedMinutes} minutes, max 30). Split it into smaller tasks:

Task: ${task.name}
Description: ${task.description}
Files: ${task.files.join(', ')}
Test Criteria: ${task.testCriteria.join('; ')}

Return a JSON array of smaller tasks, each under 30 minutes.`;
  }

  /**
   * Parse JSON response from LLM, handling various formats
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Type is used for caller inference
  private parseJsonResponse<T>(response: string): T {
    try {
      // Try to extract JSON array from response
      // Handle both raw JSON and markdown code blocks
      let jsonString = response.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }

      // Find JSON array in the response
      const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        throw new Error('No JSON array found in response');
      }

      return JSON.parse(arrayMatch[0]) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse decomposition response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a PlanningTask from raw LLM output
   */
  private createPlanningTask(
    raw: RawTask,
    index: number,
    options?: DecompositionOptions,
    parentId?: string
  ): PlanningTask {
    const id = uuidv4();
    const estimatedMinutes =
      raw.estimatedMinutes ?? this.estimateTimeFromRaw(raw);

    return {
      id,
      name: raw.name || `Task ${index + 1}`,
      description: raw.description || '',
      type: (options?.useTDD ? 'tdd' : 'auto') as TaskType,
      size: this.categorizeSize(estimatedMinutes),
      estimatedMinutes,
      dependsOn: raw.dependsOn || [],
      testCriteria: raw.testCriteria || [],
      files: raw.files || [],
      // Store parentId for reference if this was split from another task
      ...(parentId && { parentId }),
    };
  }

  /**
   * Estimate time from raw task data (before full conversion)
   */
  private estimateTimeFromRaw(raw: RawTask): number {
    let estimate = 10;
    estimate += (raw.files?.length || 1) * 5;
    const wordCount = (raw.description || '').split(/\s+/).length;
    estimate += Math.min(wordCount / 10, 10);
    return Math.min(Math.round(estimate), this.config.maxTaskMinutes);
  }

  /**
   * Categorize task size based on estimated minutes
   */
  private categorizeSize(minutes: number): TaskSize {
    if (minutes <= 10) return 'atomic';
    if (minutes <= 20) return 'small';
    if (minutes <= 30) return 'medium';
    return 'large';
  }

  /**
   * Assess task complexity based on keywords
   */
  private assessComplexity(task: PlanningTask): 'low' | 'medium' | 'high' {
    const text = `${task.name} ${task.description}`.toLowerCase();

    const highIndicators = [
      'algorithm',
      'optimize',
      'refactor',
      'complex',
      'integration',
      'security',
      'authentication',
      'encryption',
      'migration',
      'state machine',
      'concurrent',
      'parallel',
      'async',
      'distributed',
    ];

    const lowIndicators = [
      'rename',
      'move',
      'delete',
      'simple',
      'basic',
      'typo',
      'comment',
      'format',
      'lint',
      'config',
      'update dependency',
      'add import',
    ];

    const highCount = highIndicators.filter((i) => text.includes(i)).length;
    const lowCount = lowIndicators.filter((i) => text.includes(i)).length;

    if (highCount >= 2) return 'high';
    if (lowCount >= 2) return 'low';
    return 'medium';
  }

  /**
   * Validate all tasks and split any that are too large
   */
  private async validateAndSplitTasks(
    tasks: PlanningTask[]
  ): Promise<PlanningTask[]> {
    const result: PlanningTask[] = [];

    for (const task of tasks) {
      const validation = this.validateTaskSize(task);

      if (validation.valid) {
        result.push(task);
      } else if (task.estimatedMinutes > this.config.maxTaskMinutes) {
        // Task too large - split it
        if (this.config.verbose) {
          console.log(
            `Splitting oversized task "${task.name}" ` +
              `(${task.estimatedMinutes} min)`
          );
        }
        const splitTasks = await this.splitTask(task);
        result.push(...splitTasks);
      } else {
        // Other validation issues - keep task but log warning
        if (this.config.verbose) {
          console.warn(
            `Task "${task.name}" has issues: ${validation.errors.join(', ')}`
          );
        }
        result.push(task);
      }
    }

    return result;
  }

  /**
   * Resolve internal dependencies (convert task names to IDs)
   */
  private resolveInternalDependencies(tasks: PlanningTask[]): PlanningTask[] {
    // Build name-to-id map (case-insensitive)
    const nameToId = new Map<string, string>();
    for (const task of tasks) {
      nameToId.set(task.name.toLowerCase().trim(), task.id);
    }

    // Resolve dependencies
    return tasks.map((task) => ({
      ...task,
      dependsOn: task.dependsOn.map((dep) => {
        // If dep is already a UUID, keep it
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(dep)) return dep;

        // Otherwise, try to resolve by name
        const resolvedId = nameToId.get(dep.toLowerCase().trim());
        if (resolvedId) return resolvedId;

        // If not found, keep original (might be external dependency)
        if (this.config.verbose) {
          console.warn(`Could not resolve dependency "${dep}" for task "${task.name}"`);
        }
        return dep;
      }),
    }));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TaskDecomposer instance
 */
export function createTaskDecomposer(
  llmClient: LLMClient,
  config?: TaskDecomposerConfig
): TaskDecomposer {
  return new TaskDecomposer(llmClient, config);
}
