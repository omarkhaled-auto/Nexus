/**
 * RequestReplanTool - Agent Tool for Dynamic Replanning
 *
 * Exposes the DynamicReplanner as a tool that agents can use
 * to request replanning when they discover complexity or blockers.
 *
 * Layer 4: Execution - Agent Tools
 *
 * Philosophy: When agents encounter unexpected complexity, blockers,
 * or believe a task should be split, they can use this tool to
 * request replanning - enabling the system to adapt dynamically.
 *
 * @module RequestReplanTool
 */

import type {
  IDynamicReplanner,
  AgentReplanRequest,
  ReplanDecision,
} from '../../orchestration/planning/types';

import type { ToolDefinition, ToolParameterSchema, ToolExecutionResult } from './RequestContextTool';

// Re-export types for consumers
export type { ToolDefinition, ToolParameterSchema, ToolExecutionResult };

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * REQUEST_REPLAN_TOOL_DEFINITION
 *
 * Tool definition for the request_replan function.
 * This is exposed to agents through the LLM function calling interface.
 */
export const REQUEST_REPLAN_TOOL_DEFINITION: ToolDefinition = {
  name: 'request_replan',
  description: `Request task replanning when you discover the task is more complex than expected, encounter blockers, or believe the task should be split into smaller parts.

Use this tool when:
- The task is taking much longer than expected
- You've discovered unexpected complexity that wasn't in the original scope
- You're blocked by external dependencies or unclear requirements
- You believe the task should be split into multiple smaller tasks
- You're making the same errors repeatedly without progress

The system will evaluate your request and may split the task, adjust scope, or escalate to a human.`,
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description:
          'Detailed explanation of why replanning is needed. Be specific about what you discovered or what is blocking you.',
      },
      suggestion: {
        type: 'string',
        description:
          'Your suggestion for how the task could be split or rescoped. Optional but helpful.',
      },
      blockers: {
        type: 'array',
        description:
          'List of specific blockers preventing progress (e.g., "missing dependency X", "unclear requirement Y")',
      },
      complexity_details: {
        type: 'string',
        description:
          'Details about discovered complexity (e.g., "found 3 additional files that need changes", "requires database migration")',
      },
      affected_files: {
        type: 'array',
        description:
          'Files that are affected by the complexity or blockers. Helps with task splitting.',
      },
    },
    required: ['reason'],
  },
};

// ============================================================================
// Tool Handler Parameters
// ============================================================================

/**
 * Parameters for the request_replan tool
 */
export interface RequestReplanParams {
  /** Detailed explanation of why replanning is needed */
  reason: string;
  /** Agent's suggestion for how to proceed */
  suggestion?: string;
  /** List of specific blockers */
  blockers?: string[];
  /** Details about discovered complexity */
  complexity_details?: string;
  /** Files affected by the complexity */
  affected_files?: string[];
}

// ============================================================================
// RequestReplanToolHandler
// ============================================================================

/**
 * RequestReplanToolHandler
 *
 * Handles execution of the request_replan tool by routing
 * to the DynamicReplanner.
 */
export class RequestReplanToolHandler {
  private readonly replanner: IDynamicReplanner;
  private readonly formatOutput: boolean;

  /**
   * Create a new RequestReplanToolHandler
   *
   * @param replanner DynamicReplanner instance
   * @param formatOutput Whether to format output for agent consumption (default: true)
   */
  constructor(replanner: IDynamicReplanner, formatOutput = true) {
    this.replanner = replanner;
    this.formatOutput = formatOutput;
  }

