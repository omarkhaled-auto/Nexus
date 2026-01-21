/**
 * InterviewEngine - Main orchestrator for interview conversations
 *
 * Coordinates the full interview flow:
 * - Session management (start, pause, end)
 * - Message processing with LLM
 * - Requirement extraction and storage
 * - Event emission for UI updates
 *
 * Reference: Phase 9 RESEARCH.md - AgentRunner-Style Tool Loop
 */

import { nanoid } from 'nanoid';
import type { LLMClient, Message, ChatOptions } from '../llm';
import type { RequirementsDB, RequirementCategory } from '../persistence/requirements/RequirementsDB';
import type { EventBus } from '../orchestration/events/EventBus';
import { RequirementExtractor } from './RequirementExtractor';
import { QuestionGenerator } from './QuestionGenerator';
import type { InterviewMessage, GenerationContext } from './QuestionGenerator';
import type { ExtractedRequirement } from './types';
import {
  INTERVIEWER_SYSTEM_PROMPT,
  INITIAL_GREETING,
  EVOLUTION_INITIAL_GREETING,
  getEvolutionSystemPrompt,
} from './prompts/interviewer';
import type { RequirementCategory as CoreRequirementCategory, RequirementPriority as CoreRequirementPriority } from '../types/core';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Options for InterviewEngine
 */
export interface InterviewEngineOptions {
  llmClient: LLMClient;
  requirementsDB: RequirementsDB;
  eventBus: EventBus;
  logger?: Logger;
}

/**
 * Interview session status
 */
export type InterviewSessionStatus = 'active' | 'paused' | 'completed';

/**
 * Interview mode: genesis (new project) or evolution (existing project)
 */
export type InterviewMode = 'genesis' | 'evolution';

/**
 * Evolution context for existing project enhancement
 */
export interface EvolutionContext {
  /** Path to the existing project */
  projectPath: string;
  /** Formatted repo map context for LLM */
  repoMapContext: string;
  /** Summary of the project structure */
  projectSummary?: string;
}

/**
 * Options for starting a new session
 */
export interface StartSessionOptions {
  /** Interview mode */
  mode?: InterviewMode;
  /** Evolution context (required for evolution mode) */
  evolutionContext?: EvolutionContext;
}

/**
 * An interview session
 */
export interface InterviewSession {
  /** Unique session identifier */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** Current session status */
  status: InterviewSessionStatus;
  /** Interview mode */
  mode: InterviewMode;
  /** Evolution context (if mode is 'evolution') */
  evolutionContext?: EvolutionContext;
  /** All messages in the conversation */
  messages: InterviewMessage[];
  /** Requirements extracted during this session */
  extractedRequirements: ExtractedRequirement[];
  /** Domain areas that have been explored */
  exploredAreas: string[];
  /** When the session was started */
  startedAt: Date;
  /** When there was last activity */
  lastActivityAt: Date;
  /** When the session was completed (if completed) */
  completedAt?: Date;
}

/**
 * Result from processing a user message
 */
export interface ProcessMessageResult {
  /** The assistant's response */
  response: string;
  /** Requirements extracted from this exchange */
  extractedRequirements: ExtractedRequirement[];
  /** Suggested gaps to explore */
  suggestedGaps: string[];
}

/**
 * Category mapping from interview categories to RequirementsDB categories
 */
const CATEGORY_MAPPING: Partial<Record<string, RequirementCategory>> = {
  'functional': 'functional',
  'non-functional': 'non-functional',
  'technical': 'technical',
  'constraint': 'technical', // Map to technical as constraint isn't in RequirementsDB
  'assumption': 'functional', // Map assumptions to functional for now
};

/**
 * InterviewEngine - Orchestrates the interview conversation flow
 *
 * This is the main entry point for conducting requirements interviews.
 * It coordinates LLM calls, requirement extraction, storage, and events.
 */
export class InterviewEngine {
  private readonly llmClient: LLMClient;
  private readonly requirementsDB: RequirementsDB;
  private readonly eventBus: EventBus;
  private readonly logger?: Logger;
  private readonly extractor: RequirementExtractor;
  private readonly questionGenerator: QuestionGenerator;

  /** Active sessions indexed by session ID */
  private readonly sessions: Map<string, InterviewSession> = new Map();

