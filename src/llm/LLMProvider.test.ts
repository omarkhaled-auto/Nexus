import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMProvider } from './LLMProvider';
import type { Message, AgentType, UsageStats, ChatOptions, LLMResponse, StreamChunk } from './types';

// Mock the clients
vi.mock('./clients/ClaudeClient', () => ({
  ClaudeClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    chatStream: vi.fn(),
    countTokens: vi.fn(),
  })),
}));

vi.mock('./clients/GeminiClient', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    chatStream: vi.fn(),
    countTokens: vi.fn(),
  })),
}));

describe('LLMProvider', () => {
  let provider: LLMProvider;
  let mockClaudeChat: ReturnType<typeof vi.fn>;
  let mockClaudeChatStream: ReturnType<typeof vi.fn>;
  let mockClaudeCountTokens: ReturnType<typeof vi.fn>;
  let mockGeminiChat: ReturnType<typeof vi.fn>;
  let mockGeminiChatStream: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked clients
    const { ClaudeClient } = await import('./clients/ClaudeClient');
    const { GeminiClient } = await import('./clients/GeminiClient');

    mockClaudeChat = vi.fn();
    mockClaudeChatStream = vi.fn();
    mockClaudeCountTokens = vi.fn().mockReturnValue(10);

    mockGeminiChat = vi.fn();
    mockGeminiChatStream = vi.fn();

    vi.mocked(ClaudeClient).mockImplementation(() => ({
      chat: mockClaudeChat,
      chatStream: mockClaudeChatStream,
      countTokens: mockClaudeCountTokens,
    }));

    vi.mocked(GeminiClient).mockImplementation(() => ({
      chat: mockGeminiChat,
      chatStream: mockGeminiChatStream,
      countTokens: vi.fn().mockReturnValue(10),
    }));

    provider = new LLMProvider({
      anthropicApiKey: 'test-anthropic-key',
      googleApiKey: 'test-google-key',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('accepts Anthropic and Google API keys', () => {
      expect(() =>
        new LLMProvider({
          anthropicApiKey: 'test-anthropic',
          googleApiKey: 'test-google',
        })
      ).not.toThrow();
    });

    it('accepts optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      expect(() =>
        new LLMProvider({
          anthropicApiKey: 'test-anthropic',
          googleApiKey: 'test-google',
          logger,
        })
      ).not.toThrow();
    });
  });

  describe('chat()', () => {
    const mockResponse: LLMResponse = {
      content: 'Test response',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    };

    it('routes planner agent to Claude with extended thinking', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Plan this project' }];

      mockClaudeChat.mockResolvedValue({
        ...mockResponse,
        thinking: 'Thinking about the plan...',
        usage: { inputTokens: 100, outputTokens: 50, thinkingTokens: 200, totalTokens: 350 },
      });

      const result = await provider.chat('planner', messages);

      expect(mockClaudeChat).toHaveBeenCalled();
      expect(mockGeminiChat).not.toHaveBeenCalled();
      expect(result.content).toBe('Test response');
      expect(result.thinking).toBe('Thinking about the plan...');
    });

    it('routes coder agent to Claude with extended thinking', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Write this code' }];

      mockClaudeChat.mockResolvedValue({
        ...mockResponse,
        thinking: 'Analyzing the requirements...',
      });

      await provider.chat('coder', messages);

      expect(mockClaudeChat).toHaveBeenCalled();
      expect(mockGeminiChat).not.toHaveBeenCalled();
    });

    it('routes reviewer agent to Gemini', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Review this code' }];

      mockGeminiChat.mockResolvedValue(mockResponse);

      await provider.chat('reviewer', messages);

      expect(mockGeminiChat).toHaveBeenCalled();
      expect(mockClaudeChat).not.toHaveBeenCalled();
    });

    it('routes tester agent to Claude Sonnet', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test this' }];

      mockClaudeChat.mockResolvedValue(mockResponse);

      await provider.chat('tester', messages);

      expect(mockClaudeChat).toHaveBeenCalled();
      expect(mockGeminiChat).not.toHaveBeenCalled();
    });

    it('routes merger agent to Claude Sonnet', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Merge this' }];

      mockClaudeChat.mockResolvedValue(mockResponse);

      await provider.chat('merger', messages);

      expect(mockClaudeChat).toHaveBeenCalled();
      expect(mockGeminiChat).not.toHaveBeenCalled();
    });

    it('passes tools to the appropriate client', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Use tools' }];
      const options: ChatOptions = {
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

      mockClaudeChat.mockResolvedValue({
        ...mockResponse,
        toolCalls: [{ id: '1', name: 'read_file', arguments: {} }],
        finishReason: 'tool_use',
      });

      const result = await provider.chat('coder', messages, options);

      expect(mockClaudeChat).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({ tools: options.tools })
      );
      expect(result.toolCalls).toHaveLength(1);
    });
  });

  describe('chatStream()', () => {
    it('streams from the appropriate provider', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Stream this' }];

      const mockStreamGen = async function* (): AsyncGenerator<StreamChunk, void, unknown> {
        yield { type: 'text', content: 'Hello' };
        yield { type: 'text', content: ' World' };
        yield { type: 'done' };
      };

      mockClaudeChatStream.mockImplementation(() => mockStreamGen());

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.chatStream('coder', messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[1].content).toBe(' World');
      expect(chunks[2].type).toBe('done');
    });
  });

  describe('Usage Tracking', () => {
    it('tracks usage per agent type', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];

      mockClaudeChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      await provider.chat('coder', messages);

      const stats = provider.getUsageStats();

      expect(stats.byAgent.coder.tokens).toBe(150);
      expect(stats.byAgent.coder.calls).toBe(1);
      expect(stats.total.tokens).toBe(150);
      expect(stats.total.calls).toBe(1);
    });

    it('accumulates usage across multiple calls', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];

      mockClaudeChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      mockGeminiChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
        finishReason: 'stop',
      });

      await provider.chat('coder', messages);
      await provider.chat('reviewer', messages);

      const stats = provider.getUsageStats();

      expect(stats.byAgent.coder.tokens).toBe(150);
      expect(stats.byAgent.coder.calls).toBe(1);
      expect(stats.byAgent.reviewer.tokens).toBe(300);
      expect(stats.byAgent.reviewer.calls).toBe(1);
      expect(stats.total.tokens).toBe(450);
      expect(stats.total.calls).toBe(2);
    });

    it('calculates cost based on model pricing', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];

      // Claude Opus costs: $15/M input, $75/M output
      mockClaudeChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 1000000, outputTokens: 500000, totalTokens: 1500000 },
        finishReason: 'stop',
      });

      await provider.chat('planner', messages);

      const stats = provider.getUsageStats();

      // Expected cost: (1M * $15/M) + (0.5M * $75/M) = $15 + $37.5 = $52.5
      expect(stats.byAgent.planner.cost).toBeGreaterThan(0);
      expect(stats.total.cost).toBeGreaterThan(0);
    });

    it('resets usage stats', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];

      mockClaudeChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      await provider.chat('coder', messages);

      expect(provider.getUsageStats().total.calls).toBe(1);

      provider.resetUsageStats();

      const stats = provider.getUsageStats();
      expect(stats.total.tokens).toBe(0);
      expect(stats.total.calls).toBe(0);
      expect(stats.total.cost).toBe(0);
    });
  });

  describe('Model Configuration', () => {
    it('uses default model configs per agent type', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];

      mockClaudeChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      await provider.chat('planner', messages);

      // Verify that planner uses extended thinking
      expect(mockClaudeChat).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({
          thinking: expect.objectContaining({ type: 'enabled' }),
        })
      );
    });

    it('allows overriding default options', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test' }];
      const options: ChatOptions = {
        maxTokens: 2000,
        temperature: 0.5,
      };

      mockGeminiChat.mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      await provider.chat('reviewer', messages, options);

      expect(mockGeminiChat).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({
          maxTokens: 2000,
          temperature: 0.5,
        })
      );
    });
  });

  describe('countTokens()', () => {
    it('counts tokens using Claude client', () => {
      mockClaudeCountTokens.mockReturnValue(100);

      const count = provider.countTokens('Hello world');

      expect(count).toBe(100);
    });
  });
});
