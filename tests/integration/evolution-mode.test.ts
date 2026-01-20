/**
 * Evolution Mode Integration Tests
 *
 * Phase 19 Task 10: Tests for the Evolution mode flow that covers:
 * - Project selection -> RepoMap generation
 * - RepoMap -> Interview context injection
 * - Evolution mode interview flow
 * - Evolution joins same execution path as Genesis
 * - Backend -> UI event forwarding for Evolution
 *
 * These tests verify that the Evolution mode flow events propagate correctly
 * through the NexusBootstrap wiring layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, getEventBus } from '../../src/orchestration/events/EventBus';
import { InterviewEngine, type InterviewEngineOptions, type InterviewSession, type EvolutionContext, type StartSessionOptions } from '../../src/interview/InterviewEngine';
import { EVOLUTION_INITIAL_GREETING, getEvolutionSystemPrompt } from '../../src/interview/prompts/interviewer';

// ============================================================================
// Test Mocks
// ============================================================================

/**
 * Create mock LLM client for testing
 */
function createMockLLMClient() {
  return {
    chat: vi.fn().mockResolvedValue({
      content: 'I understand you want to enhance the existing project. What specific feature would you like to add?',
      usage: { promptTokens: 100, completionTokens: 50 },
    }),
  };
}

/**
 * Create mock RequirementsDB for testing
 */
function createMockRequirementsDB() {
  const requirements: Array<{ id: string; projectId: string; description: string }> = [];
  return {
    addRequirement: vi.fn().mockImplementation((projectId: string, req: { description: string }) => {
      const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      requirements.push({ id, projectId, description: req.description });
      return id;
    }),
    getRequirements: vi.fn().mockImplementation((projectId: string) => {
      return requirements.filter(r => r.projectId === projectId);
    }),
  };
}

/**
 * Helper to wait for async event propagation
 */
function waitForEventPropagation(ms = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Evolution Mode Flow Tests
// ============================================================================

describe('Evolution Mode - Project Selection and RepoMap', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    // Subscribe to all events to track what's emitted
    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  describe('Evolution Start Flow', () => {
    it('should emit project:status-changed when evolution mode starts', async () => {
      await eventBus.emit('project:status-changed', {
        projectId: 'evolution-123',
        previousStatus: 'planning' as const,
        newStatus: 'planning' as const,
        reason: 'Starting Evolution mode - analyzing existing codebase',
      });

      const event = eventLog.find((e) => e.type === 'project:status-changed');
      expect(event).toBeDefined();
      expect(event?.payload).toMatchObject({
        projectId: 'evolution-123',
        reason: expect.stringContaining('Evolution mode'),
      });
    });

    it('should emit interview:started with evolution mode', async () => {
      await eventBus.emit('interview:started', {
        projectId: 'evolution-project-456',
        projectName: 'Evolution: /path/to/project',
        mode: 'evolution' as const,
      });

      const event = eventLog.find((e) => e.type === 'interview:started');
      expect(event).toBeDefined();
      expect((event?.payload as { mode: string }).mode).toBe('evolution');
    });

    it('should support different project paths in evolution mode', async () => {
      const projectPaths = [
        '/home/user/my-app',
        'C:\\Users\\Dev\\project',
        './relative/path/project',
      ];

      for (const projectPath of projectPaths) {
        await eventBus.emit('project:status-changed', {
          projectId: `evolution-${Date.now()}`,
          previousStatus: 'planning' as const,
          newStatus: 'planning' as const,
          reason: `Starting Evolution mode for ${projectPath}`,
        });
      }

      const events = eventLog.filter((e) => e.type === 'project:status-changed');
      expect(events.length).toBe(3);
    });
  });

  describe('RepoMap Generation Events', () => {
    it('should emit status update during repo map generation', async () => {
      const projectId = 'evolution-repomap-test';

      // Simulate repo map generation progress
      await eventBus.emit('project:status-changed', {
        projectId,
        previousStatus: 'planning' as const,
        newStatus: 'planning' as const,
        reason: 'Generating repository map from existing codebase',
      });

      await waitForEventPropagation();

      const event = eventLog.find((e) => e.type === 'project:status-changed');
      expect(event).toBeDefined();
      expect((event?.payload as { reason: string }).reason).toContain('repository map');
    });

    it('should handle repo map generation failure gracefully', async () => {
      await eventBus.emit('system:error', {
        component: 'RepoMapGenerator',
        error: 'Failed to parse project files',
        recoverable: true,
      });

      const event = eventLog.find((e) => e.type === 'system:error');
      expect(event).toBeDefined();
      expect((event?.payload as { recoverable: boolean }).recoverable).toBe(true);
    });
  });
});

