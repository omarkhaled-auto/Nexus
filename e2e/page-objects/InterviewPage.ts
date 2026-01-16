import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Interview Page (Genesis mode).
 *
 * The Interview Page has a split-screen layout:
 * - Left: Chat panel with message history and input
 * - Right: Requirements sidebar showing extracted requirements
 *
 * Recommended data-testid attributes to add to source components:
 * - ChatInput: data-testid="chat-input", data-testid="send-button"
 * - ChatMessage: data-testid="chat-message" with data-role="user|assistant"
 * - RequirementsSidebar: data-testid="requirements-sidebar"
 * - Requirement items: data-testid="requirement-item"
 * - Complete interview button: data-testid="complete-interview"
 */
export class InterviewPage {
  readonly page: Page;

  // Core sections
  readonly chatPanel: Locator;
  readonly requirementsSidebar: Locator;

  // Chat elements
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;

  // Requirements elements
  readonly requirementsList: Locator;
  readonly requirementItems: Locator;
  readonly requirementsCount: Locator;

  // Interview controls
  readonly resumeBanner: Locator;
  readonly resumeButton: Locator;
  readonly startFreshButton: Locator;
  readonly newInterviewButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Chat panel is the left side with Genesis Interview header
    this.chatPanel = page.locator('text=Genesis Interview').locator('..');

    // Requirements sidebar is the right panel
    this.requirementsSidebar = page.locator('text=Requirements').locator('..');

    // Chat input is the textarea in the bottom section
    this.chatInput = page.locator('textarea[placeholder*="project idea"]');
    this.sendButton = page.locator('button:has(svg.lucide-send), button:has(.sr-only:text("Send message"))');

    // Messages - distinguished by class patterns
    this.userMessages = page.locator('[class*="chat-message"][class*="user"], [data-role="user"]');
    this.assistantMessages = page.locator('[class*="chat-message"][class*="assistant"], [data-role="assistant"]');

    // Requirements
    this.requirementsList = page.locator('[data-testid="requirements-list"]');
    this.requirementItems = page.locator('[data-testid="requirement-item"]');
    this.requirementsCount = page.locator('text=Requirements >> .. >> span.rounded-full');

    // Resume banner controls
    this.resumeBanner = page.locator('text=Resume your previous interview?').locator('..');
    this.resumeButton = page.locator('button:text("Resume")');
    this.startFreshButton = page.locator('button:text("Start Fresh")');
    this.newInterviewButton = page.locator('button:has-text("New Interview")');
  }

  /**
   * Navigate to the interview page.
   */
  async navigate(): Promise<void> {
    // Using hash navigation which is common for SPAs
    await this.page.evaluate(() => {
      window.location.hash = '#/interview';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Send a message in the chat.
   * @param text - The message text to send
   */
  async sendMessage(text: string): Promise<void> {
    await this.chatInput.fill(text);
    await this.sendButton.click();
  }

  /**
   * Wait for an assistant response to appear.
   * @param timeout - Maximum time to wait in ms
   */
  async waitForResponse(timeout = 10000): Promise<void> {
    await this.page.waitForSelector(
      '[data-testid="assistant-message"], [data-role="assistant"], .assistant-message',
      { timeout }
    );
  }

  /**
   * Get all requirement items.
   */
  getRequirements(): Locator {
    return this.requirementItems;
  }

  /**
   * Get the count of requirements displayed.
   */
  async getRequirementsCount(): Promise<number> {
    // Try to read from the count badge
    const countBadge = this.requirementsCount;
    if (await countBadge.isVisible()) {
      const text = await countBadge.textContent();
      return parseInt(text || '0', 10);
    }
    // Fall back to counting items
    return this.requirementItems.count();
  }

  /**
   * Check if the resume banner is visible.
   */
  async hasResumeBanner(): Promise<boolean> {
    return this.resumeBanner.isVisible();
  }

  /**
   * Click resume to restore previous interview.
   */
  async resumeInterview(): Promise<void> {
    await this.resumeButton.click();
  }

  /**
   * Click start fresh to begin new interview.
   */
  async startFresh(): Promise<void> {
    await this.startFreshButton.click();
  }

  /**
   * Start a new interview from the bottom bar.
   */
  async newInterview(): Promise<void> {
    await this.newInterviewButton.click();
  }

  /**
   * Complete the interview (trigger transition to next phase).
   */
  async completeInterview(): Promise<void> {
    const completeButton = this.page.locator('[data-testid="complete-interview"], button:text("Complete Interview")');
    await completeButton.click();
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('text=Genesis Interview', { state: 'visible' });
  }

  /**
   * Check if chat input is ready for interaction.
   */
  async isChatInputReady(): Promise<boolean> {
    return this.chatInput.isVisible();
  }

  /**
   * Get the current interview stage from the progress indicator.
   */
  async getCurrentStage(): Promise<string> {
    // Stage progress is shown as dots - count active ones
    const activeDots = this.page.locator('.rounded-full.bg-violet-500');
    const count = await activeDots.count();
    const stages = ['welcome', 'project_overview', 'technical_requirements', 'features', 'constraints', 'review'];
    return stages[Math.min(count, stages.length - 1)] || 'welcome';
  }
}
