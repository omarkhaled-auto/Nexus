/**
 * RequirementsDB Tests
 *
 * TDD RED Phase: Tests for requirements storage, categorization, and search
 * following Master Book BUILD-007 (Section 4.3) specification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseClient } from '../database/DatabaseClient';
import {
  RequirementsDB,
  RequirementError,
  RequirementNotFoundError,
  InvalidCategoryError,
  DuplicateRequirementError,
  type RequirementInput,
  type RequirementFilter,
  type RequirementCategory,
  type RequirementPriority,
} from './RequirementsDB';

describe('RequirementsDB', () => {
  let db: DatabaseClient;
  let reqDb: RequirementsDB;
  let projectId: string;

  beforeEach(async () => {
    // Create in-memory database with migrations
    db = await DatabaseClient.createInMemory(
      'src/persistence/database/migrations'
    );

    // Create RequirementsDB instance
    reqDb = new RequirementsDB({ db });

    // Create a test project
    projectId = await reqDb.createProject('Test App', 'A test application');
  });

  afterEach(async () => {
    await db.close();
  });

  // ============================================================================
  // Error Types
  // ============================================================================

  describe('Error Types', () => {
    it('should have RequirementError as base class', () => {
      const error = new RequirementError('test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RequirementError);
      expect(error.name).toBe('RequirementError');
      expect(error.message).toBe('test message');
    });

    it('should have RequirementNotFoundError with requirementId', () => {
      const error = new RequirementNotFoundError('req-123');
      expect(error).toBeInstanceOf(RequirementError);
      expect(error).toBeInstanceOf(RequirementNotFoundError);
      expect(error.name).toBe('RequirementNotFoundError');
      expect(error.requirementId).toBe('req-123');
      expect(error.message).toContain('req-123');
    });

    it('should have InvalidCategoryError with category and validCategories', () => {
      const validCategories: RequirementCategory[] = [
        'functional',
        'non-functional',
        'ui-ux',
        'technical',
        'business-logic',
        'integration',
      ];
      const error = new InvalidCategoryError('invalid-cat', validCategories);
      expect(error).toBeInstanceOf(RequirementError);
      expect(error).toBeInstanceOf(InvalidCategoryError);
      expect(error.name).toBe('InvalidCategoryError');
      expect(error.category).toBe('invalid-cat');
      expect(error.validCategories).toEqual(validCategories);
      expect(error.message).toContain('invalid-cat');
    });

    it('should have DuplicateRequirementError with description', () => {
      const error = new DuplicateRequirementError('Users must login');
      expect(error).toBeInstanceOf(RequirementError);
      expect(error).toBeInstanceOf(DuplicateRequirementError);
      expect(error.name).toBe('DuplicateRequirementError');
      expect(error.description).toBe('Users must login');
      expect(error.message).toContain('duplicate');
    });
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('Constructor', () => {
    it('should accept database client', () => {
      const instance = new RequirementsDB({ db });
      expect(instance).toBeInstanceOf(RequirementsDB);
    });

    it('should accept optional logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const instance = new RequirementsDB({ db, logger });
      expect(instance).toBeInstanceOf(RequirementsDB);
    });
  });

  // ============================================================================
  // Project Management
  // ============================================================================

  describe('Project Management', () => {
    describe('createProject()', () => {
      it('should create project and return projectId', async () => {
        const id = await reqDb.createProject('New App', 'A new application');
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should create project with just name', async () => {
        const id = await reqDb.createProject('Minimal App');
        expect(id).toBeDefined();
      });
    });

    describe('getProject()', () => {
      it('should return project with requirement counts', async () => {
        // Add some requirements first
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Requirement 1',
        });
        await reqDb.addRequirement(projectId, {
          category: 'technical',
          description: 'Requirement 2',
        });

        const project = await reqDb.getProject(projectId);

        expect(project).toBeDefined();
        expect(project.id).toBe(projectId);
        expect(project.name).toBe('Test App');
        expect(project.requirementCount).toBe(2);
      });

      it('should throw for non-existent project', async () => {
        await expect(reqDb.getProject('non-existent')).rejects.toThrow();
      });
    });

    describe('listProjects()', () => {
      it('should return all projects with summaries', async () => {
        await reqDb.createProject('App 2', 'Second app');
        await reqDb.createProject('App 3');

        const projects = await reqDb.listProjects();

        expect(projects.length).toBeGreaterThanOrEqual(3);
        expect(projects[0]).toHaveProperty('id');
        expect(projects[0]).toHaveProperty('name');
        expect(projects[0]).toHaveProperty('requirementCount');
      });
    });

    describe('deleteProject()', () => {
      it('should remove project and all requirements', async () => {
        // Add requirements
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Will be deleted',
        });

        await reqDb.deleteProject(projectId);

        await expect(reqDb.getProject(projectId)).rejects.toThrow();
      });
    });
  });

  // ============================================================================
  // Requirement CRUD
  // ============================================================================

  describe('Requirement CRUD', () => {
    describe('addRequirement()', () => {
      it('should create requirement with generated id', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Users must be able to login',
        });

        expect(req).toBeDefined();
        expect(req.id).toBeDefined();
        expect(req.category).toBe('functional');
        expect(req.description).toBe('Users must be able to login');
      });

      it('should set default priority to should', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test requirement',
        });

        expect(req.priority).toBe('should');
      });

      it('should validate category against allowed values', async () => {
        await expect(
          reqDb.addRequirement(projectId, {
            category: 'invalid-category' as RequirementCategory,
            description: 'Test',
          })
        ).rejects.toThrow(InvalidCategoryError);
      });

      it('should store user stories as JSON', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Login requirement',
          userStories: ['As a user, I want to login', 'As a user, I want to logout'],
        });

        expect(req.userStories).toEqual(['As a user, I want to login', 'As a user, I want to logout']);
      });

      it('should store acceptance criteria as JSON', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Login requirement',
          acceptanceCriteria: ['User can enter email', 'User can enter password'],
        });

        expect(req.acceptanceCriteria).toEqual(['User can enter email', 'User can enter password']);
      });

      it('should store tags as JSON', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'technical',
          description: 'API requirement',
          tags: ['api', 'backend', 'auth'],
        });

        expect(req.tags).toEqual(['api', 'backend', 'auth']);
      });

      it('should store source from interview', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'User dashboard',
          source: 'User interview Q5',
        });

        expect(req.source).toBe('User interview Q5');
      });

      it('should store confidence score', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Extracted requirement',
          confidence: 0.85,
        });

        expect(req.confidence).toBe(0.85);
      });

      it('should detect potential duplicates (fuzzy match)', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Users must be able to login with email and password',
        });

        // Very similar description should be flagged
        await expect(
          reqDb.addRequirement(projectId, {
            category: 'functional',
            description: 'Users must be able to login with email and password',
          })
        ).rejects.toThrow(DuplicateRequirementError);
      });

      it('should allow different requirements', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Users must be able to login',
        });

        const req2 = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Users must be able to register',
        });

        expect(req2).toBeDefined();
      });
    });

    describe('getRequirement()', () => {
      it('should return requirement by id', async () => {
        const created = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test requirement',
        });

        const fetched = await reqDb.getRequirement(created.id);

        expect(fetched.id).toBe(created.id);
        expect(fetched.description).toBe('Test requirement');
      });

      it('should throw RequirementNotFoundError for non-existent id', async () => {
        await expect(reqDb.getRequirement('non-existent')).rejects.toThrow(
          RequirementNotFoundError
        );
      });
    });

    describe('updateRequirement()', () => {
      it('should update requirement fields', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Original description',
        });

        const updated = await reqDb.updateRequirement(req.id, {
          description: 'Updated description',
          priority: 'must',
        });

        expect(updated.description).toBe('Updated description');
        expect(updated.priority).toBe('must');
      });

      it('should throw for non-existent requirement', async () => {
        await expect(
          reqDb.updateRequirement('non-existent', { description: 'test' })
        ).rejects.toThrow(RequirementNotFoundError);
      });

      it('should validate category on update', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await expect(
          reqDb.updateRequirement(req.id, {
            category: 'invalid' as RequirementCategory,
          })
        ).rejects.toThrow(InvalidCategoryError);
      });
    });

    describe('deleteRequirement()', () => {
      it('should remove requirement', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'To be deleted',
        });

        await reqDb.deleteRequirement(req.id);

        await expect(reqDb.getRequirement(req.id)).rejects.toThrow(
          RequirementNotFoundError
        );
      });

      it('should throw for non-existent requirement', async () => {
        await expect(reqDb.deleteRequirement('non-existent')).rejects.toThrow(
          RequirementNotFoundError
        );
      });
    });
  });

  // ============================================================================
  // Categorization
  // ============================================================================

  describe('Categorization', () => {
    const categories: RequirementCategory[] = [
      'functional',
      'non-functional',
      'ui-ux',
      'technical',
      'business-logic',
      'integration',
    ];

    it('should accept all valid categories', async () => {
      for (const category of categories) {
        const req = await reqDb.addRequirement(projectId, {
          category,
          description: `Test ${category}`,
        });
        expect(req.category).toBe(category);
      }
    });

    describe('categorizeRequirements()', () => {
      it('should auto-categorize uncategorized requirements', async () => {
        // Add requirements without specific categorization keywords
        await reqDb.addRequirement(projectId, {
          category: 'functional', // Will be re-categorized based on content
          description: 'System must handle 1000 requests per second',
        });

        const categorized = await reqDb.categorizeRequirements(projectId);

        // Performance-related should suggest non-functional
        expect(categorized).toBeGreaterThan(0);
      });
    });

    describe('getCategoryStats()', () => {
      it('should return count per category', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Functional 1',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Functional 2',
        });
        await reqDb.addRequirement(projectId, {
          category: 'technical',
          description: 'Technical 1',
        });

        const stats = await reqDb.getCategoryStats(projectId);

        expect(stats.functional).toBe(2);
        expect(stats.technical).toBe(1);
        expect(stats['non-functional']).toBe(0);
      });
    });

    describe('moveToCategory()', () => {
      it('should change requirement category', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.moveToCategory(req.id, 'technical');

        const updated = await reqDb.getRequirement(req.id);
        expect(updated.category).toBe('technical');
      });

      it('should throw for invalid category', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await expect(
          reqDb.moveToCategory(req.id, 'invalid' as RequirementCategory)
        ).rejects.toThrow(InvalidCategoryError);
      });
    });
  });

  // ============================================================================
  // Priority Management
  // ============================================================================

  describe('Priority Management', () => {
    const priorities: RequirementPriority[] = ['must', 'should', 'could', 'wont'];

    describe('setPriority()', () => {
      it('should update requirement priority', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.setPriority(req.id, 'must');

        const updated = await reqDb.getRequirement(req.id);
        expect(updated.priority).toBe('must');
      });

      it('should accept all MoSCoW priorities', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        for (const priority of priorities) {
          await reqDb.setPriority(req.id, priority);
          const updated = await reqDb.getRequirement(req.id);
          expect(updated.priority).toBe(priority);
        }
      });
    });

    describe('getPriorityStats()', () => {
      it('should return count per priority', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Must 1',
          priority: 'must',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Must 2',
          priority: 'must',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Should 1',
          priority: 'should',
        });

        const stats = await reqDb.getPriorityStats(projectId);

        expect(stats.must).toBe(2);
        expect(stats.should).toBe(1);
        expect(stats.could).toBe(0);
        expect(stats.wont).toBe(0);
      });
    });

    describe('getByPriority()', () => {
      it('should return filtered list by priority', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Must 1',
          priority: 'must',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Should 1',
          priority: 'should',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Must 2',
          priority: 'must',
        });

        const musts = await reqDb.getByPriority(projectId, 'must');

        expect(musts).toHaveLength(2);
        expect(musts.every((r) => r.priority === 'must')).toBe(true);
      });
    });
  });

  // ============================================================================
  // Search and Filter
  // ============================================================================

  describe('Search and Filter', () => {
    beforeEach(async () => {
      // Seed test data
      await reqDb.addRequirement(projectId, {
        category: 'functional',
        description: 'Users must be able to create tasks',
        priority: 'must',
        tags: ['tasks', 'crud'],
        userStories: ['As a user, I want to create tasks'],
      });
      await reqDb.addRequirement(projectId, {
        category: 'functional',
        description: 'Users should view task history',
        priority: 'should',
        tags: ['tasks', 'history'],
      });
      await reqDb.addRequirement(projectId, {
        category: 'non-functional',
        description: 'System must handle high load',
        priority: 'must',
        tags: ['performance'],
      });
      await reqDb.addRequirement(projectId, {
        category: 'ui-ux',
        description: 'Dashboard should be responsive',
        priority: 'should',
      });
    });

    describe('getRequirements()', () => {
      it('should return all requirements when no filter', async () => {
        const reqs = await reqDb.getRequirements(projectId);
        expect(reqs.length).toBe(4);
      });

      it('should filter by category', async () => {
        const reqs = await reqDb.getRequirements(projectId, { category: 'functional' });
        expect(reqs).toHaveLength(2);
        expect(reqs.every((r) => r.category === 'functional')).toBe(true);
      });

      it('should filter by priority', async () => {
        const reqs = await reqDb.getRequirements(projectId, { priority: 'must' });
        expect(reqs).toHaveLength(2);
        expect(reqs.every((r) => r.priority === 'must')).toBe(true);
      });

      it('should filter by validated status', async () => {
        // Validate one requirement
        const all = await reqDb.getRequirements(projectId);
        await reqDb.validateRequirement(all[0].id);

        const validated = await reqDb.getRequirements(projectId, { validated: true });
        expect(validated).toHaveLength(1);
      });

      it('should filter by tags', async () => {
        const reqs = await reqDb.getRequirements(projectId, { tags: ['tasks'] });
        expect(reqs).toHaveLength(2);
      });

      it('should filter by search text in description', async () => {
        const reqs = await reqDb.getRequirements(projectId, { search: 'dashboard' });
        expect(reqs).toHaveLength(1);
        expect(reqs[0].description).toContain('Dashboard');
      });

      it('should combine multiple filters', async () => {
        const reqs = await reqDb.getRequirements(projectId, {
          category: 'functional',
          priority: 'must',
        });
        expect(reqs).toHaveLength(1);
        expect(reqs[0].description).toContain('create tasks');
      });
    });

    describe('searchRequirements()', () => {
      it('should search across description', async () => {
        const results = await reqDb.searchRequirements(projectId, 'task');
        expect(results.length).toBeGreaterThanOrEqual(2);
      });

      it('should search in userStories', async () => {
        const results = await reqDb.searchRequirements(projectId, 'want to create');
        expect(results.length).toBeGreaterThanOrEqual(1);
      });

      it('should be case-insensitive', async () => {
        const results = await reqDb.searchRequirements(projectId, 'DASHBOARD');
        expect(results).toHaveLength(1);
      });

      it('should return empty array for no matches', async () => {
        const results = await reqDb.searchRequirements(projectId, 'xyznonexistent');
        expect(results).toEqual([]);
      });
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('Validation', () => {
    describe('validateRequirement()', () => {
      it('should mark requirement as validated', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.validateRequirement(req.id);

        const updated = await reqDb.getRequirement(req.id);
        expect(updated.validated).toBe(true);
      });
    });

    describe('invalidateRequirement()', () => {
      it('should mark requirement as not validated', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });
        await reqDb.validateRequirement(req.id);

        await reqDb.invalidateRequirement(req.id);

        const updated = await reqDb.getRequirement(req.id);
        expect(updated.validated).toBe(false);
      });
    });

    describe('getUnvalidated()', () => {
      it('should return requirements needing validation', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Unvalidated 1',
        });
        const req2 = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Validated',
        });
        await reqDb.validateRequirement(req2.id);
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Unvalidated 2',
        });

        const unvalidated = await reqDb.getUnvalidated(projectId);

        expect(unvalidated).toHaveLength(2);
        expect(unvalidated.every((r) => r.validated === false)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Linking
  // ============================================================================

  describe('Linking', () => {
    describe('linkToFeature()', () => {
      it('should add feature link to requirement', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.linkToFeature(req.id, 'feat-001');

        const linked = await reqDb.getLinkedFeatures(req.id);
        expect(linked).toContain('feat-001');
      });

      it('should support multiple feature links', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.linkToFeature(req.id, 'feat-001');
        await reqDb.linkToFeature(req.id, 'feat-002');

        const linked = await reqDb.getLinkedFeatures(req.id);
        expect(linked).toContain('feat-001');
        expect(linked).toContain('feat-002');
      });

      it('should not duplicate links', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        await reqDb.linkToFeature(req.id, 'feat-001');
        await reqDb.linkToFeature(req.id, 'feat-001'); // Duplicate

        const linked = await reqDb.getLinkedFeatures(req.id);
        expect(linked.filter((f) => f === 'feat-001')).toHaveLength(1);
      });
    });

    describe('unlinkFeature()', () => {
      it('should remove feature link from requirement', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });
        await reqDb.linkToFeature(req.id, 'feat-001');
        await reqDb.linkToFeature(req.id, 'feat-002');

        await reqDb.unlinkFeature(req.id, 'feat-001');

        const linked = await reqDb.getLinkedFeatures(req.id);
        expect(linked).not.toContain('feat-001');
        expect(linked).toContain('feat-002');
      });
    });

    describe('getLinkedFeatures()', () => {
      it('should return linked feature IDs', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });
        await reqDb.linkToFeature(req.id, 'feat-001');

        const linked = await reqDb.getLinkedFeatures(req.id);

        expect(linked).toEqual(['feat-001']);
      });

      it('should return empty array if no links', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test',
        });

        const linked = await reqDb.getLinkedFeatures(req.id);

        expect(linked).toEqual([]);
      });
    });

    describe('getUnlinkedRequirements()', () => {
      it('should return requirements not linked to features', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Unlinked 1',
        });
        const linked = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Linked',
        });
        await reqDb.linkToFeature(linked.id, 'feat-001');
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Unlinked 2',
        });

        const unlinked = await reqDb.getUnlinkedRequirements(projectId);

        expect(unlinked).toHaveLength(2);
        expect(unlinked.every((r) => !r.linkedFeatures || r.linkedFeatures.length === 0)).toBe(true);
      });
    });

    describe('filter by linkedToFeature', () => {
      it('should filter requirements linked to specific feature', async () => {
        const req1 = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Linked to feat-001',
        });
        await reqDb.linkToFeature(req1.id, 'feat-001');

        const req2 = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Linked to feat-002',
        });
        await reqDb.linkToFeature(req2.id, 'feat-002');

        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Not linked',
        });

        const results = await reqDb.getRequirements(projectId, { linkedToFeature: 'feat-001' });

        expect(results).toHaveLength(1);
        expect(results[0].description).toBe('Linked to feat-001');
      });
    });

    describe('filter by unlinked', () => {
      it('should filter unlinked requirements', async () => {
        const linked = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Linked',
        });
        await reqDb.linkToFeature(linked.id, 'feat-001');

        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Unlinked',
        });

        const results = await reqDb.getRequirements(projectId, { unlinked: true });

        expect(results).toHaveLength(1);
        expect(results[0].description).toBe('Unlinked');
      });
    });
  });

  // ============================================================================
  // Export/Import
  // ============================================================================

  describe('Export/Import', () => {
    describe('exportToJSON()', () => {
      it('should return JSON string with all requirements', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Requirement 1',
          priority: 'must',
        });
        await reqDb.addRequirement(projectId, {
          category: 'technical',
          description: 'Requirement 2',
          priority: 'should',
        });

        const json = await reqDb.exportToJSON(projectId);

        expect(typeof json).toBe('string');
        const parsed = JSON.parse(json);
        expect(parsed.projectId).toBe(projectId);
        expect(parsed.requirements).toHaveLength(2);
      });

      it('should include project metadata', async () => {
        const json = await reqDb.exportToJSON(projectId);
        const parsed = JSON.parse(json);

        expect(parsed.projectName).toBe('Test App');
        expect(parsed.exportedAt).toBeDefined();
      });

      it('should include stats in export', async () => {
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Req 1',
          priority: 'must',
        });
        await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Req 2',
          priority: 'should',
        });

        const json = await reqDb.exportToJSON(projectId);
        const parsed = JSON.parse(json);

        expect(parsed.stats).toBeDefined();
        expect(parsed.stats.total).toBe(2);
        expect(parsed.stats.byCategory.functional).toBe(2);
        expect(parsed.stats.byPriority.must).toBe(1);
        expect(parsed.stats.byPriority.should).toBe(1);
      });

      it('should match Master Book JSON format', async () => {
        const req = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Test requirement',
          priority: 'must',
          userStories: ['Story 1'],
          acceptanceCriteria: ['Criteria 1'],
        });
        await reqDb.validateRequirement(req.id);
        await reqDb.linkToFeature(req.id, 'feat-001');

        const json = await reqDb.exportToJSON(projectId);
        const parsed = JSON.parse(json);

        const exported = parsed.requirements[0];
        expect(exported).toHaveProperty('id');
        expect(exported).toHaveProperty('category', 'functional');
        expect(exported).toHaveProperty('description', 'Test requirement');
        expect(exported).toHaveProperty('priority', 'must');
        expect(exported).toHaveProperty('userStories');
        expect(exported).toHaveProperty('acceptanceCriteria');
        expect(exported).toHaveProperty('validated', true);
        expect(exported).toHaveProperty('linkedFeatures');
        expect(exported.linkedFeatures).toContain('feat-001');
      });
    });

    describe('importFromJSON()', () => {
      it('should import requirements from JSON', async () => {
        const exportJson = JSON.stringify({
          projectId: 'other-project',
          projectName: 'Other App',
          exportedAt: new Date().toISOString(),
          requirements: [
            {
              id: 'req-import-1',
              category: 'functional',
              description: 'Imported requirement 1',
              priority: 'must',
              userStories: [],
              acceptanceCriteria: [],
              validated: false,
              linkedFeatures: [],
            },
            {
              id: 'req-import-2',
              category: 'technical',
              description: 'Imported requirement 2',
              priority: 'should',
              userStories: ['Story'],
              acceptanceCriteria: ['Criteria'],
              validated: true,
              linkedFeatures: ['feat-001'],
            },
          ],
          stats: { total: 2, byCategory: {}, byPriority: {} },
        });

        const imported = await reqDb.importFromJSON(projectId, exportJson);

        expect(imported).toBe(2);

        const reqs = await reqDb.getRequirements(projectId);
        expect(reqs.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate new IDs for imported requirements', async () => {
        const exportJson = JSON.stringify({
          projectId: 'other',
          projectName: 'Other',
          exportedAt: new Date().toISOString(),
          requirements: [
            {
              id: 'old-id',
              category: 'functional',
              description: 'Imported',
              priority: 'should',
              userStories: [],
              acceptanceCriteria: [],
              validated: false,
              linkedFeatures: [],
            },
          ],
          stats: { total: 1, byCategory: {}, byPriority: {} },
        });

        await reqDb.importFromJSON(projectId, exportJson);

        // Should not be able to fetch by old id
        await expect(reqDb.getRequirement('old-id')).rejects.toThrow(
          RequirementNotFoundError
        );

        // But requirement should exist with new id
        const reqs = await reqDb.searchRequirements(projectId, 'Imported');
        expect(reqs).toHaveLength(1);
      });

      it('should preserve all fields on import', async () => {
        const exportJson = JSON.stringify({
          projectId: 'other',
          projectName: 'Other',
          exportedAt: new Date().toISOString(),
          requirements: [
            {
              id: 'old-id',
              category: 'ui-ux',
              description: 'UI requirement',
              priority: 'could',
              userStories: ['As a user...'],
              acceptanceCriteria: ['Must be responsive'],
              validated: true,
              linkedFeatures: ['feat-x'],
              tags: ['ui', 'design'],
              confidence: 0.9,
              source: 'Interview 3',
            },
          ],
          stats: { total: 1, byCategory: {}, byPriority: {} },
        });

        await reqDb.importFromJSON(projectId, exportJson);

        const reqs = await reqDb.searchRequirements(projectId, 'UI requirement');
        expect(reqs).toHaveLength(1);

        const req = reqs[0];
        expect(req.category).toBe('ui-ux');
        expect(req.priority).toBe('could');
        expect(req.userStories).toEqual(['As a user...']);
        expect(req.acceptanceCriteria).toEqual(['Must be responsive']);
        expect(req.validated).toBe(true);
        expect(req.linkedFeatures).toContain('feat-x');
        expect(req.tags).toContain('ui');
        expect(req.confidence).toBe(0.9);
        expect(req.source).toBe('Interview 3');
      });

      it('should throw for invalid JSON', async () => {
        await expect(reqDb.importFromJSON(projectId, 'not valid json')).rejects.toThrow();
      });

      it('should throw for invalid schema', async () => {
        const invalidJson = JSON.stringify({
          notAValidSchema: true,
        });

        await expect(reqDb.importFromJSON(projectId, invalidJson)).rejects.toThrow();
      });
    });

    describe('roundtrip', () => {
      it('should export and import losslessly', async () => {
        // Create requirements
        const req1 = await reqDb.addRequirement(projectId, {
          category: 'functional',
          description: 'Requirement 1',
          priority: 'must',
          userStories: ['Story 1'],
          acceptanceCriteria: ['Criteria 1'],
          tags: ['tag1'],
          source: 'Interview',
          confidence: 0.95,
        });
        await reqDb.validateRequirement(req1.id);
        await reqDb.linkToFeature(req1.id, 'feat-001');

        await reqDb.addRequirement(projectId, {
          category: 'technical',
          description: 'Requirement 2',
          priority: 'should',
        });

        // Export
        const json = await reqDb.exportToJSON(projectId);

        // Create new project and import
        const newProjectId = await reqDb.createProject('Import Target');
        await reqDb.importFromJSON(newProjectId, json);

        // Verify
        const imported = await reqDb.getRequirements(newProjectId);
        expect(imported).toHaveLength(2);

        const importedReq1 = imported.find((r) => r.description === 'Requirement 1');
        expect(importedReq1).toBeDefined();
        expect(importedReq1!.category).toBe('functional');
        expect(importedReq1!.priority).toBe('must');
        expect(importedReq1!.validated).toBe(true);
        expect(importedReq1!.userStories).toEqual(['Story 1']);
        expect(importedReq1!.linkedFeatures).toContain('feat-001');
      });
    });
  });
});
