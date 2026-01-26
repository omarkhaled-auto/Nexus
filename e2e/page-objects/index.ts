/**
 * Page Objects for Nexus E2E Testing
 *
 * Page objects encapsulate page-specific selectors and actions,
 * making tests more readable and maintainable.
 *
 * Usage:
 * ```ts
 * import { InterviewPage, KanbanPage, DashboardPage } from './page-objects';
 *
 * test('interview flow', async ({ window }) => {
 *   const interviewPage = new InterviewPage(window);
 *   await interviewPage.navigate();
 *   await interviewPage.sendMessage('Build a todo app');
 *   await interviewPage.waitForResponse();
 * });
 * ```
 */

// Core page objects
export { InterviewPage } from './InterviewPage';
export { KanbanPage, COLUMN_STATUSES } from './KanbanPage';
export { DashboardPage, type AgentStatus } from './DashboardPage';

// New page objects
export { ModeSelectorPage } from './ModeSelectorPage';
export { PlanningPage, type PlanningStatus } from './PlanningPage';
export { SettingsPage, type SettingsTab } from './SettingsPage';
export { AgentsPage, type AgentPageStatus } from './AgentsPage';
export { ExecutionPage, type ExecutionTab } from './ExecutionPage';
