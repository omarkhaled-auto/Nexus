/**
 * Iteration Commit Handler
 *
 * This module implements git commits for each iteration with rollback support.
 * It enables the Ralph-style iteration pattern where each iteration's work is
 * committed for tracking and potential rollback.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Philosophy:
 * - Each iteration should be committed for visibility
 * - Rollback should be possible to any previous iteration
 * - Commits are tagged for easy lookup
 * - Commit messages follow consistent format
 */

import type { IIterationCommitHandler } from './types';
import type { IGitExecutor } from './GitDiffContextBuilder';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for commit handling
 */
export interface CommitHandlerOptions {
  /** Prefix for commit messages (default: '[nexus]') */
  commitPrefix?: string;
  /** Whether to create tags for iterations (default: true) */
  createTags?: boolean;
  /** Tag prefix (default: 'iteration') */
  tagPrefix?: string;
  /** Whether to force commit even with no changes (default: false) */
  forceCommit?: boolean;
}

/**
 * Default commit handler options
 */
export const DEFAULT_COMMIT_HANDLER_OPTIONS: Required<CommitHandlerOptions> = {
  commitPrefix: '[nexus]',
  createTags: true,
  tagPrefix: 'iteration',
  forceCommit: false,
};

/**
 * Commit registry entry
 */
interface CommitRegistryEntry {
  taskId: string;
  iteration: number;
  commitHash: string;
  tagName?: string;
  message: string;
  timestamp: Date;
}

// ============================================================================
// IterationCommitHandler Implementation
// ============================================================================

/**
 * IterationCommitHandler - Manages git commits for iteration tracking
 *
 * This class implements the IIterationCommitHandler interface to:
 * 1. Commit changes for each iteration
 * 2. Tag iterations for easy lookup
 * 3. Support rollback to previous iterations
 * 4. Track commit history for each task
 *
 * @example
 * ```typescript
 * const handler = new IterationCommitHandler(gitExecutor, '/project/root');
 *
 * // Commit iteration work
 * const hash = await handler.commitIteration('task-1', 1, 'Implemented feature X');
 *
 * // Rollback if needed
 * await handler.rollbackToIteration('task-1', 1);
 * ```
 */
export class IterationCommitHandler implements IIterationCommitHandler {
  /**
   * Git command executor
   */
  private readonly gitExecutor: IGitExecutor;

  /**
   * Project root path
   */
  private readonly projectPath: string;

  /**
   * Commit handler options
   */
  private readonly options: Required<CommitHandlerOptions>;

  /**
   * Registry of commits by task/iteration
   */
  private readonly commitRegistry: Map<string, CommitRegistryEntry[]> = new Map();

  /**
   * Create a new IterationCommitHandler
   *
   * @param gitExecutor Git command executor
   * @param projectPath Project root path
   * @param options Optional commit handler options
   */
  constructor(
    gitExecutor: IGitExecutor,
    projectPath: string,
    options?: CommitHandlerOptions
  ) {
    this.gitExecutor = gitExecutor;
    this.projectPath = projectPath;
    this.options = { ...DEFAULT_COMMIT_HANDLER_OPTIONS, ...options };
  }

  // ==========================================================================
  // Public Methods - IIterationCommitHandler Interface
  // ==========================================================================

  /**
   * Commit changes for an iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number
   * @param message Commit message summary
   * @returns Commit hash
   */
  async commitIteration(
    taskId: string,
    iteration: number,
    message: string
  ): Promise<string> {
    // Check for uncommitted changes
    const hasChanges = await this.hasUncommittedChanges();

    if (!hasChanges && !this.options.forceCommit) {
      // No changes to commit
      throw new Error(`No changes to commit for iteration ${iteration} of task ${taskId}`);
    }

    // Stage all changes
    await this.stageChanges();

    // Generate commit message
    const commitMessage = this.generateCommitMessage(taskId, iteration, message);

    // Create commit
    const commitHash = await this.createCommit(commitMessage);

    // Create tag if enabled
    let tagName: string | undefined;
    if (this.options.createTags) {
      tagName = this.generateTagName(taskId, iteration);
      await this.createTag(tagName, commitHash);
    }

    // Store in registry
    this.storeCommit(taskId, {
      taskId,
      iteration,
      commitHash,
      tagName,
      message: commitMessage,
      timestamp: new Date(),
    });

    return commitHash;
  }

