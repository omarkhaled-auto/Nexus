/**
 * Interview Types for Renderer
 *
 * Renderer-specific interview types for the interview UI components.
 */

// ============================================================================
// Interview Stage Types
// ============================================================================

/**
 * Interview stages representing the conversation flow
 */
export type InterviewStage =
  | 'welcome'        // Initial welcome message
  | 'project_name'   // Getting project name
  | 'overview'       // High-level project overview
  | 'functional'     // Functional requirements
  | 'technical'      // Technical requirements
  | 'ui'             // UI/UX requirements
  | 'performance'    // Performance requirements
  | 'security'       // Security requirements
  | 'integration'    // Integration requirements
  | 'testing'        // Testing requirements
  | 'summary'        // Summary and confirmation
  | 'complete';      // Interview completed

/**
 * Message role in the interview conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Requirement categories that align with interview stages
 */
export type RequirementCategory =
  | 'functional'
  | 'technical'
  | 'ui'
  | 'performance'
  | 'security'
  | 'integration'
  | 'testing';

/**
 * Requirement priority levels
 */
export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';

// ============================================================================
// Interview Interfaces
// ============================================================================

/**
 * A message in the interview conversation
 */
export interface InterviewMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  category?: RequirementCategory;
  isStreaming?: boolean;
}

/**
 * A requirement captured during the interview
 */
export interface Requirement {
  id: string;
  category: RequirementCategory;
  text: string;
  priority: RequirementPriority;
  source: 'interview' | 'manual' | 'inferred';
  createdAt: number;
  updatedAt: number;
}

/**
 * Interview session data for persistence
 */
export interface InterviewSessionData {
  projectName: string | null;
  stage: InterviewStage;
  messages: InterviewMessage[];
  requirements: Requirement[];
  startedAt: number | null;
  completedAt: number | null;
}

/**
 * Category completion status
 */
export interface CategoryStatus {
  category: RequirementCategory;
  completed: boolean;
  requirementCount: number;
}
