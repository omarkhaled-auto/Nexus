/**
 * RequestReplanTool Tests
 *
 * Tests for the agent replan request tool.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  REQUEST_REPLAN_TOOL_DEFINITION,
  RequestReplanToolHandler,
  createRequestReplanTool,
  isRequestReplanToolCall,
  parseRequestReplanParams,
  validateReplanContext,
  type RequestReplanParams,
} from './RequestReplanTool';
import type {
  IDynamicReplanner,
  ReplanDecision,
  AgentReplanRequest,
  MonitoredTask,
  ExecutionContext,
  TriggerThresholds,
  ReplanReason,
  ReplanResult,
} from '../../orchestration/planning/types';

// ============================================================================
// Mock Replanner
// ============================================================================

function createMockReplanner(): IDynamicReplanner {
  const monitoredTasks: MonitoredTask[] = [];

  return {
    startMonitoring: vi.fn((taskId: string, context: ExecutionContext) => {
      monitoredTasks.push({
        taskId,
        startedAt: new Date(),
        context,
        decisions: [],
        isActive: true,
      });
    }),
    stopMonitoring: vi.fn((taskId: string) => {
      const task = monitoredTasks.find((t) => t.taskId === taskId);
      if (task) task.isActive = false;
    }),
    updateContext: vi.fn(),
    checkReplanningNeeded: vi.fn(),
    evaluateAllTriggers: vi.fn(),
    replan: vi.fn(),
    handleAgentRequest: vi.fn().mockResolvedValue({
      shouldReplan: true,
      reason: {
        trigger: 'agent_request',
        details: 'Agent requested replan due to complexity',
        metrics: {
          timeElapsed: 30,
          estimatedTime: 60,
          timeRatio: 0.5,
          iterations: 5,
          maxIterations: 20,
          iterationRatio: 0.25,
          filesModified: 2,
          filesExpected: 3,
          scopeCreepCount: 0,
          errorsEncountered: 3,
          consecutiveFailures: 2,
        },
        confidence: 0.85,
      },
      suggestedAction: 'split',
      confidence: 0.85,
      timestamp: new Date('2024-01-15T10:30:00Z'),
    } as ReplanDecision),
    setThresholds: vi.fn(),
    getThresholds: vi.fn().mockReturnValue({
      timeExceededRatio: 1.5,
      iterationsRatio: 0.4,
      scopeCreepFiles: 3,
      consecutiveFailures: 5,
      complexityKeywords: ['refactor', 'complex'],
    } as TriggerThresholds),
    getMonitoredTasks: vi.fn().mockReturnValue(monitoredTasks),
    getDecisionHistory: vi.fn().mockReturnValue([]),
  };
}

// ============================================================================
// Tool Definition Tests
// ============================================================================

describe('REQUEST_REPLAN_TOOL_DEFINITION', () => {
  it('has correct name', () => {
    expect(REQUEST_REPLAN_TOOL_DEFINITION.name).toBe('request_replan');
  });

  it('has description', () => {
    expect(REQUEST_REPLAN_TOOL_DEFINITION.description).toContain('replanning');
    expect(REQUEST_REPLAN_TOOL_DEFINITION.description).toContain('complex');
    expect(REQUEST_REPLAN_TOOL_DEFINITION.description).toContain('blockers');
  });

  it('has reason as required parameter', () => {
    expect(REQUEST_REPLAN_TOOL_DEFINITION.parameters.required).toContain('reason');
  });

  it('defines all expected properties', () => {
    const props = REQUEST_REPLAN_TOOL_DEFINITION.parameters.properties;
    expect(props).toHaveProperty('reason');
    expect(props).toHaveProperty('suggestion');
    expect(props).toHaveProperty('blockers');
    expect(props).toHaveProperty('complexity_details');
    expect(props).toHaveProperty('affected_files');
  });

  it('has correct parameter types', () => {
    const props = REQUEST_REPLAN_TOOL_DEFINITION.parameters.properties;
    expect(props.reason.type).toBe('string');
    expect(props.suggestion.type).toBe('string');
    expect(props.blockers.type).toBe('array');
    expect(props.complexity_details.type).toBe('string');
    expect(props.affected_files.type).toBe('array');
  });
});

// ============================================================================
// RequestReplanToolHandler Tests
// ============================================================================

describe('RequestReplanToolHandler', () => {
  let mockReplanner: IDynamicReplanner;
  let handler: RequestReplanToolHandler;

  beforeEach(() => {
    mockReplanner = createMockReplanner();
    handler = new RequestReplanToolHandler(mockReplanner);

    // Start monitoring a task
    mockReplanner.startMonitoring('task-1', {
      taskId: 'task-1',
      taskName: 'Test Task',
      estimatedTime: 60,
      timeElapsed: 30,
      iteration: 5,
      maxIterations: 20,
      filesExpected: ['file1.ts', 'file2.ts'],
      filesModified: ['file1.ts'],
      errors: [],
      consecutiveFailures: 0,
    });
  });

  describe('execute', () => {
    it('returns success with valid parameters', async () => {
      const params: RequestReplanParams = {
        reason: 'Task is more complex than expected, requires database migration',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Replan Request Processed');
      expect(result.metadata?.shouldReplan).toBe(true);
    });

    it('calls replanner.handleAgentRequest with correct arguments', async () => {
      const params: RequestReplanParams = {
        reason: 'Discovered complex dependency chain',
        suggestion: 'Split into setup and implementation phases',
        blockers: ['circular dependency', 'missing types'],
        complexity_details: 'Found 5 additional files that need changes',
      };

      await handler.execute('agent-1', 'task-1', params);

      expect(mockReplanner.handleAgentRequest).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskId: 'task-1',
          agentId: 'agent-1',
          reason: params.reason,
          suggestion: params.suggestion,
          blockers: params.blockers,
          complexityDetails: params.complexity_details,
        })
      );
    });

    it('returns validation error for missing reason', async () => {
      const params = {} as RequestReplanParams;

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Invalid parameters');
      expect(result.output).toContain('reason is required');
    });

    it('returns validation error for empty reason', async () => {
      const params: RequestReplanParams = {
        reason: '',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('reason cannot be empty');
    });

    it('returns validation error for too short reason', async () => {
      const params: RequestReplanParams = {
        reason: 'stuck',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('at least 10 characters');
    });

    it('returns validation error for non-string blockers', async () => {
      const params = {
        reason: 'This is a valid detailed reason for replanning',
        blockers: [123, 456], // Should be strings
      } as unknown as RequestReplanParams;

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('must be a string');
    });

    it('handles replanner errors gracefully', async () => {
      vi.mocked(mockReplanner.handleAgentRequest).mockRejectedValueOnce(
        new Error('Replanner unavailable')
      );

      const params: RequestReplanParams = {
        reason: 'Need to replan due to complexity discovered',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Error processing replan request');
      expect(result.output).toContain('Replanner unavailable');
    });

    it('includes metadata in response', async () => {
      const params: RequestReplanParams = {
        reason: 'Need to replan due to complexity discovered',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.metadata).toEqual(
        expect.objectContaining({
          taskId: 'task-1',
          shouldReplan: true,
          suggestedAction: 'split',
          confidence: 0.85,
          trigger: 'agent_request',
        })
      );
    });

    it('formats decision when no replan needed', async () => {
      vi.mocked(mockReplanner.handleAgentRequest).mockResolvedValueOnce({
        shouldReplan: false,
        suggestedAction: 'continue',
        confidence: 0.7,
        timestamp: new Date(),
      });

      const params: RequestReplanParams = {
        reason: 'This task might be slightly complex',
      };

      const result = await handler.execute('agent-1', 'task-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('CONTINUE CURRENT APPROACH');
      expect(result.metadata?.shouldReplan).toBe(false);
    });
  });

  describe('formatOutput option', () => {
    it('returns formatted output when formatOutput is true', async () => {
      const handlerFormatted = new RequestReplanToolHandler(mockReplanner, true);
      const params: RequestReplanParams = {
        reason: 'Task complexity discovered requiring replan',
      };

      const result = await handlerFormatted.execute('agent-1', 'task-1', params);

      expect(result.output).toContain('===');
      expect(result.output).toContain('What This Means');
    });

    it('returns JSON output when formatOutput is false', async () => {
      const handlerBasic = new RequestReplanToolHandler(mockReplanner, false);
      const params: RequestReplanParams = {
        reason: 'Task complexity discovered requiring replan',
      };

      const result = await handlerBasic.execute('agent-1', 'task-1', params);

      // Should be valid JSON
      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveProperty('shouldReplan');
      expect(parsed).toHaveProperty('suggestedAction');
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createRequestReplanTool', () => {
  it('returns definition and handler', () => {
    const mockReplanner = createMockReplanner();
    const tool = createRequestReplanTool(mockReplanner);

    expect(tool.definition).toBe(REQUEST_REPLAN_TOOL_DEFINITION);
    expect(tool.handler).toBeInstanceOf(RequestReplanToolHandler);
  });

  it('passes formatOutput option to handler', async () => {
    const mockReplanner = createMockReplanner();
    const tool = createRequestReplanTool(mockReplanner, false);

    // Start monitoring
    mockReplanner.startMonitoring('task-1', {
      taskId: 'task-1',
      taskName: 'Test',
      estimatedTime: 60,
      timeElapsed: 0,
      iteration: 1,
      maxIterations: 20,
      filesExpected: [],
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    });

    const result = await tool.handler.execute('agent-1', 'task-1', {
      reason: 'Complex task discovered during execution',
    });

    // Should be JSON when formatOutput is false
    expect(() => JSON.parse(result.output)).not.toThrow();
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('isRequestReplanToolCall', () => {
  it('returns true for request_replan', () => {
    expect(isRequestReplanToolCall('request_replan')).toBe(true);
  });

  it('returns false for other tool names', () => {
    expect(isRequestReplanToolCall('request_context')).toBe(false);
    expect(isRequestReplanToolCall('read_file')).toBe(false);
    expect(isRequestReplanToolCall('')).toBe(false);
  });
});

describe('parseRequestReplanParams', () => {
  it('parses valid params with only reason', () => {
    const result = parseRequestReplanParams({
      reason: 'Task is too complex',
    });

    expect(result).toEqual({
      reason: 'Task is too complex',
      suggestion: undefined,
      blockers: undefined,
      complexity_details: undefined,
      affected_files: undefined,
    });
  });

  it('parses valid params with all fields', () => {
    const result = parseRequestReplanParams({
      reason: 'Task complexity discovered',
      suggestion: 'Split into phases',
      blockers: ['blocker1', 'blocker2'],
      complexity_details: 'Found many dependencies',
      affected_files: ['file1.ts', 'file2.ts'],
    });

    expect(result).toEqual({
      reason: 'Task complexity discovered',
      suggestion: 'Split into phases',
      blockers: ['blocker1', 'blocker2'],
      complexity_details: 'Found many dependencies',
      affected_files: ['file1.ts', 'file2.ts'],
    });
  });

  it('returns null for missing reason', () => {
    const result = parseRequestReplanParams({
      suggestion: 'Split into phases',
    });

    expect(result).toBeNull();
  });

  it('returns null for non-string reason', () => {
    const result = parseRequestReplanParams({
      reason: 123,
    });

    expect(result).toBeNull();
  });

  it('filters non-string blockers', () => {
    const result = parseRequestReplanParams({
      reason: 'Test reason',
      blockers: ['valid', 123, 'also valid', null],
    });

    expect(result?.blockers).toEqual(['valid', 'also valid']);
  });

  it('filters non-string affected_files', () => {
    const result = parseRequestReplanParams({
      reason: 'Test reason',
      affected_files: ['file1.ts', 456, 'file2.ts'],
    });

    expect(result?.affected_files).toEqual(['file1.ts', 'file2.ts']);
  });
});

describe('validateReplanContext', () => {
  it('returns valid for monitored task', () => {
    const mockReplanner = createMockReplanner();
    mockReplanner.startMonitoring('task-1', {
      taskId: 'task-1',
      taskName: 'Test',
      estimatedTime: 60,
      timeElapsed: 0,
      iteration: 1,
      maxIterations: 20,
      filesExpected: [],
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    });

    const result = validateReplanContext(mockReplanner, 'task-1');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid for unmonitored task', () => {
    const mockReplanner = createMockReplanner();

    const result = validateReplanContext(mockReplanner, 'unknown-task');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not being monitored');
  });

  it('returns invalid for inactive task', () => {
    const mockReplanner = createMockReplanner();
    mockReplanner.startMonitoring('task-1', {
      taskId: 'task-1',
      taskName: 'Test',
      estimatedTime: 60,
      timeElapsed: 0,
      iteration: 1,
      maxIterations: 20,
      filesExpected: [],
      filesModified: [],
      errors: [],
      consecutiveFailures: 0,
    });
    mockReplanner.stopMonitoring('task-1');

    const result = validateReplanContext(mockReplanner, 'task-1');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not being monitored');
  });
});
