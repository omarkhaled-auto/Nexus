/**
 * Escalation Handler
 *
 * This module implements escalation when max iterations are reached or blocking issues are found.
 * It enables graceful handoff to human operators when the AI cannot complete a task autonomously.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Philosophy:
 * - Escalation should be graceful and informative
 * - Human operators receive clear, actionable reports
 * - Checkpoints preserve work done so far
 * - Suggested actions help human operators resume
 */

import type {
  IEscalationHandler,
  EscalationReason,
  EscalationReport,
  IterationContext,
  ErrorEntry,
} from './types';
import type { IGitExecutor } from './GitDiffContextBuilder';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for escalation handling
 */
export interface EscalationHandlerOptions {
  /** Directory to save escalation reports (default: '.nexus/escalations') */
  checkpointDirectory?: string;
  /** Prefix for checkpoint tags (default: 'checkpoint') */
  checkpointTagPrefix?: string;
  /** Whether to save reports as JSON (default: true) */
  saveJsonReport?: boolean;
  /** Whether to save human-readable reports (default: true) */
  saveHumanReadableReport?: boolean;
  /** Custom notification handler */
  notificationHandler?: (report: EscalationReport) => Promise<void>;
}

/**
 * Default escalation handler options
 */
export const DEFAULT_ESCALATION_HANDLER_OPTIONS: Required<Omit<EscalationHandlerOptions, 'notificationHandler'>> & { notificationHandler: undefined } = {
  checkpointDirectory: '.nexus/escalations',
  checkpointTagPrefix: 'checkpoint',
  saveJsonReport: true,
  saveHumanReadableReport: true,
  notificationHandler: undefined,
};

/**
 * Interface for file system operations
 * Allows injection for testing
 */
export interface IFileSystem {
  /** Create directory if it doesn't exist */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** Write file */
  writeFile(path: string, content: string): Promise<void>;
  /** Check if path exists */
  exists(path: string): Promise<boolean>;
}

// ============================================================================
// EscalationHandler Implementation
// ============================================================================

/**
 * EscalationHandler - Manages escalation when iteration limits are reached
 *
 * This class implements the IEscalationHandler interface to:
 * 1. Create checkpoints before escalating
 * 2. Generate detailed escalation reports
 * 3. Save reports for human review
 * 4. Notify humans through configured channels
 *
 * @example
 * ```typescript
 * const handler = new EscalationHandler(gitExecutor, fs, '/project/root');
 *
 * // Escalate when max iterations reached
 * const report = await handler.escalate('task-1', 'max_iterations', context);
 *
 * // Human reviews and continues from checkpoint
 * console.log('Checkpoint:', report.checkpointCommit);
 * ```
 */
export class EscalationHandler implements IEscalationHandler {
  /**
   * Git command executor
   */
  private readonly gitExecutor: IGitExecutor;

  /**
   * File system operations
   */
  private readonly fileSystem: IFileSystem;

  /**
   * Project root path
   */
  private readonly projectPath: string;

  /**
   * Escalation handler options
   */
  private readonly options: Required<Omit<EscalationHandlerOptions, 'notificationHandler'>> & { notificationHandler?: (report: EscalationReport) => Promise<void> };

  /**
   * Create a new EscalationHandler
   *
   * @param gitExecutor Git command executor
   * @param fileSystem File system operations
   * @param projectPath Project root path
   * @param options Optional escalation handler options
   */
  constructor(
    gitExecutor: IGitExecutor,
    fileSystem: IFileSystem,
    projectPath: string,
    options?: EscalationHandlerOptions
  ) {
    this.gitExecutor = gitExecutor;
    this.fileSystem = fileSystem;
    this.projectPath = projectPath;
    this.options = { ...DEFAULT_ESCALATION_HANDLER_OPTIONS, ...options };
  }

  // ==========================================================================
  // Public Methods - IEscalationHandler Interface
  // ==========================================================================

