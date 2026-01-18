-- Continue points table for resuming interrupted work
CREATE TABLE IF NOT EXISTS continue_points (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    last_action TEXT NOT NULL,
    file TEXT,
    line INTEGER,
    function_name TEXT,
    next_steps TEXT,
    agent_id TEXT,
    iteration_count INTEGER NOT NULL DEFAULT 0,
    saved_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS continue_points_project_idx ON continue_points(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS continue_points_task_idx ON continue_points(task_id);
