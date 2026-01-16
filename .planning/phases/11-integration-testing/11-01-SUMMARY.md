---
phase: 11-integration-testing
plan: 01
subsystem: testing
tags: [msw, vitest, fixtures, factories, mocking]

# Dependency graph
requires:
  - phase: 10
    provides: Human checkpoints system complete, ready for testing infrastructure
provides:
  - MSW handlers for Claude and Gemini API mocking
  - Vitest fixtures for db and eventBus with automatic cleanup
  - Test factories for Task, Feature, Requirement, Project, Agent
affects: [11-02, 11-03, 11-04] # All subsequent integration test plans

# Tech tracking
tech-stack:
  added: [msw@2.12.7]
  patterns: [test.extend fixtures, factory functions, SSE stream mocking]

key-files:
  created:
    - tests/mocks/handlers.ts
    - tests/mocks/node.ts
    - tests/helpers/testDb.ts
    - tests/helpers/fixtures.ts
    - tests/helpers/fixtures.test.ts
    - tests/factories/index.ts
    - vitest.setup.ts
  modified:
    - package.json
    - vitest.config.ts

key-decisions:
  - "MSW for network-level mocking vs vi.mock - chose MSW for realistic API behavior"
  - "test.extend fixtures vs beforeEach - chose fixtures for automatic cleanup and type safety"
  - "Factory pattern with ID counter for deterministic test data"

patterns-established:
  - "MSW handlers in tests/mocks/ for API mocking"
  - "Vitest fixtures in tests/helpers/fixtures.ts for reusable setup"
  - "Factory functions in tests/factories/ for domain objects"
  - "vitest.setup.ts for global MSW lifecycle"

issues-created: []

# Metrics
duration: 8min
completed: 2026-01-16
---

# Phase 11 Plan 01: Test Infrastructure Setup Summary

**MSW-based LLM API mocking, Vitest fixtures for db/eventBus, and factory functions for all domain objects**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-16T10:17:00Z
- **Completed:** 2026-01-16T10:25:00Z
- **Tasks:** 3
- **Files modified:** 9 (4 created, 2 modified, 3 new directories)

## Accomplishments

- Installed MSW 2.12.7 for network-level API mocking
- Created Claude API mock with SSE streaming response support
- Created Gemini API mock with JSON response format
- Built Vitest fixtures providing isolated db and eventBus per test
- Created test factories for Task, Feature, Requirement, Project, Agent
- Updated vitest.config.ts to include tests/ directory and MSW setup

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MSW and create LLM mock handlers** - `762a28e` (chore)
2. **Task 2: Create Vitest fixtures and update setup** - `c5a0162` (feat)
3. **Task 3: Create test factories for domain objects** - `7d5d91d` (feat)

## Files Created/Modified

- `tests/mocks/handlers.ts` - MSW handlers for Claude and Gemini APIs with streaming support
- `tests/mocks/node.ts` - MSW server setup with reset helpers
- `tests/helpers/testDb.ts` - TestDatabase class for in-memory SQLite with migrations
- `tests/helpers/fixtures.ts` - Vitest test.extend with db and eventBus fixtures
- `tests/helpers/fixtures.test.ts` - Verification tests for fixtures (6 passing)
- `tests/factories/index.ts` - Factory functions for all domain objects
- `vitest.setup.ts` - Global MSW server lifecycle
- `vitest.config.ts` - Updated to include tests/ and setup files
- `package.json` - Added msw@2.12.7 dependency

## Decisions Made

1. **MSW over vi.mock for API mocking** - Network-level mocking provides more realistic behavior and works with any HTTP client without needing to mock specific imports
2. **test.extend fixtures over beforeEach** - Provides composable, type-safe fixtures with automatic cleanup
3. **Factory pattern with ID counter** - Allows deterministic test data when needed while providing sensible defaults

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Test infrastructure complete and verified (6 fixture tests passing)
- Ready for Plan 11-02: Layer Integration Tests
- MSW handlers ready to mock Claude/Gemini API calls
- Fixtures ready for database and EventBus integration tests
- Factories ready to create test data for all domain objects

---
*Phase: 11-integration-testing*
*Completed: 2026-01-16*
