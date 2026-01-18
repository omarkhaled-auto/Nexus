/**
 * RequestContextTool - Agent Tool for Dynamic Context Requests
 *
 * Exposes the DynamicContextProvider as a tool that agents can use
 * to request additional code context during task execution.
 *
 * Layer 4: Execution - Agent Tools
 *
 * Philosophy: When agents need more context to complete their task,
 * they can use this tool to request specific files, symbols, or search
 * for related code - all while respecting their token budget.
 *
 * @module RequestContextTool
 */

import type {
  ContextRequestType,
  ContextRequestOptions,
  ContextResponse,
  IDynamicContextProvider,
} from '../../orchestration/context/dynamic/types';

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * JSON Schema for tool parameters
 */
export interface ToolParameterSchema {
  type: string;
  properties: Record<string, PropertySchema>;
  required: string[];
}

/**
 * Schema for individual parameter properties
 */
export interface PropertySchema {
  type: string;
  description: string;
  enum?: string[];
  properties?: Record<string, PropertySchema>;
}

/**
 * Tool definition structure for LLM function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  output: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * REQUEST_CONTEXT_TOOL_DEFINITION
 *
 * Tool definition for the request_context function.
 * This is exposed to agents through the LLM function calling interface.
 */
export const REQUEST_CONTEXT_TOOL_DEFINITION: ToolDefinition = {
  name: 'request_context',
  description: `Request additional code context when you need to understand more of the codebase. Use this tool when you need to:
- See the contents of a specific file
- Find where a symbol (function, class, type) is defined
- Search for code related to a concept or pattern
- Find all places where a symbol is used
- Get the definition and signature of a function or type

This helps you make informed decisions by examining relevant code before making changes.`,
  parameters: {
    type: 'object',
    properties: {
      request_type: {
        type: 'string',
        enum: ['file', 'symbol', 'search', 'usages', 'definition'],
        description: `Type of context to request:
- file: Get the contents of a specific file by path
- symbol: Find information about a symbol (function, class, interface, etc.)
- search: Semantic code search for patterns or concepts
- usages: Find all places where a symbol is used
- definition: Find where a symbol is defined`,
      },
      query: {
        type: 'string',
        description: 'The file path, symbol name, or search query depending on request_type',
      },
      reason: {
        type: 'string',
        description:
          'Brief explanation of why you need this context (helps with tracking and debugging)',
      },
      options: {
        type: 'object',
        description: 'Optional configuration for the request',
        properties: {
          max_tokens: {
            type: 'number',
            description: 'Maximum tokens for the response (default: 10000)',
          },
          include_context: {
            type: 'boolean',
            description:
              'Include surrounding code context for symbols/usages (default: true)',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of results for search/usages (default: 10)',
          },
        },
      },
    },
    required: ['request_type', 'query', 'reason'],
  },
};

// ============================================================================
// Tool Handler Parameters
// ============================================================================

/**
 * Parameters for the request_context tool
 */
export interface RequestContextParams {
  request_type: ContextRequestType;
  query: string;
  reason: string;
  options?: {
    max_tokens?: number;
    include_context?: boolean;
    limit?: number;
  };
}

// ============================================================================
// RequestContextToolHandler
// ============================================================================

/**
 * RequestContextToolHandler
 *
 * Handles execution of the request_context tool by routing
 * to the DynamicContextProvider.
 */
export class RequestContextToolHandler {
  private readonly provider: IDynamicContextProvider;
  private readonly formatOutput: boolean;

  /**
   * Create a new RequestContextToolHandler
   *
   * @param provider DynamicContextProvider instance
   * @param formatOutput Whether to format output for agent consumption (default: true)
   */
  constructor(provider: IDynamicContextProvider, formatOutput = true) {
    this.provider = provider;
    this.formatOutput = formatOutput;
  }

