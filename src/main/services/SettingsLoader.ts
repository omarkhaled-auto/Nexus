/**
 * SettingsLoader - Bridge between Settings and NexusFactory
 * Phase 16 Task 15: Wire Settings to LLMProvider Selection
 *
 * This service loads settings from the settingsService and converts them
 * to NexusFactoryConfig format. It handles:
 * - API key decryption via safeStorage
 * - Environment variable fallbacks
 * - Default value merging
 *
 * Usage:
 * ```typescript
 * // Load settings as factory config
 * const config = await SettingsLoader.loadAsFactoryConfig('/path/to/project');
 * const nexus = await NexusFactory.create(config);
 *
 * // Or use the convenience function
 * const nexus = await createNexusFromSettings('/path/to/project');
 * ```
 */

import { settingsService } from './settingsService';
import type { NexusFactoryConfig, LLMBackend, EmbeddingsBackend } from '../../NexusFactory';
import type {
  NexusSettings,
  LLMSettings,
  ClaudeProviderSettings,
  GeminiProviderSettings,
  EmbeddingsProviderSettings,
  LLMBackendType,
  EmbeddingsBackendType,
} from '../../shared/types/settings';

// ============================================================================
// SettingsLoader Class
// ============================================================================

/**
 * Loads settings and converts them to NexusFactoryConfig.
 *
 * This bridges the gap between the Electron settings system (which stores
 * encrypted API keys and user preferences) and the NexusFactory (which
 * needs decrypted keys and concrete configuration).
 */
export class SettingsLoader {
  /**
   * Load settings from store and environment, convert to NexusFactoryConfig.
   *
   * Priority order for each setting:
   * 1. Settings store (user-configured via UI)
   * 2. Environment variables (fallback for CI/automation)
   * 3. Default values
   *
   * @param workingDir - Project working directory (required for NexusFactory)
   * @returns NexusFactoryConfig ready for NexusFactory.create()
   */
  static async loadAsFactoryConfig(workingDir: string): Promise<NexusFactoryConfig> {
    // Load current settings from store
    const llmSettings = this.getLLMSettings();

    // Build config with decrypted API keys and fallbacks
    const config: NexusFactoryConfig = {
      workingDir,

      // ========================================================================
      // Claude Configuration
      // ========================================================================
      claudeBackend: this.mapLLMBackend(llmSettings.claude.backend),
      claudeApiKey: await this.getClaudeApiKey(llmSettings.claude),
      claudeCliConfig: {
        // Use claudePath (the actual config property name)
        claudePath: llmSettings.claude.cliPath,
        timeout: llmSettings.claude.timeout,
        maxRetries: llmSettings.claude.maxRetries,
      },
      claudeConfig: {
        // ClaudeClientOptions doesn't have model - it's set per-request
        timeout: llmSettings.claude.timeout,
        maxRetries: llmSettings.claude.maxRetries,
      },

      // ========================================================================
      // Gemini Configuration
      // ========================================================================
      geminiBackend: this.mapLLMBackend(llmSettings.gemini.backend),
      geminiApiKey: await this.getGeminiApiKey(llmSettings.gemini),
      geminiCliConfig: {
        cliPath: llmSettings.gemini.cliPath,
        timeout: llmSettings.gemini.timeout,
        model: llmSettings.gemini.model,
      },
      geminiConfig: {
        // GeminiClientOptions doesn't have model - it's set per-request
        timeout: llmSettings.gemini.timeout,
      },

      // ========================================================================
      // Embeddings Configuration
      // ========================================================================
      embeddingsBackend: this.mapEmbeddingsBackend(llmSettings.embeddings.backend),
      openaiApiKey: await this.getOpenAIApiKey(llmSettings.embeddings),
      localEmbeddingsConfig: {
        model: llmSettings.embeddings.localModel,
        cacheEnabled: llmSettings.embeddings.cacheEnabled,
        maxCacheSize: llmSettings.embeddings.maxCacheSize,
      },
    };

    // Remove undefined values to allow NexusFactory defaults to apply
    return this.removeUndefined(config);
  }

