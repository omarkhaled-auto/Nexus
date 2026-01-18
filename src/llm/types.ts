/**
 * LLM Types - Core type definitions for LLM integration
 * Phase 03-01: LLM Provider with Extended Thinking
 */

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Finish reason for LLM response
 */
export type FinishReason = 'stop' | 'max_tokens' | 'tool_use' | 'error';

/**
 * Tool call made by the assistant
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result from a tool execution
 */
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
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

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * JSON Schema for tool parameters
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  enum?: string[];
  default?: unknown;
}

/**
 * Definition for a tool that can be used by the LLM
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// ============================================================================
// Thinking Configuration
// ============================================================================

/**
 * Configuration for Claude's extended thinking feature
 */
export interface ThinkingConfig {
  enabled: boolean;
  budgetTokens: number;
}

// ============================================================================
// Chat Options and Response
// ============================================================================

/**
 * Options for a chat request
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
  totalTokens: number;
  thinkingTokens?: number;
}

/**
 * Response from an LLM chat request
 */
export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
  thinking?: string;
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Type of stream chunk
 */
export type StreamChunkType = 'text' | 'thinking' | 'tool_use' | 'done' | 'error';

/**
 * Chunk from a streaming response
 */
export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Types of agents in the Nexus system
 */
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger';

/**
 * Usage statistics for a single agent
 */
export interface AgentUsageStats {
  tokens: number;
  calls: number;
  cost: number;
}

/**
 * Overall usage statistics across all agents
 */
export interface UsageStats {
  byAgent: Record<AgentType, AgentUsageStats>;
  total: AgentUsageStats;
}

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Configuration for a model assigned to an agent
 */
export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  thinking?: ThinkingConfig;
}

/**
 * Pricing information for a model
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Default model configurations per agent type
 * Per ADR-002: Agent role specialization
 */
export const DEFAULT_MODEL_CONFIGS: Record<AgentType, ModelConfig> = {
  planner: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 16000,
    temperature: 0.7,
    thinking: {
      enabled: true,
      budgetTokens: 10000,
    },
  },
  coder: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 16000,
    temperature: 0.3,
    thinking: {
      enabled: true,
      budgetTokens: 8000,
    },
  },
  tester: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8000,
    temperature: 0.2,
    thinking: {
      enabled: false,
      budgetTokens: 0,
    },
  },
  reviewer: {
    model: 'gemini-2.0-flash',
    maxTokens: 8000,
    temperature: 0.3,
  },
  merger: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    temperature: 0.1,
    thinking: {
      enabled: false,
      budgetTokens: 0,
    },
  },
};

/**
 * Model pricing per million tokens
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-20250514': {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  'claude-3-5-sonnet-20241022': {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  'claude-3-opus-20240229': {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
  },
  'gemini-2.0-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
  },
  'gemini-1.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
  },
};

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface for LLM operations
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// LLM Client Interface
// ============================================================================

/**
 * Interface for LLM client implementations
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
   * Count tokens in content
   */
  countTokens(content: string): number;
}
