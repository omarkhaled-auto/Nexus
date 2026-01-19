/**
 * Gemini API Client
 * Integration with Google's Gemini API for the Reviewer agent
 * Phase 03-01: LLM Provider with Extended Thinking
 *
 * Note: Uses the @google/genai package (v1.35+)
 */

 
 
 
 
 

import { GoogleGenAI, type Content } from '@google/genai';
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
import { DEFAULT_GEMINI_MODEL } from '../models';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for Gemini API operations
 */
export class GeminiAPIError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GeminiAPIError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GeminiAPIError.prototype);
  }
}

/**
 * Error for rate limit exceeded
 */
export class GeminiRateLimitError extends GeminiAPIError {
  retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.name = 'GeminiRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, GeminiRateLimitError.prototype);
  }
}

/**
 * Error for request timeout
 */
export class GeminiTimeoutError extends GeminiAPIError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'GeminiTimeoutError';
    Object.setPrototypeOf(this, GeminiTimeoutError.prototype);
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration options for Gemini client
 */
export interface GeminiClientOptions {
  apiKey: string;
  model?: string;
  timeout?: number;
  logger?: Logger;
}

// Default configuration values
// Note: DEFAULT_GEMINI_MODEL is imported from '../models'
const DEFAULT_TIMEOUT = 120000; // 2 minutes

// ============================================================================
// Gemini Client Implementation
// ============================================================================

/**
 * Gemini API client for the Reviewer agent
 * Implements LLMClient interface for compatibility
 */
export class GeminiClient implements LLMClient {
  private client: GoogleGenAI;
  private modelName: string;
  private logger?: Logger;
  private readonly timeout: number;

  constructor(options: GeminiClientOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.modelName = options.model ?? DEFAULT_GEMINI_MODEL;
    this.logger = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Send a chat completion request to Gemini
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const contents = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    try {
      this.logger?.debug('Sending chat request to Gemini', {
        messageCount: messages.length,
        model: this.modelName,
      });

      // Use the models.generateContent API
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens,
          temperature: options?.temperature,
          stopSequences: options?.stopSequences,
          tools: options?.tools ? this.convertTools(options.tools) : undefined,
        },
      });

      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Stream a chat completion from Gemini
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const contents = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    try {
      this.logger?.debug('Starting streaming chat with Gemini');

      const response = await this.client.models.generateContentStream({
        model: this.modelName,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens,
          temperature: options?.temperature,
          stopSequences: options?.stopSequences,
          tools: options?.tools ? this.convertTools(options.tools) : undefined,
        },
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          yield { type: 'text', content: text };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: String(error) };
      throw this.handleError(error);
    }
  }

  /**
   * Count tokens in content
   * Approximation: ~4 characters per token
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
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
   * Convert internal message format to Gemini format
   */
  private convertMessages(messages: Message[]): Content[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Convert tool definitions to Gemini format
   */
  private convertTools(tools: ToolDefinition[]): Array<{ functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> }> {
    return [{
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema as unknown as Record<string, unknown>,
      })),
    }];
  }

  /**
   * Parse Gemini response to internal format
   */
  private parseResponse(response: {
    text?: string;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  }): LLMResponse {
    const content = response.text ?? '';

    // Extract usage metadata if available
    const usage: TokenUsage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: (response.usageMetadata?.promptTokenCount ?? 0) +
                   (response.usageMetadata?.candidatesTokenCount ?? 0),
    };

    const finishReason: FinishReason = 'stop';

    return {
      content,
      usage,
      finishReason,
    };
  }

  /**
   * Handle and convert API errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('quota') || message.includes('rate')) {
        return new GeminiRateLimitError(error.message);
      }

      if (message.includes('timeout') || message.includes('timed out')) {
        return new GeminiTimeoutError(error.message);
      }

      return new GeminiAPIError(error.message);
    }

    return new GeminiAPIError(String(error));
  }
}