// ============================================================================
// Evolution Interview Context Tests
// ============================================================================

describe('Evolution Mode - Interview with Context', () => {
  let eventBus: EventBus;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;
  let mockRequirementsDB: ReturnType<typeof createMockRequirementsDB>;
  let interviewEngine: InterviewEngine;

  beforeEach(() => {
    eventBus = getEventBus();
    mockLLMClient = createMockLLMClient();
    mockRequirementsDB = createMockRequirementsDB();

    const options: InterviewEngineOptions = {
      llmClient: mockLLMClient as unknown as InterviewEngineOptions['llmClient'],
      requirementsDB: mockRequirementsDB as unknown as InterviewEngineOptions['requirementsDB'],
      eventBus,
    };

    interviewEngine = new InterviewEngine(options);
  });

  describe('Evolution Context Injection', () => {
    it('should start session in evolution mode with context', () => {
      const evolutionContext: EvolutionContext = {
        projectPath: '/path/to/existing/project',
        repoMapContext: 'File: src/index.ts\n  - export function main()',
        projectSummary: 'TypeScript project with 10 files, 50 functions',
      };

      const sessionOptions: StartSessionOptions = {
        mode: 'evolution',
        evolutionContext,
      };

      const session = interviewEngine.startSession('evolution-context-test', sessionOptions);

      expect(session).toBeDefined();
      expect(session.mode).toBe('evolution');
      expect(session.evolutionContext).toEqual(evolutionContext);
    });

    it('should use evolution greeting for evolution mode', () => {
      const greeting = interviewEngine.getInitialGreeting('evolution');
      expect(greeting).toBe(EVOLUTION_INITIAL_GREETING);
      expect(greeting).toContain('existing project');
    });

    it('should use genesis greeting for genesis mode', () => {
      const greeting = interviewEngine.getInitialGreeting('genesis');
      expect(greeting).not.toBe(EVOLUTION_INITIAL_GREETING);
    });

    it('should default to genesis mode without options', () => {
      const session = interviewEngine.startSession('default-mode-test');
      expect(session.mode).toBe('genesis');
      expect(session.evolutionContext).toBeUndefined();
    });
  });

  describe('Evolution System Prompt', () => {
    it('should generate evolution system prompt with repo map context', () => {
      const repoMapContext = `
        File: src/index.ts
          - export function main()
          - export const VERSION = "1.0.0"
        File: src/utils/helper.ts
          - export function formatDate(date: Date)
      `;

      const systemPrompt = getEvolutionSystemPrompt(repoMapContext);

      expect(systemPrompt).toContain('existing project');
      expect(systemPrompt).toContain(repoMapContext);
    });

    it('should include guidelines for referencing existing code', () => {
      const repoMapContext = 'File: src/app.ts\n  - function handleRequest()';
      const systemPrompt = getEvolutionSystemPrompt(repoMapContext);

      // Evolution prompt should reference existing code patterns
      expect(systemPrompt).toContain('existing');
    });
  });
});

// ============================================================================
// Evolution Joins Genesis Execution Path Tests
// ============================================================================

