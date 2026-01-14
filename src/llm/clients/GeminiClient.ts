import { GoogleGenAI } from '@google/genai';
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  Logger,
  LLMClient,
  TokenUsage,
} from '../types';

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

// Default and fallback models
const DEFAULT_MODEL = 'gemini-3.0-pro';
const FALLBACK_MODEL = 'gemini-2.5-pro';

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
 * Convert messages to Gemini format
 * Gemini uses a different conversation structure
 */
function convertMessages(messages: Message[]): {
  systemInstruction: string | undefined;
  contents: string;
} {
  let systemInstruction: string | undefined;
  const contentParts: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      contentParts.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
    }
  }

  return {
    systemInstruction,
    contents: contentParts.join('\n\n'),
  };
}

/**
 * Check if error is retryable
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
 * Check if error indicates model not found (for fallback)
 */
function isModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorWithStatus = error as Error & { status?: number };

  // 404 or model not found in message
  return (
    errorWithStatus.status === 404 ||
    error.message.toLowerCase().includes('model not found') ||
    error.message.toLowerCase().includes('not available')
  );
}

/**
 * Convert errors to our error types
 */
function convertError(error: unknown): GeminiAPIError | GeminiTimeoutError {
  if (!(error instanceof Error)) {
    return new GeminiAPIError(String(error), 500);
  }

  const errorWithStatus = error as Error & { status?: number };
  const status = errorWithStatus.status ?? 500;

  if (status === 429) {
    return new GeminiRateLimitError(error.message);
  }

  return new GeminiAPIError(error.message, status);
}

/**
 * Gemini API client for Google's Gemini models
 * Supports large context for code review (up to 1M tokens)
 */
export class GeminiClient implements LLMClient {
  private client: GoogleGenAI;
  private model: string;
  private logger?: Logger;
  private timeout: number;

  constructor(options: GeminiClientOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
    this.logger = options.logger;
    this.timeout = options.timeout ?? 120000; // 2 minutes default for large context
  }

  /**
   * Send a chat completion request
   * Supports model fallback if primary model unavailable
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const { systemInstruction, contents } = convertMessages(messages);

    let currentModel = this.model;
    let lastError: unknown;

    // Outer loop for model fallback
    for (const modelToTry of [currentModel, FALLBACK_MODEL]) {
      currentModel = modelToTry;

      // Inner loop for retries
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const requestPromise = this.client.models.generateContent({
            model: currentModel,
            contents: systemInstruction ? `${systemInstruction}\n\n${contents}` : contents,
            config: {
              maxOutputTokens: options?.maxTokens ?? 8000,
              temperature: options?.temperature ?? 0.2,
              stopSequences: options?.stopSequences,
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new GeminiTimeoutError('Request timed out'));
            }, this.timeout);
          });

          const result = await Promise.race([requestPromise, timeoutPromise]);

          // Access the text directly from response (SDK provides it as a property)
          const responseText = result.text ?? '';

          this.logger?.debug('Gemini API response received', {
            model: currentModel,
            usage: result.usageMetadata,
          });

          const usage: TokenUsage = {
            inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: result.usageMetadata?.totalTokenCount ??
              ((result.usageMetadata?.promptTokenCount ?? 0) +
              (result.usageMetadata?.candidatesTokenCount ?? 0)),
          };

          return {
            content: responseText,
            usage,
            finishReason: 'stop',
          };
        } catch (error) {
          lastError = error;

          // Don't retry timeout errors
          if (error instanceof GeminiTimeoutError) {
            throw error;
          }

          // If model not found and we have a fallback, break to try fallback
          if (isModelNotFoundError(error) && modelToTry === this.model && FALLBACK_MODEL !== this.model) {
            this.logger?.warn(`Model ${currentModel} not found, falling back to ${FALLBACK_MODEL}`);
            break;
          }

          // Check if retryable
          if (!isRetryableError(error) || attempt === MAX_RETRIES) {
            // If this is the primary model and it failed for reasons other than retryable,
            // try the fallback
            if (modelToTry === this.model && FALLBACK_MODEL !== this.model) {
              break;
            }
            throw convertError(error);
          }

          // Exponential backoff
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          this.logger?.warn(`Retrying request after ${String(delay)}ms (attempt ${String(attempt + 1)}/${String(MAX_RETRIES)})`);
          await sleep(delay);
        }
      }
    }

    throw convertError(lastError);
  }

  /**
   * Stream a chat completion
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { systemInstruction, contents } = convertMessages(messages);

    try {
      const stream = await this.client.models.generateContentStream({
        model: this.model,
        contents: systemInstruction ? `${systemInstruction}\n\n${contents}` : contents,
        config: {
          maxOutputTokens: options?.maxTokens ?? 8000,
          temperature: options?.temperature ?? 0.2,
          stopSequences: options?.stopSequences,
        },
      });

      for await (const chunk of stream) {
        // Access text directly as property (SDK provides it as a getter)
        const text = chunk.text;
        if (text) {
          yield {
            type: 'text',
            content: text,
          };
        }
      }

      yield { type: 'done' };
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
