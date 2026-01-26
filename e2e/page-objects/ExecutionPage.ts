import type { Page, Locator } from '@playwright/test';

/**
 * Execution tab types.
 */
export type ExecutionTab = 'build' | 'lint' | 'test' | 'review';

/**
 * Page Object for the Execution Page.
 *
 * The Execution Page displays:
 * - Execution controls (start, pause, resume, stop)
 * - Tab navigation (Build, Lint, Test, Review)
 * - Log viewer with syntax highlighting
 * - Execution summary/stats
 * - Human review banners and modals
 *
 * data-testid attributes used:
 * - execution-page: Main page container
 * - execution-tab-{tabId}: Tab buttons
 * - execution-tabs: Tab navigation container
 * - log-viewer: Log viewer container
 * - export-logs-button: Export logs button
 * - clear-logs-button: Clear logs button
 * - execution-summary: Summary bar container
 */
export class ExecutionPage {
  readonly page: Page;

  // Main container
  readonly executionPage: Locator;
  readonly errorBanner: Locator;
  readonly loadingState: Locator;

  // Tab navigation
  readonly executionTabs: Locator;
  readonly buildTab: Locator;
  readonly lintTab: Locator;
  readonly testTab: Locator;
  readonly reviewTab: Locator;

  // Log viewer
  readonly logViewer: Locator;
  readonly exportLogsButton: Locator;
  readonly clearLogsButton: Locator;

  // Summary
  readonly executionSummary: Locator;

  // Human review
  readonly humanReviewBanner: Locator;
  readonly reviewModal: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;

  // Execution controls
  readonly startButton: Locator;
  readonly pauseButton: Locator;
  readonly resumeButton: Locator;
  readonly stopButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.executionPage = page.locator('[data-testid="execution-page"]');
    this.errorBanner = page.locator('[data-testid="error-banner"]');
    this.loadingState = page.locator('.animate-spin, text=Loading');

    // Tab navigation
    this.executionTabs = page.locator('[data-testid="execution-tabs"]');
    this.buildTab = page.locator('[data-testid="execution-tab-build"]');
    this.lintTab = page.locator('[data-testid="execution-tab-lint"]');
    this.testTab = page.locator('[data-testid="execution-tab-test"]');
    this.reviewTab = page.locator('[data-testid="execution-tab-review"]');

    // Log viewer
    this.logViewer = page.locator('[data-testid="log-viewer"]');
    this.exportLogsButton = page.locator('[data-testid="export-logs-button"]');
    this.clearLogsButton = page.locator('[data-testid="clear-logs-button"]');

    // Summary
    this.executionSummary = page.locator('[data-testid="execution-summary"]');

    // Human review
    this.humanReviewBanner = page.locator('[data-testid="human-review-banner"]');
    this.reviewModal = page.locator('[data-testid="review-modal"]');
    this.approveButton = page.locator('[data-testid="approve-button"]');
    this.rejectButton = page.locator('[data-testid="reject-button"]');

