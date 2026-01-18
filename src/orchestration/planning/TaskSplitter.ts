/**
 * Task Splitter Implementation
 *
 * Responsible for splitting complex tasks into smaller, more manageable subtasks.
 * Uses various strategies based on the reason for splitting.
 *
 * Layer 2/3: Orchestration / Planning
 *
 * Philosophy:
 * - Complex tasks should be decomposed when they exceed estimates
 * - Splitting should preserve task intent and dependencies
 * - Subtasks should be independently executable
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ITaskSplitter,
  Task,
  ReplanReason,
  ReplanTrigger,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for task splitting behavior
 */
export interface TaskSplitterConfig {
  /** Minimum files per subtask */
  minFilesPerSubtask: number;
  /** Maximum subtasks to create */
  maxSubtasks: number;
  /** File grouping patterns */
  fileGroupPatterns: FileGroupPattern[];
}

/**
 * Pattern for grouping related files
 */
export interface FileGroupPattern {
  /** Pattern name */
  name: string;
  /** Glob patterns that belong together */
  patterns: string[];
  /** Priority (higher = group first) */
  priority: number;
}

/**
 * Default file grouping patterns
 */
const DEFAULT_FILE_GROUP_PATTERNS: FileGroupPattern[] = [
  {
    name: 'tests',
    patterns: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx', '__tests__/**/*'],
    priority: 10,
  },
  {
    name: 'types',
    patterns: ['types.ts', 'types/*.ts', '*.d.ts'],
    priority: 20,
  },
  {
    name: 'components',
    patterns: ['components/**/*', '*.tsx'],
    priority: 30,
  },
  {
    name: 'services',
    patterns: ['services/**/*', '*Service.ts', '*service.ts'],
    priority: 40,
  },
  {
    name: 'utils',
    patterns: ['utils/**/*', 'helpers/**/*', '*utils.ts', '*helpers.ts'],
    priority: 50,
  },
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TaskSplitterConfig = {
  minFilesPerSubtask: 1,
  maxSubtasks: 5,
  fileGroupPatterns: DEFAULT_FILE_GROUP_PATTERNS,
};

// ============================================================================
// Task Splitter Implementation
// ============================================================================

/**
 * Splits complex tasks into smaller subtasks
 *
 * Strategies:
 * - Scope creep: Split by file groups
 * - Complexity discovered: Split by functionality
 * - Time exceeded: Split by estimated time
 *
 * @example
 * ```typescript
 * const splitter = new TaskSplitter();
 * const subtasks = await splitter.split(originalTask, reason);
 * console.log(`Split into ${subtasks.length} subtasks`);
 * ```
 */
export class TaskSplitter implements ITaskSplitter {
  private readonly config: TaskSplitterConfig;

  constructor(config: Partial<TaskSplitterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Public Interface
  // ===========================================================================

  /**
   * Check if a task can be split
   *
   * A task can be split if:
   * - It has at least 2 files
   * - The reason indicates a splittable issue
   * - It hasn't already been split too many times
   */
  canSplit(task: Task, reason: ReplanReason): boolean {
    // Need at least 2 files to split
    if (task.files.length < 2) {
      return false;
    }

    // Check if reason indicates splittable issue
    const splittableTriggers: ReplanTrigger[] = [
      'scope_creep',
      'complexity_discovered',
      'time_exceeded',
      'iterations_high',
    ];

    if (!splittableTriggers.includes(reason.trigger)) {
      return false;
    }

    // Don't split tasks that are already subtasks multiple levels deep
    // (check by looking at name pattern)
    const subtaskDepth = this.getSubtaskDepth(task.name);
    if (subtaskDepth >= 3) {
      return false;
    }

    return true;
  }

  /**
   * Split a task into smaller subtasks
   *
   * Strategy is chosen based on the trigger:
   * - scope_creep: Split by file groups
   * - complexity_discovered: Split by functionality
   * - time_exceeded: Split by estimated time
   * - iterations_high: Split by file groups
   */
  // eslint-disable-next-line @typescript-eslint/require-await -- Interface requires Promise, future LLM integration will use async
  async split(task: Task, reason: ReplanReason): Promise<Task[]> {
    if (!this.canSplit(task, reason)) {
      return [task]; // Return original if can't split
    }

    let subtasks: Task[];

    switch (reason.trigger) {
      case 'scope_creep':
        subtasks = this.splitByFiles(task);
        break;
      case 'complexity_discovered':
        subtasks = this.splitByFunctionality(task, reason);
        break;
      case 'time_exceeded':
        subtasks = this.splitByEstimatedTime(task);
        break;
      case 'iterations_high':
        subtasks = this.splitByFiles(task);
        break;
      default:
        subtasks = this.splitByFiles(task);
    }

    // Distribute acceptance criteria across subtasks
    this.distributeAcceptanceCriteria(task, subtasks);

    // Set up dependency chain
    this.createDependencyChain(subtasks);

    return subtasks;
  }

  /**
   * Estimate how many subtasks a task should be split into
   *
   * Based on file count and complexity indicators
   */
  estimateSubtasks(task: Task): number {
    const fileCount = task.files.length;

    // Base estimate on file count
    let estimate: number;
    if (fileCount <= 3) {
      estimate = 2;
    } else if (fileCount <= 6) {
      estimate = 3;
    } else if (fileCount <= 10) {
      estimate = 4;
    } else {
      estimate = Math.min(5, Math.ceil(fileCount / 3));
    }

    // Cap at maximum
    return Math.min(estimate, this.config.maxSubtasks);
  }

  // ===========================================================================
  // Splitting Strategies
  // ===========================================================================

  /**
   * Split task by grouping related files
   */
  private splitByFiles(task: Task): Task[] {
    const fileGroups = this.groupFiles(task.files);
    const subtasks: Task[] = [];

    // If we only got one group, try to split it further
    if (fileGroups.length === 1) {
      const singleGroup = fileGroups[0];
      const filesPerSubtask = Math.ceil(singleGroup.files.length / 2);
      const chunks = this.chunkArray(singleGroup.files, filesPerSubtask);

      for (let i = 0; i < chunks.length; i++) {
        subtasks.push(
          this.createSubtask(task, i + 1, chunks[i], `Files ${i + 1}`)
        );
      }
    } else {
      // Create subtask for each group
      for (let i = 0; i < fileGroups.length; i++) {
        const group = fileGroups[i];
        subtasks.push(
          this.createSubtask(task, i + 1, group.files, group.name)
        );
      }
    }

    return subtasks;
  }

  /**
   * Split task by functionality (based on code patterns)
   */
  private splitByFunctionality(
    task: Task,
    _reason: ReplanReason
  ): Task[] {
    // Note: _reason parameter reserved for future use with AI-powered splitting

    // Default to splitting by logical units
    const subtasks: Task[] = [];

    // Separate setup/foundation tasks from implementation
    const setupFiles = task.files.filter(
      (f) =>
        f.includes('types') ||
        f.includes('interface') ||
        f.includes('config') ||
        f.includes('constants')
    );

    const testFiles = task.files.filter(
      (f) => f.includes('.test.') || f.includes('.spec.')
    );

    const implFiles = task.files.filter(
      (f) => !setupFiles.includes(f) && !testFiles.includes(f)
    );

    // Create subtasks for each category
    let index = 1;

    if (setupFiles.length > 0) {
      subtasks.push(
        this.createSubtask(task, index++, setupFiles, 'Setup & Types')
      );
    }

    if (implFiles.length > 0) {
      // Further split implementation if there are many files
      if (implFiles.length > 3) {
        const chunks = this.chunkArray(implFiles, Math.ceil(implFiles.length / 2));
        for (const chunk of chunks) {
          subtasks.push(
            this.createSubtask(task, index++, chunk, 'Implementation')
          );
        }
      } else {
        subtasks.push(
          this.createSubtask(task, index++, implFiles, 'Implementation')
        );
      }
    }

    if (testFiles.length > 0) {
      subtasks.push(
        this.createSubtask(task, index++, testFiles, 'Tests')
      );
    }

    // If we didn't create any subtasks, fall back to file-based splitting
    if (subtasks.length === 0) {
      return this.splitByFiles(task);
    }

    return subtasks;
  }

  /**
   * Split task by estimated time into roughly equal chunks
   */
  private splitByEstimatedTime(task: Task): Task[] {
    const targetSubtasks = this.estimateSubtasks(task);
    const filesPerSubtask = Math.ceil(task.files.length / targetSubtasks);

    const subtasks: Task[] = [];
    const chunks = this.chunkArray(task.files, filesPerSubtask);

    for (let i = 0; i < chunks.length; i++) {
      const proportionalTime = (chunks[i].length / task.files.length) * task.estimatedTime;
      const subtask = this.createSubtask(task, i + 1, chunks[i], `Part ${i + 1}`);
      subtask.estimatedTime = Math.round(proportionalTime);
      subtasks.push(subtask);
    }

    return subtasks;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Group files by pattern matching
   */
  private groupFiles(files: string[]): Array<{ name: string; files: string[] }> {
    const groups: Map<string, string[]> = new Map();
    const ungrouped: string[] = [];

    // Sort patterns by priority (highest first)
    const sortedPatterns = [...this.config.fileGroupPatterns].sort(
      (a, b) => b.priority - a.priority
    );

    // Assign files to groups
    for (const file of files) {
      let assigned = false;

      for (const pattern of sortedPatterns) {
        if (this.matchesPattern(file, pattern.patterns)) {
          const existing = groups.get(pattern.name) || [];
          existing.push(file);
          groups.set(pattern.name, existing);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        ungrouped.push(file);
      }
    }

    // Add ungrouped files as their own group if any
    if (ungrouped.length > 0) {
      groups.set('core', ungrouped);
    }

    // Convert to array and filter empty groups
    return Array.from(groups.entries())
      .filter(([_, files]) => files.length >= this.config.minFilesPerSubtask)
      .map(([name, files]) => ({ name, files }));
  }

  /**
   * Check if a file matches any of the patterns
   */
  private matchesPattern(file: string, patterns: string[]): boolean {
    const normalizedFile = file.replace(/\\/g, '/').toLowerCase();

    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase();

      // Simple pattern matching (not full glob)
      if (normalizedPattern.includes('*')) {
        // Handle wildcards
        const parts = normalizedPattern.split('*');
        let remaining = normalizedFile;
        let matched = true;

        for (const part of parts) {
          if (part === '') continue;
          const index = remaining.indexOf(part);
          if (index === -1) {
            matched = false;
            break;
          }
          remaining = remaining.substring(index + part.length);
        }

        if (matched) return true;
      } else {
        // Exact match or contains
        if (normalizedFile.includes(normalizedPattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Create a subtask from a parent task
   */
  private createSubtask(
    parent: Task,
    index: number,
    files: string[],
    focus: string
  ): Task {
    return {
      id: uuidv4(),
      name: this.generateSubtaskName(parent.name, index, focus),
      description: `${parent.description}\n\nFocus: ${focus}\nFiles: ${files.join(', ')}`,
      files,
      estimatedTime: Math.round(
        (files.length / Math.max(parent.files.length, 1)) * parent.estimatedTime
      ),
      dependencies: [],
      acceptanceCriteria: [], // Will be distributed later
      status: 'pending',
      parentTaskId: parent.id,
    };
  }

  /**
   * Generate a descriptive subtask name
   */
  private generateSubtaskName(
    originalName: string,
    index: number,
    focus: string
  ): string {
    // Remove existing "Part X" suffix if present
    const baseName = originalName.replace(/\s*-?\s*Part\s*\d+.*$/i, '').trim();
    return `${baseName} - Part ${index}: ${focus}`;
  }

  /**
   * Distribute acceptance criteria across subtasks
   */
  private distributeAcceptanceCriteria(
    original: Task,
    subtasks: Task[]
  ): void {
    if (original.acceptanceCriteria.length === 0) return;
    if (subtasks.length === 0) return;

    // Try to match criteria to subtasks based on file mentions
    for (const criteria of original.acceptanceCriteria) {
      const criteriaLower = criteria.toLowerCase();
      let assigned = false;

      for (const subtask of subtasks) {
        // Check if any file in the subtask is mentioned in the criteria
        for (const file of subtask.files) {
          const fileName = file.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          if (criteriaLower.includes(fileName.toLowerCase())) {
            subtask.acceptanceCriteria.push(criteria);
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }

      // If no specific match, assign to first subtask
      if (!assigned && subtasks.length > 0) {
        subtasks[0].acceptanceCriteria.push(criteria);
      }
    }

    // Ensure each subtask has at least one criterion
    for (const subtask of subtasks) {
      if (subtask.acceptanceCriteria.length === 0) {
        subtask.acceptanceCriteria.push(
          `Complete work on: ${subtask.files.map(f => f.split('/').pop()).join(', ')}`
        );
      }
    }
  }

  /**
   * Create dependency chain between subtasks
   */
  private createDependencyChain(subtasks: Task[]): void {
    // Setup/types tasks come first, then implementation, then tests
    const typesTasks = subtasks.filter(
      (t) =>
        t.name.includes('Types') ||
        t.name.includes('Setup') ||
        t.name.includes('Interface')
    );

    const testTasks = subtasks.filter((t) => t.name.includes('Test'));

    const otherTasks = subtasks.filter(
      (t) => !typesTasks.includes(t) && !testTasks.includes(t)
    );

    // Other tasks depend on types tasks
    for (const other of otherTasks) {
      for (const types of typesTasks) {
        if (!other.dependencies.includes(types.id)) {
          other.dependencies.push(types.id);
        }
      }
    }

    // Test tasks depend on implementation tasks
    for (const test of testTasks) {
      for (const other of otherTasks) {
        if (!test.dependencies.includes(other.id)) {
          test.dependencies.push(other.id);
        }
      }
      // Also depend on types
      for (const types of typesTasks) {
        if (!test.dependencies.includes(types.id)) {
          test.dependencies.push(types.id);
        }
      }
    }
  }

  /**
   * Get how many levels deep this subtask is
   */
  private getSubtaskDepth(taskName: string): number {
    const matches = taskName.match(/Part\s*\d+/gi);
    return matches ? matches.length : 0;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a TaskSplitter with default configuration
 */
export function createTaskSplitter(
  config: Partial<TaskSplitterConfig> = {}
): TaskSplitter {
  return new TaskSplitter(config);
}
