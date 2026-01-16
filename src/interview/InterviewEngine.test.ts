/**
 * InterviewEngine Tests
 *
 * Tests for the main interview orchestrator.
 * Covers session lifecycle, message processing, requirement extraction, and events.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { InterviewEngine } from './InterviewEngine';
import type { InterviewSession, ProcessMessageResult } from './InterviewEngine';
import type { LLMClient, Message, ChatOptions, LLMResponse } from '../llm';
import type { RequirementsDB, Requirement, RequirementInput } from '../persistence/requirements/RequirementsDB';
import type { EventBus } from '../orchestration/events/EventBus';

/**
 * Create a mock LLM client
 */
function createMockLLMClient(response: string): LLMClient & { chat: Mock } {
  return {
    chat: vi.fn().mockResolvedValue({
      content: response,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    } as LLMResponse),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(100),
  };
}

/**
 * Create a mock RequirementsDB
 */
function createMockRequirementsDB(): RequirementsDB & {
  addRequirement: Mock;
  getRequirement: Mock;
} {
  return {
    addRequirement: vi.fn().mockImplementation(async (_projectId: string, input: RequirementInput) => {
      return {
        id: 'req-' + Math.random().toString(36).slice(2, 9),
        projectId: _projectId,
        category: input.category,
        description: input.description,
        priority: input.priority || 'should',
        source: input.source || null,
        userStories: [],
        acceptanceCriteria: [],
        linkedFeatures: [],
        validated: false,
        confidence: input.confidence || null,
        tags: input.tags || [],
        createdAt: new Date(),
      } as Requirement;
    }),
    getRequirement: vi.fn(),
    // Add stub implementations for other methods
    createProject: vi.fn(),
    getProject: vi.fn(),
    listProjects: vi.fn(),
    deleteProject: vi.fn(),
    updateRequirement: vi.fn(),
    deleteRequirement: vi.fn(),
    getRequirements: vi.fn(),
    searchRequirements: vi.fn(),
    validateRequirement: vi.fn(),
    invalidateRequirement: vi.fn(),
    getUnvalidated: vi.fn(),
    categorizeRequirements: vi.fn(),
    getCategoryStats: vi.fn(),
    moveToCategory: vi.fn(),
    setPriority: vi.fn(),
    getPriorityStats: vi.fn(),
    getByPriority: vi.fn(),
    linkToFeature: vi.fn(),
    unlinkFeature: vi.fn(),
    getLinkedFeatures: vi.fn(),
    getUnlinkedRequirements: vi.fn(),
    exportToJSON: vi.fn(),
    importFromJSON: vi.fn(),
  } as unknown as RequirementsDB & { addRequirement: Mock; getRequirement: Mock };
}

/**
 * Create a mock EventBus
 */
function createMockEventBus(): EventBus & { emit: Mock; on: Mock } {
  return {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    once: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
    onAny: vi.fn().mockReturnValue(() => {}),
    removeAllListeners: vi.fn(),
    listenerCount: vi.fn().mockReturnValue(0),
  } as unknown as EventBus & { emit: Mock; on: Mock };
}

