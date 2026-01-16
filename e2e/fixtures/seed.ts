import type { Page } from '@playwright/test';

/**
 * Test data seeding utilities for E2E tests.
 *
 * These functions seed the application state for testing
 * by interacting with the window's exposed test bridge.
 */

/**
 * Project configuration for seeding
 */
export interface SeedProjectConfig {
  name: string;
  mode: 'genesis' | 'evolution';
  description?: string;
}

/**
 * Feature configuration for seeding
 */
export interface SeedFeatureConfig {
  id?: string;
  title: string;
  description?: string;
  status?: 'backlog' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'done';
  complexity?: 'simple' | 'moderate' | 'complex';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Requirement configuration for seeding
 */
export interface SeedRequirementConfig {
  id?: string;
  content: string;
  type?: 'functional' | 'non_functional' | 'constraint';
  priority?: 'must' | 'should' | 'could' | 'wont';
}

/**
 * Seed a test project via the test bridge.
 *
 * @param window - Playwright Page instance
 * @param config - Project configuration
 */
export async function seedTestProject(
  window: Page,
  config: SeedProjectConfig
): Promise<void> {
  await window.evaluate((cfg) => {
    // Check if test bridge is available
    const testBridge = (window as unknown as { testBridge?: TestBridge }).testBridge;
    if (testBridge?.seedProject) {
      testBridge.seedProject(cfg);
    } else {
      console.warn('[Test] testBridge.seedProject not available');
    }
  }, config);
}

/**
 * Seed features for Evolution mode tests.
 *
 * @param window - Playwright Page instance
 * @param features - Array of feature configurations
 */
export async function seedFeatures(
  window: Page,
  features: SeedFeatureConfig[]
): Promise<void> {
  await window.evaluate((feats) => {
    const testBridge = (window as unknown as { testBridge?: TestBridge }).testBridge;
    if (testBridge?.seedFeatures) {
      testBridge.seedFeatures(feats);
    } else {
      console.warn('[Test] testBridge.seedFeatures not available');
    }
  }, features);
}

/**
 * Seed requirements for Interview mode tests.
 *
 * @param window - Playwright Page instance
 * @param requirements - Array of requirement configurations
 */
export async function seedRequirements(
  window: Page,
  requirements: SeedRequirementConfig[]
): Promise<void> {
  await window.evaluate((reqs) => {
    const testBridge = (window as unknown as { testBridge?: TestBridge }).testBridge;
    if (testBridge?.seedRequirements) {
      testBridge.seedRequirements(reqs);
    } else {
      console.warn('[Test] testBridge.seedRequirements not available');
    }
  }, requirements);
}

/**
 * Clear all test data from stores.
 *
 * @param window - Playwright Page instance
 */
export async function clearTestData(window: Page): Promise<void> {
  await window.evaluate(() => {
    const testBridge = (window as unknown as { testBridge?: TestBridge }).testBridge;
    if (testBridge?.clearAll) {
      testBridge.clearAll();
    } else {
      console.warn('[Test] testBridge.clearAll not available');
    }
  });
}

/**
 * Navigate to a specific route in the app.
 *
 * @param window - Playwright Page instance
 * @param route - Route path (e.g., '/interview', '/kanban', '/dashboard')
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.evaluate((path) => {
    // Inside evaluate, 'window' refers to DOM window
    const domWindow = window as unknown as Window & { testBridge?: TestBridge };
    if (domWindow.testBridge?.navigate) {
      domWindow.testBridge.navigate(path);
    } else {
      // Fallback: try direct navigation via hash
      window.location.hash = path;
    }
  }, route);

  // Wait for navigation to complete
  await page.waitForTimeout(300);
}

/**
 * TestBridge interface - exposed by the app in test mode
 */
interface TestBridge {
  seedProject?: (config: SeedProjectConfig) => void;
  seedFeatures?: (features: SeedFeatureConfig[]) => void;
  seedRequirements?: (requirements: SeedRequirementConfig[]) => void;
  clearAll?: () => void;
  navigate?: (path: string) => void;
}

/**
 * Sample test data generators
 */
export const testData = {
  /**
   * Generate a sample project config
   */
  sampleProject: (overrides?: Partial<SeedProjectConfig>): SeedProjectConfig => ({
    name: 'Test Project',
    mode: 'genesis',
    description: 'A test project for E2E testing',
    ...overrides,
  }),

  /**
   * Generate sample features for Kanban testing
   */
  sampleFeatures: (): SeedFeatureConfig[] => [
    {
      id: 'test-feat-1',
      title: 'User Authentication',
      description: 'Implement login and registration',
      status: 'backlog',
      complexity: 'complex',
      priority: 'high',
    },
    {
      id: 'test-feat-2',
      title: 'Dashboard Widget',
      description: 'Create analytics dashboard',
      status: 'in_progress',
      complexity: 'moderate',
      priority: 'medium',
    },
    {
      id: 'test-feat-3',
      title: 'API Endpoints',
      description: 'Build REST API endpoints',
      status: 'done',
      complexity: 'simple',
      priority: 'low',
    },
  ],

  /**
   * Generate sample requirements for Interview testing
   */
  sampleRequirements: (): SeedRequirementConfig[] => [
    {
      id: 'test-req-1',
      content: 'Users must be able to log in with email and password',
      type: 'functional',
      priority: 'must',
    },
    {
      id: 'test-req-2',
      content: 'Application must respond within 200ms',
      type: 'non_functional',
      priority: 'should',
    },
    {
      id: 'test-req-3',
      content: 'Must use React 18+',
      type: 'constraint',
      priority: 'must',
    },
  ],
};
