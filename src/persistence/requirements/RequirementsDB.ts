/**
 * RequirementsDB - Requirements storage, categorization, and search
 *
 * Master Book Reference: BUILD-007 (Section 4.3)
 *
 * Features:
 * - CRUD operations for project requirements
 * - Categorization (6 categories)
 * - Priority management (MoSCoW: must/should/could/wont)
 * - Search and filtering
 * - Feature linking
 * - JSON export/import
 */

import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { DatabaseClient } from '../database/DatabaseClient';
import { projects, requirements } from '../database/schema';

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

export class ProjectNotFoundError extends RequirementError {
  public readonly projectId: string;

  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
    this.projectId = projectId;
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
// Constants
// ============================================================================

const VALID_CATEGORIES: RequirementCategory[] = [
  'functional',
  'non-functional',
  'ui-ux',
  'technical',
  'business-logic',
  'integration',
];

// Keywords for auto-categorization
const CATEGORY_KEYWORDS: Record<RequirementCategory, string[]> = {
  functional: ['create', 'update', 'delete', 'view', 'add', 'edit', 'manage', 'submit', 'send', 'receive'],
  'non-functional': ['performance', 'security', 'scalability', 'reliability', 'availability', 'latency', 'throughput', 'load', 'requests per second'],
  'ui-ux': ['design', 'layout', 'responsive', 'color', 'theme', 'dashboard', 'modal', 'button', 'interface', 'navigation'],
  technical: ['api', 'database', 'cache', 'server', 'endpoint', 'protocol', 'architecture'],
  'business-logic': ['calculate', 'validate', 'rule', 'policy', 'workflow', 'approval', 'pricing'],
  integration: ['external', 'third-party', 'webhook', 'oauth', 'payment provider', 'email service'],
};

// ============================================================================
// Zod Schemas for Import Validation
// ============================================================================

const requirementImportSchema = z.object({
  id: z.string(),
  category: z.enum(['functional', 'non-functional', 'ui-ux', 'technical', 'business-logic', 'integration']),
  description: z.string(),
  priority: z.enum(['must', 'should', 'could', 'wont']),
  userStories: z.array(z.string()).optional().default([]),
  acceptanceCriteria: z.array(z.string()).optional().default([]),
  validated: z.boolean().optional().default(false),
  linkedFeatures: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  confidence: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
});

const exportSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  exportedAt: z.string(),
  requirements: z.array(requirementImportSchema),
  stats: z.object({
    total: z.number(),
    byCategory: z.record(z.number()),
    byPriority: z.record(z.number()),
  }),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate simple similarity between two strings using word overlap
 * Returns value between 0 and 1 where 1 = exact match
 */
function calculateSimilarity(a: string, b: string): number {
  // Exact match = definitely duplicate
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) {
    return 1;
  }

  // Extract meaningful words (ignore common short words)
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  // If either has very few meaningful words, require exact match
  if (wordsA.size <= 2 || wordsB.size <= 2) {
    return 0;
  }

  // Calculate word overlap
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      overlap++;
    }
  }

  // Calculate Jaccard similarity (intersection / union)
  const union = new Set([...wordsA, ...wordsB]).size;
  return overlap / union;
}

/**
 * Suggest category based on description keywords
 */
function suggestCategory(description: string): RequirementCategory | null {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category as RequirementCategory;
      }
    }
  }

  return null;
}

// ============================================================================
// RequirementsDB Implementation
// ============================================================================

/**
 * RequirementsDB - Requirements storage and management
 *
 * Note: Methods are async for API consistency even though better-sqlite3
 * operations are synchronous. This allows for future migration to async
 * database drivers without API changes.
 */
export class RequirementsDB {
  private readonly db: DatabaseClient;
  private readonly logger?: Logger;

  constructor(options: RequirementsDBOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  private log(level: keyof Logger, message: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    }
  }

  /**
   * Validate category against allowed values
   */
  private validateCategory(category: string): RequirementCategory {
    if (!VALID_CATEGORIES.includes(category as RequirementCategory)) {
      throw new InvalidCategoryError(category, VALID_CATEGORIES);
    }
    return category as RequirementCategory;
  }

