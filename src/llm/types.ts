/**
 * LLM Types - Core type definitions for LLM integration
 * Phase 03-01: LLM Provider with Extended Thinking
 * Phase 16 Finalization: Model constants centralization
 */

import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  MODEL_PRICING_INFO,
} from './models';

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
  /**
   * Disable all tools for this request (chat-only mode).
   * When true, passes --tools "" to Claude CLI to prevent any tool use.
   * Use this for conversational interactions like interviews where
   * tool use (file creation, etc.) is not desired.
   */
  disableTools?: boolean;
  /**
   * Override working directory for this specific call.
   * When provided, the CLI will run in this directory instead of the
   * default configured working directory.
   * Use this to run Claude CLI in the user's project directory during execution.
   */
  workingDirectory?: string;
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
 * Updated Phase 16 Finalization: Uses centralized model constants
 */
export const DEFAULT_MODEL_CONFIGS: Record<AgentType, ModelConfig> = {
  planner: {
    model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    maxTokens: 16000,
    temperature: 0.7,
    thinking: {
      enabled: true,
      budgetTokens: 10000,
    },
  },
  coder: {
    model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    maxTokens: 16000,
    temperature: 0.3,
    thinking: {
      enabled: true,
      budgetTokens: 8000,
    },
  },
  tester: {
    model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    maxTokens: 8000,
    temperature: 0.2,
    thinking: {
      enabled: false,
      budgetTokens: 0,
    },
  },
  reviewer: {
    model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
    maxTokens: 8000,
    temperature: 0.3,
  },
  merger: {
    model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
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
 * Note: Centralized pricing is available in MODEL_PRICING_INFO from './models'
 * This export is kept for backwards compatibility
 */
export const MODEL_PRICING: Partial<Record<string, ModelPricing>> = Object.fromEntries(
  Object.entries(MODEL_PRICING_INFO).map(([key, value]) => [key, value as ModelPricing])
);

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
