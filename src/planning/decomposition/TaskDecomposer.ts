// TaskDecomposer - Feature to Task Breakdown
// Phase 04-01: Planning Layer Implementation

import type { Feature, SubFeature } from '../../types/core';
import type { LLMClient, Message } from '../../llm/types';
import type {
  PlanningTask,
  ValidationResult,
  ValidationIssue,
  ITaskDecomposer,
  DecompositionResult,
} from '../types';
import {
  MAX_TASK_MINUTES,
  MIN_TASK_MINUTES,
  DecompositionError,
} from '../types';

export interface TaskDecomposerOptions {
  llmClient: LLMClient;
}

/**
 * TaskDecomposer uses LLM to intelligently break features into atomic tasks.
 *
 * Key responsibilities:
 * - Decompose features into 30-minute maximum atomic tasks
 * - Validate task size and scope
 * - Auto-split oversized tasks
 * - Preserve dependency chains
 */
export class TaskDecomposer implements ITaskDecomposer {
  private llmClient: LLMClient;

  constructor(options: TaskDecomposerOptions) {
    this.llmClient = options.llmClient;
  }

  /**
   * Decompose a feature into atomic tasks using LLM
   */
  async decompose(feature: Feature): Promise<PlanningTask[]> {
    try {
      const prompt = this.buildDecomposePrompt(feature);
      const messages: Message[] = [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ];

      const response = await this.llmClient.chat(messages, { maxTokens: 4000 });
      const result = this.parseDecompositionResponse(response.content);

      // Validate and auto-split oversized tasks
      const validatedTasks = await this.validateAndSplitTasks(result.tasks);

      return validatedTasks;
    } catch (error) {
      if (error instanceof DecompositionError) {
        throw error;
      }
      throw new DecompositionError(
        'Failed to decompose feature: ' + (error instanceof Error ? error.message : 'Unknown error'),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decompose a sub-feature into atomic tasks
   */
  async decomposeSubFeature(subFeature: SubFeature): Promise<PlanningTask[]> {
    try {
      const prompt = this.buildSubFeaturePrompt(subFeature);
      const messages: Message[] = [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ];

      const response = await this.llmClient.chat(messages, { maxTokens: 4000 });
      const result = this.parseDecompositionResponse(response.content);

      const validatedTasks = await this.validateAndSplitTasks(result.tasks);
      return validatedTasks;
    } catch (error) {
      if (error instanceof DecompositionError) {
        throw error;
      }
      throw new DecompositionError(
        'Failed to decompose sub-feature: ' + (error instanceof Error ? error.message : 'Unknown error'),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate task size and scope
   */
  validateTaskSize(task: PlanningTask): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check time estimate
    if (task.estimatedMinutes > MAX_TASK_MINUTES) {
      issues.push({
        code: 'too_large',
        message: `Task estimated at ${String(task.estimatedMinutes)} minutes exceeds maximum of ${String(MAX_TASK_MINUTES)} minutes`,
        suggestion: 'Split this task into smaller subtasks',
      });
    }

    // Check for test criteria
    if (!task.testCriteria || task.testCriteria.length === 0) {
      issues.push({
        code: 'no_test_criteria',
        message: 'Task has no test criteria defined',
        suggestion: 'Add specific, testable criteria for this task',
      });
    }

    // Check for clear scope (files)
    if (!task.files || task.files.length === 0) {
      issues.push({
        code: 'no_scope',
        message: 'Task has no files specified',
        suggestion: 'Specify which files this task will create or modify',
      });
    }

    // Check for multi-concern (too many files)
    if (task.files && task.files.length > 3) {
      issues.push({
        code: 'multi_concern',
        message: `Task touches ${String(task.files.length)} files, which may indicate multiple concerns`,
        suggestion: 'Consider splitting into separate tasks for each concern',
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Split an oversized task into smaller tasks using LLM
   */
  async splitTask(task: PlanningTask): Promise<PlanningTask[]> {
    try {
      const prompt = this.buildSplitPrompt(task);
      const messages: Message[] = [
        { role: 'system', content: this.getSplitSystemPrompt() },
        { role: 'user', content: prompt },
      ];

      const response = await this.llmClient.chat(messages, { maxTokens: 2000 });
      const result = this.parseDecompositionResponse(response.content);

      // Ensure split tasks have parentTaskId set
      return result.tasks.map(t => ({
        ...t,
        parentTaskId: t.parentTaskId || task.id,
      }));
    } catch (error) {
      throw new DecompositionError(
        'Failed to split task: ' + (error instanceof Error ? error.message : 'Unknown error'),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get time estimate for a task (bounded to valid range)
   */
  estimateTime(task: PlanningTask): number {
    const estimate = task.estimatedMinutes;

    // Cap at maximum
    if (estimate > MAX_TASK_MINUTES) {
      return MAX_TASK_MINUTES;
    }

    // Enforce minimum
    if (estimate < MIN_TASK_MINUTES) {
      return MIN_TASK_MINUTES;
    }

    return estimate;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getSystemPrompt(): string {
    return `You are a task decomposition expert. Your job is to break down features into atomic, implementable tasks.

Rules for task creation:
1. Each task must be completable in 5-30 minutes
2. Each task must have clear test criteria
3. Each task should touch 1-3 files maximum
4. Tasks must have explicit dependencies if they depend on other tasks
5. Use task types: 'auto' for automated tasks, 'tdd' for test-driven tasks, 'checkpoint' for human review

Output Format (JSON):
{
  "tasks": [
    {
      "id": "task-1",
      "name": "Clear task name",
      "description": "What this task accomplishes",
      "type": "auto|tdd|checkpoint",
      "size": "atomic|small",
      "estimatedMinutes": 15,
      "dependsOn": [],
      "testCriteria": ["Specific testable criteria"],
      "files": ["src/file.ts"]
    }
  ],
  "subFeatures": [
    {
      "id": "sub-1",
      "name": "SubFeature name",
      "description": "SubFeature description",
      "taskIds": ["task-1", "task-2"]
    }
  ]
}`;
  }

  private getSplitSystemPrompt(): string {
    return `You are a task splitting expert. Given an oversized task, split it into smaller subtasks.

Rules:
1. Each subtask must be 30 minutes or less
2. Preserve the original task's intent across subtasks
3. Create dependency chains between sequential subtasks
4. Set parentTaskId to the original task's ID
5. Ensure test criteria are distributed appropriately

Output the same JSON format as decomposition, but with tasks that reference the parent.`;
  }

  private buildDecomposePrompt(feature: Feature): string {
    return `Decompose this feature into atomic tasks:

Feature: ${feature.name}
Description: ${feature.description}
Complexity: ${feature.complexity}
Priority: ${feature.priority}

${feature.complexity === 'complex' ? 'This is a complex feature - first identify logical sub-features, then create tasks for each.' : 'Create tasks directly for this simple feature.'}

Return JSON with tasks array (and subFeatures if complex).`;
  }

  private buildSubFeaturePrompt(subFeature: SubFeature): string {
    return `Decompose this sub-feature into atomic tasks:

SubFeature: ${subFeature.name}
Description: ${subFeature.description}
Parent Feature ID: ${subFeature.featureId}

Return JSON with tasks array.`;
  }

  private buildSplitPrompt(task: PlanningTask): string {
    return `Split this oversized task into smaller subtasks:

Task ID: ${task.id}
Name: ${task.name}
Description: ${task.description}
Current Estimate: ${String(task.estimatedMinutes)} minutes (needs to be <= 30 min each)
Test Criteria: ${JSON.stringify(task.testCriteria)}
Files: ${JSON.stringify(task.files)}

Split into subtasks where each is 30 minutes or less. Maintain dependencies between the split parts.`;
  }

  private parseDecompositionResponse(content: string): DecompositionResult {
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { tasks: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        tasks?: unknown[];
        subFeatures?: unknown[];
      };

      // Validate and normalize tasks
      const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      const tasks: PlanningTask[] = rawTasks.map((t: unknown) => {
        const task = t as Record<string, unknown>;
        const taskId = typeof task.id === 'string' ? task.id : `task-${Date.now().toString()}`;
        const taskName = typeof task.name === 'string' ? task.name : 'Unnamed task';
        const taskDesc = typeof task.description === 'string' ? task.description : '';
        const parentId = typeof task.parentTaskId === 'string' ? task.parentTaskId : undefined;
        return {
          id: taskId,
          name: taskName,
          description: taskDesc,
          type: this.normalizeTaskType(task.type),
          size: this.normalizeTaskSize(task.size),
          estimatedMinutes: Number(task.estimatedMinutes) || 15,
          dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn.map(String) : [],
          parentTaskId: parentId,
          testCriteria: Array.isArray(task.testCriteria) ? task.testCriteria.map(String) : [],
          files: Array.isArray(task.files) ? task.files.map(String) : [],
        };
      });

      const subFeatures = Array.isArray(parsed.subFeatures)
        ? parsed.subFeatures.map((sf: unknown) => {
            const sub = sf as Record<string, unknown>;
            return {
              id: String(sub.id),
              name: String(sub.name),
              description: String(sub.description),
              taskIds: Array.isArray(sub.taskIds) ? sub.taskIds.map(String) : [],
            };
          })
        : undefined;

      return { tasks, subFeatures };
    } catch {
      return { tasks: [] };
    }
  }

  private normalizeTaskType(type: unknown): 'auto' | 'tdd' | 'checkpoint' {
    if (type === 'auto' || type === 'tdd' || type === 'checkpoint') {
      return type;
    }
    return 'auto';
  }

  private normalizeTaskSize(size: unknown): 'atomic' | 'small' {
    if (size === 'atomic' || size === 'small') {
      return size;
    }
    return 'atomic';
  }

  private async validateAndSplitTasks(tasks: PlanningTask[]): Promise<PlanningTask[]> {
    const result: PlanningTask[] = [];

    for (const task of tasks) {
      // Check if task needs splitting
      if (task.estimatedMinutes > MAX_TASK_MINUTES) {
        // Split the task
        const splitTasks = await this.splitTask(task);
        result.push(...splitTasks);
      } else {
        result.push(task);
      }
    }

    return result;
  }
}
