/**
 * Dynamic Context Provider Implementation
 *
 * Manages agent context requests with token budget tracking.
 * Agents can request additional context mid-task through this provider.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * @module DynamicContextProvider
 */

import {
  AgentNotRegisteredError,
  AgentRegistration,
  ContextRequest,
  ContextRequestType,
  ContextResponse,
  DEFAULT_PROVIDER_OPTIONS,
  DEFAULT_REQUEST_OPTIONS,
  DynamicContextProviderOptions,
  IDynamicContextProvider,
  IRequestHandler,
  NoHandlerFoundError,
  TokenBudgetExceededError,
} from './types';

/**
 * Logger interface for dependency injection
 */
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  info: (message, meta) => console.log(`[DynamicContextProvider] INFO: ${message}`, meta || ''),
  debug: (message, meta) => console.log(`[DynamicContextProvider] DEBUG: ${message}`, meta || ''),
  warn: (message, meta) => console.warn(`[DynamicContextProvider] WARN: ${message}`, meta || ''),
  error: (message, meta) => console.error(`[DynamicContextProvider] ERROR: ${message}`, meta || ''),
};

/**
 * DynamicContextProvider - Main implementation
 *
 * Enables agents to request additional context during task execution.
 * Tracks token budgets and request history per agent.
 */
export class DynamicContextProvider implements IDynamicContextProvider {
  private readonly handlers: IRequestHandler[];
  private readonly registry: Map<string, AgentRegistration>;
  private readonly options: Required<DynamicContextProviderOptions>;
  private readonly logger: Logger;
  private requestCounter: number;

  /**
   * Create a new DynamicContextProvider
   *
   * @param handlers Array of request handlers
   * @param options Optional configuration
   * @param logger Optional logger instance
   */
  constructor(
    handlers: IRequestHandler[] = [],
    options: DynamicContextProviderOptions = {},
    logger: Logger = defaultLogger
  ) {
    this.handlers = handlers;
    this.registry = new Map();
    this.options = { ...DEFAULT_PROVIDER_OPTIONS, ...options };
    this.logger = logger;
    this.requestCounter = 0;

    this.logger.info('DynamicContextProvider initialized', {
      handlerCount: handlers.length,
      defaultBudget: this.options.defaultTokenBudget,
      projectRoot: this.options.projectRoot,
    });
  }

  // ============================================================================
  // Registration Methods
  // ============================================================================

  /**
   * Register an agent to use the context provider
   */
  registerAgent(agentId: string, taskId: string, tokenBudget?: number): void {
    const budget = tokenBudget ?? this.options.defaultTokenBudget;

    const registration: AgentRegistration = {
      agentId,
      taskId,
      tokenBudget: budget,
      usedTokens: 0,
      requests: [],
      registeredAt: new Date(),
    };

    this.registry.set(agentId, registration);

    if (this.options.logRequests) {
      this.logger.info('Agent registered', {
        agentId,
        taskId,
        tokenBudget: budget,
      });
    }
  }

  /**
   * Unregister an agent when done
   */
  unregisterAgent(agentId: string): void {
    const registration = this.registry.get(agentId);

    if (registration && this.options.logRequests) {
      this.logger.info('Agent unregistered', {
        agentId,
        taskId: registration.taskId,
        requestsMade: registration.requests.length,
        tokensUsed: registration.usedTokens,
        tokenBudget: registration.tokenBudget,
      });
    }

    this.registry.delete(agentId);
  }

  // ============================================================================
  // Context Request Methods
  // ============================================================================

  /**
   * Request file contents
   */
  async requestFile(
    agentId: string,
    filePath: string,
    reason: string
  ): Promise<ContextResponse> {
    return this.request(agentId, {
      type: 'file',
      query: filePath,
      reason,
    });
  }

