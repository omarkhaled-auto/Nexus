// TaskSchemaAdapter - Convert between GSD XML task format and Nexus Task interface
// Hotfix #5 - Issue 1

import type { TaskType } from '../types/task';
import type { PlanningTask } from '../planning/types';

/**
 * Validation result for task schema validation
 */
export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * GSD Task parsed from XML
 */
export interface GSDTask {
  type: 'auto' | 'checkpoint' | 'tdd';
  tdd: boolean;
  action: string;
  files: string[];
  done: string;
  verify: string;
  gate?: 'blocking' | 'advisory';
}

/**
 * TaskSchemaAdapter converts between GSD XML plan format and Nexus Task interface.
 *
 * GSD XML format example:
 * ```xml
 * <task type="auto" tdd="true">
 *   <action>Create login endpoint</action>
 *   <files>src/api/auth/login.ts</files>
 *   <done>Valid credentials return cookie, invalid return 401</done>
 *   <verify>curl -X POST localhost:3000/api/auth/login returns 200</verify>
 * </task>
 * ```
 *
 * Maps to Nexus Task:
 * - type attribute → Task.type ('auto' | 'checkpoint' | 'tdd')
 * - <action> → Task.description
 * - <files> → Task.files
 * - <done> → Task.acceptanceCriteria
 * - <verify> → Task.verificationCommand
 */
export class TaskSchemaAdapter {
  /**
   * Convert GSD XML plan content to Nexus tasks
   */
  fromGSDPlan(xmlContent: string): PlanningTask[] {
    if (!xmlContent || xmlContent.trim() === '') {
      return [];
    }

    const tasks: PlanningTask[] = [];

    // Find all <task> elements using regex (simple XML parsing)
    const taskRegex = /<task\s+([^>]*)>([\s\S]*?)<\/task>/gi;
    let match: RegExpExecArray | null;
    let taskIndex = 0;

    while ((match = taskRegex.exec(xmlContent)) !== null) {
      // match[1] and match[2] are guaranteed to be strings since they matched our regex groups
      const attributes = match[1];
      const content = match[2];

      try {
        const gsdTask = this.parseGSDTask(`<task ${attributes}>${content}</task>`);
        const planningTask = this.gsdTaskToPlanningTask(gsdTask, taskIndex);
        tasks.push(planningTask);
        taskIndex++;
      } catch {
        // Skip malformed tasks
        continue;
      }
    }

    return tasks;
  }

  /**
   * Convert Nexus tasks to GSD XML format
   */
  toGSDPlan(tasks: PlanningTask[]): string {
    if (tasks.length === 0) {
      return '<tasks>\n</tasks>';
    }

    const taskElements = tasks.map(task => this.planningTaskToXML(task));
    return `<tasks>\n${taskElements.join('\n')}\n</tasks>`;
  }

  /**
   * Parse single GSD task element
   */
  parseGSDTask(taskElement: string): GSDTask {
    if (!taskElement || taskElement.trim() === '') {
      throw new Error('Empty task element');
    }

    // Parse type attribute
    const typeMatch = taskElement.match(/type="([^"]+)"/);
    const type = this.parseTaskType(typeMatch?.[1] ?? 'auto');

