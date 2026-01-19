/**
 * Vitest Global Setup
 *
 * Configures global test environment including MSW server lifecycle.
 * This file runs before all tests.
 *
 * @module vitest.setup
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file for API integration tests
dotenv.config({ path: resolve(__dirname, '.env') });

import { beforeAll, afterEach, afterAll } from 'vitest';
import { server, resetServer } from './tests/mocks/node';

// ============================================================================
// MSW Server Lifecycle
// ============================================================================

/**
 * Start MSW server before all tests.
 * 'error' mode ensures unhandled requests fail the test.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

/**
 * Reset handlers and mock state after each test.
 * Ensures test isolation.
 */
afterEach(() => {
  resetServer();
});

/**
 * Close MSW server after all tests complete.
 */
afterAll(() => {
  server.close();
});