  /**
   * Map database row to Requirement interface
   */
  private mapDbRowToRequirement(row: typeof requirements.$inferSelect): Requirement {
    return {
      id: row.id,
      projectId: row.projectId,
      category: row.category as RequirementCategory,
      description: row.description,
      priority: (row.priority || 'should') as RequirementPriority,
      source: row.source,
      userStories: row.userStories ? (JSON.parse(row.userStories) as string[]) : [],
      acceptanceCriteria: row.acceptanceCriteria ? (JSON.parse(row.acceptanceCriteria) as string[]) : [],
      linkedFeatures: row.linkedFeatures ? (JSON.parse(row.linkedFeatures) as string[]) : [],
      validated: row.validated ?? false,
      confidence: row.confidence,
      tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
      createdAt: row.createdAt,
    };
  }

  // ============================================================================
  // Project Management
  // ============================================================================

  /**
   * Create a new project
   */
  createProject(name: string, description?: string): Promise<string> {
    const id = nanoid();
    const now = new Date();

    this.db.db.insert(projects).values({
      id,
      name,
      description: description ?? null,
      mode: 'genesis',
      status: 'planning',
      rootPath: `/projects/${id}`,
      createdAt: now,
      updatedAt: now,
    }).run();

    this.log('info', `Created project: ${id}`, { name });
    return Promise.resolve(id);
  }

  /**
   * Get project by ID with requirement count
   */
  getProject(projectId: string): Promise<ProjectSummary> {
    const project = this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      return Promise.reject(new ProjectNotFoundError(projectId));
    }

    // Count requirements
    const countResult = this.db.raw
      .prepare('SELECT COUNT(*) as count FROM requirements WHERE project_id = ?')
      .get(projectId) as { count: number };