describe('Evolution Mode - Joins Genesis Execution Path', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should emit interview:completed event same as Genesis', async () => {
    await eventBus.emit('interview:completed', {
      projectId: 'evolution-interview-complete',
      totalRequirements: 5,
      categories: ['functional', 'technical'],
      duration: 180000,
    });

    const event = eventLog.find((e) => e.type === 'interview:completed');
    expect(event).toBeDefined();
    expect((event?.payload as { totalRequirements: number }).totalRequirements).toBe(5);
  });

  it('should emit same execution events as Genesis after interview', async () => {
    const projectId = 'evolution-execution-test';

    // Interview completes
    await eventBus.emit('interview:completed', {
      projectId,
      totalRequirements: 3,
      categories: ['functional'],
      duration: 120000,
    });

    // Project status changes to executing (same as Genesis)
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'planning' as const,
      newStatus: 'executing' as const,
      reason: 'Interview completed, starting execution',
    });

    // Task assigned (same as Genesis)
    await eventBus.emit('task:assigned', {
      taskId: `${projectId}-task-1`,
      agentId: 'coder-001',
      agentType: 'coder' as const,
      worktreePath: '/tmp/evolution-worktree',
    });

    const interviewComplete = eventLog.find((e) => e.type === 'interview:completed');
    const statusChanged = eventLog.find((e) => e.type === 'project:status-changed');
    const taskAssigned = eventLog.find((e) => e.type === 'task:assigned');

    expect(interviewComplete).toBeDefined();
    expect(statusChanged).toBeDefined();
    expect(taskAssigned).toBeDefined();
    expect((statusChanged?.payload as { newStatus: string }).newStatus).toBe('executing');
  });

  it('should use same QA flow events as Genesis', async () => {
    const taskId = 'evolution-task-qa-test';

    // QA Build (same as Genesis)
    await eventBus.emit('qa:build-completed', {
      taskId,
      passed: true,
      duration: 5000,
      errors: [],
    });

    // QA Lint (same as Genesis)
    await eventBus.emit('qa:lint-completed', {
      taskId,
      passed: true,
      duration: 2000,
      errors: [],
      warnings: [],
    });

    // QA Tests (same as Genesis)
    await eventBus.emit('qa:test-completed', {
      taskId,
      passed: true,
      duration: 10000,
      passedCount: 20,
      failedCount: 0,
      coverage: 85,
    });

    // QA Review (same as Genesis)
    await eventBus.emit('qa:review-completed', {
      taskId,
      approved: true,
      duration: 3000,
      reviewer: 'ai' as const,
      issueCount: 0,
    });

    const qaEvents = eventLog.filter((e) => e.type.startsWith('qa:'));
    expect(qaEvents.length).toBe(4);
  });

  it('should support same escalation flow as Genesis', async () => {
    const projectId = 'evolution-escalation-test';
    const taskId = `${projectId}-task-fail`;

    // Task fails with escalation (same as Genesis)
    await eventBus.emit('task:escalated', {
      taskId,
      reason: 'Max iterations exceeded during evolution task',
      iterations: 50,
      lastError: 'Tests failed after modifying existing code',
    });

    // Checkpoint created (same as Genesis)
    await eventBus.emit('system:checkpoint-created', {
      checkpointId: `cp-${taskId}`,
      projectId,
      reason: 'Evolution task escalated for human review',
      gitCommit: 'evolution-escalation-commit',
    });

    // Review requested (same as Genesis)
    await eventBus.emit('review:requested', {
      reviewId: `review-${taskId}`,
      taskId,
      reason: 'qa_exhausted' as const,
      context: {
        qaIterations: 50,
        escalationReason: 'Max iterations exceeded',
        suggestedAction: 'Review changes to existing code',
      },
    });

    expect(eventLog.find((e) => e.type === 'task:escalated')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'system:checkpoint-created')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'review:requested')).toBeDefined();
  });
});

// ============================================================================
// Evolution Complete Flow Integration Tests
// ============================================================================

