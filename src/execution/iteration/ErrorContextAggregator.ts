/**
 * Error Context Aggregator
 *
 * Collects, deduplicates, prioritizes, and formats errors from multiple iterations
 * for agent consumption. Enables agents to understand what went wrong in previous
 * iterations without being overwhelmed by duplicate or low-priority errors.
 *
 * Layer 4: Execution - Iteration subsystem
 *
 * Key Features:
 * - Error deduplication by message + file + line
 * - Priority sorting by severity and type
 * - Formatted output for agent context
 * - Type-based filtering
 */

import type {
  ErrorEntry,
  ErrorType,
  ErrorSeverity,
  IErrorContextAggregator,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Priority order for error types (lower = higher priority)
 */
const ERROR_TYPE_PRIORITY: Record<ErrorType, number> = {
  build: 1,   // Build errors are most critical - can't proceed without fixing
  lint: 2,    // Lint errors block code quality
  test: 3,    // Test failures indicate broken functionality
  review: 4,  // Review comments are suggestions
  runtime: 5, // Runtime errors may be intermittent
};

/**
 * Priority order for error severity (lower = higher priority)
 */
const ERROR_SEVERITY_PRIORITY: Record<ErrorSeverity, number> = {
  error: 1,   // Errors must be fixed
  warning: 2, // Warnings should be addressed
  info: 3,    // Info is optional
};

/**
 * Default maximum number of errors to store
 */
const DEFAULT_MAX_ERRORS = 100;

// ============================================================================
// ErrorContextAggregator Class
// ============================================================================

/**
 * Aggregates errors from multiple iterations with deduplication and prioritization
 */
export class ErrorContextAggregator implements IErrorContextAggregator {
  /** Collected errors */
  private errors: ErrorEntry[] = [];

  /** Maximum number of errors to store */
  private readonly maxErrors: number;

  /** Current iteration for marking new errors */
  private currentIteration: number = 0;

  /**
   * Create an ErrorContextAggregator
   *
   * @param maxErrors Maximum number of errors to store (default: 100)
   */
  constructor(maxErrors: number = DEFAULT_MAX_ERRORS) {
    this.maxErrors = maxErrors;
  }

  // ==========================================================================
  // Public Methods (IErrorContextAggregator Implementation)
  // ==========================================================================

  /**
   * Add errors from an iteration
   * Marks errors with current iteration if not already set
   *
   * @param errors Errors to add
   */
  addErrors(errors: ErrorEntry[]): void {
    // Mark errors with current iteration if not set
    const markedErrors = errors.map((error) => ({
      ...error,
      iteration: error.iteration || this.currentIteration,
    }));

    // Add to collection
    this.errors.push(...markedErrors);

    // Trim if over limit (keep most recent)
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * Get unique errors (deduplicated by message + file + line)
   * Keeps the most recent occurrence of each duplicate
   *
   * @returns Unique error entries
   */
  getUniqueErrors(): ErrorEntry[] {
    return this.deduplicateErrors(this.errors);
  }

  /**
   * Get errors filtered by type
   *
   * @param type Error type to filter by
   * @returns Filtered errors
   */
  getErrorsByType(type: ErrorType): ErrorEntry[] {
    return this.errors.filter((error) => error.type === type);
  }

  /**
   * Format errors for agent consumption
   * Groups by type, prioritizes by severity, includes suggestions
   *
   * @returns Formatted string for agent context
   */
  formatErrorsForAgent(): string {
    const uniqueErrors = this.getUniqueErrors();
    const prioritizedErrors = this.prioritizeErrors(uniqueErrors);

    if (prioritizedErrors.length === 0) {
      return 'No errors from previous iterations.';
    }

    const sections: string[] = [];

    // Header with summary
    const errorCount = prioritizedErrors.filter((e) => e.severity === 'error').length;
    const warningCount = prioritizedErrors.filter((e) => e.severity === 'warning').length;
    const infoCount = prioritizedErrors.filter((e) => e.severity === 'info').length;

    sections.push(`## Errors from Previous Iterations`);
    sections.push(`**Summary:** ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info`);
    sections.push('');

    // Group by type and format
    const grouped = this.groupErrorsByType(prioritizedErrors);

    for (const [type, typeErrors] of Object.entries(grouped)) {
      if (typeErrors.length === 0) continue;

      sections.push(`### ${this.formatTypeName(type as ErrorType)} (${typeErrors.length})`);
      sections.push('');

      for (const error of typeErrors) {
        sections.push(this.formatError(error));
      }

      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  // ==========================================================================
  // Additional Public Methods
  // ==========================================================================

  /**
   * Set the current iteration number for new errors
   *
   * @param iteration Current iteration number
   */
  setCurrentIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  /**
   * Get all errors (not deduplicated)
   *
   * @returns All error entries
   */
  getAllErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Get error count
   *
   * @returns Total number of errors
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get unique error count
   *
   * @returns Number of unique errors
   */
  getUniqueErrorCount(): number {
    return this.getUniqueErrors().length;
  }

  /**
   * Check if there are any errors of a specific severity
   *
   * @param severity Severity to check
   * @returns True if any errors of that severity exist
   */
  hasErrorsOfSeverity(severity: ErrorSeverity): boolean {
    return this.errors.some((error) => error.severity === severity);
  }

  /**
   * Get errors from a specific iteration
   *
   * @param iteration Iteration number
   * @returns Errors from that iteration
   */
  getErrorsByIteration(iteration: number): ErrorEntry[] {
    return this.errors.filter((error) => error.iteration === iteration);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Deduplicate errors by message + file + line
   * Keeps the most recent occurrence (highest iteration number)
   *
   * @param errors Errors to deduplicate
   * @returns Unique errors
   */
  private deduplicateErrors(errors: ErrorEntry[]): ErrorEntry[] {
    const seen = new Map<string, ErrorEntry>();

    for (const error of errors) {
      const key = this.generateErrorKey(error);
      const existing = seen.get(key);

      // Keep the most recent occurrence (higher iteration number)
      if (!existing || error.iteration > existing.iteration) {
        seen.set(key, error);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate a unique key for an error (for deduplication)
   *
   * @param error Error to generate key for
   * @returns Unique key string
   */
  private generateErrorKey(error: ErrorEntry): string {
    const parts = [
      error.type,
      error.message,
      error.file ?? '',
      error.line?.toString() ?? '',
    ];
    return parts.join('|');
  }

  /**
   * Prioritize errors by severity and type
   *
   * @param errors Errors to sort
   * @returns Sorted errors (highest priority first)
   */
  private prioritizeErrors(errors: ErrorEntry[]): ErrorEntry[] {
    return [...errors].sort((a, b) => {
      // First sort by severity
      const severityDiff =
        ERROR_SEVERITY_PRIORITY[a.severity] - ERROR_SEVERITY_PRIORITY[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by type
      const typeDiff = ERROR_TYPE_PRIORITY[a.type] - ERROR_TYPE_PRIORITY[b.type];
      if (typeDiff !== 0) return typeDiff;

      // Then by iteration (newer first)
      return b.iteration - a.iteration;
    });
  }

  /**
   * Group errors by type
   *
   * @param errors Errors to group
   * @returns Errors grouped by type
   */
  private groupErrorsByType(
    errors: ErrorEntry[]
  ): Record<ErrorType, ErrorEntry[]> {
    const grouped: Record<ErrorType, ErrorEntry[]> = {
      build: [],
      lint: [],
      test: [],
      review: [],
      runtime: [],
    };

    for (const error of errors) {
      grouped[error.type].push(error);
    }

    return grouped;
  }

  /**
   * Format a single error for agent consumption
   *
   * @param error Error to format
   * @returns Formatted string
   */
  private formatError(error: ErrorEntry): string {
    const parts: string[] = [];

    // Severity badge
    const severityBadge = this.formatSeverityBadge(error.severity);

    // Location
    let location = '';
    if (error.file) {
      location = error.file;
      if (error.line !== undefined) {
        location += `:${error.line}`;
        if (error.column !== undefined) {
          location += `:${error.column}`;
        }
      }
    }

    // Error code
    const codeStr = error.code ? `[${error.code}] ` : '';

    // Main error line
    parts.push(`- ${severityBadge} ${codeStr}${error.message}`);

    // Location on separate line if present
    if (location) {
      parts.push(`  📍 ${location}`);
    }

    // Suggestion if available
    if (error.suggestion) {
      parts.push(`  💡 Suggestion: ${error.suggestion}`);
    }

    // Iteration info
    parts.push(`  📝 From iteration ${error.iteration}`);

    return parts.join('\n');
  }

  /**
   * Format severity as a badge
   *
   * @param severity Severity level
   * @returns Formatted badge string
   */
  private formatSeverityBadge(severity: ErrorSeverity): string {
    switch (severity) {
      case 'error':
        return '🔴 ERROR:';
      case 'warning':
        return '🟡 WARNING:';
      case 'info':
        return '🔵 INFO:';
      default:
        return '⚪ UNKNOWN:';
    }
  }

  /**
   * Format error type name for display
   *
   * @param type Error type
   * @returns Formatted type name
   */
  private formatTypeName(type: ErrorType): string {
    switch (type) {
      case 'build':
        return 'Build Errors';
      case 'lint':
        return 'Lint Issues';
      case 'test':
        return 'Test Failures';
      case 'review':
        return 'Review Comments';
      case 'runtime':
        return 'Runtime Errors';
      default:
        return 'Other Errors';
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new ErrorContextAggregator
 *
 * @param maxErrors Maximum number of errors to store (optional)
 * @returns New ErrorContextAggregator instance
 */
export function createErrorContextAggregator(
  maxErrors?: number
): ErrorContextAggregator {
  return new ErrorContextAggregator(maxErrors);
}