  /**
   * Escalate a task to human
   *
   * @param taskId Task ID to escalate
   * @param reason Reason for escalation
   * @param context Current iteration context
   * @returns Escalation report
   */
  async escalate(
    taskId: string,
    reason: EscalationReason,
    context: IterationContext
  ): Promise<EscalationReport> {
    // Create checkpoint first
    const checkpointCommit = await this.createCheckpoint(taskId);

    // Generate escalation report
    const report = this.generateReport(taskId, reason, context, checkpointCommit);

    // Save report to files
    await this.saveReport(report);

    // Notify human
    await this.notifyHuman(report);

    return report;
  }

  /**
   * Create a checkpoint for the current state
   *
   * @param taskId Task ID
   * @returns Checkpoint commit hash
   */
  async createCheckpoint(taskId: string): Promise<string> {
    // Check for uncommitted changes
    const hasChanges = await this.gitExecutor.hasUncommittedChanges();

    if (hasChanges) {
      // Stage and commit changes
      await this.runGitCommand(['add', '-A']);
      const message = `[nexus] Checkpoint for escalated task ${this.truncateId(taskId)}`;
      await this.runGitCommand(['commit', '-m', message]);
    }

    // Get current HEAD
    const headCommit = await this.gitExecutor.getHeadCommit();

    // Create checkpoint tag
    const tagName = this.generateCheckpointTagName(taskId);
    await this.createTag(tagName, headCommit);

    return headCommit;
  }

  /**
   * Notify human about escalation
   *
   * @param report Escalation report
   */
  async notifyHuman(report: EscalationReport): Promise<void> {
    // Log to console with formatted output
    const formattedReport = this.formatReportForDisplay(report);
    console.log('\n' + '='.repeat(80));
    console.log('ESCALATION NOTIFICATION');
    console.log('='.repeat(80));
    console.log(formattedReport);
    console.log('='.repeat(80) + '\n');

    // Call custom notification handler if configured
    if (this.options.notificationHandler) {
      await this.options.notificationHandler(report);
    }
  }

  // ==========================================================================
  // Private Methods - Report Generation
  // ==========================================================================

  /**
   * Generate escalation report
   */
  private generateReport(
    taskId: string,
    reason: EscalationReason,
    context: IterationContext,
    checkpointCommit: string
  ): EscalationReport {
    const summary = this.generateSummary(reason, context);
    const lastErrors = this.getLastErrors(context.previousErrors, 10);
    const suggestedActions = this.suggestActions(reason, lastErrors);

    return {
      taskId,
      reason,
      iterationsCompleted: context.iteration,
      summary,
      lastErrors,
      suggestedActions,
      checkpointCommit,
      createdAt: new Date(),
    };
  }

  /**
   * Generate summary based on reason and context
   */
  private generateSummary(reason: EscalationReason, context: IterationContext): string {
    const taskName = context.task.name;
    const iterations = context.iteration;

    switch (reason) {
      case 'max_iterations':
        return `Task "${taskName}" reached the maximum iteration limit of ${context.options.maxIterations} after ${iterations} iterations. The task could not be completed automatically.`;

      case 'timeout':
        return `Task "${taskName}" exceeded the time limit of ${context.options.timeoutMinutes} minutes after ${iterations} iterations.`;

      case 'repeated_failures':
        return `Task "${taskName}" encountered the same error repeatedly across multiple iterations (${iterations} total). Manual intervention may be required to resolve the underlying issue.`;

      case 'blocking_error':
        return `Task "${taskName}" encountered a blocking error that cannot be resolved automatically after ${iterations} iterations. Human expertise is needed to proceed.`;

      case 'agent_request':
        return `The agent working on task "${taskName}" explicitly requested human assistance after ${iterations} iterations.`;

      default:
        return `Task "${taskName}" was escalated after ${iterations} iterations due to: ${reason}`;
    }
  }

  /**
   * Get last N errors from error list
   */
  private getLastErrors(errors: ErrorEntry[], limit: number): ErrorEntry[] {
    if (errors.length <= limit) {
      return [...errors];
    }
    return errors.slice(-limit);
  }

