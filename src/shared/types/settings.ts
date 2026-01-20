/**
 * Settings Types - Shared between main and renderer
 * Phase 12-01: Settings backend infrastructure
 * Phase 16: Full CLI Support Integration - CLI-first backend selection
 * Phase 16 Finalization: Model constants centralization
 *
 * Defines the structure for all Nexus settings, including
 * secure API key storage and user preferences.
 */

import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  LOCAL_EMBEDDING_MODELS,
} from '../../llm/models';

// ============================================================================
// Backend Type Definitions (Phase 16)
// ============================================================================

/**
 * Backend type for LLM clients.
 * - 'cli': Use CLI binary (requires installation, but no API key needed)
 * - 'api': Use direct API calls (requires API key)
 *
 * Default: 'cli' (CLI-first philosophy)
 */
export type LLMBackendType = 'cli' | 'api';

/**
 * Backend type for embeddings service.
 * - 'local': Use local transformer models via Transformers.js (no API key needed)
 * - 'api': Use OpenAI embeddings API (requires API key)
 *
 * Default: 'local' (local-first philosophy)
 */
export type EmbeddingsBackendType = 'local' | 'api';

// ============================================================================
// LLM Provider Settings (Phase 16: Updated)
// ============================================================================

/**
 * Claude Provider Settings
 * Supports both CLI and API backends
 */
export interface ClaudeProviderSettings {
  /** Backend to use: 'cli' (default) or 'api' */
  backend: LLMBackendType;
  /** API key (encrypted) - required when backend='api' */
  apiKeyEncrypted?: string;
  /** Path to Claude CLI binary (default: 'claude' in PATH) */
  cliPath?: string;
  /** Request timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Maximum retry attempts (default: 2) */
  maxRetries?: number;
  /** Model to use - see src/llm/models.ts for available models */
  model?: string;
}

/**
 * Gemini Provider Settings
 * Supports both CLI and API backends
 */
export interface GeminiProviderSettings {
  /** Backend to use: 'cli' (default) or 'api' */
  backend: LLMBackendType;
  /** API key (encrypted) - required when backend='api' */
  apiKeyEncrypted?: string;
  /** Path to Gemini CLI binary (default: 'gemini' in PATH) */
  cliPath?: string;
  /** Request timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Model to use - see src/llm/models.ts for available models */
  model?: string;
}

/**
 * Embeddings Provider Settings
 * Supports both local and API backends
 */
export interface EmbeddingsProviderSettings {
  /** Backend to use: 'local' (default) or 'api' */
  backend: EmbeddingsBackendType;
  /** OpenAI API key (encrypted) - required when backend='api' */
  apiKeyEncrypted?: string;
  /** Local model to use (default: 'Xenova/all-MiniLM-L6-v2') */
  localModel?: string;
  /** Embedding dimensions (auto-detected from model if not set) */
  dimensions?: number;
  /** Enable embedding cache (default: true) */
  cacheEnabled?: boolean;
  /** Maximum cache size (default: 10000) */
  maxCacheSize?: number;
}

/**
 * LLM Provider Settings - Phase 16 Updated
 * Includes backend preferences for each provider
 * API keys are stored encrypted via safeStorage
 */
export interface LLMSettings {
  /** Claude provider settings (CLI-first) */
  claude: ClaudeProviderSettings;
  /** Gemini provider settings (CLI-first) */
  gemini: GeminiProviderSettings;
  /** Embeddings provider settings (local-first) */
  embeddings: EmbeddingsProviderSettings;
  /** Default provider for orchestration */
  defaultProvider: 'claude' | 'gemini';
  /** Default model (provider-specific) */
  defaultModel: string;
  /** Enable automatic fallback when primary backend fails */
  fallbackEnabled: boolean;
  /** Fallback order for providers */
  fallbackOrder: string[];
  // Legacy fields for backwards compatibility (Phase 12)
  /** @deprecated Use claude.apiKeyEncrypted instead */
  claudeApiKeyEncrypted?: string;
  /** @deprecated Use gemini.apiKeyEncrypted instead */
  geminiApiKeyEncrypted?: string;
  /** @deprecated Use embeddings.apiKeyEncrypted instead */
  openaiApiKeyEncrypted?: string;
}

// ============================================================================
// Per-Agent Model Configuration (Phase 17B)
// ============================================================================

/**
 * Agent types that can have individual model configurations
 */
export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger' | 'architect' | 'debugger' | 'documenter';

/**
 * Provider type for agent model configuration
 */
export type AgentProviderType = 'claude' | 'gemini';

/**
 * Configuration for a single agent's model assignment
 */
export interface AgentModelConfig {
  /** Provider to use for this agent */
  provider: AgentProviderType;
  /** Model ID to use (from models.ts) */
  model: string;
}

/**
 * Per-agent model assignments
 * Each agent type can be configured with its own provider and model
 */
export interface AgentModelAssignments {
  planner: AgentModelConfig;
  coder: AgentModelConfig;
  tester: AgentModelConfig;
  reviewer: AgentModelConfig;
  merger: AgentModelConfig;
  architect: AgentModelConfig;
  debugger: AgentModelConfig;
  documenter: AgentModelConfig;
}

/**
 * Agent Execution Settings
 * Controls parallelism, retry behavior, and per-agent model assignments
 */
