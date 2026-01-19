/**
 * Example Nexus Configuration File
 *
 * Copy this file to your project root as `nexus.config.ts` to customize Nexus behavior.
 * Alternatively, use `nexus.config.json` for JSON format.
 *
 * Configuration Priority (highest to lowest):
 * 1. Config file (this file) - highest priority
 * 2. Settings UI (Electron app preferences)
 * 3. Environment variables
 * 4. Default values
 *
 * SECURITY NOTE: Never store API keys in config files!
 * Use environment variables instead:
 * - ANTHROPIC_API_KEY for Claude API
 * - GOOGLE_AI_API_KEY for Gemini API
 * - OPENAI_API_KEY for OpenAI Embeddings API
 *
 * @example Copy to project root:
 * ```bash
 * cp nexus.config.example.ts nexus.config.ts
 * ```
 */

import type { NexusConfigFile } from './src/config';

const config: NexusConfigFile = {
  // ===========================================================================
  // LLM Configuration
  // ===========================================================================
  llm: {
    // -------------------------------------------------------------------------
    // Claude Configuration
    // -------------------------------------------------------------------------
    claude: {
      // Backend: 'cli' (default) or 'api'
      // - 'cli': Uses Claude Code CLI (no API key needed, must be installed)
      // - 'api': Uses Anthropic API (requires ANTHROPIC_API_KEY env var)
      backend: 'cli',

      // Path to Claude CLI binary (default: 'claude' uses PATH)
      // cliPath: '/usr/local/bin/claude',

      // Request timeout in milliseconds (default: 300000 = 5 minutes)
      timeout: 300000,

      // Maximum retry attempts (default: 2)
      maxRetries: 2,

      // Model for API mode (default: 'claude-sonnet-4-20250514')
      // model: 'claude-sonnet-4-20250514',
    },

    // -------------------------------------------------------------------------
    // Gemini Configuration
    // -------------------------------------------------------------------------
    gemini: {
      // Backend: 'cli' (default) or 'api'
      // - 'cli': Uses Gemini CLI (uses gcloud auth, must be installed)
      // - 'api': Uses Google AI API (requires GOOGLE_AI_API_KEY env var)
      backend: 'cli',

      // Path to Gemini CLI binary (default: 'gemini' uses PATH)
      // cliPath: '/usr/local/bin/gemini',

      // Model to use (default: 'gemini-2.5-pro')
      model: 'gemini-2.5-pro',

      // Request timeout in milliseconds (default: 300000 = 5 minutes)
      timeout: 300000,
    },

    // -------------------------------------------------------------------------
    // Embeddings Configuration
    // -------------------------------------------------------------------------
    embeddings: {
      // Backend: 'local' (default) or 'api'
      // - 'local': Uses Transformers.js with local models (no API key needed)
      // - 'api': Uses OpenAI API (requires OPENAI_API_KEY env var)
      backend: 'local',

      // Local model to use (default: 'Xenova/all-MiniLM-L6-v2')
      // Other options:
      // - 'Xenova/all-mpnet-base-v2' (768 dimensions, better quality)
      // - 'Xenova/bge-small-en-v1.5' (384 dimensions, multilingual)
      localModel: 'Xenova/all-MiniLM-L6-v2',

      // Embedding dimensions (must match model, default: 384 for MiniLM)
      dimensions: 384,

      // Enable embedding cache (default: true)
      cacheEnabled: true,

      // Maximum cached embeddings (default: 10000)
      maxCacheSize: 10000,
    },
  },

  // ===========================================================================
  // QA Configuration
  // ===========================================================================
  qa: {
    // Build timeout in milliseconds (default: 60000 = 1 minute)
    buildTimeout: 60000,

    // Lint timeout in milliseconds (default: 120000 = 2 minutes)
    lintTimeout: 120000,

    // Test timeout in milliseconds (default: 300000 = 5 minutes)
    // Increase for slow test suites
    testTimeout: 300000,

    // Auto-fix lint issues when possible (default: false)
    autoFixLint: false,
  },

  // ===========================================================================
  // Iteration Configuration
  // ===========================================================================
  iteration: {
    // Maximum iterations before escalation (default: 50)
    // Increase for complex projects, decrease for quick fixes
    maxIterations: 50,

    // Commit after each iteration (default: true)
    // Useful for debugging and recovery
    commitEachIteration: true,
  },

  // ===========================================================================
  // Agent Configuration
  // ===========================================================================
  agents: {
    // Maximum concurrent agents per type
    maxAgentsByType: {
      coder: 3,      // Code generation agents
      tester: 2,     // Test writing agents
      reviewer: 2,   // Code review agents
      merger: 1,     // Git merge agents
      architect: 1,  // Architecture planning agents
      debugger: 2,   // Debugging agents
      documenter: 1, // Documentation agents
    },
  },

  // ===========================================================================
  // Project Configuration (optional)
  // ===========================================================================
  // project: {
  //   name: 'My Project',
  //   description: 'A description of the project',
  //   workingDir: '/path/to/project',  // Override auto-detected working dir
  // },
};

export default config;
