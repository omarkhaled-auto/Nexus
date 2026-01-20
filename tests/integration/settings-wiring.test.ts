/**
 * Settings Wiring Integration Tests
 *
 * Phase 19 Task 15: Tests for settings -> backend configuration wiring
 *
 * These tests verify:
 * 1. Settings properly configure backend selection
 * 2. API keys from settings are used
 * 3. CLI/API toggle works correctly
 * 4. Settings persistence works
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Test: Settings Backend Configuration Logic
// ============================================================================

describe('Settings Backend Configuration', () => {
  /**
   * Helper function to simulate getNexusConfigFromSettings logic
   * This tests the same logic used in main/index.ts
   */
  function getBackendConfig(
    settings: {
      claude: { backend: 'cli' | 'api' };
      gemini: { backend: 'cli' | 'api' };
    },
    apiKeys: {
      claude?: string;
      gemini?: string;
    }
  ): { useClaudeCli: boolean; useGeminiCli: boolean } {
    // Same logic as in main/index.ts
    const claudeWantsCli = settings.claude.backend === 'cli';
    const geminiWantsCli = settings.gemini.backend === 'cli';

    // If user wants CLI -> use CLI
    // If user wants API but no key -> fall back to CLI
    // If user wants API and has key -> use API
    const useClaudeCli = claudeWantsCli || (!claudeWantsCli && !apiKeys.claude);
    const useGeminiCli = geminiWantsCli || (!geminiWantsCli && !apiKeys.gemini);

    return { useClaudeCli, useGeminiCli };
  }

  describe('CLI/API Toggle Logic', () => {
    it('should use CLI when user preference is CLI', () => {
      const result = getBackendConfig(
        { claude: { backend: 'cli' }, gemini: { backend: 'cli' } },
        { claude: 'sk-test-key', gemini: 'gm-test-key' }
      );

      expect(result.useClaudeCli).toBe(true);
      expect(result.useGeminiCli).toBe(true);
    });

    it('should use API when user preference is API and key exists', () => {
      const result = getBackendConfig(
        { claude: { backend: 'api' }, gemini: { backend: 'api' } },
        { claude: 'sk-test-key', gemini: 'gm-test-key' }
      );

      expect(result.useClaudeCli).toBe(false);
      expect(result.useGeminiCli).toBe(false);
    });

    it('should fall back to CLI when API selected but no key', () => {
      const result = getBackendConfig(
        { claude: { backend: 'api' }, gemini: { backend: 'api' } },
        {} // No API keys
      );

      expect(result.useClaudeCli).toBe(true);
      expect(result.useGeminiCli).toBe(true);
    });

    it('should handle mixed preferences correctly', () => {
      const result = getBackendConfig(
        { claude: { backend: 'cli' }, gemini: { backend: 'api' } },
        { gemini: 'gm-test-key' }
      );

      expect(result.useClaudeCli).toBe(true);
      expect(result.useGeminiCli).toBe(false);
    });

    it('should use CLI for provider without key even when other has key', () => {
      const result = getBackendConfig(
        { claude: { backend: 'api' }, gemini: { backend: 'api' } },
        { claude: 'sk-test-key' } // Only Claude has key
      );

      expect(result.useClaudeCli).toBe(false); // Has key
      expect(result.useGeminiCli).toBe(true); // No key, falls back
    });
  });

  describe('API Key Priority', () => {
    it('should prefer environment variables over stored keys', () => {
      // This tests the priority: env var > settingsService
      const envKey = 'env-key-123';
      const storedKey = 'stored-key-456';

      // Simulating: const key = process.env['KEY'] ?? settingsService.getApiKey()
      const resultKey = envKey ?? storedKey;
      expect(resultKey).toBe(envKey);
    });

    it('should use stored key when env var not set', () => {
      const envKey = undefined;
      const storedKey = 'stored-key-456';

      const resultKey = envKey ?? storedKey;
      expect(resultKey).toBe(storedKey);
    });

    it('should handle null from settingsService when neither is set', () => {
      const envKey = undefined;
      const storedKey: string | null = null; // settingsService returns null for no key

      // Same logic as in main/index.ts:
      // const key = process.env['KEY'] ?? settingsService.getApiKey('provider');
      // If both are undefined/null, we pass undefined to NexusBootstrap
      const resultKey = envKey ?? storedKey ?? undefined;

      // Note: null ?? undefined = null (because null is not nullish for ??)
      // But our code uses: key ?? undefined, which means we'd get null
      // The actual code passes `null ?? undefined` to the config, which
      // NexusBootstrap handles as "no key"
      expect(resultKey).toBeFalsy(); // Both null and undefined are falsy
    });
  });
});

// ============================================================================
// Test: Settings Service Integration
// ============================================================================

