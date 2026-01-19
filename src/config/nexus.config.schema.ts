/**
 * Nexus Config File Schema
 * Phase 16 Task 16: Config File Support for Technical Users
 *
 * This module defines the schema for nexus.config.ts/json files.
 * Config files provide a way for technical users to configure Nexus
 * without using the Settings UI, which is useful for:
 * - CI/CD environments
 * - Version control of configuration
 * - Per-project settings
 * - Team standardization
 *
 * Config File Priority (highest to lowest):
 * 1. Config file in project root (overrides all)
 * 2. Settings store (user preferences from UI)
 * 3. Environment variables
 * 4. Default values
 *
 * Supported file names (in priority order):
 * - nexus.config.ts  (TypeScript)
 * - nexus.config.js  (JavaScript)
 * - nexus.config.json (JSON)
 * - .nexusrc         (JSON)
 * - .nexusrc.json    (JSON)
 */

import type { LLMBackend, EmbeddingsBackend } from '../NexusFactory';
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  LOCAL_EMBEDDING_MODELS,
} from '../llm/models';

// ============================================================================
// LLM Provider Configuration
// ============================================================================

/**
 * Claude CLI/API configuration in config file.
 * API keys should NOT be stored in config files - use env vars or Settings.
 */
export interface ClaudeConfigFile {
  /**
   * Backend to use for Claude.
   * - 'cli': Use Claude Code CLI (default, no API key needed)
   * - 'api': Use Anthropic API (requires ANTHROPIC_API_KEY env var)
   */
  backend?: LLMBackend;

  /**
   * Path to Claude CLI binary.
   * Default: 'claude' (uses PATH)
   */
  cliPath?: string;

  /**
   * Request timeout in milliseconds.
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Maximum retry attempts for transient failures.
   * Default: 2
   */
  maxRetries?: number;

  /**
   * Model to use for Claude API.
   * See src/llm/models.ts for available models.
   * Note: CLI uses its own default model
   */
  model?: string;
}

/**
 * Gemini CLI/API configuration in config file.
 */
export interface GeminiConfigFile {
  /**
   * Backend to use for Gemini.
   * - 'cli': Use Gemini CLI (default, uses gcloud auth)
   * - 'api': Use Google AI API (requires GOOGLE_AI_API_KEY env var)
   */
  backend?: LLMBackend;

  /**
   * Path to Gemini CLI binary.
   * Default: 'gemini' (uses PATH)
   */
  cliPath?: string;

  /**
   * Request timeout in milliseconds.
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Model to use.
   * See src/llm/models.ts for available models.
   */
  model?: string;
}

/**
 * Embeddings configuration in config file.
 */
export interface EmbeddingsConfigFile {
  /**
   * Backend to use for embeddings.
   * - 'local': Use local Transformers.js models (default)
   * - 'api': Use OpenAI API (requires OPENAI_API_KEY env var)
   */
  backend?: EmbeddingsBackend;

  /**
   * Local model to use for embeddings.
   * Default: 'Xenova/all-MiniLM-L6-v2' (384 dimensions)
   *
   * Other options:
   * - 'Xenova/all-mpnet-base-v2' (768 dimensions)
   * - 'Xenova/bge-small-en-v1.5' (384 dimensions)
   */
  localModel?: string;

  /**
   * Embedding dimensions.
   * Should match the model's output dimensions.
   * Default: 384 (MiniLM)
   */
  dimensions?: number;

  /**
   * Enable embedding cache for performance.
   * Default: true
   */
  cacheEnabled?: boolean;

  /**
   * Maximum number of embeddings to cache.
   * Default: 10000
   */
  maxCacheSize?: number;
}

// ============================================================================
// QA Configuration
// ============================================================================

/**
 * QA runner configuration in config file.
 */
export interface QAConfigFile {
  /**
   * Build timeout in milliseconds.
   * Default: 60000 (1 minute)
   */
  buildTimeout?: number;

  /**
   * Lint timeout in milliseconds.
   * Default: 120000 (2 minutes)
   */
  lintTimeout?: number;

  /**
   * Test timeout in milliseconds.
   * Default: 300000 (5 minutes)
   */
  testTimeout?: number;

  /**
   * Enable auto-fix for linting issues.
   * Default: false
   */
  autoFixLint?: boolean;
}

// ============================================================================
// Iteration Configuration
// ============================================================================

/**
 * Iteration/orchestration configuration in config file.
 */