  /**
   * Suggest actions based on reason and errors
   */
  private suggestActions(reason: EscalationReason, errors: ErrorEntry[]): string[] {
    const actions: string[] = [];

    // General actions based on reason
    switch (reason) {
      case 'max_iterations':
        actions.push('Review the task requirements and consider breaking it into smaller subtasks');
        actions.push('Check if the acceptance criteria are clear and achievable');
        break;

      case 'timeout':
        actions.push('Consider increasing the time limit if the task legitimately needs more time');
        actions.push('Review if the task scope is appropriate');
        break;

      case 'repeated_failures':
        actions.push('Review the repeated error and identify the root cause');
        actions.push('Check if there are environmental issues (dependencies, configuration)');
        break;

      case 'blocking_error':
        actions.push('Review the blocking error for possible workarounds');
        actions.push('Consider if the approach needs to be changed fundamentally');
        break;

      case 'agent_request':
        actions.push('Review the agent\'s request for specific guidance');
        actions.push('Provide additional context or clarify requirements');
        break;
    }

    // Actions based on error types
    const errorTypes = new Set(errors.map(e => e.type));

    if (errorTypes.has('build')) {
      actions.push('Check for compilation/build errors that may require dependency updates');
    }

    if (errorTypes.has('lint')) {
      actions.push('Review lint errors for code style issues that need manual attention');
    }

    if (errorTypes.has('test')) {
      actions.push('Review failing tests to understand expected behavior');
      actions.push('Check if tests need to be updated for new functionality');
    }

    if (errorTypes.has('review')) {
      actions.push('Address code review feedback that the agent could not resolve');
    }

    // Add checkpoint recovery instruction
    actions.push(`Use checkpoint to restore state: git checkout ${reason === 'max_iterations' ? '[checkpoint-hash]' : 'checkpoint'}`);

    return actions;
  }

  // ==========================================================================
  // Private Methods - Report Formatting
  // ==========================================================================

