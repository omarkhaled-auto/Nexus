-- Indexes for performance
CREATE INDEX IF NOT EXISTS features_project_idx ON features(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sub_features_feature_idx ON sub_features(feature_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_feature_idx ON tasks(feature_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS checkpoints_project_idx ON checkpoints(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS requirements_project_idx ON requirements(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS metrics_project_idx ON metrics(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_project_idx ON sessions(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS episodes_project_idx ON episodes(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS episodes_type_idx ON episodes(type);
