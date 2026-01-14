import type { Message, ChatOptions, LLMResponse, StreamChunk, Logger, LLMClient } from '../types';

/**
 * Gemini API error
 */
export class GeminiAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiAPIError';
    this.status = status;
    Object.setPrototypeOf(this, GeminiAPIError.prototype);
  }
}

/**
 * Gemini rate limit error (429)
 */
export class GeminiRateLimitError extends GeminiAPIError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'GeminiRateLimitError';
    Object.setPrototypeOf(this, GeminiRateLimitError.prototype);
  }
}

/**
 * Gemini timeout error
 */
export class GeminiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiTimeoutError';
    Object.setPrototypeOf(this, GeminiTimeoutError.prototype);
  }
}

export interface GeminiClientOptions {
  apiKey: string;
  model?: string;
  logger?: Logger;
  timeout?: number;
}

/**
 * Gemini API client for Google's Gemini models
 * Supports large context for code review (up to 1M tokens)
 */
export class GeminiClient implements LLMClient {
  constructor(_options: GeminiClientOptions) {
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
