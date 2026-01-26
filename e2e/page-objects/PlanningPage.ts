import type { Page, Locator } from '@playwright/test';

/**
 * Planning step status types.
 */
export type PlanningStatus = 'analyzing' | 'decomposing' | 'creating-tasks' | 'validating' | 'complete' | 'error';

/**
 * Page Object for the Planning Page.
 *
 * The Planning Page shows progress while tasks are being created after
 * interview completion. Displays real-time updates as AI analyzes
 * requirements and creates tasks.
 *
 * data-testid attributes used:
 * - planning-page: Main page container
 * - planning-steps: Step indicator component
 * - progress-bar: Main progress bar
 * - progress-stats: Progress statistics display
 * - progress-percent: Progress percentage text
 * - current-step: Current step label
 * - task-list: Task preview list container
 * - task-preview-{taskId}: Individual task cards
 * - error-state: Error display component
 * - retry-button: Retry button in error state
 * - complete-state: Completion display component
 * - proceed-button: View Kanban Board button
 * - idle-state: No requirements state
 * - start-interview-button: Start interview button in idle state
 */
export class PlanningPage {
  readonly page: Page;

  // Main container
  readonly planningPage: Locator;

  // Progress elements
  readonly planningSteps: Locator;
  readonly progressBar: Locator;
  readonly progressStats: Locator;
  readonly progressPercent: Locator;
  readonly currentStep: Locator;

  // Task list
  readonly taskList: Locator;
  readonly taskPreviews: Locator;

  // State components
  readonly errorState: Locator;
  readonly retryButton: Locator;
  readonly completeState: Locator;
  readonly proceedButton: Locator;
  readonly idleState: Locator;
  readonly startInterviewButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.planningPage = page.locator('[data-testid="planning-page"]');

    // Progress elements
    this.planningSteps = page.locator('[data-testid="planning-steps"]');
    this.progressBar = page.locator('[data-testid="progress-bar"]');
    this.progressStats = page.locator('[data-testid="progress-stats"]');
    this.progressPercent = page.locator('[data-testid="progress-percent"]');
    this.currentStep = page.locator('[data-testid="current-step"]');

    // Task list
    this.taskList = page.locator('[data-testid="task-list"]');
    this.taskPreviews = page.locator('[data-testid^="task-preview-"]');

    // State components
    this.errorState = page.locator('[data-testid="error-state"]');
    this.retryButton = page.locator('[data-testid="retry-button"]');
    this.completeState = page.locator('[data-testid="complete-state"]');
    this.proceedButton = page.locator('[data-testid="proceed-button"]');
    this.idleState = page.locator('[data-testid="idle-state"]');
    this.startInterviewButton = page.locator('[data-testid="start-interview-button"]');
  }

  /**
   * Navigate to the planning page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/planning';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="planning-page"]', { state: 'visible', timeout: 10000 });
  }

  /**
   * Check if the planning page is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.planningPage.isVisible();
  }

  /**
   * Get current progress percentage.
   */
  async getProgressPercent(): Promise<number> {
    const text = await this.progressPercent.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get current step label.
   */
  async getCurrentStepLabel(): Promise<string> {
    return (await this.currentStep.textContent()) || '';
  }

  /**
   * Get the number of tasks created.
   */
  async getTaskCount(): Promise<number> {
    return this.taskPreviews.count();
  }

  /**
   * Get all task previews.
   */
  getTaskPreviews(): Locator {
    return this.taskPreviews;
  }

  /**
   * Get a specific task preview by ID.
   * @param taskId - The task ID
   */
  getTaskPreview(taskId: string): Locator {
    return this.page.locator(`[data-testid="task-preview-${taskId}"]`);
  }

  /**
   * Check if in error state.
   */
  async isErrorState(): Promise<boolean> {
    return this.errorState.isVisible();
  }

  /**
   * Click retry button in error state.
   */
  async retry(): Promise<void> {
    await this.retryButton.click();
  }

  /**
   * Check if in complete state.
   */
  async isCompleteState(): Promise<boolean> {
    return this.completeState.isVisible();
  }

  /**
   * Click proceed button to go to Kanban.
   */
  async proceed(): Promise<void> {
    await this.proceedButton.click();
  }

  /**
   * Check if in idle state (no requirements).
   */
  async isIdleState(): Promise<boolean> {
    return this.idleState.isVisible();
  }

  /**
   * Click start interview button in idle state.
   */
  async startInterview(): Promise<void> {
    await this.startInterviewButton.click();
  }

  /**
   * Wait for planning to complete.
   * @param timeout - Maximum time to wait in ms
   */
  async waitForComplete(timeout = 60000): Promise<void> {
    await this.completeState.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for a specific step to be active.
   * @param step - The step to wait for
   * @param timeout - Maximum time to wait in ms
   */
  async waitForStep(step: string, timeout = 30000): Promise<void> {
    await this.page.waitForSelector(`text=${step}`, { timeout });
  }

  /**
   * Get the current planning status based on visible elements.
   */
  async getCurrentStatus(): Promise<PlanningStatus> {
    if (await this.errorState.isVisible()) return 'error';
    if (await this.completeState.isVisible()) return 'complete';

    const stepText = await this.getCurrentStepLabel();
    if (stepText.toLowerCase().includes('analyzing')) return 'analyzing';
    if (stepText.toLowerCase().includes('decomposing')) return 'decomposing';
    if (stepText.toLowerCase().includes('creating')) return 'creating-tasks';
    if (stepText.toLowerCase().includes('validating')) return 'validating';

    return 'analyzing'; // Default
  }

  /**
   * Check if progress bar is animating (in progress).
   */
  async isInProgress(): Promise<boolean> {
    const progressVisible = await this.progressBar.isVisible();
    const stepsVisible = await this.planningSteps.isVisible();
    return progressVisible && stepsVisible;
  }
}
