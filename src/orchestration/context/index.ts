/**
 * Fresh Context Manager Module - Public Exports
 *
 * This module provides all exports for the Fresh Context Manager system,
 * which ensures agents receive clean, relevant context for each task.
 *
 * Layer 2: Orchestration - Context management subsystem
 *
 * @module context
 *
 * @example
 * ```typescript
 * import {
 *   FreshContextManager,
 *   TokenBudgeter,
 *   ContextBuilder,
 *   AgentContextIntegration,
 *   createFreshContextManager,
 * } from './context';
 *
 * // Create components
 * const budgeter = new TokenBudgeter();
 * const builder = createContextBuilder({ ... });
 * const manager = createFreshContextManager(budgeter, builder, projectConfig);
 *
 * // Build fresh context
 * const context = await manager.buildFreshContext(taskSpec);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core task types
  TaskSpec,
  TaskContext,
  FileContent,
  FileIncludeReason,
  CodebaseDocsSummary,
  ContextProjectConfig,
  MemoryEntry,

  // Options and configuration
  ContextOptions,

  // Token budget types
  TokenBreakdown,
  TokenBudget,
  ContextContent,
  TokenAllocation,

  // Validation types
  ContextValidation,
  ContextStats,

  // Interface types
  IFreshContextManager,
  ITokenBudgeter,
  IContextBuilder,

  // Agent integration types
  AgentContextMap,
  TaskContextMap,
  AgentContextResult,

  // Re-exported from CodeMemory
  CodeSearchResult,
} from './types';

export { DEFAULT_CONTEXT_OPTIONS } from './types';

// ============================================================================
// Class Exports
// ============================================================================

export {
  TokenBudgeter,
  createTokenBudgeter,
  createCustomTokenBudgeter,
  TOKEN_CONSTANTS,
} from './TokenBudgeter';

export {
  FreshContextManager,
  createFreshContextManager,
  createTestFreshContextManager,
  type TestFreshContextManagerOptions,
} from './FreshContextManager';

export {
  ContextBuilder,
  createContextBuilder,
  createMockContextBuilder,
  DEFAULT_CONTEXT_BUILDER_OPTIONS,
  type ContextBuilderOptions,
  type IMemorySystem,
} from './ContextBuilder';

export {
  AgentContextIntegration,
  createAgentContextIntegration,
  type AgentContextStatus,
  type AgentContextInfo,
  type AgentContextIntegrationOptions,
} from './AgentContextIntegration';

// ============================================================================
// Factory Functions
// ============================================================================

import { TokenBudgeter } from './TokenBudgeter';
import { FreshContextManager } from './FreshContextManager';
import { ContextBuilder } from './ContextBuilder';
import { AgentContextIntegration } from './AgentContextIntegration';
import type { ContextProjectConfig } from './types';
import type { RepoMapGenerator } from '../../infrastructure/analysis/RepoMapGenerator';
import type { CodebaseAnalyzer } from '../../infrastructure/analysis/codebase/CodebaseAnalyzer';
import type { ICodeMemory } from '../../persistence/memory/code/types';
import type { IMemorySystem, ContextBuilderOptions } from './ContextBuilder';

/**
 * Configuration for creating a full context management system
 */
export interface ContextSystemConfig {
  /** Project configuration */
  projectConfig: ContextProjectConfig;

  /** External dependencies (all optional) */
  dependencies?: {
    repoMapGenerator?: RepoMapGenerator | null;
    codebaseAnalyzer?: CodebaseAnalyzer | null;
    codeMemory?: ICodeMemory | null;
    memorySystem?: IMemorySystem | null;
  };

  /** Context builder options */
  builderOptions?: ContextBuilderOptions;

  /** Custom fixed budget settings */
  customBudget?: {
    systemPrompt?: number;
    repoMap?: number;
    codebaseDocs?: number;
    taskSpec?: number;
    reserved?: number;
  };
}

/**
 * Result of creating a context management system
 */
export interface ContextSystem {
  /** Token budgeter instance */
  budgeter: TokenBudgeter;
  /** Context builder instance */
  builder: ContextBuilder;
  /** Fresh context manager instance */
  manager: FreshContextManager;
  /** Agent context integration instance */
  integration: AgentContextIntegration;
}

/**
 * Create a complete context management system
 *
 * This is the main factory function for creating all context management
 * components with proper wiring.
 *
 * @param config Configuration for the system
 * @returns Complete context system with all components
 *
 * @example
 * ```typescript
 * const system = createContextSystem({
 *   projectConfig: {
 *     name: 'my-project',
 *     path: '/path/to/project',
 *     language: 'typescript',
 *   },
 *   dependencies: {
 *     codeMemory: myCodeMemory,
 *   },
 * });
 *
 * // Build context using the system
 * const context = await system.manager.buildFreshContext(taskSpec);
 *
 * // Or use integration for agent management
 * const result = await system.integration.prepareAgentContext(agentId, taskSpec);
 * ```
 */
export function createContextSystem(config: ContextSystemConfig): ContextSystem {
  // Create budgeter - cast customBudget to proper type since interface uses number
  // but TokenBudgeter expects Partial<typeof DEFAULT_FIXED_BUDGET>
  const budgeter = config.customBudget
    ? new TokenBudgeter(config.customBudget as Partial<{
        systemPrompt: number;
        repoMap: number;
        codebaseDocs: number;
        taskSpec: number;
        reserved: number;
      }>)
    : new TokenBudgeter();

  // Create builder
  const builder = new ContextBuilder(
    config.dependencies ?? {},
    config.builderOptions
  );

  // Create manager
  const manager = new FreshContextManager(
    budgeter,
    builder,
    config.projectConfig
  );

  // Create integration
  const integration = new AgentContextIntegration(manager);

  return {
    budgeter,
    builder,
    manager,
    integration,
  };
}

/**
 * Create a minimal context system for testing
 *
 * @param projectConfig Optional project config override
 * @returns Context system with mock dependencies
 */
export function createTestContextSystem(
  projectConfig?: Partial<ContextProjectConfig>
): ContextSystem {
  return createContextSystem({
    projectConfig: {
      name: 'test-project',
      path: '/test',
      language: 'typescript',
      framework: 'vitest',
      testFramework: 'vitest',
      ...projectConfig,
    },
  });
}


// ============================================================================
// Dynamic Context Submodule Exports
// ============================================================================

/**
 * Dynamic Context Provider - allows agents to request additional context
 * mid-task while respecting token budgets.
 *
 * @see ./dynamic/README.md for detailed documentation
 */
export * from './dynamic';