  constructor(options: InterviewEngineOptions) {
    this.llmClient = options.llmClient;
    this.requirementsDB = options.requirementsDB;
    this.eventBus = options.eventBus;
    this.logger = options.logger;

    // Initialize components
    this.extractor = new RequirementExtractor();
    this.questionGenerator = new QuestionGenerator({
      llmClient: this.llmClient,
      logger: this.logger,
    });
  }

  /**
   * Start a new interview session
   *
   * @param projectId The project to conduct interview for
   * @param options Optional session configuration (mode, evolution context)
   * @returns The new interview session
   */
  startSession(projectId: string, options?: StartSessionOptions): InterviewSession {
    const now = new Date();
    const mode = options?.mode ?? 'genesis';
    const evolutionContext = options?.evolutionContext;

    // Validate evolution mode has context
    if (mode === 'evolution' && !evolutionContext) {
      this.logger?.warn('Evolution mode started without context', { projectId });
    }

    const session: InterviewSession = {
      id: nanoid(),
      projectId,
      status: 'active',
      mode,
      evolutionContext,
      messages: [],
      extractedRequirements: [],
      exploredAreas: [],
      startedAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(session.id, session);

    this.logger?.info('Started interview session', {
      sessionId: session.id,
      projectId,
      mode,
      hasEvolutionContext: !!evolutionContext,
    });

    // Emit interview:started event (fire-and-forget)
    void this.eventBus.emit('interview:started', {
      projectId,
      projectName: projectId, // Will be resolved from DB if needed
      mode,
    });

    return session;
  }

  /**
   * Process a user message in the interview
   *
   * Flow:
   * 1. Add user message to session
   * 2. Build messages array with system prompt + history
   * 3. Call LLM
   * 4. Add assistant response to session
   * 5. Extract requirements
   * 6. Store requirements in DB
   * 7. Update explored areas
   * 8. Check for gaps to suggest
   * 9. Emit events
   *
   * @param sessionId The session ID
   * @param userMessage The user's message content
   * @returns Processing result with response, requirements, and gaps
   */
  async processMessage(sessionId: string, userMessage: string): Promise<ProcessMessageResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    // 1. Add user message to session
    const userMsgId = nanoid();
    const userMsg: InterviewMessage = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    session.messages.push(userMsg);

    this.logger?.debug('Processing user message', {
      sessionId,
      messageId: userMsgId,
      contentLength: userMessage.length,
    });

    // Emit user message event
    this.emitMessageEvent(session, userMsg);

    // 2. Build messages for LLM
    const llmMessages = this.buildLLMMessages(session);

    this.logger?.debug('Calling LLM', {
      sessionId,
      messageCount: llmMessages.length,
      clientType: this.llmClient.constructor.name,
    });

    // 3. Call LLM in chat-only mode (no tools)
    // Interview is pure conversation - we don't want Claude trying to create files
    const options: ChatOptions = {
      maxTokens: 2048,
      temperature: 0.7,
      disableTools: true, // Chat-only mode for interview
    };

    const llmResponse = await this.llmClient.chat(llmMessages, options);
    const responseContent = llmResponse.content;

    // 4. Add assistant response to session
    const assistantMsgId = nanoid();
    const assistantMsg: InterviewMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };
    session.messages.push(assistantMsg);

    // Emit assistant message event
    this.emitMessageEvent(session, assistantMsg);

    // 5. Extract requirements
    const extractionResult = this.extractor.extract(responseContent, assistantMsgId);
    const newRequirements = extractionResult.requirements;

    this.logger?.info('Extracted requirements', {
      sessionId,
      rawCount: extractionResult.rawCount,
      filteredCount: extractionResult.filteredCount,
    });

