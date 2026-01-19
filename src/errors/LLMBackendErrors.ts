/**
 * LLMBackendErrors - Unified error classes for LLM backend failures
 *
 * Phase 16: Full CLI Support Integration - Task 13
 *
 * These error classes provide standardized, helpful error messages that:
 * 1. Include install instructions for CLI tools
 * 2. Include API key alternatives
 * 3. Include Settings UI paths for non-technical users
 *
 * All CLI-related errors should use these classes for consistency.
 */

import { LLMError } from '../llm/clients/ClaudeClient';

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error for all LLM backend failures.
 * Provides common structure for CLI and API backend errors.
 */
export class LLMBackendError extends LLMError {
  /** The provider that failed: 'claude', 'gemini', or 'embeddings' */
  readonly provider: 'claude' | 'gemini' | 'embeddings';

  /** Whether the error is recoverable (can fall back to another backend) */
  readonly recoverable: boolean;

  constructor(
    message: string,
    provider: 'claude' | 'gemini' | 'embeddings',
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'LLMBackendError';
    this.provider = provider;
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, LLMBackendError.prototype);
  }
}

// ============================================================================
// CLI Not Found Errors
// ============================================================================

/**
 * Error details for each provider's CLI installation
 */
const CLI_INSTALL_DETAILS = {
  claude: {
    name: 'Claude',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    installUrl: 'https://docs.anthropic.com/claude/docs/claude-code-cli',
    envVariable: 'ANTHROPIC_API_KEY',
    settingsPath: 'Settings → LLM Providers → Claude → Use API',
  },
  gemini: {
    name: 'Gemini',
    installCommand: 'npm install -g @google/gemini-cli',
    installUrl: 'https://ai.google.dev/gemini-api/docs/cli',
    envVariable: 'GOOGLE_API_KEY',
    settingsPath: 'Settings → LLM Providers → Gemini → Use API',
  },
} as const;

/**
 * Unified error when a CLI tool is not found.
 *
 * Provides a helpful two-option message:
 * 1. How to install the CLI
 * 2. How to use API key instead
 *
 * @example
 * ```typescript
 * throw new CLINotFoundError('claude');
 * ```
 */
export class CLINotFoundError extends LLMBackendError {
  /** Command to install the CLI */
  readonly installCommand: string;

  /** URL for more installation information */
  readonly installUrl: string;

  /** Environment variable for API key fallback */
  readonly envVariable: string;

  /** Path in Settings UI to configure API backend */
  readonly settingsPath: string;