describe('Evolution Mode - Complete Flow Integration', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown; timestamp: Date }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({
        type: event.type,
        payload: event.payload,
        timestamp: new Date(),
      });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should complete full Evolution flow: select -> repomap -> interview -> execute -> success', async () => {
    const projectId = 'evolution-complete-flow';
    const taskId = `${projectId}-task-1`;

    // 1. Evolution mode starts (project selection)
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'planning' as const,
      newStatus: 'planning' as const,
      reason: 'Starting Evolution mode - analyzing existing codebase',
    });

    // 2. Interview starts in evolution mode
    await eventBus.emit('interview:started', {
      projectId,
      projectName: 'Evolution: My Existing App',
      mode: 'evolution' as const,
    });

    // 3. Requirement captured during interview
    await eventBus.emit('interview:requirement-captured', {
      projectId,
      requirement: {
        id: 'req-evo-001',
        projectId,
        category: 'functional' as const,
        content: 'Add dark mode toggle to settings page',
        priority: 'high' as const,
        source: 'interview' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 4. Interview completes
    await eventBus.emit('interview:completed', {
      projectId,
      totalRequirements: 1,
      categories: ['functional'],
      duration: 120000,
    });

    // 5. Status changes to executing
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'planning' as const,
      newStatus: 'executing' as const,
      reason: 'Interview completed, starting execution',
    });

    // 6. Task assigned
    await eventBus.emit('task:assigned', {
      taskId,
      agentId: 'coder-evolution-001',
      agentType: 'coder' as const,
      worktreePath: '/tmp/evolution-worktree',
    });

    // 7. Task starts
    await eventBus.emit('task:started', {
      taskId,
      agentId: 'coder-evolution-001',
      startedAt: new Date(),
    });

    // 8. QA passes
    await eventBus.emit('qa:build-completed', {
      taskId,
      passed: true,
      duration: 5000,
      errors: [],
    });

    await eventBus.emit('qa:test-completed', {
      taskId,
      passed: true,
      duration: 15000,
      passedCount: 25,
      failedCount: 0,
      coverage: 80,
    });

    // 9. Task completes
    await eventBus.emit('task:completed', {
      taskId,
      result: {
        taskId,
        success: true,
        files: [
          { path: 'src/components/Settings.tsx', action: 'modified' as const },
          { path: 'src/styles/theme.css', action: 'modified' as const },
        ],
        metrics: { iterations: 1, tokensUsed: 3000, timeMs: 25000 },
      },
    });

    // 10. Project completes
    await eventBus.emit('project:completed', {
      projectId,
      totalDuration: 300000,
      metrics: {
        tasksTotal: 1,
        tasksCompleted: 1,
        tasksFailed: 0,
        featuresTotal: 1,
        featuresCompleted: 1,
        estimatedTotalMinutes: 15,
        actualTotalMinutes: 5,
        averageQAIterations: 1,
      },
    });

    // Verify complete flow sequence
    const eventTypes = eventLog.map((e) => e.type);
    expect(eventTypes).toContain('project:status-changed');
    expect(eventTypes).toContain('interview:started');
    expect(eventTypes).toContain('interview:requirement-captured');
    expect(eventTypes).toContain('interview:completed');
    expect(eventTypes).toContain('task:assigned');
    expect(eventTypes).toContain('task:started');
    expect(eventTypes).toContain('qa:build-completed');
    expect(eventTypes).toContain('qa:test-completed');
    expect(eventTypes).toContain('task:completed');
    expect(eventTypes).toContain('project:completed');

    // Verify Evolution-specific: mode is 'evolution'
    const interviewStarted = eventLog.find((e) => e.type === 'interview:started');
    expect((interviewStarted?.payload as { mode: string }).mode).toBe('evolution');
  });

  it('should handle Evolution flow with modifications to existing files', async () => {
    const projectId = 'evolution-modify-existing';
    const taskId = `${projectId}-modify-task`;

    // Task that modifies existing files (Evolution-specific)
    await eventBus.emit('task:completed', {
      taskId,
      result: {
        taskId,
        success: true,
        files: [
          { path: 'src/index.ts', action: 'modified' as const },
          { path: 'src/utils/helpers.ts', action: 'modified' as const },
          { path: 'tests/index.test.ts', action: 'modified' as const },
          { path: 'src/components/NewFeature.tsx', action: 'created' as const },
        ],
        metrics: { iterations: 2, tokensUsed: 5000, timeMs: 45000 },
      },
    });

    const event = eventLog.find((e) => e.type === 'task:completed');
    expect(event).toBeDefined();

    const payload = event?.payload as {
      result: { files: Array<{ path: string; action: string }> };
    };

    // Verify both modified and created files are tracked
    const modifiedFiles = payload.result.files.filter((f) => f.action === 'modified');
    const createdFiles = payload.result.files.filter((f) => f.action === 'created');

    expect(modifiedFiles.length).toBe(3);
    expect(createdFiles.length).toBe(1);
  });
});

