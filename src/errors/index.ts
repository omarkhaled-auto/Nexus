/**
 * Error classes for Nexus
 *
 * This module exports all error classes used throughout Nexus.
 */

export {
  // LLM Backend Errors (Phase 16)
  LLMBackendError,
  CLINotFoundError,
  CLIAuthError,
  CLITimeoutError,
  APIKeyMissingError,
  LocalEmbeddingsError,
  RateLimitError,
  BackendUnavailableError,
  // Re-export from ClaudeClient for convenience
  LLMError,
} from './LLMBackendErrors';