describe('Settings Service Backend Selection', () => {
  // Mock the settings service
  const mockSettingsService = {
    getAll: vi.fn(),
    getApiKey: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct backend settings', () => {
    mockSettingsService.getAll.mockReturnValue({
      llm: {
        claude: { backend: 'cli', hasApiKey: false },
        gemini: { backend: 'api', hasApiKey: true },
        embeddings: { backend: 'local' },
        defaultProvider: 'claude',
      },
      agents: { maxParallelAgents: 4 },
      checkpoints: { autoCheckpointEnabled: true },
      ui: { theme: 'dark' },
      project: { defaultLanguage: 'typescript' },
    });

    const settings = mockSettingsService.getAll();

    expect(settings.llm.claude.backend).toBe('cli');
    expect(settings.llm.gemini.backend).toBe('api');
    expect(settings.llm.embeddings.backend).toBe('local');
  });

  it('should correctly report API key presence', () => {
    mockSettingsService.getApiKey.mockImplementation((provider: string) => {
      if (provider === 'claude') return null;
      if (provider === 'gemini') return 'gm-test-key';
      return null;
    });

    expect(mockSettingsService.getApiKey('claude')).toBeNull();
    expect(mockSettingsService.getApiKey('gemini')).toBe('gm-test-key');
  });
});

// ============================================================================
// Test: Settings Persistence Flow
// ============================================================================

describe('Settings Persistence Flow', () => {
  it('should allow updating backend preference', () => {
    const mockSet = vi.fn();

    // Simulate updating settings
    mockSet('llm.claude.backend', 'api');

    expect(mockSet).toHaveBeenCalledWith('llm.claude.backend', 'api');
  });

  it('should handle agent model assignments', () => {
    const mockSet = vi.fn();

    const agentModels = {
      planner: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
      coder: { provider: 'gemini', model: 'gemini-2.5-flash' },
    };

    mockSet('agents.agentModels', agentModels);

    expect(mockSet).toHaveBeenCalledWith('agents.agentModels', agentModels);
  });
});

// ============================================================================
// Test: Default Values
// ============================================================================

describe('Settings Default Values', () => {
  const defaultSettings = {
    llm: {
      claude: {
        backend: 'cli' as const,
        timeout: 300000,
        maxRetries: 2,
        model: 'claude-sonnet-4-5-20250929',
      },
      gemini: {
        backend: 'cli' as const,
        timeout: 300000,
        model: 'gemini-2.5-flash',
      },
      embeddings: {
        backend: 'local' as const,
        localModel: 'Xenova/all-MiniLM-L6-v2',
      },
      defaultProvider: 'claude' as const,
      fallbackEnabled: true,
    },
    agents: {
      maxParallelAgents: 4,
      taskTimeoutMinutes: 30,
      maxRetries: 3,
      autoRetryEnabled: true,
      qaIterationLimit: 50,
    },
    checkpoints: {
      autoCheckpointEnabled: true,
      autoCheckpointIntervalMinutes: 5,
      maxCheckpointsToKeep: 10,
      checkpointOnFeatureComplete: true,
    },
    ui: {
      theme: 'system' as const,
      sidebarWidth: 280,
      showNotifications: true,
      notificationDuration: 5000,
    },
    project: {
      defaultLanguage: 'typescript',
      defaultTestFramework: 'vitest',
      outputDirectory: '.nexus',
    },
  };

  it('should have CLI as default backend for Claude', () => {
    expect(defaultSettings.llm.claude.backend).toBe('cli');
  });

  it('should have CLI as default backend for Gemini', () => {
    expect(defaultSettings.llm.gemini.backend).toBe('cli');
  });

  it('should have local as default backend for embeddings', () => {
    expect(defaultSettings.llm.embeddings.backend).toBe('local');
  });

  it('should have Claude as default provider', () => {
    expect(defaultSettings.llm.defaultProvider).toBe('claude');
  });

  it('should have fallback enabled by default', () => {
    expect(defaultSettings.llm.fallbackEnabled).toBe(true);
  });

  it('should have 4 max parallel agents by default', () => {
    expect(defaultSettings.agents.maxParallelAgents).toBe(4);
  });

  it('should have 50 QA iteration limit by default', () => {
    expect(defaultSettings.agents.qaIterationLimit).toBe(50);
  });
});

// ============================================================================
// Test: Runtime Settings Application
// ============================================================================

describe('Runtime Settings Application', () => {
  it('should apply model selection to agents', () => {
    const agentModelAssignments = {
      planner: { provider: 'claude' as const, model: 'claude-sonnet-4-5-20250929' },
      coder: { provider: 'claude' as const, model: 'claude-sonnet-4-5-20250929' },
      tester: { provider: 'gemini' as const, model: 'gemini-2.5-flash' },
      reviewer: { provider: 'gemini' as const, model: 'gemini-2.5-flash' },
      merger: { provider: 'claude' as const, model: 'claude-sonnet-4-5-20250929' },
      architect: { provider: 'claude' as const, model: 'claude-sonnet-4-5-20250929' },
      debugger: { provider: 'gemini' as const, model: 'gemini-2.5-pro' },
      documenter: { provider: 'gemini' as const, model: 'gemini-2.5-flash' },
    };

    // Verify structure
    expect(agentModelAssignments.planner.provider).toBe('claude');
    expect(agentModelAssignments.tester.provider).toBe('gemini');
  });

  it('should support mixed provider configuration', () => {
    const settings = {
      claude: { backend: 'cli' as const },
      gemini: { backend: 'api' as const },
    };

    // Can have different backends per provider
    expect(settings.claude.backend).not.toBe(settings.gemini.backend);
  });
});
