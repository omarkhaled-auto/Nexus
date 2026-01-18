# Phase 11: Integration & Testing - Research

**Researched:** 2026-01-16
**Domain:** Vitest integration testing, Playwright E2E for Electron, MSW API mocking
**Confidence:** HIGH

<research_summary>
## Summary

Researched testing patterns for an Electron + React application with LLM API dependencies. The standard approach combines Vitest for unit/integration tests, Playwright's Electron support for E2E testing, and MSW for API mocking.

Key finding: Playwright has first-class Electron support via `electron.launch()` — no need for workarounds. MSW supports streaming responses via `ReadableStream`, making it suitable for mocking LLM streaming APIs (Claude, Gemini).

**Primary recommendation:** Use existing Vitest setup with `test.extend` for fixtures, add MSW for LLM API mocking, configure Playwright with Electron support for E2E tests.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 2.1.8 | Unit/integration tests | Vite-native, fast, Jest-compatible |
| @playwright/test | 1.49.1 | E2E testing | First-class Electron support |
| @testing-library/react | 16.3.1 | React component testing | Standard for React testing |
| @vitest/coverage-v8 | 2.1.8 | Code coverage | Native Vitest integration |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| msw | 2.7.x | API mocking | Mock Claude/Gemini APIs in tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MSW | vi.mock on SDK | vi.mock works but MSW is more realistic (network-level) |
| MSW | nock | nock is older, MSW is modern standard |
| Playwright | WebDriverIO | Playwright has better Electron support |

