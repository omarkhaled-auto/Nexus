/**
 * Claude API Client
 * Direct integration with Anthropic's Claude API
 * Phase 03-01: LLM Provider with Extended Thinking
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  TokenUsage,
  LLMClient,
  Logger,
  FinishReason,
  ToolDefinition,
} from '../types';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for LLM operations
 */
export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
 * Error for API-related failures
 */
export class APIError extends LLMError {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Error for rate limit exceeded
 */
export class RateLimitError extends APIError {
  retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error for request timeout
 */
export class TimeoutError extends LLMError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration options for Claude client
 */
export interface ClaudeClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger;
}

// Default configuration values
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// ============================================================================
// Claude Client Implementation
// ============================================================================

/**
 * Claude API client with extended thinking and streaming support
 */
export class ClaudeClient implements LLMClient {
  private client: Anthropic;
  private logger?: Logger;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: ClaudeClientOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    });
    this.logger = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Send a chat completion request to Claude
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const systemPrompt = this.extractSystemPrompt(messages);
    const conversationMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : undefined;

    try {
      this.logger?.debug('Sending chat request to Claude', {
        messageCount: messages.length,
        hasTools: !!tools,
        thinking: options?.thinking?.enabled,
      });

      const response = await this.client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
        stop_sequences: options?.stopSequences,
        // Extended thinking configuration
        ...(options?.thinking?.enabled && {
          thinking: {
            type: 'enabled' as const,
            budget_tokens: options.thinking.budgetTokens,
          },
        }),
      });

      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Stream a chat completion from Claude
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = this.extractSystemPrompt(messages);
    const conversationMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : undefined;

    try {
      this.logger?.debug('Starting streaming chat with Claude');

      const stream = this.client.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
        stop_sequences: options?.stopSequences,
        ...(options?.thinking?.enabled && {
          thinking: {
            type: 'enabled' as const,
            budget_tokens: options.thinking.budgetTokens,
          },
        }),
      });

      for await (const event of stream) {
        const chunk = this.parseStreamEvent(event);
        if (chunk) {
          yield chunk;
        }
      }

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: String(error) };
      throw this.handleError(error);
    }
  }

  /**
   * Count tokens in content using Claude's tokenizer
   * Approximation: ~4 characters per token
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    // Claude uses a similar tokenizer to GPT models
    // Rough approximation: 1 token ~ 4 characters
    return Math.ceil(content.length / 4);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Extract system prompt from messages
   */
  private extractSystemPrompt(messages: Message[]): string | undefined {
    const systemMsg = messages.find((msg) => msg.role === 'system');
    return systemMsg?.content;
  }

  /**
   * Convert internal message format to Anthropic format
   */
  private convertMessages(
    messages: Message[]
  ): Anthropic.MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => {
        if (msg.role === 'tool' && msg.toolResults) {
          return {
            role: 'user' as const,
            content: msg.toolResults.map((result) => ({
              type: 'tool_result' as const,
              tool_use_id: result.toolCallId,
              content: typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result),
              is_error: result.isError,
            })),
          };
        }

        if (msg.role === 'assistant' && msg.toolCalls) {
          return {
            role: 'assistant' as const,
            content: [
              ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
              ...msg.toolCalls.map((tc) => ({
                type: 'tool_use' as const,
                id: tc.id,
                name: tc.name,
                input: tc.arguments,
              })),
            ],
          };
        }

        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      });
  }

  /**
   * Convert tool definitions to Anthropic format
   */
  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Parse Anthropic response to internal format
   */
  private parseResponse(response: Anthropic.Message): LLMResponse {
    let content = '';
    let thinking = '';
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'thinking') {
        thinking += block.thinking;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    // Map stop reason to finish reason
    let finishReason: FinishReason = 'stop';
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_use';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'max_tokens';
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason,
      thinking: thinking || undefined,
    };
  }

  /**
   * Parse stream event to chunk
   */
  private parseStreamEvent(event: Anthropic.MessageStreamEvent): StreamChunk | null {
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          return { type: 'text', content: event.delta.text };
        }
        if (event.delta.type === 'thinking_delta') {
          return { type: 'thinking', content: event.delta.thinking };
        }
        break;
      case 'content_block_start':
        if (event.content_block.type === 'tool_use') {
          return {
            type: 'tool_use',
            toolCall: {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: {},
            },
          };
        }
        break;
    }
    return null;
  }

  /**
   * Handle and convert API errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return new AuthenticationError(error.message);
      }
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        return new RateLimitError(
          error.message,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }
      return new APIError(error.message, error.status);
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new TimeoutError(error.message);
      }
      return new LLMError(error.message);
    }

    return new LLMError(String(error));
  }
}
