/**
 * Settings Service - Main Process
 * Phase 12-01: Settings backend infrastructure
 *
 * Provides secure settings storage using:
 * - electron-store for non-sensitive settings (JSON with schema)
 * - safeStorage for API keys (OS-level encryption: Keychain/DPAPI)
 *
 * Security:
 * - API keys encrypted via safeStorage before storage
 * - Never returns raw encrypted values to renderer
 * - Uses hasXxxKey booleans instead of exposing keys
 */

import Store from 'electron-store'
import { safeStorage } from 'electron'
import type {
  NexusSettings,
  NexusSettingsPublic,
  LLMSettings,
  AgentSettings,
  CheckpointSettings,
  UISettings,
  ProjectSettings,
  LLMProvider
} from '../../shared/types/settings'

/**
 * Default settings values
 */
const defaults: NexusSettings = {
  llm: {
    defaultProvider: 'claude',
    defaultModel: 'claude-sonnet-4-20250514',
    fallbackEnabled: true,
    fallbackOrder: ['claude', 'gemini', 'openai']
  },
  agents: {
    maxParallelAgents: 4,
    taskTimeoutMinutes: 30,
    maxRetries: 3,
    autoRetryEnabled: true
  },
  checkpoints: {
    autoCheckpointEnabled: true,
    autoCheckpointIntervalMinutes: 15,
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
    outputDirectory: './output'
  }
}

/**
 * electron-store schema for type-safe storage
 */
const schema = {
  llm: {
    type: 'object' as const,
    properties: {
      claudeApiKeyEncrypted: { type: 'string' as const },
      geminiApiKeyEncrypted: { type: 'string' as const },
      openaiApiKeyEncrypted: { type: 'string' as const },
      defaultProvider: { type: 'string' as const, enum: ['claude', 'gemini', 'openai'] },
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
      autoRetryEnabled: { type: 'boolean' as const }
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
   */
  getAll(): NexusSettingsPublic {
    const llm = this.store.get('llm')
    const agents = this.store.get('agents')
    const checkpoints = this.store.get('checkpoints')
    const ui = this.store.get('ui')
    const project = this.store.get('project')

    return {
      llm: {
        defaultProvider: llm.defaultProvider,
        defaultModel: llm.defaultModel,
        fallbackEnabled: llm.fallbackEnabled,
        fallbackOrder: llm.fallbackOrder,
        hasClaudeKey: !!llm.claudeApiKeyEncrypted,
        hasGeminiKey: !!llm.geminiApiKeyEncrypted,
        hasOpenaiKey: !!llm.openaiApiKeyEncrypted
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
    if (!base64) {
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
