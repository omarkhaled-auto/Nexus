/**
 * Settings Service - Main Process
 * Phase 12-01: Settings backend infrastructure
 * Phase 16: Full CLI Support Integration - CLI-first backend selection
 *
 * Provides secure settings storage using:
 * - electron-store for non-sensitive settings (JSON with schema)
 * - safeStorage for API keys (OS-level encryption: Keychain/DPAPI)
 *
 * Security:
 * - API keys encrypted via safeStorage before storage
 * - Never returns raw encrypted values to renderer
 * - Uses hasXxxKey booleans instead of exposing keys
 *
 * Phase 16 Additions:
 * - CLI-first backend selection for Claude and Gemini
 * - Local-first embeddings configuration
 * - Provider-specific settings (cliPath, timeout, model)
 */

import Store from 'electron-store'
import { safeStorage } from 'electron'
import type {
  NexusSettings,
  NexusSettingsPublic,
  LLMProvider,
} from '../../shared/types/settings'
import { DEFAULT_AGENT_MODEL_ASSIGNMENTS } from '../../shared/types/settings'
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  LOCAL_EMBEDDING_MODELS,
} from '../../llm/models'

/**
 * Default settings values
 * Phase 16: Updated with CLI-first defaults and provider-specific settings
 */
const defaults: NexusSettings = {
  llm: {
    // Phase 16: Provider-specific settings with CLI-first defaults
    claude: {
      backend: 'cli',
      timeout: 300000, // 5 minutes
      maxRetries: 2,
      model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    },
    gemini: {
      backend: 'cli',
      timeout: 300000, // 5 minutes
      model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
    },
    embeddings: {
      backend: 'local',
      localModel: DEFAULT_LOCAL_EMBEDDING_MODEL, // Xenova/all-MiniLM-L6-v2
      dimensions: LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL].dimensions,
      cacheEnabled: true,
      maxCacheSize: 10000,
    },
    // Orchestration settings
    defaultProvider: 'claude',
    defaultModel: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    fallbackEnabled: true,
    fallbackOrder: ['claude', 'gemini'],
  },
  agents: {
    maxParallelAgents: 4,
    taskTimeoutMinutes: 30,
    maxRetries: 3,
    autoRetryEnabled: true,
    qaIterationLimit: 50,
    agentModels: DEFAULT_AGENT_MODEL_ASSIGNMENTS,
  },
  checkpoints: {
    autoCheckpointEnabled: true,
    autoCheckpointIntervalMinutes: 5,
    maxCheckpointsToKeep: 10,
    checkpointOnFeatureComplete: true
  },
  ui: {
    theme: 'system',
    sidebarWidth: 280,
    showNotifications: true,
    notificationDuration: 5000
  },
  project: {
    defaultLanguage: 'typescript',
    defaultTestFramework: 'vitest',
    outputDirectory: '.nexus'
  }
}

/**
 * electron-store schema for type-safe storage
 * Phase 16: Updated with provider-specific settings
 */