**Installation:**
```bash
npm install -D msw@latest
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Test Structure
```
src/
├── **/*.test.ts              # Co-located unit tests (existing)
tests/
├── integration/              # Cross-layer integration tests
│   ├── layers/               # Layer-to-layer tests
│   └── flows/                # Full flow tests
├── factories/                # Test data factories
├── helpers/                  # Shared test utilities
└── mocks/                    # MSW handlers
e2e/
├── *.spec.ts                 # Playwright E2E tests
└── fixtures/                 # E2E setup/seed data
```

### Pattern 1: MSW for LLM API Mocking
**What:** Mock Claude/Gemini APIs at network level with streaming support
**When to use:** Integration tests that need realistic API behavior
**Example:**
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw'

export const handlers = [
  // Mock Claude API with streaming
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    const body = await request.json()

    // Simulate streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const chunks = [
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":" world"}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ]
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk))
          await delay(50)
        }
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'content-type': 'text/event-stream' },
    })
  }),

  // Mock Gemini API
  http.post('https://generativelanguage.googleapis.com/*', async () => {
    return HttpResponse.json({
      candidates: [{
        content: { parts: [{ text: 'Mock Gemini response' }] }
      }]
    })
  }),
]
```

### Pattern 2: Vitest Fixtures for Test Setup
**What:** Use `test.extend` for reusable setup/teardown
**When to use:** Tests needing database, event bus, or other infrastructure
**Example:**
```typescript
// tests/helpers/fixtures.ts
import { test as baseTest } from 'vitest'
import { createTestDatabase, TestDatabase } from './testDb'
import { EventBus } from '@/orchestration/events/EventBus'

interface TestFixtures {
  db: TestDatabase
  eventBus: EventBus
}

export const test = baseTest.extend<TestFixtures>({
  db: async ({}, use) => {
    const db = await createTestDatabase()
    await use(db)
    await db.cleanup()
  },
  eventBus: async ({}, use) => {
    const bus = new EventBus()
    await use(bus)
    bus.removeAllListeners()
  },
})
```

### Pattern 3: Playwright Electron E2E
**What:** E2E tests running against actual Electron app
**When to use:** Full user flow validation
**Example:**
```typescript
// e2e/interview.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test('should complete interview flow', async () => {
  const electronApp = await electron.launch({ args: ['dist/main.js'] })
  const window = await electronApp.firstWindow()

  // Navigate to interview
  await window.click('text=New Project')

  // Send message
  await window.fill('[data-testid="chat-input"]', 'I want to build a todo app')
  await window.click('[data-testid="send-button"]')

  // Verify requirement extracted
  await expect(window.locator('[data-testid="requirement-item"]')).toBeVisible()

  await electronApp.close()
})
```

### Pattern 4: Test Factories
**What:** Functions to create valid test data
**When to use:** Any test needing domain objects
**Example:**
```typescript
// tests/factories/index.ts
import { Task, Feature, Requirement } from '@/types'

let idCounter = 0

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${++idCounter}`,
    title: 'Test Task',
    status: 'pending',
    dependencies: [],
    estimatedMinutes: 30,
    ...overrides,
  }
}

export function createFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: `feature-${++idCounter}`,
    name: 'Test Feature',
    complexity: 'medium',
    tasks: [],
    ...overrides,
  }
}

export function createRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: `req-${++idCounter}`,
    text: 'Test requirement',
    category: 'functional',
    priority: 'should',
    source: 'test',
    ...overrides,
  }
}
```

### Anti-Patterns to Avoid
- **Mocking too much:** Integration tests should test real layer interactions, not mock everything
- **Flaky async tests:** Use proper waitFor/expect patterns, not arbitrary delays
- **Shared mutable state:** Use fixtures for proper setup/teardown, avoid global state
- **Testing implementation details:** Test behavior, not internal structure
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API mocking | Manual fetch mocks | MSW | Network-level, works with any HTTP client |
| Stream mocking | Manual chunk generators | MSW ReadableStream | Handles backpressure, timing correctly |
| Test fixtures | beforeEach/afterEach everywhere | Vitest test.extend | Composable, type-safe, auto-cleanup |
| E2E waits | sleep() / setTimeout | Playwright auto-wait | Built-in retry, less flaky |
| Test data | Inline object literals | Factories | Consistent, maintainable, type-safe |
| Coverage | Manual tracking | @vitest/coverage-v8 | Automatic, accurate, CI-friendly |

**Key insight:** Testing infrastructure has solved problems like flaky async tests, proper cleanup, and realistic mocking. Using established patterns prevents reinventing these solutions.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Flaky Electron Tests
**What goes wrong:** E2E tests pass locally but fail in CI
**Why it happens:** Timing issues, missing waits, environment differences
**How to avoid:** Use Playwright's auto-wait, run in headless mode, add explicit waits for async operations
**Warning signs:** Tests that "usually pass" or need re-runs

### Pitfall 2: MSW Not Intercepting Requests
**What goes wrong:** Mocks not applied, real API called
**Why it happens:** Server not started before tests, wrong URL patterns
**How to avoid:** Call `server.listen()` in `beforeAll`, verify URL patterns match actual requests
**Warning signs:** Unexpected network errors, API rate limits in tests

### Pitfall 3: Integration Tests Becoming Unit Tests
**What goes wrong:** Tests mock so much they don't test real integration
**Why it happens:** Desire for isolation, fear of complexity
**How to avoid:** Only mock external boundaries (APIs, file system), test real layer interactions
**Warning signs:** Tests pass but bugs appear in production

### Pitfall 4: Database State Leaking Between Tests
**What goes wrong:** Test order matters, tests fail when run in isolation
**Why it happens:** Shared database not reset between tests
**How to avoid:** Use fixtures with cleanup, run each test with fresh DB state
**Warning signs:** `--shuffle` flag causes failures, tests pass only in specific order

### Pitfall 5: Streaming Response Timing Issues
**What goes wrong:** Stream tests hang or timeout
**Why it happens:** ReadableStream not properly closed, missing `controller.close()`
**How to avoid:** Always close controllers, use MSW's delay() for timing
**Warning signs:** Tests hang indefinitely, memory leaks in test runner
</common_pitfalls>

<code_examples>
## Code Examples

### MSW Setup for Vitest
```typescript
// tests/mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// vitest.setup.ts (add to existing)
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './tests/mocks/node'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Playwright Electron Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
  },
})
```

### Integration Test Example
```typescript
// tests/integration/layers/planning-execution.test.ts
import { describe, it, expect } from 'vitest'
import { test } from '../helpers/fixtures'
import { TaskDecomposer } from '@/planning/decomposition/TaskDecomposer'
import { AgentPool } from '@/orchestration/agents/AgentPool'

describe('Planning → Execution Integration', () => {
  test('decomposed tasks can be queued for execution', async ({ db, eventBus }) => {
    const decomposer = new TaskDecomposer(db)
    const pool = new AgentPool({ maxAgents: 2, eventBus })

    // Decompose a feature
    const tasks = await decomposer.decompose({
      name: 'User authentication',
      requirements: [{ text: 'Users can log in', priority: 'must' }]
    })

    expect(tasks).toHaveLength(3)

    // Queue for execution
    for (const task of tasks) {
      await pool.queueTask(task)
    }

    expect(pool.pendingCount).toBe(3)
  })
})
```

### E2E Test with Console Capture
```typescript
// e2e/interview.spec.ts
import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test'

let electronApp: ElectronApplication

test.beforeAll(async () => {
  electronApp = await electron.launch({ args: ['dist/main.js'] })

  // Capture console for debugging
  electronApp.on('console', async msg => {
    console.log(`[Electron] ${msg.text()}`)
  })
})

test.afterAll(async () => {
  await electronApp.close()
})

test('interview page loads', async () => {
  const window = await electronApp.firstWindow()
  await expect(window.locator('h1')).toContainText('Interview')
})
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nock for Node mocking | MSW 2.x | 2024 | Unified browser/node mocking |
| Manual vi.mock for APIs | MSW network interception | 2024 | More realistic, less brittle |
| Spectron for Electron | Playwright Electron | 2023 | Better maintained, more features |
| beforeEach/afterEach | Vitest test.extend fixtures | 2024 | Composable, type-safe |

**New tools/patterns to consider:**
- **Vitest 3.x scoped fixtures:** `scope: 'file'` for file-level setup (reduces test time)
- **Playwright component testing:** Can test React components in real browser (not needed for this phase but good to know)
- **MSW data library:** `@mswjs/data` for mock database with relationships

**Deprecated/outdated:**
- **Spectron:** Archived, use Playwright instead
- **nock:** Still works but MSW is more modern
- **jest-electron:** Use Playwright Electron support
</sota_updates>

<open_questions>
## Open Questions

1. **MSW with Electron main process**
   - What we know: MSW works in Node.js environments
   - What's unclear: Whether MSW intercepts requests from Electron main process vs renderer
   - Recommendation: Test both, may need separate MSW servers for main/renderer

2. **Parallel E2E test execution**
   - What we know: Playwright supports parallel workers
   - What's unclear: Whether multiple Electron instances can run simultaneously without conflicts
   - Recommendation: Start with serial execution, test parallelization carefully
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- /microsoft/playwright - Electron support, project dependencies, console events
- /websites/mswjs_io - Node.js setup, Vitest integration, streaming responses
- /vitest-dev/vitest - test.extend fixtures, module mocking, setup files

### Secondary (MEDIUM confidence)
- MSW + streaming pattern derived from official docs
- Electron test patterns verified against Playwright docs

### Tertiary (LOW confidence - needs validation)
- None - all findings verified
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Vitest + Playwright + MSW
- Ecosystem: test.extend fixtures, streaming mocks, Electron E2E
- Patterns: Layer integration, API mocking, test factories
- Pitfalls: Flaky tests, MSW setup, state leakage

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project or well-documented
- Architecture: HIGH - patterns from official documentation
- Pitfalls: HIGH - common issues documented in library guides
- Code examples: HIGH - from Context7/official sources

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - testing ecosystem stable)
</metadata>

---

*Phase: 11-integration-testing*
*Research completed: 2026-01-16*
*Ready for planning: yes*
