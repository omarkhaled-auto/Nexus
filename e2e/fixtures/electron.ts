import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { resolve } from 'path';

/**
 * Custom fixtures for Electron E2E testing.
 *
 * Provides:
 * - electronApp: Launched Electron application instance
 * - window: First window (Page) for UI interactions
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/electron';
 *
 * test('app launches', async ({ window }) => {
 *   await expect(window).toHaveTitle(/Nexus/);
 * });
 * ```
 */
export interface ElectronFixtures {
  electronApp: ElectronApplication;
  window: Page;
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Path to the built Electron main process
    const mainPath = resolve(__dirname, '../../out/main/index.js');

    // Launch Electron app
    const app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // Capture console messages for debugging
    app.on('console', (msg) => {
      console.log(`[Electron Console] ${msg.text()}`);
    });

    await use(app);

    // Clean up: close app after test
    await app.close();
  },

  window: async ({ electronApp }, use) => {
    // Wait for first window to open
    const window = await electronApp.firstWindow();

    // Wait for app to fully load
    await window.waitForLoadState('domcontentloaded');

    // Optional: wait a bit more for React hydration
    await window.waitForTimeout(500);

    await use(window);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to get the Electron app path based on platform.
 * Useful for testing packaged apps.
 */
export function getElectronAppPath(): string {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return resolve(__dirname, '../../dist/mac/Nexus.app/Contents/MacOS/Nexus');
    case 'win32':
      return resolve(__dirname, '../../dist/win-unpacked/Nexus.exe');
    case 'linux':
      return resolve(__dirname, '../../dist/linux-unpacked/nexus');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Test mode utilities
 */
export const testMode = {
  /**
   * Check if running in CI environment
   */
  isCI: (): boolean => !!process.env.CI,

  /**
   * Check if running against packaged app
   */
  isPackaged: (): boolean => !!process.env.TEST_PACKAGED_APP,
};
