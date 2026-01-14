import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  Logger,
  LLMClient,
  ToolCall,
  TokenUsage,
  ToolDefinition,
} from '../types';

/**
 * Base error class for LLM-related errors
 */
export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
 * Error from API response
 */
export class APIError extends LLMError {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends APIError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export interface ClaudeClientOptions {
  apiKey: string;
  baseUrl?: string;
  logger?: Logger;
  timeout?: number;
}

// Retry constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert our Message format to Anthropic's format
 */
function convertMessages(
  messages: Message[]
): { systemPrompt: string | undefined; messages: Anthropic.MessageParam[] } {
  let systemPrompt: string | undefined;
  const anthropicMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      // Handle tool results in user messages
      if (msg.role === 'user' && msg.toolResults && msg.toolResults.length > 0) {
        const content: Anthropic.ToolResultBlockParam[] = msg.toolResults.map((result) => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content:
            typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        }));
        anthropicMessages.push({ role: 'user', content });
      } else {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    // Note: 'tool' role messages are handled as user messages with tool_result blocks
    // via the toolResults property above
  }

  return { systemPrompt, messages: anthropicMessages };
}

/**
 * Convert our tool definitions to Anthropic's format
 */
function convertTools(tools?: ToolDefinition[]): Anthropic.Tool[] | undefined {
  if (!tools || tools.length === 0) return undefined;

  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

/**
 * Parse tool calls from Anthropic response
 */
function parseToolCalls(
  content: Anthropic.ContentBlock[]
): { text: string; toolCalls: ToolCall[] } {
  let text = '';
  const toolCalls: ToolCall[] = [];

  for (const block of content) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return { text, toolCalls };
}

/**
 * Convert Anthropic stop_reason to our FinishReason
 */
function convertFinishReason(
  stopReason: string | null
): 'stop' | 'tool_use' | 'max_tokens' | 'error' {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    default:
      return 'stop';
  }
}

/**
 * Check if error is retryable
 * Uses duck typing for error detection to work with mocks in tests
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorWithStatus = error as Error & { status?: number };

  // Retry on rate limit (429)
  if (errorWithStatus.status === 429) return true;

  // Retry on server errors (5xx)
  if (errorWithStatus.status !== undefined && errorWithStatus.status >= 500 && errorWithStatus.status < 600) {
    return true;
  }

  return false;
}

/**
 * Convert Anthropic SDK errors to our error types
 * Uses duck typing for error detection to work with mocks in tests
 */
function convertError(error: unknown): LLMError {
  if (!(error instanceof Error)) {
    return new LLMError(String(error));
  }

  const errorWithStatus = error as Error & { status?: number };
  const status = errorWithStatus.status;

  // Map status codes to our error types
  if (status === 401) {
    return new AuthenticationError(error.message);
  }
  if (status === 429) {
    return new RateLimitError(error.message);
  }
  if (status === 400) {
    return new APIError(error.message, 400);
  }
  if (status !== undefined && status >= 400) {
    return new APIError(error.message, status);
  }

  return new LLMError(error.message);
}

/**
 * Claude API client for Anthropic's Claude models
 * Supports streaming, tools, and extended thinking
 */
export class ClaudeClient implements LLMClient {
  private client: Anthropic;
  private logger?: Logger;
  private timeout: number;

