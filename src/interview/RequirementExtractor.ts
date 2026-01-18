/**
 * RequirementExtractor - THE HERO of Phase 9
 *
 * Extracts structured requirements from LLM response text using XML tag parsing.
 * Features:
 * - Parse <requirement> blocks from response
 * - Extract text, category, priority, confidence, area
 * - Filter by confidence threshold
 * - Map LLM categories to database categories
 * - Generate unique IDs with nanoid
 */

import { nanoid } from 'nanoid';
import type {
  ExtractedRequirement,
  ExtractedRequirementCategory,
  ExtractedRequirementPriority,
  ExtractionResult,
  RequirementExtractorOptions,
} from './types';

/**
 * Default confidence threshold for filtering requirements
 */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Default confidence when not specified in XML
 */
const DEFAULT_CONFIDENCE = 0.5;

/**
 * Default priority when not specified in XML
 */
const DEFAULT_PRIORITY: ExtractedRequirementPriority = 'should';

/**
 * Category mapping from LLM output to internal format
 * Handles underscore variants (non_functional -> non-functional)
 */
const CATEGORY_MAP: Record<string, ExtractedRequirementCategory> = {
  functional: 'functional',
  non_functional: 'non-functional',
  'non-functional': 'non-functional',
  technical: 'technical',
  constraint: 'constraint',
  assumption: 'assumption',
};

/**
 * Valid categories for validation
 */
const VALID_CATEGORIES = new Set<ExtractedRequirementCategory>([
  'functional',
  'non-functional',
  'technical',
  'constraint',
  'assumption',
]);

/**
 * Valid priorities for validation
 */
const VALID_PRIORITIES = new Set<ExtractedRequirementPriority>([
  'must',
  'should',
  'could',
  'wont',
]);

/**
 * RequirementExtractor - Parses XML-tagged requirements from LLM responses
 */
export class RequirementExtractor {
  private confidenceThreshold: number;

  /**
   * Create a new RequirementExtractor
   * @param options Configuration options
   */
  constructor(options?: RequirementExtractorOptions) {
    this.confidenceThreshold =
      options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  }

  /**
   * Extract requirements from LLM response text
   * @param responseText The full LLM response text
   * @param sourceMessageId ID of the message this response belongs to
   * @returns ExtractionResult with requirements, raw count, and filtered count
   */
  extract(responseText: string, sourceMessageId: string): ExtractionResult {
    const requirements: ExtractedRequirement[] = [];
    const rawRequirements: ExtractedRequirement[] = [];

    // Match all <requirement> blocks
    const requirementRegex = /<requirement>([\s\S]*?)<\/requirement>/g;
    let match;

    while ((match = requirementRegex.exec(responseText)) !== null) {
      const block = match[1];
      if (!block) continue;
      const parsed = this.parseRequirementBlock(block, sourceMessageId);

      if (parsed) {
        rawRequirements.push(parsed);

        // Filter by confidence threshold
        if (parsed.confidence >= this.confidenceThreshold) {
          requirements.push(parsed);
        }
      }
    }

    return {
      requirements,
      rawCount: rawRequirements.length,
      filteredCount: requirements.length,
    };
  }

  /**
   * Set the confidence threshold for filtering
   * @param threshold New threshold (0.0 to 1.0)
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }

  /**
   * Parse a single requirement block into a structured requirement
   * @param block The content inside <requirement>...</requirement>
   * @param sourceMessageId Source message ID
   * @returns ExtractedRequirement or null if invalid
   */
  private parseRequirementBlock(
    block: string,
    sourceMessageId: string
  ): ExtractedRequirement | null {
    // Extract required fields
    const text = this.extractTag(block, 'text');
    const categoryRaw = this.extractTag(block, 'category');

    // Both text and category are required
    if (!text || !categoryRaw) {
      return null;
    }

    // Map and validate category
    const category = this.mapCategory(categoryRaw);
    if (!category) {
      return null;
    }

    // Extract optional fields with defaults
    const priorityRaw = this.extractTag(block, 'priority');
    const priority = this.mapPriority(priorityRaw) ?? DEFAULT_PRIORITY;

    const confidenceRaw = this.extractTag(block, 'confidence');
    const confidence = confidenceRaw
      ? parseFloat(confidenceRaw)
      : DEFAULT_CONFIDENCE;

    const area = this.extractTag(block, 'area') ?? undefined;

    return {
      id: nanoid(),
      text,
      category,
      priority,
      confidence: isNaN(confidence) ? DEFAULT_CONFIDENCE : confidence,
      area,
      sourceMessageId,
    };
  }

  /**
   * Extract content from an XML tag
   * @param content The content to search
   * @param tag The tag name
   * @returns Trimmed content or null if not found
   */
  private extractTag(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
    const match = content.match(regex);
    return match?.[1] ? match[1].trim() : null;
  }

  /**
   * Map LLM category to internal format
   * @param raw The raw category string from LLM
   * @returns Mapped category or null if invalid
   */
  private mapCategory(raw: string): ExtractedRequirementCategory | null {
    const normalized = raw.trim().toLowerCase();
    const mapped = CATEGORY_MAP[normalized];
    return mapped && VALID_CATEGORIES.has(mapped) ? mapped : null;
  }

  /**
   * Map LLM priority to internal format
   * @param raw The raw priority string from LLM
   * @returns Mapped priority or null if invalid
   */
  private mapPriority(raw: string | null): ExtractedRequirementPriority | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase() as ExtractedRequirementPriority;
    return VALID_PRIORITIES.has(normalized) ? normalized : null;
  }
}
