/**
 * Config Module Exports
 * Phase 16 Task 16: Config File Support for Technical Users
 *
 * This module provides configuration file support for Nexus,
 * allowing technical users to configure via project-level config files.
 */

// ============================================================================
// Schema Exports
// ============================================================================

export type {
  // Main config file type
  NexusConfigFile,

  // LLM provider configs
  ClaudeConfigFile,
  GeminiConfigFile,
  EmbeddingsConfigFile,

  // Other config sections
  QAConfigFile,
  IterationConfigFile,
  AgentConfigFile,
} from './nexus.config.schema';

export {
  // Default values
  DEFAULT_CONFIG_FILE,

  // Validation
  validateConfigFile,
} from './nexus.config.schema';

// ============================================================================
// Loader Exports
// ============================================================================

export {
  // Main loader class
  ConfigFileLoader,

  // Errors
  ConfigFileError,
  ConfigFileLoadError,

  // Constants
  CONFIG_FILE_NAMES,

  // Convenience functions
  loadAndMergeConfig,
  hasConfigFile,
} from './ConfigFileLoader';
