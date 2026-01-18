import { ClaudeClient } from './clients/ClaudeClient';
import { GeminiClient } from './clients/GeminiClient';
import { ClaudeCodeCLIClient, type ClaudeCodeCLIConfig } from './clients/ClaudeCodeCLIClient';
import { MockClaudeClient, type MockResponseConfig } from './clients/MockClaudeClient';
import { MockGeminiClient } from './clients/MockGeminiClient';
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  Logger,
  AgentType,
  UsageStats,
  AgentUsageStats,
  LLMClient,
} from './types';
import { DEFAULT_MODEL_CONFIGS, MODEL_PRICING } from './types';

/**
 * Claude backend type - API (direct) or CLI (via claude command)
 */
export type ClaudeBackend = 'api' | 'cli';

export interface LLMProviderOptions {
  /**
   * Anthropic API key (required if claudeBackend is 'api')
   */
  anthropicApiKey?: string;
  /**
   * Google API key for Gemini
   */
  googleApiKey: string;
  logger?: Logger;
  /**
   * Enable mock mode for testing without hitting real APIs.
   * When true, uses MockClaudeClient and MockGeminiClient.
   */
  mockMode?: boolean;
  /**
   * Mock configuration (only used when mockMode is true)
   */
  mockConfig?: {
    claude?: MockResponseConfig;
    gemini?: MockResponseConfig;
  };
  /**
   * Claude backend selection: 'api' for direct API, 'cli' for Claude Code CLI.
   * Default: 'api' if anthropicApiKey provided, 'cli' otherwise.
   */
  claudeBackend?: ClaudeBackend;
  /**
   * Configuration for CLI backend (only used when claudeBackend is 'cli')
   */
  cliConfig?: ClaudeCodeCLIConfig;
}

/**
 * Initialize empty usage stats for an agent type
 */
function createEmptyAgentStats(): AgentUsageStats {
  return {
    tokens: 0,
    calls: 0,
    cost: 0,
  };
}

/**
 * Initialize empty usage stats
 */
function createEmptyUsageStats(): UsageStats {
  return {
    byAgent: {
      planner: createEmptyAgentStats(),
      coder: createEmptyAgentStats(),
      tester: createEmptyAgentStats(),
      reviewer: createEmptyAgentStats(),
      merger: createEmptyAgentStats(),
    },
    total: createEmptyAgentStats(),
  };
}

/**
 * Calculate cost for a request based on model and token counts
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  // Cost = (input tokens / 1M * inputCost) + (output tokens / 1M * outputCost)
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return inputCost + outputCost;
}

/**
 * Check if model is a Claude model
 */
function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-');
}

/**
 * LLM Provider for routing requests to appropriate LLM clients
 * based on agent type and model configuration
 */
export class LLMProvider {
  private claudeClient: LLMClient;
  private geminiClient: LLMClient;
  private logger?: Logger;
  private usageStats: UsageStats;
  private readonly mockMode: boolean;
  private readonly claudeBackend: ClaudeBackend;

