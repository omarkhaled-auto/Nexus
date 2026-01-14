// LLM Module - Phase 03-01
// Provides LLM clients with extended thinking, streaming, and tool support

// Types
export type {
  Message,
  MessageRole,
  ToolCall,
  ToolResult,
  ToolDefinition,
  ThinkingConfig,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  StreamChunkType,
  TokenUsage,
  AgentType,
  AgentUsageStats,
  UsageStats,
  ModelConfig,
  ModelPricing,
  JSONSchema,
  Logger,
  LLMClient,
  FinishReason,
} from './types';

// Constants
export { DEFAULT_MODEL_CONFIGS, MODEL_PRICING } from './types';

// Clients
export { ClaudeClient, LLMError, APIError, RateLimitError, AuthenticationError, TimeoutError } from './clients/ClaudeClient';
export type { ClaudeClientOptions } from './clients/ClaudeClient';

export { GeminiClient, GeminiAPIError, GeminiRateLimitError, GeminiTimeoutError } from './clients/GeminiClient';
export type { GeminiClientOptions } from './clients/GeminiClient';

// Provider
export { LLMProvider } from './LLMProvider';
export type { LLMProviderOptions } from './LLMProvider';
