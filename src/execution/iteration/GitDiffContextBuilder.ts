/**
 * Git Diff Context Builder
 *
 * This module implements building context from git diffs to show agents
 * their previous work. It enables the Ralph-style iteration pattern where
 * agents can see what they changed in previous iterations.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Philosophy:
 * - Agents should see their previous work through git diffs
 * - Diffs are formatted for agent consumption (readable, concise)
 * - Cumulative diffs show all changes since task started
 * - Token limits respected for context budget
 */

import type {
  IGitDiffContextBuilder,
  GitDiff,
  GitChange,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for formatting diffs
 */
export interface DiffFormatOptions {
  /** Maximum tokens for formatted output (default: 5000) */
  maxTokens?: number;
  /** Include file contents in diff (default: true) */
  includeContent?: boolean;
  /** Include summary statistics (default: true) */
  includeSummary?: boolean;
  /** Maximum lines per file to show (default: 50) */
  maxLinesPerFile?: number;
}

/**
 * Default format options
 */
export const DEFAULT_FORMAT_OPTIONS: Required<DiffFormatOptions> = {
  maxTokens: 5000,
  includeContent: true,
  includeSummary: true,
  maxLinesPerFile: 50,
};

/**
 * Interface for git command executor
 * Allows injection of git functionality for testing
 */
export interface IGitExecutor {
  /** Run a git command and return stdout */
  run(args: string[]): Promise<string>;
  /** Get current HEAD commit hash */
  getHeadCommit(): Promise<string>;
  /** Check if working directory has uncommitted changes */
  hasUncommittedChanges(): Promise<boolean>;
}

// ============================================================================
// GitDiffContextBuilder Implementation
// ============================================================================

/**
 * GitDiffContextBuilder - Builds context from git diffs for agent consumption
 *
 * This class implements the IGitDiffContextBuilder interface to:
 * 1. Build diff context between two commits
 * 2. Build cumulative diff from a base commit to HEAD
 * 3. Format diffs for agent consumption
 *
 * @example
 * ```typescript
 * const builder = new GitDiffContextBuilder(gitExecutor, '/project/root');
 *
 * // Get diff from previous iteration
 * const diff = await builder.buildDiffContext('abc123', 'def456');
 *
 * // Format for agent
 * const formatted = builder.formatDiffForAgent(diff);
 * ```
 */
export class GitDiffContextBuilder implements IGitDiffContextBuilder {
  /**
   * Git command executor
   */
  private readonly gitExecutor: IGitExecutor;

  /**
   * Project root path
   */
  private readonly projectPath: string;

  /**
   * Format options
   */
  private readonly formatOptions: Required<DiffFormatOptions>;

  /**
   * Create a new GitDiffContextBuilder
   *
   * @param gitExecutor Git command executor
   * @param projectPath Project root path
   * @param formatOptions Optional format options
   */
  constructor(
    gitExecutor: IGitExecutor,
    projectPath: string,
    formatOptions?: DiffFormatOptions
  ) {
    this.gitExecutor = gitExecutor;
    this.projectPath = projectPath;
    this.formatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...formatOptions };
  }

  // ==========================================================================
  // Public Methods - IGitDiffContextBuilder Interface
  // ==========================================================================

  /**
   * Build diff context between two commits
   *
   * @param fromCommit Starting commit hash
   * @param toCommit Ending commit hash (default: HEAD)
   * @returns Git diff object
   */
  async buildDiffContext(fromCommit: string, toCommit?: string): Promise<GitDiff> {
    const targetCommit = toCommit ?? await this.getHeadCommit();

    try {
      // Get diff text
      const diffText = await this.runGitCommand([
        'diff',
        '--no-color',
        fromCommit,
        targetCommit,
      ]);

      // Get diff stats
      const statsOutput = await this.runGitCommand([
        'diff',
        '--stat',
        '--numstat',
        fromCommit,
        targetCommit,
      ]);

      // Parse diff output
      const changes = this.parseDiffOutput(diffText, statsOutput);

      // Calculate stats
      const stats = this.calculateStats(changes);

      return {
        fromCommit,
        toCommit: targetCommit,
        changes,
        diffText,
        stats,
      };
    } catch (error) {
      // Handle case where commits don't exist or other errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for common git errors
      if (errorMessage.includes('unknown revision') ||
          errorMessage.includes('bad revision') ||
          errorMessage.includes('fatal:')) {
        return this.createEmptyDiff(fromCommit, targetCommit, `Git error: ${errorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Build cumulative diff from base commit to HEAD
   *
   * @param baseCommit Base commit hash
   * @returns Git diff object
   */
  async buildCumulativeDiff(baseCommit: string): Promise<GitDiff> {
    const headCommit = await this.getHeadCommit();
    return this.buildDiffContext(baseCommit, headCommit);
  }

  /**
   * Format diff for agent consumption
   * Creates a human-readable summary with diff hunks
   *
   * @param diff Git diff to format
   * @returns Formatted string for agent context
   */
  formatDiffForAgent(diff: GitDiff): string {
    const lines: string[] = [];

    // Add header
    lines.push('# Git Changes Summary');
    lines.push('');

    // Add summary if enabled and there are changes
    if (this.formatOptions.includeSummary && diff.changes.length > 0) {
      lines.push(this.formatSummary(diff));
      lines.push('');
    }

    // Handle no changes case
    if (diff.changes.length === 0) {
      lines.push('No changes detected.');
      return lines.join('\n');
    }

    // Add file changes
    if (this.formatOptions.includeContent && diff.diffText) {
      lines.push('## Detailed Changes');
      lines.push('');
      lines.push(this.formatDiffContent(diff));
    } else {
      lines.push('## Files Changed');
      lines.push('');
      lines.push(this.formatFileList(diff.changes));
    }

    // Respect token limit
    const result = lines.join('\n');
    return this.truncateToTokenLimit(result);
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
   * Get HEAD commit hash
   */
  private async getHeadCommit(): Promise<string> {
    return this.gitExecutor.getHeadCommit();
  }

  // ==========================================================================
  // Private Methods - Diff Parsing
  // ==========================================================================

  /**
   * Parse git diff output into GitChange objects
   */
  private parseDiffOutput(diffText: string, statsOutput: string): GitChange[] {
    const changes: GitChange[] = [];

    // Parse numstat output for additions/deletions
    // Format: additions<TAB>deletions<TAB>filename
    const numstatLines = statsOutput.split('\n').filter(line => {
      const parts = line.split('\t');
      return parts.length >= 3;
    });

    for (const line of numstatLines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const additions = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
        const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
        const file = parts.slice(2).join('\t'); // Handle filenames with tabs

        // Determine change type from diff text
        const changeType = this.detectChangeType(file, diffText);

        changes.push({
          file,
          changeType,
          additions,
          deletions,
        });
      }
    }

    return changes;
  }

  /**
   * Detect the type of change for a file
   */
  private detectChangeType(
    file: string,
    diffText: string
  ): 'added' | 'modified' | 'deleted' | 'renamed' {
    // Look for git diff markers
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFile = escapeRegex(file);

    // Check for new file
    if (diffText.includes(`new file mode`) &&
        diffText.includes(`+++ b/${file}`)) {
      return 'added';
    }

    // Check for deleted file
    if (diffText.includes(`deleted file mode`) &&
        diffText.includes(`--- a/${file}`)) {
      return 'deleted';
    }

    // Check for renamed file (similarity index)
    if (new RegExp(`rename from.*${escapedFile}|rename to.*${escapedFile}`).test(diffText)) {
      return 'renamed';
    }

    // Default to modified
    return 'modified';
  }

  /**
   * Calculate aggregate statistics from changes
   */
  private calculateStats(changes: GitChange[]): {
    filesChanged: number;
    additions: number;
    deletions: number;
  } {
    return {
      filesChanged: changes.length,
      additions: changes.reduce((sum, c) => sum + c.additions, 0),
      deletions: changes.reduce((sum, c) => sum + c.deletions, 0),
    };
  }

  // ==========================================================================
  // Private Methods - Formatting
  // ==========================================================================

  /**
   * Format summary section
   */
  private formatSummary(diff: GitDiff): string {
    const lines: string[] = [];
    lines.push('## Summary');
    lines.push(`- **Commits**: ${diff.fromCommit.substring(0, 7)}..${diff.toCommit.substring(0, 7)}`);
    lines.push(`- **Files Changed**: ${diff.stats.filesChanged}`);
    lines.push(`- **Additions**: +${diff.stats.additions}`);
    lines.push(`- **Deletions**: -${diff.stats.deletions}`);
    return lines.join('\n');
  }

  /**
   * Format diff content with truncation
   */
  private formatDiffContent(diff: GitDiff): string {
    if (!diff.diffText) {
      return 'No diff content available.';
    }

    // Parse and format each file's diff
    const fileDiffs = this.splitDiffByFile(diff.diffText);
    const formattedParts: string[] = [];

    for (const [file, content] of fileDiffs) {
      const truncated = this.truncateFileDiff(content, this.formatOptions.maxLinesPerFile);
      formattedParts.push(`### ${file}\n\`\`\`diff\n${truncated}\n\`\`\``);
    }

    return formattedParts.join('\n\n');
  }

  /**
   * Split diff text by file
   */
  private splitDiffByFile(diffText: string): Map<string, string> {
    const fileDiffs = new Map<string, string>();
    const lines = diffText.split('\n');

    let currentFile = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect new file header
      const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (diffMatch) {
        // Save previous file if exists
        if (currentFile && currentContent.length > 0) {
          fileDiffs.set(currentFile, currentContent.join('\n'));
        }
        // Start new file
        currentFile = diffMatch[2]; // Use b/ path
        currentContent = [line];
      } else if (currentFile) {
        currentContent.push(line);
      }
    }

    // Save last file
    if (currentFile && currentContent.length > 0) {
      fileDiffs.set(currentFile, currentContent.join('\n'));
    }

    return fileDiffs;
  }

  /**
   * Truncate file diff to max lines
   */
  private truncateFileDiff(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }

    const truncated = lines.slice(0, maxLines);
    truncated.push(`... (${lines.length - maxLines} more lines truncated)`);
    return truncated.join('\n');
  }

  /**
   * Format file list without content
   */
  private formatFileList(changes: GitChange[]): string {
    return changes.map(c => {
      const symbol = this.getChangeSymbol(c.changeType);
      return `${symbol} ${c.file} (+${c.additions}/-${c.deletions})`;
    }).join('\n');
  }

  /**
   * Get symbol for change type
   */
  private getChangeSymbol(changeType: GitChange['changeType']): string {
    switch (changeType) {
      case 'added': return 'A';
      case 'modified': return 'M';
      case 'deleted': return 'D';
      case 'renamed': return 'R';
      default: return '?';
    }
  }

  /**
   * Truncate content to token limit
   */
  private truncateToTokenLimit(content: string): string {
    const estimatedTokens = this.estimateTokens(content);
    if (estimatedTokens <= this.formatOptions.maxTokens) {
      return content;
    }

    // Calculate approximate character limit
    const maxChars = Math.floor(this.formatOptions.maxTokens * 4);
    const truncated = content.substring(0, maxChars);

    // Find last complete line
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > 0) {
      return truncated.substring(0, lastNewline) + '\n\n... (content truncated due to token limit)';
    }

    return truncated + '... (truncated)';
  }

  /**
   * Estimate token count (simple heuristic: 1 token ≈ 4 chars)
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  // ==========================================================================
  // Private Methods - Helpers
  // ==========================================================================

  /**
   * Create an empty diff object (for error cases or no changes)
   */
  private createEmptyDiff(fromCommit: string, toCommit: string, reason?: string): GitDiff {
    return {
      fromCommit,
      toCommit,
      changes: [],
      diffText: reason || '',
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a GitDiffContextBuilder with a real git executor
 *
 * @param projectPath Project root path
 * @param formatOptions Optional format options
 * @returns Configured GitDiffContextBuilder
 */
export function createGitDiffContextBuilder(
  projectPath: string,
  formatOptions?: DiffFormatOptions
): GitDiffContextBuilder {
  // Create a real git executor using child_process
  const gitExecutor = createRealGitExecutor(projectPath);
  return new GitDiffContextBuilder(gitExecutor, projectPath, formatOptions);
}

/**
 * Create a real git executor that runs git commands
 */
function createRealGitExecutor(projectPath: string): IGitExecutor {
  // We'll use dynamic import for child_process to avoid issues
  return {
    async run(args: string[]): Promise<string> {
      const { execSync } = await import('node:child_process');
      try {
        const result = execSync(`git ${args.join(' ')}`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
        });
        return result;
      } catch (error) {
        // Handle git command errors
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
      } catch (error) {
        // Return placeholder if not in a git repo
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
 * @param mockResponses Map of command patterns to responses
 * @returns Mock IGitExecutor
 */
export function createMockGitExecutor(mockResponses?: {
  diffOutput?: string;
  statsOutput?: string;
  headCommit?: string;
  hasChanges?: boolean;
}): IGitExecutor {
  const responses = mockResponses ?? {
    diffOutput: '',
    statsOutput: '',
    headCommit: 'abc1234567890',
    hasChanges: false,
  };

  return {
    async run(args: string[]): Promise<string> {
      // Check for diff command
      if (args.includes('diff')) {
        if (args.includes('--stat') || args.includes('--numstat')) {
          return responses.statsOutput ?? '';
        }
        return responses.diffOutput ?? '';
      }

      // Default empty response
      return '';
    },

    async getHeadCommit(): Promise<string> {
      return responses.headCommit ?? 'abc1234567890';
    },

    async hasUncommittedChanges(): Promise<boolean> {
      return responses.hasChanges ?? false;
    },
  };
}

/**
 * Create a GitDiffContextBuilder for testing with mock git executor
 *
 * @param mockResponses Optional mock responses
 * @param formatOptions Optional format options
 * @returns Configured GitDiffContextBuilder with mock executor
 */
export function createTestGitDiffContextBuilder(
  mockResponses?: {
    diffOutput?: string;
    statsOutput?: string;
    headCommit?: string;
    hasChanges?: boolean;
  },
  formatOptions?: DiffFormatOptions
): GitDiffContextBuilder {
  const mockExecutor = createMockGitExecutor(mockResponses);
  return new GitDiffContextBuilder(mockExecutor, '/test/project', formatOptions);
}
