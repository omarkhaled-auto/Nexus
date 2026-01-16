import type { Page, Locator } from '@playwright/test';

/**
 * Agent status types for filtering.
 */
export type AgentStatus = 'working' | 'waiting' | 'idle' | 'error';

/**
 * Page Object for the Dashboard Page (real-time observability).
 *
 * The Dashboard displays project progress with:
 * - Header with cost tracker
 * - Overview cards (Features, Tasks, Agents, ETA)
 * - Progress chart
 * - Agent activity grid
 * - Task timeline (event log)
 *
 * Recommended data-testid attributes to add to source components:
 * - Dashboard container: data-testid="dashboard"
 * - OverviewCards: data-testid="overview-cards"
 * - MetricCard: data-testid="metric-card-{name}"
 * - ProgressChart: data-testid="progress-chart"
 * - AgentActivity: data-testid="agent-activity"
 * - AgentCard: data-testid="agent-card-{id}"
 * - TaskTimeline: data-testid="task-timeline"
 * - TimelineEvent: data-testid="timeline-event-{id}"
 * - CostTracker: data-testid="cost-tracker"
 */
export class DashboardPage {
  readonly page: Page;

  // Core sections
  readonly dashboard: Locator;
  readonly header: Locator;
  readonly loadingOverlay: Locator;

  // Overview cards
  readonly overviewCards: Locator;
  readonly totalFeaturesCard: Locator;
  readonly completedTasksCard: Locator;
  readonly activeAgentsCard: Locator;
  readonly estCompletionCard: Locator;

  // Progress chart
  readonly progressChart: Locator;

  // Agent activity
  readonly agentActivity: Locator;
  readonly agentCards: Locator;

  // Task timeline
  readonly taskTimeline: Locator;
  readonly timelineEvents: Locator;

  // Cost tracker
  readonly costTracker: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main dashboard container
    this.dashboard = page.locator('[data-testid="dashboard"], .flex.flex-col.h-full.p-6');
    this.header = page.locator('h1:text("Dashboard")').locator('..');
    this.loadingOverlay = page.locator('text=Loading dashboard...');

    // Overview metric cards by their titles
    this.overviewCards = page.locator('[data-testid="overview-cards"]');
    this.totalFeaturesCard = page.locator('text=Total Features').locator('..').locator('..');
    this.completedTasksCard = page.locator('text=Completed Tasks').locator('..').locator('..');
    this.activeAgentsCard = page.locator('text=Active Agents').locator('..').locator('..');
    this.estCompletionCard = page.locator('text=Est. Completion').locator('..').locator('..');

    // Progress chart section
    this.progressChart = page.locator('[data-testid="progress-chart"]');

    // Agent activity section
    this.agentActivity = page.locator('text=Agent Activity').locator('..').locator('..');
    this.agentCards = page.locator('[data-testid^="agent-card-"]');

    // Task timeline section
    this.taskTimeline = page.locator('[data-testid="task-timeline"]');
    this.timelineEvents = page.locator('[data-testid^="timeline-event-"]');

