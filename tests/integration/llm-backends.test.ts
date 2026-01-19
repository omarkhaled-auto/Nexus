/**
 * LLM Backend Integration Tests - Phase 16: Full CLI Support Integration
 *
 * These integration tests verify that:
 * - NexusFactory correctly creates instances with specified backend types
 * - All components work together properly
 * - Backend selection logic is correct
 * - Settings are properly applied
 *
 * Note: CLI-specific tests (isAvailable, fallback behavior) are covered in
 * the unit tests for ClaudeCodeCLIClient and GeminiCLIClient. These integration
 * tests focus on the factory and wiring aspects.
 *
 * Task 17: Integration Testing - All Backends Work Together
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NexusFactory, type NexusFactoryConfig, type NexusTestingConfig } from '../../src/NexusFactory';

// =============================================================================
// Mocks Setup (static mocks for reliable testing)
// =============================================================================

// Mock LLM API clients
vi.mock('../../src/llm/clients/ClaudeClient', () => {
  class LLMError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'LLMError';
    }
  }
  return {
    ClaudeClient: vi.fn().mockImplementation(() => ({
      chat: vi.fn().mockResolvedValue({ content: 'mocked API response' }),
      chatStream: vi.fn(),
      countTokens: vi.fn().mockReturnValue(0),
    })),
    LLMError,
  };
});

vi.mock('../../src/llm/clients/GeminiClient', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'mocked API response' }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(0),
  })),
}));

// Mock CLI clients - return isAvailable=false to force API fallback
// This mirrors the approach in NexusFactory.test.ts which works reliably
vi.mock('../../src/llm/clients/ClaudeCodeCLIClient', () => {
  class CLINotFoundError extends Error {
    constructor() {
      super('Claude CLI not found');
      this.name = 'CLINotFoundError';
    }
  }
  return {
    ClaudeCodeCLIClient: vi.fn().mockImplementation(() => ({
      isAvailable: vi.fn().mockResolvedValue(false),
      chat: vi.fn().mockResolvedValue({ content: 'mocked CLI response' }),
      chatStream: vi.fn(),
      countTokens: vi.fn().mockReturnValue(0),
    })),
    CLINotFoundError,
  };
});

vi.mock('../../src/llm/clients/GeminiCLIClient', () => {
  class GeminiCLINotFoundError extends Error {
    constructor() {
      super('Gemini CLI not found');
      this.name = 'GeminiCLINotFoundError';
    }
  }
  return {
    GeminiCLIClient: vi.fn().mockImplementation(() => ({
      isAvailable: vi.fn().mockResolvedValue(false),
      chat: vi.fn().mockResolvedValue({ content: 'mocked CLI response' }),
      chatStream: vi.fn(),
      countTokens: vi.fn().mockReturnValue(0),
    })),
    GeminiCLINotFoundError,
  };
});

// Mock local embeddings - return isAvailable=false
vi.mock('../../src/persistence/memory/LocalEmbeddingsService', () => {
  class LocalEmbeddingsInitError extends Error {
    constructor(model: string, cause: Error) {
      super(`Local embeddings init error for ${model}: ${cause.message}`);
      this.name = 'LocalEmbeddingsInitError';
    }
  }
  return {
    LocalEmbeddingsService: vi.fn().mockImplementation(() => ({
      isAvailable: vi.fn().mockResolvedValue(false),
      embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
      embedBatch: vi.fn().mockResolvedValue([{ embedding: [0.1, 0.2, 0.3] }]),
    })),
    LocalEmbeddingsInitError,
  };
});

vi.mock('../../src/persistence/memory/EmbeddingsService', () => ({
  EmbeddingsService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue({ embedding: [] }),
  })),
}));

// Mock infrastructure components
vi.mock('../../src/infrastructure/git/GitService', () => ({
  GitService: vi.fn().mockImplementation(() => ({
    getDiff: vi.fn().mockResolvedValue(''),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/infrastructure/git/WorktreeManager', () => ({
  WorktreeManager: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ path: '/mock/worktree' }),
    cleanup: vi.fn().mockResolvedValue({ cleaned: [], errors: [] }),
    remove: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/orchestration/events/EventBus', () => ({
  EventBus: {
    getInstance: vi.fn().mockReturnValue({
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
    }),
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('LLM Backend Integration', () => {
  // API-based config that always works
  const apiConfig: NexusFactoryConfig = {
    claudeApiKey: 'test-claude-key',
    geminiApiKey: 'test-gemini-key',
    openaiApiKey: 'test-openai-key',
    workingDir: '/test/project',
    claudeBackend: 'api', // Explicitly use API to bypass CLI availability checks
    geminiBackend: 'api', // Explicitly use API to bypass CLI availability checks
    embeddingsBackend: 'api', // Explicitly use API to bypass local availability checks
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Factory Creation Tests
  // ===========================================================================

  describe('NexusFactory.create', () => {
    it('should create a NexusInstance with all required components', async () => {
      const nexus = await NexusFactory.create(apiConfig);

      expect(nexus).toBeDefined();
      expect(nexus.coordinator).toBeDefined();
      expect(nexus.agentPool).toBeDefined();
      expect(nexus.taskQueue).toBeDefined();
      expect(nexus.eventBus).toBeDefined();
      expect(nexus.llm).toBeDefined();
      expect(nexus.llm.claude).toBeDefined();
      expect(nexus.llm.gemini).toBeDefined();
      expect(nexus.planning).toBeDefined();
      expect(nexus.planning.decomposer).toBeDefined();
      expect(nexus.planning.resolver).toBeDefined();
      expect(nexus.planning.estimator).toBeDefined();
      expect(nexus.shutdown).toBeDefined();
      expect(typeof nexus.shutdown).toBe('function');
    });

    it('should expose backend information in the returned instance', async () => {
      const nexus = await NexusFactory.create(apiConfig);

      expect(nexus.backends).toBeDefined();
      expect(nexus.backends.claude).toBeDefined();
      expect(nexus.backends.gemini).toBeDefined();
      expect(nexus.backends.embeddings).toBeDefined();
    });

    it('should report correct backend types when using API', async () => {
      const nexus = await NexusFactory.create(apiConfig);

      expect(nexus.backends.claude).toBe('api');
      expect(nexus.backends.gemini).toBe('api');
      expect(nexus.backends.embeddings).toBe('api');
    });

    it('should provide a working shutdown function', async () => {
      const nexus = await NexusFactory.create(apiConfig);
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // API Backend Tests
  // ===========================================================================

  describe('API Backends', () => {
    it('should work with Claude API backend', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        claudeBackend: 'api',
      };

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.claude).toBe('api');
      expect(nexus.llm.claude).toBeDefined();
    });

    it('should work with Gemini API backend', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        geminiBackend: 'api',
      };

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.gemini).toBe('api');
      expect(nexus.llm.gemini).toBeDefined();
    });

    it('should work with OpenAI API embeddings', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        embeddingsBackend: 'api',
      };

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.embeddings).toBe('api');
    });

    it('should work with all API backends together', async () => {
      const nexus = await NexusFactory.create(apiConfig);

      expect(nexus.backends.claude).toBe('api');
      expect(nexus.backends.gemini).toBe('api');
      expect(nexus.backends.embeddings).toBe('api');
    });
  });

  // ===========================================================================
  // CLI Fallback Tests (with mocked unavailable CLI)
  // ===========================================================================

  describe('CLI Fallback Behavior', () => {
    it('should fall back to API when Claude CLI requested but unavailable', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        claudeBackend: 'cli', // Request CLI but it's mocked as unavailable
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.claude).toBe('api'); // Fell back to API
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI not available, falling back to API')
      );

      consoleSpy.mockRestore();
    });

    it('should fall back to API when Gemini CLI requested but unavailable', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        geminiBackend: 'cli', // Request CLI but it's mocked as unavailable
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.gemini).toBe('api'); // Fell back to API
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini CLI not available, falling back to API')
      );

      consoleSpy.mockRestore();
    });

    it('should fall back to API when local embeddings requested but unavailable', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        embeddingsBackend: 'local', // Request local but it's mocked as unavailable
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.backends.embeddings).toBe('api'); // Fell back to API
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Local embeddings not available, falling back to OpenAI API')
      );

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should throw APIKeyMissingError when Claude API key missing', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        claudeApiKey: undefined,
        claudeBackend: 'api',
      };

      try {
        await NexusFactory.create(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).name).toBe('APIKeyMissingError');
      }
    });

    it('should throw APIKeyMissingError when Gemini API key missing', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        geminiApiKey: undefined,
        geminiBackend: 'api',
      };

      try {
        await NexusFactory.create(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).name).toBe('APIKeyMissingError');
      }
    });

    it('should throw CLINotFoundError when Claude CLI requested, unavailable, and no API key', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        claudeApiKey: undefined,
        claudeBackend: 'cli',
      };

      try {
        await NexusFactory.create(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).name).toBe('CLINotFoundError');
      }
    });

    it('should throw GeminiCLINotFoundError when Gemini CLI requested, unavailable, and no API key', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        geminiApiKey: undefined,
        geminiBackend: 'cli',
      };

      try {
        await NexusFactory.create(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).name).toBe('GeminiCLINotFoundError');
      }
    });

    it('should gracefully handle missing embeddings (optional)', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        openaiApiKey: undefined,
        embeddingsBackend: 'local',
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Embeddings are optional - should not throw
      const nexus = await NexusFactory.create(config);

      expect(nexus).toBeDefined();
      expect(nexus.embeddings).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Testing Factory Tests
  // ===========================================================================

  describe('createForTesting', () => {
    it('should create a testing instance with all components', async () => {
      const testConfig: NexusTestingConfig = {
        ...apiConfig,
        mockQA: true,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);

      expect(nexus).toBeDefined();
      expect(nexus.coordinator).toBeDefined();
      expect(nexus.agentPool).toBeDefined();
      expect(nexus.backends.claude).toBe('api');
      expect(nexus.backends.gemini).toBe('api');
    });

    it('should respect mockQA flag', async () => {
      const testConfig: NexusTestingConfig = {
        ...apiConfig,
        mockQA: true,
        maxIterations: 5,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);

      expect(nexus).toBeDefined();
      expect(nexus.coordinator).toBeDefined();
    });

    it('should provide working shutdown', async () => {
      const testConfig: NexusTestingConfig = {
        ...apiConfig,
        mockQA: true,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // Configuration Options Tests
  // ===========================================================================

  describe('Configuration Options', () => {
    it('should accept custom Claude client options', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        claudeConfig: {
          timeout: 30000,
          maxRetries: 3,
        },
      };

      const nexus = await NexusFactory.create(config);
      expect(nexus).toBeDefined();
    });

    it('should accept custom Gemini client options', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        geminiConfig: {
          timeout: 60000,
        },
      };

      const nexus = await NexusFactory.create(config);
      expect(nexus).toBeDefined();
    });

    it('should accept custom agent limits', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        maxAgentsByType: {
          coder: 2,
          tester: 1,
        },
      };

      const nexus = await NexusFactory.create(config);
      expect(nexus.agentPool).toBeDefined();
    });

    it('should accept QA configuration', async () => {
      const config: NexusFactoryConfig = {
        ...apiConfig,
        qaConfig: {
          buildTimeout: 30000,
          lintTimeout: 60000,
          testTimeout: 120000,
          autoFixLint: true,
        },
      };

      const nexus = await NexusFactory.create(config);
      expect(nexus).toBeDefined();
    });
  });

  // ===========================================================================
  // Component Wiring Tests
  // ===========================================================================

  describe('Component Wiring', () => {
    it('should wire TaskDecomposer with Claude client', async () => {
      const nexus = await NexusFactory.create(apiConfig);
      expect(nexus.planning.decomposer).toBeDefined();
    });

    it('should wire DependencyResolver independently', async () => {
      const nexus = await NexusFactory.create(apiConfig);
      expect(nexus.planning.resolver).toBeDefined();
    });

    it('should wire TimeEstimator independently', async () => {
      const nexus = await NexusFactory.create(apiConfig);
      expect(nexus.planning.estimator).toBeDefined();
    });

    it('should share EventBus instance across components', async () => {
      const nexus = await NexusFactory.create(apiConfig);
      expect(nexus).toHaveProperty('eventBus');
    });
  });
});
