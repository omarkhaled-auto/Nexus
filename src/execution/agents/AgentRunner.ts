// AgentRunner - Base class for all agent runners
// Phase 03-02: Agent Execution Framework

import type {
  AgentType,
  AgentState,
  Task,
  ExecutionResult,
  ToolExecutor,
  Logger,
  TokenUsage,
} from './types';
import type { LLMClient, Message, ToolCall, LLMResponse, ChatOptions } from '@/llm';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for agent execution errors
 */
export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when agent exceeds maximum iterations
 */
export class MaxIterationsError extends AgentError {
  public readonly iterations: number;

  constructor(iterations: number) {
    super(`Agent exceeded maximum iterations: ${String(iterations)}`);
    this.name = 'MaxIterationsError';
    this.iterations = iterations;
  }
}

/**
 * Error thrown when a tool execution fails
 */
export class ToolExecutionError extends AgentError {
  public readonly toolName: string;
  public override readonly cause: Error;

  constructor(toolName: string, cause: Error) {
    super(`Tool execution failed for ${toolName}: ${cause.message}`);
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.cause = cause;
  }
}

/**
 * Error thrown when LLM call fails
 */
export class LLMCallError extends AgentError {
  public override readonly cause: Error;

  constructor(cause: Error) {
    super(`LLM call failed: ${cause.message}`);
    this.name = 'LLMCallError';
    this.cause = cause;
  }
}

// ============================================================================
// AgentRunner Options
// ============================================================================

/**
 * Options for AgentRunner constructor
 */
export interface AgentRunnerOptions {
  /** LLM client for AI interactions */
  llmClient: LLMClient;
  /** Tool executor for tool calls */
  toolExecutor: ToolExecutor;
  /** Optional logger */
  logger?: Logger;
  /** Maximum iterations before failing (default: 10) */
  maxIterations?: number;
}

// ============================================================================
// AgentRunner Base Class
// ============================================================================

/**
 * Abstract base class for all agent runners.
 * Implements the core tool loop: call LLM -> tool_use -> execute -> loop.
 */
export abstract class AgentRunner {
  /** Agent type identifier */
  public abstract readonly agentType: AgentType;
  /** System prompt for this agent */
  public abstract readonly systemPrompt: string;

  protected readonly llmClient: LLMClient;
  protected readonly toolExecutor: ToolExecutor;
  protected readonly logger?: Logger;
  protected readonly maxIterations: number;

  private state: AgentState = 'idle';
  private cancelled = false;

  constructor(options: AgentRunnerOptions) {
    this.llmClient = options.llmClient;
    this.toolExecutor = options.toolExecutor;
    this.logger = options.logger;
    this.maxIterations = options.maxIterations ?? 10;
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Cancel ongoing execution
   */
  cancel(): void {
    this.cancelled = true;
    this.logger?.info('Agent execution cancelled');
  }

  /**
   * Execute a task
   */
  async execute(task: Task): Promise<ExecutionResult> {
    this.state = 'running';
    this.cancelled = false;

    const history: Message[] = [];
    const filesChanged = new Set<string>();
    let iterations = 0;
    let totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    this.logger?.info(`Starting execution for task: ${task.name}`);

    try {
      while (iterations < this.maxIterations) {
        // Check for cancellation (can be set by cancel() from another context)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.cancelled) {
          this.state = 'completed';
          return {
            success: false,
            filesChanged: Array.from(filesChanged),
            output: '',
            error: 'Execution cancelled',
            iterations,
            tokenUsage: totalTokenUsage,
          };
        }

        iterations++;
        this.logger?.debug(`Iteration ${String(iterations)}/${String(this.maxIterations)}`);

        // Build messages for LLM
        const messages = this.buildMessages(task, history);

        // Get chat options with available tools
        const chatOptions = this.getChatOptions();

        // Call LLM
        let response: LLMResponse;
        try {
          response = await this.llmClient.chat(messages, chatOptions);
        } catch (error) {
          this.state = 'failed';
          throw new LLMCallError(error as Error);
        }

        // Accumulate token usage
        totalTokenUsage = this.accumulateTokenUsage(totalTokenUsage, response.usage);

        // Check finish reason
        if (response.finishReason === 'stop') {
          // Task completed
          this.state = 'completed';
          this.logger?.info('Task completed successfully');
          return {
            success: true,
            filesChanged: Array.from(filesChanged),
            output: response.content,
            iterations,
            tokenUsage: totalTokenUsage,
          };
        }

        if (response.finishReason === 'tool_use' && response.toolCalls?.length) {
          // Handle tool calls
          this.state = 'waiting_tool';

          // Add assistant message with tool calls
          history.push({
            role: 'assistant',
            content: response.content,
            toolCalls: response.toolCalls,
          });

          // Execute tools and collect results
          const toolResults = await this.handleToolCalls(
            response.toolCalls,
            filesChanged
          );

          // Add tool results to history
          history.push({
            role: 'tool',
            content: '',
            toolResults,
          });

          this.state = 'running';
        } else if (response.finishReason === 'max_tokens') {
          // Handle max tokens - add what we have and continue
          history.push({
            role: 'assistant',
            content: response.content,
          });
          history.push({
            role: 'user',
            content: 'Continue from where you left off.',
          });
        } else if (response.finishReason === 'error') {
          this.state = 'failed';
          return {
            success: false,
            filesChanged: Array.from(filesChanged),
            output: response.content,
            error: 'LLM returned error',
            iterations,
            tokenUsage: totalTokenUsage,
          };
        }
      }

      // Exceeded max iterations
      this.state = 'failed';
      throw new MaxIterationsError(this.maxIterations);
    } catch (error) {
      this.state = 'failed';
      throw error;
    }
  }

