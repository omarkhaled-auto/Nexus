/**
 * Dynamic Context Provider Module
 *
 * Provides dynamic context request capabilities for agents during task execution.
 * Agents can request additional files, symbols, search results, and usages
 * while respecting token budgets.
 *
 * Layer 2: Orchestration - Dynamic context subsystem
 *
 * @module DynamicContext
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Request types
  ContextRequestType,
  ContextRequest,
  ContextRequestOptions,

  // Response types
  ContextResponse,

  // Symbol types
  SymbolKind,
  SymbolContext,
  SymbolUsage,
  SymbolUsageType,

  // Search types
  SearchResults,
  SearchResultItem,

  // Registration types
  AgentRegistration,

  // Interface types
  IDynamicContextProvider,
  IRequestHandler,

  // Options types
  DynamicContextProviderOptions,
} from './types';

// ============================================================================
// Constant Exports
// ============================================================================

export {
  DEFAULT_REQUEST_OPTIONS,
  DEFAULT_PROVIDER_OPTIONS,
} from './types';

// ============================================================================
// Error Exports
// ============================================================================

export {
  AgentNotRegisteredError,
  TokenBudgetExceededError,
  NoHandlerFoundError,
} from './types';

// ============================================================================
// Provider Exports
// ============================================================================

export {
  DynamicContextProvider,
  createDynamicContextProvider,
} from './DynamicContextProvider';

// ============================================================================
// Handler Exports
// ============================================================================

export { FileRequestHandler } from './handlers/FileRequestHandler';
export { SymbolRequestHandler } from './handlers/SymbolRequestHandler';
export { SearchRequestHandler } from './handlers/SearchRequestHandler';

// ============================================================================
// Factory Function
// ============================================================================

import { DynamicContextProvider } from './DynamicContextProvider';
import { FileRequestHandler } from './handlers/FileRequestHandler';
import { SymbolRequestHandler } from './handlers/SymbolRequestHandler';
import { SearchRequestHandler } from './handlers/SearchRequestHandler';
import type {
  DynamicContextProviderOptions,
  IRequestHandler,
} from './types';

/**
 * Options for the full dynamic context provider factory
 */
export interface CreateFullProviderOptions extends DynamicContextProviderOptions {
  /** Optional custom handlers to add */
  additionalHandlers?: IRequestHandler[];
}

/**
 * Create a fully configured DynamicContextProvider with all handlers
 *
 * This is the recommended way to create a provider for production use.
 * It includes all built-in handlers (file, symbol, search).
 *
 * @param options Configuration options
 * @returns Configured DynamicContextProvider instance
 *
 * @example
 * ```typescript
 * const provider = createFullDynamicContextProvider({
 *   projectRoot: '/path/to/project',
 *   defaultTokenBudget: 100000,
 * });
 *
 * provider.registerAgent('agent-1', 'task-1');
 * const response = await provider.requestFile('agent-1', 'src/index.ts', 'Need entry point');
 * ```
 */
export function createFullDynamicContextProvider(
  options: CreateFullProviderOptions = {}
): DynamicContextProvider {
  const projectRoot = options.projectRoot ?? process.cwd();

  // Create built-in handlers
  const handlers: IRequestHandler[] = [
    new FileRequestHandler({ projectRoot }),
    new SymbolRequestHandler({ projectRoot }),
    new SearchRequestHandler({ projectRoot }),
  ];

  // Add any additional custom handlers
  if (options.additionalHandlers) {
    handlers.push(...options.additionalHandlers);
  }

  // Create and return provider
  return new DynamicContextProvider(handlers, {
    projectRoot,
    defaultTokenBudget: options.defaultTokenBudget,
    logRequests: options.logRequests,
  });
}
