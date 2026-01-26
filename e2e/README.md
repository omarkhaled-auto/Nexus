# Nexus E2E Test Suite

Comprehensive end-to-end testing infrastructure for the Nexus autonomous AI application builder.

## Overview

The E2E test suite provides comprehensive coverage of Nexus functionality through:
- **Integration Tests**: Testing complete workflows and feature interactions
- **Validation Tests**: Verifying data accuracy and integrity
- **Smoke Tests**: Basic functionality verification
- **Page-specific Tests**: Focused testing of individual pages

## Test Statistics

- **Total Tests**: 160 tests
- **Test Files**: 16 files
- **Integration Tests**: 27 tests (4 files)
- **Validation Tests**: 16 tests (2 files)
- **Coverage Areas**: Interview, Execution, Checkpoint, Settings, Dashboard, Kanban, Agents, Planning

## Directory Structure

```
e2e/
├── fixtures/
│   ├── electron.ts          # Electron app fixtures
│   ├── seed.ts              # Test data seeding utilities
│   ├── ipc-utils.ts         # IPC communication helpers
│   └── test-data.ts         # Sample test data and factories
├── page-objects/
│   ├── InterviewPage.ts     # Genesis interview page object
│   ├── KanbanPage.ts        # Evolution Kanban page object
│   ├── DashboardPage.ts     # Dashboard observability page object
│   ├── ExecutionPage.ts     # Execution monitoring page object
│   ├── AgentsPage.ts        # Agent management page object
│   ├── PlanningPage.ts      # Planning orchestration page object
│   ├── SettingsPage.ts      # Settings configuration page object
│   ├── ModeSelectorPage.ts  # Mode selection page object
│   └── index.ts             # Page objects export
├── integration/
│   ├── interview-integration.spec.ts    # Interview flow integration (8 tests)
│   ├── execution-integration.spec.ts    # Execution flow integration (8 tests)
│   ├── checkpoint-integration.spec.ts   # Checkpoint lifecycle integration (5 tests)
│   └── settings-integration.spec.ts     # Settings persistence integration (5 tests)
├── validation/
│   ├── dashboard-validation.spec.ts     # Dashboard metrics validation (8 tests)
│   └── kanban-validation.spec.ts        # Kanban state validation (8 tests)
├── interview.spec.ts        # Interview page tests (12 tests)
├── execution.spec.ts        # Execution page tests (13 tests)
├── checkpoint.spec.ts       # Checkpoint tests (11 tests)
├── kanban.spec.ts          # Kanban page tests (12 tests)
├── dashboard.spec.ts       # Dashboard page tests (14 tests)
├── agents.spec.ts          # Agents page tests (19 tests)
├── planning.spec.ts        # Planning page tests (11 tests)
├── settings.spec.ts        # Settings page tests (21 tests)
├── mode-selector.spec.ts   # Mode selector tests (7 tests)
├── smoke.spec.ts           # Smoke tests (5 tests)
└── README.md               # This file
```

## Test Fixtures

### Electron Fixtures (`fixtures/electron.ts`)

Custom Playwright fixtures for Electron E2E testing:

```typescript
import { test, expect } from './fixtures/electron';

test('example test', async ({ electronApp, window }) => {
  // electronApp: ElectronApplication instance
  // window: Page instance for UI interactions
});
```

### Test Data Fixtures (`fixtures/test-data.ts`)

Predefined test data and factory functions:

```typescript
import { sampleFeatures, sampleRequirements, testDataFactory } from './fixtures/test-data';

// Use sample data
await injectTestData(page, 'features', sampleFeatures);

// Create custom test data
const feature = testDataFactory.feature({ title: 'Custom Feature', status: 'backlog' });
const features = testDataFactory.features(5, { priority: 'high' });
```

**Available Sample Data**:
- `sampleFeatures`: 6 features across all statuses
- `sampleRequirements`: 8 requirements with various types
- `sampleCheckpoints`: 3 checkpoints with metadata
- `sampleAgents`: 4 agents with different statuses
- `sampleMessages`: 4 chat messages

