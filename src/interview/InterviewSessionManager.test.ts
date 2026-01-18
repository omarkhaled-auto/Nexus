/**
 * InterviewSessionManager Tests
 *
 * Tests for session persistence, auto-save, and requirements export.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InterviewSessionManager } from './InterviewSessionManager';
import type { InterviewSession } from './InterviewEngine';
import type { DatabaseClient } from '../persistence/database/DatabaseClient';
import type { EventBus } from '../orchestration/events/EventBus';
import type { RequirementsDB } from '../persistence/requirements/RequirementsDB';

// ============================================================================
// Mocks
// ============================================================================

function createMockDatabaseClient(): DatabaseClient {
  const storage = new Map<string, unknown>();

  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              get: vi.fn().mockImplementation(() => null),
            }),
            get: vi.fn().mockImplementation(() => null),
          }),
          get: vi.fn().mockImplementation(() => null),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn(),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
    },
    raw: {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue(null),
      }),
    },
    storage,
  } as unknown as DatabaseClient;
}

function createMockEventBus(): EventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    getInstance: vi.fn(),
  } as unknown as EventBus;
}

function createMockRequirementsDB(): RequirementsDB {
  return {
    addRequirement: vi.fn().mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      category: 'functional',
      description: 'Test requirement',
      priority: 'must',
      source: 'interview:session-1',
      userStories: [],
      acceptanceCriteria: [],
      linkedFeatures: [],
      validated: false,
      confidence: 0.9,
      tags: [],
      createdAt: new Date(),
    }),
  } as unknown as RequirementsDB;
}

function createMockSession(overrides: Partial<InterviewSession> = {}): InterviewSession {
  const now = new Date();
  return {
    id: 'session-1',
    projectId: 'project-1',
    status: 'active',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello, how can I help?',
        timestamp: now,
      },
      {
        id: 'msg-2',
        role: 'user',
        content: 'I need a login feature',
        timestamp: now,
      },
    ],
    extractedRequirements: [
      {
        id: 'req-1',
        text: 'User authentication system',
        category: 'functional',
        priority: 'must',
        confidence: 0.9,
        area: 'authentication',
        sourceMessageId: 'msg-2',
      },
    ],
    exploredAreas: ['authentication'],
    startedAt: now,
    lastActivityAt: now,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('InterviewSessionManager', () => {
  let manager: InterviewSessionManager;
  let mockDb: DatabaseClient;
  let mockEventBus: EventBus;
  let mockRequirementsDB: RequirementsDB;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDb = createMockDatabaseClient();
    mockEventBus = createMockEventBus();
    mockRequirementsDB = createMockRequirementsDB();

    manager = new InterviewSessionManager({
      db: mockDb,
      eventBus: mockEventBus,
      autoSaveInterval: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    manager.stopAutoSave();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('save()', () => {
    it('persists session to database', async () => {
      const session = createMockSession();

      await manager.save(session);

      // Verify insert was called
      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('interview:saved', {
        projectId: session.projectId,
        sessionId: session.id,
      });
    });

    it('updates existing session when ID matches', async () => {
      const session = createMockSession();

      // Mock that session exists
      const mockSelect = mockDb.db.select as ReturnType<typeof vi.fn>;
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              id: session.id,
              projectId: session.projectId,
              type: 'interview',
              status: 'active',
              data: JSON.stringify(session),
              startedAt: session.startedAt,
              endedAt: null,
            }),
          }),
        }),
      });

      await manager.save(session);

      // Verify update was called
      expect(mockDb.db.update).toHaveBeenCalled();
    });
  });

  describe('load()', () => {
    it('retrieves session by ID', async () => {
      const session = createMockSession();
      const serialized = {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        messages: session.messages.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        extractedRequirements: session.extractedRequirements,
        exploredAreas: session.exploredAreas,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
      };

      // Mock returning the session
      const mockSelect = mockDb.db.select as ReturnType<typeof vi.fn>;
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              id: session.id,
              projectId: session.projectId,
              type: 'interview',
              status: 'active',
              data: JSON.stringify(serialized),
              startedAt: session.startedAt,
              endedAt: null,
            }),
          }),
        }),
      });

      const loaded = await manager.load(session.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(session.id);
      expect(loaded?.projectId).toBe(session.projectId);
      expect(loaded?.status).toBe(session.status);
      expect(loaded?.messages).toHaveLength(session.messages.length);
    });

    it('returns null for unknown session', async () => {
      const loaded = await manager.load('unknown-session');

      expect(loaded).toBeNull();
    });
  });

  describe('loadByProject()', () => {
    it('returns active session for project', async () => {
      const session = createMockSession();
      const serialized = {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        messages: session.messages.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        extractedRequirements: session.extractedRequirements,
        exploredAreas: session.exploredAreas,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
      };

      // Mock returning the session
      const mockSelect = mockDb.db.select as ReturnType<typeof vi.fn>;
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue({
                id: session.id,
                projectId: session.projectId,
                type: 'interview',
                status: 'active',
                data: JSON.stringify(serialized),
                startedAt: session.startedAt,
                endedAt: null,
              }),
            }),
          }),
        }),
      });

      const loaded = await manager.loadByProject(session.projectId);

      expect(loaded).not.toBeNull();
      expect(loaded?.projectId).toBe(session.projectId);
      expect(loaded?.status).toBe('active');
    });

    it('returns null when no active session', async () => {
      const loaded = await manager.loadByProject('project-without-session');

      expect(loaded).toBeNull();
    });
  });

  describe('delete()', () => {
    it('removes session from database', async () => {
      await manager.delete('session-1');

      expect(mockDb.db.delete).toHaveBeenCalled();
    });
  });

  describe('startAutoSave()', () => {
    it('triggers periodic saves', async () => {
      const session = createMockSession();
      const saveSpy = vi.spyOn(manager, 'save');

      manager.startAutoSave(session);

      // Initial save not triggered immediately
      expect(saveSpy).not.toHaveBeenCalled();

      // Advance timer by auto-save interval
      await vi.advanceTimersByTimeAsync(1000);

      // Should have triggered save
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Advance again
      await vi.advanceTimersByTimeAsync(1000);
      expect(saveSpy).toHaveBeenCalledTimes(2);

      manager.stopAutoSave();
    });

    it('stops previous auto-save when starting new one', () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });

      manager.startAutoSave(session1);
      manager.startAutoSave(session2);

      // Only one timer should be active
      const saveSpy = vi.spyOn(manager, 'save');

      vi.advanceTimersByTime(1000);

      // Should only save the second session
      expect(saveSpy).toHaveBeenCalledTimes(1);

      manager.stopAutoSave();
    });
  });

  describe('exportToRequirementsDB()', () => {
    it('creates requirements in DB with source traceability', async () => {
      const session = createMockSession();

      const count = await manager.exportToRequirementsDB(session, mockRequirementsDB);

      expect(count).toBe(1);
      expect(mockRequirementsDB.addRequirement).toHaveBeenCalledWith(
        session.projectId,
        expect.objectContaining({
          category: 'functional',
          description: 'User authentication system',
          priority: 'must',
          source: `interview:${session.id}`,
          confidence: 0.9,
          tags: ['authentication'],
        })
      );
    });

    it('continues on duplicate requirement error', async () => {
      const session = createMockSession({
        extractedRequirements: [
          {
            id: 'req-1',
            text: 'First requirement',
            category: 'functional',
            priority: 'must',
            confidence: 0.9,
            sourceMessageId: 'msg-1',
          },
          {
            id: 'req-2',
            text: 'Second requirement',
            category: 'technical',
            priority: 'should',
            confidence: 0.8,
            sourceMessageId: 'msg-2',
          },
        ],
      });

      // First call fails, second succeeds
      const mockAdd = mockRequirementsDB.addRequirement as ReturnType<typeof vi.fn>;
      mockAdd
        .mockRejectedValueOnce(new Error('Duplicate requirement'))
        .mockResolvedValueOnce({});

      const count = await manager.exportToRequirementsDB(session, mockRequirementsDB);

      // Should have attempted both, succeeded on one
      expect(mockRequirementsDB.addRequirement).toHaveBeenCalledTimes(2);
      expect(count).toBe(1);
    });
  });
});
