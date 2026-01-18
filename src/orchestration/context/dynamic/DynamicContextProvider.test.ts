/**
 * DynamicContextProvider Tests
 *
 * Tests for the Dynamic Context Provider implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DynamicContextProvider,
  createDynamicContextProvider,
} from './DynamicContextProvider';
import {
  ContextRequest,
  ContextResponse,
  ContextRequestType,
  IRequestHandler,
  AgentNotRegisteredError,
  TokenBudgetExceededError,
  NoHandlerFoundError,
} from './types';

// ============================================================================
// Mock Handler
// ============================================================================

/**
 * Creates a mock handler that handles specified types
 */
function createMockHandler(
  types: ContextRequestType[],
  response?: Partial<ContextResponse>
): IRequestHandler {
  return {
    canHandle: (type: ContextRequestType) => types.includes(type),
    handle: vi.fn().mockResolvedValue({
      success: true,
      requestId: 'mock-id',
      type: types[0],
      content: 'mock content',
      tokenCount: 100,
      source: 'mock',
      ...response,
    }),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DynamicContextProvider', () => {
  let provider: DynamicContextProvider;
  let mockFileHandler: IRequestHandler;
  let mockSymbolHandler: IRequestHandler;
  let mockSearchHandler: IRequestHandler;

  beforeEach(() => {
    mockFileHandler = createMockHandler(['file']);
    mockSymbolHandler = createMockHandler(['symbol', 'definition']);
    mockSearchHandler = createMockHandler(['search', 'usages']);

    provider = new DynamicContextProvider(
      [mockFileHandler, mockSymbolHandler, mockSearchHandler],
      { logRequests: false }
    );
  });

  // --------------------------------------------------------------------------
  // Agent Registration Tests
  // --------------------------------------------------------------------------

  describe('agent registration', () => {
    it('should register an agent with default token budget', () => {
      provider.registerAgent('agent-1', 'task-1');

      expect(provider.isAgentRegistered('agent-1')).toBe(true);
      expect(provider.getRemainingBudget('agent-1')).toBe(50000);
      expect(provider.getUsedTokens('agent-1')).toBe(0);
    });

    it('should register an agent with custom token budget', () => {
      provider.registerAgent('agent-1', 'task-1', 10000);

      expect(provider.isAgentRegistered('agent-1')).toBe(true);
      expect(provider.getRemainingBudget('agent-1')).toBe(10000);
    });

    it('should track registered agents', () => {
      provider.registerAgent('agent-1', 'task-1');
      provider.registerAgent('agent-2', 'task-2');

      expect(provider.getRegisteredAgentCount()).toBe(2);
      expect(provider.getRegisteredAgentIds()).toContain('agent-1');
      expect(provider.getRegisteredAgentIds()).toContain('agent-2');
    });

    it('should replace existing registration if same agentId', () => {
      provider.registerAgent('agent-1', 'task-1', 5000);
      provider.registerAgent('agent-1', 'task-2', 10000);

      expect(provider.getRegisteredAgentCount()).toBe(1);
      expect(provider.getRemainingBudget('agent-1')).toBe(10000);
    });
  });

  // --------------------------------------------------------------------------
  // Agent Unregistration Tests
  // --------------------------------------------------------------------------

  describe('agent unregistration', () => {
    it('should unregister an agent', () => {
      provider.registerAgent('agent-1', 'task-1');
      provider.unregisterAgent('agent-1');

      expect(provider.isAgentRegistered('agent-1')).toBe(false);
      expect(provider.getRegisteredAgentCount()).toBe(0);
    });

    it('should handle unregistering non-existent agent gracefully', () => {
      expect(() => provider.unregisterAgent('non-existent')).not.toThrow();
    });

    it('should return 0 tokens for unregistered agent', () => {
      expect(provider.getRemainingBudget('non-existent')).toBe(0);
      expect(provider.getUsedTokens('non-existent')).toBe(0);
    });

    it('should return empty history for unregistered agent', () => {
      expect(provider.getRequestHistory('non-existent')).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Request Routing Tests
  // --------------------------------------------------------------------------

  describe('request routing', () => {
    beforeEach(() => {
      provider.registerAgent('agent-1', 'task-1');
    });

    it('should route file requests to file handler', async () => {
      await provider.requestFile('agent-1', 'src/index.ts', 'Need entry point');

      expect(mockFileHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file',
          query: 'src/index.ts',
          reason: 'Need entry point',
          agentId: 'agent-1',
          taskId: 'task-1',
        })
      );
    });

    it('should route symbol requests to symbol handler', async () => {
      await provider.requestSymbol('agent-1', 'MyClass', 'Need class info');

      expect(mockSymbolHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'symbol',
          query: 'MyClass',
        })
      );
    });

    it('should route search requests to search handler', async () => {
      await provider.requestSearch('agent-1', 'authentication', 'Find auth code');

      expect(mockSearchHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'search',
          query: 'authentication',
        })
      );
    });

    it('should route usages requests to search handler', async () => {
      await provider.requestUsages('agent-1', 'validateUser', 'Find usages');

      expect(mockSearchHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'usages',
          query: 'validateUser',
        })
      );
    });

    it('should route definition requests to symbol handler', async () => {
      await provider.requestDefinition('agent-1', 'User', 'Find definition');

      expect(mockSymbolHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'definition',
          query: 'User',
        })
      );
    });

    it('should handle generic request method', async () => {
      await provider.request('agent-1', {
        type: 'file',
        query: 'src/utils.ts',
        reason: 'Need utils',
      });

      expect(mockFileHandler.handle).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Budget Tracking Tests
  // --------------------------------------------------------------------------

  describe('budget tracking', () => {
    it('should track token usage after requests', async () => {
      provider.registerAgent('agent-1', 'task-1', 1000);

      await provider.requestFile('agent-1', 'file1.ts', 'Need it');

      expect(provider.getUsedTokens('agent-1')).toBe(100);
      expect(provider.getRemainingBudget('agent-1')).toBe(900);
    });

    it('should accumulate token usage across requests', async () => {
      provider.registerAgent('agent-1', 'task-1', 1000);

      await provider.requestFile('agent-1', 'file1.ts', 'Need it');
      await provider.requestFile('agent-1', 'file2.ts', 'Need it too');

      expect(provider.getUsedTokens('agent-1')).toBe(200);
      expect(provider.getRemainingBudget('agent-1')).toBe(800);
    });

    it('should track request history', async () => {
      provider.registerAgent('agent-1', 'task-1');

      await provider.requestFile('agent-1', 'file1.ts', 'Need it');
      await provider.requestSymbol('agent-1', 'MyClass', 'Need class');

      const history = provider.getRequestHistory('agent-1');

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('file');
      expect(history[1].type).toBe('symbol');
    });
  });

  // --------------------------------------------------------------------------
  // Budget Enforcement Tests
  // --------------------------------------------------------------------------

  describe('budget enforcement', () => {
    it('should reject request that exceeds budget', async () => {
      // Create handler that returns high token count
      const expensiveHandler = createMockHandler(['file'], { tokenCount: 5000 });
      const limitedProvider = new DynamicContextProvider(
        [expensiveHandler],
        { logRequests: false }
      );

      limitedProvider.registerAgent('agent-1', 'task-1', 1000);

      const response = await limitedProvider.requestFile('agent-1', 'large.ts', 'Need it');

      expect(response.success).toBe(false);
      expect(response.error).toContain('budget');
    });

    it('should allow request that fits in budget', async () => {
      provider.registerAgent('agent-1', 'task-1', 1000);

      const response = await provider.requestFile('agent-1', 'small.ts', 'Need it');

      expect(response.success).toBe(true);
    });

    it('should not use tokens for failed requests', async () => {
      // Create handler that always fails
      const failingHandler: IRequestHandler = {
        canHandle: () => true,
        handle: vi.fn().mockRejectedValue(new Error('Handler failed')),
      };

      const failingProvider = new DynamicContextProvider(
        [failingHandler],
        { logRequests: false }
      );

      failingProvider.registerAgent('agent-1', 'task-1');

      await failingProvider.requestFile('agent-1', 'fail.ts', 'Will fail');

      expect(failingProvider.getUsedTokens('agent-1')).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling Tests
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should return error response for unregistered agent', async () => {
      const response = await provider.requestFile(
        'unregistered',
        'file.ts',
        'Need it'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('not registered');
    });

    it('should return error response when no handler found', async () => {
      const emptyProvider = new DynamicContextProvider([], { logRequests: false });
      emptyProvider.registerAgent('agent-1', 'task-1');

      const response = await emptyProvider.requestFile('agent-1', 'file.ts', 'Need it');

      expect(response.success).toBe(false);
      expect(response.error).toContain('No handler');
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler: IRequestHandler = {
        canHandle: () => true,
        handle: vi.fn().mockRejectedValue(new Error('Something went wrong')),
      };

      const errorProvider = new DynamicContextProvider(
        [errorHandler],
        { logRequests: false }
      );
      errorProvider.registerAgent('agent-1', 'task-1');

      const response = await errorProvider.requestFile('agent-1', 'file.ts', 'Need it');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });

  // --------------------------------------------------------------------------
  // Batch Request Tests
  // --------------------------------------------------------------------------

  describe('batch requests', () => {
    beforeEach(() => {
      provider.registerAgent('agent-1', 'task-1');
    });

    it('should handle multiple file requests', async () => {
      const responses = await provider.requestFiles(
        'agent-1',
        ['file1.ts', 'file2.ts', 'file3.ts'],
        'Need all files'
      );

      expect(responses).toHaveLength(3);
      expect(responses.every((r) => r.success)).toBe(true);
    });

    it('should stop batch when budget exceeded', async () => {
      const expensiveHandler = createMockHandler(['file'], { tokenCount: 500 });
      const limitedProvider = new DynamicContextProvider(
        [expensiveHandler],
        { logRequests: false }
      );

      limitedProvider.registerAgent('agent-1', 'task-1', 1000);

      const responses = await limitedProvider.requestFiles(
        'agent-1',
        ['file1.ts', 'file2.ts', 'file3.ts'],
        'Need files'
      );

      // First two should succeed, third should fail due to budget
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(true);
      expect(responses[2].success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Utility Method Tests
  // --------------------------------------------------------------------------

  describe('utility methods', () => {
    it('should return handler count', () => {
      expect(provider.getHandlerCount()).toBe(3);
    });

    it('should add new handlers dynamically', () => {
      const newHandler = createMockHandler(['custom' as ContextRequestType]);
      provider.addHandler(newHandler);

      expect(provider.getHandlerCount()).toBe(4);
    });

    it('should return project root', () => {
      const customProvider = new DynamicContextProvider(
        [],
        { projectRoot: '/custom/path' }
      );

      expect(customProvider.getProjectRoot()).toBe('/custom/path');
    });
  });

  // --------------------------------------------------------------------------
  // Factory Function Tests
  // --------------------------------------------------------------------------

  describe('createDynamicContextProvider', () => {
    it('should create provider with defaults', () => {
      const provider = createDynamicContextProvider();

      expect(provider).toBeInstanceOf(DynamicContextProvider);
      expect(provider.getHandlerCount()).toBe(0);
    });

    it('should create provider with handlers', () => {
      const handler = createMockHandler(['file']);
      const provider = createDynamicContextProvider([handler]);

      expect(provider.getHandlerCount()).toBe(1);
    });

    it('should create provider with options', () => {
      const provider = createDynamicContextProvider([], {
        defaultTokenBudget: 10000,
        projectRoot: '/test',
      });

      provider.registerAgent('agent-1', 'task-1');
      expect(provider.getRemainingBudget('agent-1')).toBe(10000);
      expect(provider.getProjectRoot()).toBe('/test');
    });
  });

  // --------------------------------------------------------------------------
  // Request ID Generation Tests
  // --------------------------------------------------------------------------

  describe('request ID generation', () => {
    it('should generate unique request IDs', async () => {
      provider.registerAgent('agent-1', 'task-1');

      const response1 = await provider.requestFile('agent-1', 'file1.ts', 'Need it');
      const response2 = await provider.requestFile('agent-1', 'file2.ts', 'Need it too');

      expect(response1.requestId).not.toBe(response2.requestId);
      expect(response1.requestId).toMatch(/^ctx_/);
      expect(response2.requestId).toMatch(/^ctx_/);
    });
  });
});