  /**
   * Rollback to a specific iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number to rollback to
   */
  async rollbackToIteration(taskId: string, iteration: number): Promise<void> {
    // Find commit hash for iteration
    const commitHash = this.getIterationCommit(taskId, iteration);

    if (!commitHash) {
      throw new Error(`No commit found for iteration ${iteration} of task ${taskId}`);
    }

    // Hard reset to commit
    await this.runGitCommand(['reset', '--hard', commitHash]);

    // Clean untracked files
    await this.runGitCommand(['clean', '-fd']);

    // Remove entries after this iteration from registry
    const entries = this.commitRegistry.get(taskId);
    if (entries) {
      const filtered = entries.filter(e => e.iteration <= iteration);
      this.commitRegistry.set(taskId, filtered);
    }
  }

  /**
   * Get commit hash for a specific iteration
   *
   * @param taskId Task ID
   * @param iteration Iteration number
   * @returns Commit hash or null if not found
   */
  getIterationCommit(taskId: string, iteration: number): string | null {
    const entries = this.commitRegistry.get(taskId);
    if (!entries) {
      return null;
    }

    const entry = entries.find(e => e.iteration === iteration);
    return entry?.commitHash ?? null;
  }

  // ==========================================================================
  // Additional Public Methods
  // ==========================================================================

  /**
   * Get all commits for a task
   *
   * @param taskId Task ID
   * @returns Array of commit registry entries
   */
  getTaskCommits(taskId: string): CommitRegistryEntry[] {
    return this.commitRegistry.get(taskId) ?? [];
  }

  /**
   * Get the latest commit for a task
   *
   * @param taskId Task ID
   * @returns Latest commit entry or null
   */
  getLatestCommit(taskId: string): CommitRegistryEntry | null {
    const entries = this.commitRegistry.get(taskId);
    if (!entries || entries.length === 0) {
      return null;
    }
    return entries[entries.length - 1];
  }

  /**
   * Check if there are uncommitted changes
   *
   * @returns True if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    return this.gitExecutor.hasUncommittedChanges();
  }

  /**
   * Get current HEAD commit hash
   *
   * @returns HEAD commit hash
   */
  async getCurrentHead(): Promise<string> {
    return this.gitExecutor.getHeadCommit();
  }

