import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Projects table
// ============================================================================
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  mode: text('mode').$type<'genesis' | 'evolution'>().notNull(),
  status: text('status').notNull(), // ProjectStatus
  rootPath: text('root_path').notNull(),
  repositoryUrl: text('repository_url'),
  settings: text('settings'), // JSON: ProjectSettings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// ============================================================================
// Features table
// ============================================================================
export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  priority: text('priority')
    .$type<'must' | 'should' | 'could' | 'wont'>()
    .notNull()
    .default('should'),
  status: text('status').notNull().default('backlog'),
  complexity: text('complexity')
    .$type<'simple' | 'complex'>()
    .notNull()
    .default('simple'),
  estimatedTasks: integer('estimated_tasks').default(0),
  completedTasks: integer('completed_tasks').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Sub-features table
// ============================================================================
export const subFeatures = sqliteTable('sub_features', {
  id: text('id').primaryKey(),
  featureId: text('feature_id')
    .notNull()
    .references(() => features.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('backlog'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Tasks table
// ============================================================================
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  featureId: text('feature_id').references(() => features.id),
  subFeatureId: text('sub_feature_id').references(() => subFeatures.id),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type')
    .$type<'auto' | 'checkpoint' | 'tdd'>()
    .notNull()
    .default('auto'),
  status: text('status').notNull().default('pending'),
  size: text('size').$type<'atomic' | 'small'>().notNull().default('small'),
  priority: integer('priority').notNull().default(5), // for sorting (1 = highest)
  tags: text('tags'), // JSON array for categorization
  notes: text('notes'), // JSON array of implementation notes
  assignedAgent: text('assigned_agent'),
  worktreePath: text('worktree_path'),
  branchName: text('branch_name'),
  dependsOn: text('depends_on'), // JSON array of task IDs
  blockedBy: text('blocked_by'),
  qaIterations: integer('qa_iterations').default(0),
  maxIterations: integer('max_iterations').default(50),
  estimatedMinutes: integer('estimated_minutes').default(15),
  actualMinutes: integer('actual_minutes'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Agents table
// ============================================================================
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  type: text('type')
    .$type<'planner' | 'coder' | 'tester' | 'reviewer' | 'merger'>()
    .notNull(),
  status: text('status').notNull().default('idle'),
  // Model configuration
  modelProvider: text('model_provider')
    .$type<'anthropic' | 'google' | 'openai'>()
    .notNull()
    .default('anthropic'),
  modelName: text('model_name').notNull().default('claude-sonnet-4'),
  temperature: real('temperature').notNull().default(0.3),
  maxTokens: integer('max_tokens').notNull().default(8000),
  systemPrompt: text('system_prompt'), // path to prompt file or content
  tools: text('tools'), // JSON array of tool names
  // Current work
  currentTaskId: text('current_task_id'),
  worktreePath: text('worktree_path'),
  branchName: text('branch_name'),
  tokensUsed: integer('tokens_used').default(0),
  tasksCompleted: integer('tasks_completed').default(0),
  tasksFailed: integer('tasks_failed').default(0),
  spawnedAt: integer('spawned_at', { mode: 'timestamp' }).notNull(),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull(),
  terminatedAt: integer('terminated_at', { mode: 'timestamp' }),
  terminationReason: text('termination_reason'),
});

// ============================================================================
// Checkpoints table
// ============================================================================
export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name'),
  reason: text('reason'),
  state: text('state'), // JSON blob of full state
  gitCommit: text('git_commit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Requirements table
// ============================================================================
export const requirements = sqliteTable('requirements', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('medium'),
  source: text('source'),
  userStories: text('user_stories'), // JSON array of user stories
  acceptanceCriteria: text('acceptance_criteria'), // JSON array of acceptance criteria
  linkedFeatures: text('linked_features'), // JSON array
  validated: integer('validated', { mode: 'boolean' }).default(false),
  confidence: real('confidence').default(1.0), // 0-1, AI confidence in extraction
  tags: text('tags'), // JSON array for filtering/categorization
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Metrics table (for tracking)
// ============================================================================
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  agentId: text('agent_id'),
  taskId: text('task_id'),
  type: text('type').notNull(), // 'token_usage', 'task_duration', 'qa_iterations'
  value: real('value').notNull(),
  metadata: text('metadata'), // JSON
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Sessions table (for interview/interaction history)
// ============================================================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'interview', 'planning', 'execution'
  status: text('status').notNull().default('active'),
  data: text('data'), // JSON blob
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
});

// ============================================================================
// Relations for type-safe queries
// ============================================================================
export const projectsRelations = relations(projects, ({ many }) => ({
  features: many(features),
  tasks: many(tasks),
  checkpoints: many(checkpoints),
  requirements: many(requirements),
  metrics: many(metrics),
  sessions: many(sessions),
  episodes: many(episodes),
  continuePoints: many(continuePoints),
}));

export const featuresRelations = relations(features, ({ one, many }) => ({
  project: one(projects, {
    fields: [features.projectId],
    references: [projects.id],
  }),
  subFeatures: many(subFeatures),
  tasks: many(tasks),
}));

export const subFeaturesRelations = relations(subFeatures, ({ one, many }) => ({
  feature: one(features, {
    fields: [subFeatures.featureId],
    references: [features.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  feature: one(features, {
    fields: [tasks.featureId],
    references: [features.id],
  }),
  subFeature: one(subFeatures, {
    fields: [tasks.subFeatureId],
    references: [subFeatures.id],
  }),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  project: one(projects, {
    fields: [checkpoints.projectId],
    references: [projects.id],
  }),
}));

export const requirementsRelations = relations(requirements, ({ one }) => ({
  project: one(projects, {
    fields: [requirements.projectId],
    references: [projects.id],
  }),
}));

export const metricsRelations = relations(metrics, ({ one }) => ({
  project: one(projects, {
    fields: [metrics.projectId],
    references: [projects.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id],
  }),
}));

// ============================================================================
// Episodes table (for episodic memory)
// ============================================================================
export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type')
    .$type<'code_generation' | 'error_fix' | 'review_feedback' | 'decision' | 'research'>()
    .notNull(),
  content: text('content').notNull(),
  summary: text('summary'), // Short summary for display
  embedding: text('embedding'), // JSON array of floats (1536 dimensions)
  context: text('context'), // JSON metadata
  taskId: text('task_id'),
  agentId: text('agent_id'),
  importance: real('importance').default(1.0), // For pruning priority
  accessCount: integer('access_count').default(0),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const episodesRelations = relations(episodes, ({ one }) => ({
  project: one(projects, {
    fields: [episodes.projectId],
    references: [projects.id],
  }),
}));

// ============================================================================
// Continue Points table (for resuming interrupted work)
// ============================================================================
export const continuePoints = sqliteTable('continue_points', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  taskId: text('task_id').notNull(),
  lastAction: text('last_action').notNull(),
  file: text('file'),
  line: integer('line'),
  functionName: text('function_name'),
  nextSteps: text('next_steps'), // JSON array
  agentId: text('agent_id'),
  iterationCount: integer('iteration_count').notNull().default(0),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
});

export const continuePointsRelations = relations(continuePoints, ({ one }) => ({
  project: one(projects, {
    fields: [continuePoints.projectId],
    references: [projects.id],
  }),
}));

// ============================================================================
// Type exports for use in application code
// ============================================================================
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;

export type SubFeature = typeof subFeatures.$inferSelect;
export type NewSubFeature = typeof subFeatures.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;

export type Requirement = typeof requirements.$inferSelect;
export type NewRequirement = typeof requirements.$inferInsert;

export type Metric = typeof metrics.$inferSelect;
export type NewMetric = typeof metrics.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;

export type ContinuePointRecord = typeof continuePoints.$inferSelect;
export type NewContinuePointRecord = typeof continuePoints.$inferInsert;