    // 6. Store requirements in DB
    for (const req of newRequirements) {
      try {
        // Map category to RequirementsDB format
        const dbCategory = CATEGORY_MAPPING[req.category] ?? 'functional';

        this.requirementsDB.addRequirement(session.projectId, {
          category: dbCategory,
          description: req.text,
          priority: req.priority,
          source: `interview:${session.id}`,
          confidence: req.confidence,
          tags: req.area ? [req.area] : [],
        });

        // Add to session's extracted requirements
        session.extractedRequirements.push(req);

        // Emit requirement captured event
        this.emitRequirementEvent(session, req);
      } catch (error) {
        // Log but don't fail - might be duplicate
        this.logger?.warn('Failed to store requirement', {
          sessionId,
          requirementId: req.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 7. Update explored areas
    this.updateExploredAreas(session, newRequirements);

    // 8. Check for gaps
    const context: GenerationContext = {
      conversationHistory: session.messages,
      extractedRequirements: session.extractedRequirements,
      exploredAreas: session.exploredAreas,
    };

    const gaps = this.questionGenerator.detectGaps(session.exploredAreas);
    const suggestedGaps = this.questionGenerator.shouldSuggestGap(context) ? gaps : [];

    // 9. Update last activity
    session.lastActivityAt = new Date();

    return {
      response: responseContent,
      extractedRequirements: newRequirements,
      suggestedGaps,
    };
  }

  /**
   * Get a session by ID
   *
   * @param sessionId The session ID
   * @returns The session or null if not found
   */
  getSession(sessionId: string): InterviewSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * End an interview session
   *
   * @param sessionId The session ID
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'completed';
    session.completedAt = new Date();

    this.logger?.info('Ended interview session', {
      sessionId,
      projectId: session.projectId,
      requirementCount: session.extractedRequirements.length,
      messageCount: session.messages.length,
    });

    // Emit interview:completed event (fire-and-forget)
    void this.eventBus.emit('interview:completed', {
      projectId: session.projectId,
      totalRequirements: session.extractedRequirements.length,
      categories: [...new Set(session.extractedRequirements.map((r) => r.category))],
      duration: session.completedAt.getTime() - session.startedAt.getTime(),
    });
  }

  /**
   * Pause an interview session
   *
   * @param sessionId The session ID
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'paused';
    session.lastActivityAt = new Date();

    this.logger?.info('Paused interview session', {
      sessionId,
      projectId: session.projectId,
    });
  }

  /**
   * Resume a paused interview session
   *
   * @param sessionId The session ID
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session is not paused: ${session.status}`);
    }

    session.status = 'active';
    session.lastActivityAt = new Date();

    this.logger?.info('Resumed interview session', {
      sessionId,
      projectId: session.projectId,
    });
  }

  /**
   * Get the initial greeting for a new session
   * @param mode The interview mode (genesis or evolution)
   */
  getInitialGreeting(mode: InterviewMode = 'genesis'): string {
    return mode === 'evolution' ? EVOLUTION_INITIAL_GREETING : INITIAL_GREETING;
  }

  /**
   * Build messages array for LLM call
   */
  private buildLLMMessages(session: InterviewSession): Message[] {
    // Use Evolution-specific system prompt if in evolution mode with context
    let systemPrompt = INTERVIEWER_SYSTEM_PROMPT;
    if (session.mode === 'evolution' && session.evolutionContext) {
      systemPrompt = getEvolutionSystemPrompt(session.evolutionContext.repoMapContext);
    }

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of session.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Update explored areas based on extracted requirements
   */
  private updateExploredAreas(
    session: InterviewSession,
    requirements: ExtractedRequirement[]
  ): void {
    for (const req of requirements) {
      if (req.area && !session.exploredAreas.includes(req.area)) {
        session.exploredAreas.push(req.area);
      }
    }
  }

  /**
   * Emit message event (fire-and-forget)
   */
  private emitMessageEvent(session: InterviewSession, message: InterviewMessage): void {
    void this.eventBus.emit('interview:question-asked', {
      projectId: session.projectId,
      questionId: message.id,
      question: message.content,
      category: undefined,
    });
  }

  /**
   * Emit requirement captured event (fire-and-forget)
   */
  private emitRequirementEvent(session: InterviewSession, requirement: ExtractedRequirement): void {
    // Map category to RequirementsDB format
    const mappedCategory = CATEGORY_MAPPING[requirement.category] ?? 'functional';

    // Create a Requirement object for the event
    // Using type assertions to handle interface differences between modules
    const now = new Date();
    void this.eventBus.emit('interview:requirement-captured', {
      projectId: session.projectId,
      requirement: {
        id: requirement.id,
        projectId: session.projectId,
        category: mappedCategory as unknown as CoreRequirementCategory,
        content: requirement.text,
        priority: requirement.priority as unknown as CoreRequirementPriority,
        source: 'interview' as const,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
