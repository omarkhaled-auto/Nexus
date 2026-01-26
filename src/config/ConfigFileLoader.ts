/**
 * ConfigFileLoader - Load and merge Nexus configuration files
 * Phase 16 Task 16: Config File Support for Technical Users
 *
 * This service loads configuration from project-level config files,
 * allowing technical users to configure Nexus without using the Settings UI.
 *
 * Supported config files (checked in order):
 * 1. nexus.config.ts  - TypeScript config (recommended)
 * 2. nexus.config.js  - JavaScript config
 * 3. nexus.config.json - JSON config
 * 4. .nexusrc         - JSON config (dotfile style)
 * 5. .nexusrc.json    - JSON config (explicit JSON dotfile)
 *
 * Config file takes precedence over Settings UI but NOT over environment variables
 * for sensitive values like API keys.
 *
 * @example
 * ```typescript
 * // Load config and merge with settings
 * const configFile = await ConfigFileLoader.load('/path/to/project');
 * const finalConfig = ConfigFileLoader.mergeWithFactoryConfig(settingsConfig, configFile);
 * const nexus = await NexusFactory.create(finalConfig);
 * ```
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import type { NexusFactoryConfig } from '../NexusFactory';
import type { NexusConfigFile } from './nexus.config.schema';
import { validateConfigFile } from './nexus.config.schema';

// ============================================================================
// Constants
// ============================================================================

/**
 * Config file names to search for, in priority order.
 * First match wins.
 */
export const CONFIG_FILE_NAMES = [
  'nexus.config.ts',
  'nexus.config.js',
  'nexus.config.mjs',
  'nexus.config.cjs',
  'nexus.config.json',
  '.nexusrc',
  '.nexusrc.json',
] as const;

/**
 * File extensions that require dynamic import (TypeScript/JavaScript).
 */
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'];

/**
 * File extensions that are JSON format.
 */
const JSON_EXTENSIONS = ['.json', ''];  // Empty string for .nexusrc

// ============================================================================
// Errors
// ============================================================================

/**
 * Error thrown when config file is invalid.
 */
export class ConfigFileError extends Error {
  public readonly originalCause?: Error;

  constructor(
    public readonly filePath: string,
    public readonly errors: string[],
    cause?: Error
  ) {
    super(
      `Invalid config file: ${filePath}\n\nErrors:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      `See documentation for valid config file format: https://nexus-docs.dev/config`
    );
    this.name = 'ConfigFileError';
    this.originalCause = cause;
  }
}

/**
 * Error thrown when config file cannot be loaded.
 */
export class ConfigFileLoadError extends Error {
  public readonly originalCause: Error;

  constructor(
    public readonly filePath: string,
    cause: Error
  ) {
    super(
      `Failed to load config file: ${filePath}\n\n` +
      `Reason: ${cause.message}\n\n` +
      `If using TypeScript, ensure ts-node or tsx is available, or use JSON format instead.`
    );
    this.name = 'ConfigFileLoadError';
    this.originalCause = cause;
  }
}

// ============================================================================
// ConfigFileLoader Class
// ============================================================================

