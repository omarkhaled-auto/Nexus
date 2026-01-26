import type { Page, Locator } from '@playwright/test';

/**
 * Settings tab types.
 */
export type SettingsTab = 'llm' | 'agents' | 'checkpoints' | 'ui' | 'project';

/**
 * Page Object for the Settings Page.
 *
 * The Settings Page allows configuration of:
 * - LLM Providers (Claude, Gemini, OpenAI)
 * - Agent Model Assignments
 * - Checkpoint Settings
 * - UI Preferences
 * - Project Settings
 *
 * data-testid attributes used:
 * - settings-page: Main page container
 * - tab-{tabId}: Tab navigation buttons
 * - llm-providers-tab: LLM providers content
 * - agents-tab: Agents content
 * - checkpoints-tab: Checkpoints content
 * - ui-tab: UI settings content
 * - project-tab: Project settings content
 * - backend-toggle-{option}: Backend toggle buttons
 * - model-dropdown: Model selection dropdown
 * - api-key-input-{provider}: API key inputs
 * - save-key-{provider}: Save API key buttons
 * - clear-key-{provider}: Clear API key buttons
 * - agent-model-table: Agent model assignments table
 * - save-button: Save changes button
 * - cancel-button: Cancel changes button
 * - reset-defaults-button: Reset to defaults button
 */
export class SettingsPage {
  readonly page: Page;

  // Main container
  readonly settingsPage: Locator;
  readonly errorState: Locator;
  readonly loadingState: Locator;

  // Tab navigation
  readonly llmTab: Locator;
  readonly agentsTab: Locator;
  readonly checkpointsTab: Locator;
  readonly uiTab: Locator;
  readonly projectTab: Locator;

  // Tab content areas
  readonly llmProvidersContent: Locator;
  readonly agentsContent: Locator;
  readonly checkpointsContent: Locator;
  readonly uiContent: Locator;
  readonly projectContent: Locator;

  // LLM Provider controls
  readonly claudeApiKeyInput: Locator;
  readonly geminiApiKeyInput: Locator;
  readonly openaiApiKeyInput: Locator;
  readonly claudeSaveKeyButton: Locator;
  readonly geminiSaveKeyButton: Locator;
  readonly openaiSaveKeyButton: Locator;
  readonly claudeClearKeyButton: Locator;
  readonly geminiClearKeyButton: Locator;
  readonly openaiClearKeyButton: Locator;

  // Agent settings
  readonly agentModelTable: Locator;
  readonly useRecommendedDefaultsButton: Locator;

  // Action buttons
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly resetDefaultsButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.settingsPage = page.locator('[data-testid="settings-page"]');
    this.errorState = page.locator('[data-testid="settings-page-error"]');
    this.loadingState = page.locator('[data-testid="settings-page-loading"]');

    // Tab navigation
    this.llmTab = page.locator('[data-testid="tab-llm"]');
    this.agentsTab = page.locator('[data-testid="tab-agents"]');
    this.checkpointsTab = page.locator('[data-testid="tab-checkpoints"]');
    this.uiTab = page.locator('[data-testid="tab-ui"]');
    this.projectTab = page.locator('[data-testid="tab-project"]');

    // Tab content areas
    this.llmProvidersContent = page.locator('[data-testid="llm-providers-tab"]');
    this.agentsContent = page.locator('[data-testid="agents-tab"]');
    this.checkpointsContent = page.locator('[data-testid="checkpoints-tab"]');
    this.uiContent = page.locator('[data-testid="ui-tab"]');
    this.projectContent = page.locator('[data-testid="project-tab"]');

    // LLM Provider controls
    this.claudeApiKeyInput = page.locator('[data-testid="api-key-input-claude"]');
    this.geminiApiKeyInput = page.locator('[data-testid="api-key-input-gemini"]');
    this.openaiApiKeyInput = page.locator('[data-testid="api-key-input-openai"]');
    this.claudeSaveKeyButton = page.locator('[data-testid="save-key-claude"]');
    this.geminiSaveKeyButton = page.locator('[data-testid="save-key-gemini"]');
    this.openaiSaveKeyButton = page.locator('[data-testid="save-key-openai"]');
    this.claudeClearKeyButton = page.locator('[data-testid="clear-key-claude"]');
    this.geminiClearKeyButton = page.locator('[data-testid="clear-key-gemini"]');
    this.openaiClearKeyButton = page.locator('[data-testid="clear-key-openai"]');

