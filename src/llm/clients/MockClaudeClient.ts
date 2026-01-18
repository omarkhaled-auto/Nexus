/**
 * Mock Claude Client for Testing
 * Provides configurable mock responses without hitting real API
 * Phase 03-01: LLM Provider with Extended Thinking
 */

import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  TokenUsage,
  LLMClient,
  FinishReason,
  ToolCall,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for mock responses
 */
export interface MockResponseConfig {
  /** Default response content */
  defaultResponse?: string;
  /** Response delay in ms */
  delay?: number;
  /** Whether to simulate streaming */
  simulateStreaming?: boolean;
  /** Queue of responses to return in order */
  responseQueue?: MockResponse[];
  /** Whether to throw errors */
  shouldError?: boolean;
  /** Error message to throw */
  errorMessage?: string;
}

/**
 * A single mock response
 */
export interface MockResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: FinishReason;
  thinking?: string;
  usage?: Partial<TokenUsage>;
}

// Default mock configuration
const DEFAULT_RESPONSE = 'This is a mock response from Claude.';
const DEFAULT_DELAY = 50;

// ============================================================================
// Mock Claude Client Implementation
// ============================================================================

/**
 * Mock Claude client for testing LLM interactions
 * Implements LLMClient interface for compatibility
 */
export class MockClaudeClient implements LLMClient {
  private config: MockResponseConfig;
  private responseQueue: MockResponse[];
  private callHistory: Array<{ messages: Message[]; options?: ChatOptions }>;

  constructor(config: MockResponseConfig = {}) {
    this.config = {
      defaultResponse: config.defaultResponse ?? DEFAULT_RESPONSE,
      delay: config.delay ?? DEFAULT_DELAY,
      simulateStreaming: config.simulateStreaming ?? true,
      responseQueue: config.responseQueue ?? [],
      shouldError: config.shouldError ?? false,
      errorMessage: config.errorMessage ?? 'Mock error',
    };
    this.responseQueue = [...(config.responseQueue ?? [])];
    this.callHistory = [];
  }

  /**
   * Send a mock chat completion request
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    // Record the call
    this.callHistory.push({ messages, options });

    // Simulate delay
    if (this.config.delay && this.config.delay > 0) {
      await this.sleep(this.config.delay);
    }

    // Check if should error
    if (this.config.shouldError) {
      throw new Error(this.config.errorMessage);
    }

    // Get response from queue or use default
    const mockResponse = this.responseQueue.shift();

    if (mockResponse) {
      return this.buildResponse(mockResponse);
    }

    return this.buildResponse({
      content: this.config.defaultResponse ?? DEFAULT_RESPONSE,
    });
  }

  /**
   * Stream a mock chat completion
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Record the call
    this.callHistory.push({ messages, options });

    // Check if should error
    if (this.config.shouldError) {
      yield { type: 'error', error: this.config.errorMessage };
      return;
    }

    // Get response from queue or use default
    const mockResponse = this.responseQueue.shift();
    const content = mockResponse?.content ?? this.config.defaultResponse ?? DEFAULT_RESPONSE;

    if (this.config.simulateStreaming) {
      // Simulate streaming by yielding content in chunks
      const words = content.split(' ');
      for (const word of words) {
        await this.sleep(10);
        yield { type: 'text', content: word + ' ' };
      }
    } else {
      yield { type: 'text', content };
    }

    // Yield tool calls if present
    if (mockResponse?.toolCalls) {
      for (const toolCall of mockResponse.toolCalls) {
        yield { type: 'tool_use', toolCall };
      }
    }

    yield { type: 'done' };
  }

  /**
   * Count tokens in content (approximate)
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }

  // ============================================================================
  // Test Helper Methods
  // ============================================================================

  /**
   * Get call history for verification
   */
  getCallHistory(): Array<{ messages: Message[]; options?: ChatOptions }> {
    return [...this.callHistory];
  }

  /**
   * Get number of calls made
   */
  getCallCount(): number {
    return this.callHistory.length;
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Queue a response to be returned on next call
   */
  queueResponse(response: MockResponse): void {
    this.responseQueue.push(response);
  }

  /**
   * Queue multiple responses
   */
  queueResponses(responses: MockResponse[]): void {
    this.responseQueue.push(...responses);
  }

  /**
   * Clear response queue
   */
  clearResponseQueue(): void {
    this.responseQueue = [];
  }

  /**
   * Set default response
   */
  setDefaultResponse(content: string): void {
    this.config.defaultResponse = content;
  }

  /**
   * Configure error simulation
   */
  setError(shouldError: boolean, message?: string): void {
    this.config.shouldError = shouldError;
    if (message) {
      this.config.errorMessage = message;
    }
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.callHistory = [];
    this.responseQueue = [];
    this.config.shouldError = false;
    this.config.defaultResponse = DEFAULT_RESPONSE;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build a complete LLMResponse from mock data
   */
  private buildResponse(mock: MockResponse): LLMResponse {
    const content = mock.content;
    const contentTokens = this.countTokens(content);

    const usage: TokenUsage = {
      inputTokens: mock.usage?.inputTokens ?? 100,
      outputTokens: mock.usage?.outputTokens ?? contentTokens,
      totalTokens: mock.usage?.totalTokens ?? (100 + contentTokens),
    };

    return {
      content,
      toolCalls: mock.toolCalls,
      usage,
      finishReason: mock.finishReason ?? (mock.toolCalls ? 'tool_use' : 'stop'),
      thinking: mock.thinking,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
