/**
 * RequirementsDB - Requirements persistence layer
 *
 * Manages storage and retrieval of project requirements.
 * Used by the Interview Engine to persist extracted requirements.
 *
 * @module persistence/requirements
 */

import { nanoid } from 'nanoid';
import type { DatabaseClient } from '../database/DatabaseClient';

/**
 * Requirement category
 */
export type RequirementCategory = 'functional' | 'non-functional' | 'technical';

/**
 * Requirement priority using MoSCoW method
 */
export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';

/**
 * A stored requirement
 */
export interface Requirement {
  id: string;
  projectId: string;
  category: RequirementCategory;
  description: string;
  priority: RequirementPriority;
  source: string;
  userStories: string[];
  acceptanceCriteria: string[];
  linkedFeatures: string[];
  validated: boolean;
  confidence: number;
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Input for creating a new requirement
 */
export interface CreateRequirementInput {
  category: RequirementCategory;
  description: string;
  priority: RequirementPriority;
  source: string;
  confidence?: number;
  tags?: string[];
  userStories?: string[];
  acceptanceCriteria?: string[];
}

/**
 * Options for querying requirements
 */
export interface QueryOptions {
  category?: RequirementCategory;
  priority?: RequirementPriority;
  tags?: string[];
  validated?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * RequirementsDB - Manages requirement persistence
 *
 * Provides CRUD operations for project requirements with support for
 * categorization, prioritization, and validation tracking.
 */
export class RequirementsDB {
  private readonly db: DatabaseClient;

  /**
   * In-memory storage for requirements
   * TODO: Replace with actual database table queries
   */
  private requirements: Map<string, Requirement> = new Map();

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  /**
   * Add a new requirement to a project
   *
   * @param projectId - The project ID
   * @param input - The requirement data
   * @returns The created requirement
   */
  addRequirement(projectId: string, input: CreateRequirementInput): Requirement {
    const now = new Date();
    const requirement: Requirement = {
      id: nanoid(),
      projectId,
      category: input.category,
      description: input.description,
      priority: input.priority,
      source: input.source,
      confidence: input.confidence ?? 0.8,
      tags: input.tags ?? [],
      userStories: input.userStories ?? [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      linkedFeatures: [],
      validated: false,
      createdAt: now,
    };

    // Check for duplicates by description
    const existing = Array.from(this.requirements.values()).find(
      (r) => r.projectId === projectId && r.description === input.description
    );
    if (existing) {
      throw new Error(`Duplicate requirement: ${input.description.substring(0, 50)}...`);
    }

    this.requirements.set(requirement.id, requirement);
    return requirement;
  }

  /**
   * Get a requirement by ID
   *
   * @param id - The requirement ID
   * @returns The requirement or null if not found
   */
  getRequirement(id: string): Requirement | null {
    return this.requirements.get(id) ?? null;
  }

  /**
   * Get all requirements for a project
   *
   * @param projectId - The project ID
   * @param options - Query options
   * @returns Array of requirements
   */
  getRequirements(projectId: string, options: QueryOptions = {}): Requirement[] {
    let results = Array.from(this.requirements.values()).filter((r) => r.projectId === projectId);

    // Apply filters
    if (options.category) {
      results = results.filter((r) => r.category === options.category);
    }
    if (options.priority) {
      results = results.filter((r) => r.priority === options.priority);
    }
    if (options.validated !== undefined) {
      results = results.filter((r) => r.validated === options.validated);
    }
    if (options.tags && options.tags.length > 0) {
      const tagList = options.tags;
      results = results.filter((r) => tagList.some((tag) => r.tags.includes(tag)));
    }

    // Apply pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Update a requirement
   *
   * @param id - The requirement ID
   * @param updates - The fields to update
   * @returns The updated requirement
   */
  updateRequirement(
    id: string,
    updates: Partial<Omit<Requirement, 'id' | 'projectId' | 'createdAt'>>
  ): Requirement {
    const existing = this.requirements.get(id);
    if (!existing) {
      throw new Error(`Requirement not found: ${id}`);
    }

    const updated: Requirement = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.requirements.set(id, updated);
    return updated;
  }

  /**
   * Delete a requirement
   *
   * @param id - The requirement ID
   * @returns True if deleted, false if not found
   */
  deleteRequirement(id: string): boolean {
    return this.requirements.delete(id);
  }

  /**
   * Validate a requirement (mark as reviewed and approved)
   *
   * @param id - The requirement ID
   * @returns The updated requirement
   */
  validateRequirement(id: string): Requirement {
    return this.updateRequirement(id, { validated: true });
  }

  /**
   * Link a requirement to a feature
   *
   * @param requirementId - The requirement ID
   * @param featureId - The feature ID
   * @returns The updated requirement
   */
  linkToFeature(requirementId: string, featureId: string): Requirement {
    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }

    if (!existing.linkedFeatures.includes(featureId)) {
      existing.linkedFeatures.push(featureId);
      existing.updatedAt = new Date();
    }

    return existing;
  }

  /**
   * Get requirements statistics for a project
   *
   * @param projectId - The project ID
   * @returns Statistics about the requirements
   */
  getStatistics(projectId: string): {
    total: number;
    byCategory: Record<RequirementCategory, number>;
    byPriority: Record<RequirementPriority, number>;
    validated: number;
    unvalidated: number;
  } {
    const requirements = this.getRequirements(projectId);

    const byCategory: Record<RequirementCategory, number> = {
      functional: 0,
      'non-functional': 0,
      technical: 0,
    };

    const byPriority: Record<RequirementPriority, number> = {
      must: 0,
      should: 0,
      could: 0,
      wont: 0,
    };

    let validated = 0;

    for (const req of requirements) {
      byCategory[req.category]++;
      byPriority[req.priority]++;
      if (req.validated) validated++;
    }

    return {
      total: requirements.length,
      byCategory,
      byPriority,
      validated,
      unvalidated: requirements.length - validated,
    };
  }

  /**
   * Clear all requirements for a project (for testing)
   *
   * @param projectId - The project ID
   */
  clearProject(projectId: string): void {
    const toDelete = Array.from(this.requirements.entries())
      .filter(([, r]) => r.projectId === projectId)
      .map(([id]) => id);

    for (const id of toDelete) {
      this.requirements.delete(id);
    }
  }
}
