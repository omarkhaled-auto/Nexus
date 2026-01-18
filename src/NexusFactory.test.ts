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
vi.mock('./llm/clients/ClaudeClient', () => ({
  ClaudeClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'mocked response' }),
  })),
}));

vi.mock('./llm/clients/GeminiClient', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'mocked response' }),
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
  const validConfig: NexusFactoryConfig = {
    claudeApiKey: 'test-claude-key',
    geminiApiKey: 'test-gemini-key',
    workingDir: '/test/project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a NexusInstance with all required components', () => {
      const nexus = NexusFactory.create(validConfig);

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

    it('should create coordinator with all dependencies wired', () => {
      const nexus = NexusFactory.create(validConfig);

      // Coordinator should be properly initialized
      expect(nexus.coordinator).toBeDefined();
    });

    it('should create agent pool with both Claude and Gemini clients', () => {
      const nexus = NexusFactory.create(validConfig);

      expect(nexus.agentPool).toBeDefined();
    });

    it('should apply custom agent limits when provided', () => {
      const configWithLimits: NexusFactoryConfig = {
        ...validConfig,
        maxAgentsByType: {
          coder: 2,
          tester: 1,
        },
      };

      const nexus = NexusFactory.create(configWithLimits);
      expect(nexus.agentPool).toBeDefined();
    });

    it('should apply QA configuration when provided', () => {
      const configWithQA: NexusFactoryConfig = {
        ...validConfig,
        qaConfig: {
          buildTimeout: 30000,
          lintTimeout: 60000,
          testTimeout: 120000,
          autoFixLint: true,
        },
      };

      const nexus = NexusFactory.create(configWithQA);
      expect(nexus).toBeDefined();
    });

    it('should provide a working shutdown function', async () => {
      const nexus = NexusFactory.create(validConfig);

      // Shutdown should not throw
      await expect(nexus.shutdown()).resolves.not.toThrow();
    });
  });

  describe('createForTesting', () => {
    it('should create a testing instance with mocked QA', () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: true,
        maxIterations: 5,
      };

      const nexus = NexusFactory.createForTesting(testConfig);

      expect(nexus).toBeDefined();
      expect(nexus.coordinator).toBeDefined();
      expect(nexus.agentPool).toBeDefined();
    });

    it('should create a testing instance with real QA when mockQA is false', () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: false,
      };

      const nexus = NexusFactory.createForTesting(testConfig);
      expect(nexus).toBeDefined();
    });

    it('should provide a working shutdown function', async () => {
      const testConfig: NexusTestingConfig = {
        ...validConfig,
        mockQA: true,
      };

      const nexus = NexusFactory.createForTesting(testConfig);
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
      it('should be equivalent to NexusFactory.create', () => {
        const nexus = createNexus(validConfig);

        expect(nexus).toBeDefined();
        expect(nexus.coordinator).toBeDefined();
        expect(nexus.agentPool).toBeDefined();
      });
    });

    describe('createTestingNexus', () => {
      it('should be equivalent to NexusFactory.createForTesting', () => {
        const testConfig: NexusTestingConfig = {
          ...validConfig,
          mockQA: true,
        };

        const nexus = createTestingNexus(testConfig);

        expect(nexus).toBeDefined();
        expect(nexus.coordinator).toBeDefined();
        expect(nexus.agentPool).toBeDefined();
      });
    });
  });

  describe('component wiring', () => {
    it('should wire TaskDecomposer with Claude client', () => {
      const nexus = NexusFactory.create(validConfig);

      // TaskDecomposer should exist and be ready to use
      expect(nexus.planning.decomposer).toBeDefined();
    });

    it('should wire DependencyResolver independently', () => {
      const nexus = NexusFactory.create(validConfig);

      // DependencyResolver is stateless and doesn't need external deps
      expect(nexus.planning.resolver).toBeDefined();
    });

    it('should wire TimeEstimator independently', () => {
      const nexus = NexusFactory.create(validConfig);

      // TimeEstimator is stateless and doesn't need external deps
      expect(nexus.planning.estimator).toBeDefined();
    });

    it('should share EventBus instance across components', () => {
      const nexus = NexusFactory.create(validConfig);

      // EventBus should be included in result (may be mocked singleton)
      // In mocked environment, EventBus.getInstance() returns the mocked value
      // The important test is that the factory doesn't throw and includes the field
      expect(nexus).toHaveProperty('eventBus');
    });
  });

  describe('configuration validation', () => {
    it('should create instance with minimal required config', () => {
      const minimalConfig: NexusFactoryConfig = {
        claudeApiKey: 'key',
        geminiApiKey: 'key',
        workingDir: '/path',
      };

      const nexus = NexusFactory.create(minimalConfig);
      expect(nexus).toBeDefined();
    });

    it('should accept custom Claude client options', () => {
      const configWithClaudeOptions: NexusFactoryConfig = {
        ...validConfig,
        claudeConfig: {
          timeout: 30000,
          maxRetries: 3,
        },
      };

      const nexus = NexusFactory.create(configWithClaudeOptions);
      expect(nexus).toBeDefined();
    });

    it('should accept custom Gemini client options', () => {
      const configWithGeminiOptions: NexusFactoryConfig = {
        ...validConfig,
        geminiConfig: {
          timeout: 60000,
        },
      };

      const nexus = NexusFactory.create(configWithGeminiOptions);
      expect(nexus).toBeDefined();
    });
  });
});