describe('InterviewEngine', () => {
  let engine: InterviewEngine;
  let mockLLMClient: LLMClient & { chat: Mock };
  let mockRequirementsDB: RequirementsDB & { addRequirement: Mock };
  let mockEventBus: EventBus & { emit: Mock };

  beforeEach(() => {
    mockLLMClient = createMockLLMClient('Tell me more about your project!');
    mockRequirementsDB = createMockRequirementsDB();
    mockEventBus = createMockEventBus();

    engine = new InterviewEngine({
      llmClient: mockLLMClient,
      requirementsDB: mockRequirementsDB,
      eventBus: mockEventBus,
    });
  });

  describe('startSession()', () => {
    it('should create session with correct fields', () => {
      const session = engine.startSession('project-123');

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.projectId).toBe('project-123');
      expect(session.status).toBe('active');
      expect(session.messages).toEqual([]);
      expect(session.extractedRequirements).toEqual([]);
      expect(session.exploredAreas).toEqual([]);
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
      expect(session.completedAt).toBeUndefined();
    });

    it('should emit interview:started event', () => {
      engine.startSession('project-456');

      expect(mockEventBus.emit).toHaveBeenCalledWith('interview:started', {
        projectId: 'project-456',
        projectName: 'project-456',
        mode: 'genesis',
      });
    });

    it('should create unique session IDs', () => {
      const session1 = engine.startSession('project-1');
      const session2 = engine.startSession('project-2');

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('processMessage()', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = engine.startSession('project-123');
      // Reset mock calls after startSession
      mockEventBus.emit.mockClear();
      mockLLMClient.chat.mockClear();
    });

    it('should add user message to session', async () => {
      await engine.processMessage(session.id, 'I want to build a todo app');

      const updatedSession = engine.getSession(session.id);
      expect(updatedSession?.messages).toHaveLength(2); // user + assistant
      expect(updatedSession?.messages[0].role).toBe('user');
      expect(updatedSession?.messages[0].content).toBe('I want to build a todo app');
    });

    it('should call LLM with correct messages', async () => {
      await engine.processMessage(session.id, 'I want authentication');

      expect(mockLLMClient.chat).toHaveBeenCalledTimes(1);
      const callArgs = mockLLMClient.chat.mock.calls[0];
      const messages = callArgs[0] as Message[];

      // Should have system + user message
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('I want authentication');
    });

    it('should extract requirements from response', async () => {
      // Mock LLM to return response with requirement
      mockLLMClient.chat.mockResolvedValue({
        content: `
          <requirement>
            <text>Users must authenticate with email and password</text>
            <category>functional</category>
            <priority>must</priority>
            <confidence>0.9</confidence>
            <area>authentication</area>
          </requirement>

          Got it! You need email/password auth.
        `,
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
        finishReason: 'stop',
      });

      const result = await engine.processMessage(session.id, 'I need login functionality');

      expect(result.extractedRequirements).toHaveLength(1);
      expect(result.extractedRequirements[0].text).toBe(
        'Users must authenticate with email and password'
      );
      expect(result.extractedRequirements[0].category).toBe('functional');
    });

    it('should store requirements in DB', async () => {
      mockLLMClient.chat.mockResolvedValue({
        content: `
          <requirement>
            <text>System must support user registration</text>
            <category>functional</category>
            <priority>must</priority>
            <confidence>0.85</confidence>
            <area>authentication</area>
          </requirement>
        `,
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
        finishReason: 'stop',
      });

      await engine.processMessage(session.id, 'Users should register');

      expect(mockRequirementsDB.addRequirement).toHaveBeenCalledTimes(1);
      expect(mockRequirementsDB.addRequirement).toHaveBeenCalledWith(
        'project-123',
        expect.objectContaining({
          category: 'functional',
          description: 'System must support user registration',
          priority: 'must',
          confidence: 0.85,
        })
      );
    });

    it('should update exploredAreas', async () => {
      mockLLMClient.chat.mockResolvedValue({
        content: `
          <requirement>
            <text>API must return JSON responses</text>
            <category>technical</category>
            <priority>should</priority>
            <confidence>0.8</confidence>
            <area>api</area>
          </requirement>
        `,
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
        finishReason: 'stop',
      });

      await engine.processMessage(session.id, 'Tell me about the API');

      const updatedSession = engine.getSession(session.id);
      expect(updatedSession?.exploredAreas).toContain('api');
    });

    it('should emit interview:question-asked events for messages', async () => {
      await engine.processMessage(session.id, 'What features do you have?');

      // Should emit for both user and assistant messages
      const questionAskedCalls = mockEventBus.emit.mock.calls.filter(
        (call) => call[0] === 'interview:question-asked'
      );

      expect(questionAskedCalls.length).toBe(2);
    });

    it('should emit interview:requirement-captured for each extracted requirement', async () => {
      mockLLMClient.chat.mockResolvedValue({
        content: `
          <requirement>
            <text>Req 1</text>
            <category>functional</category>
            <priority>must</priority>
            <confidence>0.9</confidence>
          </requirement>
          <requirement>
            <text>Req 2</text>
            <category>technical</category>
            <priority>should</priority>
            <confidence>0.85</confidence>
          </requirement>
        `,
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
        finishReason: 'stop',
      });

      await engine.processMessage(session.id, 'I need these features');

      const reqCapturedCalls = mockEventBus.emit.mock.calls.filter(
        (call) => call[0] === 'interview:requirement-captured'
      );

      expect(reqCapturedCalls.length).toBe(2);
    });

    it('should return suggestedGaps when appropriate', async () => {
      // First set up enough context
      mockLLMClient.chat.mockResolvedValue({
        content: `
          <requirement><text>R1</text><category>functional</category><priority>must</priority><confidence>0.9</confidence><area>authentication</area></requirement>
          <requirement><text>R2</text><category>functional</category><priority>must</priority><confidence>0.9</confidence><area>authentication</area></requirement>
          <requirement><text>R3</text><category>functional</category><priority>must</priority><confidence>0.9</confidence><area>data_model</area></requirement>
          <requirement><text>R4</text><category>functional</category><priority>must</priority><confidence>0.9</confidence><area>data_model</area></requirement>
        `,
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
        finishReason: 'stop',
      });

      const result = await engine.processMessage(session.id, 'Tell me everything');

      // With 4 requirements and 2 areas, should suggest gaps
      expect(result.suggestedGaps.length).toBeGreaterThan(0);
    });

    it('should throw error for unknown session', async () => {
      await expect(engine.processMessage('unknown-session', 'Hello')).rejects.toThrow(
        'Session not found'
      );
    });

    it('should throw error for inactive session', async () => {
      engine.pauseSession(session.id);

      await expect(engine.processMessage(session.id, 'Hello')).rejects.toThrow(
        'Session is not active'
      );
    });
  });

  describe('getSession()', () => {
    it('should return existing session', () => {
      const created = engine.startSession('project-123');

      const retrieved = engine.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.projectId).toBe('project-123');
    });

    it('should return null for unknown session', () => {
      const session = engine.getSession('non-existent-session');

      expect(session).toBeNull();
    });
  });

  describe('endSession()', () => {
    it('should mark status as completed', () => {
      const session = engine.startSession('project-123');

      engine.endSession(session.id);

      const updated = engine.getSession(session.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it('should emit interview:completed event', () => {
      const session = engine.startSession('project-123');
      mockEventBus.emit.mockClear();

      engine.endSession(session.id);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'interview:completed',
        expect.objectContaining({
          projectId: 'project-123',
          totalRequirements: 0,
          categories: [],
        })
      );
    });

    it('should throw error for unknown session', () => {
      expect(() => engine.endSession('unknown-session')).toThrow('Session not found');
    });
  });

  describe('pauseSession()', () => {
    it('should mark status as paused', () => {
      const session = engine.startSession('project-123');

      engine.pauseSession(session.id);

      const updated = engine.getSession(session.id);
      expect(updated?.status).toBe('paused');
    });

    it('should throw error for unknown session', () => {
      expect(() => engine.pauseSession('unknown-session')).toThrow('Session not found');
    });
  });

  describe('resumeSession()', () => {
    it('should mark status as active', () => {
      const session = engine.startSession('project-123');
      engine.pauseSession(session.id);

      engine.resumeSession(session.id);

      const updated = engine.getSession(session.id);
      expect(updated?.status).toBe('active');
    });

    it('should throw error for non-paused session', () => {
      const session = engine.startSession('project-123');

      expect(() => engine.resumeSession(session.id)).toThrow('Session is not paused');
    });
  });

  describe('getInitialGreeting()', () => {
    it('should return non-empty greeting', () => {
      const greeting = engine.getInitialGreeting();

      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(0);
    });
  });
});
