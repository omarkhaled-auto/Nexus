/**
 * Interview Engine Types
 *
 * Types for the RequirementExtractor and related interview engine components.
 * These types support extraction of structured requirements from LLM conversation.
 */

/**
 * Category for extracted requirements
 * Maps to RequirementsDB categories with underscore variants for LLM output
 */
export type ExtractedRequirementCategory =
  | 'functional'
  | 'non-functional'
  | 'technical'
  | 'constraint'
  | 'assumption';

/**
 * Priority using MoSCoW method
 */
export type ExtractedRequirementPriority = 'must' | 'should' | 'could' | 'wont';

/**
 * A single requirement extracted from LLM response
 */
export interface ExtractedRequirement {
  /** Unique identifier (generated with nanoid) */
  id: string;
  /** The requirement text/description */
  text: string;
  /** Category of the requirement */
  category: ExtractedRequirementCategory;
  /** MoSCoW priority */
  priority: ExtractedRequirementPriority;
  /** Confidence score from 0.0 to 1.0 */
  confidence: number;
  /** Optional domain area (e.g., "authentication", "payments") */
  area?: string;
  /** ID of the message this requirement was extracted from */
  sourceMessageId: string;
}

/**
 * Result of extraction operation
 */
export interface ExtractionResult {
  /** Requirements that passed the confidence threshold */
  requirements: ExtractedRequirement[];
  /** Total number of requirements found before filtering */
  rawCount: number;
  /** Number of requirements after confidence filtering */
  filteredCount: number;
}

/**
 * Options for RequirementExtractor
 */
export interface RequirementExtractorOptions {
  /** Minimum confidence score to include requirement (default: 0.7) */
  confidenceThreshold?: number;
}