/**
 * Loader for Nexus configuration files.
 *
 * Searches for config files in the project root and loads them,
 * validating the content and converting to NexusFactoryConfig format.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static loader groups config helpers.
export class ConfigFileLoader {
  /**
   * Load config file from project root.
   *
   * Searches for config files in priority order and returns the first one found.
   * If no config file exists, returns null.
   *
   * @param projectRoot - Root directory to search for config files
   * @returns Parsed config file or null if not found
   * @throws ConfigFileError if config file is invalid
   * @throws ConfigFileLoadError if config file cannot be loaded
   */
  static async load(projectRoot: string): Promise<NexusConfigFile | null> {
    const resolvedRoot = resolve(projectRoot);

    // Search for config files in priority order
    for (const filename of CONFIG_FILE_NAMES) {
      const filePath = join(resolvedRoot, filename);

      if (existsSync(filePath)) {
        return this.loadFile(filePath, filename);
      }
    }

    // No config file found - this is expected for projects without config files
    console.debug(`[ConfigFileLoader] No config file found in ${resolvedRoot}`);
    return null;
  }

  /**
   * Load a specific config file.
   *
   * @param filePath - Full path to config file
   * @param filename - Filename (for determining parser)
   * @returns Parsed and validated config
   */
  private static async loadFile(filePath: string, filename: string): Promise<NexusConfigFile> {
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';

    let config: unknown;

    if (SCRIPT_EXTENSIONS.includes(ext)) {
      // Load TypeScript/JavaScript config
      config = await this.loadScriptConfig(filePath);
    } else if (JSON_EXTENSIONS.includes(ext) || filename === '.nexusrc') {
      // Load JSON config
      config = this.loadJsonConfig(filePath);
    } else {
      throw new ConfigFileLoadError(
        filePath,
        new Error(`Unsupported config file extension: ${ext}`)
      );
    }

    // Validate config
    const errors = validateConfigFile(config);
    if (errors.length > 0) {
      throw new ConfigFileError(filePath, errors);
    }

    return config as NexusConfigFile;
  }

  /**
   * Load TypeScript/JavaScript config file using dynamic import.
   */
  private static async loadScriptConfig(filePath: string): Promise<unknown> {
    try {
      // Convert to file URL for dynamic import compatibility
      const fileUrl = pathToFileURL(filePath).href;

      // Try dynamic import
      // Note: This requires ts-node, tsx, or ESM support for TypeScript files
      const module = (await import(fileUrl)) as { default?: unknown };

      // Handle both default export and named export
      return module.default ?? module;
    } catch (error) {
      throw new ConfigFileLoadError(filePath, error as Error);
    }
  }

  /**
   * Load JSON config file.
   */
  private static loadJsonConfig(filePath: string): unknown {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new ConfigFileLoadError(filePath, error as Error);
    }
  }

  /**
   * Find config file path without loading it.
   * Useful for checking if a config file exists.
   *
   * @param projectRoot - Root directory to search
   * @returns Config file path or null if not found
   */
  static findConfigFile(projectRoot: string): string | null {
    const resolvedRoot = resolve(projectRoot);

    for (const filename of CONFIG_FILE_NAMES) {
      const filePath = join(resolvedRoot, filename);

      if (existsSync(filePath)) {
        return filePath;
      }
    }

    // No config file found - this is normal for projects without config files
    console.debug(`[ConfigFileLoader] findConfigFile: No config file found in ${resolvedRoot}`);
    return null;
  }

  /**
   * Merge config file with NexusFactoryConfig.
   *
   * Config file values take precedence over settings values.
   * However, API keys are NEVER read from config files for security -
   * they must come from environment variables or Settings UI.
   *
   * @param settings - Configuration from Settings store
   * @param configFile - Configuration from config file (null if not found)
   * @returns Merged configuration
   */
  static mergeWithFactoryConfig(
    settings: Partial<NexusFactoryConfig>,
    configFile: NexusConfigFile | null
  ): Partial<NexusFactoryConfig> {
    if (!configFile) {
      return settings;
    }

    // Start with settings as base
    const merged: Partial<NexusFactoryConfig> = { ...settings };

    // Merge LLM configuration
    if (configFile.llm) {
      // Claude
      if (configFile.llm.claude) {
        merged.claudeBackend = configFile.llm.claude.backend ?? merged.claudeBackend;
        merged.claudeCliConfig = {
          ...merged.claudeCliConfig,
          ...(configFile.llm.claude.cliPath && { claudePath: configFile.llm.claude.cliPath }),
          ...(configFile.llm.claude.timeout && { timeout: configFile.llm.claude.timeout }),
          ...(configFile.llm.claude.maxRetries && { maxRetries: configFile.llm.claude.maxRetries }),
        };
        // Note: claudeApiKey is NOT merged from config file (security)
        // Note: model is set per-request, not in config
      }

      // Gemini
      if (configFile.llm.gemini) {
        merged.geminiBackend = configFile.llm.gemini.backend ?? merged.geminiBackend;
        merged.geminiCliConfig = {
          ...merged.geminiCliConfig,
          ...(configFile.llm.gemini.cliPath && { cliPath: configFile.llm.gemini.cliPath }),
          ...(configFile.llm.gemini.timeout && { timeout: configFile.llm.gemini.timeout }),
          ...(configFile.llm.gemini.model && { model: configFile.llm.gemini.model }),
        };
        // Note: geminiApiKey is NOT merged from config file (security)
      }

      // Embeddings
      if (configFile.llm.embeddings) {
        merged.embeddingsBackend = configFile.llm.embeddings.backend ?? merged.embeddingsBackend;
        merged.localEmbeddingsConfig = {
          ...merged.localEmbeddingsConfig,
          ...(configFile.llm.embeddings.localModel && { model: configFile.llm.embeddings.localModel }),
          ...(configFile.llm.embeddings.dimensions && { dimensions: configFile.llm.embeddings.dimensions }),
          ...(configFile.llm.embeddings.cacheEnabled !== undefined && { cacheEnabled: configFile.llm.embeddings.cacheEnabled }),
          ...(configFile.llm.embeddings.maxCacheSize && { maxCacheSize: configFile.llm.embeddings.maxCacheSize }),
        };
        // Note: openaiApiKey is NOT merged from config file (security)
      }
    }

    // Merge QA configuration
    if (configFile.qa) {
      merged.qaConfig = {
        ...merged.qaConfig,
        ...(configFile.qa.buildTimeout && { buildTimeout: configFile.qa.buildTimeout }),
        ...(configFile.qa.lintTimeout && { lintTimeout: configFile.qa.lintTimeout }),
        ...(configFile.qa.testTimeout && { testTimeout: configFile.qa.testTimeout }),
        ...(configFile.qa.autoFixLint !== undefined && { autoFixLint: configFile.qa.autoFixLint }),
      };
    }

    // Merge iteration configuration
    if (configFile.iteration) {
      merged.iterationConfig = {
        ...merged.iterationConfig,
        ...(configFile.iteration.maxIterations && { maxIterations: configFile.iteration.maxIterations }),
        ...(configFile.iteration.commitEachIteration !== undefined && { commitEachIteration: configFile.iteration.commitEachIteration }),
      };
    }

    // Merge agent configuration
    if (configFile.agents?.maxAgentsByType) {
      merged.maxAgentsByType = {
        ...merged.maxAgentsByType,
        ...configFile.agents.maxAgentsByType,
      };
    }

    // Merge project configuration
    if (configFile.project) {
      if (configFile.project.workingDir) {
        merged.workingDir = configFile.project.workingDir;
      }
      // name and description are handled by coordinator, not factory config
    }

    return merged;
  }

  /**
   * Get config file info for status display.
   *
   * @param projectRoot - Root directory to search
   * @returns Info about config file or null if not found
   */
  static getConfigFileInfo(projectRoot: string): {
    path: string;
    filename: string;
    format: 'typescript' | 'javascript' | 'json';
  } | null {
    const filePath = this.findConfigFile(projectRoot);
    if (!filePath) {
      return null;
    }

    const filename = filePath.split(/[/\\]/).pop() || '';
    let format: 'typescript' | 'javascript' | 'json';

    if (filename.endsWith('.ts')) {
      format = 'typescript';
    } else if (filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs')) {
      format = 'javascript';
    } else {
      format = 'json';
    }

    return { path: filePath, filename, format };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Load config file and merge with settings to create NexusFactoryConfig.
 *
 * This is a convenience function that combines:
 * 1. Loading the config file from project root
 * 2. Merging it with settings-based config
 *
 * @param projectRoot - Project root directory
 * @param settingsConfig - Configuration from Settings store
 * @returns Merged configuration ready for NexusFactory.create()
 */
export async function loadAndMergeConfig(
  projectRoot: string,
  settingsConfig: Partial<NexusFactoryConfig>
): Promise<Partial<NexusFactoryConfig>> {
  const configFile = await ConfigFileLoader.load(projectRoot);
  return ConfigFileLoader.mergeWithFactoryConfig(settingsConfig, configFile);
}

/**
 * Check if a config file exists in the project.
 *
 * @param projectRoot - Project root directory
 * @returns true if a config file exists
 */
export function hasConfigFile(projectRoot: string): boolean {
  return ConfigFileLoader.findConfigFile(projectRoot) !== null;
}
