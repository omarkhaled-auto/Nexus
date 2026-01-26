/**
 * BaseAgentRunner - Abstract base class for all agent runners
 *
 * Phase 14B Task 12: Provides the common LLM interaction loop, timeout handling,
 * event emission, and error handling for all specialized agents.
 *
 * @module execution/agents
 */

import type { LLMClient, ChatOptions } from '../../llm/types';
import { EventBus } from '../../orchestration/events/EventBus';
import type { AgentType } from '../../types/agent';
import type { Task, TaskResult } from '../../types/task';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Context provided to agents for task execution
 */
export interface AgentContext {
  /** The task being executed */
  taskId: string;
  /** Feature this task belongs to */
  featureId: string;
  /** Project this task belongs to */
  projectId: string;
  /** Working directory for file operations */
  workingDir: string;
  /** Files relevant to this task */
  relevantFiles?: string[];
  /** Previous attempt summaries for retry context */
  previousAttempts?: string[];
}

/**
 * Configuration options for agent runners
 */
export interface AgentConfig {
  /** Maximum iterations before escalation (default: 50) */
  maxIterations?: number;
  /** Timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
}

/**
 * Internal message format for agent conversation
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Extended TaskResult with agent-specific fields
 */
export interface AgentTaskResult extends TaskResult {
  /** Number of LLM iterations used */
  iterations?: number;
  /** Total duration in milliseconds */
  duration?: number;
  /** Output content from the agent */
  output?: string;
  /** Escalation reason if escalated */
  escalationReason?: string;
}

// ============================================================================
// BaseAgentRunner Abstract Class
// ============================================================================

/**
 * Abstract base class for all agent runners.
 *
 * Provides:
 * - Common LLM interaction loop with iteration limits
 * - Timeout handling
 * - Event emission for observability
 * - Error handling and recovery
 * - Context building helpers
 *
 * @example
 * ```typescript
 * class CoderAgent extends BaseAgentRunner {
 *   getAgentType(): AgentType { return 'coder'; }
 *   protected getSystemPrompt(): string { return CODER_PROMPT; }
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseAgentRunner {
  /** LLM client (API or CLI) */
  protected llmClient: LLMClient;

  /** Event bus for emitting agent events */
  protected eventBus: EventBus;

  /** Agent configuration */
  protected config: Required<AgentConfig>;

  /**
   * Create a new agent runner
   *
   * @param llmClient - The LLM client to use for chat (API or CLI)
   * @param config - Optional configuration overrides
   */
  constructor(
    llmClient: LLMClient,
    config?: AgentConfig
  ) {
    this.llmClient = llmClient;
    this.eventBus = EventBus.getInstance();
    this.config = {
      maxIterations: config?.maxIterations ?? 50,
      timeout: config?.timeout ?? 1800000, // 30 minutes
    };
  }

  // ============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================================

  /**
   * Execute a task - main entry point for the agent
   *
   * @param task - The task to execute
   * @param context - Execution context
   * @returns Task execution result
   */
  abstract execute(task: Task, context: AgentContext): Promise<AgentTaskResult>;

  /**
   * Get the agent type identifier
   */
  abstract getAgentType(): AgentType;

  /**
   * Get the system prompt for this agent type
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Build the initial user prompt for a task
   *
   * @param task - The task to build prompt for
   * @param context - Execution context
   */
  protected abstract buildTaskPrompt(task: Task, context: AgentContext): string;

  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param task - The task being executed
   */
  protected abstract isTaskComplete(response: string, task: Task): boolean;

  // ============================================================================
  // Protected Methods (for use by subclasses)
  // ============================================================================

  /**
   * Run the agent loop - iteratively interact with LLM until task complete
   *
   * This is the core execution method that handles:
   * - Iteration limits
   * - Timeouts
   * - Error recovery
   * - Event emission
   *
   * @param task - The task being executed
   * @param context - Execution context
   * @param initialPrompt - The initial prompt to send to the LLM
   * @returns Task execution result
   */
  protected async runAgentLoop(
    task: Task,
    context: AgentContext,
    initialPrompt: string
  ): Promise<AgentTaskResult> {
    const startTime = Date.now();
    let iteration = 0;
    const messages: Message[] = [
      { role: 'user', content: initialPrompt },
    ];

    // Emit start event
    this.emitEvent('agent:started', {
      taskId: task.id,
      agentType: this.getAgentType(),
    });

    while (iteration < this.config.maxIterations) {
      iteration++;

      // Check timeout
      if (Date.now() - startTime > this.config.timeout) {
        return this.createTimeoutResult(task, iteration, startTime);
      }

      // Emit iteration event
      this.emitEvent('agent:iteration', {
        taskId: task.id,
        iteration,
        agentType: this.getAgentType(),
      });

      try {
        // Call LLM with conversation history
        // System prompt is included as a system message in the messages array
        // Pass workingDirectory from context so CLI runs in the correct project folder
        const chatOptions: ChatOptions = {
          workingDirectory: context.workingDir,
        };

        const response = await this.llmClient.chat(
          this.convertToLLMMessages(messages, this.getSystemPrompt()),
          chatOptions
        );

        const content = response.content;

        // Check for task completion
        if (this.isTaskComplete(content, task)) {
          this.emitEvent('agent:completed', {
            taskId: task.id,
            iterations: iteration,
            success: true,
            agentType: this.getAgentType(),
          });

          return {
            taskId: task.id,
            success: true,
            escalated: false,
            output: content,
            iterations: iteration,
            duration: Date.now() - startTime,
            metrics: {
              iterations: iteration,
              tokensUsed: response.usage?.totalTokens ?? 0,
              timeMs: Date.now() - startTime,
            },
          };
        }

        // Continue conversation - add response and prompt for continuation
        messages.push({ role: 'assistant', content });
        messages.push({
          role: 'user',
          content: this.getContinuationPrompt(),
        });
      } catch (error) {
        // Emit error event
        this.emitEvent('agent:error', {
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          agentType: this.getAgentType(),
          iteration,
        });

        // Add error to conversation context and retry
        messages.push({
          role: 'user',
          content: this.getErrorRecoveryPrompt(error),
        });
      }
    }

    // Max iterations reached - escalate
    return this.createMaxIterationsResult(task, iteration, startTime);
  }

