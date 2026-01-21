/**
 * IPC Module - Main Process
 * Phase 05-04: Barrel export for IPC handlers
 * Phase 09: Interview handlers for InterviewEngine integration
 * Phase 12-01: Settings handlers for secure settings storage
 */

export {
  registerIpcHandlers,
  registerCheckpointReviewHandlers,
  registerDatabaseHandlers,
  setupEventForwarding,
  forwardTaskUpdate,
  forwardAgentStatus,
  forwardExecutionProgress,
} from './handlers'

export { registerInterviewHandlers, registerFallbackInterviewHandlers, removeInterviewHandlers } from './interview-handlers'

export { registerSettingsHandlers } from './settingsHandlers'