  /**
   * Build messages for LLM including system prompt, task, and history
   */
  protected buildMessages(task: Task, history: Message[]): Message[] {
    const messages: Message[] = [
      // System prompt
      {
        role: 'system',
        content: this.systemPrompt,
      },
      // Task as user message
      {
        role: 'user',
        content: this.formatTaskMessage(task),
      },
      // Append history
      ...history,
    ];

    return messages;
  }

  /**
   * Format task as a message for the LLM
   */
  protected formatTaskMessage(task: Task): string {
    let message = `# Task: ${task.name}\n\n${task.description}`;

    if (task.files.length > 0) {
      message += `\n\n## Target Files\n${task.files.join('\n')}`;
    }

    if (task.test) {
      message += `\n\n## Test Command\n${task.test}`;
    }

    if (task.worktree) {
      message += `\n\n## Working Directory\n${task.worktree}`;
    }

    return message;
  }

  /**
   * Get chat options with tools
   */
  protected getChatOptions(): ChatOptions {
    const tools = this.toolExecutor.getAvailableTools();
    return {
      tools: tools.length > 0 ? tools : undefined,
    };
  }

  /**
   * Handle tool calls - execute them and return results
   */
  protected async handleToolCalls(
    toolCalls: ToolCall[],
    filesChanged: Set<string>
  ): Promise<Array<{ toolCallId: string; result: string | object }>> {
    // Execute all tool calls in parallel
    const results = await Promise.all(
      toolCalls.map(async (call) => {
        this.logger?.debug(`Executing tool: ${call.name}`, call.arguments);

        try {
          const result = await this.toolExecutor.execute(call.name, call.arguments);

          // Track file changes
          this.trackFileChange(call, filesChanged);

          return {
            toolCallId: call.id,
            result: result.result,
          };
        } catch (error) {
          this.logger?.error(`Tool ${call.name} failed:`, error);

          // Return error as result so LLM can recover
          return {
            toolCallId: call.id,
            result: `Error: ${(error as Error).message}`,
          };
        }
      })
    );

    return results;
  }

  /**
   * Track file changes from tool calls
   */
  private trackFileChange(call: ToolCall, filesChanged: Set<string>): void {
    const fileChangingTools = ['write_file', 'edit_file', 'create_file', 'delete_file'];

    if (fileChangingTools.includes(call.name)) {
      const path = call.arguments.path as string | undefined;
      if (path) {
        filesChanged.add(path);
      }
    }
  }

  /**
   * Accumulate token usage across iterations
   */
  private accumulateTokenUsage(
    total: TokenUsage,
    current: TokenUsage
  ): TokenUsage {
    return {
      inputTokens: total.inputTokens + current.inputTokens,
      outputTokens: total.outputTokens + current.outputTokens,
      thinkingTokens:
        (total.thinkingTokens ?? 0) + (current.thinkingTokens ?? 0) || undefined,
      totalTokens: total.totalTokens + current.totalTokens,
    };
  }

  /**
   * Check if execution should continue after a response
   */
  protected shouldContinue(response: LLMResponse, iteration: number): boolean {
    if (this.cancelled) return false;
    if (iteration >= this.maxIterations) return false;
    if (response.finishReason === 'stop') return false;
    if (response.finishReason === 'error') return false;
    return true;
  }
}
