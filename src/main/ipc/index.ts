/**
 * IPC Module - Main Process
 * Phase 05-04: Barrel export for IPC handlers
 * Phase 09: Interview handlers for InterviewEngine integration
 */

export {
  registerIpcHandlers,
  setupEventForwarding,
  forwardTaskUpdate,
  forwardAgentStatus,
  forwardExecutionProgress,
} from './handlers'

export { registerInterviewHandlers } from './interview-handlers'
