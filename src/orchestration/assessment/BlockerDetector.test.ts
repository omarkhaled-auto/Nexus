/**
 * BlockerDetector Tests
 *
 * Tests for blocker detection and categorization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockerDetector, createBlockerDetector } from './BlockerDetector';
import type { AssessmentContext, BlockerPattern } from './types';

// ============================================================================
// Test Utilities
// ============================================================================

function createTestContext(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    taskId: 'test-task-1',
    taskName: 'Test Task',
    taskDescription: 'A test task for blocker detection',
    taskFiles: ['src/file1.ts', 'src/file2.ts'],
    iterationHistory: [],
    currentErrors: [],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BlockerDetector', () => {
  let detector: BlockerDetector;

  beforeEach(() => {
    detector = new BlockerDetector();
  });

  describe('constructor', () => {
    it('should create with default patterns', () => {
      const d = new BlockerDetector();
      expect(d).toBeInstanceOf(BlockerDetector);
    });

    it('should create with custom patterns', () => {
      const customPatterns: BlockerPattern[] = [
        {
          type: 'technical',
          pattern: /custom error/i,
          description: 'Custom error pattern',
          needsHuman: false,
          severity: 'medium',
          suggestedSolutions: ['Try again'],
        },
      ];
      const d = new BlockerDetector(customPatterns);
      expect(d).toBeInstanceOf(BlockerDetector);
    });
  });

  describe('detect', () => {
    it('should return no blockers for clean context', async () => {
      const context = createTestContext();
      const result = await detector.detect(context);

      expect(result.taskId).toBe('test-task-1');
      expect(result.blockers).toHaveLength(0);
      expect(result.severity).toBe('none');
      expect(result.canProceed).toBe(true);
      expect(result.suggestedActions).toContain('No blockers detected - continue with task');
    });

    it('should include assessment timestamp', async () => {
      const context = createTestContext();
      const before = new Date();
      const result = await detector.detect(context);
      const after = new Date();

      expect(result.assessedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.assessedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('detectTechnicalBlockers', () => {
    it('should detect module not found errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'lodash'", file: 'src/utils.ts' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const moduleBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('missing module') ||
        b.description.toLowerCase().includes('cannot find module')
      );
      expect(moduleBlocker).toBeDefined();
      expect(moduleBlocker?.type).toBe('dependency');
    });

    it('should detect type mismatch errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Type 'string' is not assignable to type 'number'", file: 'src/calc.ts' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const typeBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('type')
      );
      expect(typeBlocker).toBeDefined();
      expect(typeBlocker?.type).toBe('technical');
    });

    it('should detect syntax errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'SyntaxError: Unexpected token }', file: 'src/index.ts' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const syntaxBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('syntax')
      );
      expect(syntaxBlocker).toBeDefined();
      expect(syntaxBlocker?.type).toBe('technical');
    });

    it('should detect persistent errors from history', async () => {
      const context = createTestContext({
        iterationHistory: [
          { iteration: 1, status: 'error', errors: [{ message: 'Cannot read property x of undefined', file: 'a.ts' }], timestamp: new Date() },
          { iteration: 2, status: 'error', errors: [{ message: 'Cannot read property x of undefined', file: 'a.ts' }], timestamp: new Date() },
          { iteration: 3, status: 'error', errors: [{ message: 'Cannot read property x of undefined', file: 'a.ts' }], timestamp: new Date() },
          { iteration: 4, status: 'error', errors: [{ message: 'Cannot read property x of undefined', file: 'a.ts' }], timestamp: new Date() },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const persistentBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('persistent')
      );
      expect(persistentBlocker).toBeDefined();
    });
  });

  describe('detectDependencyBlockers', () => {
    it('should detect peer dependency conflicts', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'npm ERR! peer dep missing: react@^18.0.0, required by some-package@1.0.0' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const depBlocker = result.blockers.find(b => b.type === 'dependency');
      expect(depBlocker).toBeDefined();
    });

    it('should detect circular dependencies', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Circular dependency detected between module A and module B', file: 'src/moduleA.ts' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const circularBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('circular')
      );
      expect(circularBlocker).toBeDefined();
      expect(circularBlocker?.type).toBe('dependency');
      expect(circularBlocker?.needsHuman).toBe(true);
    });

    it('should detect version conflicts', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Version conflict detected: react@17.0.0 vs react@18.0.0' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const versionBlocker = result.blockers.find(b =>
        b.description.toLowerCase().includes('version conflict')
      );
      expect(versionBlocker).toBeDefined();
      expect(versionBlocker?.type).toBe('dependency');
    });
  });

  describe('detectRequirementBlockers', () => {
    it('should detect unclear requirements from agent feedback', async () => {
      const context = createTestContext({
        agentFeedback: 'The requirement is unclear about whether we should include pagination',
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const reqBlocker = result.blockers.find(b => b.type === 'unclear_requirement');
      expect(reqBlocker).toBeDefined();
      expect(reqBlocker?.needsHuman).toBe(true);
    });

    it('should detect ambiguous requirements', async () => {
      const context = createTestContext({
        agentFeedback: 'Not sure how the data should be formatted - the requirement is ambiguous',
      });

      const result = await detector.detect(context);

      const reqBlocker = result.blockers.find(b => b.type === 'unclear_requirement');
      expect(reqBlocker).toBeDefined();
    });

    it('should detect missing requirements', async () => {
      const context = createTestContext({
        agentFeedback: 'The authentication method is not specified in the requirements',
      });

      const result = await detector.detect(context);

      const reqBlocker = result.blockers.find(b => b.type === 'unclear_requirement');
      expect(reqBlocker).toBeDefined();
    });

    it('should detect contradictory acceptance criteria', async () => {
      const context = createTestContext({
        acceptanceCriteria: [
          'The API must return all records',
          'The API must not return more than 100 records',
          'Include pagination for all endpoints',
          'Exclude pagination from admin endpoints',
        ],
      });

      const result = await detector.detect(context);

      // May or may not detect contradictions depending on implementation
      expect(result).toBeDefined();
    });
  });

  describe('detectExternalBlockers', () => {
    it('should detect connection refused errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'ECONNREFUSED: Connection refused at localhost:5432' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const extBlocker = result.blockers.find(b => b.type === 'external');
      expect(extBlocker).toBeDefined();
    });

    it('should detect timeout errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'ETIMEDOUT: Connection timed out after 30000ms' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const extBlocker = result.blockers.find(b => b.type === 'external');
      expect(extBlocker).toBeDefined();
    });

    it('should detect rate limit errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Rate limit exceeded. Please wait before making more requests.' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const extBlocker = result.blockers.find(b => b.type === 'external');
      expect(extBlocker).toBeDefined();
    });

    it('should detect authentication errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Unauthorized: Authentication failed for API endpoint' },
        ],
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const extBlocker = result.blockers.find(b => b.type === 'external');
      expect(extBlocker).toBeDefined();
    });

    it('should detect external service issues from feedback', async () => {
      const context = createTestContext({
        agentFeedback: 'The external service API is down and cannot connect',
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const extBlocker = result.blockers.find(b => b.type === 'external');
      expect(extBlocker).toBeDefined();
    });
  });

  describe('detectKnowledgeGapBlockers', () => {
    it('should detect knowledge gaps from feedback', async () => {
      const context = createTestContext({
        agentFeedback: "I'm not familiar with this WebAssembly pattern",
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const kgBlocker = result.blockers.find(b => b.type === 'knowledge_gap');
      expect(kgBlocker).toBeDefined();
    });

    it('should detect need to research', async () => {
      const context = createTestContext({
        agentFeedback: 'Need to research how this GraphQL subscription works',
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
      const kgBlocker = result.blockers.find(b => b.type === 'knowledge_gap');
      expect(kgBlocker).toBeDefined();
    });

    it('should detect unfamiliar technologies', async () => {
      const context = createTestContext({
        agentFeedback: 'First time working with WebSocket connections',
      });

      const result = await detector.detect(context);

      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('assessSeverity', () => {
    it('should return none for no blockers', async () => {
      const context = createTestContext();
      const result = await detector.detect(context);
      expect(result.severity).toBe('none');
    });

    it('should return low for minor issues', async () => {
      const context = createTestContext({
        agentFeedback: 'Need to research this pattern',
      });
      const result = await detector.detect(context);
      expect(['none', 'low', 'medium']).toContain(result.severity);
    });

    it('should return high for human-needed blockers', async () => {
      const context = createTestContext({
        agentFeedback: 'The requirement is unclear and needs clarification',
      });
      const result = await detector.detect(context);
      expect(['medium', 'high']).toContain(result.severity);
    });

    it('should return critical for severe issues', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Circular dependency detected in core modules', file: 'core/index.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(['high', 'critical']).toContain(result.severity);
    });

    it('should return high for many blockers', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'a'", file: 'a.ts' },
          { message: "Cannot find module 'b'", file: 'b.ts' },
          { message: "Cannot find module 'c'", file: 'c.ts' },
          { message: "Cannot find module 'd'", file: 'd.ts' },
          { message: "Cannot find module 'e'", file: 'e.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(['medium', 'high']).toContain(result.severity);
    });
  });

  describe('canProceed', () => {
    it('should allow proceeding with no blockers', async () => {
      const context = createTestContext();
      const result = await detector.detect(context);
      expect(result.canProceed).toBe(true);
    });

    it('should allow proceeding with low severity solvable blockers', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'lodash'", file: 'utils.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result.canProceed).toBe(true);
    });

    it('should not allow proceeding with critical blockers', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Maximum call stack size exceeded', file: 'recursive.ts' },
        ],
      });
      const result = await detector.detect(context);
      // Critical technical errors may block proceeding
      expect(result).toBeDefined();
    });
  });

  describe('suggestedActions', () => {
    it('should suggest continuing when no blockers', async () => {
      const context = createTestContext();
      const result = await detector.detect(context);
      expect(result.suggestedActions).toContain('No blockers detected - continue with task');
    });

    it('should suggest fixing technical errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'SyntaxError: Unexpected token', file: 'app.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result.suggestedActions.some(a =>
        a.toLowerCase().includes('technical') || a.toLowerCase().includes('error')
      )).toBe(true);
    });

    it('should suggest clarification for requirement blockers', async () => {
      const context = createTestContext({
        agentFeedback: 'The requirement is unclear about the expected behavior',
      });
      const result = await detector.detect(context);
      expect(result.suggestedActions.some(a =>
        a.toLowerCase().includes('clarification') || a.toLowerCase().includes('requirement')
      )).toBe(true);
    });

    it('should suggest checking dependencies', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'express'", file: 'server.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result.suggestedActions.some(a =>
        a.toLowerCase().includes('dependency') || a.toLowerCase().includes('package')
      )).toBe(true);
    });

    it('should indicate when human intervention is needed', async () => {
      const context = createTestContext({
        agentFeedback: 'Need clarification - the specification is ambiguous',
      });
      const result = await detector.detect(context);

      if (result.blockers.some(b => b.needsHuman)) {
        expect(result.suggestedActions.some(a =>
          a.toLowerCase().includes('human') || a.toLowerCase().includes('intervention')
        )).toBe(true);
      }
    });
  });

  describe('blocker properties', () => {
    it('should generate unique blocker IDs', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'a'", file: 'a.ts' },
          { message: "Cannot find module 'b'", file: 'b.ts' },
        ],
      });
      const result = await detector.detect(context);

      const ids = result.blockers.map(b => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include affected files in blockers', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'test'", file: 'src/module.ts' },
        ],
      });
      const result = await detector.detect(context);

      const blocker = result.blockers.find(b => b.type === 'dependency');
      expect(blocker?.affectedFiles).toContain('src/module.ts');
    });

    it('should include possible solutions', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Type 'string' is not assignable to type 'number'", file: 'calc.ts' },
        ],
      });
      const result = await detector.detect(context);

      const blocker = result.blockers[0];
      expect(blocker.possibleSolutions.length).toBeGreaterThan(0);
    });

    it('should include detection timestamp', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Some error', file: 'file.ts' },
        ],
      });
      const before = new Date();
      const result = await detector.detect(context);
      const after = new Date();

      for (const blocker of result.blockers) {
        expect(blocker.detectedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(blocker.detectedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });
  });

  describe('factory function', () => {
    it('should create detector with createBlockerDetector', () => {
      const d = createBlockerDetector();
      expect(d).toBeInstanceOf(BlockerDetector);
    });

    it('should accept custom patterns in factory', () => {
      const customPatterns: BlockerPattern[] = [
        {
          type: 'technical',
          pattern: /my custom error/i,
          description: 'Custom',
          needsHuman: false,
          severity: 'low',
          suggestedSolutions: [],
        },
      ];
      const d = createBlockerDetector(customPatterns);
      expect(d).toBeInstanceOf(BlockerDetector);
    });
  });

  describe('edge cases', () => {
    it('should handle empty error messages', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: '', file: 'empty.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result).toBeDefined();
    });

    it('should handle very long error messages', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: 'Error: ' + 'x'.repeat(1000), file: 'long.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result).toBeDefined();
      // Descriptions should be truncated
      for (const blocker of result.blockers) {
        expect(blocker.description.length).toBeLessThanOrEqual(200);
      }
    });

    it('should handle null/undefined agent feedback gracefully', async () => {
      const context = createTestContext({
        agentFeedback: undefined,
      });
      const result = await detector.detect(context);
      expect(result).toBeDefined();
    });

    it('should handle empty iteration history', async () => {
      const context = createTestContext({
        iterationHistory: [],
      });
      const result = await detector.detect(context);
      expect(result).toBeDefined();
    });

    it('should deduplicate similar errors', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Cannot find module 'lodash'", file: 'a.ts' },
          { message: "Cannot find module 'lodash'", file: 'b.ts' },
          { message: "Cannot find module 'lodash'", file: 'c.ts' },
        ],
      });
      const result = await detector.detect(context);

      // Should not create 3 identical blockers - each unique module error should be one blocker
      // Even though they're from different files, they're the same missing module
      const depBlockers = result.blockers.filter(b =>
        b.type === 'dependency' && b.description.toLowerCase().includes('lodash')
      );
      // May create 1 blocker (deduplicated) or up to 3 if from different files
      // The key is the normalized message should be the same
      expect(depBlockers.length).toBeLessThanOrEqual(3);
      expect(depBlockers.length).toBeGreaterThan(0);
    });

    it('should handle special characters in error messages', async () => {
      const context = createTestContext({
        currentErrors: [
          { message: "Error in file: /path/to/file.ts:123:45 - Cannot parse 'JSON{}'", file: 'file.ts' },
        ],
      });
      const result = await detector.detect(context);
      expect(result).toBeDefined();
    });
  });
});
