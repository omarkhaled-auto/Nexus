// MockGeminiClient - Mock implementation for testing
// Phase 03 Hotfix #4: Mock mode for LLM clients

import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  LLMClient,
  ToolCall,
  TokenUsage,
} from '../types';

/**
 * Configuration for mock responses
 */
export interface MockResponseConfig {
  /** Default text response */
  defaultResponse?: string;
  /** Response per message content pattern */
  responsePatterns?: Array<{
    pattern: RegExp;
    response: string;
    toolCalls?: ToolCall[];
  }>;
  /** Simulate errors */
  shouldFail?: boolean;
  errorMessage?: string;
  /** Delay in ms before responding */
  delay?: number;
}

/**
 * MockGeminiClient - Mock implementation of GeminiClient for testing.
 *
 * Supports:
 * - Configurable responses based on input patterns
 * - Tool call simulation
 * - Error simulation
 * - Deterministic behavior for testing
 */
export class MockGeminiClient implements LLMClient {
  private config: MockResponseConfig;
  private callHistory: Array<{ messages: Message[]; options?: ChatOptions }> = [];

  constructor(config: MockResponseConfig = {}) {
    this.config = {
      defaultResponse: 'Mock response from Gemini',
      delay: 0,
      ...config,
    };
  }

  /**
   * Get the call history for test assertions
   */
  getCallHistory(): Array<{ messages: Message[]; options?: ChatOptions }> {
    return this.callHistory;
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Update mock configuration
   */
  configure(config: Partial<MockResponseConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Send a mock chat completion request
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    this.callHistory.push({ messages, options });

    // Simulate delay
    if (this.config.delay && this.config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay));
    }

    // Simulate errors
    if (this.config.shouldFail) {
      throw new Error(this.config.errorMessage ?? 'Mock Gemini error');
    }

    // Find matching response pattern
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content ?? '';

    let responseText = this.config.defaultResponse ?? 'Mock Gemini response';
    let toolCalls: ToolCall[] | undefined;

    if (this.config.responsePatterns) {
      for (const pattern of this.config.responsePatterns) {
        if (pattern.pattern.test(userContent)) {
          responseText = pattern.response;
          toolCalls = pattern.toolCalls;
          break;
        }
      }
    }

    // If tools are provided and no explicit tool calls, simulate tool use
    if (options?.tools && options.tools.length > 0 && !toolCalls) {
      // Check if the message suggests using a tool
      const toolMentioned = options.tools.find((tool) =>
        userContent.toLowerCase().includes(tool.name.toLowerCase())
      );

      if (toolMentioned) {
        toolCalls = [
          {
            id: `mock-gemini-tool-${Date.now()}`,
            name: toolMentioned.name,
            arguments: {},
          },
        ];
      }
    }

    const usage: TokenUsage = {
      inputTokens: this.countTokens(messages.map((m) => m.content).join(' ')),
      outputTokens: this.countTokens(responseText),
      totalTokens: 0,
    };
    usage.totalTokens = usage.inputTokens + usage.outputTokens;

    return {
      content: responseText,
      toolCalls,
      usage,
      finishReason: toolCalls && toolCalls.length > 0 ? 'tool_use' : 'stop',
    };
  }

  /**
   * Stream a mock chat completion
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Get the full response first
    const response = await this.chat(messages, options);

    // Stream text in chunks
    const words = response.content.split(' ');
    for (const word of words) {
      yield {
        type: 'text',
        content: word + ' ',
      };
    }

    // Emit tool calls if any
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        yield {
          type: 'tool_use',
          toolCall,
        };
      }
    }

    yield { type: 'done' };
  }

  /**
   * Approximate token count for content
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    // Approximate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
}
