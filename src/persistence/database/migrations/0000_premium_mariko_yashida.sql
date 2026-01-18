-- Initial schema: projects, features, sub_features, tasks, agents, checkpoints
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    root_path TEXT NOT NULL,
    repository_url TEXT,
    settings TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'should',
    status TEXT NOT NULL DEFAULT 'backlog',
    complexity TEXT NOT NULL DEFAULT 'simple',
    estimated_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sub_features (
    id TEXT PRIMARY KEY NOT NULL,
    feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feature_id TEXT REFERENCES features(id),
    sub_feature_id TEXT REFERENCES sub_features(id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'auto',
    status TEXT NOT NULL DEFAULT 'pending',
    size TEXT NOT NULL DEFAULT 'small',
    priority INTEGER NOT NULL DEFAULT 5,
    tags TEXT,
    notes TEXT,
    assigned_agent TEXT,
    worktree_path TEXT,
    branch_name TEXT,
    depends_on TEXT,
    blocked_by TEXT,
    qa_iterations INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 50,
    estimated_minutes INTEGER DEFAULT 15,
    actual_minutes INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    model_provider TEXT NOT NULL DEFAULT 'anthropic',
    model_name TEXT NOT NULL DEFAULT 'claude-sonnet-4',
    temperature REAL NOT NULL DEFAULT 0.3,
    max_tokens INTEGER NOT NULL DEFAULT 8000,
    system_prompt TEXT,
    tools TEXT,
    current_task_id TEXT,
    worktree_path TEXT,
    branch_name TEXT,
    tokens_used INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    spawned_at INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL,
    terminated_at INTEGER,
    termination_reason TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    reason TEXT,
    state TEXT,
    git_commit TEXT,
    created_at INTEGER NOT NULL
);