  /**
   * Execute the tool with given parameters
   *
   * @param agentId ID of the agent making the request
   * @param taskId ID of the task being worked on
   * @param params Tool parameters
   * @returns Execution result with formatted output
   */
  async execute(
    agentId: string,
    taskId: string,
    params: RequestReplanParams
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const validationError = this.validateParams(params);
    if (validationError) {
      return {
        success: false,
        output: `Invalid parameters: ${validationError}`,
        metadata: { error: 'validation_error' },
      };
    }

    // Create AgentReplanRequest from params
    const request: AgentReplanRequest = {
      taskId,
      agentId,
      reason: params.reason,
      suggestion: params.suggestion,
      blockers: params.blockers,
      complexityDetails: params.complexity_details,
    };

    try {
      // Call replanner to handle the request
      const decision = await this.replanner.handleAgentRequest(taskId, request);

      // Format output for agent
      const output = this.formatOutput
        ? this.formatDecisionForAgent(decision, params)
        : this.formatDecisionBasic(decision);

      return {
        success: true,
        output,
        metadata: {
          taskId,
          shouldReplan: decision.shouldReplan,
          suggestedAction: decision.suggestedAction,
          confidence: decision.confidence,
          timestamp: decision.timestamp.toISOString(),
          ...(decision.reason
            ? {
                trigger: decision.reason.trigger,
                triggerConfidence: decision.reason.confidence,
              }
            : {}),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: `Error processing replan request: ${errorMessage}`,
        metadata: { error: 'execution_error', taskId },
      };
    }
  }

  /**
   * Validate tool parameters
   * Note: We validate at runtime because params come from external sources (LLMs)
   */
  private validateParams(params: RequestReplanParams): string | null {
    // Cast to unknown for runtime validation since input comes from external source
    const rawParams = params as unknown as Record<string, unknown>;

    // Validate reason (required)
    if (rawParams.reason === undefined || rawParams.reason === null) {
      return 'reason is required';
    }
    if (typeof rawParams.reason !== 'string') {
      return 'reason must be a string';
    }
    if (rawParams.reason.trim().length === 0) {
      return 'reason cannot be empty';
    }
    if (rawParams.reason.trim().length < 10) {
      return 'reason must be at least 10 characters - please provide more detail';
    }

    // Validate suggestion (optional string)
    if (rawParams.suggestion !== undefined) {
      if (typeof rawParams.suggestion !== 'string') {
        return 'suggestion must be a string';
      }
    }

    // Validate blockers (optional array of strings)
    if (rawParams.blockers !== undefined) {
      if (!Array.isArray(rawParams.blockers)) {
        return 'blockers must be an array of strings';
      }
      for (const blocker of rawParams.blockers) {
        if (typeof blocker !== 'string') {
          return 'each blocker must be a string';
        }
      }
    }

    // Validate complexity_details (optional string)
    if (rawParams.complexity_details !== undefined) {
      if (typeof rawParams.complexity_details !== 'string') {
        return 'complexity_details must be a string';
      }
    }

    // Validate affected_files (optional array of strings)
    if (rawParams.affected_files !== undefined) {
      if (!Array.isArray(rawParams.affected_files)) {
        return 'affected_files must be an array of strings';
      }
      for (const file of rawParams.affected_files) {
        if (typeof file !== 'string') {
          return 'each affected_file must be a string';
        }
      }
    }

    return null;
  }

  /**
   * Format decision for agent consumption (verbose)
   */
  private formatDecisionForAgent(
    decision: ReplanDecision,
    params: RequestReplanParams
  ): string {
    const lines: string[] = [
      '=== Replan Request Processed ===',
      '',
    ];

    // Summary
    if (decision.shouldReplan) {
      lines.push(`Decision: REPLAN RECOMMENDED`);
      lines.push(`Action: ${this.formatAction(decision.suggestedAction)}`);
    } else {
      lines.push(`Decision: CONTINUE CURRENT APPROACH`);
    }
    lines.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    lines.push('');

    // Reason details if replanning
    if (decision.reason) {
      lines.push('--- Analysis ---');
      lines.push(`Trigger: ${this.formatTrigger(decision.reason.trigger)}`);
      lines.push(`Details: ${decision.reason.details}`);
      lines.push('');
    }

    // What this means for the agent
    lines.push('--- What This Means ---');
    lines.push(this.getActionGuidance(decision));
    lines.push('');

    // Original request summary
    lines.push('--- Your Request ---');
    lines.push(`Reason: ${params.reason}`);
    if (params.blockers && params.blockers.length > 0) {
      lines.push(`Blockers: ${params.blockers.join(', ')}`);
    }
    if (params.complexity_details) {
      lines.push(`Complexity: ${params.complexity_details}`);
    }
    lines.push('');

    lines.push('=== End Replan Response ===');

    return lines.join('\n');
  }

  /**
   * Format decision in basic form
   */
  private formatDecisionBasic(decision: ReplanDecision): string {
    return JSON.stringify(
      {
        shouldReplan: decision.shouldReplan,
        suggestedAction: decision.suggestedAction,
        confidence: decision.confidence,
        reason: decision.reason
          ? {
              trigger: decision.reason.trigger,
              details: decision.reason.details,
            }
          : undefined,
      },
      null,
      2
    );
  }

  /**
   * Format action for human readability
   */
  private formatAction(action: string): string {
    switch (action) {
      case 'continue':
        return 'Continue with current approach';
      case 'split':
        return 'Split task into smaller subtasks';
      case 'rescope':
        return 'Reduce task scope';
      case 'escalate':
        return 'Escalate to human for guidance';
      case 'abort':
        return 'Abort task';
      default:
        return action;
    }
  }

  /**
   * Format trigger for human readability
   */
  private formatTrigger(trigger: string): string {
    switch (trigger) {
      case 'time_exceeded':
        return 'Time exceeded estimate';
      case 'iterations_high':
        return 'High iteration count';
      case 'scope_creep':
        return 'Scope creep detected';
      case 'complexity_discovered':
        return 'Complexity discovered';
      case 'dependency_discovered':
        return 'New dependency discovered';
      case 'blocking_issue':
        return 'Blocking issue detected';
      case 'agent_request':
        return 'Agent requested replan';
      default:
        return trigger;
    }
  }

  /**
   * Get guidance for the agent based on the decision
   */
  private getActionGuidance(decision: ReplanDecision): string {
    if (!decision.shouldReplan) {
      return 'Your concern has been noted, but the system recommends continuing with the current approach. Try a different strategy if you remain stuck.';
    }

    switch (decision.suggestedAction) {
      case 'split':
        return 'The task will be split into smaller subtasks. You will receive the first subtask to work on shortly.';
      case 'rescope':
        return 'The task scope will be reduced. Focus on the core requirements and defer non-essential work.';
      case 'escalate':
        return 'This task is being escalated to a human for guidance. Wait for further instructions.';
      case 'abort':
        return 'This task will be aborted. The blockers you identified require resolution before proceeding.';
      case 'continue':
        return 'Continue with the current approach despite the concerns noted.';
      default:
        return 'Await further instructions from the orchestrator.';
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a request replan tool with handler
 *
 * @param replanner DynamicReplanner instance
 * @param formatOutput Whether to format output for agent consumption
 * @returns Object containing tool definition and handler
 */
export function createRequestReplanTool(
  replanner: IDynamicReplanner,
  formatOutput = true
): {
  definition: ToolDefinition;
  handler: RequestReplanToolHandler;
} {
  const handler = new RequestReplanToolHandler(replanner, formatOutput);

  return {
    definition: REQUEST_REPLAN_TOOL_DEFINITION,
    handler,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a tool call is for the request_replan tool
 */
export function isRequestReplanToolCall(
  toolName: string
): toolName is 'request_replan' {
  return toolName === 'request_replan';
}

/**
 * Parse tool parameters from LLM function call
 */
export function parseRequestReplanParams(
  params: Record<string, unknown>
): RequestReplanParams | null {
  if (typeof params.reason !== 'string') {
    console.warn('[RequestReplanTool] parseRequestReplanParams failed: reason is missing or not a string');
    return null;
  }

  return {
    reason: params.reason,
    suggestion:
      typeof params.suggestion === 'string' ? params.suggestion : undefined,
    blockers: Array.isArray(params.blockers)
      ? params.blockers.filter((b): b is string => typeof b === 'string')
      : undefined,
    complexity_details:
      typeof params.complexity_details === 'string'
        ? params.complexity_details
        : undefined,
    affected_files: Array.isArray(params.affected_files)
      ? params.affected_files.filter((f): f is string => typeof f === 'string')
      : undefined,
  };
}

/**
 * Validate that a replanner is available and task is being monitored
 */
export function validateReplanContext(
  replanner: IDynamicReplanner,
  taskId: string
): { valid: boolean; error?: string } {
  // Check if task is being monitored
  const monitoredTasks = replanner.getMonitoredTasks();
  const isMonitored = monitoredTasks.some(
    (task) => task.taskId === taskId && task.isActive
  );

  if (!isMonitored) {
    return {
      valid: false,
      error: `Task ${taskId} is not being monitored. Replanning requires active monitoring.`,
    };
  }

  return { valid: true };
}
