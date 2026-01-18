-- Requirements, metrics, sessions tables
CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    source TEXT,
    user_stories TEXT,
    acceptance_criteria TEXT,
    linked_features TEXT,
    validated INTEGER DEFAULT 0,
    confidence REAL DEFAULT 1.0,
    tags TEXT,
    created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id TEXT,
    task_id TEXT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    metadata TEXT,
    timestamp INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    data TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
);
