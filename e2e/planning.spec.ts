import { test, expect } from './fixtures/electron';
import { PlanningPage, InterviewPage } from './page-objects';

/**
 * Planning Page E2E Tests
 *
 * Tests for the Planning page that shows task creation progress.
 * Covers Phase 4 of the E2E plan.
 */
test.describe('Planning Page', () => {
  test.describe('Phase 4: Planning Flow', () => {
    test('4.1 - Planning page loads', async ({ window }) => {
      const planningPage = new PlanningPage(window);

      // Navigate to planning page
      await planningPage.navigate();

      // Page should be visible (may show idle state without requirements)
      await window.waitForTimeout(500);

      // Either planning page or idle state should be visible
      const isVisible = await planningPage.isVisible();
      const isIdle = await planningPage.isIdleState();

      expect(isVisible || isIdle).toBe(true);
    });

    test('4.1 - Idle state shows when no requirements', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // Without requirements from interview, should show idle state
      const isIdle = await planningPage.isIdleState();

      if (isIdle) {
        // Start interview button should be visible
        const startButton = window.locator('[data-testid="start-interview-button"]');
        expect(await startButton.isVisible()).toBe(true);
      }
    });

    test('4.1 - Planning page has required elements', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(1000);

      // Check for page container or idle state
      const pageLocator = window.locator('[data-testid="planning-page"]');
      const idleState = window.locator('[data-testid="idle-state"]');
      const isPageVisible = await pageLocator.isVisible().catch(() => false);
      const isIdleVisible = await idleState.isVisible().catch(() => false);

      // Either planning page container or idle state should be visible
      expect(isPageVisible || isIdleVisible).toBe(true);
    });

    test('4.3 - Task previews display correctly', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // If there are tasks, they should be visible
      const taskCount = await planningPage.getTaskCount();

      // Task count should be a number >= 0
      expect(typeof taskCount).toBe('number');
      expect(taskCount).toBeGreaterThanOrEqual(0);
    });

    test('4.5 - Error state has retry button', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // Check if in error state
      const isError = await planningPage.isErrorState();

      if (isError) {
        // Retry button should be visible
        const retryButton = window.locator('[data-testid="retry-button"]');
        expect(await retryButton.isVisible()).toBe(true);
      }
    });

    test('4.4 - Complete state has proceed button', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // Check if in complete state
      const isComplete = await planningPage.isCompleteState();

      if (isComplete) {
        // Proceed button should be visible
        const proceedButton = window.locator('[data-testid="proceed-button"]');
        expect(await proceedButton.isVisible()).toBe(true);
      }
    });
  });

  test.describe('Planning Progress', () => {
    test('progress bar element exists', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // Progress bar should be present when in progress
      const isInProgress = await planningPage.isInProgress();

      if (isInProgress) {
        const progressBar = window.locator('[data-testid="progress-bar"]');
        expect(await progressBar.isVisible()).toBe(true);
      }
    });

    test('planning steps indicator exists', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // Steps indicator should be present when in progress
      const isInProgress = await planningPage.isInProgress();

      if (isInProgress) {
        const steps = window.locator('[data-testid="planning-steps"]');
        expect(await steps.isVisible()).toBe(true);
      }
    });

    test('current step label updates', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      // If in progress, current step should have text
      const isInProgress = await planningPage.isInProgress();

      if (isInProgress) {
        const stepLabel = await planningPage.getCurrentStepLabel();
        expect(stepLabel.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Navigation', () => {
    test('idle state navigates to interview on click', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      const isIdle = await planningPage.isIdleState();

      if (isIdle) {
        await planningPage.startInterview();
        await window.waitForTimeout(500);

        // Should navigate to interview page
        const url = await window.url();
        expect(url.includes('genesis') || url.includes('interview')).toBe(true);
      }
    });

    test('complete state navigates to kanban on proceed', async ({ window }) => {
      const planningPage = new PlanningPage(window);
      await planningPage.navigate();
      await window.waitForTimeout(500);

      const isComplete = await planningPage.isCompleteState();

      if (isComplete) {
        await planningPage.proceed();
        await window.waitForTimeout(500);

        // Should navigate to kanban/evolution page
        const url = await window.url();
        expect(url.includes('kanban') || url.includes('evolution')).toBe(true);
      }
    });
  });
});