const schema = {
  llm: {
    type: 'object' as const,
    properties: {
      // Phase 16: Claude provider settings
      claude: {
        type: 'object' as const,
        properties: {
          backend: { type: 'string' as const, enum: ['cli', 'api'] },
          apiKeyEncrypted: { type: 'string' as const },
          cliPath: { type: 'string' as const },
          timeout: { type: 'number' as const, minimum: 1000, maximum: 600000 },
          maxRetries: { type: 'number' as const, minimum: 0, maximum: 10 },
          model: { type: 'string' as const },
        },
        default: defaults.llm.claude,
      },
      // Phase 16: Gemini provider settings
      gemini: {
        type: 'object' as const,
        properties: {
          backend: { type: 'string' as const, enum: ['cli', 'api'] },
          apiKeyEncrypted: { type: 'string' as const },
          cliPath: { type: 'string' as const },
          timeout: { type: 'number' as const, minimum: 1000, maximum: 600000 },
          model: { type: 'string' as const },
        },
        default: defaults.llm.gemini,
      },
      // Phase 16: Embeddings provider settings
      embeddings: {
        type: 'object' as const,
        properties: {
          backend: { type: 'string' as const, enum: ['local', 'api'] },
          apiKeyEncrypted: { type: 'string' as const },
          localModel: { type: 'string' as const },
          dimensions: { type: 'number' as const, minimum: 1 },
          cacheEnabled: { type: 'boolean' as const },
          maxCacheSize: { type: 'number' as const, minimum: 100 },
        },
        default: defaults.llm.embeddings,
      },
      // Legacy API key fields (kept for backwards compatibility)
      claudeApiKeyEncrypted: { type: 'string' as const },
      geminiApiKeyEncrypted: { type: 'string' as const },
      openaiApiKeyEncrypted: { type: 'string' as const },
      // Orchestration settings
      defaultProvider: { type: 'string' as const, enum: ['claude', 'gemini'] },
      defaultModel: { type: 'string' as const },
      fallbackEnabled: { type: 'boolean' as const },
      fallbackOrder: { type: 'array' as const, items: { type: 'string' as const } }
    },
    default: defaults.llm
  },
  agents: {
    type: 'object' as const,
    properties: {
      maxParallelAgents: { type: 'number' as const, minimum: 1, maximum: 10 },
      taskTimeoutMinutes: { type: 'number' as const, minimum: 1, maximum: 120 },
      maxRetries: { type: 'number' as const, minimum: 0, maximum: 10 },
      autoRetryEnabled: { type: 'boolean' as const },
      qaIterationLimit: { type: 'number' as const, minimum: 10, maximum: 100 },
      agentModels: {
        type: 'object' as const,
        properties: {
          planner: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          coder: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          tester: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          reviewer: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          merger: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          architect: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          debugger: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
          documenter: { type: 'object' as const, properties: { provider: { type: 'string' as const }, model: { type: 'string' as const } } },
        },
        default: defaults.agents.agentModels,
      },
    },
    default: defaults.agents
  },
  checkpoints: {
    type: 'object' as const,
    properties: {
      autoCheckpointEnabled: { type: 'boolean' as const },
      autoCheckpointIntervalMinutes: { type: 'number' as const, minimum: 5, maximum: 60 },
      maxCheckpointsToKeep: { type: 'number' as const, minimum: 1, maximum: 50 },
      checkpointOnFeatureComplete: { type: 'boolean' as const }
    },
    default: defaults.checkpoints
  },
  ui: {
    type: 'object' as const,
    properties: {
      theme: { type: 'string' as const, enum: ['light', 'dark', 'system'] },
      sidebarWidth: { type: 'number' as const, minimum: 200, maximum: 500 },
      showNotifications: { type: 'boolean' as const },
      notificationDuration: { type: 'number' as const, minimum: 1000, maximum: 30000 }
    },
    default: defaults.ui
  },
  project: {
    type: 'object' as const,
    properties: {
      defaultLanguage: { type: 'string' as const },
      defaultTestFramework: { type: 'string' as const },
      outputDirectory: { type: 'string' as const }
    },
    default: defaults.project
  }
}

/**
 * Settings Service
 * Manages application settings with secure API key storage
 */
class SettingsService {
  private store: Store<NexusSettings>

  constructor() {
    this.store = new Store<NexusSettings>({
      name: 'nexus-settings',
      schema,
      defaults,
      clearInvalidConfig: true
    })
  }