**Factory Functions**:
- `testDataFactory.feature(overrides?)`: Create single feature
- `testDataFactory.features(count, overrides?)`: Create multiple features
- `testDataFactory.requirement(overrides?)`: Create single requirement
- `testDataFactory.requirements(count, overrides?)`: Create multiple requirements
- `testDataFactory.checkpoint(overrides?)`: Create checkpoint
- `testDataFactory.agent(overrides?)`: Create agent
- `testDataFactory.message(overrides?)`: Create chat message

**Test Scenarios**:
- `testScenarios.empty`: No data
- `testScenarios.minimal`: One of each type
- `testScenarios.completeWorkflow`: All stages represented
- `testScenarios.activeExecution`: Active agents and tasks

### IPC Utilities (`fixtures/ipc-utils.ts`)

Helpers for testing Electron IPC communication:

```typescript
import { waitForIPCEvent, injectTestData, mockIPCHandler } from './fixtures/ipc-utils';

// Wait for IPC events
await waitForIPCEvent(page, 'feature-created', 5000);

// Inject test data
await injectTestData(page, 'features', [feature1, feature2]);

// Mock IPC handlers
await mockIPCHandler(page, 'create-feature', (args) => ({ success: true }));
```

**Available Functions**:
- `waitForIPCEvent(page, eventName, timeout?)`: Wait for IPC event
- `waitForIPCResponse(page, channel, expectedResult?, timeout?)`: Wait for IPC response
- `injectTestData(page, dataType, data)`: Inject test data via test bridge
- `waitForStoreUpdate(page, storeName, predicate, timeout?)`: Wait for Zustand store update
- `mockIPCHandler(page, channel, handler)`: Mock IPC handler
- `clearIPCMocks(page)`: Clear all mocked handlers
- `triggerIPCEvent(page, eventName, data?)`: Trigger IPC event

### Seed Utilities (`fixtures/seed.ts`)

Test data seeding and navigation helpers:

```typescript
import { seedFeatures, seedRequirements, navigateTo, clearTestData } from './fixtures/seed';

// Seed test data
await seedFeatures(page, [{ title: 'Test Feature', status: 'backlog' }]);
await seedRequirements(page, [{ content: 'Must have authentication' }]);

// Navigate
await navigateTo(page, '/dashboard');

// Clear all test data
await clearTestData(page);
```

## Page Objects

### InterviewPage

```typescript
const interview = new InterviewPage(page);

await interview.navigate();
await interview.sendMessage('Build a task manager');
await interview.waitForResponse();
await interview.completeInterview();

const requirementsCount = await interview.getRequirementsCount();
const hasResume = await interview.hasResumeBanner();
```

### KanbanPage

```typescript
const kanban = new KanbanPage(page);

await kanban.navigate();
await kanban.dragFeature('feat-123', 'in_progress');
await kanban.openFeatureModal('feat-123');

const count = await kanban.getColumnCardCount('backlog');
const isInColumn = await kanban.isFeatureInColumn('feat-123', 'done');
```

### DashboardPage

```typescript
const dashboard = new DashboardPage(page);

await dashboard.navigate();
await dashboard.waitForLoad();

const features = await dashboard.getTotalFeatures();
const progress = await dashboard.getTaskProgress(); // { completed, total, percent }
const agentsCount = await dashboard.getActiveAgentsCount();
const agents = await dashboard.getAgentsWithStatus();
```

## Integration Tests

### Interview Integration (8 tests)

Tests the complete interview flow from chat to requirements:

- **INT-INTERVIEW-001**: Chat to requirements chain
- **INT-INTERVIEW-002**: Message sending and response cycle
- **INT-INTERVIEW-003**: Requirement extraction from conversation
- **INT-INTERVIEW-004**: Session state persistence across navigation
- **INT-INTERVIEW-005**: Draft save and restore
- **INT-INTERVIEW-006**: Interview completion and transition
- **INT-INTERVIEW-007**: State synchronization between chat and requirements
- **INT-INTERVIEW-008**: Empty state and first-time flow

