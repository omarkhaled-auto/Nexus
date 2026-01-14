// Orchestration Layer for Nexus
// Phase 04-02: NexusCoordinator, AgentPool, TaskQueue
// Phase 04-03: EventBus

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
