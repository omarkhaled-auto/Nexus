/**
 * Main Process Services
 * Phase 12-01: Settings backend infrastructure
 * Phase 16: Full CLI Support Integration
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
