/**
 * Main Process Services
 * Phase 12-01: Settings backend infrastructure
 * Phase 16: Full CLI Support Integration
 * Phase 21 Task 5: Project initialization service
 *
 * These services are for use in the Electron main process only.
 * They use Electron-specific APIs (safeStorage, electron-store).
 */

// Settings Service (Phase 12)
export { settingsService } from './settingsService';

// Settings Loader (Phase 16)
export {
  SettingsLoader,
  createNexusFromSettings,
  createTestingNexusFromSettings,
} from './SettingsLoader';

// Project Initializer (Phase 21)
export {
  ProjectInitializer,
  projectInitializer,
  type ProjectInitOptions,
  type InitializedProject,
} from './ProjectInitializer';

// Project Loader (Phase 21 Task 6)
export {
  ProjectLoader,
  projectLoader,
  type LoadedProject,
  type ProjectConfig,
} from './ProjectLoader';

// Recent Projects Service (Phase 21 Task 8)
export {
  RecentProjectsService,
  recentProjectsService,
  type RecentProject,
} from './RecentProjectsService';