export interface IterationConfigFile {
  /**
   * Maximum iterations before escalation.
   * Default: 50
   */
  maxIterations?: number;

  /**
   * Commit after each iteration.
   * Default: true
   */
  commitEachIteration?: boolean;
}

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Agent pool configuration in config file.
 */
export interface AgentConfigFile {
  /**
   * Maximum concurrent agents per type.
   * Default: { coder: 3, tester: 2, reviewer: 2, merger: 1 }
   */
  maxAgentsByType?: {
    coder?: number;
    tester?: number;
    reviewer?: number;
    merger?: number;
    architect?: number;
    debugger?: number;
    documenter?: number;
  };
}

// ============================================================================
// Main Config File Interface
// ============================================================================

/**
 * Complete Nexus configuration file schema.
 *
 * Create a `nexus.config.ts` file in your project root:
 *
 * @example
 * ```typescript
 * // nexus.config.ts
 * import type { NexusConfigFile } from 'nexus';
 *
 * const config: NexusConfigFile = {
 *   llm: {
 *     claude: {
 *       backend: 'cli',  // Use Claude CLI (default)
 *     },
 *     gemini: {
 *       backend: 'cli',
 *       model: 'gemini-2.5-pro',
 *     },
 *     embeddings: {
 *       backend: 'local',  // Use local embeddings (default)
 *       localModel: 'Xenova/all-MiniLM-L6-v2',
 *     },
 *   },
 *   qa: {
 *     testTimeout: 600000,  // 10 minutes for slow tests
 *     autoFixLint: true,
 *   },
 *   iteration: {
 *     maxIterations: 100,
 *   },
 * };
 *
 * export default config;
 * ```
 *
 * Or use JSON format:
 *
 * @example
 * ```json
 * // nexus.config.json
 * {
 *   "llm": {
 *     "claude": { "backend": "cli" },
 *     "gemini": { "backend": "cli", "model": "gemini-2.5-pro" },
 *     "embeddings": { "backend": "local" }
 *   },
 *   "qa": {
 *     "testTimeout": 600000
 *   }
 * }
 * ```
 *
 * IMPORTANT: Never store API keys in config files!
 * Use environment variables instead:
 * - ANTHROPIC_API_KEY for Claude API
 * - GOOGLE_AI_API_KEY for Gemini API
 * - OPENAI_API_KEY for OpenAI Embeddings API
 */
export interface NexusConfigFile {
  /**
   * LLM provider configuration.
   * Configure Claude, Gemini, and embeddings backends.
   */
  llm?: {
    claude?: ClaudeConfigFile;
    gemini?: GeminiConfigFile;
    embeddings?: EmbeddingsConfigFile;
  };

  /**
   * QA runner configuration.
   * Configure build, lint, and test timeouts.
   */
  qa?: QAConfigFile;

  /**
   * Iteration/orchestration configuration.
   * Configure max iterations and commit behavior.
   */
  iteration?: IterationConfigFile;

  /**
   * Agent pool configuration.
   * Configure maximum concurrent agents per type.
   */
  agents?: AgentConfigFile;