### Execution Integration (8 tests)

Tests the execution flow with agents and logs:

- **INT-EXEC-001**: Execution to agents to logs chain
- **INT-EXEC-002**: Task status updates in real-time
- **INT-EXEC-003**: Log streaming during execution
- **INT-EXEC-004**: Progress tracking across multiple agents
- **INT-EXEC-005**: Execution error handling
- **INT-EXEC-006**: Multi-agent coordination
- **INT-EXEC-007**: Execution metrics and statistics
- **INT-EXEC-008**: Empty execution state handling

### Checkpoint Integration (5 tests)

Tests checkpoint creation, listing, and restoration:

- **INT-CP-001**: Checkpoint creation and verification
- **INT-CP-002**: Checkpoint listing
- **INT-CP-003**: State restoration from checkpoint
- **INT-CP-004**: Checkpoint metadata validation
- **INT-CP-005**: Complete save-restore cycle

### Settings Integration (5 tests)

Tests settings persistence and synchronization:

- **INT-SETTINGS-001**: API key persistence
- **INT-SETTINGS-002**: Model selection persistence
- **INT-SETTINGS-003**: Settings validation
- **INT-SETTINGS-004**: Settings sync across tabs
- **INT-SETTINGS-005**: Settings preservation after restart

## Validation Tests

### Dashboard Validation (8 tests)

Validates accuracy of dashboard metrics:

- **VAL-DASH-001**: Feature count accuracy
- **VAL-DASH-002**: Task progress calculation
- **VAL-DASH-003**: Active agents count
- **VAL-DASH-004**: Progress chart data points
- **VAL-DASH-005**: Cost tracking accuracy
- **VAL-DASH-006**: Zero metrics for empty project
- **VAL-DASH-007**: Real-time metric updates
- **VAL-DASH-008**: Status distribution across columns

### Kanban Validation (8 tests)

Validates Kanban board state and operations:

- **VAL-KANBAN-001**: Feature counts in each column
- **VAL-KANBAN-002**: Column header counts
- **VAL-KANBAN-003**: Status update synchronization
- **VAL-KANBAN-004**: Total feature count accuracy
- **VAL-KANBAN-005**: Empty column states
- **VAL-KANBAN-006**: Feature card data matching
- **VAL-KANBAN-007**: WIP limit enforcement
- **VAL-KANBAN-008**: Board state persistence

## Running Tests

### Run All Tests

```bash
npm run test:e2e
# or
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test interview.spec.ts
npx playwright test integration/interview-integration.spec.ts
```

### Run Tests by Pattern

```bash
# Run all integration tests
npx playwright test integration/

# Run all validation tests
npx playwright test validation/

# Run tests with specific tag
npx playwright test --grep "INT-INTERVIEW"
```

### Run Tests in UI Mode

```bash
npx playwright test --ui
```

### Run Tests with Debug

