import type { Page, Locator } from '@playwright/test';

/**
 * Agent status types.
 */
export type AgentPageStatus = 'idle' | 'working' | 'success' | 'error' | 'pending';

/**
 * Page Object for the Agents Page.
 *
 * The Agents Page displays:
 * - Agent Pool Status (overview of all agents)
 * - Individual Agent Cards with details
 * - Agent Output/Activity stream
 * - QA Status Panel
 *
 * data-testid attributes used:
 * - agents-page: Main page container
 * - refresh-agents-button: Refresh agents button
 * - pause-all-button: Pause/resume all button
 * - agent-pool-status: Agent pool status component
 * - agents-list: Active agents list container
 * - agent-card-{agentId}: Individual agent card
 * - agent-details: Selected agent details panel
 * - agent-activity: Agent output/activity component
 * - qa-status-panel: QA status panel
 * - qa-step-{type}: QA step indicators
 */
export class AgentsPage {
  readonly page: Page;

  // Main container
  readonly agentsPage: Locator;
  readonly errorState: Locator;
  readonly loadingState: Locator;

  // Header controls
  readonly refreshButton: Locator;
  readonly pauseAllButton: Locator;

  // Pool status
  readonly agentPoolStatus: Locator;

  // Agent list
  readonly agentsList: Locator;
  readonly agentCards: Locator;

  // Agent details
  readonly agentDetails: Locator;
  readonly agentActivity: Locator;

  // QA Status
  readonly qaStatusPanel: Locator;
  readonly buildStep: Locator;
  readonly lintStep: Locator;
  readonly testStep: Locator;
  readonly reviewStep: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.agentsPage = page.locator('[data-testid="agents-page"]');
    this.errorState = page.locator('[data-testid="agents-page-error"]');
    this.loadingState = page.locator('[data-testid="agents-page-loading"]');

    // Header controls
    this.refreshButton = page.locator('[data-testid="refresh-agents-button"]');
    this.pauseAllButton = page.locator('[data-testid="pause-all-button"]');

    // Pool status
    this.agentPoolStatus = page.locator('[data-testid="agent-pool-status"]');

    // Agent list
    this.agentsList = page.locator('[data-testid="agents-list"]');
    this.agentCards = page.locator('[data-testid^="agent-card-"]');

    // Agent details
    this.agentDetails = page.locator('[data-testid="agent-details"]');
    this.agentActivity = page.locator('[data-testid="agent-activity"]');

    // QA Status
    this.qaStatusPanel = page.locator('[data-testid="qa-status-panel"]');
    this.buildStep = page.locator('[data-testid="qa-step-build"]');
    this.lintStep = page.locator('[data-testid="qa-step-lint"]');
    this.testStep = page.locator('[data-testid="qa-step-test"]');
    this.reviewStep = page.locator('[data-testid="qa-step-review"]');
  }

  /**
   * Navigate to the agents page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/agents';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="agents-page"]', { state: 'visible', timeout: 15000 });
    // Wait for either pool status OR timeout (component may be hidden by default)
    await Promise.race([
      this.page.waitForSelector('[data-testid="agent-pool-status"]', { state: 'visible', timeout: 10000 }),
      this.page.waitForTimeout(3000)
    ]);
  }

  /**
   * Check if the agents page is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.agentsPage.isVisible();
  }

  /**
   * Refresh agent data.
   */
  async refresh(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle pause/resume all agents.
   */
  async togglePauseAll(): Promise<void> {
    await this.pauseAllButton.click();
  }

  /**
   * Check if all agents are paused.
   */
  async isPaused(): Promise<boolean> {
    const buttonText = await this.pauseAllButton.textContent();
    return buttonText?.toLowerCase().includes('resume') ?? false;
  }

  /**
   * Get all agent cards.
   */
  getAgentCards(): Locator {
    return this.agentCards;
  }

  /**
   * Get agent card by ID.
   * @param agentId - The agent ID
   */
  getAgentCard(agentId: string): Locator {
    return this.page.locator(`[data-testid="agent-card-${agentId}"]`);
  }

  /**
   * Get number of active agents.
   */
  async getActiveAgentCount(): Promise<number> {
    return this.agentCards.count();
  }

  /**
   * Select an agent by clicking its card.
   * @param agentId - The agent ID
   */
  async selectAgent(agentId: string): Promise<void> {
    const card = this.getAgentCard(agentId);
    await card.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get agent output text.
   */
  async getAgentOutput(): Promise<string> {
    return (await this.agentActivity.textContent()) || '';
  }

  /**
   * Check if agent details panel is visible.
   */
  async isAgentDetailsVisible(): Promise<boolean> {
    return this.agentDetails.isVisible();
  }

  /**
   * Get pool agent by ID from pool status.
   * @param agentId - The agent ID
   */
  getPoolAgent(agentId: string): Locator {
    return this.page.locator(`[data-testid="pool-agent-${agentId}"]`);
  }

  /**
   * Get QA step status.
   * @param step - The step type
   */
  async getQAStepStatus(step: 'build' | 'lint' | 'test' | 'review'): Promise<string> {
    const stepLocator = this.page.locator(`[data-testid="qa-step-${step}"]`);
    // Get status from class or data attribute
    const classList = await stepLocator.getAttribute('class');
    if (classList?.includes('success')) return 'success';
    if (classList?.includes('error')) return 'error';
    if (classList?.includes('running')) return 'running';
    return 'pending';
  }

  /**
   * Check if QA status panel is visible.
   */
  async isQAStatusVisible(): Promise<boolean> {
    return this.qaStatusPanel.isVisible();
  }

  /**
   * Wait for agent to reach a specific status.
   * @param agentId - The agent ID
   * @param status - The expected status
   * @param timeout - Maximum wait time in ms
   */
  async waitForAgentStatus(agentId: string, status: AgentPageStatus, timeout = 30000): Promise<void> {
    const card = this.getAgentCard(agentId);
    await card.locator(`[data-agent-status="${status}"], text=${status}`).waitFor({
      state: 'visible',
      timeout,
    });
  }

  /**
   * Get agents with their current status.
   */
  async getAgentsWithStatus(): Promise<Array<{ id: string; type: string; status: string }>> {
    const agents: Array<{ id: string; type: string; status: string }> = [];
    const cards = await this.agentCards.all();

    for (const card of cards) {
      const testId = await card.getAttribute('data-testid');
      const id = testId?.replace('agent-card-', '') || '';
      const type = (await card.getAttribute('data-agent-type')) || '';
      const status = (await card.getAttribute('data-agent-status')) || '';
      agents.push({ id, type, status });
    }

    return agents;
  }

  /**
   * Check if in error state.
   */
  async isErrorState(): Promise<boolean> {
    return this.errorState.isVisible();
  }

  /**
   * Check if loading.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible();
  }

  /**
   * Check if no agents are available.
   */
  async isEmptyState(): Promise<boolean> {
    const count = await this.getActiveAgentCount();
    return count === 0;
  }
}