  /**
   * Emit an event through the event bus
   *
   * @param type - Internal event type (will be mapped to proper EventType)
   * @param payload - Event payload
   */
  protected emitEvent(
    type: string,
    payload: Record<string, unknown>
  ): void {
    // Map internal event types to proper EventType values
    // Use agent:progress for iteration updates and agent:error for errors
    const payloadAgentId = payload.agentId;
    const payloadTaskId = payload.taskId;
    const agentId = typeof payloadAgentId === 'string' ? payloadAgentId :
                    typeof payloadTaskId === 'string' ? payloadTaskId : 'unknown';
    const taskId = typeof payloadTaskId === 'string' ? payloadTaskId : 'unknown';

    if (type === 'agent:started') {
      void this.eventBus.emit('agent:started', {
        agentId,
        taskId,
      });
    } else if (type === 'agent:iteration') {
      const iteration = typeof payload.iteration === 'number' ? payload.iteration : 0;
      void this.eventBus.emit('agent:progress', {
        agentId,
        taskId,
        action: 'iteration',
        details: `Iteration ${String(iteration)}`,
      });
    } else if (type === 'agent:completed') {
      void this.eventBus.emit('task:completed', {
        taskId,
        result: {
          taskId,
          success: true,
          files: [],
        },
      });
    } else if (type === 'agent:error') {
      const errorMsg = typeof payload.error === 'string' ? payload.error : 'Unknown error';
      void this.eventBus.emit('agent:error', {
        agentId,
        error: errorMsg,
        recoverable: true,
      });
    } else if (type === 'agent:escalated') {
      const reason = typeof payload.reason === 'string' ? payload.reason : 'Unknown reason';
      const iterations = typeof payload.iterations === 'number' ? payload.iterations : 0;
      const lastError = typeof payload.error === 'string' ? payload.error : undefined;
      void this.eventBus.emit('task:escalated', {
        taskId,
        reason,
        iterations,
        lastError,
      });
    } else {
      // Default to agent:progress for unknown events
      void this.eventBus.emit('agent:progress', {
        agentId,
        taskId,
        action: type,
        details: JSON.stringify(payload),
      });
    }
  }

  /**
   * Build the context section for prompts
   *
   * @param context - Agent context
   * @returns Formatted context string
   */
  protected buildContextSection(context: AgentContext): string {
    const sections: string[] = [];

    sections.push('## Context');
    sections.push(`Working Directory: ${context.workingDir}`);

    if (context.relevantFiles?.length) {
      sections.push('');
      sections.push('### Relevant Files');
      context.relevantFiles.forEach((f) => {
        sections.push(`- ${f}`);
      });
    }

    if (context.previousAttempts?.length) {
      sections.push('');
      sections.push('### Previous Attempts');
      context.previousAttempts.forEach((a, i) => {
        sections.push(`${i + 1}. ${a}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Create a timeout result
   */
  protected createTimeoutResult(
    task: Task,
    iteration: number,
    startTime: number
  ): AgentTaskResult {
    this.emitEvent('agent:escalated', {
      taskId: task.id,
      reason: 'timeout',
      iterations: iteration,
      agentType: this.getAgentType(),
    });

    return {
      taskId: task.id,
      success: false,
      escalated: true,
      reason: 'Task timed out',
      output: 'Task execution timed out',
      iterations: iteration,
      duration: Date.now() - startTime,
      escalationReason: `Task timed out after ${Math.round((Date.now() - startTime) / 1000)} seconds`,
      metrics: {
        iterations: iteration,
        tokensUsed: 0,
        timeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Create a max iterations result
   */
  protected createMaxIterationsResult(
    task: Task,
    iteration: number,
    startTime: number
  ): AgentTaskResult {
    this.emitEvent('agent:escalated', {
      taskId: task.id,
      reason: 'max_iterations',
      iterations: iteration,
      agentType: this.getAgentType(),
    });

    return {
      taskId: task.id,
      success: false,
      escalated: true,
      reason: 'Maximum iterations reached',
      output: 'Maximum iterations reached without completion',
      iterations: iteration,
      duration: Date.now() - startTime,
      escalationReason: `Maximum iterations (${this.config.maxIterations}) reached`,
      metrics: {
        iterations: iteration,
        tokensUsed: 0,
        timeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Get the continuation prompt for multi-turn conversations
   */
  protected getContinuationPrompt(): string {
    return 'Please continue. If you have completed the task, include [TASK_COMPLETE] in your response along with a summary of what you accomplished.';
  }

  /**
   * Get the error recovery prompt
   */
  protected getErrorRecoveryPrompt(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `An error occurred: ${message}. Please address this issue and continue with the task.`;
  }

  /**
   * Convert internal messages to LLM-compatible format
   * Includes system prompt as a system message at the beginning
   */
  private convertToLLMMessages(
    messages: Message[],
    systemPrompt?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system prompt as first message if provided
    if (systemPrompt) {
      result.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation messages
    for (const m of messages) {
      if (m.role !== 'system') {
        result.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    return result;
  }
}

