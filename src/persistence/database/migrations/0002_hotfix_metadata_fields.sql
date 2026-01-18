-- Episodes table for episodic memory
CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    embedding TEXT,
    context TEXT,
    task_id TEXT,
    agent_id TEXT,
    importance REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at INTEGER,
    created_at INTEGER NOT NULL
);
