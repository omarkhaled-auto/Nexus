/**
 * MSW Server for Node.js Environment
 *
 * Sets up the MSW server for use in Vitest tests.
 * Import this module to get the configured server instance.
 *
 * @module tests/mocks/node
 */
import { setupServer } from 'msw/node';
import { handlers, resetMockState } from './handlers';

/**
 * MSW server instance configured with LLM API handlers.
 *
 * Usage in tests:
 * - server.listen() in beforeAll
 * - server.resetHandlers() in afterEach
 * - server.close() in afterAll
 */
export const server = setupServer(...handlers);

/**
 * Reset both MSW handlers and mock state.
 * Call this in afterEach for clean test isolation.
 */
export function resetServer(): void {
  server.resetHandlers();
  resetMockState();
}

// Re-export handler helpers for convenience
export {
  handlers,
  resetMockState,
  mockState,
  setClaudeResponse,
  setClaudeToolUse,
  setClaudeError,
  setGeminiResponse,
  setGeminiError,
} from './handlers';
