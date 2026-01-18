/**
 * Agents Module Barrel Export
 *
 * Exports all agent runner components for use in the orchestration system.
 * These agents are used by AgentPool to execute tasks.
 *
 * Layer 4: Execution - Agents subsystem
 *
 * @module execution/agents
 */

// ============================================================================
// Base Agent Runner
// ============================================================================

export { BaseAgentRunner } from './BaseAgentRunner';
export type {
  AgentConfig,
  AgentContext,
  AgentTaskResult,
  Message,
} from './BaseAgentRunner';

// ============================================================================
// Specialized Agents
// ============================================================================

// CoderAgent - writes code using Claude
export { CoderAgent } from './CoderAgent';

// TesterAgent - writes tests using Claude
export { TesterAgent } from './TesterAgent';

// ReviewerAgent - reviews code using Gemini
export { ReviewerAgent } from './ReviewerAgent';
export type {
  ReviewSeverity,
  ReviewIssue,
  ReviewOutput,
} from './ReviewerAgent';

// MergerAgent - handles merge conflict resolution using Claude
export { MergerAgent } from './MergerAgent';
export type {
  ConflictSeverity,
  ConflictType,
  MergeConflict,
  MergeResolution,
  MergeOutput,
} from './MergerAgent';

// ============================================================================
// Prompt Loading
// ============================================================================

export { loadPrompt, clearPromptCache, preloadPrompts } from './PromptLoader';
