import type { Page, Locator } from '@playwright/test';
import type { FeatureStatus } from '../../src/renderer/src/types/feature';

/**
 * Column status values for the Kanban board.
 */
export const COLUMN_STATUSES: FeatureStatus[] = [
  'backlog',
  'planning',
  'in_progress',
  'ai_review',
  'human_review',
  'done',
];

/**
 * Page Object for the Kanban Page (Evolution mode).
 *
 * The Kanban Page displays features in a 6-column pipeline:
 * Backlog -> Planning -> In Progress -> AI Review -> Human Review -> Done
 *
 * Recommended data-testid attributes to add to source components:
 * - KanbanBoard: data-testid="kanban-board"
 * - KanbanColumn: data-testid="kanban-column-{status}"
 * - FeatureCard: data-testid="feature-card-{id}"
 * - FeatureDetailModal: data-testid="feature-modal"
 * - Filter controls: data-testid="kanban-filter-search", etc.
 */
export class KanbanPage {
  readonly page: Page;

  // Core sections
  readonly board: Locator;
  readonly header: Locator;

  // Columns
  readonly backlogColumn: Locator;
  readonly planningColumn: Locator;
  readonly inProgressColumn: Locator;
  readonly aiReviewColumn: Locator;
  readonly humanReviewColumn: Locator;
  readonly doneColumn: Locator;

  // Feature cards and modal
  readonly featureCards: Locator;
  readonly featureModal: Locator;

  // Filter controls
  readonly searchInput: Locator;
  readonly priorityFilter: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    this.page = page;

    // Board and header
    this.board = page.locator('[data-testid="kanban-board"]');
    this.header = page.locator('text=Nexus').locator('..');

    // Columns by their title text
    this.backlogColumn = page.locator('text=Backlog').locator('..').locator('..');
    this.planningColumn = page.locator('h2:text("Planning")').locator('..').locator('..');
    this.inProgressColumn = page.locator('h2:text("In Progress")').locator('..').locator('..');
    this.aiReviewColumn = page.locator('h2:text("AI Review")').locator('..').locator('..');
    this.humanReviewColumn = page.locator('h2:text("Human Review")').locator('..').locator('..');
    this.doneColumn = page.locator('h2:text("Done")').locator('..').locator('..');

    // Feature cards - elements with drag capability and feature content
    this.featureCards = page.locator('[data-testid^="feature-card-"], .cursor-grab');

    // Feature detail modal
    this.featureModal = page.locator('[data-testid="feature-modal"], [role="dialog"]');

    // Filter controls (if present)
    this.searchInput = page.locator('[data-testid="kanban-filter-search"], input[placeholder*="Search"]');
    this.priorityFilter = page.locator('[data-testid="kanban-filter-priority"]');
    this.statusFilter = page.locator('[data-testid="kanban-filter-status"]');
  }

  /**
   * Navigate to the Kanban page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/kanban';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Get a specific column by status.
   * @param status - The column status
   */
  getColumn(status: FeatureStatus): Locator {
    const titles: Record<FeatureStatus, string> = {
      backlog: 'Backlog',
      planning: 'Planning',
      in_progress: 'In Progress',
      ai_review: 'AI Review',
      human_review: 'Human Review',
      done: 'Done',
    };
    return this.page.locator(`h2:text("${titles[status]}")`).locator('..').locator('..');
  }

  /**
   * Get all columns as an array of locators.
   */
  getColumns(): Locator[] {
    return COLUMN_STATUSES.map((status) => this.getColumn(status));
  }

  /**
   * Get all feature cards in a specific column.
   * @param status - The column status
   */
  getFeatureCardsInColumn(status: FeatureStatus): Locator {
    const column = this.getColumn(status);
    return column.locator('.cursor-grab, [data-testid^="feature-card-"]');
  }

  /**
   * Get a specific feature card by ID.
   * @param featureId - The feature ID
   */
  getFeatureCard(featureId: string): Locator {
    return this.page.locator(`[data-testid="feature-card-${featureId}"], [data-feature-id="${featureId}"]`);
  }

  /**
   * Get feature cards count in a column.
   * @param status - The column status
   */
  async getColumnCardCount(status: FeatureStatus): Promise<number> {
    const column = this.getColumn(status);
    // Read from the count badge in the column header
    const countBadge = column.locator('span.rounded-full');
    const text = await countBadge.textContent();
    if (text) {
      // Handle "3/3" format for WIP limits
      const match = text.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Drag a feature card to a target column.
   * @param featureId - The feature ID to drag
   * @param targetStatus - The target column status
   */
  async dragFeature(featureId: string, targetStatus: FeatureStatus): Promise<void> {
    const card = this.getFeatureCard(featureId);
    const targetColumn = this.getColumn(targetStatus);

    // Get bounding boxes
    const cardBox = await card.boundingBox();
    const columnBox = await targetColumn.boundingBox();

    if (!cardBox || !columnBox) {
      throw new Error('Could not get bounding boxes for drag operation');
    }

    // Perform drag operation
    await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await this.page.mouse.down();
    await this.page.waitForTimeout(100); // Small delay for drag to register

    // Move to target column center
    await this.page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + columnBox.height / 2);
    await this.page.waitForTimeout(100);

    await this.page.mouse.up();
  }

  /**
   * Open feature modal by clicking on a feature card.
   * @param featureId - The feature ID
   */
  async openFeatureModal(featureId: string): Promise<void> {
    const card = this.getFeatureCard(featureId);
    await card.click();
    // Wait for modal to appear
    await this.featureModal.waitFor({ state: 'visible' });
  }

  /**
   * Close the feature modal.
   */
  async closeFeatureModal(): Promise<void> {
    // Click outside or press escape
    await this.page.keyboard.press('Escape');
    await this.featureModal.waitFor({ state: 'hidden' });
  }

  /**
   * Search for features.
   * @param query - Search query
   */
  async searchFeatures(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Clear search filter.
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Trigger planning for a feature (if visible in modal or card).
   * @param featureId - The feature ID
   */
  async triggerPlanning(featureId: string): Promise<void> {
    await this.openFeatureModal(featureId);
    const planButton = this.featureModal.locator('button:text("Start Planning"), button:text("Plan")');
    if (await planButton.isVisible()) {
      await planButton.click();
    }
    await this.closeFeatureModal();
  }

  /**
   * Wait for the Kanban page to load.
   */
  async waitForLoad(): Promise<void> {
    // Wait for at least the column headers to be visible
    await this.page.waitForSelector('h2:text("Backlog")', { state: 'visible' });
    await this.page.waitForSelector('h2:text("Done")', { state: 'visible' });
  }

  /**
   * Get total number of features across all columns.
   */
  async getTotalFeatureCount(): Promise<number> {
    let total = 0;
    for (const status of COLUMN_STATUSES) {
      total += await this.getColumnCardCount(status);
    }
    return total;
  }

  /**
   * Check if a feature is in a specific column.
   * @param featureId - The feature ID
   * @param status - The expected column status
   */
  async isFeatureInColumn(featureId: string, status: FeatureStatus): Promise<boolean> {
    const column = this.getColumn(status);
    const card = column.locator(`[data-testid="feature-card-${featureId}"], [data-feature-id="${featureId}"]`);
    return card.isVisible();
  }
}
