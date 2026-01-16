/**
 * Settings Types - Shared between main and renderer
 * Phase 12-01: Settings backend infrastructure
 *
 * Defines the structure for all Nexus settings, including
 * secure API key storage and user preferences.
 */

/**
 * LLM Provider Settings
 * API keys are stored encrypted via safeStorage
 */
export interface LLMSettings {
  claudeApiKeyEncrypted?: string
  geminiApiKeyEncrypted?: string
  openaiApiKeyEncrypted?: string
  defaultProvider: 'claude' | 'gemini' | 'openai'
  defaultModel: string
  fallbackEnabled: boolean
  fallbackOrder: string[]
}

/**
 * Agent Execution Settings
 * Controls parallelism and retry behavior
 */
export interface AgentSettings {
  maxParallelAgents: number
  taskTimeoutMinutes: number
  maxRetries: number
  autoRetryEnabled: boolean
}

/**
 * Checkpoint Settings
 * Controls automatic checkpoint creation and retention
 */
export interface CheckpointSettings {
  autoCheckpointEnabled: boolean
  autoCheckpointIntervalMinutes: number
  maxCheckpointsToKeep: number
  checkpointOnFeatureComplete: boolean
}

/**
 * UI Preferences
 * User interface customization
 */
export interface UISettings {
  theme: 'light' | 'dark' | 'system'
  sidebarWidth: number
  showNotifications: boolean
  notificationDuration: number
}

/**
 * Project Defaults
 * Default values for new projects
 */
export interface ProjectSettings {
  defaultLanguage: string
  defaultTestFramework: string
  outputDirectory: string
}

/**
 * Complete Nexus Settings
 * Internal storage format with encrypted API keys
 */
export interface NexusSettings {
  llm: LLMSettings
  agents: AgentSettings
  checkpoints: CheckpointSettings
  ui: UISettings
  project: ProjectSettings
}

/**
 * Public Settings View
 * Safe to expose to renderer - no encrypted values
 * Provides hasXxxKey booleans instead of actual keys
 */
export interface NexusSettingsPublic {
  llm: Omit<LLMSettings, 'claudeApiKeyEncrypted' | 'geminiApiKeyEncrypted' | 'openaiApiKeyEncrypted'> & {
    hasClaudeKey: boolean
    hasGeminiKey: boolean
    hasOpenaiKey: boolean
  }
  agents: AgentSettings
  checkpoints: CheckpointSettings
  ui: UISettings
  project: ProjectSettings
}

/**
 * Supported LLM Providers
 */
export type LLMProvider = 'claude' | 'gemini' | 'openai'

/**
 * Settings API interface exposed to renderer
 */
export interface SettingsAPI {
  getAll: () => Promise<NexusSettingsPublic>
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<boolean>
  setApiKey: (provider: LLMProvider, key: string) => Promise<boolean>
  hasApiKey: (provider: LLMProvider) => Promise<boolean>
  clearApiKey: (provider: LLMProvider) => Promise<boolean>
  reset: () => Promise<boolean>
}
