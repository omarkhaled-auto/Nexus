// LLM Provider Types for Nexus

export type LLMProviderType = 'anthropic' | 'google' | 'openai';

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_use';
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}