  /**
   * Get LLM settings section from store.
   * Handles legacy settings format for backwards compatibility.
   */
  private static getLLMSettings(): LLMSettings {
    const llm = settingsService.get('llm') as LLMSettings | undefined;

    if (!llm) {
      // Return defaults if llm section doesn't exist
      return {
        claude: { backend: 'cli' },
        gemini: { backend: 'cli' },
        embeddings: { backend: 'local' },
        defaultProvider: 'claude',
        defaultModel: 'claude-sonnet-4-20250514',
        fallbackEnabled: true,
        fallbackOrder: ['claude', 'gemini'],
      };
    }

    // Ensure sub-objects exist (handle legacy format)
    return {
      claude: llm.claude ?? { backend: 'cli' },
      gemini: llm.gemini ?? { backend: 'cli' },
      embeddings: llm.embeddings ?? { backend: 'local' },
      defaultProvider: llm.defaultProvider ?? 'claude',
      defaultModel: llm.defaultModel ?? 'claude-sonnet-4-20250514',
      fallbackEnabled: llm.fallbackEnabled ?? true,
      fallbackOrder: llm.fallbackOrder ?? ['claude', 'gemini'],
      // Legacy fields
      claudeApiKeyEncrypted: llm.claudeApiKeyEncrypted,
      geminiApiKeyEncrypted: llm.geminiApiKeyEncrypted,
      openaiApiKeyEncrypted: llm.openaiApiKeyEncrypted,
    };
  }