  constructor(options: LLMProviderOptions) {
    this.mockMode = options.mockMode ?? false;

    // Determine Claude backend
    if (options.claudeBackend) {
      this.claudeBackend = options.claudeBackend;
    } else if (options.anthropicApiKey) {
      this.claudeBackend = 'api';
    } else {
      this.claudeBackend = 'cli';
    }

    if (this.mockMode) {
      // Use mock clients for testing
      this.claudeClient = new MockClaudeClient(options.mockConfig?.claude);
      this.geminiClient = new MockGeminiClient(options.mockConfig?.gemini);
      this.logger = options.logger;
      this.logger?.info('LLMProvider initialized in MOCK MODE');
    } else {
      // Initialize Claude client based on backend selection
      if (this.claudeBackend === 'api') {
        if (!options.anthropicApiKey) {
          throw new Error('API backend requires anthropicApiKey');
        }
        this.claudeClient = new ClaudeClient({
          apiKey: options.anthropicApiKey,
          logger: options.logger,
        });
        this.logger = options.logger;
        this.logger?.info('LLMProvider initialized with Claude API backend');
      } else {
        // CLI backend
        this.claudeClient = new ClaudeCodeCLIClient({
          ...options.cliConfig,
          logger: options.logger,
        });
        this.logger = options.logger;
        this.logger?.info('LLMProvider initialized with Claude CLI backend');
      }

      this.geminiClient = new GeminiClient({
        apiKey: options.googleApiKey,
        logger: options.logger,
      });
    }

    this.usageStats = createEmptyUsageStats();
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Get the mock Claude client for test configuration.
   * Throws if not in mock mode.
   */
  getMockClaudeClient(): MockClaudeClient {
    if (!this.mockMode) {
      throw new Error('getMockClaudeClient() only available in mock mode');
    }
    return this.claudeClient as MockClaudeClient;
  }

  /**
   * Get the mock Gemini client for test configuration.
   * Throws if not in mock mode.
   */
  getMockGeminiClient(): MockGeminiClient {
    if (!this.mockMode) {
      throw new Error('getMockGeminiClient() only available in mock mode');
    }
    return this.geminiClient as MockGeminiClient;
  }

  /**
   * Send a chat completion request to the appropriate LLM
   * based on agent type
   */
  async chat(
    agentType: AgentType,
    messages: Message[],
    options?: ChatOptions
  ): Promise<LLMResponse> {
    const config = DEFAULT_MODEL_CONFIGS[agentType];
    const client = this.getClientForModel(config.model);

    // Build options with defaults from config
    const mergedOptions: ChatOptions = {
      maxTokens: options?.maxTokens ?? config.maxTokens,
      temperature: options?.temperature ?? config.temperature,
      tools: options?.tools,
      stopSequences: options?.stopSequences,
      thinking: config.thinking, // Use agent's thinking config
    };

    this.logger?.debug(`Routing ${agentType} to ${config.model}`, { options: mergedOptions });

    const response = await client.chat(messages, mergedOptions);

    // Update usage stats
    this.updateUsageStats(agentType, config.model, response);

    return response;
  }

  /**
   * Stream a chat completion from the appropriate LLM
   */
  async *chatStream(
    agentType: AgentType,
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const config = DEFAULT_MODEL_CONFIGS[agentType];
    const client = this.getClientForModel(config.model);

    // Build options with defaults from config
    const mergedOptions: ChatOptions = {
      maxTokens: options?.maxTokens ?? config.maxTokens,
      temperature: options?.temperature ?? config.temperature,
      tools: options?.tools,
      stopSequences: options?.stopSequences,
      thinking: config.thinking,
    };

    this.logger?.debug(`Streaming ${agentType} from ${config.model}`);

    yield* client.chatStream(messages, mergedOptions);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    return this.usageStats;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.usageStats = createEmptyUsageStats();
  }

  /**
   * Count tokens for content using Claude's tokenizer
   */
  countTokens(content: string): number {
    return this.claudeClient.countTokens(content);
  }

  /**
   * Get the current Claude backend type
   */
  getClaudeBackend(): ClaudeBackend {
    return this.claudeBackend;
  }

  /**
   * Check if CLI backend is available.
   * Always returns true for API backend.
   * For CLI backend, checks if claude command is accessible.
   */
  async validateCLIBackend(): Promise<boolean> {
    if (this.claudeBackend !== 'cli') {
      return true;
    }
    const cliClient = this.claudeClient as ClaudeCodeCLIClient;
    return cliClient.isAvailable();
  }

  /**
   * Get the Claude CLI client (if using CLI backend).
   * Throws if not using CLI backend.
   */
  getCLIClient(): ClaudeCodeCLIClient {
    if (this.claudeBackend !== 'cli') {
      throw new Error('getCLIClient() only available when using CLI backend');
    }
    return this.claudeClient as ClaudeCodeCLIClient;
  }

  /**
   * Get the appropriate client for a model
   */
  private getClientForModel(model: string): LLMClient {
    if (isClaudeModel(model)) {
      return this.claudeClient;
    }
    return this.geminiClient;
  }

  /**
   * Update usage statistics after a request
   */
  private updateUsageStats(
    agentType: AgentType,
    model: string,
    response: LLMResponse
  ): void {
    const { inputTokens, outputTokens, totalTokens } = response.usage;
    const cost = calculateCost(model, inputTokens, outputTokens);

    // Update agent stats
    this.usageStats.byAgent[agentType].tokens += totalTokens;
    this.usageStats.byAgent[agentType].calls += 1;
    this.usageStats.byAgent[agentType].cost += cost;

    // Update total stats
    this.usageStats.total.tokens += totalTokens;
    this.usageStats.total.calls += 1;
    this.usageStats.total.cost += cost;

    this.logger?.debug('Usage stats updated', {
      agentType,
      tokens: totalTokens,
      cost,
      totalStats: this.usageStats.total,
    });
  }
}
