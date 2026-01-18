/**
 * Dynamic Context Provider Types and Interfaces
 *
 * This module defines all TypeScript types for the Dynamic Context Provider system,
 * which enables agents to request additional context mid-task.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * Philosophy: Agents often discover they need more context during execution.
 * - Allow agents to request specific files
 * - Allow agents to search for symbols
 * - Allow agents to find related code
 * - Track and budget token usage per agent
 */

// ============================================================================
// Core Request Types
// ============================================================================

/**
 * Types of context requests an agent can make
 */
export type ContextRequestType =
  | 'file'       // Request file contents
  | 'symbol'     // Request symbol definition and info
  | 'search'     // Semantic code search
  | 'usages'     // Find where a symbol is used
  | 'definition'; // Find where a symbol is defined

/**
 * A context request from an agent
 */
export interface ContextRequest {
  /** Type of context being requested */
  type: ContextRequestType;
  /** The query - file path, symbol name, or search term */
  query: string;
  /** ID of the agent making the request */
  agentId: string;
  /** ID of the task the agent is working on */
  taskId: string;
  /** Brief explanation of why the context is needed */
  reason: string;
  /** Optional request configuration */
  options?: ContextRequestOptions;
  /** When the request was made */
  timestamp: Date;
}

/**
 * Options for configuring a context request
 */
export interface ContextRequestOptions {
  /** Maximum tokens for the response (default: 10000) */
  maxTokens?: number;
  /** Include surrounding context for symbols/usages (default: true) */
  includeContext?: boolean;
  /** Depth of context inclusion (1 = immediate, 2 = transitive) */
  depth?: number;
  /** File pattern for filtering results (e.g., '*.ts', 'src/**') */
  filePattern?: string;
  /** Maximum number of results for search/usages (default: 10) */
  limit?: number;
}

/**
 * Default request options
 */
export const DEFAULT_REQUEST_OPTIONS: Required<ContextRequestOptions> = {
  maxTokens: 10000,
  includeContext: true,
  depth: 1,
  filePattern: '**/*',
  limit: 10,
};

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response to a context request
 */
export interface ContextResponse {
  /** Whether the request succeeded */
  success: boolean;
  /** Unique identifier for this request */
  requestId: string;
  /** Type of request that was made */
  type: ContextRequestType;
  /** The requested content */
  content: string;
  /** Number of tokens in the content */
  tokenCount: number;
  /** Source of the content (file path, search engine, etc.) */
  source: string;
  /** Additional metadata about the response */
  metadata?: Record<string, unknown>;
  /** Error message if the request failed */
  error?: string;
}

// ============================================================================
// Symbol Types
// ============================================================================

/**
 * Kind of symbol
 */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'method'
  | 'property'
  | 'enum'
  | 'constant';

/**
 * Context about a code symbol
 */
export interface SymbolContext {
  /** Symbol name */
  name: string;
  /** Kind of symbol */
  kind: SymbolKind;
  /** File containing the symbol */
  file: string;
  /** Line number of definition */
  line: number;
  /** Column number of definition */
  column: number;
  /** Full signature of the symbol */
  signature: string;
  /** Documentation comment if available */
  documentation?: string;
  /** Where this symbol is used */
  usages: SymbolUsage[];
  /** Other symbols related to this one */
  relatedSymbols: string[];
}

/**
 * Type of symbol usage
 */
export type SymbolUsageType =
  | 'call'           // Function/method call
  | 'import'         // Import statement
  | 'reference'      // Variable reference
  | 'assignment'     // Assignment target
  | 'type_reference'; // Used as a type

/**
 * A single usage of a symbol
 */
export interface SymbolUsage {
  /** File containing the usage */
  file: string;
  /** Line number of usage */
  line: number;
  /** Column number of usage */
  column: number;
  /** Code snippet showing the usage */
  context: string;
  /** How the symbol is being used */
  usageType: SymbolUsageType;
}

// ============================================================================
// Search Result Types
// ============================================================================

/**
 * Results from a code search
 */
export interface SearchResults {
  /** The search query */
  query: string;
  /** Matching results */
  results: SearchResultItem[];
  /** Total number of matches found */
  totalMatches: number;
  /** Whether results were truncated to fit budget */
  truncated: boolean;
  /** Total tokens in the results */
  tokenCount: number;
}

/**
 * A single search result
 */
export interface SearchResultItem {
  /** File containing the match */
  file: string;
  /** Starting line number */
  startLine: number;
  /** Ending line number */
  endLine: number;
  /** Content of the match with surrounding context */
  content: string;
  /** Relevance score (0.0 to 1.0) */
  score: number;
  /** Highlighted portions of the content */
  highlights?: string[];
}

// ============================================================================
// Agent Registration Types
// ============================================================================

/**
 * Registration record for an agent using the dynamic context provider
 */
export interface AgentRegistration {
  /** Unique agent identifier */
  agentId: string;
  /** ID of the task the agent is working on */
  taskId: string;
  /** Maximum tokens the agent can request */
  tokenBudget: number;
  /** Tokens used so far */
  usedTokens: number;
  /** History of requests made by this agent */
  requests: ContextRequest[];
  /** When the agent was registered */
  registeredAt: Date;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Interface for the Dynamic Context Provider
 *
 * This is the main service that agents use to request additional context
 * during task execution. It tracks token budgets and request history.
 */
export interface IDynamicContextProvider {
  // -------------------- Registration --------------------