  /**
   * Get Claude API key with fallback to environment variable.
   *
   * Priority:
   * 1. Settings store (decrypted via safeStorage)
   * 2. ANTHROPIC_API_KEY environment variable
   */
  private static async getClaudeApiKey(
    settings: ClaudeProviderSettings
  ): Promise<string | undefined> {
    // Try settings store first (uses safeStorage)
    const storedKey = settingsService.getApiKey('claude');
    if (storedKey) {
      return storedKey;
    }

    // Fall back to environment variable
    return process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Get Gemini API key with fallback to environment variable.
   *
   * Priority:
   * 1. Settings store (decrypted via safeStorage)
   * 2. GOOGLE_AI_API_KEY or GOOGLE_API_KEY environment variable
   */
  private static async getGeminiApiKey(
    settings: GeminiProviderSettings
  ): Promise<string | undefined> {
    // Try settings store first (uses safeStorage)
    const storedKey = settingsService.getApiKey('gemini');
    if (storedKey) {
      return storedKey;
    }

    // Fall back to environment variables (check both common names)
    return process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  /**
   * Get OpenAI API key with fallback to environment variable.
   *
   * Priority:
   * 1. Settings store (decrypted via safeStorage)
   * 2. OPENAI_API_KEY environment variable
   */
  private static async getOpenAIApiKey(
    settings: EmbeddingsProviderSettings
  ): Promise<string | undefined> {
    // Try settings store first (uses safeStorage)
    const storedKey = settingsService.getApiKey('openai');
    if (storedKey) {
      return storedKey;
    }

    // Fall back to environment variable
    return process.env.OPENAI_API_KEY;
  }

  /**
   * Map settings backend type to NexusFactory backend type.
   * These are the same values, but separate types for clarity.
   */
  private static mapLLMBackend(backend: LLMBackendType | undefined): LLMBackend {
    return (backend ?? 'cli') as LLMBackend;
  }

  /**
   * Map settings embeddings backend type to NexusFactory backend type.
   */
  private static mapEmbeddingsBackend(backend: EmbeddingsBackendType | undefined): EmbeddingsBackend {
    return (backend ?? 'local') as EmbeddingsBackend;
  }

  /**
   * Remove undefined values from config object.
   * This allows NexusFactory defaults to apply for unset values.
   */
  private static removeUndefined<T extends object>(obj: T): T {
    const result = { ...obj } as Record<string, unknown>;

    for (const key of Object.keys(result)) {
      const value = result[key];
      if (value === undefined) {
        delete result[key];
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively clean nested objects
        const cleaned = this.removeUndefined(value as Record<string, unknown>);
        // Only keep nested object if it has properties
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        } else {
          delete result[key];
        }
      }
    }

    return result as T;
  }

  /**
   * Check if CLI backend is configured and potentially available.
   * This is a quick check without actually verifying CLI availability.
   *
   * @param provider - 'claude' or 'gemini'
   * @returns true if CLI backend is selected in settings
   */
  static isCLIBackendConfigured(provider: 'claude' | 'gemini'): boolean {
    const llm = this.getLLMSettings();
    const settings = provider === 'claude' ? llm.claude : llm.gemini;
    return settings.backend === 'cli';
  }

  /**
   * Check if API key is available for a provider.
   * Checks both settings store and environment variables.
   *
   * @param provider - 'claude', 'gemini', or 'openai'
   * @returns true if API key is available
   */
  static hasApiKey(provider: 'claude' | 'gemini' | 'openai'): boolean {
    // Check settings store
    if (settingsService.hasApiKey(provider)) {
      return true;
    }

    // Check environment variables
    switch (provider) {
      case 'claude':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'gemini':
        return !!(process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY);
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Get backend status summary for all providers.
   * Useful for UI display and debugging.
   *
   * @returns Backend configuration summary
   */
  static getBackendStatus(): {
    claude: { backend: LLMBackend; hasApiKey: boolean };
    gemini: { backend: LLMBackend; hasApiKey: boolean };
    embeddings: { backend: EmbeddingsBackend; hasApiKey: boolean };
  } {
    const llm = this.getLLMSettings();

    return {
      claude: {
        backend: this.mapLLMBackend(llm.claude.backend),
        hasApiKey: this.hasApiKey('claude'),
      },
      gemini: {
        backend: this.mapLLMBackend(llm.gemini.backend),
        hasApiKey: this.hasApiKey('gemini'),
      },
      embeddings: {
        backend: this.mapEmbeddingsBackend(llm.embeddings.backend),
        hasApiKey: this.hasApiKey('openai'),
      },
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a Nexus instance using settings from the settings store.
 *
 * This is the recommended way to create a Nexus instance in the Electron app,
 * as it automatically loads user preferences and handles API key decryption.
 *
 * @param workingDir - Project working directory
 * @returns Promise resolving to fully-wired Nexus instance
 *
 * @example
 * ```typescript
 * import { createNexusFromSettings } from './SettingsLoader';
 *
 * const nexus = await createNexusFromSettings('/path/to/project');
 * await nexus.coordinator.initialize({ projectPath: '/path/to/project' });
 * await nexus.coordinator.start();
 * ```
 */
export async function createNexusFromSettings(workingDir: string): Promise<import('../../NexusFactory').NexusInstance> {
  // Dynamic import to avoid circular dependency
  const { NexusFactory } = await import('../../NexusFactory');
  const config = await SettingsLoader.loadAsFactoryConfig(workingDir);
  return NexusFactory.create(config);
}

/**
 * Create a testing Nexus instance using settings from the settings store.
 *
 * @param workingDir - Project working directory
 * @param options - Additional testing options
 * @returns Promise resolving to Nexus instance optimized for testing
 */
export async function createTestingNexusFromSettings(
  workingDir: string,
  options: { mockQA?: boolean; maxIterations?: number } = {}
): Promise<import('../../NexusFactory').NexusInstance> {
  // Dynamic import to avoid circular dependency
  const { NexusFactory } = await import('../../NexusFactory');
  const config = await SettingsLoader.loadAsFactoryConfig(workingDir);
  return NexusFactory.createForTesting({
    ...config,
    ...options,
  });
}
