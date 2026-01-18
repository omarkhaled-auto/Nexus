/**
 * Vitest Test Fixtures
 *
 * Provides reusable test fixtures using Vitest's test.extend pattern.
 * Fixtures automatically handle setup and cleanup for common test dependencies.
 *
 * @module tests/helpers/fixtures
 */
import { test as baseTest } from 'vitest';
import { TestDatabase, createTestDatabase } from './testDb';
import { EventBus } from '@/orchestration/events/EventBus';

// ============================================================================
// Fixture Types
// ============================================================================

/**
 * Available test fixtures
 */
export interface TestFixtures {
  /** Fresh in-memory database with migrations applied */
  db: TestDatabase;

  /** Fresh EventBus instance (not the singleton) */
  eventBus: EventBus;
}

// ============================================================================
// Extended Test with Fixtures
// ============================================================================

/**
 * Extended test function with typed fixtures.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../helpers/fixtures';
 *
 * test('can query database', async ({ db }) => {
 *   const projects = await db.db.query.projects.findMany();
 *   expect(projects).toEqual([]);
 * });
 *
 * test('can emit events', async ({ eventBus }) => {
 *   const events: string[] = [];
 *   eventBus.on('agent:spawned', () => events.push('spawned'));
 *   eventBus.emit('agent:spawned', { agentId: '1', type: 'coder' });
 *   expect(events).toContain('spawned');
 * });
 * ```
 */
export const test = baseTest.extend<TestFixtures>({
  /**
   * Database fixture - creates fresh in-memory DB for each test.
   * Automatically runs migrations and cleans up after test.
   */
  db: async ({}, use) => {
    const db = await createTestDatabase();
    await use(db);
    await db.cleanup();
  },

  /**
   * EventBus fixture - creates fresh instance for each test.
   * Resets the singleton and removes all listeners after test.
   */
  eventBus: async ({}, use) => {
    // Reset singleton to get fresh instance
    EventBus.resetInstance();
    const bus = EventBus.getInstance();

    await use(bus);

    // Clean up: remove all listeners and reset singleton
    bus.removeAllListeners();
    EventBus.resetInstance();
  },
});

// Re-export expect for convenience
export { expect, describe, it, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
