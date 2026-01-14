// LLM Types and Interfaces for Nexus
// Phase 03-01: LLM Clients Implementation

/**
 * Message roles for LLM conversations
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Tool call made by the LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result from executing a tool
 */
export interface ToolResult {
  toolCallId: string;
  result: string | object;
}

/**
 * Message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

/**
 * Configuration for extended thinking (Claude feature)
 * - type: 'enabled' requires streaming and temperature=1
 * - budgetTokens controls thinking depth (separate from output tokens)
 */
export interface ThinkingConfig {
  type: 'enabled' | 'disabled';
  budgetTokens?: number;
}

/**
 * JSON Schema type for tool input validation
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  items?: JSONSchema;
  enum?: unknown[];
  default?: unknown;
  [key: string]: unknown;
}

/**
 * Tool definition for LLM function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * Options for chat/completion requests
 */
export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  stopSequences?: string[];
  thinking?: ThinkingConfig;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  totalTokens: number;
}

/**
 * Finish reasons for LLM responses
 */
export type FinishReason = 'stop' | 'tool_use' | 'max_tokens' | 'error';

/**
 * Response from LLM completion
 */
export interface LLMResponse {
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
}

/**
 * Stream chunk types
 */
export type StreamChunkType = 'thinking' | 'text' | 'tool_use' | 'done';

/**
 * Chunk emitted during streaming
 */
export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  toolCall?: ToolCall;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  thinking?: ThinkingConfig;
}

/**
 * Agent types in the system
 */
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

/**
 * Usage statistics per agent type
 */
export interface AgentUsageStats {
  tokens: number;
  calls: number;
  cost: number;
}

/**
 * Overall usage statistics
 */
export interface UsageStats {
  byAgent: Record<AgentType, AgentUsageStats>;
  total: AgentUsageStats;
}

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * LLM Client interface - common interface for all LLM clients
 */
export interface LLMClient {
  /**
   * Send a chat completion request
   */
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>;

  /**
   * Stream a chat completion
   */
  chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Approximate token count for content
   */
  countTokens(content: string): number;
}

/**
 * Model pricing per million tokens
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Default model configurations per agent type
 * Extended thinking requires temperature=1 and streaming
 */
export const DEFAULT_MODEL_CONFIGS: Record<AgentType, ModelConfig> = {
  planner: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,
    thinking: { type: 'enabled', budgetTokens: 10000 },
  },
  coder: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,
    thinking: { type: 'enabled', budgetTokens: 5000 },
  },
  reviewer: {
    model: 'gemini-3.0-pro',
    maxTokens: 8000,
    temperature: 0.2,
  },
  tester: {
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 8000,
    temperature: 0.3,
  },
  merger: {
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 4000,
    temperature: 0.1,
  },
};

/**
 * Model pricing (per million tokens)
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-5-20250514': { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-sonnet-4-5-20250514': { inputPerMillion: 3, outputPerMillion: 15 },
  'gemini-3.0-pro': { inputPerMillion: 1.25, outputPerMillion: 5 },
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5 },
};
