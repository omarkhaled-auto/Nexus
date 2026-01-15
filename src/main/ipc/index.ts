/**
 * IPC Module - Main Process
 * Phase 05-04: Barrel export for IPC handlers
 */

export {
  registerIpcHandlers,
  setupEventForwarding,
  forwardTaskUpdate,
  forwardAgentStatus,
  forwardExecutionProgress,
} from './handlers'