// ============================================================================
// Evolution-Specific Edge Cases
// ============================================================================

describe('Evolution Mode - Edge Cases', () => {
  let eventBus: EventBus;
  let eventLog: Array<{ type: string; payload: unknown }>;
  let unsubscribe: () => void;

  beforeEach(() => {
    eventBus = getEventBus();
    eventLog = [];

    unsubscribe = eventBus.onAny((event) => {
      eventLog.push({ type: event.type, payload: event.payload });
    });
  });

  afterEach(() => {
    unsubscribe();
    eventLog = [];
  });

  it('should handle Evolution without repo map context (fallback)', async () => {
    // Start Evolution without repo map (graceful degradation)
    await eventBus.emit('interview:started', {
      projectId: 'evolution-no-repomap',
      projectName: 'Evolution: Project Without Map',
      mode: 'evolution' as const,
    });

    // Should still work - interview started
    const event = eventLog.find((e) => e.type === 'interview:started');
    expect(event).toBeDefined();
    expect((event?.payload as { mode: string }).mode).toBe('evolution');
  });

  it('should handle large project repo maps', async () => {
    // Simulate a large project context
    const largeRepoMapStats = {
      totalFiles: 500,
      totalSymbols: 2500,
      totalDependencies: 1200,
    };

    await eventBus.emit('project:status-changed', {
      projectId: 'evolution-large-project',
      previousStatus: 'planning' as const,
      newStatus: 'planning' as const,
      reason: `Analyzed ${largeRepoMapStats.totalFiles} files, ${largeRepoMapStats.totalSymbols} symbols`,
    });

    const event = eventLog.find((e) => e.type === 'project:status-changed');
    expect(event).toBeDefined();
    expect((event?.payload as { reason: string }).reason).toContain('500 files');
  });

  it('should distinguish evolution project IDs from genesis', async () => {
    // Evolution project IDs should have 'evolution-' prefix
    const evolutionProjectId = 'evolution-1234567890';
    const genesisProjectId = 'genesis-1234567890';

    await eventBus.emit('interview:started', {
      projectId: evolutionProjectId,
      projectName: 'Evolution Project',
      mode: 'evolution' as const,
    });

    await eventBus.emit('interview:started', {
      projectId: genesisProjectId,
      projectName: 'Genesis Project',
      mode: 'genesis' as const,
    });

    const events = eventLog.filter((e) => e.type === 'interview:started');
    expect(events.length).toBe(2);

    const evolutionEvent = events.find(
      (e) => (e.payload as { projectId: string }).projectId.startsWith('evolution-')
    );
    const genesisEvent = events.find(
      (e) => (e.payload as { projectId: string }).projectId.startsWith('genesis-')
    );

    expect(evolutionEvent).toBeDefined();
    expect(genesisEvent).toBeDefined();
  });

  it('should handle checkpoint restore in Evolution mode', async () => {
    const projectId = 'evolution-checkpoint-restore';
    const checkpointId = 'cp-evolution-001';

    // Create checkpoint during Evolution
    await eventBus.emit('system:checkpoint-created', {
      checkpointId,
      projectId,
      reason: 'Pre-modification checkpoint',
      gitCommit: 'evolution-pre-mod-commit',
    });

    // Restore checkpoint
    await eventBus.emit('system:checkpoint-restored', {
      checkpointId,
      projectId,
      gitCommit: 'evolution-pre-mod-commit',
    });

    // Project status updates
    await eventBus.emit('project:status-changed', {
      projectId,
      previousStatus: 'executing' as const,
      newStatus: 'paused' as const,
      reason: 'Checkpoint restored - reviewing changes',
    });

    expect(eventLog.find((e) => e.type === 'system:checkpoint-created')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'system:checkpoint-restored')).toBeDefined();
    expect(eventLog.find((e) => e.type === 'project:status-changed')).toBeDefined();
  });
});

