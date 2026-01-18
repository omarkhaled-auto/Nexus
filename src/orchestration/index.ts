// Orchestration Layer for Nexus
// Phase 04-02: NexusCoordinator, AgentPool, TaskQueue
// Phase 04-03: EventBus
// Phase 13-04: Fresh Context Manager
// Phase 13-07: Dynamic Replanner
// Phase 13-08: Self-Assessment Engine

// Types
export * from './types';

// Queue
export { TaskQueue } from './queue/TaskQueue';

// Agents
export { AgentPool, PoolCapacityError, AgentNotFoundError } from './agents/AgentPool';

// Coordinator
export { NexusCoordinator } from './coordinator/NexusCoordinator';
export type { NexusCoordinatorOptions } from './coordinator/NexusCoordinator';

// EventBus (Phase 04-03)
export { EventBus } from './events/EventBus';
export type { EmitOptions, WildcardHandler, Unsubscribe } from './events/EventBus';

// Context Management (Phase 13-04)
export * from './context';

// Dynamic Replanner (Phase 13-07)
export * from './planning';

// Self-Assessment Engine (Phase 13-08)
export * from './assessment';

// Assessment-Replanner Bridge
export {
  AssessmentReplannerBridge,
  createAssessmentReplannerBridge,
} from './AssessmentReplannerBridge';
export type {
  AssessmentReplanResult,
  BridgeConfig,
  BridgeEventEmitter,
} from './AssessmentReplannerBridge';
