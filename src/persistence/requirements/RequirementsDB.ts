/**
 * RequirementsDB - Stub implementation for TDD RED phase
 *
 * This file exports all types and classes needed for tests to import.
 * Implementation will be added in GREEN phase.
 */

import type { DatabaseClient } from '../database/DatabaseClient';

// ============================================================================
// Custom Error Types
// ============================================================================

export class RequirementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequirementError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RequirementNotFoundError extends RequirementError {
  public readonly requirementId: string;

  constructor(requirementId: string) {
    super(`Requirement not found: ${requirementId}`);
    this.name = 'RequirementNotFoundError';
    this.requirementId = requirementId;
  }
}

export class InvalidCategoryError extends RequirementError {
  public readonly category: string;
  public readonly validCategories: RequirementCategory[];

  constructor(category: string, validCategories: RequirementCategory[]) {
    super(
      `Invalid category "${category}". Valid categories: ${validCategories.join(', ')}`
    );
    this.name = 'InvalidCategoryError';
    this.category = category;
    this.validCategories = validCategories;
  }
}

export class DuplicateRequirementError extends RequirementError {
  public readonly description: string;

  constructor(description: string) {
    super(`Potential duplicate requirement detected: "${description}"`);
    this.name = 'DuplicateRequirementError';
    this.description = description;
  }
}

// ============================================================================
// Types
// ============================================================================

export type RequirementCategory =
  | 'functional'
  | 'non-functional'
  | 'ui-ux'
  | 'technical'
  | 'business-logic'
  | 'integration';

export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';

export interface RequirementInput {
  category: RequirementCategory;
  description: string;
  priority?: RequirementPriority;
  source?: string;
  userStories?: string[];
  acceptanceCriteria?: string[];
  tags?: string[];
  confidence?: number;
}

export interface RequirementFilter {
  category?: RequirementCategory;
  priority?: RequirementPriority;
  validated?: boolean;
  tags?: string[];
  search?: string;
  linkedToFeature?: string;
  unlinked?: boolean;
}

export interface Requirement {
  id: string;
  projectId: string;
  category: RequirementCategory;
  description: string;
  priority: RequirementPriority;
  source: string | null;
  userStories: string[];
  acceptanceCriteria: string[];
  linkedFeatures: string[];
  validated: boolean;
  confidence: number | null;
  tags: string[];
  createdAt: Date;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  requirementCount: number;
}

export interface CategoryStats {
  functional: number;
  'non-functional': number;
  'ui-ux': number;
  technical: number;
  'business-logic': number;
  integration: number;
}

export interface PriorityStats {
  must: number;
  should: number;
  could: number;
  wont: number;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface RequirementsDBOptions {
  db: DatabaseClient;
  logger?: Logger;
}

// ============================================================================
// RequirementsDB - Stub Implementation
// ============================================================================

export class RequirementsDB {
  constructor(_options: RequirementsDBOptions) {
    // Stub - will be implemented in GREEN phase
    throw new Error('Not implemented');
  }

  // Project Management
  async createProject(_name: string, _description?: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async getProject(_projectId: string): Promise<ProjectSummary> {
    throw new Error('Not implemented');
  }

  async listProjects(): Promise<ProjectSummary[]> {
    throw new Error('Not implemented');
  }

  async deleteProject(_projectId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  // Requirement CRUD
  async addRequirement(
    _projectId: string,
    _input: RequirementInput
  ): Promise<Requirement> {
    throw new Error('Not implemented');
  }

  async getRequirement(_reqId: string): Promise<Requirement> {
    throw new Error('Not implemented');
  }

  async updateRequirement(
    _reqId: string,
    _update: Partial<RequirementInput>
  ): Promise<Requirement> {
    throw new Error('Not implemented');
  }

  async deleteRequirement(_reqId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  // Categorization
  async categorizeRequirements(_projectId: string): Promise<number> {
    throw new Error('Not implemented');
  }

  async getCategoryStats(_projectId: string): Promise<CategoryStats> {
    throw new Error('Not implemented');
  }

  async moveToCategory(
    _reqId: string,
    _category: RequirementCategory
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  // Priority Management
  async setPriority(
    _reqId: string,
    _priority: RequirementPriority
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async getPriorityStats(_projectId: string): Promise<PriorityStats> {
    throw new Error('Not implemented');
  }

  async getByPriority(
    _projectId: string,
    _priority: RequirementPriority
  ): Promise<Requirement[]> {
    throw new Error('Not implemented');
  }

  // Search and Filter
  async getRequirements(
    _projectId: string,
    _filters?: RequirementFilter
  ): Promise<Requirement[]> {
    throw new Error('Not implemented');
  }

  async searchRequirements(
    _projectId: string,
    _query: string
  ): Promise<Requirement[]> {
    throw new Error('Not implemented');
  }

  // Validation
  async validateRequirement(_reqId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async invalidateRequirement(_reqId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getUnvalidated(_projectId: string): Promise<Requirement[]> {
    throw new Error('Not implemented');
  }

  // Linking
  async linkToFeature(_reqId: string, _featureId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async unlinkFeature(_reqId: string, _featureId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getLinkedFeatures(_reqId: string): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async getUnlinkedRequirements(_projectId: string): Promise<Requirement[]> {
    throw new Error('Not implemented');
  }

  // Export/Import
  async exportToJSON(_projectId: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async importFromJSON(_projectId: string, _json: string): Promise<number> {
    throw new Error('Not implemented');
  }
}
