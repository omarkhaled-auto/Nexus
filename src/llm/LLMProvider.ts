import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  Logger,
  AgentType,
  UsageStats,
} from './types';

export interface LLMProviderOptions {
  anthropicApiKey: string;
  googleApiKey: string;
  logger?: Logger;
}

/**
 * LLM Provider for routing requests to appropriate LLM clients
 * based on agent type and model configuration
 */
export class LLMProvider {
  constructor(_options: LLMProviderOptions) {
    // Stub - not implemented
  }

  async chat(
    _agentType: AgentType,
    _messages: Message[],
    _options?: ChatOptions
  ): Promise<LLMResponse> {
    throw new Error('Not implemented');
  }

  async *chatStream(
    _agentType: AgentType,
    _messages: Message[],
    _options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    throw new Error('Not implemented');
  }

  getUsageStats(): UsageStats {
    throw new Error('Not implemented');
  }

  resetUsageStats(): void {
    throw new Error('Not implemented');
  }

  countTokens(_content: string): number {
    throw new Error('Not implemented');
  }
}