  /**
   * Clear commit registry for a task
   *
   * @param taskId Task ID to clear
   */
  clearTaskRegistry(taskId: string): void {
    this.commitRegistry.delete(taskId);
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
   * Stage all changes
   */
  private async stageChanges(): Promise<void> {
    await this.runGitCommand(['add', '-A']);
  }

  /**
   * Create a commit
   */
  private async createCommit(message: string): Promise<string> {
    // Create commit
    await this.runGitCommand(['commit', '-m', message]);

    // Get commit hash
    const hash = await this.runGitCommand(['rev-parse', 'HEAD']);
    return hash.trim();
  }

  /**
   * Create a tag for a commit
   */
  private async createTag(name: string, commitHash: string): Promise<void> {
    try {
      // Delete tag if it exists (allow re-tagging)
      await this.runGitCommand(['tag', '-d', name]).catch(() => {
        // Ignore error if tag doesn't exist
      });

      // Create new tag
      await this.runGitCommand(['tag', name, commitHash]);
    } catch (error) {
      // Log warning but don't fail - tagging is optional
      console.warn(`Failed to create tag ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==========================================================================
  // Private Methods - Message Generation
  // ==========================================================================

  /**
   * Generate commit message for an iteration
   */
  private generateCommitMessage(taskId: string, iteration: number, summary: string): string {
    // Format: [prefix] Task {taskId} - Iteration {n}: {summary}
    const prefix = this.options.commitPrefix;
    const shortTaskId = taskId.length > 8 ? taskId.substring(0, 8) : taskId;

    // First line should be under 72 chars
    const firstLine = `${prefix} Task ${shortTaskId} - Iteration ${iteration}`;

    if (summary.length <= 72 - firstLine.length - 2) {
      return `${firstLine}: ${summary}`;
    }

    // If summary is too long, put it on second line
    const truncatedSummary = summary.length > 72 ? summary.substring(0, 69) + '...' : summary;
    return `${firstLine}\n\n${truncatedSummary}`;
  }

  /**
   * Generate tag name for an iteration
   */
  private generateTagName(taskId: string, iteration: number): string {
    const shortTaskId = taskId.length > 8 ? taskId.substring(0, 8) : taskId;
    return `${this.options.tagPrefix}-${shortTaskId}-${iteration}`;
  }

  // ==========================================================================
  // Private Methods - Registry
  // ==========================================================================

  /**
   * Store commit in registry
   */
  private storeCommit(taskId: string, entry: CommitRegistryEntry): void {
    if (!this.commitRegistry.has(taskId)) {
      this.commitRegistry.set(taskId, []);
    }
    this.commitRegistry.get(taskId)!.push(entry);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an IterationCommitHandler with a real git executor
 *
 * @param projectPath Project root path
 * @param options Optional commit handler options
 * @returns Configured IterationCommitHandler
 */
export function createIterationCommitHandler(
  projectPath: string,
  options?: CommitHandlerOptions
): IterationCommitHandler {
  const gitExecutor = createRealGitExecutor(projectPath);
  return new IterationCommitHandler(gitExecutor, projectPath, options);
}

/**
 * Create a real git executor that runs git commands
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
 * Create a mock git executor for testing
 *
 * @param mockState Optional mock state
 * @returns Mock IGitExecutor
 */
export function createMockCommitExecutor(mockState?: {
  hasChanges?: boolean;
  headCommit?: string;
  commitResult?: string;
  commands?: string[][];
  errorOnCommand?: string[];
}): IGitExecutor & { commands: string[][] } {
  const state = {
    hasChanges: mockState?.hasChanges ?? true,
    headCommit: mockState?.headCommit ?? 'abc1234567890',
    commitResult: mockState?.commitResult ?? 'def4567890123',
    commands: mockState?.commands ?? [],
    errorOnCommand: mockState?.errorOnCommand,
  };

  return {
    commands: state.commands,

    async run(args: string[]): Promise<string> {
      state.commands.push(args);

      // Check if this command should error
      if (state.errorOnCommand && args.some(a => state.errorOnCommand!.includes(a))) {
        throw new Error(`Mock error for command: git ${args.join(' ')}`);
      }

      // Handle specific commands
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
        // After commit, update HEAD
        if (state.commands.some(c => c[0] === 'commit')) {
          return state.commitResult;
        }
        return state.headCommit;
      }

      if (args[0] === 'add' && args[1] === '-A') {
        return '';
      }

      if (args[0] === 'commit') {
        return '';
      }

      if (args[0] === 'tag') {
        return '';
      }

      if (args[0] === 'reset') {
        return '';
      }

      if (args[0] === 'clean') {
        return '';
      }

      if (args[0] === 'status' && args[1] === '--porcelain') {
        return state.hasChanges ? 'M file.txt' : '';
      }

      return '';
    },

    async getHeadCommit(): Promise<string> {
      // After commit, return the new commit hash
      if (state.commands.some(c => c[0] === 'commit')) {
        return state.commitResult;
      }
      return state.headCommit;
    },

    async hasUncommittedChanges(): Promise<boolean> {
      return state.hasChanges;
    },
  };
}

/**
 * Create an IterationCommitHandler for testing with mock git executor
 *
 * @param mockState Optional mock state
 * @param options Optional commit handler options
 * @returns Configured IterationCommitHandler with mock executor
 */
export function createTestIterationCommitHandler(
  mockState?: {
    hasChanges?: boolean;
    headCommit?: string;
    commitResult?: string;
  },
  options?: CommitHandlerOptions
): { handler: IterationCommitHandler; executor: IGitExecutor & { commands: string[][] } } {
  const executor = createMockCommitExecutor(mockState);
  const handler = new IterationCommitHandler(executor, '/test/project', options);
  return { handler, executor };
}