  /**
   * Format report for human-readable display
   */
  private formatReportForDisplay(report: EscalationReport): string {
    const lines: string[] = [];

    lines.push(`Task ID: ${report.taskId}`);
    lines.push(`Reason: ${this.formatReason(report.reason)}`);
    lines.push(`Iterations Completed: ${report.iterationsCompleted}`);
    lines.push(`Checkpoint Commit: ${report.checkpointCommit}`);
    lines.push(`Created At: ${report.createdAt.toISOString()}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(report.summary);
    lines.push('');

    if (report.lastErrors.length > 0) {
      lines.push('LAST ERRORS');
      lines.push('-'.repeat(40));
      for (const error of report.lastErrors) {
        lines.push(this.formatError(error));
      }
      lines.push('');
    }

    lines.push('SUGGESTED ACTIONS');
    lines.push('-'.repeat(40));
    for (let i = 0; i < report.suggestedActions.length; i++) {
      lines.push(`${i + 1}. ${report.suggestedActions[i]}`);
    }

    return lines.join('\n');
  }

  /**
   * Format reason for display
   */
  private formatReason(reason: EscalationReason): string {
    switch (reason) {
      case 'max_iterations':
        return 'Maximum Iterations Reached';
      case 'timeout':
        return 'Time Limit Exceeded';
      case 'repeated_failures':
        return 'Repeated Failures';
      case 'blocking_error':
        return 'Blocking Error';
      case 'agent_request':
        return 'Agent Requested Help';
      default:
        return reason;
    }
  }

  /**
   * Format single error for display
   */
  private formatError(error: ErrorEntry): string {
    const parts: string[] = [];

    parts.push(`[${error.type.toUpperCase()}]`);
    parts.push(`[${error.severity}]`);

    if (error.file) {
      let location = error.file;
      if (error.line !== undefined) {
        location += `:${error.line}`;
        if (error.column !== undefined) {
          location += `:${error.column}`;
        }
      }
      parts.push(`(${location})`);
    }

    parts.push(error.message);

    if (error.suggestion) {
      parts.push(`-> Suggestion: ${error.suggestion}`);
    }

    return parts.join(' ');
  }

  // ==========================================================================
  // Private Methods - File Operations
  // ==========================================================================

  /**
   * Save report to files
   */
  private async saveReport(report: EscalationReport): Promise<void> {
    // Ensure checkpoint directory exists
    const reportDir = this.getReportDirectory();
    await this.ensureDirectoryExists(reportDir);

    const timestamp = report.createdAt.toISOString().replace(/[:.]/g, '-');
    const baseFilename = `escalation-${this.truncateId(report.taskId)}-${timestamp}`;

    // Save JSON report
    if (this.options.saveJsonReport) {
      const jsonPath = `${reportDir}/${baseFilename}.json`;
      await this.fileSystem.writeFile(jsonPath, JSON.stringify(report, null, 2));
    }

    // Save human-readable report
    if (this.options.saveHumanReadableReport) {
      const mdPath = `${reportDir}/${baseFilename}.md`;
      const mdContent = this.formatReportAsMarkdown(report);
      await this.fileSystem.writeFile(mdPath, mdContent);
    }
  }

  /**
   * Format report as Markdown
   */
  private formatReportAsMarkdown(report: EscalationReport): string {
    const lines: string[] = [];

    lines.push(`# Escalation Report: ${report.taskId}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Task ID | \`${report.taskId}\` |`);
    lines.push(`| Reason | ${this.formatReason(report.reason)} |`);
    lines.push(`| Iterations | ${report.iterationsCompleted} |`);
    lines.push(`| Checkpoint | \`${report.checkpointCommit}\` |`);
    lines.push(`| Created | ${report.createdAt.toISOString()} |`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(report.summary);
    lines.push('');

    if (report.lastErrors.length > 0) {
      lines.push('## Last Errors');
      lines.push('');
      lines.push('```');
      for (const error of report.lastErrors) {
        lines.push(this.formatError(error));
      }
      lines.push('```');
      lines.push('');
    }

    lines.push('## Suggested Actions');
    lines.push('');
    for (const action of report.suggestedActions) {
      lines.push(`- ${action}`);
    }
    lines.push('');
    lines.push('## Recovery');
    lines.push('');
    lines.push('To restore to the checkpoint state:');
    lines.push('');
    lines.push('```bash');
    lines.push(`git checkout ${report.checkpointCommit}`);
    lines.push('```');
    lines.push('');
    lines.push('Or use the checkpoint tag:');
    lines.push('');
    lines.push('```bash');
    lines.push(`git checkout ${this.options.checkpointTagPrefix}-${this.truncateId(report.taskId)}`);
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    const exists = await this.fileSystem.exists(path);
    if (!exists) {
      await this.fileSystem.mkdir(path, { recursive: true });
    }
  }

  /**
   * Get full path to report directory
   */
  private getReportDirectory(): string {
    // Normalize path separators
    const checkpointDir = this.options.checkpointDirectory.replace(/\\/g, '/');
    if (checkpointDir.startsWith('/') || checkpointDir.includes(':')) {
      // Absolute path
      return checkpointDir;
    }
    // Relative to project path
    return `${this.projectPath}/${checkpointDir}`;
  }

  // ==========================================================================
  // Private Methods - Git Operations
  // ==========================================================================

  /**
   * Run a git command
   */
  private async runGitCommand(args: string[]): Promise<string> {
    return this.gitExecutor.run(args);
  }

  /**
   * Create a tag
   */
  private async createTag(name: string, commitHash: string): Promise<void> {
    try {
      // Delete tag if it exists
      await this.runGitCommand(['tag', '-d', name]).catch(() => {
        // Ignore error if tag doesn't exist
      });

      // Create new tag
      await this.runGitCommand(['tag', name, commitHash]);
    } catch (error) {
      console.warn(`Failed to create checkpoint tag ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate checkpoint tag name
   */
  private generateCheckpointTagName(taskId: string): string {
    return `${this.options.checkpointTagPrefix}-${this.truncateId(taskId)}`;
  }

  /**
   * Truncate task ID for use in tags/filenames
   */
  private truncateId(id: string): string {
    return id.length > 8 ? id.substring(0, 8) : id;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an EscalationHandler with real file system
 *
 * @param projectPath Project root path
 * @param options Optional escalation handler options
 * @returns Configured EscalationHandler
 */
export function createEscalationHandler(
  projectPath: string,
  options?: EscalationHandlerOptions
): EscalationHandler {
  const gitExecutor = createRealGitExecutor(projectPath);
  const fileSystem = createRealFileSystem();
  return new EscalationHandler(gitExecutor, fileSystem, projectPath, options);
}

/**
 * Create a real git executor
 */
function createRealGitExecutor(projectPath: string): IGitExecutor {
  return {
    async run(args: string[]): Promise<string> {
      const { execSync } = await import('node:child_process');
      try {
        const result = execSync(`git ${args.join(' ')}`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: 10 * 1024 * 1024,
        });
        return result;
      } catch (error) {
        const execError = error as { stderr?: string; message?: string };
        throw new Error(execError.stderr || execError.message || 'Git command failed');
      }
    },

    async getHeadCommit(): Promise<string> {
      const { execSync } = await import('node:child_process');
      try {
        const result = execSync('git rev-parse HEAD', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return result.trim();
      } catch {
        return 'HEAD';
      }
    },

    async hasUncommittedChanges(): Promise<boolean> {
      const { execSync } = await import('node:child_process');
      try {
        const result = execSync('git status --porcelain', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return result.trim().length > 0;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create a real file system
 */
function createRealFileSystem(): IFileSystem {
  return {
    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(path, options);
    },

    async writeFile(path: string, content: string): Promise<void> {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(path, content, 'utf-8');
    },

    async exists(path: string): Promise<boolean> {
      const { access } = await import('node:fs/promises');
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create a mock git executor for testing
 */
export function createMockEscalationGitExecutor(mockState?: {
  hasChanges?: boolean;
  headCommit?: string;
  commands?: string[][];
}): IGitExecutor & { commands: string[][] } {
  const state = {
    hasChanges: mockState?.hasChanges ?? false,
    headCommit: mockState?.headCommit ?? 'abc1234567890',
    commands: mockState?.commands ?? [],
  };

  return {
    commands: state.commands,

    async run(args: string[]): Promise<string> {
      state.commands.push(args);
      return '';
    },

    async getHeadCommit(): Promise<string> {
      return state.headCommit;
    },

    async hasUncommittedChanges(): Promise<boolean> {
      return state.hasChanges;
    },
  };
}

/**
 * Create a mock file system for testing
 */
export function createMockFileSystem(mockState?: {
  existingPaths?: Set<string>;
  writtenFiles?: Map<string, string>;
}): IFileSystem & { writtenFiles: Map<string, string> } {
  const state = {
    existingPaths: mockState?.existingPaths ?? new Set<string>(),
    writtenFiles: mockState?.writtenFiles ?? new Map<string, string>(),
  };

  return {
    writtenFiles: state.writtenFiles,

    async mkdir(path: string, _options?: { recursive?: boolean }): Promise<void> {
      state.existingPaths.add(path);
    },

    async writeFile(path: string, content: string): Promise<void> {
      state.writtenFiles.set(path, content);
    },

    async exists(path: string): Promise<boolean> {
      return state.existingPaths.has(path);
    },
  };
}

/**
 * Create an EscalationHandler for testing with mock dependencies
 *
 * @param mockState Optional mock state
 * @param options Optional escalation handler options
 * @returns Configured EscalationHandler with mock dependencies
 */
export function createTestEscalationHandler(
  mockState?: {
    hasChanges?: boolean;
    headCommit?: string;
    existingPaths?: Set<string>;
  },
  options?: EscalationHandlerOptions
): {
  handler: EscalationHandler;
  gitExecutor: IGitExecutor & { commands: string[][] };
  fileSystem: IFileSystem & { writtenFiles: Map<string, string> };
} {
  const gitExecutor = createMockEscalationGitExecutor({
    hasChanges: mockState?.hasChanges,
    headCommit: mockState?.headCommit,
  });
  const fileSystem = createMockFileSystem({
    existingPaths: mockState?.existingPaths,
  });
  const handler = new EscalationHandler(gitExecutor, fileSystem, '/test/project', options);
  return { handler, gitExecutor, fileSystem };
}