  /**
   * Request symbol information
   */
  async requestSymbol(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse> {
    return this.request(agentId, {
      type: 'symbol',
      query: symbolName,
      reason,
    });
  }

  /**
   * Search for code matching a query
   */
  async requestSearch(
    agentId: string,
    query: string,
    reason: string
  ): Promise<ContextResponse> {
    return this.request(agentId, {
      type: 'search',
      query,
      reason,
    });
  }

  /**
   * Find usages of a symbol
   */
  async requestUsages(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse> {
    return this.request(agentId, {
      type: 'usages',
      query: symbolName,
      reason,
    });
  }

  /**
   * Find definition of a symbol
   */
  async requestDefinition(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse> {
    return this.request(agentId, {
      type: 'definition',
      query: symbolName,
      reason,
    });
  }

  /**
   * Request multiple files at once
   */
  async requestFiles(
    agentId: string,
    filePaths: string[],
    reason: string
  ): Promise<ContextResponse[]> {
    const responses: ContextResponse[] = [];

    for (const filePath of filePaths) {
      const response = await this.requestFile(agentId, filePath, reason);
      responses.push(response);

      // Stop if we've exceeded budget
      if (!response.success && response.error?.includes('budget')) {
        break;
      }
    }

    return responses;
  }

  /**
   * Generic request method for any context type
   */
  async request(
    agentId: string,
    partialRequest: Omit<ContextRequest, 'agentId' | 'taskId' | 'timestamp'>
  ): Promise<ContextResponse> {
    // Generate request ID early so we can use it for error responses
    const requestId = this.generateRequestId();

    // Validate agent is registered
    try {
      this.validateAgent(agentId);
    } catch (error) {
      return this.createErrorResponse(requestId, partialRequest.type, error);
    }

    const registration = this.registry.get(agentId)!;

    // Build full request
    const request: ContextRequest = {
      ...partialRequest,
      agentId,
      taskId: registration.taskId,
      timestamp: new Date(),
      options: {
        ...DEFAULT_REQUEST_OPTIONS,
        ...partialRequest.options,
      },
    };

    // Find handler
    let handler: IRequestHandler;
    try {
      handler = this.findHandler(request.type);
    } catch (error) {
      return this.createErrorResponse(requestId, request.type, error);
    }

    // Log the request
    if (this.options.logRequests) {
      this.logger.debug('Processing context request', {
        requestId,
        agentId,
        type: request.type,
        query: request.query,
        reason: request.reason,
      });
    }

    // Execute handler
    try {
      const response = await handler.handle(request);

      // Check budget before accepting response
      const remainingBudget = this.getRemainingBudget(agentId);
      if (response.tokenCount > remainingBudget) {
        throw new TokenBudgetExceededError(
          agentId,
          response.tokenCount,
          remainingBudget
        );
      }

      // Track the request and update tokens
      this.trackRequest(agentId, request, response);

      // Ensure requestId is set
      return {
        ...response,
        requestId,
      };
    } catch (error) {
      return this.createErrorResponse(requestId, request.type, error);
    }
  }

  // ============================================================================
  // Budget Tracking Methods
  // ============================================================================

  /**
   * Get remaining token budget for an agent
   */
  getRemainingBudget(agentId: string): number {
    const registration = this.registry.get(agentId);
    if (!registration) {
      return 0;
    }
    return Math.max(0, registration.tokenBudget - registration.usedTokens);
  }

  /**
   * Get tokens used by an agent
   */
  getUsedTokens(agentId: string): number {
    const registration = this.registry.get(agentId);
    if (!registration) {
      return 0;
    }
    return registration.usedTokens;
  }

  /**
   * Get request history for an agent
   */
  getRequestHistory(agentId: string): ContextRequest[] {
    const registration = this.registry.get(agentId);
    if (!registration) {
      return [];
    }
    return [...registration.requests];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate that an agent is registered
   * @throws AgentNotRegisteredError if agent is not registered
   */
  private validateAgent(agentId: string): void {
    if (!this.registry.has(agentId)) {
      throw new AgentNotRegisteredError(agentId);
    }
  }

  /**
   * Check if a request would exceed the agent's budget
   */
  private checkBudget(agentId: string, estimatedTokens: number): boolean {
    const remaining = this.getRemainingBudget(agentId);
    return estimatedTokens <= remaining;
  }

  /**
   * Find a handler that can process the given request type
   * @throws NoHandlerFoundError if no handler is found
   */
  private findHandler(type: ContextRequestType): IRequestHandler {
    const handler = this.handlers.find((h) => h.canHandle(type));
    if (!handler) {
      throw new NoHandlerFoundError(type);
    }
    return handler;
  }

  /**
   * Track a completed request and update token usage
   */
  private trackRequest(
    agentId: string,
    request: ContextRequest,
    response: ContextResponse
  ): void {
    const registration = this.registry.get(agentId);
    if (!registration) {
      return;
    }

    // Add to request history
    registration.requests.push(request);

    // Update token usage
    registration.usedTokens += response.tokenCount;

    if (this.options.logRequests) {
      this.logger.debug('Request tracked', {
        agentId,
        requestId: response.requestId,
        tokenCount: response.tokenCount,
        totalUsed: registration.usedTokens,
        remaining: this.getRemainingBudget(agentId),
      });
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    this.requestCounter += 1;
    const timestamp = Date.now().toString(36);
    const counter = this.requestCounter.toString(36).padStart(4, '0');
    return `ctx_${timestamp}_${counter}`;
  }

  /**
   * Create an error response
   */
  private createErrorResponse(
    requestId: string,
    type: ContextRequestType,
    error: unknown
  ): ContextResponse {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    this.logger.error('Request failed', {
      requestId,
      type,
      error: errorMessage,
    });

    return {
      success: false,
      requestId,
      type,
      content: '',
      tokenCount: 0,
      source: 'error',
      error: errorMessage,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the number of registered agents
   */
  getRegisteredAgentCount(): number {
    return this.registry.size;
  }

  /**
   * Check if an agent is registered
   */
  isAgentRegistered(agentId: string): boolean {
    return this.registry.has(agentId);
  }

  /**
   * Get all registered agent IDs
   */
  getRegisteredAgentIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get handler count
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Add a handler (for dynamic handler registration)
   */
  addHandler(handler: IRequestHandler): void {
    this.handlers.push(handler);
    this.logger.info('Handler added', {
      handlerCount: this.handlers.length,
    });
  }

  /**
   * Get project root path
   */
  getProjectRoot(): string {
    return this.options.projectRoot;
  }
}

/**
 * Factory function to create a DynamicContextProvider with default configuration
 */
export function createDynamicContextProvider(
  handlers: IRequestHandler[] = [],
  options: DynamicContextProviderOptions = {},
  logger?: Logger
): DynamicContextProvider {
  return new DynamicContextProvider(handlers, options, logger);
}
