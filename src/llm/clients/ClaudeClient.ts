import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  Logger,
  LLMClient,
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

/**
 * Claude API client for Anthropic's Claude models
 * Supports streaming, tools, and extended thinking
 */
export class ClaudeClient implements LLMClient {
  constructor(_options: ClaudeClientOptions) {
    // Stub - not implemented
  }

  async chat(_messages: Message[], _options?: ChatOptions): Promise<LLMResponse> {
    throw new Error('Not implemented');
  }

  async *chatStream(
    _messages: Message[],
    _options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    throw new Error('Not implemented');
  }

  countTokens(_content: string): number {
    throw new Error('Not implemented');
  }
}