    return Promise.resolve({
      id: project.id,
      name: project.name,
      description: project.description,
      requirementCount: countResult.count,
    });
  }

  /**
   * List all projects with summaries
   */
  listProjects(): Promise<ProjectSummary[]> {
    const allProjects = this.db.db.select().from(projects).all();

    const result = allProjects.map((project) => {
      const countResult = this.db.raw
        .prepare('SELECT COUNT(*) as count FROM requirements WHERE project_id = ?')
        .get(project.id) as { count: number };

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        requirementCount: countResult.count,
      };
    });

    return Promise.resolve(result);
  }

  /**
   * Delete project and all its requirements (cascade handled by DB)
   */
  async deleteProject(projectId: string): Promise<void> {
    // Verify project exists
    await this.getProject(projectId);

    this.db.db.delete(projects).where(eq(projects.id, projectId)).run();
    this.log('info', `Deleted project: ${projectId}`);
  }

  // ============================================================================
  // Requirement CRUD
  // ============================================================================

  /**
   * Add a new requirement
   */
  async addRequirement(
    projectId: string,
    input: RequirementInput
  ): Promise<Requirement> {
    // Validate category
    this.validateCategory(input.category);

    // Check for duplicates (>80% similarity)
    const existingReqs = this.db.db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, projectId))
      .all();

    for (const existing of existingReqs) {
      if (calculateSimilarity(existing.description, input.description) > 0.8) {
        throw new DuplicateRequirementError(input.description);
      }
    }

    const id = nanoid();
    const now = new Date();

    this.db.db.insert(requirements).values({
      id,
      projectId,
      category: input.category,
      description: input.description,
      priority: input.priority ?? 'should',
      source: input.source ?? null,
      userStories: input.userStories ? JSON.stringify(input.userStories) : null,
      acceptanceCriteria: input.acceptanceCriteria ? JSON.stringify(input.acceptanceCriteria) : null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      confidence: input.confidence ?? null,
      validated: false,
      linkedFeatures: null,
      createdAt: now,
    }).run();

    this.log('info', `Added requirement: ${id}`, { projectId, category: input.category });

    return this.getRequirement(id);
  }

  /**
   * Get requirement by ID
   */
  getRequirement(reqId: string): Promise<Requirement> {
    const row = this.db.db
      .select()
      .from(requirements)
      .where(eq(requirements.id, reqId))
      .get();

    if (!row) {
      return Promise.reject(new RequirementNotFoundError(reqId));
    }

    return Promise.resolve(this.mapDbRowToRequirement(row));
  }

  /**
   * Update requirement
   */
  async updateRequirement(
    reqId: string,
    update: Partial<RequirementInput>
  ): Promise<Requirement> {
    // Verify exists
    await this.getRequirement(reqId);

    // Validate category if being updated
    if (update.category) {
      this.validateCategory(update.category);
    }

    const updates: Record<string, unknown> = {};

    if (update.category !== undefined) updates.category = update.category;
    if (update.description !== undefined) updates.description = update.description;
    if (update.priority !== undefined) updates.priority = update.priority;
    if (update.source !== undefined) updates.source = update.source;
    if (update.userStories !== undefined) updates.userStories = JSON.stringify(update.userStories);
    if (update.acceptanceCriteria !== undefined) updates.acceptanceCriteria = JSON.stringify(update.acceptanceCriteria);
    if (update.tags !== undefined) updates.tags = JSON.stringify(update.tags);
    if (update.confidence !== undefined) updates.confidence = update.confidence;

    if (Object.keys(updates).length > 0) {
      this.db.db
        .update(requirements)
        .set(updates)
        .where(eq(requirements.id, reqId))
        .run();
    }

    this.log('info', `Updated requirement: ${reqId}`);
    return this.getRequirement(reqId);
  }

  /**
   * Delete requirement
   */
  async deleteRequirement(reqId: string): Promise<void> {
    // Verify exists
    await this.getRequirement(reqId);

    this.db.db.delete(requirements).where(eq(requirements.id, reqId)).run();
    this.log('info', `Deleted requirement: ${reqId}`);
  }

  // ============================================================================
  // Categorization
  // ============================================================================

  /**
   * Auto-categorize requirements based on keywords
   */
  categorizeRequirements(projectId: string): Promise<number> {
    const reqs = this.db.db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, projectId))
      .all();

    let categorized = 0;

    for (const req of reqs) {
      const suggested = suggestCategory(req.description);
      if (suggested && suggested !== req.category) {
        this.db.db
          .update(requirements)
          .set({ category: suggested })
          .where(eq(requirements.id, req.id))
          .run();
        categorized++;
      }
    }

    this.log('info', `Auto-categorized ${String(categorized)} requirements in project ${projectId}`);
    return Promise.resolve(categorized);
  }

  /**
   * Get category statistics
   */
  getCategoryStats(projectId: string): Promise<CategoryStats> {
    const stats: CategoryStats = {
      functional: 0,
      'non-functional': 0,
      'ui-ux': 0,
      technical: 0,
      'business-logic': 0,
      integration: 0,
    };

    const results = this.db.raw.prepare(`
      SELECT category, COUNT(*) as count
      FROM requirements
      WHERE project_id = ?
      GROUP BY category
    `).all(projectId) as { category: string; count: number }[];

    for (const row of results) {
      if (row.category in stats) {
        stats[row.category as keyof CategoryStats] = row.count;
      }
    }

    return Promise.resolve(stats);
  }

  /**
   * Move requirement to different category
   */
  async moveToCategory(reqId: string, category: RequirementCategory): Promise<void> {
    // Validate category
    this.validateCategory(category);

    // Verify exists
    await this.getRequirement(reqId);

    this.db.db
      .update(requirements)
      .set({ category })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Moved requirement ${reqId} to category ${category}`);
  }

  // ============================================================================
  // Priority Management
  // ============================================================================

  /**
   * Set requirement priority
   */
  async setPriority(reqId: string, priority: RequirementPriority): Promise<void> {
    // Verify exists
    await this.getRequirement(reqId);

    this.db.db
      .update(requirements)
      .set({ priority })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Set priority ${priority} for requirement ${reqId}`);
  }

  /**
   * Get priority statistics
   */
  getPriorityStats(projectId: string): Promise<PriorityStats> {
    const stats: PriorityStats = {
      must: 0,
      should: 0,
      could: 0,
      wont: 0,
    };

    const results = this.db.raw.prepare(`
      SELECT priority, COUNT(*) as count
      FROM requirements
      WHERE project_id = ?
      GROUP BY priority
    `).all(projectId) as { priority: string; count: number }[];

    for (const row of results) {
      if (row.priority in stats) {
        stats[row.priority as keyof PriorityStats] = row.count;
      }
    }

    return Promise.resolve(stats);
  }

  /**
   * Get requirements by priority
   */
  getByPriority(
    projectId: string,
    priority: RequirementPriority
  ): Promise<Requirement[]> {
    const rows = this.db.db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          eq(requirements.priority, priority)
        )
      )
      .all();

    return Promise.resolve(rows.map((row) => this.mapDbRowToRequirement(row)));
  }

  // ============================================================================
  // Search and Filter
  // ============================================================================

  /**
   * Get requirements with optional filters
   */
  getRequirements(
    projectId: string,
    filters?: RequirementFilter
  ): Promise<Requirement[]> {
    // Build base query
    let rows = this.db.db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, projectId))
      .all();

    // Apply filters in memory (more flexible than complex SQL)
    if (filters) {
      if (filters.category) {
        rows = rows.filter((r) => r.category === filters.category);
      }
      if (filters.priority) {
        rows = rows.filter((r) => r.priority === filters.priority);
      }
      if (filters.validated !== undefined) {
        rows = rows.filter((r) => (r.validated ?? false) === filters.validated);
      }
      if (filters.tags && filters.tags.length > 0) {
        rows = rows.filter((r) => {
          const reqTags: string[] = r.tags ? (JSON.parse(r.tags) as string[]) : [];
          return filters.tags?.some((t) => reqTags.includes(t)) ?? false;
        });
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        rows = rows.filter((r) =>
          r.description.toLowerCase().includes(searchLower)
        );
      }
      if (filters.linkedToFeature) {
        const featureToFind = filters.linkedToFeature;
        rows = rows.filter((r) => {
          const linked: string[] = r.linkedFeatures ? (JSON.parse(r.linkedFeatures) as string[]) : [];
          return linked.includes(featureToFind);
        });
      }
      if (filters.unlinked) {
        rows = rows.filter((r) => {
          const linked: string[] = r.linkedFeatures ? (JSON.parse(r.linkedFeatures) as string[]) : [];
          return linked.length === 0;
        });
      }
    }

    return Promise.resolve(rows.map((row) => this.mapDbRowToRequirement(row)));
  }

  /**
   * Full-text search across requirements
   */
  searchRequirements(projectId: string, query: string): Promise<Requirement[]> {
    const queryLower = query.toLowerCase();

    const rows = this.db.db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, projectId))
      .all();

    const matches = rows.filter((r) => {
      // Search in description
      if (r.description.toLowerCase().includes(queryLower)) {
        return true;
      }
      // Search in userStories
      if (r.userStories) {
        const stories: string[] = JSON.parse(r.userStories) as string[];
        if (stories.some((s) => s.toLowerCase().includes(queryLower))) {
          return true;
        }
      }
      // Search in acceptanceCriteria
      if (r.acceptanceCriteria) {
        const criteria: string[] = JSON.parse(r.acceptanceCriteria) as string[];
        if (criteria.some((c) => c.toLowerCase().includes(queryLower))) {
          return true;
        }
      }
      return false;
    });

    return Promise.resolve(matches.map((row) => this.mapDbRowToRequirement(row)));
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Mark requirement as validated
   */
  async validateRequirement(reqId: string): Promise<void> {
    // Verify exists
    await this.getRequirement(reqId);

    this.db.db
      .update(requirements)
      .set({ validated: true })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Validated requirement: ${reqId}`);
  }

  /**
   * Mark requirement as not validated
   */
  async invalidateRequirement(reqId: string): Promise<void> {
    // Verify exists
    await this.getRequirement(reqId);

    this.db.db
      .update(requirements)
      .set({ validated: false })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Invalidated requirement: ${reqId}`);
  }

  /**
   * Get unvalidated requirements
   */
  getUnvalidated(projectId: string): Promise<Requirement[]> {
    const rows = this.db.db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          eq(requirements.validated, false)
        )
      )
      .all();

    return Promise.resolve(rows.map((row) => this.mapDbRowToRequirement(row)));
  }

  // ============================================================================
  // Linking
  // ============================================================================

  /**
   * Link requirement to feature
   */
  async linkToFeature(reqId: string, featureId: string): Promise<void> {
    const req = await this.getRequirement(reqId);
    const linked = new Set(req.linkedFeatures);
    linked.add(featureId);

    this.db.db
      .update(requirements)
      .set({ linkedFeatures: JSON.stringify([...linked]) })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Linked requirement ${reqId} to feature ${featureId}`);
  }

  /**
   * Unlink requirement from feature
   */
  async unlinkFeature(reqId: string, featureId: string): Promise<void> {
    const req = await this.getRequirement(reqId);
    const linked = req.linkedFeatures.filter((f) => f !== featureId);

    this.db.db
      .update(requirements)
      .set({ linkedFeatures: JSON.stringify(linked) })
      .where(eq(requirements.id, reqId))
      .run();

    this.log('info', `Unlinked requirement ${reqId} from feature ${featureId}`);
  }

  /**
   * Get linked feature IDs
   */
  async getLinkedFeatures(reqId: string): Promise<string[]> {
    const req = await this.getRequirement(reqId);
    return req.linkedFeatures;
  }

  /**
   * Get requirements not linked to any feature
   */
  async getUnlinkedRequirements(projectId: string): Promise<Requirement[]> {
    return this.getRequirements(projectId, { unlinked: true });
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  /**
   * Export all requirements to JSON
   */
  async exportToJSON(projectId: string): Promise<string> {
    const project = await this.getProject(projectId);
    const reqs = await this.getRequirements(projectId);
    const categoryStats = await this.getCategoryStats(projectId);
    const priorityStats = await this.getPriorityStats(projectId);

    const exportData = {
      projectId: project.id,
      projectName: project.name,
      exportedAt: new Date().toISOString(),
      requirements: reqs.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        priority: r.priority,
        userStories: r.userStories,
        acceptanceCriteria: r.acceptanceCriteria,
        validated: r.validated,
        linkedFeatures: r.linkedFeatures,
        tags: r.tags,
        confidence: r.confidence,
        source: r.source,
      })),
      stats: {
        total: reqs.length,
        byCategory: categoryStats,
        byPriority: priorityStats,
      },
    };

    this.log('info', `Exported ${String(reqs.length)} requirements for project ${projectId}`);
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import requirements from JSON
   */
  importFromJSON(projectId: string, json: string): Promise<number> {
    // Parse and validate JSON
    let parsed: z.infer<typeof exportSchema>;
    try {
      parsed = exportSchema.parse(JSON.parse(json));
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Promise.reject(new RequirementError('Invalid JSON format'));
      }
      if (error instanceof z.ZodError) {
        return Promise.reject(new RequirementError(`Invalid schema: ${error.message}`));
      }
      throw error;
    }

    // Import each requirement with new ID
    let imported = 0;
    for (const req of parsed.requirements) {
      const id = nanoid();
      const now = new Date();

      this.db.db.insert(requirements).values({
        id,
        projectId,
        category: req.category,
        description: req.description,
        priority: req.priority,
        source: req.source ?? null,
        userStories: req.userStories.length > 0 ? JSON.stringify(req.userStories) : null,
        acceptanceCriteria: req.acceptanceCriteria.length > 0 ? JSON.stringify(req.acceptanceCriteria) : null,
        linkedFeatures: req.linkedFeatures.length > 0 ? JSON.stringify(req.linkedFeatures) : null,
        validated: req.validated,
        confidence: req.confidence ?? null,
        tags: req.tags.length > 0 ? JSON.stringify(req.tags) : null,
        createdAt: now,
      }).run();

      imported++;
    }

    this.log('info', `Imported ${String(imported)} requirements into project ${projectId}`);
    return Promise.resolve(imported);
  }
}