  /**
   * Get all settings with public view (no encrypted keys)
   * Returns hasXxxKey booleans instead of actual encrypted values
   * Phase 16: Updated to include provider-specific settings
   */
  getAll(): NexusSettingsPublic {
    const llm = this.store.get('llm')
    const agents = this.store.get('agents')
    const checkpoints = this.store.get('checkpoints')
    const ui = this.store.get('ui')
    const project = this.store.get('project')

    // Phase 16: Build provider-specific public views
    const claude = llm.claude ?? defaults.llm.claude
    const gemini = llm.gemini ?? defaults.llm.gemini
    const embeddings = llm.embeddings ?? defaults.llm.embeddings

    return {
      llm: {
        // Phase 16: Provider-specific public views
        claude: {
          backend: claude.backend ?? 'cli',
          hasApiKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
          cliPath: claude.cliPath,
          timeout: claude.timeout,
          maxRetries: claude.maxRetries,
          model: claude.model,
        },
        gemini: {
          backend: gemini.backend ?? 'cli',
          hasApiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
          cliPath: gemini.cliPath,
          timeout: gemini.timeout,
          model: gemini.model,
        },
        embeddings: {
          backend: embeddings.backend ?? 'local',
          hasApiKey: !!embeddings.apiKeyEncrypted || !!llm.openaiApiKeyEncrypted,
          localModel: embeddings.localModel,
          dimensions: embeddings.dimensions,
          cacheEnabled: embeddings.cacheEnabled,
          maxCacheSize: embeddings.maxCacheSize,
        },
        // Orchestration settings
        defaultProvider: llm.defaultProvider ?? 'claude',
        defaultModel: llm.defaultModel ?? DEFAULT_CLAUDE_MODEL,
        fallbackEnabled: llm.fallbackEnabled ?? true,
        fallbackOrder: llm.fallbackOrder ?? ['claude', 'gemini'],
        // Legacy compatibility
        hasClaudeKey: !!claude.apiKeyEncrypted || !!llm.claudeApiKeyEncrypted,
        hasGeminiKey: !!gemini.apiKeyEncrypted || !!llm.geminiApiKeyEncrypted,
        hasOpenaiKey: !!embeddings.apiKeyEncrypted || !!llm.openaiApiKeyEncrypted,
      },
      agents,
      checkpoints,
      ui,
      project
    }
  }

  /**
   * Get a single setting by dot-notation path
   * @param key - Dot-notation path (e.g., 'llm.defaultProvider')
   * @returns The setting value or undefined
   */
  get(key: string): unknown {
    // Prevent access to encrypted API keys through get()
    if (key.includes('ApiKeyEncrypted')) {
      console.warn('Cannot access encrypted API keys via get(). Use hasApiKey() instead.')
      return undefined
    }
    return this.store.get(key)
  }

  /**
   * Set a single setting by dot-notation path
   * @param key - Dot-notation path (e.g., 'ui.theme')
   * @param value - The value to set
   */
  set(key: string, value: unknown): void {
    // Prevent setting encrypted API keys through set()
    if (key.includes('ApiKeyEncrypted')) {
      console.warn('Cannot set encrypted API keys via set(). Use setApiKey() instead.')
      return
    }
    this.store.set(key, value)
  }

  /**
   * Securely set an API key using OS-level encryption
   * @param provider - The LLM provider ('claude', 'gemini', or 'openai')
   * @param plainKey - The plain text API key
   * @returns true if successful, false if encryption unavailable
   */
  setApiKey(provider: LLMProvider, plainKey: string): boolean {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('safeStorage encryption not available on this system')
      return false
    }

    try {
      const encrypted = safeStorage.encryptString(plainKey)
      const base64 = encrypted.toString('base64')
      this.store.set(`llm.${provider}ApiKeyEncrypted`, base64)
      return true
    } catch (error) {
      console.error(`Failed to encrypt ${provider} API key:`, error)
      return false
    }
  }

  /**
   * Get a decrypted API key
   * @param provider - The LLM provider
   * @returns The decrypted API key or null if not set/unavailable
   */
  getApiKey(provider: LLMProvider): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('safeStorage encryption not available on this system')
      return null
    }

    const base64 = this.store.get(`llm.${provider}ApiKeyEncrypted`)
    if (!base64 || typeof base64 !== 'string') {
      return null
    }

    try {
      const encrypted = Buffer.from(base64, 'base64')
      return safeStorage.decryptString(encrypted)
    } catch (error) {
      console.error(`Failed to decrypt ${provider} API key:`, error)
      return null
    }
  }

  /**
   * Check if an API key is set for a provider
   * @param provider - The LLM provider
   * @returns true if a key is stored
   */
  hasApiKey(provider: LLMProvider): boolean {
    const key = this.store.get(`llm.${provider}ApiKeyEncrypted`)
    return !!key
  }

  /**
   * Clear an API key for a provider
   * @param provider - The LLM provider
   */
  clearApiKey(provider: LLMProvider): void {
    this.store.delete(`llm.${provider}ApiKeyEncrypted` as keyof NexusSettings)
  }

  /**
   * Reset all settings to defaults
   * This also clears all API keys
   */
  reset(): void {
    this.store.clear()
  }

  /**
   * Get the path to the settings file
   * Useful for debugging
   */
  getStorePath(): string {
    return this.store.path
  }
}

/**
 * Singleton instance
 */
export const settingsService = new SettingsService()