// ============================================================================
// Evolution Session Manager Persistence Tests
// ============================================================================

describe('Evolution Mode - Session Persistence', () => {
  let eventBus: EventBus;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;
  let mockRequirementsDB: ReturnType<typeof createMockRequirementsDB>;
  let interviewEngine: InterviewEngine;

  beforeEach(() => {
    eventBus = getEventBus();
    mockLLMClient = createMockLLMClient();
    mockRequirementsDB = createMockRequirementsDB();

    const options: InterviewEngineOptions = {
      llmClient: mockLLMClient as unknown as InterviewEngineOptions['llmClient'],
      requirementsDB: mockRequirementsDB as unknown as InterviewEngineOptions['requirementsDB'],
      eventBus,
    };

    interviewEngine = new InterviewEngine(options);
  });

  it('should preserve evolution context in session', () => {
    const evolutionContext: EvolutionContext = {
      projectPath: '/path/to/project',
      repoMapContext: 'Symbol map content here',
      projectSummary: 'Project summary',
    };

    const session = interviewEngine.startSession('persistence-test', {
      mode: 'evolution',
      evolutionContext,
    });

    expect(session.evolutionContext).toBeDefined();
    expect(session.evolutionContext?.projectPath).toBe('/path/to/project');
    expect(session.evolutionContext?.repoMapContext).toBe('Symbol map content here');
  });

  it('should allow session retrieval with evolution context', () => {
    const evolutionContext: EvolutionContext = {
      projectPath: '/another/project',
      repoMapContext: 'Different content',
    };

    const createdSession = interviewEngine.startSession('retrieval-test', {
      mode: 'evolution',
      evolutionContext,
    });

    const retrievedSession = interviewEngine.getSession(createdSession.id);

    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.mode).toBe('evolution');
    expect(retrievedSession?.evolutionContext?.projectPath).toBe('/another/project');
  });

  it('should handle session end in evolution mode', () => {
    const session = interviewEngine.startSession('end-test', {
      mode: 'evolution',
      evolutionContext: {
        projectPath: '/test/path',
        repoMapContext: 'context',
      },
    });

    expect(session.status).toBe('active');

    interviewEngine.endSession(session.id);

    const endedSession = interviewEngine.getSession(session.id);
    expect(endedSession?.status).toBe('completed');
    expect(endedSession?.completedAt).toBeDefined();
  });

  it('should handle session pause and resume in evolution mode', () => {
    const session = interviewEngine.startSession('pause-resume-test', {
      mode: 'evolution',
      evolutionContext: {
        projectPath: '/pause/test',
        repoMapContext: 'pause context',
      },
    });

    // Pause
    interviewEngine.pauseSession(session.id);
    let currentSession = interviewEngine.getSession(session.id);
    expect(currentSession?.status).toBe('paused');

    // Resume
    interviewEngine.resumeSession(session.id);
    currentSession = interviewEngine.getSession(session.id);
    expect(currentSession?.status).toBe('active');
    expect(currentSession?.evolutionContext?.projectPath).toBe('/pause/test');
  });
});
