import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClaudeClient,
  LLMError,
  APIError,
  RateLimitError,
  AuthenticationError,
  TimeoutError,
} from './ClaudeClient';
import type { Message, ChatOptions } from '../types';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
        stream: vi.fn(),
      },
    })),
    RateLimitError: class RateLimitError extends Error {
      status = 429;
    },
    AuthenticationError: class AuthenticationError extends Error {
      status = 401;
    },
    BadRequestError: class BadRequestError extends Error {
      status = 400;
    },
    APIError: class APIError extends Error {
      status = 500;
    },
  };
});

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  let mockAnthropicInstance: {
    messages: {
      create: ReturnType<typeof vi.fn>;
      stream: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked Anthropic class and create a mock instance
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    mockAnthropicInstance = {
      messages: {
        create: vi.fn(),
        stream: vi.fn(),
      },
    };
    vi.mocked(Anthropic).mockImplementation(() => mockAnthropicInstance as unknown as InstanceType<typeof Anthropic>);

    client = new ClaudeClient({
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Types', () => {
    it('LLMError is base error class', () => {
      const error = new LLMError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LLMError);
      expect(error.name).toBe('LLMError');
      expect(error.message).toBe('Test error');
    });

    it('APIError extends LLMError with status', () => {
      const error = new APIError('API failed', 500);
      expect(error).toBeInstanceOf(LLMError);
      expect(error).toBeInstanceOf(APIError);
      expect(error.name).toBe('APIError');
      expect(error.status).toBe(500);
    });

    it('RateLimitError extends APIError with 429 status', () => {
      const error = new RateLimitError('Rate limited');
      expect(error).toBeInstanceOf(APIError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.status).toBe(429);
    });

    it('AuthenticationError extends APIError with 401 status', () => {
      const error = new AuthenticationError('Invalid key');
      expect(error).toBeInstanceOf(APIError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.status).toBe(401);
    });

    it('TimeoutError extends LLMError', () => {
      const error = new TimeoutError('Request timed out');
      expect(error).toBeInstanceOf(LLMError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.name).toBe('TimeoutError');
    });
  });

  describe('Constructor', () => {
    it('accepts apiKey', () => {
      expect(() => new ClaudeClient({ apiKey: 'test-key' })).not.toThrow();
    });

    it('accepts optional baseUrl', () => {
      expect(
        () => new ClaudeClient({ apiKey: 'test-key', baseUrl: 'http://localhost:3000' })
      ).not.toThrow();
    });

    it('accepts optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      expect(() => new ClaudeClient({ apiKey: 'test-key', logger })).not.toThrow();
    });

    it('accepts optional timeout (default 60000ms)', () => {
      expect(() => new ClaudeClient({ apiKey: 'test-key', timeout: 30000 })).not.toThrow();
    });
  });

  describe('chat()', () => {
    it('returns Response with content for simple message', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const response = await client.chat(messages);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(30);
    });

    it('returns Response with toolCalls when tools are provided', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Read the file test.txt' }];
      const options: ChatOptions = {
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'read_file',
            input: { path: 'test.txt' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 15, output_tokens: 25 },
      });

      const response = await client.chat(messages, options);

      expect(response.finishReason).toBe('tool_use');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].id).toBe('tool_123');
      expect(response.toolCalls![0].name).toBe('read_file');
      expect(response.toolCalls![0].arguments).toEqual({ path: 'test.txt' });
    });

    it('throws AuthenticationError for invalid API key', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const AnthropicAuthError = (await import('@anthropic-ai/sdk')).AuthenticationError;
      mockAnthropicInstance.messages.create.mockRejectedValue(
        new AnthropicAuthError('Invalid API key')
      );

      await expect(client.chat(messages)).rejects.toThrow(AuthenticationError);
    });

    it('throws RateLimitError and retries on 429', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const AnthropicRateLimitError = (await import('@anthropic-ai/sdk')).RateLimitError;
      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(new AnthropicRateLimitError('Rate limited'))
        .mockRejectedValueOnce(new AnthropicRateLimitError('Rate limited'))
        .mockResolvedValue({
          content: [{ type: 'text', text: 'Success after retry' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        });

      const response = await client.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
    });

    it('retries on server errors (5xx) up to 3 times', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const AnthropicAPIError = (await import('@anthropic-ai/sdk')).APIError;
      const serverError = new AnthropicAPIError('Server error');
      serverError.status = 500;

      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({
          content: [{ type: 'text', text: 'Success after retry' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        });

      const response = await client.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
    });

    it('does not retry on client errors (4xx except 429)', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const AnthropicBadRequestError = (await import('@anthropic-ai/sdk')).BadRequestError;
      mockAnthropicInstance.messages.create.mockRejectedValue(
        new AnthropicBadRequestError('Bad request')
      );

      await expect(client.chat(messages)).rejects.toThrow(APIError);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(1);
    });

    it('throws TimeoutError when request times out', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      // Create client with very short timeout
      const shortTimeoutClient = new ClaudeClient({
        apiKey: 'test-key',
        timeout: 1, // 1ms timeout
      });

      // Mock a slow response
      mockAnthropicInstance.messages.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      await expect(shortTimeoutClient.chat(messages)).rejects.toThrow(TimeoutError);
    });

    it('auto-switches to streaming when thinking is enabled', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Think about this' }];
      const options: ChatOptions = {
        thinking: { type: 'enabled', budgetTokens: 5000 },
      };

      // Mock stream for extended thinking
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
            content_block: { type: 'thinking', thinking: '' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'thinking_delta', thinking: 'Let me think...' },
          };
          yield {
            type: 'content_block_start',
            content_block: { type: 'text', text: '' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Here is my answer.' },
          };
          yield {
            type: 'message_stop',
          };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 100, output_tokens: 50, thinking_tokens: 200 },
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const response = await client.chat(messages, options);

      expect(mockAnthropicInstance.messages.stream).toHaveBeenCalled();
      expect(response.thinking).toBe('Let me think...');
      expect(response.content).toBe('Here is my answer.');
      expect(response.usage.thinkingTokens).toBe(200);
    });

    it('throws error when thinking enabled but temperature is not 1', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Think about this' }];
      const options: ChatOptions = {
        thinking: { type: 'enabled', budgetTokens: 5000 },
        temperature: 0.5, // Invalid - must be 1 for thinking
      };

      await expect(client.chat(messages, options)).rejects.toThrow(
        /temperature.*1.*required.*thinking/i
      );
    });
  });

  describe('chatStream()', () => {
    it('yields text chunks in order', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' there!' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of client.chatStream(messages)) {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Hello', ' there!']);
    });

    it('yields tool_use chunk when tool is called', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Read test.txt' }];
      const options: ChatOptions = {
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
            content_block: {
              type: 'tool_use',
              id: 'tool_456',
              name: 'read_file',
              input: {},
            },
          };
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'input_json_delta', partial_json: '{"path":"test.txt"}' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const toolCalls: unknown[] = [];
      for await (const chunk of client.chatStream(messages, options)) {
        if (chunk.type === 'tool_use') {
          toolCalls.push(chunk.toolCall);
        }
      }

      expect(toolCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('yields thinking chunk before text when thinking enabled', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Think and respond' }];
      const options: ChatOptions = {
        thinking: { type: 'enabled', budgetTokens: 5000 },
      };

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
            content_block: { type: 'thinking', thinking: '' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'thinking_delta', thinking: 'Processing...' },
          };
          yield {
            type: 'content_block_start',
            content_block: { type: 'text', text: '' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Done!' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 5, thinking_tokens: 50 },
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const chunkTypes: string[] = [];
      for await (const chunk of client.chatStream(messages, options)) {
        chunkTypes.push(chunk.type);
      }

      // Thinking should come before text
      const thinkingIndex = chunkTypes.indexOf('thinking');
      const textIndex = chunkTypes.indexOf('text');
      expect(thinkingIndex).toBeLessThan(textIndex);
    });

    it('yields done chunk at the end', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hi!' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of client.chatStream(messages)) {
        chunks.push(chunk.type);
      }

      expect(chunks[chunks.length - 1]).toBe('done');
    });
  });

  describe('countTokens()', () => {
    it('returns approximate count (~4 chars per token)', () => {
      const content = 'Hello, world!'; // 13 chars
      const count = client.countTokens(content);

      // ~4 chars per token = ~3 tokens
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    });

    it('handles empty string', () => {
      expect(client.countTokens('')).toBe(0);
    });

    it('handles long content', () => {
      const content = 'a'.repeat(4000); // 4000 chars
      const count = client.countTokens(content);

      // ~4 chars per token = ~1000 tokens
      expect(count).toBeGreaterThanOrEqual(900);
      expect(count).toBeLessThanOrEqual(1100);
    });
  });
});
