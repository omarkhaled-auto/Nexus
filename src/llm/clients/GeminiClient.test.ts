import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiClient, GeminiAPIError, GeminiTimeoutError, GeminiRateLimitError } from './GeminiClient';
import type { Message, ChatOptions } from '../types';

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn(),
        generateContentStream: vi.fn(),
      },
    })),
  };
});

describe('GeminiClient', () => {
  let client: GeminiClient;
  let mockGenAIInstance: {
    models: {
      generateContent: ReturnType<typeof vi.fn>;
      generateContentStream: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked GoogleGenAI class and create a mock instance
    const { GoogleGenAI } = await import('@google/genai');
    mockGenAIInstance = {
      models: {
        generateContent: vi.fn(),
        generateContentStream: vi.fn(),
      },
    };
    vi.mocked(GoogleGenAI).mockImplementation(() => mockGenAIInstance as unknown as InstanceType<typeof GoogleGenAI>);

    client = new GeminiClient({
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Types', () => {
    it('GeminiAPIError is error class with status', () => {
      const error = new GeminiAPIError('API failed', 500);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GeminiAPIError);
      expect(error.name).toBe('GeminiAPIError');
      expect(error.status).toBe(500);
    });

    it('GeminiRateLimitError has 429 status', () => {
      const error = new GeminiRateLimitError('Rate limited');
      expect(error).toBeInstanceOf(GeminiAPIError);
      expect(error.name).toBe('GeminiRateLimitError');
      expect(error.status).toBe(429);
    });

    it('GeminiTimeoutError is a separate error type', () => {
      const error = new GeminiTimeoutError('Request timed out');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('GeminiTimeoutError');
    });
  });

  describe('Constructor', () => {
    it('accepts apiKey', () => {
      expect(() => new GeminiClient({ apiKey: 'test-key' })).not.toThrow();
    });

    it('accepts optional model (default: gemini-3.0-pro)', () => {
      expect(() => new GeminiClient({ apiKey: 'test-key', model: 'gemini-2.5-pro' })).not.toThrow();
    });

    it('accepts optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      expect(() => new GeminiClient({ apiKey: 'test-key', logger })).not.toThrow();
    });

    it('accepts optional timeout (default: 120000ms for large context)', () => {
      expect(() => new GeminiClient({ apiKey: 'test-key', timeout: 180000 })).not.toThrow();
    });
  });

  describe('chat()', () => {
    it('returns Response with review for code review prompt', async () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a code reviewer.' },
        { role: 'user', content: 'Review this code:\n```typescript\nconst x = 1;\n```' },
      ];

      mockGenAIInstance.models.generateContent.mockResolvedValue({
        response: {
          text: () => 'The code looks good. Consider adding type annotations.',
        },
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 },
      });

      const response = await client.chat(messages);

      expect(response.content).toBe('The code looks good. Consider adding type annotations.');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(50);
      expect(response.usage.outputTokens).toBe(30);
      expect(response.usage.totalTokens).toBe(80);
    });

    it('handles large context (>100k tokens)', async () => {
      const largeContent = 'a'.repeat(400000); // ~100k tokens
      const messages: Message[] = [
        { role: 'user', content: `Review this large file:\n${largeContent}` },
      ];

      mockGenAIInstance.models.generateContent.mockResolvedValue({
        response: {
          text: () => 'Large file reviewed successfully.',
        },
        usageMetadata: { promptTokenCount: 100000, candidatesTokenCount: 10 },
      });

      const response = await client.chat(messages);

      expect(response.content).toBe('Large file reviewed successfully.');
      expect(response.usage.inputTokens).toBe(100000);
    });

    it('throws GeminiAPIError for API errors', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const apiError = new Error('API error');
      (apiError as Error & { status?: number }).status = 500;
      mockGenAIInstance.models.generateContent.mockRejectedValue(apiError);

      await expect(client.chat(messages)).rejects.toThrow(GeminiAPIError);
    });

    it('retries on rate limit errors', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const rateLimitError = new Error('Rate limited');
      (rateLimitError as Error & { status?: number }).status = 429;

      mockGenAIInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          response: {
            text: () => 'Success after retry',
          },
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        });

      const response = await client.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockGenAIInstance.models.generateContent).toHaveBeenCalledTimes(3);
    });

    it('throws GeminiTimeoutError when request times out', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      // Create client with very short timeout
      const shortTimeoutClient = new GeminiClient({
        apiKey: 'test-key',
        timeout: 1, // 1ms timeout
      });

      // Mock a slow response
      mockGenAIInstance.models.generateContent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      await expect(shortTimeoutClient.chat(messages)).rejects.toThrow(GeminiTimeoutError);
    });
  });

  describe('chatStream()', () => {
    it('yields text chunks', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const mockStreamResponse = {
        async *[Symbol.asyncIterator]() {
          yield { text: () => 'Hello' };
          yield { text: () => ' there!' };
        },
      };

      mockGenAIInstance.models.generateContentStream.mockResolvedValue(mockStreamResponse);

      const chunks: string[] = [];
      for await (const chunk of client.chatStream(messages)) {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Hello', ' there!']);
    });

    it('yields done chunk at the end', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      const mockStreamResponse = {
        async *[Symbol.asyncIterator]() {
          yield { text: () => 'Hi!' };
        },
      };

      mockGenAIInstance.models.generateContentStream.mockResolvedValue(mockStreamResponse);

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

    it('handles large content', () => {
      const content = 'a'.repeat(4000); // 4000 chars
      const count = client.countTokens(content);

      // ~4 chars per token = ~1000 tokens
      expect(count).toBeGreaterThanOrEqual(900);
      expect(count).toBeLessThanOrEqual(1100);
    });
  });

  describe('Model Fallback', () => {
    it('falls back to gemini-2.5-pro when gemini-3.0-pro unavailable', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello!' }];

      // First call fails with model not found
      const modelNotFoundError = new Error('Model not found: gemini-3.0-pro');
      (modelNotFoundError as Error & { status?: number }).status = 404;

      // Simulate the fallback by having the mock succeed on retry
      // (In reality, the client would try the fallback model)
      mockGenAIInstance.models.generateContent
        .mockRejectedValueOnce(modelNotFoundError)
        .mockResolvedValue({
          response: {
            text: () => 'Response from fallback model',
          },
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        });

      const response = await client.chat(messages);

      expect(response.content).toBe('Response from fallback model');
    });
  });
});