  /**
   * Register an agent to use the context provider
   *
   * @param agentId Unique agent identifier
   * @param taskId ID of the task being worked on
   * @param tokenBudget Optional token budget (default: 50000)
   */
  registerAgent(agentId: string, taskId: string, tokenBudget?: number): void;

  /**
   * Unregister an agent when done
   *
   * @param agentId Agent to unregister
   */
  unregisterAgent(agentId: string): void;

  // -------------------- Context Requests --------------------

  /**
   * Request file contents
   *
   * @param agentId Requesting agent
   * @param filePath Path to the file
   * @param reason Why the file is needed
   * @returns Context response with file contents
   */
  requestFile(
    agentId: string,
    filePath: string,
    reason: string
  ): Promise<ContextResponse>;

  /**
   * Request symbol information
   *
   * @param agentId Requesting agent
   * @param symbolName Name of the symbol
   * @param reason Why the symbol info is needed
   * @returns Context response with symbol info
   */
  requestSymbol(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse>;

  /**
   * Search for code matching a query
   *
   * @param agentId Requesting agent
   * @param query Search query
   * @param reason Why the search is needed
   * @returns Context response with search results
   */
  requestSearch(
    agentId: string,
    query: string,
    reason: string
  ): Promise<ContextResponse>;

  /**
   * Find usages of a symbol
   *
   * @param agentId Requesting agent
   * @param symbolName Name of the symbol
   * @param reason Why usages are needed
   * @returns Context response with usage locations
   */
  requestUsages(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse>;

  /**
   * Find definition of a symbol
   *
   * @param agentId Requesting agent
   * @param symbolName Name of the symbol
   * @param reason Why the definition is needed
   * @returns Context response with definition
   */
  requestDefinition(
    agentId: string,
    symbolName: string,
    reason: string
  ): Promise<ContextResponse>;

  // -------------------- Batch Requests --------------------

  /**
   * Request multiple files at once
   *
   * @param agentId Requesting agent
   * @param filePaths Paths to the files
   * @param reason Why the files are needed
   * @returns Array of context responses
   */
  requestFiles(
    agentId: string,
    filePaths: string[],
    reason: string
  ): Promise<ContextResponse[]>;

  /**
   * Generic request method for any context type
   *
   * @param agentId Requesting agent
   * @param request Partial request (agentId, taskId, timestamp added automatically)
   * @returns Context response
   */
  request(
    agentId: string,
    request: Omit<ContextRequest, 'agentId' | 'taskId' | 'timestamp'>
  ): Promise<ContextResponse>;

  // -------------------- Budget Tracking --------------------

  /**
   * Get remaining token budget for an agent
   *
   * @param agentId Agent to check
   * @returns Remaining tokens (0 if not registered)
   */
  getRemainingBudget(agentId: string): number;

  /**
   * Get tokens used by an agent
   *
   * @param agentId Agent to check
   * @returns Used tokens (0 if not registered)
   */
  getUsedTokens(agentId: string): number;

  /**
   * Get request history for an agent
   *
   * @param agentId Agent to check
   * @returns Array of requests (empty if not registered)
   */
  getRequestHistory(agentId: string): ContextRequest[];
}

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Interface for request handlers
 *
 * Each handler is responsible for processing one or more request types.
 */
export interface IRequestHandler {
  /**
   * Check if this handler can process the given request type
   *
   * @param type Request type to check
   * @returns True if this handler can process it
   */
  canHandle(type: ContextRequestType): boolean;

  /**
   * Handle a context request
   *
   * @param request The request to handle
   * @returns Context response
   */
  handle(request: ContextRequest): Promise<ContextResponse>;
}

// ============================================================================
// Provider Options
// ============================================================================

/**
 * Options for configuring the Dynamic Context Provider
 */
export interface DynamicContextProviderOptions {
  /** Default token budget per agent */
  defaultTokenBudget?: number;
  /** Project root path for file resolution */
  projectRoot?: string;
  /** Whether to log request activity */
  logRequests?: boolean;
}

/**
 * Default provider options
 */
export const DEFAULT_PROVIDER_OPTIONS: Required<DynamicContextProviderOptions> = {
  defaultTokenBudget: 50000,
  projectRoot: process.cwd(),
  logRequests: true,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when an agent is not registered
 */
export class AgentNotRegisteredError extends Error {
  constructor(public readonly agentId: string) {
    super(`Agent '${agentId}' is not registered with the context provider`);
    this.name = 'AgentNotRegisteredError';
  }
}

/**
 * Error thrown when token budget is exceeded
 */
export class TokenBudgetExceededError extends Error {
  constructor(
    public readonly agentId: string,
    public readonly requested: number,
    public readonly remaining: number
  ) {
    super(
      `Agent '${agentId}' exceeded token budget. Requested: ${requested}, Remaining: ${remaining}`
    );
    this.name = 'TokenBudgetExceededError';
  }
}

/**
 * Error thrown when no handler is found for a request type
 */
export class NoHandlerFoundError extends Error {
  constructor(public readonly requestType: ContextRequestType) {
    super(`No handler found for request type: ${requestType}`);
    this.name = 'NoHandlerFoundError';
  }
}
