/**
 * Nexus Agent Components
 *
 * This module exports all agent-related components for the Nexus UI.
 * These components are used to display agent status, activity, and QA pipeline state.
 *
 * Components:
 * - AgentBadge - Small badge showing agent type with icon and status dot
 * - AgentCard - Detailed card showing agent info, task, progress, metrics
 * - AgentActivity - Terminal-like real-time output display
 * - AgentPoolStatus - Overview of all agents in the pool
 * - QAStatusPanel - QA pipeline status (Build/Lint/Test/Review)
 * - IterationCounter - Displays iteration count with optional progress indicator
 *
 * Types:
 * - AgentType, AgentStatus - Re-exported from tokens
 * - AgentData, PoolAgent - Data structures for agent information
 * - QAStep, QAStepType, QAStepStatus - QA pipeline types
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { AgentBadge, type AgentBadgeProps } from './AgentBadge'
export { AgentCard, type AgentCardProps, type AgentData } from './AgentCard'
export { AgentActivity, type AgentActivityProps } from './AgentActivity'
export { AgentPoolStatus, type AgentPoolStatusProps, type PoolAgent } from './AgentPoolStatus'
export {
  QAStatusPanel,
  type QAStatusPanelProps,
  type QAStep,
  type QAStepType,
  type QAStepStatus,
} from './QAStatusPanel'
export { IterationCounter, type IterationCounterProps } from './IterationCounter'

// =============================================================================
// RE-EXPORTED TYPES
// =============================================================================

export type { AgentType, AgentStatus } from '@renderer/styles/tokens'
