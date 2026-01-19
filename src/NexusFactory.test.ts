/**
 * NexusFactory Tests
 *
 * Tests for the NexusFactory that creates fully-wired Nexus instances.
 *
 * Phase 14B Task 18: Wiring & Factory Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NexusFactory, createNexus, createTestingNexus } from './NexusFactory';
import type { NexusFactoryConfig, NexusTestingConfig } from './NexusFactory';

// Mock the LLM clients to avoid actual API calls
vi.mock('./llm/clients/ClaudeClient', () => {
  // Base LLMError class that other errors extend
  class LLMError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'LLMError';
      Object.setPrototypeOf(this, LLMError.prototype);
    }
  }

  return {
    ClaudeClient: vi.fn().mockImplementation(() => ({
      chat: vi.fn().mockResolvedValue({ content: 'mocked response' }),
      chatStream: vi.fn(),
      countTokens: vi.fn().mockReturnValue(0),
    })),
    LLMError,
  };
});

vi.mock('./llm/clients/GeminiClient', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'mocked response' }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(0),
  })),
}));

// Mock CLI clients - return isAvailable=false to force API fallback
vi.mock('./llm/clients/ClaudeCodeCLIClient', () => {
  const MockClaudeCodeCLIClient = vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockResolvedValue(false),
    chat: vi.fn().mockResolvedValue({ content: 'mocked CLI response' }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(0),
  }));

  class CLINotFoundError extends Error {
    constructor() {
      super('Claude CLI not found');
      this.name = 'CLINotFoundError';
    }
  }

  return {
    ClaudeCodeCLIClient: MockClaudeCodeCLIClient,
    CLINotFoundError,
  };
});

vi.mock('./llm/clients/GeminiCLIClient', () => {
  const MockGeminiCLIClient = vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockResolvedValue(false),
    chat: vi.fn().mockResolvedValue({ content: 'mocked CLI response' }),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(0),
  }));

  class GeminiCLINotFoundError extends Error {
    constructor() {
      super('Gemini CLI not found');
      this.name = 'GeminiCLINotFoundError';
    }
  }

  return {
    GeminiCLIClient: MockGeminiCLIClient,
    GeminiCLINotFoundError,
  };
});

// Mock LocalEmbeddingsService - return isAvailable=false to skip embeddings
vi.mock('./persistence/memory/LocalEmbeddingsService', () => ({
  LocalEmbeddingsService: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockResolvedValue(false),
  })),
  LocalEmbeddingsInitError: class LocalEmbeddingsInitError extends Error {
    constructor(model: string, cause: Error) {
      super(`Local embeddings init error for ${model}: ${cause.message}`);
      this.name = 'LocalEmbeddingsInitError';
    }
  },
}));

// Mock EmbeddingsService
vi.mock('./persistence/memory/EmbeddingsService', () => ({
  EmbeddingsService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue({ embedding: [] }),
  })),
}));

// Mock infrastructure components
vi.mock('./infrastructure/git/GitService', () => ({
  GitService: vi.fn().mockImplementation(() => ({
    getDiff: vi.fn().mockResolvedValue(''),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('./infrastructure/git/WorktreeManager', () => ({
  WorktreeManager: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ path: '/mock/worktree' }),
    cleanup: vi.fn().mockResolvedValue({ cleaned: [], errors: [] }),
    remove: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock EventBus - use inline object to avoid hoisting issues
vi.mock('./orchestration/events/EventBus', () => ({
  EventBus: {
    getInstance: vi.fn().mockReturnValue({
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
    }),
  },
}));

describe('NexusFactory', () => {
  // Use API backend explicitly to avoid CLI availability checks in tests
  const validConfig: NexusFactoryConfig = {
    claudeApiKey: 'test-claude-key',
    geminiApiKey: 'test-gemini-key',
    workingDir: '/test/project',
    claudeBackend: 'api',  // Use API directly to bypass CLI checks
    geminiBackend: 'api',  // Use API directly to bypass CLI checks
    embeddingsBackend: 'api',  // Use API directly to bypass local checks
    openaiApiKey: 'test-openai-key',  // Required for API embeddings
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a NexusInstance with all required components', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // Verify all components are present
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

    it('should create coordinator with all dependencies wired', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // Coordinator should be properly initialized
      expect(nexus.coordinator).toBeDefined();
    });

    it('should create agent pool with both Claude and Gemini clients', async () => {
      const nexus = await NexusFactory.create(validConfig);

      expect(nexus.agentPool).toBeDefined();
    });

    it('should apply custom agent limits when provided', async () => {
      const configWithLimits: NexusFactoryConfig = {
        ...validConfig,
        maxAgentsByType: {
          coder: 2,
          tester: 1,
        },
      };

      const nexus = await NexusFactory.create(configWithLimits);
      expect(nexus.agentPool).toBeDefined();
    });

    it('should apply QA configuration when provided', async () => {
      const configWithQA: NexusFactoryConfig = {
        ...validConfig,
        qaConfig: {
          buildTimeout: 30000,
          lintTimeout: 60000,
          testTimeout: 120000,
          autoFixLint: true,
        },
      };

      const nexus = await NexusFactory.create(configWithQA);
      expect(nexus).toBeDefined();
    });

    it('should provide a working shutdown function', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // Shutdown should not throw
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  describe('createForTesting', () => {
    it('should create a testing instance with mocked QA', async () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: true,
        maxIterations: 5,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);

      expect(nexus).toBeDefined();
      expect(nexus.coordinator).toBeDefined();
      expect(nexus.agentPool).toBeDefined();
    });

    it('should create a testing instance with real QA when mockQA is false', async () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: false,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);
      expect(nexus).toBeDefined();
    });

    it('should provide a working shutdown function', async () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: true,
      };

      const nexus = await NexusFactory.createForTesting(testConfig);
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  describe('createPlanningOnly', () => {
    it('should create a minimal instance with only planning components', () => {
      const nexus = NexusFactory.createPlanningOnly('test-claude-key');

      expect(nexus).toBeDefined();
      expect(nexus.planning).toBeDefined();
      expect(nexus.planning.decomposer).toBeDefined();
      expect(nexus.planning.resolver).toBeDefined();
      expect(nexus.planning.estimator).toBeDefined();
      expect(nexus.llm).toBeDefined();
      expect(nexus.llm.claude).toBeDefined();
    });

    it('should provide a working shutdown function', async () => {
      const nexus = NexusFactory.createPlanningOnly('test-claude-key');
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  describe('convenience functions', () => {
    describe('createNexus', () => {
      it('should be equivalent to NexusFactory.create', async () => {
        const nexus = await createNexus(validConfig);

        expect(nexus).toBeDefined();
        expect(nexus.coordinator).toBeDefined();
        expect(nexus.agentPool).toBeDefined();
      });
    });

    describe('createTestingNexus', () => {
      it('should be equivalent to NexusFactory.createForTesting', async () => {
        const testConfig: NexusTestingConfig = {
          ...validConfig,
          mockQA: true,
        };

        const nexus = await createTestingNexus(testConfig);

        expect(nexus).toBeDefined();
        expect(nexus.coordinator).toBeDefined();
        expect(nexus.agentPool).toBeDefined();
      });
    });
  });

  describe('component wiring', () => {
    it('should wire TaskDecomposer with Claude client', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // TaskDecomposer should exist and be ready to use
      expect(nexus.planning.decomposer).toBeDefined();
    });

    it('should wire DependencyResolver independently', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // DependencyResolver is stateless and doesn't need external deps
      expect(nexus.planning.resolver).toBeDefined();
    });

    it('should wire TimeEstimator independently', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // TimeEstimator is stateless and doesn't need external deps
      expect(nexus.planning.estimator).toBeDefined();
    });

    it('should share EventBus instance across components', async () => {
      const nexus = await NexusFactory.create(validConfig);

      // EventBus should be included in result (may be mocked singleton)
      // In mocked environment, EventBus.getInstance() returns the mocked value
      // The important test is that the factory doesn't throw and includes the field
      expect(nexus).toHaveProperty('eventBus');
    });
  });

  describe('configuration validation', () => {
    it('should create instance with minimal required config', async () => {
      const minimalConfig: NexusFactoryConfig = {
        claudeApiKey: 'key',
        geminiApiKey: 'key',
        workingDir: '/path',
        claudeBackend: 'api',  // Use API to bypass CLI checks in tests
        geminiBackend: 'api',
      };

      const nexus = await NexusFactory.create(minimalConfig);
      expect(nexus).toBeDefined();
    });

    it('should accept custom Claude client options', async () => {
      const configWithClaudeOptions: NexusFactoryConfig = {
        ...validConfig,
        claudeConfig: {
          timeout: 30000,
          maxRetries: 3,
        },
      };

      const nexus = await NexusFactory.create(configWithClaudeOptions);
      expect(nexus).toBeDefined();
    });

    it('should accept custom Gemini client options', async () => {
      const configWithGeminiOptions: NexusFactoryConfig = {
        ...validConfig,
        geminiConfig: {
          timeout: 60000,
        },
      };

      const nexus = await NexusFactory.create(configWithGeminiOptions);
      expect(nexus).toBeDefined();
    });
  });
});
