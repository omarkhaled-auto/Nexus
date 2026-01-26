import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Mode Selector Page (root landing page).
 *
 * The Mode Selector displays two options:
 * - Genesis: Start a new project with AI-guided interview
 * - Evolution: Work on an existing project
 *
 * data-testid attributes used:
 * - genesis-card: Genesis mode selection card
 * - evolution-card: Evolution mode selection card
 */
export class ModeSelectorPage {
  readonly page: Page;

  // Mode selection cards
  readonly genesisCard: Locator;
  readonly evolutionCard: Locator;

  // Project selection elements
  readonly projectList: Locator;
  readonly projectCards: Locator;

  // Loading states
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Mode selection cards
    this.genesisCard = page.locator('[data-testid="genesis-card"]');
    this.evolutionCard = page.locator('[data-testid="evolution-card"]');

    // Project list for evolution mode
    this.projectList = page.locator('[data-testid="project-list"]');
    this.projectCards = page.locator('[data-testid^="project-select-"]');

    // Loading indicator
    this.loadingIndicator = page.locator('.animate-spin, text=Loading');
  }

  /**
   * Navigate to the mode selector page (root).
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    // Wait for either genesis or evolution card to be visible
    await this.page.waitForSelector(
      '[data-testid="genesis-card"], [data-testid="evolution-card"]',
      { state: 'visible', timeout: 10000 }
    );
  }

  /**
   * Check if the mode selector page is visible.
   */
  async isVisible(): Promise<boolean> {
    return (
      (await this.genesisCard.isVisible()) || (await this.evolutionCard.isVisible())
    );
  }

  /**
   * Select Genesis mode (start new project).
   */
  async selectGenesis(): Promise<void> {
    await this.genesisCard.click();
  }

  /**
   * Select Evolution mode (work on existing project).
   */
  async selectEvolution(): Promise<void> {
    await this.evolutionCard.click();
  }

  /**
   * Check if Genesis card is visible.
   */
  async isGenesisVisible(): Promise<boolean> {
    return this.genesisCard.isVisible();
  }

  /**
   * Check if Evolution card is visible.
   */
  async isEvolutionVisible(): Promise<boolean> {
    return this.evolutionCard.isVisible();
  }

  /**
   * Get the Genesis card title text.
   */
  async getGenesisTitle(): Promise<string> {
    const titleEl = this.genesisCard.locator('h2, h3, .font-semibold').first();
    return (await titleEl.textContent()) || '';
  }

  /**
   * Get the Evolution card title text.
   */
  async getEvolutionTitle(): Promise<string> {
    const titleEl = this.evolutionCard.locator('h2, h3, .font-semibold').first();
    return (await titleEl.textContent()) || '';
  }

  /**
   * Get all available project options (for Evolution mode).
   */
  async getProjectOptions(): Promise<Array<{ id: string; name: string }>> {
    const projects: Array<{ id: string; name: string }> = [];
    const cards = await this.projectCards.all();

    for (const card of cards) {
      const testId = await card.getAttribute('data-testid');
      const id = testId?.replace('project-select-', '') || '';
      const name = (await card.textContent()) || '';
      projects.push({ id, name: name.trim() });
    }

    return projects;
  }

  /**
   * Select a specific project by ID.
   * @param projectId - The project ID to select
   */
  async selectProject(projectId: string): Promise<void> {
    const projectCard = this.page.locator(`[data-testid="project-select-${projectId}"]`);
    await projectCard.click();
  }

  /**
   * Check if loading indicator is visible.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingIndicator.isVisible();
  }

  /**
   * Wait for loading to complete.
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Loading may have already completed
    });
  }
}