    // Parse tdd attribute
    const tddMatch = taskElement.match(/tdd="([^"]+)"/);
    const tdd = tddMatch?.[1] === 'true';

    // Parse gate attribute (for checkpoints)
    const gateMatch = taskElement.match(/gate="([^"]+)"/);
    const gate = gateMatch?.[1] as 'blocking' | 'advisory' | undefined;

    // Parse action element
    const actionMatch = taskElement.match(/<action>([\s\S]*?)<\/action>/i);
    const action = this.cleanXMLContent(actionMatch?.[1] ?? '');

    // Parse files element (can be comma-separated or multiple elements)
    const filesMatch = taskElement.match(/<files>([\s\S]*?)<\/files>/i);
    const filesContent = this.cleanXMLContent(filesMatch?.[1] ?? '');
    const files = filesContent ? filesContent.split(',').map(f => f.trim()).filter(Boolean) : [];

    // Parse done element (acceptance criteria)
    const doneMatch = taskElement.match(/<done>([\s\S]*?)<\/done>/i);
    const done = this.cleanXMLContent(doneMatch?.[1] ?? '');

    // Parse verify element
    const verifyMatch = taskElement.match(/<verify>([\s\S]*?)<\/verify>/i);
    const verify = this.cleanXMLContent(verifyMatch?.[1] ?? '');

    return {
      type,
      tdd,
      action,
      files,
      done,
      verify,
      gate,
    };
  }

  /**
   * Validate task against schema requirements
   */
  validateTask(task: PlanningTask): TaskValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!task.id) {
      errors.push('Task must have an id');
    }

    if (!task.name || task.name.trim() === '') {
      errors.push('Task must have a name');
    }

    if (!task.description || task.description.trim() === '') {
      errors.push('Task must have a description');
    }

    // Size validation
    if (task.estimatedMinutes > 30) {
      errors.push(`Task exceeds 30-minute limit: ${task.estimatedMinutes} minutes`);
    }

    if (task.estimatedMinutes < 5) {
      warnings.push(`Task is very small: ${task.estimatedMinutes} minutes (minimum recommended: 5)`);
    }

    // Type validation
    const validTypes: TaskType[] = ['auto', 'checkpoint', 'tdd'];
    if (!validTypes.includes(task.type)) {
      errors.push(`Invalid task type: ${task.type}`);
    }

    // TDD tasks should have test criteria
    if (task.type === 'tdd' && task.testCriteria.length === 0) {
      warnings.push('TDD task should have test criteria defined');
    }

    // Checkpoint tasks should have description
    if (task.type === 'checkpoint' && (!task.description || task.description.length < 10)) {
      warnings.push('Checkpoint task should have a detailed description');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Convert GSD task to planning task
   */
  private gsdTaskToPlanningTask(gsdTask: GSDTask, index: number): PlanningTask {
    // Determine final type (tdd attribute overrides type for auto tasks)
    let type: TaskType = gsdTask.type;
    if (gsdTask.tdd && gsdTask.type === 'auto') {
      type = 'tdd';
    }

    // Handle checkpoint types (checkpoint:human-verify, checkpoint:decision, etc.)
    if (gsdTask.type === 'checkpoint') {
      type = 'checkpoint';
    }

    // Estimate time based on content
    const estimatedMinutes = this.estimateTaskTime(gsdTask);

    // Generate test criteria from done criteria
    const testCriteria = gsdTask.done ? [gsdTask.done] : [];
    if (gsdTask.verify) {
      testCriteria.push(`Verify: ${gsdTask.verify}`);
    }

    return {
      id: `task-${index + 1}`,
      name: this.generateTaskName(gsdTask.action, index),
      description: gsdTask.action,
      type,
      size: estimatedMinutes <= 15 ? 'atomic' : 'small',
      estimatedMinutes,
      dependsOn: [],
      files: gsdTask.files,
      testCriteria,
    };
  }

  /**
   * Convert planning task to GSD XML
   */
  private planningTaskToXML(task: PlanningTask): string {
    const typeAttr = task.type;
    const tddAttr = task.type === 'tdd' ? ' tdd="true"' : '';

    const files = task.files.length > 0
      ? `\n    <files>${task.files.join(', ')}</files>`
      : '';

    const done = task.testCriteria.length > 0
      ? `\n    <done>${task.testCriteria[0]}</done>`
      : '';

    const verify = task.testCriteria.length > 1
      ? `\n    <verify>${task.testCriteria.slice(1).join('; ')}</verify>`
      : '';

    return `  <task type="${typeAttr}"${tddAttr}>
    <action>${this.escapeXML(task.description)}</action>${files}${done}${verify}
  </task>`;
  }

  /**
   * Parse task type from string, handling checkpoint variants
   */
  private parseTaskType(typeStr: string): 'auto' | 'checkpoint' | 'tdd' {
    const normalized = typeStr.toLowerCase().trim();

    if (normalized === 'tdd') {
      return 'tdd';
    }

    if (normalized.startsWith('checkpoint')) {
      return 'checkpoint';
    }

    return 'auto';
  }

  /**
   * Estimate task time based on content
   */
  private estimateTaskTime(gsdTask: GSDTask): number {
    let minutes = 15; // Base estimate

    // Adjust based on file count
    const fileCount = gsdTask.files.length;
    if (fileCount === 0) {
      minutes = 10;
    } else if (fileCount === 1) {
      minutes = 15;
    } else if (fileCount <= 3) {
      minutes = 20;
    } else {
      minutes = 25;
    }

    // TDD tasks take longer
    if (gsdTask.tdd) {
      minutes = Math.min(30, minutes + 10);
    }

    // Checkpoint tasks are usually quick
    if (gsdTask.type === 'checkpoint') {
      minutes = 5;
    }

    // Ensure within bounds
    return Math.min(30, Math.max(5, minutes));
  }

  /**
   * Generate task name from action
   */
  private generateTaskName(action: string, index: number): string {
    if (!action) {
      return `Task ${index + 1}`;
    }

    // Take first 50 chars, clean up
    const name = action
      .replace(/[<>]/g, '')
      .substring(0, 50)
      .trim();

    return name || `Task ${index + 1}`;
  }

  /**
   * Clean XML content (remove extra whitespace, decode entities)
   */
  private cleanXMLContent(content: string): string {
    if (!content) return '';

    return content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Escape content for XML
   */
  private escapeXML(content: string): string {
    if (!content) return '';

    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export singleton instance
export const taskSchemaAdapter = new TaskSchemaAdapter();
