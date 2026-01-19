// LLM Module - Phase 03-01
// Provides LLM clients with extended thinking, streaming, and tool support

// Model Configuration (Centralized) - Phase 16 Finalization
export * from './models';

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

// Claude Code CLI Client (uses CLI instead of API)
export { ClaudeCodeCLIClient, CLIError, CLINotFoundError } from './clients/ClaudeCodeCLIClient';
export type { ClaudeCodeCLIConfig } from './clients/ClaudeCodeCLIClient';

// Gemini CLI Client (uses CLI instead of API)
export {
  GeminiCLIClient,
  GeminiCLIError,
  GeminiCLINotFoundError,
  GeminiCLIAuthError,
  GeminiCLITimeoutError,
} from './clients/GeminiCLIClient';
export type {
  GeminiCLIConfig,
  GeminiCLIResponse,
  GeminiCLIRawResponse,
  GeminiStreamChunk,
  GeminiCLIErrorCode,
  GeminiCLIErrorInfo,
} from './clients/GeminiCLIClient.types';

// Mock Clients (for testing)
export { MockClaudeClient } from './clients/MockClaudeClient';
export type { MockResponseConfig } from './clients/MockClaudeClient';
export { MockGeminiClient } from './clients/MockGeminiClient';

// Provider
export { LLMProvider } from './LLMProvider';
export type { LLMProviderOptions, ClaudeBackend } from './LLMProvider';