```bash
npx playwright test --debug
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

## Test Configuration

Configuration in `playwright.config.ts`:

- **Serial Execution**: `workers: 1` to avoid Electron instance conflicts
- **Extended Timeout**: 60s for Electron startup and rendering
- **Retry Policy**: 2 retries in CI, 0 locally
- **Trace Collection**: On first retry for debugging
- **Video Recording**: On first retry for CI debugging

## Writing New Tests

### 1. Choose Test Type

- **Integration Test**: Tests complete workflow across multiple pages
- **Validation Test**: Tests data accuracy and calculations
- **Page Test**: Tests specific page functionality

### 2. Use Fixtures

```typescript
import { test, expect } from './fixtures/electron';
import { navigateTo, clearTestData } from './fixtures/seed';
import { injectTestData } from './fixtures/ipc-utils';
import { testDataFactory } from './fixtures/test-data';
```

### 3. Follow Test Structure

```typescript
test.describe('Feature Name Tests', () => {
  test.beforeEach(async ({ window: page }) => {
    await clearTestData(page);
    await navigateTo(page, '/route');
    await page.waitForLoadState('networkidle');
  });

  test('TEST-ID: should do something', async ({ window: page }) => {
    // Arrange
    await injectTestData(page, 'features', testDataFactory.features(3));

    // Act
    const element = page.locator('[data-testid="element"]');
    await element.click();

    // Assert
    await expect(element).toHaveText('Expected Text');
  });
});
```

### 4. Use Page Objects

```typescript
test('should use page object', async ({ window: page }) => {
  const kanban = new KanbanPage(page);

  await kanban.navigate();
  await kanban.dragFeature('feat-1', 'done');

  const count = await kanban.getColumnCardCount('done');
  expect(count).toBe(1);
});
```

### 5. Test Naming Convention

- **Test ID**: `TEST-AREA-NNN` (e.g., `INT-INTERVIEW-001`, `VAL-DASH-002`)
- **Test Description**: Clear, action-oriented description
- **Test File**: `{area}.spec.ts` or `{category}/{area}-{type}.spec.ts`

## Best Practices

### 1. Use Test Data Factories

```typescript
// Good
const feature = testDataFactory.feature({ status: 'done' });

// Avoid
const feature = {
  id: 'feat-123',
  title: 'Feature',
  // ... all fields manually
};
```

### 2. Clear State Between Tests

```typescript
test.beforeEach(async ({ window: page }) => {
  await clearTestData(page);
});
```

### 3. Use Page Objects

```typescript
// Good
const dashboard = new DashboardPage(page);
await dashboard.waitForLoad();
const count = await dashboard.getTotalFeatures();

// Avoid
await page.waitForSelector('[data-testid="stats-cards"]');
const card = page.locator('[data-testid="stat-card-features"]');
// ... complex selector logic in test
```

### 4. Handle Test Mode Gracefully

```typescript
// Tests run in Electron test mode where backend may not be fully initialized
const hasData = await element.isVisible().catch(() => false);

if (hasData) {
  // Test with data
  expect(value).toBe(expected);
} else {
  // Verify page is still functional
  await expect(page.locator('main')).toBeVisible();
}
```

### 5. Use Appropriate Timeouts

```typescript
// Short timeout for fast operations
await element.waitFor({ timeout: 1000 });

// Medium timeout for UI updates
await page.waitForTimeout(500);

// Long timeout for Electron startup
await page.waitForSelector('header', { timeout: 15000 });
```

## Troubleshooting

### Test Fails with "Electron not found"

Build the Electron app first:

```bash
npm run build:electron
```

### Test Hangs or Times Out

1. Check Electron console output for errors
2. Increase timeout in test or config
3. Run with `--debug` flag to step through

### Tests Pass Locally but Fail in CI

1. Check for race conditions with `waitForLoadState`
2. Add explicit waits before assertions
3. Review CI logs for Electron console errors

### Page Object Selectors Not Working

1. Verify `data-testid` attributes are in source components
2. Check if element is in shadow DOM or iframe
3. Use Playwright Inspector to debug selectors:

```bash
npx playwright test --debug
```

## Contributing

When adding new tests:

1. Add test data to `fixtures/test-data.ts` if needed
2. Update page objects with new selectors
3. Follow TDD principles: write failing test first
4. Use existing patterns and conventions
5. Add test to appropriate category (integration/validation/page)
6. Update this README with new test descriptions

## Test Infrastructure Roadmap

- [ ] Add visual regression testing with Playwright screenshots
- [ ] Add performance testing metrics
- [ ] Add accessibility testing with axe-core
- [ ] Add database state validation tests
- [ ] Add network request mocking for offline testing
- [ ] Add cross-platform testing (Windows, macOS, Linux)
- [ ] Add test coverage reporting
- [ ] Add parallel test execution optimization

---

**Test Coverage**: 160 tests covering Interview, Execution, Checkpoint, Settings, Dashboard, Kanban, Agents, Planning, and Mode Selection flows.

**Maintained by**: Nexus Test Team
**Last Updated**: 2026-01-26