  constructor(options: ClaudeClientOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      maxRetries: 0, // We handle retries ourselves
    });
    this.logger = options.logger;
    this.timeout = options.timeout ?? 60000;
  }

  /**
   * Send a chat completion request
   * Auto-switches to streaming when extended thinking is enabled
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    // Validate thinking configuration
    if (options?.thinking?.type === 'enabled') {
      if (options.temperature !== undefined && options.temperature !== 1) {
        throw new LLMError('temperature must be 1 when extended thinking is enabled');
      }
      // Extended thinking requires streaming - use chatStream internally
      return this.chatWithThinking(messages, options);
    }

    const { systemPrompt, messages: anthropicMessages } = convertMessages(messages);
    const tools = convertTools(options?.tools);

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create the request with timeout
        const requestPromise = this.client.messages.create({
          model: 'claude-sonnet-4-5-20250514', // Default model
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature,
          system: systemPrompt,
          messages: anthropicMessages,
          tools,
          stop_sequences: options?.stopSequences,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new TimeoutError('Request timed out'));
          }, this.timeout);
        });

        const response = await Promise.race([requestPromise, timeoutPromise]);

        this.logger?.debug('Claude API response received', { usage: response.usage });

        const { text, toolCalls } = parseToolCalls(response.content);

        const usage: TokenUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        };

        return {
          content: text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          usage,
          finishReason: convertFinishReason(response.stop_reason),
        };
      } catch (error) {
        lastError = error;

        // Don't retry timeout errors
        if (error instanceof TimeoutError) {
          throw error;
        }

        // Check if retryable
        if (!isRetryableError(error) || attempt === MAX_RETRIES) {
          throw convertError(error);
        }

        // Exponential backoff
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        this.logger?.warn(`Retrying request after ${String(delay)}ms (attempt ${String(attempt + 1)}/${String(MAX_RETRIES)})`);
        await sleep(delay);
      }
    }

    throw convertError(lastError);
  }

  /**
   * Internal method for handling extended thinking via streaming
   */
  private async chatWithThinking(messages: Message[], options: ChatOptions): Promise<LLMResponse> {
    let thinkingContent = '';
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    const stream = this.chatStream(messages, options);

    for await (const chunk of stream) {
      if (chunk.type === 'thinking' && chunk.content) {
        thinkingContent += chunk.content;
      } else if (chunk.type === 'text' && chunk.content) {
        textContent += chunk.content;
      } else if (chunk.type === 'tool_use' && chunk.toolCall) {
        toolCalls.push(chunk.toolCall);
      }
    }

    // Get final message for usage stats
    const usage = this.getStreamUsage();

    return {
      content: textContent,
      thinking: thinkingContent || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
    };
  }

  /**
   * Store for stream usage (set by chatStream)
   */
  private streamUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  private getStreamUsage(): TokenUsage {
    return this.streamUsage;
  }

  /**
   * Stream a chat completion
   * Required for extended thinking support
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { systemPrompt, messages: anthropicMessages } = convertMessages(messages);
    const tools = convertTools(options?.tools);

    // Build request parameters
    const requestParams: Anthropic.MessageStreamParams = {
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: options?.maxTokens ?? 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools,
      stop_sequences: options?.stopSequences,
    };

    // Add thinking configuration if enabled
    if (options?.thinking?.type === 'enabled') {
      (requestParams as Anthropic.MessageStreamParams & { thinking?: unknown }).thinking = {
        type: 'enabled',
        budget_tokens: options.thinking.budgetTokens ?? 5000,
      };
      // Temperature must be 1 for thinking
      requestParams.temperature = 1;
    } else if (options?.temperature !== undefined) {
      requestParams.temperature = options.temperature;
    }

    const stream = this.client.messages.stream(requestParams);

    // Track current tool being built
    let currentToolId: string | undefined;
    let currentToolName: string | undefined;
    let currentToolJson = '';

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            currentToolId = block.id;
            currentToolName = block.name;
            currentToolJson = '';
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;

          if (delta.type === 'thinking_delta') {
            const thinkingDelta = delta as { thinking?: string };
            yield {
              type: 'thinking',
              content: thinkingDelta.thinking,
            };
          } else if (delta.type === 'text_delta') {
            yield {
              type: 'text',
              content: delta.text,
            };
          } else if (delta.type === 'input_json_delta') {
            currentToolJson += delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          // Emit tool call if we were building one
          if (currentToolId && currentToolName) {
            let args: Record<string, unknown> = {};
            try {
              if (currentToolJson) {
                args = JSON.parse(currentToolJson) as Record<string, unknown>;
              }
            } catch {
              // Ignore JSON parse errors for partial tools
            }

            yield {
              type: 'tool_use',
              toolCall: {
                id: currentToolId,
                name: currentToolName,
                arguments: args,
              },
            };

            currentToolId = undefined;
            currentToolName = undefined;
            currentToolJson = '';
          }
        } else if (event.type === 'message_stop') {
          // Get final usage
          try {
            const finalMessage = await stream.finalMessage();
            this.streamUsage = {
              inputTokens: finalMessage.usage.input_tokens,
              outputTokens: finalMessage.usage.output_tokens,
              thinkingTokens: (finalMessage.usage as { thinking_tokens?: number }).thinking_tokens,
              totalTokens:
                finalMessage.usage.input_tokens +
                finalMessage.usage.output_tokens +
                ((finalMessage.usage as { thinking_tokens?: number }).thinking_tokens ?? 0),
            };
          } catch {
            // Ignore errors getting final message
          }

          yield { type: 'done' };
        }
      }
    } catch (error) {
      throw convertError(error);
    }
  }

  /**
   * Approximate token count for content
   * Uses ~4 characters per token approximation
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    // Approximate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
}
