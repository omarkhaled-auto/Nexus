import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E test configuration for Nexus Electron app.
 *
 * Configured for Electron testing with:
 * - Serial execution (workers: 1) to avoid Electron instance conflicts
 * - Extended timeout (60s) for app startup + rendering
 * - Trace and video capture on retry for debugging CI failures
 * - No browser projects (Electron-only)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000, // Extended timeout for Electron startup + rendering
  expect: {
    timeout: 10000, // 10s for assertions (app may need time to render)
  },
  fullyParallel: false, // Serial execution for Electron
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid Electron instance conflicts
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  // No browser projects - Electron-only testing
  // Tests use custom Electron fixtures from e2e/fixtures/electron.ts
});
