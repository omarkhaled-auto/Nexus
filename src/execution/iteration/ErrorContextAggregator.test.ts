/**
 * Tests for ErrorContextAggregator
 *
 * Tests cover:
 * - Error adding and retrieval
 * - Deduplication (by message + file + line)
 * - Filtering by type
 * - Formatting for agent consumption
 * - Prioritization by severity and type
 * - Clearing errors
 * - Iteration tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorContextAggregator,
  createErrorContextAggregator,
} from './ErrorContextAggregator';
import type { ErrorEntry, ErrorType, ErrorSeverity } from './types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a test error entry
 */
function createTestError(
  overrides: Partial<ErrorEntry> = {}
): ErrorEntry {
  return {
    type: 'test',
    severity: 'error',
    message: 'Test error message',
    file: 'test-file.ts',
    line: 10,
    column: 5,
    code: 'TEST001',
    suggestion: 'Fix the test',
    iteration: 1,
    ...overrides,
  };
}

/**
 * Create multiple test errors
 */
function createTestErrors(count: number, baseIteration: number = 1): ErrorEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createTestError({
      message: `Error ${i + 1}`,
      line: 10 + i,
      iteration: baseIteration,
    })
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('ErrorContextAggregator', () => {
  let aggregator: ErrorContextAggregator;

  beforeEach(() => {
    aggregator = new ErrorContextAggregator();
  });

  // ==========================================================================
  // Error Adding Tests
  // ==========================================================================

  describe('addErrors', () => {
    it('should add errors to the collection', () => {
      const errors = createTestErrors(3);
      aggregator.addErrors(errors);

      expect(aggregator.getErrorCount()).toBe(3);
      expect(aggregator.getAllErrors()).toHaveLength(3);
    });

    it('should accumulate errors from multiple calls', () => {
      aggregator.addErrors(createTestErrors(2));
      aggregator.addErrors(createTestErrors(3));

      expect(aggregator.getErrorCount()).toBe(5);
    });

    it('should mark errors with current iteration if not set', () => {
      aggregator.setCurrentIteration(5);

      const error = createTestError({ iteration: 0 });
      aggregator.addErrors([error]);

      const errors = aggregator.getAllErrors();
      // Note: iteration 0 is falsy, so it should be replaced with 5
      // However, if iteration is explicitly 0, it won't be overwritten
      // because of how JS handles falsy values. Let's check:
      expect(errors[0].iteration).toBe(5);
    });

    it('should preserve existing iteration number', () => {
      aggregator.setCurrentIteration(5);

      const error = createTestError({ iteration: 3 });
      aggregator.addErrors([error]);

      const errors = aggregator.getAllErrors();
      expect(errors[0].iteration).toBe(3);
    });

    it('should trim errors when exceeding max limit', () => {
      const maxErrors = 10;
      const limitedAggregator = new ErrorContextAggregator(maxErrors);

      limitedAggregator.addErrors(createTestErrors(15));

      expect(limitedAggregator.getErrorCount()).toBe(10);
    });

    it('should keep most recent errors when trimming', () => {
      const maxErrors = 5;
      const limitedAggregator = new ErrorContextAggregator(maxErrors);

      // Add 8 errors with different iteration numbers
      const errors = Array.from({ length: 8 }, (_, i) =>
        createTestError({
          message: `Error ${i + 1}`,
          iteration: i + 1,
        })
      );
      limitedAggregator.addErrors(errors);

      const remaining = limitedAggregator.getAllErrors();
      expect(remaining).toHaveLength(5);
      // Should keep iterations 4, 5, 6, 7, 8 (the last 5)
      expect(remaining[0].iteration).toBe(4);
      expect(remaining[4].iteration).toBe(8);
    });
  });

  // ==========================================================================
  // Deduplication Tests
  // ==========================================================================

  describe('getUniqueErrors', () => {
    it('should deduplicate identical errors', () => {
      const error1 = createTestError({ message: 'Same error', file: 'a.ts', line: 10, iteration: 1 });
      const error2 = createTestError({ message: 'Same error', file: 'a.ts', line: 10, iteration: 2 });
      const error3 = createTestError({ message: 'Different error', file: 'a.ts', line: 10, iteration: 1 });

      aggregator.addErrors([error1, error2, error3]);

      const unique = aggregator.getUniqueErrors();
      expect(unique).toHaveLength(2);
    });

    it('should keep most recent occurrence when deduplicating', () => {
      const error1 = createTestError({ message: 'Same error', file: 'a.ts', line: 10, iteration: 1 });
      const error2 = createTestError({ message: 'Same error', file: 'a.ts', line: 10, iteration: 3 });

      aggregator.addErrors([error1, error2]);

      const unique = aggregator.getUniqueErrors();
      expect(unique).toHaveLength(1);
      expect(unique[0].iteration).toBe(3);
    });

    it('should treat different lines as different errors', () => {
      const error1 = createTestError({ message: 'Same error', file: 'a.ts', line: 10 });
      const error2 = createTestError({ message: 'Same error', file: 'a.ts', line: 20 });

      aggregator.addErrors([error1, error2]);

      const unique = aggregator.getUniqueErrors();
      expect(unique).toHaveLength(2);
    });

    it('should treat different files as different errors', () => {
      const error1 = createTestError({ message: 'Same error', file: 'a.ts', line: 10 });
      const error2 = createTestError({ message: 'Same error', file: 'b.ts', line: 10 });

      aggregator.addErrors([error1, error2]);

      const unique = aggregator.getUniqueErrors();
      expect(unique).toHaveLength(2);
    });

    it('should handle errors without file information', () => {
      const error1 = createTestError({ message: 'No file error', file: undefined, line: undefined });
      const error2 = createTestError({ message: 'No file error', file: undefined, line: undefined });
      const error3 = createTestError({ message: 'Different no file error', file: undefined, line: undefined });

      aggregator.addErrors([error1, error2, error3]);

      const unique = aggregator.getUniqueErrors();
      expect(unique).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Filtering Tests
  // ==========================================================================

  describe('getErrorsByType', () => {
    beforeEach(() => {
      aggregator.addErrors([
        createTestError({ type: 'build', message: 'Build error 1' }),
        createTestError({ type: 'build', message: 'Build error 2' }),
        createTestError({ type: 'lint', message: 'Lint error 1' }),
        createTestError({ type: 'test', message: 'Test error 1' }),
        createTestError({ type: 'test', message: 'Test error 2' }),
        createTestError({ type: 'test', message: 'Test error 3' }),
        createTestError({ type: 'review', message: 'Review comment' }),
        createTestError({ type: 'runtime', message: 'Runtime error' }),
      ]);
    });

    it('should filter build errors', () => {
      const buildErrors = aggregator.getErrorsByType('build');
      expect(buildErrors).toHaveLength(2);
      expect(buildErrors.every((e) => e.type === 'build')).toBe(true);
    });

    it('should filter lint errors', () => {
      const lintErrors = aggregator.getErrorsByType('lint');
      expect(lintErrors).toHaveLength(1);
    });

    it('should filter test errors', () => {
      const testErrors = aggregator.getErrorsByType('test');
      expect(testErrors).toHaveLength(3);
    });

    it('should return empty array for type with no errors', () => {
      const newAggregator = new ErrorContextAggregator();
      newAggregator.addErrors([createTestError({ type: 'build' })]);

      const reviewErrors = newAggregator.getErrorsByType('review');
      expect(reviewErrors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Formatting Tests
  // ==========================================================================

  describe('formatErrorsForAgent', () => {
    it('should return message for empty errors', () => {
      const formatted = aggregator.formatErrorsForAgent();
      expect(formatted).toBe('No errors from previous iterations.');
    });

    it('should include header with summary', () => {
      aggregator.addErrors([
        createTestError({ severity: 'error' }),
        createTestError({ severity: 'error', message: 'error 2', line: 20 }),
        createTestError({ severity: 'warning', message: 'warning', line: 30 }),
        createTestError({ severity: 'info', message: 'info', line: 40 }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();

      expect(formatted).toContain('## Errors from Previous Iterations');
      expect(formatted).toContain('2 error(s)');
      expect(formatted).toContain('1 warning(s)');
      expect(formatted).toContain('1 info');
    });

    it('should group errors by type', () => {
      aggregator.addErrors([
        createTestError({ type: 'build', message: 'Build error', line: 10 }),
        createTestError({ type: 'test', message: 'Test error', line: 20 }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();

      expect(formatted).toContain('### Build Errors');
      expect(formatted).toContain('### Test Failures');
    });

    it('should include error details', () => {
      aggregator.addErrors([
        createTestError({
          type: 'lint',
          severity: 'warning',
          message: 'Unused variable',
          file: 'src/app.ts',
          line: 42,
          column: 10,
          code: 'no-unused-vars',
          suggestion: 'Remove the unused variable',
          iteration: 2,
        }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();

      expect(formatted).toContain('WARNING:');
      expect(formatted).toContain('[no-unused-vars]');
      expect(formatted).toContain('Unused variable');
      expect(formatted).toContain('src/app.ts:42:10');
      expect(formatted).toContain('Remove the unused variable');
      expect(formatted).toContain('iteration 2');
    });

    it('should use appropriate severity badges', () => {
      aggregator.addErrors([
        createTestError({ severity: 'error', message: 'Error msg', line: 10 }),
        createTestError({ severity: 'warning', message: 'Warning msg', line: 20 }),
        createTestError({ severity: 'info', message: 'Info msg', line: 30 }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();

      expect(formatted).toContain('🔴 ERROR:');
      expect(formatted).toContain('🟡 WARNING:');
      expect(formatted).toContain('🔵 INFO:');
    });

    it('should handle errors without optional fields', () => {
      aggregator.addErrors([
        createTestError({
          message: 'Simple error',
          file: undefined,
          line: undefined,
          column: undefined,
          code: undefined,
          suggestion: undefined,
        }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();

      expect(formatted).toContain('Simple error');
      expect(formatted).not.toContain('📍');
      expect(formatted).not.toContain('💡');
    });
  });

  // ==========================================================================
  // Prioritization Tests
  // ==========================================================================

  describe('error prioritization', () => {
    it('should prioritize errors over warnings', () => {
      aggregator.addErrors([
        createTestError({ severity: 'warning', message: 'Warning', line: 10 }),
        createTestError({ severity: 'error', message: 'Error', line: 20 }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();
      const errorIndex = formatted.indexOf('🔴 ERROR:');
      const warningIndex = formatted.indexOf('🟡 WARNING:');

      expect(errorIndex).toBeLessThan(warningIndex);
    });

    it('should prioritize build errors over lint errors of same severity', () => {
      aggregator.addErrors([
        createTestError({ type: 'lint', severity: 'error', message: 'Lint error', line: 10 }),
        createTestError({ type: 'build', severity: 'error', message: 'Build error', line: 20 }),
      ]);

      const formatted = aggregator.formatErrorsForAgent();
      const buildIndex = formatted.indexOf('Build Errors');
      const lintIndex = formatted.indexOf('Lint Issues');

      expect(buildIndex).toBeLessThan(lintIndex);
    });
  });

  // ==========================================================================
  // Clear Tests
  // ==========================================================================

  describe('clear', () => {
    it('should remove all errors', () => {
      aggregator.addErrors(createTestErrors(5));
      expect(aggregator.getErrorCount()).toBe(5);

      aggregator.clear();

      expect(aggregator.getErrorCount()).toBe(0);
      expect(aggregator.getAllErrors()).toHaveLength(0);
      expect(aggregator.getUniqueErrors()).toHaveLength(0);
    });

    it('should allow adding new errors after clear', () => {
      aggregator.addErrors(createTestErrors(3));
      aggregator.clear();
      aggregator.addErrors(createTestErrors(2));

      expect(aggregator.getErrorCount()).toBe(2);
    });
  });

  // ==========================================================================
  // Iteration Tracking Tests
  // ==========================================================================

  describe('iteration tracking', () => {
    it('should track errors by iteration', () => {
      aggregator.addErrors([
        createTestError({ message: 'Iter 1 error', iteration: 1 }),
        createTestError({ message: 'Iter 2 error 1', iteration: 2, line: 10 }),
        createTestError({ message: 'Iter 2 error 2', iteration: 2, line: 20 }),
        createTestError({ message: 'Iter 3 error', iteration: 3 }),
      ]);

      const iter1Errors = aggregator.getErrorsByIteration(1);
      const iter2Errors = aggregator.getErrorsByIteration(2);
      const iter3Errors = aggregator.getErrorsByIteration(3);

      expect(iter1Errors).toHaveLength(1);
      expect(iter2Errors).toHaveLength(2);
      expect(iter3Errors).toHaveLength(1);
    });

    it('should return empty for non-existent iteration', () => {
      aggregator.addErrors([createTestError({ iteration: 1 })]);

      const errors = aggregator.getErrorsByIteration(99);
      expect(errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Utility Method Tests
  // ==========================================================================

  describe('utility methods', () => {
    it('should report unique error count', () => {
      aggregator.addErrors([
        createTestError({ message: 'Same', file: 'a.ts', line: 10, iteration: 1 }),
        createTestError({ message: 'Same', file: 'a.ts', line: 10, iteration: 2 }),
        createTestError({ message: 'Different', file: 'a.ts', line: 20, iteration: 1 }),
      ]);

      expect(aggregator.getErrorCount()).toBe(3);
      expect(aggregator.getUniqueErrorCount()).toBe(2);
    });

    it('should check for errors of severity', () => {
      aggregator.addErrors([
        createTestError({ severity: 'warning' }),
        createTestError({ severity: 'info', message: 'info', line: 20 }),
      ]);

      expect(aggregator.hasErrorsOfSeverity('warning')).toBe(true);
      expect(aggregator.hasErrorsOfSeverity('info')).toBe(true);
      expect(aggregator.hasErrorsOfSeverity('error')).toBe(false);
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createErrorContextAggregator', () => {
    it('should create aggregator with default max errors', () => {
      const agg = createErrorContextAggregator();
      expect(agg).toBeInstanceOf(ErrorContextAggregator);

      // Add more than 100 errors to verify default limit
      agg.addErrors(createTestErrors(150));
      expect(agg.getErrorCount()).toBe(100);
    });

    it('should create aggregator with custom max errors', () => {
      const agg = createErrorContextAggregator(20);

      agg.addErrors(createTestErrors(30));
      expect(agg.getErrorCount()).toBe(20);
    });
  });
});