  /**
   * Project-specific overrides.
   * These are passed directly to NexusCoordinator.
   */
  project?: {
    /**
     * Project name (used in logs and checkpoints).
     */
    name?: string;

    /**
     * Project description.
     */
    description?: string;

    /**
     * Custom working directory.
     * Default: Project root (where config file is found)
     */
    workingDir?: string;
  };
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default configuration values.
 * These are used when config file doesn't specify a value.
 */
export const DEFAULT_CONFIG_FILE: Required<NexusConfigFile> = {
  llm: {
    claude: {
      backend: 'cli',
      cliPath: 'claude',
      timeout: 300000,
      maxRetries: 2,
      model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
    },
    gemini: {
      backend: 'cli',
      cliPath: 'gemini',
      timeout: 300000,
      model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
    },
    embeddings: {
      backend: 'local',
      localModel: DEFAULT_LOCAL_EMBEDDING_MODEL, // Xenova/all-MiniLM-L6-v2
      dimensions: LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL].dimensions,
      cacheEnabled: true,
      maxCacheSize: 10000,
    },
  },
  qa: {
    buildTimeout: 60000,
    lintTimeout: 120000,
    testTimeout: 300000,
    autoFixLint: false,
  },
  iteration: {
    maxIterations: 50,
    commitEachIteration: true,
  },
  agents: {
    maxAgentsByType: {
      coder: 3,
      tester: 2,
      reviewer: 2,
      merger: 1,
      architect: 1,
      debugger: 2,
      documenter: 1,
    },
  },
  project: {
    name: '',
    description: '',
    workingDir: '',
  },
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a config file object.
 *
 * @param config - Config file object to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfigFile(config: unknown): string[] {
  const errors: string[] = [];

  if (config === null || typeof config !== 'object') {
    errors.push('Config must be an object');
    return errors;
  }

  const cfg = config as Record<string, unknown>;

  // Validate llm section
  if (cfg.llm !== undefined) {
    if (typeof cfg.llm !== 'object' || cfg.llm === null) {
      errors.push('llm must be an object');
    } else {
      const llm = cfg.llm as Record<string, unknown>;

      // Validate claude
      if (llm.claude !== undefined) {
        if (typeof llm.claude !== 'object' || llm.claude === null) {
          errors.push('llm.claude must be an object');
        } else {
          const claude = llm.claude as Record<string, unknown>;
          if (claude.backend !== undefined && claude.backend !== 'cli' && claude.backend !== 'api') {
            errors.push('llm.claude.backend must be "cli" or "api"');
          }
          if (claude.timeout !== undefined && (typeof claude.timeout !== 'number' || claude.timeout <= 0)) {
            errors.push('llm.claude.timeout must be a positive number');
          }
          if (claude.maxRetries !== undefined && (typeof claude.maxRetries !== 'number' || claude.maxRetries < 0)) {
            errors.push('llm.claude.maxRetries must be a non-negative number');
          }
        }
      }

      // Validate gemini
      if (llm.gemini !== undefined) {
        if (typeof llm.gemini !== 'object' || llm.gemini === null) {
          errors.push('llm.gemini must be an object');
        } else {
          const gemini = llm.gemini as Record<string, unknown>;
          if (gemini.backend !== undefined && gemini.backend !== 'cli' && gemini.backend !== 'api') {
            errors.push('llm.gemini.backend must be "cli" or "api"');
          }
          if (gemini.timeout !== undefined && (typeof gemini.timeout !== 'number' || gemini.timeout <= 0)) {
            errors.push('llm.gemini.timeout must be a positive number');
          }
        }
      }

      // Validate embeddings
      if (llm.embeddings !== undefined) {
        if (typeof llm.embeddings !== 'object' || llm.embeddings === null) {
          errors.push('llm.embeddings must be an object');
        } else {
          const embeddings = llm.embeddings as Record<string, unknown>;
          if (embeddings.backend !== undefined && embeddings.backend !== 'local' && embeddings.backend !== 'api') {
            errors.push('llm.embeddings.backend must be "local" or "api"');
          }
          if (embeddings.dimensions !== undefined && (typeof embeddings.dimensions !== 'number' || embeddings.dimensions <= 0)) {
            errors.push('llm.embeddings.dimensions must be a positive number');
          }
          if (embeddings.maxCacheSize !== undefined && (typeof embeddings.maxCacheSize !== 'number' || embeddings.maxCacheSize < 0)) {
            errors.push('llm.embeddings.maxCacheSize must be a non-negative number');
          }
        }
      }
    }
  }

  // Validate qa section
  if (cfg.qa !== undefined) {
    if (typeof cfg.qa !== 'object' || cfg.qa === null) {
      errors.push('qa must be an object');
    } else {
      const qa = cfg.qa as Record<string, unknown>;
      if (qa.buildTimeout !== undefined && (typeof qa.buildTimeout !== 'number' || qa.buildTimeout <= 0)) {
        errors.push('qa.buildTimeout must be a positive number');
      }
      if (qa.lintTimeout !== undefined && (typeof qa.lintTimeout !== 'number' || qa.lintTimeout <= 0)) {
        errors.push('qa.lintTimeout must be a positive number');
      }
      if (qa.testTimeout !== undefined && (typeof qa.testTimeout !== 'number' || qa.testTimeout <= 0)) {
        errors.push('qa.testTimeout must be a positive number');
      }
    }
  }

  // Validate iteration section
  if (cfg.iteration !== undefined) {
    if (typeof cfg.iteration !== 'object' || cfg.iteration === null) {
      errors.push('iteration must be an object');
    } else {
      const iteration = cfg.iteration as Record<string, unknown>;
      if (iteration.maxIterations !== undefined && (typeof iteration.maxIterations !== 'number' || iteration.maxIterations <= 0)) {
        errors.push('iteration.maxIterations must be a positive number');
      }
    }
  }

  return errors;
}