    // Cost tracker in header
    this.costTracker = page.locator('[data-testid="cost-tracker"]');
  }

  /**
   * Navigate to the Dashboard page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/dashboard';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the dashboard to fully load.
   */
  async waitForLoad(): Promise<void> {
    // Wait for loading overlay to disappear
    await this.loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Loading may have already completed
    });
    // Wait for header to be visible
    await this.page.waitForSelector('h1:text("Dashboard")', { state: 'visible' });
  }

  /**
   * Check if loading is in progress.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingOverlay.isVisible();
  }

  /**
   * Get the progress bar element.
   */
  getProgressBar(): Locator {
    return this.progressChart.locator('[role="progressbar"], .recharts-layer');
  }

  /**
   * Get all agent cards.
   */
  getAgentCards(): Locator {
    return this.agentActivity.locator('[data-testid^="agent-card-"], .grid > div');
  }

  /**
   * Get a specific agent card by ID.
   * @param agentId - The agent ID
   */
  getAgentCard(agentId: string): Locator {
    return this.page.locator(`[data-testid="agent-card-${agentId}"]`);
  }

  /**
   * Get event log entries.
   */
  getEventLog(): Locator {
    return this.timelineEvents;
  }

  /**
   * Get the count of timeline events.
   */
  async getEventCount(): Promise<number> {
    return this.timelineEvents.count();
  }

  /**
   * Wait for a specific agent to reach a status.
   * @param agentId - The agent ID
   * @param status - Expected status
   * @param timeout - Maximum wait time in ms
   */
  async waitForAgentStatus(
    agentId: string,
    status: AgentStatus,
    timeout = 10000
  ): Promise<void> {
    const agentCard = this.getAgentCard(agentId);
    const statusIndicators: Record<AgentStatus, string> = {
      working: '.bg-green-500, text=working, text=Running',
      waiting: '.bg-yellow-500, text=waiting, text=Waiting',
      idle: '.bg-gray-500, text=idle, text=Idle',
      error: '.bg-red-500, text=error, text=Error',
    };

    await agentCard.locator(statusIndicators[status]).waitFor({
      state: 'visible',
      timeout,
    });
  }

  /**
   * Get metric value from a card.
   * @param cardLocator - The metric card locator
   */
  async getMetricValue(cardLocator: Locator): Promise<string> {
    // The value is usually the largest text element in the card
    const valueElement = cardLocator.locator('.text-2xl, .text-3xl, .font-bold').first();
    return (await valueElement.textContent()) || '';
  }

  /**
   * Get total features count.
   */
  async getTotalFeatures(): Promise<number> {
    const value = await this.getMetricValue(this.totalFeaturesCard);
    return parseInt(value, 10) || 0;
  }

  /**
   * Get completed tasks progress.
   * @returns Object with completed, total, and percentage
   */
  async getTaskProgress(): Promise<{ completed: number; total: number; percent: number }> {
    const value = await this.getMetricValue(this.completedTasksCard);
    // Parse "34/47" format
    const match = value.match(/(\d+)\/(\d+)/);
    if (match) {
      const completed = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }
    return { completed: 0, total: 0, percent: 0 };
  }

  /**
   * Get active agents count.
   */
  async getActiveAgentsCount(): Promise<number> {
    const value = await this.getMetricValue(this.activeAgentsCard);
    return parseInt(value, 10) || 0;
  }

  /**
   * Get estimated completion time.
   */
  async getEstimatedCompletion(): Promise<string> {
    return this.getMetricValue(this.estCompletionCard);
  }

  /**
   * Get cost information from the cost tracker.
   */
  async getCostInfo(): Promise<{ current: number; budget: number } | null> {
    if (!(await this.costTracker.isVisible())) {
      return null;
    }
    const text = await this.costTracker.textContent();
    // Parse "$12.47 / $50.00" format
    const match = text?.match(/\$?([\d.]+)\s*\/\s*\$?([\d.]+)/);
    if (match) {
      return {
        current: parseFloat(match[1]),
        budget: parseFloat(match[2]),
      };
    }
    return null;
  }

  /**
   * Wait for a timeline event with specific text.
   * @param eventText - Text to search for in events
   * @param timeout - Maximum wait time in ms
   */
  async waitForTimelineEvent(eventText: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(`text=${eventText}`, { timeout });
  }

  /**
   * Get all visible agents with their status.
   */
  async getAgentsWithStatus(): Promise<Array<{ id: string; name: string; status: string }>> {
    const agents: Array<{ id: string; name: string; status: string }> = [];
    const cards = await this.getAgentCards().all();

    for (const card of cards) {
      const id = (await card.getAttribute('data-testid'))?.replace('agent-card-', '') || '';
      const name = (await card.locator('.font-medium, h4').textContent()) || '';
      const statusEl = card.locator('.text-xs, .text-sm').first();
      const status = (await statusEl.textContent()) || '';
      agents.push({ id, name, status });
    }

    return agents;
  }

  /**
   * Check if the dashboard shows empty state (no data).
   */
  async isEmptyState(): Promise<boolean> {
    const noAgentsText = this.page.locator('text=No agents active');
    return noAgentsText.isVisible();
  }

  /**
   * Refresh dashboard data (if there's a refresh button).
   */
  async refresh(): Promise<void> {
    const refreshButton = this.page.locator('[data-testid="refresh-button"], button:has-text("Refresh")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await this.waitForLoad();
    }
  }
}
