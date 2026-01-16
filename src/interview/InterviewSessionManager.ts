/**
 * InterviewSessionManager - Session persistence with auto-save
 *
 * Phase 9: Manages interview session lifecycle including:
 * - Save/load sessions to SQLite via sessions table
 * - Auto-save at configurable intervals
 * - Export to RequirementsDB format
 * - Event emission on save operations
 */

import { eq, and, desc } from 'drizzle-orm';
import type { DatabaseClient } from '../persistence/database/DatabaseClient';
import { sessions } from '../persistence/database/schema';
import type { EventBus } from '../orchestration/events/EventBus';
import type { RequirementsDB, RequirementCategory } from '../persistence/requirements/RequirementsDB';
import type { InterviewSession } from './InterviewEngine';
import type { ExtractedRequirement } from './types';

/**
 * Logger interface for InterviewSessionManager
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Options for InterviewSessionManager
 */
export interface InterviewSessionManagerOptions {
  db: DatabaseClient;
  eventBus: EventBus;
  logger?: Logger;
  /** Auto-save interval in milliseconds. Default: 30000 (30 seconds) */
  autoSaveInterval?: number;
}

/**
 * Serialized format for database storage
 */
interface SerializedSession {
  id: string;
  projectId: string;
  status: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string; // ISO string
  }>;
  extractedRequirements: ExtractedRequirement[];
  exploredAreas: string[];
  startedAt: string; // ISO string
  lastActivityAt: string; // ISO string
  completedAt?: string; // ISO string
}

/**
 * Category mapping from extracted requirement categories to RequirementsDB categories
 */
const CATEGORY_MAPPING: Record<string, RequirementCategory> = {
  'functional': 'functional',
  'non-functional': 'non-functional',
  'technical': 'technical',
  'constraint': 'technical',
  'assumption': 'functional',
};

/**
 * InterviewSessionManager - Handles session persistence and auto-save
 */
export class InterviewSessionManager {
  private readonly db: DatabaseClient;
  private readonly eventBus: EventBus;
  private readonly logger?: Logger;
  private readonly autoSaveIntervalMs: number;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private currentSession: InterviewSession | null = null;

  constructor(options: InterviewSessionManagerOptions) {
    this.db = options.db;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.autoSaveIntervalMs = options.autoSaveInterval ?? 30000;
  }

  /**
   * Save an interview session to the database
   *
   * @param session The session to save
   */
  async save(session: InterviewSession): Promise<void> {
    const serialized = this.serializeSession(session);
    const now = new Date();

    // Check if session already exists
    const existing = this.db.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id))
      .get();

    if (existing) {
      // Update existing session
      this.db.db
        .update(sessions)
        .set({
          status: session.status,
          data: JSON.stringify(serialized),
          endedAt: session.status === 'completed' ? now : null,
        })
        .where(eq(sessions.id, session.id))
        .run();

      this.logger?.debug('Updated interview session', { sessionId: session.id });
    } else {
      // Insert new session
      this.db.db.insert(sessions).values({
        id: session.id,
        projectId: session.projectId,
        type: 'interview',
        status: session.status,
        data: JSON.stringify(serialized),
        startedAt: session.startedAt,
        endedAt: session.status === 'completed' ? now : null,
      }).run();

      this.logger?.info('Created interview session', { sessionId: session.id });
    }

    // Emit save event
    this.eventBus.emit('interview:saved', {
      projectId: session.projectId,
      sessionId: session.id,
    });
  }

  /**
   * Load an interview session by ID
   *
   * @param sessionId The session ID to load
   * @returns The session or null if not found
   */
  async load(sessionId: string): Promise<InterviewSession | null> {
    const row = this.db.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.type, 'interview')
        )
      )
      .get();

    if (!row || !row.data) {
      return null;
    }

    return this.deserializeSession(row.data);
  }

  /**
   * Load the active interview session for a project
   *
   * @param projectId The project ID
   * @returns The active session or null if none found
   */
  async loadByProject(projectId: string): Promise<InterviewSession | null> {
    const row = this.db.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.projectId, projectId),
          eq(sessions.type, 'interview'),
          eq(sessions.status, 'active')
        )
      )
      .orderBy(desc(sessions.startedAt))
      .get();

    if (!row || !row.data) {
      return null;
    }

    return this.deserializeSession(row.data);
  }

  /**
   * Delete an interview session
   *
   * @param sessionId The session ID to delete
   */
  async delete(sessionId: string): Promise<void> {
    this.db.db
      .delete(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.type, 'interview')
        )
      )
      .run();

    this.logger?.info('Deleted interview session', { sessionId });
  }

  /**
   * Start auto-save for a session
   *
   * @param session The session to auto-save
   */
  startAutoSave(session: InterviewSession): void {
    // Stop any existing auto-save
    this.stopAutoSave();

    // Store reference to current session
    this.currentSession = session;

    // Start the interval
    this.autoSaveTimer = setInterval(() => {
      if (this.currentSession) {
        void this.save(this.currentSession);
        this.logger?.debug('Auto-saved interview session', {
          sessionId: this.currentSession.id,
        });
      }
    }, this.autoSaveIntervalMs);

    this.logger?.info('Started auto-save for interview session', {
      sessionId: session.id,
      intervalMs: this.autoSaveIntervalMs,
    });
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.currentSession = null;
      this.logger?.debug('Stopped auto-save');
    }
  }

  /**
   * Export session requirements to RequirementsDB
   *
   * @param session The session containing requirements
   * @param requirementsDB The RequirementsDB instance
   * @returns Number of requirements exported
   */
  async exportToRequirementsDB(
    session: InterviewSession,
    requirementsDB: RequirementsDB
  ): Promise<number> {
    let exported = 0;

    for (const req of session.extractedRequirements) {
      try {
        // Map category to RequirementsDB format
        const dbCategory = CATEGORY_MAPPING[req.category] || 'functional';

        await requirementsDB.addRequirement(session.projectId, {
          category: dbCategory,
          description: req.text,
          priority: req.priority,
          source: `interview:${session.id}`,
          confidence: req.confidence,
          tags: req.area ? [req.area] : [],
        });

        exported++;
      } catch (error) {
        // Log but continue - might be duplicate
        this.logger?.warn('Failed to export requirement', {
          requirementId: req.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger?.info('Exported requirements to RequirementsDB', {
      sessionId: session.id,
      exportedCount: exported,
      totalCount: session.extractedRequirements.length,
    });

    return exported;
  }

  /**
   * Serialize session for database storage
   */
  private serializeSession(session: InterviewSession): SerializedSession {
    return {
      id: session.id,
      projectId: session.projectId,
      status: session.status,
      messages: session.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })),
      extractedRequirements: session.extractedRequirements,
      exploredAreas: session.exploredAreas,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
    };
  }

  /**
   * Deserialize session from database storage
   */
  private deserializeSession(data: string): InterviewSession {
    const parsed = JSON.parse(data) as SerializedSession;

    return {
      id: parsed.id,
      projectId: parsed.projectId,
      status: parsed.status as InterviewSession['status'],
      messages: parsed.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })),
      extractedRequirements: parsed.extractedRequirements,
      exploredAreas: parsed.exploredAreas,
      startedAt: new Date(parsed.startedAt),
      lastActivityAt: new Date(parsed.lastActivityAt),
      completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
    };
  }
}