    // Agent settings
    this.agentModelTable = page.locator('[data-testid="agent-model-table"]');
    this.useRecommendedDefaultsButton = page.locator('[data-testid="use-recommended-defaults"]');

    // Action buttons
    this.saveButton = page.locator('[data-testid="save-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
    this.resetDefaultsButton = page.locator('[data-testid="reset-defaults-button"]');
  }

  /**
   * Navigate to the settings page.
   */
  async navigate(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/settings';
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="settings-page"]', { state: 'visible', timeout: 10000 });
  }

  /**
   * Check if the settings page is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.settingsPage.isVisible();
  }

  /**
   * Switch to a specific tab.
   * @param tab - The tab to switch to
   */
  async switchTab(tab: SettingsTab): Promise<void> {
    const tabLocator = this.page.locator(`[data-testid="tab-${tab}"]`);
    await tabLocator.click();
    await this.page.waitForTimeout(300); // Wait for tab transition
  }

  /**
   * Get the currently active tab.
   */
  async getActiveTab(): Promise<SettingsTab> {
    if (await this.llmProvidersContent.isVisible()) return 'llm';
    if (await this.agentsContent.isVisible()) return 'agents';
    if (await this.checkpointsContent.isVisible()) return 'checkpoints';
    if (await this.uiContent.isVisible()) return 'ui';
    if (await this.projectContent.isVisible()) return 'project';
    return 'llm'; // Default
  }

  /**
   * Enter an API key for a provider.
   * @param provider - The provider ('claude' | 'gemini' | 'openai')
   * @param apiKey - The API key value
   */
  async enterApiKey(provider: 'claude' | 'gemini' | 'openai', apiKey: string): Promise<void> {
    const input = this.page.locator(`[data-testid="api-key-input-${provider}"]`);
    await input.fill(apiKey);
  }

  /**
   * Save an API key for a provider.
   * @param provider - The provider
   */
  async saveApiKey(provider: 'claude' | 'gemini' | 'openai'): Promise<void> {
    const button = this.page.locator(`[data-testid="save-key-${provider}"]`);
    await button.click();
  }

  /**
   * Clear an API key for a provider.
   * @param provider - The provider
   */
  async clearApiKey(provider: 'claude' | 'gemini' | 'openai'): Promise<void> {
    const button = this.page.locator(`[data-testid="clear-key-${provider}"]`);
    await button.click();
  }

  /**
   * Get agent model row for a specific agent type.
   * @param agentType - The agent type
   */
  getAgentModelRow(agentType: string): Locator {
    return this.page.locator(`[data-testid="agent-model-row-${agentType}"]`);
  }

  /**
   * Select a provider for an agent type.
   * @param agentType - The agent type
   * @param provider - The provider to select
   */
  async selectAgentProvider(agentType: string, provider: string): Promise<void> {
    const select = this.page.locator(`[data-testid="agent-provider-${agentType}"]`);
    await select.selectOption(provider);
  }

  /**
   * Select a model for an agent type.
   * @param agentType - The agent type
   * @param model - The model to select
   */
  async selectAgentModel(agentType: string, model: string): Promise<void> {
    const select = this.page.locator(`[data-testid="agent-model-${agentType}"]`);
    await select.selectOption(model);
  }

  /**
   * Click Use Recommended Defaults button.
   */
  async useRecommendedDefaults(): Promise<void> {
    await this.useRecommendedDefaultsButton.click();
  }

  /**
   * Save all settings.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Cancel changes.
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Reset to defaults.
   */
  async resetDefaults(): Promise<void> {
    await this.resetDefaultsButton.click();
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
   * Select a backend toggle option.
   * @param option - The option ('api' | 'cli')
   */
  async selectBackendToggle(option: string): Promise<void> {
    const toggle = this.page.locator(`[data-testid="backend-toggle-${option}"]`);
    await toggle.click();
  }

  /**
   * Check if save button is enabled.
   */
  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }
}
