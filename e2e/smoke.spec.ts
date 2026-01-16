import { test, expect } from './fixtures/electron';

/**
 * Smoke test to verify Electron E2E infrastructure works.
 *
 * This test validates:
 * - Electron app launches successfully
 * - Window is created and accessible
 * - Basic DOM is rendered
 * - App closes cleanly
 */
test.describe('Smoke Tests', () => {
  test('app launches and shows window', async ({ window, electronApp }) => {
    // Verify window exists
    expect(window).toBeDefined();

    // Verify we can access the app
    expect(electronApp).toBeDefined();

    // Verify window has content
    const title = await window.title();
    expect(title).toBeTruthy();
  });

  test('app renders main content', async ({ window }) => {
    // Wait for React to hydrate
    await window.waitForSelector('body', { state: 'visible' });

    // Check that the app has rendered something
    const bodyContent = await window.evaluate(() => {
      return document.body.innerHTML.length;
    });

    // Body should have meaningful content (not just empty)
    expect(bodyContent).toBeGreaterThan(0);
  });

  test('app responds to navigation', async ({ window }) => {
    // Get the current URL
    const url = await window.url();

    // Should be a valid URL (file:// or http://)
    expect(url).toMatch(/^(file|http)/);
  });
});

/**
 * Window state tests
 */
test.describe('Window State', () => {
  test('window is visible', async ({ electronApp }) => {
    const window = await electronApp.firstWindow();
    const isVisible = await window.isVisible('body');
    expect(isVisible).toBe(true);
  });

  test('window has reasonable size', async ({ window }) => {
    const viewport = window.viewportSize();

    // Window should have a reasonable size
    if (viewport) {
      expect(viewport.width).toBeGreaterThan(400);
      expect(viewport.height).toBeGreaterThan(300);
    }
  });
});