export interface AgentSettings {
  maxParallelAgents: number
  taskTimeoutMinutes: number
  maxRetries: number
  autoRetryEnabled: boolean
  /** QA iteration limit before escalating to human */
  qaIterationLimit: number
  /** Per-agent model assignments */
  agentModels: AgentModelAssignments
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

// ============================================================================
// Public Settings View (Phase 16 Updated)
// ============================================================================

/**
 * Claude Provider Settings - Public view (no encrypted values)
 */
export interface ClaudeProviderSettingsPublic {
  backend: LLMBackendType;
  hasApiKey: boolean;
  cliPath?: string;
  timeout?: number;
  maxRetries?: number;
  model?: string;
}

/**
 * Gemini Provider Settings - Public view (no encrypted values)
 */
export interface GeminiProviderSettingsPublic {
  backend: LLMBackendType;
  hasApiKey: boolean;
  cliPath?: string;
  timeout?: number;
  model?: string;
}

/**
 * Embeddings Provider Settings - Public view (no encrypted values)
 */
export interface EmbeddingsProviderSettingsPublic {
  backend: EmbeddingsBackendType;
  hasApiKey: boolean;
  localModel?: string;
  dimensions?: number;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
}

/**
 * LLM Settings - Public view (no encrypted values)
 */
export interface LLMSettingsPublic {
  claude: ClaudeProviderSettingsPublic;
  gemini: GeminiProviderSettingsPublic;
  embeddings: EmbeddingsProviderSettingsPublic;
  defaultProvider: 'claude' | 'gemini';
  defaultModel: string;
  fallbackEnabled: boolean;
  fallbackOrder: string[];
  // Legacy compatibility
  hasClaudeKey: boolean;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
}

/**
 * Public Settings View
 * Safe to expose to renderer - no encrypted values
 * Provides hasXxxKey booleans instead of actual keys
 */
export interface NexusSettingsPublic {
  llm: LLMSettingsPublic;
  agents: AgentSettings;
  checkpoints: CheckpointSettings;
  ui: UISettings;
  project: ProjectSettings;
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
  /** Check if CLI is available for a provider (Phase 17B) */
  checkCliAvailability: (provider: 'claude' | 'gemini') => Promise<{ detected: boolean; message: string }>
}

// ============================================================================
// Default Settings Values (Phase 16)
// ============================================================================

/**
 * Default Claude Provider Settings
 * CLI-first: Uses CLI by default, API as fallback
 */
export const DEFAULT_CLAUDE_SETTINGS: ClaudeProviderSettings = {
  backend: 'cli',
  timeout: 300000, // 5 minutes
  maxRetries: 2,
  model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
};

/**
 * Default Gemini Provider Settings
 * CLI-first: Uses CLI by default, API as fallback
 */
export const DEFAULT_GEMINI_SETTINGS: GeminiProviderSettings = {
  backend: 'cli',
  timeout: 300000, // 5 minutes
  model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
};

/**
 * Default Embeddings Provider Settings
 * Local-first: Uses local transformers.js by default, OpenAI API as fallback
 */
export const DEFAULT_EMBEDDINGS_SETTINGS: EmbeddingsProviderSettings = {
  backend: 'local',
  localModel: DEFAULT_LOCAL_EMBEDDING_MODEL, // Xenova/all-MiniLM-L6-v2
  dimensions: LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL].dimensions,
  cacheEnabled: true,
  maxCacheSize: 10000,
};

/**
 * Default LLM Settings
 * CLI-first and local-first philosophy
 */
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  claude: DEFAULT_CLAUDE_SETTINGS,
  gemini: DEFAULT_GEMINI_SETTINGS,
  embeddings: DEFAULT_EMBEDDINGS_SETTINGS,
  defaultProvider: 'claude',
  defaultModel: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
  fallbackEnabled: true,
  fallbackOrder: ['claude', 'gemini'],
};

/**
 * Default Per-Agent Model Assignments
 * Optimized model selection per agent type:
 * - Planner/Architect: Use more capable models (Opus) for complex planning
 * - Coder/Tester/Merger/Debugger: Use balanced models (Sonnet) for implementation
 * - Reviewer: Use Gemini Pro for diverse code review perspective
 * - Documenter: Use Gemini Flash for fast documentation generation
 */
export const DEFAULT_AGENT_MODEL_ASSIGNMENTS: AgentModelAssignments = {
  planner: { provider: 'claude', model: 'claude-opus-4-5-20251101' },
  coder: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  tester: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  reviewer: { provider: 'gemini', model: 'gemini-2.5-pro' },
  merger: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  architect: { provider: 'claude', model: 'claude-opus-4-5-20251101' },
  debugger: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  documenter: { provider: 'gemini', model: 'gemini-2.5-flash' },
};

/**
 * Default Agent Settings
 */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  maxParallelAgents: 4,
  taskTimeoutMinutes: 30,
  maxRetries: 3,
  autoRetryEnabled: true,
  qaIterationLimit: 50,
  agentModels: DEFAULT_AGENT_MODEL_ASSIGNMENTS,
};

/**
 * Default Checkpoint Settings
 */
export const DEFAULT_CHECKPOINT_SETTINGS: CheckpointSettings = {
  autoCheckpointEnabled: true,
  autoCheckpointIntervalMinutes: 5,
  maxCheckpointsToKeep: 10,
  checkpointOnFeatureComplete: true,
};

/**
 * Default UI Settings
 */
export const DEFAULT_UI_SETTINGS: UISettings = {
  theme: 'system',
  sidebarWidth: 280,
  showNotifications: true,
  notificationDuration: 5000,
};

/**
 * Default Project Settings
 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultLanguage: 'typescript',
  defaultTestFramework: 'vitest',
  outputDirectory: '.nexus',
};

/**
 * Complete Default Settings
 */
export const DEFAULT_NEXUS_SETTINGS: NexusSettings = {
  llm: DEFAULT_LLM_SETTINGS,
  agents: DEFAULT_AGENT_SETTINGS,
  checkpoints: DEFAULT_CHECKPOINT_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  project: DEFAULT_PROJECT_SETTINGS,
};