  constructor(provider: 'claude' | 'gemini') {
    const details = CLI_INSTALL_DETAILS[provider];

    const message =
      `${details.name} CLI not found.\n\n` +
      `You have two options:\n\n` +
      `━━━ OPTION 1: Install the CLI ━━━\n` +
      `  ${details.installCommand}\n` +
      `  More info: ${details.installUrl}\n\n` +
      `━━━ OPTION 2: Use API Key ━━━\n` +
      `  Set ${details.envVariable} in your .env file\n` +
      `  Or: ${details.settingsPath}\n`;

    super(message, provider, true);
    this.name = 'CLINotFoundError';
    this.installCommand = details.installCommand;
    this.installUrl = details.installUrl;
    this.envVariable = details.envVariable;
    this.settingsPath = details.settingsPath;
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

// ============================================================================
// CLI Authentication Errors
// ============================================================================

/**
 * Authentication details for each provider
 */
const CLI_AUTH_DETAILS = {
  claude: {
    name: 'Claude',
    authCommand: 'claude auth login',
    envVariable: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    name: 'Gemini',
    authCommand: 'gcloud auth application-default login',
    envVariable: 'GOOGLE_API_KEY',
  },
} as const;

/**
 * Error when CLI authentication fails.
 *
 * Provides instructions for:
 * 1. How to authenticate with the CLI
 * 2. How to use API key instead
 */
export class CLIAuthError extends LLMBackendError {
  /** Command to authenticate with the CLI */
  readonly authCommand: string;

  /** Environment variable for API key fallback */
  readonly envVariable: string;

  constructor(provider: 'claude' | 'gemini') {
    const details = CLI_AUTH_DETAILS[provider];

    const message =
      `${details.name} CLI authentication failed.\n\n` +
      `You have two options:\n\n` +
      `━━━ OPTION 1: Authenticate CLI ━━━\n` +
      `  ${details.authCommand}\n\n` +
      `━━━ OPTION 2: Use API Key ━━━\n` +
      `  Set ${details.envVariable} in your .env file\n`;

    super(message, provider, true);
    this.name = 'CLIAuthError';
    this.authCommand = details.authCommand;
    this.envVariable = details.envVariable;
    Object.setPrototypeOf(this, CLIAuthError.prototype);
  }
}

// ============================================================================
// CLI Timeout Errors
// ============================================================================

/**
 * Error when CLI request times out.
 *
 * Provides:
 * 1. The timeout duration
 * 2. How to increase timeout in settings
 */
export class CLITimeoutError extends LLMBackendError {
  /** The timeout that was exceeded (in ms) */
  readonly timeoutMs: number;

  constructor(provider: 'claude' | 'gemini', timeoutMs: number) {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const timeoutSeconds = Math.round(timeoutMs / 1000);

    const message =
      `${providerName} CLI request timed out after ${timeoutSeconds} seconds.\n\n` +
      `You can:\n` +
      `1. Try again with a simpler request\n` +
      `2. Increase timeout in Settings → LLM Providers → ${providerName} → Timeout\n`;

    super(message, provider, true);
    this.name = 'CLITimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, CLITimeoutError.prototype);
  }
}

// ============================================================================
// API Key Missing Errors
// ============================================================================

/**
 * API key details for each provider
 */
const API_KEY_DETAILS = {
  claude: {
    name: 'Claude',
    envVariable: 'ANTHROPIC_API_KEY',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    cliSettingsPath: 'Settings → LLM Providers → Claude → Use CLI',
  },
  gemini: {
    name: 'Gemini',
    envVariable: 'GOOGLE_API_KEY',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    cliSettingsPath: 'Settings → LLM Providers → Gemini → Use CLI',
  },
  embeddings: {
    name: 'OpenAI Embeddings',
    envVariable: 'OPENAI_API_KEY',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    cliSettingsPath: 'Settings → Embeddings → Use Local',
  },
} as const;

/**
 * Error when API key is required but not provided.
 *
 * Provides:
 * 1. Where to get an API key
 * 2. How to configure the environment variable
 * 3. Alternative to switch to CLI backend
 */
export class APIKeyMissingError extends LLMBackendError {
  /** Environment variable that should contain the API key */
  readonly envVariable: string;

  /** URL to get an API key */
  readonly getKeyUrl: string;

  /** Path in Settings UI to switch to CLI backend */
  readonly cliSettingsPath: string;

  constructor(provider: 'claude' | 'gemini' | 'embeddings') {
    const details = API_KEY_DETAILS[provider];

    const message =
      `${details.name} API key required.\n\n` +
      `You have two options:\n\n` +
      `━━━ OPTION 1: Set API Key ━━━\n` +
      `  Set ${details.envVariable} in your .env file\n` +
      `  Get key: ${details.getKeyUrl}\n\n` +
      `━━━ OPTION 2: Use CLI/Local ━━━\n` +
      `  ${details.cliSettingsPath}\n` +
      `  (No API key required)\n`;

    super(message, provider, true);
    this.name = 'APIKeyMissingError';
    this.envVariable = details.envVariable;
    this.getKeyUrl = details.getKeyUrl;
    this.cliSettingsPath = details.cliSettingsPath;
    Object.setPrototypeOf(this, APIKeyMissingError.prototype);
  }
}

// ============================================================================
// Local Embeddings Errors
// ============================================================================

/**
 * Error when local embeddings initialization fails.
 *
 * Provides:
 * 1. Common causes of failure
 * 2. How to try a different model
 * 3. How to fall back to OpenAI API
 */
export class LocalEmbeddingsError extends LLMBackendError {
  /** The model that failed to initialize */
  readonly model: string;

  /** The original error cause (ES2022 Error.cause) */
  override readonly cause: unknown;

  constructor(model: string, cause?: unknown) {
    const message =
      `Failed to initialize local embeddings model '${model}'.\n\n` +
      `You have two options:\n\n` +
      `━━━ OPTION 1: Fix Local Embeddings ━━━\n` +
      `  - Check your internet connection (model downloads on first use)\n` +
      `  - Try a different model in Settings → Embeddings → Model\n` +
      `  - Clear cache: rm -rf ~/.cache/huggingface\n\n` +
      `━━━ OPTION 2: Use OpenAI API ━━━\n` +
      `  Set OPENAI_API_KEY in your .env file\n` +
      `  Or: Settings → Embeddings → Use API\n`;

    super(message, 'embeddings', true);
    this.name = 'LocalEmbeddingsError';
    this.model = model;
    this.cause = cause;
    Object.setPrototypeOf(this, LocalEmbeddingsError.prototype);
  }
}

// ============================================================================
// Rate Limit Errors
// ============================================================================

/**
 * Error when API or CLI rate limit is exceeded.
 */
export class RateLimitError extends LLMBackendError {
  /** How long to wait before retrying (in ms), if known */
  readonly retryAfterMs?: number;

  constructor(provider: 'claude' | 'gemini', retryAfterMs?: number) {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const retryMessage = retryAfterMs
      ? `\nRetry after: ${Math.round(retryAfterMs / 1000)} seconds`
      : '';

    const message =
      `${providerName} rate limit exceeded.${retryMessage}\n\n` +
      `Options:\n` +
      `1. Wait a moment and try again\n` +
      `2. Reduce request frequency\n` +
      `3. Upgrade your API plan for higher limits\n`;

    super(message, provider, true);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// ============================================================================
// Backend Unavailable Error (All Options Exhausted)
// ============================================================================

/**
 * Error when no backend is available after trying all options.
 * This is a non-recoverable error.
 */
export class BackendUnavailableError extends LLMBackendError {
  /** What was tried before giving up */
  readonly attemptedBackends: ('cli' | 'api' | 'local')[];

  constructor(
    provider: 'claude' | 'gemini' | 'embeddings',
    attemptedBackends: ('cli' | 'api' | 'local')[]
  ) {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const attemptsList = attemptedBackends.join(', ');

    let resolution = '';
    if (provider === 'embeddings') {
      resolution =
        `To fix this:\n` +
        `1. For local: Ensure internet connection for model download\n` +
        `2. For API: Set OPENAI_API_KEY in your .env file\n`;
    } else {
      const details = CLI_INSTALL_DETAILS[provider];
      resolution =
        `To fix this:\n` +
        `1. Install CLI: ${details.installCommand}\n` +
        `2. Or set API key: ${details.envVariable} in .env\n`;
    }

    const message =
      `${providerName} unavailable. Tried: ${attemptsList}.\n\n` + resolution;

    super(message, provider, false);
    this.name = 'BackendUnavailableError';
    this.attemptedBackends = attemptedBackends;
    Object.setPrototypeOf(this, BackendUnavailableError.prototype);
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Re-export for convenience (legacy compatibility)
  LLMError,
};