    // Execution controls (may be in header or toolbar)
    this.startButton = page.locator('[data-testid="start-execution"], button:has-text("Start")');
    this.pauseButton = page.locator('[data-testid="pause-execution"], button:has-text("Pause")');
    this.resumeButton = page.locator('[data-testid="resume-execution"], button:has-text("Resume")');
    this.stopButton = page.locator('[data-testid="stop-execution"], button:has-text("Stop")');
  }

  /**
   * Navigate to the execution page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/execution';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="execution-page"]', { state: 'visible', timeout: 15000 });
    // Wait for tabs to be visible as well
    await Promise.race([
      this.page.waitForSelector('[data-testid="execution-tabs"]', { state: 'visible', timeout: 5000 }),
      this.page.waitForTimeout(3000)
    ]);
  }

  /**
   * Check if the execution page is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.executionPage.isVisible();
  }

  /**
   * Switch to a specific tab.
   * @param tab - The tab to switch to
   */
  async switchTab(tab: ExecutionTab): Promise<void> {
    const tabLocator = this.page.locator(`[data-testid="execution-tab-${tab}"]`);
    await tabLocator.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the currently active tab.
   */
  async getActiveTab(): Promise<ExecutionTab | null> {
    // Check which tab has the active state
    const tabs: ExecutionTab[] = ['build', 'lint', 'test', 'review'];
    for (const tab of tabs) {
      const tabLocator = this.page.locator(`[data-testid="execution-tab-${tab}"]`);
      const classes = await tabLocator.getAttribute('class');
      if (classes?.includes('active') || classes?.includes('selected')) {
        return tab;
      }
    }
    return null;
  }

  /**
   * Get log viewer content.
   */
  async getLogContent(): Promise<string> {
    return (await this.logViewer.textContent()) || '';
  }

  /**
   * Get number of log lines.
   */
  async getLogLineCount(): Promise<number> {
    const lines = this.logViewer.locator('.log-line, [data-line-number]');
    return lines.count();
  }

  /**
   * Clear logs.
   */
  async clearLogs(): Promise<void> {
    await this.clearLogsButton.click();
  }

  /**
   * Export logs.
   */
  async exportLogs(): Promise<void> {
    await this.exportLogsButton.click();
  }

  /**
   * Start execution.
   */
  async start(): Promise<void> {
    await this.startButton.click();
  }

  /**
   * Pause execution.
   */
  async pause(): Promise<void> {
    await this.pauseButton.click();
  }

  /**
   * Resume execution.
   */
  async resume(): Promise<void> {
    await this.resumeButton.click();
  }

  /**
   * Stop execution.
   */
  async stop(): Promise<void> {
    await this.stopButton.click();
  }

  /**
   * Check if human review is required.
   */
  async hasHumanReviewBanner(): Promise<boolean> {
    return this.humanReviewBanner.isVisible();
  }

  /**
   * Get human review count from banner.
   */
  async getHumanReviewCount(): Promise<number> {
    const text = await this.humanReviewBanner.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click to open review modal.
   */
  async openReviewModal(): Promise<void> {
    const reviewNowButton = this.humanReviewBanner.locator('button:has-text("Review Now")');
    await reviewNowButton.click();
    await this.reviewModal.waitFor({ state: 'visible' });
  }

  /**
   * Approve in review modal.
   */
  async approveReview(): Promise<void> {
    await this.approveButton.click();
  }

  /**
   * Reject in review modal.
   * @param feedback - Optional feedback text
   */
  async rejectReview(feedback?: string): Promise<void> {
    if (feedback) {
      const feedbackInput = this.reviewModal.locator('textarea, input[type="text"]');
      await feedbackInput.fill(feedback);
    }
    await this.rejectButton.click();
  }

  /**
   * Close review modal.
   */
  async closeReviewModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.reviewModal.waitFor({ state: 'hidden' });
  }

  /**
   * Check if review modal is visible.
   */
  async isReviewModalVisible(): Promise<boolean> {
    return this.reviewModal.isVisible();
  }

  /**
   * Get execution stats from summary.
   */
  async getExecutionStats(): Promise<{ completed: number; failed: number; inProgress: number; pending: number }> {
    const text = await this.executionSummary.textContent();
    // Parse stats from summary text
    const completed = parseInt(text?.match(/completed[:\s]+(\d+)/i)?.[1] || '0', 10);
    const failed = parseInt(text?.match(/failed[:\s]+(\d+)/i)?.[1] || '0', 10);
    const inProgress = parseInt(text?.match(/in.?progress[:\s]+(\d+)/i)?.[1] || '0', 10);
    const pending = parseInt(text?.match(/pending[:\s]+(\d+)/i)?.[1] || '0', 10);
    return { completed, failed, inProgress, pending };
  }

  /**
   * Check if in error state.
   */
  async isErrorState(): Promise<boolean> {
    return this.errorBanner.isVisible();
  }

  /**
   * Check if loading.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible();
  }

  /**
   * Wait for logs to update with specific text.
   * @param text - Text to wait for
   * @param timeout - Maximum wait time in ms
   */
  async waitForLogText(text: string, timeout = 10000): Promise<void> {
    await this.logViewer.locator(`text=${text}`).waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if execution is running.
   */
  async isExecutionRunning(): Promise<boolean> {
    return (await this.pauseButton.isVisible()) && (await this.pauseButton.isEnabled());
  }

  /**
   * Check if execution is paused.
   */
  async isExecutionPaused(): Promise<boolean> {
    return (await this.resumeButton.isVisible()) && (await this.resumeButton.isEnabled());
  }
}
