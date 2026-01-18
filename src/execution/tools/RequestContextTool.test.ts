/**
 * RequestContextTool Tests
 *
 * Tests for the request_context agent tool.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  REQUEST_CONTEXT_TOOL_DEFINITION,
  RequestContextToolHandler,
  createRequestContextTool,
  isRequestContextToolCall,
  parseRequestContextParams,
  type RequestContextParams,
} from './RequestContextTool';
import type {
  IDynamicContextProvider,
  ContextResponse,
  ContextRequest,
  ContextRequestType,
} from '@/orchestration/context/dynamic/types';

// ============================================================================
// Mock Factory
// ============================================================================

function createMockProvider(
  overrides: Partial<IDynamicContextProvider> = {}
): IDynamicContextProvider {
  return {
    registerAgent: vi.fn(),
    unregisterAgent: vi.fn(),
    requestFile: vi.fn(),
    requestSymbol: vi.fn(),
    requestSearch: vi.fn(),
    requestUsages: vi.fn(),
    requestDefinition: vi.fn(),
    requestFiles: vi.fn(),
    request: vi.fn(),
    getRemainingBudget: vi.fn().mockReturnValue(10000),
    getUsedTokens: vi.fn().mockReturnValue(0),
    getRequestHistory: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

function createSuccessResponse(
  content: string,
  type: ContextRequestType = 'file'
): ContextResponse {
  return {
    success: true,
    requestId: 'req_123',
    type,
    content,
    tokenCount: Math.ceil(content.length / 4),
    source: type === 'file' ? 'src/test.ts' : type,
    metadata: {},
  };
}

function createErrorResponse(
  error: string,
  type: ContextRequestType = 'file'
): ContextResponse {
  return {
    success: false,
    requestId: 'req_123',
    type,
    content: '',
    tokenCount: 0,
    source: 'error',
    error,
  };
}

// ============================================================================
// Tool Definition Tests
// ============================================================================

describe('REQUEST_CONTEXT_TOOL_DEFINITION', () => {
  it('should have correct name', () => {
    expect(REQUEST_CONTEXT_TOOL_DEFINITION.name).toBe('request_context');
  });

  it('should have a description', () => {
    expect(REQUEST_CONTEXT_TOOL_DEFINITION.description).toBeTruthy();
    expect(typeof REQUEST_CONTEXT_TOOL_DEFINITION.description).toBe('string');
    expect(REQUEST_CONTEXT_TOOL_DEFINITION.description.length).toBeGreaterThan(50);
  });

  it('should have correct parameter structure', () => {
    const { parameters } = REQUEST_CONTEXT_TOOL_DEFINITION;

    expect(parameters.type).toBe('object');
    expect(parameters.required).toContain('request_type');
    expect(parameters.required).toContain('query');
    expect(parameters.required).toContain('reason');
  });

  it('should have request_type parameter with enum values', () => {
    const { parameters } = REQUEST_CONTEXT_TOOL_DEFINITION;
    const requestType = parameters.properties.request_type;

    expect(requestType.type).toBe('string');
    expect(requestType.enum).toEqual(['file', 'symbol', 'search', 'usages', 'definition']);
  });

  it('should have query parameter', () => {
    const { parameters } = REQUEST_CONTEXT_TOOL_DEFINITION;
    const query = parameters.properties.query;

    expect(query.type).toBe('string');
    expect(query.description).toBeTruthy();
  });

  it('should have reason parameter', () => {
    const { parameters } = REQUEST_CONTEXT_TOOL_DEFINITION;
    const reason = parameters.properties.reason;

    expect(reason.type).toBe('string');
    expect(reason.description).toBeTruthy();
  });

  it('should have options parameter', () => {
    const { parameters } = REQUEST_CONTEXT_TOOL_DEFINITION;
    const options = parameters.properties.options;

    expect(options.type).toBe('object');
    expect(options.properties).toBeDefined();
    expect(options.properties?.max_tokens).toBeDefined();
    expect(options.properties?.include_context).toBeDefined();
    expect(options.properties?.limit).toBeDefined();
  });
});

// ============================================================================
// RequestContextToolHandler Tests
// ============================================================================

describe('RequestContextToolHandler', () => {
  let mockProvider: IDynamicContextProvider;
  let handler: RequestContextToolHandler;

  beforeEach(() => {
    mockProvider = createMockProvider();
    handler = new RequestContextToolHandler(mockProvider);
  });

  describe('parameter validation', () => {
    it('should reject missing request_type', async () => {
      const params = {
        query: 'test.ts',
        reason: 'Need to check file',
      } as unknown as RequestContextParams;

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('request_type is required');
    });

    it('should reject invalid request_type', async () => {
      const params: RequestContextParams = {
        request_type: 'invalid' as ContextRequestType,
        query: 'test.ts',
        reason: 'Need to check file',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Invalid request_type');
    });

    it('should reject missing query', async () => {
      const params = {
        request_type: 'file',
        reason: 'Need to check file',
      } as unknown as RequestContextParams;

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('query is required');
    });

    it('should reject empty query', async () => {
      const params: RequestContextParams = {
        request_type: 'file',
        query: '   ',
        reason: 'Need to check file',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('query cannot be empty');
    });

    it('should reject missing reason', async () => {
      const params = {
        request_type: 'file',
        query: 'test.ts',
      } as unknown as RequestContextParams;

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('reason is required');
    });

    it('should reject invalid max_tokens', async () => {
      const params: RequestContextParams = {
        request_type: 'file',
        query: 'test.ts',
        reason: 'Need to check file',
        options: { max_tokens: -100 },
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('max_tokens must be a positive number');
    });

    it('should reject invalid limit', async () => {
      const params: RequestContextParams = {
        request_type: 'search',
        query: 'authentication',
        reason: 'Find auth code',
        options: { limit: 0 },
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('limit must be a positive number');
    });
  });

  describe('request execution', () => {
    it('should execute file request', async () => {
      const content = 'export function test() { return true; }';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'file')
      );

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'src/test.ts',
        reason: 'Need to check implementation',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain(content);
      expect(result.output).toContain('=== File: src/test.ts ===');
      expect(mockProvider.request).toHaveBeenCalledWith('agent-1', {
        type: 'file',
        query: 'src/test.ts',
        reason: 'Need to check implementation',
        options: undefined,
      });
    });

    it('should execute symbol request', async () => {
      const content = 'function calculateTotal(items: Item[]): number';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'symbol')
      );

      const params: RequestContextParams = {
        request_type: 'symbol',
        query: 'calculateTotal',
        reason: 'Need to understand function signature',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('=== Symbol: calculateTotal ===');
      expect(result.output).toContain(content);
    });

    it('should execute search request', async () => {
      const content = 'Found 3 matches:\n1. src/auth.ts\n2. src/login.ts';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'search')
      );

      const params: RequestContextParams = {
        request_type: 'search',
        query: 'authentication',
        reason: 'Find authentication related code',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('=== Search Results for: "authentication" ===');
    });

    it('should execute usages request', async () => {
      const content = 'Used in 5 places:\n- src/api.ts:42';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'usages')
      );

      const params: RequestContextParams = {
        request_type: 'usages',
        query: 'fetchUser',
        reason: 'Find where fetchUser is called',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('=== Usages of: fetchUser ===');
    });

    it('should execute definition request', async () => {
      const content = 'interface User { id: string; name: string; }';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'definition')
      );

      const params: RequestContextParams = {
        request_type: 'definition',
        query: 'User',
        reason: 'Need to see User type definition',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(true);
      expect(result.output).toContain('=== Definition: User ===');
    });

    it('should pass options to provider', async () => {
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse('content', 'file')
      );

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'test.ts',
        reason: 'Check file',
        options: {
          max_tokens: 5000,
          include_context: false,
          limit: 5,
        },
      };

      await handler.execute('agent-1', params);

      expect(mockProvider.request).toHaveBeenCalledWith('agent-1', {
        type: 'file',
        query: 'test.ts',
        reason: 'Check file',
        options: {
          maxTokens: 5000,
          includeContext: false,
          limit: 5,
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle failed response', async () => {
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createErrorResponse('File not found', 'file')
      );

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'nonexistent.ts',
        reason: 'Check file',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Failed to get context');
      expect(result.output).toContain('File not found');
    });

    it('should handle provider exception', async () => {
      vi.mocked(mockProvider.request).mockRejectedValueOnce(
        new Error('Provider crashed')
      );

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'test.ts',
        reason: 'Check file',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Error executing context request');
      expect(result.output).toContain('Provider crashed');
    });
  });

  describe('output formatting', () => {
    it('should include token count in footer', async () => {
      const content = 'export const value = 42;';
      vi.mocked(mockProvider.request).mockResolvedValueOnce({
        ...createSuccessResponse(content, 'file'),
        tokenCount: 100,
        source: 'src/constants.ts',
      });

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'src/constants.ts',
        reason: 'Check constants',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.output).toContain('100 tokens');
      expect(result.output).toContain('src/constants.ts');
    });

    it('should include metadata in result', async () => {
      vi.mocked(mockProvider.request).mockResolvedValueOnce({
        ...createSuccessResponse('content', 'file'),
        metadata: { lineCount: 50 },
      });

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'test.ts',
        reason: 'Check file',
      };

      const result = await handler.execute('agent-1', params);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.requestId).toBe('req_123');
      expect(result.metadata?.lineCount).toBe(50);
    });

    it('should skip formatting when disabled', async () => {
      const content = 'raw content';
      vi.mocked(mockProvider.request).mockResolvedValueOnce(
        createSuccessResponse(content, 'file')
      );

      const handlerNoFormat = new RequestContextToolHandler(mockProvider, false);

      const params: RequestContextParams = {
        request_type: 'file',
        query: 'test.ts',
        reason: 'Check file',
      };

      const result = await handlerNoFormat.execute('agent-1', params);

      expect(result.output).toBe(content);
      expect(result.output).not.toContain('===');
    });
  });

  describe('utility methods', () => {
    it('should get remaining budget', () => {
      vi.mocked(mockProvider.getRemainingBudget).mockReturnValue(5000);

      const budget = handler.getRemainingBudget('agent-1');

      expect(budget).toBe(5000);
      expect(mockProvider.getRemainingBudget).toHaveBeenCalledWith('agent-1');
    });

    it('should check if agent is registered', () => {
      vi.mocked(mockProvider.getRemainingBudget).mockReturnValue(10000);

      const isRegistered = handler.isAgentRegistered('agent-1');

      expect(isRegistered).toBe(true);
    });

    it('should return false for unregistered agent', () => {
      vi.mocked(mockProvider.getRemainingBudget).mockReturnValue(0);

      const isRegistered = handler.isAgentRegistered('agent-1');

      expect(isRegistered).toBe(false);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createRequestContextTool', () => {
  it('should create tool with definition and handler', () => {
    const mockProvider = createMockProvider();

    const tool = createRequestContextTool(mockProvider);

    expect(tool.definition).toBe(REQUEST_CONTEXT_TOOL_DEFINITION);
    expect(tool.handler).toBeInstanceOf(RequestContextToolHandler);
  });

  it('should pass format option to handler', async () => {
    const mockProvider = createMockProvider();
    vi.mocked(mockProvider.request).mockResolvedValueOnce(
      createSuccessResponse('content', 'file')
    );

    const tool = createRequestContextTool(mockProvider, false);

    const result = await tool.handler.execute('agent-1', {
      request_type: 'file',
      query: 'test.ts',
      reason: 'Check file',
    });

    expect(result.output).toBe('content');
    expect(result.output).not.toContain('===');
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('isRequestContextToolCall', () => {
  it('should return true for request_context', () => {
    expect(isRequestContextToolCall('request_context')).toBe(true);
  });

  it('should return false for other tool names', () => {
    expect(isRequestContextToolCall('read_file')).toBe(false);
    expect(isRequestContextToolCall('write_file')).toBe(false);
    expect(isRequestContextToolCall('search')).toBe(false);
  });
});

describe('parseRequestContextParams', () => {
  it('should parse valid params', () => {
    const params = {
      request_type: 'file',
      query: 'test.ts',
      reason: 'Check file',
      options: { max_tokens: 5000 },
    };

    const result = parseRequestContextParams(params);

    expect(result).toEqual({
      request_type: 'file',
      query: 'test.ts',
      reason: 'Check file',
      options: { max_tokens: 5000 },
    });
  });

  it('should return null for missing request_type', () => {
    const params = {
      query: 'test.ts',
      reason: 'Check file',
    };

    const result = parseRequestContextParams(params);

    expect(result).toBeNull();
  });

  it('should return null for missing query', () => {
    const params = {
      request_type: 'file',
      reason: 'Check file',
    };

    const result = parseRequestContextParams(params);

    expect(result).toBeNull();
  });

  it('should return null for missing reason', () => {
    const params = {
      request_type: 'file',
      query: 'test.ts',
    };

    const result = parseRequestContextParams(params);

    expect(result).toBeNull();
  });

  it('should handle missing options', () => {
    const params = {
      request_type: 'file',
      query: 'test.ts',
      reason: 'Check file',
    };

    const result = parseRequestContextParams(params);

    expect(result).not.toBeNull();
    expect(result?.options).toBeUndefined();
  });

  it('should handle invalid options type', () => {
    const params = {
      request_type: 'file',
      query: 'test.ts',
      reason: 'Check file',
      options: 'invalid',
    };

    const result = parseRequestContextParams(params);

    expect(result).not.toBeNull();
    expect(result?.options).toBeUndefined();
  });
});
