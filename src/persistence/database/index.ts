/**
 * Database module exports
 *
 * Provides access to DatabaseClient and schema for persistence layer.
 *
 * @module persistence/database
 */
export { DatabaseClient } from './DatabaseClient';
export type { DatabaseClientOptions, DatabaseHealthStatus } from './DatabaseClient';
export * as schema from './schema';
export { projects, features, tasks, agents, checkpoints, sessions, requirements } from './schema';
export type { Project, NewProject, Feature, NewFeature, Task, NewTask, Agent, NewAgent, Checkpoint, NewCheckpoint, Session, NewSession, Requirement, NewRequirement } from './schema';
