/**
 * Fixture Verification Tests
 *
 * Verifies that the test fixtures work correctly.
 */
import { test, expect, describe } from './fixtures';
import { projects } from '@/persistence/database';

describe('TestDatabase fixture', () => {
  test('provides fresh in-memory database', async ({ db }) => {
    // Should have db instance
    expect(db).toBeDefined();
    expect(db.db).toBeDefined();

    // Should be able to query (empty by default)
    const allProjects = await db.db.query.projects.findMany();
    expect(allProjects).toEqual([]);
  });

  test('databases are isolated between tests', async ({ db }) => {
    // Insert a project
    const now = new Date();
    await db.db.insert(projects).values({
      id: 'test-project-1',
      name: 'Test Project',
      mode: 'genesis',
      status: 'initializing',
      rootPath: '/tmp/test',
      createdAt: now,
      updatedAt: now,
    });

    // Verify it exists
    const allProjects = await db.db.query.projects.findMany();
    expect(allProjects).toHaveLength(1);
  });

  test('previous test data is not visible', async ({ db }) => {
    // This test should start with fresh database
    const allProjects = await db.db.query.projects.findMany();
    expect(allProjects).toEqual([]);
  });
});

describe('EventBus fixture', () => {
  test('provides fresh EventBus instance', async ({ eventBus }) => {
    expect(eventBus).toBeDefined();
    expect(typeof eventBus.emit).toBe('function');
    expect(typeof eventBus.on).toBe('function');
  });

  test('can emit and receive events', async ({ eventBus }) => {
    const received: unknown[] = [];

    eventBus.on('agent:spawned', (event) => {
      received.push(event.payload);
    });

    eventBus.emit('agent:spawned', { agentId: 'test-1', type: 'coder' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ agentId: 'test-1', type: 'coder' });
  });

  test('listeners are cleaned up between tests', async ({ eventBus }) => {
    // Previous test's listeners should not exist
    const initialCount = eventBus.listenerCount('agent:spawned');
    expect(initialCount).toBe(0);
  });
});