  /**
   * Execute the tool with given parameters
   *
   * @param agentId ID of the agent making the request
   * @param params Tool parameters
   * @returns Execution result with formatted output
   */
  async execute(
    agentId: string,
    params: RequestContextParams
  ): Promise<ToolExecutionResult> {
    // Validate parameters
    const validationError = this.validateParams(params);
    if (validationError) {
      return {
        success: false,
        output: `Invalid parameters: ${validationError}`,
        metadata: { error: 'validation_error' },
      };
    }

    // Convert options format (snake_case from LLM to camelCase for provider)
    const options: ContextRequestOptions | undefined = params.options
      ? {
          maxTokens: params.options.max_tokens,
          includeContext: params.options.include_context,
          limit: params.options.limit,
        }
      : undefined;

    // Route to appropriate provider method based on request type
    try {
      const response = await this.routeRequest(
        agentId,
        params.request_type,
        params.query,
        params.reason,
        options
      );

      // Format output for agent
      const output = this.formatOutput
        ? this.formatResponseForAgent(response, params)
        : response.content;

      return {
        success: response.success,
        output,
        metadata: {
          requestId: response.requestId,
          type: response.type,
          tokenCount: response.tokenCount,
          source: response.source,
          ...(response.metadata || {}),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: `Error executing context request: ${errorMessage}`,
        metadata: { error: 'execution_error' },
      };
    }
  }

  /**
   * Validate tool parameters
   * Note: We validate at runtime because params come from external sources (LLMs)
   */
  private validateParams(params: RequestContextParams): string | null {
    // Cast to unknown for runtime validation since input comes from external source
    const rawParams = params as unknown as Record<string, unknown>;

    if (!rawParams.request_type) {
      return 'request_type is required';
    }

    const validTypes: ContextRequestType[] = [
      'file',
      'symbol',
      'search',
      'usages',
      'definition',
    ];
    if (!validTypes.includes(params.request_type)) {
      return `Invalid request_type: ${params.request_type}. Must be one of: ${validTypes.join(', ')}`;
    }

    if (!params.query || typeof params.query !== 'string') {
      return 'query is required and must be a string';
    }

    if (params.query.trim().length === 0) {
      return 'query cannot be empty';
    }

    if (!params.reason || typeof params.reason !== 'string') {
      return 'reason is required and must be a string';
    }

    // Validate options if provided
    if (params.options) {
      if (
        params.options.max_tokens !== undefined &&
        (typeof params.options.max_tokens !== 'number' ||
          params.options.max_tokens <= 0)
      ) {
        return 'max_tokens must be a positive number';
      }

      if (
        params.options.limit !== undefined &&
        (typeof params.options.limit !== 'number' || params.options.limit <= 0)
      ) {
        return 'limit must be a positive number';
      }
    }

    return null;
  }

  /**
   * Route request to appropriate provider method
   */
  private async routeRequest(
    agentId: string,
    type: ContextRequestType,
    query: string,
    reason: string,
    options?: ContextRequestOptions
  ): Promise<ContextResponse> {
    // Use the generic request method for all types
    return this.provider.request(agentId, {
      type,
      query,
      reason,
      options,
    });
  }

  /**
   * Format response for agent consumption
   */
  private formatResponseForAgent(
    response: ContextResponse,
    params: RequestContextParams
  ): string {
    if (!response.success) {
      return `Failed to get context: ${response.error ?? 'Unknown error'}`;
    }

    const header = this.getResponseHeader(params);
    const content = response.content;
    const footer = this.getResponseFooter(response);

    return `${header}\n\n${content}\n\n${footer}`;
  }

  /**
   * Generate header for formatted response
   */
  private getResponseHeader(params: RequestContextParams): string {
    switch (params.request_type) {
      case 'file':
        return `=== File: ${params.query} ===`;
      case 'symbol':
        return `=== Symbol: ${params.query} ===`;
      case 'definition':
        return `=== Definition: ${params.query} ===`;
      case 'search':
        return `=== Search Results for: "${params.query}" ===`;
      case 'usages':
        return `=== Usages of: ${params.query} ===`;
      default:
        return `=== Context: ${params.query} ===`;
    }
  }

  /**
   * Generate footer for formatted response
   */
  private getResponseFooter(response: ContextResponse): string {
    return `=== End (${response.tokenCount} tokens from ${response.source}) ===`;
  }

  /**
   * Get remaining token budget for an agent
   */
  getRemainingBudget(agentId: string): number {
    return this.provider.getRemainingBudget(agentId);
  }

  /**
   * Check if an agent is registered
   */
  isAgentRegistered(agentId: string): boolean {
    // Try to get budget - if 0, might not be registered
    // This is a workaround since IDynamicContextProvider doesn't have isRegistered
    const budget = this.provider.getRemainingBudget(agentId);
    return budget > 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a request context tool with handler
 *
 * @param provider DynamicContextProvider instance
 * @param formatOutput Whether to format output for agent consumption
 * @returns Object containing tool definition and handler
 */
export function createRequestContextTool(
  provider: IDynamicContextProvider,
  formatOutput = true
): {
  definition: ToolDefinition;
  handler: RequestContextToolHandler;
} {
  const handler = new RequestContextToolHandler(provider, formatOutput);

  return {
    definition: REQUEST_CONTEXT_TOOL_DEFINITION,
    handler,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a tool call is for the request_context tool
 */
export function isRequestContextToolCall(
  toolName: string
): toolName is 'request_context' {
  return toolName === 'request_context';
}

/**
 * Parse tool parameters from LLM function call
 */
export function parseRequestContextParams(
  params: Record<string, unknown>
): RequestContextParams | null {
  if (
    typeof params.request_type !== 'string' ||
    typeof params.query !== 'string' ||
    typeof params.reason !== 'string'
  ) {
    return null;
  }

  return {
    request_type: params.request_type as ContextRequestType,
    query: params.query,
    reason: params.reason,
    options:
      typeof params.options === 'object' && params.options !== null
        ? (params.options as RequestContextParams['options'])
        : undefined,
  };
}
